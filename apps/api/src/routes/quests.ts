import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authOnRequest } from '../lib/auth/middleware.js';

export async function questsRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  // GET /quests/daily
  app.get('/quests/daily', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Unauthorized' });

    const today = new Date().toISOString().split('T')[0];
    const quests = await prisma.quest.findMany();

    const userQuests = await prisma.userQuest.findMany({
      where: { userId: authUser.sub, date: today },
    });

    const questMap = new Map(userQuests.map((uq) => [uq.questId, uq]));

    const questsWithProgress = quests.map((quest) => {
      const userQuest = questMap.get(quest.id);
      return {
        ...quest,
        progress: userQuest?.progress || 0,
        completed: !!userQuest?.completedAt,
        claimed: !!userQuest?.claimedAt,
      };
    });

    return reply.send({ quests: questsWithProgress, date: today });
  });

  // POST /quests/:questId/claim
  app.post('/quests/:questId/claim', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Unauthorized' });

    const { questId } = request.params as { questId: string };
    const today = new Date().toISOString().split('T')[0];

    const userQuest = await prisma.userQuest.findUnique({
      where: { userId_questId_date: { userId: authUser.sub, questId, date: today } },
      include: { quest: true },
    });

    if (!userQuest?.completedAt) {
      return reply.status(400).send({ error: 'Quest not completed' });
    }

    if (userQuest.claimedAt) {
      return reply.status(400).send({ error: 'Reward already claimed' });
    }

    await prisma.userQuest.update({
      where: { id: userQuest.id },
      data: { claimedAt: new Date() },
    });

    return reply.send({ success: true, reward: userQuest.quest.reward });
  });
}

export default questsRoutes;
