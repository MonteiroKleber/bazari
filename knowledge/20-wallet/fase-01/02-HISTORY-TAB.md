# Feature 02: Tab Historico Dedicada

## Objetivo

Criar uma pagina dedicada para historico de transacoes, extraindo a logica existente do WalletDashboard.

## REGRA DE OURO

```
EXTRAIR, NAO REESCREVER
```

Toda a logica de historico ja existe em WalletDashboard.tsx (linhas ~563-640).

## O Que Extrair do WalletDashboard

### 1. Imports Necessarios
```typescript
// De WalletDashboard.tsx - COPIAR
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useVaultAccounts } from '../hooks/useVaultAccounts';
import { useChainProps } from '../hooks/useChainProps';
import { useTokens } from '../store/tokens.store';
import {
  fetchRecentTransfers,
  subscribeTransferStream,
  type TransferHistoryItem,
} from '../services/history';
import { formatBalance, shortenAddress, normaliseAddress } from '../utils/format';
```

### 2. Estados a Extrair
```typescript
// Linha ~40-46 do WalletDashboard
const [history, setHistory] = useState<TransferHistoryItem[]>([]);
const [historyError, setHistoryError] = useState<string | null>(null);
const [historyCursor, setHistoryCursor] = useState<number | null>(null);
const [historyLoading, setHistoryLoading] = useState(false);
const [loadingMore, setLoadingMore] = useState(false);
const historyMapRef = useRef<Map<string, TransferHistoryItem>>(new Map());

const HISTORY_BATCH = 25;
```

### 3. Effects a Extrair
```typescript
// Effect de history (linha ~157-220 aproximadamente)
useEffect(() => {
  if (!activeAddress) {
    setHistory([]);
    setHistoryCursor(null);
    return;
  }
  // ... resto do effect
}, [activeAddress]);
```

### 4. Handlers a Extrair
```typescript
// handleLoadMore (linha ~269-290 aproximadamente)
const handleLoadMore = async () => {
  if (!activeAddress || historyCursor === null || loadingMore) return;
  // ...
};
```

### 5. Memos a Extrair
```typescript
// historyRows memo (linha ~330-345 aproximadamente)
const historyRows = useMemo(() => {
  return history
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}, [history]);
```

### 6. JSX a Extrair
```tsx
// Card de historico (linha ~563-637)
<Card className="shadow-sm">
  <CardHeader>
    <CardTitle>{t('wallet.history.title')}</CardTitle>
    <CardDescription>{t('wallet.history.description')}</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* ... tabela completa ... */}
  </CardContent>
</Card>
```

## Nova Feature: Filtro por Token

Adicionar filtro opcional por token (URL param `?token=assetId`).

```typescript
// Usar searchParams para filtro
const [searchParams] = useSearchParams();
const filterToken = searchParams.get('token');

// Filtrar historyRows se token especificado
const filteredRows = useMemo(() => {
  if (!filterToken) return historyRows;
  return historyRows.filter(item =>
    item.assetId === filterToken ||
    (filterToken === 'native' && !item.assetId)
  );
}, [historyRows, filterToken]);
```

## Estrutura do Novo Arquivo

```typescript
// apps/web/src/modules/wallet/pages/HistoryPage.tsx

import { /* imports copiados */ } from '...';
import { Filter, X } from 'lucide-react';

const HISTORY_BATCH = 25;

export function HistoryPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Hooks existentes
  const { active } = useVaultAccounts();
  const { props: chainProps } = useChainProps();
  const tokens = useTokens(active?.address);

  // Estados copiados
  const [history, setHistory] = useState<TransferHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyCursor, setHistoryCursor] = useState<number | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const historyMapRef = useRef<Map<string, TransferHistoryItem>>(new Map());

  const activeAddress = active?.address ?? null;

  // Filtro por token (NOVA FEATURE)
  const filterToken = searchParams.get('token');

  // Effect copiado INTEIRO
  useEffect(() => {
    // ... copiar do WalletDashboard
  }, [activeAddress]);

  // handleLoadMore copiado
  const handleLoadMore = async () => {
    // ... copiar do WalletDashboard
  };

  // historyRows memo copiado
  const historyRows = useMemo(() => {
    return history
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [history]);

  // Filtro aplicado (NOVA FEATURE)
  const filteredRows = useMemo(() => {
    if (!filterToken) return historyRows;
    return historyRows.filter(item => {
      if (filterToken === 'native') return !item.assetId || item.assetId === 'native';
      return item.assetId === filterToken;
    });
  }, [historyRows, filterToken]);

  // Handler para limpar filtro
  const clearFilter = () => {
    searchParams.delete('token');
    setSearchParams(searchParams);
  };

  // Obter nome do token filtrado
  const filterTokenName = useMemo(() => {
    if (!filterToken) return null;
    if (filterToken === 'native') return 'BZR';
    const token = tokens.find(t => t.assetId === filterToken);
    return token?.symbol || filterToken;
  }, [filterToken, tokens]);

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('wallet.history.title')}</h1>
          <p className="text-muted-foreground">{t('wallet.history.description')}</p>
        </div>
      </header>

      {/* Filtro ativo (NOVA FEATURE) */}
      {filterToken && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {t('wallet.history.filterActive', { token: filterTokenName })}
          </span>
          <Button variant="ghost" size="sm" onClick={clearFilter}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Erro */}
      {historyError && (
        <Alert variant="destructive">
          <AlertDescription>{historyError}</AlertDescription>
        </Alert>
      )}

      {/* Card principal */}
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
                      {/* ... copiar colunas do WalletDashboard ... */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Load More - so mostra se nao filtrado ou se cursor disponivel */}
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

## Traducoes Necessarias

Adicionar em `locales/pt/translation.json`:
```json
{
  "wallet": {
    "history": {
      "filterActive": "Filtrando por {{token}}"
    }
  }
}
```

## Integracao com TokenList

O `TokenList` atual tem `onHistory` callback. Modificar para navegar para HistoryPage:

```typescript
// Em SaldosPage
onHistory={(token) => navigate(`/app/wallet/history?token=${token.assetId}`)}
```

## Checklist de Validacao

- [ ] Historico carrega na abertura
- [ ] Paginacao funciona (Load More)
- [ ] Streaming de novas transacoes funciona
- [ ] Filtro por token funciona (via URL param)
- [ ] Limpar filtro funciona
- [ ] Link do TokenList navega corretamente
- [ ] Formatacao de valores correta
- [ ] Direcao (in/out) correta
- [ ] Data/hora formatada
- [ ] Hash truncado corretamente

## Dependencias

- `history.ts` service - Usar sem modificar
- `useVaultAccounts` - Usar sem modificar
- `format.ts` utils - Usar sem modificar

## Nao Fazer

- NAO modificar o service de history
- NAO criar novos hooks
- NAO mudar logica de paginacao
- NAO mudar logica de streaming
