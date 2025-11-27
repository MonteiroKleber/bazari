# bazari-rewards Pallet - Technical Specification

**Status**: 🎯 Priority 1 - CRITICAL
**Effort**: 2 weeks
**Dependencies**: `pallet-assets`, `bazari-identity`

---

## 🎯 Purpose

Mint ZARI tokens as real on-chain assets and manage gamification missions/cashback.

**Current Problem**: Cashback is stored as a number in PostgreSQL (`cashbackBalance` column), not as real tokens. Cannot be transferred or traded.

**Solution**: Use `pallet-assets` to mint ZARI tokens, create missions that reward users, and track achievements on-chain.

---

## 📦 Storage Items

### 1. Missions

```rust
#[pallet::storage]
#[pallet::getter(fn missions)]
pub type Missions<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    MissionId,
    Mission<T::BlockNumber>,
    OptionQuery,
>;
```

**Mission Struct**:
```rust
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub struct Mission<BlockNumber> {
    /// Unique mission identifier
    pub id: MissionId,

    /// Mission name/title
    pub name: BoundedVec<u8, ConstU32<64>>,

    /// Description
    pub description: BoundedVec<u8, ConstU32<256>>,

    /// Reward amount (ZARI tokens)
    pub reward_amount: Balance,

    /// Mission type
    pub mission_type: MissionType,

    /// Target value (e.g., "complete 5 orders")
    pub target_value: u32,

    /// Maximum completions allowed (0 = unlimited)
    pub max_completions: u32,

    /// Current completion count
    pub completion_count: u32,

    /// Expiration block (None = never expires)
    pub expires_at: Option<BlockNumber>,

    /// Is mission active?
    pub is_active: bool,

    /// Created at block
    pub created_at: BlockNumber,
}
```

**MissionType Enum**:
```rust
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub enum MissionType {
    /// Complete N orders
    CompleteOrders,

    /// Spend X amount
    SpendAmount,

    /// Refer N users
    ReferUsers,

    /// Create store
    CreateStore,

    /// First purchase
    FirstPurchase,

    /// Daily login streak
    DailyStreak,

    /// Custom mission (metadata required)
    Custom,
}
```

---

### 2. UserMissions

```rust
#[pallet::storage]
pub type UserMissions<T: Config> = StorageDoubleMap<
    _,
    Blake2_128Concat,
    T::AccountId,
    Blake2_128Concat,
    MissionId,
    UserMission<T::BlockNumber>,
    OptionQuery,
>;
```

**UserMission Struct**:
```rust
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub struct UserMission<BlockNumber> {
    pub mission_id: MissionId,
    pub progress: u32,
    pub completed: bool,
    pub completed_at: Option<BlockNumber>,
    pub rewards_claimed: bool,
}
```

---

### 3. CashbackGrants

```rust
#[pallet::storage]
pub type CashbackGrants<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    GrantId,
    CashbackGrant<T::AccountId, T::BlockNumber>,
    OptionQuery,
>;
```

**CashbackGrant Struct**:
```rust
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
```

---

### 4. RewardStreaks

```rust
#[pallet::storage]
pub type RewardStreaks<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    T::AccountId,
    Streak<T::BlockNumber>,
    OptionQuery,
>;
```

**Streak Struct**:
```rust
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub struct Streak<BlockNumber> {
    pub current_streak: u32,
    pub longest_streak: u32,
    pub last_action_block: BlockNumber,
}
```

---

### 5. Counters

```rust
#[pallet::storage]
pub type MissionCount<T> = StorageValue<_, u64, ValueQuery>;

#[pallet::storage]
pub type GrantCount<T> = StorageValue<_, u64, ValueQuery>;
```

---

## 🔧 Config Trait

```rust
#[pallet::config]
pub trait Config: frame_system::Config + pallet_assets::Config {
    type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;

    /// Assets pallet for ZARI token minting
    type Assets: fungibles::Inspect<Self::AccountId, AssetId = AssetId, Balance = Balance>
        + fungibles::Mutate<Self::AccountId>
        + fungibles::Create<Self::AccountId>;

    /// ZARI asset ID
    #[pallet::constant]
    type ZariAssetId: Get<AssetId>;

    /// Platform treasury (receives minted ZARI for distribution)
    #[pallet::constant]
    type TreasuryAccount: Get<Self::AccountId>;

    /// Maximum missions
    #[pallet::constant]
    type MaxMissions: Get<u32>;

    /// Daily streak timeout (blocks)
    /// Default: 24 hours = 14,400 blocks
    #[pallet::constant]
    type StreakTimeout: Get<BlockNumberFor<Self>>;

    /// Origin for DAO actions (create missions)
    type DAOOrigin: EnsureOrigin<Self::RuntimeOrigin>;

    type WeightInfo: WeightInfo;
}
```

