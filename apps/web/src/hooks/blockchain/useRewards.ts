import { useBlockchainQuery } from '../useBlockchainQuery';
import { useBlockchainTx } from '../useBlockchainTx';

/**
 * useRewards - Complete blockchain hooks for Bazari Rewards & Missions system
 *
 * Provides 8 hooks for interacting with the bazari-rewards pallet:
 * - useMissions() - Query all active missions
 * - useUserMissionProgress(missionId) - Query user's mission progress
 * - useClaimReward() - Mutation: claim ZARI reward
 * - useZariBalance() - Query ZARI token balance
 * - useStreakData() - Query daily streak info
 * - useMissionCompletionEvents() - WebSocket listener for completions
 * - useCreateMission() - Mutation: DAO creates mission
 * - useConvertZari() - Mutation: convert ZARI → BZR
 */

/**
 * Mission type definitions matching blockchain pallet
 */
export type MissionType =
  | 'CompleteOrders'
  | 'SpendAmount'
  | 'ReferUsers'
  | 'CreateStore'
  | 'FirstPurchase'
  | 'DailyStreak'
  | 'Custom';

export interface Mission {
  id: number;
  name: string;
  description: string;
  rewardAmount: number;
  missionType: MissionType;
  targetValue: number;
  maxCompletions: number;
  completionCount: number;
  expiresAt?: number;
  isActive: boolean;
  createdAt: number;
}

export interface UserMission {
  missionId: number;
  progress: number;
  completed: boolean;
  completedAt?: number;
  rewardsClaimed: boolean;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate?: string;
}

export interface CashbackHistory {
  id: number;
  amount: number;
  source: string;
  timestamp: number;
  txHash?: string;
}

/**
 * Hook 1: Get all active missions
 *
 * @returns Array of active missions from blockchain
 *
 * @example
 * const { data: missions, isLoading } = useMissions();
 */
export function useMissions() {
  return useBlockchainQuery<Mission[]>({
    endpoint: '/api/blockchain/rewards/missions',
    refetchInterval: 30000, // 30 seconds
  });
}

/**
 * Hook 2: Get user's progress for a specific mission
 *
 * @param missionId - The mission ID to query
 * @returns User's progress for the mission
 *
 * @example
 * const { data: progress } = useUserMissionProgress(1);
 */
export function useUserMissionProgress(missionId?: number) {
  return useBlockchainQuery<UserMission>({
    endpoint: `/api/blockchain/rewards/missions/${missionId}/progress`,
    enabled: missionId !== undefined && missionId !== null,
    refetchInterval: 10000, // 10 seconds (progress updates frequently)
  });
}

/**
 * Hook 3: Claim mission reward
 *
 * @returns Mutation function to claim reward and state
 *
 * @example
 * const { sendTx: claimReward, isLoading } = useClaimReward();
 * await claimReward(missionId);
 */
export function useClaimReward() {
  return useBlockchainTx({
    onSuccess: (data) => {
      console.log('[useClaimReward] Reward claimed successfully:', data);
    },
    onError: (error) => {
      console.error('[useClaimReward] Failed to claim reward:', error);
    },
  });
}

/**
 * Helper function to execute claim reward transaction
 */
export function useClaimRewardMutation() {
  const { sendTx, ...rest } = useClaimReward();

  const claimReward = async (missionId: number) => {
    return sendTx({
      endpoint: `/api/blockchain/rewards/missions/${missionId}/claim`,
      method: 'POST',
    });
  };

  return {
    claimReward,
    ...rest,
  };
}

/**
 * Hook 4: Get ZARI token balance (AssetId: 1)
 *
 * @returns ZARI token balance for current user
 *
 * @example
 * const { data: balance } = useZariBalance();
 */
export function useZariBalance() {
  return useBlockchainQuery<{ balance: string; formatted: string }>({
    endpoint: '/api/blockchain/rewards/zari/balance',
    refetchInterval: 30000, // Auto-refresh every 30s
  });
}

/**
 * Hook 5: Get daily streak data
 *
 * @returns Current and longest streak information
 *
 * @example
 * const { data: streak } = useStreakData();
 */
export function useStreakData() {
  return useBlockchainQuery<StreakData>({
    endpoint: '/api/blockchain/rewards/streaks',
    refetchInterval: 60000, // 1 minute
  });
}

