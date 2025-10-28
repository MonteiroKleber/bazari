# 🔄 PROPOSTA TÉCNICA - Renomeação UNIT → BZR

**Data:** 27 de Outubro de 2025
**Prioridade:** 🔴 ALTA (Pré-requisito para ZARI)
**Complexidade:** Média
**Tempo estimado:** 2 semanas

---

## 🎯 OBJETIVO

Renomear a moeda nativa da blockchain bazari-chain de **UNIT** (nome genérico do template Substrate) para **BZR** (Bazari Token), refletindo a identidade do projeto em toda a stack (blockchain, backend, frontend).

---

## 📊 ESTADO ATUAL

### Configuração Existente

```rust
// runtime/src/lib.rs (Linhas 101-107)
pub const UNIT: Balance = 1_000_000_000_000;  // 1 trilhão planck
pub const MILLI_UNIT: Balance = 1_000_000_000;  // 1 bilhão planck
pub const MICRO_UNIT: Balance = 1_000_000;     // 1 milhão planck

pub const EXISTENTIAL_DEPOSIT: Balance = MILLI_UNIT;
```

**Problemas:**
- ❌ Símbolo genérico "UNIT" não representa marca Bazari
- ❌ Documentação e código usam nomenclatura de template
- ❌ Frontend pode mostrar "UNIT" em vez de "BZR"
- ❌ Falta metadata API para expor símbolo oficialmente
- ❌ Inconsistência com planejamento (docs falam BZR, código fala UNIT)

---

## 🎨 ESTADO DESEJADO

### Nova Configuração

```rust
// runtime/src/lib.rs
pub const BZR: Balance = 1_000_000_000_000;       // 1 BZR = 1 trilhão planck
pub const MILLI_BZR: Balance = 1_000_000_000;     // 0.001 BZR
pub const MICRO_BZR: Balance = 1_000_000;         // 0.000001 BZR

pub const EXISTENTIAL_DEPOSIT: Balance = MILLI_BZR;

// Metadata oficial
pub const TOKEN_SYMBOL: &str = "BZR";
pub const TOKEN_NAME: &str = "Bazari Token";
pub const TOKEN_DECIMALS: u8 = 12;
```

**Benefícios:**
- ✅ Consistência em toda a stack
- ✅ Identidade visual clara (BZR = Bazari)
- ✅ Metadata acessível via RPC
- ✅ Preparação para listing em exploradores/wallets
- ✅ Profissionalismo (não é "mais um template")

---

## 🗺️ ARQUITETURA DA MUDANÇA

### Camadas Afetadas

```
┌─────────────────────────────────────────┐
│   FRONTEND (/root/bazari)               │
│   - Wallet UI mostra "BZR"              │
│   - Transações formatadas com símbolo   │
│   - API client usa metadata correta     │
└─────────────────────────────────────────┘
              ↓ RPC/API
┌─────────────────────────────────────────┐
│   BACKEND (/root/bazari)                │
│   - APIs retornam "BZR" em responses    │
│   - Validações usam constantes BZR     │
│   - Logs e monitoring com nome correto  │
└─────────────────────────────────────────┘
              ↓ Chain RPC
┌─────────────────────────────────────────┐
│   BLOCKCHAIN (/root/bazari-chain)       │
│   - Runtime: UNIT → BZR constantes      │
│   - Metadata: Expor símbolo via RPC     │
│   - Genesis: Balances em BZR            │
│   - Docs: Atualizar referências         │
└─────────────────────────────────────────┘
```

---

## 📝 IMPLEMENTAÇÃO DETALHADA

### FASE 1: Blockchain Runtime (Semana 1)

#### 1.1 Renomear Constantes

**Arquivo:** `/root/bazari-chain/runtime/src/lib.rs`

**Linhas 101-107 - Antes:**
```rust
pub const UNIT: Balance = 1_000_000_000_000;
pub const MILLI_UNIT: Balance = 1_000_000_000;
pub const MICRO_UNIT: Balance = 1_000_000;

pub const EXISTENTIAL_DEPOSIT: Balance = MILLI_UNIT;
```

