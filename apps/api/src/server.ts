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
import { securityPlugin } from './plugins/security.js';
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
import { ordersRoutes } from './routes/orders.js';
import { osEnabled, ensureStoreIndex } from './lib/opensearch.js';
import { ensureOsIndex } from './lib/opensearchIndex.js';
import { getPaymentsConfig, getLogSafeConfig } from './config/payments.js';
import { startPaymentsTimeoutWorker } from './workers/paymentsTimeout.js';
import { startP2PTimeoutWorker } from './workers/p2pTimeout.js';
import { startReputationWorker } from './workers/reputation.worker.js';
import { profilesRoutes } from './routes/profiles.js';
import { sellersRoutes } from './routes/sellers.js';
import { socialRoutes } from './routes/social.js';
import { postsRoutes } from './routes/posts.js';
import { storesRoutes } from './routes/stores.js';
import { meProductsRoutes } from './routes/me.products.js';
import { meSellersRoutes } from './routes/me.sellers.js';
import { p2pOffersRoutes } from './routes/p2p.offers.js';
import { p2pOrdersRoutes } from './routes/p2p.orders.js';
import { p2pPaymentProfileRoutes } from './routes/p2p.paymentProfile.js';
import { p2pMessagesRoutes } from './routes/p2p.messages.js';
import { storePublishRoutes } from './routes/storePublish.js';
import { marketplaceRoutes } from './routes/marketplace.js';
import { notificationsRoutes } from './routes/notifications.js';
import { feedRoutes } from './routes/feed.js';
import { achievementsRoutes } from './routes/achievements.js';
import { questsRoutes } from './routes/quests.js';
import { leaderboardsRoutes } from './routes/leaderboards.js';
import { reportsRoutes } from './routes/reports.js';
import { userActionsRoutes } from './routes/userActions.js';
import { analyticsRoutes } from './routes/analytics.js';

const prisma = new PrismaClient();

