import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../lib/auth/middleware.js';

const upsertSchema = z.object({
  shopName: z.string().min(1),
  shopSlug: z.string().min(3).max(30),
  about: z.string().max(8000).optional(),
  policies: z.record(z.any()).optional(),
  onChainStoreId: z.union([z.string(), z.number(), z.bigint()]).nullish(),
  ownerAddress: z.string().min(3).max(128).nullish(),
  operatorAddresses: z.array(z.string().min(3)).max(32).nullish(),
});

export async function meSellersRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  const serializeSellerProfile = (profile: any) => {
    if (!profile) return profile;
    const onChainStoreId = profile.onChainStoreId ?? (profile as any).onChainStoreId;
    return {
      ...profile,
      onChainStoreId: onChainStoreId == null ? null : onChainStoreId.toString(),
      operatorAddresses: Array.isArray(profile.operatorAddresses)
        ? profile.operatorAddresses.map((entry: any) => String(entry))
        : [],
    };
  };

  // GET /me/sellers — lista lojas do usuário
  app.get('/me/sellers', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });
    const rawItems = await prisma.sellerProfile.findMany({
      where: { userId: authUser.sub },
      orderBy: { createdAt: 'asc' } as any,
      select: {
        id: true,
        shopName: true,
        shopSlug: true,
        about: true,
        ratingAvg: true,
        ratingCount: true,
        avatarUrl: true,
        bannerUrl: true,
        isDefault: true,
        onChainStoreId: true,
        ownerAddress: true,
        operatorAddresses: true,
      },
    } as any);
    const items = rawItems.map(serializeSellerProfile);
    return reply.send({ items });
  });

  // POST /me/sellers — cria nova loja
  app.post('/me/sellers', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });
    let body: z.infer<typeof upsertSchema>;
    try {
      body = upsertSchema.parse(request.body);
    } catch (e) {
      return reply.status(400).send({ error: (e as Error).message });
    }
    try {
      const created = await prisma.sellerProfile.create({
        data: {
          userId: authUser.sub,
          shopName: body.shopName,
          shopSlug: body.shopSlug,
          about: body.about,
          policies: body.policies as any,
          onChainStoreId: body.onChainStoreId == null ? null : BigInt(body.onChainStoreId),
          ownerAddress: body.ownerAddress ?? null,
          operatorAddresses: Array.isArray(body.operatorAddresses)
            ? body.operatorAddresses.map((entry) => String(entry).trim()).filter(Boolean)
            : [],
        },
        select: {
          id: true,
          shopName: true,
          shopSlug: true,
          about: true,
          ratingAvg: true,
          ratingCount: true,
          isDefault: true,
          onChainStoreId: true,
          ownerAddress: true,
          operatorAddresses: true,
        } as any,
      });
      return reply.status(201).send({ sellerProfile: serializeSellerProfile(created) });
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
    return reply.send({
      sellerProfile: serializeSellerProfile({
        id: store.id,
        shopName: store.shopName,
        shopSlug: store.shopSlug,
        about: store.about,
        ratingAvg: store.ratingAvg,
        ratingCount: store.ratingCount,
        isDefault: (store as any).isDefault,
        onChainStoreId: (store as any).onChainStoreId ?? null,
        ownerAddress: (store as any).ownerAddress ?? null,
        operatorAddresses: (store as any).operatorAddresses ?? [],
      }),
    });
  });

  // PATCH /me/sellers/:idOrSlug — atualizar
  app.patch<{ Params: { idOrSlug: string } }>('/me/sellers/:idOrSlug', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });
    let body: Partial<z.infer<typeof upsertSchema>>;
    try {
      body = upsertSchema.partial().parse(request.body);
    } catch (e) {
      return reply.status(400).send({ error: (e as Error).message });
    }
    const store = await getMyStore(authUser.sub, request.params.idOrSlug);
    if (!store) return reply.status(404).send({ error: 'Loja não encontrada' });
    try {
      const updateData: any = {};
      if (body.shopName !== undefined) updateData.shopName = body.shopName;
      if (body.shopSlug !== undefined) updateData.shopSlug = body.shopSlug;
      if (body.about !== undefined) updateData.about = body.about;
      if (body.policies !== undefined) updateData.policies = body.policies as any;
      if (body.onChainStoreId !== undefined) {
        updateData.onChainStoreId = body.onChainStoreId == null ? null : BigInt(body.onChainStoreId);
      }
      if (body.ownerAddress !== undefined) {
        updateData.ownerAddress = body.ownerAddress ? String(body.ownerAddress).trim() : null;
      }
      if (body.operatorAddresses !== undefined) {
        updateData.operatorAddresses = Array.isArray(body.operatorAddresses)
          ? body.operatorAddresses.map((entry) => String(entry).trim()).filter(Boolean)
          : [];
      }

      const updated = await prisma.sellerProfile.update({
        where: { id: store.id },
        data: updateData,
        select: {
          id: true,
          shopName: true,
          shopSlug: true,
          about: true,
          ratingAvg: true,
          ratingCount: true,
          isDefault: true,
          onChainStoreId: true,
          ownerAddress: true,
          operatorAddresses: true,
        } as any,
      });
      return reply.send({ sellerProfile: serializeSellerProfile(updated) });
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
