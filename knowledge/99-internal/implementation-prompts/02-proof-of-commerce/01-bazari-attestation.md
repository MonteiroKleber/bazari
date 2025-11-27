# bazari-attestation Pallet - Implementation Prompt

**Phase**: P2 - Proof of Commerce (Week 9-11)
**Effort**: 2-3 semanas
**Dependencies**: bazari-commerce (02-bazari-commerce.md)

---

## 📋 Contexto

**Problema**:
- Entregas não têm prova criptográfica verificável
- Disputas dependem de "ele disse, ela disse"
- Fotos podem ser adulteradas off-chain

**Solução**:
Pallet `bazari-attestation` que ancora **provas criptográficas imutáveis**:
- ✅ **HandoffProof**: Seller → Courier (pickup confirmado por ambos)
- ✅ **DeliveryProof**: Courier → Buyer (entrega confirmada por ambos)
- ✅ **Co-assinaturas**: 2-of-2 quórum (ambas partes devem assinar)
- ✅ **IPFS CID**: Fotos, GPS, timestamps armazenados off-chain
- ✅ **Validação on-chain**: Quórum verification + timestamp

**Impacto**:
- Disputas terão evidência criptográfica
- Impossível forjar provas (requer co-assinatura)
- GPS tracking validado via proofs

---

## 🎯 Objetivo

Implementar pallet Substrate `bazari-attestation` com:
1. Storage para Attestations (proof registry)
2. Extrinsics: `submit_proof`, `co_sign`, `verify_proof`
3. Validação de quórum (N-of-M signatures)
4. Integration com bazari-commerce (order_id FK)

**Output esperado**:
- ✅ Código Rust em `/root/bazari-chain/pallets/bazari-attestation/src/lib.rs`
- ✅ Testes passando: `cargo test -p pallet-bazari-attestation`
- ✅ Backend consegue submeter HandoffProof + DeliveryProof
- ✅ Disputas podem verificar proofs via RPC

---

## ✅ Checklist de Implementação

### Step 1: Criar Estrutura do Pallet
- [ ] Criar pasta `/root/bazari-chain/pallets/bazari-attestation/`
- [ ] Criar `Cargo.toml` (similar a outros pallets)

### Step 2: Implementar Storage Items
- [ ] **Attestations**: `StorageMap<AttestationId, Attestation>`
  ```rust
  #[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
  #[scale_info(skip_type_params(T))]
  pub struct Attestation<AccountId, BlockNumber> {
      pub attestation_id: u64,
      pub order_id: u64,
      pub proof_type: ProofType,
      pub ipfs_cid: BoundedVec<u8, ConstU32<64>>, // IPFS CID (Qm... ou bafybei...)
      pub required_signers: BoundedVec<AccountId, ConstU32<10>>,
      pub signatures: BoundedVec<AccountId, ConstU32<10>>, // Quem já assinou
      pub quorum: u32, // N-of-M (ex: 2 de 2)
      pub verified: bool,
      pub submitted_at: BlockNumber,
      pub verified_at: Option<BlockNumber>,
  }

  #[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
  pub enum ProofType {
      HandoffProof,  // Seller → Courier
      DeliveryProof, // Courier → Buyer
      CustomProof,   // Extensível para outros tipos
  }
  ```

- [ ] **AttestationIdCounter**: `StorageValue<u64>`

- [ ] **OrderAttestations**: `StorageDoubleMap<OrderId, ProofType, AttestationId>`
  - Permite query rápida: "Quais proofs existem para order X?"

