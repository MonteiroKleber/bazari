import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Worker para atualizar estatísticas de afiliados a cada 1 hora
 */
async function updateAffiliateStats() {
  console.log('[Affiliate Stats Worker] Starting update...');

  try {
    // Buscar todos os afiliados aprovados
    const affiliates = await prisma.chatStoreAffiliate.findMany({
      where: {
        status: 'approved',
      },
      select: {
        id: true,
        promoterId: true,
        storeId: true,
      },
    });

    console.log(`[Affiliate Stats Worker] Found ${affiliates.length} approved affiliates`);

    let updated = 0;
    let errors = 0;

    // Para cada afiliado, calcular estatísticas
    for (const affiliate of affiliates) {
      try {
        // Buscar todas as vendas deste afiliado
        const sales = await prisma.affiliateSale.findMany({
          where: {
            storeId: affiliate.storeId,
            promoter: affiliate.promoterId,
            status: 'split', // Apenas vendas completadas
          },
          select: {
            amount: true,
            commissionAmount: true,
          },
        });

        // Calcular totais
        const totalSales = sales.reduce((sum, sale) => {
          return sum.add(sale.amount);
        }, new Prisma.Decimal(0));

        const totalCommission = sales.reduce((sum, sale) => {
          return sum.add(sale.commissionAmount);
        }, new Prisma.Decimal(0));

        const salesCount = sales.length;

        // Atualizar afiliado
        await prisma.chatStoreAffiliate.update({
          where: { id: affiliate.id },
          data: {
            totalSales,
            totalCommission,
            salesCount,
            updatedAt: BigInt(Date.now()),
          },
        });

        updated++;

        console.log(
          `[Affiliate Stats Worker] Updated affiliate ${affiliate.id}: ${salesCount} sales, ${totalSales.toString()} BZR total, ${totalCommission.toString()} BZR commission`
        );
      } catch (error) {
        errors++;
        console.error(
          `[Affiliate Stats Worker] Error updating affiliate ${affiliate.id}:`,
          error
        );
      }
    }

    console.log(
      `[Affiliate Stats Worker] Update complete: ${updated} updated, ${errors} errors`
    );

    // NOVO: Atualizar estatísticas dos marketplaces
    await updateMarketplaceStats();
  } catch (error) {
    console.error('[Affiliate Stats Worker] Error in updateAffiliateStats:', error);
  }
}

/**
 * Atualiza estatísticas dos marketplaces de afiliados
 */
async function updateMarketplaceStats() {
  console.log('[Affiliate Stats Worker] Updating marketplace stats...');

  try {
    const marketplaces = await prisma.affiliateMarketplace.findMany({
      where: { isActive: true },
      select: { id: true, ownerId: true },
    });

    console.log(`[Affiliate Stats Worker] Found ${marketplaces.length} active marketplaces`);

    let updated = 0;
    let errors = 0;

    for (const marketplace of marketplaces) {
      try {
        // Buscar vendas do marketplace
        const sales = await prisma.affiliateSale.findMany({
          where: {
            marketplaceId: marketplace.id,
            status: 'split',
          },
          select: {
            amount: true,
            commissionAmount: true,
          },
        });

        // Contar produtos
        const productCount = await prisma.affiliateProduct.count({
          where: { marketplaceId: marketplace.id },
        });

        // Calcular totais
        const totalRevenue = sales.reduce((sum, sale) => {
          return sum.add(sale.amount);
        }, new Prisma.Decimal(0));

        const totalCommission = sales.reduce((sum, sale) => {
          return sum.add(sale.commissionAmount);
        }, new Prisma.Decimal(0));

        const totalSales = sales.length;

        // Atualizar marketplace
        await prisma.affiliateMarketplace.update({
          where: { id: marketplace.id },
          data: {
            totalSales,
            totalRevenue,
            totalCommission,
            productCount,
            updatedAt: BigInt(Date.now()),
          },
        });

        updated++;

        console.log(
          `[Affiliate Stats Worker] Updated marketplace ${marketplace.id}: ${totalSales} sales, ${totalRevenue.toString()} BZR revenue, ${productCount} products`
        );
      } catch (error) {
        errors++;
        console.error(
          `[Affiliate Stats Worker] Error updating marketplace ${marketplace.id}:`,
          error
        );
      }
    }

    console.log(
      `[Affiliate Stats Worker] Marketplace stats complete: ${updated} updated, ${errors} errors`
    );
  } catch (error) {
    console.error('[Affiliate Stats Worker] Error in updateMarketplaceStats:', error);
  }
}

// Executar imediatamente ao iniciar
updateAffiliateStats();

// Executar a cada 1 hora
const ONE_HOUR = 60 * 60 * 1000;
const intervalId = setInterval(updateAffiliateStats, ONE_HOUR);

console.log('[Affiliate Stats Worker] Worker started, will run every 1 hour');

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[Affiliate Stats Worker] Shutting down...');
  clearInterval(intervalId);
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[Affiliate Stats Worker] Shutting down...');
  clearInterval(intervalId);
  await prisma.$disconnect();
  process.exit(0);
});

// Export for manual execution or testing
export { updateAffiliateStats };
