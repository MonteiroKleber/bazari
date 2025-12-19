// path: apps/api/src/routes/pay/webhooks.ts
// Bazari Pay - Webhooks Management Routes (PROMPT-06)

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authOnRequest } from '../../lib/auth/middleware.js';
import type { AccessTokenPayload } from '../../lib/auth/jwt.js';
import { randomBytes, createHmac } from 'crypto';

const WEBHOOK_EVENTS = [
  'contract.created',
  'contract.paused',
  'contract.resumed',
  'contract.closed',
  'payment.success',
  'payment.failed',
  'adjustment.created',
  'adjustment.approved',
  'adjustment.rejected',
];

export default async function payWebhooksRoutes(
  fastify: FastifyInstance,
  opts: { prisma: PrismaClient }
) {
  const { prisma } = opts;

  function getAuthUser(request: FastifyRequest): AccessTokenPayload {
    const authReq = request as FastifyRequest & { authUser: AccessTokenPayload };
    return authReq.authUser;
  }

  /**
   * GET /api/pay/webhooks
   * List webhooks for user's companies
   */
  fastify.get<{ Querystring: { companyId?: string } }>(
    '/webhooks',
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

      const webhooks = await prisma.payWebhook.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          url: true,
          events: true,
          active: true,
          lastCalledAt: true,
          successCount: true,
          failureCount: true,
          createdAt: true,
          company: {
            select: { id: true, shopName: true },
          },
        },
      });

      return reply.send({ webhooks });
    }
  );

  /**
   * POST /api/pay/webhooks
   * Create a new webhook
   */
  fastify.post<{
    Body: {
      companyId: string;
      name?: string;
      url: string;
      events?: string[];
    };
  }>(
    '/webhooks',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { companyId, name, url, events = ['payment.success', 'payment.failed'] } = request.body;

      if (!companyId || !url) {
        return reply.status(400).send({ error: 'companyId e url são obrigatórios' });
      }

      // Validate URL
      try {
        new URL(url);
      } catch {
        return reply.status(400).send({ error: 'URL inválida' });
      }

      // Validate events
      const invalidEvents = events.filter(e => !WEBHOOK_EVENTS.includes(e));
      if (invalidEvents.length > 0) {
        return reply.status(400).send({
          error: 'Eventos inválidos',
          invalidEvents,
          validEvents: WEBHOOK_EVENTS,
        });
      }

      // Verify company ownership
      const company = await prisma.sellerProfile.findFirst({
        where: { id: companyId, userId: authUser.sub },
      });

      if (!company) {
        return reply.status(403).send({ error: 'Acesso negado à empresa' });
      }

      // Generate secret for signing
      const secret = randomBytes(32).toString('hex');

      const webhook = await prisma.payWebhook.create({
        data: {
          companyId,
          name: name || `Webhook ${new Date().toISOString().slice(0, 10)}`,
          url,
          secret,
          events,
          createdById: authUser.sub,
        },
      });

      return reply.status(201).send({
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        secret, // Only shown once!
        events: webhook.events,
        active: webhook.active,
        createdAt: webhook.createdAt,
        warning: 'Guarde o secret em local seguro. Ele é usado para validar a assinatura das requisições.',
      });
    }
  );

  /**
   * PATCH /api/pay/webhooks/:id
   * Update webhook
   */
  fastify.patch<{
    Params: { id: string };
    Body: { name?: string; url?: string; events?: string[]; active?: boolean };
  }>(
    '/webhooks/:id',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { id } = request.params;
      const { name, url, events, active } = request.body;

      // Find webhook and verify ownership
      const webhook = await prisma.payWebhook.findFirst({
        where: { id },
        include: {
          company: { select: { userId: true } },
        },
      });

      if (!webhook) {
        return reply.status(404).send({ error: 'Webhook não encontrado' });
      }

      if (webhook.company.userId !== authUser.sub) {
        return reply.status(403).send({ error: 'Acesso negado' });
      }

      // Validate URL if provided
      if (url) {
        try {
          new URL(url);
        } catch {
          return reply.status(400).send({ error: 'URL inválida' });
        }
      }

      // Validate events if provided
      if (events) {
        const invalidEvents = events.filter(e => !WEBHOOK_EVENTS.includes(e));
        if (invalidEvents.length > 0) {
          return reply.status(400).send({
            error: 'Eventos inválidos',
            invalidEvents,
            validEvents: WEBHOOK_EVENTS,
          });
        }
      }

      const updated = await prisma.payWebhook.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(url && { url }),
          ...(events && { events }),
          ...(active !== undefined && { active }),
        },
        select: {
          id: true,
          name: true,
          url: true,
          events: true,
          active: true,
        },
      });

      return reply.send({ webhook: updated });
    }
  );

  /**
   * DELETE /api/pay/webhooks/:id
   * Delete webhook
   */
  fastify.delete<{ Params: { id: string } }>(
    '/webhooks/:id',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { id } = request.params;

      // Find webhook and verify ownership
      const webhook = await prisma.payWebhook.findFirst({
        where: { id },
        include: {
          company: { select: { userId: true } },
        },
      });

      if (!webhook) {
        return reply.status(404).send({ error: 'Webhook não encontrado' });
      }

      if (webhook.company.userId !== authUser.sub) {
        return reply.status(403).send({ error: 'Acesso negado' });
      }

      await prisma.payWebhook.delete({ where: { id } });

      return reply.send({ success: true, message: 'Webhook excluído com sucesso' });
    }
  );

  /**
   * POST /api/pay/webhooks/:id/test
   * Send a test webhook
   */
  fastify.post<{ Params: { id: string } }>(
    '/webhooks/:id/test',
    { onRequest: [authOnRequest] },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const { id } = request.params;

      // Find webhook and verify ownership
      const webhook = await prisma.payWebhook.findFirst({
        where: { id },
        include: {
          company: { select: { userId: true, shopName: true } },
        },
      });

      if (!webhook) {
        return reply.status(404).send({ error: 'Webhook não encontrado' });
      }

      if (webhook.company.userId !== authUser.sub) {
        return reply.status(403).send({ error: 'Acesso negado' });
      }

      // Create test payload
      const payload = {
        event: 'test',
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test webhook from Bazari Pay',
          webhookId: webhook.id,
          companyName: webhook.company.shopName,
        },
      };

      // Sign payload
      const signature = webhook.secret
        ? createHmac('sha256', webhook.secret)
            .update(JSON.stringify(payload))
            .digest('hex')
        : null;

      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(signature && { 'X-Bazari-Signature': signature }),
          },
          body: JSON.stringify(payload),
        });

        return reply.send({
          success: response.ok,
          statusCode: response.status,
          statusText: response.statusText,
        });
      } catch (error) {
        return reply.send({
          success: false,
          error: error instanceof Error ? error.message : 'Request failed',
        });
      }
    }
  );

  /**
   * GET /api/pay/webhooks/events
   * List available webhook events
   */
  fastify.get('/webhooks/events', async (request, reply) => {
    return reply.send({
      events: WEBHOOK_EVENTS.map(event => ({
        name: event,
        description: getEventDescription(event),
      })),
    });
  });
}

