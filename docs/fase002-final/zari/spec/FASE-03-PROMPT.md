# 🤖 PROMPT EXECUTÁVEL: FASE 3 - ZARI Token (Blockchain)

**Para**: Claude Code Agent
**Contexto**: Implementação de token de governança ZARI no runtime Substrate
**Tempo Estimado**: 2 horas de execução automatizada
**Pré-requisito**: FASE 1 completa (BZR rename)

---

## 📋 CONTEXTO PARA O AGENTE

Você está implementando a **FASE 3** do roadmap de tokens da blockchain Bazari. Esta fase adiciona o `pallet-assets` ao runtime e cria o token ZARI (AssetId=1) no genesis com 21 milhões de supply.

**Arquitetura Atual**:
- Runtime: Polkadot SDK v1.18.0
- Spec version: 101 (será bumped para 102)
- BZR nativo: 12 decimais, constants já definidas
- Próximo pallet index disponível: 12

**Arquivos Críticos**:
- `/root/bazari-chain/runtime/Cargo.toml` - Adicionar pallet-assets
- `/root/bazari-chain/runtime/src/configs/mod.rs` - Config do pallet
- `/root/bazari-chain/runtime/src/lib.rs` - Adicionar ao runtime
- `/root/bazari-chain/runtime/src/genesis_config_presets.rs` - Genesis ZARI

---

## 🎯 TAREFA PRINCIPAL

Adicionar suporte para tokens fungíveis customizados via `pallet-assets` e criar o token ZARI no genesis com as seguintes especificações:

**Token ZARI**:
- AssetId: `1`
- Nome: "Bazari Governance Token"
- Símbolo: "ZARI"
- Decimais: `12` (mesmo que BZR)
- Supply Total: `21.000.000 ZARI` (21M * 10^12 planck)
- Owner inicial: Alice (root account em dev mode)
- Tipo: Sufficient asset (não requer BZR para existir)

---

## 🔧 PASSOS DE IMPLEMENTAÇÃO

### PASSO 1: Adicionar Dependência pallet-assets (20 min)

**Arquivo**: `/root/bazari-chain/runtime/Cargo.toml`

#### 1.1: Adicionar ao [dependencies]

**Localização**: Após `pallet-balances` (linha ~26)

**Adicionar**:
```toml
pallet-assets.workspace = true
```

#### 1.2: Adicionar ao feature `std`

**Localização**: Dentro de `[features]` → `std = [...]` (linha ~59-97)

**Adicionar** (ordem alfabética, após `pallet-aura/std`):
```toml
"pallet-assets/std",
```

#### 1.3: Adicionar ao feature `runtime-benchmarks` (OPCIONAL)

**Localização**: `runtime-benchmarks = [...]` (linha ~100-113)

**Adicionar**:
```toml
"pallet-assets/runtime-benchmarks",
```

#### 1.4: Adicionar ao feature `try-runtime` (OPCIONAL)

**Localização**: `try-runtime = [...]` (linha ~115-129)

**Adicionar**:
```toml
"pallet-assets/try-runtime",
```

**Validação**: Executar `cargo check` deve compilar sem erros de dependência.

---

### PASSO 2: Configurar pallet_assets::Config (30 min)

**Arquivo**: `/root/bazari-chain/runtime/src/configs/mod.rs`

#### 2.1: Adicionar parameter_types

**Localização**: Final do arquivo (após `impl pallet_bazari_identity::Config`, linha ~262)

**Adicionar**:
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

**Validação**: Executar `cargo check` deve compilar sem erros de tipo.

---

### PASSO 3: Adicionar Pallet ao Runtime (15 min)

**Arquivo**: `/root/bazari-chain/runtime/src/lib.rs`

#### 3.1: Adicionar ao módulo runtime

**Localização**: Dentro de `#[frame_support::runtime] mod runtime { ... }`, após `BazariIdentity` (linha ~267)

**Adicionar**:
```rust
    // Bazari Identity pallet - Soulbound NFT profiles
    #[runtime::pallet_index(11)]
    pub type BazariIdentity = pallet_bazari_identity;

    // Fungible assets (FASE 3: ZARI Token)
    #[runtime::pallet_index(12)]
    pub type Assets = pallet_assets;
}
```

**⚠️ IMPORTANTE**: Verificar que o fechamento `}` do módulo está após a adição.

