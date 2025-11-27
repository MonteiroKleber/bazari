# ADENDO: Navigation Integration - Escrow Visualization

**Parent Document**: [02-escrow-visualization.md](02-escrow-visualization.md)
**Created**: 2025-11-15
**Status**: ✅ Complete Navigation Specification
**Priority**: P0-CRITICAL

---

## Purpose

This addendum extends `02-escrow-visualization.md` with complete navigation integration specifications to ensure **impeccable UX** and feature discoverability.

**Why needed**: Original document specifies components/pages but doesn't define how users access them, resulting in "orphaned" features.

---

## 1. Navigation Architecture

### 1.1 Entry Points Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     NAVIGATION MAP                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Entry Point 1: OrderPage                                  │
│  /app/orders/:id                                            │
│      │                                                      │
│      ├─► 🔒 Payment Protection Card (NEW)                  │
│      │      ├─ Amount locked: 100 BZR                      │
│      │      ├─ Countdown: 6d 23h                           │
│      │      └─ [View Escrow Details] ──────┐               │
│      │                                       │               │
│      └─► Order Details (existing)           │               │
│                                              ▼               │
│  Entry Point 2: Dashboard                 EscrowManagement │
│  /app                                      Page             │
│      │                                    /orders/:id/escrow│
│      └─► 🛡️ Admin Escrows Card (DAO only) (NEW)            │
│             └─ [Process Refunds] ────┐                      │
│                                       │                      │
│  Entry Point 3: Wallet (Future)      ▼                      │
│  /app/wallet                      AdminEscrowDashboard      │
│      │                            /app/admin/escrows        │
│      └─► 💰 Locked Funds                                    │
│             └─ [View Escrows] ──────┘                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Navigation Hierarchy

```
App Root (/)
│
├─ App Layout (/app)
│   │
│   ├─ Dashboard (/app)
│   │   └─ Quick Actions Grid
│   │       └─ 🛡️ Admin Escrows Card ← NEW (DAO only)
│   │
│   ├─ Orders
│   │   └─ OrderPage (/app/orders/:id)
│   │       ├─ Order Summary
│   │       ├─ 🔒 Payment Protection Card ← NEW
│   │       │   └─ Link to Escrow Details
│   │       ├─ Delivery Tracking
│   │       └─ Actions
│   │
│   ├─ Escrow (NEW)
│   │   ├─ EscrowManagementPage (/app/orders/:id/escrow) ← NEW
│   │   │   ├─ Breadcrumbs
│   │   │   ├─ Back Button
│   │   │   ├─ EscrowCard
│   │   │   ├─ EscrowActions
│   │   │   └─ EscrowEventsLog
│   │   │
│   │   └─ Wallet Escrows (/app/wallet/escrows) ← FUTURE
│   │
│   └─ Admin (/app/admin)
│       └─ AdminEscrowDashboard (/app/admin/escrows) ← NEW
│           ├─ Pending Refunds Table
│           ├─ Refund Actions
│           └─ Audit Log
│
└─ Header Navigation
    ├─ Primary: Feed, Marketplace, Chat
    └─ Secondary: "Mais" dropdown
        └─ 🛡️ Admin Escrows ← NEW (DAO only)
```

---

## 2. Entry Point Specifications

### 2.1 Entry Point #1: OrderPage Integration

**File**: `apps/web/src/pages/OrderPage.tsx`
**Location**: After "Order Summary", before "Delivery Tracking"
**Priority**: P0-CRITICAL

#### Implementation

```typescript
// Import new component
import { PaymentProtectionCard } from '@/components/escrow/PaymentProtectionCard';
import { Lock } from 'lucide-react';

// Inside OrderPage component, after order summary section:

{/* ═══════════════════════════════════════════════════════ */}
{/*  PAYMENT PROTECTION SECTION - NEW                        */}
{/* ═══════════════════════════════════════════════════════ */}

{hasActiveEscrow(order) && (
  <section className="mb-6">
    <PaymentProtectionCard
      orderId={order.id}
      amountLocked={getEscrowAmount(order)}
      lockedAt={getEscrowLockedAt(order)}
      status={getEscrowStatus(order)}
      onViewDetails={() => navigate(`/app/orders/${order.id}/escrow`)}
    />
  </section>
)}

{/* Helper functions */}
const hasActiveEscrow = (order: Order) => {
  return order.paymentIntents?.some(
    pi => pi.status === 'ESCROWED' || pi.status === 'FUNDS_IN'
  );
};

const getEscrowAmount = (order: Order) => {
  const intent = order.paymentIntents?.find(
    pi => pi.status === 'ESCROWED' || pi.status === 'FUNDS_IN'
  );
  return intent?.amountBzr || '0';
};

const getEscrowLockedAt = (order: Order) => {
  // Parse from escrowLogs or payment intent
  const log = order.escrowLogs?.find(log => log.kind === 'FUNDS_IN');
  return log?.createdAt || order.createdAt;
};

const getEscrowStatus = (order: Order) => {
  const intent = order.paymentIntents?.[0];
  return intent?.status || 'UNKNOWN';
};
```

#### New Component: PaymentProtectionCard

**File**: `apps/web/src/components/escrow/PaymentProtectionCard.tsx`

