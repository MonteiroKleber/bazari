// V-2 (2025-09-18): Ajusta env/storages/logger para compatibilidade de tipos
// path: apps/api/src/server.ts

import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { env } from './env.js';
import { createLogger } from './plugins/logger.js';
import { cookiePlugin } from './plugins/cookie.js';
import { corsPlugin } from './plugins/cors.js';
import { multipartPlugin } from './plugins/multipart.js';
import { staticPlugin } from './plugins/static.js';
import { StorageAdapter } from './storage/StorageAdapter.js';
import { LocalFsStorage } from './storage/LocalFsStorage.js';
import { S3Storage } from './storage/S3Storage.js';
import { healthRoutes } from './routes/health.js';
import { mediaRoutes } from './routes/media.js';
import { categoriesRoutes } from './routes/categories.js';
import { productsRoutes } from './routes/products.js';
import { servicesRoutes } from './routes/services.js';
import { searchRoutes } from './routes/search.js';
import { authRoutes } from './routes/auth.js';
import { osEnabled } from './lib/opensearch.js';
import { ensureOsIndex } from './lib/opensearchIndex.js';

const prisma = new PrismaClient();

async function buildApp() {
  // Definir storage adapter
  let storage: StorageAdapter;
  if (env.STORAGE_PROVIDER === 's3') {
    storage = new S3Storage();
  } else {
    storage = new LocalFsStorage();
  }

  const loggerInstance = createLogger();
  const app = Fastify({
    logger: loggerInstance as any,
  });

  // Registrar plugins
  await app.register(cookiePlugin);
  await app.register(corsPlugin);
  await app.register(multipartPlugin);
  await app.register(staticPlugin);

  // Registrar rotas
  await app.register(healthRoutes);
  await app.register(mediaRoutes, { prefix: '/', prisma, storage });
  await app.register(categoriesRoutes, { prefix: '/', prisma });
  await app.register(productsRoutes, { prefix: '/', prisma });
  await app.register(servicesRoutes, { prefix: '/', prisma });
  await app.register(searchRoutes, { prefix: '/', prisma });
  await app.register(authRoutes, { prefix: '/', prisma });
  // Também expor com prefixo /api para compatibilidade com o front
  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(mediaRoutes, { prefix: '/api', prisma, storage });
  await app.register(categoriesRoutes, { prefix: '/api', prisma });
  await app.register(productsRoutes, { prefix: '/api', prisma });
  await app.register(servicesRoutes, { prefix: '/api', prisma });
  await app.register(searchRoutes, { prefix: '/api', prisma });
  await app.register(authRoutes, { prefix: '/api', prisma });

  if (osEnabled) {
    try {
      await ensureOsIndex();
      app.log.info('OpenSearch index verificado/criado (ensureOsIndex).');
    } catch (err) {
      app.log.warn({ err }, 'ensureOsIndex falhou; seguimos com Postgres (fallback).');
    }
  }


  // Rota raiz
  app.get('/', async (request, reply) => {
    return { 
      name: 'Bazari API',
      version: '0.1.0',
      status: 'online',
      endpoints: [
        'GET /healthz',
        'GET /categories',
        'GET /categories/effective-spec',
        'POST /categories/seed',
        'POST /media/upload',
        'GET /media/:id',
        'GET /media/:id/url',
        'POST /products',
        'GET /products/:id',
        'GET /products',
        'POST /services',
        'GET /services/:id',
        'GET /services',
        'GET /search'
      ]
    };
  });

  return app;
}

async function start() {
  try {
    const app = await buildApp();

    // Graceful shutdown
    const closeGracefully = async (signal: string) => {
      app.log.info(`Recebido sinal ${signal}, fechando gracefully...`);
      await app.close();
      await prisma.$disconnect();
      process.exit(0);
    };

    process.on('SIGINT', () => closeGracefully('SIGINT'));
    process.on('SIGTERM', () => closeGracefully('SIGTERM'));

    // Iniciar servidor
    await app.listen({ 
      port: env.PORT, 
      host: '0.0.0.0' 
    });

    app.log.info(`🚀 Servidor rodando em http://localhost:${env.PORT}`);
    app.log.info(`📦 Storage: ${env.STORAGE_PROVIDER.toUpperCase()}`);
    app.log.info(`🗄️ Database: PostgreSQL`);

  } catch (err) {
    console.error('❌ Erro ao iniciar servidor:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Iniciar apenas se for o arquivo principal
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export { buildApp };
