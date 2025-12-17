import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpToLine, RefreshCcw, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useVaultAccounts } from '../hooks/useVaultAccounts';
import { useChainProps } from '../hooks/useChainProps';
import { useTokens } from '../store/tokens.store';
import {
  getNativeBalance,
  subscribeNativeBalance,
  getAssetBalance,
  subscribeAssetBalance,
  type BalanceSnapshot,
} from '../services/balances';
import { normaliseAddress } from '../utils/format';
import { TokenList } from '../components/TokenList';

export function SaldosPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { active, loading } = useVaultAccounts();
  const { props: chainProps, error: chainError } = useChainProps();
  const tokens = useTokens(active?.address);

  const [balances, setBalances] = useState<Record<string, BalanceSnapshot | null>>({});
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [copied, setCopied] = useState(false);

  const activeAddress = active?.address ?? null;

  // displayAddress memo - COPIADO do WalletDashboard
  const displayAddress = useMemo(() => {
    if (!activeAddress) {
      return null;
    }
    if (!chainProps) {
      return activeAddress;
    }
    try {
      return normaliseAddress(activeAddress, chainProps.ss58Prefix);
    } catch (error) {
      console.warn('[wallet] failed to normalise address', error);
      return activeAddress;
    }
  }, [activeAddress, chainProps]);

  // Effect native balance - COPIADO INTEIRO do WalletDashboard
  useEffect(() => {
    if (!activeAddress) {
      setBalances({});
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      try {
        const initial = await getNativeBalance(activeAddress);
        if (!cancelled) {
          setBalances((prev) => ({ ...prev, native: initial }));
        }
        unsubscribe = await subscribeNativeBalance(activeAddress, (snapshot) => {
          setBalances((prev) => ({ ...prev, native: snapshot }));
        });
      } catch (error) {
        console.error('[wallet] failed to subscribe native balance', error);
      }
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          console.warn('[wallet] failed to unsubscribe native balance', error);
        }
      }
    };
  }, [activeAddress, refreshNonce]);

  // Effect asset balances - COPIADO INTEIRO do WalletDashboard
  useEffect(() => {
    if (!activeAddress) {
      setBalances({});
      return;
    }

    let cancelled = false;
    const unsubscribers: Array<() => void> = [];

    // Filter out native token - it's already handled by subscribeNativeBalance in the previous useEffect
    const assetTokens = tokens.filter((token) => token.assetId !== 'native');

    assetTokens.forEach((token) => {
      (async () => {
        try {
          const snapshot = await getAssetBalance(token.assetId, activeAddress, token);
          if (!cancelled) {
            setBalances((prev) => ({ ...prev, [token.assetId]: snapshot }));
          }
          const unsubscribe = await subscribeAssetBalance(token.assetId, activeAddress, token, (balance) => {
            setBalances((prev) => ({ ...prev, [token.assetId]: balance }));
          });
          unsubscribers.push(unsubscribe);
        } catch (error) {
          console.error(`[wallet] failed to subscribe asset ${token.assetId} balance`, error);
        }
      })();
    });

    return () => {
      cancelled = true;
      unsubscribers.forEach((unsub) => {
        try {
          unsub();
        } catch (error) {
          console.warn('[wallet] failed to unsubscribe asset balance', error);
        }
      });
    };
  }, [activeAddress, tokens, refreshNonce]);

  const handleCopy = useCallback(() => {
    if (displayAddress) {
      navigator.clipboard.writeText(displayAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [displayAddress]);

  // Se não tem conta ativa, mostrar mensagem
  if (!activeAddress) {
    return (
      <Card className="border-dashed border-primary/40">
        <CardHeader>
          <CardTitle>{t('wallet.dashboard.noAccountTitle')}</CardTitle>
          <CardDescription>{t('wallet.dashboard.noAccountDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('wallet.saldos.noAccountHint', {
              defaultValue: 'Acesse as configurações para criar ou importar uma conta.',
            })}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('wallet.saldos.title', { defaultValue: 'Saldos' })}
        </h1>
      </header>

      {chainError && (
        <Alert variant="destructive">
          <AlertDescription>{t('wallet.dashboard.chainError')}</AlertDescription>
        </Alert>
      )}

      {/* Card de Endereco */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {t('wallet.saldos.address', { defaultValue: 'Endereco' })}
              </p>
              <code className="text-sm break-all block">{displayAddress}</code>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Link
                to="/app/wallet/receive"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <ArrowDownToLine className="h-4 w-4 mr-1" />
                {t('wallet.saldos.receive', { defaultValue: 'Receber' })}
              </Link>
              <Link
                to="/app/wallet/send"
                className={buttonVariants({ size: 'sm' })}
              >
                <ArrowUpToLine className="h-4 w-4 mr-1" />
                {t('wallet.saldos.send', { defaultValue: 'Enviar' })}
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card de Saldos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('wallet.balances.title')}</CardTitle>
            <CardDescription>{t('wallet.balances.description')}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRefreshNonce((n) => n + 1)}
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            {t('wallet.balances.refresh')}
          </Button>
        </CardHeader>
        <CardContent>
          <TokenList
            tokens={tokens}
            balances={balances}
            onReceive={(token) => navigate(`/app/wallet/receive?token=${token.assetId}`)}
            onSend={(token) => navigate(`/app/wallet/send?token=${token.assetId}`)}
            onHistory={(token) => navigate(`/app/wallet/history?token=${token.assetId}`)}
            loading={loading}
          />
        </CardContent>
      </Card>
    </section>
  );
}

export default SaldosPage;
