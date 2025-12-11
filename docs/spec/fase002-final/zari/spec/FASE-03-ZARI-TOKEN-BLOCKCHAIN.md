# FASE 3: ZARI Token (Blockchain)

**Data de Criação**: 2025-10-27
**Status**: 📋 ESPECIFICAÇÃO TÉCNICA
**Dependências**: FASE 1 (BZR Rename - Blockchain) ✅ COMPLETA
**Duração Estimada**: 2 semanas
**Nível de Risco**: 🟡 MÉDIO

---

## 🎯 OBJETIVO

Adicionar o pallet `pallet-assets` ao runtime da blockchain Bazari e criar o token de governança **ZARI** como um asset fungível (AssetId = 1), configurando metadata, supply inicial e permissões no genesis config.

---

## 🔍 CONTEXTO

### Por Que Após FASE 1?

1. **BZR já renomeado**: Evita confusão entre dois tokens onde um tem nome errado
2. **Metadata API estabelecido**: Padrão já implementado para BZR, será replicado para ZARI
3. **Runtime estável**: spec_version 101 já testado e funcionando
4. **Constants prontas**: BZR/MILLI_BZR/MICRO_BZR disponíveis para usar em deposits

### Arquitetura Atual (FASE 1 Completa)

```
bazari-chain/runtime/
├── Cargo.toml                    # Dependências do runtime
├── src/
│   ├── lib.rs                    # Runtime principal + constants BZR
│   ├── configs/
│   │   └── mod.rs                # Configs de todos os pallets
│   └── genesis_config_presets.rs # Genesis development/local
```

**Pallets Existentes**:
- pallet-balances (BZR nativo)
- pallet-uniques (NFTs)
- pallet-stores (CID storage)
- pallet-bazari-identity (profiles)
- pallet-template (custom logic)

**Próximo Index Disponível**: `#[runtime::pallet_index(12)]` para Assets

---

## 📦 ESCOPO TÉCNICO

### 1. Adicionar Dependência `pallet-assets`

**Arquivo**: `/root/bazari-chain/runtime/Cargo.toml`

**Mudanças**:

```toml
[dependencies]
# ... dependências existentes ...
pallet-assets.workspace = true  # ADICIONAR ESTA LINHA (após pallet-balances)
```

**Adicionar ao feature `std`**:

```toml
[features]
std = [
    # ... features existentes ...
    "pallet-assets/std",  # ADICIONAR
]
```

**Adicionar ao feature `runtime-benchmarks`** (opcional):

```toml
runtime-benchmarks = [
    # ... benchmarks existentes ...
    "pallet-assets/runtime-benchmarks",  # ADICIONAR
]
```

**Adicionar ao feature `try-runtime`** (opcional):

```toml
try-runtime = [
    # ... try-runtime existentes ...
    "pallet-assets/try-runtime",  # ADICIONAR
]
```

---

### 2. Configurar `pallet_assets::Config`

**Arquivo**: `/root/bazari-chain/runtime/src/configs/mod.rs`

**Adicionar ao final do arquivo** (após `impl pallet_bazari_identity::Config`):

