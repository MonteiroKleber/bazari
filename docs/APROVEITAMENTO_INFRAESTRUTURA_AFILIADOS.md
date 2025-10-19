# 🔄 Aproveitamento de Infraestrutura - Sistema de Afiliados

**Data**: 2025-10-15
**Análise**: Comparação entre infraestrutura existente (BazChat) e Marketplace do Afiliado

---

## 📊 Resumo Executivo

**ÓTIMA NOTÍCIA**: Aproximadamente **70% da infraestrutura** necessária para o Marketplace do Afiliado **JÁ ESTÁ IMPLEMENTADA** no sistema de afiliados do BazChat!

### O que já existe:
- ✅ Schema de banco de dados (90% completo)
- ✅ Serviço de comissões e split de pagamentos
- ✅ Worker de estatísticas de afiliados
- ✅ Sistema de aprovação de afiliados
- ✅ Políticas de comissão por loja
- ✅ Registro de vendas com comissão

### O que precisa adicionar:
- 🆕 Tabela `AffiliateMarketplace` (vitrine personalizada)
- 🆕 Tabela `AffiliateProduct` (produtos na vitrine)
- 🆕 Páginas frontend (vitrine pública + dashboard)
- 🔧 Rotas da API específicas para marketplace

---

## 🗄️ Análise: Schema do Banco de Dados

### ✅ JÁ EXISTE (BazChat - Fase 8)

#### 1. `StoreCommissionPolicy`
**Localização**: `apps/api/prisma/schema.prisma:1037`

```prisma
model StoreCommissionPolicy {
  storeId             BigInt   @id
  mode                String   @default("open") // open | followers | affiliates
  percent             Int      @default(5)
  minReputation       Int?
  dailyCommissionCap  Decimal? @db.Decimal(20, 8)
  allowMultiStore     Boolean  @default(true)
  createdAt           BigInt
  updatedAt           BigInt
}
```

**Status**: ✅ **100% compatível** com a spec do Marketplace
- Suporta 3 modos (open, followers, affiliates)
- Comissão customizada por loja
- Limite diário
- Reputação mínima

**Ação**: ✅ **Nenhuma mudança necessária** - usar como está

---

#### 2. `ChatStoreAffiliate`
**Localização**: `apps/api/prisma/schema.prisma:1201`

```prisma
model ChatStoreAffiliate {
  id                String   @id @default(uuid())
  storeId           BigInt
  promoterId        String
  promoter          Profile  @relation(...)

  status            String   @default("pending") // pending | approved | rejected | suspended
  customCommission  Int?
  monthlySalesCap   Decimal? @db.Decimal(20, 8)
  notes             String?  @db.Text

  requestedAt       BigInt
  approvedAt        BigInt?
  rejectedAt        BigInt?
  suspendedAt       BigInt?

  totalSales        Decimal  @default(0) @db.Decimal(20, 8)
  totalCommission   Decimal  @default(0) @db.Decimal(20, 8)
  salesCount        Int      @default(0)

  createdAt         BigInt
  updatedAt         BigInt

  @@unique([storeId, promoterId])
  @@index([promoterId])
  @@index([storeId, status])
}
```

**Status**: ✅ **100% compatível**
- Sistema completo de aprovação/rejeição
- Comissão customizada por afiliado
- Limite mensal de vendas
- Estatísticas de performance

**Ação**: ✅ **Nenhuma mudança necessária** - usar como está

---

#### 3. `ChatAffiliateInvite`
**Localização**: `apps/api/prisma/schema.prisma:1239`

```prisma
model ChatAffiliateInvite {
  id                String   @id @default(uuid())
  storeId           BigInt
  inviteCode        String   @unique
  maxUses           Int?
  usesCount         Int      @default(0)
  expiresAt         BigInt?
  autoApprove       Boolean  @default(false)
  defaultCommission Int      @default(5)
  createdAt         BigInt

  @@index([storeId])
}
```

**Status**: ✅ **Funcionalidade extra** (não estava na spec original)
- Sistema de convites com código
- Auto-aprovação opcional
- Comissão padrão

**Ação**: ✅ **Aproveitar** - adicionar à spec do Marketplace como bonus feature

---

#### 4. `ChatSale`
**Localização**: `apps/api/prisma/schema.prisma:1102`

```prisma
model ChatSale {
  id                 String        @id @default(uuid())
  storeId            BigInt
  buyer              String
  seller             String
  promoter           String?
  amount             Decimal       @db.Decimal(20, 8)
  commissionPercent  Int           @default(0)
  commissionAmount   Decimal       @default(0) @db.Decimal(20, 8)
  bazariFee          Decimal       @default(0) @db.Decimal(20, 8)
  sellerAmount       Decimal       @db.Decimal(20, 8)
  status             String        @default("pending") // pending, split, failed
  txHash             String?
  receiptNftCid      String?
  proposalId         String?
  proposal           ChatProposal? @relation(...)
  createdAt          BigInt
  settledAt          BigInt?

  @@index([storeId])
  @@index([buyer])
  @@index([seller])
  @@index([promoter])
  @@index([status])
}
```

