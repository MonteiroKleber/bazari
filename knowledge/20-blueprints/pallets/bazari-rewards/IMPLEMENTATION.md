# bazari-rewards Pallet - Implementation Guide

**Estimated Time**: 2 weeks
**Difficulty**: Medium
**Prerequisites**: Rust, Substrate FRAME, pallet-assets

---

## 📋 Implementation Checklist

### Week 1: Core Rewards (5 days)
- [ ] Day 1-2: Project setup + ZARI asset creation
- [ ] Day 3: Mission system (create, progress)
- [ ] Day 4: Cashback grants
- [ ] Day 5: Unit tests for missions

### Week 2: Gamification (5 days)
- [ ] Day 1-2: Streak system with bonuses
- [ ] Day 3: Auto-completion logic
- [ ] Day 4: Integration with bazari-identity
- [ ] Day 5: Weight benchmarking + E2E tests

---

## 🚀 Step-by-Step Implementation

### Step 1: Create Pallet Directory

```bash
cd /root/bazari-chain/pallets
mkdir bazari-rewards
cd bazari-rewards
```

Directory structure:
```
bazari-rewards/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── types.rs
│   ├── weights.rs
│   └── tests.rs
└── README.md
```

---

### Step 2: Cargo.toml

```toml
[package]
name = "pallet-bazari-rewards"
version = "0.1.0"
edition = "2021"
authors = ["Bazari Team"]

[dependencies]
codec = { package = "parity-scale-codec", version = "3.6.1", default-features = false, features = ["derive"] }
scale-info = { version = "2.5.0", default-features = false, features = ["derive"] }
frame-support = { git = "https://github.com/paritytech/polkadot-sdk.git", branch = "release-polkadot-v1.18.0", default-features = false }
frame-system = { git = "https://github.com/paritytech/polkadot-sdk.git", branch = "release-polkadot-v1.18.0", default-features = false }
sp-std = { git = "https://github.com/paritytech/polkadot-sdk.git", branch = "release-polkadot-v1.18.0", default-features = false }
sp-runtime = { git = "https://github.com/paritytech/polkadot-sdk.git", branch = "release-polkadot-v1.18.0", default-features = false }
pallet-assets = { git = "https://github.com/paritytech/polkadot-sdk.git", branch = "release-polkadot-v1.18.0", default-features = false }

[dev-dependencies]
sp-core = { git = "https://github.com/paritytech/polkadot-sdk.git", branch = "release-polkadot-v1.18.0" }
sp-io = { git = "https://github.com/paritytech/polkadot-sdk.git", branch = "release-polkadot-v1.18.0" }

[features]
default = ["std"]
std = [
    "codec/std",
    "scale-info/std",
    "frame-support/std",
    "frame-system/std",
    "sp-std/std",
    "sp-runtime/std",
    "pallet-assets/std",
]
runtime-benchmarks = ["frame-support/runtime-benchmarks"]
try-runtime = ["frame-support/try-runtime"]
```

---

### Step 3: Types (src/types.rs)

```rust
use codec::{Decode, Encode, MaxEncodedLen};
use frame_support::BoundedVec;
use scale_info::TypeInfo;
use sp_runtime::RuntimeDebug;

/// Mission ID
pub type MissionId = u64;

/// Grant ID
pub type GrantId = u64;

/// Order ID (from bazari-commerce)
pub type OrderId = u64;

/// Asset ID (ZARI = 1000)
pub type AssetId = u32;

/// Balance type
pub type Balance = u128;

/// Mission type
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub enum MissionType {
    CompleteOrders,
    SpendAmount,
    ReferUsers,
    CreateStore,
    FirstPurchase,
    DailyStreak,
    Custom,
}
```

---

### Step 4: Main Pallet (src/lib.rs)

