# bazari-fee Pallet - Implementation Prompt

**Phase**: P2 - Proof of Commerce (Week 15)
**Effort**: 3-5 dias
**Dependencies**: bazari-commerce (02-bazari-commerce.md), bazari-affiliate (03-bazari-affiliate.md)

---

## 📋 Contexto

**Problema**:
- Split de pagamentos é manual e centralizado
- Platform fee hardcoded sem governança
- Não há transparência sobre cálculo de splits
- Cálculos off-chain podem ter erros

**Solução**:
Pallet `bazari-fee` que implementa:
- ✅ **Auto-splitting**: Cálculo on-chain de split (platform + affiliate + seller)
- ✅ **DAO-configurable**: Platform fee ajustável via governance
- ✅ **Atomic Payouts**: Integration com escrow para multi-recipient release
- ✅ **Transparent Calculation**: Toda lógica de split on-chain

**Impacto**:
- Splits 100% transparentes e verificáveis
- DAO controla platform fee
- Impossível errar cálculos (lógica on-chain)
- Integração com escrow release

**Exemplo de Split**:
```
Order: 100 BZR
├─ Platform (5%): 5 BZR → Treasury
├─ Affiliate (3%): 3 BZR → Referrer (se houver)
└─ Seller (92%): 92 BZR → Store Owner
```

---

## 🎯 Objetivo

Implementar pallet Substrate `bazari-fee` com:
1. Storage para fee configuration (platform_fee, treasury_account)
2. Extrinsic: set_platform_fee (DAO only)
3. Helper: calculate_split(order_amount) → Vec<(AccountId, Balance)>
4. Integration com bazari-escrow para atomic multi-recipient release

**Output esperado**:
- ✅ Código Rust em `/root/bazari-chain/pallets/bazari-fee/src/lib.rs`
- ✅ Testes passando: `cargo test -p pallet-bazari-fee`
- ✅ Escrow consegue chamar calculate_split() para splits automáticos
- ✅ DAO consegue ajustar platform fee via governance

---

## ✅ Checklist de Implementação

### Step 1: Criar Estrutura do Pallet
- [ ] Criar pasta `/root/bazari-chain/pallets/bazari-fee/`
- [ ] Criar `Cargo.toml` (similar a outros pallets)

### Step 2: Implementar Storage

```rust
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub struct FeeConfiguration<AccountId, Balance> {
    pub platform_fee_bps: u32, // Basis points (500 = 5%)
    pub treasury_account: AccountId,
    pub min_order_amount: Balance,
}

#[pallet::storage]
#[pallet::getter(fn fee_config)]
pub type FeeConfig<T: Config> = StorageValue<
    _,
    FeeConfiguration<T::AccountId, BalanceOf<T>>,
    ValueQuery,
    DefaultFeeConfig<T>,
>;
```

### Step 3: Implementar Config Trait

```rust
#[pallet::config]
pub trait Config: frame_system::Config + pallet_bazari_commerce::Config {
    type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;

    type Currency: Currency<Self::AccountId>;

    #[pallet::constant]
    type DefaultPlatformFee: Get<u32>; // 500 = 5%

    type TreasuryAccount: Get<Self::AccountId>;

    type DAOOrigin: EnsureOrigin<Self::RuntimeOrigin>;

    type WeightInfo: WeightInfo;
}
```

### Step 4: Implementar Extrinsics

```rust
#[pallet::call]
impl<T: Config> Pallet<T> {
    /// Update platform fee (DAO only)
    #[pallet::call_index(0)]
    #[pallet::weight(T::WeightInfo::set_platform_fee())]
    pub fn set_platform_fee(
        origin: OriginFor<T>,
        new_fee_bps: u32,
    ) -> DispatchResult {
        T::DAOOrigin::ensure_origin(origin)?;

        // Validate fee (max 10% = 1000 bps)
        ensure!(new_fee_bps <= 1000, Error::<T>::FeeTooHigh);

        FeeConfig::<T>::mutate(|config| {
            config.platform_fee_bps = new_fee_bps;
        });

        Self::deposit_event(Event::PlatformFeeUpdated { new_fee_bps });

        Ok(())
    }
}
```

### Step 5: Implementar Helper Functions

```rust
impl<T: Config> Pallet<T> {
    /// Calculate split for order
    /// Returns: Vec<(recipient, amount, reason)>
    pub fn calculate_split(
        order_id: u64,
        seller: T::AccountId,
        buyer: T::AccountId,
        amount: BalanceOf<T>,
    ) -> Result<Vec<(T::AccountId, BalanceOf<T>, SplitReason)>, DispatchError> {
        let config = FeeConfig::<T>::get();
        let mut splits = Vec::new();

        // 1. Platform fee
        let platform_fee = amount
            .saturating_mul(config.platform_fee_bps.into())
            .saturating_div(10_000u32.into());

        splits.push((
            config.treasury_account,
            platform_fee,
            SplitReason::PlatformFee,
        ));

        // 2. Affiliate commission (if exists)
        let affiliate_amount = if let Some(referrer) =
            pallet_bazari_affiliate::ReferrerOf::<T>::get(&buyer)
        {
            let commission = pallet_bazari_affiliate::Pallet::<T>
                ::calculate_commission(buyer.clone(), amount)?;

            splits.push((
                referrer,
                commission,
                SplitReason::AffiliateCommission,
            ));

            commission
        } else {
            BalanceOf::<T>::zero()
        };

        // 3. Seller amount (remainder)
        let seller_amount = amount
            .saturating_sub(platform_fee)
            .saturating_sub(affiliate_amount);

        splits.push((
            seller,
            seller_amount,
            SplitReason::SellerPayment,
        ));

        Ok(splits)
    }
}

#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo)]
pub enum SplitReason {
    PlatformFee,
    AffiliateCommission,
    SellerPayment,
}
```

