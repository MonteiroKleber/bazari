# PROPOSAL-002: Múltiplas Opções de Envio por Produto

**Status**: PROPOSTA
**Prioridade**: MÉDIA
**Autor**: Claude
**Data**: 2025-11-30
**Versão**: 1.0
**Dependências**: PROPOSAL-000 (Delivery/Shipping Fields)

---

## 1. RESUMO EXECUTIVO

### Problema Identificado

Atualmente, cada produto pode ter apenas **uma opção de envio** configurada (campos `shippingMethod` e `estimatedDeliveryDays` no modelo `Product`). Isso limita o vendedor e o comprador:

- Vendedor não pode oferecer múltiplas opções (ex: SEDEX rápido e PAC econômico)
- Comprador não pode escolher entre velocidade e custo
- Não há suporte para frete grátis condicional
- Retirada em loja não tem endereço configurável

### Solução Proposta

Criar modelo `ProductShippingOption` que permite múltiplas opções de envio por produto, com:
- Preço fixo ou grátis (condicional ou incondicional)
- Prazo estimado por opção
- Endereço de retirada customizável
- Seleção pelo comprador no checkout

---

## 2. ANÁLISE DO ESTADO ATUAL

### 2.1 Modelo Product (Prisma)

```prisma
model Product {
  // ... outros campos

  // === Shipping & Delivery (PROPOSAL-000) ===
  estimatedDeliveryDays Int?    @default(7)
  shippingMethod        String? // SEDEX | PAC | ...
  weight                Float?  @db.Real
  dimensions            Json?   // { length, width, height }
}
```

**Limitação**: Apenas 1 método de envio por produto.

### 2.2 Modelo SellerProfile

```prisma
model SellerProfile {
  // ... outros campos

  // === Address for Pickup ===
  pickupAddress Json? // { street, number, complement?, city, state, zipCode, lat?, lng?, instructions? }
}
```

**Já existe**: Endereço da loja para retirada.

### 2.3 NewListingPage.tsx (Frontend)

- Seção "Shipping Section" com:
  - Select de método único
  - Input de prazo em dias
  - Inputs de peso e dimensões
- **Limitação**: UI para apenas 1 opção

### 2.4 CheckoutPage.tsx (Frontend)

- Exibe `shippingInfo` por item
- Frete fixo de 10 BZR (stub)
- **Limitação**: Não permite seleção de opção pelo comprador

---

## 3. MODELO DE DADOS PROPOSTO

### 3.1 Novo Modelo: ProductShippingOption

```prisma
model ProductShippingOption {
  id        String  @id @default(cuid())
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  // Método de envio
  method        String  // SEDEX | PAC | TRANSPORTADORA | MINI_ENVIOS | RETIRADA | INTERNACIONAL | OUTRO
  label         String? // Nome customizado (ex: "Entrega Expressa")

  // Preço do frete
  pricingType   String  @default("FIXED") // FIXED | FREE | FREE_ABOVE | TO_ARRANGE
  priceBzr      Decimal? @db.Decimal(20, 12) // Valor fixo (quando FIXED)
  freeAboveBzr  Decimal? @db.Decimal(20, 12) // Grátis acima de X (quando FREE_ABOVE)

  // Prazo
  estimatedDeliveryDays Int @default(7)

  // Retirada em loja (quando method = RETIRADA)
  pickupAddressType String?  @default("STORE") // STORE | CUSTOM
  pickupAddress     Json?    // Se CUSTOM: { street, number, ... }

  // Ordenação e status
  isDefault  Boolean @default(false) // Opção padrão selecionada no checkout
  isActive   Boolean @default(true)
  sortOrder  Int     @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([productId, isActive])
  @@index([productId, sortOrder])
}
```

### 3.2 Atualização do Modelo Product

```prisma
model Product {
  // ... campos existentes mantidos para retrocompatibilidade

  // PROPOSAL-000: Campos legacy (deprecated, usar shippingOptions)
  estimatedDeliveryDays Int?    @default(7)
  shippingMethod        String?
  weight                Float?  @db.Real
  dimensions            Json?

  // PROPOSAL-002: Múltiplas opções de envio
  shippingOptions ProductShippingOption[]
}
```

### 3.3 Atualização do Modelo Order

```prisma
model Order {
  // ... campos existentes

  // PROPOSAL-002: Opção de envio selecionada
  selectedShippingOptionId String? // ID da ProductShippingOption escolhida
}
```