```rust
// --- pallet-assets (FASE 3: ZARI Token) ---
parameter_types! {
    // Depósito para criar um asset (10 BZR para evitar spam)
    pub const AssetDeposit: Balance = 10 * crate::BZR;

    // Depósito por conta que possui o asset (0.1 BZR - storage mínimo)
    pub const AssetAccountDeposit: Balance = 100 * crate::MILLI_BZR;

    // Depósito base para metadata (1 BZR)
    pub const MetadataDepositBase: Balance = 1 * crate::BZR;

    // Depósito por byte de metadata (0.001 BZR por byte)
    pub const MetadataDepositPerByte: Balance = 1 * crate::MILLI_BZR;

    // Depósito para aprovações (delegações) - 0.1 BZR
    pub const ApprovalDeposit: Balance = 100 * crate::MILLI_BZR;

    // Limite de caracteres para strings (nome/símbolo)
    pub const StringLimit: u32 = 50;

    // Limite de items removíveis por chamada (anti-spam)
    pub const RemoveItemsLimit: u32 = 1000;
}

impl pallet_assets::Config for Runtime {
    type RuntimeEvent = RuntimeEvent;

    // Tipo de balance (mesma que Balances - u128)
    type Balance = Balance;

    // AssetId como u32 (permite até ~4 bilhões de assets)
    type AssetId = u32;
    type AssetIdParameter = codec::Compact<u32>;

    // BZR usado para pagar depósitos de storage
    type Currency = Balances;

    // Qualquer conta pode criar asset (em produção, poderia ser RestrictedOrigin)
    type CreateOrigin = AsEnsureOriginWithArg<EnsureSigned<AccountId>>;

    // Root pode forçar operações (freeze, thaw, destroy)
    type ForceOrigin = EnsureRoot<AccountId>;

    // Depósitos configurados acima
    type AssetDeposit = AssetDeposit;
    type AssetAccountDeposit = AssetAccountDeposit;
    type MetadataDepositBase = MetadataDepositBase;
    type MetadataDepositPerByte = MetadataDepositPerByte;
    type ApprovalDeposit = ApprovalDeposit;

    // Limites de string
    type StringLimit = StringLimit;

    // Sem freezer customizado (usa padrão)
    type Freezer = ();

    // Sem data extra por asset
    type Extra = ();

    // Weights padrão do Substrate
    type WeightInfo = pallet_assets::weights::SubstrateWeight<Runtime>;

    // Limite anti-DoS para remoção em lote
    type RemoveItemsLimit = RemoveItemsLimit;

    // Sem callback customizado
    type CallbackHandle = ();

    #[cfg(feature = "runtime-benchmarks")]
    type BenchmarkHelper = ();
}
```

**Imports necessários** (adicionar no topo de `mod.rs`):

```rust
use codec; // Já existe, mas verificar
```

---

### 3. Adicionar Pallet ao Runtime

**Arquivo**: `/root/bazari-chain/runtime/src/lib.rs`

**Localização**: Dentro do macro `#[frame_support::runtime] mod runtime { ... }`

**Adicionar após `BazariIdentity` (linha ~267)**:

```rust
    // Bazari Identity pallet - Soulbound NFT profiles
    #[runtime::pallet_index(11)]
    pub type BazariIdentity = pallet_bazari_identity;

    // Fungible assets (FASE 3: ZARI Token)
    #[runtime::pallet_index(12)]
    pub type Assets = pallet_assets;
}
```

---

### 4. Configurar Genesis Config

**Arquivo**: `/root/bazari-chain/runtime/src/genesis_config_presets.rs`

**Objetivo**: Criar asset ZARI (ID=1) no genesis com:
- 21.000.000 ZARI de supply total (21 milhões)
- 12 decimais (mesmo que BZR)
- Metadata: "ZARI" / "Bazari Governance Token"
- Owner: Alice (em dev mode)

**Modificar função `testnet_genesis`** (substituir completamente):

