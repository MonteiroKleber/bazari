# FASE 4: API de Delivery Profile - Bazari Delivery Network

**Objetivo:** Criar endpoints para gerenciamento de perfil de entregador

**Duração Estimada:** 1-2 horas

**Pré-requisito:** FASE 3 concluída

---

## TAREFA ÚNICA

### Criar Arquivo de Rotas de Delivery Profile

**Arquivo:** `apps/api/src/routes/delivery-profile.ts`

```typescript
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

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

export async function deliveryProfileRoutes(
  app: FastifyInstance,
  options: FastifyPluginOptions & { prisma: PrismaClient }
) {
  const { prisma } = options;

  /**
   * POST /delivery/profile - Criar perfil de entregador
   */
  app.post('/delivery/profile', async (request, reply) => {
    try {
      const currentProfileId = 'profile-placeholder'; // TODO: JWT
      const body = createProfileSchema.parse(request.body);

      // Verificar se já existe
      const existing = await prisma.deliveryProfile.findUnique({
        where: { profileId: currentProfileId },
      });

      if (existing) {
        return reply.status(409).send({
          error: 'Perfil já existe',
          message: 'Use PUT para atualizar',
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
      return reply.status(500).send({
        error: 'Erro ao criar perfil',
      });
    }
  });

  /**
   * PUT /delivery/profile - Atualizar perfil
   */
  app.put('/delivery/profile', async (request, reply) => {
    try {
      const currentProfileId = 'profile-placeholder';
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
  app.get('/delivery/profile', async (request, reply) => {
    try {
      const currentProfileId = 'profile-placeholder';

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
  app.patch('/delivery/profile/availability', async (request, reply) => {
    try {
      const currentProfileId = 'profile-placeholder';
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
  app.get('/delivery/profile/stats', async (request, reply) => {
    try {
      const currentProfileId = 'profile-placeholder';

      const profile = await prisma.deliveryProfile.findUnique({
        where: { profileId: currentProfileId },
      });

      if (!profile) {
        return reply.status(404).send({
          error: 'Perfil não encontrado',
        });
      }

      // TODO: Calcular rankings
      const rankings = {
        city: null,
        overall: null,
      };

      return reply.send({
        totalDeliveries: profile.totalDeliveries,
        completedDeliveries: profile.completedDeliveries,
        cancelledDeliveries: profile.cancelledDeliveries,
        avgRating: profile.avgRating,
        totalRatings: profile.totalRatings,
        onTimeRate: profile.onTimeRate,
        acceptanceRate: profile.acceptanceRate,
        completionRate: profile.completionRate,
        avgDeliveryTime: profile.avgDeliveryTime,
        fastestDelivery: profile.fastestDelivery,
        totalDistance: profile.totalDistance,
        totalEarnings: profile.totalEarnings.toString(),
        pendingEarnings: profile.pendingEarnings.toString(),
        rankings,
      });
    } catch (err) {
      app.log.error({ err }, 'Erro ao buscar estatísticas');
      return reply.status(500).send({
        error: 'Erro ao buscar estatísticas',
      });
    }
  });
}
```

---

## VALIDAÇÃO

```bash
# Criar perfil
curl -X POST http://localhost:3000/api/delivery/profile \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "João da Moto",
    "documentType": "cpf",
    "documentNumber": "12345678900",
    "phoneNumber": "+5521999999999",
    "vehicleType": "motorcycle",
    "maxWeight": 10,
    "maxVolume": 0.5,
    "serviceRadius": 15,
    "serviceCities": ["Rio de Janeiro"]
  }'

# Atualizar disponibilidade
curl -X PATCH http://localhost:3000/api/delivery/profile/availability \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isAvailable": true,
    "isOnline": true,
    "currentLat": -22.9068,
    "currentLng": -43.1729
  }'

# Obter estatísticas
curl http://localhost:3000/api/delivery/profile/stats \
  -H "Authorization: Bearer TOKEN"
```

**Checklist:**

- [ ] POST /delivery/profile cria perfil
- [ ] PUT /delivery/profile atualiza
- [ ] GET /delivery/profile retorna dados
- [ ] PATCH /delivery/profile/availability funciona
- [ ] GET /delivery/profile/stats retorna métricas
- [ ] Validação de documentNumber único funciona

---

**PRÓXIMA FASE:** [FASE 5 - Store Delivery Partners API](FASE5_DELIVERY_PARTNERS_API.md)
