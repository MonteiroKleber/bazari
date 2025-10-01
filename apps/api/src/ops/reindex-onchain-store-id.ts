// Script de reindexação do campo onChainStoreId no OpenSearch
// Atualiza todos os documentos existentes com o campo onChainStoreId
// Uso: npx tsx src/ops/reindex-onchain-store-id.ts

import { PrismaClient } from '@prisma/client';
import { osClient, osEnabled } from '../lib/opensearch.js';
import { indexName } from '../lib/opensearchIndex.js';

const prisma = new PrismaClient();
const BATCH_SIZE = 100;
const DRY_RUN = process.env.DRY_RUN !== 'false';

async function reindexOnChainStoreId() {
  console.log('='.repeat(60));
  console.log('Reindexação de onChainStoreId no OpenSearch');
  console.log('='.repeat(60));
  console.log(`Modo: ${DRY_RUN ? '[DRY RUN]' : '[LIVE]'}`);
  console.log(`Índice: ${indexName}`);
  console.log('');

  if (!osEnabled || !osClient) {
    console.log('❌ OpenSearch não está habilitado ou client não disponível');
    console.log('   Verifique as variáveis de ambiente:');
    console.log('   - USE_OPENSEARCH=true');
    console.log('   - OPENSEARCH_URL=...');
    return;
  }

  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  // ========================================
  // REINDEXAR PRODUTOS
  // ========================================
  console.log('📦 Processando PRODUTOS...');

  let offset = 0;
  let productBatch = 0;

  while (true) {
    const products = await prisma.product.findMany({
      where: { onChainStoreId: { not: null } },
      select: { id: true, onChainStoreId: true },
      skip: offset,
      take: BATCH_SIZE,
    });

    if (products.length === 0) break;

    productBatch++;

    // Construir bulk operations
    const bulkOps = products.flatMap(p => [
      { update: { _index: indexName, _id: p.id } },
      { doc: { onChainStoreId: p.onChainStoreId!.toString() } },
    ]);

    if (!DRY_RUN) {
      try {
        const response = await osClient.bulk({ body: bulkOps, refresh: false });

        if (response.body?.errors) {
          console.log(`   ⚠️  Batch ${productBatch}: Alguns erros detectados`);
          const errorItems = response.body.items?.filter((item: any) => item.update?.error);
          if (errorItems?.length > 0) {
            console.log(`   Erros (primeiros 3):`);
            errorItems.slice(0, 3).forEach((item: any) => {
              console.log(`      - ID ${item.update._id}: ${item.update.error.type}`);
            });
          }
        }
      } catch (error) {
        console.log(`   ❌ Erro no batch ${productBatch}:`, error instanceof Error ? error.message : error);
        throw error;
      }
    }

    totalProcessed += products.length;
    totalUpdated += products.length;
    offset += BATCH_SIZE;

    console.log(`   Batch ${productBatch}: ${products.length} produtos (total: ${totalProcessed})`);
  }

  // ========================================
  // REINDEXAR SERVIÇOS
  // ========================================
  console.log('');
  console.log('🛠️  Processando SERVIÇOS...');

  offset = 0;
  let serviceBatch = 0;

  while (true) {
    const services = await prisma.serviceOffering.findMany({
      where: { onChainStoreId: { not: null } },
      select: { id: true, onChainStoreId: true },
      skip: offset,
      take: BATCH_SIZE,
    });

    if (services.length === 0) break;

    serviceBatch++;

    // Construir bulk operations
    const bulkOps = services.flatMap(s => [
      { update: { _index: indexName, _id: s.id } },
      { doc: { onChainStoreId: s.onChainStoreId!.toString() } },
    ]);

    if (!DRY_RUN) {
      try {
        const response = await osClient.bulk({ body: bulkOps, refresh: false });

        if (response.body?.errors) {
          console.log(`   ⚠️  Batch ${serviceBatch}: Alguns erros detectados`);
        }
      } catch (error) {
        console.log(`   ❌ Erro no batch ${serviceBatch}:`, error instanceof Error ? error.message : error);
        throw error;
      }
    }

    totalProcessed += services.length;
    totalUpdated += services.length;
    offset += BATCH_SIZE;

    console.log(`   Batch ${serviceBatch}: ${services.length} serviços (total: ${totalProcessed})`);
  }

  // ========================================
  // PROCESSAR ITENS SEM onChainStoreId
  // ========================================
  console.log('');
  console.log('🔍 Processando itens SEM onChainStoreId (limpeza)...');

  // Produtos sem onChainStoreId
  const productsWithout = await prisma.product.findMany({
    where: { onChainStoreId: null },
    select: { id: true },
    take: 10, // Sample para log
  });

  // Serviços sem onChainStoreId
  const servicesWithout = await prisma.serviceOffering.findMany({
    where: { onChainStoreId: null },
    select: { id: true },
    take: 10, // Sample para log
  });

  const totalWithout =
    (await prisma.product.count({ where: { onChainStoreId: null } })) +
    (await prisma.serviceOffering.count({ where: { onChainStoreId: null } }));

  totalSkipped = totalWithout;

  console.log(`   ℹ️  ${totalWithout} itens sem onChainStoreId (não atualizados)`);
  if (productsWithout.length > 0) {
    console.log(`   Exemplo de produtos: ${productsWithout.slice(0, 3).map(p => p.id).join(', ')}`);
  }
  if (servicesWithout.length > 0) {
    console.log(`   Exemplo de serviços: ${servicesWithout.slice(0, 3).map(s => s.id).join(', ')}`);
  }

  // ========================================
  // REFRESH DO ÍNDICE
  // ========================================
  if (!DRY_RUN) {
    console.log('');
    console.log('🔄 Forçando refresh do índice...');
    try {
      await osClient.indices.refresh({ index: indexName });
      console.log('   ✅ Refresh concluído');
    } catch (error) {
      console.log('   ⚠️  Erro ao fazer refresh:', error instanceof Error ? error.message : error);
    }
  }

  // ========================================
  // RESUMO FINAL
  // ========================================
  console.log('');
  console.log('='.repeat(60));
  console.log('RESUMO DA REINDEXAÇÃO');
  console.log('='.repeat(60));
  console.log(`Modo:              ${DRY_RUN ? 'DRY RUN (nada foi alterado)' : 'LIVE'}`);
  console.log(`Total processado:  ${totalProcessed} itens`);
  console.log(`Total atualizado:  ${totalUpdated} documentos`);
  console.log(`Total sem ID:      ${totalSkipped} itens (ignorados)`);
  console.log('');

  if (DRY_RUN) {
    console.log('💡 Para executar de verdade, rode:');
    console.log('   DRY_RUN=false npx tsx src/ops/reindex-onchain-store-id.ts');
  } else {
    console.log('✅ Reindexação concluída com sucesso!');
    console.log('');
    console.log('🔍 Próximos passos:');
    console.log('   1. Testar busca: GET /search?onChainStoreId=123');
    console.log('   2. Verificar documentos no OpenSearch');
    console.log('   3. Considerar rodar backfill para preencher itens sem onChainStoreId');
  }

  console.log('='.repeat(60));
}

// Executar
reindexOnChainStoreId()
  .catch((error) => {
    console.error('');
    console.error('❌ Erro fatal na reindexação:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
