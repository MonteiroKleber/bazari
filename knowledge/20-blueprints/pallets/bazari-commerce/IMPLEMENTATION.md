# bazari-commerce Pallet - Implementation Guide

**Estimated Time**: 2-3 weeks
**Difficulty**: Medium
**Prerequisites**: Rust, Substrate FRAME basics

---

## 📋 Implementation Checklist

### Week 1: Core Setup (5 days)
- [ ] Day 1-2: Project scaffolding + basic storage
- [ ] Day 3-4: Implement `create_order()` extrinsic
- [ ] Day 5: Unit tests for order creation

### Week 2: State Transitions (5 days)
- [ ] Day 1: Implement `accept_proposal()` and `mark_paid()`
- [ ] Day 2: Implement `mark_shipped()` and `mark_delivered()`
- [ ] Day 3: Implement `cancel_order()`
- [ ] Day 4: State machine validation tests
- [ ] Day 5: Integration with pallet-stores

### Week 3: Advanced Features (5 days)
- [ ] Day 1-2: Receipt NFT implementation
- [ ] Day 3: Sales records and commission logic
- [ ] Day 4: Weight benchmarking
- [ ] Day 5: End-to-end tests + documentation

---

## 🚀 Step-by-Step Implementation

### Step 1: Create Pallet Directory

```bash
cd /root/bazari-chain/pallets
mkdir bazari-commerce
cd bazari-commerce
```

Create directory structure:
```
bazari-commerce/
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
name = "pallet-bazari-commerce"
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

# Local dependencies
pallet-stores = { path = "../stores", default-features = false }

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
    "pallet-stores/std",
]
runtime-benchmarks = ["frame-support/runtime-benchmarks"]
try-runtime = ["frame-support/try-runtime"]
```

---

### Step 3: Define Types (src/types.rs)

```rust
use codec::{Decode, Encode, MaxEncodedLen};
use scale_info::TypeInfo;
use sp_runtime::RuntimeDebug;
use sp_std::vec::Vec;

/// Order ID type (u64)
pub type OrderId = u64;

/// Sale ID type (u64)
pub type SaleId = u64;

/// NFT ID type (u64)
pub type NftId = u64;

/// Store ID type (re-export from pallet-stores)
pub type StoreId = u64;

/// Thread ID for BazChat orders
pub type ThreadId = [u8; 32];

/// Product ID (IPFS CID or UUID)
pub type ProductId = [u8; 32];

/// Escrow ID (from bazari-escrow pallet)
pub type EscrowId = u64;

/// Balance type alias
pub type Balance = u128;

/// Order source
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub enum OrderSource {
    Marketplace,
    BazChat,
}

/// Order status
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub enum OrderStatus {
    Proposed,
    Pending,
    Paid,
    Processing,
    Shipped,
    Delivered,
    Cancelled,
    Refunded,
    Disputed,
}

impl OrderStatus {
    /// Check if transition is valid
    pub fn can_transition_to(&self, new_status: &OrderStatus) -> bool {
        use OrderStatus::*;
        matches!(
            (self, new_status),
            (Proposed, Pending)
                | (Proposed, Cancelled)
                | (Pending, Paid)
                | (Pending, Cancelled)
                | (Paid, Processing)
                | (Paid, Shipped)
                | (Paid, Disputed)
                | (Processing, Shipped)
                | (Shipped, Delivered)
                | (Shipped, Disputed)
                | (Disputed, Delivered)
                | (Disputed, Refunded)
        )
    }
}

/// Order item
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub struct OrderItem {
    pub product_id: ProductId,
    pub store_id: StoreId,
    pub quantity: u32,
    pub unit_price: Balance,
    pub subtotal: Balance,
}

impl OrderItem {
    pub fn new(product_id: ProductId, store_id: StoreId, quantity: u32, unit_price: Balance) -> Self {
        Self {
            product_id,
            store_id,
            quantity,
            unit_price,
            subtotal: unit_price.saturating_mul(quantity as u128),
        }
    }
}
```

---

### Step 4: Main Pallet (src/lib.rs - Part 1: Pallet Declaration)

