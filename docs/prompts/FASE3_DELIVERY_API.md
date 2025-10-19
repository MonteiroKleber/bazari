# FASE 3: API de Delivery - Rotas e Endpoints - Bazari Delivery Network

**Objetivo:** Criar todas as rotas e endpoints da API de delivery

**Duração Estimada:** 3-4 horas

**Pré-requisito:** FASE 1 e FASE 2 concluídas com sucesso

---

## TAREFAS

### 1. Criar Arquivo de Rotas Principais

**Arquivo:** `apps/api/src/routes/delivery.ts`

```typescript
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import {
  calculateDeliveryFee,
  estimatePackageDetails,
} from '../lib/deliveryCalculator.js';
import { addressSchema } from '../lib/addressValidator.js';
import { calculateDistance } from '../lib/geoUtils.js';
import {
  DeliveryRequestStatus,
  PackageType,
} from '../types/delivery.types.js';

// ===========================
// SCHEMAS DE VALIDAÇÃO
// ===========================

const calculateFeeSchema = z.object({
  pickupAddress: addressSchema,
  deliveryAddress: addressSchema,
  packageType: z.enum([
    'envelope',
    'small_box',
    'medium_box',
    'large_box',
    'fragile',
    'perishable',
    'custom',
  ]),
  weight: z.number().min(0).max(100).optional(),
  dimensions: z
    .object({
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .optional(),
});

const createDirectDeliverySchema = z.object({
  pickupAddress: addressSchema,
  deliveryAddress: addressSchema,
  recipientId: z.string().uuid(),
  packageType: z.enum([
    'envelope',
    'small_box',
    'medium_box',
    'large_box',
    'fragile',
    'perishable',
    'custom',
  ]),
  weight: z.number().min(0).max(100).optional(),
  dimensions: z
    .object({
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .optional(),
  notes: z.string().max(1000).optional(),
  requiresSignature: z.boolean().default(true),
});

// ===========================
// ROTAS
// ===========================

export async function deliveryRoutes(
  app: FastifyInstance,
  options: FastifyPluginOptions & { prisma: PrismaClient }
) {
  const { prisma } = options;

  /**
   * POST /delivery/calculate-fee - Calcular valor de entrega
   */
  app.post('/delivery/calculate-fee', async (request, reply) => {
    try {
      const body = calculateFeeSchema.parse(request.body);

      const result = await calculateDeliveryFee({
        pickupAddress: body.pickupAddress,
        deliveryAddress: body.deliveryAddress,
        packageType: body.packageType,
        weight: body.weight,
        dimensions: body.dimensions,
      });

      return reply.send(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: err.errors,
        });
      }

      app.log.error({ err }, 'Erro ao calcular frete');
      return reply.status(500).send({
        error: 'Erro ao calcular frete',
        message: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    }
  });

  /**
   * POST /delivery/requests/direct - Criar solicitação direta de entrega
   */
  app.post('/delivery/requests/direct', async (request, reply) => {
    try {
      // TODO: Obter user do token JWT
      const currentUserId = 'user-placeholder'; // MOCK

      const body = createDirectDeliverySchema.parse(request.body);

      // Calcular frete
      const feeResult = await calculateDeliveryFee({
        pickupAddress: body.pickupAddress,
        deliveryAddress: body.deliveryAddress,
        packageType: body.packageType,
        weight: body.weight,
        dimensions: body.dimensions,
      });

      // Criar DeliveryRequest
      const deliveryRequest = await prisma.deliveryRequest.create({
        data: {
          sourceType: 'direct',
          orderId: null,
          senderId: currentUserId,
          senderType: 'profile',
          recipientId: body.recipientId,
          pickupAddress: body.pickupAddress,
          deliveryAddress: body.deliveryAddress,
          packageType: body.packageType,
          weight: body.weight ?? null,
          dimensions: body.dimensions ?? null,
          notes: body.notes ?? null,
          requiresSignature: body.requiresSignature,
          deliveryFeeBzr: feeResult.totalBzr,
          distance: feeResult.distance,
          status: DeliveryRequestStatus.PENDING,
          isPrivateNetwork: false, // Direto sempre vai para rede aberta
          preferredDeliverers: [],
          notifiedDeliverers: [],
          createdAt: BigInt(Date.now()),
          updatedAt: BigInt(Date.now()),
        },
      });

      // TODO: Notificar rede de entregadores
      // await notifyDeliveryNetwork(deliveryRequest.id);

      return reply.status(201).send({
        deliveryRequestId: deliveryRequest.id,
        estimatedFee: feeResult.totalBzr,
        estimatedDistance: feeResult.distance,
        estimatedTimeMinutes: feeResult.estimatedTimeMinutes,
        status: deliveryRequest.status,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Dados inválidos',
          details: err.errors,
        });
      }

      app.log.error({ err }, 'Erro ao criar solicitação de entrega');
      return reply.status(500).send({
        error: 'Erro ao criar solicitação',
        message: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    }
  });

  /**
   * GET /delivery/requests - Listar demandas disponíveis (para entregadores)
   */
  app.get('/delivery/requests', async (request, reply) => {
    try {
      // TODO: Obter profileId do token JWT
      const currentProfileId = 'profile-placeholder'; // MOCK

      const query = request.query as any;

      const page = parseInt(query.page) || 1;
      const limit = Math.min(parseInt(query.limit) || 20, 100);
      const skip = (page - 1) * limit;

      const status = query.status || DeliveryRequestStatus.PENDING;
      const forMe = query.forMe === 'true';
      const radius = parseFloat(query.radius) || 10;
      const lat = parseFloat(query.lat);
      const lng = parseFloat(query.lng);

      // Filtros básicos
      const where: any = {
        status,
      };

      // Se forMe=true, apenas demandas priorizadas para mim
      if (forMe) {
        where.preferredDeliverers = {
          has: currentProfileId,
        };
      } else {
        // Se não é "forMe", excluir privadas que não me incluem
        where.OR = [
          { isPrivateNetwork: false },
          {
            AND: [
              { isPrivateNetwork: true },
              { preferredDeliverers: { has: currentProfileId } },
            ],
          },
        ];
      }

      // Buscar requests
      const [requests, total] = await Promise.all([
        prisma.deliveryRequest.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            sourceType: true,
            orderId: true,
            pickupAddress: true,
            deliveryAddress: true,
            packageType: true,
            weight: true,
            deliveryFeeBzr: true,
            distance: true,
            status: true,
            preferredDeliverers: true,
            expiresAt: true,
            createdAt: true,
          },
        }),
        prisma.deliveryRequest.count({ where }),
      ]);

      // Enriquecer com dados de prioridade e filtrar por distância se fornecido
      const enrichedRequests = requests
        .map((req) => {
          const isPriority = req.preferredDeliverers.includes(currentProfileId);

          // Filtrar por raio se lat/lng fornecidos
          if (!isNaN(lat) && !isNaN(lng) && req.pickupAddress) {
            const pickupAddr = req.pickupAddress as any;
            if (pickupAddr.lat && pickupAddr.lng) {
              const distanceToPickup = calculateDistance(
                lat,
                lng,
                pickupAddr.lat,
                pickupAddr.lng
              );
              if (distanceToPickup > radius) {
                return null; // Fora do raio
              }
            }
          }

          return {
            ...req,
            deliveryFeeBzr: req.deliveryFeeBzr.toString(),
            isPriority,
          };
        })
        .filter((r) => r !== null);

      return reply.send({
        data: enrichedRequests,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      app.log.error({ err }, 'Erro ao listar demandas de entrega');
      return reply.status(500).send({
        error: 'Erro ao listar demandas',
        message: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    }
  });

  /**
   * GET /delivery/requests/:id - Obter detalhes de uma demanda
   */
  app.get<{ Params: { id: string } }>(
    '/delivery/requests/:id',
    async (request, reply) => {
      try {
        const { id } = request.params;

        const deliveryRequest = await prisma.deliveryRequest.findUnique({
          where: { id },
        });

        if (!deliveryRequest) {
          return reply.status(404).send({
            error: 'Demanda não encontrada',
          });
        }

        return reply.send({
          ...deliveryRequest,
          deliveryFeeBzr: deliveryRequest.deliveryFeeBzr.toString(),
        });
      } catch (err) {
        app.log.error({ err }, 'Erro ao buscar demanda');
        return reply.status(500).send({
          error: 'Erro ao buscar demanda',
        });
      }
    }
  );

  /**
   * POST /delivery/requests/:id/accept - Aceitar entrega
   */
  app.post<{ Params: { id: string } }>(
    '/delivery/requests/:id/accept',
    async (request, reply) => {
      try {
        const { id } = request.params;
        // TODO: Obter profileId do token JWT
        const currentProfileId = 'profile-placeholder'; // MOCK

        // Verificar se DeliveryProfile existe
        const deliveryProfile = await prisma.deliveryProfile.findUnique({
          where: { profileId: currentProfileId },
        });

        if (!deliveryProfile) {
          return reply.status(403).send({
            error: 'Perfil de entregador não encontrado',
            message:
              'Você precisa criar um perfil de entregador antes de aceitar entregas',
          });
        }

        if (!deliveryProfile.isAvailable) {
          return reply.status(403).send({
            error: 'Entregador indisponível',
            message: 'Você precisa estar disponível para aceitar entregas',
          });
        }

        // Buscar DeliveryRequest
        const deliveryRequest = await prisma.deliveryRequest.findUnique({
          where: { id },
        });

        if (!deliveryRequest) {
          return reply.status(404).send({
            error: 'Demanda não encontrada',
          });
        }

        // Verificar se já foi aceita (race condition)
        if (deliveryRequest.deliveryPersonId) {
          return reply.status(400).send({
            error: 'Demanda já aceita',
            message: 'Esta entrega já foi aceita por outro entregador',
          });
        }

        // Verificar status
        if (deliveryRequest.status !== DeliveryRequestStatus.PENDING) {
          return reply.status(400).send({
            error: 'Status inválido',
            message: `Esta entrega não pode ser aceita (status atual: ${deliveryRequest.status})`,
          });
        }

        // Verificar se é rede privada e user está autorizado
        if (
          deliveryRequest.isPrivateNetwork &&
          !deliveryRequest.preferredDeliverers.includes(currentProfileId)
        ) {
          return reply.status(403).send({
            error: 'Não autorizado',
            message: 'Você não está na lista de entregadores autorizados',
          });
        }

        // Atualizar DeliveryRequest
        const updated = await prisma.deliveryRequest.update({
          where: { id },
          data: {
            deliveryPersonId: currentProfileId,
            status: DeliveryRequestStatus.ACCEPTED,
            acceptedAt: BigInt(Date.now()),
            updatedAt: BigInt(Date.now()),
          },
        });

        // TODO: Criar escrow
        // TODO: Criar thread no BazChat
        // TODO: Enviar notificações

        app.log.info(
          {
            deliveryRequestId: id,
            deliveryPersonId: currentProfileId,
          },
          'Entrega aceita'
        );

        return reply.send({
          success: true,
          deliveryRequest: {
            id: updated.id,
            status: updated.status,
            deliveryPersonId: updated.deliveryPersonId,
            acceptedAt: updated.acceptedAt?.toString(),
          },
          actions: {
            nextStep: 'pickup',
            pickupAddress: updated.pickupAddress,
          },
        });
      } catch (err) {
        app.log.error({ err }, 'Erro ao aceitar entrega');
        return reply.status(500).send({
          error: 'Erro ao aceitar entrega',
          message: err instanceof Error ? err.message : 'Erro desconhecido',
        });
      }
    }
  );

  /**
   * POST /delivery/requests/:id/pickup - Confirmar coleta
   */
  app.post<{ Params: { id: string } }>(
    '/delivery/requests/:id/pickup',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const currentProfileId = 'profile-placeholder'; // MOCK

        const body = z
          .object({
            lat: z.number().min(-90).max(90),
            lng: z.number().min(-180).max(180),
            notes: z.string().max(500).optional(),
            photo: z.string().optional(), // base64 ou URL (futuro)
          })
          .parse(request.body);

        const deliveryRequest = await prisma.deliveryRequest.findUnique({
          where: { id },
          include: { order: true },
        });

        if (!deliveryRequest) {
          return reply.status(404).send({ error: 'Demanda não encontrada' });
        }

        // Verificar se é o entregador responsável
        if (deliveryRequest.deliveryPersonId !== currentProfileId) {
          return reply.status(403).send({
            error: 'Não autorizado',
            message: 'Você não é o entregador desta demanda',
          });
        }

        // Verificar status
        if (deliveryRequest.status !== DeliveryRequestStatus.ACCEPTED) {
          return reply.status(400).send({
            error: 'Status inválido',
            message: `Coleta não pode ser confirmada (status atual: ${deliveryRequest.status})`,
          });
        }

        // Atualizar DeliveryRequest
        const updated = await prisma.deliveryRequest.update({
          where: { id },
          data: {
            status: DeliveryRequestStatus.IN_TRANSIT,
            pickedUpAt: BigInt(Date.now()),
            inTransitAt: BigInt(Date.now()),
            updatedAt: BigInt(Date.now()),
          },
        });

        // Se for entrega de order, atualizar Order.status
        if (deliveryRequest.orderId) {
          await prisma.order.update({
            where: { id: deliveryRequest.orderId },
            data: { status: 'SHIPPED' },
          });
        }

        // TODO: Enviar notificação para destinatário

        app.log.info(
          {
            deliveryRequestId: id,
            lat: body.lat,
            lng: body.lng,
          },
          'Coleta confirmada'
        );

        return reply.send({
          success: true,
          deliveryRequest: {
            id: updated.id,
            status: updated.status,
            pickedUpAt: updated.pickedUpAt?.toString(),
          },
          order: deliveryRequest.orderId
            ? {
                id: deliveryRequest.orderId,
                status: 'SHIPPED',
              }
            : null,
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Dados inválidos',
            details: err.errors,
          });
        }

        app.log.error({ err }, 'Erro ao confirmar coleta');
        return reply.status(500).send({
          error: 'Erro ao confirmar coleta',
        });
      }
    }
  );

  /**
   * POST /delivery/requests/:id/deliver - Confirmar entrega
   */
  app.post<{ Params: { id: string } }>(
    '/delivery/requests/:id/deliver',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const currentProfileId = 'profile-placeholder'; // MOCK

        const body = z
          .object({
            lat: z.number().min(-90).max(90),
            lng: z.number().min(-180).max(180),
            signature: z.string().optional(), // base64
            photo: z.string().optional(), // base64
            notes: z.string().max(500).optional(),
            recipientName: z.string().max(100).optional(),
          })
          .parse(request.body);

        const deliveryRequest = await prisma.deliveryRequest.findUnique({
          where: { id },
        });

        if (!deliveryRequest) {
          return reply.status(404).send({ error: 'Demanda não encontrada' });
        }

        if (deliveryRequest.deliveryPersonId !== currentProfileId) {
          return reply.status(403).send({ error: 'Não autorizado' });
        }

        if (deliveryRequest.status !== DeliveryRequestStatus.IN_TRANSIT) {
          return reply.status(400).send({
            error: 'Status inválido',
            message: `Entrega não pode ser confirmada (status: ${deliveryRequest.status})`,
          });
        }

        // Calcular tempo de entrega
        const deliveryTimeMinutes = deliveryRequest.acceptedAt
          ? Number((BigInt(Date.now()) - deliveryRequest.acceptedAt) / 60000n)
          : null;

        // Atualizar DeliveryRequest
        const updated = await prisma.deliveryRequest.update({
          where: { id },
          data: {
            status: DeliveryRequestStatus.DELIVERED,
            deliveredAt: BigInt(Date.now()),
            completedAt: BigInt(Date.now()),
            updatedAt: BigInt(Date.now()),
            proofOfDelivery: {
              signature: body.signature ?? null,
              photo: body.photo ?? null,
              recipientName: body.recipientName ?? null,
              timestamp: Date.now(),
              lat: body.lat,
              lng: body.lng,
              notes: body.notes,
            },
          },
        });

        // TODO: Liberar escrow
        // TODO: Atualizar métricas do entregador
        // TODO: Atualizar Order.status se aplicável

        app.log.info(
          {
            deliveryRequestId: id,
            deliveryTimeMinutes,
          },
          'Entrega concluída'
        );

        return reply.send({
          success: true,
          deliveryRequest: {
            id: updated.id,
            status: updated.status,
            deliveredAt: updated.deliveredAt?.toString(),
            proofOfDelivery: updated.proofOfDelivery,
          },
          payment: {
            status: 'released',
            amountBzr: updated.deliveryFeeBzr.toString(),
          },
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Dados inválidos',
            details: err.errors,
          });
        }

        app.log.error({ err }, 'Erro ao confirmar entrega');
        return reply.status(500).send({
          error: 'Erro ao confirmar entrega',
        });
      }
    }
  );

  /**
   * POST /delivery/requests/:id/cancel - Cancelar entrega
   */
  app.post<{ Params: { id: string } }>(
    '/delivery/requests/:id/cancel',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const currentProfileId = 'profile-placeholder'; // MOCK

        const body = z
          .object({
            reason: z.enum([
              'vehicle_breakdown',
              'traffic',
              'weather',
              'personal',
              'other',
            ]),
            notes: z.string().max(500).optional(),
          })
          .parse(request.body);

        const deliveryRequest = await prisma.deliveryRequest.findUnique({
          where: { id },
        });

        if (!deliveryRequest) {
          return reply.status(404).send({ error: 'Demanda não encontrada' });
        }

        // Verificar se user pode cancelar (entregador, sender ou recipient)
        const canCancel =
          deliveryRequest.deliveryPersonId === currentProfileId ||
          deliveryRequest.senderId === currentProfileId ||
          deliveryRequest.recipientId === currentProfileId;

        if (!canCancel) {
          return reply.status(403).send({
            error: 'Não autorizado',
            message: 'Você não pode cancelar esta entrega',
          });
        }

        // Não pode cancelar se já entregue
        if (deliveryRequest.status === DeliveryRequestStatus.DELIVERED) {
          return reply.status(400).send({
            error: 'Entrega já concluída',
            message: 'Não é possível cancelar uma entrega já concluída',
          });
        }

        // Atualizar status
        const updated = await prisma.deliveryRequest.update({
          where: { id },
          data: {
            status: DeliveryRequestStatus.CANCELLED,
            cancelledAt: BigInt(Date.now()),
            updatedAt: BigInt(Date.now()),
            metadata: {
              ...((deliveryRequest.metadata as any) ?? {}),
              cancellation: {
                reason: body.reason,
                notes: body.notes,
                cancelledBy: currentProfileId,
                cancelledAt: Date.now(),
              },
            },
          },
        });

        // TODO: Refund do escrow
        // TODO: Penalizar entregador se cancelou após aceitar
        // TODO: Reabrir demanda se aplicável

        app.log.info(
          {
            deliveryRequestId: id,
            reason: body.reason,
          },
          'Entrega cancelada'
        );

        return reply.send({
          success: true,
          deliveryRequest: {
            id: updated.id,
            status: updated.status,
            cancelledAt: updated.cancelledAt?.toString(),
          },
          refund: {
            status: 'processing',
            message: 'Valor será devolvido em até 24h',
          },
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Dados inválidos',
            details: err.errors,
          });
        }

        app.log.error({ err }, 'Erro ao cancelar entrega');
        return reply.status(500).send({
          error: 'Erro ao cancelar entrega',
        });
      }
    }
  );
}
```

