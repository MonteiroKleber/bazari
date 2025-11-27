// @ts-nocheck - Polkadot.js type incompatibilities
/**
 * Blockchain Sync Worker
 * Escuta eventos da blockchain e sincroniza com PostgreSQL
 * Focus: Commerce events (OrderCreated, ProofSubmitted, DisputeOpened)
 *
 * Strategy:
 * - Event-driven: Escuta eventos em tempo real
 * - Heartbeat: Verifica conexão a cada 5 minutos
 * - Auto-reconnect: Reconecta automaticamente se conexão cair
 */
import { PrismaClient } from '@prisma/client';
import { BlockchainEventsService } from '../services/blockchain/blockchain-events.service.js';
import { BlockchainService } from '../services/blockchain/blockchain.service.js';
import type {
  OrderCreatedEvent,
  ProofSubmittedEvent,
  DisputeOpenedEvent,
  EscrowLockedEvent,
  FundsReleasedEvent,
  BuyerRefundedEvent,
} from '../services/blockchain/blockchain-events.service.js';

export interface BlockchainSyncWorkerOptions {
  logger?: any;
  heartbeatIntervalMs?: number; // Default: 5 minutes (300000ms)
  reconnectDelayMs?: number; // Default: 5 seconds (5000ms)
  maxReconnectAttempts?: number; // Default: 10
}

export interface SyncStats {
  ordersCreated: number;
  proofsSubmitted: number;
  disputesOpened: number;
  escrowsLocked: number;
  fundsReleased: number;
  buyersRefunded: number;
  errors: number;
  lastHeartbeat: Date | null;
  lastEvent: Date | null;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}

export class BlockchainSyncWorker {
  private prisma: PrismaClient;
  private eventsService: BlockchainEventsService;
  private blockchainService: BlockchainService;
  private logger: any;
  private heartbeatIntervalMs: number;
  private reconnectDelayMs: number;
  private maxReconnectAttempts: number;
  private isRunning = false;
  private heartbeatHandle: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;

  // Stats
  private stats: SyncStats = {
    ordersCreated: 0,
    proofsSubmitted: 0,
    disputesOpened: 0,
    escrowsLocked: 0,
    fundsReleased: 0,
    buyersRefunded: 0,
    errors: 0,
    lastHeartbeat: null,
    lastEvent: null,
    connectionStatus: 'disconnected',
  };

  constructor(prisma: PrismaClient, options: BlockchainSyncWorkerOptions = {}) {
    this.prisma = prisma;
    this.eventsService = BlockchainEventsService.getInstance();
    this.blockchainService = BlockchainService.getInstance();
    this.logger = options.logger || console;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs || 300000; // 5 minutes
    this.reconnectDelayMs = options.reconnectDelayMs || 5000; // 5 seconds
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
  }

