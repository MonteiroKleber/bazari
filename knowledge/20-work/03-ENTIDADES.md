# Bazari Work - Modelo de Entidades

## Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        OFF-CHAIN (PostgreSQL)                    │
├─────────────────────────────────────────────────────────────────┤
│  Profile (existente)  ←──  ProfessionalProfile (extensão)       │
│         ↓                                                        │
│  JobPosting (vagas)   ←──  JobApplication (candidaturas)        │
│         ↓                                                        │
│  WorkProposal (propostas)                                        │
│         ↓                                                        │
│  WorkAgreement (acordos - metadados)                            │
│         ↓                                                        │
│  WorkEvaluation (avaliações)                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      ON-CHAIN (Substrate)                        │
├─────────────────────────────────────────────────────────────────┤
│  WorkAgreementRegistry                                           │
│  - agreementId                                                   │
│  - companyWallet                                                 │
│  - userWallet                                                    │
│  - paymentType                                                   │
│  - status                                                        │
│  - createdAt                                                     │
│  - closedAt                                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Entidades Off-Chain

### 1. ProfessionalProfile (Extensão do Perfil)

```prisma
model ProfessionalProfile {
  id                String   @id @default(uuid())
  userId            String   @unique
  user              User     @relation(fields: [userId], references: [id])

  // Dados profissionais
  professionalArea  String?              // Área de atuação
  skills            String[]             // Habilidades (tags)
  experience        String?              // Texto livre
  hourlyRate        Decimal?             // Valor/hora sugerido
  hourlyRateCurrency String @default("BRL")
  workPreference    WorkPreference @default(REMOTE)

  // Visibilidade
  status            ProfessionalStatus @default(AVAILABLE)
  showHourlyRate    Boolean @default(false)

  // Metadados
  activatedAt       DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relações
  receivedProposals WorkProposal[] @relation("ProposalReceiver")
  agreements        WorkAgreement[] @relation("AgreementWorker")
  evaluationsGiven  WorkEvaluation[] @relation("EvaluationAuthor")
  evaluationsReceived WorkEvaluation[] @relation("EvaluationTarget")
}

enum ProfessionalStatus {
  AVAILABLE        // disponível
  NOT_AVAILABLE    // não disponível, mas visível
  INVISIBLE        // invisível
}

enum WorkPreference {
  REMOTE
  ON_SITE
  HYBRID
}
```

### 2. JobPosting (Vagas)

```prisma
model JobPosting {
  id              String   @id @default(uuid())
  companyId       String
  company         Company  @relation(fields: [companyId], references: [id])

  // Detalhes da vaga
  title           String
  description     String
  area            String
  skills          String[]
  workType        WorkPreference
  location        String?

  // Valores (informativos)
  paymentValue    Decimal?
  paymentPeriod   PaymentPeriod?
  paymentCurrency String @default("BRL")

  // Status
  status          JobPostingStatus @default(OPEN)

  // Metadados
  publishedAt     DateTime?
  closedAt        DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relações
  applications    JobApplication[]
  proposals       WorkProposal[]
}

enum JobPostingStatus {
  DRAFT
  OPEN
  PAUSED
  CLOSED
}

enum PaymentPeriod {
  HOURLY
  DAILY
  WEEKLY
  MONTHLY
  PROJECT
}
```

### 3. JobApplication (Candidaturas)

```prisma
model JobApplication {
  id              String   @id @default(uuid())
  jobPostingId    String
  jobPosting      JobPosting @relation(fields: [jobPostingId], references: [id])
  applicantId     String
  applicant       User     @relation(fields: [applicantId], references: [id])

  // Conteúdo
  coverLetter     String?
  expectedValue   Decimal?

  // Status
  status          ApplicationStatus @default(PENDING)

  // Metadados
  appliedAt       DateTime @default(now())
  reviewedAt      DateTime?

  @@unique([jobPostingId, applicantId])
}

enum ApplicationStatus {
  PENDING
  REVIEWED
  SHORTLISTED
  REJECTED
  HIRED
}
```

### 4. WorkProposal (Propostas)

```prisma
model WorkProposal {
  id              String   @id @default(uuid())

  // Partes
  companyId       String
  company         Company  @relation(fields: [companyId], references: [id])
  receiverId      String
  receiver        ProfessionalProfile @relation("ProposalReceiver", fields: [receiverId], references: [id])

  // Vínculo opcional com vaga
  jobPostingId    String?
  jobPosting      JobPosting? @relation(fields: [jobPostingId], references: [id])

  // Detalhes da proposta
  title           String
  description     String
  proposedValue   Decimal
  valuePeriod     PaymentPeriod
  valueCurrency   String @default("BRL")
  startDate       DateTime?
  duration        String?              // "indefinido", "3 meses", etc.
  paymentType     PaymentType @default(UNDEFINED)

  // Status
  status          ProposalStatus @default(PENDING)

  // Metadados
  expiresAt       DateTime
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  respondedAt     DateTime?

  // Relações
  agreement       WorkAgreement?
  messages        ProposalMessage[]
}

enum ProposalStatus {
  PENDING
  NEGOTIATING
  ACCEPTED
  REJECTED
  EXPIRED
  CANCELLED
}

enum PaymentType {
  EXTERNAL       // pago fora da Bazari
  BAZARI_PAY     // via Bazari Pay
  UNDEFINED      // a definir
}
```

