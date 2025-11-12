# bazari-commerce Pallet - Technical Specification

**Status**: 🎯 Priority 1 - CRITICAL
**Effort**: 2-3 weeks
**Dependencies**: `pallet-stores`, `pallet-balances`

---

## 🎯 Purpose

Replace MOCK commerce system with real on-chain orders, sales, and commissions.

**Current Problem**: BazChat commerce uses fake transaction hashes (`generateMockTxHash()`) stored in PostgreSQL.

**Solution**: Store orders on-chain with real transaction hashes, immutable state transitions, and verifiable history.

---

## 📦 Storage Items

### 1. Orders

```rust
#[pallet::storage]
#[pallet::getter(fn orders)]
pub type Orders<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    OrderId,
    Order<T::AccountId, T::BlockNumber>,
    OptionQuery,
>;
```

**Order Struct**:
```rust
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
#[scale_info(skip_type_params(T))]
pub struct Order<AccountId, BlockNumber> {
    /// Unique order identifier
    pub id: OrderId,

    /// Source of order (Marketplace or BazChat)
    pub source: OrderSource,

    /// Thread ID (only for BazChat orders)
    pub thread_id: Option<ThreadId>,

    /// Buyer account
    pub buyer: AccountId,

    /// Seller account (store owner)
    pub seller: AccountId,

    /// Store ID (None if multi-store order)
    pub store_id: Option<StoreId>,

    /// Is this a multi-store order?
    pub is_multi_store: bool,

    /// Items in this order
    pub items: BoundedVec<OrderItem, T::MaxItemsPerOrder>,

    /// Total amount (in smallest unit, e.g., Planck for BZR)
    pub total_amount: BalanceOf<T>,

    /// Platform fee amount
    pub platform_fee: BalanceOf<T>,

    /// Order status
    pub status: OrderStatus,

    /// Escrow ID (if payment locked)
    pub escrow_id: Option<EscrowId>,

    /// Receipt NFT ID (minted after delivery)
    pub receipt_nft_id: Option<NftId>,

    /// Block when order was created
    pub created_at: BlockNumber,

    /// Block when order was paid
    pub paid_at: Option<BlockNumber>,

    /// Block when order was shipped
    pub shipped_at: Option<BlockNumber>,

    /// Block when order was delivered
    pub delivered_at: Option<BlockNumber>,
}
```

**OrderItem Struct**:
```rust
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub struct OrderItem {
    /// Product ID (IPFS CID or UUID)
    pub product_id: ProductId,

    /// Store ID (for multi-store orders)
    pub store_id: StoreId,

    /// Quantity
    pub quantity: u32,

    /// Unit price (in smallest unit)
    pub unit_price: Balance,

    /// Subtotal (quantity * unit_price)
    pub subtotal: Balance,
}
```

**OrderSource Enum**:
```rust
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub enum OrderSource {
    Marketplace,
    BazChat,
}
```

**OrderStatus Enum**:
```rust
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub enum OrderStatus {
    /// BazChat: Proposal created, awaiting buyer acceptance
    Proposed,

    /// Accepted/Created, awaiting payment
    Pending,

    /// Payment locked in escrow
    Paid,

    /// Order is being processed
    Processing,

    /// Seller confirmed shipment
    Shipped,

    /// Delivered (buyer confirmed or auto-released)
    Delivered,

    /// Order cancelled before payment
    Cancelled,

    /// Refunded after dispute
    Refunded,

    /// Under dispute resolution
    Disputed,
}
```

---

### 2. OrderCount

```rust
#[pallet::storage]
#[pallet::getter(fn order_count)]
pub type OrderCount<T> = StorageValue<_, u64, ValueQuery>;
```

Tracks total number of orders created (used for generating unique IDs).

---

### 3. UserOrders

```rust
#[pallet::storage]
pub type UserOrders<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    T::AccountId,
    BoundedVec<OrderId, T::MaxOrdersPerUser>,
    ValueQuery,
>;
```

Maps users to their orders (for quick lookups).

---

### 4. StoreOrders

```rust
#[pallet::storage]
pub type StoreOrders<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    StoreId,
    BoundedVec<OrderId, T::MaxOrdersPerStore>,
    ValueQuery,
>;
```

Maps stores to their orders (for seller dashboards).

