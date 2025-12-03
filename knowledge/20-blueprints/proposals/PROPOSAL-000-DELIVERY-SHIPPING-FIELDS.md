# PROPOSAL-000: Delivery & Shipping Fields Infrastructure

**Status**: PROPOSTA
**Prioridade**: ALTA
**Autor**: Sistema
**Data**: 2025-11-28
**Versão**: 1.0

---

## 1. RESUMO EXECUTIVO

### Contexto

Esta proposta documenta os **pré-requisitos de infraestrutura** necessários para implementar a [PROPOSAL-001: Delivery-Aware Escrow](./PROPOSAL-001-DELIVERY-AWARE-ESCROW.md).

### Problema Identificado

A implementação atual **não possui** os campos necessários para calcular o prazo de auto-release baseado no prazo de entrega:

| Campo Necessário | Status Atual | Impacto |
|------------------|--------------|---------|
| `estimatedDeliveryDays` (Product) | **NÃO EXISTE** | Impossível calcular prazo dinâmico |
| `shippingMethod` (Product/Order) | **NÃO EXISTE** | Impossível validar prazo mínimo por método |
| `shippedAt` (Order) | **NÃO EXISTE** | Impossível recalcular prazo após envio |
| Endpoint `POST /orders/:id/ship` | **NÃO EXISTE** | Fluxo de status incompleto |

### Objetivo

Implementar a infraestrutura de campos e endpoints para suportar:
1. Vendedor informar prazo de entrega estimado por produto
2. Vendedor informar método de envio
3. Vendedor marcar pedido como enviado (SHIPPED)
4. Sistema rastrear data de envio para cálculos futuros

---

## 2. ANÁLISE DE GAPS

### 2.1 Gap: `estimatedDeliveryDays` em Product

**Situação Atual:**
- Model `Product` não possui campo de prazo de entrega
- Vendedor não tem como informar tempo estimado de entrega

**Documentação:**
- `knowledge/10-modules/delivery/vision.md` - Não menciona prazo no produto
- `knowledge/20-blueprints/module-blueprints/delivery.json` - Não define este campo

**Impacto:**
- PROPOSAL-001 não pode calcular `auto_release_days` sem este input
- Atualmente usa 7 dias fixo para todos os produtos

---

### 2.2 Gap: `shippingMethod` em Product/Order

**Situação Atual:**
- Model `Product` não possui campo de método de envio
- Model `Order` possui `shippingOptionId` mas não está vinculado a nenhum model `ShippingOption`
- `DeliveryRequest` possui `packageType` (envelope, small_box, etc.) mas não `shippingMethod` (SEDEX, PAC, etc.)

**Impacto:**
- Impossível aplicar prazo mínimo por método (PAC >= 10 dias, SEDEX >= 3 dias)
- Validação de prazo realista não funciona

---

### 2.3 Gap: `shippedAt` em Order

**Situação Atual:**
- Model `Order` não possui campo `shippedAt`
- Não há registro de quando o vendedor despachou o pedido

**Impacto:**
- Evolução futura (recalcular prazo a partir do envio) não é possível
- Métricas de tempo de despacho não podem ser calculadas

---

### 2.4 Gap: Endpoint `POST /orders/:id/ship`

**Situação Atual:**
- Enum `OrderStatus` inclui `SHIPPED`
- **NÃO existe endpoint** para mudar status para SHIPPED
- Código permite release direto de `ESCROWED` sem passar por `SHIPPED`

**Endpoints existentes em `/orders`:**
```
POST /orders                    - Criar pedido
POST /orders/:id/payment-intent - Criar intent de pagamento
POST /orders/:id/confirm-received - Confirmar recebimento
POST /orders/:id/release        - Liberar escrow
POST /orders/:id/confirm-release - Confirmar liberação
POST /orders/:id/cancel         - Cancelar pedido
```

**Faltando:**
```
POST /orders/:id/ship           - Marcar como enviado ← NÃO EXISTE
```

---