```typescript
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Clock, Shield } from 'lucide-react';
import { CountdownTimer } from '@/components/blockchain/CountdownTimer';

interface PaymentProtectionCardProps {
  orderId: string;
  amountLocked: string;
  lockedAt: string; // ISO timestamp
  status: string;
  onViewDetails: () => void;
}

export const PaymentProtectionCard = ({
  orderId,
  amountLocked,
  lockedAt,
  status,
  onViewDetails
}: PaymentProtectionCardProps) => {
  const BLOCK_TIME = 6; // 6 seconds
  const AUTO_RELEASE_BLOCKS = 100_800; // 7 days

  const lockedAtTimestamp = new Date(lockedAt).getTime() / 1000;
  const autoReleaseTime = lockedAtTimestamp + (AUTO_RELEASE_BLOCKS * BLOCK_TIME);

  const formatAmount = (amount: string) => {
    return (parseFloat(amount) / 1e12).toFixed(2);
  };

  return (
    <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-yellow-100 rounded-full">
              <Lock className="text-yellow-600" size={20} />
            </div>
            <div>
              <CardTitle className="text-lg">Payment Protection</CardTitle>
              <p className="text-xs text-gray-600 mt-1">
                Your funds are safe in escrow
              </p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="bg-yellow-100 text-yellow-700 border-yellow-300"
          >
            <Shield size={12} className="mr-1" />
            Protected
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Amount Locked */}
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-200">
          <span className="text-sm text-gray-700 font-medium">
            Amount Locked
          </span>
          <span className="text-2xl font-bold text-yellow-600">
            {formatAmount(amountLocked)} BZR
          </span>
        </div>

        {/* Countdown */}
        {status === 'ESCROWED' && (
          <div className="p-3 bg-white rounded-lg border border-blue-200">
            <CountdownTimer
              endTime={autoReleaseTime}
              label="Auto-release in"
              showProgress={false}
              compact={true}
              size="sm"
              warningThreshold={86400} // 24 hours
            />
            <p className="text-xs text-gray-500 mt-2">
              Funds will be automatically released to the seller after 7 days
            </p>
          </div>
        )}

        {/* CTA Button */}
        <Button
          onClick={onViewDetails}
          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
          size="lg"
        >
          <Lock size={16} className="mr-2" />
          View Escrow Details & Actions
        </Button>

        {/* Info Text */}
        <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded p-3">
          <strong>💡 How it works:</strong>
          <ul className="mt-1 space-y-1 ml-4 list-disc">
            <li>Payment is locked until you confirm delivery</li>
            <li>You can release early or request a refund</li>
            <li>Fully protected by blockchain smart contract</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
```

#### Visual Design

```
┌────────────────────────────────────────────────────────┐
│  🔒 Payment Protection        [🛡️ Protected]          │
│  Your funds are safe in escrow                         │
├────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │  Amount Locked              100.00 BZR           │ │
│  └──────────────────────────────────────────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │  ⏱️ Auto-release in: 6 days 23 hours 45 minutes │ │
│  │  Funds will be automatically released...         │ │
│  └──────────────────────────────────────────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │  🔒 View Escrow Details & Actions                │ │
│  └──────────────────────────────────────────────────┘ │
│                                                         │
│  💡 How it works:                                      │
│  • Payment is locked until you confirm delivery        │
│  • You can release early or request a refund          │
│  • Fully protected by blockchain smart contract       │
└────────────────────────────────────────────────────────┘
```

---

### 2.2 Entry Point #2: Dashboard Integration (Admin)

**File**: `apps/web/src/components/dashboard/QuickActionsGrid.tsx`
**Location**: In `QUICK_ACTIONS` array
**Priority**: P1-HIGH

#### Implementation

```typescript
// Add import
import { Shield } from 'lucide-react';

// Add to QUICK_ACTIONS array (after Governança, before Vesting)
export function QuickActionsGrid() {
  const { profile: deliveryProfile } = useDeliveryProfile();

  // ✅ NEW: Check if user is DAO member
  const { data: profile } = useProfile();
  const isDAOMember = profile?.roles?.includes('DAO_MEMBER') || false;

  // Base actions
  const baseActions: QuickAction[] = [
    // ... existing actions (Feed, Rewards, Chat, etc.)

    {
      icon: <Vote className="h-6 w-6" />,
      label: 'Governança',
      to: '/app/governance',
      description: 'Propostas e votações',
      color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    },

    // ✅ NEW: Admin Escrows (DAO only)
    ...(isDAOMember ? [{
      icon: <Shield className="h-6 w-6" />,
      label: 'Admin Escrows',
      to: '/app/admin/escrows',
      description: 'Processar refunds (DAO)',
      color: 'bg-red-500/10 text-red-600 dark:text-red-400',
      badge: undefined, // TODO: Fetch pending refund count
    }] : []),

    {
      icon: <TrendingUp className="h-6 w-6" />,
      label: 'Vesting',
      to: '/vesting',
      description: 'Liberação de tokens BZR',
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
  ];

  // Add delivery action (existing logic)
  const allActions = deliveryAction
    ? [...baseActions, deliveryAction]
    : baseActions;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {allActions.map((action) => (
        // ... existing render logic
      ))}
    </div>
  );
}
```

#### Visual Design

