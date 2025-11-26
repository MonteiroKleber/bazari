// @ts-nocheck - Polkadot.js type incompatibilities
/**
 * Blockchain Rewards Sync Worker
 * Escuta eventos do pallet bazari-rewards e sincroniza com PostgreSQL
 * Focus: Rewards events (MissionCreated, MissionCompleted, CashbackMinted, RewardClaimed)
 *
 * Strategy:
 * - Event-driven: Escuta eventos em tempo real
 * - Heartbeat: Verifica conexão a cada 5 minutos
 * - Auto-reconnect: Reconecta automaticamente se conexão cair
 * - Fallback: Poll a cada 10 segundos caso eventos não estejam disponíveis
 */
import { PrismaClient } from '@prisma/client';
import { BlockchainService } from '../services/blockchain/blockchain.service.js';

export interface RewardsSyncWorkerOptions {
  logger?: any;
  heartbeatIntervalMs?: number; // Default: 5 minutes (300000ms)
  pollIntervalMs?: number; // Default: 10 seconds (10000ms)
  reconnectDelayMs?: number; // Default: 5 seconds (5000ms)
  maxReconnectAttempts?: number; // Default: 10
}

export interface RewardsSyncStats {
  missionsCreated: number;
  missionsCompleted: number;
  cashbackMinted: number;
  rewardsClaimed: number;
  errors: number;
  lastHeartbeat: Date | null;
  lastEvent: Date | null;
  lastPoll: Date | null;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}

export class BlockchainRewardsSyncWorker {
  private prisma: PrismaClient;
  private blockchainService: BlockchainService;
  private logger: any;
  private heartbeatIntervalMs: number;
  private pollIntervalMs: number;
  private reconnectDelayMs: number;
  private maxReconnectAttempts: number;
  private isRunning = false;
  private heartbeatHandle: NodeJS.Timeout | null = null;
  private pollHandle: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private unsubscribe: (() => void) | null = null;

  // Stats
  private stats: RewardsSyncStats = {
    missionsCreated: 0,
    missionsCompleted: 0,
    cashbackMinted: 0,
    rewardsClaimed: 0,
    errors: 0,
    lastHeartbeat: null,
    lastEvent: null,
    lastPoll: null,
    connectionStatus: 'disconnected',
  };

  constructor(prisma: PrismaClient, options: RewardsSyncWorkerOptions = {}) {
    this.prisma = prisma;
    this.blockchainService = BlockchainService.getInstance();
    this.logger = options.logger || console;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs || 300000; // 5 minutes
    this.pollIntervalMs = options.pollIntervalMs || 10000; // 10 seconds
    this.reconnectDelayMs = options.reconnectDelayMs || 5000; // 5 seconds
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
  }

