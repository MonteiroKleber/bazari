// V-1 (2025-09-13): Reindex (full) Postgres -> OpenSearch
import { osClient, osEnabled } from '../lib/opensearch';
import { ensureOsIndex, indexName } from '../lib/opensearchIndex';
import { PrismaClient } from '@prisma/client';
import { buildOsDoc } from '../lib/osDoc';

const prisma = new PrismaClient();

async function main() {
  if (!osEnabled || !osClient) {
    console.log('OpenSearch disabled or not configured.'); return;
  }
  await ensureOsIndex();

  // reset índice (opcional; comente em prod se preferir)
  try { await (osClient as any).indices.delete({ index: indexName }); } catch {}
  await ensureOsIndex();

  const batch = 500;

  // produtos
  let lastId: string | null = null;
  for(;;) {
    const rows = await prisma.product.findMany({
      select: { id: true },
      orderBy: { id: 'asc' },
      ...(lastId ? { cursor: { id: lastId }, skip: 1 } : {}),
      take: batch
    });
    if (!rows.length) break;
    const ops: any[] = [];
    for (const r of rows) {
      const doc = await buildOsDoc('product', r.id);
      if (doc) {
        ops.push({ index: { _index: indexName, _id: `product:${doc.id}` } }, doc);
      }
    }
    if (ops.length) await (osClient as any).bulk({ body: ops, refresh: false });
    lastId = rows[rows.length-1].id;
  }

  // serviços
  lastId = null;
  for(;;) {
    const rows = await prisma.serviceOffering.findMany({
      select: { id: true },
      orderBy: { id: 'asc' },
      ...(lastId ? { cursor: { id: lastId }, skip: 1 } : {}),
      take: batch
    });
    if (!rows.length) break;
    const ops: any[] = [];
    for (const r of rows) {
      const doc = await buildOsDoc('service', r.id);
      if (doc) {
        ops.push({ index: { _index: indexName, _id: `service:${doc.id}` } }, doc);
      }
    }
    if (ops.length) await (osClient as any).bulk({ body: ops, refresh: false });
    lastId = rows[rows.length-1].id;
  }

  console.log('Reindex done.');
}

main().catch((e)=>{ console.error(e); process.exit(1); });
