// V-1 (2025-09-13): Upsert/Delete no índice (OpenSearch)
import { osClient, osEnabled } from './opensearch';
import { indexName } from './opensearchIndex';
import { buildOsDoc } from './osDoc';

export async function osUpsert(kind: 'product'|'service', id: string) {
  if (!osEnabled || !osClient) return;
  const doc = await buildOsDoc(kind, id);
  if (!doc) return;
  await osClient.index({
    index: indexName,
    id: `${doc.kind}:${doc.id}`,
    body: doc,
    refresh: 'false'
  } as any);
}

export async function osDelete(kind: 'product'|'service', id: string) {
  if (!osEnabled || !osClient) return;
  try {
    await osClient.delete({
      index: indexName,
      id: `${kind}:${id}`
    } as any);
  } catch (e: any) {
    // ignore 404
  }
}
