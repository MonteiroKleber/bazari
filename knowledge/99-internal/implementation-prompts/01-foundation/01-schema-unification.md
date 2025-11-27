# Schema Unification - Implementation Prompt

**Phase**: P1 - Foundation (Week 1)
**Effort**: 3-5 days
**Dependencies**: None (primeira implementação)

---

## 📋 Contexto

Antes de implementar qualquer pallet, precisamos **unificar o schema de dados** entre:
- **Prisma** (PostgreSQL): Banco de dados off-chain (apps/api/prisma/schema.prisma)
- **Substrate**: Storage on-chain (bazari-chain/pallets/*/lib.rs)

**Problema**:
- Dados críticos estão apenas em PostgreSQL (orders, sales, commissions)
- Não há hash/referência on-chain para essas entidades
- PaymentIntent usa `txHash` fake ou NULL

**Solução**:
1. Adicionar campo `blockchainHash` em modelos Prisma relevantes
2. Criar enums e tipos compartilhados entre backend/blockchain
3. Mapear entidades que devem estar on-chain vs off-chain

---

## 🎯 Objetivo

**Criar tabela de mapeamento** entre entidades Prisma e Substrate, e **atualizar schema Prisma** para incluir referências blockchain onde necessário.

**Output esperado**:
- ✅ Documento de mapeamento: `SCHEMA-MAPPING.md`
- ✅ Prisma schema atualizado com campos `blockchainHash`, `onChainOrderId`, etc.
- ✅ Migração de banco executada com sucesso
- ✅ Tipos TypeScript gerados atualizados

---

## ✅ Checklist de Implementação

### Step 1: Analisar Schema Atual
- [ ] Ler `/root/bazari/apps/api/prisma/schema.prisma` completo
- [ ] Identificar modelos que devem ter representação on-chain:
  - [ ] `Order` (bazari-commerce)
  - [ ] `Sale` (bazari-commerce)
  - [ ] `PaymentIntent` (bazari-escrow)
  - [ ] `Courier` (bazari-fulfillment)
  - [ ] `CourierReview` (off-chain, mas Merkle root on-chain)
  - [ ] `DeliveryWaypoint` (off-chain, proofs on-chain)

### Step 2: Criar Documento de Mapeamento
- [ ] Criar `/root/bazari/knowledge/20-blueprints/schema/SCHEMA-MAPPING.md`
- [ ] Tabela com colunas:
  - [ ] Prisma Model
  - [ ] Substrate Pallet
  - [ ] On-Chain Storage
  - [ ] Sync Strategy (Event-driven, Merkle root, Full on-chain)
  - [ ] Reference Field (campo no Prisma que aponta para blockchain)

**Exemplo de conteúdo**:
```markdown
| Prisma Model | Substrate Pallet | On-Chain Storage | Sync Strategy | Reference Field |
|--------------|------------------|------------------|---------------|-----------------|
| Order | bazari-commerce | Orders<OrderId, Order> | Event-driven | `blockchainOrderId` (u64) |
| Sale | bazari-commerce | Sales<SaleId, Sale> | Event-driven | `blockchainSaleId` (u64) |
| PaymentIntent | bazari-escrow | Escrows<OrderId, Escrow> | Event-driven | `txHash` (String, real) |
| Courier | bazari-fulfillment | Couriers<AccountId, Courier> | Full on-chain | `walletAddress` (String) |
| CourierReview | N/A (off-chain) | Merkle root in Courier struct | Merkle root | `merkleIncluded` (Boolean) |
```

### Step 3: Atualizar Prisma Schema
- [ ] Adicionar campos blockchain nos modelos identificados:

```prisma
model Order {
  id                String   @id @default(cuid())
  // ... existing fields

  // ✅ NEW: Blockchain reference
  blockchainOrderId BigInt?  // On-chain OrderId (u64)
  blockchainTxHash  String?  // Transaction hash when created on-chain
  onChainStatus     String?  // Cache of on-chain status (PENDING, CONFIRMED, etc)
  lastSyncedAt      DateTime? // Last time synced with blockchain

  @@index([blockchainOrderId])
}

model Sale {
  id                String   @id @default(cuid())
  // ... existing fields

  // ✅ NEW: Blockchain reference
  blockchainSaleId  BigInt?
  blockchainTxHash  String?
  onChainStatus     String?
  lastSyncedAt      DateTime?

  @@index([blockchainSaleId])
}

model PaymentIntent {
  id          String   @id @default(cuid())
  // ... existing fields

  // ✅ FIX: txHash deve ser real (não MOCK)
  txHash      String?  // Real transaction hash from bazari-escrow
  escrowId    BigInt?  // On-chain escrow ID

  @@index([txHash])
}

model Courier {
  id        String   @id @default(cuid())
  // ... existing fields

  // ✅ NEW: Blockchain sync
  reviewsMerkleRoot    String?   // Cache of on-chain Merkle root
  lastMerkleUpdate     DateTime? // Last time Merkle root was updated
  onChainReputationScore Int?    // Cache of on-chain reputation

  @@index([reviewsMerkleRoot])
}

model CourierReview {
  id         String   @id @default(cuid())
  // ... existing fields

  // ✅ NEW: Merkle inclusion tracking
  merkleIncluded Boolean  @default(false) // Was included in Merkle tree?
  merkleRootHash String?  // Which Merkle root includes this review?

  @@index([courierId, merkleIncluded])
}

model DeliveryWaypoint {
  id        String   @id @default(cuid())
  // ... existing fields

  // ✅ NEW: Proof tracking
  proofSubmitted Boolean  @default(false) // Was this waypoint part of a proof?
  proofCid       String?  // IPFS CID if submitted as proof
}
```

- [ ] Criar migração: `npx prisma migrate dev --name add_blockchain_references`

### Step 4: Atualizar Tipos TypeScript
- [ ] Rodar `npx prisma generate` para atualizar Prisma Client
- [ ] Verificar que tipos foram gerados corretamente:
  ```bash
  # Em /root/bazari/apps/api
  pnpm exec tsc --noEmit
  ```

### Step 5: Criar Enums Compartilhados
- [ ] Criar `/root/bazari/packages/shared/src/types/blockchain.ts`:

```typescript
// Enums que devem ser idênticos em Rust e TypeScript

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  DISPUTED = 'DISPUTED',
  CANCELLED = 'CANCELLED',
}

export enum SaleStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  COMPLETED = 'COMPLETED',
  REFUNDED = 'REFUNDED',
}

export enum EscrowStatus {
  LOCKED = 'LOCKED',
  RELEASED = 'RELEASED',
  REFUNDED = 'REFUNDED',
  DISPUTED = 'DISPUTED',
}

export type BlockchainReference = {
  blockchainId?: bigint;
  txHash?: string;
  onChainStatus?: string;
  lastSyncedAt?: Date;
};
```

- [ ] Mapear para Rust enums (será usado nos pallets):

```rust
// bazari-chain/pallets/bazari-commerce/src/types.rs
#[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub enum OrderStatus {
    Pending,
    Confirmed,
    InTransit,
    Delivered,
    Disputed,
    Cancelled,
}

#[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub enum SaleStatus {
    PendingPayment,
    Paid,
    Processing,
    Shipped,
    Completed,
    Refunded,
}
```

### Step 6: Validar Schema
- [ ] Rodar testes existentes para garantir que nada quebrou:
  ```bash
  cd /root/bazari
  pnpm --filter @bazari/api test
  ```

- [ ] Verificar que migração foi aplicada:
  ```bash
  npx prisma migrate status
  ```

---

## 🚫 Anti-Patterns

### ❌ NÃO FAÇA:
1. **Duplicar lógica de negócio on-chain e off-chain**
   - Regra: Se está on-chain, backend só lê (source of truth = blockchain)
   - Se está off-chain, blockchain não conhece (ex: GPS waypoints)

2. **Criar campos `blockchainHash` em TODOS os modelos**
   - Apenas modelos que representam transações/eventos críticos
   - Exemplo: `User` não precisa (já tem `walletAddress`)

3. **Usar `String` para IDs on-chain**
   - On-chain usa `u64` (8 bytes)
   - Prisma deve usar `BigInt`, não `String`

4. **Sincronizar dados em tempo real (polling)**
   - Usar eventos blockchain → webhook → backend atualiza Prisma
   - Não fazer `setInterval()` para ler blockchain

### ✅ FAÇA:
1. **Cachear dados on-chain no Prisma**
   - Exemplo: `onChainStatus` cache evita RPC calls desnecessárias
   - Atualizar quando evento blockchain for recebido

2. **Usar `lastSyncedAt` para detectar drift**
   - Se `lastSyncedAt` > 1 hora, backend pode re-sincronizar

3. **Índices em campos blockchain**
   - `@@index([blockchainOrderId])` para queries rápidas

---

## 📦 Dependências

**Nenhuma** - este é o primeiro passo.

**Requerido para**:
- ✅ `02-bazari-commerce.md` (precisa saber quais campos existem no Prisma)
- ✅ `03-bazari-escrow.md` (precisa campo `txHash` real)
- ✅ Todos os outros pallets (schema é base de tudo)

---

## 🔗 Referências

- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Substrate Storage](https://docs.substrate.io/build/runtime-storage/)
- [Current Schema](../../../apps/api/prisma/schema.prisma)
- [bazari-commerce SPEC](../../../20-blueprints/pallets/bazari-commerce/SPEC.md)

---

## 🤖 Prompt para Claude Code

```
Estou implementando a integração blockchain do Bazari. A primeira etapa é **unificar o schema de dados** entre Prisma (PostgreSQL off-chain) e Substrate (blockchain on-chain).

**Contexto**:
- Repositório: /root/bazari (backend/frontend) e /root/bazari-chain (blockchain)
- Prisma schema: /root/bazari/apps/api/prisma/schema.prisma
- Documentação: /root/bazari/knowledge/20-blueprints/pallets/

**Objetivo**:
1. Criar documento de mapeamento entre modelos Prisma e pallets Substrate (SCHEMA-MAPPING.md)
2. Adicionar campos blockchain nos modelos Prisma relevantes:
   - `Order`: adicionar `blockchainOrderId`, `blockchainTxHash`, `onChainStatus`, `lastSyncedAt`
   - `Sale`: adicionar `blockchainSaleId`, `blockchainTxHash`, `onChainStatus`, `lastSyncedAt`
   - `PaymentIntent`: garantir `txHash` real (não MOCK), adicionar `escrowId`
   - `Courier`: adicionar `reviewsMerkleRoot`, `lastMerkleUpdate`, `onChainReputationScore`
   - `CourierReview`: adicionar `merkleIncluded`, `merkleRootHash`
   - `DeliveryWaypoint`: adicionar `proofSubmitted`, `proofCid`
3. Criar migração Prisma e aplicar
4. Criar tipos TypeScript compartilhados para enums (OrderStatus, SaleStatus, EscrowStatus)
5. Validar que testes existentes ainda passam

**Anti-patterns a evitar**:
- ❌ Não adicionar `blockchainHash` em TODOS os modelos (apenas os críticos)
- ❌ Não usar `String` para IDs on-chain (usar `BigInt` para `u64`)
- ❌ Não sincronizar com polling (usar eventos blockchain)

**Checklist**:
- [ ] Ler schema Prisma atual e identificar modelos que precisam referência blockchain
- [ ] Criar /root/bazari/knowledge/20-blueprints/schema/SCHEMA-MAPPING.md com tabela de mapeamento
- [ ] Atualizar schema Prisma com novos campos
- [ ] Rodar `npx prisma migrate dev --name add_blockchain_references`
- [ ] Criar /root/bazari/packages/shared/src/types/blockchain.ts com enums TypeScript
- [ ] Rodar `pnpm --filter @bazari/api test` para validar

**Referências**:
- Ler SPECs dos pallets em /root/bazari/knowledge/20-blueprints/pallets/ para entender estrutura on-chain
- Especialmente: bazari-commerce/SPEC.md, bazari-escrow/SPEC.md, bazari-fulfillment/SPEC.md

Me avise quando terminar e mostre:
1. Diff do schema Prisma
2. Conteúdo do SCHEMA-MAPPING.md
3. Output da migração
4. Status dos testes
```

---

**Version**: 1.0.0
**Last Updated**: 2025-11-12
**Author**: Claude (Senior Software Architect)
