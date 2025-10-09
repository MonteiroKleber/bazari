import { Worker } from 'bullmq';
import { connection, indexQueue } from '../lib/queue.js';
import { opensearchClient } from '../lib/opensearch.js';
import { prisma } from '../lib/prisma.js';
import { fetchIpfsJson } from '../lib/ipfs.js';
import { env } from '../env.js';

interface IndexJobData {
  storeId: string;
  version: number;
}

const worker = new Worker<IndexJobData>(
  'store-index',
  async (job) => {
    const { storeId, version } = job.data;

    console.log(`[indexer] Indexando loja ${storeId} v${version}`);

    // 1. Buscar snapshot (fallback se IPFS falhar)
    const snapshot = await prisma.storeSnapshot.findUnique({
      where: { storeId_version: { storeId, version } },
    });

    if (!snapshot) {
      throw new Error(`Snapshot não encontrado: ${storeId} v${version}`);
    }

    const productsJson = snapshot.productsJson as any;

    // 2. Indexar cada produto
    const indexName = env.OPENSEARCH_INDEX_STORES || 'bazari_stores';
    const bulkOps = [];

    for (const item of productsJson.items) {
      bulkOps.push({ index: { _index: indexName, _id: item.sku } });
      bulkOps.push({
        storeId,
        slug: (snapshot.storeJson as any).slug,
        onchain: {
          instanceId: parseInt(storeId, 10),
          owner: '', // TODO: buscar on-chain
        },
        title: item.title,
        description: item.description,
        category: {
          path: item.categoryId,
        },
        price: {
          amount: parseFloat(item.price.amount),
          currency: item.price.currency,
        },
        status: 'PUBLISHED',
        version,
        ipfs: {
          cid: (snapshot as any).productsCid,
        },
        sync: {
          lastIndexedAt: new Date().toISOString(),
        },
      });
    }

    if (bulkOps.length > 0) {
      await opensearchClient.bulk({ body: bulkOps, refresh: true });
    }

    console.log(`[indexer] Indexados ${productsJson.items.length} produtos`);
  },
  { connection }
);

worker.on('completed', (job) => {
  console.log(`[indexer] Job ${job.id} concluído`);
});

worker.on('failed', (job, err) => {
  console.error(`[indexer] Job ${job?.id} falhou:`, err);
});

export { worker as indexerWorker };
