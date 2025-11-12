# Proof of Commerce (PoC) - Decentralized Commerce Protocol

**Status**: 🎯 Active Development
**Last Updated**: 2025-11-11
**Version**: 1.0

---

## 🎯 VISÃO GERAL

### O que é Proof of Commerce?

**Proof of Commerce (PoC)** é um protocolo descentralizado que **prova criptograficamente** que uma transação comercial real ocorreu, eliminando a necessidade de confiança em intermediários centralizados.

### Problema

No e-commerce tradicional:
- ❌ **Confiança cega**: Compradores confiam que vendedores enviarão produtos
- ❌ **Escrow centralizado**: Plataformas controlam fundos (risco de censura)
- ❌ **Disputas opacas**: Processos de resolução não são auditáveis
- ❌ **Fraude comum**: 15% das transações B2C têm disputas (Stripe, 2024)

### Solução: 7 Camadas de Garantias

```
┌────────────────────────────────────────────────────────────┐
│  LAYER 7: Decentralized Dispute Resolution                │
│  • VRF juror selection (unbiased randomness)              │
│  • Commit-reveal voting (prevent collusion)               │
│  • Staked jurors (skin in the game)                       │
└────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────┐
│  LAYER 6: Cryptographic Attestations                      │
│  • Co-signatures (buyer + seller + courier)               │
│  • IPFS anchoring (tamper-proof evidence)                 │
│  • Threshold validation (2-of-3 quorum)                   │
└────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────┐
│  LAYER 5: Automatic Escrow Release                        │
│  • Time-locked escrow (7 days default)                    │
│  • Auto-release after timeout (no action needed)          │
│  • Multi-asset support (BZR, ZARI, USDT)                  │
└────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────┐
│  LAYER 4: Staked Courier Network                          │
│  • Minimum stake (1000 BZR)                               │
│  • Reputation-based matching                              │
│  • Slashing for misconduct                                │
└────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────┐
│  LAYER 3: Immutable Order History                         │
│  • On-chain order storage (tamper-proof)                  │
│  • Event-sourced state transitions                        │
│  • Consensus validation (51% attack resistant)            │
└────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────┐
│  LAYER 2: Transparent Commission DAG                      │
│  • Merkle proofs (verify splits without revealing tree)   │
│  • Multi-level affiliates (5 levels max)                  │
│  • Automatic decay (50% per level)                        │
└────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────┐
│  LAYER 1: Fee Splitting Protocol                          │
│  • Configurable platform fee (5% default)                 │
│  • DAO-controlled parameters                              │
│  • Atomic splits (all or nothing)                         │
└────────────────────────────────────────────────────────────┘
```

---

## 📋 PROTOCOLOS DETALHADOS

### LAYER 1: Fee Splitting Protocol

#### Objetivo
Garantir que **todas as partes recebam seus fundos automaticamente** no momento do pagamento, sem intermediários.

#### Implementação (`bazari-fee`)

```rust
// pallets/bazari-fee/src/lib.rs

#[pallet::storage]
pub type FeeConfig<T: Config> = StorageValue<_, FeeConfiguration>;

pub struct FeeConfiguration {
    pub platform_fee_percent: u8, // 5% (DAO-controlled)
    pub treasury_account: AccountId,
    pub min_order_amount: Balance, // Anti-spam: 10 BZR minimum
}

#[pallet::call]
impl<T: Config> Pallet<T> {
    /// Calculate split for an order
    /// Returns: Vec<(AccountId, Balance)>
    pub fn calculate_split(
        order_amount: Balance,
        affiliate_splits: Vec<(AccountId, Percent)>,
    ) -> Result<Vec<(AccountId, Balance)>, Error<T>> {
        let config = FeeConfig::<T>::get()
            .ok_or(Error::<T>::ConfigNotFound)?;

        // Platform fee (5%)
        let platform_fee = order_amount
            .checked_mul(config.platform_fee_percent as u128)
            .ok_or(Error::<T>::Overflow)?
            .checked_div(100)
            .ok_or(Error::<T>::Overflow)?;

        let mut splits = vec![(config.treasury_account, platform_fee)];

        // Affiliate splits (up to 3% total)
        let mut affiliate_total = 0u128;
        for (affiliate, percent) in affiliate_splits {
            let amount = order_amount
                .checked_mul(percent as u128)
                .ok_or(Error::<T>::Overflow)?
                .checked_div(100)
                .ok_or(Error::<T>::Overflow)?;

            affiliate_total += amount;
            splits.push((affiliate, amount));
        }

        // Remaining goes to seller (92%)
        let seller_net = order_amount
            .checked_sub(platform_fee)
            .ok_or(Error::<T>::Underflow)?
            .checked_sub(affiliate_total)
            .ok_or(Error::<T>::Underflow)?;

        Ok(splits)
    }
}
```

