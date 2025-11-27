# bazari-commerce Pallet - Implementation Prompt

**Phase**: P1 - Foundation (Week 2-3)
**Effort**: 2-3 semanas
**Dependencies**: Schema Unification (01-schema-unification.md)

---

## 📋 Contexto

**Problema Crítico**:
- BazChat commerce usa `txHash` **fake/MOCK** em produção
- Orders, Sales, Commissions existem apenas no PostgreSQL
- Não há prova imutável de transações comerciais

**Solução**:
Pallet `bazari-commerce` que armazena:
- ✅ Orders on-chain (buyer, seller, store, valor, status)
- ✅ Sales on-chain (vendas do seller)
- ✅ Commissions on-chain (comissões para afiliados/delivery/etc)

**Impacto**:
- BazChat poderá usar `txHash` real
- Disputas terão prova imutável
- Sellers terão histórico verificável de vendas

---

## 🎯 Objetivo

Implementar pallet Substrate `bazari-commerce` com:
1. Storage para Orders, Sales, Commissions
2. Extrinsics: `create_order`, `update_order_status`, `record_sale`, `record_commission`
3. Events para sincronizar backend
4. Testes unitários completos

**Output esperado**:
- ✅ Código Rust em `/root/bazari-chain/pallets/bazari-commerce/src/lib.rs`
- ✅ Testes passando: `cargo test -p pallet-bazari-commerce`
- ✅ Pallet integrado no runtime (`/root/bazari-chain/runtime/src/lib.rs`)
- ✅ RPC funcionando: `polkadot.js` consegue ler `Orders` storage

---

## ✅ Checklist de Implementação

### Step 1: Criar Estrutura do Pallet
- [ ] Criar pasta `/root/bazari-chain/pallets/bazari-commerce/`
- [ ] Criar `Cargo.toml`:

```toml
[package]
name = "pallet-bazari-commerce"
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
pallet-stores = { path = "../stores", default-features = false }

[dev-dependencies]
sp-core = "7.0.0"
sp-io = "7.0.0"

[features]
default = ["std"]
std = [
    "codec/std",
    "scale-info/std",
    "frame-support/std",
    "frame-system/std",
    "sp-runtime/std",
    "pallet-stores/std",
]
```

- [ ] Criar `src/lib.rs` com estrutura base (ver SPEC.md)

### Step 2: Implementar Storage Items
- [ ] **Orders**: `StorageMap<OrderId, Order>`
- [ ] **Sales**: `StorageDoubleMap<StoreId, SaleId, Sale>`
- [ ] **Commissions**: `StorageMap<CommissionId, Commission>`
- [ ] **OrderIdCounter**: `StorageValue<u64>` (auto-increment)
- [ ] **SaleIdCounter**: `StorageValue<u64>`
- [ ] **CommissionIdCounter**: `StorageValue<u64>`

**Order Struct** (copiar de SPEC.md):
```rust
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
#[scale_info(skip_type_params(T))]
pub struct Order<AccountId, Balance, BlockNumber> {
    pub order_id: u64,
    pub buyer: AccountId,
    pub seller: AccountId,
    pub store_id: u64,
    pub total_amount: Balance,
    pub status: OrderStatus,
    pub items: BoundedVec<OrderItem<Balance>, ConstU32<50>>,
    pub created_at: BlockNumber,
    pub updated_at: BlockNumber,
}

#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub struct OrderItem<Balance> {
    pub product_id: u64,
    pub quantity: u32,
    pub price: Balance,
}

#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub enum OrderStatus {
    Pending,
    Confirmed,
    InTransit,
    Delivered,
    Disputed,
    Cancelled,
}
```

### Step 3: Implementar Extrinsics
- [ ] **create_order**:
  ```rust
  #[pallet::call_index(0)]
  #[pallet::weight(T::WeightInfo::create_order())]
  pub fn create_order(
      origin: OriginFor<T>,
      seller: T::AccountId,
      store_id: u64,
      items: Vec<OrderItem<BalanceOf<T>>>,
      total_amount: BalanceOf<T>,
  ) -> DispatchResult
  ```
  - Gerar novo `OrderId` (incrementar counter)
  - Validar que `store_id` existe (usar `pallet_stores::Stores`)
  - Criar `Order` struct com status `Pending`
  - Inserir em `Orders` storage
  - Emitir evento `OrderCreated`

- [ ] **update_order_status**:
  ```rust
  #[pallet::call_index(1)]
  pub fn update_order_status(
      origin: OriginFor<T>,
      order_id: u64,
      new_status: OrderStatus,
  ) -> DispatchResult
  ```
  - Validar que `order_id` existe
  - Validar que caller é `buyer` ou `seller` ou `DAOOrigin`
  - Atualizar `status` e `updated_at`
  - Emitir evento `OrderStatusUpdated`

