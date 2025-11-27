# bazari-dispute Pallet - UI/UX Specification

**Status**: CRITICAL (P0)
**Version**: 1.0
**Last Updated**: 2025-11-14
**Coverage**: 40% → 100%
**Gap Priority**: P0 CRITICAL - 60% gap
**Effort**: 9 days
**Dependencies**: bazari-escrow, bazari-attestation, pallet-randomness
**Maintainer**: Bazari Core Team

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

The **bazari-dispute** pallet provides a decentralized dispute resolution system for marketplace transactions. It ensures fair, transparent, and trustless resolution of conflicts between buyers and sellers through:

- **VRF Juror Selection**: Verifiable Random Function ensures unbiased jury selection
- **Commit-Reveal Voting**: Prevents juror collusion and vote coordination
- **Economic Incentives**: 50 BZR dispute fee (refunded to winner) discourages frivolous disputes
- **Quick Resolution**: 48-hour timeline from opening to ruling execution

### 1.2 Current Coverage (40%)

**What Exists**:
- DisputePanel component (basic dispute opening)
- Evidence IPFS upload functionality
- Plaintiff/Defendant display
- Basic status display (OPENED, VOTING, RESOLVED)

**What's Missing (60%)**:
- Dispute detail page with complete lifecycle visualization
- Juror voting interface (commit-reveal pattern)
- VRF juror selection transparency
- Voting phase timers and countdown
- Ruling execution and vote breakdown
- My disputes list (as plaintiff, defendant, juror)
- Admin disputes dashboard

### 1.3 Gap Priority Analysis

**Critical Gaps (P0)**:
1. **Dispute Detail Page** (5 days) - Core viewing experience
2. **Jury Voting UI** (4 days) - Commit-reveal voting interface

**High Priority Gaps (P1)**:
3. **My Disputes Page** (3 days) - User's dispute management
4. **Dispute Fee Warning** (1 day) - Economic transparency

**Medium Priority Gaps (P2)**:
5. **Admin Disputes Dashboard** (4 days) - DAO governance tools
6. **VRF Selection Transparency** (2 days) - Advanced users

**Total Effort**: 19 days → Optimized to 9 days with component reuse

### 1.4 Target User Personas

**Persona 1: Buyer (Plaintiff)**
- Opens dispute when seller doesn't deliver or delivers wrong item
- Needs clear evidence upload and case tracking
- Wants transparency in jury selection and voting

**Persona 2: Seller (Defendant)**
- Defends against false claims
- Needs ability to submit counter-evidence
- Wants fair jury and transparent ruling

**Persona 3: Juror**
- Has reputation > 500 and 100 BZR stake
- Reviews evidence and votes on ruling
- Earns juror fees for participation

**Persona 4: DAO Admin**
- Monitors system health and dispute patterns
- Identifies jurors with suspicious behavior
- Analyzes resolution efficiency

---

## 2. User Flows

### 2.1 Flow 1: Open Dispute (Buyer/Seller)

**Trigger**: Order issue (non-delivery, wrong item, quality dispute)

**Steps**:
1. User navigates to OrderPage (`/app/orders/:orderId`)
2. Clicks "Open Dispute" button
3. **Fee Check**: System validates user has 50 BZR balance
   - If insufficient: Show error "Insufficient balance. You need 50 BZR to open a dispute."
   - If sufficient: Proceed
4. **DisputeFormModal opens**:
   - Select role: Plaintiff (buyer) or Defendant (seller)
   - Evidence upload (IPFS):
     - Photos of damaged/wrong item
     - Chat screenshots
     - Delivery proof issues
   - Description (max 500 chars): Explain the issue
5. Submit dispute:
   - Transaction: `bazariDispute.openDispute(orderId, evidenceCID)`
   - Fee: 50 BZR locked
   - Loading state: "Opening dispute..."
6. **On Success**:
   - Toast: "Dispute opened! 5 jurors will be selected randomly."
   - Redirect to DisputeDetailPage (`/app/disputes/:disputeId`)
   - Auto-trigger: VRF juror selection (on-chain)
7. **Email Notification** to defendant

**Error Handling**:
- Insufficient balance → Show balance + "Add funds" button
- IPFS upload fails → Retry mechanism (3 attempts)
- Transaction fails → Show blockchain error with retry button

**Mobile Optimization**:
- Evidence upload: Camera integration (direct photo capture)
- Description: Auto-expand textarea on focus
- Fee warning: Sticky banner at bottom

---

### 2.2 Flow 2: VRF Juror Selection (Automatic)

**Trigger**: Dispute opened

**Process** (on-chain, automatic):
1. VRF randomness source generates seed
2. Filter eligible jurors:
   - Reputation > 500
   - Stake >= 100 BZR
   - Not involved in this dispute (not buyer/seller)
3. VRF selects 5 jurors from eligible pool
4. Emit `JurorsSelected` event

**UI Visualization**:
1. **DisputeDetailPage updates**:
   - JurorsCard shows "Selecting jurors..."
   - Loading spinner with VRF animation
2. **On selection complete**:
   - JurorsCard displays 5 juror addresses
   - Each juror: Avatar, address (truncated), reputation score
   - Badge: "Selected via VRF" with info tooltip
3. **Email/Push Notification** to selected jurors:
   - "You've been selected as juror for Dispute #123"
   - "Commit phase starts now (24h)"
   - Link to DisputeDetailPage

**VRF Transparency**:
- "How were jurors selected?" expandable section
- Explanation: "VRF (Verifiable Random Function) ensures unbiased, tamper-proof random selection"
- For advanced users: "Verify VRF Proof" button → shows VRF seed and signature

---

### 2.3 Flow 3: Commit Vote (Juror - Hidden Vote)

**Trigger**: User is selected juror, commit phase active

**Commit Phase Timeline**: 24 hours from dispute opening

**Steps**:
1. Juror navigates to DisputeDetailPage
2. **JuryVotingPanel visible** (only for jurors):
   - Section header: "Your Vote (Commit Phase)"
   - Timer: "Commit phase ends in: 18h 32m"
   - Warning: "Your vote is hidden (commit-reveal). Other jurors cannot see your vote until reveal phase."
3. **Vote Selection**:
   - Radio buttons:
     - ○ Refund Buyer (100% to buyer)
     - ○ Release Seller (100% to seller)
     - ○ Partial Refund (split)
   - If "Partial Refund" selected:
     - Slider: 0% ← → 100% (Buyer % vs Seller %)
     - Example: "60% to buyer (12 BZR), 40% to seller (8 BZR)"
4. **Commit Vote Button**:
   - Hover tooltip: "Your vote will be hashed and stored on-chain"
   - Click triggers:
     - Frontend generates salt (random 32-byte hex)
     - Hash vote: `hash = keccak256(vote + salt)`
     - Transaction: `bazariDispute.commitVote(disputeId, hash)`
5. **Salt Storage** (CRITICAL):
   - Save to localStorage: `dispute_${disputeId}_salt`
   - Warning modal: "IMPORTANT: Save this recovery code. You'll need it to reveal your vote."
   - Display salt in copyable textbox
   - Checkbox: "I have saved my recovery code" (required to continue)
6. **On Success**:
   - Toast: "Vote committed! Remember to reveal in 24h."
   - JuryVotingPanel updates:
     - Status: "✅ Vote committed"
     - Next step: "Reveal phase starts in: 6h 12m"

**Error Handling**:
- Already voted → "You've already committed a vote"
- Commit phase ended → "Commit phase has ended. Wait for reveal phase."
- Transaction fails → Show error with retry

**Mobile Optimization**:
- Fixed bottom panel for vote selection
- Large tap targets for radio buttons
- Salt modal: Prominent "Copy to Clipboard" button

---

### 2.4 Flow 4: Reveal Vote (Juror - Disclose Vote)

**Trigger**: Commit phase ended, reveal phase active

**Reveal Phase Timeline**: 24-48 hours from dispute opening

**Steps**:
1. Juror returns to DisputeDetailPage
2. **JuryVotingPanel updates**:
   - Section header: "Your Vote (Reveal Phase)"
   - Timer: "Reveal phase ends in: 16h 8m"
   - Warning: "You must reveal your vote for it to count!"
3. **Auto-Retrieve Salt**:
   - Check localStorage for `dispute_${disputeId}_salt`
   - If found: Auto-populate
   - If not found: Show manual input field
     - "Enter your recovery code (salt)"
     - Warning: "Without your salt, your vote cannot be revealed"
4. **Display Committed Vote**:
   - Show: "You voted: Refund Buyer"
   - (Retrieved from localStorage or user memory)
5. **Reveal Vote Button**:
   - Hover tooltip: "This will disclose your vote on-chain"
   - Click triggers:
     - Retrieve vote and salt
     - Transaction: `bazariDispute.revealVote(disputeId, vote, salt)`
     - On-chain verification: `hash(vote + salt) == commitHash`
