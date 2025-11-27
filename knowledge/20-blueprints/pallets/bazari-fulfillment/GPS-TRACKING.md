# GPS Tracking - Hybrid Architecture

**Decision**: GPS tracking off-chain, final proofs on-chain via `bazari-attestation`

---

## 🎯 Architecture Decision

### ❌ Why NOT Full On-Chain GPS Tracking

**Cost Analysis**:
- Typical delivery: 30-60 minutes
- Update frequency: Every 30 seconds
- Total waypoints: 60-120 per delivery
- Cost per tx: ~$0.01-0.10
- **Total cost per delivery: $0.60-12.00** 💸

**Blockchain Bloat**:
- 120 waypoints × 100 bytes = 12 KB per delivery
- 1000 deliveries/day = 12 MB/day = 4.4 GB/year
- **Unsustainable for blockchain storage**

**Security**:
- GPS can be spoofed (fake location apps)
- Intermediate waypoints don't prove delivery
- Only **initial pickup + final delivery** matter for disputes

---

## ✅ Hybrid Solution (Recommended)

### On-Chain (via bazari-attestation)
```rust
// Initial handoff proof (seller → courier)
HandoffProof {
    location: { lat: -23.5505, lon: -46.6333 },
    photos: ["QmPhoto1"],
    signatures: [seller, courier], // 2-of-2
    timestamp: block_number,
}

// Final delivery proof (courier → buyer)
DeliveryProof {
    location: { lat: -23.5600, lon: -46.6400 },
    photos: ["QmPhoto2", "QmPhoto3"],
    signatures: [courier, buyer], // 2-of-2
    timestamp: block_number,
}
```

### Off-Chain (PostgreSQL)
```prisma
model DeliveryWaypoint {
  id        String   @id
  orderId   String
  courierId String
  latitude  Float
  longitude Float
  accuracy  Float
  timestamp DateTime

  @@index([orderId, timestamp])
}
```

---

## 🔄 Integration Flow

### 1. Real-Time Tracking (Off-Chain)

**Mobile App (Courier)**:
```typescript
// Send GPS update every 30 seconds
setInterval(async () => {
  const location = await getCurrentPosition();
  await apiClient.post('/api/deliveries/:orderId/waypoint', {
    lat: location.coords.latitude,
    lon: location.coords.longitude,
    accuracy: location.coords.accuracy,
  });
}, 30000);
```

**Backend (DeliveryTrackingService)**:
```typescript
async addWaypoint(orderId: string, courierId: string, lat: number, lon: number) {
  // Store in PostgreSQL (fast, cheap)
  return await this.prisma.deliveryWaypoint.create({
    data: { orderId, courierId, latitude: lat, longitude: lon },
  });
}
```

**Frontend (Buyer/Seller)**:
```typescript
// Live map with courier location (like Uber/iFood)
const { data: tracking } = useQuery(
  ['tracking', orderId],
  () => apiClient.get(`/api/deliveries/${orderId}/tracking`),
  { refetchInterval: 10000 } // Update every 10 seconds
);

<Map>
  <Polyline coordinates={tracking.waypoints} />
  <Marker coordinate={tracking.currentLocation} />
</Map>
```

---

### 2. Proof Submission (On-Chain)

**Handoff (Seller → Courier)**:
```typescript
// When courier picks up package
const handoffProof = await ipfsService.upload({
  orderId,
  proofType: 'HandoffProof',
  location: getCurrentGPS(),
  photos: [await takePhoto()],
});

// Submit to blockchain
await blockchainService.submitProof(
  orderId,
  'HandoffProof',
  handoffProof.cid,
  [sellerWallet, courierWallet],
  2 // 2-of-2 quorum
);

// Both sign
await blockchainService.coSignProof(proofId);
```

**Delivery (Courier → Buyer)**:
```typescript
// When buyer receives package
const deliveryProof = await ipfsService.upload({
  orderId,
  proofType: 'DeliveryProof',
  location: getCurrentGPS(),
  photos: [await takePhoto(), await getSignature()],
});

await blockchainService.submitProof(
  orderId,
  'DeliveryProof',
  deliveryProof.cid,
  [courierWallet, buyerWallet],
  2
);
```

---

## 📊 Comparison: Full On-Chain vs Hybrid

