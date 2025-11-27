# Reviews Architecture - Merkle Tree + Off-Chain Storage

**Decision**: Reviews stored off-chain (PostgreSQL), Merkle root anchored on-chain

---

## 🎯 Architecture Decision

### ❌ Why NOT Full On-Chain Reviews

**Cost Analysis**:
- Average review: ~200 bytes (rating + comment)
- 1000 reviews/day × $0.05/tx = **$50/day = $18k/year** 💸
- vs Off-chain: **$0** (PostgreSQL storage is essentially free)

**Query Performance**:
- On-chain: Query 1000 reviews = 1000 RPC calls = **10+ seconds**
- Off-chain: Single SQL query = **< 50ms**

**User Experience**:
- On-chain: Wait for block confirmation (~6s) before review appears
- Off-chain: Instant feedback

---

## ✅ Hybrid Solution (Recommended)

### On-Chain (bazari-fulfillment pallet)
```rust
pub struct Courier {
    // ... other fields
    pub reviews_merkle_root: [u8; 32], // ✅ Anchor of all reviews
}
```

**Update frequency**: Every 100 reviews (configurable)

### Off-Chain (PostgreSQL)
```prisma
model CourierReview {
  id         String   @id @default(cuid())
  orderId    String
  courierId  String
  reviewerId String
  rating     Int      // 1-5 stars
  comment    String?
  createdAt  DateTime @default(now())

  @@index([courierId])
  @@index([orderId])
}
```

---

## 🌳 Merkle Tree Implementation

### 1. Review Hashing

```typescript
function hashReview(review: CourierReview): Buffer {
  const data = JSON.stringify({
    id: review.id,
    orderId: review.orderId,
    rating: review.rating,
    comment: review.comment,
    reviewerId: review.reviewerId,
    createdAt: review.createdAt.toISOString(),
  });

  return crypto.createHash('sha256').update(data).digest();
}
```

### 2. Merkle Tree Construction

```typescript
import { MerkleTree } from 'merkletreejs';
import * as crypto from 'crypto';

async function buildMerkleTree(courierId: string): Promise<MerkleTree> {
  // Get all reviews for courier (sorted by createdAt)
  const reviews = await prisma.courierReview.findMany({
    where: { courierId },
    orderBy: { createdAt: 'asc' },
  });

  // Hash each review
  const leaves = reviews.map(review => hashReview(review));

  // Build tree
  const tree = new MerkleTree(leaves, crypto.createHash('sha256'));

  return tree;
}
```

### 3. Root Calculation

```typescript
const tree = await buildMerkleTree(courierId);
const root = tree.getRoot(); // Buffer
const rootHex = '0x' + root.toString('hex'); // 0x1234abcd...
```

---

## 🔄 Update Flow

### Trigger: Every 100 Reviews

```typescript
@Injectable()
export class ReviewService {
  private readonly MERKLE_UPDATE_THRESHOLD = 100;

  async createReview(data: CreateReviewDto) {
    // 1. Save review to PostgreSQL
    const review = await this.prisma.courierReview.create({ data });

    // 2. Check if update needed
    const reviewCount = await this.prisma.courierReview.count({
      where: { courierId: data.courierId },
    });

    if (reviewCount % this.MERKLE_UPDATE_THRESHOLD === 0) {
      await this.updateMerkleRootOnChain(data.courierId);
    }

    return review;
  }
}
```

### Update Process

```typescript
async updateMerkleRootOnChain(courierId: string) {
  // 1. Build Merkle tree
  const tree = await buildMerkleTree(courierId);
  const root = tree.getRoot();

  // 2. Get courier wallet address
  const courier = await this.prisma.courier.findUnique({
    where: { id: courierId },
    include: { profile: true },
  });

  // 3. Update on-chain
  const txHash = await this.blockchain.updateReviewsMerkleRoot(
    courier.profile.walletAddress,
    '0x' + root.toString('hex'),
  );

  // 4. Cache root in PostgreSQL
  await this.prisma.courier.update({
    where: { id: courierId },
    data: {
      reviewsMerkleRoot: '0x' + root.toString('hex'),
      lastMerkleUpdate: new Date(),
    },
  });

  return { txHash, merkleRoot: '0x' + root.toString('hex') };
}
```

