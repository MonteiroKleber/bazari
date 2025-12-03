// @ts-nocheck - Polkadot.js type incompatibilities
/**
 * Escrow Auto-Release Worker
 *
 * Executa a cada 1 hora e libera automaticamente escrows que passaram
 * do período configurado (PROPOSAL-001: prazo dinâmico baseado em entrega).
 *
 * Estratégia:
 * - Busca orders com status que podem ter escrow ativo (ESCROWED, SHIPPED)
 * - Query escrow no blockchain para verificar status 'Locked'
 * - Calcula blocos restantes até auto-release (PROPOSAL-001: usa autoReleaseBlocks da order)
 * - VERIFICA SE HÁ DISPUTA ATIVA ANTES DE LIBERAR (Fase 6 - Correção Crítica)
 * - Se blocos <= 0 e sem disputa, chama releaseFunds no pallet
 * - Atualiza DB com status RELEASED
 */
import { PrismaClient } from '@prisma/client';
import { BlockchainService } from '../services/blockchain/blockchain.service.js';
import { getEscrowCalculator } from '../services/escrow/escrow-calculator.service.js';
import type { ApiPromise } from '@polkadot/api';

// Default auto-release (7 days) - used as fallback
const DEFAULT_AUTO_RELEASE_BLOCKS = 100_800; // 7 dias = 100,800 blocos (6s/block)

export interface AutoReleaseWorkerOptions {
  logger?: any;
  dryRun?: boolean; // Se true, apenas loga mas não executa release
  intervalMs?: number; // Intervalo entre execuções (default: 1 hora)
}

export interface AutoReleaseStats {
  checked: number;
  released: number;
  errors: number;
  skipped: number;
  lastRun: Date | null;
}

export class EscrowAutoReleaseWorker {
  private prisma: PrismaClient;
  private blockchainService: BlockchainService;
  private logger: any;
  private dryRun: boolean;
  private intervalHandle: NodeJS.Timeout | null = null;
  private isRunning = false;

  private stats: AutoReleaseStats = {
    checked: 0,
    released: 0,
    errors: 0,
    skipped: 0,
    lastRun: null,
  };

  constructor(prisma: PrismaClient, options: AutoReleaseWorkerOptions = {}) {
    this.prisma = prisma;
    this.blockchainService = BlockchainService.getInstance();
    this.logger = options.logger || console;
    this.dryRun = options.dryRun || false;
  }

