// path: apps/api/src/routes/pay/dashboard.ts
// Bazari Pay - Dashboard endpoint (PROMPT-00 + PROMPT-01)

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authOnRequest } from '../../lib/auth/middleware.js';
import type { AccessTokenPayload } from '../../lib/auth/jwt.js';

export default async function payDashboardRoutes(
  fastify: FastifyInstance,
  opts: { prisma: PrismaClient }
) {
  const { prisma } = opts;

  function getAuthUser(request: FastifyRequest): AccessTokenPayload {
    const authReq = request as FastifyRequest & { authUser: AccessTokenPayload };
    return authReq.authUser;
  }

  // GET /api/pay/dashboard
  // Retorna estatísticas e próximos pagamentos para a Home do Bazari Pay
  fastify.get('/dashboard', { onRequest: [authOnRequest] }, async (request, reply) => {
    const authUser = getAuthUser(request);

    // Verificar se o perfil existe
    const profile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado' });
    }

    // Buscar seller profiles do usuário
    const sellerProfiles = await prisma.sellerProfile.findMany({
      where: { userId: authUser.sub },
      select: { id: true },
    });
    const sellerProfileIds = sellerProfiles.map(sp => sp.id);

    // Buscar estatísticas em paralelo
    const [
      contractsAsPayer,
      contractsAsReceiver,
      activeContractsAsPayer,
      activeContractsAsReceiver,
      upcomingPayments,
      monthlyContractsBRL,
      monthlyContractsBZR,
    ] = await Promise.all([
      // Total contratos como pagador
      prisma.payContract.count({
        where: {
          OR: [
            { payerId: authUser.sub },
            ...(sellerProfileIds.length > 0
              ? [{ payerCompanyId: { in: sellerProfileIds } }]
              : []),
          ],
        },
      }),

      // Total contratos como recebedor
      prisma.payContract.count({
        where: { receiverId: authUser.sub },
      }),

      // Contratos ativos como pagador
      prisma.payContract.count({
        where: {
          OR: [
            { payerId: authUser.sub },
            ...(sellerProfileIds.length > 0
              ? [{ payerCompanyId: { in: sellerProfileIds } }]
              : []),
          ],
          status: 'ACTIVE',
        },
      }),

      // Contratos ativos como recebedor
      prisma.payContract.count({
        where: {
          receiverId: authUser.sub,
          status: 'ACTIVE',
        },
      }),

      // Próximos pagamentos (7 dias)
      prisma.payContract.findMany({
        where: {
          OR: [
            { payerId: authUser.sub },
            ...(sellerProfileIds.length > 0
              ? [{ payerCompanyId: { in: sellerProfileIds } }]
              : []),
            { receiverId: authUser.sub },
          ],
          status: 'ACTIVE',
          nextPaymentDate: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          payer: {
            include: { profile: true },
          },
          receiver: {
            include: { profile: true },
          },
          payerCompany: true,
        },
        orderBy: { nextPaymentDate: 'asc' },
        take: 5,
      }),

      // Valor mensal em BRL
      prisma.payContract.findMany({
        where: {
          OR: [
            { payerId: authUser.sub },
            ...(sellerProfileIds.length > 0
              ? [{ payerCompanyId: { in: sellerProfileIds } }]
              : []),
          ],
          status: 'ACTIVE',
          period: 'MONTHLY',
          currency: 'BRL',
        },
        select: { baseValue: true },
      }),

      // Valor mensal em BZR
      prisma.payContract.findMany({
        where: {
          OR: [
            { payerId: authUser.sub },
            ...(sellerProfileIds.length > 0
              ? [{ payerCompanyId: { in: sellerProfileIds } }]
              : []),
          ],
          status: 'ACTIVE',
          period: 'MONTHLY',
          currency: 'BZR',
        },
        select: { baseValue: true },
      }),
    ]);

    // Calcular totais mensais
    const monthlyTotalBRL = monthlyContractsBRL.reduce(
      (sum, c) => sum + Number(c.baseValue),
      0
    );
    const monthlyTotalBZR = monthlyContractsBZR.reduce(
      (sum, c) => sum + Number(c.baseValue),
      0
    );

    // Mapear próximos pagamentos
    const mappedUpcoming = upcomingPayments.map(p => {
      const isPayer =
        p.payerId === authUser.sub ||
        sellerProfileIds.includes(p.payerCompanyId || '');
      const otherParty = isPayer ? p.receiver : p.payer;
      const otherProfile = otherParty.profile;

      return {
        id: p.id,
        role: isPayer ? 'payer' : 'receiver',
        otherParty: {
          name: otherProfile?.displayName || 'Usuário',
          handle: otherProfile?.handle || null,
          avatarUrl: otherProfile?.avatarUrl || null,
        },
        baseValue: p.baseValue.toString(),
        currency: p.currency,
        period: p.period,
        nextPaymentDate: p.nextPaymentDate.toISOString(),
        description: p.description,
      };
    });

    return reply.send({
      stats: {
        contractsAsPayer,
        contractsAsReceiver,
        activeContractsAsPayer,
        activeContractsAsReceiver,
        pendingExecutions: 0, // Será implementado no PROMPT-02
        monthlyTotalBRL,
        monthlyTotalBZR,
      },
      upcomingPayments: mappedUpcoming,
    });
  });
}
