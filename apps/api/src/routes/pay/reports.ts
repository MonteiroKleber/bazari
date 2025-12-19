// path: apps/api/src/routes/pay/reports.ts
// Bazari Pay - Reports Routes (PROMPT-06)

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authOnRequest } from '../../lib/auth/middleware.js';
import type { AccessTokenPayload } from '../../lib/auth/jwt.js';

export default async function payReportsRoutes(
  fastify: FastifyInstance,
  opts: { prisma: PrismaClient }
) {
  const { prisma } = opts;

  function getAuthUser(request: FastifyRequest): AccessTokenPayload {
    const authReq = request as FastifyRequest & { authUser: AccessTokenPayload };
    return authReq.authUser;
  }

  /**
   * GET /api/pay/reports/stats
   * Get enterprise statistics
   */
  fastify.get<{ Querystring: { companyId: string } }>(
    '/reports/stats',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { companyId } = request.query;

      if (!companyId) {
        return reply.status(400).send({ error: 'companyId é obrigatório' });
      }

      // Verify company ownership
      const company = await prisma.sellerProfile.findFirst({
        where: { id: companyId, userId: authUser.sub },
      });

      if (!company) {
        return reply.status(403).send({ error: 'Acesso negado à empresa' });
      }

      // Get contract counts
      const [
        activeContracts,
        pausedContracts,
        closedContracts,
        totalContracts,
      ] = await Promise.all([
        prisma.payContract.count({ where: { payerCompanyId: companyId, status: 'ACTIVE' } }),
        prisma.payContract.count({ where: { payerCompanyId: companyId, status: 'PAUSED' } }),
        prisma.payContract.count({ where: { payerCompanyId: companyId, status: 'CLOSED' } }),
        prisma.payContract.count({ where: { payerCompanyId: companyId } }),
      ]);

      // Calculate monthly total (sum of base values for active contracts)
      const activeContractsData = await prisma.payContract.findMany({
        where: { payerCompanyId: companyId, status: 'ACTIVE' },
        select: { baseValue: true },
      });

      const monthlyTotal = activeContractsData.reduce(
        (sum, c) => sum + parseFloat(c.baseValue.toString()),
        0
      );

      // Get upcoming payments (next 7 days)
      const next7Days = new Date();
      next7Days.setDate(next7Days.getDate() + 7);

      const upcomingPayments = await prisma.payContract.count({
        where: {
          payerCompanyId: companyId,
          status: 'ACTIVE',
          nextPaymentDate: { lte: next7Days },
        },
      });

      // Get success rate (last 30 days)
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);

      const [successfulExecutions, failedExecutions] = await Promise.all([
        prisma.payExecution.count({
          where: {
            contract: { payerCompanyId: companyId },
            status: 'SUCCESS',
            executedAt: { gte: last30Days },
          },
        }),
        prisma.payExecution.count({
          where: {
            contract: { payerCompanyId: companyId },
            status: 'FAILED',
            executedAt: { gte: last30Days },
          },
        }),
      ]);

      const totalExecutions = successfulExecutions + failedExecutions;
      const successRate = totalExecutions > 0
        ? Math.round((successfulExecutions / totalExecutions) * 100)
        : 100;

      return reply.send({
        contracts: {
          active: activeContracts,
          paused: pausedContracts,
          closed: closedContracts,
          total: totalContracts,
        },
        monthlyTotal: monthlyTotal.toString(),
        upcomingPayments,
        successRate,
        period: {
          from: last30Days.toISOString(),
          to: new Date().toISOString(),
        },
      });
    }
  );

  /**
   * GET /api/pay/reports/monthly
   * Get monthly report
   */
  fastify.get<{
    Querystring: { companyId: string; year: string; month: string };
  }>(
    '/reports/monthly',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { companyId, year, month } = request.query;

      if (!companyId || !year || !month) {
        return reply.status(400).send({ error: 'companyId, year e month são obrigatórios' });
      }

      // Verify company ownership
      const company = await prisma.sellerProfile.findFirst({
        where: { id: companyId, userId: authUser.sub },
      });

      if (!company) {
        return reply.status(403).send({ error: 'Acesso negado à empresa' });
      }

      const periodRef = `${year}-${month.padStart(2, '0')}`;
      const startDate = new Date(`${year}-${month.padStart(2, '0')}-01`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      // Get executions for the period
      const executions = await prisma.payExecution.findMany({
        where: {
          contract: { payerCompanyId: companyId },
          periodRef,
        },
        include: {
          contract: {
            select: {
              receiverId: true,
              receiver: {
                select: {
                  profile: { select: { handle: true, displayName: true } },
                },
              },
            },
          },
        },
      });

      // Aggregate by receiver
      const byReceiver: Record<string, {
        receiverId: string;
        handle: string | null;
        name: string | null;
        totalPaid: number;
        executionCount: number;
        successCount: number;
        failedCount: number;
      }> = {};

      let totalPaid = 0;
      let totalExtras = 0;
      let totalDiscounts = 0;
      let successCount = 0;
      let failedCount = 0;

      for (const execution of executions) {
        const receiverId = execution.contract.receiverId;

        if (!byReceiver[receiverId]) {
          byReceiver[receiverId] = {
            receiverId,
            handle: execution.contract.receiver.profile?.handle || null,
            name: execution.contract.receiver.profile?.displayName || null,
            totalPaid: 0,
            executionCount: 0,
            successCount: 0,
            failedCount: 0,
          };
        }

        byReceiver[receiverId].executionCount++;

        if (execution.status === 'SUCCESS') {
          const value = parseFloat(execution.finalValue.toString());
          byReceiver[receiverId].totalPaid += value;
          byReceiver[receiverId].successCount++;
          totalPaid += value;
          successCount++;

          const adjustments = parseFloat(execution.adjustmentsTotal.toString());
          if (adjustments > 0) {
            totalExtras += adjustments;
          } else if (adjustments < 0) {
            totalDiscounts += Math.abs(adjustments);
          }
        } else if (execution.status === 'FAILED') {
          byReceiver[receiverId].failedCount++;
          failedCount++;
        }
      }

      // Get contract count for the period
      const contractCount = await prisma.payContract.count({
        where: {
          payerCompanyId: companyId,
          createdAt: { lt: endDate },
          OR: [
            { closedAt: null },
            { closedAt: { gte: startDate } },
          ],
        },
      });

      const totalExecutions = successCount + failedCount;
      const successRate = totalExecutions > 0
        ? Math.round((successCount / totalExecutions) * 100)
        : 100;

      return reply.send({
        period: periodRef,
        summary: {
          totalContracts: contractCount,
          totalExecutions,
          successfulExecutions: successCount,
          failedExecutions: failedCount,
          totalPaid: totalPaid.toString(),
          totalExtras: totalExtras.toString(),
          totalDiscounts: totalDiscounts.toString(),
          successRate,
        },
        byReceiver: Object.values(byReceiver).map(r => ({
          ...r,
          totalPaid: r.totalPaid.toString(),
        })),
      });
    }
  );

  /**
   * GET /api/pay/reports/export
   * Export report as CSV
   */
  fastify.get<{
    Querystring: {
      companyId: string;
      startDate: string;
      endDate: string;
      format?: string;
    };
  }>(
    '/reports/export',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { companyId, startDate, endDate, format = 'csv' } = request.query;

      if (!companyId || !startDate || !endDate) {
        return reply.status(400).send({ error: 'companyId, startDate e endDate são obrigatórios' });
      }

      // Verify company ownership
      const company = await prisma.sellerProfile.findFirst({
        where: { id: companyId, userId: authUser.sub },
      });

      if (!company) {
        return reply.status(403).send({ error: 'Acesso negado à empresa' });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      // Get all executions in the period
      const executions = await prisma.payExecution.findMany({
        where: {
          contract: { payerCompanyId: companyId },
          executedAt: { gte: start, lte: end },
        },
        orderBy: { executedAt: 'desc' },
        include: {
          contract: {
            select: {
              id: true,
              receiverWallet: true,
              description: true,
              referenceType: true,
              referenceId: true,
              receiver: {
                select: {
                  profile: { select: { handle: true, displayName: true } },
                },
              },
            },
          },
        },
      });

      if (format === 'csv') {
        // Generate CSV
        const headers = [
          'Data',
          'Referência',
          'Recebedor Handle',
          'Recebedor Nome',
          'Wallet',
          'Valor Base',
          'Ajustes',
          'Valor Final',
          'Status',
          'TX Hash',
          'Ref. Tipo',
          'Ref. ID',
        ];

        const rows = executions.map(e => [
          e.executedAt?.toISOString() || '',
          e.periodRef,
          e.contract.receiver.profile?.handle || '',
          e.contract.receiver.profile?.displayName || '',
          e.contract.receiverWallet,
          e.baseValue.toString(),
          e.adjustmentsTotal.toString(),
          e.finalValue.toString(),
          e.status,
          e.txHash || '',
          e.contract.referenceType || '',
          e.contract.referenceId || '',
        ]);

        const csv = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
        ].join('\n');

        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', `attachment; filename=bazari-pay-${startDate}-${endDate}.csv`);
        return reply.send(csv);
      }

      // Default: return JSON
      return reply.send({
        period: { startDate, endDate },
        totalExecutions: executions.length,
        executions: executions.map(e => ({
          executedAt: e.executedAt?.toISOString() || null,
          periodRef: e.periodRef,
          receiver: {
            handle: e.contract.receiver.profile?.handle || null,
            name: e.contract.receiver.profile?.displayName || null,
            wallet: e.contract.receiverWallet,
          },
          baseValue: e.baseValue.toString(),
          adjustments: e.adjustmentsTotal.toString(),
          finalValue: e.finalValue.toString(),
          status: e.status,
          txHash: e.txHash,
          reference: {
            type: e.contract.referenceType,
            id: e.contract.referenceId,
          },
        })),
      });
    }
  );

  /**
   * GET /api/pay/reports/receivers
   * Get payments by receiver
   */
  fastify.get<{
    Querystring: { companyId: string; limit?: string };
  }>(
    '/reports/receivers',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { companyId, limit = '50' } = request.query;

      if (!companyId) {
        return reply.status(400).send({ error: 'companyId é obrigatório' });
      }

      // Verify company ownership
      const company = await prisma.sellerProfile.findFirst({
        where: { id: companyId, userId: authUser.sub },
      });

      if (!company) {
        return reply.status(403).send({ error: 'Acesso negado à empresa' });
      }

      // Get contracts grouped by receiver
      const contracts = await prisma.payContract.findMany({
        where: { payerCompanyId: companyId },
        include: {
          receiver: {
            select: {
              id: true,
              profile: { select: { handle: true, displayName: true, avatarUrl: true } },
            },
          },
          executions: {
            where: { status: 'SUCCESS' },
            select: { finalValue: true },
          },
        },
        take: parseInt(limit),
      });

      // Aggregate by receiver
      const receiverMap: Record<string, {
        id: string;
        handle: string | null;
        name: string | null;
        avatarUrl: string | null;
        contractCount: number;
        activeContracts: number;
        totalPaid: number;
      }> = {};

      for (const contract of contracts) {
        const receiverId = contract.receiverId;

        if (!receiverMap[receiverId]) {
          receiverMap[receiverId] = {
            id: receiverId,
            handle: contract.receiver.profile?.handle || null,
            name: contract.receiver.profile?.displayName || null,
            avatarUrl: contract.receiver.profile?.avatarUrl || null,
            contractCount: 0,
            activeContracts: 0,
            totalPaid: 0,
          };
        }

        receiverMap[receiverId].contractCount++;
        if (contract.status === 'ACTIVE') {
          receiverMap[receiverId].activeContracts++;
        }

        for (const execution of contract.executions) {
          receiverMap[receiverId].totalPaid += parseFloat(execution.finalValue.toString());
        }
      }

      const receivers = Object.values(receiverMap)
        .sort((a, b) => b.totalPaid - a.totalPaid)
        .map(r => ({
          ...r,
          totalPaid: r.totalPaid.toString(),
        }));

      return reply.send({ receivers });
    }
  );
}