```rust
#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;
pub mod types;
pub mod weights;

#[cfg(test)]
mod tests;

use frame_support::{
    pallet_prelude::*,
    traits::{Currency, ReservableCurrency},
};
use frame_system::pallet_prelude::*;
use sp_runtime::traits::{CheckedAdd, CheckedDiv, CheckedMul};
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
    pub trait Config: frame_system::Config + pallet_stores::Config {
        type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;

        type Currency: Currency<Self::AccountId> + ReservableCurrency<Self::AccountId>;

        #[pallet::constant]
        type MaxItemsPerOrder: Get<u32>;

        #[pallet::constant]
        type MaxOrdersPerUser: Get<u32>;

        #[pallet::constant]
        type MaxOrdersPerStore: Get<u32>;

        #[pallet::constant]
        type MaxIpfsCidLength: Get<u32>;

        #[pallet::constant]
        type PlatformFeePercent: Get<u8>;

        #[pallet::constant]
        type TreasuryAccount: Get<Self::AccountId>;

        type DAOOrigin: EnsureOrigin<Self::RuntimeOrigin>;

        type WeightInfo: WeightInfo;
    }

    // Storage items
    #[pallet::storage]
    #[pallet::getter(fn orders)]
    pub type Orders<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        OrderId,
        Order<T::AccountId, BlockNumberFor<T>>,
        OptionQuery,
    >;

    #[pallet::storage]
    #[pallet::getter(fn order_count)]
    pub type OrderCount<T> = StorageValue<_, u64, ValueQuery>;

    #[pallet::storage]
    pub type UserOrders<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        T::AccountId,
        BoundedVec<OrderId, T::MaxOrdersPerUser>,
        ValueQuery,
    >;

    #[pallet::storage]
    pub type StoreOrders<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        StoreId,
        BoundedVec<OrderId, T::MaxOrdersPerStore>,
        ValueQuery,
    >;

    #[pallet::storage]
    pub type Sales<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        SaleId,
        Sale<T::AccountId, BlockNumberFor<T>>,
        OptionQuery,
    >;

    #[pallet::storage]
    pub type SaleCount<T> = StorageValue<_, u64, ValueQuery>;

    #[pallet::storage]
    pub type ReceiptNFTs<T: Config> = StorageMap<
        _,
        Blake2_128Concat,
        NftId,
        Receipt<T::AccountId, BlockNumberFor<T>>,
        OptionQuery,
    >;

    #[pallet::storage]
    pub type NftCount<T> = StorageValue<_, u64, ValueQuery>;

    // Events
    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        OrderCreated {
            order_id: OrderId,
            buyer: T::AccountId,
            seller: T::AccountId,
            total_amount: BalanceOf<T>,
            source: OrderSource,
        },
        ProposalAccepted {
            order_id: OrderId,
            buyer: T::AccountId,
        },
        OrderPaid {
            order_id: OrderId,
            escrow_id: EscrowId,
            amount: BalanceOf<T>,
        },
        OrderShipped {
            order_id: OrderId,
        },
        OrderDelivered {
            order_id: OrderId,
            sale_id: SaleId,
        },
        ReceiptMinted {
            order_id: OrderId,
            nft_id: NftId,
            owner: T::AccountId,
        },
        OrderCancelled {
            order_id: OrderId,
        },
    }

    // Errors
    #[pallet::error]
    pub enum Error<T> {
        OrderNotFound,
        Unauthorized,
        InvalidStatus,
        EmptyOrder,
        TooManyItems,
        TooManyOrders,
        ThreadIdRequired,
        StoreIdRequired,
        InvalidOrderSource,
        CannotCancelPaidOrder,
        ReceiptAlreadyMinted,
        IpfsCidTooLong,
        Overflow,
        StoreNotFound,
        InvalidStateTransition,
    }

    // Extrinsics
    #[pallet::call]
    impl<T: Config> Pallet<T> {
        #[pallet::call_index(0)]
        #[pallet::weight(T::WeightInfo::create_order())]
        pub fn create_order(
            origin: OriginFor<T>,
            source: OrderSource,
            thread_id: Option<ThreadId>,
            seller: T::AccountId,
            store_id: Option<StoreId>,
            items: Vec<OrderItem>,
            is_multi_store: bool,
        ) -> DispatchResult {
            let buyer = ensure_signed(origin)?;

            // Validate
            ensure!(!items.is_empty(), Error::<T>::EmptyOrder);
            ensure!(
                items.len() <= T::MaxItemsPerOrder::get() as usize,
                Error::<T>::TooManyItems
            );

            // Source-specific validation
            match source {
                OrderSource::BazChat => {
                    ensure!(thread_id.is_some(), Error::<T>::ThreadIdRequired);
                }
                OrderSource::Marketplace => {
                    ensure!(store_id.is_some(), Error::<T>::StoreIdRequired);
                }
            }

            // Validate store exists
            if let Some(sid) = store_id {
                ensure!(
                    pallet_stores::Pallet::<T>::stores(sid).is_some(),
                    Error::<T>::StoreNotFound
                );
            }

            // Calculate totals
            let subtotal = items
                .iter()
                .fold(0u128, |acc, item| acc.saturating_add(item.subtotal));

            let platform_fee = subtotal
                .saturating_mul(T::PlatformFeePercent::get() as u128)
                .saturating_div(100);

            let total_amount = subtotal.saturating_add(platform_fee);

            // Convert to BalanceOf<T>
            let total_balance = total_amount.try_into().map_err(|_| Error::<T>::Overflow)?;
            let fee_balance = platform_fee.try_into().map_err(|_| Error::<T>::Overflow)?;

            // Generate order ID
            let order_id = OrderCount::<T>::get();
            OrderCount::<T>::put(order_id.saturating_add(1));

            // Create order
            let order = Order {
                id: order_id,
                source: source.clone(),
                thread_id,
                buyer: buyer.clone(),
                seller: seller.clone(),
                store_id,
                is_multi_store,
                items: items.try_into().map_err(|_| Error::<T>::TooManyItems)?,
                total_amount: total_balance,
                platform_fee: fee_balance,
                status: if source == OrderSource::BazChat {
                    OrderStatus::Proposed
                } else {
                    OrderStatus::Pending
                },
                escrow_id: None,
                receipt_nft_id: None,
                created_at: <frame_system::Pallet<T>>::block_number(),
                paid_at: None,
                shipped_at: None,
                delivered_at: None,
            };

            // Store order
            Orders::<T>::insert(order_id, order);

            // Update indexes
            UserOrders::<T>::try_mutate(&buyer, |orders| {
                orders.try_push(order_id).map_err(|_| Error::<T>::TooManyOrders)
            })?;

            if let Some(sid) = store_id {
                StoreOrders::<T>::try_mutate(sid, |orders| {
                    orders.try_push(order_id).map_err(|_| Error::<T>::TooManyOrders)
                })?;
            }

            // Emit event
            Self::deposit_event(Event::OrderCreated {
                order_id,
                buyer,
                seller,
                total_amount: total_balance,
                source,
            });

            Ok(())
        }

        #[pallet::call_index(1)]
        #[pallet::weight(T::WeightInfo::accept_proposal())]
        pub fn accept_proposal(origin: OriginFor<T>, order_id: OrderId) -> DispatchResult {
            let who = ensure_signed(origin)?;

            Orders::<T>::try_mutate(order_id, |maybe_order| {
                let order = maybe_order.as_mut().ok_or(Error::<T>::OrderNotFound)?;

                ensure!(order.buyer == who, Error::<T>::Unauthorized);
                ensure!(order.source == OrderSource::BazChat, Error::<T>::InvalidOrderSource);
                ensure!(order.status == OrderStatus::Proposed, Error::<T>::InvalidStatus);

                order.status = OrderStatus::Pending;

                Self::deposit_event(Event::ProposalAccepted { order_id, buyer: who });

                Ok(())
            })
        }

        #[pallet::call_index(2)]
        #[pallet::weight(T::WeightInfo::mark_paid())]
        pub fn mark_paid(
            origin: OriginFor<T>,
            order_id: OrderId,
            escrow_id: EscrowId,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            Orders::<T>::try_mutate(order_id, |maybe_order| {
                let order = maybe_order.as_mut().ok_or(Error::<T>::OrderNotFound)?;

                ensure!(order.buyer == who, Error::<T>::Unauthorized);
                ensure!(order.status == OrderStatus::Pending, Error::<T>::InvalidStatus);

                order.status = OrderStatus::Paid;
                order.escrow_id = Some(escrow_id);
                order.paid_at = Some(<frame_system::Pallet<T>>::block_number());

                Self::deposit_event(Event::OrderPaid {
                    order_id,
                    escrow_id,
                    amount: order.total_amount,
                });

                Ok(())
            })
        }

        #[pallet::call_index(3)]
        #[pallet::weight(T::WeightInfo::mark_shipped())]
        pub fn mark_shipped(origin: OriginFor<T>, order_id: OrderId) -> DispatchResult {
            let seller = ensure_signed(origin)?;

            Orders::<T>::try_mutate(order_id, |maybe_order| {
                let order = maybe_order.as_mut().ok_or(Error::<T>::OrderNotFound)?;

                ensure!(order.seller == seller, Error::<T>::Unauthorized);
                ensure!(order.status == OrderStatus::Paid, Error::<T>::InvalidStatus);

                order.status = OrderStatus::Shipped;
                order.shipped_at = Some(<frame_system::Pallet<T>>::block_number());

                Self::deposit_event(Event::OrderShipped { order_id });

                Ok(())
            })
        }

        #[pallet::call_index(4)]
        #[pallet::weight(T::WeightInfo::mark_delivered())]
        pub fn mark_delivered(origin: OriginFor<T>, order_id: OrderId) -> DispatchResult {
            let who = ensure_signed(origin)?;

            Orders::<T>::try_mutate(order_id, |maybe_order| {
                let order = maybe_order.as_mut().ok_or(Error::<T>::OrderNotFound)?;

                ensure!(order.buyer == who, Error::<T>::Unauthorized);
                ensure!(order.status == OrderStatus::Shipped, Error::<T>::InvalidStatus);

                order.status = OrderStatus::Delivered;
                order.delivered_at = Some(<frame_system::Pallet<T>>::block_number());

                // Create sale record
                let sale_id = Self::create_sale_internal(order)?;

                Self::deposit_event(Event::OrderDelivered { order_id, sale_id });

                Ok(())
            })
        }

        #[pallet::call_index(5)]
        #[pallet::weight(T::WeightInfo::mint_receipt())]
        pub fn mint_receipt(
            origin: OriginFor<T>,
            order_id: OrderId,
            ipfs_cid: Vec<u8>,
        ) -> DispatchResult {
            let who = ensure_signed(origin)?;

            let order = Orders::<T>::get(order_id).ok_or(Error::<T>::OrderNotFound)?;

            ensure!(order.buyer == who, Error::<T>::Unauthorized);
            ensure!(order.status == OrderStatus::Delivered, Error::<T>::InvalidStatus);
            ensure!(order.receipt_nft_id.is_none(), Error::<T>::ReceiptAlreadyMinted);

            let nft_id = NftCount::<T>::get();
            NftCount::<T>::put(nft_id.saturating_add(1));

            let receipt = Receipt {
                nft_id,
                order_id,
                owner: who.clone(),
                ipfs_cid: ipfs_cid.try_into().map_err(|_| Error::<T>::IpfsCidTooLong)?,
                minted_at: <frame_system::Pallet<T>>::block_number(),
            };

            ReceiptNFTs::<T>::insert(nft_id, receipt);

            Orders::<T>::mutate(order_id, |maybe_order| {
                if let Some(order) = maybe_order {
                    order.receipt_nft_id = Some(nft_id);
                }
            });

            Self::deposit_event(Event::ReceiptMinted { order_id, nft_id, owner: who });

            Ok(())
        }

        #[pallet::call_index(6)]
        #[pallet::weight(T::WeightInfo::cancel_order())]
        pub fn cancel_order(origin: OriginFor<T>, order_id: OrderId) -> DispatchResult {
            let who = ensure_signed(origin)?;

            Orders::<T>::try_mutate(order_id, |maybe_order| {
                let order = maybe_order.as_mut().ok_or(Error::<T>::OrderNotFound)?;

                ensure!(
                    order.buyer == who || order.seller == who,
                    Error::<T>::Unauthorized
                );
                ensure!(
                    matches!(order.status, OrderStatus::Proposed | OrderStatus::Pending),
                    Error::<T>::CannotCancelPaidOrder
                );

                order.status = OrderStatus::Cancelled;

                Self::deposit_event(Event::OrderCancelled { order_id });

                Ok(())
            })
        }
    }

    // Helper functions
    impl<T: Config> Pallet<T> {
        fn create_sale_internal(
            order: &Order<T::AccountId, BlockNumberFor<T>>,
        ) -> Result<SaleId, Error<T>> {
            let sale_id = SaleCount::<T>::get();
            SaleCount::<T>::put(sale_id.saturating_add(1));

            let sale = Sale {
                id: sale_id,
                order_id: order.id,
                seller: order.seller.clone(),
                buyer: order.buyer.clone(),
                amount: order.total_amount.saturating_sub(order.platform_fee),
                commission_paid: 0u128.try_into().map_err(|_| Error::<T>::Overflow)?,
                platform_fee_paid: order.platform_fee,
                created_at: <frame_system::Pallet<T>>::block_number(),
            };

            Sales::<T>::insert(sale_id, sale);

            Ok(sale_id)
        }
    }
}

// Order struct definition
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
#[scale_info(skip_type_params(T))]
pub struct Order<AccountId, BlockNumber> {
    pub id: OrderId,
    pub source: OrderSource,
    pub thread_id: Option<ThreadId>,
    pub buyer: AccountId,
    pub seller: AccountId,
    pub store_id: Option<StoreId>,
    pub is_multi_store: bool,
    pub items: BoundedVec<OrderItem, ConstU32<100>>,
    pub total_amount: Balance,
    pub platform_fee: Balance,
    pub status: OrderStatus,
    pub escrow_id: Option<EscrowId>,
    pub receipt_nft_id: Option<NftId>,
    pub created_at: BlockNumber,
    pub paid_at: Option<BlockNumber>,
    pub shipped_at: Option<BlockNumber>,
    pub delivered_at: Option<BlockNumber>,
}

// Sale struct
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
#[scale_info(skip_type_params(T))]
pub struct Sale<AccountId, BlockNumber> {
    pub id: SaleId,
    pub order_id: OrderId,
    pub seller: AccountId,
    pub buyer: AccountId,
    pub amount: Balance,
    pub commission_paid: Balance,
    pub platform_fee_paid: Balance,
    pub created_at: BlockNumber,
}

// Receipt struct
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
#[scale_info(skip_type_params(T))]
pub struct Receipt<AccountId, BlockNumber> {
    pub nft_id: NftId,
    pub order_id: OrderId,
    pub owner: AccountId,
    pub ipfs_cid: BoundedVec<u8, ConstU32<64>>,
    pub minted_at: BlockNumber,
}
```

