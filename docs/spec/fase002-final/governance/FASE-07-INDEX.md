# FASE 7: Governance (Blockchain) - Índice de Referência Rápida

**Navegação rápida** para encontrar informações específicas na documentação da FASE 7.

---

## 📚 Documentos Principais

| Documento | Descrição | Link |
|-----------|-----------|------|
| **Especificação Técnica** | Documentação completa de arquitetura, configuração e implementação | [FASE-07-GOVERNANCE-BLOCKCHAIN.md](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md) |
| **Prompts de Execução** | 10 prompts sequenciais para implementar a fase | [FASE-07-PROMPT.md](spec/FASE-07-PROMPT.md) |
| **README** | Overview e guia de início rápido | [FASE-07-README.md](FASE-07-README.md) |
| **Índice** | Este documento | FASE-07-INDEX.md |

---

## 🔍 Busca Rápida por Tópico

### Blockchain / Runtime

| Tópico | Localização |
|--------|-------------|
| Lista de pallets e propósito | [Spec § 2.1](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#21-pallets-a-serem-configurados) |
| Configuração Treasury | [Spec § 2.1.1](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#211-pallet-treasury) |
| Configuração Democracy | [Spec § 2.1.2](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#212-pallet-democracy) |
| Configuração Collective | [Spec § 2.1.3](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#213-pallet-collective-council--technical-committee) |
| Configuração Multisig | [Spec § 2.1.4](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#214-pallet-multisig) |
| Cargo.toml dependencies | [Spec § 2.3](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#23-cargotoml-updates) |
| construct_runtime! macro | [Spec § 2.4](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#24-construct_runtime-macro) |
| Testes blockchain | [Spec § 7.1](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#71-blockchain-tests) |
| Deployment blockchain | [Spec § 8.1](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#81-blockchain-deployment) |

### Backend API

| Tópico | Localização |
|--------|-------------|
| Estrutura de arquivos | [Spec § 3.1](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#31-estrutura-de-arquivos) |
| Prisma schema completo | [Spec § 3.2](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#32-prisma-schema-extensions) |
| Endpoints Democracy | [Spec § 3.3.1](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#331-democracy-proposals) |
| Endpoints Treasury | [Spec § 3.3.2](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#332-treasury) |
| Endpoints Council | [Spec § 3.3.3](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#333-council) |
| Endpoints Multisig | [Spec § 3.3.4](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#334-multisig) |
| Event listeners | [Spec § 3.4](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#34-blockchain-event-listeners) |
| Validações backend | [Spec § 6.1](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#61-backend-validations) |
| Testes backend | [Spec § 7.2](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#72-backend-integration-tests) |

### Frontend

| Tópico | Localização |
|--------|-------------|
| Estrutura de arquivos | [Spec § 4.1](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#41-estrutura-de-arquivos) |
| Rotas | [Spec § 4.2](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#42-rotas) |
| Páginas principais | [Spec § 4.3](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#43-páginas-principais) |
| Componentes reutilizáveis | [Spec § 4.4](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#44-componentes-reutilizáveis) |
| API client | [Spec § 4.5](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#45-api-client-governanceapits) |
| Validações frontend | [Spec § 6.2](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#62-frontend-validations) |
| Testes frontend | [Spec § 7.3](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#73-frontend-component-tests) |

### Fluxos de Usuário

| Fluxo | Localização |
|-------|-------------|
| Criar e votar em Democracy Proposal | [Spec § 5.1](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#51-criar-e-votar-em-democracy-proposal) |
| Criar Treasury Proposal | [Spec § 5.2](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#52-criar-treasury-proposal) |
| Multisig Operation | [Spec § 5.3](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#53-multisig-operation) |

### Segurança & Documentação

| Tópico | Localização |
|--------|-------------|
| Segurança e validações | [Spec § 6](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#6-segurança-e-validações) |
| Permissões | [Spec § 6.3](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#63-permissões) |
| Testes | [Spec § 7](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#7-testes) |
| Deployment | [Spec § 8](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#8-deployment) |
| Documentação | [Spec § 9](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#9-documentação) |
| Riscos e mitigações | [Spec § 10](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#10-riscos-e-mitigações) |

---

## 🎯 Busca por Prompt de Execução

| Prompt | Título | Duração | Link |
|--------|--------|---------|------|
| 1 | Runtime Dependencies & Basic Configuration | 12h | [Prompt 1](spec/FASE-07-PROMPT.md#prompt-1-12h-runtime-dependencies--basic-configuration) |
| 2 | Configure Scheduler & Preimage Pallets | 16h | [Prompt 2](spec/FASE-07-PROMPT.md#prompt-2-16h-configure-scheduler--preimage-pallets) |
| 3 | Configure Treasury Pallet | 20h | [Prompt 3](spec/FASE-07-PROMPT.md#prompt-3-20h-configure-treasury-pallet) |
| 4 | Configure Multisig Pallet | 18h | [Prompt 4](spec/FASE-07-PROMPT.md#prompt-4-18h-configure-multisig-pallet) |
| 5 | Configure Collective Pallets | 24h | [Prompt 5](spec/FASE-07-PROMPT.md#prompt-5-24h-configure-collective-pallets-council--technical) |
| 6 | Configure Democracy Pallet | 28h | [Prompt 6](spec/FASE-07-PROMPT.md#prompt-6-28h-configure-democracy-pallet) |
| 7 | Build & Deploy Testnet | 8h | [Prompt 7](spec/FASE-07-PROMPT.md#prompt-7-8h-build--deploy-testnet) |
| 8 | Backend API Implementation | 48h | [Prompt 8](spec/FASE-07-PROMPT.md#prompt-8-48h-backend-api-implementation) |
| 9 | Frontend Pages Implementation | 32h | [Prompt 9](spec/FASE-07-PROMPT.md#prompt-9-32h-frontend-pages-implementation) |
| 10 | Translations & Documentation | 8h | [Prompt 10](spec/FASE-07-PROMPT.md#prompt-10-8h-translations--documentation) |

---

## 📊 Parâmetros-chave de Configuração

### Treasury
```rust
ProposalBond: 5%
ProposalBondMinimum: 100 BZR
ProposalBondMaximum: 500 BZR
SpendPeriod: 7 dias
Burn: 1%
MaxApprovals: 100
```

### Democracy
```rust
LaunchPeriod: 7 dias
VotingPeriod: 7 dias
FastTrackVotingPeriod: 1 dia
MinimumDeposit: 100 ZARI
EnactmentPeriod: 2 dias
CooloffPeriod: 7 dias
MaxVotes: 100
MaxProposals: 100
```

### Council
```rust
CouncilMotionDuration: 7 dias
CouncilMaxProposals: 100
CouncilMaxMembers: 13
```

### Technical Committee
```rust
TechnicalMotionDuration: 3 dias
TechnicalMaxProposals: 100
TechnicalMaxMembers: 7
```

### Multisig
```rust
DepositBase: 1 BZR
DepositFactor: 0.1 BZR por signatário
MaxSignatories: 20
```

---

## 🔗 APIs REST

### Democracy
```
POST   /governance/proposals/democracy
GET    /governance/proposals
GET    /governance/proposals/:id
POST   /governance/proposals/:id/second
POST   /governance/proposals/:id/vote
```

### Treasury
```
POST   /governance/treasury/proposals
GET    /governance/treasury/balance
POST   /governance/treasury/proposals/:id/approve
POST   /governance/treasury/proposals/:id/reject
```

### Council
```
GET    /governance/council/members
POST   /governance/council/motions
POST   /governance/council/motions/:hash/vote
```

### Multisig
```
POST   /governance/multisig/create
POST   /governance/multisig/:address/transactions
POST   /governance/multisig/:address/approve
GET    /governance/multisig/:address/pending
```

---

## 🗂️ Modelos de Dados (Prisma)

| Model | Propósito | Localização |
|-------|-----------|-------------|
| GovernanceProposal | Armazena proposals (democracy, treasury, council, technical) | [Spec § 3.2](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#32-prisma-schema-extensions) |
| GovernanceVote | Registra votos (aye/nay + conviction) | [Spec § 3.2](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#32-prisma-schema-extensions) |
| CouncilMember | Membros do Council e Technical Committee | [Spec § 3.2](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#32-prisma-schema-extensions) |
| MultisigAccount | Contas multisig | [Spec § 3.2](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#32-prisma-schema-extensions) |
| MultisigTransaction | Transações pendentes multisig | [Spec § 3.2](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#32-prisma-schema-extensions) |

---

## 🎨 Componentes Frontend

| Componente | Propósito | Localização |
|------------|-----------|-------------|
| GovernancePage | Dashboard geral | [Spec § 4.3](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#43-páginas-principais) |
| ProposalsListPage | Lista filtrada de proposals | [Spec § 4.3](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#43-páginas-principais) |
| ProposalDetailPage | Detalhes + votação | [Spec § 4.3](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#43-páginas-principais) |
| TreasuryPage | Treasury dashboard | [Spec § 4.3](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#43-páginas-principais) |
| CouncilPage | Council + Technical | [Spec § 4.3](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#43-páginas-principais) |
| MultisigPage | Gerenciar multisigs | [Spec § 4.3](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#43-páginas-principais) |
| CreateProposalPage | Criar proposta | [Spec § 4.3](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#43-páginas-principais) |
| VoteModal | Modal de votação | [Spec § 4.4](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#44-componentes-reutilizáveis) |
| ConvictionSelector | Selector conviction 0-6x | [Spec § 4.4](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#44-componentes-reutilizáveis) |
| ProposalCard | Card para lista | [Spec § 4.4](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#44-componentes-reutilizáveis) |
| MultisigApprovalFlow | Fluxo de aprovação multisig | [Spec § 4.4](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#44-componentes-reutilizáveis) |

---

## ⚙️ Comandos Úteis

### Build & Test
```bash
# Build runtime
cd /root/bazari/bazari-chain
cargo build --release

# Test pallets
cargo test -p pallet-treasury
cargo test -p pallet-democracy
cargo test -p pallet-collective
cargo test -p pallet-multisig

# Generate chain spec
./target/release/solochain-template-node build-spec --chain local > chain-spec.json

# Start node
./target/release/solochain-template-node --chain chain-spec-raw.json
```

### Database
```bash
cd /root/bazari/apps/api

# Generate migration
pnpm prisma migrate dev --name add_governance_models

# Apply migration
pnpm prisma migrate deploy

# Generate client
pnpm prisma generate
```

### API Tests
```bash
# E2E tests
cd /root/bazari/apps/api
pnpm test:e2e governance

# Unit tests
pnpm test governance.service
```

### Frontend
```bash
cd /root/bazari/apps/web

# Run dev
pnpm dev

# Tests
pnpm test governance

# Build
pnpm build
```

---

## 📋 Checklists de Validação

### Blockchain (Após PROMPT 7)
- [ ] Runtime compila sem erros
- [ ] Todos os 6 pallets testados
- [ ] Testnet rodando sem crashes
- [ ] Polkadot.js mostra todos os pallets
- [ ] Genesis config correto (council members)
- [ ] Smoke tests passam

### Backend (Após PROMPT 8)
- [ ] Migrations aplicadas
- [ ] 12 endpoints funcionando
- [ ] Event listeners sincronizando
- [ ] E2E tests passando
- [ ] Swagger docs gerados

### Frontend (Após PROMPT 9)
- [ ] 7 páginas renderizam
- [ ] 6 componentes funcionais
- [ ] API client com 12 métodos
- [ ] PIN integration funciona
- [ ] UI responsiva

### Docs (Após PROMPT 10)
- [ ] Traduções completas (pt, en, es)
- [ ] User guide testado
- [ ] Developer guide com exemplos
- [ ] README com overview

---

## 🆘 Troubleshooting Rápido

| Problema | Possível Causa | Solução | Referência |
|----------|----------------|---------|------------|
| Runtime não compila | Versão incorreta dos pallets | Verificar branch polkadot-v1.0.0 | [Spec § 2.3](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#23-cargotoml-updates) |
| Council approval não funciona | Origin incorreto | Verificar EnsureProportionAtLeast | [Spec § 2.1.3](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#213-pallet-collective-council--technical-committee) |
| Vote não registra | Conviction inválido | Usar 0-6 apenas | [Spec § 2.1.2](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#212-pallet-democracy) |
| Multisig não executa | Threshold não atingido | Verificar approvals count | [Spec § 5.3](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#53-multisig-operation) |
| Event listener não sincroniza | Websocket desconectado | Reconectar ao node | [Spec § 3.4](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#34-blockchain-event-listeners) |
| Treasury proposal rejeitado | Bond insuficiente | Mínimo 100 BZR | [Spec § 2.1.1](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#211-pallet-treasury) |

---

## 📞 Suporte

### Issues Conhecidos
Consultar: [Spec § 10 - Riscos](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md#10-riscos-e-mitigações)

### Recursos Externos
- [Substrate Docs](https://docs.substrate.io/)
- [Polkadot Wiki - Governance](https://wiki.polkadot.network/docs/learn-governance)
- [Polkadot.js Apps](https://polkadot.js.org/apps/)

---

**Última atualização**: 2025-01-28
**Versão da spec**: 1.0
