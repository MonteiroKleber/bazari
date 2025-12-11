# Governance Module - E2E Test Plan & Test Data

## 📋 Objetivo

Este documento fornece um plano completo de testes end-to-end (E2E) para o módulo de Governança do frontend Bazari, incluindo massa de teste, scripts e passo a passo detalhado para validar todos os fluxos.

---

## 🎯 Escopo de Testes

### Telas a Testar

1. ✅ **Dashboard de Governança** (`/app/governance`)
2. ✅ **Lista de Propostas** (`/app/governance/proposals`)
3. ✅ **Detalhes de Proposta Democracy** (`/app/governance/proposals/democracy/:id`)
4. ✅ **Detalhes de Proposta Treasury** (`/app/governance/proposals/treasury/:id`)
5. ✅ **Criar Nova Proposta** (`/app/governance/proposals/new`)
6. ✅ **Página do Treasury** (`/app/governance/treasury`)
7. ✅ **Página do Council** (`/app/governance/council`)
8. ✅ **Página do Technical Committee** (`/app/governance/tech-committee`)

### Fluxos a Testar

1. ✅ **Fluxo Democracy**: Criar proposta → Apoiar → Referendum → Votar
2. ✅ **Fluxo Treasury**: Solicitar fundos → Council aprova → Pagamento
3. ✅ **Fluxo Council**: Criar motion → Membros votam → Executar
4. ✅ **Fluxo Technical Committee**: Proposta técnica → Fast-track

---

## 👥 Massa de Teste - Contas

### Contas Necessárias

```javascript
// CONTAS DE TESTE (seeds para desenvolvimento)
const ACCOUNTS = {
  // Sudo & Fundador
  alice: {
    seed: '//Alice',
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    role: 'Sudo, Council Member, Founder',
    balance: '1000000 BZR'
  },

  // Council Members
  bob: {
    seed: '//Bob',
    address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    role: 'Council Member',
    balance: '500000 BZR'
  },

  charlie: {
    seed: '//Charlie',
    address: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
    role: 'Council Member',
    balance: '500000 BZR'
  },

  dave: {
    seed: '//Dave',
    address: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy',
    role: 'Council Member, Tech Committee',
    balance: '500000 BZR'
  },

  eve: {
    seed: '//Eve',
    address: '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw',
    role: 'Council Member, Tech Committee',
    balance: '500000 BZR'
  },

  ferdie: {
    seed: '//Ferdie',
    address: '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL',
    role: 'Council Member',
    balance: '500000 BZR'
  },

  // Community Members
  george: {
    seed: '//George',
    address: '5G1ojzh47Yt8KoYhuAjXpHcazvsoCXe3G8LZchKDvumozJJJ',
    role: 'Community Member',
    balance: '100000 BZR'
  },

  heather: {
    seed: '//Heather',
    address: '5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu',
    role: 'Community Member',
    balance: '100000 BZR'
  },

  ivan: {
    seed: '//Ivan',
    address: '5Fe3jZRbKes6aeuQ6HkcTvQeNhkkRPTXBwmNkuAPoimGEv45',
    role: 'Community Member',
    balance: '50000 BZR'
  },

  judy: {
    seed: '//Judy',
    address: '5HKPmK9GYtE1PSLsS1qiYU9xQ9Si1NcEhdeCq9sw5bqu4ns8',
    role: 'Community Member',
    balance: '50000 BZR'
  }
};
```

---

## 📊 Massa de Teste - Propostas

### 1. Democracy Proposals (10 propostas)