```rust
#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;
pub mod types;
pub mod weights;

#[cfg(test)]
mod tests;

use frame_support::{
    pallet_prelude::*,
    traits::fungibles::{self, Inspect, Mutate, Create},
};
use frame_system::pallet_prelude::*;
use sp_runtime::traits::Zero;
use sp_std::vec::Vec;

pub use types::*;
pub use weights::WeightInfo;

#[frame_support::pallet]
pub mod pallet {
    use super::*;

    #[pallet::pallet]
    pub struct Pallet<T>(_);

    #[pallet::config]
    pub trait Config: frame_system::Config + pallet_assets::Config<AssetId = AssetId, Balance = Balance> {
        type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;

        type Assets: fungibles::Inspect<Self::AccountId, AssetId = AssetId, Balance = Balance>
            + fungibles::Mutate<Self::AccountId>
            + fungibles::Create<Self::AccountId>;

        #[pallet::constant]
        type ZariAssetId: Get<AssetId>;

        #[pallet::constant]
        type TreasuryAccount: Get<Self::AccountId>;

        #[pallet::constant]
        type MaxMissions: Get<u32>;

        #[pallet::constant]
        type StreakTimeout: Get<BlockNumberFor<Self>>;

        type DAOOrigin: EnsureOrigin<Self::RuntimeOrigin>;

        type WeightInfo: WeightInfo;
    }

    // Storage
    #[pallet::storage]
    #[pallet::getter(fn missions)]
    pub type Missions<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        MissionId,
        Mission<BlockNumberFor<T>>,
        OptionQuery,
    >;

    #[pallet::storage]
    pub type MissionCount<T> = StorageValue<_, u64, ValueQuery>;

    #[pallet::storage]
    pub type UserMissions<T: Config> = StorageDoubleMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        Blake2_128Concat,
        MissionId,
        UserMission<BlockNumberFor<T>>,
        OptionQuery,
    >;

    #[pallet::storage]
    pub type CashbackGrants<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        GrantId,
        CashbackGrant<T::AccountId, BlockNumberFor<T>>,
        OptionQuery,
    >;

    #[pallet::storage]
    pub type GrantCount<T> = StorageValue<_, u64, ValueQuery>;

    #[pallet::storage]
    pub type RewardStreaks<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        Streak<BlockNumberFor<T>>,
        OptionQuery,
    >;

    // Events
    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        MissionCreated {
            mission_id: MissionId,
            name: BoundedVec<u8, ConstU32<64>>,
            reward_amount: Balance,
            mission_type: MissionType,
        },
        MissionCompleted {
            user: T::AccountId,
            mission_id: MissionId,
            reward_amount: Balance,
        },
        CashbackGranted {
            recipient: T::AccountId,
            amount: Balance,
            grant_id: GrantId,
        },
        StreakUpdated {
            user: T::AccountId,
            streak: u32,
        },
        MissionDeactivated {
            mission_id: MissionId,
        },
        StreakBonusGranted {
            user: T::AccountId,
            streak: u32,
            bonus_amount: Balance,
        },
    }

    // Errors
    #[pallet::error]
    pub enum Error<T> {
        MissionNotFound,
        MissionInactive,
        MissionExpired,
        NameTooLong,
        DescriptionTooLong,
        ReasonTooLong,
        RewardsAlreadyClaimed,
        InsufficientMintBalance,
    }

    // Extrinsics
    #[pallet::call]
    impl<T: Config> Pallet<T> {
        #[pallet::call_index(0)]
        #[pallet::weight(T::WeightInfo::create_mission())]
        pub fn create_mission(
            origin: OriginFor<T>,
            name: Vec<u8>,
            description: Vec<u8>,
            reward_amount: Balance,
            mission_type: MissionType,
            target_value: u32,
            max_completions: u32,
            expires_at: Option<BlockNumberFor<T>>,
        ) -> DispatchResult {
            T::DAOOrigin::ensure_origin(origin)?;

            let mission_id = MissionCount::<T>::get();
            MissionCount::<T>::put(mission_id.saturating_add(1));

            let mission = Mission {
                id: mission_id,
                name: name.clone().try_into().map_err(|_| Error::<T>::NameTooLong)?,
                description: description.try_into().map_err(|_| Error::<T>::DescriptionTooLong)?,
                reward_amount,
                mission_type: mission_type.clone(),
                target_value,
                max_completions,
                completion_count: 0,
                expires_at,
                is_active: true,
                created_at: <frame_system::Pallet<T>>::block_number(),
            };

            Missions::<T>::insert(mission_id, mission);

            Self::deposit_event(Event::MissionCreated {
                mission_id,
                name: name.try_into().unwrap(),
                reward_amount,
                mission_type,
            });

            Ok(())
        }

        #[pallet::call_index(1)]
        #[pallet::weight(T::WeightInfo::progress_mission())]
        pub fn progress_mission(
            origin: OriginFor<T>,
            user: T::AccountId,
            mission_id: MissionId,
            progress_amount: u32,
        ) -> DispatchResult {
            let _ = ensure_signed(origin)?;

            let mission = Missions::<T>::get(mission_id).ok_or(Error::<T>::MissionNotFound)?;

            ensure!(mission.is_active, Error::<T>::MissionInactive);

            if let Some(expires) = mission.expires_at {
                let current_block = <frame_system::Pallet<T>>::block_number();
                ensure!(current_block < expires, Error::<T>::MissionExpired);
            }

            UserMissions::<T>::try_mutate(&user, mission_id, |maybe_user_mission| {
                let user_mission = maybe_user_mission.get_or_insert(UserMission {
                    mission_id,
                    progress: 0,
                    completed: false,
                    completed_at: None,
                    rewards_claimed: false,
                });

                user_mission.progress = user_mission.progress.saturating_add(progress_amount);

                if user_mission.progress >= mission.target_value && !user_mission.completed {
                    user_mission.completed = true;
                    user_mission.completed_at = Some(<frame_system::Pallet<T>>::block_number());

                    Self::claim_mission_reward_internal(&user, mission_id)?;

                    Self::deposit_event(Event::MissionCompleted {
                        user: user.clone(),
                        mission_id,
                        reward_amount: mission.reward_amount,
                    });
                }

                Ok::<(), Error<T>>(())
            })?;

            Ok(())
        }

        #[pallet::call_index(2)]
        #[pallet::weight(T::WeightInfo::grant_cashback())]
        pub fn grant_cashback(
            origin: OriginFor<T>,
            recipient: T::AccountId,
            amount: Balance,
            reason: Vec<u8>,
            order_id: Option<OrderId>,
        ) -> DispatchResult {
            let _ = ensure_signed(origin)?;

            T::Assets::mint_into(
                T::ZariAssetId::get(),
                &recipient,
                amount,
            )?;

            let grant_id = GrantCount::<T>::get();
            GrantCount::<T>::put(grant_id.saturating_add(1));

            let grant = CashbackGrant {
                id: grant_id,
                recipient: recipient.clone(),
                amount,
                reason: reason.try_into().map_err(|_| Error::<T>::ReasonTooLong)?,
                order_id,
                granted_at: <frame_system::Pallet<T>>::block_number(),
            };

            CashbackGrants::<T>::insert(grant_id, grant);

            Self::deposit_event(Event::CashbackGranted {
                recipient,
                amount,
                grant_id,
            });

            Ok(())
        }

        #[pallet::call_index(3)]
        #[pallet::weight(T::WeightInfo::update_streak())]
        pub fn update_streak(origin: OriginFor<T>, user: T::AccountId) -> DispatchResult {
            let _ = ensure_signed(origin)?;

            let current_block = <frame_system::Pallet<T>>::block_number();

            RewardStreaks::<T>::try_mutate(&user, |maybe_streak| {
                let streak = maybe_streak.get_or_insert(Streak {
                    current_streak: 0,
                    longest_streak: 0,
                    last_action_block: current_block,
                });

                let block_diff = current_block.saturating_sub(streak.last_action_block);

                if block_diff > T::StreakTimeout::get() {
                    streak.current_streak = 1;
                } else {
                    streak.current_streak = streak.current_streak.saturating_add(1);
                }

                if streak.current_streak > streak.longest_streak {
                    streak.longest_streak = streak.current_streak;
                }

                streak.last_action_block = current_block;

                match streak.current_streak {
                    7 => Self::grant_streak_bonus(&user, 1000)?,
                    30 => Self::grant_streak_bonus(&user, 5000)?,
                    100 => Self::grant_streak_bonus(&user, 20000)?,
                    _ => {}
                }

                Self::deposit_event(Event::StreakUpdated {
                    user: user.clone(),
                    streak: streak.current_streak,
                });

                Ok::<(), Error<T>>(())
            })?;

            Ok(())
        }

        #[pallet::call_index(4)]
        #[pallet::weight(T::WeightInfo::deactivate_mission())]
        pub fn deactivate_mission(origin: OriginFor<T>, mission_id: MissionId) -> DispatchResult {
            T::DAOOrigin::ensure_origin(origin)?;

            Missions::<T>::try_mutate(mission_id, |maybe_mission| {
                let mission = maybe_mission.as_mut().ok_or(Error::<T>::MissionNotFound)?;

                mission.is_active = false;

                Self::deposit_event(Event::MissionDeactivated { mission_id });

                Ok(())
            })
        }
    }

    // Helper functions
    impl<T: Config> Pallet<T> {
        fn claim_mission_reward_internal(user: &T::AccountId, mission_id: MissionId) -> DispatchResult {
            let mission = Missions::<T>::get(mission_id).ok_or(Error::<T>::MissionNotFound)?;

            T::Assets::mint_into(
                T::ZariAssetId::get(),
                user,
                mission.reward_amount,
            )?;

            Missions::<T>::mutate(mission_id, |maybe_mission| {
                if let Some(mission) = maybe_mission {
                    mission.completion_count = mission.completion_count.saturating_add(1);

                    if mission.max_completions > 0 && mission.completion_count >= mission.max_completions {
                        mission.is_active = false;
                    }
                }
            });

            Ok(())
        }

        fn grant_streak_bonus(user: &T::AccountId, amount: Balance) -> DispatchResult {
            T::Assets::mint_into(
                T::ZariAssetId::get(),
                user,
                amount,
            )?;

            let streak = RewardStreaks::<T>::get(user)
                .map(|s| s.current_streak)
                .unwrap_or(0);

            Self::deposit_event(Event::StreakBonusGranted {
                user: user.clone(),
                streak,
                bonus_amount: amount,
            });

            Ok(())
        }
    }
}

// Structs
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub struct Mission<BlockNumber> {
    pub id: MissionId,
    pub name: BoundedVec<u8, ConstU32<64>>,
    pub description: BoundedVec<u8, ConstU32<256>>,
    pub reward_amount: Balance,
    pub mission_type: MissionType,
    pub target_value: u32,
    pub max_completions: u32,
    pub completion_count: u32,
    pub expires_at: Option<BlockNumber>,
    pub is_active: bool,
    pub created_at: BlockNumber,
}

#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub struct UserMission<BlockNumber> {
    pub mission_id: MissionId,
    pub progress: u32,
    pub completed: bool,
    pub completed_at: Option<BlockNumber>,
    pub rewards_claimed: bool,
}

#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
#[scale_info(skip_type_params(T))]
pub struct CashbackGrant<AccountId, BlockNumber> {
    pub id: GrantId,
    pub recipient: AccountId,
    pub amount: Balance,
    pub reason: BoundedVec<u8, ConstU32<128>>,
    pub order_id: Option<OrderId>,
    pub granted_at: BlockNumber,
}

#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub struct Streak<BlockNumber> {
    pub current_streak: u32,
    pub longest_streak: u32,
    pub last_action_block: BlockNumber,
}
```

