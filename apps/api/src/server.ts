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
import { vrRoutes } from './routes/vr.js';
import { ordersRoutes } from './routes/orders.js';
import { osEnabled, ensureStoreIndex } from './lib/opensearch.js';
import { ensureOsIndex } from './lib/opensearchIndex.js';
import { getPaymentsConfig, getLogSafeConfig } from './config/payments.js';
import { startPaymentsTimeoutWorker } from './workers/paymentsTimeout.js';
import { startP2PTimeoutWorker } from './workers/p2pTimeout.js';
import { startReputationWorker } from './workers/reputation.worker.js';
import { startGovernanceSyncWorker } from './workers/governance-sync.worker.js';
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
import { p2pZariRoutes } from './routes/p2p.zari.js';
import { storePublishRoutes } from './routes/storePublish.js';
import { marketplaceRoutes } from './routes/marketplace.js';
import { notificationsRoutes } from './routes/notifications.js';
import { governanceRoutes } from './routes/governance.js';
import { governanceTreasuryRoutes } from './routes/governance-treasury.js';
import { feedRoutes } from './routes/feed.js';
import { achievementsRoutes } from './routes/achievements.js';
import { questsRoutes } from './routes/quests.js';
import { leaderboardsRoutes } from './routes/leaderboards.js';
import { reportsRoutes } from './routes/reports.js';
import { userActionsRoutes } from './routes/userActions.js';
import { analyticsRoutes } from './routes/analytics.js';
import { setupChatWebSocket } from './chat/ws/server.js';
import { setupVRWebSocket } from './vr/ws/server.js';
import chatThreadsRoutes from './chat/routes/chat.threads.js';
import chatMessagesRoutes from './chat/routes/chat.messages.js';
import chatUploadRoutes from './chat/routes/chat.upload.js';
import chatGroupsRoutes from './chat/routes/chat.groups.js';
import chatOrdersRoutes from './chat/routes/chat.orders.js';
import chatSettingsRoutes from './chat/routes/chat.settings.js';
import chatAiRoutes from './chat/routes/chat.ai.js';
import chatMissionsRoutes from './chat/routes/chat.missions.js';
import chatOpportunitiesRoutes from './chat/routes/chat.opportunities.js';
import chatRankingRoutes from './chat/routes/chat.ranking.js';
import chatCallsRoutes from './chat/routes/chat.calls.js';
import { chatKeysRoutes } from './chat/routes/chat.keys.js';
import chatAffiliatesRoutes from './chat/routes/chat.affiliates.js';
import affiliatesRoutes from './routes/affiliates.js';
import { deliveryRoutes } from './routes/delivery.js';
import { deliveryProfileRoutes } from './routes/delivery-profile.js';
import { deliveryPartnerRoutes } from './routes/delivery-partners.js';
import { vestingRoutes } from './routes/vesting.js';
import { escrowRoutes } from './routes/blockchain/escrow.js';
import { governanceRoutes as blockchainGovernanceRoutes } from './routes/blockchain/governance.js';
import { commerceRoutes } from './routes/blockchain/commerce.js';
import { blockchainUtilsRoutes } from './routes/blockchain/utils.js';
import { BlockchainService } from './services/blockchain/blockchain.service.js';
import { vrStoresRoute } from './routes/vr/stores.js';
import { vrEventsRoute } from './routes/vr/events.js';
import { vrSessionsRoute } from './routes/vr/sessions.js';
import authSocialRoutes from './routes/auth-social.js';
import { socialBackupRoutes } from './routes/social-backup.js';

