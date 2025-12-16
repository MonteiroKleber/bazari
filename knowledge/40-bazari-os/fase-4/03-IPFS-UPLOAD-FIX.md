# 03 - Correções no Fluxo IPFS

## Problemas Identificados

### 1. Port Mismatch (CRÍTICO)

**Atual:**
- Nginx: `/ipfs` → `http://127.0.0.1:8081`
- IPFS Proxy Routes: Registradas no servidor API (porta 3000)

**Resultado:** 404 ao acessar bundles

**Solução:** Atualizar Nginx para apontar para porta correta ou criar servidor separado.

### 2. Dois Endpoints de Upload

**Atual:**
- `POST /developer/apps/:id/bundle` (CLI - multipart form)
- `POST /developer/upload-bundle` (Studio - raw buffer)

**Solução:** Unificar em um único endpoint.

### 3. Falta de Validação

**Atual:**
- Headers `X-App-Slug` e `X-App-Version` não validados
- Sem verificação de hash após upload
- Sem limite de tamanho

**Solução:** Adicionar validações robustas.

## Arquitetura Atual

```
CLI/Studio
    │
    │ POST /developer/upload-bundle
    │ Body: tar.gz
    │ Headers: X-App-Slug, X-App-Version
    ↓
┌────────────────────────────────┐
│ API Server (port 3000)         │
│ developer.ts                    │
│ uploadDirectoryToIpfs()        │
└────────────────────────────────┘
    │
    │ kubo-rpc-client
    ↓
┌────────────────────────────────┐
│ IPFS Node (port 5001 API)      │
│ Stores & Pins content          │
└────────────────────────────────┘
    │
    │ Returns CID
    ↓
┌────────────────────────────────┐
│ bundleUrl generated:           │
│ https://bazari.libervia.xyz/   │
│    ipfs/{CID}                  │
└────────────────────────────────┘


Browser Request:
    │
    │ GET https://bazari.libervia.xyz/ipfs/{CID}/index.html
    ↓
┌────────────────────────────────┐
│ Nginx                          │
│ location /ipfs {               │
│   proxy_pass http://127.0.0.1: │
│              8081;             │  ← PROBLEMA: Port 8081 não existe!
│ }                              │
└────────────────────────────────┘
    ↓
    ❌ 502 Bad Gateway
```

## Arquitetura Corrigida

### Opção A: Redirecionar para API Server

```nginx
# /etc/nginx/sites-available/bazari.conf

# IPFS Gateway - serve third-party app bundles
location /ipfs {
    # Apontar para API server onde ipfs-proxy está registrado
    proxy_pass http://127.0.0.1:3000/api/ipfs;

    # Rewrite para remover /api
    rewrite ^/ipfs/(.*)$ /api/ipfs/$1 break;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    # Allow iframe embedding for IPFS content
    add_header X-Frame-Options "" always;
    add_header Content-Security-Policy "frame-ancestors 'self' https://bazari.libervia.xyz" always;
    add_header X-Content-Type-Options "nosniff" always;

    # CORS headers
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Range" always;
}
```

### Opção B: Usar IPFS Gateway Nativo (Recomendado)

O IPFS node já tem um gateway HTTP na porta 8080:

```nginx
# /etc/nginx/sites-available/bazari.conf

location /ipfs {
    # IPFS Gateway nativo (kubo default port)
    proxy_pass http://127.0.0.1:8080;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;

    # Security headers
    add_header X-Frame-Options "" always;
    add_header Content-Security-Policy "frame-ancestors 'self' https://bazari.libervia.xyz" always;

    # CORS
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS" always;
}
```

## Endpoint de Upload Unificado

### Antes (dois endpoints)

```typescript
// CLI - multipart form
POST /developer/apps/:id/bundle
Content-Type: multipart/form-data

// Studio - raw buffer
POST /developer/upload-bundle
Content-Type: application/octet-stream
```

### Depois (único endpoint)

```typescript
// Unificado
POST /developer/bundle/upload
Content-Type: application/octet-stream

Headers:
  Authorization: Bearer {token}
  X-App-Slug: string (required)
  X-App-Version: string (required)
  X-Content-Hash: string (optional, for verification)

Body: tar.gz buffer

Response:
{
  cid: string;
  bundleUrl: string;
  size: number;
  files: number;
  hash: string;
}
```

## Validações a Adicionar

### 1. Header Validation

```typescript
// developer.ts
app.post('/developer/bundle/upload', async (request, reply) => {
  const appSlug = request.headers['x-app-slug'] as string;
  const appVersion = request.headers['x-app-version'] as string;
  const contentHash = request.headers['x-content-hash'] as string | undefined;

  // Validar headers obrigatórios
  if (!appSlug || !appVersion) {
    return reply.status(400).send({
      error: 'Missing required headers: X-App-Slug, X-App-Version'
    });
  }

  // Validar formato do slug
  if (!/^[a-z][a-z0-9-]*$/.test(appSlug)) {
    return reply.status(400).send({
      error: 'Invalid app slug format'
    });
  }

  // Validar formato da versão (semver)
  if (!/^\d+\.\d+\.\d+/.test(appVersion)) {
    return reply.status(400).send({
      error: 'Invalid version format (expected semver)'
    });
  }
});
```

### 2. Size Validation

```typescript
const MAX_BUNDLE_SIZE = 50 * 1024 * 1024; // 50MB

// Antes de processar
const bodyBuffer = await request.body as Buffer;

if (bodyBuffer.length > MAX_BUNDLE_SIZE) {
  return reply.status(413).send({
    error: `Bundle too large. Max size: ${MAX_BUNDLE_SIZE / 1024 / 1024}MB`
  });
}
```

