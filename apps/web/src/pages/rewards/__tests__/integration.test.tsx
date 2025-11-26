import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import MissionsHubPage from '../MissionsHubPage';

/**
 * Integration Test: Complete Mission Flow
 *
 * Tests the full user journey:
 * 1. View missions dashboard
 * 2. See mission progress
 * 3. Complete mission (simulated)
 * 4. Claim reward
 * 5. Verify ZARI balance updated
 */

describe('Mission Flow Integration', () => {
  const mockClaimReward = vi.fn();
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock completed mission
    vi.mock('@/hooks/blockchain/useRewards', () => ({
      useMissions: vi.fn(() => ({
        data: [
          {
            id: 1,
            name: 'Complete 5 Orders',
            description: 'Complete 5 orders to earn 100 ZARI',
            rewardAmount: 100,
            missionType: 'CompleteOrders',
            targetValue: 5,
            maxCompletions: 100,
            completionCount: 50,
            isActive: true,
            createdAt: Date.now() / 1000,
          },
        ],
        isLoading: false,
        refetch: mockRefetch,
      })),
      useUserMissionProgress: vi.fn(() => ({
        data: {
          missionId: 1,
          progress: 5,
          completed: true,
          completedAt: Date.now() / 1000,
          rewardsClaimed: false,
        },
        isLoading: false,
      })),
      useClaimRewardMutation: vi.fn(() => ({
        claimReward: mockClaimReward,
        isLoading: false,
        isSuccess: false,
      })),
      useStreakData: vi.fn(() => ({
        data: { currentStreak: 5, longestStreak: 10 },
        isLoading: false,
      })),
      useZariBalance: vi.fn(() => ({
        data: { balance: '1000000000000', formatted: '1.00' },
        isLoading: false,
        refetch: vi.fn(),
      })),
    }));
  });

  it('completes full mission claim flow', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <MissionsHubPage />
      </BrowserRouter>
    );

    // Step 1: Verify mission is visible
    expect(screen.getByText('Complete 5 Orders')).toBeInTheDocument();

    // Step 2: Verify mission is marked as completed
    expect(screen.getByText('Complete')).toBeInTheDocument();

    // Step 3: Find and click claim button
    const claimButton = screen.getByRole('button', { name: /Claim Reward/i });
    expect(claimButton).toBeInTheDocument();

    await user.click(claimButton);

    // Step 4: Verify claim function was called
    await waitFor(() => {
      expect(mockClaimReward).toHaveBeenCalledWith(1);
    });

    // Step 5: Verify refetch was triggered
    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it('shows progress tracking before completion', () => {
    // Override with in-progress mission
    vi.mock('@/hooks/blockchain/useRewards', () => ({
      useUserMissionProgress: vi.fn(() => ({
        data: {
          missionId: 1,
          progress: 3,
          completed: false,
          rewardsClaimed: false,
        },
        isLoading: false,
      })),
    }));

    render(
      <BrowserRouter>
        <MissionsHubPage />
      </BrowserRouter>
    );

    // Verify progress is shown
    expect(screen.getByText('Your Progress')).toBeInTheDocument();
    expect(screen.getByText('3 / 5')).toBeInTheDocument();
  });
});