  /**
   * Iniciar worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('[RewardsSync] Worker already running');
      return;
    }

    this.logger.info('[RewardsSync] Starting worker...', {
      heartbeatIntervalMs: this.heartbeatIntervalMs,
      pollIntervalMs: this.pollIntervalMs,
    });

    this.isRunning = true;

    // Tentar inscrever em eventos (se disponível)
    try {
      await this.subscribeToEvents();
      this.stats.connectionStatus = 'connected';
      this.reconnectAttempts = 0;
      this.logger.info('[RewardsSync] ✅ Subscribed to rewards events');
    } catch (error) {
      this.logger.warn('[RewardsSync] Could not subscribe to events, falling back to polling:', error);
      this.stats.connectionStatus = 'connected'; // Polling ainda funciona
    }

    // Iniciar polling como fallback
    this.startPolling();

    // Iniciar heartbeat
    this.startHeartbeat();

    this.logger.info('[RewardsSync] ✅ Worker started successfully');
  }

  /**
   * Parar worker
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('[RewardsSync] Stopping worker...');

    // Parar heartbeat
    if (this.heartbeatHandle) {
      clearInterval(this.heartbeatHandle);
      this.heartbeatHandle = null;
    }

    // Parar polling
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }

    // Unsubscribe de eventos
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.isRunning = false;
    this.stats.connectionStatus = 'disconnected';
    this.logger.info('[RewardsSync] Worker stopped');
  }

  /**
   * Inscrever em eventos da blockchain
   */
  private async subscribeToEvents(): Promise<void> {
    const api = await this.blockchainService.getApi();

    // Verificar se pallet bazari-rewards existe
    if (!api.events.bazariRewards) {
      this.logger.warn('[RewardsSync] Pallet bazari-rewards not available - skipping event subscription');
      return;
    }

    // Inscrever em eventos do pallet bazari-rewards
    this.unsubscribe = await api.query.system.events((events) => {
      events.forEach((record) => {
        const { event } = record;

        // MissionCreated
        if (api.events.bazariRewards?.MissionCreated?.is(event)) {
          this.handleMissionCreated(event.data).catch((error) => {
            this.logger.error('[RewardsSync] Error handling MissionCreated:', error);
            this.stats.errors++;
          });
        }

        // MissionCompleted
        if (api.events.bazariRewards?.MissionCompleted?.is(event)) {
          this.handleMissionCompleted(event.data).catch((error) => {
            this.logger.error('[RewardsSync] Error handling MissionCompleted:', error);
            this.stats.errors++;
          });
        }

        // CashbackMinted
        if (api.events.bazariRewards?.CashbackMinted?.is(event)) {
          this.handleCashbackMinted(event.data).catch((error) => {
            this.logger.error('[RewardsSync] Error handling CashbackMinted:', error);
            this.stats.errors++;
          });
        }

        // RewardClaimed
        if (api.events.bazariRewards?.RewardClaimed?.is(event)) {
          this.handleRewardClaimed(event.data).catch((error) => {
            this.logger.error('[RewardsSync] Error handling RewardClaimed:', error);
            this.stats.errors++;
          });
        }
      });
    });
  }

  /**
   * Polling: Sincronizar dados periodicamente (fallback se eventos falharem)
   */
  private startPolling(): void {
    this.pollHandle = setInterval(async () => {
      this.stats.lastPoll = new Date();

      try {
        // Sincronizar missões
        await this.syncMissions();

        this.logger.debug('[RewardsSync] Poll completed', {
          missionsCreated: this.stats.missionsCreated,
        });
      } catch (error) {
        this.logger.error('[RewardsSync] Poll failed:', error);
        this.stats.errors++;
      }
    }, this.pollIntervalMs);
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
          this.logger.warn('[RewardsSync] Connection lost, attempting to reconnect...');
          this.stats.connectionStatus = 'disconnected';
          this.scheduleReconnect();
        } else if (isConnected && this.stats.connectionStatus !== 'connected') {
          this.logger.info('[RewardsSync] Connection restored');
          this.stats.connectionStatus = 'connected';
          this.reconnectAttempts = 0;
        }