**Depois:**
```rust
/// BZR token constants (1 BZR = 10^12 planck)
pub const BZR: Balance = 1_000_000_000_000;
pub const MILLI_BZR: Balance = 1_000_000_000;     // 0.001 BZR
pub const MICRO_BZR: Balance = 1_000_000;         // 0.000001 BZR

/// Minimum balance to keep account alive
pub const EXISTENTIAL_DEPOSIT: Balance = MILLI_BZR;

/// Token metadata
pub const TOKEN_SYMBOL: &str = "BZR";
pub const TOKEN_NAME: &str = "Bazari Token";
pub const TOKEN_DECIMALS: u8 = 12;
```

**Impacto:** Este arquivo é importado por toda a runtime, então mudança aqui propaga automaticamente.

---

#### 1.2 Atualizar Configurações de Pallets

**Arquivo:** `/root/bazari-chain/runtime/src/configs/mod.rs`

**Linha 48 - Importação (Antes):**
```rust
use crate::{EXISTENTIAL_DEPOSIT, MICRO_UNIT, MILLI_UNIT};
```

**Depois:**
```rust
use crate::{EXISTENTIAL_DEPOSIT, MICRO_BZR, MILLI_BZR, BZR};
```

**Linhas 209-216 - Depósitos Uniques (Antes):**
```rust
pub const UniquesCollectionDeposit: Balance = 10 * MILLI_UNIT;
pub const UniquesItemDeposit: Balance = 1 * MILLI_UNIT;
pub const UniquesMetadataDepositBase: Balance = 1 * MILLI_UNIT;
pub const UniquesAttributeDepositBase: Balance = 1 * MILLI_UNIT;
pub const UniquesDepositPerByte: Balance = MICRO_UNIT;
```

**Depois:**
```rust
pub const UniquesCollectionDeposit: Balance = 10 * MILLI_BZR;
pub const UniquesItemDeposit: Balance = 1 * MILLI_BZR;
pub const UniquesMetadataDepositBase: Balance = 1 * MILLI_BZR;
pub const UniquesAttributeDepositBase: Balance = 1 * MILLI_BZR;
pub const UniquesDepositPerByte: Balance = MICRO_BZR;
```

---

#### 1.3 Atualizar Genesis Config

**Arquivo:** `/root/bazari-chain/runtime/src/genesis_config_presets.rs`

**Linha 38 - Comentário (Adicionar):**
```rust
// Initial balances: 2^60 planck ≈ 1,152.92 BZR per account
(k, 1u128 << 60)
```

---

#### 1.4 Adicionar Metadata RPC (NOVO)

**Arquivo:** `/root/bazari-chain/runtime/src/lib.rs`

**Adicionar após linha 107:**
```rust
/// Runtime metadata constants para exposição via RPC
pub mod metadata {
    pub const SYMBOL: &str = super::TOKEN_SYMBOL;
    pub const NAME: &str = super::TOKEN_NAME;
    pub const DECIMALS: u8 = super::TOKEN_DECIMALS;
}
```

**Criar arquivo:** `/root/bazari-chain/runtime/src/apis.rs` (NOVO)

```rust
use frame_support::sp_runtime::traits::Block as BlockT;
use sp_api::impl_runtime_apis;

sp_api::decl_runtime_apis! {
    /// API para obter metadata do token nativo
    pub trait TokenMetadataApi {
        /// Retorna símbolo do token (ex: "BZR")
        fn token_symbol() -> Vec<u8>;

        /// Retorna nome do token (ex: "Bazari Token")
        fn token_name() -> Vec<u8>;

        /// Retorna número de decimais (ex: 12)
        fn token_decimals() -> u8;
    }
}

impl_runtime_apis! {
    impl TokenMetadataApi<Block> for Runtime {
        fn token_symbol() -> Vec<u8> {
            crate::metadata::SYMBOL.as_bytes().to_vec()
        }

        fn token_name() -> Vec<u8> {
            crate::metadata::NAME.as_bytes().to_vec()
        }

        fn token_decimals() -> u8 {
            crate::metadata::DECIMALS
        }
    }
}
```

**Integrar em:** `/root/bazari-chain/runtime/src/lib.rs`

