import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

/**
 * VR Sessions Route
 * Endpoints para gerenciar sessões VR dos usuários
 */

// Schema de validação para criar sessão
const createSessionSchema = z.object({
  userId: z.string(),
  worldZone: z.enum(['plaza', 'avenue', 'auditorium', 'building']),
});

export async function vrSessionsRoute(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  // POST /api/vr/session - Criar nova sessão VR
  app.post<{ Body: z.infer<typeof createSessionSchema> }>('/session', async (request, reply) => {
    try {
      const validation = createSessionSchema.safeParse(request.body);

      if (!validation.success) {
        return reply.status(400).send({
          error: 'Validation error',
          details: validation.error.errors,
        });
      }

      const { userId, worldZone } = validation.data;

      // Verificar se já existe sessão ativa para este usuário
      const activeSession = await prisma.vRSession.findFirst({
        where: {
          userId,
          leftAt: null,
        },
      });

      if (activeSession) {
        // Retornar a sessão existente
        return reply.send({
          id: activeSession.id,
          userId: activeSession.userId,
          worldZone: activeSession.worldZone,
          enteredAt: activeSession.enteredAt.toISOString(),
          isActive: true,
        });
      }

      // Criar nova sessão
      const session = await prisma.vRSession.create({
        data: {
          userId,
          worldZone,
        },
      });

      return reply.status(201).send({
        id: session.id,
        userId: session.userId,
        worldZone: session.worldZone,
        enteredAt: session.enteredAt.toISOString(),
        isActive: true,
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: 'Failed to create session',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // DELETE /api/vr/session/:id - Finalizar sessão VR
  app.delete<{ Params: { id: string } }>('/session/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      // Buscar sessão
      const session = await prisma.vRSession.findUnique({
        where: { id },
      });

      if (!session) {
        return reply.status(404).send({
          error: 'Session not found',
        });
      }

      // Verificar se já está finalizada
      if (session.leftAt) {
        return reply.status(400).send({
          error: 'Session already ended',
          leftAt: session.leftAt.toISOString(),
        });
      }

      // Finalizar sessão
      const updatedSession = await prisma.vRSession.update({
        where: { id },
        data: {
          leftAt: new Date(),
        },
      });

      // Calcular duração da sessão
      const duration = updatedSession.leftAt!.getTime() - updatedSession.enteredAt.getTime();
      const durationMinutes = Math.floor(duration / 1000 / 60);

      return reply.send({
        id: updatedSession.id,
        userId: updatedSession.userId,
        worldZone: updatedSession.worldZone,
        enteredAt: updatedSession.enteredAt.toISOString(),
        leftAt: updatedSession.leftAt!.toISOString(),
        durationMinutes,
        isActive: false,
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: 'Failed to end session',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // GET /api/vr/session/active/:userId - Buscar sessão ativa de um usuário
  app.get<{ Params: { userId: string } }>('/session/active/:userId', async (request, reply) => {
    try {
      const { userId } = request.params;

      const session = await prisma.vRSession.findFirst({
        where: {
          userId,
          leftAt: null,
        },
        orderBy: {
          enteredAt: 'desc',
        },
      });

      if (!session) {
        return reply.status(404).send({
          error: 'No active session found',
        });
      }

      return reply.send({
        id: session.id,
        userId: session.userId,
        worldZone: session.worldZone,
        enteredAt: session.enteredAt.toISOString(),
        isActive: true,
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: 'Failed to fetch active session',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // GET /api/vr/sessions/stats - Estatísticas de sessões (últimas 24h)
  app.get('/sessions/stats', async (request, reply) => {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Contar sessões ativas
      const activeSessions = await prisma.vRSession.count({
        where: {
          leftAt: null,
        },
      });

      // Contar sessões nas últimas 24h
      const recentSessions = await prisma.vRSession.count({
        where: {
          enteredAt: { gte: oneDayAgo },
        },
      });

      // Contar por zona
      const sessionsByZone = await prisma.vRSession.groupBy({
        by: ['worldZone'],
        where: {
          leftAt: null,
        },
        _count: {
          id: true,
        },
      });

      const zoneStats = sessionsByZone.reduce((acc, item) => {
        acc[item.worldZone] = item._count.id;
        return acc;
      }, {} as Record<string, number>);

      return reply.send({
        activeSessions,
        recentSessions24h: recentSessions,
        activeByZone: zoneStats,
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: 'Failed to fetch session stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
