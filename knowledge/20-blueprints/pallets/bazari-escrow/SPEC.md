# bazari-escrow Pallet - Technical Specification

**Status**: 🎯 Priority 1 - CRITICAL
**Effort**: 2 weeks
**Dependencies**: `pallet-balances`, `pallet-assets`

---

## 🎯 Purpose

Provide secure on-chain escrow for payments with automatic time-locked release.

**Current Problem**: PaymentIntent table has NULL or MOCK txHash values. No real escrow protection for buyers or sellers.

**Solution**: Lock funds on-chain with cryptographic guarantees, automatic release after timeout, and support for disputes.

---

## 📦 Storage Items

### 1. Escrows

```rust
#[pallet::storage]
#[pallet::getter(fn escrows)]
pub type Escrows<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    EscrowId,
    Escrow<T::AccountId, BalanceOf<T>, BlockNumberFor<T>>,
    OptionQuery,
>;
```

**Escrow Struct**:
```rust
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
#[scale_info(skip_type_params(T))]
pub struct Escrow<AccountId, Balance, BlockNumber> {
    /// Unique escrow identifier
    pub id: EscrowId,

    /// Depositor (buyer who locks funds)
    pub depositor: AccountId,

    /// Beneficiary (seller who receives funds)
    pub beneficiary: AccountId,

    /// Amount locked (in smallest unit)
    pub amount: Balance,

    /// Asset type (None = native token, Some(id) = custom asset)
    pub asset_id: Option<AssetId>,

    /// Current status
    pub status: EscrowStatus,

    /// Block when escrow was created
    pub locked_at: BlockNumber,

    /// Block when escrow will auto-release (None = manual only)
    pub auto_release_at: Option<BlockNumber>,

    /// Arbiter account (can force release/refund in disputes)
    pub arbiter: Option<AccountId>,
}
```

**EscrowStatus Enum**:
```rust
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub enum EscrowStatus {
    /// Funds locked, awaiting release or refund
    Locked,

    /// Funds released to beneficiary
    Released,

    /// Funds refunded to depositor
    Refunded,

    /// Under dispute (arbiter required)
    Disputed,

    /// Partially released (for split releases)
    PartiallyReleased,
}
```

---

### 2. EscrowCount

```rust
#[pallet::storage]
#[pallet::getter(fn escrow_count)]
pub type EscrowCount<T> = StorageValue<_, u64, ValueQuery>;
```

Tracks total escrows created (for unique ID generation).

---

### 3. UserEscrows

```rust
#[pallet::storage]
pub type UserEscrows<T: Config> = StorageDoubleMap<
    _,
    Blake2_128Concat,
    T::AccountId, // User account
    Blake2_128Concat,
    EscrowRole,   // Depositor or Beneficiary
    BoundedVec<EscrowId, T::MaxEscrowsPerUser>,
    ValueQuery,
>;
```

**EscrowRole Enum**:
```rust
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub enum EscrowRole {
    Depositor,
    Beneficiary,
}
```

Maps users to their escrows (for dashboards).

---

### 4. PendingReleases

```rust
#[pallet::storage]
pub type PendingReleases<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    BlockNumberFor<T>,
    BoundedVec<EscrowId, T::MaxReleasesPerBlock>,
    ValueQuery,
>;
```

Tracks escrows scheduled for auto-release at specific blocks (for efficient hook execution).

---

## 🔧 Config Trait

```rust
#[pallet::config]
pub trait Config: frame_system::Config + pallet_balances::Config {
    type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;

    /// Native currency
    type Currency: Currency<Self::AccountId> + ReservableCurrency<Self::AccountId>;

    /// Multi-asset support (for ZARI, USDT, etc.)
    type Assets: fungibles::Inspect<Self::AccountId>
        + fungibles::Mutate<Self::AccountId>
        + fungibles::hold::Inspect<Self::AccountId>
        + fungibles::hold::Mutate<Self::AccountId>;

    /// Maximum escrows per user
    #[pallet::constant]
    type MaxEscrowsPerUser: Get<u32>;

    /// Maximum auto-releases per block
    #[pallet::constant]
    type MaxReleasesPerBlock: Get<u32>;

    /// Default auto-release timeout (blocks)
    /// Default: 7 days = 100,800 blocks (6s/block)
    #[pallet::constant]
    type DefaultAutoReleaseBlocks: Get<BlockNumberFor<Self>>;

    /// Maximum auto-release timeout (blocks)
    /// Maximum: 30 days = 432,000 blocks
    #[pallet::constant]
    type MaxAutoReleaseBlocks: Get<BlockNumberFor<Self>>;

    /// Minimum escrow amount (anti-spam)
    #[pallet::constant]
    type MinEscrowAmount: Get<BalanceOf<Self>>;

    /// Origin for DAO/Arbiter actions
    type ArbiterOrigin: EnsureOrigin<Self::RuntimeOrigin>;

    type WeightInfo: WeightInfo;
}
```