// Import workers with side effects
import './workers/affiliate-stats.worker.js';

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

  // Conectar ao blockchain node
  // TODO: Revisar como gerenciar server key (atualmente usa //Alice em dev, mnemonic em prod)
  const blockchainService = BlockchainService.getInstance();
  try {
    await blockchainService.connect();
    console.log('✅ Blockchain connected');
  } catch (err) {
    console.error('❌ Blockchain connection failed:', err);
    // Continuar sem blockchain (degraded mode)
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

  // Rate limiting global
  await app.register(import('@fastify/rate-limit'), {
    global: false, // Aplicar apenas em rotas específicas
    max: 100,
    timeWindow: '1 minute'
  });

  // Registrar rotas
  await app.register(healthRoutes, { prisma });
  await app.register(mediaRoutes, { prefix: '/', prisma, storage });
  await app.register(categoriesRoutes, { prefix: '/', prisma });
  await app.register(productsRoutes, { prefix: '/', prisma });
  await app.register(servicesRoutes, { prefix: '/', prisma });
  await app.register(searchRoutes, { prefix: '/', prisma });
  await app.register(authRoutes, { prefix: '/', prisma });
  await app.register(authSocialRoutes, { prefix: '/', prisma });
  await app.register(socialBackupRoutes, { prefix: '/' });
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
  await app.register(p2pZariRoutes, { prefix: '/', prisma });
  await app.register(marketplaceRoutes, { prefix: '/' });
  await app.register(notificationsRoutes, { prefix: '/', prisma });
  await app.register(governanceRoutes, { prefix: '/', prisma });
  await app.register(governanceTreasuryRoutes, { prefix: '/' });
  await app.register(vestingRoutes, { prefix: '/' });
  await app.register(feedRoutes, { prefix: '/', prisma });
  await app.register(achievementsRoutes, { prefix: '/', prisma });
  await app.register(questsRoutes, { prefix: '/', prisma });
  await app.register(leaderboardsRoutes, { prefix: '/', prisma });
  await app.register(reportsRoutes, { prefix: '/', prisma });
  await app.register(userActionsRoutes, { prefix: '/', prisma });
  await app.register(analyticsRoutes, { prefix: '/', prisma });
  await app.register(affiliatesRoutes, { prefix: '/affiliates' });
  // Também expor com prefixo /api para compatibilidade com o front
  await app.register(healthRoutes, { prefix: '/api', prisma });
  await app.register(mediaRoutes, { prefix: '/api', prisma, storage });
  await app.register(categoriesRoutes, { prefix: '/api', prisma });
  await app.register(productsRoutes, { prefix: '/api', prisma });
  await app.register(servicesRoutes, { prefix: '/api', prisma });
  await app.register(searchRoutes, { prefix: '/api', prisma });
  await app.register(authRoutes, { prefix: '/api', prisma });
  await app.register(authSocialRoutes, { prefix: '/api', prisma });
  await app.register(socialBackupRoutes, { prefix: '/api' });
  await app.register(vrRoutes, { prefix: '/api', prisma });
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
  await app.register(p2pZariRoutes, { prefix: '/api', prisma });
  await app.register(marketplaceRoutes, { prefix: '/api' });
  await app.register(notificationsRoutes, { prefix: '/api', prisma });
  await app.register(governanceRoutes, { prefix: '/api', prisma });
  await app.register(governanceTreasuryRoutes, { prefix: '/api' });
  await app.register(vestingRoutes, { prefix: '/api' });
  await app.register(feedRoutes, { prefix: '/api', prisma });
  await app.register(achievementsRoutes, { prefix: '/api', prisma });
  await app.register(questsRoutes, { prefix: '/api', prisma });
  await app.register(leaderboardsRoutes, { prefix: '/api', prisma });
  await app.register(reportsRoutes, { prefix: '/api', prisma });
  await app.register(userActionsRoutes, { prefix: '/api', prisma });
  await app.register(analyticsRoutes, { prefix: '/api', prisma });
  await app.register(affiliatesRoutes, { prefix: '/api/affiliates' });

  // Chat routes
  await app.register(chatThreadsRoutes, { prefix: '/api' });
  await app.register(chatMessagesRoutes, { prefix: '/api' });
  await app.register(chatUploadRoutes, { prefix: '/api' });
  await app.register(chatGroupsRoutes, { prefix: '/api' });
  await app.register(chatOrdersRoutes, { prefix: '/api' });
  await app.register(chatSettingsRoutes, { prefix: '/api' });
  await app.register(chatAiRoutes, { prefix: '/api' });
  await app.register(chatMissionsRoutes, { prefix: '/api' });
  await app.register(chatOpportunitiesRoutes, { prefix: '/api' });
  await app.register(chatRankingRoutes, { prefix: '/api' });
  await app.register(chatCallsRoutes, { prefix: '/api' });
  await app.register(chatKeysRoutes, { prefix: '/api/chat' });
  await app.register(chatAffiliatesRoutes, { prefix: '/api' });

  // Delivery routes
  await app.register(deliveryRoutes, { prefix: '/api', prisma });
  await app.register(deliveryProfileRoutes, { prefix: '/api', prisma });
  await app.register(deliveryPartnerRoutes, { prefix: '/api', prisma });

  // Blockchain routes (escrow, governance, commerce, utils)
  await app.register(escrowRoutes, { prefix: '/api/blockchain', prisma });
  await app.register(blockchainGovernanceRoutes, { prefix: '/api/blockchain' });
  await app.register(commerceRoutes, { prefix: '/api/blockchain' });
  await app.register(blockchainUtilsRoutes, { prefix: '/api/blockchain' });

  // VR routes
  await app.register(vrStoresRoute, { prefix: '/api/vr', prisma });
  await app.register(vrEventsRoute, { prefix: '/api/vr', prisma });
  await app.register(vrSessionsRoute, { prefix: '/api/vr', prisma });

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
  let governanceSyncWorker: any = null;
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

  // Iniciar Governance Sync Worker (escuta eventos da blockchain)
  try {
    governanceSyncWorker = startGovernanceSyncWorker(prisma, { logger: app.log });
    app.log.info('Worker de sincronização de governança iniciado');
  } catch (err) {
    app.log.warn({ err }, 'Falha ao iniciar worker de sincronização de governança');
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
    if (governanceSyncWorker) {
      await governanceSyncWorker.stop();
      app.log.info('Worker de sincronização de governança parado');
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

    // Setup Chat WebSocket
    await setupChatWebSocket(app);

    // Setup VR WebSocket
    await setupVRWebSocket(app, prisma);

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
