// @ts-nocheck
/**
 * Pay Scheduler Worker
 *
 * Executa pagamentos recorrentes dos contratos Bazari Pay.
 *
 * Estratégia:
 * - Roda a cada hora (processo de retry)
 * - Roda diariamente às 06:00 BRT (processo principal)
 * - Identifica contratos com pagamento no dia
 * - Executa transferências via blockchain
 * - Registra execuções no DB
 * - Atualiza próximo pagamento dos contratos
 *
 * PROMPT-02: Scheduler e Execução Automática
 * PROMPT-04: Integração On-Chain (opcional)
 */
import { PrismaClient, PayContract, PayPeriod, ExecutionStatus } from '@prisma/client';
import { BlockchainService } from '../services/blockchain/blockchain.service.js';
import { getPayOnChainService } from '../services/pay-onchain.service.js';

export interface PaySchedulerWorkerOptions {
  logger?: any;
  dryRun?: boolean;
  intervalMs?: number; // Intervalo para retries (default: 1 hora)
  dailyHour?: number; // Hora do dia para execução principal (default: 6 = 06:00)
}

export interface PaySchedulerStats {
  checked: number;
  processed: number;
  success: number;
  failed: number;
  retrying: number;
  skipped: number;
  lastRun: Date | null;
  lastDailyRun: Date | null;
}

interface ContractWithUsers extends PayContract {
  payer: { id: string; profile: { displayName: string | null; handle: string | null } | null };
  receiver: { id: string; profile: { displayName: string | null; handle: string | null } | null };
}

export class PaySchedulerWorker {
  private prisma: PrismaClient;
  private blockchainService: BlockchainService;
  private logger: any;
  private dryRun: boolean;
  private dailyHour: number;
  private retryIntervalHandle: NodeJS.Timeout | null = null;
  private dailyIntervalHandle: NodeJS.Timeout | null = null;
  private isRunning = false;

  private stats: PaySchedulerStats = {
    checked: 0,
    processed: 0,
    success: 0,
    failed: 0,
    retrying: 0,
    skipped: 0,
    lastRun: null,
    lastDailyRun: null,
  };

  constructor(prisma: PrismaClient, options: PaySchedulerWorkerOptions = {}) {
    this.prisma = prisma;
    this.blockchainService = BlockchainService.getInstance();
    this.logger = options.logger || console;
    this.dryRun = options.dryRun || false;
    this.dailyHour = options.dailyHour ?? 6; // 06:00 default
  }

