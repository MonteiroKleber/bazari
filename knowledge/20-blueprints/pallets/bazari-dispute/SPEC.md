# bazari-dispute Pallet - Specification (Concise)

**Priority**: P2 | **Effort**: 3-4 weeks | **Deps**: bazari-attestation, pallet-randomness

## 🎯 Purpose
Decentralized dispute resolution with VRF juror selection and commit-reveal voting.

## 📦 Key Storage

```rust
pub struct Dispute {
    pub order_id: OrderId,
    pub plaintiff: AccountId,
    pub defendant: AccountId,
    pub jurors: Vec<AccountId>, // 5 jurors (VRF-selected)
    pub votes: Vec<Vote>,
    pub ruling: Option<Ruling>,
    pub expires_at: BlockNumber,
}

pub enum Ruling {
    RefundBuyer,
    ReleaseSeller,
    PartialRefund(u8), // e.g., 50%
}
```

## 📤 Key Extrinsics

1. **open_dispute**(order_id, evidence_ipfs_cid)
2. **select_jurors**() - VRF randomness
3. **commit_vote**(dispute_id, vote_hash) - Commit phase (24h)
4. **reveal_vote**(dispute_id, vote, salt) - Reveal phase (24h)
5. **execute_ruling**(dispute_id) - Apply ruling to escrow

## 💡 Dispute Flow
```
Day 0: Open dispute → 5 jurors selected via VRF
Day 0-1: COMMIT phase (jurors submit hashed votes)
Day 1-2: REVEAL phase (jurors reveal votes + salt)
Day 2: TALLY votes → Execute ruling (3-of-5 quorum)
```

## 🔐 Security
- **VRF**: Unbiased juror selection
- **Commit-reveal**: Prevents vote coordination/collusion
- **Stake**: Jurors must have reputation > 500 + stake

## 📚 Refs: [IMPLEMENTATION.md](IMPLEMENTATION.md) | [INTEGRATION.md](INTEGRATION.md)
