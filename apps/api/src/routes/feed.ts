import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../lib/auth/middleware.js';
import { calculateFeedScore, loadUserContext } from '../lib/feedAlgorithm.js';
import { encodeCursor, decodeCursor } from '../lib/cursor.js';
import { calculateProfileSuggestions } from '../lib/profileSuggestions.js';
import { getTopTrendingTopics } from '../lib/trendingAlgorithm.js';

export async function feedRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  const querySchema = z.object({
    limit: z.coerce.number().min(1).max(50).optional().default(20),
    cursor: z.string().optional(),
  });

  // GET /feed/personalized - Feed algorítmico personalizado
  app.get(
    '/feed/personalized',
    { preHandler: authOnRequest },
    async (request, reply) => {
      const authUser = (request as any).authUser as { sub: string } | undefined;
      if (!authUser) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const query = querySchema.parse(request.query);
      const { limit, cursor } = query;

      try {
        // 1. Carregar contexto do usuário
        const userContext = await loadUserContext(prisma, authUser.sub);

        // 2. Buscar posts recentes (últimos 7 dias ou 100 posts)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        let cursorDate: Date | undefined;
        if (cursor) {
          const decoded = decodeCursor(cursor);
          if (decoded) {
            cursorDate = decoded.createdAt;
          }
        }

        const posts = await prisma.post.findMany({
          where: {
            createdAt: cursorDate ? { lt: cursorDate } : { gte: sevenDaysAgo },
            status: 'PUBLISHED',
          },
          take: 100, // Buscar 100 posts para scoring
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: {
                userId: true,
                handle: true,
                displayName: true,
                avatarUrl: true,
              },
            },
            _count: {
              select: {
                likes: true,
                reposts: true,
                comments: true,
              },
            },
          },
        });

        // 3. Calcular score para cada post
        const scoredPosts = posts.map((post) => ({
          ...post,
          score: calculateFeedScore(
            {
              id: post.id,
              authorId: post.authorId,
              createdAt: post.createdAt,
              likesCount: post._count.likes,
              commentsCount: post._count.comments,
            },
            userContext
          ),
        }));

        // 4. Ordenar por score (maior para menor)
        scoredPosts.sort((a, b) => b.score - a.score);

        // 5. Paginação: pegar top N
        const paginatedPosts = scoredPosts.slice(0, limit);

        // 5.1. Buscar profileId do usuário atual
        const meProfile = await prisma.profile.findUnique({
          where: { userId: authUser.sub },
          select: { id: true },
        });

        // 5.2. Buscar interações do usuário para esses posts
        const postIds = paginatedPosts.map((p) => p.id);
        const [userLikes, userReposts, userReactions] = await Promise.all([
          meProfile
            ? prisma.postLike.findMany({
                where: { profileId: meProfile.id, postId: { in: postIds } },
                select: { postId: true },
              })
            : Promise.resolve([]),
          meProfile
            ? prisma.postRepost.findMany({
                where: { profileId: meProfile.id, postId: { in: postIds } },
                select: { postId: true },
              })
            : Promise.resolve([]),
          meProfile
            ? prisma.postReaction.findMany({
                where: { profileId: meProfile.id, postId: { in: postIds } },
                select: { postId: true, reaction: true },
              })
            : Promise.resolve([]),
        ]);

        const likedPostIds = new Set(userLikes.map((l) => l.postId));
        const repostedPostIds = new Set(userReposts.map((r) => r.postId));
        const reactionsByPostId = new Map(userReactions.map((r) => [r.postId, r.reaction]));

        // 5.3. Buscar contadores de reações para todos os posts
        const allReactions = await prisma.postReaction.groupBy({
          by: ['postId', 'reaction'],
          where: { postId: { in: postIds } },
          _count: { reaction: true },
        });

        const reactionsByPost = new Map<string, { love: number; laugh: number; wow: number; sad: number; angry: number }>();
        allReactions.forEach((r) => {
          if (!reactionsByPost.has(r.postId)) {
            reactionsByPost.set(r.postId, { love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 });
          }
          const reactions = reactionsByPost.get(r.postId)!;
          reactions[r.reaction as keyof typeof reactions] = r._count.reaction;
        });

        // 6. Formatar resposta
        const items = paginatedPosts.map((post) => {
          const reactions = reactionsByPost.get(post.id) || { love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 };
          const totalReactions = reactions.love + reactions.laugh + reactions.wow + reactions.sad + reactions.angry;
          const likesCount = totalReactions > 0 ? totalReactions : post._count.likes;

          return {
            id: post.id,
            content: post.content,
            kind: post.kind,
            media: post.media,
            authorId: post.authorId,
            author: {
              handle: post.author.handle,
              displayName: post.author.displayName || 'Unknown',
              avatarUrl: post.author.avatarUrl,
            },
            createdAt: post.createdAt.toISOString(),
            likesCount,
            repostsCount: post._count.reposts,
            commentsCount: post._count.comments,
            isLiked: likedPostIds.has(post.id),
            isReposted: repostedPostIds.has(post.id),
            reactions,
            userReaction: reactionsByPostId.get(post.id),
            score: post.score, // Debug
          };
        });

        // 7. Cursor para próxima página
        const nextCursor =
          paginatedPosts.length === limit
            ? encodeCursor({ createdAt: paginatedPosts[paginatedPosts.length - 1].createdAt, id: paginatedPosts[paginatedPosts.length - 1].id })
            : null;

        return reply.send({
          items,
          nextCursor,
        });
      } catch (error) {
        console.error('Error in personalized feed:', error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // GET /feed/chronological - Feed cronológico (fallback)
  app.get(
    '/feed/chronological',
    { preHandler: authOnRequest },
    async (request, reply) => {
      const authUser = (request as any).authUser as { sub: string } | undefined;
      if (!authUser) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const query = querySchema.parse(request.query);
      const { limit, cursor } = query;

      let cursorDate: Date | undefined;
      if (cursor) {
        const decoded = decodeCursor(cursor);
        if (decoded) {
          cursorDate = decoded.createdAt;
        }
      }

      const posts = await prisma.post.findMany({
        where: {
          createdAt: cursorDate ? { lt: cursorDate } : undefined,
          status: 'PUBLISHED',
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          content: true,
          kind: true,
          media: true,
          authorId: true,
          createdAt: true,
          author: {
            select: {
              handle: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
              reposts: true,
            },
          },
        },
      });

      // Buscar profileId do usuário atual
      const meProfile = await prisma.profile.findUnique({
        where: { userId: authUser.sub },
        select: { id: true },
      });

      if (!meProfile) {
        return reply.status(404).send({ error: 'Profile not found' });
      }

      // Buscar interações do usuário para esses posts
      const postIds = posts.map((p) => p.id);
      const [userLikes, userReposts, userReactions] = await Promise.all([
        prisma.postLike.findMany({
          where: { profileId: meProfile.id, postId: { in: postIds } },
          select: { postId: true },
        }),
        prisma.postRepost.findMany({
          where: { profileId: meProfile.id, postId: { in: postIds } },
          select: { postId: true },
        }),
        prisma.postReaction.findMany({
          where: { profileId: meProfile.id, postId: { in: postIds } },
          select: { postId: true, reaction: true },
        }),
      ]);

      const likedPostIds = new Set(userLikes.map((l) => l.postId));
      const repostedPostIds = new Set(userReposts.map((r) => r.postId));
      const reactionsByPostId = new Map(userReactions.map((r) => [r.postId, r.reaction]));

      // Buscar contadores de reações para todos os posts
      const allReactions = await prisma.postReaction.groupBy({
        by: ['postId', 'reaction'],
        where: { postId: { in: postIds } },
        _count: { reaction: true },
      });

      const reactionsByPost = new Map<string, { love: number; laugh: number; wow: number; sad: number; angry: number }>();
      allReactions.forEach((r) => {
        if (!reactionsByPost.has(r.postId)) {
          reactionsByPost.set(r.postId, { love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 });
        }
        const reactions = reactionsByPost.get(r.postId)!;
        reactions[r.reaction as keyof typeof reactions] = r._count.reaction;
      });

      // Formatar resposta
      const items = posts.map((post) => {
        const reactions = reactionsByPost.get(post.id) || { love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 };
        const totalReactions = reactions.love + reactions.laugh + reactions.wow + reactions.sad + reactions.angry;
        const likesCount = totalReactions > 0 ? totalReactions : post._count.likes;

        return {
          id: post.id,
          content: post.content,
          kind: post.kind,
          media: post.media,
          authorId: post.authorId,
          author: {
            handle: post.author.handle,
            displayName: post.author.displayName || 'Unknown',
            avatarUrl: post.author.avatarUrl,
          },
          createdAt: post.createdAt.toISOString(),
          likesCount,
          repostsCount: post._count.reposts,
          commentsCount: post._count.comments,
          isLiked: likedPostIds.has(post.id),
          isReposted: repostedPostIds.has(post.id),
          reactions,
          userReaction: reactionsByPostId.get(post.id),
        };
      });

      const nextCursor =
        posts.length === limit
          ? encodeCursor({ createdAt: posts[posts.length - 1].createdAt, id: posts[posts.length - 1].id })
          : null;

      return reply.send({
        items,
        nextCursor,
      });
    }
  );

  // GET /feed/suggestions/profiles - Sugestões de perfis
  app.get(
    '/feed/suggestions/profiles',
    { preHandler: authOnRequest },
    async (request, reply) => {
      const authUser = (request as any).authUser as { sub: string } | undefined;
      if (!authUser) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const limitSchema = z.object({
        limit: z.coerce.number().min(1).max(50).optional().default(10),
      });

      const query = limitSchema.parse(request.query);

      try {
        const suggestions = await calculateProfileSuggestions(
          prisma,
          authUser.sub,
          query.limit
        );

        return reply.send({ items: suggestions });
      } catch (error) {
        console.error('Error getting profile suggestions:', error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // GET /feed/trending - Trending topics
  app.get('/feed/trending', async (request, reply) => {
    const limitSchema = z.object({
      limit: z.coerce.number().min(1).max(50).optional().default(10),
    });

    const query = limitSchema.parse(request.query);

    try {
      const topics = await getTopTrendingTopics(prisma, query.limit);

      // Buscar sample posts para cada tópico (top 3)
      const topicsWithPosts = await Promise.all(
        topics.map(async (topic) => {
          const posts = await prisma.post.findMany({
            where: {
              content: { contains: `#${topic.tag}`, mode: 'insensitive' },
              status: 'PUBLISHED',
            },
            take: 3,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              content: true,
              createdAt: true,
              author: {
                select: {
                  handle: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          });

          return {
            tag: topic.tag,
            count: topic.count,
            score: topic.score,
            growthRate: topic.growthRate,
            samplePosts: posts.map((p) => ({
              id: p.id,
              content: p.content.slice(0, 100), // Preview
              createdAt: p.createdAt.toISOString(),
              author: {
                handle: p.author.handle,
                displayName: p.author.displayName,
                avatarUrl: p.author.avatarUrl,
              },
            })),
          };
        })
      );

      return reply.send({ items: topicsWithPosts });
    } catch (error) {
      console.error('Error getting trending topics:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /feed/count - Contar novos posts desde um timestamp
  app.get(
    '/feed/count',
    { preHandler: authOnRequest },
    async (request, reply) => {
      const authUser = (request as any).authUser as { sub: string } | undefined;
      if (!authUser) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const countSchema = z.object({
        since: z.string().datetime().optional(),
        tab: z.enum(['for-you', 'following', 'popular']).optional().default('for-you'),
      });

      let query;
      try {
        query = countSchema.parse(request.query);
      } catch {
        return reply.status(400).send({ error: 'Invalid query parameters' });
      }

      const { since, tab } = query;

      // Se não há since, retornar 0
      if (!since) {
        return reply.send({ count: 0 });
      }

      const sinceDate = new Date(since);

      try {
        let count = 0;

        if (tab === 'following') {
          // Buscar perfis que o usuário segue
          const meProfile = await prisma.profile.findUnique({
            where: { userId: authUser.sub },
            select: { id: true },
          });

          if (meProfile) {
            const following = await prisma.follow.findMany({
              where: { followerId: meProfile.id },
              select: { followingId: true },
            });

            const followingIds = following.map((f) => f.followingId);

            if (followingIds.length > 0) {
              count = await prisma.post.count({
                where: {
                  createdAt: { gt: sinceDate },
                  status: 'PUBLISHED',
                  authorId: { in: followingIds },
                },
              });
            }
          }
        } else {
          // for-you e popular: contar todos os posts públicos
          count = await prisma.post.count({
            where: {
              createdAt: { gt: sinceDate },
              status: 'PUBLISHED',
            },
          });
        }

        return reply.send({ count });
      } catch (error) {
        console.error('Error counting new posts:', error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}

export default feedRoutes;
