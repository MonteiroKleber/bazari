import { describe, it, expect, beforeEach, vi } from 'vitest';
import { moderationService } from '../moderation';
import { prisma } from '../../../lib/prisma';

// Mock Prisma
vi.mock('../../../lib/prisma', () => ({
  prisma: {
    chatReport: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    chatReportVote: {
      create: vi.fn(),
      count: vi.fn(),
    },
    profile: {
      findUnique: vi.fn(),
    },
  },
}));

describe('ModerationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createReport', () => {
    it('should create a report successfully', async () => {
      const mockReport = {
        id: 'report_123',
        reporterId: 'reporter_id',
        reportedId: 'reported_id',
        contentType: 'message',
        contentId: 'msg_123',
        reason: 'spam',
        description: 'Spam message',
        status: 'pending',
        createdAt: new Date(),
      };

      vi.mocked(prisma.chatReport.create).mockResolvedValue(mockReport as any);

      const result = await moderationService.createReport({
        reporterId: 'reporter_id',
        reportedId: 'reported_id',
        contentType: 'message',
        contentId: 'msg_123',
        reason: 'spam',
        description: 'Spam message',
      });

      expect(result).toEqual(mockReport);
      expect(prisma.chatReport.create).toHaveBeenCalledWith({
        data: {
          reporterId: 'reporter_id',
          reportedId: 'reported_id',
          contentType: 'message',
          contentId: 'msg_123',
          reason: 'spam',
          description: 'Spam message',
          status: 'pending',
        },
      });
    });
  });

  describe('voteReport', () => {
    it('should calculate vote weight based on reputation', async () => {
      const mockReport = {
        id: 'report_123',
        status: 'pending',
        approveVotes: 5,
        rejectVotes: 3,
      };

      const mockVoter = {
        id: 'voter_id',
        reputationScore: 250, // Should give weight of 2
      };

      vi.mocked(prisma.chatReport.findUnique).mockResolvedValue(mockReport as any);
      vi.mocked(prisma.profile.findUnique).mockResolvedValue(mockVoter as any);
      vi.mocked(prisma.chatReportVote.create).mockResolvedValue({} as any);
      vi.mocked(prisma.chatReport.update).mockResolvedValue({
        ...mockReport,
        approveVotes: 7, // 5 + 2 (weight)
      } as any);

      await moderationService.voteReport({
        reportId: 'report_123',
        voterId: 'voter_id',
        vote: 'approve',
      });

      expect(prisma.chatReport.update).toHaveBeenCalledWith({
        where: { id: 'report_123' },
        data: { approveVotes: 7 },
      });
    });

    it('should auto-resolve when threshold is reached (approve)', async () => {
      const mockReport = {
        id: 'report_123',
        status: 'pending',
        approveVotes: 18,
        rejectVotes: 5,
      };

      const mockVoter = {
        id: 'voter_id',
        reputationScore: 200,
      };

      vi.mocked(prisma.chatReport.findUnique).mockResolvedValue(mockReport as any);
      vi.mocked(prisma.profile.findUnique).mockResolvedValue(mockVoter as any);
      vi.mocked(prisma.chatReportVote.create).mockResolvedValue({} as any);

      // First update for vote count
      vi.mocked(prisma.chatReport.update).mockResolvedValueOnce({
        ...mockReport,
        approveVotes: 20, // Reached threshold
      } as any);

      // Second update for resolution
      vi.mocked(prisma.chatReport.update).mockResolvedValueOnce({
        ...mockReport,
        status: 'resolved',
        resolution: 'warning',
      } as any);

      await moderationService.voteReport({
        reportId: 'report_123',
        voterId: 'voter_id',
        vote: 'approve',
      });

      // Should have been called twice: once for vote, once for resolution
      expect(prisma.chatReport.update).toHaveBeenCalledTimes(2);
    });

    it('should auto-resolve when threshold is reached (reject)', async () => {
      const mockReport = {
        id: 'report_123',
        status: 'pending',
        approveVotes: 5,
        rejectVotes: 18,
      };

      const mockVoter = {
        id: 'voter_id',
        reputationScore: 200,
      };

      vi.mocked(prisma.chatReport.findUnique).mockResolvedValue(mockReport as any);
      vi.mocked(prisma.profile.findUnique).mockResolvedValue(mockVoter as any);
      vi.mocked(prisma.chatReportVote.create).mockResolvedValue({} as any);

      vi.mocked(prisma.chatReport.update).mockResolvedValueOnce({
        ...mockReport,
        rejectVotes: 20,
      } as any);

      vi.mocked(prisma.chatReport.update).mockResolvedValueOnce({
        ...mockReport,
        status: 'resolved',
        resolution: 'dismiss',
      } as any);

      await moderationService.voteReport({
        reportId: 'report_123',
        voterId: 'voter_id',
        vote: 'reject',
      });

      expect(prisma.chatReport.update).toHaveBeenCalledTimes(2);
    });

    it('should cap vote weight at 5', async () => {
      const mockReport = {
        id: 'report_123',
        status: 'pending',
        approveVotes: 5,
        rejectVotes: 3,
      };

      const mockVoter = {
        id: 'voter_id',
        reputationScore: 10000, // Very high reputation, but capped at weight 5
      };

      vi.mocked(prisma.chatReport.findUnique).mockResolvedValue(mockReport as any);
      vi.mocked(prisma.profile.findUnique).mockResolvedValue(mockVoter as any);
      vi.mocked(prisma.chatReportVote.create).mockResolvedValue({} as any);
      vi.mocked(prisma.chatReport.update).mockResolvedValue({
        ...mockReport,
        approveVotes: 10, // 5 + 5 (max weight)
      } as any);

      await moderationService.voteReport({
        reportId: 'report_123',
        voterId: 'voter_id',
        vote: 'approve',
      });

      expect(prisma.chatReport.update).toHaveBeenCalledWith({
        where: { id: 'report_123' },
        data: { approveVotes: 10 },
      });
    });
  });

  describe('resolveReport', () => {
    it('should resolve report with warning', async () => {
      const mockReport = {
        id: 'report_123',
        status: 'pending',
      };

      vi.mocked(prisma.chatReport.findUnique).mockResolvedValue(mockReport as any);
      vi.mocked(prisma.chatReport.update).mockResolvedValue({
        ...mockReport,
        status: 'resolved',
        resolution: 'warning',
      } as any);

      await moderationService.resolveReport({
        reportId: 'report_123',
        resolution: 'warning',
        moderatorId: 'mod_id',
      });

      expect(prisma.chatReport.update).toHaveBeenCalledWith({
        where: { id: 'report_123' },
        data: {
          status: 'resolved',
          resolution: 'warning',
          resolvedAt: expect.any(Date),
          resolvedBy: 'mod_id',
        },
      });
    });

    it('should throw error if report already resolved', async () => {
      const mockReport = {
        id: 'report_123',
        status: 'resolved',
      };

      vi.mocked(prisma.chatReport.findUnique).mockResolvedValue(mockReport as any);

      await expect(
        moderationService.resolveReport({
          reportId: 'report_123',
          resolution: 'warning',
          moderatorId: 'mod_id',
        })
      ).rejects.toThrow('Report already resolved');
    });
  });
});
