/**
 * Governance Sync Worker
 * Escuta eventos da blockchain e sincroniza com PostgreSQL
 * Garante consistência entre blockchain (source of truth) e banco de dados (cache/índice)
 */
import { PrismaClient } from '@prisma/client';
import { BlockchainEventsService } from '../services/blockchain/blockchain-events.service.js';
import type {
  CouncilProposedEvent,
  CouncilVotedEvent,
  CouncilClosedEvent,
  CouncilExecutedEvent,
} from '../services/blockchain/blockchain-events.service.js';

export interface GovernanceSyncWorkerOptions {
  logger?: any;
  retryAttempts?: number;
  retryDelayMs?: number;
}

export class GovernanceSyncWorker {
  private prisma: PrismaClient;
  private eventsService: BlockchainEventsService;
  private logger: any;
  private retryAttempts: number;
  private retryDelayMs: number;
  private isRunning = false;

  constructor(prisma: PrismaClient, options: GovernanceSyncWorkerOptions = {}) {
    this.prisma = prisma;
    this.eventsService = BlockchainEventsService.getInstance();
    this.logger = options.logger || console;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelayMs = options.retryDelayMs || 1000;
  }

  /**
   * Iniciar worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('[GovernanceSync] Worker already running');
      return;
    }

    this.logger.info('[GovernanceSync] Starting worker...');

    // Registrar handlers de eventos
    this.eventsService.setHandlers({
      onProposed: this.handleProposed.bind(this),
      onVoted: this.handleVoted.bind(this),
      onClosed: this.handleClosed.bind(this),
      onExecuted: this.handleExecuted.bind(this),
      onError: this.handleError.bind(this),
    });

    // Iniciar escuta de eventos
    await this.eventsService.startListening();

    this.isRunning = true;
    this.logger.info('[GovernanceSync] ✅ Worker started successfully');
  }

  /**
   * Parar worker
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('[GovernanceSync] Stopping worker...');
    await this.eventsService.stopListening();
    this.isRunning = false;
    this.logger.info('[GovernanceSync] Worker stopped');
  }

  /**
   * Handler: Council.Proposed
   * Atualiza Treasury Request com motion hash/index quando motion é criada
   */
  private async handleProposed(event: CouncilProposedEvent): Promise<void> {
    this.logger.info('[GovernanceSync] Processing Proposed event:', {
      proposalHash: event.proposalHash,
      proposalIndex: event.proposalIndex,
      proposer: event.accountId,
    });

    await this.withRetry(async () => {
      // Tentar encontrar Treasury Request que está aguardando motion
      // Buscar por status PENDING_REVIEW e sem motion ainda linkado
      const pendingRequests = await this.prisma.governanceTreasuryRequest.findMany({
        where: {
          status: 'PENDING_REVIEW',
          councilMotionHash: null,
        },
        orderBy: { createdAt: 'desc' },
        take: 10, // Últimos 10 requests pendentes
      });

      // Se encontrar algum request sem motion, vincular o mais recente
      // (assumindo que motions são criadas logo após requests)
      if (pendingRequests.length > 0) {
        const request = pendingRequests[0];

        await this.prisma.governanceTreasuryRequest.update({
          where: { id: request.id },
          data: {
            councilMotionHash: event.proposalHash,
            councilMotionIndex: event.proposalIndex,
            txHash: event.txHash,
            blockNumber: event.blockNumber,
            status: 'IN_VOTING',
            reviewedAt: new Date(),
          },
        });

        this.logger.info(`[GovernanceSync] ✅ Linked motion ${event.proposalHash} to request #${request.id}`);
      }
    });
  }

