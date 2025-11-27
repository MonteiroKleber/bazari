# Order Enhancements UI/UX - Implementation Prompt

**Phase**: P1 - HIGH Priority
**Priority**: HIGH
**Effort**: 4 days
**Dependencies**: bazari-commerce pallet, bazari-escrow pallet
**Pallets**: bazari-commerce
**Version**: 1.0
**Last Updated**: 2025-11-14

---

## 📋 Context

### Problem Statement

The **bazari-commerce** pallet has 95% UI coverage, but critical enhancements are missing:

1. **Order State Machine UI**: Frontend allows invalid state transitions (e.g., marking shipped when status != PAID)
2. **Multi-Store Order Breakdown**: Cart supports multi-store, but OrderPage doesn't show per-store breakdown
3. **Receipt NFT Minting UI**: `mint_receipt` extrinsic exists but no UI trigger
4. **Unified Badge System**: Order/ChatProposal origins need visual differentiation
5. **Order State Validation**: Missing frontend enforcement of state machine rules

**Current State** (from Gap Analysis Section 1.3):
- ✅ OrderPage displays basic order details
- ✅ DeliveryStatusTimeline shows state progression
- ⚠️ No state validation (users can attempt invalid transitions)
- ❌ No NFT minting UI
- ❌ No multi-store breakdown visualization
- ❌ No Order/ChatProposal badge differentiation

**Impact**: Poor UX, transaction failures, confusion on multi-store orders, missing NFT feature adoption.

---

## 🎯 Objective

Enhance the order viewing and management experience by implementing:

1. **OrderStateBadge Component** - Visual state indicators with transition rules
2. **Multi-Store Order Breakdown** - Per-store itemization in OrderPage
3. **Receipt NFT Minting UI** - Mint button + NFT gallery integration
4. **State Machine Validation** - Disable invalid action buttons
5. **Unified Badge System** - Visual differentiation for Marketplace vs BazChat orders

**Deliverables**:
- 2 component enhancements (OrderPage, DeliveryStatusTimeline)
- 1 new component (ReceiptNFTCard)
- 2 blockchain hooks (useMintReceipt, useOrderStateValidation)
- State validation logic
- Multi-store visualization

---

## 📐 Specs

### 3.1 Order State Machine (from bazari-commerce SPEC.md)

```rust
pub enum OrderStatus {
    Created,      // Initial state
    Paid,         // Payment locked in escrow
    Shipped,      // Seller marked as shipped
    Delivered,    // Buyer confirmed delivery
    Disputed,     // Dispute opened
    Cancelled,    // Order cancelled
    Refunded,     // Funds returned to buyer
}
```

**Valid Transitions**:
- Created → Paid (payment)
- Created → Cancelled (buyer cancels)
- Paid → Shipped (seller ships)
- Paid → Disputed (buyer disputes)
- Shipped → Delivered (buyer confirms)
- Shipped → Disputed (delivery issue)
- Delivered → (terminal state)
- Disputed → Delivered | Refunded (ruling)

### 3.2 Receipt NFT Structure

```rust
// From bazari-commerce SPEC.md
pub struct ReceiptNFT {
    pub order_id: OrderId,
    pub collection_id: u32,    // NFT collection
    pub item_id: u32,          // Unique NFT ID
    pub metadata_uri: Vec<u8>, // IPFS CID
    pub minted_at: BlockNumber,
}
```

**Mint Extrinsic**:
```rust
pub fn mint_receipt(
    origin: OriginFor<T>,
    order_id: OrderId,
) -> DispatchResult
```

**Requirements**:
- Order must be in `Delivered` status
- Only buyer can mint
- One receipt per order (idempotent)

### 3.3 Multi-Store Order Format

```typescript
interface MultiStoreOrder {
  orderId: number;
  isMultiStore: boolean;
  stores: Array<{
    storeId: string;
    storeName: string;
    items: OrderItem[];
    subtotal: string; // BZR
    escrowId: number; // Separate escrow per store
  }>;
  totalAmount: string;
  shippingAddress: Address;
}
```