## 3. SOLUÇÃO PROPOSTA

### 3.1 Novos Campos no Schema

#### 3.1.1 Product - Campos de Shipping

```prisma
model Product {
  // ... campos existentes ...

  // === NOVOS: Shipping & Delivery ===
  estimatedDeliveryDays  Int?     @default(7)  // Prazo estimado em dias úteis
  shippingMethod         String?  // SEDEX | PAC | TRANSPORTADORA | MINI_ENVIOS | RETIRADA | INTERNACIONAL | OUTRO
  weight                 Float?   @db.Real     // Peso em kg (para cálculo de frete)
  dimensions             Json?    // { length, width, height } em cm

  @@index([shippingMethod])
}
```

#### 3.1.2 Order - Campos de Shipping

```prisma
model Order {
  // ... campos existentes ...

  // === NOVOS: Shipping & Delivery ===
  estimatedDeliveryDays  Int?      @default(7)  // Calculado do produto ou informado
  shippingMethod         String?   // Método de envio selecionado
  shippedAt              DateTime? // Quando foi marcado como enviado
  trackingCode           String?   // Código de rastreamento (opcional)

  @@index([shippedAt])
}
```

#### 3.1.3 Tipo ShippingMethod

```typescript
// apps/api/src/types/shipping.types.ts

export type ShippingMethod =
  | 'SEDEX'
  | 'PAC'
  | 'TRANSPORTADORA'
  | 'MINI_ENVIOS'
  | 'RETIRADA'
  | 'INTERNACIONAL'
  | 'OUTRO';

export const SHIPPING_METHODS: ShippingMethod[] = [
  'SEDEX',
  'PAC',
  'TRANSPORTADORA',
  'MINI_ENVIOS',
  'RETIRADA',
  'INTERNACIONAL',
  'OUTRO',
];

export const SHIPPING_METHOD_LABELS: Record<ShippingMethod, string> = {
  SEDEX: 'SEDEX (Correios)',
  PAC: 'PAC (Correios)',
  TRANSPORTADORA: 'Transportadora',
  MINI_ENVIOS: 'Mini Envios (Correios)',
  RETIRADA: 'Retirada em Loja',
  INTERNACIONAL: 'Internacional',
  OUTRO: 'Outro',
};
```

---

### 3.2 Novo Endpoint: `POST /orders/:id/ship`

```typescript
// apps/api/src/routes/orders.ts

/**
 * POST /api/orders/:id/ship
 * Vendedor marca pedido como enviado
 */
app.post('/orders/:id/ship', { preHandler: authOnRequest }, async (request, reply) => {
  const { id: orderId } = request.params as { id: string };
  const authUser = (request as any).authUser as { sub: string; address: string };

  const bodySchema = z.object({
    trackingCode: z.string().optional(),
  });

  const body = bodySchema.parse(request.body);

  // 1. Buscar order
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { listing: true } }
    },
  });

  if (!order) {
    return reply.status(404).send({ error: 'Order not found' });
  }

  // 2. Verificar se usuário é o vendedor
  // NOTA: walletAddress está em User.address, não em Profile
  const user = await prisma.user.findUnique({
    where: { id: authUser.sub },
    select: { id: true, address: true },
  });

  const isSeller = order.sellerAddr === user?.address;
  if (!isSeller) {
    return reply.status(403).send({
      error: 'Unauthorized',
      message: 'Apenas o vendedor pode marcar o pedido como enviado',
    });
  }

  // 3. Verificar se order pode ser enviada (deve estar ESCROWED)
  if (order.status !== 'ESCROWED') {
    return reply.status(400).send({
      error: 'Order não pode ser marcada como enviada',
      message: `Order com status ${order.status} não pode ser enviada. Status permitido: ESCROWED`,
      currentStatus: order.status,
    });
  }

  // 4. Atualizar order
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'SHIPPED',
      shippedAt: new Date(),
      trackingCode: body.trackingCode || null,
    },
  });

  // 5. Criar log
  await prisma.escrowLog.create({
    data: {
      orderId,
      kind: 'SHIPPED',
      payloadJson: {
        shippedAt: updatedOrder.shippedAt?.toISOString(),
        trackingCode: body.trackingCode || null,
        shippedBy: user?.id,
        timestamp: new Date().toISOString(),
      },
    },
  });

  // 6. TODO: Notificar comprador
  // await notificationService.notify(order.buyerAddr, 'ORDER_SHIPPED', { orderId, trackingCode });

  return reply.send({
    success: true,
    order: {
      id: updatedOrder.id,
      status: updatedOrder.status,
      shippedAt: updatedOrder.shippedAt,
      trackingCode: updatedOrder.trackingCode,
    },
  });
});
```

