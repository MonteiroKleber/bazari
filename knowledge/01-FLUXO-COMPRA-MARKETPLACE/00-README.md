# Fluxo de Compra Marketplace - Implementação Blockchain

Este diretório contém os prompts de implementação para integrar o fluxo de compra do marketplace Bazari com os pallets blockchain.

---

## STATUS CONSOLIDADO (Atualizado: 2025-11-26)

### Fases 1-7: IMPLEMENTADAS ✅
### Fase 8: PENDENTE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STATUS DAS FASES                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FASE 1 - Escrow Real ...................... ✅ IMPLEMENTADO                │
│  FASE 2 - Commerce On-Chain ................ ✅ IMPLEMENTADO                │
│  FASE 3 - Auto-Release Worker .............. ✅ IMPLEMENTADO                │
│  FASE 4 - Frontend Countdown ............... ✅ IMPLEMENTADO                │
│  FASE 5 - Event Sync ....................... ✅ IMPLEMENTADO                │
│  FASE 6 - Correções Críticas ............... ✅ IMPLEMENTADO                │
│  FASE 7 - Sistema de Disputas UI ........... ✅ IMPLEMENTADO (2025-11-26)   │
│  ─────────────────────────────────────────────────────────────────────────  │
│  FASE 8 - Completar Affiliates ............. ⚠️ PENDENTE (~50% feito)       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Problemas Críticos Identificados (Relatório 2) - RESOLVIDOS:

| # | Problema | Severidade | Status |
|---|----------|------------|--------|
| 1 | Auto-release ignora disputas | 🔴 CRÍTICO | ✅ CORRIGIDO |
| 2 | /release e /refund não funcionam | 🔴 CRÍTICO | ✅ CORRIGIDO |
| 3 | Atualizações duplicadas no DB | 🟡 MÉDIO | ✅ CORRIGIDO |
| 4 | /confirm-lock redundante | 🟢 BAIXO | ✅ DEPRECATED |
| 5 | PaymentIntent inconsistente | 🟡 MÉDIO | ⚠️ Documentado

---

## Visão Geral

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUXO DE COMPRA - ARQUITETURA CORRIGIDA                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FRONTEND                    BACKEND                      BLOCKCHAIN        │
│  ────────                    ───────                      ──────────        │
│                                                                             │
│  /checkout                   POST /orders                                   │
│     │                           │                                           │
│     └──────────────────────────►├─────────► Cria Order no PostgreSQL        │
│                                 │                                           │
│                                 └─────────► bazariCommerce.createOrder()    │
│                                                                             │
│  /pay                        POST /prepare-lock                             │
│     │                           │                                           │
│     └──────────────────────────►└─────────► Retorna callHex                 │
│     │                                                                       │
│     └─────────────────────► FRONTEND ASSINA TX ────► bazariEscrow.lockFunds │
│                                                                             │
│  [Buyer confirma]            POST /prepare-release (NOVO - Fase 6)          │
│     │                           │                                           │
│     └──────────────────────────►└─────────► Retorna callHex                 │
│     │                                                                       │
│     └─────────────────────► FRONTEND ASSINA TX ─► bazariEscrow.releaseFunds │
│                                                                             │
│  [7 dias + sem disputa]      Auto-Release Worker                            │
│     │                           │                                           │
│     │                           ├─────────► Verifica disputa (NOVO - Fase 6)│
│     │                           │                                           │
│     └───────────────────────────└─────────► bazariEscrow.releaseFunds()     │
│                                                                             │
│  [Disputa aberta]            Frontend → Blockchain                          │
│     │                           │                                           │
│     └─────────────────────────────────────► bazariDispute.openDispute()     │
│                                             │                               │
│                                             └──► bazariEscrow.markDisputed()│
│                                                                             │
│  [Background]                Blockchain Sync Worker                         │
│                                 │                                           │
│                                 └─────────► Escuta eventos on-chain         │
│                                             (única fonte de atualização DB) │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Fases de Implementação