### 3.4 Order Source Differentiation

```typescript
enum OrderSource {
  MARKETPLACE = 'marketplace',
  BAZCHAT = 'bazchat'
}

interface OrderWithSource {
  orderId: number;
  source: OrderSource;
  threadId?: string; // If source === BAZCHAT
}
```

---

## 🔨 Implementation Details

### Step 1: Create OrderStateBadge Component (1 day)

**Location**: `/root/bazari/apps/web/src/components/orders/OrderStateBadge.tsx`

```typescript
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export enum OrderStatus {
  Created = 'Created',
  Paid = 'Paid',
  Shipped = 'Shipped',
  Delivered = 'Delivered',
  Disputed = 'Disputed',
  Cancelled = 'Cancelled',
  Refunded = 'Refunded',
}

interface OrderStateBadgeProps {
  status: OrderStatus;
  className?: string;
}

const STATUS_CONFIG: Record<OrderStatus, {
  label: string;
  variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive';
  icon: string;
}> = {
  [OrderStatus.Created]: {
    label: 'Created',
    variant: 'secondary',
    icon: '📝',
  },
  [OrderStatus.Paid]: {
    label: 'Paid',
    variant: 'default',
    icon: '💳',
  },
  [OrderStatus.Shipped]: {
    label: 'Shipped',
    variant: 'default',
    icon: '📦',
  },
  [OrderStatus.Delivered]: {
    label: 'Delivered',
    variant: 'success',
    icon: '✅',
  },
  [OrderStatus.Disputed]: {
    label: 'Disputed',
    variant: 'warning',
    icon: '⚠️',
  },
  [OrderStatus.Cancelled]: {
    label: 'Cancelled',
    variant: 'destructive',
    icon: '❌',
  },
  [OrderStatus.Refunded]: {
    label: 'Refunded',
    variant: 'secondary',
    icon: '💰',
  },
};

export function OrderStateBadge({ status, className }: OrderStateBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge
      variant={config.variant}
      className={cn('flex items-center gap-1', className)}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </Badge>
  );
}

// Validation helper
export function getValidTransitions(currentStatus: OrderStatus): OrderStatus[] {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.Created]: [OrderStatus.Paid, OrderStatus.Cancelled],
    [OrderStatus.Paid]: [OrderStatus.Shipped, OrderStatus.Disputed],
    [OrderStatus.Shipped]: [OrderStatus.Delivered, OrderStatus.Disputed],
    [OrderStatus.Delivered]: [], // Terminal
    [OrderStatus.Disputed]: [OrderStatus.Delivered, OrderStatus.Refunded],
    [OrderStatus.Cancelled]: [], // Terminal
    [OrderStatus.Refunded]: [], // Terminal
  };

  return transitions[currentStatus] || [];
}

export function canTransitionTo(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  return getValidTransitions(from).includes(to);
}
```

**Unit Test** (`OrderStateBadge.test.tsx`):
```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { OrderStateBadge, OrderStatus, canTransitionTo } from './OrderStateBadge';

describe('OrderStateBadge', () => {
  it('renders Created status correctly', () => {
    const { getByText } = render(<OrderStateBadge status={OrderStatus.Created} />);
    expect(getByText('Created')).toBeInTheDocument();
    expect(getByText('📝')).toBeInTheDocument();
  });

  it('validates Paid → Shipped transition', () => {
    expect(canTransitionTo(OrderStatus.Paid, OrderStatus.Shipped)).toBe(true);
  });

  it('rejects Paid → Delivered transition', () => {
    expect(canTransitionTo(OrderStatus.Paid, OrderStatus.Delivered)).toBe(false);
  });

  it('rejects any transition from Delivered (terminal)', () => {
    expect(canTransitionTo(OrderStatus.Delivered, OrderStatus.Shipped)).toBe(false);
  });
});
```

