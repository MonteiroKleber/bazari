# bazari-attestation Pallet - Implementation Guide

**Estimated Time**: 2-3 weeks
**Difficulty**: Medium
**Prerequisites**: bazari-commerce, IPFS client

---

## 📋 Quick Implementation Checklist

### Week 1: Core (5 days)
- [ ] Day 1-2: Setup + proof submission
- [ ] Day 3-4: Co-signing mechanism
- [ ] Day 5: Quorum validation

### Week 2: Advanced (5 days)
- [ ] Day 1-2: Signature revocation + CID updates
- [ ] Day 3: Challenge mechanism
- [ ] Day 4-5: Tests + benchmarks

---

## 🚀 Key Implementation Steps

### 1. Project Setup

```bash
cd /root/bazari-chain/pallets
mkdir bazari-attestation
cd bazari-attestation
```

### 2. Cargo.toml (Dependencies)

```toml
[package]
name = "pallet-bazari-attestation"
version = "0.1.0"
edition = "2021"

[dependencies]
codec = { package = "parity-scale-codec", version = "3.6.1", default-features = false, features = ["derive"] }
scale-info = { version = "2.5.0", default-features = false, features = ["derive"] }
frame-support = { git = "https://github.com/paritytech/polkadot-sdk.git", branch = "release-polkadot-v1.18.0", default-features = false }
frame-system = { git = "https://github.com/paritytech/polkadot-sdk.git", branch = "release-polkadot-v1.18.0", default-features = false }
sp-std = { git = "https://github.com/paritytech/polkadot-sdk.git", branch = "release-polkadot-v1.18.0", default-features = false }
sp-runtime = { git = "https://github.com/paritytech/polkadot-sdk.git", branch = "release-polkadot-v1.18.0", default-features = false }

# Local dependencies
pallet-bazari-commerce = { path = "../bazari-commerce", default-features = false }

[features]
default = ["std"]
std = [
    "codec/std",
    "scale-info/std",
    "frame-support/std",
    "frame-system/std",
    "sp-std/std",
    "sp-runtime/std",
    "pallet-bazari-commerce/std",
]
```

### 3. Runtime Config

```rust
impl pallet_bazari_attestation::Config for Runtime {
    type RuntimeEvent = RuntimeEvent;
    type MaxSigners = ConstU32<5>;
    type MaxAttestationsPerOrder = ConstU32<10>;
    type MaxIpfsCidLength = ConstU32<64>;
    type MinThreshold = ConstU8<1>;
    type WeightInfo = ();
}
```

### 4. Core Logic (lib.rs snippet)

```rust
// Key implementation: Quorum validation
impl<T: Config> Pallet<T> {
    fn check_quorum(attestation: &Attestation<T::AccountId, BlockNumberFor<T>>) -> bool {
        attestation.signers.len() >= attestation.threshold as usize
    }
}
```

---

## 🧪 Critical Tests

```rust
#[test]
fn quorum_validation_works() {
    new_test_ext().execute_with(|| {
        // Submit proof with 2-of-3 threshold
        assert_ok!(BazariAttestation::submit_proof(
            RuntimeOrigin::signed(seller),
            order_id,
            ProofType::HandoffProof,
            b"QmIPFSHash".to_vec(),
            vec![seller, courier, buyer],
            2, // Threshold
        ));

        // First signature
        assert_ok!(BazariAttestation::co_sign(RuntimeOrigin::signed(seller), 0));

        let attestation = BazariAttestation::attestations(0).unwrap();
        assert_eq!(attestation.verified, false); // Not yet verified

        // Second signature (quorum reached)
        assert_ok!(BazariAttestation::co_sign(RuntimeOrigin::signed(courier), 0));

        let attestation = BazariAttestation::attestations(0).unwrap();
        assert_eq!(attestation.verified, true); // ✅ Verified!
    });
}
```

---

## 📚 References

- [SPEC.md](SPEC.md) - Full specification
- [INTEGRATION.md](INTEGRATION.md) - Backend integration
- See [bazari-commerce/IMPLEMENTATION.md](../bazari-commerce/IMPLEMENTATION.md) for similar structure
