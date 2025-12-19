// path: apps/api/src/routes/pay/contracts.ts
// Bazari Pay - Endpoints de Contratos de Pagamento Recorrente (PROMPT-01 + PROMPT-04 + PROMPT-05)

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PrismaClient, PayPeriod, PayContractStatus } from '@prisma/client';
import { authOnRequest } from '../../lib/auth/middleware.js';
import type { AccessTokenPayload } from '../../lib/auth/jwt.js';
import { getPayOnChainService } from '../../services/pay-onchain.service.js';
import { getPayNotificationService } from '../../services/pay-notification.service.js';

interface CreateContractBody {
  receiverHandle?: string;
  receiverId?: string;
  receiverWallet?: string;
  baseValue: string;
  currency: string;
  period: PayPeriod;
  paymentDay: number;
  startDate: string;
  endDate?: string | null;
  description?: string;
  referenceType?: string;
  referenceId?: string;
  payerCompanyId?: string;
}

interface UpdateContractBody {
  baseValue?: string;
  paymentDay?: number;
  description?: string;
  endDate?: string | null;
}

interface StatusChangeBody {
  reason?: string;
}

function calculateNextPaymentDate(
  startDate: Date,
  period: PayPeriod,
  paymentDay: number
): Date {
  const start = new Date(startDate);
  const now = new Date();
  let next = new Date(Math.max(start.getTime(), now.getTime()));

  // Para periodicidade semanal, usamos o dia da semana
  if (period === 'WEEKLY') {
    // paymentDay = 0 (domingo) a 6 (sábado)
    const currentDay = next.getDay();
    const targetDay = paymentDay % 7;
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    next.setDate(next.getDate() + daysUntil);
    return next;
  }

  if (period === 'BIWEEKLY') {
    // Encontrar próxima data válida (dia específico, a cada 2 semanas)
    const currentDay = next.getDay();
    const targetDay = paymentDay % 7;
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 14;
    else daysUntil += 7; // Para garantir pelo menos 1 semana
    next.setDate(next.getDate() + daysUntil);
    return next;
  }

  // MONTHLY - usar dia do mês
  next.setDate(paymentDay);

  // Se a data resultante já passou, avançar para o próximo mês
  if (next <= now || next <= start) {
    next.setMonth(next.getMonth() + 1);
    next.setDate(paymentDay);
  }

  return next;
}

