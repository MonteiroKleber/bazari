# 📋 Sistema de Afiliados - Especificação Técnica

## 🎯 Objetivo

Implementar um sistema completo de afiliados que permite aos donos de lojas aprovar promotores específicos, definir comissões customizadas por afiliado e gerenciar o programa de afiliação.

---

## 📊 Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────┐
│                    SISTEMA DE AFILIADOS                      │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   CADASTRO   │    │  APROVAÇÃO   │    │  PROMOÇÃO    │
│              │    │              │    │              │
│ • Solicitar  │───▶│ • Pending    │───▶│ • Approved   │
│ • Cancelar   │    │ • Aprovar    │    │ • Promover   │
│              │    │ • Rejeitar   │    │ • Ganhar $   │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## 🗄️ FASE 1: Schema do Banco de Dados

### **1.1 Tabela: ChatStoreAffiliate**

```prisma
model ChatStoreAffiliate {
  id                String   @id @default(uuid())
  storeId           BigInt   // ID on-chain da loja
  promoterId        String   // profileId do promotor
  promoter          Profile  @relation(fields: [promoterId], references: [id])

  // Status
  status            String   @default("pending") // pending | approved | rejected | suspended

  // Comissão customizada (opcional - override da política geral)
  customCommission  Int?     // Se null, usa a política da loja

  // Limites opcionais
  monthlySalesCap   Decimal? @db.Decimal(20, 8) // Limite mensal de vendas

  // Metadata
  notes             String?  @db.Text // Notas do dono da loja

  // Timestamps
  requestedAt       BigInt   // Quando solicitou
  approvedAt        BigInt?  // Quando foi aprovado
  rejectedAt        BigInt?  // Quando foi rejeitado
  suspendedAt       BigInt?  // Quando foi suspenso

  // Performance (calculado periodicamente)
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

### **1.2 Tabela: ChatAffiliateInvite (Opcional)**

```prisma
model ChatAffiliateInvite {
  id          String   @id @default(uuid())
  storeId     BigInt
  inviteCode  String   @unique // Código único de convite

  // Configurações do convite
  maxUses     Int?     // Número máximo de usos (null = ilimitado)
  usesCount   Int      @default(0)
  expiresAt   BigInt?  // Data de expiração

  // Auto-aprovação
  autoApprove Boolean  @default(false)

  // Comissão padrão para quem usar este convite
  defaultCommission Int @default(5)

  createdAt   BigInt

  @@index([storeId])
}
```

---

## 🔧 FASE 2: Backend API

### **2.1 Endpoints: Gerenciamento de Afiliados (Dono da Loja)**

#### **GET /api/chat/affiliates/store/:storeId**
Lista afiliados da loja (dono apenas)

**Query params:**
- `status?: 'pending' | 'approved' | 'rejected' | 'suspended'`
- `cursor?: string`
- `limit?: number`

**Response:**
```typescript
{
  affiliates: Array<{
    id: string
    promoterId: string
    promoterHandle: string
    promoterAvatar?: string
    status: string
    customCommission?: number
    totalSales: string
    totalCommission: string
    salesCount: number
    requestedAt: number
    approvedAt?: number
  }>
  nextCursor?: string
}
```

#### **POST /api/chat/affiliates/store/:storeId/approve**
Aprovar solicitação de afiliado

**Body:**
```typescript
{
  affiliateId: string
  customCommission?: number // Opcional: override da política
  monthlySalesCap?: string  // Opcional: limite mensal
  notes?: string
}
```

**Response:**
```typescript
{
  success: true
  affiliate: { id, status: 'approved', ... }
}
```

#### **POST /api/chat/affiliates/store/:storeId/reject**
Rejeitar solicitação de afiliado

**Body:**
```typescript
{
  affiliateId: string
  reason?: string
}
```

#### **POST /api/chat/affiliates/store/:storeId/suspend**
Suspender afiliado aprovado

**Body:**
```typescript
{
  affiliateId: string
  reason?: string
}
```

#### **PUT /api/chat/affiliates/store/:storeId/:affiliateId**
Atualizar configurações de afiliado

**Body:**
```typescript
{
  customCommission?: number
  monthlySalesCap?: string
  notes?: string
}
```

---

### **2.2 Endpoints: Afiliado (Promotor)**

#### **POST /api/chat/affiliates/request**
Solicitar para se tornar afiliado

**Body:**
```typescript
{
  storeId: number
  message?: string // Mensagem para o dono da loja
}
```

**Response:**
```typescript
{
  id: string
  status: 'pending'
  storeId: number
  requestedAt: number
}
```

#### **GET /api/chat/affiliates/me**
Listar minhas afiliações

**Query params:**
- `status?: 'pending' | 'approved' | 'rejected'`

**Response:**
```typescript
{
  affiliations: Array<{
    id: string
    storeId: number
    storeName: string
    storeSlug: string
    status: string
    customCommission?: number
    totalSales: string
    totalCommission: string
    salesCount: number
  }>
}
```

#### **DELETE /api/chat/affiliates/:affiliateId**
Cancelar solicitação ou desafiliar-se

---

### **2.3 Validação em Criar Proposta**

Atualizar `POST /api/chat/proposals` para validar afiliado:

```typescript
if (policy.mode === 'affiliates') {
  const affiliate = await prisma.chatStoreAffiliate.findUnique({
    where: {
      storeId_promoterId: {
        storeId: productStore.onChainStoreId,
        promoterId: sellerId,
      },
    },
  });

  if (!affiliate || affiliate.status !== 'approved') {
    return reply.code(403).send({
      error: 'You must be an approved affiliate to promote this store',
    });
  }

  // Usar comissão customizada se configurada
  if (affiliate.customCommission !== null) {
    finalCommissionPercent = affiliate.customCommission;
  } else {
    finalCommissionPercent = policy.percent;
  }

  // Validar limite mensal se configurado
  if (affiliate.monthlySalesCap) {
    const thisMonthSales = await getAffiliateMonthSales(affiliate.id);
    if (thisMonthSales + parseFloat(total) > parseFloat(affiliate.monthlySalesCap)) {
      return reply.code(403).send({
        error: 'Monthly sales cap reached',
      });
    }
  }
}
```

---

## 🎨 FASE 3: Frontend UI

### **3.1 Página: Gerenciar Afiliados (Dono da Loja)**

**Path:** `/app/seller/affiliates`

**Componentes:**
1. **AffiliateRequestsList** - Lista de solicitações pendentes
2. **ApprovedAffiliatesList** - Lista de afiliados aprovados
3. **AffiliateDetailsDialog** - Modal com detalhes e ações

**Layout:**
```tsx
<Tabs>
  <TabsList>
    <TabsTrigger value="pending">
      Pendentes ({pendingCount})
    </TabsTrigger>
    <TabsTrigger value="approved">
      Aprovados ({approvedCount})
    </TabsTrigger>
    <TabsTrigger value="rejected">
      Rejeitados
    </TabsTrigger>
  </TabsList>

  <TabsContent value="pending">
    {requests.map(req => (
      <AffiliateRequestCard
        request={req}
        onApprove={() => handleApprove(req.id)}
        onReject={() => handleReject(req.id)}
      />
    ))}
  </TabsContent>

  {/* Similar para outras tabs */}