### 3.4 Atualização do Modelo OrderItem

```prisma
model OrderItem {
  // ... campos existentes

  // PROPOSAL-002: Snapshot da opção de envio no momento do pedido
  shippingMethodSnapshot  String?
  shippingPriceBzrSnapshot Decimal? @db.Decimal(30, 0) // planck
  estimatedDeliveryDaysSnapshot Int?
}
```

---

## 4. API ENDPOINTS

### 4.1 Criar Opção de Envio

```
POST /api/products/:productId/shipping-options
```

**Request:**
```json
{
  "method": "SEDEX",
  "label": "Entrega Expressa",
  "pricingType": "FIXED",
  "priceBzr": "15.00",
  "estimatedDeliveryDays": 3,
  "isDefault": true
}
```

**Response:**
```json
{
  "id": "cuid123",
  "productId": "prod456",
  "method": "SEDEX",
  "label": "Entrega Expressa",
  "pricingType": "FIXED",
  "priceBzr": "15.00",
  "estimatedDeliveryDays": 3,
  "isDefault": true,
  "isActive": true,
  "sortOrder": 0
}
```

### 4.2 Listar Opções de Envio

```
GET /api/products/:productId/shipping-options
```

**Response:**
```json
{
  "items": [
    {
      "id": "opt1",
      "method": "SEDEX",
      "label": "Entrega Expressa",
      "pricingType": "FIXED",
      "priceBzr": "15.00",
      "estimatedDeliveryDays": 3,
      "isDefault": true
    },
    {
      "id": "opt2",
      "method": "PAC",
      "label": "Econômico",
      "pricingType": "FREE_ABOVE",
      "priceBzr": "12.00",
      "freeAboveBzr": "100.00",
      "estimatedDeliveryDays": 10,
      "isDefault": false
    },
    {
      "id": "opt3",
      "method": "RETIRADA",
      "label": "Retirar na Loja",
      "pricingType": "FREE",
      "estimatedDeliveryDays": 1,
      "pickupAddressType": "STORE",
      "isDefault": false
    }
  ]
}
```

### 4.3 Atualizar Opção

```
PUT /api/products/:productId/shipping-options/:optionId
```

### 4.4 Remover Opção

```
DELETE /api/products/:productId/shipping-options/:optionId
```

### 4.5 Reordenar Opções

```
PATCH /api/products/:productId/shipping-options/reorder
```

**Request:**
```json
{
  "order": ["opt2", "opt1", "opt3"]
}
```

---

## 5. UX DESIGN

### 5.1 Tela de Cadastro/Edição de Produto (NewListingPage)

#### Estado Atual
```
┌─────────────────────────────────────────────────────────────┐
│  Envio                                                      │
├─────────────────────────────────────────────────────────────┤
│  Método de Envio:  [SEDEX ▼]                               │
│  Prazo de Entrega: [3] dias                                │
│  Peso: [0.5] kg                                            │
│  Dimensões: [30] x [20] x [10] cm                          │
└─────────────────────────────────────────────────────────────┘
```

#### Proposta: Interface de Múltiplas Opções

```
┌─────────────────────────────────────────────────────────────────────┐
│  Opções de Envio                                    [+ Adicionar]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  SEDEX - Entrega Expressa                      [Padrão] [X]  │  │
│  │  ─────────────────────────────────────────────────────────── │  │
│  │  Preço: ● Fixo: R$ [15,00]  ○ Grátis  ○ Grátis acima de      │  │
│  │  Prazo: [3] dias úteis                                       │  │
│  │                                              [Editar] [↑] [↓] │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  PAC - Econômico                                         [X]  │  │
│  │  ─────────────────────────────────────────────────────────── │  │
│  │  Preço: ○ Fixo  ○ Grátis  ● Grátis acima de: R$ [100,00]     │  │
│  │         Valor normal: R$ [12,00]                             │  │
│  │  Prazo: [10] dias úteis                                      │  │
│  │                                              [Editar] [↑] [↓] │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Retirada em Loja                                        [X]  │  │
│  │  ─────────────────────────────────────────────────────────── │  │
│  │  Preço: ○ Fixo  ● Grátis  ○ Grátis acima de                  │  │
│  │  Prazo: [1] dia útil                                         │  │
│  │  Local: ● Endereço da Loja  ○ Outro endereço                 │  │
│  │         Rua das Flores, 123 - São Paulo/SP                   │  │
│  │                                              [Editar] [↑] [↓] │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │
│  │                                                              │  │
│  │              [+ Adicionar Opção de Envio]                    │  │
│  │                                                              │  │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  Peso e Dimensões (para cálculo de frete futuro)                   │
│  Peso: [0.5] kg   Dimensões: [30] x [20] x [10] cm                 │
└─────────────────────────────────────────────────────────────────────┘
```

