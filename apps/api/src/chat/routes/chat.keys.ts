import { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma';
import { authOnRequest } from '../../lib/auth/middleware';
import { AccessTokenPayload } from '../../lib/auth/jwt';

/**
 * Rotas para gerenciar chaves públicas E2EE
 */
export async function chatKeysRoutes(app: FastifyInstance) {
  /**
   * PUT /api/chat/keys
   * Registra ou atualiza a chave pública E2EE do usuário
   */
  app.put(
    '/keys',
    {
      preHandler: authOnRequest,
      schema: {
        body: {
          type: 'object',
          required: ['publicKey'],
          properties: {
            publicKey: { type: 'string' },
          },
        },
      },
    },
    async (req, reply) => {
      const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
      const { publicKey } = req.body as { publicKey: string };
      const userId = authReq.authUser.sub; // JWT contains User ID, not Profile ID

      // Validar formato base64
      if (!/^[A-Za-z0-9+/]+=*$/.test(publicKey)) {
        return reply.code(400).send({
          error: 'Invalid public key format. Must be base64 encoded.',
        });
      }

      // Find profile by userId
      const profile = await prisma.profile.findUnique({
        where: { userId },
      });

      if (!profile) {
        return reply.code(404).send({
          error: 'Profile not found. Please complete profile setup first.',
        });
      }

      // Atualizar chave pública no perfil
      await prisma.profile.update({
        where: { id: profile.id },
        data: { chatPublicKey: publicKey },
      });

      req.log.info({ profileId: profile.id, userId }, 'Chat public key registered');

      return { success: true };
    }
  );

  /**
   * GET /api/chat/keys?profileIds=id1,id2,id3
   * Busca chaves públicas de um ou mais usuários
   */
  app.get(
    '/keys',
    {
      preHandler: authOnRequest,
      schema: {
        querystring: {
          type: 'object',
          required: ['profileIds'],
          properties: {
            profileIds: { type: 'string' }, // Comma-separated list
          },
        },
      },
    },
    async (req, reply) => {
      const { profileIds } = req.query as { profileIds: string };

      // Parse comma-separated IDs
      const ids = profileIds.split(',').filter(Boolean);

      if (ids.length === 0) {
        return reply.code(400).send({
          error: 'At least one profileId is required',
        });
      }

      if (ids.length > 100) {
        return reply.code(400).send({
          error: 'Maximum 100 profileIds per request',
        });
      }

      // Buscar chaves públicas
      const profiles = await prisma.profile.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          chatPublicKey: true,
        },
      });

      // Retornar mapa: profileId -> publicKey
      const keys = profiles.reduce((acc, p) => {
        if (p.chatPublicKey) {
          acc[p.id] = p.chatPublicKey;
        }
        return acc;
      }, {} as Record<string, string>);

      req.log.info({ requestedIds: ids.length, foundKeys: Object.keys(keys).length }, 'Chat public keys fetched');

      return { keys };
    }
  );
}
