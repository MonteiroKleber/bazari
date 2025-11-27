# Proposta de Estrutura: Documentação UI/UX Implementation

**Data**: 2025-11-14
**Versão**: 1.0 (Proposta para Aprovação)
**Autor**: Claude Code Senior Architect

---

## 📋 Objetivo

Criar documentação executável para implementar os **92 dias de trabalho** identificados no Gap Analysis UI/UX, seguindo os padrões existentes da pasta `/root/bazari/knowledge/`.

---

## 🏗️ Estrutura Proposta

### Localização Base
```
/root/bazari/knowledge/
├── 20-blueprints/
│   └── ui-ux/                          # 🆕 NOVA PASTA
│       ├── 00-UI-UX-INDEX.md           # Índice geral
│       ├── 01-OVERVIEW.md              # Overview da arquitetura UI/UX
│       ├── 02-COMPONENT-PATTERNS.md    # Padrões de componentes
│       ├── 03-BLOCKCHAIN-INTEGRATION.md # Estratégias de integração
│       └── pallets/                    # Specs UI/UX por pallet
│           ├── bazari-commerce/
│           │   ├── UI-SPEC.md          # 🆕 Spec de UI
│           │   ├── COMPONENTS.md       # 🆕 Lista de componentes
│           │   ├── PAGES.md            # 🆕 Páginas necessárias
│           │   └── HOOKS.md            # 🆕 Hooks blockchain
│           ├── bazari-escrow/
│           │   ├── UI-SPEC.md
│           │   ├── COMPONENTS.md
│           │   ├── PAGES.md
│           │   └── HOOKS.md
│           ├── bazari-rewards/
│           │   ├── UI-SPEC.md
│           │   ├── COMPONENTS.md
│           │   ├── PAGES.md
│           │   └── HOOKS.md
│           ├── bazari-attestation/
│           ├── bazari-fulfillment/
│           ├── bazari-affiliate/
│           ├── bazari-fee/
│           └── bazari-dispute/
│
└── 99-internal/
    └── implementation-prompts/
        └── 04-ui-ux/                   # 🆕 NOVA FASE
            ├── 00-README.md            # Overview dos prompts UI/UX
            ├── P0-CRITICAL/            # Prioridade 0 (7 semanas)
            │   ├── 01-rewards-missions.md
            │   ├── 02-escrow-visualization.md
            │   ├── 03-commission-tracking.md
            │   ├── 04-affiliate-referrals.md
            │   └── 05-dispute-voting.md
            ├── P1-HIGH/                # Prioridade 1 (5 semanas)
            │   ├── 01-order-enhancements.md
            │   ├── 02-escrow-admin.md
            │   ├── 03-attestation-cosign.md
            │   └── 04-fee-visualization.md
            ├── P2-MEDIUM/              # Prioridade 2 (4 semanas)
            │   ├── 01-admin-dashboards.md
            │   ├── 02-advanced-features.md
            │   └── 03-courier-reputation.md
            └── P3-LOW/                 # Prioridade 3 (2 semanas)
                ├── 01-merkle-verification.md
                └── 02-analytics-polish.md
```

---

## 📁 Detalhamento da Estrutura

### 1. Blueprints UI/UX (`20-blueprints/ui-ux/`)

#### 1.1 Arquivos Raiz (4 arquivos)

**`00-UI-UX-INDEX.md`** (Index Master)
```markdown
# UI/UX Implementation Index

## Purpose
Índice navegável de toda documentação UI/UX

## Structure
- Overview → 01-OVERVIEW.md
- Component Patterns → 02-COMPONENT-PATTERNS.md
- Blockchain Integration → 03-BLOCKCHAIN-INTEGRATION.md
- Pallet UI Specs → pallets/*/UI-SPEC.md

## Quick Links
- Gap Analysis Report → /UI_UX_GAP_ANALYSIS.md
- Implementation Prompts → 99-internal/implementation-prompts/04-ui-ux/

## Status Dashboard
| Pallet | UI Coverage | Priority | Effort |
|--------|------------|----------|--------|
| commerce | 95% | P0 | 3d |
| escrow | 70% | P0 | 3d |
| rewards | 20% | P0 | 10d |
...
```

**Conteúdo**:
- Índice navegável
- Status dashboard (tabela de progresso)
- Quick links para todos docs relacionados
- Roadmap visual

**Tamanho estimado**: ~200 linhas

---

**`01-OVERVIEW.md`** (Arquitetura UI/UX)
```markdown
# UI/UX Architecture Overview

**Status**: 🎯 Planning
**Version**: 1.0
**Dependencies**: All 8 pallets
**Last Updated**: 2025-11-14

## Philosophy
- Mobile-first design
- Blockchain transparency
- Progressive disclosure
- Real-time feedback

## Tech Stack
- React 18 + TypeScript
- Vite
- Polkadot.js
- shadcn/ui
- Zustand (state)
- Recharts, D3 (viz)

## Design Principles
1. **Blockchain Visibility**: Sempre mostrar txHash, block, status
2. **Progressive Loading**: Skeleton → Data → Error
3. **Optimistic Updates**: UI atualiza antes de confirmação
4. **Error Recovery**: Retry buttons, fallback states

## Current State (56 pages, 200+ components)
...

## Target State (+ 25 pages, + 80 components)
...
```

