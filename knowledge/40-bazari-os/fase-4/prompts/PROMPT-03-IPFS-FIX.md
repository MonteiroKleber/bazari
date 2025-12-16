# PROMPT 03: Corrigir Fluxo IPFS

## Contexto

O roteamento IPFS tem um problema de configuração de portas que causa 502/504 ao acessar bundles.

## Problema Atual

- **Nginx**: `/ipfs` → `http://127.0.0.1:8081`
- **IPFS Proxy Routes**: Registradas em `port 3000` (API server)
- **Resultado**: 502 Bad Gateway

## Arquivos a Modificar

1. `/etc/nginx/sites-available/bazari.conf` - Corrigir proxy pass
2. `apps/api/src/routes/developer.ts` - Melhorar upload-bundle
3. `apps/api/src/lib/ipfs.ts` - Adicionar validações

## Solução: Usar IPFS Gateway Nativo

O IPFS daemon já tem um gateway HTTP na porta 8080. Vamos usar ele diretamente.

### 1. Verificar IPFS Gateway

```bash
# Verificar se gateway está ativo
curl http://127.0.0.1:8080/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/readme

# Se não estiver, habilitar no config
ipfs config Addresses.Gateway /ip4/127.0.0.1/tcp/8080
systemctl restart ipfs
```

### 2. Atualizar Nginx

```nginx
# /etc/nginx/sites-available/bazari.conf

# IPFS Gateway - serve third-party app bundles
location /ipfs {
    # IPFS Gateway nativo (porta 8080)
    proxy_pass http://127.0.0.1:8080;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Timeouts para arquivos grandes
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # Allow iframe embedding for IPFS content (third-party apps)
    add_header X-Frame-Options "" always;
    add_header Content-Security-Policy "frame-ancestors 'self' https://bazari.libervia.xyz" always;
    add_header X-Content-Type-Options "nosniff" always;

    # CORS headers for app assets
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Range" always;

    # Cache control - IPFS content is immutable
    add_header Cache-Control "public, max-age=31536000, immutable" always;
}
```

### 3. Melhorar Endpoint upload-bundle

