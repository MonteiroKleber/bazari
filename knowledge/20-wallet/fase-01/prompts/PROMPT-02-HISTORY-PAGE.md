# PROMPT 02: Criar HistoryPage

## Contexto

Voce vai criar uma nova pagina `HistoryPage.tsx` para a Wallet, extraindo a logica de historico do `WalletDashboard.tsx` existente.

## REGRAS OBRIGATORIAS

1. **EXTRAIR, NAO REESCREVER** - Copiar codigo existente
2. **NAO MODIFICAR** services, hooks ou stores
3. **MANTER** toda logica de paginacao e streaming intacta

## Arquivos de Referencia

LER PRIMEIRO:
- `apps/web/src/modules/wallet/pages/WalletDashboard.tsx` - Fonte do codigo
- `apps/web/src/modules/wallet/services/history.ts` - Service de historico

## Tarefa

### Passo 1: Criar HistoryPage.tsx

Criar arquivo `apps/web/src/modules/wallet/pages/HistoryPage.tsx`:

1. Copiar imports necessarios do WalletDashboard
2. Copiar estados de history
3. Copiar effects de history (fetch + subscribe)
4. Copiar handleLoadMore
5. Copiar historyRows memo
6. Adicionar filtro por token (URL param)
7. Criar JSX com tabela

### Passo 2: Filtro por Token (NOVA FEATURE)

```typescript
import { useSearchParams } from 'react-router-dom';

const [searchParams, setSearchParams] = useSearchParams();
const filterToken = searchParams.get('token');

const filteredRows = useMemo(() => {
  if (!filterToken) return historyRows;
  return historyRows.filter(item => {
    if (filterToken === 'native') return !item.assetId || item.assetId === 'native';
    return item.assetId === filterToken;
  });
}, [historyRows, filterToken]);

const clearFilter = () => {
  searchParams.delete('token');
  setSearchParams(searchParams);
};
```

## Estrutura Esperada

```typescript
// apps/web/src/modules/wallet/pages/HistoryPage.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Filter, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useVaultAccounts } from '../hooks/useVaultAccounts';
import { useChainProps } from '../hooks/useChainProps';
import { useTokens } from '../store/tokens.store';
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

  // Estados - COPIAR do WalletDashboard
  const [history, setHistory] = useState<TransferHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyCursor, setHistoryCursor] = useState<number | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const historyMapRef = useRef<Map<string, TransferHistoryItem>>(new Map());

  const activeAddress = active?.address ?? null;
  const filterToken = searchParams.get('token');

  // displayAddress para formatacao
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

  // Effect de history - COPIAR INTEIRO do WalletDashboard
  useEffect(() => {
    if (!activeAddress) {
      setHistory([]);
      setHistoryCursor(null);
      historyMapRef.current.clear();
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      setHistoryLoading(true);
      setHistoryError(null);

      try {
        // ... COPIAR TODA A LOGICA do WalletDashboard
      } catch (error) {
        console.error('[wallet] failed to fetch history', error);
        if (!cancelled) {
          setHistoryError(t('wallet.history.fetchError'));
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          console.warn('[wallet] failed to unsubscribe history', error);
        }
      }
    };
  }, [activeAddress, t]);

  // handleLoadMore - COPIAR do WalletDashboard
  const handleLoadMore = async () => {
    if (!activeAddress || historyCursor === null || loadingMore) return;
    // ... COPIAR TODA A LOGICA
  };

  // historyRows memo - COPIAR do WalletDashboard
  const historyRows = useMemo(() => {
    return history
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [history]);

  // Filtro aplicado
  const filteredRows = useMemo(() => {
    if (!filterToken) return historyRows;
    return historyRows.filter((item) => {
      if (filterToken === 'native') return !item.assetId || item.assetId === 'native';
      return item.assetId === filterToken;
    });
  }, [historyRows, filterToken]);

  // Nome do token filtrado
  const filterTokenName = useMemo(() => {
    if (!filterToken) return null;
    if (filterToken === 'native') return 'BZR';
    const token = tokens.find((t) => t.assetId === filterToken);
    return token?.symbol || filterToken;
  }, [filterToken, tokens]);

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
        <CardContent className="pt-6">
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
          {!filterToken && historyCursor !== null && (
            <div className="flex justify-center mt-4">
              <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={loadingMore}>
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
```

## Validacao

Apos implementar, verificar:
- [ ] Historico carrega na abertura
- [ ] Loading state funciona
- [ ] Tabela renderiza corretamente
- [ ] Paginacao funciona (Load More)
- [ ] Streaming de novas transacoes funciona
- [ ] Filtro por token funciona (?token=native)
- [ ] Filtro por asset funciona (?token=1)
- [ ] Limpar filtro funciona
- [ ] Formatacao de valores correta
- [ ] Direcao (in/out) correta
- [ ] Nenhum erro no console

## NAO FAZER

- NAO modificar WalletDashboard ainda
- NAO modificar history.ts service
- NAO modificar format.ts
- NAO mudar logica de paginacao
- NAO mudar logica de streaming
