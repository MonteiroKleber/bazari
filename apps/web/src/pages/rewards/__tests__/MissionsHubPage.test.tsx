import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import MissionsHubPage from '../MissionsHubPage';

// Mock hooks
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
      {
        id: 2,
        name: 'First Purchase',
        description: 'Make your first purchase',
        rewardAmount: 50,
        missionType: 'FirstPurchase',
        targetValue: 1,
        maxCompletions: 1000,
        completionCount: 200,
        isActive: true,
        createdAt: Date.now() / 1000,
      },
    ],
    isLoading: false,
    refetch: vi.fn(),
  })),
  useUserMissionProgress: vi.fn(() => ({
    data: null,
    isLoading: false,
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

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('MissionsHubPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title and description', () => {
    renderWithRouter(<MissionsHubPage />);

    expect(screen.getByText('Missions Hub')).toBeInTheDocument();
    expect(
      screen.getByText(/Complete missions to earn ZARI tokens/)
    ).toBeInTheDocument();
  });

  it('displays missions grid', () => {
    renderWithRouter(<MissionsHubPage />);

    expect(screen.getByText('Complete 5 Orders')).toBeInTheDocument();
    expect(screen.getByText('First Purchase')).toBeInTheDocument();
  });

  it('shows streak widget and cashback balance', () => {
    renderWithRouter(<MissionsHubPage />);

    expect(screen.getByText('Day Streak')).toBeInTheDocument();
    expect(screen.getByText('ZARI Balance')).toBeInTheDocument();
  });

  it('displays quick stats', () => {
    renderWithRouter(<MissionsHubPage />);

    expect(screen.getByText('Active Missions')).toBeInTheDocument();
    expect(screen.getByText('Total Rewards')).toBeInTheDocument();
    expect(screen.getByText('Completion Rate')).toBeInTheDocument();
  });

  it('filters missions by search query', async () => {
    const user = userEvent.setup();
    renderWithRouter(<MissionsHubPage />);

    const searchInput = screen.getByPlaceholderText(/Search missions/);
    await user.type(searchInput, 'First Purchase');

    await waitFor(() => {
      expect(screen.getByText('First Purchase')).toBeInTheDocument();
      expect(screen.queryByText('Complete 5 Orders')).not.toBeInTheDocument();
    });
  });

  it('shows empty state when no missions match filter', async () => {
    const user = userEvent.setup();
    renderWithRouter(<MissionsHubPage />);

    const searchInput = screen.getByPlaceholderText(/Search missions/);
    await user.type(searchInput, 'Nonexistent Mission');

    await waitFor(() => {
      expect(screen.getByText('No missions found')).toBeInTheDocument();
    });
  });
});