- [ ] **record_sale**:
  ```rust
  #[pallet::call_index(2)]
  pub fn record_sale(
      origin: OriginFor<T>,
      order_id: u64,
      store_id: u64,
      net_amount: BalanceOf<T>,
  ) -> DispatchResult
  ```
  - Gerar novo `SaleId`
  - Criar `Sale` struct
  - Inserir em `Sales` storage (key: `store_id`, `sale_id`)
  - Emitir evento `SaleRecorded`

- [ ] **record_commission**:
  ```rust
  #[pallet::call_index(3)]
  pub fn record_commission(
      origin: OriginFor<T>,
      order_id: u64,
      recipient: T::AccountId,
      commission_type: CommissionType,
      amount: BalanceOf<T>,
  ) -> DispatchResult
  ```

### Step 4: Implementar Events
- [ ] `OrderCreated { order_id, buyer, seller, total_amount }`
- [ ] `OrderStatusUpdated { order_id, old_status, new_status }`
- [ ] `SaleRecorded { sale_id, store_id, order_id, net_amount }`
- [ ] `CommissionRecorded { commission_id, order_id, recipient, amount }`

### Step 5: Implementar Errors
- [ ] `OrderNotFound`
- [ ] `StoreNotFound`
- [ ] `Unauthorized`
- [ ] `InvalidStatus`
- [ ] `InvalidAmount`
- [ ] `TooManyItems`

### Step 6: Configurar Runtime
- [ ] Adicionar ao `/root/bazari-chain/runtime/Cargo.toml`:
  ```toml
  pallet-bazari-commerce = { path = "../pallets/bazari-commerce", default-features = false }
  ```

- [ ] Implementar `Config` no `/root/bazari-chain/runtime/src/lib.rs`:
  ```rust
  impl pallet_bazari_commerce::Config for Runtime {
      type RuntimeEvent = RuntimeEvent;
      type Currency = Balances;
      type MaxOrderItems = ConstU32<50>;
      type DAOOrigin = EnsureRoot<AccountId>;
      type WeightInfo = ();
  }
  ```

- [ ] Adicionar ao `construct_runtime!` macro:
  ```rust
  BazariCommerce: pallet_bazari_commerce,
  ```

### Step 7: Escrever Testes Unitários
- [ ] Criar `/root/bazari-chain/pallets/bazari-commerce/src/mock.rs`
- [ ] Criar `/root/bazari-chain/pallets/bazari-commerce/src/tests.rs`
- [ ] Testes mínimos:
  - [ ] `test_create_order_works()`
  - [ ] `test_update_order_status_works()`
  - [ ] `test_record_sale_works()`
  - [ ] `test_record_commission_works()`
  - [ ] `test_create_order_fails_invalid_store()`
  - [ ] `test_update_order_status_unauthorized()`
  - [ ] `test_too_many_items_error()`

**Exemplo de teste** (copiar estrutura de `pallet-stores`):
```rust
#[test]
fn create_order_works() {
    new_test_ext().execute_with(|| {
        let buyer = account(1);
        let seller = account(2);
        let store_id = 1;

        // First create store
        assert_ok!(Stores::register_store(
            RuntimeOrigin::signed(seller.clone()),
            b"Test Store".to_vec(),
            // ...
        ));

        // Create order
        let items = vec![
            OrderItem { product_id: 1, quantity: 2, price: 100 },
        ];

        assert_ok!(BazariCommerce::create_order(
            RuntimeOrigin::signed(buyer.clone()),
            seller.clone(),
            store_id,
            items.clone(),
            200, // total_amount
        ));

        // Verify storage
        let order = BazariCommerce::orders(1).unwrap();
        assert_eq!(order.buyer, buyer);
        assert_eq!(order.seller, seller);
        assert_eq!(order.total_amount, 200);
        assert_eq!(order.status, OrderStatus::Pending);

        // Verify event
        System::assert_has_event(
            Event::OrderCreated {
                order_id: 1,
                buyer,
                seller,
                total_amount: 200,
            }.into()
        );
    });
}
```

### Step 8: Compilar e Testar
- [ ] Compilar pallet:
  ```bash
  cd /root/bazari-chain
  cargo build --release -p pallet-bazari-commerce
  ```

- [ ] Rodar testes:
  ```bash
  cargo test -p pallet-bazari-commerce
  ```

- [ ] Compilar runtime completo:
  ```bash
  cargo build --release
  ```

- [ ] Testar node:
  ```bash
  ./target/release/solochain-template-node --dev --tmp
  ```

### Step 9: Validar RPC
- [ ] Abrir Polkadot.js Apps: https://polkadot.js.org/apps/?rpc=ws://127.0.0.1:9944
- [ ] Developer → Chain State → `bazariCommerce` → `orders(1)` → Query
- [ ] Verificar que retorna dados do order criado no teste

---

## 🚫 Anti-Patterns

### ❌ NÃO FAÇA:
1. **Armazenar dados grandes on-chain**
   - ❌ Descrição de produto (usar IPFS CID)
   - ❌ Imagens (usar IPFS)
   - ✅ Apenas IDs, valores, status

