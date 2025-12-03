// Backend REST API - Escrow Routes
// Conecta frontend → pallet bazari-escrow via Polkadot.js
// path: apps/api/src/routes/blockchain/escrow.ts
// @ts-nocheck - Polkadot.js type incompatibilities

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../../lib/auth/middleware.js';
import { BlockchainService } from '../../services/blockchain/blockchain.service.js';
import { getEscrowCalculator } from '../../services/escrow/escrow-calculator.service.js';

const orderIdParamsSchema = z.object({
  orderId: z.string().uuid(),
});

// Default auto-release (7 days) - used as fallback when order doesn't have dynamic value
const DEFAULT_AUTO_RELEASE_BLOCKS = 100_800; // 7 dias = 100,800 blocos (6s/block)

// Helper to format BZR amount
function formatBzr(planck: string): string {
  const value = BigInt(planck);
  const divisor = BigInt(10 ** 12);
  const wholePart = value / divisor;
  const fractionalPart = value % divisor;
  return `${wholePart}.${fractionalPart.toString().padStart(12, '0').slice(0, 2)}`;
}

// Map blockchain status to frontend EscrowState
function mapStatusToState(status: string): 'Active' | 'Released' | 'Refunded' | 'Disputed' {
  switch (status) {
    case 'Locked':
      return 'Active';
    case 'Released':
      return 'Released';
    case 'Refunded':
    case 'PartialRefund':
      return 'Refunded';
    case 'Disputed':
      return 'Disputed';
    default:
      return 'Active';
  }
}