---

## 📤 Extrinsics

### 1. create_mission

```rust
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
    // Only DAO can create missions
    T::DAOOrigin::ensure_origin(origin)?;

    let mission_id = MissionCount::<T>::get();
    MissionCount::<T>::put(mission_id.saturating_add(1));

    let mission = Mission {
        id: mission_id,
        name: name.try_into().map_err(|_| Error::<T>::NameTooLong)?,
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
```

---

### 2. progress_mission

```rust
#[pallet::call_index(1)]
#[pallet::weight(T::WeightInfo::progress_mission())]
pub fn progress_mission(
    origin: OriginFor<T>,
    user: T::AccountId,
    mission_id: MissionId,
    progress_amount: u32,
) -> DispatchResult {
    // Can be called by user or system
    let _ = ensure_signed(origin)?;

    let mission = Missions::<T>::get(mission_id).ok_or(Error::<T>::MissionNotFound)?;

    ensure!(mission.is_active, Error::<T>::MissionInactive);

    // Check expiration
    if let Some(expires) = mission.expires_at {
        let current_block = <frame_system::Pallet<T>>::block_number();
        ensure!(current_block < expires, Error::<T>::MissionExpired);
    }

    // Update user progress
    UserMissions::<T>::try_mutate(&user, mission_id, |maybe_user_mission| {
        let user_mission = maybe_user_mission.get_or_insert(UserMission {
            mission_id,
            progress: 0,
            completed: false,
            completed_at: None,
            rewards_claimed: false,
        });

        user_mission.progress = user_mission.progress.saturating_add(progress_amount);

        // Check completion
        if user_mission.progress >= mission.target_value && !user_mission.completed {
            user_mission.completed = true;
            user_mission.completed_at = Some(<frame_system::Pallet<T>>::block_number());

            // Auto-claim rewards
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
```

---

### 3. grant_cashback

```rust
#[pallet::call_index(2)]
#[pallet::weight(T::WeightInfo::grant_cashback())]
pub fn grant_cashback(
    origin: OriginFor<T>,
    recipient: T::AccountId,
    amount: Balance,
    reason: Vec<u8>,
    order_id: Option<OrderId>,
) -> DispatchResult {
    // Can be called by DAO or system
    let _ = ensure_signed(origin)?;

    // Mint ZARI tokens to recipient
    T::Assets::mint_into(
        T::ZariAssetId::get(),
        &recipient,
        amount,
    )?;

    // Record grant
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
```

---

### 4. update_streak

```rust
#[pallet::call_index(3)]
#[pallet::weight(T::WeightInfo::update_streak())]
pub fn update_streak(
    origin: OriginFor<T>,
    user: T::AccountId,
) -> DispatchResult {
    let _ = ensure_signed(origin)?;

    let current_block = <frame_system::Pallet<T>>::block_number();

    RewardStreaks::<T>::try_mutate(&user, |maybe_streak| {
        let streak = maybe_streak.get_or_insert(Streak {
            current_streak: 0,
            longest_streak: 0,
            last_action_block: current_block,
        });

        // Check if streak is broken (more than 24h since last action)
        let block_diff = current_block.saturating_sub(streak.last_action_block);

        if block_diff > T::StreakTimeout::get() {
            // Streak broken, reset
            streak.current_streak = 1;
        } else {
            // Continue streak
            streak.current_streak = streak.current_streak.saturating_add(1);
        }

        // Update longest streak
        if streak.current_streak > streak.longest_streak {
            streak.longest_streak = streak.current_streak;
        }

        streak.last_action_block = current_block;

        // Grant bonus for milestones (7, 30, 100 days)
        match streak.current_streak {
            7 => Self::grant_streak_bonus(&user, 1000)?,  // 1000 ZARI
            30 => Self::grant_streak_bonus(&user, 5000)?, // 5000 ZARI
            100 => Self::grant_streak_bonus(&user, 20000)?, // 20000 ZARI
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
```

---

