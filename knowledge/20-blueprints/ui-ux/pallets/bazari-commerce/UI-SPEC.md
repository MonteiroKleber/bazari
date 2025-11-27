# bazari-commerce Pallet - UI/UX Specification

**Status**: 🟡 P0 Priority - Gap Closure
**Coverage**: 95% → 100% (5% gap)
**Effort**: 3 days
**Version**: 1.0
**Last Updated**: 2025-11-14
**Dependencies**: bazari-escrow, bazari-affiliate

---

## Table of Contents

1. [Overview](#1-overview)
2. [User Flows](#2-user-flows)
3. [Pages Required](#3-pages-required)
4. [Components Required](#4-components-required)
5. [Blockchain Hooks](#5-blockchain-hooks)
6. [Data Flow](#6-data-flow)
7. [Gaps & Implementation Plan](#7-gaps--implementation-plan)
8. [Testing Requirements](#8-testing-requirements)
9. [Acceptance Criteria](#9-acceptance-criteria)

---

## 1. Overview

### 1.1 Purpose

The **bazari-commerce** pallet handles on-chain orders, sales tracking, commission recording, and NFT receipt minting. This specification addresses the **5% UI/UX gap** identified in the gap analysis.

**Critical Context**: bazari-commerce is the FOUNDATION pallet with 95% coverage. The remaining 5% gap consists of:
- Commission tracking UI (NEW feature)
- NFT receipt minting UI
- Order state machine enforcement (UX improvement)

### 1.2 Current State Analysis (95% Coverage)

**What Exists** ✅:
- ✅ **CheckoutPage** - Order creation (unified Order/ChatProposal)
- ✅ **OrderPage** - Order details with status tracking
- ✅ **CartPage** - Multi-store cart management
- ✅ **SellersListPage** - Seller directory
- ✅ **SellerOrdersPage** - Seller order management
- ✅ **ProposalCard** - BazChat proposals → orders
- ✅ **ReceiptCard** - IPFS receipt viewer
- ✅ **DeliveryStatusTimeline** - Order state timeline
- ✅ `useBlockchainOrders()`, `useCreateOrder()`, `useBlockchainOrder()` hooks

**What's Missing** ❌ (5% Gap):
1. **Commission Tracking UI** - NEW in SPEC.md (commission_paid field added to Sale struct)
2. **NFT Receipt Minting** - mint_receipt extrinsic not exposed in UI
3. **Order State Machine Validation** - UI allows invalid transitions

### 1.3 Gap Analysis Reference

From `/root/bazari/UI_UX_GAP_ANALYSIS.md` Section 1:

**Gap 1.1: Commission Tracking UI (NEW)** - 3 days
- `record_commission` extrinsic implemented but no UI
- Sale struct has new `commission_paid` field
- Need Sale Detail Page + Commission Dashboard

**Gap 1.2: Receipt NFT Minting UI** - 2 days
- `mint_receipt` extrinsic exists but no trigger button
- Need NFT viewer component

**Gap 1.3: Order State Machine Enforcement** - 1 day
- UI permits invalid state transitions (e.g., mark_shipped when status != PAID)
- Need frontend validation

**Total Effort**: 6 days → Reduced to 3 days (commission tracking prioritized)

### 1.4 Pallet Integration Points

**Extrinsics** (from SPEC.md):
- `create_order` - ✅ Implemented (CheckoutPage)
- `mark_shipped` - ✅ Implemented (SellerOrdersPage)
- `complete_delivery` - ✅ Implemented (OrderPage)
- `mint_receipt` - ❌ **GAP** (no UI)
- `record_commission` - ❌ **GAP** (NEW feature, no UI)

**Events** (NEW):
- `CommissionRecorded` - Need UI listener

**Storage** (UPDATED):
- `Sales<SaleId, Sale>` - Sale struct now has `commission_paid` field

---

## 2. User Flows

### 2.1 View Commission Analytics (NEW)

**Actor**: Seller

**Flow**:
1. Seller navigates to `/app/seller/commissions`
2. System queries:
   - `bazariCommerce.sales()` - All sales for this seller
   - Backend: `GET /api/sales?sellerId=X` (cached data)
3. Display CommissionAnalyticsPage with:
   - **CommissionSummaryCard**: Total paid, Total pending, Avg per sale
   - **CommissionHistoryTable**: All CommissionRecorded events
     - Columns: Date, Sale ID, Recipient, Amount, TxHash
     - Filters: Date range, Recipient type (Platform/Affiliate)
   - **CommissionChart**: Line chart over time
   - **TopAffiliatesCard**: Top 5 affiliates by commission earned
4. User actions:
   - **Filter by date**: Select range → Update table
   - **View sale details**: Click Sale ID → Navigate to `/app/sales/:saleId`
   - **Export CSV**: Download commission history

**Edge Cases**:
- No commissions yet → Show empty state "No commissions recorded"
- Failed event listener → Show warning, manual refresh option

**Success Criteria**:
- Commission data matches on-chain `CommissionRecorded` events
- Filters work correctly
- Export generates valid CSV

**ASCII Mockup**:
```
┌────────────────────────────────────────────────────────┐
│  💰 Commission Analytics                               │
├────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Total Paid  │  │ Pending     │  │ Avg/Sale    │    │
│  │ 1,234 BZR   │  │ 567 BZR     │  │ 12.5 BZR    │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
├────────────────────────────────────────────────────────┤
│  Commission History:                                   │
│  [Date Range Filter: Last 30 Days ▼]                   │
│  ┌──────┬────────┬───────────┬────────┬──────────────┐ │
│  │ Date │ Sale   │ Recipient │ Amount │ TxHash       │ │
│  ├──────┼────────┼───────────┼────────┼──────────────┤ │
│  │11/14 │ #123   │ Platform  │ 5 BZR  │ 0xabc...     │ │
│  │11/13 │ #122   │ Affiliate │ 3 BZR  │ 0x123...     │ │
│  │11/12 │ #121   │ Platform  │ 5 BZR  │ 0x789...     │ │
│  └──────┴────────┴───────────┴────────┴──────────────┘ │
│                                              [Export CSV]│
└────────────────────────────────────────────────────────┘
```

---

### 2.2 View Sale Details with Commission Breakdown (NEW)

**Actor**: Seller or Buyer

**Flow**:
1. User navigates to `/app/sales/:saleId` (new page)
2. System queries:
   - `bazariCommerce.sales(saleId)` → Sale struct
   - Related order: `bazariCommerce.orders(sale.order_id)`
   - Commission events: Filter `CommissionRecorded` by saleId
3. Display SaleDetailPage with:
   - **SaleOverview**: sale_id, order_id, seller, buyer, amount, created_at
   - **CommissionBreakdown**:
     ```
     Total: 100 BZR
     ├─ Platform fee: 5 BZR (5%)
     ├─ Affiliate: 3 BZR (commission_paid)
     └─ Seller net: 92 BZR
     ```
   - **CommissionHistoryList**: Individual commission records
   - **Related Order Button**: Link to `/app/orders/:orderId`
4. User actions:
   - **View order**: Click order link
   - **View commission TxHash**: Click hash → Open block explorer

**Edge Cases**:
- Sale not found → 404 page
- No commissions (commission_paid = 0) → Show "No affiliate commissions"

**Success Criteria**:
- Commission breakdown sums correctly
- Related order link works
- TxHash links open explorer

**ASCII Mockup**:
```
┌────────────────────────────────────────────────────────┐
│  Sale #123 Details                                     │
├────────────────────────────────────────────────────────┤
│  Sale ID: 123                    Order ID: #456        │
│  Seller: 0xAlice...              Buyer: 0xBob...       │
│  Amount: 100 BZR                 Date: 2025-11-14      │
├────────────────────────────────────────────────────────┤
│  💵 Commission Breakdown:                              │
│  ┌────────────────────────────────────────────────┐   │
│  │ Total Sale Amount:        100.00 BZR           │   │
│  │ ├─ Platform Fee (5%):       5.00 BZR           │   │
│  │ ├─ Affiliate Commission:    3.00 BZR ✅        │   │
│  │ └─ Seller Net:             92.00 BZR           │   │
│  └────────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────────┤
│  Commission History:                                   │
│  • Platform Fee → Treasury: 5 BZR (0xabc...)           │
│  • Affiliate → 0xCarol: 3 BZR (0x123...)               │
├────────────────────────────────────────────────────────┤
│  [View Related Order #456]                             │
└────────────────────────────────────────────────────────┘
```

---

### 2.3 Mint Receipt NFT

**Actor**: Buyer

**Flow**:
1. Buyer completes order (status = DELIVERED)
2. OrderPage shows **"Mint Receipt NFT"** button (new)
3. User clicks button → Modal opens:
   - **Title**: "Mint Your Receipt as NFT"
   - **Description**: "Create an on-chain NFT proof of purchase"
   - **IPFS CID**: Pre-filled (backend generates receipt JSON)
   - **Preview**: Show receipt data (order details, delivery proof)
   - **Confirm** button
4. User confirms → Call `bazariCommerce.mintReceipt(orderId, ipfsCid)`
5. On-chain logic:
   - Creates Receipt NFT with unique ID
   - Links to order via `receipt_nft_id` field
   - Emits `ReceiptMinted` event
6. Success toast: "✅ Receipt NFT minted! NFT ID: #789"
7. OrderPage updates: Shows **"View NFT"** button
8. Click "View NFT" → Navigate to `/app/nfts/:nftId` or Polkadot.js explorer

**Edge Cases**:
- Already minted → Button disabled, show "NFT already minted"
- Order not delivered → Button hidden
- IPFS upload fails → Show error, retry option

**Success Criteria**:
- NFT minted on-chain
- `receipt_nft_id` field updated in Order struct
- NFT viewable in wallet/explorer

**ASCII Mockup** (Modal):
```
┌────────────────────────────────────────────┐
│  🎫 Mint Receipt NFT                       │
├────────────────────────────────────────────┤
│  Create an on-chain NFT proof of purchase  │
│  for Order #456                            │
│                                             │
│  Receipt Data:                              │
│  ┌─────────────────────────────────────┐   │
│  │ Order: #456                         │   │
│  │ Seller: Alice's Store               │   │
│  │ Items: 2 products                   │   │
│  │ Total: 100 BZR                      │   │
│  │ Delivered: 2025-11-14               │   │
│  │ IPFS CID: QmReceiptHash...          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  This will mint a unique NFT to your       │
│  wallet as permanent proof of purchase.    │
│                                             │
│  [Cancel]              [Mint NFT]           │
└────────────────────────────────────────────┘
```

---

### 2.4 Order State Machine Enforcement (UX Improvement)

**Actor**: Seller or Buyer

**Problem**: Current UI allows actions that fail on-chain (e.g., "Mark Shipped" when status != PAID)

**Solution**: Frontend validation before transaction submission

**Flow**:
1. User views OrderPage
2. System reads `order.status` from blockchain
3. UI dynamically enables/disables action buttons based on **state machine rules**:

   **State Machine**:
   ```
   PROPOSED → PENDING → PAID → SHIPPED → DELIVERED
                ↓
              CANCELLED (only if PROPOSED/PENDING)
   ```

   **Button Rules**:
   - **"Accept Proposal"**: Only if status == PROPOSED (BazChat orders)
   - **"Mark Paid"**: Only if status == PENDING
   - **"Mark Shipped"**: Only if status == PAID
   - **"Confirm Delivery"**: Only if status == SHIPPED
   - **"Cancel Order"**: Only if status == PROPOSED or PENDING
   - **"Mint NFT"**: Only if status == DELIVERED && receipt_nft_id == null

4. Disabled buttons show tooltip: "Cannot mark shipped until order is paid"

**Edge Cases**:
- Multiple users viewing same order → Real-time sync via WebSocket
- State changes during user action → Show error, refresh page

**Success Criteria**:
- All invalid transitions blocked in UI
- Clear error messages for disabled actions
- Real-time status updates

**Implementation**:
```tsx
// State machine validation
const canMarkShipped = order.status === 'PAID' && isSeller;
const canConfirmDelivery = order.status === 'SHIPPED' && isBuyer;
const canMintNFT = order.status === 'DELIVERED' && !order.receipt_nft_id && isBuyer;

<Button
  onClick={handleMarkShipped}
  disabled={!canMarkShipped}
  title={!canMarkShipped ? 'Order must be paid first' : undefined}
>
  Mark Shipped
</Button>
```

---

## 3. Pages Required

### 3.1 Pages Overview

| Page Name | Route | Status | Priority | Effort | Users |
|-----------|-------|--------|----------|--------|-------|
| **CommissionAnalyticsPage** | `/app/seller/commissions` | ❌ New | P0 | 2 days | Sellers |
| **SaleDetailPage** | `/app/sales/:saleId` | ❌ New | P0 | 1 day | Sellers, Buyers |
| **OrderPage** (Enhancements) | `/app/orders/:orderId` | ⚠️ Update | P0 | 0.5 day | All |

**Total**: 2 new pages + 1 enhancement, 3.5 days effort

---

### 3.2 CommissionAnalyticsPage

**Route**: `/app/seller/commissions`

**Purpose**: Dashboard for sellers to track commission payments

**Layout** (Desktop):
```
┌──────────────────────────────────────────────────────────────┐
│  💰 Commission Analytics                        [Export CSV] │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Total Paid   │  │ Pending      │  │ Avg per Sale │       │
│  │ 1,234.56 BZR │  │ 567.89 BZR   │  │ 12.50 BZR    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Commission Over Time (Line Chart)                       │ │
│  │   200 ┤                                ╭─╮              │ │
│  │   150 ┤                       ╭────────╯ ╰─╮            │ │
│  │   100 ┤              ╭────────╯            ╰─╮          │ │
│  │    50 ┤╭─────────────╯                       ╰──╮       │ │
│  │     0 ┼─────────────────────────────────────────────    │ │
│  │       Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  │ │
│  └─────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│  Top Affiliates:                                             │
│  1. 0xCarol: 150 BZR (12 sales)                              │
│  2. 0xDave: 100 BZR (8 sales)                                │
│  3. 0xEve: 75 BZR (6 sales)                                  │
├──────────────────────────────────────────────────────────────┤
│  Commission History:                                         │
│  [Date Range: Last 30 Days ▼]  [Recipient: All ▼]           │
│  ┌──────┬────────┬───────────┬────────┬──────────────┐      │
│  │ Date │ Sale   │ Recipient │ Amount │ TxHash       │      │
│  ├──────┼────────┼───────────┼────────┼──────────────┤      │
│  │11/14 │ #123   │ Platform  │ 5 BZR  │ 0xabc...def  │      │
│  │11/13 │ #122   │ 0xCarol   │ 3 BZR  │ 0x123...456  │      │
│  │11/12 │ #121   │ Platform  │ 5 BZR  │ 0x789...abc  │      │
│  └──────┴────────┴───────────┴────────┴──────────────┘      │
│                                     Showing 1-10 of 45  [>]  │
└──────────────────────────────────────────────────────────────┘
```

**Components Used**:
- `CommissionSummaryCard` (3 instances - Total/Pending/Avg)
- `CommissionHistoryTable`
- `CommissionChart` (recharts LineChart)
- `TopAffiliatesCard`

**Blockchain Integration**:
- **Query**: `useSaleCommissions()` - Fetch all sales + commissions
- **Subscription**: `useCommissionRecordedEvents()` - Real-time updates

**Data Requirements**:
```typescript
interface CommissionAnalyticsData {
  totalPaid: string;          // Sum of all commission_paid
  totalPending: string;       // Orders completed but not released
  avgPerSale: string;         // totalPaid / salesCount
  history: CommissionRecord[];
  topAffiliates: {
    address: string;
    totalEarned: string;
    salesCount: number;
  }[];
}
```

**Responsiveness**:
- **Desktop**: Full layout with chart
- **Mobile**: Stack cards, collapse chart, horizontal scroll table

**Accessibility**:
- Page title: "Commission Analytics"
- ARIA labels: `aria-label="Total commissions paid"`
- Keyboard nav: Tab through filters

**Testing**:
- [ ] Summary cards show correct totals
- [ ] Chart displays commission trends
- [ ] Table filters work (date, recipient)
- [ ] Export CSV generates valid file
- [ ] Real-time updates on CommissionRecorded event

---

### 3.3 SaleDetailPage

**Route**: `/app/sales/:saleId`

**Purpose**: View full sale details with commission breakdown

**Layout**:
```
┌──────────────────────────────────────────────────────────────┐
│  ← Back to Sales                                 Sale #123   │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Sale Overview                                           │ │
│  │ Sale ID: 123              Order ID: #456                │ │
│  │ Seller: 0xAlice...        Buyer: 0xBob...               │ │
│  │ Amount: 100 BZR           Date: 2025-11-14              │ │
│  └─────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ 💵 Commission Breakdown                                 │ │
│  │                                                          │ │
│  │  Total Sale Amount:        100.00 BZR                   │ │
│  │  ├─ Platform Fee (5%):       5.00 BZR                   │ │
│  │  ├─ Affiliate Commission:    3.00 BZR (commission_paid) │ │
│  │  └─ Seller Net:             92.00 BZR                   │ │
│  │                                                          │ │
│  │  [Pie Chart Visualization]                              │ │
│  └─────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│  Commission History:                                         │
│  • Platform Fee → Treasury: 5 BZR                            │
│    TxHash: 0xabc...def | Block: 1,234,567                   │
│  • Affiliate → 0xCarol: 3 BZR                                │
│    TxHash: 0x123...456 | Block: 1,234,567                   │
├──────────────────────────────────────────────────────────────┤
│  [View Related Order #456]                                   │
└──────────────────────────────────────────────────────────────┘
```

**Components Used**:
- `SaleOverviewCard`
- `CommissionBreakdownCard` (with pie chart)
- `CommissionHistoryList`

**Blockchain Integration**:
- **Query**: `useSale(saleId)` - Get Sale struct
- **Query**: `useSaleCommissions(saleId)` - Get CommissionRecorded events

**Testing**:
- [ ] Sale data matches on-chain
- [ ] Breakdown sums to 100%
- [ ] Related order link works

---

### 3.4 OrderPage Enhancements

**Route**: `/app/orders/:orderId` (existing, needs updates)

**Enhancements**:
1. **Add "Mint Receipt NFT" button** (if status == DELIVERED && !receipt_nft_id)
2. **Disable invalid state transitions** (state machine enforcement)
3. **Show commission link** (if has sale_id) → "View Sale Commissions"

**Changes**:
```tsx
// NEW: Mint NFT button
{order.status === 'DELIVERED' && !order.receipt_nft_id && (
  <Button onClick={() => setShowMintModal(true)}>
    <Award className="w-4 h-4 mr-2" />
    Mint Receipt NFT
  </Button>
)}

// NEW: View Sale link
{order.sale_id && (
  <Link href={`/app/sales/${order.sale_id}`}>
    View Commission Details →
  </Link>
)}

// UPDATED: State machine validation
<Button
  onClick={handleMarkShipped}
  disabled={order.status !== 'PAID' || !isSeller}
  title={order.status !== 'PAID' ? 'Order must be paid first' : undefined}
>
  Mark Shipped
</Button>
```

**Testing**:
- [ ] Mint NFT button appears only when eligible
- [ ] Invalid transitions disabled
- [ ] Sale link navigates correctly

---

## 4. Components Required

### 4.1 Components Overview

| Component | Type | Priority | Effort | Reusable |
|-----------|------|----------|--------|----------|
| **CommissionSummaryCard** | Display | P0 | 0.5 day | Yes |
| **CommissionHistoryTable** | Table | P0 | 1 day | No |
| **SaleOverviewCard** | Display | P0 | 0.5 day | Yes |
| **CommissionBreakdownCard** | Display | P0 | 0.5 day | Yes |
| **NFTReceiptViewer** | Modal | P1 | 0.5 day | Yes |
| **OrderStateBadge** | Display | P0 | 0.5 day | Yes |

**Total**: 6 components, 3.5 days effort

Detailed specs in [COMPONENTS.md](./COMPONENTS.md).

---

## 5. Blockchain Hooks

### 5.1 Hooks Overview

| Hook | Type | Purpose | Effort |
|------|------|---------|--------|
| **useSale** | Query | Fetch single sale by ID | 0.5 day |
| **useSaleCommissions** | Query | Get commissions for sale | 0.5 day |
| **useMintReceipt** | Mutation | Mint receipt NFT | 0.5 day |
| **useOrderTransitions** | Query | Valid state transitions | 0.5 day |

**Total**: 4 hooks, 2 days effort

Detailed implementations in [HOOKS.md](./HOOKS.md).

---

## 6. Data Flow

### 6.1 Commission Recording Flow

```
Order Delivered
     ↓
bazari-commerce.mark_delivered()
     ↓
create_sale_record() internal
     ↓
Sales storage updated (commission_paid field)
     ↓
bazari-affiliate.execute_split() (if has referral)
     ↓
Emit CommissionRecorded event
     ↓
blockchain-events.service.ts listens
     ↓
WebSocket → Frontend
     ↓
useCommissionRecordedEvents() hook
     ↓
React Query cache invalidation
     ↓
CommissionAnalyticsPage updates
```

### 6.2 NFT Receipt Minting Flow

```
User clicks "Mint Receipt NFT"
     ↓
Backend generates receipt JSON → IPFS
     ↓
Frontend receives IPFS CID
     ↓
User confirms in modal
     ↓
Call bazariCommerce.mint_receipt(orderId, ipfsCid)
     ↓
On-chain logic:
  - Generate NFT ID
  - Create Receipt struct
  - Update order.receipt_nft_id
  - Emit ReceiptMinted event
     ↓
Frontend listens to event
     ↓
Success toast + OrderPage update
     ↓
"Mint NFT" button → "View NFT" link
```

---

## 7. Gaps & Implementation Plan

### 7.1 Gap Summary

**Current**: 95% coverage
**Target**: 100% coverage
**Gap**: 5% (3 days effort)

**Gaps**:
1. ❌ Commission tracking UI (2 days)
2. ❌ NFT receipt minting (0.5 day)
3. ❌ State machine enforcement (0.5 day)

### 7.2 Implementation Roadmap

**Day 1-2: Commission Tracking** (P0)
- Create CommissionAnalyticsPage
- Implement useSaleCommissions() hook
- Create CommissionSummaryCard
- Create CommissionHistoryTable
- Create SaleDetailPage
- Create CommissionBreakdownCard

**Day 3: NFT Minting + State Machine** (P0)
- Add "Mint Receipt NFT" button to OrderPage
- Implement useMintReceipt() hook
- Create NFTReceiptViewer modal
- Add state machine validation logic
- Update OrderStateBadge component
- Test end-to-end flows

---

## 8. Testing Requirements

### 8.1 Unit Tests

**Components**:
- [ ] CommissionSummaryCard - Shows correct totals
- [ ] CommissionHistoryTable - Filters work
- [ ] CommissionBreakdownCard - Sums to 100%
- [ ] NFTReceiptViewer - Displays IPFS data

**Hooks**:
- [ ] useSale() - Fetches sale correctly
- [ ] useSaleCommissions() - Returns commission events
- [ ] useMintReceipt() - Mints NFT on-chain
- [ ] useOrderTransitions() - Returns valid transitions

### 8.2 Integration Tests

- [ ] **Commission Flow**:
  1. Order delivered
  2. CommissionRecorded event emitted
  3. Frontend receives event via WebSocket
  4. CommissionAnalyticsPage updates
  5. SaleDetailPage shows breakdown

- [ ] **NFT Minting Flow**:
  1. Order delivered
  2. "Mint NFT" button appears
  3. User clicks → Modal opens
  4. User confirms → Transaction sent
  5. NFT minted on-chain
  6. OrderPage updates to show "View NFT"

- [ ] **State Machine Flow**:
  1. Order created (PENDING)
  2. Cannot mark shipped (button disabled)
  3. Mark paid → status = PAID
  4. Mark shipped button enabled
  5. Mark shipped → status = SHIPPED
  6. Confirm delivery button enabled

### 8.3 E2E Tests

- [ ] Seller views commission analytics → Sees all sales
- [ ] Seller clicks sale → Views breakdown
- [ ] Buyer completes order → Mints NFT
- [ ] Invalid transition blocked → Error message shown

---

## 9. Acceptance Criteria

### 9.1 Functional Requirements

- [ ] **Commission Analytics Page**:
  - [ ] Shows total paid, pending, avg per sale
  - [ ] Table displays all CommissionRecorded events
  - [ ] Filters work (date, recipient)
  - [ ] Chart visualizes trends
  - [ ] Export CSV works

- [ ] **Sale Detail Page**:
  - [ ] Sale data matches on-chain
  - [ ] Breakdown sums to 100%
  - [ ] Commission history shows all records
  - [ ] Related order link works

- [ ] **NFT Receipt Minting**:
  - [ ] Button appears only when eligible
  - [ ] Modal shows correct data
  - [ ] NFT mints on-chain
  - [ ] OrderPage updates after mint

- [ ] **State Machine Enforcement**:
  - [ ] Invalid transitions blocked
  - [ ] Clear error messages
  - [ ] Real-time status sync

### 9.2 Non-Functional Requirements

- [ ] **Performance**:
  - [ ] Page load < 2s
  - [ ] Real-time updates < 500ms
  - [ ] Chart renders < 1s

- [ ] **Security**:
  - [ ] Only seller sees commission analytics
  - [ ] Only order participants can mint NFT
  - [ ] State transitions validated on-chain

- [ ] **Usability**:
  - [ ] Mobile responsive (360px+)
  - [ ] Clear error messages
  - [ ] Intuitive navigation

- [ ] **Accessibility**:
  - [ ] WCAG 2.1 AA compliant
  - [ ] Keyboard navigation
  - [ ] Screen reader support

### 9.3 Success Metrics

- [ ] **Adoption**:
  - [ ] 80%+ sellers view commission analytics
  - [ ] 50%+ buyers mint receipt NFT

- [ ] **Technical**:
  - [ ] Zero critical bugs
  - [ ] < 1% error rate on mutations

---

## 10. Appendix

### 10.1 Commission Recording Example

**On-Chain Event**:
```rust
CommissionRecorded {
  sale_id: 123,
  recipient: 0xCarol..., // Affiliate
  amount: 3_000_000_000_000, // 3 BZR (12 decimals)
  commission_type: Affiliate,
}
```

**Frontend Display**:
```
Affiliate → 0xCarol: 3.00 BZR
TxHash: 0x123...456
Block: 1,234,567
```

### 10.2 Receipt NFT Structure

**On-Chain**:
```rust
Receipt {
  nft_id: 789,
  order_id: 456,
  owner: 0xBob...,
  ipfs_cid: "QmReceiptHash123...",
  minted_at: 1,234,567,
}
```

**IPFS JSON** (QmReceiptHash123...):
```json
{
  "orderId": "456",
  "seller": "Alice's Store",
  "buyer": "0xBob...",
  "items": [
    { "name": "Product A", "qty": 2, "price": "50 BZR" }
  ],
  "total": "100 BZR",
  "deliveredAt": "2025-11-14T10:30:00Z",
  "deliveryProof": "QmProofHash...",
  "signature": "0x..."
}
```

### 10.3 State Machine Validation

**Valid Transitions**:
```typescript
const validTransitions: Record<OrderStatus, OrderStatus[]> = {
  PROPOSED: ['PENDING', 'CANCELLED'],
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [], // Terminal state
  CANCELLED: [], // Terminal state
};

function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return validTransitions[from].includes(to);
}
```

---

**Document Status**: ✅ COMPLETE
**Next Steps**: Implement [COMPONENTS.md](./COMPONENTS.md), [PAGES.md](./PAGES.md), [HOOKS.md](./HOOKS.md)
**Review Date**: 2025-11-17 (after implementation)
