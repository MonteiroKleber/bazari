import { FastifyInstance } from 'fastify';
import { downloadFromIpfs } from '../lib/ipfs.js';

/**
 * IPFS Proxy Routes
 *
 * Serves content from the local IPFS node.
 * This is necessary because the local IPFS node may not be
 * connected to public gateways, so we proxy the content ourselves.
 */
export async function ipfsProxyRoutes(app: FastifyInstance) {
  /**
   * GET /ipfs/:cid/*
   * Serve files from IPFS directory (e.g., /ipfs/Qm.../index.html)
   * This route must come first to match paths with file extensions
   */
  app.get<{
    Params: { cid: string; '*': string };
  }>('/ipfs/:cid/*', async (request, reply) => {
    const { cid } = request.params;
    let filePath = request.params['*'] || 'index.html';

    // Remove trailing slash and default to index.html
    if (filePath.endsWith('/') || filePath === '') {
      filePath = filePath.replace(/\/$/, '') || 'index.html';
      if (!filePath.includes('.')) {
        filePath = filePath ? `${filePath}/index.html` : 'index.html';
      }
    }

    if (!cid || !/^Qm[a-zA-Z0-9]{44}$|^bafy[a-zA-Z0-9]+$/.test(cid)) {
      return reply.status(400).send({ error: 'Invalid CID format' });
    }

    try {
      // Fetch file from IPFS directory using path
      const fullPath = `${cid}/${filePath}`;
      console.log(`[IPFS Proxy] Fetching from directory: ${fullPath}`);
      const content = await downloadFromIpfs(fullPath);

      // Detect content type from file extension or magic bytes
      const contentType = detectContentTypeFromPath(filePath, content);

      reply
        .header('Content-Type', contentType)
        .header('Cache-Control', 'public, max-age=31536000, immutable')
        .header('X-IPFS-Path', fullPath)
        .send(Buffer.from(content));
    } catch (error) {
      console.error(`[IPFS Proxy] Error fetching ${cid}/${filePath}:`, error);
      return reply.status(404).send({
        error: 'Content not found',
        path: `${cid}/${filePath}`,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /ipfs/:cid
   * Serve single file from local IPFS node or default to index.html for directories
   */
  app.get<{
    Params: { cid: string };
  }>('/ipfs/:cid', async (request, reply) => {
    const { cid } = request.params;

    if (!cid || !/^Qm[a-zA-Z0-9]{44}$|^bafy[a-zA-Z0-9]+$/.test(cid)) {
      return reply.status(400).send({ error: 'Invalid CID format' });
    }

    try {
      console.log(`[IPFS Proxy] Fetching CID: ${cid}`);
      const content = await downloadFromIpfs(cid);

      // Detect content type from magic bytes
      const contentType = detectContentType(content);

      // If it's a directory (UnixFS), try to serve index.html
      if (contentType === 'application/octet-stream') {
        try {
          const indexContent = await downloadFromIpfs(`${cid}/index.html`);
          reply
            .header('Content-Type', 'text/html; charset=utf-8')
            .header('Cache-Control', 'public, max-age=31536000, immutable')
            .header('X-IPFS-CID', cid)
            .send(Buffer.from(indexContent));
          return;
        } catch {
          // Not a directory with index.html, serve as-is
        }
      }

      reply
        .header('Content-Type', contentType)
        .header('Cache-Control', 'public, max-age=31536000, immutable')
        .header('X-IPFS-CID', cid)
        .send(Buffer.from(content));
    } catch (error) {
      console.error(`[IPFS Proxy] Error fetching CID ${cid}:`, error);
      return reply.status(404).send({
        error: 'Content not found',
        cid,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

/**
 * Detect content type from file path extension
 */
function detectContentTypeFromPath(path: string, buffer: Uint8Array): string {
  const ext = path.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    'html': 'text/html; charset=utf-8',
    'htm': 'text/html; charset=utf-8',
    'css': 'text/css; charset=utf-8',
    'js': 'application/javascript; charset=utf-8',
    'mjs': 'application/javascript; charset=utf-8',
    'json': 'application/json; charset=utf-8',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'eot': 'application/vnd.ms-fontobject',
    'otf': 'font/otf',
    'mp3': 'audio/mpeg',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'pdf': 'application/pdf',
    'txt': 'text/plain; charset=utf-8',
    'xml': 'application/xml',
    'wasm': 'application/wasm',
  };

  if (ext && mimeTypes[ext]) {
    return mimeTypes[ext];
  }

  return detectContentType(buffer);
}

/**
 * Detect content type from magic bytes
 */
function detectContentType(buffer: Uint8Array): string {
  // Check for gzip (tarball)
  if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
    return 'application/gzip';
  }

  // Check for tar (uncompressed)
  if (buffer.length > 262 &&
      buffer[257] === 0x75 && buffer[258] === 0x73 &&
      buffer[259] === 0x74 && buffer[260] === 0x61 && buffer[261] === 0x72) {
    return 'application/x-tar';
  }

  // Check for zip
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
    return 'application/zip';
  }

  // Check for PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }

  // Check for JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // Check for JSON (starts with { or [)
  if (buffer[0] === 0x7b || buffer[0] === 0x5b) {
    return 'application/json';
  }

  // Check for HTML
  if (buffer[0] === 0x3c) { // <
    const header = new TextDecoder().decode(buffer.slice(0, 100)).toLowerCase();
    if (header.includes('<!doctype html') || header.includes('<html')) {
      return 'text/html; charset=utf-8';
    }
  }

  // Check for JavaScript (common patterns)
  const textStart = new TextDecoder().decode(buffer.slice(0, 50));
  if (textStart.includes('import ') || textStart.includes('export ') ||
      textStart.includes('function ') || textStart.includes('const ')) {
    return 'application/javascript; charset=utf-8';
  }

  // Default to binary
  return 'application/octet-stream';
}