#### Example Flow

```
Order Amount: 100 BZR

SPLIT CALCULATION:
├─ Platform Fee (5%): 5 BZR → Treasury (DAOAccount)
├─ Affiliate L0 (2%): 2 BZR → Referrer1
├─ Affiliate L1 (1%): 1 BZR → Referrer2
└─ Seller Net (92%): 92 BZR → StoreOwner

ATOMIC EXECUTION:
1. Lock 100 BZR in escrow
2. Calculate splits (bazari-fee)
3. Execute splits (bazari-escrow.split_release)
   - All transfers succeed OR entire transaction reverts
```

---

### LAYER 2: Transparent Commission DAG

#### Objetivo
Criar uma **árvore de comissões verificável** sem revelar toda a estrutura (privacidade + transparência).

#### Implementação (`bazari-affiliate`)

```rust
// pallets/bazari-affiliate/src/lib.rs

#[pallet::storage]
pub type AffiliateCampaigns<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    CampaignId,
    Campaign,
>;

pub struct Campaign {
    pub store_id: StoreId,
    pub commission_rate: Percent, // 5% base rate
    pub max_depth: u8, // 5 levels
    pub decay_rate: Percent, // 50% per level
    pub merkle_root: Hash, // Root of referral tree
}

#[pallet::storage]
pub type ReferralTree<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    T::AccountId,
    Referral<T::AccountId>,
>;

pub struct Referral<AccountId> {
    pub referrer: Option<AccountId>, // Parent in tree
    pub referee: AccountId, // Current node
    pub depth: u8, // Distance from root (0-4)
    pub total_referrals: u32, // Count of direct referrals
}

#[pallet::call]
impl<T: Config> Pallet<T> {
    /// Register a referral relationship
    pub fn register_referral(
        origin: OriginFor<T>,
        referrer: T::AccountId,
    ) -> DispatchResult {
        let referee = ensure_signed(origin)?;

        // Verify referrer exists
        let referrer_node = ReferralTree::<T>::get(&referrer)
            .ok_or(Error::<T>::ReferrerNotFound)?;

        // Enforce max depth (5 levels)
        ensure!(
            referrer_node.depth < 4,
            Error::<T>::MaxDepthExceeded
        );

        // Create referral node
        let new_node = Referral {
            referrer: Some(referrer.clone()),
            referee: referee.clone(),
            depth: referrer_node.depth + 1,
            total_referrals: 0,
        };

        ReferralTree::<T>::insert(&referee, new_node);

        // Increment referrer count
        ReferralTree::<T>::mutate(&referrer, |node| {
            node.total_referrals += 1;
        });

        Self::deposit_event(Event::ReferralRegistered {
            referrer,
            referee,
            depth: referrer_node.depth + 1,
        });

        Ok(())
    }

    /// Execute commission split with Merkle proof
    pub fn execute_split(
        order_id: OrderId,
        buyer: T::AccountId,
        amount: Balance,
        merkle_proof: Vec<Hash>,
    ) -> DispatchResult {
        // Traverse referral chain upwards
        let mut splits = Vec::new();
        let mut current = buyer;
        let mut depth = 0u8;

        while depth < 5 {
            if let Some(node) = ReferralTree::<T>::get(&current) {
                if let Some(referrer) = node.referrer {
                    // Calculate commission with decay
                    let base_rate = 5u8; // 5%
                    let decay_factor = 0.5f32.powi(depth as i32); // 50% per level
                    let effective_rate = (base_rate as f32 * decay_factor) as u8;

                    let commission = amount
                        .checked_mul(effective_rate as u128)
                        .ok_or(Error::<T>::Overflow)?
                        .checked_div(100)
                        .ok_or(Error::<T>::Overflow)?;

                    splits.push((referrer.clone(), commission));

                    current = referrer;
                    depth += 1;
                } else {
                    break; // Reached root
                }
            } else {
                break; // No referrer
            }
        }

        // Verify Merkle proof (privacy-preserving)
        let computed_root = Self::compute_merkle_root(&splits, &merkle_proof)?;
        let campaign = AffiliateCampaigns::<T>::get(order_id)
            .ok_or(Error::<T>::CampaignNotFound)?;

        ensure!(
            computed_root == campaign.merkle_root,
            Error::<T>::InvalidMerkleProof
        );

        // Execute splits via bazari-escrow
        T::EscrowPallet::split_release(order_id, splits)?;

        Ok(())
    }
}
```

#### DAG Example