---

### 3.3 Atualização do Fluxo de Criação de Produto

```typescript
// apps/api/src/routes/products.ts (ou me.products.ts)

const createProductSchema = z.object({
  // ... campos existentes ...

  // NOVOS campos de shipping
  estimatedDeliveryDays: z.number().int().min(1).max(60).optional().default(7),
  shippingMethod: z.enum([
    'SEDEX', 'PAC', 'TRANSPORTADORA', 'MINI_ENVIOS',
    'RETIRADA', 'INTERNACIONAL', 'OUTRO'
  ]).optional(),
  weight: z.number().positive().optional(),
  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
});
```

---

### 3.4 Atualização do Fluxo de Criação de Order

```typescript
// apps/api/src/routes/orders.ts - POST /orders

// Ao criar order, copiar dados de shipping do produto
const maxDeliveryDays = Math.max(
  ...orderItems.map(item => item.product?.estimatedDeliveryDays || 7)
);

// Determinar método de envio (pode ser selecionado pelo comprador ou inferido)
const shippingMethod = body.shippingMethod
  || orderItems[0]?.product?.shippingMethod
  || 'OUTRO';

const order = await prisma.order.create({
  data: {
    // ... campos existentes ...
    estimatedDeliveryDays: maxDeliveryDays,
    shippingMethod: shippingMethod,
  },
});
```

---

## 4. MIGRATION

### 4.1 Script de Migration

```sql
-- Migration: add_shipping_fields
-- Adiciona campos de shipping em Product e Order

-- Product
ALTER TABLE "Product" ADD COLUMN "estimatedDeliveryDays" INTEGER DEFAULT 7;
ALTER TABLE "Product" ADD COLUMN "shippingMethod" TEXT;
ALTER TABLE "Product" ADD COLUMN "weight" REAL;
ALTER TABLE "Product" ADD COLUMN "dimensions" JSONB;

CREATE INDEX "Product_shippingMethod_idx" ON "Product"("shippingMethod");

-- Order
ALTER TABLE "Order" ADD COLUMN "estimatedDeliveryDays" INTEGER DEFAULT 7;
ALTER TABLE "Order" ADD COLUMN "shippingMethod" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "trackingCode" TEXT;

CREATE INDEX "Order_shippedAt_idx" ON "Order"("shippedAt");

-- Atualizar orders existentes com default
UPDATE "Order" SET "estimatedDeliveryDays" = 7 WHERE "estimatedDeliveryDays" IS NULL;
```

### 4.2 Prisma Migration

```bash
# Gerar migration
npx prisma migrate dev --name add_shipping_fields

# Aplicar em produção
npx prisma migrate deploy
```

---

## 5. FRONTEND

### 5.1 Formulário de Produto - Novos Campos

