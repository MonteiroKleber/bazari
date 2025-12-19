// path: apps/api/src/routes/pay/api-v1/contracts.ts
// Bazari Pay - API v1 Contracts Routes (PROMPT-06)

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PrismaClient, PayPeriod } from '@prisma/client';
import { apiKeyAuth, requirePermission } from '../../../middleware/api-key.middleware.js';

interface CreateContractBody {
  receiverWallet: string;
  receiverHandle?: string;
  baseValue: string;
  currency?: string;
  period: PayPeriod;
  paymentDay: number;
  startDate: string;
  endDate?: string;
  description?: string;
  referenceType?: string;
  referenceId?: string;
}

interface BulkCreateBody {
  contracts: CreateContractBody[];
}

export default async function apiV1ContractsRoutes(
  fastify: FastifyInstance,
  opts: { prisma: PrismaClient }
) {
  const { prisma } = opts;

  // All routes require API key authentication
  fastify.addHook('onRequest', apiKeyAuth);

  /**
   * GET /api/pay/v1/contracts
   * List contracts for the company
   */
  fastify.get<{
    Querystring: {
      status?: string;
      receiverId?: string;
      page?: string;
      limit?: string;
    };
  }>('/contracts', async (request, reply) => {
    const { companyId } = request;
    const { status, receiverId, page = '1', limit = '50' } = request.query;

    const where: any = {
      payerCompanyId: companyId,
    };

    if (status) {
      where.status = status.toUpperCase();
    }

    if (receiverId) {
      where.receiverId = receiverId;
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [contracts, total] = await Promise.all([
      prisma.payContract.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          receiverId: true,
          receiverWallet: true,
          baseValue: true,
          currency: true,
          period: true,
          paymentDay: true,
          status: true,
          startDate: true,
          endDate: true,
          nextPaymentDate: true,
          description: true,
          referenceType: true,
          referenceId: true,
          onChainId: true,
          createdAt: true,
          receiver: {
            select: {
              profile: {
                select: { handle: true, displayName: true },
              },
            },
          },
        },
      }),
      prisma.payContract.count({ where }),
    ]);

    return reply.send({
      items: contracts.map(c => ({
        id: c.id,
        receiverId: c.receiverId,
        receiverWallet: c.receiverWallet,
        receiverHandle: c.receiver.profile?.handle || null,
        receiverName: c.receiver.profile?.displayName || null,
        baseValue: c.baseValue.toString(),
        currency: c.currency,
        period: c.period,
        paymentDay: c.paymentDay,
        status: c.status,
        startDate: c.startDate.toISOString(),
        endDate: c.endDate?.toISOString() || null,
        nextPaymentDate: c.nextPaymentDate.toISOString(),
        description: c.description,
        referenceType: c.referenceType,
        referenceId: c.referenceId,
        onChainId: c.onChainId,
        createdAt: c.createdAt.toISOString(),
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  });

  /**
   * POST /api/pay/v1/contracts
   * Create a new contract
   */
  fastify.post<{ Body: CreateContractBody }>(
    '/contracts',
    { preHandler: [requirePermission('contracts:write')] },
    async (request, reply) => {
      const { companyId } = request;
      const body = request.body;

      // Validate required fields
      if (!body.receiverWallet && !body.receiverHandle) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'receiverWallet ou receiverHandle é obrigatório',
        });
      }

      if (!body.baseValue || !body.period || !body.paymentDay || !body.startDate) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'baseValue, period, paymentDay e startDate são obrigatórios',
        });
      }

      // Get company info
      const company = await prisma.sellerProfile.findUnique({
        where: { id: companyId },
        include: {
          user: { select: { id: true, address: true } },
        },
      });

      if (!company) {
        return reply.status(404).send({ error: 'Company not found' });
      }

      // Find receiver
      let receiverId: string | null = null;
      let receiverWallet = body.receiverWallet;

      if (body.receiverHandle) {
        const handle = body.receiverHandle.replace('@', '');
        const profile = await prisma.profile.findUnique({
          where: { handle },
          include: { user: { select: { id: true, address: true } } },
        });

        if (!profile?.user) {
          return reply.status(404).send({
            error: 'Not Found',
            message: `Usuário @${handle} não encontrado`,
          });
        }

        receiverId = profile.user.id;
        receiverWallet = receiverWallet || profile.user.address;
      } else if (receiverWallet) {
        // Find user by wallet
        const user = await prisma.user.findUnique({
          where: { address: receiverWallet },
        });
        receiverId = user?.id || null;
      }

      if (!receiverWallet) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'receiverWallet não pode ser determinado',
        });
      }

      // Calculate next payment date
      const startDate = new Date(body.startDate);
      const paymentDay = body.paymentDay;
      const now = new Date();
      let nextPaymentDate = new Date(startDate);
      nextPaymentDate.setDate(paymentDay);

      if (nextPaymentDate < now) {
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      }

      // Create contract
      const contract = await prisma.payContract.create({
        data: {
          payerId: company.userId,
          payerCompanyId: companyId,
          receiverId: receiverId || company.userId, // Fallback to payer if receiver not found
          payerWallet: company.user.address,
          receiverWallet,
          baseValue: body.baseValue,
          currency: body.currency || 'BZR',
          period: body.period,
          paymentDay,
          startDate,
          endDate: body.endDate ? new Date(body.endDate) : null,
          nextPaymentDate,
          description: body.description || null,
          referenceType: body.referenceType || null,
          referenceId: body.referenceId || null,
          status: 'ACTIVE',
        },
        include: {
          receiver: {
            select: {
              profile: { select: { handle: true } },
            },
          },
        },
      });

      return reply.status(201).send({
        id: contract.id,
        receiverId: contract.receiverId,
        receiverWallet: contract.receiverWallet,
        receiverHandle: contract.receiver.profile?.handle || null,
        baseValue: contract.baseValue.toString(),
        currency: contract.currency,
        period: contract.period,
        paymentDay: contract.paymentDay,
        status: contract.status,
        startDate: contract.startDate.toISOString(),
        endDate: contract.endDate?.toISOString() || null,
        nextPaymentDate: contract.nextPaymentDate.toISOString(),
        createdAt: contract.createdAt.toISOString(),
      });
    }
  );

  /**
   * GET /api/pay/v1/contracts/:id
   * Get contract details
   */
  fastify.get<{ Params: { id: string } }>(
    '/contracts/:id',
    async (request, reply) => {
      const { companyId } = request;
      const { id } = request.params;

      const contract = await prisma.payContract.findFirst({
        where: { id, payerCompanyId: companyId },
        include: {
          receiver: {
            select: {
              profile: { select: { handle: true, displayName: true } },
            },
          },
          executions: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true,
              periodRef: true,
              finalValue: true,
              status: true,
              executedAt: true,
              txHash: true,
            },
          },
        },
      });

      if (!contract) {
        return reply.status(404).send({ error: 'Contract not found' });
      }

      return reply.send({
        id: contract.id,
        receiverId: contract.receiverId,
        receiverWallet: contract.receiverWallet,
        receiverHandle: contract.receiver.profile?.handle || null,
        receiverName: contract.receiver.profile?.displayName || null,
        baseValue: contract.baseValue.toString(),
        currency: contract.currency,
        period: contract.period,
        paymentDay: contract.paymentDay,
        status: contract.status,
        startDate: contract.startDate.toISOString(),
        endDate: contract.endDate?.toISOString() || null,
        nextPaymentDate: contract.nextPaymentDate.toISOString(),
        description: contract.description,
        referenceType: contract.referenceType,
        referenceId: contract.referenceId,
        onChainId: contract.onChainId,
        createdAt: contract.createdAt.toISOString(),
        recentExecutions: contract.executions.map(e => ({
          id: e.id,
          periodRef: e.periodRef,
          value: e.finalValue.toString(),
          status: e.status,
          executedAt: e.executedAt?.toISOString() || null,
          txHash: e.txHash,
        })),
      });
    }
  );

  /**
   * PATCH /api/pay/v1/contracts/:id/status
   * Update contract status
   */
  fastify.patch<{
    Params: { id: string };
    Body: { status: 'ACTIVE' | 'PAUSED' | 'CLOSED'; reason?: string };
  }>(
    '/contracts/:id/status',
    { preHandler: [requirePermission('contracts:write')] },
    async (request, reply) => {
      const { companyId } = request;
      const { id } = request.params;
      const { status, reason } = request.body;

      if (!['ACTIVE', 'PAUSED', 'CLOSED'].includes(status)) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'status deve ser ACTIVE, PAUSED ou CLOSED',
        });
      }

      const contract = await prisma.payContract.findFirst({
        where: { id, payerCompanyId: companyId },
        include: { payerCompany: { select: { userId: true } } },
      });

      if (!contract) {
        return reply.status(404).send({ error: 'Contract not found' });
      }

      // Update contract
      const updated = await prisma.payContract.update({
        where: { id },
        data: {
          status,
          ...(status === 'PAUSED' && { pausedAt: new Date() }),
          ...(status === 'CLOSED' && { closedAt: new Date() }),
        },
      });

      // Record history
      await prisma.payContractStatusHistory.create({
        data: {
          contractId: id,
          fromStatus: contract.status,
          toStatus: status,
          reason: reason || null,
          changedById: contract.payerCompany?.userId || contract.payerId,
        },
      });

      return reply.send({
        id: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt.toISOString(),
      });
    }
  );

  /**
   * POST /api/pay/v1/contracts/bulk
   * Create multiple contracts
   */
  fastify.post<{ Body: BulkCreateBody }>(
    '/contracts/bulk',
    { preHandler: [requirePermission('contracts:write')] },
    async (request, reply) => {
      const { companyId } = request;
      const { contracts } = request.body;

      if (!Array.isArray(contracts) || contracts.length === 0) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'contracts array é obrigatório',
        });
      }

      if (contracts.length > 100) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Máximo de 100 contratos por requisição',
        });
      }

      // Get company info
      const company = await prisma.sellerProfile.findUnique({
        where: { id: companyId },
        include: {
          user: { select: { id: true, address: true } },
        },
      });

      if (!company) {
        return reply.status(404).send({ error: 'Company not found' });
      }

      const results: { success: any[]; errors: any[] } = {
        success: [],
        errors: [],
      };

      for (let i = 0; i < contracts.length; i++) {
        const body = contracts[i];
        try {
          // Find receiver
          let receiverId: string | null = null;
          let receiverWallet = body.receiverWallet;

          if (body.receiverHandle) {
            const handle = body.receiverHandle.replace('@', '');
            const profile = await prisma.profile.findUnique({
              where: { handle },
              include: { user: { select: { id: true, address: true } } },
            });

            if (profile?.user) {
              receiverId = profile.user.id;
              receiverWallet = receiverWallet || profile.user.address;
            }
          }

          if (!receiverWallet) {
            throw new Error('receiverWallet não pode ser determinado');
          }

          // Calculate next payment date
          const startDate = new Date(body.startDate);
          const paymentDay = body.paymentDay;
          const now = new Date();
          let nextPaymentDate = new Date(startDate);
          nextPaymentDate.setDate(paymentDay);

          if (nextPaymentDate < now) {
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
          }

          const contract = await prisma.payContract.create({
            data: {
              payerId: company.userId,
              payerCompanyId: companyId,
              receiverId: receiverId || company.userId,
              payerWallet: company.user.address,
              receiverWallet,
              baseValue: body.baseValue,
              currency: body.currency || 'BZR',
              period: body.period,
              paymentDay: body.paymentDay,
              startDate,
              endDate: body.endDate ? new Date(body.endDate) : null,
              nextPaymentDate,
              description: body.description || null,
              referenceType: body.referenceType || null,
              referenceId: body.referenceId || null,
              status: 'ACTIVE',
            },
          });

          results.success.push({
            index: i,
            id: contract.id,
          });
        } catch (error) {
          results.errors.push({
            index: i,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return reply.send({
        total: contracts.length,
        created: results.success.length,
        failed: results.errors.length,
        success: results.success,
        errors: results.errors,
      });
    }
  );

  /**
   * GET /api/pay/v1/contracts/:id/executions
   * List contract executions
   */
  fastify.get<{
    Params: { id: string };
    Querystring: { page?: string; limit?: string };
  }>(
    '/contracts/:id/executions',
    async (request, reply) => {
      const { companyId } = request;
      const { id } = request.params;
      const { page = '1', limit = '50' } = request.query;

      // Verify access
      const contract = await prisma.payContract.findFirst({
        where: { id, payerCompanyId: companyId },
      });

      if (!contract) {
        return reply.status(404).send({ error: 'Contract not found' });
      }

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const [executions, total] = await Promise.all([
        prisma.payExecution.findMany({
          where: { contractId: id },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
          select: {
            id: true,
            periodRef: true,
            baseValue: true,
            adjustmentsTotal: true,
            finalValue: true,
            status: true,
            executedAt: true,
            txHash: true,
            blockNumber: true,
          },
        }),
        prisma.payExecution.count({ where: { contractId: id } }),
      ]);

      return reply.send({
        items: executions.map(e => ({
          id: e.id,
          periodRef: e.periodRef,
          baseValue: e.baseValue.toString(),
          adjustments: e.adjustmentsTotal.toString(),
          finalValue: e.finalValue.toString(),
          status: e.status,
          executedAt: e.executedAt?.toISOString() || null,
          txHash: e.txHash,
          blockNumber: e.blockNumber,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    }
  );
}
