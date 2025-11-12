# bazari-escrow Pallet - Implementation Guide

**Estimated Time**: 2 weeks
**Difficulty**: Medium-High
**Prerequisites**: Rust, Substrate FRAME, pallet-balances, pallet-assets

---

## 📋 Implementation Checklist

### Week 1: Core Escrow (5 days)
- [ ] Day 1-2: Project setup + storage + lock extrinsic
- [ ] Day 3: Release and refund extrinsics
- [ ] Day 4: Multi-asset support (pallet-assets integration)
- [ ] Day 5: Unit tests for basic flows

### Week 2: Advanced Features (5 days)
- [ ] Day 1-2: Auto-release hook (on_finalize)
- [ ] Day 3: Split release for multi-recipient payouts
- [ ] Day 4: Dispute mechanism + arbiter
- [ ] Day 5: Weight benchmarking + end-to-end tests

---

## 🚀 Step-by-Step Implementation

### Step 1: Create Pallet Directory

```bash
cd /root/bazari-chain/pallets
mkdir bazari-escrow
cd bazari-escrow
```

Directory structure:
```
bazari-escrow/
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
name = "pallet-bazari-escrow"
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
pallet-balances = { git = "https://github.com/paritytech/polkadot-sdk.git", branch = "release-polkadot-v1.18.0", default-features = false }
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
    "pallet-balances/std",
    "pallet-assets/std",
]
runtime-benchmarks = ["frame-support/runtime-benchmarks"]
try-runtime = ["frame-support/try-runtime"]
```

---

### Step 3: Types (src/types.rs)

