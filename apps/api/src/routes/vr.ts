import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authOnRequest } from '../lib/auth/middleware.js';
import { issueAccessToken, issueRefresh, verifyVRToken } from '../lib/auth/jwt.js';
import jwt from 'jsonwebtoken';

export async function vrRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  // ========================================
  // POST /api/auth/issue-vr-token
  // Gera token de uso único para entrar no VR
  // ========================================
  app.post(
    '/auth/issue-vr-token',
    {
      onRequest: [authOnRequest],
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              vrToken: { type: 'string' },
              expiresIn: { type: 'number' }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const userId = request.authUser!.sub;

      // Gerar VR Token (JWT com 2min de validade)
      const vrToken = jwt.sign(
        {
          sub: userId,
          type: 'vr-exchange',
          iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET!,
        { expiresIn: '2m' }
      );

      // Salvar no banco
      const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutos
      await prisma.vRToken.create({
        data: {
          userId,
          token: vrToken,
          expiresAt
        }
      });

      app.log.info({ userId }, 'VR token issued');

      return {
        vrToken,
        expiresIn: 120 // 2 minutos em segundos
      };
    }
  );

  // ========================================
  // POST /api/vr/exchange-token
  // Troca VR Token por Access Token + Refresh Token
  // ========================================
  app.post(
    '/vr/exchange-token',
    {
      schema: {
        body: {
          type: 'object',
          required: ['vrToken'],
          properties: {
            vrToken: { type: 'string' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              accessToken: { type: 'string' },
              expiresIn: { type: 'number' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  address: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const { vrToken } = request.body as { vrToken: string };

      // 1. Validar JWT
      let payload;
      try {
        payload = verifyVRToken(vrToken);
      } catch (err) {
        app.log.warn({ vrToken }, 'Invalid VR token (JWT verification failed)');
        return reply.code(401).send({ error: 'Invalid or expired token' });
      }

      // 2. Verificar tipo
      if (payload.type !== 'vr-exchange') {
        app.log.warn({ payload }, 'Invalid token type');
        return reply.code(401).send({ error: 'Invalid token type' });
      }

      // 3. Buscar token no banco
      const record = await prisma.vRToken.findUnique({
        where: { token: vrToken }
      });

      if (!record) {
        app.log.warn({ vrToken }, 'VR token not found in database');
        return reply.code(401).send({ error: 'Token not found' });
      }

      // 4. Verificar se já foi usado
      if (record.used) {
        app.log.warn({ vrToken, userId: record.userId }, 'VR token already used');
        return reply.code(401).send({ error: 'Token already used' });
      }

      // 5. Verificar se expirou
      if (record.expiresAt < new Date()) {
        app.log.warn({ vrToken, userId: record.userId }, 'VR token expired');
        return reply.code(401).send({ error: 'Token expired' });
      }

      // 6. Marcar como usado
      await prisma.vRToken.update({
        where: { id: record.id },
        data: { used: true }
      });

      // 7. Buscar usuário
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, address: true }
      });

      if (!user) {
        app.log.error({ userId: payload.sub }, 'User not found for VR token');
        return reply.code(404).send({ error: 'User not found' });
      }

      // 8. Gerar tokens normais
      const { token: accessToken, expiresIn } = issueAccessToken(user);
      await issueRefresh(reply, prisma, user);

      app.log.info({ userId: user.id }, 'VR token exchanged successfully');

      return {
        accessToken,
        expiresIn,
        user: {
          id: user.id,
          address: user.address
        }
      };
    }
  );

  // ========================================
  // GET /api/vr/profile
  // Retorna perfil completo do usuário para VR
  // ========================================
  app.get(
    '/vr/profile',
    {
      onRequest: [authOnRequest],
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              handle: { type: 'string' },
              displayName: { type: 'string' },
              bio: { type: ['string', 'null'] },
              avatarUrl: { type: ['string', 'null'] },
              bannerUrl: { type: ['string', 'null'] },
              createdAt: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  address: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const userId = request.authUser!.sub;

      // Buscar perfil completo
      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: {
          id: true,
          handle: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          bannerUrl: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              address: true
            }
          }
        }
      });

      if (!profile) {
        app.log.error({ userId }, 'Profile not found for VR user');
        return reply.code(404).send({ error: 'Profile not found' });
      }

      app.log.info({ userId, handle: profile.handle }, 'VR profile fetched');

      return {
        id: profile.id,
        handle: profile.handle,
        displayName: profile.displayName,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        bannerUrl: profile.bannerUrl,
        createdAt: profile.createdAt.toISOString(),
        user: profile.user
      };
    }
  );
}
