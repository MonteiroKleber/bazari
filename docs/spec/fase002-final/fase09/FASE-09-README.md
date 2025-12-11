# FASE 9: Vesting (Blockchain)

**Status**: 📝 Planejamento Completo
**Data**: 30 de Outubro de 2025
**Duração Estimada**: 1 semana (5 dias úteis)
**Risco**: Alto
**Progresso**: 0% (0/5 prompts executados)

---

## 🎯 Objetivo

Implementar sistema de vesting (liberação programada de tokens) na blockchain Bazari, permitindo:
- ✅ Schedules de vesting para fundadores, equipe e parceiros
- ✅ Multiple vesting schedules por conta
- ✅ Vesting linear ao longo do tempo
- ✅ Cliff periods (período inicial sem liberação)
- ✅ Unlock parcial de fundos vestidos
- ✅ Merge de schedules de vesting
- ✅ Interface frontend para visualização e gerenciamento

---

## 📦 O Que Será Implementado

### 1. Pallet Vesting (Blockchain) ⚡
- ✅ **Integração do pallet-vesting**: Substrate official pallet
- ✅ **Configuração no runtime**: Adicionar ao runtime do Bazari
- ✅ **Vesting schedules**: Estruturas de dados para schedules
- ✅ **Extrinsics**:
  - `vest()` - Liberar tokens vestidos
  - `vest_other()` - Liberar tokens de outra conta
  - `vested_transfer()` - Transferir com vesting
  - `force_vested_transfer()` - Transferir com vesting (sudo)
  - `merge_schedules()` - Mesclar múltiplos schedules
- ✅ **Storage**:
  - `Vesting` - Mapa de schedules por conta
- ✅ **Events**:
  - `VestingUpdated` - Schedule atualizado
  - `VestingCompleted` - Vesting finalizado

### 2. Genesis Configuration
- ✅ **Initial vesting schedules**: Configurar schedules iniciais
- ✅ **Founders allocation**: Schedules para fundadores
- ✅ **Team allocation**: Schedules para equipe
- ✅ **Partners allocation**: Schedules para parceiros
- ✅ **Chain spec updates**: Atualizar chain spec com vesting

### 3. Frontend UI (Vesting Dashboard) 🎨
- ✅ **VestingDashboard**: Dashboard principal de vesting
- ✅ **VestingScheduleCard**: Card de cada schedule
- ✅ **VestingProgressChart**: Gráfico de progresso
- ✅ **VestingTimeline**: Timeline de unlocks
- ✅ **VestButton**: Botão para liberar tokens
- ✅ **VestedTransferForm**: Formulário de transferência com vesting

### 4. Backend API
- ✅ **Endpoints REST**:
  - `GET /vesting/:address` - Obter schedules de uma conta
  - `GET /vesting/:address/summary` - Resumo de vesting
  - `POST /vesting/vest` - Liberar tokens vestidos
  - `POST /vesting/transfer` - Transferir com vesting
- ✅ **Integration com blockchain**: Query e submit de extrinsics
- ✅ **Caching**: Cache de schedules para performance

### 5. Testes e Documentação
- ✅ **Unit tests**: Testes unitários do pallet
- ✅ **Integration tests**: Testes de integração
- ✅ **E2E tests**: Testes end-to-end do frontend
- ✅ **Documentation**: Documentação completa do sistema

---

## 🏗️ Arquitetura

```
FASE 9: VESTING SYSTEM
│
├── Blockchain (bazari-chain)
│   ├── pallet-vesting            # Substrate official pallet
│   │   ├── Storage
│   │   │   └── Vesting           # Map<AccountId, Vec<VestingInfo>>
│   │   ├── Extrinsics
│   │   │   ├── vest()            # Liberar tokens
│   │   │   ├── vest_other()      # Liberar para outra conta
│   │   │   ├── vested_transfer() # Transferir com vesting
│   │   │   ├── force_vested_transfer() # Sudo transfer
│   │   │   └── merge_schedules() # Mesclar schedules
│   │   └── Events
│   │       ├── VestingUpdated
│   │       └── VestingCompleted
│   │
│   ├── Runtime Configuration
│   │   ├── Add pallet-vesting    # Adicionar ao Cargo.toml
│   │   ├── Configure parameters  # MaxVestingSchedules, etc.
│   │   └── Genesis config        # Initial schedules
│   │
│   └── Chain Spec
│       └── vesting: [...]        # Initial vesting schedules
│
├── Backend (apps/api)
│   ├── routes/vesting.ts         # REST API endpoints
│   ├── services/vesting.ts       # Business logic
│   └── integration/
│       └── blockchain-vesting.ts # Polkadot.js integration
│
├── Frontend (apps/web)
│   ├── modules/vesting/
│   │   ├── pages/
│   │   │   ├── VestingDashboardPage.tsx
│   │   │   └── VestingDetailPage.tsx
│   │   ├── components/
│   │   │   ├── VestingScheduleCard.tsx
│   │   │   ├── VestingProgressChart.tsx
│   │   │   ├── VestingTimeline.tsx
│   │   │   ├── VestButton.tsx
│   │   │   └── VestedTransferForm.tsx
│   │   ├── hooks/
│   │   │   ├── useVestingSchedules.ts
│   │   │   ├── useVest.ts
│   │   │   └── useVestedTransfer.ts
│   │   ├── api/
│   │   │   └── index.ts          # API client
│   │   └── types/
│   │       └── index.ts          # TypeScript types
│   │
│   └── integration/
│       └── Quick action no dashboard
│
└── Documentation
    ├── FASE-09-VESTING-SPEC.md   # Spec técnica
    ├── FASE-09-PROMPT.md         # Prompts de execução
    └── README.md                 # Este arquivo
```