```
Dashboard - Ações Rápidas
┌──────────┬──────────┬──────────┬──────────┐
│ Feed     │ Rewards  │ Chat     │ Analytics│
├──────────┼──────────┼──────────┼──────────┤
│ Wallet   │ Descobrir│ Lojas    │ Afiliações│
├──────────┼──────────┼──────────┼──────────┤
│ P2P      │ Marketplace│ Governança│ Vesting │
├──────────┼──────────┼──────────┼──────────┤
│ 🛡️      │ Entregas │          │          │
│ Admin    │          │          │          │
│ Escrows  │          │          │          │ ← NEW (DAO only)
│ [3]      │          │          │          │ ← Badge
└──────────┴──────────┴──────────┴──────────┘
```

---

### 2.3 Entry Point #3: Header Dropdown Integration (Admin)

**File**: `apps/web/src/components/AppHeader.tsx`
**Location**: In `secondaryNavLinks` array
**Priority**: P2-MEDIUM

#### Implementation

```typescript
// Inside AppHeader component

// Fetch user profile and check DAO role
const [isDAOMember, setIsDAOMember] = React.useState(false);

React.useEffect(() => {
  (async () => {
    try {
      const res = await apiHelpers.getMeProfile();
      const hasDAORole = res.profile?.roles?.includes('DAO_MEMBER') || false;
      setIsDAOMember(hasDAORole);
    } catch (error) {
      setIsDAOMember(false);
    }
  })();
}, []);

// Secondary navigation - accessed via dropdown "Mais"
const secondaryNavLinks = [
  { to: '/app', label: t('nav.dashboard', { defaultValue: 'Dashboard' }), checkActive: () => isActive('/app') && /* ... */ },
  { to: '/app/sellers', label: t('nav.myStores', { defaultValue: 'Minhas Lojas' }), checkActive: () => isActive('/app/sellers') || isActive('/app/seller') },
  { to: '/app/wallet', label: t('nav.wallet', { defaultValue: 'Wallet' }), checkActive: () => isActive('/app/wallet') },
  { to: '/app/p2p', label: t('nav.p2p', { defaultValue: 'P2P' }), checkActive: () => isActive('/app/p2p') },

  // ✅ NEW: Admin Escrows (DAO only)
  ...(isDAOMember ? [{
    to: '/app/admin/escrows',
    label: t('nav.adminEscrows', { defaultValue: 'Admin Escrows' }),
    checkActive: () => isActive('/app/admin/escrows')
  }] : [])
];
```

#### Visual Design

```
Header → "Mais" Dropdown
┌────────────────────────┐
│ Dashboard              │
│ Minhas Lojas           │
│ Wallet                 │
│ P2P                    │
│ ────────────────────── │
│ 🛡️ Admin Escrows [3]  │ ← NEW (DAO only, with badge)
└────────────────────────┘
```

---

### 2.4 Entry Point #4: Wallet Integration (Future)

**File**: `apps/web/src/pages/WalletPage.tsx` (future)
**Priority**: P3-LOW

#### Specification

```typescript
// NEW Section: Locked Funds
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Lock size={20} />
      Locked in Escrow
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-gray-600">Active Escrows</span>
        <Badge variant="secondary">{activeEscrowCount}</Badge>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-700">Total Locked</span>
        <span className="text-2xl font-bold text-yellow-600">
          {totalLockedBZR} BZR
        </span>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => navigate('/app/wallet/escrows')}
      >
        View All Escrows →
      </Button>
    </div>
  </CardContent>
</Card>
```

---

## 3. Breadcrumbs & Navigation Context

### 3.1 Breadcrumbs Component

**File**: `apps/web/src/components/escrow/EscrowBreadcrumbs.tsx`

