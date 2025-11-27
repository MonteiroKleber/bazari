# UI/UX Architecture Overview

**Status**: Living Document
**Version**: 1.0
**Last Updated**: 2025-11-14
**Dependencies**: 8 Pallets, React 18, Polkadot.js, shadcn/ui
**Maintainer**: Bazari Core Team

---

## Table of Contents

1. [Introduction](#introduction)
2. [Design Philosophy](#design-philosophy)
3. [Tech Stack](#tech-stack)
4. [Design Principles](#design-principles)
5. [Current State](#current-state)
6. [Target State](#target-state)
7. [Component Hierarchy](#component-hierarchy)
8. [State Management Strategy](#state-management-strategy)
9. [Navigation Structure](#navigation-structure)
10. [User Personas](#user-personas)
11. [Accessibility Guidelines](#accessibility-guidelines)
12. [Mobile Responsiveness](#mobile-responsiveness)
13. [Error Handling Patterns](#error-handling-patterns)
14. [Loading States Patterns](#loading-states-patterns)
15. [Implementation Roadmap](#implementation-roadmap)

---

## Introduction

Bazari is a **decentralized commerce platform** built on Substrate, featuring 8 blockchain pallets that power marketplace, payments, delivery, reputation, governance, and dispute resolution. This document defines the **complete UI/UX architecture** that brings blockchain functionality to users through intuitive, mobile-first interfaces.

### Vision

Create the **world's most user-friendly Web3 marketplace** where blockchain complexity is invisible to users, while maintaining full transparency and decentralization.

### Scope

This architecture covers:
- 56 existing pages + 25 new pages = **81 total pages**
- 200+ existing components + 80 new components = **280+ components**
- 50+ existing hooks + 50 new hooks = **100+ hooks**
- 8 blockchain pallets with complete UI coverage

### References

- Gap Analysis: `/root/bazari/UI_UX_GAP_ANALYSIS.md`
- Frontend Mapping: `/root/bazari/FRONTEND_MAPPING.md`
- Pallet Specs: `/root/bazari/knowledge/20-blueprints/pallets/`

---

## Design Philosophy

### 1. Mobile-First

**Rationale**: 70%+ of emerging market users access internet via mobile only.

**Strategy**:
- Design for 360px viewport first (iPhone SE, Android budget)
- Progressive enhancement for tablets (768px) and desktop (1024px+)
- Touch-friendly targets (minimum 44x44px)
- Bottom navigation for primary actions
- Thumb-zone optimization for critical actions

**Example**:
```tsx
// Mobile-first responsive design
<div className="
  p-4 md:p-6 lg:p-8
  text-sm md:text-base
  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3
">
  {/* Content adapts to screen size */}
</div>
```

### 2. Blockchain Transparency

**Rationale**: Users must trust the system without trusting intermediaries.

**Strategy**:
- Every blockchain transaction shows txHash with explorer link
- Real-time status updates via WebSocket
- Immutable audit trails visible to users
- Clear visualization of escrow states, disputes, proofs

**Example**:
```tsx
<TransactionHash
  hash="0x1234...5678"
  network="bazari"
  label="Order Created"
/>
// Renders: "Order Created: 0x1234...5678 [View on Explorer]"
```

### 3. Progressive Disclosure

**Rationale**: Reduce cognitive load by showing only what users need, when they need it.

**Strategy**:
- 3-tier information hierarchy: Essential → Common → Advanced
- Expandable sections for detailed data
- Tooltips for technical terms
- Expert mode toggle for power users

**Example**:
```tsx
<OrderDetails order={order}>
  {/* Tier 1: Always visible */}
  <OrderSummary />

  {/* Tier 2: Expandable */}
  <Collapsible label="Escrow Details">
    <EscrowCard />
  </Collapsible>

  {/* Tier 3: Expert mode only */}
  {expertMode && <BlockchainDebugPanel />}
</OrderDetails>
```

### 4. Zero-Knowledge Defaults

**Rationale**: Never assume users understand blockchain concepts.

**Strategy**:
- Plain language labels ("Payment Locked" not "Escrow 0x123")
- Contextual help bubbles
- Progressive education (tooltips → help articles → docs)
- Visual metaphors (lock icon for escrow, checkmarks for proofs)

**Example**:
```tsx
<EscrowStatus status="Locked">
  Your payment is safely held until delivery
  <HelpButton article="what-is-escrow" />
</EscrowStatus>
```

### 5. Instant Feedback

**Rationale**: Blockchain transactions take 6-12 seconds. UX must feel instant.

**Strategy**:
- Optimistic UI updates (assume success, revert on failure)
- Skeleton screens during loading
- Progress indicators for multi-step flows
- Micro-interactions for every action

**Example**:
```tsx
const { mutate, isLoading } = useCreateOrder();

const handleSubmit = () => {
  // Optimistic update
  addOrderToCache(orderData);

  mutate(orderData, {
    onError: () => removeOrderFromCache(orderData.id)
  });
};
```

### 6. Error Recovery

**Rationale**: Blockchain errors are permanent. Users must understand and recover.

**Strategy**:
- Human-readable error messages
- Actionable next steps
- Retry mechanisms with backoff
- Support contact for unrecoverable errors

---

## Tech Stack

### Frontend Core

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2+ | UI library |
| TypeScript | 5.0+ | Type safety |
| Vite | 4.5+ | Build tool |
| React Router | 6.20+ | Client-side routing |
| TailwindCSS | 3.4+ | Utility-first CSS |

### Blockchain Integration

| Technology | Version | Purpose |
|------------|---------|---------|
| Polkadot.js | 10.11+ | Substrate API |
| @polkadot/extension | 0.46+ | Wallet extension |
| React Query | 4.36+ | Async state + cache |

### UI Components

| Technology | Version | Purpose |
|------------|---------|---------|
| shadcn/ui | Latest | Component primitives |
| Radix UI | 1.0+ | Accessible components |
| Lucide React | 0.294+ | Icon system |
| Framer Motion | 10.16+ | Animations |

### State Management

| Technology | Version | Purpose |
|------------|---------|---------|
| Zustand | 4.4+ | Global state |
| React Query | 4.36+ | Server/blockchain state |
| Jotai | 2.6+ | Atomic state (optional) |

### Data Visualization

| Technology | Version | Purpose |
|------------|---------|---------|
| D3.js | 7.8+ | Tree visualizations |
| Recharts | 2.9+ | Charts & graphs |
| react-calendar-heatmap | 1.8+ | Streak calendar |

### Utilities

| Technology | Version | Purpose |
|------------|---------|---------|
| date-fns | 2.30+ | Date manipulation |
| react-i18next | 13.5+ | Internationalization |
| qrcode.react | 3.1+ | QR code generation |
| crypto-js | 4.2+ | Hashing (commit-reveal) |

---

## Design Principles

### Principle 1: Consistency Over Novelty

**Statement**: Reuse patterns across all 8 pallets. Users learn once, apply everywhere.

**Implementation**:
- Standardized status badges (Locked, Released, Verified, Pending, Failed)
- Common countdown timer for escrow, disputes, missions
- Unified transaction hash display
- Consistent modal patterns

**Example**:
```tsx
// ✅ GOOD: Reusable pattern
<BlockchainStatusBadge status="Locked" />
<BlockchainStatusBadge status="Released" />

// ❌ BAD: Custom badges everywhere
<EscrowLockedBadge />
<FundsReleasedChip />
```

**Applied to**: All 8 pallets, 280+ components

---

### Principle 2: Mobile-First, Touch-Friendly

**Statement**: Design for thumbs on 360px screens, scale up for desktop.

**Implementation**:
- Minimum touch target: 44x44px
- Bottom navigation (thumb zone)
- Swipe gestures (pull-to-refresh, swipe-to-delete)
- Safe area insets for notched devices

**Example**:
```tsx
// Button meets minimum touch target
<Button className="min-h-[44px] min-w-[44px]">
  <Icon size={24} />
</Button>

// Bottom nav in thumb zone
<nav className="fixed bottom-0 pb-safe">
  <NavItems />
</nav>
```

**Applied to**: All pages, modals, buttons

---

### Principle 3: Blockchain as Implementation Detail

**Statement**: Users don't need to know they're using blockchain. They just need to trust it.

**Implementation**:
- Business language labels ("Payment Protected" not "Escrow Locked")
- Optional "View on Blockchain" links for verification
- Hide addresses by default, show on click
- Visual metaphors (locks, checkmarks, timers)

**Example**:
```tsx
// ✅ GOOD: Business language
<PaymentStatus>
  Your payment is protected until delivery
  <DetailsButton>View blockchain proof</DetailsButton>
</PaymentStatus>

// ❌ BAD: Blockchain jargon
<EscrowContract address="0x123...">
  Funds locked at block 4829103
</EscrowContract>
```

**Applied to**: All user-facing copy, 81 pages

---

### Principle 4: Progressive Disclosure

**Statement**: Show 20% of information that serves 80% of use cases. Hide complexity behind clicks.

**Implementation**:
- Essential info always visible
- "Show more" expandable sections
- Advanced mode toggle
- Inline help tooltips

**Example**:
```tsx
<OrderCard order={order}>
  {/* Tier 1: Always visible */}
  <OrderStatus />
  <TotalAmount />
  <DeliveryDate />

  {/* Tier 2: Expandable */}
  <Collapsible label="Payment Details">
    <EscrowCard />
    <FeeBreakdown />
  </Collapsible>

  {/* Tier 3: Advanced */}
  <AdvancedMode>
    <BlockchainEvents />
    <RawOrderData />
  </AdvancedMode>
</OrderCard>
```

**Applied to**: OrderPage, DisputeDetailPage, ProfilePage

---

### Principle 5: Real-Time by Default

**Statement**: Blockchain events update UI in real-time. No manual refresh.

**Implementation**:
- WebSocket subscriptions for all critical events
- Optimistic UI updates
- Cache invalidation on blockchain events
- Visual feedback for live updates

**Example**:
```tsx
// WebSocket subscription
useBlockchainEvent('CommissionRecorded', (event) => {
  // Invalidate commission cache
  queryClient.invalidateQueries(['commissions']);

  // Show toast
  toast.success('Commission received!');
});
```

**Applied to**: Orders, Escrow, Disputes, Governance

---

### Principle 6: Accessibility First

**Statement**: WCAG 2.1 AA compliance is not optional. It's a baseline.

**Implementation**:
- Semantic HTML
- ARIA labels on interactive elements
- Keyboard navigation (Tab, Enter, Escape)
- Screen reader support
- Color contrast ratio ≥ 4.5:1
- Focus indicators

**Example**:
```tsx
<button
  aria-label="Release escrow funds to seller"
  className="focus:ring-2 focus:ring-primary"
  onClick={handleRelease}
>
  Release Funds
</button>
```

**Applied to**: All interactive components

---

### Principle 7: Optimistic UI

**Statement**: Update UI immediately, revert on error. Never block users.

**Implementation**:
- Instant visual feedback
- Background blockchain submission
- Graceful error handling with retry
- Rollback on failure

**Example**:
```tsx
const { mutate } = useCreateOrder();

const handleSubmit = () => {
  // 1. Update UI immediately
  const tempOrder = { id: 'temp', ...orderData };
  addToOrders(tempOrder);

  // 2. Submit to blockchain
  mutate(orderData, {
    onSuccess: (realOrder) => {
      replaceOrder('temp', realOrder);
    },
    onError: () => {
      removeOrder('temp');
      showError('Order creation failed. Please try again.');
    }
  });
};
```

**Applied to**: All mutations (orders, proofs, votes)

---

### Principle 8: Error Messages as Education

**Statement**: Every error is an opportunity to teach users about the system.

**Implementation**:
- Plain language error messages
- Root cause explanation
- Actionable next steps
- Link to help article

**Example**:
```tsx
// ❌ BAD: Cryptic error
"Transaction failed: InsufficientBalance"

// ✅ GOOD: Educational error
<ErrorMessage>
  <strong>Insufficient balance</strong>
  <p>You need 1000 BZR to stake as a courier, but you have 500 BZR.</p>
  <Actions>
    <Button>Buy BZR</Button>
    <Button variant="ghost">Learn about staking</Button>
  </Actions>
</ErrorMessage>
```

**Applied to**: All error boundaries, blockchain errors

---

## Current State

### Existing Pages (56)

| Category | Count | Examples |
|----------|-------|----------|
| **Auth** | 7 | WelcomePage, CreateAccount, Unlock |
| **Dashboard** | 4 | DashboardPage, ProfileEditPage, NotificationsPage |
| **Shopping** | 7 | SearchPage, ProductDetailPage, CartPage, CheckoutPage |
| **Orders** | 1 | OrderPage |
| **Chat** | 8 | ChatInboxPage, ChatThreadPage, ChatNewPage |
| **Social** | 6 | FeedPage, PostDetailPage, BookmarksPage |
| **Seller** | 11 | SellerDashboardPage, SellerManagePage, NewListingPage |
| **Delivery** | 9 | DeliveryDashboardPage, ActiveDeliveryPage, DeliveryHistoryPage |
| **Governance** | 10 | GovernancePage, ProposalsListPage, CouncilPage, TreasuryPage |
| **P2P** | 6 | P2PHomePage, P2POfferNewPage, ZARIStatsPage |
| **Wallet** | 4 | WalletDashboard, SendPage, ReceivePage |
| **Other** | 3 | VestingPage, AnalyticsDashboard, TestnetAccessPage |

**Total**: 56 pages

### Existing Components (200+)

| Category | Count | Examples |
|----------|-------|----------|
| **Base UI** | 40 | Button, Card, Dialog, Input, Badge |
| **Blockchain** | 3 | ProofCard, DisputePanel, CourierCard |
| **Chat** | 12 | MessageList, ProposalCard, ReceiptCard |
| **Social** | 15 | PostCard, CommentSection, ReactionPicker |
| **Delivery** | 11 | DeliveryStatusTimeline, GPSStatusIndicator, AddressCard |
| **Governance** | 20 | ProposalCard, VoteModal, TreasuryStats |
| **Seller** | 8 | CreateMarketplaceDialog, AffiliationCard |
| **Wallet** | 6 | Balance, TokenList, AddressQr |
| **Other** | 85+ | Filters, Modals, Forms, Charts |

**Total**: 200+ components

### Existing Hooks (50+)

| Category | Count | Examples |
|----------|-------|----------|
| **Blockchain** | 10 | useBlockchainQuery, useCreateOrder, useSubmitProof |
| **Governance** | 7 | useCouncilMotion, useGovernanceEvents |
| **Delivery** | 5 | useDeliveryProfile, useGeolocation |
| **Domain** | 15 | useCart, useChat, useSearch |
| **Wallet** | 4 | useApi, useChainProps, useVaultAccounts |
| **Other** | 9+ | useAuth, useGeolocation, useUnreadNotifications |

**Total**: 50+ hooks

### Blockchain Integration Coverage

| Pallet | Coverage | Status |
|--------|----------|--------|
| bazari-commerce | 95% | ✅ Mostly complete |
| bazari-escrow | 70% | ⚠️ Partial |
| bazari-rewards | 20% | ❌ Critical gap |
| bazari-attestation | 60% | ⚠️ Partial |
| bazari-fulfillment | 85% | ✅ Mostly complete |
| bazari-affiliate | 50% | ⚠️ Partial |
| bazari-fee | 10% | ❌ Critical gap |
| bazari-dispute | 40% | ⚠️ Partial |

**Average Coverage**: 54%

---

## Target State

### New Pages (+25)

| Pallet | New Pages | Priority |
|--------|-----------|----------|
| **commerce** | Commission Analytics, Sale Detail | P0 |
| **escrow** | Escrow Management, Admin Escrow Dashboard | P0 |
| **rewards** | Missions Hub, Streak History, Cashback Dashboard, Admin Missions | P0 |
| **attestation** | Proof Verification | P1 |
| **fulfillment** | Courier Public Profile | P2 |
| **affiliate** | Referral Tree, Campaign Management | P0 |
| **fee** | Fee Configuration | P2 |
| **dispute** | Dispute Detail, My Disputes, Admin Disputes Dashboard | P0 |

**Total New Pages**: 25
**Total Pages**: 81 (56 + 25)

### New Components (+80)

| Category | New Components | Priority |
|----------|----------------|----------|
| **Status & Indicators** | BlockchainStatusBadge, CountdownTimer, GasFeeEstimator, VRFIndicator | P0 |
| **Blockchain Data** | CommissionBreakdown, MerkleProofViewer, ProofCard (enhanced), TransactionHash | P0 |
| **Payment & Escrow** | EscrowCard, CoSignatureProgress, WalletBalance, FeeSplitCard | P0 |
| **Gamification** | MissionCard, StreakWidget, ReputationScore, BadgesList | P0 |
| **Visualizations** | TimelineVisualizer, TreeDiagram, ReferralTreeVisualization, IPFSPreview | P0 |
| **Admin** | RefundModal, SlashCourierButton, FeeConfigForm | P2 |

**Total New Components**: 80+
**Total Components**: 280+ (200 + 80)

### New Hooks (+50)

| Category | New Hooks | Priority |
|----------|-----------|----------|
| **Escrow** | useEscrowDetails, useReleaseFunds, useRefundBuyer | P0 |
| **Rewards** | useMissions, useUserMissionProgress, useClaimReward, useStreakData | P0 |
| **Attestation** | useProofDetails, useCoSignProof, useVerifyQuorum | P1 |
| **Affiliate** | useReferralTree, useCommissionBreakdown, useCampaigns | P0 |
| **Fee** | useFeeConfiguration, useFeeSplit, useFeeHistory | P2 |
| **Dispute** | useDisputeDetails, useCommitVote, useRevealVote, useJurorStatus | P0 |

**Total New Hooks**: 50+
**Total Hooks**: 100+ (50 + 50)

---

## Component Hierarchy

### Architecture: Atomic Design

We follow Brad Frost's Atomic Design methodology:

```
Atoms → Molecules → Organisms → Templates → Pages
```

### Layer 1: Atoms (Base UI)

**Purpose**: Smallest reusable units (buttons, inputs, badges)

**Examples**:
```tsx
// atoms/Button.tsx
<Button variant="primary" size="md">Click me</Button>

// atoms/Badge.tsx
<Badge variant="success">Verified</Badge>

// atoms/Input.tsx
<Input type="text" placeholder="Enter address" />
```

**Location**: `/components/ui/` (shadcn/ui)

**Count**: ~40 components

---

### Layer 2: Molecules (Simple Compositions)

**Purpose**: Combine atoms into simple functional units

**Examples**:
```tsx
// molecules/TransactionHash.tsx
<TransactionHash
  hash="0x1234...5678"
  network="bazari"
  showCopy={true}
  showExplorerLink={true}
/>

// molecules/BlockchainStatusBadge.tsx
<BlockchainStatusBadge
  status="Locked"
  icon={LockIcon}
  color="yellow"
/>

// molecules/CountdownTimer.tsx
<CountdownTimer
  endTime={lockTime + 7 * 24 * 3600}
  label="Auto-release in"
  onExpire={handleAutoRelease}
/>
```

**Location**: `/components/blockchain/`, `/components/shared/`

**Count**: ~60 components

---

### Layer 3: Organisms (Complex Compositions)

**Purpose**: Combine molecules into standalone sections

**Examples**:
```tsx
// organisms/EscrowCard.tsx
<EscrowCard escrow={escrow}>
  <EscrowHeader />
  <BlockchainStatusBadge status={escrow.status} />
  <AmountDisplay amount={escrow.amount_locked} />
  <CountdownTimer endTime={escrow.auto_release_at} />
  <EscrowActions />
</EscrowCard>

// organisms/MissionCard.tsx
<MissionCard mission={mission}>
  <MissionIcon type={mission.type} />
  <MissionProgress current={3} target={10} />
  <RewardBadge amount={mission.reward} />
  <ClaimButton enabled={mission.completed} />
</MissionCard>

// organisms/DisputeVotingPanel.tsx
<DisputeVotingPanel dispute={dispute}>
  <VotingPhaseIndicator phase={dispute.phase} />
  {dispute.phase === 'COMMIT' && <CommitVoteForm />}
  {dispute.phase === 'REVEAL' && <RevealVoteForm />}
  <JurorList jurors={dispute.jurors} />
</DisputeVotingPanel>
```

**Location**: `/components/[domain]/` (e.g., `/components/escrow/`)

**Count**: ~80 components

---

### Layer 4: Templates (Page Layouts)

**Purpose**: Page structure without content

**Examples**:
```tsx
// templates/DashboardLayout.tsx
<DashboardLayout>
  <Sidebar />
  <MainContent>
    <PageHeader />
    <PageContent />
  </MainContent>
</DashboardLayout>

// templates/DetailPageLayout.tsx
<DetailPageLayout>
  <Breadcrumb />
  <DetailHeader />
  <DetailTabs />
  <DetailContent />
  <DetailActions />
</DetailPageLayout>
```

**Location**: `/layouts/`

**Count**: ~10 templates

---

### Layer 5: Pages (Complete Screens)

**Purpose**: Full pages with data fetching and business logic

**Examples**:
```tsx
// pages/EscrowManagementPage.tsx
const EscrowManagementPage = () => {
  const { orderId } = useParams();
  const { data: escrow } = useEscrowDetails(orderId);

  return (
    <DetailPageLayout>
      <EscrowCard escrow={escrow} />
      <EscrowEventsLog orderId={orderId} />
      <EscrowActions escrow={escrow} />
    </DetailPageLayout>
  );
};
```

**Location**: `/pages/` or `/modules/[domain]/pages/`

**Count**: 81 pages

---

### Smart vs Presentational Components

| Component Type | Responsibilities | Examples |
|----------------|------------------|----------|
| **Smart (Container)** | Data fetching, state management, business logic | `EscrowManagementPage`, `MissionsHub` |
| **Presentational (UI)** | Rendering, props-based, no state | `EscrowCard`, `MissionCard`, `CountdownTimer` |

**Ratio**: 20% Smart, 80% Presentational

---

## State Management Strategy

### State Categories

```
┌─────────────────────────────────────────────────┐
│                  APPLICATION STATE              │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────────┐  ┌───────────────┐          │
│  │ Local State   │  │ Global State  │          │
│  │ (useState)    │  │ (Zustand)     │          │
│  └───────────────┘  └───────────────┘          │
│                                                 │
│  ┌───────────────┐  ┌───────────────┐          │
│  │ Blockchain    │  │ URL State     │          │
│  │ (React Query) │  │ (Router)      │          │
│  └───────────────┘  └───────────────┘          │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 1. Local State (useState, useReducer)

**Use for**: Ephemeral UI state (modal open/close, form inputs, toggles)

**Examples**:
```tsx
// Modal visibility
const [isOpen, setIsOpen] = useState(false);

// Form data (before submission)
const [formData, setFormData] = useState({
  recipient: '',
  amount: 0
});

// UI toggles
const [showAdvanced, setShowAdvanced] = useState(false);
```

**Duration**: Component lifetime only

**Synced**: No

---

### 2. Global State (Zustand)

**Use for**: Cross-component UI state (cart, auth, wallet, theme)

**Examples**:
```tsx
// Cart store
const useCartStore = create((set) => ({
  items: [],
  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  })),
  removeItem: (id) => set((state) => ({
    items: state.items.filter(i => i.id !== id)
  })),
  clear: () => set({ items: [] })
}));

// Auth store
const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false })
}));

// Wallet store
const useWalletStore = create((set) => ({
  selectedAccount: null,
  accounts: [],
  setSelectedAccount: (account) => set({ selectedAccount: account })
}));
```

**Duration**: App lifetime (persisted to localStorage)

**Synced**: Across all components

---

### 3. Blockchain State (React Query)

**Use for**: All blockchain data (orders, escrow, proofs, missions)

**Examples**:
```tsx
// Query: Read blockchain data
const { data: escrow } = useBlockchainQuery(
  ['escrow', orderId],
  async () => {
    const api = await getApi();
    return await api.query.bazariEscrow.escrows(orderId);
  },
  {
    staleTime: 10_000, // 10s
    refetchInterval: 30_000 // 30s auto-refresh
  }
);

// Mutation: Write to blockchain
const { mutate: releaseEscrow } = useBlockchainTx(
  async (orderId) => {
    const api = await getApi();
    return await api.tx.bazariEscrow.releaseFunds(orderId);
  },
  {
    onSuccess: () => {
      queryClient.invalidateQueries(['escrow', orderId]);
      toast.success('Funds released!');
    }
  }
);
```

**Cache Strategy**:
- **Stale time**: 10s (data considered fresh)
- **Cache time**: 5 minutes (data kept in cache)
- **Refetch on**: Window focus, network reconnect, interval
- **Invalidation**: Manual (on mutations, WebSocket events)

**Duration**: Cache lifetime (5 minutes default)

**Synced**: Via cache keys

---

### 4. URL State (React Router)

**Use for**: Shareable, bookmarkable state (filters, pagination, search)

**Examples**:
```tsx
const [searchParams, setSearchParams] = useSearchParams();

// Read from URL
const page = parseInt(searchParams.get('page') || '1');
const status = searchParams.get('status') || 'all';

// Write to URL
const handleFilterChange = (newStatus) => {
  setSearchParams({
    page: '1',
    status: newStatus
  });
};

// URL: /orders?page=1&status=shipped
```

**Duration**: Browser session (back/forward navigation)

**Synced**: Via URL

---

### State Ownership Matrix

| State Type | Owner | Examples | Persistence |
|------------|-------|----------|-------------|
| **Local** | Component | Modal open, form inputs | None |
| **Global** | Zustand | Cart, auth, theme | localStorage |
| **Blockchain** | React Query | Orders, escrow, proofs | Cache (5m) |
| **URL** | Router | Filters, pagination | Browser history |

---

## Navigation Structure

### Complete Sitemap

```
bazari.xyz/
│
├── / (Landing Page)
│
├── /auth/*
│   ├── /welcome
│   ├── /create-account
│   ├── /import-account
│   ├── /unlock
│   └── /recover-pin
│
├── /marketplace
│   ├── /search
│   ├── /explore
│   ├── /product/:id
│   └── /service/:id
│
├── /s/:shopSlug (Seller Storefront)
├── /loja/:slug (Store Public)
├── /m/:slug (Affiliate Marketplace)
├── /u/:handle (User Profile)
│
├── /app/* (Authenticated)
│   │
│   ├── /dashboard
│   ├── /notifications
│   ├── /profile/edit
│   │
│   ├── /feed
│   ├── /posts/:postId
│   ├── /bookmarks
│   ├── /discover/*
│   │
│   ├── /cart
│   ├── /checkout
│   ├── /orders/:id
│   │   └── /pay
│   │   └── /escrow (NEW)
│   │   └── /proofs/:proofId (NEW)
│   │
│   ├── /seller/*
│   │   ├── /dashboard
│   │   ├── /manage/:storeId
│   │   ├── /products
│   │   ├── /orders
│   │   ├── /commissions (NEW)
│   │   ├── /affiliates
│   │   └── /commission-policy
│   │
│   ├── /sales/:saleId (NEW)
│   │
│   ├── /delivery/*
│   │   ├── /dashboard
│   │   ├── /profile-setup
│   │   ├── /requests
│   │   ├── /active/:deliveryId
│   │   ├── /history
│   │   └── /earnings
│   │
│   ├── /chat/*
│   │   ├── /inbox
│   │   ├── /thread/:threadId
│   │   └── /new
│   │
│   ├── /rewards/* (NEW)
│   │   ├── /missions
│   │   ├── /streaks
│   │   └── /cashback
│   │
│   ├── /affiliate/*
│   │   ├── /dashboard
│   │   ├── /referrals (NEW)
│   │   └── /campaigns (NEW)
│   │
│   ├── /disputes/* (NEW)
│   │   ├── / (My Disputes)
│   │   └── /:disputeId
│   │
│   ├── /governance/*
│   │   ├── / (Hub)
│   │   ├── /proposals
│   │   ├── /proposals/:id
│   │   ├── /council
│   │   ├── /treasury
│   │   └── /multisig
│   │
│   ├── /wallet/*
│   │   ├── / (Overview)
│   │   ├── /accounts
│   │   ├── /send
│   │   └── /receive
│   │
│   ├── /p2p/*
│   │   ├── / (Home)
│   │   ├── /offer/new
│   │   ├── /offer/:id
│   │   ├── /orders
│   │   └── /order/:id
│   │
│   └── /admin/* (DAO only) (NEW)
│       ├── /escrows
│       ├── /missions
│       ├── /couriers
│       ├── /fees
│       └── /disputes
│
├── /delivery (Public Landing)
├── /vesting
└── /testnet
```

**Total Routes**: 81 pages

---

### Navigation Patterns

#### 1. Bottom Navigation (Mobile)

**Primary Actions** (thumb zone):
```tsx
<BottomNav>
  <NavItem icon={Home} label="Home" to="/app/dashboard" />
  <NavItem icon={Search} label="Search" to="/marketplace/search" />
  <NavItem icon={ShoppingCart} label="Cart" to="/app/cart" badge={cartCount} />
  <NavItem icon={MessageCircle} label="Chat" to="/app/chat/inbox" badge={unreadCount} />
  <NavItem icon={User} label="Profile" to="/app/profile" />
</BottomNav>
```

**Visible on**: All /app/* routes (mobile only)

#### 2. Top Navigation (Desktop)

**Structure**:
```tsx
<TopNav>
  <Logo />
  <SearchBar />
  <NavLinks>
    <Link to="/marketplace">Marketplace</Link>
    <Link to="/app/seller/dashboard">Sell</Link>
    <Link to="/delivery">Deliver</Link>
    <Link to="/app/governance">Governance</Link>
  </NavLinks>
  <UserMenu />
  <WalletButton />
  <NotificationBell />
</TopNav>
```

**Visible on**: All routes (desktop only)

#### 3. Sidebar (Contextual)

**Use for**: Sub-navigation within modules

**Example** (Seller Dashboard):
```tsx
<Sidebar>
  <NavItem to="/app/seller/dashboard">Overview</NavItem>
  <NavItem to="/app/seller/products">Products</NavItem>
  <NavItem to="/app/seller/orders">Orders</NavItem>
  <NavItem to="/app/seller/commissions">Commissions</NavItem>
  <NavItem to="/app/seller/affiliates">Affiliates</NavItem>
</Sidebar>
```

**Visible on**: Module-specific pages (/app/seller/*, /app/delivery/*)

---

## User Personas

### Persona 1: Maria - The Buyer

**Demographics**:
- Age: 28
- Location: São Paulo, Brazil
- Device: Android smartphone (360px screen)
- Tech level: Basic (uses WhatsApp, Instagram)

**Goals**:
- Find affordable products
- Track delivery in real-time
- Get cashback/rewards

**Pain Points**:
- Distrust of online sellers
- Payment fraud concerns
- Slow refunds

**How Bazari Helps**:
- Escrow protection (payment locked until delivery)
- Real-time GPS tracking
- Instant refunds via DAO disputes
- ZARI cashback on purchases

**Key Pages**:
- SearchPage, ProductDetailPage, CartPage
- OrderPage (with escrow status)
- MissionsPage (cashback/rewards)

---

### Persona 2: João - The Seller

**Demographics**:
- Age: 35
- Location: Rio de Janeiro, Brazil
- Device: Laptop + mobile
- Tech level: Intermediate (manages Shopify store)

**Goals**:
- Increase sales
- Manage inventory
- Track commissions/affiliates

**Pain Points**:
- High marketplace fees (15-20%)
- Payment delays (30-60 days)
- Fraudulent buyers

**How Bazari Helps**:
- Low platform fee (5%)
- Instant payment release (or 7-day auto-release)
- Dispute resolution via DAO
- Affiliate system for organic growth

**Key Pages**:
- SellerDashboardPage
- SellerManagePage (products, orders)
- CommissionAnalyticsPage
- AffiliatesPage

---

### Persona 3: Carlos - The Courier

**Demographics**:
- Age: 24
- Location: Belo Horizonte, Brazil
- Device: Android smartphone (GPS enabled)
- Tech level: Basic

**Goals**:
- Earn extra income
- Flexible work hours
- Build reputation

**Pain Points**:
- Low pay from traditional platforms
- Lack of transparency
- Disputes with customers

**How Bazari Helps**:
- Higher pay (less platform fee)
- On-chain reputation (portable)
- GPS-based proofs (automatic)
- Staking system (trusted couriers earn more)

**Key Pages**:
- DeliveryDashboardPage
- ActiveDeliveryPage (GPS tracking)
- DeliveryEarningsPage
- CourierPublicProfile

---

### Persona 4: Ana - The DAO Member

**Demographics**:
- Age: 32
- Location: Lisbon, Portugal
- Device: Desktop
- Tech level: Advanced (crypto native)

**Goals**:
- Govern platform fairly
- Resolve disputes
- Configure fees/policies

**Pain Points**:
- Complex governance UIs
- Lack of transparency
- Slow voting

**How Bazari Helps**:
- Simplified voting UI
- Commit-reveal voting (prevents collusion)
- Real-time vote tracking
- Admin dashboards for escrow, fees, disputes

**Key Pages**:
- GovernancePage
- ProposalsListPage, ProposalDetailPage
- AdminEscrowDashboard
- AdminDisputesDashboard
- FeeConfigurationPage

---

### Persona 5: Lucas - The Affiliate Marketer

**Demographics**:
- Age: 26
- Location: Porto Alegre, Brazil
- Device: Laptop + mobile
- Tech level: Intermediate (influencer)

**Goals**:
- Promote products
- Earn commissions
- Build referral network

**Pain Points**:
- Complex affiliate tracking
- Payment delays
- Limited customization

**How Bazari Helps**:
- Multi-level referral tree (5 levels)
- Instant commission splits
- Custom marketplace (branding)
- Merkle proofs (verifiable earnings)

**Key Pages**:
- AffiliateDashboardPage
- ReferralTreePage
- CampaignManagementPage
- AffiliateMarketplacePage

---

## Accessibility Guidelines

### WCAG 2.1 AA Compliance

| Criterion | Level | Implementation |
|-----------|-------|----------------|
| **1.1 Text Alternatives** | A | All images have alt text |
| **1.3 Adaptable** | A | Semantic HTML, ARIA labels |
| **1.4 Distinguishable** | AA | Color contrast ≥ 4.5:1 |
| **2.1 Keyboard Accessible** | A | All interactive elements keyboard-operable |
| **2.4 Navigable** | AA | Skip links, focus indicators, breadcrumbs |
| **3.1 Readable** | A | Language attribute, plain language |
| **3.2 Predictable** | AA | Consistent navigation, no auto-submit |
| **3.3 Input Assistance** | AA | Error identification, labels, suggestions |
| **4.1 Compatible** | AA | Valid HTML, ARIA roles |

### Keyboard Navigation

**Tab Order**:
```
Header → Main Navigation → Page Content → Footer
```

**Shortcuts**:
- `Tab`: Next focusable element
- `Shift+Tab`: Previous focusable element
- `Enter`: Activate button/link
- `Space`: Toggle checkbox/switch
- `Escape`: Close modal/dropdown
- `Arrow Keys`: Navigate lists/tabs

**Focus Indicators**:
```css
.focus-visible:focus {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

### Screen Reader Support

**ARIA Labels**:
```tsx
<button aria-label="Release escrow funds to seller">
  Release Funds
</button>

<nav aria-label="Primary navigation">
  <NavLinks />
</nav>

<div role="status" aria-live="polite">
  Transaction submitted. Waiting for confirmation...
</div>
```

**Semantic HTML**:
```tsx
// ✅ GOOD: Semantic
<header>
  <nav><NavLinks /></nav>
</header>
<main>
  <article><Content /></article>
</main>
<footer><FooterLinks /></footer>

// ❌ BAD: Divitis
<div class="header">
  <div class="nav">...</div>
</div>
```

### Color Contrast

**Text**:
- Body text: #1a1a1a on #ffffff (16.24:1) ✅
- Secondary text: #666666 on #ffffff (5.7:1) ✅

**Interactive Elements**:
- Primary button: #ffffff on #0066cc (7.1:1) ✅
- Error text: #cc0000 on #ffffff (7.7:1) ✅

**Status Colors**:
- Success: #008000 on #ffffff (4.5:1) ✅
- Warning: #cc6600 on #ffffff (4.6:1) ✅
- Error: #cc0000 on #ffffff (7.7:1) ✅

---

## Mobile Responsiveness

### Breakpoints

```css
/* Mobile (default) */
@media (min-width: 0px) { /* 360px-767px */ }

/* Tablet */
@media (min-width: 768px) { /* 768px-1023px */ }

/* Desktop */
@media (min-width: 1024px) { /* 1024px-1439px */ }

/* Wide Desktop */
@media (min-width: 1440px) { /* 1440px+ */ }
```

### Responsive Patterns

#### 1. Stacked to Grid

**Mobile** (stacked):
```tsx
<div className="grid grid-cols-1 gap-4">
  <Card />
  <Card />
  <Card />
</div>
```

**Tablet** (2 columns):
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <Card />
  <Card />
  <Card />
</div>
```

**Desktop** (3 columns):
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card />
  <Card />
  <Card />
</div>
```

#### 2. Bottom Sheet to Modal

**Mobile** (bottom sheet):
```tsx
<Dialog position="bottom" fullWidth>
  <DialogContent />
</Dialog>
```

**Desktop** (centered modal):
```tsx
<Dialog position="center" maxWidth="md">
  <DialogContent />
</Dialog>
```

#### 3. Horizontal Scroll to Grid

**Mobile** (horizontal scroll):
```tsx
<div className="flex overflow-x-auto gap-4 pb-4">
  <Card className="flex-shrink-0 w-[280px]" />
  <Card className="flex-shrink-0 w-[280px]" />
</div>
```

**Desktop** (grid):
```tsx
<div className="hidden md:grid md:grid-cols-3 gap-4">
  <Card />
  <Card />
</div>
```

### Touch Targets

**Minimum Size**: 44x44px (Apple HIG, Material Design)

**Implementation**:
```tsx
<Button className="min-h-[44px] min-w-[44px]">
  <Icon size={24} />
</Button>

<Checkbox className="h-[44px] w-[44px]" />
```

### Safe Area Insets

**iOS Notch Support**:
```css
.bottom-nav {
  padding-bottom: env(safe-area-inset-bottom);
}

.top-header {
  padding-top: env(safe-area-inset-top);
}
```

---

## Error Handling Patterns

### Error Categories

| Category | Severity | Examples | Recovery |
|----------|----------|----------|----------|
| **Network** | Low | API timeout, no internet | Retry button |
| **Blockchain** | Medium | Insufficient balance, invalid params | Edit + resubmit |
| **Transaction** | High | TX reverted, escrow locked | Show txHash + support |
| **IPFS** | Medium | Upload failed, CID not found | Fallback + retry |

### Error UI Patterns

#### 1. Inline Error (Form Validation)

```tsx
<Input
  error={errors.amount}
  helperText={errors.amount?.message}
/>
// Renders: "Amount must be greater than 0"
```

#### 2. Toast Error (Non-Critical)

```tsx
toast.error('Failed to load missions. Please refresh.');
```

#### 3. Error Boundary (Critical)

```tsx
<ErrorBoundary
  fallback={
    <ErrorPage
      title="Something went wrong"
      message="We're working on it. Please try again."
      actions={
        <>
          <Button onClick={reset}>Try Again</Button>
          <Button variant="ghost" onClick={goHome}>Go Home</Button>
        </>
      }
    />
  }
>
  <App />
</ErrorBoundary>
```

#### 4. Blockchain Error (Detailed)

```tsx
<BlockchainError
  error={error}
  txHash={txHash}
  message="Transaction failed: Insufficient balance"
  details="You need 1000 BZR to stake as a courier, but you have 500 BZR."
  actions={
    <>
      <Button onClick={() => navigate('/wallet/send')}>Buy BZR</Button>
      <Button variant="ghost" onClick={retry}>Retry</Button>
      <Button variant="ghost" asChild>
        <a href="https://docs.bazari.xyz/staking">Learn More</a>
      </Button>
    </>
  }
/>
```

---

## Loading States Patterns

### Loading Categories

| Category | Duration | Pattern | Example |
|----------|----------|---------|---------|
| **Instant** | <100ms | Optimistic UI | Add to cart |
| **Fast** | 100-1000ms | Spinner | Form submit |
| **Slow** | 1-5s | Skeleton | Page load |
| **Very Slow** | >5s | Progress bar | Blockchain TX |

### Loading UI Patterns

#### 1. Skeleton Screen (Page Load)

```tsx
const OrderPage = () => {
  const { data: order, isLoading } = useBlockchainOrder(orderId);

  if (isLoading) {
    return <OrderSkeleton />;
  }

  return <OrderDetails order={order} />;
};

// OrderSkeleton.tsx
const OrderSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-[200px]" />
    <Skeleton className="h-4 w-[300px]" />
    <Skeleton className="h-[200px] w-full" />
  </div>
);
```

#### 2. Spinner (Inline Action)

```tsx
<Button disabled={isLoading}>
  {isLoading && <Spinner className="mr-2" />}
  {isLoading ? 'Releasing...' : 'Release Funds'}
</Button>
```

#### 3. Progress Bar (Long Operation)

```tsx
<TransactionProgress
  status={txStatus}
  steps={[
    { label: 'Signing', status: 'complete' },
    { label: 'Broadcasting', status: 'active' },
    { label: 'Confirming', status: 'pending' },
    { label: 'Finalized', status: 'pending' }
  ]}
/>
```

#### 4. Optimistic UI (Instant Feedback)

```tsx
const { mutate: addToCart } = useMutation({
  mutationFn: addItemToCart,
  onMutate: async (item) => {
    // Cancel ongoing queries
    await queryClient.cancelQueries(['cart']);

    // Snapshot current state
    const previousCart = queryClient.getQueryData(['cart']);

    // Optimistically update
    queryClient.setQueryData(['cart'], (old) => [...old, item]);

    // Return rollback function
    return { previousCart };
  },
  onError: (err, item, context) => {
    // Rollback on error
    queryClient.setQueryData(['cart'], context.previousCart);
  }
});
```

---

## Implementation Roadmap

### Phase 1: P0 - CRITICAL (7 weeks, 35 days)

**Goal**: Implement core missing features for blockchain parity

| Week | Focus | Deliverables |
|------|-------|--------------|
| 1-2 | Rewards & Missions | Missions Hub, Streak Tracking, Cashback UI |
| 3-4 | Escrow & Payments | Escrow Card, Countdown, Commission UI |
| 5-6 | Affiliate & Referrals | Referral Tree, Multi-Level Commissions |
| 7 | Disputes | Dispute Detail, Jury Voting |

**Completion Criteria**:
- [ ] All P0 prompts executed
- [ ] Tests passing (unit + integration)
- [ ] Mobile responsive
- [ ] Accessibility audit passed

---

### Phase 2: P1 - HIGH (5 weeks, 24 days)

**Goal**: UX improvements and admin features

| Week | Focus | Deliverables |
|------|-------|--------------|
| 8-9 | Order Enhancements | State Machine, Multi-Store UI, NFT Minting |
| 10-11 | Escrow Admin | Refund UI, Logs, History |
| 12 | Attestation & Fees | Co-Signature UI, Fee Split Card |

**Completion Criteria**:
- [ ] All P1 prompts executed
- [ ] Admin features functional
- [ ] User testing completed

---

### Phase 3: P2 - MEDIUM (4 weeks, 22 days)

**Goal**: Advanced features and analytics

| Week | Focus | Deliverables |
|------|-------|--------------|
| 13-14 | Admin Dashboards | Fee Config, Courier Slashing, Campaign Mgmt |
| 15-16 | Advanced UX | Proof Types, Mission Triggers, Reputation |

**Completion Criteria**:
- [ ] All P2 prompts executed
- [ ] Analytics dashboards complete
- [ ] Performance optimized

---

### Phase 4: P3 - LOW (2 weeks, 11 days)

**Goal**: Polish and advanced verification

| Week | Focus | Deliverables |
|------|-------|--------------|
| 17-18 | Merkle & Analytics | Merkle Verification, Fee Analytics, VRF UI |

**Completion Criteria**:
- [ ] All P3 prompts executed
- [ ] Documentation complete
- [ ] Production ready

---

**Total Timeline**: 18 weeks (4.5 months) with 1 developer, 9 weeks (2.25 months) with 2 developers

---

**Document Version**: 1.0
**Next Review**: After Phase 1 completion
**Status**: Complete - Ready for implementation