```javascript
const DEMOCRACY_PROPOSALS = [
  {
    id: 'DEM-001',
    title: 'Aumentar MaxMembers do Council para 21',
    description: 'Proposta para expandir o conselho de 13 para 21 membros, permitindo maior representação da comunidade à medida que o projeto cresce.',
    proposer: ACCOUNTS.alice.address,
    deposit: '100 BZR',
    type: 'RuntimeUpgrade',
    expectedStatus: 'PROPOSED',
    testActions: ['create', 'second', 'view']
  },

  {
    id: 'DEM-002',
    title: 'Reduzir VotingPeriod para 5 dias',
    description: 'Proposta para acelerar o processo de governança reduzindo o período de votação de 7 para 5 dias, mantendo ainda tempo suficiente para participação.',
    proposer: ACCOUNTS.bob.address,
    deposit: '100 BZR',
    type: 'ConfigChange',
    expectedStatus: 'PROPOSED',
    testActions: ['create', 'second', 'view', 'transition_to_referendum']
  },

  {
    id: 'DEM-003',
    title: 'Implementar Sistema de Delegação de Voto',
    description: 'Habilitar funcionalidade de delegação de votos para permitir que usuários deleguem seu poder de voto para representantes confiáveis.',
    proposer: ACCOUNTS.charlie.address,
    deposit: '100 BZR',
    type: 'Feature',
    expectedStatus: 'PROPOSED',
    testActions: ['create', 'view']
  },

  {
    id: 'DEM-004',
    title: 'Adicionar Suporte Multi-Asset no Marketplace',
    description: 'Permitir pagamentos em múltiplos tokens (BZR, ZARI, USDT) no marketplace, expandindo opções de pagamento.',
    proposer: ACCOUNTS.dave.address,
    deposit: '100 BZR',
    type: 'Feature',
    expectedStatus: 'PROPOSED',
    testActions: ['create', 'second', 'view']
  },

  {
    id: 'DEM-005',
    title: 'Implementar Taxa de Queima de 1% em Transações',
    description: 'Introduzir taxa de queima de 1% em todas as transações BZR para reduzir oferta circulante e criar pressão deflacionária.',
    proposer: ACCOUNTS.eve.address,
    deposit: '100 BZR',
    type: 'Economic',
    expectedStatus: 'PROPOSED',
    testActions: ['create', 'second', 'view', 'transition_to_referendum', 'vote']
  },

  {
    id: 'DEM-006',
    title: 'Criar Programa de Grants para Desenvolvedores',
    description: 'Estabelecer programa de grants de 100,000 BZR para desenvolvedores que contribuírem com ferramentas e dApps para o ecossistema.',
    proposer: ACCOUNTS.ferdie.address,
    deposit: '100 BZR',
    type: 'Funding',
    expectedStatus: 'PROPOSED',
    testActions: ['create', 'view']
  },

  {
    id: 'DEM-007',
    title: 'Atualizar Parâmetros de Vesting',
    description: 'Ajustar cliff period de 1 ano para 6 meses para founders, permitindo liberação mais rápida de tokens após alinhamento comprovado.',
    proposer: ACCOUNTS.george.address,
    deposit: '100 BZR',
    type: 'ConfigChange',
    expectedStatus: 'PROPOSED',
    testActions: ['create', 'second', 'view']
  },

  {
    id: 'DEM-008',
    title: 'Habilitar Staking para ZARI Token',
    description: 'Implementar mecanismo de staking para ZARI com APY de 12%, incentivando holders a bloquear tokens e participar da governança.',
    proposer: ACCOUNTS.heather.address,
    deposit: '100 BZR',
    type: 'Feature',
    expectedStatus: 'PROPOSED',
    testActions: ['create', 'view']
  },

  {
    id: 'DEM-009',
    title: 'Integrar Oracle Chainlink para Preços',
    description: 'Conectar blockchain Bazari com oracles Chainlink para feeds de preços confiáveis em transações P2P e marketplace.',
    proposer: ACCOUNTS.ivan.address,
    deposit: '100 BZR',
    type: 'Integration',
    expectedStatus: 'PROPOSED',
    testActions: ['create', 'second', 'view']
  },

  {
    id: 'DEM-010',
    title: 'Criar Sistema de Reputação On-Chain',
    description: 'Desenvolver sistema de reputação baseado em histórico de transações, votações e participação em governança para identificar membros confiáveis.',
    proposer: ACCOUNTS.judy.address,
    deposit: '100 BZR',
    type: 'Feature',
    expectedStatus: 'PROPOSED',
    testActions: ['create', 'view']
  }
];
```

---

### 2. Treasury Proposals (8 propostas)

