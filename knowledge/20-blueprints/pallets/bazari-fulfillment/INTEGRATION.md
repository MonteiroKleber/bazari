# bazari-fulfillment Pallet - Backend Integration Guide

**Target**: Courier matching + assignment
**Timeline**: Week 13-14

## 🔧 BlockchainService Extension

```typescript
async registerCourier(account: string, stake: string, serviceAreas: number[]) {
  const extrinsic = this.api.tx.bazariFulfillment.registerCourier(stake, serviceAreas);
  const keyring = this.keyring.addFromAddress(account);
  return await this.signAndSend(extrinsic, keyring);
}

async assignCourier(orderId: number, courierAddress: string) {
  const extrinsic = this.api.tx.bazariFulfillment.assignCourier(orderId, courierAddress);
  return await this.signAndSend(extrinsic, this.platformAccount);
}

async updateReviewsMerkleRoot(courierAddress: string, merkleRoot: string) {
  const extrinsic = this.api.tx.bazariFulfillment.updateReviewsMerkleRoot(
    courierAddress,
    merkleRoot
  );
  return await this.signAndSend(extrinsic, this.platformAccount);
}

async getCourierData(courierAddress: string) {
  const courier = await this.api.query.bazariFulfillment.couriers(courierAddress);
  return courier.toJSON();
}
```

## 🎯 Matching Service

```typescript
@Injectable()
export class CourierMatchingService {
  async findBestCourier(orderLocation: { lat: number; lon: number }) {
    // Query all active couriers from PostgreSQL (synced from blockchain)
    const couriers = await this.prisma.courier.findMany({
      where: {
        isActive: true,
        stakeAmount: { gte: '1000' },
      },
      orderBy: { reputationScore: 'desc' },
    });

    // Find closest courier
    const best = couriers.find(c =>
      this.isWithinServiceArea(c.serviceAreas, orderLocation)
    );

    return best;
  }
}
```

---

## 🌟 ReviewService (Off-Chain Reviews + Merkle Root)