</Tabs>
```

**Features:**
- ✅ Aprovar/Rejeitar solicitações
- ✅ Definir comissão customizada
- ✅ Ver estatísticas de vendas por afiliado
- ✅ Suspender afiliado
- ✅ Notas privadas sobre cada afiliado

---

### **3.2 Página: Minhas Afiliações (Promotor)**

**Path:** `/app/promoter/affiliates`

**Componentes:**
1. **StoreSearchDialog** - Buscar lojas para se afiliar
2. **MyAffiliationsList** - Minhas afiliações ativas
3. **PendingRequestsList** - Solicitações pendentes

**Layout:**
```tsx
<div className="space-y-6">
  <Card>
    <CardHeader>
      <CardTitle>Solicitar Afiliação</CardTitle>
    </CardHeader>
    <CardContent>
      <Button onClick={() => setSearchOpen(true)}>
        + Buscar Lojas
      </Button>
    </CardContent>
  </Card>

  <Tabs defaultValue="active">
    <TabsList>
      <TabsTrigger value="active">Ativas</TabsTrigger>
      <TabsTrigger value="pending">Pendentes</TabsTrigger>
    </TabsList>

    <TabsContent value="active">
      {affiliations.map(aff => (
        <AffiliationCard
          affiliation={aff}
          onViewStore={() => navigate(`/loja/${aff.storeSlug}`)}
        />
      ))}
    </TabsContent>
  </Tabs>