```typescript
// apps/api/src/routes/developer.ts

import crypto from 'crypto';

const MAX_BUNDLE_SIZE = 50 * 1024 * 1024; // 50MB

app.post('/developer/upload-bundle', {
  onRequest: authOnRequest,
  config: {
    // Aumentar limite de body
    rawBody: true,
  },
}, async (request, reply) => {
  const userId = (request as any).authUser?.sub;

  // 1. Validar headers
  const appSlug = request.headers['x-app-slug'] as string;
  const appVersion = request.headers['x-app-version'] as string;
  const contentHash = request.headers['x-content-hash'] as string | undefined;

  if (!appSlug) {
    return reply.status(400).send({
      error: 'Missing required header: X-App-Slug',
    });
  }

  if (!appVersion) {
    return reply.status(400).send({
      error: 'Missing required header: X-App-Version',
    });
  }

  // Validar formato do slug
  if (!/^[a-z][a-z0-9-]*$/.test(appSlug)) {
    return reply.status(400).send({
      error: 'Invalid app slug format. Use lowercase letters, numbers, and hyphens.',
    });
  }

  // Validar formato da versão (semver)
  if (!/^\d+\.\d+\.\d+/.test(appVersion)) {
    return reply.status(400).send({
      error: 'Invalid version format. Use semver (e.g., 1.0.0)',
    });
  }

  // 2. Ler body
  const bodyBuffer = await request.body as Buffer;

  // 3. Validar tamanho
  if (bodyBuffer.length > MAX_BUNDLE_SIZE) {
    return reply.status(413).send({
      error: `Bundle too large. Maximum size: ${MAX_BUNDLE_SIZE / 1024 / 1024}MB`,
      size: bodyBuffer.length,
      maxSize: MAX_BUNDLE_SIZE,
    });
  }

  // 4. Validar que é tarball (gzip magic bytes)
  if (bodyBuffer[0] !== 0x1f || bodyBuffer[1] !== 0x8b) {
    return reply.status(400).send({
      error: 'Invalid file format. Expected gzipped tarball (.tar.gz)',
    });
  }

  // 5. Verificar hash se fornecido
  if (contentHash) {
    const calculatedHash = crypto
      .createHash('sha256')
      .update(bodyBuffer)
      .digest('hex');

    if (calculatedHash !== contentHash) {
      return reply.status(400).send({
        error: 'Content hash mismatch',
        expected: contentHash,
        received: calculatedHash,
      });
    }
  }

  // 6. Upload para IPFS
  try {
    const { uploadDirectoryToIpfs } = await import('../lib/ipfs.js');

    const result = await uploadDirectoryToIpfs(
      bodyBuffer,
      `${appSlug}-${appVersion}`,
      {
        maxFiles: 1000,
        maxFileSize: 10 * 1024 * 1024, // 10MB per file
        validateStructure: true,
      }
    );

    console.log(`[Upload] Bundle uploaded for ${appSlug}@${appVersion}: ${result.cid}`);

    return {
      cid: result.cid,
      bundleUrl: `https://bazari.libervia.xyz/ipfs/${result.cid}`,
      files: result.files,
      totalSize: result.totalSize,
    };
  } catch (error) {
    console.error('[Upload] IPFS upload failed:', error);

    return reply.status(500).send({
      error: 'Failed to upload bundle to IPFS',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
```

### 4. Melhorar uploadDirectoryToIpfs

```typescript
// apps/api/src/lib/ipfs.ts

import path from 'path';

interface UploadOptions {
  maxFiles?: number;
  maxFileSize?: number;
  validateStructure?: boolean;
}

interface UploadResult {
  cid: string;
  files: number;
  totalSize: number;
}

export async function uploadDirectoryToIpfs(
  tarballBuffer: Buffer,
  name: string,
  options?: UploadOptions
): Promise<UploadResult> {
  if (!ipfsPool) {
    throw new Error('[IPFS] IPFS pool not configured');
  }

  const { createGunzip } = await import('zlib');
  const tar = await import('tar-stream');
  const { Readable } = await import('stream');
  const { pipeline } = await import('stream/promises');

  const maxFiles = options?.maxFiles ?? 1000;
  const maxFileSize = options?.maxFileSize ?? 10 * 1024 * 1024;
  const files: Array<{ path: string; content: Buffer }> = [];
  let totalSize = 0;

  // Extrair tarball
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
      const safePath = normalizedPath.replace(/^(\.\.(\/|\\|$))+/, '');

      if (safePath !== normalizedPath || safePath.startsWith('/')) {
        console.warn(`[IPFS] Blocked path traversal: ${header.name}`);
        stream.resume();
        next();
        return;
      }

      // File count limit
      if (files.length >= maxFiles) {
        reject(new Error(`Too many files. Maximum: ${maxFiles}`));
        return;
      }

      const chunks: Buffer[] = [];
      let fileSize = 0;

      stream.on('data', (chunk: Buffer) => {
        fileSize += chunk.length;

        if (fileSize > maxFileSize) {
          reject(new Error(
            `File too large: ${header.name}. Maximum: ${maxFileSize / 1024 / 1024}MB`
          ));
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
    const hasIndex = files.some(
      (f) => f.path === 'index.html' || f.path.endsWith('/index.html')
    );

    if (!hasIndex) {
      throw new Error('Bundle must contain index.html at root');
    }
  }

  console.log(`[IPFS] Extracted ${files.length} files (${totalSize} bytes) from ${name}`);

  // Upload to IPFS
  const client = ipfsPool['clients'][0].client;
  const ipfsFiles = files.map((f) => ({
    path: `${name}/${f.path}`,
    content: f.content,
  }));

  let rootCid = '';
  for await (const result of client.addAll(ipfsFiles, {
    pin: true,
    wrapWithDirectory: false,
  })) {
    if (result.path === name) {
      rootCid = result.cid.toString();
    }
  }

  if (!rootCid) {
    throw new Error('[IPFS] Failed to get root CID for directory');
  }

  console.log(`[IPFS] Uploaded ${name} with CID: ${rootCid}`);

  return {
    cid: rootCid,
    files: files.length,
    totalSize,
  };
}
```

### 5. Adicionar Endpoint de Verificação

```typescript
// apps/api/src/routes/developer.ts

app.get('/developer/bundle/verify/:cid', {
  onRequest: authOnRequest,
}, async (request, reply) => {
  const { cid } = request.params as { cid: string };

  // Validar formato do CID
  if (!/^Qm[a-zA-Z0-9]{44}$|^bafy[a-zA-Z0-9]+$/.test(cid)) {
    return reply.status(400).send({
      error: 'Invalid CID format',
    });
  }

  try {
    const { downloadFromIpfs } = await import('../lib/ipfs.js');

    // Tentar baixar index.html
    const content = await downloadFromIpfs(`${cid}/index.html`);

    return {
      cid,
      accessible: true,
      indexSize: content.length,
      bundleUrl: `https://bazari.libervia.xyz/ipfs/${cid}`,
    };
  } catch (error) {
    return {
      cid,
      accessible: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});
```

## Passos de Deploy

```bash
# 1. Verificar que IPFS gateway está ativo
curl http://127.0.0.1:8080/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/readme

# 2. Atualizar Nginx
sudo nano /etc/nginx/sites-available/bazari.conf
# Fazer as alterações acima

# 3. Testar config
sudo nginx -t

# 4. Recarregar Nginx
sudo systemctl reload nginx

# 5. Testar acesso
curl -I https://bazari.libervia.xyz/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/readme

# 6. Rebuild API
cd /root/bazari/apps/api
pnpm build

# 7. Restart API
sudo systemctl restart bazari-api
```

## Testes

1. Upload de bundle via CLI
2. Verificar que CID é retornado
3. Acessar `https://bazari.libervia.xyz/ipfs/{CID}/index.html`
4. Verificar headers (Cache-Control, CORS)
5. Testar em iframe (ExternalAppPage)
6. Verificar endpoint de verificação

## Critérios de Aceitação

- [ ] Nginx configurado para proxy IPFS gateway (porta 8080)
- [ ] Upload-bundle com validações de header
- [ ] Upload-bundle com validação de tamanho
- [ ] Upload-bundle com validação de formato
- [ ] uploadDirectoryToIpfs com proteção path traversal
- [ ] uploadDirectoryToIpfs com validação de estrutura
- [ ] Endpoint de verificação de bundle
- [ ] Bundles acessíveis via `https://bazari.libervia.xyz/ipfs/{CID}`
- [ ] Apps funcionando em iframe sem erros