**Conteúdo**:
- Filosofia de design
- Tech stack
- Design principles
- Current vs Target state
- Component hierarchy
- State management strategy

**Tamanho estimado**: ~400 linhas

---

**`02-COMPONENT-PATTERNS.md`** (Component Library Patterns)
```markdown
# UI/UX Component Patterns

**Purpose**: Padrões reutilizáveis para componentes blockchain

## Base Patterns

### 1. Blockchain Status Badge
**Usage**: Mostrar status on-chain (Locked, Released, Verified, etc.)

**Props**:
```tsx
interface BlockchainStatusBadgeProps {
  status: string;
  variant: 'success' | 'warning' | 'error' | 'info';
  icon?: React.ReactNode;
}
```

**Implementation**:
```tsx
// components/blockchain/BlockchainStatusBadge.tsx
```

**Used in**: Orders, Escrow, Disputes, Attestations

### 2. Countdown Timer
**Usage**: Auto-release escrow, dispute phases, mission expiry

**Props**:
```tsx
interface CountdownTimerProps {
  targetBlock: number;
  onExpire?: () => void;
  format?: 'short' | 'long';
}
```

### 3. Commission Breakdown
...

## Composite Patterns
...
```

**Conteúdo**:
- Componentes base reutilizáveis (10-15 patterns)
- Props interfaces
- Usage examples
- Cross-pallet reusability matrix

**Tamanho estimado**: ~600 linhas

---

**`03-BLOCKCHAIN-INTEGRATION.md`** (Blockchain Integration Strategies)
```markdown
# Blockchain Integration Strategies

**Purpose**: Como integrar UI com blockchain de forma consistente

## Hook Patterns

### Query Pattern (Read-Only)
```typescript
// hooks/blockchain/useEscrow.ts
export const useEscrowDetails = (orderId: number) => {
  return useBlockchainQuery(['escrow', orderId], async () => {
    const api = await getApi();
    return await api.query.bazariEscrow.escrows(orderId);
  });
};
```

### Mutation Pattern (Write)
```typescript
export const useReleaseFunds = () => {
  return useBlockchainTx('release_funds', async (orderId: number) => {
    const api = await getApi();
    return await api.tx.bazariEscrow.releaseFunds(orderId);
  });
};
```

## Real-Time Updates (WebSocket)

### Event Subscription
```typescript
// services/blockchain-events.service.ts
blockchain.on('CommissionRecorded', async (event) => {
  // Update cache
  queryClient.invalidateQueries(['sales', event.saleId]);

  // Show notification
  toast.success(`Commission recorded: ${event.amount} BZR`);
});
```

## State Management

### Cache Strategy
- **Blockchain data**: useBlockchainQuery (React Query)
- **UI state**: useState, useReducer
- **Global state**: Zustand (cart, auth, wallet)

### Cache Invalidation
...

## Error Handling
...

## Loading States
...
```

**Conteúdo**:
- Hook patterns (queries, mutations)
- WebSocket subscriptions
- Cache strategies
- Error handling
- Loading states
- Optimistic updates

**Tamanho estimado**: ~500 linhas

---

#### 1.2 Pallet UI Specs (`pallets/*/`)

Para **cada um dos 8 pallets**, criar 4 arquivos:

##### **UI-SPEC.md** (Especificação de UI)

**Template**:
```markdown
# {Pallet Name} - UI/UX Specification

**Status**: 🎯 Planning | ✅ Complete | ⏳ In Progress
**Coverage**: X% (Current) → 100% (Target)
**Priority**: P0 | P1 | P2 | P3
**Effort**: X days
**Dependencies**: pallet-X, component-Y
**Version**: 1.0
**Last Updated**: YYYY-MM-DD

---

## 1. Overview

### Purpose
Brief description of pallet's user-facing features.

### Current State
- ✅ What exists today
- ❌ What's missing

### Target State
- What needs to be built

---

## 2. User Flows

### Flow 1: [Primary Flow]
**Actors**: Buyer, Seller, Admin, etc.

**Steps**:
1. User navigates to...
2. User clicks...
3. System calls blockchain...
4. UI updates...

**Screens Involved**:
- Page A
- Component B

**Blockchain Calls**:
- `pallet.extrinsic()`

### Flow 2: [Secondary Flow]
...

---

## 3. Pages Required

### Page 1: [Page Name]
**Route**: `/app/path/to/page`
**Purpose**: Description
**Status**: ❌ Missing | ⚠️ Needs Update | ✅ Complete

**Components**:
- ComponentA (new)
- ComponentB (existing)

**Blockchain Integration**:
- Query: `pallet.storage()`
- Mutation: `pallet.extrinsic()`

**Data Requirements**:
- Backend: `GET /api/endpoint`
- Blockchain: `pallet.query()`

**Mockup** (optional):
```
[ASCII mockup or link to Figma]
```

### Page 2: [Page Name]
...

---

## 4. Components Required

### Component 1: [ComponentName]
**Path**: `components/blockchain/ComponentName.tsx`
**Purpose**: Description
**Status**: ❌ Missing | ⚠️ Needs Update | ✅ Complete
**Reusability**: Used in X pages

**Props**:
```tsx
interface ComponentNameProps {
  prop1: type;
  prop2: type;
}
```

**Blockchain Data**:
- Reads: `pallet.storage()`
- Writes: None | `pallet.extrinsic()`

**State**:
- Local: useState for X
- Global: Zustand for Y

**Example**:
```tsx
<ComponentName prop1={value} prop2={value} />
```

### Component 2: [ComponentName]
...

---

## 5. Blockchain Hooks

### Hook 1: use[HookName]
**Path**: `hooks/blockchain/use[HookName].ts`
**Type**: Query | Mutation
**Purpose**: Description

**Implementation**:
```typescript
export const use[HookName] = (param: type) => {
  return useBlockchainQuery(['key', param], async () => {
    // Implementation
  });
};
```

**Usage**:
```tsx
const { data, isLoading, error } = use[HookName](param);
```

### Hook 2: use[HookName]
...

---

## 6. Data Flow

### 6.1 Read Flow (Queries)
```
UI Component
  ↓ (calls)
