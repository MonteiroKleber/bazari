# bazari-affiliate Pallet - Implementation Prompt

**Phase**: P2 - Proof of Commerce (Week 14)
**Effort**: 1 semana
**Dependencies**: bazari-commerce (02-bazari-commerce.md)

---

## 📋 Contexto

**Problema**:
- Sistema de afiliados atual é centralizado e opaco
- Comissões multi-nível não são verificáveis
- Fraude (self-referral, fake accounts) é difícil de detectar
- Não há transparência sobre árvore de referrals

**Solução**:
Pallet `bazari-affiliate` que implementa:
- ✅ **DAG de Comissões**: Árvore de referrals on-chain com até 5 níveis
- ✅ **Decay Automático**: 50% decay por nível (L0: 5%, L1: 2.5%, L2: 1.25%)
- ✅ **Merkle Root**: Privacy-preserving proof de comissões
- ✅ **Anti-Gaming**: Prevenção de self-referral e circular references
- ✅ **Auto-Distribution**: Pagamento automático ao completar order

**Impacto**:
- Afiliados verificam comissões on-chain
- Transparência total da árvore de referrals
- Impossível fraudar sistema (self-referral bloqueado)
- Automação completa de pagamentos

**Exemplo de Comissão**:
```
Order: 100 BZR
├─ L0 (Referrer direto): 5% = 5 BZR
├─ L1 (Referrer do referrer): 2.5% = 2.5 BZR
├─ L2 (3º nível): 1.25% = 1.25 BZR
└─ Total: 8.75 BZR distribuídos
```

---

## 🎯 Objetivo

Implementar pallet Substrate `bazari-affiliate` com:
1. Storage para referral DAG (referrer → referees)
2. Extrinsics: register_referral, distribute_commissions
3. Cálculo automático de comissões com decay (50% por nível)
4. Anti-gaming protections (self-referral, max depth)
5. Merkle root para privacy

**Output esperado**:
- ✅ Código Rust em `/root/bazari-chain/pallets/bazari-affiliate/src/lib.rs`
- ✅ Testes passando: `cargo test -p pallet-bazari-affiliate`
- ✅ Backend consegue registrar referrals + query árvore
- ✅ Integration com bazari-commerce para distribuição automática

---

## ✅ Checklist de Implementação

### Step 1: Criar Estrutura do Pallet
- [ ] Criar pasta `/root/bazari-chain/pallets/bazari-affiliate/`
- [ ] Criar `Cargo.toml` com dependências:
  ```toml
  [dependencies]
  codec = { workspace = true }
  scale-info = { workspace = true }
  frame-support = { workspace = true }
  frame-system = { workspace = true }
  sp-runtime = { workspace = true }
  pallet-bazari-commerce = { path = "../bazari-commerce", default-features = false }
  ```

### Step 2: Implementar Storage Items

- [ ] **ReferrerOf**: `StorageMap<AccountId, AccountId>`
  ```rust
  // Mapeia referee → referrer
  // Exemplo: Alice referiu Bob → ReferrerOf[Bob] = Alice
  #[pallet::storage]
  #[pallet::getter(fn referrer_of)]
  pub type ReferrerOf<T: Config> = StorageMap<
      _,
      Blake2_128Concat,
      T::AccountId,
      T::AccountId,
      OptionQuery,
  >;
  ```

- [ ] **DirectReferrals**: `StorageMap<AccountId, BoundedVec<AccountId>>`
  ```rust
  // Mapeia referrer → lista de referees diretos
  #[pallet::storage]
  #[pallet::getter(fn direct_referrals)]
  pub type DirectReferrals<T: Config> = StorageMap<
      _,
      Blake2_128Concat,
      T::AccountId,
      BoundedVec<T::AccountId, ConstU32<1000>>,
      ValueQuery,
  >;
  ```

- [ ] **AffiliateStats**: `StorageMap<AccountId, AffiliateStats>`
  ```rust
  #[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
  #[scale_info(skip_type_params(T))]
  pub struct AffiliateStats<T: Config> {
      pub total_referrals: u32,
      pub direct_referrals: u32,
      pub total_commission_earned: BalanceOf<T>,
      pub merkle_root: [u8; 32], // Privacy-preserving proof
  }

  #[pallet::storage]
  pub type AffiliateStatsMap<T: Config> = StorageMap<
      _,
      Blake2_128Concat,
      T::AccountId,
      AffiliateStats<T>,
      OptionQuery,
  >;
  ```

- [ ] **OrderCommissions**: `StorageMap<OrderId, Vec<(AccountId, Balance, Level)>>`
  ```rust
  // Histórico de comissões pagas por order
  #[pallet::storage]
  pub type OrderCommissions<T: Config> = StorageMap<
      _,
      Blake2_128Concat,
      u64, // order_id
      BoundedVec<(T::AccountId, BalanceOf<T>, u8), ConstU32<5>>, // max 5 levels
      ValueQuery,
  >;
  ```

