import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../lib/auth/middleware.js';
import { getStore, listStoresOwned, listStoresWithPendingTransferTo } from '../lib/storesChain.js';

const upsertSchema = z.object({
  shopName: z.string().min(1),
  shopSlug: z.string().min(3).max(30),
  about: z.string().max(8000).optional(),
  policies: z.record(z.any()).optional(),
  onChainStoreId: z.union([z.string(), z.number(), z.bigint()]).nullish(),
  ownerAddress: z.string().min(3).max(128).nullish(),
  operatorAddresses: z.array(z.string().min(3)).max(32).nullish(),
});

type PendingTransferEntry = {
  storeId: string;
  shopSlug: string;
  shopName: string;
  dbId: string;
  currentOwnerAddress: string;
  state: 'pending' | 'claimable';
  targetOwnerAddress: string;
};

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

  // GET /me/sellers/pending-transfers — lista lojas com transferência pendente para o usuário
  app.get('/me/sellers/pending-transfers', { preHandler: authOnRequest }, async (request, reply) => {
    console.log('[pending-transfers] Request received');
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) {
      console.log('[pending-transfers] No authUser, returning 401');
      return reply.status(401).send({ error: 'Token inválido.' });
    }

    console.log('[pending-transfers] Starting, prisma available:', !!prisma, 'userId:', authUser.sub);

    try {
      // Buscar endereço(s) do usuário (pode ter múltiplas carteiras)
      const accountDelegate = (prisma as unknown as { account?: { findMany: Function } }).account;
      let userAddresses: Array<{ address: string }> = [];

      if (accountDelegate?.findMany) {
        userAddresses = await accountDelegate.findMany({
          where: { userId: authUser.sub },
          select: { address: true },
        });
      } else {
        const userRecord = await prisma.user.findUnique({
          where: { id: authUser.sub },
          select: { address: true },
        });

        if (userRecord?.address) {
          userAddresses = [{ address: userRecord.address }];
        }
      }

      const addressList = Array.from(new Set(userAddresses.map((entry) => entry.address).filter(Boolean)));

      if (addressList.length === 0) {
        return reply.send({ pendingTransfers: [] });
      }

      // Buscar lojas com transferências pendentes para cada endereço
      const allPendingStoreIds = new Map<bigint, string>();
      for (const address of addressList) {
        const storeIds = await listStoresWithPendingTransferTo(address);
        for (const storeId of storeIds) {
          allPendingStoreIds.set(storeId, address);
        }
      }

      const ownedStoreIds = new Map<bigint, string>();
      for (const address of addressList) {
        try {
          const ownedIds = await listStoresOwned(address);
          for (const storeIdStr of ownedIds) {
            try {
              const storeId = BigInt(storeIdStr);
              ownedStoreIds.set(storeId, address);
            } catch {}
          }
        } catch (error) {
          request.log?.warn({ err: error, address }, '[pending-transfers] Failed to list on-chain stores owned by address');
        }
      }

      const storeIdsToFetch = new Set<bigint>();
      for (const id of allPendingStoreIds.keys()) storeIdsToFetch.add(id);
      for (const id of ownedStoreIds.keys()) storeIdsToFetch.add(id);

      if (storeIdsToFetch.size === 0) {
        return reply.send({ pendingTransfers: [] });
      }

      // Buscar informações das lojas no banco
      const stores = await prisma.sellerProfile.findMany({
        where: {
          onChainStoreId: { in: Array.from(storeIdsToFetch) },
        },
        select: {
          id: true,
          userId: true,
          shopName: true,
          shopSlug: true,
          onChainStoreId: true,
          ownerAddress: true,
        },
      });

      const pendingTransfers = stores.reduce<PendingTransferEntry[]>((acc, store) => {
        if (!store.onChainStoreId) return acc;
        const storeIdBig = store.onChainStoreId;
        const storeIdStr = storeIdBig.toString();
        const pendingTarget = allPendingStoreIds.get(storeIdBig);
        const ownedTarget = ownedStoreIds.get(storeIdBig);

        const isPending = Boolean(pendingTarget);
        const isClaimable = !isPending && ownedTarget && store.userId !== authUser.sub;

        if (!isPending && !isClaimable) {
          return acc;
        }

        acc.push({
          storeId: storeIdStr,
          shopSlug: store.shopSlug,
          shopName: store.shopName,
          dbId: store.id,
          currentOwnerAddress: store.ownerAddress || '',
          state: isPending ? 'pending' : 'claimable',
          targetOwnerAddress: isPending ? pendingTarget ?? '' : ownedTarget ?? '',
        });

        return acc;
      }, []);

      return reply.send({ pendingTransfers });
    } catch (e: any) {
      console.error('[me.sellers] Error fetching pending transfers:', e);
      return reply.status(500).send({ error: 'Erro ao buscar transferências pendentes' });
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
        syncStatus: (store as any).syncStatus ?? null,
        version: (store as any).version ?? null,
        lastSyncBlock: (store as any).lastSyncBlock?.toString() ?? null,
        lastPublishedAt: (store as any).lastPublishedAt ?? null,
        metadataCid: (store as any).metadataCid ?? null,
        categoriesCid: (store as any).categoriesCid ?? null,
        categoriesHash: (store as any).categoriesHash ?? null,
        productsCid: (store as any).productsCid ?? null,
        productsHash: (store as any).productsHash ?? null,
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

    const idOrSlug = request.params.idOrSlug;
    const requestedOwnerAddress = typeof body.ownerAddress === 'string' ? String(body.ownerAddress).trim() : undefined;
    let store = await getMyStore(authUser.sub, idOrSlug);
    let transferClaim = false;

    if (!store) {
      const fallbackStore = await prisma.sellerProfile.findFirst({
        where: { OR: [ { id: idOrSlug }, { shopSlug: idOrSlug } ] },
      });

      if (fallbackStore?.onChainStoreId && requestedOwnerAddress) {
        try {
          const onChain = await getStore(fallbackStore.onChainStoreId);
          if (onChain && onChain.owner === requestedOwnerAddress) {
            store = fallbackStore;
            transferClaim = true;
          }
        } catch (error) {
          request.log?.warn({ err: error, storeId: fallbackStore.onChainStoreId?.toString?.() }, '[me.sellers] Failed to verify on-chain ownership during transfer claim');
        }
      } else if (fallbackStore?.ownerAddress && requestedOwnerAddress && fallbackStore.ownerAddress === requestedOwnerAddress) {
        store = fallbackStore;
        transferClaim = true;
      }
    }

    if (!store) return reply.status(404).send({ error: 'Loja não encontrada' });

    if (transferClaim) {
      if (!requestedOwnerAddress) {
        return reply.status(400).send({ error: 'Informe o novo endereço do dono para concluir a transferência.' });
      }

      const allowedKeys = ['ownerAddress'];
      const disallowed = Object.entries(body).filter(([key, value]) => value !== undefined && !allowedKeys.includes(key as string));
      if (disallowed.length > 0) {
        return reply.status(403).send({ error: 'Transferência só permite atualizar o endereço do dono.' });
      }
    }

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

      if (transferClaim && store.userId !== authUser.sub) {
        updateData.userId = authUser.sub;
        updateData.isDefault = false;
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
