import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { env } from './config/env.js';

// Routes
import translateRoutes from './routes/translate.js';
import sttRoutes from './routes/stt.js';
import ttsRoutes from './routes/tts.js';
import completeRoutes from './routes/complete.js';
import embedRoutes from './routes/embed.js';

const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'development' ? 'info' : 'warn',
  },
});

async function buildApp() {
  // Plugins
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB max para arquivos de áudio
    },
  });

  // Health check
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'ai-gateway',
      timestamp: Date.now(),
      mockMode: env.AI_MOCK_MODE,
    };
  });

  // AI Routes
  await app.register(translateRoutes, { prefix: '/ai' });
  await app.register(sttRoutes, { prefix: '/ai' });
  await app.register(ttsRoutes, { prefix: '/ai' });
  await app.register(completeRoutes, { prefix: '/ai' });
  await app.register(embedRoutes, { prefix: '/ai' });

  return app;
}

async function start() {
  try {
    const server = await buildApp();

    await server.listen({
      port: parseInt(env.PORT),
      host: '0.0.0.0',
    });

    server.log.info(`🤖 AI Gateway running on port ${env.PORT}`);
    server.log.info(`📡 Mock Mode: ${env.AI_MOCK_MODE ? 'ENABLED' : 'DISABLED'}`);

    if (env.AI_MOCK_MODE) {
      server.log.warn('⚠️  Running in MOCK mode. Real AI models are not being used.');
      server.log.warn('   Configure model endpoints and set AI_MOCK_MODE=false for production.');
    }
  } catch (err) {
    console.error('Failed to start AI Gateway:', err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down AI Gateway gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n👋 Shutting down AI Gateway gracefully...');
  process.exit(0);
});

start();

export { buildApp };
