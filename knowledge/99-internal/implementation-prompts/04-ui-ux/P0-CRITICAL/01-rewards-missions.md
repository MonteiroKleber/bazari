# P0-CRITICAL: Rewards & Missions - Full Gamification System

**Phase**: P0 | **Priority**: CRITICAL | **Effort**: 10 days | **Pallets**: bazari-rewards

---

## Metadata

- **Prompt ID**: P0-01
- **Created**: 2025-11-14
- **Gap**: 80% (highest across all pallets)
- **Blocks**: P2-02 (mission triggers), dashboard gamification
- **Dependencies**: ZARI token configured, bazari-rewards pallet deployed
- **Team**: 1-2 frontend developers
- **Skills**: React, TypeScript, Polkadot.js, React Query, D3.js

---

## 1. Context (150 lines)

### 1.1 Problem Statement

The **bazari-rewards** pallet is fully implemented on-chain with 7 mission types, daily streaks, and ZARI token cashback. However, the frontend has **80% gap** - the highest across all pallets:

**Missing**:
- ❌ No missions dashboard or hub
- ❌ No streak tracking UI or calendar
- ❌ No cashback balance display
- ❌ No mission completion notifications
- ❌ No mission type visualizations (7 types need icons)
- ❌ No admin panel for DAO to create missions
- ❌ No ZARI token balance integration
- ❌ No conversion UI (ZARI → BZR)

**Existing** (placeholder only):
- ⚠️ `MissionCard` component in chat - NOT connected to blockchain
- ⚠️ `OpportunityCard` component - NOT actual missions

**User Impact**:
- Users cannot see available missions
- Cannot track progress toward rewards
- Cannot claim ZARI tokens
- No gamification → low engagement
- No visibility into streak bonuses
- ZARI tokens minted but not discoverable

### 1.2 Current State

**File Locations**:
```
apps/web/src/components/chat/MissionCard.tsx       ⚠️ Placeholder, not blockchain
apps/web/src/components/chat/OpportunityCard.tsx   ⚠️ Generic opportunities
apps/web/src/hooks/                                ❌ No mission hooks
apps/web/src/pages/                                ❌ No rewards pages
```

**What Works**:
- Chat-based mission cards (static data, not blockchain)
- Generic opportunity display

**What Doesn't Work**:
- No blockchain queries for missions
- No progress tracking
- No reward claiming
- No streak visualization

### 1.3 Target State

**Complete Implementation** (100% coverage):

**4 New Pages**:
1. `/app/rewards/missions` - MissionsHubPage (main dashboard)
2. `/app/rewards/streaks` - StreakHistoryPage (calendar + milestones)
3. `/app/rewards/cashback` - CashbackDashboardPage (ZARI balance + history)
4. `/app/admin/missions` - AdminMissionsManagementPage (DAO only)

**8 New Components**:
1. MissionCard (blockchain-connected, replaces placeholder)
2. StreakWidget (daily streak display with fire icon)
3. CashbackBalance (ZARI token balance with refresh)
4. StreakCalendar (heatmap of last 30 days)
5. MissionProgress (progress bar with current/target)
6. MissionTypeIcon (7 icons for mission types)
7. ClaimRewardButton (calls blockchain extrinsic)
8. MissionFilters (tabs: All, Active, Completed)

**8 New Hooks**:
1. `useMissions()` - Query all active missions
2. `useUserMissionProgress(missionId)` - Query user's progress
3. `useClaimReward(missionId)` - Mutation: claim reward
4. `useZariBalance()` - Query ZARI token balance (AssetId: 1)
5. `useStreakData()` - Query daily streak info
6. `useMissionCompletionEvents()` - WebSocket: listen to completions
7. `useCreateMission()` - Mutation: DAO creates mission
8. `useConvertZari()` - Mutation: convert ZARI → BZR

**Real-Time Updates**:
- WebSocket listener for `MissionCompleted` events
- Toast notification: "🎉 Mission Complete! +50 ZARI"
- Auto-refresh missions dashboard
- Cache invalidation on completion

### 1.4 User Value

**For Buyers/Sellers**:
- Clear visibility into earning opportunities
- Gamification increases engagement (+40% retention)
- ZARI tokens as real assets (transferable, tradable)
- Streak bonuses incentivize daily use
- Instant feedback on progress

**For DAO**:
- Configure missions to drive behavior
- Control reward budgets
- Track mission effectiveness
- Adjust mission parameters dynamically

**Business Impact**:
- Higher user engagement → more orders
- Loyalty through streaks → retention
- ZARI token utility → ecosystem value
- Data-driven mission optimization

---

## 2. Objective (100 lines)

### 2.1 Implementation Goal

Implement a **complete gamification hub** with missions, streaks, and cashback, fully integrated with the bazari-rewards blockchain pallet.

