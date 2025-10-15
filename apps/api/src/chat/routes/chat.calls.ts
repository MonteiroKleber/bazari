import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { isPeerOnline } from '../ws/rtc.js';
import { prisma } from '../../lib/prisma.js';

/**
 * Rotas para gerenciamento de chamadas WebRTC
 */

const startCallSchema = z.object({
  threadId: z.string(),
  calleeId: z.string(),
  type: z.enum(['audio', 'video']),
});

export default async function chatCallsRoutes(app: FastifyInstance) {
  /**
   * POST /chat/calls
   * Inicia uma nova chamada
   */
  app.post('/chat/calls', async (request, reply) => {
    try {
      const user = (request as any).user;

      if (!user || !user.profileId) {
        return reply.code(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      const body = startCallSchema.parse(request.body);

      // Verificar se o destinatário está online
      if (!isPeerOnline(body.calleeId)) {
        return reply.code(400).send({
          success: false,
          error: 'Callee is offline',
        });
      }

      // Criar registro de chamada
      const call = {
        id: `call_${Date.now()}`,
        threadId: body.threadId,
        callerId: user.profileId,
        calleeId: body.calleeId,
        type: body.type,
        status: 'ringing',
        startedAt: Date.now(),
      };

      // TODO: Salvar em banco (criar tabela ChatCall se necessário)
      // Por enquanto, apenas retornar o objeto

      return {
        success: true,
        data: call,
      };
    } catch (error) {
      request.log.error({ error }, 'Failed to start call');

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid request',
          details: error.errors,
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Failed to start call',
      });
    }
  });

  /**
   * GET /chat/calls/:id
   * Busca status de uma chamada
   */
  app.get('/chat/calls/:id', async (request, reply) => {
    try {
      const user = (request as any).user;

      if (!user || !user.profileId) {
        return reply.code(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      const { id } = request.params as { id: string };

      // TODO: Buscar do banco
      // Por enquanto, retornar mock

      return {
        success: true,
        data: {
          id,
          status: 'active',
        },
      };
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch call');

      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch call',
      });
    }
  });

  /**
   * DELETE /chat/calls/:id
   * Encerra uma chamada
   */
  app.delete('/chat/calls/:id', async (request, reply) => {
    try {
      const user = (request as any).user;

      if (!user || !user.profileId) {
        return reply.code(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      const { id } = request.params as { id: string };

      // TODO: Atualizar status no banco
      // TODO: Notificar peers via WebSocket

      return {
        success: true,
        data: {
          message: 'Call ended',
        },
      };
    } catch (error) {
      request.log.error({ error }, 'Failed to end call');

      return reply.code(500).send({
        success: false,
        error: 'Failed to end call',
      });
    }
  });

  /**
   * GET /chat/calls
   * Lista histórico de chamadas
   */
  app.get('/chat/calls', async (request, reply) => {
    try {
      const user = (request as any).user;

      if (!user || !user.profileId) {
        return reply.code(401).send({
          success: false,
          error: 'Unauthorized',
        });
      }

      const { threadId, limit = 20 } = request.query as any;

      // TODO: Buscar histórico do banco
      // Por enquanto, retornar vazio

      return {
        success: true,
        data: {
          calls: [],
        },
      };
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch calls');

      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch calls',
      });
    }
  });
}
