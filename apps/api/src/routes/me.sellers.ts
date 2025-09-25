import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../lib/auth/middleware.js';

const upsertSchema = z.object({
  shopName: z.string().min(1),
  shopSlug: z.string().min(3).max(30),
  about: z.string().max(8000).optional(),
  policies: z.record(z.any()).optional(),
});

export async function meSellersRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  // GET /me/sellers — lista lojas do usuário
  app.get('/me/sellers', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });
    const items = await prisma.sellerProfile.findMany({
      where: { userId: authUser.sub },
      orderBy: { createdAt: 'asc' } as any,
      select: { id: true, shopName: true, shopSlug: true, about: true, ratingAvg: true, ratingCount: true, avatarUrl: true, bannerUrl: true, isDefault: true },
    } as any);
    return reply.send({ items });
  });

  // POST /me/sellers — cria nova loja
  app.post('/me/sellers', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });
    let body: z.infer<typeof upsertSchema>;
    try { body = upsertSchema.parse(request.body); } catch (e) { return reply.status(400).send({ error: (e as Error).message }); }
    try {
      const created = await prisma.sellerProfile.create({
        data: { userId: authUser.sub, shopName: body.shopName, shopSlug: body.shopSlug, about: body.about, policies: body.policies as any },
        select: { id: true, shopName: true, shopSlug: true, about: true, ratingAvg: true, ratingCount: true, isDefault: true } as any,
      });
      return reply.status(201).send({ sellerProfile: created });
    } catch (e: any) {
      if (e?.code === 'P2002') return reply.status(409).send({ error: 'Slug já em uso' });
      return reply.status(400).send({ error: e?.message ?? 'Erro ao criar loja' });
    }
  });

  // Helper para buscar loja do usuário por id ou slug
  async function getMyStore(authUserId: string, idOrSlug: string) {
    return prisma.sellerProfile.findFirst({ where: { userId: authUserId, OR: [ { id: idOrSlug }, { shopSlug: idOrSlug } ] } });
  }

  // GET /me/sellers/:idOrSlug — detalhes
  app.get<{ Params: { idOrSlug: string } }>('/me/sellers/:idOrSlug', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });
    const store = await getMyStore(authUser.sub, request.params.idOrSlug);
    if (!store) return reply.status(404).send({ error: 'Loja não encontrada' });
    return reply.send({ sellerProfile: { id: store.id, shopName: store.shopName, shopSlug: store.shopSlug, about: store.about, ratingAvg: store.ratingAvg, ratingCount: store.ratingCount, isDefault: (store as any).isDefault } });
  });

  // PATCH /me/sellers/:idOrSlug — atualizar
  app.patch<{ Params: { idOrSlug: string } }>('/me/sellers/:idOrSlug', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });
    let body: Partial<z.infer<typeof upsertSchema>>;
    try { body = upsertSchema.partial().parse(request.body); } catch (e) { return reply.status(400).send({ error: (e as Error).message }); }
    const store = await getMyStore(authUser.sub, request.params.idOrSlug);
    if (!store) return reply.status(404).send({ error: 'Loja não encontrada' });
    try {
      const updated = await prisma.sellerProfile.update({ where: { id: store.id }, data: { shopName: body.shopName ?? store.shopName, shopSlug: body.shopSlug ?? store.shopSlug, about: body.about ?? store.about, policies: (body.policies ?? store.policies) as any }, select: { id: true, shopName: true, shopSlug: true, about: true, ratingAvg: true, ratingCount: true, isDefault: true } as any });
      return reply.send({ sellerProfile: updated });
    } catch (e: any) {
      if (e?.code === 'P2002') return reply.status(409).send({ error: 'Slug já em uso' });
      return reply.status(400).send({ error: e?.message ?? 'Erro ao atualizar loja' });
    }
  });

  // POST /me/sellers/:idOrSlug/set-default — define loja padrão
  app.post<{ Params: { idOrSlug: string } }>('/me/sellers/:idOrSlug/set-default', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });
    const store = await getMyStore(authUser.sub, request.params.idOrSlug);
    if (!store) return reply.status(404).send({ error: 'Loja não encontrada' });
    await prisma.sellerProfile.updateMany({ where: { userId: authUser.sub }, data: { isDefault: false } as any });
    await prisma.sellerProfile.update({ where: { id: store.id }, data: { isDefault: true } as any });
    return reply.send({ ok: true });
  });
}

export default meSellersRoutes;
