// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import { BlockchainService } from '../blockchain/blockchain.service.js';

/**
 * GamificationService - Gerencia rewards, missões e cashback
 * Integra PostgreSQL com blockchain (pallet bazari-rewards)
 */
export class GamificationService {
  private blockchain: BlockchainService;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.blockchain = BlockchainService.getInstance();
  }

  /**
   * Conceder cashback como ZARI tokens
   * @param userId - ID do usuário no PostgreSQL (User.id, não Profile.id)
   * @param amount - Valor em BZR (será convertido para ZARI)
   * @param reason - Motivo do cashback
   * @param orderId - ID da order (opcional)
   */
  async grantCashback(
    userId: string,
    amount: number,
    reason: string,
    orderId?: string
  ): Promise<{ txHash: string; zariAmount: string }> {
    try {
      // Buscar wallet address do user via Profile
      const profile = await this.prisma.profile.findUnique({
        where: { userId: userId },
        select: {
          user: {
            select: { address: true }
          }
        },
      });

      if (!profile?.user?.address) {
        throw new Error(`User ${userId} does not have a wallet address`);
      }

      // Converter amount para smallest unit (12 decimals para ZARI)
      const orderAmountSmallestUnit = (BigInt(Math.floor(amount * 1e12))).toString();

      // Mintar cashback on-chain (pallet calcula % automaticamente)
      const result = await this.blockchain.mintCashback(
        profile.user.address,
        orderAmountSmallestUnit
      );

      console.log(
        `[Gamification] Cashback granted: user=${userId}, order=${amount} BZR, cashback=${result.cashbackAmount} ZARI (smallest unit)`
      );

      // TODO: Sincronizar para PostgreSQL via worker (opcional)
      // await this.prisma.cashbackGrant.create({ ... })

      return {
        txHash: result.txHash,
        zariAmount: result.cashbackAmount,
      };
    } catch (error) {
      console.error('[Gamification] Failed to grant cashback:', error);
      throw error;
    }
  }

  /**
   * Progredir missão do usuário
   * @param userId - ID do usuário (User.id, não Profile.id)
   * @param missionType - Tipo de missão (FirstPurchase, CompleteNOrders, etc)
   * @param progressAmount - Quantidade a incrementar (default 1)
   */
  async progressMission(
    userId: string,
    missionType: string,
    progressAmount: number = 1
  ): Promise<{ txHash: string } | null> {
    try {
      // Buscar wallet address via Profile
      const profile = await this.prisma.profile.findUnique({
        where: { userId: userId },
        select: {
          user: {
            select: { address: true }
          }
        },
      });

      if (!profile?.user?.address) {
        console.warn(`[Gamification] User ${userId} has no wallet, skipping mission progress`);
        return null;
      }

      // Buscar missão ativa deste tipo (assumindo que há uma tabela de sync)
      // Por enquanto, vamos buscar diretamente da blockchain
      const missions = await this.blockchain.getAllMissions();
      const mission = missions.find((m: any) => m.missionType === missionType && m.isActive);

      if (!mission) {
        console.debug(`[Gamification] No active mission for type: ${missionType}`);
        return null;
      }

      // Progredir missão on-chain
      const txHash = await this.blockchain.progressMission(
        profile.user.address,
        mission.missionId,
        progressAmount
      );

      console.log(
        `[Gamification] Mission progressed: user=${userId}, mission=${mission.missionId} (${missionType}), progress=${progressAmount}`
      );

      return { txHash };
    } catch (error) {
      console.error('[Gamification] Failed to progress mission:', error);
      // Não propagar erro - missões são opcionais
      return null;
    }
  }

  /**
   * Buscar saldo ZARI do usuário
   * @param userId - ID do usuário (Profile.userId, não Profile.id)
   * @returns Saldo em ZARI (formatted)
   */
  async getZariBalance(userId: string): Promise<{ balance: string; formatted: string }> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId: userId },
      select: {
        user: {
          select: { address: true }
        }
      },
    });

    if (!profile?.user?.address) {
      return { balance: '0', formatted: '0.00' };
    }

    const balanceSmallestUnit = await this.blockchain.getZariBalance(profile.user.address);

    // Converter de smallest unit (12 decimals) para ZARI
    const balanceBigInt = BigInt(balanceSmallestUnit);
    const formatted = (Number(balanceBigInt) / 1e12).toFixed(2);

    return {
      balance: balanceSmallestUnit,
      formatted,
    };
  }

  /**
   * Buscar missões do usuário com progresso
   * @param userId - ID do usuário (User.id, não Profile.id)
   * @returns Array de missões com progresso
   */
  async getUserMissions(userId: string): Promise<any[]> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId: userId },
      select: {
        user: {
          select: { address: true }
        }
      },
    });

    if (!profile?.user?.address) {
      return [];
    }

    // Buscar todas as missões ativas
    const missions = await this.blockchain.getAllMissions();

    // Buscar progresso do user em cada missão
    const missionsWithProgress = await Promise.all(
      missions.map(async (mission: any) => {
        const progress = await this.blockchain.getUserMissionProgress(
          profile.user.address!,
          mission.missionId
        );

        return {
          id: mission.missionId,
          name: mission.title,
          description: mission.description,
          rewardAmount: mission.rewardAmount,
          type: mission.missionType,
          targetValue: mission.requiredCount,
          progress: progress?.currentCount || 0,
          completed: progress?.isCompleted || false,
          claimed: progress?.isClaimed || false,
          completedAt: progress?.completedAt || null,
        };
      })
    );

    return missionsWithProgress;
  }

  /**
   * Reivindicar recompensa de missão
   * @param userId - ID do usuário (User.id, não Profile.id)
   * @param missionId - ID da missão
   * @returns Transaction hash
   */
  async claimMissionReward(userId: string, missionId: number): Promise<{ txHash: string }> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId: userId },
      select: {
        user: {
          select: { address: true }
        }
      },
    });

    if (!profile?.user?.address) {
      throw new Error('User does not have a wallet address');
    }

    // Verificar progresso
    const progress = await this.blockchain.getUserMissionProgress(
      profile.user.address,
      missionId
    );

    if (!progress?.isCompleted) {
      throw new Error('Mission not completed');
    }

    if (progress.isClaimed) {
      throw new Error('Reward already claimed');
    }

    // Claim será feito diretamente pelo user via frontend
    // Este método é apenas helper para verificação
    throw new Error('Use frontend to claim reward (user must sign transaction)');
  }

  /**
   * Criar nova missão (DAO only)
   * @param params - Parâmetros da missão
   * @returns Mission ID e transaction hash
   */
  async createMission(params: {
    title: string;
    description: string;
    missionType: string;
    rewardAmount: string;
    requiredCount: number;
  }): Promise<{ missionId: number; txHash: string }> {
    // Converter reward para smallest unit
    const rewardSmallestUnit = (BigInt(Math.floor(parseFloat(params.rewardAmount) * 1e12))).toString();

    const result = await this.blockchain.createMission({
      ...params,
      rewardAmount: rewardSmallestUnit,
    });

    console.log(`[Gamification] Mission created: id=${result.missionId}, title=${params.title}`);

    return result;
  }

  /**
   * Buscar streak de dias consecutivos
   * TODO: Implementar quando pallet suportar streaks
   */
  async getStreakData(userId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    lastLoginDate: string | null;
  }> {
    // Por enquanto, retornar mock
    // Quando pallet implementar, buscar de: api.query.bazariRewards.userStreaks(user)
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastLoginDate: null,
    };
  }

  /**
   * Atualizar streak de login diário
   * TODO: Implementar quando pallet suportar streaks
   */
  async updateStreak(userId: string): Promise<{ txHash: string } | null> {
    // Por enquanto, retornar null
    // Quando pallet implementar: await this.blockchain.updateStreak(walletAddress)
    return null;
  }
}
