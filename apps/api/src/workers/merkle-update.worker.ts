// @ts-nocheck - Polkadot.js type incompatibilities
/**
 * Merkle Update Worker
 * Atualiza Merkle roots de reviews on-chain periodicamente
 * Strategy: Roda a cada 1 hora para encontrar couriers com >= 100 reviews pendentes
 */
import { PrismaClient } from '@prisma/client';
import { ReviewService } from '../services/review.service.js';
import { BlockchainService } from '../services/blockchain/blockchain.service.js';

export interface MerkleUpdateWorkerOptions {
  logger?: any;
  intervalMs?: number; // Default: 1 hour (3600000ms)
  threshold?: number; // Default: 100 reviews
  dryRun?: boolean; // If true, only logs without updating blockchain
}

export interface MerkleUpdateResult {
  timestamp: Date;
  couriersProcessed: number;
  couriersUpdated: number;
  couriersSkipped: number;
  errors: number;
  details: Array<{
    courierId: string;
    pendingReviews: number;
    action: 'updated' | 'skipped' | 'error';
    merkleRoot?: string;
    txHash?: string;
    reason?: string;
  }>;
}

export class MerkleUpdateWorker {
  private prisma: PrismaClient;
  private reviewService: ReviewService;
  private blockchainService: BlockchainService;
  private logger: any;
  private intervalMs: number;
  private threshold: number;
  private dryRun: boolean;
  private isRunning = false;
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor(prisma: PrismaClient, options: MerkleUpdateWorkerOptions = {}) {
    this.prisma = prisma;
    this.blockchainService = BlockchainService.getInstance();
    this.reviewService = new ReviewService(prisma, this.blockchainService);
    this.logger = options.logger || console;
    this.intervalMs = options.intervalMs || 3600000; // 1 hour
    this.threshold = options.threshold || 100;
    this.dryRun = options.dryRun || false;
  }

