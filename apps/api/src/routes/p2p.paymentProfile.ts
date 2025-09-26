import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../lib/auth/middleware.js';

export async function p2pPaymentProfileRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  // GET /p2p/payment-profile (auth)
  app.get('/p2p/payment-profile', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string };
    const row = await prisma.p2PPaymentProfile.findUnique({ where: { userId: authUser.sub } });
    return reply.send(row ?? { userId: authUser.sub, pixKey: null, bankName: null, accountName: null });
  });

  const bodySchema = z.object({
    pixKey: z.string().min(3).max(255),
    bankName: z.string().min(2).max(80).optional(),
    accountName: z.string().min(2).max(80).optional(),
  });

  // POST /p2p/payment-profile (auth) — upsert
  app.post('/p2p/payment-profile', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string };
    const body = bodySchema.parse(request.body);

    const row = await prisma.p2PPaymentProfile.upsert({
      where: { userId: authUser.sub },
      update: { pixKey: body.pixKey, bankName: body.bankName ?? null, accountName: body.accountName ?? null },
      create: { userId: authUser.sub, pixKey: body.pixKey, bankName: body.bankName ?? null, accountName: body.accountName ?? null },
    });
    return reply.send(row);
  });
}

