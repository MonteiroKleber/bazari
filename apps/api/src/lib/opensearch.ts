// V-3 (2025-10-07): Add ensureStoreIndex for bazari_stores index
// V-2 (2025-09-18): Normaliza flag USE_OPENSEARCH com parsing flexível
// V-1 (2025-09-13): OpenSearch client + feature-flag
import type { ClientOptions } from '@opensearch-project/opensearch';
import { Client } from '@opensearch-project/opensearch';
import { env } from '../env.js';

const truthyValues = new Set(['true', '1', 'yes', 'on']);

export function isOsEnabled(): boolean {
  const raw = process.env.USE_OPENSEARCH ?? '';
  const normalized = raw.trim().toLowerCase();
  if (!truthyValues.has(normalized)) return false;
  return !!process.env.OPENSEARCH_URL;
}

export const osEnabled = isOsEnabled();

export const osClient = osEnabled
  ? new Client({
      node: process.env.OPENSEARCH_URL as string,
      auth: process.env.OS_USER
        ? ({ username: process.env.OS_USER as string, password: process.env.OS_PASS as string } as ClientOptions['auth'])
        : undefined,
      // Se usar AWS SigV4, trocar 'auth' por signer no transport.
    })
  : null;

// New client for stores index (uses OPENSEARCH_NODE from env)
const storesClient = new Client({
  node: env.OPENSEARCH_NODE || 'http://localhost:9200',
});

export async function ensureStoreIndex() {
  const indexName = env.OPENSEARCH_INDEX_STORES || 'bazari_stores';

  const exists = await storesClient.indices.exists({ index: indexName });
  if (exists.body) return;

  await storesClient.indices.create({
    index: indexName,
    body: {
      mappings: {
        properties: {
          storeId: { type: 'keyword' },
          slug: { type: 'keyword' },
          onchain: {
            properties: {
              instanceId: { type: 'long' },
              owner: { type: 'keyword' },
            },
          },
          title: { type: 'text' },
          description: { type: 'text' },
          category: {
            properties: {
              path: { type: 'keyword' },
            },
          },
          price: {
            properties: {
              amount: { type: 'float' },
              currency: { type: 'keyword' },
            },
          },
          status: { type: 'keyword' },
          version: { type: 'integer' },
          ipfs: {
            properties: {
              cid: { type: 'keyword' },
            },
          },
          sync: {
            properties: {
              lastIndexedAt: { type: 'date' },
            },
          },
        },
      },
    },
  });
}

export { storesClient as opensearchClient };
