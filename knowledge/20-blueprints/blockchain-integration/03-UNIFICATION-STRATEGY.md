# Unification Strategy - BazChat Commerce + Marketplace

**Status**: 🎯 Active Development
**Last Updated**: 2025-11-11
**Priority**: P1 - CRITICAL (Foundation for FASE 1)

---

## 🎯 RESUMO EXECUTIVO

### Problema Atual

Bazari possui **2 sistemas duplicados** para commerce:

1. **Marketplace Orders** (`apps/api/prisma/schema.prisma:330-370`)
   - Model: `Order`, `OrderItem`, `PaymentIntent`
   - Usado para: Compras via Marketplace Web

2. **BazChat Orders** (`apps/api/src/chat/services/`)
   - Model: `ChatProposal`, `Thread`, `AffiliateSale`
   - Usado para: Compras via BazChat (WhatsApp-style)

### Impacto da Duplicação

```
📊 Código Duplicado:
- commission.ts: ~400 linhas
- orders.service.ts: ~500 linhas
- chat.orders.ts: ~350 linhas
- order.service.ts: ~550 linhas
TOTAL: ~1800 linhas duplicadas (33% do código de commerce)
```

**Problemas**:
- ❌ Lógica de split de comissão duplicada
- ❌ Escrow/PaymentIntent duplicado
- ❌ Status transitions duplicadas
- ❌ Bugs corrigidos em um sistema não propagam para o outro
- ❌ Dificulta migração para on-chain (2 integrações necessárias)

### Solução

**Unificar em um único modelo `Order`** com:
- Campo `source: MARKETPLACE | BAZCHAT`
- `threadId?: string` (presente apenas se source = BAZCHAT)
- `isMultiStore: boolean` (multi-store orders do BazChat)
- `UnifiedOrderService` com lógica compartilhada

---

## 📋 ANÁLISE COMPARATIVA

### Order (Marketplace) vs ChatProposal (BazChat)

| Feature | Order (Marketplace) | ChatProposal (BazChat) | Solução Unificada |
|---------|---------------------|------------------------|-------------------|
| **Status** | PENDING → PAID → SHIPPED → DELIVERED | PROPOSED → ACCEPTED → PAID → DELIVERED | Adicionar PROPOSED ao Order |
| **Multi-Store** | ❌ Não suporta | ✅ Sim (storeGroups JSON) | Adicionar `isMultiStore` + `storeGroups` |
| **Affiliate Split** | ❌ Não implementado | ✅ Sim (AffiliateSplit table) | Manter AffiliateSplit, FK para Order |
| **Thread Context** | ❌ N/A | ✅ threadId obrigatório | Adicionar `threadId?` opcional |
| **PaymentIntent** | ✅ Sim | ✅ Sim (duplicado) | Manter PaymentIntent unificado |
| **Escrow** | ⚠️ Partial (MOCK) | ⚠️ Partial (MOCK) | Migrar para bazari-escrow on-chain |

---

## 🗂️ SCHEMA UNIFICADO

### Prisma Schema Changes