---

### 5. Sales

```rust
#[pallet::storage]
#[pallet::getter(fn sales)]
pub type Sales<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    SaleId,
    Sale<T::AccountId, T::BlockNumber>,
    OptionQuery,
>;
```

**Sale Struct**:
```rust
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
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
```

---

### 6. ReceiptNFTs

```rust
#[pallet::storage]
pub type ReceiptNFTs<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    NftId,
    Receipt<T::AccountId, T::BlockNumber>,
    OptionQuery,
>;
```

**Receipt Struct**:
```rust
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub struct Receipt<AccountId, BlockNumber> {
    pub nft_id: NftId,
    pub order_id: OrderId,
    pub owner: AccountId,
    pub ipfs_cid: BoundedVec<u8, T::MaxIpfsCidLength>,
    pub minted_at: BlockNumber,
}
```

---

## 🔧 Config Trait

```rust
#[pallet::config]
pub trait Config: frame_system::Config + pallet_stores::Config {
    /// The overarching event type
    type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;

    /// Currency for handling balances
    type Currency: Currency<Self::AccountId> + ReservableCurrency<Self::AccountId>;

    /// Maximum items per order
    #[pallet::constant]
    type MaxItemsPerOrder: Get<u32>;

    /// Maximum orders per user
    #[pallet::constant]
    type MaxOrdersPerUser: Get<u32>;

    /// Maximum orders per store
    #[pallet::constant]
    type MaxOrdersPerStore: Get<u32>;

    /// Maximum IPFS CID length
    #[pallet::constant]
    type MaxIpfsCidLength: Get<u32>;

    /// Platform fee percentage (e.g., 5 = 5%)
    #[pallet::constant]
    type PlatformFeePercent: Get<u8>;

    /// Treasury account (receives platform fees)
    #[pallet::constant]
    type TreasuryAccount: Get<Self::AccountId>;

    /// Origin for DAO actions
    type DAOOrigin: EnsureOrigin<Self::RuntimeOrigin>;
}
```

---

## 📤 Extrinsics

### 1. create_order

```rust
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

    // Validate inputs
    ensure!(!items.is_empty(), Error::<T>::EmptyOrder);
    ensure!(
        items.len() <= T::MaxItemsPerOrder::get() as usize,
        Error::<T>::TooManyItems
    );

    // Validate source-specific requirements
    match source {
        OrderSource::BazChat => {
            ensure!(thread_id.is_some(), Error::<T>::ThreadIdRequired);
        }
        OrderSource::Marketplace => {
            ensure!(store_id.is_some(), Error::<T>::StoreIdRequired);
        }
    }

    // Calculate totals
    let subtotal: BalanceOf<T> = items.iter()
        .map(|item| item.subtotal)
        .sum();

    let platform_fee = subtotal
        .checked_mul(&T::PlatformFeePercent::get().into())
        .ok_or(Error::<T>::Overflow)?
        .checked_div(&100u32.into())
        .ok_or(Error::<T>::Overflow)?;

    let total_amount = subtotal
        .checked_add(&platform_fee)
        .ok_or(Error::<T>::Overflow)?;

    // Generate order ID
    let order_count = OrderCount::<T>::get();
    let order_id = OrderId::from(order_count);
    OrderCount::<T>::put(order_count.saturating_add(1));

    // Create order
    let order = Order {
        id: order_id,
        source,
        thread_id,
        buyer: buyer.clone(),
        seller: seller.clone(),
        store_id,
        is_multi_store,
        items: items.try_into().map_err(|_| Error::<T>::TooManyItems)?,
        total_amount,
        platform_fee,
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
        total_amount,
        source,
    });

    Ok(())
}
```

---

### 2. accept_proposal

```rust
#[pallet::call_index(1)]
#[pallet::weight(T::WeightInfo::accept_proposal())]
pub fn accept_proposal(
    origin: OriginFor<T>,
    order_id: OrderId,
) -> DispatchResult {
    let who = ensure_signed(origin)?;

    Orders::<T>::try_mutate(order_id, |maybe_order| {
        let order = maybe_order.as_mut().ok_or(Error::<T>::OrderNotFound)?;

        // Validate
        ensure!(order.buyer == who, Error::<T>::Unauthorized);
        ensure!(order.source == OrderSource::BazChat, Error::<T>::InvalidOrderSource);
        ensure!(order.status == OrderStatus::Proposed, Error::<T>::InvalidStatus);

        // Update status
        order.status = OrderStatus::Pending;

        Self::deposit_event(Event::ProposalAccepted { order_id, buyer: who });

        Ok(())
    })
}
```

