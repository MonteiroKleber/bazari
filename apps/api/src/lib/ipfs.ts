import { env } from '../env.js';
import { create } from 'kubo-rpc-client';

// Type inference from create() return
type IPFSHTTPClient = ReturnType<typeof create>;

// ============================================================================
// IPFS CLIENT POOL (Multi-Node with Failover)
// Mantido apenas para Chat/Media e Disputes (módulos com uso legítimo de IPFS)
// ============================================================================

class IpfsClientPool {
  private clients: Array<{ url: string; client: IPFSHTTPClient }> = [];
  private currentIndex = 0;
  private readonly timeout: number;
  private readonly retryAttempts: number;

  constructor(
    urls: string[],
    timeout: number = 30000,
    retries: number = 3
  ) {
    this.timeout = timeout;
    this.retryAttempts = retries;

    // Criar cliente para cada URL
    this.clients = urls.map((url) => ({
      url,
      client: create({ url, timeout }),
    }));

    if (this.clients.length === 0) {
      console.warn('[IPFS] No IPFS nodes configured');
    } else {
      console.log(`[IPFS] Initialized with ${this.clients.length} node(s):`, urls);
    }
  }

  /**
   * Adiciona arquivo ao IPFS com failover automático
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
            `[IPFS] Upload attempt ${attempt}/${this.retryAttempts} to node: ${url}${
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
            `[IPFS] Successfully uploaded to ${url}: ${cid} (${duration}ms)${
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
            `[IPFS] Node ${url} attempt ${attempt} failed (${duration}ms):`,
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
        console.log(`[IPFS] Fetching ${cid} from ${url}`);

        const chunks: Uint8Array[] = [];
        for await (const chunk of client.cat(cid, { timeout: this.timeout })) {
          chunks.push(chunk);
        }

        const buffer = Buffer.concat(chunks);
        console.log(`[IPFS] Fetched ${cid} from ${url} (${buffer.length} bytes)`);

        return buffer;
      } catch (error) {
        const err = error as Error;
        console.warn(`[IPFS] Failed to fetch from ${url}:`, err.message);
        errors.push(new Error(`${url}: ${err.message}`));
        continue;
      }
    }

    throw new Error(
      `[IPFS] All nodes failed to fetch ${cid}: ${errors.map((e) => e.message).join('; ')}`
    );
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
        env.IPFS_RETRY_ATTEMPTS ?? 3
      )
    : null;

// ============================================================================
// PUBLIC API
// Funções mantidas apenas para Chat/Media e Disputes
// ============================================================================

/**
 * Upload genérico para IPFS
 * Usado por: Chat (mídia criptografada), Disputes (evidências)
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
 * Usado por: Chat (mídia criptografada), Disputes (evidências)
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
 * Opções para upload de diretório
 */
interface UploadDirectoryOptions {
  maxFiles?: number;
  maxFileSize?: number;
  validateStructure?: boolean;
}

/**
 * Resultado do upload de diretório
 */
interface UploadDirectoryResult {
  cid: string;
  files: number;
  totalSize: number;
}

/**
 * Upload de diretório para IPFS a partir de um tarball
 * Extrai o tarball e faz upload de cada arquivo, retornando o CID do diretório
 *
 * @param tarballBuffer - Buffer do tarball (.tar.gz)
 * @param name - Nome do diretório no IPFS
 * @param options - Opções de validação
 */
export async function uploadDirectoryToIpfs(
  tarballBuffer: Buffer,
  name: string,
  options?: UploadDirectoryOptions
): Promise<string | UploadDirectoryResult> {
  if (!ipfsPool) {
    throw new Error('[IPFS] IPFS pool not configured');
  }

  const path = await import('path');
  const { createGunzip } = await import('zlib');
  const tar = await import('tar-stream');
  const { Readable } = await import('stream');
  const { pipeline } = await import('stream/promises');

  const maxFiles = options?.maxFiles ?? 1000;
  const maxFileSize = options?.maxFileSize ?? 10 * 1024 * 1024; // 10MB per file
  const validateStructure = options?.validateStructure ?? false;

  // Extrair arquivos do tarball
  const files: Array<{ path: string; content: Buffer }> = [];
  let totalSize = 0;

  await new Promise<void>((resolve, reject) => {
    const extract = tar.extract();
    const gunzip = createGunzip();

    extract.on('entry', (header, stream, next) => {
      if (header.type !== 'file') {
        stream.resume();
        next();
        return;
      }

      // Path traversal protection
      const normalizedPath = path.normalize(header.name);
      const safePath = normalizedPath.replace(/^(\.\.([/\\]|$))+/, '');

      if (safePath !== normalizedPath || safePath.startsWith('/') || safePath.includes('..')) {
        console.warn(`[IPFS] Blocked path traversal attempt: ${header.name}`);
        stream.resume();
        next();
        return;
      }

      // File count limit
      if (files.length >= maxFiles) {
        reject(new Error(`Too many files in bundle. Maximum: ${maxFiles}`));
        return;
      }

      const chunks: Buffer[] = [];
      let fileSize = 0;

      stream.on('data', (chunk: Buffer) => {
        fileSize += chunk.length;

        if (fileSize > maxFileSize) {
          reject(new Error(
            `File too large: ${header.name} (${Math.round(fileSize / 1024)}KB). Maximum: ${Math.round(maxFileSize / 1024 / 1024)}MB`
          ));
          return;
        }

        chunks.push(chunk);
      });

      stream.on('end', () => {
        const content = Buffer.concat(chunks);
        files.push({
          path: safePath,
          content,
        });
        totalSize += content.length;
        next();
      });

      stream.on('error', reject);
    });

    extract.on('finish', resolve);
    extract.on('error', reject);

    const readable = Readable.from(tarballBuffer);
    pipeline(readable, gunzip, extract).catch(reject);
  });

  // Validate bundle structure if requested
  if (validateStructure) {
    const hasIndex = files.some(
      (f) => f.path === 'index.html' || f.path.endsWith('/index.html')
    );

    if (!hasIndex) {
      throw new Error('Bundle must contain index.html at root');
    }
  }

  console.log(`[IPFS] Extracted ${files.length} files (${Math.round(totalSize / 1024)}KB) from tarball ${name}`);

  // Upload each file and build directory structure for IPFS
  // Using ipfs.addAll to create a directory with all files
  const client = ipfsPool['clients'][0].client;

  const ipfsFiles = files.map((f) => ({
    path: `${name}/${f.path}`,
    content: f.content,
  }));

  let rootCid = '';
  for await (const result of client.addAll(ipfsFiles, { pin: true, wrapWithDirectory: false })) {
    // The last entry with the directory name is the root CID
    if (result.path === name) {
      rootCid = result.cid.toString();
    }
  }

  if (!rootCid) {
    throw new Error('[IPFS] Failed to get root CID for directory');
  }

  console.log(`[IPFS] Uploaded directory ${name} with CID: ${rootCid}`);

  // Return extended result if options were provided
  if (options) {
    return {
      cid: rootCid,
      files: files.length,
      totalSize,
    };
  }

  return rootCid;
}

// Exportar pool para uso interno (se necessário)
export { ipfsPool };
