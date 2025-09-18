// V-2 (2025-09-18): Normaliza flag USE_OPENSEARCH com parsing flexível
// V-1 (2025-09-13): OpenSearch client + feature-flag
import type { ClientOptions } from '@opensearch-project/opensearch';
import { Client } from '@opensearch-project/opensearch';

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
