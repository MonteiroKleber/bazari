# bazari-rewards Pallet - Implementation Prompt

**Phase**: P1 - Foundation (Week 6-7)
**Effort**: 2 semanas
**Dependencies**: bazari-commerce (02-bazari-commerce.md)

---

## 📋 Contexto

**Problema Crítico**:
- Cashback no Bazari é apenas **número no banco PostgreSQL**
- Token ZARI existe on-chain (AssetId 1) mas cashback não minta tokens reais
- Missions/Quests não estão implementadas on-chain

**Solução**:
Pallet `bazari-rewards` que:
- ✅ Minta tokens ZARI (AssetId 1) como cashback
- ✅ Missões on-chain (buy N products, refer friend, etc)
- ✅ Claim de rewards com validação
- ✅ Histórico imutável de rewards

**Impacto**:
- Cashback será token ERC-20 real (ZARI)
- Users podem transfer ZARI para outros wallets
- Gamificação descentralizada

---

## 🎯 Objetivo

Implementar pallet Substrate `bazari-rewards` com:
1. Integração com `pallet-assets` (ZARI token)
2. Storage para Missions e UserProgress
3. Extrinsics: `mint_cashback`, `create_mission`, `claim_reward`
4. Validação de missões on-chain

**Output esperado**:
- ✅ Código Rust em `/root/bazari-chain/pallets/bazari-rewards/src/lib.rs`
- ✅ Testes passando: `cargo test -p pallet-bazari-rewards`
- ✅ Backend consegue mintar ZARI após purchase
- ✅ Users conseguem claim rewards via Polkadot.js

---

## ✅ Checklist de Implementação

### Step 1: Configurar ZARI Asset
- [ ] Verificar que `pallet-assets` está no runtime
- [ ] ✅ ZARI já existe no genesis como AssetId 1 (criado em genesis_config_presets.rs):
  ```rust
  // ✅ JÁ IMPLEMENTADO em runtime/src/genesis_config_presets.rs
  // ZARI: 21 milhões com 12 decimais
  let zari_total_supply: u128 = 21_000_000 * 1_000_000_000_000u128;

  assets: pallet_assets::GenesisConfig {
      assets: vec![
          (1, zari_owner.clone(), true, 1u128), // AssetId 1 = ZARI
      ],
      metadata: vec![
          (1, b"Bazari Governance Token".to_vec(), b"ZARI".to_vec(), 12),
      ],
      accounts: vec![
          (1, zari_owner, zari_total_supply),
      ],
  }
  ```

### Step 2: Criar Estrutura do Pallet
- [ ] Criar pasta `/root/bazari-chain/pallets/bazari-rewards/`
- [ ] Criar `Cargo.toml`:

```toml
[package]
name = "pallet-bazari-rewards"
version = "0.1.0"
edition = "2021"

[dependencies]
codec = { package = "parity-scale-codec", version = "3.0.0", default-features = false, features = ["derive"] }
scale-info = { version = "2.0.0", default-features = false, features = ["derive"] }
frame-support = { version = "4.0.0-dev", default-features = false }
frame-system = { version = "4.0.0-dev", default-features = false }
sp-runtime = { version = "7.0.0", default-features = false }
sp-std = { version = "5.0.0", default-features = false }

# Local dependencies
pallet-bazari-commerce = { path = "../bazari-commerce", default-features = false }

[dev-dependencies]
sp-core = "7.0.0"
sp-io = "7.0.0"
pallet-assets = "4.0.0-dev"

[features]
default = ["std"]
std = [
    "codec/std",
    "scale-info/std",
    "frame-support/std",
    "frame-system/std",
    "sp-runtime/std",
    "pallet-bazari-commerce/std",
]
```

### Step 3: Implementar Storage Items
- [ ] **Missions**: `StorageMap<MissionId, Mission>`
  ```rust
  #[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
  #[scale_info(skip_type_params(T))]
  pub struct Mission<Balance, BlockNumber> {
      pub mission_id: u64,
      pub title: BoundedVec<u8, ConstU32<64>>,
      pub description: BoundedVec<u8, ConstU32<256>>,
      pub mission_type: MissionType,
      pub reward_amount: Balance,
      pub required_count: u32,
      pub is_active: bool,
      pub created_at: BlockNumber,
  }

  #[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
  pub enum MissionType {
      FirstPurchase,        // Comprar primeiro produto
      ReferFriend,          // Indicar amigo
      CompleteNOrders(u32), // Completar N orders
      SpendAmount(u128),    // Gastar X BZR
      DailyLogin(u32),      // Login por N dias consecutivos
  }
  ```

