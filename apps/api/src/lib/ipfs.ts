import { env } from '../env.js';
import { create } from 'kubo-rpc-client';
import crypto from 'crypto';

// Type inference from create() return
type IPFSHTTPClient = ReturnType<typeof create>;

// ============================================================================
// TYPES
// ============================================================================

const DEFAULT_PLACEHOLDER = null;

export type IpfsFetchResult<T = unknown> = {
  metadata: T | null;
  source: 'stores' | 'registry' | 'placeholder';
};

export type ProfileMetadata = {
  schema_version: string;
  profile: {
    display_name: string;
    bio: string | null;
    avatar_cid: string | null;
    banner_cid: string | null;
    joined_at: string;
  };
  reputation: {
    score: number;
    tier: string;
    since: string;
  };
  badges: Array<{
    code: string;
    label: { pt: string; en: string; es: string };
    issued_by: string;
    issued_at: number;
  }>;
  penalties: Array<{
    code: string;
    reason: string;
    points: number;
    timestamp: number;
  }>;
  links: {
    website?: string;
    social?: Array<{ type: string; url: string }>;
  };
};

// ============================================================================
// IPFS CLIENT POOL (Multi-Node with Failover)
// ============================================================================

class IpfsClientPool {
  private clients: Array<{ url: string; client: IPFSHTTPClient }> = [];
  private currentIndex = 0;
  private readonly timeout: number;
  private readonly retryAttempts: number;
  private readonly gatewayBase: string;

  constructor(
    urls: string[],
    timeout: number = 30000,
    retries: number = 3,
    gatewayUrl: string = 'https://ipfs.io/ipfs/'
  ) {
    this.timeout = timeout;
    this.retryAttempts = retries;
    this.gatewayBase = gatewayUrl.endsWith('/') ? gatewayUrl : `${gatewayUrl}/`;

    // Criar cliente para cada URL
    this.clients = urls.map((url) => ({
      url,
      client: create({ url, timeout }),
    }));

    if (this.clients.length === 0) {
      console.warn('[IPFS] ⚠️  No IPFS nodes configured');
    } else {
      console.log(`[IPFS] ✅ Initialized with ${this.clients.length} node(s):`, urls);
    }
  }

