# bazari-fee Pallet - Implementation Guide

**Priority**: P2 | **Timeline**: Week 17 | **Effort**: 1-2 weeks

---

## 🎯 Implementation Overview

This pallet implements automatic payment splitting for orders:
- **Platform fee**: 5% to Treasury
- **Affiliate commission**: 3% to referrer (if exists)
- **Seller payment**: Remaining amount to seller

**Key Features**:
- Atomic multi-recipient transfers
- Configurable fee rates via governance
- Integration with Treasury and Affiliate pallets
- Event emission for fee tracking

---

## 📦 Step 1: Cargo.toml

```toml
[package]
name = "pallet-bazari-fee"
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

pallet-treasury = { version = "4.0.0-dev", default-features = false }
pallet-bazari-affiliate = { path = "../bazari-affiliate", default-features = false }

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
    "pallet-treasury/std",
    "pallet-bazari-affiliate/std",
]
runtime-benchmarks = ["frame-benchmarking/runtime-benchmarks"]
```

---

## 🔧 Step 2: Core Implementation

Create `runtime/src/pallets/bazari_fee/lib.rs`:

```rust
#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;

#[frame_support::pallet]
pub mod pallet {
    use frame_support::{
        pallet_prelude::*,
        traits::{Currency, Get, ReservableCurrency},
    };
    use frame_system::pallet_prelude::*;
    use sp_runtime::{
        traits::{AccountIdConversion, Zero},
        Percent,
    };
    use sp_std::vec::Vec;

    pub type BalanceOf<T> = <<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;

    #[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo)]
    pub struct FeeSplit<Balance> {
        pub platform_fee: Balance,
        pub affiliate_commission: Balance,
        pub seller_payment: Balance,
    }

    #[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
    pub struct FeeConfiguration {
        pub platform_fee_percent: u8,   // e.g., 5%
        pub affiliate_fee_percent: u8,  // e.g., 3%
    }

    impl Default for FeeConfiguration {
        fn default() -> Self {
            Self {
                platform_fee_percent: 5,
                affiliate_fee_percent: 3,
            }
        }
    }

    #[pallet::config]
    pub trait Config: frame_system::Config + pallet_bazari_affiliate::Config {
        type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
        type Currency: Currency<Self::AccountId> + ReservableCurrency<Self::AccountId>;

        /// Treasury account for platform fees
        #[pallet::constant]
        type TreasuryAccount: Get<Self::AccountId>;

        /// Default platform fee percentage (0-100)
        #[pallet::constant]
        type DefaultPlatformFeePercent: Get<u8>;

        /// Default affiliate commission percentage (0-100)
        #[pallet::constant]
        type DefaultAffiliateFeePercent: Get<u8>;
    }

    #[pallet::pallet]
    pub struct Pallet<T>(_);

    /// Fee configuration (can be updated via governance)
    #[pallet::storage]
    #[pallet::getter(fn fee_config)]
    pub type FeeConfig<T: Config> = StorageValue<_, FeeConfiguration, ValueQuery>;

    /// Fee history per order
    #[pallet::storage]
    #[pallet::getter(fn order_fees)]
    pub type OrderFees<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        u64, // orderId
        FeeSplit<BalanceOf<T>>,
        OptionQuery,
    >;

    /// Total fees collected
    #[pallet::storage]
    #[pallet::getter(fn total_platform_fees)]
    pub type TotalPlatformFees<T: Config> = StorageValue<_, BalanceOf<T>, ValueQuery>;

    #[pallet::storage]
    #[pallet::getter(fn total_affiliate_commissions)]
    pub type TotalAffiliateCommissions<T: Config> = StorageValue<_, BalanceOf<T>, ValueQuery>;

    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        PaymentSplit {
            order_id: u64,
            buyer: T::AccountId,
            seller: T::AccountId,
            affiliate: Option<T::AccountId>,
            platform_fee: BalanceOf<T>,
            affiliate_commission: BalanceOf<T>,
            seller_payment: BalanceOf<T>,
        },
        FeeConfigUpdated {
            platform_fee_percent: u8,
            affiliate_fee_percent: u8,
        },
    }

    #[pallet::error]
    pub enum Error<T> {
        InsufficientBalance,
        InvalidFeePercentage,
        TransferFailed,
    }

    #[pallet::hooks]
    impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
        fn on_runtime_upgrade() -> Weight {
            // Initialize default fee configuration
            if !FeeConfig::<T>::exists() {
                FeeConfig::<T>::put(FeeConfiguration {
                    platform_fee_percent: T::DefaultPlatformFeePercent::get(),
                    affiliate_fee_percent: T::DefaultAffiliateFeePercent::get(),
                });
            }
            Weight::from_parts(10_000, 0)
        }
    }

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        /// Split payment for an order
        #[pallet::weight(10_000)]
        #[pallet::call_index(0)]
        pub fn split_payment(
            origin: OriginFor<T>,
            order_id: u64,
            buyer: T::AccountId,
            seller: T::AccountId,
            total_amount: BalanceOf<T>,
        ) -> DispatchResult {
            ensure_root(origin)?; // Only callable by system

            let config = FeeConfig::<T>::get();

            // Calculate fees
            let platform_fee = Self::calculate_percentage(total_amount, config.platform_fee_percent);
            let affiliate_commission = Self::calculate_percentage(total_amount, config.affiliate_fee_percent);

            // Check if buyer has referrer
            let affiliate = pallet_bazari_affiliate::Pallet::<T>::referrer_of(&buyer);

            let actual_affiliate_commission = if affiliate.is_some() {
                affiliate_commission
            } else {
                Zero::zero() // No affiliate, no commission
            };

            // Calculate seller payment (remaining after fees)
            let seller_payment = total_amount
                .saturating_sub(platform_fee)
                .saturating_sub(actual_affiliate_commission);

            // Ensure buyer has sufficient balance
            ensure!(
                T::Currency::free_balance(&buyer) >= total_amount,
                Error::<T>::InsufficientBalance
            );

            // Transfer platform fee to Treasury
            T::Currency::transfer(
                &buyer,
                &T::TreasuryAccount::get(),
                platform_fee,
                frame_support::traits::ExistenceRequirement::KeepAlive,
            )
            .map_err(|_| Error::<T>::TransferFailed)?;

            // Transfer affiliate commission (if applicable)
            if let Some(ref affiliate_account) = affiliate {
                if !actual_affiliate_commission.is_zero() {
                    T::Currency::transfer(
                        &buyer,
                        affiliate_account,
                        actual_affiliate_commission,
                        frame_support::traits::ExistenceRequirement::KeepAlive,
                    )
                    .map_err(|_| Error::<T>::TransferFailed)?;
                }
            }

            // Transfer seller payment
            T::Currency::transfer(
                &buyer,
                &seller,
                seller_payment,
                frame_support::traits::ExistenceRequirement::KeepAlive,
            )
            .map_err(|_| Error::<T>::TransferFailed)?;

            // Update totals
            TotalPlatformFees::<T>::mutate(|total| {
                *total = total.saturating_add(platform_fee);
            });

            if !actual_affiliate_commission.is_zero() {
                TotalAffiliateCommissions::<T>::mutate(|total| {
                    *total = total.saturating_add(actual_affiliate_commission);
                });
            }

            // Store fee split history
            OrderFees::<T>::insert(
                order_id,
                FeeSplit {
                    platform_fee,
                    affiliate_commission: actual_affiliate_commission,
                    seller_payment,
                },
            );

            Self::deposit_event(Event::PaymentSplit {
                order_id,
                buyer,
                seller,
                affiliate,
                platform_fee,
                affiliate_commission: actual_affiliate_commission,
                seller_payment,
            });

            Ok(())
        }

        /// Update fee configuration (governance only)
        #[pallet::weight(10_000)]
        #[pallet::call_index(1)]
        pub fn update_fee_config(
            origin: OriginFor<T>,
            platform_fee_percent: u8,
            affiliate_fee_percent: u8,
        ) -> DispatchResult {
            ensure_root(origin)?;

            ensure!(
                platform_fee_percent <= 100 && affiliate_fee_percent <= 100,
                Error::<T>::InvalidFeePercentage
            );

            ensure!(
                platform_fee_percent + affiliate_fee_percent <= 100,
                Error::<T>::InvalidFeePercentage
            );

            FeeConfig::<T>::put(FeeConfiguration {
                platform_fee_percent,
                affiliate_fee_percent,
            });

            Self::deposit_event(Event::FeeConfigUpdated {
                platform_fee_percent,
                affiliate_fee_percent,
            });

            Ok(())
        }
    }

    impl<T: Config> Pallet<T> {
        /// Calculate percentage of amount
        fn calculate_percentage(amount: BalanceOf<T>, percent: u8) -> BalanceOf<T> {
            amount * percent.into() / 100u32.into()
        }

        /// Calculate fee split without executing transfer (for preview)
        pub fn preview_split(
            buyer: &T::AccountId,
            total_amount: BalanceOf<T>,
        ) -> FeeSplit<BalanceOf<T>> {
            let config = FeeConfig::<T>::get();

            let platform_fee = Self::calculate_percentage(total_amount, config.platform_fee_percent);
            let affiliate_commission = Self::calculate_percentage(total_amount, config.affiliate_fee_percent);

            let has_affiliate = pallet_bazari_affiliate::Pallet::<T>::referrer_of(buyer).is_some();

            let actual_affiliate_commission = if has_affiliate {
                affiliate_commission
            } else {
                Zero::zero()
            };

            let seller_payment = total_amount
                .saturating_sub(platform_fee)
                .saturating_sub(actual_affiliate_commission);

            FeeSplit {
                platform_fee,
                affiliate_commission: actual_affiliate_commission,
                seller_payment,
            }
        }
    }
}
```