---

### Step 5: Weights (src/weights.rs)

```rust
use frame_support::weights::Weight;

pub trait WeightInfo {
    fn create_mission() -> Weight;
    fn progress_mission() -> Weight;
    fn grant_cashback() -> Weight;
    fn update_streak() -> Weight;
    fn deactivate_mission() -> Weight;
}

impl WeightInfo for () {
    fn create_mission() -> Weight {
        Weight::from_parts(30_000_000, 0)
    }
    fn progress_mission() -> Weight {
        Weight::from_parts(40_000_000, 0)
    }
    fn grant_cashback() -> Weight {
        Weight::from_parts(50_000_000, 0)
    }
    fn update_streak() -> Weight {
        Weight::from_parts(35_000_000, 0)
    }
    fn deactivate_mission() -> Weight {
        Weight::from_parts(20_000_000, 0)
    }
}
```

---

### Step 6: Create ZARI Asset

Before using bazari-rewards, create ZARI asset using pallet-assets:

```rust
// In runtime genesis config or via extrinsic:
Assets::create(
    RuntimeOrigin::root(),
    1000, // ZARI asset ID
    treasury_account, // Admin
    1_000_000_000, // Min balance (0.001 ZARI)
)?;

Assets::set_metadata(
    RuntimeOrigin::signed(treasury_account),
    1000,
    b"ZARI".to_vec(),
    b"ZARI".to_vec(),
    12, // Decimals
)?;
```

