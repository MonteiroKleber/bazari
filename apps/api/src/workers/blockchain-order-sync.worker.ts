// @ts-nocheck - Polkadot.js type incompatibilities
/**
 * Blockchain Order Sync Worker
 *
 * Responsabilidades:
 * 1. Retry de orders com status BLOCKCHAIN_FAILED
 * 2. Sincronização de orders PENDING_BLOCKCHAIN que ficaram órfãs
 * 3. Limite de tentativas (MAX_RETRIES) para evitar loop infinito
 *
 * Estratégia:
 * - Executa a cada 5 minutos (configurável)
 * - Busca orders com status BLOCKCHAIN_FAILED ou PENDING_BLOCKCHAIN
 * - Tenta criar on-chain novamente
 * - Se sucesso: status -> CREATED
 * - Se falha: incrementa retries, após MAX_RETRIES mantém BLOCKCHAIN_FAILED
 */
import { PrismaClient } from '@prisma/client';
import { BlockchainService } from '../services/blockchain/blockchain.service.js';

const MAX_RETRIES = 5; // Máximo de tentativas antes de desistir

export interface OrderSyncWorkerOptions {
  logger?: any;
  intervalMs?: number; // Default: 5 minutes (300000ms)
  maxRetries?: number; // Default: 5
}

export interface OrderSyncStats {
  checked: number;
  synced: number;
  failed: number;
  skipped: number; // Orders que atingiram max retries
  errors: number;
  lastRun: Date | null;
}

function decimalToPlanck(value: unknown): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return decimalToPlanck(value.toString());
  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.');
    if (!/^-?\d*(?:\.\d+)?$/.test(normalized)) return 0n;
    const [intPart, fracRaw = ''] = normalized.split('.');
    const frac = (fracRaw + '000000000000').slice(0, 12);
    const i = BigInt(intPart || '0');
    const f = BigInt(frac || '0');
    return i * 10n ** 12n + f;
  }
  try {
    const s = (value as any)?.toString?.();
    if (typeof s === 'string' && s.length > 0) {
      return decimalToPlanck(s);
    }
  } catch {}
  return 0n;
}

export class BlockchainOrderSyncWorker {
  private prisma: PrismaClient;
  private blockchainService: BlockchainService;
  private logger: any;
  private maxRetries: number;
  private intervalHandle: NodeJS.Timeout | null = null;
  private isRunning = false;

  private stats: OrderSyncStats = {
    checked: 0,
    synced: 0,
    failed: 0,
    skipped: 0,
    errors: 0,
    lastRun: null,
  };

  constructor(prisma: PrismaClient, options: OrderSyncWorkerOptions = {}) {
    this.prisma = prisma;
    this.blockchainService = BlockchainService.getInstance();
    this.logger = options.logger || console;
    this.maxRetries = options.maxRetries || MAX_RETRIES;
  }

