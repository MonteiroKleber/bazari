# bazari-fee Pallet - Specification (Concise)

**Priority**: P2 | **Effort**: 3-5 days | **Deps**: bazari-commerce

## 🎯 Purpose
Automatic payment splitting (platform fee, affiliate, seller).

## 📦 Key Storage

```rust
pub struct FeeConfiguration {
    pub platform_fee: Percent, // 5%
    pub treasury_account: AccountId,
    pub min_order_amount: Balance,
}
```

## 📤 Key Extrinsics

1. **set_platform_fee**(new_fee) - DAO only
2. **calculate_split**(order_amount) → Vec<(AccountId, Balance)>

## 💡 Split Example
```
Order: 100 BZR
├─ Platform (5%): 5 BZR → Treasury
├─ Affiliate (3%): 3 BZR → Referrer
└─ Seller (92%): 92 BZR → Store
```

## 🔗 Integration
Called by `bazari-escrow::split_release()` for atomic multi-recipient payouts.

## 📚 Refs: [IMPLEMENTATION.md](IMPLEMENTATION.md) | [INTEGRATION.md](INTEGRATION.md)
