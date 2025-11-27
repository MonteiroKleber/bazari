# bazari-rewards Pallet - UI/UX Specification

**Status**: 🔴 CRITICAL - P0 Priority
**Coverage**: 20% → 100% (80% gap)
**Effort**: 10 days (2 weeks)
**Version**: 1.0
**Last Updated**: 2025-11-14
**Dependencies**: bazari-commerce, pallet-assets (ZARI token)

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

The **bazari-rewards** pallet provides gamification and incentive mechanisms through:
- **Missions**: Configurable goals that reward ZARI tokens (e.g., complete 5 orders → earn 50 ZARI)
- **Streaks**: Daily activity tracking with milestone bonuses (7, 30, 100 days)
- **Cashback**: ZARI token grants for purchases and referrals
- **ZARI Token**: Real on-chain asset (via pallet-assets) that is transferable and tradable

**Critical Context**: This is the MOST CRITICAL pallet with an 80% UI/UX gap. Current implementation has:
- ❌ No missions dashboard
- ❌ No streak tracking UI
- ❌ No cashback balance display
- ⚠️ Placeholder MissionCard in chat (not blockchain-connected)

### 1.2 Current State Analysis (20% Coverage)

**What Exists**:
- ⚠️ `MissionCard` component in chat - displays static missions, NOT connected to blockchain
- ⚠️ `OpportunityCard` component - generic opportunities, NOT actual missions
- ❌ Zero pages dedicated to rewards
- ❌ Zero blockchain hooks for missions
- ❌ Zero mission type visualizations

**What's Missing (80% Gap)**:
1. **Missions Hub** - Central dashboard for all missions (0% complete)
2. **Streak Tracking** - Daily streak calendar and milestones (0% complete)
3. **Cashback Dashboard** - ZARI balance and history (0% complete)
4. **Mission Types** - 7 mission types need UI (CompleteOrders, SpendAmount, ReferUsers, CreateStore, FirstPurchase, DailyStreak, Custom)
5. **Admin Panel** - DAO mission creation interface (0% complete)
6. **Real-time Updates** - Mission completion notifications (0% complete)
7. **ZARI Token Display** - Show transferable ZARI balance (0% complete)
8. **Conversion UI** - Convert ZARI to BZR (0% complete)

### 1.3 Gap Analysis Reference

From `/root/bazari/UI_UX_GAP_ANALYSIS.md` Section 3:

**Gap 3.1: Missions Dashboard (CRITICAL)** - 5 days
- Missing missions page with progress tracking
- No mission type icons/differentiation
- No claim reward workflow

**Gap 3.2: Streak Tracking UI** - 3 days
- No streak widget or calendar
- Missing milestone bonuses (7/30/100 days)
- No streak history

**Gap 3.3: Cashback Balance Display** - 2 days
- ZARI balance not visible
- No cashback history
- Missing conversion UI

**Gap 3.4: Mission Completion Triggers** - 2 days
- No toast notifications
- No WebSocket listeners for events

**Total Effort**: 12 days (5 + 3 + 2 + 2)

### 1.4 Target Architecture

**Mission Types** (7 types):
```typescript
enum MissionType {
  CompleteOrders,  // Complete N orders → icon: 📦
  SpendAmount,     // Spend X BZR → icon: 💰
  ReferUsers,      // Refer Y users → icon: 👥
  CreateStore,     // Create marketplace → icon: 🏪
  FirstPurchase,   // First purchase bonus → icon: 🎉
  DailyStreak,     // Daily streak → icon: 🔥
  Custom,          // Admin-defined → icon: ⭐
}
```

**ZARI Token Properties**:
- AssetId: 1 (configured in genesis)
- Symbol: ZARI
- Decimals: 12
- Transferable: ✅ Yes
- Tradable: ✅ Yes (can be listed on DEX)
- Mintable: ✅ Yes (by pallet only)

**Streak Milestones**:
- 7 days → 1,000 ZARI bonus
- 30 days → 5,000 ZARI bonus
- 100 days → 20,000 ZARI bonus

---

## 2. User Flows

### 2.1 View Missions & Progress

**Actor**: Buyer or Seller (any user)

**Flow**:
1. User navigates to `/app/rewards/missions`
2. System fetches:
   - `bazariRewards.missions()` - All active missions
   - `bazariRewards.userMissions(accountId, missionId)` - User's progress for each mission
3. Display missions grid with:
   - Mission type icon
   - Title and description
   - Progress bar (e.g., "3/10 orders completed")
   - Reward amount (e.g., "50 ZARI")
   - CTA: "Claim" (if completed) or "View Details"
4. Filter tabs: All, Active, Completed
5. Search bar: Filter by mission name

**Edge Cases**:
- No active missions → Show empty state with "Check back soon!"
- Expired missions → Show "Expired" badge
- Reached max completions → Show "Completed" badge, disable claim

**Success Criteria**:
- User sees all missions with accurate progress
- Progress updates in real-time (WebSocket)
- Filter/search works correctly

