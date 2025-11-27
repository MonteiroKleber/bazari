# bazari-affiliate Pallet - UI/UX Specification

**Status**: Complete UI/UX Specification
**Version**: 1.0
**Priority**: P0 CRITICAL (Viral Growth Feature)
**Coverage**: 50% → 100% (Target Achievement)
**Effort Estimate**: 8 days
**Last Updated**: 2025-11-14
**Dependencies**: bazari-commerce, React Query, D3.js, QR Code Library
**Maintainer**: Bazari UI/UX Team

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

The **bazari-affiliate** pallet implements a **multi-level affiliate commission system** with:
- **5-level referral tree** (DAG structure)
- **Commission decay**: 5% → 2.5% → 1.25% → 0.625% → 0.3125%
- **Merkle DAG privacy**: Only Merkle root on-chain, tree structure private
- **Viral growth mechanics**: Incentivize user acquisition through multi-level rewards

### 1.2 Current Coverage vs Target

| Feature | Current (50%) | Target (100%) | Gap |
|---------|--------------|---------------|-----|
| **Referral Link Generation** | ❌ None | ✅ Full UI with QR | Generate unique links |
| **Referral Tree Visualization** | ❌ None | ✅ D3.js tree (5 levels) | Interactive DAG viewer |
| **Multi-Level Commissions** | ⚠️ Basic display | ✅ Complete breakdown | Level-by-level split |
| **Campaign Management** | ❌ None | ✅ Full CRUD | Store/DAO campaigns |
| **Merkle Proof Verification** | ❌ None | ✅ Privacy UI | Proof viewer |
| **Real-time Commission Tracking** | ❌ None | ✅ WebSocket updates | Live commission flow |

**Gap Summary**: Missing 6 critical components, 2 major pages, 6 blockchain hooks.

### 1.3 Commission Structure (Core Mechanic)

```
Sale: 100 BZR order by User E (Level 0 buyer)
│
├─ Level 0 (Direct Referrer - User D): 5.00 BZR (5.00%)
├─ Level 1 (User C): 2.50 BZR (2.50%)
├─ Level 2 (User B): 1.25 BZR (1.25%)
├─ Level 3 (User A): 0.625 BZR (0.625%)
└─ Level 4 (Genesis User): 0.3125 BZR (0.3125%)
───────────────────────────────────────────────
Total Commission Paid: 9.6875 BZR (9.69% of sale)
Seller Receives: 90.3125 BZR (90.31% of sale)
```

**Formula**: `Level N commission = 5% * (0.5 ^ N)`

### 1.4 Referral Link Format

```
Standard Link: https://bazari.xyz/r/0xAlice
QR Code: Embeds same URL
Registration: When new user clicks link → register_referral(0xAlice) extrinsic
```

### 1.5 Merkle DAG Privacy Model

```
On-Chain Storage:
├─ Merkle Root: 0xabcd1234... (32 bytes)
└─ Total Referrals: 127 (count only)

Off-Chain (Private):
├─ Full referral tree structure (5 levels)
├─ Individual referral relationships
└─ Merkle proofs for verification

Verification:
User submits Merkle proof → Validate against on-chain root → Prove commission eligibility
```

**Privacy Benefit**: Competitors cannot scrape referral network, users maintain confidentiality.

---

## 2. User Flows

### 2.1 Flow 1: Generate Referral Link

**Actors**: Any registered user
**Trigger**: User clicks "Share Bazari" button
**Goal**: Get unique referral link to share

**Steps**:
1. User navigates to `/app/affiliate/referrals` or clicks "Invite Friends" in dashboard
2. UI displays ReferralLinkGenerator component
3. System generates link: `https://bazari.xyz/r/{userAddress}`
4. User sees:
   - Text input with link (read-only)
   - "Copy Link" button
   - QR code (scannable)
   - Social share buttons (WhatsApp, Twitter, Email)
5. User clicks "Copy Link" → Toast: "✅ Link copied to clipboard"
6. User shares link externally

**Blockchain Interaction**: None (link generation is client-side)

**Success Criteria**:
- Link format is valid: `/r/{validAddress}`
- QR code scans correctly on mobile devices
- Copy function works across browsers (clipboard API + fallback)

**Edge Cases**:
- User not registered → Show "Register first" message
- Clipboard API not supported → Show manual copy instructions

---

### 2.2 Flow 2: Share Referral Link

**Actors**: Existing user (referrer)
**Trigger**: User wants to invite friends
**Goal**: Share referral link via multiple channels

**Steps**:
1. User opens ReferralLinkGenerator
2. UI shows sharing options:
   - **Copy Link**: Copies to clipboard
   - **QR Code**: Downloads PNG or displays for scanning
   - **WhatsApp**: Opens WhatsApp with pre-filled message
   - **Twitter**: Opens Twitter with pre-filled tweet
   - **Email**: Opens email client with template
3. User selects channel and shares
4. Friend clicks link → Lands on registration page with `ref={referrerAddress}` param
5. Friend completes registration → Backend calls `register_referral(referrerAddress)` extrinsic
6. Blockchain emits `ReferralRegistered` event
7. Referrer sees real-time update: "🎉 New referral: 0xBob joined!"

**Blockchain Interaction**:
- Write: `bazariAffiliate.register_referral(referrer)` (called on new user signup)
- Event: Listen to `ReferralRegistered { referrer, referee }`

**Success Criteria**:
- Referral relationship persists on-chain
- Referrer sees updated tree immediately (WebSocket event)
- Cannot self-refer (error: "You cannot refer yourself")

**Edge Cases**:
- Referee already has referrer → Error: "Already referred by someone else"
- Invalid referrer address in URL → Ignore, treat as organic signup
- Max depth (5 levels) reached → Allow signup but no deeper commission split

---

### 2.3 Flow 3: View Referral Tree (5-Level DAG Visualization)

**Actors**: User with referrals
**Trigger**: User clicks "My Referral Network" or navigates to `/app/affiliate/referrals`
**Goal**: Visualize multi-level referral tree

**Steps**:
1. User opens ReferralTreePage
2. UI queries blockchain: `bazariAffiliate.directReferrals(userAddress)` (recursive 5 levels)
3. Backend constructs DAG:
   ```
   User (You)
   ├─ Level 1: Alice, Bob, Carol (3 direct)
   │  ├─ Alice → Dave, Eve (2 sub-referrals)
   │  └─ Bob → Frank (1 sub-referral)
   └─ Level 2: Dave, Eve, Frank (3 indirect)
      └─ Dave → Grace, Hank (2 sub-referrals)
         └─ Level 3: Grace, Hank (2 indirect)
            └─ Grace → Ivy (1 sub-referral)
               └─ Level 4: Ivy (1 indirect)
   ```
4. UI renders interactive D3.js tree:
   - **Nodes**: Circles with avatars/initials
   - **Edges**: Lines connecting referrer → referee
   - **Colors**: Level 0 (green), Level 1 (blue), Level 2-4 (gray gradient)
   - **Hover**: Shows tooltip with address, join date, total sales
5. User can:
   - **Zoom in/out**: Mouse wheel or pinch gesture
   - **Pan**: Click and drag
   - **Expand/Collapse**: Click node to toggle children
   - **Search**: Type address to highlight in tree
   - **Filter by Level**: Tabs (All, L1, L2, L3, L4)

**Blockchain Interaction**:
- Read: `bazariAffiliate.directReferrals(address)` (BFS traversal, 5 levels)
- Read: `bazariAffiliate.affiliateStats(address)` (stats per node)

**Success Criteria**:
- Tree renders ≤ 1000 nodes without lag
- Nodes update in real-time when new referral joins (WebSocket)
- Search highlights correct node
- Mobile-responsive (touch gestures work)

**Edge Cases**:
- No referrals → Show empty state: "Share your link to grow your network"
- Very deep tree (> 100 nodes) → Virtualization (render only visible nodes)
- Network error → Show cached tree + "⚠️ Offline mode" banner

---

### 2.4 Flow 4: Earn Multi-Level Commission (Level 0-4)

**Actors**: User in referral tree (Level 0-4)
**Trigger**: Referee (Level 0) makes a purchase
**Goal**: Automatically receive commission based on level

