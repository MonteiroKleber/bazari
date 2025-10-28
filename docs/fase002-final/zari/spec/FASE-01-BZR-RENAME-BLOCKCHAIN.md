# 🔧 FASE 1: Renomeação BZR (Blockchain)

**Duração estimada:** 2 semanas
**Risco:** Baixo
**Complexidade:** Média
**Prioridade:** 🔴 CRÍTICA (Bloqueador para todas outras fases)

---

## 🎯 OBJETIVO

Renomear a moeda nativa da blockchain bazari-chain de **UNIT** (nome genérico do template Substrate) para **BZR** (Bazari Token) em todo o runtime, mantendo 100% de compatibilidade funcional.

---

## 📋 PRÉ-REQUISITOS

### Conhecimentos necessários:
- [x] Rust básico/intermediário
- [x] Substrate runtime development
- [x] Como pallets são configurados
- [x] Runtime versioning (spec_version)

### Ferramentas:
- [x] Rust 1.75+ instalado
- [x] bazari-chain compila localmente
- [x] Node roda em --dev mode
- [x] Polkadot.js Apps conectado

### Validações antes de começar:
```bash
# 1. Compilar projeto atual
cd /root/bazari-chain
cargo build --release

# 2. Rodar testes atuais (devem passar)
cargo test

# 3. Rodar node local
./target/release/solochain-template-node --dev --tmp
```

**Se algum comando falhar, NÃO PROSSEGUIR. Resolver problemas primeiro.**

---

## 🗺️ ARQUITETURA DA MUDANÇA

### Camadas afetadas:
```
┌────────────────────────────────────────┐
│ runtime/src/lib.rs                     │
│   - Constantes: UNIT → BZR            │
│   - Metadata: TOKEN_SYMBOL, etc        │
│   - VERSION: spec_version bump         │
└────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────┐
│ runtime/src/configs/mod.rs             │
│   - Imports atualizados                │
│   - Deposit values usando BZR          │
└────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────┐
│ node/src/chain_spec.rs                 │
│   - Properties: tokenSymbol = "BZR"    │
└────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────┐
│ runtime/src/genesis_config_presets.rs  │
│   - Comments atualizados               │
└────────────────────────────────────────┘
```

---

## 📝 IMPLEMENTAÇÃO PASSO-A-PASSO

### PASSO 1: Renomear constantes principais

**Arquivo:** `/root/bazari-chain/runtime/src/lib.rs`

**Localização:** Linha ~101-107

**ANTES:**
```rust
// Unit = the base number of indivisible units for balances
pub const UNIT: Balance = 1_000_000_000_000;
pub const MILLI_UNIT: Balance = 1_000_000_000;
pub const MICRO_UNIT: Balance = 1_000_000;

/// Existential deposit.
pub const EXISTENTIAL_DEPOSIT: Balance = MILLI_UNIT;
```

**DEPOIS:**
```rust
/// BZR token constants
/// 1 BZR = 10^12 planck (12 decimals, like DOT/KSM)
pub const BZR: Balance = 1_000_000_000_000;
pub const MILLI_BZR: Balance = 1_000_000_000;     // 0.001 BZR
pub const MICRO_BZR: Balance = 1_000_000;         // 0.000001 BZR

/// Minimum balance to keep account alive (0.001 BZR)
pub const EXISTENTIAL_DEPOSIT: Balance = MILLI_BZR;

/// Token metadata for RPC exposure
pub const TOKEN_SYMBOL: &str = "BZR";
pub const TOKEN_NAME: &str = "Bazari Token";
pub const TOKEN_DECIMALS: u8 = 12;
```

**⚠️ IMPORTANTE:**
- Manter alias temporário para compatibilidade:
```rust
// Deprecated aliases for backwards compatibility
// TODO: Remove after 2-3 releases
#[deprecated(since = "0.2.0", note = "Use BZR instead")]
pub const UNIT: Balance = BZR;

#[deprecated(since = "0.2.0", note = "Use MILLI_BZR instead")]
pub const MILLI_UNIT: Balance = MILLI_BZR;

#[deprecated(since = "0.2.0", note = "Use MICRO_BZR instead")]
pub const MICRO_UNIT: Balance = MICRO_BZR;
```

