# Escrow Admin Dashboard UI/UX - Implementation Prompt

**Phase**: P1 - HIGH Priority
**Priority**: HIGH
**Effort**: 5 days
**Dependencies**: bazari-escrow pallet, bazari-commerce pallet
**Pallets**: bazari-escrow
**Version**: 1.0
**Last Updated**: 2025-11-14

---

## 📋 Context

### Problem Statement

The **bazari-escrow** pallet has 70% UI coverage with critical admin features missing:

1. **No Admin Dashboard**: DAO cannot view/manage active escrows
2. **No Refund UI**: `refund` and `partial_refund` extrinsics exist but no interface
3. **No Escrow Events Log**: Timeline of escrow state changes not visualized
4. **No Auto-Release Countdown**: 7-day timeout not displayed
5. **Missing DAO Authorization**: No UI checks for DAO membership

**Current State** (from Gap Analysis Section 2.3):
- ⚠️ OrderPage shows payment intent but not escrow details
- ❌ No EscrowCard component
- ❌ No countdown timer for auto-release
- ❌ No admin refund interface
- ❌ No escrow event timeline

**Impact**: DAO cannot intervene in disputes, buyers/sellers lack transparency on escrow status.

---

## 🎯 Objective

Implement escrow admin and transparency features:

1. **AdminEscrowDashboardPage** - DAO-only dashboard for managing escrows
2. **RefundModal + PartialRefundModal** - Interfaces for DAO refund actions
3. **EscrowEventsLog** - Timeline component showing escrow state changes
4. **useRefund + usePartialRefund** - Blockchain hooks for DAO refund extrinsics
5. **DAO Authorization** - RequireDAO wrapper component

**Deliverables**:
- 1 admin page (AdminEscrowDashboardPage)
- 3 modal components (RefundModal, PartialRefundModal, EscrowDetailsModal)
- 3 blockchain hooks (useRefund, usePartialRefund, useEscrowDetails)
- 1 timeline component (EscrowEventsLog)
- 1 authorization HOC (RequireDAO)

---

## 📐 Specs

### 3.1 Escrow Storage Structure (from bazari-escrow SPEC.md)

```rust
pub struct Escrow<AccountId, Balance, BlockNumber> {
    pub buyer: AccountId,
    pub seller: AccountId,
    pub amount_locked: Balance,
    pub amount_released: Balance,
    pub status: EscrowStatus,
    pub locked_at: BlockNumber,
    pub updated_at: BlockNumber,
}

pub enum EscrowStatus {
    Locked,          // Funds held
    Released,        // Released to seller
    Refunded,        // Returned to buyer
    PartialRefund,   // Split between buyer/seller
}
```

### 3.2 DAO Refund Extrinsics

```rust
// Full refund (100% to buyer)
pub fn refund(
    origin: OriginFor<T>,
    order_id: OrderId,
) -> DispatchResult

// Partial refund (custom split)
pub fn partial_refund(
    origin: OriginFor<T>,
    order_id: OrderId,
    buyer_amount: Balance,
    seller_amount: Balance,
) -> DispatchResult
```

**Requirements**:
- `origin` must be DAO/Council member
- `buyer_amount + seller_amount == amount_locked`
- Order status allows refund (not already refunded)

### 3.3 Auto-Release Logic

```rust
// Constants from pallet
const AUTO_RELEASE_TIMEOUT: BlockNumber = 7 * DAYS; // 7 days
const BLOCKS_PER_DAY: u32 = 14_400; // 6s per block
```

**Auto-release triggers**:
- If `current_block - locked_at >= AUTO_RELEASE_TIMEOUT`
- Automatically releases funds to seller
- No UI action required (blockchain automation)

---

## 🔨 Implementation Details

### Step 1: Create RequireDAO Authorization HOC (0.5 days)

**Location**: `/root/bazari/apps/web/src/components/auth/RequireDAO.tsx`

```typescript
import { ReactNode } from 'react';
import { useDAOMembership } from '@/hooks/blockchain/useDAOMembership';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldX } from 'lucide-react';

interface RequireDAOProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequireDAO({ children, fallback }: RequireDAOProps) {
  const { isDAOMember, isLoading } = useDAOMembership();

  if (isLoading) {
    return <div>Loading authorization...</div>;
  }

  if (!isDAOMember) {
    return (
      fallback || (
        <Alert variant="destructive">
          <ShieldX className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            This page is restricted to DAO members only.
          </AlertDescription>
        </Alert>
      )
    );
  }

  return <>{children}</>;
}
```

