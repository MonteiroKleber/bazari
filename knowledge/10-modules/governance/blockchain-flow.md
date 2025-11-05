# Bazari Governance - Blockchain Implementation Flow

## 📋 Overview

Este documento detalha a implementação de governança no **bazari-chain** (Substrate runtime), incluindo todos os fluxos desde a criação até aprovação/execução de propostas.

**Pallets Implementados**:
- ✅ `pallet-treasury` - Gestão do tesouro comunitário
- ✅ `pallet-democracy` - Votação on-chain e referendums
- ✅ `pallet-collective` (Council) - Conselho de governança
- ✅ `pallet-collective` (TechnicalCommittee) - Comitê técnico
- ✅ `pallet-multisig` - Contas multi-assinatura
- ✅ `pallet-scheduler` - Agendamento de chamadas
- ✅ `pallet-preimage` - Armazenamento de proposta

---

## 🔧 Configuração do Runtime

### Localização
**Arquivo**: `/root/bazari-chain/runtime/src/configs/mod.rs`

### Parâmetros Chave

```rust
// TREASURY (Linhas 377-407)
pub const TreasuryPalletId: PalletId = PalletId(*b"py/trsry");
pub const SpendPeriod: BlockNumber = SPEND_PERIOD; // Definido em lib.rs
pub const Burn: Permill = Permill::from_percent(0); // Sem burn
pub const MaxApprovals: u32 = 100;
pub const PayoutSpendPeriod: BlockNumber = 30 * DAYS;

// DEMOCRACY (Linhas 508-551)
pub const LaunchPeriod: BlockNumber = 7 * DAYS;       // Tempo para proposta virar referendum
pub const VotingPeriod: BlockNumber = 7 * DAYS;       // Período de votação
pub const FastTrackVotingPeriod: BlockNumber = 3 * HOURS; // Fast-track (emergência)
pub const MinimumDeposit: Balance = 100 * BZR;        // Depósito mínimo
pub const EnactmentPeriod: BlockNumber = 2 * DAYS;    // Período de execução
pub const CooloffPeriod: BlockNumber = 7 * DAYS;      // Cooloff após rejeição
pub const MaxVotes: u32 = 100;
pub const MaxProposals: u32 = 100;

// COUNCIL (Linhas 458-480)
pub const CouncilMotionDuration: BlockNumber = 7 * DAYS;
pub const CouncilMaxProposals: u32 = 100;
pub const CouncilMaxMembers: u32 = 13; // Máximo 13 membros

// TECHNICAL COMMITTEE (Linhas 483-505)
pub const TechnicalMotionDuration: BlockNumber = 7 * DAYS;
pub const TechnicalMaxProposals: u32 = 100;
pub const TechnicalMaxMembers: u32 = 7; // Máximo 7 membros

// MULTISIG (Linhas 410-425)
pub const MultisigDepositBase: Balance = 100 * MILLI_BZR;
pub const MultisigDepositFactor: Balance = 50 * MILLI_BZR;
pub const MaxSignatories: u32 = 20;
```

### Tempo de Blocos

```rust
// /root/bazari-chain/runtime/src/lib.rs
pub const MILLI_SECS_PER_BLOCK: u64 = 6000; // 6 segundos por bloco
pub const MINUTES: BlockNumber = 10;         // 10 blocos = 1 minuto
pub const HOURS: BlockNumber = 600;          // 600 blocos = 1 hora
pub const DAYS: BlockNumber = 14400;         // 14,400 blocos = 1 dia
```

---

## 🗳️ FLUXO 1: Democracy Proposals → Referendums

### 1.1 Criação de Proposta (democracy.propose)

**Extrinsic**:
```rust
democracy.propose(
    proposal: BoundedCallOf<T>, // Call wrapped em Bounded
    value: BalanceOf<T>          // Depósito (mín: 100 BZR)
)
```

**Exemplo Prático**:
```typescript
// 1. Criar call (ex: remark com metadata)
const metadata = JSON.stringify({
  title: "Adicionar novo membro ao Council",
  description: "Proposta para adicionar Alice ao conselho",
  proposer: "5GrwvaEF...",
  timestamp: "2025-11-03T12:00:00Z"
});

const remarkCall = api.tx.system.remark(metadata);

// 2. Submeter proposta
const proposeTx = api.tx.democracy.propose(
  {
    Lookup: {
      hash: remarkCall.method.hash,  // Hash da call
      len: remarkCall.encodedLength  // Tamanho
    }
  },
  api.createType('Balance', '100000000000000') // 100 BZR em planck
);

await proposeTx.signAndSend(alice);
```

