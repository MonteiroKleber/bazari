import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Filter, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useVaultAccounts } from '../hooks/useVaultAccounts';
import { useChainProps } from '../hooks/useChainProps';
import { useTokens, type WalletToken } from '../store/tokens.store';
import {
  fetchRecentTransfers,
  subscribeTransferStream,
  type TransferHistoryItem,
} from '../services/history';
import { formatBalance, shortenAddress, normaliseAddress } from '../utils/format';

const HISTORY_BATCH = 25;

export function HistoryPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const { active } = useVaultAccounts();
  const { props: chainProps } = useChainProps();
  const tokens = useTokens(active?.address);

  // Estados - COPIADOS do WalletDashboard
  const [history, setHistory] = useState<TransferHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyCursor, setHistoryCursor] = useState<number | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const historyMapRef = useRef<Map<string, TransferHistoryItem>>(new Map());

  const activeAddress = active?.address ?? null;
  const filterToken = searchParams.get('token');

  // tokensMap para lookup rapido
  const tokensMap = useMemo(() => {
    const map = new Map<string, WalletToken>();
    tokens.forEach((token) => map.set(token.assetId, token));
    return map;
  }, [tokens]);

  // nativeBalance para decimais do token nativo
  const nativeDecimals = chainProps?.tokenDecimals ?? 12;
  const nativeSymbol = chainProps?.tokenSymbol ?? 'BZR';

  // displayAddress para formatacao - COPIADO do WalletDashboard
  const displayAddress = useCallback(
    (address: string | undefined) => {
      if (!address) return '';
      if (!chainProps) return shortenAddress(address, 6);
      try {
        return shortenAddress(normaliseAddress(address, chainProps.ss58Prefix), 6);
      } catch {
        return shortenAddress(address, 6);
      }
    },
    [chainProps]
  );

  // sortHistory - COPIADO do WalletDashboard
  const sortHistory = useCallback((map: Map<string, TransferHistoryItem>) => {
    return Array.from(map.values()).sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) {
        return b.blockNumber - a.blockNumber;
      }
      return b.timestamp - a.timestamp;
    });
  }, []);

  // Effect de history - COPIADO INTEIRO do WalletDashboard
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
  }, [activeAddress, sortHistory, t]);

  // handleLoadMore - COPIADO do WalletDashboard
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

  // historyRows memo - COPIADO do WalletDashboard
  const historyRows = useMemo(() => {
    return history.map((item) => {
      const isNative = item.section === 'balances';
      const token = item.assetId ? tokensMap.get(item.assetId) : undefined;
      const decimals = isNative ? nativeDecimals : token?.decimals ?? 0;
      const symbol = isNative ? nativeSymbol : token?.symbol ?? `#${item.assetId ?? ''}`;
      return {
        ...item,
        decimals,
        symbol,
      };
    });
  }, [history, nativeDecimals, nativeSymbol, tokensMap]);

  // Filtro aplicado
  const filteredRows = useMemo(() => {
    if (!filterToken) return historyRows;
    return historyRows.filter((item) => {
      if (filterToken === 'native') {
        return item.section === 'balances' || !item.assetId || item.assetId === 'native';
      }
      return item.assetId === filterToken;
    });
  }, [historyRows, filterToken]);

  // Nome do token filtrado
  const filterTokenName = useMemo(() => {
    if (!filterToken) return null;
    if (filterToken === 'native') return nativeSymbol;
    const token = tokens.find((t) => t.assetId === filterToken);
    return token?.symbol || filterToken;
  }, [filterToken, tokens, nativeSymbol]);

  const clearFilter = () => {
    searchParams.delete('token');
    setSearchParams(searchParams);
  };

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('wallet.history.title')}
        </h1>
        <p className="text-muted-foreground">{t('wallet.history.description')}</p>
      </header>

      {/* Filtro ativo */}
      {filterToken && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {t('wallet.history.filterActive', {
              token: filterTokenName,
              defaultValue: `Filtrando por ${filterTokenName}`,
            })}
          </span>
          <Button variant="ghost" size="sm" onClick={clearFilter} className="h-6 px-2">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {historyError && (
        <Alert variant="destructive">
          <AlertDescription>{historyError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('wallet.history.title')}</CardTitle>
          <CardDescription>{t('wallet.history.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {historyLoading && filteredRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('wallet.history.loading')}</p>
          ) : filteredRows.length === 0 ? (
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
                  {filteredRows.map((item) => (
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
                          <span className="font-medium text-foreground">
                            {item.direction === 'in' ? t('wallet.history.from') : t('wallet.history.to')}
                          </span>
                          <code className="block break-all rounded bg-muted/50 px-2 py-1">
                            {displayAddress(item.direction === 'in' ? item.from : item.to)}
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

          {/* Load More - so mostra se nao filtrado e tem mais dados */}
          {!filterToken && historyCursor !== null && historyCursor >= 0 && (
            <div className="flex justify-center mt-4">
              <Button variant="outline" size="sm" onClick={() => void handleLoadMore()} disabled={loadingMore}>
                {loadingMore ? t('wallet.history.loadingMore') : t('wallet.history.loadMore')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export default HistoryPage;