```tsx
// apps/web/src/modules/products/components/ProductForm.tsx

<FormField
  control={form.control}
  name="estimatedDeliveryDays"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Prazo de Entrega Estimado (dias)</FormLabel>
      <FormControl>
        <Input
          type="number"
          min={1}
          max={60}
          {...field}
          onChange={(e) => field.onChange(parseInt(e.target.value))}
        />
      </FormControl>
      <FormDescription>
        Prazo estimado para entrega após o envio
      </FormDescription>
    </FormItem>
  )}
/>

<FormField
  control={form.control}
  name="shippingMethod"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Método de Envio</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o método de envio" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="SEDEX">SEDEX (Correios)</SelectItem>
          <SelectItem value="PAC">PAC (Correios)</SelectItem>
          <SelectItem value="TRANSPORTADORA">Transportadora</SelectItem>
          <SelectItem value="MINI_ENVIOS">Mini Envios (Correios)</SelectItem>
          <SelectItem value="RETIRADA">Retirada em Loja</SelectItem>
          <SelectItem value="INTERNACIONAL">Internacional</SelectItem>
          <SelectItem value="OUTRO">Outro</SelectItem>
        </SelectContent>
      </Select>
    </FormItem>
  )}
/>
```

### 5.2 Página de Order - Botão "Marcar como Enviado"

```tsx
// apps/web/src/pages/OrderPage.tsx

{order.status === 'ESCROWED' && isSeller && (
  <Card>
    <CardHeader>
      <CardTitle>Enviar Pedido</CardTitle>
    </CardHeader>
    <CardContent>
      <form onSubmit={handleShipOrder}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="trackingCode">Código de Rastreamento (opcional)</Label>
            <Input
              id="trackingCode"
              placeholder="Ex: BR123456789BR"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={isShipping}>
            {isShipping ? 'Enviando...' : 'Marcar como Enviado'}
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
)}
```

### 5.3 API Client - Nova Função

```typescript
// apps/web/src/modules/orders/api.ts

export const ordersApi = {
  // ... funções existentes ...

  /**
   * Marcar pedido como enviado
   */
  shipOrder: (orderId: string, trackingCode?: string) =>
    postJSON<{ success: boolean; order: Order }>(
      `/orders/${orderId}/ship`,
      { trackingCode },
      undefined,
      { timeout: 30000 }
    ),
};
```

---

## 6. TESTES

### 6.1 Testes de Backend

```typescript
// apps/api/src/routes/__tests__/orders.ship.test.ts

describe('POST /orders/:id/ship', () => {
  it('should mark order as shipped when seller', async () => {
    const order = await createEscrowedOrder();
    const response = await request(app)
      .post(`/orders/${order.id}/ship`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ trackingCode: 'BR123456789BR' });

    expect(response.status).toBe(200);
    expect(response.body.order.status).toBe('SHIPPED');
    expect(response.body.order.shippedAt).toBeDefined();
    expect(response.body.order.trackingCode).toBe('BR123456789BR');
  });

  it('should reject when not seller', async () => {
    const order = await createEscrowedOrder();
    const response = await request(app)
      .post(`/orders/${order.id}/ship`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({});

    expect(response.status).toBe(403);
  });

  it('should reject when order not ESCROWED', async () => {
    const order = await createPendingOrder();
    const response = await request(app)
      .post(`/orders/${order.id}/ship`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({});

    expect(response.status).toBe(400);
  });
});
```

---

## 7. CRONOGRAMA

| Fase | Atividade | Duração |
|------|-----------|---------|
| 1 | Schema migration (Product + Order) | 0.5 dia |
| 2 | Backend - Endpoint `/orders/:id/ship` | 0.5 dia |
| 3 | Backend - Atualizar criação de Product/Order | 0.5 dia |
| 4 | Frontend - Formulário de Produto | 0.5 dia |
| 5 | Frontend - Botão "Marcar como Enviado" | 0.5 dia |
| 6 | Testes | 0.5 dia |
| **Total** | | **3 dias** |

---

## 8. DEPENDÊNCIAS

### 8.1 Dependência para PROPOSAL-001

Após implementar esta proposta, a PROPOSAL-001 poderá:

1. Usar `Product.estimatedDeliveryDays` como input para cálculo
2. Usar `Product.shippingMethod` para validar prazo mínimo
3. Usar `Order.shippedAt` para recalcular prazo (evolução futura)

### 8.2 Sequência de Implementação

