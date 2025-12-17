# Prompt 02: Scheduler e Execução Automática

## Objetivo

Implementar o scheduler de pagamentos e a lógica de execução automática.

## Pré-requisitos

- Fase 1 (Contratos) implementada
- Sistema de wallets com transferência
- Infraestrutura de cron/scheduler

## Contexto

O scheduler roda diariamente, identifica contratos com pagamento no dia e executa as transferências automaticamente.

## Entrega Esperada

### 1. Backend (API)

#### 1.1 Schema Prisma

```prisma
model PayExecution {
  id                String   @id @default(uuid())
  contractId        String
  contract          PayContract @relation(fields: [contractId], references: [id])

  // Período
  periodStart       DateTime
  periodEnd         DateTime
  periodRef         String      // "2025-02" formato YYYY-MM

  // Valores
  baseValue         Decimal  @db.Decimal(18, 8)
  adjustmentsTotal  Decimal  @db.Decimal(18, 8) @default(0)
  finalValue        Decimal  @db.Decimal(18, 8)

  // Status
  status            ExecutionStatus
  attemptCount      Int      @default(1)
  failureReason     String?

  // On-chain
  txHash            String?
  blockNumber       Int?

  // Datas
  scheduledAt       DateTime
  executedAt        DateTime?
  nextRetryAt       DateTime?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

enum ExecutionStatus {
  SCHEDULED
  PROCESSING
  SUCCESS
  FAILED
  RETRYING
  SKIPPED
}
```

#### 1.2 Serviço de Scheduler

