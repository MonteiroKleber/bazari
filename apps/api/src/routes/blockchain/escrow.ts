// Backend REST API - Escrow Routes
// Conecta frontend → pallet bazari-escrow via Polkadot.js
// path: apps/api/src/routes/blockchain/escrow.ts
// @ts-nocheck - Polkadot.js type incompatibilities

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../../lib/auth/middleware.js';
import { BlockchainService } from '../../services/blockchain/blockchain.service.js';

const orderIdParamsSchema = z.object({
  orderId: z.string().uuid(),
});

export async function escrowRoutes(
  app: FastifyInstance,
  options: FastifyPluginOptions & { prisma: PrismaClient }
) {
  const { prisma } = options;
  const blockchainService = BlockchainService.getInstance();

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

      // 2. Buscar escrow no blockchain
      const api = await blockchainService.getApi();
      const escrowData = await api.query.bazariEscrow.escrows(orderId);

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

      return {
        exists: true,
        orderId,
        buyer: escrow.buyer.toString(),
        seller: escrow.seller.toString(),
        amountLocked: escrow.amountLocked.toString(),
        amountReleased: escrow.amountReleased.toString(),
        status: escrow.status.toString(), // Locked, Released, Refunded, PartialRefund, Disputed
        lockedAt: escrow.lockedAt.toNumber(),
        updatedAt: escrow.updatedAt.toNumber(),
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch escrow' });
    }
  });

  // ============================================================================
  // POST /api/blockchain/escrow/:orderId/lock - Travar fundos
  // ============================================================================
  app.post('/escrow/:orderId/lock', { preHandler: authOnRequest }, async (request, reply) => {
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

      // 3. Verificar se já está locked
      const api = await blockchainService.getApi();
      const existing = await api.query.bazariEscrow.escrows(orderId);

      if (existing.isSome) {
        return reply.status(400).send({ error: 'Escrow already locked' });
      }

      // 4. Call pallet extrinsic
      const serverKey = blockchainService.getEscrowAccount();
      const totalBzr = BigInt(order.totalBzr.toString());

      const tx = api.tx.bazariEscrow.lockFunds(
        orderId,
        order.sellerAddr,
        totalBzr
      );

      // 5. Sign and send
      const result = await blockchainService.signAndSend(tx, serverKey);

      // 6. Update DB
      const paymentIntent = order.paymentIntents?.[0];
      if (paymentIntent) {
        await prisma.paymentIntent.update({
          where: { id: paymentIntent.id },
          data: {
            txHash: result.txHash,
            status: 'FUNDS_IN', // Locked
          },
        });
      }

      // 7. Log event
      await prisma.escrowLog.create({
        data: {
          orderId,
          kind: 'LOCK',
          payloadJson: {
            txHash: result.txHash,
            buyer: order.buyerAddr,
            seller: order.sellerAddr,
            amount: totalBzr.toString(),
            blockNumber: result.blockNumber.toString(),
            timestamp: new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        txHash: result.txHash,
        orderId,
        blockNumber: result.blockNumber.toString(),
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: 'Failed to lock funds',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ============================================================================
  // POST /api/blockchain/escrow/:orderId/release - Liberar fundos para seller
  // ============================================================================
  app.post('/escrow/:orderId/release', { preHandler: authOnRequest }, async (request, reply) => {
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

      // 2. Validar buyer (apenas buyer pode release)
      if (order.buyerAddr !== authUser.address) {
        return reply.status(403).send({ error: 'Unauthorized: only buyer can release' });
      }

      // 3. Verificar escrow existe e status
      const api = await blockchainService.getApi();
      const escrowData = await api.query.bazariEscrow.escrows(orderId);

      if (escrowData.isNone) {
        return reply.status(400).send({ error: 'Escrow not found on blockchain' });
      }

      const escrow = escrowData.unwrap();
      if (escrow.status.toString() !== 'Locked') {
        return reply.status(400).send({
          error: 'Invalid escrow status',
          currentStatus: escrow.status.toString(),
        });
      }

      // 4. Call pallet extrinsic
      const serverKey = blockchainService.getEscrowAccount();
      const tx = api.tx.bazariEscrow.releaseFunds(orderId);

      // 5. Sign and send
      const result = await blockchainService.signAndSend(tx, serverKey);

      // 6. Update DB
      const paymentIntent = order.paymentIntents?.[0];
      if (paymentIntent) {
        await prisma.paymentIntent.update({
          where: { id: paymentIntent.id },
          data: {
            txHashRelease: result.txHash,
            status: 'RELEASED',
          },
        });
      }

      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'DELIVERED' },
      });

      // 7. Log event
      await prisma.escrowLog.create({
        data: {
          orderId,
          kind: 'RELEASE',
          payloadJson: {
            txHash: result.txHash,
            seller: order.sellerAddr,
            amount: escrow.amountLocked.toString(),
            blockNumber: result.blockNumber.toString(),
            timestamp: new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        txHash: result.txHash,
        orderId,
        blockNumber: result.blockNumber.toString(),
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: 'Failed to release funds',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ============================================================================
  // POST /api/blockchain/escrow/:orderId/refund - Refund (DAO only)
  // ============================================================================
  app.post('/escrow/:orderId/refund', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { orderId } = orderIdParamsSchema.parse(request.params);
      const authUser = (request as any).authUser as { sub: string; address: string };

      // 1. Validar DAO member (Council member)
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
        return reply.status(403).send({ error: 'Unauthorized: DAO members only' });
      }

      // 2. Buscar order
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { paymentIntents: true },
      });

      if (!order) {
        return reply.status(404).send({ error: 'Order not found' });
      }

      // 3. Verificar escrow
      const escrowData = await api.query.bazariEscrow.escrows(orderId);

      if (escrowData.isNone) {
        return reply.status(400).send({ error: 'Escrow not found' });
      }

      const escrow = escrowData.unwrap();
      if (escrow.status.toString() !== 'Locked') {
        return reply.status(400).send({ error: 'Invalid status for refund' });
      }

      // 4. Call pallet (DAO origin required)
      const serverKey = blockchainService.getEscrowAccount();
      const tx = api.tx.bazariEscrow.refund(orderId);

      // 5. Sign and send
      const result = await blockchainService.signAndSend(tx, serverKey);

      // 6. Update DB
      const paymentIntent = order.paymentIntents?.[0];
      if (paymentIntent) {
        await prisma.paymentIntent.update({
          where: { id: paymentIntent.id },
          data: {
            txHashRefund: result.txHash,
            status: 'REFUNDED',
          },
        });
      }

      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });

      // 7. Log event
      await prisma.escrowLog.create({
        data: {
          orderId,
          kind: 'REFUND',
          payloadJson: {
            txHash: result.txHash,
            buyer: order.buyerAddr,
            amount: escrow.amountLocked.toString(),
            daoMember: authUser.address,
            blockNumber: result.blockNumber.toString(),
            timestamp: new Date().toISOString(),
          },
        },
      });

      return {
        success: true,
        txHash: result.txHash,
        orderId,
        blockNumber: result.blockNumber.toString(),
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: 'Failed to refund',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
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
        const escrowData = await api.query.bazariEscrow.escrows(order.id);

        if (escrowData.isSome) {
          const escrow = escrowData.unwrap();
          if (escrow.status.toString() === 'Locked') {
            activeEscrows.push({
              orderId: order.id,
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

      // Auto-release após 7 dias = 100,800 blocos (6s/block)
      // TODO: Pallet não tem auto-release hooks implementado ainda
      // Este cálculo é manual e serve apenas para UI
      const AUTO_RELEASE_BLOCKS = 100_800;
      const URGENT_THRESHOLD = 2_400; // 24h = 14,400s / 6s = 2,400 blocos

      const orders = await prisma.order.findMany({
        where: {
          status: {
            in: ['PENDING_PAYMENT', 'PAID', 'PROCESSING'],
          },
        },
      });

      const urgentEscrows = [];

      for (const order of orders) {
        const escrowData = await api.query.bazariEscrow.escrows(order.id);

        if (escrowData.isSome) {
          const escrow = escrowData.unwrap();
          if (escrow.status.toString() === 'Locked') {
            const lockedAt = escrow.lockedAt.toNumber();
            const blocksElapsed = currentBlockNum - lockedAt;
            const blocksUntilRelease = AUTO_RELEASE_BLOCKS - blocksElapsed;

            if (blocksUntilRelease > 0 && blocksUntilRelease <= URGENT_THRESHOLD) {
              urgentEscrows.push({
                orderId: order.id,
                buyer: escrow.buyer.toString(),
                seller: escrow.seller.toString(),
                amountLocked: escrow.amountLocked.toString(),
                lockedAt,
                blocksUntilRelease,
                hoursUntilRelease: Math.floor((blocksUntilRelease * 6) / 3600),
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
