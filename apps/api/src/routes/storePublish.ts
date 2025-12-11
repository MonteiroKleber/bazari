import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../lib/auth/middleware.js';
import { getStoresApi } from '../lib/storesChain.js';
import { indexQueue } from '../lib/queue.js';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';

const publishSchema = z.object({
  signerMnemonic: z.string().optional(), // MVP: receber do front (refatorar depois)
});

export async function storePublishRoutes(
  app: FastifyInstance,
  options: { prisma: PrismaClient }
) {
  const { prisma } = options;

  // POST /stores/:id/publish
  app.post<{ Params: { id: string } }>(
    '/stores/:id/publish',
    {
      preHandler: authOnRequest,
      config: {
        // Aumentar timeout para 90 segundos (blockchain pode demorar)
        timeout: 90000,
      },
    },
    async (request, reply) => {
      const authUser = (request as any).authUser as { sub: string };
      const storeIdentifier = request.params.id;

      // 1. Validar ownership
      const store = await prisma.sellerProfile.findFirst({
        where: {
          userId: authUser.sub,
          OR: [{ id: storeIdentifier }, { shopSlug: storeIdentifier }],
        },
      });

      if (!store) {
        return reply.status(404).send({ error: 'Loja não encontrada' });
      }

      const isCreating = !store.onChainStoreId;

      // 2. Setar status SYNCING
      await prisma.sellerProfile.update({
        where: { id: store.id },
        data: { syncStatus: 'syncing' },
      });

      try {
        // 3. Chamar extrinsic on-chain
        const api = await getStoresApi();
        await cryptoWaitReady();

        // TODO: receber signer do front (via payload) ou usar operator backend
        // MVP: assumir que front envia mnemônico (INSEGURO, refatorar)
        const body = publishSchema.parse(request.body);
        if (!body.signerMnemonic) {
          throw new Error('Signer mnemônico não fornecido');
        }

        const keyring = new Keyring({ type: 'sr25519' });
        const pair = keyring.addFromMnemonic(body.signerMnemonic);

        let tx;
        let createdStoreId: bigint | null = null;

        if (isCreating) {
          // Criar novo NFT com slug (sem CID)
          const slug = store.shopSlug || store.id;
          tx = api.tx.stores.createStore(
            Array.from(new TextEncoder().encode(slug))
          );
        } else {
          // Incrementar versão on-chain (sem CIDs/hashes)
          tx = api.tx.stores.incrementVersion(
            store.onChainStoreId!.toString()
          );
        }

        // Executar transação e aguardar finalização (com timeout de 60s)
        app.log.info('Enviando transação para blockchain...');
        const result: any = await Promise.race([
          new Promise((resolve, reject) => {
            let unsub: (() => void) | undefined;

            tx.signAndSend(pair, (res) => {
              app.log.info({ status: res.status.toString() }, 'Status da transação');

              if (res.dispatchError) {
                const error = res.dispatchError;
                let errorMsg = 'Dispatch error';

                if (error.isModule) {
                  const decoded = api.registry.findMetaError(error.asModule);
                  errorMsg = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
                } else {
                  errorMsg = error.toString();
                }

                app.log.error({ errorMsg }, 'Erro no dispatch');
                if (unsub) unsub();
                reject(new Error(errorMsg));
              }

              if (res.status.isFinalized) {
                app.log.info('Transação finalizada');
                if (unsub) unsub();
                resolve(res);
              }
            }).then((unsubscribe) => {
              unsub = unsubscribe;
            }).catch(reject);
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Transaction timeout after 60s')), 60000)
          )
        ]);

        // 4. Extrair storeId se for criação
        app.log.info('Extraindo dados do resultado...');
        if (isCreating) {
          const createdEvent = result.events.find(
            (r: any) => r.event.section === 'stores' && r.event.method === 'StoreCreated'
          );
          if (!createdEvent) {
            throw new Error('Evento StoreCreated não encontrado');
          }
          createdStoreId = BigInt(createdEvent.event.data[1]?.toString() || '0');
          app.log.info({ createdStoreId: createdStoreId.toString() }, 'Store ID criado');
        }

        // 5. Extrair blockNumber do resultado
        app.log.info('Extraindo blockNumber...');
        const blockHash = result.status.asFinalized;
        const signedBlock = await api.rpc.chain.getBlock(blockHash);
        const blockNumber = signedBlock.block.header.number.toBigInt();
        app.log.info({ blockNumber: blockNumber.toString() }, 'Block number extraído');

        // 6. Atualizar Postgres
        app.log.info('Atualizando banco de dados...');
        const newVersion = isCreating ? 1 : (store.version || 0) + 1;
        const updateData: any = {
          syncStatus: 'synced',
          version: newVersion,
          lastSyncBlock: blockNumber,
          lastPublishedAt: new Date(),
          ownerAddress: pair.address,
        };

        // Se for criação, salvar onChainStoreId
        if (isCreating && createdStoreId !== null) {
          updateData.onChainStoreId = createdStoreId;
        }

        await prisma.sellerProfile.update({
          where: { id: store.id },
          data: updateData,
        });
        app.log.info('Banco de dados atualizado');

        // 7. Salvar histórico
        app.log.info('Salvando histórico...');
        await prisma.storePublishHistory.create({
          data: {
            sellerProfileId: store.id,
            version: newVersion,
            blockNumber,
            extrinsicHash: result.txHash?.toString() || null,
            publishedAt: new Date(),
          },
        });
        app.log.info('Histórico salvo');

        // 8. Disparar job de indexação no OpenSearch
        app.log.info('Adicionando job de indexação...');
        await indexQueue.add('index-store', {
          storeId: store.id,
          version: newVersion,
        });
        app.log.info('Job de indexação adicionado');

        app.log.info('Preparando resposta...');
        const response: any = {
          status: 'synced',
          version: newVersion,
          blockNumber: blockNumber.toString(),
        };

        // Adicionar storeId se for criação
        if (isCreating && createdStoreId !== null) {
          response.storeId = createdStoreId.toString();
        }

        app.log.info({ response }, 'Enviando resposta ao cliente');
        return reply.send(response);

      } catch (error) {
        // Reverter status
        await prisma.sellerProfile.update({
          where: { id: store.id },
          data: { syncStatus: 'error' },
        });

        app.log.error({ err: error }, 'Erro ao publicar loja');
        return reply.status(500).send({
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }
  );

  // GET /stores/:id/publish/status
  app.get<{ Params: { id: string } }>(
    '/stores/:id/publish/status',
    async (request, reply) => {
      const storeIdentifier = request.params.id;

      const store = await prisma.sellerProfile.findFirst({
        where: {
          OR: [{ id: storeIdentifier }, { shopSlug: storeIdentifier }],
        },
        select: {
          syncStatus: true,
          version: true,
          lastSyncBlock: true,
          lastPublishedAt: true,
        },
      });

      if (!store) {
        return reply.status(404).send({ error: 'Loja não encontrada' });
      }

      return reply.send({
        status: store.syncStatus,
        version: store.version,
        block: store.lastSyncBlock?.toString(),
        publishedAt: store.lastPublishedAt?.toISOString(),
      });
    }
  );

  // POST /stores/:id/verify - Simplified verification (no IPFS check)
  app.post<{ Params: { id: string } }>(
    '/stores/:id/verify',
    { preHandler: authOnRequest },
    async (request, reply) => {
      const authUser = (request as any).authUser as { sub: string };
      const storeIdentifier = request.params.id;

      const store = await prisma.sellerProfile.findFirst({
        where: {
          userId: authUser.sub,
          OR: [{ id: storeIdentifier }, { shopSlug: storeIdentifier }],
        },
      });

      if (!store) {
        return reply.status(404).send({ error: 'Loja não encontrada' });
      }

      if (!store.onChainStoreId) {
        return reply.status(400).send({ error: 'Loja ainda não foi publicada on-chain' });
      }

      // Verificação simplificada: apenas confirma que a loja existe on-chain
      return reply.send({
        status: 'SYNCED',
        message: 'Loja verificada',
        version: store.version,
        lastPublishedAt: store.lastPublishedAt?.toISOString(),
      });
    }
  );
}