**Estado Inicial**:
- Proposta entra em `PublicProps` (fila pública)
- Status: `PROPOSED`
- Depósito de 100 BZR bloqueado
- Proposal ID atribuído (sequencial: 0, 1, 2...)

**Eventos Emitidos**:
```rust
democracy::Proposed(proposalIndex: u32, deposit: Balance)
```

---

### 1.2 Apoiar Proposta (democracy.second)

**Extrinsic**:
```rust
democracy.second(proposal: PropIndex, seconds_upper_bound: u32)
```

**Exemplo**:
```typescript
// Apoiar proposta #0
const secondTx = api.tx.democracy.second(0, 100);
await secondTx.signAndSend(bob);
```

**Efeito**:
- Cada "second" adiciona 1 voto de apoio
- Apoiadores depositam mesmo valor do proposer (100 BZR)
- Proposta mais apoiada em `LaunchPeriod` se torna referendum

**Eventos**:
```rust
democracy::Seconded(seconder: AccountId, propIndex: u32)
```

---

### 1.3 Transição: Proposta → Referendum

**Automático a cada `LaunchPeriod` (7 dias)**:
- Sistema seleciona proposta com mais "seconds"
- Proposta se torna **Referendum**
- Referendum ID atribuído (sequencial: 0, 1, 2...)
- Período de votação inicia (`VotingPeriod`: 7 dias)
- Status muda: `PROPOSED` → `STARTED`

**Eventos**:
```rust
democracy::Started(refIndex: u32, threshold: VoteThreshold)
```

---

### 1.4 Votar em Referendum (democracy.vote)

**Extrinsic**:
```rust
democracy.vote(
    ref_index: ReferendumIndex,
    vote: AccountVote<BalanceOf<T>>
)
```

**Exemplo**:
```typescript
// Votar AYE com conviction 3x (tokens bloqueados por 4 períodos)
const voteTx = api.tx.democracy.vote(
  0, // Referendum #0
  {
    Standard: {
      vote: { aye: true, conviction: 'Locked3x' },
      balance: '1000000000000000' // 1000 BZR
    }
  }
);

await voteTx.signAndSend(charlie);
```

**Conviction Levels**:
```
None (0.1x)  - Tokens livres após votação
Locked1x (1x) - Bloqueio por 1 período (7 dias)
Locked2x (2x) - Bloqueio por 2 períodos (14 dias)
Locked3x (3x) - Bloqueio por 4 períodos (28 dias)
Locked4x (4x) - Bloqueio por 8 períodos (56 dias)
Locked5x (5x) - Bloqueio por 16 períodos (112 dias)
Locked6x (6x) - Bloqueio por 32 períodos (224 dias)
```

**Voting Power**:
```
voting_power = balance * conviction_multiplier

Exemplo:
- Balance: 1000 BZR
- Conviction: Locked3x
- Voting Power: 3000 BZR
```

**Eventos**:
```rust
democracy::Voted(voter: AccountId, refIndex: u32, vote: AccountVote)
```

---

### 1.5 Finalização do Referendum

**Automático após `VotingPeriod` (7 dias)**:

**Cálculo de Aprovação** (SimpleMajority):
```
approval = ayes / (ayes + nays) > 0.5
```

**Se APROVADO**:
- Status: `STARTED` → `PASSED`
- Call agendado para execução após `EnactmentPeriod` (2 dias)
- Depósitos devolvidos

**Se REJEITADO**:
- Status: `STARTED` → `NOT_PASSED`
- Cooloff de 7 dias antes de resubmeter
- Depósitos slashados (opcional, configurado como `Slash: ()`)

**Eventos**:
```rust
democracy::Passed(refIndex: u32)
// ou
democracy::NotPassed(refIndex: u32)
```

---

### 1.6 Execução Automática

**Após `EnactmentPeriod` (2 dias)**:
- Scheduler executa a call automaticamente
- Status: `PASSED` → `EXECUTED`
- Alterações aplicadas ao runtime

