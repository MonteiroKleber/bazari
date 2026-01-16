/**
 * Push Subscription Routes - Gerenciamento de subscriptions Web Push
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authOnRequest } from '../lib/auth/middleware.js';
import { AccessTokenPayload } from '../lib/auth/jwt.js';
import { getVapidPublicKey } from '../lib/web-push.js';

// Helper para obter profileId do userId
async function getProfileId(userId: string): Promise<string | null> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile?.id || null;
}

// Schema de validação
const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  deviceId: z.string().optional(),
});

export default async function pushRoutes(app: FastifyInstance) {
  /**
   * GET /push/vapid-key
   * Retorna a VAPID public key para o frontend registrar subscription
   */
  app.get('/push/vapid-key', async (_req, reply) => {
    const publicKey = getVapidPublicKey();

    if (!publicKey) {
      return reply.code(503).send({ error: 'Push notifications not configured' });
    }

    return { publicKey };
  });

  /**
   * POST /push/subscribe
   * Registra uma nova push subscription para o usuário autenticado
   */
  app.post('/push/subscribe', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;

    const profileId = await getProfileId(userId);
    if (!profileId) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    // Validar body
    const parseResult = subscribeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.code(400).send({ error: 'Invalid subscription data', details: parseResult.error.errors });
    }

    const { endpoint, keys, deviceId } = parseResult.data;
    const userAgent = req.headers['user-agent'] || null;

    // Upsert: se já existe subscription com mesmo endpoint, atualiza
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        profileId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent,
        deviceId,
      },
      update: {
        profileId, // Pode ter mudado de usuário
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent,
        deviceId,
        updatedAt: new Date(),
      },
    });

    console.log(`[Push] Subscription registered for profile ${profileId}`);

    return { success: true, subscriptionId: subscription.id };
  });

  /**
   * DELETE /push/unsubscribe
   * Remove uma push subscription
   */
  app.delete('/push/unsubscribe', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;

    const profileId = await getProfileId(userId);
    if (!profileId) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    const { endpoint } = req.body as { endpoint?: string };

    if (!endpoint) {
      return reply.code(400).send({ error: 'Endpoint required' });
    }

    const deleted = await prisma.pushSubscription.deleteMany({
      where: {
        profileId,
        endpoint,
      },
    });

    return { success: true, deleted: deleted.count };
  });

  /**
   * GET /push/status
   * Verifica se o usuário atual tem alguma subscription ativa para o endpoint fornecido
   */
  app.get('/push/status', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;

    const profileId = await getProfileId(userId);
    if (!profileId) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    const { endpoint } = req.query as { endpoint?: string };

    if (endpoint) {
      // Verificar se este endpoint específico está registrado para este usuário
      const subscription = await prisma.pushSubscription.findFirst({
        where: { profileId, endpoint },
      });
      return { subscribed: !!subscription, endpoint: endpoint.slice(0, 50) + '...' };
    }

    // Se não passou endpoint, retorna se tem qualquer subscription
    const count = await prisma.pushSubscription.count({
      where: { profileId },
    });

    return { subscribed: count > 0, count };
  });

  /**
   * GET /push/subscriptions
   * Lista todas as push subscriptions do usuário (para gerenciamento de dispositivos)
   */
  app.get('/push/subscriptions', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;

    const profileId = await getProfileId(userId);
    if (!profileId) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { profileId },
      select: {
        id: true,
        endpoint: true,
        userAgent: true,
        deviceId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Mascarar endpoint para privacidade
    const masked = subscriptions.map((sub) => ({
      ...sub,
      endpoint: sub.endpoint.slice(0, 50) + '...',
    }));

    return { subscriptions: masked };
  });

  /**
   * DELETE /push/subscriptions/:id
   * Remove uma subscription específica por ID
   */
  app.delete('/push/subscriptions/:id', { preHandler: authOnRequest }, async (req, reply) => {
    const authReq = req as FastifyRequest & { authUser: AccessTokenPayload };
    const userId = authReq.authUser.sub;
    const { id } = req.params as { id: string };

    const profileId = await getProfileId(userId);
    if (!profileId) {
      return reply.code(404).send({ error: 'Profile not found' });
    }

    // Verificar se a subscription pertence ao usuário
    const subscription = await prisma.pushSubscription.findFirst({
      where: { id, profileId },
    });

    if (!subscription) {
      return reply.code(404).send({ error: 'Subscription not found' });
    }

    await prisma.pushSubscription.delete({ where: { id } });

    return { success: true };
  });
}
