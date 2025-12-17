# Bazari Pay - Modelo de Entidades

## Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        OFF-CHAIN (PostgreSQL)                    │
├─────────────────────────────────────────────────────────────────┤
│  PayContract (metadados)                                         │
│         ↓                                                        │
│  PayAdjustment (extras/descontos)                               │
│         ↓                                                        │
│  PayExecution (histórico detalhado)                             │
│         ↓                                                        │
│  PayNotification (fila de notificações)                         │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                      ON-CHAIN (Substrate)                        │
├─────────────────────────────────────────────────────────────────┤
│  RecurringPaymentContract                                        │
│  - id                                                            │
│  - payer                                                         │
│  - receiver                                                      │
│  - value                                                         │
│  - period                                                        │
│  - status                                                        │
│  - next_payment                                                  │
│                                                                  │
│  PaymentExecution                                                │
│  - contract_id                                                   │
│  - period_ref                                                    │
│  - value_paid                                                    │
│  - executed_at                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Entidades Off-Chain

### 1. PayContract

```prisma
model PayContract {
  id                String   @id @default(uuid())

  // Partes
  payerId           String
  payer             User     @relation("ContractPayer", fields: [payerId], references: [id])
  payerCompanyId    String?
  payerCompany      Company? @relation(fields: [payerCompanyId], references: [id])
  receiverId        String
  receiver          User     @relation("ContractReceiver", fields: [receiverId], references: [id])

  // Wallets
  payerWallet       String
  receiverWallet    String

  // Valores
  baseValue         Decimal  @db.Decimal(18, 8)
  currency          String   @default("BZR")  // BZR ou BRL

  // Periodicidade
  period            PayPeriod
  paymentDay        Int      // 1-28

  // Datas
  startDate         DateTime
  endDate           DateTime?
  nextPaymentDate   DateTime

  // Status
  status            PayContractStatus @default(ACTIVE)

  // Descrição (off-chain)
  description       String?

  // Referência externa (ex: Work Agreement)
  referenceType     String?   // 'WORK_AGREEMENT', 'INVOICE', etc
  referenceId       String?

  // On-chain
  onChainId         String?   @unique
  onChainTxHash     String?

  // Metadados
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  pausedAt          DateTime?
  closedAt          DateTime?

  // Relações
  adjustments       PayAdjustment[]
  executions        PayExecution[]
  statusHistory     PayContractStatusHistory[]
}

enum PayPeriod {
  WEEKLY
  BIWEEKLY
  MONTHLY
}

enum PayContractStatus {
  ACTIVE
  PAUSED
  CLOSED
}
```

### 2. PayAdjustment

```prisma
model PayAdjustment {
  id                String   @id @default(uuid())
  contractId        String
  contract          PayContract @relation(fields: [contractId], references: [id])

  // Tipo e valor
  type              AdjustmentType
  value             Decimal  @db.Decimal(18, 8)

  // Período de referência
  referenceMonth    DateTime  // primeiro dia do mês de referência

  // Detalhes (off-chain)
  reason            String
  description       String?
  attachments       String[]  // URLs de anexos

  // Aprovação
  requiresApproval  Boolean  @default(false)
  status            AdjustmentStatus @default(DRAFT)
  approvedAt        DateTime?
  approvedById      String?

  // Metadados
  createdById       String
  createdBy         User     @relation(fields: [createdById], references: [id])
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

enum AdjustmentType {
  EXTRA
  DISCOUNT
}

enum AdjustmentStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  REJECTED
  APPLIED
  CANCELLED
}
```

### 3. PayExecution

```prisma
model PayExecution {
  id                String   @id @default(uuid())
  contractId        String
  contract          PayContract @relation(fields: [contractId], references: [id])

  // Período
  periodStart       DateTime
  periodEnd         DateTime

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

  // Relações
  appliedAdjustments PayExecutionAdjustment[]

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

model PayExecutionAdjustment {
  id            String   @id @default(uuid())
  executionId   String
  execution     PayExecution @relation(fields: [executionId], references: [id])
  adjustmentId  String
  adjustment    PayAdjustment @relation(fields: [adjustmentId], references: [id])
  valueApplied  Decimal  @db.Decimal(18, 8)
}
```

### 4. PayContractStatusHistory

