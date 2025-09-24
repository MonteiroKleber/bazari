import { PrismaClient } from '@prisma/client';

/**
 * Backfill script: sets Product.sellerUserId using Dao.ownerUserId or fallback User by address.
 * Safe to run multiple times.
 */
async function main() {
  const prisma = new PrismaClient();
  const BATCH = 200;
  let updated = 0;

  try {
    // Fetch in batches. Prefer selecting only those with sellerUserId NULL, but fall back if the field
    // is not recognized by the current Prisma client (older client or pre-generate).
    while (true) {
      let products: Array<{ id: string; daoId: string }> = [];
      try {
        products = await prisma.product.findMany({
          where: { sellerUserId: null } as any,
          take: BATCH,
          orderBy: { createdAt: 'asc' },
          select: { id: true, daoId: true },
        });
      } catch (err: any) {
        const msg = String(err?.message || err);
        if (msg.includes('Unknown argument `sellerUserId`') || msg.includes('column') && msg.includes('sellerUserId')) {
          console.warn('[backfill] Prisma client does not know sellerUserId; falling back to scanning all products in small batches');
          products = await prisma.product.findMany({
            take: BATCH,
            orderBy: { createdAt: 'asc' },
            select: { id: true, daoId: true },
          });
          if (products.length === 0) break;
        } else {
          throw err;
        }
      }

      if (products.length === 0) break;

      for (const p of products) {
        let ownerUserId: string | null = null;

        // Try Dao by id or slug
        const dao = await prisma.dao.findFirst({
          where: { OR: [ { id: p.daoId }, { slug: p.daoId } ] },
          select: { ownerUserId: true },
        });
        ownerUserId = dao?.ownerUserId ?? null;

        // Fallback: interpret daoId as user address
        if (!ownerUserId) {
          const user = await prisma.user.findUnique({ where: { address: p.daoId }, select: { id: true } });
          ownerUserId = user?.id ?? null;
        }

        if (!ownerUserId) continue;

        await prisma.product.update({ where: { id: p.id }, data: { sellerUserId: ownerUserId } as any });
        updated += 1;
        if (updated % 50 === 0) {
          console.log(`[backfill] Updated ${updated} products...`);
        }
      }
    }
    console.log(`[backfill] Done. Updated ${updated} products.`);
  } catch (err) {
    console.error('[backfill] Error:', err);
    process.exitCode = 1;
  } finally {
    await PrismaClient.prototype.$disconnect.call(prisma);
  }
}

main();
