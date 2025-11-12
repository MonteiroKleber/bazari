# bazari-fulfillment Pallet - Technical Specification

**Status**: 🎯 Priority 2 - Proof of Commerce
**Effort**: 1-2 weeks
**Dependencies**: `bazari-identity`

---

## 🎯 Purpose

Courier registry with staking, reputation-based matching, and slashing for misconduct.

**Problem**: No verifiable courier system. Deliveries rely on centralized logistics without accountability.

**Solution**: On-chain courier registry with stake (1000 BZR minimum), reputation scoring, and slashing mechanism for failed/disputed deliveries.

---

## 📦 Storage Items

### 1. Couriers

```rust
#[pallet::storage]
#[pallet::getter(fn couriers)]
pub type Couriers<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    T::AccountId,
    Courier<T::BlockNumber>,
    OptionQuery,
>;
```

**Courier Struct**:
```rust
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
#[scale_info(skip_type_params(T))]
pub struct Courier<BlockNumber> {
    pub account: AccountId,
    pub stake: Balance,
    pub reputation_score: u32, // 0-1000
    pub service_areas: BoundedVec<GeoHash, ConstU32<10>>,
    pub total_deliveries: u32,
    pub successful_deliveries: u32,
    pub disputed_deliveries: u32,
    pub is_active: bool,
    pub registered_at: BlockNumber,
}
```

**GeoHash**: H3 geohash (u64) for location-based matching

---

### 2. OrderCouriers

```rust
#[pallet::storage]
pub type OrderCouriers<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    OrderId,
    T::AccountId, // Assigned courier
    OptionQuery,
>;
```

---

### 3. CourierDeliveries

```rust
#[pallet::storage]
pub type CourierDeliveries<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    T::AccountId,
    BoundedVec<OrderId, T::MaxDeliveriesPerCourier>,
    ValueQuery,
>;
```

---

## 🔧 Config Trait

```rust
#[pallet::config]
pub trait Config: frame_system::Config + bazari_identity::Config {
    type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;

    type Currency: Currency<Self::AccountId> + ReservableCurrency<Self::AccountId>;

    #[pallet::constant]
    type MinCourierStake: Get<BalanceOf<Self>>;

    #[pallet::constant]
    type MaxServiceAreas: Get<u32>;

    #[pallet::constant]
    type MaxDeliveriesPerCourier: Get<u32>;

    type DAOOrigin: EnsureOrigin<Self::RuntimeOrigin>;

    type WeightInfo: WeightInfo;
}
```

---

## 📤 Extrinsics

### 1. register_courier

```rust
#[pallet::call_index(0)]
#[pallet::weight(T::WeightInfo::register_courier())]
pub fn register_courier(
    origin: OriginFor<T>,
    stake: BalanceOf<T>,
    service_areas: Vec<GeoHash>,
) -> DispatchResult {
    let who = ensure_signed(origin)?;

    ensure!(stake >= T::MinCourierStake::get(), Error::<T>::InsufficientStake);

    // Lock stake
    T::Currency::reserve(&who, stake)?;

    let courier = Courier {
        account: who.clone(),
        stake,
        reputation_score: 500, // Start at median
        service_areas: service_areas.try_into().map_err(|_| Error::<T>::TooManyServiceAreas)?,
        total_deliveries: 0,
        successful_deliveries: 0,
        disputed_deliveries: 0,
        is_active: true,
        registered_at: <frame_system::Pallet<T>>::block_number(),
    };

    Couriers::<T>::insert(&who, courier);

    Self::deposit_event(Event::CourierRegistered { account: who, stake });

    Ok(())
}
```

### 2. assign_courier

```rust
#[pallet::call_index(1)]
#[pallet::weight(T::WeightInfo::assign_courier())]
pub fn assign_courier(
    origin: OriginFor<T>,
    order_id: OrderId,
    courier: T::AccountId,
) -> DispatchResult {
    let _ = ensure_signed(origin)?; // System or seller

    let courier_data = Couriers::<T>::get(&courier).ok_or(Error::<T>::CourierNotFound)?;

    ensure!(courier_data.is_active, Error::<T>::CourierInactive);
    ensure!(
        courier_data.stake >= T::MinCourierStake::get(),
        Error::<T>::InsufficientStake
    );

    OrderCouriers::<T>::insert(order_id, &courier);

    CourierDeliveries::<T>::try_mutate(&courier, |deliveries| {
        deliveries.try_push(order_id).map_err(|_| Error::<T>::TooManyDeliveries)
    })?;

    Self::deposit_event(Event::CourierAssigned { order_id, courier });

    Ok(())
}
```