```prisma
model PayContractStatusHistory {
  id            String   @id @default(uuid())
  contractId    String
  contract      PayContract @relation(fields: [contractId], references: [id])

  fromStatus    PayContractStatus
  toStatus      PayContractStatus
  reason        String?
  changedById   String
  changedBy     User     @relation(fields: [changedById], references: [id])

  createdAt     DateTime @default(now())
}
```

## Entidades On-Chain

### RecurringPaymentContract (Substrate Pallet)

```rust
#[pallet::storage]
pub type Contracts<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    ContractId,
    RecurringPaymentContract<T::AccountId, T::Balance>,
>;

#[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub struct RecurringPaymentContract<AccountId, Balance> {
    /// ID único (hash do UUID off-chain)
    pub id: [u8; 32],
    /// Wallet do pagador
    pub payer: AccountId,
    /// Wallet do recebedor
    pub receiver: AccountId,
    /// Valor base por período
    pub base_value: Balance,
    /// Periodicidade
    pub period: PaymentPeriod,
    /// Dia do pagamento (1-28)
    pub payment_day: u8,
    /// Status
    pub status: ContractStatus,
    /// Block de início
    pub start_block: BlockNumber,
    /// Block de fim (opcional)
    pub end_block: Option<BlockNumber>,
    /// Próximo pagamento (block estimado)
    pub next_payment_block: BlockNumber,
    /// Total de execuções
    pub execution_count: u32,
    /// Total pago
    pub total_paid: Balance,
}

#[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub enum PaymentPeriod {
    Weekly,
    Biweekly,
    Monthly,
}

#[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub enum ContractStatus {
    Active,
    Paused,
    Closed,
}
```

### PaymentExecution (On-Chain)

```rust
#[pallet::storage]
pub type Executions<T: Config> = StorageDoubleMap<
    _,
    Blake2_128Concat,
    ContractId,
    Blake2_128Concat,
    ExecutionId,
    PaymentExecution<T::Balance>,
>;

#[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub struct PaymentExecution<Balance> {
    /// ID da execução
    pub id: [u8; 32],
    /// Referência do período (ex: "2025-02")
    pub period_ref: [u8; 7],
    /// Valor pago (já com ajustes)
    pub value_paid: Balance,
    /// Block da execução
    pub executed_at: BlockNumber,
}
```

## Índices e Performance

```sql
-- Contratos por pagador
CREATE INDEX idx_contract_payer ON pay_contracts(payer_id);
CREATE INDEX idx_contract_payer_company ON pay_contracts(payer_company_id);

-- Contratos por recebedor
CREATE INDEX idx_contract_receiver ON pay_contracts(receiver_id);

-- Contratos ativos para scheduler
CREATE INDEX idx_contract_next_payment ON pay_contracts(next_payment_date)
  WHERE status = 'ACTIVE';

-- Execuções por contrato
CREATE INDEX idx_execution_contract ON pay_executions(contract_id);

-- Execuções por status (para retry)
CREATE INDEX idx_execution_status ON pay_executions(status)
  WHERE status IN ('SCHEDULED', 'RETRYING');

-- Ajustes pendentes
CREATE INDEX idx_adjustment_pending ON pay_adjustments(contract_id, reference_month)
  WHERE status IN ('APPROVED', 'DRAFT');
```

## Diagrama de Estados

### Contrato
```
ACTIVE ←→ PAUSED
   ↓
 CLOSED
```

### Ajuste
```
DRAFT → PENDING_APPROVAL → APPROVED → APPLIED
           ↓                   ↓
        REJECTED           CANCELLED
```

### Execução
```
SCHEDULED → PROCESSING → SUCCESS
                ↓
             FAILED → RETRYING → SUCCESS
                ↓         ↓
             SKIPPED   FAILED (max retries)
```

## Views Úteis

```sql
-- Resumo de contratos por empresa
CREATE VIEW company_pay_summary AS
SELECT
  payer_company_id,
  COUNT(*) as total_contracts,
  COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_contracts,
  SUM(base_value) FILTER (WHERE status = 'ACTIVE') as monthly_total
FROM pay_contracts
GROUP BY payer_company_id;

-- Próximos pagamentos (7 dias)
CREATE VIEW upcoming_payments AS
SELECT
  c.*,
  u.display_name as receiver_name
FROM pay_contracts c
JOIN users u ON c.receiver_id = u.id
WHERE c.status = 'ACTIVE'
  AND c.next_payment_date <= NOW() + INTERVAL '7 days'
ORDER BY c.next_payment_date;
```
