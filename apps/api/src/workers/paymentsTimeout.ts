// path: apps/api/src/workers/paymentsTimeout.ts

import { PrismaClient } from '@prisma/client';

export interface PaymentsTimeoutOptions {
  maxPendingMs?: number;
}

export async function runPaymentsTimeout(
  prisma: PrismaClient,
  options: PaymentsTimeoutOptions = {}
): Promise<{ processed: number; timedOut: number }> {
  const { maxPendingMs = 15 * 60 * 1000 } = options; // 15 minutos padrão

  const cutoffTime = new Date(Date.now() - maxPendingMs);

  try {
    // Buscar intents pendentes antigas sem txHashIn
    const expiredIntents = await prisma.paymentIntent.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lt: cutoffTime,
        },
        txHashIn: null,
      },
      include: {
        order: true,
      },
    });

    let timedOutCount = 0;

    for (const intent of expiredIntents) {
      try {
        // Criar log de timeout
        await prisma.escrowLog.create({
          data: {
            orderId: intent.orderId,
            kind: 'TIMEOUT',
            payloadJson: {
              intentId: intent.id,
              timeoutAt: new Date().toISOString(),
              createdAt: intent.createdAt.toISOString(),
              maxPendingMs,
              reason: 'Payment intent expirou sem recebimento de fundos',
            },
          },
        });

        // Atualizar status do intent para TIMEOUT
        await prisma.paymentIntent.update({
          where: { id: intent.id },
          data: { status: 'TIMEOUT' },
        });

        // Se a order ainda estiver PENDING, marcar como TIMEOUT também
        if (intent.order.status === 'PENDING') {
          await prisma.order.update({
            where: { id: intent.orderId },
            data: { status: 'TIMEOUT' },
          });
        }

        timedOutCount++;
      } catch (err) {
        // Log do erro mas continue processando outros intents
        console.error(`Erro ao processar timeout do intent ${intent.id}:`, err);
      }
    }

    return {
      processed: expiredIntents.length,
      timedOut: timedOutCount,
    };
  } catch (err) {
    console.error('Erro no worker de timeout de payments:', err);
    throw err;
  }
}

export function startPaymentsTimeoutWorker(
  prisma: PrismaClient,
  options: PaymentsTimeoutOptions & { intervalMs?: number } = {}
): NodeJS.Timeout {
  const { intervalMs = 60 * 1000, ...timeoutOptions } = options; // 1 minuto padrão

  const intervalId = setInterval(async () => {
    try {
      const result = await runPaymentsTimeout(prisma, timeoutOptions);
      if (result.timedOut > 0) {
        console.log(`Worker timeout: processados ${result.processed}, timeout ${result.timedOut} intents`);
      }
    } catch (err) {
      console.warn('Worker timeout falhou:', err);
    }
  }, intervalMs);

  return intervalId;
}