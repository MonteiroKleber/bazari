# FASE 7: Sistema de Disputas Completo

**Estimativa:** 5-7 dias
**Prioridade:** ALTA (P0-05 do Relatório 1)
**Pré-requisitos:** Fase 6 completa (correções críticas)
**Status:** PENDENTE

---

## CONTEXTO

### Status Atual (Relatório 1):
- Dispute System: **~10% implementado**
- Apenas `DisputePanel` básico existe
- Faltam: 3 páginas, 6+ componentes, 4+ hooks

### Dependências do Relatório 2:
- Fase 6 deve estar completa (integração escrow-dispute)
- Pallet `bazari-dispute` já está 100% implementado no blockchain

---

## OBJETIVO

Implementar o sistema completo de disputas conforme documentação em:
- `knowledge/04-ui-ux/bazari-dispute/UI-SPEC.md`
- `knowledge/04-ui-ux/bazari-dispute/COMPONENTS.md`
- `knowledge/04-ui-ux/bazari-dispute/PAGES.md`
- `knowledge/04-ui-ux/bazari-dispute/HOOKS.md`

---

## ARQUITETURA DO SISTEMA DE DISPUTAS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DISPUTE SYSTEM FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. ABRIR DISPUTA                                                          │
│  ┌──────────┐     ┌─────────────────┐     ┌─────────────────┐              │
│  │ Buyer or │────▶│ EvidenceUpload  │────▶│ bazari-dispute  │              │
│  │ Seller   │     │ Component       │     │ open_dispute()  │              │
│  └──────────┘     └─────────────────┘     └─────────────────┘              │
│                                                  │                          │
│  2. VRF JUROR SELECTION (Automático)            ▼                          │
│  ┌─────────────────────────────────────────────────────────┐               │
│  │ Pallet seleciona 5 jurados com reputação > 500          │               │
│  │ usando Verifiable Random Function                       │               │
│  └─────────────────────────────────────────────────────────┘               │
│                                                  │                          │
│  3. COMMIT PHASE (24 horas)                      ▼                          │
│  ┌──────────┐     ┌─────────────────┐     ┌─────────────────┐              │
│  │ Juror    │────▶│ CommitVoteModal │────▶│ commit_vote()   │              │
│  │          │     │ hash(vote+salt) │     │                 │              │
│  └──────────┘     └─────────────────┘     └─────────────────┘              │
│                                                  │                          │
│  4. REVEAL PHASE (24 horas)                      ▼                          │
│  ┌──────────┐     ┌─────────────────┐     ┌─────────────────┐              │
│  │ Juror    │────▶│ RevealVoteModal │────▶│ reveal_vote()   │              │
│  │          │     │ vote + salt     │     │                 │              │
│  └──────────┘     └─────────────────┘     └─────────────────┘              │
│                                                  │                          │
│  5. EXECUTE RULING (Qualquer um pode chamar)     ▼                          │
│  ┌─────────────────────────────────────────────────────────┐               │
│  │ execute_ruling() → Conta votos → Determina ruling       │               │
│  │ RefundBuyer | ReleaseSeller | PartialRefund(%)          │               │
│  └─────────────────────────────────────────────────────────┘               │
│                                                  │                          │
│  6. APLICAR RULING NO ESCROW                     ▼                          │
│  ┌─────────────────────────────────────────────────────────┐               │
│  │ Se RefundBuyer → escrow.refund()                        │               │
│  │ Se ReleaseSeller → escrow.release()                     │               │
│  │ Se PartialRefund → escrow.partial_refund()              │               │
│  └─────────────────────────────────────────────────────────┘               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## FUNCIONALIDADES JÁ EXISTENTES (NÃO DUPLICAR)

### Backend
- `apps/api/src/routes/blockchain/escrow.ts`:
  - `POST /escrow/:orderId/dispute` - Marcar como disputado ✅ (básico)

### Frontend
- `apps/web/src/components/dispute/DisputePanel.tsx` - Versão básica ✅

### Pallet
- `bazari-chain/pallets/bazari-dispute/src/lib.rs`:
  - `open_dispute()` ✅
  - `commit_vote()` ✅
  - `reveal_vote()` ✅
  - `execute_ruling()` ✅
  - VRF juror selection ✅
  - Commit-reveal voting ✅

---

## IMPLEMENTAÇÃO

### PARTE A: Backend - Routes de Dispute