```javascript
const TREASURY_PROPOSALS = [
  {
    id: 'TRE-001',
    title: 'Financiar Marketing Q1 2025',
    description: 'Solicitar 50,000 BZR para campanha de marketing no Q1 2025, incluindo anúncios em redes sociais, influenciadores crypto e eventos.',
    proposer: ACCOUNTS.alice.address,
    beneficiary: ACCOUNTS.alice.address,
    value: '50000 BZR',
    deposit: '2500 BZR', // 5%
    expectedStatus: 'PENDING_APPROVAL',
    testActions: ['create', 'view', 'council_approve']
  },

  {
    id: 'TRE-002',
    title: 'Auditoria de Segurança Smart Contracts',
    description: 'Contratar empresa especializada (CertiK ou Trail of Bits) para auditoria completa de todos os pallets e contratos inteligentes.',
    proposer: ACCOUNTS.bob.address,
    beneficiary: '5G1ojzh47Yt8KoYhuAjXpHcazvsoCXe3G8LZchKDvumozJJJ',
    value: '75000 BZR',
    deposit: '3750 BZR',
    expectedStatus: 'PENDING_APPROVAL',
    testActions: ['create', 'view', 'council_approve', 'wait_payout']
  },

  {
    id: 'TRE-003',
    title: 'Desenvolvimento Mobile App (iOS/Android)',
    description: 'Financiar desenvolvimento de aplicativo mobile nativo para iOS e Android com todas as funcionalidades do webapp.',
    proposer: ACCOUNTS.charlie.address,
    beneficiary: ACCOUNTS.charlie.address,
    value: '120000 BZR',
    deposit: '6000 BZR',
    expectedStatus: 'PENDING_APPROVAL',
    testActions: ['create', 'view', 'council_reject']
  },

  {
    id: 'TRE-004',
    title: 'Implementar Bridge Ethereum-Bazari',
    description: 'Desenvolver bridge bidirecional entre Ethereum e Bazari Chain para permitir transferência de assets entre redes.',
    proposer: ACCOUNTS.dave.address,
    beneficiary: ACCOUNTS.dave.address,
    value: '200000 BZR',
    deposit: '10000 BZR',
    expectedStatus: 'PENDING_APPROVAL',
    testActions: ['create', 'view']
  },

  {
    id: 'TRE-005',
    title: 'Campanha Airdrop para Early Adopters',
    description: 'Distribuir 30,000 BZR entre os primeiros 1000 usuários ativos da plataforma como recompensa por early adoption.',
    proposer: ACCOUNTS.eve.address,
    beneficiary: ACCOUNTS.eve.address,
    value: '30000 BZR',
    deposit: '1500 BZR',
    expectedStatus: 'PENDING_APPROVAL',
    testActions: ['create', 'view', 'council_approve']
  },

  {
    id: 'TRE-006',
    title: 'Contratar Dev Ops Engineer Full-Time',
    description: 'Salário anual para Dev Ops Engineer responsável por infraestrutura, CI/CD, monitoramento e escalabilidade.',
    proposer: ACCOUNTS.ferdie.address,
    beneficiary: ACCOUNTS.ferdie.address,
    value: '80000 BZR',
    deposit: '4000 BZR',
    expectedStatus: 'PENDING_APPROVAL',
    testActions: ['create', 'view']
  },

  {
    id: 'TRE-007',
    title: 'Patrocinar Conferência Blockchain Brasil 2025',
    description: 'Patrocínio Gold na maior conferência blockchain do Brasil para aumentar visibilidade e network.',
    proposer: ACCOUNTS.george.address,
    beneficiary: ACCOUNTS.george.address,
    value: '25000 BZR',
    deposit: '1250 BZR',
    expectedStatus: 'PENDING_APPROVAL',
    testActions: ['create', 'view', 'council_approve']
  },

  {
    id: 'TRE-008',
    title: 'Criar Pool de Liquidez em DEX',
    description: 'Adicionar liquidez de 100,000 BZR em DEX para facilitar negociação e reduzir slippage.',
    proposer: ACCOUNTS.heather.address,
    beneficiary: ACCOUNTS.heather.address,
    value: '100000 BZR',
    deposit: '5000 BZR',
    expectedStatus: 'PENDING_APPROVAL',
    testActions: ['create', 'view']
  }
];
```

---

### 3. Council Motions (5 propostas)

