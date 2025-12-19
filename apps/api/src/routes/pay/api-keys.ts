// path: apps/api/src/routes/pay/api-keys.ts
// Bazari Pay - API Keys Management Routes (PROMPT-06)

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authOnRequest } from '../../lib/auth/middleware.js';
import type { AccessTokenPayload } from '../../lib/auth/jwt.js';
import { generateApiKey, hashApiKey } from '../../middleware/api-key.middleware.js';

export default async function payApiKeysRoutes(
  fastify: FastifyInstance,
  opts: { prisma: PrismaClient }
) {
  const { prisma } = opts;

  function getAuthUser(request: FastifyRequest): AccessTokenPayload {
    const authReq = request as FastifyRequest & { authUser: AccessTokenPayload };
    return authReq.authUser;
  }

  /**
   * GET /api/pay/api-keys
   * List API keys for user's companies
   */
  fastify.get<{ Querystring: { companyId?: string } }>(
    '/api-keys',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { companyId } = request.query;

      // Get user's companies
      const companies = await prisma.sellerProfile.findMany({
        where: { userId: authUser.sub },
        select: { id: true },
      });
      const companyIds = companies.map(c => c.id);

      const where: any = {
        companyId: { in: companyIds },
      };

      if (companyId && companyIds.includes(companyId)) {
        where.companyId = companyId;
      }

      const keys = await prisma.payApiKey.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          permissions: true,
          status: true,
          lastUsedAt: true,
          usageCount: true,
          createdAt: true,
          revokedAt: true,
          company: {
            select: { id: true, shopName: true },
          },
        },
      });

      return reply.send({ keys });
    }
  );

  /**
   * POST /api/pay/api-keys
   * Create a new API key
   */
  fastify.post<{
    Body: {
      companyId: string;
      name: string;
      permissions?: string[];
    };
  }>(
    '/api-keys',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { companyId, name, permissions = ['contracts:read', 'contracts:write'] } = request.body;

      if (!companyId || !name) {
        return reply.status(400).send({ error: 'companyId e name são obrigatórios' });
      }

      // Verify company ownership
      const company = await prisma.sellerProfile.findFirst({
        where: { id: companyId, userId: authUser.sub },
      });

      if (!company) {
        return reply.status(403).send({ error: 'Acesso negado à empresa' });
      }

      // Generate API key
      const apiKey = generateApiKey();
      const hashedKey = hashApiKey(apiKey);
      const keyPrefix = apiKey.substring(0, 12);

      const key = await prisma.payApiKey.create({
        data: {
          companyId,
          name,
          keyHash: hashedKey,
          keyPrefix,
          permissions,
          createdById: authUser.sub,
        },
      });

      // Return key only once!
      return reply.status(201).send({
        id: key.id,
        name: key.name,
        key: apiKey, // Only shown once!
        prefix: key.keyPrefix,
        permissions: key.permissions,
        createdAt: key.createdAt,
        warning: 'Guarde esta chave em local seguro. Ela não será exibida novamente.',
      });
    }
  );

  /**
   * DELETE /api/pay/api-keys/:id
   * Revoke an API key
   */
  fastify.delete<{ Params: { id: string } }>(
    '/api-keys/:id',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { id } = request.params;

      // Find key and verify ownership
      const key = await prisma.payApiKey.findFirst({
        where: { id },
        include: {
          company: {
            select: { userId: true },
          },
        },
      });

      if (!key) {
        return reply.status(404).send({ error: 'API key não encontrada' });
      }

      if (key.company.userId !== authUser.sub) {
        return reply.status(403).send({ error: 'Acesso negado' });
      }

      if (key.status === 'REVOKED') {
        return reply.status(400).send({ error: 'API key já foi revogada' });
      }

      await prisma.payApiKey.update({
        where: { id },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
        },
      });

      return reply.send({ success: true, message: 'API key revogada com sucesso' });
    }
  );

  /**
   * PATCH /api/pay/api-keys/:id
   * Update API key permissions or name
   */
  fastify.patch<{
    Params: { id: string };
    Body: { name?: string; permissions?: string[] };
  }>(
    '/api-keys/:id',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { id } = request.params;
      const { name, permissions } = request.body;

      // Find key and verify ownership
      const key = await prisma.payApiKey.findFirst({
        where: { id },
        include: {
          company: {
            select: { userId: true },
          },
        },
      });

      if (!key) {
        return reply.status(404).send({ error: 'API key não encontrada' });
      }

      if (key.company.userId !== authUser.sub) {
        return reply.status(403).send({ error: 'Acesso negado' });
      }

      if (key.status === 'REVOKED') {
        return reply.status(400).send({ error: 'Não é possível editar API key revogada' });
      }

      const updated = await prisma.payApiKey.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(permissions && { permissions }),
        },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          permissions: true,
          status: true,
        },
      });

      return reply.send({ key: updated });
    }
  );
}
