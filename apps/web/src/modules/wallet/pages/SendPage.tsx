import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useVaultAccounts } from '../hooks/useVaultAccounts';
import { useChainProps } from '../hooks/useChainProps';
import { useTokens, type WalletToken } from '../store/tokens.store';
import { getNativeBalance, subscribeNativeBalance, getAssetBalance, subscribeAssetBalance, type BalanceSnapshot } from '../services/balances';
import { getActiveAccount, decryptMnemonic } from '@/modules/auth';
import { getApi } from '../services/polkadot';
import { parseAmountToPlanck, formatBalance, isValidAddress, normaliseAddress, shortenAddress } from '../utils/format';
import { Scanner } from '../components/Scanner';

type FormValues = z.infer<typeof schema>;

const schema = z.object({
  assetId: z.string(),
  recipient: z.string().min(3),
  amount: z.string().min(1),
  memo: z.string().max(140).optional(),
});

interface FeeState {
  value: bigint;
  formatted: string;
}

export function SendPage() {
  const { t } = useTranslation();
  const { active } = useVaultAccounts();
  const { props: chainProps } = useChainProps();
  const tokens = useTokens(active?.address);
  const [balances, setBalances] = useState<Record<string, BalanceSnapshot | null>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [fee, setFee] = useState<FeeState | null>(null);
  const [estimatingFee, setEstimatingFee] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const pendingValuesRef = useRef<FormValues | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      assetId: 'native',
      recipient: '',
      amount: '',
      memo: '',
    },
  });

  const activeAddress = active?.address ?? null;
  const nativeSymbol = chainProps?.tokenSymbol ?? 'BZR';
  const nativeDecimals = chainProps?.tokenDecimals ?? balances.native?.decimals ?? 12;

  const assetOptions = useMemo(() => {
    const base = [
      {
        assetId: 'native',
        symbol: nativeSymbol,
        decimals: nativeDecimals,
        name: t('wallet.send.nativeName'),
      },
    ];
    const extras = tokens.map((token) => ({
      assetId: token.assetId,
      symbol: token.symbol,
      decimals: token.decimals,
      name: token.name,
    }));
    return [...base, ...extras];
  }, [nativeDecimals, nativeSymbol, t, tokens]);

  useEffect(() => {
    if (!activeAddress) {
      setBalances({});
      return;
    }

    let cancelled = false;
    let unsubscribeNative: (() => void) | undefined;
    const unsubscribers: Array<() => void> = [];

    (async () => {
      try {
        const initial = await getNativeBalance(activeAddress);
        if (!cancelled) {
          setBalances((prev) => ({ ...prev, native: initial }));
        }
        unsubscribeNative = await subscribeNativeBalance(activeAddress, (snapshot) => {
          setBalances((prev) => ({ ...prev, native: snapshot }));
        });
      } catch (error) {
        console.error('[wallet] failed to subscribe native balance', error);
      }
    })();

    tokens.forEach((token) => {
      (async () => {
        try {
          const snapshot = await getAssetBalance(token.assetId, activeAddress, token);
          if (!cancelled) {
            setBalances((prev) => ({ ...prev, [token.assetId]: snapshot }));
          }
          const unsub = await subscribeAssetBalance(token.assetId, activeAddress, token, (balance) => {
            setBalances((prev) => ({ ...prev, [token.assetId]: balance }));
          });
          unsubscribers.push(unsub);
        } catch (error) {
          console.error(`[wallet] failed to subscribe asset ${token.assetId}`, error);
        }
      })();
    });

    return () => {
      cancelled = true;
      if (unsubscribeNative) {
        try {
          unsubscribeNative();
        } catch (error) {
          console.warn('[wallet] failed to unsubscribe native balance', error);
        }
      }
      unsubscribers.forEach((unsub) => {
        try {
          unsub();
        } catch (error) {
          console.warn('[wallet] failed to unsubscribe asset balance', error);
        }
      });
    };
  }, [activeAddress, tokens]);

  const selectedAssetId = form.watch('assetId');
  const watchedRecipient = form.watch('recipient');
  const watchedAmount = form.watch('amount');

  useEffect(() => {
    if (!activeAddress || !selectedAssetId || !watchedRecipient || !watchedAmount) {
      setFee(null);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const asset = assetOptions.find((option) => option.assetId === selectedAssetId);
        if (!asset) {
          setFee(null);
          return;
        }

        if (!isValidAddress(watchedRecipient)) {
          setFee(null);
          return;
        }

        const amountPlanck = parseAmountToPlanck(watchedAmount, asset.decimals);
        if (amountPlanck <= 0n) {
          setFee(null);
          return;
        }

        setEstimatingFee(true);
        const api = await getApi();
        const recipient = normaliseAddress(watchedRecipient, chainProps?.ss58Prefix ?? 42);

        const extrinsic =
          selectedAssetId === 'native'
            ? api.tx.balances.transferKeepAlive(recipient, amountPlanck)
            : api.tx.assets.transfer(selectedAssetId, recipient, amountPlanck);

        const info = await extrinsic.paymentInfo(activeAddress);
        const feeValue = BigInt(info.partialFee.toString());
        setFee({
          value: feeValue,
          formatted: `${formatBalance(feeValue, nativeDecimals)} ${nativeSymbol}`,
        });
      } catch (error) {
        console.warn('[wallet] failed to estimate fee', error);
        setFee(null);
      } finally {
        setEstimatingFee(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [activeAddress, assetOptions, chainProps?.ss58Prefix, nativeDecimals, nativeSymbol, selectedAssetId, watchedAmount, watchedRecipient]);

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!activeAddress) {
      setErrorMessage(t('wallet.send.errors.noAccount'));
      return;
    }

    const asset = assetOptions.find((option) => option.assetId === values.assetId);
    if (!asset) {
      form.setError('assetId', { message: t('wallet.send.errors.assetUnknown') });
      return;
    }

    if (!isValidAddress(values.recipient)) {
      form.setError('recipient', { message: t('wallet.send.errors.invalidAddress') });
      return;
    }

    let amountPlanck: bigint;
    try {
      amountPlanck = parseAmountToPlanck(values.amount, asset.decimals);
    } catch (error) {
      form.setError('amount', { message: t('wallet.send.errors.invalidAmount') });
      return;
    }

    if (amountPlanck <= 0n) {
      form.setError('amount', { message: t('wallet.send.errors.invalidAmount') });
      return;
    }

    const balance = balances[values.assetId] ?? balances.native ?? null;
    if (balance && amountPlanck > balance.free) {
      form.setError('amount', { message: t('wallet.send.errors.insufficient') });
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setTxHash(null);
    pendingValuesRef.current = values;
    setPinDialogOpen(true);
  });

  const handleConfirmPin = async () => {
    if (!pendingValuesRef.current || !activeAddress) {
      return;
    }
    if (!pinValue) {
      setPinError(t('wallet.send.errors.pinRequired'));
      return;
    }

    try {
      setIsProcessing(true);
      setPinError(null);

      const account = await getActiveAccount();
      if (!account) {
        setPinError(t('wallet.send.errors.noVault'));
        setIsProcessing(false);
        return;
      }

      let mnemonic = await decryptMnemonic(
        account.cipher,
        account.iv,
        account.salt,
        pinValue,
        account.iterations
      );

      setPinDialogOpen(false);
      setPinValue('');

      await cryptoWaitReady();
      const ss58 = chainProps?.ss58Prefix ?? 42;
      const keyring = new Keyring({ type: 'sr25519', ss58Format: ss58 });
      const pair = keyring.addFromMnemonic(mnemonic);
      mnemonic = '';

      const api = await getApi();
      const values = pendingValuesRef.current;
      const asset = assetOptions.find((option) => option.assetId === values.assetId)!;
      const amountPlanck = parseAmountToPlanck(values.amount, asset.decimals);
      const recipient = normaliseAddress(values.recipient, ss58);

      const extrinsic =
        values.assetId === 'native'
          ? api.tx.balances.transferKeepAlive(recipient, amountPlanck)
          : api.tx.assets.transfer(values.assetId, recipient, amountPlanck);

      setStatusMessage(t('wallet.send.status.signing'));
      setErrorMessage(null);

      const unsubscribe = await extrinsic.signAndSend(pair, (result) => {
        const { status, dispatchError, txHash: hash } = result;

        if (dispatchError) {
          let message = dispatchError.toString();
          if (dispatchError.isModule) {
            const metaError = api.registry.findMetaError(dispatchError.asModule);
            message = `${metaError.section}.${metaError.name}`;
          }
          setErrorMessage(t('wallet.send.status.error', { message }));
          setStatusMessage(null);
          setIsProcessing(false);
          unsubscribe();
          return;
        }

        if (status.isReady) {
          setStatusMessage(t('wallet.send.status.broadcasting'));
        }

        if (status.isInBlock) {
          setStatusMessage(t('wallet.send.status.inBlock'));
          setTxHash(hash.toHex());
        }

        if (status.isFinalized) {
          setStatusMessage(t('wallet.send.status.finalized'));
          setTxHash(hash.toHex());
          setIsProcessing(false);
          unsubscribe();
          form.reset({ assetId: values.assetId, recipient: '', amount: '', memo: values.memo ?? '' });
          pendingValuesRef.current = null;
        }
      });

      pair.lock();
      keyring.removePair(pair.address);
    } catch (error) {
      console.error(error);
      setPinError(t('wallet.send.errors.pinInvalid'));
      setIsProcessing(false);
    }
  };

  if (!activeAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('wallet.send.noAccountTitle')}</CardTitle>
          <CardDescription>{t('wallet.send.noAccountDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/app/wallet/accounts" className={buttonVariants({ variant: 'default' })}>
            {t('wallet.send.goToAccounts')}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('wallet.send.title')}</h1>
        <p className="text-muted-foreground">{t('wallet.send.subtitle')}</p>
      </header>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {statusMessage && (
        <Alert>
          <AlertDescription>{statusMessage}</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{t('wallet.send.formTitle')}</CardTitle>
          <CardDescription>{t('wallet.send.formDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form className="grid gap-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="asset">{t('wallet.send.fields.asset')}</Label>
                <select
                  id="asset"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...form.register('assetId')}
                >
                  {assetOptions.map((option) => (
                    <option key={option.assetId} value={option.assetId}>
                      {option.symbol} {option.name ? `(${option.name})` : ''}
                    </option>
                  ))}
                </select>
                {form.formState.errors.assetId && (
                  <p className="text-xs text-destructive">{form.formState.errors.assetId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">{t('wallet.send.fields.amount')}</Label>
                <Input
                  id="amount"
                  inputMode="decimal"
                  placeholder="0.0"
                  {...form.register('amount')}
                />
                <AssetBalanceHint
                  assetId={selectedAssetId}
                  balances={balances}
                  nativeSymbol={nativeSymbol}
                  tokens={tokens}
                  chainDecimals={nativeDecimals}
                />
                {form.formState.errors.amount && (
                  <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient">{t('wallet.send.fields.recipient')}</Label>
              <div className="flex gap-2">
                <Input
                  id="recipient"
                  className="flex-1"
                  placeholder={t('wallet.send.recipientPlaceholder')}
                  {...form.register('recipient')}
                />
                <Button type="button" variant="outline" onClick={() => setShowScanner((value) => !value)}>
                  {t('wallet.send.scan')}
                </Button>
              </div>
              {form.formState.errors.recipient && (
                <p className="text-xs text-destructive">{form.formState.errors.recipient.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="memo">{t('wallet.send.fields.memo')}</Label>
              <Textarea id="memo" rows={3} {...form.register('memo')} placeholder={t('wallet.send.memoPlaceholder')} />
              {form.formState.errors.memo && (
                <p className="text-xs text-destructive">{form.formState.errors.memo.message}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                {estimatingFee
                  ? t('wallet.send.feeLoading')
                  : fee
                    ? t('wallet.send.feeLabel', { fee: fee.formatted })
                    : t('wallet.send.feeUnavailable')}
              </span>
              {txHash && (
                <span>
                  {t('wallet.send.txHash')} {shortenAddress(txHash, 10)}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={isProcessing}>
                {isProcessing ? t('wallet.send.submitting') : t('wallet.send.submit')}
              </Button>
              <Button type="button" variant="ghost" onClick={() => form.reset()} disabled={isProcessing}>
                {t('wallet.send.reset')}
              </Button>
            </div>
          </form>

          {showScanner && (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <Scanner
                onResult={(value) => {
                  form.setValue('recipient', value, { shouldDirty: true });
                  setShowScanner(false);
                }}
                onError={(error) => console.warn('[wallet] scanner error', error)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {pinDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle>{t('wallet.send.pinTitle')}</CardTitle>
              <CardDescription>{t('wallet.send.pinDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pin-input">{t('wallet.send.pinLabel')}</Label>
                <Input
                  id="pin-input"
                  type="password"
                  inputMode="numeric"
                  value={pinValue}
                  onChange={(event) => setPinValue(event.target.value)}
                  disabled={isProcessing}
                />
                {pinError && <p className="text-xs text-destructive">{pinError}</p>}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setPinDialogOpen(false)} disabled={isProcessing}>
                  {t('wallet.send.pinCancel')}
                </Button>
                <Button onClick={() => void handleConfirmPin()} disabled={isProcessing}>
                  {isProcessing ? t('wallet.send.pinProcessing') : t('wallet.send.pinConfirm')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}

interface AssetBalanceHintProps {
  assetId: string;
  balances: Record<string, BalanceSnapshot | null>;
  nativeSymbol: string;
  chainDecimals: number;
  tokens: WalletToken[];
}

function AssetBalanceHint({ assetId, balances, nativeSymbol, chainDecimals, tokens }: AssetBalanceHintProps) {
  if (assetId === 'native') {
    const balance = balances.native;
    if (!balance) {
      return <p className="text-xs text-muted-foreground">{formatBalance(0n, chainDecimals)} {nativeSymbol}</p>;
    }
    return (
      <p className="text-xs text-muted-foreground">
        {formatBalance(balance.free, balance.decimals)} {nativeSymbol}
      </p>
    );
  }

  const token = tokens.find((entry) => entry.assetId === assetId);
  const balance = balances[assetId];
  if (!token) {
    return null;
  }

  if (!balance) {
    return (
      <p className="text-xs text-muted-foreground">
        {formatBalance(0n, token.decimals)} {token.symbol}
      </p>
    );
  }

  return (
    <p className="text-xs text-muted-foreground">
      {formatBalance(balance.free, balance.decimals)} {token.symbol}
    </p>
  );
}

export default SendPage;
