import { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/healthz', async (request, reply) => {
    const healthcheck = {
      ok: true,
      version: '0.1.0',
      env: process.env.NODE_ENV || 'development',
      now: new Date().toISOString(),
      uptime: process.uptime(),
    };

    reply.status(200).send(healthcheck);
  });
}