import { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';

/**
 * Rotas de Rankings (Promotores, Afiliados, etc.)
 */

export default async function chatRankingRoutes(app: FastifyInstance) {
  /**
   * GET /chat/ranking/promoters
   * Ranking de top promotores
   */
  app.get('/chat/ranking/promoters', async (request, reply) => {
    try {
      const { period = '30d', limit = 10 } = request.query as any;

      // Calcular timestamp do início do período
      const now = Date.now();
      const periodMs: Record<string, number> = {
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        '90d': 90 * 24 * 60 * 60 * 1000,
        'all': 0,
      };

      const startTime = period === 'all' ? 0 : now - (periodMs[period] || periodMs['30d']);

      // Buscar vendas com promotores
      const sales = await prisma.chatSale.groupBy({
        by: ['promoter'],
        where: {
          promoter: {
            not: null,
          },
          createdAt: {
            gte: BigInt(startTime),
          },
          status: 'split', // Apenas vendas confirmadas
        },
        _sum: {
          commissionAmount: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _sum: {
            commissionAmount: 'desc',
          },
        },
        take: parseInt(limit),
      });

      // Enriquecer com dados do perfil
      const enrichedRanking = await Promise.all(
        sales.map(async (sale, index) => {
          if (!sale.promoter) return null;

          const profile = await prisma.profile.findUnique({
            where: { id: sale.promoter },
            select: {
              id: true,
              handle: true,
              displayName: true,
              avatarUrl: true,
              reputationScore: true,
              reputationTier: true,
            },
          });

          if (!profile) return null;

          return {
            rank: index + 1,
            profile,
            stats: {
              totalCommission: sale._sum.commissionAmount?.toString() || '0',
              salesCount: sale._count.id,
            },
          };
        })
      );

      return {
        success: true,
        data: {
          ranking: enrichedRanking.filter(Boolean),
          period,
        },
      };
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch promoters ranking');

      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch promoters ranking',
      });
    }
  });

  /**
   * GET /chat/ranking/stores
   * Ranking de top lojas por vendas
   */
  app.get('/chat/ranking/stores', async (request, reply) => {
    try {
      const { period = '30d', limit = 10 } = request.query as any;

      const now = Date.now();
      const periodMs: Record<string, number> = {
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        '90d': 90 * 24 * 60 * 60 * 1000,
        'all': 0,
      };

      const startTime = period === 'all' ? 0 : now - (periodMs[period] || periodMs['30d']);

      // Buscar vendas agrupadas por loja
      const sales = await prisma.chatSale.groupBy({
        by: ['storeId'],
        where: {
          createdAt: {
            gte: BigInt(startTime),
          },
          status: 'split',
        },
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _sum: {
            amount: 'desc',
          },
        },
        take: parseInt(limit),
      });

      // Enriquecer com dados da loja
      const enrichedRanking = await Promise.all(
        sales.map(async (sale, index) => {
          const store = await prisma.sellerProfile.findFirst({
            where: {
              onChainStoreId: sale.storeId,
            },
            select: {
              id: true,
              shopName: true,
              shopSlug: true,
              avatarUrl: true,
              ratingAvg: true,
            },
          });

          if (!store) return null;

          return {
            rank: index + 1,
            store,
            stats: {
              totalSales: sale._sum.amount?.toString() || '0',
              ordersCount: sale._count.id,
            },
          };
        })
      );

      return {
        success: true,
        data: {
          ranking: enrichedRanking.filter(Boolean),
          period,
        },
      };
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch stores ranking');

      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch stores ranking',
      });
    }
  });

  /**
   * GET /chat/ranking/my-position
   * Posição do usuário no ranking de promotores
   */
  app.get('/chat/ranking/my-position', async (request, reply) => {
    try {
      const user = (request as any).user;

      if (!user || !user.profileId) {
        return reply.code(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      const { period = '30d' } = request.query as any;

      const now = Date.now();
      const periodMs: Record<string, number> = {
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        '90d': 90 * 24 * 60 * 60 * 1000,
        'all': 0,
      };

      const startTime = period === 'all' ? 0 : now - (periodMs[period] || periodMs['30d']);

      // Buscar estatísticas do usuário
      const myStats = await prisma.chatSale.aggregate({
        where: {
          promoter: user.profileId,
          createdAt: {
            gte: BigInt(startTime),
          },
          status: 'split',
        },
        _sum: {
          commissionAmount: true,
        },
        _count: {
          id: true,
        },
      });

      // Calcular posição (quantos promotores tem comissão maior)
      const betterPromoters = await prisma.chatSale.groupBy({
        by: ['promoter'],
        where: {
          promoter: {
            not: null,
          },
          createdAt: {
            gte: BigInt(startTime),
          },
          status: 'split',
        },
        _sum: {
          commissionAmount: true,
        },
        having: {
          commissionAmount: {
            _sum: {
              gt: myStats._sum.commissionAmount || 0,
            },
          },
        },
      });

      const position = betterPromoters.length + 1;

      return {
        success: true,
        data: {
          position,
          stats: {
            totalCommission: myStats._sum.commissionAmount?.toString() || '0',
            salesCount: myStats._count.id,
          },
          period,
        },
      };
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch my position');

      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch my position',
      });
    }
  });
}