Hook (useBlockchainQuery)
  ↓ (fetches)
Blockchain API (Polkadot.js)
  ↓ (returns)
Cache (React Query)
  ↓ (updates)
UI Component
```

### 6.2 Write Flow (Mutations)
```
User Action
  ↓ (triggers)
Hook (useBlockchainTx)
  ↓ (calls)
Blockchain Extrinsic
  ↓ (emits)
Event
  ↓ (listened by)
WebSocket Listener
  ↓ (invalidates)
Cache
  ↓ (re-fetches)
UI Component
```

---

## 7. Gaps & Implementation Plan

### Gap 1: [Gap Description]
**Priority**: P0 | P1 | P2 | P3
**Effort**: X days
**Deliverables**:
- [ ] Page: PageName
- [ ] Component: ComponentName
- [ ] Hook: useHookName

**Dependencies**:
- Requires Component X
- Blocks Feature Y

### Gap 2: [Gap Description]
...

---

## 8. Testing Requirements

### Unit Tests
- [ ] Component 1 rendering
- [ ] Hook 1 query logic
- [ ] Hook 2 mutation logic

### Integration Tests
- [ ] Flow 1 end-to-end
- [ ] Blockchain interaction mocks

### Manual Tests
- [ ] Real blockchain interaction
- [ ] Edge cases (errors, loading, empty states)

---

## 9. Acceptance Criteria

- [ ] All pages implemented and routed
- [ ] All components render correctly
- [ ] All hooks tested with mock data
- [ ] Blockchain integration verified on testnet
- [ ] Error states handled gracefully
- [ ] Loading states implemented
- [ ] Mobile responsive
- [ ] Accessibility (WCAG 2.1 AA)

---

## 10. References

- **Pallet Spec**: `20-blueprints/pallets/{pallet}/SPEC.md`
- **Implementation**: `20-blueprints/pallets/{pallet}/IMPLEMENTATION.md`
- **Gap Analysis**: `/UI_UX_GAP_ANALYSIS.md` (Section X)
- **Prompts**: `99-internal/implementation-prompts/04-ui-ux/PX-*/`

---

**Version**: 1.0
**Last Updated**: YYYY-MM-DD
**Next Review**: After implementation
```

**Tamanho estimado**: 600-800 linhas por pallet

---

##### **COMPONENTS.md** (Component Library)

**Template**:
```markdown
# {Pallet Name} - Components Library

**Purpose**: Lista completa de componentes UI para {pallet}

---

## Component Hierarchy

```
Pages
├── Page1
│   ├── ComponentA (new)
│   ├── ComponentB (existing)
│   └── ComponentC (new)
└── Page2
    ├── ComponentD (new)
    └── ComponentE (existing)
```

---

## Components Catalog

### 1. [ComponentName]
**Status**: ❌ Missing | ⚠️ Needs Update | ✅ Complete
**Path**: `components/blockchain/ComponentName.tsx`
**Type**: Smart | Presentational
**Reusability**: High | Medium | Low

**Purpose**:
Brief description

**Props**:
```tsx
interface ComponentNameProps {
  // Props definition
}
```

**State**:
- Local: X
- Global: Y
- Blockchain: Z (via hook)

**Blockchain Integration**:
- Reads: `pallet.query.storage()`
- Writes: `pallet.tx.extrinsic()`

**Dependencies**:
- Component X
- Hook useY

**Example Usage**:
```tsx
<ComponentName
  prop1={value}
  prop2={value}
/>
```

**Visual**:
```
[ASCII mockup or screenshot]
```

---

### 2. [ComponentName]
...

---

## Shared Components (Reusable)

### BlockchainStatusBadge
**Used in**: Component1, Component2, Component3

### CountdownTimer
**Used in**: Component4, Component5

---

## Component Dependencies Graph

```
ComponentA
├── depends on: BaseButton (ui/)
├── depends on: useHook1
└── used in: Page1, Page2

