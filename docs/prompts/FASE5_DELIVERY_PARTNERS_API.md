# FASE 5: API de Store Delivery Partners - Bazari Delivery Network

**Objetivo:** Criar endpoints para gerenciamento de parceiros de entrega vinculados a lojas

**Duração Estimada:** 1-2 horas

**Pré-requisito:** FASE 4 concluída

---

## TAREFA ÚNICA

### Criar Arquivo de Rotas de Store Delivery Partners

**Arquivo:** `apps/api/src/routes/delivery-partners.ts`

```typescript
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

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
    async (request, reply) => {
      try {
        const { storeId } = request.params;
        const currentProfileId = 'profile-placeholder'; // TODO: JWT
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
    async (request, reply) => {
      try {
        const { storeId, partnerId } = request.params;
        const currentUserId = 'user-placeholder'; // TODO: JWT
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
    async (request, reply) => {
      try {
        const { storeId, partnerId } = request.params;
        const currentUserId = 'user-placeholder'; // TODO: JWT

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
```

---

## VALIDAÇÃO

```bash
# Listar parceiros (como loja)
curl http://localhost:3000/api/stores/123/delivery-partners?status=active \
  -H "Authorization: Bearer STORE_OWNER_TOKEN"

# Solicitar parceria (como entregador)
curl -X POST http://localhost:3000/api/stores/123/delivery-partners/request \
  -H "Authorization: Bearer DELIVERER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Gostaria de ser parceiro!"}'

# Aprovar parceria (como loja)
curl -X PATCH http://localhost:3000/api/stores/123/delivery-partners/uuid-partnership \
  -H "Authorization: Bearer STORE_OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "active",
    "priority": 1,
    "commissionPercent": 95
  }'
```

**Checklist:**

- [ ] GET /stores/:id/delivery-partners lista parceiros
- [ ] POST /stores/:id/delivery-partners/request cria solicitação
- [ ] PATCH /stores/:id/delivery-partners/:pid atualiza status
- [ ] DELETE /stores/:id/delivery-partners/:pid remove parceria
- [ ] Validação de ownership da loja funciona
- [ ] Campos de timestamp corretos (approvedAt, rejectedAt, etc.)

---

**PRÓXIMA FASE:** [FASE 6 - Integração com Orders](FASE6_ORDERS_INTEGRATION.md)
