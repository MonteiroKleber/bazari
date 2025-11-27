# FASE 6: Correções Críticas - Escrow/Dispute Integration

**Estimativa:** 2-3 dias
**Prioridade:** CRÍTICA (BLOQUEIA PRODUÇÃO)
**Pré-requisitos:** Fases 1-5 completas
**Status:** PENDENTE

---

## CONTEXTO

Este documento foi criado após auditoria de segurança (Relatório 2) que identificou **5 problemas críticos** no fluxo de escrow implementado nas Fases 1-5.

### Problemas Identificados:

| # | Problema | Severidade | Status Atual |
|---|----------|------------|--------------|
| 1 | Auto-release ignora disputas | 🔴 CRÍTICO | ❌ Não implementado |
| 2 | /release e /refund não funcionam | 🔴 CRÍTICO | ❌ Quebrado |
| 3 | Atualizações duplicadas no DB | 🟡 MÉDIO | ⚠️ Race condition |
| 4 | /confirm-lock redundante | 🟢 BAIXO | Código duplicado |
| 5 | PaymentIntent vs Escrow inconsistente | 🟡 MÉDIO | Modelo legado |

---

## OBJETIVO

Corrigir os problemas críticos identificados na auditoria, garantindo:

1. Disputas bloqueiam auto-release
2. Release/refund funcionam corretamente (pattern prepare+sign)
3. Worker é a única fonte de atualização do DB
4. Modelo de escrow é consistente (non-custodial)

---

## ARQUITETURA CORRIGIDA

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FLUXO CORRIGIDO                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. LOCK ESCROW (Frontend assina - JÁ FUNCIONA)                            │
│  ┌──────────┐     ┌─────────────────┐     ┌──────────┐     ┌────────────┐  │
│  │ Frontend │────▶│ /prepare-lock   │────▶│ Frontend │────▶│ Blockchain │  │
│  │          │     │ (get call data) │     │ signs TX │     │ lockFunds  │  │
│  └──────────┘     └─────────────────┘     └──────────┘     └────────────┘  │
│                                                                             │
│  2. RELEASE (Frontend assina - NOVO)                                        │
│  ┌──────────┐     ┌─────────────────┐     ┌──────────┐     ┌────────────┐  │
│  │ Frontend │────▶│ /prepare-release│────▶│ Frontend │────▶│ Blockchain │  │
│  │ (buyer)  │     │    (NOVO)       │     │ signs TX │     │ releaseFund│  │
│  └──────────┘     └─────────────────┘     └──────────┘     └────────────┘  │
│                                                                             │
│  3. REFUND (Multisig DAO - NOVO)                                           │
│  ┌──────────┐     ┌─────────────────┐     ┌──────────┐     ┌────────────┐  │
│  │ DAO      │────▶│ /prepare-refund │────▶│ Council  │────▶│ Blockchain │  │
│  │ Member   │     │    (NOVO)       │     │ Multisig │     │ refund     │  │
│  └──────────┘     └─────────────────┘     └──────────┘     └────────────┘  │
│                                                                             │
│  4. DISPUTA (NOVO - Bloqueia auto-release)                                 │
│  ┌──────────┐     ┌─────────────────┐     ┌────────────┐                  │
│  │ Frontend │────▶│ bazari-dispute  │────▶│ bazari-    │                  │
│  │          │     │ openDispute     │     │ escrow     │                  │
│  └──────────┘     └─────────────────┘     │ markDispute│ ◀── PALLET NOVO  │
│                                           └────────────┘                   │
│                                                                             │
│  5. AUTO-RELEASE (Worker verifica disputa)                                 │
│  ┌─────────────┐                                                           │
│  │ AutoRelease │──── status === 'Locked'? ──YES──┐                        │
│  │ Worker      │                                  │                        │
│  └─────────────┘                                  ▼                        │
│        │                              ┌─────────────────────┐              │
│        │                              │ Query bazari-dispute│              │
│        │                              │ Existe disputa?     │              │
│        │                              └─────────────────────┘              │
│        │                                    │         │                    │
│        │                                   YES        NO                   │
│        │                                    │         │                    │
│        │                                    ▼         ▼                    │
│        │                                 SKIP    releaseFunds()            │
│        │                                                                    │
│        └─── status === 'Disputed'? ───YES────▶ SKIP (não libera)          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## IMPLEMENTAÇÃO

### PARTE A: Backend - Novas Rotas (Prepare Pattern)

**Arquivo:** `apps/api/src/routes/blockchain/escrow.ts`

#### A.1 - POST /prepare-release (NOVO)