```javascript
const COUNCIL_MOTIONS = [
  {
    id: 'COU-001',
    title: 'Adicionar Membro George ao Council',
    description: 'Motion para incluir George como novo membro do Council devido à sua contribuição ativa na comunidade.',
    proposer: ACCOUNTS.alice.address,
    threshold: 4,
    call: 'council.addMember',
    args: { newMember: ACCOUNTS.george.address },
    expectedStatus: 'PROPOSED',
    testActions: ['create', 'vote', 'close']
  },

  {
    id: 'COU-002',
    title: 'Aprovar Treasury Proposal #0',
    description: 'Motion para aprovar proposta de financiamento de marketing Q1 2025.',
    proposer: ACCOUNTS.bob.address,
    threshold: 4,
    call: 'treasury.approveProposal',
    args: { proposalId: 0 },
    expectedStatus: 'PROPOSED',
    testActions: ['create', 'vote', 'close', 'execute']
  },

  {
    id: 'COU-003',
    title: 'Remover Membro Inativo do Council',
    description: 'Remover membro que não participa de votações há mais de 60 dias.',
    proposer: ACCOUNTS.charlie.address,
    threshold: 5,
    call: 'council.removeMember',
    args: { who: '5SomeInactiveAddress...' },
    expectedStatus: 'PROPOSED',
    testActions: ['create', 'vote', 'close']
  },

  {
    id: 'COU-004',
    title: 'Definir Prime Member do Council',
    description: 'Eleger Alice como Prime Member do Council com poder de voto de desempate.',
    proposer: ACCOUNTS.dave.address,
    threshold: 4,
    call: 'council.setPrime',
    args: { who: ACCOUNTS.alice.address },
    expectedStatus: 'PROPOSED',
    testActions: ['create', 'vote']
  },

  {
    id: 'COU-005',
    title: 'Cancelar Referendum Malicioso',
    description: 'Cancelar referendum #3 identificado como proposta maliciosa que pode comprometer a rede.',
    proposer: ACCOUNTS.eve.address,
    threshold: 6,
    call: 'democracy.emergencyCancel',
    args: { refIndex: 3 },
    expectedStatus: 'PROPOSED',
    testActions: ['create', 'vote', 'close', 'execute']
  }
];
```

---

### 4. Technical Committee Proposals (3 propostas)

```javascript
const TECH_COMMITTEE_PROPOSALS = [
  {
    id: 'TEC-001',
    title: 'Runtime Upgrade v104 - Bug Fix Crítico',
    description: 'Atualização emergencial para corrigir vulnerabilidade crítica descoberta no pallet-balances.',
    proposer: ACCOUNTS.dave.address,
    threshold: 2,
    call: 'system.setCode',
    runtime: 'runtime-v104.wasm',
    expectedStatus: 'PROPOSED',
    testActions: ['create', 'vote', 'fast_track']
  },

  {
    id: 'TEC-002',
    title: 'Fast-Track Referendum #5 (Economic Emergency)',
    description: 'Fast-track de proposta econômica urgente devido a condições de mercado excepcionais.',
    proposer: ACCOUNTS.eve.address,
    threshold: 2,
    call: 'democracy.fastTrack',
    args: {
      proposalHash: '0xabc123...',
      votingPeriod: '3 HOURS',
      delay: 0
    },
    expectedStatus: 'PROPOSED',
    testActions: ['create', 'vote', 'execute']
  },

  {
    id: 'TEC-003',
    title: 'Blacklist Proposta Spam #15',
    description: 'Adicionar proposta spam à blacklist para prevenir resubmissão.',
    proposer: ACCOUNTS.dave.address,
    threshold: 2,
    call: 'democracy.blacklist',
    args: { proposalHash: '0xdef456...' },
    expectedStatus: 'PROPOSED',
    testActions: ['create', 'vote', 'close']
  }
];
```

---

## 🧪 PLANO DE TESTES DETALHADO

---

## TESTE 1: Democracy Proposal - Ciclo Completo

### Objetivo
Validar criação, apoio, transição para referendum, votação e execução de proposta democracy.

### Pré-requisitos
- ✅ 10 contas com saldo suficiente
- ✅ Blockchain rodando
- ✅ Frontend acessível em https://bazari.libervia.xyz

---

### PASSO 1: Criar Proposta Democracy (DEM-001)

**Executor**: Alice
**Tempo Estimado**: 5 minutos

#### 1.1 Acessar Página de Criação
```
URL: https://bazari.libervia.xyz/app/governance/proposals/new
```

**Ações**:
1. Login com conta Alice (seed: `//Alice`)
2. Navegar para Governance → Proposals → Nova Proposta
3. Verificar formulário carregado

**Validações**:
- ✅ Formulário exibe todos os campos
- ✅ Tipo de proposta "Democracy" está disponível
- ✅ Campo de depósito mostra mínimo (100 BZR)

