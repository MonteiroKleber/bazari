import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

export async function healthRoutes(app: FastifyInstance, opts?: { prisma?: PrismaClient }) {
  app.get('/healthz', async (_request, reply) => {
    reply.status(200).send({ ok: true, now: new Date().toISOString() });
  });

  // Extended health with DB
  app.get('/health', async (_request, reply) => {
    const started = Date.now();
    let dbOk = false;
    try {
      if (opts?.prisma) {
        await opts.prisma.$queryRaw`SELECT 1`;
        dbOk = true;
      }
    } catch {
      dbOk = false;
    }
    const health = {
      ok: dbOk,
      db: dbOk ? 'ok' : 'fail',
      env: process.env.NODE_ENV || 'development',
      ts: new Date().toISOString(),
      uptime: process.uptime(),
      durationMs: Date.now() - started,
    };
    reply.code(dbOk ? 200 : 500).send(health);
  });
}