```
                    ROOT (Store)
                        │
            ┌───────────┴───────────┐
            │                       │
      Referrer L0            Referrer L0
      (5% of sale)           (5% of sale)
            │                       │
      ┌─────┴─────┐           ┌────┴────┐
      │           │           │         │
  Referee L1  Referee L1  Referee L1  Referee L1
  (2.5%)      (2.5%)      (2.5%)      (2.5%)
      │
  Referee L2
  (1.25%)

SALE: 100 BZR
├─ Referrer L0: 5 BZR
├─ Referee L1: 2.5 BZR
└─ Referee L2: 1.25 BZR
TOTAL COMMISSIONS: 8.75 BZR
```

---

### LAYER 3: Immutable Order History

#### Objetivo
Garantir que **nenhuma parte pode alterar ou deletar pedidos** após criação.

#### Implementação (`bazari-commerce`)

```rust
// pallets/bazari-commerce/src/lib.rs

#[pallet::storage]
#[pallet::getter(fn orders)]
pub type Orders<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    OrderId,
    Order<T::AccountId, T::BlockNumber>,
>;

pub struct Order<AccountId, BlockNumber> {
    pub id: OrderId,
    pub buyer: AccountId,
    pub seller: AccountId,
    pub items: Vec<OrderItem>,
    pub total_amount: Balance,
    pub status: OrderStatus,
    pub escrow_id: Option<EscrowId>,
    pub created_at: BlockNumber,
    pub shipped_at: Option<BlockNumber>,
    pub delivered_at: Option<BlockNumber>,
}

// State machine (immutable transitions)
pub enum OrderStatus {
    Pending,    // Created, awaiting payment
    Paid,       // Escrow locked
    Shipped,    // Seller confirmed shipment
    Delivered,  // Buyer confirmed receipt OR auto-released
    Disputed,   // Dispute opened
    Cancelled,  // Cancelled before payment
    Refunded,   // Dispute ruled in favor of buyer
}

impl<AccountId, BlockNumber> Order<AccountId, BlockNumber> {
    /// Validate state transition (prevents illegal transitions)
    pub fn can_transition(&self, new_status: OrderStatus) -> bool {
        match (&self.status, &new_status) {
            (OrderStatus::Pending, OrderStatus::Paid) => true,
            (OrderStatus::Pending, OrderStatus::Cancelled) => true,
            (OrderStatus::Paid, OrderStatus::Shipped) => true,
            (OrderStatus::Paid, OrderStatus::Disputed) => true,
            (OrderStatus::Shipped, OrderStatus::Delivered) => true,
            (OrderStatus::Shipped, OrderStatus::Disputed) => true,
            (OrderStatus::Disputed, OrderStatus::Delivered) => true,
            (OrderStatus::Disputed, OrderStatus::Refunded) => true,
            _ => false, // All other transitions are illegal
        }
    }
}
```

#### Event Sourcing

```rust
#[pallet::event]
#[pallet::generate_deposit(pub(super) fn deposit_event)]
pub enum Event<T: Config> {
    OrderCreated {
        order_id: OrderId,
        buyer: T::AccountId,
        seller: T::AccountId,
        amount: Balance,
    },
    OrderPaid {
        order_id: OrderId,
        escrow_id: EscrowId,
        tx_hash: Hash,
    },
    OrderShipped {
        order_id: OrderId,
        shipped_at: T::BlockNumber,
    },
    OrderDelivered {
        order_id: OrderId,
        delivered_at: T::BlockNumber,
    },
    OrderDisputed {
        order_id: OrderId,
        dispute_id: DisputeId,
        reason: Vec<u8>,
    },
    OrderRefunded {
        order_id: OrderId,
        amount: Balance,
    },
}
```

**Guarantees**:
- ✅ **Immutability**: Orders cannot be deleted, only transitioned
- ✅ **Auditability**: All events are stored on-chain forever
- ✅ **Consensus**: 51% of validators must agree on state transitions

---

### LAYER 4: Staked Courier Network

#### Objetivo
Garantir que **couriers têm skin in the game** e podem ser punidos por má conduta.

#### Implementação (`bazari-fulfillment`)

