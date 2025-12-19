// path: apps/api/src/routes/work/proposals.ts
// Bazari Work - Work Proposals Routes (PROMPT-04)

import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../../lib/auth/middleware.js';
import { getWorkOnChainService } from '../../services/work-onchain.service.js';

// Schemas de validação
const createProposalSchema = z.object({
  receiverHandle: z.string().min(1),
  sellerProfileId: z.string(),
  jobPostingId: z.string().optional().nullable(),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(10000),
  proposedValue: z.number().min(0).max(10000000),
  valuePeriod: z.enum(['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'PROJECT']),
  valueCurrency: z.enum(['BRL', 'USD', 'EUR', 'BZR']).default('BRL'),
  startDate: z.string().datetime().optional().nullable(),
  duration: z.string().max(100).optional().nullable(),
  paymentType: z.enum(['EXTERNAL', 'BAZARI_PAY', 'UNDEFINED']).default('UNDEFINED'),
});

const updateProposalSchema = createProposalSchema.partial().omit({ receiverHandle: true, sellerProfileId: true });

const counterProposalSchema = z.object({
  proposedValue: z.number().min(0).max(10000000).optional(),
  valuePeriod: z.enum(['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'PROJECT']).optional(),
  startDate: z.string().datetime().optional().nullable(),
  duration: z.string().max(100).optional().nullable(),
  message: z.string().max(2000).optional(),
});

// Função auxiliar para formatar proposta
function formatProposalResponse(proposal: any) {
  return {
    id: proposal.id,
    title: proposal.title,
    description: proposal.description,
    proposedValue: proposal.proposedValue?.toString() || null,
    valuePeriod: proposal.valuePeriod,
    valueCurrency: proposal.valueCurrency,
    startDate: proposal.startDate?.toISOString() || null,
    duration: proposal.duration,
    paymentType: proposal.paymentType,
    status: proposal.status,
    chatThreadId: proposal.chatThreadId,
    expiresAt: proposal.expiresAt.toISOString(),
    respondedAt: proposal.respondedAt?.toISOString() || null,
    createdAt: proposal.createdAt.toISOString(),
    updatedAt: proposal.updatedAt.toISOString(),
    company: proposal.sellerProfile ? {
      id: proposal.sellerProfile.id,
      name: proposal.sellerProfile.shopName,
      logoUrl: proposal.sellerProfile.avatarUrl,
      slug: proposal.sellerProfile.shopSlug,
    } : null,
    sender: proposal.sender ? {
      id: proposal.sender.id,
      handle: proposal.sender.handle,
      displayName: proposal.sender.displayName,
      avatarUrl: proposal.sender.avatarUrl,
    } : null,
    receiver: proposal.receiver ? {
      id: proposal.receiver.id,
      handle: proposal.receiver.handle,
      displayName: proposal.receiver.displayName,
      avatarUrl: proposal.receiver.avatarUrl,
    } : null,
    jobPosting: proposal.jobPosting ? {
      id: proposal.jobPosting.id,
      title: proposal.jobPosting.title,
      area: proposal.jobPosting.area,
    } : null,
  };
}

export async function workProposalsRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  // ==================== CRIAR PROPOSTA ====================
  // POST /api/work/proposals
  app.post('/work/proposals', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    let body: z.infer<typeof createProposalSchema>;
    try {
      body = createProposalSchema.parse(request.body);
    } catch (e) {
      return reply.status(400).send({ error: (e as Error).message });
    }

    // Buscar profile do remetente
    const senderProfile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
      select: { id: true, handle: true, displayName: true },
    });

    if (!senderProfile) {
      return reply.status(404).send({ error: 'Perfil não encontrado.' });
    }

    // Verificar se o usuário é dono da seller profile
    const sellerProfile = await prisma.sellerProfile.findFirst({
      where: {
        id: body.sellerProfileId,
        userId: authUser.sub,
      },
    });

    if (!sellerProfile) {
      return reply.status(403).send({ error: 'Você não tem permissão para enviar propostas desta empresa.' });
    }

    // Buscar profile do receptor pelo handle
    const receiverProfile = await prisma.profile.findUnique({
      where: { handle: body.receiverHandle },
      select: {
        id: true,
        handle: true,
        displayName: true,
        professionalProfile: {
          select: { status: true }
        }
      },
    });

    if (!receiverProfile) {
      return reply.status(404).send({ error: 'Profissional não encontrado.' });
    }

    // Não pode enviar proposta para si mesmo
    if (receiverProfile.id === senderProfile.id) {
      return reply.status(400).send({ error: 'Você não pode enviar proposta para si mesmo.' });
    }

    // Verificar se já existe proposta ativa para este par empresa-profissional
    const existingProposal = await prisma.workProposal.findFirst({
      where: {
        sellerProfileId: body.sellerProfileId,
        receiverId: receiverProfile.id,
        status: { in: ['PENDING', 'NEGOTIATING'] },
      },
    });

    if (existingProposal) {
      return reply.status(400).send({
        error: 'Já existe uma proposta ativa para este profissional.',
        existingProposalId: existingProposal.id
      });
    }

    // Se vinculada a uma vaga, verificar se a vaga existe e pertence à empresa
    if (body.jobPostingId) {
      const jobPosting = await prisma.jobPosting.findFirst({
        where: {
          id: body.jobPostingId,
          sellerProfileId: body.sellerProfileId,
        },
      });

      if (!jobPosting) {
        return reply.status(404).send({ error: 'Vaga não encontrada ou não pertence à empresa.' });
      }
    }

    // Criar thread de chat para negociação
    const now = Date.now();
    const chatThread = await prisma.chatThread.create({
      data: {
        kind: 'dm', // work_proposal não existe como kind, usando dm
        participants: [senderProfile.id, receiverProfile.id],
        lastMessageAt: BigInt(now),
        createdAt: BigInt(now),
        updatedAt: BigInt(now),
        metadata: {
          type: 'work_proposal',
          companyId: sellerProfile.id,
          companyName: sellerProfile.shopName,
        },
      },
    });

    // Calcular data de expiração (15 dias)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 15);

    // Criar proposta
    const proposal = await prisma.workProposal.create({
      data: {
        sellerProfileId: body.sellerProfileId,
        senderId: senderProfile.id,
        receiverId: receiverProfile.id,
        jobPostingId: body.jobPostingId || null,
        title: body.title,
        description: body.description,
        proposedValue: body.proposedValue,
        valuePeriod: body.valuePeriod,
        valueCurrency: body.valueCurrency,
        startDate: body.startDate ? new Date(body.startDate) : null,
        duration: body.duration || null,
        paymentType: body.paymentType,
        chatThreadId: chatThread.id,
        expiresAt,
      },
      include: {
        sellerProfile: true,
        sender: true,
        receiver: true,
        jobPosting: true,
      },
    });

    // Enviar mensagem inicial no chat
    await prisma.chatMessage.create({
      data: {
        threadId: chatThread.id,
        fromProfile: senderProfile.id,
        type: 'system',
        ciphertext: `📋 Nova proposta de trabalho: ${body.title}\n\n${body.description}\n\nValor: ${body.valueCurrency} ${body.proposedValue.toLocaleString('pt-BR')}/${body.valuePeriod.toLowerCase()}`,
        createdAt: BigInt(now),
        meta: {
          type: 'proposal_created',
          proposalId: proposal.id,
        },
      },
    });

    // TODO: Enviar notificação push para o receptor

    return reply.status(201).send({
      proposal: formatProposalResponse(proposal),
      message: 'Proposta enviada com sucesso!',
    });
  });

  // ==================== LISTAR PROPOSTAS ====================
  // GET /api/work/proposals
  app.get('/work/proposals', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const { type, status, cursor, limit = '20' } = request.query as {
      type?: 'sent' | 'received';
      status?: string;
      cursor?: string;
      limit?: string;
    };

    const profile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
      select: { id: true },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado.' });
    }

    const take = Math.min(parseInt(limit) || 20, 50);

    // Construir filtro baseado no tipo (enviadas ou recebidas)
    const whereClause: any = {};

    if (type === 'sent') {
      whereClause.senderId = profile.id;
    } else if (type === 'received') {
      whereClause.receiverId = profile.id;
    } else {
      // Ambas: enviadas ou recebidas
      whereClause.OR = [
        { senderId: profile.id },
        { receiverId: profile.id },
      ];
    }

    // Filtrar por status se fornecido
    if (status) {
      whereClause.status = status.toUpperCase();
    }

    // Cursor pagination
    if (cursor) {
      whereClause.createdAt = { lt: new Date(cursor) };
    }

    const proposals = await prisma.workProposal.findMany({
      where: whereClause,
      take: take + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        sellerProfile: true,
        sender: true,
        receiver: true,
        jobPosting: true,
      },
    });

    const hasMore = proposals.length > take;
    const items = hasMore ? proposals.slice(0, take) : proposals;
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

    // Contar totais por tipo
    const [sentCount, receivedCount] = await Promise.all([
      prisma.workProposal.count({ where: { senderId: profile.id } }),
      prisma.workProposal.count({ where: { receiverId: profile.id } }),
    ]);

    return reply.send({
      items: items.map(formatProposalResponse),
      nextCursor,
      counts: {
        sent: sentCount,
        received: receivedCount,
      },
    });
  });

  // ==================== DETALHES DA PROPOSTA ====================
  // GET /api/work/proposals/:id
  app.get('/work/proposals/:id', { preHandler: authOnRequest }, async (request, reply) => {
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

    const proposal = await prisma.workProposal.findUnique({
      where: { id },
      include: {
        sellerProfile: true,
        sender: true,
        receiver: {
          include: {
            professionalProfile: true,
          },
        },
        jobPosting: true,
      },
    });

    if (!proposal) {
      return reply.status(404).send({ error: 'Proposta não encontrada.' });
    }

    // Verificar se o usuário é parte da proposta
    if (proposal.senderId !== profile.id && proposal.receiverId !== profile.id) {
      return reply.status(403).send({ error: 'Você não tem permissão para ver esta proposta.' });
    }

    // Determinar role do usuário
    const role = proposal.senderId === profile.id ? 'sender' : 'receiver';

    return reply.send({
      proposal: formatProposalResponse(proposal),
      role,
    });
  });

  // ==================== ATUALIZAR PROPOSTA ====================
  // PATCH /api/work/proposals/:id (apenas se PENDING e sender)
  app.patch('/work/proposals/:id', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const { id } = request.params as { id: string };

    let body: z.infer<typeof updateProposalSchema>;
    try {
      body = updateProposalSchema.parse(request.body);
    } catch (e) {
      return reply.status(400).send({ error: (e as Error).message });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
      select: { id: true },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado.' });
    }

    const proposal = await prisma.workProposal.findUnique({
      where: { id },
      include: { sellerProfile: true },
    });

    if (!proposal) {
      return reply.status(404).send({ error: 'Proposta não encontrada.' });
    }

    // Verificar se é o remetente
    if (proposal.senderId !== profile.id) {
      return reply.status(403).send({ error: 'Apenas o remetente pode editar a proposta.' });
    }

    // Verificar se ainda está PENDING
    if (proposal.status !== 'PENDING') {
      return reply.status(400).send({ error: 'Proposta não pode mais ser editada neste status.' });
    }

    const updated = await prisma.workProposal.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.description && { description: body.description }),
        ...(body.proposedValue !== undefined && { proposedValue: body.proposedValue }),
        ...(body.valuePeriod && { valuePeriod: body.valuePeriod }),
        ...(body.valueCurrency && { valueCurrency: body.valueCurrency }),
        ...(body.startDate !== undefined && { startDate: body.startDate ? new Date(body.startDate) : null }),
        ...(body.duration !== undefined && { duration: body.duration }),
        ...(body.paymentType && { paymentType: body.paymentType }),
      },
      include: {
        sellerProfile: true,
        sender: true,
        receiver: true,
        jobPosting: true,
      },
    });

    return reply.send({
      proposal: formatProposalResponse(updated),
      message: 'Proposta atualizada!',
    });
  });

  // ==================== CANCELAR PROPOSTA ====================
  // DELETE /api/work/proposals/:id
  app.delete('/work/proposals/:id', { preHandler: authOnRequest }, async (request, reply) => {
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

    const proposal = await prisma.workProposal.findUnique({
      where: { id },
    });

    if (!proposal) {
      return reply.status(404).send({ error: 'Proposta não encontrada.' });
    }

    // Verificar se é o remetente
    if (proposal.senderId !== profile.id) {
      return reply.status(403).send({ error: 'Apenas o remetente pode cancelar a proposta.' });
    }

    // Verificar se pode ser cancelada
    if (!['PENDING', 'NEGOTIATING'].includes(proposal.status)) {
      return reply.status(400).send({ error: 'Proposta não pode ser cancelada neste status.' });
    }

    await prisma.workProposal.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        respondedAt: new Date(),
      },
    });

    // Enviar mensagem no chat
    if (proposal.chatThreadId) {
      await prisma.chatMessage.create({
        data: {
          threadId: proposal.chatThreadId,
          fromProfile: profile.id,
          type: 'system',
          ciphertext: '❌ Proposta cancelada pelo remetente.',
          createdAt: BigInt(Date.now()),
          meta: { type: 'proposal_cancelled' },
        },
      });
    }

    return reply.send({
      success: true,
      message: 'Proposta cancelada.',
    });
  });

  // ==================== ACEITAR PROPOSTA ====================
  // POST /api/work/proposals/:id/accept
  app.post('/work/proposals/:id/accept', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const { id } = request.params as { id: string };

    const profile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
      select: { id: true, handle: true, displayName: true },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado.' });
    }

    const proposal = await prisma.workProposal.findUnique({
      where: { id },
      include: {
        sellerProfile: true,
        sender: true,
        receiver: true,
      },
    });

    if (!proposal) {
      return reply.status(404).send({ error: 'Proposta não encontrada.' });
    }

    // Verificar se é o receptor
    if (proposal.receiverId !== profile.id) {
      return reply.status(403).send({ error: 'Apenas o receptor pode aceitar a proposta.' });
    }

    // Verificar se pode ser aceita
    if (!['PENDING', 'NEGOTIATING'].includes(proposal.status)) {
      return reply.status(400).send({ error: 'Proposta não pode ser aceita neste status.' });
    }

    // Verificar se não expirou
    if (proposal.expiresAt < new Date()) {
      await prisma.workProposal.update({
        where: { id },
        data: { status: 'EXPIRED' },
      });
      return reply.status(400).send({ error: 'Proposta expirada.' });
    }

    // Atualizar proposta para ACCEPTED
    const updated = await prisma.workProposal.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        respondedAt: new Date(),
      },
      include: {
        sellerProfile: true,
        sender: true,
        receiver: true,
        jobPosting: true,
      },
    });

    // Criar WorkAgreement (PROMPT-05)
    let agreement = await prisma.workAgreement.create({
      data: {
        sellerProfileId: proposal.sellerProfileId,
        workerId: proposal.receiverId,
        proposalId: proposal.id,
        title: proposal.title,
        description: proposal.description,
        agreedValue: proposal.proposedValue,
        valuePeriod: proposal.valuePeriod,
        valueCurrency: proposal.valueCurrency,
        startDate: proposal.startDate || new Date(),
        paymentType: proposal.paymentType,
        status: 'ACTIVE',
      },
    });

    // PROMPT-06: Registrar on-chain (async, não bloqueia fluxo)
    const workOnChain = getWorkOnChainService();
    if (workOnChain && workOnChain.isPalletAvailable()) {
      try {
        // Buscar wallets (campo 'address' no modelo User)
        const companyUser = await prisma.user.findUnique({
          where: { id: proposal.sellerProfile?.userId },
          select: { address: true },
        });
        const workerUser = await prisma.user.findUnique({
          where: { id: authUser.sub },
          select: { address: true },
        });

        if (companyUser?.address && workerUser?.address) {
          const { txHash, onChainId } = await workOnChain.createAgreement({
            agreementId: agreement.id,
            companyWallet: companyUser.address,
            workerWallet: workerUser.address,
            paymentType: proposal.paymentType,
          });

          // Atualizar acordo com referência on-chain
          agreement = await prisma.workAgreement.update({
            where: { id: agreement.id },
            data: { onChainId, onChainTxHash: txHash },
          });

          console.log(`[WorkOnChain] Agreement registered:`, { agreementId: agreement.id, onChainId, txHash });
        }
      } catch (error) {
        // Log erro mas não bloqueia criação do acordo off-chain
        console.error('[WorkOnChain] Failed to register agreement on-chain:', error);
      }
    }

    // Enviar mensagem no chat
    if (proposal.chatThreadId) {
      await prisma.chatMessage.create({
        data: {
          threadId: proposal.chatThreadId,
          fromProfile: profile.id,
          type: 'system',
          ciphertext: `✅ Proposta aceita! Acordo de trabalho criado.`,
          createdAt: BigInt(Date.now()),
          meta: { type: 'proposal_accepted', agreementId: agreement.id },
        },
      });
    }

    // TODO: Criar evento no Feed (sem valores financeiros)

    return reply.send({
      proposal: formatProposalResponse(updated),
      message: 'Proposta aceita! Acordo de trabalho criado.',
      agreementId: agreement.id,
    });
  });

  // ==================== REJEITAR PROPOSTA ====================
  // POST /api/work/proposals/:id/reject
  app.post('/work/proposals/:id/reject', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const { id } = request.params as { id: string };
    const { reason } = (request.body || {}) as { reason?: string };

    const profile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
      select: { id: true },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado.' });
    }

    const proposal = await prisma.workProposal.findUnique({
      where: { id },
    });

    if (!proposal) {
      return reply.status(404).send({ error: 'Proposta não encontrada.' });
    }

    // Verificar se é o receptor
    if (proposal.receiverId !== profile.id) {
      return reply.status(403).send({ error: 'Apenas o receptor pode rejeitar a proposta.' });
    }

    // Verificar se pode ser rejeitada
    if (!['PENDING', 'NEGOTIATING'].includes(proposal.status)) {
      return reply.status(400).send({ error: 'Proposta não pode ser rejeitada neste status.' });
    }

    await prisma.workProposal.update({
      where: { id },
      data: {
        status: 'REJECTED',
        respondedAt: new Date(),
      },
    });

    // Enviar mensagem no chat
    if (proposal.chatThreadId) {
      await prisma.chatMessage.create({
        data: {
          threadId: proposal.chatThreadId,
          fromProfile: profile.id,
          type: 'system',
          ciphertext: reason
            ? `❌ Proposta recusada.\nMotivo: ${reason}`
            : '❌ Proposta recusada.',
          createdAt: BigInt(Date.now()),
          meta: { type: 'proposal_rejected', reason },
        },
      });
    }

    return reply.send({
      success: true,
      message: 'Proposta recusada.',
    });
  });

  // ==================== INICIAR NEGOCIAÇÃO ====================
  // POST /api/work/proposals/:id/negotiate
  app.post('/work/proposals/:id/negotiate', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const { id } = request.params as { id: string };
    const { message } = (request.body || {}) as { message?: string };

    const profile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
      select: { id: true },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado.' });
    }

    const proposal = await prisma.workProposal.findUnique({
      where: { id },
    });

    if (!proposal) {
      return reply.status(404).send({ error: 'Proposta não encontrada.' });
    }

    // Verificar se é o receptor
    if (proposal.receiverId !== profile.id) {
      return reply.status(403).send({ error: 'Apenas o receptor pode iniciar negociação.' });
    }

    // Verificar se pode iniciar negociação
    if (proposal.status !== 'PENDING') {
      return reply.status(400).send({ error: 'Negociação só pode ser iniciada em propostas pendentes.' });
    }

    const updated = await prisma.workProposal.update({
      where: { id },
      data: { status: 'NEGOTIATING' },
      include: {
        sellerProfile: true,
        sender: true,
        receiver: true,
        jobPosting: true,
      },
    });

    // Enviar mensagem no chat
    if (proposal.chatThreadId) {
      await prisma.chatMessage.create({
        data: {
          threadId: proposal.chatThreadId,
          fromProfile: profile.id,
          type: 'system',
          ciphertext: message
            ? `💬 Gostaria de negociar os termos:\n\n${message}`
            : '💬 Gostaria de negociar os termos da proposta.',
          createdAt: BigInt(Date.now()),
          meta: { type: 'proposal_negotiating' },
        },
      });
    }

    return reply.send({
      proposal: formatProposalResponse(updated),
      message: 'Negociação iniciada. Use o chat para discutir os termos.',
    });
  });

  // ==================== CONTRA-PROPOSTA ====================
  // POST /api/work/proposals/:id/counter
  app.post('/work/proposals/:id/counter', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

    const { id } = request.params as { id: string };

    let body: z.infer<typeof counterProposalSchema>;
    try {
      body = counterProposalSchema.parse(request.body);
    } catch (e) {
      return reply.status(400).send({ error: (e as Error).message });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
      select: { id: true },
    });

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil não encontrado.' });
    }

    const proposal = await prisma.workProposal.findUnique({
      where: { id },
    });

    if (!proposal) {
      return reply.status(404).send({ error: 'Proposta não encontrada.' });
    }

    // Verificar se é parte da proposta
    if (proposal.senderId !== profile.id && proposal.receiverId !== profile.id) {
      return reply.status(403).send({ error: 'Você não tem permissão para fazer contra-proposta.' });
    }

    // Verificar se está em negociação
    if (proposal.status !== 'NEGOTIATING') {
      return reply.status(400).send({ error: 'Contra-proposta só pode ser feita durante negociação.' });
    }

    // Atualizar valores se fornecidos
    const updated = await prisma.workProposal.update({
      where: { id },
      data: {
        ...(body.proposedValue !== undefined && { proposedValue: body.proposedValue }),
        ...(body.valuePeriod && { valuePeriod: body.valuePeriod }),
        ...(body.startDate !== undefined && { startDate: body.startDate ? new Date(body.startDate) : null }),
        ...(body.duration !== undefined && { duration: body.duration }),
      },
      include: {
        sellerProfile: true,
        sender: true,
        receiver: true,
        jobPosting: true,
      },
    });

    // Enviar mensagem no chat
    if (proposal.chatThreadId) {
      let counterMessage = '💰 Contra-proposta enviada:\n';
      if (body.proposedValue !== undefined) {
        counterMessage += `• Novo valor: ${updated.valueCurrency} ${body.proposedValue.toLocaleString('pt-BR')}\n`;
      }
      if (body.valuePeriod) {
        counterMessage += `• Período: ${body.valuePeriod.toLowerCase()}\n`;
      }
      if (body.startDate) {
        counterMessage += `• Início: ${new Date(body.startDate).toLocaleDateString('pt-BR')}\n`;
      }
      if (body.duration) {
        counterMessage += `• Duração: ${body.duration}\n`;
      }
      if (body.message) {
        counterMessage += `\n${body.message}`;
      }

      await prisma.chatMessage.create({
        data: {
          threadId: proposal.chatThreadId,
          fromProfile: profile.id,
          type: 'system',
          ciphertext: counterMessage,
          createdAt: BigInt(Date.now()),
          meta: {
            type: 'counter_proposal',
            changes: {
              proposedValue: body.proposedValue,
              valuePeriod: body.valuePeriod,
              startDate: body.startDate,
              duration: body.duration,
            }
          },
        },
      });
    }

    return reply.send({
      proposal: formatProposalResponse(updated),
      message: 'Contra-proposta enviada.',
    });
  });
}

export default workProposalsRoutes;