---

### 2. Registrar Rotas no Server

**Arquivo:** `apps/api/src/server.ts`

**Adicionar após as outras rotas:**

```typescript
import { deliveryRoutes } from './routes/delivery.js';
import { deliveryProfileRoutes } from './routes/delivery-profile.js';
import { deliveryPartnerRoutes } from './routes/delivery-partners.js';

// ... código existente ...

// Delivery Routes
await app.register(deliveryRoutes, { prefix: '/api', prisma });
await app.register(deliveryProfileRoutes, { prefix: '/api', prisma });
await app.register(deliveryPartnerRoutes, { prefix: '/api', prisma });
```

---

## PRÓXIMA FASE

Devido ao limite de espaço, as próximas tarefas serão:

➡️ **FASE 4:** [API de Delivery Profile](FASE4_DELIVERY_PROFILE_API.md)
➡️ **FASE 5:** [API de Store Delivery Partners](FASE5_DELIVERY_PARTNERS_API.md)
➡️ **FASE 6:** [Integração com Orders (Auto-create)](FASE6_ORDERS_INTEGRATION.md)
➡️ **FASE 7:** [Testes E2E e Validação Final](FASE7_TESTS_VALIDATION.md)

---

## VALIDAÇÃO

**Teste manual com curl:**

```bash
# Calcular frete
curl -X POST http://localhost:3000/api/delivery/calculate-fee \
  -H "Content-Type: application/json" \
  -d '{
    "pickupAddress": {
      "street": "Rua A",
      "number": "100",
      "city": "Rio de Janeiro",
      "state": "RJ",
      "zipCode": "20000-000"
    },
    "deliveryAddress": {
      "street": "Rua B",
      "number": "200",
      "city": "Rio de Janeiro",
      "state": "RJ",
      "zipCode": "22000-000"
    },
    "packageType": "small_box",
    "weight": 2.0
  }'

# Criar solicitação direta
curl -X POST http://localhost:3000/api/delivery/requests/direct \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "pickupAddress": {...},
    "deliveryAddress": {...},
    "recipientId": "uuid-recipient",
    "packageType": "medium_box"
  }'
```

**Checklist:**

- [ ] Endpoint `/delivery/calculate-fee` funciona
- [ ] Endpoint `/delivery/requests/direct` cria DeliveryRequest
- [ ] Endpoint `/delivery/requests` lista demandas
- [ ] Endpoint `/delivery/requests/:id/accept` atualiza status
- [ ] Endpoint `/delivery/requests/:id/pickup` funciona
- [ ] Endpoint `/delivery/requests/:id/deliver` funciona
- [ ] Endpoint `/delivery/requests/:id/cancel` funciona
- [ ] Validações Zod retornam erros 400 corretos
- [ ] Logs de erro estão funcionando

---

**FIM DA FASE 3**
