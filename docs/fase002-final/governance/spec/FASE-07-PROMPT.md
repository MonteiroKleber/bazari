# FASE 7: Governance (Blockchain) - Prompts de Execução

**Total de prompts**: 10
**Duração total estimada**: 3 semanas (120 horas)

---

## PROMPT 1 (12h): Runtime Dependencies & Basic Configuration

**Objetivo**: Adicionar dependências dos pallets de governança ao projeto e configurar estrutura básica do runtime.

**Contexto**: Projeto Bazari usa Substrate solochain-template. Precisamos adicionar 6 pallets: treasury, democracy, collective (2 instances), multisig, scheduler, preimage.

**Tarefas**:

1. **Atualizar Cargo.toml** (`/root/bazari/bazari-chain/runtime/Cargo.toml`):
   ```toml
   [dependencies]
   # Adicionar após as dependências existentes:
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

2. **Executar build inicial**:
   ```bash
   cd /root/bazari/bazari-chain
   cargo check --release
   ```
   - Verificar que dependências baixam corretamente
   - Corrigir quaisquer erros de versão

3. **Preparar constants** em `runtime/src/lib.rs`:
   ```rust
   // Adicionar após as constants existentes:

   // Time constants
   pub const DAYS: BlockNumber = HOURS * 24;

   // Governance constants
   pub const PROPOSAL_BOND_PERCENT: u32 = 5;
   pub const TREASURY_PROPOSAL_BOND_MIN: Balance = 100 * UNITS;
   pub const TREASURY_PROPOSAL_BOND_MAX: Balance = 500 * UNITS;
   ```

**Validação**:
- [ ] `cargo check --release` compila sem erros
- [ ] Todas as 6 dependências aparecem em Cargo.lock
- [ ] Constants definidas em lib.rs

**Duração**: 12h (inclui possível troubleshooting de versões)

---

## PROMPT 2 (16h): Configure Scheduler & Preimage Pallets

**Objetivo**: Configurar pallets auxiliares necessários para Democracy (scheduler para enactment, preimage para proposals).

**Contexto**: Democracy precisa de scheduler para executar calls aprovadas e preimage para armazenar proposal calls.

**Tarefas**:

1. **Configurar pallet-scheduler** em `runtime/src/lib.rs`:
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

2. **Configurar pallet-preimage**:
   ```rust
   parameter_types! {
       pub const PreimageBaseDeposit: Balance = 1 * UNITS;
       pub const PreimageByteDeposit: Balance = 10 * MILLIUNIT; // 0.01 BZR por byte
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

3. **Adicionar ao construct_runtime!**:
   ```rust
   construct_runtime!(
       pub struct Runtime {
           // ... existing pallets ...
           Scheduler: pallet_scheduler,
           Preimage: pallet_preimage,
       }
   );
   ```

4. **Adicionar OriginCaller** se não existir:
   ```rust
   pub type OriginCaller = RuntimeOrigin;
   ```

5. **Compilar e testar**:
   ```bash
   cargo build --release
   cargo test -p pallet-scheduler
   cargo test -p pallet-preimage
   ```

**Validação**:
- [ ] Runtime compila com scheduler e preimage
- [ ] Tests dos pallets passam
- [ ] Genesis config aceita os novos pallets

**Duração**: 16h

---

## PROMPT 3 (20h): Configure Treasury Pallet

**Objetivo**: Configurar pallet-treasury para gerenciar fundos coletivos da rede.

**Contexto**: Treasury coleta taxas e permite que a comunidade proponha gastos. Aprovação via Council.

**Tarefas**:

1. **Configurar parameter_types**:
   ```rust
   parameter_types! {
       pub const ProposalBond: Permill = Permill::from_percent(5);
       pub const ProposalBondMinimum: Balance = 100 * UNITS;
       pub const ProposalBondMaximum: Balance = 500 * UNITS;
       pub const SpendPeriod: BlockNumber = 7 * DAYS;
       pub const Burn: Permill = Permill::from_percent(1);
       pub const TreasuryPalletId: PalletId = PalletId(*b"py/trsry");
       pub const MaxApprovals: u32 = 100;
   }
   ```

2. **Implementar Config** (NOTE: ApproveOrigin usa Council que será configurado depois):
   ```rust
   impl pallet_treasury::Config for Runtime {
       type PalletId = TreasuryPalletId;
       type Currency = Balances;
       type ApproveOrigin = EnsureRoot<AccountId>; // Temporário, mudaremos para Council no PROMPT 5
       type RejectOrigin = EnsureRoot<AccountId>;
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

3. **Adicionar ao construct_runtime!**:
   ```rust
   Treasury: pallet_treasury,
   ```

4. **Configurar genesis** em `node/src/chain_spec.rs`:
   ```rust
   // Adicionar função helper para treasury genesis
   fn treasury_genesis() -> pallet_treasury::GenesisConfig<Runtime> {
       pallet_treasury::GenesisConfig::default()
   }

   // No testnet_genesis_from_seed():
   treasury: treasury_genesis(),
   ```

5. **Compilar e testar**:
   ```bash
   cargo build --release
   cargo test -p pallet-treasury
   ```

6. **Teste manual via Polkadot.js Apps**:
   - Conectar ao node local
   - Verificar Treasury aparece em Developer > Extrinsics
   - Testar proposeSpend() com sudo

**Validação**:
- [ ] Runtime compila com treasury
- [ ] Unit tests passam
- [ ] Treasury visível no Polkadot.js Apps
- [ ] proposeSpend() funciona via sudo

**Duração**: 20h

---

## PROMPT 4 (18h): Configure Multisig Pallet

**Objetivo**: Configurar pallet-multisig para contas multisignature.

**Contexto**: Multisig permite que múltiplas contas controlem fundos juntas (ex: 2-of-3 threshold).

**Tarefas**:

1. **Configurar parameter_types**:
   ```rust
   parameter_types! {
       pub const DepositBase: Balance = 1 * UNITS;
       pub const DepositFactor: Balance = 0.1 * UNITS;
       pub const MaxSignatories: u32 = 20;
   }
   ```

2. **Implementar Config**:
   ```rust
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

3. **Adicionar ao construct_runtime!**:
   ```rust
   Multisig: pallet_multisig,
   ```

4. **Compilar e testar**:
   ```bash
   cargo build --release
   cargo test -p pallet-multisig
   ```

5. **Criar script de teste** (`/root/bazari/bazari-chain/scripts/test-multisig.sh`):
   ```bash
   #!/bin/bash
   # Testar criação de multisig 2-of-3 e execução de transfer

   # Derivar endereço multisig
   # Alice + Bob + Charlie, threshold 2
   MULTISIG=$(polkadot-js-api derive-multisig \
     --threshold 2 \
     --signatories 5GrwvaEF...,5FHneW46...,5FLSigC9...)

   echo "Multisig address: $MULTISIG"

   # Enviar fundos para multisig
   # Testar asMulti() com Alice e Bob
   ```

**Validação**:
- [ ] Runtime compila com multisig
- [ ] Tests passam
- [ ] Multisig visível no Polkadot.js
- [ ] Script de teste executa transfer multisig

**Duração**: 18h

---

## PROMPT 5 (24h): Configure Collective Pallets (Council + Technical)

**Objetivo**: Configurar pallet-collective com 2 instâncias: Council e TechnicalCommittee.

**Contexto**: Council aprova treasury proposals. Technical Committee pode fast-track democracy proposals.

**Tarefas**:

1. **Configurar parameter_types para Council**:
   ```rust
   parameter_types! {
       pub const CouncilMotionDuration: BlockNumber = 7 * DAYS;
       pub const CouncilMaxProposals: u32 = 100;
       pub const CouncilMaxMembers: u32 = 13;
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

2. **Configurar TechnicalCommittee**:
   ```rust
   parameter_types! {
       pub const TechnicalMotionDuration: BlockNumber = 3 * DAYS;
       pub const TechnicalMaxProposals: u32 = 100;
       pub const TechnicalMaxMembers: u32 = 7;
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

3. **Adicionar ao construct_runtime!**:
   ```rust
   Council: pallet_collective::<Instance1>,
   TechnicalCommittee: pallet_collective::<Instance2>,
   ```

4. **Atualizar Treasury para usar Council**:
   ```rust
   impl pallet_treasury::Config for Runtime {
       // ... existing ...
       type ApproveOrigin = EitherOfDiverse<
           EnsureRoot<AccountId>,
           pallet_collective::EnsureProportionAtLeast<AccountId, CouncilCollective, 3, 5>,
       >;
       type RejectOrigin = EitherOfDiverse<
           EnsureRoot<AccountId>,
           pallet_collective::EnsureProportionMoreThan<AccountId, CouncilCollective, 1, 2>,
       >;
       // ... rest ...
   }
   ```

5. **Configurar genesis members** em `chain_spec.rs`:
   ```rust
   fn council_genesis() -> pallet_collective::GenesisConfig<Runtime, CouncilCollective> {
       pallet_collective::GenesisConfig {
           members: vec![
               get_account_id_from_seed::<sr25519::Public>("Alice"),
               get_account_id_from_seed::<sr25519::Public>("Bob"),
               get_account_id_from_seed::<sr25519::Public>("Charlie"),
           ],
           phantom: Default::default(),
       }
   }

   fn technical_committee_genesis() -> pallet_collective::GenesisConfig<Runtime, TechnicalCollective> {
       pallet_collective::GenesisConfig {
           members: vec![
               get_account_id_from_seed::<sr25519::Public>("Alice"),
               get_account_id_from_seed::<sr25519::Public>("Bob"),
           ],
           phantom: Default::default(),
       }
   }

   // No testnet_genesis_from_seed():
   council: council_genesis(),
   technical_committee: technical_committee_genesis(),
   ```

6. **Compilar e testar**:
   ```bash
   cargo build --release
   cargo test -p pallet-collective
   ```

7. **Teste manual**:
   - Verificar Council members no genesis
   - Criar motion via Council.propose()
   - Votar com Alice, Bob
   - Executar motion quando threshold atingido

**Validação**:
- [ ] Runtime compila com Council e TechnicalCommittee
- [ ] Genesis contém members iniciais
- [ ] Council pode aprovar treasury proposals
- [ ] Motion lifecycle funciona (propose, vote, execute)

**Duração**: 24h

---

## PROMPT 6 (28h): Configure Democracy Pallet

**Objetivo**: Configurar pallet-democracy para propostas e referendos democráticos.

**Contexto**: Democracy permite que holders de tokens proponham changes via referendum com conviction voting.

**Tarefas**:

1. **Configurar parameter_types**:
   ```rust
   parameter_types! {
       pub const LaunchPeriod: BlockNumber = 7 * DAYS;
       pub const VotingPeriod: BlockNumber = 7 * DAYS;
       pub const FastTrackVotingPeriod: BlockNumber = 1 * DAYS;
       pub const MinimumDeposit: Balance = 100 * UNITS;
       pub const EnactmentPeriod: BlockNumber = 2 * DAYS;
       pub const CooloffPeriod: BlockNumber = 7 * DAYS;
       pub const MaxVotes: u32 = 100;
       pub const MaxProposals: u32 = 100;
   }
   ```

2. **Implementar Config** (complexo, muitas origins):
   ```rust
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

3. **Adicionar ao construct_runtime!**:
   ```rust
   Democracy: pallet_democracy,
   ```

4. **Configurar genesis**:
   ```rust
   // No testnet_genesis_from_seed():
   democracy: pallet_democracy::GenesisConfig::default(),
   ```

5. **Compilar e testar**:
   ```bash
   cargo build --release
   cargo test -p pallet-democracy
   ```

6. **Criar script de teste completo** (`scripts/test-democracy-flow.sh`):
   ```bash
   #!/bin/bash
   # Testar fluxo completo:
   # 1. Criar preimage (remark call)
   # 2. Propose com preimage hash
   # 3. Second por outros users
   # 4. Aguardar LaunchPeriod -> vira referendum
   # 5. Votar Aye/Nay com conviction
   # 6. Aguardar VotingPeriod -> resultado
   # 7. Aguardar EnactmentPeriod -> execução
   ```

**Validação**:
- [ ] Runtime compila com democracy
- [ ] Tests passam
- [ ] Fluxo completo funciona: propose -> second -> referendum -> vote -> execute
- [ ] Conviction voting funciona (lock periods)
- [ ] Fast-track via TechnicalCommittee funciona

**Duração**: 28h (mais complexo devido a múltiplas origins)

---

## PROMPT 7 (8h): Build & Deploy Testnet

**Objetivo**: Build final do runtime e deploy de testnet com todos os pallets.

**Contexto**: Agora que todos os pallets estão configurados, fazer build release e testar rede completa.

**Tarefas**:

1. **Build release**:
   ```bash
   cd /root/bazari/bazari-chain
   cargo build --release
   ```

2. **Gerar chain spec**:
   ```bash
   ./target/release/solochain-template-node build-spec --chain local > chain-spec-governance.json
   ```

3. **Editar genesis** (se necessário ajustar council members, balances, etc):
   ```bash
   # Verificar chain-spec-governance.json
   # Ajustar council.members, technicalCommittee.members se necessário
   ```

4. **Converter para raw spec**:
   ```bash
   ./target/release/solochain-template-node build-spec \
     --chain chain-spec-governance.json \
     --raw > chain-spec-governance-raw.json
   ```

5. **Start testnet node**:
   ```bash
   ./target/release/solochain-template-node \
     --chain chain-spec-governance-raw.json \
     --base-path /tmp/governance-testnet \
     --name "Bazari Governance Testnet" \
     --rpc-cors all \
     --rpc-methods=unsafe \
     --rpc-port 9944
   ```

6. **Verificar Polkadot.js Apps**:
   - Conectar em ws://localhost:9944
   - Verificar todos os pallets aparecem
   - Verificar genesis state (council members, etc)

7. **Rodar smoke tests**:
   ```bash
   # Testar cada pallet manualmente:
   # - Treasury: proposeSpend
   # - Democracy: propose + vote
   # - Council: motion
   # - Multisig: asMulti
   ```

**Validação**:
- [ ] Build release compila sem warnings críticos
- [ ] Chain spec gerado corretamente
- [ ] Node inicia sem panics
- [ ] Polkadot.js mostra todos os pallets
- [ ] Genesis state correto (council members, etc)
- [ ] Smoke tests passam

**Duração**: 8h

---

## PROMPT 8 (48h): Backend API Implementation

**Objetivo**: Implementar backend API com 12 endpoints para governança.

**Contexto**: Frontend precisa de API REST para interagir com pallets de governança.

**Tarefas**:

1. **Prisma schema** (`apps/api/prisma/schema.prisma`):
   - Adicionar models: GovernanceProposal, GovernanceVote, CouncilMember, MultisigAccount, MultisigTransaction
   - Ver spec FASE-07 seção 3.2 para schema completo

2. **Generate migration**:
   ```bash
   cd /root/bazari/apps/api
   pnpm prisma migrate dev --name add_governance_models
   pnpm prisma generate
   ```

3. **Criar módulo governance**:
   ```bash
   mkdir -p src/modules/governance/dto
   ```

4. **Implementar services**:
   - `governance.service.ts` - Event listeners + sync blockchain state
   - `democracy.service.ts` - Democracy operations
   - `treasury.service.ts` - Treasury operations
   - `council.service.ts` - Council operations
   - `multisig.service.ts` - Multisig operations

5. **Implementar DTOs** (`dto/`):
   - `proposal.dto.ts`
   - `vote.dto.ts`
   - `treasury.dto.ts`
   - `council.dto.ts`
   - `multisig.dto.ts`

6. **Implementar controller** (`governance.controller.ts`):
   - 12 endpoints conforme spec seção 3.3

7. **Event listeners** (governance.service.ts):
   ```typescript
   async startEventListeners() {
     const api = await this.polkadotService.getApi();

     api.query.system.events((events) => {
       events.forEach((record) => {
         const { event } = record;

         // Democracy events
         if (event.section === 'democracy') {
           this.handleDemocracyEvent(event);
         }

         // Treasury events
         if (event.section === 'treasury') {
           this.handleTreasuryEvent(event);
         }

         // Council events
         if (event.section === 'council') {
           this.handleCouncilEvent(event);
         }

         // TechnicalCommittee events
         if (event.section === 'technicalCommittee') {
           this.handleTechnicalEvent(event);
         }
       });
     });
   }
   ```

8. **Testes E2E**:
   ```typescript
   // governance.e2e.spec.ts
   describe('Governance E2E', () => {
     it('should create democracy proposal', async () => { ... });
     it('should vote on referendum', async () => { ... });
     it('should create treasury proposal', async () => { ... });
     it('should approve multisig transaction', async () => { ... });
   });
   ```

**Validação**:
- [ ] Migrations aplicadas sem erros
- [ ] 12 endpoints funcionando
- [ ] Event listeners sincronizando state corretamente
- [ ] E2E tests passando
- [ ] Swagger docs gerados

**Duração**: 48h (maior parte do backend)

---

## PROMPT 9 (32h): Frontend Pages Implementation

**Objetivo**: Implementar 6 páginas principais de governança no frontend.

**Contexto**: Users precisam de UI para interagir com governança.

**Tarefas**:

1. **Criar estrutura de arquivos**:
   ```bash
   mkdir -p apps/web/src/modules/governance/{pages,components}
   ```

2. **Implementar pages**:
   - `GovernancePage.tsx` - Dashboard geral
   - `ProposalsListPage.tsx` - Lista filtrada
   - `ProposalDetailPage.tsx` - Detalhes + votação
   - `TreasuryPage.tsx` - Treasury dashboard
   - `CouncilPage.tsx` - Council + Technical
   - `MultisigPage.tsx` - Multisig accounts
   - `CreateProposalPage.tsx` - Criar proposta

3. **Implementar components**:
   - `ProposalCard.tsx` - Card para lista
   - `VoteModal.tsx` - Modal de votação
   - `ConvictionSelector.tsx` - Selector de conviction (0-6)
   - `CouncilMemberCard.tsx` - Card de membro
   - `MultisigApprovalFlow.tsx` - Fluxo de aprovação multisig
   - `TreasuryStats.tsx` - Stats do treasury

4. **API client** (`governance/api.ts`):
   ```typescript
   export const governanceApi = {
     listProposals: (params) => getJSON('/governance/proposals', params),
     getProposal: (id) => getJSON(`/governance/proposals/${id}`),
     createDemocracyProposal: (payload) => postJSON('/governance/proposals/democracy', payload),
     vote: (id, payload) => postJSON(`/governance/proposals/${id}/vote`, payload),
     getTreasuryBalance: () => getJSON('/governance/treasury/balance'),
     // ... etc (12 métodos)
   };
   ```

5. **Types** (`governance/types.ts`):
   ```typescript
   export interface GovernanceProposal { ... }
   export interface GovernanceVote { ... }
   export interface CouncilMember { ... }
   export interface MultisigAccount { ... }
   ```

6. **Rotas** (App.tsx):
   ```typescript
   <Route path="/app/governance" element={<GovernancePage />} />
   <Route path="/app/governance/proposals" element={<ProposalsListPage />} />
   <Route path="/app/governance/proposals/:id" element={<ProposalDetailPage />} />
   <Route path="/app/governance/treasury" element={<TreasuryPage />} />
   <Route path="/app/governance/council" element={<CouncilPage />} />
   <Route path="/app/governance/multisig" element={<MultisigPage />} />
   <Route path="/app/governance/proposals/new" element={<CreateProposalPage />} />
   ```

7. **Integração com PIN**:
   - VoteModal usa PinService para assinar vote
   - CreateProposalPage usa PinService para assinar propose
   - MultisigApprovalFlow usa PinService para asMulti

**Validação**:
- [ ] 7 páginas renderizam sem erros
- [ ] 6 componentes funcionais
- [ ] API client com 12 métodos
- [ ] Rotas configuradas
- [ ] PIN integration funciona
- [ ] UI responsiva (mobile + desktop)

**Duração**: 32h

---

## PROMPT 10 (8h): Translations & Documentation

**Objetivo**: Adicionar traduções i18n e documentação completa.

**Contexto**: Frontend precisa de traduções pt/en/es. Usuários precisam de guias.

**Tarefas**:

1. **Traduções** (adicionar a pt.json, en.json, es.json):
   ```json
   {
     "governance": {
       "dashboard": {
         "title": "Governança",
         "activeProposals": "Propostas ativas",
         "treasuryBalance": "Saldo do Tesouro",
         "councilMembers": "Membros do Conselho"
       },
       "proposals": {
         "types": {
           "democracy": "Democracia",
           "treasury": "Tesouro",
           "council": "Conselho",
           "technical": "Comitê Técnico"
         },
         "status": {
           "proposed": "Proposta",
           "tabled": "Tabela",
           "started": "Iniciado",
           "passed": "Aprovado",
           "rejected": "Rejeitado",
           "executed": "Executado",
           "cancelled": "Cancelado"
         },
         "create": {
           "title": "Criar Proposta",
           "selectType": "Selecione o tipo",
           "proposalTitle": "Título da proposta",
           "description": "Descrição",
           "deposit": "Depósito",
           "submit": "Submeter Proposta"
         },
         "vote": {
           "title": "Votar em Proposta",
           "aye": "A Favor",
           "nay": "Contra",
           "conviction": "Convicção",
           "convictionHelp": "Maior convicção = mais peso + mais tempo travado",
           "none": "Nenhuma (0.1x, sem trava)",
           "locked1x": "Travado 1x (1x, 7 dias)",
           "locked2x": "Travado 2x (2x, 14 dias)",
           "locked3x": "Travado 3x (3x, 28 dias)",
           "locked4x": "Travado 4x (4x, 56 dias)",
           "locked5x": "Travado 5x (5x, 112 dias)",
           "locked6x": "Travado 6x (6x, 224 dias)",
           "confirmVote": "Confirmar Voto"
         }
       },
       "treasury": {
         "title": "Tesouro",
         "balance": "Saldo",
         "proposals": "Propostas",
         "createProposal": "Criar Proposta de Tesouro",
         "beneficiary": "Beneficiário",
         "amount": "Quantidade solicitada",
         "bond": "Caução (5% do valor)"
       },
       "council": {
         "title": "Conselho",
         "members": "Membros",
         "prime": "Membro Prime",
         "motions": "Moções",
         "createMotion": "Criar Moção",
         "threshold": "Limiar de aprovação"
       },
       "multisig": {
         "title": "Multisig",
         "create": "Criar Conta Multisig",
         "signatories": "Signatários",
         "threshold": "Limiar",
         "pending": "Transações Pendentes",
         "approve": "Aprovar",
         "approvals": "Aprovações"
       }
     }
   }
   ```

2. **User guide** (`/root/bazari/docs/governance-user-guide.md`):
   - O que é governança on-chain
   - Como criar proposta democracy
   - Como votar (+ conviction)
   - Como solicitar fundos do treasury
   - Como criar conta multisig
   - Council: o que é e quem são os membros
   - FAQ

3. **Developer guide** (`/root/bazari/docs/governance-dev-guide.md`):
   - Arquitetura dos pallets
   - Como fazer call encoding para preimages
   - Event listeners: como funcionam
   - Testing: unit tests + E2E
   - Troubleshooting comum
   - Como fazer runtime upgrade via governance

4. **README** (`/root/bazari/docs/fase002-final/governance/GOVERNANCE-README.md`):
   - Overview da FASE 7
   - Links para user guide e dev guide
   - Endpoints da API
   - Rotas do frontend

**Validação**:
- [ ] Traduções adicionadas (pt, en, es)
- [ ] User guide completo e testado
- [ ] Developer guide com exemplos funcionais
- [ ] README com links e overview

**Duração**: 8h

---

## RESUMO DE EXECUÇÃO

| Prompt | Descrição | Duração | Status |
|--------|-----------|---------|--------|
| 1 | Runtime Dependencies & Basic Config | 12h | ⏳ |
| 2 | Scheduler & Preimage | 16h | ⏳ |
| 3 | Treasury | 20h | ⏳ |
| 4 | Multisig | 18h | ⏳ |
| 5 | Collective (Council + Technical) | 24h | ⏳ |
| 6 | Democracy | 28h | ⏳ |
| 7 | Build & Deploy Testnet | 8h | ⏳ |
| 8 | Backend API | 48h | ⏳ |
| 9 | Frontend Pages | 32h | ⏳ |
| 10 | Translations & Docs | 8h | ⏳ |
| **TOTAL** | | **214h (~27 dias úteis)** | |

**Ordem de execução**: Sequencial (1 → 10)

**Pausar**: Ao final de cada prompt completado para validação

**Checkpoint crítico**: Após PROMPT 7 (testnet deployment) - validar tudo funciona antes de começar backend

---

**FIM DOS PROMPTS DE EXECUÇÃO FASE 7**