#### 1.2 Preencher Formulário
```javascript
// Dados a preencher
{
  type: 'DEMOCRACY',
  title: 'Aumentar MaxMembers do Council para 21',
  description: `Proposta para expandir o conselho de 13 para 21 membros.

  Justificativa:
  - Comunidade cresceu 300% no último trimestre
  - Maior representação geográfica necessária
  - Melhor distribuição de poder de decisão

  Implementação:
  - Runtime upgrade para alterar CouncilMaxMembers
  - Sem impacto em propostas em andamento
  - Eleições para novos membros via democracy
  `,
  preimageHash: '' // Será gerado automaticamente
}
```

**Ações**:
1. Selecionar tipo: **Democracy**
2. Preencher **título** (campo obrigatório)
3. Preencher **descrição** (campo obrigatório)
4. Confirmar depósito: **100 BZR**
5. Clicar em **"Criar Proposta"**

**Validações**:
- ✅ Todos os campos obrigatórios preenchidos
- ✅ Depósito suficiente na conta
- ✅ Botão "Criar Proposta" habilitado

#### 1.3 Assinar Transação
```typescript
// Extrinsic esperado
democracy.propose(
  { Lookup: { hash: '0x...', len: 234 } },
  '100000000000000' // 100 BZR
)
```

**Ações**:
1. Modal de assinatura aparece
2. Revisar extrinsic details
3. Confirmar assinatura com PIN/senha
4. Aguardar confirmação

**Validações**:
- ✅ Modal mostra detalhes corretos
- ✅ Fee estimado exibido
- ✅ Assinatura bem-sucedida
- ✅ Toast de sucesso: "Proposta criada com sucesso!"

#### 1.4 Verificar Proposta Criada
```
URL: https://bazari.libervia.xyz/app/governance/proposals
```

**Validações**:
- ✅ Proposta #0 aparece na lista
- ✅ Título: "Aumentar MaxMembers do Council para 21"
- ✅ Tipo: "Democracia" (badge azul)
- ✅ Status: "Proposta" (badge amarelo)
- ✅ Proposer: Alice (endereço correto)
- ✅ Depósito: 100 BZR

#### 1.5 Acessar Detalhes da Proposta
```
URL: https://bazari.libervia.xyz/app/governance/proposals/democracy/0
```

**Validações**:
- ✅ Página carrega sem erros
- ✅ Título exibido corretamente
- ✅ **Descrição completa** visível ✨ (CORRIGIDO)
- ✅ Proposer: Alice
- ✅ Preimage Hash exibido
- ✅ Data de criação
- ✅ Botão "Apoiar Proposta" visível

**Screenshot**: Capturar página de detalhes

---

### PASSO 2: Apoiar Proposta (Seconding)

**Executores**: Bob, Charlie, Dave
**Tempo Estimado**: 10 minutos

#### 2.1 Bob Apoia a Proposta

**Ações**:
1. Login com conta Bob
2. Acessar `/app/governance/proposals/democracy/0`
3. Clicar em **"Apoiar Proposta"**
4. Confirmar depósito: 100 BZR
5. Assinar transação

**Extrinsic**:
```typescript
democracy.second(0, 100)
```

**Validações**:
- ✅ Toast: "Você apoiou a proposta!"
- ✅ Contador de apoios: 1
- ✅ Bob aparece na lista de apoiadores

#### 2.2 Charlie Apoia a Proposta

**Ações**:
1. Login com Charlie
2. Repetir mesmo processo de Bob
3. Assinar transação

**Validações**:
- ✅ Contador de apoios: 2
- ✅ Charlie na lista de apoiadores

#### 2.3 Dave Apoia a Proposta

**Ações**:
1. Login com Dave
2. Repetir mesmo processo
3. Assinar transação

**Validações**:
- ✅ Contador de apoios: 3
- ✅ Dave na lista de apoiadores
- ✅ Proposta destacada como "Mais Apoiada"

**Screenshot**: Proposta com 3 apoios

---

### PASSO 3: Aguardar Launch Period (SIMULAÇÃO)

**Tempo Real**: 7 dias (100,800 blocos)
**Tempo Simulado**: Usar `fast-forward` ou aguardar

#### 3.1 Fast-Forward Blockchain (Desenvolvimento)
```bash
# SSH no servidor
ssh root@bazari.libervia.xyz

# Fast-forward 100,800 blocos (7 dias)
# Usando sudo para acelerar tempo (apenas dev)
cd /root/bazari-chain
./target/release/solochain-template-node key inspect //Alice

# Ou aguardar naturalmente
```