#### Modal de Adicionar/Editar Opção

```
┌─────────────────────────────────────────────────────────────────────┐
│  Adicionar Opção de Envio                                     [X]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Método de Envio *                                                  │
│  [SEDEX (Correios) ▼]                                              │
│                                                                     │
│  Nome Personalizado (opcional)                                      │
│  [Entrega Expressa                    ]                            │
│  Ex: "Super Rápido", "Econômico", etc.                             │
│                                                                     │
│  ─────────────────────────────────────────────────────────────      │
│  Preço do Frete                                                     │
│  ─────────────────────────────────────────────────────────────      │
│                                                                     │
│  ● Fixo           R$ [15,00]                                       │
│  ○ Grátis                                                          │
│  ○ Grátis acima de   R$ [____]  (valor normal: R$ [____])          │
│  ○ A combinar     (vendedor entra em contato)                      │
│                                                                     │
│  ─────────────────────────────────────────────────────────────      │
│  Prazo de Entrega *                                                 │
│  ─────────────────────────────────────────────────────────────      │
│                                                                     │
│  [3] dias úteis                                                    │
│  Prazo mínimo recomendado para SEDEX: 3 dias                       │
│                                                                     │
│  ─────────────────────────────────────────────────────────────      │
│  (Apenas para Retirada em Loja)                                    │
│  ─────────────────────────────────────────────────────────────      │
│                                                                     │
│  ● Usar endereço da loja                                           │
│    Rua das Flores, 123 - Centro - São Paulo/SP                     │
│                                                                     │
│  ○ Outro endereço de retirada                                      │
│    [Rua ______________________________]                             │
│    [Cidade ___________] [Estado __]                                │
│    [CEP __________]                                                │
│    [Instruções para retirada                   ]                   │
│                                                                     │
│  ─────────────────────────────────────────────────────────────      │
│                                                                     │
│  [  ] Definir como opção padrão                                    │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                 [Cancelar]  [Salvar Opção]          │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Checkout: Seleção de Opção de Envio

#### Cenário: Único produto no carrinho

```
┌─────────────────────────────────────────────────────────────────────┐
│  Resumo do Pedido                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Camiseta Bazari (1x)                                   R$ 50,00   │
│                                                                     │
│  ─────────────────────────────────────────────────────────────      │
│  Escolha a forma de envio:                                          │
│  ─────────────────────────────────────────────────────────────      │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ● SEDEX - Entrega Expressa                                  │   │
│  │   Prazo: 3 dias úteis                          R$ 15,00    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ○ PAC - Econômico                                           │   │
│  │   Prazo: 10 dias úteis                         R$ 12,00    │   │
│  │   Frete grátis acima de R$ 100,00                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ○ Retirada em Loja                                          │   │
│  │   Prazo: 1 dia útil                               GRÁTIS   │   │
│  │   Local: Rua das Flores, 123 - São Paulo/SP                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ─────────────────────────────────────────────────────────────      │
│  Subtotal:                                              R$ 50,00   │
│  Frete (SEDEX):                                         R$ 15,00   │
│  ─────────────────────────────────────────────────────────────      │
│  TOTAL:                                                 R$ 65,00   │
│                                                                     │
│                                         [Finalizar Compra]          │
└─────────────────────────────────────────────────────────────────────┘
```

#### Cenário: Múltiplos produtos do MESMO vendedor

**Regra**: Usa o maior prazo e soma os fretes, OU permite escolha única para todos.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Resumo do Pedido                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Camiseta Bazari (1x)                                   R$ 50,00   │
│  Calça Jeans (1x)                                       R$ 120,00  │
│                                                                     │
│  ─────────────────────────────────────────────────────────────      │
│  Opção de envio para todos os itens:                               │
│  ─────────────────────────────────────────────────────────────      │
│                                                                     │
│  ● SEDEX (3-5 dias úteis)                               R$ 25,00   │
│  ○ PAC (10-15 dias úteis)                               R$ 18,00   │
│  ○ Retirada em Loja (1 dia)                              GRÁTIS    │
│                                                                     │
│  * Prazo considera o maior prazo entre os produtos                 │
│  * Frete calculado para envio conjunto                             │
│                                                                     │
│  ─────────────────────────────────────────────────────────────      │
│  Subtotal:                                             R$ 170,00   │
│  Frete (SEDEX):                                         R$ 25,00   │
│  ─────────────────────────────────────────────────────────────      │
│  TOTAL:                                                R$ 195,00   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 Página do Produto: Exibição de Opções

```
┌─────────────────────────────────────────────────────────────────────┐
│  Camiseta Bazari                                                    │
│  R$ 50,00                                                          │
│                                                                     │
│  [Quantidade: 1 ▼]                                                 │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Opções de Envio                                            │   │
│  │  ───────────────────────────────────────────────────────── │   │
│  │  SEDEX .......... 3 dias .......... R$ 15,00              │   │
│  │  PAC ............ 10 dias ......... R$ 12,00              │   │
│  │  Retirar na Loja . 1 dia ........... Grátis               │   │
│  │                                                            │   │
│  │  Ver endereço de retirada →                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│                                 [Adicionar ao Carrinho]             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. REGRAS DE NEGÓCIO