Create `apps/api/src/services/review/review.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { MerkleTree } from 'merkletreejs';
import * as crypto from 'crypto';

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);
  private readonly MERKLE_UPDATE_THRESHOLD = 100; // Update on-chain every 100 reviews

  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService,
  ) {}

  /**
   * Create a review (off-chain in PostgreSQL)
   */
  async createReview(data: {
    orderId: string;
    courierId: string;
    rating: number; // 1-5
    comment: string;
    reviewerId: string;
  }) {
    // Validate rating
    if (data.rating < 1 || data.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Create review in PostgreSQL
    const review = await this.prisma.courierReview.create({
      data: {
        orderId: data.orderId,
        courierId: data.courierId,
        rating: data.rating,
        comment: data.comment,
        reviewerId: data.reviewerId,
        createdAt: new Date(),
      },
    });

    this.logger.log(`Review created: ${review.id} for courier ${data.courierId}`);

    // Check if we need to update Merkle root on-chain
    await this.checkAndUpdateMerkleRoot(data.courierId);

    // Update reputation score in PostgreSQL (cache)
    await this.updateReputationScore(data.courierId);

    return review;
  }

  /**
   * Check if Merkle root needs update (every 100 reviews)
   */
  private async checkAndUpdateMerkleRoot(courierId: string) {
    const courier = await this.prisma.courier.findUnique({
      where: { id: courierId },
    });

    const reviewCount = await this.prisma.courierReview.count({
      where: { courierId },
    });

    // Update on-chain every MERKLE_UPDATE_THRESHOLD reviews
    if (reviewCount % this.MERKLE_UPDATE_THRESHOLD === 0) {
      this.logger.log(`Updating Merkle root for courier ${courierId} (${reviewCount} reviews)`);
      await this.updateMerkleRootOnChain(courierId);
    }
  }

  /**
   * Calculate and update Merkle root on-chain
   */
  async updateMerkleRootOnChain(courierId: string) {
    // Get all reviews for courier
    const reviews = await this.prisma.courierReview.findMany({
      where: { courierId },
      orderBy: { createdAt: 'asc' },
    });

    if (reviews.length === 0) {
      this.logger.warn(`No reviews found for courier ${courierId}`);
      return;
    }

    // Create leaves (hash of each review)
    const leaves = reviews.map(review => {
      const data = JSON.stringify({
        id: review.id,
        orderId: review.orderId,
        rating: review.rating,
        comment: review.comment,
        reviewerId: review.reviewerId,
        createdAt: review.createdAt.toISOString(),
      });
      return crypto.createHash('sha256').update(data).digest();
    });

    // Build Merkle tree
    const tree = new MerkleTree(leaves, crypto.createHash('sha256'));
    const root = tree.getRoot();

    // Get courier profile to get wallet address
    const courier = await this.prisma.courier.findUnique({
      where: { id: courierId },
      include: { profile: true },
    });

    // Update on-chain
    const txHash = await this.blockchain.updateReviewsMerkleRoot(
      courier.profile.walletAddress,
      '0x' + root.toString('hex'),
    );

    // Store root in PostgreSQL for quick lookup
    await this.prisma.courier.update({
      where: { id: courierId },
      data: {
        reviewsMerkleRoot: '0x' + root.toString('hex'),
        lastMerkleUpdate: new Date(),
      },
    });

    this.logger.log(`Merkle root updated on-chain for courier ${courierId}: ${txHash}`);

    return { txHash, merkleRoot: '0x' + root.toString('hex') };
  }

  /**
   * Generate Merkle proof for a specific review (for disputes)
   */
  async generateMerkleProof(reviewId: string) {
    const review = await this.prisma.courierReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    // Get all reviews for this courier
    const allReviews = await this.prisma.courierReview.findMany({
      where: { courierId: review.courierId },
      orderBy: { createdAt: 'asc' },
    });

    // Create leaves
    const leaves = allReviews.map(r => {
      const data = JSON.stringify({
        id: r.id,
        orderId: r.orderId,
        rating: r.rating,
        comment: r.comment,
        reviewerId: r.reviewerId,
        createdAt: r.createdAt.toISOString(),
      });
      return crypto.createHash('sha256').update(data).digest();
    });

    // Build tree
    const tree = new MerkleTree(leaves, crypto.createHash('sha256'));

    // Find index of our review
    const index = allReviews.findIndex(r => r.id === reviewId);
    const leaf = leaves[index];
    const proof = tree.getProof(leaf);

    return {
      review,
      proof: proof.map(p => ({
        position: p.position,
        data: '0x' + p.data.toString('hex'),
      })),
      root: '0x' + tree.getRoot().toString('hex'),
    };
  }

  /**
   * Verify Merkle proof (for disputes)
   */
  verifyMerkleProof(leaf: string, proof: any[], root: string): boolean {
    const tree = new MerkleTree([], crypto.createHash('sha256'));
    return tree.verify(proof, leaf, root);
  }

  /**
   * Update reputation score (aggregated from reviews)
   */
  private async updateReputationScore(courierId: string) {
    const reviews = await this.prisma.courierReview.findMany({
      where: { courierId },
    });

    if (reviews.length === 0) {
      return;
    }

    // Calculate average rating (0-1000 scale)
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const reputationScore = Math.round((avgRating / 5) * 1000);

    // Update in PostgreSQL (cache)
    await this.prisma.courier.update({
      where: { id: courierId },
      data: { reputationScore },
    });
  }

  /**
   * Get reviews for a courier
   */
  async getCourierReviews(courierId: string, limit = 50, offset = 0) {
    const reviews = await this.prisma.courierReview.findMany({
      where: { courierId },
      include: {
        reviewer: {
          select: {
            id: true,
            username: true,
            profile: { select: { avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.courierReview.count({
      where: { courierId },
    });

    return { reviews, total };
  }
}
```

---

## 📍 GPS Tracking Service (Off-Chain)

Create `apps/api/src/services/delivery-tracking/tracking.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DeliveryTrackingService {
  private readonly logger = new Logger(DeliveryTrackingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Add GPS waypoint (off-chain)
   */
  async addWaypoint(data: {
    orderId: string;
    courierId: string;
    lat: number;
    lon: number;
    accuracy?: number;
    timestamp?: Date;
  }) {
    const waypoint = await this.prisma.deliveryWaypoint.create({
      data: {
        orderId: data.orderId,
        courierId: data.courierId,
        latitude: data.lat,
        longitude: data.lon,
        accuracy: data.accuracy || 10,
        timestamp: data.timestamp || new Date(),
      },
    });

    this.logger.log(`Waypoint added for order ${data.orderId}: (${data.lat}, ${data.lon})`);

    return waypoint;
  }

  /**
   * Get tracking history for an order
   */
  async getTrackingHistory(orderId: string) {
    const waypoints = await this.prisma.deliveryWaypoint.findMany({
      where: { orderId },
      orderBy: { timestamp: 'asc' },
    });

    return waypoints;
  }

  /**
   * Get current location of courier
   */
  async getCourierLocation(courierId: string) {
    const latestWaypoint = await this.prisma.deliveryWaypoint.findFirst({
      where: { courierId },
      orderBy: { timestamp: 'desc' },
    });

    return latestWaypoint;
  }

  /**
   * Calculate ETA (off-chain)
   */
  async calculateETA(orderId: string, destinationLat: number, destinationLon: number) {
    const currentLocation = await this.prisma.deliveryWaypoint.findFirst({
      where: { orderId },
      orderBy: { timestamp: 'desc' },
    });

    if (!currentLocation) {
      return null;
    }

    // Simple haversine distance calculation
    const distance = this.calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      destinationLat,
      destinationLon,
    );

    // Assume average speed of 30 km/h
    const etaMinutes = Math.round((distance / 30) * 60);

    return {
      distance,
      etaMinutes,
      currentLocation: {
        lat: currentLocation.latitude,
        lon: currentLocation.longitude,
      },
    };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
```

