# PROPOSAL-003: Multi-Store Checkout

**Status**: PROPOSTA
**Prioridade**: MÉDIA
**Autor**: Claude
**Data**: 2025-11-30
**Versão**: 1.0
**Dependências**: PROPOSAL-002 (Múltiplas Opções de Envio)

---

## 1. RESUMO EXECUTIVO

### Problema Identificado

Atualmente, o marketplace Bazari **não suporta compras de múltiplas lojas em um único checkout**. Esta é uma decisão de design do MVP, com validações explícitas que bloqueiam:

1. **Frontend (cart.store.ts:62-66)**: Retorna `false` se tentar adicionar item de outro vendedor
2. **Backend (orders.ts:134-144)**: Rejeita pedidos com múltiplos vendedores

### Impacto da Limitação

| Aspecto | Impacto |
|---------|---------|
| UX do Comprador | Precisa fazer checkouts separados para cada vendedor |
| Conversão | Potencial abandono ao ver modal "limpar carrinho" |
| Frete | Cada pedido tem seu próprio frete (custo maior) |

### Solução Proposta

**Opção A (Split Orders)**: Carrinho unificado, checkout cria pedidos separados automaticamente.

- Comprador adiciona itens de qualquer vendedor
- No checkout, vê resumo agrupado por vendedor
- Uma única transação blockchain (batch) cria múltiplos escrows
- Cada pedido é independente após a compra

---

## 2. ANÁLISE DO ESTADO ATUAL

### 2.1 Cart Store (Frontend)

```typescript
// apps/web/src/modules/cart/cart.store.ts:58-66

addItem: async (newItem) => {
  const { items } = get();
  const currentSellerId = items.length > 0 ? items[0].sellerId : null;

  // Verificar regra MVP: 1 vendedor por carrinho
  if (currentSellerId && currentSellerId !== newItem.sellerId) {
    return false; // Bloqueia adição
  }
  // ...
}
```

**Comportamento**: Modal de confirmação para limpar carrinho.

### 2.2 Orders API (Backend)

```typescript
// apps/api/src/routes/orders.ts:134-144

const uniqueSellers = [...new Set(validItems.map((item) => item.sellerId))];
if (uniqueSellers.length > 1) {
  return reply.status(400).send({
    error: 'Múltiplos vendedores',
    message: 'MVP permite apenas itens de um vendedor por pedido',
    sellers: uniqueSellers,
  });
}
```

**Comportamento**: Rejeita com HTTP 400.

### 2.3 Modelo Order

```prisma
model Order {
  sellerAddr    String   // Apenas UM vendedor
  sellerStoreId String?  // ID da loja única
  // ...
}
```

**Limitação**: Schema suporta apenas 1 vendedor por pedido.

---

## 3. ARQUITETURA PROPOSTA

### 3.1 Fluxo de Checkout Multi-Store

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CARRINHO UNIFICADO                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📦 Loja A - TechStore (@techstore)                                │
│  ├── Smartphone X ............... 1x ............ R$ 1.500,00      │
│  └── Capinha .................... 1x ............    R$ 50,00      │
│                                               Subtotal: R$ 1.550,00 │
│                                                                     │
│  📦 Loja B - ModaFit (@modafit)                                    │
│  └── Tênis Running .............. 1x ............   R$ 350,00      │
│                                               Subtotal:   R$ 350,00 │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  TOTAL GERAL:                                        R$ 1.900,00    │
│                                                                     │
│  [                    FINALIZAR COMPRA                    ]         │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           CHECKOUT                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Endereço de Entrega: [Formulário único]                           │
│                                                                     │
│  ─────────────────────────────────────────────────────────────      │
│                                                                     │
│  📦 Pedido #1 - TechStore                                          │
│  ├── Smartphone X (1x) .......................... R$ 1.500,00      │
│  ├── Capinha (1x) ...............................    R$ 50,00      │
│  ├── Frete: SEDEX (3 dias) ......................    R$ 25,00      │
│  └── Subtotal: .................................. R$ 1.575,00      │
│      Escrow: 10 dias (3 + 7 segurança)                             │
│                                                                     │
│  📦 Pedido #2 - ModaFit                                            │
│  ├── Tênis Running (1x) .........................   R$ 350,00      │
│  ├── Frete: PAC (7 dias) ........................    R$ 18,00      │
│  └── Subtotal: ..................................   R$ 368,00      │
│      Escrow: 14 dias (7 + 7 segurança)                             │
│                                                                     │
│  ─────────────────────────────────────────────────────────────      │
│  TOTAL GERAL:                                      R$ 1.943,00      │
│                                                                     │
│  ⓘ Serão criados 2 pedidos separados, cada um com                  │
│    seu próprio escrow e acompanhamento.                            │
│                                                                     │
│  [            PAGAR R$ 1.943,00 (1 transação)           ]          │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BLOCKCHAIN: BATCH TRANSACTION                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  api.tx.utility.batch([                                            │
│    api.tx.escrow.create(order1.id, seller1, 1575_000_000_000n),    │
│    api.tx.escrow.create(order2.id, seller2,  368_000_000_000n),    │
│  ])                                                                 │
│                                                                     │
│  ✓ 1 assinatura na wallet                                          │
│  ✓ 1 taxa de transação (batch)                                     │
│  ✓ 2 escrows criados atomicamente                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         MEUS PEDIDOS                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Pedido #ORD-001 - TechStore                                 │   │
│  │ Status: ESCROWED   │   Escrow libera em: 10 dias            │   │
│  │ R$ 1.575,00        │   Enviado: Não                         │   │
│  │                                                [Ver Pedido] │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Pedido #ORD-002 - ModaFit                                   │   │
│  │ Status: ESCROWED   │   Escrow libera em: 14 dias            │   │
│  │ R$ 368,00          │   Enviado: Não                         │   │
│  │                                                [Ver Pedido] │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Modelo de Dados