export async function escrowRoutes(
  app: FastifyInstance,
  options: FastifyPluginOptions & { prisma: PrismaClient }
) {
  const { prisma } = options;
  const blockchainService = BlockchainService.getInstance();

  // ============================================================================
  // POST /api/blockchain/escrow/:orderId/prepare-lock - Preparar transação para frontend assinar
  // Retorna os dados da transação para o usuário assinar no frontend (OPÇÃO A)
  // ============================================================================
  app.post('/escrow/:orderId/prepare-lock', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { orderId } = orderIdParamsSchema.parse(request.params);
      const authUser = (request as any).authUser as { sub: string; address: string };

      // 1. Buscar order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { paymentIntents: true },
      });

      if (!order) {
        return reply.status(404).send({ error: 'Order not found' });
      }

      // 2. Validar buyer
      if (order.buyerAddr !== authUser.address) {
        return reply.status(403).send({ error: 'Unauthorized: not buyer' });
      }

      // 3. Verificar status da order
      if (order.status !== 'CREATED') {
        return reply.status(400).send({
          error: 'Invalid order status',
          message: `Order status is ${order.status}, expected CREATED`,
        });
      }

      // 4. Verificar se tem blockchainOrderId (order foi sincronizada com blockchain)
      if (!order.blockchainOrderId) {
        return reply.status(400).send({
          error: 'Order not synced with blockchain',
          message: 'Order does not have a blockchainOrderId yet. Please wait for blockchain sync.',
        });
      }

      const blockchainOrderId = order.blockchainOrderId.toString();

      // 5. Verificar se já está locked
      const api = await blockchainService.getApi();
      const existing = await api.query.bazariEscrow.escrows(blockchainOrderId);

      if (existing.isSome) {
        return reply.status(400).send({ error: 'Escrow already locked' });
      }

      // 6. Preparar call data para frontend assinar
      const totalBzr = BigInt(order.totalBzr.toString());

      // PROPOSAL-001: Calculate dynamic auto-release blocks based on delivery estimate
      const escrowCalculator = getEscrowCalculator();
      const orderAny = order as any;
      const autoReleaseBlocks = orderAny.autoReleaseBlocks
        || escrowCalculator.calculateAutoReleaseBlocks(
            orderAny.estimatedDeliveryDays,
            orderAny.shippingMethod
          );

      // Pass auto_release_blocks to pallet (Option<BlockNumber>)
      const callData = api.tx.bazariEscrow.lockFunds(
        blockchainOrderId,
        order.sellerAddr,
        totalBzr,
        null,              // asset_id: Option<AssetId> = None (use native token)
        autoReleaseBlocks, // auto_release_blocks: Option<BlockNumber> = dynamic value
        null               // arbiter: Option<AccountId> = None
      );

      return {
        orderId,
        blockchainOrderId,
        seller: order.sellerAddr,
        buyer: order.buyerAddr,
        amount: totalBzr.toString(),
        autoReleaseBlocks, // PROPOSAL-001: Include in response
        callHex: callData.toHex(),
        callHash: callData.hash.toHex(),
        method: 'bazariEscrow.lockFunds',
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: 'Failed to prepare lock transaction',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ============================================================================
  // POST /api/blockchain/escrow/:orderId/prepare-release - Preparar release para frontend assinar
  // NOVO (Fase 6) - Pattern prepare+sign para que o buyer assine a transação
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

      // 3. Verificar se tem blockchainOrderId
      if (!order.blockchainOrderId) {
        return reply.status(400).send({
          error: 'Order not synced with blockchain',
          message: 'Order does not have a blockchainOrderId yet.',
        });
      }

      const blockchainOrderId = order.blockchainOrderId.toString();

      // 4. Verificar escrow on-chain
      const api = await blockchainService.getApi();
      const escrowData = await api.query.bazariEscrow.escrows(blockchainOrderId);

      if (escrowData.isNone) {
        return reply.status(400).send({ error: 'Escrow not found on blockchain' });
      }

      const escrow = escrowData.unwrap();
      const status = escrow.status.toString();

      // 5. Verificar status é 'Locked' (não Disputed, Released, etc)
      if (status !== 'Locked') {
        return reply.status(400).send({
          error: 'Invalid escrow status for release',
          currentStatus: status,
          message: status === 'Disputed'
            ? 'Cannot release disputed escrow. Wait for dispute resolution.'
            : `Escrow already ${status.toLowerCase()}`,
        });
      }

      // 6. Verificar se não há disputa ativa no bazari-dispute
      // (Mesmo que escrow status seja Locked, pode haver disputa pendente)
      try {
        const disputes = await api.query.bazariDispute.disputes.entries();
        const activeDispute = disputes.find(([_, dispute]: [any, any]) => {
          if (dispute.isNone) return false;
          const d = dispute.unwrap();
          // orderId no dispute é u64, converter para comparar
          const disputeOrderId = d.orderId?.toString?.() || '';
          const disputeStatus = d.status?.toString?.() || '';
          return disputeOrderId === blockchainOrderId && disputeStatus !== 'Resolved';
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

      // 7. Preparar call data para frontend assinar
      const callData = api.tx.bazariEscrow.releaseFunds(blockchainOrderId);

      return {
        orderId,
        blockchainOrderId,
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

  // ============================================================================
  // POST /api/blockchain/escrow/:orderId/prepare-refund - Preparar refund para DAO assinar
  // NOVO (Fase 6) - Pattern prepare+sign para membros do Council/DAO
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

      // 3. Verificar se tem blockchainOrderId
      if (!order.blockchainOrderId) {
        return reply.status(400).send({
          error: 'Order not synced with blockchain',
          message: 'Order does not have a blockchainOrderId yet.',
        });
      }

      const blockchainOrderId = order.blockchainOrderId.toString();

      // 4. Verificar escrow on-chain
      const escrowData = await api.query.bazariEscrow.escrows(blockchainOrderId);

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

      // 5. Preparar call data
      // NOTA: Refund requer DAOOrigin no pallet, então precisa de multisig ou sudo
      const callData = api.tx.bazariEscrow.refund(blockchainOrderId);

      return {
        orderId,
        blockchainOrderId,
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

  // ============================================================================
  // POST /api/blockchain/escrow/:orderId/confirm-lock - DEPRECATED
  // Mantido por compatibilidade, mas recomenda-se usar o worker para atualizar DB
  // ============================================================================
  const confirmLockBodySchema = z.object({
    txHash: z.string().min(1),
    blockNumber: z.string().optional(),
  });

  app.post('/escrow/:orderId/confirm-lock', { preHandler: authOnRequest }, async (request, reply) => {
    // Log deprecation warning
    app.log.warn('[DEPRECATED] /confirm-lock endpoint called. Consider relying on blockchain-sync worker instead.');

    try {
      const { orderId } = orderIdParamsSchema.parse(request.params);
      const { txHash, blockNumber } = confirmLockBodySchema.parse(request.body);
      const authUser = (request as any).authUser as { sub: string; address: string };

      // 1. Buscar order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { paymentIntents: true },
      });

      if (!order) {
        return reply.status(404).send({ error: 'Order not found' });
      }

      // 2. Validar buyer
      if (order.buyerAddr !== authUser.address) {
        return reply.status(403).send({ error: 'Unauthorized: not buyer' });
      }

      // 3. Verificar se tem blockchainOrderId
      if (!order.blockchainOrderId) {
        return reply.status(400).send({
          error: 'Order not synced with blockchain',
          message: 'Order does not have a blockchainOrderId yet. Please wait for blockchain sync.',
        });
      }

      const blockchainOrderId = order.blockchainOrderId.toString();

      // 4. Verificar se escrow existe on-chain
      const api = await blockchainService.getApi();
      const escrowData = await api.query.bazariEscrow.escrows(blockchainOrderId);

      if (escrowData.isNone) {
        return reply.status(400).send({
          error: 'Escrow not found on blockchain',
          message: 'Transaction may not have been finalized yet. Please wait and try again.',
        });
      }

      const escrow = escrowData.unwrap();
      const escrowStatus = escrow.status.toString();

      if (escrowStatus !== 'Locked') {
        return reply.status(400).send({
          error: 'Invalid escrow status',
          currentStatus: escrowStatus,
        });
      }

      // 4. Update PaymentIntent
      const paymentIntent = order.paymentIntents?.[0];
      if (paymentIntent) {
        await prisma.paymentIntent.update({
          where: { id: paymentIntent.id },
          data: {
            txHash: txHash,
            status: 'FUNDS_IN',
          },
        });
      }

      // 5. Update Order status
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'ESCROWED' },
      });

      // 6. Log event
      await prisma.escrowLog.create({
        data: {
          orderId,
          kind: 'LOCK',
          payloadJson: {
            txHash,
            buyer: order.buyerAddr,
            seller: order.sellerAddr,
            amount: escrow.amountLocked.toString(),
            blockNumber: blockNumber || escrow.lockedAt.toString(),
            lockedAt: escrow.lockedAt.toNumber(),
            timestamp: new Date().toISOString(),
            source: 'user_signed',
          },
        },
      });

      return {
        success: true,
        orderId,
        txHash,
        status: 'ESCROWED',
        escrow: {
          buyer: escrow.buyer.toString(),
          seller: escrow.seller.toString(),
          amountLocked: escrow.amountLocked.toString(),
          lockedAt: escrow.lockedAt.toNumber(),
        },
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: 'Failed to confirm lock',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ============================================================================
  // GET /api/blockchain/escrow/:orderId - Buscar status do escrow
  // ============================================================================
  app.get('/escrow/:orderId', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { orderId } = orderIdParamsSchema.parse(request.params);

      // 1. Buscar order no DB
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          blockchainOrderId: true,
          buyerAddr: true,
          sellerAddr: true,
          totalBzr: true,
          status: true,
          createdAt: true,
        },
      });

      if (!order) {
        return reply.status(404).send({ error: 'Order not found' });
      }

      // 2. Verificar se tem blockchainOrderId
      if (!order.blockchainOrderId) {
        return {
          exists: false,
          orderId,
          status: 'NOT_SYNCED',
          message: 'Order not yet synced with blockchain',
        };
      }

      // 3. Buscar escrow no blockchain usando blockchainOrderId (u64)
      const api = await blockchainService.getApi();
      const escrowData = await api.query.bazariEscrow.escrows(order.blockchainOrderId.toString());

      if (escrowData.isNone) {
        // Escrow não existe on-chain ainda
        return {
          exists: false,
          orderId,
          status: 'NOT_LOCKED',
        };
      }

      // 3. Parse escrow data
      const escrow = escrowData.unwrap();
      const amountLocked = escrow.amountLocked.toString();
      const lockedAt = escrow.lockedAt.toNumber();
      const status = escrow.status.toString();

      // PROPOSAL-001: Use dynamic auto-release blocks from order or calculate
      const escrowCalculator = getEscrowCalculator();
      const orderAutoReleaseBlocks = (order as any).autoReleaseBlocks
        || escrowCalculator.calculateAutoReleaseBlocks(
            (order as any).estimatedDeliveryDays,
            (order as any).shippingMethod
          );

      return {
        exists: true,
        orderId,
        buyer: escrow.buyer.toString(),
        seller: escrow.seller.toString(),
        amount: amountLocked, // Raw amount (planck)
        amountLocked, // Alias for compatibility
        amountFormatted: formatBzr(amountLocked), // Human-readable BZR
        amountReleased: escrow.amountReleased.toString(),
        status, // Raw status: Locked, Released, Refunded, PartialRefund, Disputed
        state: mapStatusToState(status), // Frontend EscrowState: Active, Released, Refunded, Disputed
        createdAt: lockedAt, // Block number when created
        lockedAt, // Alias for compatibility
        autoReleaseAt: lockedAt + orderAutoReleaseBlocks, // PROPOSAL-001: Dynamic auto-release
        autoReleaseBlocks: orderAutoReleaseBlocks, // PROPOSAL-001: Include for frontend
        updatedAt: escrow.updatedAt.toNumber(),
        // PROPOSAL-001: Include delivery info
        estimatedDeliveryDays: (order as any).estimatedDeliveryDays,
        shippingMethod: (order as any).shippingMethod,
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch escrow' });
    }
  });

  // ============================================================================
  // POST /api/blockchain/escrow/:orderId/lock - DEPRECATED
  // Use /prepare-lock instead. Frontend must sign the transaction.
  // ============================================================================
  app.post('/escrow/:orderId/lock', { preHandler: authOnRequest }, async (request, reply) => {
    return reply.status(410).send({
      error: 'Deprecated',
      message: 'Use /prepare-lock instead. Frontend must sign the transaction.',
      alternative: '/api/blockchain/escrow/:orderId/prepare-lock',
      reason: 'Backend signing with server key fails pallet authorization check. The buyer must sign directly.',
    });
  });

  // ============================================================================
  // POST /api/blockchain/escrow/:orderId/release - DEPRECATED
  // Use /prepare-release instead. Frontend must sign the transaction.
  // ============================================================================
  app.post('/escrow/:orderId/release', { preHandler: authOnRequest }, async (request, reply) => {
    return reply.status(410).send({
      error: 'Deprecated',
      message: 'Use /prepare-release instead. Frontend must sign the transaction.',
      alternative: '/api/blockchain/escrow/:orderId/prepare-release',
      reason: 'Backend signing with server key fails pallet authorization check. The buyer must sign directly.',
    });
  });

  // ============================================================================
  // POST /api/blockchain/escrow/:orderId/refund - DEPRECATED
  // Use /prepare-refund instead. DAO member must sign via multisig.
  // ============================================================================
  app.post('/escrow/:orderId/refund', { preHandler: authOnRequest }, async (request, reply) => {
    return reply.status(410).send({
      error: 'Deprecated',
      message: 'Use /prepare-refund instead. DAO member must sign via multisig or sudo.',
      alternative: '/api/blockchain/escrow/:orderId/prepare-refund',
      reason: 'Backend signing with server key fails pallet DAOOrigin check. Requires council multisig.',
    });
  });

  // ============================================================================
  // POST /api/blockchain/escrow/:orderId/dispute - Marcar como disputado
  // ============================================================================
  app.post('/escrow/:orderId/dispute', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { orderId } = orderIdParamsSchema.parse(request.params);
      const authUser = (request as any).authUser as { sub: string; address: string };

      const order = await prisma.order.findUnique({ where: { id: orderId } });

      if (!order) {
        return reply.status(404).send({ error: 'Order not found' });
      }

      // Validar que caller é buyer ou seller
      if (order.buyerAddr !== authUser.address && order.sellerAddr !== authUser.address) {
        return reply.status(403).send({ error: 'Unauthorized' });
      }

      // Atualizar status no DB (pallet não tem extrinsic dispute ainda, apenas enum)
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'TIMEOUT' }, // Closest to DISPUTED
      });

      await prisma.escrowLog.create({
        data: {
          orderId,
          kind: 'DISPUTE',
          payloadJson: {
            initiator: authUser.address,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        orderId,
        status: 'DISPUTED',
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to dispute' });
    }
  });

  // ============================================================================
  // GET /api/blockchain/escrow/:orderId/events - Histórico de eventos
  // ============================================================================
  app.get('/escrow/:orderId/events', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { orderId } = orderIdParamsSchema.parse(request.params);

      // Buscar logs do DB
      const logs = await prisma.escrowLog.findMany({
        where: { orderId },
        orderBy: { createdAt: 'desc' },
      });

      return {
        orderId,
        events: logs.map(log => ({
          kind: log.kind,
          timestamp: log.createdAt,
          ...(log.payloadJson as object),
        })),
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch events' });
    }
  });

  // ============================================================================
  // GET /api/blockchain/escrow/active - Listar escrows ativos
  // ============================================================================
  app.get('/escrow/active', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const authUser = (request as any).authUser as { sub: string; address: string };

      // Buscar orders do usuário com escrow locked
      const orders = await prisma.order.findMany({
        where: {
          OR: [
            { buyerAddr: authUser.address },
            { sellerAddr: authUser.address },
          ],
          status: {
            in: ['PENDING_PAYMENT', 'PAID', 'PROCESSING'],
          },
        },
        include: {
          paymentIntent: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const api = await blockchainService.getApi();
      const activeEscrows = [];

      for (const order of orders) {
        // Pular orders sem blockchainOrderId
        if (!order.blockchainOrderId) continue;

        const escrowData = await api.query.bazariEscrow.escrows(order.blockchainOrderId.toString());

        if (escrowData.isSome) {
          const escrow = escrowData.unwrap();
          if (escrow.status.toString() === 'Locked') {
            activeEscrows.push({
              orderId: order.id,
              blockchainOrderId: order.blockchainOrderId.toString(),
              buyer: escrow.buyer.toString(),
              seller: escrow.seller.toString(),
              amountLocked: escrow.amountLocked.toString(),
              lockedAt: escrow.lockedAt.toNumber(),
              updatedAt: escrow.updatedAt.toNumber(),
            });
          }
        }
      }

      return {
        active: activeEscrows,
        count: activeEscrows.length,
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch active escrows' });
    }
  });

  // ============================================================================
  // PROPOSAL-003: Batch Escrow Lock for Multi-Store Checkout
  // ============================================================================

  const batchPrepareSchema = z.object({
    checkoutSessionId: z.string().min(1),
  });

  // POST /api/blockchain/escrow/batch/prepare-lock - Prepare batch lock for all orders in session
  app.post('/escrow/batch/prepare-lock', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { checkoutSessionId } = batchPrepareSchema.parse(request.body);
      const authUser = (request as any).authUser as { sub: string; address: string };

      // 1. Buscar CheckoutSession com orders
      const session = await prisma.checkoutSession.findUnique({
        where: { id: checkoutSessionId },
        include: {
          orders: {
            include: { paymentIntents: true },
          },
        },
      });

      if (!session) {
        return reply.status(404).send({ error: 'Checkout session not found' });
      }

      // 2. Validar buyer
      if (session.buyerAddr !== authUser.address) {
        return reply.status(403).send({ error: 'Unauthorized: not buyer' });
      }

      // 3. Verificar status da sessão
      if (session.status !== 'PENDING') {
        return reply.status(400).send({
          error: 'Invalid session status',
          message: `Session status is ${session.status}, expected PENDING`,
        });
      }

      // 4. Verificar se não expirou
      if (new Date() > session.expiresAt) {
        await prisma.checkoutSession.update({
          where: { id: checkoutSessionId },
          data: { status: 'EXPIRED' },
        });
        return reply.status(400).send({
          error: 'Session expired',
          message: 'Checkout session has expired. Please create a new checkout.',
        });
      }

      // 5. Preparar calls para cada order
      const api = await blockchainService.getApi();
      const escrowCalculator = getEscrowCalculator();
      const lockCalls = [];
      const orderData = [];
      let totalAmount = BigInt(0);

      for (const order of session.orders) {
        // Verificar se order está em status CREATED
        if (order.status !== 'CREATED') {
          return reply.status(400).send({
            error: 'Invalid order status',
            message: `Order ${order.id} has status ${order.status}, expected CREATED`,
          });
        }

        // Verificar se tem blockchainOrderId
        if (!order.blockchainOrderId) {
          return reply.status(400).send({
            error: 'Order not synced with blockchain',
            message: `Order ${order.id} does not have a blockchainOrderId yet. Please wait for blockchain sync.`,
          });
        }

        // Verificar se já está locked
        const existing = await api.query.bazariEscrow.escrows(order.blockchainOrderId.toString());
        if (existing.isSome) {
          return reply.status(400).send({
            error: 'Escrow already locked',
            message: `Order ${order.id} escrow is already locked`,
          });
        }

        const orderTotalBzr = BigInt(order.totalBzr.toString());
        totalAmount += orderTotalBzr;

        // Calculate auto-release blocks
        const orderAny = order as any;
        const autoReleaseBlocks = orderAny.autoReleaseBlocks
          || escrowCalculator.calculateAutoReleaseBlocks(
              orderAny.estimatedDeliveryDays,
              orderAny.shippingMethod
            );

        // Prepare lock call
        const lockCall = api.tx.bazariEscrow.lockFunds(
          order.blockchainOrderId.toString(),
          order.sellerAddr,
          orderTotalBzr,
          null,              // asset_id
          autoReleaseBlocks, // auto_release_blocks
          null               // arbiter
        );

        lockCalls.push(lockCall);
        orderData.push({
          orderId: order.id,
          blockchainOrderId: order.blockchainOrderId.toString(),
          seller: order.sellerAddr,
          amount: orderTotalBzr.toString(),
          callHex: lockCall.toHex(),
        });
      }

      // 6. Create batchAll call
      const batchCall = api.tx.utility.batchAll(lockCalls);

      return {
        checkoutSessionId,
        orders: orderData,
        batchCallHex: batchCall.toHex(),
        batchCallHash: batchCall.hash.toHex(),
        totalAmount: totalAmount.toString(),
        buyer: session.buyerAddr,
        orderCount: session.orders.length,
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: 'Failed to prepare batch lock',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // POST /api/blockchain/escrow/batch/confirm-lock - Confirm batch lock after frontend signs
  const batchConfirmSchema = z.object({
    checkoutSessionId: z.string().min(1),
    txHash: z.string().min(1),
    blockNumber: z.string().optional(),
  });

  app.post('/escrow/batch/confirm-lock', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { checkoutSessionId, txHash, blockNumber } = batchConfirmSchema.parse(request.body);
      const authUser = (request as any).authUser as { sub: string; address: string };

      // 1. Buscar CheckoutSession
      const session = await prisma.checkoutSession.findUnique({
        where: { id: checkoutSessionId },
        include: { orders: true },
      });

      if (!session) {
        return reply.status(404).send({ error: 'Checkout session not found' });
      }

      // 2. Validar buyer
      if (session.buyerAddr !== authUser.address) {
        return reply.status(403).send({ error: 'Unauthorized: not buyer' });
      }

      // 3. Verificar cada order on-chain
      const api = await blockchainService.getApi();
      const confirmedOrders = [];
      const failedOrders = [];

      for (const order of session.orders) {
        if (!order.blockchainOrderId) {
          failedOrders.push({ orderId: order.id, reason: 'No blockchainOrderId' });
          continue;
        }

        const escrowData = await api.query.bazariEscrow.escrows(order.blockchainOrderId.toString());

        if (escrowData.isNone) {
          failedOrders.push({ orderId: order.id, reason: 'Escrow not found on-chain' });
          continue;
        }

        const escrow = escrowData.unwrap();
        if (escrow.status.toString() !== 'Locked') {
          failedOrders.push({ orderId: order.id, reason: `Invalid status: ${escrow.status.toString()}` });
          continue;
        }

        // Update order status
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'ESCROWED' },
        });

        // Log escrow event
        await prisma.escrowLog.create({
          data: {
            orderId: order.id,
            kind: 'LOCK',
            payloadJson: {
              txHash,
              buyer: escrow.buyer.toString(),
              seller: escrow.seller.toString(),
              amount: escrow.amountLocked.toString(),
              blockNumber: blockNumber || escrow.lockedAt.toString(),
              lockedAt: escrow.lockedAt.toNumber(),
              timestamp: new Date().toISOString(),
              source: 'batch_lock',
              checkoutSessionId,
            },
          },
        });

        confirmedOrders.push({
          orderId: order.id,
          blockchainOrderId: order.blockchainOrderId.toString(),
          escrow: {
            buyer: escrow.buyer.toString(),
            seller: escrow.seller.toString(),
            amountLocked: escrow.amountLocked.toString(),
            lockedAt: escrow.lockedAt.toNumber(),
          },
        });
      }

      // 4. Update session status
      const allConfirmed = failedOrders.length === 0 && confirmedOrders.length === session.orders.length;
      await prisma.checkoutSession.update({
        where: { id: checkoutSessionId },
        data: {
          status: allConfirmed ? 'PAID' : 'FAILED',
          batchTxHash: txHash,
          paidAt: allConfirmed ? new Date() : null,
        },
      });

      return {
        success: allConfirmed,
        checkoutSessionId,
        txHash,
        confirmedOrders,
        failedOrders,
        message: allConfirmed
          ? `All ${confirmedOrders.length} orders confirmed`
          : `${confirmedOrders.length} orders confirmed, ${failedOrders.length} failed`,
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: 'Failed to confirm batch lock',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ============================================================================
  // GET /api/blockchain/escrow/urgent - Escrows próximos do auto-release (< 24h)
  // ============================================================================
  app.get('/escrow/urgent', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const authUser = (request as any).authUser as { sub: string; address: string };

      // Validar DAO member (Council member)
      const api = await blockchainService.getApi();

      let isDAOMember = false;
      try {
        const members = await api.query.council.members();
        const membersList = members.toJSON() as string[];
        isDAOMember = membersList.includes(authUser.address);
      } catch (error) {
        app.log.warn('Failed to query council members:', error);
        isDAOMember = false;
      }

      if (!isDAOMember) {
        return reply.status(403).send({ error: 'DAO members only' });
      }

      const currentBlock = await blockchainService.getCurrentBlock();
      const currentBlockNum = Number(currentBlock);

      // Usar constante definida no topo do arquivo
      const URGENT_THRESHOLD = 2_400; // 24h = 14,400s / 6s = 2,400 blocos

      const orders = await prisma.order.findMany({
        where: {
          status: {
            in: ['PENDING_PAYMENT', 'PAID', 'PROCESSING'],
          },
        },
      });

      const urgentEscrows = [];

      // PROPOSAL-001: Use EscrowCalculator for dynamic timeouts
      const escrowCalculator = getEscrowCalculator();

      for (const order of orders) {
        // Pular orders sem blockchainOrderId
        if (!order.blockchainOrderId) continue;

        const escrowData = await api.query.bazariEscrow.escrows(order.blockchainOrderId.toString());

        if (escrowData.isSome) {
          const escrow = escrowData.unwrap();
          if (escrow.status.toString() === 'Locked') {
            const lockedAt = escrow.lockedAt.toNumber();
            const blocksElapsed = currentBlockNum - lockedAt;

            // PROPOSAL-001: Use order's dynamic auto-release blocks
            const orderAny = order as any;
            const orderAutoReleaseBlocks = orderAny.autoReleaseBlocks
              || escrowCalculator.calculateAutoReleaseBlocks(
                  orderAny.estimatedDeliveryDays,
                  orderAny.shippingMethod
                );

            const blocksUntilRelease = orderAutoReleaseBlocks - blocksElapsed;

            if (blocksUntilRelease > 0 && blocksUntilRelease <= URGENT_THRESHOLD) {
              urgentEscrows.push({
                orderId: order.id,
                blockchainOrderId: order.blockchainOrderId.toString(),
                buyer: escrow.buyer.toString(),
                seller: escrow.seller.toString(),
                amountLocked: escrow.amountLocked.toString(),
                lockedAt,
                blocksUntilRelease,
                hoursUntilRelease: Math.floor((blocksUntilRelease * 6) / 3600),
                autoReleaseBlocks: orderAutoReleaseBlocks, // PROPOSAL-001
              });
            }
          }
        }
      }

      return {
        urgent: urgentEscrows,
        count: urgentEscrows.length,
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch urgent escrows' });
    }
  });
}