2. **Validar business logic no pallet**
   - ❌ Calcular impostos no pallet
   - ❌ Validar estoque (fazer off-chain)
   - ✅ Pallet apenas registra transações já validadas

3. **Usar `String` para IDs**
   - ❌ `store_id: String`
   - ✅ `store_id: u64`

4. **Auto-incrementar IDs sem mutex**
   - ❌ `OrderIdCounter::get() + 1` (race condition)
   - ✅ `OrderIdCounter::mutate(|id| { *id += 1; *id })`

### ✅ FAÇA:
1. **Bounded collections**
   - ✅ `BoundedVec<OrderItem, ConstU32<50>>` (máximo 50 itens por order)

2. **Weight estimation**
   - ✅ `#[pallet::weight(T::WeightInfo::create_order())]`
   - Start com `10_000` placeholder, refinar depois

3. **Event para cada mudança**
   - ✅ Emitir evento após inserir storage
   - Backend escuta eventos para sincronizar Prisma

---

## 📦 Dependências

**Requer**:
- ✅ `pallet-stores` (validar `store_id`)
- ✅ `pallet-balances` (validar `total_amount`)
- ✅ Schema Unification (campos `blockchainOrderId` no Prisma)

**Requerido para**:
- ✅ `bazari-escrow` (precisa `order_id`)
- ✅ `bazari-attestation` (precisa `order_id`)
- ✅ `bazari-affiliate` (precisa `order_id` para comissões)

---

## 🔗 Referências

- [SPEC.md](../../../20-blueprints/pallets/bazari-commerce/SPEC.md) - Especificação completa
- [IMPLEMENTATION.md](../../../20-blueprints/pallets/bazari-commerce/IMPLEMENTATION.md) - Detalhes de implementação
- [pallet-stores](../../../../bazari-chain/pallets/stores/) - Exemplo de pallet existente
- [Substrate Pallet Template](https://github.com/paritytech/polkadot-sdk/tree/master/substrate/frame/examples/basic)

---

## 🤖 Prompt para Claude Code

```
Estou implementando o pallet `bazari-commerce` para armazenar Orders, Sales e Commissions on-chain no Bazari blockchain.

**Contexto**:
- Repositório blockchain: /root/bazari-chain
- Schema Prisma já atualizado (Step 1 concluído)
- Pallet `pallet-stores` já existe e funciona
- Documentação: /root/bazari/knowledge/20-blueprints/pallets/bazari-commerce/

**Objetivo**:
Implementar pallet Substrate completo com:
1. Storage: Orders, Sales, Commissions (+ counters auto-increment)
2. Extrinsics: create_order, update_order_status, record_sale, record_commission
3. Events para cada ação
4. Testes unitários (mínimo 7 testes)
5. Integrar no runtime

**Specs técnicas**:
- Order struct: order_id (u64), buyer, seller, store_id, total_amount, status (enum), items (BoundedVec<OrderItem, 50>), timestamps
- Sale struct: sale_id (u64), order_id, store_id, seller, net_amount, timestamp
- Commission struct: commission_id (u64), order_id, recipient, commission_type (enum), amount, timestamp
- OrderStatus enum: Pending, Confirmed, InTransit, Delivered, Disputed, Cancelled

**Anti-patterns a evitar**:
- ❌ Não armazenar dados grandes (usar IPFS CID)
- ❌ Não validar business logic (estoque, impostos) no pallet
- ❌ Não usar `String` para IDs (usar `u64`)
- ❌ Não auto-incrementar sem `mutate()`

**Checklist**:
- [ ] Criar /root/bazari-chain/pallets/bazari-commerce/ com Cargo.toml e src/lib.rs
- [ ] Implementar Storage items (Orders, Sales, Commissions, counters)
- [ ] Implementar 4 extrinsics (create_order, update_order_status, record_sale, record_commission)
- [ ] Implementar 4 events
- [ ] Implementar 6 errors
- [ ] Integrar no runtime (/root/bazari-chain/runtime/src/lib.rs)
- [ ] Criar mock.rs e tests.rs com 7+ testes
- [ ] Compilar: `cargo build --release -p pallet-bazari-commerce`
- [ ] Rodar testes: `cargo test -p pallet-bazari-commerce` (todos devem passar)
- [ ] Compilar runtime completo: `cargo build --release`
- [ ] Testar node: `./target/release/solochain-template-node --dev --tmp`

**Referências**:
- Ler SPEC completo: /root/bazari/knowledge/20-blueprints/pallets/bazari-commerce/SPEC.md
- Usar pallet-stores como exemplo de código: /root/bazari-chain/pallets/stores/src/lib.rs

Me avise quando terminar e mostre:
1. Output de `cargo test -p pallet-bazari-commerce`
2. Screenshot ou curl de RPC query para `orders(1)`
3. Lista de eventos emitidos no teste
```

---

**Version**: 1.0.0
**Last Updated**: 2025-11-12
**Author**: Claude (Senior Software Architect)