### Step 3: Implementar Extrinsics
- [ ] **submit_proof**:
  ```rust
  #[pallet::call_index(0)]
  #[pallet::weight(T::WeightInfo::submit_proof())]
  pub fn submit_proof(
      origin: OriginFor<T>,
      order_id: u64,
      proof_type: ProofType,
      ipfs_cid: Vec<u8>,
      required_signers: Vec<T::AccountId>,
      quorum: u32,
  ) -> DispatchResult {
      let submitter = ensure_signed(origin)?;

      // Validar que order existe
      let order = pallet_bazari_commerce::Orders::<T>::get(order_id)
          .ok_or(Error::<T>::OrderNotFound)?;

      // Validar que submitter está na lista de signers
      ensure!(
          required_signers.contains(&submitter),
          Error::<T>::Unauthorized
      );

      // Validar quorum
      ensure!(
          quorum > 0 && quorum <= required_signers.len() as u32,
          Error::<T>::InvalidQuorum
      );

      let attestation_id = AttestationIdCounter::<T>::get();
      AttestationIdCounter::<T>::put(attestation_id + 1);

      let attestation = Attestation {
          attestation_id,
          order_id,
          proof_type: proof_type.clone(),
          ipfs_cid: ipfs_cid.try_into().map_err(|_| Error::<T>::CidTooLong)?,
          required_signers: required_signers.try_into().map_err(|_| Error::<T>::TooManySigners)?,
          signatures: BoundedVec::default(), // Empty initially
          quorum,
          verified: false,
          submitted_at: <frame_system::Pallet<T>>::block_number(),
          verified_at: None,
      };

      Attestations::<T>::insert(attestation_id, attestation);
      OrderAttestations::<T>::insert(order_id, proof_type, attestation_id);

      Self::deposit_event(Event::ProofSubmitted {
          attestation_id,
          order_id,
          submitter,
      });

      Ok(())
  }
  ```

- [ ] **co_sign**:
  ```rust
  #[pallet::call_index(1)]
  pub fn co_sign(
      origin: OriginFor<T>,
      attestation_id: u64,
  ) -> DispatchResult {
      let signer = ensure_signed(origin)?;

      Attestations::<T>::try_mutate(attestation_id, |maybe_attestation| {
          let attestation = maybe_attestation.as_mut()
              .ok_or(Error::<T>::AttestationNotFound)?;

          // Validar que signer está na lista de required_signers
          ensure!(
              attestation.required_signers.contains(&signer),
              Error::<T>::Unauthorized
          );

          // Validar que não assinou ainda
          ensure!(
              !attestation.signatures.contains(&signer),
              Error::<T>::AlreadySigned
          );

          // Adicionar assinatura
          attestation.signatures.try_push(signer.clone())
              .map_err(|_| Error::<T>::TooManySignatures)?;

          // Verificar se atingiu quórum
          if attestation.signatures.len() as u32 >= attestation.quorum {
              attestation.verified = true;
              attestation.verified_at = Some(<frame_system::Pallet<T>>::block_number());

              Self::deposit_event(Event::ProofVerified {
                  attestation_id,
                  order_id: attestation.order_id,
              });
          }

          Self::deposit_event(Event::ProofCoSigned {
              attestation_id,
              signer,
          });

          Ok(())
      })
  }
  ```

- [ ] **verify_proof** (query, não muta state):
  ```rust
  impl<T: Config> Pallet<T> {
      pub fn verify_proof(attestation_id: u64) -> bool {
          if let Some(attestation) = Attestations::<T>::get(attestation_id) {
              attestation.verified
          } else {
              false
          }
      }
  }
  ```

### Step 4: Implementar Events
- [ ] `ProofSubmitted { attestation_id, order_id, submitter }`
- [ ] `ProofCoSigned { attestation_id, signer }`
- [ ] `ProofVerified { attestation_id, order_id }` (quando quórum atingido)

### Step 5: Implementar Errors
- [ ] `OrderNotFound`
- [ ] `AttestationNotFound`
- [ ] `Unauthorized` (não está em required_signers)
- [ ] `AlreadySigned`
- [ ] `InvalidQuorum`
- [ ] `CidTooLong`
- [ ] `TooManySigners`
- [ ] `TooManySignatures`

### Step 6: Configurar Runtime
- [ ] Implementar `Config`:
  ```rust
  impl pallet_bazari_attestation::Config for Runtime {
      type RuntimeEvent = RuntimeEvent;
      type MaxSigners = ConstU32<10>;
      type MaxCidLength = ConstU32<64>;
      type WeightInfo = ();
  }
  ```