---

### PASSO 2: Atualizar imports e usages

**Arquivo:** `/root/bazari-chain/runtime/src/configs/mod.rs`

**Localização:** Linha ~48

**ANTES:**
```rust
use crate::{EXISTENTIAL_DEPOSIT, MICRO_UNIT, MILLI_UNIT};
```

**DEPOIS:**
```rust
use crate::{BZR, EXISTENTIAL_DEPOSIT, MICRO_BZR, MILLI_BZR};
```

**Localização:** Linhas ~209-216 (UniquesDeposits)

**ANTES:**
```rust
pub const UniquesCollectionDeposit: Balance = 10 * MILLI_UNIT;
pub const UniquesItemDeposit: Balance = 1 * MILLI_UNIT;
pub const UniquesMetadataDepositBase: Balance = 1 * MILLI_UNIT;
pub const UniquesAttributeDepositBase: Balance = 1 * MILLI_UNIT;
pub const UniquesDepositPerByte: Balance = MICRO_UNIT;
```

**DEPOIS:**
```rust
pub const UniquesCollectionDeposit: Balance = 10 * MILLI_BZR;
pub const UniquesItemDeposit: Balance = 1 * MILLI_BZR;
pub const UniquesMetadataDepositBase: Balance = 1 * MILLI_BZR;
pub const UniquesAttributeDepositBase: Balance = 1 * MILLI_BZR;
pub const UniquesDepositPerByte: Balance = MICRO_BZR;
```

---

### PASSO 3: Bump runtime version

**Arquivo:** `/root/bazari-chain/runtime/src/lib.rs`

**Localização:** Linha ~72-82 (VERSION constant)

**ANTES:**
```rust
pub const VERSION: RuntimeVersion = RuntimeVersion {
    spec_name: create_runtime_str!("solochain-template-runtime"),
    impl_name: create_runtime_str!("solochain-template-runtime"),
    authoring_version: 1,
    spec_version: 100,
    impl_version: 1,
    apis: RUNTIME_API_VERSIONS,
    transaction_version: 1,
    state_version: 1,
};
```

**DEPOIS:**
```rust
pub const VERSION: RuntimeVersion = RuntimeVersion {
    spec_name: create_runtime_str!("bazari-runtime"),  // Renomear também
    impl_name: create_runtime_str!("bazari-runtime"),
    authoring_version: 1,
    spec_version: 101,  // ← INCREMENTAR (breaking change)
    impl_version: 1,
    apis: RUNTIME_API_VERSIONS,
    transaction_version: 1,
    state_version: 1,
};
```

**⚠️ CRÍTICO:**
- `spec_version` DEVE ser incrementado
- `spec_name` renomear é opcional mas recomendado
- Sem este bump, node não reconhece novo runtime

---

### PASSO 4: Atualizar chain spec properties

**Arquivo:** `/root/bazari-chain/node/src/chain_spec.rs`

**Localização:** Procurar funções `development_config()`, `local_testnet_config()`

**Adicionar properties:**
```rust
use sp_core::sr25519;
use solochain_template_runtime::{TOKEN_SYMBOL, TOKEN_NAME, TOKEN_DECIMALS};

pub fn development_config() -> Result<ChainSpec, String> {
    let wasm_binary = WASM_BINARY.ok_or_else(|| "WASM not available".to_string())?;

    Ok(ChainSpec::from_genesis(
        // Nome da chain
        "Development",
        // ID da chain
        "dev",
        ChainType::Development,
        move || {
            testnet_genesis(
                // ... argumentos existentes
            )
        },
        // Bootnodes
        vec![],
        // Telemetry
        None,
        // Protocol ID
        None,
        // Fork ID
        None,
        // Properties ← ADICIONAR AQUI
        Some({
            let mut properties = sc_chain_spec::Properties::new();
            properties.insert("tokenSymbol".into(), TOKEN_SYMBOL.into());
            properties.insert("tokenName".into(), TOKEN_NAME.into());
            properties.insert("tokenDecimals".into(), TOKEN_DECIMALS.into());
            properties.insert("ss58Format".into(), 42.into()); // Substrate generic
            properties
        }),
        // Extensions
        None,
    ))
}
```

