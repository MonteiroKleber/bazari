# Prompt 05: Notificações e Comprovantes

## Objetivo

Implementar sistema completo de notificações via BazChat e geração de comprovantes de pagamento.

## Pré-requisitos

- Fases 1-4 implementadas
- Sistema BazChat existente

## Contexto

Tudo que envolve dinheiro é privado. Notificações vão exclusivamente via BazChat. Comprovantes são gerados automaticamente.

## Entrega Esperada

### 1. Backend (API)

#### 1.1 Tipos de Notificação

```typescript
enum PayNotificationType {
  // Contratos
  CONTRACT_CREATED = 'pay.contract.created',
  CONTRACT_PAUSED = 'pay.contract.paused',
  CONTRACT_RESUMED = 'pay.contract.resumed',
  CONTRACT_CLOSED = 'pay.contract.closed',

  // Execuções
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
```

#### 1.2 Serviço de Notificações

```typescript
// apps/api/src/services/pay-notification.service.ts

import { ChatService } from './chat.service';
import { PushService } from './push.service';

export class PayNotificationService {
  constructor(
    private chat: ChatService,
    private push: PushService,
  ) {}

  async notifyContractCreated(contract: PayContract, receiver: User) {
    // Criar thread privada se não existir
    const thread = await this.chat.getOrCreateDmThread({
      participants: [contract.payerId, contract.receiverId],
      metadata: { type: 'pay_contract', contractId: contract.id },
    });

    // Enviar mensagem
    await this.chat.sendSystemMessage(thread.id, {
      type: PayNotificationType.CONTRACT_CREATED,
      title: 'Novo Contrato de Pagamento',
      body: `${contract.payer.displayName} criou um contrato de pagamento recorrente para você.`,
      data: {
        contractId: contract.id,
        value: contract.baseValue.toString(),
        currency: contract.currency,
        period: contract.period,
        nextPayment: contract.nextPaymentDate.toISOString(),
      },
      actions: [
        { label: 'Ver Contrato', url: `/pay/contracts/${contract.id}` },
      ],
    });

    // Push notification
    await this.push.send(receiver.id, {
      title: 'Novo Contrato de Pagamento',
      body: `${contract.payer.displayName} criou um contrato de ${formatCurrency(contract.baseValue)}/${periodLabel(contract.period)}`,
      data: { type: 'pay_contract', contractId: contract.id },
    });
  }

  async notifyPaymentSuccess(contract: PayContract, execution: PayExecution) {
    const thread = await this.getContractThread(contract.id);

    // Gerar comprovante
    const receiptUrl = await this.generateReceipt(execution);

    // Notificar recebedor
    await this.chat.sendSystemMessage(thread.id, {
      type: PayNotificationType.PAYMENT_SUCCESS,
      title: 'Pagamento Recebido',
      body: `Você recebeu ${formatCurrency(execution.finalValue)} de ${contract.payer.displayName}.`,
      data: {
        executionId: execution.id,
        value: execution.finalValue.toString(),
        txHash: execution.txHash,
        periodRef: execution.periodRef,
      },
      attachments: [
        { type: 'receipt', url: receiptUrl, label: 'Comprovante' },
      ],
    });

    // Notificar pagador
    await this.chat.sendSystemMessage(thread.id, {
      type: PayNotificationType.PAYMENT_SUCCESS,
      title: 'Pagamento Enviado',
      body: `Pagamento de ${formatCurrency(execution.finalValue)} para ${contract.receiver.displayName} realizado com sucesso.`,
      data: {
        executionId: execution.id,
        value: execution.finalValue.toString(),
        txHash: execution.txHash,
      },
      attachments: [
        { type: 'receipt', url: receiptUrl, label: 'Comprovante' },
      ],
    });

    // Push para recebedor
    await this.push.send(contract.receiverId, {
      title: '💰 Pagamento Recebido',
      body: `${formatCurrency(execution.finalValue)} de ${contract.payer.displayName}`,
      data: { type: 'pay_success', executionId: execution.id },
    });
  }

  async notifyPaymentFailed(contract: PayContract, execution: PayExecution, reason: string) {
    const thread = await this.getContractThread(contract.id);

    const reasonText = {
      INSUFFICIENT_BALANCE: 'Saldo insuficiente',
      TECHNICAL_ERROR: 'Erro técnico',
    }[reason] || reason;

    // Notificar pagador
    await this.chat.sendSystemMessage(thread.id, {
      type: PayNotificationType.PAYMENT_FAILED,
      title: '⚠️ Pagamento Não Realizado',
      body: `O pagamento para ${contract.receiver.displayName} falhou: ${reasonText}`,
      data: {
        executionId: execution.id,
        reason,
        attemptCount: execution.attemptCount,
        nextRetry: execution.nextRetryAt?.toISOString(),
      },
      variant: 'warning',
    });

    // Push para pagador
    await this.push.send(contract.payerId, {
      title: '⚠️ Pagamento Falhou',
      body: `Pagamento para ${contract.receiver.displayName}: ${reasonText}`,
      data: { type: 'pay_failed', executionId: execution.id },
    });
  }

  async notifyAdjustmentPending(contract: PayContract, adjustment: PayAdjustment) {
    const thread = await this.getContractThread(contract.id);

    const typeLabel = adjustment.type === 'EXTRA' ? 'Extra' : 'Desconto';
    const sign = adjustment.type === 'EXTRA' ? '+' : '-';

    await this.chat.sendSystemMessage(thread.id, {
      type: PayNotificationType.ADJUSTMENT_PENDING,
      title: `${typeLabel} Pendente de Aprovação`,
      body: `${contract.payer.displayName} adicionou um ${typeLabel.toLowerCase()} de ${sign}${formatCurrency(adjustment.value)} para ${formatMonth(adjustment.referenceMonth)}.`,
      data: {
        adjustmentId: adjustment.id,
        type: adjustment.type,
        value: adjustment.value.toString(),
        reason: adjustment.reason,
      },
      actions: [
        { label: 'Aprovar', action: 'approve_adjustment', data: { id: adjustment.id } },
        { label: 'Recusar', action: 'reject_adjustment', data: { id: adjustment.id } },
      ],
    });

    // Push
    await this.push.send(contract.receiverId, {
      title: `${typeLabel} Pendente`,
      body: `${sign}${formatCurrency(adjustment.value)} - ${adjustment.reason}`,
      data: { type: 'pay_adjustment', adjustmentId: adjustment.id },
    });
  }
}
```