**ASCII Mockup**:
```
┌─────────────────────────────────────────────────────────────┐
│  🎯 Missions Hub                                    [Search] │
├─────────────────────────────────────────────────────────────┤
│  [All] [Active] [Completed]                                 │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ 📦 Complete │  │ 💰 Spend    │  │ 👥 Refer    │         │
│  │ 5 Orders    │  │ 100 BZR     │  │ 3 Users     │         │
│  │             │  │             │  │             │         │
│  │ Progress:   │  │ Progress:   │  │ Progress:   │         │
│  │ █████░░░░░  │  │ ███░░░░░░░  │  │ ██░░░░░░░░  │         │
│  │ 3/5         │  │ 45/100 BZR  │  │ 2/3         │         │
│  │             │  │             │  │             │         │
│  │ Reward:     │  │ Reward:     │  │ Reward:     │         │
│  │ 50 ZARI     │  │ 100 ZARI    │  │ 75 ZARI     │         │
│  │             │  │             │  │             │         │
│  │ [Continue]  │  │ [Continue]  │  │ [Continue]  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.2 Complete Mission & Claim Reward

**Actor**: User

**Flow**:
1. User performs action that advances mission (e.g., completes an order)
2. Backend detects action → calls `bazariRewards.progressMission(user, missionId, 1)`
3. On-chain logic:
   - Increments `UserMission.progress`
   - If `progress >= target_value`:
     - Sets `UserMission.completed = true`
     - Auto-mints ZARI tokens via `Assets::mint_into()`
     - Emits `MissionCompleted` event
4. Frontend listens to `MissionCompleted` event (WebSocket)
5. Display toast notification: "🎉 Mission Complete! You earned 50 ZARI"
6. Update missions dashboard (cache invalidation)
7. User navigates to missions page → sees "Claim" button (if auto-claim disabled)
8. User clicks "Claim" → calls `bazariRewards.claimReward(missionId)` (if manual)
9. ZARI tokens appear in wallet balance

**Edge Cases**:
- Mission expired before completion → Show "Expired, cannot claim"
- Network error during claim → Retry mechanism with toast error
- Max completions reached → Mission auto-deactivates

**Success Criteria**:
- ZARI tokens minted to user's account
- Mission marked as completed on-chain
- Real-time notification displayed
- Balance updated in UI

**Auto-Claim Flow** (Preferred):
```
Order Completed
     ↓
bazari-commerce emits OrderCompleted
     ↓
bazari-rewards listens → progressMission()
     ↓
If progress >= target → auto-mint ZARI
     ↓
Emit MissionCompleted event
     ↓
Frontend shows toast notification
```

---

### 2.3 Track Daily Streak (7, 30, 100 day milestones)

**Actor**: User

**Flow**:
1. User performs daily action (e.g., login, complete order)
2. Backend calls `bazariRewards.updateStreak(user)`
3. On-chain logic:
   - Checks `RewardStreaks[user].last_action_block`
   - If `current_block - last_action_block < 14,400` (24h):
     - Increment `current_streak`
   - Else:
     - Reset `current_streak = 1` (streak broken)
   - Update `longest_streak` if applicable
   - Check milestones:
     - 7 days → Mint 1,000 ZARI bonus
     - 30 days → Mint 5,000 ZARI bonus
     - 100 days → Mint 20,000 ZARI bonus
   - Emit `StreakUpdated` and `StreakBonusGranted` (if milestone)
4. Frontend displays:
   - Streak widget: "🔥 7 Day Streak!"
   - Next milestone: "30 days in 23 days"
   - Calendar heatmap: Last 30 days (green = active)

**Edge Cases**:
- Streak broken → Show "Streak lost! Start new streak"
- Timezone handling → Use block numbers, not timestamps
- Multiple actions per day → Only count once per day

**Success Criteria**:
- Streak increments daily
- Milestones grant bonuses correctly
- Calendar visualization accurate
- Streak persists across sessions

**Streak Calendar Visual**:
```
November 2025
Mo Tu We Th Fr Sa Su
          1  2  3  4
 5  6  7  8  9 10 11
12 13 14 15 16 17 18
19 20 21 22 23 24 25
26 27 28 29 30

Legend:
■ Active day (logged in)
□ Inactive day
```

---

### 2.4 View Cashback Balance

**Actor**: User

**Flow**:
1. User navigates to `/app/rewards/cashback`
2. System queries `pallet_assets.account(ZARI_ASSET_ID, user)` → ZARI balance
3. System queries `bazariRewards.cashbackGrants()` → History of grants
4. Display:
   - **Total ZARI Balance**: 1,234.56 ZARI
   - **Breakdown**:
     - From missions: 500 ZARI
     - From cashback: 734.56 ZARI
     - From streaks: 0 ZARI
   - **Cashback History Table**:
     - Date, Reason, Amount, TxHash
5. Actions:
   - "Convert to BZR" button (if conversion enabled)
   - "Withdraw to Wallet" button
   - "View on Explorer" link (txHash)

**Edge Cases**:
- Zero balance → Show "Complete missions to earn ZARI!"
- Pending grants → Show "Pending" badge
- Failed minting → Show error, retry button

**Success Criteria**:
- Balance matches on-chain state
- History shows all grants
- Conversion works correctly

---

### 2.5 Convert ZARI to BZR

**Actor**: User

**Flow**:
1. User clicks "Convert to BZR" in Cashback Dashboard
2. Modal appears:
   - **Your ZARI Balance**: 1,234.56 ZARI
   - **Conversion Rate**: 1 ZARI = 0.8 BZR (example, configurable)
   - **Amount to Convert**: [Input field] ZARI
   - **You will receive**: ~987.65 BZR
   - **Fee**: 2% (example)
   - **Confirm** button
3. User enters amount, clicks Confirm
4. System calls `bazariRewards.convertZariToBzr(amount)` (or swap via DEX)
5. On-chain logic:
   - Burns ZARI tokens via `Assets::burn()`
   - Mints/transfers BZR to user
   - Emits `ZariConverted` event
6. Success toast: "✅ Converted 1,234.56 ZARI to 987.65 BZR"
7. Balance updates

**Edge Cases**:
- Insufficient ZARI → Disable button, show error
- Rate changes during conversion → Show warning, allow refresh
- Network error → Retry mechanism

**Success Criteria**:
- ZARI burned, BZR received
- Conversion rate accurate
- Fee deducted correctly

**Note**: Conversion may not be implemented initially (ZARI can be traded on DEX instead).

---

### 2.6 Admin Create Mission (DAO only)

**Actor**: DAO member

**Flow**:
1. Admin navigates to `/app/admin/missions`
2. Clicks "Create Mission" button
3. Modal appears with form:
   - **Mission Name**: [Input] (max 64 chars)
   - **Description**: [Textarea] (max 256 chars)
   - **Mission Type**: [Dropdown] (CompleteOrders, SpendAmount, etc.)
   - **Target Value**: [Number] (e.g., 10 orders)
   - **Reward Amount**: [Number] ZARI
   - **Max Completions**: [Number] (0 = unlimited)
   - **Expiration**: [Date picker] (optional)
4. Admin fills form, clicks "Create"
5. System calls `bazariRewards.createMission()` (requires DAO origin)
6. On-chain logic:
   - Validates DAO membership (Council)
   - Creates mission with unique ID
   - Emits `MissionCreated` event
7. Success toast: "✅ Mission created!"
8. Mission appears in missions list

**Edge Cases**:
- Not DAO member → Access denied
- Invalid input → Validation errors
- Duplicate mission name → Allow (unique ID)

**Success Criteria**:
- Only DAO can create missions
- Mission created on-chain
- Users see new mission immediately

**DAO Authorization Check**:
```typescript
// Check if user is DAO member
const isDaoMember = await api.query.council.members().then(members =>
  members.includes(userAddress)
);