function getEventDescription(event: string): string {
  const descriptions: Record<string, string> = {
    'contract.created': 'Novo contrato criado',
    'contract.paused': 'Contrato pausado',
    'contract.resumed': 'Contrato retomado',
    'contract.closed': 'Contrato encerrado',
    'payment.success': 'Pagamento executado com sucesso',
    'payment.failed': 'Falha na execução do pagamento',
    'adjustment.created': 'Novo ajuste criado',
    'adjustment.approved': 'Ajuste aprovado',
    'adjustment.rejected': 'Ajuste rejeitado',
  };
  return descriptions[event] || event;
}

/**
 * Helper function to dispatch webhooks (called from other services)
 */
export async function dispatchWebhook(
  prisma: PrismaClient,
  companyId: string,
  event: string,
  data: any
): Promise<void> {
  const webhooks = await prisma.payWebhook.findMany({
    where: {
      companyId,
      active: true,
      events: { has: event },
    },
  });

  for (const webhook of webhooks) {
    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    const signature = webhook.secret
      ? createHmac('sha256', webhook.secret)
          .update(JSON.stringify(payload))
          .digest('hex')
      : null;

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(signature && { 'X-Bazari-Signature': signature }),
        },
        body: JSON.stringify(payload),
      });

      await prisma.payWebhook.update({
        where: { id: webhook.id },
        data: {
          lastCalledAt: new Date(),
          successCount: response.ok ? { increment: 1 } : undefined,
          failureCount: !response.ok ? { increment: 1 } : undefined,
        },
      });
    } catch (error) {
      console.error(`[PayWebhook] Failed to dispatch to ${webhook.url}:`, error);
      await prisma.payWebhook.update({
        where: { id: webhook.id },
        data: {
          lastCalledAt: new Date(),
          failureCount: { increment: 1 },
        },
      });
    }
  }
}
