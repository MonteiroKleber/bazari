import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import {
  getStore,
  listStoresOwned,
  listStoresOperated,
} from '../lib/storesChain.js';
import { cryptoWaitReady, decodeAddress } from '@polkadot/util-crypto';

const storeIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'storeId deve ser um número inteiro positivo'),
});

const addressSchema = z.object({
  address: z.string().min(3),
});

export async function storesRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  // GET /stores/:slug - Busca dados da loja diretamente do PostgreSQL
  app.get<{ Params: { slug: string } }>('/stores/by-slug/:slug', async (request, reply) => {
    const slug = request.params.slug;

    // 1. Buscar dados do PostgreSQL (source of truth para catálogo)
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { shopSlug: slug },
      include: {
        products: {
          where: { status: 'PUBLISHED' },
          orderBy: { createdAt: 'desc' },
          include: { category: true },
        },
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

    // 3. Extrair categorias únicas dos produtos
    const categoriesMap = new Map<string, { id: string; name: string }>();
    for (const product of sellerProfile.products) {
      if (product.category) {
        categoriesMap.set(product.category.id, {
          id: product.category.id,
          name: product.category.namePt,
        });
      }
    }
    const categories = Array.from(categoriesMap.values());

    // 4. Formatar produtos
    const products = sellerProfile.products.map(product => ({
      sku: product.id,
      title: product.title,
      description: product.description || undefined,
      price: {
        amount: product.priceBzr.toString(),
        currency: 'BZR',
      },
      categoryId: product.categoryId || undefined,
      attributes: product.attributes as Record<string, any> || undefined,
    }));

    // 5. Extrair tema/policies
    const policies = sellerProfile.policies as any;
    const theme = policies?.theme;

    // 6. Montar resposta
    return reply.send({
      id: sellerProfile.onChainStoreId.toString(),
      slug: sellerProfile.shopSlug,
      onChain: {
        classId: 10,
        instanceId: sellerProfile.onChainStoreId.toString(),
        owner: onChainStore.owner,
        operators: onChainStore.operators,
        reputation: onChainStore.reputation,
      },
      theme: theme || null,
      sync: {
        status: sellerProfile.syncStatus,
        version: sellerProfile.version,
      },
      store: {
        name: sellerProfile.shopName,
        description: sellerProfile.about,
        theme: theme ? {
          layoutVariant: theme.layoutVariant,
          palette: theme.palette,
          logoUrl: sellerProfile.avatarUrl || undefined,
        } : undefined,
        policies: {
          returns: policies?.returns,
          shipping: policies?.shipping,
        },
      },
      categories,
      products,
    });
  });

  // GET /stores/:id - Busca dados da loja por storeId on-chain
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

      // Buscar dados complementares do PostgreSQL
      const sellerProfile = await prisma.sellerProfile.findFirst({
        where: { onChainStoreId: BigInt(parse.data.id) },
        select: {
          shopName: true,
          shopSlug: true,
          about: true,
          policies: true,
          avatarUrl: true,
          version: true,
          syncStatus: true,
        },
      });

      return reply.send({
        storeId: store.storeId,
        owner: store.owner,
        operators: store.operators,
        reputation: store.reputation,
        metadata: sellerProfile ? {
          name: sellerProfile.shopName,
          slug: sellerProfile.shopSlug,
          description: sellerProfile.about,
          logoUrl: sellerProfile.avatarUrl,
          policies: sellerProfile.policies,
        } : null,
        sync: sellerProfile ? {
          status: sellerProfile.syncStatus,
          version: sellerProfile.version,
        } : null,
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