```typescript
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface EscrowBreadcrumbsProps {
  orderId: string;
  currentPage: 'details' | 'admin';
}

export const EscrowBreadcrumbs = ({ orderId, currentPage }: EscrowBreadcrumbsProps) => {
  const items: BreadcrumbItem[] = currentPage === 'details'
    ? [
        { label: 'Home', to: '/app' },
        { label: 'My Orders', to: '/app/orders' },
        { label: `Order #${orderId}`, to: `/app/orders/${orderId}` },
        { label: 'Escrow Details' }
      ]
    : [
        { label: 'Home', to: '/app' },
        { label: 'Admin', to: '/app/admin' },
        { label: 'Escrow Management' }
      ];

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
      <Home size={14} />
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          <ChevronRight size={14} className="mx-2" />
          {item.to ? (
            <Link to={item.to} className="hover:text-blue-600 transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
};
```

### 3.2 Usage in EscrowManagementPage

```typescript
export const EscrowManagementPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { data: escrow, isLoading } = useEscrowDetails(Number(orderId));

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* ✅ Breadcrumbs */}
      <EscrowBreadcrumbs orderId={orderId!} currentPage="details" />

      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate(`/app/orders/${orderId}`)}
        className="gap-2"
      >
        <ArrowLeft size={16} />
        Back to Order
      </Button>

      {/* Rest of page */}
      {/* ... */}
    </div>
  );
};
```

---

## 4. User Flows

### 4.1 Flow: Buyer Confirms Delivery (Early Release)

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: User views order                                   │
│  Page: /app/orders/123                                      │
├─────────────────────────────────────────────────────────────┤
│  User sees:                                                 │
│  • Order Summary: 100 BZR total                             │
│  • Payment Protection Card:                                 │
│    - 💰 100 BZR locked                                      │
│    - ⏱️ Auto-release: 6d 23h                               │
│    - [View Escrow Details] ← User clicks                    │
└─────────────────────────────────────────────────────────────┘
                        ↓ navigate('/app/orders/123/escrow')
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Escrow details page                                │
│  Page: /app/orders/123/escrow                               │
├─────────────────────────────────────────────────────────────┤
│  User sees:                                                 │
│  • Breadcrumbs: Home > Orders > Order #123 > Escrow         │
│  • [◀ Back to Order]                                        │
│  • EscrowCard:                                              │
│    - 💰 100 BZR locked                                      │
│    - ⏱️ Countdown: 6d 23h 45m 12s                          │
│    - [████████░░] 80% progress                              │
│    - ⚠️ Less than 24h warning (if applicable)              │
│  • EscrowActions:                                           │
│    - [✅ Confirm Delivery & Release Payment] ← User clicks  │
│    - [⚠️ Request Refund]                                    │
│  • EscrowEventsLog (timeline)                               │
└─────────────────────────────────────────────────────────────┘
                        ↓ onClick: releaseFunds(123)
┌─────────────────────────────────────────────────────────────┐
│  Step 3: Wallet confirmation                                │
│  Component: Polkadot.js Extension Popup                     │
├─────────────────────────────────────────────────────────────┤
│  Sign Transaction:                                          │
│  bazariEscrow.releaseFunds(123)                             │
│                                                              │
│  Gas Fee: 0.001 BZR                                         │
│                                                              │
│  [Reject]  [Sign & Submit] ← User signs                     │
└─────────────────────────────────────────────────────────────┘
                        ↓ Transaction submitted
┌─────────────────────────────────────────────────────────────┐
│  Step 4: Success feedback                                   │
│  Component: Toast notification                              │
├─────────────────────────────────────────────────────────────┤
│  ✅ Funds released to seller! 💰                            │
│                                                              │
│  TX: 0x1234...5678 (View on Explorer)                       │
└─────────────────────────────────────────────────────────────┘
                        ↓ Auto-navigate
┌─────────────────────────────────────────────────────────────┐
│  Step 5: Updated order page                                 │
│  Page: /app/orders/123                                      │
├─────────────────────────────────────────────────────────────┤
│  User sees:                                                 │
│  • Status: RELEASED (green badge)                           │
│  • Payment Protection Card removed (or shows "Released")    │
│  • Timeline updated with release event                      │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Flow: DAO Processes Refund

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: DAO member sees pending refunds                    │
│  Page: /app (Dashboard)                                     │
├─────────────────────────────────────────────────────────────┤
│  Quick Actions Grid:                                        │
│  • [🛡️ Admin Escrows] ← Shows badge [3]                    │
│    "Process refunds (DAO)"                                  │
│                                                              │
│  User clicks card ───────────────────────────────────────┐  │
└──────────────────────────────────────────────────────────┼──┘
                                                            │
            ↓ navigate('/app/admin/escrows')                │
┌───────────────────────────────────────────────────────────┼─┐
│  Step 2: Admin Escrow Dashboard                           │ │
│  Page: /app/admin/escrows                                 │ │
├───────────────────────────────────────────────────────────┼─┤
│  Header:                                                  │ │
│  • Breadcrumbs: Home > Admin > Escrow Management          │ │
│  • Title: "Escrow Management (DAO)"                       │ │
│                                                           │ │
│  Pending Refund Requests Table:                           │ │
│  ┌─────┬────────┬────────┬─────────────┬─────────────┐   │ │
│  │ ID  │ Buyer  │ Amount │ Reason      │ Actions     │   │ │
│  ├─────┼────────┼────────┼─────────────┼─────────────┤   │ │
│  │ 123 │ 5FHne  │ 100 BZR│ Not received│ [Process]   │←──┘ │
│  │     │ ...LP  │        │             │ [Reject]    │   │
│  ├─────┼────────┼────────┼─────────────┼─────────────┤   │
│  │ 124 │ 5Gw3s  │ 50 BZR │ Damaged     │ [Process]   │   │
│  │     │ ...3F  │        │             │ [Reject]    │   │
│  └─────┴────────┴────────┴─────────────┴─────────────┘   │
│                                                           │
│  User clicks [Process] ────────────────────────────────┐  │
└────────────────────────────────────────────────────────┼──┘
                                                         │
                        ↓ Opens modal                    │
┌────────────────────────────────────────────────────────┼──┐
│  Step 3: Confirmation modal                            │  │
│  Component: RefundConfirmationModal                    │  │
├────────────────────────────────────────────────────────┼──┤
│  ⚠️  Process Refund?                                   │  │
│                                                        │  │
│  Order #123                                            │  │
│  Buyer: 5FHne...xLHpP                                  │  │
│  Amount: 100 BZR                                       │  │
│  Reason: Item not received                             │  │
│                                                        │  │
│  Action: Full refund to buyer                          │  │
│                                                        │  │
│  [Cancel]  [Confirm Refund] ← User clicks ─────────────┘  │
└───────────────────────────────────────────────────────────┘
                        ↓ onClick: refundBuyer(123)
┌─────────────────────────────────────────────────────────────┐
│  Step 4: Wallet confirmation (DAO key)                      │
│  Component: Polkadot.js Extension Popup                     │
├─────────────────────────────────────────────────────────────┤
│  Sign Transaction:                                          │
│  bazariEscrow.refund(123)                                   │
│                                                              │
│  Caller: DAO Collective Account                             │
│  Gas Fee: 0.002 BZR (DAO pays)                              │
│                                                              │
│  [Reject]  [Sign & Submit] ← DAO member signs               │
└─────────────────────────────────────────────────────────────┘
                        ↓ Transaction submitted
┌─────────────────────────────────────────────────────────────┐
│  Step 5: Success feedback                                   │
│  Component: Toast notification                              │
├─────────────────────────────────────────────────────────────┤
│  ✅ Refund processed successfully                           │
│                                                              │
│  Order #123: 100 BZR refunded to buyer                      │
│  TX: 0xabcd...ef90                                          │
└─────────────────────────────────────────────────────────────┘
                        ↓ Table refreshes
┌─────────────────────────────────────────────────────────────┐
│  Step 6: Updated admin dashboard                            │
│  Page: /app/admin/escrows                                   │
├─────────────────────────────────────────────────────────────┤
│  Pending Refund Requests Table:                             │
│  ┌─────┬────────┬────────┬─────────────┬─────────────┐     │
│  │ ID  │ Buyer  │ Amount │ Reason      │ Actions     │     │
│  ├─────┼────────┼────────┼─────────────┼─────────────┤     │
│  │ 124 │ 5Gw3s  │ 50 BZR │ Damaged     │ [Process]   │     │
│  │     │ ...3F  │        │             │ [Reject]    │     │
│  └─────┴────────┴────────┴─────────────┴─────────────┘     │
│                                                              │
│  Order #123 moved to "Processed Refunds" tab                │
│  Badge updated: [3] → [2]                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Mobile Navigation Patterns

### 5.1 Mobile OrderPage

**Viewport**: 360px - 768px

```
┌───────────────────────────┐
│ [◀] Order #123            │
├───────────────────────────┤
│                           │
│ Order Summary             │
│ • Total: 100 BZR          │
│ • Status: ESCROWED        │
│                           │
├───────────────────────────┤
│                           │
│ 🔒 Payment Protection     │
│                           │
│ 💰 100 BZR locked         │
│ ⏱️ 6d 23h                │
│                           │
│ ┌───────────────────────┐ │
│ │ View Details →        │ │ ← Full width button
│ └───────────────────────┘ │
│                           │
├───────────────────────────┤
│                           │
│ Delivery Tracking         │
│ ...                       │
│                           │
└───────────────────────────┘
```

### 5.2 Mobile EscrowManagementPage

```
┌───────────────────────────┐
│ [◀] Back  Escrow Details  │
├───────────────────────────┤
│                           │
│ 🔒 Payment Protection     │
│                           │
│ Amount Locked             │
│ 💰 100.00 BZR             │
│                           │
│ ⏱️ Auto-release:          │
│ 6 days 23 hours           │
│ [████████░░] 80%          │
│                           │
│ Buyer: 5FHne...LP         │
│ Seller: 5Gw3s...3F        │
│                           │
├───────────────────────────┤
│                           │
│ ┌───────────────────────┐ │
│ │ ✅ Confirm Delivery   │ │ ← Stack vertical
│ └───────────────────────┘ │
│ ┌───────────────────────┐ │
│ │ ⚠️ Request Refund     │ │
│ └───────────────────────┘ │
│                           │
├───────────────────────────┤
│                           │
│ Escrow Timeline           │
│                           │
│ 🔒 Locked                 │
│ Nov 8, 2:30 PM            │
│                           │
│ 📦 Shipped                │
│ Nov 9, 4:15 PM            │
│                           │
│ ✅ Delivered              │
│ Nov 10, 1:00 PM           │
│                           │
└───────────────────────────┘
```

### 5.3 Mobile Hamburger Menu

```
☰ Menu
├─ Dashboard
├─ Feed
├─ Marketplace
├─ Chat
├─ Wallet
├─ My Orders ←───────┐
│   └─ Active Orders  │
│   └─ Past Orders    │
├─ Settings          │
└─ More ▼            │
    ├─ Analytics     │
    ├─ Governance    │
    └─ 🛡️ Admin Escrows ← NEW (DAO only)