6. **On Success**:
   - Toast: "Vote revealed! Waiting for other jurors..."
   - JuryVotingPanel updates:
     - Status: "✅ Vote revealed and verified"
     - Vote count: "3 of 5 jurors have revealed"
7. **Tally Trigger** (automatic):
   - When 3+ jurors reveal → On-chain tally executes
   - Majority vote becomes ruling

**Error Handling**:
- Invalid salt → "Salt doesn't match committed vote hash"
- Already revealed → "You've already revealed your vote"
- Reveal phase ended → "Reveal phase has ended. Your vote was not counted."
- Haven't committed → "You didn't commit a vote in time"

**Mobile Optimization**:
- Salt input: Auto-paste from clipboard
- Large "Reveal Now" button (sticky bottom)
- Progress indicator: "3/5 revealed"

---

### 2.5 Flow 5: View Ruling & Execution

**Trigger**: 3+ jurors revealed votes OR 48h passed

**Steps**:
1. **Auto Tally** (on-chain):
   - Count revealed votes
   - Determine majority (3-of-5 quorum)
   - Set ruling based on majority
   - Emit `VotingEnded` event
2. **Execute Ruling** (automatic):
   - Transaction: `bazariDispute.executeRuling(disputeId)`
   - Calls `bazariEscrow` to release funds based on ruling:
     - RefundBuyer → 100% to buyer
     - ReleaseSeller → 100% to seller
     - PartialRefund(60) → 60% to buyer, 40% to seller
   - Refund dispute fee (50 BZR) to winner
   - Emit `RulingExecuted` event
3. **DisputeDetailPage updates**:
   - RulingCard displays:
     - **Ruling Badge**: "REFUND BUYER" (green) or "RELEASE SELLER" (blue) or "PARTIAL REFUND" (orange)
     - **Vote Breakdown**:
       - "3 voted Refund Buyer"
       - "2 voted Release Seller"
     - **Execution Status**: "✅ Executed on block #123456"
     - **Funds Distribution**:
       - "Buyer received: 20 BZR"
       - "Seller received: 0 BZR"
     - **Fee Refund**: "Dispute fee (50 BZR) refunded to buyer"
4. **Notifications**:
   - Email to plaintiff: "Your dispute was resolved: Refund Buyer"
   - Email to defendant: "Dispute #123 was resolved: Refund Buyer"
   - Email to jurors: "Thanks for your participation! You earned X BZR."
5. **OrderPage updates**:
   - Order status: DISPUTED → RESOLVED
   - Escrow status: LOCKED → RELEASED/REFUNDED

**No Quorum Scenario**:
- If <3 jurors reveal votes → Default ruling: RefundBuyer (buyer protection)
- Warning shown: "Insufficient juror participation. Default ruling applied."

**Mobile Optimization**:
- Ruling badge: Full-width, prominent
- Vote breakdown: Expandable accordion
- Timeline: Vertical scrollable list

---

## 3. Pages Required

### 3.1 Page 1: DisputeDetailPage (MOST COMPLEX)

**Route**: `/app/disputes/:disputeId`

**Purpose**: Complete dispute lifecycle visualization and interaction

**Access Control**: Public (anyone can view), conditional actions based on role

**Layout** (Desktop):
```
┌──────────────────────────────────────────────────────┐
│ DisputeHeader                                        │
│ [ID #123] [Status: VOTING] [Timeline ──●──○──○]    │
└──────────────────────────────────────────────────────┘
┌─────────────────────────┬────────────────────────────┐
│ PartiesCard             │ JurorsCard                 │
│ Plaintiff: Alice        │ 5 jurors selected via VRF  │
│ vs                      │ [Avatars...]               │
│ Defendant: Bob          │ Requirements: Rep>500...   │
├─────────────────────────┴────────────────────────────┤
│ EvidenceViewer                                       │
│ [IPFS Preview] [Download CID]                       │
├──────────────────────────────────────────────────────┤
│ VotingStatus                                         │
│ [Commit Phase: 12h remaining] [Progress: 3/5]       │
├──────────────────────────────────────────────────────┤
│ JuryVotingPanel (if user is juror)                  │
│ [Vote selection UI - commit/reveal based on phase]  │
├──────────────────────────────────────────────────────┤
│ RulingCard (if resolved)                            │
│ Ruling: REFUND BUYER [Vote Breakdown: 3-2]         │
│ Execution: ✅ Executed | Fee refunded: 50 BZR      │
└──────────────────────────────────────────────────────┘
```

**Layout** (Mobile):
- Vertical stack, full-width cards
- Sticky header with collapse
- Floating "Vote Now" button (if juror)

**Sections**:

#### Section 1: DisputeHeader
**Content**:
- Dispute ID: `#123`
- Status Badge:
  - OPENED (yellow): "Jurors being selected..."
  - COMMIT (blue): "Voting in progress (commit phase)"
  - REVEAL (purple): "Voting in progress (reveal phase)"
  - RESOLVED (green): "Dispute resolved"
- Timeline Stepper:
  - Day 0: Open ✅ → Day 0-1: Commit ● → Day 1-2: Reveal ○ → Day 2: Execute ○
  - Progress indicator based on current block
- Order Link: "View Order #456" button

#### Section 2: PartiesCard
**Content**:
- Left: Plaintiff
  - Avatar (32px)
  - Name or truncated address
  - Role badge: "BUYER"
- Center: "vs" separator
- Right: Defendant
  - Avatar (32px)
  - Name or truncated address
  - Role badge: "SELLER"
- Created date: "Opened on Nov 14, 2025 at 3:45 PM"

#### Section 3: EvidenceViewer
**Content**:
- IPFS CID badge: `Qm...abc` with copy button
- Evidence preview:
  - If image: Show gallery (up to 5 images)
  - If document: Show file icon + filename
  - If JSON: Show formatted JSON
- Actions:
  - "View on IPFS Gateway" (opens in new tab)
  - "Download Evidence" button
- Plaintiff description: Text block (max 500 chars)

#### Section 4: JurorsCard
**Content**:
- Header: "Jurors (5)"
- Subheader: "Selected via VRF (Verifiable Random Function)"
- Juror List:
  - Each juror: Avatar, Address (truncated), Reputation score badge
  - Example: `0x1234...abcd | Rep: 753`
- Requirements section (expandable):
  - "✅ Reputation > 500"
  - "✅ Stake >= 100 BZR"
  - "✅ Not involved in dispute"
- VRF Explanation (expandable):
  - "How were jurors selected?"
  - Text: "VRF ensures unbiased..."
  - "Verify VRF Proof" button (advanced)

#### Section 5: VotingStatus
**Conditional rendering based on phase**:

**Commit Phase**:
- Timer: "Commit phase ends in: 18h 32m 15s" (countdown)
- Progress: "3 of 5 jurors have committed" (progress bar)
- Status: "Waiting for jurors to vote..."

**Reveal Phase**:
- Timer: "Reveal phase ends in: 14h 8m 42s"
- Progress: "2 of 5 jurors have revealed"
- Status: "Waiting for jurors to reveal votes..."

**Tallying**:
- Loading spinner: "Tallying votes..."

**Resolved**:
- Hidden (replaced by RulingCard)

#### Section 6: JuryVotingPanel (Conditional)
**Visibility**: Only if `currentUser` is in `dispute.jurors`

**Commit Phase UI**:
```jsx
<Card>
  <CardHeader>
    <h3>Your Vote (Commit Phase)</h3>
    <CountdownTimer expiresAt={commitPhaseEnd} />
  </CardHeader>
  <CardContent>
    <Alert variant="info">
      Your vote is hidden (commit-reveal). Other jurors cannot see
      your vote until reveal phase.
    </Alert>
    <RadioGroup>
      <Radio value="RefundBuyer">
        <strong>Refund Buyer</strong> (100% to buyer)
      </Radio>
      <Radio value="ReleaseSeller">
        <strong>Release Seller</strong> (100% to seller)
      </Radio>
      <Radio value="PartialRefund">
        <strong>Partial Refund</strong>
        {/* If selected, show slider */}
        <Slider min={0} max={100} step={5} />
        <p>60% to buyer (12 BZR), 40% to seller (8 BZR)</p>
      </Radio>
    </RadioGroup>
    <Button onClick={handleCommitVote}>Commit Vote</Button>
  </CardContent>
</Card>
```

