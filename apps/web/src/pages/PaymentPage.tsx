// path: apps/web/src/pages/CheckoutPage.tsx

import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { Button } from '@/components/ui/button';
import { PinDialog } from '@/modules/wallet/components/PinDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiHelpers } from '@/lib/api';
import { getApi } from '@/modules/wallet/services/polkadot';
import { useChainProps } from '@/modules/wallet/hooks/useChainProps';
import { getActiveAccount, decryptMnemonic } from '@/modules/auth';

interface PaymentIntent {
  orderId: string;
  escrowAddress: string;
  amountBzr: string;
  feeBps: number;
  paymentIntentId: string;
}

interface PaymentConfig {
  escrowAddress: string;
  feeBps: number;
}

type TxStatus = 'idle' | 'estimating' | 'ready' | 'signing' | 'broadcasting' | 'in_block' | 'finalized' | 'error';

export function CheckoutPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const chainProps = useChainProps();

  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<TxStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setError(null);
    setTxStatus('idle');
    setTxHash(null);
  }, []);

  // Carregar configuração e criar intent
  useEffect(() => {
    if (!id) {
      setError(t('checkout.error.invalidId'));
      return;
    }

    let active = true;

    const loadCheckoutData = async () => {
      try {
        resetState();

        // Carregar config
        const configData = await apiHelpers.getPaymentsConfig() as PaymentConfig;
        if (active) setConfig(configData);

        // Criar payment intent
        const intentData = await apiHelpers.createPaymentIntent(id) as PaymentIntent;
        if (active) setIntent(intentData);

      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : t('checkout.error.loadFailed'));
        }
      }
    };

    loadCheckoutData();

    return () => {
      active = false;
    };
  }, [id, t, resetState]);

  // Estimar fee da transação
  useEffect(() => {
    if (!intent || estimatedFee) return;

    let active = true;

    const estimateFee = async () => {
      try {
        setTxStatus('estimating');

        const activeAccount = getActiveAccount();
        if (!activeAccount) {
          throw new Error(t('checkout.error.noAccount'));
        }

        const api = await getApi();
        const tx = api.tx.balances.transferKeepAlive(intent.escrowAddress, intent.amountBzr);
        const paymentInfo = await tx.paymentInfo(activeAccount.address);

        if (active) {
          setEstimatedFee(paymentInfo.partialFee.toString());
          setTxStatus('ready');
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : t('checkout.error.feeEstimationFailed'));
          setTxStatus('error');
        }
      }
    };

    estimateFee();

    return () => {
      active = false;
    };
  }, [intent, estimatedFee, t]);

  const [pinOpen, setPinOpen] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const signWithPin = useCallback(async (pin: string) => {
    if (!intent) return;

    const activeAccount = getActiveAccount();
    if (!activeAccount) {
      setError(t('checkout.error.noAccount'));
      return;
    }

    try {
      resetState();
      setTxStatus('signing');

      const mnemonic = await decryptMnemonic(activeAccount.encryptedMnemonic, pin);

      await cryptoWaitReady();
      const ss58 = chainProps?.ss58Prefix ?? 42;
      const keyring = new Keyring({ type: 'sr25519', ss58Format: ss58 });
      const pair = keyring.addFromMnemonic(mnemonic);

      const api = await getApi();
      const tx = api.tx.balances.transferKeepAlive(intent.escrowAddress, intent.amountBzr);

      setTxStatus('broadcasting');

      const unsubscribe = await tx.signAndSend(pair, (result) => {
        const { status, dispatchError, txHash } = result;

        if (dispatchError) {
          let message = dispatchError.toString();
          if (dispatchError.isModule) {
            const metaError = api.registry.findMetaError(dispatchError.asModule);
            message = `${metaError.section}.${metaError.name}`;
          }
          setError(t('checkout.error.txFailed', { message }));
          setTxStatus('error');
          return;
        }

        if (status.isInBlock) {
          setTxStatus('in_block');
          setTxHash(txHash.toHex());
        } else if (status.isFinalized) {
          setTxStatus('finalized');
          unsubscribe();

          // Navegar para página de tracking após um delay
          setTimeout(() => {
            navigate(`/app/order/${intent.orderId}`);
          }, 2000);
        }
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : t('checkout.error.paymentFailed'));
      setTxStatus('error');
    }
  }, [intent, chainProps, t, resetState, navigate]);

  const handlePayment = useCallback(async () => {
    setPinError(null);
    setPinOpen(true);
  }, []);

  const formatBzr = useCallback((planck: string) => {
    // Assumindo 12 decimais para BZR
    const value = BigInt(planck);
    const divisor = BigInt(10 ** 12);
    const wholePart = value / divisor;
    const fractionalPart = value % divisor;
    return `${wholePart}.${fractionalPart.toString().padStart(12, '0').slice(0, 6)} BZR`;
  }, []);

  if (!id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">{t('checkout.error.invalidId')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeAccount = getActiveAccount();
  const isLoading = !config || !intent || txStatus === 'estimating';
  const canPay = txStatus === 'ready' && activeAccount;
  const isProcessing = ['signing', 'broadcasting', 'in_block'].includes(txStatus);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">{t('checkout.title')}</h1>

        <Card>
          <CardHeader>
            <CardTitle>{t('checkout.payment.title')}</CardTitle>
            <CardDescription>{t('checkout.payment.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && (
              <div className="text-center py-4">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-2 text-muted-foreground">{t('checkout.loading')}</p>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-destructive text-sm">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => window.location.reload()}
                >
                  {t('checkout.retry')}
                </Button>
              </div>
            )}

            {intent && config && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('checkout.amount')}</span>
                    <span className="font-medium">{formatBzr(intent.amountBzr)}</span>
                  </div>

                  {estimatedFee && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('checkout.networkFee')}</span>
                      <span className="text-sm">{formatBzr(estimatedFee)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('checkout.marketplaceFee')}</span>
                    <span className="text-sm">{config.feeBps / 100}%</span>
                  </div>

                  <div className="border-t pt-2">
                    <div className="flex justify-between font-medium">
                      <span>{t('checkout.escrowAddress')}</span>
                      <span className="text-xs font-mono break-all">{intent.escrowAddress}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Badge variant={
                    txStatus === 'ready' ? 'default' :
                    isProcessing ? 'secondary' :
                    txStatus === 'finalized' ? 'default' :
                    txStatus === 'error' ? 'destructive' : 'outline'
                  }>
                    {t(`checkout.status.${txStatus}`)}
                  </Badge>

                  {txHash && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t('checkout.txHash')}: <span className="font-mono">{txHash}</span>
                    </p>
                  )}
                </div>

                <Button
                  onClick={handlePayment}
                  disabled={!canPay || isProcessing}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? t('checkout.processing') : t('checkout.pay')}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
        <PinDialog
          open={pinOpen}
          title={t('wallet.send.pinTitle', 'Digite seu PIN')}
          description={t('wallet.send.pinDescription', 'Desbloqueie para assinar a transação')}
          label={t('wallet.send.pinLabel', 'PIN')}
          cancelText={t('wallet.send.pinCancel', 'Cancelar')}
          confirmText={t('wallet.send.pinConfirm', 'Confirmar')}
          loading={pinLoading}
          error={pinError || undefined}
          onCancel={() => { setPinOpen(false); setPinError(null); }}
          onConfirm={async (pin) => { setPinOpen(false); setPinLoading(true); try { await signWithPin(pin); } catch (e) { setPinError((e as Error).message || 'Erro'); } finally { setPinLoading(false); } }}
        />
      </div>
    </div>
  );
}