### Step 6: Implementar Events e Errors

```rust
#[pallet::event]
#[pallet::generate_deposit(pub(super) fn deposit_event)]
pub enum Event<T: Config> {
    PlatformFeeUpdated { new_fee_bps: u32 },
    SplitCalculated {
        order_id: u64,
        total_amount: BalanceOf<T>,
        platform_fee: BalanceOf<T>,
        affiliate_commission: BalanceOf<T>,
        seller_amount: BalanceOf<T>,
    },
}

#[pallet::error]
pub enum Error<T> {
    FeeTooHigh, // Max 10%
    InvalidAmount,
    CalculationOverflow,
}
```

### Step 7: Criar Testes

- [ ] `set_platform_fee_works`
- [ ] `set_platform_fee_fails_too_high`
- [ ] `calculate_split_no_affiliate`
- [ ] `calculate_split_with_affiliate`
- [ ] `split_sum_equals_total`

### Step 8: Integrar no Runtime

```rust
// runtime/src/lib.rs
#[runtime::pallet_index(27)]
pub type BazariFee = pallet_bazari_fee;

// runtime/src/configs/mod.rs
parameter_types! {
    pub const DefaultPlatformFee: u32 = 500; // 5%
    pub TreasuryAccount: AccountId = /* treasury address */;
}

impl pallet_bazari_fee::Config for Runtime {
    type RuntimeEvent = RuntimeEvent;
    type Currency = Balances;
    type DefaultPlatformFee = DefaultPlatformFee;
    type TreasuryAccount = TreasuryAccountId;
    type DAOOrigin = EnsureRootOrHalfCouncil;
    type WeightInfo = ();
}
```

---

## 🚫 Anti-Patterns

❌ **Não usar float**: `let fee = amount * 0.05;` → Usar basis points
❌ **Não permitir fee > 10%**: Validar `new_fee_bps <= 1000`
❌ **Não calcular splits off-chain**: Toda lógica deve ser on-chain
❌ **Não permitir fee change sem DAO**: Validar `DAOOrigin::ensure_origin`

---

## 📦 Dependências

- ✅ `pallet-bazari-commerce` (order_id + amount)
- ✅ `pallet-bazari-affiliate` (commission calculation)
- ✅ `pallet-balances` (Currency trait)

---

## 🔗 Referências

| Documento | Link |
|-----------|------|
| SPEC.md | [Link](../../../20-blueprints/pallets/bazari-fee/SPEC.md) |
| INTEGRATION.md | [Link](../../../20-blueprints/pallets/bazari-fee/INTEGRATION.md) |

---

## 🤖 Prompt para Claude Code

```
Implementar pallet bazari-fee para auto-splitting de pagamentos (platform + affiliate + seller).

CONTEXTO:
Sistema de split automático com:
- Platform fee configurável via DAO (default 5%)
- Affiliate commission automática (se houver referrer)
- Seller recebe remainder
- Toda lógica on-chain (transparente e verificável)

OBJETIVO:
1. Storage: FeeConfiguration (platform_fee_bps, treasury_account)
2. Extrinsic: set_platform_fee (DAO only, max 10%)
3. Helper: calculate_split(order_id, seller, buyer, amount) → Vec<(AccountId, Balance, SplitReason)>
4. Integration com bazari-escrow para atomic payouts

CHECKLIST:
✅ Criar estrutura (/root/bazari-chain/pallets/bazari-fee/)
✅ Implementar FeeConfiguration struct
✅ Implementar set_platform_fee (validar <= 10%)
✅ Implementar calculate_split helper (platform + affiliate + seller)
✅ Usar basis points (500 = 5%, não float)
✅ Validar DAOOrigin para set_platform_fee
✅ Criar testes (5+): set_fee, calculate_split, sum_equals_total
✅ Integrar no runtime (pallet_index = 27)

ANTI-PATTERNS:
❌ NÃO usar float para fee
❌ NÃO permitir fee > 10% (1000 bps)
❌ NÃO permitir set_platform_fee sem DAO
❌ NÃO calcular splits off-chain

OUTPUT:
- Código em /root/bazari-chain/pallets/bazari-fee/src/lib.rs
- Testes passando: cargo test -p pallet-bazari-fee
- Runtime compilando

IMPORTANTE:
- Platform fee em basis points (10_000 = 100%)
- Max fee = 10% = 1000 bps
- Calculate_split returns Vec<(AccountId, Balance, SplitReason)>
- Integration com bazari-escrow::split_release()
```

---

**Generated by**: Claude Code
**Version**: 1.0.0