```prisma
// ========================================
// BEFORE (Duplicated Models)
// ========================================

// Marketplace Order
model Order {
  id              String   @id @default(cuid())
  userId          String
  storeId         String
  status          OrderStatus
  totalAmount     Decimal
  items           OrderItem[]
  paymentIntent   PaymentIntent?
  createdAt       DateTime @default(now())
}

// BazChat Order (ChatProposal)
model ChatProposal {
  id              String   @id @default(cuid())
  threadId        String
  sellerId        String
  buyerId         String
  status          ProposalStatus
  totalAmount     Decimal
  storeGroups     Json?
  affiliateSplits AffiliateSplit[]
  createdAt       DateTime @default(now())
}

// ========================================
// AFTER (Unified Model)
// ========================================

enum OrderSource {
  MARKETPLACE
  BAZCHAT
}

enum OrderStatus {
  // BazChat-specific
  PROPOSED        // Proposta criada, aguardando aceitação

  // Common
  PENDING         // Aceita/Criada, aguardando pagamento
  PAID            // Pagamento confirmado
  PROCESSING      // Em processamento
  SHIPPED         // Enviado
  DELIVERED       // Entregue

  // Terminal states
  CANCELLED
  REFUNDED
  DISPUTED
}

model Order {
  id              String        @id @default(cuid())

  // Source identification
  source          OrderSource   @default(MARKETPLACE)
  threadId        String?       // Presente apenas se source = BAZCHAT

  // Parties
  userId          String        // Comprador (buyerId)
  storeId         String?       // NULL se isMultiStore = true

  // Multi-store support (BazChat)
  isMultiStore    Boolean       @default(false)
  storeGroups     Json?         // { "store1": [item1, item2], "store2": [item3] }

  // Status & amounts
  status          OrderStatus   @default(PENDING)
  totalAmount     Decimal       @db.Decimal(10, 2)
  platformFee     Decimal       @db.Decimal(10, 2) @default(0)

  // Relationships
  items           OrderItem[]
  paymentIntent   PaymentIntent?
  affiliateSplits AffiliateSplit[]

  // Metadata
  metadata        Json?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Indexes
  @@index([userId])
  @@index([storeId])
  @@index([threadId])
  @@index([status])
  @@index([source])
}

model OrderItem {
  id              String   @id @default(cuid())
  orderId         String
  order           Order    @relation(fields: [orderId], references: [id])

  productId       String
  storeId         String   // Para multi-store orders

  quantity        Int
  unitPrice       Decimal  @db.Decimal(10, 2)
  subtotal        Decimal  @db.Decimal(10, 2)

  metadata        Json?
  createdAt       DateTime @default(now())

  @@index([orderId])
  @@index([productId])
  @@index([storeId])
}

model AffiliateSplit {
  id              String   @id @default(cuid())
  orderId         String
  order           Order    @relation(fields: [orderId], references: [id])

  affiliateId     String
  percentage      Decimal  @db.Decimal(5, 2)
  amount          Decimal  @db.Decimal(10, 2)
  depth           Int      // Nível no DAG (0 = direct referrer)

  txHash          String?  // NULL até on-chain implementation
  status          SplitStatus @default(PENDING)

  createdAt       DateTime @default(now())
  paidAt          DateTime?

  @@index([orderId])
  @@index([affiliateId])
}

enum SplitStatus {
  PENDING
  PROCESSING
  PAID
  FAILED
}

model PaymentIntent {
  id              String   @id @default(cuid())
  orderId         String   @unique
  order           Order    @relation(fields: [orderId], references: [id])

  provider        PaymentProvider
  amount          Decimal  @db.Decimal(10, 2)
  currency        String   @default("BZR")

  status          PaymentStatus @default(PENDING)
  txHash          String?  // NULL até on-chain escrow

  metadata        Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([orderId])
  @@index([status])
}

enum PaymentProvider {
  BLOCKCHAIN
  STRIPE
  PIX
}

enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REFUNDED
}
```

---

## 🔄 MIGRATION SCRIPT

### SQL Migration (Prisma)

