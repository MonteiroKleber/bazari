# bazari-affiliate Pallet - Backend Integration Guide

**Target**: NestJS API + Referral tracking
**Timeline**: Week 15-16

---

## 🔧 Step 1: Extend BlockchainService

Add to `apps/api/src/services/blockchain/blockchain.service.ts`:

```typescript
/**
 * Register referral relationship
 */
async registerReferral(
  referee: string,
  referrer: string,
): Promise<string> {
  const extrinsic = this.api.tx.bazariAffiliate.registerReferral(referrer);
  const refereeKeyring = this.keyring.addFromAddress(referee);
  const result = await this.signAndSend(extrinsic, refereeKeyring);

  return result.status.asInBlock.toString();
}

/**
 * Distribute commissions for an order
 */
async distributeCommissions(
  orderId: number,
  buyer: string,
  orderAmount: string,
): Promise<string> {
  const extrinsic = this.api.tx.bazariAffiliate.distributeCommissions(
    orderId,
    buyer,
    orderAmount,
  );

  // This is called by system/root account
  const result = await this.signAndSend(extrinsic, this.platformAccount);
  return result.status.asInBlock.toString();
}

/**
 * Get affiliate statistics
 */
async getAffiliateStats(account: string) {
  const stats = await this.api.query.bazariAffiliate.affiliateStats(account);
  return stats.toJSON();
}

/**
 * Get referral tree (direct referrals)
 */
async getDirectReferrals(account: string): Promise<string[]> {
  const referrals = await this.api.query.bazariAffiliate.directReferrals(account);
  return referrals.toJSON() as string[];
}

/**
 * Get commission history for an order
 */
async getOrderCommissions(orderId: number) {
  const commissions = await this.api.query.bazariAffiliate.orderCommissions(orderId);
  return commissions.toJSON();
}
```

---

## 🎯 Step 2: Referral Service

Create `apps/api/src/services/referral/referral.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService,
  ) {}

  /**
   * Register referral on user signup
   */
  async registerReferral(
    userId: string,
    referralCode: string,
  ): Promise<{ txHash: string; referrerId: string }> {
    // Find referrer by code
    const referrer = await this.prisma.profile.findUnique({
      where: { referralCode },
    });

    if (!referrer) {
      throw new Error('Invalid referral code');
    }

    // Get referee profile
    const referee = await this.prisma.profile.findUnique({
      where: { id: userId },
    });

    if (!referee) {
      throw new Error('Referee profile not found');
    }

    // Check if already referred
    if (referee.referrerId) {
      throw new Error('User already has a referrer');
    }

    // Register on blockchain
    const txHash = await this.blockchain.registerReferral(
      referee.walletAddress,
      referrer.walletAddress,
    );

    // Update PostgreSQL (cache)
    await this.prisma.profile.update({
      where: { id: userId },
      data: { referrerId: referrer.id },
    });

    this.logger.log(
      `Referral registered: ${userId} referred by ${referrer.id} (txHash: ${txHash})`,
    );

    return { txHash, referrerId: referrer.id };
  }

  /**
   * Get referral statistics
   */
  async getReferralStats(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
    });

    // Get on-chain stats
    const blockchainStats = await this.blockchain.getAffiliateStats(
      profile.walletAddress,
    );

    // Get direct referrals from PostgreSQL (faster)
    const directReferrals = await this.prisma.profile.findMany({
      where: { referrerId: userId },
      select: {
        id: true,
        username: true,
        createdAt: true,
      },
    });

    return {
      totalReferrals: blockchainStats.total_referrals,
      directReferrals: directReferrals.length,
      totalCommissionEarned: blockchainStats.total_commission_earned,
      referralCode: profile.referralCode,
      referrals: directReferrals,
    };
  }

  /**
   * Generate unique referral code
   */
  async generateReferralCode(userId: string): Promise<string> {
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
    });

    if (profile.referralCode) {
      return profile.referralCode;
    }

    // Generate unique code (6 chars alphanumeric)
    let code: string;
    let exists = true;

    while (exists) {
      code = this.generateRandomCode(6);
      const existing = await this.prisma.profile.findUnique({
        where: { referralCode: code },
      });
      exists = !!existing;
    }

    await this.prisma.profile.update({
      where: { id: userId },
      data: { referralCode: code },
    });

    return code;
  }

  private generateRandomCode(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Get full referral tree (multi-level)
   */
  async getReferralTree(userId: string, maxDepth = 5) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
    });

    const tree = await this.buildReferralTree(
      profile.walletAddress,
      maxDepth,
    );

    return tree;
  }

  private async buildReferralTree(
    walletAddress: string,
    depth: number,
    currentDepth = 0,
  ): Promise<any> {
    if (currentDepth >= depth) {
      return null;
    }

    const directReferrals = await this.blockchain.getDirectReferrals(
      walletAddress,
    );

    const children = await Promise.all(
      directReferrals.map(async (referralAddress) => {
        const profile = await this.prisma.profile.findFirst({
          where: { walletAddress: referralAddress },
        });

        return {
          address: referralAddress,
          userId: profile?.id,
          username: profile?.username,
          level: currentDepth + 1,
          children: await this.buildReferralTree(
            referralAddress,
            depth,
            currentDepth + 1,
          ),
        };
      }),
    );

    return children;
  }
}
```

