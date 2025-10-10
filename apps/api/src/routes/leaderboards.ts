import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

export async function leaderboardsRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  app.get('/leaderboards/:type', async (request, reply) => {
    const { type } = request.params as { type: string };
    const query = z.object({
      limit: z.coerce.number().min(1).max(100).optional().default(100),
    }).parse(request.query);

    try {
      let leaderboard: any[] = [];

      switch (type) {
        case 'reputation':
          leaderboard = await prisma.profile.findMany({
            take: query.limit,
            orderBy: { reputationScore: 'desc' },
            select: {
              userId: true,
              handle: true,
              displayName: true,
              avatarUrl: true,
              reputationScore: true,
              reputationTier: true,
            },
          });
          break;

        case 'posts':
          const profiles = await prisma.profile.findMany({
            take: query.limit,
            select: {
              userId: true,
              handle: true,
              displayName: true,
              avatarUrl: true,
              id: true,
            },
          });

          const postsCount = await Promise.all(
            profiles.map(async (p) => ({
              ...p,
              count: await prisma.post.count({ where: { authorId: p.id } }),
            }))
          );

          leaderboard = postsCount.sort((a, b) => b.count - a.count).slice(0, query.limit);
          break;

        case 'engagement':
          const allProfiles = await prisma.profile.findMany({
            select: {
              userId: true,
              handle: true,
              displayName: true,
              avatarUrl: true,
              id: true,
            },
          });

          const engagement = await Promise.all(
            allProfiles.map(async (p) => {
              const posts = await prisma.post.findMany({
                where: { authorId: p.id },
                select: { id: true },
              });
              const likes = await prisma.postLike.count({
                where: { postId: { in: posts.map((post) => post.id) } },
              });
              const comments = await prisma.postComment.count({
                where: { postId: { in: posts.map((post) => post.id) } },
              });
              return { ...p, score: likes + comments * 3 };
            })
          );

          leaderboard = engagement.sort((a, b) => b.score - a.score).slice(0, query.limit);
          break;

        case 'followers':
          const profilesWithFollowers = await prisma.profile.findMany({
            select: {
              userId: true,
              handle: true,
              displayName: true,
              avatarUrl: true,
              id: true,
            },
          });

          const followersData = await Promise.all(
            profilesWithFollowers.map(async (p) => ({
              ...p,
              count: await prisma.follow.count({ where: { followingId: p.id } }),
            }))
          );

          leaderboard = followersData.sort((a, b) => b.count - a.count).slice(0, query.limit);
          break;

        default:
          return reply.status(400).send({ error: 'Invalid leaderboard type' });
      }

      // Add ranking position
      const rankedLeaderboard = leaderboard.map((entry, index) => ({
        rank: index + 1,
        ...entry,
      }));

      return reply.send({ type, leaderboard: rankedLeaderboard });
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}

export default leaderboardsRoutes;