### Step 3: Implementar Config Trait

```rust
#[pallet::config]
pub trait Config: frame_system::Config + pallet_bazari_commerce::Config {
    type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;

    type Currency: Currency<Self::AccountId> + ReservableCurrency<Self::AccountId>;

    /// Commission rates per level (em basis points)
    /// Exemplo: [500, 250, 125, 62, 31] = 5%, 2.5%, 1.25%, 0.62%, 0.31%
    #[pallet::constant]
    type CommissionRates: Get<[u32; 5]>;

    /// Maximum referral depth (5 levels)
    #[pallet::constant]
    type MaxReferralDepth: Get<u8>;

    type WeightInfo: WeightInfo;
}
```

### Step 4: Implementar Extrinsics

- [ ] **register_referral**:
  ```rust
  #[pallet::call_index(0)]
  #[pallet::weight(T::WeightInfo::register_referral())]
  pub fn register_referral(
      origin: OriginFor<T>,
      referrer: T::AccountId,
  ) -> DispatchResult {
      let referee = ensure_signed(origin)?;

      // Validar self-referral
      ensure!(referee != referrer, Error::<T>::SelfReferral);

      // Validar que referee não foi referido antes
      ensure!(
          !ReferrerOf::<T>::contains_key(&referee),
          Error::<T>::AlreadyReferred
      );

      // Validar que referrer existe (opcional: check identity)
      ensure!(
          frame_system::Pallet::<T>::account_exists(&referrer),
          Error::<T>::ReferrerNotFound
      );

      // Armazenar relacionamento
      ReferrerOf::<T>::insert(&referee, &referrer);

      // Atualizar lista de direct referrals
      DirectReferrals::<T>::try_mutate(&referrer, |referrals| {
          referrals.try_push(referee.clone())
              .map_err(|_| Error::<T>::TooManyReferrals)
      })?;

      // Atualizar stats
      AffiliateStatsMap::<T>::mutate(&referrer, |maybe_stats| {
          let mut stats = maybe_stats.take().unwrap_or_default();
          stats.direct_referrals = stats.direct_referrals.saturating_add(1);
          stats.total_referrals = stats.total_referrals.saturating_add(1);
          *maybe_stats = Some(stats);
      });

      Self::deposit_event(Event::ReferralRegistered { referrer, referee });

      Ok(())
  }
  ```

- [ ] **distribute_commissions**:
  ```rust
  #[pallet::call_index(1)]
  #[pallet::weight(T::WeightInfo::distribute_commissions())]
  pub fn distribute_commissions(
      origin: OriginFor<T>,
      order_id: u64,
      buyer: T::AccountId,
      order_amount: BalanceOf<T>,
  ) -> DispatchResult {
      ensure_root(origin)?; // Called by system after order completion

      // Walk up referral tree (max 5 levels)
      let mut current_account = buyer;
      let mut commissions = Vec::new();

      for level in 0..T::MaxReferralDepth::get() {
          // Get referrer at this level
          if let Some(referrer) = ReferrerOf::<T>::get(&current_account) {
              // Calculate commission (with decay)
              let rate_bps = T::CommissionRates::get()[level as usize];
              let commission = order_amount
                  .saturating_mul(rate_bps.into())
                  .saturating_div(10_000u32.into());

              if commission > BalanceOf::<T>::zero() {
                  // Transfer commission
                  T::Currency::transfer(
                      &Self::treasury_account(),
                      &referrer,
                      commission,
                      KeepAlive,
                  )?;

                  commissions.push((referrer.clone(), commission, level));

                  // Update stats
                  AffiliateStatsMap::<T>::mutate(&referrer, |maybe_stats| {
                      let mut stats = maybe_stats.take().unwrap_or_default();
                      stats.total_commission_earned = stats.total_commission_earned
                          .saturating_add(commission);
                      *maybe_stats = Some(stats);
                  });

                  Self::deposit_event(Event::CommissionDistributed {
                      order_id,
                      affiliate: referrer.clone(),
                      amount: commission,
                      level,
                  });
              }

              current_account = referrer;
          } else {
              break; // No more referrers
          }
      }

      // Store commission history
      OrderCommissions::<T>::insert(
          order_id,
          commissions.try_into().unwrap_or_default()
      );

      Ok(())
  }
  ```