```typescript
// ============================================================================
// POST /api/blockchain/escrow/:orderId/prepare-release - Preparar release para frontend assinar
// ============================================================================
app.post('/escrow/:orderId/prepare-release', { preHandler: authOnRequest }, async (request, reply) => {
  try {
    const { orderId } = orderIdParamsSchema.parse(request.params);
    const authUser = (request as any).authUser as { sub: string; address: string };

    // 1. Buscar order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return reply.status(404).send({ error: 'Order not found' });
    }

    // 2. Validar que caller é o buyer
    if (order.buyerAddr !== authUser.address) {
      return reply.status(403).send({ error: 'Unauthorized: only buyer can release' });
    }

    // 3. Verificar escrow on-chain
    const api = await blockchainService.getApi();
    const escrowData = await api.query.bazariEscrow.escrows(orderId);

    if (escrowData.isNone) {
      return reply.status(400).send({ error: 'Escrow not found on blockchain' });
    }

    const escrow = escrowData.unwrap();
    const status = escrow.status.toString();

    // 4. Verificar status é 'Locked' (não Disputed, Released, etc)
    if (status !== 'Locked') {
      return reply.status(400).send({
        error: 'Invalid escrow status for release',
        currentStatus: status,
        message: status === 'Disputed'
          ? 'Cannot release disputed escrow. Wait for dispute resolution.'
          : `Escrow already ${status.toLowerCase()}`,
      });
    }

    // 5. Verificar se não há disputa ativa no bazari-dispute
    // (Mesmo que escrow status seja Locked, pode haver disputa pendente)
    try {
      const disputes = await api.query.bazariDispute.disputes.entries();
      const activeDispute = disputes.find(([_, dispute]: [any, any]) => {
        const d = dispute.unwrap();
        return d.orderId.toString() === orderId &&
               d.status.toString() !== 'Resolved';
      });

      if (activeDispute) {
        return reply.status(400).send({
          error: 'Order has active dispute',
          message: 'Cannot release funds while dispute is active. Wait for resolution.',
        });
      }
    } catch (e) {
      // Se pallet dispute não existe ou erro de query, continuar
      app.log.warn('Could not check disputes:', e);
    }

    // 6. Preparar call data para frontend assinar
    const callData = api.tx.bazariEscrow.releaseFunds(orderId);

    return {
      orderId,
      buyer: escrow.buyer.toString(),
      seller: escrow.seller.toString(),
      amount: escrow.amountLocked.toString(),
      callHex: callData.toHex(),
      callHash: callData.hash.toHex(),
      method: 'bazariEscrow.releaseFunds',
      // Info adicional para UI
      signerAddress: authUser.address, // Quem deve assinar
      signerRole: 'buyer',
    };
  } catch (error) {
    app.log.error(error);
    return reply.status(500).send({
      error: 'Failed to prepare release transaction',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
```

#### A.2 - POST /prepare-refund (NOVO)

```typescript
// ============================================================================
// POST /api/blockchain/escrow/:orderId/prepare-refund - Preparar refund para DAO assinar
// ============================================================================
app.post('/escrow/:orderId/prepare-refund', { preHandler: authOnRequest }, async (request, reply) => {
  try {
    const { orderId } = orderIdParamsSchema.parse(request.params);
    const authUser = (request as any).authUser as { sub: string; address: string };

    // 1. Verificar se é membro do Council
    const api = await blockchainService.getApi();

    let isDAOMember = false;
    try {
      const members = await api.query.council.members();
      const membersList = members.toJSON() as string[];
      isDAOMember = membersList.includes(authUser.address);
    } catch (error) {
      app.log.warn('Failed to query council members:', error);
    }

    if (!isDAOMember) {
      return reply.status(403).send({ error: 'Unauthorized: DAO members only' });
    }

    // 2. Buscar order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return reply.status(404).send({ error: 'Order not found' });
    }

    // 3. Verificar escrow on-chain
    const escrowData = await api.query.bazariEscrow.escrows(orderId);

    if (escrowData.isNone) {
      return reply.status(400).send({ error: 'Escrow not found on blockchain' });
    }

    const escrow = escrowData.unwrap();
    const status = escrow.status.toString();

    // Refund permitido para: Locked ou Disputed
    if (!['Locked', 'Disputed'].includes(status)) {
      return reply.status(400).send({
        error: 'Invalid escrow status for refund',
        currentStatus: status,
      });
    }

    // 4. Preparar call data
    // NOTA: Refund requer DAOOrigin no pallet, então precisa de multisig ou sudo
    const callData = api.tx.bazariEscrow.refund(orderId);

    return {
      orderId,
      buyer: escrow.buyer.toString(),
      seller: escrow.seller.toString(),
      amount: escrow.amountLocked.toString(),
      callHex: callData.toHex(),
      callHash: callData.hash.toHex(),
      method: 'bazariEscrow.refund',
      // Info para multisig
      requiresOrigin: 'DAO', // Precisa ser chamado via council/sudo
      note: 'This call requires DAOOrigin. Use council multisig or sudo.',
    };
  } catch (error) {
    app.log.error(error);
    return reply.status(500).send({
      error: 'Failed to prepare refund transaction',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
```

