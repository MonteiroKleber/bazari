import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../lib/auth/middleware.js';
import { validateHandle } from '../lib/handles.js';
import { decodeCursor, encodeCursor } from '../lib/cursor.js';
import { env } from '../env.js';
import { verifyAccessToken } from '../lib/auth/jwt.js';

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
        metadataCid: true,
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
  app.get<{ Params: { handle: string } }>('/profiles/:handle/posts', async (request, reply) => {
    const { handle } = handleParamSchema.parse(request.params);
    const { cursor, limit } = paginationSchema.parse(request.query ?? {});
    const take = Math.min(limit ?? env.PAGE_SIZE_DEFAULT, 100);
    try { validateHandle(handle); } catch (e) { return reply.status(400).send({ error: (e as Error).message }); }

    const profile = await prisma.profile.findUnique({ where: { handle }, select: { id: true, handle: true, displayName: true, avatarUrl: true } });
    if (!profile) return reply.status(404).send({ error: 'Perfil não encontrado' });

    const c = decodeCursor(cursor ?? null);
    const where = c
      ? { OR: [ { createdAt: { lt: c.createdAt } }, { createdAt: c.createdAt, id: { lt: c.id } } ], authorId: profile.id }
      : { authorId: profile.id };

    const items = await prisma.post.findMany({
      where,
      orderBy: [ { createdAt: 'desc' }, { id: 'desc' } ],
      take: take + 1,
      select: {
        id: true,
        kind: true,
        content: true,
        media: true,
        createdAt: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          }
        }
      },
    });

    let nextCursor: string | null = null;
    if (items.length > take) {
      const tail = items.pop()!;
      nextCursor = encodeCursor({ createdAt: tail.createdAt, id: tail.id });
    }

    const response = {
      items: items.map(it => ({
        id: it.id,
        author: { handle: profile.handle, displayName: profile.displayName, avatarUrl: profile.avatarUrl },
        kind: it.kind,
        content: it.content,
        media: it.media ?? null,
        createdAt: it.createdAt.toISOString(),
        likesCount: it._count.likes,
        commentsCount: it._count.comments,
      })),
      nextCursor,
    };

    reply.header('Cache-Control', 'public, max-age=30');
    return reply.send(response);
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
          scoreDelta: true
        }
      });

      // Calcular score acumulado por dia
      const currentScore = profile.reputationScore;
      const history: { date: string; score: number }[] = [];

      // Reconstruir histórico (começar do score atual e subtrair deltas)
      const eventsByDay = new Map<string, number>();
      events.reverse().forEach(event => {
        const date = event.createdAt.toISOString().split('T')[0];
        eventsByDay.set(date, (eventsByDay.get(date) || 0) + event.scoreDelta);
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
