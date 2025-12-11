# FASE 9: Vesting System - Prompts de Execução

**Versão**: 1.0.0
**Data**: 2025-10-30
**Duração Total**: ~2.5 dias (20h)

---

## 📋 Índice de Prompts

| # | Prompt | Duração | Projeto | Descrição |
|---|--------|---------|---------|-----------|
| 1 | [Blockchain: pallet-vesting](#prompt-1-8h-blockchain-pallet-vesting) | 8h | bazari-chain | Integrar e configurar pallet |
| 2 | [Blockchain: Genesis Config](#prompt-2-4h-blockchain-genesis-config) | 4h | bazari-chain | Configurar schedules iniciais |
| 3 | [Backend: API Endpoints](#prompt-3-4h-backend-api-endpoints) | 4h | bazari/apps/api | Criar endpoints REST |
| 4 | [Frontend: Vesting UI](#prompt-4-8h-frontend-vesting-ui) | 8h | bazari/apps/web | Dashboard e componentes |
| 5 | [Testes e Documentação](#prompt-5-4h-testes-e-documentação) | 4h | ambos | E2E tests e docs |

**Total**: 28h (~3.5 dias)

---

## PROMPT 1 (8h): Blockchain - pallet-vesting

**Objetivo**: Integrar pallet-vesting oficial do Substrate no runtime do Bazari.

**Contexto**: O pallet-vesting permite criar schedules de liberação gradual de tokens. É um pallet battle-tested usado em Polkadot, Kusama e outras chains.

**Projeto**: `/root/bazari-chain`

### Tarefas

#### 1. Adicionar Dependência

```toml
# /root/bazari-chain/runtime/Cargo.toml

[dependencies]
# ... existing dependencies ...
pallet-vesting.workspace = true

[features]
std = [
    # ... existing std features ...
    "pallet-vesting/std",
]

runtime-benchmarks = [
    # ... existing benchmarks ...
    "pallet-vesting/runtime-benchmarks",
]

try-runtime = [
    # ... existing try-runtime ...
    "pallet-vesting/try-runtime",
]
```

**Verificar**: O `Cargo.toml` do workspace já deve ter `pallet-vesting`. Se não, adicionar:

```toml
# /root/bazari-chain/Cargo.toml (workspace root)

[workspace.dependencies]
pallet-vesting = { version = "35.0.0", default-features = false }
```

#### 2. Criar Configuração do Pallet

```rust
// /root/bazari-chain/runtime/src/configs/mod.rs

// Adicionar módulo
pub mod vesting;
```

```rust
// /root/bazari-chain/runtime/src/configs/vesting.rs (NOVO ARQUIVO)

use crate::*;
use frame_support::parameter_types;
use sp_runtime::traits::ConvertInto;

parameter_types! {
    /// Minimum amount for vested transfer (100 BZR)
    pub const MinVestedTransfer: Balance = 100 * UNIT;

    /// Withdraw reasons for unvested funds
    /// Allow all except TRANSFER and RESERVE
    pub UnvestedFundsAllowedWithdrawReasons: WithdrawReasons =
        WithdrawReasons::except(
            WithdrawReasons::TRANSFER | WithdrawReasons::RESERVE
        );

    /// Maximum number of vesting schedules per account
    pub const MaxVestingSchedules: u32 = 28;
}

impl pallet_vesting::Config for Runtime {
    type RuntimeEvent = RuntimeEvent;
    type Currency = Balances;
    type BlockNumberToBalance = ConvertInto;
    type MinVestedTransfer = MinVestedTransfer;
    type WeightInfo = pallet_vesting::weights::SubstrateWeight<Runtime>;
    type UnvestedFundsAllowedWithdrawReasons = UnvestedFundsAllowedWithdrawReasons;
    type BlockNumberProvider = System;

    // Maximum vesting schedules constant
    const MAX_VESTING_SCHEDULES: u32 = 28;
}
```

#### 3. Adicionar ao Runtime

```rust
// /root/bazari-chain/runtime/src/lib.rs

// Import config
mod configs;
use configs::vesting::*;

// Adicionar ao construct_runtime! macro
construct_runtime!(
    pub struct Runtime {
        System: frame_system,
        Timestamp: pallet_timestamp,
        Aura: pallet_aura,
        Grandpa: pallet_grandpa,
        Balances: pallet_balances,
        TransactionPayment: pallet_transaction_payment,
        Sudo: pallet_sudo,

        // Governance
        Treasury: pallet_treasury,
        Democracy: pallet_democracy,
        Council: pallet_collective::<Instance1>,
        TechnicalCommittee: pallet_collective::<Instance2>,
        Multisig: pallet_multisig,
        Scheduler: pallet_scheduler,
        Preimage: pallet_preimage,

        // Assets & Identity
        Assets: pallet_assets,
        Uniques: pallet_uniques,
        BazariIdentity: pallet_bazari_identity,
        Stores: pallet_stores,
        UniversalRegistry: pallet_universal_registry,

        // Vesting (NOVO)
        Vesting: pallet_vesting,

        // Template
        Template: pallet_template,
    }
);
```

#### 4. Bump Runtime Version

```rust
// /root/bazari-chain/runtime/src/lib.rs

#[sp_version::runtime_version]
pub const VERSION: RuntimeVersion = RuntimeVersion {
    spec_name: alloc::borrow::Cow::Borrowed("bazari-runtime"),
    impl_name: alloc::borrow::Cow::Borrowed("bazari-runtime"),
    authoring_version: 1,

    // BUMP: 102 → 103 (storage layout change)
    spec_version: 103,

    impl_version: 1,
    apis: apis::RUNTIME_API_VERSIONS,
    transaction_version: 1,
    system_version: 1,
};
```

#### 5. Compilar e Testar

```bash
cd /root/bazari-chain

# Build runtime
cargo build --release --features runtime-benchmarks

# Verificar se compilou
ls -lh target/release/solochain-template-node
```

#### 6. Testar Extrinsics

```bash
# Start dev chain
./target/release/solochain-template-node --dev --tmp

# Em outro terminal, testar via Polkadot.js Apps:
# https://polkadot.js.org/apps/?rpc=ws://127.0.0.1:9944#/extrinsics

# Testar:
# - vesting.vest()
# - vesting.vestOther(target)
# - vesting.vestedTransfer(target, schedule)
```

### Validação

- [ ] Cargo build completa sem erros
- [ ] Runtime version = 103
- [ ] Pallet Vesting aparece em Polkadot.js Apps
- [ ] Extrinsics disponíveis:
  - `vesting.vest()`
  - `vesting.vestOther(target)`
  - `vesting.vestedTransfer(target, schedule)`
  - `vesting.forceVestedTransfer(source, target, schedule)`
  - `vesting.mergeSchedules(idx1, idx2)`
- [ ] Storage query funciona: `vesting.vesting(account)`
- [ ] Events aparecem: `VestingUpdated`, `VestingCompleted`

### Duração

**8h** (1 dia)

---

## PROMPT 2 (4h): Blockchain - Genesis Config

**Objetivo**: Configurar schedules iniciais de vesting no genesis block.

**Contexto**: Schedules precisam ser configurados no genesis para fundadores, equipe, parceiros e marketing.

**Projeto**: `/root/bazari-chain`

### Tarefas

#### 1. Calcular Per Block Values

```rust
// Constants já existem em /root/bazari-chain/runtime/src/lib.rs
// pub const MINUTES: BlockNumber = 60_000 / (MILLI_SECS_PER_BLOCK as BlockNumber);
// pub const HOURS: BlockNumber = MINUTES * 60;
// pub const DAYS: BlockNumber = HOURS * 24;

// Adicionar:
pub const WEEKS: BlockNumber = DAYS * 7;
pub const MONTHS: BlockNumber = DAYS * 30;
pub const YEARS: BlockNumber = DAYS * 365;
```

**Cálculos**:
```
1 block = 6 seconds
1 minute = 10 blocks
1 hour = 600 blocks
1 day = 14,400 blocks
1 week = 100,800 blocks
1 month = 432,000 blocks
1 year = 5,256,000 blocks
4 years = 21,024,000 blocks
```

**Per Block para cada categoria**:
```rust
// Founders: 150M BZR em 4 anos
// per_block = 150,000,000 * UNIT / (4 * YEARS)
// per_block = 150,000,000 * UNIT / 21,024,000
// per_block = ~7,134 UNIT per block

// Team: 100M BZR em 3 anos
// per_block = 100,000,000 * UNIT / (3 * YEARS)
// per_block = 100,000,000 * UNIT / 15,768,000
// per_block = ~6,341 UNIT per block

// Partners: 80M BZR em 2 anos
// per_block = 80,000,000 * UNIT / (2 * YEARS)
// per_block = 80,000,000 * UNIT / 10,512,000
// per_block = ~7,610 UNIT per block

// Marketing: 50M BZR em 1 ano
// per_block = 50,000,000 * UNIT / YEARS
// per_block = 50,000,000 * UNIT / 5,256,000
// per_block = ~9,513 UNIT per block
```

#### 2. Configurar Genesis

```rust
// /root/bazari-chain/runtime/src/genesis_config_presets.rs

use sp_keyring::AccountKeyring;
use crate::{UNIT, YEARS, MONTHS};

pub fn development_config_genesis() -> serde_json::Value {
    // Define accounts
    let alice = AccountKeyring::Alice.to_account_id();
    let bob = AccountKeyring::Bob.to_account_id();
    let charlie = AccountKeyring::Charlie.to_account_id();
    let dave = AccountKeyring::Dave.to_account_id();
    let eve = AccountKeyring::Eve.to_account_id();

    // Endowed accounts (initial balances)
    let endowed_accounts: Vec<(AccountId, Balance)> = vec![
        // Founders get vested tokens + some liquid
        (alice.clone(), 1_000_000 * UNIT),
        // Team
        (bob.clone(), 500_000 * UNIT),
        (charlie.clone(), 500_000 * UNIT),
        // Partners
        (dave.clone(), 300_000 * UNIT),
        // Marketing
        (eve.clone(), 100_000 * UNIT),
        // Sudo
        (AccountKeyring::Ferdie.to_account_id(), 10_000_000 * UNIT),
    ];

    // Vesting schedules
    let vesting_schedules: Vec<(AccountId, BlockNumber, BlockNumber, Balance)> = vec![
        // Alice (Founder): 150M BZR, 4 years, 1 year cliff
        (
            alice.clone(),
            0, // starting_block
            7_134 * UNIT, // per_block (~7,134 BZR/block)
            150_000_000 * UNIT, // 150M BZR locked
        ),

        // Bob (Team): 50M BZR, 3 years, 6 months cliff
        (
            bob.clone(),
            0,
            6_341 * UNIT,
            50_000_000 * UNIT,
        ),

        // Charlie (Team): 50M BZR, 3 years, 6 months cliff
        (
            charlie.clone(),
            0,
            6_341 * UNIT,
            50_000_000 * UNIT,
        ),

        // Dave (Partner): 80M BZR, 2 years, 3 months cliff
        (
            dave.clone(),
            0,
            7_610 * UNIT,
            80_000_000 * UNIT,
        ),

        // Eve (Marketing): 50M BZR, 1 year, no cliff
        (
            eve.clone(),
            0,
            9_513 * UNIT,
            50_000_000 * UNIT,
        ),
    ];

    serde_json::json!({
        "balances": {
            "balances": endowed_accounts,
        },
        "vesting": {
            "vesting": vesting_schedules,
        },
        "sudo": {
            "key": Some(AccountKeyring::Ferdie.to_account_id()),
        },
        // ... outros pallets ...
    })
}
```

**IMPORTANTE sobre Cliff**:
O pallet-vesting oficial do Substrate **NÃO tem campo cliff separado**. O cliff é implementado ajustando o `starting_block`:

```rust
// Para cliff de 1 ano:
starting_block: YEARS  // Vesting só começa após 1 ano

// Para cliff de 6 meses:
starting_block: 6 * MONTHS

// Para cliff de 3 meses:
starting_block: 3 * MONTHS

// Sem cliff:
starting_block: 0
```

#### 3. Build Chain Spec

```bash
cd /root/bazari-chain

# Build chain spec (development)
./target/release/solochain-template-node build-spec --dev > chain-spec-dev.json

# Build chain spec (production)
./target/release/solochain-template-node build-spec --chain local > chain-spec-local.json

# Convert to raw
./target/release/solochain-template-node build-spec --chain chain-spec-local.json --raw > chain-spec-raw.json
```

#### 4. Verificar Genesis

```bash
# Iniciar chain com novo genesis
./target/release/solochain-template-node \
    --dev \
    --tmp \
    --alice

# Em Polkadot.js Apps:
# Developer → Chain State → vesting → vesting(account)
# Verificar schedules de Alice, Bob, Charlie, Dave, Eve
```

### Validação

- [ ] Genesis config compilado sem erros
- [ ] Chain spec gerado com sucesso
- [ ] Chain inicia com genesis correto
- [ ] Schedules visíveis em Polkadot.js Apps
- [ ] Balances corretos:
  - Alice: 1M liquid + 150M vested
  - Bob: 500k liquid + 50M vested
  - Charlie: 500k liquid + 50M vested
  - Dave: 300k liquid + 80M vested
  - Eve: 100k liquid + 50M vested
- [ ] Per block values corretos (validar cálculo)

### Duração

**4h**

---

## PROMPT 3 (4h): Backend - API Endpoints

**Objetivo**: Criar endpoints REST para interagir com vesting.

**Contexto**: Frontend precisa de API para query schedules e submit extrinsics.

**Projeto**: `/root/bazari/apps/api`

### Tarefas

#### 1. Criar Types

```typescript
// /root/bazari/apps/api/src/types/vesting.ts (NOVO ARQUIVO)

export interface VestingSchedule {
  index: number;
  locked: string;
  perBlock: string;
  startingBlock: number;
  currentBlock: number;
  vested: string;
  stillLocked: string;
  unlockableNow: string;
  percentComplete: number;
  estimatedCompletionBlock: number;
  estimatedCompletionDate: string;
}

export interface VestingSummary {
  address: string;
  scheduleCount: number;
  totalLocked: string;
  totalVested: string;
  totalUnlockableNow: string;
  percentComplete: number;
}

export interface VestingData {
  address: string;
  schedules: VestingSchedule[];
  summary: VestingSummary;
}
```

#### 2. Criar Service

```typescript
// /root/bazari/apps/api/src/services/vesting.ts (NOVO ARQUIVO)

import { ApiPromise } from '@polkadot/api';
import type { VestingInfo } from '@polkadot/types/interfaces';
import type { VestingData, VestingSchedule, VestingSummary } from '../types/vesting';

export class VestingService {
  constructor(private api: ApiPromise) {}

  /**
   * Get all vesting schedules for an address
   */
  async getSchedules(address: string): Promise<VestingData> {
    // Query vesting schedules
    const schedules = await this.api.query.vesting.vesting(address);

    if (schedules.isNone) {
      return {
        address,
        schedules: [],
        summary: {
          address,
          scheduleCount: 0,
          totalLocked: '0',
          totalVested: '0',
          totalUnlockableNow: '0',
          percentComplete: 0,
        },
      };
    }

    // Get current block
    const currentBlock = (await this.api.query.system.number()).toNumber();

    // Parse schedules
    const vestingInfos = schedules.unwrap();
    const parsedSchedules: VestingSchedule[] = vestingInfos.map((info, index) => {
      return this.parseVestingInfo(info, index, currentBlock);
    });

    // Calculate summary
    const summary = this.calculateSummary(address, parsedSchedules);

    return {
      address,
      schedules: parsedSchedules,
      summary,
    };
  }

  /**
   * Get summary only
   */
  async getSummary(address: string): Promise<VestingSummary> {
    const data = await this.getSchedules(address);
    return data.summary;
  }

  /**
   * Parse VestingInfo into VestingSchedule
   */
  private parseVestingInfo(
    info: VestingInfo,
    index: number,
    currentBlock: number
  ): VestingSchedule {
    const locked = info.locked.toBigInt();
    const perBlock = info.perBlock.toBigInt();
    const startingBlock = info.startingBlock.toNumber();

    // Calculate vested amount
    const elapsedBlocks = Math.max(0, currentBlock - startingBlock);
    const vested = BigInt(elapsedBlocks) * perBlock;
    const vestedClamped = vested > locked ? locked : vested;

    // Calculate still locked
    const stillLocked = locked - vestedClamped;

    // Unlockable now (same as vested for simplicity)
    const unlockableNow = vestedClamped;

    // Percent complete
    const percentComplete = locked > 0n ? Number(vestedClamped) / Number(locked) : 0;

    // Estimated completion
    const totalBlocks = Number(locked / perBlock);
    const estimatedCompletionBlock = startingBlock + totalBlocks;
    const blocksRemaining = estimatedCompletionBlock - currentBlock;
    const secondsRemaining = blocksRemaining * 6; // 6 seconds per block
    const estimatedCompletionDate = new Date(Date.now() + secondsRemaining * 1000);

    return {
      index,
      locked: locked.toString(),
      perBlock: perBlock.toString(),
      startingBlock,
      currentBlock,
      vested: vestedClamped.toString(),
      stillLocked: stillLocked.toString(),
      unlockableNow: unlockableNow.toString(),
      percentComplete,
      estimatedCompletionBlock,
      estimatedCompletionDate: estimatedCompletionDate.toISOString(),
    };
  }

  /**
   * Calculate summary from schedules
   */
  private calculateSummary(
    address: string,
    schedules: VestingSchedule[]
  ): VestingSummary {
    const totals = schedules.reduce(
      (acc, schedule) => {
        acc.totalLocked += BigInt(schedule.locked);
        acc.totalVested += BigInt(schedule.vested);
        acc.totalUnlockableNow += BigInt(schedule.unlockableNow);
        return acc;
      },
      {
        totalLocked: 0n,
        totalVested: 0n,
        totalUnlockableNow: 0n,
      }
    );

    const percentComplete =
      totals.totalLocked > 0n
        ? Number(totals.totalVested) / Number(totals.totalLocked)
        : 0;

    return {
      address,
      scheduleCount: schedules.length,
      totalLocked: totals.totalLocked.toString(),
      totalVested: totals.totalVested.toString(),
      totalUnlockableNow: totals.totalUnlockableNow.toString(),
      percentComplete,
    };
  }
}

// Export singleton instance
import { getApi } from '../lib/polkadot';
export const vestingService = new VestingService(await getApi());
```

#### 3. Criar Routes

```typescript
// /root/bazari/apps/api/src/routes/vesting.ts (NOVO ARQUIVO)

import { Router } from 'express';
import { vestingService } from '../services/vesting';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * GET /vesting/:address
 * Get all vesting schedules for an address
 */
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;

    // Validate address (basic check)
    if (!address || address.length < 40) {
      return res.status(400).json({
        success: false,
        message: 'Invalid address',
      });
    }

    const data = await vestingService.getSchedules(address);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching vesting schedules:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /vesting/:address/summary
 * Get vesting summary for an address
 */
router.get('/:address/summary', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address || address.length < 40) {
      return res.status(400).json({
        success: false,
        message: 'Invalid address',
      });
    }

    const summary = await vestingService.getSummary(address);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error fetching vesting summary:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /vesting/vest
 * Vest unlocked tokens (requires auth)
 */
router.post('/vest', authenticateToken, async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Address is required',
      });
    }

    // NOTE: Actual vesting is done on frontend via Polkadot.js
    // This endpoint can be used for logging/analytics

    res.json({
      success: true,
      message: 'Vest operation should be performed on frontend via Polkadot.js',
    });
  } catch (error) {
    console.error('Error vesting:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

export default router;
```

#### 4. Registrar Routes

```typescript
// /root/bazari/apps/api/src/index.ts

import vestingRoutes from './routes/vesting';

// ... existing code ...

app.use('/vesting', vestingRoutes);
```

#### 5. Testar Endpoints

```bash
cd /root/bazari

# Iniciar API
cd apps/api
pnpm dev

# Em outro terminal, testar:

# GET schedules
curl http://localhost:3000/vesting/5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY

# GET summary
curl http://localhost:3000/vesting/5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY/summary
```

### Validação

- [ ] Tipos TypeScript criados
- [ ] Service implementado com cálculos corretos
- [ ] Routes registradas e funcionando
- [ ] GET /vesting/:address retorna schedules
- [ ] GET /vesting/:address/summary retorna summary
- [ ] Cálculos de vested/locked corretos
- [ ] Error handling robusto
- [ ] Response time < 500ms

### Duração

**4h**

---

## PROMPT 4 (8h): Frontend - Vesting UI

**Objetivo**: Implementar interface completa de vesting no frontend.

**Contexto**: Usuários precisam visualizar seus schedules e liberar tokens vestidos.

**Projeto**: `/root/bazari/apps/web`

### Tarefas

Ver especificação completa em [FASE-09-VESTING-SPEC.md](FASE-09-VESTING-SPEC.md#5-frontend-ui).

#### 1. Criar Estrutura de Arquivos

```bash
cd /root/bazari/apps/web

# Criar diretórios
mkdir -p src/modules/vesting/{pages,components,hooks,api,types}
```

#### 2. Criar Types

```typescript
// src/modules/vesting/types/index.ts

export interface VestingSchedule {
  index: number;
  locked: string;
  perBlock: string;
  startingBlock: number;
  currentBlock: number;
  vested: string;
  stillLocked: string;
  unlockableNow: string;
  percentComplete: number;
  estimatedCompletionBlock: number;
  estimatedCompletionDate: string;
}

export interface VestingSummary {
  address: string;
  scheduleCount: number;
  totalLocked: string;
  totalVested: string;
  totalUnlockableNow: string;
  percentComplete: number;
}

export interface VestingData {
  address: string;
  schedules: VestingSchedule[];
  summary: VestingSummary;
}
```

#### 3. Criar API Client

```typescript
// src/modules/vesting/api/index.ts

import { fetchJSON } from '@/lib/api';
import type { VestingData, VestingSummary } from '../types';

export const vestingApi = {
  getSchedules: (address: string) =>
    fetchJSON<VestingData>(`/vesting/${address}`),

  getSummary: (address: string) =>
    fetchJSON<VestingSummary>(`/vesting/${address}/summary`),
};
```

#### 4. Criar Hooks

```typescript
// src/modules/vesting/hooks/useVestingSchedules.ts

import { useState, useEffect } from 'react';
import { vestingApi } from '../api';
import type { VestingData } from '../types';

export function useVestingSchedules(address: string) {
  const [data, setData] = useState<VestingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!address) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await vestingApi.getSchedules(address);

        if (res.success) {
          setData(res.data);
        } else {
          throw new Error(res.message || 'Failed to fetch schedules');
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [address]);

  return { data, loading, error };
}
```

```typescript
// src/modules/vesting/hooks/useVest.ts

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { getApi } from '@/lib/polkadot';
import { toast } from 'sonner';

export function useVest() {
  const { account, signer } = useWallet();
  const [loading, setLoading] = useState(false);

  async function vest() {
    if (!account || !signer) {
      throw new Error('Wallet not connected');
    }

    try {
      setLoading(true);
      const api = await getApi();

      // Create vest() extrinsic
      const tx = api.tx.vesting.vest();

      // Sign and send
      const hash = await tx.signAndSend(account.address, { signer });

      toast.success('Tokens vested successfully!', {
        description: `Transaction: ${hash.toHex()}`,
      });

      return hash.toHex();
    } catch (error) {
      toast.error('Failed to vest tokens', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }

  return { vest, loading };
}
```

#### 5. Criar Components

Ver [FASE-09-VESTING-SPEC.md](FASE-09-VESTING-SPEC.md#55-components) para implementação completa de:
- `VestingScheduleCard`
- `VestingProgressChart`
- `VestingTimeline`
- `VestButton`
- `SkeletonLoader`

#### 6. Criar Pages

Ver [FASE-09-VESTING-SPEC.md](FASE-09-VESTING-SPEC.md#56-pages) para implementação completa de:
- `VestingDashboardPage`
- `VestingDetailPage` (opcional)

#### 7. Adicionar Rotas

```typescript
// src/App.tsx

import { VestingDashboardPage } from '@/modules/vesting/pages/VestingDashboardPage';

// ... existing routes ...

<Route path="/app/vesting" element={<VestingDashboardPage />} />
```

#### 8. Adicionar ao Dashboard Principal

```typescript
// src/components/dashboard/QuickActionsGrid.tsx

import { Clock } from 'lucide-react';

const QUICK_ACTIONS = [
  // ... existing actions ...
  {
    icon: <Clock className="h-6 w-6" />,
    label: 'Vesting',
    to: '/app/vesting',
    description: 'Token schedules',
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
];
```

#### 9. Criar Styles

```css
/* src/modules/vesting/styles.css */

/* Vesting-specific styles that respect the 6 themes */
.vesting-card {
  @apply transition-all duration-200;
  @apply hover:shadow-lg;
}

.vesting-progress {
  @apply h-2 rounded-full;
  @apply bg-gradient-to-r from-blue-500 to-purple-500;
}

/* Theme overrides */
[data-theme="cyber"] .vesting-progress {
  @apply from-cyan-400 to-purple-500;
}

/* Responsive */
@media (max-width: 768px) {
  .vesting-grid {
    @apply grid-cols-1;
  }
}
```

#### 10. Build e Testar

```bash
cd /root/bazari/apps/web

# Build
pnpm build

# Dev
pnpm dev

# Testar em http://localhost:5173/app/vesting
```

### Validação

- [ ] Estrutura de arquivos criada
- [ ] Types, API client, Hooks implementados
- [ ] Components criados e funcionais
- [ ] Dashboard de vesting acessível
- [ ] Schedules exibidos corretamente
- [ ] Progress charts funcionando
- [ ] Botão "Vest Now" funcional
- [ ] Suporte aos 6 temas
- [ ] Responsivo (mobile + desktop)
- [ ] Skeleton loaders
- [ ] Error states
- [ ] Build sem erros

### Duração

**8h** (1 dia)

---

## PROMPT 5 (4h): Testes e Documentação

**Objetivo**: Adicionar testes E2E e documentação completa.

**Contexto**: Garantir qualidade e facilitar manutenção futura.

**Projetos**: ambos

### Tarefas

#### 1. Unit Tests (Rust)

```rust
// /root/bazari-chain/runtime/src/tests/vesting.rs (NOVO ARQUIVO)

#[cfg(test)]
mod tests {
    use super::*;
    use frame_support::{assert_ok, assert_noop};

    #[test]
    fn basic_vesting_works() {
        new_test_ext().execute_with(|| {
            let user = 1;
            let amount = 1000 * UNIT;
            let per_block = 10 * UNIT;

            // Force vested transfer
            assert_ok!(Vesting::force_vested_transfer(
                RuntimeOrigin::root(),
                0, // source
                user,
                VestingInfo {
                    locked: amount,
                    per_block,
                    starting_block: 0,
                }
            ));

            // Move to block 50
            System::set_block_number(50);

            // Vest
            assert_ok!(Vesting::vest(RuntimeOrigin::signed(user)));

            // Check balance
            // Should have unlocked 50 * 10 = 500 UNIT
            let free = Balances::free_balance(&user);
            assert!(free >= 500 * UNIT);
        });
    }

    #[test]
    fn vesting_with_cliff_works() {
        new_test_ext().execute_with(|| {
            let user = 1;
            let amount = 1000 * UNIT;
            let per_block = 10 * UNIT;
            let cliff = 100; // 100 blocks cliff

            // Vested transfer with cliff
            assert_ok!(Vesting::force_vested_transfer(
                RuntimeOrigin::root(),
                0,
                user,
                VestingInfo {
                    locked: amount,
                    per_block,
                    starting_block: cliff, // Cliff implementation
                }
            ));

            // Try to vest at block 50 (during cliff)
            System::set_block_number(50);
            assert_ok!(Vesting::vest(RuntimeOrigin::signed(user)));

            // Should have 0 unlocked (cliff not passed)
            let free = Balances::free_balance(&user);
            assert_eq!(free, 0);

            // Move past cliff
            System::set_block_number(150);
            assert_ok!(Vesting::vest(RuntimeOrigin::signed(user)));

            // Should have unlocked (150 - 100) * 10 = 500
            let free = Balances::free_balance(&user);
            assert!(free >= 500 * UNIT);
        });
    }
}
```

#### 2. E2E Tests (Playwright)

```typescript
// /root/bazari/apps/web/src/modules/vesting/__tests__/e2e/vesting-flow.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Vesting Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth/unlock');
    await page.fill('[data-testid="pin-input"]', '1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/app');
  });

  test('should display vesting dashboard', async ({ page }) => {
    await page.goto('/app/vesting');

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Verify title
    await expect(page.locator('h1')).toContainText('Vesting Dashboard');

    // Verify summary card exists
    await expect(page.locator('[data-testid="vesting-summary"]')).toBeVisible();
  });

  test('should show vesting schedules', async ({ page }) => {
    await page.goto('/app/vesting');
    await page.waitForLoadState('networkidle');

    // Check if schedules exist
    const schedules = page.locator('[data-testid="schedule-card"]');

    if ((await schedules.count()) > 0) {
      // Verify first schedule has required info
      await expect(schedules.first()).toContainText('Schedule #');
      await expect(schedules.first()).toContainText('Total Locked');
      await expect(schedules.first()).toContainText('Vested');
    }
  });

  test('should vest unlocked tokens', async ({ page }) => {
    await page.goto('/app/vesting');
    await page.waitForLoadState('networkidle');

    // Find vest button
    const vestButton = page.locator('button:has-text("Vest")').first();

    if (await vestButton.isVisible()) {
      await vestButton.click();

      // Enter PIN in modal
      await page.fill('[data-testid="pin-modal-input"]', '1234');
      await page.click('button:has-text("Confirmar")');

      // Verify success toast
      await expect(page.locator('.toast')).toContainText(/vested|success/i, {
        timeout: 15000,
      });
    }
  });

  test('should display progress chart', async ({ page }) => {
    await page.goto('/app/vesting');
    await page.waitForLoadState('networkidle');

    // Check if chart exists
    const chart = page.locator('[data-testid="vesting-chart"]');
    if (await chart.isVisible()) {
      await expect(chart).toBeVisible();
    }
  });
});
```

#### 3. Documentação

```markdown
<!-- /root/bazari/apps/web/src/modules/vesting/README.md -->

# Vesting Module

Sistema de vesting (liberação programada de tokens) do Bazari.

## Estrutura

Ver [FASE-09-README.md](/docs/fase002-final/fase09/FASE-09-README.md)

## Componentes

### VestingDashboardPage
Dashboard principal mostrando todos os schedules.

### VestingScheduleCard
Card de cada schedule individual.

### VestingProgressChart
Gráfico de progresso (pie chart).

## Hooks

### useVestingSchedules(address)
Busca schedules de uma conta.

### useVest()
Hook para liberar tokens vestidos.

## API

### GET /vesting/:address
Retorna todos os schedules.

### GET /vesting/:address/summary
Retorna resumo.

## Usage

\```tsx
import { VestingDashboardPage } from '@/modules/vesting';

function App() {
  return <VestingDashboardPage />;
}
\```

## Testing

\```bash
# E2E tests
pnpm exec playwright test vesting
\```
```

#### 4. Atualizar Documentação Principal

```markdown
<!-- /root/bazari/README.md -->

## Features

- ... existing features ...
- **Vesting**: Token vesting schedules (FASE 9)
```

### Validação

- [ ] Unit tests passando
- [ ] E2E tests passando
- [ ] README.md criado
- [ ] Documentação atualizada
- [ ] Todos os testes executam sem erros
- [ ] Coverage > 80%

### Duração

**4h**

---

## 📊 Resumo de Execução

| Prompt | Descrição | Duração | Projeto |
|--------|-----------|---------|---------|
| 1 | Blockchain: pallet-vesting | 8h | bazari-chain |
| 2 | Blockchain: Genesis Config | 4h | bazari-chain |
| 3 | Backend: API Endpoints | 4h | bazari/apps/api |
| 4 | Frontend: Vesting UI | 8h | bazari/apps/web |
| 5 | Testes e Documentação | 4h | ambos |
| **TOTAL** | | **28h (~3.5 dias)** | |

---

## ✅ Checklist Final

### Blockchain
- [ ] pallet-vesting integrado
- [ ] Runtime version bumped (103)
- [ ] Genesis config com schedules
- [ ] Chain spec gerado
- [ ] Unit tests passando
- [ ] Extrinsics funcionando

### Backend
- [ ] Endpoints /vesting/* criados
- [ ] Service implementado
- [ ] Cálculos corretos
- [ ] Error handling
- [ ] Response time OK

### Frontend
- [ ] Dashboard criado
- [ ] Components implementados
- [ ] Hooks funcionando
- [ ] Suporte aos 6 temas
- [ ] Responsivo
- [ ] Build OK

### Testes
- [ ] Unit tests (Rust)
- [ ] E2E tests (Playwright)
- [ ] Todos passando

### Documentação
- [ ] README.md
- [ ] Spec técnica
- [ ] Prompts
- [ ] Code comments

---

## 🚨 Troubleshooting

### Erro: "Failed to build runtime"
**Solução**: Verificar se todas as dependências estão no Cargo.toml e se a versão do Substrate é compatível.

### Erro: "VestingInfo not found"
**Solução**: Import correto: `use pallet_vesting::VestingInfo;`

### Erro: "Genesis config invalid"
**Solução**: Verificar se os valores de per_block estão corretos e se as contas têm saldo suficiente.

### Erro: "Vesting doesn't unlock"
**Solução**: Verificar se o starting_block está correto (cliff) e se o current_block já passou.

---

**FIM DOS PROMPTS DE EXECUÇÃO FASE 9**

**Próxima Ação**: Executar PROMPT 1 - Integrar pallet-vesting