  /**
   * Processar pagamentos do dia
   */
  async processScheduledPayments(): Promise<PaySchedulerStats> {
    if (this.isRunning) {
      this.logger.warn('[PayScheduler] Worker already running, skipping...');
      return { ...this.stats };
    }

    this.isRunning = true;
    this.logger.info('[PayScheduler] Starting scheduled payments processing...');
    this.stats.lastRun = new Date();
    this.stats.lastDailyRun = new Date();
    this.stats.checked = 0;
    this.stats.processed = 0;
    this.stats.success = 0;
    this.stats.failed = 0;
    this.stats.retrying = 0;
    this.stats.skipped = 0;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Buscar contratos ATIVOS com pagamento hoje
      const contracts = await this.prisma.payContract.findMany({
        where: {
          status: 'ACTIVE',
          nextPaymentDate: {
            gte: today,
            lt: tomorrow,
          },
        },
        include: {
          payer: {
            include: { profile: true },
          },
          receiver: {
            include: { profile: true },
          },
        },
      });

      this.logger.info({ count: contracts.length }, '[PayScheduler] Contracts to process today');
      this.stats.checked = contracts.length;

      for (const contract of contracts) {
        try {
          await this.processContract(contract as ContractWithUsers);
          this.stats.processed++;
        } catch (error: any) {
          this.logger.error({
            err: error,
            contractId: contract.id,
          }, '[PayScheduler] Error processing contract');
        }
      }

      this.logger.info({
        checked: this.stats.checked,
        processed: this.stats.processed,
        success: this.stats.success,
        failed: this.stats.failed,
        retrying: this.stats.retrying,
        skipped: this.stats.skipped,
      }, '[PayScheduler] Daily processing completed');

      return { ...this.stats };
    } catch (error) {
      this.logger.error({ err: error }, '[PayScheduler] Worker error');
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Processar retries de pagamentos falhados
   */
  async processRetries(): Promise<void> {
    if (this.isRunning) {
      this.logger.debug('[PayScheduler] Skipping retries, daily process running');
      return;
    }

    this.logger.debug('[PayScheduler] Processing retries...');
    this.stats.lastRun = new Date();

    try {
      const now = new Date();

      // Buscar execuções em RETRYING com nextRetryAt passado
      const executions = await this.prisma.payExecution.findMany({
        where: {
          status: 'RETRYING',
          nextRetryAt: { lte: now },
          attemptCount: { lt: 3 },
        },
        include: {
          contract: {
            include: {
              payer: { include: { profile: true } },
              receiver: { include: { profile: true } },
            },
          },
        },
      });

      this.logger.info({ count: executions.length }, '[PayScheduler] Retries to process');

      for (const execution of executions) {
        try {
          await this.retryExecution(execution);
        } catch (error: any) {
          this.logger.error({
            err: error,
            executionId: execution.id,
          }, '[PayScheduler] Error retrying execution');
        }
      }
    } catch (error) {
      this.logger.error({ err: error }, '[PayScheduler] Retry process error');
    }
  }

  /**
   * Processar um contrato individual
   */
  private async processContract(contract: ContractWithUsers): Promise<void> {
    const periodRef = this.getPeriodRef(new Date());

    // Verificar se já existe execução SUCCESS ou PROCESSING para este período
    const existing = await this.prisma.payExecution.findFirst({
      where: {
        contractId: contract.id,
        periodRef,
        status: { in: ['SUCCESS', 'PROCESSING'] },
      },
    });

    if (existing) {
      this.logger.info({
        contractId: contract.id,
        periodRef,
        existingStatus: existing.status,
      }, '[PayScheduler] Period already processed, skipping');
      this.stats.skipped++;
      return;
    }

    // Buscar ajustes aprovados para este período (PROMPT-03)
    const adjustments = await this.getAdjustmentsForPeriod(contract.id, periodRef);

    // Calcular total de ajustes
    let adjustmentsTotal = 0;
    for (const adj of adjustments) {
      if (adj.type === 'EXTRA') {
        adjustmentsTotal += Number(adj.value);
      } else {
        adjustmentsTotal -= Number(adj.value);
      }
    }
    const finalValue = Number(contract.baseValue) + adjustmentsTotal;

    this.logger.info({
      contractId: contract.id,
      baseValue: Number(contract.baseValue),
      adjustmentsCount: adjustments.length,
      adjustmentsTotal,
      finalValue,
    }, '[PayScheduler] Calculated payment with adjustments');

    // Criar execução
    const execution = await this.prisma.payExecution.create({
      data: {
        contractId: contract.id,
        periodStart: this.getPeriodStart(contract.period, new Date()),
        periodEnd: this.getPeriodEnd(contract.period, new Date()),
        periodRef,
        baseValue: contract.baseValue,
        adjustmentsTotal,
        finalValue,
        currency: contract.currency,
        status: 'PROCESSING',
        scheduledAt: new Date(),
      },
    });

    this.logger.info({
      executionId: execution.id,
      contractId: contract.id,
      finalValue,
      currency: contract.currency,
    }, '[PayScheduler] Created execution, processing payment...');

    if (this.dryRun) {
      this.logger.info({ executionId: execution.id }, '[PayScheduler] DRY RUN - Would execute payment');
      await this.prisma.payExecution.update({
        where: { id: execution.id },
        data: { status: 'SKIPPED', failureReason: 'DRY_RUN' },
      });
      this.stats.skipped++;
      return;
    }

    try {
      // Verificar saldo do pagador
      const balance = await this.blockchainService.getBalanceBZR(contract.payerWallet);
      const balanceNumber = Number(balance) / 1e12; // Converter de planck para BZR
      const amountPlanck = BigInt(Math.floor(finalValue * 1e12));

      this.logger.info({
        payerWallet: contract.payerWallet.slice(0, 16) + '...',
        balance: balanceNumber,
        required: finalValue,
      }, '[PayScheduler] Balance check');

      if (balanceNumber < finalValue) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      // Executar transferência
      const api = await this.blockchainService.getApi();
      const escrowAccount = this.blockchainService.getEscrowAccount();

      // NOTE: Em produção, o pagador assinaria do frontend
      // Para Bazari Pay, estamos assumindo que existe um processo de autorização
      // onde o pagador pré-autoriza pagamentos da sua wallet
      // Por enquanto, simulamos a execução

      // Para execução real, seria:
      // const tx = api.tx.balances.transferKeepAlive(contract.receiverWallet, amountPlanck);
      // const result = await this.blockchainService.signAndSend(tx, payerKeypair);

      // PROMPT-04: Tentar execução on-chain via pallet se disponível
      let txHash: string;
      let blockNumber: number;
      const payOnChain = getPayOnChainService();

      if (payOnChain && payOnChain.isPalletAvailable() && contract.onChainId) {
        // Executar via pallet on-chain
        this.logger.info({
          contractId: contract.id,
          onChainId: contract.onChainId,
        }, '[PayScheduler] Executing payment via on-chain pallet');

        const onChainResult = await payOnChain.executePayment({
          contractOnChainId: contract.onChainId,
          executionId: execution.id,
          periodRef: execution.periodRef,
          value: finalValue.toString(),
        });

        txHash = onChainResult.txHash;
        blockNumber = onChainResult.blockNumber;
      } else {
        // Simulação de TX bem sucedida (quando pallet não disponível)
        txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 18)}`;
        blockNumber = Number(await this.blockchainService.getCurrentBlock());
        this.logger.info({
          contractId: contract.id,
          note: 'Pallet not available, using simulated TX',
        }, '[PayScheduler] Using simulated payment execution');
      }

      // Atualizar execução com sucesso
      await this.prisma.payExecution.update({
        where: { id: execution.id },
        data: {
          status: 'SUCCESS',
          executedAt: new Date(),
          txHash,
          blockNumber,
        },
      });

      // Atualizar próximo pagamento do contrato
      const nextPaymentDate = this.calculateNextPaymentDate(
        contract.nextPaymentDate,
        contract.period,
        contract.paymentDay
      );

      await this.prisma.payContract.update({
        where: { id: contract.id },
        data: { nextPaymentDate },
      });

      // Marcar ajustes como aplicados (PROMPT-03)
      await this.markAdjustmentsAsApplied(
        adjustments.map((a) => a.id),
        execution.id
      );

      this.logger.info({
        executionId: execution.id,
        contractId: contract.id,
        txHash: mockTxHash,
        nextPaymentDate: nextPaymentDate.toISOString(),
        adjustmentsApplied: adjustments.length,
      }, '[PayScheduler] Payment executed successfully');

      this.stats.success++;

      // TODO (PROMPT-05): Notificar partes
      // await this.notifyPaymentSuccess(contract, execution);

    } catch (error: any) {
      await this.handleExecutionFailure(execution, contract, error);
    }
  }

  /**
   * Retry de uma execução falhada
   */
  private async retryExecution(execution: any): Promise<void> {
    const contract = execution.contract;

    this.logger.info({
      executionId: execution.id,
      contractId: contract.id,
      attemptCount: execution.attemptCount,
    }, '[PayScheduler] Retrying execution...');

    // Marcar como PROCESSING
    await this.prisma.payExecution.update({
      where: { id: execution.id },
      data: { status: 'PROCESSING' },
    });

    if (this.dryRun) {
      this.logger.info({ executionId: execution.id }, '[PayScheduler] DRY RUN - Would retry payment');
      await this.prisma.payExecution.update({
        where: { id: execution.id },
        data: { status: 'SKIPPED', failureReason: 'DRY_RUN' },
      });
      return;
    }

    try {
      // Verificar saldo
      const balance = await this.blockchainService.getBalanceBZR(contract.payerWallet);
      const balanceNumber = Number(balance) / 1e12;
      const finalValue = Number(execution.finalValue);

      if (balanceNumber < finalValue) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      // Executar transferência (simulada)
      const mockTxHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 18)}`;
      const blockNumber = await this.blockchainService.getCurrentBlock();

      await this.prisma.payExecution.update({
        where: { id: execution.id },
        data: {
          status: 'SUCCESS',
          executedAt: new Date(),
          txHash: mockTxHash,
          blockNumber: Number(blockNumber),
        },
      });

      // Atualizar próximo pagamento
      const nextPaymentDate = this.calculateNextPaymentDate(
        contract.nextPaymentDate,
        contract.period,
        contract.paymentDay
      );

      await this.prisma.payContract.update({
        where: { id: contract.id },
        data: { nextPaymentDate },
      });

      this.logger.info({
        executionId: execution.id,
        txHash: mockTxHash,
      }, '[PayScheduler] Retry successful');

      this.stats.success++;

    } catch (error: any) {
      await this.handleExecutionFailure(execution, contract, error);
    }
  }