**Status**: ✅ **100% compatível**
- Registro completo de vendas
- Split de valores (seller, afiliado, bazari)
- Recibo NFT (IPFS CID)
- Mock da blockchain (será substituído)

**Ação**: 🔧 **Renomear** de `ChatSale` para `AffiliateSale` (ou criar alias)
- Adicionar campo `marketplaceId` (opcional, para tracking)

---

### 🆕 PRECISA CRIAR (Marketplace do Afiliado)

#### 1. `AffiliateMarketplace` (NOVA)

```prisma
model AffiliateMarketplace {
  id                String   @id @default(uuid())
  ownerId           String   // profileId
  owner             Profile  @relation(...)

  // Branding
  name              String
  slug              String   @unique
  description       String?  @db.Text
  logoUrl           String?
  bannerUrl         String?
  theme             String   @default("bazari")
  primaryColor      String?
  secondaryColor    String?

  // Metadados IPFS
  metadataCid       String?

  // Estatísticas (cache)
  totalSales        Int      @default(0)
  totalRevenue      Decimal  @default(0) @db.Decimal(20, 8)
  totalCommission   Decimal  @default(0) @db.Decimal(20, 8)
  productCount      Int      @default(0)

  // Status
  isActive          Boolean  @default(true)
  isPublic          Boolean  @default(true)

  createdAt         BigInt
  updatedAt         BigInt

  products          AffiliateProduct[]
  sales             AffiliateSale[]

  @@index([ownerId])
  @@index([slug])
  @@index([isActive, isPublic])
}
```

**Status**: 🆕 **Nova tabela**
**Função**: Armazenar configuração da vitrine personalizada do afiliado

---

#### 2. `AffiliateProduct` (NOVA)

```prisma
model AffiliateProduct {
  id                String              @id @default(uuid())
  marketplaceId     String
  marketplace       AffiliateMarketplace @relation(...)

  // Produto original
  storeId           BigInt
  productId         String
  productName       String
  productImageUrl   String?
  productPrice      Decimal             @db.Decimal(20, 8)

  // Comissão
  commissionPercent Int

  // Customizações
  customDescription String?             @db.Text
  customImageUrl    String?
  featured          Boolean             @default(false)

  // Tracking
  viewCount         Int                 @default(0)
  clickCount        Int                 @default(0)

  addedAt           BigInt
  updatedAt         BigInt

  @@unique([marketplaceId, storeId, productId])
  @@index([marketplaceId])
  @@index([storeId])
}
```

**Status**: 🆕 **Nova tabela**
**Função**: Produtos adicionados à vitrine do afiliado

---

#### 3. `AffiliateSale` (RENOMEAR)

**Ação**: Renomear `ChatSale` → `AffiliateSale` e adicionar campo:

```prisma
model AffiliateSale {
  // ... todos os campos de ChatSale

  marketplaceId     String?                      // NOVO
  marketplace       AffiliateMarketplace?        // NOVO

  @@index([marketplaceId])  // NOVO
}
```

---

## ⚙️ Análise: Serviços Backend

### ✅ JÁ EXISTE

#### 1. `CommissionService`
**Localização**: `apps/api/src/chat/services/commission.ts`

**Funcionalidades implementadas**:
- ✅ `settleSale()` - Processar venda com split
- ✅ `settleSaleGroup()` - Múltiplas vendas em paralelo
- ✅ `mintReceipt()` - Gerar recibo NFT no IPFS
- ✅ `getSales()` - Listar vendas por perfil
- ✅ `getSale()` - Detalhes de uma venda
- ✅ Cache de store owners (otimização)
- ✅ Cálculo automático: comissão + taxa Bazari

**Exemplo de uso**:
```typescript
const result = await commissionService.settleSale({
  proposalId: 'proposal-123',
  storeId: 456,
  buyer: 'buyer-profile-id',
  seller: 'seller-profile-id',
  promoter: 'affiliate-profile-id',  // Afiliado!
  amount: '1000.00',
  commissionPercent: 10,
});

// Retorna:
// {
//   saleId: 'uuid',
//   amount: '1000.00',
//   commissionAmount: '100.00',  // 10%
//   bazariFee: '10.00',          // 1%
//   sellerAmount: '890.00',      // 89%
//   status: 'split',
//   txHash: '0x...',
//   receiptNftCid: 'Qm...'
// }
```