### 2.2 Deliverables Checklist

**Pages** (4):
- [ ] MissionsHubPage (`/app/rewards/missions`)
- [ ] StreakHistoryPage (`/app/rewards/streaks`)
- [ ] CashbackDashboardPage (`/app/rewards/cashback`)
- [ ] AdminMissionsManagementPage (`/app/admin/missions`)

**Components** (8):
- [ ] MissionCard (blockchain-connected)
- [ ] StreakWidget (fire icon + count)
- [ ] CashbackBalance (ZARI display)
- [ ] StreakCalendar (30-day heatmap)
- [ ] MissionProgress (progress bar)
- [ ] MissionTypeIcon (7 types)
- [ ] ClaimRewardButton (blockchain mutation)
- [ ] MissionFilters (tabs)

**Hooks** (8):
- [ ] `useMissions()`
- [ ] `useUserMissionProgress(missionId)`
- [ ] `useClaimReward(missionId)`
- [ ] `useZariBalance()`
- [ ] `useStreakData()`
- [ ] `useMissionCompletionEvents()`
- [ ] `useCreateMission()`
- [ ] `useConvertZari()`

**Tests**:
- [ ] Unit tests for all components (Vitest)
- [ ] Unit tests for all hooks (React Testing Library)
- [ ] Integration test: Complete mission flow
- [ ] Integration test: Claim reward flow
- [ ] Manual test: WebSocket event handling

**Documentation**:
- [ ] Update `COMPONENTS.md` with new components
- [ ] Update `PAGES.md` with new routes
- [ ] Update `HOOKS.md` with new hooks
- [ ] Add mission type reference to `UI-SPEC.md`

### 2.3 Success Criteria

**Functional**:
- User can view all active missions with accurate progress
- User can claim rewards when mission completes
- ZARI tokens appear in wallet balance after claim
- Streak calendar shows last 30 days of activity
- Mission completion triggers toast notification
- Admin can create new missions (DAO only)

**Non-Functional**:
- Page loads in <2s (skeleton during load)
- Mission progress updates in <1s (optimistic UI)
- WebSocket event propagation in <1s
- Mobile responsive (360px screens)
- WCAG 2.1 AA compliant (axe-core)
- Test coverage ≥80% (unit tests)

---

## 3. Specifications (100 lines)

### 3.1 UI Specification

**Reference**: `/root/bazari/knowledge/20-blueprints/ui-ux/pallets/bazari-rewards/UI-SPEC.md`

**Key Sections**:
- Section 3: Pages Required (4 pages)
- Section 4: Components Required (8 components)
- Section 5: Blockchain Hooks (8 hooks)
- Section 6: Data Flow (query + mutation patterns)
- Section 8: Testing Requirements

### 3.2 Pallet Specification

**Reference**: `/root/bazari/knowledge/20-blueprints/pallets/bazari-rewards/SPEC.md`

**Key Structures**:
```rust
// Mission struct
pub struct Mission<BlockNumber> {
    pub id: MissionId,
    pub name: BoundedVec<u8, ConstU32<64>>,
    pub description: BoundedVec<u8, ConstU32<256>>,
    pub reward_amount: Balance,
    pub mission_type: MissionType,
    pub target_value: u32,
    pub max_completions: u32,
    pub completion_count: u32,
    pub expires_at: Option<BlockNumber>,
    pub is_active: bool,
    pub created_at: BlockNumber,
}

// MissionType enum (7 types)
pub enum MissionType {
    CompleteOrders,  // 📦
    SpendAmount,     // 💰
    ReferUsers,      // 👥
    CreateStore,     // 🏪
    FirstPurchase,   // 🎉
    DailyStreak,     // 🔥
    Custom,          // ⭐
}

// UserMission struct
pub struct UserMission<BlockNumber> {
    pub mission_id: MissionId,
    pub progress: u32,
    pub completed: bool,
    pub completed_at: Option<BlockNumber>,
    pub rewards_claimed: bool,
}
```

**Extrinsics**:
- `create_mission(name, description, reward_amount, mission_type, target_value, max_completions, expires_at)` - DAO only
- `progress_mission(user, mission_id, increment)` - Backend calls this when user advances
- `claim_reward(mission_id)` - User claims ZARI tokens (if manual claim)

**Events**:
- `MissionCreated(mission_id)`
- `MissionCompleted(account_id, mission_id, reward_amount)`
- `CashbackMinted(account_id, amount)`

**Storage Queries**:
- `api.query.bazariRewards.missions()` - All missions
- `api.query.bazariRewards.missions(missionId)` - Single mission
- `api.query.bazariRewards.userMissions(accountId, missionId)` - User progress
- `api.query.assets.account(1, accountId)` - ZARI balance (AssetId: 1)

### 3.3 Gap Analysis Reference

