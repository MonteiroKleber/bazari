# Plano de Implementação: Remoção do IPFS (Stores, Auth/Profiles, Affiliates)

**Data**: 2024-12-06
**Status**: Planejado
**Prioridade**: Alta
**Estimativa de Complexidade**: Média-Alta

---

## 1. Resumo Executivo

Este documento descreve o plano para remover completamente o IPFS dos seguintes módulos da Bazari:

### 🎯 Módulos a REMOVER IPFS nesta implementação:
1. **Stores** (Lojas/NFT Marketplace)
2. **Auth/Profiles** (Autenticação e Perfis de Usuário)
3. **Affiliates** (Marketplaces de Afiliados)

### ⏳ Módulos a analisar em varredura futura:
- **Chat/Media** - Avaliar migração para Object Storage (S3/R2)
- **GPS/Delivery** - Completar implementação ou remover
- **Disputes** - Único uso legítimo de IPFS (manter)

### Justificativa da Remoção:

| Módulo | Problema | Impacto da Remoção |
|--------|----------|-------------------|
| **Stores** | Duplicação total (PostgreSQL + IPFS + Snapshot), ninguém lê do IPFS | -30s latência no publish |
| **Auth/Profiles** | Dados mutáveis em storage imutável, CID salvo mas nunca lido | -2-30s latência no login |
| **Affiliates** | Dados públicos criptografados sem necessidade, duplicação total | -5s latência na criação |

### Problemas comuns identificados:
1. **Duplicação desnecessária**: Os mesmos dados existem em 3-4 lugares (PostgreSQL, IPFS, Snapshot, Blockchain)
2. **IPFS não está sendo usado corretamente**: Frontend não busca diretamente do IPFS, apenas passa pelo backend
3. **Complexidade sem benefício**: Adiciona latência (30s+ timeout) e pontos de falha sem benefício real de descentralização
4. **Hashes não são verificados**: O sistema calcula hashes mas nunca os verifica na leitura
5. **"Teatro de descentralização"**: IPFS usado como buzzword sem benefício real

---

## 2. Arquivos Afetados

### 2.1 Frontend (`apps/web/src/`)

| Arquivo | Tipo de Mudança | Descrição |
|---------|-----------------|-----------|
| `modules/store/onchain.ts` | **MODIFICAR** | Remover funções IPFS, simplificar tipos |
| `pages/StorePublicPage.tsx` | **MODIFICAR** | Remover referências a CID/IPFS gateway |
| `modules/seller/api.ts` | **MODIFICAR** | Remover campos CID do DTO, simplificar publishStore |
| `components/SyncBadge.tsx` | **MODIFICAR** | Remover source 'ipfs', simplificar estados |
| `i18n/pt.json` | **MODIFICAR** | Remover strings relacionadas a IPFS |
| `i18n/en.json` | **MODIFICAR** | Remover strings relacionadas a IPFS |
| `i18n/es.json` | **MODIFICAR** | Remover strings relacionadas a IPFS |

### 2.2 Backend (`apps/api/src/`)

| Arquivo | Tipo de Mudança | Descrição |
|---------|-----------------|-----------|
| `lib/publishPipeline.ts` | **REMOVER ou SIMPLIFICAR** | Remover upload IPFS, manter apenas build de JSON para histórico |
| `lib/ipfs.ts` | **MANTER PARCIAL** | Manter para upload de imagens/chat, remover funções de store |
| `routes/storePublish.ts` | **REFATORAR** | Remover upload IPFS, simplificar para apenas incrementar versão |
| `routes/stores.ts` | **REFATORAR** | Remover fetch IPFS, buscar direto do PostgreSQL |
| `routes/sellers.ts` | **MODIFICAR** | Remover referências a CIDs |
| `routes/me.sellers.ts` | **MODIFICAR** | Remover referências a CIDs |
| `lib/storesChain.ts` | **SIMPLIFICAR** | Remover resolveStoreCidWithSource |
| `workers/indexerWorker.ts` | **MODIFICAR** | Remover referências a IPFS |
| `workers/verifierWorker.ts` | **MODIFICAR** | Remover verificação de hashes IPFS |
| `scripts/republishStores.ts` | **REMOVER** | Não mais necessário |
| `routes/__tests__/storePublish.test.ts` | **MODIFICAR** | Atualizar testes |

### 2.3 Schema Prisma (`apps/api/prisma/schema.prisma`)

| Model/Campo | Tipo de Mudança | Descrição |
|-------------|-----------------|-----------|
| `SellerProfile.metadataCid` | **REMOVER** | Campo não mais usado |
| `SellerProfile.categoriesCid` | **REMOVER** | Campo não mais usado |
| `SellerProfile.categoriesHash` | **REMOVER** | Campo não mais usado |
| `SellerProfile.productsCid` | **REMOVER** | Campo não mais usado |
| `SellerProfile.productsHash` | **REMOVER** | Campo não mais usado |
| `StoreSnapshot` (model inteiro) | **REMOVER** | Duplicação desnecessária |
| `StorePublishHistory` | **SIMPLIFICAR** | Manter apenas version, blockNumber, publishedAt |

### 2.4 Blockchain (`bazari-chain/pallets/stores/`)

| Arquivo | Tipo de Mudança | Descrição |
|---------|-----------------|-----------|
| `src/lib.rs` | **MODIFICAR** | Simplificar `publish_store` para apenas incrementar versão |

---

## 3. Plano de Execução Detalhado

### Fase 1: Preparação (Não-breaking)