**Hook**: `/root/bazari/apps/web/src/hooks/blockchain/useDAOMembership.ts`

```typescript
import { usePolkadotApi } from '@/providers/PolkadotProvider';
import { useSession } from '@/providers/SessionProvider';
import { useQuery } from '@tanstack/react-query';

export function useDAOMembership() {
  const { api } = usePolkadotApi();
  const { user } = useSession();

  return useQuery({
    queryKey: ['dao-membership', user?.address],
    queryFn: async () => {
      if (!api || !user?.address) return false;

      // Query Council members from pallet-collective
      const members = await api.query.council.members();
      return members.some((m) => m.toString() === user.address);
    },
    enabled: !!api && !!user,
  });
}
```

---

### Step 2: Create useEscrowDetails Hook (0.5 days)

**Location**: `/root/bazari/apps/web/src/hooks/blockchain/useEscrowDetails.ts`

```typescript
import { usePolkadotApi } from '@/providers/PolkadotProvider';
import { useQuery } from '@tanstack/react-query';

interface EscrowDetails {
  buyer: string;
  seller: string;
  amountLocked: string;
  amountReleased: string;
  status: 'Locked' | 'Released' | 'Refunded' | 'PartialRefund';
  lockedAt: number;
  updatedAt: number;
  autoReleaseBlock: number;
  blocksUntilRelease: number;
}

export function useEscrowDetails(orderId: number) {
  const { api } = usePolkadotApi();

  return useQuery<EscrowDetails>({
    queryKey: ['escrow', orderId],
    queryFn: async () => {
      if (!api) throw new Error('API not ready');

      const escrow = await api.query.bazariEscrow.escrows(orderId);

      if (escrow.isNone) {
        throw new Error('Escrow not found');
      }

      const data = escrow.unwrap();
      const currentBlock = (await api.query.system.number()).toNumber();
      const lockedAt = data.lockedAt.toNumber();
      const autoReleaseBlock = lockedAt + 7 * 14_400; // 7 days

      return {
        buyer: data.buyer.toString(),
        seller: data.seller.toString(),
        amountLocked: data.amountLocked.toString(),
        amountReleased: data.amountReleased.toString(),
        status: data.status.toString() as EscrowDetails['status'],
        lockedAt,
        updatedAt: data.updatedAt.toNumber(),
        autoReleaseBlock,
        blocksUntilRelease: Math.max(0, autoReleaseBlock - currentBlock),
      };
    },
    enabled: !!api && !!orderId,
    refetchInterval: 6000, // Refetch every 6s (1 block)
  });
}
```

---

### Step 3: Create Refund Hooks (1 day)

**3.1 useRefund Hook**

**Location**: `/root/bazari/apps/web/src/hooks/blockchain/useRefund.ts`

```typescript
import { useBlockchainTx } from './useBlockchainTx';
import { usePolkadotApi } from '@/providers/PolkadotProvider';

interface RefundParams {
  orderId: number;
}

export function useRefund() {
  const { api } = usePolkadotApi();

  return useBlockchainTx<RefundParams, void>(
    'refund',
    async ({ orderId }, signer) => {
      if (!api) throw new Error('API not ready');

      const tx = api.tx.bazariEscrow.refund(orderId);

      return new Promise((resolve, reject) => {
        tx.signAndSend(signer, ({ status, events }) => {
          if (status.isInBlock) {
            const refundEvent = events.find((e) =>
              e.event.method === 'Refunded'
            );

            if (refundEvent) {
              resolve();
            } else {
              reject(new Error('Refund failed'));
            }
          }
        }).catch(reject);
      });
    }
  );
}
```

**3.2 usePartialRefund Hook**

```typescript
interface PartialRefundParams {
  orderId: number;
  buyerAmount: string;
  sellerAmount: string;
}

export function usePartialRefund() {
  const { api } = usePolkadotApi();

  return useBlockchainTx<PartialRefundParams, void>(
    'partial_refund',
    async ({ orderId, buyerAmount, sellerAmount }, signer) => {
      if (!api) throw new Error('API not ready');

      const tx = api.tx.bazariEscrow.partialRefund(
        orderId,
        buyerAmount,
        sellerAmount
      );

      return new Promise((resolve, reject) => {
        tx.signAndSend(signer, ({ status, events }) => {
          if (status.isInBlock) {
            const partialRefundEvent = events.find((e) =>
              e.event.method === 'PartialRefund'
            );

            if (partialRefundEvent) {
              resolve();
            } else {
              reject(new Error('Partial refund failed'));
            }
          }
        }).catch(reject);
      });
    }
  );
}
```

