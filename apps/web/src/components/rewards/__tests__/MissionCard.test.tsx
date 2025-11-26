import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MissionCard } from '../MissionCard';
import type { Mission } from '@/hooks/blockchain/useRewards';

// Mock hooks
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

const mockMission: Mission = {
  id: 1,
  name: 'Complete 5 Orders',
  description: 'Complete 5 orders to earn 100 ZARI tokens',
  rewardAmount: 100,
  missionType: 'CompleteOrders',
  targetValue: 5,
  maxCompletions: 100,
  completionCount: 50,
  isActive: true,
  createdAt: Date.now() / 1000,
};

describe('MissionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders mission information correctly', () => {
    render(<MissionCard mission={mockMission} />);

    expect(screen.getByText('Complete 5 Orders')).toBeInTheDocument();
    expect(screen.getByText(/Complete 5 orders to earn 100 ZARI/)).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('displays progress bar with correct values', () => {
    render(<MissionCard mission={mockMission} />);

    expect(screen.getByText('3 / 5')).toBeInTheDocument();
    expect(screen.getByText('Your Progress')).toBeInTheDocument();
  });

  it('shows completion count', () => {
    render(<MissionCard mission={mockMission} />);

    expect(screen.getByText(/50 \/ 100 claimed/)).toBeInTheDocument();
  });

  it('displays mission type icon', () => {
    render(<MissionCard mission={mockMission} />);

    // Check for icon container
    const icon = screen.getByRole('img', { name: /CompleteOrders mission/ });
    expect(icon).toBeInTheDocument();
  });
});
