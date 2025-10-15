import { describe, it, expect, beforeEach, vi } from 'vitest';
import { reputationService } from '../reputation';
import { prisma } from '../../../lib/prisma';

// Mock Prisma
vi.mock('../../../lib/prisma', () => ({
  prisma: {
    profile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('ReputationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateReputationMock', () => {
    it('should increase reputation correctly', async () => {
      const mockProfile = {
        id: 'profile_123',
        reputationScore: 100,
        reputationTier: 'bronze',
      };

      vi.mocked(prisma.profile.findUnique).mockResolvedValue(mockProfile as any);
      vi.mocked(prisma.profile.update).mockResolvedValue({
        ...mockProfile,
        reputationScore: 150,
        reputationTier: 'bronze',
      } as any);

      await reputationService.updateReputationMock({
        profileId: 'profile_123',
        action: 'sale_completed',
        value: 50,
        metadata: {},
      });

      expect(prisma.profile.update).toHaveBeenCalledWith({
        where: { id: 'profile_123' },
        data: {
          reputationScore: 150,
          reputationTier: 'bronze',
        },
      });
    });

    it('should decrease reputation correctly', async () => {
      const mockProfile = {
        id: 'profile_123',
        reputationScore: 100,
        reputationTier: 'bronze',
      };

      vi.mocked(prisma.profile.findUnique).mockResolvedValue(mockProfile as any);
      vi.mocked(prisma.profile.update).mockResolvedValue({
        ...mockProfile,
        reputationScore: 60,
        reputationTier: 'bronze',
      } as any);

      await reputationService.updateReputationMock({
        profileId: 'profile_123',
        action: 'report_confirmed',
        value: -40,
        metadata: {},
      });

      expect(prisma.profile.update).toHaveBeenCalledWith({
        where: { id: 'profile_123' },
        data: {
          reputationScore: 60,
          reputationTier: 'bronze',
        },
      });
    });

    it('should not allow reputation to go below 0', async () => {
      const mockProfile = {
        id: 'profile_123',
        reputationScore: 30,
        reputationTier: 'bronze',
      };

      vi.mocked(prisma.profile.findUnique).mockResolvedValue(mockProfile as any);
      vi.mocked(prisma.profile.update).mockResolvedValue({
        ...mockProfile,
        reputationScore: 0,
        reputationTier: 'bronze',
      } as any);

      await reputationService.updateReputationMock({
        profileId: 'profile_123',
        action: 'report_confirmed',
        value: -100,
        metadata: {},
      });

      expect(prisma.profile.update).toHaveBeenCalledWith({
        where: { id: 'profile_123' },
        data: {
          reputationScore: 0,
          reputationTier: 'bronze',
        },
      });
    });

    it('should update tier when crossing thresholds', async () => {
      const mockProfile = {
        id: 'profile_123',
        reputationScore: 450,
        reputationTier: 'bronze',
      };

      vi.mocked(prisma.profile.findUnique).mockResolvedValue(mockProfile as any);
      vi.mocked(prisma.profile.update).mockResolvedValue({
        ...mockProfile,
        reputationScore: 550,
        reputationTier: 'silver', // Crossed 500 threshold
      } as any);

      await reputationService.updateReputationMock({
        profileId: 'profile_123',
        action: 'sale_completed',
        value: 100,
        metadata: {},
      });

      const updateCall = vi.mocked(prisma.profile.update).mock.calls[0][0];
      expect(updateCall.data.reputationScore).toBe(550);
      expect(updateCall.data.reputationTier).toBe('silver');
    });
  });

  describe('calculateLevel', () => {
    it('should return correct level for each tier', () => {
      expect(reputationService.calculateLevel(50).name).toBe('bronze');
      expect(reputationService.calculateLevel(100).name).toBe('bronze');
      expect(reputationService.calculateLevel(500).name).toBe('silver');
      expect(reputationService.calculateLevel(2000).name).toBe('gold');
      expect(reputationService.calculateLevel(10000).name).toBe('platinum');
    });

    it('should return correct level number', () => {
      expect(reputationService.calculateLevel(50).level).toBe(1);
      expect(reputationService.calculateLevel(500).level).toBe(2);
      expect(reputationService.calculateLevel(2000).level).toBe(3);
      expect(reputationService.calculateLevel(10000).level).toBe(4);
    });
  });
});
