import { PrismaClient } from '@prisma/client';
import { getStoresApi } from '../lib/storesChain.js';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';

const prisma = new PrismaClient();

async function migrateStores() {
  await cryptoWaitReady();
  const api = await getStoresApi();

  // Buscar lojas sem onChainStoreId
  const stores = await prisma.sellerProfile.findMany({
    where: { onChainStoreId: null },
    select: { id: true, shopSlug: true, shopName: true, userId: true },
  });

  console.log(`Encontradas ${stores.length} lojas sem NFT`);

  if (stores.length === 0) {
    console.log('Nenhuma loja para migrar');
    await prisma.$disconnect();
    process.exit(0);
  }

  // TODO: definir signer (usar sudo ou operator backend)
  const keyring = new Keyring({ type: 'sr25519' });
  const suriFromEnv = process.env.MIGRATION_SURI || '//Alice';
  console.log(`Usando signer: ${suriFromEnv}`);
  const pair = keyring.addFromUri(suriFromEnv);

  let migrated = 0;
  let failed = 0;

  for (const store of stores) {
    console.log(`\nMigrando loja ${store.id} (${store.shopSlug})...`);

    try {
      // Criar NFT com placeholder CID
      const cid = `ipfs://placeholder-${store.id}`; // temporário
      const cidBytes = Array.from(new TextEncoder().encode(cid));

      console.log(`  Criando NFT com CID: ${cid}`);
      const tx = (api.tx as any).stores.createStore(cidBytes);

      const result = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout aguardando finalização'));
        }, 60000); // 60 segundos timeout

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

      // Extrair storeId do evento
      const event = result.events.find(
        (r: any) => r.event.section === 'stores' && r.event.method === 'StoreCreated'
      );
      const storeId = event?.event.data[1]?.toString();

      if (!storeId) {
        throw new Error('StoreId não retornado no evento StoreCreated');
      }

      console.log(`  NFT criado com storeId=${storeId}`);

      // Atualizar Postgres
      await prisma.sellerProfile.update({
        where: { id: store.id },
        data: {
          onChainStoreId: BigInt(storeId),
          syncStatus: 'pending',
          ownerAddress: pair.address,
        },
      });

      console.log(`  ✓ Loja migrada com sucesso`);
      migrated++;
    } catch (error) {
      console.error(`  ✗ Erro ao migrar ${store.id}:`, error instanceof Error ? error.message : error);
      failed++;
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log('Migração concluída');
  console.log(`Total: ${stores.length} lojas`);
  console.log(`Migradas: ${migrated}`);
  console.log(`Falhas: ${failed}`);
  console.log('═══════════════════════════════════════\n');

  await prisma.$disconnect();
  process.exit(0);
}

migrateStores().catch((error) => {
  console.error('Erro fatal na migração:', error);
  prisma.$disconnect().finally(() => process.exit(1));
});