| Fase | Estimativa | Prioridade | Status | Descrição | Arquivo |
|------|------------|------------|--------|-----------|---------|
| **1** | 3 dias | CRÍTICA | ✅ | Escrow Real (lock/release/refund) | [01-FASE1-ESCROW-REAL.md](./01-FASE1-ESCROW-REAL.md) |
| **2** | 2 dias | ALTA | ✅ | Commerce On-Chain (createOrder) | [02-FASE2-COMMERCE-ONCHAIN.md](./02-FASE2-COMMERCE-ONCHAIN.md) |
| **3** | 1 dia | MÉDIA | ✅ | Auto-Release Worker | [03-FASE3-AUTO-RELEASE-WORKER.md](./03-FASE3-AUTO-RELEASE-WORKER.md) |
| **4** | 0.5 dia | MÉDIA | ✅ | Frontend Countdown | [04-FASE4-FRONTEND-COUNTDOWN.md](./04-FASE4-FRONTEND-COUNTDOWN.md) |
| **5** | 0.5 dia | BAIXA | ✅ | Event Sync | [05-FASE5-EVENT-SYNC.md](./05-FASE5-EVENT-SYNC.md) |
| **6** | 2-3 dias | 🔴 CRÍTICA | ✅ | **Correções Críticas** | [06-CORRECOES-CRITICAS.md](./06-CORRECOES-CRITICAS.md) |
| **7** | 5-7 dias | ALTA | ✅ | Sistema de Disputas UI | [07-DISPUTE-SYSTEM-FULL.md](./07-DISPUTE-SYSTEM-FULL.md) |
| **8** | 3-4 dias | ALTA | ⚠️ | Completar Sistema Affiliates | [08-AFFILIATE-COMPLETION.md](./08-AFFILIATE-COMPLETION.md) |

**Fases 1-7 Total: 15-17 dias** ✅ COMPLETO
**Fase 8 Total: 3-4 dias** ⚠️ PENDENTE

---

## Ordem de Execução (ATUALIZADA)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DEPENDÊNCIAS ENTRE FASES                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  IMPLEMENTADO:                                                              │
│  ─────────────                                                              │
│  Fase 1 ──┬──► Fase 3 ──► Fase 5                                           │
│           │                                                                 │
│           └──► Fase 4                                                       │
│                                                                             │
│  Fase 2 ──────► (Independente)                                             │
│                                                                             │
│  Fase 6 ─────────────────► IMPLEMENTADO (2025-11-26)                       │
│     │                     (Correções de segurança)                          │
│     │                                                                       │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  PENDENTE:                                                                  │
│  ─────────                                                                  │
│                                                                             │
│     ├──► Fase 7 ──────────► Sistema de Disputas (UI)                       │
│     │                       (Fase 6 já fornece integração backend)          │
│     │                                                                       │
│     └──► Fase 8 ──────────► Affiliates (PARALELO, independente)            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Ordem de Execução Recomendada:**

1. **FASE 6** ✅ COMPLETO (2025-11-26)
   - Corrigido: /release e /refund agora usam pattern prepare+sign
   - Corrigido: Auto-release worker verifica disputas antes de liberar
   - Criados: endpoints /prepare-release e /prepare-refund
   - Criados: hooks usePrepareRelease() e usePrepareRefund()
   - Pallet: mark_disputed adicionado ao bazari-escrow
   - Pallet: bazari-dispute agora marca escrow como Disputed

2. **FASE 7** ✅ COMPLETO (2025-11-26) - Sistema de Disputas UI
   - Backend: `apps/api/src/routes/blockchain/dispute.ts` - Rotas de disputas
   - Frontend Hooks: `apps/web/src/hooks/blockchain/useDispute.ts`
   - Páginas:
     - `apps/web/src/modules/disputes/pages/DisputeDetailPage.tsx`
     - `apps/web/src/modules/disputes/pages/MyDisputesPage.tsx`
   - Componentes:
     - `DisputeTimeline.tsx` - Linha do tempo das fases
     - `VotingPanel.tsx` - Painel de votação para jurados
     - `CommitVoteModal.tsx` - Modal commit-reveal commit
     - `RevealVoteModal.tsx` - Modal commit-reveal reveal
     - `JurorSelectionCard.tsx` - Card de status dos jurados
     - `EvidenceViewer.tsx` - Visualizador de evidências IPFS
     - `DisputeCard.tsx` - Card resumo de disputa
   - Rotas: `/app/disputes` e `/app/disputes/:disputeId`

3. **FASE 8 PRÓXIMA** (Affiliates)
   - Independente das outras fases
   - Completar sistema de afiliados

---

## Checklist Geral

### Pré-requisitos
- [ ] Bazari Chain rodando (local ou remoto)
- [ ] Pallets deployados:
  - [ ] `bazari-escrow`
  - [ ] `bazari-commerce`
- [ ] Conta de backend configurada (`BAZARICHAIN_SUDO_SEED`)
- [ ] PostgreSQL rodando
- [ ] Prisma migrations aplicadas