---

### Step 2: Implement useOrderStateValidation Hook (0.5 days)

**Location**: `/root/bazari/apps/web/src/hooks/useOrderStateValidation.ts`

```typescript
import { useMemo } from 'react';
import { OrderStatus, canTransitionTo } from '@/components/orders/OrderStateBadge';

interface UseOrderStateValidationProps {
  currentStatus: OrderStatus;
  userRole: 'buyer' | 'seller' | 'admin';
}

interface OrderActions {
  canPay: boolean;
  canShip: boolean;
  canConfirmDelivery: boolean;
  canOpenDispute: boolean;
  canCancel: boolean;
  canMintReceipt: boolean;
}

export function useOrderStateValidation({
  currentStatus,
  userRole,
}: UseOrderStateValidationProps): OrderActions {
  return useMemo(() => {
    const actions: OrderActions = {
      canPay: false,
      canShip: false,
      canConfirmDelivery: false,
      canOpenDispute: false,
      canCancel: false,
      canMintReceipt: false,
    };

    // Payment (buyer only)
    if (userRole === 'buyer' && currentStatus === OrderStatus.Created) {
      actions.canPay = true;
    }

    // Shipping (seller only)
    if (userRole === 'seller' && currentStatus === OrderStatus.Paid) {
      actions.canShip = canTransitionTo(currentStatus, OrderStatus.Shipped);
    }

    // Delivery confirmation (buyer only)
    if (userRole === 'buyer' && currentStatus === OrderStatus.Shipped) {
      actions.canConfirmDelivery = canTransitionTo(currentStatus, OrderStatus.Delivered);
    }

    // Dispute (buyer or seller)
    if (['buyer', 'seller'].includes(userRole)) {
      actions.canOpenDispute =
        currentStatus === OrderStatus.Paid ||
        currentStatus === OrderStatus.Shipped;
    }

    // Cancel (buyer only, before payment)
    if (userRole === 'buyer' && currentStatus === OrderStatus.Created) {
      actions.canCancel = canTransitionTo(currentStatus, OrderStatus.Cancelled);
    }

    // Mint NFT receipt (buyer only, after delivery)
    if (userRole === 'buyer' && currentStatus === OrderStatus.Delivered) {
      actions.canMintReceipt = true;
    }

    return actions;
  }, [currentStatus, userRole]);
}
```

**Unit Test** (`useOrderStateValidation.test.ts`):
```typescript
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOrderStateValidation } from './useOrderStateValidation';
import { OrderStatus } from '@/components/orders/OrderStateBadge';

describe('useOrderStateValidation', () => {
  it('allows buyer to pay on Created status', () => {
    const { result } = renderHook(() =>
      useOrderStateValidation({
        currentStatus: OrderStatus.Created,
        userRole: 'buyer',
      })
    );

    expect(result.current.canPay).toBe(true);
    expect(result.current.canShip).toBe(false);
  });

  it('allows seller to ship on Paid status', () => {
    const { result } = renderHook(() =>
      useOrderStateValidation({
        currentStatus: OrderStatus.Paid,
        userRole: 'seller',
      })
    );

    expect(result.current.canShip).toBe(true);
    expect(result.current.canConfirmDelivery).toBe(false);
  });

  it('allows buyer to mint NFT on Delivered status', () => {
    const { result } = renderHook(() =>
      useOrderStateValidation({
        currentStatus: OrderStatus.Delivered,
        userRole: 'buyer',
      })
    );

    expect(result.current.canMintReceipt).toBe(true);
  });

  it('disallows all actions on terminal Delivered for seller', () => {
    const { result } = renderHook(() =>
      useOrderStateValidation({
        currentStatus: OrderStatus.Delivered,
        userRole: 'seller',
      })
    );

    expect(result.current.canPay).toBe(false);
    expect(result.current.canShip).toBe(false);
    expect(result.current.canMintReceipt).toBe(false);
  });
});
```

