import { prisma } from '../../lib/prisma.js';

/**
 * Serviço de Moderação (VERSÃO MOCK)
 *
 * MOCK: Usa PostgreSQL para simular moderação DAO on-chain
 * TODO: Substituir por BazariChain quando disponível
 */

interface ReportData {
  reporterId: string;
  reportedId: string;
  contentType: 'message' | 'profile' | 'group';
  contentId: string;
  reason: string;
  description?: string;
}

interface VoteData {
  reportId: string;
  voterId: string;
  vote: 'approve' | 'reject';
  weight?: number; // Peso do voto baseado em reputação
}

interface ResolveData {
  reportId: string;
  resolution: 'warning' | 'suspend' | 'ban' | 'dismiss';
  moderatorId: string;
  notes?: string;
}

class ModerationService {
  /**
   * Cria uma denúncia
   */
  async createReport(data: ReportData): Promise<any> {
    try {
      // Verificar se já existe denúncia similar
      const existing = await prisma.chatReport.findFirst({
        where: {
          reporterId: data.reporterId,
          reportedId: data.reportedId,
          contentType: data.contentType,
          contentId: data.contentId,
          status: { in: ['pending', 'under_review'] },
        },
      });

      if (existing) {
        throw new Error('Report already exists');
      }

      // Criar denúncia
      const report = await prisma.chatReport.create({
        data: {
          id: `report_${Date.now()}`,
          reporterId: data.reporterId,
          reportedId: data.reportedId,
          contentType: data.contentType,
          contentId: data.contentId,
          reason: data.reason,
          description: data.description || '',
          status: 'pending',
          votes: 0,
          approveVotes: 0,
          rejectVotes: 0,
          createdAt: BigInt(Date.now()),
        },
      });

      console.log('[MOCK] Report created:', report.id);

      // TODO: Substituir por evento on-chain
      // await chainService.createReportProposal(report);

      return report;
    } catch (error) {
      console.error('Failed to create report:', error);
      throw error;
    }
  }

  /**
   * Vota em uma denúncia (DAO-light)
   */
  async voteReport(data: VoteData): Promise<any> {
    try {
      // Buscar denúncia
      const report = await prisma.chatReport.findUnique({
        where: { id: data.reportId },
      });

      if (!report) {
        throw new Error('Report not found');
      }

      if (report.status !== 'pending' && report.status !== 'under_review') {
        throw new Error('Report is not open for voting');
      }

      // Verificar se já votou
      const existingVote = await prisma.chatReportVote.findUnique({
        where: {
          reportId_voterId: {
            reportId: data.reportId,
            voterId: data.voterId,
          },
        },
      });

      if (existingVote) {
        throw new Error('Already voted');
      }

      // Calcular peso do voto baseado em reputação (MOCK)
      const voter = await prisma.profile.findUnique({
        where: { id: data.voterId },
        select: { reputationScore: true },
      });

      const voteWeight = data.weight || Math.min(Math.floor((voter?.reputationScore || 0) / 100), 5) || 1;

      // Registrar voto
      await prisma.chatReportVote.create({
        data: {
          reportId: data.reportId,
          voterId: data.voterId,
          vote: data.vote,
          weight: voteWeight,
          votedAt: BigInt(Date.now()),
        },
      });

      // Atualizar contadores
      const newApproveVotes = report.approveVotes + (data.vote === 'approve' ? voteWeight : 0);
      const newRejectVotes = report.rejectVotes + (data.vote === 'reject' ? voteWeight : 0);
      const newTotalVotes = report.votes + voteWeight;

      await prisma.chatReport.update({
        where: { id: data.reportId },
        data: {
          votes: newTotalVotes,
          approveVotes: newApproveVotes,
          rejectVotes: newRejectVotes,
          status: newTotalVotes >= 10 ? 'under_review' : 'pending', // Threshold mock
        },
      });

      console.log('[MOCK] Vote registered:', {
        reportId: data.reportId,
        vote: data.vote,
        weight: voteWeight,
      });

      // Auto-resolver se atingir threshold
      if (newTotalVotes >= 20) {
        const resolution = newApproveVotes > newRejectVotes ? 'warning' : 'dismiss';
        await this.resolveReport({
          reportId: data.reportId,
          resolution,
          moderatorId: 'system',
          notes: 'Auto-resolved by DAO vote',
        });
      }

      return { success: true, voteWeight };
    } catch (error) {
      console.error('Failed to vote on report:', error);
      throw error;
    }
  }

  /**
   * Resolve uma denúncia
   */
  async resolveReport(data: ResolveData): Promise<void> {
    try {
      const report = await prisma.chatReport.findUnique({
        where: { id: data.reportId },
      });

      if (!report) {
        throw new Error('Report not found');
      }

      // Atualizar status
      await prisma.chatReport.update({
        where: { id: data.reportId },
        data: {
          status: 'resolved',
          resolution: data.resolution,
          resolvedBy: data.moderatorId,
          resolvedAt: BigInt(Date.now()),
          resolutionNotes: data.notes,
        },
      });

      // Aplicar ação se necessário
      if (data.resolution !== 'dismiss') {
        await this.applyPenalty(report.reportedId, data.resolution);
      }

      console.log('[MOCK] Report resolved:', {
        reportId: data.reportId,
        resolution: data.resolution,
      });

      // TODO: Substituir por ação on-chain
      // await chainService.executeModeration(report.reportedId, data.resolution);
    } catch (error) {
      console.error('Failed to resolve report:', error);
      throw error;
    }
  }

  /**
   * Aplica penalidade ao usuário (MOCK)
   */
  private async applyPenalty(profileId: string, penalty: string): Promise<void> {
    // MOCK: Apenas log
    // Na versão real, seria aplicado on-chain

    const penaltyMap: Record<string, number> = {
      warning: -10,
      suspend: -50,
      ban: -100,
    };

    const reputationDelta = penaltyMap[penalty] || 0;

    if (reputationDelta !== 0) {
      const profile = await prisma.profile.findUnique({
        where: { id: profileId },
      });

      if (profile) {
        const newScore = Math.max(0, profile.reputationScore + reputationDelta);

        await prisma.profile.update({
          where: { id: profileId },
          data: {
            reputationScore: newScore,
          },
        });
      }
    }

    console.log('[MOCK] Penalty applied:', {
      profileId,
      penalty,
      reputationDelta,
    });
  }

  /**
   * Busca denúncias de um usuário
   */
  async getReports(filters: {
    reporterId?: string;
    reportedId?: string;
    status?: string;
    limit?: number;
  }): Promise<any[]> {
    const where: any = {};

    if (filters.reporterId) {
      where.reporterId = filters.reporterId;
    }

    if (filters.reportedId) {
      where.reportedId = filters.reportedId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    const reports = await prisma.chatReport.findMany({
      where,
      take: filters.limit || 20,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reports;
  }

  /**
   * Busca detalhes de uma denúncia com votos
   */
  async getReportDetails(reportId: string): Promise<any> {
    const report = await prisma.chatReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return null;
    }

    const votes = await prisma.chatReportVote.findMany({
      where: { reportId },
    });

    return {
      ...report,
      voteDetails: votes,
    };
  }
}

export const moderationService = new ModerationService();