---

### 3. mark_paid

```rust
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

        // Validate
        ensure!(order.buyer == who, Error::<T>::Unauthorized);
        ensure!(
            order.status == OrderStatus::Pending,
            Error::<T>::InvalidStatus
        );

        // Update order
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
```

---

### 4. mark_shipped

```rust
#[pallet::call_index(3)]
#[pallet::weight(T::WeightInfo::mark_shipped())]
pub fn mark_shipped(
    origin: OriginFor<T>,
    order_id: OrderId,
) -> DispatchResult {
    let seller = ensure_signed(origin)?;

    Orders::<T>::try_mutate(order_id, |maybe_order| {
        let order = maybe_order.as_mut().ok_or(Error::<T>::OrderNotFound)?;

        // Validate
        ensure!(order.seller == seller, Error::<T>::Unauthorized);
        ensure!(order.status == OrderStatus::Paid, Error::<T>::InvalidStatus);

        // Update order
        order.status = OrderStatus::Shipped;
        order.shipped_at = Some(<frame_system::Pallet<T>>::block_number());

        Self::deposit_event(Event::OrderShipped { order_id });

        Ok(())
    })
}
```

---

### 5. mark_delivered

```rust
#[pallet::call_index(4)]
#[pallet::weight(T::WeightInfo::mark_delivered())]
pub fn mark_delivered(
    origin: OriginFor<T>,
    order_id: OrderId,
) -> DispatchResult {
    let who = ensure_signed(origin)?;

    Orders::<T>::try_mutate(order_id, |maybe_order| {
        let order = maybe_order.as_mut().ok_or(Error::<T>::OrderNotFound)?;

        // Either buyer or system (auto-release) can mark delivered
        ensure!(
            order.buyer == who || Self::is_auto_release_eligible(order),
            Error::<T>::Unauthorized
        );
        ensure!(order.status == OrderStatus::Shipped, Error::<T>::InvalidStatus);

        // Update order
        order.status = OrderStatus::Delivered;
        order.delivered_at = Some(<frame_system::Pallet<T>>::block_number());

        // Create sale record
        let sale_id = Self::create_sale_record(order)?;

        Self::deposit_event(Event::OrderDelivered { order_id, sale_id });

        Ok(())
    })
}
```

---

### 6. mint_receipt

```rust
#[pallet::call_index(5)]
#[pallet::weight(T::WeightInfo::mint_receipt())]
pub fn mint_receipt(
    origin: OriginFor<T>,
    order_id: OrderId,
    ipfs_cid: Vec<u8>,
) -> DispatchResult {
    let who = ensure_signed(origin)?;

    let order = Orders::<T>::get(order_id).ok_or(Error::<T>::OrderNotFound)?;

    // Validate
    ensure!(order.buyer == who, Error::<T>::Unauthorized);
    ensure!(order.status == OrderStatus::Delivered, Error::<T>::InvalidStatus);
    ensure!(order.receipt_nft_id.is_none(), Error::<T>::ReceiptAlreadyMinted);

    // Generate NFT ID
    let nft_id = Self::next_nft_id();

    // Create receipt
    let receipt = Receipt {
        nft_id,
        order_id,
        owner: who.clone(),
        ipfs_cid: ipfs_cid.try_into().map_err(|_| Error::<T>::IpfsCidTooLong)?,
        minted_at: <frame_system::Pallet<T>>::block_number(),
    };

    // Store receipt
    ReceiptNFTs::<T>::insert(nft_id, receipt);

    // Update order
    Orders::<T>::mutate(order_id, |maybe_order| {
        if let Some(order) = maybe_order {
            order.receipt_nft_id = Some(nft_id);
        }
    });

    Self::deposit_event(Event::ReceiptMinted {
        order_id,
        nft_id,
        owner: who,
    });

    Ok(())
}
```

---

### 7. cancel_order