```
PROPOSAL-000 (esta) → PROPOSAL-001 (Delivery-Aware Escrow)
       ↓                        ↓
   Campos base              Cálculo dinâmico
   Endpoint /ship           EscrowCalculator
```

---

## 9. RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Vendedores não preenchem prazo | Alta | Baixo | Default de 7 dias |
| Migration em produção | Baixa | Médio | Campos opcionais com default |
| Incompatibilidade frontend | Baixa | Baixo | Campos não obrigatórios inicialmente |

---

## 10. APROVAÇÃO

| Papel | Nome | Data | Status |
|-------|------|------|--------|
| Product Owner | | | Pendente |
| Tech Lead | | | Pendente |

---

## 11. REFERÊNCIAS

- [PROPOSAL-001: Delivery-Aware Escrow](./PROPOSAL-001-DELIVERY-AWARE-ESCROW.md) - Proposta dependente
- [10-modules/delivery/vision.md](../../10-modules/delivery/vision.md) - Documentação do módulo de delivery
- [10-modules/orders/vision.md](../../10-modules/orders/vision.md) - Documentação do módulo de orders

---

## 12. EXPERIÊNCIA DO USUÁRIO (UX)

### 12.1 Mapeamento de Telas Existentes

As seguintes telas precisam ser atualizadas para suportar os novos campos:

| Tela | Arquivo | Tipo de Mudança |
|------|---------|-----------------|
| **Nova Listagem (Produto)** | [NewListingPage.tsx](../../../apps/web/src/pages/NewListingPage.tsx) | Adicionar campos `estimatedDeliveryDays` + `shippingMethod` no Step 3 |
| **Checkout** | [CheckoutPage.tsx](../../../apps/web/src/modules/orders/pages/CheckoutPage.tsx) | Exibir prazo estimado de entrega baseado no produto |
| **Detalhe do Pedido (Comprador)** | [OrderPage.tsx](../../../apps/web/src/pages/OrderPage.tsx) | Mostrar status SHIPPED + código de rastreamento |
| **Detalhe do Pedido (Vendedor)** | [OrderPage.tsx](../../../apps/web/src/pages/OrderPage.tsx) | Botão "Marcar como Enviado" + campo de tracking |
| **Lista de Vendas** | [SellerOrdersPage.tsx](../../../apps/web/src/pages/SellerOrdersPage.tsx) | Badge para status SHIPPED + indicador de ação pendente |
| **Página de Pagamento** | [OrderPayPage.tsx](../../../apps/web/src/modules/orders/pages/OrderPayPage.tsx) | Exibir prazo estimado de entrega |

---

### 12.2 Fluxo do Vendedor - Cadastro de Produto

#### 12.2.1 Tela: NewListingPage (Step 3 - Informações Básicas)

**Localização:** `apps/web/src/pages/NewListingPage.tsx` - Linha ~458

**Mudanças necessárias:**