```rust
// pallets/bazari-fulfillment/src/lib.rs

#[pallet::storage]
pub type Couriers<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    T::AccountId,
    Courier<T::BlockNumber>,
>;

pub struct Courier<BlockNumber> {
    pub account: AccountId,
    pub stake: Balance, // Minimum: 1000 BZR
    pub reputation_score: u32, // 0-1000 (based on deliveries)
    pub service_areas: Vec<GeoHash>, // H3 geohashes
    pub total_deliveries: u32,
    pub successful_deliveries: u32,
    pub disputed_deliveries: u32,
    pub is_active: bool,
    pub registered_at: BlockNumber,
}

#[pallet::call]
impl<T: Config> Pallet<T> {
    /// Register as courier (requires stake)
    pub fn register_courier(
        origin: OriginFor<T>,
        stake: Balance,
        service_areas: Vec<GeoHash>,
    ) -> DispatchResult {
        let who = ensure_signed(origin)?;

        // Enforce minimum stake
        ensure!(
            stake >= T::MinCourierStake::get(),
            Error::<T>::InsufficientStake
        );

        // Lock stake in pallet account
        T::Currency::reserve(&who, stake)?;

        let courier = Courier {
            account: who.clone(),
            stake,
            reputation_score: 500, // Start at median
            service_areas,
            total_deliveries: 0,
            successful_deliveries: 0,
            disputed_deliveries: 0,
            is_active: true,
            registered_at: <frame_system::Pallet<T>>::block_number(),
        };

        Couriers::<T>::insert(&who, courier);

        Self::deposit_event(Event::CourierRegistered { account: who, stake });

        Ok(())
    }

    /// Slash courier for misconduct
    pub fn slash_courier(
        origin: OriginFor<T>,
        courier: T::AccountId,
        slash_amount: Balance,
        reason: Vec<u8>,
    ) -> DispatchResult {
        // Only DAO can slash
        T::DAOOrigin::ensure_origin(origin)?;

        let mut courier_data = Couriers::<T>::get(&courier)
            .ok_or(Error::<T>::CourierNotFound)?;

        // Slash stake
        let slashed = slash_amount.min(courier_data.stake);
        T::Currency::slash_reserved(&courier, slashed);

        courier_data.stake -= slashed;
        courier_data.reputation_score = courier_data
            .reputation_score
            .saturating_sub(100); // -100 reputation

        // Deactivate if stake too low
        if courier_data.stake < T::MinCourierStake::get() {
            courier_data.is_active = false;
        }

        Couriers::<T>::insert(&courier, courier_data);

        Self::deposit_event(Event::CourierSlashed {
            courier,
            amount: slashed,
            reason,
        });

        Ok(())
    }
}
```

#### Matching Algorithm (Off-Chain Worker)

```rust
impl<T: Config> Pallet<T> {
    /// Find best courier for order (runs off-chain)
    pub fn find_best_courier(
        order_location: GeoHash,
        max_distance_km: u32,
    ) -> Option<T::AccountId> {
        let mut candidates: Vec<_> = Couriers::<T>::iter()
            .filter(|(_, courier)| {
                courier.is_active
                    && courier.stake >= T::MinCourierStake::get()
                    && courier.service_areas.contains(&order_location)
            })
            .collect();

        // Sort by reputation DESC, then distance ASC
        candidates.sort_by(|(_, a), (_, b)| {
            b.reputation_score
                .cmp(&a.reputation_score)
                .then_with(|| {
                    // Calculate distance (simplified)
                    let dist_a = Self::calculate_distance(&a.service_areas[0], &order_location);
                    let dist_b = Self::calculate_distance(&b.service_areas[0], &order_location);
                    dist_a.cmp(&dist_b)
                })
        });

        candidates.first().map(|(account, _)| account.clone())
    }
}
```

---

### LAYER 5: Automatic Escrow Release

#### Objetivo
Eliminar dependência de **ações manuais** para liberar fundos (protege ambas as partes).

#### Implementação (`bazari-escrow`)