  /**
   * Executa uma verificação de auto-release
   */
  async run(): Promise<AutoReleaseStats> {
    if (this.isRunning) {
      this.logger.warn('[AutoRelease] Worker already running, skipping...');
      return { ...this.stats };
    }

    this.isRunning = true;
    this.logger.info('[AutoRelease] Starting auto-release check...');
    this.stats.lastRun = new Date();
    this.stats.checked = 0;
    this.stats.released = 0;
    this.stats.errors = 0;
    this.stats.skipped = 0;

    try {
      const api = await this.blockchainService.getApi();
      const currentBlock = await this.blockchainService.getCurrentBlock();
      const currentBlockNum = Number(currentBlock);

      this.logger.info({ currentBlock: currentBlockNum }, '[AutoRelease] Current block');

      // 1. Buscar orders com status que podem ter escrow ativo
      // Nota: blockchainOrderId é o ID usado no pallet (u64), não o UUID
      const pendingOrders = await this.prisma.order.findMany({
        where: {
          status: {
            in: ['ESCROWED', 'SHIPPED'],
          },
          blockchainOrderId: {
            not: null, // Somente orders que já estão registradas on-chain
          },
        },
        select: {
          id: true,
          blockchainOrderId: true,
          buyerAddr: true,
          sellerAddr: true,
          totalBzr: true,
          status: true,
          // PROPOSAL-001: Include delivery-aware escrow fields
          autoReleaseBlocks: true,
          estimatedDeliveryDays: true,
          shippingMethod: true,
        },
      });

      this.logger.info({ count: pendingOrders.length }, '[AutoRelease] Found orders to check');

      for (const order of pendingOrders) {
        this.stats.checked++;

        try {
          // 2. Query escrow no blockchain usando blockchainOrderId (u64)
          const blockchainOrderId = order.blockchainOrderId!.toString();
          const escrowData = await api.query.bazariEscrow.escrows(blockchainOrderId);

          if (!escrowData || escrowData.isNone) {
            // Escrow não existe on-chain, pular
            this.stats.skipped++;
            continue;
          }

          const escrow = escrowData.unwrap();
          const status = escrow.status?.toString?.() || '';

          // Apenas processar escrows com status 'Locked'
          if (status !== 'Locked') {
            this.stats.skipped++;
            continue;
          }

          // FASE 6 - Verificar status 'Disputed' (caso pallet tenha sido atualizado)
          if (status === 'Disputed') {
            this.logger.info({ orderId: order.id }, '[AutoRelease] Skipping disputed order (escrow status)');
            this.stats.skipped++;
            continue;
          }

          // FASE 6 - Verificar disputa ativa no pallet bazari-dispute
          // Mesmo que escrow status seja Locked, pode haver disputa pendente
          try {
            const hasActiveDispute = await this.checkActiveDispute(api, blockchainOrderId);
            if (hasActiveDispute) {
              this.logger.info({ orderId: order.id, blockchainOrderId }, '[AutoRelease] Skipping - active dispute found in bazari-dispute pallet');
              this.stats.skipped++;
              continue;
            }
          } catch (disputeCheckError) {
            // Se não conseguir verificar, é mais seguro NÃO liberar (fail-safe)
            this.logger.warn({
              orderId: order.id,
              blockchainOrderId,
              error: disputeCheckError instanceof Error ? disputeCheckError.message : 'Unknown error',
            }, '[AutoRelease] Could not check dispute status, skipping for safety');
            this.stats.skipped++;
            continue;
          }

          const lockedAt = escrow.lockedAt?.toNumber?.() || 0;
          const blocksElapsed = currentBlockNum - lockedAt;

          // PROPOSAL-001: Use order's dynamic auto-release blocks or calculate
          const escrowCalculator = getEscrowCalculator();
          const orderAny = order as any;
          const orderAutoReleaseBlocks = orderAny.autoReleaseBlocks
            || escrowCalculator.calculateAutoReleaseBlocks(
                orderAny.estimatedDeliveryDays,
                orderAny.shippingMethod
              );

          const blocksUntilRelease = orderAutoReleaseBlocks - blocksElapsed;

          this.logger.info({
            orderId: order.id,
            lockedAt,
            blocksElapsed,
            blocksUntilRelease,
            autoReleaseBlocks: orderAutoReleaseBlocks, // PROPOSAL-001
          }, '[AutoRelease] Order escrow status');

          // 3. Se passou o período, fazer auto-release
          if (blocksUntilRelease <= 0) {
            this.logger.info({ orderId: order.id, blockchainOrderId }, '[AutoRelease] Order passed auto-release threshold');

            if (this.dryRun) {
              this.logger.info({ orderId: order.id, blockchainOrderId }, '[AutoRelease] DRY RUN - Would release order');
              continue;
            }

            // 4. Chamar releaseFunds no pallet usando blockchainOrderId
            const serverKey = this.blockchainService.getEscrowAccount();
            const tx = api.tx.bazariEscrow.releaseFunds(blockchainOrderId);

            try {
              const result = await this.blockchainService.signAndSend(tx, serverKey);

              this.logger.info({
                orderId: order.id,
                blockchainOrderId,
                txHash: result.txHash,
              }, '[AutoRelease] Released order successfully');

              // 5. Atualizar DB - Order status
              await this.prisma.order.update({
                where: { id: order.id },
                data: { status: 'RELEASED' },
              });

              // 6. Atualizar PaymentIntent se existir
              const paymentIntent = await this.prisma.paymentIntent.findFirst({
                where: { orderId: order.id },
                orderBy: { createdAt: 'desc' },
              });

              if (paymentIntent) {
                await this.prisma.paymentIntent.update({
                  where: { id: paymentIntent.id },
                  data: {
                    txHashRelease: result.txHash,
                    status: 'RELEASED',
                  },
                });
              }

              // 7. Criar log de auto-release
              // PROPOSAL-001: Include auto-release blocks info
              const autoReleaseDays = Math.ceil(orderAutoReleaseBlocks / 14_400);
              await this.prisma.escrowLog.create({
                data: {
                  orderId: order.id,
                  kind: 'AUTO_RELEASE',
                  payloadJson: {
                    blockchainOrderId,
                    txHash: result.txHash,
                    blockNumber: result.blockNumber?.toString() || currentBlockNum.toString(),
                    lockedAt: lockedAt,
                    releasedAt: currentBlockNum,
                    blocksElapsed: blocksElapsed,
                    autoReleaseBlocks: orderAutoReleaseBlocks, // PROPOSAL-001
                    autoReleaseDays, // PROPOSAL-001
                    reason: `Automatic release after ${autoReleaseDays} days (delivery-aware escrow)`,
                    timestamp: new Date().toISOString(),
                  },
                },
              });

              this.stats.released++;
            } catch (releaseError) {
              this.logger.error({
                err: releaseError,
                orderId: order.id,
                blockchainOrderId,
              }, '[AutoRelease] Failed to release order');
              this.stats.errors++;

              // Log erro no DB
              await this.prisma.escrowLog.create({
                data: {
                  orderId: order.id,
                  kind: 'AUTO_RELEASE_ERROR',
                  payloadJson: {
                    blockchainOrderId,
                    error: releaseError instanceof Error ? releaseError.message : 'Unknown error',
                    blocksElapsed: blocksElapsed,
                    timestamp: new Date().toISOString(),
                  },
                },
              });
            }
          }
        } catch (orderError) {
          this.logger.error({
            err: orderError,
            orderId: order.id,
            blockchainOrderId: order.blockchainOrderId,
          }, '[AutoRelease] Error processing order');
          this.stats.errors++;
        }
      }

      this.logger.info({
        checked: this.stats.checked,
        released: this.stats.released,
        skipped: this.stats.skipped,
        errors: this.stats.errors,
      }, '[AutoRelease] Completed');

      return { ...this.stats };
    } catch (error) {
      this.logger.error({ err: error }, '[AutoRelease] Worker error');
      this.stats.errors++;
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Iniciar worker com intervalo
   * @param intervalMs - Intervalo em ms (default: 1 hora)
   */
  start(intervalMs: number = 60 * 60 * 1000): void {
    if (this.intervalHandle) {
      this.logger.warn('[AutoRelease] Worker already started');
      return;
    }

    this.logger.info({ intervalMs }, '[AutoRelease] Starting worker');

    // Executar imediatamente
    this.run().catch((error) => {
      this.logger.error({ err: error }, '[AutoRelease] Initial run failed');
    });

    // Agendar execuções periódicas
    this.intervalHandle = setInterval(() => {
      this.run().catch((error) => {
        this.logger.error({ err: error }, '[AutoRelease] Scheduled run failed');
      });
    }, intervalMs);
  }

  /**
   * Parar worker
   */
  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      this.logger.info('[AutoRelease] Worker stopped');
    }
  }

