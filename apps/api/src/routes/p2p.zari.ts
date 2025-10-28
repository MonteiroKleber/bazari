import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { PhaseControlService } from '../services/p2p/phase-control.service.js';
import { authOnRequest } from '../lib/auth/middleware.js';

/**
 * FASE 5: P2P ZARI Routes
 * Rotas para gerenciamento de fases e estatísticas de venda ZARI
 */
export async function p2pZariRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;
  const phaseControl = new PhaseControlService(prisma);

  /**
   * GET /p2p/zari/phase
   * Retorna informações da fase ZARI ativa (público)
   */
  app.get('/p2p/zari/phase', async (request, reply) => {
    try {
      const phase = await phaseControl.getActivePhase();

      if (!phase) {
        return reply.code(404).send({
          error: 'NoActivePhase',
          message: 'No active ZARI phase found',
        });
      }

      return reply.send({
        phase: phase.phase,
        priceBZR: phase.priceBZR.toString(),
        supplyLimit: phase.supplyLimit.toString(),
        supplySold: phase.supplySold.toString(),
        supplyRemaining: phase.supplyRemaining.toString(),
        progressPercent: phase.progressPercent,
        isActive: phase.isActive,
        nextPhase: phase.nextPhase,
      });
    } catch (error: any) {
      console.error('[P2P ZARI] Error getting active phase:', error);
      return reply.code(500).send({
        error: 'InternalServerError',
        message: 'Failed to get active phase',
      });
    }
  });

  /**
   * GET /p2p/zari/stats
   * Retorna estatísticas gerais de vendas ZARI (público)
   */
  app.get('/p2p/zari/stats', async (request, reply) => {
    try {
      // Get all phases
      const phases = await prisma.zARIPhaseConfig.findMany({
        orderBy: { phase: 'asc' },
      });

      // Get active phase info
      const activePhase = await phaseControl.getActivePhase();

      // Calculate total sold across all phases
      const totalSold = activePhase ? activePhase.supplySold : 0n;

      // Total P2P supply: 6.3M ZARI (3 phases × 2.1M)
      const totalP2PSupply = BigInt(6_300_000) * BigInt(10 ** 12);

      // Calculate overall progress
      const overallProgress = totalSold > 0n
        ? Number((totalSold * BigInt(100)) / totalP2PSupply)
        : 0;

      // Get completed orders count (RELEASED = successfully completed)
      const completedOrders = await prisma.p2POrder.count({
        where: {
          assetType: 'ZARI',
          status: 'RELEASED',
        },
      });

      return reply.send({
        phases: phases.map(p => ({
          phase: p.phase,
          priceBZR: p.priceBZR.toString(),
          supplyLimit: p.supplyLimit.toString(),
          active: p.active,
          startBlock: p.startBlock?.toString() || null,
          endBlock: p.endBlock?.toString() || null,
        })),
        activePhase: activePhase ? activePhase.phase : null,
        totalSold: totalSold.toString(),
        totalP2PSupply: totalP2PSupply.toString(),
        overallProgress,
        completedOrders,
      });
    } catch (error: any) {
      console.error('[P2P ZARI] Error getting stats:', error);
      return reply.code(500).send({
        error: 'InternalServerError',
        message: 'Failed to get ZARI stats',
      });
    }
  });

  /**
   * POST /p2p/zari/phase/transition
   * Transiciona para próxima fase ZARI (requer autenticação + admin)
   */
  app.post(
    '/p2p/zari/phase/transition',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      try {
        // TODO: Add admin check
        // For now, any authenticated user can trigger (will add admin check in future)

        await phaseControl.transitionToNextPhase();

        const newPhase = await phaseControl.getActivePhase();

        return reply.send({
          message: 'Phase transition successful',
          newPhase: newPhase ? {
            phase: newPhase.phase,
            priceBZR: newPhase.priceBZR.toString(),
            supplyLimit: newPhase.supplyLimit.toString(),
          } : null,
        });
      } catch (error: any) {
        console.error('[P2P ZARI] Error transitioning phase:', error);
        return reply.code(400).send({
          error: 'TransitionFailed',
          message: error.message || 'Failed to transition phase',
        });
      }
    }
  );

  // Cleanup on app close
  app.addHook('onClose', async () => {
    await phaseControl.disconnect();
  });
}
