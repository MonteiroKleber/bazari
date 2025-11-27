# P0-CRITICAL: Escrow Visualization & Auto-Release Countdown

**Phase**: P0 | **Priority**: CRITICAL | **Effort**: 6 days | **Pallets**: bazari-escrow

---

## Metadata

- **Prompt ID**: P0-02
- **Created**: 2025-11-14
- **Gap**: 30%
- **Blocks**: P1-02 (escrow admin features)
- **Dependencies**: bazari-escrow pallet deployed, orders with escrow locked
- **Team**: 1 frontend developer
- **Skills**: React, TypeScript, Polkadot.js, countdown timers

---

## 1. Context

### 1.1 Problem Statement

The **bazari-escrow** pallet implements payment protection with 7-day auto-release, but the frontend has **30% gap**:

**Missing**:
- ❌ No escrow visualization (amount locked, status, timestamps)
- ❌ No auto-release countdown timer (7 days)
- ❌ No escrow events log (timeline)
- ❌ No early release UI (buyer confirms delivery)
- ❌ No refund UI (DAO only)

**Existing**:
- ⚠️ OrderPage shows txHash but not escrow details
- ⚠️ Status shows "ESCROWED" but no countdown

**User Impact**:
- Buyers don't know when auto-release happens
- No visibility into escrow state
- Cannot trigger early release
- DAO cannot process refunds

### 1.2 Current State

**OrderPage** shows:
- Transaction hashes (txHashIn, txHashRelease, txHashRefund)
- Status badge (ESCROWED, FUNDS_IN, RELEASED, REFUNDED)
- **Does NOT show**: Escrow details, countdown, events log

### 1.3 Target State

**2 New Pages**:
1. `/app/orders/:orderId/escrow` - EscrowManagementPage (buyer view)
2. `/app/admin/escrows` - AdminEscrowDashboard (DAO only)

**4 New Components**:
1. EscrowCard - Display escrow state (amount, status, timestamps)
2. CountdownTimer - 7-day auto-release countdown
3. EscrowEventsLog - Timeline of escrow events
4. EscrowActions - Buttons (early release, request refund)

**4 New Hooks**:
1. `useEscrowDetails(orderId)` - Query escrow state
2. `useReleaseFunds(orderId)` - Mutation: buyer releases early
3. `useRefundBuyer(orderId)` - Mutation: DAO refunds
4. `useEscrowEvents()` - WebSocket: listen to escrow events

---

## 2. Objective

### 2.1 Implementation Goal

Implement complete escrow visualization with auto-release countdown and early release workflow.

### 2.2 Deliverables Checklist

**Pages** (2):
- [ ] EscrowManagementPage (`/app/orders/:orderId/escrow`)
- [ ] AdminEscrowDashboard (`/app/admin/escrows`)

**Components** (4):
- [ ] EscrowCard (amount, status, countdown)
- [ ] CountdownTimer (reusable, 7-day countdown)
- [ ] EscrowEventsLog (timeline)
- [ ] EscrowActions (buttons)

**Hooks** (4):
- [ ] `useEscrowDetails(orderId)`
- [ ] `useReleaseFunds(orderId)`
- [ ] `useRefundBuyer(orderId)`
- [ ] `useEscrowEvents()`

**Tests**:
- [ ] Unit tests for components
- [ ] Unit tests for hooks
- [ ] Integration test: Early release flow
- [ ] Manual test: Auto-release countdown accuracy

---

## 3. Specifications

### 3.1 Pallet Specification

**Escrow Struct**:
```rust
pub struct Escrow<AccountId, Balance, BlockNumber> {
    pub order_id: OrderId,
    pub buyer: AccountId,
    pub seller: AccountId,
    pub amount_locked: Balance,
    pub amount_released: Balance,
    pub status: EscrowStatus,
    pub locked_at: BlockNumber,
    pub updated_at: BlockNumber,
}

pub enum EscrowStatus {
    Locked,
    Released,
    Refunded,
    PartialRefund,
}
```