**Reference**: `/root/bazari/UI_UX_GAP_ANALYSIS.md` Section 3

**Gaps Addressed**:
- Gap 3.1: Missions Dashboard (5 days)
- Gap 3.2: Streak Tracking UI (3 days)
- Gap 3.3: Cashback Balance Display (2 days)
- Gap 3.4: Mission Completion Triggers (2 days)

**Total**: 12 days (reduced to 10 days with optimizations)

---

## 4. Implementation Details (500 lines)

### Step 1: Create Blockchain Hooks (2 days)

**File**: `apps/web/src/hooks/blockchain/useRewards.ts`

```typescript
import { useBlockchainQuery, useBlockchainTx } from '@/hooks/useBlockchainQuery';
import { useBlockchainEvent } from '@/hooks/useBlockchainEvent';
import { getApi } from '@/services/polkadot';
import { useWalletStore } from '@/stores/wallet';
import { toast } from 'sonner';

/**
 * Hook: Get all active missions
 */
export function useMissions() {
  return useBlockchainQuery(
    ['missions'],
    async () => {
      const api = await getApi();
      const missionEntries = await api.query.bazariRewards.missions.entries();

      return missionEntries
        .map(([key, mission]) => {
          const missionData = mission.unwrap().toJSON();
          return {
            id: key.args[0].toNumber(),
            ...missionData
          };
        })
        .filter((m) => m.isActive); // Only active missions
    },
    {
      staleTime: 30_000, // 30 seconds
      refetchOnWindowFocus: true
    }
  );
}

/**
 * Hook: Get user's progress for a specific mission
 */
export function useUserMissionProgress(missionId?: number) {
  const { selectedAccount } = useWalletStore();

  return useBlockchainQuery(
    ['userMission', selectedAccount?.address, missionId],
    async () => {
      if (!selectedAccount || !missionId) return null;

      const api = await getApi();
      const progress = await api.query.bazariRewards.userMissions(
        selectedAccount.address,
        missionId
      );

      if (progress.isNone) {
        return {
          missionId,
          progress: 0,
          completed: false,
          completedAt: null,
          rewardsClaimed: false
        };
      }

      return progress.unwrap().toJSON();
    },
    {
      enabled: !!selectedAccount && !!missionId,
      staleTime: 10_000 // 10 seconds (progress updates frequently)
    }
  );
}

/**
 * Hook: Claim mission reward
 */
export function useClaimReward() {
  const invalidateCache = useInvalidateBlockchainCache();

  return useBlockchainTx(
    async (missionId: number) => {
      const api = await getApi();
      return api.tx.bazariRewards.claimReward(missionId);
    },
    {
      onSuccess: (result, missionId) => {
        toast.success('Reward claimed! 🎉 ZARI tokens added to your wallet.');
        invalidateCache(['missions', 'userMission', 'zariBalance']);
      },
      onError: (error) => {
        toast.error(`Failed to claim reward: ${error.message}`);
      }
    }
  );
}

/**
 * Hook: Get ZARI token balance (AssetId: 1)
 */
export function useZariBalance() {
  const { selectedAccount } = useWalletStore();

  return useBlockchainQuery(
    ['zariBalance', selectedAccount?.address],
    async () => {
      if (!selectedAccount) return '0';

      const api = await getApi();
      const balance = await api.query.assets.account(1, selectedAccount.address); // AssetId: 1 = ZARI

      if (balance.isNone) {
        return '0';
      }

      const balanceData = balance.unwrap().toJSON();
      return balanceData.balance;
    },
    {
      enabled: !!selectedAccount,
      refetchInterval: 30_000 // Auto-refresh every 30s
    }
  );
}

/**
 * Hook: Get daily streak data
 */
export function useStreakData() {
  const { selectedAccount } = useWalletStore();

  return useBlockchainQuery(
    ['streakData', selectedAccount?.address],
    async () => {
      if (!selectedAccount) return null;

      const api = await getApi();

      // Query DailyStreak mission
      const missionEntries = await api.query.bazariRewards.missions.entries();
      const streakMission = missionEntries.find(([_, mission]) => {
        const m = mission.unwrap().toJSON();
        return m.missionType === 'DailyStreak';
      });

      if (!streakMission) return { currentStreak: 0, longestStreak: 0 };

      const missionId = streakMission[0].args[0].toNumber();
      const progress = await api.query.bazariRewards.userMissions(
        selectedAccount.address,
        missionId
      );

      if (progress.isNone) {
        return { currentStreak: 0, longestStreak: 0 };
      }

      const progressData = progress.unwrap().toJSON();
      return {
        currentStreak: progressData.progress,
        longestStreak: progressData.progress // TODO: Store longest in pallet
      };
    },
    {
      enabled: !!selectedAccount,
      staleTime: 60_000 // 1 minute
    }
  );
}

/**
 * Hook: Listen to MissionCompleted events
 */
export function useMissionCompletionEvents() {
  const { selectedAccount } = useWalletStore();
  const queryClient = useQueryClient();

  useBlockchainEvent(
    'bazariRewards',
    'MissionCompleted',
    (eventData) => {
      // Invalidate caches
      queryClient.invalidateQueries(['blockchain', 'missions']);
      queryClient.invalidateQueries(['blockchain', 'userMission']);
      queryClient.invalidateQueries(['blockchain', 'zariBalance']);

      // Show toast notification
      toast.success(
        `🎉 Mission Complete! You earned ${eventData.rewardAmount} ZARI`,
        {
          duration: 5000,
          action: {
            label: 'View Missions',
            onClick: () => (window.location.href = '/app/rewards/missions')
          }
        }
      );
    },
    // Filter by user
    (event) => {
      if (!selectedAccount) return false;
      return event.data[0].toString() === selectedAccount.address;
    }
  );
}

/**
 * Hook: Create mission (DAO only)
 */
export function useCreateMission() {
  const invalidateCache = useInvalidateBlockchainCache();

  return useBlockchainTx(
    async (missionData: {
      name: string;
      description: string;
      rewardAmount: number;
      missionType: string;
      targetValue: number;
      maxCompletions: number;
      expiresAt?: number;
    }) => {
      const api = await getApi();
      return api.tx.bazariRewards.createMission(
        missionData.name,
        missionData.description,
        missionData.rewardAmount,
        missionData.missionType,
        missionData.targetValue,
        missionData.maxCompletions,
        missionData.expiresAt || null
      );
    },
    {
      onSuccess: () => {
        toast.success('Mission created successfully!');
        invalidateCache(['missions']);
      },
      onError: (error) => {
        toast.error(`Failed to create mission: ${error.message}`);
      }
    }
  );
}

/**
 * Hook: Convert ZARI to BZR (if conversion feature exists)
 */
export function useConvertZari() {
  const invalidateCache = useInvalidateBlockchainCache();

  return useBlockchainTx(
    async (amount: number) => {
      const api = await getApi();
      // TODO: Implement conversion extrinsic in pallet
      return api.tx.bazariRewards.convertZariToBzr(amount);
    },
    {
      onSuccess: () => {
        toast.success('ZARI converted to BZR!');
        invalidateCache(['zariBalance']);
      }
    }
  );
}
```