  /**
   * Iniciar worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('[BlockchainSync] Worker already running');
      return;
    }

    this.logger.info('[BlockchainSync] Starting worker...', {
      heartbeatIntervalMs: this.heartbeatIntervalMs,
    });

    this.isRunning = true;

    // Registrar handlers de eventos
    this.eventsService.setHandlers({
      onOrderCreated: this.handleOrderCreated.bind(this),
      onProofSubmitted: this.handleProofSubmitted.bind(this),
      onDisputeOpened: this.handleDisputeOpened.bind(this),
      onEscrowLocked: this.handleEscrowLocked.bind(this),
      onFundsReleased: this.handleFundsReleased.bind(this),
      onBuyerRefunded: this.handleBuyerRefunded.bind(this),
      onError: this.handleError.bind(this),
    });

    // Iniciar escuta de eventos
    try {
      await this.eventsService.startListening();
      this.stats.connectionStatus = 'connected';
      this.reconnectAttempts = 0;

      this.logger.info('[BlockchainSync] ✅ Connected to blockchain');
    } catch (error) {
      this.logger.error('[BlockchainSync] Failed to connect to blockchain:', error);
      this.stats.connectionStatus = 'disconnected';
      // Tentar reconectar
      this.scheduleReconnect();
    }

    // Iniciar heartbeat
    this.startHeartbeat();

    this.logger.info('[BlockchainSync] ✅ Worker started successfully');
  }

  /**
   * Parar worker
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('[BlockchainSync] Stopping worker...');

    // Parar heartbeat
    if (this.heartbeatHandle) {
      clearInterval(this.heartbeatHandle);
      this.heartbeatHandle = null;
    }

    // Parar escuta de eventos
    await this.eventsService.stopListening();

    this.isRunning = false;
    this.stats.connectionStatus = 'disconnected';
    this.logger.info('[BlockchainSync] Worker stopped');
  }

  /**
   * Heartbeat: Verifica conexão periodicamente
   */
  private startHeartbeat(): void {
    this.heartbeatHandle = setInterval(async () => {
      this.stats.lastHeartbeat = new Date();

      try {
        // Verificar se a conexão está ativa
        const api = await this.blockchainService.getApi();
        const isConnected = api.isConnected;

        if (!isConnected && this.stats.connectionStatus === 'connected') {
          this.logger.warn('[BlockchainSync] Connection lost, attempting to reconnect...');
          this.stats.connectionStatus = 'disconnected';
          this.scheduleReconnect();
        } else if (isConnected && this.stats.connectionStatus !== 'connected') {
          this.logger.info('[BlockchainSync] Connection restored');
          this.stats.connectionStatus = 'connected';
          this.reconnectAttempts = 0;
        }

        this.logger.info('[BlockchainSync] Heartbeat OK', {
          connectionStatus: this.stats.connectionStatus,
          stats: {
            ordersCreated: this.stats.ordersCreated,
            proofsSubmitted: this.stats.proofsSubmitted,
            disputesOpened: this.stats.disputesOpened,
            escrowsLocked: this.stats.escrowsLocked,
            fundsReleased: this.stats.fundsReleased,
            buyersRefunded: this.stats.buyersRefunded,
            errors: this.stats.errors,
          },
        });
      } catch (error) {
        this.logger.error('[BlockchainSync] Heartbeat check failed:', error);
        this.stats.connectionStatus = 'disconnected';
        this.scheduleReconnect();
      }
    }, this.heartbeatIntervalMs);
  }

  /**
   * Agendar reconexão
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('[BlockchainSync] Max reconnect attempts reached, giving up');
      this.stats.connectionStatus = 'disconnected';
      return;
    }

    this.reconnectAttempts++;
    this.stats.connectionStatus = 'reconnecting';

    this.logger.info(`[BlockchainSync] Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelayMs}ms`);

    setTimeout(async () => {
      try {
        await this.eventsService.stopListening();
        await this.eventsService.startListening();
        this.stats.connectionStatus = 'connected';
        this.reconnectAttempts = 0;
        this.logger.info('[BlockchainSync] ✅ Reconnected successfully');
      } catch (error) {
        this.logger.error('[BlockchainSync] Reconnect failed:', error);
        this.scheduleReconnect();
      }
    }, this.reconnectDelayMs * this.reconnectAttempts); // Exponential backoff
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handler: OrderCreated
   * Salva pedido no PostgreSQL
   */
  private async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    this.logger.info('[BlockchainSync] Processing OrderCreated event:', {
      orderId: event.orderId,
      buyer: event.buyer,
      seller: event.seller,
      totalAmount: event.totalAmount,
    });

    this.stats.lastEvent = new Date();

