import { PrismaClient } from '@prisma/client';

/**
 * Backfill multi-stores data after migrating schema.
 * - Ensure exactly one default store per user (if user has stores).
 * - Populate Product.sellerStoreId when resolvable.
 * - Populate ServiceOffering.sellerStoreId when resolvable.
 * - Populate Order.sellerStoreId from first item listing when resolvable.
 *
 * Safe to run multiple times.
 */
async function main() {
  const prisma = new PrismaClient();
  const BATCH = 200;

  try {
    // Step A: Ensure default store per user
    const users = await prisma.user.findMany({
      select: {
        id: true,
        sellerProfiles: {
          select: { id: true, isDefault: true, createdAt: true },
          orderBy: { createdAt: 'asc' as any },
        },
      },
    } as any);

    let fixedDefaults = 0;
    for (const u of users) {
      const stores = (u as any).sellerProfiles as Array<{ id: string; isDefault: boolean }>;
      if (!stores || stores.length === 0) continue;
      const defaults = (stores as any).filter((s: any) => s.isDefault);
      if (defaults.length === 1) continue; // ok
      if (defaults.length === 0) {
        // set first as default
        await prisma.sellerProfile.update({ where: { id: stores[0].id }, data: { isDefault: true } as any });
        fixedDefaults++;
      } else {
        // keep first default, unset others
        const keepId = defaults[0].id;
        await prisma.sellerProfile.updateMany({ where: { userId: u.id }, data: { isDefault: false } as any });
        await prisma.sellerProfile.update({ where: { id: keepId }, data: { isDefault: true } as any });
        fixedDefaults++;
      }
    }
    if (fixedDefaults > 0) console.log(`[backfill] Default stores adjusted for ${fixedDefaults} users`);

    // Helper to resolve storeId from daoId-like field
    async function resolveOwnerAndStoreByDaoId(daoId: string): Promise<{ ownerUserId: string | null; storeId: string | null }> {
      // 1) try Dao by id or slug
      const dao = await prisma.dao.findFirst({ where: { OR: [ { id: daoId }, { slug: daoId } ] }, select: { ownerUserId: true } });
      let ownerUserId: string | null = dao?.ownerUserId ?? null;

      // 2) Fallback: user by address
      if (!ownerUserId) {
        const user = await prisma.user.findUnique({ where: { address: daoId }, select: { id: true } });
        ownerUserId = user?.id ?? null;
      }

      // 3) Fallback: interpret daoId as shopSlug (store slug)
      let storeBySlug: { id: string; userId: string } | null = null;
      if (!ownerUserId) {
        const sp = await prisma.sellerProfile.findUnique({ where: { shopSlug: daoId }, select: { id: true, userId: true } });
        if (sp) {
          storeBySlug = sp;
          ownerUserId = sp.userId;
        }
      }

      if (!ownerUserId) return { ownerUserId: null, storeId: storeBySlug?.id ?? null };

      const stores = await prisma.sellerProfile.findMany({ where: { userId: ownerUserId }, select: { id: true, isDefault: true } } as any);
      if (stores.length === 1) return { ownerUserId, storeId: (stores as any)[0].id };
      const def = (stores as any).find((s: any) => s.isDefault);
      return { ownerUserId, storeId: def?.id ?? null };
    }

    // Step B: Backfill Product.sellerStoreId
    let updatedProducts = 0;
    while (true) {
      const items = await prisma.product.findMany({
        where: { OR: [ { sellerStoreId: null }, { sellerStoreId: { equals: undefined as any } } ] } as any,
        take: BATCH,
        orderBy: { createdAt: 'asc' },
        select: { id: true, sellerUserId: true, daoId: true },
      });
      if (items.length === 0) break;
      for (const p of items) {
        let storeId: string | null = null;
        if ((p as any).sellerUserId) {
          const stores = await prisma.sellerProfile.findMany({ where: { userId: (p as any).sellerUserId }, select: { id: true, isDefault: true } } as any);
          if (stores.length === 1) storeId = (stores as any)[0].id; else storeId = (stores as any).find((s: any) => s.isDefault)?.id ?? null;
        }
        if (!storeId) {
          const r = await resolveOwnerAndStoreByDaoId(p.daoId);
          storeId = r.storeId;
        }
        if (storeId) {
          await prisma.product.update({ where: { id: p.id }, data: { sellerStoreId: storeId } as any });
          updatedProducts++;
          if (updatedProducts % 100 === 0) console.log(`[backfill] Products updated: ${updatedProducts}`);
        }
      }
    }
    console.log(`[backfill] Products sellerStoreId set for ${updatedProducts} items`);

    // Step C: Backfill ServiceOffering.sellerStoreId
    let updatedServices = 0;
    while (true) {
      const items = await prisma.serviceOffering.findMany({
        where: { OR: [ { sellerStoreId: null }, { sellerStoreId: { equals: undefined as any } } ] } as any,
        take: BATCH,
        orderBy: { createdAt: 'asc' },
        select: { id: true, daoId: true },
      });
      if (items.length === 0) break;
      for (const s of items) {
        const r = await resolveOwnerAndStoreByDaoId(s.daoId);
        if (r.storeId) {
          await prisma.serviceOffering.update({ where: { id: s.id }, data: { sellerStoreId: r.storeId } as any });
          updatedServices++;
          if (updatedServices % 100 === 0) console.log(`[backfill] Services updated: ${updatedServices}`);
        }
      }
    }
    console.log(`[backfill] Services sellerStoreId set for ${updatedServices} items`);

    // Step D: Backfill Order.sellerStoreId from first item listing
    let updatedOrders = 0;
    while (true) {
      const orders = await prisma.order.findMany({
        where: { OR: [ { sellerStoreId: null }, { sellerStoreId: { equals: undefined as any } } ] } as any,
        take: BATCH,
        orderBy: { createdAt: 'asc' },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      });
      if (orders.length === 0) break;
      for (const o of orders) {
        const first = (o.items || [])[0];
        if (!first) continue;
        let storeId: string | null = null;
        if (first.kind === 'product') {
          const p = await prisma.product.findUnique({ where: { id: first.listingId }, select: { sellerStoreId: true } } as any);
          storeId = (p as any)?.sellerStoreId ?? null;
        } else {
          const s = await prisma.serviceOffering.findUnique({ where: { id: first.listingId }, select: { sellerStoreId: true } } as any);
          storeId = (s as any)?.sellerStoreId ?? null;
        }
        if (storeId) {
          await prisma.order.update({ where: { id: o.id }, data: { sellerStoreId: storeId } as any });
          updatedOrders++;
          if (updatedOrders % 100 === 0) console.log(`[backfill] Orders updated: ${updatedOrders}`);
        }
      }
    }
    console.log(`[backfill] Orders sellerStoreId set for ${updatedOrders} rows`);

    console.log('[backfill] Done.');
  } catch (err) {
    console.error('[backfill] Error:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
