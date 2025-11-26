import fp from 'fastify-plugin';
import cors from '@fastify/cors';

// Exportar como named export E default
export const corsPlugin = fp(async function (fastify) {
  // CORS origins by env (comma-separated), fallback to local dev defaults
  const originsEnv = process.env.CORS_ORIGINS || '';
  const parsed = originsEnv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'https://bazari.libervia.xyz',
    'https://bazari-vr.libervia.xyz'
  ];
  const origins = parsed.length > 0 ? [...parsed, ...defaultOrigins] : defaultOrigins;

  await fastify.register(cors, {
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'idempotency-key'],
    exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Request-Duration'],
  });
});

export default corsPlugin;
