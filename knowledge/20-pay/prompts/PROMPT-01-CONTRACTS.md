# Prompt 01: Contratos de Pagamento Recorrente

## Objetivo

Implementar o sistema de criação e gestão de contratos de pagamento recorrente.

## Contexto

Um contrato de pagamento recorrente é criado uma vez e gera execuções automáticas. Nesta fase, focamos na criação e gestão do contrato, sem a execução automática.

## Entrega Esperada

### 1. Backend (API)

#### 1.1 Schema Prisma

Adicionar em `apps/api/prisma/schema.prisma`:

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
  currency          String   @default("BZR")

  // Periodicidade
  period            PayPeriod
  paymentDay        Int

  // Datas
  startDate         DateTime
  endDate           DateTime?
  nextPaymentDate   DateTime

  // Status
  status            PayContractStatus @default(ACTIVE)

  // Descrição
  description       String?

  // Referência externa
  referenceType     String?
  referenceId       String?

  // On-chain (será preenchido na Fase 4)
  onChainId         String?  @unique
  onChainTxHash     String?

  // Metadados
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  pausedAt          DateTime?
  closedAt          DateTime?

  // Relações
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

#### 1.2 Endpoints

Criar em `apps/api/src/routes/pay/contracts.ts`:

```typescript
// CRUD de Contratos
POST   /api/pay/contracts              // Criar contrato
GET    /api/pay/contracts              // Listar contratos (pagador ou recebedor)
GET    /api/pay/contracts/:id          // Detalhes do contrato
PATCH  /api/pay/contracts/:id          // Atualizar contrato (antes de iniciar)
DELETE /api/pay/contracts/:id          // Deletar rascunho

// Ações
POST   /api/pay/contracts/:id/pause    // Pausar
POST   /api/pay/contracts/:id/resume   // Retomar
POST   /api/pay/contracts/:id/close    // Encerrar

// Histórico
GET    /api/pay/contracts/:id/history  // Histórico de mudanças
```

**Request POST (Criar Contrato):**
```json
{
  "receiverHandle": "johndoe",
  "receiverWallet": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "baseValue": "8000.00",
  "currency": "BRL",
  "period": "MONTHLY",
  "paymentDay": 5,
  "startDate": "2025-02-01",
  "endDate": null,
  "description": "Salário mensal",
  "referenceType": "WORK_AGREEMENT",
  "referenceId": "uuid-do-acordo"
}
```

**Response:**
```json
{
  "contract": {
    "id": "uuid",
    "payer": {
      "id": "uuid",
      "handle": "techcorp",
      "displayName": "TechCorp"
    },
    "receiver": {
      "id": "uuid",
      "handle": "johndoe",
      "displayName": "John Doe"
    },
    "payerWallet": "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    "receiverWallet": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    "baseValue": "8000.00",
    "currency": "BRL",
    "period": "MONTHLY",
    "paymentDay": 5,
    "startDate": "2025-02-01",
    "endDate": null,
    "nextPaymentDate": "2025-02-05",
    "status": "ACTIVE",
    "description": "Salário mensal",
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```

#### 1.3 Lógica de Criação

```typescript
async function createContract(data: CreateContractData, userId: string) {
  // 1. Validar receiver
  const receiver = await prisma.user.findFirst({
    where: { handle: data.receiverHandle },
    include: { wallet: true },
  });

  if (!receiver) throw new NotFound('Recebedor não encontrado');

  // 2. Obter wallet do pagador
  const payer = await prisma.user.findUnique({
    where: { id: userId },
    include: { wallet: true, company: true },
  });

  if (!payer.wallet) throw new BadRequest('Você precisa ter uma wallet ativa');

  // 3. Validar dia do pagamento
  if (data.paymentDay < 1 || data.paymentDay > 28) {
    throw new BadRequest('Dia do pagamento deve ser entre 1 e 28');
  }

  // 4. Calcular próximo pagamento
  const nextPaymentDate = calculateNextPaymentDate(
    data.startDate,
    data.period,
    data.paymentDay
  );

  // 5. Criar contrato
  const contract = await prisma.payContract.create({
    data: {
      payerId: userId,
      payerCompanyId: payer.company?.id,
      receiverId: receiver.id,
      payerWallet: payer.wallet.address,
      receiverWallet: data.receiverWallet || receiver.wallet?.address,
      baseValue: data.baseValue,
      currency: data.currency,
      period: data.period,
      paymentDay: data.paymentDay,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      nextPaymentDate,
      description: data.description,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
    },
  });

  // 6. Notificar recebedor
  await notifyNewContract(contract, receiver);

  return contract;
}

function calculateNextPaymentDate(
  startDate: Date,
  period: PayPeriod,
  paymentDay: number
): Date {
  const start = new Date(startDate);
  let next = new Date(start);

  // Ajustar para o dia correto
  next.setDate(paymentDay);

  // Se já passou, avançar para próximo período
  if (next <= start) {
    switch (period) {
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        break;
      case 'BIWEEKLY':
        next.setDate(next.getDate() + 14);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        break;
    }
  }

  return next;
}
```