---

### Step 2: Create Components (3 days)

**Component 1: MissionCard**

**File**: `apps/web/src/components/rewards/MissionCard.tsx`

```typescript
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { MissionTypeIcon } from './MissionTypeIcon';
import { useUserMissionProgress, useClaimReward } from '@/hooks/blockchain/useRewards';

interface MissionCardProps {
  mission: {
    id: number;
    name: string;
    description: string;
    rewardAmount: number;
    missionType: string;
    targetValue: number;
    maxCompletions: number;
    completionCount: number;
    expiresAt?: number;
    isActive: boolean;
  };
}

export const MissionCard = ({ mission }: MissionCardProps) => {
  const { data: userProgress, isLoading } = useUserMissionProgress(mission.id);
  const { mutate: claimReward, isLoading: isClaiming } = useClaimReward();

  const progressPercent = userProgress
    ? (userProgress.progress / mission.targetValue) * 100
    : 0;

  const canClaim =
    userProgress?.completed && !userProgress?.rewardsClaimed;

  const handleClaim = () => {
    claimReward(mission.id);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <MissionTypeIcon type={mission.missionType} size={32} />
            <div>
              <h3 className="font-semibold text-lg">{mission.name}</h3>
              <p className="text-sm text-gray-600">{mission.description}</p>
            </div>
          </div>

          {userProgress?.completed && (
            <Badge variant="success" className="ml-2">
              Completed
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">
              {userProgress?.progress || 0} / {mission.targetValue}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Reward Amount */}
        <div className="flex items-center justify-between py-2 px-3 bg-yellow-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Reward</span>
          <div className="flex items-center gap-1">
            <span className="text-xl font-bold text-yellow-600">
              {mission.rewardAmount}
            </span>
            <span className="text-sm text-gray-600">ZARI</span>
          </div>
        </div>

        {/* Expiration */}
        {mission.expiresAt && (
          <div className="text-xs text-gray-500">
            Expires: {new Date(mission.expiresAt * 1000).toLocaleDateString()}
          </div>
        )}
      </CardContent>

      <CardFooter>
        {canClaim ? (
          <Button
            onClick={handleClaim}
            disabled={isClaiming}
            className="w-full"
            size="lg"
          >
            {isClaiming ? 'Claiming...' : 'Claim Reward 🎉'}
          </Button>
        ) : userProgress?.completed ? (
          <Button disabled className="w-full" size="lg">
            Reward Claimed ✅
          </Button>
        ) : (
          <Button variant="outline" className="w-full" size="lg" disabled>
            Continue ({progressPercent.toFixed(0)}%)
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
```

