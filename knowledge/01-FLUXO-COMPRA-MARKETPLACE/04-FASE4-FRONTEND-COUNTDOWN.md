# FASE 4: Frontend Countdown Timer

**Estimativa:** 0.5 dia
**Prioridade:** MÉDIA
**Pré-requisitos:** Fase 1 completa (escrow funcionando on-chain com `lockedAt` real)
**Status:** IMPLEMENTADO

---

## OBJETIVO

Integrar o componente `CountdownTimer` existente na página de detalhes do pedido, mostrando o tempo restante até auto-release baseado no bloco `lockedAt` real do blockchain.

---

## IMPLEMENTAÇÃO ATUAL (STATUS: COMPLETO)

### Funcionalidades JÁ EXISTENTES (NÃO PRECISARAM SER CRIADAS):

1. **CountdownTimer Component** - `apps/web/src/components/blockchain/CountdownTimer.tsx`
   - Componente visual com barra de progresso ✅
   - Props: `targetTimestamp`, `totalDuration`, `showProgress`, `compact` ✅

2. **EscrowCard Component** - `apps/web/src/components/escrow/EscrowCard.tsx`
   - Usa `CountdownTimer` para exibir countdown ✅
   - Calcula `autoReleaseTimestamp` baseado em `currentBlock` e `autoReleaseAt` ✅

3. **PaymentProtectionCard Component** - `apps/web/src/components/escrow/PaymentProtectionCard.tsx`
   - Versão compacta do EscrowCard para integração na OrderPage ✅
   - Usa `useEscrowDetails` hook ✅

4. **useEscrowDetails Hook** - `apps/web/src/hooks/blockchain/useEscrow.ts`
   - Query escrow via API ✅
   - Interface `EscrowDetails` com todos os campos necessários ✅
   - `refetchInterval: 10000` (10 segundos) ✅

5. **Current Block API** - `apps/api/src/routes/blockchain/utils.ts`
   - Endpoint `GET /api/blockchain/current-block` ✅
   - Atualização a cada 6 segundos no frontend ✅

6. **OrderPage Integration** - `apps/web/src/pages/OrderPage.tsx`
   - Já integra `PaymentProtectionCard` com countdown ✅
   - Faz polling de `currentBlock` via `useBlockchainQuery` ✅

### Arquivo Modificado:

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `apps/api/src/routes/blockchain/escrow.ts` | MODIFICADO | Adicionados campos `autoReleaseAt`, `amountFormatted`, `state`, `createdAt` |

---

## MODIFICAÇÕES REALIZADAS

### Backend: GET /api/blockchain/escrow/:orderId

**Antes:**
```typescript
return {
  exists: true,
  orderId,
  buyer: escrow.buyer.toString(),
  seller: escrow.seller.toString(),
  amountLocked: escrow.amountLocked.toString(),
  amountReleased: escrow.amountReleased.toString(),
  status: escrow.status.toString(),
  lockedAt: escrow.lockedAt.toNumber(),
  updatedAt: escrow.updatedAt.toNumber(),
};
```

**Depois:**
```typescript
return {
  exists: true,
  orderId,
  buyer: escrow.buyer.toString(),
  seller: escrow.seller.toString(),
  amount: amountLocked,              // Raw amount (planck)
  amountLocked,                      // Alias for compatibility
  amountFormatted: formatBzr(amountLocked), // Human-readable BZR
  amountReleased: escrow.amountReleased.toString(),
  status,                            // Raw status
  state: mapStatusToState(status),   // Frontend EscrowState
  createdAt: lockedAt,              // Block number when created
  lockedAt,                          // Alias for compatibility
  autoReleaseAt: lockedAt + AUTO_RELEASE_BLOCKS, // Block for auto-release
  updatedAt: escrow.updatedAt.toNumber(),
};
```

### Helpers Adicionados:

```typescript
// Constants
const AUTO_RELEASE_BLOCKS = 100_800; // 7 dias

// Format BZR amount
function formatBzr(planck: string): string {
  const value = BigInt(planck);
  const divisor = BigInt(10 ** 12);
  const wholePart = value / divisor;
  const fractionalPart = value % divisor;
  return `${wholePart}.${fractionalPart.toString().padStart(12, '0').slice(0, 2)}`;
}

// Map status to frontend state
function mapStatusToState(status: string): 'Active' | 'Released' | 'Refunded' | 'Disputed' {
  switch (status) {
    case 'Locked': return 'Active';
    case 'Released': return 'Released';
    case 'Refunded':
    case 'PartialRefund': return 'Refunded';
    case 'Disputed': return 'Disputed';
    default: return 'Active';
  }
}
```