#### A.3 - Remover rotas obsoletas

```typescript
// REMOVER ou DEPRECAR:
// - POST /escrow/:orderId/lock (backend assina - não funciona)
// - POST /escrow/:orderId/release (backend assina - não funciona)
// - POST /escrow/:orderId/refund (backend assina - não funciona)
// - POST /escrow/:orderId/confirm-lock (redundante com worker)

// Manter como deprecated com warning:
app.post('/escrow/:orderId/lock', { preHandler: authOnRequest }, async (request, reply) => {
  return reply.status(410).send({
    error: 'Deprecated',
    message: 'Use /prepare-lock instead. Frontend must sign the transaction.',
    alternative: '/api/blockchain/escrow/:orderId/prepare-lock',
  });
});

// ... mesma coisa para /release e /refund
```

---

### PARTE B: Worker - Verificação de Disputa

**Arquivo:** `apps/api/src/workers/escrow-auto-release.worker.ts`

#### B.1 - Adicionar verificação de disputa

```typescript
// Antes de chamar releaseFunds, verificar:

// 1. Status do escrow
if (status !== 'Locked') {
  this.stats.skipped++;
  continue;
}

// 2. Verificar status Disputed (caso pallet tenha sido atualizado)
if (status === 'Disputed') {
  this.logger.info({ orderId: order.id }, '[AutoRelease] Skipping disputed order');
  this.stats.skipped++;
  continue;
}

// 3. Verificar disputa no pallet bazari-dispute
try {
  const hasActiveDispute = await this.checkActiveDispute(api, order.id);
  if (hasActiveDispute) {
    this.logger.info({ orderId: order.id }, '[AutoRelease] Skipping - active dispute found');
    this.stats.skipped++;
    continue;
  }
} catch (e) {
  // Se não conseguir verificar, é mais seguro NÃO liberar
  this.logger.warn({ orderId: order.id, error: e }, '[AutoRelease] Could not check dispute, skipping');
  this.stats.skipped++;
  continue;
}

// ... continuar com releaseFunds

// Nova função:
private async checkActiveDispute(api: ApiPromise, orderId: string): Promise<boolean> {
  try {
    // Iterar todas as disputas (pode ser otimizado com index)
    const disputes = await api.query.bazariDispute.disputes.entries();

    for (const [_, disputeOption] of disputes) {
      if (disputeOption.isNone) continue;

      const dispute = disputeOption.unwrap();
      if (dispute.orderId.toString() === orderId) {
        const status = dispute.status.toString();
        // Disputa ativa = não resolvida
        if (status !== 'Resolved') {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    this.logger.error({ error, orderId }, '[AutoRelease] Error checking disputes');
    // Em caso de erro, assumir que pode ter disputa (fail-safe)
    return true;
  }
}
```

---

### PARTE C: Frontend - Hooks Atualizados

**Arquivo:** `apps/web/src/hooks/blockchain/useEscrow.ts`

#### C.1 - usePrepareRelease (NOVO)

```typescript
/**
 * Hook: Preparar release para assinatura
 *
 * @example
 * const { prepareRelease, callData, isLoading } = usePrepareRelease();
 *
 * const handleRelease = async () => {
 *   const prepared = await prepareRelease(orderId);
 *   if (prepared) {
 *     // Usar polkadot-js extension para assinar
 *     const { web3FromAddress } = await import('@polkadot/extension-dapp');
 *     const injector = await web3FromAddress(prepared.signerAddress);
 *
 *     const api = await getApi();
 *     const tx = api.tx(prepared.callHex);
 *     await tx.signAndSend(prepared.signerAddress, { signer: injector.signer });
 *   }
 * };
 */
export function usePrepareRelease() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callData, setCallData] = useState<PreparedCall | null>(null);

  const prepareRelease = async (orderId: string): Promise<PreparedCall | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/blockchain/escrow/${orderId}/prepare-release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Auth header
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || 'Failed to prepare release');
      }

      const data = await response.json();
      setCallData(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    prepareRelease,
    callData,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

interface PreparedCall {
  orderId: string;
  buyer: string;
  seller: string;
  amount: string;
  callHex: string;
  callHash: string;
  method: string;
  signerAddress: string;
  signerRole: 'buyer' | 'seller' | 'dao';
}
```

---

### PARTE D: Pallet (Opcional mas Recomendado)