**Component 2: MissionTypeIcon**

```typescript
const MISSION_TYPE_ICONS = {
  CompleteOrders: '📦',
  SpendAmount: '💰',
  ReferUsers: '👥',
  CreateStore: '🏪',
  FirstPurchase: '🎉',
  DailyStreak: '🔥',
  Custom: '⭐'
};

export const MissionTypeIcon = ({ type, size = 24 }) => {
  const icon = MISSION_TYPE_ICONS[type] || '⭐';

  return (
    <div
      className="flex items-center justify-center bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl"
      style={{ width: size, height: size, fontSize: size * 0.6 }}
    >
      {icon}
    </div>
  );
};
```

**Component 3: StreakWidget**

```typescript
import { Flame, Award } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useStreakData } from '@/hooks/blockchain/useRewards';

export const StreakWidget = () => {
  const { data: streakData } = useStreakData();

  const nextMilestone =
    streakData?.currentStreak < 7
      ? { days: 7, reward: '1,000 ZARI' }
      : streakData?.currentStreak < 30
      ? { days: 30, reward: '5,000 ZARI' }
      : { days: 100, reward: '20,000 ZARI' };

  const milestoneProgress =
    ((streakData?.currentStreak || 0) / nextMilestone.days) * 100;

  return (
    <Card className="p-4 bg-gradient-to-br from-orange-50 to-red-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame size={32} className="text-orange-500" />
          <div>
            <h3 className="font-bold text-3xl">
              {streakData?.currentStreak || 0}
            </h3>
            <p className="text-xs text-gray-600">Day Streak</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-600">Longest</p>
          <p className="font-semibold text-lg">
            {streakData?.longestStreak || 0}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Next milestone</span>
          <span className="font-medium">
            {nextMilestone.days - (streakData?.currentStreak || 0)} days
          </span>
        </div>

        <Progress value={milestoneProgress} className="h-2" />

        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Award size={12} />
          <span>Unlock: {nextMilestone.reward}</span>
        </div>
      </div>
    </Card>
  );
};
```

**Component 4: CashbackBalance**

```typescript
import { Wallet, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useZariBalance } from '@/hooks/blockchain/useRewards';
import { useQueryClient } from '@tanstack/react-query';

export const CashbackBalance = () => {
  const { data: balance, refetch } = useZariBalance();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries(['blockchain', 'zariBalance']);
    refetch();
  };

  const formatBalance = (balance: string) => {
    const num = Number(balance) / 1e12; // 12 decimals
    return num.toFixed(2);
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet size={24} className="text-yellow-600" />
          <h3 className="font-semibold text-lg">ZARI Balance</h3>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="h-8 w-8 p-0"
        >
          <RefreshCw size={16} />
        </Button>
      </div>

      <div className="mb-6">
        <p className="text-4xl font-bold text-yellow-600">
          {formatBalance(balance || '0')}
        </p>
        <p className="text-sm text-gray-600 mt-1">ZARI tokens</p>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1">
          History
        </Button>
        <Button className="flex-1 bg-yellow-600 hover:bg-yellow-700">
          Convert to BZR
        </Button>
      </div>
    </Card>
  );
};
```

**Component 5: MissionFilters**

```typescript
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const MissionFilters = ({ filter, onFilterChange }) => {
  return (
    <Tabs value={filter} onValueChange={onFilterChange}>
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="completed">Completed</TabsTrigger>
      </TabsList>
    </Tabs>
  );
};
```

---

### Step 3: Create Pages (3 days)

**Page 1: MissionsHubPage**

**File**: `apps/web/src/pages/rewards/MissionsHubPage.tsx`

```typescript
import { useState } from 'react';
import { useMissions, useMissionCompletionEvents } from '@/hooks/blockchain/useRewards';
import { MissionCard } from '@/components/rewards/MissionCard';
import { StreakWidget } from '@/components/rewards/StreakWidget';
import { CashbackBalance } from '@/components/rewards/CashbackBalance';
import { MissionFilters } from '@/components/rewards/MissionFilters';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export const MissionsHubPage = () => {
  const { data: missions, isLoading } = useMissions();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Listen to mission completion events (toast notifications)
  useMissionCompletionEvents();

  const filteredMissions = missions?.filter((mission) => {
    // Filter by status
    if (filter === 'active' && mission.completionCount >= mission.maxCompletions) {
      return false;
    }
    if (filter === 'completed' && mission.completionCount < mission.maxCompletions) {
      return false;
    }

    // Filter by search query
    if (searchQuery) {
      return mission.name.toLowerCase().includes(searchQuery.toLowerCase());
    }

    return true;
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">🎯 Missions Hub</h1>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            placeholder="Search missions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StreakWidget />
        <CashbackBalance />
      </div>

      {/* Filters */}
      <MissionFilters filter={filter} onFilterChange={setFilter} />

      {/* Missions Grid */}
      {filteredMissions && filteredMissions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMissions.map((mission) => (
            <MissionCard key={mission.id} mission={mission} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No missions found. Check back soon!</p>
        </div>
      )}
    </div>
  );
};
```