```sql
-- ========================================
-- FASE 1: Backup & Preparation
-- ========================================

-- Backup existing tables
CREATE TABLE _order_backup AS SELECT * FROM "Order";
CREATE TABLE _chat_proposal_backup AS SELECT * FROM "ChatProposal";

-- ========================================
-- FASE 2: Add New Columns to Order
-- ========================================

ALTER TABLE "Order"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'MARKETPLACE',
  ADD COLUMN "threadId" TEXT,
  ADD COLUMN "isMultiStore" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "storeGroups" JSONB,
  ADD COLUMN "platformFee" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Add new status values
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PROPOSED';

-- Create indexes
CREATE INDEX "Order_threadId_idx" ON "Order"("threadId");
CREATE INDEX "Order_source_idx" ON "Order"("source");

-- ========================================
-- FASE 3: Migrate ChatProposal → Order
-- ========================================

-- Migrate ChatProposal data to Order table
INSERT INTO "Order" (
  id,
  source,
  threadId,
  userId,
  storeId,
  isMultiStore,
  storeGroups,
  status,
  totalAmount,
  platformFee,
  metadata,
  createdAt,
  updatedAt
)
SELECT
  cp.id,
  'BAZCHAT'::TEXT as source,
  cp."threadId",
  cp."buyerId" as userId,
  -- Se multi-store, storeId = NULL
  CASE
    WHEN cp."storeGroups" IS NOT NULL THEN NULL
    ELSE cp."storeId"
  END as storeId,
  (cp."storeGroups" IS NOT NULL) as isMultiStore,
  cp."storeGroups",
  -- Map ProposalStatus → OrderStatus
  CASE cp.status
    WHEN 'PROPOSED' THEN 'PROPOSED'::OrderStatus
    WHEN 'ACCEPTED' THEN 'PENDING'::OrderStatus
    WHEN 'PAID' THEN 'PAID'::OrderStatus
    WHEN 'DELIVERED' THEN 'DELIVERED'::OrderStatus
    WHEN 'CANCELLED' THEN 'CANCELLED'::OrderStatus
    ELSE 'PENDING'::OrderStatus
  END as status,
  cp."totalAmount",
  COALESCE(cp."platformFee", 0) as platformFee,
  cp.metadata,
  cp."createdAt",
  cp."updatedAt"
FROM "ChatProposal" cp
WHERE NOT EXISTS (
  SELECT 1 FROM "Order" o WHERE o.id = cp.id
);

-- ========================================
-- FASE 4: Migrate Related Tables
-- ========================================

-- Update AffiliateSplit FK (já aponta para orderId, verificar)
-- Se ChatProposal.id é usado em AffiliateSplit.proposalId:
ALTER TABLE "AffiliateSplit"
  RENAME COLUMN "proposalId" TO "orderId";

-- Atualizar PaymentIntent (se existir duplicação)
UPDATE "PaymentIntent" pi
SET "orderId" = cp.id
FROM "ChatProposal" cp
WHERE pi."chatProposalId" = cp.id;

-- ========================================
-- FASE 5: Cleanup Old Tables
-- ========================================

-- Drop ChatProposal table (after verification)
-- ATENÇÃO: Rodar apenas após testes completos!
-- DROP TABLE "ChatProposal";

-- Remove backup tables (após rollout completo)
-- DROP TABLE _order_backup;
-- DROP TABLE _chat_proposal_backup;
```

---

## 💻 UNIFIED SERVICE IMPLEMENTATION

### UnifiedOrderService

