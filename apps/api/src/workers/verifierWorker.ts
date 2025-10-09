import { Worker } from 'bullmq';
import { connection, verifyQueue } from '../lib/queue.js';
import { prisma } from '../lib/prisma.js';
import { fetchIpfsJson } from '../lib/ipfs.js';
import { calculateJsonHash } from '../lib/publishPipeline.js';

const worker = new Worker(
  'store-verify',
  async (job) => {
    console.log('[verifier] Verificando lojas SYNCED...');

    const stores = await prisma.sellerProfile.findMany({
      where: { syncStatus: 'SYNCED' },
      select: {
        id: true,
        metadataCid: true,
        categoriesCid: true,
        categoriesHash: true,
        productsCid: true,
        productsHash: true,
      },
    });

    for (const store of stores) {
      try {
        // Verificar categories
        if (store.categoriesCid && store.categoriesHash) {
          const ipfs = await fetchIpfsJson(store.categoriesCid, 'stores');
          const hash = calculateJsonHash(ipfs.metadata as object);

          if (hash !== store.categoriesHash) {
            console.warn(`[verifier] DIVERGED: ${store.id} categories`);
            await prisma.sellerProfile.update({
              where: { id: store.id },
              data: { syncStatus: 'DIVERGED' },
            });
          }
        }

        // Verificar products
        if (store.productsCid && store.productsHash) {
          const ipfs = await fetchIpfsJson(store.productsCid, 'stores');
          const hash = calculateJsonHash(ipfs.metadata as object);

          if (hash !== store.productsHash) {
            console.warn(`[verifier] DIVERGED: ${store.id} products`);
            await prisma.sellerProfile.update({
              where: { id: store.id },
              data: { syncStatus: 'DIVERGED' },
            });
          }
        }
      } catch (error) {
        console.error(`[verifier] Erro ao verificar ${store.id}:`, error);
      }
    }

    console.log(`[verifier] Verificadas ${stores.length} lojas`);
  },
  { connection }
);

export { worker as verifierWorker };