  /**
   * Iniciar worker com intervalos periódicos
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('[MerkleUpdate] Worker already running');
      return;
    }

    this.logger.info('[MerkleUpdate] Starting worker...', {
      intervalMs: this.intervalMs,
      threshold: this.threshold,
      dryRun: this.dryRun,
    });

    this.isRunning = true;

    // Executar imediatamente ao iniciar
    await this.runUpdate();

    // Agendar execuções periódicas
    this.intervalHandle = setInterval(async () => {
      await this.runUpdate();
    }, this.intervalMs);

    this.logger.info('[MerkleUpdate] ✅ Worker started successfully');
  }

  /**
   * Parar worker
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('[MerkleUpdate] Stopping worker...');

    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }

    this.isRunning = false;
    this.logger.info('[MerkleUpdate] Worker stopped');
  }

  /**
   * Executar update manual (pode ser chamado externamente)
   */
  async runUpdate(): Promise<MerkleUpdateResult> {
    const startTime = Date.now();
    this.logger.info('[MerkleUpdate] Starting Merkle root update cycle...');

    const result: MerkleUpdateResult = {
      timestamp: new Date(),
      couriersProcessed: 0,
      couriersUpdated: 0,
      couriersSkipped: 0,
      errors: 0,
      details: [],
    };

    try {
      // 1. Buscar couriers com reviews pendentes
      const couriersWithPendingReviews = await this.prisma.courierReview.groupBy({
        by: ['courierId'],
        where: {
          merkleIncluded: false,
        },
        _count: {
          merkleIncluded: true,
        },
        having: {
          merkleIncluded: {
            _count: {
              gte: this.threshold,
            },
          },
        },
      });

      this.logger.info(`[MerkleUpdate] Found ${couriersWithPendingReviews.length} couriers with >= ${this.threshold} pending reviews`);

      result.couriersProcessed = couriersWithPendingReviews.length;

      // 2. Processar cada courier
      for (const group of couriersWithPendingReviews) {
        const courierId = group.courierId;
        const pendingCount = group._count.merkleIncluded;

        this.logger.info(`[MerkleUpdate] Processing courier ${courierId} (${pendingCount} pending reviews)`);

        try {
          if (this.dryRun) {
            // Dry run: apenas simular
            this.logger.info(`[MerkleUpdate] [DRY RUN] Would update Merkle root for courier ${courierId}`);
            result.couriersSkipped++;
            result.details.push({
              courierId,
              pendingReviews: pendingCount,
              action: 'skipped',
              reason: 'Dry run mode',
            });
          } else {
            // Real update: chamar ReviewService.updateMerkleRoot()
            // NOTA: Não temos wallet do courier aqui, então vamos usar o escrow account
            // Em produção, isso seria feito pelo próprio courier ou por um relayer autorizado
            const courierWallet = this.blockchainService.getEscrowAccount();

            const merkleRoot = await this.reviewService.updateMerkleRoot(courierId, courierWallet);

            result.couriersUpdated++;
            result.details.push({
              courierId,
              pendingReviews: pendingCount,
              action: 'updated',
              merkleRoot,
            });

            this.logger.info(`[MerkleUpdate] ✅ Updated Merkle root for courier ${courierId}: ${merkleRoot}`);
          }
        } catch (error: any) {
          result.errors++;
          result.details.push({
            courierId,
            pendingReviews: pendingCount,
            action: 'error',
            reason: error.message,
          });

          this.logger.error(`[MerkleUpdate] Failed to update courier ${courierId}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      this.logger.info('[MerkleUpdate] Update cycle completed', {
        duration: `${duration}ms`,
        processed: result.couriersProcessed,
        updated: result.couriersUpdated,
        skipped: result.couriersSkipped,
        errors: result.errors,
      });
    } catch (error) {
      this.logger.error('[MerkleUpdate] Update cycle failed:', error);
      throw error;
    }

    return result;
  }

  /**
   * Forçar update para um courier específico (útil para testes)
   */
  async forceCourierUpdate(courierId: string, courierWallet?: any): Promise<string> {
    this.logger.info(`[MerkleUpdate] Forcing Merkle root update for courier ${courierId}`);

    const wallet = courierWallet || this.blockchainService.getEscrowAccount();
    const merkleRoot = await this.reviewService.updateMerkleRoot(courierId, wallet);

    this.logger.info(`[MerkleUpdate] ✅ Forced update completed: ${merkleRoot}`);

    return merkleRoot;
  }

  /**
   * Obter estatísticas de reviews pendentes
   */
  async getPendingStats(): Promise<{
    totalPending: number;
    couriersPendingUpdate: number;
    courierStats: Array<{ courierId: string; pendingCount: number }>;
  }> {
    const [totalPending, couriersPending] = await Promise.all([
      // Total de reviews pendentes
      this.prisma.courierReview.count({
        where: { merkleIncluded: false },
      }),

      // Couriers com >= threshold reviews pendentes
      this.prisma.courierReview.groupBy({
        by: ['courierId'],
        where: {
          merkleIncluded: false,
        },
        _count: {
          merkleIncluded: true,
        },
        having: {
          merkleIncluded: {
            _count: {
              gte: this.threshold,
            },
          },
        },
      }),
    ]);

    return {
      totalPending,
      couriersPendingUpdate: couriersPending.length,
      courierStats: couriersPending.map((group) => ({
        courierId: group.courierId,
        pendingCount: group._count.merkleIncluded,
      })),
    };
  }
}

/**
 * Função helper para iniciar worker (compatível com padrão existente)
 */
export function startMerkleUpdateWorker(
  prisma: PrismaClient,
  options: MerkleUpdateWorkerOptions = {}
): MerkleUpdateWorker {
  const worker = new MerkleUpdateWorker(prisma, options);

  // Iniciar worker de forma assíncrona
  worker.start().catch((error) => {
    if (options.logger) {
      options.logger.error('[MerkleUpdate] Failed to start worker:', error);
    } else {
      console.error('[MerkleUpdate] Failed to start worker:', error);
    }
  });

  return worker;
}
