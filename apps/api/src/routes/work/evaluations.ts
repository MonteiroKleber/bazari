// path: apps/api/src/routes/work/evaluations.ts
// PROMPT-07: Endpoints de avaliações de trabalho

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authOnRequest } from '../../lib/auth/middleware.js';
import type { AccessTokenPayload } from '../../lib/auth/jwt.js';

// Período máximo para avaliar (em dias)
const EVALUATION_PERIOD_DAYS = 30;

interface CreateEvaluationBody {
  overallRating: number;
  communicationRating?: number;
  punctualityRating?: number;
  qualityRating?: number;
  comment?: string;
}

export default async function evaluationsRoutes(
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
  // POST /api/work/agreements/:id/evaluate
  // Enviar avaliação após encerramento de acordo
  // ============================================
  fastify.post<{
    Params: { id: string };
    Body: CreateEvaluationBody;
  }>(
    '/agreements/:id/evaluate',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const { id } = request.params;
      const { overallRating, communicationRating, punctualityRating, qualityRating, comment } =
        request.body;
      const authUser = getAuthUser(request);

      // Validar nota geral
      if (!overallRating || overallRating < 1 || overallRating > 5) {
        return reply.status(400).send({ error: 'overallRating deve ser entre 1 e 5' });
      }

      // Validar notas opcionais
      const optionalRatings = [communicationRating, punctualityRating, qualityRating];
      for (const rating of optionalRatings) {
        if (rating !== undefined && (rating < 1 || rating > 5)) {
          return reply.status(400).send({ error: 'Notas devem ser entre 1 e 5' });
        }
      }

      // Buscar perfil do usuário
      const profile = await prisma.profile.findUnique({
        where: { userId: authUser.sub },
      });

      if (!profile) {
        return reply.status(404).send({ error: 'Perfil não encontrado' });
      }

      // Buscar acordo com worker e company
      const agreement = await prisma.workAgreement.findUnique({
        where: { id },
        include: {
          sellerProfile: true,
          worker: true,
        },
      });

      if (!agreement) {
        return reply.status(404).send({ error: 'Acordo não encontrado' });
      }

      // Verificar se usuário é parte do acordo
      const isWorker = agreement.workerId === profile.id;
      const isCompany = agreement.sellerProfile?.userId === authUser.sub;

      if (!isWorker && !isCompany) {
        return reply.status(403).send({ error: 'Você não é parte deste acordo' });
      }

      // Verificar se acordo está encerrado
      if (agreement.status !== 'CLOSED') {
        return reply.status(400).send({ error: 'O acordo precisa estar encerrado para avaliar' });
      }

      // Verificar período de avaliação
      if (agreement.closedAt) {
        const daysSinceClosed = Math.floor(
          (Date.now() - agreement.closedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceClosed > EVALUATION_PERIOD_DAYS) {
          return reply.status(400).send({
            error: `O período de avaliação expirou (${EVALUATION_PERIOD_DAYS} dias)`,
          });
        }
      }

      // Determinar quem está sendo avaliado
      let targetId: string;
      if (isWorker) {
        // Worker avalia a empresa - target é o userId do sellerProfile owner
        // Precisamos buscar o profile do dono da empresa
        const companyOwnerProfile = await prisma.profile.findUnique({
          where: { userId: agreement.sellerProfile!.userId },
        });
        if (!companyOwnerProfile) {
          return reply.status(500).send({ error: 'Perfil da empresa não encontrado' });
        }
        targetId = companyOwnerProfile.id;
      } else {
        // Empresa avalia o worker
        targetId = agreement.workerId;
      }

      // Verificar se já avaliou
      const existingEvaluation = await prisma.workEvaluation.findUnique({
        where: {
          agreementId_authorId: {
            agreementId: id,
            authorId: profile.id,
          },
        },
      });

      if (existingEvaluation) {
        return reply.status(400).send({ error: 'Você já avaliou este acordo' });
      }

      // Criar avaliação
      const evaluation = await prisma.workEvaluation.create({
        data: {
          agreementId: id,
          authorId: profile.id,
          targetId,
          overallRating,
          communicationRating,
          punctualityRating,
          qualityRating,
          comment: comment?.trim() || null,
          commentStatus: comment ? 'PENDING' : 'APPROVED',
          isPublic: false,
        },
        include: {
          author: {
            select: { id: true, handle: true, displayName: true, avatarUrl: true },
          },
        },
      });

      // Verificar se a outra parte já avaliou
      const otherEvaluation = await prisma.workEvaluation.findFirst({
        where: {
          agreementId: id,
          authorId: targetId,
        },
      });

      let nowPublic = false;

      if (otherEvaluation) {
        // Ambos avaliaram - tornar ambas avaliações públicas
        await prisma.workEvaluation.updateMany({
          where: { agreementId: id },
          data: { isPublic: true },
        });
        nowPublic = true;

        // Atualizar estatísticas de reputação de ambos
        await updateWorkReputation(prisma, profile.id);
        await updateWorkReputation(prisma, targetId);
      }

      return reply.send({
        evaluation: {
          id: evaluation.id,
          overallRating: evaluation.overallRating,
          communicationRating: evaluation.communicationRating,
          punctualityRating: evaluation.punctualityRating,
          qualityRating: evaluation.qualityRating,
          comment: evaluation.comment,
          commentStatus: evaluation.commentStatus,
          isPublic: nowPublic,
          createdAt: evaluation.createdAt,
        },
        otherPartyEvaluated: !!otherEvaluation,
        nowPublic,
      });
    }
  );

  // ============================================
  // GET /api/work/agreements/:id/evaluations
  // Ver avaliações de um acordo
  // ============================================
  fastify.get<{
    Params: { id: string };
  }>(
    '/agreements/:id/evaluations',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const { id } = request.params;
      const authUser = getAuthUser(request);

      const profile = await prisma.profile.findUnique({
        where: { userId: authUser.sub },
      });

      if (!profile) {
        return reply.status(404).send({ error: 'Perfil não encontrado' });
      }

      // Buscar acordo
      const agreement = await prisma.workAgreement.findUnique({
        where: { id },
        include: { sellerProfile: true },
      });

      if (!agreement) {
        return reply.status(404).send({ error: 'Acordo não encontrado' });
      }

      // Verificar acesso
      const isWorker = agreement.workerId === profile.id;
      const isCompany = agreement.sellerProfile?.userId === authUser.sub;

      if (!isWorker && !isCompany) {
        return reply.status(403).send({ error: 'Acesso negado' });
      }

      // Buscar avaliações
      const evaluations = await prisma.workEvaluation.findMany({
        where: { agreementId: id },
        include: {
          author: {
            select: { id: true, handle: true, displayName: true, avatarUrl: true },
          },
          target: {
            select: { id: true, handle: true, displayName: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      // Determinar o que mostrar baseado em publicidade
      const myEvaluation = evaluations.find((e) => e.authorId === profile.id);
      const otherEvaluation = evaluations.find((e) => e.authorId !== profile.id);

      // Se não estão públicas, a outra parte não pode ver detalhes
      const canSeeOther = otherEvaluation?.isPublic || false;

      return reply.send({
        myEvaluation: myEvaluation
          ? {
              id: myEvaluation.id,
              overallRating: myEvaluation.overallRating,
              communicationRating: myEvaluation.communicationRating,
              punctualityRating: myEvaluation.punctualityRating,
              qualityRating: myEvaluation.qualityRating,
              comment: myEvaluation.comment,
              isPublic: myEvaluation.isPublic,
              createdAt: myEvaluation.createdAt,
            }
          : null,
        otherEvaluation:
          canSeeOther && otherEvaluation
            ? {
                id: otherEvaluation.id,
                author: otherEvaluation.author,
                overallRating: otherEvaluation.overallRating,
                communicationRating: otherEvaluation.communicationRating,
                punctualityRating: otherEvaluation.punctualityRating,
                qualityRating: otherEvaluation.qualityRating,
                comment:
                  otherEvaluation.commentStatus === 'APPROVED' ? otherEvaluation.comment : null,
                createdAt: otherEvaluation.createdAt,
              }
            : null,
        canEvaluate: !myEvaluation && agreement.status === 'CLOSED',
        isPublic: evaluations.length === 2 && evaluations.every((e) => e.isPublic),
      });
    }
  );

  // ============================================
  // GET /api/work/evaluations/received
  // Minhas avaliações recebidas
  // ============================================
  fastify.get(
    '/evaluations/received',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);

      const profile = await prisma.profile.findUnique({
        where: { userId: authUser.sub },
      });

      if (!profile) {
        return reply.status(404).send({ error: 'Perfil não encontrado' });
      }

      const evaluations = await prisma.workEvaluation.findMany({
        where: {
          targetId: profile.id,
          isPublic: true,
        },
        include: {
          author: {
            select: { id: true, handle: true, displayName: true, avatarUrl: true },
          },
          agreement: {
            select: { id: true, title: true, closedAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({
        evaluations: evaluations.map((e) => ({
          id: e.id,
          author: e.author,
          agreement: e.agreement,
          overallRating: e.overallRating,
          communicationRating: e.communicationRating,
          punctualityRating: e.punctualityRating,
          qualityRating: e.qualityRating,
          comment: e.commentStatus === 'APPROVED' ? e.comment : null,
          createdAt: e.createdAt,
        })),
      });
    }
  );

  // ============================================
  // GET /api/work/evaluations/given
  // Avaliações que eu dei
  // ============================================
  fastify.get(
    '/evaluations/given',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);

      const profile = await prisma.profile.findUnique({
        where: { userId: authUser.sub },
      });

      if (!profile) {
        return reply.status(404).send({ error: 'Perfil não encontrado' });
      }

      const evaluations = await prisma.workEvaluation.findMany({
        where: {
          authorId: profile.id,
        },
        include: {
          target: {
            select: { id: true, handle: true, displayName: true, avatarUrl: true },
          },
          agreement: {
            select: { id: true, title: true, closedAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({
        evaluations: evaluations.map((e) => ({
          id: e.id,
          target: e.target,
          agreement: e.agreement,
          overallRating: e.overallRating,
          communicationRating: e.communicationRating,
          punctualityRating: e.punctualityRating,
          qualityRating: e.qualityRating,
          comment: e.comment,
          isPublic: e.isPublic,
          createdAt: e.createdAt,
        })),
      });
    }
  );

  // ============================================
  // GET /api/work/talents/:handle/stats
  // Estatísticas públicas do profissional
  // ============================================
  fastify.get<{
    Params: { handle: string };
  }>('/talents/:handle/stats', async (request, reply) => {
    const { handle } = request.params;

    const profile = await prisma.profile.findUnique({
      where: { handle },
      include: {
        professionalProfile: true,
      },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Profissional não encontrado' });
    }

    // Buscar avaliações públicas recebidas
    const evaluations = await prisma.workEvaluation.findMany({
      where: {
        targetId: profile.id,
        isPublic: true,
      },
      select: {
        overallRating: true,
        communicationRating: true,
        punctualityRating: true,
        qualityRating: true,
      },
    });

    // Calcular médias
    const count = evaluations.length;

    if (count === 0) {
      return reply.send({
        handle,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        totalEvaluations: 0,
        completedContracts: profile.professionalProfile?.completedContracts || 0,
        averageRating: null,
        ratings: null,
      });
    }

    const avg = (arr: (number | null)[]) => {
      const valid = arr.filter((v): v is number => v !== null);
      return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
    };

    const overallSum = evaluations.reduce((sum, e) => sum + e.overallRating, 0);
    const overallAvg = overallSum / count;
    const commAvg = avg(evaluations.map((e) => e.communicationRating));
    const punctAvg = avg(evaluations.map((e) => e.punctualityRating));
    const qualAvg = avg(evaluations.map((e) => e.qualityRating));

    return reply.send({
      handle,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      totalEvaluations: count,
      completedContracts: profile.professionalProfile?.completedContracts || 0,
      averageRating: Math.round(overallAvg * 10) / 10,
      ratings: {
        overall: Math.round(overallAvg * 10) / 10,
        communication: commAvg ? Math.round(commAvg * 10) / 10 : null,
        punctuality: punctAvg ? Math.round(punctAvg * 10) / 10 : null,
        quality: qualAvg ? Math.round(qualAvg * 10) / 10 : null,
      },
    });
  });
}

/**
 * Atualiza estatísticas de reputação work de um usuário
 */
async function updateWorkReputation(prisma: PrismaClient, profileId: string) {
  // Buscar todas as avaliações públicas recebidas
  const evaluations = await prisma.workEvaluation.findMany({
    where: {
      targetId: profileId,
      isPublic: true,
    },
    select: { overallRating: true },
  });

  if (evaluations.length === 0) return;

  const avgRating =
    evaluations.reduce((sum, e) => sum + e.overallRating, 0) / evaluations.length;

  // Contar acordos completos
  const completedAgreements = await prisma.workAgreement.count({
    where: {
      workerId: profileId,
      status: 'CLOSED',
    },
  });

  // Atualizar ProfessionalProfile se existir
  await prisma.professionalProfile.updateMany({
    where: { profileId },
    data: {
      averageRating: Math.round(avgRating * 10) / 10,
      totalEvaluations: evaluations.length,
      completedContracts: completedAgreements,
    },
  });

  // Também atualizar reputação geral (se sistema existir)
  // Adicionar pontos por avaliação recebida
  const reputationBonus = Math.floor(avgRating * 2); // 2-10 pontos por média
  await prisma.profile.update({
    where: { id: profileId },
    data: {
      reputationScore: { increment: reputationBonus },
    },
  });
}