**Steps**:
1. **User E** (buyer, Level 0) completes purchase: 100 BZR order
2. Order completes → bazari-commerce calls `bazariAffiliate.distribute_commissions(orderId, buyerAddress, 100 BZR)`
3. Blockchain traverses referral tree upwards:
   ```
   Level 0 (User D - direct referrer of E):
     Commission = 100 BZR * 5% = 5 BZR
     Transfer 5 BZR to User D
     Emit CommissionDistributed { orderId: 123, affiliate: User D, amount: 5 BZR, level: 0 }

   Level 1 (User C - referrer of D):
     Commission = 100 BZR * 2.5% = 2.5 BZR
     Transfer 2.5 BZR to User C
     Emit CommissionDistributed { orderId: 123, affiliate: User C, amount: 2.5 BZR, level: 1 }

   Level 2 (User B):
     Commission = 100 BZR * 1.25% = 1.25 BZR
     Transfer 1.25 BZR to User B
     Emit CommissionDistributed { orderId: 123, affiliate: User B, amount: 1.25 BZR, level: 2 }

   Level 3 (User A):
     Commission = 100 BZR * 0.625% = 0.625 BZR
     Transfer 0.625 BZR to User A
     Emit CommissionDistributed { orderId: 123, affiliate: User A, amount: 0.625 BZR, level: 3 }

   Level 4 (Genesis User):
     Commission = 100 BZR * 0.3125% = 0.3125 BZR
     Transfer 0.3125 BZR to Genesis User
     Emit CommissionDistributed { orderId: 123, affiliate: Genesis, amount: 0.3125 BZR, level: 4 }
   ```
4. **Frontend (Real-Time Updates)**:
   - Each affiliate receives WebSocket event: `CommissionDistributed`
   - UI shows toast notification: "💰 Earned 5 BZR from referral sale!"
   - AffiliateDashboard updates "Total Earnings" counter (animated)
   - ReferralTreeVisualization highlights commission flow (animated arrows from buyer to all levels)
5. User clicks notification → Opens CommissionBreakdownCard:
   ```
   Order #123: 100 BZR
   ├─ You (Level 0): 5.00 BZR (5.00%)
   ├─ Your Referrer (Level 1): 2.50 BZR (2.50%)
   ├─ Level 2: 1.25 BZR (1.25%)
   ├─ Level 3: 0.625 BZR (0.625%)
   └─ Level 4: 0.3125 BZR (0.3125%)
   ───────────────────────────────────
   Total Commission: 9.6875 BZR (9.69%)
   Your Share: 5.00 BZR ✅ Received
   ```

**Blockchain Interaction**:
- Write: `bazariAffiliate.distribute_commissions(orderId, buyer, amount)` (auto-triggered)
- Events: `CommissionDistributed` × 5 (one per level)
- Read: `bazariAffiliate.orderCommissions(orderId)` (commission history)

**Success Criteria**:
- Commission split is atomic (all or nothing)
- Correct amounts per level (match formula)
- Real-time notifications within 5 seconds of sale
- Commission visible in wallet balance immediately

**Edge Cases**:
- Buyer has no referrer → No commission distributed
- Referral chain < 5 levels → Distribute only to existing levels
- Insufficient buyer balance → Transaction fails (reverts entire sale)

---

### 2.5 Flow 5: Create Campaign (Store/DAO)

**Actors**: Store owner or DAO member
**Trigger**: Store wants to run custom affiliate campaign
**Goal**: Configure campaign with custom rates/depth/duration

**Steps**:
1. **Store owner** navigates to `/app/affiliate/campaigns` or `/app/admin/campaigns` (DAO)
2. Clicks "Create Campaign" button
3. UI shows CreateCampaignForm modal:
   ```
   Campaign Name: [Summer Promo 2025        ]

   Commission Rate (Base):
   [5] % (Level 0)  ← Slider (0-20%)

   Max Depth:
   [5] levels ← Dropdown (1-5)

   Decay Rate:
   [50] % per level ← Slider (0-100%)
   Preview:
     L0: 5.00%
     L1: 2.50%
     L2: 1.25%
     L3: 0.625%
     L4: 0.3125%

   Target Products (Optional):
   [ Select products... ] ← Multi-select

   Duration:
   Start: [2025-06-01] End: [2025-08-31]

   Budget (Max Commission):
   [1000] BZR ← Input

   [Cancel] [Create Campaign]
   ```
4. User fills form and clicks "Create Campaign"
5. Frontend calls `bazariAffiliate.create_campaign(...)` extrinsic
6. Blockchain validates:
   - Store owner has permission
   - Budget is locked in escrow
   - Dates are valid (start < end)
7. Blockchain emits `CampaignCreated` event
8. UI shows success: "✅ Campaign created! ID: 42"
9. User redirected to CampaignDetailPage (`/app/affiliate/campaigns/42`)

**Blockchain Interaction**:
- Write: `bazariAffiliate.create_campaign(storeId, rate, depth, decay, start, end, budget)`
- Event: `CampaignCreated { campaignId, storeId, rate }`
- Read: `bazariAffiliate.campaigns(campaignId)` (campaign details)

**Success Criteria**:
- Campaign appears in active campaigns list
- Affiliates see campaign in available campaigns
- Commission rates override defaults for campaign duration
- Budget depletion pauses campaign automatically

**Edge Cases**:
- Budget exhausted mid-campaign → Auto-pause, notify store owner
- Overlapping campaigns → Use highest commission rate
- Campaign expired → Move to "Expired" tab, no new commissions

---

## 3. Pages Required

### 3.1 Page 1: ReferralTreePage (PRIMARY)

**Route**: `/app/affiliate/referrals`
**Access**: Any authenticated user
**Purpose**: Visualize and manage referral network

#### 3.1.1 Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Header: "My Referral Network"                  [Settings ⚙️] │
├─────────────────────────────────────────────────────────────┤
│ ReferralLinkGenerator (Top Bar)                              │
│ ┌───────────────────────────────────────────────────────────┐│
│ │ Your Link: https://bazari.xyz/r/0xAlice  [Copy] [QR]     ││
│ └───────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ ┌─ Left: Tree Visualization (70%) ─┬─ Right: Stats (30%) ─┐ │
│ │                                   │                       │ │
│ │  Level Tabs:                      │ ReferralStats         │ │
│ │  [All] [L1] [L2] [L3] [L4]        │ ┌───────────────────┐ │ │
│ │                                   │ │ Total Referrals   │ │ │
│ │  Search: [🔍 Search address...]   │ │ 127               │ │ │
│ │                                   │ ├───────────────────┤ │ │
│ │  D3.js Tree:                      │ │ Direct (Level 1)  │ │ │
│ │   ┌───┐                           │ │ 12                │ │ │
│ │   │You│ (Center node)             │ ├───────────────────┤ │ │
│ │   └─┬─┘                           │ │ Active Buyers     │ │ │
│ │     ├─○ Alice (L1)                │ │ 43 (34%)          │ │ │
│ │     │  ├─○ Dave (L2)              │ ├───────────────────┤ │ │
│ │     │  └─○ Eve (L2)               │ │ Total Earnings    │ │ │
│ │     ├─○ Bob (L1)                  │ │ 1,234.56 BZR      │ │ │
│ │     │  └─○ Frank (L2)             │ └───────────────────┘ │ │
│ │     └─○ Carol (L1)                │                       │ │
│ │                                   │ Commission Breakdown  │ │
│ │  [Zoom In] [Zoom Out] [Reset]     │ (CommissionBreakdown) │ │
│ │                                   │ - Level 0: 567 BZR   │ │
│ │                                   │ - Level 1: 283 BZR   │ │
│ │                                   │ - Level 2: 142 BZR   │ │
│ │                                   │ - Level 3: 71 BZR    │ │
│ │                                   │ - Level 4: 35 BZR    │ │
│ └───────────────────────────────────┴───────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### 3.1.2 D3.js Tree Visualization Specifications

**Library**: D3.js v7.8+ (force-directed graph or tree layout)
**Rendering**: SVG or Canvas (Canvas for > 500 nodes)
**Update Strategy**: Real-time (WebSocket triggers re-render)

**Node Structure**:
```typescript
interface TreeNode {
  id: string; // Address
  name: string; // Display name or truncated address
  level: number; // 0-4
  avatar?: string; // IPFS/URL
  children: TreeNode[];
  stats: {
    joinedAt: Date;
    totalSales: number; // BZR
    totalCommissions: number; // BZR earned from this node's sales
    isActive: boolean; // Made purchase in last 30 days
  };
}
```