**Repetir para:**
- `local_testnet_config()`
- Qualquer outra config (staging, production se existirem)

---

### PASSO 5: Atualizar genesis comments

**Arquivo:** `/root/bazari-chain/runtime/src/genesis_config_presets.rs`

**Localização:** Linha ~38

**ANTES:**
```rust
balances: BalancesConfig {
    balances: endowed_accounts
        .iter()
        .cloned()
        .map(|k| (k, 1u128 << 60))
        .collect(),
},
```

**DEPOIS:**
```rust
balances: BalancesConfig {
    balances: endowed_accounts
        .iter()
        .cloned()
        // Initial balance: 2^60 planck ≈ 1,152.92 BZR per account
        .map(|k| (k, 1u128 << 60))
        .collect(),
},
```

---

### PASSO 6: Compilar e verificar

```bash
cd /root/bazari-chain

# 1. Limpar build anterior
cargo clean

# 2. Compilar runtime
cargo build --release

# Deve compilar SEM ERROS
# Warnings sobre deprecated UNIT/MILLI_UNIT são OK (vamos remover depois)
```

**Se der erro de compilação:**
1. Ler mensagem de erro
2. Procurar outras referências a UNIT/MILLI_UNIT/MICRO_UNIT
3. Substituir por BZR/MILLI_BZR/MICRO_BZR
4. Repetir até compilar

**Possíveis erros:**
- `error: cannot find value UNIT in this scope` → Faltou atualizar algum import
- `error: cannot find value MILLI_UNIT` → Mesmo acima
- Verificar pallets customizados (stores, bazari-identity, universal-registry)

---

### PASSO 7: Rodar testes unitários

```bash
# Rodar todos os testes
cargo test

# Se algum falhar, investigar
cargo test -- --nocapture  # Ver output detalhado
```

**Testes que podem quebrar:**
- Testes que verificam valores hardcoded de "UNIT"
- Testes que importam constantes antigas

**Como corrigir:**
```rust
// ANTES
use crate::{UNIT, MILLI_UNIT};

// DEPOIS
use crate::{BZR, MILLI_BZR};

// ANTES
assert_eq!(balance, 100 * UNIT);

// DEPOIS
assert_eq!(balance, 100 * BZR);
```

---

### PASSO 8: Testar node local

```bash
# Rodar node em modo dev (limpa database)
./target/release/solochain-template-node --dev --tmp

# Deve iniciar sem erros
# Output esperado:
# ... Running in --dev mode ...
# ... [Runtime] spec_version: 101 ...  ← Confirmar versão bumped
# ... [Consensus] Prepared block for proposing ...
```

**Validações:**
1. Node inicia sem panic
2. Produz blocos normalmente
3. Runtime version mostra 101

---

### PASSO 9: Validar com Polkadot.js Apps

**Abrir:** https://polkadot.js.org/apps/?rpc=ws://127.0.0.1:9944

**Validar:**

1. **Metadata correto:**
   - Settings → Metadata
   - Verificar `tokenSymbol: BZR`
   - Verificar `tokenDecimals: 12`

2. **Constantes visíveis:**
   - Developer → Chain State → Constants
   - Procurar `balances` ou constantes customizadas
   - Valores devem usar BZR (ex: 10 BZR deposit)

3. **Transação funciona:**
   - Accounts → Transfer
   - Enviar 1 BZR para outro endereço
   - Taxa deve mostrar em BZR
   - Balance deve decrementar corretamente

