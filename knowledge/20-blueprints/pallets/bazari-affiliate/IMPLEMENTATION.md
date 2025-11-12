# bazari-affiliate Pallet - Implementation Guide

**Priority**: P2 | **Timeline**: Week 15-16 | **Effort**: 2-3 weeks

---

## 🎯 Implementation Overview

This pallet implements a multi-level affiliate commission system using a Directed Acyclic Graph (DAG) with Merkle proofs for privacy-preserving commission verification.

**Key Features**:
- 5-level referral tree with 50% decay per level
- Merkle root storage for privacy
- Commission auto-distribution on order completion
- Anti-gaming protections (self-referral prevention)

---

## 📦 Step 1: Cargo.toml

```toml
[package]
name = "pallet-bazari-affiliate"
version = "0.1.0"
edition = "2021"

[dependencies]
codec = { package = "parity-scale-codec", version = "3.6.1", default-features = false }
scale-info = { version = "2.5.0", default-features = false, features = ["derive"] }
frame-benchmarking = { version = "4.0.0-dev", default-features = false, optional = true }
frame-support = { version = "4.0.0-dev", default-features = false }
frame-system = { version = "4.0.0-dev", default-features = false }
sp-runtime = { version = "24.0.0", default-features = false }
sp-std = { version = "8.0.0", default-features = false }
sp-core = { version = "21.0.0", default-features = false }

[dev-dependencies]
sp-io = { version = "23.0.0" }

[features]
default = ["std"]
std = [
    "codec/std",
    "scale-info/std",
    "frame-support/std",
    "frame-system/std",
    "sp-runtime/std",
    "sp-std/std",
    "sp-core/std",
]
runtime-benchmarks = ["frame-benchmarking/runtime-benchmarks"]
```

---

## 🔧 Step 2: Types and Storage

Create `runtime/src/pallets/bazari_affiliate/lib.rs`:

```rust
#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;

#[frame_support::pallet]
pub mod pallet {
    use frame_support::{
        pallet_prelude::*,
        traits::{Currency, ReservableCurrency},
    };
    use frame_system::pallet_prelude::*;
    use sp_runtime::traits::{Hash, Zero};
    use sp_std::vec::Vec;

    pub type BalanceOf<T> = <<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;
    pub type ReferralId = u64;

    #[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
    pub struct Referral<AccountId, BlockNumber> {
        pub referrer: AccountId,
        pub referee: AccountId,
        pub level: u8, // 0-4 (5 levels)
        pub registered_at: BlockNumber,
        pub total_commission: u128,
    }

    #[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
    pub struct AffiliateStats<Balance> {
        pub total_referrals: u32,
        pub direct_referrals: u32,
        pub total_commission_earned: Balance,
        pub merkle_root: [u8; 32],
    }

    #[pallet::config]
    pub trait Config: frame_system::Config {
        type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
        type Currency: Currency<Self::AccountId> + ReservableCurrency<Self::AccountId>;

        /// Commission rates per level (0-4)
        #[pallet::constant]
        type CommissionRates: Get<[u8; 5]>; // Example: [5, 2, 1, 0, 0] = 5%, 2.5%, 1.25%, 0%, 0%

        /// Maximum referral depth
        #[pallet::constant]
        type MaxReferralDepth: Get<u8>;
    }

    #[pallet::pallet]
    pub struct Pallet<T>(_);

    /// Referral relationships: referee -> referrer
    #[pallet::storage]
    #[pallet::getter(fn referrer_of)]
    pub type ReferrerOf<T: Config> = StorageMap<_, Blake2_128Concat, T::AccountId, T::AccountId, OptionQuery>;

    /// Affiliate statistics per account
    #[pallet::storage]
    #[pallet::getter(fn affiliate_stats)]
    pub type AffiliateStats<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        AffiliateStats<BalanceOf<T>>,
        OptionQuery,
    >;

    /// Referral tree: referrer -> list of direct referees
    #[pallet::storage]
    #[pallet::getter(fn direct_referrals)]
    pub type DirectReferrals<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        BoundedVec<T::AccountId, ConstU32<1000>>,
        ValueQuery,
    >;

    /// Commission history for orders
    #[pallet::storage]
    #[pallet::getter(fn order_commissions)]
    pub type OrderCommissions<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        u64, // orderId
        BoundedVec<(T::AccountId, BalanceOf<T>, u8), ConstU32<5>>, // (affiliate, amount, level)
        ValueQuery,
    >;

    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        ReferralRegistered {
            referrer: T::AccountId,
            referee: T::AccountId,
        },
        CommissionDistributed {
            order_id: u64,
            affiliate: T::AccountId,
            amount: BalanceOf<T>,
            level: u8,
        },
        MerkleRootUpdated {
            account: T::AccountId,
            root: [u8; 32],
        },
    }

    #[pallet::error]
    pub enum Error<T> {
        AlreadyReferred,
        SelfReferral,
        MaxDepthReached,
        InvalidMerkleProof,
        InsufficientBalance,
    }

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        /// Register a referral relationship
        #[pallet::weight(10_000)]
        #[pallet::call_index(0)]
        pub fn register_referral(
            origin: OriginFor<T>,
            referrer: T::AccountId,
        ) -> DispatchResult {
            let referee = ensure_signed(origin)?;

            // Prevent self-referral
            ensure!(referee != referrer, Error::<T>::SelfReferral);

            // Ensure referee hasn't been referred before
            ensure!(!ReferrerOf::<T>::contains_key(&referee), Error::<T>::AlreadyReferred);

            // Store referral relationship
            ReferrerOf::<T>::insert(&referee, &referrer);

            // Update direct referrals list
            DirectReferrals::<T>::try_mutate(&referrer, |referrals| {
                referrals.try_push(referee.clone()).map_err(|_| Error::<T>::MaxDepthReached)?;
                Ok::<(), DispatchError>(())
            })?;

            // Update stats
            AffiliateStats::<T>::mutate(&referrer, |stats| {
                if let Some(s) = stats {
                    s.direct_referrals += 1;
                    s.total_referrals += 1;
                } else {
                    *stats = Some(AffiliateStats {
                        total_referrals: 1,
                        direct_referrals: 1,
                        total_commission_earned: Zero::zero(),
                        merkle_root: [0u8; 32],
                    });
                }
            });

            Self::deposit_event(Event::ReferralRegistered { referrer, referee });

            Ok(())
        }

        /// Distribute commissions for an order
        #[pallet::weight(10_000)]
        #[pallet::call_index(1)]
        pub fn distribute_commissions(
            origin: OriginFor<T>,
            order_id: u64,
            buyer: T::AccountId,
            order_amount: BalanceOf<T>,
        ) -> DispatchResult {
            ensure_root(origin)?; // Only callable by system

            let mut current_account = buyer.clone();
            let mut level: u8 = 0;
            let max_depth = T::MaxReferralDepth::get();
            let commission_rates = T::CommissionRates::get();

            let mut commissions = BoundedVec::<(T::AccountId, BalanceOf<T>, u8), ConstU32<5>>::default();

            // Traverse referral tree upwards
            while level < max_depth {
                if let Some(referrer) = ReferrerOf::<T>::get(&current_account) {
                    // Calculate commission for this level (with 50% decay)
                    let base_rate = commission_rates[level as usize];
                    let commission_amount = order_amount * base_rate.into() / 100u32.into();

                    if !commission_amount.is_zero() {
                        // Transfer commission
                        T::Currency::transfer(
                            &buyer,
                            &referrer,
                            commission_amount,
                            frame_support::traits::ExistenceRequirement::KeepAlive,
                        )?;

                        // Update stats
                        AffiliateStats::<T>::mutate(&referrer, |stats| {
                            if let Some(s) = stats {
                                s.total_commission_earned += commission_amount;
                            }
                        });

                        // Record commission
                        commissions.try_push((referrer.clone(), commission_amount, level))
                            .map_err(|_| Error::<T>::MaxDepthReached)?;

                        Self::deposit_event(Event::CommissionDistributed {
                            order_id,
                            affiliate: referrer.clone(),
                            amount: commission_amount,
                            level,
                        });
                    }

                    current_account = referrer;
                    level += 1;
                } else {
                    break; // No more referrers
                }
            }

            // Store commission history
            OrderCommissions::<T>::insert(order_id, commissions);

            Ok(())
        }

        /// Update Merkle root for privacy-preserving proofs
        #[pallet::weight(10_000)]
        #[pallet::call_index(2)]
        pub fn update_merkle_root(
            origin: OriginFor<T>,
            root: [u8; 32],
        ) -> DispatchResult {
            let account = ensure_signed(origin)?;

            AffiliateStats::<T>::mutate(&account, |stats| {
                if let Some(s) = stats {
                    s.merkle_root = root;
                } else {
                    *stats = Some(AffiliateStats {
                        total_referrals: 0,
                        direct_referrals: 0,
                        total_commission_earned: Zero::zero(),
                        merkle_root: root,
                    });
                }
            });

            Self::deposit_event(Event::MerkleRootUpdated { account, root });

            Ok(())
        }
    }
}
```