---

## 🔍 Merkle Proof Generation (For Disputes)

### Generate Proof

```typescript
async generateMerkleProof(reviewId: string) {
  // 1. Get review
  const review = await this.prisma.courierReview.findUnique({
    where: { id: reviewId },
  });

  // 2. Get all reviews for courier
  const allReviews = await this.prisma.courierReview.findMany({
    where: { courierId: review.courierId },
    orderBy: { createdAt: 'asc' },
  });

  // 3. Build tree
  const leaves = allReviews.map(r => hashReview(r));
  const tree = new MerkleTree(leaves, crypto.createHash('sha256'));

  // 4. Generate proof
  const index = allReviews.findIndex(r => r.id === reviewId);
  const leaf = leaves[index];
  const proof = tree.getProof(leaf);

  return {
    review,
    proof: proof.map(p => ({
      position: p.position, // 'left' or 'right'
      data: '0x' + p.data.toString('hex'),
    })),
    root: '0x' + tree.getRoot().toString('hex'),
  };
}
```

### Verify Proof

```typescript
function verifyMerkleProof(
  reviewHash: string,
  proof: MerkleProof[],
  rootOnChain: string
): boolean {
  const tree = new MerkleTree([], crypto.createHash('sha256'));
  return tree.verify(proof, reviewHash, rootOnChain);
}
```

### Usage in Dispute

```typescript
// User claims courier has bad reviews
const { review, proof, root } = await reviewService.generateMerkleProof(reviewId);

// Get on-chain root
const courierData = await blockchain.getCourierData(courierAddress);
const onChainRoot = courierData.reviews_merkle_root;

// Verify proof
const isValid = verifyMerkleProof(
  hashReview(review),
  proof,
  onChainRoot
);

if (isValid) {
  // ✅ Review is authentic
  // Use in dispute resolution
} else {
  // ❌ Review was tampered with or doesn't exist
}
```

---

## 📊 Example: Merkle Tree Structure

```
Reviews for Courier A:
- Review 1 (5 stars, "Great!")     → Hash: 0xabc123
- Review 2 (4 stars, "Good")       → Hash: 0xdef456
- Review 3 (5 stars, "Excellent!") → Hash: 0x789ghi
- Review 4 (3 stars, "OK")         → Hash: 0xjkl012

Merkle Tree:
                    ROOT: 0xROOT
                   /            \
           0xBRANCH1           0xBRANCH2
           /        \           /        \
     0xabc123  0xdef456   0x789ghi  0xjkl012
    (Review1) (Review2)  (Review3)  (Review4)

Proof for Review 2:
[
  { position: 'left', data: '0xabc123' },   // Sibling
  { position: 'right', data: '0xBRANCH2' }  // Uncle
]

Verification:
hash(0xabc123 + 0xdef456) = 0xBRANCH1
hash(0xBRANCH1 + 0xBRANCH2) = 0xROOT ✅
```

---

## 🔒 Security Considerations

### Tamper Resistance

**Scenario**: Admin tries to delete bad review from PostgreSQL

1. Review is removed from database
2. Merkle root changes (one leaf missing)
3. **On-chain root doesn't match**
4. Dispute proof verification fails
5. **Tampering is detected** ✅

### Replay Attacks

**Scenario**: User tries to submit old review proof

1. User generates proof with old root
2. On-chain root has been updated (newer reviews added)
3. **Proof verification fails** ✅

### Front-Running

**Scenario**: User submits fake review, immediately starts dispute before root update

**Protection**:
1. Reviews have `createdAt` timestamp
2. Disputes require ≥24h cooling period
3. Merkle root updated within 1 hour (cron job)
4. **Fake review won't be in tree** ✅

---

## 🧪 Testing

### Unit Tests

