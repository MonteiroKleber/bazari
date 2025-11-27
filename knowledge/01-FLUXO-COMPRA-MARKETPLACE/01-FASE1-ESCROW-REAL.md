# FASE 1: Escrow Real (Lock/Release/Refund)

**Estimativa:** 3 dias
**Prioridade:** CRÍTICA
**Pré-requisitos:** Nenhum

---

## OBJETIVO

Integrar o fluxo de pagamento existente com o pallet `bazari-escrow` on-chain, substituindo a transferência direta (`balances.transferKeepAlive`) pelo sistema de escrow real (`bazariEscrow.lockFunds`).

---

## AVISO IMPORTANTE: EVITAR DUPLICAÇÃO

### Funcionalidades JÁ EXISTENTES (NÃO REIMPLEMENTAR):

1. **Routes de Escrow Backend** - `apps/api/src/routes/blockchain/escrow.ts`
   - `GET /api/blockchain/escrow/:orderId` - Buscar status do escrow ✅
   - `POST /api/blockchain/escrow/:orderId/lock` - Travar fundos ✅
   - `POST /api/blockchain/escrow/:orderId/release` - Liberar fundos ✅
   - `POST /api/blockchain/escrow/:orderId/refund` - Refund (DAO only) ✅
   - `POST /api/blockchain/escrow/:orderId/dispute` - Marcar como disputado ✅
   - `GET /api/blockchain/escrow/:orderId/events` - Histórico de eventos ✅
   - `GET /api/blockchain/escrow/active` - Listar escrows ativos ✅
   - `GET /api/blockchain/escrow/urgent` - Escrows próximos do auto-release ✅

2. **Hooks Frontend** - `apps/web/src/hooks/blockchain/useEscrow.ts`
   - `useEscrowDetails(orderId)` - Query escrow state ✅
   - `useReleaseFunds()` - Mutation: buyer releases funds ✅
   - `useRefundBuyer()` - Mutation: DAO refunds buyer ✅
   - `useEscrowEvents(orderId)` - WebSocket listener ✅
   - `useActiveEscrows()` - Admin/DAO view ✅
   - `useEscrowsNearAutoRelease()` - Admin view ✅
   - `useUserEscrows(userAddress)` - User's escrow history ✅
   - `useInitiateDispute()` - Mutation: initiate dispute ✅

3. **Componentes de Escrow** - `apps/web/src/components/escrow/`
   - `EscrowCard.tsx` - Display escrow state and details ✅
   - `PaymentProtectionCard.tsx` ✅
   - `EscrowEventsLog.tsx` ✅
   - `EscrowBreadcrumbs.tsx` ✅
   - `EscrowActions.tsx` ✅

4. **BlockchainService** - `apps/api/src/services/blockchain/blockchain.service.ts`
   - `signAndSend(tx, signer)` - Assinar e enviar transação ✅
   - `getApi()` - Get API instance ✅
   - `getEscrowAccount()` - Get escrow account ✅
   - `getCurrentBlock()` - Get block number atual ✅

### O QUE PRECISA SER MODIFICADO (NÃO CRIADO):

1. **OrderPayPage.tsx** - Mudar de `transferKeepAlive` para chamada ao endpoint `/api/blockchain/escrow/:orderId/lock`
2. **routes/orders.ts** - Release endpoint precisa chamar `/api/blockchain/escrow/:orderId/release`

---

## TAREFAS DETALHADAS

### 1. Modificar OrderPayPage.tsx

**Arquivo:** `apps/web/src/modules/orders/pages/OrderPayPage.tsx`

**Localização atual do problema (linhas 115-151):**
```typescript
// CÓDIGO ATUAL (ERRADO - transferência direta)
const tx = api.tx.balances.transferKeepAlive(intentData.escrowAddress, intentData.amountBzr);
```

**ALTERAÇÃO NECESSÁRIA:**

Substituir a chamada direta `api.tx.balances.transferKeepAlive` por uma chamada à API REST que aciona o pallet escrow:

```typescript
// CÓDIGO NOVO (CORRETO - via API backend)
const response = await fetch(`/api/blockchain/escrow/${order.id}/lock`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`, // Obter token do auth
  },
});

if (!response.ok) {
  const error = await response.json();
  throw new Error(error.message || 'Failed to lock funds');
}

const result = await response.json();
// result: { success: true, txHash: string, orderId: string, blockNumber: string }
```

**PORÉM**, existe uma questão: o endpoint `/api/blockchain/escrow/:orderId/lock` usa `serverKey` (backend) para assinar. Para manter a arquitetura atual onde o **usuário assina**, precisamos:

**OPÇÃO A (Recomendada):** Criar novo endpoint que retorna a transação unsigned para o frontend assinar:

```typescript
// Backend: Novo endpoint
app.post('/escrow/:orderId/prepare-lock', { preHandler: authOnRequest }, async (request, reply) => {
  const { orderId } = orderIdParamsSchema.parse(request.params);

  // Buscar order e validar
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return reply.status(404).send({ error: 'Order not found' });

  const api = await blockchainService.getApi();
  const totalBzr = BigInt(order.totalBzr.toString());

  // Retornar call data para frontend assinar
  const callData = api.tx.bazariEscrow.lockFunds(orderId, order.sellerAddr, totalBzr);

  return {
    orderId,
    seller: order.sellerAddr,
    amount: totalBzr.toString(),
    callHex: callData.toHex(),
    callHash: callData.hash.toHex(),
  };
});
```

**OPÇÃO B:** Manter assinatura no backend (simplifica frontend, mas centraliza assinatura).

**DECISÃO:** Confirmar com usuário qual opção preferir antes de implementar.

### 2. Atualizar Fluxo de Release

**Arquivo:** `apps/api/src/routes/orders.ts` (linhas 586-733)

**Problema atual:** O endpoint `POST /orders/:id/release` apenas atualiza o banco de dados:
```typescript
const updated = await prisma.order.update({
  where: { id },
  data: { status: 'RELEASED' },
});
```

**Não chama o pallet escrow!**

**ALTERAÇÃO NECESSÁRIA:**

Adicionar chamada ao endpoint de escrow release:

```typescript
// DENTRO do POST /orders/:id/release, após validações