---

## 🔄 Step 3: Integration with Order Flow

Update `apps/api/src/services/order/unified-order.service.ts`:

```typescript
import { ReferralService } from '../referral/referral.service';

@Injectable()
export class UnifiedOrderService {
  constructor(
    private blockchain: BlockchainService,
    private referral: ReferralService,
    // ... other services
  ) {}

  /**
   * After order is completed, distribute commissions
   */
  async confirmDelivery(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { include: { profile: true } } },
    });

    // ... existing delivery confirmation logic

    // Distribute affiliate commissions
    try {
      const blockchainOrderId = parseInt(orderId.replace('chain_', ''));
      const buyerWallet = order.user.profile.walletAddress;
      const orderAmount = order.totalAmount.toString();

      const txHash = await this.blockchain.distributeCommissions(
        blockchainOrderId,
        buyerWallet,
        orderAmount,
      );

      this.logger.log(
        `Commissions distributed for order ${orderId}: ${txHash}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to distribute commissions for order ${orderId}:`,
        error,
      );
      // Don't fail the delivery confirmation if commission distribution fails
    }

    return { status: 'DELIVERED', txHash };
  }
}
```

---

## 🛣️ Step 4: API Routes

Create `apps/api/src/routes/referral.routes.ts`:

```typescript
import { Router } from 'express';
import { ReferralService } from '../services/referral/referral.service';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * GET /api/referrals/stats
 * Get referral statistics for current user
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await referralService.getReferralStats(req.user.id);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/referrals/code
 * Get or generate referral code
 */
router.get('/code', authenticate, async (req, res) => {
  try {
    const code = await referralService.generateReferralCode(req.user.id);
    res.json({ code });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/referrals/register
 * Register referral on signup (called during onboarding)
 */
router.post('/register', authenticate, async (req, res) => {
  try {
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({ error: 'Referral code required' });
    }

    const result = await referralService.registerReferral(
      req.user.id,
      referralCode,
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/referrals/tree
 * Get full referral tree (multi-level)
 */
router.get('/tree', authenticate, async (req, res) => {
  try {
    const depth = parseInt(req.query.depth as string) || 5;
    const tree = await referralService.getReferralTree(req.user.id, depth);
    res.json(tree);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

## 📦 Step 5: Sync Worker (Optional)

Create `apps/api/src/workers/affiliate-sync.worker.ts`:

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BlockchainService } from '../services/blockchain/blockchain.service';
import { PrismaService } from '../services/prisma/prisma.service';

@Injectable()
export class AffiliateSyncWorker implements OnModuleInit {
  private readonly logger = new Logger(AffiliateSyncWorker.name);

  constructor(
    private blockchain: BlockchainService,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    this.logger.log('Starting affiliate sync worker...');
    this.subscribeToEvents();
  }

  private async subscribeToEvents() {
    this.blockchain.api.query.system.events((events) => {
      events.forEach((record) => {
        const { event } = record;

        if (this.blockchain.api.events.bazariAffiliate.ReferralRegistered.is(event)) {
          this.handleReferralRegistered(event.data);
        }

        if (this.blockchain.api.events.bazariAffiliate.CommissionDistributed.is(event)) {
          this.handleCommissionDistributed(event.data);
        }
      });
    });
  }

  private async handleReferralRegistered(data: any) {
    const referrer = data[0].toString();
    const referee = data[1].toString();

    this.logger.log(`ReferralRegistered: ${referee} -> ${referrer}`);

    // Find profiles
    const referrerProfile = await this.prisma.profile.findFirst({
      where: { walletAddress: referrer },
    });
    const refereeProfile = await this.prisma.profile.findFirst({
      where: { walletAddress: referee },
    });

    if (referrerProfile && refereeProfile) {
      // Update PostgreSQL cache
      await this.prisma.profile.update({
        where: { id: refereeProfile.id },
        data: { referrerId: referrerProfile.id },
      });
    }
  }

  private async handleCommissionDistributed(data: any) {
    const orderId = data[0].toString();
    const affiliate = data[1].toString();
    const amount = data[2].toString();
    const level = data[3].toNumber();

    this.logger.log(
      `CommissionDistributed: Order ${orderId} -> ${affiliate} (${amount}, Level ${level})`,
    );

    // Optional: Store commission history in PostgreSQL for analytics
    await this.prisma.affiliateCommission.create({
      data: {
        orderId: `chain_${orderId}`,
        affiliateAddress: affiliate,
        amount,
        level,
        createdAt: new Date(),
      },
    });
  }
}
```

