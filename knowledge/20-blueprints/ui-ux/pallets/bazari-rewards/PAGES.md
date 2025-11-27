# bazari-rewards Pallet - Pages Specification

**Status**: 🔴 CRITICAL - P0 Priority
**Version**: 1.0
**Last Updated**: 2025-11-14
**Dependencies**: React 18, TypeScript, Next.js 14, shadcn/ui

---

## Table of Contents

1. [Pages Overview](#1-pages-overview)
2. [MissionsHubPage](#2-missionshubpage)
3. [StreakHistoryPage](#3-streakhistorypage)
4. [CashbackDashboardPage](#4-cashbackdashboardpage)
5. [AdminMissionsManagementPage](#5-adminmissionsmanagementpage)
6. [Routing Configuration](#6-routing-configuration)
7. [Navigation Integration](#7-navigation-integration)

---

## 1. Pages Overview

| Page | Route | Status | Priority | Effort | Users | Blockchain Queries |
|------|-------|--------|----------|--------|-------|--------------------|
| **MissionsHubPage** | `/app/rewards/missions` | ❌ Missing | P0 | 3 days | All | 3 queries + 1 subscription |
| **StreakHistoryPage** | `/app/rewards/streaks` | ❌ Missing | P0 | 2 days | All | 1 query + 1 subscription |
| **CashbackDashboardPage** | `/app/rewards/cashback` | ❌ Missing | P0 | 2 days | All | 2 queries + 1 subscription |
| **AdminMissionsManagementPage** | `/app/admin/missions` | ❌ Missing | P1 | 3 days | DAO | 1 query + 2 mutations |

**Total**: 4 pages, 10 days effort

---

## 2. MissionsHubPage

### 2.1 Overview

**Route**: `/app/rewards/missions`

**Purpose**: Central hub for viewing, tracking, and claiming missions.

**Priority**: P0 (CRITICAL)

**Effort**: 3 days

**Users**: All authenticated users

**File Path**: `/root/bazari/apps/web/src/app/(app)/rewards/missions/page.tsx`

---

### 2.2 Layout

**Desktop (≥1024px)**:
```
┌──────────────────────────────────────────────────────────────────┐
│ Header                                                            │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 🎯 Missions Hub                             [Search Missions] │ │
│ └──────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────┤
│ ┌────────────────────┬─────────────────────────────────────────┐ │
│ │ Sidebar (280px)    │ Main Content (flex-1)                   │ │
│ │                    │                                         │ │
│ │ ┌────────────────┐ │ ┌─────────────────────────────────────┐ │ │
│ │ │ StreakWidget   │ │ │ Filter Tabs:                        │ │ │
│ │ │ 🔥 7 Day       │ │ │ [All] [Active] [Completed]          │ │ │
│ │ │ Streak!        │ │ └─────────────────────────────────────┘ │ │
│ │ │ Next: 30 in    │ │                                         │ │
│ │ │ 23 days        │ │ ┌─────────────────────────────────────┐ │ │
│ │ └────────────────┘ │ │ Mission Cards Grid (3 columns):     │ │ │
│ │                    │ │                                         │ │
│ │ ┌────────────────┐ │ │ [MissionCard] [MissionCard]          │ │ │
│ │ │ CashbackBal.   │ │ │              [MissionCard]          │ │ │
│ │ │ 💰 1,234 ZARI  │ │ │                                         │ │
│ │ │ [View Details] │ │ │ [MissionCard] [MissionCard]          │ │ │
│ │ └────────────────┘ │ │              [MissionCard]          │ │ │
│ │                    │ │                                         │ │
│ │ ┌────────────────┐ │ │ [MissionCard] [MissionCard]          │ │ │
│ │ │ Quick Links    │ │ │              [MissionCard]          │ │ │
│ │ │ • Cashback     │ │ │                                         │ │
│ │ │ • Streaks      │ │ └─────────────────────────────────────┘ │ │
│ │ └────────────────┘ │                                         │ │
│ └────────────────────┴─────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile (<768px)**:
```
┌──────────────────────────┐
│ 🎯 Missions Hub    [🔍] │
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ StreakWidget         │ │
│ │ 🔥 7 Day Streak!     │ │
│ │ Next: 30 in 23 days  │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ CashbackBalance      │ │
│ │ 💰 1,234.56 ZARI     │ │
│ │ [View Details]       │ │
│ └──────────────────────┘ │
├──────────────────────────┤
│ [All] [Active] [Done]    │
├──────────────────────────┤
│ [MissionCard (full)]     │
│ [MissionCard (full)]     │
│ [MissionCard (full)]     │
│ [MissionCard (full)]     │
└──────────────────────────┘
```

---

### 2.3 Components Used

1. **StreakWidget** - Sidebar (desktop) or top (mobile)
2. **CashbackBalance** - Sidebar (desktop) or top (mobile)
3. **MissionCard** - 8-12 instances in grid
4. **MissionProgressBar** - Within each card
5. **MissionTypeIcon** - Within each card
6. **FilterTabs** - All, Active, Completed
7. **SearchInput** - Filter by mission name
8. **EmptyState** - No missions available
9. **LoadingSkeleton** - Loading state

---

### 2.4 Blockchain Integration

**Queries**:
```typescript
// Fetch all missions
const { data: missions, isLoading: missionsLoading } = useMissions();

// Fetch user progress for each mission
const { data: userProgress } = useUserMissionsProgress(userAddress);

// Fetch ZARI balance
const { data: zariBalance } = useZariBalance(userAddress);

// Fetch streak data
const { data: streak } = useStreakData(userAddress);
```

**Mutations**:
```typescript
// Claim mission reward (if manual claim)
const { mutate: claimReward, isPending: isClaiming } = useCompleteMission();
```

**Subscriptions**:
```typescript
// Real-time mission completion events
useMissionCompletedEvents({
  onEvent: (event) => {
    toast.success(`🎉 Mission Complete! +${event.rewardAmount} ZARI`);
    queryClient.invalidateQueries(['missions']);
    queryClient.invalidateQueries(['userMissions']);
  }
});
```

---

### 2.5 Data Requirements

```typescript
interface MissionsPageData {
  missions: Mission[];
  userProgress: Map<number, UserMission>;
  zariBalance: string;
  streak: Streak | null;
  currentBlock: number;
}

interface Mission {
  id: number;
  name: string;
  description: string;
  type: MissionType;
  rewardAmount: string;
  targetValue: number;
  maxCompletions: number;
  completionCount: number;
  expiresAt?: number;
  isActive: boolean;
  createdAt: number;
}

interface UserMission {
  missionId: number;
  progress: number;
  completed: boolean;
  completedAt?: number;
  rewardsClaimed: boolean;
}

interface Streak {
  currentStreak: number;
  longestStreak: number;
  lastActionBlock: number;
}
```

---

### 2.6 State Management

```typescript
const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
const [searchQuery, setSearchQuery] = useState('');
```

**Computed State**:
```typescript
const filteredMissions = useMemo(() => {
  let filtered = missions;

  // Filter by status
  if (filterStatus === 'active') {
    filtered = filtered.filter(m => m.isActive && !userProgress.get(m.id)?.completed);
  } else if (filterStatus === 'completed') {
    filtered = filtered.filter(m => userProgress.get(m.id)?.completed);
  }

  // Filter by search query
  if (searchQuery) {
    filtered = filtered.filter(m =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  return filtered;
}, [missions, filterStatus, searchQuery, userProgress]);
```

---

### 2.7 User Actions

1. **Filter missions**:
   - Click "All" → Show all missions
   - Click "Active" → Show active, uncompleted missions
   - Click "Completed" → Show completed missions

2. **Search missions**:
   - Type in search input → Filter by name/description

3. **View mission details**:
   - Click mission card → Expand inline or navigate to detail page

4. **Claim reward**:
   - Click "Claim" button → Call mutation → Show toast

5. **Navigate to cashback**:
   - Click CashbackBalance widget → Navigate to `/app/rewards/cashback`

6. **Navigate to streaks**:
   - Click StreakWidget → Navigate to `/app/rewards/streaks`

---

### 2.8 States

**Loading**:
```tsx
{missionsLoading ? (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <MissionCardSkeleton />
    <MissionCardSkeleton />
    <MissionCardSkeleton />
    <MissionCardSkeleton />
    <MissionCardSkeleton />
    <MissionCardSkeleton />
  </div>
) : (
  <MissionsList missions={filteredMissions} />
)}
```

**Empty**:
```tsx
{filteredMissions.length === 0 && (
  <EmptyState
    icon={<Package className="w-12 h-12" />}
    title="No missions available"
    description={
      searchQuery
        ? `No missions found for "${searchQuery}"`
        : filterStatus === 'completed'
        ? "You haven't completed any missions yet"
        : "Check back soon for new missions!"
    }
  />
)}
```

**Error**:
```tsx
{missionsError && (
  <div className="text-center py-12">
    <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
    <p className="text-destructive">Failed to load missions</p>
    <Button onClick={() => refetch()} variant="outline" className="mt-4">
      Retry
    </Button>
  </div>
)}
```

**Success**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {filteredMissions.map(mission => (
    <MissionCard
      key={mission.id}
      mission={mission}
      userProgress={userProgress.get(mission.id)}
      onClaim={() => claimReward(mission.id)}
    />
  ))}
</div>
```

---

### 2.9 Responsiveness

**Desktop (≥1024px)**:
- 3-column grid for mission cards
- Sidebar 280px wide
- Main content flex-1

**Tablet (768-1023px)**:
- 2-column grid for mission cards
- Sidebar collapses to top
- Widgets stacked horizontally

**Mobile (<768px)**:
- 1-column stack
- Widgets stacked vertically at top
- Full-width mission cards
- Compact filter tabs

---

### 2.10 Accessibility

**ARIA Labels**:
```tsx
<main aria-label="Missions Hub">
  <h1 className="sr-only">Missions Hub</h1>

  <div aria-label="Mission filters">
    <button aria-label="Show all missions" aria-pressed={filterStatus === 'all'}>
      All
    </button>
    <button aria-label="Show active missions" aria-pressed={filterStatus === 'active'}>
      Active
    </button>
    <button aria-label="Show completed missions" aria-pressed={filterStatus === 'completed'}>
      Completed
    </button>
  </div>

  <input
    type="search"
    aria-label="Search missions"
    placeholder="Search missions..."
  />

  <div aria-live="polite" aria-atomic="true">
    {filteredMissions.length} missions found
  </div>
</main>
```

**Keyboard Navigation**:
- Tab: Navigate through filters, search, mission cards
- Enter: Activate selected mission or claim button
- Escape: Close expanded mission details

**Screen Reader**:
- Announce mission progress: "Complete 5 Orders, 60% complete, 3 of 5 orders completed"
- Announce claim action: "Claim 50 ZARI reward"

---

### 2.11 Testing

**Unit Tests**:
- [ ] Renders all missions correctly
- [ ] Filter tabs work (all/active/completed)
- [ ] Search filters missions by name
- [ ] Progress bars show accurate percentages
- [ ] Claim button calls mutation
- [ ] Empty state shows when no missions

**Integration Tests**:
- [ ] Real-time updates on mission completion
- [ ] Claim reward updates balance
- [ ] Filter + search work together
- [ ] Navigation to cashback/streaks works

**E2E Tests**:
- [ ] User navigates to missions hub → Sees all missions
- [ ] User filters by active → Sees only active missions
- [ ] User searches for mission → Sees filtered results
- [ ] User claims reward → Balance updates

**Accessibility Tests**:
- [ ] Keyboard navigation works
- [ ] Screen reader announces progress
- [ ] ARIA labels present
- [ ] Color contrast meets WCAG 2.1 AA

**Performance Tests**:
- [ ] Page loads < 2s with 50+ missions
- [ ] Real-time updates < 500ms latency
- [ ] No memory leaks

---

### 2.12 Implementation Checklist

- [ ] Create page file: `apps/web/src/app/(app)/rewards/missions/page.tsx`
- [ ] Implement layout (desktop/tablet/mobile)
- [ ] Add StreakWidget to sidebar
- [ ] Add CashbackBalance to sidebar
- [ ] Implement filter tabs (all/active/completed)
- [ ] Implement search input
- [ ] Fetch missions with useMissions() hook
- [ ] Fetch user progress with useUserMissionsProgress() hook
- [ ] Render MissionCard grid
- [ ] Add claim reward mutation
- [ ] Add real-time WebSocket subscription
- [ ] Add loading/error/empty states
- [ ] Add responsive breakpoints
- [ ] Add ARIA labels and keyboard navigation
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Test accessibility
- [ ] Test performance
- [ ] Add to navigation menu

---

## 3. StreakHistoryPage

### 3.1 Overview

**Route**: `/app/rewards/streaks`

**Purpose**: Visualize daily streak history with calendar heatmap and milestones.

**Priority**: P0 (CRITICAL)

**Effort**: 2 days

**Users**: All authenticated users

**File Path**: `/root/bazari/apps/web/src/app/(app)/rewards/streaks/page.tsx`

---

### 3.2 Layout

**Desktop**:
```
┌──────────────────────────────────────────────────────────────┐
│ 🔥 Streak History                                            │
├──────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Stats Cards (3 columns):                               │  │
│ │ ┌────────────┐ ┌────────────┐ ┌────────────┐          │  │
│ │ │ Current    │ │ Longest    │ │ Total Days │          │  │
│ │ │ 7 days     │ │ 30 days    │ │ 45 days    │          │  │
│ │ └────────────┘ └────────────┘ └────────────┘          │  │
│ └────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Next Milestone: 30 days in 23 days                     │  │
│ │ Reward: 5,000 ZARI 💰                                  │  │
│ │ Progress: ████████████░░░░░░░░░░░░ 23%               │  │
│ └────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Streak Calendar (Last 365 Days):                       │  │
│ │                                                         │  │
│ │  Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov │  │
│ │  ■■□□■■■■■□□■■■■■■■□■■■■■□□■■■■■■■■■■■□□■■■■■■■■■■■■ │  │
│ │  (Heatmap: ■ = active, □ = inactive)                   │  │
│ │                                                         │  │
│ │  Legend: Less ░░░░░ More                               │  │
│ └────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Streak Chart (Line chart of streak over time):         │  │
│ │   30 ┤                                ╭─╮              │  │
│ │   25 ┤                       ╭────────╯ ╰─╮            │  │
│ │   20 ┤              ╭────────╯            ╰─╮          │  │
│ │   15 ┤         ╭────╯                       ╰─╮        │  │
│ │   10 ┤    ╭────╯                              ╰──╮     │  │
│ │    5 ┤╭───╯                                      ╰───╮ │  │
│ │    0 ┼─────────────────────────────────────────────── │  │
│ │      Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

### 3.3 Components Used

1. **StreakStats** - Stats cards (current/longest/total)
2. **MilestoneProgress** - Next milestone card
3. **StreakCalendar** - Heatmap calendar (365 days)
4. **StreakChart** - Line chart (recharts)

---

### 3.4 Blockchain Integration

**Queries**:
```typescript
// Fetch streak data
const { data: streak, isLoading } = useStreakHistory(userAddress);

// Streak data includes:
// - currentStreak: number
// - longestStreak: number
// - lastActionBlock: number
// - history: Map<Date, boolean> (365 days)
```

**Subscriptions**:
```typescript
// Real-time streak updates
useStreakUpdatedEvents({
  onEvent: (event) => {
    toast.success(`🔥 Streak updated: ${event.streak} days!`);
    queryClient.invalidateQueries(['streak']);
  }
});

// Streak bonus granted events
useStreakBonusGrantedEvents({
  onEvent: (event) => {
    toast.success(`🎉 Milestone reached! +${event.bonusAmount} ZARI`);
  }
});
```

---

### 3.5 Data Requirements

```typescript
interface StreakHistoryData {
  currentStreak: number;
  longestStreak: number;
  totalDays: number; // Total active days
  history: Map<string, boolean>; // Date → Active/Inactive (365 days)
  nextMilestone: {
    days: number; // 7, 30, or 100
    daysRemaining: number;
    rewardAmount: string;
  };
}
```

---

### 3.6 State Management

```typescript
const [viewMode, setViewMode] = useState<'month' | 'year'>('year');
const [selectedDate, setSelectedDate] = useState<Date | null>(null);
```

---

### 3.7 User Actions

1. **View calendar**: Hover over day → Tooltip shows "Nov 14: Active"
2. **Change view**: Toggle month/year view
3. **View milestone progress**: Scroll to milestone card
4. **View chart**: Scroll to streak chart

---

### 3.8 States

**Loading**:
```tsx
{isLoading && <StreakHistorySkeleton />}
```

**Empty**:
```tsx
{streak.totalDays === 0 && (
  <EmptyState
    icon={<Flame className="w-12 h-12" />}
    title="No streak yet"
    description="Start your streak today by performing daily actions!"
  />
)}
```

**Success**:
```tsx
<StreakCalendar
  history={streak.history}
  startDate={new Date('2024-11-14')}
  endDate={new Date('2025-11-14')}
/>
```

---

### 3.9 Responsiveness

**Desktop**: Full calendar (12 months visible)
**Mobile**: Scroll horizontally, 3 months visible

---

### 3.10 Accessibility

- ARIA labels: `aria-label="Streak calendar, 7 day streak"`
- Keyboard nav: Arrow keys to navigate calendar
- Screen reader: Announce streak milestones

---

### 3.11 Testing

- [ ] Calendar renders 365 days correctly
- [ ] Heatmap colors active/inactive days
- [ ] Stats show current/longest/total streaks
- [ ] Milestone progress updates daily
- [ ] Chart visualizes streak over time
- [ ] Mobile responsive

---

### 3.12 Implementation Checklist

- [ ] Create page file: `apps/web/src/app/(app)/rewards/streaks/page.tsx`
- [ ] Implement useStreakHistory() hook
- [ ] Create StreakStats component
- [ ] Create MilestoneProgress component
- [ ] Create StreakCalendar component (react-calendar-heatmap)
- [ ] Create StreakChart component (recharts)
- [ ] Add loading/error states
- [ ] Add responsive breakpoints
- [ ] Write tests
- [ ] Test accessibility

---

## 4. CashbackDashboardPage

### 4.1 Overview

**Route**: `/app/rewards/cashback`

**Purpose**: View ZARI cashback balance and history.

**Priority**: P0 (CRITICAL)

**Effort**: 2 days

**Users**: All authenticated users

**File Path**: `/root/bazari/apps/web/src/app/(app)/rewards/cashback/page.tsx`

---

### 4.2 Layout

**Desktop**:
```
┌──────────────────────────────────────────────────────────────┐
│ 💰 Cashback Dashboard                                       │
├──────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Total ZARI Balance: 1,234.56 ZARI                      │  │
│ │ ≈ 987.65 BZR (at current rate: 1 ZARI = 0.8 BZR)      │  │
│ │                                                         │  │
│ │ [Convert to BZR] [Withdraw to Wallet] [View Explorer] │  │
│ └────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Breakdown:                                              │  │
│ │ ├─ From Missions: 500.00 ZARI (40%)                    │  │
│ │ ├─ From Cashback: 734.56 ZARI (60%)                    │  │
│ │ └─ From Streaks: 0.00 ZARI (0%)                        │  │
│ │                                                         │  │
│ │ [Pie Chart]                                             │  │
│ └────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Cashback History:                                       │  │
│ │ ┌──────┬────────────────┬──────────┬──────────────────┐ │  │
│ │ │ Date │ Reason         │ Amount   │ TxHash           │ │  │
│ │ ├──────┼────────────────┼──────────┼──────────────────┤ │  │
│ │ │11/14 │ Order #123     │ +50 ZARI │ 0xabc...def      │ │  │
│ │ │11/13 │ Mission Done   │+100 ZARI │ 0x123...456      │ │  │
│ │ │11/12 │ Referral Bonus │ +25 ZARI │ 0x789...abc      │ │  │
│ │ └──────┴────────────────┴──────────┴──────────────────┘ │  │
│ │                                                         │  │
│ │ [Load More]                                             │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

### 4.3 Components Used

1. **CashbackBalance** - Total balance + actions
2. **CashbackBreakdown** - Pie chart (missions/cashback/streaks)
3. **CashbackHistory** - Table with pagination
4. **ConversionModal** - Convert ZARI to BZR (optional)

---

### 4.4 Blockchain Integration

**Queries**:
```typescript
// Fetch ZARI balance
const { data: balance } = useZariBalance(userAddress);

// Fetch cashback grants
const { data: grants, hasNextPage, fetchNextPage } = useCashbackGrants(userAddress);

// Fetch conversion rate (from DEX or config)
const { data: conversionRate } = useConversionRate();
```

**Mutations**:
```typescript
// Convert ZARI to BZR (optional)
const { mutate: convertZari } = useConvertZariToBzr();
```

**Subscriptions**:
```typescript
// Real-time cashback grants
useCashbackGrantedEvents({
  onEvent: (event) => {
    toast.success(`💰 +${event.amount} ZARI cashback received!`);
    queryClient.invalidateQueries(['zariBalance']);
    queryClient.invalidateQueries(['cashbackGrants']);
  }
});
```

---

### 4.5 Data Requirements

```typescript
interface CashbackDashboardData {
  totalBalance: string;
  breakdown: {
    fromMissions: string;
    fromCashback: string;
    fromStreaks: string;
  };
  grants: CashbackGrant[];
  conversionRate: number;
}

interface CashbackGrant {
  id: number;
  recipient: string;
  amount: string;
  reason: string;
  orderId?: number;
  grantedAt: number;
  txHash?: string;
}
```

---

### 4.6 State Management

```typescript
const [showConversionModal, setShowConversionModal] = useState(false);
const [selectedGrant, setSelectedGrant] = useState<CashbackGrant | null>(null);
```

---

### 4.7 User Actions

1. **Convert to BZR**: Click button → Open modal → Enter amount → Confirm
2. **Withdraw to Wallet**: Click button → Transfer ZARI to external wallet
3. **View on Explorer**: Click txHash → Open blockchain explorer
4. **Filter history**: Select date range → Update table
5. **Paginate**: Click "Load More" → Fetch next page

---

### 4.8 States

**Loading**: Skeleton balance + table
**Empty**: "No cashback grants yet. Complete missions to earn ZARI!"
**Error**: "Failed to load cashback data. [Retry]"
**Success**: Display balance, breakdown, and history

---

### 4.9 Responsiveness

**Desktop**: Full table with all columns
**Mobile**: Collapse table, show cards instead

---

### 4.10 Accessibility

- ARIA labels: `aria-label="Cashback balance: 1,234.56 ZARI"`
- Keyboard nav: Tab through actions
- Screen reader: Announce balance and history

---

### 4.11 Testing

- [ ] Balance matches on-chain state
- [ ] Breakdown sums to total
- [ ] History table shows all grants
- [ ] Pagination works
- [ ] Conversion modal opens/closes
- [ ] Real-time updates on grants
- [ ] Mobile responsive

---

### 4.12 Implementation Checklist

- [ ] Create page file: `apps/web/src/app/(app)/rewards/cashback/page.tsx`
- [ ] Implement useZariBalance() hook
- [ ] Implement useCashbackGrants() hook
- [ ] Create CashbackBalance component
- [ ] Create CashbackBreakdown component (pie chart with recharts)
- [ ] Create CashbackHistory component
- [ ] Create ConversionModal component (optional)
- [ ] Add pagination logic
- [ ] Add loading/error states
- [ ] Add responsive breakpoints
- [ ] Write tests
- [ ] Test accessibility

---

## 5. AdminMissionsManagementPage

### 5.1 Overview

**Route**: `/app/admin/missions`

**Purpose**: DAO members create and manage missions.

**Priority**: P1 (HIGH)

**Effort**: 3 days

**Users**: DAO members only (Council)

**File Path**: `/root/bazari/apps/web/src/app/(app)/admin/missions/page.tsx`

---

### 5.2 Layout

**Desktop**:
```
┌──────────────────────────────────────────────────────────────┐
│ ⚙️ Admin: Mission Management                  [Create New] │
├──────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Mission Stats:                                          │  │
│ │ Active: 12 | Completed: 45 | Total Rewards: 10,500 ZARI│  │
│ └────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Missions List:                          [Filter: All ▼] │  │
│ │ ┌──────┬──────────┬──────┬─────────┬─────────┬────────┐ │  │
│ │ │ ID   │ Name     │ Type │ Reward  │ Status  │ Action │ │  │
│ │ ├──────┼──────────┼──────┼─────────┼─────────┼────────┤ │  │
│ │ │ 1    │ 5 Orders │ CO   │ 50 ZARI │ Active  │ [Edit] │ │  │
│ │ │ 2    │ Spend 100│ SA   │ 100 ZARI│ Active  │ [Edit] │ │  │
│ │ │ 3    │ Refer 3  │ RU   │ 75 ZARI │ Expired │ [View] │ │  │
│ │ │ 4    │ Create   │ CS   │ 100 ZARI│ Active  │ [Edit] │ │  │
│ │ └──────┴──────────┴──────┴─────────┴─────────┴────────┘ │  │
│ │                                                         │  │
│ │ [Load More]                                             │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

### 5.3 Components Used

1. **CreateMissionForm** - Modal form
2. **MissionsList** - Admin table
3. **MissionStats** - Dashboard stats
4. **AccessDenied** - Non-DAO users

---

### 5.4 Blockchain Integration

**Queries**:
```typescript
// Fetch all missions (admin view)
const { data: missions, isLoading } = useMissions();

// Check DAO membership
const { data: isDaoMember } = useIsDaoMember(userAddress);
```

**Mutations**:
```typescript
// Create mission (DAO only)
const { mutate: createMission } = useCreateMission();

// Deactivate mission (DAO only)
const { mutate: deactivateMission } = useDeactivateMission();
```

---

### 5.5 Authorization

```typescript
// Check if user is DAO member
const { data: isDaoMember, isLoading: checkingAuth } = useIsDaoMember(userAddress);

if (checkingAuth) {
  return <LoadingSpinner />;
}

if (!isDaoMember) {
  return (
    <AccessDenied
      title="Access Denied"
      description="You must be a DAO member to access this page."
    />
  );
}
```

**DAO Check Hook**:
```typescript
export function useIsDaoMember(address: string) {
  return useBlockchainQuery(['isDaoMember', address], async () => {
    const members = await api.query.council.members();
    return members.some(m => m.toString() === address);
  });
}
```

---

### 5.6 Data Requirements

```typescript
interface AdminMissionsData {
  missions: Mission[];
  stats: {
    active: number;
    completed: number;
    totalRewards: string;
  };
  isDaoMember: boolean;
}
```

---

### 5.7 State Management

```typescript
const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired'>('all');
```

---

### 5.8 User Actions

1. **Create mission**: Click "Create New" → Open modal → Fill form → Submit
2. **Edit mission**: Click "Edit" → Open modal → Update fields → Submit
3. **Deactivate mission**: Click "Deactivate" → Confirm → Call mutation
4. **View stats**: See active/completed/total missions
5. **Filter missions**: Select filter → Update table

---

### 5.9 States

**Loading**: Skeleton table
**Error**: "Failed to load missions. [Retry]"
**Success**: Display missions list
**Access Denied**: "You must be a DAO member to access this page."

---

### 5.10 Responsiveness

**Desktop**: Full table with all columns
**Mobile**: Stack cards, collapse columns

---

### 5.11 Accessibility

- ARIA labels: `aria-label="Create new mission"`
- Keyboard nav: Tab through table, Enter to open modal
- Screen reader: Announce mission count

---

### 5.12 Testing

- [ ] Only DAO members can access
- [ ] Create mission calls blockchain
- [ ] Mission appears in list after creation
- [ ] Deactivate mission works
- [ ] Stats update in real-time
- [ ] Filter works
- [ ] Mobile responsive

---

### 5.13 Implementation Checklist

- [ ] Create page file: `apps/web/src/app/(app)/admin/missions/page.tsx`
- [ ] Implement DAO authorization check
- [ ] Create useIsDaoMember() hook
- [ ] Create CreateMissionForm component
- [ ] Implement useCreateMission() hook
- [ ] Implement useDeactivateMission() hook
- [ ] Create MissionStats component
- [ ] Add access control (<AccessDenied />)
- [ ] Add loading/error states
- [ ] Write tests
- [ ] Test DAO-only access

---

## 6. Routing Configuration

### 6.1 Next.js App Router Structure

```
apps/web/src/app/
└── (app)/
    └── rewards/
        ├── layout.tsx         # Shared layout for rewards pages
        ├── missions/
        │   └── page.tsx       # MissionsHubPage
        ├── streaks/
        │   └── page.tsx       # StreakHistoryPage
        └── cashback/
            └── page.tsx       # CashbackDashboardPage

apps/web/src/app/
└── (app)/
    └── admin/
        └── missions/
            └── page.tsx       # AdminMissionsManagementPage
```

### 6.2 Shared Layout

`apps/web/src/app/(app)/rewards/layout.tsx`:

```tsx
export default function RewardsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container mx-auto py-8">
      {/* Breadcrumbs */}
      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/app' },
            { label: 'Rewards', href: '/app/rewards' },
          ]}
        />
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
```

---

## 7. Navigation Integration

### 7.1 Main Navigation Menu

Add to `apps/web/src/components/layout/navigation.tsx`:

```tsx
const navigationItems = [
  // ... existing items
  {
    label: 'Rewards',
    icon: Gift,
    href: '/app/rewards/missions',
    children: [
      { label: 'Missions', href: '/app/rewards/missions' },
      { label: 'Streaks', href: '/app/rewards/streaks' },
      { label: 'Cashback', href: '/app/rewards/cashback' },
    ],
  },
  // ... existing items
];
```

### 7.2 Quick Access Widget

Add StreakWidget and CashbackBalance to dashboard/sidebar:

```tsx
// apps/web/src/app/(app)/dashboard/page.tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  {/* Existing widgets */}
  <StreakWidget {...streakData} />
  <CashbackBalance {...cashbackData} />
</div>
```

### 7.3 Admin Navigation

Add to admin menu (if DAO member):

```tsx
{isDaoMember && (
  <NavigationItem
    label="Admin"
    icon={Settings}
    href="/app/admin"
    children={[
      { label: 'Missions', href: '/app/admin/missions' },
      // ... other admin pages
    ]}
  />
)}
```

---

**Document Status**: ✅ COMPLETE
**Next Steps**: Implement pages in order: MissionsHubPage → StreakHistoryPage → CashbackDashboardPage → AdminMissionsManagementPage
**Dependencies**: [UI-SPEC.md](./UI-SPEC.md), [COMPONENTS.md](./COMPONENTS.md), [HOOKS.md](./HOOKS.md)
