# FASE 2: Commerce On-Chain

**Estimativa:** 2 dias
**Prioridade:** ALTA
**Pré-requisitos:** Fase 1 completa (escrow funcionando)
**Status:** IMPLEMENTADO

---

## OBJETIVO

Registrar pedidos no blockchain via pallet `bazari-commerce` quando criados, permitindo rastreabilidade on-chain e cálculo automático de comissões.

---

## IMPLEMENTAÇÃO ATUAL (STATUS: COMPLETO)

### Estratégia Implementada: Saga Pattern com Retry Worker

```
FLUXO DE CRIAÇÃO DE ORDER:

1. POST /orders recebe request
2. Order criada no DB com status='PENDING_BLOCKCHAIN'
3. Tenta criar on-chain (bazari-commerce.createOrder)
   - Se SUCESSO: status='CREATED', salva blockchainOrderId/txHash
   - Se FALHA: status='BLOCKCHAIN_FAILED', incrementa retries
4. Worker periódico (5min) retenta orders com falha
5. Após MAX_RETRIES (5), order permanece BLOCKCHAIN_FAILED
```

### Arquivos Modificados/Criados:

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `apps/api/prisma/schema.prisma` | MODIFICADO | Adicionado status PENDING_BLOCKCHAIN, BLOCKCHAIN_FAILED, campos blockchainRetries e blockchainError |
| `apps/api/src/routes/orders.ts` | MODIFICADO | POST /orders usa status intermediário e marca para retry |
| `apps/api/src/services/blockchain/blockchain.service.ts` | MODIFICADO | createOrder() extrai orderId do evento OrderCreated |
| `apps/api/src/workers/blockchain-order-sync.worker.ts` | CRIADO | Worker de retry para orders com falha blockchain |
| `apps/api/src/server.ts` | MODIFICADO | Registra BlockchainOrderSyncWorker no boot |

---

## NOVOS STATUS DE ORDER

```prisma
enum OrderStatus {
  CREATED               // Pronta para pagamento (sync blockchain OK)
  PENDING               // Legacy
  PENDING_BLOCKCHAIN    // Aguardando sync on-chain (intermediário)
  BLOCKCHAIN_FAILED     // Falha ao criar on-chain (retry pendente)
  ESCROWED
  SHIPPED
  RELEASED
  REFUNDED
  CANCELLED
  TIMEOUT
}
```

---

## NOVOS CAMPOS NO MODEL ORDER

```prisma
model Order {
  // ... campos existentes ...

  // Blockchain reference
  blockchainOrderId BigInt?   @db.BigInt  // On-chain OrderId (u64)
  blockchainTxHash  String?               // Transaction hash
  onChainStatus     String?               // Cache do status on-chain
  lastSyncedAt      DateTime?             // Última sincronização
  blockchainRetries Int       @default(0) // Tentativas de retry
  blockchainError   String?               // Último erro
}
```

---

## WORKER DE RETRY

### BlockchainOrderSyncWorker

**Arquivo:** `apps/api/src/workers/blockchain-order-sync.worker.ts`

**Responsabilidades:**
1. Busca orders com status `PENDING_BLOCKCHAIN` ou `BLOCKCHAIN_FAILED`
2. Tenta criar on-chain novamente
3. Sucesso: status → `CREATED`
4. Falha: incrementa `blockchainRetries`
5. Após 5 tentativas, mantém `BLOCKCHAIN_FAILED`

**Configuração:**
```typescript
startBlockchainOrderSyncWorker(prisma, {
  logger: app.log,
  intervalMs: 5 * 60 * 1000, // 5 minutos
  maxRetries: 5,
});
```

**Stats disponíveis:**
```typescript
const stats = worker.getStats();
// { checked, synced, failed, skipped, errors, lastRun }
```

**Force retry manual:**
```typescript
await worker.forceRetry(orderId);
```

---

## FLUXO DETALHADO

### 1. Criação de Order (POST /orders)

```typescript
// 1. Criar order no DB com status intermediário
const order = await prisma.order.create({
  data: {
    // ...
    status: 'PENDING_BLOCKCHAIN',
  },
});

// 2. Tentar criar on-chain
try {
  const result = await blockchainService.createOrder(...);

  // 3a. Sucesso: atualizar status
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'CREATED',
      blockchainOrderId: result.orderId,
      blockchainTxHash: result.txHash,
      lastSyncedAt: new Date(),
    },
  });
} catch (error) {
  // 3b. Falha: marcar para retry
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'BLOCKCHAIN_FAILED',
      blockchainRetries: 1,
      blockchainError: error.message,
    },
  });
}
```