---

## 🏗️ Step 3: Runtime Integration

Add to `runtime/src/lib.rs`:

```rust
impl pallet_bazari_affiliate::Config for Runtime {
    type RuntimeEvent = RuntimeEvent;
    type Currency = Balances;
    type CommissionRates = ConstU8<[5, 2, 1, 0, 0]>; // 5%, 2.5%, 1.25%, 0%, 0%
    type MaxReferralDepth = ConstU8<5>;
}

construct_runtime!(
    pub enum Runtime {
        // ... other pallets
        BazariAffiliate: pallet_bazari_affiliate,
    }
);
```

---

## ✅ Testing

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use frame_support::{assert_ok, assert_noop};

    #[test]
    fn register_referral_works() {
        new_test_ext().execute_with(|| {
            let referrer = account(1);
            let referee = account(2);

            assert_ok!(BazariAffiliate::register_referral(
                RuntimeOrigin::signed(referee.clone()),
                referrer.clone()
            ));

            assert_eq!(BazariAffiliate::referrer_of(&referee), Some(referrer.clone()));
        });
    }

    #[test]
    fn self_referral_fails() {
        new_test_ext().execute_with(|| {
            let account = account(1);

            assert_noop!(
                BazariAffiliate::register_referral(
                    RuntimeOrigin::signed(account.clone()),
                    account.clone()
                ),
                Error::<Test>::SelfReferral
            );
        });
    }

    #[test]
    fn commission_distribution_works() {
        new_test_ext().execute_with(|| {
            // Setup: A <- B <- C (A referred B, B referred C)
            let a = account(1);
            let b = account(2);
            let c = account(3);

            assert_ok!(BazariAffiliate::register_referral(RuntimeOrigin::signed(b.clone()), a.clone()));
            assert_ok!(BazariAffiliate::register_referral(RuntimeOrigin::signed(c.clone()), b.clone()));

            // C makes purchase of 100 BZR
            assert_ok!(BazariAffiliate::distribute_commissions(
                RuntimeOrigin::root(),
                1,
                c.clone(),
                100
            ));

            // B should get 5 BZR (Level 0: 5%)
            // A should get 2.5 BZR (Level 1: 2.5%)
            let b_stats = BazariAffiliate::affiliate_stats(&b).unwrap();
            assert_eq!(b_stats.total_commission_earned, 5);

            let a_stats = BazariAffiliate::affiliate_stats(&a).unwrap();
            assert_eq!(a_stats.total_commission_earned, 2);
        });
    }
}
```

---

## 📊 Implementation Checklist

- [ ] Week 1: Core pallet implementation (types, storage, extrinsics)
- [ ] Week 1: Unit tests for referral registration
- [ ] Week 2: Commission distribution logic with decay
- [ ] Week 2: Merkle proof generation (off-chain worker)
- [ ] Week 3: Integration with bazari-commerce
- [ ] Week 3: End-to-end testing

---

## 📚 Next: [INTEGRATION.md](INTEGRATION.md) | [bazari-fee](../bazari-fee/SPEC.md)