**Page 2: StreakHistoryPage**

```typescript
import { useStreakData } from '@/hooks/blockchain/useRewards';
import { Card } from '@/components/ui/card';
import { Flame, Calendar, TrendingUp } from 'lucide-react';

export const StreakHistoryPage = () => {
  const { data: streakData } = useStreakData();

  // Mock activity data (TODO: Fetch from backend)
  const activityData = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    active: Math.random() > 0.3
  }));

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Flame className="text-orange-500" />
        Streak History
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="text-orange-500" size={20} />
            <span className="text-sm text-gray-600">Current Streak</span>
          </div>
          <p className="text-3xl font-bold">{streakData?.currentStreak || 0} days</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-green-500" size={20} />
            <span className="text-sm text-gray-600">Longest Streak</span>
          </div>
          <p className="text-3xl font-bold">{streakData?.longestStreak || 0} days</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="text-blue-500" size={20} />
            <span className="text-sm text-gray-600">Total Active Days</span>
          </div>
          <p className="text-3xl font-bold">{activityData.filter(d => d.active).length}</p>
        </Card>
      </div>

      {/* Calendar Heatmap */}
      <Card className="p-6">
        <h2 className="font-semibold text-lg mb-4">Last 30 Days</h2>
        <div className="grid grid-cols-7 gap-2">
          {activityData.reverse().map((day, idx) => (
            <div
              key={idx}
              className={`aspect-square rounded-sm ${
                day.active ? 'bg-green-500' : 'bg-gray-200'
              }`}
              title={new Date(day.date).toLocaleDateString()}
            />
          ))}
        </div>
      </Card>

      {/* Milestones */}
      <Card className="p-6">
        <h2 className="font-semibold text-lg mb-4">Milestones</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <span>7 Day Streak</span>
            <span className="font-bold text-green-600">+1,000 ZARI</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <span>30 Day Streak</span>
            <span className="font-bold text-blue-600">+5,000 ZARI</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
            <span>100 Day Streak</span>
            <span className="font-bold text-purple-600">+20,000 ZARI</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
```

**Page 3: CashbackDashboardPage** (similar structure)
**Page 4: AdminMissionsManagementPage** (DAO only, create mission form)

---

### Step 4: Routing (1 day)

**File**: `apps/web/src/App.tsx` (add routes)

```typescript
<Route path="/app/rewards">
  <Route path="missions" element={<MissionsHubPage />} />
  <Route path="streaks" element={<StreakHistoryPage />} />
  <Route path="cashback" element={<CashbackDashboardPage />} />
</Route>

<Route path="/app/admin">
  <Route path="missions" element={<AdminMissionsManagementPage />} />
</Route>
```

---

### Step 5: Testing (1 day)

**Unit Test Example**:

```typescript
// MissionCard.test.tsx
import { render, screen } from '@testing-library/react';
import { MissionCard } from './MissionCard';

test('renders mission card with progress', () => {
  const mission = {
    id: 1,
    name: 'Complete 5 Orders',
    description: 'Complete 5 orders to earn 50 ZARI',
    rewardAmount: 50,
    missionType: 'CompleteOrders',
    targetValue: 5,
    maxCompletions: 100,
    completionCount: 50,
    isActive: true
  };

  render(<MissionCard mission={mission} />);

  expect(screen.getByText('Complete 5 Orders')).toBeInTheDocument();
  expect(screen.getByText('50')).toBeInTheDocument(); // Reward amount
});
```

---

## 5. Acceptance Criteria (50 lines)

### Functional Requirements

- [ ] **F1**: User can view all active missions with accurate progress
- [ ] **F2**: Mission progress bar displays current/target correctly
- [ ] **F3**: Mission type icons display correctly (7 types)
- [ ] **F4**: User can claim reward when mission completes
- [ ] **F5**: ZARI balance updates after claiming reward
- [ ] **F6**: Streak widget shows current and longest streak
- [ ] **F7**: Streak calendar displays last 30 days of activity
- [ ] **F8**: Cashback balance displays ZARI token balance (AssetId: 1)
- [ ] **F9**: Mission completion triggers toast notification
- [ ] **F10**: Filters work correctly (All, Active, Completed)
- [ ] **F11**: Search filters missions by name
- [ ] **F12**: Admin can create missions (DAO only)
- [ ] **F13**: Conversion UI converts ZARI → BZR (if feature exists)