```typescript
describe('MerkleTree', () => {
  it('should generate consistent root', async () => {
    const reviews = [
      { id: '1', rating: 5, comment: 'Great!' },
      { id: '2', rating: 4, comment: 'Good' },
    ];

    const tree1 = buildTreeFromReviews(reviews);
    const tree2 = buildTreeFromReviews(reviews);

    expect(tree1.getRoot()).toEqual(tree2.getRoot());
  });

  it('should verify valid proof', async () => {
    const tree = buildTreeFromReviews(reviews);
    const leaf = hashReview(reviews[0]);
    const proof = tree.getProof(leaf);
    const root = tree.getRoot();

    const isValid = tree.verify(proof, leaf, root);
    expect(isValid).toBe(true);
  });

  it('should reject invalid proof', async () => {
    const tree = buildTreeFromReviews(reviews);
    const fakeLeaf = Buffer.from('fake');
    const proof = tree.getProof(hashReview(reviews[0]));
    const root = tree.getRoot();

    const isValid = tree.verify(proof, fakeLeaf, root);
    expect(isValid).toBe(false);
  });
});
```

### Integration Tests

```typescript
describe('ReviewService', () => {
  it('should update Merkle root every 100 reviews', async () => {
    const courierId = 'courier_1';

    // Create 99 reviews
    for (let i = 0; i < 99; i++) {
      await service.createReview({
        courierId,
        rating: 5,
        comment: `Review ${i}`,
      });
    }

    // Merkle root should still be null
    let courier = await prisma.courier.findUnique({ where: { id: courierId } });
    expect(courier.reviewsMerkleRoot).toBeNull();

    // Create 100th review
    await service.createReview({
      courierId,
      rating: 5,
      comment: 'Review 100',
    });

    // Merkle root should be updated
    courier = await prisma.courier.findUnique({ where: { id: courierId } });
    expect(courier.reviewsMerkleRoot).not.toBeNull();
    expect(courier.reviewsMerkleRoot).toMatch(/^0x[0-9a-f]{64}$/);
  });
});
```

---

## 📈 Performance Optimization

### Incremental Updates (Future Enhancement)

Instead of rebuilding entire tree every time:

```typescript
// Store tree structure in PostgreSQL
model MerkleNode {
  id       String  @id
  courierId String
  level    Int     // 0 = leaf, 1 = branch, etc
  index    Int
  hash     String
  leftChild String?
  rightChild String?

  @@unique([courierId, level, index])
}

// Only update affected branches
async function incrementalUpdate(courierId: string, newReview: Review) {
  const leaf = hashReview(newReview);

  // Insert new leaf
  await prisma.merkleNode.create({
    data: { courierId, level: 0, hash: leaf.toString('hex') },
  });

  // Update only parent branches (O(log n) vs O(n))
  await updateBranches(courierId, leaf);
}
```

---

## 💡 Best Practices

### For Backend Developers
1. Always sort reviews by `createdAt` before building tree
2. Use consistent hashing algorithm (SHA-256)
3. Store root in PostgreSQL for quick validation
4. Run Merkle update worker hourly (cron job)
5. Log all root updates for audit trail

### For Frontend Developers
1. Show "Review pending verification" for new reviews
2. Display Merkle root verification status in dispute UI
3. Explain to users why reviews appear instantly (off-chain)
4. Show last Merkle root update timestamp

### For Auditors
1. Verify Merkle tree implementation matches spec
2. Check root update frequency (should be deterministic)
3. Test proof generation/verification
4. Validate sorting consistency

---

## 📚 References

- [SPEC.md](SPEC.md) - Courier struct with reviews_merkle_root
- [INTEGRATION.md](INTEGRATION.md) - ReviewService implementation
- [bazari-dispute/SPEC.md](../bazari-dispute/SPEC.md) - Merkle proofs in disputes
- [MerkleTree.js](https://github.com/merkletreejs/merkletreejs) - Library used

---

**Decision Summary**: Merkle tree anchoring provides **cryptographic proof of review authenticity** while keeping **99.9% of costs off-chain**. Users get instant UX, disputes get tamper-proof evidence. ✅