```rust
use codec::{Decode, Encode, MaxEncodedLen};
use scale_info::TypeInfo;
use sp_runtime::RuntimeDebug;

/// Escrow ID type
pub type EscrowId = u64;

/// Asset ID type (for pallet-assets)
pub type AssetId = u32;

/// Percent type (0-100)
pub type Percent = u8;

/// Escrow status
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub enum EscrowStatus {
    Locked,
    Released,
    Refunded,
    Disputed,
    PartiallyReleased,
}

/// User role in escrow
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub enum EscrowRole {
    Depositor,
    Beneficiary,
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
    traits::{
        Currency, ReservableCurrency,
        fungibles::{self, Inspect, Mutate},
    },
};
use frame_system::pallet_prelude::*;
use sp_runtime::traits::Zero;
use sp_std::vec::Vec;

pub use types::*;
pub use weights::WeightInfo;

type BalanceOf<T> =
    <<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;

#[frame_support::pallet]
pub mod pallet {
    use super::*;

    #[pallet::pallet]
    pub struct Pallet<T>(_);

    #[pallet::config]
    pub trait Config: frame_system::Config + pallet_balances::Config + pallet_assets::Config {
        type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;

        type Currency: Currency<Self::AccountId> + ReservableCurrency<Self::AccountId>;

        type Assets: fungibles::Inspect<Self::AccountId, AssetId = AssetId, Balance = BalanceOf<Self>>
            + fungibles::Mutate<Self::AccountId>
            + fungibles::hold::Inspect<Self::AccountId>
            + fungibles::hold::Mutate<Self::AccountId>;

        #[pallet::constant]
        type MaxEscrowsPerUser: Get<u32>;

        #[pallet::constant]
        type MaxReleasesPerBlock: Get<u32>;

        #[pallet::constant]
        type DefaultAutoReleaseBlocks: Get<BlockNumberFor<Self>>;

        #[pallet::constant]
        type MaxAutoReleaseBlocks: Get<BlockNumberFor<Self>>;

        #[pallet::constant]
        type MinEscrowAmount: Get<BalanceOf<Self>>;

        type ArbiterOrigin: EnsureOrigin<Self::RuntimeOrigin>;

        type WeightInfo: WeightInfo;
    }

    // Storage
    #[pallet::storage]
    #[pallet::getter(fn escrows)]
    pub type Escrows<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        EscrowId,
        Escrow<T::AccountId, BalanceOf<T>, BlockNumberFor<T>>,
        OptionQuery,
    >;

    #[pallet::storage]
    #[pallet::getter(fn escrow_count)]
    pub type EscrowCount<T> = StorageValue<_, u64, ValueQuery>;

    #[pallet::storage]
    pub type UserEscrows<T: Config> = StorageDoubleMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        Blake2_128Concat,
        EscrowRole,
        BoundedVec<EscrowId, T::MaxEscrowsPerUser>,
        ValueQuery,
    >;

    #[pallet::storage]
    pub type PendingReleases<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        BlockNumberFor<T>,
        BoundedVec<EscrowId, T::MaxReleasesPerBlock>,
        ValueQuery,
    >;

    // Events
    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        EscrowLocked {
            escrow_id: EscrowId,
            depositor: T::AccountId,
            beneficiary: T::AccountId,
            amount: BalanceOf<T>,
            asset_id: Option<AssetId>,
            release_at: Option<BlockNumberFor<T>>,
        },
        EscrowReleased {
            escrow_id: EscrowId,
            beneficiary: T::AccountId,
            amount: BalanceOf<T>,
        },
        EscrowAutoReleased {
            escrow_id: EscrowId,
            beneficiary: T::AccountId,
            amount: BalanceOf<T>,
        },
        EscrowRefunded {
            escrow_id: EscrowId,
            depositor: T::AccountId,
            amount: BalanceOf<T>,
        },
        EscrowSplitReleased {
            escrow_id: EscrowId,
            recipient: T::AccountId,
            amount: BalanceOf<T>,
        },
        EscrowDisputed {
            escrow_id: EscrowId,
            initiator: T::AccountId,
        },
        ArbiterSet {
            escrow_id: EscrowId,
            arbiter: T::AccountId,
        },
    }

    // Errors
    #[pallet::error]
    pub enum Error<T> {
        EscrowNotFound,
        Unauthorized,
        InvalidStatus,
        AmountTooLow,
        AutoReleaseTimeoutTooLong,
        TooManyEscrows,
        TooManyReleases,
        InvalidSplitPercentage,
        Overflow,
        InsufficientBalance,
    }

    // Hooks
    #[pallet::hooks]
    impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
        fn on_finalize(block_number: BlockNumberFor<T>) {
            // Process auto-releases for this block
            let escrow_ids = PendingReleases::<T>::take(block_number);

            for escrow_id in escrow_ids.iter() {
                if let Some(mut escrow) = Escrows::<T>::get(escrow_id) {
                    if escrow.status == EscrowStatus::Locked {
                        // Auto-release to beneficiary
                        if Self::release_internal(&escrow).is_ok() {
                            escrow.status = EscrowStatus::Released;
                            Escrows::<T>::insert(escrow_id, escrow.clone());

                            Self::deposit_event(Event::EscrowAutoReleased {
                                escrow_id: *escrow_id,
                                beneficiary: escrow.beneficiary,
                                amount: escrow.amount,
                            });
                        }
                    }
                }
            }
        }
    }

    // Extrinsics
    #[pallet::call]
    impl<T: Config> Pallet<T> {
        #[pallet::call_index(0)]
        #[pallet::weight(T::WeightInfo::lock())]
        pub fn lock(
            origin: OriginFor<T>,
            beneficiary: T::AccountId,
            amount: BalanceOf<T>,
            asset_id: Option<AssetId>,
            auto_release_blocks: Option<BlockNumberFor<T>>,
            arbiter: Option<T::AccountId>,
        ) -> DispatchResult {
            let depositor = ensure_signed(origin)?;

            // Validate
            ensure!(amount >= T::MinEscrowAmount::get(), Error::<T>::AmountTooLow);

            if let Some(blocks) = auto_release_blocks {
                ensure!(
                    blocks <= T::MaxAutoReleaseBlocks::get(),
                    Error::<T>::AutoReleaseTimeoutTooLong
                );
            }

            // Lock funds
            if let Some(asset) = asset_id {
                // TODO: Lock custom asset using pallet-assets
                // T::Assets::hold(asset, &depositor, amount)?;
                return Err(Error::<T>::InsufficientBalance.into());
            } else {
                T::Currency::reserve(&depositor, amount)?;
            }

            // Calculate auto-release block
            let current_block = <frame_system::Pallet<T>>::block_number();
            let auto_release_at = auto_release_blocks
                .or(Some(T::DefaultAutoReleaseBlocks::get()))
                .map(|blocks| current_block + blocks);

            // Create escrow
            let escrow_id = EscrowCount::<T>::get();
            EscrowCount::<T>::put(escrow_id.saturating_add(1));

            let escrow = Escrow {
                id: escrow_id,
                depositor: depositor.clone(),
                beneficiary: beneficiary.clone(),
                amount,
                asset_id,
                status: EscrowStatus::Locked,
                locked_at: current_block,
                auto_release_at,
                arbiter,
            };

            Escrows::<T>::insert(escrow_id, escrow);

            // Update indexes
            UserEscrows::<T>::try_mutate(&depositor, EscrowRole::Depositor, |escrows| {
                escrows.try_push(escrow_id).map_err(|_| Error::<T>::TooManyEscrows)
            })?;

            UserEscrows::<T>::try_mutate(&beneficiary, EscrowRole::Beneficiary, |escrows| {
                escrows.try_push(escrow_id).map_err(|_| Error::<T>::TooManyEscrows)
            })?;

            // Schedule auto-release
            if let Some(release_block) = auto_release_at {
                PendingReleases::<T>::try_mutate(release_block, |releases| {
                    releases.try_push(escrow_id).map_err(|_| Error::<T>::TooManyReleases)
                })?;
            }

            Self::deposit_event(Event::EscrowLocked {
                escrow_id,
                depositor,
                beneficiary,
                amount,
                asset_id,
                release_at: auto_release_at,
            });

            Ok(())
        }

        #[pallet::call_index(1)]
        #[pallet::weight(T::WeightInfo::release())]
        pub fn release(origin: OriginFor<T>, escrow_id: EscrowId) -> DispatchResult {
            let who = ensure_signed(origin)?;

            Escrows::<T>::try_mutate(escrow_id, |maybe_escrow| {
                let escrow = maybe_escrow.as_mut().ok_or(Error::<T>::EscrowNotFound)?;

                ensure!(
                    who == escrow.depositor || Some(who.clone()) == escrow.arbiter,
                    Error::<T>::Unauthorized
                );
                ensure!(escrow.status == EscrowStatus::Locked, Error::<T>::InvalidStatus);

                Self::release_internal(escrow)?;
                escrow.status = EscrowStatus::Released;

                Self::deposit_event(Event::EscrowReleased {
                    escrow_id,
                    beneficiary: escrow.beneficiary.clone(),
                    amount: escrow.amount,
                });

                Ok(())
            })
        }

        #[pallet::call_index(2)]
        #[pallet::weight(T::WeightInfo::refund())]
        pub fn refund(origin: OriginFor<T>, escrow_id: EscrowId) -> DispatchResult {
            let who = ensure_signed(origin)?;

            Escrows::<T>::try_mutate(escrow_id, |maybe_escrow| {
                let escrow = maybe_escrow.as_mut().ok_or(Error::<T>::EscrowNotFound)?;

                ensure!(
                    who == escrow.beneficiary || Some(who.clone()) == escrow.arbiter,
                    Error::<T>::Unauthorized
                );
                ensure!(escrow.status == EscrowStatus::Locked, Error::<T>::InvalidStatus);

                Self::refund_internal(escrow)?;
                escrow.status = EscrowStatus::Refunded;

                Self::deposit_event(Event::EscrowRefunded {
                    escrow_id,
                    depositor: escrow.depositor.clone(),
                    amount: escrow.amount,
                });

                Ok(())
            })
        }

        #[pallet::call_index(3)]
        #[pallet::weight(T::WeightInfo::split_release())]
        pub fn split_release(
            origin: OriginFor<T>,
            escrow_id: EscrowId,
            splits: Vec<(T::AccountId, Percent)>,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            Escrows::<T>::try_mutate(escrow_id, |maybe_escrow| {
                let escrow = maybe_escrow.as_mut().ok_or(Error::<T>::EscrowNotFound)?;

                ensure!(
                    who == escrow.depositor || Some(who.clone()) == escrow.arbiter,
                    Error::<T>::Unauthorized
                );
                ensure!(escrow.status == EscrowStatus::Locked, Error::<T>::InvalidStatus);

                // Validate splits sum to 100%
                let total: u32 = splits.iter().map(|(_, p)| *p as u32).sum();
                ensure!(total == 100, Error::<T>::InvalidSplitPercentage);

                // Execute splits
                for (recipient, percent) in splits {
                    let split_amount = Self::calculate_percentage(escrow.amount, percent)?;

                    if split_amount.is_zero() {
                        continue;
                    }

                    // Transfer funds
                    T::Currency::unreserve(&escrow.depositor, split_amount);
                    T::Currency::transfer(
                        &escrow.depositor,
                        &recipient,
                        split_amount,
                        frame_support::traits::ExistenceRequirement::KeepAlive,
                    )?;

                    Self::deposit_event(Event::EscrowSplitReleased {
                        escrow_id,
                        recipient,
                        amount: split_amount,
                    });
                }

                escrow.status = EscrowStatus::PartiallyReleased;

                Ok(())
            })
        }

        #[pallet::call_index(4)]
        #[pallet::weight(T::WeightInfo::dispute())]
        pub fn dispute(origin: OriginFor<T>, escrow_id: EscrowId) -> DispatchResult {
            let who = ensure_signed(origin)?;

            Escrows::<T>::try_mutate(escrow_id, |maybe_escrow| {
                let escrow = maybe_escrow.as_mut().ok_or(Error::<T>::EscrowNotFound)?;

                ensure!(
                    who == escrow.depositor || who == escrow.beneficiary,
                    Error::<T>::Unauthorized
                );
                ensure!(escrow.status == EscrowStatus::Locked, Error::<T>::InvalidStatus);

                escrow.status = EscrowStatus::Disputed;

                Self::deposit_event(Event::EscrowDisputed {
                    escrow_id,
                    initiator: who,
                });

                Ok(())
            })
        }

        #[pallet::call_index(5)]
        #[pallet::weight(T::WeightInfo::set_arbiter())]
        pub fn set_arbiter(
            origin: OriginFor<T>,
            escrow_id: EscrowId,
            arbiter: T::AccountId,
        ) -> DispatchResult {
            T::ArbiterOrigin::ensure_origin(origin)?;

            Escrows::<T>::try_mutate(escrow_id, |maybe_escrow| {
                let escrow = maybe_escrow.as_mut().ok_or(Error::<T>::EscrowNotFound)?;

                escrow.arbiter = Some(arbiter.clone());

                Self::deposit_event(Event::ArbiterSet { escrow_id, arbiter });

                Ok(())
            })
        }
    }

    // Helper functions
    impl<T: Config> Pallet<T> {
        fn release_internal(escrow: &Escrow<T::AccountId, BalanceOf<T>, BlockNumberFor<T>>) -> DispatchResult {
            T::Currency::unreserve(&escrow.depositor, escrow.amount);
            T::Currency::transfer(
                &escrow.depositor,
                &escrow.beneficiary,
                escrow.amount,
                frame_support::traits::ExistenceRequirement::KeepAlive,
            )?;
            Ok(())
        }

        fn refund_internal(escrow: &Escrow<T::AccountId, BalanceOf<T>, BlockNumberFor<T>>) -> DispatchResult {
            T::Currency::unreserve(&escrow.depositor, escrow.amount);
            Ok(())
        }

        fn calculate_percentage(amount: BalanceOf<T>, percent: Percent) -> Result<BalanceOf<T>, Error<T>> {
            let result = amount
                .saturating_mul((percent as u32).into())
                .saturating_div(100u32.into());
            Ok(result)
        }
    }
}

// Escrow struct
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
#[scale_info(skip_type_params(T))]
pub struct Escrow<AccountId, Balance, BlockNumber> {
    pub id: EscrowId,
    pub depositor: AccountId,
    pub beneficiary: AccountId,
    pub amount: Balance,
    pub asset_id: Option<AssetId>,
    pub status: EscrowStatus,
    pub locked_at: BlockNumber,
    pub auto_release_at: Option<BlockNumber>,
    pub arbiter: Option<AccountId>,
}
```

