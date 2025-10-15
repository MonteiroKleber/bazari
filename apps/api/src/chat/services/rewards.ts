import { prisma } from '../../lib/prisma.js';
import crypto from 'crypto';

/**
 * Serviço de Recompensas (VERSÃO MOCK)
 *
 * MOCK: Usa PostgreSQL para simular rewards on-chain
 * TODO: Substituir por BazariChain quando disponível
 */

interface CashbackGrant {
  profileId: string;
  amount: string; // BZR
  reason: string;
  sourceType: 'sale' | 'mission' | 'referral' | 'promotion';
  sourceId?: string;
}

interface CashbackRedemption {
  profileId: string;
  amount: string; // BZR
}

interface MissionData {
  title: string;
  description: string;
  kind: 'onboarding' | 'referral' | 'sales' | 'engagement';
  goal: number; // Quantidade necessária para completar
  reward: string; // BZR
  expiresAt?: number;
  isActive?: boolean;
}

interface MissionCompletion {
  profileId: string;
  missionId: string;
  progress?: number;
}

class RewardsService {
  private readonly BAZARI_TREASURY = '0x0000000000000000000000000000000000000001'; // Mock treasury

  /**
   * Concede cashback a um usuário (MOCK)
   * Na versão real, minta BZR tokens on-chain
   */
  async grantCashback(data: CashbackGrant): Promise<string> {
    try {
      // MOCK: Criar registro no PostgreSQL simulando transação on-chain
      const txHash = this.generateMockTxHash();

      // Buscar saldo atual
      const profile = await prisma.profile.findUnique({
        where: { id: data.profileId },
      });

      if (!profile) {
        throw new Error('Profile not found');
      }

      const currentBalance = parseFloat(profile.cashbackBalance || '0');
      const newBalance = currentBalance + parseFloat(data.amount);

      // Atualizar saldo (MOCK)
      await prisma.profile.update({
        where: { id: data.profileId },
        data: {
          cashbackBalance: newBalance.toString(),
        },
      });

      console.log('[MOCK] Cashback granted:', {
        profileId: data.profileId,
        amount: data.amount,
        reason: data.reason,
        txHash,
        newBalance,
      });

      // TODO: Substituir por:
      // await chainService.mintReward(profileId, amount);

      return txHash;
    } catch (error) {
      console.error('Failed to grant cashback:', error);
      throw error;
    }
  }