**Validação**: Executar `cargo check` deve reconhecer o pallet sem erros.

---

### PASSO 4: Bump Runtime Version (5 min)

**Arquivo**: `/root/bazari-chain/runtime/src/lib.rs`

**Localização**: `pub const VERSION: RuntimeVersion` (linha ~63-76)

**Alterar**:
```rust
pub const VERSION: RuntimeVersion = RuntimeVersion {
    spec_name: alloc::borrow::Cow::Borrowed("bazari-runtime"),
    impl_name: alloc::borrow::Cow::Borrowed("bazari-runtime"),
    authoring_version: 1,
    // FASE 3: Bump devido à adição de pallet-assets
    spec_version: 102,  // <--- ALTERAR DE 101 PARA 102
    impl_version: 1,
    apis: apis::RUNTIME_API_VERSIONS,
    transaction_version: 1,
    system_version: 1,
};
```

**Justificativa**: Adição de pallet muda storage layout, requer bump de spec_version.

---

### PASSO 5: Configurar Genesis ZARI (40 min)

**Arquivo**: `/root/bazari-chain/runtime/src/genesis_config_presets.rs`

#### 5.1: Modificar função testnet_genesis

**Localização**: Função `testnet_genesis` (linha ~28-55)

**Substituir completamente por**:
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

**Validação**: Compilar deve gerar genesis válido sem erros.

---

### PASSO 6: Build e Testes (30 min)

#### 6.1: Build Release

```bash
cd /root/bazari-chain
cargo build --release 2>&1 | tee build.log
```

**Critérios de Sucesso**:
- ✅ Compila sem erros
- ✅ Binary gerado: `target/release/solochain-template-node`
- ⚠️ Warnings de deprecation do BZR são OK (expected)

#### 6.2: Limpar Chain Anterior

```bash
./target/release/solochain-template-node purge-chain --dev -y
```

#### 6.3: Iniciar Node Dev

```bash
# Executar em background com timeout de 30s
timeout 30s ./target/release/solochain-template-node --dev --tmp 2>&1 | tee node.log || true
```

**Critérios de Sucesso**:
- ✅ Node inicia sem panic
- ✅ Logs mostram "Imported #1", "#2", "#3" (produzindo blocos)
- ✅ Sem "Assets pallet error" ou "genesis invalid"

#### 6.4: Validação RPC (Query ZARI)

**Executar via curl**:

```bash
# Query 1: Verificar asset ZARI existe
curl -s -X POST http://127.0.0.1:9944 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"state_getStorage",
    "params":["0x682a59d51ab9e48a8c8cc418ff9708d2b99d880ec681799c0cf30e8886371da9c7f35cce917d472bc100000001000000"],
    "id":1
  }' | jq

# Query 2: Verificar metadata ZARI
curl -s -X POST http://127.0.0.1:9944 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"state_call",
    "params":["AssetsApi_asset_metadata", "0x01000000"],
    "id":2
  }' | jq
```

**Resultado Esperado**:
- Query 1 retorna dados (não null)
- Query 2 retorna metadata com "ZARI" e decimals=12

**⚠️ NOTA**: Se RPC queries falharem, validação manual via Polkadot.js Apps é aceitável (documentar no relatório).

---

## ✅ CRITÉRIOS DE VALIDAÇÃO

### Compilação
- [ ] `cargo check` passa sem erros
- [ ] `cargo build --release` completa com sucesso
- [ ] Binary `target/release/solochain-template-node` gerado