```rust
// No início do arquivo
mod apis;

// No impl_runtime_apis! block (linha ~300+), adicionar:
impl apis::TokenMetadataApi<Block> for Runtime {
    fn token_symbol() -> Vec<u8> {
        crate::metadata::SYMBOL.as_bytes().to_vec()
    }

    fn token_name() -> Vec<u8> {
        crate::metadata::NAME.as_bytes().to_vec()
    }

    fn token_decimals() -> u8 {
        crate::metadata::DECIMALS
    }
}
```

---

#### 1.5 Atualizar Benchmarking

**Arquivo:** `/root/bazari-chain/node/src/command.rs`

**Linha 10 (importação):**
```rust
// Antes
use solochain_template_runtime::{EXISTENTIAL_DEPOSIT, ...};

// Depois - sem mudança (EXISTENTIAL_DEPOSIT continua existindo)
```

**Linha 185 (uso):**
```rust
// Não precisa mudar - usa EXISTENTIAL_DEPOSIT que já foi atualizado internamente
```

---

#### 1.6 Atualizar Chain Spec

**Arquivo:** `/root/bazari-chain/node/src/chain_spec.rs`

**Adicionar metadados:**
```rust
// Após imports (linha ~10)
use solochain_template_runtime::{TOKEN_SYMBOL, TOKEN_NAME, TOKEN_DECIMALS};

// Na função development_config() ou testnet_genesis() (linha ~80+)
pub fn development_config() -> Result<ChainSpec, String> {
    Ok(ChainSpec::builder(
        // ... código existente
    )
    .with_properties({
        let mut properties = sc_chain_spec::Properties::new();
        properties.insert("tokenSymbol".into(), TOKEN_SYMBOL.into());
        properties.insert("tokenName".into(), TOKEN_NAME.into());
        properties.insert("tokenDecimals".into(), TOKEN_DECIMALS.into());
        properties.insert("ss58Format".into(), 42.into()); // Substrate generic
        properties
    })
    .build())
}
```

**Aplicar mesma mudança em:**
- `local_testnet_config()`
- `mainnet_config()` (se existir)

---

#### 1.7 Bump Runtime Version

**Arquivo:** `/root/bazari-chain/runtime/src/lib.rs`

**Linha 72 (VERSION constant):**
```rust
// Antes
pub const VERSION: RuntimeVersion = RuntimeVersion {
    spec_name: create_runtime_str!("solochain-template-runtime"),
    impl_name: create_runtime_str!("solochain-template-runtime"),
    authoring_version: 1,
    spec_version: 100, // ← INCREMENTAR ESTE
    impl_version: 1,
    // ...
};

// Depois
pub const VERSION: RuntimeVersion = RuntimeVersion {
    spec_name: create_runtime_str!("bazari-runtime"), // Renomear também
    impl_name: create_runtime_str!("bazari-runtime"),
    authoring_version: 1,
    spec_version: 101, // ← INCREMENTADO (mudança breaking)
    impl_version: 1,
    // ...
};
```

---

### FASE 2: Backend (Semana 1-2)

#### 2.1 Atualizar Chain Client

**Arquivo:** `/root/bazari/apps/api/src/services/blockchain/client.ts`

**Adicionar helper para metadata:**
```typescript
// Após conectar API
export async function getTokenMetadata() {
  const api = await getApi();

  // Tentar via RPC customizado (se implementado)
  try {
    const symbol = await api.rpc.state.call('TokenMetadataApi_token_symbol', '0x');
    const name = await api.rpc.state.call('TokenMetadataApi_token_name', '0x');
    const decimals = await api.rpc.state.call('TokenMetadataApi_token_decimals', '0x');

    return {
      symbol: hexToString(symbol.toHex()),
      name: hexToString(name.toHex()),
      decimals: hexToU8(decimals.toHex()),
    };
  } catch {
    // Fallback para valores hardcoded
    return {
      symbol: 'BZR',
      name: 'Bazari Token',
      decimals: 12,
    };
  }
}

function hexToString(hex: string): string {
  return Buffer.from(hex.replace('0x', ''), 'hex').toString('utf8');
}

function hexToU8(hex: string): number {
  return parseInt(hex, 16);
}
```

---

#### 2.2 Atualizar APIs que Retornam Balances

**Arquivo:** `/root/bazari/apps/api/src/modules/wallet/wallet.service.ts`