ComponentB
├── depends on: ComponentA
├── depends on: useHook2
└── used in: Page3
```

---

## Implementation Checklist

- [ ] Component 1 - [Name]
- [ ] Component 2 - [Name]
- [ ] Component 3 - [Name]
...

---

**Total Components**: X new, Y to update, Z existing
**Effort**: X days
```

**Tamanho estimado**: 400-600 linhas por pallet

---

##### **PAGES.md** (Pages Specification)

**Template**:
```markdown
# {Pallet Name} - Pages Specification

**Purpose**: Especificação completa de páginas para {pallet}

---

## Pages Overview

| Page | Route | Status | Priority | Effort |
|------|-------|--------|----------|--------|
| Page1 | /app/path | ❌ Missing | P0 | 2d |
| Page2 | /app/path | ⚠️ Update | P1 | 1d |
| Page3 | /app/path | ✅ Complete | - | - |

---

## Page 1: [PageName]

### Metadata
**Route**: `/app/path/to/page`
**Status**: ❌ Missing | ⚠️ Needs Update | ✅ Complete
**Priority**: P0 | P1 | P2 | P3
**Effort**: X days
**Auth Required**: Yes | No
**Roles**: Buyer, Seller, Admin, DAO, etc.

### Purpose
Brief description of page purpose and user value.

### Layout
```
┌─────────────────────────────────┐
│ Header (Breadcrumb)             │
├─────────────────────────────────┤
│ Page Title + Action Button      │
├─────────────────────────────────┤
│ ┌─────────┐ ┌─────────────────┐ │
│ │ Sidebar │ │ Main Content    │ │
│ │ Filters │ │                 │ │
│ │         │ │ ┌─────────────┐ │ │
│ │         │ │ │ Component 1 │ │ │
│ │         │ │ └─────────────┘ │ │
│ │         │ │ ┌─────────────┐ │ │
│ │         │ │ │ Component 2 │ │ │
│ │         │ │ └─────────────┘ │ │
│ └─────────┘ └─────────────────┘ │
└─────────────────────────────────┘
```

### Components Used
- ✅ ComponentA (existing)
- ❌ ComponentB (new - see COMPONENTS.md)
- ⚠️ ComponentC (needs update)

### Blockchain Integration

#### Queries (Read)
```typescript
// Hook 1
const { data: orders } = useBlockchainOrders(accountId);

// Hook 2
const { data: escrow } = useEscrowDetails(orderId);
```

#### Mutations (Write)
```typescript
// Hook 3
const { mutate: releaseFunds } = useReleaseFunds();

// Usage
<Button onClick={() => releaseFunds(orderId)}>
  Release Funds
</Button>
```

### Data Requirements

#### From Blockchain
- `pallet.query.storage1()`
- `pallet.query.storage2()`

#### From Backend (Cache)
- `GET /api/endpoint1`
- `GET /api/endpoint2`

### State Management
- **Local State**: useState for filters, modals
- **URL State**: useSearchParams for pagination, filters
- **Global State**: Zustand for cart/auth (if applicable)
- **Cache**: React Query for blockchain data

### User Actions

#### Action 1: [ActionName]
**Trigger**: Button click
**Blockchain Call**: `pallet.tx.extrinsic()`
**Success**: Toast notification + cache invalidation
**Error**: Show error message + retry option

#### Action 2: [ActionName]
...

### States

#### Loading State
```tsx
<Skeleton />
```

#### Empty State
```tsx
<EmptyState
  icon={Icon}
  message="No items found"
  action={<Button>Create New</Button>}
/>
```

#### Error State
```tsx
<ErrorState
  error={error}
  onRetry={refetch}
/>
```

#### Success State
```tsx
<DataView data={data} />
```

### Responsiveness
- **Desktop**: 3-column layout
- **Tablet**: 2-column layout
- **Mobile**: 1-column, bottom nav

### Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader labels
- [ ] Focus management
- [ ] ARIA attributes

### SEO (if public)
- **Title**: Dynamic title
- **Description**: Dynamic meta description
- **Open Graph**: OG tags for sharing

### Testing

#### Unit Tests
- [ ] Component rendering
- [ ] Hook integration
- [ ] User actions (click, submit)

#### Integration Tests
- [ ] Full page flow
- [ ] Blockchain mock integration

#### Manual Tests
- [ ] Real blockchain interaction
- [ ] Mobile responsiveness
- [ ] Cross-browser (Chrome, Firefox, Safari)

### Implementation Checklist
- [ ] Create page file: `pages/PageName.tsx`
- [ ] Implement layout
- [ ] Integrate components
- [ ] Connect blockchain hooks
- [ ] Add loading/error/empty states
- [ ] Implement actions
- [ ] Add routing
- [ ] Test on testnet
- [ ] Mobile responsive check
- [ ] Accessibility audit

---

## Page 2: [PageName]
...

---

## Routing Configuration

```typescript
// App.tsx
<Route path="/app/path" element={<Page1 />} />
<Route path="/app/path/:id" element={<Page2 />} />
```

---

## Navigation Integration

### Sidebar Links
- Link to Page 1
- Link to Page 2

### Breadcrumbs
- Home → Category → Page

---

**Total Pages**: X new, Y to update
**Effort**: X days
```

