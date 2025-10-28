import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpToLine, Plus, RefreshCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useVaultAccounts } from '../hooks/useVaultAccounts';
import { useChainProps } from '../hooks/useChainProps';
import { addToken, removeToken, useTokens, type WalletToken } from '../store/tokens.store';
import {
  fetchAssetMetadata,
  type AssetMetadata,
} from '../services/assets';
import {
  getNativeBalance,
  subscribeNativeBalance,
  getAssetBalance,
  subscribeAssetBalance,
  type BalanceSnapshot,
} from '../services/balances';
import {
  fetchRecentTransfers,
  subscribeTransferStream,
  type TransferHistoryItem,
} from '../services/history';
import { formatBalance, shortenAddress, normaliseAddress } from '../utils/format';
import { TokenList } from '../components/TokenList';

const HISTORY_BATCH = 25;

export function WalletDashboard() {
  const { t } = useTranslation();
  const { active, accounts, loading } = useVaultAccounts();
  const { props: chainProps, error: chainError } = useChainProps();
  const tokens = useTokens(active?.address);

  const [balances, setBalances] = useState<Record<string, BalanceSnapshot | null>>({});
  const [history, setHistory] = useState<TransferHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyCursor, setHistoryCursor] = useState<number | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const historyMapRef = useRef<Map<string, TransferHistoryItem>>(new Map());
  const [refreshNonce, setRefreshNonce] = useState(0);

  const [assetIdInput, setAssetIdInput] = useState('');
  const [assetPreview, setAssetPreview] = useState<AssetMetadata | null>(null);
  const [assetChecking, setAssetChecking] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [assetSuccess, setAssetSuccess] = useState<string | null>(null);

  const activeAddress = active?.address ?? null;

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

  const tokensMap = useMemo(() => {
    const map = new Map<string, WalletToken>();
    tokens.forEach((token) => map.set(token.assetId, token));
    return map;
  }, [tokens]);

  const nativeBalance = balances.native ?? null;

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

  const sortHistory = useCallback((map: Map<string, TransferHistoryItem>) => {
    return Array.from(map.values()).sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) {
        return b.blockNumber - a.blockNumber;
      }
      return b.timestamp - a.timestamp;
    });
  }, []);

  useEffect(() => {
    if (!activeAddress) {
      historyMapRef.current.clear();
      setHistory([]);
      setHistoryCursor(null);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const load = async () => {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const { items: initial, nextFromBlock } = await fetchRecentTransfers(activeAddress, {
          maxEvents: HISTORY_BATCH,
        });
        if (cancelled) {
          return;
        }
        historyMapRef.current.clear();
        initial.forEach((item) => historyMapRef.current.set(item.id, item));
        setHistory(sortHistory(historyMapRef.current));
        setHistoryCursor(nextFromBlock);
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setHistoryError(t('wallet.history.loadError'));
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }

      try {
        unsubscribe = await subscribeTransferStream(activeAddress, (items) => {
          items.forEach((item) => historyMapRef.current.set(item.id, item));
          setHistory(sortHistory(historyMapRef.current));
        });
      } catch (error) {
        console.error('[wallet] failed to subscribe transfer stream', error);
      }
    };

    void load();

    return () => {
      cancelled = true;
      historyMapRef.current.clear();
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          console.warn('[wallet] failed to unsubscribe history stream', error);
        }
      }
    };
  }, [activeAddress, refreshNonce, sortHistory, t]);

  const handleLoadMore = useCallback(async () => {
    if (!activeAddress || historyCursor === null || historyCursor < 0 || loadingMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const { items: more, nextFromBlock } = await fetchRecentTransfers(activeAddress, {
        maxEvents: HISTORY_BATCH,
        fromBlock: historyCursor,
      });
      if (more.length === 0) {
        setHistoryCursor(nextFromBlock);
        return;
      }
      more.forEach((item) => historyMapRef.current.set(item.id, item));
      setHistory(sortHistory(historyMapRef.current));
      setHistoryCursor(nextFromBlock);
    } catch (error) {
      console.error(error);
      setHistoryError(t('wallet.history.loadError'));
    } finally {
      setLoadingMore(false);
    }
  }, [activeAddress, historyCursor, loadingMore, sortHistory, t]);

  const handleCheckAsset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeAddress) {
      return;
    }
    const input = assetIdInput.trim();
    if (!input) {
      setAssetError(t('wallet.tokens.inputRequired'));
      return;
    }
    if (tokensMap.has(input)) {
      setAssetError(t('wallet.tokens.alreadyAdded'));
      return;
    }

    setAssetChecking(true);
    setAssetError(null);
    setAssetPreview(null);
    setAssetSuccess(null);

    try {
      const metadata = await fetchAssetMetadata(input);
      if (!metadata) {
        setAssetError(t('wallet.tokens.notFound'));
        return;
      }
      setAssetPreview(metadata);
    } catch (error) {
      console.error(error);
      setAssetError(t('wallet.tokens.notFound'));
    } finally {
      setAssetChecking(false);
    }
  };

  const handleAddToken = async () => {
    if (!activeAddress || !assetPreview) {
      return;
    }
    try {
      addToken(activeAddress, {
        assetId: assetPreview.assetId,
        symbol: assetPreview.symbol,
        decimals: assetPreview.decimals,
        name: assetPreview.name || assetPreview.symbol,
        type: 'asset' as const,
        icon: assetPreview.symbol === 'ZARI' ? '🏛️' : '🪙',
      });
      setAssetSuccess(t('wallet.tokens.added'));
      setAssetPreview(null);
      setAssetIdInput('');
    } catch (error) {
      console.error(error);
      setAssetError(t('wallet.tokens.addError'));
    }
  };

  const handleRemoveToken = (token: WalletToken) => {
    if (!activeAddress) {
      return;
    }
    removeToken(activeAddress, token.assetId);
  };


  const historyRows = useMemo(() => {
    return history.map((item) => {
      const isNative = item.section === 'balances';
      const token = item.assetId ? tokensMap.get(item.assetId) : undefined;
      const decimals = isNative ? nativeBalance?.decimals ?? 12 : token?.decimals ?? 0;
      const symbol = isNative
        ? chainProps?.tokenSymbol ?? 'BZR'
        : token?.symbol ?? `#${item.assetId ?? ''}`;
      return {
        ...item,
        decimals,
        symbol,
      };
    });
  }, [chainProps?.tokenSymbol, history, nativeBalance?.decimals, tokensMap]);

  if (!activeAddress) {
    return (
      <Card className="border-dashed border-primary/40">
        <CardHeader>
          <CardTitle>{t('wallet.dashboard.noAccountTitle')}</CardTitle>
          <CardDescription>{t('wallet.dashboard.noAccountDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/app/wallet/accounts" className={buttonVariants({ variant: 'default' })}>
            {t('wallet.dashboard.goToAccounts')}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('wallet.dashboard.title')}</h1>
        <p className="text-muted-foreground">{t('wallet.dashboard.subtitle')}</p>
      </header>

      {chainError && (
        <Alert variant="destructive" role="status" aria-live="assertive">
          <AlertDescription>{t('wallet.dashboard.chainError')}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>{t('wallet.dashboard.accountCard.title')}</CardTitle>
            <CardDescription>{t('wallet.dashboard.accountCard.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('wallet.dashboard.accountCard.addressLabel')}
              </p>
              <code className="block break-all rounded-md bg-muted/50 px-3 py-2 text-sm">
                {displayAddress}
              </code>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                      void navigator.clipboard.writeText(displayAddress ?? activeAddress).catch((error) => {
                        console.error('[wallet] failed to copy address', error);
                      });
                    }
                  }}
                >
                  {t('wallet.dashboard.actions.copyAddress')}
                </Button>
                <Link
                  to="/app/wallet/receive"
                  className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                >
                  <ArrowDownToLine className="mr-2 h-4 w-4" />
                  {t('wallet.dashboard.actions.receive')}
                </Link>
                <Link to="/app/wallet/send" className={buttonVariants({ size: 'sm' })}>
                  <ArrowUpToLine className="mr-2 h-4 w-4" />
                  {t('wallet.dashboard.actions.send')}
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('wallet.dashboard.accountCard.statusLabel')}
                </p>
                <p className="text-sm font-medium text-foreground">
                  {loading ? t('wallet.dashboard.accountCard.loading') : t('wallet.dashboard.accountCard.ready')}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('wallet.dashboard.accountCard.accountsLabel')}
                </p>
                <p className="text-sm font-medium text-foreground">{accounts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>{t('wallet.tokens.title')}</CardTitle>
            <CardDescription>{t('wallet.tokens.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleCheckAsset}>
              <div className="space-y-2">
                <Label htmlFor="asset-id">{t('wallet.tokens.assetIdLabel')}</Label>
                <Input
                  id="asset-id"
                  value={assetIdInput}
                  onChange={(event) => {
                    setAssetIdInput(event.target.value);
                    setAssetError(null);
                    setAssetSuccess(null);
                  }}
                  placeholder={t('wallet.tokens.assetPlaceholder')}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={assetChecking} className="w-full sm:w-auto">
                  {assetChecking ? t('wallet.tokens.checking') : t('wallet.tokens.check')}
                </Button>
              </div>
            </form>

            {assetError && (
              <p className="text-xs text-destructive" role="alert">
                {assetError}
              </p>
            )}
            {assetSuccess && (
              <p className="text-xs text-emerald-600" role="status">
                {assetSuccess}
              </p>
            )}

            {assetPreview && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
                <p className="text-sm font-medium text-foreground">
                  {t('wallet.tokens.previewTitle', { symbol: assetPreview.symbol })}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li>
                    {t('wallet.tokens.previewId', { id: assetPreview.assetId })}
                  </li>
                  <li>
                    {t('wallet.tokens.previewDecimals', { decimals: assetPreview.decimals })}
                  </li>
                  {assetPreview.name && <li>{t('wallet.tokens.previewName', { name: assetPreview.name })}</li>}
                </ul>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => void handleAddToken()}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('wallet.tokens.addConfirm')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setAssetPreview(null);
                      setAssetSuccess(null);
                    }}
                  >
                    {t('wallet.tokens.cancelPreview')}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{t('wallet.tokens.activeLabel')}</p>
                <span className="text-xs text-muted-foreground">{tokens.length || '0'}</span>
              </div>
              {tokens.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('wallet.tokens.empty')}</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {tokens.map((token) => (
                    <li key={token.assetId} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">{token.name ?? token.symbol}</p>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {token.symbol}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{t('wallet.tokens.assetIdDisplay', { id: token.assetId })}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-xs"
                        onClick={() => handleRemoveToken(token)}
                      >
                        {t('wallet.tokens.remove')}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t('wallet.balances.title')}</CardTitle>
            <CardDescription>{t('wallet.balances.description')}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setRefreshNonce((value) => value + 1)}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            {t('wallet.balances.refresh')}
          </Button>
        </CardHeader>
        <CardContent>
          <TokenList
            tokens={tokens}
            balances={balances}
            onReceive={(token) => {
              // Navigate to receive page with token
              window.location.href = `/app/wallet/receive?token=${token.assetId}`;
            }}
            onSend={(token) => {
              // Navigate to send page with token
              window.location.href = `/app/wallet/send?token=${token.assetId}`;
            }}
            onHistory={(token) => {
              // TODO: Filter history by token
              console.log('Show history for', token.symbol);
            }}
            onRemove={(token) => handleRemoveToken(token)}
            loading={loading}
          />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{t('wallet.history.title')}</CardTitle>
          <CardDescription>{t('wallet.history.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {historyError && (
            <Alert variant="destructive">
              <AlertDescription>{historyError}</AlertDescription>
            </Alert>
          )}

          {historyLoading && history.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('wallet.history.loading')}</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('wallet.history.empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border/60 text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">{t('wallet.history.columns.time')}</th>
                    <th className="px-3 py-2 text-left font-medium">{t('wallet.history.columns.event')}</th>
                    <th className="px-3 py-2 text-left font-medium">{t('wallet.history.columns.counterparty')}</th>
                    <th className="px-3 py-2 text-right font-medium">{t('wallet.history.columns.amount')}</th>
                    <th className="px-3 py-2 text-left font-medium">{t('wallet.history.columns.hash')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {historyRows.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="px-3 py-3 align-top text-xs text-muted-foreground">
                        {new Date(item.timestamp).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <span className="text-sm font-medium text-foreground">
                          {item.direction === 'in'
                            ? t('wallet.history.directionIn')
                            : t('wallet.history.directionOut')}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {item.section}.{item.method}
                        </p>
                      </td>
                      <td className="px-3 py-3 align-top text-xs text-muted-foreground">
                        <div className="space-y-1">
                          <div>
                            <span className="font-medium text-foreground">
                              {item.direction === 'in' ? t('wallet.history.from') : t('wallet.history.to')}
                            </span>
                          </div>
                          <code className="block break-all rounded bg-muted/50 px-2 py-1">
                            {item.direction === 'in' ? item.from : item.to}
                          </code>
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top text-right font-medium">
                        {formatBalance(item.amount, item.decimals)} {item.symbol}
                      </td>
                      <td className="px-3 py-3 align-top text-xs text-muted-foreground">
                        {item.extrinsicHash ? shortenAddress(item.extrinsicHash, 6) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => void handleLoadMore()} disabled={loadingMore}>
              {loadingMore ? t('wallet.history.loadingMore') : t('wallet.history.loadMore')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export default WalletDashboard;
