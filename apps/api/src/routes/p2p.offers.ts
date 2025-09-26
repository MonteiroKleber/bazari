import type { FastifyInstance } from 'fastify';
import type { PrismaClient, P2PPaymentMethod, P2POfferSide } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../lib/auth/middleware.js';
import { decodeCursor, encodeCursor } from '../lib/cursor.js';

export async function p2pOffersRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  const listQuery = z.object({
    side: z.enum(['BUY_BZR', 'SELL_BZR']).optional(),
    method: z.enum(['PIX']).optional(),
    minBRL: z.coerce.number().optional(),
    maxBRL: z.coerce.number().optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
  });

  // GET /p2p/offers — público
  app.get('/p2p/offers', async (request, reply) => {
    try {
      const raw = (request.query ?? {}) as Record<string, any>;
      const cleaned: Record<string, any> = { ...raw };
      ['minBRL','maxBRL','limit','cursor'].forEach((k) => {
        const v = cleaned[k];
        if (v === '' || v === 'undefined' || v === 'null' || v === 'NaN') {
          delete cleaned[k];
        }
      });
      const { side, method, minBRL, maxBRL, cursor, limit } = listQuery.parse(cleaned);
      const take = Math.min(limit ?? 20, 100);

      const c = decodeCursor(cursor ?? null);
      const where: any = { status: 'ACTIVE' };
      if (side) where.side = side;
      if (method) where.method = method;
      if (minBRL != null) where.maxBRL = { gte: minBRL };
      if (maxBRL != null) where.minBRL = { lte: maxBRL };

      const orderBy: any[] = [ { createdAt: 'desc' }, { id: 'desc' } ];
      const cursorWhere = c ? { OR: [ { createdAt: { lt: c.createdAt } }, { createdAt: c.createdAt, id: { lt: c.id } } ] } : {};

      const rows = await prisma.p2POffer.findMany({
        where: { ...where, ...cursorWhere },
        orderBy,
        take: take + 1,
      } as any);

      let nextCursor: string | null = null;
      if (rows.length > take) {
        const tail: any = rows.pop();
        nextCursor = encodeCursor({ createdAt: tail.createdAt, id: tail.id });
      }

      // Attach minimal owner profile if exists
      const ownerIds = Array.from(new Set(rows.map((r: any) => r.ownerId)));
      const profiles = await prisma.profile.findMany({
        where: { userId: { in: ownerIds } },
        select: { userId: true, handle: true, displayName: true, avatarUrl: true },
      } as any);
      const byUser: Record<string, any> = Object.fromEntries(profiles.map(p => [p.userId, p]));

      // Aggregate owner reputation/stats in bulk
      const ownerIdsIn = ownerIds.length ? ownerIds.map((id) => `'${id}'`).join(',') : '';
      let starsBy: Record<string, number | null> = {};
      let compBy: Record<string, number | null> = {};
      let volBy: Record<string, { brl: number; bzr: number }> = {};
      if (ownerIds.length) {
        const stars = await prisma.$queryRawUnsafe<any[]>(
          `SELECT "rateeId" AS uid, AVG(stars)::numeric(10,2) AS avg
           FROM "P2PReview" WHERE "rateeId" IN (${ownerIdsIn}) GROUP BY "rateeId"`
        );
        starsBy = Object.fromEntries(stars.map((r: any) => [r.uid, Number(r.avg)]));

        const comp = await prisma.$queryRawUnsafe<any[]>(
          `SELECT "makerId" AS uid,
                  SUM(CASE WHEN status='RELEASED' THEN 1 ELSE 0 END) AS completed,
                  SUM(CASE WHEN status IN ('CANCELLED','EXPIRED') THEN 1 ELSE 0 END) AS failed
           FROM "P2POrder" WHERE "makerId" IN (${ownerIdsIn}) GROUP BY "makerId"`
        );
        compBy = Object.fromEntries(comp.map((r: any) => {
          const c = Number(r.completed || 0); const f = Number(r.failed || 0);
          const rate = (c+f) > 0 ? c/(c+f) : null; return [r.uid, rate];
        }));

        const vol = await prisma.$queryRawUnsafe<any[]>(
          `SELECT "makerId" AS uid,
                  COALESCE(SUM(CASE WHEN "createdAt" >= NOW() - interval '30 days' AND status='RELEASED' THEN "amountBRL"::numeric END),0) AS brl,
                  COALESCE(SUM(CASE WHEN "createdAt" >= NOW() - interval '30 days' AND status='RELEASED' THEN "amountBZR"::numeric END),0) AS bzr
           FROM "P2POrder" WHERE "makerId" IN (${ownerIdsIn}) GROUP BY "makerId"`
        );
        volBy = Object.fromEntries(vol.map((r: any) => [r.uid, { brl: Number(r.brl||0), bzr: Number(r.bzr||0) }]));
      }

      return reply.send({
        items: rows.map((o: any) => ({
          ...o,
          owner: byUser[o.ownerId] || null,
          ownerStats: {
            avgStars: starsBy[o.ownerId] ?? null,
            completionRate: compBy[o.ownerId] ?? null,
            volume30dBRL: volBy[o.ownerId]?.brl ?? 0,
            volume30dBZR: volBy[o.ownerId]?.bzr ?? 0,
          },
        })),
        nextCursor,
      });
    } catch (err) {
      if (err && typeof err === 'object' && 'errors' in (err as any)) {
        return reply.status(400).send({ error: 'Invalid query', details: (err as any).errors });
      }
      throw err;
    }
  });

  // GET /p2p/offers/:id — público
  app.get('/p2p/offers/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
    const offer = await prisma.p2POffer.findUnique({ where: { id } } as any);
    if (!offer) return reply.status(404).send({ error: 'Oferta não encontrada' });
    const owner = await prisma.profile.findUnique({ where: { userId: (offer as any).ownerId }, select: { handle: true, displayName: true, avatarUrl: true, userId: true } } as any);

    // Aggregate minimal reputation stats for owner (avg stars, completion rate, volume30d)
    const ownerId = (offer as any).ownerId as string;
    const [avgStarsRow] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT AVG(stars)::numeric(10,2) AS avg FROM "P2PReview" WHERE "rateeId" = $1`, ownerId
    );
    const [ordersAgg] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT
         SUM(CASE WHEN status = 'RELEASED' THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN status IN ('CANCELLED','EXPIRED') THEN 1 ELSE 0 END) AS failed
       FROM "P2POrder" WHERE "makerId" = $1`, ownerId
    );
    const [volAgg] = await prisma.$queryRawUnsafe<any[]>(
      `SELECT COALESCE(SUM(CASE WHEN "createdAt" >= NOW() - interval '30 days' AND status='RELEASED' THEN "amountBRL"::numeric END),0) AS brl,
              COALESCE(SUM(CASE WHEN "createdAt" >= NOW() - interval '30 days' AND status='RELEASED' THEN "amountBZR"::numeric END),0) AS bzr
       FROM "P2POrder" WHERE "makerId" = $1`, ownerId
    );
    const completed = Number(ordersAgg?.completed || 0);
    const failed = Number(ordersAgg?.failed || 0);
    const completionRate = (completed + failed) > 0 ? completed / (completed + failed) : null;
    const ownerStats = {
      avgStars: avgStarsRow?.avg != null ? Number(avgStarsRow.avg) : null,
      completionRate,
      volume30dBRL: volAgg?.brl != null ? Number(volAgg.brl) : 0,
      volume30dBZR: volAgg?.bzr != null ? Number(volAgg.bzr) : 0,
    };

    return reply.send({ ...offer, owner: owner ?? null, ownerStats });
  });

  // GET /p2p/my-offers — autenticado
  app.get('/p2p/my-offers', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string };
    const q = z.object({ status: z.enum(['ACTIVE','PAUSED','ARCHIVED']).optional(), cursor: z.string().optional(), limit: z.coerce.number().min(1).max(100).optional() }).parse(request.query ?? {});
    const take = Math.min(q.limit ?? 20, 100);
    const c = decodeCursor(q.cursor ?? null);
    const where: any = { ownerId: authUser.sub };
    if (q.status) where.status = q.status;
    const cursorWhere = c ? { OR: [ { createdAt: { lt: c.createdAt } }, { createdAt: c.createdAt, id: { lt: c.id } } ] } : {};
    const rows = await prisma.p2POffer.findMany({ where: { ...where, ...cursorWhere }, orderBy: [ { createdAt: 'desc' }, { id: 'desc' } ] as any, take: take + 1 } as any);
    let nextCursor: string | null = null;
    if (rows.length > take) {
      const tail: any = rows.pop();
      nextCursor = encodeCursor({ createdAt: tail.createdAt, id: tail.id });
    }
    return reply.send({ items: rows, nextCursor });
  });

  const createBody = z.object({
    side: z.enum(['BUY_BZR', 'SELL_BZR']),
    priceBRLPerBZR: z.coerce.number().positive(),
    minBRL: z.coerce.number().positive(),
    maxBRL: z.coerce.number().positive(),
    method: z.enum(['PIX']).default('PIX'),
    autoReply: z.string().max(500).optional(),
  }).refine(v => v.maxBRL >= v.minBRL, { message: 'maxBRL deve ser >= minBRL', path: ['maxBRL'] });

  // POST /p2p/offers — autenticado
  app.post('/p2p/offers', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string };
    const body = createBody.parse(request.body);

    // Requer perfil de pagamento PIX
    const pay = await prisma.p2PPaymentProfile.findUnique({ where: { userId: authUser.sub } });
    if (!pay || !pay.pixKey) {
      return reply.status(400).send({ error: 'Configure uma chave PIX em /p2p/payment-profile antes de publicar ofertas.' });
    }

    const offer = await prisma.p2POffer.create({
      data: {
        ownerId: authUser.sub,
        side: body.side as P2POfferSide,
        priceBRLPerBZR: String(body.priceBRLPerBZR),
        minBRL: String(body.minBRL),
        maxBRL: String(body.maxBRL),
        method: body.method as P2PPaymentMethod,
        autoReply: body.autoReply ?? null,
      } as any,
    } as any);

    return reply.status(201).send(offer);
  });

  const offerParam = z.object({ id: z.string().min(1) });
  const patchBody = z.object({
    priceBRLPerBZR: z.coerce.number().positive().optional(),
    minBRL: z.coerce.number().positive().optional(),
    maxBRL: z.coerce.number().positive().optional(),
    autoReply: z.string().max(500).nullable().optional(),
    status: z.enum(['ACTIVE','PAUSED','ARCHIVED']).optional(),
  }).refine(v => (v.minBRL == null || v.maxBRL == null) || (Number(v.maxBRL) >= Number(v.minBRL)), { message: 'maxBRL deve ser >= minBRL', path: ['maxBRL'] });

  // PATCH /p2p/offers/:id — owner only
  app.patch('/p2p/offers/:id', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string };
    const { id } = offerParam.parse(request.params);
    const body = patchBody.parse(request.body ?? {});

    const offer = await prisma.p2POffer.findUnique({ where: { id } });
    if (!offer) return reply.status(404).send({ error: 'Oferta não encontrada' });
    if (offer.ownerId !== authUser.sub) return reply.status(403).send({ error: 'Sem permissão' });

    const updated = await prisma.p2POffer.update({
      where: { id },
      data: body as any,
    } as any);
    return reply.send(updated);
  });

  // POST /p2p/offers/:id/toggle — ACTIVE/PAUSED
  app.post('/p2p/offers/:id/toggle', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string };
    const { id } = offerParam.parse(request.params);
    const offer = await prisma.p2POffer.findUnique({ where: { id } });
    if (!offer) return reply.status(404).send({ error: 'Oferta não encontrada' });
    if (offer.ownerId !== authUser.sub) return reply.status(403).send({ error: 'Sem permissão' });
    if (offer.status === 'ARCHIVED') return reply.status(400).send({ error: 'Oferta arquivada' });
    const next = offer.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const updated = await prisma.p2POffer.update({ where: { id }, data: { status: next as any } });
    return reply.send(updated);
  });

  // DELETE /p2p/offers/:id — ARCHIVED
  app.delete('/p2p/offers/:id', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string };
    const { id } = offerParam.parse(request.params);
    const offer = await prisma.p2POffer.findUnique({ where: { id } });
    if (!offer) return reply.status(404).send({ error: 'Oferta não encontrada' });
    if (offer.ownerId !== authUser.sub) return reply.status(403).send({ error: 'Sem permissão' });
    const updated = await prisma.p2POffer.update({ where: { id }, data: { status: 'ARCHIVED' as any } });
    return reply.send(updated);
  });
}
