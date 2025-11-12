# bazari-affiliate Pallet - Specification (Concise)

**Priority**: P2 | **Effort**: 1 week | **Deps**: bazari-commerce

## 🎯 Purpose
Commission DAG with Merkle proofs for multi-level affiliate tracking.

## 📦 Key Storage

```rust
pub struct AffiliateCampaign {
    pub store_id: StoreId,
    pub commission_rate: Percent, // 5%
    pub max_depth: u8, // 5 levels
    pub decay_rate: Percent, // 50% per level
    pub merkle_root: Hash,
}

pub struct Referral {
    pub referrer: Option<AccountId>,
    pub referee: AccountId,
    pub depth: u8,
}
```

## 📤 Key Extrinsics

1. **create_campaign**(store_id, commission_rate, max_depth, decay)
2. **register_referral**(referrer) - Link referee to referrer
3. **execute_split**(order_id, merkle_proof) - Pay commissions with proof

## 💡 Commission Example
```
Order: 100 BZR
├─ L0 (Direct): 5% = 5 BZR
├─ L1 (50% decay): 2.5% = 2.5 BZR
├─ L2 (50% decay): 1.25% = 1.25 BZR
└─ Total: 8.75 BZR in commissions
```

## 📚 Refs: [IMPLEMENTATION.md](IMPLEMENTATION.md) | [INTEGRATION.md](INTEGRATION.md)
