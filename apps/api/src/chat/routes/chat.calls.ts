import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { authOnRequest } from '../../lib/auth/middleware.js';
import { AccessTokenPayload } from '../../lib/auth/jwt.js';
import { getConnectionByProfileId } from '../ws/handlers.js';

/**
 * Rotas REST para gerenciamento de chamadas
 * Nota: A sinalização principal é via WebSocket (call-handlers.ts)
 * Estas rotas são para consulta de histórico e status
 */

// Helper para obter profileId do userId
async function getProfileId(userId: string): Promise<string | null> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile?.id || null;
}

export default async function chatCallsRoutes(app: FastifyInstance) {
  /**
   * GET /chat/calls
   * Lista histórico de chamadas do usuário
   */
  app.get('/chat/calls', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;

    const profileId = await getProfileId(userId);
    if (!profileId) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    const { threadId, limit = '20', cursor } = req.query as {
      threadId?: string;
      limit?: string;
      cursor?: string;
    };

    const limitNum = Math.min(parseInt(limit) || 20, 50);

    const where: any = {
      OR: [{ callerId: profileId }, { calleeId: profileId }],
    };

    if (threadId) {
      where.threadId = threadId;
    }

    if (cursor) {
      where.createdAt = { lt: new Date(cursor) };
    }

    const calls = await prisma.call.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limitNum + 1,
      include: {
        caller: {
          select: { id: true, handle: true, displayName: true, avatarUrl: true },
        },
        callee: {
          select: { id: true, handle: true, displayName: true, avatarUrl: true },
        },
      },
    });

    const hasMore = calls.length > limitNum;
    const items = hasMore ? calls.slice(0, -1) : calls;
    const nextCursor = hasMore ? items[items.length - 1]?.createdAt.toISOString() : undefined;

    return {
      calls: items.map((call) => ({
        id: call.id,
        threadId: call.threadId,
        type: call.type,
        status: call.status,
        caller: call.caller,
        callee: call.callee,
        isOutgoing: call.callerId === profileId,
        startedAt: call.startedAt?.toISOString() || null,
        endedAt: call.endedAt?.toISOString() || null,
        duration: call.duration,
        createdAt: call.createdAt.toISOString(),
      })),
      nextCursor,
    };
  });

  /**
   * GET /chat/calls/:id
   * Busca detalhes de uma chamada específica
   */
  app.get('/chat/calls/:id', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { id } = req.params as { id: string };

    const profileId = await getProfileId(userId);
    if (!profileId) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    const call = await prisma.call.findUnique({
      where: { id },
      include: {
        caller: {
          select: { id: true, handle: true, displayName: true, avatarUrl: true },
        },
        callee: {
          select: { id: true, handle: true, displayName: true, avatarUrl: true },
        },
      },
    });

    if (!call) {
      return reply.code(404).send({ error: 'Call not found' });
    }

    // Verificar se o usuário é participante da chamada
    if (call.callerId !== profileId && call.calleeId !== profileId) {
      return reply.code(403).send({ error: 'Not authorized' });
    }

    return {
      id: call.id,
      threadId: call.threadId,
      type: call.type,
      status: call.status,
      caller: call.caller,
      callee: call.callee,
      isOutgoing: call.callerId === profileId,
      startedAt: call.startedAt?.toISOString() || null,
      endedAt: call.endedAt?.toISOString() || null,
      duration: call.duration,
      createdAt: call.createdAt.toISOString(),
    };
  });

  /**
   * GET /chat/calls/check-online/:profileId
   * Verifica se um usuário está online (para UI de chamada)
   */
  app.get('/chat/calls/check-online/:profileId', { preHandler: authOnRequest }, async (req, reply) => {
    const { profileId } = req.params as { profileId: string };

    const connection = getConnectionByProfileId(profileId);
    const isOnline = !!connection;

    return { profileId, isOnline };
  });

  /**
   * GET /chat/calls/stats
   * Estatísticas de chamadas do usuário
   */
  app.get('/chat/calls/stats', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;

    const profileId = await getProfileId(userId);
    if (!profileId) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    const [totalCalls, missedCalls, totalDuration] = await Promise.all([
      // Total de chamadas
      prisma.call.count({
        where: {
          OR: [{ callerId: profileId }, { calleeId: profileId }],
        },
      }),
      // Chamadas perdidas (recebidas e não atendidas)
      prisma.call.count({
        where: {
          calleeId: profileId,
          status: 'MISSED',
        },
      }),
      // Duração total em segundos
      prisma.call.aggregate({
        where: {
          OR: [{ callerId: profileId }, { calleeId: profileId }],
          status: 'ENDED',
          duration: { not: null },
        },
        _sum: { duration: true },
      }),
    ]);

    return {
      totalCalls,
      missedCalls,
      totalDurationSeconds: totalDuration._sum.duration || 0,
    };
  });

  /**
   * DELETE /chat/calls
   * Limpa todo o histórico de chamadas do usuário
   */
  app.delete('/chat/calls', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;

    const profileId = await getProfileId(userId);
    if (!profileId) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    // Deletar todas as chamadas onde o usuário é caller ou callee
    const result = await prisma.call.deleteMany({
      where: {
        OR: [{ callerId: profileId }, { calleeId: profileId }],
      },
    });

    return { deleted: result.count };
  });

  /**
   * DELETE /chat/calls/:id
   * Deleta uma chamada específica do histórico
   */
  app.delete('/chat/calls/:id', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { id } = req.params as { id: string };

    const profileId = await getProfileId(userId);
    if (!profileId) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    // Verificar se a chamada existe e se o usuário é participante
    const call = await prisma.call.findUnique({
      where: { id },
      select: { callerId: true, calleeId: true },
    });

    if (!call) {
      return reply.code(404).send({ error: 'Call not found' });
    }

    if (call.callerId !== profileId && call.calleeId !== profileId) {
      return reply.code(403).send({ error: 'Not authorized' });
    }

    await prisma.call.delete({ where: { id } });

    return { deleted: true };
  });
}