---

### Step 7: Add to Runtime

```rust
// Configure pallet
impl pallet_bazari_rewards::Config for Runtime {
    type RuntimeEvent = RuntimeEvent;
    type Assets = Assets;
    type ZariAssetId = ConstU32<1000>;
    type TreasuryAccount = TreasuryAccountId;
    type MaxMissions = ConstU32<100>;
    type StreakTimeout = ConstU32<14400>; // 24 hours
    type DAOOrigin = EnsureRoot<AccountId>;
    type WeightInfo = ();
}

// Add to construct_runtime!
construct_runtime!(
    pub struct Runtime {
        // ... existing pallets
        BazariRewards: pallet_bazari_rewards,
    }
);
```

---

### Step 8: Build and Test

```bash
cargo build --release --package pallet-bazari-rewards
cargo test --package pallet-bazari-rewards
```

---

## 🧪 Unit Tests

```rust
#[test]
fn mission_creation_works() {
    new_test_ext().execute_with(|| {
        assert_ok!(BazariRewards::create_mission(
            RuntimeOrigin::root(),
            b"First Purchase".to_vec(),
            b"Complete your first purchase".to_vec(),
            1000, // 1000 ZARI reward
            MissionType::FirstPurchase,
            1, // Target: 1 purchase
            0, // Unlimited completions
            None, // Never expires
        ));

        let mission = BazariRewards::missions(0).unwrap();
        assert_eq!(mission.reward_amount, 1000);
    });
}

#[test]
fn mission_completion_mints_zari() {
    new_test_ext().execute_with(|| {
        // Create mission
        // ...

        // Progress mission
        assert_ok!(BazariRewards::progress_mission(
            RuntimeOrigin::signed(1),
            1, // User
            0, // Mission ID
            1, // Progress
        ));

        // Check ZARI balance
        let balance = Assets::balance(1000, &1);
        assert_eq!(balance, 1000);
    });
}
```

---

## 🚀 Deployment Checklist

- [ ] ZARI asset created (ID: 1000)
- [ ] All unit tests passing
- [ ] Mission auto-completion tested
- [ ] Streak system tested
- [ ] Integration with bazari-commerce
- [ ] Testnet deployment successful

---

## 📚 Next Steps

After completing this pallet:
1. Backend integration ([INTEGRATION.md](INTEGRATION.md))
2. Create default missions via DAO
3. Integrate with frontend gamification dashboard
