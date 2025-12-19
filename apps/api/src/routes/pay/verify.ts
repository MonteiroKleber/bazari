// path: apps/api/src/routes/pay/verify.ts
// Bazari Pay - Public Verification Endpoint (PROMPT-04)

import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { getPayOnChainService } from '../../services/pay-onchain.service.js';

interface RouteOptions {
  prisma: PrismaClient;
}

const verifyRoutes: FastifyPluginAsync<RouteOptions> = async (fastify, opts) => {
  const { prisma } = opts;

  /**
   * GET /api/pay/verify/:onChainId
   * Public endpoint to verify a contract on-chain
   */
  fastify.get<{
    Params: { onChainId: string };
  }>('/verify/:onChainId', async (request, reply) => {
    const { onChainId } = request.params;

    // Validate onChainId format (should be hex string starting with 0x)
    if (!onChainId || !/^0x[a-fA-F0-9]{64}$/.test(onChainId)) {
      return reply.status(400).send({
        error: 'Invalid on-chain ID format',
        details: 'Expected 32-byte hex string (0x...)',
      });
    }

    // Check if contract exists in our database
    const dbContract = await prisma.payContract.findFirst({
      where: { onChainId },
      select: {
        id: true,
        status: true,
        baseValue: true,
        currency: true,
        period: true,
        paymentDay: true,
        createdAt: true,
        payer: {
          select: {
            id: true,
            profile: {
              select: {
                handle: true,
                displayName: true,
              },
            },
          },
        },
        receiver: {
          select: {
            id: true,
            profile: {
              select: {
                handle: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    // Get on-chain data
    const payOnChain = getPayOnChainService();

    if (!payOnChain || !payOnChain.isPalletAvailable()) {
      return reply.status(503).send({
        error: 'On-chain verification unavailable',
        offChainData: dbContract
          ? {
              exists: true,
              status: dbContract.status,
              verifiedAt: new Date().toISOString(),
            }
          : null,
      });
    }

    try {
      const onChainData = await payOnChain.getContract(onChainId);

      if (!onChainData) {
        return reply.status(404).send({
          verified: false,
          error: 'Contract not found on chain',
          offChainData: dbContract
            ? {
                exists: true,
                status: dbContract.status,
                note: 'Contract exists in database but not on chain yet',
              }
            : null,
        });
      }

      // Compare on-chain and off-chain data if both exist
      let syncStatus: 'synced' | 'mismatch' | 'onchain_only' = 'onchain_only';

      if (dbContract) {
        const statusMatch =
          onChainData.status.toUpperCase() === dbContract.status;
        syncStatus = statusMatch ? 'synced' : 'mismatch';
      }

      return reply.send({
        verified: true,
        syncStatus,
        onChainData: {
          id: onChainData.id,
          payer: onChainData.payer,
          receiver: onChainData.receiver,
          baseValue: onChainData.baseValue,
          period: onChainData.period,
          paymentDay: onChainData.paymentDay,
          status: onChainData.status,
          executionCount: onChainData.executionCount,
          totalPaid: onChainData.totalPaid,
          createdAtBlock: onChainData.createdAt,
          nextPaymentBlock: onChainData.nextPayment,
        },
        offChainData: dbContract
          ? {
              id: dbContract.id,
              status: dbContract.status,
              baseValue: dbContract.baseValue.toString(),
              currency: dbContract.currency,
              period: dbContract.period,
              paymentDay: dbContract.paymentDay,
              payer: {
                id: dbContract.payer.id,
                handle: dbContract.payer.profile?.handle ?? null,
                displayName: dbContract.payer.profile?.displayName ?? null,
              },
              receiver: {
                id: dbContract.receiver.id,
                handle: dbContract.receiver.profile?.handle ?? null,
                displayName: dbContract.receiver.profile?.displayName ?? null,
              },
              createdAt: dbContract.createdAt.toISOString(),
            }
          : null,
        verifiedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[PayVerify] Error verifying contract:', error);
      return reply.status(500).send({
        error: 'Verification failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/pay/verify/:onChainId/executions
   * Get execution history for a contract from chain
   */
  fastify.get<{
    Params: { onChainId: string };
  }>('/verify/:onChainId/executions', async (request, reply) => {
    const { onChainId } = request.params;

    if (!onChainId || !/^0x[a-fA-F0-9]{64}$/.test(onChainId)) {
      return reply.status(400).send({
        error: 'Invalid on-chain ID format',
      });
    }

    // Get executions from database
    const dbContract = await prisma.payContract.findFirst({
      where: { onChainId },
      select: {
        id: true,
        executions: {
          where: {
            status: 'SUCCESS',
            txHash: { not: null },
          },
          orderBy: { executedAt: 'desc' },
          take: 50,
          select: {
            id: true,
            periodRef: true,
            finalValue: true,
            txHash: true,
            blockNumber: true,
            executedAt: true,
          },
        },
      },
    });

    if (!dbContract) {
      return reply.status(404).send({
        error: 'Contract not found',
      });
    }

    return reply.send({
      contractOnChainId: onChainId,
      executions: dbContract.executions.map((e) => ({
        id: e.id,
        periodRef: e.periodRef,
        value: e.finalValue.toString(),
        txHash: e.txHash,
        blockNumber: e.blockNumber,
        executedAt: e.executedAt?.toISOString(),
      })),
      total: dbContract.executions.length,
      verifiedAt: new Date().toISOString(),
    });
  });
};

export default verifyRoutes;