---

## 📊 Vesting Schedule Structure

```typescript
interface VestingInfo {
  // Quanto está bloqueado no início
  locked: Balance;

  // Quanto é liberado por bloco
  perBlock: Balance;

  // Bloco em que o vesting começa
  startingBlock: BlockNumber;

  // Cliff period (opcional)
  // Se cliff = 100 blocos, nada é liberado nos primeiros 100 blocos
  cliff?: BlockNumber;
}
```

### Exemplo de Schedule

```rust
// Fundador com 1,000,000 BZR vestidos ao longo de 4 anos (cliff de 1 ano)
VestingInfo {
    locked: 1_000_000 * UNIT,           // 1M BZR
    per_block: 1_000_000 * UNIT / (4 * YEARS), // Libera ao longo de 4 anos
    starting_block: 0,                  // Começa no bloco 0
    cliff: YEARS,                       // 1 ano de cliff
}

// YEARS = 365 * DAYS = 365 * 24 * HOURS = 365 * 24 * 60 * MINUTES
```

---

## 🔢 Token Economics

### Total Supply
```
Total BZR Supply:     1,000,000,000 (1 bilhão)
├─ Public Sale:       400,000,000 (40%) - Sem vesting
├─ Liquidity:         200,000,000 (20%) - Sem vesting
├─ Founders:          150,000,000 (15%) - 4 anos vesting (1 ano cliff)
├─ Team:              100,000,000 (10%) - 3 anos vesting (6 meses cliff)
├─ Partners:           80,000,000 (8%)  - 2 anos vesting (3 meses cliff)
├─ Marketing:          50,000,000 (5%)  - 1 ano vesting (sem cliff)
└─ Reserve:            20,000,000 (2%)  - Sem vesting
```

### Vesting Schedules

| Categoria | Quantidade | Duração | Cliff | Per Block |
|-----------|------------|---------|-------|-----------|
| Founders  | 150M BZR   | 4 anos  | 1 ano | ~948 BZR/bloco |
| Team      | 100M BZR   | 3 anos  | 6 meses | ~1,053 BZR/bloco |
| Partners  | 80M BZR    | 2 anos  | 3 meses | ~1,267 BZR/bloco |
| Marketing | 50M BZR    | 1 ano   | 0     | ~1,585 BZR/bloco |

**Nota**: 1 bloco = 6 segundos
- 1 minuto = 10 blocos
- 1 hora = 600 blocos
- 1 dia = 14,400 blocos
- 1 ano = ~5,256,000 blocos

---

## 🎨 UI/UX Design

### 1. Vesting Dashboard
```
┌────────────────────────────────────────┐
│ 💰 Vesting Dashboard                   │
├────────────────────────────────────────┤
│                                        │
│ ┌──────────────────────────────────┐  │
│ │ Total Vested: 1,000,000 BZR      │  │
│ │ Available Now: 250,000 BZR       │  │
│ │ Still Locked: 750,000 BZR        │  │
│ │                                  │  │
│ │ [Vest Available Tokens]  ━━━━━━━│  │
│ └──────────────────────────────────┘  │
│                                        │
│ Active Schedules (3)                   │
│ ┌────────────────────────────────────┐ │
│ │ 👤 Founder Schedule                │ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━ 25%   │ │
│ │ 250k / 1M BZR                      │ │
│ │ 750k remaining • 3 years left      │ │
│ │ [View Details] [Vest Now]         │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ 🤝 Partner Schedule                │ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━ 50%   │ │
│ │ ...                                │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

### 2. Vesting Timeline
```
Timeline de Unlock
│
├─ Jan 2025  ░░░░░░░░░░  Cliff (nada liberado)
├─ Jan 2026  ■■■■■■░░░░  25% desbloqueado
├─ Jan 2027  ■■■■■■■■░░  50% desbloqueado
├─ Jan 2028  ■■■■■■■■■■  75% desbloqueado
└─ Jan 2029  ■■■■■■■■■■  100% desbloqueado
```

### 3. Temas
O frontend **DEVE** seguir os 6 temas já implementados:
- ✅ `bazari` (padrão)
- ✅ `night` (escuro)
- ✅ `sandstone` (bege/terra)
- ✅ `emerald` (verde)
- ✅ `royal` (roxo/dourado)
- ✅ `cyber` (neon/tech)

---

## 🔄 Fluxo de Uso

### 1. Visualizar Schedules
```
User → Frontend → Backend API → Blockchain (query)
                      ↓
                  Retorna schedules
                      ↓
               Renderiza dashboard
