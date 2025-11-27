# bazari-escrow Pallet - Implementation Prompt

**Phase**: P1 - Foundation (Week 4-5)
**Effort**: 2 semanas
**Dependencies**: bazari-commerce (02-bazari-commerce.md)

---

## 📋 Contexto

**Problema Crítico**:
- `PaymentIntent` no Prisma usa `txHash` **NULL ou MOCK**
- Escrow não está implementado on-chain
- Pagamentos podem ser perdidos ou contestados sem prova

**Solução**:
Pallet `bazari-escrow` que:
- ✅ Trava fundos (BZR/USDT) em escrow quando order criado
- ✅ Libera para seller quando delivery confirmado
- ✅ Refund para buyer se cancelado/disputado
- ✅ Suporta partial refunds

**Impacto**:
- `PaymentIntent.txHash` será hash real de transação blockchain
- Compradores têm garantia de refund
- Sellers têm garantia de pagamento após delivery

---

## 🎯 Objetivo

Implementar pallet Substrate `bazari-escrow` com:
1. Storage para Escrows (locked funds)
2. Extrinsics: `lock_funds`, `release_funds`, `refund`, `partial_refund`
3. Integração com `pallet-balances` e `pallet-assets` (USDT)
4. Events para sincronizar backend

**Output esperado**:
- ✅ Código Rust em `/root/bazari-chain/pallets/bazari-escrow/src/lib.rs`
- ✅ Testes passando: `cargo test -p pallet-bazari-escrow`
- ✅ Integrado no runtime
- ✅ Backend consegue chamar `lock_funds` e receber `txHash` real

---

## ✅ Checklist de Implementação

### Step 1: Criar Estrutura do Pallet
- [ ] Criar pasta `/root/bazari-chain/pallets/bazari-escrow/`
- [ ] Criar `Cargo.toml`:

```toml
[package]
name = "pallet-bazari-escrow"
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
pallet-balances = "4.0.0-dev"

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

### Step 2: Implementar Storage Items
- [ ] **Escrows**: `StorageMap<OrderId, Escrow>`
  ```rust
  #[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
  #[scale_info(skip_type_params(T))]
  pub struct Escrow<AccountId, Balance, BlockNumber> {
      pub order_id: u64,
      pub buyer: AccountId,
      pub seller: AccountId,
      pub amount_locked: Balance,
      pub amount_released: Balance,
      pub status: EscrowStatus,
      pub locked_at: BlockNumber,
      pub updated_at: BlockNumber,
  }

  #[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
  pub enum EscrowStatus {
      Locked,
      Released,
      Refunded,
      PartialRefund,
      Disputed,
  }
  ```

### Step 3: Implementar Extrinsics
- [ ] **lock_funds**:
  ```rust
  #[pallet::call_index(0)]
  #[pallet::weight(T::WeightInfo::lock_funds())]
  pub fn lock_funds(
      origin: OriginFor<T>,
      order_id: u64,
      seller: T::AccountId,
      amount: BalanceOf<T>,
  ) -> DispatchResult {
      let buyer = ensure_signed(origin)?;

      // Validar que order existe
      let order = pallet_bazari_commerce::Orders::<T>::get(order_id)
          .ok_or(Error::<T>::OrderNotFound)?;

      ensure!(order.buyer == buyer, Error::<T>::Unauthorized);
      ensure!(order.total_amount == amount, Error::<T>::AmountMismatch);

      // Reserve funds (lock no wallet do buyer)
      T::Currency::reserve(&buyer, amount)?;

      // Criar escrow
      let escrow = Escrow {
          order_id,
          buyer: buyer.clone(),
          seller: seller.clone(),
          amount_locked: amount,
          amount_released: Zero::zero(),
          status: EscrowStatus::Locked,
          locked_at: <frame_system::Pallet<T>>::block_number(),
          updated_at: <frame_system::Pallet<T>>::block_number(),
      };

      Escrows::<T>::insert(order_id, escrow);

      Self::deposit_event(Event::FundsLocked {
          order_id,
          buyer,
          amount,
      });

      Ok(())
  }
  ```

- [ ] **release_funds**:
  ```rust
  #[pallet::call_index(1)]
  pub fn release_funds(
      origin: OriginFor<T>,
      order_id: u64,
  ) -> DispatchResult {
      let caller = ensure_signed(origin)?;

      let mut escrow = Escrows::<T>::get(order_id)
          .ok_or(Error::<T>::EscrowNotFound)?;

      // Validar que caller é buyer ou DAO
      ensure!(
          caller == escrow.buyer || T::DAOOrigin::ensure_origin(origin.clone()).is_ok(),
          Error::<T>::Unauthorized
      );

      ensure!(escrow.status == EscrowStatus::Locked, Error::<T>::InvalidStatus);

      // Unreserve do buyer
      T::Currency::unreserve(&escrow.buyer, escrow.amount_locked);

      // Transfer para seller
      T::Currency::transfer(
          &escrow.buyer,
          &escrow.seller,
          escrow.amount_locked,
          ExistenceRequirement::KeepAlive,
      )?;

      // Atualizar escrow
      escrow.amount_released = escrow.amount_locked;
      escrow.status = EscrowStatus::Released;
      escrow.updated_at = <frame_system::Pallet<T>>::block_number();

      Escrows::<T>::insert(order_id, escrow.clone());

      Self::deposit_event(Event::FundsReleased {
          order_id,
          seller: escrow.seller,
          amount: escrow.amount_locked,
      });

      Ok(())
  }
  ```

- [ ] **refund**:
  ```rust
  #[pallet::call_index(2)]
  pub fn refund(
      origin: OriginFor<T>,
      order_id: u64,
  ) -> DispatchResult {
      T::DAOOrigin::ensure_origin(origin)?; // Apenas DAO pode refund

      let mut escrow = Escrows::<T>::get(order_id)
          .ok_or(Error::<T>::EscrowNotFound)?;

      ensure!(escrow.status == EscrowStatus::Locked, Error::<T>::InvalidStatus);

      // Unreserve (devolve para buyer automaticamente)
      T::Currency::unreserve(&escrow.buyer, escrow.amount_locked);

      escrow.status = EscrowStatus::Refunded;
      escrow.updated_at = <frame_system::Pallet<T>>::block_number();

      Escrows::<T>::insert(order_id, escrow.clone());

      Self::deposit_event(Event::Refunded {
          order_id,
          buyer: escrow.buyer,
          amount: escrow.amount_locked,
      });

      Ok(())
  }
  ```

- [ ] **partial_refund**:
  ```rust
  #[pallet::call_index(3)]
  pub fn partial_refund(
      origin: OriginFor<T>,
      order_id: u64,
      buyer_amount: BalanceOf<T>,
      seller_amount: BalanceOf<T>,
  ) -> DispatchResult {
      T::DAOOrigin::ensure_origin(origin)?;

      let mut escrow = Escrows::<T>::get(order_id)
          .ok_or(Error::<T>::EscrowNotFound)?;

      ensure!(
          buyer_amount + seller_amount == escrow.amount_locked,
          Error::<T>::AmountMismatch
      );

      // Unreserve total
      T::Currency::unreserve(&escrow.buyer, escrow.amount_locked);

      // Buyer fica com buyer_amount (já está na carteira)
      // Transferir seller_amount para seller
      if seller_amount > Zero::zero() {
          T::Currency::transfer(
              &escrow.buyer,
              &escrow.seller,
              seller_amount,
              ExistenceRequirement::KeepAlive,
          )?;
      }

      escrow.amount_released = seller_amount;
      escrow.status = EscrowStatus::PartialRefund;
      escrow.updated_at = <frame_system::Pallet<T>>::block_number();

      Escrows::<T>::insert(order_id, escrow);

      Self::deposit_event(Event::PartialRefund {
          order_id,
          buyer_amount,
          seller_amount,
      });

      Ok(())
  }
  ```

### Step 4: Implementar Events
- [ ] `FundsLocked { order_id, buyer, amount }`
- [ ] `FundsReleased { order_id, seller, amount }`
- [ ] `Refunded { order_id, buyer, amount }`
- [ ] `PartialRefund { order_id, buyer_amount, seller_amount }`

### Step 5: Implementar Errors
- [ ] `OrderNotFound`
- [ ] `EscrowNotFound`
- [ ] `Unauthorized`
- [ ] `InvalidStatus`
- [ ] `AmountMismatch`
- [ ] `InsufficientBalance`

### Step 6: Configurar Runtime
- [ ] Adicionar ao `runtime/Cargo.toml` e `lib.rs`:
  ```rust
  impl pallet_bazari_escrow::Config for Runtime {
      type RuntimeEvent = RuntimeEvent;
      type Currency = Balances;
      type DAOOrigin = EnsureRoot<AccountId>;
      type WeightInfo = ();
  }
  ```

### Step 7: Escrever Testes
- [ ] `test_lock_funds_works()`
- [ ] `test_release_funds_works()`
- [ ] `test_refund_works()`
- [ ] `test_partial_refund_works()`
- [ ] `test_lock_funds_fails_order_not_found()`
- [ ] `test_release_funds_unauthorized()`
- [ ] `test_double_release_fails()`

**Exemplo de teste**:
```rust
#[test]
fn lock_and_release_works() {
    new_test_ext().execute_with(|| {
        let buyer = account(1);
        let seller = account(2);
        let order_id = 1;
        let amount = 1000;

        // Setup: Create order first
        assert_ok!(BazariCommerce::create_order(
            RuntimeOrigin::signed(buyer.clone()),
            seller.clone(),
            1, // store_id
            vec![],
            amount,
        ));

        // Give buyer some balance
        let _ = Balances::make_free_balance_be(&buyer, 10000);

        // Lock funds
        assert_ok!(BazariEscrow::lock_funds(
            RuntimeOrigin::signed(buyer.clone()),
            order_id,
            seller.clone(),
            amount,
        ));

        // Verify escrow created
        let escrow = BazariEscrow::escrows(order_id).unwrap();
        assert_eq!(escrow.amount_locked, amount);
        assert_eq!(escrow.status, EscrowStatus::Locked);

        // Verify funds reserved
        assert_eq!(Balances::reserved_balance(&buyer), amount);

        // Release funds (buyer calls)
        assert_ok!(BazariEscrow::release_funds(
            RuntimeOrigin::signed(buyer.clone()),
            order_id,
        ));

        // Verify escrow updated
        let escrow = BazariEscrow::escrows(order_id).unwrap();
        assert_eq!(escrow.status, EscrowStatus::Released);

        // Verify funds transferred
        assert_eq!(Balances::free_balance(&seller), amount);
        assert_eq!(Balances::reserved_balance(&buyer), 0);
    });
}
```

### Step 8: Compilar e Testar
- [ ] `cargo build --release -p pallet-bazari-escrow`
- [ ] `cargo test -p pallet-bazari-escrow`
- [ ] `cargo build --release` (runtime completo)

---

## 🚫 Anti-Patterns

### ❌ NÃO FAÇA:
1. **Transferir direto sem reserve**
   - ❌ `transfer()` imediato (pode falhar se buyer gastar fundos)
   - ✅ `reserve()` primeiro, `unreserve()` + `transfer()` depois

2. **Permitir double-release**
   - ❌ Não verificar `status == Locked`
   - ✅ `ensure!(status == Locked)` antes de release

3. **Partial refund sem validação**
   - ❌ `buyer_amount + seller_amount != total`
   - ✅ Sempre validar soma == amount_locked

### ✅ FAÇA:
1. **Reserve/Unreserve pattern**
   - `reserve()` quando lock
   - `unreserve()` quando release/refund

2. **DAO-only para refunds**
   - Apenas DAO pode forçar refund
   - Buyer pode release (aprovar delivery)

3. **Events detalhados**
   - Incluir `order_id`, `buyer`, `seller`, `amount` em todos events

---

## 📦 Dependências

**Requer**:
- ✅ `pallet-bazari-commerce` (validar `order_id`)
- ✅ `pallet-balances` (reserve/unreserve)

**Requerido para**:
- ✅ Backend `PaymentIntent` (precisa `txHash` real)
- ✅ `bazari-dispute` (partial refund em disputas)

---

## 🔗 Referências

- [SPEC.md](../../../20-blueprints/pallets/bazari-escrow/SPEC.md)
- [IMPLEMENTATION.md](../../../20-blueprints/pallets/bazari-escrow/IMPLEMENTATION.md)
- [pallet-balances Reserve Trait](https://docs.substrate.io/rustdocs/latest/frame_support/traits/tokens/currency/trait.ReservableCurrency.html)

---

## 🤖 Prompt para Claude Code

```
Implementar pallet `bazari-escrow` para travar fundos em escrow durante orders no Bazari blockchain.

