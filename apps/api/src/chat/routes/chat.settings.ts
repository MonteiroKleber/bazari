import { FastifyInstance, FastifyRequest } from 'fastify';
import { authOnRequest } from '../../lib/auth/middleware';
import { AccessTokenPayload } from '../../lib/auth/jwt';
import { prisma } from '../../lib/prisma';
import { getUserPresence } from '../ws/handlers';

export default async function chatSettingsRoutes(app: FastifyInstance) {
  // Buscar políticas de comissão de uma loja
  app.get('/chat/settings/store/:storeId', { preHandler: authOnRequest }, async (req, reply) => {
    const { storeId } = req.params as { storeId: string };

    try {
      let policy = await prisma.storeCommissionPolicy.findUnique({
        where: { storeId: BigInt(storeId) },
      });

      // Se não existir, criar com valores padrão
      if (!policy) {
        const now = Date.now();
        policy = await prisma.storeCommissionPolicy.create({
          data: {
            storeId: BigInt(storeId),
            mode: 'open',
            percent: 5,
            createdAt: now,
            updatedAt: now,
          },
        });
      }

      return {
        storeId: Number(policy.storeId),
        mode: policy.mode,
        percent: policy.percent,
        minReputation: policy.minReputation,
        dailyCommissionCap: policy.dailyCommissionCap
          ? policy.dailyCommissionCap.toString()
          : null,
        createdAt: Number(policy.createdAt),
        updatedAt: Number(policy.updatedAt),
      };
    } catch (error) {
      req.log.error({ error, storeId }, 'Failed to fetch store settings');
      return reply.code(500).send({ error: 'Failed to fetch store settings' });
    }
  });

  // Atualizar políticas de comissão
  app.put('/chat/settings/store/:storeId', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const profileId = authReq.authUser.sub;
    const { storeId } = req.params as { storeId: string };

    const {
      mode,
      percent,
      minReputation,
      dailyCommissionCap,
    } = req.body as {
      mode?: 'open' | 'followers' | 'affiliates';
      percent?: number;
      minReputation?: number;
      dailyCommissionCap?: string;
    };

    // Validações
    if (percent !== undefined && (percent < 0 || percent > 20)) {
      return reply.code(400).send({ error: 'Commission percent must be between 0 and 20' });
    }

    try {
      // Verificar se o usuário é dono da loja
      // TODO: Adicionar verificação de propriedade da loja
      // Por enquanto, permite qualquer usuário autenticado

      const now = Date.now();
      const data: any = {
        updatedAt: now,
      };

      if (mode !== undefined) data.mode = mode;
      if (percent !== undefined) data.percent = percent;
      if (minReputation !== undefined) data.minReputation = minReputation;
      if (dailyCommissionCap !== undefined) {
        data.dailyCommissionCap = dailyCommissionCap ? parseFloat(dailyCommissionCap) : null;
      }

      const policy = await prisma.storeCommissionPolicy.upsert({
        where: { storeId: BigInt(storeId) },
        update: data,
        create: {
          storeId: BigInt(storeId),
          mode: mode || 'open',
          percent: percent || 5,
          minReputation,
          dailyCommissionCap: dailyCommissionCap ? parseFloat(dailyCommissionCap) : null,
          createdAt: now,
          updatedAt: now,
        },
      });

      req.log.info({ storeId, profileId, updates: data }, 'Store settings updated');

      return {
        storeId: Number(policy.storeId),
        mode: policy.mode,
        percent: policy.percent,
        minReputation: policy.minReputation,
        dailyCommissionCap: policy.dailyCommissionCap
          ? policy.dailyCommissionCap.toString()
          : null,
        updatedAt: Number(policy.updatedAt),
      };
    } catch (error) {
      req.log.error({ error, storeId, profileId }, 'Failed to update store settings');
      return reply.code(500).send({ error: 'Failed to update store settings' });
    }
  });

  // Buscar reputação de um perfil
  app.get('/chat/reputation/:profileId', { preHandler: authOnRequest }, async (req, reply) => {
    const { profileId } = req.params as { profileId: string };

    try {
      const profile = await prisma.profile.findUnique({
        where: { id: profileId },
      });

      if (!profile) {
        return reply.code(404).send({ error: 'Profile not found' });
      }

      return {
        profileId,
        score: profile.reputationScore || 0,
        tier: profile.reputationTier || 'Newbie',
      };
    } catch (error) {
      req.log.error({ error, profileId }, 'Failed to fetch reputation');
      return reply.code(500).send({ error: 'Failed to fetch reputation' });
    }
  });

  // Buscar status de presença de múltiplos usuários
  app.post('/chat/presence', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const currentProfileId = authReq.authUser.sub;

    const { profileIds } = req.body as { profileIds: string[] };

    if (!profileIds || !Array.isArray(profileIds) || profileIds.length === 0) {
      return reply.code(400).send({ error: 'profileIds array is required' });
    }

    // Limitar a 100 perfis por request
    if (profileIds.length > 100) {
      return reply.code(400).send({ error: 'Maximum 100 profile IDs allowed' });
    }

    try {
      const presences = await Promise.all(
        profileIds.map(async (profileId) => {
          return getUserPresence(profileId);
        })
      );

      return { presences };
    } catch (error) {
      req.log.error({ error }, 'Failed to fetch presence status');
      return reply.code(500).send({ error: 'Failed to fetch presence status' });
    }
  });

  // Atualizar configuração de visibilidade de status online
  app.put('/chat/settings/privacy', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const profileId = authReq.authUser.sub;

    const { showOnlineStatus } = req.body as { showOnlineStatus?: boolean };

    if (typeof showOnlineStatus !== 'boolean') {
      return reply.code(400).send({ error: 'showOnlineStatus must be a boolean' });
    }

    try {
      await prisma.profile.update({
        where: { id: profileId },
        data: { showOnlineStatus },
      });

      req.log.info({ profileId, showOnlineStatus }, 'Privacy settings updated');

      return { success: true, showOnlineStatus };
    } catch (error) {
      req.log.error({ error, profileId }, 'Failed to update privacy settings');
      return reply.code(500).send({ error: 'Failed to update privacy settings' });
    }
  });

  // Obter configurações de privacidade atuais
  app.get('/chat/settings/privacy', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const profileId = authReq.authUser.sub;

    try {
      const profile = await prisma.profile.findUnique({
        where: { id: profileId },
        select: { showOnlineStatus: true },
      });

      if (!profile) {
        return reply.code(404).send({ error: 'Profile not found' });
      }

      return { showOnlineStatus: profile.showOnlineStatus };
    } catch (error) {
      req.log.error({ error, profileId }, 'Failed to fetch privacy settings');
      return reply.code(500).send({ error: 'Failed to fetch privacy settings' });
    }
  });
}