**Tamanho estimado**: 500-700 linhas por pallet

---

##### **HOOKS.md** (Blockchain Hooks Specification)

**Template**:
```markdown
# {Pallet Name} - Blockchain Hooks

**Purpose**: Especificação de hooks para integração blockchain

---

## Hooks Overview

| Hook | Type | Status | Complexity | Effort |
|------|------|--------|-----------|--------|
| useHook1 | Query | ❌ Missing | Low | 0.5d |
| useHook2 | Mutation | ✅ Complete | - | - |
| useHook3 | Query | ⚠️ Update | Medium | 1d |

---

## Query Hooks (Read-Only)

### 1. use[HookName]

**Path**: `hooks/blockchain/use[HookName].ts`
**Status**: ❌ Missing | ⚠️ Needs Update | ✅ Complete
**Complexity**: Low | Medium | High
**Effort**: X hours/days

**Purpose**:
Brief description

**Parameters**:
```typescript
function use[HookName](
  param1: type,
  param2?: type
): UseQueryResult<ReturnType>
```

**Blockchain Query**:
```typescript
api.query.pallet.storage(param1)
```

**Return Type**:
```typescript
interface ReturnType {
  field1: type;
  field2: type;
}
```

**Implementation**:
```typescript
// hooks/blockchain/use[HookName].ts
export const use[HookName] = (param1: type, param2?: type) => {
  return useBlockchainQuery(
    ['pallet', 'storage', param1, param2],
    async () => {
      const api = await getApi();
      const result = await api.query.pallet.storage(param1);

      // Transform data if needed
      return {
        field1: result.field1.toString(),
        field2: result.field2.toNumber(),
      };
    },
    {
      enabled: !!param1,
      staleTime: 30000, // 30s
      refetchInterval: 60000, // 1min
    }
  );
};
```

**Usage Example**:
```tsx
function Component() {
  const { data, isLoading, error, refetch } = use[HookName](param);

  if (isLoading) return <Skeleton />;
  if (error) return <Error error={error} onRetry={refetch} />;

  return <Display data={data} />;
}
```

**Cache Strategy**:
- **Key**: `['pallet', 'storage', param]`
- **Stale Time**: 30s
- **Refetch Interval**: 1min
- **Invalidation**: On `EventName` event

**Error Handling**:
- Network error: Show retry button
- Not found: Show empty state
- Invalid param: Validation error

**Testing**:
```typescript
// use[HookName].test.ts
describe('use[HookName]', () => {
  it('fetches data successfully', async () => {
    // Test implementation
  });

  it('handles errors', async () => {
    // Test error case
  });
});
```

---

### 2. use[HookName]
...

---

## Mutation Hooks (Write)

### 1. use[ActionName]

**Path**: `hooks/blockchain/use[ActionName].ts`
**Status**: ❌ Missing | ⚠️ Needs Update | ✅ Complete
**Complexity**: Low | Medium | High
**Effort**: X hours/days
**Gas Estimate**: ~X weight units

**Purpose**:
Brief description

**Parameters**:
```typescript
function use[ActionName](): UseMutationResult<void, Error, Params>

interface Params {
  param1: type;
  param2: type;
}
```

**Blockchain Extrinsic**:
```typescript
api.tx.pallet.extrinsic(param1, param2)
```

**Implementation**:
```typescript
// hooks/blockchain/use[ActionName].ts
export const use[ActionName] = () => {
  const queryClient = useQueryClient();

  return useBlockchainTx(
    'extrinsic_name',
    async (params: Params) => {
      const api = await getApi();
      const tx = api.tx.pallet.extrinsic(params.param1, params.param2);

      // Sign and send
      return await tx.signAndSend(/* ... */);
    },
    {
      onSuccess: (result, variables) => {
        // Invalidate related queries
        queryClient.invalidateQueries(['pallet', 'storage']);

        // Show success notification
        toast.success('Action completed!');
      },
      onError: (error) => {
        // Show error notification
        toast.error(`Failed: ${error.message}`);
      },
    }
  );
};
```

**Usage Example**:
```tsx
function Component() {
  const { mutate, isLoading, error } = use[ActionName]();

  const handleSubmit = (data: Params) => {
    mutate(data);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Button disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Submit'}
      </Button>
    </Form>
  );
}
```

**Events Emitted**:
- `EventName` - Description

**Cache Invalidation**:
- Invalidates: `['pallet', 'storage']`
- Refetches: Affected queries

**Error Handling**:
- Insufficient balance: Show balance error
- Invalid params: Validation error
- Transaction failed: Show txHash + error

**Gas Estimation**:
```typescript
const fee = await api.tx.pallet.extrinsic(params)
  .paymentInfo(signer);
