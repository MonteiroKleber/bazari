import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authOnRequest } from '../../lib/auth/middleware.js';
import { GamificationService } from '../../services/gamification/gamification.service.js';

export async function rewardsRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;
  const gamification = new GamificationService(prisma);

  /**
   * GET /api/blockchain/rewards/missions
   * Buscar todas as missões ativas com progresso do usuário
   */
  app.get('/missions', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Unauthorized' });

    try {
      const missions = await gamification.getUserMissions(authUser.sub);
      return reply.send(missions);
    } catch (error) {
      console.error('[Rewards API] Failed to get missions:', error);
      return reply.status(500).send({ error: 'Failed to fetch missions' });
    }
  });

  /**
   * GET /api/blockchain/rewards/missions/:id
   * Buscar detalhes de uma missão específica
   */
  app.get('/missions/:id', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Unauthorized' });

    const { id } = request.params as { id: string };
    const missionId = parseInt(id, 10);

    if (isNaN(missionId)) {
      return reply.status(400).send({ error: 'Invalid mission ID' });
    }

    try {
      const missions = await gamification.getUserMissions(authUser.sub);
      const mission = missions.find((m) => m.id === missionId);

      if (!mission) {
        return reply.status(404).send({ error: 'Mission not found' });
      }

      return reply.send({ mission });
    } catch (error) {
      console.error('[Rewards API] Failed to get mission:', error);
      return reply.status(500).send({ error: 'Failed to fetch mission' });
    }
  });

  /**
   * POST /api/blockchain/rewards/missions/claim
   * NOTA: Claim deve ser feito via frontend (user assina transação)
   * Esta rota apenas verifica se pode claim
   */
  app.post('/missions/claim', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Unauthorized' });

    const { missionId } = request.body as { missionId: number };

    if (!missionId) {
      return reply.status(400).send({ error: 'missionId is required' });
    }

    try {
      // Verificar se missão está completa e não claimed
      const missions = await gamification.getUserMissions(authUser.sub);
      const mission = missions.find((m) => m.id === missionId);

      if (!mission) {
        return reply.status(404).send({ error: 'Mission not found' });
      }

      if (!mission.completed) {
        return reply.status(400).send({ error: 'Mission not completed' });
      }

      if (mission.claimed) {
        return reply.status(400).send({ error: 'Reward already claimed' });
      }

      // Claim deve ser feito via frontend com wallet do user
      return reply.send({
        canClaim: true,
        message: 'Please claim reward using your wallet in the frontend',
        mission: {
          id: mission.id,
          name: mission.name,
          rewardAmount: mission.rewardAmount,
        },
      });
    } catch (error) {
      console.error('[Rewards API] Failed to check claim:', error);
      return reply.status(500).send({ error: 'Failed to check claim status' });
    }
  });

  /**
   * GET /api/blockchain/rewards/streaks
   * Buscar dados de streak do usuário
   */
  app.get('/streaks', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Unauthorized' });

    try {
      const streakData = await gamification.getStreakData(authUser.sub);
      return reply.send(streakData);
    } catch (error) {
      console.error('[Rewards API] Failed to get streak:', error);
      return reply.status(500).send({ error: 'Failed to fetch streak data' });
    }
  });

  /**
   * GET /api/blockchain/rewards/zari/balance
   * Buscar saldo ZARI do usuário
   */
  app.get('/zari/balance', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Unauthorized' });

    try {
      const balanceData = await gamification.getZariBalance(authUser.sub);
      return reply.send(balanceData);
    } catch (error) {
      console.error('[Rewards API] Failed to get ZARI balance:', error);
      return reply.status(500).send({ error: 'Failed to fetch ZARI balance' });
    }
  });

  /**
   * POST /api/blockchain/rewards/zari/convert
   * Converter ZARI → BZR
   * TODO: Implementar quando pallet suportar conversão
   */
  app.post('/zari/convert', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Unauthorized' });

    const { amount } = request.body as { amount: number };

    if (!amount || amount <= 0) {
      return reply.status(400).send({ error: 'Invalid amount' });
    }

    return reply.status(501).send({
      error: 'ZARI conversion not yet implemented in pallet',
      message: 'This feature will be available in a future update',
    });
  });

  /**
   * GET /api/blockchain/rewards/history
   * Buscar histórico de recompensas
   * TODO: Implementar sincronização de eventos para PostgreSQL
   */
  app.get('/history', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Unauthorized' });

    // Por enquanto, retornar vazio
    // Quando worker sync estiver pronto, buscar de: prisma.cashbackGrant.findMany()
    return reply.send({ history: [] });
  });

  /**
   * GET /api/blockchain/rewards/missions/:id/progress
   * Buscar progresso detalhado de uma missão específica
   */
  app.get('/missions/:id/progress', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Unauthorized' });

    const { id } = request.params as { id: string };
    const missionId = parseInt(id, 10);

    if (isNaN(missionId)) {
      return reply.status(400).send({ error: 'Invalid mission ID' });
    }

    try {
      const missions = await gamification.getUserMissions(authUser.sub);
      const mission = missions.find((m) => m.id === missionId);

      if (!mission) {
        return reply.status(404).send({ error: 'Mission not found' });
      }

      // Retornar progresso detalhado
      return reply.send({
        missionId: mission.id,
        progress: mission.progress,
        targetValue: mission.targetValue,
        completed: mission.completed,
        claimed: mission.claimed,
        completedAt: mission.completedAt,
        percentage: mission.targetValue > 0
          ? Math.min(100, Math.round((mission.progress / mission.targetValue) * 100))
          : 0,
      });
    } catch (error) {
      console.error('[Rewards API] Failed to get mission progress:', error);
      return reply.status(500).send({ error: 'Failed to fetch mission progress' });
    }
  });

  /**
   * POST /api/blockchain/rewards/missions/:id/progress
   * Atualizar progresso de uma missão manualmente (admin/testing only)
   */
  app.post('/missions/:id/progress', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Unauthorized' });

    const { id } = request.params as { id: string };
    const missionId = parseInt(id, 10);
    const { progressAmount } = request.body as { progressAmount: number };

    if (isNaN(missionId)) {
      return reply.status(400).send({ error: 'Invalid mission ID' });
    }

    if (!progressAmount || progressAmount <= 0) {
      return reply.status(400).send({ error: 'Invalid progress amount' });
    }

    try {
      // Buscar missão para validar tipo
      const missions = await gamification.getUserMissions(authUser.sub);
      const mission = missions.find((m) => m.id === missionId);

      if (!mission) {
        return reply.status(404).send({ error: 'Mission not found' });
      }

      // Progredir missão
      const result = await gamification.progressMission(
        authUser.sub,
        mission.type,
        progressAmount
      );

      if (!result) {
        return reply.status(400).send({ error: 'Failed to progress mission' });
      }

      return reply.send({
        success: true,
        txHash: result.txHash,
        newProgress: mission.progress + progressAmount,
      });
    } catch (error) {
      console.error('[Rewards API] Failed to update mission progress:', error);
      return reply.status(500).send({ error: 'Failed to update mission progress' });
    }
  });

  /**
   * GET /api/blockchain/rewards/streaks/history
   * Buscar histórico de streaks (últimos 30 dias)
   */
  app.get('/streaks/history', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Unauthorized' });

    try {
      const streakData = await gamification.getStreakData(authUser.sub);

      // Gerar histórico dos últimos 30 dias
      // TODO: Quando pallet suportar streaks, buscar dados reais
      const today = new Date();
      const history = [];

      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        history.push({
          date: date.toISOString().split('T')[0],
          active: i < streakData.currentStreak, // Mock: considera dias do streak atual
          isToday: i === 0,
        });
      }

      return reply.send(history);
    } catch (error) {
      console.error('[Rewards API] Failed to get streak history:', error);
      return reply.status(500).send({ error: 'Failed to fetch streak history' });
    }
  });

  /**
   * GET /api/blockchain/rewards/cashback/history
   * Buscar histórico de cashback recebido
   */
  app.get('/cashback/history', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Unauthorized' });

    try {
      // Buscar histórico de cashback do PostgreSQL
      const cashbackGrants = await prisma.cashbackGrant.findMany({
        where: { userId: authUser.sub },
        orderBy: { grantedAt: 'desc' },
        take: 50, // Últimos 50 registros
      });

      // Formatar dados para frontend
      const history = cashbackGrants.map((grant) => {
        const orderAmountBigInt = BigInt(grant.orderAmount);
        const cashbackAmountBigInt = BigInt(grant.cashbackAmount);

        return {
          id: grant.id,
          orderId: grant.orderId,
          orderAmount: (Number(orderAmountBigInt) / 1e12).toFixed(2), // BZR com 12 decimals
          cashbackAmount: (Number(cashbackAmountBigInt) / 1e12).toFixed(2), // ZARI com 12 decimals
          grantedAt: grant.grantedAt.toISOString(),
          percentage: grant.orderId ? '3%' : 'N/A', // 3% fixo do pallet
        };
      });

      return reply.send(history);
    } catch (error) {
      console.error('[Rewards API] Failed to get cashback history:', error);
      return reply.status(500).send({ error: 'Failed to fetch cashback history' });
    }
  });

  /**
   * GET /api/blockchain/rewards/leaderboard
   * Buscar ranking de usuários por missões completadas
   */
  app.get('/leaderboard', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Unauthorized' });

    try {
      // Buscar top usuários por missões completadas
      const topUsers = await prisma.userMissionProgress.groupBy({
        by: ['userId'],
        where: {
          isCompleted: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 100,
      });

      // Enriquecer com dados de perfil
      const leaderboard = await Promise.all(
        topUsers.map(async (entry, index) => {
          const profile = await prisma.profile.findUnique({
            where: { userId: entry.userId },
            select: {
              id: true,
              displayName: true,
              handle: true,
              avatarUrl: true,
            },
          });

          return {
            rank: index + 1,
            userId: entry.userId,
            displayName: profile?.displayName || 'Unknown',
            handle: profile?.handle || 'unknown',
            avatarUrl: profile?.avatarUrl || null,
            missionsCompleted: entry._count.id,
            isCurrentUser: entry.userId === authUser.sub,
          };
        })
      );

      return reply.send({ leaderboard });
    } catch (error) {
      console.error('[Rewards API] Failed to get leaderboard:', error);
      return reply.status(500).send({ error: 'Failed to fetch leaderboard' });
    }
  });

  /**
   * GET /api/blockchain/rewards/summary
   * Buscar resumo consolidado de rewards do usuário
   */
  app.get('/summary', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Unauthorized' });

    try {
      // Buscar dados de várias fontes
      const [missions, balance, streakData, cashbackCount, missionProgress] = await Promise.all([
        gamification.getUserMissions(authUser.sub),
        gamification.getZariBalance(authUser.sub),
        gamification.getStreakData(authUser.sub),
        prisma.cashbackGrant.count({
          where: { userId: authUser.sub },
        }),
        prisma.userMissionProgress.findMany({
          where: { userId: authUser.sub },
        }),
      ]);

      // Calcular estatísticas
      const completedMissions = missionProgress.filter((m) => m.isCompleted).length;
      const claimedRewards = missionProgress.filter((m) => m.isClaimed).length;
      const activeMissions = missions.filter((m) => !m.completed).length;
      const availableToClaim = missions.filter((m) => m.completed && !m.claimed).length;

      // Calcular total de ZARI ganho via cashback
      const cashbackGrants = await prisma.cashbackGrant.findMany({
        where: { userId: authUser.sub },
      });

      const totalCashbackZari = cashbackGrants.reduce((sum, grant) => {
        return sum + Number(BigInt(grant.cashbackAmount));
      }, 0);

      return reply.send({
        zariBalance: {
          current: balance.formatted,
          raw: balance.balance,
        },
        missions: {
          active: activeMissions,
          completed: completedMissions,
          claimed: claimedRewards,
          availableToClaim,
          total: missions.length,
        },
        cashback: {
          totalReceived: (totalCashbackZari / 1e12).toFixed(2),
          transactionCount: cashbackCount,
        },
        streak: {
          current: streakData.currentStreak,
          longest: streakData.longestStreak,
          lastLogin: streakData.lastLoginDate,
        },
        stats: {
          totalRewardsEarned: ((totalCashbackZari / 1e12) + (claimedRewards * 1)).toFixed(2), // Aproximação
          rank: null, // TODO: calcular rank baseado em leaderboard
        },
      });
    } catch (error) {
      console.error('[Rewards API] Failed to get summary:', error);
      return reply.status(500).send({ error: 'Failed to fetch rewards summary' });
    }
  });

  // ==================== ADMIN ROUTES ====================

  /**
   * POST /api/admin/missions
   * Criar nova missão (DAO only)
   */
  app.post('/admin/missions', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Unauthorized' });

    // TODO: Verificar se user é admin/DAO
    // Por enquanto, permitir todos (remover em produção)

    const { title, description, missionType, rewardAmount, requiredCount } = request.body as {
      title: string;
      description: string;
      missionType: string;
      rewardAmount: string;
      requiredCount: number;
    };

    if (!title || !description || !missionType || !rewardAmount || !requiredCount) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }

    try {
      const result = await gamification.createMission({
        title,
        description,
        missionType,
        rewardAmount,
        requiredCount,
      });

      return reply.send({
        success: true,
        missionId: result.missionId,
        txHash: result.txHash,
      });
    } catch (error) {
      console.error('[Rewards API] Failed to create mission:', error);
      return reply.status(500).send({ error: 'Failed to create mission' });
    }
  });
}

export default rewardsRoutes;
