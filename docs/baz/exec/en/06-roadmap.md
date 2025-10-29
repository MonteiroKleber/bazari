## 06. Roadmap and Future Evolution

---

## Table of Contents
1. [Phase Overview](#1-phase-overview)
2. [Phase 1: MVP PoC](#2-phase-1-mvp-poc)
3. [Phase 2: Crypto-Evolution](#3-phase-2-crypto-evolution)
4. [Phase 3: Privacy and Scale](#4-phase-3-privacy-and-scale)
5. [Beyond Phase 3](#5-beyond-phase-3)
6. [Success Metrics](#6-success-metrics)
7. [Risks and Mitigations](#7-risks-and-mitigations)

---

## 1. Phase Overview

### 1.1 Timeline

```
2025 Q1-Q2 ────────► PHASE 1: MVP PoC
                     • Functional end-to-end PoC
                     • Public testnet
                     • 1,000 early adopters

2025 Q3-Q4 ────────► PHASE 2: Crypto-Evolution
                     • Aggregated BLS, VRF, DID/VC
                     • Beta mainnet
                     • 50,000 users

2026 Q1-Q4 ────────► PHASE 3: Privacy & Scale
                     • ZK-PoD, sharding, AI-assisted
                     • Mainnet v1.0
                     • 1,000,000+ users

2027+ ─────────────► Global Expansion
                     • Multi-chain, cross-border
                     • IoT/supply chain integration
                     • Commerce protocol standard
```

---

## 2. Phase 1: MVP PoC

### 2.1 Objective

**Prove that Proof of Commerce works**: Execute the complete happy path (order creation → delivery → settlement) with basic security and proof anchoring.

### 2.2 Technical Deliverables

#### 2.2.1 Blockchain (BazariChain)

| Component | Description | Target Status |
|-----------|-------------|---------------|
| **Core Pallets** | order, escrow, attestation, fulfillment, affiliate, fee | ✅ Complete |
| **PoC Quorum** | ORDER_CREATED, HANDOFF (Seller+Courier), DELIVERED (Courier+Buyer) | ✅ Complete |
| **Escrow & Split** | BZR payment, automatic distribution | ✅ Complete |
| **Initial Reputation** | SellerScore, CourierScore, BuyerScore (simple increment) | ✅ Complete |
| **Basic Dispute** | Manual opening, simple jury (no VRF yet) | ⏳ 70% |

#### 2.2.2 Frontend & UX

| Module | Features | Target Status |
|--------|----------|---------------|
| **Marketplace** | Search, product, checkout, tracking | ✅ Complete |
| **BazChat** | 1-on-1 chat, proof co-signing (2 clicks) | ✅ Complete |
| **Wallet** | Create account, view balance, send/receive BZR | ✅ Complete |
| **My Stores** | List products, accept orders | ✅ Complete |
| **Become Courier** | Registration, view orders, apply | ✅ Complete |

#### 2.2.3 Infrastructure

| Service | Technology | Target Status |
|---------|------------|---------------|
| **Testnet** | 3 validator nodes + public RPC | ✅ Running |
| **IPFS** | Public gateway for media | ✅ Running |
| **Indexer** | SubQuery for fast queries | ✅ Running |
| **API** | GraphQL (Apollo) | ✅ Running |

---

### 2.3 Milestone: First Real Transaction

**Goal**: 10 complete orders (creation → delivery → split) on testnet with real users.

**Success Criteria**:
- ✅ 10 Orders finalized without failure
- ✅ Average completion time < 24h (from creation to split)
- ✅ 100% correct splits (seller, courier, affiliate, DAO)
- ✅ Proofs (Handoff/Delivery) anchored and verifiable
- ✅ Zero critical bugs (exploits, lost funds)

**Target Date**: March 2025

---

### 2.4 Public Testnet Launch

**Deliverables**:
- Frontend accessible at: testnet.bazari.network
- Faucet: Users can get free BZR for testing
- Explorer: View blocks, transactions, on-chain orders
- Documentation: Usage guides for sellers/couriers/buyers
- Support: Discord/Telegram channel for questions

**User Target**: 1,000 early adopters testing

**Target Date**: April 2025

---

### 2.5 Feedback & Iteration

**Q2 2025**: Intensive feedback collection.

**Metrics to Monitor**:
- Order completion rate (target: >90%)
- Dispute rate (target: <5%)
- Average delivery time (target: <3 days)
- NPS (Net Promoter Score) for sellers and buyers (target: >50)

**Expected Adjustments**:
- UX: Simplify co-signing if friction exists
- Fees: Adjust % if users complain
- Timeouts: Increase if deliveries take longer than expected
- Bugs: Fix all edge cases discovered

---

## 3. Phase 2: Crypto-Evolution

### 3.1 Objective

**Elevate security, efficiency and reliability** of the protocol with advanced cryptographic techniques and identity verification.

### 3.2 Technical Deliverables

#### 3.2.1 BLS Aggregated Signatures

**Problem**: Multiple signatures per step increase tx cost and latency.

**Solution**:
```rust
// Before (Phase 1):
Attestation {
    signers: [
        (seller, sig_seller),   // 64 bytes
        (courier, sig_courier), // 64 bytes
    ]
    // Total: 128 bytes of signatures
}

// After (Phase 2):
Attestation {
    signers: [seller, courier],
    aggregated_signature: bls_aggregate([sig_seller, sig_courier]),  // 48 bytes
}
// Total: 48 bytes (62% reduction)
```

**Benefits**:
- Reduced tx cost (fewer bytes on-chain)
- Faster validation (one verification vs. multiple)
- Scalability (important for Phase 3 with sharding)

**Timeline**: Q3 2025

---

#### 3.2.2 VRF for Juror Selection

**Problem**: Predictable juror selection = bribery risk.

**Solution**:
```rust
// VRF (Verifiable Random Function) - unpredictable but verifiable
fn select_jurors(dispute_id: DisputeId, pool: Vec<AccountId>) -> Vec<AccountId> {
    let seed = pallet_babe::RandomnessFromOneEpochAgo::<T>::random(&dispute_id);
    let mut selected = Vec::new();

    for i in 0..7 {
        let index = u64::from_le_bytes(seed[i*8..(i+1)*8].try_into().unwrap()) % pool.len() as u64;
        selected.push(pool[index as usize].clone());
    }

    selected
}

// VRF Proof published on-chain → anyone can verify randomness
```

**Benefits**:
- Impossible to predict jurors before selection
- Impossible to manipulate selection (VRF is deterministic given seed)
- Total transparency (verifiable proof)

**Timeline**: Q3 2025

---

#### 3.2.3 Commit-Reveal for Votes

**Problem**: Public votes allow coordination/pressure among jurors.

**Solution**:
```rust
// Phase 1: Commit (juror sends hash)
fn commit_vote(juror: AccountId, dispute_id: DisputeId, vote_hash: H256) {
    VoteCommits::insert((dispute_id, juror), VoteCommit {
        hash: vote_hash,
        committed_at: now(),
    });
}

// Phase 2: Reveal (after commit deadline)
fn reveal_vote(juror: AccountId, dispute_id: DisputeId, vote: Vote, salt: Vec<u8>) {
    let commit = VoteCommits::get((dispute_id, juror)).unwrap();
    ensure!(blake2_256(&(vote, salt)) == commit.hash, "Invalid reveal");

    Votes::insert((dispute_id, juror), vote);
}
```

**Benefits**:
- No one knows anyone's vote during commit phase
- Impossible to change vote after commit (hash locks it)
- Reduces collusion and vote buying

**Timeline**: Q3 2025

---

#### 3.2.4 DID/VC (Decentralized Identifiers / Verifiable Credentials)

**Problem**: How to differentiate legitimate sellers from scammers without centralized KYC?

**Solution**:
```rust
// Seller can have multiple verifiable credentials
struct VerifiableCredential {
    issuer: DID,           // Ex.: did:bazari:cooperativaArtesanal
    subject: AccountId,    // Seller account
    claim_type: ClaimType, // Ex.: "MemberOfCooperative", "CPFVerified"
    proof: Signature,      // Issuer signature
    issued_at: Timestamp,
    expires_at: Option<Timestamp>,
}

enum ClaimType {
    MemberOfCooperative(CoopId),
    CPFVerified,
    AddressVerified,
    EcoFriendly,           // Carbon neutral
    FairTrade,
}
```

**Benefits**:
- Sellers verified by communities earn badges
- Buyer sees: "@ModaAutoral ✅ (3 verifications)"
- No centralized KYC (each community issues VCs)
- Seller controls which VCs to expose

**Timeline**: Q4 2025

---

#### 3.2.5 Advanced Reputation with Decay

**Problem**: Phase 1 reputation is cumulative (never naturally decreases).

**Solution**:
```rust
// Score decays with inactivity
fn calculate_score_with_decay(account: AccountId, role: Role) -> u32 {
    let base_score = Scores::get((account, role)).unwrap_or(500);
    let last_activity = LastActivity::get((account, role)).unwrap_or(0);
    let blocks_inactive = now() - last_activity;

    let decay_per_month = 10; // -10 points/month of inactivity
    let months_inactive = blocks_inactive / (30 * DAYS);
    let decay_total = decay_per_month * months_inactive;

    base_score.saturating_sub(decay_total)
}
```

**Benefits**:
- Incentivizes continuous activity
- Abandoned/hacked accounts automatically lose score
- Score reflects recent reliability (not just history)

**Timeline**: Q4 2025

---

### 3.3 Mainnet Beta

**Q4 2025**: Launch of Mainnet Beta with all Phase 2 features.

**Difference from Testnet**:
- BZR has real value (listed on DEXs)
- Stakes and slashing are real ($ at risk)
- Professional validators (not just testnet volunteers)

**User Target**: 50,000 active

**Initial Economy**:
- Initial supply: 100,000,000 BZR
- Distribution:
  - 40% Community (airdrops, incentives)
  - 30% DAO Treasury
  - 20% Team/Early Contributors (4-year vesting)
  - 10% Investors (2-year vesting)

---

## 4. Phase 3: Privacy and Scale

### 4.1 Objective

**Maximize privacy, scale to millions of users and reduce human dependency** in disputes with AI assistance.

### 4.2 Technical Deliverables

#### 4.2.1 ZK-PoD (Zero-Knowledge Proof of Delivery)

**Problem**: DeliveryProof exposes buyer's exact location (privacy).

**Solution**:
```rust
// Courier generates ZK proof:
// "I was inside polygon P (neighborhood/region) at timestamp T"
// WITHOUT revealing exact coordinates (lat, lon)

struct ZKPoD {
    region_commitment: H256,   // Hash of authorized polygon
    timestamp: Timestamp,
    proof: ZKProof,            // Groth16/PLONK proof
}

// On-chain verifier:
fn verify_zkpod(zkpod: &ZKPoD, order: &Order) -> bool {
    // Verifies proof is valid
    verify_zk_proof(&zkpod.proof, &public_inputs) &&
    // Verifies commitment corresponds to order region
    zkpod.region_commitment == order.delivery_region_commitment
}
```

**Implementation**:
- Circuit: Circom/ZoKrates
- Proving system: Groth16 (small proofs, 128-256 bytes)
- On-chain verifier: Native Substrate pallet

**Benefits**:
- Buyer doesn't reveal exact address on-chain
- Courier proves delivery in correct region
- Strong privacy maintains verifiability

**Timeline**: Q2 2026

---

#### 4.2.2 Sharded Queues (Scale)

**Problem**: With 1M+ users, global courier matching becomes slow.

**Solution**:
```rust
// Divide network into geographic shards
enum Shard {
    BrazilSoutheast,  // SP, RJ, MG, ES
    BrazilSouth,      // RS, SC, PR
    BrazilNortheast,  // BA, PE, CE, ...
    // ...
}

// Order created in SP:
fn create_order(...) {
    let shard = determine_shard(seller_location);
    ShardedOrders::insert(shard, order_id, order);

    // Notifies only couriers in relevant shard
    notify_couriers_in_shard(shard, order_id);
}
```

**Benefits**:
- Reduces latency (courier only sees regional orders)
- Horizontal scaling (each shard can have own indexer)
- Maintains decentralization (shards communicate via XCM/Polkadot)

**Timeline**: Q3 2026

---

#### 4.2.3 AI-Assisted Disputes

**Problem**: Complex disputes take time (human jury needs to analyze much evidence).

**Solution**:
```rust
// AI pre-analyzes evidence and generates scorecard
struct AIAssessment {
    overall_score: u8,        // 0-100 (confidence in valid delivery)
    confidence: f64,          // 0.0-1.0
    breakdown: {
        timestamp_validity: u8,
        geo_consistency: u8,
        media_authenticity: u8,
        signature_validity: u8,
    },
    red_flags: Vec<String>,   // Ex.: ["GPS jump detected", "Photo edited"]
    explanation: String,      // "Delivery proof is strong because..."
}

// Jurors receive assessment as starting point
// BUT final decision remains human
```

**AI Training**:
- Dataset: Disputes resolved on Mainnet (10,000+)
- Features: Proof hashes, metadata (timestamps, geo), rulings
- Model: Ensemble (XGBoost + Neural Network)
- Explainability: SHAP values for each decision

**Benefits**:
- Reduces dispute time from 7 days to 2-3 days
- Increases consistency (humans have bias, AI is objective)
- Jurors focus on ambiguous cases (AI filters obvious ones)

**Timeline**: Q4 2026

---

#### 4.2.4 Payment Channels (Micropayments)

**Problem**: Courier making 50 deliveries/day pays 50 tx fees.

**Solution**:
```rust
// Off-chain payment channel between Marketplace and Courier
struct PaymentChannel {
    marketplace: AccountId,
    courier: AccountId,
    balance: Balance,         // Deposited on-chain
    nonce: u64,
    settled_amount: Balance,  // Amount already withdrawn
}

// Each delivery:
// 1. Marketplace signs off-chain receipt: "Courier deserves +15 BZR (nonce: 42)"
// 2. Courier stores receipt (doesn't submit on-chain yet)
// 3. End of day, Courier submits final receipt on-chain
//    → Withdraws 750 BZR (50 deliveries × 15 BZR) in single tx
```

**Benefits**:
- Reduces tx cost 50x
- Instant settlement (signed receipts are like cash)
- Scalability (blockchain doesn't see 50 txs, just 1)

**Timeline**: Q4 2026

---

### 4.3 Mainnet v1.0

**Q4 2026**: Official launch of Mainnet v1.0 with all features from 3 phases.

**User Target**: 1,000,000 active
**GMV Target**: R$ 1 billion/year in transactions

**Final Audit**:
- Trail of Bits (smart contracts)
- Kudelski Security (infrastructure)
- Bug bounty: $500k in prizes

---

## 5. Beyond Phase 3

### 5.1 Multi-Chain (Interoperability)

**Vision**: Bazari is not locked to one blockchain.

**Implementation**:
- **Polkadot Parachain**: BazariChain becomes parachain (shared security)
- **Bridges**: ETH, BNB, Solana via bridges (Wormhole, Axelar)
- **IBC (Inter-Blockchain Communication)**: Integration with Cosmos

**Benefit**: Users can pay with ETH/USDC/SOL, protocol automatically converts to BZR.

**Timeline**: 2027

---

### 5.2 Cross-Border Commerce

**Vision**: Buy from any country without currency/customs friction.

**Implementation**:
- **Multi-currency stablecoins**: USDC, EURC, BRLA (tokenized Real)
- **Exchange oracles**: Chainlink for conversion rates
- **Compliance**: Integration with customs systems (automated declaration)

**Example**:
```
Buyer in Germany purchases Brazilian handicraft
    ↓
Pays in EURC (Euro stablecoin)
    ↓
Protocol automatically converts to BZR
    ↓
Seller receives BRZ (tokenized Real) via P2P
    ↓
International delivery via local courier (Brazil) + local courier (Germany)
    ↓
Handoff 1: Seller (BR) → Brazil Courier
Handoff 2: Brazil Courier → International Hub
Handoff 3: Hub → Germany Courier
Delivery: Germany Courier → Buyer
```

**Timeline**: 2028

---

### 5.3 IoT & Supply Chain

**Vision**: Integrate IoT devices for automatic proofs.

**Examples**:

**A) Smart Locks**:
```
Package arrives at smart locker
    ↓
Locker automatically generates cryptographic signature
    ↓
Buyer opens locker with app QR code
    ↓
DeliveryProof generated without human intervention
```

**B) RFID/NFC Tags**:
```
Product has NFC tag
    ↓
Each scan (Seller → Courier → Buyer) generates attestation
    ↓
Complete and immutable product timeline
```

**C) Temperature Sensors (Food)**:
```
Perishable product has temperature sensor
    ↓
Sensor sends data to IPFS every hour
    ↓
If temperature leaves range (2-8°C), automatic alert
    ↓
Automatic dispute if product arrives spoiled
```

**Timeline**: 2029+

---

### 5.4 Protocol as Industry Standard

**Vision**: Bazari PoC becomes **ISO/open standard** for commerce settlement.

**Potential Adoption**:
- Courier cooperatives adopt PoC as internal protocol
- Governments use PoC for public procurement (transparency)
- Traditional marketplaces (MercadoLivre?) integrate PoC as option

**Analogy**: HTTP for web, PoC for commerce.

**Timeline**: 2030+

---

## 6. Success Metrics

### 6.1 KPIs by Phase

| Metric | Phase 1 (Q2 2025) | Phase 2 (Q4 2025) | Phase 3 (Q4 2026) |
|--------|-------------------|-------------------|-------------------|
| **Active Users** | 1,000 | 50,000 | 1,000,000 |
| **Monthly GMV** | R$ 50k | R$ 5M | R$ 100M |
| **Orders/Day** | 10 | 500 | 10,000 |
| **Completion Rate** | >85% | >90% | >95% |
| **Dispute Rate** | <10% | <5% | <2% |
| **Seller NPS** | >40 | >60 | >70 |
| **Buyer NPS** | >50 | >70 | >80 |
| **Network Uptime** | >95% | >99% | >99.9% |

---

### 6.2 North Star Metric

**GMV (Gross Merchandise Value)**: Total transaction volume on the protocol.

**2030 Target**: R$ 10 billion/year
- Equivalent to 6% of Brazilian e-commerce (projected for 2030)
- Or 1 million users spending R$ 10,000/year

---

## 7. Risks and Mitigations

### 7.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Critical bug (exploits)** | Medium | Catastrophic | Extensive audit, bug bounty, long testnet |
| **Scalability (can't handle 1M users)** | Low | High | Sharding, payment channels, load testnet |
| **Complex UX (users don't understand crypto)** | High | Medium | Abstract wallet, guided onboarding, 24/7 support |
| **Tx latency (>1min to confirm)** | Low | Medium | Substrate is fast (6s), optimize RPC |

---

### 7.2 Adoption Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Sellers don't migrate (MercadoLivre lock-in)** | High | High | Incentives (BZR cashback), education, success case |
| **Buyers don't trust crypto** | High | High | Stablecoins, refund guarantee, marketing |
| **Couriers prefer iFood/Rappi** | Medium | Medium | Show real gain (+36%), flexibility |
| **Regulation (government bans crypto)** | Low | Catastrophic | Lobby, compliance, regulated stablecoins |

---

### 7.3 Economic Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **BZR loses value (market crash)** | Medium | High | Stablecoins as option, robust P2P |
| **Gas fees rise (Substrate charges high)** | Low | Medium | Optimize pallets, subsidize gas for newbies |
| **Insufficient juror pool** | Medium | Medium | Strong incentives (10% of slashed stake goes to jury) |

---

### 7.4 Contingency Plan

**If catastrophic exploit occurs**:
1. Pause network (emergency stop via DAO)
2. Forensic investigation (48h)
3. Chain fork (if necessary)
4. Victim compensation (DAO treasury)
5. Post-mortem audit
6. Runtime upgrade with fix

**If adoption is slow (<10% of target)**:
1. Pivot to specific niche (e.g., handicrafts, organic food)
2. Temporary subsidies (zero fee for 6 months)
3. Aggressive marketing (influencers, events)
4. Strategic partnerships (cooperatives, NGOs)

---

## Conclusion

The Bazari roadmap is **ambitious but executable**. Each phase builds on the previous one, and goals are measurable.

**Phase 1**: Prove the concept (Q2 2025)
**Phase 2**: Strengthen security (Q4 2025)
**Phase 3**: Scale with privacy (Q4 2026)
**Beyond**: Dominate global commerce (2027-2030)

**Long-Term Vision**: In 2030, when someone asks "how do you sell online?", the natural answer will be: **"I use Bazari, of course. It's decentralized, fees are minimal, and I control my reputation."**

---

## Related Documents

- **[01-overview.md](./01-overview.md)**: Historical context and problems Bazari solves
- **[02-proof-of-commerce.md](./02-proof-of-commerce.md)**: Complete technical specification of PoC
- **[03-market-problems.md](./03-market-problems.md)**: Analysis of pain points and solutions
- **[04-ecosystem-modules.md](./04-ecosystem-modules.md)**: Description of each module
- **[05-architecture.md](./05-architecture.md)**: Technical architecture and pallets

---

**Bazari** — The future of commerce is decentralized, verifiable and fair.
**Let's build it together.**