#### 1.1 Criar migration Prisma
```sql
-- Migration: remove_ipfs_fields_stores
ALTER TABLE "SellerProfile" DROP COLUMN IF EXISTS "metadataCid";
ALTER TABLE "SellerProfile" DROP COLUMN IF EXISTS "categoriesCid";
ALTER TABLE "SellerProfile" DROP COLUMN IF EXISTS "categoriesHash";
ALTER TABLE "SellerProfile" DROP COLUMN IF EXISTS "productsCid";
ALTER TABLE "SellerProfile" DROP COLUMN IF EXISTS "productsHash";

DROP TABLE IF EXISTS "StoreSnapshot";

-- Simplificar StorePublishHistory (remover campos IPFS)
ALTER TABLE "StorePublishHistory" DROP COLUMN IF EXISTS "metadataCid";
ALTER TABLE "StorePublishHistory" DROP COLUMN IF EXISTS "categoriesCid";
ALTER TABLE "StorePublishHistory" DROP COLUMN IF EXISTS "categoriesHash";
ALTER TABLE "StorePublishHistory" DROP COLUMN IF EXISTS "productsCid";
ALTER TABLE "StorePublishHistory" DROP COLUMN IF EXISTS "productsHash";
```

#### 1.2 Atualizar schema.prisma
```prisma
model SellerProfile {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])
  shopName          String
  shopSlug          String   @unique
  about             String?  @db.Text
  ratingAvg         Float    @default(0)
  ratingCount       Int      @default(0)
  policies          Json?
  avatarUrl         String?
  bannerUrl         String?
  isDefault         Boolean  @default(false)
  onChainStoreId    BigInt?  @db.BigInt
  ownerAddress      String?
  operatorAddresses String[] @default([])
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // === Campos de Sincronização On-Chain (SIMPLIFICADOS) ===
  syncStatus      String?   @default("pending") // 'pending' | 'syncing' | 'synced' | 'error'
  version         Int?      @default(0)
  lastSyncBlock   BigInt?   @db.BigInt
  lastPublishedAt DateTime?

  // === REMOVIDOS ===
  // metadataCid     String?  -- REMOVIDO
  // categoriesCid   String?  -- REMOVIDO
  // categoriesHash  String?  -- REMOVIDO
  // productsCid     String?  -- REMOVIDO
  // productsHash    String?  -- REMOVIDO

  pickupAddress Json?
  products       Product[]
  services       ServiceOffering[]
  publishHistory StorePublishHistory[]
  land           Land?

  @@index([userId])
  @@index([onChainStoreId])
  @@index([ownerAddress])
  @@index([operatorAddresses], type: Gin)
  @@index([syncStatus])
}

model StorePublishHistory {
  id              String        @id @default(cuid())
  sellerProfileId String
  sellerProfile   SellerProfile @relation(fields: [sellerProfileId], references: [id], onDelete: Cascade)
  version         Int
  blockNumber     BigInt        @db.BigInt
  extrinsicHash   String?
  publishedAt     DateTime      @default(now())

  // === REMOVIDOS ===
  // metadataCid     String  -- REMOVIDO
  // categoriesCid   String  -- REMOVIDO
  // categoriesHash  String  -- REMOVIDO
  // productsCid     String  -- REMOVIDO
  // productsHash    String  -- REMOVIDO

  @@index([sellerProfileId, version])
  @@index([blockNumber])
  @@index([publishedAt])
}

// === MODEL REMOVIDO ===
// model StoreSnapshot { ... }  -- REMOVIDO COMPLETAMENTE
```

### Fase 2: Backend Refactoring

#### 2.1 Simplificar `routes/stores.ts`

**ANTES:**
```typescript
// GET /stores/by-slug/:slug
// 1. Resolver slug
// 2. Buscar on-chain
// 3. Tentar fetch IPFS + validação
// 4. Fallback para StoreSnapshot
// 5. Retornar com sync status
```

**DEPOIS:**
```typescript
// GET /stores/by-slug/:slug
app.get<{ Params: { slug: string } }>('/stores/by-slug/:slug', async (request, reply) => {
  const slug = request.params.slug;

  // 1. Buscar do PostgreSQL (source of truth para catálogo)
  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { shopSlug: slug },
    include: {
      products: {
        where: { status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' },
        include: { category: true },
      },
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

  // 3. Montar resposta (sem IPFS)
  return reply.send({
    id: sellerProfile.onChainStoreId.toString(),
    slug: sellerProfile.shopSlug,
    onChain: {
      instanceId: sellerProfile.onChainStoreId.toString(),
      owner: onChainStore.owner,
      operators: onChainStore.operators,
      reputation: onChainStore.reputation,
    },
    store: {
      name: sellerProfile.shopName,
      description: sellerProfile.about,
      theme: sellerProfile.policies?.theme,
      policies: {
        returns: sellerProfile.policies?.returns,
        shipping: sellerProfile.policies?.shipping,
      },
    },
    categories: extractCategoriesFromProducts(sellerProfile.products),
    products: sellerProfile.products.map(formatProduct),
    sync: {
      status: sellerProfile.syncStatus,
      version: sellerProfile.version,
    },
  });
});
```

#### 2.2 Simplificar `routes/storePublish.ts`

**ANTES:**
```typescript
// POST /stores/:id/publish
// 1. Validar ownership
// 2. Setar status SYNCING
// 3. Gerar JSONs
// 4. Upload IPFS (3 arquivos)
// 5. Calcular hashes
// 6. Chamar extrinsic publish_store com CIDs e hashes
// 7. Extrair storeId
// 8. Atualizar Postgres (CIDs, hashes)
// 9. Salvar histórico (com CIDs)
// 10. Salvar snapshot
// 11. Disparar indexação
```

