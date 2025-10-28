# FASE 7: Governance (Blockchain) - Especificação Técnica

**Versão**: 1.0
**Data**: 2025-01-28
**Duração Estimada**: 3 semanas
**Risco**: Alto
**Dependências**: FASE 5 (P2P ZARI Backend), FASE 6 (P2P ZARI Frontend)

---

## 1. VISÃO GERAL

### 1.1 Objetivo
Implementar um sistema completo de governança on-chain para a rede Bazari, utilizando pallets Substrate nativos para permitir que holders de ZARI participem de decisões sobre:
- Gestão do tesouro (Treasury)
- Propostas e votações democráticas (Democracy)
- Conselhos técnico e de governança (Collective)
- Transações multisig para segurança (Multisig)

### 1.2 Escopo
- **Blockchain**: Configuração de 4 pallets Substrate (treasury, multisig, democracy, collective)
- **Backend API**: 12 endpoints REST para interação com governança
- **Frontend**: Páginas e componentes para proposals, votações, treasury e council

### 1.3 Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
├─────────────────────────────────────────────────────────────────┤
│  GovernancePage    │  ProposalDetail  │  TreasuryPage          │
│  CouncilPage       │  VotingModal     │  MultisigPage          │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTP/REST
┌─────────────────────▼───────────────────────────────────────────┐
│                    BACKEND API (Node.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  /governance/*     │  /treasury/*     │  /council/*            │
│  /multisig/*       │  Proposal CRUD   │  Vote tracking         │
└─────────────────────┬───────────────────────────────────────────┘
                      │ Polkadot.js API
┌─────────────────────▼───────────────────────────────────────────┐
│                  BLOCKCHAIN (Substrate)                         │
├─────────────────────────────────────────────────────────────────┤
│  pallet-treasury   │  pallet-democracy │  pallet-collective    │
│  pallet-multisig   │  ZARI integration │  Voting mechanisms    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. BLOCKCHAIN - RUNTIME CONFIGURATION

### 2.1 Pallets a serem configurados

#### 2.1.1 pallet-treasury
**Propósito**: Gerenciar fundos coletivos da rede (tesouro) para financiar propostas aprovadas.

**Configuração**:
```rust
// runtime/src/lib.rs

parameter_types! {
    pub const ProposalBond: Permill = Permill::from_percent(5);
    pub const ProposalBondMinimum: Balance = 100 * UNITS; // 100 BZR
    pub const ProposalBondMaximum: Balance = 500 * UNITS; // 500 BZR
    pub const SpendPeriod: BlockNumber = 7 * DAYS; // 7 dias
    pub const Burn: Permill = Permill::from_percent(1); // 1% queimado por período
    pub const TreasuryPalletId: PalletId = PalletId(*b"py/trsry");
    pub const MaxApprovals: u32 = 100;
}

impl pallet_treasury::Config for Runtime {
    type PalletId = TreasuryPalletId;
    type Currency = Balances;
    type ApproveOrigin = EitherOfDiverse<
        EnsureRoot<AccountId>,
        pallet_collective::EnsureProportionAtLeast<AccountId, CouncilCollective, 3, 5>,
    >;
    type RejectOrigin = EitherOfDiverse<
        EnsureRoot<AccountId>,
        pallet_collective::EnsureProportionMoreThan<AccountId, CouncilCollective, 1, 2>,
    >;
    type RuntimeEvent = RuntimeEvent;
    type OnSlash = Treasury;
    type ProposalBond = ProposalBond;
    type ProposalBondMinimum = ProposalBondMinimum;
    type ProposalBondMaximum = ProposalBondMaximum;
    type SpendPeriod = SpendPeriod;
    type Burn = Burn;
    type BurnDestination = ();
    type SpendFunds = ();
    type MaxApprovals = MaxApprovals;
    type WeightInfo = pallet_treasury::weights::SubstrateWeight<Runtime>;
    type SpendOrigin = frame_support::traits::NeverEnsureOrigin<Balance>;
}
```

**Parâmetros-chave**:
- `ProposalBond`: 5% do valor solicitado como caução
- `ProposalBondMinimum`: 100 BZR mínimo de caução
- `ProposalBondMaximum`: 500 BZR máximo de caução
- `SpendPeriod`: 7 dias para gastar fundos aprovados
- `Burn`: 1% dos fundos não gastos são queimados
- `MaxApprovals`: Máximo 100 propostas aprovadas pendentes

#### 2.1.2 pallet-democracy
**Propósito**: Sistema de votação democrática para proposals e referendos.

**Configuração**:
```rust
parameter_types! {
    pub const LaunchPeriod: BlockNumber = 7 * DAYS; // Período para lançar referendum
    pub const VotingPeriod: BlockNumber = 7 * DAYS; // Período de votação
    pub const FastTrackVotingPeriod: BlockNumber = 1 * DAYS; // Fast-track: 1 dia
    pub const MinimumDeposit: Balance = 100 * UNITS; // 100 BZR para propor
    pub const EnactmentPeriod: BlockNumber = 2 * DAYS; // 2 dias para executar
    pub const CooloffPeriod: BlockNumber = 7 * DAYS; // Cooldown após rejeição
    pub const MaxVotes: u32 = 100;
    pub const MaxProposals: u32 = 100;
}

impl pallet_democracy::Config for Runtime {
    type RuntimeEvent = RuntimeEvent;
    type Currency = Balances;
    type EnactmentPeriod = EnactmentPeriod;
    type LaunchPeriod = LaunchPeriod;
    type VotingPeriod = VotingPeriod;
    type VoteLockingPeriod = EnactmentPeriod;
    type MinimumDeposit = MinimumDeposit;
    type ExternalOrigin = EitherOfDiverse<
        pallet_collective::EnsureProportionAtLeast<AccountId, CouncilCollective, 1, 2>,
        frame_system::EnsureRoot<AccountId>,
    >;
    type ExternalMajorityOrigin = EitherOfDiverse<
        pallet_collective::EnsureProportionAtLeast<AccountId, CouncilCollective, 3, 5>,
        frame_system::EnsureRoot<AccountId>,
    >;
    type ExternalDefaultOrigin = EitherOfDiverse<
        pallet_collective::EnsureProportionAtLeast<AccountId, CouncilCollective, 1, 1>,
        frame_system::EnsureRoot<AccountId>,
    >;
    type FastTrackOrigin = EitherOfDiverse<
        pallet_collective::EnsureProportionAtLeast<AccountId, TechnicalCollective, 2, 3>,
        frame_system::EnsureRoot<AccountId>,
    >;
    type InstantOrigin = EitherOfDiverse<
        pallet_collective::EnsureProportionAtLeast<AccountId, TechnicalCollective, 1, 1>,
        frame_system::EnsureRoot<AccountId>,
    >;
    type InstantAllowed = frame_support::traits::ConstBool<true>;
    type FastTrackVotingPeriod = FastTrackVotingPeriod;
    type CancellationOrigin = EitherOfDiverse<
        EnsureRoot<AccountId>,
        pallet_collective::EnsureProportionAtLeast<AccountId, CouncilCollective, 2, 3>,
    >;
    type CancelProposalOrigin = EitherOfDiverse<
        EnsureRoot<AccountId>,
        pallet_collective::EnsureProportionAtLeast<AccountId, TechnicalCollective, 1, 1>,
    >;
    type BlacklistOrigin = EnsureRoot<AccountId>;
    type VetoOrigin = pallet_collective::EnsureMember<AccountId, TechnicalCollective>;
    type CooloffPeriod = CooloffPeriod;
    type Slash = Treasury;
    type Scheduler = Scheduler;
    type PalletsOrigin = OriginCaller;
    type MaxVotes = MaxVotes;
    type WeightInfo = pallet_democracy::weights::SubstrateWeight<Runtime>;
    type MaxProposals = MaxProposals;
    type Preimages = Preimage;
    type MaxDeposits = ConstU32<100>;
    type MaxBlacklisted = ConstU32<100>;
    type SubmitOrigin = EnsureSigned<AccountId>;
}
```

**Parâmetros-chave**:
- `LaunchPeriod`: 7 dias para acumular segundos antes de virar referendum
- `VotingPeriod`: 7 dias de votação
- `MinimumDeposit`: 100 BZR para criar proposta
- `EnactmentPeriod`: 2 dias até execução após aprovação
- `FastTrackVotingPeriod`: 1 dia para propostas urgentes
- `MaxVotes`: 100 votos por conta
- `MaxProposals`: 100 propostas ativas

#### 2.1.3 pallet-collective (Council + Technical Committee)
**Propósito**: Conselhos para governança (Council geral, Technical Committee técnico).

**Configuração Council**:
```rust
parameter_types! {
    pub const CouncilMotionDuration: BlockNumber = 7 * DAYS;
    pub const CouncilMaxProposals: u32 = 100;
    pub const CouncilMaxMembers: u32 = 13; // 13 membros máximo
}

type CouncilCollective = pallet_collective::Instance1;
impl pallet_collective::Config<CouncilCollective> for Runtime {
    type RuntimeOrigin = RuntimeOrigin;
    type Proposal = RuntimeCall;
    type RuntimeEvent = RuntimeEvent;
    type MotionDuration = CouncilMotionDuration;
    type MaxProposals = CouncilMaxProposals;
    type MaxMembers = CouncilMaxMembers;
    type DefaultVote = pallet_collective::PrimeDefaultVote;
    type WeightInfo = pallet_collective::weights::SubstrateWeight<Runtime>;
    type SetMembersOrigin = EnsureRoot<AccountId>;
}
```

**Configuração Technical Committee**:
```rust
parameter_types! {
    pub const TechnicalMotionDuration: BlockNumber = 3 * DAYS;
    pub const TechnicalMaxProposals: u32 = 100;
    pub const TechnicalMaxMembers: u32 = 7; // 7 membros técnicos
}

type TechnicalCollective = pallet_collective::Instance2;
impl pallet_collective::Config<TechnicalCollective> for Runtime {
    type RuntimeOrigin = RuntimeOrigin;
    type Proposal = RuntimeCall;
    type RuntimeEvent = RuntimeEvent;
    type MotionDuration = TechnicalMotionDuration;
    type MaxProposals = TechnicalMaxProposals;
    type MaxMembers = TechnicalMaxMembers;
    type DefaultVote = pallet_collective::PrimeDefaultVote;
    type WeightInfo = pallet_collective::weights::SubstrateWeight<Runtime>;
    type SetMembersOrigin = EnsureRoot<AccountId>;
}
```

**Parâmetros-chave**:
- Council: 13 membros, 7 dias para motion
- Technical: 7 membros, 3 dias para motion
- Votação por maioria (configurable)

#### 2.1.4 pallet-multisig
**Propósito**: Transações multisig para segurança (ex: treasury operations).

**Configuração**:
```rust
parameter_types! {
    pub const DepositBase: Balance = 1 * UNITS; // 1 BZR base
    pub const DepositFactor: Balance = 0.1 * UNITS; // 0.1 BZR por assinante
    pub const MaxSignatories: u32 = 20; // Máximo 20 signatários
}

impl pallet_multisig::Config for Runtime {
    type RuntimeEvent = RuntimeEvent;
    type RuntimeCall = RuntimeCall;
    type Currency = Balances;
    type DepositBase = DepositBase;
    type DepositFactor = DepositFactor;
    type MaxSignatories = MaxSignatories;
    type WeightInfo = pallet_multisig::weights::SubstrateWeight<Runtime>;
}
```

**Parâmetros-chave**:
- `DepositBase`: 1 BZR depósito base
- `DepositFactor`: 0.1 BZR por assinante adicional
- `MaxSignatories`: Máximo 20 assinaturas

### 2.2 Dependências adicionais

**pallet-scheduler** (para Democracy enactment):
```rust
parameter_types! {
    pub MaximumSchedulerWeight: Weight = Perbill::from_percent(80) *
        RuntimeBlockWeights::get().max_block;
    pub const MaxScheduledPerBlock: u32 = 50;
}

impl pallet_scheduler::Config for Runtime {
    type RuntimeEvent = RuntimeEvent;
    type RuntimeOrigin = RuntimeOrigin;
    type PalletsOrigin = OriginCaller;
    type RuntimeCall = RuntimeCall;
    type MaximumWeight = MaximumSchedulerWeight;
    type ScheduleOrigin = EnsureRoot<AccountId>;
    type MaxScheduledPerBlock = MaxScheduledPerBlock;
    type WeightInfo = pallet_scheduler::weights::SubstrateWeight<Runtime>;
    type OriginPrivilegeCmp = EqualPrivilegeOnly;
    type Preimages = Preimage;
}
```

**pallet-preimage** (para Democracy proposals):
```rust
parameter_types! {
    pub const PreimageBaseDeposit: Balance = 1 * UNITS;
    pub const PreimageByteDeposit: Balance = 0.01 * UNITS;
}

impl pallet_preimage::Config for Runtime {
    type WeightInfo = pallet_preimage::weights::SubstrateWeight<Runtime>;
    type RuntimeEvent = RuntimeEvent;
    type Currency = Balances;
    type ManagerOrigin = EnsureRoot<AccountId>;
    type BaseDeposit = PreimageBaseDeposit;
    type ByteDeposit = PreimageByteDeposit;
}
```

### 2.3 Cargo.toml updates

```toml
[dependencies]
pallet-treasury = { version = "4.0.0-dev", default-features = false, git = "https://github.com/paritytech/substrate.git", branch = "polkadot-v1.0.0" }
pallet-democracy = { version = "4.0.0-dev", default-features = false, git = "https://github.com/paritytech/substrate.git", branch = "polkadot-v1.0.0" }
pallet-collective = { version = "4.0.0-dev", default-features = false, git = "https://github.com/paritytech/substrate.git", branch = "polkadot-v1.0.0" }
pallet-multisig = { version = "4.0.0-dev", default-features = false, git = "https://github.com/paritytech/substrate.git", branch = "polkadot-v1.0.0" }
pallet-scheduler = { version = "4.0.0-dev", default-features = false, git = "https://github.com/paritytech/substrate.git", branch = "polkadot-v1.0.0" }
pallet-preimage = { version = "4.0.0-dev", default-features = false, git = "https://github.com/paritytech/substrate.git", branch = "polkadot-v1.0.0" }

[features]
std = [
    # ... existing ...
    "pallet-treasury/std",
    "pallet-democracy/std",
    "pallet-collective/std",
    "pallet-multisig/std",
    "pallet-scheduler/std",
    "pallet-preimage/std",
]
```

### 2.4 construct_runtime! macro

```rust
construct_runtime!(
    pub struct Runtime {
        // ... existing pallets ...
        Treasury: pallet_treasury,
        Democracy: pallet_democracy,
        Council: pallet_collective::<Instance1>,
        TechnicalCommittee: pallet_collective::<Instance2>,
        Multisig: pallet_multisig,
        Scheduler: pallet_scheduler,
        Preimage: pallet_preimage,
    }
);
```

---

## 3. BACKEND API

### 3.1 Estrutura de arquivos

```
apps/api/src/
├── modules/
│   └── governance/
│       ├── governance.controller.ts
│       ├── governance.service.ts
│       ├── treasury.service.ts
│       ├── democracy.service.ts
│       ├── council.service.ts
│       ├── multisig.service.ts
│       └── dto/
│           ├── proposal.dto.ts
│           ├── vote.dto.ts
│           └── treasury.dto.ts
└── database/
    └── schema.prisma (adicionar modelos)
```

### 3.2 Prisma Schema Extensions

```prisma
// Governance Proposals
model GovernanceProposal {
  id                String   @id @default(cuid())
  proposalIndex     Int      @unique
  type              ProposalType // DEMOCRACY, TREASURY, COUNCIL, TECHNICAL
  title             String
  description       String   @db.Text
  proposer          String   // Address
  proposerUserId    String?
  proposerUser      User?    @relation(fields: [proposerUserId], references: [id])
  beneficiary       String?  // Para treasury proposals
  value             String?  // Valor solicitado (BigInt string)
  bond              String?  // Caução (BigInt string)
  status            ProposalStatus // PROPOSED, TABLED, STARTED, PASSED, REJECTED, EXECUTED, CANCELLED
  preimageHash      String?
  referendumIndex   Int?
  aye               String   @default("0") // Votos favor (BigInt)
  nay               String   @default("0") // Votos contra (BigInt)
  turnout           String   @default("0") // Total votado
  threshold         VoteThreshold? // SUPERMAJORITYAPPROVE, SUPERMAJORITYAGAINST, SIMPLEMAJORITY
  endsAt            DateTime?
  executedAt        DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  votes             GovernanceVote[]

  @@index([type, status])
  @@index([proposer])
  @@index([endsAt])
}

enum ProposalType {
  DEMOCRACY
  TREASURY
  COUNCIL
  TECHNICAL
}

enum ProposalStatus {
  PROPOSED
  TABLED
  STARTED
  PASSED
  REJECTED
  EXECUTED
  CANCELLED
}

enum VoteThreshold {
  SUPERMAJORITYAPPROVE
  SUPERMAJORITYAGAINST
  SIMPLEMAJORITY
}

// Votes
model GovernanceVote {
  id          String   @id @default(cuid())
  proposalId  String
  proposal    GovernanceProposal @relation(fields: [proposalId], references: [id], onDelete: Cascade)
  voter       String   // Address
  voterUserId String?
  voterUser   User?    @relation(fields: [voterUserId], references: [id])
  vote        VoteType // AYE, NAY
  balance     String   // Conviction-locked balance (BigInt string)
  conviction  Int      @default(1) // 0-6 (None, Locked1x-6x)
  createdAt   DateTime @default(now())

  @@unique([proposalId, voter])
  @@index([voter])
  @@index([proposalId])
}

enum VoteType {
  AYE
  NAY
}

// Council Members
model CouncilMember {
  id        String   @id @default(cuid())
  type      CouncilType // COUNCIL, TECHNICAL
  address   String
  userId    String?
  user      User?    @relation(fields: [userId], references: [id])
  addedAt   DateTime @default(now())
  removedAt DateTime?

  @@unique([type, address])
  @@index([type])
  @@index([address])
}

enum CouncilType {
  COUNCIL
  TECHNICAL
}

// Multisig Accounts
model MultisigAccount {
  id              String   @id @default(cuid())
  address         String   @unique
  threshold       Int
  signatories     String[] // Array of addresses
  createdBy       String
  createdByUserId String?
  createdByUser   User?    @relation(fields: [createdByUserId], references: [id])
  createdAt       DateTime @default(now())
  transactions    MultisigTransaction[]
}

// Multisig Transactions
model MultisigTransaction {
  id             String   @id @default(cuid())
  multisigId     String
  multisig       MultisigAccount @relation(fields: [multisigId], references: [id], onDelete: Cascade)
  callHash       String
  callData       String   @db.Text
  when           String   // Timepoint: {height: number, index: number}
  approvals      String[] // Addresses that approved
  status         MultisigStatus // PENDING, EXECUTED, CANCELLED
  executedAt     DateTime?
  createdAt      DateTime @default(now())

  @@index([multisigId, status])
  @@index([callHash])
}

enum MultisigStatus {
  PENDING
  EXECUTED
  CANCELLED
}

// User relations update
model User {
  // ... existing fields ...
  governanceProposals GovernanceProposal[]
  governanceVotes     GovernanceVote[]
  councilMemberships  CouncilMember[]
  multisigAccounts    MultisigAccount[]
}
```

### 3.3 API Endpoints

#### 3.3.1 Democracy Proposals

**POST /governance/proposals/democracy**
```typescript
// Criar proposta democracy
interface CreateDemocracyProposalDto {
  title: string;
  description: string;
  preimageHash: string; // Hash da call preimage
  value: string; // Depósito mínimo
}

Response: {
  success: boolean;
  proposalIndex: number;
  txHash: string;
}
```

**GET /governance/proposals**
```typescript
// Listar proposals
Query params: {
  type?: 'DEMOCRACY' | 'TREASURY' | 'COUNCIL' | 'TECHNICAL';
  status?: 'PROPOSED' | 'TABLED' | 'STARTED' | 'PASSED' | 'REJECTED' | 'EXECUTED';
  limit?: number;
  cursor?: string;
}

Response: {
  items: GovernanceProposal[];
  nextCursor: string | null;
}
```

**GET /governance/proposals/:id**
```typescript
// Detalhes de uma proposal
Response: GovernanceProposal
```

**POST /governance/proposals/:id/second**
```typescript
// Segundar uma proposta democracy
Body: {}

Response: {
  success: boolean;
  txHash: string;
}
```

**POST /governance/proposals/:id/vote**
```typescript
// Votar em referendum
interface VoteDto {
  vote: 'AYE' | 'NAY';
  conviction: 0 | 1 | 2 | 3 | 4 | 5 | 6; // None, Locked1x-6x
}

Response: {
  success: boolean;
  txHash: string;
}
```

#### 3.3.2 Treasury

**POST /governance/treasury/proposals**
```typescript
// Criar proposta de treasury
interface CreateTreasuryProposalDto {
  title: string;
  description: string;
  beneficiary: string; // Address
  value: string; // BigInt string (quantidade solicitada)
}

Response: {
  success: boolean;
  proposalIndex: number;
  bond: string; // Caução depositada
  txHash: string;
}
```

**GET /governance/treasury/balance**
```typescript
// Saldo do treasury
Response: {
  free: string; // BZR disponível
  proposals: string; // BZR em propostas
  total: string;
}
```

**POST /governance/treasury/proposals/:id/approve**
```typescript
// Aprovar proposta (requer Council)
Body: {}

Response: {
  success: boolean;
  txHash: string;
}
```

**POST /governance/treasury/proposals/:id/reject**
```typescript
// Rejeitar proposta (requer Council)
Body: {}

Response: {
  success: boolean;
  txHash: string;
}
```

#### 3.3.3 Council

**GET /governance/council/members**
```typescript
// Listar membros do council
Query: { type: 'COUNCIL' | 'TECHNICAL' }

Response: {
  members: CouncilMember[];
  prime: string | null; // Address do prime member
}
```

**POST /governance/council/motions**
```typescript
// Criar motion no council
interface CreateMotionDto {
  type: 'COUNCIL' | 'TECHNICAL';
  call: string; // Encoded call
  title: string;
  description: string;
  threshold: number; // Número de votos necessários
}

Response: {
  success: boolean;
  motionHash: string;
  motionIndex: number;
  txHash: string;
}
```

**POST /governance/council/motions/:hash/vote**
```typescript
// Votar em motion
interface CouncilVoteDto {
  approve: boolean;
}

Response: {
  success: boolean;
  txHash: string;
}
```

#### 3.3.4 Multisig

**POST /governance/multisig/create**
```typescript
// Criar conta multisig
interface CreateMultisigDto {
  signatories: string[]; // Addresses (sorted)
  threshold: number; // Ex: 2 de 3
}

Response: {
  address: string; // Endereço multisig derivado
  signatories: string[];
  threshold: number;
}
```

**POST /governance/multisig/:address/transactions**
```typescript
// Iniciar transação multisig
interface MultisigTransactionDto {
  call: string; // Encoded call
  maxWeight: string; // Weight limit
}

Response: {
  success: boolean;
  callHash: string;
  timepoint: { height: number; index: number };
  txHash: string;
}
```

**POST /governance/multisig/:address/approve**
```typescript
// Aprovar transação multisig
interface ApproveMultisigDto {
  callHash: string;
  timepoint: { height: number; index: number };
}

Response: {
  success: boolean;
  approvals: string[]; // Addresses que aprovaram
  executed: boolean; // Se atingiu threshold e executou
  txHash: string;
}
```

**GET /governance/multisig/:address/pending**
```typescript
// Listar transações pendentes
Response: {
  transactions: MultisigTransaction[];
}
```

### 3.4 Blockchain Event Listeners

**governance.service.ts** deve escutar eventos:

```typescript
// Democracy events
api.query.system.events((events) => {
  events.forEach((record) => {
    const { event } = record;

    if (event.section === 'democracy') {
      switch (event.method) {
        case 'Proposed':
          // Salvar nova proposta
          break;
        case 'Tabled':
          // Atualizar status para TABLED
          break;
        case 'Started':
          // Referendum iniciado
          break;
        case 'Passed':
        case 'NotPassed':
          // Atualizar resultado
          break;
        case 'Executed':
          // Marcar como executado
          break;
        case 'Voted':
          // Registrar voto
          break;
      }
    }

    if (event.section === 'treasury') {
      switch (event.method) {
        case 'Proposed':
          // Nova treasury proposal
          break;
        case 'Awarded':
          // Fundos liberados
          break;
        case 'Rejected':
          // Proposta rejeitada
          break;
      }
    }

    if (event.section === 'council' || event.section === 'technicalCommittee') {
      switch (event.method) {
        case 'Proposed':
          // Nova motion
          break;
        case 'Voted':
          // Voto em motion
          break;
        case 'Approved':
        case 'Disapproved':
        case 'Executed':
          // Resultado motion
          break;
        case 'MemberExecuted':
          // Membro executou
          break;
      }
    }
  });
});
```

---

## 4. FRONTEND

### 4.1 Estrutura de arquivos

```
apps/web/src/modules/governance/
├── pages/
│   ├── GovernancePage.tsx          (Dashboard geral)
│   ├── ProposalsListPage.tsx       (Lista de proposals)
│   ├── ProposalDetailPage.tsx      (Detalhes + votação)
│   ├── TreasuryPage.tsx            (Treasury dashboard)
│   ├── CouncilPage.tsx             (Council + Technical)
│   ├── MultisigPage.tsx            (Multisig accounts)
│   └── CreateProposalPage.tsx      (Criar proposta)
├── components/
│   ├── ProposalCard.tsx
│   ├── VoteModal.tsx
│   ├── ConvictionSelector.tsx
│   ├── CouncilMemberCard.tsx
│   ├── MultisigApprovalFlow.tsx
│   └── TreasuryStats.tsx
├── api.ts                          (API client)
└── types.ts                        (TypeScript types)
```

### 4.2 Rotas

```typescript
// App.tsx
<Route path="/app/governance" element={<GovernancePage />} />
<Route path="/app/governance/proposals" element={<ProposalsListPage />} />
<Route path="/app/governance/proposals/:id" element={<ProposalDetailPage />} />
<Route path="/app/governance/treasury" element={<TreasuryPage />} />
<Route path="/app/governance/council" element={<CouncilPage />} />
<Route path="/app/governance/multisig" element={<MultisigPage />} />
<Route path="/app/governance/proposals/new" element={<CreateProposalPage />} />
```

### 4.3 Páginas principais

#### GovernancePage.tsx
```typescript
// Dashboard com cards:
// - Proposals ativas (count)
// - Treasury balance
// - Council members
// - Referendos abertos
// - Botão "Create Proposal"
```

#### ProposalsListPage.tsx
```typescript
// Tabs: Democracy, Treasury, Council, Technical
// Filtros: Status (Proposed, Tabled, Started, Passed, Rejected)
// Cards com:
//   - Título e descrição
//   - Proposer
//   - Valor (se treasury)
//   - Status badge
//   - AYE/NAY count (se referendum)
//   - Link para detalhes
```

#### ProposalDetailPage.tsx
```typescript
// Detalhes completos:
// - Título, descrição, proposer
// - Status atual
// - Timeline (Proposed -> Tabled -> Started -> Ended)
// - Valor solicitado (treasury)
// - Votação atual: AYE%, NAY%, Turnout%
// - Barra de progresso visual
// - Botão "Vote" (se referendum ativo)
// - Lista de votos recentes
// - Threshold info
```

#### TreasuryPage.tsx
```typescript
// Stats:
// - Total balance
// - Proposals pending
// - Approved (awaiting spend period)
// - Total distributed
//
// Tabs:
// - Active proposals (lista)
// - Approved proposals (lista)
// - Historical (lista)
//
// Botão "Create Treasury Proposal"
```

#### CouncilPage.tsx
```typescript
// Tabs: Council, Technical Committee
//
// Council Members section:
// - Grid de membros (avatar, nome, address)
// - Prime member badge
//
// Active Motions section:
// - Lista de motions abertas
// - Votos coletados vs threshold
// - Botão "Vote" (se membro)
//
// Botão "Create Motion" (se membro)
```

#### MultisigPage.tsx
```typescript
// Suas contas multisig:
// - Lista de multisigs onde user é signatário
// - Threshold, signatories, pending txs
//
// Pending Transactions:
// - Lista de transações aguardando aprovação
// - Botão "Approve" (se signatário e ainda não aprovou)
//
// Botão "Create Multisig Account"
```

### 4.4 Componentes reutilizáveis

#### VoteModal.tsx
```typescript
interface VoteModalProps {
  proposalId: string;
  referendumIndex: number;
  onClose: () => void;
}

// Modal com:
// - Escolha: AYE / NAY
// - ConvictionSelector (0-6)
// - Input: quantidade ZARI a votar
// - Info sobre lock period por conviction
// - Botão "Confirm Vote" (via PIN)
```

#### ConvictionSelector.tsx
```typescript
// Selector de conviction:
// - None (0.1x, no lock)
// - Locked1x (1x, 7 days)
// - Locked2x (2x, 14 days)
// - Locked3x (3x, 28 days)
// - Locked4x (4x, 56 days)
// - Locked5x (5x, 112 days)
// - Locked6x (6x, 224 days)
//
// Visual: slider ou buttons com tooltip explicativo
```

#### ProposalCard.tsx
```typescript
interface ProposalCardProps {
  proposal: GovernanceProposal;
}

// Card com:
// - Badge de tipo (Democracy, Treasury, Council, Technical)
// - Badge de status (Proposed, Started, Passed, etc)
// - Título
// - Descrição truncada
// - Proposer (avatar + nome)
// - Valor (se treasury)
// - Progress bar (AYE/NAY se referendum)
// - Ends in X days (se ativo)
// - Link "View Details"
```

#### MultisigApprovalFlow.tsx
```typescript
interface MultisigApprovalFlowProps {
  multisigAddress: string;
  transaction: MultisigTransaction;
}

// Component visual:
// - Lista de signatários
// - Checkmarks verdes para quem já aprovou
// - Threshold visual (ex: 2/3)
// - Botão "Approve" (se user é signatário pendente)
// - Call data decoded (se possível)
```

### 4.5 API Client (governance/api.ts)

```typescript
export const governanceApi = {
  // Democracy
  listProposals: (params?: { type?: string; status?: string; limit?: number; cursor?: string }) =>
    getJSON<{ items: GovernanceProposal[]; nextCursor: string | null }>('/governance/proposals', params),

  getProposal: (id: string) =>
    getJSON<GovernanceProposal>(`/governance/proposals/${id}`),

  createDemocracyProposal: (payload: { title: string; description: string; preimageHash: string; value: string }) =>
    postJSON('/governance/proposals/democracy', payload),

  secondProposal: (id: string) =>
    postJSON(`/governance/proposals/${id}/second`, {}),

  vote: (id: string, payload: { vote: 'AYE' | 'NAY'; conviction: number }) =>
    postJSON(`/governance/proposals/${id}/vote`, payload),

  // Treasury
  getTreasuryBalance: () =>
    getJSON<{ free: string; proposals: string; total: string }>('/governance/treasury/balance'),

  createTreasuryProposal: (payload: { title: string; description: string; beneficiary: string; value: string }) =>
    postJSON('/governance/treasury/proposals', payload),

  approveTreasuryProposal: (id: string) =>
    postJSON(`/governance/treasury/proposals/${id}/approve`, {}),

  rejectTreasuryProposal: (id: string) =>
    postJSON(`/governance/treasury/proposals/${id}/reject`, {}),

  // Council
  getCouncilMembers: (type: 'COUNCIL' | 'TECHNICAL') =>
    getJSON<{ members: CouncilMember[]; prime: string | null }>('/governance/council/members', { type }),

  createCouncilMotion: (payload: { type: string; call: string; title: string; description: string; threshold: number }) =>
    postJSON('/governance/council/motions', payload),

  voteCouncilMotion: (hash: string, approve: boolean) =>
    postJSON(`/governance/council/motions/${hash}/vote`, { approve }),

  // Multisig
  createMultisig: (payload: { signatories: string[]; threshold: number }) =>
    postJSON('/governance/multisig/create', payload),

  createMultisigTransaction: (address: string, payload: { call: string; maxWeight: string }) =>
    postJSON(`/governance/multisig/${address}/transactions`, payload),

  approveMultisigTransaction: (address: string, payload: { callHash: string; timepoint: any }) =>
    postJSON(`/governance/multisig/${address}/approve`, payload),

  getMultisigPending: (address: string) =>
    getJSON<{ transactions: MultisigTransaction[] }>(`/governance/multisig/${address}/pending`),
};
```

---

## 5. FLUXOS DE USUÁRIO

### 5.1 Criar e votar em Democracy Proposal

```
1. User acessa /app/governance/proposals/new
2. Preenche formulário:
   - Tipo: Democracy
   - Título
   - Descrição
   - Preimage (call encoded) - opcional usar builder
   - Depósito: 100 ZARI (mínimo)
3. Clica "Create Proposal"
4. PIN modal para assinar extrinsic: democracy.propose()
5. Backend registra proposta no DB
6. Proposta aparece em "Proposed" status
7. Outros users podem "Second" a proposta
8. Quando suficientes segundos, proposta vira Referendum (Tabled -> Started)
9. Referendum fica aberto por 7 dias
10. Users votam: AYE/NAY + conviction
11. Após período, referendum é resolvido (Passed/NotPassed)
12. Se passou, entra em enactment (2 dias)
13. Scheduler executa call automaticamente
14. Status muda para Executed
```

### 5.2 Criar Treasury Proposal

```
1. User acessa /app/governance/proposals/new
2. Preenche formulário:
   - Tipo: Treasury
   - Título
   - Descrição
   - Beneficiário (address)
   - Valor solicitado (BZR)
3. Clica "Create Proposal"
4. Sistema calcula bond: 5% do valor (mín 100, máx 500 BZR)
5. PIN modal para assinar: treasury.proposeSpend()
6. Proposta criada, aguarda votação do Council
7. Council members votam Approve/Reject
8. Se aprovado (3/5 do council): fundos entram em fila
9. Após spend period (7 dias), fundos são transferidos automaticamente
10. Proposer recebe bond de volta
```

### 5.3 Multisig Operation

```
1. User acessa /app/governance/multisig
2. Clica "Create Multisig Account"
3. Preenche:
   - Signatários (addresses)
   - Threshold (ex: 2 de 3)
4. Sistema deriva address multisig determinístico
5. Account criada, precisa receber fundos
6. Para fazer transação:
   a. User acessa multisig
   b. Clica "New Transaction"
   c. Seleciona call (ex: transfer 100 BZR para X)
   d. Assina: multisig.asMulti()
   e. Transaction fica pending
7. Outros signatários veem pending transaction
8. Cada um aprova: multisig.asMulti() (approve)
9. Quando threshold atingido, transaction executa automaticamente
10. Status muda para Executed
```

---

## 6. SEGURANÇA E VALIDAÇÕES

### 6.1 Backend validations

```typescript
// governance.service.ts

async createDemocracyProposal(userId: string, dto: CreateDemocracyProposalDto) {
  // 1. Verificar user tem ZARI suficiente para depósito
  const balance = await this.getZARIBalance(userId);
  const minDeposit = toBigInt('100'); // 100 ZARI
  if (balance < minDeposit) {
    throw new BadRequestException('Insufficient ZARI balance for proposal deposit');
  }

  // 2. Validar preimage exists on-chain
  const preimageExists = await this.checkPreimage(dto.preimageHash);
  if (!preimageExists) {
    throw new BadRequestException('Preimage not found on-chain. Upload preimage first.');
  }

  // 3. Rate limit: 1 proposta por user a cada 24h
  const recentProposal = await this.prisma.governanceProposal.findFirst({
    where: {
      proposerUserId: userId,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (recentProposal) {
    throw new BadRequestException('You can only create 1 proposal per 24 hours');
  }

  // 4. Validar título e descrição
  if (dto.title.length < 10 || dto.title.length > 200) {
    throw new BadRequestException('Title must be 10-200 characters');
  }
  if (dto.description.length < 50) {
    throw new BadRequestException('Description must be at least 50 characters');
  }

  // 5. Submeter extrinsic via backend wallet
  const tx = await this.submitDemocracyProposal(dto);

  // 6. Salvar no DB
  return this.prisma.governanceProposal.create({
    data: {
      type: 'DEMOCRACY',
      proposalIndex: tx.proposalIndex,
      title: dto.title,
      description: dto.description,
      proposer: tx.proposerAddress,
      proposerUserId: userId,
      preimageHash: dto.preimageHash,
      bond: dto.value,
      status: 'PROPOSED',
    },
  });
}
```

### 6.2 Frontend validations

```typescript
// CreateProposalPage.tsx

const validateForm = () => {
  const errors: string[] = [];

  if (!title || title.length < 10) {
    errors.push('Title must be at least 10 characters');
  }

  if (!description || description.length < 50) {
    errors.push('Description must be at least 50 characters');
  }

  if (type === 'TREASURY') {
    if (!beneficiary || !isValidSubstrateAddress(beneficiary)) {
      errors.push('Invalid beneficiary address');
    }

    const valueNum = Number(value);
    if (isNaN(valueNum) || valueNum <= 0) {
      errors.push('Value must be greater than 0');
    }

    // Verificar treasury tem fundos suficientes
    if (valueNum > treasuryBalance) {
      errors.push('Treasury does not have enough funds');
    }
  }

  if (type === 'DEMOCRACY') {
    if (!preimageHash || preimageHash.length !== 66) {
      errors.push('Invalid preimage hash');
    }
  }

  return errors;
};
```

### 6.3 Permissões

```typescript
// Council-only actions
const ensureCouncilMember = async (userId: string, type: 'COUNCIL' | 'TECHNICAL') => {
  const member = await prisma.councilMember.findFirst({
    where: {
      userId,
      type,
      removedAt: null,
    },
  });

  if (!member) {
    throw new ForbiddenException('You are not a council member');
  }

  return member;
};

// Multisig signatories only
const ensureMultisigSignatory = async (userId: string, multisigAddress: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const multisig = await prisma.multisigAccount.findUnique({
    where: { address: multisigAddress },
  });

  if (!multisig || !multisig.signatories.includes(user.address)) {
    throw new ForbiddenException('You are not a signatory of this multisig');
  }

  return multisig;
};
```

---

## 7. TESTES

### 7.1 Blockchain tests

```bash
# Testar runtime compilation
cd bazari-chain
cargo test --release --features runtime-benchmarks

# Testar pallets individualmente
cargo test -p pallet-treasury
cargo test -p pallet-democracy
cargo test -p pallet-collective
cargo test -p pallet-multisig
```

### 7.2 Backend integration tests

```typescript
// governance.e2e.spec.ts

describe('Governance E2E', () => {
  it('should create democracy proposal', async () => {
    const res = await request(app.getHttpServer())
      .post('/governance/proposals/democracy')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Proposal',
        description: 'A test democracy proposal with at least 50 characters here.',
        preimageHash: '0x1234...',
        value: '100000000000000', // 100 ZARI
      });

    expect(res.status).toBe(201);
    expect(res.body.proposalIndex).toBeDefined();
  });

  it('should vote on referendum', async () => {
    // ... test vote
  });

  it('should create treasury proposal', async () => {
    // ... test treasury
  });

  it('should approve multisig transaction', async () => {
    // ... test multisig
  });
});
```

### 7.3 Frontend component tests

```typescript
// ProposalCard.test.tsx

describe('ProposalCard', () => {
  it('renders proposal details correctly', () => {
    const proposal = {
      id: '1',
      type: 'DEMOCRACY',
      title: 'Test Proposal',
      status: 'STARTED',
      aye: '1000000000000000',
      nay: '500000000000000',
    };

    render(<ProposalCard proposal={proposal} />);

    expect(screen.getByText('Test Proposal')).toBeInTheDocument();
    expect(screen.getByText('66.67%')).toBeInTheDocument(); // AYE percentage
  });
});
```

---

## 8. DEPLOYMENT

### 8.1 Blockchain deployment

```bash
# 1. Build runtime com novos pallets
cd bazari-chain
cargo build --release

# 2. Gerar chain spec com genesis config
./target/release/solochain-template-node build-spec --chain local > chain-spec-governance.json

# 3. Editar genesis: adicionar initial council members
# chain-spec-governance.json:
{
  "council": {
    "members": [
      "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", // Alice
      "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty", // Bob
      "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y"  // Charlie
    ]
  },
  "technicalCommittee": {
    "members": [
      "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", // Alice
      "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"  // Bob
    ]
  }
}

# 4. Converter para raw spec
./target/release/solochain-template-node build-spec --chain chain-spec-governance.json --raw > chain-spec-governance-raw.json

# 5. Start node
./target/release/solochain-template-node --chain chain-spec-governance-raw.json --base-path /tmp/governance-node
```

### 8.2 Runtime upgrade (para rede existente)

```bash
# Se rede já existe, fazer runtime upgrade:
# 1. Build novo runtime
cargo build --release -p solochain-template-runtime

# 2. Gerar WASM
./target/release/wbuild-runner

# 3. Runtime upgrade via sudo ou governance
# - Upload runtime WASM via system.setCode()
# - Ou criar democracy proposal para upgrade
```

### 8.3 Backend migration

```bash
cd apps/api

# 1. Gerar migration
pnpm prisma migrate dev --name add_governance_models

# 2. Deploy
pnpm prisma migrate deploy

# 3. Restart API
pm2 restart bazari-api
```

---

## 9. DOCUMENTAÇÃO

### 9.1 User guide

Criar guia em `/docs/governance-guide.md`:
- Como criar proposta democracy
- Como votar em referendum (+ conviction)
- Como solicitar fundos do treasury
- Como criar conta multisig
- Council: funções e responsabilidades

### 9.2 Developer guide

Criar guia em `/docs/governance-dev.md`:
- Arquitetura dos pallets
- Como fazer call encoding para preimages
- Event listeners setup
- Testing governance flows
- Troubleshooting comum

---

## 10. RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Runtime panic por misconfiguration | Média | Crítico | Testes extensivos em testnet primeiro |
| Governance deadlock (council inativo) | Baixa | Alto | Mecanismo de fallback via root |
| Spam de proposals | Média | Médio | Rate limits + depósitos altos |
| Multisig key loss | Baixa | Crítico | Documentação + backup procedures |
| Democracy capture por whale | Média | Alto | Conviction voting + turnout minimums |
| Treasury drain attack | Baixa | Crítico | Council approval required |

**Mitigações gerais**:
1. Deploy em testnet por 2 semanas antes de mainnet
2. Council inicial composto por core team
3. Documentação clara sobre custos e riscos
4. Monitoring de eventos críticos (treasury proposals, etc)
5. Emergency pause capability via sudo (fase inicial)

---

## 11. CRONOGRAMA (3 SEMANAS)

### Semana 1: Blockchain
- [ ] Dia 1-2: Adicionar pallets ao Cargo.toml + runtime/lib.rs
- [ ] Dia 3-4: Configurar parameters e implement Config traits
- [ ] Dia 5: Testes unitários dos pallets
- [ ] Dia 6-7: Build + deploy testnet + testes manuais

### Semana 2: Backend
- [ ] Dia 8-9: Prisma schema + migrations
- [ ] Dia 10-11: Services (democracy, treasury, council, multisig)
- [ ] Dia 12-13: Controllers + endpoints
- [ ] Dia 14: Event listeners + sync blockchain state

### Semana 3: Frontend
- [ ] Dia 15-16: Páginas (Governance, Proposals, Treasury, Council)
- [ ] Dia 17-18: Componentes (VoteModal, ConvictionSelector, etc)
- [ ] Dia 19: API client + integração
- [ ] Dia 20-21: Testes E2E + polimento

---

## 12. MÉTRICAS DE SUCESSO

- [ ] Runtime compila sem erros
- [ ] Todos os pallets testados (unit tests passing)
- [ ] Testnet rodando com pallets ativos
- [ ] 12 endpoints backend funcionando
- [ ] Frontend com 6 páginas principais
- [ ] E2E tests passando (democracy, treasury, multisig)
- [ ] Documentação completa (user + dev guides)
- [ ] 0 bugs críticos conhecidos

---

**FIM DA ESPECIFICAÇÃO TÉCNICA FASE 7**