**Buscar todos os lugares onde retorna balance:**
```typescript
// Antes (exemplo)
return {
  address: account.address,
  balance: balanceData.free.toString(),
  // ...
};

// Depois
return {
  address: account.address,
  balance: balanceData.free.toString(),
  symbol: 'BZR', // ← Adicionar
  decimals: 12,  // ← Adicionar
  // ...
};
```

**Aplicar em:**
- `GET /api/wallet/balance`
- `GET /api/accounts/:address`
- `GET /api/p2p/offers` (se mostrar balances)

---

#### 2.3 Atualizar Formatação de Valores

**Arquivo:** `/root/bazari/apps/api/src/utils/format.ts` (criar se não existir)

```typescript
export const BZR_DECIMALS = 12;
export const BZR_SYMBOL = 'BZR';
export const BZR_UNIT = BigInt(10 ** BZR_DECIMALS); // 1 trilhão

/**
 * Converte planck para BZR com formatação
 * @example planckToBZR(1000000000000) => "1.00 BZR"
 */
export function planckToBZR(planck: bigint | string, decimals: number = 2): string {
  const planckBigInt = typeof planck === 'string' ? BigInt(planck) : planck;
  const bzr = Number(planckBigInt) / Number(BZR_UNIT);
  return `${bzr.toFixed(decimals)} ${BZR_SYMBOL}`;
}

/**
 * Converte BZR para planck
 * @example bzrToPlanck(1.5) => 1500000000000n
 */
export function bzrToPlanck(bzr: number): bigint {
  return BigInt(Math.floor(bzr * Number(BZR_UNIT)));
}
```

**Usar em logs e respostas:**
```typescript
console.log(`Balance: ${planckToBZR(balance)}`);
```

---

### FASE 3: Frontend (Semana 2)

#### 3.1 Atualizar Constantes do Wallet

**Arquivo:** `/root/bazari/apps/web/src/lib/blockchain/constants.ts`

```typescript
// Antes (pode não existir explicitamente)
export const DECIMALS = 12;

// Depois
export const TOKEN_SYMBOL = 'BZR';
export const TOKEN_NAME = 'Bazari Token';
export const TOKEN_DECIMALS = 12;
export const PLANCK_PER_TOKEN = BigInt(10 ** TOKEN_DECIMALS);

// Existential deposit (mesmo valor, novo nome)
export const EXISTENTIAL_DEPOSIT = BigInt(1_000_000_000); // 1 MILLI_BZR
```

---

#### 3.2 Atualizar Componentes de Exibição

**Arquivo:** `/root/bazari/apps/web/src/components/wallet/Balance.tsx`

```tsx
// Antes
<div className="text-2xl font-bold">
  {formatBalance(balance)}
</div>

// Depois
import { TOKEN_SYMBOL } from '@/lib/blockchain/constants';

<div className="text-2xl font-bold">
  {formatBalance(balance)} <span className="text-primary">{TOKEN_SYMBOL}</span>
</div>
```

**Criar helper de formatação:**

**Arquivo:** `/root/bazari/apps/web/src/lib/blockchain/format.ts`

```typescript
import { TOKEN_DECIMALS, TOKEN_SYMBOL, PLANCK_PER_TOKEN } from './constants';

export function formatBalance(
  planck: bigint | string,
  options?: {
    decimals?: number;
    showSymbol?: boolean;
    compact?: boolean;
  }
): string {
  const { decimals = 2, showSymbol = true, compact = false } = options || {};

  const planckBigInt = typeof planck === 'string' ? BigInt(planck) : planck;
  const value = Number(planckBigInt) / Number(PLANCK_PER_TOKEN);

  let formatted: string;

  if (compact && value >= 1_000_000) {
    formatted = `${(value / 1_000_000).toFixed(decimals)}M`;
  } else if (compact && value >= 1_000) {
    formatted = `${(value / 1_000).toFixed(decimals)}K`;
  } else {
    formatted = value.toFixed(decimals);
  }

  return showSymbol ? `${formatted} ${TOKEN_SYMBOL}` : formatted;
}

export function parseBalance(bzr: string | number): bigint {
  const value = typeof bzr === 'string' ? parseFloat(bzr) : bzr;
  return BigInt(Math.floor(value * Number(PLANCK_PER_TOKEN)));
}
```

