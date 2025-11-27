# Blockchain Components & Hooks

React hooks e componentes UI para integração com blockchain.

## 📁 Estrutura

```
src/
├── hooks/
│   ├── useBlockchainQuery.ts    # Queries (read-only)
│   ├── useBlockchainTx.ts       # Transactions (write operations)
│   └── __tests__/
│       ├── useBlockchainQuery.test.ts
│       └── useBlockchainTx.test.ts
└── components/blockchain/
    ├── ProofCard.tsx            # Delivery proof visualization
    ├── DisputePanel.tsx         # Dispute management
    ├── CourierCard.tsx          # Courier profile
    ├── index.ts                 # Barrel exports
    ├── __tests__/
    │   └── ProofCard.test.tsx
    └── README.md
```

## 🎣 Hooks

### useBlockchainQuery

Hook para queries blockchain (read-only operations).

```tsx
import { useBlockchainQuery } from '@/hooks/useBlockchainQuery';

function OrderDetails({ orderId }) {
  const { data, isLoading, error, refetch } = useBlockchainQuery({
    endpoint: `/api/blockchain/orders/${orderId}`,
    refetchInterval: 5000, // Auto-refresh a cada 5s
    onSuccess: (data) => console.log('Order loaded:', data),
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>Order #{data.orderId}</div>;
}
```

**Helper Hooks:**

```tsx
// Buscar pedido específico
const { data: order } = useBlockchainOrder(orderId);

// Buscar entregador
const { data: courier } = useBlockchainCourier(courierAddress);

// Buscar provas de entrega
const { data: proofs } = useBlockchainProofs(orderId);

// Buscar disputa
const { data: dispute } = useBlockchainDispute(disputeId);

// Buscar reviews de entregador
const { data: reviews } = useCourierReviews(courierAddress, { limit: 10 });
```

### useBlockchainTx

Hook para transações blockchain (write operations).

```tsx
import { useBlockchainTx } from '@/hooks/useBlockchainTx';

function CreateOrderButton() {
  const { sendTx, isLoading, isSuccess, error } = useBlockchainTx({
    onSuccess: (data) => {
      console.log('Order created! TX:', data.txHash);
    },
  });

  const handleCreate = async () => {
    await sendTx({
      endpoint: '/api/blockchain/orders',
      method: 'POST',
      data: {
        buyer: '0x123',
        seller: '0x456',
        items: [...],
      },
    });
  };

  return (
    <button onClick={handleCreate} disabled={isLoading}>
      {isLoading ? 'Creating...' : 'Create Order'}
    </button>
  );
}
```

**Helper Hooks:**

```tsx
// Criar pedido
const { createOrder } = useCreateOrder({
  onSuccess: (data) => console.log('Order ID:', data.orderId),
});

await createOrder({
  buyer: '0x123',
  seller: '0x456',
  marketplace: 1,
  items: [],
  totalAmount: '1000000000000',
});

// Submeter prova de entrega
const { submitProof } = useSubmitProof();

await submitProof({
  orderId: 123,
  proofCid: 'QmXXX',
  attestor: '0x789',
});

// Abrir disputa
const { openDispute } = useOpenDispute();

await openDispute({
  orderId: 123,
  plaintiff: '0xAAA',
  defendant: '0xBBB',
  evidenceCid: 'QmYYY',
});

// Registrar entregador
const { registerCourier } = useRegisterCourier();

await registerCourier({
  courierAddress: '0xCCC',
  stake: '5000000000000',
  serviceAreas: [1, 2, 3],
});

// Submeter review
const { submitReview } = useSubmitReview();

await submitReview({
  deliveryRequestId: 'delivery-123',
  courierId: '0xDDD',
  rating: 5,
  comment: 'Excellent service!',
});
```

## 🧩 Components

### ProofCard

Exibe prova de entrega com GPS tracking e informações blockchain.

