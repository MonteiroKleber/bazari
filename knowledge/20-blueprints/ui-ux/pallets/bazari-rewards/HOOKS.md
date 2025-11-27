# bazari-rewards Pallet - Blockchain Hooks Specification

**Status**: 🔴 CRITICAL - P0 Priority
**Version**: 1.0
**Last Updated**: 2025-11-14
**Dependencies**: React 18, TypeScript, @tanstack/react-query, @polkadot/api

---

## Table of Contents

1. [Hooks Overview](#1-hooks-overview)
2. [Query Hooks](#2-query-hooks)
3. [Mutation Hooks](#3-mutation-hooks)
4. [Subscription Hooks](#4-subscription-hooks)
5. [Hooks Dependencies Graph](#5-hooks-dependencies-graph)
6. [Implementation Checklist](#6-implementation-checklist)

---

## 1. Hooks Overview

| Hook | Type | Purpose | Effort | Cache Strategy |
|------|------|---------|--------|----------------|
| **useMissions** | Query | Fetch all missions | 0.5 day | Stale: 5m, Cache: 30m |
| **useUserMissionProgress** | Query | Get user progress for mission | 0.5 day | Stale: 1m, Cache: 10m |
| **useZariBalance** | Query | Get ZARI token balance | 0.5 day | Stale: 30s, Cache: 5m |
| **useStreakHistory** | Query | Get user's streak data | 0.5 day | Stale: 1m, Cache: 10m |
| **useCompleteMission** | Mutation | Claim mission reward | 0.5 day | Invalidates: missions, userMissions, zariBalance |
| **useCreateMission** | Mutation | Admin create mission | 0.5 day | Invalidates: missions |
| **useGrantCashback** | Mutation | Mint ZARI cashback | 0.5 day | Invalidates: cashbackGrants, zariBalance |
| **useMissionCompletedEvents** | Subscription | Real-time mission completion | 0.5 day | Auto-invalidates queries |

**Total**: 8 hooks, 4 days effort

---

## 2. Query Hooks

### 2.1 useMissions

**Purpose**: Fetch all missions from blockchain.

**Returns**: Array of missions with metadata.

**Cache Strategy**:
- Stale time: 5 minutes
- Cache time: 30 minutes
- Refetch on window focus: true

**Implementation**:
```typescript
import { useBlockchainQuery } from '@/hooks/blockchain/useBlockchainQuery';
import { useApi } from '@/providers/PolkadotProvider';

export interface Mission {
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

export enum MissionType {
  CompleteOrders = 'CompleteOrders',
  SpendAmount = 'SpendAmount',
  ReferUsers = 'ReferUsers',
  CreateStore = 'CreateStore',
  FirstPurchase = 'FirstPurchase',
  DailyStreak = 'DailyStreak',
  Custom = 'Custom',
}

export function useMissions() {
  const { api } = useApi();

  return useBlockchainQuery<Mission[]>({
    queryKey: ['missions'],
    queryFn: async () => {
      if (!api) throw new Error('API not ready');

      // Fetch all missions entries
      const entries = await api.query.bazariRewards.missions.entries();

      // Map entries to Mission objects
      const missions: Mission[] = entries.map(([key, value]) => {
        const missionData = value.toJSON() as any;
        return {
          id: missionData.id,
          name: Buffer.from(missionData.name.slice(2), 'hex').toString('utf-8'),
          description: Buffer.from(missionData.description.slice(2), 'hex').toString('utf-8'),
          type: missionData.missionType as MissionType,
          rewardAmount: missionData.rewardAmount.toString(),
          targetValue: missionData.targetValue,
          maxCompletions: missionData.maxCompletions,
          completionCount: missionData.completionCount,
          expiresAt: missionData.expiresAt || undefined,
          isActive: missionData.isActive,
          createdAt: missionData.createdAt,
        };
      });

      // Sort by created date (newest first)
      return missions.sort((a, b) => b.createdAt - a.createdAt);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (previously cacheTime)
    refetchOnWindowFocus: true,
  });
}
```

**Usage Example**:
```tsx
function MissionsHubPage() {
  const { data: missions, isLoading, error } = useMissions();

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="grid grid-cols-3 gap-6">
      {missions?.map(mission => (
        <MissionCard key={mission.id} mission={mission} />
      ))}
    </div>
  );
}
```

**TypeScript Interfaces**:
```typescript
interface UseMissionsResult {
  data: Mission[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  isRefetching: boolean;
}
```

**Error Handling**:
```typescript
// Custom error handling
const { data, error } = useMissions();

if (error) {
  if (error.message.includes('API not ready')) {
    toast.error('Blockchain connection failed. Please refresh.');
  } else {
    toast.error('Failed to load missions. Please try again.');
  }
}
```

**Testing**:
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useMissions } from './useMissions';

describe('useMissions', () => {
  it('fetches missions successfully', async () => {
    const { result } = renderHook(() => useMissions());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toHaveLength(3);
    expect(result.current.data[0].name).toBe('Complete 5 Orders');
  });

  it('handles error when API not ready', async () => {
    // Mock API to return null
    const { result } = renderHook(() => useMissions());

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error?.message).toContain('API not ready');
  });
});
```

---

### 2.2 useUserMissionProgress

**Purpose**: Get user's progress for a specific mission.

**Returns**: User mission progress (progress, completed, claimed).

**Cache Strategy**:
- Stale time: 1 minute
- Cache time: 10 minutes
- Refetch on window focus: true

**Implementation**:
```typescript
import { useBlockchainQuery } from '@/hooks/blockchain/useBlockchainQuery';
import { useApi } from '@/providers/PolkadotProvider';

export interface UserMission {
  missionId: number;
  progress: number;
  completed: boolean;
  completedAt?: number;
  rewardsClaimed: boolean;
}

export function useUserMissionProgress(missionId: number, userAddress?: string) {
  const { api } = useApi();

  return useBlockchainQuery<UserMission | null>({
    queryKey: ['userMission', userAddress, missionId],
    queryFn: async () => {
      if (!api || !userAddress) return null;

      // Fetch user mission progress
      const userMission = await api.query.bazariRewards.userMissions(
        userAddress,
        missionId
      );

      // If no progress, return null
      if (userMission.isNone) {
        return null;
      }

      const data = userMission.unwrap().toJSON() as any;

      return {
        missionId: data.missionId,
        progress: data.progress,
        completed: data.completed,
        completedAt: data.completedAt || undefined,
        rewardsClaimed: data.rewardsClaimed,
      };
    },
    enabled: !!userAddress && !!api,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
  });
}
```

**Batch Hook** (for multiple missions):
```typescript
export function useUserMissionsProgress(userAddress?: string) {
  const { api } = useApi();
  const { data: missions } = useMissions();

  return useBlockchainQuery<Map<number, UserMission>>({
    queryKey: ['userMissions', userAddress],
    queryFn: async () => {
      if (!api || !userAddress || !missions) return new Map();

      // Fetch all user missions in parallel
      const progressPromises = missions.map(m =>
        api.query.bazariRewards.userMissions(userAddress, m.id)
      );

      const progressResults = await Promise.all(progressPromises);

      // Build map: missionId → UserMission
      const progressMap = new Map<number, UserMission>();

      progressResults.forEach((result, index) => {
        if (result.isSome) {
          const data = result.unwrap().toJSON() as any;
          progressMap.set(missions[index].id, {
            missionId: data.missionId,
            progress: data.progress,
            completed: data.completed,
            completedAt: data.completedAt || undefined,
            rewardsClaimed: data.rewardsClaimed,
          });
        }
      });

      return progressMap;
    },
    enabled: !!userAddress && !!api && !!missions,
    staleTime: 1 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
```

**Usage Example**:
```tsx
function MissionCard({ mission }: { mission: Mission }) {
  const { address } = useWallet();
  const { data: progress, isLoading } = useUserMissionProgress(mission.id, address);

  const progressPercentage = progress
    ? Math.floor((progress.progress / mission.targetValue) * 100)
    : 0;

  return (
    <Card>
      <h3>{mission.name}</h3>
      {isLoading ? (
        <Skeleton className="h-2 w-full" />
      ) : (
        <MissionProgressBar progress={progressPercentage} completed={progress?.completed} />
      )}
      <p>{progress?.progress || 0}/{mission.targetValue}</p>
    </Card>
  );
}
```

**Testing**:
```typescript
describe('useUserMissionProgress', () => {
  it('fetches user progress successfully', async () => {
    const { result } = renderHook(() =>
      useUserMissionProgress(1, '0xAlice')
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual({
      missionId: 1,
      progress: 3,
      completed: false,
      rewardsClaimed: false,
    });
  });

  it('returns null when no progress', async () => {
    const { result } = renderHook(() =>
      useUserMissionProgress(999, '0xAlice')
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
  });
});
```

---

### 2.3 useZariBalance

**Purpose**: Get user's ZARI token balance from pallet-assets.

**Returns**: ZARI balance as string.

**Cache Strategy**:
- Stale time: 30 seconds
- Cache time: 5 minutes
- Refetch on window focus: true

**Implementation**:
```typescript
import { useBlockchainQuery } from '@/hooks/blockchain/useBlockchainQuery';
import { useApi } from '@/providers/PolkadotProvider';

const ZARI_ASSET_ID = 1; // Configured in genesis

export function useZariBalance(userAddress?: string) {
  const { api } = useApi();

  return useBlockchainQuery<string>({
    queryKey: ['zariBalance', userAddress],
    queryFn: async () => {
      if (!api || !userAddress) return '0';

      // Query pallet-assets for ZARI balance
      const accountInfo = await api.query.assets.account(
        ZARI_ASSET_ID,
        userAddress
      );

      if (accountInfo.isNone) {
        return '0';
      }

      const balance = accountInfo.unwrap().balance.toString();
      return balance;
    },
    enabled: !!userAddress && !!api,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000, // Poll every 60 seconds
  });
}
```

**With Breakdown** (missions/cashback/streaks):
```typescript
export function useZariBalanceWithBreakdown(userAddress?: string) {
  const { api } = useApi();
  const { data: totalBalance } = useZariBalance(userAddress);
  const { data: grants } = useCashbackGrants(userAddress);

  return useBlockchainQuery<{
    total: string;
    fromMissions: string;
    fromCashback: string;
    fromStreaks: string;
  }>({
    queryKey: ['zariBalanceBreakdown', userAddress],
    queryFn: async () => {
      if (!grants || !totalBalance) {
        return {
          total: totalBalance || '0',
          fromMissions: '0',
          fromCashback: '0',
          fromStreaks: '0',
        };
      }

      // Calculate breakdown from grants
      let fromMissions = 0;
      let fromCashback = 0;
      let fromStreaks = 0;

      grants.forEach(grant => {
        const amount = parseFloat(grant.amount);
        if (grant.reason.includes('Mission')) {
          fromMissions += amount;
        } else if (grant.reason.includes('Streak')) {
          fromStreaks += amount;
        } else {
          fromCashback += amount;
        }
      });

      return {
        total: totalBalance,
        fromMissions: fromMissions.toString(),
        fromCashback: fromCashback.toString(),
        fromStreaks: fromStreaks.toString(),
      };
    },
    enabled: !!totalBalance && !!grants,
  });
}
```

**Usage Example**:
```tsx
function CashbackBalance() {
  const { address } = useWallet();
  const { data: balance, isLoading } = useZariBalance(address);

  return (
    <Card>
      <h3>Cashback Balance</h3>
      {isLoading ? (
        <Skeleton className="h-8 w-32" />
      ) : (
        <p className="text-4xl font-bold">{formatZari(balance)}</p>
      )}
      <p className="text-sm text-muted-foreground">ZARI</p>
    </Card>
  );
}
```

**Testing**:
```typescript
describe('useZariBalance', () => {
  it('fetches ZARI balance successfully', async () => {
    const { result } = renderHook(() => useZariBalance('0xAlice'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBe('1234560000000000'); // 1234.56 ZARI (12 decimals)
  });

  it('returns 0 when account has no ZARI', async () => {
    const { result } = renderHook(() => useZariBalance('0xNewUser'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBe('0');
  });
});
```

---

### 2.4 useStreakHistory

**Purpose**: Get user's streak data including 365-day history.

**Returns**: Streak stats and daily activity map.

**Cache Strategy**:
- Stale time: 1 minute
- Cache time: 10 minutes
- Refetch on window focus: false (expensive query)

**Implementation**:
```typescript
import { useBlockchainQuery } from '@/hooks/blockchain/useBlockchainQuery';
import { useApi } from '@/providers/PolkadotProvider';

export interface Streak {
  currentStreak: number;
  longestStreak: number;
  lastActionBlock: number;
  totalDays: number;
  history: Map<string, boolean>; // Date → Active/Inactive
  nextMilestone: {
    days: number;
    daysRemaining: number;
    rewardAmount: string;
  };
}

export function useStreakHistory(userAddress?: string) {
  const { api } = useApi();

  return useBlockchainQuery<Streak | null>({
    queryKey: ['streakHistory', userAddress],
    queryFn: async () => {
      if (!api || !userAddress) return null;

      // Fetch streak data from blockchain
      const streakData = await api.query.bazariRewards.rewardStreaks(userAddress);

      if (streakData.isNone) {
        return {
          currentStreak: 0,
          longestStreak: 0,
          lastActionBlock: 0,
          totalDays: 0,
          history: new Map(),
          nextMilestone: {
            days: 7,
            daysRemaining: 7,
            rewardAmount: '1000',
          },
        };
      }

      const data = streakData.unwrap().toJSON() as any;

      // Calculate total days (query backend for history)
      // Note: Full 365-day history is stored off-chain for efficiency
      const historyResponse = await fetch(
        `/api/users/${userAddress}/streak-history`
      );
      const historyData = await historyResponse.json();

      // Build history map
      const history = new Map<string, boolean>();
      historyData.forEach((entry: { date: string; active: boolean }) => {
        history.set(entry.date, entry.active);
      });

      // Calculate next milestone
      const currentStreak = data.currentStreak;
      let nextMilestone = { days: 7, rewardAmount: '1000' };
      if (currentStreak >= 100) {
        nextMilestone = { days: 100, rewardAmount: '20000' }; // Already at max
      } else if (currentStreak >= 30) {
        nextMilestone = { days: 100, rewardAmount: '20000' };
      } else if (currentStreak >= 7) {
        nextMilestone = { days: 30, rewardAmount: '5000' };
      }

      return {
        currentStreak: data.currentStreak,
        longestStreak: data.longestStreak,
        lastActionBlock: data.lastActionBlock,
        totalDays: historyData.filter((e: any) => e.active).length,
        history,
        nextMilestone: {
          ...nextMilestone,
          daysRemaining: nextMilestone.days - currentStreak,
        },
      };
    },
    enabled: !!userAddress && !!api,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Expensive query
  });
}
```

**Usage Example**:
```tsx
function StreakHistoryPage() {
  const { address } = useWallet();
  const { data: streak, isLoading } = useStreakHistory(address);

  if (isLoading) return <LoadingSkeleton />;
  if (!streak) return <EmptyState title="No streak yet" />;

  return (
    <div>
      <StreakStats
        currentStreak={streak.currentStreak}
        longestStreak={streak.longestStreak}
        totalDays={streak.totalDays}
      />
      <MilestoneProgress milestone={streak.nextMilestone} />
      <StreakCalendar history={streak.history} />
    </div>
  );
}
```

**Testing**:
```typescript
describe('useStreakHistory', () => {
  it('fetches streak data successfully', async () => {
    const { result } = renderHook(() => useStreakHistory('0xAlice'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual({
      currentStreak: 7,
      longestStreak: 30,
      totalDays: 45,
      nextMilestone: {
        days: 30,
        daysRemaining: 23,
        rewardAmount: '5000',
      },
    });
  });
});
```

---

## 3. Mutation Hooks

### 3.1 useCompleteMission

**Purpose**: Claim mission reward (manual claim if not auto-claimed).

**Invalidates**: `missions`, `userMissions`, `zariBalance`

**Implementation**:
```typescript
import { useBlockchainTx } from '@/hooks/blockchain/useBlockchainTx';
import { useApi } from '@/providers/PolkadotProvider';
import { useQueryClient } from '@tanstack/react-query';

export function useCompleteMission() {
  const { api } = useApi();
  const queryClient = useQueryClient();

  return useBlockchainTx({
    mutationKey: ['completeMission'],
    mutationFn: async (missionId: number) => {
      if (!api) throw new Error('API not ready');

      // Note: In the actual pallet, rewards are auto-claimed via progressMission
      // This is a fallback for manual claim if needed
      const tx = api.tx.bazariRewards.claimReward(missionId);
      return tx;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['userMissions'] });
      queryClient.invalidateQueries({ queryKey: ['zariBalance'] });

      toast.success('Mission reward claimed successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to claim reward: ${error.message}`);
    },
  });
}
```

**Usage Example**:
```tsx
function MissionCard({ mission }: { mission: Mission }) {
  const { mutate: claimReward, isPending } = useCompleteMission();

  const handleClaim = () => {
    claimReward(mission.id);
  };

  return (
    <Card>
      <h3>{mission.name}</h3>
      <Button onClick={handleClaim} disabled={isPending}>
        {isPending ? 'Claiming...' : 'Claim Reward'}
      </Button>
    </Card>
  );
}
```

**Testing**:
```typescript
describe('useCompleteMission', () => {
  it('claims mission reward successfully', async () => {
    const { result } = renderHook(() => useCompleteMission());

    act(() => {
      result.current.mutate(1);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(toast.success).toHaveBeenCalledWith('Mission reward claimed successfully!');
  });

  it('handles error when claiming fails', async () => {
    const { result } = renderHook(() => useCompleteMission());

    act(() => {
      result.current.mutate(999); // Non-existent mission
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalled();
  });
});
```

---

### 3.2 useCreateMission

**Purpose**: Admin/DAO create new mission.

**Invalidates**: `missions`

**Implementation**:
```typescript
import { useBlockchainTx } from '@/hooks/blockchain/useBlockchainTx';
import { useApi } from '@/providers/PolkadotProvider';
import { useQueryClient } from '@tanstack/react-query';

export interface CreateMissionParams {
  name: string;
  description: string;
  type: MissionType;
  targetValue: number;
  rewardAmount: string;
  maxCompletions: number;
  expiresAt?: number; // Block number
}

export function useCreateMission() {
  const { api } = useApi();
  const queryClient = useQueryClient();

  return useBlockchainTx({
    mutationKey: ['createMission'],
    mutationFn: async (params: CreateMissionParams) => {
      if (!api) throw new Error('API not ready');

      // Encode name and description to bytes
      const nameBytes = new TextEncoder().encode(params.name);
      const descriptionBytes = new TextEncoder().encode(params.description);

      const tx = api.tx.bazariRewards.createMission(
        nameBytes,
        descriptionBytes,
        params.rewardAmount,
        params.type,
        params.targetValue,
        params.maxCompletions,
        params.expiresAt || null
      );

      return tx;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      toast.success('Mission created successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to create mission: ${error.message}`);
    },
  });
}
```

**Usage Example**:
```tsx
function CreateMissionForm() {
  const { mutate: createMission, isPending } = useCreateMission();

  const handleSubmit = (data: CreateMissionParams) => {
    createMission(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Mission'}
      </Button>
    </form>
  );
}
```

**Testing**:
```typescript
describe('useCreateMission', () => {
  it('creates mission successfully', async () => {
    const { result } = renderHook(() => useCreateMission());

    act(() => {
      result.current.mutate({
        name: 'Complete 5 Orders',
        description: 'Complete 5 successful orders',
        type: MissionType.CompleteOrders,
        targetValue: 5,
        rewardAmount: '50',
        maxCompletions: 0,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
```

---

### 3.3 useGrantCashback

**Purpose**: Mint ZARI cashback to user (system/DAO only).

**Invalidates**: `cashbackGrants`, `zariBalance`

**Implementation**:
```typescript
import { useBlockchainTx } from '@/hooks/blockchain/useBlockchainTx';
import { useApi } from '@/providers/PolkadotProvider';
import { useQueryClient } from '@tanstack/react-query';

export interface GrantCashbackParams {
  recipient: string;
  amount: string;
  reason: string;
  orderId?: number;
}

export function useGrantCashback() {
  const { api } = useApi();
  const queryClient = useQueryClient();

  return useBlockchainTx({
    mutationKey: ['grantCashback'],
    mutationFn: async (params: GrantCashbackParams) => {
      if (!api) throw new Error('API not ready');

      const reasonBytes = new TextEncoder().encode(params.reason);

      const tx = api.tx.bazariRewards.grantCashback(
        params.recipient,
        params.amount,
        reasonBytes,
        params.orderId || null
      );

      return tx;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cashbackGrants'] });
      queryClient.invalidateQueries({ queryKey: ['zariBalance', variables.recipient] });

      toast.success(`Cashback granted: ${variables.amount} ZARI`);
    },
    onError: (error) => {
      toast.error(`Failed to grant cashback: ${error.message}`);
    },
  });
}
```

**Usage Example** (typically called by backend, not frontend):
```typescript
// Backend: After order completion
await grantCashback({
  recipient: buyerAddress,
  amount: calculateCashback(orderTotal),
  reason: `Order #${orderId} cashback`,
  orderId,
});
```

---

## 4. Subscription Hooks

### 4.1 useMissionCompletedEvents

**Purpose**: Real-time subscription to mission completion events.

**Auto-invalidates**: `missions`, `userMissions`, `zariBalance`

**Implementation**:
```typescript
import { useEffect } from 'react';
import { useApi } from '@/providers/PolkadotProvider';
import { useQueryClient } from '@tanstack/react-query';

export interface MissionCompletedEvent {
  user: string;
  missionId: number;
  rewardAmount: string;
}

export function useMissionCompletedEvents({
  onEvent,
}: {
  onEvent?: (event: MissionCompletedEvent) => void;
}) {
  const { api } = useApi();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!api) return;

    // Subscribe to MissionCompleted events
    const unsubscribe = api.query.system.events((events) => {
      events.forEach((record) => {
        const { event } = record;

        if (api.events.bazariRewards.MissionCompleted.is(event)) {
          const [user, missionId, rewardAmount] = event.data;

          const eventData: MissionCompletedEvent = {
            user: user.toString(),
            missionId: missionId.toNumber(),
            rewardAmount: rewardAmount.toString(),
          };

          // Call callback
          onEvent?.(eventData);

          // Auto-invalidate queries
          queryClient.invalidateQueries({ queryKey: ['missions'] });
          queryClient.invalidateQueries({ queryKey: ['userMissions', eventData.user] });
          queryClient.invalidateQueries({ queryKey: ['zariBalance', eventData.user] });
        }
      });
    });

    return () => {
      unsubscribe.then(unsub => unsub());
    };
  }, [api, onEvent, queryClient]);
}
```

**Usage Example**:
```tsx
function MissionsHubPage() {
  const { address } = useWallet();

  useMissionCompletedEvents({
    onEvent: (event) => {
      if (event.user === address) {
        toast.success(`🎉 Mission Complete! +${formatZari(event.rewardAmount)} ZARI`);
      }
    },
  });

  return <MissionsList />;
}
```

**Testing**:
```typescript
describe('useMissionCompletedEvents', () => {
  it('receives mission completed event', async () => {
    const onEvent = jest.fn();
    renderHook(() => useMissionCompletedEvents({ onEvent }));

    // Simulate blockchain event
    await simulateBlockchainEvent('MissionCompleted', {
      user: '0xAlice',
      missionId: 1,
      rewardAmount: '50000000000000',
    });

    expect(onEvent).toHaveBeenCalledWith({
      user: '0xAlice',
      missionId: 1,
      rewardAmount: '50000000000000',
    });
  });
});
```

---

### 4.2 useCashbackGrantedEvents

**Purpose**: Real-time subscription to cashback grant events.

**Implementation**:
```typescript
export interface CashbackGrantedEvent {
  recipient: string;
  amount: string;
  grantId: number;
}

export function useCashbackGrantedEvents({
  onEvent,
}: {
  onEvent?: (event: CashbackGrantedEvent) => void;
}) {
  const { api } = useApi();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!api) return;

    const unsubscribe = api.query.system.events((events) => {
      events.forEach((record) => {
        const { event } = record;

        if (api.events.bazariRewards.CashbackGranted.is(event)) {
          const [recipient, amount, grantId] = event.data;

          const eventData: CashbackGrantedEvent = {
            recipient: recipient.toString(),
            amount: amount.toString(),
            grantId: grantId.toNumber(),
          };

          onEvent?.(eventData);

          queryClient.invalidateQueries({ queryKey: ['cashbackGrants'] });
          queryClient.invalidateQueries({ queryKey: ['zariBalance', eventData.recipient] });
        }
      });
    });

    return () => {
      unsubscribe.then(unsub => unsub());
    };
  }, [api, onEvent, queryClient]);
}
```

---

### 4.3 useStreakUpdatedEvents

**Purpose**: Real-time subscription to streak update events.

**Implementation**:
```typescript
export interface StreakUpdatedEvent {
  user: string;
  streak: number;
}

export function useStreakUpdatedEvents({
  onEvent,
}: {
  onEvent?: (event: StreakUpdatedEvent) => void;
}) {
  const { api } = useApi();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!api) return;

    const unsubscribe = api.query.system.events((events) => {
      events.forEach((record) => {
        const { event } = record;

        if (api.events.bazariRewards.StreakUpdated.is(event)) {
          const [user, streak] = event.data;

          const eventData: StreakUpdatedEvent = {
            user: user.toString(),
            streak: streak.toNumber(),
          };

          onEvent?.(eventData);

          queryClient.invalidateQueries({ queryKey: ['streakHistory', eventData.user] });
        }
      });
    });

    return () => {
      unsubscribe.then(unsub => unsub());
    };
  }, [api, onEvent, queryClient]);
}
```

---

## 5. Hooks Dependencies Graph

```
useMissions
└── (no dependencies)

useUserMissionProgress
└── (no dependencies)

useUserMissionsProgress
├── useMissions
└── (fetches progress for all missions)

useZariBalance
└── (no dependencies)

useZariBalanceWithBreakdown
├── useZariBalance
└── useCashbackGrants

useStreakHistory
└── (hybrid: blockchain + backend API)

useCompleteMission (mutation)
├── Invalidates: useMissions
├── Invalidates: useUserMissionProgress
└── Invalidates: useZariBalance

useCreateMission (mutation)
└── Invalidates: useMissions

useGrantCashback (mutation)
├── Invalidates: useCashbackGrants
└── Invalidates: useZariBalance

useMissionCompletedEvents (subscription)
├── Invalidates: useMissions
├── Invalidates: useUserMissionProgress
└── Invalidates: useZariBalance

useCashbackGrantedEvents (subscription)
├── Invalidates: useCashbackGrants
└── Invalidates: useZariBalance

useStreakUpdatedEvents (subscription)
└── Invalidates: useStreakHistory
```

---

## 6. Implementation Checklist

### 6.1 Query Hooks

- [ ] **useMissions** (0.5 day)
  - [ ] Implement query function
  - [ ] Add error handling
  - [ ] Add cache strategy
  - [ ] Write unit tests
  - [ ] Test with real blockchain

- [ ] **useUserMissionProgress** (0.5 day)
  - [ ] Implement single mission query
  - [ ] Implement batch query (useUserMissionsProgress)
  - [ ] Add loading states
  - [ ] Write unit tests

- [ ] **useZariBalance** (0.5 day)
  - [ ] Query pallet-assets for ZARI
  - [ ] Add polling (60s interval)
  - [ ] Add breakdown helper (useZariBalanceWithBreakdown)
  - [ ] Write unit tests

- [ ] **useStreakHistory** (0.5 day)
  - [ ] Query blockchain for streak data
  - [ ] Fetch 365-day history from backend
  - [ ] Calculate next milestone
  - [ ] Write unit tests

### 6.2 Mutation Hooks

- [ ] **useCompleteMission** (0.5 day)
  - [ ] Implement claim reward mutation
  - [ ] Add query invalidation
  - [ ] Add success/error toasts
  - [ ] Write unit tests

- [ ] **useCreateMission** (0.5 day)
  - [ ] Implement create mission mutation
  - [ ] Add DAO authorization check
  - [ ] Add validation
  - [ ] Write unit tests

- [ ] **useGrantCashback** (0.5 day)
  - [ ] Implement grant cashback mutation
  - [ ] Add query invalidation
  - [ ] Write unit tests

### 6.3 Subscription Hooks

- [ ] **useMissionCompletedEvents** (0.5 day)
  - [ ] Subscribe to MissionCompleted events
  - [ ] Add auto-invalidation
  - [ ] Add toast notifications
  - [ ] Write unit tests

- [ ] **useCashbackGrantedEvents** (0.5 day)
  - [ ] Subscribe to CashbackGranted events
  - [ ] Add auto-invalidation
  - [ ] Write unit tests

- [ ] **useStreakUpdatedEvents** (0.5 day)
  - [ ] Subscribe to StreakUpdated events
  - [ ] Add auto-invalidation
  - [ ] Write unit tests

### 6.4 Integration Testing

- [ ] Test mission completion flow end-to-end
- [ ] Test real-time updates (WebSocket)
- [ ] Test query invalidation cascades
- [ ] Test error handling and retries
- [ ] Test cache strategies (stale/gc times)

### 6.5 Performance Testing

- [ ] Test batch queries performance (useUserMissionsProgress)
- [ ] Test subscription memory leaks
- [ ] Test query cache efficiency
- [ ] Optimize expensive queries (useStreakHistory)

---

**Document Status**: ✅ COMPLETE
**Next Steps**: Implement hooks in order: useMissions → useUserMissionProgress → useZariBalance → useStreakHistory → mutations → subscriptions
**Dependencies**: [UI-SPEC.md](./UI-SPEC.md), [COMPONENTS.md](./COMPONENTS.md), [PAGES.md](./PAGES.md)