```
┌──────────────────────────────────────────────────────────────────┐
│  STEP 3 - INFORMAÇÕES BÁSICAS                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Loja: [Dropdown existente]                                     │
│                                                                  │
│  Título: [__________________________]                           │
│                                                                  │
│  Descrição: [__________________________]                        │
│             [__________________________]                        │
│                                                                  │
│  Preço (BZR): [__________]                                      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📦 INFORMAÇÕES DE ENVIO (NOVO)                          │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                         │   │
│  │  Método de Envio:                                       │   │
│  │  [▼ Selecione o método de envio          ]             │   │
│  │    • SEDEX (Correios)                                   │   │
│  │    • PAC (Correios)                                     │   │
│  │    • Transportadora                                     │   │
│  │    • Mini Envios (Correios)                             │   │
│  │    • Retirada em Loja                                   │   │
│  │    • Internacional                                      │   │
│  │    • Outro                                              │   │
│  │                                                         │   │
│  │  Prazo de Entrega Estimado:                             │   │
│  │  [  7  ] dias úteis após o envio                        │   │
│  │  ⓘ Prazo mínimo para PAC: 10 dias                       │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  📷 Fotos/Vídeos: [Área de upload existente]                    │
│                                                                  │
│  [← Voltar]                              [Continuar →]          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Estados de Feedback:**
- 🔄 Loading: Spinner durante validação do prazo mínimo
- ✅ Sucesso: Borda verde no campo com ícone de check
- ❌ Erro: Borda vermelha + mensagem "Prazo mínimo para [MÉTODO] é X dias"
- ⚠️ Aviso: Tooltip "Prazo menor pode não ser realista para este método"

---

### 12.3 Fluxo do Vendedor - Marcar Pedido como Enviado

#### 12.3.1 Tela: OrderPage (Visão do Vendedor)

**Localização:** `apps/web/src/pages/OrderPage.tsx`

**Condição de exibição:** `order.status === 'ESCROWED' && isSeller`

```
┌──────────────────────────────────────────────────────────────────┐
│  📦 ENVIAR PEDIDO                                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Este pedido está pronto para ser enviado.                       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Código de Rastreamento (opcional)                       │    │
│  │ [____________________________] [📋 Colar]               │    │
│  │ Ex: BR123456789BR                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ⓘ Ao marcar como enviado:                                      │
│    • O comprador será notificado                                 │
│    • O prazo de liberação automática começará a contar           │
│    • Você não poderá cancelar o pedido                           │
│                                                                  │
│  [        🚚 Marcar como Enviado        ]                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Estados de Feedback:**
- 🔄 Enviando: Botão desabilitado com spinner "Marcando como enviado..."
- ✅ Sucesso: Toast verde "Pedido marcado como enviado!" + Atualiza status na tela
- ❌ Erro: Toast vermelho com mensagem do backend

---

### 12.4 Fluxo do Comprador - Visualização do Status

#### 12.4.1 Tela: OrderPage (Visão do Comprador)

**Localização:** `apps/web/src/pages/OrderPage.tsx`

**Quando order.status === 'SHIPPED':**

```
┌──────────────────────────────────────────────────────────────────┐
│  INFORMAÇÕES DO PEDIDO                                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Status:  [🚚 ENVIADO]  ← Badge azul/verde                       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 📦 RASTREAMENTO                                          │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │                                                         │    │
│  │  Código: BR123456789BR  [📋 Copiar]                     │    │
│  │                                                         │    │
│  │  Enviado em: 28/11/2025 às 14:35                        │    │
│  │                                                         │    │
│  │  [🔗 Rastrear nos Correios]  ← Link externo             │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ⏰ LIBERAÇÃO AUTOMÁTICA                                  │    │
│  │                                                         │    │
│  │  Os fundos serão liberados automaticamente em:          │    │
│  │  [████████████░░░░] 5 dias (05/12/2025)                 │    │
│  │                                                         │    │
│  │  Se você receber o produto antes, confirme a entrega    │    │
│  │  para liberar os fundos ao vendedor.                    │    │
│  │                                                         │    │
│  │  [✅ Confirmar Recebimento]                             │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

### 12.5 Fluxo do Checkout

#### 12.5.1 Tela: CheckoutPage

**Localização:** `apps/web/src/modules/orders/pages/CheckoutPage.tsx`

**Adicionar no resumo do pedido:**

```
┌──────────────────────────────────────────────────────────────────┐
│  RESUMO DO PEDIDO                                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  iPhone 15 Pro Max (1x)                          150.00 BZR     │
│  Capa Protetora (2x)                              10.00 BZR     │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Subtotal:                                       160.00 BZR     │
│  Frete:                                           10.00 BZR     │
│  Total:                                          170.00 BZR     │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  📦 Prazo de Entrega Estimado: 7-10 dias úteis  ← NOVO          │
│  🚚 Método de Envio: SEDEX (Correios)           ← NOVO          │
│                                                                  │
│  ⓘ O valor será cobrado em BZR no momento do pagamento.        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

