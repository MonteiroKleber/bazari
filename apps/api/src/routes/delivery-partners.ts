import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../lib/auth/middleware.js';
import type { AccessTokenPayload } from '../lib/auth/jwt.js';

const requestPartnershipSchema = z.object({
  message: z.string().max(500).optional(),
});

const updatePartnershipSchema = z.object({
  status: z.enum(['active', 'paused', 'suspended', 'rejected']),
  priority: z.number().int().positive().optional(),
  commissionPercent: z.number().int().min(0).max(100).optional(),
  bonusPerDelivery: z.string().optional(),
  maxDailyDeliveries: z.number().int().positive().optional(),
  allowedDays: z.array(z.string()).optional(),
  workingHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  workingHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  notes: z.string().max(1000).optional(),
  rejectionReason: z.string().max(500).optional(),
});

export async function deliveryPartnerRoutes(
  app: FastifyInstance,
  options: FastifyPluginOptions & { prisma: PrismaClient }
) {
  const { prisma } = options;

  // Helper para pegar profileId do usuário autenticado
  async function getAuthProfileId(request: any): Promise<string> {
    const authUser = request.authUser as AccessTokenPayload | undefined;
    if (!authUser) {
      throw new Error('Usuário não autenticado');
    }

    // Buscar Profile do usuário
    const profile = await prisma.profile.findUnique({
      where: { userId: authUser.sub },
      select: { id: true },
    });

    if (!profile) {
      throw new Error('Perfil de usuário não encontrado');
    }

    return profile.id;
  }

  // Helper para pegar userId do usuário autenticado
  function getAuthUserId(request: any): string {
    const authUser = request.authUser as AccessTokenPayload | undefined;
    if (!authUser) {
      throw new Error('Usuário não autenticado');
    }
    return authUser.sub;
  }

  /**
   * GET /delivery/partners - Listar parceiros da loja do usuário autenticado
   */
  app.get(
    '/delivery/partners',
    { preHandler: authOnRequest },
    async (request, reply) => {
      try {
        const currentUserId = getAuthUserId(request);
        const query = request.query as any;

        // Buscar loja do usuário
        const store = await prisma.sellerProfile.findFirst({
          where: { userId: currentUserId },
          select: { onChainStoreId: true },
        });

        if (!store || !store.onChainStoreId) {
          return reply.status(404).send({
            error: 'Loja não encontrada',
            message: 'Você precisa ter uma loja cadastrada para ver parceiros',
          });
        }

        const statusFilter = query.status || 'all';

        const where: any = {
          storeId: store.onChainStoreId,
        };

        if (statusFilter !== 'all') {
          where.status = statusFilter;
        }

        const partners = await prisma.storeDeliveryPartner.findMany({
          where,
          orderBy: { priority: 'asc' },
          include: {
            deliveryPerson: {
              include: {
                deliveryProfile: {
                  select: {
                    fullName: true,
                    phoneNumber: true,
                    vehicleType: true,
                    avgRating: true,
                    totalDeliveries: true,
                    onTimeRate: true,
                    serviceRadius: true,
                  },
                },
              },
            },
          },
        });

        const data = partners.map((p) => ({
          id: p.id,
          storeId: store.onChainStoreId?.toString() || '',
          deliveryProfileId: p.deliveryPersonId,
          priority: p.priority,
          isActive: p.status === 'active',

          // Populated deliverer info matching frontend type
          deliveryProfile: {
            fullName: p.deliveryPerson.deliveryProfile?.fullName || p.deliveryPerson.displayName || 'Nome não disponível',
            phone: p.deliveryPerson.deliveryProfile?.phoneNumber || '',
            vehicleType: p.deliveryPerson.deliveryProfile?.vehicleType || 'bike',
            radiusKm: p.deliveryPerson.deliveryProfile?.serviceRadius || 0,
            profilePhoto: p.deliveryPerson.avatarUrl,
          },

          // Stats
          stats: {
            totalDeliveries: p.totalDeliveries,
            completionRate: p.completedDeliveries > 0 ? (p.completedDeliveries / p.totalDeliveries) * 100 : 0,
            averageRating: p.avgRating,
            onTimeRate: p.onTimeRate,
          },

          // Additional fields
          status: p.status,
          commissionPercent: p.commissionPercent,
          bonusPerDelivery: p.bonusPerDelivery?.toString(),
          avgDeliveryTime: p.avgDeliveryTime,
          requestedAt: p.requestedAt?.toString(),
          approvedAt: p.approvedAt?.toString(),
          createdAt: p.createdAt.toString(),
        }));

        return reply.send(data);
      } catch (err) {
        app.log.error({ err }, 'Erro ao listar parceiros da loja autenticada');
        return reply.status(500).send({
          error: 'Erro ao listar parceiros',
        });
      }
    }
  );

  /**
   * GET /stores/:storeId/delivery-partners - Listar parceiros da loja
   */
  app.get<{ Params: { storeId: string } }>(
    '/stores/:storeId/delivery-partners',
    async (request, reply) => {
      try {
        const { storeId } = request.params;
        const query = request.query as any;

        const statusFilter = query.status || 'active';

        const where: any = {
          storeId: BigInt(storeId),
        };

        if (statusFilter !== 'all') {
          where.status = statusFilter;
        }

        const partners = await prisma.storeDeliveryPartner.findMany({
          where,
          orderBy: { priority: 'asc' },
          include: {
            deliveryPerson: {
              include: {
                deliveryProfile: {
                  select: {
                    vehicleType: true,
                    avgRating: true,
                    totalDeliveries: true,
                    onTimeRate: true,
                  },
                },
              },
            },
          },
        });

        const data = partners.map((p) => ({
          id: p.id,
          deliveryPersonId: p.deliveryPersonId,
          deliveryPerson: {
            displayName: p.deliveryPerson.displayName,
            handle: p.deliveryPerson.handle,
            avatarUrl: p.deliveryPerson.avatarUrl,
            vehicleType: p.deliveryPerson.deliveryProfile?.vehicleType,
          },
          status: p.status,
          priority: p.priority,
          commissionPercent: p.commissionPercent,
          bonusPerDelivery: p.bonusPerDelivery?.toString(),
          totalDeliveries: p.totalDeliveries,
          completedDeliveries: p.completedDeliveries,
          avgRating: p.avgRating,
          avgDeliveryTime: p.avgDeliveryTime,
          onTimeRate: p.onTimeRate,
          requestedAt: p.requestedAt?.toString(),
          approvedAt: p.approvedAt?.toString(),
          createdAt: p.createdAt.toString(),
        }));

        return reply.send({ data });
      } catch (err) {
        app.log.error({ err }, 'Erro ao listar parceiros');
        return reply.status(500).send({
          error: 'Erro ao listar parceiros',
        });
      }
    }
  );

  /**
   * POST /stores/:storeId/delivery-partners/request - Solicitar vínculo
   */
  app.post<{ Params: { storeId: string } }>(
    '/stores/:storeId/delivery-partners/request',
    { preHandler: authOnRequest },
    async (request, reply) => {
      try {
        const { storeId } = request.params;
        const currentProfileId = await getAuthProfileId(request);
        const body = requestPartnershipSchema.parse(request.body);

        // Verificar se perfil de entregador existe
        const deliveryProfile = await prisma.deliveryProfile.findUnique({
          where: { profileId: currentProfileId },
        });

        if (!deliveryProfile) {
          return reply.status(403).send({
            error: 'Perfil de entregador não encontrado',
            message:
              'Você precisa criar um perfil de entregador antes de solicitar parceria',
          });
        }

        // Verificar se loja existe
        const store = await prisma.sellerProfile.findFirst({
          where: { onChainStoreId: BigInt(storeId) },
        });

        if (!store) {
          return reply.status(404).send({
            error: 'Loja não encontrada',
          });
        }

        // Verificar se já existe solicitação/parceria
        const existing = await prisma.storeDeliveryPartner.findUnique({
          where: {
            storeId_deliveryPersonId: {
              storeId: BigInt(storeId),
              deliveryPersonId: currentProfileId,
            },
          },
        });

        if (existing) {
          return reply.status(409).send({
            error: 'Parceria já existe',
            message: `Status atual: ${existing.status}`,
          });
        }

        // Criar solicitação
        const partnership = await prisma.storeDeliveryPartner.create({
          data: {
            storeId: BigInt(storeId),
            deliveryPersonId: currentProfileId,
            status: 'pending',
            notes: body.message,
            requestedAt: BigInt(Date.now()),
            createdAt: BigInt(Date.now()),
            updatedAt: BigInt(Date.now()),
          },
        });

        app.log.info(
          {
            storeId,
            deliveryPersonId: currentProfileId,
          },
          'Solicitação de parceria criada'
        );

        // TODO: Notificar dono da loja

        return reply.status(201).send({
          id: partnership.id,
          storeId: storeId,
          deliveryPersonId: partnership.deliveryPersonId,
          status: partnership.status,
          requestedAt: partnership.requestedAt?.toString(),
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Dados inválidos',
            details: err.errors,
          });
        }

        app.log.error({ err }, 'Erro ao solicitar parceria');
        return reply.status(500).send({
          error: 'Erro ao solicitar parceria',
        });
      }
    }
  );

  /**
   * PATCH /stores/:storeId/delivery-partners/:partnerId - Atualizar parceria
   */
  app.patch<{ Params: { storeId: string; partnerId: string } }>(
    '/stores/:storeId/delivery-partners/:partnerId',
    { preHandler: authOnRequest },
    async (request, reply) => {
      try {
        const { storeId, partnerId } = request.params;
        const currentUserId = getAuthUserId(request);
        const body = updatePartnershipSchema.parse(request.body);

        // Verificar se loja pertence ao usuário
        const store = await prisma.sellerProfile.findFirst({
          where: {
            onChainStoreId: BigInt(storeId),
            userId: currentUserId,
          },
        });

        if (!store) {
          return reply.status(403).send({
            error: 'Não autorizado',
            message: 'Você não é o dono desta loja',
          });
        }

        // Buscar parceria
        const existing = await prisma.storeDeliveryPartner.findUnique({
          where: { id: partnerId },
        });

        if (!existing) {
          return reply.status(404).send({
            error: 'Parceria não encontrada',
          });
        }

        if (existing.storeId !== BigInt(storeId)) {
          return reply.status(400).send({
            error: 'Parceria não pertence a esta loja',
          });
        }

        // Preparar dados de atualização
        const updateData: any = {
          ...body,
          updatedAt: BigInt(Date.now()),
        };

        // Adicionar timestamps baseado no status
        if (body.status === 'active' && existing.status !== 'active') {
          updateData.approvedAt = BigInt(Date.now());
        } else if (body.status === 'rejected') {
          updateData.rejectedAt = BigInt(Date.now());
        } else if (body.status === 'suspended') {
          updateData.suspendedAt = BigInt(Date.now());
        }

        // Atualizar
        const updated = await prisma.storeDeliveryPartner.update({
          where: { id: partnerId },
          data: updateData,
        });

        app.log.info(
          {
            partnerId,
            newStatus: body.status,
          },
          'Parceria atualizada'
        );

        // TODO: Notificar entregador

        return reply.send({
          id: updated.id,
          status: updated.status,
          priority: updated.priority,
          commissionPercent: updated.commissionPercent,
          approvedAt: updated.approvedAt?.toString(),
          rejectedAt: updated.rejectedAt?.toString(),
          suspendedAt: updated.suspendedAt?.toString(),
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Dados inválidos',
            details: err.errors,
          });
        }

        app.log.error({ err }, 'Erro ao atualizar parceria');
        return reply.status(500).send({
          error: 'Erro ao atualizar parceria',
        });
      }
    }
  );

  /**
   * DELETE /stores/:storeId/delivery-partners/:partnerId - Remover parceria
   */
  app.delete<{ Params: { storeId: string; partnerId: string } }>(
    '/stores/:storeId/delivery-partners/:partnerId',
    { preHandler: authOnRequest },
    async (request, reply) => {
      try {
        const { storeId, partnerId } = request.params;
        const currentUserId = getAuthUserId(request);

        // Verificar se loja pertence ao usuário
        const store = await prisma.sellerProfile.findFirst({
          where: {
            onChainStoreId: BigInt(storeId),
            userId: currentUserId,
          },
        });

        if (!store) {
          return reply.status(403).send({
            error: 'Não autorizado',
          });
        }

        // Verificar se parceria existe
        const existing = await prisma.storeDeliveryPartner.findUnique({
          where: { id: partnerId },
        });

        if (!existing || existing.storeId !== BigInt(storeId)) {
          return reply.status(404).send({
            error: 'Parceria não encontrada',
          });
        }

        // Deletar
        await prisma.storeDeliveryPartner.delete({
          where: { id: partnerId },
        });

        app.log.info({ partnerId }, 'Parceria removida');

        return reply.status(204).send();
      } catch (err) {
        app.log.error({ err }, 'Erro ao remover parceria');
        return reply.status(500).send({
          error: 'Erro ao remover parceria',
        });
      }
    }
  );
}