#### 1.4 Ações de Status

```typescript
// Pausar
async function pauseContract(contractId: string, userId: string, reason?: string) {
  const contract = await getContractWithAuth(contractId, userId);

  if (contract.status !== 'ACTIVE') {
    throw new BadRequest('Apenas contratos ativos podem ser pausados');
  }

  await prisma.$transaction([
    prisma.payContract.update({
      where: { id: contractId },
      data: { status: 'PAUSED', pausedAt: new Date() },
    }),
    prisma.payContractStatusHistory.create({
      data: {
        contractId,
        fromStatus: 'ACTIVE',
        toStatus: 'PAUSED',
        reason,
        changedById: userId,
      },
    }),
  ]);

  // Notificar outra parte
  await notifyContractStatusChange(contract, 'PAUSED', userId);
}

// Retomar
async function resumeContract(contractId: string, userId: string) {
  const contract = await getContractWithAuth(contractId, userId);

  if (contract.status !== 'PAUSED') {
    throw new BadRequest('Apenas contratos pausados podem ser retomados');
  }

  // Recalcular próximo pagamento
  const nextPaymentDate = calculateNextPaymentDate(
    new Date(),
    contract.period,
    contract.paymentDay
  );

  await prisma.$transaction([
    prisma.payContract.update({
      where: { id: contractId },
      data: { status: 'ACTIVE', pausedAt: null, nextPaymentDate },
    }),
    prisma.payContractStatusHistory.create({
      data: {
        contractId,
        fromStatus: 'PAUSED',
        toStatus: 'ACTIVE',
        changedById: userId,
      },
    }),
  ]);

  await notifyContractStatusChange(contract, 'ACTIVE', userId);
}

// Encerrar
async function closeContract(contractId: string, userId: string, reason: string) {
  const contract = await getContractWithAuth(contractId, userId);

  if (contract.status === 'CLOSED') {
    throw new BadRequest('Contrato já está encerrado');
  }

  await prisma.$transaction([
    prisma.payContract.update({
      where: { id: contractId },
      data: { status: 'CLOSED', closedAt: new Date() },
    }),
    prisma.payContractStatusHistory.create({
      data: {
        contractId,
        fromStatus: contract.status,
        toStatus: 'CLOSED',
        reason,
        changedById: userId,
      },
    }),
  ]);

  await notifyContractStatusChange(contract, 'CLOSED', userId);
}
```

### 2. Frontend (Web)

#### 2.1 Páginas

```
apps/web/src/modules/pay/
  pages/
    PayDashboardPage.tsx      # Dashboard principal
    ContractListPage.tsx      # Lista de contratos
    ContractDetailPage.tsx    # Detalhes do contrato
    ContractCreatePage.tsx    # Criar contrato
```

#### 2.2 Componentes

```
  components/
    ContractCard.tsx          # Card na listagem
    ContractForm.tsx          # Formulário de criação
    ContractStatus.tsx        # Badge de status
    ContractActions.tsx       # Botões de ação
    ReceiverSearch.tsx        # Busca de recebedor
    PeriodSelector.tsx        # Seletor de periodicidade
    PaymentDayPicker.tsx      # Seletor de dia
```

#### 2.3 PayDashboardPage.tsx

Layout:
```
┌─────────────────────────────────────────────┐
│ Bazari Pay                   [+ Novo Contrato]│
├─────────────────────────────────────────────┤
│ Resumo                                       │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│ │ 5       │ │ R$ 45k  │ │ 3       │         │
│ │Contratos│ │ /mês    │ │Pendentes│         │
│ └─────────┘ └─────────┘ └─────────┘         │
├─────────────────────────────────────────────┤
│ Próximos Pagamentos                          │
│ ┌─────────────────────────────────────────┐ │
│ │ John Doe          R$ 8.000   05/02      │ │
│ │ Maria Silva       R$ 5.000   05/02      │ │
│ │ Carlos Santos     R$ 6.500   10/02      │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ [Ver todos os contratos]                     │
└─────────────────────────────────────────────┘
```