**DEPOIS:**
```typescript
// POST /stores/:id/publish
app.post<{ Params: { id: string } }>(
  '/stores/:id/publish',
  { preHandler: authOnRequest },
  async (request, reply) => {
    const authUser = (request as any).authUser;
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

    const isCreating = !store.onChainStoreId;

    // 2. Setar status SYNCING
    await prisma.sellerProfile.update({
      where: { id: store.id },
      data: { syncStatus: 'syncing' },
    });

    try {
      // 3. Conectar blockchain
      const api = await getStoresApi();
      await cryptoWaitReady();

      const body = publishSchema.parse(request.body);
      const keyring = new Keyring({ type: 'sr25519' });
      const pair = keyring.addFromMnemonic(body.signerMnemonic);

      let tx;
      let createdStoreId: bigint | null = null;

      if (isCreating) {
        // Criar novo NFT
        const slug = store.shopSlug || store.id;
        tx = api.tx.stores.createStore(
          Array.from(new TextEncoder().encode(slug))
        );
      } else {
        // Apenas incrementar versão on-chain
        tx = api.tx.stores.incrementVersion(store.onChainStoreId!.toString());
      }

      // 4. Executar transação
      const result = await executeTransaction(tx, pair);

      // 5. Extrair dados do resultado
      if (isCreating) {
        const createdEvent = result.events.find(
          (r: any) => r.event.section === 'stores' && r.event.method === 'StoreCreated'
        );
        createdStoreId = BigInt(createdEvent?.event.data[1]?.toString() || '0');
      }

      const blockNumber = await extractBlockNumber(api, result);
      const newVersion = isCreating ? 1 : (store.version || 0) + 1;

      // 6. Atualizar PostgreSQL
      await prisma.sellerProfile.update({
        where: { id: store.id },
        data: {
          syncStatus: 'synced',
          version: newVersion,
          lastSyncBlock: blockNumber,
          lastPublishedAt: new Date(),
          ...(createdStoreId && { onChainStoreId: createdStoreId }),
          ownerAddress: pair.address,
        },
      });

      // 7. Salvar histórico (simplificado)
      await prisma.storePublishHistory.create({
        data: {
          sellerProfileId: store.id,
          version: newVersion,
          blockNumber,
          extrinsicHash: result.txHash?.toString() || null,
        },
      });

      // 8. Disparar indexação
      await indexQueue.add('index-store', { storeId: store.id, version: newVersion });

      return reply.send({
        status: 'synced',
        version: newVersion,
        blockNumber: blockNumber.toString(),
        ...(createdStoreId && { storeId: createdStoreId.toString() }),
      });

    } catch (error) {
      await prisma.sellerProfile.update({
        where: { id: store.id },
        data: { syncStatus: 'error' },
      });
      throw error;
    }
  }
);
```

#### 2.3 Remover/Simplificar `lib/publishPipeline.ts`

**Remover:**
- `uploadJsonToIpfs()`
- `publishStoreToIpfs()`
- `calculateJsonHash()` (ou manter se útil para outro propósito)

**Manter (opcional, para histórico):**
- `buildStoreJson()` - pode ser útil para exportar dados
- `buildCategoriesJson()` - pode ser útil para exportar dados
- `buildProductsJson()` - pode ser útil para exportar dados

#### 2.4 Simplificar `lib/storesChain.ts`

**Remover:**
- `resolveStoreCidWithSource()`
- Qualquer referência a MetadataCid

**Manter:**
- `getStore()` - busca owner, operators, reputation
- `listStoresOwned()`
- `listStoresOperated()`

### Fase 3: Blockchain Refactoring

#### 3.1 Simplificar `pallet-stores`

**Opção A: Manter publish_store apenas para versionamento**
```rust
/// Incrementa versão da loja on-chain
#[pallet::call_index(7)]
#[pallet::weight(10_000)]
pub fn increment_version(
    origin: OriginFor<T>,
    store_id: T::StoreId,
) -> DispatchResult {
    let who = ensure_signed(origin)?;
    Self::ensure_can_manage(&store_id, &who)?;

    let current_version = StoreVersion::<T>::get(&store_id);
    let new_version = current_version.saturating_add(1);
    StoreVersion::<T>::insert(&store_id, new_version);

    let block_number = frame_system::Pallet::<T>::block_number();
    Self::deposit_event(Event::StoreVersionIncremented {
        store_id,
        version: new_version,
        block_number,
    });

    Ok(())
}
```

**Opção B: Remover publish_store completamente**
- Se não precisar de versionamento on-chain, pode remover
- Ownership e reputation são suficientes

**Storages a remover/deprecar:**
- `MetadataCid` - não mais usado
- Atributos NFT: `store_cid`, `store_hash`, `categories_cid`, `categories_hash`, `products_cid`, `products_hash`

### Fase 4: Frontend Refactoring

#### 4.1 Simplificar `modules/store/onchain.ts`