Criar em `apps/api/src/services/pay-scheduler.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from './prisma.service';
import { WalletService } from './wallet.service';
import { NotificationService } from './notification.service';

@Injectable()
export class PaySchedulerService {
  constructor(
    private prisma: PrismaService,
    private wallet: WalletService,
    private notification: NotificationService,
  ) {}

  /**
   * Executa todos os dias às 06:00
   */
  @Cron('0 6 * * *')
  async processScheduledPayments() {
    console.log('[PayScheduler] Iniciando processamento de pagamentos...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar contratos com pagamento hoje
    const contracts = await this.prisma.payContract.findMany({
      where: {
        status: 'ACTIVE',
        nextPaymentDate: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      include: {
        payer: true,
        receiver: true,
      },
    });

    console.log(`[PayScheduler] ${contracts.length} contratos para processar`);

    for (const contract of contracts) {
      try {
        await this.processContract(contract);
      } catch (error) {
        console.error(`[PayScheduler] Erro ao processar ${contract.id}:`, error);
      }
    }

    console.log('[PayScheduler] Processamento concluído');
  }

  /**
   * Processa retries a cada hora
   */
  @Cron('0 * * * *')
  async processRetries() {
    const now = new Date();

    const executions = await this.prisma.payExecution.findMany({
      where: {
        status: 'RETRYING',
        nextRetryAt: { lte: now },
        attemptCount: { lt: 3 },
      },
      include: {
        contract: {
          include: { payer: true, receiver: true },
        },
      },
    });

    for (const execution of executions) {
      await this.retryExecution(execution);
    }
  }

  private async processContract(contract: PayContract) {
    const periodRef = this.getPeriodRef(new Date());

    // Verificar se já existe execução para este período
    const existing = await this.prisma.payExecution.findFirst({
      where: {
        contractId: contract.id,
        periodRef,
        status: { in: ['SUCCESS', 'PROCESSING'] },
      },
    });

    if (existing) {
      console.log(`[PayScheduler] Período ${periodRef} já processado para ${contract.id}`);
      return;
    }

    // Buscar ajustes do período (Fase 3)
    const adjustments = await this.getAdjustmentsForPeriod(contract.id, periodRef);
    const adjustmentsTotal = adjustments.reduce((sum, adj) => {
      return adj.type === 'EXTRA'
        ? sum + Number(adj.value)
        : sum - Number(adj.value);
    }, 0);

    const finalValue = Number(contract.baseValue) + adjustmentsTotal;

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
        status: 'PROCESSING',
        scheduledAt: new Date(),
      },
    });

    try {
      // Verificar saldo
      const balance = await this.wallet.getBalance(contract.payerWallet);

      if (balance < finalValue) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      // Executar transferência
      const result = await this.wallet.transfer({
        from: contract.payerWallet,
        to: contract.receiverWallet,
        amount: finalValue,
        currency: contract.currency,
        reference: `pay_${execution.id}`,
      });

      // Atualizar execução com sucesso
      await this.prisma.payExecution.update({
        where: { id: execution.id },
        data: {
          status: 'SUCCESS',
          executedAt: new Date(),
          txHash: result.txHash,
          blockNumber: result.blockNumber,
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

      // Marcar ajustes como aplicados
      await this.markAdjustmentsAsApplied(adjustments, execution.id);

      // Notificar partes
      await this.notifyPaymentSuccess(contract, execution);

    } catch (error) {
      await this.handleExecutionFailure(execution, error);
    }
  }

  private async handleExecutionFailure(
    execution: PayExecution,
    error: Error
  ) {
    const isInsufficientBalance = error.message === 'INSUFFICIENT_BALANCE';

    if (execution.attemptCount >= 3) {
      // Máximo de tentativas
      await this.prisma.payExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          failureReason: error.message,
        },
      });

      await this.notifyPaymentFailed(execution, error.message);
      return;
    }

    // Agendar retry
    const retryDelay = isInsufficientBalance
      ? 24 * 60 * 60 * 1000  // 24h para saldo
      : 60 * 60 * 1000;      // 1h para erro técnico

    await this.prisma.payExecution.update({
      where: { id: execution.id },
      data: {
        status: 'RETRYING',
        failureReason: error.message,
        nextRetryAt: new Date(Date.now() + retryDelay),
        attemptCount: { increment: 1 },
      },
    });

    await this.notifyPaymentRetrying(execution, error.message);
  }

  private async retryExecution(execution: PayExecution & { contract: PayContract }) {
    await this.prisma.payExecution.update({
      where: { id: execution.id },
      data: { status: 'PROCESSING' },
    });

    try {
      const balance = await this.wallet.getBalance(execution.contract.payerWallet);

      if (balance < Number(execution.finalValue)) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      const result = await this.wallet.transfer({
        from: execution.contract.payerWallet,
        to: execution.contract.receiverWallet,
        amount: Number(execution.finalValue),
        currency: execution.contract.currency,
        reference: `pay_${execution.id}`,
      });

      await this.prisma.payExecution.update({
        where: { id: execution.id },
        data: {
          status: 'SUCCESS',
          executedAt: new Date(),
          txHash: result.txHash,
          blockNumber: result.blockNumber,
        },
      });

      // Atualizar próximo pagamento
      const nextPaymentDate = this.calculateNextPaymentDate(
        execution.contract.nextPaymentDate,
        execution.contract.period,
        execution.contract.paymentDay
      );

      await this.prisma.payContract.update({
        where: { id: execution.contract.id },
        data: { nextPaymentDate },
      });

      await this.notifyPaymentSuccess(execution.contract, execution);

    } catch (error) {
      await this.handleExecutionFailure(execution, error);
    }
  }

  // Helpers
  private getPeriodRef(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private getPeriodStart(period: PayPeriod, date: Date): Date {
    const start = new Date(date);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private getPeriodEnd(period: PayPeriod, date: Date): Date {
    const end = new Date(date);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
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
        next.setDate(paymentDay);
        break;
    }

    return next;
  }
}
```

#### 1.3 Endpoints de Execução

```typescript
// GET /api/pay/contracts/:id/executions
// Lista execuções de um contrato
router.get('/:id/executions', async (req, res) => {
  const { id } = req.params;
  const { cursor, limit = 20 } = req.query;

  const executions = await prisma.payExecution.findMany({
    where: { contractId: id },
    orderBy: { scheduledAt: 'desc' },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
  });

  const hasMore = executions.length > limit;
  const items = hasMore ? executions.slice(0, -1) : executions;

  return res.json({
    items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
});

// GET /api/pay/executions/history
// Histórico geral de pagamentos do usuário
router.get('/history', async (req, res) => {
  const { type, status, startDate, endDate, cursor, limit = 20 } = req.query;

  const where: any = {
    contract: {
      OR: [
        { payerId: req.user.id },
        { receiverId: req.user.id },
      ],
    },
  };

  if (status) where.status = status;
  if (startDate || endDate) {
    where.scheduledAt = {};
    if (startDate) where.scheduledAt.gte = new Date(startDate);
    if (endDate) where.scheduledAt.lte = new Date(endDate);
  }

  const executions = await prisma.payExecution.findMany({
    where,
    include: {
      contract: {
        include: { payer: true, receiver: true },
      },
    },
    orderBy: { scheduledAt: 'desc' },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
  });

  return res.json({
    items: executions.slice(0, limit),
    nextCursor: executions.length > limit ? executions[limit - 1].id : null,
  });
});
```