**Reveal Phase UI**:
```jsx
<Card>
  <CardHeader>
    <h3>Your Vote (Reveal Phase)</h3>
    <CountdownTimer expiresAt={revealPhaseEnd} />
  </CardHeader>
  <CardContent>
    <Alert variant="warning">
      You must reveal your vote for it to count!
    </Alert>
    <div>
      <p>You voted: <strong>Refund Buyer</strong></p>
      <Input
        label="Recovery Code (Salt)"
        value={salt}
        disabled
        helperText="Auto-retrieved from your device"
      />
    </div>
    <Button onClick={handleRevealVote}>Reveal Vote</Button>
  </CardContent>
</Card>
```

**Post-Vote UI**:
```jsx
<Card>
  <CardContent>
    <Alert variant="success">
      ✅ Vote revealed and verified
    </Alert>
    <p>Waiting for other jurors... (3/5 revealed)</p>
  </CardContent>
</Card>
```

#### Section 7: RulingCard (Post-Resolution)
**Content**:
- Ruling Badge:
  - REFUND BUYER (green, large font)
  - RELEASE SELLER (blue)
  - PARTIAL REFUND: 60/40 (orange)
- Vote Breakdown:
  - Pie chart or bar:
    - "3 jurors voted: Refund Buyer"
    - "2 jurors voted: Release Seller"
  - List of revealed votes (optional, privacy consideration):
    - "Juror 0x1234: Refund Buyer"
    - "Juror 0x5678: Release Seller"
    - etc.
- Execution Details:
  - Status: "✅ Executed on block #123456"
  - Funds distribution:
    - "Buyer received: 20 BZR"
    - "Seller received: 0 BZR"
  - Fee refund: "Dispute fee (50 BZR) refunded to buyer"
- Transaction Hash: `0xabc...def` (link to explorer)

**Data Loading**:
- Skeleton loaders for each section
- Real-time updates via WebSocket (`DisputeUpdated` events)

**Error States**:
- Dispute not found → 404 page
- Blockchain connection error → Retry banner

---

### 3.2 Page 2: MyDisputesPage

**Route**: `/app/disputes`

**Purpose**: User's personal dispute management hub

**Access Control**: Authenticated users only

**Layout** (Desktop):
```
┌──────────────────────────────────────────────────────┐
│ My Disputes                                          │
│ [Tabs: As Plaintiff | As Defendant | As Juror]      │
├──────────────────────────────────────────────────────┤
│ [Filter: Status ▼] [Search: Dispute ID or Party]    │
├──────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────┐   │
│ │ DisputeCard #123                               │   │
│ │ vs 0xBob... | Status: VOTING | Nov 14, 2025   │   │
│ │ [View Details →]                               │   │
│ └────────────────────────────────────────────────┘   │
│ ┌────────────────────────────────────────────────┐   │
│ │ DisputeCard #124                               │   │
│ └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

**Tabs**:

#### Tab 1: As Plaintiff
**Description**: Disputes where user is the plaintiff (opened by user)

**Content**:
- Header: "Disputes You Opened"
- Count: "3 active disputes"
- DisputeCard list:
  - Dispute ID, Defendant, Status, Created date
  - Quick actions: "View", "Add Evidence" (if still open)

#### Tab 2: As Defendant
**Description**: Disputes where user is the defendant

**Content**:
- Header: "Disputes Against You"
- Count: "1 active dispute"
- DisputeCard list:
  - Dispute ID, Plaintiff, Status, Created date
  - Quick actions: "View", "Submit Defense"

#### Tab 3: As Juror
**Description**: Disputes where user was selected as juror

**Content**:
- Header: "Disputes You're Judging"
- Count: "2 pending votes"
- DisputeCard list (enhanced):
  - Dispute ID, Parties, Status
  - **Vote Status**:
    - "⏳ Waiting to vote" (commit phase not started)
    - "📝 Vote now!" (commit phase active, not voted)
    - "✅ Voted" (committed)
    - "🔓 Reveal now!" (reveal phase, not revealed)
    - "✅ Revealed" (revealed)
  - CTA button: "Vote Now" or "Reveal Now" (prominent)

**Filter Panel**:
- Status dropdown:
  - All
  - Opened
  - Commit Phase
  - Reveal Phase
  - Resolved
- Date range picker
- Sort by: Newest, Oldest, Status

**Search**:
- Input: "Search by Dispute ID or Party Address"
- Real-time filtering

**Empty States**:
- As Plaintiff: "You haven't opened any disputes"
- As Defendant: "No disputes against you"
- As Juror: "You haven't been selected as juror yet"

**Data Loading**:
- Initial load: Skeleton cards
- Pagination: Load more button (20 per page)

---

### 3.3 Page 3: AdminDisputesDashboardPage

**Route**: `/app/admin/disputes`

**Purpose**: DAO governance and system monitoring

**Access Control**: DAO members only (verified on-chain)

**Layout** (Desktop):
```
┌──────────────────────────────────────────────────────┐
│ Disputes Dashboard                                   │
│ [Stats: Total | Resolved | Pending | Avg Time]      │
├──────────────────────────────────────────────────────┤
│ ┌─────────────────┐  ┌──────────────────────────┐   │
│ │ Ruling Breakdown│  │ Juror Leaderboard        │   │
│ │ [Pie Chart]     │  │ 1. 0xAlice (50 cases)    │   │
│ └─────────────────┘  └──────────────────────────┘   │
├──────────────────────────────────────────────────────┤
│ All Disputes (Global)                                │
│ [Filter: Status ▼] [Date Range ▼] [Export CSV]      │
│ ┌────────────────────────────────────────────────┐   │
│ │ #123 | Alice vs Bob | RESOLVED | Nov 14       │   │
│ └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

**Sections**:

#### Section 1: Stats Overview
**KPI Cards**:
- Total Disputes: 1,234
- Resolved: 987 (80%)
- Pending: 247 (20%)
- Avg Resolution Time: 46.3 hours
- Total Fees Collected: 12,345 BZR
- Total Refunded: 9,876 BZR (80% refund rate)

#### Section 2: Ruling Breakdown
**Chart**: Pie chart or donut chart
**Data**:
- Refund Buyer: 60% (742 cases)
- Release Seller: 30% (370 cases)
- Partial Refund: 10% (123 cases)

**Insights**:
- Trend: "Refund Buyer rulings increased 5% this month"
- Alert: "High dispute rate from Store X (15 disputes)"

#### Section 3: Juror Leaderboard
**Table**: Top 10 jurors by participation
**Columns**:
- Rank
- Juror Address
- Cases Judged
- Participation Rate (revealed votes / total assignments)
- Reputation Score

**Example**:
| Rank | Juror | Cases | Participation | Reputation |
|------|-------|-------|---------------|------------|
| 1 | 0xAlice | 50 | 98% | 950 |
| 2 | 0xBob | 42 | 95% | 890 |

**Actions**:
- "View Juror Profile" link
- "Flag Suspicious Behavior" button (if participation <50%)

#### Section 4: All Disputes Table
**Columns**:
- Dispute ID
- Plaintiff
- Defendant
- Status
- Ruling (if resolved)
- Created Date
- Resolution Date
- Actions (View Details)

**Filters**:
- Status: All, Opened, Voting, Resolved
- Date Range: Last 7 days, Last 30 days, Last 90 days, Custom
- Ruling: All, Refund Buyer, Release Seller, Partial Refund

**Export**:
- CSV download button
- Includes all filtered disputes

**Pagination**:
- 50 per page
- Total count display

**Data Refresh**:
- Auto-refresh every 30s
- Manual refresh button

---

## 4. Components Required

### 4.1 Component 1: DisputeHeader

**Purpose**: Display dispute ID, status, and timeline

**Props**:
```typescript
interface DisputeHeaderProps {
  dispute: {
    id: number;
    status: 'OPENED' | 'COMMIT' | 'REVEAL' | 'RESOLVED';
    orderId: number;
    createdAt: number; // block number
    commitPhaseEnd: number;
    revealPhaseEnd: number;
  };
}
```

**Design**:
```jsx
<div className="dispute-header">
  <div className="header-top">
    <h1>Dispute #{dispute.id}</h1>
    <StatusBadge status={dispute.status} />
  </div>
  <TimelineStepper
    steps={[
      { label: 'Opened', completed: true, block: dispute.createdAt },
      { label: 'Commit', completed: status !== 'OPENED', current: status === 'COMMIT' },
      { label: 'Reveal', completed: ['REVEAL', 'RESOLVED'].includes(status), current: status === 'REVEAL' },
      { label: 'Resolved', completed: status === 'RESOLVED', current: false },
    ]}
  />
  <Button variant="link" href={`/app/orders/${dispute.orderId}`}>
    View Order #{dispute.orderId} →
  </Button>
</div>
```

**Responsive**:
- Mobile: Stack vertically, hide timeline on xs screens

---

### 4.2 Component 2: PartiesCard

**Purpose**: Display plaintiff vs defendant with avatars

