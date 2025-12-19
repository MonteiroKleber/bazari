// path: apps/api/src/routes/pay/executions.ts
// Bazari Pay - Endpoints de Execuções (PROMPT-02)

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PrismaClient, ExecutionStatus } from '@prisma/client';
import { authOnRequest } from '../../lib/auth/middleware.js';
import type { AccessTokenPayload } from '../../lib/auth/jwt.js';

export default async function payExecutionsRoutes(
  fastify: FastifyInstance,
  opts: { prisma: PrismaClient }
) {
  const { prisma } = opts;

  function getAuthUser(request: FastifyRequest): AccessTokenPayload {
    const authReq = request as FastifyRequest & { authUser: AccessTokenPayload };
    return authReq.authUser;
  }

  // GET /api/pay/contracts/:id/executions
  // Lista execuções de um contrato específico
  fastify.get<{
    Params: { id: string };
    Querystring: { cursor?: string; limit?: string };
  }>('/contracts/:id/executions', { onRequest: [authOnRequest] }, async (request, reply) => {
    const authUser = getAuthUser(request);
    const { id } = request.params;
    const limit = Math.min(parseInt(request.query.limit || '20'), 50);
    const cursor = request.query.cursor;

    // Verificar se o usuário tem acesso ao contrato
    const contract = await prisma.payContract.findFirst({
      where: {
        id,
        OR: [
          { payerId: authUser.sub },
          { receiverId: authUser.sub },
        ],
      },
    });

    if (!contract) {
      return reply.status(404).send({ error: 'Contrato não encontrado' });
    }

    const executions = await prisma.payExecution.findMany({
      where: { contractId: id },
      orderBy: { scheduledAt: 'desc' },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      select: {
        id: true,
        periodRef: true,
        periodStart: true,
        periodEnd: true,
        baseValue: true,
        adjustmentsTotal: true,
        finalValue: true,
        currency: true,
        status: true,
        attemptCount: true,
        failureReason: true,
        txHash: true,
        blockNumber: true,
        scheduledAt: true,
        executedAt: true,
        nextRetryAt: true,
        createdAt: true,
      },
    });

    const hasMore = executions.length > limit;
    const items = hasMore ? executions.slice(0, -1) : executions;

    // Mapear para formato de resposta
    const mappedItems = items.map((e) => ({
      id: e.id,
      periodRef: e.periodRef,
      periodStart: e.periodStart.toISOString(),
      periodEnd: e.periodEnd.toISOString(),
      baseValue: e.baseValue.toString(),
      adjustmentsTotal: e.adjustmentsTotal.toString(),
      finalValue: e.finalValue.toString(),
      currency: e.currency,
      status: e.status,
      attemptCount: e.attemptCount,
      failureReason: e.failureReason,
      txHash: e.txHash,
      blockNumber: e.blockNumber,
      scheduledAt: e.scheduledAt.toISOString(),
      executedAt: e.executedAt?.toISOString() || null,
      nextRetryAt: e.nextRetryAt?.toISOString() || null,
      createdAt: e.createdAt.toISOString(),
    }));

    return reply.send({
      executions: mappedItems,
      nextCursor: hasMore && items.length > 0 ? items[items.length - 1].id : null,
    });
  });

  // GET /api/pay/executions/history
  // Histórico geral de pagamentos do usuário
  fastify.get<{
    Querystring: {
      role?: 'payer' | 'receiver';
      status?: ExecutionStatus;
      startDate?: string;
      endDate?: string;
      cursor?: string;
      limit?: string;
    };
  }>('/executions/history', { onRequest: [authOnRequest] }, async (request, reply) => {
    const authUser = getAuthUser(request);
    const { role, status, startDate, endDate } = request.query;
    const limit = Math.min(parseInt(request.query.limit || '20'), 50);
    const cursor = request.query.cursor;

    // Buscar seller profiles do usuário
    const sellerProfiles = await prisma.sellerProfile.findMany({
      where: { userId: authUser.sub },
      select: { id: true },
    });
    const sellerProfileIds = sellerProfiles.map((sp) => sp.id);

    // Construir filtro de contratos
    const contractFilter: any = {};
    if (role === 'payer') {
      contractFilter.OR = [
        { payerId: authUser.sub },
        ...(sellerProfileIds.length > 0
          ? [{ payerCompanyId: { in: sellerProfileIds } }]
          : []),
      ];
    } else if (role === 'receiver') {
      contractFilter.receiverId = authUser.sub;
    } else {
      contractFilter.OR = [
        { payerId: authUser.sub },
        { receiverId: authUser.sub },
        ...(sellerProfileIds.length > 0
          ? [{ payerCompanyId: { in: sellerProfileIds } }]
          : []),
      ];
    }

    // Construir filtro de execuções
    const executionFilter: any = {
      contract: contractFilter,
    };

    if (status) {
      executionFilter.status = status;
    }

    if (startDate || endDate) {
      executionFilter.scheduledAt = {};
      if (startDate) {
        executionFilter.scheduledAt.gte = new Date(startDate);
      }
      if (endDate) {
        executionFilter.scheduledAt.lte = new Date(endDate);
      }
    }

    const executions = await prisma.payExecution.findMany({
      where: executionFilter,
      include: {
        contract: {
          include: {
            payer: {
              include: { profile: true },
            },
            receiver: {
              include: { profile: true },
            },
            payerCompany: true,
          },
        },
      },
      orderBy: { scheduledAt: 'desc' },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
    });

    const hasMore = executions.length > limit;
    const items = hasMore ? executions.slice(0, -1) : executions;

    // Mapear para formato de resposta
    const mappedItems = items.map((e) => {
      const isPayer =
        e.contract.payerId === authUser.sub ||
        sellerProfileIds.includes(e.contract.payerCompanyId || '');
      const otherParty = isPayer ? e.contract.receiver : e.contract.payer;
      const otherProfile = otherParty.profile;

      return {
        id: e.id,
        contractId: e.contractId,
        role: isPayer ? 'payer' : 'receiver',
        otherParty: {
          id: otherParty.id,
          name: otherProfile?.displayName || 'Usuário',
          handle: otherProfile?.handle || null,
          avatarUrl: otherProfile?.avatarUrl || null,
        },
        periodRef: e.periodRef,
        periodStart: e.periodStart.toISOString(),
        periodEnd: e.periodEnd.toISOString(),
        baseValue: e.baseValue.toString(),
        adjustmentsTotal: e.adjustmentsTotal.toString(),
        finalValue: e.finalValue.toString(),
        currency: e.currency,
        status: e.status,
        attemptCount: e.attemptCount,
        failureReason: e.failureReason,
        txHash: e.txHash,
        blockNumber: e.blockNumber,
        scheduledAt: e.scheduledAt.toISOString(),
        executedAt: e.executedAt?.toISOString() || null,
        nextRetryAt: e.nextRetryAt?.toISOString() || null,
        description: e.contract.description,
        createdAt: e.createdAt.toISOString(),
      };
    });

    return reply.send({
      executions: mappedItems,
      nextCursor: hasMore && items.length > 0 ? items[items.length - 1].id : null,
    });
  });

  // GET /api/pay/executions/:id
  // Detalhes de uma execução específica
  fastify.get<{
    Params: { id: string };
  }>('/executions/:id', { onRequest: [authOnRequest] }, async (request, reply) => {
    const authUser = getAuthUser(request);
    const { id } = request.params;

    // Buscar seller profiles
    const sellerProfiles = await prisma.sellerProfile.findMany({
      where: { userId: authUser.sub },
      select: { id: true },
    });
    const sellerProfileIds = sellerProfiles.map((sp) => sp.id);

    const execution = await prisma.payExecution.findFirst({
      where: {
        id,
        contract: {
          OR: [
            { payerId: authUser.sub },
            { receiverId: authUser.sub },
            ...(sellerProfileIds.length > 0
              ? [{ payerCompanyId: { in: sellerProfileIds } }]
              : []),
          ],
        },
      },
      include: {
        contract: {
          include: {
            payer: {
              include: { profile: true },
            },
            receiver: {
              include: { profile: true },
            },
            payerCompany: true,
          },
        },
      },
    });

    if (!execution) {
      return reply.status(404).send({ error: 'Execução não encontrada' });
    }

    const isPayer =
      execution.contract.payerId === authUser.sub ||
      sellerProfileIds.includes(execution.contract.payerCompanyId || '');

    return reply.send({
      execution: {
        id: execution.id,
        contractId: execution.contractId,
        role: isPayer ? 'payer' : 'receiver',
        contract: {
          id: execution.contract.id,
          description: execution.contract.description,
          period: execution.contract.period,
          paymentDay: execution.contract.paymentDay,
          payer: {
            id: execution.contract.payer.id,
            displayName: execution.contract.payer.profile?.displayName || null,
            handle: execution.contract.payer.profile?.handle || null,
            avatarUrl: execution.contract.payer.profile?.avatarUrl || null,
          },
          receiver: {
            id: execution.contract.receiver.id,
            displayName: execution.contract.receiver.profile?.displayName || null,
            handle: execution.contract.receiver.profile?.handle || null,
            avatarUrl: execution.contract.receiver.profile?.avatarUrl || null,
          },
          payerCompany: execution.contract.payerCompany
            ? { id: execution.contract.payerCompany.id, businessName: execution.contract.payerCompany.shopName }
            : null,
          payerWallet: execution.contract.payerWallet,
          receiverWallet: execution.contract.receiverWallet,
        },
        periodRef: execution.periodRef,
        periodStart: execution.periodStart.toISOString(),
        periodEnd: execution.periodEnd.toISOString(),
        baseValue: execution.baseValue.toString(),
        adjustmentsTotal: execution.adjustmentsTotal.toString(),
        finalValue: execution.finalValue.toString(),
        currency: execution.currency,
        status: execution.status,
        attemptCount: execution.attemptCount,
        failureReason: execution.failureReason,
        txHash: execution.txHash,
        blockNumber: execution.blockNumber,
        scheduledAt: execution.scheduledAt.toISOString(),
        executedAt: execution.executedAt?.toISOString() || null,
        nextRetryAt: execution.nextRetryAt?.toISOString() || null,
        createdAt: execution.createdAt.toISOString(),
        updatedAt: execution.updatedAt.toISOString(),
      },
    });
  });

  // GET /api/pay/executions/stats
  // Estatísticas de execuções do usuário
  fastify.get('/executions/stats', { onRequest: [authOnRequest] }, async (request, reply) => {
    const authUser = getAuthUser(request);

    // Buscar seller profiles
    const sellerProfiles = await prisma.sellerProfile.findMany({
      where: { userId: authUser.sub },
      select: { id: true },
    });
    const sellerProfileIds = sellerProfiles.map((sp) => sp.id);

    const contractFilter = {
      OR: [
        { payerId: authUser.sub },
        { receiverId: authUser.sub },
        ...(sellerProfileIds.length > 0
          ? [{ payerCompanyId: { in: sellerProfileIds } }]
          : []),
      ],
    };

    // Contar por status
    const [scheduled, processing, success, failed, retrying] = await Promise.all([
      prisma.payExecution.count({
        where: { contract: contractFilter, status: 'SCHEDULED' },
      }),
      prisma.payExecution.count({
        where: { contract: contractFilter, status: 'PROCESSING' },
      }),
      prisma.payExecution.count({
        where: { contract: contractFilter, status: 'SUCCESS' },
      }),
      prisma.payExecution.count({
        where: { contract: contractFilter, status: 'FAILED' },
      }),
      prisma.payExecution.count({
        where: { contract: contractFilter, status: 'RETRYING' },
      }),
    ]);

    // Contagem total e pendentes
    const total = scheduled + processing + success + failed + retrying;
    const pending = scheduled + processing + retrying;

    return reply.send({
      stats: {
        total,
        pending,
        scheduled,
        processing,
        success,
        failed,
        retrying,
      },
    });
  });
}