```typescript
// apps/api/src/services/orders/unified-order.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface CreateOrderDTO {
  source: 'MARKETPLACE' | 'BAZCHAT';
  userId: string;

  // Marketplace orders
  storeId?: string;
  items?: OrderItemInput[];

  // BazChat orders
  threadId?: string;
  isMultiStore?: boolean;
  storeGroups?: Record<string, OrderItemInput[]>;

  // Common
  paymentProvider: 'BLOCKCHAIN' | 'STRIPE' | 'PIX';
  metadata?: any;
}

export interface OrderItemInput {
  productId: string;
  storeId: string;
  quantity: number;
  unitPrice: number;
}

@Injectable()
export class UnifiedOrderService {
  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService,
  ) {}

  /**
   * Create order (Marketplace or BazChat)
   */
  async createOrder(dto: CreateOrderDTO) {
    // Validation
    if (dto.source === 'BAZCHAT' && !dto.threadId) {
      throw new Error('threadId required for BAZCHAT orders');
    }

    if (dto.source === 'MARKETPLACE' && !dto.storeId) {
      throw new Error('storeId required for MARKETPLACE orders');
    }

    // Calculate totals
    const { items, totalAmount, platformFee } = this.calculateTotals(dto);

    // Create Order
    const order = await this.prisma.order.create({
      data: {
        source: dto.source,
        userId: dto.userId,
        storeId: dto.isMultiStore ? null : dto.storeId,
        threadId: dto.threadId,
        isMultiStore: dto.isMultiStore || false,
        storeGroups: dto.storeGroups as any,
        status: dto.source === 'BAZCHAT' ? 'PROPOSED' : 'PENDING',
        totalAmount,
        platformFee,
        items: {
          create: items,
        },
        metadata: dto.metadata,
      },
      include: {
        items: true,
      },
    });

    // Create PaymentIntent (if not PROPOSED)
    if (order.status !== 'PROPOSED') {
      await this.createPaymentIntent(order.id, dto.paymentProvider, totalAmount);
    }

    return order;
  }

  /**
   * Accept BazChat proposal (PROPOSED → PENDING)
   */
  async acceptProposal(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new Error('Order not found');
    if (order.source !== 'BAZCHAT') throw new Error('Only BAZCHAT orders can be accepted');
    if (order.status !== 'PROPOSED') throw new Error('Order not in PROPOSED state');
    if (order.userId !== userId) throw new Error('Unauthorized');

    // Update status
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'PENDING' },
    });

    // Create PaymentIntent
    await this.createPaymentIntent(orderId, 'BLOCKCHAIN', order.totalAmount);

    return updated;
  }

  /**
   * Process payment (PENDING → PAID)
   */
  async processPayment(orderId: string, txHash: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        paymentIntent: true,
        affiliateSplits: true,
      },
    });

    if (!order) throw new Error('Order not found');
    if (order.status !== 'PENDING') throw new Error('Order not in PENDING state');

    // TODO: Verify txHash on-chain (Phase 2)
    // const isValid = await this.blockchain.verifyEscrowLock(txHash);
    // if (!isValid) throw new Error('Invalid transaction');

    // Update PaymentIntent
    await this.prisma.paymentIntent.update({
      where: { orderId },
      data: {
        status: 'COMPLETED',
        txHash,
      },
    });

    // Update Order
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'PAID' },
    });

    // Process affiliate splits (if any)
    if (order.affiliateSplits.length > 0) {
      await this.processAffiliateSplits(orderId, txHash);
    }

    return updated;
  }

  /**
   * Mark as shipped (PAID → SHIPPED)
   */
  async markAsShipped(orderId: string, storeId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new Error('Order not found');
    if (order.status !== 'PAID') throw new Error('Order not paid');

    // Authorization: Only store owner can ship
    if (order.storeId !== storeId && !order.isMultiStore) {
      throw new Error('Unauthorized');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'SHIPPED' },
    });
  }

  /**
   * Complete delivery (SHIPPED → DELIVERED)
   */
  async completeDelivery(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { paymentIntent: true },
    });

    if (!order) throw new Error('Order not found');
    if (order.status !== 'SHIPPED') throw new Error('Order not shipped');

    // TODO: Release escrow on-chain (Phase 2)
    // if (order.paymentIntent?.txHash) {
    //   await this.blockchain.releaseEscrow(order.paymentIntent.txHash);
    // }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'DELIVERED' },
    });
  }

  /**
   * Calculate affiliate splits (unified logic)
   */
  private async processAffiliateSplits(orderId: string, txHash: string) {
    const splits = await this.prisma.affiliateSplit.findMany({
      where: { orderId },
    });

    for (const split of splits) {
      // TODO: Execute split on-chain (Phase 2)
      // const splitTxHash = await this.blockchain.executeSplit({
      //   recipient: split.affiliateId,
      //   amount: split.amount,
      // });

      await this.prisma.affiliateSplit.update({
        where: { id: split.id },
        data: {
          status: 'PAID',
          txHash: txHash, // Temporary: use parent txHash
          paidAt: new Date(),
        },
      });
    }
  }

  /**
   * Calculate order totals
   */
  private calculateTotals(dto: CreateOrderDTO) {
    let items: OrderItemInput[] = [];

    if (dto.isMultiStore && dto.storeGroups) {
      // Flatten storeGroups into items
      items = Object.values(dto.storeGroups).flat();
    } else if (dto.items) {
      items = dto.items;
    } else {
      throw new Error('No items provided');
    }

    const subtotal = items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    const platformFee = subtotal * 0.05; // 5% platform fee
    const totalAmount = subtotal + platformFee;

    return {
      items: items.map(item => ({
        productId: item.productId,
        storeId: item.storeId,
        quantity: item.quantity,
        unitPrice: new Decimal(item.unitPrice),
        subtotal: new Decimal(item.unitPrice * item.quantity),
      })),
      totalAmount: new Decimal(totalAmount),
      platformFee: new Decimal(platformFee),
    };
  }

  /**
   * Create PaymentIntent
   */
  private async createPaymentIntent(
    orderId: string,
    provider: 'BLOCKCHAIN' | 'STRIPE' | 'PIX',
    amount: Decimal,
  ) {
    return this.prisma.paymentIntent.create({
      data: {
        orderId,
        provider,
        amount,
        status: 'PENDING',
      },
    });
  }
}
```