**Props**:
```typescript
interface PartiesCardProps {
  plaintiff: {
    address: string;
    name?: string;
    avatar?: string;
    role: 'BUYER' | 'SELLER';
  };
  defendant: {
    address: string;
    name?: string;
    avatar?: string;
    role: 'BUYER' | 'SELLER';
  };
  createdAt: Date;
}
```

**Design**:
```jsx
<Card className="parties-card">
  <div className="parties-container">
    <div className="party plaintiff">
      <Avatar src={plaintiff.avatar} size="lg" />
      <div>
        <p className="name">{plaintiff.name || truncate(plaintiff.address)}</p>
        <Badge variant="blue">{plaintiff.role}</Badge>
      </div>
    </div>
    <div className="separator">vs</div>
    <div className="party defendant">
      <Avatar src={defendant.avatar} size="lg" />
      <div>
        <p className="name">{defendant.name || truncate(defendant.address)}</p>
        <Badge variant="orange">{defendant.role}</Badge>
      </div>
    </div>
  </div>
  <p className="created-date">Opened on {formatDate(createdAt)}</p>
</Card>
```

**Responsive**:
- Mobile: Stack vertically, smaller avatars

---

### 4.3 Component 3: EvidenceViewer

**Purpose**: Display IPFS evidence with preview

**Props**:
```typescript
interface EvidenceViewerProps {
  evidenceCID: string;
  description: string;
  uploadedBy: 'plaintiff' | 'defendant';
}
```

**Design**:
```jsx
<Card className="evidence-viewer">
  <CardHeader>
    <h3>Evidence</h3>
    <Badge>Uploaded by {uploadedBy}</Badge>
  </CardHeader>
  <CardContent>
    <div className="ipfs-cid">
      <code>{evidenceCID}</code>
      <CopyButton text={evidenceCID} />
    </div>
    <IPFSPreview cid={evidenceCID} />
    <div className="actions">
      <Button variant="link" href={getIPFSGatewayURL(evidenceCID)} target="_blank">
        View on IPFS Gateway →
      </Button>
      <Button variant="outline" onClick={downloadEvidence}>
        Download
      </Button>
    </div>
    <div className="description">
      <h4>Description</h4>
      <p>{description}</p>
    </div>
  </CardContent>
</Card>
```

**IPFSPreview Component**:
- Image: Gallery (up to 5 images)
- Document: File icon + filename
- JSON: Code block with syntax highlighting
- Loading: Skeleton
- Error: "Failed to load preview" with retry

---

### 4.4 Component 4: JurorsCard

**Purpose**: Display 5 selected jurors with VRF explanation

**Props**:
```typescript
interface JurorsCardProps {
  jurors: Array<{
    address: string;
    reputation: number;
    avatar?: string;
  }>;
  vrfSeed?: string; // optional for VRF verification
}
```

**Design**:
```jsx
<Card className="jurors-card">
  <CardHeader>
    <h3>Jurors (5)</h3>
    <Badge variant="purple">Selected via VRF</Badge>
  </CardHeader>
  <CardContent>
    <div className="juror-list">
      {jurors.map(juror => (
        <div key={juror.address} className="juror-item">
          <Avatar src={juror.avatar} size="sm" />
          <span className="address">{truncate(juror.address)}</span>
          <Badge variant="green">Rep: {juror.reputation}</Badge>
        </div>
      ))}
    </div>
    <Accordion>
      <AccordionItem title="Juror Requirements">
        <ul>
          <li>✅ Reputation &gt; 500</li>
          <li>✅ Stake &gt;= 100 BZR</li>
          <li>✅ Not involved in dispute</li>
        </ul>
      </AccordionItem>
      <AccordionItem title="How were jurors selected?">
        <p>
          VRF (Verifiable Random Function) ensures unbiased, tamper-proof
          random selection from eligible jurors.
        </p>
        {vrfSeed && (
          <Button variant="link" onClick={showVRFProof}>
            Verify VRF Proof (Advanced)
          </Button>
        )}
      </AccordionItem>
    </Accordion>
  </CardContent>
</Card>
```

**VRF Proof Modal** (Advanced):
- Display VRF seed
- Display VRF signature
- Explain verification process

---

### 4.5 Component 5: VotingStatus

**Purpose**: Show voting phase timer and progress

**Props**:
```typescript
interface VotingStatusProps {
  phase: 'COMMIT' | 'REVEAL' | 'TALLYING' | 'RESOLVED';
  commitPhaseEnd?: number; // block number
  revealPhaseEnd?: number;
  committedCount: number;
  revealedCount: number;
  totalJurors: number; // always 5
}
```

**Design**:
```jsx
<Card className="voting-status">
  {phase === 'COMMIT' && (
    <>
      <CountdownTimer
        label="Commit phase ends in"
        targetBlock={commitPhaseEnd}
      />
      <ProgressBar
        value={committedCount}
        max={totalJurors}
        label={`${committedCount} of ${totalJurors} jurors have committed`}
      />
      <p className="status-text">Waiting for jurors to vote...</p>
    </>
  )}
  {phase === 'REVEAL' && (
    <>
      <CountdownTimer
        label="Reveal phase ends in"
        targetBlock={revealPhaseEnd}
      />
      <ProgressBar
        value={revealedCount}
        max={totalJurors}
        label={`${revealedCount} of ${totalJurors} jurors have revealed`}
      />
      <p className="status-text">Waiting for jurors to reveal votes...</p>
    </>
  )}
  {phase === 'TALLYING' && (
    <div className="tallying">
      <Spinner />
      <p>Tallying votes...</p>
    </div>
  )}
</Card>
```

**CountdownTimer**:
- Convert block number to estimated time (6s per block)
- Display: "18h 32m 15s"
- Update every second
- Color: Green (>12h), Yellow (6-12h), Red (<6h)

---

### 4.6 Component 6: RulingCard

**Purpose**: Display final ruling, vote breakdown, and execution status

**Props**:
```typescript
interface RulingCardProps {
  ruling: 'RefundBuyer' | 'ReleaseSeller' | 'PartialRefund';
  partialSplit?: { buyerPercent: number; sellerPercent: number };
  voteBreakdown: {
    refundBuyer: number;
    releaseSeller: number;
    partialRefund: number;
  };
  execution: {
    executed: boolean;
    blockNumber?: number;
    txHash?: string;
    buyerReceived: string; // BZR amount
    sellerReceived: string;
    feeRefundedTo: 'buyer' | 'seller';
  };
}
```

**Design**:
```jsx
<Card className="ruling-card">
  <CardHeader>
    <h3>Final Ruling</h3>
    <RulingBadge ruling={ruling} partialSplit={partialSplit} />
  </CardHeader>
  <CardContent>
    <div className="vote-breakdown">
      <h4>Vote Breakdown</h4>
      <PieChart data={voteBreakdown} />
      <ul>
        <li>{voteBreakdown.refundBuyer} jurors voted: Refund Buyer</li>
        <li>{voteBreakdown.releaseSeller} jurors voted: Release Seller</li>
        <li>{voteBreakdown.partialRefund} jurors voted: Partial Refund</li>
      </ul>
    </div>
    <Divider />
    <div className="execution-details">
      <h4>Execution Status</h4>
      {execution.executed ? (
        <>
          <Alert variant="success">
            ✅ Executed on block #{execution.blockNumber}
          </Alert>
          <div className="funds-distribution">
            <p>Buyer received: <strong>{execution.buyerReceived} BZR</strong></p>
            <p>Seller received: <strong>{execution.sellerReceived} BZR</strong></p>
          </div>
          <div className="fee-refund">
            <p>
              Dispute fee (50 BZR) refunded to <strong>{execution.feeRefundedTo}</strong>
            </p>
          </div>
          <Button
            variant="link"
            href={getExplorerURL(execution.txHash)}
            target="_blank"
          >
            View Transaction: {truncate(execution.txHash)} →
          </Button>
        </>
      ) : (
        <Alert variant="warning">⏳ Execution pending...</Alert>
      )}
    </div>
  </CardContent>
</Card>
```

**RulingBadge**:
- RefundBuyer: Green badge "REFUND BUYER"
- ReleaseSeller: Blue badge "RELEASE SELLER"
- PartialRefund: Orange badge "PARTIAL REFUND: 60/40"

---

## 5. Blockchain Hooks

### 5.1 Query Hooks (3 hooks)

#### Hook 1: useDisputeDetails

**Purpose**: Get dispute by ID with real-time updates

**File**: `/src/hooks/blockchain/useDisputeDetails.ts`