  /**
   * Resgata cashback (MOCK)
   * Na versão real, queima BZR e transfere para wallet
   */
  async redeemCashback(data: CashbackRedemption): Promise<string> {
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: data.profileId },
      });

      if (!profile) {
        throw new Error('Profile not found');
      }

      const currentBalance = parseFloat(profile.cashbackBalance || '0');
      const redeemAmount = parseFloat(data.amount);

      if (currentBalance < redeemAmount) {
        throw new Error('Insufficient cashback balance');
      }

      const newBalance = currentBalance - redeemAmount;
      const txHash = this.generateMockTxHash();

      // Atualizar saldo (MOCK)
      await prisma.profile.update({
        where: { id: data.profileId },
        data: {
          cashbackBalance: newBalance.toString(),
        },
      });

      console.log('[MOCK] Cashback redeemed:', {
        profileId: data.profileId,
        amount: data.amount,
        txHash,
        newBalance,
      });

      // TODO: Substituir por:
      // await chainService.burnReward(profileId, amount);
      // await chainService.transfer(TREASURY, profileWallet, amount);

      return txHash;
    } catch (error) {
      console.error('Failed to redeem cashback:', error);
      throw error;
    }
  }

  /**
   * Cria uma missão
   */
  async createMission(data: MissionData): Promise<any> {
    try {
      const mission = await prisma.chatMission.create({
        data: {
          id: `mission_${Date.now()}`,
          title: data.title,
          description: data.description,
          kind: data.kind,
          goal: data.goal,
          reward: data.reward,
          expiresAt: data.expiresAt ? BigInt(data.expiresAt) : null,
          isActive: data.isActive ?? true,
          createdAt: BigInt(Date.now()),
        },
      });

      console.log('[MOCK] Mission created:', mission);

      return mission;
    } catch (error) {
      console.error('Failed to create mission:', error);
      throw error;
    }
  }

  /**
   * Completa uma missão e concede recompensa
   */
  async completeMission(data: MissionCompletion): Promise<{ completed: boolean; txHash?: string }> {
    try {
      // Buscar missão
      const mission = await prisma.chatMission.findUnique({
        where: { id: data.missionId },
      });

      if (!mission) {
        throw new Error('Mission not found');
      }

      if (!mission.isActive) {
        throw new Error('Mission is not active');
      }

      if (mission.expiresAt && mission.expiresAt < BigInt(Date.now())) {
        throw new Error('Mission has expired');
      }

      // Verificar se já completou
      const existing = await prisma.chatMissionCompletion.findUnique({
        where: {
          profileId_missionId: {
            profileId: data.profileId,
            missionId: data.missionId,
          },
        },
      });

      if (existing) {
        return { completed: false };
      }

      // Validar progresso (se fornecido)
      if (data.progress !== undefined && data.progress < mission.goal) {
        // Atualizar progresso mas não completar ainda
        await prisma.chatMissionCompletion.upsert({
          where: {
            profileId_missionId: {
              profileId: data.profileId,
              missionId: data.missionId,
            },
          },
          create: {
            profileId: data.profileId,
            missionId: data.missionId,
            progress: data.progress,
            completedAt: null,
          },
          update: {
            progress: data.progress,
          },
        });

        return { completed: false };
      }

      // Completar missão
      await prisma.chatMissionCompletion.upsert({
        where: {
          profileId_missionId: {
            profileId: data.profileId,
            missionId: data.missionId,
          },
        },
        create: {
          profileId: data.profileId,
          missionId: data.missionId,
          progress: mission.goal,
          completedAt: BigInt(Date.now()),
        },
        update: {
          progress: mission.goal,
          completedAt: BigInt(Date.now()),
        },
      });

      // Conceder recompensa
      const txHash = await this.grantCashback({
        profileId: data.profileId,
        amount: mission.reward,
        reason: `Mission completed: ${mission.title}`,
        sourceType: 'mission',
        sourceId: data.missionId,
      });

      console.log('[MOCK] Mission completed:', {
        profileId: data.profileId,
        missionId: data.missionId,
        reward: mission.reward,
        txHash,
      });

      return { completed: true, txHash };
    } catch (error) {
      console.error('Failed to complete mission:', error);
      throw error;
    }
  }

  /**
   * Busca missões ativas
   */
  async getActiveMissions(): Promise<any[]> {
    try {
      const missions = await prisma.chatMission.findMany({
        where: {
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: BigInt(Date.now()) } },
          ],
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return missions;
    } catch (error) {
      console.error('Failed to fetch active missions:', error);
      throw error;
    }
  }

  /**
   * Busca progresso de missões de um usuário
   */
  async getMissionProgress(profileId: string): Promise<any[]> {
    try {
      const completions = await prisma.chatMissionCompletion.findMany({
        where: { profileId },
        include: {
          mission: true,
        },
      });

      return completions;
    } catch (error) {
      console.error('Failed to fetch mission progress:', error);
      throw error;
    }
  }

  /**
   * Busca saldo de cashback
   */
  async getCashbackBalance(profileId: string): Promise<string> {
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: profileId },
        select: { cashbackBalance: true },
      });

      return profile?.cashbackBalance || '0';
    } catch (error) {
      console.error('Failed to fetch cashback balance:', error);
      return '0';
    }
  }

  /**
   * Gera hash de transação mock
   */
  private generateMockTxHash(): string {
    return '0x' + crypto.randomBytes(32).toString('hex');
  }
}

export const rewardsService = new RewardsService();