#### 2.4 ContractCreatePage.tsx

Layout (Wizard):
```
┌─────────────────────────────────────────────┐
│ ← Novo Contrato de Pagamento                │
├─────────────────────────────────────────────┤
│ Passo 1 de 3: Recebedor                     │
│                                              │
│ [🔍 Buscar por handle ou wallet...]          │
│                                              │
│ ┌─────────────────────────────────────────┐ │
│ │ [Avatar] John Doe                       │ │
│ │          @johndoe                       │ │
│ │          5GrwvaEF...                    │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│                           [Próximo →]        │
├─────────────────────────────────────────────┤
│ Passo 2 de 3: Valores                        │
│                                              │
│ Valor do Pagamento                           │
│ [R$ ____] [BZR ▼]                            │
│                                              │
│ Periodicidade                                │
│ [○ Semanal] [○ Quinzenal] [● Mensal]        │
│                                              │
│ Dia do Pagamento                             │
│ [5 ▼]                                        │
│                                              │
│                   [← Voltar] [Próximo →]     │
├─────────────────────────────────────────────┤
│ Passo 3 de 3: Confirmar                      │
│                                              │
│ Resumo do Contrato                           │
│ • Recebedor: John Doe (@johndoe)            │
│ • Valor: R$ 8.000,00 / mês                  │
│ • Dia do pagamento: 5                        │
│ • Início: 01/02/2025                         │
│ • Primeiro pagamento: 05/02/2025            │
│                                              │
│ Descrição (opcional)                         │
│ [Salário mensal________________]             │
│                                              │
│                   [← Voltar] [Criar Contrato]│
└─────────────────────────────────────────────┘
```

#### 2.5 ContractDetailPage.tsx

Layout:
```
┌─────────────────────────────────────────────┐
│ ← Contrato #ABC123             🟢 Ativo     │
├─────────────────────────────────────────────┤
│ Pagador → Recebedor                          │
│ ┌─────────────┐     ┌─────────────┐         │
│ │ [Logo]      │ →   │ [Avatar]    │         │
│ │ TechCorp    │     │ John Doe    │         │
│ └─────────────┘     └─────────────┘         │
├─────────────────────────────────────────────┤
│ Detalhes                                     │
│ • Valor: R$ 8.000,00                         │
│ • Periodicidade: Mensal                      │
│ • Dia: 5                                     │
│ • Próximo pagamento: 05/02/2025             │
├─────────────────────────────────────────────┤
│ Wallets                                      │
│ Pagador: 5FHneW46... [📋]                    │
│ Recebedor: 5GrwvaEF... [📋]                  │
├─────────────────────────────────────────────┤
│ [Pausar] [Encerrar]                          │
└─────────────────────────────────────────────┘
```

### 3. Rotas

```tsx
// Dashboard
<Route path="pay" element={<PayDashboardPage />} />

// Contratos
<Route path="pay/contracts" element={<ContractListPage />} />
<Route path="pay/contracts/new" element={<ContractCreatePage />} />
<Route path="pay/contracts/:id" element={<ContractDetailPage />} />
```

## Critérios de Aceite

- [ ] Criar contrato com todos os campos
- [ ] Validar dia do pagamento (1-28)
- [ ] Calcular próximo pagamento corretamente
- [ ] Pausar/Retomar/Encerrar funcionam
- [ ] Histórico de mudanças registrado
- [ ] Listar contratos (como pagador e recebedor)
- [ ] Notificar recebedor ao criar

## Arquivos a Criar

```
apps/api/
  prisma/schema.prisma (modificar)
  src/routes/pay/contracts.ts
  src/routes/pay/index.ts
  src/services/pay-contract.service.ts

apps/web/src/modules/pay/
  pages/PayDashboardPage.tsx
  pages/ContractListPage.tsx
  pages/ContractDetailPage.tsx
  pages/ContractCreatePage.tsx
  components/ContractCard.tsx
  components/ContractForm.tsx
  components/ContractStatus.tsx
  components/ContractActions.tsx
  components/ReceiverSearch.tsx
  api.ts
  index.ts
```