if (!isDaoMember) {
  throw new Error('Access denied: DAO only');
}
```

---

## 3. Pages Required

### 3.1 Pages Overview

| Page Name | Route | Status | Priority | Effort | Users |
|-----------|-------|--------|----------|--------|-------|
| **MissionsHubPage** | `/app/rewards/missions` | ❌ Missing | P0 | 3 days | All |
| **StreakHistoryPage** | `/app/rewards/streaks` | ❌ Missing | P0 | 2 days | All |
| **CashbackDashboardPage** | `/app/rewards/cashback` | ❌ Missing | P0 | 2 days | All |
| **AdminMissionsManagementPage** | `/app/admin/missions` | ❌ Missing | P1 | 3 days | DAO |

**Total**: 4 pages, 10 days effort

---

### 3.2 MissionsHubPage

**Route**: `/app/rewards/missions`

**Purpose**: Central hub for all missions (active, completed, expired)

**Layout** (Desktop):
```
┌──────────────────────────────────────────────────────────────────┐
│  Header: "🎯 Missions Hub"                        [Search Input] │
├──────────────────────────────────────────────────────────────────┤
│  Sidebar:                    │  Main Content:                    │
│  ┌─────────────────────┐     │  ┌──────────────────────────────┐ │
│  │ StreakWidget        │     │  │ Filter Tabs:                 │ │
│  │ 🔥 7 Day Streak!    │     │  │ [All] [Active] [Completed]   │ │
│  │ Next: 30 in 23 days │     │  └──────────────────────────────┘ │
│  └─────────────────────┘     │                                   │
│  ┌─────────────────────┐     │  ┌──────────────────────────────┐ │
│  │ CashbackBalance     │     │  │ Mission Grid (3 cols):       │ │
│  │ 💰 1,234.56 ZARI    │     │  │                              │ │
│  │ [View Details]      │     │  │  [MissionCard] [MissionCard] │ │
│  └─────────────────────┘     │  │  [MissionCard] [MissionCard] │ │
│                              │  │  [MissionCard] [MissionCard] │ │
│                              │  └──────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**Layout** (Mobile):
```
┌──────────────────────────┐
│ 🎯 Missions Hub    [🔍] │
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ StreakWidget         │ │
│ │ 🔥 7 Day Streak!     │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ CashbackBalance      │ │
│ │ 💰 1,234.56 ZARI     │ │
│ └──────────────────────┘ │
├──────────────────────────┤
│ [All] [Active] [Done]    │
├──────────────────────────┤
│ [MissionCard]            │
│ [MissionCard]            │
│ [MissionCard]            │
└──────────────────────────┘
```

**Components Used**:
- `StreakWidget` (sidebar/top)
- `CashbackBalance` (sidebar/top)
- `MissionCard` (grid, 8-12 cards)
- `MissionProgressBar` (within cards)
- `MissionTypeIcon` (within cards)
- `FilterTabs` (All/Active/Completed)
- `SearchInput` (filter missions)
- `EmptyState` (no missions)

**Blockchain Integration**:
- **Query**: `useMissions()` - Fetch all missions
- **Query**: `useUserMissionProgress(missionId)` - Per-mission progress
- **Query**: `useZariBalance()` - ZARI token balance
- **Query**: `useStreakData()` - Current streak
- **Subscription**: `useMissionCompletedEvents()` - Real-time updates

**Data Requirements**:
```typescript
interface MissionsPageData {
  missions: Mission[];          // All missions from blockchain
  userProgress: Map<number, UserMission>; // Progress per mission
  zariBalance: string;          // ZARI balance (pallet-assets)
  streak: Streak | null;        // Current streak data
}
```

**State Management**:
- Filter state: `'all' | 'active' | 'completed'`
- Search query: `string`
- Loading states: Per query
- Error states: Toast notifications

**User Actions**:
1. **Filter missions**: Click tab → Update visible cards
2. **Search missions**: Type query → Filter by name/description
3. **View mission details**: Click card → Expand inline or navigate
4. **Claim reward**: Click "Claim" → Call mutation, show toast
5. **Navigate to cashback**: Click balance widget → `/app/rewards/cashback`
6. **Navigate to streaks**: Click streak widget → `/app/rewards/streaks`

