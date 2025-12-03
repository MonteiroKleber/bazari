# PROPOSAL-001: Delivery-Aware Escrow

**Status**: EM IMPLEMENTAÇÃO (Seção 4.4 concluída)
**Prioridade**: ALTA
**Autor**: Sistema
**Data**: 2025-11-28
**Versão**: 1.3

---

## 1. RESUMO EXECUTIVO

### Problema Identificado

O sistema atual de liberação automática (auto-release) usa um **prazo fixo de 7 dias** independentemente do prazo de entrega real do produto. Isso cria um risco significativo para o comprador em pedidos com entrega longa.

### Cenário Problemático

```
Dia 0:  Comprador paga → Escrow LOCKED (auto-release = 7 dias)
Dia 1:  Vendedor despacha (prazo de entrega estimado: 15 dias)
Dia 7:  AUTO-RELEASE EXECUTADO ← ⚠️ PROBLEMA!
        Fundos liberados ao vendedor
Dia 15: Produto chega (ou NÃO chega)
        Comprador já não tem proteção do escrow
```

### Impacto

- **Comprador**: Perde proteção financeira antes de receber o produto
- **Plataforma**: Risco de disputas e insatisfação
- **Confiança**: Compromete a proposta de valor do Proof-of-Commerce

---

## 2. SOLUÇÃO PROPOSTA

### 2.1 Conceito: Delivery-Aware Escrow

Vincular o prazo de auto-release ao prazo de entrega estimado, garantindo que o comprador mantenha proteção até após a data prevista de entrega.

### 2.2 Fórmula de Cálculo

```
auto_release_days = min(
    max(delivery_estimate_days, min_by_shipping_method) + safety_margin_days,
    max_escrow_days
)

Onde:
- delivery_estimate_days = Prazo de entrega informado pelo vendedor
- min_by_shipping_method = Prazo mínimo obrigatório por método de envio (ver tabela abaixo)
- safety_margin_days = 7 dias (margem de segurança pós-entrega)
- max_escrow_days = 30 dias (limite máximo do pallet)
```

### 2.3 Prazo Mínimo por Método de Envio

Para evitar que vendedores informem prazos irrealisticamente curtos, o sistema aplica um **prazo mínimo obrigatório** baseado no método de envio:

| Método de Envio | Prazo Mínimo | Justificativa |
|-----------------|--------------|---------------|
| SEDEX | 3 dias | Entrega expressa nacional |
| PAC | 10 dias | Entrega econômica nacional |
| Transportadora | 7 dias | Variável por região |
| Mini Envios | 5 dias | Objetos pequenos |
| Retirada | 1 dia | Retirada em loja/ponto |
| Internacional | 20 dias | Importação/exportação |
| Outro/Não informado | 7 dias | Default conservador |

**Regra:** `prazo_efetivo = max(prazo_informado, prazo_minimo_metodo)`

**Exemplo:**
- Vendedor informa: 3 dias via PAC
- Mínimo PAC: 10 dias
- Prazo efetivo: max(3, 10) = **10 dias**
- Auto-release: 10 + 7 = **17 dias**

### 2.4 Exemplos de Aplicação

| Prazo de Entrega | Margem | Auto-Release Calculado | Limitado a |
|------------------|--------|------------------------|------------|
| 3 dias           | +7     | 10 dias                | 10 dias    |
| 7 dias           | +7     | 14 dias                | 14 dias    |
| 15 dias          | +7     | 22 dias                | 22 dias    |
| 25 dias          | +7     | 32 dias                | **30 dias** (max) |

---

## 3. ARQUITETURA DA SOLUÇÃO

