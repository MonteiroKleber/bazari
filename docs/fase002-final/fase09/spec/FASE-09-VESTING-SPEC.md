# FASE 9: Vesting System - Especificação Técnica

**Versão**: 1.0.0
**Data**: 2025-10-30
**Autor**: Claude Code (Anthropic)

---

## 📑 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Blockchain Implementation](#blockchain-implementation)
4. [Backend API](#backend-api)
5. [Frontend UI](#frontend-ui)
6. [Token Economics](#token-economics)
7. [Security](#security)
8. [Testing Strategy](#testing-strategy)
9. [Deployment](#deployment)
10. [Monitoring](#monitoring)

---

## 1. Visão Geral

### 1.1 Objetivo

Implementar sistema completo de vesting (liberação programada de tokens) na blockchain Bazari, permitindo que tokens sejam bloqueados e liberados gradualmente ao longo do tempo.

### 1.2 Casos de Uso

1. **Founders**: Tokens bloqueados por 4 anos com 1 ano de cliff
2. **Team Members**: Tokens bloqueados por 3 anos com 6 meses de cliff
3. **Partners**: Tokens bloqueados por 2 anos com 3 meses de cliff
4. **Marketing Budget**: Tokens bloqueados por 1 ano sem cliff
5. **Custom Vesting**: Criar schedules customizados via governance

### 1.3 Terminologia

- **Vesting**: Processo de liberação gradual de tokens ao longo do tempo
- **Schedule**: Configuração de um vesting (quantidade, duração, cliff)
- **Cliff**: Período inicial onde nenhum token é liberado
- **Per Block**: Quantidade de tokens liberados por bloco
- **Locked**: Total de tokens ainda bloqueados
- **Vested**: Tokens já disponíveis para unlock
- **Unlocked**: Tokens efetivamente liberados para uso

---

## 2. Arquitetura

### 2.1 Diagrama de Componentes

```
┌──────────────────────────────────────────────────────────┐
│                    User / Frontend                       │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ├─────────► View Schedules (Query)
                 ├─────────► Vest Tokens (Extrinsic)
                 ├─────────► Vested Transfer (Extrinsic)
                 │
┌────────────────▼─────────────────────────────────────────┐
│              Backend API (apps/api)                      │
│  ┌────────────────────────────────────────────────────┐ │
│  │ GET /vesting/:address                              │ │
│  │ GET /vesting/:address/summary                      │ │
│  │ POST /vesting/vest                                 │ │
│  │ POST /vesting/transfer                             │ │
│  └────────────────────────────────────────────────────┘ │
└────────────────┬─────────────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────────────┐
│          Polkadot.js API (@polkadot/api)                 │
│  ┌────────────────────────────────────────────────────┐ │
│  │ api.query.vesting.vesting(account)                 │ │
│  │ api.tx.vesting.vest()                              │ │
│  │ api.tx.vesting.vestedTransfer(...)                 │ │
│  └────────────────────────────────────────────────────┘ │
└────────────────┬─────────────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────────────┐
│               Bazari Chain Runtime                       │
│  ┌────────────────────────────────────────────────────┐ │
│  │ pallet-vesting                                     │ │
│  │  ├─ Storage: Vesting                               │ │
│  │  ├─ Extrinsics: vest, vest_other, ...             │ │
│  │  └─ Events: VestingUpdated, VestingCompleted      │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │ pallet-balances (integration)                      │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

#### Query Flow (Read)
```
Frontend → Backend API → Polkadot.js → Chain Query → Return Data
```

#### Vest Flow (Write)
```
User clicks "Vest Now"
  ↓
Frontend validates available amount
  ↓
Show PIN modal
  ↓
User enters PIN
  ↓
Frontend signs extrinsic
  ↓
Submit to blockchain
  ↓
Chain processes vest() extrinsic
  ↓
Updates storage
  ↓
Emits VestingUpdated event
  ↓
Frontend listens to event
  ↓
Updates UI with new balances
```

---

## 3. Blockchain Implementation

### 3.1 Pallet Configuration

#### Cargo.toml Changes

```toml
# runtime/Cargo.toml

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

#### Runtime Configuration

```rust
// runtime/src/configs/mod.rs

pub mod vesting;

// runtime/src/configs/vesting.rs

use crate::*;
use frame_support::parameter_types;

parameter_types! {
    pub const MinVestedTransfer: Balance = 100 * UNIT; // 100 BZR minimum
    pub UnvestedFundsAllowedWithdrawReasons: WithdrawReasons =
        WithdrawReasons::except(WithdrawReasons::TRANSFER | WithdrawReasons::RESERVE);
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

    // Maximum number of vesting schedules per account
    const MAX_VESTING_SCHEDULES: u32 = 28;
}
```

#### Runtime lib.rs

```rust
// runtime/src/lib.rs

// Add to construct_runtime! macro
construct_runtime!(
    pub struct Runtime {
        // ... existing pallets ...
        Vesting: pallet_vesting,
    }
);
```

### 3.2 VestingInfo Structure

```rust
pub struct VestingInfo<Balance, BlockNumber> {
    /// Locked amount (total to vest)
    pub locked: Balance,

    /// Amount unlocked per block
    pub per_block: Balance,

    /// Starting block for vesting
    pub starting_block: BlockNumber,
}
```

**Cálculos**:
```rust
// Total vested até o bloco atual
let elapsed_blocks = current_block.saturating_sub(starting_block);
let vested = elapsed_blocks.saturating_mul(per_block);

// Locked amount atual
let still_locked = locked.saturating_sub(vested);

// Unlockable agora
let unlockable = vested.min(locked);
```

### 3.3 Storage

```rust
#[pallet::storage]
pub type Vesting<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    T::AccountId,
    BoundedVec<VestingInfo<BalanceOf<T>, BlockNumberFor<T>>, MaxVestingSchedulesGet<T>>,
    OptionQuery,
>;
```

**Nota**: Um account pode ter múltiplos schedules (máximo 28).

### 3.4 Extrinsics

#### vest()
```rust
#[pallet::call]
impl<T: Config> Pallet<T> {
    /// Unlock any vested funds of the sender account.
    ///
    /// Weight: O(1)
    #[pallet::weight(T::WeightInfo::vest_unlocked(1).max(T::WeightInfo::vest_locked(1)))]
    pub fn vest(origin: OriginFor<T>) -> DispatchResult {
        let who = ensure_signed(origin)?;
        Self::do_vest(who)
    }
}
```

#### vest_other(target)
```rust
/// Unlock any vested funds of a `target` account.
///
/// Weight: O(1)
#[pallet::weight(T::WeightInfo::vest_other_unlocked(1).max(T::WeightInfo::vest_other_locked(1)))]
pub fn vest_other(
    origin: OriginFor<T>,
    target: AccountIdLookupOf<T>,
) -> DispatchResult {
    ensure_signed(origin)?;
    let target = T::Lookup::lookup(target)?;
    Self::do_vest(target)
}
```

#### vested_transfer(target, schedule)
```rust
/// Create a vested transfer.
///
/// Weight: O(1)
#[pallet::weight(T::WeightInfo::vested_transfer())]
pub fn vested_transfer(
    origin: OriginFor<T>,
    target: AccountIdLookupOf<T>,
    schedule: VestingInfo<BalanceOf<T>, BlockNumberFor<T>>,
) -> DispatchResult {
    let transactor = ensure_signed(origin)?;
    let target = T::Lookup::lookup(target)?;

    ensure!(
        schedule.locked >= T::MinVestedTransfer::get(),
        Error::<T>::AmountLow
    );

    // Transfer locked amount to target
    <T::Currency as Currency<_>>::transfer(
        &transactor,
        &target,
        schedule.locked,
        ExistenceRequirement::AllowDeath,
    )?;

    // Add vesting schedule to target
    Self::add_vesting_schedule(&target, schedule.locked, schedule.per_block, schedule.starting_block)?;

    Ok(())
}
```

#### force_vested_transfer(source, target, schedule)
```rust
/// Force a vested transfer (sudo only).
///
/// Weight: O(1)
#[pallet::weight(T::WeightInfo::force_vested_transfer())]
pub fn force_vested_transfer(
    origin: OriginFor<T>,
    source: AccountIdLookupOf<T>,
    target: AccountIdLookupOf<T>,
    schedule: VestingInfo<BalanceOf<T>, BlockNumberFor<T>>,
) -> DispatchResult {
    ensure_root(origin)?;

    let source = T::Lookup::lookup(source)?;
    let target = T::Lookup::lookup(target)?;

    // Similar to vested_transfer but with root origin
    // ...
}
```

#### merge_schedules(idx1, idx2)
```rust
/// Merge two vesting schedules together.
///
/// Weight: O(1)
#[pallet::weight(T::WeightInfo::merge_schedules(1))]
pub fn merge_schedules(
    origin: OriginFor<T>,
    schedule1_index: u32,
    schedule2_index: u32,
) -> DispatchResult {
    let who = ensure_signed(origin)?;

    // Get schedules
    let schedules = Self::vesting(&who).ok_or(Error::<T>::NotVesting)?;

    ensure!(schedule1_index < schedules.len() as u32, Error::<T>::ScheduleIndexOutOfBounds);
    ensure!(schedule2_index < schedules.len() as u32, Error::<T>::ScheduleIndexOutOfBounds);
    ensure!(schedule1_index != schedule2_index, Error::<T>::InvalidScheduleIndex);

    // Merge logic
    // ...
}
```

### 3.5 Events

```rust
#[pallet::event]
#[pallet::generate_deposit(pub(super) fn deposit_event)]
pub enum Event<T: Config> {
    /// The amount vested has been updated.
    VestingUpdated {
        account: T::AccountId,
        unvested: BalanceOf<T>,
    },

    /// An account has become fully vested.
    VestingCompleted {
        account: T::AccountId,
    },
}
```

### 3.6 Errors

```rust
#[pallet::error]
pub enum Error<T> {
    /// The account given is not vesting.
    NotVesting,

    /// The account already has `MaxVestingSchedules` count of schedules.
    AtMaxVestingSchedules,

    /// Amount being transferred is too low to create a vesting schedule.
    AmountLow,

    /// An index was out of bounds of the vesting schedules.
    ScheduleIndexOutOfBounds,

    /// Failed to create a new schedule because some parameter was invalid.
    InvalidScheduleParams,
}
```

### 3.7 Genesis Configuration

```rust
// runtime/src/genesis_config_presets.rs

use sp_keyring::AccountKeyring;

pub fn development_config_genesis() -> serde_json::Value {
    let endowed_accounts: Vec<AccountId> = vec![
        AccountKeyring::Alice.to_account_id(),
        AccountKeyring::Bob.to_account_id(),
        AccountKeyring::Charlie.to_account_id(),
        AccountKeyring::Dave.to_account_id(),
        AccountKeyring::Eve.to_account_id(),
        AccountKeyring::Ferdie.to_account_id(),
    ];

    // Founder (Alice) - 150M BZR, 4 years, 1 year cliff
    let alice_vesting = vec![(
        AccountKeyring::Alice.to_account_id(),
        0u64, // starting_block
        1, // per_block (will be calculated correctly)
        150_000_000 * UNIT, // 150M BZR
    )];

    // Team (Bob, Charlie) - 100M BZR split, 3 years, 6 months cliff
    let team_vesting = vec![
        (
            AccountKeyring::Bob.to_account_id(),
            0u64,
            1,
            50_000_000 * UNIT,
        ),
        (
            AccountKeyring::Charlie.to_account_id(),
            0u64,
            1,
            50_000_000 * UNIT,
        ),
    ];

    serde_json::json!({
        "balances": {
            "balances": endowed_accounts.iter()
                .map(|k| (k.clone(), 1_000_000 * UNIT))
                .collect::<Vec<_>>(),
        },
        "vesting": {
            "vesting": [alice_vesting, team_vesting].concat(),
        },
        // ... other pallets ...
    })
}
```

### 3.8 Runtime Version Bump

```rust
// runtime/src/lib.rs

#[sp_version::runtime_version]
pub const VERSION: RuntimeVersion = RuntimeVersion {
    spec_name: alloc::borrow::Cow::Borrowed("bazari-runtime"),
    impl_name: alloc::borrow::Cow::Borrowed("bazari-runtime"),
    authoring_version: 1,
    // Bump spec_version because of storage layout change
    spec_version: 103, // 102 → 103
    impl_version: 1,
    apis: apis::RUNTIME_API_VERSIONS,
    transaction_version: 1,
    system_version: 1,
};
```

---

## 4. Backend API

### 4.1 Endpoints

#### GET /vesting/:address

**Description**: Obter todos os schedules de vesting de uma conta.

**Request**:
```
GET /vesting/5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
```

**Response**:
```json
{
  "success": true,
  "data": {
    "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    "schedules": [
      {
        "index": 0,
        "locked": "150000000000000000000", // 150M BZR in planck
        "perBlock": "948000000000000",      // ~948 BZR per block
        "startingBlock": 0,
        "currentBlock": 1000000,
        "vested": "948000000000000000000",  // Already vested
        "stillLocked": "149052000000000000000", // Still locked
        "unlockableNow": "948000000000000000000",
        "percentComplete": 0.63,
        "estimatedCompletionBlock": 158227848,
        "estimatedCompletionDate": "2029-01-01T00:00:00Z"
      }
    ],
    "summary": {
      "totalLocked": "150000000000000000000",
      "totalVested": "948000000000000000000",
      "totalUnlockable": "948000000000000000000",
      "totalStillLocked": "149052000000000000000"
    }
  }
}
```

#### GET /vesting/:address/summary

**Description**: Resumo simplificado do vesting.

**Request**:
```
GET /vesting/5GrwvaEF.../summary
```

**Response**:
```json
{
  "success": true,
  "data": {
    "address": "5GrwvaEF...",
    "scheduleCount": 1,
    "totalLocked": "150000000000000000000",
    "totalVested": "948000000000000000000",
    "totalUnlockableNow": "948000000000000000000",
    "percentComplete": 0.63
  }
}
```

#### POST /vesting/vest

**Description**: Liberar tokens vestidos.

**Request**:
```json
{
  "address": "5GrwvaEF..."
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "txHash": "0x1234...",
    "unlockedAmount": "948000000000000000000",
    "events": [
      {
        "type": "VestingUpdated",
        "data": {
          "account": "5GrwvaEF...",
          "unvested": "948000000000000000000"
        }
      }
    ]
  }
}
```

#### POST /vesting/transfer

**Description**: Transferir com vesting.

**Request**:
```json
{
  "from": "5GrwvaEF...",
  "to": "5HpG9w8E...",
  "amount": "1000000000000000000000", // 1M BZR
  "durationBlocks": 5256000, // 1 year
  "cliffBlocks": 0
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "txHash": "0x5678...",
    "schedule": {
      "locked": "1000000000000000000000",
      "perBlock": "190258751902587",
      "startingBlock": 2000000
    }
  }
}
```

### 4.2 Implementation

```typescript
// apps/api/src/routes/vesting.ts

import { Router } from 'express';
import { vestingService } from '../services/vesting';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// GET /vesting/:address
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const schedules = await vestingService.getSchedules(address);

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /vesting/:address/summary
router.get('/:address/summary', async (req, res) => {
  try {
    const { address } = req.params;
    const summary = await vestingService.getSummary(address);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST /vesting/vest (requires auth)
router.post('/vest', authenticateToken, async (req, res) => {
  try {
    const { address } = req.body;
    const result = await vestingService.vest(address);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST /vesting/transfer (requires auth)
router.post('/transfer', authenticateToken, async (req, res) => {
  try {
    const { from, to, amount, durationBlocks, cliffBlocks } = req.body;

    const result = await vestingService.vestedTransfer(
      from,
      to,
      amount,
      durationBlocks,
      cliffBlocks || 0
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
```

---

## 5. Frontend UI

### 5.1 Estrutura de Arquivos

```
apps/web/src/modules/vesting/
├── pages/
│   ├── VestingDashboardPage.tsx      # Main dashboard
│   └── VestingDetailPage.tsx         # Schedule details
├── components/
│   ├── VestingScheduleCard.tsx       # Schedule card
│   ├── VestingProgressChart.tsx      # Progress chart (recharts)
│   ├── VestingTimeline.tsx           # Timeline visual
│   ├── VestButton.tsx                # Vest action button
│   ├── VestedTransferForm.tsx        # Transfer form
│   └── SkeletonLoader.tsx            # Loading states
├── hooks/
│   ├── useVestingSchedules.ts        # Fetch schedules
│   ├── useVest.ts                    # Vest action
│   └── useVestedTransfer.ts          # Transfer action
├── api/
│   └── index.ts                      # API client
├── types/
│   └── index.ts                      # TypeScript types
├── styles.css                         # Module styles
└── index.ts                          # Public exports
```

### 5.2 Types

```typescript
// apps/web/src/modules/vesting/types/index.ts

export interface VestingSchedule {
  index: number;
  locked: string;              // BigNumber as string
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

export interface VestedTransferParams {
  from: string;
  to: string;
  amount: string;
  durationBlocks: number;
  cliffBlocks?: number;
}
```

### 5.3 API Client

```typescript
// apps/web/src/modules/vesting/api/index.ts

import { fetchJSON } from '@/lib/api';
import type { VestingData, VestingSummary, VestedTransferParams } from '../types';

export const vestingApi = {
  /**
   * Get all vesting schedules for an address
   */
  getSchedules: (address: string) =>
    fetchJSON<VestingData>(`/vesting/${address}`),

  /**
   * Get vesting summary for an address
   */
  getSummary: (address: string) =>
    fetchJSON<VestingSummary>(`/vesting/${address}/summary`),

  /**
   * Vest unlocked tokens
   */
  vest: (address: string) =>
    fetchJSON('/vesting/vest', {
      method: 'POST',
      body: JSON.stringify({ address }),
    }),

  /**
   * Create vested transfer
   */
  vestedTransfer: (params: VestedTransferParams) =>
    fetchJSON('/vesting/transfer', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
};
```

### 5.4 Hooks

```typescript
// apps/web/src/modules/vesting/hooks/useVestingSchedules.ts

import { useState, useEffect } from 'react';
import { vestingApi } from '../api';
import type { VestingData } from '../types';

export function useVestingSchedules(address: string) {
  const [data, setData] = useState<VestingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
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

    if (address) {
      fetchData();
    }
  }, [address]);

  return { data, loading, error, refetch: () => fetchData() };
}
```

```typescript
// apps/web/src/modules/vesting/hooks/useVest.ts

import { useState } from 'react';
import { vestingApi } from '../api';
import { toast } from 'sonner';

export function useVest() {
  const [loading, setLoading] = useState(false);

  async function vest(address: string) {
    try {
      setLoading(true);
      const res = await vestingApi.vest(address);

      if (res.success) {
        toast.success('Tokens vested successfully!', {
          description: `Unlocked ${formatBZR(res.data.unlockedAmount)}`,
        });
        return res.data;
      } else {
        throw new Error(res.message || 'Failed to vest tokens');
      }
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

### 5.5 Components

#### VestingScheduleCard

```tsx
// apps/web/src/modules/vesting/components/VestingScheduleCard.tsx

import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatBZR, formatDate } from '@/lib/utils';
import type { VestingSchedule } from '../types';

export interface VestingScheduleCardProps {
  schedule: VestingSchedule;
  onVest?: () => void;
  onViewDetails?: () => void;
}

export function VestingScheduleCard({
  schedule,
  onVest,
  onViewDetails
}: VestingScheduleCardProps) {
  const hasUnlockable = BigInt(schedule.unlockableNow) > 0n;
  const percentComplete = Math.round(schedule.percentComplete * 100);

  return (
    <Card className="vesting-card">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              Schedule #{schedule.index + 1}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Started at block {schedule.startingBlock}
            </p>
          </div>
          <Badge variant={hasUnlockable ? 'default' : 'secondary'}>
            {percentComplete}% Complete
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div>
          <Progress value={percentComplete} className="h-2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Locked</p>
            <p className="font-semibold">
              {formatBZR(schedule.locked)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Still Locked</p>
            <p className="font-semibold">
              {formatBZR(schedule.stillLocked)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Vested</p>
            <p className="font-semibold text-green-600 dark:text-green-400">
              {formatBZR(schedule.vested)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Unlockable Now</p>
            <p className="font-semibold text-blue-600 dark:text-blue-400">
              {formatBZR(schedule.unlockableNow)}
            </p>
          </div>
        </div>

        {/* Estimated Completion */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Estimated completion: {formatDate(schedule.estimatedCompletionDate)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {hasUnlockable && (
            <Button onClick={onVest} className="flex-1">
              Vest {formatBZR(schedule.unlockableNow)}
            </Button>
          )}
          <Button variant="outline" onClick={onViewDetails}>
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### VestingProgressChart

```tsx
// apps/web/src/modules/vesting/components/VestingProgressChart.tsx

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { VestingSummary } from '../types';

export interface VestingProgressChartProps {
  summary: VestingSummary;
}

export function VestingProgressChart({ summary }: VestingProgressChartProps) {
  const vested = Number(summary.totalVested) / 1e18;
  const stillLocked = Number(summary.totalStillLocked) / 1e18;

  const data = [
    { name: 'Vested', value: vested, color: 'hsl(142, 71%, 45%)' },
    { name: 'Locked', value: stillLocked, color: 'hsl(215, 20%, 65%)' },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => `${value.toLocaleString()} BZR`}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

### 5.6 Pages

#### VestingDashboardPage

```tsx
// apps/web/src/modules/vesting/pages/VestingDashboardPage.tsx

import { useWallet } from '@/hooks/useWallet';
import { useVestingSchedules } from '../hooks/useVestingSchedules';
import { useVest } from '../hooks/useVest';
import { VestingScheduleCard } from '../components/VestingScheduleCard';
import { VestingProgressChart } from '../components/VestingProgressChart';
import { VestingPageSkeleton } from '../components/SkeletonLoader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

export function VestingDashboardPage() {
  const { account } = useWallet();
  const { data, loading, error, refetch } = useVestingSchedules(account?.address || '');
  const { vest, loading: vesting } = useVest();

  if (loading) {
    return <VestingPageSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">
            Error loading vesting data: {error.message}
          </p>
        </div>
      </div>
    );
  }

  if (!data || data.schedules.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-muted-foreground">
            No vesting schedules found for this account.
          </p>
        </div>
      </div>
    );
  }

  const { schedules, summary } = data;
  const hasUnlockable = BigInt(summary.totalUnlockableNow) > 0n;

  async function handleVestAll() {
    if (!account) return;

    try {
      await vest(account.address);
      refetch();
    } catch (error) {
      // Error already handled in hook
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 mobile-safe-bottom space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Vesting Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Manage your vesting schedules and unlock tokens
        </p>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Summary</h2>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Chart */}
            <VestingProgressChart summary={summary} />

            {/* Stats */}
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Locked</p>
                <p className="text-2xl font-bold">
                  {formatBZR(summary.totalLocked)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Vested</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatBZR(summary.totalVested)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unlockable Now</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatBZR(summary.totalUnlockableNow)}
                </p>
              </div>

              {hasUnlockable && (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleVestAll}
                  disabled={vesting}
                >
                  {vesting ? 'Vesting...' : `Vest ${formatBZR(summary.totalUnlockableNow)}`}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedules List */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Active Schedules ({schedules.length})
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          {schedules.map((schedule) => (
            <VestingScheduleCard
              key={schedule.index}
              schedule={schedule}
              onVest={handleVestAll}
              onViewDetails={() => {
                // Navigate to detail page
                window.location.href = `/app/vesting/${schedule.index}`;
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 6. Token Economics

Ver [FASE-09-README.md](../FASE-09-README.md#token-economics) para detalhes completos.

---

## 7. Security

### 7.1 Pallet Security

- ✅ **Battle-tested**: Usar pallet oficial do Substrate
- ✅ **Overflow protection**: Safe math operations
- ✅ **Access control**: Only account owner can vest
- ✅ **Minimum transfer**: Prevent dust attacks
- ✅ **Max schedules**: Limit 28 schedules per account

### 7.2 Genesis Security

- ✅ **Validate addresses**: Ensure correct beneficiary addresses
- ✅ **Validate amounts**: Total vesting <= total supply
- ✅ **Validate per_block**: Ensure correct calculations
- ✅ **Double-check**: Manual review of genesis config

### 7.3 Frontend Security

- ✅ **PIN verification**: Require PIN for vest operations
- ✅ **Amount validation**: Prevent invalid amounts
- ✅ **Address validation**: Check valid SS58 addresses
- ✅ **XSS protection**: React auto-escaping
- ✅ **HTTPS**: Enforce HTTPS in production

---

## 8. Testing Strategy

### 8.1 Unit Tests (Rust)

```rust
// pallets/vesting/src/tests.rs

#[test]
fn basic_vesting_works() {
    new_test_ext().execute_with(|| {
        let user = 1;
        let amount = 1000;
        let per_block = 10;

        // Setup vesting
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

        // Check vesting after 50 blocks
        System::set_block_number(50);
        assert_ok!(Vesting::vest(RuntimeOrigin::signed(user)));

        // Should have unlocked 50 * 10 = 500
        assert_eq!(Balances::usable_balance(&user), 500);
    });
}
```

### 8.2 Integration Tests

```typescript
// apps/api/src/__tests__/vesting.integration.test.ts

describe('Vesting API Integration', () => {
  it('should fetch vesting schedules', async () => {
    const response = await request(app)
      .get('/vesting/5GrwvaEF...')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.schedules).toBeInstanceOf(Array);
  });

  it('should vest tokens', async () => {
    const response = await request(app)
      .post('/vesting/vest')
      .set('Authorization', `Bearer ${token}`)
      .send({ address: '5GrwvaEF...' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.txHash).toBeDefined();
  });
});
```

### 8.3 E2E Tests (Playwright)

```typescript
// apps/web/src/modules/vesting/__tests__/e2e/vesting-flow.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Vesting Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth/unlock');
    await page.fill('[data-testid="pin-input"]', '1234');
    await page.click('button[type="submit"]');
  });

  test('should display vesting dashboard', async ({ page }) => {
    await page.goto('/app/vesting');

    // Verify title
    await expect(page.locator('h1')).toContainText('Vesting Dashboard');

    // Verify summary card
    await expect(page.locator('[data-testid="total-locked"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-vested"]')).toBeVisible();
  });

  test('should vest unlocked tokens', async ({ page }) => {
    await page.goto('/app/vesting');

    // Click vest button
    const vestButton = page.locator('button:has-text("Vest")');
    if (await vestButton.isVisible()) {
      await vestButton.click();

      // Enter PIN
      await page.fill('[data-testid="pin-modal-input"]', '1234');
      await page.click('button:has-text("Confirmar")');

      // Verify success toast
      await expect(page.locator('.toast')).toContainText('Tokens vested successfully');
    }
  });
});
```

---

## 9. Deployment

### 9.1 Checklist

**Blockchain**:
- [ ] Adicionar pallet-vesting ao Cargo.toml
- [ ] Configurar runtime
- [ ] Bump runtime version (102 → 103)
- [ ] Configurar genesis com schedules corretos
- [ ] Build chain spec
- [ ] Test em dev chain
- [ ] Build production runtime
- [ ] Upgrade runtime via governance

**Backend**:
- [ ] Adicionar rotas /vesting/*
- [ ] Implementar service layer
- [ ] Adicionar testes
- [ ] Deploy com zero downtime

**Frontend**:
- [ ] Implementar UI do vesting
- [ ] Adicionar testes E2E
- [ ] Build production
- [ ] Deploy

### 9.2 Runtime Upgrade Process

```bash
# 1. Build new runtime
cd /root/bazari-chain
cargo build --release

# 2. Extract WASM
cp target/release/wbuild/solochain-template-runtime/solochain_template_runtime.compact.compressed.wasm ./runtime.wasm

# 3. Upload via sudo (testnet)
# Via Polkadot.js Apps:
# Developer → Sudo → sudo(system.setCode(code))

# 4. Or via governance (mainnet)
# Create democracy proposal with system.setCode
```

---

## 10. Monitoring

### 10.1 Metrics

```typescript
// Backend metrics

// Total vesting schedules
vesting_schedules_total

// Total locked amount
vesting_locked_total_bzr

// Total unlocked today
vesting_unlocked_today_bzr

// API response time
vesting_api_response_time_ms
```

### 10.2 Alerts

- ⚠️ Alert se `vest()` extrinsic falhar > 5%
- ⚠️ Alert se API response time > 1s
- ⚠️ Alert se storage size crescer > 10MB/dia

---

**Fim da Especificação Técnica**

**Próximo passo**: Ler [FASE-09-PROMPT.md](FASE-09-PROMPT.md) para instruções de execução.