        this.logger.info('[RewardsSync] Heartbeat OK', {
          connectionStatus: this.stats.connectionStatus,
          stats: {
            missionsCreated: this.stats.missionsCreated,
            missionsCompleted: this.stats.missionsCompleted,
            cashbackMinted: this.stats.cashbackMinted,
            rewardsClaimed: this.stats.rewardsClaimed,
            errors: this.stats.errors,
          },
        });
      } catch (error) {
        this.logger.error('[RewardsSync] Heartbeat check failed:', error);
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
      this.logger.error('[RewardsSync] Max reconnect attempts reached, giving up');
      this.stats.connectionStatus = 'disconnected';
      return;
    }

    this.reconnectAttempts++;
    this.stats.connectionStatus = 'reconnecting';

    this.logger.info(`[RewardsSync] Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelayMs}ms`);

    setTimeout(async () => {
      try {
        // Tentar reinscrever em eventos
        if (this.unsubscribe) {
          this.unsubscribe();
          this.unsubscribe = null;
        }

        await this.subscribeToEvents();
        this.stats.connectionStatus = 'connected';
        this.reconnectAttempts = 0;
        this.logger.info('[RewardsSync] ✅ Reconnected successfully');
      } catch (error) {
        this.logger.error('[RewardsSync] Reconnect failed:', error);
        this.scheduleReconnect();
      }
    }, this.reconnectDelayMs * this.reconnectAttempts); // Exponential backoff
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handler: MissionCreated
   * Salva nova missão no PostgreSQL
   */
  private async handleMissionCreated(data: any): Promise<void> {
    const [missionId, title, description, missionType, rewardAmount, requiredCount] = data;

    this.logger.info('[RewardsSync] Processing MissionCreated event:', {
      missionId: missionId.toNumber(),
      title: title.toUtf8(),
      missionType: missionType.toString(),
    });

    this.stats.lastEvent = new Date();

    try {
      // Verificar se missão já existe
      const existing = await this.prisma.mission.findUnique({
        where: { missionId: missionId.toNumber() },
      });

      if (existing) {
        this.logger.info(`[RewardsSync] Mission ${missionId.toNumber()} already exists, skipping`);
        return;
      }

      // Salvar missão no banco
      await this.prisma.mission.create({
        data: {
          missionId: missionId.toNumber(),
          title: title.toUtf8(),
          description: description.toUtf8(),
          missionType: missionType.toString(),
          rewardAmount: rewardAmount.toString(),
          requiredCount: requiredCount.toNumber(),
          isActive: true,
          createdAt: new Date(),
        },
      });

      this.stats.missionsCreated++;
      this.logger.info(`[RewardsSync] ✅ Saved mission #${missionId.toNumber()} to database`);
    } catch (error) {
      this.stats.errors++;
      this.logger.error('[RewardsSync] Error saving MissionCreated:', error);
    }
  }

  /**
   * Handler: MissionCompleted
   * Atualiza progresso do usuário
   */
  private async handleMissionCompleted(data: any): Promise<void> {
    const [user, missionId] = data;

    this.logger.info('[RewardsSync] Processing MissionCompleted event:', {
      user: user.toString(),
      missionId: missionId.toNumber(),
    });

    this.stats.lastEvent = new Date();

    try {
      // Buscar user no banco (via walletAddress)
      const profile = await this.prisma.profile.findFirst({
        where: { walletAddress: user.toString() },
      });

      if (!profile) {
        this.logger.warn(`[RewardsSync] User with wallet ${user.toString()} not found in database`);
        return;
      }

      // Verificar se progresso já existe
      const existing = await this.prisma.userMissionProgress.findUnique({
        where: {
          userId_missionId: {
            userId: profile.id,
            missionId: missionId.toNumber(),
          },
        },
      });

      if (existing?.isCompleted) {
        this.logger.info(`[RewardsSync] Mission ${missionId.toNumber()} already completed for user ${profile.id}, skipping`);
        return;
      }

      // Atualizar ou criar progresso
      await this.prisma.userMissionProgress.upsert({
        where: {
          userId_missionId: {
            userId: profile.id,
            missionId: missionId.toNumber(),
          },
        },
        create: {
          userId: profile.id,
          missionId: missionId.toNumber(),
          currentCount: 0,
          isCompleted: true,
          completedAt: new Date(),
        },
        update: {
          isCompleted: true,
          completedAt: new Date(),
        },
      });

      this.stats.missionsCompleted++;
      this.logger.info(`[RewardsSync] ✅ Marked mission #${missionId.toNumber()} as completed for user ${profile.id}`);
    } catch (error) {
      this.stats.errors++;
      this.logger.error('[RewardsSync] Error saving MissionCompleted:', error);
    }
  }

  /**
   * Handler: CashbackMinted
   * Registra cashback concedido
   */
  private async handleCashbackMinted(data: any): Promise<void> {
    const [user, cashbackAmount, orderAmount] = data;

    this.logger.info('[RewardsSync] Processing CashbackMinted event:', {
      user: user.toString(),
      cashbackAmount: cashbackAmount.toString(),
      orderAmount: orderAmount.toString(),
    });

    this.stats.lastEvent = new Date();

    try {
      // Buscar user no banco
      const profile = await this.prisma.profile.findFirst({
        where: { walletAddress: user.toString() },
      });

      if (!profile) {
        this.logger.warn(`[RewardsSync] User with wallet ${user.toString()} not found in database`);
        return;
      }

      // Salvar registro de cashback
      await this.prisma.cashbackGrant.create({
        data: {
          userId: profile.id,
          orderAmount: orderAmount.toString(),
          cashbackAmount: cashbackAmount.toString(),
          grantedAt: new Date(),
        },
      });

      this.stats.cashbackMinted++;
      this.logger.info(`[RewardsSync] ✅ Saved cashback grant for user ${profile.id}: ${cashbackAmount.toString()} ZARI`);
    } catch (error) {
      this.stats.errors++;
      this.logger.error('[RewardsSync] Error saving CashbackMinted:', error);
    }
  }

  /**
   * Handler: RewardClaimed
   * Registra reward reivindicado
   */
  private async handleRewardClaimed(data: any): Promise<void> {
    const [user, missionId, rewardAmount] = data;

    this.logger.info('[RewardsSync] Processing RewardClaimed event:', {
      user: user.toString(),
      missionId: missionId.toNumber(),
      rewardAmount: rewardAmount.toString(),
    });

    this.stats.lastEvent = new Date();

    try {
      // Buscar user no banco
      const profile = await this.prisma.profile.findFirst({
        where: { walletAddress: user.toString() },
      });

      if (!profile) {
        this.logger.warn(`[RewardsSync] User with wallet ${user.toString()} not found in database`);
        return;
      }

      // Atualizar progresso para marcar como claimed
      await this.prisma.userMissionProgress.updateMany({
        where: {
          userId: profile.id,
          missionId: missionId.toNumber(),
        },
        data: {
          isClaimed: true,
          claimedAt: new Date(),
        },
      });

      this.stats.rewardsClaimed++;
      this.logger.info(`[RewardsSync] ✅ Marked reward as claimed for user ${profile.id}, mission #${missionId.toNumber()}`);
    } catch (error) {
      this.stats.errors++;
      this.logger.error('[RewardsSync] Error saving RewardClaimed:', error);
    }
  }

  // ============================================================================
  // Polling Methods
  // ============================================================================

  /**
   * Sincronizar missões da blockchain → PostgreSQL
   */
  private async syncMissions(): Promise<void> {
    try {
      // Buscar todas as missões ativas da blockchain
      const missions = await this.blockchainService.getAllMissions();

      for (const mission of missions) {
        // Verificar se missão já existe no banco
        const existing = await this.prisma.mission.findUnique({
          where: { missionId: mission.missionId },
        });

        if (!existing) {
          // Criar nova missão
          await this.prisma.mission.create({
            data: {
              missionId: mission.missionId,
              title: mission.title,
              description: mission.description,
              missionType: mission.missionType,
              rewardAmount: mission.rewardAmount,
              requiredCount: mission.requiredCount,
              isActive: mission.isActive,
              createdAt: new Date(),
            },
          });

          this.stats.missionsCreated++;
          this.logger.info(`[RewardsSync] Synced new mission #${mission.missionId} via polling`);
        }
      }
    } catch (error) {
      this.logger.error('[RewardsSync] Error syncing missions:', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas do worker
   */
  getStats(): RewardsSyncStats {
    return { ...this.stats };
  }

  /**
   * Resetar estatísticas
   */
  resetStats(): void {
    this.stats.missionsCreated = 0;
    this.stats.missionsCompleted = 0;
    this.stats.cashbackMinted = 0;
    this.stats.rewardsClaimed = 0;
    this.stats.errors = 0;
    this.logger.info('[RewardsSync] Stats reset');
  }
}

/**
 * Função helper para iniciar worker (compatível com padrão existente)
 */
export function startRewardsSyncWorker(
  prisma: PrismaClient,
  options: RewardsSyncWorkerOptions = {}
): BlockchainRewardsSyncWorker {
  const worker = new BlockchainRewardsSyncWorker(prisma, options);

  // Iniciar worker de forma assíncrona
  worker.start().catch((error) => {
    if (options.logger) {
      options.logger.error('[RewardsSync] Failed to start worker:', error);
    } else {
      console.error('[RewardsSync] Failed to start worker:', error);
    }
  });

  return worker;
}