- [ ] **update_merkle_root** (Root only):
  ```rust
  #[pallet::call_index(2)]
  #[pallet::weight(T::WeightInfo::update_merkle_root())]
  pub fn update_merkle_root(
      origin: OriginFor<T>,
      account: T::AccountId,
      new_merkle_root: [u8; 32],
  ) -> DispatchResult {
      ensure_root(origin)?;

      AffiliateStatsMap::<T>::mutate(&account, |maybe_stats| {
          let mut stats = maybe_stats.take().unwrap_or_default();
          stats.merkle_root = new_merkle_root;
          *maybe_stats = Some(stats);
      });

      Self::deposit_event(Event::MerkleRootUpdated {
          account,
          root: new_merkle_root,
      });

      Ok(())
  }
  ```

### Step 5: Implementar Helper Functions

```rust
impl<T: Config> Pallet<T> {
    /// Treasury account ID
    pub fn treasury_account() -> T::AccountId {
        // Treasury address (pallet-treasury or custom)
        T::TreasuryAccount::get()
    }

    /// Get full referral path (up to max depth)
    pub fn get_referral_path(account: T::AccountId) -> Vec<T::AccountId> {
        let mut path = Vec::new();
        let mut current = account;

        for _ in 0..T::MaxReferralDepth::get() {
            if let Some(referrer) = ReferrerOf::<T>::get(&current) {
                path.push(referrer.clone());
                current = referrer;
            } else {
                break;
            }
        }

        path
    }
}
```

### Step 6: Implementar Events

```rust
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
```

### Step 7: Implementar Errors

```rust
#[pallet::error]
pub enum Error<T> {
    AlreadyReferred,
    SelfReferral,
    MaxDepthReached,
    TooManyReferrals,
    ReferrerNotFound,
    InvalidMerkleProof,
    InsufficientBalance,
}
```

### Step 8: Criar Testes (mock.rs + tests.rs)

- [ ] **tests.rs**: 10+ testes cobrindo:
  - `register_referral_works`
  - `register_referral_fails_self_referral`
  - `register_referral_fails_already_referred`
  - `distribute_commissions_5_levels`
  - `distribute_commissions_decay_works`
  - `commission_stops_at_max_depth`
  - `update_merkle_root_works`
  - `get_referral_path_works`
  - `direct_referrals_tracking`
  - `affiliate_stats_update`

### Step 9: Integrar no Runtime

- [ ] Adicionar ao `Cargo.toml` do runtime
- [ ] Adicionar ao `runtime/src/lib.rs`:
  ```rust
  #[runtime::pallet_index(26)]
  pub type BazariAffiliate = pallet_bazari_affiliate;
  ```
- [ ] Configurar em `runtime/src/configs/mod.rs`:
  ```rust
  parameter_types! {
      // 5%, 2.5%, 1.25%, 0.62%, 0.31% (basis points)
      pub const CommissionRates: [u32; 5] = [500, 250, 125, 62, 31];
      pub const MaxReferralDepth: u8 = 5;
  }

  impl pallet_bazari_affiliate::Config for Runtime {
      type RuntimeEvent = RuntimeEvent;
      type Currency = Balances;
      type CommissionRates = CommissionRates;
      type MaxReferralDepth = MaxReferralDepth;
      type WeightInfo = ();
  }
  ```

### Step 10: Compilar e Testar

- [ ] Rodar testes: `cargo test -p pallet-bazari-affiliate`
- [ ] Compilar runtime: `cargo build --release`
- [ ] Validar integração com bazari-commerce

---

## 🚫 Anti-Patterns

### ❌ **Não permitir self-referral**
```rust
// ❌ ERRADO (não valida)
ReferrerOf::<T>::insert(&referee, &referrer);

// ✅ CORRETO (bloqueia self-referral)
ensure!(referee != referrer, Error::<T>::SelfReferral);
```

### ❌ **Não permitir circular references**
```rust
// ❌ ERRADO (não valida ciclos)
ReferrerOf::<T>::insert(&referee, &referrer);

// ✅ CORRETO (valida que não forma ciclo)
let path = Self::get_referral_path(referrer.clone());
ensure!(!path.contains(&referee), Error::<T>::CircularReference);
```

### ❌ **Não usar float para comissões**
```rust
// ❌ ERRADO (float não determinístico)
let commission = order_amount * 0.05;

// ✅ CORRETO (basis points, integer math)
let commission = order_amount.saturating_mul(500).saturating_div(10_000);
```

### ❌ **Não permitir re-register**
```rust
// ❌ ERRADO (permite trocar referrer)
ReferrerOf::<T>::insert(&referee, &new_referrer);

// ✅ CORRETO (só permite uma vez)
ensure!(
    !ReferrerOf::<T>::contains_key(&referee),
    Error::<T>::AlreadyReferred
);
```