#### 1.3 Geração de Comprovante

```typescript
// apps/api/src/services/pay-receipt.service.ts

import PDFDocument from 'pdfkit';
import { S3 } from '@aws-sdk/client-s3';

export class PayReceiptService {
  async generateReceipt(execution: PayExecution): Promise<string> {
    const contract = execution.contract;
    const adjustments = await this.getAppliedAdjustments(execution.id);

    const doc = new PDFDocument({ size: 'A5' });
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', async () => {
        const buffer = Buffer.concat(chunks);
        const url = await this.uploadToS3(buffer, execution.id);
        resolve(url);
      });

      // Header
      doc.fontSize(20).text('BAZARI PAY', { align: 'center' });
      doc.fontSize(12).text('Comprovante de Pagamento', { align: 'center' });
      doc.moveDown();

      // Linha separadora
      doc.moveTo(50, doc.y).lineTo(350, doc.y).stroke();
      doc.moveDown();

      // Dados do pagamento
      doc.fontSize(10);
      doc.text(`Data: ${formatDate(execution.executedAt)}`);
      doc.text(`Período: ${formatMonth(execution.periodRef)}`);
      doc.moveDown();

      // Partes
      doc.text(`Pagador: ${contract.payer.displayName}`);
      doc.text(`Wallet: ${truncateAddress(contract.payerWallet)}`);
      doc.moveDown();
      doc.text(`Recebedor: ${contract.receiver.displayName}`);
      doc.text(`Wallet: ${truncateAddress(contract.receiverWallet)}`);
      doc.moveDown();

      // Valores
      doc.moveTo(50, doc.y).lineTo(350, doc.y).stroke();
      doc.moveDown();

      doc.text(`Valor Base: ${formatCurrency(execution.baseValue)}`);

      for (const adj of adjustments) {
        const sign = adj.type === 'EXTRA' ? '+' : '-';
        doc.text(`${adj.reason}: ${sign}${formatCurrency(adj.value)}`);
      }

      doc.moveDown();
      doc.fontSize(12).text(`TOTAL: ${formatCurrency(execution.finalValue)}`, { align: 'right' });

      // Blockchain
      doc.moveDown();
      doc.fontSize(8);
      doc.text(`TX Hash: ${execution.txHash}`);
      doc.text(`Block: ${execution.blockNumber}`);

      // QR Code de verificação
      const qrData = `https://bazari.libervia.xyz/pay/verify/${execution.txHash}`;
      // ... adicionar QR code ...

      doc.end();
    });
  }

  private async uploadToS3(buffer: Buffer, executionId: string): Promise<string> {
    const s3 = new S3({});
    const key = `receipts/${executionId}.pdf`;

    await s3.putObject({
      Bucket: process.env.RECEIPTS_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: 'application/pdf',
    });

    return `https://${process.env.RECEIPTS_BUCKET}.s3.amazonaws.com/${key}`;
  }
}
```

### 2. Frontend (Web)

#### 2.1 Componentes de Notificação

```
components/
  PayNotificationCard.tsx    # Card de notificação
  PaymentSuccessToast.tsx    # Toast de sucesso
  ReceiptViewer.tsx          # Visualizar comprovante
  ReceiptDownload.tsx        # Botão de download