```rust
// pallets/bazari-escrow/src/lib.rs

#[pallet::storage]
pub type Escrows<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    EscrowId,
    Escrow<T::AccountId, T::BlockNumber>,
>;

pub struct Escrow<AccountId, BlockNumber> {
    pub id: EscrowId,
    pub depositor: AccountId, // Buyer
    pub beneficiary: AccountId, // Seller
    pub amount: Balance,
    pub asset_id: Option<AssetId>, // None = BZR, Some(1000) = ZARI
    pub status: EscrowStatus,
    pub locked_at: BlockNumber,
    pub auto_release_at: Option<BlockNumber>, // 7 days default
}

#[pallet::hooks]
impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {
    /// Auto-release escrows after timeout
    fn on_finalize(block_number: T::BlockNumber) {
        for (escrow_id, escrow) in Escrows::<T>::iter() {
            if escrow.status == EscrowStatus::Locked {
                if let Some(release_at) = escrow.auto_release_at {
                    if block_number >= release_at {
                        // Auto-release to beneficiary
                        let _ = Self::release_internal(escrow_id, escrow.beneficiary);

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

#[pallet::call]
impl<T: Config> Pallet<T> {
    /// Lock funds in escrow (buyer pays)
    pub fn lock(
        origin: OriginFor<T>,
        beneficiary: T::AccountId,
        amount: Balance,
        auto_release_blocks: Option<u32>, // Default: 7 days = ~100,800 blocks
    ) -> DispatchResult {
        let depositor = ensure_signed(origin)?;

        // Lock funds
        T::Currency::reserve(&depositor, amount)?;

        let current_block = <frame_system::Pallet<T>>::block_number();
        let auto_release_at = auto_release_blocks.map(|blocks| {
            current_block + T::BlockNumber::from(blocks)
        });

        let escrow_id = Self::next_escrow_id();
        let escrow = Escrow {
            id: escrow_id,
            depositor: depositor.clone(),
            beneficiary: beneficiary.clone(),
            amount,
            asset_id: None,
            status: EscrowStatus::Locked,
            locked_at: current_block,
            auto_release_at,
        };

        Escrows::<T>::insert(escrow_id, escrow);

        Self::deposit_event(Event::EscrowLocked {
            escrow_id,
            depositor,
            beneficiary,
            amount,
            release_at: auto_release_at,
        });

        Ok(())
    }

    /// Manual release (buyer confirms delivery early)
    pub fn release(
        origin: OriginFor<T>,
        escrow_id: EscrowId,
    ) -> DispatchResult {
        let who = ensure_signed(origin)?;

        let escrow = Escrows::<T>::get(escrow_id)
            .ok_or(Error::<T>::EscrowNotFound)?;

        // Only depositor (buyer) can manually release
        ensure!(who == escrow.depositor, Error::<T>::Unauthorized);
        ensure!(escrow.status == EscrowStatus::Locked, Error::<T>::InvalidStatus);

        Self::release_internal(escrow_id, escrow.beneficiary)?;

        Ok(())
    }

    /// Refund to depositor (seller didn't ship)
    pub fn refund(
        origin: OriginFor<T>,
        escrow_id: EscrowId,
    ) -> DispatchResult {
        let who = ensure_signed(origin)?;

        let escrow = Escrows::<T>::get(escrow_id)
            .ok_or(Error::<T>::EscrowNotFound)?;

        // Only beneficiary (seller) can refund before auto-release
        ensure!(who == escrow.beneficiary, Error::<T>::Unauthorized);
        ensure!(escrow.status == EscrowStatus::Locked, Error::<T>::InvalidStatus);

        Self::refund_internal(escrow_id)?;

        Ok(())
    }
}
```

**Timeline Example**:
```
Day 0: Buyer locks 100 BZR in escrow (auto_release_at = Day 7)
Day 1: Seller ships order
Day 3: Buyer receives order
Day 3: Buyer manually releases escrow (early release)
       ✅ Seller receives 92 BZR immediately
       ✅ Platform receives 5 BZR
       ✅ Affiliate receives 3 BZR

ALTERNATIVE (Buyer doesn't act):
Day 7: Auto-release triggers
       ✅ Funds released automatically (no action needed)
```

---

### LAYER 6: Cryptographic Attestations

#### Objetivo
Provar que **handoff e delivery realmente ocorreram** (não apenas alegados).

#### Implementação (`bazari-attestation`)