### Execução
- [ ] Node inicia em `--dev` mode sem panic
- [ ] Blocos são produzidos (Imported #1, #2, #3...)
- [ ] Sem erros de genesis inválido nos logs

### Funcionalidade (via Polkadot.js Apps)
- [ ] Pallet `assets` aparece em Developer → Chain State
- [ ] Query `assets.asset(1)` retorna AssetDetails válido
- [ ] Query `assets.metadata(1)` retorna "ZARI" / 12 decimals
- [ ] Query `assets.account(1, Alice)` mostra 21M ZARI
- [ ] Extrinsic `assets.transfer(1, Bob, 1000 ZARI)` funciona
- [ ] BZR transfers ainda funcionam (sem regressão)

---

## 📝 ENTREGÁVEIS

Após execução, criar os seguintes arquivos:

### 1. Relatório de Execução

**Arquivo**: `/root/bazari/docs/fase002-final/zari/spec/FASE-03-RELATORIO-EXECUCAO.md`

**Conteúdo Mínimo**:
```markdown
# FASE 3: ZARI Token (Blockchain) - Relatório de Execução

**Data**: [DATA]
**Status**: ✅ COMPLETA / ⚠️ PARCIAL / ❌ FALHA

## Resumo
[Breve descrição do que foi feito]

## Arquivos Modificados
- `/root/bazari-chain/runtime/Cargo.toml` - Adicionado pallet-assets
- `/root/bazari-chain/runtime/src/configs/mod.rs` - Config implementado
- `/root/bazari-chain/runtime/src/lib.rs` - Pallet adicionado + version bump
- `/root/bazari-chain/runtime/src/genesis_config_presets.rs` - Genesis ZARI

## Testes Executados
[Listar testes do PASSO 6 e resultados]

## Problemas Encontrados
[Se houver, descrever e como foram resolvidos]

## Próxima Fase
FASE 4: Multi-Token Wallet (Frontend)
```

### 2. Build Logs

**Salvar**:
```bash
cp /root/bazari-chain/build.log /root/bazari/docs/fase002-final/zari/logs/fase03-build.log
cp /root/bazari-chain/node.log /root/bazari/docs/fase002-final/zari/logs/fase03-node.log
```

---

## ⚠️ TRATAMENTO DE ERROS

### Erro: "pallet-assets not found"

**Causa**: Versão do polkadot-sdk não tem pallet-assets

**Solução**:
1. Verificar `/root/bazari-chain/Cargo.toml` (workspace root)
2. Confirmar que `polkadot-sdk = { version = "1.18.0", ... }` está correto
3. Executar `cargo update -p pallet-assets`

---

### Erro: "codec::Compact not found"

**Causa**: Import faltando em configs/mod.rs

**Solução**:
Adicionar no topo de `configs/mod.rs`:
```rust
use codec;
```

Ou usar path completo:
```rust
type AssetIdParameter = parity_scale_codec::Compact<u32>;
```

---

### Erro: "genesis config invalid"

**Causa**: Struct GenesisConfig mudou entre versões

**Solução**:
1. Verificar syntax correta em docs: https://paritytech.github.io/polkadot-sdk/master/pallet_assets/
2. Se `assets:` field não for reconhecido, usar:
```rust
assets: pallet_assets::GenesisConfig::<Runtime> {
    // ... config ...
}
```

---

### Erro: Node panic ao iniciar

**Causa**: Genesis inválido ou storage incompatível

**Solução**:
1. Executar `purge-chain --dev -y` novamente
2. Verificar logs em `node.log` para erro específico
3. Se necessário, comentar bloco `assets: ...` temporariamente para testar

---

## 🎯 RESULTADO ESPERADO

Ao final desta fase, o runtime da blockchain Bazari terá:

✅ **pallet-assets** integrado e funcional
✅ **Token ZARI** criado no genesis (AssetId=1)
✅ **21 milhões de ZARI** alocados para Alice
✅ **Metadata correto** (símbolo, nome, decimais)
✅ **RPC queries** funcionando (`assets.asset()`, `assets.account()`)
✅ **Transfers ZARI** funcionais via extrinsics
✅ **BZR nativo** não afetado (sem regressão)

**Próximo Passo**: FASE 4 - Frontend conectará via RPC para mostrar BZR + ZARI na wallet.

---

## 📚 REFERÊNCIAS RÁPIDAS

**Polkadot SDK Docs**:
- pallet-assets: https://paritytech.github.io/polkadot-sdk/master/pallet_assets/
- Runtime macros: https://docs.substrate.io/build/runtime-storage/

**Arquivos do Projeto**:
- Spec detalhada: `/root/bazari/docs/fase002-final/zari/spec/FASE-03-ZARI-TOKEN-BLOCKCHAIN.md`
- Divisão de fases: `/root/bazari/docs/fase002-final/zari/spec/00-DIVISAO-FASES.md`

**Constants BZR** (já definidas em lib.rs):
```rust
pub const BZR: Balance = 1_000_000_000_000;
pub const MILLI_BZR: Balance = 1_000_000_000;
pub const MICRO_BZR: Balance = 1_000_000;
```

---

*Prompt criado em: 27/Out/2025*
*Versão: 1.0*
*Para: Claude Code Agent*