**Ação**: ✅ **Reutilizar 100%**
- Já faz TUDO que o Marketplace precisa
- Apenas adicionar tracking do `marketplaceId` no `settleSale()`

**Modificação sugerida**:
```typescript
// Adicionar parâmetro opcional
async settleSale(data: SaleData & { marketplaceId?: string }): Promise<SaleResult> {
  // ... código existente

  // Adicionar ao criar venda:
  const sale = await prisma.chatSale.create({
    data: {
      // ... campos existentes
      marketplaceId: data.marketplaceId, // NOVO
    },
  });
}
```

---

#### 2. `AffiliateStatsWorker`
**Localização**: `apps/api/src/workers/affiliate-stats.worker.ts`

**Funcionalidades**:
- ✅ Atualiza estatísticas de afiliados a cada hora
- ✅ Calcula `totalSales`, `totalCommission`, `salesCount`
- ✅ Usa apenas vendas com `status: 'split'`
- ✅ Graceful shutdown

**Ação**: 🔧 **Estender** para atualizar também `AffiliateMarketplace`

**Modificação sugerida**:
```typescript
// Adicionar após atualizar ChatStoreAffiliate:

// Atualizar estatísticas do marketplace
if (sale.marketplaceId) {
  await prisma.affiliateMarketplace.update({
    where: { id: sale.marketplaceId },
    data: {
      totalSales: { increment: 1 },
      totalRevenue: { increment: sale.amount },
      totalCommission: { increment: sale.commissionAmount },
      updatedAt: BigInt(Date.now()),
    },
  });
}
```

---

### 🆕 PRECISA CRIAR

#### 1. Rotas da API de Marketplace
**Arquivo**: `apps/api/src/routes/affiliates.ts` (NOVO)

**Endpoints**:
```typescript
// CRIAR marketplace
POST /api/affiliates/marketplaces
// OBTER marketplace público
GET /api/affiliates/marketplaces/:slug
// ATUALIZAR marketplace
PUT /api/affiliates/marketplaces/:id
// ADICIONAR produto
POST /api/affiliates/marketplaces/:id/products
// REMOVER produto
DELETE /api/affiliates/marketplaces/:id/products/:productId
// ANALYTICS
GET /api/affiliates/marketplaces/:id/analytics
// LISTAR produtos afiliáveis
GET /api/affiliates/products
```

**Nota**: Essas rotas são **novas**, mas usam os **serviços existentes** (CommissionService)

---

## 🎨 Análise: Frontend

### ✅ JÁ EXISTE (Componentes Reutilizáveis)

O projeto já tem componentes shadcn/ui que podem ser reutilizados:
- ✅ `Card`, `CardHeader`, `CardContent`
- ✅ `Dialog`, `DialogContent`
- ✅ `Button`, `Input`, `Label`
- ✅ `Tabs`, `TabsList`, `TabsContent`
- ✅ Sistema de temas (bazari, night, sandstone, etc)

### 🆕 PRECISA CRIAR

#### Páginas novas:
1. **`AffiliateMarketplacePage`** - Vitrine pública (/@slug)
2. **`AffiliateDashboardPage`** - Dashboard do afiliado
3. **`CreateMarketplaceDialog`** - Modal de criação

---

## 📦 Análise: Blockchain (BazariChain)

### ❌ NÃO EXISTE (Ainda)

**Observação**: O `CommissionService` atual é um **MOCK** que usa PostgreSQL.

Segundo o código:
```typescript
/**
 * Commission Service - VERSÃO MOCK
 *
 * Esta é uma versão MOCK que simula o comportamento da blockchain no PostgreSQL.
 * Será substituída por integração real com BazariChain posteriormente.
 */
```

**Então**:
- 🆕 Pallet `bazari-commerce` ainda precisa ser implementado
- 🆕 Integração real com blockchain será futura
- ✅ **Por enquanto, o MOCK funciona perfeitamente para MVP**

---

## 📋 Checklist Revisado - O que REALMENTE precisa fazer

### FASE 1: MVP Mínimo (2-3 semanas)

#### Backend (1 semana)

- [ ] **Migration Prisma**: Adicionar 2 tabelas novas
  ```bash
  # Adicionar no schema.prisma:
  # - AffiliateMarketplace
  # - AffiliateProduct
  #
  # Modificar:
  # - Renomear ChatSale → AffiliateSale
  # - Adicionar campo marketplaceId
  ```

- [ ] **Rotas da API**: Criar `routes/affiliates.ts`
  - POST /marketplaces (criar vitrine)
  - GET /marketplaces/:slug (página pública)
  - PUT /marketplaces/:id (atualizar)
  - POST /marketplaces/:id/products (adicionar produto)
  - DELETE /marketplaces/:id/products/:productId
  - GET /marketplaces/:id/analytics