---

### Step 5: Weights (src/weights.rs)

```rust
use frame_support::weights::Weight;

pub trait WeightInfo {
    fn lock() -> Weight;
    fn release() -> Weight;
    fn refund() -> Weight;
    fn split_release() -> Weight;
    fn dispute() -> Weight;
    fn set_arbiter() -> Weight;
}

impl WeightInfo for () {
    fn lock() -> Weight {
        Weight::from_parts(60_000_000, 0)
    }
    fn release() -> Weight {
        Weight::from_parts(40_000_000, 0)
    }
    fn refund() -> Weight {
        Weight::from_parts(40_000_000, 0)
    }
    fn split_release() -> Weight {
        Weight::from_parts(80_000_000, 0)
    }
    fn dispute() -> Weight {
        Weight::from_parts(30_000_000, 0)
    }
    fn set_arbiter() -> Weight {
        Weight::from_parts(20_000_000, 0)
    }
}
```

---

### Step 6: Add to Runtime

Edit `/root/bazari-chain/runtime/src/lib.rs`:

```rust
// Add to dependencies
pub use pallet_bazari_escrow;

// Configure pallet
impl pallet_bazari_escrow::Config for Runtime {
    type RuntimeEvent = RuntimeEvent;
    type Currency = Balances;
    type Assets = Assets;
    type MaxEscrowsPerUser = ConstU32<1000>;
    type MaxReleasesPerBlock = ConstU32<100>;
    type DefaultAutoReleaseBlocks = ConstU32<100800>; // 7 days
    type MaxAutoReleaseBlocks = ConstU32<432000>; // 30 days
    type MinEscrowAmount = ConstU128<1000000000000>; // 0.001 BZR
    type ArbiterOrigin = EnsureRoot<AccountId>;
    type WeightInfo = ();
}

// Add to construct_runtime!
construct_runtime!(
    pub struct Runtime {
        // ... existing pallets
        BazariEscrow: pallet_bazari_escrow,
    }
);
```

