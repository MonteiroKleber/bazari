import { prisma } from '../../lib/prisma.js';
import crypto from 'crypto';

/**
 * Serviço de Selos de Confiança (VERSÃO MOCK)
 *
 * MOCK: Usa PostgreSQL para simular Trust Badges NFT on-chain
 * TODO: Substituir por BazariChain NFT quando disponível
 */

type BadgeLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

interface BadgeCriteria {
  minReputation: number;
  minSales: number;
  minAge: number; // dias
  maxReports: number;
}

const BADGE_CRITERIA: Record<BadgeLevel, BadgeCriteria> = {
  bronze: {
    minReputation: 100,
    minSales: 5,
    minAge: 30,
    maxReports: 2,
  },
  silver: {
    minReputation: 500,
    minSales: 20,
    minAge: 90,
    maxReports: 1,
  },
  gold: {
    minReputation: 2000,
    minSales: 100,
    minAge: 180,
    maxReports: 0,
  },
  platinum: {
    minReputation: 10000,
    minSales: 500,
    minAge: 365,
    maxReports: 0,
  },
};

class BadgesService {
  /**
   * Avalia se usuário qualifica para Trust Badge
   */
  async evaluateTrustBadge(profileId: string): Promise<{ qualifies: boolean; level?: BadgeLevel; reason?: string }> {
    try {
      // Buscar perfil
      const profile = await prisma.profile.findUnique({
        where: { id: profileId },
      });

      if (!profile) {
        return { qualifies: false, reason: 'Profile not found' };
      }

      // Calcular idade da conta
      const accountAgeDays = Math.floor((Date.now() - profile.createdAt.getTime()) / (1000 * 60 * 60 * 24));

      // Contar vendas completas (MOCK)
      const salesCount = await prisma.chatSale.count({
        where: {
          seller: profileId,
          status: 'split',
        },
      });

      // Contar denúncias não resolvidas ou com penalidade
      const reportsCount = await prisma.chatReport.count({
        where: {
          reportedId: profileId,
          status: 'resolved',
          resolution: { in: ['warning', 'suspend', 'ban'] },
        },
      });

      // Avaliar níveis (do mais alto para o mais baixo)
      const levels: BadgeLevel[] = ['platinum', 'gold', 'silver', 'bronze'];

      for (const level of levels) {
        const criteria = BADGE_CRITERIA[level];

        if (
          profile.reputationScore >= criteria.minReputation &&
          salesCount >= criteria.minSales &&
          accountAgeDays >= criteria.minAge &&
          reportsCount <= criteria.maxReports
        ) {
          return { qualifies: true, level };
        }
      }

      return {
        qualifies: false,
        reason: 'Does not meet minimum criteria',
      };
    } catch (error) {
      console.error('Failed to evaluate trust badge:', error);
      return { qualifies: false, reason: 'Evaluation error' };
    }
  }

  /**
   * Emite Trust Badge (NFT mock)
   */
  async issueBadge(profileId: string, level: BadgeLevel): Promise<any> {
    try {
      // Verificar se já tem badge
      const existing = await prisma.chatTrustBadge.findFirst({
        where: {
          profileId,
          isActive: true,
        },
      });

      if (existing) {
        // Se badge existente é menor, atualizar
        const levelRank = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
        if (levelRank[level] <= levelRank[existing.level as BadgeLevel]) {
          return existing;
        }

        // Desativar badge antigo
        await prisma.chatTrustBadge.update({
          where: { id: existing.id },
          data: { isActive: false },
        });
      }

      // Gerar NFT mock
      const nftId = this.generateMockNftId();

      // Criar novo badge
      const badge = await prisma.chatTrustBadge.create({
        data: {
          id: `badge_${Date.now()}`,
          profileId,
          level,
          nftId,
          isActive: true,
          issuedAt: BigInt(Date.now()),
        },
      });

      console.log('[MOCK] Trust Badge issued:', {
        profileId,
        level,
        nftId,
      });

      // TODO: Substituir por mint de NFT on-chain
      // await chainService.mintTrustBadge(profileId, level);

      return badge;
    } catch (error) {
      console.error('Failed to issue badge:', error);
      throw error;
    }
  }

  /**
   * Busca badge ativo de um usuário
   */
  async getActiveBadge(profileId: string): Promise<any | null> {
    const badge = await prisma.chatTrustBadge.findFirst({
      where: {
        profileId,
        isActive: true,
      },
    });

    return badge;
  }

  /**
   * Revoga badge (por penalidade)
   */
  async revokeBadge(profileId: string, reason: string): Promise<void> {
    await prisma.chatTrustBadge.updateMany({
      where: {
        profileId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    console.log('[MOCK] Trust Badge revoked:', {
      profileId,
      reason,
    });

    // TODO: Substituir por burn de NFT on-chain
    // await chainService.burnTrustBadge(profileId);
  }

  /**
   * Avalia e emite badge automaticamente
   */
  async evaluateAndIssue(profileId: string): Promise<any> {
    const evaluation = await this.evaluateTrustBadge(profileId);

    if (evaluation.qualifies && evaluation.level) {
      return await this.issueBadge(profileId, evaluation.level);
    }

    return null;
  }

  /**
   * Busca histórico de badges
   */
  async getBadgeHistory(profileId: string): Promise<any[]> {
    const badges = await prisma.chatTrustBadge.findMany({
      where: { profileId },
      orderBy: {
        issuedAt: 'desc',
      },
    });

    return badges;
  }

  /**
   * Gera ID de NFT mock
   */
  private generateMockNftId(): string {
    return '0x' + crypto.randomBytes(16).toString('hex');
  }
}

export const badgesService = new BadgesService();