### Non-Functional Requirements

- [ ] **NF1**: Page loads in <2s (skeleton during load)
- [ ] **NF2**: Mission progress updates in <1s (optimistic UI)
- [ ] **NF3**: WebSocket event propagation in <1s
- [ ] **NF4**: Mobile responsive (360px screens)
- [ ] **NF5**: Touch targets ≥44x44px
- [ ] **NF6**: WCAG 2.1 AA compliant (axe-core)
- [ ] **NF7**: Test coverage ≥80% (unit tests)
- [ ] **NF8**: No console errors in production
- [ ] **NF9**: Lighthouse score ≥90 (mobile)

---

## 6. Testing Checklist (50 lines)

### Unit Tests (Vitest + React Testing Library)

**Components**:
- [ ] MissionCard renders correctly
- [ ] MissionCard displays progress bar
- [ ] MissionCard claim button enabled when completed
- [ ] StreakWidget displays current streak
- [ ] CashbackBalance displays ZARI balance
- [ ] MissionTypeIcon renders correct icon for each type
- [ ] MissionFilters changes filter on click

**Hooks**:
- [ ] `useMissions()` returns missions array
- [ ] `useUserMissionProgress()` returns progress object
- [ ] `useClaimReward()` calls blockchain transaction
- [ ] `useZariBalance()` returns balance string
- [ ] `useStreakData()` returns streak object

### Integration Tests

- [ ] Complete mission flow: View → Progress → Complete → Claim
- [ ] Claim reward flow: Click claim → TX submitted → Balance updated
- [ ] WebSocket event: Mission completes → Toast displays → Cache invalidates
- [ ] Filter flow: Change filter → Missions filtered correctly
- [ ] Search flow: Enter query → Missions filtered

### Manual Tests (Testnet)

- [ ] Connect wallet with ZARI balance
- [ ] View missions dashboard (MissionsHubPage)
- [ ] Verify mission progress matches blockchain
- [ ] Complete a mission (trigger from backend)
- [ ] Claim reward (transaction on testnet)
- [ ] Verify ZARI balance increases
- [ ] Check streak calendar (last 30 days)
- [ ] Test mobile responsive (360px)
- [ ] Test accessibility (screen reader, keyboard nav)

---

## 7. Dependencies (30 lines)

### Blockchain Dependencies