### Step 7: Escrever Testes
- [ ] `test_submit_handoff_proof_works()`
- [ ] `test_co_sign_works()`
- [ ] `test_proof_verified_after_quorum()`
- [ ] `test_submit_delivery_proof_works()`
- [ ] `test_co_sign_fails_already_signed()`
- [ ] `test_co_sign_fails_unauthorized()`
- [ ] `test_query_order_attestations()`

**Exemplo de teste**:
```rust
#[test]
fn handoff_proof_2_of_2_quorum_works() {
    new_test_ext().execute_with(|| {
        let seller = account(1);
        let courier = account(2);
        let order_id = 1;

        // Setup: Create order
        assert_ok!(BazariCommerce::create_order(
            RuntimeOrigin::signed(account(3)), // buyer
            seller.clone(),
            1, // store_id
            vec![],
            1000,
        ));

        // Seller submits HandoffProof
        assert_ok!(BazariAttestation::submit_proof(
            RuntimeOrigin::signed(seller.clone()),
            order_id,
            ProofType::HandoffProof,
            b"QmHandoffPhoto123".to_vec(), // IPFS CID
            vec![seller.clone(), courier.clone()], // 2 signers
            2, // 2-of-2 quorum
        ));

        let attestation_id = 0;

        // Verify not verified yet
        let attestation = BazariAttestation::attestations(attestation_id).unwrap();
        assert!(!attestation.verified);
        assert_eq!(attestation.signatures.len(), 0);

        // Seller co-signs (1/2)
        assert_ok!(BazariAttestation::co_sign(
            RuntimeOrigin::signed(seller.clone()),
            attestation_id,
        ));

        let attestation = BazariAttestation::attestations(attestation_id).unwrap();
        assert!(!attestation.verified); // Still not verified (1/2)
        assert_eq!(attestation.signatures.len(), 1);

        // Courier co-signs (2/2)
        assert_ok!(BazariAttestation::co_sign(
            RuntimeOrigin::signed(courier.clone()),
            attestation_id,
        ));

        // Now verified ✅
        let attestation = BazariAttestation::attestations(attestation_id).unwrap();
        assert!(attestation.verified);
        assert_eq!(attestation.signatures.len(), 2);

        // Event emitted
        System::assert_has_event(
            Event::ProofVerified {
                attestation_id,
                order_id,
            }.into()
        );
    });
}
```

### Step 8: Implementar Helper Functions
- [ ] `get_order_proofs()`:
  ```rust
  impl<T: Config> Pallet<T> {
      pub fn get_order_proofs(order_id: u64) -> Vec<(ProofType, u64)> {
          let mut proofs = Vec::new();

          if let Some(handoff_id) = OrderAttestations::<T>::get(order_id, ProofType::HandoffProof) {
              proofs.push((ProofType::HandoffProof, handoff_id));
          }

          if let Some(delivery_id) = OrderAttestations::<T>::get(order_id, ProofType::DeliveryProof) {
              proofs.push((ProofType::DeliveryProof, delivery_id));
          }

          proofs
      }
  }
  ```

### Step 9: Compilar e Testar
- [ ] `cargo build --release -p pallet-bazari-attestation`
- [ ] `cargo test -p pallet-bazari-attestation`
- [ ] Testar RPC query:
  ```bash
  # Get attestation by ID
  curl -H "Content-Type: application/json" -d '{
    "id":1,
    "jsonrpc":"2.0",
    "method":"state_getStorage",
    "params":["0x... (storage key for Attestations(0))"]
  }' http://localhost:9933
  ```

---

## 🚫 Anti-Patterns

### ❌ NÃO FAÇA:
1. **Permitir co-sign após verified**
   - ❌ Continuar aceitando assinaturas após quórum
   - ✅ Opcional: adicionar check `!attestation.verified`

2. **IPFS CID muito longo**
   - ❌ CIDv0: 46 chars (Qm...), CIDv1: 59 chars (bafybei...)
   - ✅ BoundedVec<u8, ConstU32<64>> suporta ambos

3. **Quorum 0 ou > required_signers**
   - ❌ `quorum = 0` ou `quorum > required_signers.len()`
   - ✅ Validar antes de criar attestation

