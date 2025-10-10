import { PrismaClient } from '@prisma/client';
import { updateTrendingTopics } from '../lib/trendingAlgorithm.js';

const prisma = new PrismaClient();

/**
 * Worker para atualizar trending topics a cada 15 minutos
 */
async function runTrendingWorker() {
  console.log('[Trending Worker] Starting...');

  try {
    await updateTrendingTopics(prisma);
    console.log('[Trending Worker] Successfully updated trending topics');
  } catch (error) {
    console.error('[Trending Worker] Error updating trending topics:', error);
  }
}

// Executar imediatamente ao iniciar
runTrendingWorker();

// Executar a cada 15 minutos
const FIFTEEN_MINUTES = 15 * 60 * 1000;
setInterval(runTrendingWorker, FIFTEEN_MINUTES);

console.log('[Trending Worker] Worker started, will run every 15 minutes');

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[Trending Worker] Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[Trending Worker] Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});