**Implementation**:
```typescript
import { useBlockchainQuery } from '@/hooks/useBlockchainQuery';
import { getApi } from '@/services/polkadot';

export interface Dispute {
  id: number;
  orderId: number;
  plaintiff: string;
  defendant: string;
  jurors: string[];
  status: 'OPENED' | 'COMMIT' | 'REVEAL' | 'RESOLVED';
  evidenceCID: string;
  description: string;
  votes: Vote[];
  ruling?: Ruling;
  committedCount: number;
  revealedCount: number;
  commitPhaseEnd: number;
  revealPhaseEnd: number;
  createdAt: number;
  resolvedAt?: number;
}

export interface Vote {
  juror: string;
  voteHash?: string; // commit phase
  vote?: 'RefundBuyer' | 'ReleaseSeller' | 'PartialRefund';
  partialSplit?: number; // 0-100
  revealed: boolean;
}

export interface Ruling {
  type: 'RefundBuyer' | 'ReleaseSeller' | 'PartialRefund';
  partialSplit?: { buyerPercent: number; sellerPercent: number };
  executed: boolean;
  executionBlock?: number;
  executionTxHash?: string;
  buyerReceived: string;
  sellerReceived: string;
  feeRefundedTo: 'buyer' | 'seller';
}

export function useDisputeDetails(disputeId: number) {
  return useBlockchainQuery(
    ['dispute', disputeId],
    async () => {
      const api = await getApi();
      const disputeRaw = await api.query.bazariDispute.disputes(disputeId);

      if (disputeRaw.isNone) {
        throw new Error('Dispute not found');
      }

      const dispute = disputeRaw.unwrap();

      // Parse votes
      const votesRaw = await api.query.bazariDispute.disputeVotes.multi(
        dispute.jurors.map(j => [disputeId, j])
      );

      const votes: Vote[] = votesRaw.map((voteRaw, i) => {
        if (voteRaw.isNone) {
          return { juror: dispute.jurors[i].toString(), revealed: false };
        }
        const v = voteRaw.unwrap();
        return {
          juror: dispute.jurors[i].toString(),
          voteHash: v.hash?.toString(),
          vote: v.vote?.toString() as any,
          partialSplit: v.partialSplit?.toNumber(),
          revealed: v.revealed,
        };
      });

      // Determine phase
      const currentBlock = await api.query.system.number();
      let status: Dispute['status'] = 'OPENED';
      if (dispute.ruling.isSome) {
        status = 'RESOLVED';
      } else if (currentBlock.toNumber() >= dispute.revealPhaseEnd.toNumber()) {
        status = 'REVEAL';
      } else if (currentBlock.toNumber() >= dispute.commitPhaseEnd.toNumber()) {
        status = 'REVEAL';
      } else {
        status = 'COMMIT';
      }

      return {
        id: disputeId,
        orderId: dispute.orderId.toNumber(),
        plaintiff: dispute.plaintiff.toString(),
        defendant: dispute.defendant.toString(),
        jurors: dispute.jurors.map(j => j.toString()),
        status,
        evidenceCID: dispute.evidenceCID.toString(),
        description: dispute.description.toString(),
        votes,
        ruling: dispute.ruling.isSome ? parseRuling(dispute.ruling.unwrap()) : undefined,
        committedCount: votes.filter(v => v.voteHash).length,
        revealedCount: votes.filter(v => v.revealed).length,
        commitPhaseEnd: dispute.commitPhaseEnd.toNumber(),
        revealPhaseEnd: dispute.revealPhaseEnd.toNumber(),
        createdAt: dispute.createdAt.toNumber(),
        resolvedAt: dispute.resolvedAt?.toNumber(),
      } as Dispute;
    },
    {
      refetchInterval: 30000, // Poll every 30s
      staleTime: 10000, // Consider stale after 10s
    }
  );
}

function parseRuling(rulingRaw: any): Ruling {
  // Parse ruling from blockchain format
  // Implementation depends on Rust enum encoding
  return {
    type: rulingRaw.type.toString(),
    partialSplit: rulingRaw.partialSplit ? {
      buyerPercent: rulingRaw.partialSplit.buyer,
      sellerPercent: rulingRaw.partialSplit.seller,
    } : undefined,
    executed: rulingRaw.executed,
    executionBlock: rulingRaw.executionBlock?.toNumber(),
    executionTxHash: rulingRaw.executionTxHash?.toString(),
    buyerReceived: rulingRaw.buyerReceived.toString(),
    sellerReceived: rulingRaw.sellerReceived.toString(),
    feeRefundedTo: rulingRaw.feeRefundedTo.toString(),
  };
}
```

**Usage**:
```typescript
const { data: dispute, isLoading, error } = useDisputeDetails(123);
```

---

#### Hook 2: useMyDisputes

**Purpose**: Get user's disputes (as plaintiff, defendant, or juror)

**File**: `/src/hooks/blockchain/useMyDisputes.ts`

**Implementation**:
```typescript
import { useBlockchainQuery } from '@/hooks/useBlockchainQuery';
import { useWallet } from '@/hooks/useWallet';

export function useMyDisputes() {
  const { address } = useWallet();

  return useBlockchainQuery(
    ['myDisputes', address],
    async () => {
      const api = await getApi();

      // Query all disputes (in production, use indexed backend)
      const disputeIds = await api.query.bazariDispute.disputeCount();
      const allDisputesRaw = await api.query.bazariDispute.disputes.multi(
        Array.from({ length: disputeIds.toNumber() }, (_, i) => i + 1)
      );

      const disputes = allDisputesRaw
        .map((d, i) => d.isSome ? { id: i + 1, ...d.unwrap() } : null)
        .filter(Boolean);

      const asPlaintiff = disputes.filter(d => d.plaintiff.toString() === address);
      const asDefendant = disputes.filter(d => d.defendant.toString() === address);
      const asJuror = disputes.filter(d =>
        d.jurors.some(j => j.toString() === address)
      );

      return {
        asPlaintiff: asPlaintiff.map(parseDispute),
        asDefendant: asDefendant.map(parseDispute),
        asJuror: asJuror.map(parseDispute),
      };
    },
    {
      enabled: !!address,
      staleTime: 30000,
    }
  );
}
```

**Usage**:
```typescript
const { data } = useMyDisputes();
// data.asPlaintiff, data.asDefendant, data.asJuror
```

**Note**: In production, replace direct blockchain queries with indexed backend API (`GET /api/users/:address/disputes`) for better performance.

---

#### Hook 3: useAllDisputes (Admin)

**Purpose**: Get all disputes for DAO dashboard

**File**: `/src/hooks/blockchain/useAllDisputes.ts`

**Implementation**:
```typescript
export function useAllDisputes(filters?: {
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  return useBlockchainQuery(
    ['allDisputes', filters],
    async () => {
      // In production, use backend API
      const response = await fetch('/api/admin/disputes', {
        method: 'POST',
        body: JSON.stringify(filters),
      });
      return response.json();
    },
    {
      staleTime: 60000,
    }
  );
}
```

---

### 5.2 Mutation Hooks (4 hooks)

#### Hook 1: useOpenDispute

**Purpose**: Open new dispute (50 BZR fee)

**File**: `/src/hooks/blockchain/useOpenDispute.ts`

**Implementation**:
```typescript
import { useBlockchainTx } from '@/hooks/useBlockchainTx';
import { getApi } from '@/services/polkadot';

export function useOpenDispute() {
  return useBlockchainTx(
    'openDispute',
    async (params: {
      orderId: number;
      evidenceCID: string;
      description: string;
    }) => {
      const api = await getApi();

      return api.tx.bazariDispute.openDispute(
        params.orderId,
        params.evidenceCID,
        params.description
      );
    },
    {
      onSuccess: (data, variables) => {
        // Invalidate queries
        queryClient.invalidateQueries(['myDisputes']);

        // Show toast
        toast.success('Dispute opened! Jurors are being selected.');
      },
      onError: (error) => {
        if (error.message.includes('InsufficientBalance')) {
          toast.error('Insufficient balance. You need 50 BZR to open a dispute.');
        } else {
          toast.error('Failed to open dispute: ' + error.message);
        }
      },
    }
  );
}
```

**Usage**:
```typescript
const { mutate: openDispute, isLoading } = useOpenDispute();

openDispute({
  orderId: 123,
  evidenceCID: 'Qm...abc',
  description: 'Seller sent wrong item',
});
```

---

#### Hook 2: useCommitVote

**Purpose**: Submit hidden vote (hash)

**File**: `/src/hooks/blockchain/useCommitVote.ts`