---

### Step 5: Weights (src/weights.rs)

```rust
use frame_support::weights::Weight;

pub trait WeightInfo {
    fn create_order() -> Weight;
    fn accept_proposal() -> Weight;
    fn mark_paid() -> Weight;
    fn mark_shipped() -> Weight;
    fn mark_delivered() -> Weight;
    fn mint_receipt() -> Weight;
    fn cancel_order() -> Weight;
}

impl WeightInfo for () {
    fn create_order() -> Weight {
        Weight::from_parts(50_000_000, 0)
    }
    fn accept_proposal() -> Weight {
        Weight::from_parts(20_000_000, 0)
    }
    fn mark_paid() -> Weight {
        Weight::from_parts(25_000_000, 0)
    }
    fn mark_shipped() -> Weight {
        Weight::from_parts(20_000_000, 0)
    }
    fn mark_delivered() -> Weight {
        Weight::from_parts(30_000_000, 0)
    }
    fn mint_receipt() -> Weight {
        Weight::from_parts(35_000_000, 0)
    }
    fn cancel_order() -> Weight {
        Weight::from_parts(20_000_000, 0)
    }
}
```

---

### Step 6: Add to Runtime

Edit `/root/bazari-chain/runtime/src/lib.rs`:

```rust
// Add to dependencies
pub use pallet_bazari_commerce;

// Configure pallet
impl pallet_bazari_commerce::Config for Runtime {
    type RuntimeEvent = RuntimeEvent;
    type Currency = Balances;
    type MaxItemsPerOrder = ConstU32<100>;
    type MaxOrdersPerUser = ConstU32<1000>;
    type MaxOrdersPerStore = ConstU32<10000>;
    type MaxIpfsCidLength = ConstU32<64>;
    type PlatformFeePercent = ConstU8<5>;
    type TreasuryAccount = TreasuryAccountId;
    type DAOOrigin = EnsureRoot<AccountId>;
    type WeightInfo = ();
}

// Add to construct_runtime!
construct_runtime!(
    pub struct Runtime {
        // ... existing pallets
        BazariCommerce: pallet_bazari_commerce,
    }
);
```