```

### 2. Liberar Tokens (Vest)
```
User clica "Vest Now"
    ↓
Frontend valida saldo disponível
    ↓
Mostra PIN modal
    ↓
User insere PIN
    ↓
Frontend → Blockchain: vest() extrinsic
    ↓
Blockchain processa e emite VestingUpdated event
    ↓
Frontend atualiza UI com novo saldo
```

### 3. Transferir com Vesting
```
User preenche form:
  - Destinatário
  - Quantidade
  - Duração
  - Cliff (opcional)
    ↓
Frontend → Blockchain: vested_transfer() extrinsic
    ↓
Blockchain cria novo schedule para destinatário
    ↓
Frontend mostra confirmação
```

---

## 📋 Prompts de Execução

Esta FASE possui **5 prompts sequenciais**:

| # | Prompt | Duração | Descrição |
|---|--------|---------|-----------|
| 1 | Blockchain: pallet-vesting | 1 dia | Adicionar e configurar pallet |
| 2 | Blockchain: Genesis config | 4h | Configurar schedules iniciais |
| 3 | Backend: API endpoints | 4h | Criar endpoints REST |
| 4 | Frontend: Vesting UI | 1 dia | Dashboard e componentes |
| 5 | Testes e Docs | 4h | E2E tests e documentação |

**Total**: ~2.5 dias de implementação

Ver [FASE-09-PROMPT.md](spec/FASE-09-PROMPT.md) para detalhes.

---

## ⚠️ Riscos e Mitigação

### Risco 1: Mudança de Storage Layout (Alto)
**Problema**: Adicionar pallet-vesting altera o storage layout
**Impacto**: Chain precisa ser resetada
**Mitigação**:
- ✅ Fazer backup do estado atual
- ✅ Documentar storage migrations (se necessário)
- ✅ Testar em testnet primeiro

### Risco 2: Genesis Config Complexo (Médio)
**Problema**: Configurar schedules corretos no genesis é crítico
**Impacto**: Tokens podem ser distribuídos incorretamente
**Mitigação**:
- ✅ Validar cálculos de per_block
- ✅ Testar genesis config em testnet
- ✅ Double-check endereços de beneficiários

### Risco 3: Bugs em Vesting Logic (Médio)
**Problema**: Bugs podem travar tokens permanentemente
**Impacto**: Perda de fundos
**Mitigação**:
- ✅ Usar pallet oficial do Substrate (battle-tested)
- ✅ Extensive unit tests
- ✅ Testes de integração
- ✅ Audit de código

---

## 🔗 Dependências

### Requisitos
- ✅ FASE 7: Governance Backend - **COMPLETO**
- ✅ FASE 8: Governance UI - **COMPLETO**
- ✅ Runtime versão 102 ou superior
- ✅ Polkadot.js API ^16.4.7

### Não Bloqueante
- ⏸️ FASE 10: Token Distribution (pode ser depois)
- ⏸️ FASE 11: Staking (pode ser depois)

---

## 📚 Referências

- [Substrate pallet-vesting Docs](https://docs.substrate.io/reference/frame-pallets/#vesting)
- [Polkadot Vesting](https://wiki.polkadot.network/docs/learn-vesting)
- [pallet-vesting Source Code](https://github.com/paritytech/polkadot-sdk/tree/master/substrate/frame/vesting)
- [Vesting Economics Best Practices](https://tokenomics.wiki/vesting)

---

## ✅ Critérios de Sucesso

### Blockchain
- [ ] pallet-vesting integrado e funcionando
- [ ] Genesis config com schedules corretos
- [ ] Todos os extrinsics funcionando
- [ ] Events sendo emitidos corretamente
- [ ] Unit tests passando (100% coverage)

### Backend
- [ ] Endpoints REST funcionando
- [ ] Integração com blockchain OK
- [ ] Response time < 500ms
- [ ] Error handling robusto

### Frontend
- [ ] Dashboard de vesting funcional
- [ ] Suporte aos 6 temas
- [ ] Responsivo (mobile + desktop)
- [ ] Acessibilidade (WCAG AA)
- [ ] Loading states com skeletons

### Testes
- [ ] Unit tests passando
- [ ] Integration tests passando
- [ ] E2E tests passando (Playwright)
- [ ] Manual testing completo

### Documentação
- [ ] Spec técnica completa
- [ ] README atualizado
- [ ] API docs
- [ ] User guide

---

## 🚀 Próximos Passos (Pós-FASE 9)

### FASE 10: Token Distribution
- Airdrops
- Faucet para testnet
- Distribuição inicial

### FASE 11: Staking
- Staking de BZR
- Rewards
- Validators

### FASE 12: DeFi Integration
- AMM/DEX
- Liquidity pools
- Yield farming

---

**Status**: 🟡 Aguardando Execução

**Prioridade**: Alta

**Próxima Ação**: Executar PROMPT 1 - Integrar pallet-vesting

---

**Última atualização**: 2025-10-30
