# bazari-fulfillment Pallet - Implementation Prompt

**Phase**: P2 - Proof of Commerce (Week 12-13)
**Effort**: 1-2 semanas
**Dependencies**: bazari-identity, bazari-attestation (01-bazari-attestation.md)

---

## 📋 Contexto

**Problema**:
- Não há sistema verificável de couriers on-chain
- Entregas dependem de logística centralizada sem accountability
- Reputação de couriers não é transparente
- Reviews podem ser censurados ou manipulados

**Solução**:
Pallet `bazari-fulfillment` que implementa:
- ✅ **Courier Registry**: Registro on-chain com staking obrigatório (1000 BZR)
- ✅ **Reputation System**: Score 0-1000 baseado em entregas completas
- ✅ **Slashing Mechanism**: Penalidades por disputas ou falhas
- ✅ **Reviews Merkle Root**: Anchor on-chain de reviews off-chain (PostgreSQL)
- ✅ **Location-based Matching**: H3 geohash para service areas

**Impacto**:
- Couriers verificados com stake em risco
- Reputação imutável e transparente
- Reviews com proof criptográfico (Merkle tree)
- Disputas podem validar autenticidade de reviews
- Economia do sistema incentiva bom serviço

---

## 🎯 Objetivo

Implementar pallet Substrate `bazari-fulfillment` com:
1. Courier registry com stake lock (ReservableCurrency)
2. Order assignment + delivery completion tracking
3. Reputation scoring automático
4. Slashing mechanism (DAO-controlled)
5. Merkle root anchoring para reviews off-chain

**Output esperado**:
- ✅ Código Rust em `/root/bazari-chain/pallets/bazari-fulfillment/src/lib.rs`
- ✅ Testes passando: `cargo test -p pallet-bazari-fulfillment`
- ✅ Backend consegue registrar couriers + atualizar Merkle root
- ✅ Integration com bazari-attestation para proofs de entrega

---

## ✅ Checklist de Implementação

### Step 1: Criar Estrutura do Pallet
- [ ] Criar pasta `/root/bazari-chain/pallets/bazari-fulfillment/`
- [ ] Criar `Cargo.toml` com dependências:
  ```toml
  [dependencies]
  codec = { workspace = true }
  scale-info = { workspace = true }
  frame-support = { workspace = true }
  frame-system = { workspace = true }
  sp-runtime = { workspace = true }
  pallet-bazari-identity = { path = "../bazari-identity", default-features = false }

  [dev-dependencies]
  pallet-balances = { workspace = true, features = ["std"] }
  ```

### Step 2: Implementar Storage Items

- [ ] **Couriers**: `StorageMap<AccountId, Courier>`
  ```rust
  #[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
  #[scale_info(skip_type_params(T))]
  #[codec(mel_bound())]
  pub struct Courier<T: Config> {
      pub account: T::AccountId,
      pub stake: BalanceOf<T>,
      pub reputation_score: u32, // 0-1000
      pub service_areas: BoundedVec<u64, ConstU32<10>>, // H3 geohash
      pub total_deliveries: u32,
      pub successful_deliveries: u32,
      pub disputed_deliveries: u32,
      pub is_active: bool,
      pub registered_at: BlockNumberFor<T>,
      pub reviews_merkle_root: [u8; 32], // ✅ Merkle root of off-chain reviews
  }
  ```

- [ ] **OrderCouriers**: `StorageMap<OrderId, AccountId>`
  - Mapeia order_id → courier atribuído

- [ ] **CourierDeliveries**: `StorageMap<AccountId, BoundedVec<OrderId, MaxDeliveriesPerCourier>>`
  - Lista de orders atribuídas a cada courier

### Step 3: Implementar Config Trait