4. **Explorer mostra BZR:**
   - Explorer → Recent blocks
   - Ver se extrinsics mostram "BZR" não "UNIT"

---

## ✅ CRITÉRIOS DE ACEITAÇÃO

### Compilação e Testes:
- [ ] `cargo build --release` compila sem erros
- [ ] `cargo test` todos passam (0 falhas)
- [ ] Sem warnings críticos (deprecated OK temporariamente)

### Runtime:
- [ ] Runtime VERSION.spec_version = 101
- [ ] Constantes BZR, MILLI_BZR, MICRO_BZR definidas
- [ ] Metadata TOKEN_SYMBOL, TOKEN_NAME, TOKEN_DECIMALS expostos
- [ ] Aliases deprecated (UNIT, MILLI_UNIT, MICRO_UNIT) funcionam

### Node:
- [ ] Node inicia em --dev mode sem erros
- [ ] Produz blocos normalmente
- [ ] Chain spec tem properties corretas

### Polkadot.js Apps:
- [ ] Metadata mostra tokenSymbol: "BZR"
- [ ] Metadata mostra tokenDecimals: 12
- [ ] Balances mostram em BZR não UNIT
- [ ] Transações funcionam (enviar/receber)
- [ ] Taxas calculadas corretamente
- [ ] Explorer renderiza "BZR"

### Funcionalidade:
- [ ] Pallet-balances funciona (transfer, set_balance)
- [ ] Existential deposit funciona (0.001 BZR)
- [ ] Pallets customizados compilam e funcionam
- [ ] Nenhuma regressão em features existentes

---

## 🧪 TESTES MANUAIS

### Teste 1: Transfer BZR
```
1. Alice envia 10 BZR para Bob
2. Verificar balance Alice decrementou 10 BZR + taxa
3. Verificar balance Bob incrementou 10 BZR
4. Verificar evento Balances.Transfer emitido com valor correto
```

### Teste 2: Existential Deposit
```
1. Alice envia EXATAMENTE existential deposit (0.001 BZR) para Charlie (conta nova)
2. Verificar Charlie recebe e conta criada
3. Tentar enviar MENOS que 0.001 BZR para Dave (conta nova)
4. Deve falhar com erro ExistentialDeposit
```

### Teste 3: Pallets Customizados
```
1. Criar Store (pallet-stores)
2. Verificar deposit cobrado em BZR
3. Criar Identity (pallet-bazari-identity)
4. Verificar funciona normalmente
5. Criar NFT (pallet-uniques)
6. Verificar deposits (10 MILLI_BZR collection, 1 MILLI_BZR item)
```

---

## 🔄 ROLLBACK PLAN

**Se algo der muito errado:**

```bash
# 1. Voltar para commit anterior
git checkout HEAD~1

# 2. Recompilar
cargo build --release

# 3. Rodar node novamente
./target/release/solochain-template-node --dev --tmp
```

**Para preservar dados (testnet):**
- NÃO usar --tmp
- Fazer backup de `~/.local/share/solochain-template-node/chains/dev/`
- Se runtime incompatível, deletar database: `rm -rf ~/.local/share/solochain-template-node/chains/dev/db/`

---

## 📊 CHECKLIST DE QUALIDADE

### Código:
- [ ] Todas constantes UNIT renomeadas para BZR
- [ ] Imports atualizados
- [ ] Comments atualizados
- [ ] Nenhum "UNIT" hardcoded em strings
- [ ] Aliases deprecated adicionados
- [ ] Runtime version bumped

### Testes:
- [ ] Unit tests passam
- [ ] Integration tests passam (se houver)
- [ ] Testes manuais executados e documentados

### Documentação:
- [ ] README atualizado (se menciona UNIT)
- [ ] Comments em código claros
- [ ] Changelog entry criada (se houver CHANGELOG.md)

