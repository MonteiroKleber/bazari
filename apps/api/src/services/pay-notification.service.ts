// path: apps/api/src/services/pay-notification.service.ts
// Bazari Pay - Notification Service (PROMPT-05)

import type { PrismaClient } from '@prisma/client';
import { chatService } from '../chat/services/chat.js';

export enum PayNotificationType {
  // Contratos
  CONTRACT_CREATED = 'pay.contract.created',
  CONTRACT_PAUSED = 'pay.contract.paused',
  CONTRACT_RESUMED = 'pay.contract.resumed',
  CONTRACT_CLOSED = 'pay.contract.closed',

  // Execucoes
  PAYMENT_SCHEDULED = 'pay.payment.scheduled',
  PAYMENT_SUCCESS = 'pay.payment.success',
  PAYMENT_FAILED = 'pay.payment.failed',
  PAYMENT_RETRYING = 'pay.payment.retrying',

  // Ajustes
  ADJUSTMENT_CREATED = 'pay.adjustment.created',
  ADJUSTMENT_PENDING = 'pay.adjustment.pending',
  ADJUSTMENT_APPROVED = 'pay.adjustment.approved',
  ADJUSTMENT_REJECTED = 'pay.adjustment.rejected',
}

export interface PayNotificationData {
  type: PayNotificationType;
  title: string;
  body: string;
  data: Record<string, any>;
  actions?: Array<{ label: string; url?: string; action?: string }>;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

interface ContractWithParties {
  id: string;
  payerId: string;
  receiverId: string;
  baseValue: any;
  currency: string;
  period: string;
  nextPaymentDate: Date;
  payer: {
    profile?: { displayName?: string | null; id: string } | null;
  };
  receiver: {
    profile?: { displayName?: string | null; id: string } | null;
  };
}

interface ExecutionWithContract {
  id: string;
  periodRef: string;
  baseValue: any;
  finalValue: any;
  txHash?: string | null;
  attemptCount: number;
  nextRetryAt?: Date | null;
  contract: ContractWithParties;
}

interface AdjustmentWithContract {
  id: string;
  type: string;
  value: any;
  reason?: string | null;
  referenceMonth: string;
  contract: ContractWithParties;
}

function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BZR`;
}

function periodLabel(period: string): string {
  const labels: Record<string, string> = {
    WEEKLY: 'semana',
    BIWEEKLY: 'quinzena',
    MONTHLY: 'mes',
  };
  return labels[period] || period;
}

function formatMonth(monthStr: string): string {
  // formato: 2024-01
  const [year, month] = monthStr.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(month, 10) - 1]}/${year}`;
}

