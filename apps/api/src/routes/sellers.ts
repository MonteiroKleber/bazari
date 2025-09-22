import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../lib/auth/middleware.js';
import { validateSlug } from '../lib/handles.js';

export async function sellersRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

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

    const existing = await prisma.sellerProfile.findUnique({ where: { userId: authUser.sub } });
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

  // GET /sellers/:shopSlug — público
  app.get<{ Params: { shopSlug: string } }>('/sellers/:shopSlug', async (request, reply) => {
    const { shopSlug } = request.params;
    try { validateSlug(shopSlug); } catch (e) { return reply.status(400).send({ error: (e as Error).message }); }

    const seller = await prisma.sellerProfile.findUnique({ where: { shopSlug }, include: { user: { select: { id: true } } } });
    if (!seller) return reply.status(404).send({ error: 'Loja não encontrada' });

    const ownerProfile = await prisma.profile.findUnique({ where: { userId: seller.user.id }, select: { handle: true, displayName: true, avatarUrl: true } });

    // Cache curto
    reply.header('Cache-Control', 'public, max-age=30');

    return reply.send({ sellerProfile: { shopName: seller.shopName, shopSlug: seller.shopSlug, about: seller.about, ratingAvg: seller.ratingAvg, ratingCount: seller.ratingCount }, owner: ownerProfile, catalog: { products: [] } });
  });
}

export default sellersRoutes;

