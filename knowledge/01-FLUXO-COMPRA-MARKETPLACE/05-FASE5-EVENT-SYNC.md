# FASE 5: Event Sync (Escrow Events)

**Estimativa:** 0.5 dia
**Prioridade:** BAIXA (mas importante para auditoria)
**Pré-requisitos:** Fase 1 completa (eventos sendo emitidos on-chain)
**Status:** IMPLEMENTADO

---

## OBJETIVO

Adicionar handlers para sincronizar eventos do pallet `bazari-escrow` (`EscrowLocked`, `FundsReleased`, `BuyerRefunded`) com o PostgreSQL, mantendo histórico completo e permitindo auditoria.

---

## IMPLEMENTAÇÃO ATUAL (STATUS: COMPLETO)

### Arquivos Modificados:

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `apps/api/src/services/blockchain/blockchain-events.service.ts` | MODIFICADO | Adicionados tipos e detecção de eventos escrow |
| `apps/api/src/workers/blockchain-sync.worker.ts` | MODIFICADO | Adicionados handlers de escrow |

### Tipos de Eventos Adicionados:

```typescript
// Em blockchain-events.service.ts

export interface EscrowLockedEvent {
  orderId: string;
  buyer: string;
  seller: string;
  amount: string;
  txHash: string;
  blockNumber: number;
}

export interface FundsReleasedEvent {
  orderId: string;
  seller: string;
  amount: string;
  txHash: string;
  blockNumber: number;
}

export interface BuyerRefundedEvent {
  orderId: string;
  buyer: string;
  amount: string;
  txHash: string;
  blockNumber: number;
}
```

### Handlers Adicionados na Interface:

```typescript
export interface EventHandlers {
  // ... existentes ...
  // Escrow Events
  onEscrowLocked?: EventHandler<EscrowLockedEvent>;
  onFundsReleased?: EventHandler<FundsReleasedEvent>;
  onBuyerRefunded?: EventHandler<BuyerRefundedEvent>;
  onError?: (error: Error) => void;
}
```

### Stats Atualizados:

```typescript
export interface SyncStats {
  ordersCreated: number;
  proofsSubmitted: number;
  disputesOpened: number;
  escrowsLocked: number;     // NOVO
  fundsReleased: number;     // NOVO
  buyersRefunded: number;    // NOVO
  errors: number;
  lastHeartbeat: Date | null;
  lastEvent: Date | null;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}
```

### Fluxo de Processamento:

```
EVENTO NA BLOCKCHAIN
        ↓
BlockchainEventsService.startListening()
        ↓
processEscrowEvents() - Detecta evento do pallet bazariEscrow
        ↓
Chama handler registrado (onEscrowLocked, onFundsReleased, onBuyerRefunded)
        ↓
BlockchainSyncWorker.handleEscrowLocked/FundsReleased/BuyerRefunded()
        ↓
1. Busca Order pelo externalOrderId
2. Atualiza status do Order (ESCROWED, RELEASED, REFUNDED)
3. Cria EscrowLog com kind (LOCK, RELEASE, REFUND)
4. Incrementa stats
```

---

## HANDLERS IMPLEMENTADOS

### handleEscrowLocked

- Busca Order pelo `externalOrderId` (blockchain orderId)
- Atualiza status para `ESCROWED`
- Cria `EscrowLog` com `kind: 'LOCK'`
- Incrementa `stats.escrowsLocked`

### handleFundsReleased

- Busca Order pelo `externalOrderId`
- Atualiza status para `RELEASED`
- Cria `EscrowLog` com `kind: 'RELEASE'`
- Incrementa `stats.fundsReleased`

### handleBuyerRefunded

- Busca Order pelo `externalOrderId`
- Atualiza status para `REFUNDED`
- Cria `EscrowLog` com `kind: 'REFUND'`
- Incrementa `stats.buyersRefunded`

---

## FORMATO DO ESCROWLOG

```json
{
  "orderId": "uuid-do-order",
  "kind": "LOCK | RELEASE | REFUND",
  "payloadJson": {
    "buyer": "5Grwv...",
    "seller": "5Hbxv...",
    "amount": "1000000000000",
    "txHash": "0x...",
    "blockNumber": 123456,
    "timestamp": "2025-01-15T10:30:00.000Z"
  }
}
```

---

## TESTES

### Teste 1: Sync de Lock
1. Criar escrow via pallet (não pelo backend)
2. Verificar worker detectou evento
3. Verificar EscrowLog foi criado com kind='LOCK'
4. Verificar Order status é 'ESCROWED'

### Teste 2: Sync de Release
1. Com escrow locked, chamar releaseFunds via pallet
2. Verificar worker detectou evento
3. Verificar EscrowLog foi criado com kind='RELEASE'
4. Verificar Order status é 'RELEASED'

### Teste 3: Sync de Refund
1. Com escrow locked, chamar refund via pallet
2. Verificar worker detectou evento
3. Verificar EscrowLog foi criado com kind='REFUND'
4. Verificar Order status é 'REFUNDED'

### Teste 4: Stats
1. Processar múltiplos eventos
2. Verificar stats.escrowsLocked, fundsReleased, buyersRefunded
3. Verificar heartbeat log mostra valores corretos

---

## CONSIDERAÇÕES

### Resiliência

- Worker já tem reconnect automático
- Eventos perdidos durante desconexão não são recuperados
- Para produção: considerar replay de blocos perdidos

### Performance

- Busca de Order por externalOrderId é indexada
- Para alto volume: considerar cache em memória

### Auditoria

- Todos os eventos são salvos no EscrowLog com payloadJson contendo txHash e blockNumber
- Útil para auditoria e debugging

### Consistência

- Worker atualiza Order automaticamente baseado em eventos
- Isso garante que status no DB reflita estado real na blockchain

---

## DEPENDÊNCIAS

Esta fase requer:
- **Fase 1:** Eventos de escrow sendo emitidos on-chain ✅
- Worker de sync funcionando ✅

Esta fase completa o fluxo de compra 100% integrado com blockchain.
