import { PrismaClient } from '@prisma/client';
import {
  buildStoreJson,
  buildCategoriesJson,
  buildProductsJson,
  calculateJsonHash,
  uploadJsonToIpfs,
} from '../lib/publishPipeline.js';
import { getStoresApi } from '../lib/storesChain.js';
import { indexQueue } from '../lib/queue.js';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';

const prisma = new PrismaClient();

async function republishStores() {
  await cryptoWaitReady();

  // Buscar lojas que precisam ser republicadas
  // Pode ser: syncStatus = 'pending' ou 'diverged' ou qualquer status que não seja 'SYNCED'
  const stores = await prisma.sellerProfile.findMany({
    where: {
      onChainStoreId: { not: null },
      OR: [
        { syncStatus: 'pending' },
        { syncStatus: 'DRAFT' },
        { syncStatus: 'diverged' },
        { syncStatus: 'DIVERGED' },
        { syncStatus: 'error' },
      ],
    },
    select: { id: true, shopSlug: true, shopName: true, onChainStoreId: true, syncStatus: true },
  });

  console.log(`\n═══════════════════════════════════════`);
  console.log(`Encontradas ${stores.length} lojas para republicar`);
  console.log(`═══════════════════════════════════════\n`);

  if (stores.length === 0) {
    console.log('Nenhuma loja para republicar');
    await prisma.$disconnect();
    process.exit(0);
  }

  const api = await getStoresApi();

  // Verificar se deve usar signer (para republish on-chain) ou apenas reindexar
  const shouldPublishOnChain = process.env.REPUBLISH_ONCHAIN === 'true';
  const keyring = new Keyring({ type: 'sr25519' });
  let pair: any = null;

  if (shouldPublishOnChain) {
    const suriFromEnv = process.env.REPUBLISH_SURI || process.env.MIGRATION_SURI || '//Alice';
    console.log(`Modo: Republicação ON-CHAIN com signer: ${suriFromEnv}`);
    pair = keyring.addFromUri(suriFromEnv);
  } else {
    console.log('Modo: Reindexação (sem publicação on-chain)');
    console.log('Para republicar on-chain, use: REPUBLISH_ONCHAIN=true\n');
  }

  let successful = 0;
  let failed = 0;
  let skipped = 0;

  for (const store of stores) {
    console.log(`\n[${store.shopSlug}] Processando...`);
    console.log(`  Status atual: ${store.syncStatus}`);
    console.log(`  Store ID: ${store.onChainStoreId}`);

    try {
      // Marcar como syncing
      await prisma.sellerProfile.update({
        where: { id: store.id },
        data: { syncStatus: 'syncing' },
      });

      // 1. Gerar JSONs
      console.log(`  [1/5] Gerando JSONs...`);
      const storeJson = await buildStoreJson(prisma, store.id);
      const categoriesJson = await buildCategoriesJson(prisma, store.id);
      const productsJson = await buildProductsJson(prisma, store.id);

      // 2. Upload para IPFS
      console.log(`  [2/5] Fazendo upload para IPFS...`);
      const storeCid = await uploadJsonToIpfs(storeJson, 'store.json');
      const categoriesCid = await uploadJsonToIpfs(categoriesJson, 'categories.json');
      const productsCid = await uploadJsonToIpfs(productsJson, 'products.json');

      console.log(`    store: ${storeCid}`);
      console.log(`    categories: ${categoriesCid}`);
      console.log(`    products: ${productsCid}`);

      // 3. Calcular hashes
      console.log(`  [3/5] Calculando hashes...`);
      const storeHash = calculateJsonHash(storeJson);
      const categoriesHash = calculateJsonHash(categoriesJson);
      const productsHash = calculateJsonHash(productsJson);

      let newVersion = 1;
      let blockNumber = '0';

      // 4. Publicar on-chain (se habilitado)
      if (shouldPublishOnChain && pair) {
        console.log(`  [4/5] Publicando on-chain...`);

        const tx = (api.tx as any).stores.publishStore(
          store.onChainStoreId!.toString(),
          Array.from(new TextEncoder().encode(storeCid)),
          Array.from(Buffer.from(storeHash, 'hex')),
          Array.from(new TextEncoder().encode(categoriesCid)),
          Array.from(Buffer.from(categoriesHash, 'hex')),
          Array.from(new TextEncoder().encode(productsCid)),
          Array.from(Buffer.from(productsHash, 'hex')),
        );

        const result: any = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Timeout aguardando finalização'));
          }, 60000);

          tx.signAndSend(pair, (res: any) => {
            if (res.dispatchError) {
              clearTimeout(timeout);
              let errorMessage = 'Dispatch error';

              if (res.dispatchError.isModule) {
                const decoded = api.registry.findMetaError(res.dispatchError.asModule);
                errorMessage = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
              } else {
                errorMessage = res.dispatchError.toString();
              }

              reject(new Error(errorMessage));
            }

            if (res.status.isFinalized) {
              clearTimeout(timeout);
              resolve(res);
            }
          });
        });

        blockNumber = result.status.asFinalized.toString();
        console.log(`    Block: ${blockNumber}`);

        // Extrair versão do evento
        const event = result.events.find(
          (r: any) => r.event.section === 'stores' && r.event.method === 'StorePublished'
        );
        if (event) {
          newVersion = parseInt(event.event.data[1]?.toString() || '1', 10);
          console.log(`    Versão: ${newVersion}`);
        }
      } else {
        console.log(`  [4/5] Pulando publicação on-chain (modo reindexação)`);
      }

      // 5. Salvar snapshot
      console.log(`  [5/5] Salvando snapshot...`);
      await prisma.storeSnapshot.create({
        data: {
          storeId: store.id,
          version: newVersion,
          storeJson: storeJson as any,
          categoriesJson: categoriesJson as any,
          productsJson: productsJson as any,
        },
      });

      // 6. Atualizar SellerProfile
      await prisma.sellerProfile.update({
        where: { id: store.id },
        data: {
          syncStatus: 'SYNCED',
          version: newVersion,
          lastSyncBlock: blockNumber ? BigInt(blockNumber) : null,
          lastPublishedAt: new Date(),
          metadataCid: storeCid,
          categoriesCid: categoriesCid,
          categoriesHash: categoriesHash,
          productsCid: productsCid,
          productsHash: productsHash,
        },
      });

      // 7. Disparar indexação no OpenSearch
      console.log(`  [✓] Enfileirando indexação no OpenSearch...`);
      await indexQueue.add('index-store', {
        storeId: store.id,
        version: newVersion,
      });

      console.log(`  ✓ Loja republicada com sucesso`);
      successful++;
    } catch (error) {
      console.error(`  ✗ Erro ao republicar:`, error instanceof Error ? error.message : error);

      // Reverter status para error
      await prisma.sellerProfile.update({
        where: { id: store.id },
        data: { syncStatus: 'error' },
      });

      failed++;
    }
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log('Republicação concluída');
  console.log(`Total: ${stores.length} lojas`);
  console.log(`Sucesso: ${successful}`);
  console.log(`Falhas: ${failed}`);
  console.log(`Puladas: ${skipped}`);
  console.log(`═══════════════════════════════════════\n`);

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

republishStores().catch((error) => {
  console.error('Erro fatal na republicação:', error);
  prisma.$disconnect().finally(() => process.exit(1));
});