**Contexto**:
- Repositório: /root/bazari-chain
- `pallet-bazari-commerce` já implementado (tem Orders storage)
- Problema: PaymentIntent usa txHash MOCK, precisa txHash real
- Documentação: /root/bazari/knowledge/20-blueprints/pallets/bazari-escrow/

**Objetivo**:
1. Storage: Escrows map (order_id → Escrow struct com status, amounts, buyer, seller)
2. Extrinsics: lock_funds (reserve), release_funds (transfer para seller), refund (unreserve), partial_refund (split)
3. Events: FundsLocked, FundsReleased, Refunded, PartialRefund
4. Testes: 7+ testes cobrindo happy path + edge cases

**Specs técnicas**:
- Escrow struct: order_id, buyer, seller, amount_locked, amount_released, status (enum), timestamps
- EscrowStatus enum: Locked, Released, Refunded, PartialRefund, Disputed
- usar `T::Currency::reserve()` para lock, `unreserve()` + `transfer()` para release
- Apenas DAO pode chamar `refund()` e `partial_refund()`

**Anti-patterns**:
- ❌ Não transferir direto sem reserve (usar reserve/unreserve pattern)
- ❌ Não permitir double-release (validar status == Locked)
- ❌ Partial refund sem validar soma (buyer_amount + seller_amount == total)

**Checklist**:
- [ ] Criar /root/bazari-chain/pallets/bazari-escrow/
- [ ] Implementar Storage (Escrows map)
- [ ] Implementar 4 extrinsics (lock, release, refund, partial_refund)
- [ ] Implementar 4 events e 6 errors
- [ ] Integrar no runtime
- [ ] Criar mock.rs e tests.rs (7+ testes)
- [ ] Compilar: `cargo build --release -p pallet-bazari-escrow`
- [ ] Testar: `cargo test -p pallet-bazari-escrow` (todos devem passar)

**Referências**:
- SPEC: /root/bazari/knowledge/20-blueprints/pallets/bazari-escrow/SPEC.md
- pallet-balances ReservableCurrency trait para reserve/unreserve

Me avise quando terminar e mostre output dos testes.
```

---

**Version**: 1.0.0
**Last Updated**: 2025-11-12
**Author**: Claude (Senior Software Architect)
