import { env } from '../env.js';

const DEFAULT_PLACEHOLDER = null;

export type IpfsFetchResult<T = unknown> = {
  metadata: T | null;
  source: 'stores' | 'registry' | 'placeholder';
};

const gatewayBase = env.IPFS_GATEWAY_URL?.endsWith('/') ? env.IPFS_GATEWAY_URL : `${env.IPFS_GATEWAY_URL}/`;
const timeoutMs = env.IPFS_TIMEOUT_MS ?? 2000;

export async function fetchIpfsJson<T = unknown>(cid: string | null, sourceHint: 'stores' | 'registry' = 'stores'): Promise<IpfsFetchResult<T>> {
  if (!cid) {
    return { metadata: DEFAULT_PLACEHOLDER, source: 'placeholder' };
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${gatewayBase}${cid}`, { signal: controller.signal });
    if (!res.ok) {
      return { metadata: DEFAULT_PLACEHOLDER, source: 'placeholder' };
    }
    const json = await res.json() as T;
    return { metadata: json, source: sourceHint };
  } catch {
    return { metadata: DEFAULT_PLACEHOLDER, source: 'placeholder' };
  } finally {
    clearTimeout(id);
  }
}