async function buildApp() {
  // Validar configuração de pagamentos no boot
  try {
    getPaymentsConfig();
    const logConfig = getLogSafeConfig();
    console.log('✅ Configuração de pagamentos carregada:', logConfig);
  } catch (err) {
    console.error('❌ Erro na configuração de pagamentos:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

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
    // Aumentar timeout global para 2 minutos (blockchain pode demorar)
    connectionTimeout: 120000,
    requestTimeout: 120000,
  });

  // Registrar plugins
  await app.register(cookiePlugin);
  await app.register(corsPlugin);
  await app.register(securityPlugin);
  await app.register(multipartPlugin);
  await app.register(staticPlugin);

  // Registrar rotas
  await app.register(healthRoutes, { prisma });
  await app.register(mediaRoutes, { prefix: '/', prisma, storage });
  await app.register(categoriesRoutes, { prefix: '/', prisma });
  await app.register(productsRoutes, { prefix: '/', prisma });
  await app.register(servicesRoutes, { prefix: '/', prisma });
  await app.register(searchRoutes, { prefix: '/', prisma });
  await app.register(authRoutes, { prefix: '/', prisma });
  await app.register(ordersRoutes, { prefix: '/', prisma });
  await app.register(profilesRoutes, { prefix: '/', prisma });
  await app.register(sellersRoutes, { prefix: '/', prisma });
  await app.register(socialRoutes, { prefix: '/', prisma });
  await app.register(postsRoutes, { prefix: '/', prisma });
  await app.register(storesRoutes, { prefix: '/', prisma });
  await app.register(storePublishRoutes, { prefix: '/', prisma });
  await app.register(meProductsRoutes, { prefix: '/', prisma });
  await app.register(meSellersRoutes, { prefix: '/', prisma });
  await app.register(p2pOffersRoutes, { prefix: '/', prisma });
  await app.register(p2pOrdersRoutes, { prefix: '/', prisma });
  await app.register(p2pPaymentProfileRoutes, { prefix: '/', prisma });
  await app.register(p2pMessagesRoutes, { prefix: '/', prisma });
  await app.register(marketplaceRoutes, { prefix: '/' });
  await app.register(notificationsRoutes, { prefix: '/', prisma });
  await app.register(feedRoutes, { prefix: '/', prisma });
  await app.register(achievementsRoutes, { prefix: '/', prisma });
  await app.register(questsRoutes, { prefix: '/', prisma });
  await app.register(leaderboardsRoutes, { prefix: '/', prisma });
  await app.register(reportsRoutes, { prefix: '/', prisma });
  await app.register(userActionsRoutes, { prefix: '/', prisma });
  await app.register(analyticsRoutes, { prefix: '/', prisma });
  // Também expor com prefixo /api para compatibilidade com o front
  await app.register(healthRoutes, { prefix: '/api', prisma });
  await app.register(mediaRoutes, { prefix: '/api', prisma, storage });
  await app.register(categoriesRoutes, { prefix: '/api', prisma });
  await app.register(productsRoutes, { prefix: '/api', prisma });
  await app.register(servicesRoutes, { prefix: '/api', prisma });
  await app.register(searchRoutes, { prefix: '/api', prisma });
  await app.register(authRoutes, { prefix: '/api', prisma });
  await app.register(ordersRoutes, { prefix: '/api', prisma });
  await app.register(profilesRoutes, { prefix: '/api', prisma });
  await app.register(sellersRoutes, { prefix: '/api', prisma });
  await app.register(socialRoutes, { prefix: '/api', prisma });
  await app.register(postsRoutes, { prefix: '/api', prisma });
  await app.register(storesRoutes, { prefix: '/api', prisma });
  await app.register(storePublishRoutes, { prefix: '/api', prisma });
  await app.register(meProductsRoutes, { prefix: '/api', prisma });
  await app.register(meSellersRoutes, { prefix: '/api', prisma });
  await app.register(p2pOffersRoutes, { prefix: '/api', prisma });
  await app.register(p2pOrdersRoutes, { prefix: '/api', prisma });
  await app.register(p2pPaymentProfileRoutes, { prefix: '/api', prisma });
  await app.register(p2pMessagesRoutes, { prefix: '/api', prisma });
  await app.register(marketplaceRoutes, { prefix: '/api' });
  await app.register(notificationsRoutes, { prefix: '/api', prisma });
  await app.register(feedRoutes, { prefix: '/api', prisma });
  await app.register(achievementsRoutes, { prefix: '/api', prisma });
  await app.register(questsRoutes, { prefix: '/api', prisma });
  await app.register(leaderboardsRoutes, { prefix: '/api', prisma });
  await app.register(reportsRoutes, { prefix: '/api', prisma });
  await app.register(userActionsRoutes, { prefix: '/api', prisma });
  await app.register(analyticsRoutes, { prefix: '/api', prisma });

  // Error handler (dev): log detalhado para diagnosticar 500
  if (process.env.NODE_ENV !== 'production') {
    app.setErrorHandler((err, req, reply) => {
      app.log.error({
        msg: 'Unhandled error',
        url: req.url,
        method: req.method,
        params: req.params,
        query: req.query,
        // Não logar bodies por segurança; se precisar, habilitar com cuidado.
        err: {
          message: err.message,
          stack: err.stack,
          code: (err as any).code,
          name: err.name,
        },
      });
      reply.status((err as any).statusCode || 500).send({ statusCode: 500, error: 'Internal Server Error', message: err.message });
    });
  }

  if (osEnabled) {
    try {
      await ensureOsIndex();
      app.log.info('OpenSearch index verificado/criado (ensureOsIndex).');
    } catch (err) {
      app.log.warn({ err }, 'ensureOsIndex falhou; seguimos com Postgres (fallback).');
    }
  }

  // Iniciar worker de timeout em desenvolvimento
  let timeoutWorker: NodeJS.Timeout | null = null;
  let p2pTimeoutWorker: NodeJS.Timeout | null = null;
  let reputationWorker: NodeJS.Timeout | null = null;
  if (process.env.NODE_ENV !== 'production') {
    try {
      timeoutWorker = startPaymentsTimeoutWorker(prisma, {
        maxPendingMs: 15 * 60 * 1000, // 15 minutos
        intervalMs: 60 * 1000, // 1 minuto
      });
      app.log.info('Worker de timeout de payments iniciado (dev)');
    } catch (err) {
      app.log.warn({ err }, 'Falha ao iniciar worker de timeout');
    }
    try {
      p2pTimeoutWorker = startP2PTimeoutWorker(prisma, {
        escrowMs: 10 * 60 * 1000,
        paymentMs: 30 * 60 * 1000,
        confirmMs: 30 * 60 * 1000,
        intervalMs: 60 * 1000,
      });
      app.log.info('Worker de timeout de P2P iniciado (dev)');
    } catch (err) {
      app.log.warn({ err }, 'Falha ao iniciar worker de timeout P2P');
    }
  }

  try {
    reputationWorker = startReputationWorker(prisma, { logger: app.log });
  } catch (err) {
    app.log.warn({ err }, 'Falha ao iniciar worker de reputação');
  }

  // Limpar worker no graceful shutdown
  app.addHook('onClose', async () => {
    if (timeoutWorker) {
      clearInterval(timeoutWorker);
      app.log.info('Worker de timeout parado');
    }
    if (p2pTimeoutWorker) {
      clearInterval(p2pTimeoutWorker);
      app.log.info('Worker de timeout P2P parado');
    }
    if (reputationWorker) {
      clearInterval(reputationWorker);
      app.log.info('Worker de reputação parado');
    }
  });


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

    // Inicializar índice de lojas no OpenSearch
    try {
      await ensureStoreIndex();
      app.log.info('✅ OpenSearch: índice bazari_stores verificado/criado');
    } catch (err) {
      app.log.warn('⚠️ OpenSearch: falha ao criar índice bazari_stores', err);
    }

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
