# Governance Module - Implementation Guide

Guia completo para implementação e extensão do módulo de governança.

## 📋 Tabela de Conteúdos

1. [Arquitetura](#arquitetura)
2. [Adicionando Novas Propostas](#adicionando-novas-propostas)
3. [Criando Novos Componentes](#criando-novos-componentes)
4. [Integrando com Blockchain](#integrando-com-blockchain)
5. [Adicionando Notificações](#adicionando-notificações)
6. [Testando](#testando)
7. [Performance](#performance)
8. [Best Practices](#best-practices)

---

## 🏗️ Arquitetura

### Fluxo de Dados

```
┌─────────────┐
│   Pages     │  (GovernancePage, ProposalsListPage, etc.)
└──────┬──────┘
       │
       ├─────> ┌───────────────┐
       │       │   Components  │  (Dashboard, Multisig, Filters)
       │       └───────────────┘
       │
       ├─────> ┌───────────────┐
       │       │     Hooks     │  (useGovernanceNotifications, etc.)
       │       └───────────────┘
       │
       └─────> ┌───────────────┐
               │      API      │  (governanceApi)
               └──────┬────────┘
                      │
       ┌──────────────┼──────────────┐
       │              │              │
   ┌───▼────┐   ┌────▼─────┐  ┌────▼────┐
   │Backend │   │WebSocket │  │Polkadot │
   │  REST  │   │  Events  │  │   API   │
   └────────┘   └──────────┘  └─────────┘
```

### Camadas

1. **Pages** - Páginas principais, gerenciam rotas
2. **Components** - Componentes reutilizáveis, UI pura
3. **Hooks** - Lógica de negócio, state management
4. **API** - Integração com backend e blockchain
5. **Types** - TypeScript definitions

---

## ➕ Adicionando Novas Propostas

### 1. Definir o Tipo

```typescript
// src/modules/governance/types/index.ts

export interface MyNewProposal extends GovernanceProposal {
  type: 'MY_NEW_TYPE';
  specificField: string;
  anotherField: number;
}

// Adicionar ao union type
export type AnyProposal =
  | TreasuryProposal
  | DemocracyProposal
  | CouncilProposal
  | MyNewProposal;  // ← Adicionar aqui
```

### 2. Criar Componente de Visualização

```typescript
// src/modules/governance/components/proposals/MyNewProposalCard.tsx

import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MyNewProposal } from '../../types';

export interface MyNewProposalCardProps {
  proposal: MyNewProposal;
  onClick?: () => void;
}

export function MyNewProposalCard({ proposal, onClick }: MyNewProposalCardProps) {
  return (
    <Card className="proposal-card" onClick={onClick}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <h3>{proposal.title}</h3>
          <Badge className="status-active">{proposal.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p>{proposal.description}</p>
        <div className="mt-4">
          <span>Specific Field: {proposal.specificField}</span>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 3. Adicionar Rota

```typescript
// src/modules/governance/pages/index.tsx

import { MyNewProposalDetailPage } from './MyNewProposalDetailPage';

export function GovernancePage() {
  return (
    <Routes>
      {/* ... outras rotas ... */}
      <Route
        path="proposals/mynew/:id"
        element={<MyNewProposalDetailPage />}
      />
    </Routes>
  );
}
```

### 4. Integrar com API

```typescript
// src/modules/governance/api/index.ts

export const governanceApi = {
  // ... outros métodos ...

  getMyNewProposals: () =>
    fetchJSON<MyNewProposal[]>('/governance/mynew/proposals'),

  getMyNewProposalDetail: (id: number) =>
    fetchJSON<MyNewProposal>(`/governance/mynew/proposals/${id}`),
};
```

### 5. Adicionar ao Dashboard

```typescript
// src/modules/governance/pages/GovernancePage.tsx

const [myNewCount, setMyNewCount] = useState(0);

useEffect(() => {
  governanceApi.getMyNewProposals().then(res => {
    if (res.success) {
      setMyNewCount(res.data.length);
    }
  });
}, []);

// Adicionar widget no dashboard
<GovernanceStatsWidget
  title="My New Proposals"
  value={myNewCount}
  icon={<YourIcon />}
  trend="up"
/>
```

---

## 🎨 Criando Novos Componentes

### Template de Componente

```typescript
// src/modules/governance/components/your-feature/YourComponent.tsx

import { cn } from '@/lib/utils';
import '../styles.css';  // Import governance styles

/**
 * YourComponent - Brief description
 *
 * @example
 * ```tsx
 * <YourComponent
 *   prop1="value"
 *   onAction={handleAction}
 * />
 * ```
 */
export interface YourComponentProps {
  /** Description of prop1 */
  prop1: string;
  /** Optional prop with default */
  prop2?: number;
  /** Callback function */
  onAction?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function YourComponent({
  prop1,
  prop2 = 10,
  onAction,
  className
}: YourComponentProps) {
  return (
    <div
      className={cn(
        'governance-card',
        'animate-fade-slide-in',
        className
      )}
    >
      <h3>{prop1}</h3>
      <p>Value: {prop2}</p>
      {onAction && (
        <button onClick={onAction}>
          Action
        </button>
      )}
    </div>
  );
}
```

### Adicionar ao Index

```typescript
// src/modules/governance/components/index.ts

export * from './your-feature/YourComponent';
```

### Criar Skeleton Loader (se necessário)

```typescript
// src/modules/governance/components/SkeletonLoader.tsx

export function YourComponentSkeleton({ className }: SkeletonProps) {
  return (
    <Card className={cn('animate-fade-slide-in', className)}>
      <CardHeader>
        <Skeleton className="h-6 w-3/4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  );
}
```

---

## ⛓️ Integrando com Blockchain

### 1. Setup Polkadot API

```typescript
// src/lib/polkadot.ts

import { ApiPromise, WsProvider } from '@polkadot/api';

const wsProvider = new WsProvider('ws://127.0.0.1:9944');
export const api = await ApiPromise.create({ provider: wsProvider });
```

### 2. Query da Blockchain

```typescript
// src/modules/governance/hooks/useChainData.ts

import { api } from '@/lib/polkadot';

export function useChainData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Query example
        const proposals = await api.query.democracy.publicProps();
        const parsed = proposals.map(([id, proposal]) => ({
          id: id.toString(),
          hash: proposal.hash.toString(),
          proposer: proposal.proposer.toString(),
        }));

        setData(parsed);
      } catch (error) {
        console.error('Chain query failed:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { data, loading };
}
```

### 3. Enviar Transação

```typescript
// src/modules/governance/hooks/useVote.ts

import { api } from '@/lib/polkadot';
import { useWallet } from '@/hooks/useWallet';

export function useVote() {
  const { account, signer } = useWallet();

  async function vote(
    referendumId: number,
    aye: boolean,
    amount: string,
    conviction: number
  ) {
    if (!account || !signer) {
      throw new Error('Wallet not connected');
    }

    const tx = api.tx.democracy.vote(
      referendumId,
      {
        Standard: {
          vote: { aye, conviction },
          balance: amount
        }
      }
    );

    const hash = await tx.signAndSend(account, { signer });
    return hash.toString();
  }

  return { vote };
}
```

### 4. Subscribe a Eventos

```typescript
// src/modules/governance/hooks/useBlockchainEvents.ts

export function useBlockchainEvents() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    let unsubscribe: () => void;

    async function subscribe() {
      unsubscribe = await api.query.system.events((events) => {
        const governanceEvents = events
          .filter(({ event }) =>
            event.section === 'democracy' ||
            event.section === 'treasury'
          )
          .map(({ event }) => ({
            section: event.section,
            method: event.method,
            data: event.data.toString(),
          }));

        setEvents(prev => [...prev, ...governanceEvents]);
      });
    }

    subscribe();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return { events };
}
```

---

## 🔔 Adicionando Notificações

### 1. Definir Tipo de Notificação

```typescript
// src/modules/governance/types/index.ts

export type NotificationType =
  | 'proposal_created'
  | 'proposal_passed'
  | 'vote_cast'
  | 'multisig_approval'
  | 'my_new_notification';  // ← Adicionar aqui
```

### 2. Criar Handler

```typescript
// src/modules/governance/hooks/useGovernanceNotifications.ts

function handleWebSocketMessage(event: MessageEvent) {
  const notification = JSON.parse(event.data) as GovernanceNotification;

  // Adicionar handler
  switch (notification.type) {
    case 'my_new_notification':
      handleMyNewNotification(notification);
      break;
    // ... outros cases
  }
}

function handleMyNewNotification(notification: GovernanceNotification) {
  // Mostrar toast
  if (showToasts) {
    toast.info(notification.title, {
      description: notification.message,
    });
  }

  // Adicionar à lista
  setNotifications(prev => [notification, ...prev]);
}
```

### 3. Backend (enviar notificação)

```typescript
// Backend: src/services/governance-notifications.ts

export async function sendNotification(
  userId: string,
  notification: GovernanceNotification
) {
  // Via WebSocket
  const ws = getUserWebSocket(userId);
  if (ws) {
    ws.send(JSON.stringify(notification));
  }

  // Salvar no banco para histórico
  await db.notification.create({
    data: {
      userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
    }
  });
}
```

---

## 🧪 Testando

### Unit Test

```typescript
// src/modules/governance/components/YourComponent.test.tsx

import { render, screen } from '@testing-library/react';
import { YourComponent } from './YourComponent';

describe('YourComponent', () => {
  it('renders correctly', () => {
    render(<YourComponent prop1="test" />);
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('calls onAction when button clicked', () => {
    const handleAction = vi.fn();
    render(<YourComponent prop1="test" onAction={handleAction} />);

    screen.getByRole('button').click();
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});
```

### E2E Test

```typescript
// src/modules/governance/__tests__/e2e/your-feature.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Your Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/unlock');
    await page.fill('[data-testid="pin-input"]', '1234');
    await page.click('button[type="submit"]');
  });

  test('user can perform action', async ({ page }) => {
    await page.goto('/app/governance/your-feature');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Perform action
    await page.click('button:has-text("Do Something")');

    // Verify result
    await expect(page.locator('.success-message')).toBeVisible();
  });
});
```

### Integration Test (com blockchain)

```typescript
// src/modules/governance/__tests__/integration/voting.test.ts

import { api } from '@/lib/polkadot';
import { Keyring } from '@polkadot/keyring';

describe('Voting Integration', () => {
  let alice: KeyringPair;

  beforeAll(async () => {
    const keyring = new Keyring({ type: 'sr25519' });
    alice = keyring.addFromUri('//Alice');
  });

  it('should vote on referendum', async () => {
    const tx = api.tx.democracy.vote(0, {
      Standard: {
        vote: { aye: true, conviction: 1 },
        balance: 1000
      }
    });

    const hash = await tx.signAndSend(alice);
    expect(hash.toString()).toBeTruthy();
  });
});
```

---

## ⚡ Performance

### 1. Lazy Loading de Componentes

```typescript
// src/modules/governance/pages/index.tsx

import { lazy, Suspense } from 'react';
import { ProposalListSkeleton } from '../components/SkeletonLoader';

const ProposalsListPage = lazy(() =>
  import('./ProposalsListPage').then(m => ({ default: m.ProposalsListPage }))
);

export function GovernancePage() {
  return (
    <Suspense fallback={<ProposalListSkeleton />}>
      <ProposalsListPage />
    </Suspense>
  );
}
```

### 2. Memoização

```typescript
import { memo, useMemo } from 'react';

export const ProposalCard = memo(function ProposalCard({ proposal }: Props) {
  // Only re-render if proposal changes
  const stats = useMemo(() =>
    calculateProposalStats(proposal),
    [proposal]
  );

  return <Card>{/* ... */}</Card>;
});
```

### 3. Virtual Scrolling

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

export function ProposalsList({ proposals }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: proposals.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // altura estimada
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(item => (
          <div key={item.key} style={{ transform: `translateY(${item.start}px)` }}>
            <ProposalCard proposal={proposals[item.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 4. Debounce em Buscas

```typescript
import { useDebouncedCallback } from 'use-debounce';

export function SearchBar() {
  const [search, setSearch] = useState('');

  const debouncedSearch = useDebouncedCallback(
    (value: string) => {
      // Perform search
      searchProposals(value);
    },
    300 // 300ms delay
  );

  return (
    <input
      type="search"
      value={search}
      onChange={(e) => {
        setSearch(e.target.value);
        debouncedSearch(e.target.value);
      }}
    />
  );
}
```

---

## ✅ Best Practices

### 1. TypeScript Strict Mode

Sempre use tipos explícitos:

```typescript
// ❌ Bad
function vote(id, amount) {
  // ...
}

// ✅ Good
function vote(id: number, amount: string): Promise<string> {
  // ...
}
```

### 2. Error Handling

```typescript
async function loadProposals() {
  try {
    setLoading(true);
    const res = await governanceApi.getProposals();

    if (res.success) {
      setProposals(res.data);
    } else {
      throw new Error(res.message || 'Failed to load proposals');
    }
  } catch (error) {
    console.error('Load proposals error:', error);
    toast.error('Failed to load proposals', {
      description: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    setLoading(false);
  }
}
```

### 3. Accessibility

```typescript
<button
  aria-label="Vote Aye"
  onClick={handleVote}
>
  👍
</button>

<div role="status" aria-live="polite">
  {loading ? 'Loading...' : `${count} proposals`}
</div>
```

### 4. CSS Naming

```css
/* Use BEM ou classes utilitárias */
.proposal-card { }
.proposal-card__header { }
.proposal-card__header--highlighted { }

/* Ou Tailwind */
<div className="flex items-center gap-2 p-4 rounded-lg">
```

### 5. Git Commits

```bash
# Use conventional commits
git commit -m "feat(governance): add new proposal type"
git commit -m "fix(governance): correct vote calculation"
git commit -m "docs(governance): update README"
git commit -m "test(governance): add E2E tests for voting"
```

---

## 📚 Recursos Adicionais

- [Polkadot.js Examples](https://polkadot.js.org/docs/api/examples)
- [Substrate Pallet Democracy](https://docs.substrate.io/reference/frame-pallets/#democracy)
- [React Best Practices](https://react.dev/learn)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## 🆘 Suporte

Se encontrar problemas ou tiver dúvidas:

1. Verifique o [README](./README.md)
2. Leia o [Troubleshooting](./README.md#troubleshooting)
3. Consulte os testes E2E para ver exemplos de uso
4. Abra uma issue no repositório

---

**Última atualização**: 2025-10-30
