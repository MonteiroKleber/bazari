import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { getIpfsHealth, getIpfsInfo } from '../lib/ipfs.js';

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

  // IPFS Health Check
  app.get('/health/ipfs', async (_request, reply) => {
    const started = Date.now();

    try {
      // Informações sobre o pool
      const info = getIpfsInfo();

      // Health check de todos os nós
      const nodes = await getIpfsHealth();

      const allHealthy = nodes.every((n) => n.healthy);
      const healthyCount = nodes.filter((n) => n.healthy).length;

      const result = {
        status: allHealthy ? 'ok' : healthyCount > 0 ? 'degraded' : 'down',
        configured: info.configured,
        nodeCount: info.nodeCount,
        healthyNodes: healthyCount,
        totalNodes: nodes.length,
        nodes,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - started,
      };

      const statusCode = allHealthy ? 200 : healthyCount > 0 ? 206 : 503;
      return reply.status(statusCode).send(result);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return reply.status(500).send({
        status: 'error',
        error: errorMsg,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - started,
      });
    }
  });
}
