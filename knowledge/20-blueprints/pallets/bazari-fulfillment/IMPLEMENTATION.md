# bazari-fulfillment Pallet - Implementation Guide

**Estimated Time**: 1-2 weeks | **Difficulty**: Medium

## 📋 Quick Checklist
- [ ] Week 1: Courier registration + staking (3 days)
- [ ] Week 1: Assignment + completion (2 days)
- [ ] Week 2: Slashing + matching algorithm (3 days)
- [ ] Week 2: Tests + benchmarks (2 days)

## 🚀 Key Implementation

### Runtime Config
```rust
impl pallet_bazari_fulfillment::Config for Runtime {
    type RuntimeEvent = RuntimeEvent;
    type Currency = Balances;
    type MinCourierStake = ConstU128<1000_000_000_000_000>; // 1000 BZR
    type MaxServiceAreas = ConstU32<10>;
    type MaxDeliveriesPerCourier = ConstU32<100>;
    type DAOOrigin = EnsureRoot<AccountId>;
    type WeightInfo = ();
}
```

### Critical Test
```rust
#[test]
fn slashing_deactivates_courier() {
    new_test_ext().execute_with(|| {
        // Register courier with 1000 BZR
        assert_ok!(BazariFulfillment::register_courier(
            RuntimeOrigin::signed(courier),
            1000,
            vec![geohash],
        ));

        // Slash 500 BZR (below minimum)
        assert_ok!(BazariFulfillment::slash_courier(
            RuntimeOrigin::root(),
            courier,
            600, // Leaves 400 BZR < 1000 minimum
            b"Failed delivery".to_vec(),
        ));

        let courier_data = BazariFulfillment::couriers(courier).unwrap();
        assert_eq!(courier_data.is_active, false); // ✅ Deactivated
    });
}
```

## 📚 References
- [SPEC.md](SPEC.md) - Full specification
- [INTEGRATION.md](INTEGRATION.md) - Backend integration