```rust
#[pallet::config]
pub trait Config: frame_system::Config + pallet_bazari_identity::Config {
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

### Step 4: Implementar Extrinsics

- [ ] **register_courier**:
  ```rust
  #[pallet::call_index(0)]
  #[pallet::weight(T::WeightInfo::register_courier())]
  pub fn register_courier(
      origin: OriginFor<T>,
      stake: BalanceOf<T>,
      service_areas: Vec<u64>,
  ) -> DispatchResult {
      let who = ensure_signed(origin)?;

      // Validate stake
      ensure!(stake >= T::MinCourierStake::get(), Error::<T>::InsufficientStake);

      // Lock stake (reserve)
      T::Currency::reserve(&who, stake)?;

      // Create courier
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
          reviews_merkle_root: [0u8; 32], // Empty initially
      };

      Couriers::<T>::insert(&who, courier);

      Self::deposit_event(Event::CourierRegistered { account: who, stake });

      Ok(())
  }
  ```

- [ ] **assign_courier**:
  ```rust
  #[pallet::call_index(1)]
  #[pallet::weight(T::WeightInfo::assign_courier())]
  pub fn assign_courier(
      origin: OriginFor<T>,
      order_id: u64,
      courier: T::AccountId,
  ) -> DispatchResult {
      let _ = ensure_signed(origin)?; // System or seller can assign

      // Validate courier exists and is active
      let courier_data = Couriers::<T>::get(&courier)
          .ok_or(Error::<T>::CourierNotFound)?;

      ensure!(courier_data.is_active, Error::<T>::CourierInactive);
      ensure!(
          courier_data.stake >= T::MinCourierStake::get(),
          Error::<T>::InsufficientStake
      );

      // Assign courier to order
      OrderCouriers::<T>::insert(order_id, &courier);

      // Track delivery in courier's list
      CourierDeliveries::<T>::try_mutate(&courier, |deliveries| {
          deliveries.try_push(order_id).map_err(|_| Error::<T>::TooManyDeliveries)
      })?;

      Self::deposit_event(Event::CourierAssigned { order_id, courier });

      Ok(())
  }
  ```

- [ ] **complete_delivery**:
  ```rust
  #[pallet::call_index(2)]
  #[pallet::weight(T::WeightInfo::complete_delivery())]
  pub fn complete_delivery(
      origin: OriginFor<T>,
      order_id: u64,
  ) -> DispatchResult {
      let courier = ensure_signed(origin)?;

      // Validate courier is assigned to this order
      let assigned_courier = OrderCouriers::<T>::get(order_id)
          .ok_or(Error::<T>::OrderNotAssigned)?;

      ensure!(courier == assigned_courier, Error::<T>::Unauthorized);

      // Update courier stats
      Couriers::<T>::mutate(&courier, |maybe_courier| {
          if let Some(courier_data) = maybe_courier {
              courier_data.total_deliveries = courier_data.total_deliveries.saturating_add(1);
              courier_data.successful_deliveries = courier_data.successful_deliveries.saturating_add(1);

              // Update reputation (+10 points per successful delivery)
              courier_data.reputation_score = courier_data.reputation_score
                  .saturating_add(10)
                  .min(1000);
          }
      });

      Self::deposit_event(Event::DeliveryCompleted { order_id, courier });

      Ok(())
  }
  ```

- [ ] **slash_courier** (DAO only):
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

      let mut courier_data = Couriers::<T>::get(&courier)
          .ok_or(Error::<T>::CourierNotFound)?;

      // Slash reserved stake
      let slashed = slash_amount.min(courier_data.stake);
      T::Currency::slash_reserved(&courier, slashed);

      // Update courier data
      courier_data.stake = courier_data.stake.saturating_sub(slashed);
      courier_data.reputation_score = courier_data.reputation_score.saturating_sub(100);
      courier_data.disputed_deliveries = courier_data.disputed_deliveries.saturating_add(1);

      // Deactivate if stake too low
      if courier_data.stake < T::MinCourierStake::get() {
          courier_data.is_active = false;
      }

      Couriers::<T>::insert(&courier, courier_data);

      Self::deposit_event(Event::CourierSlashed {
          courier,
          amount: slashed,
          reason: reason.try_into().unwrap_or_default()
      });

      Ok(())
  }
  ```

- [ ] **update_reviews_merkle_root** (Root/System only):
  ```rust
  #[pallet::call_index(4)]
  #[pallet::weight(T::WeightInfo::update_reviews_merkle_root())]
  pub fn update_reviews_merkle_root(
      origin: OriginFor<T>,
      courier: T::AccountId,
      new_merkle_root: [u8; 32],
  ) -> DispatchResult {
      ensure_root(origin)?; // Only callable by backend worker (via Root)

      Couriers::<T>::try_mutate(&courier, |maybe_courier| {
          let courier_data = maybe_courier.as_mut()
              .ok_or(Error::<T>::CourierNotFound)?;

          // Update Merkle root
          courier_data.reviews_merkle_root = new_merkle_root;

          Self::deposit_event(Event::ReviewsMerkleRootUpdated {
              courier: courier.clone(),
              merkle_root: new_merkle_root,
          });

          Ok(())
      })
  }
  ```

### Step 5: Implementar Events

