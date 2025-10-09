# Migration Scripts

## migrateStores.ts

Script para migrar lojas existentes que não possuem NFT on-chain.

### Uso

```bash
# Com Alice (desenvolvimento)
MIGRATION_SURI="//Alice" npm run migrate:stores

# Com mnemônico customizado
MIGRATION_SURI="your mnemonic here" npm run migrate:stores

# Com derivation path
MIGRATION_SURI="//Alice//stash" npm run migrate:stores
```

### Variáveis de Ambiente

- `MIGRATION_SURI`: Seed URI da conta que criará os NFTs (padrão: `//Alice`)
- `DATABASE_URL`: URL de conexão com o Postgres (obrigatório)
- `BAZARICHAIN_WS`: Endpoint WebSocket da Bazari Chain (padrão: `ws://127.0.0.1:9944`)

### O que o script faz

1. Busca todas as lojas com `onChainStoreId = null`
2. Para cada loja:
   - Cria um NFT on-chain com placeholder CID
   - Extrai o `storeId` do evento `StoreCreated`
   - Atualiza o Postgres com:
     - `onChainStoreId`: ID do NFT criado
     - `syncStatus`: `pending`
     - `ownerAddress`: Endereço do signer

3. Exibe relatório final com:
   - Total de lojas processadas
   - Número de migrações bem-sucedidas
   - Número de falhas

### Próximos Passos

Após a migração, as lojas terão NFTs criados com CIDs placeholder. Para sincronizar os metadados reais:

1. Acesse o painel de seller de cada loja
2. Clique em "Sincronizar Catálogo"
3. Isso gerará os CIDs reais e atualizará o NFT

### Verificação

Para verificar lojas migradas:

```bash
npx prisma studio
```

Ou via SQL:

```sql
SELECT id, "shopSlug", "onChainStoreId", "syncStatus"
FROM "SellerProfile"
WHERE "onChainStoreId" IS NOT NULL;
```

### Troubleshooting

**Erro: "Dispatch error"**
- Verifique se o signer tem saldo suficiente
- Verifique se a chain está rodando e acessível

**Erro: "StoreId não retornado"**
- Verifique se o pallet `stores` está configurado corretamente
- Verifique os eventos emitidos pela transação

**Timeout**
- Aumente o timeout no código (linha 52)
- Verifique a latência da conexão com a chain

---

## republishStores.ts

Script para republicar lojas migradas com a nova estrutura de 3 JSONs (store, categories, products).

### Uso

```bash
# Modo reindexação (sem publicar on-chain, apenas gera JSONs e indexa)
npm run republish:stores

# Modo completo (publica on-chain + indexa)
REPUBLISH_ONCHAIN=true REPUBLISH_SURI="//Alice" npm run republish:stores

# Com mnemônico customizado
REPUBLISH_ONCHAIN=true REPUBLISH_SURI="your mnemonic here" npm run republish:stores
```

### Variáveis de Ambiente

- `REPUBLISH_ONCHAIN`: Se `true`, publica no blockchain (padrão: `false`)
- `REPUBLISH_SURI`: Seed URI da conta que publicará (padrão: usa `MIGRATION_SURI` ou `//Alice`)
- `DATABASE_URL`: URL de conexão com o Postgres (obrigatório)
- `BAZARICHAIN_WS`: Endpoint WebSocket da Bazari Chain (padrão: `ws://127.0.0.1:9944`)

### Modos de Operação

#### 1. Modo Reindexação (Padrão)
Sem `REPUBLISH_ONCHAIN=true`, o script:
- Gera os 3 JSONs (store, categories, products)
- Faz upload para IPFS
- Calcula hashes
- Salva snapshot no banco
- **NÃO** publica no blockchain
- Enfileira job de indexação no OpenSearch

Útil para:
- Reindexar lojas no OpenSearch
- Regenerar JSONs sem gastar gas
- Testar a pipeline de publicação

#### 2. Modo Completo (On-Chain)
Com `REPUBLISH_ONCHAIN=true`, o script faz tudo do modo reindexação **mais**:
- Publica os CIDs e hashes no blockchain via `stores.publishStore`
- Incrementa a versão da loja on-chain
- Atualiza o bloco de sincronização

Útil para:
- Republicar lojas após mudanças no catálogo
- Atualizar metadados on-chain
- Sincronizar estado do banco com blockchain

### O que o script faz

1. Busca lojas com `onChainStoreId != null` e status:
   - `pending`
   - `DRAFT`
   - `diverged` / `DIVERGED`
   - `error`

2. Para cada loja:
   - Define status como `syncing`
   - Gera JSONs via `buildStoreJson`, `buildCategoriesJson`, `buildProductsJson`
   - Faz upload dos JSONs para IPFS
   - Calcula SHA-256 hashes
   - *[Se REPUBLISH_ONCHAIN=true]* Publica no blockchain
   - Salva snapshot em `StoreSnapshot`
   - Atualiza `SellerProfile` com:
     - `syncStatus`: `SYNCED`
     - `version`: Versão incremental
     - `lastSyncBlock`: Bloco da publicação
     - `metadataCid`, `categoriesCid`, `productsCid`
     - `categoriesHash`, `productsHash`
   - Enfileira job de indexação no OpenSearch

3. Exibe relatório final com sucesso/falhas

### Verificação

**Via Prisma Studio:**
```bash
npx prisma studio
```

**Via SQL:**
```sql
-- Verificar status de sincronização
SELECT
  "shopSlug",
  "syncStatus",
  "version",
  "lastPublishedAt",
  "metadataCid",
  "categoriesCid",
  "productsCid"
FROM "SellerProfile"
WHERE "onChainStoreId" IS NOT NULL
ORDER BY "lastPublishedAt" DESC;

-- Verificar snapshots
SELECT
  s."storeId",
  s."version",
  s."createdAt",
  sp."shopSlug"
FROM "StoreSnapshot" s
JOIN "SellerProfile" sp ON s."storeId" = sp."id"
ORDER BY s."createdAt" DESC;
```

**Via OpenSearch:**
```bash
# Verificar se produtos foram indexados
curl -X GET "localhost:9200/bazari_stores/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": { "match_all": {} },
  "size": 5
}
'
```

### Fluxo Completo de Migração

Para migrar lojas antigas para a nova estrutura:

```bash
# 1. Criar NFTs para lojas sem onChainStoreId
MIGRATION_SURI="//Alice" npm run migrate:stores

# 2. Republicar lojas com estrutura nova (3 JSONs)
# Opção A: Apenas reindexar (sem publicar on-chain)
npm run republish:stores

# Opção B: Republicar on-chain (incrementa versão)
REPUBLISH_ONCHAIN=true REPUBLISH_SURI="//Alice" npm run republish:stores

# 3. Verificar workers estão rodando (para processar indexação)
npm run workers
```

### Troubleshooting

**Erro: "buildStoreJson/buildCategoriesJson failed"**
- Verifique se a loja tem dados válidos no banco
- Verifique se os relacionamentos (produtos, categorias) existem

**Erro: "Upload IPFS failed"**
- Verifique se o IPFS está rodando e acessível
- Verifique a variável `IPFS_API_URL` no `.env`

**Erro: "Dispatch error" (modo on-chain)**
- Verifique se o signer tem saldo suficiente
- Verifique se a chain está sincronizada

**OpenSearch não indexa**
- Verifique se o worker está rodando: `npm run workers`
- Verifique logs do worker
- Verifique se Redis está rodando (BullMQ)
- Verifique se OpenSearch está acessível

**Status fica em "syncing"**
- Script foi interrompido antes de completar
- Execute novamente o script para reprocessar