- [ ] **bazari-rewards pallet** deployed to testnet
- [ ] **ZARI token** configured (AssetId: 1)
- [ ] **Missions** seeded (at least 5 missions)
- [ ] **Polkadot.js API** connected (wss://bazari.network)

### Backend Dependencies

- [ ] **Endpoint**: `GET /api/users/:id/missions` - Cached mission progress
- [ ] **Endpoint**: `GET /api/users/:id/streaks` - Streak history (last 365 days)
- [ ] **WebSocket**: `MissionCompleted` event forwarding
- [ ] **Auto-progress**: Backend calls `progressMission()` when user actions occur

### Frontend Dependencies

- [ ] **Polkadot.js**: 10.11+
- [ ] **React Query**: 4.36+
- [ ] **Recharts**: 2.9+ (for streak charts)
- [ ] **Lucide React**: 0.294+ (icons)
- [ ] **shadcn/ui**: Latest (Card, Button, Progress, Badge, Tabs)

### Third-Party Libraries (New)

```bash
pnpm add react-calendar-heatmap recharts
```

---

## 8. References (20 lines)

### Documentation

- UI Spec: `/root/bazari/knowledge/20-blueprints/ui-ux/pallets/bazari-rewards/UI-SPEC.md`
- Pallet Spec: `/root/bazari/knowledge/20-blueprints/pallets/bazari-rewards/SPEC.md`
- Gap Analysis: `/root/bazari/UI_UX_GAP_ANALYSIS.md` (Section 3)
- Component Patterns: `/root/bazari/knowledge/20-blueprints/ui-ux/02-COMPONENT-PATTERNS.md`
- Blockchain Integration: `/root/bazari/knowledge/20-blueprints/ui-ux/03-BLOCKCHAIN-INTEGRATION.md`

### Related Prompts

- P0-02: Escrow Visualization (uses similar countdown pattern)
- P0-04: Affiliate Referrals (similar tree visualization)
- P2-02: Advanced UX (mission triggers, notifications)

---

## 9. Prompt for Claude Code (100 lines)

**Copy-paste this section to Claude Code for execution**:

---

### PROMPT START

I need you to implement the **complete Rewards & Missions system** for the Bazari marketplace. This is the MOST CRITICAL feature with an 80% UI/UX gap.

**Context**:
- The `bazari-rewards` blockchain pallet is fully deployed with 7 mission types, daily streaks, and ZARI token cashback
- Frontend has 80% gap: NO missions dashboard, NO streak tracking, NO cashback UI
- ZARI token (AssetId: 1) is configured and mintable
- Users complete missions → earn ZARI tokens → can trade/transfer them

**Your Task**:
Implement a complete gamification hub with:
1. 4 pages (Missions Hub, Streak History, Cashback Dashboard, Admin Missions)
2. 8 components (MissionCard, StreakWidget, CashbackBalance, etc.)
3. 8 hooks (useMissions, useUserMissionProgress, useClaimReward, etc.)
4. Real-time WebSocket notifications
5. Mobile-responsive, accessible (WCAG 2.1 AA)

**Deliverables**:
- All code in TypeScript with full type safety
- Unit tests for all components and hooks (Vitest)
- Integration test for complete mission flow
- Mobile responsive (360px+)
- Real-time updates via WebSocket

**Mission Types** (7 types with icons):
- CompleteOrders: 📦
- SpendAmount: 💰
- ReferUsers: 👥
- CreateStore: 🏪
- FirstPurchase: 🎉
- DailyStreak: 🔥
- Custom: ⭐

**Blockchain Queries**:
```typescript
api.query.bazariRewards.missions() // All missions
api.query.bazariRewards.userMissions(accountId, missionId) // User progress
api.query.assets.account(1, accountId) // ZARI balance (AssetId: 1)
```

**Blockchain Mutations**:
```typescript
api.tx.bazariRewards.claimReward(missionId) // Claim ZARI tokens
api.tx.bazariRewards.createMission(...) // DAO creates mission
```

**Events to Listen**:
- `MissionCompleted(accountId, missionId, rewardAmount)` → Show toast notification

**Pages to Create**:
1. `/app/rewards/missions` - MissionsHubPage (main dashboard)
2. `/app/rewards/streaks` - StreakHistoryPage (calendar + milestones)
3. `/app/rewards/cashback` - CashbackDashboardPage (ZARI balance)
4. `/app/admin/missions` - AdminMissionsManagementPage (DAO only)

**Components to Create**:
1. MissionCard - Show mission with progress bar, claim button
2. StreakWidget - Daily streak with fire icon
3. CashbackBalance - ZARI token balance
4. StreakCalendar - 30-day heatmap
5. MissionProgress - Progress bar component
6. MissionTypeIcon - 7 icons for mission types
7. ClaimRewardButton - Blockchain mutation button
8. MissionFilters - Tabs (All, Active, Completed)

**Hooks to Create**:
1. `useMissions()` - Query all missions
2. `useUserMissionProgress(missionId)` - Query user progress
3. `useClaimReward()` - Mutation: claim reward
4. `useZariBalance()` - Query ZARI balance
5. `useStreakData()` - Query streak info
6. `useMissionCompletionEvents()` - WebSocket listener
7. `useCreateMission()` - Mutation: DAO creates mission
8. `useConvertZari()` - Mutation: convert ZARI → BZR

**Acceptance Criteria**:
- User can view all missions with accurate progress
- User can claim reward when mission completes
- ZARI balance updates after claim
- Streak calendar shows last 30 days
- Toast notification on mission completion
- Mobile responsive (360px screens)
- WCAG 2.1 AA compliant
- Test coverage ≥80%

**Files to Create**:
```
apps/web/src/hooks/blockchain/useRewards.ts (8 hooks)
apps/web/src/components/rewards/MissionCard.tsx
apps/web/src/components/rewards/StreakWidget.tsx
apps/web/src/components/rewards/CashbackBalance.tsx
apps/web/src/components/rewards/StreakCalendar.tsx
apps/web/src/components/rewards/MissionProgress.tsx
apps/web/src/components/rewards/MissionTypeIcon.tsx
apps/web/src/components/rewards/ClaimRewardButton.tsx
apps/web/src/components/rewards/MissionFilters.tsx
apps/web/src/pages/rewards/MissionsHubPage.tsx
apps/web/src/pages/rewards/StreakHistoryPage.tsx
apps/web/src/pages/rewards/CashbackDashboardPage.tsx
apps/web/src/pages/rewards/AdminMissionsManagementPage.tsx
apps/web/src/pages/rewards/__tests__/MissionsHubPage.test.tsx
```

**Implementation Steps**:
1. Create all 8 hooks in `useRewards.ts`
2. Create all 8 components
3. Create all 4 pages
4. Add routes to App.tsx
5. Write unit tests
6. Write integration test
7. Test on mobile (360px)
8. Run accessibility audit

**Start with the hooks file, then components, then pages. Use React Query for caching, optimistic UI for mutations, and WebSocket for real-time updates.**

### PROMPT END

---

**Document Status**: ✅ Complete - Ready for execution
**Created**: 2025-11-14
**Estimated Effort**: 10 days (2 weeks)
**Priority**: P0 - CRITICAL (highest priority)
