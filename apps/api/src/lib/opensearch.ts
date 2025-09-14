// V-1 (2025-09-13): OpenSearch client + feature-flag
import type { ClientOptions } from '@opensearch-project/opensearch';
import { Client } from '@opensearch-project/opensearch';

export const osEnabled =
  process.env.USE_OPENSEARCH === 'true' && !!process.env.OPENSEARCH_URL;

export const osClient = osEnabled
  ? new Client({
      node: process.env.OPENSEARCH_URL as string,
      auth: process.env.OS_USER
        ? ({ username: process.env.OS_USER as string, password: process.env.OS_PASS as string } as ClientOptions['auth'])
        : undefined,
      // Se usar AWS SigV4, trocar 'auth' por signer no transport.
    })
  : null;