---

## 📤 Extrinsics

### 1. lock

```rust
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

    // Validate amount
    ensure!(
        amount >= T::MinEscrowAmount::get(),
        Error::<T>::AmountTooLow
    );

    // Validate auto-release timeout
    if let Some(blocks) = auto_release_blocks {
        ensure!(
            blocks <= T::MaxAutoReleaseBlocks::get(),
            Error::<T>::AutoReleaseTimeoutTooLong
        );
    }

    // Lock funds
    if let Some(asset) = asset_id {
        // Lock custom asset (ZARI, USDT, etc.)
        T::Assets::hold(asset, &depositor, amount)?;
    } else {
        // Lock native token (BZR)
        T::Currency::reserve(&depositor, amount)?;
    }

    // Calculate auto-release block
    let current_block = <frame_system::Pallet<T>>::block_number();
    let auto_release_at = auto_release_blocks.map(|blocks| current_block + blocks);

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
```

---

### 2. release

```rust
#[pallet::call_index(1)]
#[pallet::weight(T::WeightInfo::release())]
pub fn release(origin: OriginFor<T>, escrow_id: EscrowId) -> DispatchResult {
    let who = ensure_signed(origin)?;

    Escrows::<T>::try_mutate(escrow_id, |maybe_escrow| {
        let escrow = maybe_escrow.as_mut().ok_or(Error::<T>::EscrowNotFound)?;

        // Authorization: Only depositor (buyer) or arbiter can release
        ensure!(
            who == escrow.depositor || Some(who.clone()) == escrow.arbiter,
            Error::<T>::Unauthorized
        );
        ensure!(escrow.status == EscrowStatus::Locked, Error::<T>::InvalidStatus);

        // Release funds to beneficiary
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
```

---

### 3. refund

```rust
#[pallet::call_index(2)]
#[pallet::weight(T::WeightInfo::refund())]
pub fn refund(origin: OriginFor<T>, escrow_id: EscrowId) -> DispatchResult {
    let who = ensure_signed(origin)?;

    Escrows::<T>::try_mutate(escrow_id, |maybe_escrow| {
        let escrow = maybe_escrow.as_mut().ok_or(Error::<T>::EscrowNotFound)?;

        // Authorization: Only beneficiary (seller) or arbiter can refund
        ensure!(
            who == escrow.beneficiary || Some(who.clone()) == escrow.arbiter,
            Error::<T>::Unauthorized
        );
        ensure!(escrow.status == EscrowStatus::Locked, Error::<T>::InvalidStatus);

        // Refund to depositor
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
```

---

### 4. split_release

```rust
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

        // Authorization: Only depositor or arbiter
        ensure!(
            who == escrow.depositor || Some(who.clone()) == escrow.arbiter,
            Error::<T>::Unauthorized
        );
        ensure!(escrow.status == EscrowStatus::Locked, Error::<T>::InvalidStatus);

        // Validate splits sum to 100%
        let total_percent: u8 = splits.iter().map(|(_, p)| *p).sum();
        ensure!(total_percent == 100, Error::<T>::InvalidSplitPercentage);

        // Execute splits
        for (recipient, percent) in splits {
            let split_amount = escrow.amount
                .saturating_mul(percent.into())
                .saturating_div(100u32.into());

            if let Some(asset) = escrow.asset_id {
                T::Assets::transfer(
                    asset,
                    &escrow.depositor,
                    &recipient,
                    split_amount,
                    true, // keep_alive
                )?;
            } else {
                T::Currency::unreserve(&escrow.depositor, split_amount);
                T::Currency::transfer(
                    &escrow.depositor,
                    &recipient,
                    split_amount,
                    frame_support::traits::ExistenceRequirement::KeepAlive,
                )?;
            }

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
```

---

### 5. dispute

```rust
#[pallet::call_index(4)]
#[pallet::weight(T::WeightInfo::dispute())]
pub fn dispute(origin: OriginFor<T>, escrow_id: EscrowId) -> DispatchResult {
    let who = ensure_signed(origin)?;

    Escrows::<T>::try_mutate(escrow_id, |maybe_escrow| {
        let escrow = maybe_escrow.as_mut().ok_or(Error::<T>::EscrowNotFound)?;

        // Either party can open dispute
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
```

---

### 6. set_arbiter

