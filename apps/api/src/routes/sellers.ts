import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../lib/auth/middleware.js';
import { validateSlug } from '../lib/handles.js';
import { decodeCursor, encodeCursor } from '../lib/cursor.js';
import { env } from '../env.js';
import { getStore } from '../lib/storesChain.js';
import { buildCatalogForStore } from '../lib/catalogBuilder.js';

export async function sellersRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  // GET /me/seller — retorna perfil do vendedor autenticado (ou null)
  app.get('/me/seller', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const existing = await prisma.sellerProfile.findFirst({
      where: { userId: authUser.sub },
      select: {
        shopName: true,
        shopSlug: true,
        about: true,
        policies: true,
        avatarUrl: true,
        bannerUrl: true,
        ratingAvg: true,
        ratingCount: true,
        onChainStoreId: true,
        ownerAddress: true,
        operatorAddresses: true,
      },
    });

    return reply.send({ sellerProfile: existing ?? null });
  });

  // POST /me/seller — criar/atualizar seller profile
  const upsertSchema = z.object({
    shopName: z.string().min(1),
    shopSlug: z.string().min(3).max(30),
    about: z.string().max(8000).optional(),
    policies: z.record(z.any()).optional(),
  });

  app.post('/me/seller', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    let body: z.infer<typeof upsertSchema>;
    try { body = upsertSchema.parse(request.body); } catch (e) { return reply.status(400).send({ error: (e as Error).message }); }
    try { validateSlug(body.shopSlug); } catch (e) { return reply.status(400).send({ error: (e as Error).message }); }

    const existing = await prisma.sellerProfile.findFirst({ where: { userId: authUser.sub } });
    try {
      const saved = existing
        ? await prisma.sellerProfile.update({ where: { id: existing.id }, data: { shopName: body.shopName, shopSlug: body.shopSlug, about: body.about, policies: body.policies as any } })
        : await prisma.sellerProfile.create({ data: { userId: authUser.sub, shopName: body.shopName, shopSlug: body.shopSlug, about: body.about, policies: body.policies as any } });

      return reply.status(existing ? 200 : 201).send({ sellerProfile: { shopName: saved.shopName, shopSlug: saved.shopSlug, about: saved.about, ratingAvg: saved.ratingAvg, ratingCount: saved.ratingCount } });
    } catch (e: any) {
      if (e?.code === 'P2002') return reply.status(409).send({ error: 'Slug já em uso' });
      return reply.status(400).send({ error: e?.message ?? 'Erro ao salvar seller profile' });
    }
  });

  // GET /sellers/:shopSlug — público (com produtos publicados paginados)
  const publicQuerySchema = z.object({ cursor: z.string().optional(), limit: z.coerce.number().min(1).max(100).optional().default(24) });
  app.get<{ Params: { shopSlug: string } }>('/sellers/:shopSlug', async (request, reply) => {
    const { shopSlug } = request.params;
    const { cursor, limit } = publicQuerySchema.parse(request.query ?? {});
    try { validateSlug(shopSlug); } catch (e) { return reply.status(400).send({ error: (e as Error).message }); }

    const seller = await prisma.sellerProfile.findUnique({ where: { shopSlug }, include: { user: { select: { id: true, address: true } } } });
    if (!seller) return reply.status(404).send({ error: 'Loja não encontrada' });

    const ownerProfile = await prisma.profile.findUnique({ where: { userId: seller.user.id }, select: { handle: true, displayName: true, avatarUrl: true } });

    let onChainReputation: {
      sales: number;
      positive: number;
      negative: number;
      volumePlanck: string;
    } | null = null;

    if (env.STORE_ONCHAIN_V1 && (seller as any).onChainStoreId != null) {
      const storeId = (seller as any).onChainStoreId.toString();
      try {
        const store = await getStore(storeId);
        if (store) {
          onChainReputation = store.reputation;
        }
      } catch (err) {
        app.log.warn({ err, storeId }, 'Falha ao consultar reputação on-chain da loja');
      }
    }

    // Paginador baseado em createdAt + id
    const c = decodeCursor(cursor ?? null);
    // Multi-lojas: filtrar por loja específica usando sellerStoreId
    // Compat (legado): permitir itens SEM sellerStoreId que estejam explicitamente marcados com daoId == shopSlug
    const wherePerStore: any = {
      OR: [
        { sellerStoreId: (seller as any).id },
        { AND: [ { sellerStoreId: null }, { daoId: seller.shopSlug } ] },
      ],
    };

    const where = c
      ? { AND: [ wherePerStore, { OR: [ { createdAt: { lt: c.createdAt } }, { createdAt: c.createdAt, id: { lt: c.id } } ] } ] }
      : wherePerStore;

    const pageSize = Math.min(limit ?? 24, 100);
    async function fetchPage(includeStatus: boolean) {
      const whereWithStatus = includeStatus ? { AND: [ { status: 'PUBLISHED' }, where ] } : where;
      return prisma.product.findMany({
        where: whereWithStatus,
        orderBy: [ { createdAt: 'desc' }, { id: 'desc' } ],
        take: pageSize + 1,
        select: { id: true, title: true, priceBzr: true, createdAt: true },
      });
    }

    let items: Array<{ id: string; title: string; priceBzr: any; createdAt: Date }> = [];
    try {
      items = await fetchPage(true);
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (msg.includes('Unknown argument `status`') || msg.includes('column') && msg.includes('status')) {
        app.log.warn({ err }, 'Status column not available; falling back without status filter');
        items = await fetchPage(false);
      } else {
        throw err;
      }
    }

    let nextCursor: string | null = null;
    if (items.length > pageSize) {
      const tail = items.pop()!;
      nextCursor = encodeCursor({ createdAt: (tail as any).createdAt, id: tail.id });
    }

    // Enriquecer com uma imagem de capa (primeira mídia do produto, se existir)
    let productCovers: Record<string, string | undefined> = {};
    if (items.length > 0) {
      const ids = items.map(p => p.id);
      const medias = await prisma.mediaAsset.findMany({
        where: { ownerType: 'Product', ownerId: { in: ids } },
        orderBy: { createdAt: 'asc' },
        select: { ownerId: true, url: true },
      });
      for (const m of medias) {
        const key = (m as any).ownerId as string;
        if (!productCovers[key]) {
          productCovers[key] = m.url;
        }
      }
    }

    const itemsWithCovers = items.map((p) => ({
      id: p.id,
      title: p.title,
      priceBzr: (p as any).priceBzr?.toString?.() ?? String((p as any).priceBzr ?? ''),
      createdAt: (p as any).createdAt,
      coverUrl: productCovers[p.id],
    }));

    // Cache curto
    reply.header('Cache-Control', 'public, max-age=60');

    return reply.send({
      sellerProfile: {
        id: seller.id,
        shopName: seller.shopName,
        shopSlug: seller.shopSlug,
        about: seller.about,
        ratingAvg: seller.ratingAvg,
        ratingCount: seller.ratingCount,
        policies: (seller as any).policies ?? null,
        avatarUrl: seller.avatarUrl,
        bannerUrl: seller.bannerUrl,
        onChainStoreId:
          (seller as any).onChainStoreId == null
            ? null
            : (seller as any).onChainStoreId.toString(),
        onChainReputation,
      },
      owner: ownerProfile,
      catalog: { products: itemsWithCovers, page: { nextCursor, limit: pageSize } },
    });
  });

  // GET /me/seller/orders — lista pedidos do vendedor autenticado
  const ordersQuerySchema = z.object({ cursor: z.string().optional(), limit: z.coerce.number().min(1).max(100).optional().default(20), status: z.string().optional() });
  app.get('/me/seller/orders', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const { cursor, limit, status } = ordersQuerySchema.parse(request.query ?? {});

    // Descobrir quais sellerId (daoId/slug) pertencem ao usuário
    const daos = await prisma.dao.findMany({ where: { ownerUserId: authUser.sub }, select: { id: true, slug: true } });
    const sellerIds = daos.flatMap(d => [d.id, d.slug]).filter(Boolean);
    // Também permitir match por sellerAddr = user address (compat)
    const user = await prisma.user.findUnique({ where: { id: authUser.sub }, select: { address: true } });

    if (sellerIds.length === 0 && !user?.address) {
      return reply.send({ items: [], nextCursor: null });
    }

    const baseWhere: any = { OR: [] as any[] };
    if (sellerIds.length > 0) baseWhere.OR.push({ sellerId: { in: sellerIds } });
    if (user?.address) baseWhere.OR.push({ sellerAddr: user.address });
    if (status) baseWhere.status = status;

    const c = decodeCursor(cursor ?? null);
    const where = c
      ? { AND: [ baseWhere, { OR: [ { createdAt: { lt: c.createdAt } }, { createdAt: c.createdAt, id: { lt: c.id } } ] } ] }
      : baseWhere;

    const take = Math.min(limit ?? 20, 100);
    const rows = await prisma.order.findMany({
      where,
      orderBy: [ { createdAt: 'desc' }, { id: 'desc' } ],
      take: take + 1,
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });

    let nextCursor: string | null = null;
    if (rows.length > take) {
      const tail = rows.pop()!;
      nextCursor = encodeCursor({ createdAt: (tail as any).createdAt, id: tail.id });
    }

    const items = rows.map(o => ({ id: o.id, createdAt: o.createdAt, totalBzr: o.totalBzr.toString?.() ?? String(o.totalBzr), status: o.status, items: o.items.map(i => ({ listingId: i.listingId, titleSnapshot: i.titleSnapshot, qty: i.qty, lineTotalBzr: i.lineTotalBzr.toString?.() ?? String(i.lineTotalBzr) })) }));
    return reply.send({ items, nextCursor });
  });

  // GET /me/sellers/:idOrSlug/orders — lista pedidos de uma loja específica
  app.get<{ Params: { idOrSlug: string } }>('/me/sellers/:idOrSlug/orders', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const { cursor, limit, status } = ordersQuerySchema.parse(request.query ?? {});

    // Validar loja do usuário
    const store = await prisma.sellerProfile.findFirst({ where: { userId: authUser.sub, OR: [ { id: request.params.idOrSlug }, { shopSlug: request.params.idOrSlug } ] }, select: { id: true } });
    if (!store) return reply.status(404).send({ error: 'Loja não encontrada' });

    const baseWhere: any = { sellerStoreId: store.id } as any;
    if (status) baseWhere.status = status;

    const c = decodeCursor(cursor ?? null);
    const where = c
      ? { AND: [ baseWhere, { OR: [ { createdAt: { lt: c.createdAt } }, { createdAt: c.createdAt, id: { lt: c.id } } ] } ] }
      : baseWhere;

    const take = Math.min(limit ?? 20, 100);
    const rows = await prisma.order.findMany({
      where,
      orderBy: [ { createdAt: 'desc' }, { id: 'desc' } ],
      take: take + 1,
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });

    let nextCursor: string | null = null;
    if (rows.length > take) {
      const tail = rows.pop()!;
      nextCursor = encodeCursor({ createdAt: (tail as any).createdAt, id: tail.id });
    }

    const items = rows.map(o => ({ id: o.id, createdAt: o.createdAt, totalBzr: o.totalBzr.toString?.() ?? String(o.totalBzr), status: o.status, items: o.items.map(i => ({ listingId: i.listingId, titleSnapshot: i.titleSnapshot, qty: i.qty, lineTotalBzr: i.lineTotalBzr.toString?.() ?? String(i.lineTotalBzr) })) }));
    return reply.send({ items, nextCursor });
  });

  // POST /me/sellers/:idOrSlug/sync-catalog — sincronizar catálogo para IPFS
  app.post<{ Params: { idOrSlug: string } }>('/me/sellers/:idOrSlug/sync-catalog', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    if (!env.STORE_ONCHAIN_V1) {
      return reply.status(501).send({ error: 'Funcionalidade on-chain não habilitada.' });
    }

    // Validar loja do usuário
    const store = await prisma.sellerProfile.findFirst({
      where: {
        userId: authUser.sub,
        OR: [ { id: request.params.idOrSlug }, { shopSlug: request.params.idOrSlug } ],
      },
      select: { id: true, shopName: true, onChainStoreId: true },
    });

    if (!store) return reply.status(404).send({ error: 'Loja não encontrada' });
    if (!store.onChainStoreId) {
      return reply.status(400).send({ error: 'Loja não possui ID on-chain. Publique a loja on-chain primeiro.' });
    }

    // Construir catálogo
    const catalog = await buildCatalogForStore(prisma, store.onChainStoreId);

    return reply.send({
      catalog,
      message: 'Catálogo gerado com sucesso. Envie para IPFS e atualize os metadados on-chain.',
    });
  });
}

export default sellersRoutes;