---

### Step 7: Build and Test

```bash
# Build pallet
cd /root/bazari-chain
cargo build --release --package pallet-bazari-escrow

# Run tests
cargo test --package pallet-bazari-escrow

# Build runtime
cargo build --release
```

---

## 🧪 Unit Tests Example

Create `src/tests.rs`:

```rust
use super::*;
use crate as pallet_bazari_escrow;
use frame_support::{assert_noop, assert_ok, parameter_types};

// ... (mock setup similar to bazari-commerce)

#[test]
fn lock_and_release_works() {
    new_test_ext().execute_with(|| {
        let depositor = 1u64;
        let beneficiary = 2u64;
        let amount = 10_000u128;

        // Lock escrow
        assert_ok!(BazariEscrow::lock(
            RuntimeOrigin::signed(depositor),
            beneficiary,
            amount,
            None,
            Some(100), // Auto-release in 100 blocks
            None,
        ));

        let escrow = BazariEscrow::escrows(0).unwrap();
        assert_eq!(escrow.status, EscrowStatus::Locked);

        // Manual release
        assert_ok!(BazariEscrow::release(RuntimeOrigin::signed(depositor), 0));

        let escrow = BazariEscrow::escrows(0).unwrap();
        assert_eq!(escrow.status, EscrowStatus::Released);
    });
}

#[test]
fn auto_release_works() {
    new_test_ext().execute_with(|| {
        // Lock with auto-release at block 100
        // ... (setup code)

        // Advance to block 100
        System::set_block_number(100);
        BazariEscrow::on_finalize(100);

        // Verify auto-released
        let escrow = BazariEscrow::escrows(0).unwrap();
        assert_eq!(escrow.status, EscrowStatus::Released);
    });
}

#[test]
fn split_release_works() {
    new_test_ext().execute_with(|| {
        // Lock 10,000 units
        // ... (setup code)

        // Split: 60% to seller, 30% to affiliate, 10% to platform
        let splits = vec![
            (2u64, 60), // Seller
            (3u64, 30), // Affiliate
            (4u64, 10), // Platform
        ];

        assert_ok!(BazariEscrow::split_release(
            RuntimeOrigin::signed(depositor),
            0,
            splits,
        ));

        let escrow = BazariEscrow::escrows(0).unwrap();
        assert_eq!(escrow.status, EscrowStatus::PartiallyReleased);
    });
}
```

---

## 🚀 Deployment Checklist

- [ ] All unit tests passing
- [ ] Auto-release hook tested (on_finalize)
- [ ] Multi-asset support implemented
- [ ] Weight benchmarks completed
- [ ] Integration tests with bazari-commerce
- [ ] Testnet deployment successful

---

## 📚 Next Steps

After completing this pallet:
1. Integrate with [bazari-commerce](../bazari-commerce/INTEGRATION.md)
2. Backend integration ([INTEGRATION.md](INTEGRATION.md))
3. Implement [bazari-rewards](../bazari-rewards/IMPLEMENTATION.md)
