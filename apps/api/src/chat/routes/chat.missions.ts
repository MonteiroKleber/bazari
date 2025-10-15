import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { rewardsService } from '../services/rewards.js';

/**
 * Rotas de Missões e Recompensas
 * VERSÃO MOCK - Simula recompensas on-chain
 */

const createMissionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  kind: z.enum(['onboarding', 'referral', 'sales', 'engagement']),
  goal: z.number().min(1).max(10000),
  reward: z.string().regex(/^\d+(\.\d+)?$/), // BZR amount
  expiresAt: z.number().optional(),
});

const completeMissionSchema = z.object({
  progress: z.number().min(0).optional(),
});

export default async function chatMissionsRoutes(app: FastifyInstance) {
  /**
   * GET /chat/missions
   * Lista missões ativas
   */
  app.get('/chat/missions', async (request, reply) => {
    try {
      const missions = await rewardsService.getActiveMissions();

      // Se usuário autenticado, buscar progresso
      const user = (request as any).user;
      let progressMap: Record<string, any> = {};

      if (user?.profileId) {
        const progress = await rewardsService.getMissionProgress(user.profileId);
        progressMap = progress.reduce((acc, p) => {
          acc[p.missionId] = p;
          return acc;
        }, {} as Record<string, any>);
      }

      // Enriquecer missões com progresso
      const enrichedMissions = missions.map(mission => ({
        ...mission,
        progress: progressMap[mission.id]?.progress || 0,
        completed: progressMap[mission.id]?.completedAt ? true : false,
      }));

      return {
        success: true,
        data: {
          missions: enrichedMissions,
        },
      };
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch missions');

      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch missions',
      });
    }
  });

  /**
   * POST /chat/missions
   * Cria uma nova missão (admin only)
   */
  app.post('/chat/missions', async (request, reply) => {
    try {
      const user = (request as any).user;

      if (!user) {
        return reply.code(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      // TODO: Verificar se usuário é admin

      const body = createMissionSchema.parse(request.body);

      const mission = await rewardsService.createMission(body);

      return {
        success: true,
        data: mission,
      };
    } catch (error) {
      request.log.error({ error }, 'Failed to create mission');

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid request',
          details: error.errors,
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Failed to create mission',
      });
    }
  });

  /**
   * POST /chat/missions/:id/complete
   * Completa uma missão
   */
  app.post('/chat/missions/:id/complete', async (request, reply) => {
    try {
      const user = (request as any).user;

      if (!user || !user.profileId) {
        return reply.code(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      const { id: missionId } = request.params as { id: string };
      const body = completeMissionSchema.parse(request.body);

      const result = await rewardsService.completeMission({
        profileId: user.profileId,
        missionId,
        progress: body.progress,
      });

      if (!result.completed) {
        return {
          success: true,
          data: {
            completed: false,
            message: 'Progress updated, mission not yet complete',
          },
        };
      }

      return {
        success: true,
        data: {
          completed: true,
          txHash: result.txHash,
          message: 'Mission completed! Reward credited.',
        },
      };
    } catch (error: any) {
      request.log.error({ error }, 'Failed to complete mission');

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid request',
          details: error.errors,
        });
      }

      return reply.code(400).send({
        success: false,
        error: error.message || 'Failed to complete mission',
      });
    }
  });

  /**
   * GET /chat/missions/progress
   * Busca progresso do usuário em missões
   */
  app.get('/chat/missions/progress', async (request, reply) => {
    try {
      const user = (request as any).user;

      if (!user || !user.profileId) {
        return reply.code(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      const progress = await rewardsService.getMissionProgress(user.profileId);

      return {
        success: true,
        data: {
          progress,
        },
      };
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch mission progress');

      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch mission progress',
      });
    }
  });

  /**
   * GET /chat/cashback/balance
   * Busca saldo de cashback
   */
  app.get('/chat/cashback/balance', async (request, reply) => {
    try {
      const user = (request as any).user;

      if (!user || !user.profileId) {
        return reply.code(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      const balance = await rewardsService.getCashbackBalance(user.profileId);

      return {
        success: true,
        data: {
          balance,
          profileId: user.profileId,
        },
      };
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch cashback balance');

      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch cashback balance',
      });
    }
  });

  /**
   * POST /chat/cashback/redeem
   * Resgata cashback
   */
  app.post('/chat/cashback/redeem', async (request, reply) => {
    try {
      const user = (request as any).user;

      if (!user || !user.profileId) {
        return reply.code(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      const { amount } = z.object({
        amount: z.string().regex(/^\d+(\.\d+)?$/),
      }).parse(request.body);

      const txHash = await rewardsService.redeemCashback({
        profileId: user.profileId,
        amount,
      });

      return {
        success: true,
        data: {
          txHash,
          message: 'Cashback redeemed successfully (MOCK)',
        },
      };
    } catch (error: any) {
      request.log.error({ error }, 'Failed to redeem cashback');

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid request',
          details: error.errors,
        });
      }

      return reply.code(400).send({
        success: false,
        error: error.message || 'Failed to redeem cashback',
      });
    }
  });
}
