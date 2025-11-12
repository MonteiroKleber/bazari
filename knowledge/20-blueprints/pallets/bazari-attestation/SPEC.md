# bazari-attestation Pallet - Technical Specification

**Status**: 🎯 Priority 2 - Proof of Commerce
**Effort**: 2-3 weeks
**Dependencies**: `bazari-commerce`

---

## 🎯 Purpose

Anchor cryptographic proofs (handoff, delivery) on-chain with co-signatures and quorum validation.

**Problem**: No verifiable proof that orders were actually delivered. Disputes rely on "he said, she said" without evidence.

**Solution**: Store IPFS CIDs of proof files (photos, GPS, signatures) on-chain with multi-signature validation from buyer, seller, and courier.

---

## 📦 Storage Items

### 1. Attestations

```rust
#[pallet::storage]
#[pallet::getter(fn attestations)]
pub type Attestations<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    AttestationId,
    Attestation<T::AccountId, T::BlockNumber>,
    OptionQuery,
>;
```

**Attestation Struct**:
```rust
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
#[scale_info(skip_type_params(T))]
pub struct Attestation<AccountId, BlockNumber> {
    /// Unique attestation ID
    pub id: AttestationId,

    /// Associated order ID
    pub order_id: OrderId,

    /// Type of proof
    pub proof_type: ProofType,

    /// IPFS CID of proof file (JSON with photos, GPS, signatures)
    pub ipfs_cid: BoundedVec<u8, ConstU32<64>>,

    /// Required signers (buyer, seller, courier)
    pub required_signers: BoundedVec<AccountId, ConstU32<5>>,

    /// Accounts that have signed
    pub signers: BoundedVec<AccountId, ConstU32<5>>,

    /// Quorum threshold (e.g., 2-of-3)
    pub threshold: u8,

    /// Verification status
    pub verified: bool,

    /// Block when created
    pub created_at: BlockNumber,

    /// Block when verified (quorum met)
    pub verified_at: Option<BlockNumber>,
}
```

**ProofType Enum**:
```rust
#[derive(Clone, Encode, Decode, Eq, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
pub enum ProofType {
    /// Seller → Courier handoff (photo of package)
    HandoffProof,

    /// Courier → Buyer delivery (GPS + photo + signature)
    DeliveryProof,

    /// Seller packing proof (before shipment)
    PackingProof,

    /// Buyer inspection proof (upon receipt)
    InspectionProof,

    /// Custom proof type
    Custom,
}
```

---

### 2. OrderAttestations

```rust
#[pallet::storage]
pub type OrderAttestations<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    OrderId,
    BoundedVec<AttestationId, T::MaxAttestationsPerOrder>,
    ValueQuery,
>;
```

Maps orders to their attestations (for quick lookup).

---

### 3. AttestationCount

```rust
#[pallet::storage]
pub type AttestationCount<T> = StorageValue<_, u64, ValueQuery>;
```

---

## 🔧 Config Trait

```rust
#[pallet::config]
pub trait Config: frame_system::Config + bazari_commerce::Config {
    type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;

    /// Maximum signers per attestation
    #[pallet::constant]
    type MaxSigners: Get<u32>;

    /// Maximum attestations per order
    #[pallet::constant]
    type MaxAttestationsPerOrder: Get<u32>;

    /// Maximum IPFS CID length
    #[pallet::constant]
    type MaxIpfsCidLength: Get<u32>;

    /// Minimum threshold (at least 1 signature required)
    #[pallet::constant]
    type MinThreshold: Get<u8>;

    type WeightInfo: WeightInfo;
}
```

---

## 📤 Extrinsics

### 1. submit_proof