### 12.6 Internacionalização (i18n)

#### 12.6.1 Novas Chaves para pt.json

```json
{
  "shipping": {
    "estimatedDeliveryDays": "Prazo de Entrega Estimado",
    "estimatedDeliveryDaysPlaceholder": "Ex: 7",
    "estimatedDeliveryDaysHelp": "Prazo em dias úteis após o envio do produto",
    "estimatedDeliveryDaysMin": "Prazo mínimo para {{method}}: {{days}} dias",

    "method": "Método de Envio",
    "methodPlaceholder": "Selecione o método de envio",
    "methods": {
      "SEDEX": "SEDEX (Correios)",
      "PAC": "PAC (Correios)",
      "TRANSPORTADORA": "Transportadora",
      "MINI_ENVIOS": "Mini Envios (Correios)",
      "RETIRADA": "Retirada em Loja",
      "INTERNACIONAL": "Internacional",
      "OUTRO": "Outro"
    },

    "trackingCode": "Código de Rastreamento",
    "trackingCodePlaceholder": "Ex: BR123456789BR",
    "trackingCodeOptional": "Código de Rastreamento (opcional)",
    "trackTrack": "Rastrear nos Correios",

    "markAsShipped": "Marcar como Enviado",
    "markingAsShipped": "Marcando como enviado...",
    "shippedSuccess": "Pedido marcado como enviado!",
    "shippedAt": "Enviado em",

    "shippedInfo": {
      "title": "Ao marcar como enviado:",
      "buyerNotified": "O comprador será notificado",
      "timerStarts": "O prazo de liberação automática começará a contar",
      "noCancel": "Você não poderá cancelar o pedido"
    },

    "autoRelease": {
      "title": "Liberação Automática",
      "description": "Os fundos serão liberados automaticamente em:",
      "daysRemaining": "{{days}} dias ({{date}})",
      "confirmEarly": "Se você receber o produto antes, confirme a entrega para liberar os fundos ao vendedor."
    },

    "checkout": {
      "estimatedDelivery": "Prazo de Entrega Estimado",
      "deliveryRange": "{{min}}-{{max}} dias úteis"
    }
  }
}
```

#### 12.6.2 Novas Chaves para en.json

```json
{
  "shipping": {
    "estimatedDeliveryDays": "Estimated Delivery Time",
    "estimatedDeliveryDaysPlaceholder": "E.g.: 7",
    "estimatedDeliveryDaysHelp": "Business days after shipping",
    "estimatedDeliveryDaysMin": "Minimum time for {{method}}: {{days}} days",

    "method": "Shipping Method",
    "methodPlaceholder": "Select shipping method",
    "methods": {
      "SEDEX": "SEDEX (Express)",
      "PAC": "PAC (Standard)",
      "TRANSPORTADORA": "Carrier",
      "MINI_ENVIOS": "Mini Envios",
      "RETIRADA": "Store Pickup",
      "INTERNACIONAL": "International",
      "OUTRO": "Other"
    },

    "trackingCode": "Tracking Code",
    "trackingCodePlaceholder": "E.g.: BR123456789BR",
    "trackingCodeOptional": "Tracking Code (optional)",
    "trackTrack": "Track Shipment",

    "markAsShipped": "Mark as Shipped",
    "markingAsShipped": "Marking as shipped...",
    "shippedSuccess": "Order marked as shipped!",
    "shippedAt": "Shipped at",

    "shippedInfo": {
      "title": "When marked as shipped:",
      "buyerNotified": "The buyer will be notified",
      "timerStarts": "The auto-release timer will start",
      "noCancel": "You won't be able to cancel the order"
    },

    "autoRelease": {
      "title": "Auto-Release",
      "description": "Funds will be automatically released in:",
      "daysRemaining": "{{days}} days ({{date}})",
      "confirmEarly": "If you receive the product early, confirm delivery to release funds to the seller."
    },

    "checkout": {
      "estimatedDelivery": "Estimated Delivery",
      "deliveryRange": "{{min}}-{{max}} business days"
    }
  }
}
```

