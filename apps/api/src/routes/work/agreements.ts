// path: apps/api/src/routes/work/agreements.ts
// Bazari Work - Work Agreements Routes (PROMPT-05)

import type { FastifyInstance } from 'fastify';
import type { PrismaClient, AgreementStatus } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../../lib/auth/middleware.js';
import { getWorkOnChainService } from '../../services/work-onchain.service.js';

// Função auxiliar para atualizar status on-chain (não bloqueia)
async function updateOnChainStatusIfAvailable(agreement: { onChainId: string | null }, newStatus: string) {
  if (!agreement.onChainId) return;

  const workOnChain = getWorkOnChainService();
  if (!workOnChain || !workOnChain.isPalletAvailable()) return;

  try {
    await workOnChain.updateStatus({
      onChainId: agreement.onChainId,
      newStatus: newStatus as 'ACTIVE' | 'PAUSED' | 'CLOSED',
      signerWallet: '', // Usará o signer padrão do serviço
    });
    console.log(`[WorkOnChain] Status updated on-chain:`, { onChainId: agreement.onChainId, newStatus });
  } catch (error) {
    console.error('[WorkOnChain] Failed to update status on-chain:', error);
  }
}

// Schemas de validação
const closeAgreementSchema = z.object({
  reason: z.string().min(3).max(500),
});

const pauseResumeSchema = z.object({
  reason: z.string().max(500).optional(),
});

// Função auxiliar para formatar acordo
function formatAgreementResponse(agreement: any) {
  return {
    id: agreement.id,
    title: agreement.title,
    description: agreement.description,
    terms: agreement.terms,
    agreedValue: agreement.agreedValue?.toString() || null,
    valuePeriod: agreement.valuePeriod,
    valueCurrency: agreement.valueCurrency,
    startDate: agreement.startDate?.toISOString() || null,
    endDate: agreement.endDate?.toISOString() || null,
    status: agreement.status,
    paymentType: agreement.paymentType,
    onChainId: agreement.onChainId,
    onChainTxHash: agreement.onChainTxHash,
    payContractId: agreement.payContractId,
    pausedAt: agreement.pausedAt?.toISOString() || null,
    closedAt: agreement.closedAt?.toISOString() || null,
    closedReason: agreement.closedReason,
    createdAt: agreement.createdAt.toISOString(),
    updatedAt: agreement.updatedAt.toISOString(),
    company: agreement.sellerProfile ? {
      id: agreement.sellerProfile.id,
      name: agreement.sellerProfile.shopName,
      logoUrl: agreement.sellerProfile.avatarUrl,
      slug: agreement.sellerProfile.shopSlug,
    } : null,
    worker: agreement.worker ? {
      id: agreement.worker.id,
      handle: agreement.worker.handle,
      displayName: agreement.worker.displayName,
      avatarUrl: agreement.worker.avatarUrl,
    } : null,
    proposal: agreement.proposal ? {
      id: agreement.proposal.id,
      title: agreement.proposal.title,
    } : null,
  };
}

// Função auxiliar para formatar histórico
function formatHistoryResponse(history: any) {
  return {
    id: history.id,
    fromStatus: history.fromStatus,
    toStatus: history.toStatus,
    reason: history.reason,
    changedBy: history.changedBy ? {
      id: history.changedBy.id,
      handle: history.changedBy.handle,
      displayName: history.changedBy.displayName,
      avatarUrl: history.changedBy.avatarUrl,
    } : null,
    createdAt: history.createdAt.toISOString(),
  };
}