```

---

## 6. Permissions & Access Control

### 6.1 Role-Based Access

```typescript
// Utility function to check DAO membership
export const useIsDAOMember = () => {
  const { data: profile } = useProfile();
  return React.useMemo(() => {
    return profile?.roles?.includes('DAO_MEMBER') || false;
  }, [profile]);
};

// Usage in components
export const QuickActionsGrid = () => {
  const isDAOMember = useIsDAOMember();

  const adminActions = isDAOMember ? [{
    icon: <Shield />,
    label: 'Admin Escrows',
    to: '/app/admin/escrows',
    // ...
  }] : [];

  // ...
};
```

### 6.2 Route Protection

```typescript
// App.tsx - Protected route for admin
<Route
  path="/app/admin/escrows"
  element={
    <ProtectedRoute requiredRole="DAO_MEMBER">
      <AdminEscrowDashboard />
    </ProtectedRoute>
  }
/>

// ProtectedRoute component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { data: profile } = useProfile();
  const hasRole = profile?.roles?.includes(requiredRole);

  if (!hasRole) {
    return <Navigate to="/app" replace />;
  }

  return children;
};
```

### 6.3 Conditional Rendering

```typescript
// In EscrowActions component
export const EscrowActions = ({ escrow }) => {
  const { selectedAccount } = useWalletStore();
  const isDAOMember = useIsDAOMember();

  const isBuyer = selectedAccount?.address === escrow.buyer;
  const isSeller = selectedAccount?.address === escrow.seller;

  // Buyer actions
  if (isBuyer && escrow.status === 'Locked') {
    return (
      <>
        <Button onClick={handleRelease}>
          ✅ Confirm Delivery
        </Button>
        <Button variant="outline" onClick={handleRequestRefund}>
          ⚠️ Request Refund
        </Button>
      </>
    );
  }

  // Seller view (read-only)
  if (isSeller) {
    return (
      <div className="text-center text-gray-600">
        ℹ️ Waiting for buyer confirmation or auto-release
      </div>
    );
  }

  // DAO actions (override buyer/seller if dispute)
  if (isDAOMember && escrow.status === 'Disputed') {
    return (
      <>
        <Button onClick={handleRefund}>
          💸 Process Refund
        </Button>
        <Button variant="outline" onClick={handlePartialRefund}>
          ⚖️ Partial Refund
        </Button>
      </>
    );
  }

  // Other users (no actions)
  return (
    <div className="text-center text-gray-500">
      ℹ️ You are not a party to this escrow
    </div>
  );
};
```

---

## 7. Deep Linking & URL Structure

### 7.1 URL Schema

```
/app/orders/:orderId/escrow
│    │      │         │
│    │      │         └─ Feature: escrow details
│    │      └─────────── Dynamic: order ID
│    └────────────────── Scope: orders
└─────────────────────── App root