**Extrinsics**:
- `lock_funds(order_id, amount)` - Lock payment
- `release_funds(order_id)` - Buyer or auto-release
- `refund(order_id)` - DAO only
- `partial_refund(order_id, buyer_amount, seller_amount)` - DAO only

**Auto-Release Logic**:
- 7 days = 7 * 24 * 60 * 60 / 6 = 100,800 blocks (6s block time)
- Triggered automatically if buyer doesn't dispute

**Events**:
- `EscrowLocked(order_id, amount)`
- `FundsReleased(order_id, seller)`
- `Refunded(order_id, buyer, amount)`

**Storage Queries**:
```typescript
api.query.bazariEscrow.escrows(orderId)
```

---

## 4. Implementation Details

### Step 1: Create Hooks

**File**: `apps/web/src/hooks/blockchain/useEscrow.ts`

```typescript
import { useBlockchainQuery, useBlockchainTx } from '@/hooks/useBlockchainQuery';
import { useBlockchainEvent } from '@/hooks/useBlockchainEvent';
import { getApi } from '@/services/polkadot';
import { toast } from 'sonner';

/**
 * Hook: Get escrow details by order ID
 */
export function useEscrowDetails(orderId?: number) {
  return useBlockchainQuery(
    ['escrow', orderId],
    async () => {
      if (!orderId) return null;

      const api = await getApi();
      const escrow = await api.query.bazariEscrow.escrows(orderId);

      if (escrow.isNone) {
        throw new Error('Escrow not found');
      }

      return escrow.unwrap().toJSON();
    },
    {
      enabled: !!orderId && orderId > 0,
      staleTime: 10_000, // 10 seconds
      refetchInterval: 30_000 // Auto-refresh every 30s
    }
  );
}

/**
 * Hook: Release funds early (buyer confirms delivery)
 */
export function useReleaseFunds() {
  const invalidateCache = useInvalidateBlockchainCache();

  return useBlockchainTx(
    async (orderId: number) => {
      const api = await getApi();
      return api.tx.bazariEscrow.releaseFunds(orderId);
    },
    {
      onSuccess: (result, orderId) => {
        toast.success('Funds released to seller! 💰');
        invalidateCache(['escrow', 'order']);
      },
      onError: (error) => {
        toast.error(`Failed to release funds: ${error.message}`);
      }
    }
  );
}

/**
 * Hook: Refund buyer (DAO only)
 */
export function useRefundBuyer() {
  const invalidateCache = useInvalidateBlockchainCache();

  return useBlockchainTx(
    async (orderId: number) => {
      const api = await getApi();
      return api.tx.bazariEscrow.refund(orderId);
    },
    {
      onSuccess: (result, orderId) => {
        toast.success('Refund processed successfully.');
        invalidateCache(['escrow', 'order']);
      },
      onError: (error) => {
        toast.error(`Failed to process refund: ${error.message}`);
      }
    }
  );
}

/**
 * Hook: Listen to escrow events
 */
export function useEscrowEvents() {
  const queryClient = useQueryClient();

  useBlockchainEvent('bazariEscrow', 'FundsReleased', (eventData) => {
    queryClient.invalidateQueries(['blockchain', 'escrow']);
    queryClient.invalidateQueries(['blockchain', 'order']);
    toast.success(`Payment released to seller!`);
  });

  useBlockchainEvent('bazariEscrow', 'Refunded', (eventData) => {
    queryClient.invalidateQueries(['blockchain', 'escrow']);
    toast.info(`Refund processed for Order #${eventData.orderId}`);
  });
}
```

---

### Step 2: Create Components

**Component 1: EscrowCard**

**File**: `apps/web/src/components/escrow/EscrowCard.tsx`

```typescript
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { BlockchainStatusBadge } from '@/components/blockchain/BlockchainStatusBadge';
import { CountdownTimer } from '@/components/blockchain/CountdownTimer';

interface EscrowCardProps {
  escrow: {
    orderId: number;
    buyer: string;
    seller: string;
    amountLocked: number;
    amountReleased: number;
    status: 'Locked' | 'Released' | 'Refunded' | 'PartialRefund';
    lockedAt: number;
    updatedAt: number;
  };
}

