# Wallet App - Exemplo de Migração

**Versão:** 1.0.0
**Data:** 2024-12-03
**Tipo:** App Nativo

---

## Visão Geral

Este documento demonstra como migrar o módulo Wallet existente para a nova arquitetura de apps do BazariOS.

---

## Estrutura Atual (Antes)

```
apps/web/src/
├── pages/
│   └── WalletHome.tsx
├── modules/
│   └── wallet/
│       ├── index.ts
│       ├── WalletHome.tsx
│       └── hooks/
│           └── useWalletBalance.ts
├── components/
│   └── wallet/
│       ├── BalanceCard.tsx
│       ├── TokenList.tsx
│       ├── SendTokenModal.tsx
│       ├── ReceiveModal.tsx
│       └── TransactionHistory.tsx
```

---

## Estrutura Nova (Depois)

```
apps/web/src/apps/wallet/
├── manifest.ts           # Configuração do app
├── index.tsx             # Entry point com rotas
├── pages/
│   ├── WalletHomePage.tsx
│   ├── SendPage.tsx
│   ├── ReceivePage.tsx
│   └── HistoryPage.tsx
├── components/
│   ├── BalanceCard.tsx
│   ├── TokenList.tsx
│   ├── SendTokenModal.tsx
│   ├── ReceiveModal.tsx
│   └── TransactionHistory.tsx
└── hooks/
    ├── useWalletBalance.ts
    └── useTransactions.ts
```

---

## Arquivo: manifest.ts

```typescript
// apps/web/src/apps/wallet/manifest.ts

import { lazy } from 'react';
import type { BazariApp } from '@/platform/types';
import { Wallet } from 'lucide-react';

export const walletApp: BazariApp = {
  // Identificação
  id: 'wallet',
  name: 'Wallet',
  slug: 'wallet',
  version: '1.0.0',

  // Visual
  icon: 'Wallet',
  color: 'from-purple-500 to-purple-600',
  description: 'Gerencie seus tokens BZR e outras criptomoedas',
  longDescription: `
    A Wallet do Bazari permite que você:
    - Visualize seu saldo em BZR e outros tokens
    - Envie e receba tokens para qualquer endereço
    - Acompanhe seu histórico de transações
    - Conecte-se com outras funcionalidades do Bazari
  `,

  // Categorização
  category: 'finance',
  tags: ['crypto', 'tokens', 'bzr', 'pagamentos'],

  // Entry Point
  entryPoint: '/app/wallet',
  component: lazy(() => import('./index')),

  // Permissões
  permissions: [
    {
      id: 'wallet.balance.read',
      reason: 'Para exibir seu saldo atual',
    },
    {
      id: 'wallet.transactions.read',
      reason: 'Para mostrar seu histórico de transações',
    },
    {
      id: 'wallet.send',
      reason: 'Para permitir envio de tokens',
    },
  ],

  // Requisitos
  requiredRoles: [], // Qualquer usuário pode usar

  // Status
  status: 'stable',
  native: true,
  featured: true,
  preInstalled: true, // Vem pré-instalado para todos

  // Metadados adicionais
  screenshots: [
    '/screenshots/wallet-home.png',
    '/screenshots/wallet-send.png',
    '/screenshots/wallet-history.png',
  ],
};

export default walletApp;
```

---

## Arquivo: index.tsx (Entry Point)

```typescript
// apps/web/src/apps/wallet/index.tsx

import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Pages
import WalletHomePage from './pages/WalletHomePage';
import SendPage from './pages/SendPage';
import ReceivePage from './pages/ReceivePage';
import HistoryPage from './pages/HistoryPage';

// Loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
    </div>
  );
}

export default function WalletApp() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Home - Dashboard da wallet */}
        <Route index element={<WalletHomePage />} />

        {/* Enviar tokens */}
        <Route path="send" element={<SendPage />} />
        <Route path="send/:address" element={<SendPage />} />

        {/* Receber tokens */}
        <Route path="receive" element={<ReceivePage />} />

        {/* Histórico */}
        <Route path="history" element={<HistoryPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/app/wallet" replace />} />
      </Routes>
    </Suspense>
  );
}
```

---

## Arquivo: pages/WalletHomePage.tsx

```typescript
// apps/web/src/apps/wallet/pages/WalletHomePage.tsx

import { useNavigate } from 'react-router-dom';
import { Send, QrCode, History, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Componentes internos do app
import { BalanceCard } from '../components/BalanceCard';
import { TokenList } from '../components/TokenList';
import { RecentTransactions } from '../components/RecentTransactions';

// Hooks internos do app
import { useWalletBalance } from '../hooks/useWalletBalance';
import { useTransactions } from '../hooks/useTransactions';

export default function WalletHomePage() {
  const navigate = useNavigate();
  const { balance, tokens, isLoading, refetch } = useWalletBalance();
  const { transactions } = useTransactions({ limit: 5 });

  return (
    <div className="container max-w-2xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Wallet</h1>
        <Button variant="ghost" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-5 w-5" />
        </Button>
      </div>

      {/* Saldo Principal */}
      <BalanceCard balance={balance} isLoading={isLoading} />

      {/* Ações Rápidas */}
      <div className="grid grid-cols-3 gap-4">
        <Button
          variant="outline"
          className="flex flex-col h-20 gap-2"
          onClick={() => navigate('/app/wallet/send')}
        >
          <Send className="h-5 w-5" />
          <span>Enviar</span>
        </Button>

        <Button
          variant="outline"
          className="flex flex-col h-20 gap-2"
          onClick={() => navigate('/app/wallet/receive')}
        >
          <QrCode className="h-5 w-5" />
          <span>Receber</span>
        </Button>

        <Button
          variant="outline"
          className="flex flex-col h-20 gap-2"
          onClick={() => navigate('/app/wallet/history')}
        >
          <History className="h-5 w-5" />
          <span>Histórico</span>
        </Button>
      </div>

      {/* Lista de Tokens */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Seus Tokens</h2>
        <TokenList tokens={tokens} isLoading={isLoading} />
      </Card>

      {/* Transações Recentes */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Transações Recentes</h2>
          <Button
            variant="link"
            size="sm"
            onClick={() => navigate('/app/wallet/history')}
          >
            Ver todas
          </Button>
        </div>
        <RecentTransactions transactions={transactions} />
      </Card>
    </div>
  );
}
```