**States**:
- **Loading**: Show skeleton cards (3-6 cards)
- **Empty**: "No missions available. Check back soon!"
- **Error**: "Failed to load missions. [Retry]"
- **Success**: Display mission cards with progress

**Responsiveness**:
- **Desktop (≥1024px)**: 3-column grid, sidebar
- **Tablet (768-1023px)**: 2-column grid, sidebar collapses to top
- **Mobile (<768px)**: 1-column stack, widgets at top

**Accessibility**:
- Page title: "Missions Hub"
- ARIA labels: `aria-label="Filter missions by status"`
- Keyboard nav: Tab through cards, Enter to expand
- Screen reader: Announce mission progress percentages

**Testing**:
- [ ] Renders all missions correctly
- [ ] Filter tabs work (all/active/completed)
- [ ] Search filters missions by name
- [ ] Progress bars show accurate percentages
- [ ] Claim button calls mutation
- [ ] Real-time updates on mission completion
- [ ] Mobile responsive (360px width)
- [ ] Accessibility: Tab navigation, screen reader

**Implementation Checklist**:
- [ ] Create MissionsHubPage component
- [ ] Implement useMissions() hook
- [ ] Implement useUserMissionProgress() hook
- [ ] Create StreakWidget component
- [ ] Create CashbackBalance component
- [ ] Create MissionCard component
- [ ] Add filter/search logic
- [ ] Add real-time WebSocket subscription
- [ ] Add loading/error/empty states
- [ ] Test responsiveness
- [ ] Test accessibility
- [ ] Add to navigation menu

---

### 3.3 StreakHistoryPage

**Route**: `/app/rewards/streaks`

**Purpose**: Visualize daily streak history with calendar heatmap

**Layout** (Desktop):
```
┌──────────────────────────────────────────────────────────────┐
│  🔥 Streak History                                           │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Current Streak: 7 days | Longest: 30 days | Total: 45 │  │
│  └────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Next Milestone: 30 days in 23 days                     │  │
│  │ Reward: 5,000 ZARI 💰                                  │  │
│  │ Progress: ████████████░░░░░░░░░░░░ 23%               │  │
│  └────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Streak Calendar (Last 365 Days):                       │  │
│  │                                                         │  │
│  │  Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov │  │
│  │  ■■□□■■■■■□□■■■■■■■□■■■■■□□■■■■■■■■■■■□□■■■■■■■■■■■■ │  │
│  │  (Heatmap: ■ = active, □ = inactive)                   │  │
│  └────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Streak Chart (Line chart of streak over time)          │  │
│  │   30 ┤                                ╭─╮              │  │
│  │   25 ┤                       ╭────────╯ ╰─╮            │  │
│  │   20 ┤              ╭────────╯            ╰─╮          │  │
│  │   15 ┤         ╭────╯                       ╰─╮        │  │
│  │   10 ┤    ╭────╯                              ╰──╮     │  │
│  │    5 ┤╭───╯                                      ╰───╮ │  │
│  │    0 ┼─────────────────────────────────────────────── │  │
│  │      Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Components Used**:
- `StreakCalendar` - Heatmap calendar (365 days)
- `StreakStats` - Current/longest/total stats
- `MilestoneProgress` - Next milestone countdown
- `StreakChart` - Line chart (recharts)

**Blockchain Integration**:
- **Query**: `useStreakHistory()` - Get streak data
- **Subscription**: `useStreakUpdatedEvents()` - Real-time updates

**Data Requirements**:
```typescript
interface StreakHistoryData {
  currentStreak: number;        // Current streak count
  longestStreak: number;        // All-time longest
  totalDays: number;            // Total active days
  history: Map<Date, boolean>;  // Daily activity (365 days)
  nextMilestone: {
    days: number;               // 7, 30, or 100
    daysRemaining: number;      // Days until milestone
    rewardAmount: string;       // ZARI reward
  };
}
```

**State Management**:
- Calendar view: `'month' | 'year'`
- Selected date: `Date | null` (hover tooltip)

**User Actions**:
1. **View calendar**: Hover over day → Tooltip "Nov 14: Active"
2. **Change view**: Toggle month/year view
3. **View milestones**: Scroll to milestone section

**States**:
- **Loading**: Skeleton calendar
- **Empty**: "Start your streak today!"
- **Error**: "Failed to load streak data. [Retry]"
- **Success**: Display calendar and chart

**Responsiveness**:
- **Desktop**: Full calendar (12 months visible)
- **Mobile**: Scroll horizontally, 3 months visible

**Accessibility**:
- ARIA labels: `aria-label="Streak calendar, 7 day streak"`
- Keyboard nav: Arrow keys to navigate calendar
- Screen reader: Announce streak milestones

**Testing**:
- [ ] Calendar renders 365 days correctly
- [ ] Heatmap colors active/inactive days
- [ ] Stats show current/longest/total streaks
- [ ] Milestone progress updates daily
- [ ] Chart visualizes streak over time
- [ ] Mobile responsive

**Implementation Checklist**:
- [ ] Create StreakHistoryPage component
- [ ] Implement useStreakHistory() hook
- [ ] Create StreakCalendar component (react-calendar-heatmap)
- [ ] Create StreakStats component
- [ ] Create MilestoneProgress component
- [ ] Create StreakChart component (recharts)
- [ ] Add loading/error states
- [ ] Test responsiveness
- [ ] Test accessibility

---

### 3.4 CashbackDashboardPage

**Route**: `/app/rewards/cashback`

**Purpose**: View ZARI cashback balance and history

**Layout** (Desktop):
```
┌──────────────────────────────────────────────────────────────┐
│  💰 Cashback Dashboard                                       │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Total ZARI Balance: 1,234.56 ZARI                      │  │
│  │ ≈ 987.65 BZR (at current rate: 1 ZARI = 0.8 BZR)      │  │
│  │                                                         │  │
│  │ [Convert to BZR] [Withdraw to Wallet] [View Explorer] │  │
│  └────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Breakdown:                                              │  │
│  │ ├─ From Missions: 500.00 ZARI (40%)                    │  │
│  │ ├─ From Cashback: 734.56 ZARI (60%)                    │  │
│  │ └─ From Streaks: 0.00 ZARI (0%)                        │  │
│  └────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Cashback History:                                       │  │
│  │ ┌──────┬────────────────┬──────────┬──────────────────┐ │  │
│  │ │ Date │ Reason         │ Amount   │ TxHash           │ │  │
│  │ ├──────┼────────────────┼──────────┼──────────────────┤ │  │
│  │ │11/14 │ Order #123     │ +50 ZARI │ 0xabc...def      │ │  │
│  │ │11/13 │ Mission Complete│+100 ZARI│ 0x123...456      │ │  │
│  │ │11/12 │ Referral Bonus │ +25 ZARI │ 0x789...abc      │ │  │
│  │ └──────┴────────────────┴──────────┴──────────────────┘ │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Components Used**:
- `CashbackBalance` - Total balance + actions
- `CashbackBreakdown` - Pie chart (missions/cashback/streaks)
- `CashbackHistory` - Table with pagination
- `ConversionModal` - Convert ZARI to BZR