### 2. Worker de Retry

```typescript
// A cada 5 minutos:
const pendingOrders = await prisma.order.findMany({
  where: {
    OR: [
      { status: 'PENDING_BLOCKCHAIN' },
      { status: 'BLOCKCHAIN_FAILED', blockchainRetries: { lt: 5 } },
    ],
  },
});

for (const order of pendingOrders) {
  try {
    const result = await blockchainService.createOrder(...);
    // Sucesso: status -> CREATED
  } catch {
    // Falha: incrementar retries
  }
}
```

---

## BENEFÍCIOS DA ESTRATÉGIA

### vs. "Best Effort" Simples:

| Aspecto | Best Effort | Saga + Worker |
|---------|-------------|---------------|
| Resiliência | Order fica sem blockchain | Worker retenta automaticamente |
| Visibilidade | Só via logs | Status indica falha |
| Recuperação | Manual | Automática (até MAX_RETRIES) |
| Auditoria | Difícil | Campos dedicados |

### Garantias:

1. **Order sempre existe no DB** - PostgreSQL é fonte primária
2. **Retry automático** - Worker tenta até 5x a cada 5 minutos
3. **Fallback gracioso** - Após MAX_RETRIES, order permanece utilizável
4. **Observabilidade** - Status, retries e error visíveis

---

## TESTES

### Teste 1: Criar Order (Blockchain OK)
1. POST /orders com items válidos
2. Verificar status inicial foi `PENDING_BLOCKCHAIN`
3. Verificar status final é `CREATED`
4. Verificar `blockchainOrderId` e `blockchainTxHash` preenchidos

### Teste 2: Criar Order (Blockchain Offline)
1. Desconectar blockchain
2. POST /orders
3. Verificar status é `BLOCKCHAIN_FAILED`
4. Verificar `blockchainRetries = 1`
5. Verificar `blockchainError` tem mensagem

### Teste 3: Worker Retry
1. Criar order com status `BLOCKCHAIN_FAILED`
2. Reconectar blockchain
3. Aguardar worker executar (ou chamar `runOrderSyncOnce`)
4. Verificar status mudou para `CREATED`

### Teste 4: Max Retries
1. Criar order com `blockchainRetries = 4`
2. Simular falha no worker
3. Verificar `blockchainRetries = 5`
4. Verificar worker pula esta order nas próximas execuções

---

## MONITORAMENTO

### Query para Orders com Problema:

```sql
SELECT id, status, blockchain_retries, blockchain_error, created_at
FROM "Order"
WHERE status IN ('PENDING_BLOCKCHAIN', 'BLOCKCHAIN_FAILED')
ORDER BY created_at ASC;
```

### Alertas Sugeridos:

1. **Orders estagnadas**: status `BLOCKCHAIN_FAILED` com `blockchainRetries >= 5`
2. **Muitas falhas**: mais de 10 orders em `BLOCKCHAIN_FAILED` em 1 hora
3. **Worker parado**: sem execução há mais de 10 minutos

---

## MIGRAÇÃO

Para aplicar as alterações no schema:

```bash
cd apps/api
pnpm prisma migrate dev --name add_blockchain_order_retry_fields
```

---

## FUNCIONALIDADES JÁ EXISTENTES (NÃO REIMPLEMENTAR)

1. **BlockchainService.createOrder()** - Já extrai orderId do evento ✅
2. **Commerce Routes Backend** - `apps/api/src/routes/blockchain/commerce.ts` ✅
3. **Commerce Hooks Frontend** - `apps/web/src/hooks/blockchain/useCommerce.ts` ✅
4. **BlockchainService.getOrder()** - Query order on-chain ✅

---

## DEPENDÊNCIAS PARA PRÓXIMAS FASES

Esta fase desbloqueia:
- **Fase 5:** Event sync pode sincronizar `OrderCreated` events
- Relatórios de comissões baseados em dados on-chain
- Auditoria completa de transações
- Dashboard de orders com problemas blockchain