  /**
   * Adiciona arquivo/JSON ao IPFS com failover automático
   */
  async add(
    content: string | Uint8Array,
    options?: { pin?: boolean; filename?: string }
  ): Promise<{ cid: string }> {
    if (this.clients.length === 0) {
      throw new Error('[IPFS] No IPFS nodes available');
    }

    const errors: Error[] = [];
    const startTime = Date.now();

    // Tentar cada nó na lista
    for (let nodeIndex = 0; nodeIndex < this.clients.length; nodeIndex++) {
      const { url, client } = this.clients[(this.currentIndex + nodeIndex) % this.clients.length];

      // Tentar com retry no nó atual
      for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
        const attemptStart = Date.now();
        try {
          console.log(
            `[IPFS] 📤 Upload attempt ${attempt}/${this.retryAttempts} to node: ${url}${
              options?.filename ? ` (${options.filename})` : ''
            }`
          );

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.timeout);

          const result = await client.add(content, {
            pin: options?.pin !== false,
            signal: controller.signal as any,
          });

          clearTimeout(timeoutId);

          const cid = result.cid.toString();
          const duration = Date.now() - attemptStart;

          console.log(
            `[IPFS] ✅ Successfully uploaded to ${url}: ${cid} (${duration}ms)${
              options?.filename ? ` - ${options.filename}` : ''
            }`
          );

          // Atualizar índice para usar este nó nas próximas chamadas (sticky)
          this.currentIndex = (this.currentIndex + nodeIndex) % this.clients.length;

          return { cid };
        } catch (error) {
          const err = error as Error;
          const duration = Date.now() - attemptStart;
          console.warn(
            `[IPFS] ❌ Node ${url} attempt ${attempt} failed (${duration}ms):`,
            err.message
          );
          errors.push(new Error(`${url}: ${err.message}`));

          // Se não é a última tentativa, aguardar antes de retry
          if (attempt < this.retryAttempts) {
            await this.sleep(1000 * attempt); // Backoff exponencial
          }
        }
      }
    }

    // Todos os nós falharam
    const totalDuration = Date.now() - startTime;
    const errorMsg = errors.map((e) => e.message).join('; ');
    throw new Error(
      `[IPFS] All ${this.clients.length} node(s) failed after ${this.retryAttempts} attempts each (${totalDuration}ms): ${errorMsg}`
    );
  }

  /**
   * Busca arquivo do IPFS (usa primeiro nó disponível)
   */
  async cat(cid: string): Promise<Uint8Array> {
    if (this.clients.length === 0) {
      throw new Error('[IPFS] No IPFS nodes available');
    }

    const errors: Error[] = [];

    for (const { url, client } of this.clients) {
      try {
        console.log(`[IPFS] 📥 Fetching ${cid} from ${url}`);

        const chunks: Uint8Array[] = [];
        for await (const chunk of client.cat(cid, { timeout: this.timeout })) {
          chunks.push(chunk);
        }

        const buffer = Buffer.concat(chunks);
        console.log(`[IPFS] ✅ Fetched ${cid} from ${url} (${buffer.length} bytes)`);

        return buffer;
      } catch (error) {
        const err = error as Error;
        console.warn(`[IPFS] ❌ Failed to fetch from ${url}:`, err.message);
        errors.push(new Error(`${url}: ${err.message}`));
        continue;
      }
    }

    throw new Error(
      `[IPFS] All nodes failed to fetch ${cid}: ${errors.map((e) => e.message).join('; ')}`
    );
  }

  /**
   * Busca JSON do IPFS via HTTP gateway (fallback)
   */
  async fetchJson<T = unknown>(
    cid: string | null,
    sourceHint: 'stores' | 'registry' = 'stores'
  ): Promise<IpfsFetchResult<T>> {
    if (!cid) {
      return { metadata: DEFAULT_PLACEHOLDER, source: 'placeholder' };
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(`${this.gatewayBase}${cid}`, { signal: controller.signal });
      if (!res.ok) {
        return { metadata: DEFAULT_PLACEHOLDER, source: 'placeholder' };
      }
      const json = (await res.json()) as T;
      return { metadata: json, source: sourceHint };
    } catch {
      return { metadata: DEFAULT_PLACEHOLDER, source: 'placeholder' };
    } finally {
      clearTimeout(id);
    }
  }

  /**
   * Verifica saúde de todos os nós
   */
  async healthCheck(): Promise<Array<{ url: string; healthy: boolean; error?: string; latency?: number }>> {
    if (this.clients.length === 0) {
      return [{ url: 'none', healthy: false, error: 'No nodes configured' }];
    }

    const results = await Promise.allSettled(
      this.clients.map(async ({ url, client }) => {
        const start = Date.now();
        try {
          await client.id({ timeout: 5000 });
          const latency = Date.now() - start;
          return { url, healthy: true, latency };
        } catch (error) {
          const latency = Date.now() - start;
          return { url, healthy: false, error: (error as Error).message, latency };
        }
      })
    );

    return results.map((r) =>
      r.status === 'fulfilled' ? r.value : { url: 'unknown', healthy: false, error: 'Promise rejected' }
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retorna quantidade de nós configurados
   */
  getNodeCount(): number {
    return this.clients.length;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const ipfsPool =
  env.IPFS_API_URLS && env.IPFS_API_URLS.length > 0
    ? new IpfsClientPool(
        env.IPFS_API_URLS,
        env.IPFS_TIMEOUT_MS ?? 30000,
        env.IPFS_RETRY_ATTEMPTS ?? 3,
        env.IPFS_GATEWAY_URL
      )
    : null;

// ============================================================================
// PUBLIC API (Backward Compatible)
// ============================================================================

/**
 * Busca JSON do IPFS via HTTP gateway
 * Mantém assinatura original para compatibilidade
 */
export async function fetchIpfsJson<T = unknown>(
  cid: string | null,
  sourceHint: 'stores' | 'registry' = 'stores'
): Promise<IpfsFetchResult<T>> {
  if (!ipfsPool) {
    // Fallback para fetch direto se não houver pool
    const gatewayBase = env.IPFS_GATEWAY_URL?.endsWith('/')
      ? env.IPFS_GATEWAY_URL
      : `${env.IPFS_GATEWAY_URL}/`;

    if (!cid) {
      return { metadata: DEFAULT_PLACEHOLDER, source: 'placeholder' };
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), env.IPFS_TIMEOUT_MS ?? 2000);

    try {
      const res = await fetch(`${gatewayBase}${cid}`, { signal: controller.signal });
      if (!res.ok) {
        return { metadata: DEFAULT_PLACEHOLDER, source: 'placeholder' };
      }
      const json = (await res.json()) as T;
      return { metadata: json, source: sourceHint };
    } catch {
      return { metadata: DEFAULT_PLACEHOLDER, source: 'placeholder' };
    } finally {
      clearTimeout(id);
    }
  }

  return ipfsPool.fetchJson<T>(cid, sourceHint);
}

/**
 * Publica metadados de perfil no IPFS
 * Mantém assinatura original para compatibilidade
 */
export async function publishProfileMetadata(data: ProfileMetadata): Promise<string> {
  if (!ipfsPool) {
    // Desenvolvimento: gerar CID fake baseado em hash dos dados
    console.warn('[IPFS] ⚠️  IPFS pool not configured, using fake CID for development');
    const json = JSON.stringify(data);
    const hash = Buffer.from(json).toString('base64').substring(0, 46);
    const fakeCid = `bafydev${hash.replace(/[+/=]/g, 'a')}`;
    console.log('[IPFS] Generated fake CID:', fakeCid);
    return fakeCid;
  }

  const json = JSON.stringify(data);
  const result = await ipfsPool.add(json, { filename: 'profile-metadata.json' });
  return result.cid;
}

/**
 * Busca metadados de perfil do IPFS
 */
export async function fetchProfileMetadata(cid: string): Promise<ProfileMetadata | null> {
  if (!ipfsPool) {
    // Fallback para gateway HTTP
    const result = await fetchIpfsJson<ProfileMetadata>(cid, 'stores');
    return result.metadata;
  }

  try {
    const data = await ipfsPool.cat(cid);
    return JSON.parse(Buffer.from(data).toString());
  } catch (error) {
    console.error('[IPFS] Error fetching profile metadata:', error);
    return null;
  }
}

/**
 * Upload genérico para IPFS
 */
export async function uploadToIpfs(
  content: string | Uint8Array,
  options?: { filename?: string }
): Promise<string> {
  if (!ipfsPool) {
    throw new Error('[IPFS] IPFS pool not configured');
  }

  const result = await ipfsPool.add(content, { pin: true, filename: options?.filename });
  return result.cid;
}

/**
 * Download genérico do IPFS
 */
export async function downloadFromIpfs(cid: string): Promise<Uint8Array> {
  if (!ipfsPool) {
    throw new Error('[IPFS] IPFS pool not configured');
  }

  return ipfsPool.cat(cid);
}

/**
 * Health check de todos os nós IPFS
 */
export async function getIpfsHealth(): Promise<
  Array<{ url: string; healthy: boolean; error?: string; latency?: number }>
> {
  if (!ipfsPool) {
    return [{ url: 'none', healthy: false, error: 'IPFS not configured' }];
  }

  return ipfsPool.healthCheck();
}

/**
 * Retorna informações sobre o pool IPFS
 */
export function getIpfsInfo(): { configured: boolean; nodeCount: number; urls: string[] } {
  if (!ipfsPool) {
    return { configured: false, nodeCount: 0, urls: [] };
  }

  return {
    configured: true,
    nodeCount: ipfsPool.getNodeCount(),
    urls: env.IPFS_API_URLS || [],
  };
}

/**
 * Cria metadados iniciais para um novo perfil
 */
export function createInitialMetadata(profile: {
  handle: string;
  displayName: string;
  createdAt: Date;
}): ProfileMetadata {
  return {
    schema_version: '1.0',
    profile: {
      display_name: profile.displayName,
      bio: null,
      avatar_cid: null,
      banner_cid: null,
      joined_at: profile.createdAt.toISOString(),
    },
    reputation: {
      score: 0,
      tier: 'bronze',
      since: profile.createdAt.toISOString(),
    },
    badges: [],
    penalties: [],
    links: {},
  };
}

// Exportar pool para uso interno (se necessário)
export { ipfsPool };