Example: /app/orders/123/escrow
```

### 7.2 Shareable Links

Users can bookmark or share direct links:

```
✅ Valid URLs:
- https://bazari.libervia.xyz/app/orders/123/escrow
- https://bazari.libervia.xyz/app/admin/escrows
- https://bazari.libervia.xyz/app/orders/123/escrow?tab=timeline

❌ Redirect if unauthorized:
- Non-buyer/seller accessing /app/orders/123/escrow → /app
- Non-DAO accessing /app/admin/escrows → /app
```

### 7.3 Query Parameters (Optional)

```typescript
// /app/orders/123/escrow?tab=timeline
const searchParams = useSearchParams();
const activeTab = searchParams.get('tab') || 'details';

// Tabs:
// - details (default)
// - timeline
// - actions
```

---

## 8. Notifications & Alerts

### 8.1 Countdown Warnings

**Trigger**: Escrow expiring in <24h

```typescript
// In EscrowCard or dedicated notification service
useEffect(() => {
  if (timeLeft < 86400 && timeLeft > 0) {
    toast.warning('⏰ Escrow expiring in less than 24 hours!', {
      description: `Order #${orderId}: Auto-release soon`,
      action: {
        label: 'View Details',
        onClick: () => navigate(`/app/orders/${orderId}/escrow`)
      },
      duration: Infinity, // Stays until dismissed
    });
  }
}, [timeLeft]);
```

### 8.2 Push Notifications (Future)

**Triggers**:
- Escrow locked (buyer)
- Countdown <24h (buyer)
- Countdown <1h (buyer)
- Auto-release triggered (buyer & seller)
- Refund request submitted (DAO)
- Refund processed (buyer)

**Example**:
```typescript
// Service worker notification
self.registration.showNotification('Escrow Expiring Soon', {
  body: 'Order #123: Auto-release in 45 minutes',
  icon: '/icons/escrow-warning.png',
  badge: '/icons/badge.png',
  data: { orderId: 123, action: 'view-escrow' },
  actions: [
    { action: 'view', title: 'View Details' },
    { action: 'release', title: 'Release Now' }
  ]
});
```

---

## 9. Analytics & Tracking

### 9.1 Navigation Events

Track user navigation patterns:

```typescript
// In PaymentProtectionCard
onClick={() => {
  // Analytics event
  analytics.track('escrow_details_viewed', {
    orderId: orderId,
    source: 'order_page_card',
    amount: amountLocked,
    timeRemaining: autoReleaseTime - Date.now()
  });

  navigate(`/app/orders/${orderId}/escrow`);
}}
```

### 9.2 Conversion Funnel

Track escrow interaction funnel:

```
1. Order Page Viewed
2. Payment Protection Card Seen
3. Escrow Details Clicked
4. Escrow Page Viewed
5. Action Button Clicked (Release/Refund)
6. Transaction Signed
7. Transaction Confirmed
```

### 9.3 Key Metrics

```typescript
// Track these metrics:
- Escrow details page views
- Early release rate (% of escrows released before 7 days)
- Average time to early release
- Refund request rate
- DAO refund processing time
- Navigation drop-off points
```

---

## 10. Accessibility (a11y)

### 10.1 Keyboard Navigation

```typescript
// EscrowActions component
<div role="group" aria-label="Escrow actions">
  <Button
    onClick={handleRelease}
    aria-label="Confirm delivery and release payment to seller"
    tabIndex={0}
  >
    ✅ Confirm Delivery
  </Button>

  <Button
    onClick={handleRefund}
    aria-label="Request refund and open dispute"
    tabIndex={0}
  >
    ⚠️ Request Refund
  </Button>
