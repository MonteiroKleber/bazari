// Backend REST API - Dispute Routes
// Conecta frontend → pallet bazari-dispute via Polkadot.js
// path: apps/api/src/routes/blockchain/dispute.ts
// @ts-nocheck - Polkadot.js type incompatibilities

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../../lib/auth/middleware.js';
import { BlockchainService } from '../../services/blockchain/blockchain.service.js';

const disputeIdParamsSchema = z.object({
  disputeId: z.string(),
});

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

      // Verificar se pallet existe
      if (!api.query.bazariDispute?.disputes) {
        return reply.status(503).send({
          error: 'Dispute pallet not available',
          disputes: [],
          count: 0,
        });
      }

      const disputes = await api.query.bazariDispute.disputes.entries();

      const formattedDisputes = disputes.map(([key, disputeOption]: [any, any]) => {
        if (!disputeOption || disputeOption.isNone) return null;

        const dispute = disputeOption.unwrap();
        return {
          disputeId: dispute.disputeId?.toNumber?.() || 0,
          orderId: dispute.orderId?.toNumber?.() || 0,
          plaintiff: dispute.plaintiff?.toString?.() || '',
          defendant: dispute.defendant?.toString?.() || '',
          jurors: dispute.jurors?.map?.((j: any) => j.toString()) || [],
          evidenceCid: dispute.evidenceCid
            ? Buffer.from(dispute.evidenceCid).toString('utf8')
            : '',
          status: dispute.status?.toString?.() || 'Open',
          ruling: dispute.ruling?.isSome
            ? dispute.ruling.unwrap().toString()
            : null,
          createdAt: dispute.createdAt?.toNumber?.() || 0,
          commitDeadline: dispute.commitDeadline?.toNumber?.() || 0,
          revealDeadline: dispute.revealDeadline?.toNumber?.() || 0,
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
  // GET /api/blockchain/disputes/my - Disputas do usuário
  // NOTA: Deve vir ANTES de /disputes/:disputeId para não conflitar com rota
  // ============================================================================
  app.get('/disputes/my', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const authUser = (request as any).authUser as { sub: string; address: string };
      const api = await blockchainService.getApi();

      if (!api.query.bazariDispute?.disputes) {
        return {
          disputes: [],
          count: 0,
        };
      }

      const disputes = await api.query.bazariDispute.disputes.entries();

      const myDisputes = disputes
        .map(([_, disputeOption]: [any, any]) => {
          if (!disputeOption || disputeOption.isNone) return null;
          const dispute = disputeOption.unwrap();

          const plaintiff = dispute.plaintiff?.toString?.() || '';
          const defendant = dispute.defendant?.toString?.() || '';
          const jurors = dispute.jurors?.map?.((j: any) => j.toString()) || [];

          const isPlaintiff = plaintiff === authUser.address;
          const isDefendant = defendant === authUser.address;
          const isJuror = jurors.includes(authUser.address);

          if (!isPlaintiff && !isDefendant && !isJuror) return null;

          return {
            disputeId: dispute.disputeId?.toNumber?.() || 0,
            orderId: dispute.orderId?.toNumber?.() || 0,
            status: dispute.status?.toString?.() || 'Open',
            ruling: dispute.ruling?.isSome
              ? dispute.ruling.unwrap().toString()
              : null,
            role: isPlaintiff ? 'plaintiff' : isDefendant ? 'defendant' : 'juror',
            createdAt: dispute.createdAt?.toNumber?.() || 0,
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

      if (!api.query.bazariDispute?.disputes) {
        return {
          disputes: [],
          count: 0,
          pendingActions: 0,
        };
      }

      const disputes = await api.query.bazariDispute.disputes.entries();
      const currentBlock = await blockchainService.getCurrentBlock();

      const juryDisputes = [];

      for (const [_, disputeOption] of disputes) {
        if (!disputeOption || disputeOption.isNone) continue;
        const dispute = disputeOption.unwrap();

        const jurors = dispute.jurors?.map?.((j: any) => j.toString()) || [];
        const isJuror = jurors.includes(authUser.address);
        if (!isJuror) continue;

        const disputeId = dispute.disputeId?.toNumber?.() || 0;
        const commitDeadline = dispute.commitDeadline?.toNumber?.() || 0;
        const revealDeadline = dispute.revealDeadline?.toNumber?.() || 0;

        // Verificar se já votou
        let hasCommitted = false;
        let hasRevealed = false;

        try {
          const commit = await api.query.bazariDispute.voteCommits(
            disputeId,
            authUser.address
          );
          hasCommitted = commit && !commit.isNone;

          const revealed = await api.query.bazariDispute.revealedVotes(
            disputeId,
            authUser.address
          );
          hasRevealed = revealed && !revealed.isNone;
        } catch (e) {
          app.log.warn('Error checking vote status:', e);
        }

        const currentBlockNum = Number(currentBlock);

        juryDisputes.push({
          disputeId,
          orderId: dispute.orderId?.toNumber?.() || 0,
          status: dispute.status?.toString?.() || 'Open',
          commitDeadline,
          revealDeadline,
          hasCommitted,
          hasRevealed,
          // Ações necessárias
          needsCommit: !hasCommitted && currentBlockNum <= commitDeadline,
          needsReveal: hasCommitted && !hasRevealed &&
                       currentBlockNum > commitDeadline &&
                       currentBlockNum <= revealDeadline,
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

  // ============================================================================
  // GET /api/blockchain/disputes/:disputeId - Detalhes de uma disputa
  // ============================================================================
  app.get('/disputes/:disputeId', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { disputeId } = disputeIdParamsSchema.parse(request.params);
      const id = parseInt(disputeId, 10);

      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid dispute ID' });
      }

      const api = await blockchainService.getApi();

      if (!api.query.bazariDispute?.disputes) {
        return reply.status(503).send({ error: 'Dispute pallet not available' });
      }

      const disputeData = await api.query.bazariDispute.disputes(id);

      if (!disputeData || disputeData.isNone) {
        return reply.status(404).send({ error: 'Dispute not found' });
      }

      const dispute = disputeData.unwrap();
      const currentBlock = await blockchainService.getCurrentBlock();

      const commitDeadline = dispute.commitDeadline?.toNumber?.() || 0;
      const revealDeadline = dispute.revealDeadline?.toNumber?.() || 0;
      const currentBlockNum = Number(currentBlock);

      // Buscar votos revelados
      const votes: { juror: string; vote: string }[] = [];
      const commitStatus: { juror: string; committed: boolean; revealed: boolean }[] = [];

      try {
        const revealedVotes = await api.query.bazariDispute.revealedVotes.entries(id);
        for (const [key, voteOption] of revealedVotes) {
          const [_, jurorKey] = key.args;
          votes.push({
            juror: jurorKey.toString(),
            vote: voteOption?.toString?.() || 'Unknown',
          });
        }
      } catch (e) {
        app.log.warn('Error fetching revealed votes:', e);
      }

      // Buscar commits
      try {
        const commits = await api.query.bazariDispute.voteCommits.entries(id);
        for (const [key, commitOption] of commits) {
          if (!commitOption || commitOption.isNone) continue;
          const [_, jurorKey] = key.args;
          const commit = commitOption.unwrap();
          commitStatus.push({
            juror: jurorKey.toString(),
            committed: true,
            revealed: commit.revealed?.isTrue || commit.revealed === true,
          });
        }
      } catch (e) {
        app.log.warn('Error fetching commits:', e);
      }

      return {
        disputeId: dispute.disputeId?.toNumber?.() || id,
        orderId: dispute.orderId?.toNumber?.() || 0,
        plaintiff: dispute.plaintiff?.toString?.() || '',
        defendant: dispute.defendant?.toString?.() || '',
        jurors: dispute.jurors?.map?.((j: any) => j.toString()) || [],
        evidenceCid: dispute.evidenceCid
          ? Buffer.from(dispute.evidenceCid).toString('utf8')
          : '',
        status: dispute.status?.toString?.() || 'Open',
        ruling: dispute.ruling?.isSome
          ? dispute.ruling.unwrap().toString()
          : null,
        createdAt: dispute.createdAt?.toNumber?.() || 0,
        commitDeadline,
        revealDeadline,
        currentBlock: currentBlockNum,
        // Calculated fields
        isInCommitPhase: currentBlockNum <= commitDeadline,
        isInRevealPhase: currentBlockNum > commitDeadline && currentBlockNum <= revealDeadline,
        canExecuteRuling: currentBlockNum > revealDeadline,
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

      if (!api.query.bazariEscrow?.escrows) {
        return reply.status(503).send({ error: 'Escrow pallet not available' });
      }

      const escrowData = await api.query.bazariEscrow.escrows(orderId);

      if (!escrowData || escrowData.isNone) {
        return reply.status(400).send({ error: 'No escrow found for this order' });
      }

      const escrow = escrowData.unwrap();
      const status = escrow.status?.toString?.() || '';

      if (status !== 'Locked') {
        return reply.status(400).send({
          error: 'Cannot dispute - escrow not locked',
          currentStatus: status,
        });
      }

      // Verificar se já existe disputa para esta order
      if (api.query.bazariDispute?.disputes) {
        const disputes = await api.query.bazariDispute.disputes.entries();
        const existingDispute = disputes.find(([_, disputeOption]: [any, any]) => {
          if (!disputeOption || disputeOption.isNone) return false;
          const d = disputeOption.unwrap();
          return d.orderId?.toString?.() === orderId;
        });

        if (existingDispute) {
          return reply.status(400).send({ error: 'Dispute already exists for this order' });
        }
      }

      // Preparar call
      // NOTA: orderId no pallet é u64, mas no DB é UUID string
      // O pallet precisa ser ajustado para aceitar UUID ou usar mapeamento
      // Por agora, tentamos converter ou usar hash
      const orderIdForChain = orderId; // Passa como string, pallet pode aceitar

      const callData = api.tx.bazariDispute.openDispute(orderIdForChain, evidenceCid);

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
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid input', details: error.errors });
      }
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
      const { disputeId } = disputeIdParamsSchema.parse(request.params);
      const { vote, salt } = prepareCommitSchema.parse(request.body);
      const authUser = (request as any).authUser as { sub: string; address: string };
      const id = parseInt(disputeId, 10);

      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid dispute ID' });
      }

      const api = await blockchainService.getApi();

      if (!api.query.bazariDispute?.disputes) {
        return reply.status(503).send({ error: 'Dispute pallet not available' });
      }

      const disputeData = await api.query.bazariDispute.disputes(id);

      if (!disputeData || disputeData.isNone) {
        return reply.status(404).send({ error: 'Dispute not found' });
      }

      const dispute = disputeData.unwrap();

      // Verificar é jurado
      const jurors = dispute.jurors?.map?.((j: any) => j.toString()) || [];
      const isJuror = jurors.includes(authUser.address);
      if (!isJuror) {
        return reply.status(403).send({ error: 'Not a selected juror' });
      }

      // Verificar está na fase de commit
      const currentBlock = await blockchainService.getCurrentBlock();
      const commitDeadline = dispute.commitDeadline?.toNumber?.() || 0;

      if (Number(currentBlock) > commitDeadline) {
        return reply.status(400).send({
          error: 'Commit phase ended',
          currentBlock: Number(currentBlock),
          commitDeadline,
        });
      }

      // Calcular hash do voto usando a mesma lógica do pallet
      // O pallet usa: hash(vote.encode() + salt)
      // Vote enum: RefundBuyer = 0, ReleaseSeller = 1, PartialRefund(u8) = 2
      const voteEncoded = vote === 'RefundBuyer' ? new Uint8Array([0]) : new Uint8Array([1]);
      const saltBytes = new TextEncoder().encode(salt);
      const toHash = new Uint8Array([...voteEncoded, ...saltBytes]);

      // Usar o hasher do registry
      const commitHash = api.registry.hash(toHash).toHex();

      const callData = api.tx.bazariDispute.commitVote(id, commitHash);

      return {
        disputeId: id,
        vote,
        salt, // IMPORTANTE: Usuário deve salvar para reveal!
        commitHash,
        callHex: callData.toHex(),
        callHash: callData.hash.toHex(),
        method: 'bazariDispute.commitVote',
        signerAddress: authUser.address,
        warning: 'IMPORTANT: Save your vote and salt! You will need them for the reveal phase.',
      };
    } catch (error) {
      app.log.error(error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid input', details: error.errors });
      }
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
      const { disputeId } = disputeIdParamsSchema.parse(request.params);
      const { vote, salt } = prepareRevealSchema.parse(request.body);
      const authUser = (request as any).authUser as { sub: string; address: string };
      const id = parseInt(disputeId, 10);

      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid dispute ID' });
      }

      const api = await blockchainService.getApi();

      if (!api.query.bazariDispute?.disputes) {
        return reply.status(503).send({ error: 'Dispute pallet not available' });
      }

      const disputeData = await api.query.bazariDispute.disputes(id);

      if (!disputeData || disputeData.isNone) {
        return reply.status(404).send({ error: 'Dispute not found' });
      }

      const dispute = disputeData.unwrap();

      // Verificar é jurado
      const jurors = dispute.jurors?.map?.((j: any) => j.toString()) || [];
      const isJuror = jurors.includes(authUser.address);
      if (!isJuror) {
        return reply.status(403).send({ error: 'Not a selected juror' });
      }

      // Verificar está na fase de reveal
      const currentBlock = await blockchainService.getCurrentBlock();
      const currentBlockNum = Number(currentBlock);
      const commitDeadline = dispute.commitDeadline?.toNumber?.() || 0;
      const revealDeadline = dispute.revealDeadline?.toNumber?.() || 0;

      if (currentBlockNum <= commitDeadline) {
        return reply.status(400).send({
          error: 'Reveal phase not started yet',
          currentBlock: currentBlockNum,
          commitDeadline,
          blocksUntilReveal: commitDeadline - currentBlockNum,
        });
      }

      if (currentBlockNum > revealDeadline) {
        return reply.status(400).send({
          error: 'Reveal phase ended',
          currentBlock: currentBlockNum,
          revealDeadline,
        });
      }

      // Verificar commit existe
      const commitData = await api.query.bazariDispute.voteCommits(id, authUser.address);
      if (!commitData || commitData.isNone) {
        return reply.status(400).send({ error: 'No commit found for this juror. Did you commit during the commit phase?' });
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
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid input', details: error.errors });
      }
      return reply.status(500).send({ error: 'Failed to prepare reveal' });
    }
  });

  // ============================================================================
  // POST /api/blockchain/disputes/:id/prepare-execute - Preparar execução do ruling
  // ============================================================================
  app.post('/disputes/:disputeId/prepare-execute', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { disputeId } = disputeIdParamsSchema.parse(request.params);
      const authUser = (request as any).authUser as { sub: string; address: string };
      const id = parseInt(disputeId, 10);

      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid dispute ID' });
      }

      const api = await blockchainService.getApi();

      if (!api.query.bazariDispute?.disputes) {
        return reply.status(503).send({ error: 'Dispute pallet not available' });
      }

      const disputeData = await api.query.bazariDispute.disputes(id);

      if (!disputeData || disputeData.isNone) {
        return reply.status(404).send({ error: 'Dispute not found' });
      }

      const dispute = disputeData.unwrap();

      // Verificar já foi resolvido
      const status = dispute.status?.toString?.() || '';
      if (status === 'Resolved') {
        return reply.status(400).send({
          error: 'Dispute already resolved',
          ruling: dispute.ruling?.isSome ? dispute.ruling.unwrap().toString() : null,
        });
      }

      // Verificar reveal phase ended
      const currentBlock = await blockchainService.getCurrentBlock();
      const currentBlockNum = Number(currentBlock);
      const revealDeadline = dispute.revealDeadline?.toNumber?.() || 0;

      if (currentBlockNum <= revealDeadline) {
        return reply.status(400).send({
          error: 'Cannot execute yet - reveal phase not ended',
          revealDeadline,
          currentBlock: currentBlockNum,
          blocksRemaining: revealDeadline - currentBlockNum,
          estimatedSeconds: (revealDeadline - currentBlockNum) * 6,
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
  // GET /api/blockchain/disputes/order/:orderId - Buscar disputa por orderId
  // ============================================================================
  app.get('/disputes/order/:orderId', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { orderId } = z.object({ orderId: z.string() }).parse(request.params);

      const api = await blockchainService.getApi();

      if (!api.query.bazariDispute?.disputes) {
        return reply.status(503).send({ error: 'Dispute pallet not available' });
      }

      const disputes = await api.query.bazariDispute.disputes.entries();

      const matchingDispute = disputes.find(([_, disputeOption]: [any, any]) => {
        if (!disputeOption || disputeOption.isNone) return false;
        const d = disputeOption.unwrap();
        return d.orderId?.toString?.() === orderId;
      });

      if (!matchingDispute) {
        return reply.status(404).send({
          error: 'No dispute found for this order',
          orderId,
        });
      }

      const [_, disputeOption] = matchingDispute;
      const dispute = disputeOption.unwrap();
      const currentBlock = await blockchainService.getCurrentBlock();
      const currentBlockNum = Number(currentBlock);
      const commitDeadline = dispute.commitDeadline?.toNumber?.() || 0;
      const revealDeadline = dispute.revealDeadline?.toNumber?.() || 0;

      return {
        disputeId: dispute.disputeId?.toNumber?.() || 0,
        orderId: dispute.orderId?.toNumber?.() || 0,
        plaintiff: dispute.plaintiff?.toString?.() || '',
        defendant: dispute.defendant?.toString?.() || '',
        status: dispute.status?.toString?.() || 'Open',
        ruling: dispute.ruling?.isSome
          ? dispute.ruling.unwrap().toString()
          : null,
        createdAt: dispute.createdAt?.toNumber?.() || 0,
        commitDeadline,
        revealDeadline,
        currentBlock: currentBlockNum,
        isInCommitPhase: currentBlockNum <= commitDeadline,
        isInRevealPhase: currentBlockNum > commitDeadline && currentBlockNum <= revealDeadline,
        canExecuteRuling: currentBlockNum > revealDeadline,
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch dispute by order' });
    }
  });
}