**Eventos**:
```rust
scheduler::Dispatched(task: TaskAddress, result: DispatchResult)
democracy::Executed(refIndex: u32, result: DispatchResult)
```

---

## 💰 FLUXO 2: Treasury Proposals

### 2.1 Criar Proposta de Treasury (treasury.proposeSpend)

**Extrinsic**:
```rust
treasury.proposeSpend(
    value: BalanceOf<T>,      // Valor solicitado
    beneficiary: AccountIdLookupOf<T> // Quem recebe
)
```

**Exemplo**:
```typescript
// Solicitar 5000 BZR do tesouro
const proposeTx = api.tx.treasury.proposeSpend(
  '5000000000000000', // 5000 BZR em planck
  '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty' // Beneficiário
);

await proposeTx.signAndSend(alice);
```

**Requisitos**:
- **Depósito**: 5% do valor solicitado (ex: 250 BZR para 5000 BZR)
- Proposer deve ter saldo suficiente
- Beneficiary deve ser conta válida

**Estado**:
- Proposta entra em fila de aprovação
- Proposal ID atribuído
- Status: `PENDING_APPROVAL`

**Eventos**:
```rust
treasury::Proposed(proposalIndex: u32)
```

---

### 2.2 Council Aprova/Rejeita (collective.vote)

**Council Member vota**:
```typescript
// Membro do council vota AYE
const voteTx = api.tx.council.vote(
  proposalHash,    // Hash da proposta
  proposalIndex,   // Index da proposta
  true             // Approve = true, Reject = false
);

await voteTx.signAndSend(councilMember);
```

**Threshold**:
- Requer maioria simples do council
- Ex: 7 de 13 membros devem aprovar

**Eventos**:
```rust
collective::Voted(who: AccountId, proposalHash: Hash, voted: bool, yes: u32, no: u32)
collective::Approved(proposalHash: Hash) // Se aprovado
collective::Disapproved(proposalHash: Hash) // Se rejeitado
```

---

### 2.3 Aprovação e Fila de Pagamento

**Se APROVADO pelo Council**:
- Proposta move para `Approvals` storage
- Entra em fila de pagamento
- Aguarda próximo `SpendPeriod`

**Eventos**:
```rust
treasury::Awarded(proposalIndex: u32, award: Balance, account: AccountId)
```

---

### 2.4 Execução Automática (Spend Period)

**A cada `PayoutSpendPeriod` (30 dias)**:
- Sistema processa todas propostas aprovadas
- Transfere fundos do tesouro para beneficiários
- Remove proposta da fila

**Eventos**:
```rust
treasury::Spending(budgetRemaining: Balance)
balances::Transfer(from: AccountId, to: AccountId, amount: Balance)
```

**Treasury Account**:
```rust
PalletId: *b"py/trsry"
Address: Derivada automaticamente do PalletId
```

---

## 🏛️ FLUXO 3: Council Proposals

### 3.1 Council Member Propõe (council.propose)

**Extrinsic**:
```rust
council.propose(
    threshold: u32,              // Número de votos necessários
    proposal: RuntimeCall,       // Call a ser executada
    length_bound: u32            // Tamanho da call
)
```

**Exemplo**:
```typescript
// Council propõe adicionar novo membro
const newMember = '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy';

const addMemberCall = api.tx.council.addMember(newMember);

const proposeTx = api.tx.council.propose(
  4,                              // Threshold: 4 votos necessários
  addMemberCall,                  // Call a executar
  addMemberCall.encodedLength     // Tamanho
);

await proposeTx.signAndSend(councilMember1);
```

**Requisitos**:
- Proposer DEVE ser membro do council
- Threshold <= número total de membros

**Eventos**:
```rust
collective::Proposed(who: AccountId, proposalIndex: u32, proposalHash: Hash, threshold: u32)
```

---

### 3.2 Membros Votam (council.vote)

```typescript
// Membros votam na proposta
await api.tx.council.vote(proposalHash, proposalIndex, true).signAndSend(member2);
await api.tx.council.vote(proposalHash, proposalIndex, true).signAndSend(member3);
await api.tx.council.vote(proposalHash, proposalIndex, true).signAndSend(member4);
```

**Condições**:
- Cada membro vota apenas 1 vez
- Votação aberta por `CouncilMotionDuration` (7 dias)