```

**Testing**:
```typescript
// use[ActionName].test.ts
describe('use[ActionName]', () => {
  it('executes transaction successfully', async () => {
    // Test implementation
  });

  it('handles transaction errors', async () => {
    // Test error case
  });
});
```

---

### 2. use[ActionName]
...

---

## Subscription Hooks (Real-Time)

### 1. use[EventName]Events

**Path**: `hooks/blockchain/use[EventName]Events.ts`
**Status**: ❌ Missing | ⚠️ Needs Update | ✅ Complete

**Purpose**:
Subscribe to blockchain events in real-time

**Implementation**:
```typescript
export const use[EventName]Events = (callback: (event: EventType) => void) => {
  useEffect(() => {
    const unsubscribe = blockchainEvents.on('[EventName]', callback);

    return () => {
      unsubscribe();
    };
  }, [callback]);
};
```

**Usage Example**:
```tsx
function Component() {
  const queryClient = useQueryClient();

  use[EventName]Events((event) => {
    // Invalidate cache
    queryClient.invalidateQueries(['pallet', event.id]);

    // Show notification
    toast.info(`Event: ${event.data}`);
  });

  return <div>...</div>;
}
```

---

## Hooks Dependencies Graph

```
useHook1 (query)
├── used in: Component1, Component2
└── invalidated by: useAction1

useAction1 (mutation)
├── used in: Component3
├── emits: EventName
└── invalidates: useHook1, useHook2

useEventNameEvents (subscription)
├── used in: Page1
└── invalidates: useHook1
```

---

## Implementation Checklist

### Query Hooks
- [ ] useHook1 - [Description]
- [ ] useHook2 - [Description]
...

### Mutation Hooks
- [ ] useAction1 - [Description]
- [ ] useAction2 - [Description]
...

### Subscription Hooks
- [ ] useEventNameEvents - [Description]
...

---

## Testing Strategy

### Unit Tests
- Mock blockchain API
- Test data transformation
- Test error handling

### Integration Tests
- Use local blockchain
- Test real transactions
- Test event subscriptions

---

**Total Hooks**: X new, Y to update
**Effort**: X days
```

**Tamanho estimado**: 400-600 linhas por pallet

---

### 2. Implementation Prompts (`99-internal/implementation-prompts/04-ui-ux/`)

#### 2.1 Estrutura por Prioridade

**4 pastas** organizadas por prioridade (P0, P1, P2, P3), cada uma contendo **prompts executáveis**.

##### **00-README.md** (Overview)

```markdown
# UI/UX Implementation Prompts

**Purpose**: Prompts prontos para executar implementação UI/UX

## Structure

```
04-ui-ux/
├── 00-README.md (this file)
├── P0-CRITICAL/ (7 semanas, 35 dias)
├── P1-HIGH/ (5 semanas, 24 dias)
├── P2-MEDIUM/ (4 semanas, 22 dias)
└── P3-LOW/ (2 semanas, 11 dias)
```

## Execution Order

1. **P0 (CRITICAL)** - Execute primeiro (blocking features)
2. **P1 (HIGH)** - Execute depois de P0
3. **P2 (MEDIUM)** - Execute após P1
4. **P3 (LOW)** - Execute por último (nice-to-have)

## Prompt Format

Cada prompt contém:
- **Context**: O que precisa ser feito
- **Specs**: Referências de documentação
- **Deliverables**: O que deve ser entregue
- **Acceptance Criteria**: Como validar
- **Effort**: Estimativa de tempo

## Dependencies

- Gap Analysis: `/UI_UX_GAP_ANALYSIS.md`
- UI Specs: `20-blueprints/ui-ux/pallets/*/UI-SPEC.md`
- Component Specs: `20-blueprints/ui-ux/pallets/*/COMPONENTS.md`

## Total Effort

| Priority | Prompts | Days | Weeks (1 dev) | Weeks (2 devs) |
|----------|---------|------|---------------|----------------|
| P0 | 5 | 35 | 7 | 3.5 |
| P1 | 4 | 24 | 4.8 | 2.4 |
| P2 | 3 | 22 | 4.4 | 2.2 |
| P3 | 2 | 11 | 2.2 | 1.1 |
| **Total** | **14** | **92** | **18.4** | **9.2** |
```

**Tamanho**: ~200 linhas

---

##### **Prompt Template** (Para todos os 14 prompts)