### 3. complete_delivery

```rust
#[pallet::call_index(2)]
#[pallet::weight(T::WeightInfo::complete_delivery())]
pub fn complete_delivery(
    origin: OriginFor<T>,
    order_id: OrderId,
) -> DispatchResult {
    let courier = ensure_signed(origin)?;

    let assigned_courier = OrderCouriers::<T>::get(order_id).ok_or(Error::<T>::OrderNotAssigned)?;

    ensure!(courier == assigned_courier, Error::<T>::Unauthorized);

    Couriers::<T>::mutate(&courier, |maybe_courier| {
        if let Some(courier_data) = maybe_courier {
            courier_data.total_deliveries = courier_data.total_deliveries.saturating_add(1);
            courier_data.successful_deliveries = courier_data.successful_deliveries.saturating_add(1);

            // Update reputation (+10 points)
            courier_data.reputation_score = courier_data.reputation_score.saturating_add(10).min(1000);
        }
    });

    Self::deposit_event(Event::DeliveryCompleted { order_id, courier });

    Ok(())
}
```

### 4. slash_courier

```rust
#[pallet::call_index(3)]
#[pallet::weight(T::WeightInfo::slash_courier())]
pub fn slash_courier(
    origin: OriginFor<T>,
    courier: T::AccountId,
    slash_amount: BalanceOf<T>,
    reason: Vec<u8>,
) -> DispatchResult {
    T::DAOOrigin::ensure_origin(origin)?;

    let mut courier_data = Couriers::<T>::get(&courier).ok_or(Error::<T>::CourierNotFound)?;

    let slashed = slash_amount.min(courier_data.stake);
    T::Currency::slash_reserved(&courier, slashed);

    courier_data.stake = courier_data.stake.saturating_sub(slashed);
    courier_data.reputation_score = courier_data.reputation_score.saturating_sub(100);
    courier_data.disputed_deliveries = courier_data.disputed_deliveries.saturating_add(1);

    if courier_data.stake < T::MinCourierStake::get() {
        courier_data.is_active = false;
    }

    Couriers::<T>::insert(&courier, courier_data);

    Self::deposit_event(Event::CourierSlashed { courier, amount: slashed, reason: reason.try_into().unwrap() });

    Ok(())
}
```

---

## 📢 Events

```rust
#[pallet::event]
#[pallet::generate_deposit(pub(super) fn deposit_event)]
pub enum Event<T: Config> {
    CourierRegistered { account: T::AccountId, stake: BalanceOf<T> },
    CourierAssigned { order_id: OrderId, courier: T::AccountId },
    DeliveryCompleted { order_id: OrderId, courier: T::AccountId },
    CourierSlashed { courier: T::AccountId, amount: BalanceOf<T>, reason: BoundedVec<u8, ConstU32<128>> },
}
```

---

## ❌ Errors

```rust
#[pallet::error]
pub enum Error<T> {
    CourierNotFound,
    InsufficientStake,
    TooManyServiceAreas,
    CourierInactive,
    OrderNotAssigned,
    Unauthorized,
    TooManyDeliveries,
}
```

---

## 🔗 Matching Algorithm (Off-Chain Worker)

```rust
impl<T: Config> Pallet<T> {
    pub fn find_best_courier(
        order_location: GeoHash,
        max_distance_km: u32,
    ) -> Option<T::AccountId> {
        let mut candidates: Vec<_> = Couriers::<T>::iter()
            .filter(|(_, c)| {
                c.is_active
                    && c.stake >= T::MinCourierStake::get()
                    && c.service_areas.contains(&order_location)
            })
            .collect();

        candidates.sort_by_key(|(_, c)| sp_std::cmp::Reverse(c.reputation_score));

        candidates.first().map(|(account, _)| account.clone())
    }
}
```

---

## 📚 References

- [IMPLEMENTATION.md](IMPLEMENTATION.md)
- [INTEGRATION.md](INTEGRATION.md)
- [Proof of Commerce](../../blockchain-integration/04-PROOF-OF-COMMERCE.md)
