# bazari-fulfillment Pallet - Implementation Guide

**Estimated Time**: 1-2 weeks | **Difficulty**: Medium

## 📋 Quick Checklist
- [ ] Week 1: Courier registration + staking (3 days)
- [ ] Week 1: Assignment + completion (2 days)
- [ ] Week 2: Slashing + matching algorithm (2 days)
- [ ] Week 2: Merkle root update extrinsic (1 day)
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

### Merkle Root Update Implementation

```rust
#[pallet::call_index(4)]
#[pallet::weight(10_000)]
pub fn update_reviews_merkle_root(
    origin: OriginFor<T>,
    courier: T::AccountId,
    new_merkle_root: [u8; 32],
) -> DispatchResult {
    ensure_root(origin)?; // Only system/worker can call

    Couriers::<T>::try_mutate(&courier, |maybe_courier| {
        let courier_data = maybe_courier.as_mut()
            .ok_or(Error::<T>::CourierNotFound)?;

        // Update Merkle root
        let old_root = courier_data.reviews_merkle_root;
        courier_data.reviews_merkle_root = new_merkle_root;

        Self::deposit_event(Event::ReviewsMerkleRootUpdated {
            courier: courier.clone(),
            merkle_root: new_merkle_root,
        });

        Ok(())
    })
}
```

**Usage**:
- Called by backend worker after accumulating reviews
- Anchors Merkle root of off-chain reviews on-chain
- Enables Merkle proof verification in disputes

---

### Critical Tests

#### Test 1: Slashing Deactivates Courier
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

#### Test 2: Merkle Root Update
```rust
#[test]
fn update_reviews_merkle_root_works() {
    new_test_ext().execute_with(|| {
        // Register courier
        let courier = account(1);
        assert_ok!(BazariFulfillment::register_courier(
            RuntimeOrigin::signed(courier.clone()),
            1000,
            vec![],
        ));

        // Initial merkle root should be zero
        let initial_data = BazariFulfillment::couriers(&courier).unwrap();
        assert_eq!(initial_data.reviews_merkle_root, [0u8; 32]);

        // Update merkle root
        let new_root = [1u8; 32];
        assert_ok!(BazariFulfillment::update_reviews_merkle_root(
            RuntimeOrigin::root(),
            courier.clone(),
            new_root,
        ));

        // Verify update
        let updated_data = BazariFulfillment::couriers(&courier).unwrap();
        assert_eq!(updated_data.reviews_merkle_root, new_root);

        // Verify event
        System::assert_last_event(
            Event::ReviewsMerkleRootUpdated {
                courier,
                merkle_root: new_root,
            }.into()
        );
    });
}
```

#### Test 3: Non-Root Cannot Update Merkle Root
```rust
#[test]
fn non_root_cannot_update_merkle_root() {
    new_test_ext().execute_with(|| {
        let courier = account(1);
        let attacker = account(2);

        // Register courier
        assert_ok!(BazariFulfillment::register_courier(
            RuntimeOrigin::signed(courier.clone()),
            1000,
            vec![],
        ));

        // Attacker tries to update merkle root
        assert_noop!(
            BazariFulfillment::update_reviews_merkle_root(
                RuntimeOrigin::signed(attacker),
                courier,
                [1u8; 32],
            ),
            BadOrigin
        );
    });
}
```

## 📚 References
- [SPEC.md](SPEC.md) - Full specification
- [INTEGRATION.md](INTEGRATION.md) - Backend integration