### 5. WorkAgreement (Acordos)

```prisma
model WorkAgreement {
  id              String   @id @default(uuid())

  // Partes
  companyId       String
  company         Company  @relation(fields: [companyId], references: [id])
  workerId        String
  worker          ProfessionalProfile @relation("AgreementWorker", fields: [workerId], references: [id])

  // Origem
  proposalId      String?  @unique
  proposal        WorkProposal? @relation(fields: [proposalId], references: [id])

  // Termos (off-chain)
  title           String
  description     String?
  terms           String?
  agreedValue     Decimal
  valuePeriod     PaymentPeriod
  valueCurrency   String @default("BRL")

  // Datas
  startDate       DateTime
  endDate         DateTime?

  // Status e tipo
  status          AgreementStatus @default(ACTIVE)
  paymentType     PaymentType

  // On-chain reference
  onChainId       String?  @unique    // ID no blockchain
  onChainTxHash   String?             // Hash da transação de criação

  // Integração Bazari Pay
  payContractId   String?             // ID do contrato no Bazari Pay

  // Metadados
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  pausedAt        DateTime?
  closedAt        DateTime?
  closedReason    String?

  // Relações
  evaluations     WorkEvaluation[]
  statusHistory   AgreementStatusHistory[]
}

enum AgreementStatus {
  PROPOSED       // aguardando aceite (raro, geralmente já aceito)
  ACTIVE         // em vigor
  PAUSED         // temporariamente suspenso
  CLOSED         // finalizado
  CANCELLED      // cancelado antes de iniciar
}
```

### 6. WorkEvaluation (Avaliações)

```prisma
model WorkEvaluation {
  id              String   @id @default(uuid())
  agreementId     String
  agreement       WorkAgreement @relation(fields: [agreementId], references: [id])

  // Quem avalia quem
  authorId        String
  author          ProfessionalProfile @relation("EvaluationAuthor", fields: [authorId], references: [id])
  targetId        String
  target          ProfessionalProfile @relation("EvaluationTarget", fields: [targetId], references: [id])

  // Notas
  overallRating   Int                  // 1-5
  communicationRating Int?             // 1-5
  punctualityRating Int?               // 1-5
  qualityRating   Int?                 // 1-5

  // Comentário
  comment         String?
  commentStatus   CommentStatus @default(PENDING)

  // Visibilidade
  isPublic        Boolean @default(false)  // só fica público quando ambos avaliam

  // Metadados
  createdAt       DateTime @default(now())

  @@unique([agreementId, authorId])
}

enum CommentStatus {
  PENDING
  APPROVED
  REJECTED
}
```

## Entidade On-Chain

### WorkAgreementRegistry (Substrate Pallet)

```rust
/// Registro on-chain de acordos de trabalho
#[pallet::storage]
pub type Agreements<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    AgreementId,
    WorkAgreementOnChain<T::AccountId>,
>;

#[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo)]
pub struct WorkAgreementOnChain<AccountId> {
    /// ID único do acordo (hash do UUID off-chain)
    pub id: [u8; 32],
    /// Wallet da empresa
    pub company: AccountId,
    /// Wallet do trabalhador
    pub worker: AccountId,
    /// Tipo de pagamento
    pub payment_type: PaymentType,
    /// Status atual
    pub status: AgreementStatus,
    /// Block de criação
    pub created_at: BlockNumber,
    /// Block de encerramento (se houver)
    pub closed_at: Option<BlockNumber>,
}

#[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo)]
pub enum PaymentType {
    External,
    BazariPay,
    Undefined,
}

#[derive(Encode, Decode, Clone, PartialEq, Eq, RuntimeDebug, TypeInfo)]
pub enum AgreementStatus {
    Active,
    Paused,
    Closed,
}
```

## Índices e Performance

### Índices Recomendados

```sql
-- Busca de profissionais
CREATE INDEX idx_professional_status ON professional_profiles(status) WHERE status != 'INVISIBLE';
CREATE INDEX idx_professional_skills ON professional_profiles USING GIN(skills);
CREATE INDEX idx_professional_area ON professional_profiles(professional_area);

-- Vagas
CREATE INDEX idx_job_posting_status ON job_postings(status) WHERE status = 'OPEN';
CREATE INDEX idx_job_posting_company ON job_postings(company_id);
CREATE INDEX idx_job_posting_skills ON job_postings USING GIN(skills);

-- Propostas
CREATE INDEX idx_proposal_receiver ON work_proposals(receiver_id);
CREATE INDEX idx_proposal_company ON work_proposals(company_id);
CREATE INDEX idx_proposal_status ON work_proposals(status);

-- Acordos
CREATE INDEX idx_agreement_company ON work_agreements(company_id);
CREATE INDEX idx_agreement_worker ON work_agreements(worker_id);
CREATE INDEX idx_agreement_status ON work_agreements(status);
CREATE INDEX idx_agreement_onchain ON work_agreements(on_chain_id) WHERE on_chain_id IS NOT NULL;
```

## Diagrama de Estados

### Proposta
```
PENDING → NEGOTIATING → ACCEPTED → (cria Agreement)
    ↓          ↓
EXPIRED    REJECTED
    ↓
CANCELLED
```

### Acordo
```
ACTIVE ←→ PAUSED
   ↓
 CLOSED
```