```rust
#[pallet::event]
#[pallet::generate_deposit(pub(super) fn deposit_event)]
pub enum Event<T: Config> {
    CourierRegistered { account: T::AccountId, stake: BalanceOf<T> },
    CourierAssigned { order_id: u64, courier: T::AccountId },
    DeliveryCompleted { order_id: u64, courier: T::AccountId },
    CourierSlashed { courier: T::AccountId, amount: BalanceOf<T>, reason: BoundedVec<u8, ConstU32<128>> },
    ReviewsMerkleRootUpdated { courier: T::AccountId, merkle_root: [u8; 32] },
}
```

### Step 6: Implementar Errors

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

### Step 7: Criar Testes (mock.rs + tests.rs)

- [ ] **mock.rs**: Runtime de teste com Balances + BazariIdentity
- [ ] **tests.rs**: 10+ testes cobrindo:
  - `register_courier_works`
  - `assign_courier_works`
  - `complete_delivery_works`
  - `reputation_increases_on_delivery`
  - `slash_courier_works`
  - `slash_deactivates_if_stake_too_low`
  - `update_merkle_root_works`
  - `assign_courier_fails_insufficient_stake`
  - `assign_courier_fails_inactive`
  - `complete_delivery_fails_wrong_courier`

### Step 8: Integrar no Runtime

- [ ] Adicionar ao `Cargo.toml` do runtime
- [ ] Adicionar ao `runtime/src/lib.rs`:
  ```rust
  #[runtime::pallet_index(25)]
  pub type BazariFulfillment = pallet_bazari_fulfillment;
  ```
- [ ] Configurar em `runtime/src/configs/mod.rs`:
  ```rust
  parameter_types! {
      pub const MinCourierStake: Balance = 1000 * BZR; // 1000 BZR minimum
      pub const MaxServiceAreas: u32 = 10;
      pub const MaxDeliveriesPerCourier: u32 = 100;
  }

  impl pallet_bazari_fulfillment::Config for Runtime {
      type RuntimeEvent = RuntimeEvent;
      type Currency = Balances;
      type MinCourierStake = MinCourierStake;
      type MaxServiceAreas = MaxServiceAreas;
      type MaxDeliveriesPerCourier = MaxDeliveriesPerCourier;
      type DAOOrigin = EnsureRootOrHalfCouncil;
      type WeightInfo = ();
  }
  ```

### Step 9: Compilar e Testar

- [ ] Rodar testes unitários: `cargo test -p pallet-bazari-fulfillment`
- [ ] Compilar runtime: `cargo build --release`
- [ ] Validar integração com bazari-identity

---

## 🚫 Anti-Patterns

### ❌ **Não usar Currency::transfer para stake**
```rust
// ❌ ERRADO (não bloqueia fundos)
T::Currency::transfer(&who, &treasury_account, stake, KeepAlive)?;

// ✅ CORRETO (reserva fundos, não permite uso)
T::Currency::reserve(&who, stake)?;
```

### ❌ **Não permitir slashing sem validação**
```rust
// ❌ ERRADO (qualquer um pode slash)
let _ = ensure_signed(origin)?;

// ✅ CORRETO (só DAO ou Root)
T::DAOOrigin::ensure_origin(origin)?;
```

### ❌ **Não atualizar Merkle root manualmente**
```rust
// ❌ ERRADO (courier atualiza própria root)
let who = ensure_signed(origin)?;

// ✅ CORRETO (só backend worker via Root)
ensure_root(origin)?;
```

### ❌ **Não usar float para reputation**
```rust
// ❌ ERRADO (float não é determinístico)
pub reputation_score: f32,

// ✅ CORRETO (u32 scaled 0-1000)
pub reputation_score: u32, // 0-1000
```

### ❌ **Não permitir register sem identity**
```rust
// ❌ ERRADO (não valida identity)
let who = ensure_signed(origin)?;

// ✅ CORRETO (valida que tem identity)
ensure!(
    pallet_bazari_identity::Identities::<T>::contains_key(&who),
    Error::<T>::IdentityRequired
);
```

---

## 📦 Dependências

### Pallets Necessários (Devem Existir)
- ✅ `pallet-bazari-identity` (identidade soulbound NFT)
- ✅ `pallet-balances` (currency management)
- ✅ `frame-system` (runtime base)

### Checklist Pré-Implementação
- [ ] bazari-identity implementado e testado
- [ ] bazari-attestation implementado (para proofs de entrega)
- [ ] Runtime configurado com pallet-balances
- [ ] DAO Origin configurado (Council ou Root)

