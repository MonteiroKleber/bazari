# P0: Upload Real para IPFS

**Prioridade:** P0 (Crítica)
**Status:** Pendente
**Esforço:** Baixo-Médio
**Impacto:** Alto

---

## Problema Atual

O CLI `bazari publish` gera um CID simulado ao invés de fazer upload real para IPFS:

```typescript
// packages/bazari-cli/src/commands/publish.ts (linha 136-137)
// For now, simulate bundle upload by storing locally
// In production: upload to IPFS and get CID
const bundleUrl = `ipfs://simulated-cid-${buildInfo.hash.substring(0, 16)}`;
```

Isso significa que apps publicados não têm bundle real acessível.

---

## Solução

### Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUXO DE PUBLICAÇÃO                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [1] Developer                                                               │
│       │                                                                      │
│       ▼                                                                      │
│  [2] bazari build                                                            │
│       │  Gera dist/ com .build-info.json                                    │
│       ▼                                                                      │
│  [3] bazari publish                                                          │
│       │                                                                      │
│       ├──▶ [4] Cria tarball do dist/                                        │
│       │                                                                      │
│       ├──▶ [5] POST /developer/apps/:id/bundle                              │
│       │         { file: multipart, hash: string }                           │
│       │                                                                      │
│       │    ┌───────────────────────────────────────┐                        │
│       │    │           BACKEND                      │                        │
│       │    │                                        │                        │
│       │    │  [6] Valida hash do arquivo           │                        │
│       │    │  [7] uploadToIpfs(buffer)             │                        │
│       │    │  [8] Retorna { cid: "Qm..." }         │                        │
│       │    │                                        │                        │
│       │    └───────────────────────────────────────┘                        │
│       │                                                                      │
│       ├──▶ [9] bundleUrl = "ipfs://Qm..."                                   │
│       │                                                                      │
│       └──▶ [10] POST /developer/apps/:id/submit                             │
│                 { version, bundleUrl, bundleHash }                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementação

### Task 1: Criar endpoint de upload no Backend

**Arquivo:** `apps/api/src/routes/developer.ts`

**Adicionar:**

```typescript
import { uploadToIpfs } from '../lib/ipfs.js';
import crypto from 'crypto';

// POST /developer/apps/:id/bundle - Upload bundle para IPFS
app.post('/developer/apps/:id/bundle', {
  onRequest: authOnRequest,
}, async (request, reply) => {
  const userId = (request as any).authUser?.sub;
  const { id: appId } = request.params as { id: string };

  // Verificar se app pertence ao desenvolvedor
  const appData = await prisma.thirdPartyApp.findFirst({
    where: { id: appId, developerId: userId },
  });

  if (!appData) {
    return reply.status(404).send({ error: 'App not found' });
  }

  // Processar multipart
  const data = await request.file();
  if (!data) {
    return reply.status(400).send({ error: 'No file uploaded' });
  }

  // Ler arquivo em buffer
  const chunks: Buffer[] = [];
  for await (const chunk of data.file) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  // Validar tamanho (max 10MB)
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (buffer.length > MAX_SIZE) {
    return reply.status(400).send({ error: 'Bundle too large (max 10MB)' });
  }

  // Calcular hash SHA256
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');

  try {
    // Upload para IPFS
    const cid = await uploadToIpfs(buffer, {
      filename: `${appData.appId}-${Date.now()}.tar.gz`,
    });

    app.log.info({ appId, cid, size: buffer.length, hash }, 'Bundle uploaded to IPFS');

    return {
      success: true,
      cid,
      bundleUrl: `ipfs://${cid}`,
      hash,
      size: buffer.length,
    };
  } catch (error) {
    app.log.error({ appId, error }, 'Failed to upload bundle to IPFS');
    return reply.status(500).send({ error: 'Failed to upload to IPFS' });
  }
});
```

**Dependências:**
- `@fastify/multipart` - Para processar upload de arquivos

**Adicionar ao server.ts:**
```typescript
import multipart from '@fastify/multipart';

// Registrar plugin
app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});
```

---

### Task 2: Modificar CLI para usar upload real

**Arquivo:** `packages/bazari-cli/src/commands/publish.ts`

**Modificar:**

```typescript
import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';
import FormData from 'form-data';
import { uploadBundle } from '../utils/api.js';

// ... dentro da action ...

// Upload bundle
spinner.start('Uploading bundle to IPFS...');

try {
  // Criar tarball do diretório de build
  const tarballPath = path.join(os.tmpdir(), `${manifest.appId}-${Date.now()}.tar.gz`);

  await createTarball(buildDir, tarballPath);

  // Upload para API
  const uploadResponse = await uploadBundle(manifest.appId, tarballPath, buildInfo.hash);

  // Limpar arquivo temporário
  await fs.remove(tarballPath);

  if (uploadResponse.error) {
    spinner.fail(`Failed to upload: ${uploadResponse.error}`);
    return;
  }

  const { bundleUrl, cid } = uploadResponse.data!;

  spinner.succeed(`Bundle uploaded to IPFS: ${cid}`);

  // Continuar com submit...

} catch (error) {
  spinner.fail('Upload failed');
  console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
  return;
}

