import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authOnRequest } from '../lib/auth/middleware.js';

export async function userActionsRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  // POST /users/:userId/block
  app.post('/users/:userId/block', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Unauthorized' });

    const { userId } = request.params as { userId: string };

    await prisma.userBlock.create({
      data: { userId: authUser.sub, blockedUserId: userId },
    });

    return reply.send({ success: true });
  });

  // DELETE /users/:userId/block
  app.delete('/users/:userId/block', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Unauthorized' });

    const { userId } = request.params as { userId: string };

    await prisma.userBlock.deleteMany({
      where: { userId: authUser.sub, blockedUserId: userId },
    });

    return reply.send({ success: true });
  });

  // POST /users/:userId/mute
  app.post('/users/:userId/mute', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Unauthorized' });

    const { userId } = request.params as { userId: string };

    await prisma.userMute.create({
      data: { userId: authUser.sub, mutedUserId: userId },
    });

    return reply.send({ success: true });
  });

  // DELETE /users/:userId/mute
  app.delete('/users/:userId/mute', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Unauthorized' });

    const { userId } = request.params as { userId: string };

    await prisma.userMute.deleteMany({
      where: { userId: authUser.sub, mutedUserId: userId },
    });

    return reply.send({ success: true });
  });

  // GET /users/me/blocked
  app.get('/users/me/blocked', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Unauthorized' });

    const blocked = await prisma.userBlock.findMany({
      where: { userId: authUser.sub },
      include: {
        blockedUser: {
          select: {
            id: true,
            profile: {
              select: { handle: true, displayName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    return reply.send({ blocked });
  });
}

export default userActionsRoutes;