### Verificação de Pallets
```typescript
const api = await getApi();

// Verificar pallets disponíveis
console.log('Available pallets:', Object.keys(api.tx));

// Verificar extrinsics do escrow
console.log('Escrow extrinsics:', Object.keys(api.tx.bazariEscrow || {}));

// Verificar extrinsics do commerce
console.log('Commerce extrinsics:', Object.keys(api.tx.bazariCommerce || {}));

// Verificar eventos
console.log('Escrow events:', Object.keys(api.events.bazariEscrow || {}));
console.log('Commerce events:', Object.keys(api.events.bazariCommerce || {}));
```

---

## Funcionalidades Existentes (NÃO DUPLICAR)

Antes de implementar qualquer fase, verificar o que JÁ EXISTE:

### Backend Routes
- `apps/api/src/routes/blockchain/escrow.ts` - Rotas de escrow
- `apps/api/src/routes/blockchain/commerce.ts` - Rotas de commerce
- `apps/api/src/routes/blockchain/dispute.ts` - Rotas de disputas **(FASE 7)**
- `apps/api/src/routes/orders.ts` - Rotas de orders

### Services
- `apps/api/src/services/blockchain/blockchain.service.ts` - BlockchainService com métodos:
  - `createOrder()` - JÁ EXISTE, não está sendo chamado!
  - `signAndSend()` - Assinar e enviar transações
  - `getApi()` - Obter conexão API
  - `getEscrowAccount()` - Obter conta de escrow

### Workers
- `apps/api/src/workers/blockchain-sync.worker.ts` - Sync de eventos

### Frontend Hooks
- `apps/web/src/hooks/blockchain/useEscrow.ts` - Hooks de escrow:
  - `useEscrowDetails()` - Query escrow on-chain
  - `useReleaseFunds()` - DEPRECATED (usar usePrepareRelease)
  - `useRefundBuyer()` - DEPRECATED (usar usePrepareRefund)
  - `usePrepareRelease()` - **NOVO (Fase 6)** - Prepare+sign pattern para release
  - `usePrepareRefund()` - **NOVO (Fase 6)** - Prepare+sign pattern para refund (DAO)
- `apps/web/src/hooks/blockchain/useCommerce.ts` - Hooks de commerce
- `apps/web/src/hooks/blockchain/useDispute.ts` - Hooks de disputas **(FASE 7)**:
  - `useDisputes()` - Lista todas disputas
  - `useDispute(id)` - Detalhes de uma disputa
  - `useMyDisputes()` - Disputas do usuário
  - `useJuryDisputes()` - Disputas como jurado
  - `usePrepareOpenDispute()` - Preparar abertura de disputa
  - `usePrepareCommitVote()` - Preparar commit de voto
  - `usePrepareRevealVote()` - Preparar reveal de voto
  - `usePrepareExecuteRuling()` - Preparar execução do ruling

### Frontend Components
- `apps/web/src/components/escrow/EscrowCard.tsx` - Card de escrow com countdown
- `apps/web/src/components/blockchain/CountdownTimer.tsx` - Timer visual
- `apps/web/src/modules/disputes/` - Módulo de disputas **(FASE 7)**:
  - `pages/DisputeDetailPage.tsx` - Detalhes da disputa
  - `pages/MyDisputesPage.tsx` - Lista de disputas do usuário
  - `components/DisputeTimeline.tsx` - Linha do tempo
  - `components/VotingPanel.tsx` - Painel de votação
  - `components/CommitVoteModal.tsx` - Modal para commit
  - `components/RevealVoteModal.tsx` - Modal para reveal
  - `components/JurorSelectionCard.tsx` - Card de jurados
  - `components/EvidenceViewer.tsx` - Visualizador de evidências
  - `components/DisputeCard.tsx` - Card resumo

---

## Princípio CRÍTICO

> **"Verificar implementações de funções e estruturas já criadas para não duplicar funcionalidades. Tem que ser muito rígido nessa questão, não queremos duplicar funcionalidades. Qualquer dúvida, pare a implementação e tire dúvida."**

### Antes de cada implementação:

1. **Buscar código existente:**
   ```bash
   # Buscar por função ou classe
   grep -r "functionName" apps/

   # Buscar por arquivo
   find apps/ -name "*escrow*"
   ```

2. **Verificar hooks existentes:**
   ```bash
   ls apps/web/src/hooks/blockchain/
   ```

3. **Verificar rotas existentes:**
   ```bash
   grep -r "app.get\|app.post" apps/api/src/routes/
   ```

4. **Se encontrar implementação similar:**
   - Analisar se atende ao requisito
   - Reutilizar ou estender ao invés de criar novo
   - Se não atender, documentar por quê antes de criar novo

---

## Contato

Em caso de dúvidas durante a implementação:
1. Parar imediatamente
2. Documentar a dúvida
3. Consultar com o responsável do projeto

Nunca assumir que algo não existe - sempre verificar primeiro!