**Usar em todos os componentes:**
- `<WalletBalance />`
- `<TransactionHistory />`
- `<TransferForm />`
- `<P2POfferCard />`

---

#### 3.3 Atualizar Inputs de Valor

**Arquivo:** `/root/bazari/apps/web/src/components/wallet/TransferForm.tsx`

```tsx
<Input
  type="number"
  placeholder="0.00"
  value={amount}
  onChange={(e) => setAmount(e.target.value)}
  // Adicionar sufixo visual
  suffix={<span className="text-muted-foreground">{TOKEN_SYMBOL}</span>}
/>
```

---

#### 3.4 Atualizar Polkadot.js API Config

**Arquivo:** `/root/bazari/apps/web/src/lib/blockchain/api.ts`

```typescript
import { ApiPromise, WsProvider } from '@polkadot/api';
import { TOKEN_SYMBOL, TOKEN_NAME, TOKEN_DECIMALS } from './constants';

// Ao conectar, registrar tipos customizados
export async function connectToChain(wsUrl: string): Promise<ApiPromise> {
  const provider = new WsProvider(wsUrl);

  const api = await ApiPromise.create({
    provider,
    types: {
      // Tipos customizados se houver
    },
    // Sobrescrever metadata de token
    properties: {
      tokenSymbol: TOKEN_SYMBOL,
      tokenDecimals: TOKEN_DECIMALS,
    },
  });

  // Verificar se metadata bateu
  const chainProperties = await api.rpc.system.properties();
  console.log('Chain token:', chainProperties.tokenSymbol.toString()); // Deve mostrar "BZR"

  return api;
}
```

---

#### 3.5 Atualizar Documentação do Usuário

**Arquivo:** `/root/bazari/apps/web/src/pages/help/Glossary.tsx` (se existir)

```tsx
<dl>
  <dt>BZR</dt>
  <dd>
    Token nativo da blockchain Bazari. Usado para taxas de transação,
    staking, e governança. 1 BZR = 10^12 planck.
  </dd>

  <dt>ZARI</dt>
  <dd>
    Token de governança da Bazari DAO. Permite votar em propostas e
    receber recompensas de staking.
  </dd>
</dl>
```

---

### FASE 4: Documentação (Semana 2)

#### 4.1 Atualizar README Principal

**Arquivo:** `/root/bazari-chain/README.md`

```markdown
# Bazari Chain

Blockchain Substrate customizada para economia solidária e P2P.

## Token Nativo: BZR

- **Símbolo:** BZR
- **Nome:** Bazari Token
- **Decimals:** 12
- **Existential Deposit:** 0.001 BZR (1 MILLI_BZR)

## Economia

- **BZR:** Token nativo usado para taxas e segurança da rede
- **ZARI:** Token de governança (pallet-assets, asset ID 1)

## Constantes

```rust
pub const BZR: Balance = 1_000_000_000_000;       // 1 BZR
pub const MILLI_BZR: Balance = 1_000_000_000;     // 0.001 BZR
pub const MICRO_BZR: Balance = 1_000_000;         // 0.000001 BZR
```
```

---

#### 4.2 Atualizar Comentários de Código

**Buscar e substituir em TODO o projeto:**

```bash
# Em /root/bazari-chain
grep -r "UNIT" --include="*.rs" | wc -l  # Ver quantas ocorrências

# Substituir manualmente ou com sed (cuidado!)
# Revisar cada arquivo para não quebrar imports de outros pallets
```

**Comentários a atualizar:**
- `// Unit = ...` → `// BZR = ...`
- `MILLI_UNIT` em comentários → `MILLI_BZR`
- Exemplos em docs que usam "100 UNIT" → "100 BZR"

---

### FASE 5: Testes (Semana 2)

#### 5.1 Testes de Runtime

