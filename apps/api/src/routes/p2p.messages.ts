import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../lib/auth/middleware.js';
import { decodeCursor, encodeCursor } from '../lib/cursor.js';

export async function p2pMessagesRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  const idParam = z.object({ id: z.string().min(1) });

  // Simple in-memory rate limiter (per order+user): max 10 msgs / 60s
  const WINDOW_MS = 60_000;
  const MAX_PER_WINDOW = 10;
  const messageRateLimiter = new Map<string, { count: number; resetAt: number }>();
  function enforceMsgRateLimit(orderId: string, userId: string) {
    const key = `${orderId}:${userId}`;
    const now = Date.now();
    const entry = messageRateLimiter.get(key);
    if (!entry || entry.resetAt <= now) {
      messageRateLimiter.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return;
    }
    if (entry.count >= MAX_PER_WINDOW) {
      const secs = Math.ceil((entry.resetAt - now) / 1000);
      const err: any = new Error(`Limite de mensagens atingido. Tente novamente em ${secs}s.`);
      err.statusCode = 429;
      throw err;
    }
    entry.count += 1;
  }

  // Access guard: maker or taker only
  async function ensureParticipant(orderId: string, userId: string) {
    const order = await prisma.p2POrder.findUnique({ where: { id: orderId }, select: { makerId: true, takerId: true } } as any);
    if (!order) return { ok: false, code: 404 as const };
    if (order.makerId !== userId && order.takerId !== userId) return { ok: false, code: 403 as const };
    return { ok: true } as const;
  }

  // GET /p2p/orders/:id/messages?cursor=&limit=
  app.get('/p2p/orders/:id/messages', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string };
    const { id } = idParam.parse(request.params);
    const q = z.object({ cursor: z.string().optional(), limit: z.coerce.number().min(1).max(100).optional() }).parse(request.query ?? {});

    const access = await ensureParticipant(id, authUser.sub);
    if (!('ok' in access) || !access.ok) return reply.status(access.code).send({ error: access.code === 404 ? 'Ordem não encontrada' : 'Sem permissão' });

    const take = Math.min(q.limit ?? 30, 100);
    const c = decodeCursor(q.cursor ?? null);
    const where = c
      ? { orderId: id, OR: [ { createdAt: { lt: c.createdAt } }, { createdAt: c.createdAt, id: { lt: c.id } } ] }
      : { orderId: id };

    const rows = await prisma.p2PMessage.findMany({
      where: where as any,
      orderBy: [ { createdAt: 'desc' }, { id: 'desc' } ] as any,
      take: take + 1,
    } as any);

    let nextCursor: string | null = null;
    if (rows.length > take) {
      const tail = rows.pop()!;
      nextCursor = encodeCursor({ createdAt: tail.createdAt, id: tail.id });
    }

    // Attach sender profiles (handles)
    const senderIds = Array.from(new Set(rows.map(r => r.senderId)));
    const profiles = await prisma.profile.findMany({ where: { userId: { in: senderIds } }, select: { userId: true, handle: true, displayName: true, avatarUrl: true } } as any);
    const byUser: Record<string, any> = Object.fromEntries(profiles.map(p => [p.userId, p]));

    return reply.send({
      items: rows.reverse().map(r => ({
        id: r.id,
        body: r.body,
        kind: r.kind,
        createdAt: r.createdAt,
        sender: byUser[r.senderId] || { userId: r.senderId },
      })),
      nextCursor,
    });
  });

  // POST /p2p/orders/:id/messages { body }
  app.post('/p2p/orders/:id/messages', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string };
    const { id } = idParam.parse(request.params);
    const body = z.object({ body: z.string().min(1).max(1000) }).parse(request.body ?? {});

    const access = await ensureParticipant(id, authUser.sub);
    if (!('ok' in access) || !access.ok) return reply.status(access.code).send({ error: access.code === 404 ? 'Ordem não encontrada' : 'Sem permissão' });

    try { enforceMsgRateLimit(id, authUser.sub); } catch (e) {
      const err = e as any;
      return reply.status(err.statusCode || 429).send({ error: err.message || 'Rate limit excedido' });
    }

    const msg = await prisma.p2PMessage.create({ data: { orderId: id, senderId: authUser.sub, body: body.body, kind: 'text' } as any } as any);
    return reply.status(201).send({ id: msg.id, createdAt: msg.createdAt });
  });
}
