import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { env } from '../env.js';
import { fetchIpfsJson } from '../lib/ipfs.js';
import {
  getStore,
  listStoresOwned,
  listStoresOperated,
  resolveStoreCidWithSource,
} from '../lib/storesChain.js';
import { cryptoWaitReady, decodeAddress } from '@polkadot/util-crypto';
import { calculateJsonHash } from '../lib/publishPipeline.js';

const storeIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'storeId deve ser um número inteiro positivo'),
});

const addressSchema = z.object({
  address: z.string().min(3),
});

export async function storesRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  // GET /stores/:slug - New endpoint with IPFS fallback and hash validation
  app.get<{ Params: { slug: string } }>('/stores/by-slug/:slug', async (request, reply) => {
    const slug = request.params.slug;

    // 1. Resolver slug → storeId
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { shopSlug: slug },
      select: {
        id: true,
        shopName: true,
        shopSlug: true,
        onChainStoreId: true,
        version: true,
        metadataCid: true,
        categoriesCid: true,
        categoriesHash: true,
        productsCid: true,
        productsHash: true,
        syncStatus: true,
      },
    });

    if (!sellerProfile || !sellerProfile.onChainStoreId) {
      return reply.status(404).send({ error: 'Loja não encontrada' });
    }

    // 2. Buscar dados on-chain (owner, operators, reputation)
    const onChainStore = await getStore(sellerProfile.onChainStoreId.toString());
    if (!onChainStore) {
      return reply.status(404).send({ error: 'Loja on-chain não encontrada' });
    }

    // 3. Tentar fetch IPFS + validação
    let source: 'ipfs' | 'postgres' = 'ipfs';
    let storeData: any;
    let categoriesData: any[] = [];
    let productsData: any[] = [];

    try {
      // Fetch store.json
      const storeIpfs = await fetchIpfsJson(sellerProfile.metadataCid!, 'stores');

      // Note: We validate categories/products hash but not store hash
      // because store.json doesn't have a dedicated hash field yet
      storeData = storeIpfs.metadata;

      // Fetch categories.json
      if (sellerProfile.categoriesCid) {
        const categoriesIpfs = await fetchIpfsJson(sellerProfile.categoriesCid, 'stores');
        const categoriesHashLocal = calculateJsonHash(categoriesIpfs.metadata);

        if (categoriesHashLocal !== sellerProfile.categoriesHash) {
          app.log.warn({ storeId: sellerProfile.id }, 'Hash de categorias divergente');
          await prisma.sellerProfile.update({
            where: { id: sellerProfile.id },
            data: { syncStatus: 'diverged' },
          });
          throw new Error('Hash de categorias divergente');
        }

        categoriesData = categoriesIpfs.metadata?.categories || [];
      }

      // Fetch products.json
      if (sellerProfile.productsCid) {
        const productsIpfs = await fetchIpfsJson(sellerProfile.productsCid, 'stores');
        const productsHashLocal = calculateJsonHash(productsIpfs.metadata);

        if (productsHashLocal !== sellerProfile.productsHash) {
          app.log.warn({ storeId: sellerProfile.id }, 'Hash de produtos divergente');
          await prisma.sellerProfile.update({
            where: { id: sellerProfile.id },
            data: { syncStatus: 'diverged' },
          });
          throw new Error('Hash de produtos divergente');
        }

        productsData = productsIpfs.metadata?.items || [];
      }

    } catch (error) {
      // Fallback para snapshot Postgres
      app.log.warn({ err: error, storeId: sellerProfile.id }, 'IPFS fetch falhou, usando cache');

      const snapshot = await prisma.storeSnapshot.findFirst({
        where: { storeId: sellerProfile.id },
        orderBy: { version: 'desc' },
      });

      if (!snapshot) {
        return reply.status(503).send({ error: 'IPFS indisponível e sem cache' });
      }

      source = 'postgres';
      storeData = snapshot.storeJson;
      categoriesData = (snapshot.categoriesJson as any)?.categories || [];
      productsData = (snapshot.productsJson as any)?.items || [];

      // Atualizar status para fallback
      await prisma.sellerProfile.update({
        where: { id: sellerProfile.id },
        data: { syncStatus: 'fallback' },
      });
    }

    // 4. Montar resposta
    return reply.send({
      id: sellerProfile.onChainStoreId.toString(),
      slug: sellerProfile.shopSlug,
      onChain: {
        classId: 10, // TODO: pegar do config
        instanceId: sellerProfile.onChainStoreId.toString(),
        owner: onChainStore.owner,
        metadataCid: sellerProfile.metadataCid,
        attributes: {
          store_cid: sellerProfile.metadataCid,
          categories_cid: sellerProfile.categoriesCid,
          categories_hash: sellerProfile.categoriesHash,
          products_cid: sellerProfile.productsCid,
          products_hash: sellerProfile.productsHash,
        },
      },
      theme: (storeData as any)?.theme || null,
      sync: {
        status: sellerProfile.syncStatus,
        source,
        lastCheckedAt: new Date().toISOString(),
      },
      store: storeData,
      categories: categoriesData,
      products: productsData,
    });
  });

  // GET /stores/:id - Original endpoint (kept for backwards compatibility)
  app.get<{ Params: { id: string } }>('/stores/:id', async (request, reply) => {
    const parse = storeIdSchema.safeParse(request.params);
    if (!parse.success) {
      return reply.status(400).send({ error: parse.error.issues[0]?.message ?? 'Parâmetros inválidos' });
    }

    try {
      const store = await getStore(parse.data.id);
      if (!store) {
        return reply.status(404).send({ error: 'Loja on-chain não encontrada' });
      }

      const { cid, source: cidSource } = await resolveStoreCidWithSource(parse.data.id);
      const metadataResult =
        cidSource === 'placeholder'
          ? { metadata: null, source: 'placeholder' as const }
          : await fetchIpfsJson(cid, cidSource);

      return reply.send({
        storeId: store.storeId,
        owner: store.owner,
        operators: store.operators,
        reputation: store.reputation,
        cid,
        metadata: metadataResult.metadata,
        source: metadataResult.source,
      });
    } catch (error) {
      request.log.error({ err: error }, 'Erro ao consultar loja on-chain');
      return reply.status(503).send({ error: 'Chain indisponível no momento' });
    }
  });

  app.get<{ Params: { address: string } }>('/users/:address/stores-owned', async (request, reply) => {
    try {
      const parse = addressSchema.parse(request.params);
      await cryptoWaitReady();
      decodeAddress(parse.address);
      const storeIds = await listStoresOwned(parse.address);
      return reply.send({ storeIds });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Invalid decoded address')) {
        return reply.status(400).send({ error: 'Endereço inválido' });
      }
      request.log.error({ err: error }, 'Erro ao listar lojas owned on-chain');
      return reply.status(503).send({ error: 'Chain indisponível no momento' });
    }
  });

  app.get<{ Params: { address: string } }>('/users/:address/stores-operated', async (request, reply) => {
    try {
      const parse = addressSchema.parse(request.params);
      await cryptoWaitReady();
      decodeAddress(parse.address);
      const storeIds = await listStoresOperated(parse.address);
      return reply.send({ storeIds });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Invalid decoded address')) {
        return reply.status(400).send({ error: 'Endereço inválido' });
      }
      request.log.error({ err: error }, 'Erro ao listar lojas operadas on-chain');
      return reply.status(503).send({ error: 'Chain indisponível no momento' });
    }
  });
}