- [ ] **UserProgress**: `StorageDoubleMap<AccountId, MissionId, Progress>`
  ```rust
  #[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
  pub struct Progress {
      pub current_count: u32,
      pub is_completed: bool,
      pub is_claimed: bool,
      pub completed_at: Option<BlockNumber>,
  }
  ```

- [ ] **CashbackRates**: `StorageValue<BoundedVec<(OrderAmount, Percentage), 10>>`
  - Exemplo: 0-100 BZR = 1%, 100-500 BZR = 2%, 500+ BZR = 3%

- [ ] **MissionIdCounter**: `StorageValue<u64>`

### Step 4: Implementar Extrinsics
- [ ] **mint_cashback**:
  ```rust
  #[pallet::call_index(0)]
  #[pallet::weight(T::WeightInfo::mint_cashback())]
  pub fn mint_cashback(
      origin: OriginFor<T>,
      buyer: T::AccountId,
      order_amount: BalanceOf<T>,
  ) -> DispatchResult {
      ensure_root(origin)?; // Apenas backend pode chamar

      // Calcular cashback (ex: 2% de order_amount)
      let cashback_rate = Self::get_cashback_rate(order_amount);
      let cashback_amount = order_amount * cashback_rate / 100;

      // Mintar ZARI (AssetId 1) para buyer
      T::Assets::mint_into(
          T::ZariAssetId::get(), // 1u32
          &buyer,
          cashback_amount,
      )?;

      Self::deposit_event(Event::CashbackMinted {
          user: buyer,
          amount: cashback_amount,
          order_amount,
      });

      Ok(())
  }
  ```

- [ ] **create_mission**:
  ```rust
  #[pallet::call_index(1)]
  pub fn create_mission(
      origin: OriginFor<T>,
      title: Vec<u8>,
      description: Vec<u8>,
      mission_type: MissionType,
      reward_amount: BalanceOf<T>,
      required_count: u32,
  ) -> DispatchResult {
      T::DAOOrigin::ensure_origin(origin)?;

      let mission_id = MissionIdCounter::<T>::get();
      MissionIdCounter::<T>::put(mission_id + 1);

      let mission = Mission {
          mission_id,
          title: title.try_into().map_err(|_| Error::<T>::TitleTooLong)?,
          description: description.try_into().map_err(|_| Error::<T>::DescriptionTooLong)?,
          mission_type,
          reward_amount,
          required_count,
          is_active: true,
          created_at: <frame_system::Pallet<T>>::block_number(),
      };

      Missions::<T>::insert(mission_id, mission);

      Self::deposit_event(Event::MissionCreated { mission_id });

      Ok(())
  }
  ```

- [ ] **update_progress**:
  ```rust
  #[pallet::call_index(2)]
  pub fn update_progress(
      origin: OriginFor<T>,
      user: T::AccountId,
      mission_id: u64,
      increment: u32,
  ) -> DispatchResult {
      ensure_root(origin)?; // Backend chama após ação do user

      let mission = Missions::<T>::get(mission_id)
          .ok_or(Error::<T>::MissionNotFound)?;

      ensure!(mission.is_active, Error::<T>::MissionInactive);

      UserProgress::<T>::mutate(&user, mission_id, |maybe_progress| {
          let mut progress = maybe_progress.unwrap_or(Progress {
              current_count: 0,
              is_completed: false,
              is_claimed: false,
              completed_at: None,
          });

          progress.current_count = progress.current_count.saturating_add(increment);

          if progress.current_count >= mission.required_count && !progress.is_completed {
              progress.is_completed = true;
              progress.completed_at = Some(<frame_system::Pallet<T>>::block_number());

              Self::deposit_event(Event::MissionCompleted { user: user.clone(), mission_id });
          }

          *maybe_progress = Some(progress);
      });

      Ok(())
  }
  ```

- [ ] **claim_reward**:
  ```rust
  #[pallet::call_index(3)]
  pub fn claim_reward(
      origin: OriginFor<T>,
      mission_id: u64,
  ) -> DispatchResult {
      let user = ensure_signed(origin)?;

      let mission = Missions::<T>::get(mission_id)
          .ok_or(Error::<T>::MissionNotFound)?;

      let mut progress = UserProgress::<T>::get(&user, mission_id)
          .ok_or(Error::<T>::ProgressNotFound)?;

      ensure!(progress.is_completed, Error::<T>::MissionNotCompleted);
      ensure!(!progress.is_claimed, Error::<T>::AlreadyClaimed);

      // Mintar ZARI reward
      T::Assets::mint_into(
          T::ZariAssetId::get(),
          &user,
          mission.reward_amount,
      )?;

      progress.is_claimed = true;
      UserProgress::<T>::insert(&user, mission_id, progress);

      Self::deposit_event(Event::RewardClaimed {
          user,
          mission_id,
          amount: mission.reward_amount,
      });

      Ok(())
  }
  ```