#### Novo: CheckoutSession (opcional, para rastreamento)

```prisma
model CheckoutSession {
  id        String   @id @default(cuid())
  buyerAddr String
  status    String   @default("PENDING") // PENDING | PAID | FAILED | EXPIRED
  orders    Order[]  @relation("CheckoutSessionOrders")

  // Batch transaction info
  batchTxHash  String?
  totalBzr     Decimal  @db.Decimal(30, 0)

  createdAt DateTime @default(now())
  expiresAt DateTime
  paidAt    DateTime?

  @@index([buyerAddr, status])
  @@index([batchTxHash])
}
```

#### Atualização: Order

```prisma
model Order {
  // ... campos existentes

  // PROPOSAL-003: Multi-Store Checkout
  checkoutSessionId String?
  checkoutSession   CheckoutSession? @relation("CheckoutSessionOrders", fields: [checkoutSessionId], references: [id])
}
```

---

## 4. API CHANGES

### 4.1 Novo Endpoint: Create Multi-Store Order

```
POST /api/orders/multi
```

**Request:**
```json
{
  "shippingAddress": {
    "street": "Rua das Flores, 123",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01234-567",
    "country": "BR"
  },
  "stores": [
    {
      "sellerId": "seller-1",
      "items": [
        { "listingId": "prod-1", "qty": 1, "kind": "product" },
        { "listingId": "prod-2", "qty": 1, "kind": "product" }
      ],
      "shippingOptionId": "opt-sedex-1"
    },
    {
      "sellerId": "seller-2",
      "items": [
        { "listingId": "prod-3", "qty": 1, "kind": "product" }
      ],
      "shippingOptionId": "opt-pac-2"
    }
  ]
}
```

**Response:**
```json
{
  "checkoutSessionId": "session-123",
  "orders": [
    {
      "orderId": "ord-001",
      "sellerId": "seller-1",
      "sellerName": "TechStore",
      "subtotalBzr": "1550000000000000",
      "shippingBzr": "25000000000000",
      "totalBzr": "1575000000000000",
      "estimatedDeliveryDays": 3
    },
    {
      "orderId": "ord-002",
      "sellerId": "seller-2",
      "sellerName": "ModaFit",
      "subtotalBzr": "350000000000000",
      "shippingBzr": "18000000000000",
      "totalBzr": "368000000000000",
      "estimatedDeliveryDays": 7
    }
  ],
  "grandTotalBzr": "1943000000000000",
  "paymentInstructions": {
    "method": "BATCH_ESCROW",
    "escrowCalls": [
      { "orderId": "ord-001", "amount": "1575000000000000", "seller": "5Gx..." },
      { "orderId": "ord-002", "amount": "368000000000000", "seller": "5Hy..." }
    ]
  }
}
```

### 4.2 Atualização: Cart Store

