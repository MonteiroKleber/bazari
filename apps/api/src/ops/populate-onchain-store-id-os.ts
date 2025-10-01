// Script para popular onChainStoreId nos documentos existentes do OpenSearch
// Lê do PostgreSQL e atualiza o OpenSearch via bulk update

import { PrismaClient } from '@prisma/client';
import { osClient } from '../lib/opensearch.js';
import { indexName } from '../lib/opensearchIndex.js';

const prisma = new PrismaClient();
const BATCH_SIZE = 100;

async function populateOnChainStoreId() {
  console.log('='.repeat(60));
  console.log('Popular onChainStoreId no OpenSearch');
  console.log('='.repeat(60));
  console.log('');

  if (!osClient) {
    console.error('❌ OpenSearch client não disponível');
    process.exit(1);
  }

  let totalUpdated = 0;

  // 1. Buscar produtos com onChainStoreId
  const products = await prisma.product.findMany({
    where: { onChainStoreId: { not: null } },
    select: { id: true, onChainStoreId: true },
  });

  console.log(`📦 Encontrados ${products.length} produtos com onChainStoreId`);

  // 2. Atualizar em lotes
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const body: any[] = [];

    for (const product of batch) {
      body.push({ update: { _index: indexName, _id: product.id } });
      body.push({
        doc: { onChainStoreId: product.onChainStoreId!.toString() },
        doc_as_upsert: false,
      });
    }

    try {
      const response = await osClient.bulk({ body } as any);
      if (response.body.errors) {
        const errors = response.body.items.filter((item: any) => item.update?.error);
        console.log(`   ⚠️  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${errors.length} erros`);
        if (errors.length > 0 && errors.length <= 3) {
          errors.forEach((err: any) => {
            console.log(`      - ${err.update.error.type}: ${err.update.error.reason}`);
          });
        }
      } else {
        totalUpdated += batch.length;
      }
      console.log(`   ✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} produtos`);
    } catch (err) {
      console.error(`   ❌ Erro no batch ${Math.floor(i / BATCH_SIZE) + 1}:`, err);
    }
  }

  // 3. Buscar serviços com onChainStoreId
  const services = await prisma.serviceOffering.findMany({
    where: { onChainStoreId: { not: null } },
    select: { id: true, onChainStoreId: true },
  });

  console.log('');
  console.log(`🛠️  Encontrados ${services.length} serviços com onChainStoreId`);

  // 4. Atualizar em lotes
  for (let i = 0; i < services.length; i += BATCH_SIZE) {
    const batch = services.slice(i, i + BATCH_SIZE);
    const body: any[] = [];

    for (const service of batch) {
      body.push({ update: { _index: indexName, _id: service.id } });
      body.push({
        doc: { onChainStoreId: service.onChainStoreId!.toString() },
        doc_as_upsert: false,
      });
    }

    try {
      const response = await osClient.bulk({ body } as any);
      if (response.body.errors) {
        const errors = response.body.items.filter((item: any) => item.update?.error);
        console.log(`   ⚠️  Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${errors.length} erros`);
        if (errors.length > 0 && errors.length <= 3) {
          errors.forEach((err: any) => {
            console.log(`      - ${err.update.error.type}: ${err.update.error.reason}`);
          });
        }
      } else {
        totalUpdated += batch.length;
      }
      console.log(`   ✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} serviços`);
    } catch (err) {
      console.error(`   ❌ Erro no batch ${Math.floor(i / BATCH_SIZE) + 1}:`, err);
    }
  }

  // 5. Refresh do índice
  console.log('');
  console.log('🔄 Forçando refresh do índice...');
  await osClient.indices.refresh({ index: indexName } as any);
  console.log('   ✅ Refresh concluído');

  console.log('');
  console.log('='.repeat(60));
  console.log('RESUMO');
  console.log('='.repeat(60));
  console.log(`Total de itens processados: ${products.length + services.length}`);
  console.log(`Total atualizado no OS:     ${totalUpdated}`);
  console.log('');
  console.log('✅ Atualização concluída!');
  console.log('='.repeat(60));
}

populateOnChainStoreId()
  .catch((err) => {
    console.error('');
    console.error('❌ Erro fatal:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
