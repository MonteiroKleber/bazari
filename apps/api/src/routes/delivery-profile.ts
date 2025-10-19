import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../lib/auth/middleware.js';
import type { AccessTokenPayload } from '../lib/auth/jwt.js';

const createProfileSchema = z.object({
  fullName: z.string().min(1).max(200),
  documentType: z.enum(['cpf', 'cnpj', 'passport']),
  documentNumber: z.string().min(1).max(50),
  phoneNumber: z.string().min(1).max(20),
  emergencyContact: z
    .object({
      name: z.string(),
      phone: z.string(),
      relationship: z.string(),
    })
    .optional(),
  vehicleType: z.enum(['bike', 'motorcycle', 'car', 'van', 'truck']),
  vehiclePlate: z.string().max(20).optional(),
  vehicleModel: z.string().max(100).optional(),
  vehicleYear: z.number().int().min(1900).max(2100).optional(),
  vehicleColor: z.string().max(50).optional(),
  maxWeight: z.number().positive(),
  maxVolume: z.number().positive(),
  canCarryFragile: z.boolean().default(false),
  canCarryPerishable: z.boolean().default(false),
  hasInsulatedBag: z.boolean().default(false),
  serviceRadius: z.number().positive().default(10),
  serviceCities: z.array(z.string()).default([]),
  serviceStates: z.array(z.string().length(2)).default([]),
  walletAddress: z.string().optional(),
});

const updateAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
  isOnline: z.boolean().optional(),
  currentLat: z.number().min(-90).max(90).optional(),
  currentLng: z.number().min(-180).max(180).optional(),
  currentAccuracy: z.number().positive().optional(),
});

const updateLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
});