**Eventos**:
```rust
collective::Voted(who: AccountId, proposalHash: Hash, voted: bool, yes: u32, no: u32)
```

---

### 3.3 Execução (council.close)

**Manual ou Automático**:
```typescript
// Fechar votação e executar (se threshold atingido)
const closeTx = api.tx.council.close(
  proposalHash,
  proposalIndex,
  proposalWeightBound,
  lengthBound
);

await closeTx.signAndSend(anyAccount);
```

**Se threshold atingido**:
- Proposta executa imediatamente
- Call é despachada

**Se rejeitada ou expirada**:
- Proposta removida sem execução

**Eventos**:
```rust
collective::Closed(proposalHash: Hash, yes: u32, no: u32)
collective::Executed(proposalHash: Hash, result: DispatchResult)
```

---

## 🔧 FLUXO 4: Technical Committee (Fast-Track)

### 4.1 TechComm Propõe Upgrade Emergencial

**Exemplo de Runtime Upgrade**:
```typescript
// 1. Novo WASM runtime preparado
const newRuntime = fs.readFileSync('runtime.compact.compressed.wasm');

// 2. TechComm propõe upgrade
const upgradeCall = api.tx.system.setCode(newRuntime);

const proposeTx = api.tx.technicalCommittee.propose(
  3,  // 3 de 7 membros necessários (maioria)
  upgradeCall,
  upgradeCall.encodedLength
);

await proposeTx.signAndSend(techMember1);
```

---

### 4.2 Fast-Track Referendum

**TechComm pode criar fast-track referendum**:
```typescript
// Fast-track: votação em 3 horas ao invés de 7 dias
const fastTrackTx = api.tx.democracy.fastTrack(
  proposalHash,
  3 * HOURS,  // Voting period: 3 horas
  0           // Delay: 0 (execução imediata)
);

await fastTrackTx.signAndSend(techMember);
```

**Usado para**:
- Vulnerabilidades críticas
- Bugs de segurança
- Emergências de rede

---

## 🔐 FLUXO 5: Multisig Accounts

### 5.1 Criar Conta Multisig

```typescript
// Definir signatários
const signatories = [
  '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
  '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy'
];

// Threshold: 2 de 3
const threshold = 2;

// Derivar endereço multisig
const multisigAddress = api.tx.multisig.deriveMultisigAddress(signatories, threshold);

console.log('Multisig Address:', multisigAddress);
```

---

### 5.2 Primeira Assinatura (asMulti)

```typescript
// Call a executar (ex: transferência)
const call = api.tx.balances.transferKeepAlive(recipient, amount);

// Primeira assinatura
const multiTx = api.tx.multisig.asMulti(
  threshold,
  signatories.filter(s => s !== signer1), // Outros signatários
  null,  // Timepoint: null (primeira chamada)
  call,
  maxWeight
);

await multiTx.signAndSend(signer1);
```

**Estado**:
- Transação armazenada em `Multisigs` storage
- Aguardando aprovações adicionais

**Eventos**:
```rust
multisig::NewMultisig(approving: AccountId, multisig: AccountId, callHash: Hash)
```

---

### 5.3 Segunda Assinatura (approveAsMulti)

```typescript
// Obter timepoint da primeira assinatura
const multisigInfo = await api.query.multisig.multisigs(multisigAddress, callHash);
const timepoint = multisigInfo.unwrap().when;

// Segunda assinatura (atinge threshold)
const approveTx = api.tx.multisig.approveAsMulti(
  threshold,
  signatories.filter(s => s !== signer2),
  timepoint,
  callHash,
  maxWeight
);

await approveTx.signAndSend(signer2);
```

**Execução**:
- Threshold atingido (2 de 3)
- Call executa automaticamente
- Multisig entry removido do storage

**Eventos**:
```rust
multisig::MultisigExecuted(approving: AccountId, timepoint: Timepoint, multisig: AccountId, callHash: Hash, result: DispatchResult)
```

---

## 📊 Exemplos Completos por Tipo

### Exemplo 1: Democracy Referendum Completo