### 3.1 Fluxo Proposto

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DELIVERY-AWARE ESCROW FLOW                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. CADASTRO DO PRODUTO (Vendedor)                                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Vendedor informa:                                                 │  │
│  │  - estimatedDeliveryDays: 15                                      │  │
│  │  - shippingMethod: "PAC" | "SEDEX" | "Transportadora"             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│  2. CRIAÇÃO DO PEDIDO (Sistema)                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Sistema calcula:                                                  │  │
│  │  - deliveryEstimate = 15 dias                                     │  │
│  │  - safetyMargin = 7 dias                                          │  │
│  │  - autoReleaseDays = min(15 + 7, 30) = 22 dias                    │  │
│  │  - autoReleaseBlocks = 22 * 14400 = 316.800 blocos                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│  3. LOCK DO ESCROW (Blockchain)                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ bazariEscrow.lock(                                                │  │
│  │   beneficiary: seller,                                            │  │
│  │   amount: orderTotal,                                             │  │
│  │   auto_release_blocks: 316800  // 22 dias dinâmico               │  │
│  │ )                                                                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│  4. PROTEÇÃO ESTENDIDA (Comprador)                                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Comprador tem 22 dias para:                                       │  │
│  │  ✓ Receber o produto (esperado dia 15)                            │  │
│  │  ✓ Confirmar recebimento (release manual)                         │  │
│  │  ✓ Abrir disputa se não receber                                   │  │
│  │  ✓ Auto-release apenas após 22 dias sem ação                      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Diagrama de Componentes

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Product     │────▶│      Order      │────▶│     Escrow      │
│                 │     │                 │     │                 │
│ deliveryDays:15 │     │ deliveryDays:15 │     │ autoRelease:    │
│                 │     │ autoRelease:22d │     │   316800 blocks │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EscrowCalculator Service                      │
│                                                                  │
│  calculateAutoRelease(deliveryDays: number): number {            │
│    const SAFETY_MARGIN = 7;                                      │
│    const MAX_DAYS = 30;                                          │
│    const BLOCKS_PER_DAY = 14400;                                 │
│                                                                  │
│    const totalDays = Math.min(deliveryDays + SAFETY_MARGIN,      │
│                               MAX_DAYS);                         │
│    return totalDays * BLOCKS_PER_DAY;                            │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. MUDANÇAS NECESSÁRIAS

### 4.1 Schema do Banco de Dados

```prisma
// prisma/schema.prisma

model Product {
  id                    String   @id @default(uuid())
  // ... campos existentes ...

  // NOVO: Prazo de entrega estimado em dias
  estimatedDeliveryDays Int      @default(7)

  // NOVO: Método de envio
  shippingMethod        String?  // "PAC", "SEDEX", "Transportadora", etc.
}

model Order {
  id                    String   @id @default(uuid())
  // ... campos existentes ...

  // NOVO: Prazo de entrega calculado para este pedido
  estimatedDeliveryDays Int      @default(7)

  // NOVO: Data estimada de entrega
  estimatedDeliveryDate DateTime?

  // NOVO: Prazo de auto-release em blocos
  autoReleaseBlocks     Int      @default(100800)
}
```

### 4.2 Backend - Serviço de Cálculo

```typescript
// apps/api/src/services/escrow/escrow-calculator.service.ts

export type ShippingMethod =
  | 'SEDEX'
  | 'PAC'
  | 'TRANSPORTADORA'
  | 'MINI_ENVIOS'
  | 'RETIRADA'
  | 'INTERNACIONAL'
  | 'OUTRO';

export class EscrowCalculatorService {
  private readonly SAFETY_MARGIN_DAYS = 7;
  private readonly MAX_ESCROW_DAYS = 30;
  private readonly BLOCKS_PER_DAY = 14400; // 6 segundos por bloco

  /**
   * Prazo mínimo obrigatório por método de envio
   * Evita que vendedores informem prazos irrealisticamente curtos
   */
  private readonly MIN_DAYS_BY_SHIPPING_METHOD: Record<ShippingMethod, number> = {
    SEDEX: 3,
    PAC: 10,
    TRANSPORTADORA: 7,
    MINI_ENVIOS: 5,
    RETIRADA: 1,
    INTERNACIONAL: 20,
    OUTRO: 7,
  };

  /**
   * Retorna o prazo mínimo para um método de envio
   */
  getMinDaysForShippingMethod(method: ShippingMethod | string | null): number {
    if (!method) return this.MIN_DAYS_BY_SHIPPING_METHOD.OUTRO;
    const normalized = method.toUpperCase() as ShippingMethod;
    return this.MIN_DAYS_BY_SHIPPING_METHOD[normalized]
      ?? this.MIN_DAYS_BY_SHIPPING_METHOD.OUTRO;
  }

  /**
   * Aplica o prazo mínimo por método de envio
   */
  applyMinimumDeliveryDays(
    informedDays: number,
    shippingMethod: ShippingMethod | string | null
  ): number {
    const minDays = this.getMinDaysForShippingMethod(shippingMethod);
    return Math.max(informedDays, minDays);
  }

  /**
   * Calcula o prazo de auto-release baseado no prazo de entrega
   */
  calculateAutoReleaseBlocks(
    deliveryEstimateDays: number,
    shippingMethod?: ShippingMethod | string | null
  ): number {
    // Aplicar prazo mínimo por método de envio
    let effectiveDays = deliveryEstimateDays;
    if (shippingMethod) {
      effectiveDays = this.applyMinimumDeliveryDays(deliveryEstimateDays, shippingMethod);
    }

    // Validar input mínimo
    if (effectiveDays < 1) {
      effectiveDays = 1;
    }

    // Calcular prazo total com margem de segurança
    const totalDays = Math.min(
      effectiveDays + this.SAFETY_MARGIN_DAYS,
      this.MAX_ESCROW_DAYS
    );

    // Converter para blocos
    return totalDays * this.BLOCKS_PER_DAY;
  }

  /**
   * Calcula a data estimada de auto-release
   */
  calculateAutoReleaseDate(
    deliveryEstimateDays: number,
    shippingMethod?: ShippingMethod | string | null
  ): Date {
    const blocks = this.calculateAutoReleaseBlocks(deliveryEstimateDays, shippingMethod);
    const seconds = blocks * 6; // 6 segundos por bloco
    return new Date(Date.now() + seconds * 1000);
  }

  /**
   * Retorna informações completas do cálculo
   */
  getEscrowTimeline(
    deliveryEstimateDays: number,
    shippingMethod?: ShippingMethod | string | null
  ) {
    const minDays = this.getMinDaysForShippingMethod(shippingMethod ?? null);
    const effectiveDeliveryDays = Math.max(deliveryEstimateDays, minDays);
    const autoReleaseBlocks = this.calculateAutoReleaseBlocks(deliveryEstimateDays, shippingMethod);
    const autoReleaseDays = Math.ceil(autoReleaseBlocks / this.BLOCKS_PER_DAY);

    return {
      informedDeliveryDays: deliveryEstimateDays,
      shippingMethod: shippingMethod ?? 'OUTRO',
      minDaysForMethod: minDays,
      effectiveDeliveryDays,
      wasAdjustedByMinimum: deliveryEstimateDays < minDays,
      safetyMarginDays: this.SAFETY_MARGIN_DAYS,
      autoReleaseDays,
      autoReleaseBlocks,
      autoReleaseDate: this.calculateAutoReleaseDate(deliveryEstimateDays, shippingMethod),
      maxEscrowDays: this.MAX_ESCROW_DAYS,
      wasLimitedByMax: (effectiveDeliveryDays + this.SAFETY_MARGIN_DAYS) > this.MAX_ESCROW_DAYS,
    };
  }
}
```

### 4.3 Backend - Atualização do Fluxo de Pagamento

```typescript
// apps/api/src/services/orders/unified-order.service.ts

async payOrder(orderId: string, userId: string) {
  const order = await this.prisma.order.findUnique({
    where: { id: orderId },
    include: {
      store: true,
      items: { include: { product: true } }
    },
  });

  // Calcular prazo de entrega máximo entre os produtos
  const maxDeliveryDays = Math.max(
    ...order.items.map(item => item.product.estimatedDeliveryDays || 7)
  );

  // Calcular auto-release dinâmico
  const escrowCalculator = new EscrowCalculatorService();
  const timeline = escrowCalculator.getEscrowTimeline(maxDeliveryDays);

  // Lock escrow com prazo dinâmico
  const { escrowId, txHash } = await this.blockchain.lockEscrow(
    profile.walletAddress,
    sellerProfile.walletAddress,
    order.totalAmount.toString(),
    timeline.autoReleaseBlocks, // ← PRAZO DINÂMICO!
  );

  // Atualizar order com informações de timeline
  await this.prisma.order.update({
    where: { id: orderId },
    data: {
      estimatedDeliveryDays: maxDeliveryDays,
      estimatedDeliveryDate: new Date(Date.now() + maxDeliveryDays * 24 * 60 * 60 * 1000),
      autoReleaseBlocks: timeline.autoReleaseBlocks,
    },
  });

  return {
    escrowId,
    txHash,
    timeline,
  };
}
```

### 4.4 Frontend - Exibição do Timeline ✅ IMPLEMENTADO

**Status:** ✅ Implementado em 2025-11-29

**Arquivos:**
- `apps/web/src/components/escrow/EscrowTimeline.tsx` - Componente principal
- `apps/web/src/components/escrow/PaymentProtectionCard.tsx` - Integração
- `apps/web/src/pages/OrderPage.tsx` - Uso na página de pedido
- `apps/web/src/i18n/{pt,en,es}.json` - Chaves de tradução

**Implementação:**

```typescript
// apps/web/src/components/escrow/EscrowTimeline.tsx

interface EscrowTimelineProps {
  /** Order creation date */
  createdAt: string | Date;
  /** Estimated delivery in days */
  estimatedDeliveryDays: number;
  /** Auto-release in blocks (from blockchain) */
  autoReleaseBlocks: number;
  /** Compact mode (horizontal layout) */
  compact?: boolean;
}

export function EscrowTimeline({
  createdAt,
  estimatedDeliveryDays,
  autoReleaseBlocks,
  compact = false,
}: EscrowTimelineProps) {
  const BLOCKS_PER_DAY = 14_400;
  const autoReleaseDays = Math.ceil(autoReleaseBlocks / BLOCKS_PER_DAY);
  const safetyDays = autoReleaseDays - estimatedDeliveryDays;

  // Calculate dates
  const createdDate = new Date(createdAt);
  const deliveryDate = new Date(createdDate);
  deliveryDate.setDate(deliveryDate.getDate() + estimatedDeliveryDays);
  const protectionDate = new Date(createdDate);
  protectionDate.setDate(protectionDate.getDate() + autoReleaseDays);

  // Renders:
  // - 📦 Entrega Estimada: <date> (X dias)
  // - 🔒 Proteção até: <date> (Y dias)
  // - ℹ️ Você tem Z dias após a entrega para confirmar ou disputar
}
```

**Chaves i18n:**
```json
{
  "escrowTimeline": {
    "title": "Cronograma de Proteção",
    "delivery": "Entrega Estimada",
    "deliveryCompact": "Entrega",
    "protection": "Proteção até",
    "protectionCompact": "Proteção",
    "days": "dias",
    "safetyInfo": "Você tem {{days}} dias após a entrega estimada para confirmar o recebimento ou abrir uma disputa."
  }
}
```

---

## 5. MIGRAÇÃO

### 5.1 Estratégia de Rollout

1. **Fase 1 - Schema Update**
   - Adicionar novos campos ao schema (com defaults)
   - Migrar banco de dados
   - Não altera comportamento existente

2. **Fase 2 - Backend Implementation**
   - Implementar EscrowCalculatorService
   - Atualizar fluxo de pagamento
   - Novos pedidos usam prazo dinâmico

3. **Fase 3 - Frontend Update**
   - Adicionar campo de prazo de entrega no cadastro de produto
   - Exibir timeline de proteção no checkout e página do pedido

4. **Fase 4 - Comunicação**
   - Notificar vendedores sobre o novo campo
   - Documentar benefícios para compradores

### 5.2 Compatibilidade

- Pedidos existentes: Mantêm prazo de 7 dias (sem mudança)
- Novos pedidos sem prazo definido: Default de 7 dias
- Novos pedidos com prazo definido: Prazo dinâmico

---

## 6. CONFIGURAÇÃO

### 6.1 Variáveis de Ambiente

```env
# Margem de segurança após entrega estimada (dias)
ESCROW_SAFETY_MARGIN_DAYS=7

# Prazo máximo de escrow (dias) - limitado pelo pallet
ESCROW_MAX_DAYS=30

# Prazo default quando não informado (dias)
ESCROW_DEFAULT_DAYS=7
```

### 6.2 Configuração por Loja (Futuro)

```typescript
// Possível extensão futura: permitir lojas configurarem margem
interface StoreEscrowConfig {
  defaultDeliveryDays: number;
  customSafetyMargin?: number; // Override do padrão
}
```

---

## 7. TESTES

### 7.1 Casos de Teste

```typescript
describe('EscrowCalculatorService', () => {
  const service = new EscrowCalculatorService();

  it('should calculate 10 days for 3-day delivery', () => {
    const result = service.getEscrowTimeline(3);
    expect(result.autoReleaseDays).toBe(10); // 3 + 7
  });

  it('should calculate 14 days for 7-day delivery', () => {
    const result = service.getEscrowTimeline(7);
    expect(result.autoReleaseDays).toBe(14); // 7 + 7
  });

  it('should limit to 30 days for long deliveries', () => {
    const result = service.getEscrowTimeline(25);
    expect(result.autoReleaseDays).toBe(30); // max
    expect(result.wasLimited).toBe(true);
  });

  it('should handle minimum 1 day delivery', () => {
    const result = service.getEscrowTimeline(0);
    expect(result.autoReleaseDays).toBe(8); // 1 + 7
  });
});
```

---

## 8. MÉTRICAS DE SUCESSO

| Métrica | Antes | Meta |
|---------|-------|------|
| Disputas por entrega tardia | Baseline | -50% |
| Satisfação do comprador (NPS) | Baseline | +10 pontos |
| Uso do release manual | Baseline | +20% |
| Auto-releases problemáticos | Baseline | -80% |

---

## 9. EVOLUÇÕES FUTURAS

As seguintes melhorias estão planejadas para fases posteriores, após validação da implementação inicial:

### 9.1 [FUTURO] Referência por Data de Despacho

**Status:** 🔮 Implementação Futura (Fase 2)

**Situação Atual:**
O prazo de auto-release é calculado a partir da data de criação do pedido (`createdAt`).

**Problema:**
Alguns vendedores podem demorar para despachar o produto, consumindo parte do prazo de proteção do comprador antes mesmo do envio.

**Solução Proposta:**
Recalcular o prazo de auto-release quando o vendedor marcar o pedido como "Enviado" (`shippedAt`).

```typescript
// IMPLEMENTAÇÃO FUTURA
async onOrderShipped(orderId: string) {
  const order = await this.prisma.order.findUnique({ where: { id: orderId } });

  // Recalcular prazo a partir da data de envio
  const newAutoReleaseDate = new Date(order.shippedAt);
  newAutoReleaseDate.setDate(
    newAutoReleaseDate.getDate() + order.estimatedDeliveryDays + SAFETY_MARGIN
  );

  // Atualizar escrow on-chain (se suportado pelo pallet)
  // OU atualizar apenas no banco para referência
  await this.prisma.order.update({
    where: { id: orderId },
    data: {
      autoReleaseDate: newAutoReleaseDate,
      autoReleaseRecalculatedAt: new Date(),
    },
  });
}
```

**Complexidade:** Média
**Benefício:** Proteção mais precisa para o comprador
**Dependência:** Verificar se o pallet suporta atualização de `auto_release_at` após lock

---

### 9.2 [FUTURO] Expansão do Limite Máximo para Internacional

**Status:** 🔮 Implementação Futura (quando necessário)

**Situação Atual:**
O limite máximo de escrow é 30 dias, definido no pallet (`MaxAutoReleaseBlocks`).

**Cenários Futuros:**
- Importação da China: 45-60 dias
- Frete marítimo internacional: 60-90 dias
- Dropshipping internacional: 30-45 dias

**Solução:**
Quando a Bazari expandir para operações internacionais, ajustar o parâmetro `MaxAutoReleaseBlocks` na chain:

```rust
// runtime/src/lib.rs - AJUSTE FUTURO
parameter_types! {
    // Atual: 30 dias
    pub const MaxAutoReleaseBlocks: BlockNumber = 30 * DAYS;

    // Futuro: 60 dias para suportar internacional
    // pub const MaxAutoReleaseBlocks: BlockNumber = 60 * DAYS;
}
```

**Nota:** Esta mudança requer atualização da chain via governança.

---

### 9.3 [FUTURO] Split de Escrow por Grupo de Entrega

**Status:** 🔮 Implementação Futura (Fase 3)

**Situação Atual:**
Pedidos com múltiplos produtos usam `Math.max()` para pegar o maior prazo.

**Limitação:**
Se um pedido tem:
- Produto A: SEDEX, 3 dias
- Produto B: PAC, 15 dias

O prazo total será 22 dias (15 + 7), mesmo que o Produto A chegue em 3 dias.

**Solução Proposta:**
Criar múltiplos escrows por "grupo de entrega":

```typescript
// IMPLEMENTAÇÃO FUTURA
interface DeliveryGroup {
  items: OrderItem[];
  shippingMethod: ShippingMethod;
  estimatedDays: number;
  escrowId: number;
  autoReleaseBlocks: number;
}

async createSplitEscrows(order: Order): Promise<DeliveryGroup[]> {
  // Agrupar itens por método de envio
  const groups = groupBy(order.items, 'shippingMethod');

  // Criar escrow separado para cada grupo
  return Promise.all(
    groups.map(group => this.createEscrowForGroup(group))
  );
}
```

**Complexidade:** Alta
**Benefício:** Liberação parcial mais rápida para itens entregues primeiro
**Trade-off:** Maior complexidade de gerenciamento e taxas de transação

---

### 9.4 [FUTURO] Integração com Rastreamento de Correios

**Status:** 🔮 Implementação Futura

**Conceito:**
Usar dados de rastreamento dos Correios/transportadora para:
1. Detectar entrega automática (status "Entregue")
2. Ajustar prazo se houver atrasos reportados
3. Notificar comprador sobre status

```typescript
// IMPLEMENTAÇÃO FUTURA
interface TrackingEvent {
  code: string;
  status: 'POSTED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'DELAYED';
  timestamp: Date;
  location: string;
}

async onTrackingUpdate(orderId: string, event: TrackingEvent) {
  if (event.status === 'DELIVERED') {
    // Iniciar countdown de confirmação (ex: 3 dias para confirmar)
    await this.startDeliveryConfirmationCountdown(orderId);
  }

  if (event.status === 'DELAYED') {
    // Estender prazo automaticamente
    await this.extendAutoReleaseDeadline(orderId, 7); // +7 dias
  }
}
```

**Dependência:** API dos Correios ou integração com gateway de rastreamento

---

## 10. RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Vendedor informa prazo muito longo | Média | Médio | Limite máximo de 30 dias |
| Vendedor informa prazo muito curto | Média | Alto | **Prazo mínimo por método de envio** (PAC ≥ 10, SEDEX ≥ 3, etc.) |
| Vendedor demora para despachar | Média | Médio | [FUTURO] Recalcular prazo a partir de `shippedAt` |
| Confusão do usuário | Média | Baixo | UI clara com timeline visual |
| Retrocompatibilidade | Baixa | Médio | Default de 7 dias mantido |
| Entregas internacionais > 30 dias | Baixa | Médio | [FUTURO] Ajustar `MaxAutoReleaseBlocks` na chain |

---

## 11. CRONOGRAMA SUGERIDO

| Fase | Atividade | Duração |
|------|-----------|---------|
| 1 | Aprovação da proposta | 1 dia |
| 2 | Schema migration | 1 dia |
| 3 | Backend implementation | 2 dias |
| 4 | Frontend implementation | 2 dias |
| 5 | Testes | 1 dia |
| 6 | Deploy e monitoramento | 1 dia |
| **Total** | | **8 dias** |

---

## 12. APROVAÇÃO

| Papel | Nome | Data | Status |
|-------|------|------|--------|
| Product Owner | | | Pendente |
| Tech Lead | | | Pendente |
| QA Lead | | | Pendente |

---

## 13. DEPENDÊNCIAS

### Pré-requisito Obrigatório

Esta proposta **depende** da implementação prévia da:

- **[PROPOSAL-000: Delivery & Shipping Fields Infrastructure](./PROPOSAL-000-DELIVERY-SHIPPING-FIELDS.md)**

A PROPOSAL-000 implementa os campos necessários:
- `Product.estimatedDeliveryDays` - Input para cálculo do prazo
- `Product.shippingMethod` - Input para validação de prazo mínimo
- `Order.shippedAt` - Base para evolução futura
- Endpoint `POST /orders/:id/ship` - Fluxo completo de status

**Sequência de implementação:**
```
PROPOSAL-000 (3 dias) → PROPOSAL-001 (8 dias)
```

---

## 14. REFERÊNCIAS

- [PROPOSAL-000: Delivery & Shipping Fields](./PROPOSAL-000-DELIVERY-SHIPPING-FIELDS.md) - Pré-requisito
- [04-PROOF-OF-COMMERCE.md](../blockchain-integration/04-PROOF-OF-COMMERCE.md) - Documentação do PoC
- [bazari-escrow/SPEC.md](../pallets/bazari-escrow/SPEC.md) - Especificação do pallet
- [bazari-escrow/INTEGRATION.md](../pallets/bazari-escrow/INTEGRATION.md) - Guia de integração

---

## CHANGELOG

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0 | 2025-11-28 | Sistema | Versão inicial da proposta |
| 1.1 | 2025-11-28 | Sistema | Adicionado: Prazo mínimo por método de envio (seção 2.3); Atualizado: EscrowCalculatorService com validação de mínimos; Adicionado: Seção 9 - Evoluções Futuras (referência por shippedAt, limite internacional, split de escrow, integração com rastreamento) |
| 1.2 | 2025-11-28 | Sistema | Adicionado: Seção 13 - Dependências; Referência à PROPOSAL-000 como pré-requisito obrigatório |
| 1.3 | 2025-11-29 | Claude | Implementado: Seção 4.4 - EscrowTimeline component; Arquivos criados: EscrowTimeline.tsx, i18n keys (pt/en/es); Integração com PaymentProtectionCard e OrderPage; UX melhorada para mostrar data de entrega e data de proteção separadamente |