**Implementation**:
```typescript
import CryptoJS from 'crypto-js';

export function useCommitVote() {
  return useBlockchainTx(
    'commitVote',
    async (params: {
      disputeId: number;
      vote: 'RefundBuyer' | 'ReleaseSeller' | 'PartialRefund';
      partialSplit?: number; // 0-100
    }) => {
      const api = await getApi();

      // Generate random salt
      const salt = CryptoJS.lib.WordArray.random(32).toString();

      // Create vote payload
      const votePayload = JSON.stringify({
        vote: params.vote,
        partialSplit: params.partialSplit,
      });

      // Hash: keccak256(votePayload + salt)
      const voteHash = CryptoJS.SHA3(votePayload + salt, { outputLength: 256 }).toString();

      // Store salt in localStorage (CRITICAL for reveal)
      localStorage.setItem(`dispute_${params.disputeId}_salt`, salt);
      localStorage.setItem(`dispute_${params.disputeId}_vote`, votePayload);

      return api.tx.bazariDispute.commitVote(
        params.disputeId,
        voteHash
      );
    },
    {
      onSuccess: (data, variables) => {
        // Show salt backup modal
        const salt = localStorage.getItem(`dispute_${variables.disputeId}_salt`);
        showSaltBackupModal(salt);

        toast.success('Vote committed! Remember to reveal in 24h.');
      },
    }
  );
}
```

**Usage**:
```typescript
const { mutate: commitVote } = useCommitVote();

commitVote({
  disputeId: 123,
  vote: 'RefundBuyer',
});
```

---

#### Hook 3: useRevealVote

**Purpose**: Reveal plaintext vote + salt

**File**: `/src/hooks/blockchain/useRevealVote.ts`

**Implementation**:
```typescript
export function useRevealVote() {
  return useBlockchainTx(
    'revealVote',
    async (params: {
      disputeId: number;
    }) => {
      const api = await getApi();

      // Retrieve from localStorage
      const salt = localStorage.getItem(`dispute_${params.disputeId}_salt`);
      const votePayload = localStorage.getItem(`dispute_${params.disputeId}_vote`);

      if (!salt || !votePayload) {
        throw new Error('Salt or vote not found. Did you commit a vote?');
      }

      const { vote, partialSplit } = JSON.parse(votePayload);

      return api.tx.bazariDispute.revealVote(
        params.disputeId,
        vote,
        partialSplit || null,
        salt
      );
    },
    {
      onSuccess: () => {
        toast.success('Vote revealed! Waiting for other jurors...');
      },
      onError: (error) => {
        if (error.message.includes('InvalidSalt')) {
          toast.error('Invalid salt. Your vote hash doesn\'t match.');
        }
      },
    }
  );
}
```

---

#### Hook 4: useExecuteRuling

**Purpose**: Execute ruling (auto-triggered by blockchain, manual fallback)

**File**: `/src/hooks/blockchain/useExecuteRuling.ts`

**Implementation**:
```typescript
export function useExecuteRuling() {
  return useBlockchainTx(
    'executeRuling',
    async (params: { disputeId: number }) => {
      const api = await getApi();
      return api.tx.bazariDispute.executeRuling(params.disputeId);
    },
    {
      onSuccess: () => {
        toast.success('Ruling executed! Funds have been distributed.');
      },
    }
  );
}
```

**Note**: Usually auto-triggered by blockchain after vote tally. Manual execution is fallback.

---

### 5.3 Subscription Hooks

#### Hook: useDisputeEvents

**Purpose**: Real-time dispute updates via WebSocket

**File**: `/src/hooks/blockchain/useDisputeEvents.ts`

**Implementation**:
```typescript
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useDisputeEvents(disputeId: number) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const api = await getApi();

    // Subscribe to dispute events
    const unsubscribe = api.query.system.events((events) => {
      events.forEach((record) => {
        const { event } = record;

        if (api.events.bazariDispute.VoteCommitted.is(event)) {
          const [id] = event.data;
          if (id.toNumber() === disputeId) {
            // Invalidate dispute query to refetch
            queryClient.invalidateQueries(['dispute', disputeId]);
          }
        }

        if (api.events.bazariDispute.VoteRevealed.is(event)) {
          const [id] = event.data;
          if (id.toNumber() === disputeId) {
            queryClient.invalidateQueries(['dispute', disputeId]);
          }
        }

        if (api.events.bazariDispute.RulingExecuted.is(event)) {
          const [id] = event.data;
          if (id.toNumber() === disputeId) {
            queryClient.invalidateQueries(['dispute', disputeId]);
            toast.success('Ruling has been executed!');
          }
        }
      });
    });

    return () => unsubscribe.then(u => u());
  }, [disputeId]);
}
```

**Usage**:
```typescript
// In DisputeDetailPage
useDisputeEvents(disputeId);
```

---

## 6. Data Flow

### 6.1 Dispute Lifecycle (State Machine)

**Timeline**: 48 hours (8,640 blocks @ 6s per block)