</div>
```

### 10.2 Screen Reader Support

```typescript
// CountdownTimer component
<div
  role="timer"
  aria-live="polite"
  aria-atomic="true"
  aria-label={`Auto-release countdown: ${formatTime(timeLeft)}`}
>
  <Clock aria-hidden="true" />
  <span className="sr-only">Auto-release in:</span>
  <span aria-label={formatTimeForScreenReader(timeLeft)}>
    {formatTime(timeLeft)}
  </span>
</div>

// formatTimeForScreenReader helper
const formatTimeForScreenReader = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return `${days} days, ${hours} hours, and ${minutes} minutes`;
};
```

### 10.3 Focus Management

```typescript
// When navigating to Escrow page, focus header
const headerRef = useRef<HTMLHeadingElement>(null);

useEffect(() => {
  headerRef.current?.focus();
}, []);

return (
  <h1
    ref={headerRef}
    tabIndex={-1}
    className="text-3xl font-bold outline-none"
  >
    Escrow Details
  </h1>
);
```

---

## 11. Error Handling & Edge Cases

### 11.1 Escrow Not Found

```typescript
// EscrowManagementPage
if (!isLoading && !escrow) {
  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-md mx-auto text-center p-8">
        <AlertCircle size={48} className="mx-auto text-orange-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Escrow Not Found</h2>
        <p className="text-gray-600 mb-4">
          This order may not have an active escrow, or the escrow ID is invalid.
        </p>
        <Button onClick={() => navigate('/app/orders')}>
          View All Orders
        </Button>
      </Card>
    </div>
  );
}
```

### 11.2 Blockchain Query Failures

```typescript
// useEscrowDetails hook
export function useEscrowDetails(orderId?: number) {
  return useBlockchainQuery(
    ['escrow', orderId],
    async () => {
      // ... fetch logic
    },
    {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      onError: (error) => {
        toast.error('Failed to load escrow details', {
          description: 'Please try again or contact support if the issue persists.',
          action: {
            label: 'Retry',
            onClick: () => queryClient.invalidateQueries(['escrow', orderId])
          }
        });
      }
    }
  );
}
```

### 11.3 Unauthorized Access

```typescript
// In EscrowManagementPage
const { selectedAccount } = useWalletStore();
const isAuthorized = selectedAccount?.address === escrow.buyer ||
                     selectedAccount?.address === escrow.seller ||
                     isDAOMember;

if (!isAuthorized) {
  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-md mx-auto text-center p-8 bg-red-50 border-red-200">
        <ShieldAlert size={48} className="mx-auto text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-gray-700 mb-4">
          You are not authorized to view this escrow. Only the buyer, seller, or DAO members can access this page.
        </p>
        <Button onClick={() => navigate('/app')}>
          Return to Dashboard
        </Button>
      </Card>
    </div>
  );
}
```

---

## 12. Testing Checklist

### 12.1 Navigation Tests

- [ ] **OrderPage → EscrowPage**
  - [ ] "View Escrow Details" button navigates correctly
  - [ ] URL updates to `/app/orders/:id/escrow`
  - [ ] Back button returns to OrderPage
  - [ ] Breadcrumbs are correct

- [ ] **Dashboard → AdminEscrowDashboard** (DAO)
  - [ ] Admin Escrows card visible for DAO members
  - [ ] Admin Escrows card hidden for non-DAO
  - [ ] Badge shows correct pending count
  - [ ] Card navigates to `/app/admin/escrows`

- [ ] **Header → AdminEscrowDashboard** (DAO)
  - [ ] "Admin Escrows" appears in dropdown (DAO only)
  - [ ] Link navigates correctly
  - [ ] Active state highlights correctly

### 12.2 Permissions Tests

- [ ] **Buyer Access**
  - [ ] Can view their order's escrow page
  - [ ] Can click "Confirm Delivery" button
  - [ ] Can click "Request Refund" button
  - [ ] Cannot view other users' escrows

- [ ] **Seller Access**
  - [ ] Can view escrow page (read-only)
  - [ ] Cannot click action buttons
  - [ ] Sees "Waiting for buyer" message

- [ ] **DAO Access**
  - [ ] Sees Admin Escrows card in dashboard
  - [ ] Can access `/app/admin/escrows`
  - [ ] Can process refunds
  - [ ] Can view all escrows

- [ ] **Unauthorized Access**
  - [ ] Non-DAO redirected from `/app/admin/escrows`
  - [ ] Non-party sees "Access Denied" message
  - [ ] Direct URL access blocked for unauthorized

### 12.3 Mobile Tests

- [ ] Payment Protection Card responsive (360px)
- [ ] Buttons min-height 44px (touch target)
- [ ] Countdown readable on small screens
- [ ] Hamburger menu includes Admin Escrows (DAO)
- [ ] All CTAs accessible via touch

### 12.4 Edge Case Tests

- [ ] Order without escrow (card hidden)
- [ ] Expired escrow (shows "Expired")
- [ ] Released escrow (updated status)
- [ ] Refunded escrow (updated status)
- [ ] Blockchain query failure (error handling)
- [ ] Slow network (loading states)

---

## 13. Documentation Updates

### 13.1 User Guide Additions

**New Section**: "Understanding Payment Protection"

```markdown
## Payment Protection (Escrow)