### 3. Hash Verification

```typescript
import crypto from 'crypto';

// Após upload para IPFS
if (contentHash) {
  const calculatedHash = crypto
    .createHash('sha256')
    .update(bodyBuffer)
    .digest('hex');

  if (calculatedHash !== contentHash) {
    return reply.status(400).send({
      error: 'Content hash mismatch',
      expected: contentHash,
      received: calculatedHash
    });
  }
}
```

### 4. Tarball Validation

```typescript
// Validar que é um tarball válido
async function validateTarball(buffer: Buffer): Promise<boolean> {
  // Check gzip magic bytes
  if (buffer[0] !== 0x1f || buffer[1] !== 0x8b) {
    return false;
  }

  // Try to extract and validate structure
  try {
    const files = await extractTarball(buffer);

    // Deve ter pelo menos index.html
    const hasIndex = files.some(f =>
      f.path === 'index.html' ||
      f.path.endsWith('/index.html')
    );

    return hasIndex;
  } catch {
    return false;
  }
}
```

### 5. Path Traversal Protection

```typescript
// Em uploadDirectoryToIpfs
extract.on('entry', (header, stream, next) => {
  // Proteção contra path traversal
  const safePath = path.normalize(header.name).replace(/^(\.\.(\/|\\|$))+/, '');

  if (safePath !== header.name) {
    console.warn(`[IPFS] Blocked path traversal attempt: ${header.name}`);
    stream.resume();
    next();
    return;
  }

  // ... resto do código
});
```

## Verificação de Bundle

### Novo Endpoint: GET /developer/bundle/verify

```typescript
app.get('/developer/bundle/verify/:cid', async (request, reply) => {
  const { cid } = request.params;

  try {
    // Tentar fetch do IPFS
    const content = await downloadFromIpfs(`${cid}/index.html`);

    return {
      cid,
      accessible: true,
      size: content.length,
      contentType: 'text/html'
    };
  } catch (error) {
    return {
      cid,
      accessible: false,
      error: error.message
    };
  }
});
```

## Melhorias na Função uploadDirectoryToIpfs

```typescript
export async function uploadDirectoryToIpfs(
  tarballBuffer: Buffer,
  name: string,
  options?: {
    maxFiles?: number;
    maxFileSize?: number;
    validateStructure?: boolean;
  }
): Promise<{
  cid: string;
  files: number;
  totalSize: number;
}> {
  if (!ipfsPool) {
    throw new Error('[IPFS] IPFS pool not configured');
  }

  const { createGunzip } = await import('zlib');
  const tar = await import('tar-stream');
  const { Readable } = await import('stream');
  const { pipeline } = await import('stream/promises');

  const maxFiles = options?.maxFiles ?? 1000;
  const maxFileSize = options?.maxFileSize ?? 10 * 1024 * 1024; // 10MB per file
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
      const safePath = path.normalize(header.name).replace(/^(\.\.(\/|\\|$))+/, '');
      if (safePath !== header.name) {
        console.warn(`[IPFS] Blocked path traversal: ${header.name}`);
        stream.resume();
        next();
        return;
      }

      // File count limit
      if (files.length >= maxFiles) {
        reject(new Error(`Too many files. Max: ${maxFiles}`));
        return;
      }

      const chunks: Buffer[] = [];
      let fileSize = 0;

      stream.on('data', (chunk) => {
        fileSize += chunk.length;

        // File size limit
        if (fileSize > maxFileSize) {
          reject(new Error(`File too large: ${header.name}. Max: ${maxFileSize} bytes`));
          return;
        }

        chunks.push(chunk);
      });

      stream.on('end', () => {
        const content = Buffer.concat(chunks);
        files.push({ path: safePath, content });
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

  // Validate structure
  if (options?.validateStructure) {
    const hasIndex = files.some(f =>
      f.path === 'index.html' ||
      f.path.endsWith('/index.html')
    );

    if (!hasIndex) {
      throw new Error('Bundle must contain index.html');
    }
  }

  console.log(`[IPFS] Extracted ${files.length} files (${totalSize} bytes)`);

  // Upload to IPFS
  const client = ipfsPool['clients'][0].client;
  const ipfsFiles = files.map((f) => ({
    path: `${name}/${f.path}`,
    content: f.content,
  }));

  let rootCid = '';
  for await (const result of client.addAll(ipfsFiles, {
    pin: true,
    wrapWithDirectory: false
  })) {
    if (result.path === name) {
      rootCid = result.cid.toString();
    }
  }

  if (!rootCid) {
    throw new Error('[IPFS] Failed to get root CID');
  }

  console.log(`[IPFS] Uploaded ${name} with CID: ${rootCid}`);

  return {
    cid: rootCid,
    files: files.length,
    totalSize
  };
}
```

## Checklist de Implementação

- [ ] Corrigir configuração Nginx (porta)
- [ ] Testar IPFS gateway nativo (porta 8080)
- [ ] Unificar endpoints de upload
- [ ] Adicionar validação de headers
- [ ] Adicionar limite de tamanho
- [ ] Adicionar verificação de hash
- [ ] Adicionar proteção path traversal
- [ ] Criar endpoint de verificação de bundle
- [ ] Atualizar CLI para usar novo endpoint
- [ ] Atualizar Studio para usar novo endpoint
- [ ] Adicionar testes de integração