### 5. deactivate_mission

```rust
#[pallet::call_index(4)]
#[pallet::weight(T::WeightInfo::deactivate_mission())]
pub fn deactivate_mission(
    origin: OriginFor<T>,
    mission_id: MissionId,
) -> DispatchResult {
    T::DAOOrigin::ensure_origin(origin)?;

    Missions::<T>::try_mutate(mission_id, |maybe_mission| {
        let mission = maybe_mission.as_mut().ok_or(Error::<T>::MissionNotFound)?;

        mission.is_active = false;

        Self::deposit_event(Event::MissionDeactivated { mission_id });

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
    /// Mission created
    MissionCreated {
        mission_id: MissionId,
        name: BoundedVec<u8, ConstU32<64>>,
        reward_amount: Balance,
        mission_type: MissionType,
    },

    /// User completed mission
    MissionCompleted {
        user: T::AccountId,
        mission_id: MissionId,
        reward_amount: Balance,
    },

    /// Cashback granted
    CashbackGranted {
        recipient: T::AccountId,
        amount: Balance,
        grant_id: GrantId,
    },

    /// Streak updated
    StreakUpdated {
        user: T::AccountId,
        streak: u32,
    },

    /// Mission deactivated
    MissionDeactivated {
        mission_id: MissionId,
    },

    /// Streak bonus granted
    StreakBonusGranted {
        user: T::AccountId,
        streak: u32,
        bonus_amount: Balance,
    },
}
```

---

## ❌ Errors

```rust
#[pallet::error]
pub enum Error<T> {
    /// Mission not found
    MissionNotFound,

    /// Mission inactive
    MissionInactive,

    /// Mission expired
    MissionExpired,

    /// Name too long
    NameTooLong,

    /// Description too long
    DescriptionTooLong,

    /// Reason too long
    ReasonTooLong,

    /// Rewards already claimed
    RewardsAlreadyClaimed,

    /// Insufficient balance to mint
    InsufficientMintBalance,
}
```

---

## 🔗 Integration Points

### With pallet-assets
- `grant_cashback()` calls `Assets::mint_into()` to mint ZARI tokens
- Uses ZARI asset ID (configurable, default: 1) - ZARI is AssetId 1 in genesis

### With bazari-identity
- Mission completion updates user reputation
- Streaks are tied to user profiles

### With bazari-commerce
- Order completion triggers `progress_mission(CompleteOrders)`
- Purchase amount triggers `progress_mission(SpendAmount)`

---

## 🪝 Helper Functions

```rust
impl<T: Config> Pallet<T> {
    /// Claim mission reward (internal)
    fn claim_mission_reward_internal(
        user: &T::AccountId,
        mission_id: MissionId,
    ) -> DispatchResult {
        let mission = Missions::<T>::get(mission_id).ok_or(Error::<T>::MissionNotFound)?;

        // Mint ZARI tokens
        T::Assets::mint_into(
            T::ZariAssetId::get(),
            user,
            mission.reward_amount,
        )?;

        // Update mission completion count
        Missions::<T>::mutate(mission_id, |maybe_mission| {
            if let Some(mission) = maybe_mission {
                mission.completion_count = mission.completion_count.saturating_add(1);

                // Deactivate if max completions reached
                if mission.max_completions > 0 && mission.completion_count >= mission.max_completions {
                    mission.is_active = false;
                }
            }
        });

        Ok(())
    }

    /// Grant streak bonus
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
```

---

## 📊 Weight Functions

```rust
pub trait WeightInfo {
    fn create_mission() -> Weight;
    fn progress_mission() -> Weight;
    fn grant_cashback() -> Weight;
    fn update_streak() -> Weight;
    fn deactivate_mission() -> Weight;
}
```

---

## 🧪 Tests Required

1. **Mission creation**: By DAO only
2. **Mission progress**: Auto-completion when target reached
3. **Cashback grants**: ZARI tokens minted
4. **Streaks**: Daily login, bonus at milestones
5. **Expiration**: Missions expire correctly
6. **Max completions**: Missions deactivate when limit reached

---

## 📚 References

- [Implementation Guide](IMPLEMENTATION.md)
- [Backend Integration](INTEGRATION.md)
- [Target Architecture](../../blockchain-integration/02-TARGET-ARCHITECTURE.md)
- [Current State Analysis](../../blockchain-integration/01-CURRENT-STATE-ANALYSIS.md)