**Criar:** `/root/bazari-chain/runtime/src/tests/token_metadata.rs`

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use frame_support::assert_ok;

    #[test]
    fn token_constants_correct() {
        assert_eq!(BZR, 1_000_000_000_000);
        assert_eq!(MILLI_BZR, 1_000_000_000);
        assert_eq!(MICRO_BZR, 1_000_000);
        assert_eq!(EXISTENTIAL_DEPOSIT, MILLI_BZR);
    }

    #[test]
    fn token_metadata_correct() {
        assert_eq!(TOKEN_SYMBOL, "BZR");
        assert_eq!(TOKEN_NAME, "Bazari Token");
        assert_eq!(TOKEN_DECIMALS, 12);
    }

    #[test]
    fn runtime_version_bumped() {
        assert!(VERSION.spec_version >= 101, "spec_version deve ser >= 101 após rename");
    }
}
```

**Rodar:**
```bash
cd /root/bazari-chain
cargo test --package solochain-template-runtime
```

---

#### 5.2 Testes de Integração (Frontend)

**Criar:** `/root/bazari/apps/web/src/lib/blockchain/__tests__/format.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { formatBalance, parseBalance } from '../format';
import { TOKEN_SYMBOL } from '../constants';

describe('Token formatting', () => {
  it('should format 1 BZR correctly', () => {
    const oneBZR = BigInt(1_000_000_000_000);
    expect(formatBalance(oneBZR)).toBe(`1.00 ${TOKEN_SYMBOL}`);
  });

  it('should parse BZR to planck correctly', () => {
    expect(parseBalance(1)).toBe(BigInt(1_000_000_000_000));
    expect(parseBalance('1.5')).toBe(BigInt(1_500_000_000_000));
  });

  it('should handle existential deposit', () => {
    const existential = BigInt(1_000_000_000); // MILLI_BZR
    expect(formatBalance(existential)).toBe(`0.00 ${TOKEN_SYMBOL}`); // Arredonda para 2 decimais
    expect(formatBalance(existential, { decimals: 3 })).toBe(`0.001 ${TOKEN_SYMBOL}`);
  });
});
```

---

#### 5.3 Testes Manuais

**Checklist pré-deploy:**

- [ ] **Blockchain:**
  - [ ] Compilar runtime: `cargo build --release`
  - [ ] Rodar node local: `./target/release/solochain-template-node --dev --tmp`
  - [ ] Conectar Polkadot.js Apps
  - [ ] Verificar metadata: Settings → Metadata → tokenSymbol = "BZR"
  - [ ] Criar transação e ver taxa em BZR
  - [ ] Verificar balance mostra "BZR" não "UNIT"

- [ ] **Backend:**
  - [ ] `GET /api/wallet/balance` retorna `{ ..., symbol: "BZR" }`
  - [ ] Logs mostram "BZR" não "UNIT"
  - [ ] Formatação de valores usa helpers corretos

- [ ] **Frontend:**
  - [ ] Wallet mostra "X.XX BZR"
  - [ ] Inputs têm sufixo "BZR"
  - [ ] Transações históricas mostram "BZR"
  - [ ] Help/Glossário explica BZR

---

## 🚨 RISCOS E MITIGAÇÕES

### Risco 1: Quebrar código existente que importa UNIT
**Probabilidade:** Alta
**Impacto:** Alto
**Mitigação:**
- Manter alias temporário: `pub const UNIT: Balance = BZR;` (deprecado)
- Buscar todos `use crate::UNIT` e substituir
- Compiler vai avisar sobre imports não resolvidos

**Código de compatibilidade temporária:**
```rust
// runtime/src/lib.rs
#[deprecated(note = "Use BZR instead")]
pub const UNIT: Balance = BZR;

#[deprecated(note = "Use MILLI_BZR instead")]
pub const MILLI_UNIT: Balance = MILLI_BZR;