**Arquivo:** `apps/api/src/routes/blockchain/dispute.ts` (NOVO)

```typescript
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../../lib/auth/middleware.js';
import { BlockchainService } from '../../services/blockchain/blockchain.service.js';

export async function disputeRoutes(
  app: FastifyInstance,
  options: FastifyPluginOptions & { prisma: PrismaClient }
) {
  const { prisma } = options;
  const blockchainService = BlockchainService.getInstance();

  // ============================================================================
  // GET /api/blockchain/disputes - Listar todas as disputas
  // ============================================================================
  app.get('/disputes', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const api = await blockchainService.getApi();
      const disputes = await api.query.bazariDispute.disputes.entries();

      const formattedDisputes = disputes.map(([key, disputeOption]: [any, any]) => {
        if (disputeOption.isNone) return null;

        const dispute = disputeOption.unwrap();
        return {
          disputeId: dispute.disputeId.toNumber(),
          orderId: dispute.orderId.toNumber(),
          plaintiff: dispute.plaintiff.toString(),
          defendant: dispute.defendant.toString(),
          jurors: dispute.jurors.map((j: any) => j.toString()),
          evidenceCid: Buffer.from(dispute.evidenceCid).toString('utf8'),
          status: dispute.status.toString(),
          ruling: dispute.ruling.isSome ? dispute.ruling.unwrap().toString() : null,
          createdAt: dispute.createdAt.toNumber(),
          commitDeadline: dispute.commitDeadline.toNumber(),
          revealDeadline: dispute.revealDeadline.toNumber(),
        };
      }).filter(Boolean);

      return {
        disputes: formattedDisputes,
        count: formattedDisputes.length,
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch disputes' });
    }
  });

  // ============================================================================
  // GET /api/blockchain/disputes/:disputeId - Detalhes de uma disputa
  // ============================================================================
  app.get('/disputes/:disputeId', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { disputeId } = z.object({ disputeId: z.string() }).parse(request.params);
      const id = parseInt(disputeId, 10);

      const api = await blockchainService.getApi();
      const disputeData = await api.query.bazariDispute.disputes(id);

      if (disputeData.isNone) {
        return reply.status(404).send({ error: 'Dispute not found' });
      }

      const dispute = disputeData.unwrap();
      const currentBlock = await blockchainService.getCurrentBlock();

      // Buscar votos revelados
      const revealedVotes = await api.query.bazariDispute.revealedVotes.entries(id);
      const votes = revealedVotes.map(([key, voteOption]: [any, any]) => {
        const [_, juror] = key.args;
        return {
          juror: juror.toString(),
          vote: voteOption.toString(),
        };
      });

      // Buscar commits
      const commits = await api.query.bazariDispute.voteCommits.entries(id);
      const commitStatus = commits.map(([key, commitOption]: [any, any]) => {
        const [_, juror] = key.args;
        const commit = commitOption.unwrap();
        return {
          juror: juror.toString(),
          committed: true,
          revealed: commit.revealed.isTrue,
        };
      });

      return {
        disputeId: dispute.disputeId.toNumber(),
        orderId: dispute.orderId.toNumber(),
        plaintiff: dispute.plaintiff.toString(),
        defendant: dispute.defendant.toString(),
        jurors: dispute.jurors.map((j: any) => j.toString()),
        evidenceCid: Buffer.from(dispute.evidenceCid).toString('utf8'),
        status: dispute.status.toString(),
        ruling: dispute.ruling.isSome ? dispute.ruling.unwrap().toString() : null,
        createdAt: dispute.createdAt.toNumber(),
        commitDeadline: dispute.commitDeadline.toNumber(),
        revealDeadline: dispute.revealDeadline.toNumber(),
        currentBlock: Number(currentBlock),
        // Calculated fields
        isInCommitPhase: Number(currentBlock) <= dispute.commitDeadline.toNumber(),
        isInRevealPhase: Number(currentBlock) > dispute.commitDeadline.toNumber() &&
                         Number(currentBlock) <= dispute.revealDeadline.toNumber(),
        canExecuteRuling: Number(currentBlock) > dispute.revealDeadline.toNumber(),
        // Votes
        votes,
        commitStatus,
        votesCount: votes.length,
        quorumReached: votes.length >= 3,
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch dispute' });
    }
  });

  // ============================================================================
  // POST /api/blockchain/disputes/prepare-open - Preparar abertura de disputa
  // ============================================================================
  const prepareOpenSchema = z.object({
    orderId: z.string(),
    evidenceCid: z.string().min(1).max(64),
  });

  app.post('/disputes/prepare-open', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { orderId, evidenceCid } = prepareOpenSchema.parse(request.body);
      const authUser = (request as any).authUser as { sub: string; address: string };

      // Verificar se order existe e caller é buyer ou seller
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        return reply.status(404).send({ error: 'Order not found' });
      }

      if (order.buyerAddr !== authUser.address && order.sellerAddr !== authUser.address) {
        return reply.status(403).send({ error: 'Only buyer or seller can open dispute' });
      }

      // Verificar escrow está locked
      const api = await blockchainService.getApi();
      const escrowData = await api.query.bazariEscrow.escrows(orderId);

      if (escrowData.isNone) {
        return reply.status(400).send({ error: 'No escrow found for this order' });
      }

      const escrow = escrowData.unwrap();
      if (escrow.status.toString() !== 'Locked') {
        return reply.status(400).send({
          error: 'Cannot dispute - escrow not locked',
          currentStatus: escrow.status.toString(),
        });
      }

      // Preparar call
      const orderIdNum = parseInt(orderId, 10);
      const callData = api.tx.bazariDispute.openDispute(orderIdNum, evidenceCid);

      return {
        orderId,
        evidenceCid,
        callHex: callData.toHex(),
        callHash: callData.hash.toHex(),
        method: 'bazariDispute.openDispute',
        signerAddress: authUser.address,
        signerRole: authUser.address === order.buyerAddr ? 'buyer' : 'seller',
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to prepare dispute' });
    }
  });

  // ============================================================================
  // POST /api/blockchain/disputes/:id/prepare-commit - Preparar commit de voto
  // ============================================================================
  const prepareCommitSchema = z.object({
    vote: z.enum(['RefundBuyer', 'ReleaseSeller']),
    salt: z.string().min(8),
  });

  app.post('/disputes/:disputeId/prepare-commit', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { disputeId } = z.object({ disputeId: z.string() }).parse(request.params);
      const { vote, salt } = prepareCommitSchema.parse(request.body);
      const authUser = (request as any).authUser as { sub: string; address: string };
      const id = parseInt(disputeId, 10);

      const api = await blockchainService.getApi();
      const disputeData = await api.query.bazariDispute.disputes(id);

      if (disputeData.isNone) {
        return reply.status(404).send({ error: 'Dispute not found' });
      }

      const dispute = disputeData.unwrap();

      // Verificar é jurado
      const isJuror = dispute.jurors.some((j: any) => j.toString() === authUser.address);
      if (!isJuror) {
        return reply.status(403).send({ error: 'Not a selected juror' });
      }

      // Verificar está na fase de commit
      const currentBlock = await blockchainService.getCurrentBlock();
      if (Number(currentBlock) > dispute.commitDeadline.toNumber()) {
        return reply.status(400).send({ error: 'Commit phase ended' });
      }

      // Calcular hash do voto
      // IMPORTANTE: Deve usar mesmo algoritmo que o pallet
      const voteEncoded = vote === 'RefundBuyer' ? [0] : [1]; // Simplificado
      const saltBytes = Buffer.from(salt, 'utf8');
      const toHash = [...voteEncoded, ...saltBytes];
      const commitHash = api.registry.hash(Buffer.from(toHash)).toHex();

      const callData = api.tx.bazariDispute.commitVote(id, commitHash);

      return {
        disputeId: id,
        vote,
        salt, // IMPORTANTE: Salvar para reveal!
        commitHash,
        callHex: callData.toHex(),
        callHash: callData.hash.toHex(),
        method: 'bazariDispute.commitVote',
        signerAddress: authUser.address,
        warning: 'Save your vote and salt! You will need them for the reveal phase.',
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to prepare commit' });
    }
  });

  // ============================================================================
  // POST /api/blockchain/disputes/:id/prepare-reveal - Preparar reveal de voto
  // ============================================================================
  const prepareRevealSchema = z.object({
    vote: z.enum(['RefundBuyer', 'ReleaseSeller']),
    salt: z.string().min(8),
  });

  app.post('/disputes/:disputeId/prepare-reveal', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { disputeId } = z.object({ disputeId: z.string() }).parse(request.params);
      const { vote, salt } = prepareRevealSchema.parse(request.body);
      const authUser = (request as any).authUser as { sub: string; address: string };
      const id = parseInt(disputeId, 10);

      const api = await blockchainService.getApi();
      const disputeData = await api.query.bazariDispute.disputes(id);

      if (disputeData.isNone) {
        return reply.status(404).send({ error: 'Dispute not found' });
      }

      const dispute = disputeData.unwrap();

      // Verificar está na fase de reveal
      const currentBlock = await blockchainService.getCurrentBlock();
      if (Number(currentBlock) <= dispute.commitDeadline.toNumber()) {
        return reply.status(400).send({ error: 'Reveal phase not started' });
      }
      if (Number(currentBlock) > dispute.revealDeadline.toNumber()) {
        return reply.status(400).send({ error: 'Reveal phase ended' });
      }

      // Verificar commit existe
      const commitData = await api.query.bazariDispute.voteCommits(id, authUser.address);
      if (commitData.isNone) {
        return reply.status(400).send({ error: 'No commit found for this juror' });
      }

      // Converter vote para o tipo do pallet
      const voteType = vote === 'RefundBuyer'
        ? { RefundBuyer: null }
        : { ReleaseSeller: null };

      const callData = api.tx.bazariDispute.revealVote(id, voteType, salt);

      return {
        disputeId: id,
        vote,
        salt,
        callHex: callData.toHex(),
        callHash: callData.hash.toHex(),
        method: 'bazariDispute.revealVote',
        signerAddress: authUser.address,
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to prepare reveal' });
    }
  });

  // ============================================================================
  // POST /api/blockchain/disputes/:id/prepare-execute - Preparar execução do ruling
  // ============================================================================
  app.post('/disputes/:disputeId/prepare-execute', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { disputeId } = z.object({ disputeId: z.string() }).parse(request.params);
      const authUser = (request as any).authUser as { sub: string; address: string };
      const id = parseInt(disputeId, 10);

      const api = await blockchainService.getApi();
      const disputeData = await api.query.bazariDispute.disputes(id);

      if (disputeData.isNone) {
        return reply.status(404).send({ error: 'Dispute not found' });
      }

      const dispute = disputeData.unwrap();

      // Verificar reveal phase ended
      const currentBlock = await blockchainService.getCurrentBlock();
      if (Number(currentBlock) <= dispute.revealDeadline.toNumber()) {
        return reply.status(400).send({
          error: 'Cannot execute yet',
          revealDeadline: dispute.revealDeadline.toNumber(),
          currentBlock: Number(currentBlock),
          blocksRemaining: dispute.revealDeadline.toNumber() - Number(currentBlock),
        });
      }

      const callData = api.tx.bazariDispute.executeRuling(id);

      return {
        disputeId: id,
        callHex: callData.toHex(),
        callHash: callData.hash.toHex(),
        method: 'bazariDispute.executeRuling',
        signerAddress: authUser.address,
        note: 'Anyone can execute the ruling after reveal phase ends',
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to prepare execute' });
    }
  });

  // ============================================================================
  // GET /api/blockchain/disputes/my - Disputas do usuário
  // ============================================================================
  app.get('/disputes/my', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const authUser = (request as any).authUser as { sub: string; address: string };
      const api = await blockchainService.getApi();
      const disputes = await api.query.bazariDispute.disputes.entries();

      const myDisputes = disputes
        .map(([_, disputeOption]: [any, any]) => {
          if (disputeOption.isNone) return null;
          const dispute = disputeOption.unwrap();

          const isPlaintiff = dispute.plaintiff.toString() === authUser.address;
          const isDefendant = dispute.defendant.toString() === authUser.address;
          const isJuror = dispute.jurors.some((j: any) => j.toString() === authUser.address);

          if (!isPlaintiff && !isDefendant && !isJuror) return null;

          return {
            disputeId: dispute.disputeId.toNumber(),
            orderId: dispute.orderId.toNumber(),
            status: dispute.status.toString(),
            ruling: dispute.ruling.isSome ? dispute.ruling.unwrap().toString() : null,
            role: isPlaintiff ? 'plaintiff' : isDefendant ? 'defendant' : 'juror',
            createdAt: dispute.createdAt.toNumber(),
          };
        })
        .filter(Boolean);

      return {
        disputes: myDisputes,
        count: myDisputes.length,
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch my disputes' });
    }
  });

  // ============================================================================
  // GET /api/blockchain/disputes/jury - Disputas onde sou jurado
  // ============================================================================
  app.get('/disputes/jury', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const authUser = (request as any).authUser as { sub: string; address: string };
      const api = await blockchainService.getApi();
      const disputes = await api.query.bazariDispute.disputes.entries();
      const currentBlock = await blockchainService.getCurrentBlock();

      const juryDisputes = [];

      for (const [_, disputeOption] of disputes) {
        if (disputeOption.isNone) continue;
        const dispute = disputeOption.unwrap();

        const isJuror = dispute.jurors.some((j: any) => j.toString() === authUser.address);
        if (!isJuror) continue;

        // Verificar se já votou
        const commit = await api.query.bazariDispute.voteCommits(
          dispute.disputeId.toNumber(),
          authUser.address
        );
        const revealed = await api.query.bazariDispute.revealedVotes(
          dispute.disputeId.toNumber(),
          authUser.address
        );

        juryDisputes.push({
          disputeId: dispute.disputeId.toNumber(),
          orderId: dispute.orderId.toNumber(),
          status: dispute.status.toString(),
          commitDeadline: dispute.commitDeadline.toNumber(),
          revealDeadline: dispute.revealDeadline.toNumber(),
          hasCommitted: commit.isSome,
          hasRevealed: revealed.isSome,
          // Ações necessárias
          needsCommit: commit.isNone && Number(currentBlock) <= dispute.commitDeadline.toNumber(),
          needsReveal: commit.isSome && revealed.isNone &&
                       Number(currentBlock) > dispute.commitDeadline.toNumber() &&
                       Number(currentBlock) <= dispute.revealDeadline.toNumber(),
        });
      }

      return {
        disputes: juryDisputes,
        count: juryDisputes.length,
        pendingActions: juryDisputes.filter(d => d.needsCommit || d.needsReveal).length,
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch jury disputes' });
    }
  });
}
```