#### 12.6.3 Novas Chaves para es.json

```json
{
  "shipping": {
    "estimatedDeliveryDays": "Plazo de Entrega Estimado",
    "estimatedDeliveryDaysPlaceholder": "Ej: 7",
    "estimatedDeliveryDaysHelp": "Días hábiles después del envío",
    "estimatedDeliveryDaysMin": "Plazo mínimo para {{method}}: {{days}} días",

    "method": "Método de Envío",
    "methodPlaceholder": "Seleccione el método de envío",
    "methods": {
      "SEDEX": "SEDEX (Express)",
      "PAC": "PAC (Estándar)",
      "TRANSPORTADORA": "Transportadora",
      "MINI_ENVIOS": "Mini Envíos",
      "RETIRADA": "Retiro en Tienda",
      "INTERNACIONAL": "Internacional",
      "OUTRO": "Otro"
    },

    "trackingCode": "Código de Rastreo",
    "trackingCodePlaceholder": "Ej: BR123456789BR",
    "trackingCodeOptional": "Código de Rastreo (opcional)",
    "trackTrack": "Rastrear Envío",

    "markAsShipped": "Marcar como Enviado",
    "markingAsShipped": "Marcando como enviado...",
    "shippedSuccess": "¡Pedido marcado como enviado!",
    "shippedAt": "Enviado el",

    "shippedInfo": {
      "title": "Al marcar como enviado:",
      "buyerNotified": "El comprador será notificado",
      "timerStarts": "El temporizador de liberación automática comenzará",
      "noCancel": "No podrás cancelar el pedido"
    },

    "autoRelease": {
      "title": "Liberación Automática",
      "description": "Los fondos se liberarán automáticamente en:",
      "daysRemaining": "{{days}} días ({{date}})",
      "confirmEarly": "Si recibes el producto antes, confirma la entrega para liberar los fondos al vendedor."
    },

    "checkout": {
      "estimatedDelivery": "Plazo de Entrega Estimado",
      "deliveryRange": "{{min}}-{{max}} días hábiles"
    }
  }
}
```

---

### 12.7 Estados de Componentes

#### 12.7.1 Botão "Marcar como Enviado"

| Estado | Visual | Ação |
|--------|--------|------|
| **Disponível** | Botão primário habilitado | Clique abre modal ou executa |
| **Carregando** | Spinner + texto "Marcando..." + desabilitado | Aguarda resposta da API |
| **Sucesso** | Toast verde + Badge atualiza para SHIPPED | Fecha modal se houver |
| **Erro** | Toast vermelho com mensagem | Botão volta a ficar habilitado |

#### 12.7.2 Campo de Prazo de Entrega

| Estado | Visual | Ação |
|--------|--------|------|
| **Vazio** | Placeholder "Ex: 7" | Foco permite digitação |
| **Válido** | Borda normal + valor exibido | Permite continuar |
| **Abaixo do mínimo** | Borda amarela + tooltip de aviso | Permite continuar com warning |
| **Inválido** | Borda vermelha + mensagem de erro | Bloqueia continuar |

---

### 12.8 Acessibilidade

- Todos os campos possuem `aria-label` e `aria-describedby`
- Botões desabilitados possuem `aria-disabled` e tooltip explicativo
- Toasts possuem `role="alert"` para leitores de tela
- Cores de status possuem texto alternativo (não dependem só de cor)
- Navegação por teclado funcional em todos os novos componentes

---

## CHANGELOG

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0 | 2025-11-28 | Sistema | Versão inicial - Documentação dos gaps e solução proposta |
| 1.1 | 2025-11-28 | Sistema | Adicionada seção 12 - Experiência do Usuário (UX) completa |
| 1.2 | 2025-11-30 | Claude | BUGFIX: Corrigido endpoint /orders/:id/ship - walletAddress está em User.address, não em Profile.walletAddress; Atualizada documentação da seção 3.2 |