| Feature | Full On-Chain | Hybrid (Recommended) |
|---------|---------------|----------------------|
| **Waypoints Storage** | Blockchain | PostgreSQL |
| **Cost per Delivery** | $0.60-12.00 | $0.02 (2 proofs only) |
| **Blockchain Bloat** | 12 KB/delivery | 200 bytes/delivery |
| **Real-Time UX** | ❌ Slow (6s block time) | ✅ Instant |
| **Dispute Evidence** | ✅ All waypoints | ✅ Initial + Final GPS |
| **Spoofing Risk** | ⚠️ Same (GPS can be faked) | ⚠️ Same |
| **Immutability** | ✅ Waypoints immutable | ✅ Proofs immutable |

---

## 🔒 Security Considerations

### GPS Spoofing Protection

**Problem**: Courier can fake GPS location
**Solutions**:
1. **Co-signatures**: Seller + Courier sign handoff, Courier + Buyer sign delivery
   - Fake location requires collusion of 2 parties
2. **Photo evidence**: IPFS CID of photos with EXIF location
3. **Timestamp verification**: Block number ensures timing consistency
4. **Reputation system**: Pattern of fake deliveries → slash stake

### Data Integrity

**Off-Chain Waypoints**:
- ⚠️ Can be modified in PostgreSQL
- ✅ Not used in disputes (only for UX)
- ✅ Final proofs are on-chain (immutable)

**On-Chain Proofs**:
- ✅ IPFS CID is content-addressed (immutable)
- ✅ Co-signatures prevent unilateral fraud
- ✅ Quorum validation (2-of-2)

---

## 🧪 Testing Strategy

### Off-Chain Tracking
```typescript
describe('DeliveryTrackingService', () => {
  it('should add waypoint', async () => {
    const waypoint = await service.addWaypoint({
      orderId: 'order_123',
      courierId: 'courier_1',
      lat: -23.5505,
      lon: -46.6333,
    });

    expect(waypoint).toBeDefined();
    expect(waypoint.latitude).toBe(-23.5505);
  });

  it('should calculate ETA', async () => {
    // Add waypoints along route
    await service.addWaypoint({ orderId, lat: -23.5505, lon: -46.6333 });

    const eta = await service.calculateETA(orderId, -23.5600, -46.6400);

    expect(eta.distance).toBeCloseTo(1.2, 1); // ~1.2 km
    expect(eta.etaMinutes).toBeCloseTo(2, 0); // ~2 minutes at 30 km/h
  });
});
```

### On-Chain Proofs
```rust
#[test]
fn handoff_proof_requires_co_signatures() {
    new_test_ext().execute_with(|| {
        let orderId = 1;
        let seller = account(1);
        let courier = account(2);

        // Submit proof
        assert_ok!(BazariAttestation::submit_proof(
            RuntimeOrigin::signed(seller.clone()),
            orderId,
            ProofType::HandoffProof,
            b"QmHandoffCID".to_vec(),
            vec![seller.clone(), courier.clone()],
            2, // 2-of-2
        ));

        // Not verified yet
        let proof = BazariAttestation::attestations(0).unwrap();
        assert!(!proof.verified);

        // Seller signs
        assert_ok!(BazariAttestation::co_sign(
            RuntimeOrigin::signed(seller),
            0,
        ));

        // Still not verified (1/2)
        let proof = BazariAttestation::attestations(0).unwrap();
        assert!(!proof.verified);

        // Courier signs
        assert_ok!(BazariAttestation::co_sign(
            RuntimeOrigin::signed(courier),
            0,
        ));

        // Now verified (2/2)
        let proof = BazariAttestation::attestations(0).unwrap();
        assert!(proof.verified); // ✅
    });
}
```

---

## 💡 Best Practices

### For Couriers
1. Enable location permissions in app
2. Take clear photos at pickup/delivery
3. Get signatures from seller/buyer
4. Keep GPS enabled during delivery

### For Developers
1. Store waypoints with timestamps (for replay)
2. Calculate ETA conservatively (account for traffic)
3. Show last known location if GPS unavailable
4. Implement offline queue for waypoints
5. Validate GPS accuracy (reject if > 50m)

### For Disputes
1. Show waypoint map in dispute UI
2. Compare on-chain proof locations with waypoint patterns
3. Flag large location jumps (teleportation = spoofing)
4. Use Merkle proof to validate courier reviews

---

## 📚 References

- [bazari-attestation/SPEC.md](../bazari-attestation/SPEC.md) - On-chain proofs
- [INTEGRATION.md](INTEGRATION.md) - DeliveryTrackingService implementation
- [REVIEWS-ARCHITECTURE.md](REVIEWS-ARCHITECTURE.md) - Reviews Merkle tree

---

**Decision Summary**: Hybrid architecture provides **99% of UX benefits** at **5% of the cost** while maintaining **100% security for disputes**. ✅