```typescript
// Remover validação de vendedor único
addItem: async (newItem) => {
  const { items } = get();

  // REMOVIDO: Verificação de vendedor único
  // MVP agora suporta múltiplos vendedores

  // Verificar se item já existe
  const existingItemIndex = items.findIndex(item => item.listingId === newItem.listingId);
  // ... resto do código
}
```

---

## 5. BLOCKCHAIN: BATCH TRANSACTIONS

### 5.1 Substrate utility.batch

O pallet `utility` do Substrate permite executar múltiplas chamadas em uma única transação:

```typescript
import { ApiPromise, WsProvider } from '@polkadot/api';

async function createBatchEscrows(
  api: ApiPromise,
  buyer: KeyringPair,
  escrows: Array<{ orderId: string; seller: string; amount: bigint }>
) {
  // Construir chamadas de escrow
  const escrowCalls = escrows.map(e =>
    api.tx.escrow.create(
      e.orderId,           // order_id: Vec<u8>
      e.seller,            // seller: AccountId
      e.amount,            // amount: Balance
      autoReleaseBlocks    // auto_release_at: BlockNumber
    )
  );

  // Criar batch
  const batchTx = api.tx.utility.batch(escrowCalls);

  // Assinar e enviar
  const hash = await batchTx.signAndSend(buyer);

  return hash.toHex();
}
```

### 5.2 Tratamento de Falhas

O `utility.batch` tem 3 variantes:

| Variante | Comportamento em falha |
|----------|------------------------|
| `batch` | Continua mesmo se uma call falhar |
| `batchAll` | Reverte tudo se qualquer call falhar |
| `forceBatch` | Como batch, mas ignora erros de dispatch |

**Recomendação**: Usar `batchAll` para garantir atomicidade.

```typescript
const batchTx = api.tx.utility.batchAll(escrowCalls);
```

Se qualquer escrow falhar, todos são revertidos e o comprador não perde fundos.

### 5.3 Taxas

Uma transação batch tem taxa única calculada como:
- Taxa base + (taxa por call × número de calls) + taxa por byte

Em geral, é **mais barato** que transações separadas porque:
- Overhead de assinatura é pago uma vez
- Overhead de inclusão no bloco é pago uma vez

---

## 6. UX DESIGN

### 6.1 Carrinho Unificado

```
┌─────────────────────────────────────────────────────────────────────┐
│  Carrinho (3 itens)                                         [X]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 📦 TechStore (@techstore)                                   │   │
│  │ ─────────────────────────────────────────────────────────── │   │
│  │ Smartphone X              1x         R$ 1.500,00    [−][+] │   │
│  │ Capinha Silicone          1x            R$ 50,00    [−][+] │   │
│  │                                                             │   │
│  │ Frete: A partir de R$ 15,00 (SEDEX 3 dias)                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 📦 ModaFit (@modafit)                                       │   │
│  │ ─────────────────────────────────────────────────────────── │   │
│  │ Tênis Running Pro         1x           R$ 350,00    [−][+] │   │
│  │                                                             │   │
│  │ Frete: A partir de R$ 12,00 (PAC 7 dias)                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  Subtotal (3 itens):                               R$ 1.900,00     │
│  Frete estimado:                                      R$ 27,00     │
│  ─────────────────────────────────────────────────────────────     │
│  TOTAL:                                            R$ 1.927,00     │
│                                                                     │
│  ⓘ Compra de 2 lojas diferentes - serão 2 pedidos separados       │
│                                                                     │
│  [                    FINALIZAR COMPRA                    ]        │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Checkout: Seleção de Frete por Loja

```
┌─────────────────────────────────────────────────────────────────────┐
│  Finalizar Compra                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Endereço de Entrega                              [✓ Preenchido]│
│  ─────────────────────────────────────────────────────────────     │
│  Rua das Flores, 123 - Centro                                      │
│  São Paulo/SP - 01234-567                          [Alterar]       │
│                                                                     │
│  ─────────────────────────────────────────────────────────────     │
│                                                                     │
│  2. Escolha o Frete para Cada Loja                                 │
│  ─────────────────────────────────────────────────────────────     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 📦 Pedido #1 - TechStore                                    │   │
│  │ Smartphone X (1x) + Capinha (1x)           R$ 1.550,00      │   │
│  │                                                             │   │
│  │ Escolha o frete:                                            │   │
│  │ ● SEDEX (3 dias) .......................... R$ 25,00       │   │
│  │ ○ PAC (10 dias) ........................... R$ 15,00       │   │
│  │ ○ Retirar na Loja (1 dia) ................. Grátis         │   │
│  │                                                             │   │
│  │ Subtotal com frete:                        R$ 1.575,00      │   │
│  │ Proteção do escrow: 10 dias                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 📦 Pedido #2 - ModaFit                                      │   │
│  │ Tênis Running Pro (1x)                       R$ 350,00      │   │
│  │                                                             │   │
│  │ Escolha o frete:                                            │   │
│  │ ○ SEDEX (5 dias) .......................... R$ 22,00       │   │
│  │ ● PAC (10 dias) ........................... R$ 12,00       │   │
│  │                                                             │   │
│  │ Subtotal com frete:                          R$ 362,00      │   │
│  │ Proteção do escrow: 17 dias                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ─────────────────────────────────────────────────────────────     │
│                                                                     │
│  3. Resumo do Pagamento                                            │
│  ─────────────────────────────────────────────────────────────     │
│                                                                     │
│  Pedido #1 (TechStore):                           R$ 1.575,00      │
│  Pedido #2 (ModaFit):                               R$ 362,00      │
│  ─────────────────────────────────────────────────────────────     │
│  TOTAL:                                           R$ 1.937,00      │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ✓ 1 transação única na sua wallet                          │   │
│  │ ✓ 2 pedidos independentes criados                          │   │
│  │ ✓ Cada pedido tem seu próprio escrow e rastreamento        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  [                 PAGAR R$ 1.937,00 BZR                 ]         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3 Confirmação de Pagamento