---

## 🔄 MIGRATION STRATEGY

### Sprint-by-Sprint Plan (7 semanas)

#### **Sprint 1 (Week 1): Schema Migration**
**Goal**: Unificar schemas sem breaking changes

**Tasks**:
- [ ] Criar migration Prisma com novo schema
- [ ] Adicionar colunas `source`, `threadId`, `isMultiStore`, `storeGroups` ao Order
- [ ] Adicionar status `PROPOSED` ao enum OrderStatus
- [ ] Rodar migration em staging
- [ ] Verificar backups funcionando

**Deliverables**:
- ✅ Migration SQL pronta
- ✅ Backups automáticos configurados
- ✅ Staging com schema unificado

**Estimate**: 3 dias

---

#### **Sprint 2 (Week 1-2): Data Migration**
**Goal**: Migrar ChatProposal → Order

**Tasks**:
- [ ] Rodar script de migração em staging
- [ ] Verificar integridade dos dados (row count, sums)
- [ ] Testar queries existentes (não devem quebrar)
- [ ] Criar script de rollback

**Deliverables**:
- ✅ ChatProposal data migrated to Order
- ✅ Rollback script testado
- ✅ Data integrity report

**Estimate**: 4 dias

---

#### **Sprint 3 (Week 2-3): UnifiedOrderService**
**Goal**: Implementar serviço unificado

**Tasks**:
- [ ] Criar `UnifiedOrderService` em `/apps/api/src/services/orders/`
- [ ] Implementar `createOrder()` com source detection
- [ ] Implementar state transitions (PROPOSED → PENDING → PAID → DELIVERED)
- [ ] Adicionar testes unitários (80% coverage)

**Deliverables**:
- ✅ UnifiedOrderService implementado
- ✅ Testes unitários passando
- ✅ Documentação TypeDoc

**Estimate**: 5 dias

---

#### **Sprint 4 (Week 3-4): Route Refactoring**
**Goal**: Refatorar rotas para usar UnifiedOrderService

**Tasks**:
- [ ] Refatorar `/apps/api/src/routes/orders.ts` (Marketplace)
- [ ] Refatorar `/apps/api/src/chat/routes/chat.orders.ts` (BazChat)
- [ ] Deprecar `commission.ts` (mover lógica para UnifiedOrderService)
- [ ] Atualizar documentação OpenAPI/Swagger

**Deliverables**:
- ✅ Rotas refatoradas
- ✅ Backward compatibility mantida
- ✅ Swagger atualizado

**Estimate**: 5 dias

---

#### **Sprint 5 (Week 4-5): Frontend Adaptation**
**Goal**: Atualizar frontend para novo schema

**Tasks**:
- [ ] Atualizar TypeScript types em `apps/web/src/types/`
- [ ] Atualizar Marketplace order flow
- [ ] Atualizar BazChat order flow
- [ ] Testar E2E (Playwright)