```rust
#[pallet::call_index(5)]
#[pallet::weight(T::WeightInfo::set_arbiter())]
pub fn set_arbiter(
    origin: OriginFor<T>,
    escrow_id: EscrowId,
    arbiter: T::AccountId,
) -> DispatchResult {
    // Only DAO can set arbiter
    T::ArbiterOrigin::ensure_origin(origin)?;

    Escrows::<T>::try_mutate(escrow_id, |maybe_escrow| {
        let escrow = maybe_escrow.as_mut().ok_or(Error::<T>::EscrowNotFound)?;

        escrow.arbiter = Some(arbiter.clone());

        Self::deposit_event(Event::ArbiterSet { escrow_id, arbiter });

        Ok(())
    })
}
```

---

## 🪝 Hooks (Auto-Release)

```rust
#[pallet::hooks]
impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
    fn on_finalize(block_number: BlockNumberFor<T>) {
        // Process pending releases for this block
        if let Some(escrow_ids) = PendingReleases::<T>::take(block_number) {
            for escrow_id in escrow_ids {
                if let Some(mut escrow) = Escrows::<T>::get(escrow_id) {
                    if escrow.status == EscrowStatus::Locked {
                        // Auto-release to beneficiary
                        if Self::release_internal(&escrow).is_ok() {
                            escrow.status = EscrowStatus::Released;
                            Escrows::<T>::insert(escrow_id, escrow.clone());

                            Self::deposit_event(Event::EscrowAutoReleased {
                                escrow_id,
                                beneficiary: escrow.beneficiary,
                                amount: escrow.amount,
                            });
                        }
                    }
                }
            }
        }
    }
}
```

---

## 📢 Events

```rust
#[pallet::event]
#[pallet::generate_deposit(pub(super) fn deposit_event)]
pub enum Event<T: Config> {
    /// Escrow locked
    EscrowLocked {
        escrow_id: EscrowId,
        depositor: T::AccountId,
        beneficiary: T::AccountId,
        amount: BalanceOf<T>,
        asset_id: Option<AssetId>,
        release_at: Option<BlockNumberFor<T>>,
    },

    /// Escrow manually released
    EscrowReleased {
        escrow_id: EscrowId,
        beneficiary: T::AccountId,
        amount: BalanceOf<T>,
    },

    /// Escrow auto-released after timeout
    EscrowAutoReleased {
        escrow_id: EscrowId,
        beneficiary: T::AccountId,
        amount: BalanceOf<T>,
    },

    /// Escrow refunded
    EscrowRefunded {
        escrow_id: EscrowId,
        depositor: T::AccountId,
        amount: BalanceOf<T>,
    },

    /// Escrow split released
    EscrowSplitReleased {
        escrow_id: EscrowId,
        recipient: T::AccountId,
        amount: BalanceOf<T>,
    },

    /// Dispute opened
    EscrowDisputed {
        escrow_id: EscrowId,
        initiator: T::AccountId,
    },

    /// Arbiter assigned
    ArbiterSet {
        escrow_id: EscrowId,
        arbiter: T::AccountId,
    },
}
```

---

## ❌ Errors

```rust
#[pallet::error]
pub enum Error<T> {
    /// Escrow not found
    EscrowNotFound,

    /// Unauthorized action
    Unauthorized,

    /// Invalid escrow status
    InvalidStatus,

    /// Amount too low
    AmountTooLow,

    /// Auto-release timeout too long
    AutoReleaseTimeoutTooLong,

    /// Too many escrows per user
    TooManyEscrows,

    /// Too many releases per block
    TooManyReleases,

    /// Invalid split percentage (must sum to 100)
    InvalidSplitPercentage,

    /// Arithmetic overflow
    Overflow,
}
```

---

## 🔗 Integration Points

### With bazari-commerce
- `bazari_commerce::mark_paid()` calls `bazari_escrow::lock()`
- `bazari_commerce::mark_delivered()` calls `bazari_escrow::release()`

### With bazari-dispute (Phase 2)
- `bazari_dispute::execute_ruling()` calls `bazari_escrow::split_release()` or `refund()`

### With bazari-affiliate (Phase 2)
- Commission splits use `split_release()` for multi-recipient payouts

---

## 📊 Weight Functions

```rust
pub trait WeightInfo {
    fn lock() -> Weight;
    fn release() -> Weight;
    fn refund() -> Weight;
    fn split_release() -> Weight;
    fn dispute() -> Weight;
    fn set_arbiter() -> Weight;
}
```

---

## 🧪 Tests Required

1. **Lock**: Native token vs custom asset
2. **Release**: Manual vs auto-release
3. **Refund**: Before and after timeout
4. **Split release**: Multi-recipient payouts
5. **Dispute**: Status change and arbiter intervention
6. **Edge cases**: Amount too low, timeout too long, overflow

---

## 📚 References

- [Implementation Guide](IMPLEMENTATION.md)
- [Backend Integration](INTEGRATION.md)
- [Target Architecture](../../blockchain-integration/02-TARGET-ARCHITECTURE.md)
- [Proof of Commerce](../../blockchain-integration/04-PROOF-OF-COMMERCE.md)
