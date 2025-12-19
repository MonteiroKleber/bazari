// path: apps/api/src/routes/pay/receipts.ts
// Bazari Pay - Receipt Endpoints (PROMPT-05)

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authOnRequest } from '../../lib/auth/middleware.js';
import type { AccessTokenPayload } from '../../lib/auth/jwt.js';
import { getPayReceiptService } from '../../services/pay-receipt.service.js';

export default async function payReceiptsRoutes(
  fastify: FastifyInstance,
  opts: { prisma: PrismaClient }
) {
  const { prisma } = opts;

  function getAuthUser(request: FastifyRequest): AccessTokenPayload {
    const authReq = request as FastifyRequest & { authUser: AccessTokenPayload };
    return authReq.authUser;
  }

  /**
   * GET /api/pay/receipts/:executionId
   * Get receipt data for an execution
   */
  fastify.get<{ Params: { executionId: string } }>(
    '/receipts/:executionId',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { executionId } = request.params;

      // Verify user has access to this execution
      const execution = await prisma.payExecution.findUnique({
        where: { id: executionId },
        include: {
          contract: {
            select: {
              payerId: true,
              receiverId: true,
              payerCompanyId: true,
            },
          },
        },
      });

      if (!execution) {
        return reply.status(404).send({ error: 'Execucao nao encontrada' });
      }

      // Check access
      const sellerProfiles = await prisma.sellerProfile.findMany({
        where: { userId: authUser.sub },
        select: { id: true },
      });
      const sellerProfileIds = sellerProfiles.map((sp) => sp.id);

      const isPayer =
        execution.contract.payerId === authUser.sub ||
        sellerProfileIds.includes(execution.contract.payerCompanyId || '');
      const isReceiver = execution.contract.receiverId === authUser.sub;

      if (!isPayer && !isReceiver) {
        return reply.status(403).send({ error: 'Acesso negado' });
      }

      const receiptService = getPayReceiptService();
      if (!receiptService) {
        return reply.status(503).send({ error: 'Servico de comprovantes indisponivel' });
      }

      try {
        const data = await receiptService.getReceiptData(executionId);
        return reply.send(data);
      } catch (error) {
        console.error('[PayReceipts] Error getting receipt data:', error);
        return reply.status(500).send({ error: 'Erro ao gerar comprovante' });
      }
    }
  );

  /**
   * GET /api/pay/receipts/:executionId/html
   * Get receipt as HTML (for viewing/printing)
   */
  fastify.get<{ Params: { executionId: string } }>(
    '/receipts/:executionId/html',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { executionId } = request.params;

      // Verify user has access to this execution
      const execution = await prisma.payExecution.findUnique({
        where: { id: executionId },
        include: {
          contract: {
            select: {
              payerId: true,
              receiverId: true,
              payerCompanyId: true,
            },
          },
        },
      });

      if (!execution) {
        return reply.status(404).send({ error: 'Execucao nao encontrada' });
      }

      // Check access
      const sellerProfiles = await prisma.sellerProfile.findMany({
        where: { userId: authUser.sub },
        select: { id: true },
      });
      const sellerProfileIds = sellerProfiles.map((sp) => sp.id);

      const isPayer =
        execution.contract.payerId === authUser.sub ||
        sellerProfileIds.includes(execution.contract.payerCompanyId || '');
      const isReceiver = execution.contract.receiverId === authUser.sub;

      if (!isPayer && !isReceiver) {
        return reply.status(403).send({ error: 'Acesso negado' });
      }

      const receiptService = getPayReceiptService();
      if (!receiptService) {
        return reply.status(503).send({ error: 'Servico de comprovantes indisponivel' });
      }

      try {
        const html = await receiptService.generateReceiptHtml(executionId);
        return reply.type('text/html').send(html);
      } catch (error) {
        console.error('[PayReceipts] Error generating receipt HTML:', error);
        return reply.status(500).send({ error: 'Erro ao gerar comprovante' });
      }
    }
  );

  /**
   * GET /api/pay/receipts/public/:txHash
   * Public endpoint to view receipt by transaction hash
   */
  fastify.get<{ Params: { txHash: string } }>(
    '/receipts/public/:txHash',
    async (request, reply) => {
      const { txHash } = request.params;

      // Find execution by txHash
      const execution = await prisma.payExecution.findFirst({
        where: { txHash },
        select: { id: true },
      });

      if (!execution) {
        return reply.status(404).send({ error: 'Comprovante nao encontrado' });
      }

      const receiptService = getPayReceiptService();
      if (!receiptService) {
        return reply.status(503).send({ error: 'Servico de comprovantes indisponivel' });
      }

      try {
        const html = await receiptService.generateReceiptHtml(execution.id);
        return reply.type('text/html').send(html);
      } catch (error) {
        console.error('[PayReceipts] Error generating public receipt:', error);
        return reply.status(500).send({ error: 'Erro ao gerar comprovante' });
      }
    }
  );
}