```rust
#[pallet::call_index(0)]
#[pallet::weight(T::WeightInfo::submit_proof())]
pub fn submit_proof(
    origin: OriginFor<T>,
    order_id: OrderId,
    proof_type: ProofType,
    ipfs_cid: Vec<u8>,
    required_signers: Vec<T::AccountId>,
    threshold: u8,
) -> DispatchResult {
    let submitter = ensure_signed(origin)?;

    // Validate order exists
    let order = bazari_commerce::Pallet::<T>::orders(order_id)
        .ok_or(Error::<T>::OrderNotFound)?;

    // Validate submitter is involved in order
    ensure!(
        submitter == order.buyer || submitter == order.seller,
        Error::<T>::Unauthorized
    );

    // Validate threshold
    ensure!(
        threshold >= T::MinThreshold::get(),
        Error::<T>::ThresholdTooLow
    );
    ensure!(
        threshold <= required_signers.len() as u8,
        Error::<T>::ThresholdTooHigh
    );

    // Validate IPFS CID length
    ensure!(
        ipfs_cid.len() <= T::MaxIpfsCidLength::get() as usize,
        Error::<T>::IpfsCidTooLong
    );

    // Create attestation
    let attestation_id = AttestationCount::<T>::get();
    AttestationCount::<T>::put(attestation_id.saturating_add(1));

    let attestation = Attestation {
        id: attestation_id,
        order_id,
        proof_type: proof_type.clone(),
        ipfs_cid: ipfs_cid.clone().try_into().map_err(|_| Error::<T>::IpfsCidTooLong)?,
        required_signers: required_signers.clone().try_into().map_err(|_| Error::<T>::TooManySigners)?,
        signers: BoundedVec::default(),
        threshold,
        verified: false,
        created_at: <frame_system::Pallet<T>>::block_number(),
        verified_at: None,
    };

    Attestations::<T>::insert(attestation_id, attestation);

    // Add to order's attestations
    OrderAttestations::<T>::try_mutate(order_id, |attestations| {
        attestations.try_push(attestation_id).map_err(|_| Error::<T>::TooManyAttestations)
    })?;

    Self::deposit_event(Event::ProofSubmitted {
        attestation_id,
        order_id,
        proof_type,
        submitter,
        ipfs_cid: ipfs_cid.try_into().unwrap(),
    });

    Ok(())
}
```

---

### 2. co_sign

```rust
#[pallet::call_index(1)]
#[pallet::weight(T::WeightInfo::co_sign())]
pub fn co_sign(origin: OriginFor<T>, attestation_id: AttestationId) -> DispatchResult {
    let signer = ensure_signed(origin)?;

    Attestations::<T>::try_mutate(attestation_id, |maybe_attestation| {
        let attestation = maybe_attestation.as_mut().ok_or(Error::<T>::AttestationNotFound)?;

        // Validate signer is required
        ensure!(
            attestation.required_signers.contains(&signer),
            Error::<T>::SignerNotRequired
        );

        // Validate not already signed
        ensure!(
            !attestation.signers.contains(&signer),
            Error::<T>::AlreadySigned
        );

        // Validate not already verified
        ensure!(!attestation.verified, Error::<T>::AlreadyVerified);

        // Add signature
        attestation.signers.try_push(signer.clone())
            .map_err(|_| Error::<T>::TooManySigners)?;

        // Check if quorum reached
        if attestation.signers.len() >= attestation.threshold as usize {
            attestation.verified = true;
            attestation.verified_at = Some(<frame_system::Pallet<T>>::block_number());

            Self::deposit_event(Event::AttestationVerified {
                attestation_id,
                order_id: attestation.order_id,
            });
        }

        Self::deposit_event(Event::ProofCoSigned {
            attestation_id,
            signer: signer.clone(),
            signatures_count: attestation.signers.len() as u8,
            threshold: attestation.threshold,
        });

        Ok(())
    })
}
```

---

### 3. revoke_signature