**Blockchain Integration**:
- **Query**: `useZariBalance()` - pallet_assets.account(ZARI_ASSET_ID, user)
- **Query**: `useCashbackGrants()` - bazariRewards.cashbackGrants()
- **Mutation**: `useConvertZariToBzr()` - Conversion (if enabled)
- **Subscription**: `useCashbackGrantedEvents()` - Real-time grants

**Data Requirements**:
```typescript
interface CashbackDashboardData {
  totalBalance: string;         // Total ZARI balance
  breakdown: {
    fromMissions: string;
    fromCashback: string;
    fromStreaks: string;
  };
  history: CashbackGrant[];     // All grants
  conversionRate: number;       // ZARI to BZR rate
}
```

**State Management**:
- Pagination: Page number, items per page
- Filter: Date range
- Modal: Conversion modal open/closed

**User Actions**:
1. **Convert to BZR**: Click button → Open modal → Enter amount → Confirm
2. **Withdraw to Wallet**: Click button → Transfer ZARI to external wallet
3. **View on Explorer**: Click txHash → Open Polkadot.js explorer
4. **Filter history**: Select date range → Update table
5. **Paginate**: Click page → Load more grants

**States**:
- **Loading**: Skeleton table
- **Empty**: "No cashback grants yet. Complete missions to earn ZARI!"
- **Error**: "Failed to load cashback data. [Retry]"
- **Success**: Display balance and history

**Responsiveness**:
- **Desktop**: Full table with all columns
- **Mobile**: Collapse table, show cards

**Accessibility**:
- ARIA labels: `aria-label="Cashback balance: 1,234.56 ZARI"`
- Keyboard nav: Tab through actions
- Screen reader: Announce balance and history

**Testing**:
- [ ] Balance matches on-chain state
- [ ] Breakdown sums to total
- [ ] History table shows all grants
- [ ] Pagination works
- [ ] Conversion modal opens/closes
- [ ] Real-time updates on grants
- [ ] Mobile responsive

**Implementation Checklist**:
- [ ] Create CashbackDashboardPage component
- [ ] Implement useZariBalance() hook
- [ ] Implement useCashbackGrants() hook
- [ ] Create CashbackBalance component
- [ ] Create CashbackBreakdown component
- [ ] Create CashbackHistory component
- [ ] Create ConversionModal component
- [ ] Add pagination logic
- [ ] Add loading/error states
- [ ] Test responsiveness
- [ ] Test accessibility

---

### 3.5 AdminMissionsManagementPage

**Route**: `/app/admin/missions`

**Purpose**: DAO members create and manage missions

**Layout** (Desktop):
```
┌──────────────────────────────────────────────────────────────┐
│  ⚙️ Admin: Mission Management                  [Create New] │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Mission Stats:                                          │  │
│  │ Active: 12 | Completed: 45 | Total Rewards: 10,500 ZARI│  │
│  └────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Missions List:                                          │  │
│  │ ┌──────┬──────────┬──────┬─────────┬─────────┬────────┐ │  │
│  │ │ ID   │ Name     │ Type │ Reward  │ Status  │ Action │ │  │
│  │ ├──────┼──────────┼──────┼─────────┼─────────┼────────┤ │  │
│  │ │ 1    │ 5 Orders │ CO   │ 50 ZARI │ Active  │ [Edit] │ │  │
│  │ │ 2    │ Spend 100│ SA   │ 100 ZARI│ Active  │ [Edit] │ │  │
│  │ │ 3    │ Refer 3  │ RU   │ 75 ZARI │ Expired │ [View] │ │  │
│  │ └──────┴──────────┴──────┴─────────┴─────────┴────────┘ │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Components Used**:
- `CreateMissionForm` - Modal form
- `MissionsList` - Admin table
- `MissionStats` - Dashboard stats

**Blockchain Integration**:
- **Query**: `useMissions()` - All missions (admin view)
- **Mutation**: `useCreateMission()` - Create mission (DAO only)
- **Mutation**: `useDeactivateMission()` - Deactivate mission

**Authorization**:
```typescript
// Check DAO membership
const isDaoMember = await api.query.council.members().then(members =>
  members.some(m => m.toString() === userAddress)
);