---

### Step 7: Build and Test

```bash
# Build pallet
cd /root/bazari-chain
cargo build --release --package pallet-bazari-commerce

# Run tests
cargo test --package pallet-bazari-commerce

# Build entire runtime
cargo build --release
```

---

## 🧪 Unit Tests Example

Create `src/tests.rs`:

```rust
use super::*;
use crate as pallet_bazari_commerce;
use frame_support::{assert_noop, assert_ok, parameter_types};
use sp_core::H256;
use sp_runtime::{testing::Header, traits::{BlakeTwo256, IdentityLookup}};

type UncheckedExtrinsic = frame_system::mocking::MockUncheckedExtrinsic<Test>;
type Block = frame_system::mocking::MockBlock<Test>;

frame_support::construct_runtime!(
    pub enum Test where
        Block = Block,
        NodeBlock = Block,
        UncheckedExtrinsic = UncheckedExtrinsic,
    {
        System: frame_system,
        Balances: pallet_balances,
        BazariCommerce: pallet_bazari_commerce,
    }
);

// ... (full mock setup omitted for brevity)

#[test]
fn create_marketplace_order_works() {
    new_test_ext().execute_with(|| {
        let buyer = 1u64;
        let seller = 2u64;
        let store_id = 1u64;

        let items = vec![OrderItem::new(
            [0u8; 32],
            store_id,
            2,
            1000u128,
        )];

        assert_ok!(BazariCommerce::create_order(
            RuntimeOrigin::signed(buyer),
            OrderSource::Marketplace,
            None,
            seller,
            Some(store_id),
            items,
            false,
        ));

        let order = BazariCommerce::orders(0).unwrap();
        assert_eq!(order.buyer, buyer);
        assert_eq!(order.seller, seller);
        assert_eq!(order.status, OrderStatus::Pending);
    });
}

#[test]
fn state_transition_validation_works() {
    new_test_ext().execute_with(|| {
        // Create order
        // ... (setup code)

        // Try invalid transition
        assert_noop!(
            BazariCommerce::mark_shipped(RuntimeOrigin::signed(seller), 0),
            Error::<Test>::InvalidStatus
        );
    });
}
```

---

## 🚀 Deployment Checklist

- [ ] All unit tests passing
- [ ] Integration tests with pallet-stores passing
- [ ] Weight benchmarks completed
- [ ] Documentation updated
- [ ] Runtime upgraded with migration
- [ ] Testnet deployment successful
- [ ] Mainnet deployment scheduled

---

## 📚 Next Steps

After completing this pallet:
1. Implement [bazari-escrow](../bazari-escrow/IMPLEMENTATION.md)
2. Integrate with backend API ([INTEGRATION.md](INTEGRATION.md))
3. Update PostgreSQL sync worker