### 6.1 Validações no Cadastro

1. **Mínimo de 1 opção**: Produto deve ter pelo menos 1 opção de envio
2. **Prazo mínimo por método**: Validar conforme `MIN_DELIVERY_DAYS_BY_METHOD` (PROPOSAL-000)
3. **Preço obrigatório para FIXED**: Se `pricingType = FIXED`, `priceBzr` é obrigatório
4. **Valor mínimo para FREE_ABOVE**: Se `pricingType = FREE_ABOVE`, ambos `freeAboveBzr` e `priceBzr` são obrigatórios
5. **Endereço de retirada**: Se `method = RETIRADA` e `pickupAddressType = STORE`, loja deve ter `pickupAddress`
6. **Apenas 1 default**: Apenas 1 opção pode ser `isDefault = true` por produto

### 6.2 Cálculo de Frete no Checkout

```typescript
function calculateShippingPrice(
  option: ProductShippingOption,
  cartSubtotal: Decimal
): Decimal {
  switch (option.pricingType) {
    case 'FREE':
      return Decimal(0);

    case 'FREE_ABOVE':
      if (cartSubtotal >= option.freeAboveBzr!) {
        return Decimal(0);
      }
      return option.priceBzr!;

    case 'TO_ARRANGE':
      return Decimal(0); // Será definido após contato

    case 'FIXED':
    default:
      return option.priceBzr!;
  }
}
```

### 6.3 Cálculo de Prazo para Múltiplos Produtos

```typescript
function calculateMaxDeliveryDays(
  items: CartItem[],
  selectedOptions: Record<string, ProductShippingOption>
): number {
  return Math.max(
    ...items.map(item => selectedOptions[item.listingId]?.estimatedDeliveryDays || 7)
  );
}
```

### 6.4 Retrocompatibilidade

- Produtos sem `shippingOptions` usam campos legacy (`shippingMethod`, `estimatedDeliveryDays`)
- API cria automaticamente 1 `ProductShippingOption` se produto tem campos legacy mas array vazio
- Frontend exibe UI antiga para produtos sem múltiplas opções

---

## 7. IMPLEMENTAÇÃO

### 7.1 Migração Prisma

