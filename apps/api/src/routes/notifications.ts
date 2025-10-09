import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authOnRequest } from '../lib/auth/middleware.js';

export async function notificationsRoutes(
  app: FastifyInstance,
  options: { prisma: PrismaClient }
) {
  const { prisma } = options;

  // GET /notifications
  app.get('/notifications', {
    preHandler: authOnRequest
  }, async (request, reply) => {
    const authUser = (request as any).authUser;
    const { limit = 20, cursor, unreadOnly } = request.query as any;

    const notifications = await prisma.notification.findMany({
      where: {
        userId: authUser.sub,
        ...(unreadOnly === 'true' ? { read: false } : {})
      },
      include: {
        actor: {
          select: {
            handle: true,
            displayName: true,
            avatarUrl: true
          }
        }
      },
      take: parseInt(limit) + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' }
    });

    const hasMore = notifications.length > parseInt(limit);
    const items = hasMore ? notifications.slice(0, -1) : notifications;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const unreadCount = await prisma.notification.count({
      where: { userId: authUser.sub, read: false }
    });

    return reply.send({
      items,
      page: { nextCursor, hasMore },
      unreadCount
    });
  });

  // POST /notifications/mark-all-read
  app.post('/notifications/mark-all-read', {
    preHandler: authOnRequest
  }, async (request, reply) => {
    const authUser = (request as any).authUser;

    await prisma.notification.updateMany({
      where: { userId: authUser.sub, read: false },
      data: { read: true }
    });

    return reply.send({ success: true });
  });

  // POST /notifications/:id/read
  app.post<{ Params: { id: string } }>('/notifications/:id/read', {
    preHandler: authOnRequest
  }, async (request, reply) => {
    const authUser = (request as any).authUser;
    const { id } = request.params;

    await prisma.notification.updateMany({
      where: { id, userId: authUser.sub },
      data: { read: true }
    });

    return reply.send({ success: true });
  });
}

export default notificationsRoutes;