```
┌─────────────────────────────────────────────────────────────────────┐
│  Pagamento Realizado com Sucesso!                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                           ✓                                        │
│                                                                     │
│  Seus pedidos foram criados:                                        │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Pedido #ORD-001 - TechStore                                 │   │
│  │ R$ 1.575,00 | Entrega: 3 dias | Escrow: 10 dias            │   │
│  │                                            [Ver Pedido →]   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Pedido #ORD-002 - ModaFit                                   │   │
│  │ R$ 362,00 | Entrega: 10 dias | Escrow: 17 dias             │   │
│  │                                            [Ver Pedido →]   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Transação: 0x1234...5678                         [Ver no Explorer]│
│                                                                     │
│  [                    VER MEUS PEDIDOS                    ]        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. REGRAS DE NEGÓCIO

### 7.1 Agrupamento no Carrinho

- Itens são agrupados por `sellerId`
- Cada grupo é um "sub-carrinho" que vira um pedido

### 7.2 Cálculo de Frete

- Cada loja tem seu próprio cálculo de frete
- Frete é calculado para todos os itens da loja em conjunto
- Frete grátis condicional (PROPOSAL-002) aplica-se ao subtotal da loja

### 7.3 Cálculo de Escrow

- Cada pedido tem seu próprio escrow independente
- Auto-release = `estimatedDeliveryDays + 7 dias de segurança`
- Disputas afetam apenas o pedido específico

### 7.4 Limite de Lojas por Checkout

- Máximo de **5 lojas** por checkout (para não sobrecarregar UI e batch)

### 7.5 Falha Parcial

- Se batch falhar, nenhum escrow é criado
- Comprador recebe mensagem de erro e pode tentar novamente
- Não há "pedido parcialmente pago"

---

## 8. IMPLEMENTAÇÃO

### 8.1 Migração Prisma

```prisma
-- CreateTable (opcional, para rastreamento)
CREATE TABLE "CheckoutSession" (
    "id" TEXT NOT NULL,
    "buyerAddr" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "batchTxHash" TEXT,
    "totalBzr" DECIMAL(30,0) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("id")
);

-- AddColumn
ALTER TABLE "Order" ADD COLUMN "checkoutSessionId" TEXT;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_checkoutSessionId_fkey"
  FOREIGN KEY ("checkoutSessionId") REFERENCES "CheckoutSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "CheckoutSession_buyerAddr_status_idx" ON "CheckoutSession"("buyerAddr", "status");