if (!isDaoMember) {
  return <AccessDenied />;
}
```

**User Actions**:
1. **Create mission**: Click "Create New" → Open modal → Fill form → Submit
2. **Edit mission**: Click "Edit" → Open modal → Update fields → Submit
3. **Deactivate mission**: Click "Deactivate" → Confirm → Call mutation
4. **View stats**: See active/completed/total missions

**States**:
- **Loading**: Skeleton table
- **Error**: "Failed to load missions. [Retry]"
- **Success**: Display missions list
- **Access Denied**: "You must be a DAO member to access this page."

**Testing**:
- [ ] Only DAO members can access
- [ ] Create mission calls blockchain
- [ ] Mission appears in list after creation
- [ ] Deactivate mission works
- [ ] Stats update in real-time

**Implementation Checklist**:
- [ ] Create AdminMissionsManagementPage component
- [ ] Implement DAO authorization check
- [ ] Create CreateMissionForm component
- [ ] Implement useCreateMission() hook
- [ ] Implement useDeactivateMission() hook
- [ ] Create MissionStats component
- [ ] Add access control
- [ ] Test DAO-only access

---

## 4. Components Required

### 4.1 Components Overview

| Component | Type | Priority | Effort | Reusable |
|-----------|------|----------|--------|----------|
| **MissionCard** | Display | P0 | 1 day | Yes |
| **StreakWidget** | Display | P0 | 0.5 day | Yes |
| **CashbackBalance** | Display | P0 | 0.5 day | Yes |
| **StreakCalendar** | Visual | P0 | 1.5 days | No |
| **MissionProgressBar** | Display | P0 | 0.5 day | Yes |
| **MissionTypeIcon** | Display | P0 | 0.5 day | Yes |
| **CashbackHistory** | Table | P0 | 1 day | No |
| **CreateMissionForm** | Form | P1 | 1.5 days | No |

**Total**: 8 components, 7 days effort

Detailed component specs are in [COMPONENTS.md](./COMPONENTS.md).

---

## 5. Blockchain Hooks

### 5.1 Hooks Overview

| Hook | Type | Purpose | Effort |
|------|------|---------|--------|
| **useMissions** | Query | Fetch all missions | 0.5 day |
| **useUserMissionProgress** | Query | Get user progress for mission | 0.5 day |
| **useZariBalance** | Query | Get ZARI token balance | 0.5 day |
| **useStreakHistory** | Query | Get streak data | 0.5 day |
| **useCompleteMission** | Mutation | Claim mission reward | 0.5 day |
| **useCreateMission** | Mutation | Admin create mission | 0.5 day |
| **useGrantCashback** | Mutation | Mint ZARI cashback | 0.5 day |
| **useMissionCompletedEvents** | Subscription | Real-time mission completion | 0.5 day |

**Total**: 8 hooks, 4 days effort

Detailed hook implementations are in [HOOKS.md](./HOOKS.md).

---

## 6. Data Flow

### 6.1 Read Flow (Missions Dashboard)

```
User Opens /app/rewards/missions
        ↓
useMissions() hook
        ↓
useBlockchainQuery(['missions'], async () => {
  const missions = await api.query.bazariRewards.missions.entries();
  return missions.map(([key, value]) => value.toHuman());
})
        ↓
For each mission:
  useUserMissionProgress(missionId)
        ↓
  useBlockchainQuery(['userMission', missionId], async () => {
    return await api.query.bazariRewards.userMissions(userAddress, missionId);
  })
        ↓
Combine missions + progress → Render MissionCard
```

### 6.2 Write Flow (Complete Mission)

```
User Completes Action (e.g., Order)
        ↓
Backend Detects Action
        ↓
POST /api/blockchain/progress-mission
{
  userId: "0xAlice",
  missionId: 1,
  progressAmount: 1
}
        ↓
Backend calls blockchain:
api.tx.bazariRewards.progressMission(userId, missionId, 1)
        ↓
On-chain logic:
  - Increment UserMission.progress
  - If progress >= target:
    - Mark completed
    - Auto-mint ZARI
    - Emit MissionCompleted event
        ↓
Frontend listens to event (WebSocket):
blockchain-events.service.ts
        ↓
Emit event to frontend → useMissionCompletedEvents() hook
        ↓
Show toast notification: "🎉 Mission Complete! +50 ZARI"
        ↓
Invalidate cache → Re-fetch missions
```

### 6.3 Real-Time Updates Flow

```
blockchain-events.service.ts (Backend)
        ↓
Listen to events:
  - bazariRewards.MissionCompleted
  - bazariRewards.CashbackGranted
  - bazariRewards.StreakUpdated
        ↓
Emit via WebSocket to frontend clients
        ↓
Frontend hooks (useMissionCompletedEvents, etc.)
        ↓
React Query cache invalidation
        ↓