export const EscrowCard = ({ escrow }: EscrowCardProps) => {
  const BLOCK_TIME = 6; // 6 seconds per block
  const AUTO_RELEASE_BLOCKS = 100_800; // 7 days
  const autoReleaseTime = escrow.lockedAt + AUTO_RELEASE_BLOCKS * BLOCK_TIME;

  const formatAmount = (amount: number) => {
    return (amount / 1e12).toFixed(2); // 12 decimals
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock size={20} className="text-yellow-600" />
            <h3 className="font-semibold text-lg">Payment Protection</h3>
          </div>
          <BlockchainStatusBadge status={escrow.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Amount Locked */}
        <div className="flex items-center justify-between py-3 px-4 bg-yellow-50 rounded-lg">
          <span className="text-sm text-gray-700">Amount Locked</span>
          <span className="text-xl font-bold text-yellow-600">
            {formatAmount(escrow.amountLocked)} BZR
          </span>
        </div>

        {/* Auto-Release Countdown */}
        {escrow.status === 'Locked' && (
          <div className="border rounded-lg p-4 bg-blue-50">
            <CountdownTimer
              endTime={autoReleaseTime}
              label="Auto-release in"
              showProgress={true}
              startTime={escrow.lockedAt * BLOCK_TIME}
              warningThreshold={86400} // 24 hours
            />
            <p className="text-xs text-gray-600 mt-2">
              Funds will be automatically released to the seller if no dispute is opened.
            </p>
          </div>
        )}

        {/* Released Amount */}
        {escrow.amountReleased > 0 && (
          <div className="flex items-center justify-between py-3 px-4 bg-green-50 rounded-lg">
            <span className="text-sm text-gray-700">Amount Released</span>
            <span className="text-xl font-bold text-green-600">
              {formatAmount(escrow.amountReleased)} BZR
            </span>
          </div>
        )}

        {/* Parties */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Buyer</span>
            <span className="font-mono text-xs">
              {escrow.buyer.slice(0, 6)}...{escrow.buyer.slice(-4)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Seller</span>
            <span className="font-mono text-xs">
              {escrow.seller.slice(0, 6)}...{escrow.seller.slice(-4)}
            </span>
          </div>
        </div>

        {/* Timestamps */}
        <div className="space-y-1 text-xs text-gray-500 border-t pt-2">
          <div className="flex justify-between">
            <span>Locked at</span>
            <span>{new Date(escrow.lockedAt * 1000).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Updated at</span>
            <span>{new Date(escrow.updatedAt * 1000).toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

**Component 2: CountdownTimer** (reusable)

**File**: `apps/web/src/components/blockchain/CountdownTimer.tsx`

```typescript
import { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  endTime: number; // Unix timestamp (seconds)
  label?: string;
  onExpire?: () => void;
  showProgress?: boolean;
  startTime?: number;
  compact?: boolean;
  warningThreshold?: number; // Seconds before warning
  size?: 'sm' | 'md' | 'lg';
}

export const CountdownTimer = ({
  endTime,
  label = 'Time remaining',
  onExpire,
  showProgress = false,
  startTime,
  compact = false,
  warningThreshold = 86400, // 24 hours
  size = 'md'
}: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, endTime - now);

      setTimeLeft(remaining);
      setIsWarning(remaining > 0 && remaining < warningThreshold);

      if (remaining === 0 && onExpire) {
        onExpire();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [endTime, onExpire, warningThreshold]);

  const formatTime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const progress = startTime
    ? ((endTime - timeLeft - startTime) / (endTime - startTime)) * 100
    : 0;

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  if (timeLeft === 0) {
    return (
      <div className="flex items-center gap-2 text-red-600">
        <AlertTriangle size={16} />
        <span className={sizeClasses[size]}>Expired</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex items-center gap-2',
          isWarning ? 'text-orange-600' : 'text-gray-700'
        )}
      >
        <Clock size={16} />
        {!compact && (
          <span className={cn('font-medium', sizeClasses[size])}>
            {label}:
          </span>
        )}
        <span className={cn('font-mono font-bold', sizeClasses[size])}>
          {formatTime(timeLeft)}
        </span>
      </div>

      {showProgress && startTime && (
        <Progress value={progress} className="h-2" />
      )}

      {isWarning && (
        <p className="text-xs text-orange-600">⚠️ Expiring soon!</p>
      )}
    </div>
  );
};
```

**Component 3: EscrowActions**

```typescript
import { Button } from '@/components/ui/button';
import { useReleaseFunds } from '@/hooks/blockchain/useEscrow';
import { useWalletStore } from '@/stores/wallet';

export const EscrowActions = ({ escrow }) => {
  const { selectedAccount } = useWalletStore();
  const { mutate: releaseFunds, isLoading } = useReleaseFunds();

  const isBuyer = selectedAccount?.address === escrow.buyer;
  const canRelease = escrow.status === 'Locked' && isBuyer;

  return (
    <div className="flex gap-2">
      {canRelease && (
        <Button
          onClick={() => releaseFunds(escrow.orderId)}
          disabled={isLoading}
          className="flex-1"
          size="lg"
        >
          {isLoading ? 'Releasing...' : 'Confirm Delivery & Release Payment'}
        </Button>
      )}

      {escrow.status === 'Locked' && (
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            // Navigate to dispute page
            window.location.href = `/app/orders/${escrow.orderId}/dispute`;
          }}
        >
          Request Refund
        </Button>
      )}
    </div>
  );
};
```

**Component 4: EscrowEventsLog** (timeline)

```typescript
import { Card } from '@/components/ui/card';
import { Lock, CheckCircle, XCircle } from 'lucide-react';

export const EscrowEventsLog = ({ orderId }) => {
  // TODO: Fetch events from backend or blockchain
  const events = [
    {
      type: 'EscrowLocked',
      timestamp: Date.now() - 86400000,
      amount: '100.00 BZR',
      txHash: '0x123...'
    },
    {
      type: 'FundsReleased',
      timestamp: Date.now(),
      amount: '100.00 BZR',
      txHash: '0x456...'
    }
  ];

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">Escrow Timeline</h3>
      <div className="space-y-3">
        {events.map((event, idx) => (
          <div key={idx} className="flex items-start gap-3">
            {event.type === 'EscrowLocked' && (
              <Lock size={20} className="text-yellow-600 mt-1" />
            )}
            {event.type === 'FundsReleased' && (
              <CheckCircle size={20} className="text-green-600 mt-1" />
            )}

            <div className="flex-1">
              <p className="font-medium text-sm">{event.type}</p>
              <p className="text-xs text-gray-600">
                {new Date(event.timestamp).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 font-mono">
                TX: {event.txHash}
              </p>
            </div>

            <span className="text-sm font-semibold">{event.amount}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};
```

---

### Step 3: Create Pages

**Page 1: EscrowManagementPage**

**File**: `apps/web/src/pages/orders/EscrowManagementPage.tsx`

```typescript
import { useParams } from 'react-router-dom';
import { useEscrowDetails, useEscrowEvents } from '@/hooks/blockchain/useEscrow';
import { EscrowCard } from '@/components/escrow/EscrowCard';
import { EscrowActions } from '@/components/escrow/EscrowActions';
import { EscrowEventsLog } from '@/components/escrow/EscrowEventsLog';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const EscrowManagementPage = () => {
  const { orderId } = useParams();
  const { data: escrow, isLoading } = useEscrowDetails(Number(orderId));

  // Listen to escrow events (real-time updates)
  useEscrowEvents();

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!escrow) {
    return (
      <div className="container mx-auto p-4">
        <p className="text-center text-gray-500">Escrow not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => window.history.back()}
        className="gap-2"
      >
        <ArrowLeft size={16} />
        Back to Order
      </Button>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Escrow Details</h1>
        <p className="text-gray-600">Order #{escrow.orderId}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Escrow Card */}
        <div className="space-y-4">
          <EscrowCard escrow={escrow} />
          <EscrowActions escrow={escrow} />
        </div>

        {/* Events Log */}
        <EscrowEventsLog orderId={escrow.orderId} />
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">
          How Payment Protection Works
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            • Your payment is locked in escrow until you confirm delivery
          </li>
          <li>
            • Funds are automatically released after 7 days if no dispute
          </li>
          <li>
            • You can release early by clicking "Confirm Delivery"
          </li>
          <li>
            • If there's an issue, you can request a refund (opens dispute)
          </li>
        </ul>
      </div>
    </div>
  );
};
```

**Page 2: AdminEscrowDashboard** (DAO only)

```typescript
// Similar structure with DAO-only refund actions
// Displays all active escrows, refund buttons, partial refund modal
```

---

### Step 4: Routing

```typescript
// App.tsx
<Route path="/app/orders/:orderId/escrow" element={<EscrowManagementPage />} />
<Route path="/app/admin/escrows" element={<AdminEscrowDashboard />} />
```

---

## 5. Acceptance Criteria

**Functional**:
- [ ] Escrow card displays amount, status, timestamps
- [ ] Countdown timer shows accurate time remaining (7 days)
- [ ] Countdown updates every second
- [ ] Warning displays when <24h remaining
- [ ] Buyer can release funds early (Confirm Delivery button)
- [ ] Release transaction submits to blockchain
- [ ] Escrow status updates after release
- [ ] Events log displays timeline
- [ ] DAO can refund (admin page)

**Non-Functional**:
- [ ] Page loads in <2s
- [ ] Countdown accuracy within 1 second
- [ ] Mobile responsive (360px)
- [ ] WCAG 2.1 AA compliant

---

## 6. Testing Checklist

**Unit Tests**:
- [ ] EscrowCard renders correctly
- [ ] CountdownTimer updates every second
- [ ] CountdownTimer shows warning when <24h
- [ ] EscrowActions displays correct buttons
- [ ] Hooks return correct data types

**Integration Tests**:
- [ ] Early release flow: Click button → TX submitted → Status updated
- [ ] Countdown flow: Timer counts down → Expires → onExpire called
- [ ] WebSocket flow: FundsReleased event → Cache invalidated

**Manual Tests**:
- [ ] View escrow page with locked escrow
- [ ] Verify countdown accuracy (compare with blockchain)
- [ ] Release funds early (testnet transaction)
- [ ] Verify status updates to "Released"
- [ ] Test mobile responsive

---

## 7. Dependencies

**Blockchain**:
- [ ] bazari-escrow pallet deployed
- [ ] Orders with escrow locked (test data)

**Backend**:
- [ ] WebSocket: FundsReleased, Refunded events

---

## 8. Prompt for Claude Code

### PROMPT START

Implement **complete escrow visualization** with auto-release countdown and early release workflow.

**Deliverables**:
1. 4 hooks (useEscrowDetails, useReleaseFunds, useRefundBuyer, useEscrowEvents)
2. 4 components (EscrowCard, CountdownTimer, EscrowEventsLog, EscrowActions)
3. 2 pages (EscrowManagementPage, AdminEscrowDashboard)

**Key Features**:
- 7-day auto-release countdown (updates every second)
- Early release button (buyer confirms delivery)
- Escrow state visualization (amount, status, timestamps)
- Real-time updates (WebSocket)

**Blockchain Queries**:
```typescript
api.query.bazariEscrow.escrows(orderId)
```

**Blockchain Mutations**:
```typescript
api.tx.bazariEscrow.releaseFunds(orderId) // Buyer or auto-release
api.tx.bazariEscrow.refund(orderId) // DAO only
```

**Auto-Release Calculation**:
```typescript
const BLOCK_TIME = 6; // 6 seconds
const AUTO_RELEASE_BLOCKS = 100_800; // 7 days
const autoReleaseTime = escrow.lockedAt + AUTO_RELEASE_BLOCKS * BLOCK_TIME;
```

**Create all files, add tests, ensure mobile responsive and accessible.**

### PROMPT END

---

**Document Status**: ✅ Complete
**Created**: 2025-11-14
**Effort**: 6 days