**Visual Design**:
- **Node**: Circle (radius 20px), gradient fill by level
  - Level 0 (You): Gold gradient (#FFD700)
  - Level 1: Green (#10B981)
  - Level 2: Blue (#3B82F6)
  - Level 3: Purple (#8B5CF6)
  - Level 4: Gray (#6B7280)
- **Avatar**: Circular image inside node (12px radius)
- **Label**: Address below node (truncated: `0x12...ab34`)
- **Edge**: Curved line, arrow pointing to child
- **Hover State**:
  - Node scales to 1.2x
  - Tooltip shows: Name, Address, Join Date, Total Sales, Commissions Earned
- **Active Indicator**: Pulsing ring if `isActive: true`

**Interactions**:
1. **Click Node**: Highlight path to root + all descendants
2. **Double-Click**: Navigate to user profile
3. **Right-Click**: Context menu (Send Message, View Orders, Block)
4. **Zoom**: Mouse wheel (0.5x - 3x range)
5. **Pan**: Click and drag background
6. **Search**: Type address → Zoom to node + highlight

**Performance**:
- **< 100 nodes**: Full render (all levels visible)
- **100-500 nodes**: Collapse levels 3-4 by default
- **> 500 nodes**: Virtualization (only render visible viewport + 1 level padding)

**Animation**:
- **New Referral**: Node fades in (0.5s), pulse effect
- **Commission Flow**: When sale happens, animated particle travels from buyer → all ancestors (2s duration)

#### 3.1.3 Level Filter Tabs

```tsx
<Tabs defaultValue="all">
  <TabsList>
    <TabsTrigger value="all">All (127)</TabsTrigger>
    <TabsTrigger value="l1">Level 1 (12)</TabsTrigger>
    <TabsTrigger value="l2">Level 2 (43)</TabsTrigger>
    <TabsTrigger value="l3">Level 3 (54)</TabsTrigger>
    <TabsTrigger value="l4">Level 4 (18)</TabsTrigger>
  </TabsList>
</Tabs>
```

**Behavior**: Filter tree to show only selected level + ancestors (for context)

#### 3.1.4 Data Loading Strategy

```typescript
// Initial load (server-side cached)
GET /api/affiliates/:address/tree
Response: {
  root: { id, name, level: 0, children: [...] },
  stats: { total: 127, byLevel: [12, 43, 54, 18] }
}

// Real-time updates (WebSocket)
ws://bazari.xyz/blockchain/events
Event: ReferralRegistered { referrer, referee }
→ Add node to tree (optimistic update)
→ Fetch stats (incremental update)
```

---

### 3.2 Page 2: CampaignManagementPage

**Route**: `/app/affiliate/campaigns` (Store) OR `/app/admin/campaigns` (DAO)
**Access**: Store owners, DAO members
**Purpose**: Create and manage affiliate campaigns

#### 3.2.1 Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Header: "Affiliate Campaigns"          [+ Create Campaign]  │
├─────────────────────────────────────────────────────────────┤
│ Tabs: [Active (3)] [Scheduled (1)] [Expired (7)]            │
├─────────────────────────────────────────────────────────────┤
│ Campaign List:                                               │
│                                                              │
│ ┌─ CampaignDetailCard ──────────────────────────────────┐  │
│ │ Summer Promo 2025                         [Edit] [⋮]   │  │
│ │ ID: 42 | Store: Acme Electronics | Active             │  │
│ │                                                         │  │
│ │ Commission: 5% → 2.5% → 1.25% → 0.625% → 0.3125%     │  │
│ │ Duration: Jun 1 - Aug 31, 2025 (92 days left)        │  │
│ │ Budget: 1000 BZR | Spent: 347.5 BZR (34.8%)          │  │
│ │                                                         │  │
│ │ Stats:                                                  │  │
│ │ - Total Referrals: 127                                 │  │
│ │ - Total Sales: 6,950 BZR                              │  │
│ │ - Total Commissions: 347.5 BZR                        │  │
│ │ - Avg per Sale: 2.74 BZR                              │  │
│ │                                                         │  │
│ │ [View Details] [Pause Campaign]                        │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌─ CampaignDetailCard ──────────────────────────────────┐  │
│ │ Back to School 2025                        [Edit] [⋮]  │  │
│ │ ID: 38 | Store: BookStore | Active                    │  │
│ │ ... (similar structure)                                │  │
│ └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### 3.2.2 CreateCampaignForm (Modal)

**Trigger**: Click "+ Create Campaign" button
**Validation**: Client-side + blockchain validation

```tsx
<Dialog>
  <DialogContent className="max-w-2xl">
    <DialogHeader>Create Affiliate Campaign</DialogHeader>

    <Form>
      {/* Basic Info */}
      <FormField name="name" label="Campaign Name" required />
      <FormField name="description" label="Description" type="textarea" />

      {/* Commission Settings */}
      <FormSection title="Commission Structure">
        <FormField
          name="baseRate"
          label="Base Rate (Level 0)"
          type="slider"
          min={0}
          max={20}
          step={0.5}
          default={5}
          suffix="%"
        />

        <FormField
          name="maxDepth"
          label="Max Depth"
          type="select"
          options={[1, 2, 3, 4, 5]}
          default={5}
        />

        <FormField
          name="decayRate"
          label="Decay Rate"
          type="slider"
          min={0}
          max={100}
          step={5}
          default={50}
          suffix="%"
        />

        {/* Live Preview */}
        <CommissionPreview
          baseRate={formData.baseRate}
          depth={formData.maxDepth}
          decay={formData.decayRate}
        />
        {/* Shows: L0: 5%, L1: 2.5%, L2: 1.25%, ... */}
      </FormSection>

      {/* Targeting */}
      <FormSection title="Target Products (Optional)">
        <ProductSelector storeId={storeId} multiple />
      </FormSection>

      {/* Budget & Duration */}
      <FormSection title="Budget & Duration">
        <FormField name="budget" label="Max Budget" type="number" suffix="BZR" required />
        <FormField name="startDate" label="Start Date" type="date" required />
        <FormField name="endDate" label="End Date" type="date" required />
      </FormSection>

      {/* Actions */}
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Campaign'}
        </Button>
      </DialogFooter>
    </Form>
  </DialogContent>
</Dialog>
```

**Blockchain Interaction**:
```typescript
const { mutate: createCampaign } = useCreateCampaign();

const onSubmit = async (data: CampaignFormData) => {
  await createCampaign({
    storeId,
    commissionRate: data.baseRate,
    maxDepth: data.maxDepth,
    decayRate: data.decayRate,
    startDate: toBlockNumber(data.startDate),
    endDate: toBlockNumber(data.endDate),
    budget: toBZR(data.budget),
    products: data.products || [],
  });
};
```

#### 3.2.3 Campaign Stats Dashboard

**Embedded in CampaignDetailCard**, shows:

```
┌─ Stats Overview ─────────────────────────┐
│ Referrals: 127 | Sales: 6,950 BZR       │
│ Commissions: 347.5 BZR (5% avg)         │
│ Budget Usage: [████████░░] 34.8%        │
│ Time Remaining: 92 days                  │
└──────────────────────────────────────────┘

┌─ Top Affiliates ─────────────────────────┐
│ 1. 0xAlice... - 67 BZR (12 referrals)   │
│ 2. 0xBob...   - 54 BZR (9 referrals)    │
│ 3. 0xCarol... - 43 BZR (7 referrals)    │
└──────────────────────────────────────────┘

┌─ Commission Chart ───────────────────────┐
│ (Line chart: Daily commissions paid)     │
│  BZR                                      │
│   20│    ╱╲                               │
│   15│   ╱  ╲    ╱╲                        │
│   10│  ╱    ╲  ╱  ╲                       │
│    5│ ╱      ╲╱    ╲___                   │
│    0└─────────────────────► Days          │
└──────────────────────────────────────────┘
```

---

## 4. Components Required

### 4.1 Component 1: ReferralLinkGenerator

**Purpose**: Generate and display referral link with sharing options
**Location**: `src/components/affiliate/ReferralLinkGenerator.tsx`

```tsx
interface ReferralLinkGeneratorProps {
  userAddress: string;
  variant?: 'full' | 'compact'; // Full: With QR, Compact: Link only
}

export function ReferralLinkGenerator({ userAddress, variant = 'full' }: Props) {
  const referralLink = `https://bazari.xyz/r/${userAddress}`;
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied to clipboard!');
  };

  const shareViaWhatsApp = () => {
    const message = encodeURIComponent(
      `Join Bazari and get rewards! Use my referral link: ${referralLink}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share Your Referral Link</CardTitle>
        <CardDescription>
          Invite friends and earn commissions on their purchases
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Link Display */}
        <div className="flex gap-2">
          <Input
            value={referralLink}
            readOnly
            className="font-mono text-sm"
          />
          <Button onClick={copyToClipboard} variant="outline">
            {copied ? (
              <><CheckIcon className="w-4 h-4 mr-2" /> Copied</>
            ) : (
              <><CopyIcon className="w-4 h-4 mr-2" /> Copy</>
            )}
          </Button>
        </div>

        {/* QR Code (Full variant only) */}
        {variant === 'full' && (
          <div className="flex justify-center py-4">
            <QRCodeSVG
              value={referralLink}
              size={200}
              level="H"
              includeMargin
            />
          </div>
        )}

        {/* Social Share Buttons */}
        <div className="flex gap-2">
          <Button onClick={shareViaWhatsApp} variant="outline" className="flex-1">
            <WhatsAppIcon /> WhatsApp
          </Button>
          <Button onClick={() => shareViaTwitter(referralLink)} variant="outline" className="flex-1">
            <TwitterIcon /> Twitter
          </Button>
          <Button onClick={() => shareViaEmail(referralLink)} variant="outline" className="flex-1">
            <MailIcon /> Email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Dependencies**:
- `qrcode.react` - QR code generation
- `lucide-react` - Icons

**Props**:
- `userAddress` (required): User's blockchain address
- `variant`: Display mode (full with QR, compact link only)

**State**:
- `copied`: Boolean for copy feedback

**Events**:
- `onCopy`: Track analytics (GTM event)

---

### 4.2 Component 2: ReferralTreeVisualization

**Purpose**: Interactive D3.js tree diagram of referral network
**Location**: `src/components/affiliate/ReferralTreeVisualization.tsx`

```tsx
interface ReferralTreeVisualizationProps {
  userAddress: string;
  maxDepth?: number; // Default: 5
  onNodeClick?: (node: TreeNode) => void;
}

export function ReferralTreeVisualization({
  userAddress,
  maxDepth = 5,
  onNodeClick
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { data: tree, isLoading } = useReferralTree(userAddress, maxDepth);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!tree || !svgRef.current) return;

    // D3.js rendering logic
    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 600;

    // Create tree layout
    const treeLayout = d3.tree<TreeNode>()
      .size([width - 100, height - 100]);

    const root = d3.hierarchy(tree);
    const treeData = treeLayout(root);

    // Clear previous
    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', 'translate(50, 50)');

    // Zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Draw edges
    g.selectAll('.link')
      .data(treeData.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3.linkVertical()
        .x((d: any) => d.x)
        .y((d: any) => d.y)
      )
      .attr('fill', 'none')
      .attr('stroke', '#cbd5e0')
      .attr('stroke-width', 2);

    // Draw nodes
    const nodes = g.selectAll('.node')
      .data(treeData.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .on('click', (event, d) => {
        onNodeClick?.(d.data);
      });

    // Node circles
    nodes.append('circle')
      .attr('r', 20)
      .attr('fill', (d) => getLevelColor(d.data.level))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).transition().attr('r', 24);
        showTooltip(event, d.data);
      })
      .on('mouseout', function() {
        d3.select(this).transition().attr('r', 20);
        hideTooltip();
      });

    // Node labels
    nodes.append('text')
      .attr('dy', 35)
      .attr('text-anchor', 'middle')
      .text((d) => truncateAddress(d.data.id))
      .style('font-size', '10px')
      .style('fill', '#4a5568');

    // Avatar images (if available)
    nodes.append('image')
      .attr('x', -12)
      .attr('y', -12)
      .attr('width', 24)
      .attr('height', 24)
      .attr('href', (d) => d.data.avatar || getDefaultAvatar(d.data.id))
      .attr('clip-path', 'circle(12px)');

  }, [tree, selectedLevel, searchQuery]);

  if (isLoading) {
    return <Skeleton className="w-full h-[600px]" />;
  }

  if (!tree) {
    return (
      <EmptyState
        icon={<UsersIcon />}
        title="No Referrals Yet"
        description="Share your referral link to grow your network"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex justify-between items-center">
        {/* Level Filter */}
        <Tabs value={selectedLevel?.toString() || 'all'} onValueChange={(v) => setSelectedLevel(v === 'all' ? null : parseInt(v))}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="1">Level 1</TabsTrigger>
            <TabsTrigger value="2">Level 2</TabsTrigger>
            <TabsTrigger value="3">Level 3</TabsTrigger>
            <TabsTrigger value="4">Level 4</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search */}
        <Input
          placeholder="Search address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* SVG Tree */}
      <svg ref={svgRef} width="100%" height="600" className="border rounded-lg" />

      {/* Zoom Controls */}
      <div className="flex gap-2 justify-center">
        <Button variant="outline" onClick={() => zoomIn()}>Zoom In</Button>
        <Button variant="outline" onClick={() => zoomOut()}>Zoom Out</Button>
        <Button variant="outline" onClick={() => resetZoom()}>Reset</Button>
      </div>
    </div>
  );
}

// Helper functions
function getLevelColor(level: number): string {
  const colors = ['#FFD700', '#10B981', '#3B82F6', '#8B5CF6', '#6B7280'];
  return colors[level] || '#6B7280';
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
```

**Dependencies**:
- `d3` v7.8+ - Tree layout, zoom, animations
- Custom hook `useReferralTree` - Fetch tree data

**Performance Optimizations**:
- Canvas fallback for > 500 nodes
- Virtual rendering (only visible viewport)
- Debounced search (300ms)
- Memoized level colors

---

### 4.3 Component 3: ReferralStats

**Purpose**: Display aggregate statistics
**Location**: `src/components/affiliate/ReferralStats.tsx`

```tsx
interface ReferralStatsProps {
  userAddress: string;
}

export function ReferralStats({ userAddress }: Props) {
  const { data: stats } = useAffiliateStats(userAddress);

  if (!stats) return <Skeleton className="h-64" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Referral Stats</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Total Referrals */}
        <StatItem
          label="Total Referrals"
          value={stats.totalReferrals}
          icon={<UsersIcon />}
          trend={stats.referralsTrend} // "+12% this month"
        />

        {/* Direct Referrals (Level 1) */}
        <StatItem
          label="Direct Referrals"
          value={stats.directReferrals}
          icon={<UserPlusIcon />}
        />

        {/* Active Buyers */}
        <StatItem
          label="Active Buyers"
          value={`${stats.activeBuyers} (${stats.activeBuyersPercent}%)`}
          icon={<ShoppingCartIcon />}
          description="Made purchase in last 30 days"
        />

        {/* Total Earnings */}
        <StatItem
          label="Total Earnings"
          value={`${formatBZR(stats.totalCommissionEarned)} BZR`}
          icon={<CoinsIcon />}
          variant="highlight"
          trend={stats.earningsTrend}
        />

        {/* Breakdown by Level */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Earnings by Level</h4>
          {stats.earningsByLevel.map((amount, level) => (
            <div key={level} className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground">Level {level}</span>
              <span className="font-medium">{formatBZR(amount)} BZR</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Data Source**:
```typescript
// Hook: useAffiliateStats
const { data } = useBlockchainQuery(
  ['affiliateStats', userAddress],
  async () => {
    const api = await getApi();
    const stats = await api.query.bazariAffiliate.affiliateStats(userAddress);
    return stats.toJSON();
  }
);
```

---

### 4.4 Component 4: CommissionBreakdownCard

**Purpose**: Show multi-level commission split for a specific sale
**Location**: `src/components/affiliate/CommissionBreakdownCard.tsx`

```tsx
interface CommissionBreakdownCardProps {
  orderId: number;
  orderAmount: number; // BZR
  commissions: {
    level: number;
    affiliate: string;
    amount: number;
    percentage: number;
  }[];
}

export function CommissionBreakdownCard({ orderId, orderAmount, commissions }: Props) {
  const totalCommission = commissions.reduce((sum, c) => sum + c.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commission Breakdown - Order #{orderId}</CardTitle>
        <CardDescription>
          Order Amount: {formatBZR(orderAmount)} BZR
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Visual Tree */}
        <div className="space-y-2 mb-4">
          {commissions.map((c, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 p-2 rounded hover:bg-muted transition"
              style={{ paddingLeft: `${c.level * 20 + 8}px` }}
            >
              {/* Level Indicator */}
              <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: getLevelColor(c.level) }} />

              {/* Affiliate Info */}
              <div className="flex-1">
                <div className="font-medium text-sm">
                  {c.level === 0 ? 'You' : `Level ${c.level}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {truncateAddress(c.affiliate)}
                </div>
              </div>

              {/* Amount */}
              <div className="text-right">
                <div className="font-bold">{formatBZR(c.amount)} BZR</div>
                <div className="text-xs text-muted-foreground">{c.percentage.toFixed(2)}%</div>
              </div>

              {/* Arrow */}
              {idx < commissions.length - 1 && (
                <ArrowRightIcon className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="pt-4 border-t flex justify-between items-center">
          <span className="font-medium">Total Commission Paid:</span>
          <span className="font-bold text-lg">{formatBZR(totalCommission)} BZR</span>
        </div>

        {/* Seller Receives */}
        <div className="flex justify-between items-center text-muted-foreground text-sm mt-2">
          <span>Seller Receives:</span>
          <span>{formatBZR(orderAmount - totalCommission)} BZR ({((1 - totalCommission / orderAmount) * 100).toFixed(2)}%)</span>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Visual Enhancement**: Animated flow when commission distributes (particles flowing from buyer to each level)

---

### 4.5 Component 5: CreateCampaignForm

**Purpose**: Form to create affiliate campaign
**Location**: `src/components/affiliate/CreateCampaignForm.tsx`

*(Already detailed in Section 3.2.2)*

**Key Features**:
- Live commission preview
- Date validation (start < end)
- Budget validation (> 0)
- Product multi-select
- Blockchain transaction handling

---

### 4.6 Component 6: CampaignDetailCard

**Purpose**: Display campaign summary and stats
**Location**: `src/components/affiliate/CampaignDetailCard.tsx`

```tsx
interface CampaignDetailCardProps {
  campaign: {
    id: number;
    name: string;
    storeId: number;
    storeName: string;
    commissionRate: number;
    maxDepth: number;
    decayRate: number;
    startDate: Date;
    endDate: Date;
    budget: number;
    spent: number;
    stats: {
      totalReferrals: number;
      totalSales: number;
      totalCommissions: number;
    };
    status: 'active' | 'scheduled' | 'paused' | 'expired';
  };
  onEdit?: () => void;
  onPause?: () => void;
}

export function CampaignDetailCard({ campaign, onEdit, onPause }: Props) {
  const daysRemaining = differenceInDays(campaign.endDate, new Date());
  const budgetPercent = (campaign.spent / campaign.budget) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{campaign.name}</CardTitle>
            <CardDescription>
              ID: {campaign.id} | Store: {campaign.storeName}
            </CardDescription>
          </div>

          <div className="flex gap-2">
            <Badge variant={getStatusVariant(campaign.status)}>
              {campaign.status.toUpperCase()}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">⋮</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={onPause}>
                  {campaign.status === 'paused' ? 'Resume' : 'Pause'}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Commission Structure */}
        <div>
          <h4 className="text-sm font-medium mb-2">Commission Structure</h4>
          <CommissionLadder
            baseRate={campaign.commissionRate}
            maxDepth={campaign.maxDepth}
            decayRate={campaign.decayRate}
          />
        </div>

        {/* Duration */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Duration:</span>
          <span>
            {format(campaign.startDate, 'MMM d')} - {format(campaign.endDate, 'MMM d, yyyy')}
            {campaign.status === 'active' && (
              <span className="text-muted-foreground ml-2">({daysRemaining} days left)</span>
            )}
          </span>
        </div>

        {/* Budget */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Budget:</span>
            <span>{formatBZR(campaign.spent)} / {formatBZR(campaign.budget)} BZR ({budgetPercent.toFixed(1)}%)</span>
          </div>
          <Progress value={budgetPercent} className="h-2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div>
            <div className="text-2xl font-bold">{campaign.stats.totalReferrals}</div>
            <div className="text-xs text-muted-foreground">Referrals</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{formatBZR(campaign.stats.totalSales)}</div>
            <div className="text-xs text-muted-foreground">Sales (BZR)</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{formatBZR(campaign.stats.totalCommissions)}</div>
            <div className="text-xs text-muted-foreground">Commissions</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button variant="outline" className="flex-1" onClick={() => navigateTo(`/app/affiliate/campaigns/${campaign.id}`)}>
            View Details
          </Button>
          {campaign.status === 'active' && (
            <Button variant="secondary" onClick={onPause}>
              Pause Campaign
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper component
function CommissionLadder({ baseRate, maxDepth, decayRate }: Props) {
  const rates = Array.from({ length: maxDepth }, (_, i) =>
    baseRate * Math.pow(1 - decayRate / 100, i)
  );

  return (
    <div className="flex items-center gap-1 text-sm">
      {rates.map((rate, i) => (
        <React.Fragment key={i}>
          <span className={i === 0 ? 'font-bold' : ''}>{rate.toFixed(2)}%</span>
          {i < rates.length - 1 && <span className="text-muted-foreground">→</span>}
        </React.Fragment>
      ))}
    </div>
  );
}
```

---

### 4.7 Component 7: MerkleProofViewer

**Purpose**: Verify commission split using Merkle proof
**Location**: `src/components/affiliate/MerkleProofViewer.tsx`

```tsx
interface MerkleProofViewerProps {
  orderId: number;
  userAddress: string;
}

export function MerkleProofViewer({ orderId, userAddress }: Props) {
  const [showProof, setShowProof] = useState(false);
  const { data: proof, isLoading } = useMerkleProof(orderId, userAddress);

  const verifyProof = async () => {
    if (!proof) return;

    // Client-side verification
    const api = await getApi();
    const merkleRoot = await api.query.bazariAffiliate.affiliateStats(userAddress);
    const isValid = verifyMerkleProof(proof.path, proof.leaf, merkleRoot.merkle_root);

    if (isValid) {
      toast.success('✅ Commission verified on-chain!');
    } else {
      toast.error('❌ Invalid proof');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy-Preserving Verification</CardTitle>
        <CardDescription>
          Verify your commission without exposing the referral tree
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Privacy Note */}
        <Alert>
          <ShieldCheckIcon className="h-4 w-4" />
          <AlertTitle>Your Referral Network is Private</AlertTitle>
          <AlertDescription>
            Only the Merkle root is stored on-chain. Use this proof to verify your commission eligibility without revealing your network structure.
          </AlertDescription>
        </Alert>

        {/* Verify Button */}
        <Button onClick={verifyProof} disabled={isLoading} className="w-full">
          {isLoading ? 'Generating Proof...' : 'Verify Commission'}
        </Button>

        {/* Show Proof Details */}
        {showProof && proof && (
          <div className="space-y-2">
            <Button variant="link" onClick={() => setShowProof(!showProof)}>
              {showProof ? 'Hide' : 'Show'} Merkle Proof
            </Button>

            {showProof && (
              <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-x-auto">
                <div className="mb-2">
                  <strong>Leaf (Your Commission):</strong>
                  <div className="text-muted-foreground">{proof.leaf}</div>
                </div>

                <div className="mb-2">
                  <strong>Merkle Path:</strong>
                  {proof.path.map((hash, i) => (
                    <div key={i} className="text-muted-foreground">
                      Level {i}: {hash}
                    </div>
                  ))}
                </div>

                <div>
                  <strong>Root (On-Chain):</strong>
                  <div className="text-muted-foreground">{proof.root}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Merkle proof verification (client-side)
function verifyMerkleProof(path: string[], leaf: string, root: string): boolean {
  let hash = leaf;

  for (const sibling of path) {
    hash = keccak256(
      hash < sibling
        ? concat([hash, sibling])
        : concat([sibling, hash])
    );
  }

  return hash === root;
}
```

**Dependencies**:
- `ethers` or `@polkadot/util-crypto` - Hash functions
- Custom hook `useMerkleProof` - Generate proof off-chain

---

## 5. Blockchain Hooks

### 5.1 Query Hooks (Read Data)

#### 5.1.1 useReferralTree

**Purpose**: Fetch user's referral tree (recursive up to 5 levels)

```typescript
// File: src/hooks/blockchain/useReferralTree.ts
import { useBlockchainQuery } from '@/hooks/useBlockchainQuery';
import { getApi } from '@/services/polkadot';

interface TreeNode {
  id: string; // Address
  level: number;
  children: TreeNode[];
  stats: {
    joinedAt: Date;
    totalSales: number;
    totalCommissions: number;
  };
}

export function useReferralTree(userAddress: string, maxDepth: number = 5) {
  return useBlockchainQuery<TreeNode>(
    ['referralTree', userAddress, maxDepth],
    async () => {
      const api = await getApi();

      // Recursive function to build tree
      const buildTree = async (address: string, currentLevel: number): Promise<TreeNode> => {
        if (currentLevel >= maxDepth) {
          return { id: address, level: currentLevel, children: [], stats: {} };
        }

        // Fetch direct referrals
        const directReferrals = await api.query.bazariAffiliate.directReferrals(address);
        const referralList = directReferrals.toJSON() as string[];

        // Fetch stats
        const stats = await api.query.bazariAffiliate.affiliateStats(address);

        // Recursively fetch children
        const children = await Promise.all(
          referralList.map((childAddress) => buildTree(childAddress, currentLevel + 1))
        );

        return {
          id: address,
          level: currentLevel,
          children,
          stats: stats.toJSON(),
        };
      };

      return buildTree(userAddress, 0);
    },
    {
      staleTime: 30000, // Cache for 30s
      cacheTime: 300000, // Keep in cache for 5min
    }
  );
}
```

**Optimization**: Use server-side caching (PostgreSQL) for trees > 100 nodes.

---

#### 5.1.2 useCampaigns

**Purpose**: Fetch active affiliate campaigns

```typescript
// File: src/hooks/blockchain/useCampaigns.ts
export function useCampaigns(storeId?: number, status?: 'active' | 'scheduled' | 'expired') {
  return useBlockchainQuery(
    ['campaigns', storeId, status],
    async () => {
      const api = await getApi();

      // Fetch all campaigns (iterate storage map)
      const entries = await api.query.bazariAffiliate.campaigns.entries();

      const campaigns = entries.map(([key, value]) => ({
        id: key.args[0].toNumber(),
        ...value.toJSON(),
      }));

      // Filter by storeId and status
      return campaigns.filter((c) => {
        if (storeId && c.storeId !== storeId) return false;
        if (status && getCampaignStatus(c) !== status) return false;
        return true;
      });
    }
  );
}

function getCampaignStatus(campaign: Campaign): 'active' | 'scheduled' | 'expired' {
  const now = Date.now();
  if (now < campaign.startDate) return 'scheduled';
  if (now > campaign.endDate) return 'expired';
  if (campaign.paused) return 'paused';
  return 'active';
}
```

---

#### 5.1.3 useCommissionHistory

**Purpose**: Fetch commission earnings history

```typescript
// File: src/hooks/blockchain/useCommissionHistory.ts
export function useCommissionHistory(userAddress: string, limit: number = 50) {
  return useBlockchainQuery(
    ['commissionHistory', userAddress, limit],
    async () => {
      const api = await getApi();

      // Subscribe to CommissionDistributed events (off-chain indexer recommended)
      // Alternative: Query orderCommissions storage for orders where user is in commission list

      // Using backend API (recommended for production)
      const response = await fetch(`/api/affiliates/${userAddress}/commissions?limit=${limit}`);
      return response.json();
    }
  );
}
```

**Response Schema**:
```typescript
interface CommissionRecord {
  orderId: number;
  orderAmount: number;
  affiliate: string;
  amount: number;
  level: number;
  timestamp: Date;
  txHash: string;
}
```

---

### 5.2 Mutation Hooks (Write Data)

#### 5.2.1 useRegisterReferral

**Purpose**: Register new referral relationship

```typescript
// File: src/hooks/blockchain/useRegisterReferral.ts
import { useBlockchainTx } from '@/hooks/useBlockchainTx';

export function useRegisterReferral() {
  return useBlockchainTx(
    'register_referral',
    async (referrerAddress: string) => {
      const api = await getApi();
      const tx = api.tx.bazariAffiliate.registerReferral(referrerAddress);
      return tx;
    },
    {
      onSuccess: (data) => {
        toast.success('✅ Referral registered!');
        // Invalidate cache
        queryClient.invalidateQueries(['referralTree']);
        queryClient.invalidateQueries(['affiliateStats']);
      },
      onError: (error) => {
        if (error.message.includes('AlreadyReferred')) {
          toast.error('You already have a referrer');
        } else if (error.message.includes('SelfReferral')) {
          toast.error('You cannot refer yourself');
        } else {
          toast.error('Failed to register referral');
        }
      },
    }
  );
}
```

**Usage**:
```typescript
const { mutate: registerReferral, isLoading } = useRegisterReferral();

// In registration flow
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const ref = urlParams.get('ref');

  if (ref && isValidAddress(ref)) {
    registerReferral(ref);
  }
}, []);
```

---

#### 5.2.2 useCreateCampaign

**Purpose**: Create affiliate campaign

```typescript
// File: src/hooks/blockchain/useCreateCampaign.ts
export function useCreateCampaign() {
  return useBlockchainTx(
    'create_campaign',
    async (params: CreateCampaignParams) => {
      const api = await getApi();
      const tx = api.tx.bazariAffiliate.createCampaign(
        params.storeId,
        params.commissionRate,
        params.maxDepth,
        params.decayRate,
        params.startDate,
        params.endDate,
        params.budget
      );
      return tx;
    },
    {
      onSuccess: (data) => {
        toast.success('✅ Campaign created!');
        queryClient.invalidateQueries(['campaigns']);
      },
    }
  );
}
```

---

### 5.3 Subscription Hooks (Real-Time Events)

#### 5.3.1 useCommissionSplitEvents

**Purpose**: Real-time commission notifications

```typescript
// File: src/hooks/blockchain/useCommissionSplitEvents.ts
import { useBlockchainEvent } from '@/hooks/useBlockchainEvent';

export function useCommissionSplitEvents(userAddress: string) {
  useBlockchainEvent(
    'bazariAffiliate',
    'CommissionDistributed',
    (event) => {
      const { order_id, affiliate, amount, level } = event.data;

      // Only notify if current user received commission
      if (affiliate === userAddress) {
        toast.success(
          `💰 Earned ${formatBZR(amount)} BZR from referral sale!`,
          {
            action: {
              label: 'View',
              onClick: () => navigate(`/app/orders/${order_id}`),
            },
          }
        );

        // Show commission flow animation
        triggerCommissionAnimation(order_id, level, amount);

        // Update stats
        queryClient.invalidateQueries(['affiliateStats', userAddress]);
        queryClient.invalidateQueries(['commissionHistory', userAddress]);
      }
    }
  );
}
```

**Usage in Component**:
```typescript
function AffiliateDashboard() {
  const { address } = useWallet();

  // Subscribe to real-time commission events
  useCommissionSplitEvents(address);

  return <div>...</div>;
}
```

---

## 6. Data Flow

### 6.1 Referral Registration Flow

```
1. New User Clicks Referral Link
   https://bazari.xyz/r/0xAlice
   │
   ↓
2. Registration Page Loads
   - Extract ref=0xAlice from URL
   - Store in localStorage (persist across steps)
   │
   ↓
3. User Completes Registration
   - Create account
   - Connect wallet (0xBob)
   │
   ↓
4. Backend Triggers Blockchain Call
   POST /api/auth/register
   {
     "address": "0xBob",
     "referrer": "0xAlice"
   }
   │
   ↓
5. Blockchain Extrinsic
   api.tx.bazariAffiliate.registerReferral(0xAlice)
   - Validate: 0xBob != 0xAlice (no self-referral)
   - Validate: 0xBob has no referrer yet
   - Store: ReferrerOf[0xBob] = 0xAlice
   - Store: DirectReferrals[0xAlice].push(0xBob)
   - Update: AffiliateStats[0xAlice].directReferrals += 1
   │
   ↓
6. Event Emitted
   ReferralRegistered { referrer: 0xAlice, referee: 0xBob }
   │
   ↓
7. Frontend Real-Time Update (WebSocket)
   - Alice's dashboard: "🎉 New referral: 0xBob joined!"
   - Alice's referral tree: Add node (0xBob)
   - Alice's stats: Total Referrals: 1 → 2
```

---

### 6.2 Sale → Commission Split Flow

```
1. Buyer (0xEve) Completes Purchase
   Order: 100 BZR
   │
   ↓
2. bazari-commerce.complete_order(orderId)
   - Validate delivery confirmed
   - Release funds from escrow
   │
   ↓
3. Trigger Commission Distribution (Auto)
   bazari-commerce calls:
   bazariAffiliate.distribute_commissions(orderId, 0xEve, 100 BZR)
   │
   ↓
4. Traverse Referral Tree Upwards
   ReferrerOf[0xEve] = 0xDave (Level 0)
   ReferrerOf[0xDave] = 0xCarol (Level 1)
   ReferrerOf[0xCarol] = 0xBob (Level 2)
   ReferrerOf[0xBob] = 0xAlice (Level 3)
   ReferrerOf[0xAlice] = 0xGenesis (Level 4)
   │
   ↓
5. Calculate & Transfer Commissions
   Level 0 (0xDave):
     commission = 100 * 5% = 5 BZR
     Transfer: 0xEve → 0xDave (5 BZR)
     Emit: CommissionDistributed { orderId, 0xDave, 5 BZR, level: 0 }

   Level 1 (0xCarol):
     commission = 100 * 2.5% = 2.5 BZR
     Transfer: 0xEve → 0xCarol (2.5 BZR)
     Emit: CommissionDistributed { orderId, 0xCarol, 2.5 BZR, level: 1 }

   Level 2 (0xBob):
     commission = 100 * 1.25% = 1.25 BZR
     Transfer: 0xEve → 0xBob (1.25 BZR)
     Emit: CommissionDistributed { orderId, 0xBob, 1.25 BZR, level: 2 }

   Level 3 (0xAlice):
     commission = 100 * 0.625% = 0.625 BZR
     Transfer: 0xEve → 0xAlice (0.625 BZR)
     Emit: CommissionDistributed { orderId, 0xAlice, 0.625 BZR, level: 3 }

   Level 4 (0xGenesis):
     commission = 100 * 0.3125% = 0.3125 BZR
     Transfer: 0xEve → 0xGenesis (0.3125 BZR)
     Emit: CommissionDistributed { orderId, 0xGenesis, 0.3125 BZR, level: 4 }
   │
   ↓
6. Store Commission History
   OrderCommissions[orderId] = [
     (0xDave, 5 BZR, 0),
     (0xCarol, 2.5 BZR, 1),
     (0xBob, 1.25 BZR, 2),
     (0xAlice, 0.625 BZR, 3),
     (0xGenesis, 0.3125 BZR, 4)
   ]
   │
   ↓
7. Update Affiliate Stats (Each Recipient)
   AffiliateStats[0xDave].total_commission_earned += 5 BZR
   AffiliateStats[0xCarol].total_commission_earned += 2.5 BZR
   ... (for all levels)
   │
   ↓
8. Frontend Real-Time Updates (WebSocket)
   Each affiliate receives notification:
   - 0xDave: "💰 Earned 5 BZR from referral sale!"
   - 0xCarol: "💰 Earned 2.5 BZR from referral sale!"
   - ... (all levels)

   UI Updates:
   - AffiliateDashboard: Total Earnings counter animated
   - ReferralTreeVisualization: Commission flow animation (particles)
   - CommissionBreakdownCard: Show detailed split
```

---

### 6.3 Merkle Proof Verification Flow

```
1. User Wants to Verify Commission
   Click "Verify Commission" button
   │
   ↓
2. Frontend Requests Merkle Proof (Off-Chain)
   GET /api/affiliates/{address}/merkle-proof?orderId={orderId}
   │
   ↓
3. Backend Generates Proof
   - Reconstruct user's referral tree (from cache/DB)
   - Build Merkle tree from all commission records
   - Extract proof path (leaf → root)
   │
   ↓
4. Return Proof to Frontend
   {
     "leaf": "0x...", // Hash of user's commission
     "path": ["0x...", "0x...", "0x..."], // Sibling hashes
     "root": "0x..." // Merkle root
   }
   │
   ↓
5. Frontend Verifies Locally
   hash = keccak256(leaf)
   for sibling in path:
     hash = keccak256(hash + sibling)

   valid = (hash == root)
   │
   ↓
6. Query On-Chain Root
   api.query.bazariAffiliate.affiliateStats(address).merkle_root
   │
   ↓
7. Compare Roots
   if (localRoot == onChainRoot):
     ✅ "Commission verified on-chain!"
   else:
     ❌ "Invalid proof"
   │
   ↓
8. Display Result to User
   - Green checkmark: "Your commission is verified"
   - Show proof details (optional, for transparency)
```

---

## 7. Gaps & Implementation Plan

### 7.1 Gap Analysis (From UI_UX_GAP_ANALYSIS.md Section 6)

**Current Coverage: 50%**

| Feature | Current State | Target State | Gap |
|---------|--------------|--------------|-----|
| Referral Link Generation | ❌ None | ✅ Full UI with QR | **100% gap** |
| Referral Tree Visualization | ❌ None | ✅ D3.js tree | **100% gap** |
| Multi-Level Commission Display | ⚠️ Basic | ✅ Complete breakdown | **50% gap** |
| Campaign Management | ❌ None | ✅ Full CRUD | **100% gap** |
| Merkle Proof Verification | ❌ None | ✅ Privacy UI | **100% gap** |
| Real-Time Updates | ❌ None | ✅ WebSocket | **100% gap** |

**Total Implementation Effort**: **8 days** (P0 CRITICAL)

---

### 7.2 Implementation Roadmap (8 Days)

#### Day 1-2: Referral Link & QR Code (2 days)
**Goal**: Users can generate and share referral links

**Tasks**:
- [ ] Create ReferralLinkGenerator component
  - Text input (read-only)
  - Copy to clipboard functionality
  - QR code generation (qrcode.react)
  - Social share buttons (WhatsApp, Twitter, Email)
- [ ] Implement clipboard API with fallback
- [ ] Add referral link to user profile
- [ ] Create `/r/:address` redirect route (signup with ref param)
- [ ] Backend: Auto-call `register_referral` on signup if ref exists

**Deliverables**:
- ✅ ReferralLinkGenerator component
- ✅ QR code downloads
- ✅ Social share integration
- ✅ Redirect route working

---

#### Day 3-5: Referral Tree Visualization (3 days)
**Goal**: Interactive D3.js tree showing 5-level referral network

**Tasks**:
- [ ] Create ReferralTreeVisualization component
  - D3.js tree layout (force-directed or hierarchical)
  - Node rendering (circles with avatars)
  - Edge rendering (curved lines)
  - Zoom and pan interactions
- [ ] Implement useReferralTree hook (recursive BFS)
- [ ] Add level filter tabs (All, L1, L2, L3, L4)
- [ ] Add search functionality (highlight node)
- [ ] Implement tooltip on hover (stats)
- [ ] Add real-time updates (WebSocket ReferralRegistered event)
- [ ] Performance optimization (virtualization for > 500 nodes)
- [ ] Create ReferralStats sidebar component

**Deliverables**:
- ✅ ReferralTreePage (/app/affiliate/referrals)
- ✅ D3.js tree with zoom/pan
- ✅ Level filtering
- ✅ Real-time node addition
- ✅ ReferralStats component

---

#### Day 6: Commission Breakdown & History (1 day)
**Goal**: Show multi-level commission splits and earnings history

**Tasks**:
- [ ] Create CommissionBreakdownCard component
  - Visual tree of level 0-4 splits
  - Highlight user's share
  - Animated commission flow (optional)
- [ ] Implement useCommissionHistory hook
- [ ] Add commission history table to AffiliateDashboard
- [ ] Integrate with OrderPage (show commission split)

**Deliverables**:
- ✅ CommissionBreakdownCard component
- ✅ Commission history table
- ✅ Integration with existing pages

---

#### Day 7: Campaign Management (1 day)
**Goal**: Store owners can create affiliate campaigns

**Tasks**:
- [ ] Create CreateCampaignForm modal
  - All form fields (name, rate, depth, decay, budget, dates)
  - Live commission preview
  - Validation
- [ ] Create CampaignDetailCard component
- [ ] Create CampaignManagementPage
  - Tabs: Active, Scheduled, Expired
  - List of campaigns
  - Edit/Pause/Delete actions
- [ ] Implement useCreateCampaign hook
- [ ] Implement useCampaigns hook

**Deliverables**:
- ✅ CampaignManagementPage (/app/affiliate/campaigns)
- ✅ CreateCampaignForm
- ✅ CampaignDetailCard
- ✅ CRUD operations working

---

#### Day 8: Merkle Proof & Real-Time Updates (1 day)
**Goal**: Privacy-preserving verification and live notifications

**Tasks**:
- [ ] Create MerkleProofViewer component
  - Verify button
  - Proof details display
  - Client-side verification logic
- [ ] Implement useMerkleProof hook (backend API)
- [ ] Backend: Merkle proof generation endpoint
- [ ] Implement useCommissionSplitEvents hook (WebSocket)
- [ ] Add toast notifications for commission earnings
- [ ] Add commission flow animation in tree (particles)
- [ ] Testing: End-to-end flow (referral → sale → commission)

**Deliverables**:
- ✅ MerkleProofViewer component
- ✅ Real-time notifications
- ✅ Commission flow animation
- ✅ E2E testing complete

---

### 7.3 Dependencies & Blockers

**External Dependencies**:
- `d3` v7.8+ - Tree visualization
- `qrcode.react` - QR code generation
- `react-query` - Caching and state management
- Backend API for Merkle proof generation

**Blockchain Dependencies**:
- `bazariAffiliate` pallet deployed
- `register_referral` extrinsic working
- `distribute_commissions` integrated with bazari-commerce
- Events: `ReferralRegistered`, `CommissionDistributed`

**Potential Blockers**:
1. **Performance**: Tree rendering > 1000 nodes may be slow
   - Mitigation: Canvas rendering, virtualization
2. **Real-Time**: WebSocket connection reliability
   - Mitigation: Polling fallback
3. **Merkle Proof**: Backend complexity (tree reconstruction)
   - Mitigation: Pre-compute and cache proofs

---

## 8. Testing Requirements

### 8.1 Unit Tests

**Component Tests**:
```typescript
// ReferralLinkGenerator.test.tsx
describe('ReferralLinkGenerator', () => {
  it('generates correct referral link', () => {
    render(<ReferralLinkGenerator userAddress="0xAlice" />);
    expect(screen.getByDisplayValue('https://bazari.xyz/r/0xAlice')).toBeInTheDocument();
  });

  it('copies link to clipboard', async () => {
    const mockClipboard = jest.fn();
    Object.assign(navigator, { clipboard: { writeText: mockClipboard } });

    render(<ReferralLinkGenerator userAddress="0xAlice" />);
    fireEvent.click(screen.getByText('Copy'));

    expect(mockClipboard).toHaveBeenCalledWith('https://bazari.xyz/r/0xAlice');
    expect(screen.getByText('Copied')).toBeInTheDocument();
  });

  it('renders QR code', () => {
    render(<ReferralLinkGenerator userAddress="0xAlice" variant="full" />);
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'QR Code');
  });
});

// ReferralTreeVisualization.test.tsx
describe('ReferralTreeVisualization', () => {
  it('renders tree with correct nodes', async () => {
    const mockTree = {
      id: '0xAlice',
      level: 0,
      children: [
        { id: '0xBob', level: 1, children: [] },
        { id: '0xCarol', level: 1, children: [] },
      ],
    };

    jest.spyOn(hooks, 'useReferralTree').mockReturnValue({ data: mockTree });

    render(<ReferralTreeVisualization userAddress="0xAlice" />);

    await waitFor(() => {
      expect(screen.getByText('0xAlice')).toBeInTheDocument();
      expect(screen.getByText('0xBob')).toBeInTheDocument();
    });
  });

  it('filters by level', () => {
    // ... test level filtering
  });
});

// CommissionBreakdownCard.test.tsx
describe('CommissionBreakdownCard', () => {
  it('displays correct commission amounts', () => {
    const commissions = [
      { level: 0, affiliate: '0xDave', amount: 5, percentage: 5 },
      { level: 1, affiliate: '0xCarol', amount: 2.5, percentage: 2.5 },
    ];

    render(<CommissionBreakdownCard orderId={123} orderAmount={100} commissions={commissions} />);

    expect(screen.getByText('5 BZR')).toBeInTheDocument();
    expect(screen.getByText('5.00%')).toBeInTheDocument();
  });
});
```

---

### 8.2 Integration Tests

**Blockchain Integration**:
```typescript
// useReferralTree.test.ts
describe('useReferralTree', () => {
  it('fetches referral tree from blockchain', async () => {
    const { result, waitFor } = renderHook(() => useReferralTree('0xAlice', 5));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveProperty('id', '0xAlice');
    expect(result.current.data.children).toHaveLength(3); // 3 direct referrals
  });
});

// useRegisterReferral.test.ts
describe('useRegisterReferral', () => {
  it('registers referral successfully', async () => {
    const { result } = renderHook(() => useRegisterReferral());

    act(() => {
      result.current.mutate('0xAlice');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(toast.success).toHaveBeenCalledWith('✅ Referral registered!');
  });

  it('prevents self-referral', async () => {
    // Mock blockchain error
    mockApi.tx.bazariAffiliate.registerReferral.mockRejectedValue(
      new Error('SelfReferral')
    );

    const { result } = renderHook(() => useRegisterReferral());

    act(() => {
      result.current.mutate('0xAlice'); // Same as current user
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('You cannot refer yourself');
  });
});
```

---

### 8.3 End-to-End Tests (Playwright)

```typescript
// e2e/affiliate.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Affiliate System', () => {
  test('complete referral flow', async ({ page, context }) => {
    // Step 1: Alice generates referral link
    await page.goto('/app/affiliate/referrals');
    await expect(page.locator('input[value*="https://bazari.xyz/r/"]')).toBeVisible();

    const referralLink = await page.locator('input[value*="https://bazari.xyz/r/"]').inputValue();

    // Step 2: Bob clicks link and registers
    const bobPage = await context.newPage();
    await bobPage.goto(referralLink);
    await bobPage.fill('input[name="email"]', 'bob@example.com');
    await bobPage.click('button:has-text("Register")');

    // Step 3: Alice sees new referral in tree (real-time)
    await page.waitForTimeout(2000); // Wait for WebSocket update
    await expect(page.locator('text=0xBob')).toBeVisible(); // Node appears in tree

    // Step 4: Bob makes purchase
    await bobPage.goto('/products/1');
    await bobPage.click('button:has-text("Buy Now")');
    // ... complete checkout

    // Step 5: Alice receives commission notification
    await page.waitForSelector('text=💰 Earned'); // Toast notification
    await expect(page.locator('text=Earned 5 BZR')).toBeVisible();
  });

  test('campaign creation', async ({ page }) => {
    await page.goto('/app/affiliate/campaigns');
    await page.click('button:has-text("Create Campaign")');

    await page.fill('input[name="name"]', 'Summer Promo');
    await page.fill('input[name="budget"]', '1000');
    await page.selectOption('select[name="maxDepth"]', '5');

    await page.click('button:has-text("Create Campaign")');

    await expect(page.locator('text=✅ Campaign created!')).toBeVisible();
    await expect(page.locator('text=Summer Promo')).toBeVisible();
  });
});
```

---

## 9. Acceptance Criteria

### 9.1 Functional Requirements

✅ **Referral Link Generation**:
- [ ] User can generate unique referral link: `https://bazari.xyz/r/{address}`
- [ ] QR code is scannable and redirects correctly
- [ ] Copy to clipboard works (with fallback for unsupported browsers)
- [ ] Social share buttons open correct platforms with pre-filled messages

✅ **Referral Tree Visualization**:
- [ ] Tree renders up to 5 levels deep
- [ ] Nodes display correct information (address, avatar, stats)
- [ ] Zoom and pan work smoothly (mouse wheel, touch gestures)
- [ ] Level filtering updates tree correctly
- [ ] Search highlights correct node
- [ ] Real-time updates when new referral joins (< 5s latency)
- [ ] Handles 1000+ nodes without performance issues

✅ **Commission System**:
- [ ] Commission split is calculated correctly (5% → 2.5% → 1.25% → 0.625% → 0.3125%)
- [ ] All levels receive commission when sale completes
- [ ] CommissionBreakdownCard shows accurate amounts
- [ ] Commission history is retrievable
- [ ] Real-time notifications appear when commission earned

✅ **Campaign Management**:
- [ ] Store owners can create campaigns
- [ ] All form validations work (dates, budget, rates)
- [ ] Live commission preview is accurate
- [ ] Campaigns can be paused/resumed
- [ ] Budget depletion auto-pauses campaign
- [ ] Campaign stats update in real-time

✅ **Merkle Proof**:
- [ ] Proof verification succeeds for valid commissions
- [ ] Proof verification fails for invalid claims
- [ ] Proof details display correctly (path, leaf, root)
- [ ] On-chain root matches off-chain calculation

---

### 9.2 Non-Functional Requirements

✅ **Performance**:
- [ ] Referral tree loads in < 2s (cached)
- [ ] Tree rendering: < 100ms for 100 nodes, < 500ms for 500 nodes
- [ ] QR code generation: < 200ms
- [ ] Real-time updates: < 5s latency (WebSocket)

✅ **Security**:
- [ ] Referral links cannot be spoofed (validated on-chain)
- [ ] Self-referral is prevented (blockchain validation)
- [ ] Merkle proofs are cryptographically sound
- [ ] Campaign budgets cannot be exceeded (on-chain enforcement)

✅ **Usability**:
- [ ] Mobile-responsive (all components work on 360px+ screens)
- [ ] Accessible (WCAG 2.1 AA compliance)
- [ ] Error messages are clear and actionable
- [ ] Loading states prevent confusion

✅ **Reliability**:
- [ ] Handles blockchain connection loss gracefully (cached data)
- [ ] WebSocket reconnects automatically
- [ ] Optimistic updates rollback on error

---

### 9.3 Success Metrics (Post-Launch)

**Viral Coefficient** (Target: > 1.2):
- `K = (Average referrals per user) × (Conversion rate)`
- Track: Referrals generated, Registration conversion, Active referrals

**Commission Distribution**:
- Total BZR distributed via commissions
- Average commission per sale
- Breakdown by level (L0 should be ~50% of total)

**Engagement**:
- Daily active users viewing referral tree
- QR codes generated per week
- Social shares per week

**Campaign Performance**:
- Campaigns created per month
- Average campaign budget
- Commission payout efficiency (% of budget used)

---

## 📚 Appendix

### A. Commission Rate Examples

**Default Campaign** (5% base, 50% decay):
```
L0: 5.00%
L1: 2.50%
L2: 1.25%
L3: 0.625%
L4: 0.3125%
Total: 9.6875%
```

**Aggressive Campaign** (10% base, 50% decay):
```
L0: 10.00%
L1: 5.00%
L2: 2.50%
L3: 1.25%
L4: 0.625%
Total: 19.375%
```

**Conservative Campaign** (3% base, 60% decay):
```
L0: 3.00%
L1: 1.20%
L2: 0.48%
L3: 0.192%
L4: 0.0768%
Total: 4.9488%
```

---

### B. Glossary

- **DAG**: Directed Acyclic Graph (referral tree structure)
- **Merkle Root**: Cryptographic hash of entire tree (privacy-preserving)
- **Merkle Proof**: Path from leaf to root (verifies inclusion without revealing tree)
- **Level 0**: Direct referrer (user who referred the buyer)
- **Level 1-4**: Indirect referrers (upline in referral chain)
- **Decay Rate**: Percentage reduction per level (e.g., 50% decay means each level gets half of previous)
- **Campaign**: Custom affiliate program with specific rates/duration
- **Viral Coefficient (K)**: Measure of exponential growth (K > 1 means viral)

---

**Document Status**: ✅ **COMPLETE - READY FOR IMPLEMENTATION**
**Next Steps**: Begin Day 1 implementation (ReferralLinkGenerator + QR Code)
**Owner**: Frontend Team
**Reviewers**: Blockchain Team (verify extrinsic integration), UX Team (review designs)

---

*End of UI-SPEC.md*