When you purchase an item on Bazari, your payment is protected through our blockchain-based escrow system.

### How It Works

1. **Payment Locked**: Your BZR tokens are locked in a secure smart contract
2. **7-Day Protection**: Funds are held for up to 7 days
3. **Automatic Release**: If no issues, funds release to seller after 7 days
4. **Early Release**: You can release funds early once you confirm delivery
5. **Dispute Resolution**: You can request a refund if there's a problem

### Viewing Your Escrow

1. Go to "My Orders"
2. Click on the order
3. Scroll to "Payment Protection" card
4. Click "View Escrow Details"

### Confirming Delivery

1. View your order's escrow details
2. Click "Confirm Delivery & Release Payment"
3. Sign the transaction in your wallet

### Requesting a Refund

1. View your order's escrow details
2. Click "Request Refund"
3. Fill out the dispute form
4. DAO will review and process
```

### 13.2 Developer Guide Additions

**New Section**: "Escrow Navigation Implementation"

```markdown
## Implementing Escrow Navigation

### Quick Start

1. Add PaymentProtectionCard to OrderPage:
   ```typescript
   import { PaymentProtectionCard } from '@/components/escrow/PaymentProtectionCard';

   {hasActiveEscrow(order) && (
     <PaymentProtectionCard
       orderId={order.id}
       amountLocked={getEscrowAmount(order)}
       // ...
     />
   )}
   ```

2. Add route in App.tsx:
   ```typescript
   <Route path="/app/orders/:id/escrow" element={<EscrowManagementPage />} />
   ```

3. Add DAO admin card (conditional):
   ```typescript
   {isDAOMember && {
     icon: <Shield />,
     label: 'Admin Escrows',
     to: '/app/admin/escrows',
     // ...
   }}
   ```

### Navigation Patterns

- Always use navigate() instead of window.location
- Include breadcrumbs for context
- Provide back buttons for sub-pages
- Check permissions before rendering links
```

---

## 14. Migration Plan

### 14.1 Incremental Rollout

**Phase 1: Soft Launch (1 week)**
- Deploy PaymentProtectionCard to OrderPage
- Enable for 10% of users (A/B test)
- Track: click-through rate, user feedback

**Phase 2: Feature Complete (2 weeks)**
- Enable for all users
- Deploy EscrowManagementPage
- Deploy Admin dashboard (DAO only)

**Phase 3: Optimization (ongoing)**
- Add push notifications
- Add Wallet integration
- Performance tuning

### 14.2 Backward Compatibility

- Existing OrderPage unaffected
- Old URLs still work
- No breaking changes to Order API
- Graceful degradation if blockchain unavailable

---

## 15. Success Metrics

### 15.1 KPIs

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Escrow page views | 0 | 1000/week | Analytics |
| Early release rate | 0% | 20% | Blockchain events |
| Admin refund time | Manual | <1 hour | Timestamp diff |
| User satisfaction | N/A | 4.5/5 | Surveys |
| Feature discovery | 0% | 80% | User tests |

### 15.2 Success Criteria

✅ **Must Have**:
- [ ] 80% of users can find escrow details in <2 clicks
- [ ] 0 complaints about "hidden" escrow feature
- [ ] 100% of DAO members use admin dashboard (vs Polkadot.js)
- [ ] <2s page load time for Escrow pages

✅ **Nice to Have**:
- [ ] 30% early release rate (faster seller payments)
- [ ] <30min average DAO refund processing time
- [ ] Push notification open rate >50%

---

## Summary

This addendum provides **complete navigation integration specifications** for the Escrow Visualization feature, addressing the gap in the original document.

**Key Additions**:
1. ✅ **3 Entry Points** defined (OrderPage, Dashboard, Header)
2. ✅ **Complete user flows** with mockups
3. ✅ **Permission checks** for DAO features
4. ✅ **Mobile navigation** patterns
5. ✅ **Breadcrumbs** and contextual navigation
6. ✅ **Accessibility** standards (WCAG 2.1 AA)
7. ✅ **Error handling** for edge cases
8. ✅ **Testing checklist** for all scenarios
9. ✅ **Analytics tracking** for optimization
10. ✅ **Migration plan** for safe rollout

**Implementation Priority**:
- **P0**: PaymentProtectionCard on OrderPage (Entry Point #1)
- **P1**: EscrowManagementPage with full functionality
- **P2**: Admin dashboard for DAO
- **P3**: Wallet integration and push notifications

**Next Steps**:
1. Review and approve navigation specifications
2. Implement Phase 1 (PaymentProtectionCard)
3. User testing for navigation flow
4. Iterate based on feedback

---

**Document Status**: ✅ Complete
**Created**: 2025-11-15
**Author**: Claude (Anthropic)
**Review Required**: Yes (before implementation)