### Validação:
- [ ] Testnet local funciona
- [ ] Polkadot.js Apps conecta e mostra BZR
- [ ] Nenhuma funcionalidade quebrada
- [ ] Performance igual (nenhuma degradação)

---

## 🚨 TROUBLESHOOTING

### Problema: Compilation error "cannot find value UNIT"
**Causa:** Import não atualizado
**Solução:**
```bash
# Buscar todas ocorrências
grep -r "UNIT" runtime/src/

# Substituir manualmente ou:
find runtime/src/ -name "*.rs" -exec sed -i 's/MILLI_UNIT/MILLI_BZR/g' {} \;
find runtime/src/ -name "*.rs" -exec sed -i 's/MICRO_UNIT/MICRO_BZR/g' {} \;
find runtime/src/ -name "*.rs" -exec sed -i 's/\bUNIT\b/BZR/g' {} \;
```

### Problema: Tests failing "expected UNIT, got BZR"
**Causa:** Test assertions com valores antigos
**Solução:** Atualizar assertions nos arquivos de teste

### Problema: Polkadot.js Apps mostra "Unit" não "BZR"
**Causa:** Properties não foram adicionadas ao chain spec
**Solução:** Revisar PASSO 4, garantir properties no chain_spec.rs

### Problema: Node não inicia após mudança
**Causa:** Database incompatível com novo runtime
**Solução:**
```bash
# Deletar database antiga
rm -rf ~/.local/share/solochain-template-node/chains/dev/db/

# Rodar com --tmp para testar
./target/release/solochain-template-node --dev --tmp
```

---

## 📦 ENTREGÁVEIS DA FASE 1

Ao completar esta fase, você deve ter:

1. **Código modificado:**
   - runtime/src/lib.rs (constantes + metadata + VERSION)
   - runtime/src/configs/mod.rs (imports + deposits)
   - runtime/src/genesis_config_presets.rs (comments)
   - node/src/chain_spec.rs (properties)

2. **Compilação:**
   - Binary: target/release/solochain-template-node
   - Runtime WASM: target/release/wbuild/.../solochain_template_runtime.compact.compressed.wasm

3. **Testes:**
   - Todos unit tests passando
   - 3+ testes manuais executados e documentados

4. **Validação:**
   - Screenshot Polkadot.js Apps mostrando "BZR"
   - Log de node mostrando spec_version: 101
   - Video/GIF de transação funcionando (opcional)

5. **Documentação:**
   - Changelog entry (o que mudou)
   - Issues encontrados e resolvidos
   - Tempo real gasto vs estimado

---

## 🎯 PRÓXIMA FASE

**Após completar FASE 1:**
- [ ] Commit changes: `git add . && git commit -m "feat: rename UNIT to BZR throughout runtime"`
- [ ] Tag version: `git tag v0.2.0-bzr-rename`
- [ ] Prosseguir para **FASE 2: BZR Rename (Full-Stack)**

**FASE 2 depende de:**
- Runtime compilando com BZR
- Node rodando em --dev
- Metadata API expondo TOKEN_SYMBOL

**Não prosseguir se:**
- Compilação falha
- Testes falham
- Node não inicia
- Funcionalidades básicas quebradas

---

## 📞 SUPORTE

**Se ficar travado:**
1. Ler mensagem de erro completa
2. Buscar no código fonte: `grep -r "erro" runtime/`
3. Consultar Substrate docs: https://docs.substrate.io
4. Verificar versões: `rustc --version`, `cargo --version`

**Recursos úteis:**
- Substrate Runtime Book: https://paritytech.github.io/polkadot-sdk/master/polkadot_sdk_docs/reference_docs/runtime_vs_smart_contract/index.html
- Polkadot.js API Docs: https://polkadot.js.org/docs/
- Exemplo similar (Acala): Como renomearam ACA token

---

*Especificação criada em: 27/Out/2025*
*Última atualização: 27/Out/2025*
*Status: Pronta para execução*
