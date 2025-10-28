# FASE 7: Governance (Blockchain)

**Status**: 📋 Especificado (Aguardando execução)
**Duração**: 3 semanas (214 horas)
**Risco**: 🔴 Alto
**Prioridade**: P2 (Após FASE 5 e 6)

---

## 📋 Visão Geral

Implementação completa de sistema de governança on-chain para a rede Bazari, permitindo que holders de ZARI participem de decisões através de:

- **Treasury**: Gestão de fundos coletivos
- **Democracy**: Propostas e referendos com conviction voting
- **Council**: Aprovação de proposals críticas
- **Technical Committee**: Fast-track para upgrades urgentes
- **Multisig**: Segurança para operações sensíveis

---

## 🎯 Objetivos

### Blockchain
- [x] Configurar 6 pallets Substrate (treasury, democracy, collective x2, multisig, scheduler, preimage)
- [x] Genesis config com council members iniciais
- [x] Runtime compilando e testado

### Backend
- [x] 12 endpoints REST para governança
- [x] Event listeners sincronizando blockchain state
- [x] Prisma models para proposals, votes, council, multisig

### Frontend
- [x] 7 páginas principais
- [x] 6 componentes reutilizáveis
- [x] Integração com PIN para assinaturas

---

## 📁 Estrutura de Documentação

```
docs/fase002-final/governance/
├── spec/
│   ├── FASE-07-GOVERNANCE-BLOCKCHAIN.md    (Especificação técnica completa)
│   └── FASE-07-PROMPT.md                   (10 prompts de execução)
├── FASE-07-README.md                        (Este arquivo)
└── FASE-07-INDEX.md                         (Índice navegável)
```

---

## 🔗 Links Importantes

### Documentação Técnica
- [Especificação Completa](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md)
- [Prompts de Execução](spec/FASE-07-PROMPT.md)
- [Índice de Referência](FASE-07-INDEX.md)

### Documentação de Usuário
- [User Guide](../../governance-user-guide.md) (A ser criado no PROMPT 10)
- [Developer Guide](../../governance-dev-guide.md) (A ser criado no PROMPT 10)