  /**
   * Executar sincronização uma vez
   */
  async run(): Promise<OrderSyncStats> {
    this.logger.info('[OrderSync] Starting blockchain order sync...');
    this.stats.lastRun = new Date();
    this.stats.checked = 0;
    this.stats.synced = 0;
    this.stats.failed = 0;
    this.stats.skipped = 0;

    try {
      // Buscar orders que precisam de sync
      const pendingOrders = await this.prisma.order.findMany({
        where: {
          OR: [
            { status: 'PENDING_BLOCKCHAIN' },
            {
              status: 'BLOCKCHAIN_FAILED',
              blockchainRetries: { lt: this.maxRetries },
            },
          ],
        },
        include: { items: true },
        orderBy: { createdAt: 'asc' }, // Processar mais antigas primeiro
        take: 50, // Limitar por batch para não sobrecarregar
      });

      this.logger.info(`[OrderSync] Found ${pendingOrders.length} orders to sync`);

      for (const order of pendingOrders) {
        this.stats.checked++;

        // Verificar se atingiu max retries
        if (order.blockchainRetries >= this.maxRetries) {
          this.logger.warn({
            orderId: order.id,
            retries: order.blockchainRetries,
          }, '[OrderSync] Order atingiu max retries, pulando');
          this.stats.skipped++;
          continue;
        }

        try {
          await this.syncOrder(order);
          this.stats.synced++;
        } catch (error) {
          this.stats.failed++;
          this.logger.error({
            err: error,
            orderId: order.id,
          }, '[OrderSync] Falha ao sincronizar order');
        }
      }

      this.logger.info({
        checked: this.stats.checked,
        synced: this.stats.synced,
        failed: this.stats.failed,
        skipped: this.stats.skipped,
      }, '[OrderSync] Sync completed');

      return { ...this.stats };
    } catch (error) {
      this.logger.error(error, '[OrderSync] Worker error');
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Sincronizar uma order específica
   */
  private async syncOrder(order: any): Promise<void> {
    this.logger.info({
      orderId: order.id,
      status: order.status,
      retries: order.blockchainRetries,
    }, '[OrderSync] Sincronizando order...');

    try {
      // Preparar items no formato do pallet
      const blockchainItems = order.items.map((item: any) => ({
        listingId: item.listingId || null,
        name: item.titleSnapshot || 'Item',
        qty: item.qty,
        price: decimalToPlanck(item.unitPriceBzrSnapshot),
      }));

      const escrowAccount = this.blockchainService.getEscrowAccount();

      const blockchainResult = await this.blockchainService.createOrder(
        order.buyerAddr,
        order.sellerAddr,
        0, // marketplace ID
        blockchainItems,
        decimalToPlanck(order.totalBzr),
        escrowAccount
      );

      // Sucesso: Atualizar order
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'CREATED',
          blockchainOrderId: blockchainResult.orderId ? BigInt(blockchainResult.orderId) : null,
          blockchainTxHash: blockchainResult.txHash,
          lastSyncedAt: new Date(),
          blockchainError: null,
        },
      });

      this.logger.info({
        orderId: order.id,
        blockchainOrderId: blockchainResult.orderId,
        txHash: blockchainResult.txHash,
      }, '[OrderSync] Order sincronizada com sucesso');

    } catch (error) {
      // Falha: Incrementar retries
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const newRetries = (order.blockchainRetries || 0) + 1;

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: newRetries >= this.maxRetries ? 'BLOCKCHAIN_FAILED' : 'BLOCKCHAIN_FAILED',
          blockchainRetries: newRetries,
          blockchainError: errorMessage,
        },
      });

      this.logger.warn({
        orderId: order.id,
        retries: newRetries,
        maxRetries: this.maxRetries,
        error: errorMessage,
      }, '[OrderSync] Falha ao sincronizar, retry agendado');

      throw error;
    }
  }

  /**
   * Iniciar worker com intervalo
   */
  start(intervalMs: number = 5 * 60 * 1000): void {
    if (this.isRunning) {
      this.logger.warn('[OrderSync] Worker already running');
      return;
    }

    this.isRunning = true;
    this.logger.info(`[OrderSync] Starting worker with interval ${intervalMs}ms`);

    // Executar imediatamente
    this.run().catch((error) => {
      this.logger.error(error, '[OrderSync] Initial run failed');
    });

    // Agendar execuções periódicas
    this.intervalHandle = setInterval(() => {
      this.run().catch((error) => {
        this.logger.error(error, '[OrderSync] Scheduled run failed');
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
      this.isRunning = false;
      this.logger.info('[OrderSync] Worker stopped');
    }
  }

  /**
   * Obter estatísticas
   */
  getStats(): OrderSyncStats {
    return { ...this.stats };
  }

  /**
   * Forçar retry de uma order específica (útil para admin)
   */
  async forceRetry(orderId: string): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (!['PENDING_BLOCKCHAIN', 'BLOCKCHAIN_FAILED'].includes(order.status)) {
      throw new Error(`Cannot retry order with status ${order.status}`);
    }

    // Reset retries para permitir retry manual
    await this.prisma.order.update({
      where: { id: orderId },
      data: { blockchainRetries: 0 },
    });

    try {
      await this.syncOrder({ ...order, blockchainRetries: 0 });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Helper para iniciar worker
 */
export function startBlockchainOrderSyncWorker(
  prisma: PrismaClient,
  options: OrderSyncWorkerOptions & { intervalMs?: number } = {}
): BlockchainOrderSyncWorker {
  const worker = new BlockchainOrderSyncWorker(prisma, options);
  worker.start(options.intervalMs);
  return worker;
}

/**
 * Helper para executar uma vez (útil para testes/cron)
 */
export async function runOrderSyncOnce(
  prisma: PrismaClient,
  options: OrderSyncWorkerOptions = {}
): Promise<OrderSyncStats> {
  const worker = new BlockchainOrderSyncWorker(prisma, options);
  return worker.run();
}