</div>
```

**Features:**
- ✅ Buscar e solicitar afiliação a lojas
- ✅ Ver status das solicitações
- ✅ Ver comissão e estatísticas
- ✅ Cancelar solicitação
- ✅ Desafiliar-se

---

### **3.3 Integração com CreateProposalDialog**

Atualizar para mostrar status de afiliado:

```tsx
// Se modo = 'affiliates'
{storeInfo.mode === 'affiliates' && (
  <AffiliateStatusBanner
    storeId={lockedStoreId}
    onRequest={() => handleRequestAffiliation()}
  />
)}
```

**Possíveis estados:**
1. **Não é afiliado** → Botão "Solicitar Afiliação"
2. **Solicitação pendente** → Badge "Aguardando aprovação"
3. **Aprovado** → Badge verde "Afiliado Aprovado - Comissão X%"
4. **Rejeitado** → Badge vermelho "Solicitação rejeitada"

---

## 🔄 FASE 4: Worker de Estatísticas

### **4.1 Worker: Atualizar Performance de Afiliados**

**Arquivo:** `apps/api/src/workers/affiliate-stats.worker.ts`

**Função:** Atualizar estatísticas de vendas periodicamente

```typescript
async function updateAffiliateStats() {
  // Para cada afiliado aprovado
  const affiliates = await prisma.chatStoreAffiliate.findMany({
    where: { status: 'approved' },
  });

  for (const affiliate of affiliates) {
    // Buscar vendas deste afiliado
    const sales = await prisma.chatSale.findMany({
      where: {
        storeId: affiliate.storeId,
        promoter: affiliate.promoterId,
        status: 'split',
      },
    });

    // Calcular totais
    const totalSales = sales.reduce((sum, s) => sum + parseFloat(s.amount), 0);
    const totalCommission = sales.reduce((sum, s) => sum + parseFloat(s.commissionAmount), 0);

    // Atualizar
    await prisma.chatStoreAffiliate.update({
      where: { id: affiliate.id },
      data: {
        totalSales,
        totalCommission,
        salesCount: sales.length,
        updatedAt: Date.now(),
      },
    });
  }
}

// Executar a cada hora
setInterval(updateAffiliateStats, 60 * 60 * 1000);
```

---

## 🧪 FASE 5: Testes

### **5.1 Casos de Teste**

1. **Solicitar Afiliação**
   - ✅ Promotor solicita afiliação a uma loja
   - ✅ Não pode solicitar duas vezes para a mesma loja
   - ✅ Dono da loja recebe notificação

2. **Aprovar Afiliado**
   - ✅ Dono aprova com comissão customizada
   - ✅ Dono aprova com limite mensal
   - ✅ Afiliado pode criar propostas

3. **Rejeitar Afiliado**
   - ✅ Dono rejeita solicitação
   - ✅ Afiliado não pode promover
   - ✅ Pode solicitar novamente após 30 dias

4. **Criar Proposta (Afiliado)**
   - ✅ Afiliado aprovado pode criar proposta
   - ✅ Usa comissão customizada se configurada
   - ✅ Respeita limite mensal

5. **Suspender Afiliado**
   - ✅ Dono suspende afiliado
   - ✅ Afiliado não pode mais criar propostas
   - ✅ Pode ser reativado

---

## 📝 Notas de Implementação

### **Ordem de Implementação:**
1. ✅ Schema (migração Prisma)
2. ✅ Backend API (endpoints)
3. ✅ Frontend UI (páginas e componentes)
4. ✅ Integração com fluxo de propostas
5. ✅ Worker de estatísticas
6. ✅ Testes

### **Dependências:**
- Sistema de notificações (para alertar aprovação/rejeição)
- Sistema de follows (já existe)
- Sistema de reputação (já existe)

### **Melhorias Futuras:**
- Sistema de convites por link
- Programa de tiers (bronze, prata, ouro)
- Comissão progressiva baseada em performance
- Dashboard de analytics para afiliados