```rust
#[pallet::call_index(2)]
#[pallet::weight(T::WeightInfo::revoke_signature())]
pub fn revoke_signature(
    origin: OriginFor<T>,
    attestation_id: AttestationId,
) -> DispatchResult {
    let signer = ensure_signed(origin)?;

    Attestations::<T>::try_mutate(attestation_id, |maybe_attestation| {
        let attestation = maybe_attestation.as_mut().ok_or(Error::<T>::AttestationNotFound)?;

        // Validate signer has signed
        let position = attestation.signers.iter()
            .position(|s| s == &signer)
            .ok_or(Error::<T>::SignatureNotFound)?;

        // Validate not yet verified
        ensure!(!attestation.verified, Error::<T>::AlreadyVerified);

        // Remove signature
        attestation.signers.remove(position);

        Self::deposit_event(Event::SignatureRevoked {
            attestation_id,
            signer,
        });

        Ok(())
    })
}
```

---

### 4. update_ipfs_cid

```rust
#[pallet::call_index(3)]
#[pallet::weight(T::WeightInfo::update_ipfs_cid())]
pub fn update_ipfs_cid(
    origin: OriginFor<T>,
    attestation_id: AttestationId,
    new_ipfs_cid: Vec<u8>,
) -> DispatchResult {
    let who = ensure_signed(origin)?;

    Attestations::<T>::try_mutate(attestation_id, |maybe_attestation| {
        let attestation = maybe_attestation.as_mut().ok_or(Error::<T>::AttestationNotFound)?;

        // Validate not yet verified
        ensure!(!attestation.verified, Error::<T>::AlreadyVerified);

        // Validate submitter (original submitter can update)
        let order = bazari_commerce::Pallet::<T>::orders(attestation.order_id)
            .ok_or(Error::<T>::OrderNotFound)?;

        ensure!(
            who == order.buyer || who == order.seller,
            Error::<T>::Unauthorized
        );

        // Update CID
        attestation.ipfs_cid = new_ipfs_cid.clone().try_into()
            .map_err(|_| Error::<T>::IpfsCidTooLong)?;

        // Clear existing signatures (proof changed)
        attestation.signers = BoundedVec::default();

        Self::deposit_event(Event::IpfsCidUpdated {
            attestation_id,
            new_cid: new_ipfs_cid.try_into().unwrap(),
        });

        Ok(())
    })
}
```

---

### 5. challenge_proof

```rust
#[pallet::call_index(4)]
#[pallet::weight(T::WeightInfo::challenge_proof())]
pub fn challenge_proof(
    origin: OriginFor<T>,
    attestation_id: AttestationId,
    reason: Vec<u8>,
) -> DispatchResult {
    let challenger = ensure_signed(origin)?;

    let attestation = Attestations::<T>::get(attestation_id)
        .ok_or(Error::<T>::AttestationNotFound)?;

    // Validate challenger is involved
    let order = bazari_commerce::Pallet::<T>::orders(attestation.order_id)
        .ok_or(Error::<T>::OrderNotFound)?;

    ensure!(
        challenger == order.buyer || challenger == order.seller,
        Error::<T>::Unauthorized
    );

    // Open dispute on order
    // This would integrate with bazari-dispute pallet
    Self::deposit_event(Event::ProofChallenged {
        attestation_id,
        challenger,
        reason: reason.try_into().map_err(|_| Error::<T>::ReasonTooLong)?,
    });

    Ok(())
}
```

---

## 📢 Events

```rust
#[pallet::event]
#[pallet::generate_deposit(pub(super) fn deposit_event)]
pub enum Event<T: Config> {
    /// Proof submitted
    ProofSubmitted {
        attestation_id: AttestationId,
        order_id: OrderId,
        proof_type: ProofType,
        submitter: T::AccountId,
        ipfs_cid: BoundedVec<u8, ConstU32<64>>,
    },

    /// Proof co-signed
    ProofCoSigned {
        attestation_id: AttestationId,
        signer: T::AccountId,
        signatures_count: u8,
        threshold: u8,
    },

    /// Attestation verified (quorum reached)
    AttestationVerified {
        attestation_id: AttestationId,
        order_id: OrderId,
    },

    /// Signature revoked
    SignatureRevoked {
        attestation_id: AttestationId,
        signer: T::AccountId,
    },

    /// IPFS CID updated
    IpfsCidUpdated {
        attestation_id: AttestationId,
        new_cid: BoundedVec<u8, ConstU32<64>>,
    },

    /// Proof challenged
    ProofChallenged {
        attestation_id: AttestationId,
        challenger: T::AccountId,
        reason: BoundedVec<u8, ConstU32<256>>,
    },
}
```

