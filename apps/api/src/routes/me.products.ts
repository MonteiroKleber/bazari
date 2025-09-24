import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../lib/auth/middleware.js';
import { decodeCursor, encodeCursor } from '../lib/cursor.js';

const statusEnum = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

const listQuerySchema = z.object({
  status: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

const updateProductSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priceBzr: z.string().optional(),
  categoryPath: z.array(z.string()).optional(),
  attributes: z.record(z.any()).optional(),
  mediaIds: z.array(z.string()).optional(),
});

export async function meProductsRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  function normalizeStatus(s?: string | null) {
    if (!s) return undefined;
    try { return statusEnum.parse(s); } catch { return undefined; }
  }

  // GET /me/products — lista produtos do vendedor
  app.get('/me/products', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const { cursor, limit } = listQuerySchema.parse(request.query ?? {});
    const status = normalizeStatus((request.query as any)?.status);

    // Restringir por proprietário (sellerUserId) ou DAOs owned (compat)
    const [daos, user] = await Promise.all([
      prisma.dao.findMany({ where: { ownerUserId: authUser.sub }, select: { id: true, slug: true } }),
      prisma.user.findUnique({ where: { id: authUser.sub }, select: { address: true } }),
    ]);
    const daoIds = daos.flatMap(d => [d.id, d.slug]).filter(Boolean);

    const baseWhere: any = { OR: [ { sellerUserId: authUser.sub } ] };
    if (daoIds.length > 0) baseWhere.OR.push({ daoId: { in: daoIds } });
    if (user?.address) baseWhere.OR.push({ daoId: user.address });
    if (status) baseWhere.status = status as any; // may not exist pre-migration

    const c = decodeCursor(cursor ?? null);
    const where = c
      ? { AND: [ baseWhere, { OR: [ { createdAt: { lt: c.createdAt } }, { createdAt: c.createdAt, id: { lt: c.id } } ] } ] }
      : baseWhere;

    const take = Math.min(limit ?? 20, 100);
    async function fetchList(includeStatus: boolean) {
      const whereWithStatus = includeStatus && baseWhere.status ? { AND: [ { status: baseWhere.status }, { OR: baseWhere.OR } ] } : { OR: baseWhere.OR };
      const w = c
        ? { AND: [ whereWithStatus, { OR: [ { createdAt: { lt: c.createdAt } }, { createdAt: c.createdAt, id: { lt: c.id } } ] } ] }
        : whereWithStatus;
      return prisma.product.findMany({
        where: w as any,
        orderBy: [ { createdAt: 'desc' }, { id: 'desc' } ],
        take: take + 1,
        select: { id: true, title: true, priceBzr: true, status: true, categoryPath: true, updatedAt: true, createdAt: true },
      });
    }

    let items: any[] = [];
    try {
      items = await fetchList(true);
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (msg.includes('Unknown argument `status`') || msg.includes('column') && msg.includes('status')) {
        app.log?.warn?.({ err }, 'Status column not available; listing without status filter');
        items = await fetchList(false);
      } else {
        throw err;
      }
    }

    let nextCursor: string | null = null;
    if (items.length > take) {
      const tail = items.pop()!;
      nextCursor = encodeCursor({ createdAt: (tail as any).createdAt, id: tail.id });
    }

    return reply.send({ items, nextCursor });
  });

  // Helper: checa se o usuário é dono do produto
  async function ensureOwner(productId: string, userId: string): Promise<boolean> {
    const prod = await prisma.product.findUnique({ where: { id: productId }, select: { sellerUserId: true, daoId: true } });
    if (!prod) return false;
    if (prod.sellerUserId === userId) return true;
    const owned = await prisma.dao.findFirst({ where: { ownerUserId: userId, OR: [ { id: prod.daoId }, { slug: prod.daoId } ] }, select: { id: true } });
    return !!owned;
  }

  // PATCH /me/products/:id — editar campos permitidos
  app.patch<{ Params: { id: string } }>('/me/products/:id', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });
    const { id } = request.params;
    let body: z.infer<typeof updateProductSchema>;
    try { body = updateProductSchema.parse(request.body); } catch (e) { return reply.status(400).send({ error: (e as Error).message }); }

    const owns = await ensureOwner(id, authUser.sub);
    if (!owns) return reply.status(403).send({ error: 'Não autorizado' });

    const data: any = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.priceBzr !== undefined) data.priceBzr = body.priceBzr.replace(',', '.');
    if (Array.isArray(body.categoryPath)) data.categoryPath = body.categoryPath;
    if (body.attributes !== undefined) data.attributes = body.attributes as any;

    const updated = await prisma.product.update({ where: { id }, data, select: { id: true, title: true, description: true, priceBzr: true, categoryId: true, categoryPath: true, attributes: true, status: true, updatedAt: true } });

    // Atualização de mídias (associação simples)
    if (body.mediaIds) {
      await prisma.mediaAsset.updateMany({ where: { ownerType: 'Product', ownerId: id }, data: { ownerType: null, ownerId: null } });
      if (body.mediaIds.length > 0) {
        await prisma.mediaAsset.updateMany({ where: { id: { in: body.mediaIds } }, data: { ownerType: 'Product', ownerId: id } });
      }
    }

    return reply.send(updated);
  });

  // POST /me/products/:id/publish
  app.post<{ Params: { id: string } }>('/me/products/:id/publish', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });
    const { id } = request.params;
    const owns = await ensureOwner(id, authUser.sub);
    if (!owns) return reply.status(403).send({ error: 'Não autorizado' });
    const updated = await prisma.product.update({ where: { id }, data: { status: 'PUBLISHED' }, select: { id: true, status: true } });
    return reply.send(updated);
  });

  // POST /me/products/:id/archive
  app.post<{ Params: { id: string } }>('/me/products/:id/archive', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });
    const { id } = request.params;
    const owns = await ensureOwner(id, authUser.sub);
    if (!owns) return reply.status(403).send({ error: 'Não autorizado' });
    const updated = await prisma.product.update({ where: { id }, data: { status: 'ARCHIVED' }, select: { id: true, status: true } });
    return reply.send(updated);
  });
}

export default meProductsRoutes;
