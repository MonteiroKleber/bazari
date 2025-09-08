import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { env } from './env.js';
import { createLogger } from './plugins/logger.js';
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

// Prisma client singleton
const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Storage adapter baseado no env
const storage: StorageAdapter = 
  env.STORAGE_PROVIDER === 's3' 
    ? new S3Storage() 
    : new LocalFsStorage();

async function buildApp() {
  const app = Fastify({
    logger: createLogger(),
  });

  // Registrar plugins
  await app.register(corsPlugin);
  await app.register(multipartPlugin);
  await app.register(staticPlugin);

  // Registrar rotas
  await app.register(healthRoutes);
  await app.register(mediaRoutes, { prefix: '/', prisma, storage });
  await app.register(categoriesRoutes, { prefix: '/', prisma });
  await app.register(productsRoutes, { prefix: '/', prisma });
  await app.register(servicesRoutes, { prefix: '/', prisma });

  // Rota raiz
  app.get('/', async (request, reply) => {
    return { 
      name: 'Bazari API',
      version: '0.1.0',
      status: 'online',
      endpoints: [
        'GET /healthz',
        'GET /categories',
        'POST /categories/seed',
        'POST /media/upload',
        'GET /media/:id',
        'GET /media/:id/url',
        'POST /products',
        'GET /products/:id',
        'GET /products',
        'POST /services',
        'GET /services/:id',
        'GET /services'
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