---

## 🔄 Merkle Root Update Worker

Create `apps/api/src/workers/merkle-root-update.worker.ts`:

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReviewService } from '../services/review/review.service';
import { PrismaService } from '../services/prisma/prisma.service';

@Injectable()
export class MerkleRootUpdateWorker implements OnModuleInit {
  private readonly logger = new Logger(MerkleRootUpdateWorker.name);

  constructor(
    private reviewService: ReviewService,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    this.logger.log('Merkle root update worker initialized');
  }

  /**
   * Run every hour to check if any couriers need Merkle root update
   */
  @Cron(CronExpression.EVERY_HOUR)
  async updateStaleRoots() {
    this.logger.log('Checking for stale Merkle roots...');

    // Find couriers with reviews but outdated Merkle roots
    const couriers = await this.prisma.courier.findMany({
      where: {
        OR: [
          { lastMerkleUpdate: null },
          {
            lastMerkleUpdate: {
              lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
            },
          },
        ],
      },
    });

    for (const courier of couriers) {
      const reviewCount = await this.prisma.courierReview.count({
        where: { courierId: courier.id },
      });

      if (reviewCount > 0) {
        try {
          await this.reviewService.updateMerkleRootOnChain(courier.id);
          this.logger.log(`Updated Merkle root for courier ${courier.id}`);
        } catch (error) {
          this.logger.error(`Failed to update Merkle root for courier ${courier.id}:`, error);
        }
      }
    }
  }
}
```

---

## ✅ Integration Checklist
- [ ] Courier registration UI
- [ ] Auto-assignment on order creation
- [ ] Reputation updates after delivery
- [ ] Slashing via admin panel
- [ ] Review creation endpoint (POST /api/couriers/:id/reviews)
- [ ] Merkle root update worker (hourly cron)
- [ ] GPS tracking endpoint (POST /api/deliveries/:id/waypoint)
- [ ] ETA calculation endpoint (GET /api/deliveries/:id/eta)

---

## 📚 Database Schema (PostgreSQL)

Add to `prisma/schema.prisma`:

```prisma
model CourierReview {
  id         String   @id @default(cuid())
  orderId    String
  courierId  String
  reviewerId String
  rating     Int      // 1-5
  comment    String?
  createdAt  DateTime @default(now())

  order    Order   @relation(fields: [orderId], references: [id])
  courier  Courier @relation(fields: [courierId], references: [id])
  reviewer User    @relation(fields: [reviewerId], references: [id])

  @@index([courierId])
  @@index([orderId])
}

model DeliveryWaypoint {
  id        String   @id @default(cuid())
  orderId   String
  courierId String
  latitude  Float
  longitude Float
  accuracy  Float    @default(10)
  timestamp DateTime @default(now())

  order   Order   @relation(fields: [orderId], references: [id])
  courier Courier @relation(fields: [courierId], references: [id])

  @@index([orderId])
  @@index([courierId])
  @@index([timestamp])
}

model Courier {
  // ... existing fields
  reviewsMerkleRoot String?   @default("0x0000000000000000000000000000000000000000000000000000000000000000")
  lastMerkleUpdate  DateTime?

  reviews  CourierReview[]
  waypoints DeliveryWaypoint[]
}
```

---

## 📚 References
- [SPEC.md](SPEC.md) - Full specification
- [GPS-TRACKING.md](GPS-TRACKING.md) - GPS tracking architecture
- [REVIEWS-ARCHITECTURE.md](REVIEWS-ARCHITECTURE.md) - Reviews + Merkle tree
- [bazari-attestation](../bazari-attestation/INTEGRATION.md) - GPS proofs on-chain