```rust
#[pallet::call_index(6)]
#[pallet::weight(T::WeightInfo::cancel_order())]
pub fn cancel_order(
    origin: OriginFor<T>,
    order_id: OrderId,
) -> DispatchResult {
    let who = ensure_signed(origin)?;

    Orders::<T>::try_mutate(order_id, |maybe_order| {
        let order = maybe_order.as_mut().ok_or(Error::<T>::OrderNotFound)?;

        // Validate
        ensure!(
            order.buyer == who || order.seller == who,
            Error::<T>::Unauthorized
        );
        ensure!(
            matches!(order.status, OrderStatus::Proposed | OrderStatus::Pending),
            Error::<T>::CannotCancelPaidOrder
        );

        // Update order
        order.status = OrderStatus::Cancelled;

        Self::deposit_event(Event::OrderCancelled { order_id });

        Ok(())
    })
}
```

---

## 📢 Events

```rust
#[pallet::event]
#[pallet::generate_deposit(pub(super) fn deposit_event)]
pub enum Event<T: Config> {
    /// Order created
    OrderCreated {
        order_id: OrderId,
        buyer: T::AccountId,
        seller: T::AccountId,
        total_amount: BalanceOf<T>,
        source: OrderSource,
    },

    /// Proposal accepted (BazChat)
    ProposalAccepted {
        order_id: OrderId,
        buyer: T::AccountId,
    },

    /// Order paid (escrow locked)
    OrderPaid {
        order_id: OrderId,
        escrow_id: EscrowId,
        amount: BalanceOf<T>,
    },

    /// Order shipped by seller
    OrderShipped {
        order_id: OrderId,
    },

    /// Order delivered
    OrderDelivered {
        order_id: OrderId,
        sale_id: SaleId,
    },

    /// Receipt NFT minted
    ReceiptMinted {
        order_id: OrderId,
        nft_id: NftId,
        owner: T::AccountId,
    },

    /// Order cancelled
    OrderCancelled {
        order_id: OrderId,
    },
}
```

---

## ❌ Errors

```rust
#[pallet::error]
pub enum Error<T> {
    /// Order not found
    OrderNotFound,

    /// Unauthorized action
    Unauthorized,

    /// Invalid order status for this action
    InvalidStatus,

    /// Empty order (no items)
    EmptyOrder,

    /// Too many items in order
    TooManyItems,

    /// Too many orders for user/store
    TooManyOrders,

    /// Thread ID required for BazChat orders
    ThreadIdRequired,

    /// Store ID required for Marketplace orders
    StoreIdRequired,

    /// Invalid order source
    InvalidOrderSource,

    /// Cannot cancel paid order
    CannotCancelPaidOrder,

    /// Receipt already minted
    ReceiptAlreadyMinted,

    /// IPFS CID too long
    IpfsCidTooLong,

    /// Arithmetic overflow
    Overflow,
}
```

---

## 🔗 Integration Points

### With pallet-stores
- Validates `store_id` exists
- Checks store ownership for seller authorization

### With bazari-escrow (Phase 2)
- `mark_paid()` calls `bazari_escrow::lock()`
- `mark_delivered()` triggers `bazari_escrow::release()`

### With bazari-identity
- Validates buyer/seller accounts exist
- Updates reputation after delivery

---

## 📊 Weight Functions

```rust
pub trait WeightInfo {
    fn create_order() -> Weight;
    fn accept_proposal() -> Weight;
    fn mark_paid() -> Weight;
    fn mark_shipped() -> Weight;
    fn mark_delivered() -> Weight;
    fn mint_receipt() -> Weight;
    fn cancel_order() -> Weight;
}
```

---

## 🧪 Tests Required

1. **Order creation**: Marketplace vs BazChat
2. **State transitions**: Valid and invalid transitions
3. **Authorization**: Only buyer/seller can modify
4. **Multi-store orders**: Items from multiple stores
5. **Receipt NFTs**: Minting after delivery
6. **Edge cases**: Empty orders, overflow, max items

---

## 📚 References

- [Implementation Guide](IMPLEMENTATION.md)
- [Backend Integration](INTEGRATION.md)
- [Target Architecture](../../blockchain-integration/02-TARGET-ARCHITECTURE.md)
- [Unification Strategy](../../blockchain-integration/03-UNIFICATION-STRATEGY.md)
