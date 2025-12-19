// path: apps/api/src/services/pay-receipt.service.ts
// Bazari Pay - Receipt Service (PROMPT-05)

import type { PrismaClient } from '@prisma/client';

function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const months = [
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${months[parseInt(month, 10) - 1]} de ${year}`;
}

function truncateAddress(address: string): string {
  if (!address || address.length < 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

export class PayReceiptService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Generate HTML receipt for a payment execution
   */
  async generateReceiptHtml(executionId: string): Promise<string> {
    const execution = await this.prisma.payExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      throw new Error('Execution not found');
    }

    const contract = await this.prisma.payContract.findUnique({
      where: { id: execution.contractId },
      include: {
        payer: { include: { profile: true } },
        receiver: { include: { profile: true } },
      },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    // Buscar ajustes aplicados a essa execucao
    const adjustments = await this.prisma.payAdjustment.findMany({
      where: {
        executionId: executionId,
        status: 'APPLIED',
      },
      select: {
        type: true,
        value: true,
        reason: true,
      },
    });

    const payerName = contract.payer.profile?.displayName || contract.payer.profile?.handle || 'Usuario';
    const receiverName = contract.receiver.profile?.displayName || contract.receiver.profile?.handle || 'Usuario';

    const verifyUrl = `https://bazari.libervia.xyz/pay/verify/${execution.txHash || executionId}`;

    return this.renderReceiptHtml({
      id: execution.id,
      periodRef: execution.periodRef,
      baseValue: execution.baseValue,
      finalValue: execution.finalValue,
      txHash: execution.txHash,
      blockNumber: execution.blockNumber,
      executedAt: execution.executedAt,
      payerName,
      receiverName,
      payerWallet: contract.payerWallet,
      receiverWallet: contract.receiverWallet,
      currency: contract.currency,
      adjustments,
    }, verifyUrl);
  }

  private renderReceiptHtml(data: {
    id: string;
    periodRef: string;
    baseValue: any;
    finalValue: any;
    txHash?: string | null;
    blockNumber?: number | null;
    executedAt?: Date | null;
    payerName: string;
    receiverName: string;
    payerWallet: string;
    receiverWallet: string;
    currency: string;
    adjustments: Array<{ type: string; value: any; reason?: string | null }>;
  }, verifyUrl: string): string {
    let adjustmentsHtml = '';
    if (data.adjustments.length > 0) {
      adjustmentsHtml = data.adjustments
        .map((adj) => {
          const sign = adj.type === 'EXTRA' ? '+' : '-';
          return `
            <tr class="adjustment">
              <td>${adj.reason || (adj.type === 'EXTRA' ? 'Extra' : 'Desconto')}</td>
              <td class="value">${sign} ${formatCurrency(adj.value)} ${data.currency}</td>
            </tr>
          `;
        })
        .join('');
    }

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comprovante de Pagamento - Bazari Pay</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      color: #1a1a1a;
    }
    .receipt {
      max-width: 400px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: white;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .header .subtitle {
      font-size: 14px;
      opacity: 0.9;
    }
    .status {
      display: inline-block;
      background: #22c55e;
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 12px;
    }
    .content {
      padding: 24px;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .party {
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .party-label {
      font-size: 11px;
      color: #666;
      margin-bottom: 4px;
    }
    .party-name {
      font-weight: 600;
      font-size: 14px;
    }
    .party-wallet {
      font-size: 11px;
      color: #888;
      font-family: monospace;
      margin-top: 4px;
    }
    .values-table {
      width: 100%;
      border-collapse: collapse;
    }
    .values-table td {
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .values-table .value {
      text-align: right;
      font-family: monospace;
    }
    .values-table .adjustment td {
      color: #666;
      font-size: 14px;
    }
    .total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: #f0fdf4;
      border-radius: 8px;
      margin-top: 16px;
    }
    .total-label {
      font-weight: 600;
      color: #166534;
    }
    .total-value {
      font-size: 24px;
      font-weight: 700;
      color: #166534;
      font-family: monospace;
    }
    .blockchain {
      background: #f8f9fa;
      padding: 16px;
      border-radius: 8px;
      margin-top: 16px;
    }
    .blockchain-item {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 8px;
    }
    .blockchain-item:last-child {
      margin-bottom: 0;
    }
    .blockchain-label {
      color: #666;
    }
    .blockchain-value {
      font-family: monospace;
      color: #4f46e5;
      word-break: break-all;
      text-align: right;
      max-width: 200px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      background: #f8f9fa;
      border-top: 1px solid #eee;
    }
    .verify-link {
      display: inline-block;
      background: #4f46e5;
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
    }
    .verify-link:hover {
      background: #4338ca;
    }
    .footer-text {
      font-size: 11px;
      color: #888;
      margin-top: 12px;
    }
    @media print {
      body { background: white; padding: 0; }
      .receipt { box-shadow: none; }
      .verify-link { display: none; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>BAZARI PAY</h1>
      <div class="subtitle">Comprovante de Pagamento</div>
      <div class="status">PAGO</div>
    </div>

    <div class="content">
      <div class="section">
        <div class="section-title">Periodo</div>
        <div style="font-size: 16px; font-weight: 500;">
          ${formatMonth(data.periodRef)}
        </div>
        <div style="font-size: 12px; color: #666; margin-top: 4px;">
          ${data.executedAt ? formatDate(data.executedAt) : 'Data nao registrada'}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Partes</div>
        <div class="parties">
          <div class="party">
            <div class="party-label">Pagador</div>
            <div class="party-name">${data.payerName}</div>
            <div class="party-wallet">${truncateAddress(data.payerWallet)}</div>
          </div>
          <div class="party">
            <div class="party-label">Recebedor</div>
            <div class="party-name">${data.receiverName}</div>
            <div class="party-wallet">${truncateAddress(data.receiverWallet)}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Valores</div>
        <table class="values-table">
          <tr>
            <td>Valor Base</td>
            <td class="value">${formatCurrency(data.baseValue)} ${data.currency}</td>
          </tr>
          ${adjustmentsHtml}
        </table>

        <div class="total">
          <span class="total-label">TOTAL PAGO</span>
          <span class="total-value">${formatCurrency(data.finalValue)} ${data.currency}</span>
        </div>
      </div>

      ${data.txHash ? `
      <div class="blockchain">
        <div class="blockchain-item">
          <span class="blockchain-label">TX Hash</span>
          <span class="blockchain-value">${truncateAddress(data.txHash)}</span>
        </div>
        ${data.blockNumber ? `
        <div class="blockchain-item">
          <span class="blockchain-label">Bloco</span>
          <span class="blockchain-value">#${data.blockNumber}</span>
        </div>
        ` : ''}
      </div>
      ` : ''}
    </div>

    <div class="footer">
      <a href="${verifyUrl}" class="verify-link" target="_blank">
        Verificar Autenticidade
      </a>
      <div class="footer-text">
        Este comprovante e valido e pode ser verificado on-chain.<br>
        Bazari Pay - Pagamentos Recorrentes Descentralizados
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Get receipt data as JSON (for API responses)
   */
  async getReceiptData(executionId: string): Promise<{
    execution: any;
    verifyUrl: string;
  }> {
    const execution = await this.prisma.payExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      throw new Error('Execution not found');
    }

    const contract = await this.prisma.payContract.findUnique({
      where: { id: execution.contractId },
      include: {
        payer: { include: { profile: true } },
        receiver: { include: { profile: true } },
      },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    // Buscar ajustes aplicados
    const adjustments = await this.prisma.payAdjustment.findMany({
      where: {
        executionId: executionId,
        status: 'APPLIED',
      },
      select: {
        type: true,
        value: true,
        reason: true,
      },
    });

    const verifyUrl = `https://bazari.libervia.xyz/pay/verify/${execution.txHash || executionId}`;

    return {
      execution: {
        id: execution.id,
        periodRef: execution.periodRef,
        baseValue: execution.baseValue.toString(),
        finalValue: execution.finalValue.toString(),
        txHash: execution.txHash,
        blockNumber: execution.blockNumber,
        executedAt: execution.executedAt?.toISOString(),
        payer: {
          displayName: contract.payer.profile?.displayName || 'Usuario',
          handle: contract.payer.profile?.handle,
          wallet: contract.payerWallet,
        },
        receiver: {
          displayName: contract.receiver.profile?.displayName || 'Usuario',
          handle: contract.receiver.profile?.handle,
          wallet: contract.receiverWallet,
        },
        adjustments: adjustments.map((adj) => ({
          type: adj.type,
          value: adj.value.toString(),
          reason: adj.reason,
        })),
      },
      verifyUrl,
    };
  }
}

// Singleton instance
let payReceiptService: PayReceiptService | null = null;

export function initPayReceiptService(prisma: PrismaClient): PayReceiptService {
  payReceiptService = new PayReceiptService(prisma);
  return payReceiptService;
}

export function getPayReceiptService(): PayReceiptService | null {
  return payReceiptService;
}