---

## FLUXO DE DADOS

```
OrderPage.tsx
    │
    ├── useBlockchainQuery('/api/blockchain/current-block')
    │   └── { currentBlock: number }
    │
    └── <PaymentProtectionCard orderId={id} currentBlock={currentBlock} />
            │
            ├── useEscrowDetails(orderId)
            │   └── GET /api/blockchain/escrow/:orderId
            │       └── { autoReleaseAt, amountFormatted, state, ... }
            │
            └── <CountdownTimer
                    targetTimestamp={Date.now() + (autoReleaseAt - currentBlock) * 6000}
                    compact={true}
                />
```

---

## COMPONENTES ENVOLVIDOS

### 1. OrderPage.tsx (Página de Detalhes do Pedido)

```typescript
// Query current block
const { data: blockData } = useBlockchainQuery<{ currentBlock: number }>({
  endpoint: '/api/blockchain/current-block',
  refetchInterval: 6000, // Update every block (6s)
});

// Render PaymentProtectionCard
{id && (
  <PaymentProtectionCard
    orderId={id}
    currentBlock={blockData?.currentBlock ?? 0}
  />
)}
```

### 2. PaymentProtectionCard.tsx (Card de Proteção de Pagamento)

```typescript
const { data: escrow, isLoading, error } = useEscrowDetails(orderId);

// Compact countdown (Active only)
{escrow.state === EscrowState.Active && (
  <CountdownTimer
    targetTimestamp={
      Date.now() + (escrow.autoReleaseAt - currentBlock) * 6 * 1000
    }
    compact={true}
  />
)}
```

### 3. EscrowCard.tsx (Card Completo de Escrow)

```typescript
// Calculate auto-release timestamp
const blocksUntilRelease = autoReleaseAt - currentBlock;
const secondsUntilRelease = blocksUntilRelease * 6;
const autoReleaseTimestamp = Date.now() + secondsUntilRelease * 1000;
const totalDuration = 7 * 24 * 60 * 60 * 1000; // 7 days

// Full countdown with progress bar
{state === EscrowState.Active && showCountdown && !compact && (
  <CountdownTimer
    targetTimestamp={autoReleaseTimestamp}
    totalDuration={totalDuration}
    showProgress={true}
  />
)}
```

---

## TESTES

### Teste 1: Countdown Aparece
1. Criar order com escrow locked
2. Navegar para `/app/orders/:id`
3. Verificar `PaymentProtectionCard` aparece
4. Verificar countdown está contando

### Teste 2: Countdown Preciso
1. Anotar tempo exibido no countdown
2. Calcular manualmente: `(autoReleaseAt - currentBlock) * 6 segundos`
3. Comparar valores (devem ser aproximados)

### Teste 3: Estados Diferentes
- Escrow Active → Mostra countdown + badge "Active"
- Escrow Released → Mostra "Funds released to seller" + badge "Released"
- Escrow Refunded → Mostra "Buyer refunded by DAO" + badge "Refunded"
- Escrow Disputed → Mostra info da disputa + badge "Disputed"

---

## CONSIDERAÇÕES

### Cálculo do Countdown

```typescript
// Backend calcula autoReleaseAt
autoReleaseAt = lockedAt + 100_800 // blocos

// Frontend calcula timestamp
blocksUntilRelease = autoReleaseAt - currentBlock
secondsUntilRelease = blocksUntilRelease * 6 // 6s por bloco
targetTimestamp = Date.now() + (secondsUntilRelease * 1000)
```

### Atualização

- `currentBlock` atualizado a cada 6 segundos via polling
- `escrow` atualizado a cada 10 segundos via `useEscrowDetails`
- `CountdownTimer` usa `setInterval` interno para countdown visual

---

## DEPENDÊNCIAS

Esta fase requer:
- **Fase 1:** Escrow funcionando on-chain com `lockedAt` real ✅
- Componentes `EscrowCard`, `PaymentProtectionCard` e `CountdownTimer` ✅

Esta fase não bloqueia outras fases.
