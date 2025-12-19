// path: apps/api/src/routes/pay/adjustments.ts
// Bazari Pay - Endpoints de Ajustes (PROMPT-03 + PROMPT-05)

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PrismaClient, AdjustmentType, AdjustmentStatus } from '@prisma/client';
import { authOnRequest } from '../../lib/auth/middleware.js';
import type { AccessTokenPayload } from '../../lib/auth/jwt.js';
import { getPayNotificationService } from '../../services/pay-notification.service.js';

interface CreateAdjustmentBody {
  type: AdjustmentType;
  value: string;
  referenceMonth: string; // "2025-02-01"
  reason: string;
  description?: string;
  attachments?: string[];
  requiresApproval?: boolean;
}

interface UpdateAdjustmentBody {
  value?: string;
  reason?: string;
  description?: string;
  attachments?: string[];
}

export default async function payAdjustmentsRoutes(
  fastify: FastifyInstance,
  opts: { prisma: PrismaClient }
) {
  const { prisma } = opts;

  function getAuthUser(request: FastifyRequest): AccessTokenPayload {
    const authReq = request as FastifyRequest & { authUser: AccessTokenPayload };
    return authReq.authUser;
  }

  // POST /api/pay/contracts/:id/adjustments
  // Criar ajuste para um contrato
  fastify.post<{
    Params: { id: string };
    Body: CreateAdjustmentBody;
  }>('/contracts/:id/adjustments', { onRequest: [authOnRequest] }, async (request, reply) => {
    const authUser = getAuthUser(request);
    const { id: contractId } = request.params;
    const { type, value, referenceMonth, reason, description, attachments, requiresApproval } = request.body;

    // Buscar contrato
    const contract = await prisma.payContract.findUnique({
      where: { id: contractId },
      include: {
        payer: { include: { profile: true } },
        receiver: { include: { profile: true } },
      },
    });

    if (!contract) {
      return reply.status(404).send({ error: 'Contrato não encontrado' });
    }

    // Apenas pagador pode criar ajustes
    if (contract.payerId !== authUser.sub) {
      return reply.status(403).send({ error: 'Apenas o pagador pode criar ajustes' });
    }

    // Validar valor
    const valueDecimal = parseFloat(value);
    if (isNaN(valueDecimal) || valueDecimal <= 0) {
      return reply.status(400).send({ error: 'Valor inválido' });
    }

    // Descontos sempre requerem aprovação
    const needsApproval = type === 'DISCOUNT' ? true : (requiresApproval ?? false);

    // Status inicial
    const status: AdjustmentStatus = needsApproval ? 'PENDING_APPROVAL' : 'APPROVED';

    const adjustment = await prisma.payAdjustment.create({
      data: {
        contractId,
        type,
        value: valueDecimal,
        referenceMonth: new Date(referenceMonth),
        reason,
        description,
        attachments: attachments || [],
        requiresApproval: needsApproval,
        status,
        createdById: authUser.sub,
      },
      include: {
        contract: {
          include: {
            receiver: { include: { profile: true } },
          },
        },
        createdBy: { include: { profile: true } },
      },
    });

    // TODO (PROMPT-05): Notificar recebedor se precisa aprovação
    // if (needsApproval) {
    //   await notifyAdjustmentPending(contract, adjustment);
    // }

    return reply.status(201).send({
      adjustment: {
        id: adjustment.id,
        type: adjustment.type,
        value: adjustment.value.toString(),
        referenceMonth: adjustment.referenceMonth.toISOString(),
        reason: adjustment.reason,
        description: adjustment.description,
        attachments: adjustment.attachments,
        requiresApproval: adjustment.requiresApproval,
        status: adjustment.status,
        createdAt: adjustment.createdAt.toISOString(),
        createdBy: {
          id: adjustment.createdBy.id,
          displayName: adjustment.createdBy.profile?.displayName || null,
          handle: adjustment.createdBy.profile?.handle || null,
        },
        contract: {
          id: adjustment.contract.id,
          receiver: {
            id: adjustment.contract.receiver.id,
            displayName: adjustment.contract.receiver.profile?.displayName || null,
            handle: adjustment.contract.receiver.profile?.handle || null,
          },
        },
      },
    });
  });

  // GET /api/pay/contracts/:id/adjustments
  // Listar ajustes de um contrato
  fastify.get<{
    Params: { id: string };
    Querystring: { status?: AdjustmentStatus };
  }>('/contracts/:id/adjustments', { onRequest: [authOnRequest] }, async (request, reply) => {
    const authUser = getAuthUser(request);
    const { id: contractId } = request.params;
    const { status } = request.query;

    // Verificar acesso ao contrato
    const contract = await prisma.payContract.findFirst({
      where: {
        id: contractId,
        OR: [
          { payerId: authUser.sub },
          { receiverId: authUser.sub },
        ],
      },
    });

    if (!contract) {
      return reply.status(404).send({ error: 'Contrato não encontrado' });
    }

    const adjustments = await prisma.payAdjustment.findMany({
      where: {
        contractId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { include: { profile: true } },
        approvedBy: { include: { profile: true } },
        execution: {
          select: {
            id: true,
            periodRef: true,
            executedAt: true,
          },
        },
      },
    });

    return reply.send({
      adjustments: adjustments.map((adj) => ({
        id: adj.id,
        type: adj.type,
        value: adj.value.toString(),
        referenceMonth: adj.referenceMonth.toISOString(),
        reason: adj.reason,
        description: adj.description,
        attachments: adj.attachments,
        requiresApproval: adj.requiresApproval,
        status: adj.status,
        approvedAt: adj.approvedAt?.toISOString() || null,
        approvedBy: adj.approvedBy
          ? {
              id: adj.approvedBy.id,
              displayName: adj.approvedBy.profile?.displayName || null,
              handle: adj.approvedBy.profile?.handle || null,
            }
          : null,
        rejectionReason: adj.rejectionReason,
        execution: adj.execution
          ? {
              id: adj.execution.id,
              periodRef: adj.execution.periodRef,
              executedAt: adj.execution.executedAt?.toISOString() || null,
            }
          : null,
        createdAt: adj.createdAt.toISOString(),
        createdBy: {
          id: adj.createdBy.id,
          displayName: adj.createdBy.profile?.displayName || null,
          handle: adj.createdBy.profile?.handle || null,
        },
      })),
    });
  });

  // GET /api/pay/adjustments/:id
  // Detalhes de um ajuste
  fastify.get<{
    Params: { id: string };
  }>('/adjustments/:id', { onRequest: [authOnRequest] }, async (request, reply) => {
    const authUser = getAuthUser(request);
    const { id } = request.params;

    const adjustment = await prisma.payAdjustment.findFirst({
      where: {
        id,
        contract: {
          OR: [
            { payerId: authUser.sub },
            { receiverId: authUser.sub },
          ],
        },
      },
      include: {
        contract: {
          include: {
            payer: { include: { profile: true } },
            receiver: { include: { profile: true } },
          },
        },
        createdBy: { include: { profile: true } },
        approvedBy: { include: { profile: true } },
        execution: true,
      },
    });

    if (!adjustment) {
      return reply.status(404).send({ error: 'Ajuste não encontrado' });
    }

    return reply.send({
      adjustment: {
        id: adjustment.id,
        type: adjustment.type,
        value: adjustment.value.toString(),
        referenceMonth: adjustment.referenceMonth.toISOString(),
        reason: adjustment.reason,
        description: adjustment.description,
        attachments: adjustment.attachments,
        requiresApproval: adjustment.requiresApproval,
        status: adjustment.status,
        approvedAt: adjustment.approvedAt?.toISOString() || null,
        approvedBy: adjustment.approvedBy
          ? {
              id: adjustment.approvedBy.id,
              displayName: adjustment.approvedBy.profile?.displayName || null,
              handle: adjustment.approvedBy.profile?.handle || null,
            }
          : null,
        rejectionReason: adjustment.rejectionReason,
        execution: adjustment.execution
          ? {
              id: adjustment.execution.id,
              periodRef: adjustment.execution.periodRef,
              executedAt: adjustment.execution.executedAt?.toISOString() || null,
              txHash: adjustment.execution.txHash,
            }
          : null,
        contract: {
          id: adjustment.contract.id,
          payer: {
            id: adjustment.contract.payer.id,
            displayName: adjustment.contract.payer.profile?.displayName || null,
            handle: adjustment.contract.payer.profile?.handle || null,
          },
          receiver: {
            id: adjustment.contract.receiver.id,
            displayName: adjustment.contract.receiver.profile?.displayName || null,
            handle: adjustment.contract.receiver.profile?.handle || null,
          },
        },
        createdAt: adjustment.createdAt.toISOString(),
        createdBy: {
          id: adjustment.createdBy.id,
          displayName: adjustment.createdBy.profile?.displayName || null,
          handle: adjustment.createdBy.profile?.handle || null,
        },
      },
    });
  });

  // PATCH /api/pay/adjustments/:id
  // Atualizar ajuste (apenas se DRAFT)
  fastify.patch<{
    Params: { id: string };
    Body: UpdateAdjustmentBody;
  }>('/adjustments/:id', { onRequest: [authOnRequest] }, async (request, reply) => {
    const authUser = getAuthUser(request);
    const { id } = request.params;
    const { value, reason, description, attachments } = request.body;

    const adjustment = await prisma.payAdjustment.findFirst({
      where: {
        id,
        contract: { payerId: authUser.sub },
      },
      include: { contract: true },
    });

    if (!adjustment) {
      return reply.status(404).send({ error: 'Ajuste não encontrado' });
    }

    if (adjustment.status !== 'DRAFT') {
      return reply.status(400).send({ error: 'Apenas ajustes em rascunho podem ser editados' });
    }

    const updated = await prisma.payAdjustment.update({
      where: { id },
      data: {
        ...(value !== undefined ? { value: parseFloat(value) } : {}),
        ...(reason !== undefined ? { reason } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(attachments !== undefined ? { attachments } : {}),
      },
    });

    return reply.send({
      adjustment: {
        id: updated.id,
        type: updated.type,
        value: updated.value.toString(),
        referenceMonth: updated.referenceMonth.toISOString(),
        reason: updated.reason,
        description: updated.description,
        status: updated.status,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  });

  // DELETE /api/pay/adjustments/:id
  // Cancelar ajuste
  fastify.delete<{
    Params: { id: string };
  }>('/adjustments/:id', { onRequest: [authOnRequest] }, async (request, reply) => {
    const authUser = getAuthUser(request);
    const { id } = request.params;

    const adjustment = await prisma.payAdjustment.findFirst({
      where: {
        id,
        contract: { payerId: authUser.sub },
      },
    });

    if (!adjustment) {
      return reply.status(404).send({ error: 'Ajuste não encontrado' });
    }

    // Não pode cancelar se já foi aplicado
    if (adjustment.status === 'APPLIED') {
      return reply.status(400).send({ error: 'Ajuste já aplicado não pode ser cancelado' });
    }

    await prisma.payAdjustment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return reply.send({ success: true });
  });

  // POST /api/pay/adjustments/:id/submit
  // Enviar para aprovação (DRAFT -> PENDING_APPROVAL)
  fastify.post<{
    Params: { id: string };
  }>('/adjustments/:id/submit', { onRequest: [authOnRequest] }, async (request, reply) => {
    const authUser = getAuthUser(request);
    const { id } = request.params;

    const adjustment = await prisma.payAdjustment.findFirst({
      where: {
        id,
        contract: { payerId: authUser.sub },
      },
      include: { contract: true },
    });

    if (!adjustment) {
      return reply.status(404).send({ error: 'Ajuste não encontrado' });
    }

    if (adjustment.status !== 'DRAFT') {
      return reply.status(400).send({ error: 'Ajuste não está em rascunho' });
    }

    await prisma.payAdjustment.update({
      where: { id },
      data: {
        status: 'PENDING_APPROVAL',
        requiresApproval: true,
      },
    });

    // TODO (PROMPT-05): Notificar recebedor
    // await notifyAdjustmentPending(adjustment.contract, adjustment);

    return reply.send({ success: true, status: 'PENDING_APPROVAL' });
  });

  // POST /api/pay/adjustments/:id/approve
  // Aprovar ajuste (apenas recebedor)
  fastify.post<{
    Params: { id: string };
  }>('/adjustments/:id/approve', { onRequest: [authOnRequest] }, async (request, reply) => {
    const authUser = getAuthUser(request);
    const { id } = request.params;

    const adjustment = await prisma.payAdjustment.findFirst({
      where: {
        id,
        contract: { receiverId: authUser.sub },
      },
      include: { contract: true },
    });

    if (!adjustment) {
      return reply.status(404).send({ error: 'Ajuste não encontrado' });
    }

    if (adjustment.status !== 'PENDING_APPROVAL') {
      return reply.status(400).send({ error: 'Ajuste não está pendente de aprovação' });
    }

    await prisma.payAdjustment.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: authUser.sub,
      },
    });

    // PROMPT-05: Notificar pagador
    const payNotification = getPayNotificationService();
    if (payNotification) {
      try {
        const adjustmentWithContract = await prisma.payAdjustment.findUnique({
          where: { id },
          include: {
            contract: {
              include: {
                payer: { include: { profile: true } },
                receiver: { include: { profile: true } },
              },
            },
          },
        });
        if (adjustmentWithContract) {
          await payNotification.notifyAdjustmentApproved({
            id: adjustmentWithContract.id,
            type: adjustmentWithContract.type,
            value: adjustmentWithContract.value,
            reason: adjustmentWithContract.reason,
            referenceMonth: adjustmentWithContract.referenceMonth.toISOString().slice(0, 7),
            contract: adjustmentWithContract.contract,
          });
        }
      } catch (notifyErr) {
        console.error('[PayAdjustments] Failed to send approve notification:', notifyErr);
      }
    }

    return reply.send({ success: true, status: 'APPROVED' });
  });

  // POST /api/pay/adjustments/:id/reject
  // Rejeitar ajuste (apenas recebedor)
  fastify.post<{
    Params: { id: string };
    Body: { reason: string };
  }>('/adjustments/:id/reject', { onRequest: [authOnRequest] }, async (request, reply) => {
    const authUser = getAuthUser(request);
    const { id } = request.params;
    const { reason } = request.body;

    if (!reason) {
      return reply.status(400).send({ error: 'Motivo da rejeição é obrigatório' });
    }

    const adjustment = await prisma.payAdjustment.findFirst({
      where: {
        id,
        contract: { receiverId: authUser.sub },
      },
      include: { contract: true },
    });

    if (!adjustment) {
      return reply.status(404).send({ error: 'Ajuste não encontrado' });
    }

    if (adjustment.status !== 'PENDING_APPROVAL') {
      return reply.status(400).send({ error: 'Ajuste não está pendente de aprovação' });
    }

    await prisma.payAdjustment.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
      },
    });

    // PROMPT-05: Notificar pagador
    const payNotification = getPayNotificationService();
    if (payNotification) {
      try {
        const adjustmentWithContract = await prisma.payAdjustment.findUnique({
          where: { id },
          include: {
            contract: {
              include: {
                payer: { include: { profile: true } },
                receiver: { include: { profile: true } },
              },
            },
          },
        });
        if (adjustmentWithContract) {
          await payNotification.notifyAdjustmentRejected({
            id: adjustmentWithContract.id,
            type: adjustmentWithContract.type,
            value: adjustmentWithContract.value,
            reason: adjustmentWithContract.reason,
            referenceMonth: adjustmentWithContract.referenceMonth.toISOString().slice(0, 7),
            contract: adjustmentWithContract.contract,
          }, reason);
        }
      } catch (notifyErr) {
        console.error('[PayAdjustments] Failed to send reject notification:', notifyErr);
      }
    }

    return reply.send({ success: true, status: 'REJECTED' });
  });

  // GET /api/pay/adjustments/pending
  // Listar ajustes pendentes de aprovação (para recebedor)
  fastify.get('/adjustments/pending', { onRequest: [authOnRequest] }, async (request, reply) => {
    const authUser = getAuthUser(request);

    const adjustments = await prisma.payAdjustment.findMany({
      where: {
        status: 'PENDING_APPROVAL',
        contract: { receiverId: authUser.sub },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        contract: {
          include: {
            payer: { include: { profile: true } },
            payerCompany: true,
          },
        },
        createdBy: { include: { profile: true } },
      },
    });

    return reply.send({
      items: adjustments.map((adj) => ({
        id: adj.id,
        type: adj.type,
        value: adj.value.toString(),
        referenceMonth: adj.referenceMonth.toISOString(),
        reason: adj.reason,
        description: adj.description,
        createdAt: adj.createdAt.toISOString(),
        contract: {
          id: adj.contract.id,
          description: adj.contract.description,
          payer: {
            id: adj.contract.payer.id,
            displayName: adj.contract.payerCompany?.shopName ||
              adj.contract.payer.profile?.displayName || null,
            handle: adj.contract.payer.profile?.handle || null,
            avatarUrl: adj.contract.payer.profile?.avatarUrl || null,
          },
        },
        createdBy: {
          id: adj.createdBy.id,
          displayName: adj.createdBy.profile?.displayName || null,
          handle: adj.createdBy.profile?.handle || null,
        },
      })),
      total: adjustments.length,
    });
  });
}