### Step 5: Implementar Helpers
- [ ] `get_cashback_rate()`:
  ```rust
  impl<T: Config> Pallet<T> {
      pub fn get_cashback_rate(order_amount: BalanceOf<T>) -> u32 {
          let rates = CashbackRates::<T>::get();

          for (threshold, rate) in rates.iter() {
              if order_amount < *threshold {
                  return *rate;
              }
          }

          // Default: 1%
          1
      }
  }
  ```

### Step 6: Implementar Events
- [ ] `CashbackMinted { user, amount, order_amount }`
- [ ] `MissionCreated { mission_id }`
- [ ] `MissionCompleted { user, mission_id }`
- [ ] `RewardClaimed { user, mission_id, amount }`

### Step 7: Implementar Errors
- [ ] `MissionNotFound`
- [ ] `MissionInactive`
- [ ] `ProgressNotFound`
- [ ] `MissionNotCompleted`
- [ ] `AlreadyClaimed`
- [ ] `TitleTooLong`
- [ ] `DescriptionTooLong`

### Step 8: Configurar Runtime
- [ ] Implementar `Config`:
  ```rust
  impl pallet_bazari_rewards::Config for Runtime {
      type RuntimeEvent = RuntimeEvent;
      type Assets = Assets; // pallet-assets
      type ZariAssetId = ConstU32<1>; // AssetId 1 = ZARI
      type DAOOrigin = EnsureRoot<AccountId>;
      type WeightInfo = ();
  }
  ```

- [ ] Adicionar trait bound:
  ```rust
  #[pallet::config]
  pub trait Config: frame_system::Config + pallet_assets::Config {
      type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;

      type Assets: Inspect<Self::AccountId>
          + Mutate<Self::AccountId>;

      #[pallet::constant]
      type ZariAssetId: Get<u32>;

      type DAOOrigin: EnsureOrigin<Self::RuntimeOrigin>;

      type WeightInfo: WeightInfo;
  }
  ```

### Step 9: Escrever Testes
- [ ] `test_mint_cashback_works()`
- [ ] `test_create_mission_works()`
- [ ] `test_update_progress_works()`
- [ ] `test_claim_reward_works()`
- [ ] `test_claim_reward_fails_not_completed()`
- [ ] `test_claim_reward_fails_already_claimed()`
- [ ] `test_cashback_rate_tiers()`

**Exemplo de teste**:
```rust
#[test]
fn mint_cashback_and_claim_reward_works() {
    new_test_ext().execute_with(|| {
        let user = account(1);
        let order_amount = 1000;

        // Mint cashback (2% = 20 ZARI)
        assert_ok!(BazariRewards::mint_cashback(
            RuntimeOrigin::root(),
            user.clone(),
            order_amount,
        ));

        // Verify ZARI balance
        assert_eq!(Assets::balance(1, &user), 20); // 2% of 1000, AssetId 1 = ZARI

        // Create mission
        assert_ok!(BazariRewards::create_mission(
            RuntimeOrigin::root(),
            b"First Purchase".to_vec(),
            b"Complete your first order".to_vec(),
            MissionType::FirstPurchase,
            100, // 100 ZARI reward
            1,   // required_count
        ));

        // Update progress (backend calls)
        assert_ok!(BazariRewards::update_progress(
            RuntimeOrigin::root(),
            user.clone(),
            0, // mission_id
            1, // increment
        ));

        // Verify mission completed
        let progress = BazariRewards::user_progress(&user, 0).unwrap();
        assert!(progress.is_completed);

        // Claim reward
        assert_ok!(BazariRewards::claim_reward(
            RuntimeOrigin::signed(user.clone()),
            0,
        ));

        // Verify total ZARI: 20 (cashback) + 100 (mission) = 120
        assert_eq!(Assets::balance(1, &user), 120); // AssetId 1 = ZARI
    });
}
```

### Step 10: Compilar e Testar
- [ ] `cargo build --release -p pallet-bazari-rewards`
- [ ] `cargo test -p pallet-bazari-rewards`
- [ ] Testar integração com `pallet-assets`:
  ```bash
  # Verificar que ZARI (AssetId 1) está criado
  curl -H "Content-Type: application/json" -d '{"id":1, "jsonrpc":"2.0", "method":"assets_balance", "params":[1, "5GrwvaEF..."]}' http://localhost:9933
  ```