```markdown
# [Feature Name] - Implementation Prompt

**Phase**: P0 | P1 | P2 | P3
**Priority**: CRITICAL | HIGH | MEDIUM | LOW
**Effort**: X days
**Dependencies**: [List of dependencies]
**Pallets**: [Affected pallets]

---

## 📋 Context

**Problem**:
Brief description of the problem.

**Current State**:
- What exists today

**Target State**:
- What needs to exist

**User Value**:
- Why this matters to users

---

## 🎯 Objective

Implement [feature description] including:
1. X new pages
2. Y new components
3. Z new hooks

**Deliverables**:
- [ ] Pages: [List]
- [ ] Components: [List]
- [ ] Hooks: [List]
- [ ] Tests: [List]

---

## 📚 Specifications

**UI Specs**:
- `20-blueprints/ui-ux/pallets/{pallet}/UI-SPEC.md` (Section X)
- `20-blueprints/ui-ux/pallets/{pallet}/COMPONENTS.md` (Component Y)
- `20-blueprints/ui-ux/pallets/{pallet}/PAGES.md` (Page Z)

**Pallet Specs**:
- `20-blueprints/pallets/{pallet}/SPEC.md`
- `20-blueprints/pallets/{pallet}/IMPLEMENTATION.md`

**Gap Analysis**:
- `/UI_UX_GAP_ANALYSIS.md` (Section X.Y - Gap Description)

---

## 🏗️ Implementation Details

### Step 1: Pages

#### Page 1: [PageName]
**Route**: `/app/path/to/page`
**File**: `apps/web/src/pages/PageName.tsx`

**Requirements**:
- Layout: [Description]
- Components: [List of components]
- Blockchain integration: [Hooks]

**Implementation**:
```tsx
// apps/web/src/pages/PageName.tsx
import { Component1, Component2 } from '@/components/blockchain';
import { useHook1, useHook2 } from '@/hooks/blockchain';

export default function PageName() {
  const { data, isLoading } = useHook1(param);

  return (
    <div>
      {/* Layout */}
    </div>
  );
}
```

**Tests**:
```tsx
// apps/web/src/pages/__tests__/PageName.test.tsx
describe('PageName', () => {
  it('renders correctly', () => {
    // Test
  });
});
```

---

### Step 2: Components

#### Component 1: [ComponentName]
**File**: `apps/web/src/components/blockchain/ComponentName.tsx`

**Props**:
```tsx
interface ComponentNameProps {
  prop1: type;
  prop2: type;
}
```

**Implementation**:
```tsx
// apps/web/src/components/blockchain/ComponentName.tsx
export function ComponentName({ prop1, prop2 }: ComponentNameProps) {
  // Implementation
}
```

**Tests**:
```tsx
// apps/web/src/components/blockchain/__tests__/ComponentName.test.tsx
describe('ComponentName', () => {
  it('renders with props', () => {
    // Test
  });
});
```

---

### Step 3: Hooks

#### Hook 1: use[HookName]
**File**: `apps/web/src/hooks/blockchain/use[HookName].ts`

**Implementation**:
```typescript
// apps/web/src/hooks/blockchain/use[HookName].ts
export const use[HookName] = (param: type) => {
  return useBlockchainQuery(['key', param], async () => {
    const api = await getApi();
    return await api.query.pallet.storage(param);
  });
};
```

**Tests**:
```typescript
// apps/web/src/hooks/blockchain/__tests__/use[HookName].test.ts
describe('use[HookName]', () => {
  it('fetches data', async () => {
    // Test
  });
});
```

---

### Step 4: Routing

**Add routes**:
```tsx
// apps/web/src/App.tsx
<Route path="/app/path" element={<PageName />} />
```

---

### Step 5: Integration

**Backend (if needed)**:
- Endpoint: `GET /api/endpoint`
- Event listener: `CommissionRecorded`

**Blockchain**:
- Queries: `pallet.query.storage()`
- Mutations: `pallet.tx.extrinsic()`

---

## ✅ Acceptance Criteria

- [ ] All pages render correctly
- [ ] All components tested (unit + integration)
- [ ] All hooks tested with mocks
- [ ] Blockchain integration verified on testnet
- [ ] Error states handled
- [ ] Loading states implemented
- [ ] Mobile responsive
- [ ] Accessibility (WCAG 2.1 AA)
- [ ] No TypeScript errors
- [ ] No console errors/warnings
- [ ] Documentation updated (if applicable)

---

## 🧪 Testing Checklist

### Unit Tests
- [ ] Component 1 rendering
- [ ] Component 2 props handling
- [ ] Hook 1 data fetching
- [ ] Hook 2 mutation logic

### Integration Tests
- [ ] Page 1 full flow
- [ ] Blockchain mock integration

### Manual Tests (Testnet)
- [ ] Create transaction
- [ ] Verify data display
- [ ] Test error cases
- [ ] Test loading states
- [ ] Test mobile view

---

## 📦 Dependencies

**Required Before Starting**:
- [ ] Pallet deployed to testnet
- [ ] Backend endpoints ready (if applicable)
- [ ] Shared components available

**Blocks**:
- Feature X (depends on this)

---

## 🔗 References

- **Gap Analysis**: `/UI_UX_GAP_ANALYSIS.md` (Section X.Y)
- **UI Spec**: `20-blueprints/ui-ux/pallets/{pallet}/UI-SPEC.md`
- **Components**: `20-blueprints/ui-ux/pallets/{pallet}/COMPONENTS.md`
- **Pages**: `20-blueprints/ui-ux/pallets/{pallet}/PAGES.md`
- **Hooks**: `20-blueprints/ui-ux/pallets/{pallet}/HOOKS.md`
- **Pallet Spec**: `20-blueprints/pallets/{pallet}/SPEC.md`

---

## 🤖 Prompt for Claude Code

```
Implement [feature name] UI/UX for Bazari platform.