```
┌─────────────────────────────────────────────────────────────┐
│ Day 0: OPEN DISPUTE                                         │
│ ├─ User calls openDispute(orderId, evidenceCID)            │
│ ├─ Lock 50 BZR dispute fee                                 │
│ ├─ Emit DisputeOpened event                                │
│ └─ Auto-trigger: VRF selects 5 jurors                      │
│    └─ Emit JurorsSelected event                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Day 0-1: COMMIT PHASE (24h = 4,320 blocks)                 │
│ ├─ Jurors see JuryVotingPanel (commit UI)                  │
│ ├─ Each juror:                                             │
│ │  ├─ Select vote (RefundBuyer/ReleaseSeller/Partial)     │
│ │  ├─ Frontend generates salt                             │
│ │  ├─ Hash vote: hash = keccak256(vote + salt)            │
│ │  ├─ Call commitVote(disputeId, hash)                    │
│ │  ├─ Save salt to localStorage                           │
│ │  └─ Emit VoteCommitted event                            │
│ └─ VotingStatus shows: "3 of 5 jurors committed"           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Day 1-2: REVEAL PHASE (24h = 4,320 blocks)                 │
│ ├─ Jurors see JuryVotingPanel (reveal UI)                  │
│ ├─ Each juror:                                             │
│ │  ├─ Retrieve salt from localStorage                     │
│ │  ├─ Call revealVote(disputeId, vote, salt)              │
│ │  ├─ On-chain verification: hash(vote+salt) == commitHash│
│ │  └─ Emit VoteRevealed event                             │
│ └─ VotingStatus shows: "3 of 5 jurors revealed"            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Day 2: TALLY & EXECUTE                                      │
│ ├─ Tally votes (3-of-5 quorum)                             │
│ │  ├─ Count: RefundBuyer (3), ReleaseSeller (2)           │
│ │  └─ Ruling: RefundBuyer (majority)                       │
│ ├─ Emit VotingEnded event                                  │
│ ├─ Call executeRuling(disputeId)                           │
│ │  ├─ Call bazariEscrow.refund(orderId) (if RefundBuyer)  │
│ │  ├─ Or bazariEscrow.release(orderId) (if ReleaseSeller) │
│ │  ├─ Or bazariEscrow.partialRefund(orderId, %) (if Partial)│
│ │  ├─ Refund 50 BZR fee to winner (buyer)                 │
│ │  └─ Emit RulingExecuted event                           │
│ └─ DisputeDetailPage shows RulingCard                      │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Frontend State Flow

**DisputeDetailPage Rendering Logic**:
```typescript
function DisputeDetailPage({ disputeId }) {
  const { data: dispute, isLoading } = useDisputeDetails(disputeId);
  const { address } = useWallet();

  useDisputeEvents(disputeId); // Real-time updates

  if (isLoading) return <Skeleton />;

  const isJuror = dispute.jurors.includes(address);
  const userVote = dispute.votes.find(v => v.juror === address);

  return (
    <div>
      <DisputeHeader dispute={dispute} />
      <PartiesCard plaintiff={...} defendant={...} />
      <EvidenceViewer evidenceCID={dispute.evidenceCID} />
      <JurorsCard jurors={dispute.jurors} />

      {dispute.status !== 'RESOLVED' && (
        <VotingStatus
          phase={dispute.status}
          committedCount={dispute.committedCount}
          revealedCount={dispute.revealedCount}
          totalJurors={5}
        />
      )}

      {isJuror && dispute.status === 'COMMIT' && !userVote?.voteHash && (
        <JuryVotingPanel_Commit disputeId={disputeId} />
      )}

      {isJuror && dispute.status === 'REVEAL' && userVote?.voteHash && !userVote?.revealed && (
        <JuryVotingPanel_Reveal disputeId={disputeId} />
      )}

      {dispute.status === 'RESOLVED' && dispute.ruling && (
        <RulingCard ruling={dispute.ruling} />
      )}
    </div>
  );
}
```

### 6.3 LocalStorage Schema

**Critical Data** (commit-reveal):
```json
{
  "dispute_123_salt": "a3f8b2c1d4e5f6...",
  "dispute_123_vote": "{\"vote\":\"RefundBuyer\",\"partialSplit\":null}"
}
```

**Backup Strategy**:
- Show modal after commit: "Save this recovery code"
- Allow manual download as .txt file
- Email backup (optional, with encryption)

### 6.4 Error Recovery

**Scenario 1: User lost salt**
- Cannot reveal vote → Vote doesn't count
- Warning during commit: "Save your recovery code!"
- Fallback: Manual salt input in reveal phase

**Scenario 2: Insufficient juror reveals (<3)**
- Default ruling: RefundBuyer (buyer protection policy)
- Warning shown: "Insufficient juror participation"

**Scenario 3: Network failure during commit**
- Transaction pending → Show retry button
- Check if already committed (prevent double vote)

---

## 7. Gaps & Implementation Plan

### 7.1 Current Gap Breakdown (60%)

From **UI_UX_GAP_ANALYSIS.md Section 8**:

**Gap 8.1: Dispute Detail Page (CRITICAL) - 5 days**
- Missing: Complete lifecycle visualization
- Missing: Evidence section with IPFS preview
- Missing: Jurors section with VRF transparency
- Missing: Voting status with timers
- Missing: Ruling display with vote breakdown

**Gap 8.2: Jury Voting UI (CRITICAL) - 4 days**
- Missing: Commit phase UI (radio buttons, commit button)
- Missing: Reveal phase UI (reveal button, salt input)
- Missing: Commit-reveal explanation for users
- Missing: Salt backup modal
- Missing: Timer countdown

**Gap 8.3: Dispute History & My Disputes - 3 days**
- Missing: MyDisputesPage with tabs (plaintiff, defendant, juror)
- Missing: Dispute list with filters
- Missing: Vote status indicators for jurors

**Gap 8.4: Dispute Fee UI - 1 day**
- Missing: 50 BZR fee warning in DisputePanel
- Missing: Balance check
- Missing: Fee refund notification

**Gap 8.5: VRF Juror Selection Transparency - 2 days**
- Missing: VRF explanation for non-technical users
- Missing: "Verify VRF Proof" for advanced users
- Missing: Juror selection event in timeline

**Adjustment 8.1: DisputePanel Enhancement - 1 day**
- Add fee warning
- Add balance check
- Add link to DisputeDetailPage

**New Tela 8.3: Admin Disputes Dashboard - 4 days**
- Stats (total, resolved, pending, avg time)
- Ruling breakdown chart
- Juror leaderboard
- Global disputes list

**Total**: 20 days → **Optimized to 9 days** with component reuse and parallel work

### 7.2 Implementation Roadmap (9 days)

**Week 1 (Days 1-5): Core Dispute UI**

**Day 1-2**: DisputeDetailPage Foundation
- Create DisputeHeader component
- Create PartiesCard component
- Create EvidenceViewer component
- Create JurorsCard component (basic)
- Page layout and routing
- useDisputeDetails hook

**Day 3-4**: Jury Voting UI (Commit-Reveal)
- Create JuryVotingPanel_Commit component
- Create JuryVotingPanel_Reveal component
- Implement commit-reveal crypto (CryptoJS)
- Create useCommitVote hook
- Create useRevealVote hook
- Salt backup modal

**Day 5**: Voting Status & Timeline
- Create VotingStatus component
- Create CountdownTimer component
- Create TimelineStepper component
- Real-time updates (useDisputeEvents)

**Week 2 (Days 6-9): User Management & Admin**

**Day 6-7**: My Disputes Page
- Create MyDisputesPage with tabs
- Create DisputeCard component
- Implement filters (status, date)
- useMyDisputes hook
- Vote status indicators for jurors

**Day 8**: Ruling & Execution
- Create RulingCard component
- Implement vote breakdown visualization
- Execution status display
- Fee refund notification
- useExecuteRuling hook

**Day 9**: Admin Dashboard & Polish
- Create AdminDisputesDashboardPage
- Stats cards (total, resolved, pending)
- Ruling breakdown chart
- Juror leaderboard
- useAllDisputes hook
- Final polish and bug fixes

### 7.3 Dependencies & Blockers

**Blockchain Dependencies**:
- ✅ bazari-dispute pallet deployed
- ✅ VRF randomness source configured
- ⏳ DisputeUpdated event listener (backend)
- ⏳ Indexed dispute queries (backend API)

**Backend Dependencies**:
- `GET /api/disputes/:id` - Dispute details (cached)
- `GET /api/users/:address/disputes` - User's disputes
- `GET /api/admin/disputes` - All disputes (DAO)
- `GET /api/ipfs/:cid/preview` - IPFS preview generation
- WebSocket: Dispute events stream

**UI Dependencies**:
- Existing components: Card, Button, Badge, Avatar, Modal
- New dependencies:
  - `crypto-js` - Commit-reveal hashing
  - `react-countdown` - Countdown timers
  - `recharts` - Vote breakdown charts

**Blockers**:
- IPFS gateway reliability (fallback to multiple gateways)
- VRF proof verification (complex, advanced feature)
- Email notifications (requires email service setup)

### 7.4 Testing Strategy

**Unit Tests**:
- Commit-reveal crypto functions
- Salt generation and storage
- Vote hash verification
- Countdown timer calculations

**Integration Tests**:
- Open dispute flow (end-to-end)
- Commit vote flow
- Reveal vote flow
- Ruling execution

**E2E Tests** (Playwright):
- Buyer opens dispute
- Juror commits vote
- Juror reveals vote
- View ruling and execution
- Mobile responsive test

**Manual Testing Checklist**:
- [ ] Open dispute with evidence upload
- [ ] VRF juror selection displays correctly
- [ ] Commit vote and save salt
- [ ] Lose salt and try manual input
- [ ] Reveal vote successfully
- [ ] View ruling breakdown
- [ ] Verify fee refund
- [ ] Test all 3 ruling types (Refund, Release, Partial)
- [ ] Test insufficient quorum scenario
- [ ] Admin dashboard loads all disputes

### 7.5 Mobile Optimization

**Critical Mobile UX**:
- Evidence upload: Camera integration (direct capture)
- Vote selection: Large tap targets (min 48px)
- Salt backup: Prominent "Copy to Clipboard" button
- Timers: Sticky notifications for ending phases
- Floating "Vote Now" button for jurors

**Mobile Layout**:
- Vertical stack (no side-by-side)
- Collapsible sections (Evidence, Jurors)
- Bottom sheet for voting panel
- Sticky header with status

**Progressive Web App**:
- Push notifications for jurors ("Vote now!")
- Offline salt storage
- Home screen icon

---

## 8. Testing Requirements

### 8.1 Unit Tests

**File**: `/src/components/dispute/DisputeHeader.test.tsx`
```typescript
describe('DisputeHeader', () => {
  it('renders dispute ID and status', () => {
    render(<DisputeHeader dispute={mockDispute} />);
    expect(screen.getByText('Dispute #123')).toBeInTheDocument();
    expect(screen.getByText('VOTING')).toBeInTheDocument();
  });

  it('shows correct timeline progress', () => {
    render(<DisputeHeader dispute={mockDisputeResolved} />);
    expect(screen.getByText('Resolved')).toHaveClass('completed');
  });
});
```

**File**: `/src/hooks/blockchain/useCommitVote.test.ts`
```typescript
describe('useCommitVote', () => {
  it('generates random salt', async () => {
    const { result } = renderHook(() => useCommitVote());
    await act(async () => {
      result.current.mutate({ disputeId: 123, vote: 'RefundBuyer' });
    });

    const salt = localStorage.getItem('dispute_123_salt');
    expect(salt).toHaveLength(64); // 32 bytes hex
  });

  it('stores vote payload in localStorage', async () => {
    // ...
    const votePayload = localStorage.getItem('dispute_123_vote');
    expect(JSON.parse(votePayload)).toEqual({ vote: 'RefundBuyer', partialSplit: null });
  });
});
```

### 8.2 Integration Tests

**File**: `/src/pages/DisputeDetailPage.test.tsx`
```typescript
describe('DisputeDetailPage (Integration)', () => {
  it('juror can commit vote during commit phase', async () => {
    mockDisputeDetails({ status: 'COMMIT', isJuror: true });

    render(<DisputeDetailPage disputeId={123} />);

    await userEvent.click(screen.getByLabelText('Refund Buyer'));
    await userEvent.click(screen.getByText('Commit Vote'));

    await waitFor(() => {
      expect(screen.getByText('Vote committed!')).toBeInTheDocument();
    });
  });

  it('juror can reveal vote during reveal phase', async () => {
    mockDisputeDetails({ status: 'REVEAL', isJuror: true, hasCommitted: true });

    render(<DisputeDetailPage disputeId={123} />);

    await userEvent.click(screen.getByText('Reveal Vote'));

    await waitFor(() => {
      expect(screen.getByText('Vote revealed!')).toBeInTheDocument();
    });
  });
});
```

### 8.3 E2E Tests (Playwright)

**File**: `/e2e/dispute-flow.spec.ts`
```typescript
test('complete dispute flow: open → vote → ruling', async ({ page }) => {
  // Setup: Login as buyer
  await login(page, 'buyer');
  await page.goto('/app/orders/123');

  // Step 1: Open dispute
  await page.click('button:has-text("Open Dispute")');
  await page.fill('textarea[name="description"]', 'Wrong item delivered');
  await page.setInputFiles('input[type="file"]', 'evidence.jpg');
  await page.click('button:has-text("Submit Dispute")');

  await expect(page.locator('text=Dispute opened!')).toBeVisible();

  // Step 2: Login as juror
  await login(page, 'juror1');
  await page.goto('/app/disputes');
  await page.click('text=Vote now!');

  // Step 3: Commit vote
  await page.click('input[value="RefundBuyer"]');
  await page.click('button:has-text("Commit Vote")');

  // Save salt modal
  await page.click('text=I have saved my recovery code');
  await page.click('button:has-text("Continue")');

  // Step 4: Wait for reveal phase (fast-forward blockchain in test env)
  await advanceBlocks(4320); // 24h

  // Step 5: Reveal vote
  await page.goto('/app/disputes/1');
  await page.click('button:has-text("Reveal Vote")');

  await expect(page.locator('text=Vote revealed!')).toBeVisible();

  // Step 6: View ruling (after 3 jurors reveal)
  await simulateJurorReveals(3);
  await page.reload();

  await expect(page.locator('text=REFUND BUYER')).toBeVisible();
  await expect(page.locator('text=Executed')).toBeVisible();
});
```

### 8.4 Manual Testing Scenarios

**Scenario 1: Happy Path (Buyer Wins)**
1. Buyer opens dispute (50 BZR fee)
2. 5 jurors selected via VRF
3. 3+ jurors commit votes for "Refund Buyer"
4. 3+ jurors reveal votes
5. Ruling: Refund Buyer
6. Execution: 100% to buyer + 50 BZR fee refund
7. Order status: RESOLVED

**Scenario 2: Seller Wins**
1. Seller opens dispute
2. 3+ jurors vote "Release Seller"
3. Ruling: Release Seller
4. Execution: 100% to seller + 50 BZR fee refund

**Scenario 3: Partial Refund**
1. Dispute opened
2. 3+ jurors vote "Partial Refund: 60/40"
3. Ruling: Partial Refund
4. Execution: 60% to buyer, 40% to seller

**Scenario 4: Insufficient Quorum**
1. Dispute opened
2. Only 2 jurors reveal votes
3. Default ruling: Refund Buyer (buyer protection)

**Scenario 5: Lost Salt**
1. Juror commits vote
2. Clears localStorage (loses salt)
3. Cannot reveal vote
4. Vote doesn't count

**Scenario 6: Mobile Flow**
1. Open dispute via mobile camera
2. Commit vote with large tap targets
3. Save salt via "Copy to Clipboard"
4. Reveal vote with auto-paste

---

## 9. Acceptance Criteria

### 9.1 Functional Requirements

**FR-1: Dispute Opening**
- [ ] User can open dispute from OrderPage
- [ ] 50 BZR fee is locked on-chain
- [ ] Evidence is uploaded to IPFS
- [ ] Defendant receives email notification
- [ ] VRF selects 5 jurors automatically
- [ ] Jurors receive email notification

**FR-2: Juror Voting (Commit Phase)**
- [ ] Only selected jurors see voting panel
- [ ] Juror can select one of 3 ruling types
- [ ] Partial refund shows slider (0-100%)
- [ ] Commit button generates salt and hash
- [ ] Salt is saved to localStorage
- [ ] Salt backup modal is shown
- [ ] Vote hash is submitted on-chain
- [ ] Countdown timer shows time remaining

**FR-3: Juror Voting (Reveal Phase)**
- [ ] Reveal panel only shows after commit phase
- [ ] Salt is auto-retrieved from localStorage
- [ ] Manual salt input is available (fallback)
- [ ] Reveal button submits vote + salt
- [ ] On-chain verification passes (hash matches)
- [ ] Vote is counted in tally

**FR-4: Ruling & Execution**
- [ ] Tally executes when 3+ jurors reveal
- [ ] Majority vote becomes ruling
- [ ] Ruling is displayed in RulingCard
- [ ] Vote breakdown is shown (3-2, etc.)
- [ ] Execution calls bazariEscrow
- [ ] Funds are distributed correctly
- [ ] 50 BZR fee is refunded to winner
- [ ] Parties receive email notification

**FR-5: My Disputes Page**
- [ ] Shows disputes as plaintiff
- [ ] Shows disputes as defendant
- [ ] Shows disputes as juror
- [ ] Vote status is visible for juror disputes
- [ ] Filter by status works
- [ ] Search by ID works

**FR-6: Admin Dashboard**
- [ ] Shows total disputes count
- [ ] Shows resolution rate
- [ ] Shows ruling breakdown chart
- [ ] Shows juror leaderboard
- [ ] All disputes table loads
- [ ] Filters work (status, date)
- [ ] Export CSV works

### 9.2 Non-Functional Requirements

**NFR-1: Performance**
- [ ] DisputeDetailPage loads in <2s
- [ ] Real-time updates via WebSocket (<1s latency)
- [ ] IPFS preview loads in <5s
- [ ] Pagination supports 1000+ disputes

**NFR-2: Security**
- [ ] Salt is stored securely (localStorage)
- [ ] Vote hash cannot be reverse-engineered
- [ ] VRF proof is verifiable
- [ ] DAO-only routes check on-chain membership

**NFR-3: Usability**
- [ ] Commit-reveal is explained clearly
- [ ] VRF selection is explained for non-technical users
- [ ] Error messages are actionable
- [ ] Mobile tap targets are ≥48px

**NFR-4: Accessibility**
- [ ] WCAG 2.1 AA compliant
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast ratio ≥4.5:1

**NFR-5: Reliability**
- [ ] LocalStorage failure doesn't break app
- [ ] IPFS gateway failure has fallback
- [ ] Blockchain connection error shows retry
- [ ] Transaction failure shows clear error

### 9.3 User Acceptance Criteria

**UAC-1: Buyer Perspective**
- [ ] "I can easily open a dispute when seller doesn't deliver"
- [ ] "I understand the 50 BZR fee and that I'll get it back if I win"
- [ ] "I can track the dispute status in real-time"
- [ ] "I trust the juror selection is fair (VRF)"

**UAC-2: Seller Perspective**
- [ ] "I get notified when a dispute is opened against me"
- [ ] "I can see the evidence and understand the claim"
- [ ] "I trust the voting process is transparent"

**UAC-3: Juror Perspective**
- [ ] "I get notified when I'm selected as juror"
- [ ] "I understand commit-reveal voting (privacy)"
- [ ] "I know how to save my recovery code (salt)"
- [ ] "I can easily vote during commit phase"
- [ ] "I remember to reveal my vote during reveal phase"
- [ ] "I see when my vote is counted"

**UAC-4: DAO Admin Perspective**
- [ ] "I can monitor all disputes in one dashboard"
- [ ] "I can identify dispute trends (ruling breakdown)"
- [ ] "I can detect suspicious juror behavior (low participation)"
- [ ] "I can export data for analysis"

---

## 10. Appendix

### 10.1 Glossary

- **VRF**: Verifiable Random Function - Cryptographic function for unbiased randomness
- **Commit-Reveal**: Two-phase voting to prevent collusion (commit hash, then reveal plaintext)
- **Salt**: Random value added to vote before hashing (prevents rainbow table attacks)
- **Quorum**: Minimum number of votes required (3-of-5)
- **Ruling**: Final decision (RefundBuyer, ReleaseSeller, PartialRefund)
- **Plaintiff**: Party who opens dispute (usually buyer)
- **Defendant**: Party being disputed (usually seller)

### 10.2 References

- Pallet Spec: `/root/bazari/knowledge/20-blueprints/pallets/bazari-dispute/SPEC.md`
- Gap Analysis: `/root/bazari/UI_UX_GAP_ANALYSIS.md` (Section 8)
- Blockchain Integration: `/root/bazari/knowledge/20-blueprints/ui-ux/03-BLOCKCHAIN-INTEGRATION.md`
- Escrow Integration: `/root/bazari/knowledge/20-blueprints/pallets/bazari-escrow/SPEC.md`

### 10.3 Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-14 | Initial specification |

---

**Document Status**: ✅ COMPLETE AND READY FOR IMPLEMENTATION
**Next Steps**: Begin Day 1 implementation (DisputeDetailPage Foundation)
**Owner**: Bazari Frontend Team
**Review Date**: After 9-day implementation sprint