export class PayNotificationService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get or create DM thread for pay contract communications
   */
  private async getOrCreatePayThread(
    payerProfileId: string,
    receiverProfileId: string,
    contractId: string
  ): Promise<string> {
    // Try to find existing DM thread
    const existingThread = await chatService.findDmThread(payerProfileId, receiverProfileId);
    if (existingThread) {
      return existingThread.id;
    }

    // Create new DM thread
    const thread = await chatService.createThread({
      kind: 'dm',
      participants: [payerProfileId, receiverProfileId],
    });

    return thread.id;
  }

  /**
   * Send system notification to thread
   */
  private async sendSystemNotification(
    threadId: string,
    fromProfileId: string,
    notification: PayNotificationData
  ): Promise<void> {
    const meta = {
      payNotification: notification,
    };

    // System messages use type 'system' and store notification data in meta
    // ciphertext contains a readable fallback for clients that don't support rich notifications
    await chatService.createMessage({
      threadId,
      fromProfile: fromProfileId,
      type: 'system',
      ciphertext: `[${notification.title}] ${notification.body}`,
      meta,
    });

    await chatService.updateThreadLastMessage(threadId, Date.now());
  }

  // ============================================================================
  // Contract Notifications
  // ============================================================================

  async notifyContractCreated(contract: ContractWithParties): Promise<void> {
    const payerProfile = contract.payer.profile;
    const receiverProfile = contract.receiver.profile;

    if (!payerProfile || !receiverProfile) {
      console.warn('[PayNotification] Missing profiles for contract notification');
      return;
    }

    const threadId = await this.getOrCreatePayThread(
      payerProfile.id,
      receiverProfile.id,
      contract.id
    );

    const payerName = payerProfile.displayName || 'Usuario';
    const notification: PayNotificationData = {
      type: PayNotificationType.CONTRACT_CREATED,
      title: 'Novo Contrato de Pagamento',
      body: `${payerName} criou um contrato de pagamento recorrente de ${formatCurrency(contract.baseValue)}/${periodLabel(contract.period)}.`,
      data: {
        contractId: contract.id,
        value: contract.baseValue.toString(),
        currency: contract.currency,
        period: contract.period,
        nextPayment: contract.nextPaymentDate.toISOString(),
      },
      actions: [{ label: 'Ver Contrato', url: `/pay/contracts/${contract.id}` }],
      variant: 'default',
    };

    await this.sendSystemNotification(threadId, payerProfile.id, notification);
  }

  async notifyContractPaused(
    contract: ContractWithParties,
    pausedByUserId: string,
    reason?: string
  ): Promise<void> {
    const payerProfile = contract.payer.profile;
    const receiverProfile = contract.receiver.profile;

    if (!payerProfile || !receiverProfile) return;

    const threadId = await this.getOrCreatePayThread(payerProfile.id, receiverProfile.id, contract.id);

    const pausedByPayer = pausedByUserId === contract.payerId;
    const pausedByName = pausedByPayer
      ? payerProfile.displayName || 'Pagador'
      : receiverProfile.displayName || 'Recebedor';

    const notification: PayNotificationData = {
      type: PayNotificationType.CONTRACT_PAUSED,
      title: 'Contrato Pausado',
      body: `${pausedByName} pausou o contrato de pagamento.${reason ? ` Motivo: ${reason}` : ''}`,
      data: {
        contractId: contract.id,
        pausedBy: pausedByUserId,
        reason,
      },
      variant: 'warning',
    };

    const senderProfileId = pausedByPayer ? payerProfile.id : receiverProfile.id;
    await this.sendSystemNotification(threadId, senderProfileId, notification);
  }

  async notifyContractResumed(contract: ContractWithParties, resumedByUserId: string): Promise<void> {
    const payerProfile = contract.payer.profile;
    const receiverProfile = contract.receiver.profile;

    if (!payerProfile || !receiverProfile) return;

    const threadId = await this.getOrCreatePayThread(payerProfile.id, receiverProfile.id, contract.id);

    const resumedByPayer = resumedByUserId === contract.payerId;
    const resumedByName = resumedByPayer
      ? payerProfile.displayName || 'Pagador'
      : receiverProfile.displayName || 'Recebedor';

    const notification: PayNotificationData = {
      type: PayNotificationType.CONTRACT_RESUMED,
      title: 'Contrato Retomado',
      body: `${resumedByName} retomou o contrato de pagamento. Proximo pagamento: ${contract.nextPaymentDate.toLocaleDateString('pt-BR')}.`,
      data: {
        contractId: contract.id,
        resumedBy: resumedByUserId,
        nextPayment: contract.nextPaymentDate.toISOString(),
      },
      variant: 'success',
    };

    const senderProfileId = resumedByPayer ? payerProfile.id : receiverProfile.id;
    await this.sendSystemNotification(threadId, senderProfileId, notification);
  }

  async notifyContractClosed(
    contract: ContractWithParties,
    closedByUserId: string,
    reason?: string
  ): Promise<void> {
    const payerProfile = contract.payer.profile;
    const receiverProfile = contract.receiver.profile;

    if (!payerProfile || !receiverProfile) return;

    const threadId = await this.getOrCreatePayThread(payerProfile.id, receiverProfile.id, contract.id);

    const closedByPayer = closedByUserId === contract.payerId;
    const closedByName = closedByPayer
      ? payerProfile.displayName || 'Pagador'
      : receiverProfile.displayName || 'Recebedor';

    const notification: PayNotificationData = {
      type: PayNotificationType.CONTRACT_CLOSED,
      title: 'Contrato Encerrado',
      body: `${closedByName} encerrou o contrato de pagamento.${reason ? ` Motivo: ${reason}` : ''}`,
      data: {
        contractId: contract.id,
        closedBy: closedByUserId,
        reason,
      },
      variant: 'default',
    };

    const senderProfileId = closedByPayer ? payerProfile.id : receiverProfile.id;
    await this.sendSystemNotification(threadId, senderProfileId, notification);
  }

  // ============================================================================
  // Payment Execution Notifications
  // ============================================================================

  async notifyPaymentSuccess(
    execution: ExecutionWithContract,
    receiptUrl?: string
  ): Promise<void> {
    const contract = execution.contract;
    const payerProfile = contract.payer.profile;
    const receiverProfile = contract.receiver.profile;

    if (!payerProfile || !receiverProfile) return;

    const threadId = await this.getOrCreatePayThread(payerProfile.id, receiverProfile.id, contract.id);

    const payerName = payerProfile.displayName || 'Pagador';
    const receiverName = receiverProfile.displayName || 'Recebedor';

    // Notification for receiver
    const receiverNotification: PayNotificationData = {
      type: PayNotificationType.PAYMENT_SUCCESS,
      title: 'Pagamento Recebido',
      body: `Voce recebeu ${formatCurrency(execution.finalValue)} de ${payerName} (${formatMonth(execution.periodRef)}).`,
      data: {
        executionId: execution.id,
        value: execution.finalValue.toString(),
        txHash: execution.txHash,
        periodRef: execution.periodRef,
        receiptUrl,
      },
      variant: 'success',
    };

    await this.sendSystemNotification(threadId, payerProfile.id, receiverNotification);
  }

  async notifyPaymentFailed(
    execution: ExecutionWithContract,
    reason: string
  ): Promise<void> {
    const contract = execution.contract;
    const payerProfile = contract.payer.profile;
    const receiverProfile = contract.receiver.profile;

    if (!payerProfile || !receiverProfile) return;

    const threadId = await this.getOrCreatePayThread(payerProfile.id, receiverProfile.id, contract.id);

    const receiverName = receiverProfile.displayName || 'Recebedor';

    const reasonText: Record<string, string> = {
      INSUFFICIENT_BALANCE: 'Saldo insuficiente',
      TECHNICAL_ERROR: 'Erro tecnico',
    };

    const notification: PayNotificationData = {
      type: PayNotificationType.PAYMENT_FAILED,
      title: 'Pagamento Nao Realizado',
      body: `O pagamento de ${formatCurrency(execution.baseValue)} para ${receiverName} falhou: ${reasonText[reason] || reason}`,
      data: {
        executionId: execution.id,
        reason,
        attemptCount: execution.attemptCount,
        nextRetry: execution.nextRetryAt?.toISOString(),
      },
      variant: 'error',
    };

    await this.sendSystemNotification(threadId, payerProfile.id, notification);
  }

  // ============================================================================
  // Adjustment Notifications
  // ============================================================================

  async notifyAdjustmentPending(adjustment: AdjustmentWithContract): Promise<void> {
    const contract = adjustment.contract;
    const payerProfile = contract.payer.profile;
    const receiverProfile = contract.receiver.profile;

    if (!payerProfile || !receiverProfile) return;

    const threadId = await this.getOrCreatePayThread(payerProfile.id, receiverProfile.id, contract.id);

    const payerName = payerProfile.displayName || 'Pagador';
    const typeLabel = adjustment.type === 'EXTRA' ? 'Extra' : 'Desconto';
    const sign = adjustment.type === 'EXTRA' ? '+' : '-';

    const notification: PayNotificationData = {
      type: PayNotificationType.ADJUSTMENT_PENDING,
      title: `${typeLabel} Pendente de Aprovacao`,
      body: `${payerName} adicionou um ${typeLabel.toLowerCase()} de ${sign}${formatCurrency(adjustment.value)} para ${formatMonth(adjustment.referenceMonth)}.${adjustment.reason ? ` Motivo: ${adjustment.reason}` : ''}`,
      data: {
        adjustmentId: adjustment.id,
        type: adjustment.type,
        value: adjustment.value.toString(),
        reason: adjustment.reason,
        referenceMonth: adjustment.referenceMonth,
      },
      actions: [
        { label: 'Aprovar', action: 'approve_adjustment', url: `/pay/contracts/${contract.id}` },
        { label: 'Recusar', action: 'reject_adjustment', url: `/pay/contracts/${contract.id}` },
      ],
      variant: 'warning',
    };

    await this.sendSystemNotification(threadId, payerProfile.id, notification);
  }

  async notifyAdjustmentApproved(adjustment: AdjustmentWithContract): Promise<void> {
    const contract = adjustment.contract;
    const payerProfile = contract.payer.profile;
    const receiverProfile = contract.receiver.profile;

    if (!payerProfile || !receiverProfile) return;

    const threadId = await this.getOrCreatePayThread(payerProfile.id, receiverProfile.id, contract.id);

    const receiverName = receiverProfile.displayName || 'Recebedor';
    const typeLabel = adjustment.type === 'EXTRA' ? 'extra' : 'desconto';
    const sign = adjustment.type === 'EXTRA' ? '+' : '-';

    const notification: PayNotificationData = {
      type: PayNotificationType.ADJUSTMENT_APPROVED,
      title: 'Ajuste Aprovado',
      body: `${receiverName} aprovou o ${typeLabel} de ${sign}${formatCurrency(adjustment.value)} para ${formatMonth(adjustment.referenceMonth)}.`,
      data: {
        adjustmentId: adjustment.id,
        type: adjustment.type,
        value: adjustment.value.toString(),
      },
      variant: 'success',
    };

    await this.sendSystemNotification(threadId, receiverProfile.id, notification);
  }

  async notifyAdjustmentRejected(adjustment: AdjustmentWithContract, reason?: string): Promise<void> {
    const contract = adjustment.contract;
    const payerProfile = contract.payer.profile;
    const receiverProfile = contract.receiver.profile;

    if (!payerProfile || !receiverProfile) return;

    const threadId = await this.getOrCreatePayThread(payerProfile.id, receiverProfile.id, contract.id);

    const receiverName = receiverProfile.displayName || 'Recebedor';
    const typeLabel = adjustment.type === 'EXTRA' ? 'extra' : 'desconto';

    const notification: PayNotificationData = {
      type: PayNotificationType.ADJUSTMENT_REJECTED,
      title: 'Ajuste Recusado',
      body: `${receiverName} recusou o ${typeLabel} de ${formatCurrency(adjustment.value)}.${reason ? ` Motivo: ${reason}` : ''}`,
      data: {
        adjustmentId: adjustment.id,
        type: adjustment.type,
        value: adjustment.value.toString(),
        rejectionReason: reason,
      },
      variant: 'error',
    };

    await this.sendSystemNotification(threadId, receiverProfile.id, notification);
  }
}

// Singleton instance
let payNotificationService: PayNotificationService | null = null;

export function initPayNotificationService(prisma: PrismaClient): PayNotificationService {
  payNotificationService = new PayNotificationService(prisma);
  return payNotificationService;
}

export function getPayNotificationService(): PayNotificationService | null {
  return payNotificationService;
}