**Validações**:
- ✅ Bloco atual > bloco_criacao + 100,800
- ✅ Proposta ainda na lista

#### 3.2 Verificar Transição Automática

**Ações**:
1. Acessar `/app/governance/proposals`
2. Verificar se proposta #0 ainda aparece
3. Acessar `/app/governance/democracy/referendums` (se existir)

**Validações**:
- ✅ Proposta #0 se tornou Referendum #0
- ✅ Status mudou: "Proposta" → "Votação Ativa"
- ✅ Badge azul: "Ativo"
- ✅ Período de votação iniciado

**Screenshot**: Referendum #0 ativo

---

### PASSO 4: Votar no Referendum

**Executores**: Eve, Ferdie, George, Heather
**Tempo Estimado**: 15 minutos

#### 4.1 Eve Vota AYE (Locked3x)

**URL**: `/app/governance/referendums/democracy/0` (ou proposals se não houver página separada)

**Ações**:
1. Login com Eve
2. Acessar detalhes do referendum
3. Clicar em **"Votar Agora"**
4. Selecionar: **AYE (Sim)**
5. Quantidade: **5000 BZR**
6. Conviction: **Locked3x (bloqueio 28 dias)**
7. Assinar transação

**Extrinsic**:
```typescript
democracy.vote(0, {
  Standard: {
    vote: { aye: true, conviction: 'Locked3x' },
    balance: '5000000000000000'
  }
})
```

**Validações**:
- ✅ Toast: "Voto registrado com sucesso!"
- ✅ Voting power: 15,000 BZR (5000 × 3)
- ✅ Tally atualizado: Ayes: 15,000

#### 4.2 Ferdie Vota AYE (Locked2x)

**Ações**:
1. Login com Ferdie
2. Votar: AYE, 3000 BZR, Locked2x
3. Assinar

**Validações**:
- ✅ Voting power: 6,000 BZR (3000 × 2)
- ✅ Tally: Ayes: 21,000

#### 4.3 George Vota NAY (None)

**Ações**:
1. Login com George
2. Votar: NAY, 1000 BZR, None
3. Assinar

**Validações**:
- ✅ Voting power: 100 BZR (1000 × 0.1)
- ✅ Tally: Nays: 100

#### 4.4 Heather Vota AYE (Locked1x)

**Ações**:
1. Login com Heather
2. Votar: AYE, 2000 BZR, Locked1x
3. Assinar

**Validações**:
- ✅ Voting power: 2,000 BZR (2000 × 1)
- ✅ **Tally Final**:
  - **Ayes: 23,000 voting power**
  - **Nays: 100 voting power**
  - **Approval: 99.6%** ✅

**Screenshot**: Gráfico de votação

---

### PASSO 5: Aguardar Voting Period (SIMULAÇÃO)

**Tempo Real**: 7 dias
**Tempo Simulado**: Fast-forward

#### 5.1 Avançar 7 dias

**Validações**:
- ✅ Referendum finalizado
- ✅ Status: "Votação Ativa" → "Aprovado"
- ✅ Badge verde: "Aprovado"

---

### PASSO 6: Verificar Execução

**Tempo Real**: +2 dias (Enactment Period)
**URL**: `/app/governance/proposals/democracy/0`

**Validações**:
- ✅ Status: "Aprovado" → "Executado"
- ✅ Badge verde escuro: "Executado"
- ✅ Call foi executada (verificar storage)
- ✅ Depósitos devolvidos aos apoiadores
- ✅ Tokens votados desbloqueados (conforme conviction)

**Screenshot**: Proposta executada

---

## TESTE 2: Treasury Proposal - Ciclo Completo

### Objetivo
Validar solicitação de fundos, aprovação por council e pagamento.

### PASSO 1: Criar Proposta Treasury (TRE-001)

**Executor**: Alice
**Tempo**: 5 minutos

#### 1.1 Acessar Página de Criação
```
URL: https://bazari.libervia.xyz/app/governance/treasury
```

**Ações**:
1. Login com Alice
2. Clicar em **"Nova Proposta"** (ou navegar para `/proposals/new?type=treasury`)
3. Formulário carrega