    try {
      // Verificar se o pedido já existe (evitar duplicatas)
      const existingOrder = await this.prisma.blockchainOrder.findUnique({
        where: { orderId: event.orderId },
      });

      if (existingOrder) {
        this.logger.info(`[BlockchainSync] Order ${event.orderId} already exists, skipping`);
        return;
      }

      // Salvar pedido no banco
      await this.prisma.blockchainOrder.create({
        data: {
          orderId: event.orderId,
          buyer: event.buyer,
          seller: event.seller,
          marketplace: event.marketplace,
          totalAmount: event.totalAmount,
          status: 'CREATED',
          txHash: event.txHash,
          blockNumber: event.blockNumber,
          createdAt: new Date(),
        },
      });

      this.stats.ordersCreated++;
      this.logger.info(`[BlockchainSync] ✅ Saved order #${event.orderId} to database`);
    } catch (error) {
      this.stats.errors++;
      this.logger.error('[BlockchainSync] Error saving OrderCreated:', error);
    }
  }

  /**
   * Handler: ProofSubmitted
   * Salva prova de entrega no PostgreSQL
   */
  private async handleProofSubmitted(event: ProofSubmittedEvent): Promise<void> {
    this.logger.info('[BlockchainSync] Processing ProofSubmitted event:', {
      orderId: event.orderId,
      proofCid: event.proofCid,
      attestor: event.attestor,
    });

    this.stats.lastEvent = new Date();

    try {
      // Verificar se a prova já existe
      const existingProof = await this.prisma.deliveryProof.findFirst({
        where: {
          orderId: event.orderId,
          proofCid: event.proofCid,
        },
      });

      if (existingProof) {
        this.logger.info(`[BlockchainSync] Proof for order ${event.orderId} already exists, skipping`);
        return;
      }

      // Salvar prova no banco
      await this.prisma.deliveryProof.create({
        data: {
          orderId: event.orderId,
          proofCid: event.proofCid,
          attestor: event.attestor,
          txHash: event.txHash,
          blockNumber: event.blockNumber,
          submittedAt: new Date(),
        },
      });

      // Atualizar status do pedido (se existir)
      await this.prisma.blockchainOrder.updateMany({
        where: { orderId: event.orderId },
        data: { status: 'PROOF_SUBMITTED' },
      });

      this.stats.proofsSubmitted++;
      this.logger.info(`[BlockchainSync] ✅ Saved proof for order #${event.orderId}`);
    } catch (error) {
      this.stats.errors++;
      this.logger.error('[BlockchainSync] Error saving ProofSubmitted:', error);
    }
  }

  /**
   * Handler: DisputeOpened
   * Salva disputa no PostgreSQL
   */
  private async handleDisputeOpened(event: DisputeOpenedEvent): Promise<void> {
    this.logger.info('[BlockchainSync] Processing DisputeOpened event:', {
      disputeId: event.disputeId,
      orderId: event.orderId,
      plaintiff: event.plaintiff,
    });

    this.stats.lastEvent = new Date();

    try {
      // Verificar se a disputa já existe
      const existingDispute = await this.prisma.blockchainDispute.findUnique({
        where: { disputeId: event.disputeId },
      });

      if (existingDispute) {
        this.logger.info(`[BlockchainSync] Dispute ${event.disputeId} already exists, skipping`);
        return;
      }

      // Salvar disputa no banco
      await this.prisma.blockchainDispute.create({
        data: {
          disputeId: event.disputeId,
          orderId: event.orderId,
          plaintiff: event.plaintiff,
          defendant: event.defendant,
          status: 'OPENED',
          txHash: event.txHash,
          blockNumber: event.blockNumber,
          createdAt: new Date(),
        },
      });

      // Atualizar status do pedido
      await this.prisma.blockchainOrder.updateMany({
        where: { orderId: event.orderId },
        data: { status: 'DISPUTED' },
      });

      this.stats.disputesOpened++;
      this.logger.info(`[BlockchainSync] ✅ Saved dispute #${event.disputeId}`);
    } catch (error) {
      this.stats.errors++;
      this.logger.error('[BlockchainSync] Error saving DisputeOpened:', error);
    }
  }

  /**
   * Handler: EscrowLocked
   * Atualiza pedido com status ESCROWED e cria EscrowLog
   */
  private async handleEscrowLocked(event: EscrowLockedEvent): Promise<void> {
    this.logger.info('[BlockchainSync] Processing EscrowLocked event:', {
      orderId: event.orderId,
      buyer: event.buyer,
      seller: event.seller,
      amount: event.amount,
    });

    this.stats.lastEvent = new Date();

    try {
      // Encontrar Order pelo externalOrderId (orderId da blockchain)
      const order = await this.prisma.order.findFirst({
        where: { externalOrderId: event.orderId },
      });

      if (order) {
        // Atualizar status do pedido
        await this.prisma.order.update({
          where: { id: order.id },
          data: { status: 'ESCROWED' },
        });

        // Criar EscrowLog
        await this.prisma.escrowLog.create({
          data: {
            orderId: order.id,
            kind: 'LOCK',
            payloadJson: {
              buyer: event.buyer,
              seller: event.seller,
              amount: event.amount,
              txHash: event.txHash,
              blockNumber: event.blockNumber,
              timestamp: new Date().toISOString(),
            },
          },
        });

        this.stats.escrowsLocked++;
        this.logger.info(`[BlockchainSync] ✅ Order ${order.id} updated to ESCROWED`);
      } else {
        // Pedido não encontrado no DB (pode estar em outra marketplace ou ser on-chain only)
        this.logger.warn(`[BlockchainSync] Order with externalOrderId ${event.orderId} not found in database`);
      }
    } catch (error) {
      this.stats.errors++;
      this.logger.error('[BlockchainSync] Error processing EscrowLocked:', error);
    }
  }

  /**
   * Handler: FundsReleased
   * Atualiza pedido com status RELEASED e cria EscrowLog
   */
  private async handleFundsReleased(event: FundsReleasedEvent): Promise<void> {
    this.logger.info('[BlockchainSync] Processing FundsReleased event:', {
      orderId: event.orderId,
      seller: event.seller,
      amount: event.amount,
    });

    this.stats.lastEvent = new Date();

    try {
      // Encontrar Order pelo externalOrderId
      const order = await this.prisma.order.findFirst({
        where: { externalOrderId: event.orderId },
      });

      if (order) {
        // Atualizar status do pedido
        await this.prisma.order.update({
          where: { id: order.id },
          data: { status: 'RELEASED' },
        });

        // Criar EscrowLog
        await this.prisma.escrowLog.create({
          data: {
            orderId: order.id,
            kind: 'RELEASE',
            payloadJson: {
              seller: event.seller,
              amount: event.amount,
              txHash: event.txHash,
              blockNumber: event.blockNumber,
              timestamp: new Date().toISOString(),
            },
          },
        });

        this.stats.fundsReleased++;
        this.logger.info(`[BlockchainSync] ✅ Order ${order.id} updated to RELEASED`);
      } else {
        this.logger.warn(`[BlockchainSync] Order with externalOrderId ${event.orderId} not found in database`);
      }
    } catch (error) {
      this.stats.errors++;
      this.logger.error('[BlockchainSync] Error processing FundsReleased:', error);
    }
  }

  /**
   * Handler: BuyerRefunded
   * Atualiza pedido com status REFUNDED e cria EscrowLog
   */
  private async handleBuyerRefunded(event: BuyerRefundedEvent): Promise<void> {
    this.logger.info('[BlockchainSync] Processing BuyerRefunded event:', {
      orderId: event.orderId,
      buyer: event.buyer,
      amount: event.amount,
    });

    this.stats.lastEvent = new Date();

    try {
      // Encontrar Order pelo externalOrderId
      const order = await this.prisma.order.findFirst({
        where: { externalOrderId: event.orderId },
      });

      if (order) {
        // Atualizar status do pedido
        await this.prisma.order.update({
          where: { id: order.id },
          data: { status: 'REFUNDED' },
        });

        // Criar EscrowLog
        await this.prisma.escrowLog.create({
          data: {
            orderId: order.id,
            kind: 'REFUND',
            payloadJson: {
              buyer: event.buyer,
              amount: event.amount,
              txHash: event.txHash,
              blockNumber: event.blockNumber,
              timestamp: new Date().toISOString(),
            },
          },
        });

        this.stats.buyersRefunded++;
        this.logger.info(`[BlockchainSync] ✅ Order ${order.id} updated to REFUNDED`);
      } else {
        this.logger.warn(`[BlockchainSync] Order with externalOrderId ${event.orderId} not found in database`);
      }
    } catch (error) {
      this.stats.errors++;
      this.logger.error('[BlockchainSync] Error processing BuyerRefunded:', error);
    }
  }

  /**
   * Handler: Erros
   */
  private handleError(error: Error): void {
    this.stats.errors++;
    this.logger.error('[BlockchainSync] Event processing error:', error);
  }

  /**
   * Obter estatísticas do worker
   */
  getStats(): SyncStats {
    return { ...this.stats };
  }

  /**
   * Resetar estatísticas
   */
  resetStats(): void {
    this.stats.ordersCreated = 0;
    this.stats.proofsSubmitted = 0;
    this.stats.disputesOpened = 0;
    this.stats.escrowsLocked = 0;
    this.stats.fundsReleased = 0;
    this.stats.buyersRefunded = 0;
    this.stats.errors = 0;
    this.logger.info('[BlockchainSync] Stats reset');
  }
}

/**
 * Função helper para iniciar worker (compatível com padrão existente)
 */
export function startBlockchainSyncWorker(
  prisma: PrismaClient,
  options: BlockchainSyncWorkerOptions = {}
): BlockchainSyncWorker {
  const worker = new BlockchainSyncWorker(prisma, options);

  // Iniciar worker de forma assíncrona
  worker.start().catch((error) => {
    if (options.logger) {
      options.logger.error('[BlockchainSync] Failed to start worker:', error);
    } else {
      console.error('[BlockchainSync] Failed to start worker:', error);
    }
  });

  return worker;
}