```prisma
-- CreateTable
CREATE TABLE "ProductShippingOption" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "label" TEXT,
    "pricingType" TEXT NOT NULL DEFAULT 'FIXED',
    "priceBzr" DECIMAL(20,12),
    "freeAboveBzr" DECIMAL(20,12),
    "estimatedDeliveryDays" INTEGER NOT NULL DEFAULT 7,
    "pickupAddressType" TEXT DEFAULT 'STORE',
    "pickupAddress" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductShippingOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductShippingOption_productId_isActive_idx" ON "ProductShippingOption"("productId", "isActive");

-- CreateIndex
CREATE INDEX "ProductShippingOption_productId_sortOrder_idx" ON "ProductShippingOption"("productId", "sortOrder");

-- AddForeignKey
ALTER TABLE "ProductShippingOption" ADD CONSTRAINT "ProductShippingOption_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

### 7.2 Arquivos a Modificar

#### Backend (apps/api)

| Arquivo | Mudança |
|---------|---------|
| `prisma/schema.prisma` | Adicionar modelo `ProductShippingOption`, relação em `Product` |
| `src/routes/products.ts` | Endpoints CRUD para shipping options |
| `src/routes/orders.ts` | Validar e salvar opção selecionada |
| `src/types/shipping.types.ts` | Adicionar tipos para pricing |

#### Frontend (apps/web)

| Arquivo | Mudança |
|---------|---------|
| `src/pages/NewListingPage.tsx` | UI de múltiplas opções |
| `src/components/shipping/ShippingOptionsEditor.tsx` | Novo componente |
| `src/components/shipping/ShippingOptionCard.tsx` | Novo componente |
| `src/components/shipping/ShippingOptionModal.tsx` | Modal de edição |
| `src/modules/orders/pages/CheckoutPage.tsx` | Seletor de opção |
| `src/pages/ProductPage.tsx` | Exibir opções disponíveis |
| `src/modules/cart/cart.store.ts` | Armazenar opção selecionada |
| `src/i18n/{pt,en,es}.json` | Chaves de tradução |

### 7.3 Estimativa de Esforço

| Componente | Complexidade |
|------------|--------------|
| Schema + Migração | Baixa |
| API CRUD | Média |
| NewListingPage UI | Alta |
| CheckoutPage seleção | Média |
| Retrocompatibilidade | Baixa |
| Testes | Média |

---

## 8. CHAVES i18n

```json
{
  "shippingOptions": {
    "title": "Opções de Envio",
    "add": "Adicionar Opção de Envio",
    "edit": "Editar Opção",
    "delete": "Remover Opção",
    "confirmDelete": "Tem certeza que deseja remover esta opção de envio?",
    "setDefault": "Definir como padrão",
    "isDefault": "Padrão",
    "method": "Método de Envio",
    "customLabel": "Nome Personalizado",
    "customLabelHint": "Ex: \"Super Rápido\", \"Econômico\"",
    "pricing": {
      "title": "Preço do Frete",
      "fixed": "Fixo",
      "free": "Grátis",
      "freeAbove": "Grátis acima de",
      "toArrange": "A combinar",
      "normalPrice": "Valor normal"
    },
    "delivery": {
      "days": "dias úteis",
      "minRecommended": "Prazo mínimo recomendado para {{method}}: {{days}} dias"
    },
    "pickup": {
      "title": "Local de Retirada",
      "useStore": "Usar endereço da loja",
      "useCustom": "Outro endereço de retirada",
      "instructions": "Instruções para retirada"
    },
    "checkout": {
      "choose": "Escolha a forma de envio",
      "maxDeliveryNote": "Prazo considera o maior prazo entre os produtos"
    },
    "validation": {
      "minOneOption": "Produto deve ter pelo menos 1 opção de envio",
      "priceRequired": "Preço é obrigatório para frete fixo",
      "freeAboveRequired": "Informe o valor mínimo para frete grátis",
      "pickupAddressRequired": "Loja deve ter endereço de retirada configurado"
    }
  }
}
```

---

## 9. RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Produtos antigos sem opções | Alta | Baixo | Retrocompatibilidade com campos legacy |
| UX complexa no cadastro | Média | Médio | Começar com UI colapsada, expandir sob demanda |
| Performance com muitas opções | Baixa | Baixo | Limitar a 10 opções por produto |
| Conflito de frete multi-produto | Média | Médio | Regra clara: maior prazo, soma de fretes |

---

## 10. CRITÉRIOS DE ACEITAÇÃO

- [ ] Vendedor pode adicionar 1-10 opções de envio por produto
- [ ] Cada opção tem método, prazo, e preço (fixo/grátis/condicional)
- [ ] Retirada em loja usa endereço da loja por padrão, permite customizar
- [ ] Comprador vê opções na página do produto
- [ ] Comprador seleciona opção no checkout
- [ ] Frete grátis condicional funciona corretamente
- [ ] Produtos antigos continuam funcionando (retrocompatibilidade)
- [ ] i18n completo (pt, en, es)

---

## CHANGELOG

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0 | 2025-11-30 | Claude | Versão inicial da proposta |