**Remover:**
- `gatewayFromEnv`, `ipfsApiEndpoint`, `ipfsAuthorizationHeader`
- `resolveIpfsUrl()`
- `uploadMetadataToIpfs()`
- `resolveCoverUrl()` (parte que resolve ipfs://)

**Simplificar tipos:**
```typescript
export interface OnChainStoreResponse {
  storeId: string;
  owner: string;
  operators: string[];
  reputation: OnChainReputation;
  // REMOVIDO: cid, metadata, source
}

export interface NormalizedOnChainStore {
  payload: {
    storeId: string;
    owner: string;
    operators: string[];
    reputation: OnChainReputation | null;
    sync: { status: string; version: number };
  };
  metadata: {
    name: string;
    description?: string;
    coverUrl?: string;
    categories: string[][];
    links: NormalizedLink[];
    theme?: StoreTheme;
  };
}
```

#### 4.2 Simplificar `pages/StorePublicPage.tsx`

**Remover:**
- `resolveGatewayLink()` função
- Seção que mostra CID e link para gateway IPFS
- Referências a `cid`, `cidGatewayLink`

**Simplificar:**
```tsx
// ANTES
{cid && (
  <div className="flex min-w-0 flex-col gap-2 text-xs text-store-ink/70">
    <span>CID dos metadados</span>
    <code>{cid}</code>
    {cidGatewayLink && (
      <a href={cidGatewayLink}>Abrir no gateway IPFS</a>
    )}
  </div>
)}

// DEPOIS
// Remover esta seção completamente
```

#### 4.3 Simplificar `modules/seller/api.ts`

**Atualizar SellerProfileDto:**
```typescript
export interface SellerProfileDto {
  id?: string;
  shopName: string;
  shopSlug: string;
  about?: string | null;
  policies?: Record<string, any> | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  ratingAvg: number;
  ratingCount: number;
  onChainStoreId?: string | number | null;
  ownerAddress?: string | null;
  operatorAddresses?: string[] | null;
  syncStatus?: string | null;
  version?: number | null;
  lastSyncBlock?: string | number | null;
  lastPublishedAt?: string | null;
  // REMOVIDOS:
  // metadataCid?: string | null;
  // categoriesCid?: string | null;
  // categoriesHash?: string | null;
  // productsCid?: string | null;
  // productsHash?: string | null;
  onChainReputation?: OnChainReputation | null;
}
```

**Atualizar publishStore:**
```typescript
publishStore: async (storeId: string, payload: { signerMnemonic: string }) => {
  return postJSON<{
    status: string;
    version: number;
    blockNumber: string;
    storeId?: string; // apenas se for criação
    // REMOVIDO: cids: { store, categories, products }
  }>(
    `/stores/${encodeURIComponent(storeId)}/publish`,
    payload,
    undefined,
    { timeout: 90000 }
  );
},
```

#### 4.4 Simplificar `components/SyncBadge.tsx`

```tsx
type SyncStatus = 'DRAFT' | 'PUBLISHING' | 'SYNCED' | 'ERROR';
// REMOVIDOS: 'DIVERGED' | 'FALLBACK'

interface SyncBadgeProps {
  status: SyncStatus;
  // REMOVIDO: source?: 'ipfs' | 'postgres';
  className?: string;
}

const configs: Record<SyncStatus, Config> = {
  DRAFT: { icon: FileEdit, label: 'Rascunho', variant: 'secondary' },
  PUBLISHING: { icon: RefreshCw, label: 'Publicando...', variant: 'default', className: 'animate-pulse' },
  SYNCED: { icon: CheckCircle2, label: 'Sincronizado', variant: 'default', className: 'bg-green-500' },
  ERROR: { icon: AlertTriangle, label: 'Erro', variant: 'destructive' },
  // REMOVIDOS: DIVERGED, FALLBACK
};
```

#### 4.5 Atualizar i18n

**Remover chaves:**
```json
// pt.json, en.json, es.json
{
  "store.onchain.metadataCid": "...",     // REMOVER
  "store.onchain.openInGateway": "...",   // REMOVER
  "store.ipfs.uploading": "...",          // REMOVER
  "store.ipfs.failed": "...",             // REMOVER
  "sync.fallback": "...",                 // REMOVER
  "sync.diverged": "...",                 // REMOVER
  "sync.ipfs": "..."                      // REMOVER
}
```

### Fase 5: Limpeza

#### 5.1 Remover arquivos não mais necessários

```bash
# Backend
rm apps/api/src/scripts/republishStores.ts
rm apps/api/src/workers/verifierWorker.ts  # se só verificava IPFS

# Testes desatualizados
# Atualizar: apps/api/src/routes/__tests__/storePublish.test.ts
```

#### 5.2 Atualizar variáveis de ambiente

**Remover de `.env` e documentação:**
```
# REMOVER (relacionados a IPFS para stores)
VITE_IPFS_GATEWAY_URL=
VITE_IPFS_API_URL=
VITE_IPFS_API_AUTH_HEADER=
```

**Manter (se usados para outros módulos):**
```
# MANTER se usado para chat/media
IPFS_API_URLS=
IPFS_GATEWAY_URL=
IPFS_TIMEOUT_MS=
```

---

## 4. Ordem de Execução

### Passo 1: Backend First (não quebra frontend)
1. Criar rota alternativa `/stores/by-slug-v2/:slug` que não usa IPFS
2. Testar nova rota
3. Atualizar frontend para usar nova rota
4. Deprecar rota antiga

### Passo 2: Database Migration
1. Criar migration Prisma
2. Aplicar em staging
3. Verificar integridade
4. Aplicar em produção

### Passo 3: Frontend Cleanup
1. Remover referências IPFS
2. Simplificar tipos
3. Atualizar componentes
4. Remover i18n não usado

### Passo 4: Blockchain Update (opcional)
1. Simplificar pallet-stores
2. Deploy nova versão da chain
3. Atualizar chamadas do backend

### Passo 5: Final Cleanup
1. Remover arquivos não usados
2. Atualizar documentação
3. Remover variáveis de ambiente

---

## 5. Rollback Plan

Se algo der errado:

1. **Database**: Migrations são reversíveis
2. **Backend**: Manter rotas antigas por 2 semanas
3. **Frontend**: Feature flag para alternar entre versões

---

## 6. Testes Necessários

### 6.1 Testes Unitários
- [ ] `stores.ts` - GET /stores/by-slug/:slug
- [ ] `storePublish.ts` - POST /stores/:id/publish
- [ ] `storesChain.ts` - getStore(), listStoresOwned()

### 6.2 Testes de Integração
- [ ] Criar loja → Publicar → Verificar on-chain
- [ ] Editar produto → Publicar → Verificar no frontend
- [ ] Página pública da loja carrega corretamente

### 6.3 Testes E2E
- [ ] Fluxo completo de vendedor
- [ ] Visualização de loja por comprador

---

## 7. Métricas de Sucesso

| Métrica | Antes | Depois (Esperado) |
|---------|-------|-------------------|
| Tempo de publish | 30-60s | 5-10s |
| Latência GET /stores/by-slug | 2-5s | <500ms |
| Pontos de falha | 4 (DB, IPFS, Chain, Cache) | 2 (DB, Chain) |
| Linhas de código | ~1500 | ~800 |
| Complexidade | Alta | Média |

---

## 8. Checklist Final

- [ ] Migration Prisma aplicada
- [ ] Backend refatorado e testado
- [ ] Frontend refatorado e testado
- [ ] Blockchain atualizado (se necessário)
- [ ] Documentação atualizada
- [ ] Variáveis de ambiente limpas
- [ ] Testes passando
- [ ] Deploy em produção
- [ ] Monitoramento ativo

---

## 9. ANÁLISE DE IMPACTO - Outros Módulos que Usam IPFS

### ⚠️ ATENÇÃO: O `lib/ipfs.ts` é usado por OUTROS MÓDULOS além de Stores!

A remoção do IPFS do módulo de lojas **NÃO PODE** remover completamente o `lib/ipfs.ts` porque ele é dependência de outros módulos críticos.

---

### 9.1 Módulos que DEPENDEM de IPFS (NÃO REMOVER)

#### 🔴 **Chat/Media Upload** (CRÍTICO)
| Arquivo | Função | Dependência |
|---------|--------|-------------|
| `chat/services/ipfs.ts` | Upload/download mídia criptografada | `uploadToIpfs`, `downloadFromIpfs` |
| `chat/routes/chat.upload.ts` | Endpoint `/chat/upload` | `ipfsService` |
| `web/components/chat/ChatMediaPreview.tsx` | Visualizar mídia do chat | `VITE_IPFS_GATEWAY_URL` |

**Impacto se remover**: ❌ **QUEBRA TOTAL do chat com mídia**

---

#### 🔴 **Profiles/Auth** (CRÍTICO)
| Arquivo | Função | Dependência |
|---------|--------|-------------|
| `routes/auth.ts` | Criar profile com metadados IPFS | `createInitialMetadata`, `publishProfileMetadata` |
| `services/social-auth.service.ts` | Auth social com profile IPFS | `createInitialMetadata`, `publishProfileMetadata` |

**Impacto se remover**: ❌ **QUEBRA criação de novos usuários**

---

#### 🟠 **Affiliates/Marketplaces** (IMPORTANTE)
| Arquivo | Função | Dependência |
|---------|--------|-------------|
| `routes/affiliates.ts` | Criar marketplace com metadata IPFS | `ipfsService.uploadEncrypted` |

**Impacto se remover**: ❌ **QUEBRA criação de marketplaces de afiliados**

---

#### 🟠 **GPS Tracking/Delivery** (IMPORTANTE)
| Arquivo | Função | Dependência |
|---------|--------|-------------|
| `services/gps-tracking.service.ts` | Upload de provas de entrega | `ipfs-http-client` (direto) |

**Impacto se remover**: ❌ **QUEBRA provas de entrega**

---

#### 🟡 **Disputes/Evidence** (FUNCIONAL)
| Arquivo | Função | Dependência |
|---------|--------|-------------|
| `web/components/blockchain/DisputePanel.tsx` | Input de CID de evidência | Usa gateway IPFS público |
| `web/modules/disputes/components/EvidenceViewer.tsx` | Visualizar evidências | Usa gateways IPFS públicos |

**Impacto se remover**: ⚠️ **Funciona parcialmente** (usa gateways públicos)

---

#### 🟡 **Health Check**
| Arquivo | Função | Dependência |
|---------|--------|-------------|
| `routes/health.ts` | Status dos nodes IPFS | `getIpfsHealth`, `getIpfsInfo` |

**Impacto se remover**: ⚠️ **Perde monitoramento IPFS** (não crítico)

---

### 9.2 Funções do `lib/ipfs.ts` - O que MANTER vs REMOVER

| Função | Usado por Stores? | Usado por Outros? | Ação |
|--------|:-----------------:|:-----------------:|------|
| `fetchIpfsJson()` | ✅ SIM | ❌ NÃO | **PODE REMOVER** (após refatorar stores) |
| `uploadToIpfs()` | ✅ SIM | ✅ Chat, Affiliates | **MANTER** |
| `downloadFromIpfs()` | ❌ NÃO | ✅ Chat | **MANTER** |
| `publishProfileMetadata()` | ❌ NÃO | ✅ Auth | **MANTER** |
| `createInitialMetadata()` | ❌ NÃO | ✅ Auth | **MANTER** |
| `fetchProfileMetadata()` | ❌ NÃO | ⚠️ Talvez | **MANTER** |
| `getIpfsHealth()` | ❌ NÃO | ✅ Health | **MANTER** (opcional) |
| `getIpfsInfo()` | ❌ NÃO | ✅ Health | **MANTER** (opcional) |
| `IpfsClientPool` (classe) | ✅ SIM | ✅ Todos | **MANTER** |

---

### 9.3 Frontend - Funções IPFS compartilhadas

| Função/Variável | Arquivo | Usado por Stores? | Usado por Outros? | Ação |
|-----------------|---------|:-----------------:|:-----------------:|------|
| `resolveIpfsUrl()` | `modules/store/onchain.ts` | ✅ SIM | ✅ ReceiptViewer, SellerSetup | **MOVER para utils** |
| `VITE_IPFS_GATEWAY_URL` | env | ✅ SIM | ✅ ChatMediaPreview | **MANTER** |
| `uploadMetadataToIpfs()` | `modules/store/onchain.ts` | ✅ SIM | ❌ NÃO | **PODE REMOVER** |

---

### 9.4 Variáveis de Ambiente - O que MANTER

```bash
# ✅ MANTER (usado por chat, auth, affiliates)
IPFS_API_URLS=http://127.0.0.1:5001
IPFS_GATEWAY_URL=https://ipfs.io/ipfs/
IPFS_TIMEOUT_MS=30000
IPFS_RETRY_ATTEMPTS=3

# ✅ MANTER (usado por frontend chat)
VITE_IPFS_GATEWAY_URL=https://ipfs.io/ipfs/

# ⚠️ PODE REMOVER (só usado por stores)
VITE_IPFS_API_URL=           # Frontend não faz mais upload direto
VITE_IPFS_API_AUTH_HEADER=   # Frontend não faz mais upload direto
```

---

### 9.5 PLANO REVISADO - O que fazer

#### ✅ REMOVER (específico de Stores)
1. `lib/publishPipeline.ts` → **REMOVER** `uploadJsonToIpfs()`, `publishStoreToIpfs()`
2. `routes/stores.ts` → **REMOVER** `fetchIpfsJson` imports, lógica de fetch IPFS
3. `routes/storePublish.ts` → **REMOVER** upload IPFS, snapshot
4. `workers/verifierWorker.ts` → **REMOVER** (só verificava stores)
5. `scripts/republishStores.ts` → **REMOVER**
6. Schema Prisma → **REMOVER** campos CID de SellerProfile, StoreSnapshot

#### ⚠️ MODIFICAR (mover para local compartilhado)
1. `resolveIpfsUrl()` → **MOVER** de `modules/store/onchain.ts` para `lib/ipfs-utils.ts`
2. `modules/store/onchain.ts` → **REMOVER** apenas funções de upload/gateway config de stores

#### ❌ NÃO TOCAR (usado por outros módulos)
1. `lib/ipfs.ts` → **MANTER** (uploadToIpfs, downloadFromIpfs, etc)
2. `chat/services/ipfs.ts` → **MANTER**
3. `chat/routes/chat.upload.ts` → **MANTER**
4. `routes/auth.ts` → **MANTER** imports de `lib/ipfs.ts`
5. `routes/affiliates.ts` → **MANTER** uso de ipfsService
6. `services/gps-tracking.service.ts` → **MANTER**
7. `routes/health.ts` → **MANTER**
8. Variáveis `IPFS_*` no backend → **MANTER**
9. `VITE_IPFS_GATEWAY_URL` → **MANTER**

---

### 9.6 Diagrama de Dependências IPFS

```
                    ┌─────────────────────────────────────────┐
                    │           lib/ipfs.ts                   │
                    │  (IpfsClientPool, upload, download)     │
                    └─────────────────┬───────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
┌─────────────────┐       ┌─────────────────────┐      ┌─────────────────┐
│  STORES MODULE  │       │    CHAT MODULE      │      │   AUTH MODULE   │
│   (REMOVER)     │       │    (MANTER)         │      │   (MANTER)      │
├─────────────────┤       ├─────────────────────┤      ├─────────────────┤
│ publishPipeline │       │ chat/services/ipfs  │      │ routes/auth.ts  │
│ routes/stores   │       │ chat/routes/upload  │      │ social-auth     │
│ storePublish    │       │ ChatMediaPreview    │      │                 │
│ verifierWorker  │       └─────────────────────┘      └─────────────────┘
└─────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
┌─────────────────┐       ┌─────────────────────┐      ┌─────────────────┐
│AFFILIATES MODULE│       │   GPS/DELIVERY      │      │ DISPUTES MODULE │
│   (MANTER)      │       │    (MANTER)         │      │   (MANTER)      │
├─────────────────┤       ├─────────────────────┤      ├─────────────────┤
│routes/affiliates│       │gps-tracking.service │      │ DisputePanel    │
│                 │       │                     │      │ EvidenceViewer  │
└─────────────────┘       └─────────────────────┘      └─────────────────┘
```

---

### 9.7 Resumo do Impacto (ATUALIZADO)

| Módulo | Ação | Justificativa |
|--------|:----:|---------------|
| **Stores** | ✅ **REMOVER** | Duplicação total, ninguém lê do IPFS |
| **Auth/Profiles** | ✅ **REMOVER** | Dados mutáveis em storage imutável, latência desnecessária |
| **Affiliates** | ✅ **REMOVER** | Dados públicos criptografados, duplicação total |
| **Chat** | ⏳ Manter (por enquanto) | Avaliar migração para S3/R2 em varredura futura |
| **GPS/Delivery** | ⏳ Manter (por enquanto) | Avaliar em varredura futura |
| **Disputes** | ✅ **MANTER** | Único uso legítimo (evidência imutável) |
| **Health** | ⚠️ Opcional | Manter apenas se Chat/Disputes usarem IPFS |

---

### 9.8 Conclusão (REVISADA)

**A remoção do IPFS é SEGURA para os módulos: STORES, AUTH/PROFILES e AFFILIATES**

Módulos que MANTERÃO IPFS (por enquanto):
- **Chat/Media** - Avaliar migração para S3/R2 em varredura futura
- **GPS/Delivery** - Avaliar em varredura futura
- **Disputes** - Único uso legítimo de IPFS (evidência imutável)

---

## 10. REMOÇÃO DE IPFS - AUTH/PROFILES

### 10.1 Análise do Problema

**O que acontece hoje no login/cadastro:**
```typescript
// routes/auth.ts:211-227
// 1. Criar Profile temporário
profile = await prisma.profile.create({ ... });

// 2. Gerar metadados IPFS (DESNECESSÁRIO!)
const metadata = createInitialMetadata(profile);
const cid = await publishProfileMetadata(metadata);  // ← ADICIONA 2-30s LATÊNCIA!

// 3. Mintar NFT on-chain passando o CID
const profileId = await mintProfileOnChain(user.address, finalHandle, cid);

// 4. Salvar CID no banco (DUPLICAÇÃO!)
profile = await prisma.profile.update({
  data: {
    onChainProfileId: profileId,
    metadataCid: cid,  // ← SALVO MAS NUNCA LIDO!
  },
});
```

**O que é salvo no IPFS:**
```json
{
  "schema_version": "1.0",
  "profile": {
    "display_name": "usuario",
    "bio": null,
    "avatar_cid": null,
    "banner_cid": null,
    "joined_at": "2024-12-06T..."
  },
  "reputation": { "score": 0, "tier": "bronze", "since": "..." },
  "badges": [],
  "penalties": [],
  "links": {}
}
```

**Problemas:**
1. ❌ **Dados mutáveis em storage imutável** - Bio, avatar, badges mudam, mas CID é imutável
2. ❌ **Duplicação total** - Tudo já está no PostgreSQL (Profile table)
3. ❌ **Ninguém lê do IPFS** - Frontend busca do PostgreSQL/blockchain
4. ❌ **Latência no login** - Adiciona 2-30s no primeiro acesso
5. ❌ **CID passado para blockchain mas não usado** - Blockchain só armazena, não valida

### 10.2 Arquivos Afetados - Auth/Profiles

| Arquivo | Tipo | Mudança |
|---------|------|---------|
| `routes/auth.ts` | Backend | Remover upload IPFS no login |
| `services/social-auth.service.ts` | Backend | Remover upload IPFS |
| `lib/ipfs.ts` | Backend | Remover `createInitialMetadata`, `publishProfileMetadata` |
| `lib/profilesChain.ts` | Backend | Simplificar `mintProfileOnChain` (remover CID param) |
| `schema.prisma` | DB | Remover `Profile.metadataCid` |
| `pallet-profiles` | Blockchain | Remover storage de CID (opcional) |

### 10.3 Plano de Execução - Auth/Profiles

#### Passo 1: Simplificar `routes/auth.ts`

**ANTES:**
```typescript
// 2. Gerar metadados IPFS
const metadata = createInitialMetadata(profile);
const cid = await publishProfileMetadata(metadata);

// 3. MINTAR NFT ON-CHAIN
const profileId = await mintProfileOnChain(user.address, finalHandle, cid);

// 4. Atualizar Profile
profile = await prisma.profile.update({
  data: {
    onChainProfileId: profileId,
    metadataCid: cid,
    lastChainSync: new Date(),
  },
});
```

**DEPOIS:**
```typescript
// 2. MINTAR NFT ON-CHAIN (sem CID)
const profileId = await mintProfileOnChain(user.address, finalHandle);

// 3. Atualizar Profile
profile = await prisma.profile.update({
  data: {
    onChainProfileId: profileId,
    lastChainSync: new Date(),
    // metadataCid: REMOVIDO
  },
});
```

#### Passo 2: Simplificar `lib/profilesChain.ts`

**ANTES:**
```typescript
export async function mintProfileOnChain(
  address: string,
  handle: string,
  cid: string  // ← REMOVER
): Promise<bigint> {
  // ...
  const tx = api.tx.profiles.createProfile(handleBytes, cidBytes);
  // ...
}
```

**DEPOIS:**
```typescript
export async function mintProfileOnChain(
  address: string,
  handle: string
): Promise<bigint> {
  // ...
  const tx = api.tx.profiles.createProfile(handleBytes);
  // ou: const tx = api.tx.profiles.createProfileWithoutCid(handleBytes);
  // ...
}
```

#### Passo 3: Migration Prisma - Profile

```sql
-- Migration: remove_ipfs_profile
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "metadataCid";
```

#### Passo 4: Remover funções do `lib/ipfs.ts`

```typescript
// REMOVER estas funções:
// - createInitialMetadata()
// - publishProfileMetadata()
// - fetchProfileMetadata() (se não usado em outro lugar)
```

### 10.4 Impacto - Auth/Profiles

| Métrica | Antes | Depois |
|---------|-------|--------|
| Latência primeiro login | 8-36s | 6-12s |
| Pontos de falha | 3 (DB, IPFS, Chain) | 2 (DB, Chain) |
| Dados duplicados | 2x (PostgreSQL + IPFS) | 1x (PostgreSQL) |

---

## 11. REMOÇÃO DE IPFS - AFFILIATES

### 11.1 Análise do Problema

**O que acontece hoje na criação de marketplace:**
```typescript
// routes/affiliates.ts:87-102
// Criar metadata para IPFS
const metadata = {
  name: body.name,
  description: body.description || '',
  logoUrl: body.logoUrl || '',
  bannerUrl: body.bannerUrl || '',
  theme: 'bazari',
  primaryColor: body.primaryColor || '#7C3AED',
  secondaryColor: body.secondaryColor || '#EC4899',
  createdAt: now,
};

// Upload metadata para IPFS (CRIPTOGRAFADO SEM NECESSIDADE!)
const metadataBuffer = Buffer.from(JSON.stringify(metadata), 'utf-8');
const encryptionKey = ipfsService.generateEncryptionKey();
const metadataCid = await ipfsService.uploadEncrypted(metadataBuffer, encryptionKey);

// Criar marketplace com CID
const marketplace = await prisma.affiliateMarketplace.create({
  data: {
    ...campos,
    metadataCid,  // ← SALVO MAS NUNCA LIDO!
  },
});
```

**Problemas:**
1. ❌ **Dados públicos criptografados** - Metadados de marketplace são públicos, por que criptografar?
2. ❌ **Duplicação total** - Tudo já está no PostgreSQL (AffiliateMarketplace table)
3. ❌ **Ninguém lê do IPFS** - Frontend busca do PostgreSQL
4. ❌ **Latência** - Adiciona 5s+ na criação
5. ❌ **Chave de criptografia perdida** - encryptionKey não é salvo!

### 11.2 Arquivos Afetados - Affiliates

| Arquivo | Tipo | Mudança |
|---------|------|---------|
| `routes/affiliates.ts` | Backend | Remover upload IPFS |
| `schema.prisma` | DB | Remover `AffiliateMarketplace.metadataCid` |

### 11.3 Plano de Execução - Affiliates

#### Passo 1: Simplificar `routes/affiliates.ts`

**ANTES:**
```typescript
// Criar metadata para IPFS
const metadata = { ... };

// Upload metadata para IPFS
const metadataBuffer = Buffer.from(JSON.stringify(metadata), 'utf-8');
const encryptionKey = ipfsService.generateEncryptionKey();
const metadataCid = await ipfsService.uploadEncrypted(metadataBuffer, encryptionKey);

// Criar marketplace
const marketplace = await prisma.affiliateMarketplace.create({
  data: {
    ...campos,
    metadataCid,
  },
});
```

**DEPOIS:**
```typescript
// Criar marketplace (sem IPFS)
const marketplace = await prisma.affiliateMarketplace.create({
  data: {
    ownerId: profile.id,
    name: body.name,
    slug: body.slug,
    description: body.description,
    logoUrl: body.logoUrl,
    bannerUrl: body.bannerUrl,
    theme: 'bazari',
    primaryColor: body.primaryColor,
    secondaryColor: body.secondaryColor,
    createdAt: BigInt(now),
    updatedAt: BigInt(now),
    // metadataCid: REMOVIDO
  },
});
```

#### Passo 2: Migration Prisma - AffiliateMarketplace

```sql
-- Migration: remove_ipfs_affiliates
ALTER TABLE "AffiliateMarketplace" DROP COLUMN IF EXISTS "metadataCid";
```

### 11.4 Impacto - Affiliates

| Métrica | Antes | Depois |
|---------|-------|--------|
| Latência criação | 5-30s | <1s |
| Pontos de falha | 2 (DB, IPFS) | 1 (DB) |
| Dados duplicados | 2x | 1x |

---

## 12. FUNÇÕES DO `lib/ipfs.ts` - PLANO REVISADO

### O que REMOVER:

| Função | Usado por | Ação |
|--------|-----------|------|
| `fetchIpfsJson()` | Stores | **REMOVER** |
| `createInitialMetadata()` | Auth | **REMOVER** |
| `publishProfileMetadata()` | Auth | **REMOVER** |
| `fetchProfileMetadata()` | Auth (talvez) | **REMOVER** |

### O que MANTER (para Chat/Disputes):

| Função | Usado por | Ação |
|--------|-----------|------|
| `uploadToIpfs()` | Chat, Disputes | **MANTER** |
| `downloadFromIpfs()` | Chat | **MANTER** |
| `IpfsClientPool` | Todos | **MANTER** |
| `getIpfsHealth()` | Health | **MANTER** (opcional) |
| `getIpfsInfo()` | Health | **MANTER** (opcional) |

---

## 13. MIGRATION PRISMA CONSOLIDADA

```sql
-- Migration: remove_ipfs_stores_auth_affiliates
-- Data: 2024-12-06

-- ============================================
-- 1. STORES MODULE
-- ============================================

-- Remover campos IPFS do SellerProfile
ALTER TABLE "SellerProfile" DROP COLUMN IF EXISTS "metadataCid";
ALTER TABLE "SellerProfile" DROP COLUMN IF EXISTS "categoriesCid";
ALTER TABLE "SellerProfile" DROP COLUMN IF EXISTS "categoriesHash";
ALTER TABLE "SellerProfile" DROP COLUMN IF EXISTS "productsCid";
ALTER TABLE "SellerProfile" DROP COLUMN IF EXISTS "productsHash";

-- Remover tabela StoreSnapshot (duplicação)
DROP TABLE IF EXISTS "StoreSnapshot";

-- Simplificar StorePublishHistory
ALTER TABLE "StorePublishHistory" DROP COLUMN IF EXISTS "metadataCid";
ALTER TABLE "StorePublishHistory" DROP COLUMN IF EXISTS "categoriesCid";
ALTER TABLE "StorePublishHistory" DROP COLUMN IF EXISTS "categoriesHash";
ALTER TABLE "StorePublishHistory" DROP COLUMN IF EXISTS "productsCid";
ALTER TABLE "StorePublishHistory" DROP COLUMN IF EXISTS "productsHash";

-- ============================================
-- 2. AUTH/PROFILES MODULE
-- ============================================

-- Remover campo metadataCid do Profile
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "metadataCid";

-- ============================================
-- 3. AFFILIATES MODULE
-- ============================================

-- Remover campo metadataCid do AffiliateMarketplace
ALTER TABLE "AffiliateMarketplace" DROP COLUMN IF EXISTS "metadataCid";
```

---

## 14. CHECKLIST FINAL CONSOLIDADO

### Stores
- [ ] Remover lógica IPFS de `routes/stores.ts`
- [ ] Remover lógica IPFS de `routes/storePublish.ts`
- [ ] Remover `lib/publishPipeline.ts` (funções IPFS)
- [ ] Remover `workers/verifierWorker.ts`
- [ ] Remover `scripts/republishStores.ts`
- [ ] Atualizar frontend (remover CIDs, simplificar tipos)
- [ ] Simplificar pallet-stores (opcional)

### Auth/Profiles
- [ ] Remover lógica IPFS de `routes/auth.ts`
- [ ] Remover lógica IPFS de `services/social-auth.service.ts`
- [ ] Simplificar `lib/profilesChain.ts` (remover CID param)
- [ ] Remover `createInitialMetadata()` de `lib/ipfs.ts`
- [ ] Remover `publishProfileMetadata()` de `lib/ipfs.ts`
- [ ] Simplificar pallet-profiles (opcional)

### Affiliates
- [ ] Remover lógica IPFS de `routes/affiliates.ts`
- [ ] Remover import de ipfsService

### Database
- [ ] Criar migration consolidada
- [ ] Aplicar em staging
- [ ] Testar todos os fluxos
- [ ] Aplicar em produção

### Cleanup
- [ ] Remover funções não usadas de `lib/ipfs.ts`
- [ ] Atualizar testes
- [ ] Atualizar documentação

---

## 15. MÉTRICAS DE SUCESSO CONSOLIDADAS

| Métrica | Antes | Depois |
|---------|-------|--------|
| **Latência publish loja** | 30-60s | 5-10s |
| **Latência primeiro login** | 8-36s | 6-12s |
| **Latência criar marketplace** | 5-30s | <1s |
| **Latência GET /stores/by-slug** | 2-5s | <500ms |
| **Pontos de falha (total)** | 10+ | 4 |
| **Linhas de código IPFS** | ~2000 | ~500 |
| **Tabelas DB removidas** | 0 | 1 (StoreSnapshot) |
| **Campos DB removidos** | 0 | 10+ |

---

## 16. MÓDULOS PARA VARREDURA FUTURA

### 🔄 Chat/Media
- **Status atual**: Usa IPFS para upload de mídia criptografada
- **Análise**: Object storage (S3/R2) seria mais rápido, confiável e barato
- **Ação futura**: Avaliar migração para S3/R2 com CDN

### 🔄 GPS/Delivery
- **Status atual**: Implementação incompleta
- **Análise**: Conceito bom (provas imutáveis), mas não está integrado
- **Ação futura**: Completar implementação ou remover

### ✅ Disputes
- **Status atual**: Único uso legítimo de IPFS
- **Análise**: Evidência imutável e verificável faz sentido
- **Ação futura**: MANTER e melhorar (adicionar upload integrado)