---

### PARTE B: Frontend - Hooks

**Arquivo:** `apps/web/src/hooks/blockchain/useDispute.ts` (NOVO)

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

export interface Dispute {
  disputeId: number;
  orderId: number;
  plaintiff: string;
  defendant: string;
  jurors: string[];
  evidenceCid: string;
  status: 'Open' | 'JurorsSelected' | 'CommitPhase' | 'RevealPhase' | 'Resolved';
  ruling: 'RefundBuyer' | 'ReleaseSeller' | 'PartialRefund' | null;
  createdAt: number;
  commitDeadline: number;
  revealDeadline: number;
  currentBlock: number;
  isInCommitPhase: boolean;
  isInRevealPhase: boolean;
  canExecuteRuling: boolean;
  votes: { juror: string; vote: string }[];
  commitStatus: { juror: string; committed: boolean; revealed: boolean }[];
  votesCount: number;
  quorumReached: boolean;
}

export interface MyDispute {
  disputeId: number;
  orderId: number;
  status: string;
  ruling: string | null;
  role: 'plaintiff' | 'defendant' | 'juror';
  createdAt: number;
}

export interface JuryDispute {
  disputeId: number;
  orderId: number;
  status: string;
  commitDeadline: number;
  revealDeadline: number;
  hasCommitted: boolean;
  hasRevealed: boolean;
  needsCommit: boolean;
  needsReveal: boolean;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Lista todas as disputas
 */
export function useDisputes() {
  return useQuery({
    queryKey: ['disputes'],
    queryFn: async () => {
      const res = await api.get('/blockchain/disputes');
      return res.data as { disputes: Dispute[]; count: number };
    },
    refetchInterval: 30000, // 30s
  });
}

/**
 * Detalhes de uma disputa específica
 */
export function useDispute(disputeId: number | undefined) {
  return useQuery({
    queryKey: ['dispute', disputeId],
    queryFn: async () => {
      const res = await api.get(`/blockchain/disputes/${disputeId}`);
      return res.data as Dispute;
    },
    enabled: !!disputeId,
    refetchInterval: 10000, // 10s - mais frequente para acompanhar fases
  });
}

/**
 * Minhas disputas (como plaintiff, defendant ou juror)
 */
export function useMyDisputes() {
  return useQuery({
    queryKey: ['my-disputes'],
    queryFn: async () => {
      const res = await api.get('/blockchain/disputes/my');
      return res.data as { disputes: MyDispute[]; count: number };
    },
    refetchInterval: 30000,
  });
}

/**
 * Disputas onde sou jurado
 */
export function useJuryDisputes() {
  return useQuery({
    queryKey: ['jury-disputes'],
    queryFn: async () => {
      const res = await api.get('/blockchain/disputes/jury');
      return res.data as { disputes: JuryDispute[]; count: number; pendingActions: number };
    },
    refetchInterval: 30000,
  });
}

/**
 * Preparar abertura de disputa
 */
export function usePrepareOpenDispute() {
  return useMutation({
    mutationFn: async ({ orderId, evidenceCid }: { orderId: string; evidenceCid: string }) => {
      const res = await api.post('/blockchain/disputes/prepare-open', { orderId, evidenceCid });
      return res.data;
    },
  });
}

/**
 * Preparar commit de voto (juror)
 */
export function usePrepareCommitVote() {
  return useMutation({
    mutationFn: async ({
      disputeId,
      vote,
      salt,
    }: {
      disputeId: number;
      vote: 'RefundBuyer' | 'ReleaseSeller';
      salt: string;
    }) => {
      const res = await api.post(`/blockchain/disputes/${disputeId}/prepare-commit`, { vote, salt });
      return res.data;
    },
  });
}

/**
 * Preparar reveal de voto (juror)
 */
export function usePrepareRevealVote() {
  return useMutation({
    mutationFn: async ({
      disputeId,
      vote,
      salt,
    }: {
      disputeId: number;
      vote: 'RefundBuyer' | 'ReleaseSeller';
      salt: string;
    }) => {
      const res = await api.post(`/blockchain/disputes/${disputeId}/prepare-reveal`, { vote, salt });
      return res.data;
    },
  });
}

/**
 * Preparar execução do ruling
 */
export function usePrepareExecuteRuling() {
  return useMutation({
    mutationFn: async (disputeId: number) => {
      const res = await api.post(`/blockchain/disputes/${disputeId}/prepare-execute`);
      return res.data;
    },
  });
}

// ============================================================================
// Helper Hooks
// ============================================================================

/**
 * Calcular tempo restante para deadline
 */
export function useDisputeCountdown(dispute: Dispute | undefined) {
  const BLOCK_TIME = 6; // segundos

  if (!dispute) return null;

  const { currentBlock, commitDeadline, revealDeadline, isInCommitPhase, isInRevealPhase } = dispute;

  if (isInCommitPhase) {
    const blocksRemaining = commitDeadline - currentBlock;
    return {
      phase: 'commit' as const,
      blocksRemaining,
      secondsRemaining: blocksRemaining * BLOCK_TIME,
      deadline: commitDeadline,
    };
  }

  if (isInRevealPhase) {
    const blocksRemaining = revealDeadline - currentBlock;
    return {
      phase: 'reveal' as const,
      blocksRemaining,
      secondsRemaining: blocksRemaining * BLOCK_TIME,
      deadline: revealDeadline,
    };
  }

  return {
    phase: 'ended' as const,
    blocksRemaining: 0,
    secondsRemaining: 0,
    deadline: revealDeadline,
  };
}
```

---

### PARTE C: Frontend - Páginas

#### C.1 - DisputeDetailPage

**Arquivo:** `apps/web/src/pages/dispute/DisputeDetailPage.tsx`

```typescript
import { useParams } from 'react-router-dom';
import { useDispute, useDisputeCountdown } from '@/hooks/blockchain/useDispute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DisputeTimeline } from '@/components/dispute/DisputeTimeline';
import { VotingPanel } from '@/components/dispute/VotingPanel';
import { JurorSelectionCard } from '@/components/dispute/JurorSelectionCard';
import { EvidenceViewer } from '@/components/dispute/EvidenceViewer';
import { CountdownTimer } from '@/components/blockchain/CountdownTimer';

export function DisputeDetailPage() {
  const { disputeId } = useParams<{ disputeId: string }>();
  const { data: dispute, isLoading, error } = useDispute(
    disputeId ? parseInt(disputeId, 10) : undefined
  );
  const countdown = useDisputeCountdown(dispute);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading dispute</div>;
  if (!dispute) return <div>Dispute not found</div>;

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Dispute #{dispute.disputeId}</h1>
          <p className="text-muted-foreground">Order #{dispute.orderId}</p>
        </div>
        <Badge variant={dispute.status === 'Resolved' ? 'success' : 'warning'}>
          {dispute.status}
        </Badge>
      </div>

      {/* Countdown */}
      {countdown && countdown.phase !== 'ended' && (
        <Card>
          <CardHeader>
            <CardTitle>
              {countdown.phase === 'commit' ? 'Commit Phase' : 'Reveal Phase'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CountdownTimer
              targetTimestamp={Date.now() + countdown.secondsRemaining * 1000}
              showProgress
            />
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <DisputeTimeline dispute={dispute} />

      {/* Jurors */}
      <JurorSelectionCard
        jurors={dispute.jurors}
        commitStatus={dispute.commitStatus}
      />

      {/* Evidence */}
      <EvidenceViewer evidenceCid={dispute.evidenceCid} />

      {/* Voting Panel (for jurors) */}
      <VotingPanel dispute={dispute} />

      {/* Ruling (if resolved) */}
      {dispute.ruling && (
        <Card>
          <CardHeader>
            <CardTitle>Ruling</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="default" className="text-lg">
              {dispute.ruling}
            </Badge>
            <p className="mt-2 text-muted-foreground">
              Votes: {dispute.votesCount}/5 (Quorum: 3)
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

#### C.2 - MyDisputesPage

**Arquivo:** `apps/web/src/pages/dispute/MyDisputesPage.tsx`

```typescript
import { useMyDisputes, useJuryDisputes } from '@/hooks/blockchain/useDispute';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DisputeCard } from '@/components/dispute/DisputeCard';
import { Badge } from '@/components/ui/badge';

export function MyDisputesPage() {
  const { data: myDisputes, isLoading: loadingMy } = useMyDisputes();
  const { data: juryDisputes, isLoading: loadingJury } = useJuryDisputes();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">My Disputes</h1>

      <Tabs defaultValue="involved">
        <TabsList>
          <TabsTrigger value="involved">
            As Party ({myDisputes?.count || 0})
          </TabsTrigger>
          <TabsTrigger value="jury">
            As Juror ({juryDisputes?.count || 0})
            {juryDisputes?.pendingActions ? (
              <Badge variant="destructive" className="ml-2">
                {juryDisputes.pendingActions} pending
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="involved" className="space-y-4">
          {loadingMy ? (
            <div>Loading...</div>
          ) : myDisputes?.disputes.length === 0 ? (
            <div className="text-muted-foreground">No disputes as party</div>
          ) : (
            myDisputes?.disputes.map((dispute) => (
              <DisputeCard
                key={dispute.disputeId}
                dispute={dispute}
                showRole
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="jury" className="space-y-4">
          {loadingJury ? (
            <div>Loading...</div>
          ) : juryDisputes?.disputes.length === 0 ? (
            <div className="text-muted-foreground">Not selected as juror in any dispute</div>
          ) : (
            juryDisputes?.disputes.map((dispute) => (
              <DisputeCard
                key={dispute.disputeId}
                dispute={dispute}
                showJuryActions
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## CHECKLIST DE IMPLEMENTAÇÃO

### Backend
- [ ] Criar `apps/api/src/routes/blockchain/dispute.ts`
- [ ] Registrar rotas no server.ts
- [ ] Implementar todos os endpoints listados

### Frontend - Hooks
- [ ] Criar `apps/web/src/hooks/blockchain/useDispute.ts`
- [ ] Implementar todos os hooks listados

### Frontend - Páginas
- [ ] Criar `DisputeDetailPage.tsx`
- [ ] Criar `MyDisputesPage.tsx`
- [ ] Criar `AdminDisputesDashboard.tsx` (opcional)

### Frontend - Componentes
- [ ] `DisputeTimeline.tsx` - Timeline visual das fases
- [ ] `VotingPanel.tsx` - Panel para jurors votarem
- [ ] `CommitVoteModal.tsx` - Modal de commit
- [ ] `RevealVoteModal.tsx` - Modal de reveal
- [ ] `JurorSelectionCard.tsx` - Lista de jurors
- [ ] `EvidenceViewer.tsx` - Viewer de evidências IPFS
- [ ] `DisputeCard.tsx` - Card resumo de disputa

### Rotas
- [ ] Adicionar `/app/disputes/:disputeId` ao router
- [ ] Adicionar `/app/disputes` ao router
- [ ] Adicionar menu link

---

## DEPENDÊNCIAS

Esta fase depende de:
- **Fase 6** completa (integração escrow-dispute)

Esta fase desbloqueia:
- Sistema de disputas completo
- DAO governance para resolução de conflitos
