# FASE 3: Auto-Release Worker

**Estimativa:** 1 dia
**Prioridade:** MÉDIA
**Pré-requisitos:** Fase 1 completa (escrow funcionando on-chain)
**Status:** IMPLEMENTADO

---

## OBJETIVO

Criar um worker que monitora escrows ativos e automaticamente libera fundos para o seller após 7 dias (100.800 blocos) se o buyer não confirmar ou contestar.

---

## IMPLEMENTAÇÃO ATUAL (STATUS: COMPLETO)

### Arquivos Criados/Modificados:

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `apps/api/src/workers/escrow-auto-release.worker.ts` | CRIADO | Worker de auto-release |
| `apps/api/src/server.ts` | MODIFICADO | Importa e inicializa worker no boot + graceful shutdown |

### Fluxo do Worker:

```
A CADA 1 HORA:

1. Busca orders com status ESCROWED ou SHIPPED no DB
2. Para cada order:
   a. Query escrow on-chain (api.query.bazariEscrow.escrows)
   b. Se escrow não existe ou status != 'Locked', pula
   c. Calcula blocos desde lock (currentBlock - lockedAt)
   d. Se blocksElapsed >= 100,800 (7 dias):
      - Chama releaseFunds on-chain
      - Atualiza Order.status → RELEASED
      - Atualiza PaymentIntent (se existir)
      - Cria EscrowLog com kind='AUTO_RELEASE'
3. Loga estatísticas (checked, released, errors, skipped)
```

---

## FUNCIONALIDADES EXISTENTES (REUTILIZADAS)

1. **BlockchainService** - `apps/api/src/services/blockchain/blockchain.service.ts`
   - `getApi()` ✅
   - `getCurrentBlock()` ✅
   - `signAndSend()` ✅
   - `getEscrowAccount()` ✅

2. **Endpoint de Escrows Urgentes** - `apps/api/src/routes/blockchain/escrow.ts`
   - `GET /api/blockchain/escrow/urgent` - Lista escrows próximos do auto-release ✅

3. **Constantes** (definidas no worker):
   ```typescript
   const AUTO_RELEASE_BLOCKS = 100_800; // 7 dias = 100,800 blocos (6s/block)
   ```

---

## CONFIGURAÇÃO DO WORKER

```typescript
// Em server.ts
autoReleaseWorker = startEscrowAutoReleaseWorker(prisma, {
  logger: app.log,
  intervalMs: 60 * 60 * 1000, // 1 hora
  // dryRun: true, // Habilitar em ambiente de teste
});
```

### Opções:

| Opção | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `logger` | any | console | Logger para output |
| `intervalMs` | number | 3600000 (1h) | Intervalo entre execuções |
| `dryRun` | boolean | false | Se true, apenas loga mas não executa release |

---

## ESTATÍSTICAS

O worker expõe estatísticas via `getStats()`:

```typescript
interface AutoReleaseStats {
  checked: number;   // Orders verificadas
  released: number;  // Escrows liberados com sucesso
  errors: number;    // Erros durante processamento
  skipped: number;   // Orders sem escrow ou já released
  lastRun: Date | null;
}
```

---

## LOGS CRIADOS

### EscrowLog (kind: 'AUTO_RELEASE')

```json
{
  "orderId": "uuid",
  "kind": "AUTO_RELEASE",
  "payloadJson": {
    "txHash": "0x...",
    "blockNumber": "123456",
    "lockedAt": 100000,
    "releasedAt": 200800,
    "blocksElapsed": 100800,
    "reason": "Automatic release after 7 days",
    "timestamp": "2025-01-15T10:30:00.000Z"
  }
}
```

### EscrowLog (kind: 'AUTO_RELEASE_ERROR')

```json
{
  "orderId": "uuid",
  "kind": "AUTO_RELEASE_ERROR",
  "payloadJson": {
    "error": "Error message",
    "blocksElapsed": 100850,
    "timestamp": "2025-01-15T10:30:00.000Z"
  }
}
```

---

## TESTES

### Teste 1: Dry Run
1. Criar escrow locked há mais de 7 dias (mock ou testnet)
2. Executar worker com `dryRun: true`
3. Verificar logs indicam release seria feito
4. Verificar escrow NÃO foi liberado

### Teste 2: Auto-Release Real
1. Criar escrow locked há mais de 7 dias
2. Executar `runAutoReleaseOnce(prisma, { logger: console })`
3. Verificar escrow foi liberado on-chain
4. Verificar order status é `RELEASED`
5. Verificar `EscrowLog` foi criado com kind `AUTO_RELEASE`

### Teste 3: Escrow Dentro do Prazo
1. Criar escrow locked há 1 dia
2. Executar worker
3. Verificar escrow NÃO foi liberado
4. Verificar logs indicam remaining blocks > 0

### Teste 4: Worker Periódico
1. Iniciar worker com intervalo de 10 segundos (para teste)
2. Verificar execução automática
3. Verificar stats são atualizados corretamente

---

## CONSIDERAÇÕES

### Intervalo de Execução

- **Produção:** 1 hora (60 * 60 * 1000 ms)
- **Staging:** 15 minutos
- **Teste:** Sob demanda ou 1 minuto

### Graceful Shutdown

O worker para corretamente quando o servidor desliga:
```typescript
app.addHook('onClose', async () => {
  if (autoReleaseWorker) {
    autoReleaseWorker.stop();
  }
});
```

### Concurrency Protection

O worker tem proteção contra execuções concorrentes:
```typescript
if (this.isRunning) {
  this.logger.warn('[AutoRelease] Worker already running, skipping...');
  return { ...this.stats };
}
```

### Retry Strategy

Se release falhar:
- Log erro com detalhes
- Cria EscrowLog com kind='AUTO_RELEASE_ERROR'
- Tenta novamente na próxima execução (1 hora)

---

## DEPENDÊNCIAS

Esta fase requer:
- **Fase 1:** Escrow funcionando on-chain ✅
- Model `EscrowLog` no Prisma ✅

Esta fase desbloqueia:
- Dashboard de escrows urgentes (já existe endpoint)
- Alertas de auto-release iminente

---

## FUNÇÕES EXPORTADAS

```typescript
// Classe principal
export class EscrowAutoReleaseWorker {
  constructor(prisma: PrismaClient, options?: AutoReleaseWorkerOptions);
  run(): Promise<AutoReleaseStats>;
  start(intervalMs?: number): void;
  stop(): void;
  getStats(): AutoReleaseStats;
}

// Helper para iniciar com intervalo
export function startEscrowAutoReleaseWorker(
  prisma: PrismaClient,
  options?: AutoReleaseWorkerOptions & { intervalMs?: number }
): EscrowAutoReleaseWorker;

// Helper para executar uma vez
export async function runAutoReleaseOnce(
  prisma: PrismaClient,
  options?: AutoReleaseWorkerOptions
): Promise<AutoReleaseStats>;
```