---

### Step 4: Create Refund Modals (1 day)

**Location**: `/root/bazari/apps/web/src/components/escrow/RefundModal.tsx`

```typescript
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRefund } from '@/hooks/blockchain/useRefund';
import { Loader2 } from 'lucide-react';

interface RefundModalProps {
  orderId: number;
  amountLocked: string;
  buyer: string;
  open: boolean;
  onClose: () => void;
}

export function RefundModal({
  orderId,
  amountLocked,
  buyer,
  open,
  onClose,
}: RefundModalProps) {
  const { mutate: refund, isPending, isSuccess, error } = useRefund();

  const handleRefund = () => {
    refund(
      { orderId },
      {
        onSuccess: () => {
          setTimeout(onClose, 2000); // Close after 2s
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Full Refund</DialogTitle>
          <DialogDescription>
            This will refund 100% of the escrowed funds to the buyer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertDescription>
              <strong>Amount:</strong> {amountLocked} BZR
              <br />
              <strong>Recipient:</strong> {buyer} (Buyer)
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          {isSuccess && (
            <Alert>
              <AlertDescription>Refund executed successfully!</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRefund}
            disabled={isPending || isSuccess}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? 'Processing...' : 'Confirm Refund'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Location**: `/root/bazari/apps/web/src/components/escrow/PartialRefundModal.tsx`

```typescript
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePartialRefund } from '@/hooks/blockchain/usePartialRefund';

interface PartialRefundModalProps {
  orderId: number;
  amountLocked: string;
  open: boolean;
  onClose: () => void;
}

const partialRefundSchema = z
  .object({
    buyerAmount: z.string().min(1, 'Required'),
    sellerAmount: z.string().min(1, 'Required'),
  })
  .refine(
    (data) => {
      const total = BigInt(data.buyerAmount) + BigInt(data.sellerAmount);
      return total === BigInt(data.amountLocked);
    },
    {
      message: 'Buyer amount + Seller amount must equal total locked amount',
      path: ['sellerAmount'],
    }
  );