---

### Step 3: Create Multi-Store Order Breakdown Component (1 day)

**Location**: `/root/bazari/apps/web/src/components/orders/MultiStoreOrderBreakdown.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatBZR } from '@/lib/utils';

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: string; // BZR
}

interface StoreOrderGroup {
  storeId: string;
  storeName: string;
  items: OrderItem[];
  subtotal: string;
  escrowId: number;
}

interface MultiStoreOrderBreakdownProps {
  stores: StoreOrderGroup[];
  totalAmount: string;
}

export function MultiStoreOrderBreakdown({
  stores,
  totalAmount,
}: MultiStoreOrderBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Breakdown ({stores.length} stores)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stores.map((store, index) => (
          <div key={store.storeId}>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{store.storeName}</h4>
                <span className="text-sm text-muted-foreground">
                  Escrow #{store.escrowId}
                </span>
              </div>

              <div className="space-y-1">
                {store.items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex justify-between text-sm"
                  >
                    <span>
                      {item.quantity}x {item.productName}
                    </span>
                    <span>{formatBZR(item.price)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between font-medium">
                <span>Subtotal</span>
                <span>{formatBZR(store.subtotal)}</span>
              </div>
            </div>

            {index < stores.length - 1 && <Separator className="my-4" />}
          </div>
        ))}

        <Separator className="my-4" />

        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{formatBZR(totalAmount)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### Step 4: Implement Receipt NFT Minting UI (1.5 days)

**4.1 Create useMintReceipt Hook**

**Location**: `/root/bazari/apps/web/src/hooks/blockchain/useMintReceipt.ts`

```typescript
import { useBlockchainTx } from './useBlockchainTx';
import { usePolkadotApi } from '@/providers/PolkadotProvider';

interface MintReceiptParams {
  orderId: number;
}

export function useMintReceipt() {
  const { api } = usePolkadotApi();

  return useBlockchainTx<MintReceiptParams, string>(
    'mint_receipt',
    async ({ orderId }, signer) => {
      if (!api) throw new Error('API not ready');

      const tx = api.tx.bazariCommerce.mintReceipt(orderId);

      return new Promise((resolve, reject) => {
        tx.signAndSend(signer, ({ status, events }) => {
          if (status.isInBlock) {
            // Extract NFT ID from event
            const nftMintedEvent = events.find((e) =>
              e.event.method === 'ReceiptMinted'
            );

            if (nftMintedEvent) {
              const [, , itemId] = nftMintedEvent.event.data;
              resolve(itemId.toString());
            } else {
              reject(new Error('ReceiptMinted event not found'));
            }
          } else if (status.isFinalized) {
            // Already resolved in isInBlock
          }
        }).catch(reject);
      });
    }
  );
}
```

**4.2 Create ReceiptNFTCard Component**

**Location**: `/root/bazari/apps/web/src/components/orders/ReceiptNFTCard.tsx`

```typescript
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMintReceipt } from '@/hooks/blockchain/useMintReceipt';
import { Loader2 } from 'lucide-react';

interface ReceiptNFTCardProps {
  orderId: number;
  canMint: boolean;
  existingNFT?: {
    collectionId: number;
    itemId: number;
    metadataUri: string;
  };
}