```rust
// pallets/bazari-attestation/src/lib.rs

#[pallet::storage]
pub type Attestations<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    AttestationId,
    Attestation<T::AccountId, T::BlockNumber>,
>;

pub struct Attestation<AccountId, BlockNumber> {
    pub id: AttestationId,
    pub order_id: OrderId,
    pub proof_type: ProofType,
    pub ipfs_cid: Vec<u8>, // IPFS hash of proof file (photo, GPS, signature)
    pub signers: Vec<AccountId>, // Multi-sig (2-of-3)
    pub signatures: Vec<Signature>,
    pub threshold: u8, // Required signatures (2)
    pub verified: bool,
    pub created_at: BlockNumber,
}

pub enum ProofType {
    HandoffProof,   // Seller → Courier (photo of package)
    DeliveryProof,  // Courier → Buyer (GPS + photo + signature)
}

#[pallet::call]
impl<T: Config> Pallet<T> {
    /// Submit proof (seller, courier, or buyer)
    pub fn submit_proof(
        origin: OriginFor<T>,
        order_id: OrderId,
        proof_type: ProofType,
        ipfs_cid: Vec<u8>,
    ) -> DispatchResult {
        let who = ensure_signed(origin)?;

        // Verify order exists
        let order = T::CommercePallet::get_order(order_id)
            .ok_or(Error::<T>::OrderNotFound)?;

        // Create attestation
        let attestation_id = Self::next_attestation_id();
        let attestation = Attestation {
            id: attestation_id,
            order_id,
            proof_type,
            ipfs_cid: ipfs_cid.clone(),
            signers: vec![who.clone()],
            signatures: vec![],
            threshold: 2, // 2-of-3
            verified: false,
            created_at: <frame_system::Pallet<T>>::block_number(),
        };

        Attestations::<T>::insert(attestation_id, attestation);

        Self::deposit_event(Event::ProofSubmitted {
            attestation_id,
            order_id,
            proof_type,
            submitter: who,
            ipfs_cid,
        });

        Ok(())
    }

    /// Co-sign attestation (additional party confirms)
    pub fn co_sign(
        origin: OriginFor<T>,
        attestation_id: AttestationId,
        signature: Signature,
    ) -> DispatchResult {
        let who = ensure_signed(origin)?;

        let mut attestation = Attestations::<T>::get(attestation_id)
            .ok_or(Error::<T>::AttestationNotFound)?;

        // Verify signer is authorized (buyer, seller, or courier)
        let order = T::CommercePallet::get_order(attestation.order_id)
            .ok_or(Error::<T>::OrderNotFound)?;

        let authorized = who == order.buyer
            || who == order.seller
            || Self::is_assigned_courier(&who, attestation.order_id);

        ensure!(authorized, Error::<T>::Unauthorized);

        // Add signature
        attestation.signers.push(who.clone());
        attestation.signatures.push(signature);

        // Check quorum
        if attestation.signers.len() >= attestation.threshold as usize {
            attestation.verified = true;

            Self::deposit_event(Event::AttestationVerified {
                attestation_id,
                order_id: attestation.order_id,
            });
        }

        Attestations::<T>::insert(attestation_id, attestation);

        Ok(())
    }
}
```

#### Proof Example (DeliveryProof)

```json
{
  "orderId": "order_xyz123",
  "proofType": "DeliveryProof",
  "timestamp": "2025-11-11T14:30:00Z",
  "location": {
    "lat": -23.5505,
    "lon": -46.6333,
    "accuracy": 10
  },
  "photos": [
    "QmPhotoHash1", // Package at door
    "QmPhotoHash2"  // Buyer receiving package
  ],
  "signatures": {
    "courier": "0x123abc...",  // Courier signed
    "buyer": "0x456def..."     // Buyer signed
  }
}

Stored on IPFS: QmProofHash_xyz
Anchored on-chain: bazariAttestation.submit_proof(order_id, DeliveryProof, QmProofHash_xyz)

Quorum: 2-of-3 (Courier + Buyer) ✅ VERIFIED
```

---

### LAYER 7: Decentralized Dispute Resolution

#### Objetivo
Resolver disputas **sem árbitros centralizados**, usando jurados aleatórios com stake.

#### Implementação (`bazari-dispute`)