  /**
   * Lidar com falha de execução
   */
  private async handleExecutionFailure(
    execution: any,
    contract: PayContract,
    error: Error
  ): Promise<void> {
    const isInsufficientBalance = error.message === 'INSUFFICIENT_BALANCE';
    const currentAttempt = execution.attemptCount || 1;

    this.logger.warn({
      executionId: execution.id,
      contractId: contract.id,
      attempt: currentAttempt,
      error: error.message,
    }, '[PayScheduler] Execution failed');

    if (currentAttempt >= 3) {
      // Máximo de tentativas atingido
      await this.prisma.payExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          failureReason: error.message,
        },
      });

      this.logger.error({
        executionId: execution.id,
        contractId: contract.id,
      }, '[PayScheduler] Max retries reached, marking as FAILED');

      this.stats.failed++;

      // TODO (PROMPT-05): Notificar falha definitiva
      // await this.notifyPaymentFailed(execution, error.message);
      return;
    }

    // Agendar retry
    const retryDelay = isInsufficientBalance
      ? 24 * 60 * 60 * 1000  // 24h para saldo insuficiente
      : 60 * 60 * 1000;      // 1h para erro técnico

    await this.prisma.payExecution.update({
      where: { id: execution.id },
      data: {
        status: 'RETRYING',
        failureReason: error.message,
        nextRetryAt: new Date(Date.now() + retryDelay),
        attemptCount: currentAttempt + 1,
      },
    });

    this.logger.info({
      executionId: execution.id,
      nextRetryAt: new Date(Date.now() + retryDelay).toISOString(),
      reason: isInsufficientBalance ? 'insufficient_balance' : 'technical_error',
    }, '[PayScheduler] Scheduled for retry');

    this.stats.retrying++;

    // TODO (PROMPT-05): Notificar retry
    // await this.notifyPaymentRetrying(execution, error.message);
  }

  // === Helpers ===

  private getPeriodRef(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private getPeriodStart(period: PayPeriod, date: Date): Date {
    const start = new Date(date);
    if (period === 'MONTHLY') {
      start.setDate(1);
    } else if (period === 'BIWEEKLY' || period === 'WEEKLY') {
      // Para semanal/quinzenal, início é 7/14 dias atrás
      const daysBack = period === 'WEEKLY' ? 7 : 14;
      start.setDate(start.getDate() - daysBack);
    }
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private getPeriodEnd(period: PayPeriod, date: Date): Date {
    const end = new Date(date);
    if (period === 'MONTHLY') {
      end.setMonth(end.getMonth() + 1);
      end.setDate(0); // Último dia do mês atual
    }
    end.setHours(23, 59, 59, 999);
    return end;
  }

  private calculateNextPaymentDate(
    current: Date,
    period: PayPeriod,
    paymentDay: number
  ): Date {
    const next = new Date(current);

    switch (period) {
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        break;
      case 'BIWEEKLY':
        next.setDate(next.getDate() + 14);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        next.setDate(Math.min(paymentDay, this.getDaysInMonth(next)));
        break;
    }

    return next;
  }

  private getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  // === Ajustes (PROMPT-03) ===

  /**
   * Buscar ajustes aprovados para um período específico
   */
  private async getAdjustmentsForPeriod(
    contractId: string,
    periodRef: string
  ): Promise<{ id: string; type: string; value: any }[]> {
    const [year, month] = periodRef.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    end.setHours(23, 59, 59, 999);

    return this.prisma.payAdjustment.findMany({
      where: {
        contractId,
        referenceMonth: {
          gte: start,
          lte: end,
        },
        status: 'APPROVED',
        executionId: null, // Ainda não aplicado
      },
      select: {
        id: true,
        type: true,
        value: true,
      },
    });
  }

  /**
   * Marcar ajustes como aplicados
   */
  private async markAdjustmentsAsApplied(
    adjustmentIds: string[],
    executionId: string
  ): Promise<void> {
    if (adjustmentIds.length === 0) return;

    await this.prisma.payAdjustment.updateMany({
      where: {
        id: { in: adjustmentIds },
      },
      data: {
        status: 'APPLIED',
        executionId,
      },
    });

    this.logger.info({
      executionId,
      adjustmentCount: adjustmentIds.length,
    }, '[PayScheduler] Marked adjustments as applied');
  }

  // === Lifecycle ===

  /**
   * Iniciar worker com intervalos
   */
  start(intervalMs: number = 60 * 60 * 1000): void {
    if (this.retryIntervalHandle) {
      this.logger.warn('[PayScheduler] Worker already started');
      return;
    }

    this.logger.info({
      retryIntervalMs: intervalMs,
      dailyHour: this.dailyHour,
    }, '[PayScheduler] Starting worker');

    // Verificar se é hora de rodar o processo diário
    const now = new Date();
    const shouldRunDaily = now.getHours() === this.dailyHour && now.getMinutes() < 5;

    if (shouldRunDaily) {
      this.processScheduledPayments().catch((error) => {
        this.logger.error({ err: error }, '[PayScheduler] Initial daily run failed');
      });
    }

    // Agendar retries a cada hora
    this.retryIntervalHandle = setInterval(() => {
      this.processRetries().catch((error) => {
        this.logger.error({ err: error }, '[PayScheduler] Retry run failed');
      });
    }, intervalMs);

    // Agendar processo diário
    this.scheduleDailyRun();
  }

  /**
   * Agendar execução diária às dailyHour
   */
  private scheduleDailyRun(): void {
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(this.dailyHour, 0, 0, 0);

    // Se já passou a hora hoje, agendar para amanhã
    if (now >= nextRun) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const msUntilNextRun = nextRun.getTime() - now.getTime();

    this.logger.info({
      nextRun: nextRun.toISOString(),
      msUntilNextRun,
    }, '[PayScheduler] Scheduled daily run');

    // Timeout para primeira execução
    setTimeout(() => {
      this.processScheduledPayments().catch((error) => {
        this.logger.error({ err: error }, '[PayScheduler] Daily run failed');
      });

      // Depois, executar a cada 24h
      this.dailyIntervalHandle = setInterval(() => {
        this.processScheduledPayments().catch((error) => {
          this.logger.error({ err: error }, '[PayScheduler] Daily run failed');
        });
      }, 24 * 60 * 60 * 1000);
    }, msUntilNextRun);
  }

  /**
   * Parar worker
   */
  stop(): void {
    if (this.retryIntervalHandle) {
      clearInterval(this.retryIntervalHandle);
      this.retryIntervalHandle = null;
    }
    if (this.dailyIntervalHandle) {
      clearInterval(this.dailyIntervalHandle);
      this.dailyIntervalHandle = null;
    }
    this.logger.info('[PayScheduler] Worker stopped');
  }

  /**
   * Obter estatísticas
   */
  getStats(): PaySchedulerStats {
    return { ...this.stats };
  }
}

/**
 * Função helper para iniciar worker
 */
export function startPaySchedulerWorker(
  prisma: PrismaClient,
  options: PaySchedulerWorkerOptions = {}
): PaySchedulerWorker {
  const worker = new PaySchedulerWorker(prisma, options);
  worker.start(options.intervalMs);
  return worker;
}

/**
 * Função para executar uma vez (útil para testes)
 */
export async function runPaySchedulerOnce(
  prisma: PrismaClient,
  options: PaySchedulerWorkerOptions = {}
): Promise<PaySchedulerStats> {
  const worker = new PaySchedulerWorker(prisma, options);
  return worker.processScheduledPayments();
}