**Deliverables**:
- ✅ Frontend adaptado
- ✅ E2E tests passando
- ✅ No breaking changes

**Estimate**: 6 dias

---

#### **Sprint 6 (Week 5-6): Testing & Validation**
**Goal**: Testes rigorosos antes de produção

**Tasks**:
- [ ] Load testing (simulate 1000 orders/min)
- [ ] Regression testing (old flows still work)
- [ ] Manual QA (checkout flows completos)
- [ ] Security audit (SQL injection, auth)

**Deliverables**:
- ✅ Load test report (p95 < 500ms)
- ✅ Regression tests (0 failures)
- ✅ Security audit clean

**Estimate**: 5 dias

---

#### **Sprint 7 (Week 6-7): Production Rollout**
**Goal**: Deploy gradual em produção

**Tasks**:
- [ ] Deploy schema migration (off-hours)
- [ ] Deploy backend (blue-green deployment)
- [ ] Deploy frontend (canary release: 10% → 50% → 100%)
- [ ] Monitor dashboards (Sentry, Prometheus)
- [ ] Deprecar ChatProposal model (após 1 semana estável)

**Deliverables**:
- ✅ Production deployment successful
- ✅ 0 critical bugs
- ✅ Old tables removed (cleanup)

**Estimate**: 5 dias

---

## 📊 BENEFITS & METRICS

### Code Reduction
```
Before Unification:
- commission.ts: 400 lines
- orders.service.ts: 500 lines
- chat.orders.ts: 350 lines
- order.service.ts: 550 lines
TOTAL: 1800 lines

After Unification:
- unified-order.service.ts: 600 lines
- orders.ts (routes): 200 lines
- chat.orders.ts (routes): 200 lines
TOTAL: 1000 lines

REDUCTION: 800 lines (-44%)
```

### Maintenance Benefits
- ✅ **Single source of truth** para order logic
- ✅ **Bug fixes propagate** automaticamente (Marketplace + BazChat)
- ✅ **Easier on-chain integration** (1 integration point)
- ✅ **Consistent status transitions** across all order sources
- ✅ **Unified affiliate logic** (no duplication)

### Performance
- ✅ **-1 JOIN** em queries (ChatProposal eliminated)
- ✅ **Simplified queries** (single table for all orders)
- ✅ **Better indexing** (consolidated indexes)

---

## 🚨 RISKS & MITIGATION

### Risk 1: Data Loss During Migration
**Probability**: Low
**Impact**: CRITICAL

**Mitigation**:
- ✅ Automated backups before migration
- ✅ Row count validation (before/after)
- ✅ Checksum validation for critical fields
- ✅ Rollback script tested in staging

---

### Risk 2: Breaking Existing Queries
**Probability**: Medium
**Impact**: High

**Mitigation**:
- ✅ Keep old tables during grace period (1 week)
- ✅ Comprehensive regression tests
- ✅ Blue-green deployment (instant rollback)

---

### Risk 3: Performance Degradation
**Probability**: Low
**Impact**: Medium

**Mitigation**:
- ✅ Load testing before production
- ✅ Query plan analysis (EXPLAIN)
- ✅ Proper indexing strategy

---

## 📚 REFERENCES

- [Current State Analysis](01-CURRENT-STATE-ANALYSIS.md) - Identificação da duplicação
- [Implementation Roadmap](05-IMPLEMENTATION-ROADMAP.md) - Sprints 1-7 detalhados
- [Target Architecture](02-TARGET-ARCHITECTURE.md) - Arquitetura final unificada
- [bazari-commerce Pallet](../pallets/bazari-commerce/SPEC.md) - On-chain integration (Phase 2)

---

## ✅ SUCCESS CRITERIA

**Sprint 7 completion = SUCCESS se**:
- ✅ 0 data loss (verified via checksums)
- ✅ 0 critical bugs in production
- ✅ p95 latency < 500ms (maintained)
- ✅ 100% backward compatibility (old APIs still work)
- ✅ -44% código (800 linhas removidas)
- ✅ ChatProposal table deprecated