export async function workAgreementsRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  // ==================== LISTAR ACORDOS ====================
  // GET /api/work/agreements
  app.get('/work/agreements', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const query = request.query as {
      status?: string;
      role?: string; // 'worker' | 'company' | 'all'
      cursor?: string;
      limit?: string;
    };

    const limit = Math.min(parseInt(query.limit || '20', 10), 50);
    const statuses = query.status?.split(',').filter(Boolean) as AgreementStatus[] | undefined;

    // Buscar profile do usuário
    const profile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
      select: { id: true },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado.' });
    }

    // Buscar seller profiles do usuário
    const sellerProfiles = await prisma.sellerProfile.findMany({
      where: { userId: authUser.sub },
      select: { id: true },
    });
    const sellerProfileIds = sellerProfiles.map(sp => sp.id);

    // Montar filtro baseado no role
    const roleFilter = query.role || 'all';
    let whereClause: any = {};

    if (roleFilter === 'worker') {
      whereClause.workerId = profile.id;
    } else if (roleFilter === 'company') {
      whereClause.sellerProfileId = { in: sellerProfileIds };
    } else {
      // 'all' - acordos onde é worker OU company
      whereClause.OR = [
        { workerId: profile.id },
        { sellerProfileId: { in: sellerProfileIds } },
      ];
    }

    if (statuses && statuses.length > 0) {
      whereClause.status = { in: statuses };
    }

    if (query.cursor) {
      whereClause.createdAt = { lt: new Date(query.cursor) };
    }

    const agreements = await prisma.workAgreement.findMany({
      where: whereClause,
      include: {
        sellerProfile: {
          select: { id: true, shopName: true, avatarUrl: true, shopSlug: true },
        },
        worker: {
          select: { id: true, handle: true, displayName: true, avatarUrl: true },
        },
        proposal: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = agreements.length > limit;
    const items = hasMore ? agreements.slice(0, limit) : agreements;
    const nextCursor = hasMore && items.length > 0
      ? items[items.length - 1].createdAt.toISOString()
      : null;

    // Contar total
    const total = await prisma.workAgreement.count({ where: whereClause });

    return reply.send({
      items: items.map(formatAgreementResponse),
      total,
      nextCursor,
    });
  });

  // ==================== DETALHES DO ACORDO ====================
  // GET /api/work/agreements/:id
  app.get('/work/agreements/:id', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const { id } = request.params as { id: string };

    const profile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
      select: { id: true },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado.' });
    }

    const sellerProfiles = await prisma.sellerProfile.findMany({
      where: { userId: authUser.sub },
      select: { id: true },
    });
    const sellerProfileIds = sellerProfiles.map(sp => sp.id);

    const agreement = await prisma.workAgreement.findUnique({
      where: { id },
      include: {
        sellerProfile: {
          select: { id: true, shopName: true, avatarUrl: true, shopSlug: true },
        },
        worker: {
          select: { id: true, handle: true, displayName: true, avatarUrl: true },
        },
        proposal: {
          select: { id: true, title: true, chatThreadId: true },
        },
      },
    });

    if (!agreement) {
      return reply.status(404).send({ error: 'Acordo não encontrado.' });
    }

    // Verificar permissão
    const isWorker = agreement.workerId === profile.id;
    const isCompany = sellerProfileIds.includes(agreement.sellerProfileId);

    if (!isWorker && !isCompany) {
      return reply.status(403).send({ error: 'Você não tem permissão para ver este acordo.' });
    }

    return reply.send({
      agreement: formatAgreementResponse(agreement),
      role: isWorker ? 'worker' : 'company',
      chatThreadId: agreement.proposal?.chatThreadId || null,
    });
  });

  // ==================== PAUSAR ACORDO ====================
  // POST /api/work/agreements/:id/pause
  app.post('/work/agreements/:id/pause', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const { id } = request.params as { id: string };

    let body: z.infer<typeof pauseResumeSchema> = {};
    try {
      body = pauseResumeSchema.parse(request.body || {});
    } catch (e) {
      return reply.status(400).send({ error: (e as Error).message });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
      select: { id: true, handle: true, displayName: true },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado.' });
    }

    const sellerProfiles = await prisma.sellerProfile.findMany({
      where: { userId: authUser.sub },
      select: { id: true },
    });
    const sellerProfileIds = sellerProfiles.map(sp => sp.id);

    const agreement = await prisma.workAgreement.findUnique({
      where: { id },
      include: {
        sellerProfile: true,
        worker: true,
        proposal: { select: { chatThreadId: true } },
      },
    });

    if (!agreement) {
      return reply.status(404).send({ error: 'Acordo não encontrado.' });
    }

    // Verificar permissão
    const isWorker = agreement.workerId === profile.id;
    const isCompany = sellerProfileIds.includes(agreement.sellerProfileId);

    if (!isWorker && !isCompany) {
      return reply.status(403).send({ error: 'Você não tem permissão para pausar este acordo.' });
    }

    // Verificar status
    if (agreement.status !== 'ACTIVE') {
      return reply.status(400).send({ error: 'Apenas acordos ativos podem ser pausados.' });
    }

    // Atualizar acordo
    const updated = await prisma.workAgreement.update({
      where: { id },
      data: {
        status: 'PAUSED',
        pausedAt: new Date(),
      },
      include: {
        sellerProfile: {
          select: { id: true, shopName: true, avatarUrl: true, shopSlug: true },
        },
        worker: {
          select: { id: true, handle: true, displayName: true, avatarUrl: true },
        },
      },
    });

    // Registrar histórico
    await prisma.agreementStatusHistory.create({
      data: {
        agreementId: id,
        fromStatus: 'ACTIVE',
        toStatus: 'PAUSED',
        reason: body.reason,
        changedById: profile.id,
      },
    });

    // PROMPT-06: Atualizar on-chain (async)
    updateOnChainStatusIfAvailable(agreement, 'PAUSED');

    // Enviar mensagem no chat se existir
    if (agreement.proposal?.chatThreadId) {
      await prisma.chatMessage.create({
        data: {
          threadId: agreement.proposal.chatThreadId,
          fromProfile: profile.id,
          type: 'system',
          ciphertext: `⏸️ ${profile.displayName || profile.handle} pausou o acordo.${body.reason ? ` Motivo: ${body.reason}` : ''}`,
          createdAt: BigInt(Date.now()),
          meta: { type: 'agreement_paused' },
        },
      });
    }

    // TODO: Enviar notificação para a outra parte

    return reply.send({
      agreement: formatAgreementResponse(updated),
      message: 'Acordo pausado com sucesso.',
    });
  });

  // ==================== RETOMAR ACORDO ====================
  // POST /api/work/agreements/:id/resume
  app.post('/work/agreements/:id/resume', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const { id } = request.params as { id: string };

    let body: z.infer<typeof pauseResumeSchema> = {};
    try {
      body = pauseResumeSchema.parse(request.body || {});
    } catch (e) {
      return reply.status(400).send({ error: (e as Error).message });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
      select: { id: true, handle: true, displayName: true },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado.' });
    }

    const sellerProfiles = await prisma.sellerProfile.findMany({
      where: { userId: authUser.sub },
      select: { id: true },
    });
    const sellerProfileIds = sellerProfiles.map(sp => sp.id);

    const agreement = await prisma.workAgreement.findUnique({
      where: { id },
      include: {
        sellerProfile: true,
        worker: true,
        proposal: { select: { chatThreadId: true } },
      },
    });

    if (!agreement) {
      return reply.status(404).send({ error: 'Acordo não encontrado.' });
    }

    // Verificar permissão
    const isWorker = agreement.workerId === profile.id;
    const isCompany = sellerProfileIds.includes(agreement.sellerProfileId);

    if (!isWorker && !isCompany) {
      return reply.status(403).send({ error: 'Você não tem permissão para retomar este acordo.' });
    }

    // Verificar status
    if (agreement.status !== 'PAUSED') {
      return reply.status(400).send({ error: 'Apenas acordos pausados podem ser retomados.' });
    }

    // Atualizar acordo
    const updated = await prisma.workAgreement.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        pausedAt: null,
      },
      include: {
        sellerProfile: {
          select: { id: true, shopName: true, avatarUrl: true, shopSlug: true },
        },
        worker: {
          select: { id: true, handle: true, displayName: true, avatarUrl: true },
        },
      },
    });

    // Registrar histórico
    await prisma.agreementStatusHistory.create({
      data: {
        agreementId: id,
        fromStatus: 'PAUSED',
        toStatus: 'ACTIVE',
        reason: body.reason,
        changedById: profile.id,
      },
    });

    // PROMPT-06: Atualizar on-chain (async)
    updateOnChainStatusIfAvailable(agreement, 'ACTIVE');

    // Enviar mensagem no chat se existir
    if (agreement.proposal?.chatThreadId) {
      await prisma.chatMessage.create({
        data: {
          threadId: agreement.proposal.chatThreadId,
          fromProfile: profile.id,
          type: 'system',
          ciphertext: `▶️ ${profile.displayName || profile.handle} retomou o acordo.`,
          createdAt: BigInt(Date.now()),
          meta: { type: 'agreement_resumed' },
        },
      });
    }

    // TODO: Enviar notificação para a outra parte

    return reply.send({
      agreement: formatAgreementResponse(updated),
      message: 'Acordo retomado com sucesso.',
    });
  });

  // ==================== ENCERRAR ACORDO ====================
  // POST /api/work/agreements/:id/close
  app.post('/work/agreements/:id/close', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const { id } = request.params as { id: string };

    let body: z.infer<typeof closeAgreementSchema>;
    try {
      body = closeAgreementSchema.parse(request.body);
    } catch (e) {
      return reply.status(400).send({ error: (e as Error).message });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
      select: { id: true, handle: true, displayName: true },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado.' });
    }

    const sellerProfiles = await prisma.sellerProfile.findMany({
      where: { userId: authUser.sub },
      select: { id: true },
    });
    const sellerProfileIds = sellerProfiles.map(sp => sp.id);

    const agreement = await prisma.workAgreement.findUnique({
      where: { id },
      include: {
        sellerProfile: true,
        worker: true,
        proposal: { select: { chatThreadId: true } },
      },
    });

    if (!agreement) {
      return reply.status(404).send({ error: 'Acordo não encontrado.' });
    }

    // Verificar permissão
    const isWorker = agreement.workerId === profile.id;
    const isCompany = sellerProfileIds.includes(agreement.sellerProfileId);

    if (!isWorker && !isCompany) {
      return reply.status(403).send({ error: 'Você não tem permissão para encerrar este acordo.' });
    }

    // Verificar status
    if (agreement.status === 'CLOSED') {
      return reply.status(400).send({ error: 'Este acordo já está encerrado.' });
    }

    const previousStatus = agreement.status;

    // Atualizar acordo
    const updated = await prisma.workAgreement.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedReason: body.reason,
        endDate: new Date(),
      },
      include: {
        sellerProfile: {
          select: { id: true, shopName: true, avatarUrl: true, shopSlug: true },
        },
        worker: {
          select: { id: true, handle: true, displayName: true, avatarUrl: true },
        },
      },
    });

    // Registrar histórico
    await prisma.agreementStatusHistory.create({
      data: {
        agreementId: id,
        fromStatus: previousStatus,
        toStatus: 'CLOSED',
        reason: body.reason,
        changedById: profile.id,
      },
    });

    // PROMPT-06: Atualizar on-chain (async)
    updateOnChainStatusIfAvailable(agreement, 'CLOSED');

    // Enviar mensagem no chat se existir
    if (agreement.proposal?.chatThreadId) {
      await prisma.chatMessage.create({
        data: {
          threadId: agreement.proposal.chatThreadId,
          fromProfile: profile.id,
          type: 'system',
          ciphertext: `🏁 ${profile.displayName || profile.handle} encerrou o acordo. Motivo: ${body.reason}`,
          createdAt: BigInt(Date.now()),
          meta: { type: 'agreement_closed' },
        },
      });
    }

    // TODO: Enviar notificação para a outra parte
    // TODO: Criar evento no Feed (sem valores)
    // TODO: Habilitar avaliação (PROMPT-07)

    return reply.send({
      agreement: formatAgreementResponse(updated),
      message: 'Acordo encerrado com sucesso.',
      canEvaluate: true, // Preparação para PROMPT-07
    });
  });

  // ==================== HISTÓRICO DE MUDANÇAS ====================
  // GET /api/work/agreements/:id/history
  app.get('/work/agreements/:id/history', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const { id } = request.params as { id: string };

    const profile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
      select: { id: true },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado.' });
    }

    const sellerProfiles = await prisma.sellerProfile.findMany({
      where: { userId: authUser.sub },
      select: { id: true },
    });
    const sellerProfileIds = sellerProfiles.map(sp => sp.id);

    const agreement = await prisma.workAgreement.findUnique({
      where: { id },
      select: { workerId: true, sellerProfileId: true },
    });

    if (!agreement) {
      return reply.status(404).send({ error: 'Acordo não encontrado.' });
    }

    // Verificar permissão
    const isWorker = agreement.workerId === profile.id;
    const isCompany = sellerProfileIds.includes(agreement.sellerProfileId);

    if (!isWorker && !isCompany) {
      return reply.status(403).send({ error: 'Você não tem permissão para ver o histórico.' });
    }

    const history = await prisma.agreementStatusHistory.findMany({
      where: { agreementId: id },
      include: {
        changedBy: {
          select: { id: true, handle: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({
      items: history.map(formatHistoryResponse),
    });
  });

  // ==================== VERIFICAÇÃO ON-CHAIN ====================
  // GET /api/work/agreements/:id/onchain
  app.get('/work/agreements/:id/onchain', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const { id } = request.params as { id: string };

    const agreement = await prisma.workAgreement.findUnique({
      where: { id },
      select: { id: true, onChainId: true, onChainTxHash: true },
    });

    if (!agreement) {
      return reply.status(404).send({ error: 'Acordo não encontrado.' });
    }

    // Se não tem registro on-chain
    if (!agreement.onChainId) {
      return reply.send({
        registered: false,
        onChainId: null,
        txHash: null,
        data: null,
      });
    }

    // Buscar dados on-chain
    const workOnChain = getWorkOnChainService();
    let onChainData = null;

    if (workOnChain && workOnChain.isPalletAvailable()) {
      try {
        onChainData = await workOnChain.getAgreement(agreement.onChainId);
      } catch (error) {
        console.error('[WorkOnChain] Error fetching on-chain data:', error);
      }
    }

    return reply.send({
      registered: true,
      onChainId: agreement.onChainId,
      txHash: agreement.onChainTxHash,
      data: onChainData,
    });
  });
}

export default workAgreementsRoutes;