#[deprecated(note = "Use MICRO_BZR instead")]
pub const MICRO_UNIT: Balance = MICRO_BZR;
```

**Remover após 2-3 releases.**

---

### Risco 2: Frontend cache mostra "UNIT" antigo
**Probabilidade:** Média
**Impacto:** Baixo (cosmético)
**Mitigação:**
- Force cache clear no deploy: Adicionar versão query param
- Atualizar service worker se houver
- Comunicar usuários para refresh

---

### Risco 3: Testnet precisa de wipe (perder dados)
**Probabilidade:** Alta
**Impacto:** Baixo (testnet)
**Mitigação:**
- Comunicar com antecedência
- Exportar dados importantes (seeds, ofertas P2P)
- Documentar processo de restore

**Wipe necessário?**
- ❌ Não para mudar constantes (compile-time)
- ✅ Sim se mudar genesis (runtime spec name)
- ⚠️ Recomendado para consistência (fresh start com BZR)

---

### Risco 4: Exploradores externos (Polkadot.js Apps) não reconhecem
**Probabilidade:** Baixa
**Impacto:** Médio
**Mitigação:**
- Adicionar propriedades no chain spec (já incluso acima)
- Customizar types para Polkadot.js se necessário
- Documentar configuração para usuários

**Custom types (se necessário):**
```json
{
  "Address": "MultiAddress",
  "LookupSource": "MultiAddress",
  "TokenSymbol": {
    "_enum": ["BZR", "ZARI"]
  }
}
```

---

## 📦 CHECKLIST DE IMPLEMENTAÇÃO

### Preparação
- [ ] Criar branch `feature/rename-unit-to-bzr`
- [ ] Backup de testnet atual
- [ ] Comunicar mudança para usuários testnet

### Blockchain (Semana 1)
- [ ] Renomear constantes UNIT → BZR em `runtime/src/lib.rs`
- [ ] Atualizar imports em `runtime/src/configs/mod.rs`
- [ ] Adicionar metadata constants (TOKEN_SYMBOL, etc)
- [ ] Criar RPC API para metadata (opcional mas recomendado)
- [ ] Atualizar chain spec com properties
- [ ] Bump runtime spec_version (100 → 101)
- [ ] Renomear runtime spec_name se desejado
- [ ] Atualizar genesis comments
- [ ] Compilar: `cargo build --release`
- [ ] Rodar testes: `cargo test`

### Backend (Semana 1-2)
- [ ] Criar helpers de formatação (planckToBZR, etc)
- [ ] Atualizar APIs que retornam balances
- [ ] Adicionar metadata fetch do chain
- [ ] Atualizar logs e monitoring
- [ ] Testes unitários de formatação

### Frontend (Semana 2)
- [ ] Criar constantes (TOKEN_SYMBOL, etc)
- [ ] Criar helpers formatBalance/parseBalance
- [ ] Atualizar componentes de exibição
- [ ] Atualizar inputs de valor
- [ ] Atualizar Polkadot.js config
- [ ] Atualizar documentação help/FAQ
- [ ] Testes unitários

### Documentação (Semana 2)
- [ ] Atualizar README principal
- [ ] Atualizar comentários de código
- [ ] Criar migration guide para devs
- [ ] Atualizar diagramas se houver

### Testes (Semana 2)
- [ ] Testes unitários runtime
- [ ] Testes integração backend
- [ ] Testes unitários frontend
- [ ] Testes manuais E2E
- [ ] Validar em testnet limpo

### Deploy
- [ ] Merge para branch develop
- [ ] Deploy testnet
- [ ] Validar funcionamento
- [ ] Comunicar sucesso
- [ ] Merge para main (após validação)

---

## 💰 CUSTO ESTIMADO

| Atividade | Horas | Taxa | Subtotal |
|-----------|-------|------|----------|
| Blockchain dev | 16h | R$ 150 | R$ 2.400 |
| Backend updates | 8h | R$ 120 | R$ 960 |
| Frontend updates | 12h | R$ 100 | R$ 1.200 |
| Testes e validação | 8h | R$ 100 | R$ 800 |
| Documentação | 4h | R$ 80 | R$ 320 |
| **TOTAL** | **48h** | | **R$ 5.680** |

**Tempo real:** 2 semanas (com 1 dev full-time pode fazer em 1.5 semanas)

---

## 📊 IMPACTO vs ESFORÇO

```
Alto Impacto
    ↑
    │  ┌─────────────┐
    │  │ FAZER AGORA │ ← Renomear BZR
    │  └─────────────┘
    │
    │
    │
    ├──────────────────────────→ Alto Esforço
    │