### 2. Frontend (Web)

#### 2.1 Páginas

```
pages/
  ExecutionHistoryPage.tsx   # Histórico de pagamentos
```

#### 2.2 Componentes

```
components/
  ExecutionCard.tsx          # Card de execução
  ExecutionStatus.tsx        # Badge de status
  ExecutionTimeline.tsx      # Timeline de execuções
  UpcomingPayments.tsx       # Próximos pagamentos
```

#### 2.3 ExecutionHistoryPage.tsx

Layout:
```
┌─────────────────────────────────────────────┐
│ Histórico de Pagamentos                      │
├─────────────────────────────────────────────┤
│ Filtros:                                     │
│ [Período ▼] [Status ▼] [Tipo ▼] [Exportar]  │
├─────────────────────────────────────────────┤
│ Fevereiro 2025                               │
│ ┌─────────────────────────────────────────┐ │
│ │ 05/02  John Doe      R$ 8.000   ✅      │ │
│ │        Salário mensal                   │ │
│ │        TX: 0x1234...  [Ver]             │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ 05/02  Maria Silva   R$ 5.000   ⏳      │ │
│ │        Salário mensal    Retry em 24h   │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ Janeiro 2025                                 │
│ ┌─────────────────────────────────────────┐ │
│ │ 05/01  John Doe      R$ 8.000   ✅      │ │
│ │        Salário mensal                   │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

#### 2.4 UpcomingPayments.tsx

```tsx
export function UpcomingPayments() {
  const { data, isLoading } = useQuery({
    queryKey: ['upcoming-payments'],
    queryFn: () => payApi.getUpcoming({ days: 7 }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Próximos Pagamentos</CardTitle>
        <CardDescription>Próximos 7 dias</CardDescription>
      </CardHeader>
      <CardContent>
        {data?.items.map((contract) => (
          <div
            key={contract.id}
            className="flex items-center justify-between py-3 border-b last:border-0"
          >
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={contract.receiver.avatarUrl} />
                <AvatarFallback>{contract.receiver.displayName[0]}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{contract.receiver.displayName}</div>
                <div className="text-sm text-muted-foreground">
                  {formatDate(contract.nextPaymentDate)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">
                {formatCurrency(contract.baseValue, contract.currency)}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

### 3. Configuração do Scheduler

#### 3.1 Com NestJS Schedule

```typescript
// app.module.ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // ...
  ],
  providers: [PaySchedulerService],
})
export class AppModule {}
```

#### 3.2 Com Node-Cron (alternativa)

```typescript
// scheduler.ts
import cron from 'node-cron';
import { paySchedulerService } from './services';

// Execuções diárias às 06:00
cron.schedule('0 6 * * *', async () => {
  await paySchedulerService.processScheduledPayments();
});

// Retries a cada hora
cron.schedule('0 * * * *', async () => {
  await paySchedulerService.processRetries();
});
```

## Critérios de Aceite

- [ ] Scheduler roda diariamente às 06:00
- [ ] Contratos com pagamento no dia são processados
- [ ] Transferência executada corretamente
- [ ] Falha de saldo gera retry em 24h
- [ ] Máximo 3 tentativas por período
- [ ] Próximo pagamento atualizado após sucesso
- [ ] Histórico de execuções disponível
- [ ] Notificações enviadas (sucesso/falha/retry)

## Arquivos a Criar

```
apps/api/
  prisma/schema.prisma (modificar)
  src/services/pay-scheduler.service.ts
  src/routes/pay/executions.ts
  src/routes/pay/index.ts (modificar)

apps/web/src/modules/pay/
  pages/ExecutionHistoryPage.tsx
  components/ExecutionCard.tsx
  components/ExecutionStatus.tsx
  components/ExecutionTimeline.tsx
  components/UpcomingPayments.tsx
```