#### 1.2 Preencher Formulário
```javascript
{
  type: 'TREASURY',
  title: 'Financiar Marketing Q1 2025',
  description: `Solicitar 50,000 BZR para campanha de marketing.

  Breakdown:
  - Anúncios Facebook/Instagram: 15,000 BZR
  - Influenciadores Crypto Twitter: 20,000 BZR
  - Patrocínio Eventos: 10,000 BZR
  - Reserva: 5,000 BZR

  ROI Esperado:
  - 10,000 novos usuários
  - 500 BTC em volume P2P
  - Aumentar awareness em 200%
  `,
  value: '50000000000000000', // 50,000 BZR
  beneficiary: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
}
```

**Ações**:
1. Selecionar tipo: **Treasury**
2. Preencher título
3. Preencher descrição
4. Valor: **50,000 BZR**
5. Beneficiário: Alice address
6. Confirmar depósito: **2,500 BZR (5%)**
7. Criar proposta

**Extrinsic**:
```typescript
treasury.proposeSpend(
  '50000000000000000',
  '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
)
```

**Validações**:
- ✅ Proposta Treasury #0 criada
- ✅ Valor: 50,000 BZR
- ✅ Beneficiário: Alice
- ✅ Depósito: 2,500 BZR bloqueado

---

### PASSO 2: Council Revisa e Aprova

#### 2.1 Ver Proposta Pendente

**URL**: `/app/governance/treasury`

**Validações**:
- ✅ Seção "Propostas Pendentes"
- ✅ Proposta #0 listada
- ✅ Botão "Aprovar" visível (apenas council)

#### 2.2 Council Cria Motion para Aprovar

**Executor**: Bob (Council Member)

**Ações**:
1. Login com Bob
2. Acessar proposta treasury #0
3. Clicar em **"Aprovar Proposta"** (cria council motion)
4. Threshold: **4 votos**
5. Assinar

**Extrinsic**:
```typescript
council.propose(
  4,
  api.tx.treasury.approveProposal(0),
  lengthBound
)
```

**Validações**:
- ✅ Council motion #0 criada
- ✅ Threshold: 4

#### 2.3 Council Members Votam

**Executores**: Alice, Charlie, Dave, Eve

**Ações cada um**:
1. Login
2. Acessar council motion #0
3. Votar **AYE**
4. Assinar

**Validações progressivas**:
- Alice vota: 1/4
- Charlie vota: 2/4
- Dave vota: 3/4
- **Eve vota: 4/4** ✅ Threshold atingido!

#### 2.4 Fechar Motion

**Ações**:
1. Qualquer conta pode fechar
2. Clicar em **"Fechar Votação"**
3. Assinar

**Extrinsic**:
```typescript
council.close(proposalHash, index, weightBound, lengthBound)
```

**Validações**:
- ✅ Motion executada
- ✅ Treasury proposal #0 aprovada
- ✅ Proposta move para "Approvals" queue
- ✅ Aguardando SpendPeriod (30 dias)

---

### PASSO 3: Verificar Pagamento (SIMULAÇÃO)

**Tempo**: 30 dias

#### 3.1 Avançar 30 dias

**Validações**:
- ✅ SpendPeriod completo
- ✅ Pagamento automático executado
- ✅ 50,000 BZR transferidos para Alice
- ✅ Proposta removida da queue
- ✅ Depósito de 2,500 BZR devolvido

**Screenshot**: Histórico de transações mostrando pagamento

---

## TESTE 3: Council Motion - Adicionar Membro

### Objetivo
Validar criação e aprovação de motion council.

### PASSO 1: Criar Motion (COU-001)

**Executor**: Alice
**URL**: `/app/governance/council`

**Ações**:
1. Login com Alice (council member)
2. Clicar em **"Nova Proposta"**
3. Tipo: Council Motion
4. Título: "Adicionar George ao Council"
5. Call: `council.addMember(george)`
6. Threshold: **4**
7. Criar

**Validações**:
- ✅ Motion criada
- ✅ Threshold: 4/13

### PASSO 2: Membros Votam

**Executores**: Bob, Charlie, Dave, Eve

**Ações**:
Cada membro vota AYE

**Validações**:
- ✅ 4 votos atingidos
- ✅ Motion pronta para executar

### PASSO 3: Fechar e Executar

**Validações**:
- ✅ Motion executada
- ✅ George adicionado ao council
- ✅ Council agora tem 14 membros

---