Baixo│
```

**Justificativa para FAZER AGORA:**
- ✅ Impacto alto (branding, profissionalismo, consistência)
- ✅ Esforço médio-baixo (48h, R$ 5.6k)
- ✅ Pré-requisito para ZARI (evita confusão de 2 tokens com nome errado)
- ✅ Melhor fazer ANTES de mainnet (evita migração complexa)

---

## 🔄 ALTERNATIVAS CONSIDERADAS

### Alternativa 1: Não renomear, manter UNIT
**Pros:**
- Sem trabalho
- Sem risco

**Cons:**
- ❌ Inconsistência grave (docs falam BZR, código fala UNIT)
- ❌ Falta de identidade visual
- ❌ Confusão ao adicionar ZARI ("qual é qual?")
- ❌ Não profissional (sinal de projeto template não customizado)

**Decisão:** ❌ REJEITADA

---

### Alternativa 2: Renomear só no frontend
**Pros:**
- Mais rápido (só UI)
- Sem mudança blockchain

**Cons:**
- ❌ Inconsistência técnica (blockchain diz UNIT, UI mostra BZR)
- ❌ Exploradores mostram UNIT
- ❌ Logs e APIs confusos
- ❌ Metadata errada

**Decisão:** ❌ REJEITADA

---

### Alternativa 3: Renomear completo (RECOMENDADO)
**Pros:**
- ✅ Consistência total
- ✅ Profissionalismo
- ✅ Metadata correto
- ✅ Preparação para ZARI

**Cons:**
- Requer trabalho (48h)
- Pequeno risco de quebra

**Decisão:** ✅ **APROVADA**

---

## 📅 CRONOGRAMA DETALHADO

### Semana 1: Blockchain + Backend

**Dia 1-2: Blockchain Core**
- Manhã: Renomear constantes, adicionar metadata
- Tarde: Atualizar imports, configurações pallets
- Noite: Compilar, resolver erros

**Dia 3: Blockchain Metadata API**
- Manhã: Criar RPC customizado (opcional)
- Tarde: Atualizar chain spec
- Noite: Testar em node local

**Dia 4-5: Backend**
- Manhã: Helpers de formatação
- Tarde: Atualizar APIs
- Noite: Testes unitários

---

### Semana 2: Frontend + Deploy

**Dia 6-7: Frontend Core**
- Manhã: Constantes e helpers
- Tarde: Atualizar componentes
- Noite: Testes visuais

**Dia 8: Frontend Polish**
- Manhã: Inputs e validações
- Tarde: Documentação help/FAQ
- Noite: Testes unitários

**Dia 9: Testes Integração**
- Manhã: E2E tests
- Tarde: Testar em testnet limpo
- Noite: Bug fixes

**Dia 10: Deploy**
- Manhã: Merge + deploy testnet
- Tarde: Validação final
- Noite: Comunicação + retrospectiva

---

## ✅ CRITÉRIOS DE SUCESSO

**Deve ter:**
- [ ] Runtime compila sem warnings
- [ ] Todos testes passam (unit + integration)
- [ ] Polkadot.js Apps mostra "BZR" em metadata
- [ ] Frontend mostra "BZR" em todos lugares
- [ ] Nenhum "UNIT" visível para usuário final
- [ ] Documentação atualizada
- [ ] Zero downtime em produção (se aplicável)

**Bom ter:**
- [ ] RPC metadata API funcionando
- [ ] Logs estruturados com BZR
- [ ] Monitoramento com métricas BZR
- [ ] Guia de migração para devs externos

---

## 📚 REFERÊNCIAS

**Substrate Docs:**
- [Runtime Constants](https://docs.substrate.io/build/runtime-storage/#constants)
- [Chain Properties](https://docs.substrate.io/build/chain-spec/#adding-chain-properties)
- [Runtime APIs](https://docs.substrate.io/build/custom-rpc/)

**Polkadot.js:**
- [Type Definitions](https://polkadot.js.org/docs/api/start/types.extend)
- [Metadata](https://polkadot.js.org/docs/api/start/basics#metadata)

**Exemplos:**
- Polkadot: DOT, 10 decimais
- Kusama: KSM, 12 decimais
- Acala: ACA, 12 decimais

---

## 🎯 PRÓXIMA AÇÃO

**Aguardando aprovação para:**
- [ ] Começar implementação Semana 1 (Blockchain)
- [ ] Ou manter só em planejamento

**Após esta renomeação:**
→ Próximo passo: Adicionar pallet-assets para ZARI (ver 00-PROXIMOS-PASSOS.md)

---

*Documento criado em: 27/Out/2025*
*Última atualização: 27/Out/2025*