**Context**:
- Repository: /root/bazari
- Gap Analysis: /UI_UX_GAP_ANALYSIS.md (Section X.Y)
- UI Specs: 20-blueprints/ui-ux/pallets/{pallet}/

**Objective**:
1. Create X pages: [List]
2. Create Y components: [List]
3. Create Z hooks: [List]
4. Add tests for all

**Specs**:
- See UI-SPEC.md for detailed requirements
- See COMPONENTS.md for component specs
- See PAGES.md for page layouts
- See HOOKS.md for blockchain integration

**Deliverables**:
- Pages in apps/web/src/pages/
- Components in apps/web/src/components/blockchain/
- Hooks in apps/web/src/hooks/blockchain/
- Tests in __tests__/ folders

**Acceptance Criteria**:
- All tests passing
- TypeScript no errors
- Mobile responsive
- Blockchain integration verified

Execute implementation following the specs and notify when complete.
```

---

**Version**: 1.0
**Last Updated**: YYYY-MM-DD
```

**Tamanho**: 800-1000 linhas por prompt

---

## 📊 Estatísticas da Estrutura Proposta

### Arquivos Totais: **110 arquivos**

#### Blueprints (`20-blueprints/ui-ux/`): **36 arquivos**
- Raiz: 4 arquivos (INDEX, OVERVIEW, PATTERNS, INTEGRATION)
- Por pallet (8 pallets × 4 arquivos): 32 arquivos
  - UI-SPEC.md
  - COMPONENTS.md
  - PAGES.md
  - HOOKS.md

#### Prompts (`99-internal/implementation-prompts/04-ui-ux/`): **15 arquivos**
- README: 1 arquivo
- P0-CRITICAL: 5 prompts
- P1-HIGH: 4 prompts
- P2-MEDIUM: 3 prompts
- P3-LOW: 2 prompts

### Linhas de Documentação Estimadas: **~45,000 linhas**

| Tipo de Arquivo | Linhas/arquivo | Quantidade | Total |
|-----------------|---------------|------------|-------|
| INDEX | 200 | 1 | 200 |
| OVERVIEW | 400 | 1 | 400 |
| PATTERNS | 600 | 1 | 600 |
| INTEGRATION | 500 | 1 | 500 |
| UI-SPEC | 700 | 8 | 5,600 |
| COMPONENTS | 500 | 8 | 4,000 |
| PAGES | 600 | 8 | 4,800 |
| HOOKS | 500 | 8 | 4,000 |
| Prompt README | 200 | 1 | 200 |
| Prompts | 900 | 14 | 12,600 |
| **TOTAL** | - | **110** | **~33,000** |

---

## 🎯 Benefícios da Estrutura

### 1. Consistência
- ✅ Segue padrões existentes (SPEC → IMPLEMENTATION → INTEGRATION)
- ✅ Nomenclatura uniforme (uppercase para specs, lowercase para código)

### 2. Navegabilidade
- ✅ Índice master (00-UI-UX-INDEX.md)
- ✅ Quick links entre documentos
- ✅ Cross-referencing claro

### 3. Executabilidade
- ✅ Prompts auto-contidos (copiar/colar ready)
- ✅ Sem dependências externas
- ✅ Ordem de execução clara (P0 → P1 → P2 → P3)

### 4. Rastreabilidade
- ✅ Gap Analysis → UI Spec → Prompt (completo)
- ✅ Todos gaps mapeados em documentação
- ✅ Todos prompts linkam specs

### 5. Escalabilidade
- ✅ Fácil adicionar novos pallets (copiar template)
- ✅ Fácil adicionar novos prompts (seguir padrão)
- ✅ Estrutura suporta 20+ pallets

---

## 🚀 Próximos Passos (Após Aprovação)

1. **Criar estrutura de pastas**
2. **Gerar arquivos raiz** (INDEX, OVERVIEW, PATTERNS, INTEGRATION)
3. **Gerar specs por pallet** (8 pallets × 4 arquivos = 32 arquivos)
4. **Gerar prompts** (14 prompts executáveis)
5. **Validar cross-referencing**
6. **Review final**

---

## ❓ Questões para Aprovação

1. **Estrutura de pastas** aprovada? (`ui-ux/` + `pallets/` + `04-ui-ux/`)
2. **4 arquivos por pallet** aprovado? (UI-SPEC, COMPONENTS, PAGES, HOOKS)
3. **14 prompts** (5+4+3+2) suficientes ou precisam ser mais granulares?
4. **Nomenclatura** (uppercase para specs, lowercase para código) OK?
5. **Cross-referencing** (Gap Analysis → Specs → Prompts) faz sentido?

---

**Aguardando aprovação para iniciar geração dos 110 arquivos.**

---

**Documento gerado**: 2025-11-14
**Versão**: 1.0 (Proposta)
**Status**: ⏳ Aguardando Aprovação