export function PartialRefundModal({
  orderId,
  amountLocked,
  open,
  onClose,
}: PartialRefundModalProps) {
  const { mutate: partialRefund, isPending } = usePartialRefund();

  const form = useForm({
    resolver: zodResolver(partialRefundSchema),
    defaultValues: {
      buyerAmount: '',
      sellerAmount: '',
    },
  });

  const onSubmit = (data: z.infer<typeof partialRefundSchema>) => {
    partialRefund(
      {
        orderId,
        buyerAmount: data.buyerAmount,
        sellerAmount: data.sellerAmount,
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Partial Refund</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="buyerAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Buyer Amount (BZR)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="0" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sellerAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seller Amount (BZR)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="0" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="text-sm text-muted-foreground">
              Total Locked: {amountLocked} BZR
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} type="button">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Processing...' : 'Execute Split'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Step 5: Create EscrowEventsLog Component (1 day)

**Location**: `/root/bazari/apps/web/src/components/escrow/EscrowEventsLog.tsx`

```typescript
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

interface EscrowEvent {
  type: 'Locked' | 'Released' | 'Refunded' | 'PartialRefund';
  blockNumber: number;
  timestamp: number;
  txHash: string;
  data?: {
    buyerAmount?: string;
    sellerAmount?: string;
  };
}

interface EscrowEventsLogProps {
  orderId: number;
}

export function EscrowEventsLog({ orderId }: EscrowEventsLogProps) {
  const { data: events, isLoading } = useQuery<EscrowEvent[]>({
    queryKey: ['escrow-events', orderId],
    queryFn: async () => {
      // Fetch from backend indexer
      const response = await fetch(`/api/orders/${orderId}/escrow-events`);
      return response.json();
    },
  });

  if (isLoading) return <div>Loading events...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Escrow Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events?.map((event, index) => (
            <div key={index} className="flex items-start gap-4 border-l-2 pl-4">
              <div className="w-32 text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(event.timestamp), {
                  addSuffix: true,
                })}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{getEventLabel(event.type)}</div>
                {event.data && (
                  <div className="text-sm text-muted-foreground">
                    Buyer: {event.data.buyerAmount} BZR | Seller:{' '}
                    {event.data.sellerAmount} BZR
                  </div>
                )}
                <a
                  href={`https://polkadot.js.org/apps/#/explorer/query/${event.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  View Transaction →
                </a>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function getEventLabel(type: EscrowEvent['type']): string {
  const labels = {
    Locked: '🔒 Funds Locked',
    Released: '✅ Funds Released to Seller',
    Refunded: '💰 Full Refund to Buyer',
    PartialRefund: '⚖️ Partial Refund Split',
  };
  return labels[type];
}
```

---

### Step 6: Create AdminEscrowDashboardPage (2 days)

**Location**: `/root/bazari/apps/web/src/app/admin/escrows/page.tsx`

```typescript
import { useState } from 'react';
import { RequireDAO } from '@/components/auth/RequireDAO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { RefundModal } from '@/components/escrow/RefundModal';
import { PartialRefundModal } from '@/components/escrow/PartialRefundModal';
import { Badge } from '@/components/ui/badge';

interface EscrowRow {
  orderId: number;
  buyer: string;
  seller: string;
  amountLocked: string;
  status: string;
  lockedAt: number;
  autoReleaseBlock: number;
}

export default function AdminEscrowDashboardPage() {
  const [selectedEscrow, setSelectedEscrow] = useState<EscrowRow | null>(null);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [partialRefundModalOpen, setPartialRefundModalOpen] = useState(false);

  const { data: escrows, isLoading } = useQuery<EscrowRow[]>({
    queryKey: ['admin-escrows'],
    queryFn: async () => {
      const response = await fetch('/api/admin/escrows?status=Locked');
      return response.json();
    },
  });

  const handleRefund = (escrow: EscrowRow) => {
    setSelectedEscrow(escrow);
    setRefundModalOpen(true);
  };

  const handlePartialRefund = (escrow: EscrowRow) => {
    setSelectedEscrow(escrow);
    setPartialRefundModalOpen(true);
  };

  return (
    <RequireDAO>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Escrow Management</h1>
          <Badge variant="secondary">DAO Only</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Escrows ({escrows?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div>Loading...</div>
            ) : (
              <div className="space-y-4">
                {escrows?.map((escrow) => (
                  <div
                    key={escrow.orderId}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <div className="font-semibold">Order #{escrow.orderId}</div>
                      <div className="text-sm text-muted-foreground">
                        {escrow.amountLocked} BZR locked
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Buyer: {escrow.buyer.slice(0, 8)}... | Seller:{' '}
                        {escrow.seller.slice(0, 8)}...
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePartialRefund(escrow)}
                      >
                        Partial Refund
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRefund(escrow)}
                      >
                        Full Refund
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modals */}
        {selectedEscrow && (
          <>
            <RefundModal
              orderId={selectedEscrow.orderId}
              amountLocked={selectedEscrow.amountLocked}
              buyer={selectedEscrow.buyer}
              open={refundModalOpen}
              onClose={() => setRefundModalOpen(false)}
            />
            <PartialRefundModal
              orderId={selectedEscrow.orderId}
              amountLocked={selectedEscrow.amountLocked}
              open={partialRefundModalOpen}
              onClose={() => setPartialRefundModalOpen(false)}
            />
          </>
        )}
      </div>
    </RequireDAO>
  );
}
```

---

## ✅ Acceptance Criteria

### Functional Requirements

1. **DAO Authorization**
   - [ ] AdminEscrowDashboardPage only accessible to DAO members
   - [ ] Non-DAO users see "Access Denied" message
   - [ ] DAO membership check uses pallet-collective.members()

2. **Refund Actions**
   - [ ] Full refund sends 100% to buyer
   - [ ] Partial refund validates buyer_amount + seller_amount == total
   - [ ] Refund modals show confirmation before execution
   - [ ] Transaction success/failure messages displayed

3. **Escrow Events Log**
   - [ ] Timeline shows all events: Locked, Released, Refunded, PartialRefund
   - [ ] Each event displays: timestamp, txHash link, data (if partial refund)
   - [ ] Events ordered chronologically (newest first)

4. **Admin Dashboard**
   - [ ] Lists all active escrows (status = Locked)
   - [ ] Shows order ID, locked amount, buyer/seller addresses
   - [ ] "Full Refund" and "Partial Refund" buttons functional

### Non-Functional Requirements

5. **Performance**
   - [ ] Escrow events fetch from backend indexer (not blockchain query)
   - [ ] Dashboard refreshes every 10s to show new escrows

6. **Security**
   - [ ] DAO check on both frontend and backend
   - [ ] Partial refund validates sum === total (frontend + blockchain)

---

## 🧪 Testing

### Unit Tests

```typescript
describe('RefundModal', () => {
  it('displays amount and buyer address', () => {
    render(<RefundModal orderId={1} amountLocked="1000" buyer="0xABC" />);
    expect(screen.getByText('1000 BZR')).toBeInTheDocument();
    expect(screen.getByText(/0xABC/)).toBeInTheDocument();
  });

  it('calls useRefund mutation on confirm', async () => {
    const mockRefund = vi.fn();
    vi.mocked(useRefund).mockReturnValue({ mutate: mockRefund, isPending: false });

    render(<RefundModal orderId={1} amountLocked="1000" buyer="0xABC" />);
    fireEvent.click(screen.getByText('Confirm Refund'));

    expect(mockRefund).toHaveBeenCalledWith({ orderId: 1 });
  });
});

describe('PartialRefundModal', () => {
  it('validates sum equals total', async () => {
    render(<PartialRefundModal orderId={1} amountLocked="1000" />);

    fireEvent.change(screen.getByLabelText(/Buyer Amount/), { target: { value: '600' } });
    fireEvent.change(screen.getByLabelText(/Seller Amount/), { target: { value: '300' } });
    fireEvent.click(screen.getByText('Execute Split'));

    await waitFor(() => {
      expect(screen.getByText(/must equal total/)).toBeInTheDocument();
    });
  });
});
```

### Manual Testing

- [ ] **DAO Auth**: Login as non-DAO user → verify access denied on `/admin/escrows`
- [ ] **Full Refund**: Open admin dashboard → click "Full Refund" → verify buyer receives 100%
- [ ] **Partial Refund**: Click "Partial Refund" → enter 60/40 split → verify both parties receive correct amounts
- [ ] **Events Log**: Check OrderPage → verify EscrowEventsLog shows all events with timestamps

---

## 📦 Dependencies

**Blockchain**:
- `bazari-escrow.refund()` extrinsic
- `bazari-escrow.partialRefund()` extrinsic
- `pallet-collective.members()` query (DAO membership)

**Backend**:
- `GET /api/admin/escrows?status=Locked` (escrow list)
- `GET /api/orders/:id/escrow-events` (event timeline)

---

## 🔗 References

- [bazari-escrow SPEC.md](/root/bazari/knowledge/20-blueprints/pallets/bazari-escrow/SPEC.md)
- [Gap Analysis - Section 2](/root/bazari/UI_UX_GAP_ANALYSIS.md#2-bazari-escrow-p1---foundation)

---

## 🤖 Prompt for Claude Code

```
Implement Escrow Admin Dashboard UI/UX for bazari-escrow pallet in the Bazari marketplace.

**Context**:
- Repository: /root/bazari
- Problem: DAO cannot manage escrows (no refund UI), buyers/sellers lack escrow transparency
- Gap Analysis: /root/bazari/UI_UX_GAP_ANALYSIS.md Section 2.3

**Objective**:
1. Create RequireDAO HOC + useDAOMembership hook
2. Implement useRefund + usePartialRefund blockchain hooks
3. Create RefundModal + PartialRefundModal components
4. Create EscrowEventsLog timeline component
5. Create AdminEscrowDashboardPage (DAO-only)

**Components**:
- /root/bazari/apps/web/src/components/auth/RequireDAO.tsx
- /root/bazari/apps/web/src/hooks/blockchain/useDAOMembership.ts
- /root/bazari/apps/web/src/hooks/blockchain/useRefund.ts
- /root/bazari/apps/web/src/hooks/blockchain/usePartialRefund.ts
- /root/bazari/apps/web/src/components/escrow/RefundModal.tsx
- /root/bazari/apps/web/src/components/escrow/PartialRefundModal.tsx
- /root/bazari/apps/web/src/components/escrow/EscrowEventsLog.tsx
- /root/bazari/apps/web/src/app/admin/escrows/page.tsx

**Technical Specs**:
- DAO check: Query pallet-collective.members(), check if user address in array
- Refund: Call api.tx.bazariEscrow.refund(orderId)
- Partial refund: Validate buyerAmount + sellerAmount === amountLocked
- Events: Fetch from /api/orders/:id/escrow-events (backend indexer)

**Testing**:
- Unit: RefundModal.test.tsx, PartialRefundModal.test.tsx
- Integration: AdminEscrowDashboardPage.test.tsx
- Manual: DAO auth, full refund, partial refund (60/40 split)

**References**:
- SPEC: /root/bazari/knowledge/20-blueprints/pallets/bazari-escrow/SPEC.md

When done, test DAO-only access and execute a partial refund (60% buyer, 40% seller).
```

---

**Version**: 1.0
**Last Updated**: 2025-11-14
