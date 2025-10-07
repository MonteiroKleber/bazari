# Especificação Técnica — Implementação Loja On‑Chain Unificada

> **Versão:** 1.0
> **Data:** 07/10/2025
> **Baseado em:** Especificação Funcional — Loja On‑Chain Unificada v1.0
> **Repositórios:** `~/bazari` (Web/API/Prisma) e `~/bazari-chain` (Substrate/Rust)

---

## 📋 SUMÁRIO

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura da Solução](#2-arquitetura-da-solução)
3. [Plano de Implementação em Fases](#3-plano-de-implementação-em-fases)
4. [Fase 1: Fundação On‑Chain](#fase-1-fundação-on-chain)
5. [Fase 2: Cache & Fallback](#fase-2-cache--fallback)
6. [Fase 3: Indexação & Busca](#fase-3-indexação--busca)
7. [Fase 4: Consolidação UI](#fase-4-consolidação-ui)
8. [Fase 5: Migração & Cleanup](#fase-5-migração--cleanup)
9. [Anexos](#anexos)

---

## 1. VISÃO GERAL

### 1.1 Objetivo

Implementar a **Loja On‑Chain Unificada** conforme especificação funcional, garantindo que:

- Toda loja seja **NFT** (`pallet-uniques`) desde a criação
- Conteúdo (store/categories/products) seja publicado em **3 JSONs separados** no IPFS
- Cada JSON tenha **CID + SHA-256** ancorados como atributos do NFT
- Sistema tenha **estados de sincronização** (DRAFT, PUBLISHING, SYNCED, DIVERGED, FALLBACK)
- Marketplace use **OpenSearch** para indexação/busca
- Detalhe público seja renderizado **prioritariamente do IPFS** com fallback Postgres
- Interface seja **única** (`/loja/:slug`) sem duplicação

### 1.2 Princípios

- **Verdade oficial** = IPFS validado por hash no NFT
- **Resiliência** = Cache Postgres para fallback
- **Auditabilidade** = Histórico de versões completo
- **Segurança** = Validação de hash em toda leitura crítica
- **Performance** = Indexação OpenSearch + cache estratégico

### 1.3 Stack Tecnológico

| Camada | Tecnologia |
|--------|------------|
| **Blockchain** | Substrate (`pallet-stores`, `pallet-uniques`) |
| **Storage** | IPFS (Kubo) + gateways públicos |
| **Backend** | Node.js + Fastify + Prisma (PostgreSQL) |
| **Workers** | BullMQ + Redis |
| **Indexação** | OpenSearch |
| **Frontend** | React + Vite + TailwindCSS |
| **Libs** | `@polkadot/api`, `kubo-rpc-client` |

---

## 2. ARQUITETURA DA SOLUÇÃO

### 2.1 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Web)                          │
│  - SellerSetupPage (criar/editar loja)                         │
│  - StorePublicPage (detalhe público)                           │
│  - MarketplacePage (listagem/busca)                            │
└────────────┬────────────────────────────────────┬───────────────┘
             │                                    │
             │ HTTP/REST                          │ WebSocket (opcional)
             │                                    │
┌────────────▼────────────────────────────────────▼───────────────┐
│                        API (Fastify)                            │
│  - /stores/:id/publish (POST)                                  │
│  - /stores/:id/publish/status (GET)                            │
│  - /stores/:slug (GET)                                         │
│  - /marketplace/search (GET)                                   │
└──┬──────────┬──────────────┬──────────────┬─────────────┬──────┘
   │          │              │              │             │
   │ Prisma   │ IPFS Client  │ Polkadot API │ OpenSearch  │ BullMQ
   │          │              │              │             │
┌──▼──────┐ ┌─▼──────────┐ ┌─▼────────────┐ ┌───▼──────┐ ┌─▼────────┐
│Postgres│ │ IPFS Node  │ │ Substrate    │ │OpenSearch│ │  Redis   │
│         │ │ (Kubo)     │ │ (bazari-     │ │          │ │          │
│ - Seller│ │            │ │  chain)      │ │ - stores │ │ - queues │
│ Profile │ │ - store.   │ │              │ │ - products│ │ - jobs   │
│ - Product│ │   json     │ │ pallet-stores│ │          │ │          │
│ - Snapshot││ - categories│ │ pallet-uniques│          │ │          │
│ - History││   .json    │ │              │ │          │ │          │
│          │ │ - products.│ │ NFTs:        │ │          │ │          │
│          │ │   json     │ │ - metadata   │ │          │ │          │
│          │ │            │ │ - attributes │ │          │ │          │
└──────────┘ └────────────┘ └──────────────┘ └──────────┘ └──────────┘
                                    │
                                    │ Events
                                    │
┌───────────────────────────────────▼─────────────────────────────┐
│                      WORKERS (BullMQ)                           │
│  - publisherWorker: gera JSONs → IPFS → ancora                 │
│  - indexerWorker: events → OpenSearch + cache                  │
│  - verifierWorker: valida hashes periodicamente                │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Fluxo de Publicação (Pipeline)

```
[Usuário] → [Frontend: "Publicar"]
    ↓
[API: POST /stores/:id/publish] → [publisherWorker (queue)]
    ↓
[Worker] → 1. Gera store.json, categories.json, products.json
    ↓
         → 2. Envia para IPFS → recebe CIDs
    ↓
         → 3. Calcula SHA-256 de cada JSON
    ↓
         → 4. Chama extrinsics:
               - stores.update_metadata(storeCid)
               - uniques.set_attribute("store_hash", hash)
               - uniques.set_attribute("categories_cid", cid)
               - uniques.set_attribute("categories_hash", hash)
               - uniques.set_attribute("products_cid", cid)
               - uniques.set_attribute("products_hash", hash)
               - uniques.set_attribute("version", v)
    ↓
         → 5. Aguarda finalização (block)
    ↓
         → 6. Atualiza Postgres:
               - syncStatus = "SYNCED"
               - version += 1
               - lastSyncBlock = block
               - lastPublishedAt = now()
               - metadataCid, categoriesCid, productsCid, hashes
    ↓
         → 7. Salva snapshot em StoreSnapshot
    ↓
         → 8. Dispara indexerWorker → OpenSearch
    ↓
[Frontend: polling /publish/status] → detecta SYNCED → exibe sucesso
```

### 2.3 Fluxo de Leitura Pública

```
[Usuário] → [Frontend: /loja/:slug]
    ↓
[API: GET /stores/:slug] → 1. Resolve slug → storeId (Postgres)
    ↓
                          → 2. Lê NFT (onChainStoreId):
                                - owner, operators, reputation
                                - attributes (CIDs, hashes, version)
    ↓
                          → 3. Tenta fetch IPFS:
                                a) store.json (via store_cid)
                                b) categories.json (via categories_cid)
                                c) products.json (via products_cid)
    ↓
                          → 4. Para cada JSON:
                                - Calcula hash local
                                - Compara com hash do NFT
                                - Se diverge: marca DIVERGED
                                - Se timeout: usa cache Postgres
    ↓
                          → 5. Retorna payload:
                                {
                                  onChain: {...},
                                  sync: {status: "SYNCED", source: "ipfs"},
                                  store: {...},
                                  categories: [...],
                                  products: [...]
                                }
    ↓
[Frontend] → Renderiza com badge (✅ SYNCED / ⚠️ FALLBACK)
```

---

## 3. PLANO DE IMPLEMENTAÇÃO EM FASES

### Resumo das Fases

| Fase | Duração Estimada | Entregas Principais |
|------|------------------|---------------------|
| **Fase 1** | 2-3 semanas | Múltiplos JSONs, hashes, atributos NFT, endpoints `/publish` |
| **Fase 2** | 1-2 semanas | Cache Postgres, fallback, estados de sincronização |
| **Fase 3** | 2-3 semanas | OpenSearch, workers (indexer/verifier), busca avançada |
| **Fase 4** | 1-2 semanas | Rota única `/loja/:slug`, layouts múltiplos, UX consolidada |
| **Fase 5** | 1 semana | Migração de lojas existentes, cleanup, documentação |

### Dependências entre Fases

```
Fase 1 (bloqueador) ─┬─→ Fase 2 (opcional paralela com Fase 3)
                     │
                     └─→ Fase 3 (indexação depende de Fase 1)
                           │
                           └─→ Fase 4 (UX depende de Fase 2+3)
                                 │
                                 └─→ Fase 5 (migração final)
```

---

## FASE 1: FUNDAÇÃO ON‑CHAIN

**Objetivo:** Separar JSONs, calcular hashes, ancorar atributos no NFT, criar endpoints de publicação.

**Duração:** 2-3 semanas

**Entregas:**
- [ ] Pallet `stores` atualizado (atributos NFT, versionamento)
- [ ] Schema Prisma com campos de sync
- [ ] Funções de geração de JSONs separados
- [ ] Endpoint `/stores/:id/publish` (POST)
- [ ] Endpoint `/stores/:id/publish/status` (GET)
- [ ] Frontend delegando publicação ao backend

---

### PROMPT 1.1: Atualizar Pallet `stores` (Substrate/Rust)

**Contexto:**
Você está trabalhando em `/home/bazari/bazari-chain/pallets/stores/src/lib.rs`. Atualmente o pallet tem:
- `create_store(cid)`: cria NFT e armazena CID único em `MetadataCid`
- `update_metadata(store_id, cid)`: atualiza CID

**Tarefa:**
1. Adicionar storage `StoreVersion<T>` para versionamento incremental
2. Modificar `create_store` para:
   - Setar atributos iniciais no NFT via `uniques::Pallet::<T>::set_attribute`:
     - `"version"` = `"1"`
     - `"slug"` = (receber como parâmetro adicional)
3. Criar novo extrinsic `publish_store`:
   ```rust
   pub fn publish_store(
       origin: OriginFor<T>,
       store_id: T::StoreId,
       store_cid: Vec<u8>,
       store_hash: Vec<u8>,
       categories_cid: Vec<u8>,
       categories_hash: Vec<u8>,
       products_cid: Vec<u8>,
       products_hash: Vec<u8>,
   ) -> DispatchResult
   ```
   - Verificar permissão (owner ou operator)
   - Incrementar `StoreVersion`
   - Atualizar `MetadataCid` com `store_cid`
   - Chamar `uniques::set_attribute` para cada par CID/hash:
     - `"store_cid"`, `"store_hash"`
     - `"categories_cid"`, `"categories_hash"`
     - `"products_cid"`, `"products_hash"`
     - `"version"` (número incremental)
   - Emitir evento `StorePublished { store_id, version, block_number }`

4. Adicionar helper interno:
   ```rust
   fn set_store_attribute(
       store_id: &T::StoreId,
       key: &[u8],
       value: &[u8],
   ) -> DispatchResult
   ```

**Critérios de Aceite:**
- Compilação sem erros
- Testes unitários para `publish_store` (mock uniques)
- Evento `StorePublished` emitido corretamente

**Arquivos a modificar:**
- `/home/bazari/bazari-chain/pallets/stores/src/lib.rs`

**Referências:**
- Spec Funcional: Seção 4.3, 10.4
- Código atual: `lib.rs:248-342` (extrinsics existentes)

---

### PROMPT 1.2: Atualizar Schema Prisma (Database)

**Contexto:**
Arquivo `/home/bazari/bazari/apps/api/prisma/schema.prisma` contém model `SellerProfile` sem campos de sincronização.

**Tarefa:**
1. Adicionar campos em `SellerProfile`:
   ```prisma
   model SellerProfile {
     // ... campos existentes

     // Sincronização on-chain
     syncStatus       String   @default("DRAFT") // DRAFT, PUBLISHING, SYNCED, DIVERGED, FALLBACK
     version          Int      @default(1)
     lastSyncBlock    BigInt?  @db.BigInt
     lastPublishedAt  DateTime?

     // CIDs e hashes
     metadataCid      String?
     categoriesCid    String?
     categoriesHash   String?
     productsCid      String?
     productsHash     String?

     // Campos existentes não modificados
   }
   ```

2. Criar nova model `StorePublishHistory`:
   ```prisma
   model StorePublishHistory {
     id              String   @id @default(cuid())
     storeId         String
     version         Int
     storeCid        String
     storeHash       String
     categoriesCid   String?
     categoriesHash  String?
     productsCid     String?
     productsHash    String?
     blockNumber     BigInt   @db.BigInt
     txHash          String?
     publishedAt     DateTime @default(now())

     @@index([storeId, version])
     @@index([publishedAt])
   }
   ```

3. Gerar migração:
   ```bash
   cd apps/api
   npx prisma migrate dev --name add_store_sync_fields
   ```

**Critérios de Aceite:**
- Migração aplicada sem erros
- `prisma generate` executa com sucesso
- Campos visíveis no Prisma Studio

**Arquivos a modificar:**
- `/home/bazari/bazari/apps/api/prisma/schema.prisma`

**Referências:**
- Spec Funcional: Seção 9.1 (campos de resposta)

---

### PROMPT 1.3: Criar Módulo `publishPipeline.ts` (Backend)

**Contexto:**
Atualmente a publicação é feita no frontend. Precisamos centralizar no backend para controle de estado e retry.

**Tarefa:**
1. Criar arquivo `/home/bazari/bazari/apps/api/src/lib/publishPipeline.ts`

2. Implementar funções:

   **a) Gerar store.json:**
   ```typescript
   export interface StoreJson {
     $schema: string;
     id: string; // onChainStoreId
     slug: string;
     name: string;
     description?: string;
     theme?: {
       layoutVariant?: string; // "classic" | "branded-hero"
       palette?: {
         bg?: string;
         ink?: string;
         brand?: string;
         accent?: string;
       };
       logoUrl?: string;
     };
     policies?: {
       returns?: string;
       shipping?: string;
     };
     version: number;
     publishedAt: string; // ISO 8601
   }

   export async function buildStoreJson(
     prisma: PrismaClient,
     storeId: string, // SellerProfile.id or slug
   ): Promise<StoreJson>
   ```

   **b) Gerar categories.json:**
   ```typescript
   export interface CategoriesJson {
     $schema: string;
     storeId: string;
     version: number;
     categories: Array<{
       id: string;
       name: string;
       children?: string[]; // IDs de subcategorias
     }>;
   }

   export async function buildCategoriesJson(
     prisma: PrismaClient,
     storeId: string,
   ): Promise<CategoriesJson>
   ```
   - Buscar em `SellerProfile.policies.primaryCategories`
   - Normalizar para estrutura hierárquica

   **c) Gerar products.json:**
   ```typescript
   export interface ProductsJson {
     $schema: string;
     storeId: string;
     version: number;
     items: Array<{
       sku: string; // Product.id
       title: string;
       description?: string;
       price: {
         amount: string;
         currency: string; // "BZR"
       };
       categoryId?: string;
       media?: string[]; // IPFS URLs
       attributes?: Record<string, any>;
     }>;
   }

   export async function buildProductsJson(
     prisma: PrismaClient,
     onChainStoreId: bigint,
   ): Promise<ProductsJson>
   ```
   - Buscar `Product` onde `onChainStoreId = X` e `status = PUBLISHED`
   - Incluir mídia via `MediaAsset`

   **d) Calcular hash:**
   ```typescript
   import { createHash } from 'crypto';

   export function calculateJsonHash(json: object): string {
     const canonical = JSON.stringify(json); // ou usar canonical-json
     return createHash('sha256').update(canonical).digest('hex');
   }
   ```

   **e) Upload IPFS:**
   ```typescript
   export async function uploadJsonToIpfs(
     json: object,
     filename: string,
   ): Promise<string> {
     // Usar env.IPFS_API_URL (kubo-rpc-client)
     // Retornar CID
   }
   ```

3. Adicionar types no arquivo ou em `types/store.ts`

**Critérios de Aceite:**
- Funções retornam JSONs conforme schemas da spec
- Hashes SHA-256 calculados corretamente
- Upload IPFS funcional (testar com mock em dev)

**Arquivos a criar:**
- `/home/bazari/bazari/apps/api/src/lib/publishPipeline.ts`

**Referências:**
- Spec Funcional: Seção 10.1, 10.2, 10.3
- Código existente: `catalogBuilder.ts` (reutilizar lógica de produtos)

---

### PROMPT 1.4: Criar Endpoint `/stores/:id/publish` (Backend)

**Contexto:**
Endpoint assíncrono que inicia publicação. Delega trabalho pesado para worker (Fase 3), mas por ora executar síncrono.

**Tarefa:**
1. Criar arquivo `/home/bazari/bazari/apps/api/src/routes/storePublish.ts`

2. Implementar:
   ```typescript
   import type { FastifyInstance } from 'fastify';
   import type { PrismaClient } from '@prisma/client';
   import { z } from 'zod';
   import { authOnRequest } from '../lib/auth/middleware.js';
   import {
     buildStoreJson,
     buildCategoriesJson,
     buildProductsJson,
     calculateJsonHash,
     uploadJsonToIpfs,
   } from '../lib/publishPipeline.js';
   import { getStoresApi } from '../lib/storesChain.js';
   import { Keyring } from '@polkadot/keyring';
   import { cryptoWaitReady } from '@polkadot/util-crypto';

   const publishSchema = z.object({
     signerMnemonic: z.string().optional(), // MVP: receber do front (refatorar depois)
   });

   export async function storePublishRoutes(
     app: FastifyInstance,
     options: { prisma: PrismaClient }
   ) {
     const { prisma } = options;

     // POST /stores/:id/publish
     app.post<{ Params: { id: string } }>(
       '/stores/:id/publish',
       { preHandler: authOnRequest },
       async (request, reply) => {
         const authUser = (request as any).authUser as { sub: string };
         const storeIdentifier = request.params.id;

         // 1. Validar ownership
         const store = await prisma.sellerProfile.findFirst({
           where: {
             userId: authUser.sub,
             OR: [{ id: storeIdentifier }, { shopSlug: storeIdentifier }],
           },
         });
         if (!store) {
           return reply.status(404).send({ error: 'Loja não encontrada' });
         }
         if (!store.onChainStoreId) {
           return reply.status(400).send({ error: 'Loja não publicada on-chain. Crie primeiro.' });
         }

         // 2. Setar status PUBLISHING
         await prisma.sellerProfile.update({
           where: { id: store.id },
           data: { syncStatus: 'PUBLISHING' },
         });

         try {
           // 3. Gerar JSONs
           const storeJson = await buildStoreJson(prisma, store.id);
           const categoriesJson = await buildCategoriesJson(prisma, store.id);
           const productsJson = await buildProductsJson(prisma, store.onChainStoreId);

           // 4. Upload IPFS
           const storeCid = await uploadJsonToIpfs(storeJson, 'store.json');
           const categoriesCid = await uploadJsonToIpfs(categoriesJson, 'categories.json');
           const productsCid = await uploadJsonToIpfs(productsJson, 'products.json');

           // 5. Calcular hashes
           const storeHash = calculateJsonHash(storeJson);
           const categoriesHash = calculateJsonHash(categoriesJson);
           const productsHash = calculateJsonHash(productsJson);

           // 6. Chamar extrinsic publish_store
           const api = await getStoresApi();
           await cryptoWaitReady();

           // TODO: receber signer do front (via payload) ou usar operator backend
           // MVP: assumir que front envia mnemônico (INSEGURO, refatorar)
           const { signerMnemonic } = publishSchema.parse(request.body);
           if (!signerMnemonic) {
             throw new Error('Signer mnemônico não fornecido');
           }

           const keyring = new Keyring({ type: 'sr25519' });
           const pair = keyring.addFromMnemonic(signerMnemonic);

           const tx = api.tx.stores.publishStore(
             store.onChainStoreId.toString(),
             Array.from(new TextEncoder().encode(storeCid)),
             Array.from(Buffer.from(storeHash, 'hex')),
             Array.from(new TextEncoder().encode(categoriesCid)),
             Array.from(Buffer.from(categoriesHash, 'hex')),
             Array.from(new TextEncoder().encode(productsCid)),
             Array.from(Buffer.from(productsHash, 'hex')),
           );

           const result = await new Promise((resolve, reject) => {
             tx.signAndSend(pair, (res) => {
               if (res.dispatchError) {
                 reject(new Error('Dispatch error'));
               }
               if (res.status.isFinalized) {
                 resolve(res);
               }
             });
           });

           // 7. Atualizar Postgres
           const newVersion = (store.version || 1) + 1;
           await prisma.sellerProfile.update({
             where: { id: store.id },
             data: {
               syncStatus: 'SYNCED',
               version: newVersion,
               lastPublishedAt: new Date(),
               metadataCid: storeCid,
               categoriesCid,
               categoriesHash,
               productsCid,
               productsHash,
             },
           });

           // 8. Salvar histórico
           await prisma.storePublishHistory.create({
             data: {
               storeId: store.id,
               version: newVersion,
               storeCid,
               storeHash,
               categoriesCid,
               categoriesHash,
               productsCid,
               productsHash,
               blockNumber: BigInt((result as any).status.asFinalized.toString()),
               publishedAt: new Date(),
             },
           });

           return reply.send({
             status: 'SYNCED',
             version: newVersion,
             cids: { store: storeCid, categories: categoriesCid, products: productsCid },
           });

         } catch (error) {
           // Reverter status
           await prisma.sellerProfile.update({
             where: { id: store.id },
             data: { syncStatus: 'DRAFT' },
           });

           app.log.error({ err: error }, 'Erro ao publicar loja');
           return reply.status(500).send({ error: (error as Error).message });
         }
       }
     );

     // GET /stores/:id/publish/status
     app.get<{ Params: { id: string } }>(
       '/stores/:id/publish/status',
       async (request, reply) => {
         const storeIdentifier = request.params.id;

         const store = await prisma.sellerProfile.findFirst({
           where: {
             OR: [{ id: storeIdentifier }, { shopSlug: storeIdentifier }],
           },
           select: {
             syncStatus: true,
             version: true,
             lastSyncBlock: true,
             lastPublishedAt: true,
           },
         });

         if (!store) {
           return reply.status(404).send({ error: 'Loja não encontrada' });
         }

         return reply.send({
           status: store.syncStatus,
           version: store.version,
           block: store.lastSyncBlock?.toString(),
           publishedAt: store.lastPublishedAt?.toISOString(),
         });
       }
     );
   }
   ```

3. Registrar rotas em `/home/bazari/bazari/apps/api/src/server.ts`:
   ```typescript
   import { storePublishRoutes } from './routes/storePublish.js';
   // ...
   await app.register(storePublishRoutes, { prisma });
   ```

**Critérios de Aceite:**
- Endpoint retorna 200 com status SYNCED após publicação
- Histórico salvo em `StorePublishHistory`
- Extrinsic `publish_store` executada com sucesso
- Erro tratado (status volta para DRAFT)

**Arquivos a criar:**
- `/home/bazari/bazari/apps/api/src/routes/storePublish.ts`

**Arquivos a modificar:**
- `/home/bazari/bazari/apps/api/src/server.ts`

**Referências:**
- Spec Funcional: Seção 9.2, 9.3

---

### PROMPT 1.5: Atualizar Frontend `SellerSetupPage` (Delegar Publicação)

**Contexto:**
Atualmente o front faz upload IPFS e chama extrínsecas diretamente. Vamos delegar para o backend.

**Tarefa:**
1. Modificar `/home/bazari/bazari/apps/web/src/pages/SellerSetupPage.tsx`

2. Refatorar `handleSubmit` (linhas 490-591):
   ```typescript
   const handleSubmit = useCallback(
     async (event: React.FormEvent) => {
       event.preventDefault();
       // ... validações existentes

       if (!onChainEnabled) {
         await submitOffChainOnly(payload);
         return;
       }

       try {
         setSaving(true);
         setError(null);

         // 1. Salvar rascunho (sem publicar)
         await persistSellerProfile(payload);

         // 2. Solicitar PIN para assinar
         const pin = await PinService.getPin({
           title: t('seller.onchain.pinTitle'),
           description: t('seller.onchain.pinDescription'),
           validate: async (candidate) => {
             try {
               await decryptMnemonic(
                 activeAccount!.cipher,
                 activeAccount!.iv,
                 activeAccount!.salt,
                 candidate,
                 activeAccount!.iterations
               );
               return null;
             } catch {
               return t('wallet.send.errors.pinInvalid') as string;
             }
           },
         });

         const mnemonic = await decryptMnemonic(
           activeAccount!.cipher,
           activeAccount!.iv,
           activeAccount!.salt,
           pin,
           activeAccount!.iterations
         );

         // 3. Chamar endpoint de publicação
         const response = await sellerApi.publishStore(storeIdentifier!, {
           signerMnemonic: mnemonic, // TODO: refatorar (usar signed payload)
         });

         toast.success(t('seller.onchain.publishSuccess'));

         // 4. Polling de status (opcional)
         const checkStatus = async () => {
           const status = await sellerApi.getPublishStatus(storeIdentifier!);
           if (status.status === 'SYNCED') {
             await refreshOnChainData(onChainStoreId!);
             navigate(`/loja/${shopSlug}`);
           } else if (status.status === 'PUBLISHING') {
             setTimeout(checkStatus, 2000);
           } else {
             setError(t('seller.onchain.publishFailed'));
           }
         };
         await checkStatus();

       } catch (err) {
         handleOperationError(err);
       } finally {
         setSaving(false);
       }
     },
     [/* deps */]
   );
   ```

3. Adicionar métodos em `/home/bazari/bazari/apps/web/src/modules/seller/api.ts`:
   ```typescript
   export async function publishStore(
     storeId: string,
     payload: { signerMnemonic: string }
   ) {
     return authenticatedJSON<{ status: string; version: number; cids: any }>(
       `/stores/${storeId}/publish`,
       { method: 'POST', body: JSON.stringify(payload) }
     );
   }

   export async function getPublishStatus(storeId: string) {
     return getPublicJSON<{ status: string; version: number; block?: string }>(
       `/stores/${storeId}/publish/status`
     );
   }
   ```

**Critérios de Aceite:**
- Publicação funciona via backend
- Spinner exibido durante PUBLISHING
- Sucesso redireciona para página pública
- Erro tratado e exibido

**Arquivos a modificar:**
- `/home/bazari/bazari/apps/web/src/pages/SellerSetupPage.tsx`
- `/home/bazari/bazari/apps/web/src/modules/seller/api.ts`

**Referências:**
- Código atual: `SellerSetupPage.tsx:490-591`

---

### PROMPT 1.6: Testes de Integração (Fase 1)

**Contexto:**
Validar pipeline completo de publicação.

**Tarefa:**
1. Criar arquivo `/home/bazari/bazari/apps/api/src/routes/__tests__/storePublish.test.ts`

2. Testes:
   ```typescript
   import { describe, it, expect, beforeAll, afterAll } from 'vitest';
   import { buildFastifyApp } from '../../server.js';
   import type { FastifyInstance } from 'fastify';

   describe('POST /stores/:id/publish', () => {
     let app: FastifyInstance;

     beforeAll(async () => {
       app = await buildFastifyApp();
     });

     afterAll(async () => {
       await app.close();
     });

     it('deve publicar loja com 3 JSONs separados', async () => {
       // TODO: criar loja mock, chamar endpoint, verificar CIDs
     });

     it('deve retornar erro se loja não existe', async () => {
       // ...
     });

     it('deve calcular hashes corretamente', async () => {
       // ...
     });
   });
   ```

3. Executar:
   ```bash
   cd apps/api
   npm test -- storePublish.test.ts
   ```

**Critérios de Aceite:**
- Todos os testes passam
- Cobertura > 80% em `publishPipeline.ts` e `storePublish.ts`

**Arquivos a criar:**
- `/home/bazari/bazari/apps/api/src/routes/__tests__/storePublish.test.ts`

---

## FASE 2: CACHE & FALLBACK

**Objetivo:** Implementar cache Postgres para fallback quando IPFS falhar, estados de sincronização visíveis, verificação de hash.

**Duração:** 1-2 semanas

**Entregas:**
- [ ] Tabela `StoreSnapshot` para cache
- [ ] Lógica de fallback em `/stores/:slug`
- [ ] Verificação de hash (detectar DIVERGED)
- [ ] Componente `<SyncBadge>` no frontend
- [ ] Endpoint `/stores/:id/verify` (forçar verificação)

---

### PROMPT 2.1: Criar Tabela `StoreSnapshot` (Prisma)

**Contexto:**
Armazenar snapshot dos JSONs publicados para usar como fallback.

**Tarefa:**
1. Adicionar em `/home/bazari/bazari/apps/api/prisma/schema.prisma`:
   ```prisma
   model StoreSnapshot {
     id              String   @id @default(cuid())
     storeId         String
     version         Int
     storeJson       Json
     categoriesJson  Json?
     productsJson    Json?
     cachedAt        DateTime @default(now())

     @@unique([storeId, version])
     @@index([storeId])
     @@index([cachedAt])
   }
   ```

2. Gerar migração:
   ```bash
   npx prisma migrate dev --name add_store_snapshot
   ```

**Critérios de Aceite:**
- Migração aplicada
- Prisma types atualizados

**Arquivos a modificar:**
- `/home/bazari/bazari/apps/api/prisma/schema.prisma`

---

### PROMPT 2.2: Atualizar Pipeline de Publicação (Salvar Snapshot)

**Contexto:**
Após publicar no IPFS, salvar JSONs no Postgres.

**Tarefa:**
1. Modificar `/home/bazari/bazari/apps/api/src/routes/storePublish.ts`

2. Após linha de `prisma.storePublishHistory.create`, adicionar:
   ```typescript
   // Salvar snapshot para fallback
   await prisma.storeSnapshot.create({
     data: {
       storeId: store.id,
       version: newVersion,
       storeJson: storeJson as any,
       categoriesJson: categoriesJson as any,
       productsJson: productsJson as any,
     },
   });
   ```

**Critérios de Aceite:**
- Snapshot salvo após cada publicação
- Verificar via Prisma Studio

**Arquivos a modificar:**
- `/home/bazari/bazari/apps/api/src/routes/storePublish.ts`

---

### PROMPT 2.3: Implementar Fallback em `GET /stores/:slug`

**Contexto:**
Atualizar endpoint para:
1. Tentar IPFS
2. Validar hash
3. Usar cache se falhar

**Tarefa:**
1. Modificar `/home/bazari/bazari/apps/api/src/routes/stores.ts`

2. Refatorar `GET /stores/:id` (linhas 27-58):
   ```typescript
   app.get<{ Params: { slug: string } }>('/stores/:slug', async (request, reply) => {
     const slug = request.params.slug;

     // 1. Resolver slug → storeId
     const sellerProfile = await prisma.sellerProfile.findUnique({
       where: { shopSlug: slug },
       select: {
         id: true,
         shopName: true,
         shopSlug: true,
         onChainStoreId: true,
         version: true,
         metadataCid: true,
         categoriesCid: true,
         categoriesHash: true,
         productsCid: true,
         productsHash: true,
         syncStatus: true,
       },
     });

     if (!sellerProfile || !sellerProfile.onChainStoreId) {
       return reply.status(404).send({ error: 'Loja não encontrada' });
     }

     // 2. Buscar dados on-chain (owner, operators, reputation)
     const onChainStore = await getStore(sellerProfile.onChainStoreId.toString());
     if (!onChainStore) {
       return reply.status(404).send({ error: 'Loja on-chain não encontrada' });
     }

     // 3. Tentar fetch IPFS + validação
     let source: 'ipfs' | 'postgres' = 'ipfs';
     let storeData: any;
     let categoriesData: any[];
     let productsData: any[];

     try {
       // Fetch store.json
       const storeIpfs = await fetchIpfsJson(sellerProfile.metadataCid!, 'stores');
       const storeHashLocal = calculateJsonHash(storeIpfs.metadata);

       if (storeHashLocal !== sellerProfile.categoriesHash) {
         // Hash divergente → marcar DIVERGED
         await prisma.sellerProfile.update({
           where: { id: sellerProfile.id },
           data: { syncStatus: 'DIVERGED' },
         });
         throw new Error('Hash divergente detectado');
       }

       storeData = storeIpfs.metadata;

       // Fetch categories.json
       const categoriesIpfs = await fetchIpfsJson(sellerProfile.categoriesCid!, 'stores');
       const categoriesHashLocal = calculateJsonHash(categoriesIpfs.metadata);

       if (categoriesHashLocal !== sellerProfile.categoriesHash) {
         throw new Error('Hash de categorias divergente');
       }

       categoriesData = categoriesIpfs.metadata.categories;

       // Fetch products.json
       const productsIpfs = await fetchIpfsJson(sellerProfile.productsCid!, 'stores');
       const productsHashLocal = calculateJsonHash(productsIpfs.metadata);

       if (productsHashLocal !== sellerProfile.productsHash) {
         throw new Error('Hash de produtos divergente');
       }

       productsData = productsIpfs.metadata.items;

     } catch (error) {
       // Fallback para snapshot Postgres
       app.log.warn({ err: error, storeId: sellerProfile.id }, 'IPFS fetch falhou, usando cache');

       const snapshot = await prisma.storeSnapshot.findFirst({
         where: { storeId: sellerProfile.id },
         orderBy: { version: 'desc' },
       });

       if (!snapshot) {
         return reply.status(503).send({ error: 'IPFS indisponível e sem cache' });
       }

       source = 'postgres';
       storeData = snapshot.storeJson;
       categoriesData = snapshot.categoriesJson?.categories || [];
       productsData = snapshot.productsJson?.items || [];

       // Atualizar status para FALLBACK
       await prisma.sellerProfile.update({
         where: { id: sellerProfile.id },
         data: { syncStatus: 'FALLBACK' },
       });
     }

     // 4. Montar resposta
     return reply.send({
       id: sellerProfile.onChainStoreId.toString(),
       slug: sellerProfile.shopSlug,
       onChain: {
         classId: 10, // TODO: pegar do config
         instanceId: sellerProfile.onChainStoreId.toString(),
         owner: onChainStore.owner,
         metadataCid: sellerProfile.metadataCid,
         attributes: {
           store_cid: sellerProfile.metadataCid,
           categories_cid: sellerProfile.categoriesCid,
           categories_hash: sellerProfile.categoriesHash,
           products_cid: sellerProfile.productsCid,
           products_hash: sellerProfile.productsHash,
         },
       },
       theme: storeData.theme || null,
       sync: {
         status: sellerProfile.syncStatus,
         source,
         lastCheckedAt: new Date().toISOString(),
       },
       store: storeData,
       categories: categoriesData,
       products: productsData,
     });
   });
   ```

3. Adicionar import:
   ```typescript
   import { calculateJsonHash } from '../lib/publishPipeline.js';
   ```

**Critérios de Aceite:**
- Fallback funciona se IPFS timeout
- Hash divergente seta `syncStatus=DIVERGED`
- Resposta inclui `sync.source` e `sync.status`

**Arquivos a modificar:**
- `/home/bazari/bazari/apps/api/src/routes/stores.ts`

---

### PROMPT 2.4: Criar Componente `<SyncBadge>` (Frontend)

**Contexto:**
Exibir estado de sincronização visualmente.

**Tarefa:**
1. Criar `/home/bazari/bazari/apps/web/src/components/SyncBadge.tsx`:
   ```tsx
   import { Badge } from '@/components/ui/badge';
   import { CheckCircle2, FileEdit, AlertTriangle, RefreshCw, Database } from 'lucide-react';

   type SyncStatus = 'DRAFT' | 'PUBLISHING' | 'SYNCED' | 'DIVERGED' | 'FALLBACK';

   interface SyncBadgeProps {
     status: SyncStatus;
     source?: 'ipfs' | 'postgres';
     className?: string;
   }

   export function SyncBadge({ status, source, className }: SyncBadgeProps) {
     const configs = {
       DRAFT: {
         icon: FileEdit,
         label: 'Rascunho',
         variant: 'secondary' as const,
       },
       PUBLISHING: {
         icon: RefreshCw,
         label: 'Publicando...',
         variant: 'default' as const,
         className: 'animate-pulse',
       },
       SYNCED: {
         icon: CheckCircle2,
         label: source === 'ipfs' ? 'Sincronizado (IPFS)' : 'Sincronizado',
         variant: 'default' as const,
         className: 'bg-green-500',
       },
       DIVERGED: {
         icon: AlertTriangle,
         label: 'Divergente',
         variant: 'destructive' as const,
       },
       FALLBACK: {
         icon: Database,
         label: 'Fallback (Cache)',
         variant: 'secondary' as const,
         className: 'bg-yellow-600',
       },
     };

     const config = configs[status];
     const Icon = config.icon;

     return (
       <Badge
         variant={config.variant}
         className={`${config.className || ''} ${className || ''}`}
       >
         <Icon className="mr-1 h-3 w-3" />
         {config.label}
       </Badge>
     );
   }
   ```

2. Usar em `StorePublicPage.tsx` (após linha 343):
   ```tsx
   import { SyncBadge } from '@/components/SyncBadge';

   // No JSX:
   <div className="flex items-center gap-2">
     <span>Loja on-chain #{store.payload.storeId}</span>
     <SyncBadge
       status={store.payload.sync?.status as any}
       source={store.payload.sync?.source as any}
     />
   </div>
   ```

**Critérios de Aceite:**
- Badge exibido corretamente para cada estado
- Ícone e cor adequados
- Responsivo

**Arquivos a criar:**
- `/home/bazari/bazari/apps/web/src/components/SyncBadge.tsx`

**Arquivos a modificar:**
- `/home/bazari/bazari/apps/web/src/pages/StorePublicPage.tsx`

---

### PROMPT 2.5: Endpoint de Verificação Manual

**Contexto:**
Permitir reancorar se DIVERGED.

**Tarefa:**
1. Adicionar em `/home/bazari/bazari/apps/api/src/routes/storePublish.ts`:
   ```typescript
   // POST /stores/:id/verify
   app.post<{ Params: { id: string } }>(
     '/stores/:id/verify',
     { preHandler: authOnRequest },
     async (request, reply) => {
       const authUser = (request as any).authUser as { sub: string };
       const storeIdentifier = request.params.id;

       const store = await prisma.sellerProfile.findFirst({
         where: {
           userId: authUser.sub,
           OR: [{ id: storeIdentifier }, { shopSlug: storeIdentifier }],
         },
       });

       if (!store) {
         return reply.status(404).send({ error: 'Loja não encontrada' });
       }

       // Fetch IPFS e validar hashes
       try {
         const storeIpfs = await fetchIpfsJson(store.metadataCid!, 'stores');
         const storeHash = calculateJsonHash(storeIpfs.metadata);

         // TODO: comparar com hash do NFT (via uniques.attribute)
         // Se divergente → retornar erro com detalhes

         return reply.send({ status: 'SYNCED', message: 'Hashes válidos' });
       } catch (error) {
         return reply.status(500).send({ error: (error as Error).message });
       }
     }
   );
   ```

2. Adicionar botão no frontend (`SellerSetupPage`):
   ```tsx
   {syncStatus === 'DIVERGED' && (
     <Button onClick={() => sellerApi.verifyStore(storeIdentifier)}>
       Reancorar Metadados
     </Button>
   )}
   ```

**Critérios de Aceite:**
- Endpoint valida hashes
- UI permite reancorar

**Arquivos a modificar:**
- `/home/bazari/bazari/apps/api/src/routes/storePublish.ts`
- `/home/bazari/bazari/apps/web/src/pages/SellerSetupPage.tsx`

---

## FASE 3: INDEXAÇÃO & BUSCA

**Objetivo:** Implementar OpenSearch para indexação, workers para processar eventos on-chain, busca avançada no marketplace.

**Duração:** 2-3 semanas

**Entregas:**
- [ ] Setup OpenSearch (Docker/Cloud)
- [ ] Worker `indexerWorker` (eventos → OpenSearch)
- [ ] Worker `verifierWorker` (validação periódica)
- [ ] Endpoint `/marketplace/search` (query OpenSearch)
- [ ] UI de busca avançada

---

### PROMPT 3.1: Setup OpenSearch (Docker Compose)

**Contexto:**
Adicionar OpenSearch ao ambiente de desenvolvimento.

**Tarefa:**
1. Criar/modificar `/home/bazari/bazari/docker-compose.yml`:
   ```yaml
   version: '3.8'

   services:
     # ... serviços existentes (postgres, redis, etc.)

     opensearch:
       image: opensearchproject/opensearch:2.11.0
       container_name: bazari-opensearch
       environment:
         - discovery.type=single-node
         - OPENSEARCH_JAVA_OPTS=-Xms512m -Xmx512m
         - DISABLE_SECURITY_PLUGIN=true
       ports:
         - "9200:9200"
         - "9600:9600"
       volumes:
         - opensearch-data:/usr/share/opensearch/data
       networks:
         - bazari-network

     opensearch-dashboards:
       image: opensearchproject/opensearch-dashboards:2.11.0
       container_name: bazari-opensearch-dashboards
       ports:
         - "5601:5601"
       environment:
         - OPENSEARCH_HOSTS=http://opensearch:9200
         - DISABLE_SECURITY_DASHBOARDS_PLUGIN=true
       depends_on:
         - opensearch
       networks:
         - bazari-network

   volumes:
     opensearch-data:

   networks:
     bazari-network:
       driver: bridge
   ```

2. Adicionar variáveis em `/home/bazari/bazari/apps/api/.env`:
   ```env
   OPENSEARCH_NODE=http://localhost:9200
   OPENSEARCH_INDEX_STORES=bazari_stores
   ```

3. Instalar cliente:
   ```bash
   cd apps/api
   npm install @opensearch-project/opensearch
   ```

4. Criar módulo `/home/bazari/bazari/apps/api/src/lib/opensearch.ts`:
   ```typescript
   import { Client } from '@opensearch-project/opensearch';
   import { env } from '../env.js';

   const client = new Client({
     node: env.OPENSEARCH_NODE || 'http://localhost:9200',
   });

   export async function ensureStoreIndex() {
     const indexName = env.OPENSEARCH_INDEX_STORES || 'bazari_stores';

     const exists = await client.indices.exists({ index: indexName });
     if (exists.body) return;

     await client.indices.create({
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

   export { client as opensearchClient };
   ```

5. Adicionar init em `server.ts`:
   ```typescript
   import { ensureStoreIndex } from './lib/opensearch.js';

   // Antes de app.listen:
   await ensureStoreIndex();
   ```

**Critérios de Aceite:**
- `docker-compose up` inicia OpenSearch
- Índice `bazari_stores` criado automaticamente
- Dashboard acessível em `http://localhost:5601`

**Arquivos a criar:**
- `/home/bazari/bazari/apps/api/src/lib/opensearch.ts`

**Arquivos a modificar:**
- `/home/bazari/bazari/docker-compose.yml`
- `/home/bazari/bazari/apps/api/.env`
- `/home/bazari/bazari/apps/api/src/server.ts`

---

### PROMPT 3.2: Setup BullMQ (Workers)

**Contexto:**
Configurar sistema de filas para workers assíncronos.

**Tarefa:**
1. Instalar dependências:
   ```bash
   cd apps/api
   npm install bullmq ioredis
   ```

2. Adicionar em `.env`:
   ```env
   REDIS_URL=redis://localhost:6379
   ```

3. Criar `/home/bazari/bazari/apps/api/src/lib/queue.ts`:
   ```typescript
   import { Queue, Worker, QueueEvents } from 'bullmq';
   import { Redis } from 'ioredis';
   import { env } from '../env.js';

   const connection = new Redis(env.REDIS_URL || 'redis://localhost:6379', {
     maxRetriesPerRequest: null,
   });

   export const publishQueue = new Queue('store-publish', { connection });
   export const indexQueue = new Queue('store-index', { connection });
   export const verifyQueue = new Queue('store-verify', { connection });

   export { connection };
   ```

**Critérios de Aceite:**
- Conexão Redis estabelecida
- Queues criadas

**Arquivos a criar:**
- `/home/bazari/bazari/apps/api/src/lib/queue.ts`

---

### PROMPT 3.3: Implementar `indexerWorker`

**Contexto:**
Worker que processa publicações e indexa no OpenSearch.

**Tarefa:**
1. Criar `/home/bazari/bazari/apps/api/src/workers/indexerWorker.ts`:
   ```typescript
   import { Worker } from 'bullmq';
   import { connection, indexQueue } from '../lib/queue.js';
   import { opensearchClient } from '../lib/opensearch.js';
   import { prisma } from '../lib/prisma.js'; // assumir singleton
   import { fetchIpfsJson } from '../lib/ipfs.js';
   import { env } from '../env.js';

   interface IndexJobData {
     storeId: string;
     version: number;
   }

   const worker = new Worker<IndexJobData>(
     'store-index',
     async (job) => {
       const { storeId, version } = job.data;

       console.log(`[indexer] Indexando loja ${storeId} v${version}`);

       // 1. Buscar snapshot (fallback se IPFS falhar)
       const snapshot = await prisma.storeSnapshot.findUnique({
         where: { storeId_version: { storeId, version } },
       });

       if (!snapshot) {
         throw new Error(`Snapshot não encontrado: ${storeId} v${version}`);
       }

       const productsJson = snapshot.productsJson as any;

       // 2. Indexar cada produto
       const indexName = env.OPENSEARCH_INDEX_STORES || 'bazari_stores';
       const bulkOps = [];

       for (const item of productsJson.items) {
         bulkOps.push({ index: { _index: indexName, _id: item.sku } });
         bulkOps.push({
           storeId,
           slug: (snapshot.storeJson as any).slug,
           onchain: {
             instanceId: parseInt(storeId, 10),
             owner: '', // TODO: buscar on-chain
           },
           title: item.title,
           description: item.description,
           category: {
             path: item.categoryId,
           },
           price: {
             amount: parseFloat(item.price.amount),
             currency: item.price.currency,
           },
           status: 'PUBLISHED',
           version,
           ipfs: {
             cid: (snapshot as any).productsCid,
           },
           sync: {
             lastIndexedAt: new Date().toISOString(),
           },
         });
       }

       if (bulkOps.length > 0) {
         await opensearchClient.bulk({ body: bulkOps, refresh: true });
       }

       console.log(`[indexer] Indexados ${productsJson.items.length} produtos`);
     },
     { connection }
   );

   worker.on('completed', (job) => {
     console.log(`[indexer] Job ${job.id} concluído`);
   });

   worker.on('failed', (job, err) => {
     console.error(`[indexer] Job ${job?.id} falhou:`, err);
   });

   export { worker as indexerWorker };
   ```

2. Iniciar worker em processo separado:
   - Criar `/home/bazari/bazari/apps/api/src/workers/index.ts`:
     ```typescript
     import { indexerWorker } from './indexerWorker.js';

     console.log('[workers] Iniciando workers...');

     process.on('SIGTERM', async () => {
       console.log('[workers] Encerrando...');
       await indexerWorker.close();
       process.exit(0);
     });
     ```

3. Adicionar script em `package.json`:
   ```json
   {
     "scripts": {
       "workers": "tsx src/workers/index.ts"
     }
   }
   ```

4. Disparar job após publicação (em `storePublish.ts`):
   ```typescript
   import { indexQueue } from '../lib/queue.js';

   // Após salvar snapshot:
   await indexQueue.add('index-store', {
     storeId: store.id,
     version: newVersion,
   });
   ```

**Critérios de Aceite:**
- Worker processa jobs
- Produtos indexados no OpenSearch
- Verificar via Dashboard (`http://localhost:5601`)

**Arquivos a criar:**
- `/home/bazari/bazari/apps/api/src/workers/indexerWorker.ts`
- `/home/bazari/bazari/apps/api/src/workers/index.ts`

**Arquivos a modificar:**
- `/home/bazari/bazari/apps/api/package.json`
- `/home/bazari/bazari/apps/api/src/routes/storePublish.ts`

---

### PROMPT 3.4: Implementar `verifierWorker`

**Contexto:**
Job cron que valida hashes periodicamente.

**Tarefa:**
1. Criar `/home/bazari/bazari/apps/api/src/workers/verifierWorker.ts`:
   ```typescript
   import { Worker } from 'bullmq';
   import { connection, verifyQueue } from '../lib/queue.js';
   import { prisma } from '../lib/prisma.js';
   import { fetchIpfsJson } from '../lib/ipfs.js';
   import { calculateJsonHash } from '../lib/publishPipeline.js';

   const worker = new Worker(
     'store-verify',
     async (job) => {
       console.log('[verifier] Verificando lojas SYNCED...');

       const stores = await prisma.sellerProfile.findMany({
         where: { syncStatus: 'SYNCED' },
         select: {
           id: true,
           metadataCid: true,
           categoriesCid: true,
           categoriesHash: true,
           productsCid: true,
           productsHash: true,
         },
       });

       for (const store of stores) {
         try {
           // Verificar categories
           if (store.categoriesCid && store.categoriesHash) {
             const ipfs = await fetchIpfsJson(store.categoriesCid, 'stores');
             const hash = calculateJsonHash(ipfs.metadata);

             if (hash !== store.categoriesHash) {
               console.warn(`[verifier] DIVERGED: ${store.id} categories`);
               await prisma.sellerProfile.update({
                 where: { id: store.id },
                 data: { syncStatus: 'DIVERGED' },
               });
             }
           }

           // Verificar products
           if (store.productsCid && store.productsHash) {
             const ipfs = await fetchIpfsJson(store.productsCid, 'stores');
             const hash = calculateJsonHash(ipfs.metadata);

             if (hash !== store.productsHash) {
               console.warn(`[verifier] DIVERGED: ${store.id} products`);
               await prisma.sellerProfile.update({
                 where: { id: store.id },
                 data: { syncStatus: 'DIVERGED' },
               });
             }
           }
         } catch (error) {
           console.error(`[verifier] Erro ao verificar ${store.id}:`, error);
         }
       }

       console.log(`[verifier] Verificadas ${stores.length} lojas`);
     },
     { connection }
   );

   export { worker as verifierWorker };
   ```

2. Adicionar cron (usar `bullmq` repeat):
   ```typescript
   // Em workers/index.ts:
   import { verifyQueue } from '../lib/queue.js';

   await verifyQueue.add(
     'verify-all',
     {},
     {
       repeat: {
         pattern: '0 * * * *', // A cada hora
       },
     }
   );
   ```

**Critérios de Aceite:**
- Job executa a cada hora
- Lojas com hash divergente marcadas como DIVERGED

**Arquivos a criar:**
- `/home/bazari/bazari/apps/api/src/workers/verifierWorker.ts`

**Arquivos a modificar:**
- `/home/bazari/bazari/apps/api/src/workers/index.ts`

---

### PROMPT 3.5: Endpoint `/marketplace/search`

**Contexto:**
Query OpenSearch com filtros avançados.

**Tarefa:**
1. Criar `/home/bazari/bazari/apps/api/src/routes/marketplace.ts`:
   ```typescript
   import type { FastifyInstance } from 'fastify';
   import { z } from 'zod';
   import { opensearchClient } from '../lib/opensearch.js';
   import { env } from '../env.js';

   const searchSchema = z.object({
     q: z.string().optional(),
     storeId: z.string().optional(),
     category: z.string().optional(),
     minPrice: z.coerce.number().optional(),
     maxPrice: z.coerce.number().optional(),
     sort: z.enum(['createdDesc', 'priceAsc', 'priceDesc']).optional().default('createdDesc'),
     limit: z.coerce.number().min(1).max(100).optional().default(24),
     offset: z.coerce.number().min(0).optional().default(0),
   });

   export async function marketplaceRoutes(app: FastifyInstance) {
     app.get('/marketplace/search', async (request, reply) => {
       const query = searchSchema.parse(request.query);

       const must: any[] = [];

       if (query.q) {
         must.push({
           multi_match: {
             query: query.q,
             fields: ['title^2', 'description'],
           },
         });
       }

       if (query.storeId) {
         must.push({ term: { storeId: query.storeId } });
       }

       if (query.category) {
         must.push({ term: { 'category.path': query.category } });
       }

       const filter: any[] = [];

       if (query.minPrice !== undefined || query.maxPrice !== undefined) {
         filter.push({
           range: {
             'price.amount': {
               ...(query.minPrice !== undefined && { gte: query.minPrice }),
               ...(query.maxPrice !== undefined && { lte: query.maxPrice }),
             },
           },
         });
       }

       const sortMap = {
         createdDesc: [{ 'sync.lastIndexedAt': 'desc' }],
         priceAsc: [{ 'price.amount': 'asc' }],
         priceDesc: [{ 'price.amount': 'desc' }],
       };

       const indexName = env.OPENSEARCH_INDEX_STORES || 'bazari_stores';

       const result = await opensearchClient.search({
         index: indexName,
         body: {
           query: {
             bool: {
               must: must.length > 0 ? must : [{ match_all: {} }],
               filter,
             },
           },
           sort: sortMap[query.sort],
           from: query.offset,
           size: query.limit,
         },
       });

       const hits = result.body.hits.hits.map((hit: any) => ({
         id: hit._id,
         ...hit._source,
       }));

       return reply.send({
         items: hits,
         total: result.body.hits.total.value,
         page: {
           limit: query.limit,
           offset: query.offset,
         },
       });
     });
   }
   ```

2. Registrar em `server.ts`:
   ```typescript
   import { marketplaceRoutes } from './routes/marketplace.js';

   await app.register(marketplaceRoutes);
   ```

**Critérios de Aceite:**
- Busca retorna resultados do OpenSearch
- Filtros (categoria, preço) funcionam
- Sort funcionando

**Arquivos a criar:**
- `/home/bazari/bazari/apps/api/src/routes/marketplace.ts`

**Arquivos a modificar:**
- `/home/bazari/bazari/apps/api/src/server.ts`

---

### PROMPT 3.6: UI de Busca Avançada (Frontend)

**Contexto:**
Página de marketplace com filtros.

**Tarefa:**
1. Criar `/home/bazari/bazari/apps/web/src/pages/MarketplacePage.tsx`:
   ```tsx
   import { useState, useEffect } from 'react';
   import { useSearchParams } from 'react-router-dom';
   import { Input } from '@/components/ui/input';
   import { Button } from '@/components/ui/button';
   import { Select } from '@/components/ui/select';
   import { getPublicJSON } from '@/lib/api';

   export default function MarketplacePage() {
     const [searchParams, setSearchParams] = useSearchParams();
     const [results, setResults] = useState<any[]>([]);
     const [loading, setLoading] = useState(false);

     const q = searchParams.get('q') || '';
     const category = searchParams.get('category') || '';

     useEffect(() => {
       const fetchResults = async () => {
         setLoading(true);
         try {
           const data = await getPublicJSON<any>(
             `/marketplace/search?${searchParams.toString()}`
           );
           setResults(data.items || []);
         } catch (error) {
           console.error(error);
         } finally {
           setLoading(false);
         }
       };

       fetchResults();
     }, [searchParams]);

     return (
       <div className="container mx-auto px-4 py-8">
         <h1 className="text-3xl font-bold mb-6">Marketplace</h1>

         <div className="flex gap-4 mb-6">
           <Input
             placeholder="Buscar produtos..."
             value={q}
             onChange={(e) => {
               searchParams.set('q', e.target.value);
               setSearchParams(searchParams);
             }}
           />
           <Button>Buscar</Button>
         </div>

         {loading ? (
           <p>Carregando...</p>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {results.map((item) => (
               <div key={item.id} className="border rounded p-4">
                 <h3 className="font-semibold">{item.title}</h3>
                 <p className="text-sm text-gray-600">{item.description}</p>
                 <p className="text-lg font-bold mt-2">
                   {item.price.amount} {item.price.currency}
                 </p>
               </div>
             ))}
           </div>
         )}
       </div>
     );
   }
   ```

2. Adicionar rota em `App.tsx` ou router:
   ```tsx
   <Route path="/marketplace" element={<MarketplacePage />} />
   ```

**Critérios de Aceite:**
- Busca funciona via OpenSearch
- Resultados exibidos em grid
- Filtros por query string

**Arquivos a criar:**
- `/home/bazari/bazari/apps/web/src/pages/MarketplacePage.tsx`

---

## FASE 4: CONSOLIDAÇÃO UI

**Objetivo:** Consolidar rotas (`/loja/:slug` única), múltiplos layouts, remover flags, melhorar UX.

**Duração:** 1-2 semanas

**Entregas:**
- [ ] Rota única `/loja/:slug`
- [ ] Suporte a layouts (`classic`, `branded-hero`)
- [ ] Remoção de flags de build
- [ ] Tratamento de erros on-chain (UX)
- [ ] Painel de diagnóstico

---

### PROMPT 4.1: Consolidar Rota `/loja/:slug`

**Contexto:**
Atualmente existem `/store/:id` e `/seller/:slug`. Unificar em `/loja/:slug`.

**Tarefa:**
1. Modificar `/home/bazari/bazari/apps/web/src/pages/StorePublicPage.tsx`:
   ```tsx
   // Trocar useParams de { id } para { slug }
   const { slug = '' } = useParams<{ slug: string }>();

   // Trocar chamada API de /stores/:id para /stores/:slug
   const store = await getPublicJSON<any>(`/stores/${slug}`);
   ```

2. Atualizar rotas em `App.tsx`:
   ```tsx
   // Remover:
   <Route path="/store/:id" element={<StorePublicPage />} />
   <Route path="/seller/:slug" element={<SellerPublicPage />} />

   // Adicionar:
   <Route path="/loja/:slug" element={<StorePublicPage />} />

   // Redirects (compat):
   <Route path="/store/:id" element={<Navigate to="/loja/:id" replace />} />
   <Route path="/seller/:slug" element={<Navigate to="/loja/:slug" replace />} />
   ```

3. Atualizar links no app:
   - `SellerSetupPage` → redirecionar para `/loja/${slug}`
   - `MarketplacePage` → links para `/loja/${slug}`

**Critérios de Aceite:**
- `/loja/:slug` funciona
- Redirects funcionam
- Páginas antigas removidas

**Arquivos a modificar:**
- `/home/bazari/bazari/apps/web/src/pages/StorePublicPage.tsx`
- `/home/bazari/bazari/apps/web/src/App.tsx` (ou router config)

---

### PROMPT 4.2: Implementar Layouts Múltiplos

**Contexto:**
Adicionar suporte a `layoutVariant` (classic, branded-hero).

**Tarefa:**
1. Modificar `/home/bazari/bazari/apps/web/src/modules/store/StoreLayout.tsx`:
   ```tsx
   export interface StoreLayoutProps {
     theme?: StoreTheme;
     layout?: 'classic' | 'branded-hero';
     children: React.ReactNode;
   }

   export function StoreLayout({ theme, layout = 'classic', children }: StoreLayoutProps) {
     // ... aplicar CSS vars (existente)

     if (layout === 'branded-hero') {
       return (
         <div className="store-layout-branded" style={cssVars}>
           <div className="hero-section bg-store-brand text-store-bg py-16">
             {/* Hero visual */}
           </div>
           <div className="content-section">{children}</div>
         </div>
       );
     }

     // Classic layout (default)
     return (
       <div className="store-layout-classic" style={cssVars}>
         {children}
       </div>
     );
   }
   ```

2. Usar em `StorePublicPage`:
   ```tsx
   const layoutVariant = metadata.theme?.layoutVariant || 'classic';

   <StoreLayout theme={metadata.theme} layout={layoutVariant}>
     {/* conteúdo */}
   </StoreLayout>
   ```

**Critérios de Aceite:**
- Layout `branded-hero` exibe hero visual
- Layout `classic` mantém estrutura atual
- Transição suave entre layouts

**Arquivos a modificar:**
- `/home/bazari/bazari/apps/web/src/modules/store/StoreLayout.tsx`
- `/home/bazari/bazari/apps/web/src/pages/StorePublicPage.tsx`

---

### PROMPT 4.3: Remover Flags de Build

**Contexto:**
Tornar on-chain o comportamento padrão.

**Tarefa:**
1. Remover flag `STORE_ONCHAIN_V1` do backend:
   - Em `/home/bazari/bazari/apps/api/src/env.ts`: remover `STORE_ONCHAIN_V1`
   - Em `/home/bazari/bazari/apps/api/src/routes/stores.ts`: remover checagem (linhas 23-25)
   - Em `/home/bazari/bazari/apps/api/src/routes/sellers.ts`: remover checagem

2. Remover flag do frontend:
   - Em `/home/bazari/bazari/apps/web/src/config.ts`: remover `FEATURE_FLAGS.store_onchain_v1`
   - Em `SellerSetupPage.tsx`: remover `onChainEnabled` (assumir sempre true)

3. Limpar código condicional:
   ```typescript
   // Antes:
   if (env.STORE_ONCHAIN_V1) {
     // lógica on-chain
   }

   // Depois:
   // lógica on-chain (sempre)
   ```

**Critérios de Aceite:**
- App funciona sem flags
- Sem código morto (if false)
- Build sem warnings

**Arquivos a modificar:**
- `/home/bazari/bazari/apps/api/src/env.ts`
- `/home/bazari/bazari/apps/api/src/routes/stores.ts`
- `/home/bazari/bazari/apps/api/src/routes/sellers.ts`
- `/home/bazari/bazari/apps/web/src/config.ts`
- `/home/bazari/bazari/apps/web/src/pages/SellerSetupPage.tsx`

---

### PROMPT 4.4: Melhorar Tratamento de Erros On-Chain

**Contexto:**
Mapear erros do pallet para mensagens amigáveis.

**Tarefa:**
1. Criar `/home/bazari/bazari/apps/web/src/lib/chainErrors.ts`:
   ```typescript
   export function mapChainError(error: string): string {
     const errorMap: Record<string, string> = {
       'stores.NotOwner': 'Você não tem permissão para realizar esta operação. Apenas o owner pode.',
       'stores.OperatorNotFound': 'Operador não encontrado nesta loja.',
       'stores.OperatorAlreadyExists': 'Este operador já está cadastrado.',
       'stores.OperatorLimitReached': 'Limite de operadores atingido (máximo 10).',
       'stores.StoreNotFound': 'Loja não encontrada on-chain.',
       'stores.TransferAlreadyPending': 'Já existe uma transferência pendente para esta loja.',
       'stores.NoPendingTransfer': 'Não há transferência pendente.',
       'stores.NotPendingRecipient': 'Apenas o destinatário da transferência pode aceitá-la.',
       'uniques.InUse': 'Este NFT está em uso (pode haver transferência pendente).',
       'uniques.NoPermission': 'Sem permissão para modificar este NFT.',
     };

     return errorMap[error] || `Erro on-chain: ${error}`;
   }
   ```

2. Usar em `SellerSetupPage.tsx`:
   ```tsx
   import { mapChainError } from '@/lib/chainErrors';

   const handleOperationError = useCallback((err: unknown) => {
     let message = t('errors.generic');

     if (err instanceof Error) {
       // Detectar erro on-chain
       if (err.message.includes('.')) {
         message = mapChainError(err.message);
       } else {
         message = err.message;
       }
     }

     setError(message);
     toast.error(message);
   }, [t]);
   ```

**Critérios de Aceite:**
- Erros mapeados corretamente
- Mensagens amigáveis exibidas
- Fallback para erro genérico

**Arquivos a criar:**
- `/home/bazari/bazari/apps/web/src/lib/chainErrors.ts`

**Arquivos a modificar:**
- `/home/bazari/bazari/apps/web/src/pages/SellerSetupPage.tsx`

---

### PROMPT 4.5: Painel de Diagnóstico (Seller Dashboard)

**Contexto:**
Adicionar seção de diagnóstico no `SellerSetupPage`.

**Tarefa:**
1. Adicionar card de diagnóstico em `SellerSetupPage.tsx` (após form):
   ```tsx
   {onChainStoreId && (
     <Card>
       <CardHeader>
         <CardTitle className="flex items-center gap-2">
           <Info className="h-5 w-5" />
           Diagnóstico On-Chain
         </CardTitle>
       </CardHeader>
       <CardContent className="space-y-4">
         <div className="grid grid-cols-2 gap-4 text-sm">
           <div>
             <Label className="text-xs text-muted-foreground">Store ID</Label>
             <p className="font-mono">{onChainStoreId}</p>
           </div>
           <div>
             <Label className="text-xs text-muted-foreground">Versão</Label>
             <p className="font-mono">{onChainStore?.version || 1}</p>
           </div>
           <div>
             <Label className="text-xs text-muted-foreground">Status</Label>
             <SyncBadge status={syncStatus as any} />
           </div>
           <div>
             <Label className="text-xs text-muted-foreground">Último Bloco</Label>
             <p className="font-mono">{lastSyncBlock?.toString() || 'N/A'}</p>
           </div>
         </div>

         <Separator />

         <div className="space-y-2">
           <Label className="text-xs text-muted-foreground">CIDs Ancorados</Label>
           <div className="space-y-1 text-xs font-mono">
             <div>
               <span className="text-muted-foreground">store:</span> {metadataCid || 'N/A'}
             </div>
             <div>
               <span className="text-muted-foreground">categories:</span> {categoriesCid || 'N/A'}
             </div>
             <div>
               <span className="text-muted-foreground">products:</span> {productsCid || 'N/A'}
             </div>
           </div>
         </div>

         {syncStatus === 'DIVERGED' && (
           <Alert variant="destructive">
             <AlertCircle className="h-4 w-4" />
             <AlertDescription>
               Hash divergente detectado. Conteúdo do IPFS não corresponde ao hash ancorado no NFT.
               <Button
                 variant="outline"
                 size="sm"
                 className="mt-2"
                 onClick={handleReancorar}
               >
                 Reancorar Metadados
               </Button>
             </AlertDescription>
           </Alert>
         )}

         <div className="flex gap-2">
           <Button
             variant="outline"
             size="sm"
             onClick={() => window.open(`https://ipfs.io/ipfs/${metadataCid}`, '_blank')}
             disabled={!metadataCid}
           >
             <ExternalLink className="mr-2 h-4 w-4" />
             Ver no IPFS
           </Button>
           <Button
             variant="outline"
             size="sm"
             onClick={() => sellerApi.verifyStore(storeIdentifier!)}
           >
             <RefreshCw className="mr-2 h-4 w-4" />
             Verificar Hashes
           </Button>
         </div>
       </CardContent>
     </Card>
   )}
   ```

**Critérios de Aceite:**
- Diagnóstico exibe CIDs, hashes, bloco
- Botão "Ver no IPFS" funciona
- Botão "Verificar Hashes" chama endpoint
- Alert de DIVERGED exibido

**Arquivos a modificar:**
- `/home/bazari/bazari/apps/web/src/pages/SellerSetupPage.tsx`

---

## FASE 5: MIGRAÇÃO & CLEANUP

**Objetivo:** Migrar lojas existentes, limpar código legado, documentar.

**Duração:** 1 semana

**Entregas:**
- [ ] Script de migração de lojas existentes
- [ ] Republicação de lojas
- [ ] Remoção de código/rotas antigas
- [ ] Documentação técnica

---

### PROMPT 5.1: Script de Migração de Lojas Existentes

**Contexto:**
Lojas criadas antes da implementação podem não ter NFT.

**Tarefa:**
1. Criar `/home/bazari/bazari/apps/api/src/scripts/migrateStores.ts`:
   ```typescript
   import { prisma } from '../lib/prisma.js';
   import { getStoresApi } from '../lib/storesChain.js';
   import { Keyring } from '@polkadot/keyring';
   import { cryptoWaitReady } from '@polkadot/util-crypto';

   async function migrateStores() {
     await cryptoWaitReady();
     const api = await getStoresApi();

     // Buscar lojas sem onChainStoreId
     const stores = await prisma.sellerProfile.findMany({
       where: { onChainStoreId: null },
       select: { id: true, shopSlug: true, shopName: true, userId: true },
     });

     console.log(`Encontradas ${stores.length} lojas sem NFT`);

     // TODO: definir signer (usar sudo ou operator backend)
     const keyring = new Keyring({ type: 'sr25519' });
     const pair = keyring.addFromUri(process.env.MIGRATION_SURI || '//Alice');

     for (const store of stores) {
       console.log(`Migrando loja ${store.id} (${store.shopSlug})...`);

       try {
         // Criar NFT
         const cid = `ipfs://placeholder-${store.id}`; // temporário
         const tx = api.tx.stores.createStore(
           Array.from(new TextEncoder().encode(cid))
         );

         const result = await new Promise<any>((resolve, reject) => {
           tx.signAndSend(pair, (res) => {
             if (res.dispatchError) {
               reject(new Error('Dispatch error'));
             }
             if (res.status.isFinalized) {
               resolve(res);
             }
           });
         });

         // Extrair storeId do evento
         const event = result.events.find(
           (r: any) => r.event.section === 'stores' && r.event.method === 'StoreCreated'
         );
         const storeId = event?.event.data[1]?.toString();

         if (!storeId) {
           throw new Error('StoreId não retornado');
         }

         // Atualizar Postgres
         await prisma.sellerProfile.update({
           where: { id: store.id },
           data: {
             onChainStoreId: BigInt(storeId),
             syncStatus: 'DRAFT',
           },
         });

         console.log(`  ✓ NFT criado: storeId=${storeId}`);
       } catch (error) {
         console.error(`  ✗ Erro ao migrar ${store.id}:`, error);
       }
     }

     console.log('Migração concluída');
     process.exit(0);
   }

   migrateStores().catch(console.error);
   ```

2. Adicionar script em `package.json`:
   ```json
   {
     "scripts": {
       "migrate:stores": "tsx src/scripts/migrateStores.ts"
     }
   }
   ```

3. Executar:
   ```bash
   MIGRATION_SURI="//Alice" npm run migrate:stores
   ```

**Critérios de Aceite:**
- Script migra lojas sem erro
- Todas as lojas têm `onChainStoreId`
- Verificar via Prisma Studio

**Arquivos a criar:**
- `/home/bazari/bazari/apps/api/src/scripts/migrateStores.ts`

**Arquivos a modificar:**
- `/home/bazari/bazari/apps/api/package.json`

---

### PROMPT 5.2: Script de Republicação

**Contexto:**
Lojas migradas precisam republicar com estrutura nova (3 JSONs).

**Tarefa:**
1. Criar `/home/bazari/bazari/apps/api/src/scripts/republishStores.ts`:
   ```typescript
   import { prisma } from '../lib/prisma.js';
   import { indexQueue } from '../lib/queue.js';

   async function republishStores() {
     const stores = await prisma.sellerProfile.findMany({
       where: {
         onChainStoreId: { not: null },
         syncStatus: 'DRAFT',
       },
       select: { id: true, shopSlug: true },
     });

     console.log(`Republicando ${stores.length} lojas...`);

     for (const store of stores) {
       console.log(`  Enfileirando ${store.shopSlug}...`);

       // Disparar job de publicação
       // TODO: chamar /stores/:id/publish via API interna ou duplicar lógica
       // MVP: disparar indexQueue diretamente (assumir JSONs já existem)

       await indexQueue.add('index-store', {
         storeId: store.id,
         version: 1,
       });
     }

     console.log('Republicação iniciada (jobs enfileirados)');
     process.exit(0);
   }

   republishStores().catch(console.error);
   ```

2. Executar:
   ```bash
   npm run republish:stores
   ```

**Critérios de Aceite:**
- Lojas republicadas
- OpenSearch indexado

**Arquivos a criar:**
- `/home/bazari/bazari/apps/api/src/scripts/republishStores.ts`

---

### PROMPT 5.3: Remover Código Legado

**Contexto:**
Limpar rotas/páginas antigas.

**Tarefa:**
1. Remover arquivos:
   - `/home/bazari/bazari/apps/web/src/pages/SellerPublicPage.tsx` (se existir)
   - `/home/bazari/bazari/apps/api/src/routes/sellers.ts` (mover lógica para `stores.ts`)

2. Remover redirects temporários de `App.tsx` (após período de transição)

3. Limpar imports não usados (ESLint)

**Critérios de Aceite:**
- Build sem warnings
- Sem código morto

**Arquivos a remover:**
- (conforme análise)

---

### PROMPT 5.4: Documentação Técnica

**Contexto:**
Documentar APIs e fluxos.

**Tarefa:**
1. Criar `/home/bazari/bazari/docs/api/STORES_API.md`:
   ```markdown
   # API de Lojas On-Chain

   ## Endpoints

   ### POST /stores/:id/publish

   Publica loja no IPFS e ancora CIDs/hashes no NFT.

   **Request:**
   ```json
   {
     "signerMnemonic": "..."
   }
   ```

   **Response:**
   ```json
   {
     "status": "SYNCED",
     "version": 2,
     "cids": {
       "store": "QmXxx",
       "categories": "QmYyy",
       "products": "QmZzz"
     }
   }
   ```

   ### GET /stores/:slug

   Retorna loja pública (IPFS + fallback Postgres).

   **Response:**
   ```json
   {
     "id": "123",
     "slug": "loja-x",
     "onChain": { ... },
     "sync": {
       "status": "SYNCED",
       "source": "ipfs"
     },
     "store": { ... },
     "categories": [...],
     "products": [...]
   }
   ```

   ### GET /marketplace/search

   Busca produtos via OpenSearch.

   **Query Params:**
   - `q`: texto livre
   - `storeId`: filtrar por loja
   - `category`: filtrar por categoria
   - `minPrice`, `maxPrice`: range de preço
   - `sort`: `createdDesc`, `priceAsc`, `priceDesc`
   - `limit`, `offset`: paginação

   **Response:**
   ```json
   {
     "items": [...],
     "total": 42,
     "page": { "limit": 24, "offset": 0 }
   }
   ```
   ```

2. Criar `/home/bazari/bazari/docs/FLOWS.md` com diagramas de fluxo (texto ou mermaid)

**Critérios de Aceite:**
- Documentação legível
- Exemplos de request/response

**Arquivos a criar:**
- `/home/bazari/bazari/docs/api/STORES_API.md`
- `/home/bazari/bazari/docs/FLOWS.md`

---

## ANEXOS

### A. Checklist Geral de Implementação

#### Fase 1: Fundação On-Chain
- [ ] PROMPT 1.1: Pallet `stores` atualizado
- [ ] PROMPT 1.2: Schema Prisma atualizado
- [ ] PROMPT 1.3: Módulo `publishPipeline.ts`
- [ ] PROMPT 1.4: Endpoint `/stores/:id/publish`
- [ ] PROMPT 1.5: Frontend delegando publicação
- [ ] PROMPT 1.6: Testes de integração

#### Fase 2: Cache & Fallback
- [ ] PROMPT 2.1: Tabela `StoreSnapshot`
- [ ] PROMPT 2.2: Salvar snapshot após publicação
- [ ] PROMPT 2.3: Fallback em `/stores/:slug`
- [ ] PROMPT 2.4: Componente `<SyncBadge>`
- [ ] PROMPT 2.5: Endpoint de verificação manual

#### Fase 3: Indexação & Busca
- [ ] PROMPT 3.1: Setup OpenSearch
- [ ] PROMPT 3.2: Setup BullMQ
- [ ] PROMPT 3.3: `indexerWorker`
- [ ] PROMPT 3.4: `verifierWorker`
- [ ] PROMPT 3.5: Endpoint `/marketplace/search`
- [ ] PROMPT 3.6: UI de busca avançada

#### Fase 4: Consolidação UI
- [ ] PROMPT 4.1: Rota única `/loja/:slug`
- [ ] PROMPT 4.2: Layouts múltiplos
- [ ] PROMPT 4.3: Remover flags de build
- [ ] PROMPT 4.4: Tratamento de erros on-chain
- [ ] PROMPT 4.5: Painel de diagnóstico

#### Fase 5: Migração & Cleanup
- [ ] PROMPT 5.1: Script de migração
- [ ] PROMPT 5.2: Script de republicação
- [ ] PROMPT 5.3: Remover código legado
- [ ] PROMPT 5.4: Documentação técnica

---

### B. Variáveis de Ambiente (Resumo)

**Backend (apps/api/.env):**
```env
# Existentes
DATABASE_URL=postgresql://...
BAZARICHAIN_WS=ws://127.0.0.1:9944

# Novos (Fase 1)
IPFS_API_URL=http://127.0.0.1:5001
IPFS_GATEWAY_URL=https://ipfs.io/ipfs/

# Novos (Fase 3)
REDIS_URL=redis://localhost:6379
OPENSEARCH_NODE=http://localhost:9200
OPENSEARCH_INDEX_STORES=bazari_stores

# Migração (Fase 5)
MIGRATION_SURI=//Alice
```

**Frontend (apps/web/.env):**
```env
# Remover após Fase 4
# VITE_FLAG_STORE_ONCHAIN_V1=true

# Manter
VITE_API_URL=http://localhost:3000
VITE_IPFS_GATEWAY_URL=https://ipfs.io/ipfs/
```

---

### C. Comandos Úteis

**Desenvolvimento:**
```bash
# Backend
cd apps/api
npm run dev          # API
npm run workers      # Workers (Fase 3)

# Frontend
cd apps/web
npm run dev

# Docker (Fase 3)
docker-compose up -d opensearch opensearch-dashboards
```

**Migração (Fase 5):**
```bash
cd apps/api
npm run migrate:stores      # Criar NFTs
npm run republish:stores    # Republicar lojas
```

**Testes:**
```bash
cd apps/api
npm test -- storePublish.test.ts

cd apps/web
npm run test
```

---

### D. Critérios de Aceite Globais

- [ ] Toda loja tem NFT (`onChainStoreId` não-nulo)
- [ ] Publicação gera 3 JSONs separados (store/categories/products)
- [ ] Hashes SHA-256 ancorados no NFT via `set_attribute`
- [ ] Fallback Postgres funciona se IPFS timeout
- [ ] Estados de sincronização visíveis (DRAFT/PUBLISHING/SYNCED/DIVERGED/FALLBACK)
- [ ] OpenSearch indexa produtos automaticamente
- [ ] Busca avançada funciona via `/marketplace/search`
- [ ] Rota única `/loja/:slug` sem duplicação
- [ ] Layouts múltiplos (`classic`, `branded-hero`) funcionais
- [ ] Flags de build removidas
- [ ] Testes com cobertura > 80%
- [ ] Documentação completa

---

## FIM DA ESPECIFICAÇÃO

**Próximos Passos:**
1. Revisar especificação com equipe
2. Priorizar fases (pode inverter ordem de Fase 2 e 3 se necessário)
3. Executar prompts sequencialmente
4. Validar cada entrega antes de avançar
5. Ajustar prazos conforme progresso real

**Contato:**
- Dúvidas técnicas: abrir issue no repo
- Ajustes na spec: solicitar revisão

---

**Assinatura Digital:**
Especificação gerada por Claude Code (Anthropic)
Hash SHA-256: `[a ser calculado após finalização]`