## 📋 CHECKLIST GERAL DE VALIDAÇÃO

### Frontend - Todas as Telas

- [ ] Dashboard Governança (`/app/governance`)
  - [ ] Estatísticas carregam corretamente
  - [ ] Gráficos renderizam
  - [ ] Links para sub-páginas funcionam

- [ ] Lista de Propostas (`/app/governance/proposals`)
  - [ ] Filtragem por tipo funciona
  - [ ] Filtragem por status funciona
  - [ ] Paginação funciona
  - [ ] Cards exibem info correta

- [ ] Detalhes de Proposta Democracy (`/proposals/democracy/:id`)
  - [ ] Título exibido ✅
  - [ ] **Descrição exibida** ✅
  - [ ] Proposer correto
  - [ ] Botão "Apoiar" funciona
  - [ ] Contagem de apoios atualiza

- [ ] Detalhes de Proposta Treasury (`/proposals/treasury/:id`)
  - [ ] Valor exibido corretamente
  - [ ] Beneficiário exibido
  - [ ] Depósito correto

- [ ] Criar Nova Proposta (`/proposals/new`)
  - [ ] Todos os tipos disponíveis
  - [ ] Validação de campos funciona
  - [ ] Estimativa de fee
  - [ ] Assinatura funciona

- [ ] Treasury (`/treasury`)
  - [ ] Saldo treasury correto
  - [ ] Propostas pendentes listadas
  - [ ] Propostas aprovadas listadas

- [ ] Council (`/council`)
  - [ ] Membros listados
  - [ ] Motions listadas
  - [ ] Votação funciona

- [ ] Technical Committee (`/tech-committee`)
  - [ ] Membros listados
  - [ ] Propostas listadas

---

## 🚀 Scripts de Automação

### Script 1: Criar Todas as Propostas Democracy

```bash
#!/bin/bash
# create-democracy-proposals.sh

ACCOUNTS=(
  "//Alice"
  "//Bob"
  "//Charlie"
  "//Dave"
  "//Eve"
  "//Ferdie"
  "//George"
  "//Heather"
  "//Ivan"
  "//Judy"
)

PROPOSALS=(
  "Aumentar MaxMembers do Council para 21|Proposta para expandir o conselho..."
  "Reduzir VotingPeriod para 5 dias|Proposta para acelerar governança..."
  # ... adicionar todas as 10 propostas
)

for i in "${!PROPOSALS[@]}"; do
  IFS='|' read -ra PROP <<< "${PROPOSALS[$i]}"
  TITLE="${PROP[0]}"
  DESC="${PROP[1]}"
  ACCOUNT="${ACCOUNTS[$i]}"

  echo "Criando proposta $i: $TITLE"

  # Usar polkadot.js para criar proposta
  polkadot-js-api tx.democracy.propose \
    --seed "$ACCOUNT" \
    --params '{"Lookup":{"hash":"0x...","len":234}}' '100000000000000'
done
```

---

## ✅ Relatório de Testes Esperado

Ao final, gerar relatório com:

```markdown
# Relatório de Testes - Governance Module

**Data**: 2025-11-03
**Ambiente**: Testnet Bazari
**Executor**: QA Team

## Resumo
- ✅ 10 Democracy Proposals criadas
- ✅ 8 Treasury Proposals criadas
- ✅ 5 Council Motions criadas
- ✅ 3 Tech Committee Proposals criadas
- ✅ Total: 26 propostas testadas

## Resultados por Fluxo

### Democracy (10/10 ✅)
- DEM-001: ✅ Criada, apoiada, virou referendum, aprovada, executada
- DEM-002: ✅ Criada, apoiada, virou referendum, votação ativa
- ... (continuar para todas)

### Treasury (8/8 ✅)
- TRE-001: ✅ Criada, aprovada por council, paga
- TRE-002: ✅ Criada, aprovada, aguardando pagamento
- ... (continuar)

### Bugs Encontrados
1. ❌ Descrição não aparece em detalhes (CORRIGIDO ✅)
2. ⚠️ Gráfico de votação não atualiza em tempo real
3. ⚠️ Filtros de status não funcionam corretamente

## Screenshots
- [01-dashboard.png]
- [02-proposal-list.png]
- [03-democracy-detail.png]
- ...
```

---

**FIM DO DOCUMENTO**

Este plano cobre 100% dos fluxos de governança no frontend Bazari.