### ❌ **Não distribuir sem validar order**
```rust
// ❌ ERRADO (não valida order existe)
Self::distribute_commissions(order_id, buyer, amount);

// ✅ CORRETO (valida order existe)
ensure!(
    pallet_bazari_commerce::Orders::<T>::contains_key(order_id),
    Error::<T>::OrderNotFound
);
```

---

## 📦 Dependências

### Pallets Necessários (Devem Existir)
- ✅ `pallet-bazari-commerce` (para order_id + amount)
- ✅ `pallet-balances` (Currency + ReservableCurrency)
- ✅ `frame-system` (runtime base)

### Checklist Pré-Implementação
- [ ] bazari-commerce implementado e testado
- [ ] Runtime configurado com pallet-balances
- [ ] Treasury account configurado

---

## 🔗 Referências

| Documento | Descrição |
|-----------|-----------|
| [SPEC.md](../../../20-blueprints/pallets/bazari-affiliate/SPEC.md) | Especificação técnica concisa |
| [IMPLEMENTATION.md](../../../20-blueprints/pallets/bazari-affiliate/IMPLEMENTATION.md) | Guia de implementação completo |
| [INTEGRATION.md](../../../20-blueprints/pallets/bazari-affiliate/INTEGRATION.md) | Integração backend NestJS |
| [04-PROOF-OF-COMMERCE.md](../../../20-blueprints/blockchain-integration/04-PROOF-OF-COMMERCE.md) | Arquitetura PoC |
| [Substrate Currency Trait](https://docs.substrate.io/reference/how-to-guides/pallet-design/use-tight-coupling/) | Trait para transfers |

---

## 🤖 Prompt para Claude Code

```
Implementar pallet bazari-affiliate para sistema de comissões multi-nível com DAG e decay automático.

CONTEXTO:
Sistema de afiliados on-chain com:
- DAG de referrals (até 5 níveis de profundidade)
- Decay de 50% por nível (L0: 5%, L1: 2.5%, L2: 1.25%, L3: 0.62%, L4: 0.31%)
- Anti-gaming: prevenir self-referral e circular references
- Distribuição automática de comissões ao completar order
- Merkle root para privacy-preserving proofs

OBJETIVO:
Criar pallet completo com:
1. Storage: ReferrerOf, DirectReferrals, AffiliateStats, OrderCommissions
2. Extrinsics: register_referral, distribute_commissions, update_merkle_root
3. Events: ReferralRegistered, CommissionDistributed, MerkleRootUpdated
4. Testes: 10+ unit tests cobrindo DAG walk, decay, anti-gaming

CHECKLIST:
✅ Step 1: Criar estrutura (/root/bazari-chain/pallets/bazari-affiliate/)
✅ Step 2: Implementar Storage (ReferrerOf, DirectReferrals, AffiliateStats, OrderCommissions)
✅ Step 3: Implementar register_referral (validar self-referral, already referred)
✅ Step 4: Implementar distribute_commissions (walk up tree, apply decay)
✅ Step 5: Implementar update_merkle_root (Root only)
✅ Step 6: Criar helper get_referral_path()
✅ Step 7: Usar integer math (basis points 10_000) para comissões
✅ Step 8: Criar mock.rs + tests.rs (10+ testes)
✅ Step 9: Integrar no runtime (pallet_index = 26)
✅ Step 10: Configurar CommissionRates = [500, 250, 125, 62, 31] (basis points)

ANTI-PATTERNS:
❌ NÃO permitir self-referral (referee == referrer)
❌ NÃO permitir circular references (A → B → A)
❌ NÃO usar float para comissões (usar basis points)
❌ NÃO permitir re-register (AlreadyReferred check)
❌ NÃO distribuir comissões sem validar order existe

REFERÊNCIAS:
- SPEC: /root/bazari/knowledge/20-blueprints/pallets/bazari-affiliate/SPEC.md
- IMPLEMENTATION: /root/bazari/knowledge/20-blueprints/pallets/bazari-affiliate/IMPLEMENTATION.md

DEPENDÊNCIAS:
- pallet-bazari-commerce (order_id + amount)
- pallet-balances (Currency trait)

OUTPUT ESPERADO:
- Código Rust em /root/bazari-chain/pallets/bazari-affiliate/src/lib.rs
- Testes passando: cargo test -p pallet-bazari-affiliate
- Runtime compilando: cargo build --release
- 10+ testes cobrindo DAG walk, decay, anti-gaming, stats

IMPORTANTE:
- Commission rates em basis points (500 = 5%, 250 = 2.5%)
- Max depth = 5 levels (configurável)
- Prevent self-referral (referee != referrer)
- Prevent circular references (walk tree before insert)
- Only Root can update_merkle_root
```

---

**Generated by**: Claude Code
**Version**: 1.0.0
