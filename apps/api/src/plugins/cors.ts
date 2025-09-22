import fp from 'fastify-plugin';
import cors from '@fastify/cors';

// Exportar como named export E default
export const corsPlugin = fp(async function (fastify) {
  await fastify.register(cors, {
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'idempotency-key'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
  });
});

export default corsPlugin;