export async function deliveryProfileRoutes(
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

  /**
   * POST /delivery/profile - Criar perfil de entregador
   */
  app.post('/delivery/profile', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const currentProfileId = await getAuthProfileId(request);
      const body = createProfileSchema.parse(request.body);

      // Verificar se já existe
      const existing = await prisma.deliveryProfile.findUnique({
        where: { profileId: currentProfileId },
      });

      if (existing) {
        // Se já existe, retornar o perfil existente (para desenvolvimento)
        // TODO: Em produção, deveria retornar 409
        app.log.info({ profileId: currentProfileId }, 'Perfil já existe, retornando existente');
        return reply.status(200).send({
          id: existing.id,
          profileId: existing.profileId,
          fullName: existing.fullName,
          vehicleType: existing.vehicleType,
          accountStatus: existing.accountStatus,
          isVerified: existing.isVerified,
          createdAt: existing.createdAt.toString(),
        });
      }

      // Verificar se documento já está em uso
      const existingDoc = await prisma.deliveryProfile.findUnique({
        where: { documentNumber: body.documentNumber },
      });

      if (existingDoc) {
        return reply.status(409).send({
          error: 'Documento já cadastrado',
          message: 'Este documento já está em uso por outro entregador',
        });
      }

      const profile = await prisma.deliveryProfile.create({
        data: {
          profileId: currentProfileId,
          ...body,
          createdAt: BigInt(Date.now()),
          updatedAt: BigInt(Date.now()),
        },
      });

      app.log.info({ profileId: currentProfileId }, 'Perfil de entregador criado');

      return reply.status(201).send({
        id: profile.id,
        profileId: profile.profileId,
        fullName: profile.fullName,
        vehicleType: profile.vehicleType,
        accountStatus: profile.accountStatus,
        isVerified: profile.isVerified,
        createdAt: profile.createdAt.toString(),
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: err.errors,
        });
      }

      app.log.error({ err }, 'Erro ao criar perfil de entregador');

      // Em desenvolvimento, retornar detalhes do erro
      if (process.env.NODE_ENV !== 'production') {
        return reply.status(500).send({
          error: 'Erro ao criar perfil',
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
      }

      return reply.status(500).send({
        error: 'Erro ao criar perfil',
      });
    }
  });

  /**
   * PUT /delivery/profile - Atualizar perfil
   */
  app.put('/delivery/profile', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const currentProfileId = await getAuthProfileId(request);
      const body = createProfileSchema.partial().parse(request.body);

      const existing = await prisma.deliveryProfile.findUnique({
        where: { profileId: currentProfileId },
      });

      if (!existing) {
        return reply.status(404).send({
          error: 'Perfil não encontrado',
          message: 'Use POST para criar',
        });
      }

      const updated = await prisma.deliveryProfile.update({
        where: { profileId: currentProfileId },
        data: {
          ...body,
          updatedAt: BigInt(Date.now()),
        },
      });

      return reply.send({
        id: updated.id,
        profileId: updated.profileId,
        fullName: updated.fullName,
        vehicleType: updated.vehicleType,
        updatedAt: updated.updatedAt.toString(),
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: err.errors,
        });
      }

      app.log.error({ err }, 'Erro ao atualizar perfil');
      return reply.status(500).send({
        error: 'Erro ao atualizar perfil',
      });
    }
  });

  /**
   * GET /delivery/profile - Obter perfil
   */
  app.get('/delivery/profile', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const currentProfileId = await getAuthProfileId(request);

      const profile = await prisma.deliveryProfile.findUnique({
        where: { profileId: currentProfileId },
      });

      if (!profile) {
        return reply.status(404).send({
          error: 'Perfil não encontrado',
        });
      }

      return reply.send({
        ...profile,
        totalEarnings: profile.totalEarnings.toString(),
        pendingEarnings: profile.pendingEarnings.toString(),
        minDeliveryFee: profile.minDeliveryFee?.toString(),
        bonusPerDelivery: null, // Não existe neste model
        createdAt: profile.createdAt.toString(),
        updatedAt: profile.updatedAt.toString(),
        lastActiveAt: profile.lastActiveAt?.toString(),
        verifiedAt: profile.verifiedAt?.toString(),
        lastLocationUpdate: profile.lastLocationUpdate?.toString(),
        backgroundCheckDate: profile.backgroundCheckDate?.toString(),
        suspendedUntil: profile.suspendedUntil?.toString(),
      });
    } catch (err) {
      app.log.error({ err }, 'Erro ao buscar perfil');
      return reply.status(500).send({
        error: 'Erro ao buscar perfil',
      });
    }
  });

  /**
   * PATCH /delivery/profile/availability - Atualizar disponibilidade
   */
  app.patch('/delivery/profile/availability', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const currentProfileId = await getAuthProfileId(request);
      const body = updateAvailabilitySchema.parse(request.body);

      const updated = await prisma.deliveryProfile.update({
        where: { profileId: currentProfileId },
        data: {
          isAvailable: body.isAvailable,
          isOnline: body.isOnline,
          currentLat: body.currentLat,
          currentLng: body.currentLng,
          currentAccuracy: body.currentAccuracy,
          lastLocationUpdate: body.currentLat ? BigInt(Date.now()) : undefined,
          lastActiveAt: BigInt(Date.now()),
          updatedAt: BigInt(Date.now()),
        },
      });

      return reply.send({
        success: true,
        isAvailable: updated.isAvailable,
        isOnline: updated.isOnline,
        lastLocationUpdate: updated.lastLocationUpdate?.toString(),
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: err.errors,
        });
      }

      app.log.error({ err }, 'Erro ao atualizar disponibilidade');
      return reply.status(500).send({
        error: 'Erro ao atualizar disponibilidade',
      });
    }
  });

  /**
   * GET /delivery/profile/stats - Obter estatísticas
   */
  app.get('/delivery/profile/stats', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const currentProfileId = await getAuthProfileId(request);

      const profile = await prisma.deliveryProfile.findUnique({
        where: { profileId: currentProfileId },
      });

      if (!profile) {
        return reply.status(404).send({
          error: 'Perfil não encontrado',
        });
      }

      // TODO: Calcular estatísticas diárias e semanais de forma real
      // Por enquanto, retornar valores mockados/zerados
      const todayDeliveries = 0;
      const todayEarnings = '0';
      const weeklyDeliveries = [
        { day: 'Dom', count: 0 },
        { day: 'Seg', count: 0 },
        { day: 'Ter', count: 0 },
        { day: 'Qua', count: 0 },
        { day: 'Qui', count: 0 },
        { day: 'Sex', count: 0 },
        { day: 'Sáb', count: 0 },
      ];
      const weeklyKm = 0;
      const weeklyEarnings = '0';

      return reply.send({
        todayDeliveries,
        todayEarnings,
        completionRate: profile.completionRate,
        totalCompleted: profile.completedDeliveries,
        totalDeliveries: profile.totalDeliveries,
        averageRating: profile.avgRating,
        totalRatings: profile.totalRatings,
        weeklyDeliveries,
        weeklyKm,
        weeklyEarnings,
      });
    } catch (err) {
      app.log.error({ err }, 'Erro ao buscar estatísticas');
      return reply.status(500).send({
        error: 'Erro ao buscar estatísticas',
      });
    }
  });

  /**
   * PUT /delivery/profile/location - Atualizar localização atual do entregador
   */
  app.put(
    '/delivery/profile/location',
    { preHandler: authOnRequest },
    async (request, reply) => {
      try {
        const profileId = await getAuthProfileId(request);
        const body = updateLocationSchema.parse(request.body);

        // Verificar se perfil de entregador existe
        const profile = await prisma.deliveryProfile.findUnique({
          where: { profileId },
        });

        if (!profile) {
          return reply.status(404).send({
            error: 'Perfil de entregador não encontrado',
          });
        }

        // Atualizar localização
        const updated = await prisma.deliveryProfile.update({
          where: { profileId },
          data: {
            currentLat: body.lat,
            currentLng: body.lng,
            currentAccuracy: body.accuracy || null,
            lastLocationUpdate: BigInt(Date.now()),
          },
          select: {
            currentLat: true,
            currentLng: true,
            currentAccuracy: true,
            lastLocationUpdate: true,
          },
        });

        app.log.info(
          {
            profileId,
            lat: body.lat,
            lng: body.lng,
            accuracy: body.accuracy,
          },
          'Localização do entregador atualizada'
        );

        return reply.send({
          success: true,
          location: {
            lat: updated.currentLat,
            lng: updated.currentLng,
            accuracy: updated.currentAccuracy,
            updatedAt: updated.lastLocationUpdate?.toString(),
          },
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Dados inválidos',
            details: err.errors,
          });
        }

        app.log.error({ err }, 'Erro ao atualizar localização');
        return reply.status(500).send({
          error: 'Erro ao atualizar localização',
        });
      }
    }
  );
}
