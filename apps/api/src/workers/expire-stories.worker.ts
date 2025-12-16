/**
 * Expire Stories Worker
 * Remove stories que expiraram (após 24h)
 * Roda a cada 15 minutos por padrão
 */

import { PrismaClient } from '@prisma/client';

type Logger = {
  info?: (...args: any[]) => void;
  warn?: (...args: any[]) => void;
  error?: (...args: any[]) => void;
  debug?: (...args: any[]) => void;
};

export interface ExpireStoriesResult {
  deleted: number;
  timestamp: Date;
}

export interface StartExpireStoriesWorkerOptions {
  intervalMs?: number;
  logger?: Logger;
  runImmediately?: boolean;
}

/**
 * Executa a limpeza de stories expirados
 */
export async function runExpireStories(
  prisma: PrismaClient,
  logger?: Logger
): Promise<ExpireStoriesResult> {
  const now = new Date();

  // Buscar stories expirados
  const expiredStories = await prisma.story.findMany({
    where: {
      expiresAt: { lt: now },
    },
    select: { id: true, mediaCid: true },
  });

  if (expiredStories.length === 0) {
    return { deleted: 0, timestamp: now };
  }

  const storyIds = expiredStories.map((s) => s.id);

  // Deletar em transação: views, replies, e stories
  await prisma.$transaction([
    // Deletar views dos stories
    prisma.storyView.deleteMany({
      where: { storyId: { in: storyIds } },
    }),
    // Deletar replies dos stories
    prisma.storyReply.deleteMany({
      where: { storyId: { in: storyIds } },
    }),
    // Deletar os stories
    prisma.story.deleteMany({
      where: { id: { in: storyIds } },
    }),
  ]);

  logger?.info?.('[expire-stories]', `Deleted ${expiredStories.length} expired stories`);

  return { deleted: expiredStories.length, timestamp: now };
}

/**
 * Inicia o worker de expiração de stories
 * @param prisma - Cliente Prisma
 * @param options - Opções do worker
 * @returns Timer do setInterval ou null se não iniciado
 */
export function startExpireStoriesWorker(
  prisma: PrismaClient,
  options: StartExpireStoriesWorkerOptions = {}
): NodeJS.Timeout {
  const logger = options.logger ?? console;
  const intervalMs = options.intervalMs ?? 15 * 60 * 1000; // 15 minutos padrão

  let running = false;

  const tick = async () => {
    if (running) {
      logger.debug?.('[expire-stories]', 'Previous execution still running; tick skipped');
      return;
    }
    running = true;
    try {
      const result = await runExpireStories(prisma, logger);
      if (result.deleted > 0) {
        logger.info?.('[expire-stories]', 'Execution completed', {
          deleted: result.deleted,
          timestamp: result.timestamp.toISOString(),
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error?.('[expire-stories]', 'Execution failed', { error: message });
    } finally {
      running = false;
    }
  };

  // Executar imediatamente se configurado (default: true)
  if (options.runImmediately !== false) {
    void tick();
  }

  const timer = setInterval(tick, intervalMs);
  return timer;
}
