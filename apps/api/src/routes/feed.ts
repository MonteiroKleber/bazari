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

        // 6. Formatar resposta
        const items = paginatedPosts.map((post) => ({
          id: post.id,
          content: post.content,
          authorId: post.authorId,
          author: {
            handle: post.author.handle,
            displayName: post.author.displayName || 'Unknown',
            avatarUrl: post.author.avatarUrl,
          },
          createdAt: post.createdAt.toISOString(),
          likesCount: post._count.likes,
          commentsCount: post._count.comments,
          score: post.score, // Debug
        }));

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
              comments: true,
            },
          },
        },
      });

      const items = posts.map((post) => ({
        id: post.id,
        content: post.content,
        authorId: post.authorId,
        author: {
          handle: post.author.handle,
          displayName: post.author.displayName || 'Unknown',
          avatarUrl: post.author.avatarUrl,
        },
        createdAt: post.createdAt.toISOString(),
        likesCount: post._count.likes,
        commentsCount: post._count.comments,
      }));

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
}

export default feedRoutes;