---

## Arquivo: components/BalanceCard.tsx

```typescript
// apps/web/src/apps/wallet/components/BalanceCard.tsx

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBZR } from '@/lib/format';

interface BalanceCardProps {
  balance: string | null;
  isLoading: boolean;
}

export function BalanceCard({ balance, isLoading }: BalanceCardProps) {
  if (isLoading) {
    return (
      <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
        <p className="text-sm opacity-80">Saldo Total</p>
        <Skeleton className="h-10 w-40 bg-white/20 mt-2" />
        <Skeleton className="h-4 w-24 bg-white/20 mt-2" />
      </Card>
    );
  }

  const formattedBalance = balance ? formatBZR(balance) : '0.00';

  return (
    <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
      <p className="text-sm opacity-80">Saldo Total</p>
      <p className="text-4xl font-bold mt-1">{formattedBalance} BZR</p>
      <p className="text-sm opacity-80 mt-1">
        ≈ R$ {/* TODO: conversão para fiat */}
      </p>
    </Card>
  );
}
```

---

## Arquivo: hooks/useWalletBalance.ts

```typescript
// apps/web/src/apps/wallet/hooks/useWalletBalance.ts

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBlockchain } from '@/hooks/blockchain/useBlockchain';
import { useAuth } from '@/hooks/useAuth';

interface Token {
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  icon?: string;
}

interface WalletBalanceResult {
  balance: string | null;
  tokens: Token[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useWalletBalance(): WalletBalanceResult {
  const { user } = useAuth();
  const { api } = useBlockchain();
  const queryClient = useQueryClient();

  const walletAddress = user?.walletAddress;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['wallet-balance', walletAddress],
    queryFn: async () => {
      if (!api || !walletAddress) {
        return { balance: null, tokens: [] };
      }

      // Buscar saldo nativo (BZR)
      const accountInfo = await api.query.system.account(walletAddress);
      const freeBalance = accountInfo.data.free.toString();

      // TODO: Buscar outros tokens se houver

      const tokens: Token[] = [
        {
          symbol: 'BZR',
          name: 'Bazari Token',
          balance: freeBalance,
          decimals: 12,
          icon: '/tokens/bzr.png',
        },
      ];

      return {
        balance: freeBalance,
        tokens,
      };
    },
    enabled: !!api && !!walletAddress,
    staleTime: 30_000, // 30 segundos
    refetchInterval: 60_000, // 1 minuto
  });

  return {
    balance: data?.balance ?? null,
    tokens: data?.tokens ?? [],
    isLoading,
    error: error as Error | null,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      refetch();
    },
  };
}
```

---

## Registro no Native Apps

```typescript
// platform/registry/native-apps.ts

import { walletApp } from '@/apps/wallet/manifest';
import { feedApp } from '@/apps/feed/manifest';
import { marketplaceApp } from '@/apps/marketplace/manifest';
// ... outros apps

export const NATIVE_APPS: BazariApp[] = [
  walletApp,
  feedApp,
  marketplaceApp,
  // ... outros apps
];
```

---

## Atualização no App.tsx

```typescript
// Antes (hardcoded)
<Route path="/app/wallet/*" element={<WalletHome />} />

// Depois (dinâmico via registry)
// Rotas são geradas automaticamente pelo AppRouter
// baseado nos apps registrados no registry
```

---

## Checklist de Migração do Wallet

- [x] Criar pasta `apps/wallet/`
- [x] Criar `manifest.ts` com todas as propriedades
- [x] Criar `index.tsx` com rotas internas
- [x] Mover páginas para `pages/`
- [x] Mover componentes para `components/`
- [x] Mover hooks para `hooks/`
- [x] Atualizar todos os imports relativos
- [x] Registrar em `native-apps.ts`
- [x] Testar todas as rotas
- [x] Testar componentes
- [x] Testar hooks
- [x] Remover código legado

---

## Notas de Migração

### Imports que Mudam

```typescript
// Antes
import { WalletCard } from '@/components/wallet/WalletCard';
import { useWalletBalance } from '@/modules/wallet/hooks/useWalletBalance';

// Depois (dentro do app wallet)
import { WalletCard } from '../components/WalletCard';
import { useWalletBalance } from '../hooks/useWalletBalance';

// Depois (de fora do app wallet - não recomendado)
import { WalletCard } from '@/apps/wallet/components/WalletCard';
```

### Dependências Compartilhadas

Estes hooks/serviços permanecem em seus locais originais:

```typescript
// Continuam em @/hooks/
import { useAuth } from '@/hooks/useAuth';
import { useBlockchain } from '@/hooks/blockchain/useBlockchain';

// Continuam em @/lib/
import { formatBZR } from '@/lib/format';

// Continuam em @/components/ui/
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
```

---

**Documento:** APP-EXAMPLES/wallet-app.md
**Versão:** 1.0.0