### ✅ FAÇA:
1. **Quórum flexível**
   - Permitir 2-of-3 (ex: seller, courier, testemunha)
   - Útil para delivery em condomínios (porteiro co-assina)

2. **IPFS CID validation** (opcional):
   - Verificar que começa com `Qm` (CIDv0) ou `bafybei` (CIDv1)

3. **Timestamp verificação**
   - `verified_at` útil para disputas (quando quórum atingido?)

---

## 📦 Dependências

**Requer**:
- ✅ `pallet-bazari-commerce` (validar `order_id`)

**Requerido para**:
- ✅ `bazari-fulfillment` (GPS proofs)
- ✅ `bazari-dispute` (evidência em disputas)
- ✅ Backend GPS tracking (submeter HandoffProof + DeliveryProof)

---

## 🔗 Referências

- [SPEC.md](../../../20-blueprints/pallets/bazari-attestation/SPEC.md)
- [IMPLEMENTATION.md](../../../20-blueprints/pallets/bazari-attestation/IMPLEMENTATION.md)
- [GPS-TRACKING.md](../../../20-blueprints/pallets/bazari-fulfillment/GPS-TRACKING.md) - Como proofs são usados
- [IPFS CID Spec](https://github.com/multiformats/cid)

---

## 🤖 Prompt para Claude Code

```
Implementar pallet `bazari-attestation` para ancorar provas criptográficas de handoff e delivery on-chain no Bazari.

**Contexto**:
- Repositório: /root/bazari-chain
- Problema: Entregas não têm prova verificável, disputas são "ele disse, ela disse"
- Solução: Co-assinaturas (2-of-2 quórum) + IPFS CID para fotos/GPS
- Documentação: /root/bazari/knowledge/20-blueprints/pallets/bazari-attestation/

**Objetivo**:
1. Storage: Attestations (attestation_id → Attestation struct), OrderAttestations (order_id + proof_type → attestation_id)
2. Extrinsics: submit_proof (criar attestation), co_sign (adicionar assinatura), verify_proof (query helper)
3. Quorum validation: Verificar N-of-M assinaturas, marcar verified quando quórum atingido
4. Testes: 7+ testes cobrindo 2-of-2 quorum, unauthorized, already signed

**Specs técnicas**:
- Attestation struct: attestation_id, order_id, proof_type (enum: HandoffProof, DeliveryProof), ipfs_cid (BoundedVec<u8, 64>), required_signers (BoundedVec<AccountId, 10>), signatures (BoundedVec<AccountId, 10>), quorum (u32), verified (bool), timestamps
- submit_proof: validar order existe, submitter está em required_signers, quorum válido, criar attestation
- co_sign: validar signer está em required_signers, não assinou ainda, adicionar assinatura, marcar verified se quórum atingido
- verify_proof: helper para query verificação

**Anti-patterns**:
- ❌ Não permitir co-sign após verified (opcional)
- ❌ Não aceitar quorum inválido (0 ou > required_signers)
- ❌ CID muito longo (> 64 bytes)

**Checklist**:
- [ ] Criar /root/bazari-chain/pallets/bazari-attestation/
- [ ] Implementar Storage (Attestations, OrderAttestations, counter)
- [ ] Implementar 2 extrinsics (submit_proof, co_sign) + helper verify_proof
- [ ] Implementar 3 events e 8 errors
- [ ] Integrar no runtime
- [ ] Criar mock.rs e tests.rs (7+ testes, incluindo 2-of-2 quorum completo)
- [ ] Compilar: `cargo build --release -p pallet-bazari-attestation`
- [ ] Testar: `cargo test -p pallet-bazari-attestation`

**Referências**:
- SPEC: /root/bazari/knowledge/20-blueprints/pallets/bazari-attestation/SPEC.md
- GPS integration: /root/bazari/knowledge/20-blueprints/pallets/bazari-fulfillment/GPS-TRACKING.md

Me avise quando terminar e mostre output dos testes, especialmente teste de 2-of-2 quorum.
```

---

**Version**: 1.0.0
**Last Updated**: 2025-11-12
**Author**: Claude (Senior Software Architect)