---

## ❌ Errors

```rust
#[pallet::error]
pub enum Error<T> {
    /// Attestation not found
    AttestationNotFound,

    /// Order not found
    OrderNotFound,

    /// Unauthorized action
    Unauthorized,

    /// Threshold too low (must be >= 1)
    ThresholdTooLow,

    /// Threshold too high (exceeds signers count)
    ThresholdTooHigh,

    /// IPFS CID too long
    IpfsCidTooLong,

    /// Too many signers
    TooManySigners,

    /// Too many attestations per order
    TooManyAttestations,

    /// Signer not required for this attestation
    SignerNotRequired,

    /// Already signed by this account
    AlreadySigned,

    /// Already verified (cannot modify)
    AlreadyVerified,

    /// Signature not found
    SignatureNotFound,

    /// Reason too long
    ReasonTooLong,
}
```

---

## 🔗 Integration Points

### With bazari-commerce
- `submit_proof()` validates `order_id` exists
- Attestations linked to orders via `OrderAttestations`

### With bazari-dispute (Phase 2)
- `challenge_proof()` opens dispute
- Attestations used as evidence in disputes

### With IPFS (Off-chain)
- Proof files (photos, GPS, signatures) stored on IPFS
- Only CID anchored on-chain

---

## 📄 IPFS Proof File Format

Example HandoffProof JSON:
```json
{
  "orderId": "order_123",
  "proofType": "HandoffProof",
  "timestamp": "2025-11-11T14:30:00Z",
  "location": {
    "lat": -23.5505,
    "lon": -46.6333,
    "accuracy": 10
  },
  "photos": [
    "QmPhotoHash1", // Package photo
    "QmPhotoHash2"  // Seller + Courier photo
  ],
  "signatures": {
    "seller": "0x123abc...",  // Seller signature
    "courier": "0x456def..."  // Courier signature
  },
  "metadata": {
    "packageWeight": "2.5kg",
    "dimensions": "30x20x10cm",
    "trackingId": "TRACK123"
  }
}
```

---

## 📊 Weight Functions

```rust
pub trait WeightInfo {
    fn submit_proof() -> Weight;
    fn co_sign() -> Weight;
    fn revoke_signature() -> Weight;
    fn update_ipfs_cid() -> Weight;
    fn challenge_proof() -> Weight;
}
```

---

## 🧪 Tests Required

1. **Proof submission**: Valid and invalid orders
2. **Co-signing**: Quorum validation (2-of-3, 3-of-5)
3. **Signature revocation**: Before verification only
4. **IPFS CID update**: Clears signatures
5. **Challenge**: Opens dispute
6. **Edge cases**: Already verified, unauthorized signers

---

## 🔐 Security Considerations

### Proof Integrity
- ✅ IPFS CID is immutable (content-addressed)
- ✅ Multi-signature prevents single-party fraud
- ✅ Quorum validation ensures consensus

### Sybil Attack Prevention
- ✅ Only order participants can submit/sign
- ✅ Required signers whitelist (not open to all)

### Timestamp Manipulation
- ⚠️ Timestamps are in proof file (off-chain), not enforced on-chain
- ✅ Block number provides on-chain timestamp proxy

---

## 📚 References

- [Implementation Guide](IMPLEMENTATION.md)
- [Backend Integration](INTEGRATION.md)
- [Proof of Commerce](../../blockchain-integration/04-PROOF-OF-COMMERCE.md)
- [bazari-commerce](../bazari-commerce/SPEC.md)