---

## 🏗️ Step 3: Runtime Integration

Add to `runtime/src/lib.rs`:

```rust
parameter_types! {
    pub const TreasuryPalletId: PalletId = PalletId(*b"py/trsry");
    pub TreasuryAccount: AccountId = TreasuryPalletId::get().into_account_truncating();
}

impl pallet_bazari_fee::Config for Runtime {
    type RuntimeEvent = RuntimeEvent;
    type Currency = Balances;
    type TreasuryAccount = TreasuryAccount;
    type DefaultPlatformFeePercent = ConstU8<5>;
    type DefaultAffiliateFeePercent = ConstU8<3>;
}

construct_runtime!(
    pub enum Runtime {
        // ... other pallets
        BazariFee: pallet_bazari_fee,
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
    fn split_payment_works() {
        new_test_ext().execute_with(|| {
            let buyer = account(1);
            let seller = account(2);
            let order_amount = 100;

            // Set initial balance
            Balances::make_free_balance_be(&buyer, 1000);

            assert_ok!(BazariFee::split_payment(
                RuntimeOrigin::root(),
                1,
                buyer.clone(),
                seller.clone(),
                order_amount
            ));

            // Platform fee: 5 BZR (5%)
            // No affiliate: 0 BZR
            // Seller: 95 BZR
            assert_eq!(Balances::free_balance(&TREASURY), 5);
            assert_eq!(Balances::free_balance(&seller), 95);
        });
    }

    #[test]
    fn split_payment_with_affiliate_works() {
        new_test_ext().execute_with(|| {
            let buyer = account(1);
            let seller = account(2);
            let affiliate = account(3);
            let order_amount = 100;

            Balances::make_free_balance_be(&buyer, 1000);

            // Register affiliate
            assert_ok!(BazariAffiliate::register_referral(
                RuntimeOrigin::signed(buyer.clone()),
                affiliate.clone()
            ));

            assert_ok!(BazariFee::split_payment(
                RuntimeOrigin::root(),
                1,
                buyer.clone(),
                seller.clone(),
                order_amount
            ));

            // Platform fee: 5 BZR (5%)
            // Affiliate: 3 BZR (3%)
            // Seller: 92 BZR
            assert_eq!(Balances::free_balance(&TREASURY), 5);
            assert_eq!(Balances::free_balance(&affiliate), 3);
            assert_eq!(Balances::free_balance(&seller), 92);
        });
    }

    #[test]
    fn update_fee_config_works() {
        new_test_ext().execute_with(|| {
            assert_ok!(BazariFee::update_fee_config(
                RuntimeOrigin::root(),
                10, // 10% platform fee
                5   // 5% affiliate
            ));

            let config = BazariFee::fee_config();
            assert_eq!(config.platform_fee_percent, 10);
            assert_eq!(config.affiliate_fee_percent, 5);
        });
    }

    #[test]
    fn invalid_fee_config_fails() {
        new_test_ext().execute_with(|| {
            // Total fees exceed 100%
            assert_noop!(
                BazariFee::update_fee_config(RuntimeOrigin::root(), 80, 30),
                Error::<Test>::InvalidFeePercentage
            );
        });
    }
}
```

---

## 📊 Implementation Checklist

- [ ] Week 1: Core pallet (types, storage, split_payment extrinsic)
- [ ] Week 1: Unit tests for payment splitting
- [ ] Week 1: Integration with bazari-affiliate
- [ ] Week 2: Preview functionality
- [ ] Week 2: Governance integration for fee updates
- [ ] Week 2: End-to-end testing with orders

---

## 📚 Next: [INTEGRATION.md](INTEGRATION.md) | [bazari-dispute](../bazari-dispute/SPEC.md)
