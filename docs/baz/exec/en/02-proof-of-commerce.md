## Table of Contents
1. [Protocol Overview](#1-protocol-overview)
2. [Fraud Problems Solved](#2-fraud-problems-solved)
3. [Entities and Roles](#3-entities-and-roles)
4. [Protocol Primitives](#4-protocol-primitives)
5. [Cryptographic Proofs and Anchors](#5-cryptographic-proofs-and-anchors)
6. [State Machine](#6-state-machine)
7. [Essential Flows](#7-essential-flows)
8. [Affiliate System](#8-affiliate-system)
9. [Reputation System](#9-reputation-system)
10. [Economy and Security](#10-economy-and-security)
11. [Protocol Invariants](#11-protocol-invariants)
12. [Detailed Practical Examples](#12-detailed-practical-examples)
13. [Dispute Module Hardening](#13-dispute-module-hardening)

---

## 1. Protocol Overview

### 1.1 Core Concept

**Proof of Commerce** replaces trust with mathematical proofs. Each order in the Bazari marketplace creates a **micro-consensus** among the involved parties:

- **Buyer**
- **Seller** (Merchant)
- **Courier** (Delivery agent)
- **Affiliates** (optional)

```
┌─────────────────────────────────────────────────────┐
│          ORDER = MICRO-CONSENSUS                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Buyer creates Order + deposits BZR in Escrow      │
│         ↓                                           │
│  Seller accepts                                     │
│         ↓                                           │
│  Courier assumes (deposits stake)                   │
│         ↓                                           │
│  HandoffProof: Seller + Courier co-sign            │
│         ↓                                           │
│  DeliveryProof: Courier + Buyer co-sign            │
│         ↓                                           │
│  PoCEngine validates QUORUM                         │
│         ↓                                           │
│  Automatic split:                                   │
│    • Seller receives product price                  │
│    • Courier receives shipping fee                  │
│    • Affiliates receive commissions                 │
│    • DAO receives fee                               │
│         ↓                                           │
│  Reputations updated                                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 1.2 Minimum Quorum

The protocol requires **co-signed attestations** at critical stages:

| Stage | Required Signatories | Proof Generated |
|-------|---------------------|-----------------|
| `ORDER_CREATED` | Buyer (implicit via escrow) | On-chain transaction |
| `HANDOFF` | Seller + Courier | HandoffProof |
| `DELIVERED` | Courier + Buyer | DeliveryProof |

**Fundamental Rule**: Without the minimum quorum of valid attestations, there is no settlement. The escrow remains locked or the case goes to dispute.

### 1.3 Radical Decentralization

- **No central authority** to approve/deny orders
- **No fund custody** by company (only smart contracts)
- **No arbitrary decisions** — only deterministic execution of rules
- **Disputes** are resolved by decentralized jury (jurors with stake) selected by verifiable randomness (VRF)

---

## 2. Fraud Problems Solved

The PoC was designed to neutralize **all common fraud vectors** in marketplaces. Below, each fraud is mapped with:
- Real scenario
- PoC defense
- Technical mechanism
- Economic effect

---

### 2.1 Fraud: "Product Not Received" (Buyer Fraud)

#### Real Scenario
Buyer receives the product but claims it didn't arrive, attempting refund or social chargeback.

#### PoC Defense

**Required Proof**: `DeliveryProof` co-signed by **Courier + Buyer**

```json
{
  "order_id": "0x1a2b3c...",
  "step": "DELIVERED",
  "timestamp": "2025-10-28T14:32:00Z",
  "geo": {"lat": -23.5505, "lon": -46.6333, "accuracy": 10},
  "media_cid": "QmXyz...",  // IPFS: delivery photo
  "signature_method": "photo_capture_with_recipient",
  "observation": "Delivered to resident, digitally signed",
  "signers": [
    {"account_id": "5Courier...", "signature": "0xabc..."},
    {"account_id": "5Buyer...", "signature": "0xdef..."}
  ]
}
```

**On-Chain Anchor**: Only the `payload_hash` (Blake2-256 of the JSON above) is recorded on the blockchain.

**Mechanism**:
1. Without the Buyer's signature, the order doesn't finalize automatically
2. If the Buyer signs at delivery time, any subsequent claim of "non-receipt" is weak counter-evidence
3. Jury can compare timestamp, geo, and media in case of dispute

#### Economic Effect
- **Social chargeback eliminated**: Cryptographic proof > word against word
- **Fraud cost**: If Buyer opens unfounded dispute, loses reputation and may have stake required in future purchases

---

### 2.2 Fraud: "I Delivered, But Customer Doesn't Confirm" (Courier/Seller Fraud)

#### Real Scenario
Merchant or courier claims delivery without recipient's confirmation, attempting to release payment unilaterally.

#### PoC Defense

**Finalization Requires**: `DELIVERED = Courier + Buyer`

**Mechanism**:
- Without Buyer's co-signature, the escrow **is not released**
- If Buyer is absent and Courier delivers to third party (e.g., doorman), must record:
  - Photo of recipient
  - Digital signature or face capture
  - Observation in payload: "left with doorman - photo attached"
  - This is anchored via hash

**Exception**: Timeout + photographic evidence can trigger automatic dispute for jury evaluation

#### Economic Effect
- **Unilateral release prevented**: Courier cannot "fake delivery" alone
- **Incentive for best practices**: Courier has interest in capturing robust proofs to avoid disputes

---

### 2.3 Fraud: "Wrong/Defective Product" (Seller Quality Fraud)

#### Real Scenario
- Item switched (sent sandals instead of sneakers)
- Broken seal
- Hidden defect

#### PoC Defense

**Two Cross-Proofs**:

1. **HandoffProof** (Seller + Courier) — captures **package state at pickup**
   - Seal photo
   - Visible serial number
   - Weight/dimensions

2. **DeliveryProof** (Courier + Buyer) — captures **state at receipt**
   - Photo of received package
   - Seal condition
   - Receipt signature

**Responsibility Attribution Mechanism**:

```
HandoffProof shows: seal INTACT, correct product
DeliveryProof shows: seal BROKEN, different product
        ↓
Responsibility: COURIER (damage in transit)
        ↓
Slashing of Courier's stake
Compensation to Buyer
Seller receives payment
```

```
HandoffProof shows: seal BROKEN
        ↓
Responsibility: SELLER (product left wrong)
        ↓
Escrow returns to Buyer
Slashing of Seller's reputation
```

#### Economic Effect
- **Complete traceability**: Divergences between proofs identify exactly where the problem occurred
- **Objective accountability**: Jury has timestamped and immutable evidence

---

### 2.4 Fraud: "Intermediary Scam" (Man-in-the-Middle Social)

#### Real Scenario
Someone impersonates legitimate merchant or courier and tries to capture payment outside the app (e.g., "pay me via PIX, it's faster").

#### PoC Defense

**Payment Recognized ONLY if**:
- On-chain escrow in BZR
- Role identities are verified on-chain accounts
- Split only occurs with valid attestations with signatures from registered accounts

**Identities May Have**:
- DID (Decentralized Identifier)
- Verifiable Credentials issued by communities (e.g., "Courier verified by Cooperative X")
- Public reputation (PoC Score visible)

#### Economic Effect
- **Transactions outside protocol don't release funds**
- **Scammer cannot forge signatures** (private keys of legitimate accounts)
- **Educated users**: "Payment only counts if through the app"

---

### 2.5 Fraud: "Affiliate Spam" (Affiliate Inflation)

#### Real Scenario
Artificial sharing chain to inflate commissions (e.g., 30 fake accounts in series to capture more % of commission).

#### PoC Defense

**Mechanism: Merkle Proof + Campaign DAG**

1. Seller creates campaign with parameters:
   - Total commission rate (e.g., 5%)
   - Hops cap (maximum 5 levels)
   - Decay per level (e.g., 50% of previous)

2. Each share generates node in DAG; DAG root is published on-chain

3. Order includes `AffiliatePath` (Merkle proof of complete path)

4. `finalize()` validates:
   ```
   - Is Merkle proof valid against published root?
   - Hops <= configured cap?
   - Does each affiliate have minimum stake/reputation?
   - No loops (same account_id repeated)?
   ```

5. If valid, split traverses the path and distributes commissions with decay

#### Economic Effect
- **Only pre-announced paths** (published root) receive commission
- **Spam disincentivized**: Requires minimum stake per affiliate; fraud burns stake
- **Transparency**: Anyone can audit paths via Merkle proof

---

### 2.6 Fraud: "Collusion Between Parties"

#### Real Scenario
- Buyer + Seller coordinate to create fake orders to drain incentives/airdrops
- Buyer + Courier attempt to harm Seller (claim non-receipt while being accomplices)

#### PoC Defense

**Cross Mechanisms**:

1. **Multiple Cross Co-Signatures**
   - Handoff: Seller + Courier
   - Delivery: Courier + Buyer
   - No pair can finalize alone

2. **Stake & Slashing**
   - Courier deposits stake (e.g., 10-30% of order value)
   - Seller may have optional stake for high value
   - Proven fraud = stake loss

3. **Reputation by Role**
   - SellerScore, CourierScore, BuyerScore are independent
   - Suspicious patterns (same accounts always working together + high dispute rate) can trigger audit

4. **Random Sampling (Phase 2)**
   - High-value orders may have audit by jurors even without open dispute
   - VRF selection (unpredictable)

#### Economic Effect
- **Fraud cost > expected gain**
   - Lost stake + destroyed reputation + temporary ban
- **Recurring fraud**:
   - Progressive increase in required stake
   - Maximum value limitation per order for low-reputation accounts

---

## 3. Entities and Roles

### 3.1 Main Participants

| Role | Description | Responsibilities | Incentives |
|------|-------------|------------------|------------|
| **Buyer** | End customer | • Create Order<br>• Deposit escrow<br>• Co-sign DeliveryProof | • Receive product<br>• Reputation for future purchases |
| **Seller** | Merchant | • Accept Order<br>• Co-sign HandoffProof<br>• Deliver product to Courier | • Receive instant payment<br>• Build reputation |
| **Courier** | Delivery agent | • Deposit stake<br>• Co-sign Handoff and Delivery<br>• Transport product | • Receive shipping fee<br>• Build PoC Score<br>• Stake returned |
| **Affiliate** | Referrer/Influencer | • Share product<br>• Generate conversions | • Commission per sale<br>• Conversion reputation |

### 3.2 Governance Entities

| Role | Function | Selection |
|------|----------|-----------|
| **Juror** | Resolves disputes | VRF (random) among stakers |
| **Arbiter** | Same as Juror | (interchangeable terms) |
| **BazariDAO** | Governs protocol parameters | Token holders (BZR) |

**Important**: DAO **does not decide individual orders**. Only defines:
- % of fees
- Timeouts
- Minimum stakes
- Fund destinations (Treasury, incentives)

---

## 4. Protocol Primitives

### 4.1 Core Pallets (Phase 1)

The protocol is implemented as modules (pallets) in Substrate:

#### `pallet-order`
- **Function**: Manages order lifecycle
- **Storage**:
  - `Orders<OrderId, OrderData>`: current state, involved parties, values
  - `OrderHistory<OrderId, Vec<StateTransition>>`: change log
- **Extrinsics**:
  - `create_order(product, quantity, price, escrow_amount)`
  - `accept_order(order_id)`
  - `cancel_order(order_id, reason)`

#### `pallet-escrow`
- **Function**: Holds BZR until order completion
- **Storage**:
  - `Locks<OrderId, Balance>`: locked funds
  - `Releases<OrderId, Vec<(AccountId, Balance)>>`: pending recipients
- **Extrinsics**:
  - `deposit(order_id, amount)` — Buyer locks funds
  - `release(order_id)` — automatic split after finalize
  - `slash(order_id, account_id, amount)` — penalty

#### `pallet-attestation`
- **Function**: Anchors proofs (hashes) and validates signatories
- **Storage**:
  - `Attestations<OrderId, Step, AttestationData>`
    ```rust
    struct AttestationData {
        payload_hash: H256,
        signers: Vec<(AccountId, Signature)>,
        timestamp: BlockNumber,
        metadata: BoundedVec<u8>  // optional: geo, IPFS CIDs
    }
    ```
- **Extrinsics**:
  - `submit_attestation(order_id, step, payload_hash, signatures)`

#### `pallet-fulfillment`
- **Function**: Courier matching + stake management
- **Storage**:
  - `Couriers<AccountId, CourierProfile>`
  - `CourierStakes<OrderId, (AccountId, Balance)>`
  - `LogisticStatus<OrderId, FulfillmentState>`
- **Extrinsics**:
  - `apply_as_courier(order_id)`
  - `assign_courier(order_id, courier_account)` — Seller chooses
  - `deposit_stake(order_id, amount)`

#### `pallet-affiliate`
- **Function**: Commission DAG + Merkle proofs
- **Storage**:
  - `Campaigns<CampaignId, CampaignConfig>`
  - `AffiliateRoots<CampaignId, MerkleRoot>`
  - `AffiliatePayouts<OrderId, Vec<(AccountId, Balance)>>`
- **Extrinsics**:
  - `create_campaign(rate, max_hops, decay)`
  - `submit_affiliate_path(order_id, merkle_proof)`

#### `pallet-fee`
- **Function**: Fee calculation and destination
- **Storage**:
  - `FeeConfig`: % for DAO, Treasury, incentive pools
- **Extrinsics**:
  - `set_fee_config(new_config)` — DAO governance

---

### 4.2 Robustness Pallets (Phase 1.2)

#### `pallet-reputation`
- **Function**: Role-based scoring with temporal decay
- **Storage**:
  - `SellerScores<AccountId, Score>`
  - `CourierScores<AccountId, Score>`
  - `BuyerScores<AccountId, Score>`
  - `AffiliateScores<AccountId, Score>`
- **Inputs**:
  - Completions without dispute (+)
  - SLAs met (+)
  - Lost disputes (-)
  - Slashes (---)
- **Outputs**:
  - Score 0-1000
  - Dynamic gates (max value per order, required stake)

#### `pallet-dispute`
- **Function**: Dispute management + jury
- **Storage**:
  - `Disputes<OrderId, DisputeData>`
    ```rust
    struct DisputeData {
        opened_by: AccountId,
        opened_at: BlockNumber,
        jurors: Vec<AccountId>,
        votes: Vec<(AccountId, Vote, Justification)>,
        ruling: Option<Ruling>,
    }
    ```
  - `JurorPool<Vec<AccountId>>`: eligible stakers
- **Extrinsics**:
  - `open_dispute(order_id, reason, evidence_cids)`
  - `vote_on_dispute(order_id, vote, justification_hash)`
  - `finalize_dispute(order_id)` — applies ruling

---

### 4.3 Canonical Steps

```rust
enum OrderStep {
    ORDER_CREATED,
    ACCEPTED,
    HANDOFF_SELLER_TO_COURIER,
    IN_TRANSIT,
    DELIVERED_COURIER_TO_BUYER,
    FINALIZED,
    RETURNED,
    CANCELLED,
    DISPUTE_OPENED,
    RULING_APPLIED,
}
```

---

## 5. Cryptographic Proofs and Anchors

### 5.1 Co-Signed Receipts (Off-Chain)

**JSON Format** (HandoffProof example):

```json
{
  "order_id": "0x1a2b3c4d5e6f...",
  "step": "HANDOFF_SELLER_TO_COURIER",
  "timestamp": "2025-10-28T10:15:00Z",
  "geo": {
    "lat": -23.5505,
    "lon": -46.6333,
    "accuracy_meters": 5
  },
  "media": [
    {
      "type": "photo",
      "cid": "QmAbC123...",
      "description": "Sealed package with visible label"
    }
  ],
  "product_condition": {
    "seal": "intact",
    "weight_kg": 1.2,
    "dimensions_cm": [30, 20, 10]
  },
  "observation": "Product verified, seal OK",
  "signers": [
    {
      "role": "Seller",
      "account_id": "5Seller123...",
      "signature": "0xabc123def456...",
      "signature_method": "sr25519"
    },
    {
      "role": "Courier",
      "account_id": "5Courier456...",
      "signature": "0xdef789ghi012...",
      "signature_method": "sr25519"
    }
  ],
  "device_attestation": {
    "platform": "iOS",
    "integrity_token": "eyJhbGc...",
    "app_version": "1.2.3"
  }
}
```

### 5.2 On-Chain Anchor

Only the **payload_hash** (Blake2-256 of the JSON above) is recorded on the blockchain:

```rust
pallet_attestation::Attestations::insert(
    order_id,
    OrderStep::HANDOFF_SELLER_TO_COURIER,
    AttestationData {
        payload_hash: blake2_256(&json_bytes),
        signers: vec![
            (seller_account, signature_seller),
            (courier_account, signature_courier),
        ],
        timestamp: current_block,
        metadata: Some(b"ipfs:QmAbC123..."),
    }
);
```

### 5.3 Privacy and Verifiability

**Off-Chain Data** (IPFS or community storage):
- Media (photos, videos)
- PII (full addresses, names)
- Detailed metadata

**On-Chain Data**:
- Hashes (immutable)
- Signatures (verifiable)
- Timestamps (temporal order)

**Benefit**:
- ✅ Verifiability: Anyone can recompute hash and check signature
- ✅ Privacy: Sensitive data doesn't leak on public blockchain
- ✅ Efficiency: Blockchain doesn't get overloaded with GBs of photos

**Phase 3 (ZK-PoD)**:
- Zero-knowledge proof that delivery occurred in authorized region **without revealing exact coordinates**

---

## 6. State Machine

### 6.1 Simplified Diagram

```
┌──────────────┐
│   CREATED    │ ← Buyer creates Order + Escrow
└──────┬───────┘
       │ Seller accepts
       ↓
┌──────────────┐
│   ACCEPTED   │ ← Courier applies + deposits stake
└──────┬───────┘
       │ HandoffProof (Seller+Courier)
       ↓
┌──────────────┐
│  IN_TRANSIT  │
└──────┬───────┘
       │ DeliveryProof (Courier+Buyer)
       ↓
┌──────────────┐
│  DELIVERED   │
└──────┬───────┘
       │ PoCEngine validates quorum
       ↓
┌──────────────┐
│  FINALIZED   │ ← Split, reputations ↑, events
└──────────────┘

       (any failure)
            ↓
┌──────────────┐
│   DISPUTE    │ → Jurors → RULING → application
└──────────────┘
```

### 6.2 Transition Conditions

| From | To | Condition | On-Chain Action |
|------|-----|----------|-----------------|
| `CREATED` | `ACCEPTED` | Seller calls `accept_order` | Updates `Order.seller_accepted = true` |
| `ACCEPTED` | `HANDOFF` | Courier selected + stake deposited | `CourierStakes.insert(order, (courier, stake))` |
| `HANDOFF` | `IN_TRANSIT` | `submit_attestation(HANDOFF)` with Seller+Courier | Validates signers, anchors hash |
| `IN_TRANSIT` | `DELIVERED` | `submit_attestation(DELIVERED)` with Courier+Buyer | Validates signers, anchors hash |
| `DELIVERED` | `FINALIZED` | `finalize(order_id)` + valid quorum | Split escrow, return stake, update rep |
| `*` | `DISPUTE` | Timeout OR conflicting signatures OR party calls `open_dispute` | Creates `Dispute`, selects jurors |
| `DISPUTE` | `RULING_APPLIED` | Jurors vote + `finalize_dispute` | Applies ruling (release/refund + slashing) |

---

## 7. Essential Flows

### 7.1 Happy Path (Purchase → Delivery → Settlement)

**Step by Step**:

1. **Buyer Creates Order**
   ```rust
   Order::create_order(
       origin = Buyer,
       product_id,
       quantity,
       price = 100 BZR,
       escrow_amount = 100 BZR
   )
   ```
   - Escrow locks 100 BZR from Buyer's account
   - Event: `OrderCreated(order_id, buyer, seller, amount)`

2. **Seller Accepts**
   ```rust
   Order::accept_order(origin = Seller, order_id)
   ```
   - `Order.status = ACCEPTED`
   - Notification to available couriers

3. **Courier Applies and Deposits Stake**
   ```rust
   Fulfillment::apply_as_courier(origin = Courier, order_id)
   Fulfillment::deposit_stake(origin = Courier, order_id, stake = 20 BZR)
   ```
   - Seller chooses Courier (or system auto-assigns by reputation)
   - `CourierStakes.insert(order, (courier, 20 BZR))`

4. **Handoff: Seller Delivers to Courier**
   - BazChat opens co-signature screen
   - Seller and Courier take package photo
   - App generates JSON, both sign
   - App calls:
   ```rust
   Attestation::submit_attestation(
       origin = Either(Seller or Courier),
       order_id,
       step = HANDOFF,
       payload_hash,
       signatures = [(Seller, sig1), (Courier, sig2)]
   )
   ```
   - On-chain validation: correct signers? valid hash?
   - `Order.status = IN_TRANSIT`

5. **Delivery: Courier Delivers to Buyer**
   - BazChat opens co-signature screen
   - Courier and Buyer take photo/receipt signature
   - App generates JSON, both sign
   - App calls:
   ```rust
   Attestation::submit_attestation(
       origin = Either(Courier or Buyer),
       order_id,
       step = DELIVERED,
       payload_hash,
       signatures = [(Courier, sig1), (Buyer, sig2)]
   )
   ```
   - `Order.status = DELIVERED`

6. **Automatic Finalization**
   ```rust
   PoCEngine::finalize(order_id)
   ```
   - Validates that exists:
     - `ORDER_CREATED` (implicit)
     - `HANDOFF` with Seller+Courier
     - `DELIVERED` with Courier+Buyer
   - If valid:
     - Split escrow:
       - Seller: 100 BZR (product price)
       - Courier: 15 BZR (shipping)
       - Affiliates: 5 BZR (5% commission)
       - DAO: 2 BZR (2% fee)
     - Return Courier's stake (20 BZR)
     - Update reputations:
       - `SellerScore += 10`
       - `CourierScore += 10`
       - `BuyerScore += 1` (didn't no-show)
   - Event: `OrderFinalized(order_id, splits)`

**Total Time**: Seconds (2-block Substrate confirmation, ~12s)

---

### 7.2 Dispute Flow

**Trigger**: Any of the conditions:
- Timeout without attestation (e.g., 7 days without DELIVERED)
- Conflicting signatures
- Party explicitly calls `open_dispute`

**Step by Step**:

1. **Opening**
   ```rust
   Dispute::open_dispute(
       origin = Buyer | Seller | Courier,
       order_id,
       reason = "Product damaged",
       evidence_cids = ["QmEvidence1", "QmEvidence2"]
   )
   ```
   - `Order.status = DISPUTE_OPENED`
   - Event: `DisputeOpened(order_id, opener, reason)`

2. **Juror Selection (Phase 2: VRF)**
   ```rust
   // VRF generates verifiable randomness
   let random_seed = VRF::get_randomness(block_number, order_id);
   let jurors = JurorPool::select_random(7, random_seed);

   Dispute::assign_jurors(order_id, jurors)
   ```
   - Jurors are notified
   - Deadline for analysis: 48h

3. **Evidence Analysis**
   Jurors receive:
   - On-chain hashes of all attestations
   - IPFS CIDs of media
   - Order timeline
   - Pre-computed scorecards (Phase 3: AI assistive)

4. **Commit-Reveal Vote (anti-bribery)**
   - **Commit**: Juror sends vote hash
   ```rust
   Dispute::commit_vote(
       origin = Juror,
       order_id,
       vote_hash = blake2_256(vote || salt)
   )
   ```
   - **Reveal**: After all commit, reveals vote
   ```rust
   Dispute::reveal_vote(
       origin = Juror,
       order_id,
       vote = RefundBuyer,  // or ReleaseSeller
       salt,
       justification_hash
   )
   ```

5. **Ruling**
   ```rust
   Dispute::finalize_dispute(order_id)
   ```
   - Counts votes (simple majority or 2/3 supermajority)
   - Applies ruling:
     - **RefundBuyer**: Escrow returns to Buyer; Slashing of Seller/Courier if fault proven
     - **ReleaseSeller**: Normal split; Slashing of Buyer's reputation
     - **Partial**: Proportional split
   - Updates everyone's reputations (including jurors: were they right?)
   - Event: `DisputeResolved(order_id, ruling, slashes)`

**Total Time**: 2-7 days (depending on complexity)

---

## 8. Affiliate System

### 8.1 DAG + Merkle Trees Model

**Problem**: How to prove sharing chain without storing gigabytes on-chain?

**Solution**: Directed Acyclic Graph (DAG) off-chain + Merkle root on-chain

```
Campaign created by Seller:
  - Rate: 5%
  - Max hops: 5
  - Decay: 50% per level

Sharing DAG:
Seller (root)
  ├─ Affiliate1 (level 1, 2.5%)
  │   ├─ Affiliate2 (level 2, 1.25%)
  │   └─ Affiliate3 (level 2, 1.25%)
  └─ Affiliate4 (level 1, 2.5%)
      └─ Affiliate5 (level 2, 1.25%)

Merkle Root = Hash(all nodes and edges)
→ Published on-chain
```

### 8.2 Inclusion in Order

When Buyer purchases via Affiliate5's link:

```rust
Order::create_order_with_affiliate(
    ...
    affiliate_path = MerkleProof {
        campaign_id,
        path: [Affiliate1, Affiliate2, Affiliate5],
        proof: [hash1, hash2, hash3],  // necessary siblings
        root: 0xabc123...  // matches published
    }
)
```

### 8.3 Validation and Split

```rust
fn validate_and_split_affiliates(order: &Order) -> Result<Vec<(AccountId, Balance)>, Error> {
    let campaign = Campaigns::get(order.affiliate_path.campaign_id)?;

    // 1. Validate Merkle proof
    ensure!(
        verify_merkle_proof(
            order.affiliate_path.proof,
            order.affiliate_path.root,
            order.affiliate_path.path
        ),
        "Invalid Merkle proof"
    );

    // 2. Verify hops <= max
    ensure!(
        order.affiliate_path.path.len() <= campaign.max_hops,
        "Exceeded max hops"
    );

    // 3. Verify minimum stakes/reputation
    for affiliate in &order.affiliate_path.path {
        ensure!(
            AffiliateScores::get(affiliate) >= campaign.min_score,
            "Affiliate below min reputation"
        );
    }

    // 4. Calculate splits with decay
    let total_commission = order.amount * campaign.rate / 100;
    let mut payouts = Vec::new();
    let mut remaining = total_commission;

    for (level, affiliate) in order.affiliate_path.path.iter().enumerate() {
        let share = remaining * campaign.decay_per_level.pow(level);
        payouts.push((affiliate.clone(), share));
        remaining -= share;
    }

    Ok(payouts)
}
```

### 8.4 Anti-Spam

- **Minimum stake**: Each affiliate needs X BZR locked
- **Minimum reputation**: AffiliateScore >= threshold
- **Loop detection**: Same account_id cannot appear 2x in path
- **Hop limit**: Configurable per campaign (typical: 3-5)

---

## 9. Reputation System

### 9.1 PoC Score by Role

Each entity has independent score for each role they perform:

| Score | Range | Meaning |
|-------|-------|---------|
| **SellerScore** | 0-1000 | Product quality, confirmation time, dispute rate |
| **CourierScore** | 0-1000 | Punctuality, product care, success rate |
| **BuyerScore** | 0-1000 | Reliability (doesn't no-show), doesn't open frivolous disputes |
| **AffiliateScore** | 0-1000 | Real conversion rate (vs. spam) |

### 9.2 Score Inputs

```rust
struct ReputationInputs {
    // Positives
    successful_completions: u32,      // +10 per order without dispute
    on_time_deliveries: u32,          // +5 if delivery within SLA
    positive_feedback: u32,           // +3 per 5-star rating

    // Negatives
    disputes_opened_against: u32,     // -20 per dispute opened against you
    disputes_lost: u32,               // -50 if jury decides against you
    timeouts: u32,                    // -15 per timeout (didn't respond)
    slashes: Balance,                 // -100 per 1% of stake slashed

    // Temporal
    last_activity: BlockNumber,       // Decay if inactive
    account_age: BlockNumber,         // Bonus for longevity
}
```

### 9.3 Formula (simplified)

```rust
fn calculate_score(inputs: ReputationInputs) -> u32 {
    let base = 500;  // Initial score

    let positive = inputs.successful_completions * 10
                 + inputs.on_time_deliveries * 5
                 + inputs.positive_feedback * 3;

    let negative = inputs.disputes_opened_against * 20
                 + inputs.disputes_lost * 50
                 + inputs.timeouts * 15
                 + (inputs.slashes / UNIT) as u32 * 100;

    let decay = if inputs.last_activity < current_block - DECAY_THRESHOLD {
        (current_block - inputs.last_activity) / DECAY_FACTOR
    } else {
        0
    };

    let age_bonus = min(inputs.account_age / AGE_FACTOR, 50);

    let score = base + positive - negative - decay + age_bonus;

    score.clamp(0, 1000)
}
```

### 9.4 Score Usage

**Dynamic Gates**:

| Score | Max Value/Order | Required Courier Stake | Visibility |
|-------|-----------------|------------------------|------------|
| 0-200 | 50 BZR | 50% of value | Low in ranking |
| 200-500 | 500 BZR | 20% of value | Medium |
| 500-800 | 5000 BZR | 10% of value | High |
| 800-1000 | Unlimited | 5% of value | Featured in marketplace |

**Preferential Selection**:
- High-score couriers appear first in searches
- High-score sellers have promoted products
- High-score affiliates receive higher commission rates

---

## 10. Economy and Security

### 10.1 Mandatory Escrow

**Golden Rule**: No escrow, no handoff.

```rust
fn accept_order(origin, order_id) -> DispatchResult {
    let order = Orders::get(order_id)?;

    ensure!(
        Escrow::Locks::contains_key(order_id),
        "Escrow must be deposited before acceptance"
    );

    ensure!(
        Escrow::Locks::get(order_id) >= order.total_amount,
        "Insufficient escrow"
    );

    // ... rest of logic
}
```

### 10.2 Courier Stake

**Purpose**: Skin in the game + collateral for slashing

**Dynamic Calculation**:
```rust
fn calculate_required_stake(order_value: Balance, courier_score: u32) -> Balance {
    let base_rate = 0.2;  // 20%
    let score_factor = (1000 - courier_score) / 1000;  // lower score, higher stake

    let rate = base_rate * (1.0 + score_factor);
    order_value * rate
}
```

**Example**:
- Order of 100 BZR
- Courier with score 800 (high)
- Required stake: 100 * 0.2 * (1 + 0.2) = 24 BZR

- Courier with score 300 (low)
- Required stake: 100 * 0.2 * (1 + 0.7) = 34 BZR

### 10.3 Slashing

**Slashing Scenarios**:

| Infraction | Penalty | Who Loses |
|------------|---------|-----------|
| Forged handoff (false proof) | 50-100% of stake | Courier |
| Undelivered (fault proven) | 30-50% of stake | Courier |
| Switched/defective product | Reputation loss + possible ban | Seller |
| Frivolous dispute (bad faith proven) | Dispute fee not returned + rep-- | Buyer |
| Juror votes against obvious evidence | 20% of juror stake | Juror |

**Slashing is Progressive**:
```rust
fn calculate_slash_amount(
    base_stake: Balance,
    infraction_severity: u8,  // 1-10
    repeat_offender: bool
) -> Balance {
    let severity_factor = infraction_severity as f64 / 10.0;
    let repeat_multiplier = if repeat_offender { 2.0 } else { 1.0 };

    (base_stake * severity_factor * repeat_multiplier).min(base_stake)
}
```

### 10.4 Fees

**DAO-governed Configuration**:

```rust
struct FeeConfig {
    dao_fee_percent: u8,           // e.g., 2%
    treasury_percent: u8,          // e.g., 1%
    juror_pool_percent: u8,        // e.g., 0.5%
    burn_percent: u8,              // e.g., 0.5% (deflation)
}
```

**Distribution in `finalize()`**:
```rust
let total = escrow_amount;
let dao_fee = total * config.dao_fee_percent / 100;
let treasury_fee = total * config.treasury_percent / 100;
// ...

Escrow::transfer(dao_account, dao_fee);
Escrow::transfer(treasury_account, treasury_fee);
Escrow::burn(total * config.burn_percent / 100);
```

---

## 11. Protocol Invariants

**Invariants** are properties that can **never** be violated. If they are, the protocol is compromised.

### 11.1 Economic Invariants

1. **Value Conservation**
   ```
   ∑(Locked escrows) + ∑(Courier stakes) = ∑(Balances before locks)
   ```
   - No BZR can be created or destroyed outside authorized mint/burn

2. **Correct Total Split**
   ```
   After finalize():
   Seller received + Courier received + Affiliates received + Fees = Original escrow
   ```

3. **Stake Always Returned (if no fault)**
   ```
   If Courier was not slashed ⇒ Stake is returned in full
   ```

### 11.2 Authorization Invariants

4. **Only Valid Signers Can Attest**
   ```
   submit_attestation(HANDOFF, [sigA, sigB]) ⇒
     sigA ∈ {Seller, Courier} ∧ sigB ∈ {Seller, Courier} ∧ sigA ≠ sigB
   ```

5. **No One Receives Without Quorum**
   ```
   finalize() only executes if ∃:
     - Attestation(ORDER_CREATED)
     - Attestation(HANDOFF) with [Seller, Courier]
     - Attestation(DELIVERED) with [Courier, Buyer]
   ```

### 11.3 State Invariants

6. **Finalization Idempotence**
   ```
   finalize(order_id) called 2x ⇒ second call fails (Order.status already FINALIZED)
   ```

7. **Monotonic Step Order**
   ```
   DELIVERED cannot occur before HANDOFF
   (timestamp and dependency verification)
   ```

8. **Timeout Before Forced Finalization**
   ```
   finalize() without DELIVERED ⇒ Only if timeout expired OR dispute ruling
   ```

### 11.4 Security Invariants

9. **Reentrancy Protection**
   ```
   finalize() uses on-chain mutex (e.g., status flag):
   if Order.finalizing { return Err(ReentrancyGuard) }
   Order.finalizing = true;
   // ... executes split
   Order.finalizing = false;
   Order.status = FINALIZED;
   ```

10. **Challenge Window**
    ```
    After DELIVERED, exists 24-48h window before automatic finalize()
    → Allows parties to open disputes if there's a problem
    ```

---

## 12. Detailed Practical Examples

### 12.1 Case A: "Apartment Building Delivery"

**Situation**:
- Courier delivers package to doorman at 2pm
- Buyer arrives home at 8pm and claims didn't receive

**Collected Proofs**:

**DeliveryProof**:
```json
{
  "order_id": "0xABC",
  "step": "DELIVERED",
  "timestamp": "2025-10-28T14:00:00Z",
  "geo": {"lat": -23.550, "lon": -46.633},
  "media": [{
    "cid": "QmPhoto1",
    "description": "Package with label #ABC visible"
  }],
  "recipient": {
    "name": "João Silva (Doorman)",
    "id_type": "CPF_partial",
    "signature_capture": "QmSig1"
  },
  "observation": "Delivered to doorman - Buyer absent",
  "signers": [
    {"account": "5Courier", "sig": "0x..."},
    {"account": "5Buyer", "sig": null}  // Buyer not present
  ]
}
```

**Courier Action**:
- Since Buyer wasn't present, Courier photographed:
  1. Package label
  2. Doorman's face (automatic blur in app)
  3. Doorman's digital signature
- Submitted attestation with observation

**Flow**:
1. Courier submits DeliveryProof at 2:05pm
2. System detects missing Buyer signature
3. Starts 48h timer for Buyer to co-sign OR open dispute
4. Buyer at 8pm sees app notification: "Your order was delivered to doorman"
5. Buyer can:
   - **Option A**: Confirm pickup (late co-sign) → finalizes
   - **Option B**: Open dispute "Didn't find package"

**If Dispute is Opened**:
- Jurors analyze:
  - ✅ Label photo matches order_id
  - ✅ Timestamp and geo correct (building entrance)
  - ✅ Doorman identified (common practice)
  - ❌ Buyer has no counter-evidence (didn't photograph absence of package)
- **Ruling**: Release to Seller and Courier (valid delivery)
- **Educational action**: Buyer instructed to pick up from doorman

---

### 12.2 Case B: "Broken Seal in Transit"

**Situation**:
- Seller seals box with product (Nike sneakers)
- Courier transports
- Buyer receives crushed box with broken seal

**Proofs**:

**HandoffProof** (Seller → Courier):
```json
{
  "step": "HANDOFF",
  "timestamp": "2025-10-28T09:00:00Z",
  "media": [
    {"cid": "QmLacre1", "description": "Intact seal, serial #12345"},
    {"cid": "QmCaixa1", "description": "Box in perfect condition"}
  ],
  "product_condition": {
    "seal": "intact",
    "seal_number": "12345",
    "weight_kg": 1.0
  },
  "signers": [
    {"account": "5Seller", "sig": "0x..."},
    {"account": "5Courier", "sig": "0x..."}
  ]
}
```

**DeliveryProof** (Courier → Buyer):
```json
{
  "step": "DELIVERED",
  "timestamp": "2025-10-28T16:00:00Z",
  "media": [
    {"cid": "QmLacre2", "description": "Broken seal"},
    {"cid": "QmCaixa2", "description": "Crushed box"}
  ],
  "product_condition": {
    "seal": "broken",
    "damage": "box_crushed"
  },
  "observation": "Buyer refused to sign due to visible damage",
  "signers": [
    {"account": "5Courier", "sig": "0x..."},
    {"account": "5Buyer", "sig": null}  // Intentional refusal
  ]
}
```

**Flow**:
1. Buyer doesn't sign DeliveryProof on the spot (refusal)
2. Courier submits attestation with refusal observation
3. System opens automatic Dispute (missing co-signature + alleged damage)
4. Jurors receive both proofs

**Jury Analysis**:
- **HandoffProof** shows:
  - ✅ Seal #12345 intact
  - ✅ Perfect box
  - ✅ Both signed (Seller and Courier agree with state)
- **DeliveryProof** shows:
  - ❌ Broken seal
  - ❌ Crushed box
  - 📸 Timestamped photos prove state change

**Conclusion**:
- Damage occurred **between HANDOFF and DELIVERY**
- Responsibility: **Courier** (sole custody during period)

**Ruling**:
```rust
Ruling::PartialRefund {
    buyer_refund: 100 BZR (total value),
    seller_payment: 100 BZR (not at fault),
    courier_slash: 50 BZR (50% of 100 BZR stake),
    source: Courier stake + insurance/pool
}
```

**Execution**:
- Buyer receives 100 BZR back
- Seller receives 100 BZR from escrow
- Courier loses 50 BZR from stake (slashing)
- Courier receives 50 BZR back + reputation -100 points
- If insurance pool exists, covers difference; otherwise, Courier bears alone

---

### 12.3 Case C: "Spammer Affiliate"

**Situation**:
- Spammer creates 30 fake accounts
- Attempts to create artificial sharing chain to inflate commission

**Attempt**:
```
Seller → Fake1 → Fake2 → ... → Fake30 → Buyer
```

**Configured Campaign**:
```rust
Campaign {
    rate: 5%,
    max_hops: 5,
    decay: 0.5,  // 50% per level
    min_score: 100,
    min_stake: 10 BZR
}
```

**Created Order**:
```rust
Order::create_order_with_affiliate(
    affiliate_path = MerkleProof {
        campaign_id: 123,
        path: [Fake1, Fake2, ..., Fake30],  // 30 hops
        proof: [...],
        root: 0xSpamRoot
    }
)
```

**On-Chain Validation**:

```rust
// 1. Verify Merkle proof
verify_merkle_proof(path, proof, root) ✅ (spammer published root)

// 2. Verify hops
path.len() = 30 > max_hops = 5 ❌
// FAIL: "Exceeded max hops"

// 3. Even if passed hops, verify reputation
for fake in path {
    AffiliateScores::get(fake) = 0 < min_score = 100 ❌
}
// FAIL: "Affiliate below min reputation"

// 4. Verify stakes
for fake in path {
    AffiliateStakes::get(fake) = 0 < min_stake = 10 BZR ❌
}
// FAIL: "Affiliate below min stake"
```

**Result**:
- Order is created, but `affiliate_path` is rejected
- Commissions go to NULL or are burned
- Spammer receives nothing
- If attempted stake with stolen funds, can trigger investigation

**Additional Protection (Phase 2)**:
- Pattern detection (same accounts always working together)
- Stake slashed if spam proven
- Ban of associated IPs/devices

---

## 13. Dispute Module Hardening

### 13.1 The Most Sensitive Vector

**Common Criticism**: "If the jury can be bribed or makes inconsistent decisions, PoC fails."

**Response**: The Dispute module is the **last line of defense**, triggered only when PoCEngine cannot decide automatically (~5-10% of orders). Therefore, it has multiple protection layers.

---

### 13.2 Anti-Bribery Mitigations

#### A) Verifiable Random Selection (VRF)

**Problem**: If attacker knows who the jurors will be, can attempt corruption.

**Solution**:
```rust
// Uses VRF (Verifiable Random Function) - unpredictable and verifiable
let random_seed = pallet_babe::RandomnessFromOneEpochAgo::<T>::random(&order_id);
let pool = JurorPool::get();  // all eligible stakers
let selected = select_random_subset(pool, 7, random_seed);
```

**Properties**:
- No one can predict who will be selected before selection
- After selection, everyone can verify it was random (VRF proof)

---

#### B) Commit-Reveal + Secret Vote

**Problem**: If jurors vote publicly, they can be pressured to change vote.

**Solution**:
```rust
// Phase 1: Commit (juror sends vote hash)
fn commit_vote(origin, order_id: OrderId, vote_hash: H256) {
    let juror = ensure_signed(origin)?;

    VoteCommits::insert((order_id, juror), VoteCommit {
        hash: vote_hash,
        timestamp: now()
    });
}

// Phase 2: Reveal (after all commit, reveal vote)
fn reveal_vote(origin, order_id: OrderId, vote: Vote, salt: Vec<u8>) {
    let juror = ensure_signed(origin)?;
    let commit = VoteCommits::get((order_id, juror))?;

    // Verify hash matches
    ensure!(
        blake2_256(&(vote, salt)) == commit.hash,
        "Invalid reveal"
    );

    Votes::insert((order_id, juror), vote);
}
```

**Properties**:
- During commit, no one knows anyone's vote
- Impossible to change vote after commit (hash locked)
- Reveal proves vote is same as committed

---

#### C) Deferred Payout with Meta-Dispute

**Problem**: Even with commit-reveal, bribery can happen before commit.

**Solution**:
```rust
// After ruling, juror rewards are time-locked
fn finalize_dispute(order_id: OrderId) {
    let ruling = calculate_ruling(order_id)?;
    apply_ruling(order_id, ruling);

    // Rewards locked for 7 days
    for juror in Disputes::get(order_id).jurors {
        JurorPayouts::insert(juror, Payout {
            amount: calculate_reward(juror, ruling),
            unlock_at: now() + 7 * DAYS
        });
    }

    // Window for Meta-Dispute
    MetaDisputeWindow::insert(order_id, now() + 7 * DAYS);
}

// Any party can open Meta-Dispute if presenting collusion proof
fn open_meta_dispute(
    origin,
    order_id: OrderId,
    evidence_of_collusion: Vec<u8>  // e.g., leaked chat messages
) {
    ensure!(now() < MetaDisputeWindow::get(order_id), "Window closed");

    // New round with different jurors
    // If substantiated: slashing of original jurors + ban
}
```

---

#### D) Multi-Rounds with Growing Cost (Appeal Ladder)

**Problem**: Losing party may attempt to bribe appeal jury.

**Solution**:
```rust
struct DisputeLevel {
    level: u8,           // 1, 2, 3
    juror_count: u32,    // 7, 21, 63
    stake_required: Balance,  // 10 BZR, 50 BZR, 200 BZR
}

// First round: 7 jurors
// Appeal level 1: 21 jurors (3x more) + 5x higher stake
// Appeal level 2: 63 jurors (9x more) + 20x higher stake

// Bribery cost grows geometrically
// Attacker would need to corrupt majority of 63 jurors with 200 BZR each
// = 126,000 BZR at risk to reverse decision
```

---

#### E) Stratified Sampling

**Problem**: Jurors from same region/group may have bias or coordinate.

**Solution**:
```rust
// Select jurors from different geographic/demographic shards
fn select_stratified_jurors(pool: Vec<AccountId>, count: u32) -> Vec<AccountId> {
    let shards = stratify_by_geo_and_reputation(pool);

    let per_shard = count / shards.len();
    let mut selected = Vec::new();

    for shard in shards {
        selected.extend(
            select_random_subset(shard, per_shard, random_seed())
        );
    }

    selected
}
```

---

### 13.3 Evidence Quality

#### A) Mandatory Capture Patterns

**App enforces**:
- Watermark with order_id, timestamp, signatory
- Ephemeral QR code for cross-validation
- Device attestation (SafetyNet/Play Integrity)

```json
{
  "media_cid": "QmPhoto",
  "watermark": {
    "order_id": "0xABC",
    "timestamp": "2025-10-28T14:00:00Z",
    "captured_by": "5Courier...",
    "qr_nonce": "xyz123"
  },
  "device_attestation": {
    "platform": "Android",
    "integrity_token": "eyJhbGc...",
    "verdict": "MEETS_DEVICE_INTEGRITY"
  }
}
```

---

#### B) Robust Location Proofs

**Multi-sensor fusion**:
```rust
struct LocationProof {
    gps: Coordinates,
    wifi_bssids: Vec<String>,      // detected routers
    cell_tower_ids: Vec<u32>,      // cell towers
    bluetooth_beacons: Vec<String>, // BLE beacons
    accuracy_meters: f64,
    timestamp: u64
}

// Cross-validation: all sensors must agree on same region
fn validate_location(proof: LocationProof, expected_region: Region) -> bool {
    gps_matches(proof.gps, expected_region)
    && wifi_matches(proof.wifi_bssids, expected_region)
    && cell_matches(proof.cell_tower_ids, expected_region)
}
```

**Phase 3: ZK-PoD**
```
Courier proves:
  "I was within 500m radius of address X at time Y"
  WITHOUT revealing exact coordinates

Via Zero-Knowledge Proof verifiable on-chain
```

---

#### C) Versioned Evidentiary Bundles

**Evidence schema**:
```json
{
  "version": "1.2.0",
  "required_fields": [
    "handoff_photo_with_seal",
    "delivery_photo_with_recipient",
    "geo_proof",
    "timestamps"
  ],
  "optional_fields": [
    "video_sequence",
    "witness_signature"
  ],
  "fraud_indicators": [
    "timestamp_manipulation",
    "geo_spoofing",
    "photoshop_detection"
  ]
}
```

**Jurors receive checklist**:
```
✅ Seal photo present?
✅ Timestamp coherent with previous handoff?
✅ Geo within tolerance?
⚠️ Photo shows signs of editing?
```

---

#### D) Automatic Pre-Scoring

**Phase 3: AI Assistive**

```rust
struct PreScore {
    overall: u8,  // 0-100
    confidence: f64,
    breakdown: {
        timestamp_validity: u8,
        geo_consistency: u8,
        media_authenticity: u8,
        signature_validity: u8
    },
    red_flags: Vec<String>,  // e.g., ["GPS jump detected", "Seal number mismatch"]
    explanation: String  // "Delivery proof is strong: all sensors agree, media unedited"
}

// Jurors see pre-score, but maintain final decision
```

**AI Training**:
- Public dataset of resolved disputes
- Labels: final rulings + justifications
- Model: Mandatory explainability (LIME/SHAP)

---

#### E) Public Audit

**Every ruling records**:
```rust
struct RulingRecord {
    order_id: OrderId,
    ruling: Ruling,
    jurors: Vec<AccountId>,  // anonymized by hash, but traceable by DAO
    evidence_hashes: Vec<H256>,
    votes: Vec<(VoteHash, Vote)>,  // commit/reveal preserved
    pre_score: PreScore,
    timestamp: BlockNumber
}

// Anyone can audit:
// - Coherence of similar rulings
// - Individual juror accuracy rate
// - Deviations from pre-score (jurors ignored AI?)
```

---

### 13.4 Security Parameters

**Recommended Configuration (Phase 2)**:

```rust
struct DisputeConfig {
    // Stakes
    stake_juror_min: Balance = 100 BZR,
    stake_juror_percent_of_order: f64 = 0.1,  // 10% of order value

    // Slashing
    slashing_wrong_vote: f64 = 0.3,  // 30% of stake
    slashing_no_show: f64 = 0.5,     // 50% of stake
    slashing_collusion: f64 = 1.0,   // 100% of stake + ban

    // Quorums
    jurors_first_level: u32 = 7,
    jurors_appeal_level1: u32 = 21,
    jurors_appeal_level2: u32 = 63,
    supermajority_threshold: f64 = 0.66,  // 2/3

    // Timeouts
    commit_window: BlockNumber = 24 * HOURS,
    reveal_window: BlockNumber = 24 * HOURS,
    payout_lock: BlockNumber = 7 * DAYS,
    meta_dispute_window: BlockNumber = 7 * DAYS,

    // Appeals
    max_appeals: u8 = 2,
    appeal_stake_multiplier: f64 = 5.0,  // 5x the stake of previous level
}
```

---

### 13.5 Conclusion: Disputes as Last Line

**Defense in Depth**:

```
Layer 1: PoC Quorum (95% of cases)
    ↓ fails
Layer 2: Timeouts + automatic evidence
    ↓ fails
Layer 3: Dispute with 7 jurors + VRF + commit-reveal
    ↓ appeal
Layer 4: 21 jurors + 5x higher cost
    ↓ final appeal
Layer 5: 63 jurors + AI assistive + DAO oversight
```

**Attack Cost**:
- Bribe majority of 7 jurors: ~500 BZR (risky)
- Bribe majority of 21 jurors: ~2,500 BZR + meta-dispute risk
- Bribe majority of 63 jurors: ~12,000 BZR + high detection probability + permanent ban

**For most orders (< 500 BZR)**: attack cost > order value → economically irrational.

---

## Next Documents

- **[01-overview-context.md](./01-overview-context.md)**: General vision and market context
- **[03-market-pain-points.md](./03-market-pain-points.md)**: Analysis of traditional market pain points and how Bazari solves them
- **[04-ecosystem-modules.md](./04-ecosystem-modules.md)**: Complete description of each ecosystem module
- **[05-architecture-implementation.md](./05-architecture-implementation.md)**: Detailed technical architecture and Substrate pallets
- **[06-roadmap-evolution.md](./06-roadmap-evolution.md)**: 3-phase roadmap and future evolution (ZK-PoD, BLS, AI)

---

**Bazari Proof of Commerce** — Trust replaced by mathematics, work verified by cryptography.
