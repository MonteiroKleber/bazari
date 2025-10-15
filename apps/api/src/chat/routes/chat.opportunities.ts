import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';

/**
 * Rotas de Oportunidades (Jobs/Freelance/Parcerias)
 */

const createOpportunitySchema = z.object({
  storeId: z.number(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  type: z.enum(['job', 'freelance', 'partnership']),
  compensation: z.string().optional(),
  requirements: z.record(z.any()).optional(),
  expiresAt: z.number().optional(),
});

const applySchema = z.object({
  message: z.string().max(2000).optional(),
  portfolio: z.string().url().optional(),
});

export default async function chatOpportunitiesRoutes(app: FastifyInstance) {
  /**
   * GET /chat/opportunities
   * Lista oportunidades disponíveis
   */
  app.get('/chat/opportunities', async (request, reply) => {
    try {
      const { type, storeId, status = 'open', cursor, limit = 20 } = request.query as any;

      const where: any = {
        status: status || 'open',
      };

      if (type) {
        where.type = type;
      }

      if (storeId) {
        where.storeId = BigInt(storeId);
      }

      // Filtrar expiradas
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: BigInt(Date.now()) } },
      ];

      const opportunities = await prisma.chatOpportunity.findMany({
        where,
        take: parseInt(limit),
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        success: true,
        data: {
          opportunities,
          hasMore: opportunities.length === parseInt(limit),
        },
      };
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch opportunities');

      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch opportunities',
      });
    }
  });

  /**
   * POST /chat/opportunities
   * Cria uma nova oportunidade
   */
  app.post('/chat/opportunities', async (request, reply) => {
    try {
      const user = (request as any).user;

      if (!user) {
        return reply.code(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      const body = createOpportunitySchema.parse(request.body);

      // TODO: Verificar se usuário é dono da loja

      const opportunity = await prisma.chatOpportunity.create({
        data: {
          id: `opp_${Date.now()}`,
          storeId: BigInt(body.storeId),
          title: body.title,
          description: body.description,
          type: body.type,
          compensation: body.compensation,
          requirements: body.requirements || {},
          expiresAt: body.expiresAt ? BigInt(body.expiresAt) : null,
          createdAt: BigInt(Date.now()),
        },
      });

      return {
        success: true,
        data: opportunity,
      };
    } catch (error) {
      request.log.error({ error }, 'Failed to create opportunity');

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid request',
          details: error.errors,
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Failed to create opportunity',
      });
    }
  });

  /**
   * GET /chat/opportunities/:id
   * Busca detalhes de uma oportunidade
   */
  app.get('/chat/opportunities/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const opportunity = await prisma.chatOpportunity.findUnique({
        where: { id },
      });

      if (!opportunity) {
        return reply.code(404).send({
          success: false,
          error: 'Opportunity not found',
        });
      }

      return {
        success: true,
        data: opportunity,
      };
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch opportunity');

      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch opportunity',
      });
    }
  });

  /**
   * POST /chat/opportunities/:id/apply
   * Candidata-se a uma oportunidade
   */
  app.post('/chat/opportunities/:id/apply', async (request, reply) => {
    try {
      const user = (request as any).user;

      if (!user || !user.profileId) {
        return reply.code(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      const { id } = request.params as { id: string };
      const body = applySchema.parse(request.body);

      // Buscar oportunidade
      const opportunity = await prisma.chatOpportunity.findUnique({
        where: { id },
      });

      if (!opportunity) {
        return reply.code(404).send({
          success: false,
          error: 'Opportunity not found',
        });
      }

      if (opportunity.status !== 'open') {
        return reply.code(400).send({
          success: false,
          error: 'Opportunity is not open',
        });
      }

      // TODO: Criar registro de candidatura (nova tabela?)
      // TODO: Notificar dono da loja

      console.log('[MOCK] Application submitted:', {
        opportunityId: id,
        profileId: user.profileId,
        message: body.message,
        portfolio: body.portfolio,
      });

      return {
        success: true,
        data: {
          message: 'Application submitted successfully',
        },
      };
    } catch (error) {
      request.log.error({ error }, 'Failed to apply to opportunity');

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid request',
          details: error.errors,
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Failed to apply to opportunity',
      });
    }
  });

  /**
   * PUT /chat/opportunities/:id
   * Atualiza uma oportunidade
   */
  app.put('/chat/opportunities/:id', async (request, reply) => {
    try {
      const user = (request as any).user;

      if (!user) {
        return reply.code(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      const { id } = request.params as { id: string };
      const { status } = z.object({
        status: z.enum(['open', 'filled', 'closed']),
      }).parse(request.body);

      // TODO: Verificar se usuário é dono da loja

      const opportunity = await prisma.chatOpportunity.update({
        where: { id },
        data: { status },
      });

      return {
        success: true,
        data: opportunity,
      };
    } catch (error) {
      request.log.error({ error }, 'Failed to update opportunity');

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid request',
          details: error.errors,
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Failed to update opportunity',
      });
    }
  });
}