---

## 🚫 Anti-Patterns

### ❌ NÃO FAÇA:
1. **Mintar cashback sem validação**
   - ❌ Permitir user chamar `mint_cashback`
   - ✅ Apenas backend (root) pode mintar

2. **Missões sem `is_active` check**
   - ❌ Permitir progress em missões desativadas
   - ✅ `ensure!(mission.is_active)`

3. **Double claim**
   - ❌ Não verificar `is_claimed`
   - ✅ `ensure!(!progress.is_claimed)`

### ✅ FAÇA:
1. **Cashback tiers**
   - Diferentes % baseado em order_amount
   - Configurável via DAO

2. **Mission progress incremental**
   - Não resetar progress se missão não completada
   - Acumular ao longo do tempo

3. **Emit events para backend sync**
   - Backend escuta `MissionCompleted` para mostrar notificação

---

## 📦 Dependências

**Requer**:
- ✅ `pallet-assets` (ZARI token)
- ✅ `pallet-bazari-commerce` (opcional, para validar orders)

**Requerido para**:
- ✅ Gamificação frontend
- ✅ Leaderboards (off-chain indexer pode ler `MissionCompleted` events)

---

## 🔗 Referências

- [SPEC.md](../../../20-blueprints/pallets/bazari-rewards/SPEC.md)
- [IMPLEMENTATION.md](../../../20-blueprints/pallets/bazari-rewards/IMPLEMENTATION.md)
- [pallet-assets Docs](https://docs.substrate.io/rustdocs/latest/pallet_assets/index.html)

---

## 🤖 Prompt para Claude Code

```
Implementar pallet `bazari-rewards` para mintar ZARI tokens como cashback e implementar missões on-chain no Bazari.

**Contexto**:
- Repositório: /root/bazari-chain
- Problema: Cashback é número no PostgreSQL, deveria ser token ZARI (AssetId 1)
- pallet-assets já existe no runtime com ZARI configurado como AssetId 1
- Documentação: /root/bazari/knowledge/20-blueprints/pallets/bazari-rewards/

**Objetivo**:
1. Storage: Missions (mission_id → Mission struct), UserProgress (user + mission_id → Progress), CashbackRates
2. Extrinsics: mint_cashback (mintar ZARI), create_mission, update_progress (backend calls), claim_reward (user calls)
3. Integração com pallet-assets (AssetId 1 = ZARI)
4. Testes: 7+ testes

**Specs técnicas**:
- Mission struct: mission_id, title, description, mission_type (enum), reward_amount, required_count, is_active
- MissionType enum: FirstPurchase, ReferFriend, CompleteNOrders(u32), SpendAmount(u128), DailyLogin(u32)
- Progress struct: current_count, is_completed, is_claimed, completed_at
- mint_cashback: calcular % baseado em tiers, mintar ZARI via T::Assets::mint_into()
- claim_reward: validar is_completed && !is_claimed, mintar reward

**Anti-patterns**:
- ❌ Não permitir user chamar mint_cashback (apenas backend/root)
- ❌ Não permitir double claim (verificar is_claimed)
- ❌ Não processar missões inativas (verificar is_active)

**Checklist**:
- [ ] ✅ Verificar que pallet-assets está no runtime e AssetId 1 (ZARI) já está criado
- [ ] Criar /root/bazari-chain/pallets/bazari-rewards/
- [ ] Implementar Storage (Missions, UserProgress, CashbackRates, counter)
- [ ] Implementar 4 extrinsics (mint_cashback, create_mission, update_progress, claim_reward)
- [ ] Implementar helper get_cashback_rate() com tiers
- [ ] Implementar 4 events e 7 errors
- [ ] Integrar no runtime (adicionar trait bound pallet_assets::Config)
- [ ] Criar mock.rs e tests.rs (7+ testes)
- [ ] Compilar: `cargo build --release -p pallet-bazari-rewards`
- [ ] Testar: `cargo test -p pallet-bazari-rewards`

**Referências**:
- SPEC: /root/bazari/knowledge/20-blueprints/pallets/bazari-rewards/SPEC.md
- pallet-assets mint_into: https://docs.substrate.io/rustdocs/latest/pallet_assets/pallet/struct.Pallet.html#method.mint_into

Me avise quando terminar e mostre output dos testes + exemplo de query ZARI balance.
```

---

**Version**: 1.0.0
**Last Updated**: 2025-11-12
**Author**: Claude (Senior Software Architect)
