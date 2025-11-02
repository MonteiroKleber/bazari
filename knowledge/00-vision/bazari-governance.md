# Bazari Platform - Governance Model

## 🏛️ DAO Structure

Bazari é governada por uma **DAO (Decentralized Autonomous Organization)** que permite à comunidade decidir sobre:

- Parâmetros econômicos (taxas, comissões)
- Novos recursos e funcionalidades
- Alocação de tesouraria
- Atualizações de smart contracts
- Políticas de moderação

---

## 🗳️ Voting System

### Conviction Voting

Bazari usa **Conviction Voting**, onde o peso do voto aumenta com o tempo de lock dos tokens:

| Lock Period | Conviction Multiplier |
|-------------|----------------------|
| None | 0.1x |
| 1 week | 1x |
| 2 weeks | 2x |
| 1 month | 3x |
| 2 months | 4x |
| 4 months | 5x |
| 6 months | 6x |

**Fórmula**: `Vote Weight = Token Amount × Conviction Multiplier`

### Vote Types

1. **Democracy Proposals** - Propostas abertas da comunidade
2. **Council Motions** - Propostas do conselho eleito
3. **Treasury Proposals** - Solicitações de fundos da tesouraria
4. **Technical Committee** - Upgrades críticos de emergência

---

## 👥 Governance Bodies

### 1. Token Holders (Todos)

**Poder:**
- Votar em propostas públicas
- Eleger membros do conselho
- Propor referendos

**Requisitos:**
- Possuir tokens BZR
- Lock tokens para aumentar poder de voto

---

### 2. Council (13 membros eleitos)

**Papel:**
- Aprovar propostas sensíveis
- Cancelar propostas maliciosas
- Nomear technical committee
- Alocar tesouraria

**Eleição:**
- A cada 3 meses
- Votação por approval voting
- Top 13 mais votados são eleitos

**Requisitos para Candidatura:**
- 1000 BZR em depósito
- Perfil verificado
- Reputação mínima: Silver Tier

---

### 3. Technical Committee (5 membros)

**Papel:**
- Fast-track de upgrades críticos
- Emergency stop de pallets com bugs
- Código reviews de smart contracts

**Seleção:**
- Nomeados pelo Council
- Aprovados por maioria simples
- Mandato de 6 meses

**Requisitos:**
- Desenvolvedores core do projeto
- Histórico de contribuições
- Expertise em Substrate/Rust

---

## 📜 Proposal Lifecycle

### 1. Ideation (Off-chain)

- Discussão no forum (Discourse/Polkassembly)
- Feedback da comunidade
- Refinamento da proposta

### 2. Submission (On-chain)

```
Proposer → Submit Proposal
         → Lock Deposit (100 BZR)
         → Enter Public Queue
```

### 3. Voting Period (7 days)

```
Token Holders → Vote (Aye/Nay)
              → Lock Tokens (optional, for conviction)
```

### 4. Execution

- **Aprovado**: Executado automaticamente após delay de 1 dia
- **Rejeitado**: Deposit do proposer é slashed (50%)

---

## 💰 Treasury Management

### Funding Sources

1. **Transaction Fees** - 0.1% de todas as transações
2. **Slashed Deposits** - De propostas rejeitadas
3. **P2P Fees** - 0.5% do volume P2P
4. **Marketplace Fees** - 2% do GMV

### Treasury Allocation (Budget Anual)

| Categoria | % do Budget |
|-----------|-------------|
| Development Grants | 40% |
| Marketing | 25% |
| Community Incentives | 20% |
| Operations | 10% |
| Reserve | 5% |

### Treasury Proposals

**Tipos:**
- **Bounties** - Recompensas por tarefas específicas
- **Grants** - Financiamento de projetos
- **Tips** - Recompensas ad-hoc para contribuições

**Processo:**
1. Submeter proposta com detalhamento
2. Council review (3 dias)
3. Votação pública (se council aprovar)
4. Execução (se aprovado)