export default async function payContractsRoutes(
  fastify: FastifyInstance,
  opts: { prisma: PrismaClient }
) {
  const { prisma } = opts;

  function getAuthUser(request: FastifyRequest): AccessTokenPayload {
    const authReq = request as FastifyRequest & { authUser: AccessTokenPayload };
    return authReq.authUser;
  }

  // ============================================================================
  // POST /api/pay/contracts - Criar contrato
  // ============================================================================
  fastify.post<{ Body: CreateContractBody }>(
    '/contracts',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const {
        receiverHandle,
        receiverId,
        receiverWallet,
        baseValue,
        currency,
        period,
        paymentDay,
        startDate,
        endDate,
        description,
        referenceType,
        referenceId,
        payerCompanyId,
      } = request.body;

      // Validar dia do pagamento
      if (period === 'MONTHLY' && (paymentDay < 1 || paymentDay > 28)) {
        return reply.status(400).send({ error: 'Dia do pagamento deve ser entre 1 e 28' });
      }
      if ((period === 'WEEKLY' || period === 'BIWEEKLY') && (paymentDay < 0 || paymentDay > 6)) {
        return reply.status(400).send({ error: 'Dia da semana deve ser entre 0 (domingo) e 6 (sábado)' });
      }

      // Buscar pagador
      const payerProfile = await prisma.profile.findUnique({
        where: { userId: authUser.sub },
        include: { user: true },
      });

      if (!payerProfile) {
        return reply.status(400).send({ error: 'Você precisa ter um perfil ativo' });
      }

      // Verificar se pagador tem wallet
      if (!payerProfile.user.address) {
        return reply.status(400).send({ error: 'Você precisa ter uma wallet ativa' });
      }

      // Buscar recebedor
      let receiver;
      if (receiverId) {
        receiver = await prisma.profile.findFirst({
          where: { userId: receiverId },
          include: { user: true },
        });
      } else if (receiverHandle) {
        receiver = await prisma.profile.findFirst({
          where: { handle: receiverHandle },
          include: { user: true },
        });
      }

      if (!receiver) {
        return reply.status(404).send({ error: 'Recebedor não encontrado' });
      }

      // Verificar se recebedor tem wallet
      const finalReceiverWallet = receiverWallet || receiver.user.address;
      if (!finalReceiverWallet) {
        return reply.status(400).send({ error: 'Recebedor precisa ter uma wallet' });
      }

      // Validar empresa pagadora (se informada)
      if (payerCompanyId) {
        const company = await prisma.sellerProfile.findFirst({
          where: { id: payerCompanyId, userId: authUser.sub },
        });
        if (!company) {
          return reply.status(403).send({ error: 'Você não tem permissão para usar esta empresa' });
        }
      }

      // Calcular próximo pagamento
      const start = new Date(startDate);
      const nextPaymentDate = calculateNextPaymentDate(start, period, paymentDay);

      // Criar contrato
      const contract = await prisma.payContract.create({
        data: {
          payerId: authUser.sub,
          payerCompanyId: payerCompanyId || null,
          receiverId: receiver.userId,
          payerWallet: payerProfile.user.address,
          receiverWallet: finalReceiverWallet,
          baseValue: parseFloat(baseValue),
          currency: currency || 'BZR',
          period,
          paymentDay,
          startDate: start,
          endDate: endDate ? new Date(endDate) : null,
          nextPaymentDate,
          description,
          referenceType,
          referenceId,
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
      });

      // PROMPT-04: Registrar on-chain se serviço disponível
      const payOnChain = getPayOnChainService();
      if (payOnChain && payOnChain.isPalletAvailable()) {
        try {
          const { txHash, onChainId } = await payOnChain.createContract({
            contractId: contract.id,
            payerWallet: payerProfile.user.address,
            receiverWallet: finalReceiverWallet,
            baseValue: baseValue,
            period,
            paymentDay,
          });

          // Atualizar contrato com dados on-chain
          await prisma.payContract.update({
            where: { id: contract.id },
            data: {
              onChainId,
              onChainTxHash: txHash,
            },
          });

          console.log(`[PayContracts] Contract ${contract.id} registered on-chain: ${onChainId}`);
        } catch (onChainError) {
          console.error(`[PayContracts] Failed to register contract on-chain:`, onChainError);
          // Contrato criado off-chain, on-chain falhou - continuar sem bloquear
        }
      }

      // PROMPT-05: Notificar recebedor via BazChat
      const payNotification = getPayNotificationService();
      if (payNotification) {
        try {
          await payNotification.notifyContractCreated(contract);
        } catch (notifyErr) {
          console.error('[PayContracts] Failed to send notification:', notifyErr);
        }
      }

      return reply.status(201).send({
        contract: {
          id: contract.id,
          payer: {
            id: contract.payerId,
            handle: contract.payer.profile?.handle || null,
            displayName: contract.payer.profile?.displayName || 'Usuário',
            avatarUrl: contract.payer.profile?.avatarUrl || null,
          },
          payerCompany: contract.payerCompany
            ? {
                id: contract.payerCompany.id,
                name: contract.payerCompany.shopName,
                avatarUrl: contract.payerCompany.avatarUrl,
              }
            : null,
          receiver: {
            id: contract.receiverId,
            handle: contract.receiver.profile?.handle || null,
            displayName: contract.receiver.profile?.displayName || 'Usuário',
            avatarUrl: contract.receiver.profile?.avatarUrl || null,
          },
          payerWallet: contract.payerWallet,
          receiverWallet: contract.receiverWallet,
          baseValue: contract.baseValue.toString(),
          currency: contract.currency,
          period: contract.period,
          paymentDay: contract.paymentDay,
          startDate: contract.startDate.toISOString(),
          endDate: contract.endDate?.toISOString() || null,
          nextPaymentDate: contract.nextPaymentDate.toISOString(),
          status: contract.status,
          description: contract.description,
          referenceType: contract.referenceType,
          referenceId: contract.referenceId,
          createdAt: contract.createdAt.toISOString(),
        },
      });
    }
  );

  // ============================================================================
  // GET /api/pay/contracts - Listar contratos
  // ============================================================================
  fastify.get<{
    Querystring: {
      role?: 'payer' | 'receiver' | 'all';
      status?: PayContractStatus;
      page?: string;
      limit?: string;
    };
  }>('/contracts', { onRequest: [authOnRequest] }, async (request, reply) => {
    const authUser = getAuthUser(request);
    const { role = 'all', status, page = '1', limit = '20' } = request.query;

    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100);
    const skip = (pageNum - 1) * limitNum;

    // Buscar seller profiles do usuário
    const sellerProfiles = await prisma.sellerProfile.findMany({
      where: { userId: authUser.sub },
      select: { id: true },
    });
    const sellerProfileIds = sellerProfiles.map((sp) => sp.id);

    // Construir filtro
    let where: any = {};

    if (role === 'payer') {
      where.OR = [
        { payerId: authUser.sub },
        { payerCompanyId: { in: sellerProfileIds } },
      ];
    } else if (role === 'receiver') {
      where.receiverId = authUser.sub;
    } else {
      where.OR = [
        { payerId: authUser.sub },
        { payerCompanyId: { in: sellerProfileIds } },
        { receiverId: authUser.sub },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [contracts, total] = await Promise.all([
      prisma.payContract.findMany({
        where,
        include: {
          payer: {
            include: { profile: true },
          },
          receiver: {
            include: { profile: true },
          },
          payerCompany: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.payContract.count({ where }),
    ]);

    return reply.send({
      contracts: contracts.map((c) => {
        const isPayer =
          c.payerId === authUser.sub ||
          sellerProfileIds.includes(c.payerCompanyId || '');
        return {
          id: c.id,
          role: isPayer ? 'payer' : 'receiver',
          payer: {
            id: c.payerId,
            handle: c.payer.profile?.handle || null,
            displayName: c.payer.profile?.displayName || 'Usuário',
            avatarUrl: c.payer.profile?.avatarUrl || null,
          },
          payerCompany: c.payerCompany
            ? {
                id: c.payerCompany.id,
                name: c.payerCompany.shopName,
                avatarUrl: c.payerCompany.avatarUrl,
              }
            : null,
          receiver: {
            id: c.receiverId,
            handle: c.receiver.profile?.handle || null,
            displayName: c.receiver.profile?.displayName || 'Usuário',
            avatarUrl: c.receiver.profile?.avatarUrl || null,
          },
          baseValue: c.baseValue.toString(),
          currency: c.currency,
          period: c.period,
          paymentDay: c.paymentDay,
          nextPaymentDate: c.nextPaymentDate.toISOString(),
          status: c.status,
          description: c.description,
          createdAt: c.createdAt.toISOString(),
        };
      }),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  });

  // ============================================================================
  // GET /api/pay/contracts/:id - Detalhes do contrato
  // ============================================================================
  fastify.get<{ Params: { id: string } }>(
    '/contracts/:id',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { id } = request.params;

      // Buscar seller profiles do usuário
      const sellerProfiles = await prisma.sellerProfile.findMany({
        where: { userId: authUser.sub },
        select: { id: true },
      });
      const sellerProfileIds = sellerProfiles.map((sp) => sp.id);

      const contract = await prisma.payContract.findUnique({
        where: { id },
        include: {
          payer: {
            include: { profile: true },
          },
          receiver: {
            include: { profile: true },
          },
          payerCompany: true,
          statusHistory: {
            include: {
              changedBy: {
                include: { profile: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!contract) {
        return reply.status(404).send({ error: 'Contrato não encontrado' });
      }

      // Verificar se o usuário tem acesso
      const isPayer =
        contract.payerId === authUser.sub ||
        sellerProfileIds.includes(contract.payerCompanyId || '');
      const isReceiver = contract.receiverId === authUser.sub;

      if (!isPayer && !isReceiver) {
        return reply.status(403).send({ error: 'Acesso negado' });
      }

      return reply.send({
        contract: {
          id: contract.id,
          role: isPayer ? 'payer' : 'receiver',
          payer: {
            id: contract.payerId,
            handle: contract.payer.profile?.handle || null,
            displayName: contract.payer.profile?.displayName || 'Usuário',
            avatarUrl: contract.payer.profile?.avatarUrl || null,
          },
          payerCompany: contract.payerCompany
            ? {
                id: contract.payerCompany.id,
                name: contract.payerCompany.shopName,
                avatarUrl: contract.payerCompany.avatarUrl,
              }
            : null,
          receiver: {
            id: contract.receiverId,
            handle: contract.receiver.profile?.handle || null,
            displayName: contract.receiver.profile?.displayName || 'Usuário',
            avatarUrl: contract.receiver.profile?.avatarUrl || null,
          },
          payerWallet: contract.payerWallet,
          receiverWallet: contract.receiverWallet,
          baseValue: contract.baseValue.toString(),
          currency: contract.currency,
          period: contract.period,
          paymentDay: contract.paymentDay,
          startDate: contract.startDate.toISOString(),
          endDate: contract.endDate?.toISOString() || null,
          nextPaymentDate: contract.nextPaymentDate.toISOString(),
          status: contract.status,
          description: contract.description,
          referenceType: contract.referenceType,
          referenceId: contract.referenceId,
          onChainId: contract.onChainId,
          onChainTxHash: contract.onChainTxHash,
          createdAt: contract.createdAt.toISOString(),
          updatedAt: contract.updatedAt.toISOString(),
          pausedAt: contract.pausedAt?.toISOString() || null,
          closedAt: contract.closedAt?.toISOString() || null,
          statusHistory: contract.statusHistory.map((h) => ({
            id: h.id,
            fromStatus: h.fromStatus,
            toStatus: h.toStatus,
            reason: h.reason,
            changedBy: {
              id: h.changedById,
              displayName: h.changedBy.profile?.displayName || 'Usuário',
            },
            createdAt: h.createdAt.toISOString(),
          })),
        },
      });
    }
  );

  // ============================================================================
  // PATCH /api/pay/contracts/:id - Atualizar contrato
  // ============================================================================
  fastify.patch<{ Params: { id: string }; Body: UpdateContractBody }>(
    '/contracts/:id',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { id } = request.params;
      const { baseValue, paymentDay, description, endDate } = request.body;

      // Buscar seller profiles
      const sellerProfiles = await prisma.sellerProfile.findMany({
        where: { userId: authUser.sub },
        select: { id: true },
      });
      const sellerProfileIds = sellerProfiles.map((sp) => sp.id);

      const contract = await prisma.payContract.findUnique({
        where: { id },
      });

      if (!contract) {
        return reply.status(404).send({ error: 'Contrato não encontrado' });
      }

      // Apenas pagador pode atualizar
      const isPayer =
        contract.payerId === authUser.sub ||
        sellerProfileIds.includes(contract.payerCompanyId || '');

      if (!isPayer) {
        return reply.status(403).send({ error: 'Apenas o pagador pode atualizar o contrato' });
      }

      // Não pode atualizar contrato encerrado
      if (contract.status === 'CLOSED') {
        return reply.status(400).send({ error: 'Contrato encerrado não pode ser atualizado' });
      }

      // Validar dia do pagamento
      if (paymentDay !== undefined) {
        if (contract.period === 'MONTHLY' && (paymentDay < 1 || paymentDay > 28)) {
          return reply.status(400).send({ error: 'Dia do pagamento deve ser entre 1 e 28' });
        }
      }

      // Montar update
      const updateData: any = {};
      if (baseValue !== undefined) updateData.baseValue = parseFloat(baseValue);
      if (paymentDay !== undefined) {
        updateData.paymentDay = paymentDay;
        // Recalcular próximo pagamento
        updateData.nextPaymentDate = calculateNextPaymentDate(
          new Date(),
          contract.period,
          paymentDay
        );
      }
      if (description !== undefined) updateData.description = description;
      if (endDate !== undefined) {
        updateData.endDate = endDate ? new Date(endDate) : null;
      }

      const updated = await prisma.payContract.update({
        where: { id },
        data: updateData,
      });

      return reply.send({
        contract: {
          id: updated.id,
          baseValue: updated.baseValue.toString(),
          paymentDay: updated.paymentDay,
          description: updated.description,
          endDate: updated.endDate?.toISOString() || null,
          nextPaymentDate: updated.nextPaymentDate.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      });
    }
  );

  // ============================================================================
  // DELETE /api/pay/contracts/:id - Deletar contrato (apenas se nunca executou)
  // ============================================================================
  fastify.delete<{ Params: { id: string } }>(
    '/contracts/:id',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { id } = request.params;

      // Buscar seller profiles
      const sellerProfiles = await prisma.sellerProfile.findMany({
        where: { userId: authUser.sub },
        select: { id: true },
      });
      const sellerProfileIds = sellerProfiles.map((sp) => sp.id);

      const contract = await prisma.payContract.findUnique({
        where: { id },
      });

      if (!contract) {
        return reply.status(404).send({ error: 'Contrato não encontrado' });
      }

      // Apenas pagador pode deletar
      const isPayer =
        contract.payerId === authUser.sub ||
        sellerProfileIds.includes(contract.payerCompanyId || '');

      if (!isPayer) {
        return reply.status(403).send({ error: 'Apenas o pagador pode deletar o contrato' });
      }

      // TODO: Verificar se já teve execuções (será implementado no PROMPT-02)
      // Por enquanto, permitir deletar qualquer contrato

      await prisma.payContract.delete({
        where: { id },
      });

      return reply.send({ success: true });
    }
  );

  // ============================================================================
  // POST /api/pay/contracts/:id/pause - Pausar contrato
  // ============================================================================
  fastify.post<{ Params: { id: string }; Body: StatusChangeBody }>(
    '/contracts/:id/pause',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { id } = request.params;
      const { reason } = request.body;

      // Buscar seller profiles
      const sellerProfiles = await prisma.sellerProfile.findMany({
        where: { userId: authUser.sub },
        select: { id: true },
      });
      const sellerProfileIds = sellerProfiles.map((sp) => sp.id);

      const contract = await prisma.payContract.findUnique({
        where: { id },
      });

      if (!contract) {
        return reply.status(404).send({ error: 'Contrato não encontrado' });
      }

      // Qualquer parte pode pausar
      const isPayer =
        contract.payerId === authUser.sub ||
        sellerProfileIds.includes(contract.payerCompanyId || '');
      const isReceiver = contract.receiverId === authUser.sub;

      if (!isPayer && !isReceiver) {
        return reply.status(403).send({ error: 'Acesso negado' });
      }

      if (contract.status !== 'ACTIVE') {
        return reply.status(400).send({ error: 'Apenas contratos ativos podem ser pausados' });
      }

      await prisma.$transaction([
        prisma.payContract.update({
          where: { id },
          data: { status: 'PAUSED', pausedAt: new Date() },
        }),
        prisma.payContractStatusHistory.create({
          data: {
            contractId: id,
            fromStatus: 'ACTIVE',
            toStatus: 'PAUSED',
            reason,
            changedById: authUser.sub,
          },
        }),
      ]);

      // PROMPT-04: Sincronizar status on-chain
      if (contract.onChainId) {
        const payOnChain = getPayOnChainService();
        if (payOnChain && payOnChain.isPalletAvailable()) {
          try {
            await payOnChain.updateStatus({
              onChainId: contract.onChainId,
              newStatus: 'PAUSED',
            });
            console.log(`[PayContracts] Contract ${id} paused on-chain`);
          } catch (onChainError) {
            console.error(`[PayContracts] Failed to pause contract on-chain:`, onChainError);
          }
        }
      }

      // PROMPT-05: Notificar outra parte via BazChat
      const payNotification = getPayNotificationService();
      if (payNotification) {
        try {
          const contractWithProfiles = await prisma.payContract.findUnique({
            where: { id },
            include: {
              payer: { include: { profile: true } },
              receiver: { include: { profile: true } },
            },
          });
          if (contractWithProfiles) {
            await payNotification.notifyContractPaused(contractWithProfiles, authUser.sub, reason);
          }
        } catch (notifyErr) {
          console.error('[PayContracts] Failed to send pause notification:', notifyErr);
        }
      }

      return reply.send({ success: true, status: 'PAUSED' });
    }
  );

  // ============================================================================
  // POST /api/pay/contracts/:id/resume - Retomar contrato
  // ============================================================================
  fastify.post<{ Params: { id: string } }>(
    '/contracts/:id/resume',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { id } = request.params;

      // Buscar seller profiles
      const sellerProfiles = await prisma.sellerProfile.findMany({
        where: { userId: authUser.sub },
        select: { id: true },
      });
      const sellerProfileIds = sellerProfiles.map((sp) => sp.id);

      const contract = await prisma.payContract.findUnique({
        where: { id },
      });

      if (!contract) {
        return reply.status(404).send({ error: 'Contrato não encontrado' });
      }

      // Qualquer parte pode retomar
      const isPayer =
        contract.payerId === authUser.sub ||
        sellerProfileIds.includes(contract.payerCompanyId || '');
      const isReceiver = contract.receiverId === authUser.sub;

      if (!isPayer && !isReceiver) {
        return reply.status(403).send({ error: 'Acesso negado' });
      }

      if (contract.status !== 'PAUSED') {
        return reply.status(400).send({ error: 'Apenas contratos pausados podem ser retomados' });
      }

      // Recalcular próximo pagamento
      const nextPaymentDate = calculateNextPaymentDate(
        new Date(),
        contract.period,
        contract.paymentDay
      );

      await prisma.$transaction([
        prisma.payContract.update({
          where: { id },
          data: { status: 'ACTIVE', pausedAt: null, nextPaymentDate },
        }),
        prisma.payContractStatusHistory.create({
          data: {
            contractId: id,
            fromStatus: 'PAUSED',
            toStatus: 'ACTIVE',
            changedById: authUser.sub,
          },
        }),
      ]);

      // PROMPT-04: Sincronizar status on-chain
      if (contract.onChainId) {
        const payOnChain = getPayOnChainService();
        if (payOnChain && payOnChain.isPalletAvailable()) {
          try {
            await payOnChain.updateStatus({
              onChainId: contract.onChainId,
              newStatus: 'ACTIVE',
            });
            console.log(`[PayContracts] Contract ${id} resumed on-chain`);
          } catch (onChainError) {
            console.error(`[PayContracts] Failed to resume contract on-chain:`, onChainError);
          }
        }
      }

      // PROMPT-05: Notificar outra parte via BazChat
      const payNotification = getPayNotificationService();
      if (payNotification) {
        try {
          const contractWithProfiles = await prisma.payContract.findUnique({
            where: { id },
            include: {
              payer: { include: { profile: true } },
              receiver: { include: { profile: true } },
            },
          });
          if (contractWithProfiles) {
            await payNotification.notifyContractResumed(contractWithProfiles, authUser.sub);
          }
        } catch (notifyErr) {
          console.error('[PayContracts] Failed to send resume notification:', notifyErr);
        }
      }

      return reply.send({
        success: true,
        status: 'ACTIVE',
        nextPaymentDate: nextPaymentDate.toISOString(),
      });
    }
  );

  // ============================================================================
  // POST /api/pay/contracts/:id/close - Encerrar contrato
  // ============================================================================
  fastify.post<{ Params: { id: string }; Body: StatusChangeBody }>(
    '/contracts/:id/close',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { id } = request.params;
      const { reason } = request.body;

      // Buscar seller profiles
      const sellerProfiles = await prisma.sellerProfile.findMany({
        where: { userId: authUser.sub },
        select: { id: true },
      });
      const sellerProfileIds = sellerProfiles.map((sp) => sp.id);

      const contract = await prisma.payContract.findUnique({
        where: { id },
      });

      if (!contract) {
        return reply.status(404).send({ error: 'Contrato não encontrado' });
      }

      // Qualquer parte pode encerrar
      const isPayer =
        contract.payerId === authUser.sub ||
        sellerProfileIds.includes(contract.payerCompanyId || '');
      const isReceiver = contract.receiverId === authUser.sub;

      if (!isPayer && !isReceiver) {
        return reply.status(403).send({ error: 'Acesso negado' });
      }

      if (contract.status === 'CLOSED') {
        return reply.status(400).send({ error: 'Contrato já está encerrado' });
      }

      await prisma.$transaction([
        prisma.payContract.update({
          where: { id },
          data: { status: 'CLOSED', closedAt: new Date() },
        }),
        prisma.payContractStatusHistory.create({
          data: {
            contractId: id,
            fromStatus: contract.status,
            toStatus: 'CLOSED',
            reason,
            changedById: authUser.sub,
          },
        }),
      ]);

      // PROMPT-04: Sincronizar status on-chain
      if (contract.onChainId) {
        const payOnChain = getPayOnChainService();
        if (payOnChain && payOnChain.isPalletAvailable()) {
          try {
            await payOnChain.updateStatus({
              onChainId: contract.onChainId,
              newStatus: 'CLOSED',
            });
            console.log(`[PayContracts] Contract ${id} closed on-chain`);
          } catch (onChainError) {
            console.error(`[PayContracts] Failed to close contract on-chain:`, onChainError);
          }
        }
      }

      // PROMPT-05: Notificar outra parte via BazChat
      const payNotification = getPayNotificationService();
      if (payNotification) {
        try {
          const contractWithProfiles = await prisma.payContract.findUnique({
            where: { id },
            include: {
              payer: { include: { profile: true } },
              receiver: { include: { profile: true } },
            },
          });
          if (contractWithProfiles) {
            await payNotification.notifyContractClosed(contractWithProfiles, authUser.sub, reason);
          }
        } catch (notifyErr) {
          console.error('[PayContracts] Failed to send close notification:', notifyErr);
        }
      }

      return reply.send({ success: true, status: 'CLOSED' });
    }
  );

  // ============================================================================
  // GET /api/pay/contracts/:id/history - Histórico de mudanças
  // ============================================================================
  fastify.get<{ Params: { id: string } }>(
    '/contracts/:id/history',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { id } = request.params;

      // Buscar seller profiles
      const sellerProfiles = await prisma.sellerProfile.findMany({
        where: { userId: authUser.sub },
        select: { id: true },
      });
      const sellerProfileIds = sellerProfiles.map((sp) => sp.id);

      const contract = await prisma.payContract.findUnique({
        where: { id },
        select: { payerId: true, payerCompanyId: true, receiverId: true },
      });

      if (!contract) {
        return reply.status(404).send({ error: 'Contrato não encontrado' });
      }

      // Verificar acesso
      const isPayer =
        contract.payerId === authUser.sub ||
        sellerProfileIds.includes(contract.payerCompanyId || '');
      const isReceiver = contract.receiverId === authUser.sub;

      if (!isPayer && !isReceiver) {
        return reply.status(403).send({ error: 'Acesso negado' });
      }

      const history = await prisma.payContractStatusHistory.findMany({
        where: { contractId: id },
        include: {
          changedBy: {
            include: { profile: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({
        history: history.map((h) => ({
          id: h.id,
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          reason: h.reason,
          changedBy: {
            id: h.changedById,
            displayName: h.changedBy.profile?.displayName || 'Usuário',
            avatarUrl: h.changedBy.profile?.avatarUrl || null,
          },
          createdAt: h.createdAt.toISOString(),
        })),
      });
    }
  );
}