**Arquivo:** `bazari-chain/pallets/bazari-escrow/src/lib.rs`

#### D.1 - Adicionar extrinsic mark_disputed

```rust
/// Mark escrow as disputed
///
/// Called by bazari-dispute pallet when dispute is opened.
/// Prevents auto-release while dispute is active.
#[pallet::call_index(4)]
#[pallet::weight(10_000)]
pub fn mark_disputed(
    origin: OriginFor<T>,
    order_id: u64,
) -> DispatchResult {
    // Apenas pode ser chamado pelo pallet dispute (ou root)
    // Opção 1: Root only
    ensure_root(origin)?;

    // Opção 2: Criar DisputeOrigin configurável
    // T::DisputeOrigin::ensure_origin(origin)?;

    let mut escrow = Escrows::<T>::get(order_id)
        .ok_or(Error::<T>::EscrowNotFound)?;

    // Só pode disputar se estiver Locked
    ensure!(
        escrow.status == EscrowStatus::Locked,
        Error::<T>::InvalidStatus
    );

    // Marcar como disputado
    escrow.status = EscrowStatus::Disputed;
    escrow.updated_at = frame_system::Pallet::<T>::block_number();

    Escrows::<T>::insert(order_id, escrow);

    // Evento
    Self::deposit_event(Event::EscrowDisputed { order_id });

    Ok(())
}
```

**Arquivo:** `bazari-chain/pallets/bazari-dispute/src/lib.rs`

#### D.2 - Chamar mark_disputed ao abrir disputa

```rust
pub fn open_dispute(
    origin: OriginFor<T>,
    order_id: u64,
    evidence_cid: Vec<u8>,
) -> DispatchResult {
    let plaintiff = ensure_signed(origin)?;

    // ... código existente ...

    // NOVO: Marcar escrow como disputado
    // Usando pallet_bazari_escrow como dependência
    pallet_bazari_escrow::Pallet::<T>::mark_disputed_internal(order_id)?;

    // Ou via extrinsic se mark_disputed for público:
    // Isso requer que dispute pallet tenha Root access ou origin especial

    // ... resto do código ...

    Ok(())
}
```

---

## CHECKLIST DE IMPLEMENTAÇÃO

### Backend
- [ ] Criar `POST /prepare-release`
- [ ] Criar `POST /prepare-refund`
- [ ] Deprecar `POST /lock` (retornar 410)
- [ ] Deprecar `POST /release` (retornar 410)
- [ ] Deprecar `POST /refund` (retornar 410)
- [ ] Remover `POST /confirm-lock` (redundante com worker)

### Worker
- [ ] Adicionar função `checkActiveDispute()`
- [ ] Modificar `run()` para verificar disputa antes de release
- [ ] Adicionar log quando skip por disputa

### Frontend
- [ ] Criar hook `usePrepareRelease()`
- [ ] Criar hook `usePrepareRefund()`
- [ ] Atualizar `EscrowActions.tsx` para usar novos hooks
- [ ] Integrar com polkadot-js extension para assinatura

### Pallet (Opcional)
- [ ] Adicionar `mark_disputed` em bazari-escrow
- [ ] Chamar `mark_disputed` em bazari-dispute.open_dispute
- [ ] Adicionar evento `EscrowDisputed`

---

## TESTES

### Teste 1: Release funciona (buyer assina)
1. Criar order com escrow locked
2. Chamar `POST /prepare-release` como buyer
3. Assinar transação no frontend com polkadot-js
4. Verificar escrow status = Released

### Teste 2: Release bloqueado para não-buyer
1. Criar order com escrow locked
2. Chamar `POST /prepare-release` como seller → Erro 403

### Teste 3: Auto-release bloqueado por disputa
1. Criar order com escrow locked
2. Abrir disputa no bazari-dispute
3. Aguardar 7 dias (ou simular blocos)
4. Worker deve SKIP, não liberar

### Teste 4: Refund requer DAO
1. Criar order com escrow locked
2. Chamar `POST /prepare-refund` como usuário comum → Erro 403
3. Chamar como membro do council → Success

---

## RISCOS MITIGADOS

| Risco Original | Mitigação |
|----------------|-----------|
| Auto-release ignora disputas | Worker verifica disputa antes de release |
| /release não funciona | Novo pattern prepare+sign |
| /refund não funciona | Novo pattern prepare+sign para DAO |
| Atualizações duplicadas | Removido /confirm-lock, worker é único |
| PaymentIntent inconsistente | Documentado como legado |

---

## PRÓXIMOS PASSOS

Após implementar esta fase:
1. **Fase 7**: Implementar UI completa de disputas (P0-05 do Relatório 1)
2. **Fase 8**: Completar sistema de affiliates (P0-04 do Relatório 1)