- [ ] **Modificar `CommissionService`**:
  - Adicionar parâmetro opcional `marketplaceId` em `settleSale()`
  - 5 linhas de código

- [ ] **Modificar `AffiliateStatsWorker`**:
  - Adicionar update de estatísticas de `AffiliateMarketplace`
  - ~10 linhas de código

#### Frontend (1-2 semanas)

- [ ] **Página pública**: `pages/AffiliateMarketplacePage.tsx`
  - Header com branding
  - Grid de produtos
  - Rota `/@:slug`

- [ ] **Dashboard**: `pages/affiliate/AffiliateDashboardPage.tsx`
  - Estatísticas (vendas, receita, comissão)
  - Lista de produtos
  - Botões de ação

- [ ] **Modal**: `components/affiliates/CreateMarketplaceDialog.tsx`
  - Formulário (nome, slug, descrição, tema)
  - Validação

#### Testes (3 dias)

- [ ] Testar criação de marketplace
- [ ] Testar adição de produtos
- [ ] Testar venda com split (já funciona!)
- [ ] Testar estatísticas

---

## 🎯 Conclusão: Economia de Esforço

### Original estimado (sem BazChat):
- **Blockchain**: 4-6 semanas
- **Backend**: 3-4 semanas
- **Frontend**: 2-3 semanas
- **TOTAL**: **9-13 semanas**

### REAL (aproveitando BazChat):
- **Blockchain**: ✅ Skip (usar mock existente)
- **Backend**: ✅ 1 semana (apenas 2 tabelas + rotas)
- **Frontend**: ✅ 1-2 semanas (apenas páginas)
- **TOTAL**: **2-3 semanas** 🎉

### **Economia: 70-80% do tempo!**

---

## 🚀 Recomendação Final

### Estratégia Atualizada:

1. **Fase 1 (MVP) - 2-3 semanas**:
   - ✅ Usar `CommissionService` existente (MOCK)
   - 🆕 Adicionar 2 tabelas (Marketplace, Product)
   - 🆕 Criar rotas da API
   - 🆕 Criar páginas frontend
   - ✅ Sistema de afiliados já funciona!

2. **Fase 2 (Blockchain Real) - Futuro**:
   - Implementar pallet `bazari-commerce`
   - Substituir MOCK por integração real
   - Migrar dados existentes

### Por que essa abordagem?

- ✅ **MVP funcional em 2-3 semanas** (vs 9-13 sem BazChat)
- ✅ **Reutiliza 70% do código** já testado
- ✅ **Usuários podem usar agora** (com mock)
- ✅ **Blockchain pode vir depois** (sem bloquear MVP)

---

## 📝 Prompt Atualizado para Claude Code

```
📋 ÓTIMAS NOTÍCIAS: 70% do Marketplace do Afiliado JÁ ESTÁ PRONTO!

Leia a análise completa em:
/home/bazari/bazari/docs/APROVEITAMENTO_INFRAESTRUTURA_AFILIADOS.md

Resumo do que já existe (BazChat - Fase 8):
✅ CommissionService (split de pagamentos) - PRONTO
✅ AffiliateStatsWorker (estatísticas) - PRONTO
✅ ChatStoreAffiliate (aprovação de afiliados) - PRONTO
✅ StoreCommissionPolicy (políticas de comissão) - PRONTO
✅ ChatSale (registro de vendas) - PRONTO

O que REALMENTE precisa fazer:

1. BACKEND (1 semana):
   - Adicionar 2 tabelas novas: AffiliateMarketplace, AffiliateProduct
   - Renomear ChatSale → AffiliateSale (adicionar campo marketplaceId)
   - Criar rotas em src/routes/affiliates.ts (7 endpoints)
   - Modificar CommissionService (5 linhas) para aceitar marketplaceId
   - Estender AffiliateStatsWorker (10 linhas)

2. FRONTEND (1-2 semanas):
   - Criar AffiliateMarketplacePage (vitrine pública)
   - Criar AffiliateDashboardPage (dashboard)
   - Criar CreateMarketplaceDialog (modal)

3. BLOCKCHAIN:
   - SKIP! Usar CommissionService existente (já é MOCK de PostgreSQL)
   - Implementação real da chain fica para Fase 2 (futuro)

IMPORTANTE:
- NÃO implemente blockchain agora
- REUTILIZE CommissionService existente
- FOCO em frontend + 2 tabelas novas

Comece pela migration Prisma (adicionar 2 tabelas).
Use TodoWrite para rastrear.
```

---

**Economia estimada: 70-80% do tempo de desenvolvimento!** 🎉