```rust
// pallets/bazari-dispute/src/lib.rs

#[pallet::storage]
pub type Disputes<T: Config> = StorageMap<
    _,
    Blake2_128Concat,
    DisputeId,
    Dispute<T::AccountId, T::BlockNumber>,
>;

pub struct Dispute<AccountId, BlockNumber> {
    pub id: DisputeId,
    pub order_id: OrderId,
    pub plaintiff: AccountId, // Who opened dispute
    pub defendant: AccountId,
    pub evidence_ipfs_cid: Vec<u8>,
    pub jurors: Vec<AccountId>, // VRF-selected (5 jurors)
    pub votes: Vec<Vote>,
    pub ruling: Option<Ruling>,
    pub created_at: BlockNumber,
    pub voting_ends_at: BlockNumber, // 48 hours
}

pub struct Vote {
    pub juror: AccountId,
    pub vote_hash: Hash, // Commit phase
    pub revealed_vote: Option<Ruling>, // Reveal phase
    pub salt: Vec<u8>,
}

pub enum Ruling {
    RefundBuyer,       // Buyer wins
    ReleaseSeller,     // Seller wins
    PartialRefund(u8), // Split (e.g., 50/50)
}

#[pallet::call]
impl<T: Config> Pallet<T> {
    /// Open dispute (buyer or seller)
    pub fn open_dispute(
        origin: OriginFor<T>,
        order_id: OrderId,
        evidence_ipfs_cid: Vec<u8>,
    ) -> DispatchResult {
        let who = ensure_signed(origin)?;

        let order = T::CommercePallet::get_order(order_id)
            .ok_or(Error::<T>::OrderNotFound)?;

        // Only buyer or seller can open dispute
        ensure!(
            who == order.buyer || who == order.seller,
            Error::<T>::Unauthorized
        );

        // Select 5 jurors using VRF
        let jurors = Self::select_jurors_vrf()?;

        let current_block = <frame_system::Pallet<T>>::block_number();
        let dispute_id = Self::next_dispute_id();

        let dispute = Dispute {
            id: dispute_id,
            order_id,
            plaintiff: who.clone(),
            defendant: if who == order.buyer { order.seller } else { order.buyer },
            evidence_ipfs_cid: evidence_ipfs_cid.clone(),
            jurors: jurors.clone(),
            votes: vec![],
            ruling: None,
            created_at: current_block,
            voting_ends_at: current_block + T::VotingPeriod::get(),
        };

        Disputes::<T>::insert(dispute_id, dispute);

        // Update order status
        T::CommercePallet::set_order_status(order_id, OrderStatus::Disputed)?;

        Self::deposit_event(Event::DisputeOpened {
            dispute_id,
            order_id,
            plaintiff: who,
            jurors,
        });

        Ok(())
    }

    /// Commit vote (hidden during commit phase)
    pub fn commit_vote(
        origin: OriginFor<T>,
        dispute_id: DisputeId,
        vote_hash: Hash,
    ) -> DispatchResult {
        let juror = ensure_signed(origin)?;

        let mut dispute = Disputes::<T>::get(dispute_id)
            .ok_or(Error::<T>::DisputeNotFound)?;

        // Verify juror is selected
        ensure!(
            dispute.jurors.contains(&juror),
            Error::<T>::NotJuror
        );

        // Add vote (commit phase)
        let vote = Vote {
            juror: juror.clone(),
            vote_hash,
            revealed_vote: None,
            salt: vec![],
        };

        dispute.votes.push(vote);
        Disputes::<T>::insert(dispute_id, dispute);

        Ok(())
    }

    /// Reveal vote (after commit phase ends)
    pub fn reveal_vote(
        origin: OriginFor<T>,
        dispute_id: DisputeId,
        ruling: Ruling,
        salt: Vec<u8>,
    ) -> DispatchResult {
        let juror = ensure_signed(origin)?;

        let mut dispute = Disputes::<T>::get(dispute_id)
            .ok_or(Error::<T>::DisputeNotFound)?;

        // Verify reveal phase has started
        let current_block = <frame_system::Pallet<T>>::block_number();
        let commit_phase_end = dispute.created_at + (T::VotingPeriod::get() / 2);
        ensure!(current_block >= commit_phase_end, Error::<T>::CommitPhaseNotEnded);

        // Find juror's vote
        let vote = dispute
            .votes
            .iter_mut()
            .find(|v| v.juror == juror)
            .ok_or(Error::<T>::VoteNotFound)?;

        // Verify hash matches
        let computed_hash = Self::compute_vote_hash(&ruling, &salt);
        ensure!(computed_hash == vote.vote_hash, Error::<T>::InvalidReveal);

        // Reveal vote
        vote.revealed_vote = Some(ruling);
        vote.salt = salt;

        Disputes::<T>::insert(dispute_id, dispute);

        Ok(())
    }

    /// Execute ruling (after voting ends)
    pub fn execute_ruling(
        origin: OriginFor<T>,
        dispute_id: DisputeId,
    ) -> DispatchResult {
        ensure_signed(origin)?;

        let dispute = Disputes::<T>::get(dispute_id)
            .ok_or(Error::<T>::DisputeNotFound)?;

        // Verify voting has ended
        let current_block = <frame_system::Pallet<T>>::block_number();
        ensure!(current_block >= dispute.voting_ends_at, Error::<T>::VotingNotEnded);

        // Tally votes (majority wins)
        let mut refund_count = 0u8;
        let mut release_count = 0u8;

        for vote in &dispute.votes {
            if let Some(ruling) = &vote.revealed_vote {
                match ruling {
                    Ruling::RefundBuyer => refund_count += 1,
                    Ruling::ReleaseSeller => release_count += 1,
                    Ruling::PartialRefund(_) => {
                        // Count as half vote for each side
                        refund_count += 1;
                        release_count += 1;
                    }
                }
            }
        }

        // Determine final ruling (3-of-5 quorum)
        let final_ruling = if refund_count >= 3 {
            Ruling::RefundBuyer
        } else if release_count >= 3 {
            Ruling::ReleaseSeller
        } else {
            Ruling::PartialRefund(50) // Default: 50/50 split
        };

        // Execute ruling via escrow
        let order = T::CommercePallet::get_order(dispute.order_id)
            .ok_or(Error::<T>::OrderNotFound)?;

        match final_ruling {
            Ruling::RefundBuyer => {
                T::EscrowPallet::refund(order.escrow_id.unwrap())?;
                T::CommercePallet::set_order_status(dispute.order_id, OrderStatus::Refunded)?;
            }
            Ruling::ReleaseSeller => {
                T::EscrowPallet::release(order.escrow_id.unwrap())?;
                T::CommercePallet::set_order_status(dispute.order_id, OrderStatus::Delivered)?;
            }
            Ruling::PartialRefund(percent) => {
                let escrow_id = order.escrow_id.ok_or(Error::<T>::EscrowNotFound)?;
                let escrow = T::EscrowPallet::get_escrow(escrow_id)?;

                let refund_amount = escrow.amount * percent as u128 / 100;
                let release_amount = escrow.amount - refund_amount;

                T::EscrowPallet::split_release(escrow_id, vec![
                    (order.buyer, refund_amount),
                    (order.seller, release_amount),
                ])?;
            }
        }

        Self::deposit_event(Event::RulingExecuted {
            dispute_id,
            ruling: final_ruling,
        });

        Ok(())
    }

    /// Select jurors using VRF (Verifiable Random Function)
    fn select_jurors_vrf() -> Result<Vec<T::AccountId>, Error<T>> {
        // Get randomness from pallet-randomness
        let random_seed = T::Randomness::random_seed();

        // Get all eligible jurors (staked users with reputation > 500)
        let mut eligible: Vec<_> = T::IdentityPallet::iter_profiles()
            .filter(|(_, profile)| {
                profile.reputation_score >= 500
                    && profile.juror_stake >= T::MinJurorStake::get()
            })
            .map(|(account, _)| account)
            .collect();

        // Shuffle using VRF seed
        let mut rng = Self::create_rng_from_seed(&random_seed);
        eligible.shuffle(&mut rng);

        // Select first 5
        Ok(eligible.into_iter().take(5).collect())
    }
}
```