```typescript
// ============================================
// DIA 0: Criar Proposta
// ============================================
const metadata = JSON.stringify({
  title: "Aumentar MaxMembers do Council de 13 para 21",
  description: "Proposta para expandir o conselho conforme crescimento da comunidade",
  proposer: "5GrwvaEF...",
  timestamp: new Date().toISOString()
});

const remarkCall = api.tx.system.remark(metadata);

const proposeTx = api.tx.democracy.propose(
  { Lookup: { hash: remarkCall.method.hash, len: remarkCall.encodedLength } },
  '100000000000000' // 100 BZR
);

await proposeTx.signAndSend(alice);
// Evento: democracy::Proposed(0, 100000000000000)
// Estado: PublicProps contém proposta #0

// ============================================
// DIAS 1-6: Comunidade apoia proposta
// ============================================
await api.tx.democracy.second(0, 100).signAndSend(bob);
await api.tx.democracy.second(0, 100).signAndSend(charlie);
await api.tx.democracy.second(0, 100).signAndSend(dave);
// Estado: Proposta #0 tem 3 "seconds"

// ============================================
// DIA 7: LaunchPeriod termina
// ============================================
// Sistema automaticamente converte proposta mais apoiada em referendum
// Evento: democracy::Started(0, SimpleMajority)
// Estado: ReferendumInfoOf(0) = Ongoing

// ============================================
// DIAS 8-13: Período de Votação
// ============================================
// Usuários votam
await api.tx.democracy.vote(0, {
  Standard: { vote: { aye: true, conviction: 'Locked3x' }, balance: '5000000000000000' }
}).signAndSend(eve);

await api.tx.democracy.vote(0, {
  Standard: { vote: { aye: true, conviction: 'Locked2x' }, balance: '3000000000000000' }
}).signAndSend(frank);

await api.tx.democracy.vote(0, {
  Standard: { vote: { aye: false, conviction: 'None' }, balance: '1000000000000000' }
}).signAndSend(grace);

// Tally atual:
// Ayes: 5000 * 3 + 3000 * 2 = 21,000 voting power
// Nays: 1000 * 0.1 = 100 voting power
// Approval: 21,000 / 21,100 = 99.5% > 50% ✅

// ============================================
// DIA 14: VotingPeriod termina
// ============================================
// Sistema calcula resultado
// Evento: democracy::Passed(0)
// Estado: Call agendado para bloco (current + EnactmentPeriod)

// ============================================
// DIA 16: EnactmentPeriod termina
// ============================================
// Scheduler executa call automaticamente
// Evento: scheduler::Dispatched(...)
// Evento: democracy::Executed(0, Ok(()))
// Estado: Referendum finalizado
```

---

### Exemplo 2: Treasury Proposal Completo

```typescript
// ============================================
// DIA 0: Solicitar Fundos
// ============================================
const beneficiary = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
const amount = '10000000000000000'; // 10,000 BZR
const deposit = '500000000000000';   // 500 BZR (5% de 10,000)

const proposeTx = api.tx.treasury.proposeSpend(amount, beneficiary);
await proposeTx.signAndSend(alice);
// Evento: treasury::Proposed(0)
// Estado: Proposals(0) = { proposer, value, beneficiary, bond }

// ============================================
// DIAS 1-5: Council Revisa
// ============================================
// Council cria motion para aprovar
const approveCall = api.tx.treasury.approveProposal(0);

const motionTx = api.tx.council.propose(
  7,  // 7 de 13 votos necessários
  approveCall,
  approveCall.encodedLength
);

await motionTx.signAndSend(councilMember1);
// Evento: collective::Proposed(councilMember1, 0, proposalHash, 7)

// ============================================
// DIAS 2-5: Council Vota
// ============================================
await api.tx.council.vote(proposalHash, 0, true).signAndSend(member2);
await api.tx.council.vote(proposalHash, 0, true).signAndSend(member3);
await api.tx.council.vote(proposalHash, 0, true).signAndSend(member4);
await api.tx.council.vote(proposalHash, 0, true).signAndSend(member5);
await api.tx.council.vote(proposalHash, 0, true).signAndSend(member6);
await api.tx.council.vote(proposalHash, 0, true).signAndSend(member7);
// Estado: Voting { yes: 7, no: 0 }

// ============================================
// DIA 5: Fechar Votação
// ============================================
await api.tx.council.close(proposalHash, 0, maxWeight, lengthBound).signAndSend(anyAccount);
// Evento: collective::Closed(proposalHash, 7, 0)
// Evento: collective::Executed(proposalHash, Ok(()))
// Evento: treasury::Approved(0)
// Estado: Approvals contém proposal ID 0

// ============================================
// DIA 35: PayoutSpendPeriod (30 dias)
// ============================================
// Sistema automaticamente paga propostas aprovadas
// Evento: treasury::Spending(remainingBudget)
// Evento: balances::Transfer(treasuryAccount, beneficiary, 10000 BZR)
// Estado: Proposta removida, beneficiary recebe fundos
```