// Função auxiliar para criar tarball
async function createTarball(sourceDir: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('tar', { gzip: true });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}
```

**Arquivo:** `packages/bazari-cli/src/utils/api.ts`

**Modificar função uploadBundle:**

```typescript
import fs from 'fs-extra';
import FormData from 'form-data';

export async function uploadBundle(
  appId: string,
  bundlePath: string,
  bundleHash: string
): Promise<ApiResponse<{ bundleUrl: string; cid: string }>> {
  const config = await loadConfig();
  const token = await getToken();

  const url = `${config.apiUrl}/developer/apps/${appId}/bundle`;

  // Criar FormData com o arquivo
  const form = new FormData();
  form.append('file', fs.createReadStream(bundlePath));
  form.append('hash', bundleHash);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders(),
      },
      body: form as any,
    });

    const data = await response.json().catch(() => null);

    return {
      data: data as { bundleUrl: string; cid: string },
      status: response.status,
      error: response.ok ? undefined : data?.error || `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      status: 0,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}
```

---

### Task 3: Adicionar dependências

**Arquivo:** `packages/bazari-cli/package.json`

**Adicionar:**
```json
{
  "dependencies": {
    "archiver": "^6.0.0",
    "form-data": "^4.0.0"
  },
  "devDependencies": {
    "@types/archiver": "^6.0.0"
  }
}
```

**Arquivo:** `apps/api/package.json`

**Adicionar:**
```json
{
  "dependencies": {
    "@fastify/multipart": "^8.0.0"
  }
}
```

---

### Task 4: Configurar IPFS para produção

**Arquivo:** `apps/api/.env`

**Verificar variáveis:**
```env
# IPFS Configuration
IPFS_API_URLS=http://localhost:5001,http://ipfs-node-2:5001
IPFS_TIMEOUT_MS=30000
IPFS_RETRY_ATTEMPTS=3
```

---

## Testes

### Teste Manual

```bash
# 1. Criar um app de teste
cd /tmp
npx @bazari.libervia.xyz/cli create test-app

# 2. Build
cd test-app
bazari build

# 3. Login (se necessário)
bazari login

# 4. Publish
bazari publish

# 5. Verificar CID retornado
# Deve mostrar: Bundle uploaded to IPFS: Qm...

# 6. Verificar no IPFS
curl https://ipfs.io/ipfs/Qm... | head -c 100
```

### Teste Automatizado

**Arquivo:** `apps/api/src/routes/__tests__/developer-bundle.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestApp, createTestUser } from '../../test-utils';

describe('Developer Bundle Upload', () => {
  let app: FastifyInstance;
  let authToken: string;
  let testAppId: string;

  beforeAll(async () => {
    app = await createTestApp();
    const user = await createTestUser(app);
    authToken = user.token;

    // Criar app de teste
    const createRes = await app.inject({
      method: 'POST',
      url: '/developer/apps',
      headers: { Authorization: `Bearer ${authToken}` },
      payload: {
        appId: 'com.test.bundle-test',
        name: 'Bundle Test',
        slug: 'bundle-test',
        description: 'Test app for bundle upload',
        category: 'tools',
      },
    });
    testAppId = createRes.json().app.id;
  });

  it('should upload bundle to IPFS', async () => {
    const tarball = await createTestTarball();

    const response = await app.inject({
      method: 'POST',
      url: `/developer/apps/${testAppId}/bundle`,
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'multipart/form-data',
      },
      payload: {
        file: tarball,
        hash: 'abc123...',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().cid).toMatch(/^Qm/);
    expect(response.json().bundleUrl).toMatch(/^ipfs:\/\/Qm/);
  });

  it('should reject files > 10MB', async () => {
    const largeTarball = Buffer.alloc(11 * 1024 * 1024); // 11MB

    const response = await app.inject({
      method: 'POST',
      url: `/developer/apps/${testAppId}/bundle`,
      headers: { Authorization: `Bearer ${authToken}` },
      payload: { file: largeTarball },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toContain('too large');
  });
});
```

---

## Critérios de Aceite

- [ ] Endpoint `POST /developer/apps/:id/bundle` implementado
- [ ] CLI usa upload real ao invés de CID simulado
- [ ] Bundle é salvo no IPFS com pin
- [ ] CID é retornado e usado no submit
- [ ] Limite de 10MB funcionando
- [ ] Erro tratado quando IPFS indisponível
- [ ] Logs de upload no servidor
- [ ] Teste E2E passando

---

## Rollback

Caso haja problemas:

1. Reverter CLI para usar CID simulado
2. Manter endpoint de bundle para testes
3. Investigar problemas de IPFS

---

## Monitoramento

### Métricas a Acompanhar

- Upload success rate
- Upload latency (p50, p95, p99)
- IPFS node health
- Bundle sizes distribution

### Alertas

- Upload failure rate > 5%
- Upload latency p95 > 30s
- IPFS node down

---

**Versão:** 1.0.0
**Data:** 2024-12-07