```rust
// Returns the genesis config presets populated with given parameters.
fn testnet_genesis(
    initial_authorities: Vec<(AuraId, GrandpaId)>,
    endowed_accounts: Vec<AccountId>,
    root: AccountId,
) -> Value {
    // Preparar contas com BZR inicial
    let bzr_balances = endowed_accounts
        .iter()
        .cloned()
        .map(|k| (k, 1u128 << 60)) // ~1.15M BZR per account
        .collect::<Vec<_>>();

    // ZARI: 21 milhões com 12 decimais = 21_000_000 * 10^12
    let zari_total_supply: u128 = 21_000_000 * 1_000_000_000_000u128;

    // Owner do ZARI (Alice em dev, multisig em produção)
    let zari_owner = root.clone();

    build_struct_json_patch!(RuntimeGenesisConfig {
        balances: BalancesConfig {
            balances: bzr_balances,
        },
        aura: pallet_aura::GenesisConfig {
            authorities: initial_authorities
                .iter()
                .map(|x| (x.0.clone()))
                .collect::<Vec<_>>(),
        },
        grandpa: pallet_grandpa::GenesisConfig {
            authorities: initial_authorities
                .iter()
                .map(|x| (x.1.clone(), 1))
                .collect::<Vec<_>>(),
        },
        sudo: SudoConfig { key: Some(root) },

        // ===== FASE 3: ZARI GENESIS =====
        assets: pallet_assets::GenesisConfig {
            // Criar asset ZARI (ID=1)
            assets: vec![
                // (asset_id, owner, is_sufficient, min_balance)
                (1, zari_owner.clone(), true, 1u128), // min_balance = 1 planck
            ],
            // Metadata do ZARI
            metadata: vec![
                // (asset_id, name, symbol, decimals)
                (1, b"Bazari Governance Token".to_vec(), b"ZARI".to_vec(), 12),
            ],
            // Alocar supply total para owner
            accounts: vec![
                // (asset_id, account, balance)
                (1, zari_owner, zari_total_supply),
            ],
        },
    })
}
```

**Imports necessários** (adicionar no topo do arquivo):

```rust
use crate::{
    AccountId,
    BalancesConfig,
    RuntimeGenesisConfig,
    SudoConfig,
    // ADICIONAR:
    AssetsConfig,  // <--- NOVO
};
```

**⚠️ IMPORTANTE**: Se `AssetsConfig` não estiver exposto, pode ser necessário usar o path completo:

```rust
assets: pallet_assets::GenesisConfig {
    // ... config ...
}
```

---

### 5. Bump Runtime Version

**Arquivo**: `/root/bazari-chain/runtime/src/lib.rs`

**Localização**: ~linha 63-76

**Mudança**:

```rust
pub const VERSION: RuntimeVersion = RuntimeVersion {
    spec_name: alloc::borrow::Cow::Borrowed("bazari-runtime"),
    impl_name: alloc::borrow::Cow::Borrowed("bazari-runtime"),
    authoring_version: 1,
    // BUMP: 101 → 102 (adição de pallet-assets = mudança de storage)
    spec_version: 102,  // <--- ALTERAR DE 101 PARA 102
    impl_version: 1,
    apis: apis::RUNTIME_API_VERSIONS,
    transaction_version: 1,
    system_version: 1,
};
```

**Justificativa**: Adicionar pallet-assets cria novos storage items, exigindo bump de `spec_version`.

---

## 🧪 VALIDAÇÃO E TESTES

### Checklist de Compilação

```bash
cd /root/bazari-chain

# 1. Verificar se compila
cargo check --release

# 2. Build completo
cargo build --release

# 3. Testes unitários (se existirem)
cargo test --release
```

**Critérios de Sucesso**:
- [ ] Compila sem erros
- [ ] Compila sem warnings críticos (allow deprecation warnings de BZR)
- [ ] Binary gerado em `target/release/solochain-template-node`

---

### Testes de Execução (Dev Mode)

```bash
# 1. Limpar chain antiga (força genesis novo)
./target/release/solochain-template-node purge-chain --dev -y

# 2. Iniciar node em dev mode
./target/release/solochain-template-node --dev --tmp

# Logs esperados:
# - "Imported #1"
# - Sem "Assets pallet error" ou panics
```