```

#### 2.2 PayNotificationCard.tsx

```tsx
interface PayNotificationCardProps {
  notification: {
    type: string;
    title: string;
    body: string;
    data: Record<string, any>;
    attachments?: Array<{ type: string; url: string; label: string }>;
    actions?: Array<{ label: string; action?: string; url?: string }>;
  };
}

export function PayNotificationCard({ notification }: PayNotificationCardProps) {
  const icon = {
    [PayNotificationType.PAYMENT_SUCCESS]: <CheckCircle className="text-green-500" />,
    [PayNotificationType.PAYMENT_FAILED]: <XCircle className="text-red-500" />,
    [PayNotificationType.ADJUSTMENT_PENDING]: <AlertCircle className="text-yellow-500" />,
  }[notification.type] || <Bell />;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div className="shrink-0">{icon}</div>
          <div className="flex-1">
            <h4 className="font-medium">{notification.title}</h4>
            <p className="text-sm text-muted-foreground">{notification.body}</p>

            {notification.attachments?.map((att) => (
              <a
                key={att.url}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <FileText className="h-4 w-4" />
                {att.label}
              </a>
            ))}

            {notification.actions && (
              <div className="mt-3 flex gap-2">
                {notification.actions.map((action) => (
                  <Button
                    key={action.label}
                    size="sm"
                    variant={action.action ? 'default' : 'outline'}
                    onClick={() => handleAction(action)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 2.3 ReceiptViewer.tsx

```tsx
interface ReceiptViewerProps {
  execution: PayExecution;
}

export function ReceiptViewer({ execution }: ReceiptViewerProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const blob = await payApi.downloadReceipt(execution.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprovante-${execution.periodRef}.pdf`;
      a.click();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Comprovante</h4>
            <p className="text-sm text-muted-foreground">
              {formatMonth(execution.periodRef)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(execution.receiptUrl, '_blank')}
            >
              <Eye className="h-4 w-4 mr-1" />
              Visualizar
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              Baixar PDF
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 3. Integração com BazChat

#### 3.1 Tipo de Mensagem Especial

```typescript
// types/chat.ts
interface PaySystemMessage {
  type: 'pay_notification';
  notificationType: PayNotificationType;
  title: string;
  body: string;
  data: Record<string, any>;
  attachments?: PayAttachment[];
  actions?: PayAction[];
}

// Renderização no chat
function ChatMessage({ message }: { message: Message }) {
  if (message.type === 'pay_notification') {
    return <PayNotificationCard notification={message} />;
  }
  // ... outros tipos
}
```

### 4. Email de Backup (Opcional)

```typescript
// Se usuário configurou email de backup
async function sendEmailBackup(userId: string, notification: PayNotification) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, emailBackupEnabled: true },
  });

  if (!user?.email || !user.emailBackupEnabled) return;

  await emailService.send({
    to: user.email,
    subject: notification.title,
    template: 'pay-notification',
    data: notification,
  });
}
```

## Critérios de Aceite

- [ ] Notificações enviadas via BazChat
- [ ] Push notifications funcionam
- [ ] Comprovante PDF gerado automaticamente
- [ ] Comprovante disponível para download
- [ ] Ações inline (aprovar/rejeitar) funcionam
- [ ] TX hash clicável leva ao explorador
- [ ] Email de backup (se configurado)

## Arquivos a Criar

```
apps/api/
  src/services/pay-notification.service.ts
  src/services/pay-receipt.service.ts
  src/templates/pay-receipt.ts

apps/web/src/modules/pay/
  components/PayNotificationCard.tsx
  components/ReceiptViewer.tsx
  components/ReceiptDownload.tsx
```