---

## 🔗 Referências

| Documento | Descrição |
|-----------|-----------|
| [SPEC.md](../../../20-blueprints/pallets/bazari-fulfillment/SPEC.md) | Especificação técnica completa |
| [REVIEWS-ARCHITECTURE.md](../../../20-blueprints/pallets/bazari-fulfillment/REVIEWS-ARCHITECTURE.md) | Arquitetura Merkle tree para reviews |
| [GPS-TRACKING.md](../../../20-blueprints/pallets/bazari-fulfillment/GPS-TRACKING.md) | GPS tracking off-chain + proofs |
| [INTEGRATION.md](../../../20-blueprints/pallets/bazari-fulfillment/INTEGRATION.md) | Integração backend NestJS |
| [04-PROOF-OF-COMMERCE.md](../../../20-blueprints/blockchain-integration/04-PROOF-OF-COMMERCE.md) | Arquitetura PoC geral |
| [Substrate ReservableCurrency](https://docs.substrate.io/reference/how-to-guides/pallet-design/use-tight-coupling/) | Trait para stake locking |
| [H3 Geohash](https://h3geo.org/) | Sistema de geohash para location matching |

---

## 🤖 Prompt para Claude Code

```
Implementar pallet bazari-fulfillment para courier registry com staking e reputation system.

CONTEXTO:
Precisamos de um sistema on-chain de couriers verificados que:
- Exige stake mínimo de 1000 BZR (locked via ReservableCurrency)
- Rastreia reputação (0-1000 score) baseado em entregas completas
- Permite slashing por disputas (DAO-controlled)
- Ancora Merkle root de reviews off-chain (PostgreSQL)
- Suporta location-based matching via H3 geohash

OBJETIVO:
Criar pallet completo com:
1. Storage: Couriers, OrderCouriers, CourierDeliveries
2. Extrinsics: register_courier, assign_courier, complete_delivery, slash_courier, update_reviews_merkle_root
3. Events: CourierRegistered, CourierAssigned, DeliveryCompleted, CourierSlashed, ReviewsMerkleRootUpdated
4. Testes: 10+ unit tests cobrindo happy path e edge cases

CHECKLIST:
✅ Step 1: Criar estrutura (/root/bazari-chain/pallets/bazari-fulfillment/)
✅ Step 2: Implementar Courier struct com reviews_merkle_root: [u8; 32]
✅ Step 3: Implementar extrinsics (5 total)
✅ Step 4: Usar Currency::reserve para stake lock (não transfer!)
✅ Step 5: Validar DAOOrigin para slash_courier
✅ Step 6: Validar ensure_root para update_reviews_merkle_root
✅ Step 7: Criar mock.rs + tests.rs (10+ testes)
✅ Step 8: Integrar no runtime (pallet_index = 25)
✅ Step 9: Configurar MinCourierStake = 1000 BZR

ANTI-PATTERNS:
❌ NÃO usar Currency::transfer para stake (usar reserve!)
❌ NÃO permitir slashing sem DAOOrigin
❌ NÃO permitir Merkle root update sem ensure_root
❌ NÃO usar float para reputation (usar u32 0-1000)
❌ NÃO permitir register sem identity (validar Identity exists)

REFERÊNCIAS:
- SPEC: /root/bazari/knowledge/20-blueprints/pallets/bazari-fulfillment/SPEC.md
- REVIEWS: /root/bazari/knowledge/20-blueprints/pallets/bazari-fulfillment/REVIEWS-ARCHITECTURE.md
- GPS: /root/bazari/knowledge/20-blueprints/pallets/bazari-fulfillment/GPS-TRACKING.md

DEPENDÊNCIAS:
- pallet-bazari-identity (deve existir)
- pallet-bazari-attestation (para proofs de entrega)
- pallet-balances (ReservableCurrency)

OUTPUT ESPERADO:
- Código Rust em /root/bazari-chain/pallets/bazari-fulfillment/src/lib.rs
- Testes passando: cargo test -p pallet-bazari-fulfillment
- Runtime compilando: cargo build --release
- 10+ testes cobrindo register, assign, complete, slash, merkle update

IMPORTANTE:
- Reputation score 0-1000 (u32, não float)
- Stake locked via reserve() (não transfer)
- Merkle root atualizado apenas por Root (backend worker)
- Slashing só via DAO (Council >= 50% ou Root)
- H3 geohash (u64) para service_areas
```

---

**Generated by**: Claude Code
**Version**: 1.0.0
