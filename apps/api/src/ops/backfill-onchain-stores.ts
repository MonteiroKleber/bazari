import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { PrismaClient } from '@prisma/client';

type BackfillEntry = {
  shopSlug: string;
  onChainStoreId?: string | number | bigint | null;
  ownerAddress?: string | null;
  operatorAddresses?: string[] | null;
};

type BackfillPayload = {
  stores: BackfillEntry[];
};

function usage(): never {
  console.error('Usage: pnpm --filter @bazari/api exec tsx src/ops/backfill-onchain-stores.ts <path-to-json>');
  process.exit(1);
}

async function loadPayload(pathArg: string): Promise<BackfillPayload> {
  const path = resolve(process.cwd(), pathArg);
  const raw = await readFile(path, 'utf-8');
  const parsed = JSON.parse(raw) as BackfillPayload;

  if (!parsed || !Array.isArray(parsed.stores)) {
    throw new Error('Invalid payload: expected { "stores": [...] }');
  }

  return parsed;
}

function normalizeStoreId(value: BackfillEntry['onChainStoreId']): bigint | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(value);
  const trimmed = String(value).trim();
  if (trimmed === '') return null;
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`Invalid onChainStoreId value: ${value}`);
  }
  return BigInt(trimmed);
}

async function main() {
  const [, , payloadPath] = process.argv;
  if (!payloadPath) usage();

  const prisma = new PrismaClient();

  try {
    const payload = await loadPayload(payloadPath);

    for (const entry of payload.stores) {
      const { shopSlug } = entry;
      if (!shopSlug) {
        console.warn('[backfill] Skipping entry without shopSlug', entry);
        continue;
      }

      const store = await prisma.sellerProfile.findUnique({ where: { shopSlug }, select: { id: true } });
      if (!store) {
        console.warn(`[backfill] No SellerProfile found for slug "${shopSlug}"`);
        continue;
      }

      const hasOnChainStoreId = Object.prototype.hasOwnProperty.call(entry, 'onChainStoreId');
      const onChainStoreId = hasOnChainStoreId ? normalizeStoreId(entry.onChainStoreId) : undefined;

      const ownerAddressRaw = entry.ownerAddress;
      const ownerAddress = ownerAddressRaw === undefined ? undefined : ownerAddressRaw?.trim() || null;

      const operatorAddresses = Object.prototype.hasOwnProperty.call(entry, 'operatorAddresses')
        ? Array.isArray(entry.operatorAddresses)
          ? entry.operatorAddresses.filter((addr) => typeof addr === 'string' && addr.trim().length > 0)
          : []
        : undefined;

      const data: Record<string, unknown> = {};
      if (hasOnChainStoreId) data.onChainStoreId = onChainStoreId ?? null;
      if (ownerAddress !== undefined) data.ownerAddress = ownerAddress;
      if (operatorAddresses !== undefined) data.operatorAddresses = operatorAddresses;

      if (Object.keys(data).length === 0) {
        console.log(`[backfill] Entry for ${shopSlug} did not specify any fields to update.`);
      } else {
        await prisma.sellerProfile.update({ where: { id: store.id }, data });
      }

      if (hasOnChainStoreId) {
        await prisma.product.updateMany({
          where: { sellerStoreId: store.id },
          data: { onChainStoreId: onChainStoreId ?? null },
        });
        await prisma.serviceOffering.updateMany({
          where: { sellerStoreId: store.id },
          data: { onChainStoreId: onChainStoreId ?? null },
        });
      }

      console.log(
        `[backfill] Updated store ${shopSlug} (id=${store.id})` +
          (hasOnChainStoreId ? ` onChainStoreId=${onChainStoreId ?? 'null'}` : '') +
          (ownerAddress !== undefined ? ` ownerAddress=${ownerAddress ?? 'null'}` : '') +
          (operatorAddresses !== undefined ? ` operators=${operatorAddresses.length}` : ''),
      );
    }

    console.log('[backfill] Done.');
  } catch (err) {
    console.error('[backfill] Error:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
