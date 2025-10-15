/**
 * Reputation Service - VERSÃO MOCK
 *
 * Esta é uma versão MOCK que atualiza reputação no PostgreSQL.
 * Será substituída por integração real com BazariChain posteriormente.
 *
 * Referência: ~/bazari/docs/specs/BAZCHAT_BLOCKCHAIN_REQUIREMENTS.md
 */

import { prisma } from '../../lib/prisma';

interface ReputationUpdate {
  profileId: string;
  action: 'sale_completed' | 'sale_canceled' | 'review_received';
  value: number; // Pode ser positivo ou negativo
  metadata?: Record<string, any>;
}

class ReputationService {
  /**
   * Atualiza reputação de um perfil (MOCK)
   * Na versão real, isso seria feito on-chain
   */
  async updateReputationMock(update: ReputationUpdate): Promise<void> {
    try {
      // Buscar perfil atual
      const profile = await prisma.profile.findUnique({
        where: { id: update.profileId },
      });

      if (!profile) {
        console.warn(`Profile not found: ${update.profileId}`);
        return;
      }

      // Calcular nova reputação
      // MOCK: Apenas incrementa/decrementa um contador simples
      // Na versão real, usaria sistema de reputação on-chain mais complexo
      const currentReputation = this.extractReputation(profile);
      const newReputation = Math.max(0, currentReputation + update.value);

      // Calcular tier baseado no novo score
      const reputationTier = this.calculateLevel(newReputation).name;

      // Atualizar perfil (MOCK)
      await prisma.profile.update({
        where: { id: update.profileId },
        data: {
          reputationScore: newReputation,
          reputationTier: reputationTier,
        },
      });

      console.log('[MOCK] Reputation updated:', {
        profileId: update.profileId,
        action: update.action,
        oldScore: currentReputation,
        newScore: newReputation,
        tier: reputationTier,
        delta: update.value,
      });

      // TODO: Substituir por atualização on-chain quando integrar
      // await chainService.updateReputation(profileId, value);
    } catch (error) {
      console.error('Failed to update reputation:', error);
      // Não lança erro para não bloquear o fluxo principal
    }
  }

  /**
   * Incrementa reputação após venda completada
   */
  async onSaleCompleted(sellerId: string, buyerId: string, amount: string): Promise<void> {
    // Incrementar reputação do vendedor
    await this.updateReputationMock({
      profileId: sellerId,
      action: 'sale_completed',
      value: 10, // +10 pontos por venda
      metadata: { amount },
    });

    // Incrementar reputação do comprador (menor incremento)
    await this.updateReputationMock({
      profileId: buyerId,
      action: 'sale_completed',
      value: 5, // +5 pontos por compra
      metadata: { amount },
    });
  }

  /**
   * Decrementa reputação após cancelamento
   */
  async onSaleCanceled(profileId: string, reason: string): Promise<void> {
    await this.updateReputationMock({
      profileId,
      action: 'sale_canceled',
      value: -5, // -5 pontos por cancelamento
      metadata: { reason },
    });
  }

  /**
   * Busca reputação de um perfil
   */
  async getReputation(profileId: string): Promise<number> {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
    });

    if (!profile) return 0;

    return this.extractReputation(profile);
  }

  /**
   * Extrai reputação do perfil
   */
  private extractReputation(profile: any): number {
    try {
      if (typeof profile.reputationScore === 'number') {
        return profile.reputationScore;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Busca histórico de reputação (MOCK)
   */
  async getReputationHistory(profileId: string): Promise<any[]> {
    // MOCK: Na versão real, buscaria histórico on-chain
    // Por enquanto, retorna apenas o estado atual
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
    });

    if (!profile) return [];

    return [
      {
        score: profile.reputationScore || 0,
        tier: profile.reputationTier || 'Newbie',
        timestamp: Date.now(),
      },
    ];
  }

  /**
   * Calcula nível de reputação baseado no score
   */
  calculateLevel(score: number): { level: number; name: string } {
    if (score >= 1000) return { level: 5, name: 'Legendary' };
    if (score >= 500) return { level: 4, name: 'Master' };
    if (score >= 200) return { level: 3, name: 'Expert' };
    if (score >= 50) return { level: 2, name: 'Intermediate' };
    if (score >= 10) return { level: 1, name: 'Beginner' };
    return { level: 0, name: 'Newbie' };
  }
}

export const reputationService = new ReputationService();