  /**
   * Obter estatísticas
   */
  getStats(): AutoReleaseStats {
    return { ...this.stats };
  }

  /**
   * FASE 6 - Verificar se existe disputa ativa para o orderId
   *
   * Itera todas as disputas no pallet bazari-dispute e verifica se existe
   * alguma disputa não resolvida para o orderId dado.
   *
   * @param api - ApiPromise do Polkadot.js
   * @param orderId - ID da order a verificar
   * @returns true se há disputa ativa, false caso contrário
   */
  private async checkActiveDispute(api: ApiPromise, orderId: string): Promise<boolean> {
    try {
      // Verifica se o pallet dispute existe
      if (!api.query.bazariDispute?.disputes) {
        this.logger.debug('[AutoRelease] bazariDispute pallet not available, assuming no disputes');
        return false;
      }

      // Iterar todas as disputas
      const disputes = await api.query.bazariDispute.disputes.entries();

      for (const [key, disputeOption] of disputes) {
        // Verificar se é Option e está preenchido
        if (!disputeOption || (disputeOption as any).isNone) {
          continue;
        }

        const dispute = (disputeOption as any).unwrap();
        const disputeOrderId = dispute.orderId?.toString?.() || '';
        const disputeStatus = dispute.status?.toString?.() || '';

        // Comparar orderId (dispute usa u64, orderId do DB é string UUID)
        // Nota: Se o sistema usa UUID no DB mas u64 on-chain, precisa de mapeamento
        // Por enquanto, comparamos como string
        if (disputeOrderId === orderId) {
          // Disputa ativa = não resolvida
          if (disputeStatus !== 'Resolved') {
            this.logger.info({
              orderId,
              disputeId: dispute.disputeId?.toString?.(),
              disputeStatus,
            }, '[AutoRelease] Found active dispute for order');
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      this.logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        orderId,
      }, '[AutoRelease] Error checking disputes in bazari-dispute pallet');
      // Em caso de erro, assumir que pode ter disputa (fail-safe)
      // Isso previne liberação indevida de fundos em caso de problemas
      return true;
    }
  }
}

/**
 * Função helper para iniciar worker (compatível com padrão existente)
 */
export function startEscrowAutoReleaseWorker(
  prisma: PrismaClient,
  options: AutoReleaseWorkerOptions = {}
): EscrowAutoReleaseWorker {
  const worker = new EscrowAutoReleaseWorker(prisma, options);
  worker.start(options.intervalMs);
  return worker;
}

/**
 * Função para executar uma vez (útil para testes e cron jobs)
 */
export async function runAutoReleaseOnce(
  prisma: PrismaClient,
  options: AutoReleaseWorkerOptions = {}
): Promise<AutoReleaseStats> {
  const worker = new EscrowAutoReleaseWorker(prisma, options);
  return worker.run();
}
