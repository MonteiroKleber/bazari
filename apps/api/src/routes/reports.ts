import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../lib/auth/middleware.js';

export async function reportsRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  // POST /reports
  app.post('/reports', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) return reply.status(401).send({ error: 'Unauthorized' });

    const schema = z.object({
      contentType: z.enum(['POST', 'COMMENT', 'PROFILE']),
      contentId: z.string(),
      reason: z.enum(['SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'MISINFORMATION', 'VIOLENCE', 'OTHER']),
      details: z.string().optional(),
    });

    const body = schema.parse(request.body);

    const report = await prisma.contentReport.create({
      data: {
        reporterId: authUser.sub,
        ...body,
      },
    });

    return reply.send({ report });
  });

  // GET /admin/reports
  app.get('/admin/reports', { preHandler: authOnRequest }, async (request, reply) => {
    const reports = await prisma.contentReport.findMany({
      where: { status: 'PENDING' },
      include: {
        reporter: {
          select: { id: true, profile: { select: { handle: true, displayName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return reply.send({ reports });
  });

  // POST /admin/reports/:id/resolve
  app.post('/admin/reports/:id/resolve', { preHandler: authOnRequest }, async (request, reply) => {
    const authUser = (request as any).authUser as { sub: string } | undefined;
    const { id } = request.params as { id: string };

    const report = await prisma.contentReport.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        reviewedBy: authUser?.sub,
        reviewedAt: new Date(),
      },
    });

    return reply.send({ report });
  });
}

export default reportsRoutes;
