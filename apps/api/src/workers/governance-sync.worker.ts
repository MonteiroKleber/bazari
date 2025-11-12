/**
 * Governance Sync Worker
 * Escuta eventos da blockchain e sincroniza com PostgreSQL
 * Garante consistência entre blockchain (source of truth) e banco de dados (cache/índice)
 */
import { PrismaClient } from '@prisma/client';
import { BlockchainEventsService } from '../services/blockchain/blockchain-events.service.js';
import { BlockchainService } from '../services/blockchain/blockchain.service.js';
import type {
  CouncilProposedEvent,
  CouncilVotedEvent,
  CouncilClosedEvent,
  CouncilExecutedEvent,
  BalancesTransferEvent,
  TreasurySpendingEvent,
  DemocracyProposedEvent,
  DemocracyStartedEvent,
} from '../services/blockchain/blockchain-events.service.js';

export interface GovernanceSyncWorkerOptions {
  logger?: any;
  retryAttempts?: number;
  retryDelayMs?: number;
}

export class GovernanceSyncWorker {
  private prisma: PrismaClient;
  private eventsService: BlockchainEventsService;
  private blockchainService: BlockchainService;
  private logger: any;
  private retryAttempts: number;
  private retryDelayMs: number;
  private isRunning = false;

  constructor(prisma: PrismaClient, options: GovernanceSyncWorkerOptions = {}) {
    this.prisma = prisma;
    this.eventsService = BlockchainEventsService.getInstance();
    this.blockchainService = BlockchainService.getInstance();
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
      onBalancesTransfer: this.handleBalancesTransfer.bind(this),
      onTreasurySpending: this.handleTreasurySpending.bind(this),
      onDemocracyProposed: this.handleDemocracyProposed.bind(this),
      onDemocracyStarted: this.handleDemocracyStarted.bind(this),
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

      // Se execução foi bem sucedida, marcar como aprovado (não como pago!)
      // O pagamento real acontece no próximo SpendPeriod automaticamente
      if (event.result === 'Ok') {
        await this.prisma.governanceTreasuryRequest.update({
          where: { id: request.id },
          data: {
            status: 'APPROVED',
            approvedAt: new Date(),
          },
        });

        this.logger.info(`[GovernanceSync] ✅ Motion ${event.proposalHash} executed successfully - Treasury spend approved, will be paid in next SpendPeriod`);
      }
    });
  }

  /**
   * Handler: Treasury.Spending
   * Detecta quando Treasury fez pagamentos automáticos via SpendPeriod
   * Atualiza TODOS os requests APPROVED para PAID_OUT pois Treasury pagou tudo de uma vez
   */
  private async handleTreasurySpending(event: TreasurySpendingEvent): Promise<void> {
    await this.withRetry(async () => {
      // Buscar TODAS as Treasury Requests que estão APPROVED
      const approvedRequests = await this.prisma.governanceTreasuryRequest.findMany({
        where: { status: 'APPROVED' },
        orderBy: { approvedAt: 'asc' },
      });

      if (approvedRequests.length === 0) {
        this.logger.warn(`[GovernanceSync] treasury.Spending event but no APPROVED requests found`);
        return;
      }

      // Marcar todas como PAID_OUT
      const ids = approvedRequests.map(r => r.id);
      await this.prisma.governanceTreasuryRequest.updateMany({
        where: { id: { in: ids } },
        data: {
          status: 'PAID_OUT',
          paidOutAt: new Date(),
        },
      });

      this.logger.info(`[GovernanceSync] ✅ treasury.Spending: Marked ${approvedRequests.length} request(s) as PAID_OUT - Total: ${(parseFloat(event.amount) / 1e12).toFixed(4)} BZR`);
      approvedRequests.forEach(r => {
        this.logger.info(`   - Request #${r.id}: ${(parseFloat(r.value) / 1e12).toFixed(4)} BZR → ${r.beneficiary.slice(0, 10)}...`);
      });
    });
  }

  /**
   * Handler: Balances.Transfer
   * Detecta quando Treasury paga um beneficiário e atualiza status para PAID_OUT
   */
  private async handleBalancesTransfer(event: BalancesTransferEvent): Promise<void> {
    await this.withRetry(async () => {
      // Buscar Treasury Requests APPROVED que ainda não foram pagas
      // e cujo beneficiário recebeu o transfer
      const request = await this.prisma.governanceTreasuryRequest.findFirst({
        where: {
          status: 'APPROVED',
          beneficiary: event.to,
        },
        orderBy: { approvedAt: 'asc' }, // Mais antigo primeiro
      });

      if (!request) {
        // Não é um pagamento de Treasury Request
        return;
      }

      // Verificar se o valor bate (com margem de erro para fees)
      const requestValue = BigInt(request.value);
      const transferValue = BigInt(event.amount);

      // Aceitar se o valor for exatamente igual
      if (requestValue === transferValue) {
        await this.prisma.governanceTreasuryRequest.update({
          where: { id: request.id },
          data: {
            status: 'PAID_OUT',
            paidOutAt: new Date(),
          },
        });

        this.logger.info(`[GovernanceSync] ✅ Treasury Request #${request.id} paid out to ${event.to.slice(0, 10)}... - ${(parseFloat(event.amount) / 1e12).toFixed(4)} BZR`);
      }
    });
  }

  /**
   * Handler: Democracy.Proposed
   * Salva proposta Democracy quando criada, extraindo metadata do preimage
   */
  private async handleDemocracyProposed(event: DemocracyProposedEvent): Promise<void> {
    this.logger.info('[GovernanceSync] Processing Democracy.Proposed event:', {
      proposalIndex: event.proposalIndex,
      deposit: event.deposit,
    });

    await this.withRetry(async () => {
      try {
        const api = await this.blockchainService.getApi();

        // Buscar proposta no storage
        const proposalsRaw = await api.query.democracy.publicProps();
        const proposalsArray = proposalsRaw.toJSON() as any[];

        const proposal = proposalsArray.find((p: any) => p[0] === event.proposalIndex);

        if (!proposal) {
          this.logger.warn(`[GovernanceSync] Proposal ${event.proposalIndex} not found in storage`);
          return;
        }

        const [proposalId, proposalData] = proposal;
        const proposalHash = proposalData?.lookup?.hash || proposalData?.hash;
        const proposer = proposalData?.lookup?.depositor || proposalData?.depositor;

        if (!proposalHash) {
          this.logger.warn(`[GovernanceSync] Proposal ${event.proposalIndex} has no hash`);
          return;
        }

        const proposalHashHex = proposalHash;

        this.logger.info(`[GovernanceSync] Found proposal ${event.proposalIndex} with hash ${proposalHashHex}`);

        // Extrair metadata do preimage
        let title = `Proposal #${event.proposalIndex}`;
        let description = 'Democracy proposal';
        // O proposalHash JÁ é o preimageHash (não precisa fazer blake2)
        let preimageHash: string | null = proposalHashHex;

        try {
          // Buscar preimage diretamente com o proposalHash
          const preimageStatus = await api.query.preimage.requestStatusFor(proposalHashHex);

          if (preimageStatus.isSome) {
            const status = preimageStatus.unwrap();
            const len = status.isUnrequested
              ? status.asUnrequested.len.toNumber()
              : status.asRequested.len.toNumber();
            const preimageData = await api.query.preimage.preimageFor([proposalHashHex, len]);

            if (preimageData.isSome) {
              const bytes = preimageData.unwrap();
              const call = api.registry.createType('Call', bytes);

              // Se for system.remark, extrair metadata JSON
              if (call.section === 'system' && call.method === 'remark') {
                try {
                  const remarkHex = call.args[0].toHex();
                  const remarkData = Buffer.from(remarkHex.slice(2), 'hex').toString('utf8');
                  const metadata = JSON.parse(remarkData);

                  if (metadata.title) title = metadata.title;
                  if (metadata.description) description = metadata.description;

                  this.logger.info(`[GovernanceSync] Extracted metadata: "${title}"`);
                } catch (parseErr) {
                  this.logger.warn(`[GovernanceSync] Could not parse preimage metadata`);
                }
              } else {
                // Usar informações do call
                description = `${call.section}.${call.method}`;
              }
            }
          }
        } catch (preimageErr) {
          this.logger.warn(`[GovernanceSync] Could not fetch preimage:`, preimageErr);
        }

        // Salvar no banco
        await this.prisma.governanceDemocracyProposal.create({
          data: {
            proposalIndex: event.proposalIndex,
            proposalHash: proposalHashHex,
            preimageHash,
            title,
            description,
            proposer: proposer || null,
            deposit: event.deposit,
            status: 'PROPOSED',
            txHash: event.txHash,
            blockNumber: event.blockNumber,
          },
        });

        this.logger.info(`[GovernanceSync] ✅ Saved Democracy proposal #${event.proposalIndex}: "${title}"`);
      } catch (error) {
        this.logger.error('[GovernanceSync] Error processing Democracy.Proposed:', error);
        throw error;
      }
    });
  }

  /**
   * Handler: Democracy.Started
   * Quando proposta vira referendum, copia dados para GovernanceReferendum
   */
  private async handleDemocracyStarted(event: DemocracyStartedEvent): Promise<void> {
    this.logger.info('[GovernanceSync] Processing Democracy.Started event:', {
      refIndex: event.refIndex,
      threshold: event.threshold,
    });

    await this.withRetry(async () => {
      try {
        const api = await this.blockchainService.getApi();

        // Buscar referendum no storage para obter proposalHash
        const refInfo = await api.query.democracy.referendumInfoOf(event.refIndex);

        if (refInfo.isNone) {
          this.logger.warn(`[GovernanceSync] Referendum ${event.refIndex} not found in storage`);
          return;
        }

        const info = refInfo.unwrap();

        if (!info.isOngoing) {
          this.logger.warn(`[GovernanceSync] Referendum ${event.refIndex} is not ongoing`);
          return;
        }

        const ongoing = info.asOngoing;
        let proposalHashHex = ongoing.proposal.toHex();

        this.logger.info(`[GovernanceSync] Referendum ${event.refIndex} has raw proposal: ${proposalHashHex}`);

        // CRITICAL FIX: Extract pure hash from bounded call encoding
        // Format: 0x02[HASH][LENGTH_ENCODING]
        // The referendum stores a Bounded<Call> which includes:
        // - prefix (0x02 = Lookup variant)
        // - hash (32 bytes = 64 hex chars)
        // - inline bytes length encoding
        // We need to extract just the 32-byte hash to match with proposals
        if (proposalHashHex.startsWith('0x02') && proposalHashHex.length > 68) {
          // Extract hash: skip '0x02' prefix (4 chars), take next 64 chars (32 bytes)
          const extractedHash = '0x' + proposalHashHex.substring(4, 68);
          this.logger.info(`[GovernanceSync] Extracted pure hash from bounded call: ${extractedHash}`);
          proposalHashHex = extractedHash;
        }

        this.logger.info(`[GovernanceSync] Searching for proposal with hash: ${proposalHashHex}`);

        // Buscar proposta original no banco (se existir)
        const proposal = await this.prisma.governanceDemocracyProposal.findFirst({
          where: { proposalHash: proposalHashHex },
          orderBy: { createdAt: 'desc' },
        });

        let title = `Referendum #${event.refIndex}`;
        let description = 'Democracy referendum';
        let proposer: string | null = null;
        let proposalId: number | null = null;
        let preimageHash: string | null = null;

        if (proposal) {
          // Copiar dados da proposta com formato "Referendum #X: título"
          title = `Referendum #${event.refIndex}: ${proposal.title}`;
          description = proposal.description;
          proposer = proposal.proposer;
          proposalId = proposal.id;
          preimageHash = proposal.preimageHash;

          // Atualizar status da proposta
          await this.prisma.governanceDemocracyProposal.update({
            where: { id: proposal.id },
            data: {
              status: 'STARTED',
              startedAt: new Date(),
            },
          });

          this.logger.info(`[GovernanceSync] Linked referendum ${event.refIndex} to proposal #${proposal.proposalIndex}: "${title}"`);
        } else {
          // Tentar extrair do preimage (fallback)
          try {
            // O proposalHash JÁ é o preimageHash (não precisa fazer blake2)
            preimageHash = proposalHashHex;

            const preimageStatus = await api.query.preimage.requestStatusFor(proposalHashHex);

            if (preimageStatus.isSome) {
              const status = preimageStatus.unwrap();
              const len = status.isUnrequested
                ? status.asUnrequested.len.toNumber()
                : status.asRequested.len.toNumber();
              const preimageData = await api.query.preimage.preimageFor([proposalHashHex, len]);

              if (preimageData.isSome) {
                const bytes = preimageData.unwrap();
                const call = api.registry.createType('Call', bytes);

                if (call.section === 'system' && call.method === 'remark') {
                  try {
                    const remarkHex = call.args[0].toHex();
                    const remarkData = Buffer.from(remarkHex.slice(2), 'hex').toString('utf8');
                    const metadata = JSON.parse(remarkData);

                    if (metadata.title) title = `Referendum #${event.refIndex}: ${metadata.title}`;
                    if (metadata.description) description = metadata.description;
                  } catch (parseErr) {
                    this.logger.warn(`[GovernanceSync] Could not parse preimage metadata`);
                  }
                } else {
                  description = `${call.section}.${call.method}`;
                }
              }
            }
          } catch (preimageErr) {
            this.logger.warn(`[GovernanceSync] Could not fetch preimage for referendum:`, preimageErr);
          }

          this.logger.warn(`[GovernanceSync] No proposal found for referendum ${event.refIndex}, using fallback data`);
        }

        // Criar referendum no banco
        await this.prisma.governanceReferendum.create({
          data: {
            refIndex: event.refIndex,
            threshold: JSON.stringify(event.threshold),
            title,
            description,
            proposer,
            proposalId,
            proposalHash: proposalHashHex,
            preimageHash,
            status: 'ONGOING',
            startTxHash: event.txHash,
            startBlockNumber: event.blockNumber,
          },
        });

        this.logger.info(`[GovernanceSync] ✅ Created referendum #${event.refIndex}: "${title}"`);
      } catch (error) {
        this.logger.error('[GovernanceSync] Error processing Democracy.Started:', error);
        throw error;
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