// 1. Primeiro liberar no blockchain
const api = await blockchainService.getApi();
const escrowData = await api.query.bazariEscrow.escrows(id);

if (escrowData.isSome) {
  const escrow = escrowData.unwrap();
  if (escrow.status.toString() === 'Locked') {
    // Chamar release no pallet
    const serverKey = blockchainService.getEscrowAccount();
    const tx = api.tx.bazariEscrow.releaseFunds(id);
    const result = await blockchainService.signAndSend(tx, serverKey);

    // Atualizar paymentIntent com txHash
    if (order.paymentIntents[0]) {
      await prisma.paymentIntent.update({
        where: { id: order.paymentIntents[0].id },
        data: {
          txHashRelease: result.txHash,
          status: 'RELEASED',
        },
      });
    }
  }
}

// 2. Depois atualizar DB
const updated = await prisma.order.update({
  where: { id },
  data: { status: 'RELEASED' },
});
```

**NOTA:** O código já existe em `/api/blockchain/escrow/:orderId/release`. Podemos reutilizar chamando internamente ou importando a lógica.

### 3. Atualizar PaymentIntent Status

**Arquivo:** `apps/api/src/routes/orders.ts`

Após pagamento confirmado, atualizar status do PaymentIntent para `FUNDS_IN`:

```typescript
// Quando frontend confirmar que lockFunds foi bem sucedido
await prisma.paymentIntent.update({
  where: { id: paymentIntent.id },
  data: { status: 'FUNDS_IN' },
});

await prisma.order.update({
  where: { id: order.id },
  data: { status: 'ESCROWED' },
});
```

---

## ARQUIVOS A MODIFICAR

| Arquivo | Alteração |
|---------|-----------|
| `apps/web/src/modules/orders/pages/OrderPayPage.tsx` | Substituir `transferKeepAlive` por chamada escrow |
| `apps/api/src/routes/orders.ts` | Adicionar chamada blockchain no release |
| `apps/api/src/routes/blockchain/escrow.ts` | Adicionar endpoint `prepare-lock` (se OPÇÃO A) |

---

## VERIFICAÇÕES PRÉ-IMPLEMENTAÇÃO

Antes de começar, verificar:

1. [ ] O pallet `bazari-escrow` está deployado no chain?
2. [ ] A conta escrow (`BAZARICHAIN_SUDO_SEED`) tem permissão para chamar `releaseFunds`?
3. [ ] O storage `bazariEscrow.escrows` existe e está acessível?
4. [ ] A interface da API (`api.tx.bazariEscrow.lockFunds`) está correta?

**Comando para verificar pallets disponíveis:**
```typescript
const api = await getApi();
console.log(Object.keys(api.tx)); // Listar todos os pallets
console.log(Object.keys(api.tx.bazariEscrow || {})); // Listar extrinsics do pallet
```

---

## TESTES

### Teste 1: Lock Funds
1. Criar order via `/orders` POST
2. Criar payment intent via `/orders/:id/payment-intent` POST
3. Chamar `/api/blockchain/escrow/:orderId/lock` POST
4. Verificar escrow existe no chain: `api.query.bazariEscrow.escrows(orderId)`
5. Verificar status `Locked`

### Teste 2: Release Funds
1. Com escrow locked, chamar `/orders/:id/release` POST
2. Verificar escrow status mudou para `Released` no chain
3. Verificar order status no DB é `RELEASED`
4. Verificar `txHashRelease` foi salvo no PaymentIntent

### Teste 3: Refund (DAO)
1. Com escrow locked, chamar `/api/blockchain/escrow/:orderId/refund` POST (como DAO member)
2. Verificar escrow status mudou para `Refunded` no chain
3. Verificar order status no DB é `CANCELLED`

---

## ROLLBACK

Se algo der errado, reverter para o fluxo atual:
- OrderPayPage continua usando `transferKeepAlive`
- Release continua apenas atualizando DB

Isso garante que o marketplace continue funcionando enquanto debugamos.

---

## DEPENDÊNCIAS PARA PRÓXIMAS FASES

Esta fase desbloqueia:
- **Fase 3:** Auto-release worker (precisa de escrow real no chain)
- **Fase 4:** Frontend countdown (precisa de `lockedAt` real do chain)
- **Fase 5:** Event sync (precisa de eventos `EscrowLocked`, `FundsReleased`)