CREATE INDEX "CheckoutSession_batchTxHash_idx" ON "CheckoutSession"("batchTxHash");
CREATE INDEX "Order_checkoutSessionId_idx" ON "Order"("checkoutSessionId");
```

### 8.2 Arquivos a Modificar

#### Backend (apps/api)

| Arquivo | Mudança |
|---------|---------|
| `prisma/schema.prisma` | CheckoutSession, relação com Order |
| `src/routes/orders.ts` | Novo endpoint `/orders/multi`, remover validação de seller único |
| `src/services/blockchain/escrow.service.ts` | Método `createBatchEscrows` |

#### Frontend (apps/web)

| Arquivo | Mudança |
|---------|---------|
| `src/modules/cart/cart.store.ts` | Remover validação de seller único |
| `src/modules/cart/CartDrawer.tsx` | Agrupar itens por vendedor |
| `src/modules/orders/pages/CheckoutPage.tsx` | UI multi-loja, seleção de frete por loja |
| `src/modules/orders/pages/OrderPayPage.tsx` | Suporte a batch payment |
| `src/hooks/blockchain/useEscrow.ts` | Hook para batch escrow |
| `src/i18n/{pt,en,es}.json` | Chaves de tradução |

#### Blockchain (bazari-chain)

| Arquivo | Mudança |
|---------|---------|
| Nenhum | utility.batch já existe nativamente |

### 8.3 Estimativa de Esforço

| Componente | Complexidade |
|------------|--------------|
| Schema + Migração | Baixa |
| API Multi-Order | Média |
| Cart grouping | Média |
| Checkout UI | Alta |
| Batch payment | Alta |
| Testes E2E | Alta |

---

## 9. CHAVES i18n

```json
{
  "multiStore": {
    "cart": {
      "groupedBy": "Itens agrupados por loja",
      "storeCount": "{{count}} lojas diferentes",
      "separateOrders": "Serão criados {{count}} pedidos separados",
      "estimatedShipping": "Frete estimado"
    },
    "checkout": {
      "selectShippingPerStore": "Escolha o frete para cada loja",
      "orderNumber": "Pedido #{{number}}",
      "subtotalWithShipping": "Subtotal com frete",
      "escrowProtection": "Proteção do escrow: {{days}} dias",
      "paymentSummary": "Resumo do Pagamento",
      "singleTransaction": "1 transação única na sua wallet",
      "independentOrders": "{{count}} pedidos independentes criados",
      "ownEscrow": "Cada pedido tem seu próprio escrow e rastreamento"
    },
    "payment": {
      "batchPayment": "Pagar {{amount}} BZR",
      "creatingOrders": "Criando pedidos...",
      "processingPayment": "Processando pagamento...",
      "success": "Pagamento realizado com sucesso!",
      "ordersCreated": "Seus pedidos foram criados"
    },
    "limits": {
      "maxStores": "Máximo de {{max}} lojas por checkout",
      "removeItems": "Remova itens de algumas lojas para continuar"
    }
  }
}
```

---

## 10. RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Batch tx falha parcialmente | Baixa | Alto | Usar `batchAll` para atomicidade |
| UI complexa confunde usuário | Média | Médio | Design limpo, info-boxes explicativos |
| Limite de 5 lojas insuficiente | Baixa | Baixo | Configurável, pode aumentar depois |
| Performance com muitas lojas | Baixa | Médio | Lazy loading de opções de frete |

---

## 11. CRITÉRIOS DE ACEITAÇÃO

- [ ] Comprador pode adicionar itens de múltiplas lojas ao carrinho
- [ ] Carrinho mostra itens agrupados por loja
- [ ] Checkout mostra seleção de frete por loja
- [ ] Cada pedido tem seu próprio subtotal, frete e escrow
- [ ] Uma única transação batch cria todos os escrows
- [ ] Se batch falhar, nenhum pedido é criado
- [ ] Meus Pedidos mostra pedidos separados
- [ ] Cada pedido funciona independentemente (envio, disputa, release)
- [ ] i18n completo (pt, en, es)
- [ ] Testes E2E para fluxo completo

---

## 12. SEQUÊNCIA DE IMPLEMENTAÇÃO

### Fase 1: PROPOSAL-002 (Múltiplas Opções de Envio)

1. Modelo ProductShippingOption
2. UI de cadastro de opções
3. Seleção no checkout (1 vendedor)
4. Deploy e validação

### Fase 2: PROPOSAL-003 (Multi-Store Checkout)

1. Remover validação de vendedor único (cart + API)
2. UI de carrinho agrupado
3. UI de checkout multi-loja
4. API `/orders/multi`
5. Batch escrow payment
6. Testes E2E
7. Deploy e validação

---

## CHANGELOG

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0 | 2025-11-30 | Claude | Versão inicial da proposta |