### Referências Externas
- [Substrate Treasury Pallet](https://docs.substrate.io/reference/frame-pallets/pallet-treasury/)
- [Substrate Democracy Pallet](https://docs.substrate.io/reference/frame-pallets/pallet-democracy/)
- [Substrate Collective Pallet](https://docs.substrate.io/reference/frame-pallets/pallet-collective/)
- [Polkadot Governance](https://wiki.polkadot.network/docs/learn-governance)

---

## 🛠️ Componentes Principais

### 1. Blockchain Runtime

**Pallets**:
- `pallet-treasury`: Gestão de fundos (5% bond, 7 dias spend period)
- `pallet-democracy`: Propostas e referendos (7 dias voting, conviction 0-6x)
- `pallet-collective::Instance1`: Council (13 membros, 7 dias motion)
- `pallet-collective::Instance2`: Technical Committee (7 membros, 3 dias motion)
- `pallet-multisig`: Contas multisig (até 20 signatários)
- `pallet-scheduler`: Execução agendada de calls
- `pallet-preimage`: Armazenamento de proposal calls

**Parâmetros-chave**:
```rust
ProposalBond: 5%
MinimumDeposit: 100 ZARI
VotingPeriod: 7 dias
EnactmentPeriod: 2 dias
CouncilMembers: 13 max
TechnicalMembers: 7 max
```

### 2. Backend API

**Endpoints** (12 total):
```
POST   /governance/proposals/democracy
GET    /governance/proposals
GET    /governance/proposals/:id
POST   /governance/proposals/:id/second
POST   /governance/proposals/:id/vote
POST   /governance/treasury/proposals
GET    /governance/treasury/balance
POST   /governance/treasury/proposals/:id/approve
POST   /governance/treasury/proposals/:id/reject
GET    /governance/council/members
POST   /governance/council/motions
POST   /governance/council/motions/:hash/vote
POST   /governance/multisig/create
POST   /governance/multisig/:address/transactions
POST   /governance/multisig/:address/approve
GET    /governance/multisig/:address/pending
```

**Event Listeners**:
- Democracy events (Proposed, Started, Passed, Executed)
- Treasury events (Proposed, Awarded, Rejected)
- Council events (Proposed, Voted, Executed)
- Multisig events (MultisigExecuted, MultisigApproval)

### 3. Frontend

**Páginas**:
1. `GovernancePage` - Dashboard geral
2. `ProposalsListPage` - Lista filtrada de proposals
3. `ProposalDetailPage` - Detalhes + votação
4. `TreasuryPage` - Treasury dashboard
5. `CouncilPage` - Council + Technical Committee
6. `MultisigPage` - Gerenciar contas multisig
7. `CreateProposalPage` - Criar nova proposta

**Componentes**:
- `ProposalCard` - Card para lista
- `VoteModal` - Modal de votação
- `ConvictionSelector` - Selector 0-6x
- `CouncilMemberCard` - Card de membro
- `MultisigApprovalFlow` - Fluxo de aprovação
- `TreasuryStats` - Estatísticas do tesouro

---

## 🚀 Como Executar

### 1. Executar Prompts Sequencialmente

```bash
# Seguir ordem dos prompts:
# PROMPT 1: Runtime Dependencies (12h)
# PROMPT 2: Scheduler & Preimage (16h)
# PROMPT 3: Treasury (20h)
# PROMPT 4: Multisig (18h)
# PROMPT 5: Collective (24h)
# PROMPT 6: Democracy (28h)
# PROMPT 7: Build & Deploy (8h)
# PROMPT 8: Backend API (48h)
# PROMPT 9: Frontend (32h)
# PROMPT 10: Translations (8h)
```

### 2. Validação após cada Prompt

Cada prompt tem seção "Validação" com checklist. Pausar e validar antes de continuar.

**Checkpoint crítico**: Após PROMPT 7 - testnet deve estar funcionando perfeitamente antes de começar backend.

### 3. Deploy Final

Após PROMPT 10 completo:
```bash
# 1. Build release
cd /root/bazari/bazari-chain
cargo build --release

# 2. Generate final chain spec
./target/release/solochain-template-node build-spec --chain local > chain-spec-final.json

# 3. Start production node
./target/release/solochain-template-node \
  --chain chain-spec-final-raw.json \
  --name "Bazari Mainnet" \
  --rpc-cors all
```

---

## 🧪 Testes

### Blockchain Tests
```bash
cd /root/bazari/bazari-chain
cargo test --release
cargo test -p pallet-treasury
cargo test -p pallet-democracy
cargo test -p pallet-collective
cargo test -p pallet-multisig
```

### Backend Tests
```bash
cd /root/bazari/apps/api
pnpm test:e2e governance
```

### Frontend Tests
```bash
cd /root/bazari/apps/web
pnpm test governance
```

---

## 🔒 Segurança

### Validações Backend
- Verificar saldo ZARI antes de criar proposta
- Rate limit: 1 proposta/24h por usuário
- Validar preimage exists on-chain
- Permissões: Council-only para approve/reject treasury
- Multisig: verificar signatário antes de approve

### Validações Frontend
- Validar endereços Substrate
- Verificar treasury balance antes de solicitar fundos
- Mostrar custos (bond, fees) antes de confirmar
- Conviction lock period warnings

### Permissões
- Treasury approve: Requer 3/5 do Council
- Democracy cancel: Requer 2/3 do Council
- Fast-track: Requer 2/3 do Technical Committee
- Multisig: Threshold configurável (ex: 2-of-3)

---

## ⚠️ Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Runtime panic | Testes extensivos em testnet por 2 semanas |
| Governance deadlock | Fallback via root, Council ativo |
| Spam de proposals | Rate limits + depósitos altos (100 ZARI) |
| Multisig key loss | Documentação + backup procedures |
| Democracy capture | Conviction voting + turnout minimums |
| Treasury drain | Council approval obrigatório |

---

## 📊 Métricas de Sucesso

- [ ] Runtime compila sem erros
- [ ] 6 pallets testados (unit tests passing)
- [ ] Testnet rodando por 2+ semanas sem crashes
- [ ] 12 endpoints backend funcionando
- [ ] 7 páginas frontend operacionais
- [ ] E2E tests passando (democracy, treasury, multisig)
- [ ] Documentação completa (user + dev)
- [ ] 0 bugs críticos conhecidos

---

## 📅 Cronograma

### Semana 1: Blockchain (56h)
- Dia 1-2: Dependencies & Scheduler/Preimage
- Dia 3-4: Treasury & Multisig
- Dia 5-7: Collective & Democracy

### Semana 2: Backend (56h)
- Dia 8-9: Prisma models & migrations
- Dia 10-12: Services & controllers
- Dia 13-14: Event listeners & E2E tests

### Semana 3: Frontend & Docs (48h)
- Dia 15-17: Pages & components
- Dia 18-19: API integration & testing
- Dia 20-21: Translations & documentation

**Total**: 214 horas (~27 dias úteis)

---

## 🤝 Contribuindo

### Para implementar esta fase:

1. **Ler documentação completa**: [FASE-07-GOVERNANCE-BLOCKCHAIN.md](spec/FASE-07-GOVERNANCE-BLOCKCHAIN.md)
2. **Seguir prompts em ordem**: [FASE-07-PROMPT.md](spec/FASE-07-PROMPT.md)
3. **Validar após cada prompt**: Checklist de validação em cada prompt
4. **Pausar no checkpoint**: Após PROMPT 7, validar testnet antes de backend
5. **Reportar issues**: Documentar qualquer desvio da spec

---

## 📝 Notas Importantes

### Dependencies
- Substrate pallets version: polkadot-v1.0.0
- Prisma schema: +6 novos models
- Frontend: shadcn/ui + i18next

### Breaking Changes
- Requer runtime upgrade (incompatível com versão anterior)
- Requer migration do banco de dados
- Council members precisam ser definidos no genesis

### Post-Deployment
- Monitorar eventos de governança
- Documentar primeiras proposals
- Treinar Council members
- Criar primeiros multisigs (ex: treasury multisig)

---

## 🔗 Próximos Passos

Após completar FASE 7:
1. Deploy mainnet com governança ativa
2. Eleger Council inicial via community vote
3. Criar primeiras treasury proposals
4. Documentar casos de uso reais
5. Considerar FASE 8: Advanced Governance (se necessário)

---

**Status**: ⏸️ Aguardando execução (após FASE 6)
**Última atualização**: 2025-01-28