UI updates automatically
```

---

## 7. Gaps & Implementation Plan

### 7.1 Gap Summary (from UI_UX_GAP_ANALYSIS.md Section 3)

**Current State**: 20% coverage
- ⚠️ MissionCard exists but not blockchain-connected
- ❌ Zero pages dedicated to rewards
- ❌ Zero hooks for missions/streaks/cashback

**Target State**: 100% coverage
- ✅ 4 pages (Missions Hub, Streak History, Cashback Dashboard, Admin Management)
- ✅ 8 components (MissionCard, StreakWidget, CashbackBalance, etc.)
- ✅ 8 hooks (useMissions, useUserMissionProgress, etc.)
- ✅ Real-time updates via WebSocket

**Gap**: 80% (10 days effort)

### 7.2 Implementation Roadmap

**Week 1: Core Features (5 days)**
1. **Day 1-2**: Missions Hub Page
   - Create useMissions() hook
   - Create useUserMissionProgress() hook
   - Create MissionCard component (blockchain-connected)
   - Create MissionProgressBar component
   - Create MissionTypeIcon component
   - Implement MissionsHubPage layout
2. **Day 3**: Streak Tracking
   - Create useStreakHistory() hook
   - Create StreakWidget component
   - Create StreakCalendar component
   - Implement StreakHistoryPage
3. **Day 4**: Cashback Dashboard
   - Create useZariBalance() hook
   - Create useCashbackGrants() hook
   - Create CashbackBalance component
   - Create CashbackHistory component
   - Implement CashbackDashboardPage
4. **Day 5**: Real-Time Updates
   - Implement useMissionCompletedEvents() hook
   - Add WebSocket event listeners
   - Add toast notifications
   - Test end-to-end mission completion flow

**Week 2: Admin & Polish (5 days)**
1. **Day 6-7**: Admin Panel
   - Implement DAO authorization check
   - Create useCreateMission() hook
   - Create CreateMissionForm component
   - Implement AdminMissionsManagementPage
2. **Day 8**: Testing & Bug Fixes
   - Unit tests for hooks
   - Component tests
   - Integration tests (mission completion flow)
   - Fix edge cases
3. **Day 9**: Responsiveness & Accessibility
   - Test mobile layouts (360px width)
   - Add ARIA labels
   - Keyboard navigation
   - Screen reader testing
4. **Day 10**: Documentation & Deployment
   - Update navigation menu
   - Add links from other pages
   - Documentation
   - Code review
   - Deploy to staging

### 7.3 Dependencies

**Blockchain**:
- bazari-rewards pallet deployed on testnet
- ZARI asset created (AssetId: 1)
- Mission extrinsics working (create_mission, progress_mission)

**Backend**:
- `/api/blockchain/missions` - Get all missions
- `/api/blockchain/user-missions/:userId` - Get user progress
- `/api/blockchain/progress-mission` - Progress mission (POST)
- WebSocket event listeners for MissionCompleted, CashbackGranted

**Frontend**:
- useBlockchainQuery hook (existing)
- useBlockchainTx hook (existing)
- Toast notification system (existing)
- WebSocket client (existing)

### 7.4 Risks & Mitigations

**Risk 1**: Real-time updates lag
- **Mitigation**: Implement optimistic updates, cache invalidation strategies

**Risk 2**: Mission progress calculation complexity
- **Mitigation**: Backend handles logic, frontend only displays

**Risk 3**: ZARI balance not updating
- **Mitigation**: Use pallet-assets queries directly, not cached

**Risk 4**: DAO authorization fails
- **Mitigation**: Clear error messages, fallback to read-only view

---

## 8. Testing Requirements

### 8.1 Unit Tests

**Hooks**:
- [ ] `useMissions()` - Fetches all missions correctly
- [ ] `useUserMissionProgress()` - Returns accurate progress
- [ ] `useZariBalance()` - Matches on-chain balance
- [ ] `useStreakHistory()` - Calculates streak correctly
- [ ] `useCompleteMission()` - Claims reward successfully
- [ ] `useCreateMission()` - Creates mission (DAO only)

**Components**:
- [ ] `MissionCard` - Renders mission details
- [ ] `StreakWidget` - Displays current streak
- [ ] `CashbackBalance` - Shows ZARI balance
- [ ] `StreakCalendar` - Renders 365-day heatmap
- [ ] `MissionProgressBar` - Shows progress percentage
- [ ] `MissionTypeIcon` - Displays correct icon

### 8.2 Integration Tests

- [ ] **Mission Completion Flow**:
  1. User completes order
  2. Backend calls progressMission
  3. Mission marked complete on-chain
  4. ZARI minted to user
  5. Event emitted
  6. Frontend receives event
  7. Toast notification shown
  8. Balance updated
  9. Mission card shows "Completed"

- [ ] **Streak Update Flow**:
  1. User performs daily action
  2. Backend calls updateStreak
  3. Streak incremented on-chain
  4. Milestone bonus granted (if applicable)
  5. Frontend updates streak widget

- [ ] **Admin Create Mission Flow**:
  1. DAO member navigates to admin page
  2. Fills create mission form
  3. Submits transaction
  4. Mission created on-chain
  5. Mission appears in missions list
  6. Users see new mission

### 8.3 E2E Tests

- [ ] User navigates to missions hub → Sees all missions
- [ ] User completes action → Mission progress updates
- [ ] User claims reward → ZARI balance increases
- [ ] User views streak history → Calendar shows active days
- [ ] User views cashback dashboard → Balance matches on-chain
- [ ] Admin creates mission → Mission appears for all users

### 8.4 Accessibility Tests

- [ ] Keyboard navigation works (Tab, Enter, Arrow keys)
- [ ] Screen reader announces mission progress
- [ ] ARIA labels present on all interactive elements
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1)
- [ ] Focus indicators visible

### 8.5 Performance Tests

- [ ] Missions page loads < 2s (with 50+ missions)
- [ ] Real-time updates < 500ms latency
- [ ] Calendar heatmap renders < 1s (365 days)
- [ ] No memory leaks on WebSocket connections

---

## 9. Acceptance Criteria

### 9.1 Functional Requirements

- [ ] **Missions Hub Page**:
  - [ ] Displays all active missions with accurate progress
  - [ ] Filter by status (all/active/completed) works
  - [ ] Search filters missions by name
  - [ ] Claim reward button mints ZARI tokens
  - [ ] Real-time updates on mission completion

- [ ] **Streak History Page**:
  - [ ] Shows current streak, longest streak, total days
  - [ ] Calendar heatmap displays 365 days of activity
  - [ ] Next milestone countdown accurate
  - [ ] Milestones grant bonuses (7/30/100 days)

- [ ] **Cashback Dashboard Page**:
  - [ ] ZARI balance matches on-chain state
  - [ ] Cashback history shows all grants
  - [ ] Breakdown sums to total balance
  - [ ] Conversion to BZR works (if enabled)

- [ ] **Admin Missions Management Page**:
  - [ ] Only DAO members can access
  - [ ] Create mission form submits to blockchain
  - [ ] Created missions appear in list
  - [ ] Deactivate mission works

- [ ] **Mission Types**:
  - [ ] CompleteOrders - Tracks order completions
  - [ ] SpendAmount - Tracks total spend
  - [ ] ReferUsers - Tracks referrals
  - [ ] CreateStore - One-time store creation
  - [ ] FirstPurchase - One-time first purchase
  - [ ] DailyStreak - Daily login tracking
  - [ ] Custom - Admin-defined missions

### 9.2 Non-Functional Requirements

- [ ] **Performance**:
  - [ ] Page load < 2s
  - [ ] Real-time updates < 500ms
  - [ ] Supports 1000+ users concurrently

- [ ] **Security**:
  - [ ] DAO-only routes protected
  - [ ] Mission creation requires Council membership
  - [ ] ZARI minting only via pallet (not user-initiated)

- [ ] **Usability**:
  - [ ] Mobile-first responsive design (360px+)
  - [ ] Clear mission progress indicators
  - [ ] Intuitive navigation
  - [ ] Helpful error messages

- [ ] **Accessibility**:
  - [ ] WCAG 2.1 AA compliant
  - [ ] Keyboard navigation
  - [ ] Screen reader support
  - [ ] Color contrast 4.5:1+

### 9.3 Success Metrics

- [ ] **User Engagement**:
  - [ ] 80%+ users view missions within first week
  - [ ] 50%+ users complete at least 1 mission
  - [ ] 30%+ users maintain 7-day streak

- [ ] **Technical**:
  - [ ] Zero critical bugs in production
  - [ ] 99.9% uptime
  - [ ] < 1% error rate on mutations

- [ ] **Business**:
  - [ ] 20%+ increase in order completion rate (missions incentive)
  - [ ] 15%+ increase in daily active users (streaks)
  - [ ] 10%+ increase in referrals (referral missions)

---

## 10. Appendix

### 10.1 Mission Type Examples

**CompleteOrders**:
- Title: "Complete 5 Orders"
- Description: "Complete 5 successful orders to earn rewards"
- Target: 5
- Reward: 50 ZARI
- Icon: 📦

**SpendAmount**:
- Title: "Spend 100 BZR"
- Description: "Spend a total of 100 BZR on the marketplace"
- Target: 100 (in BZR)
- Reward: 100 ZARI
- Icon: 💰

**ReferUsers**:
- Title: "Refer 3 Friends"
- Description: "Invite 3 friends to join Bazari"
- Target: 3
- Reward: 75 ZARI
- Icon: 👥

**CreateStore**:
- Title: "Create Your Store"
- Description: "Set up your first marketplace store"
- Target: 1
- Reward: 100 ZARI
- Icon: 🏪
- Max Completions: 1 (one-time)

**FirstPurchase**:
- Title: "First Purchase Bonus"
- Description: "Make your first purchase on Bazari"
- Target: 1
- Reward: 50 ZARI
- Icon: 🎉
- Max Completions: 1 (one-time)

**DailyStreak**:
- Title: "7 Day Streak"
- Description: "Login 7 days in a row"
- Target: 7
- Reward: 1,000 ZARI
- Icon: 🔥

**Custom**:
- Title: "Holiday Special"
- Description: "Complete any 10 actions during December"
- Target: 10
- Reward: 200 ZARI
- Icon: ⭐

### 10.2 ZARI Token Specification

**Asset Details**:
- Asset ID: 1
- Symbol: ZARI
- Name: Bazari Reward Token
- Decimals: 12
- Total Supply: Unlimited (mintable by pallet)
- Transferable: ✅ Yes
- Tradable: ✅ Yes (can be listed on DEX)

**Minting Rules**:
- Only bazari-rewards pallet can mint
- Triggered by:
  - Mission completion
  - Streak milestones
  - Cashback grants (order purchases)
  - Admin grants (DAO discretion)

**Use Cases**:
- Pay for orders (if accepted by seller)
- Convert to BZR (via DEX or pallet)
- Transfer to other users
- Withdraw to external wallet

### 10.3 Glossary

- **Mission**: Configurable goal that rewards ZARI tokens
- **Streak**: Daily activity tracking with milestone bonuses
- **Cashback**: ZARI tokens granted for purchases
- **ZARI**: Bazari reward token (pallet-assets, AssetId 1)
- **DAO**: Decentralized Autonomous Organization (Council)
- **Progress**: User's completion status for a mission (0-100%)
- **Milestone**: Streak goal (7, 30, 100 days) with bonus reward
- **Grant**: Cashback distribution event

---

**Document Status**: ✅ COMPLETE
**Next Steps**: Implement [COMPONENTS.md](./COMPONENTS.md), [PAGES.md](./PAGES.md), [HOOKS.md](./HOOKS.md)
**Review Date**: 2025-11-21 (after Week 1 implementation)