---

## 🧪 Testing

```bash
# 1. Generate referral code
curl http://localhost:3000/api/referrals/code \
  -H "Authorization: Bearer $USER_TOKEN"

# Response: { "code": "ABC123" }

# 2. Register referral (on signup)
curl -X POST http://localhost:3000/api/referrals/register \
  -H "Authorization: Bearer $NEW_USER_TOKEN" \
  -d '{ "referralCode": "ABC123" }'

# 3. Complete order (triggers commission distribution)
curl -X POST http://localhost:3000/api/orders/chain_123/confirm \
  -H "Authorization: Bearer $BUYER_TOKEN"

# 4. Check referral stats
curl http://localhost:3000/api/referrals/stats \
  -H "Authorization: Bearer $USER_TOKEN"

# Response:
# {
#   "totalReferrals": 3,
#   "directReferrals": 2,
#   "totalCommissionEarned": "7500000000000000",
#   "referralCode": "ABC123",
#   "referrals": [...]
# }

# 5. Get referral tree
curl http://localhost:3000/api/referrals/tree?depth=3 \
  -H "Authorization: Bearer $USER_TOKEN"
```

---

## ✅ Integration Checklist

- [ ] BlockchainService: registerReferral, distributeCommissions
- [ ] ReferralService: stats, tree, code generation
- [ ] Routes: /referrals/stats, /code, /register, /tree
- [ ] Sync worker for ReferralRegistered events
- [ ] Integration with order confirmation flow
- [ ] Frontend: Referral dashboard UI
- [ ] Frontend: Share referral code widget

---

## 📊 Frontend Integration Example

```typescript
// apps/web/src/modules/referral/api/index.ts
export const getReferralStats = async () => {
  const response = await apiClient.get('/api/referrals/stats');
  return response.data;
};

export const generateReferralCode = async () => {
  const response = await apiClient.get('/api/referrals/code');
  return response.data.code;
};

// apps/web/src/modules/referral/pages/ReferralDashboard.tsx
export function ReferralDashboard() {
  const { data: stats } = useQuery(['referralStats'], getReferralStats);

  return (
    <div>
      <h2>Your Referral Dashboard</h2>
      <p>Referral Code: {stats?.referralCode}</p>
      <p>Total Referrals: {stats?.totalReferrals}</p>
      <p>Direct Referrals: {stats?.directReferrals}</p>
      <p>Total Commission: {formatBZR(stats?.totalCommissionEarned)}</p>

      <ShareButton code={stats?.referralCode} />
      <ReferralTree userId={currentUser.id} />
    </div>
  );
}
```

---

## 📚 Next: [bazari-fee/SPEC.md](../bazari-fee/SPEC.md)