export function ReceiptNFTCard({
  orderId,
  canMint,
  existingNFT,
}: ReceiptNFTCardProps) {
  const { mutate: mintReceipt, isPending, isSuccess } = useMintReceipt();
  const [nftId, setNftId] = useState<string | null>(
    existingNFT?.itemId.toString() || null
  );

  const handleMint = () => {
    mintReceipt(
      { orderId },
      {
        onSuccess: (itemId) => {
          setNftId(itemId);
        },
      }
    );
  };

  if (existingNFT || nftId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Receipt NFT</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="text-4xl">🧾</div>
            <div>
              <p className="font-semibold">NFT #{nftId || existingNFT?.itemId}</p>
              <p className="text-sm text-muted-foreground">
                Collection #{existingNFT?.collectionId || 1}
              </p>
            </div>
          </div>

          {existingNFT?.metadataUri && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                window.open(
                  `https://ipfs.io/ipfs/${existingNFT.metadataUri}`,
                  '_blank'
                )
              }
            >
              View Metadata
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!canMint) {
    return (
      <Alert>
        <AlertDescription>
          Receipt NFT can only be minted after order is delivered.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mint Receipt NFT</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Mint a unique NFT receipt for this order. This creates an immutable
          proof of purchase on the blockchain.
        </p>

        <Button onClick={handleMint} disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? 'Minting...' : 'Mint Receipt NFT'}
        </Button>

        {isSuccess && (
          <Alert className="mt-4">
            <AlertDescription>
              Receipt NFT minted successfully! NFT ID: {nftId}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
```

---

### Step 5: Enhance OrderPage with All Components (1 day)

**Location**: `/root/bazari/apps/web/src/app/orders/[orderId]/page.tsx` (Edit)

```typescript
import { OrderStateBadge, OrderStatus } from '@/components/orders/OrderStateBadge';
import { MultiStoreOrderBreakdown } from '@/components/orders/MultiStoreOrderBreakdown';
import { ReceiptNFTCard } from '@/components/orders/ReceiptNFTCard';
import { useOrderStateValidation } from '@/hooks/useOrderStateValidation';
import { useBlockchainOrder } from '@/hooks/blockchain/useBlockchainOrder';
import { useSession } from '@/providers/SessionProvider';

export default function OrderDetailPage({ params }: { params: { orderId: string } }) {
  const orderId = parseInt(params.orderId);
  const { data: order, isLoading } = useBlockchainOrder(orderId);
  const { user } = useSession();

  // Determine user role
  const userRole = useMemo(() => {
    if (order?.buyer === user?.address) return 'buyer';
    if (order?.seller === user?.address) return 'seller';
    return null;
  }, [order, user]);

  const validation = useOrderStateValidation({
    currentStatus: order?.status as OrderStatus,
    userRole: userRole || 'buyer',
  });

  if (isLoading) return <div>Loading...</div>;
  if (!order) return <div>Order not found</div>;

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header with Status Badge */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Order #{orderId}</h1>
        <OrderStateBadge status={order.status as OrderStatus} />
      </div>

      {/* Order Source Badge */}
      {order.source && (
        <div className="flex items-center gap-2">
          {order.source === 'bazchat' ? (
            <Badge variant="outline">💬 BazChat Order</Badge>
          ) : (
            <Badge variant="outline">🛒 Marketplace Order</Badge>
          )}
          {order.threadId && (
            <Button
              variant="link"
              size="sm"
              onClick={() => router.push(`/chat/${order.threadId}`)}
            >
              View Chat →
            </Button>
          )}
        </div>
      )}

      {/* Multi-Store Breakdown (if applicable) */}
      {order.isMultiStore ? (
        <MultiStoreOrderBreakdown
          stores={order.stores}
          totalAmount={order.totalAmount}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Single-store item list */}
          </CardContent>
        </Card>
      )}

      {/* Receipt NFT Card */}
      <ReceiptNFTCard
        orderId={orderId}
        canMint={validation.canMintReceipt}
        existingNFT={order.receiptNFT}
      />

      {/* Action Buttons with State Validation */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          {validation.canShip && (
            <Button onClick={handleMarkShipped}>Mark as Shipped</Button>
          )}

          {validation.canConfirmDelivery && (
            <Button onClick={handleConfirmDelivery}>Confirm Received</Button>
          )}

          {validation.canOpenDispute && (
            <Button variant="destructive" onClick={handleOpenDispute}>
              Open Dispute
            </Button>
          )}

          {validation.canCancel && (
            <Button variant="outline" onClick={handleCancel}>
              Cancel Order
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Existing components: DeliveryStatusTimeline, etc. */}
    </div>
  );
}
```

---

## ✅ Acceptance Criteria

### Functional Requirements

1. **State Validation**
   - [ ] Invalid action buttons are disabled (e.g., "Mark Shipped" when status != Paid)
   - [ ] Button tooltips explain why action is disabled
   - [ ] State transitions follow blockchain rules exactly

2. **Multi-Store Display**
   - [ ] Orders with multiple stores show per-store breakdown
   - [ ] Each store section displays: items, subtotal, escrow ID
   - [ ] Total matches sum of all store subtotals

3. **NFT Minting**
   - [ ] "Mint Receipt NFT" button appears only when status = Delivered AND user = buyer
   - [ ] Minting transaction shows loading state
   - [ ] After minting, NFT card displays collection ID + item ID
   - [ ] Metadata link opens IPFS gateway
   - [ ] Cannot mint twice (idempotent)

4. **Order Source Badge**
   - [ ] Marketplace orders show "🛒 Marketplace Order" badge
   - [ ] BazChat orders show "💬 BazChat Order" badge
   - [ ] BazChat orders have "View Chat →" button linking to thread

### Non-Functional Requirements

5. **Performance**
   - [ ] State validation hook re-computes only when status/role changes (useMemo)
   - [ ] NFT minting completes within 6 seconds (2 blocks)

6. **Accessibility**
   - [ ] All buttons have aria-disabled when disabled
   - [ ] Status badges have aria-label with full status name
   - [ ] NFT card has screen-reader description

7. **Mobile Responsive**
   - [ ] Multi-store breakdown stacks vertically on mobile
   - [ ] Action buttons wrap on small screens

---

## 🧪 Testing

### Unit Tests

**Test File**: `apps/web/src/components/orders/__tests__/OrderStateBadge.test.tsx`

```typescript
describe('OrderStateBadge Component', () => {
  it('renders all 7 status variants', () => {
    const statuses = Object.values(OrderStatus);
    statuses.forEach((status) => {
      const { getByText } = render(<OrderStateBadge status={status} />);
      expect(getByText(status)).toBeInTheDocument();
    });
  });

  it('displays correct icon for each status', () => {
    const { rerender, getByText } = render(
      <OrderStateBadge status={OrderStatus.Delivered} />
    );
    expect(getByText('✅')).toBeInTheDocument();

    rerender(<OrderStateBadge status={OrderStatus.Disputed} />);
    expect(getByText('⚠️')).toBeInTheDocument();
  });
});

describe('State Validation Logic', () => {
  it('allows Paid → Shipped transition', () => {
    expect(canTransitionTo(OrderStatus.Paid, OrderStatus.Shipped)).toBe(true);
  });

  it('disallows Shipped → Paid transition', () => {
    expect(canTransitionTo(OrderStatus.Shipped, OrderStatus.Paid)).toBe(false);
  });

  it('disallows any transition from terminal Delivered', () => {
    const validTransitions = getValidTransitions(OrderStatus.Delivered);
    expect(validTransitions).toEqual([]);
  });
});
```

### Integration Tests

**Test File**: `apps/web/src/app/orders/__tests__/OrderDetailPage.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import OrderDetailPage from '../[orderId]/page';
import { mockOrder } from '@/test/fixtures';

describe('OrderDetailPage Integration', () => {
  it('disables Mark Shipped button when status is Created', () => {
    const order = mockOrder({ status: 'Created', userRole: 'seller' });
    render(<OrderDetailPage params={{ orderId: '1' }} />);

    const shipButton = screen.getByText('Mark as Shipped');
    expect(shipButton).toBeDisabled();
  });

  it('enables Mint NFT button when status is Delivered and user is buyer', () => {
    const order = mockOrder({ status: 'Delivered', userRole: 'buyer' });
    render(<OrderDetailPage params={{ orderId: '1' }} />);

    const mintButton = screen.getByText('Mint Receipt NFT');
    expect(mintButton).not.toBeDisabled();
  });

  it('shows multi-store breakdown for orders with multiple stores', () => {
    const order = mockOrder({
      isMultiStore: true,
      stores: [
        { storeId: '1', storeName: 'Store A', subtotal: '100' },
        { storeId: '2', storeName: 'Store B', subtotal: '200' },
      ],
    });
    render(<OrderDetailPage params={{ orderId: '1' }} />);

    expect(screen.getByText('Store A')).toBeInTheDocument();
    expect(screen.getByText('Store B')).toBeInTheDocument();
    expect(screen.getByText('Order Breakdown (2 stores)')).toBeInTheDocument();
  });
});
```

### Manual Testing Checklist

- [ ] **State Validation**: Create order → verify only "Pay" button enabled → Pay → verify "Mark Shipped" enabled for seller
- [ ] **NFT Minting**: Complete delivery → verify "Mint NFT" button appears for buyer → Click mint → verify NFT card shows collection/item ID
- [ ] **Multi-Store**: Add items from 2 stores → Checkout → OrderPage shows both stores with separate escrows
- [ ] **Order Source Badge**: Create order via Marketplace → verify 🛒 badge → Create order via BazChat → verify 💬 badge + thread link
- [ ] **Mobile**: Test multi-store breakdown on 375px screen → verify vertical stacking

---

## 📦 Dependencies

### Internal Dependencies

**Required Files**:
- `/root/bazari/apps/web/src/hooks/blockchain/useBlockchainTx.ts` (existing)
- `/root/bazari/apps/web/src/hooks/blockchain/useBlockchainOrder.ts` (existing)
- `/root/bazari/apps/web/src/components/ui/badge.tsx` (shadcn/ui)
- `/root/bazari/apps/web/src/components/ui/card.tsx` (shadcn/ui)
- `/root/bazari/apps/web/src/components/ui/button.tsx` (shadcn/ui)

**Blockchain Dependencies**:
- `bazari-commerce` pallet must have `mint_receipt` extrinsic deployed
- `pallet-uniques` (NFT collection) configured in runtime

### External Dependencies

None (all UI components use existing shadcn/ui library).

---

## 🔗 References

### Pallet Documentation
- [bazari-commerce SPEC.md](/root/bazari/knowledge/20-blueprints/pallets/bazari-commerce/SPEC.md)
- [bazari-commerce IMPLEMENTATION.md](/root/bazari/knowledge/20-blueprints/pallets/bazari-commerce/IMPLEMENTATION.md)

### UI/UX Documentation
- [bazari-commerce UI-SPEC.md](/root/bazari/knowledge/20-blueprints/ui-ux/pallets/bazari-commerce/UI-SPEC.md)
- [bazari-commerce COMPONENTS.md](/root/bazari/knowledge/20-blueprints/ui-ux/pallets/bazari-commerce/COMPONENTS.md)
- [bazari-commerce PAGES.md](/root/bazari/knowledge/20-blueprints/ui-ux/pallets/bazari-commerce/PAGES.md)

### Gap Analysis
- [UI/UX Gap Analysis - Section 1](/root/bazari/UI_UX_GAP_ANALYSIS.md#1-bazari-commerce-p1---foundation)

---

## 🤖 Prompt for Claude Code

```
Implement Order Enhancements UI/UX for bazari-commerce pallet in the Bazari marketplace.

**Context**:
- Repository: /root/bazari
- Problem: OrderPage lacks state validation, multi-store breakdown, and NFT minting UI
- Pallet: bazari-commerce (SPEC at /root/bazari/knowledge/20-blueprints/pallets/bazari-commerce/)
- Gap Analysis: /root/bazari/UI_UX_GAP_ANALYSIS.md Section 1.3

**Objective**:
1. Create OrderStateBadge component with state transition validation
2. Implement useOrderStateValidation hook to enable/disable action buttons
3. Create MultiStoreOrderBreakdown component for multi-store orders
4. Implement useMintReceipt hook + ReceiptNFTCard component
5. Enhance OrderPage to integrate all components with state validation

**Technical Specs**:
- OrderStatus enum: Created, Paid, Shipped, Delivered, Disputed, Cancelled, Refunded
- Valid transitions: Created→Paid/Cancelled, Paid→Shipped/Disputed, Shipped→Delivered/Disputed, Delivered=terminal
- Receipt NFT minting: Only buyer, only when status=Delivered, idempotent
- Multi-store: Show per-store breakdown with separate escrow IDs
- Order source badge: Differentiate Marketplace vs BazChat orders

**Components to Create**:
1. /root/bazari/apps/web/src/components/orders/OrderStateBadge.tsx
   - Badge with icon + label for each status
   - Helper functions: getValidTransitions(), canTransitionTo()
2. /root/bazari/apps/web/src/hooks/useOrderStateValidation.ts
   - Returns { canPay, canShip, canConfirmDelivery, canOpenDispute, canCancel, canMintReceipt }
   - Role-based validation (buyer, seller, admin)
3. /root/bazari/apps/web/src/components/orders/MultiStoreOrderBreakdown.tsx
   - Display stores[] with items, subtotal, escrowId
   - Show total
4. /root/bazari/apps/web/src/hooks/blockchain/useMintReceipt.ts
   - Call api.tx.bazariCommerce.mintReceipt(orderId)
   - Extract NFT itemId from ReceiptMinted event
5. /root/bazari/apps/web/src/components/orders/ReceiptNFTCard.tsx
   - Show "Mint" button if canMintReceipt=true
   - Display NFT card if already minted (collectionId, itemId, metadata link)

**Components to Edit**:
6. /root/bazari/apps/web/src/app/orders/[orderId]/page.tsx
   - Add OrderStateBadge to header
   - Add order source badge (Marketplace 🛒 vs BazChat 💬)
   - Conditionally show MultiStoreOrderBreakdown if isMultiStore
   - Add ReceiptNFTCard
   - Disable action buttons based on useOrderStateValidation

**Anti-Patterns**:
- ❌ Do not allow invalid state transitions (e.g., Paid → Delivered directly)
- ❌ Do not show "Mint NFT" button if status !== Delivered
- ❌ Do not allow seller to mint NFT (buyer only)

**Testing**:
- Unit tests: OrderStateBadge.test.tsx, useOrderStateValidation.test.ts
- Integration test: OrderDetailPage.test.tsx (test state validation, multi-store display, NFT minting)
- Manual: Create order → pay → ship → deliver → mint NFT (verify each step)

**Acceptance Criteria**:
- [ ] Invalid action buttons are disabled with tooltips
- [ ] Multi-store orders show per-store breakdown
- [ ] NFT minting works for buyer on Delivered orders
- [ ] Order source badge shows Marketplace/BazChat correctly
- [ ] All transitions follow blockchain state machine rules

**References**:
- SPEC: /root/bazari/knowledge/20-blueprints/pallets/bazari-commerce/SPEC.md
- UI-SPEC: /root/bazari/knowledge/20-blueprints/ui-ux/pallets/bazari-commerce/UI-SPEC.md
- Gap Analysis: /root/bazari/UI_UX_GAP_ANALYSIS.md

When done, run tests: `pnpm test apps/web/src/components/orders` and show screenshots of OrderPage with multi-store + NFT card.
```

---

**Version**: 1.0
**Last Updated**: 2025-11-14
**Author**: Claude Code Senior Architect