/**
 * Hook 6: Get streak history (calendar data)
 *
 * @param days - Number of days to fetch (default: 30)
 * @returns Array of daily activity
 *
 * @example
 * const { data: history } = useStreakHistory(30);
 */
export function useStreakHistory(days: number = 30) {
  return useBlockchainQuery<Array<{ date: string; active: boolean }>>({
    endpoint: '/api/blockchain/rewards/streaks/history',
    params: { days },
    refetchInterval: 300000, // 5 minutes
  });
}

/**
 * Hook 7: Get cashback transaction history
 *
 * @param limit - Max number of transactions to fetch
 * @returns Array of cashback transactions
 *
 * @example
 * const { data: history } = useCashbackHistory(50);
 */
export function useCashbackHistory(limit: number = 50) {
  return useBlockchainQuery<CashbackHistory[]>({
    endpoint: '/api/blockchain/rewards/cashback/history',
    params: { limit },
  });
}

/**
 * Hook 8: Create mission (DAO only)
 *
 * @returns Mutation function to create mission
 *
 * @example
 * const { createMission, isLoading } = useCreateMission();
 */
export function useCreateMission() {
  const { sendTx, ...rest } = useBlockchainTx({
    onSuccess: (data) => {
      console.log('[useCreateMission] Mission created successfully:', data);
    },
    onError: (error) => {
      console.error('[useCreateMission] Failed to create mission:', error);
    },
  });

  const createMission = async (missionData: {
    name: string;
    description: string;
    rewardAmount: number;
    missionType: MissionType;
    targetValue: number;
    maxCompletions: number;
    expiresAt?: number;
  }) => {
    return sendTx({
      endpoint: '/api/blockchain/rewards/missions',
      method: 'POST',
      data: missionData,
    });
  };

  return {
    createMission,
    ...rest,
  };
}

/**
 * Hook 9: Convert ZARI to BZR
 *
 * @returns Mutation function to convert ZARI tokens
 *
 * @example
 * const { convertZari, isLoading } = useConvertZari();
 */
export function useConvertZari() {
  const { sendTx, ...rest } = useBlockchainTx({
    onSuccess: (data) => {
      console.log('[useConvertZari] ZARI converted successfully:', data);
    },
    onError: (error) => {
      console.error('[useConvertZari] Failed to convert ZARI:', error);
    },
  });

  const convertZari = async (amount: number) => {
    return sendTx({
      endpoint: '/api/blockchain/rewards/zari/convert',
      method: 'POST',
      data: { amount },
    });
  };

  return {
    convertZari,
    ...rest,
  };
}

/**
 * Hook 10: Update mission progress (Backend/Admin only)
 *
 * This is typically called by the backend when user performs actions,
 * but can be used for testing or admin purposes.
 *
 * @returns Mutation function to update mission progress
 *
 * @example
 * const { updateProgress } = useUpdateMissionProgress();
 */
export function useUpdateMissionProgress() {
  const { sendTx, ...rest } = useBlockchainTx();

  const updateProgress = async (missionId: number, increment: number) => {
    return sendTx({
      endpoint: `/api/blockchain/rewards/missions/${missionId}/progress`,
      method: 'POST',
      data: { increment },
    });
  };

  return {
    updateProgress,
    ...rest,
  };
}

/**
 * Hook 11: Get mission leaderboard
 *
 * @param missionId - Optional mission ID to filter leaderboard
 * @returns Top users by mission completions
 *
 * @example
 * const { data: leaderboard } = useMissionLeaderboard();
 */
export function useMissionLeaderboard(missionId?: number) {
  return useBlockchainQuery<
    Array<{
      accountId: string;
      username?: string;
      completions: number;
      totalRewards: number;
    }>
  >({
    endpoint: '/api/blockchain/rewards/leaderboard',
    params: missionId ? { missionId } : undefined,
    refetchInterval: 60000, // 1 minute
  });
}

/**
 * Hook 12: Get user's total rewards summary
 *
 * @returns Summary of all rewards earned by user
 *
 * @example
 * const { data: summary } = useRewardsSummary();
 */
export function useRewardsSummary() {
  return useBlockchainQuery<{
    totalMissionsCompleted: number;
    totalZariEarned: number;
    currentStreak: number;
    totalCashback: number;
    rank?: number;
  }>({
    endpoint: '/api/blockchain/rewards/summary',
    refetchInterval: 30000, // 30 seconds
  });
}
