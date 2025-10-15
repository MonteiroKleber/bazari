import { FastifyInstance, FastifyRequest } from 'fastify';
import { authOnRequest } from '../../lib/auth/middleware';
import { AccessTokenPayload } from '../../lib/auth/jwt';
import { prisma } from '../../lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { chatService } from '../services/chat';

export default async function chatAffiliatesRoutes(app: FastifyInstance) {
  // ========================================
  // ENDPOINTS DO DONO DA LOJA
  // ========================================

  // GET /api/chat/affiliates/store/:storeId
  // Listar afiliados da loja (apenas dono)
  app.get(
    '/chat/affiliates/store/:storeId',
    { preHandler: authOnRequest },
    async (req, reply) => {
      const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
      const userId = authReq.authUser.sub;

      const { storeId } = req.params as { storeId: string };
      const { status, cursor, limit = '20' } = req.query as {
        status?: 'pending' | 'approved' | 'rejected' | 'suspended';
        cursor?: string;
        limit?: string;
      };

      const storeIdBigInt = BigInt(storeId);

      // Validar que usuário é dono da loja
      const store = await prisma.sellerProfile.findFirst({
        where: {
          onChainStoreId: storeIdBigInt,
          userId,
        },
      });

      if (!store) {
        return reply.code(403).send({ error: 'Not authorized to manage this store' });
      }

      // Buscar afiliados
      const limitNum = Math.min(parseInt(limit), 50);
      const whereClause: any = { storeId: storeIdBigInt };
      if (status) {
        whereClause.status = status;
      }
      if (cursor) {
        whereClause.id = { lt: cursor };
      }

      const affiliates = await prisma.chatStoreAffiliate.findMany({
        where: whereClause,
        include: {
          promoter: {
            select: {
              id: true,
              handle: true,
              displayName: true,
              avatarUrl: true,
              reputationScore: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limitNum + 1,
      });

      const hasMore = affiliates.length > limitNum;
      const results = hasMore ? affiliates.slice(0, limitNum) : affiliates;
      const nextCursor = hasMore ? results[results.length - 1].id : undefined;

      return reply.send({
        affiliates: results.map((aff) => ({
          id: aff.id,
          promoterId: aff.promoterId,
          promoterHandle: aff.promoter.handle,
          promoterDisplayName: aff.promoter.displayName,
          promoterAvatar: aff.promoter.avatarUrl,
          promoterReputation: aff.promoter.reputationScore,
          status: aff.status,
          customCommission: aff.customCommission,
          monthlySalesCap: aff.monthlySalesCap?.toString(),
          totalSales: aff.totalSales.toString(),
          totalCommission: aff.totalCommission.toString(),
          salesCount: aff.salesCount,
          notes: aff.notes,
          requestedAt: aff.requestedAt.toString(),
          approvedAt: aff.approvedAt?.toString(),
          rejectedAt: aff.rejectedAt?.toString(),
          suspendedAt: aff.suspendedAt?.toString(),
        })),
        nextCursor,
      });
    }
  );

  // POST /api/chat/affiliates/store/:storeId/approve
  // Aprovar solicitação de afiliado
  app.post(
    '/chat/affiliates/store/:storeId/approve',
    { preHandler: authOnRequest },
    async (req, reply) => {
      const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
      const userId = authReq.authUser.sub;

      const { storeId } = req.params as { storeId: string };
      const { affiliateId, customCommission, monthlySalesCap, notes } = req.body as {
        affiliateId: string;
        customCommission?: number;
        monthlySalesCap?: string;
        notes?: string;
      };

      const storeIdBigInt = BigInt(storeId);

      // Validar que usuário é dono da loja
      const store = await prisma.sellerProfile.findFirst({
        where: {
          onChainStoreId: storeIdBigInt,
          userId,
        },
      });

      if (!store) {
        return reply.code(403).send({ error: 'Not authorized to manage this store' });
      }

      // Buscar afiliado
      const affiliate = await prisma.chatStoreAffiliate.findUnique({
        where: { id: affiliateId },
      });

      if (!affiliate || affiliate.storeId !== storeIdBigInt) {
        return reply.code(404).send({ error: 'Affiliate not found' });
      }

      if (affiliate.status !== 'pending') {
        return reply.code(400).send({ error: 'Only pending requests can be approved' });
      }

      // Validar customCommission se fornecido
      if (customCommission !== undefined && (customCommission < 0 || customCommission > 100)) {
        return reply.code(400).send({ error: 'Commission must be between 0 and 100' });
      }

      // Aprovar
      const now = BigInt(Date.now());
      const updated = await prisma.chatStoreAffiliate.update({
        where: { id: affiliateId },
        data: {
          status: 'approved',
          approvedAt: now,
          customCommission: customCommission ?? null,
          monthlySalesCap: monthlySalesCap ? new Decimal(monthlySalesCap) : null,
          notes: notes ?? affiliate.notes,
          updatedAt: now,
        },
        include: {
          promoter: {
            select: {
              handle: true,
              displayName: true,
            },
          },
        },
      });

      return reply.send({
        success: true,
        affiliate: {
          id: updated.id,
          status: updated.status,
          approvedAt: updated.approvedAt?.toString(),
          customCommission: updated.customCommission,
          monthlySalesCap: updated.monthlySalesCap?.toString(),
          promoterHandle: updated.promoter.handle,
        },
      });
    }
  );

  // POST /api/chat/affiliates/store/:storeId/reject
  // Rejeitar solicitação de afiliado
  app.post(
    '/chat/affiliates/store/:storeId/reject',
    { preHandler: authOnRequest },
    async (req, reply) => {
      const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
      const userId = authReq.authUser.sub;

      const { storeId } = req.params as { storeId: string };
      const { affiliateId, reason } = req.body as {
        affiliateId: string;
        reason?: string;
      };

      const storeIdBigInt = BigInt(storeId);

      // Validar que usuário é dono da loja
      const store = await prisma.sellerProfile.findFirst({
        where: {
          onChainStoreId: storeIdBigInt,
          userId,
        },
      });

      if (!store) {
        return reply.code(403).send({ error: 'Not authorized to manage this store' });
      }

      // Buscar afiliado
      const affiliate = await prisma.chatStoreAffiliate.findUnique({
        where: { id: affiliateId },
      });

      if (!affiliate || affiliate.storeId !== storeIdBigInt) {
        return reply.code(404).send({ error: 'Affiliate not found' });
      }

      if (affiliate.status !== 'pending') {
        return reply.code(400).send({ error: 'Only pending requests can be rejected' });
      }

      // Rejeitar
      const now = BigInt(Date.now());
      const updated = await prisma.chatStoreAffiliate.update({
        where: { id: affiliateId },
        data: {
          status: 'rejected',
          rejectedAt: now,
          notes: reason || affiliate.notes,
          updatedAt: now,
        },
        include: {
          promoter: {
            select: {
              handle: true,
            },
          },
        },
      });

      return reply.send({
        success: true,
        affiliate: {
          id: updated.id,
          status: updated.status,
          rejectedAt: updated.rejectedAt?.toString(),
          promoterHandle: updated.promoter.handle,
        },
      });
    }
  );

  // POST /api/chat/affiliates/store/:storeId/suspend
  // Suspender afiliado ativo
  app.post(
    '/chat/affiliates/store/:storeId/suspend',
    { preHandler: authOnRequest },
    async (req, reply) => {
      const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
      const userId = authReq.authUser.sub;

      const { storeId } = req.params as { storeId: string };
      const { affiliateId, reason } = req.body as {
        affiliateId: string;
        reason?: string;
      };

      const storeIdBigInt = BigInt(storeId);

      // Validar que usuário é dono da loja
      const store = await prisma.sellerProfile.findFirst({
        where: {
          onChainStoreId: storeIdBigInt,
          userId,
        },
      });

      if (!store) {
        return reply.code(403).send({ error: 'Not authorized to manage this store' });
      }

      // Buscar afiliado
      const affiliate = await prisma.chatStoreAffiliate.findUnique({
        where: { id: affiliateId },
      });

      if (!affiliate || affiliate.storeId !== storeIdBigInt) {
        return reply.code(404).send({ error: 'Affiliate not found' });
      }

      if (affiliate.status !== 'approved') {
        return reply.code(400).send({ error: 'Only approved affiliates can be suspended' });
      }

      // Suspender
      const now = BigInt(Date.now());
      const updated = await prisma.chatStoreAffiliate.update({
        where: { id: affiliateId },
        data: {
          status: 'suspended',
          suspendedAt: now,
          notes: reason || affiliate.notes,
          updatedAt: now,
        },
        include: {
          promoter: {
            select: {
              handle: true,
            },
          },
        },
      });

      return reply.send({
        success: true,
        affiliate: {
          id: updated.id,
          status: updated.status,
          suspendedAt: updated.suspendedAt?.toString(),
          promoterHandle: updated.promoter.handle,
        },
      });
    }
  );

  // PUT /api/chat/affiliates/store/:storeId/:affiliateId
  // Atualizar configurações de afiliado
  app.put(
    '/chat/affiliates/store/:storeId/:affiliateId',
    { preHandler: authOnRequest },
    async (req, reply) => {
      const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
      const userId = authReq.authUser.sub;

      const { storeId, affiliateId } = req.params as { storeId: string; affiliateId: string };
      const { customCommission, monthlySalesCap, notes } = req.body as {
        customCommission?: number;
        monthlySalesCap?: string;
        notes?: string;
      };

      const storeIdBigInt = BigInt(storeId);

      // Validar que usuário é dono da loja
      const store = await prisma.sellerProfile.findFirst({
        where: {
          onChainStoreId: storeIdBigInt,
          userId,
        },
      });

      if (!store) {
        return reply.code(403).send({ error: 'Not authorized to manage this store' });
      }

      // Buscar afiliado
      const affiliate = await prisma.chatStoreAffiliate.findUnique({
        where: { id: affiliateId },
      });

      if (!affiliate || affiliate.storeId !== storeIdBigInt) {
        return reply.code(404).send({ error: 'Affiliate not found' });
      }

      // Validar customCommission se fornecido
      if (customCommission !== undefined && (customCommission < 0 || customCommission > 100)) {
        return reply.code(400).send({ error: 'Commission must be between 0 and 100' });
      }

      // Atualizar
      const now = BigInt(Date.now());
      const updateData: any = {
        updatedAt: now,
      };

      if (customCommission !== undefined) {
        updateData.customCommission = customCommission;
      }
      if (monthlySalesCap !== undefined) {
        updateData.monthlySalesCap = monthlySalesCap ? new Decimal(monthlySalesCap) : null;
      }
      if (notes !== undefined) {
        updateData.notes = notes;
      }

      const updated = await prisma.chatStoreAffiliate.update({
        where: { id: affiliateId },
        data: updateData,
        include: {
          promoter: {
            select: {
              handle: true,
            },
          },
        },
      });

      return reply.send({
        success: true,
        affiliate: {
          id: updated.id,
          customCommission: updated.customCommission,
          monthlySalesCap: updated.monthlySalesCap?.toString(),
          notes: updated.notes,
          promoterHandle: updated.promoter.handle,
        },
      });
    }
  );

  // ========================================
  // ENDPOINTS DO PROMOTOR
  // ========================================

  // POST /api/chat/affiliates/request
  // Solicitar afiliação a uma loja
  app.post(
    '/chat/affiliates/request',
    { preHandler: authOnRequest },
    async (req, reply) => {
      const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
      const userId = authReq.authUser.sub;

      const { storeId, message } = req.body as {
        storeId: number;
        message?: string;
      };

      if (!storeId) {
        return reply.code(400).send({ error: 'storeId is required' });
      }

      const storeIdBigInt = BigInt(storeId);

      // Converter userId → profileId
      const profile = await chatService.getProfileByUserId(userId);
      if (!profile) {
        return reply.code(404).send({ error: 'Profile not found' });
      }
      const promoterId = profile.id;

      // Verificar se a loja existe
      const store = await prisma.sellerProfile.findFirst({
        where: { onChainStoreId: storeIdBigInt },
        select: {
          id: true,
          shopName: true,
          userId: true,
        },
      });

      if (!store) {
        return reply.code(404).send({ error: 'Store not found' });
      }

      // Não pode solicitar afiliação à própria loja
      if (store.userId === userId) {
        return reply.code(400).send({ error: 'Cannot request affiliation to your own store' });
      }

      // Verificar se já existe solicitação (ativa ou pendente)
      const existing = await prisma.chatStoreAffiliate.findUnique({
        where: {
          storeId_promoterId: {
            storeId: storeIdBigInt,
            promoterId,
          },
        },
      });

      if (existing) {
        if (existing.status === 'pending') {
          return reply.code(400).send({ error: 'Affiliation request already pending' });
        }
        if (existing.status === 'approved') {
          return reply.code(400).send({ error: 'Already affiliated with this store' });
        }
        if (existing.status === 'rejected') {
          // Se foi rejeitado, permitir nova solicitação após 30 dias
          const thirtyDaysAgo = BigInt(Date.now() - 30 * 24 * 60 * 60 * 1000);
          if (existing.rejectedAt && existing.rejectedAt > thirtyDaysAgo) {
            return reply.code(400).send({
              error: 'You can request affiliation again 30 days after rejection',
            });
          }
        }
      }

      // Criar ou atualizar solicitação
      const now = BigInt(Date.now());
      const affiliate = await prisma.chatStoreAffiliate.upsert({
        where: {
          storeId_promoterId: {
            storeId: storeIdBigInt,
            promoterId,
          },
        },
        update: {
          status: 'pending',
          requestedAt: now,
          approvedAt: null,
          rejectedAt: null,
          suspendedAt: null,
          notes: message || null,
          updatedAt: now,
        },
        create: {
          storeId: storeIdBigInt,
          promoterId,
          status: 'pending',
          requestedAt: now,
          notes: message || null,
          createdAt: now,
          updatedAt: now,
        },
      });

      return reply.send({
        id: affiliate.id,
        status: affiliate.status,
        storeId: affiliate.storeId.toString(),
        requestedAt: affiliate.requestedAt.toString(),
      });
    }
  );

  // GET /api/chat/affiliates/me
  // Listar afiliações do usuário logado
  app.get('/chat/affiliates/me', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;

    const { status } = req.query as {
      status?: 'pending' | 'approved' | 'rejected' | 'suspended';
    };

    // Converter userId → profileId
    const profile = await chatService.getProfileByUserId(userId);
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' });
    }
    const promoterId = profile.id;

    // Buscar afiliações
    const whereClause: any = { promoterId };
    if (status) {
      whereClause.status = status;
    }

    const affiliations = await prisma.chatStoreAffiliate.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    // Buscar informações das lojas
    const storeIds = affiliations.map((aff) => aff.storeId);
    const stores = await prisma.sellerProfile.findMany({
      where: {
        onChainStoreId: { in: storeIds },
      },
      select: {
        onChainStoreId: true,
        shopName: true,
        shopSlug: true,
        avatarUrl: true,
      },
    });

    const storeMap = new Map(
      stores.map((s) => [s.onChainStoreId?.toString(), s])
    );

    return reply.send({
      affiliations: affiliations.map((aff) => {
        const store = storeMap.get(aff.storeId.toString());
        return {
          id: aff.id,
          storeId: aff.storeId.toString(),
          storeName: store?.shopName || 'Unknown Store',
          storeSlug: store?.shopSlug || '',
          storeAvatar: store?.avatarUrl,
          status: aff.status,
          customCommission: aff.customCommission,
          monthlySalesCap: aff.monthlySalesCap?.toString(),
          totalSales: aff.totalSales.toString(),
          totalCommission: aff.totalCommission.toString(),
          salesCount: aff.salesCount,
          requestedAt: aff.requestedAt.toString(),
          approvedAt: aff.approvedAt?.toString(),
          rejectedAt: aff.rejectedAt?.toString(),
          suspendedAt: aff.suspendedAt?.toString(),
        };
      }),
    });
  });

  // DELETE /api/chat/affiliates/:affiliateId
  // Cancelar solicitação pendente ou desafiliar-se
  app.delete(
    '/chat/affiliates/:affiliateId',
    { preHandler: authOnRequest },
    async (req, reply) => {
      const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
      const userId = authReq.authUser.sub;

      const { affiliateId } = req.params as { affiliateId: string };

      // Converter userId → profileId
      const profile = await chatService.getProfileByUserId(userId);
      if (!profile) {
        return reply.code(404).send({ error: 'Profile not found' });
      }
      const promoterId = profile.id;

      // Buscar afiliação
      const affiliate = await prisma.chatStoreAffiliate.findUnique({
        where: { id: affiliateId },
      });

      if (!affiliate) {
        return reply.code(404).send({ error: 'Affiliation not found' });
      }

      // Validar que pertence ao usuário
      if (affiliate.promoterId !== promoterId) {
        return reply.code(403).send({ error: 'Not authorized to cancel this affiliation' });
      }

      // Se pendente ou rejeitado: deletar
      if (affiliate.status === 'pending' || affiliate.status === 'rejected') {
        await prisma.chatStoreAffiliate.delete({
          where: { id: affiliateId },
        });

        return reply.send({
          success: true,
          message: 'Affiliation request cancelled',
        });
      }

      // Se aprovado: marcar como rejeitado (mantém histórico)
      if (affiliate.status === 'approved') {
        const now = BigInt(Date.now());
        await prisma.chatStoreAffiliate.update({
          where: { id: affiliateId },
          data: {
            status: 'rejected',
            rejectedAt: now,
            notes: 'Left by promoter',
            updatedAt: now,
          },
        });

        return reply.send({
          success: true,
          message: 'Successfully left affiliation',
        });
      }

      // Se suspenso: não pode sair (precisa do dono da loja)
      return reply.code(400).send({
        error: 'Cannot leave suspended affiliation. Contact store owner.',
      });
    }
  );
}