---

## 🛡️ Security & Emergency Procedures

### Emergency Pause

**Trigger:**
- Bug crítico descoberto
- Exploit em andamento
- Consenso comprometido

**Processo:**
1. Technical Committee identifica ameaça
2. Votação emergency (2h)
3. Pause de pallets afetados
4. Fix e teste
5. Resume após audit

### Upgrade Process

**Non-Critical Upgrades:**
1. Proposta normal
2. Votação (7 dias)
3. Delay de execução (1 dia)

**Critical Upgrades:**
1. Technical Committee fast-track
2. Votação acelerada (24h)
3. Execução imediata

---

## 📊 Governance Metrics

### Participation Targets

| Metric | Target |
|--------|--------|
| Voter Turnout | >30% of circulating supply |
| Council Election Turnout | >50% of token holders |
| Treasury Utilization | >80% annually |
| Proposal Approval Rate | ~60% |

### Health Indicators

- ✅ **Green**: Turnout >30%, diverse voting patterns
- ⚠️ **Yellow**: Turnout 15-30%, some whales dominating
- 🔴 **Red**: Turnout <15%, governance centralized

---

## 🔄 Progressive Decentralization

### Phase 1: Foundation-Led (Q1-Q2 2025)

- Core team tem multisig com poder de veto
- Governança básica funcional
- Community feedback incorporado

### Phase 2: Hybrid (Q3-Q4 2025)

- Council eleito e funcional
- Treasury gerenciada pela comunidade
- Core team ainda mantém technical committee

### Phase 3: Full DAO (2026+)

- Remoção de multisig foundation
- Governança 100% on-chain
- Community takeover completo

---

## 🎯 Decision Matrix

| Tipo de Decisão | Aprovação Necessária | Quorum | Exemplo |
|------------------|---------------------|--------|---------|
| **Parâmetros Econômicos** | 60% Aye | 30% | Ajustar taxa de marketplace |
| **Novos Recursos** | 50% Aye | 20% | Adicionar multi-currency |
| **Treasury Spend** | Council + 40% Aye | 15% | Aprovar grant de $10k |
| **Emergency Actions** | Tech Committee (3/5) | N/A | Pause de pallet com bug |
| **Protocol Upgrades** | 70% Aye | 40% | Migrar para Substrate v2 |

---

## 📚 Governance Best Practices

### For Proposers

1. **Pesquise antes** - Veja propostas similares anteriores
2. **Discuta off-chain** - Use forum para feedback
3. **Seja específico** - Detalhes técnicos e financeiros claros
4. **Timeline realista** - Milestones mensuráveis
5. **Peça o necessário** - Não inflacione orçamento

### For Voters

1. **Leia a proposta** - Não vote apenas pelo título
2. **Participe do debate** - Comente no forum
3. **Vote com convicção** - Lock tokens para mais poder
4. **Seja consistente** - Não mude voto sem razão
5. **Delegue se necessário** - Se não tem tempo, delegue voto

### For Council Members

1. **Transparência** - Publique razões de voto
2. **Responsividade** - Responda à comunidade
3. **Proatividade** - Proponha melhorias
4. **Fiscalização** - Audite uso de treasury
5. **Neutralidade** - Evite conflitos de interesse

---

## 🔮 Future Governance Features

### Quadratic Voting

Reduzir influência de whales:
```
Vote Weight = √(Token Amount × Conviction)
```

### Liquid Democracy

Delegação transitiva de votos:
```
Alice → Delega para Bob → Bob delega para Carol
Carol vota e representa Alice, Bob e ela mesma
```

### Futarchy

Previsão de mercado para decisões:
```
Criar mercado de previsão: "Se implementarmos X, GMV aumentará em Y%"
Decidir baseado em odds do mercado
```

---

**Document Owner:** Bazari Governance Working Group
**Last Updated:** 2025-11-02
**Version:** 1.0.0