**Critérios de Sucesso**:
- [ ] Node inicia sem panic
- [ ] Produz blocos (Imported #1, #2, #3...)
- [ ] Sem erros de genesis inválido
- [ ] Logs mostram "Assets initialized" (se logger configurado)

---

### Validação via Polkadot.js Apps

**URL**: https://polkadot.js.org/apps/?rpc=ws://127.0.0.1:9944#/explorer

#### Teste 1: Verificar Metadata

**Passo**:
1. Developer → Chain State
2. Pallet: `assets`
3. Verificar se pallet aparece na lista

**Resultado Esperado**:
- ✅ Pallet `assets` listado com queries: `asset`, `metadata`, `account`, `approvals`

---

#### Teste 2: Query Asset ZARI

**Passo**:
1. Developer → Chain State
2. assets → **asset(u32): Option<AssetDetails>**
3. Parâmetro: `1`
4. Clicar "+" para executar

**Resultado Esperado**:

```json
{
  "owner": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", // Alice
  "issuer": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "admin": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "freezer": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "supply": "21000000000000000000", // 21M * 10^12
  "deposit": "10000000000000", // 10 BZR
  "minBalance": "1",
  "isSufficient": true,
  "accounts": 1,
  "sufficients": 1,
  "approvals": 0,
  "status": "Live"
}
```

---

#### Teste 3: Query Metadata ZARI

**Passo**:
1. Developer → Chain State
2. assets → **metadata(u32): AssetMetadata**
3. Parâmetro: `1`
4. Clicar "+"

**Resultado Esperado**:

```json
{
  "deposit": "1000000000000", // 1 BZR
  "name": "0x42617a61726920476f7665726e616e636520546f6b656e", // "Bazari Governance Token" em hex
  "symbol": "0x5a415249", // "ZARI" em hex
  "decimals": 12,
  "isFrozen": false
}

// Ou decodificado pela UI:
{
  "deposit": "1 BZR",
  "name": "Bazari Governance Token",
  "symbol": "ZARI",
  "decimals": 12,
  "isFrozen": false
}
```

---

#### Teste 4: Query Balance ZARI de Alice

**Passo**:
1. Developer → Chain State
2. assets → **account(u32, AccountId): Option<AssetAccount>**
3. Parâmetro 1: `1` (AssetId)
4. Parâmetro 2: `5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY` (Alice)
5. Clicar "+"

**Resultado Esperado**:

```json
{
  "balance": "21000000000000000000", // 21M ZARI em planck
  "status": "Liquid",
  "reason": "Consumer",
  "extra": {}
}
```

---

#### Teste 5: Transfer ZARI (Alice → Bob)

**Passo**:
1. Developer → Extrinsics
2. Pallet: `assets`
3. Extrinsic: **transfer(id, target, amount)**
4. Parâmetros:
   - id: `1`
   - target: Bob (`5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty`)
   - amount: `1000000000000000` (1000 ZARI = 1000 * 10^12 planck)
5. Sign with Alice
6. Submit Transaction

**Resultado Esperado**:
- ✅ Transaction incluída em bloco
- ✅ Event `assets.Transferred` emitido
- ✅ Query `assets.account(1, Bob)` mostra `balance: "1000000000000000"`
- ✅ Query `assets.account(1, Alice)` mostra `balance: "20999000000000000000"`

---

#### Teste 6: Burn ZARI (Alice destrói tokens)

**Passo**:
1. Developer → Extrinsics
2. Pallet: `assets`
3. Extrinsic: **burn(id, who, amount)**
4. Parâmetros:
   - id: `1`
   - who: Alice
   - amount: `500000000000000` (500 ZARI)
5. Sign with Alice
6. Submit Transaction

**Resultado Esperado**:
- ✅ Event `assets.Burned` emitido
- ✅ `assets.asset(1).supply` reduzido em 500 ZARI
- ✅ Balance de Alice reduzido correspondentemente

---

#### Teste 7: Mint ZARI (Alice cria novos tokens)

**Passo**:
1. Developer → Extrinsics
2. Pallet: `assets`
3. Extrinsic: **mint(id, beneficiary, amount)**
4. Parâmetros:
   - id: `1`
   - beneficiary: Charlie (`5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y`)
   - amount: `2000000000000000` (2000 ZARI)
5. Sign with Alice (owner)
6. Submit Transaction

**Resultado Esperado**:
- ✅ Event `assets.Issued` emitido
- ✅ `assets.asset(1).supply` aumentado em 2000 ZARI
- ✅ `assets.account(1, Charlie)` criado com balance 2000 ZARI

---

### Testes de Regressão (BZR Não Afetado)

**Objetivo**: Garantir que adicionar Assets não quebrou Balances (BZR)

#### Teste BZR-1: Query Balance Nativo

**Passo**:
1. Developer → Chain State
2. system → **account(AccountId): AccountInfo**
3. Parâmetro: Alice
4. Clicar "+"

**Resultado Esperado**:
- ✅ `data.free` mostra balance BZR de Alice (~1.15M BZR = `1152921504606846976`)
- ✅ Nenhum erro

---

#### Teste BZR-2: Transfer BZR

**Passo**:
1. Developer → Extrinsics
2. balances → **transferKeepAlive(dest, value)**
3. dest: Bob
4. value: `100000000000000` (100 BZR)
5. Sign with Alice
6. Submit

**Resultado Esperado**:
- ✅ Transaction incluída
- ✅ Event `balances.Transfer` emitido
- ✅ Balances atualizados corretamente

---

## 📋 CHECKLIST DE CONCLUSÃO

### Pré-Execução
- [ ] FASE 1 (BZR Rename) está completa e funcionando
- [ ] Runtime atual compila e roda sem erros
- [ ] Backup do código atual criado (git commit)

### Durante Execução
- [ ] `pallet-assets` adicionado ao Cargo.toml
- [ ] Features `std`, `runtime-benchmarks`, `try-runtime` atualizadas
- [ ] `impl pallet_assets::Config` criado em `configs/mod.rs`
- [ ] Pallet adicionado ao runtime com index 12
- [ ] Genesis config estendido com ZARI (21M supply)
- [ ] `spec_version` bumped para 102
- [ ] Código compila sem erros

### Validação
- [ ] Node inicia em `--dev` mode sem panic
- [ ] Pallet `assets` aparece em Polkadot.js Apps
- [ ] Query `assets.asset(1)` retorna detalhes ZARI
- [ ] Query `assets.metadata(1)` retorna "ZARI" / 12 decimais
- [ ] Balance de Alice mostra 21M ZARI
- [ ] Transfer ZARI funciona (Alice → Bob)
- [ ] Mint ZARI funciona (Alice → Charlie)
- [ ] Burn ZARI funciona (Alice destrói)
- [ ] BZR transfers ainda funcionam (não houve regressão)

### Pós-Execução
- [ ] Commit das mudanças com mensagem descritiva
- [ ] Tag de versão criada: `v0.3.0-zari-token`
- [ ] Documentação atualizada (se necessário)
- [ ] Relatório de execução criado (FASE-03-RELATORIO-EXECUCAO.md)

---

## ⚠️ RISCOS E MITIGAÇÕES

### Risco 1: Incompatibilidade de Versões (Médio)

**Descrição**: `pallet-assets` pode ter API diferente entre versões do Polkadot SDK.

**Mitigação**:
- Verificar versão workspace no `/root/bazari-chain/Cargo.toml` root
- Usar exatamente polkadot-sdk v1.18.0 (mesma do projeto)
- Se API mudou, consultar docs: https://paritytech.github.io/polkadot-sdk/master/pallet_assets/

**Plano B**: Se não compilar, verificar exemplos no polkadot-sdk:
```bash
cd /tmp
git clone --depth 1 --branch polkadot-v1.18.0 https://github.com/paritytech/polkadot-sdk
cat polkadot-sdk/substrate/frame/assets/src/lib.rs | grep "impl.*Config"
```

---

### Risco 2: Genesis Inválido (Médio)

**Descrição**: Config incorreto pode fazer node falhar ao iniciar.

**Mitigação**:
- Validar tipos: AssetId = u32, Balance = u128
- Verificar owner é AccountId válido
- Testar com `--dev --tmp` primeiro (não afeta chain persistente)
- Se falhar, erro aparece logo no início (não silencioso)

**Plano B**: Se genesis falhar:
1. Comentar todo bloco `assets: pallet_assets::GenesisConfig { ... }`
2. Rebuild + restart node
3. Criar ZARI via extrinsic `assets.create()` manualmente

---

### Risco 3: Storage Migration (Baixo)

**Descrição**: Chain existente precisa migrar storage ao adicionar pallet.

**Mitigação**:
- Em dev mode (`--dev --tmp`), sempre usa genesis limpo (sem migração)
- Para testnet persistente, usar `purge-chain` força genesis novo
- Em produção futura, será necessário runtime upgrade formal

**Plano B**: Não aplicável em FASE 3 (apenas dev/local chains).

---

### Risco 4: Depósitos Muito Altos (Baixo)

**Descrição**: Deposits configurados podem ser inacessíveis em testnet.

**Mitigação**:
- Valores configurados são razoáveis (10 BZR para criar asset)
- Alice tem >1M BZR no genesis (suficiente)
- Em produção, ajustar via governance

**Plano B**: Se deposits bloquearem testes:
1. Editar `configs/mod.rs`
2. Reduzir `AssetDeposit` para `1 * crate::BZR`
3. Rebuild

---

## 🔄 ROLLBACK PLAN

Se FASE 3 falhar criticamente:

### Opção 1: Reverter Código (Recomendado)

```bash
cd /root/bazari-chain
git log --oneline | head -5  # Encontrar commit antes FASE 3
git reset --hard <commit-hash-fase-1>
cargo clean
cargo build --release
```

### Opção 2: Remover Pallet Manualmente

1. **Cargo.toml**: Comentar `pallet-assets` e features
2. **configs/mod.rs**: Comentar `impl pallet_assets::Config`
3. **lib.rs**: Comentar `pub type Assets = pallet_assets`
4. **genesis_config_presets.rs**: Remover bloco `assets: ...`
5. **lib.rs**: Reverter `spec_version: 101` (era 102)
6. Rebuild

---

## 📚 REFERÊNCIAS

### Documentação Oficial

- **pallet-assets**: https://paritytech.github.io/polkadot-sdk/master/pallet_assets/
- **Substrate Tutorial**: https://docs.substrate.io/tutorials/build-application-logic/add-a-pallet/
- **Assets Example**: https://github.com/paritytech/polkadot-sdk/tree/master/substrate/frame/assets

### Arquivos do Projeto

- `/root/bazari-chain/Cargo.toml` (workspace)
- `/root/bazari-chain/runtime/Cargo.toml` (runtime deps)
- `/root/bazari-chain/runtime/src/lib.rs` (runtime principal)
- `/root/bazari-chain/runtime/src/configs/mod.rs` (pallet configs)
- `/root/bazari-chain/runtime/src/genesis_config_presets.rs` (genesis)

### Decisões de Design (FASE 1)

- Token nativo BZR: 12 decimais (linha 102-104 de lib.rs)
- Existential deposit: 0.001 BZR (linha 107)
- Spec version atual: 101 (linha 71)

---

## 🎬 PRÓXIMA FASE

**FASE 4: Multi-Token Wallet (Frontend)**

Dependências:
- ✅ FASE 1: BZR Rename (Blockchain)
- ✅ FASE 3: ZARI Token (Blockchain) ← Esta fase

Escopo:
- Frontend conecta via RPC: `api.query.assets.asset(1)`
- Wallet mostra BZR + ZARI em UI
- Transações suportam seleção de token
- Balance component genérico

**Duração**: 1.5 semanas
**Risco**: 🟢 Baixo (apenas UI, sem mudanças críticas)

---

*Especificação criada em: 27/Out/2025*
*Versão: 1.0*
*Autor: Claude Code Agent*