---

## 🔍 Storage Queries Úteis

```typescript
// Democracy
const publicProps = await api.query.democracy.publicProps();
const referendumInfo = await api.query.democracy.referendumInfoOf(0);
const votingOf = await api.query.democracy.votingOf(account);

// Treasury
const proposals = await api.query.treasury.proposals.entries();
const approvals = await api.query.treasury.approvals();

// Council
const members = await api.query.council.members();
const proposals = await api.query.council.proposals();
const voting = await api.query.council.voting(proposalHash);

// Multisig
const multisigs = await api.query.multisig.multisigs.entries();
const multisigInfo = await api.query.multisig.multisigs(multisigAddress, callHash);
```

---

## 📈 Ciclo de Vida - Diagrama Resumido

```
┌─────────────────────────────────────────────────────────────────┐
│                        DEMOCRACY FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. democracy.propose(call, deposit)                             │
│     ↓                                                             │
│  2. PublicProps Queue (status: PROPOSED)                         │
│     ↓                                                             │
│  3. democracy.second(propIndex) [comunidade apoia]               │
│     ↓                                                             │
│  4. [LaunchPeriod: 7 dias] → Auto-converte para Referendum       │
│     ↓                                                             │
│  5. Referendum Ativo (status: STARTED)                           │
│     ↓                                                             │
│  6. democracy.vote(refIndex, vote) [votação pública]             │
│     ↓                                                             │
│  7. [VotingPeriod: 7 dias] → Calcula resultado                   │
│     ↓                              ↓                              │
│  8a. PASSED                    8b. NOT_PASSED                     │
│     ↓                              ↓                              │
│  9. [EnactmentPeriod: 2 dias]   Cooloff: 7 dias                  │
│     ↓                                                             │
│  10. EXECUTED (call executada automaticamente)                   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         TREASURY FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. treasury.proposeSpend(value, beneficiary)                    │
│     ↓                                                             │
│  2. Proposals Storage (aguarda aprovação)                        │
│     ↓                                                             │
│  3. Council cria motion: council.propose(approveProposal)        │
│     ↓                                                             │
│  4. Council vota: council.vote(proposalHash, approve)            │
│     ↓                              ↓                              │
│  5a. APPROVED                  5b. REJECTED                       │
│     ↓                              ↓                              │
│  6. Approvals Queue            Slash deposit                      │
│     ↓                                                             │
│  7. [PayoutSpendPeriod: 30 dias]                                 │
│     ↓                                                             │
│  8. Auto-transfer(treasury → beneficiary)                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         COUNCIL FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. council.propose(threshold, call, length)                     │
│     ↓                                                             │
│  2. Proposals Storage                                            │
│     ↓                                                             │
│  3. council.vote(proposalHash, index, approve)                   │
│     ↓                                                             │
│  4. [MotionDuration: 7 dias OU threshold atingido]               │
│     ↓                                                             │
│  5. council.close() → Executa se aprovado                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Status de Implementação

| Componente | Status | Notas |
|------------|--------|-------|
| pallet-democracy | ✅ Completo | Proposals, referendums, voting |
| pallet-treasury | ✅ Completo | Spend proposals, approvals, payouts |
| pallet-collective (Council) | ✅ Completo | 13 membros max, 7 dias votação |
| pallet-collective (TechComm) | ✅ Completo | 7 membros max, fast-track |
| pallet-multisig | ✅ Completo | 20 signatários max |
| pallet-scheduler | ✅ Completo | Agendamento automático |
| pallet-preimage | ✅ Completo | Storage de calls |

---

## 📚 Referências

- **Runtime**: `/root/bazari-chain/runtime/src/configs/mod.rs`
- **Substrate Docs**: https://docs.substrate.io/reference/frame-pallets/
- **Polkadot Wiki**: https://wiki.polkadot.network/docs/learn-governance
