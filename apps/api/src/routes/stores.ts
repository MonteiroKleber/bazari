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

const storeIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'storeId deve ser um número inteiro positivo'),
});

const addressSchema = z.object({
  address: z.string().min(3),
});

export async function storesRoutes(app: FastifyInstance, _options: { prisma: PrismaClient }) {
  if (!env.STORE_ONCHAIN_V1) {
    return;
  }

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