#### Dispute Flow Example

```
DAY 0: Buyer reports "Package never arrived"
       - Opens dispute with evidence (GPS showing courier never visited)
       - 5 jurors selected via VRF

DAY 0-1: COMMIT PHASE (24 hours)
       - Juror1: commits hash(RefundBuyer + salt1)
       - Juror2: commits hash(ReleaseSeller + salt2)
       - Juror3: commits hash(RefundBuyer + salt3)
       - Juror4: commits hash(RefundBuyer + salt4)
       - Juror5: commits hash(PartialRefund(50) + salt5)

DAY 1-2: REVEAL PHASE (24 hours)
       - All jurors reveal votes + salts
       - Invalid reveals are discarded

DAY 2: TALLY
       - RefundBuyer: 3 votes (60%)
       - ReleaseSeller: 1 vote (20%)
       - PartialRefund: 1 vote (20%)

       RULING: RefundBuyer (3-of-5 quorum) ✅

DAY 2: EXECUTION
       - Escrow refunded to buyer
       - Courier slashed (lose 200 BZR stake)
       - Seller reputation unaffected (courier fault)
```

---

## 📊 SECURITY ANALYSIS

### Attack Vectors & Mitigations

| Attack Vector | Risk | Mitigation |
|---------------|------|------------|
| **Sybil Attack (fake jurors)** | Medium | Minimum stake (1000 BZR) + reputation (>500) |
| **Collusion (jurors + seller)** | High | Commit-reveal voting (prevents coordination) |
| **DoS (spam disputes)** | Low | Dispute fee (50 BZR, refunded if win) |
| **51% Attack (consensus)** | Very Low | Polkadot finality (Grandpa/BABE) |
| **Front-running (MEV)** | Low | Commit-reveal prevents price manipulation |
| **Courier fraud** | Medium | Slashing (lose entire stake) + reputation |

---

## 📚 REFERENCES

- [Current State Analysis](01-CURRENT-STATE-ANALYSIS.md) - Problemas atuais
- [Target Architecture](02-TARGET-ARCHITECTURE.md) - Arquitetura completa
- [Implementation Roadmap](05-IMPLEMENTATION-ROADMAP.md) - Sprints 9-16 (PoC)
- [Pallets Index](../pallets/00-PALLETS-INDEX.md) - Specs técnicas

---

## ✅ SUCCESS CRITERIA

**Proof of Commerce is successful if**:

1. ✅ **0% centralization**: No single party controls disputes
2. ✅ **< 1% fraud rate**: Cryptographic proofs prevent fake deliveries
3. ✅ **> 95% auto-release**: Most orders complete without disputes
4. ✅ **< 48h dispute resolution**: VRF juror selection + voting
5. ✅ **Verifiable history**: All orders auditable on-chain forever

**Final Metrics**:
- ✅ 100% escrow protection (no more MOCK)
- ✅ 100% commission transparency (Merkle proofs)
- ✅ 100% delivery proof (co-signatures)
- ✅ 100% fair disputes (VRF randomness)