  /**
   * Handler: Council.Voted
   * Salva voto no PostgreSQL
   */
  private async handleVoted(event: CouncilVotedEvent): Promise<void> {
    this.logger.info('[GovernanceSync] Processing Voted event:', {
      voter: event.accountId,
      proposalHash: event.proposalHash,
      voted: event.voted,
    });

    await this.withRetry(async () => {
      // Buscar Treasury Request com este motion hash
      const request = await this.prisma.governanceTreasuryRequest.findFirst({
        where: { councilMotionHash: event.proposalHash },
      });

      if (!request) {
        this.logger.warn(`[GovernanceSync] No Treasury Request found for motion ${event.proposalHash}`);
        return;
      }

      // Tentar criar voto (UNIQUE constraint previne duplicatas)
      try {
        await this.prisma.governanceCouncilVote.create({
          data: {
            motionHash: event.proposalHash,
            motionIndex: request.councilMotionIndex!,
            voter: event.accountId,
            vote: event.voted,
            txHash: event.txHash,
            blockNumber: event.blockNumber,
          },
        });

        this.logger.info(`[GovernanceSync] ✅ Registered vote from ${event.accountId} (${event.voted ? 'YES' : 'NO'})`);
      } catch (error: any) {
        // Se for erro de duplicata, ignorar (voto já existe)
        if (error.code === 'P2002') {
          this.logger.info(`[GovernanceSync] Vote already exists (duplicate), skipping`);
        } else {
          throw error;
        }
      }
    });
  }

  /**
   * Handler: Council.Closed
   * Atualiza status da motion para fechada
   */
  private async handleClosed(event: CouncilClosedEvent): Promise<void> {
    this.logger.info('[GovernanceSync] Processing Closed event:', {
      proposalHash: event.proposalHash,
      yes: event.yes,
      no: event.no,
    });

    await this.withRetry(async () => {
      const request = await this.prisma.governanceTreasuryRequest.findFirst({
        where: { councilMotionHash: event.proposalHash },
      });

      if (!request) {
        this.logger.warn(`[GovernanceSync] No Treasury Request found for motion ${event.proposalHash}`);
        return;
      }

      // Determinar se foi aprovado (yes > no)
      const approved = event.yes > event.no;

      await this.prisma.governanceTreasuryRequest.update({
        where: { id: request.id },
        data: {
          status: approved ? 'APPROVED' : 'REJECTED',
          approvedAt: approved ? new Date() : null,
        },
      });

      this.logger.info(`[GovernanceSync] ✅ Motion ${event.proposalHash} closed: ${approved ? 'APPROVED' : 'REJECTED'}`);
    });
  }

  /**
   * Handler: Council.Executed
   * Atualiza status final após execução
   */
  private async handleExecuted(event: CouncilExecutedEvent): Promise<void> {
    this.logger.info('[GovernanceSync] Processing Executed event:', {
      proposalHash: event.proposalHash,
      result: event.result,
    });

    await this.withRetry(async () => {
      const request = await this.prisma.governanceTreasuryRequest.findFirst({
        where: { councilMotionHash: event.proposalHash },
      });

      if (!request) {
        this.logger.warn(`[GovernanceSync] No Treasury Request found for motion ${event.proposalHash}`);
        return;
      }

      // Se execução foi bem sucedida, marcar como pago
      if (event.result === 'Ok') {
        await this.prisma.governanceTreasuryRequest.update({
          where: { id: request.id },
          data: {
            status: 'PAID_OUT',
            paidOutAt: new Date(),
          },
        });

        this.logger.info(`[GovernanceSync] ✅ Motion ${event.proposalHash} executed successfully`);
      }
    });
  }

  /**
   * Handler: Erros
   */
  private handleError(error: Error): void {
    this.logger.error('[GovernanceSync] Event processing error:', error);
  }

  /**
   * Executar função com retry
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T | null> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`[GovernanceSync] Attempt ${attempt}/${this.retryAttempts} failed:`, error);

        if (attempt < this.retryAttempts) {
          // Exponential backoff
          const delay = this.retryDelayMs * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.logger.error('[GovernanceSync] All retry attempts failed:', lastError);
    return null;
  }
}

/**
 * Função helper para iniciar worker (compatível com padrão existente)
 */
export function startGovernanceSyncWorker(
  prisma: PrismaClient,
  options: GovernanceSyncWorkerOptions = {}
): GovernanceSyncWorker {
  const worker = new GovernanceSyncWorker(prisma, options);

  // Iniciar worker de forma assíncrona
  worker.start().catch((error) => {
    if (options.logger) {
      options.logger.error('[GovernanceSync] Failed to start worker:', error);
    } else {
      console.error('[GovernanceSync] Failed to start worker:', error);
    }
  });

  return worker;
}
