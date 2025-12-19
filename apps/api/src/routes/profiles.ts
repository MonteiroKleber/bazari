import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest, optionalAuthOnRequest } from '../lib/auth/middleware.js';
import { validateHandle } from '../lib/handles.js';
import { decodeCursor, encodeCursor } from '../lib/cursor.js';
import { env } from '../env.js';
import { verifyAccessToken } from '../lib/auth/jwt.js';
import { getUserPresence } from '../chat/ws/handlers.js';

export async function profilesRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  const handleParamSchema = z.object({ handle: z.string().min(1) });
  const paginationSchema = z.object({ cursor: z.string().optional(), limit: z.coerce.number().min(1).max(100).optional() });

  // GET /profiles/:handle — público
  app.get<{ Params: { handle: string } }>('/profiles/:handle', async (request, reply) => {
    const { handle } = handleParamSchema.parse(request.params);

    try {
      validateHandle(handle);
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }

    const profile = await prisma.profile.findUnique({
      where: { handle },
      select: {
        id: true,
        handle: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        bannerUrl: true,
        externalLinks: true,
        followersCount: true,
        followingCount: true,
        postsCount: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        onChainProfileId: true,
        reputationScore: true,
        reputationTier: true,
        isVerified: true,
        lastChainSync: true,
      },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado' });
    }

    // Buscar badges (top 5)
    const badges = await prisma.profileBadge.findMany({
      where: {
        profileId: profile.id,
        revokedAt: null,
      },
      take: 5,
      orderBy: { issuedAt: 'desc' },
    });

    const sellerProfiles = await prisma.sellerProfile.findMany({
      where: { userId: profile.userId },
      orderBy: [{ isDefault: 'desc' as any }, { createdAt: 'asc' as any }] as any,
      select: {
        shopName: true,
        shopSlug: true,
        about: true,
        ratingAvg: true,
        ratingCount: true,
        isDefault: true,
      },
    } as any);
    const sellerProfile = sellerProfiles[0] ?? null;

    // viewer (opcional): se Authorization presente, retorna isSelf/isFollowing
    let viewer: { isSelf: boolean; isFollowing: boolean } | null = null;
    const auth = request.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      try {
        const token = auth.slice('Bearer '.length).trim();
        const payload = verifyAccessToken(token);
        const meProfile = await prisma.profile.findUnique({ where: { userId: payload.sub }, select: { id: true } });
        if (meProfile) {
          if (meProfile.id === profile.id) {
            viewer = { isSelf: true, isFollowing: false };
          } else {
            const exists = await prisma.follow.findUnique({ where: { followerId_followingId: { followerId: meProfile.id, followingId: profile.id } }, select: { id: true } });
            viewer = { isSelf: false, isFollowing: !!exists };
          }
        }
      } catch {/* ignore invalid token */}
    }

    // Samples
    const [followersSample, followingSample] = await Promise.all([
      prisma.follow.findMany({
        where: { followingId: profile.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { follower: { select: { handle: true, displayName: true, avatarUrl: true } } },
      }).then(rows => rows.map(r => r.follower)),
      prisma.follow.findMany({
        where: { followerId: profile.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { following: { select: { handle: true, displayName: true, avatarUrl: true } } },
      }).then(rows => rows.map(r => r.following)),
    ]);

    // Cache curto
    reply.header('Cache-Control', 'public, max-age=30');

    app.log.info({ event: 'profile.view', handle });
    return reply.send({
      profile: {
        ...profile,
        onChainProfileId: profile.onChainProfileId?.toString(),
        reputation: {
          score: profile.reputationScore,
          tier: profile.reputationTier,
        },
      },
      badges,
      sellerProfile: sellerProfile ?? null,
      sellerProfiles,
      counts: {
        followers: profile.followersCount,
        following: profile.followingCount,
        posts: profile.postsCount,
      },
      followingSample,
      followersSample,
      subdaos: [], // Preencher quando páginas existirem
      viewer,
    });
  });

  // GET /profiles/:handle/posts — público, paginado por cursor
  // Retorna posts originais + reposts do usuário (feed misto)
  app.get<{ Params: { handle: string } }>('/profiles/:handle/posts', {
    preHandler: optionalAuthOnRequest,
  }, async (request, reply) => {
    const { handle } = handleParamSchema.parse(request.params);
    const { cursor, limit } = paginationSchema.parse(request.query ?? {});
    const take = Math.min(limit ?? env.PAGE_SIZE_DEFAULT, 100);
    try { validateHandle(handle); } catch (e) { return reply.status(400).send({ error: (e as Error).message }); }

    const profile = await prisma.profile.findUnique({ where: { handle }, select: { id: true, handle: true, displayName: true, avatarUrl: true } });
    if (!profile) return reply.status(404).send({ error: 'Perfil não encontrado' });

    const c = decodeCursor(cursor ?? null);

    // Buscar posts originais
    const postsWhere = c
      ? { OR: [ { createdAt: { lt: c.createdAt } }, { createdAt: c.createdAt, id: { lt: c.id } } ], authorId: profile.id, status: 'PUBLISHED' as const }
      : { authorId: profile.id, status: 'PUBLISHED' as const };

    const posts = await prisma.post.findMany({
      where: postsWhere,
      orderBy: [ { createdAt: 'desc' }, { id: 'desc' } ],
      take: take * 2, // Buscar mais para compensar reposts
      select: {
        id: true,
        kind: true,
        content: true,
        media: true,
        createdAt: true,
        author: {
          select: {
            handle: true,
            displayName: true,
            avatarUrl: true,
          }
        },
        _count: {
          select: {
            likes: true,
            reposts: true,
            comments: true,
          }
        }
      },
    });

    // Buscar reposts
    const repostsWhere = c
      ? { OR: [ { createdAt: { lt: c.createdAt } }, { createdAt: c.createdAt, id: { lt: c.id } } ], profileId: profile.id }
      : { profileId: profile.id };

    const reposts = await prisma.postRepost.findMany({
      where: repostsWhere,
      orderBy: [ { createdAt: 'desc' }, { id: 'desc' } ],
      take: take * 2,
      select: {
        id: true,
        createdAt: true,
        post: {
          select: {
            id: true,
            kind: true,
            content: true,
            media: true,
            createdAt: true,
            status: true,
            author: {
              select: {
                handle: true,
                displayName: true,
                avatarUrl: true,
              }
            },
            _count: {
              select: {
                likes: true,
                reposts: true,
                comments: true,
              }
            }
          }
        }
      },
    });

    // Filtrar reposts de posts publicados
    const validReposts = reposts.filter(r => r.post.status === 'PUBLISHED');

    // Mesclar posts e reposts, ordenar por data do repost/post
    const allItems = [
      ...posts.map(p => ({ type: 'post' as const, data: p, sortDate: p.createdAt, sortId: p.id })),
      ...validReposts.map(r => ({ type: 'repost' as const, data: r, sortDate: r.createdAt, sortId: r.id }))
    ].sort((a, b) => {
      if (a.sortDate.getTime() !== b.sortDate.getTime()) {
        return b.sortDate.getTime() - a.sortDate.getTime();
      }
      return b.sortId.localeCompare(a.sortId);
    });

    // Aplicar paginação
    const paginatedItems = allItems.slice(0, take + 1);
    let nextCursor: string | null = null;
    if (paginatedItems.length > take) {
      const tail = paginatedItems.pop()!;
      nextCursor = encodeCursor({ createdAt: tail.sortDate, id: tail.sortId });
    }

    // Buscar interações do usuário autenticado (se houver)
    const authUser = (request as any).authUser as { sub: string } | undefined;
    let meProfile: { id: string } | null = null;
    let likedPostIds = new Set<string>();
    let repostedPostIds = new Set<string>();
    let reactionsByPostId = new Map<string, string>();

    // Extrair IDs dos posts
    const postIds = paginatedItems.map((item) =>
      item.type === 'post' ? item.data.id : item.data.post.id
    );

    // Buscar contadores de reações (público, sempre)
    const reactionsByPost = new Map<string, { love: number; laugh: number; wow: number; sad: number; angry: number }>();
    const allReactions = await prisma.postReaction.groupBy({
      by: ['postId', 'reaction'],
      where: { postId: { in: postIds } },
      _count: { reaction: true },
    });

    allReactions.forEach((r) => {
      if (!reactionsByPost.has(r.postId)) {
        reactionsByPost.set(r.postId, { love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 });
      }
      const reactions = reactionsByPost.get(r.postId)!;
      reactions[r.reaction as keyof typeof reactions] = r._count.reaction;
    });

    // Buscar interações do usuário autenticado (se houver)
    if (authUser) {
      meProfile = await prisma.profile.findUnique({
        where: { userId: authUser.sub },
        select: { id: true },
      });

      if (meProfile) {
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

        likedPostIds = new Set(userLikes.map((l) => l.postId));
        repostedPostIds = new Set(userReposts.map((r) => r.postId));
        reactionsByPostId = new Map(userReactions.map((r) => [r.postId, r.reaction]));
      }
    }

    const response = {
      items: paginatedItems.map(item => {
        if (item.type === 'post') {
          const postId = item.data.id;
          const reactions = reactionsByPost.get(postId) || { love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 };
          const totalReactions = reactions.love + reactions.laugh + reactions.wow + reactions.sad + reactions.angry;
          const likesCount = totalReactions > 0 ? totalReactions : item.data._count.likes;

          return {
            id: postId,
            author: item.data.author,
            kind: item.data.kind,
            content: item.data.content,
            media: item.data.media ?? null,
            createdAt: item.data.createdAt.toISOString(),
            likesCount,
            repostsCount: item.data._count.reposts,
            commentsCount: item.data._count.comments,
            isLiked: likedPostIds.has(postId),
            isReposted: repostedPostIds.has(postId),
            reactions,
            userReaction: reactionsByPostId.get(postId),
          };
        } else {
          // Repost - incluir informação de quem repostou
          const postId = item.data.post.id;
          const reactions = reactionsByPost.get(postId) || { love: 0, laugh: 0, wow: 0, sad: 0, angry: 0 };
          const totalReactions = reactions.love + reactions.laugh + reactions.wow + reactions.sad + reactions.angry;
          const likesCount = totalReactions > 0 ? totalReactions : item.data.post._count.likes;

          return {
            id: postId,
            author: item.data.post.author,
            kind: item.data.post.kind,
            content: item.data.post.content,
            media: item.data.post.media ?? null,
            createdAt: item.data.post.createdAt.toISOString(),
            likesCount,
            repostsCount: item.data.post._count.reposts,
            commentsCount: item.data.post._count.comments,
            isLiked: likedPostIds.has(postId),
            isReposted: repostedPostIds.has(postId),
            reactions,
            userReaction: reactionsByPostId.get(postId),
            repostedBy: {
              handle: profile.handle,
              displayName: profile.displayName,
              avatarUrl: profile.avatarUrl,
            },
            repostedAt: item.data.createdAt.toISOString(),
          };
        }
      }),
      nextCursor,
    };

    // Log para debug
    app.log.info({
      route: 'GET /profiles/:handle/posts',
      handle,
      authUser: authUser?.sub,
      itemsCount: response.items.length,
      firstItem: response.items[0] ? {
        id: response.items[0].id,
        isLiked: response.items[0].isLiked,
        isReposted: response.items[0].isReposted,
        reactions: response.items[0].reactions,
        userReaction: response.items[0].userReaction,
        likesCount: response.items[0].likesCount,
        repostsCount: response.items[0].repostsCount,
      } : null,
    });

    reply.header('Cache-Control', 'public, max-age=30');
    return reply.send(response);
  });

  // GET /profiles/:handle/media — público, posts com mídia (grid view)
  app.get<{ Params: { handle: string } }>('/profiles/:handle/media', async (request, reply) => {
    const { handle } = handleParamSchema.parse(request.params);
    const { cursor, limit } = paginationSchema.parse(request.query ?? {});
    const take = Math.min(limit ?? 24, 100); // Default 24 para grid

    try {
      validateHandle(handle);
    } catch (e) {
      return reply.status(400).send({ error: (e as Error).message });
    }

    const profile = await prisma.profile.findUnique({
      where: { handle },
      select: { id: true },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado' });
    }

    const c = decodeCursor(cursor ?? null);

    // Buscar posts com mídia (media não vazio)
    const whereClause = {
      authorId: profile.id,
      status: 'PUBLISHED' as const,
      NOT: {
        media: { equals: [] },
      },
      ...(c ? {
        OR: [
          { createdAt: { lt: c.createdAt } },
          { createdAt: c.createdAt, id: { lt: c.id } },
        ],
      } : {}),
    };

    const posts = await prisma.post.findMany({
      where: whereClause,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      select: {
        id: true,
        media: true,
        createdAt: true,
      },
    });

    let nextCursor: string | null = null;
    if (posts.length > take) {
      const tail = posts.pop()!;
      nextCursor = encodeCursor({ createdAt: tail.createdAt, id: tail.id });
    }

    reply.header('Cache-Control', 'public, max-age=30');
    return reply.send({
      items: posts.map((p) => ({
        id: p.id,
        media: p.media,
        createdAt: p.createdAt.toISOString(),
      })),
      nextCursor,
    });
  });

  // GET /profiles/:handle/followers — público
  app.get<{ Params: { handle: string } }>('/profiles/:handle/followers', async (request, reply) => {
    const { handle } = handleParamSchema.parse(request.params);
    const { cursor, limit } = paginationSchema.parse(request.query ?? {});
    const take = Math.min(limit ?? env.PAGE_SIZE_DEFAULT, 100);
    try { validateHandle(handle); } catch (e) { return reply.status(400).send({ error: (e as Error).message }); }

    const profile = await prisma.profile.findUnique({ where: { handle }, select: { id: true } });
    if (!profile) return reply.status(404).send({ error: 'Perfil não encontrado' });

    const c = decodeCursor(cursor ?? null);
    const where = c
      ? { OR: [ { createdAt: { lt: c.createdAt } }, { createdAt: c.createdAt, id: { lt: c.id } } ], followingId: profile.id }
      : { followingId: profile.id };

    const rows = await prisma.follow.findMany({
      where,
      orderBy: [ { createdAt: 'desc' }, { id: 'desc' } ],
      take: take + 1,
      select: { id: true, createdAt: true, follower: { select: { handle: true, displayName: true, avatarUrl: true } } },
    });

    let nextCursor: string | null = null;
    if (rows.length > take) {
      const tail = rows.pop()!;
      nextCursor = encodeCursor({ createdAt: tail.createdAt, id: tail.id });
    }

    return reply.send({ items: rows.map(r => r.follower), nextCursor });
  });

  // GET /profiles/:handle/following — público
  app.get<{ Params: { handle: string } }>('/profiles/:handle/following', async (request, reply) => {
    const { handle } = handleParamSchema.parse(request.params);
    const { cursor, limit } = paginationSchema.parse(request.query ?? {});
    const take = Math.min(limit ?? env.PAGE_SIZE_DEFAULT, 100);
    try { validateHandle(handle); } catch (e) { return reply.status(400).send({ error: (e as Error).message }); }

    const profile = await prisma.profile.findUnique({ where: { handle }, select: { id: true } });
    if (!profile) return reply.status(404).send({ error: 'Perfil não encontrado' });

    const c = decodeCursor(cursor ?? null);
    const where = c
      ? { OR: [ { createdAt: { lt: c.createdAt } }, { createdAt: c.createdAt, id: { lt: c.id } } ], followerId: profile.id }
      : { followerId: profile.id };

    const rows = await prisma.follow.findMany({
      where,
      orderBy: [ { createdAt: 'desc' }, { id: 'desc' } ],
      take: take + 1,
      select: { id: true, createdAt: true, following: { select: { handle: true, displayName: true, avatarUrl: true } } },
    });

    let nextCursor: string | null = null;
    if (rows.length > take) {
      const tail = rows.pop()!;
      nextCursor = encodeCursor({ createdAt: tail.createdAt, id: tail.id });
    }

    return reply.send({ items: rows.map(r => r.following), nextCursor });
  });

  // GET /profiles/search — buscar usuários por handle ou nome (para ReceiverSearch)
  app.get('/profiles/search', async (request, reply) => {
    const querySchema = z.object({
      q: z.string().min(2).max(100),
      limit: z.coerce.number().min(1).max(50).optional().default(10),
    });

    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Parâmetro de busca inválido', users: [] });
    }

    const { q, limit } = parsed.data;

    // Remove @ do início se presente
    const searchTerm = q.replace(/^@/, '');

    try {
      const profiles = await prisma.profile.findMany({
        where: {
          OR: [
            { handle: { contains: searchTerm, mode: 'insensitive' } },
            { displayName: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          handle: true,
          displayName: true,
          avatarUrl: true,
          user: {
            select: {
              id: true,
              address: true,
            },
          },
        },
        orderBy: [
          { followersCount: 'desc' },
          { createdAt: 'asc' },
        ],
        take: limit,
      });

      const users = profiles.map((p) => ({
        id: p.user.id,
        handle: p.handle,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        walletAddress: p.user.address,
      }));

      return reply.send({ users });
    } catch (error) {
      app.log.error({ err: error }, 'Error searching profiles');
      return reply.status(500).send({ error: 'Erro ao buscar usuários', users: [] });
    }
  });

  // GET /profiles/_resolve — público (by address ou handle)
  app.get('/profiles/_resolve', async (request, reply) => {
    const query = request.query as any;
    const address = (query.address as string | undefined) || undefined;
    const handle = (query.handle as string | undefined)?.replace(/^@/, '') || undefined;

    if (!address && !handle) {
      return reply.status(400).send({ error: 'Parâmetro address ou handle é obrigatório' });
    }

    let profile: { handle: string; id: string; userId: string } | null = null;
    if (handle) {
      profile = await prisma.profile.findUnique({ where: { handle }, select: { handle: true, id: true, userId: true } });
    } else if (address) {
      const user = await prisma.user.findUnique({ where: { address }, select: { id: true } });
      if (user) {
        profile = await prisma.profile.findUnique({ where: { userId: user.id }, select: { handle: true, id: true, userId: true } });
      }
    }

    if (!profile) {
      return reply.send({ handle: null, address: address ?? null, profileId: null, shopSlug: null, exists: false });
    }

    const shops = await prisma.sellerProfile.findMany({ where: { userId: profile.userId }, select: { shopSlug: true, shopName: true, isDefault: true } } as any);
    const defaultShop = shops.find(s => (s as any).isDefault) || shops[0] || null;
    return reply.send({ handle: profile.handle, address: address ?? null, profileId: profile.id, shops, defaultShopSlug: defaultShop?.shopSlug ?? null, exists: true });
  });

  // GET /me/profile — autenticado
  app.get('/me/profile', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });
    const prof = await prisma.profile.findUnique({ where: { userId: authUser.sub }, select: { id: true, handle: true, displayName: true, avatarUrl: true, bio: true, bannerUrl: true, externalLinks: true } });
    if (!prof) return reply.status(404).send({ error: 'Perfil não encontrado' });
    return reply.send({ profile: prof });
  });

  // POST /me/profile — criar/atualizar
  app.post('/me/profile', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const bodySchema = z.object({
      handle: z.string().min(3).max(30).optional(),
      displayName: z.string().min(1),
      bio: z.string().max(4000).optional(),
      avatarUrl: z.string().url().optional(),
      bannerUrl: z.string().url().optional(),
      externalLinks: z.array(z.object({ label: z.string().min(1), url: z.string().url() })).optional(),
    });

    let body: z.infer<typeof bodySchema>;
    try { body = bodySchema.parse(request.body); } catch (e) { return reply.status(400).send({ error: (e as Error).message }); }

    // validar handle se fornecido
    if (body.handle) {
      try { validateHandle(body.handle); } catch (e) { return reply.status(400).send({ error: (e as Error).message }); }
    }

    const existing = await prisma.profile.findUnique({ where: { userId: authUser.sub } });
    try {
      if (!existing) {
        if (!body.handle) return reply.status(400).send({ error: 'Handle é obrigatório no primeiro cadastro' });
        const created = await prisma.profile.create({
          data: {
            userId: authUser.sub,
            handle: body.handle,
            displayName: body.displayName,
            bio: body.bio,
            avatarUrl: body.avatarUrl,
            bannerUrl: body.bannerUrl,
            externalLinks: body.externalLinks as any,
          },
        });
        return reply.status(201).send({ profile: { handle: created.handle, displayName: created.displayName, avatarUrl: created.avatarUrl, bio: created.bio, bannerUrl: created.bannerUrl, externalLinks: created.externalLinks } });
      } else {
        // update
        const updated = await prisma.profile.update({
          where: { id: existing.id },
          data: {
            handle: body.handle ?? existing.handle,
            displayName: body.displayName,
            bio: body.bio,
            avatarUrl: body.avatarUrl,
            bannerUrl: body.bannerUrl,
            externalLinks: body.externalLinks as any,
          },
        });
        return reply.send({ profile: { handle: updated.handle, displayName: updated.displayName, avatarUrl: updated.avatarUrl, bio: updated.bio, bannerUrl: updated.bannerUrl, externalLinks: updated.externalLinks } });
      }
    } catch (e: any) {
      if (e?.code === 'P2002') {
        return reply.status(409).send({ error: 'Handle já em uso' });
      }
      return reply.status(400).send({ error: e?.message ?? 'Erro ao salvar perfil' });
    }
  });

  // GET /profiles/:handle/reputation
  app.get<{ Params: { handle: string } }>(
    '/profiles/:handle/reputation',
    async (request, reply) => {
      const { handle } = handleParamSchema.parse(request.params);

      const profile = await prisma.profile.findUnique({
        where: { handle },
        select: { id: true },
      });

      if (!profile) {
        return reply.status(404).send({ error: 'Profile not found' });
      }

      const events = await prisma.profileReputationEvent.findMany({
        where: { profileId: profile.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      return reply.send({ events });
    }
  );

  // GET /profiles/:handle/badges
  app.get<{ Params: { handle: string } }>(
    '/profiles/:handle/badges',
    async (request, reply) => {
      const { handle } = handleParamSchema.parse(request.params);

      const profile = await prisma.profile.findUnique({
        where: { handle },
        select: { id: true },
      });

      if (!profile) {
        return reply.status(404).send({ error: 'Profile not found' });
      }

      const badges = await prisma.profileBadge.findMany({
        where: {
          profileId: profile.id,
          revokedAt: null,
        },
        orderBy: { issuedAt: 'desc' },
      });

      return reply.send({ badges });
    }
  );

  // GET /profiles/:handle/presence — status de presença online
  app.get<{ Params: { handle: string } }>('/profiles/:handle/presence', async (request, reply) => {
    const { handle } = handleParamSchema.parse(request.params);

    try {
      validateHandle(handle);
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }

    const profile = await prisma.profile.findUnique({
      where: { handle },
      select: { id: true, showOnlineStatus: true },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado' });
    }

    // Se usuário não permite mostrar status online, retornar offline sem lastSeenAt
    if (!profile.showOnlineStatus) {
      return reply.send({
        isOnline: false,
        lastSeenAt: null,
      });
    }

    const presence = await getUserPresence(profile.id);

    return reply.send({
      isOnline: presence.status === 'online',
      lastSeenAt: presence.lastSeenAt || null,
    });
  });

  // GET /profiles/:handle/reputation/history — histórico de reputação
  app.get<{ Params: { handle: string } }>('/profiles/:handle/reputation/history',
    async (request, reply) => {
      const { handle } = request.params;

      const profile = await prisma.profile.findUnique({
        where: { handle },
        select: {
          reputationScore: true,
          reputationTier: true
        }
      });

      if (!profile) {
        return reply.status(404).send({ error: 'Profile not found' });
      }

      // Buscar eventos dos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const events = await prisma.profileReputationEvent.findMany({
        where: {
          profile: { handle },
          createdAt: { gte: thirtyDaysAgo }
        },
        orderBy: { createdAt: 'asc' },
        select: {
          createdAt: true,
          delta: true
        }
      });

      // Calcular score acumulado por dia
      const currentScore = profile.reputationScore;
      const history: { date: string; score: number }[] = [];

      // Reconstruir histórico (começar do score atual e subtrair deltas)
      const eventsByDay = new Map<string, number>();
      events.reverse().forEach(event => {
        const date = event.createdAt.toISOString().split('T')[0];
        eventsByDay.set(date, (eventsByDay.get(date) || 0) + event.delta);
      });

      // Criar array dos últimos 30 dias
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        // Subtrair eventos deste dia e dias futuros
        let scoreAtDate = currentScore;
        eventsByDay.forEach((delta, eventDate) => {
          if (eventDate > dateStr) {
            scoreAtDate -= delta;
          }
        });

        history.push({
          date: dateStr,
          score: Math.max(0, scoreAtDate)
        });
      }

      // Calcular variações
      const score7dAgo = history[history.length - 7]?.score || currentScore;
      const change7d = currentScore - score7dAgo;
      const change30d = currentScore - (history[0]?.score || currentScore);

      // Calcular progresso para próximo tier
      const tierThresholds = [0, 100, 300, 600, 1000];
      const nextTierIndex = tierThresholds.findIndex(t => t > currentScore);
      const nextTier = nextTierIndex > 0 ? tierThresholds[nextTierIndex] : 1000;
      const prevTier = nextTierIndex > 0 ? tierThresholds[nextTierIndex - 1] : 0;
      const progressToNext = (currentScore - prevTier) / (nextTier - prevTier);

      return reply.send({
        current: {
          score: currentScore,
          tier: profile.reputationTier,
          nextTier: nextTierIndex < tierThresholds.length ?
            ['NOVICE', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'][nextTierIndex] : 'PLATINUM',
          progressToNext: Math.min(1, Math.max(0, progressToNext))
        },
        history,
        change7d,
        change30d
      });
    }
  );
}

export default profilesRoutes;
