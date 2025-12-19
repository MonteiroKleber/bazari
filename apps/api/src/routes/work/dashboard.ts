// path: apps/api/src/routes/work/dashboard.ts
// PROMPT-09: Dashboard endpoint para Home do Bazari Work

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authOnRequest } from '../../lib/auth/middleware.js';
import type { AccessTokenPayload } from '../../lib/auth/jwt.js';

export default async function workDashboardRoutes(
  fastify: FastifyInstance,
  opts: { prisma: PrismaClient }
) {
  const { prisma } = opts;

  // Helper para pegar authUser tipado
  function getAuthUser(request: FastifyRequest): AccessTokenPayload {
    const authReq = request as FastifyRequest & { authUser: AccessTokenPayload };
    return authReq.authUser;
  }

  // ============================================
  // GET /api/work/dashboard
  // Retorna resumo completo para a Home
  // ============================================
  fastify.get('/dashboard', { onRequest: [authOnRequest] }, async (request, reply) => {
    const authUser = getAuthUser(request);

    // Buscar perfil do usuário
    const profile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
      include: {
        professionalProfile: true,
      },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado' });
    }

    const profProfile = profile.professionalProfile;

    // Buscar contadores em paralelo
    const [
      pendingProposalsReceived,
      pendingProposalsSent,
      activeAgreements,
      pendingEvaluations,
      matchingJobs,
    ] = await Promise.all([
      // Propostas pendentes recebidas
      prisma.workProposal.count({
        where: {
          receiverId: profile.id,
          status: 'PENDING',
        },
      }),

      // Propostas pendentes enviadas
      prisma.workProposal.count({
        where: {
          senderId: profile.id,
          status: 'PENDING',
        },
      }),

      // Acordos ativos (como worker)
      prisma.workAgreement.count({
        where: {
          workerId: profile.id,
          status: 'ACTIVE',
        },
      }),

      // Acordos encerrados sem avaliação minha
      prisma.workAgreement.count({
        where: {
          workerId: profile.id,
          status: 'CLOSED',
          evaluations: {
            none: {
              authorId: profile.id,
            },
          },
        },
      }),

      // Vagas compatíveis (se tiver skills)
      profProfile?.skills?.length
        ? prisma.jobPosting.count({
            where: {
              status: 'OPEN',
              skills: {
                hasSome: profProfile.skills,
              },
            },
          })
        : 0,
    ]);

    const pendingProposals = pendingProposalsReceived + pendingProposalsSent;

    // Buscar propostas recentes
    const recentProposals = await prisma.workProposal.findMany({
      where: {
        OR: [{ receiverId: profile.id }, { senderId: profile.id }],
      },
      include: {
        sender: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        receiver: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    // Buscar acordos ativos
    const agreements = await prisma.workAgreement.findMany({
      where: {
        workerId: profile.id,
        status: 'ACTIVE',
      },
      include: {
        sellerProfile: {
          select: {
            id: true,
            shopName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
      take: 3,
    });

    // Buscar vagas recomendadas
    const jobs = profProfile?.skills?.length
      ? await prisma.jobPosting.findMany({
          where: {
            status: 'OPEN',
            skills: {
              hasSome: profProfile.skills,
            },
          },
          include: {
            sellerProfile: {
              select: { id: true, shopName: true, avatarUrl: true },
            },
          },
          orderBy: { publishedAt: 'desc' },
          take: 6,
        })
      : [];

    // Calcular match score para vagas
    const recommendedJobs = jobs.map((job) => {
      const jobSkills = job.skills || [];
      const userSkills = profProfile?.skills || [];
      const matchingSkills = jobSkills.filter((s) => userSkills.includes(s)).length;
      const matchScore = jobSkills.length > 0
        ? Math.round((matchingSkills / jobSkills.length) * 100)
        : 0;

      return {
        id: job.id,
        title: job.title,
        company: {
          name: job.sellerProfile?.shopName || 'Empresa',
          logoUrl: job.sellerProfile?.avatarUrl || null,
        },
        paymentValue: job.paymentValue?.toString() || null,
        paymentPeriod: job.paymentPeriod,
        paymentCurrency: job.paymentCurrency,
        matchScore,
      };
    });

    // Ordenar por match score
    recommendedJobs.sort((a, b) => b.matchScore - a.matchScore);

    return reply.send({
      profile: profProfile
        ? {
            hasProfile: true,
            status: profProfile.status,
            professionalArea: profProfile.professionalArea,
            skills: profProfile.skills || [],
            hourlyRate: profProfile.hourlyRate?.toString() || null,
            hourlyRateCurrency: profProfile.hourlyRateCurrency,
            averageRating: profProfile.averageRating,
            totalEvaluations: profProfile.totalEvaluations,
            agreementsCompleted: profProfile.completedContracts,
          }
        : {
            hasProfile: false,
            status: null,
            professionalArea: null,
            skills: [],
            hourlyRate: null,
            hourlyRateCurrency: null,
            averageRating: null,
            totalEvaluations: 0,
            agreementsCompleted: 0,
          },
      stats: {
        pendingProposals,
        activeAgreements,
        pendingEvaluations,
        matchingJobs,
      },
      recentProposals: recentProposals.map((p) => {
        const isReceiver = p.receiverId === profile.id;
        const otherParty = isReceiver ? p.sender : p.receiver;
        return {
          id: p.id,
          title: p.title,
          status: p.status,
          proposedValue: p.proposedValue?.toString() || null,
          valueCurrency: p.valueCurrency,
          otherParty: {
            name: otherParty?.displayName || 'Usuário',
            avatarUrl: otherParty?.avatarUrl || null,
          },
          createdAt: p.createdAt.toISOString(),
        };
      }),
      activeAgreements: agreements.map((a) => ({
        id: a.id,
        title: a.title,
        status: a.status,
        agreedValue: a.agreedValue?.toString() || null,
        valueCurrency: a.valueCurrency,
        otherParty: {
          name: a.sellerProfile?.shopName || 'Empresa',
          avatarUrl: a.sellerProfile?.avatarUrl || null,
        },
        startDate: a.startDate?.toISOString() || null,
      })),
      recommendedJobs,
    });
  });
}
