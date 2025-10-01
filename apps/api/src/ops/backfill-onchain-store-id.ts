// Script de backfill do campo onChainStoreId no banco de dados
// Atualiza produtos/serviços existentes que têm sellerStoreId mas onChainStoreId null
// Uso: npx tsx src/ops/backfill-onchain-store-id.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BATCH_SIZE = 100;
const DRY_RUN = process.env.DRY_RUN !== 'false';

async function backfillOnChainStoreId() {
  console.log('='.repeat(60));
  console.log('Backfill de onChainStoreId no Banco de Dados');
  console.log('='.repeat(60));
  console.log(`Modo: ${DRY_RUN ? '[DRY RUN]' : '[LIVE]'}`);
  console.log('');

  let totalProductsProcessed = 0;
  let totalProductsUpdated = 0;
  let totalServicesProcessed = 0;
  let totalServicesUpdated = 0;

  // ========================================
  // BACKFILL PRODUTOS
  // ========================================
  console.log('📦 Processando PRODUTOS...');
  console.log('   Buscando produtos com sellerStoreId mas sem onChainStoreId...');

  const productsToUpdate = await prisma.product.findMany({
    where: {
      sellerStoreId: { not: null },
      onChainStoreId: null,
    },
    select: {
      id: true,
      sellerStoreId: true,
    },
  });

  console.log(`   Encontrados: ${productsToUpdate.length} produtos`);

  if (productsToUpdate.length > 0) {
    // Agrupar por sellerStoreId para otimizar queries
    const storeIdMap = new Map<string, bigint | null>();

    for (let i = 0; i < productsToUpdate.length; i += BATCH_SIZE) {
      const batch = productsToUpdate.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      for (const product of batch) {
        if (!product.sellerStoreId) continue;

        // Buscar onChainStoreId do SellerProfile (cache)
        if (!storeIdMap.has(product.sellerStoreId)) {
          const store = await prisma.sellerProfile.findUnique({
            where: { id: product.sellerStoreId },
            select: { onChainStoreId: true },
          });
          storeIdMap.set(product.sellerStoreId, store?.onChainStoreId ?? null);
        }

        const onChainStoreId = storeIdMap.get(product.sellerStoreId);

        if (onChainStoreId !== null && onChainStoreId !== undefined) {
          if (!DRY_RUN) {
            await prisma.product.update({
              where: { id: product.id },
              data: { onChainStoreId },
            });
          }
          totalProductsUpdated++;
        }

        totalProductsProcessed++;
      }

      console.log(`   Batch ${batchNum}: ${batch.length} produtos processados (total: ${totalProductsProcessed})`);
    }
  }

  // ========================================
  // BACKFILL SERVIÇOS
  // ========================================
  console.log('');
  console.log('🛠️  Processando SERVIÇOS...');
  console.log('   Buscando serviços com sellerStoreId mas sem onChainStoreId...');

  const servicesToUpdate = await prisma.serviceOffering.findMany({
    where: {
      sellerStoreId: { not: null },
      onChainStoreId: null,
    },
    select: {
      id: true,
      sellerStoreId: true,
    },
  });

  console.log(`   Encontrados: ${servicesToUpdate.length} serviços`);

  if (servicesToUpdate.length > 0) {
    // Agrupar por sellerStoreId para otimizar queries
    const storeIdMap = new Map<string, bigint | null>();

    for (let i = 0; i < servicesToUpdate.length; i += BATCH_SIZE) {
      const batch = servicesToUpdate.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      for (const service of batch) {
        if (!service.sellerStoreId) continue;

        // Buscar onChainStoreId do SellerProfile (cache)
        if (!storeIdMap.has(service.sellerStoreId)) {
          const store = await prisma.sellerProfile.findUnique({
            where: { id: service.sellerStoreId },
            select: { onChainStoreId: true },
          });
          storeIdMap.set(service.sellerStoreId, store?.onChainStoreId ?? null);
        }

        const onChainStoreId = storeIdMap.get(service.sellerStoreId);

        if (onChainStoreId !== null && onChainStoreId !== undefined) {
          if (!DRY_RUN) {
            await prisma.serviceOffering.update({
              where: { id: service.id },
              data: { onChainStoreId },
            });
          }
          totalServicesUpdated++;
        }

        totalServicesProcessed++;
      }

      console.log(`   Batch ${batchNum}: ${batch.length} serviços processados (total: ${totalServicesProcessed})`);
    }
  }

  // ========================================
  // RESUMO FINAL
  // ========================================
  console.log('');
  console.log('='.repeat(60));
  console.log('RESUMO DO BACKFILL');
  console.log('='.repeat(60));
  console.log(`Modo:                    ${DRY_RUN ? 'DRY RUN (nada foi alterado)' : 'LIVE'}`);
  console.log('');
  console.log('Produtos:');
  console.log(`  Processados:           ${totalProductsProcessed}`);
  console.log(`  Atualizados:           ${totalProductsUpdated}`);
  console.log(`  Sem onChainStoreId:    ${totalProductsProcessed - totalProductsUpdated}`);
  console.log('');
  console.log('Serviços:');
  console.log(`  Processados:           ${totalServicesProcessed}`);
  console.log(`  Atualizados:           ${totalServicesUpdated}`);
  console.log(`  Sem onChainStoreId:    ${totalServicesProcessed - totalServicesUpdated}`);
  console.log('');
  console.log(`Total atualizado:        ${totalProductsUpdated + totalServicesUpdated} itens`);
  console.log('');

  if (DRY_RUN) {
    console.log('💡 Para executar de verdade, rode:');
    console.log('   DRY_RUN=false npx tsx src/ops/backfill-onchain-store-id.ts');
  } else {
    console.log('✅ Backfill concluído com sucesso!');
    console.log('');
    console.log('🔍 Próximos passos:');
    console.log('   1. Rodar reindexação do OpenSearch:');
    console.log('      DRY_RUN=false npx tsx src/ops/reindex-onchain-store-id.ts');
    console.log('   2. Testar criação de novos produtos/serviços');
    console.log('   3. Verificar busca por onChainStoreId');
  }

  console.log('='.repeat(60));
}

// Executar
backfillOnChainStoreId()
  .catch((error) => {
    console.error('');
    console.error('❌ Erro fatal no backfill:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