```tsx
import { ProofCard } from '@/components/blockchain';

function OrderPage({ orderId }) {
  return (
    <ProofCard
      orderId={orderId}
      onViewDetails={(proofCid) => {
        // Navegar para visualização GPS
        navigate(`/tracking/${proofCid}`);
      }}
    />
  );
}

// Modo compacto
<ProofCard orderId={orderId} compact={true} />
```

**Props:**
- `orderId: number` - ID do pedido
- `compact?: boolean` - Modo compacto (default: false)
- `onViewDetails?: (proofCid: string) => void` - Callback ao clicar em "View Details"

### DisputePanel

Painel para gerenciar disputas (abrir nova ou visualizar existente).

```tsx
import { DisputePanel } from '@/components/blockchain';

function DisputePage({ orderId, disputeId, userAddress }) {
  return (
    <DisputePanel
      orderId={orderId}
      disputeId={disputeId}
      userAddress={userAddress}
      onDisputeCreated={(newDisputeId) => {
        console.log('Dispute created:', newDisputeId);
      }}
    />
  );
}
```

**Props:**
- `orderId: number` - ID do pedido
- `disputeId?: number | null` - ID da disputa (se existir)
- `userAddress?: string` - Endereço do usuário (plaintiff)
- `onDisputeCreated?: (disputeId: number) => void` - Callback quando disputa é criada

### CourierCard

Card de entregador com dados blockchain (stake, reputation, reviews).

```tsx
import { CourierCard } from '@/components/blockchain';

function CourierProfile({ courierAddress }) {
  return (
    <CourierCard
      courierAddress={courierAddress}
      showReviews={true}
      onViewProfile={(address) => {
        navigate(`/couriers/${address}`);
      }}
    />
  );
}

// Modo compacto
<CourierCard courierAddress={address} compact={true} />
```

**Props:**
- `courierAddress: string` - Endereço blockchain do entregador
- `compact?: boolean` - Modo compacto (default: false)
- `showReviews?: boolean` - Mostrar reviews (default: false)
- `onViewProfile?: (address: string) => void` - Callback ao clicar em "View Profile"

## 🧪 Testing

Todos os hooks e componentes possuem testes unitários com Vitest.

```bash
# Rodar todos os testes
pnpm test

# Rodar testes específicos
pnpm test useBlockchainQuery
pnpm test ProofCard

# Rodar com coverage
pnpm test --coverage
```

## 📝 Padrões

### Error Handling

```tsx
const { data, error } = useBlockchainQuery({
  endpoint: '/api/blockchain/orders/123',
  onError: (error) => {
    // Log para Sentry, etc
    console.error('Failed to load order:', error);
  },
});

if (error) {
  return <ErrorBoundary error={error} />;
}
```

### Loading States

```tsx
const { data, isLoading } = useBlockchainQuery({
  endpoint: '/api/blockchain/orders/123',
});

if (isLoading) {
  return <Skeleton />;
}
```

### Auto-refresh

```tsx
// Refresh a cada 10 segundos
const { data } = useBlockchainQuery({
  endpoint: '/api/blockchain/orders/123',
  refetchInterval: 10000,
});
```

### Conditional Queries

```tsx
// Só executar query se orderId existir
const { data } = useBlockchainOrder(orderId, {
  enabled: orderId !== null,
});
```

## 🔗 Integration

### Com i18n

Todos os componentes usam `react-i18next` para internacionalização:

```tsx
const { t } = useTranslation();

<span>{t('blockchain.proof.title', 'Delivery Proof')}</span>
```

### Com API Client

Os hooks usam o `ApiClient` existente (`src/lib/api.ts`):

```tsx
import { api } from '../lib/api';

const response = await api.get<Order>('/api/blockchain/orders/123');
```

## 📚 Referências

- [React Hooks Documentation](https://react.dev/reference/react)
- [Vitest Testing](https://vitest.dev/)
- [TypeScript](https://www.typescriptlang.org/)
