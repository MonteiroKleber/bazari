# bazari-rewards Pallet - Backend Integration Guide

**Target**: NestJS API + Gamification System
**Timeline**: Week 8-9 of Sprint Plan

---

## 🎯 Integration Overview

Replace PostgreSQL cashback system with real ZARI tokens:
1. Grant ZARI tokens instead of updating `cashbackBalance` column
2. Trigger mission progress on user actions (orders, referrals, etc.)
3. Track streaks for daily login bonuses
4. Sync mission completions to PostgreSQL for frontend display

---

## 🔧 Step 1: Extend BlockchainService

Edit `/root/bazari/apps/api/src/services/blockchain/blockchain.service.ts`:

```typescript
/**
 * Create mission (DAO only)
 */
async createMission(
  name: string,
  description: string,
  rewardAmount: string,
  missionType: 'CompleteOrders' | 'SpendAmount' | 'ReferUsers' | 'CreateStore' | 'FirstPurchase' | 'DailyStreak' | 'Custom',
  targetValue: number,
  maxCompletions: number,
  expiresAt?: number,
): Promise<{ missionId: number; txHash: string }> {
  const extrinsic = this.api.tx.bazariRewards.createMission(
    name,
    description,
    rewardAmount,
    missionType,
    targetValue,
    maxCompletions,
    expiresAt || null,
  );

  // Sign with DAO account (root)
  const result = await this.signAndSend(extrinsic, this.platformAccount);

  const missionCreatedEvent = result.events.find(
    ({ event }) => this.api.events.bazariRewards.MissionCreated.is(event)
  );

  const missionId = missionCreatedEvent.event.data[0].toNumber();
  const txHash = result.status.asInBlock.toString();

  this.logger.log(`Mission created: missionId=${missionId}`);

  return { missionId, txHash };
}

/**
 * Progress mission for user
 */
async progressMission(
  user: string,
  missionId: number,
  progressAmount: number,
): Promise<string> {
  const extrinsic = this.api.tx.bazariRewards.progressMission(
    user,
    missionId,
    progressAmount,
  );

  // Sign with platform account (system call)
  const result = await this.signAndSend(extrinsic, this.platformAccount);
  return result.status.asInBlock.toString();
}

/**
 * Grant cashback (mint ZARI tokens)
 */
async grantCashback(
  recipient: string,
  amount: string,
  reason: string,
  orderId?: number,
): Promise<{ grantId: number; txHash: string }> {
  const extrinsic = this.api.tx.bazariRewards.grantCashback(
    recipient,
    amount,
    reason,
    orderId || null,
  );

  const result = await this.signAndSend(extrinsic, this.platformAccount);

  const cashbackGrantedEvent = result.events.find(
    ({ event }) => this.api.events.bazariRewards.CashbackGranted.is(event)
  );

  const grantId = cashbackGrantedEvent.event.data[2].toNumber();
  const txHash = result.status.asInBlock.toString();

  return { grantId, txHash };
}

/**
 * Update user streak
 */
async updateStreak(user: string): Promise<string> {
  const extrinsic = this.api.tx.bazariRewards.updateStreak(user);
  const result = await this.signAndSend(extrinsic, this.platformAccount);
  return result.status.asInBlock.toString();
}

/**
 * Get user's ZARI balance
 */
async getZariBalance(user: string): Promise<string> {
  const balance = await this.api.query.assets.account(1000, user); // ZARI asset ID = 1000
  return balance.toJSON()?.balance || '0';
}

/**
 * Query mission from blockchain
 */
async getMission(missionId: number) {
  const mission = await this.api.query.bazariRewards.missions(missionId);
  return mission.toJSON();
}

/**
 * Query user mission progress
 */
async getUserMissionProgress(user: string, missionId: number) {
  const userMission = await this.api.query.bazariRewards.userMissions(user, missionId);
  return userMission.toJSON();
}

/**
 * Subscribe to rewards events
 */
subscribeToRewardsEvents(callback: (event: any) => void) {
  this.api.query.system.events((events) => {
    events.forEach((record) => {
      const { event } = record;

      if (this.api.events.bazariRewards.MissionCompleted.is(event)) {
        callback({ type: 'MissionCompleted', data: event.data.toJSON() });
      } else if (this.api.events.bazariRewards.CashbackGranted.is(event)) {
        callback({ type: 'CashbackGranted', data: event.data.toJSON() });
      } else if (this.api.events.bazariRewards.StreakBonusGranted.is(event)) {
        callback({ type: 'StreakBonusGranted', data: event.data.toJSON() });
      }
    });
  });
}
```

---

## 🎮 Step 2: Gamification Service

Create `/root/bazari/apps/api/src/services/gamification/gamification.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService,
  ) {}

  /**
   * Grant cashback as ZARI tokens
   */
  async grantCashback(userId: string, amount: number, reason: string, orderId?: string) {
    try {
      const profile = await this.prisma.profile.findUnique({
        where: { id: userId },
      });

      if (!profile?.walletAddress) {
        throw new Error('User wallet not found');
      }

      // Grant ZARI tokens on-chain
      const { grantId, txHash } = await this.blockchain.grantCashback(
        profile.walletAddress,
        (amount * 1e12).toString(), // Convert to smallest unit
        reason,
        orderId ? parseInt(orderId.replace('chain_', '')) : undefined,
      );

      this.logger.log(`Cashback granted: userId=${userId}, amount=${amount}, grantId=${grantId}`);

      // PostgreSQL sync will happen via worker
      return { grantId, txHash, amount };
    } catch (error) {
      this.logger.error('Failed to grant cashback', error);
      throw error;
    }
  }

  /**
   * Progress mission (triggered by user actions)
   */
  async progressMission(userId: string, missionType: string, progressAmount: number = 1) {
    try {
      const profile = await this.prisma.profile.findUnique({
        where: { id: userId },
      });

      // Find active mission of this type
      const mission = await this.prisma.mission.findFirst({
        where: {
          type: missionType,
          isActive: true,
        },
      });

      if (!mission) {
        this.logger.debug(`No active mission for type: ${missionType}`);
        return null;
      }

      // Progress on blockchain
      const txHash = await this.blockchain.progressMission(
        profile.walletAddress,
        mission.blockchainMissionId,
        progressAmount,
      );

      this.logger.log(`Mission progressed: userId=${userId}, missionId=${mission.id}, progress=${progressAmount}`);

      return { txHash };
    } catch (error) {
      this.logger.error('Failed to progress mission', error);
      // Don't throw - missions are optional, shouldn't break main flow
      return null;
    }
  }

  /**
   * Update daily login streak
   */
  async updateStreak(userId: string) {
    try {
      const profile = await this.prisma.profile.findUnique({
        where: { id: userId },
      });

      const txHash = await this.blockchain.updateStreak(profile.walletAddress);

      this.logger.log(`Streak updated: userId=${userId}`);

      return { txHash };
    } catch (error) {
      this.logger.error('Failed to update streak', error);
      return null;
    }
  }

  /**
   * Get user's ZARI balance
   */
  async getZariBalance(userId: string): Promise<number> {
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
    });

    const balanceStr = await this.blockchain.getZariBalance(profile.walletAddress);
    return parseFloat(balanceStr) / 1e12; // Convert from smallest unit
  }

  /**
   * Get user mission progress
   */
  async getUserMissions(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
    });

    // Get missions from PostgreSQL (synced from blockchain)
    const missions = await this.prisma.mission.findMany({
      where: { isActive: true },
      include: {
        userProgress: {
          where: { userId },
        },
      },
    });

    return missions.map(mission => ({
      id: mission.id,
      name: mission.name,
      description: mission.description,
      rewardAmount: mission.rewardAmount,
      type: mission.type,
      targetValue: mission.targetValue,
      progress: mission.userProgress[0]?.progress || 0,
      completed: mission.userProgress[0]?.completed || false,
    }));
  }
}
```

---

## 🔄 Step 3: Integrate with Order Flow

Edit `/root/bazari/apps/api/src/services/orders/unified-order.service.ts`:

```typescript
import { GamificationService } from '../gamification/gamification.service';

@Injectable()
export class UnifiedOrderService {
  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService,
    private gamification: GamificationService, // Inject
  ) {}

  async createOrder(dto: CreateOrderDTO) {
    // ... existing create order logic

    // Trigger "FirstPurchase" mission if first order
    const orderCount = await this.prisma.order.count({
      where: { userId: dto.userId },
    });

    if (orderCount === 0) {
      await this.gamification.progressMission(dto.userId, 'FirstPurchase', 1);
    }

    return result;
  }

  async confirmDelivery(orderId: string, userId: string) {
    // ... existing delivery confirmation logic

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    // Grant cashback (3% of order value)
    const cashbackAmount = parseFloat(order.totalAmount) * 0.03;
    await this.gamification.grantCashback(
      userId,
      cashbackAmount,
      'Order cashback',
      orderId,
    );

    // Progress "CompleteOrders" mission
    await this.gamification.progressMission(userId, 'CompleteOrders', 1);

    // Progress "SpendAmount" mission
    await this.gamification.progressMission(
      userId,
      'SpendAmount',
      parseFloat(order.totalAmount),
    );

    return result;
  }
}
```

---

## 🔄 Step 4: Rewards Sync Worker

Create `/root/bazari/apps/api/src/workers/blockchain-rewards-sync.worker.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../services/blockchain/blockchain.service';

@Injectable()
export class BlockchainRewardsSyncWorker {
  private readonly logger = new Logger(BlockchainRewardsSyncWorker.name);
  private lastSyncedBlock = 0;

  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async syncRewards() {
    if (process.env.BLOCKCHAIN_SYNC_ENABLED !== 'true') {
      return;
    }

    try {
      const api = this.blockchain.getApi();
      const currentBlock = (await api.rpc.chain.getHeader()).number.toNumber();

      for (let blockNum = this.lastSyncedBlock + 1; blockNum <= currentBlock; blockNum++) {
        const blockHash = await api.rpc.chain.getBlockHash(blockNum);
        const events = await api.query.system.events.at(blockHash);

        for (const record of events) {
          const { event } = record;

          // Handle MissionCreated
          if (api.events.bazariRewards.MissionCreated.is(event)) {
            await this.handleMissionCreated(event.data);
          }

          // Handle MissionCompleted
          if (api.events.bazariRewards.MissionCompleted.is(event)) {
            await this.handleMissionCompleted(event.data);
          }

          // Handle CashbackGranted
          if (api.events.bazariRewards.CashbackGranted.is(event)) {
            await this.handleCashbackGranted(event.data);
          }

          // Handle StreakBonusGranted
          if (api.events.bazariRewards.StreakBonusGranted.is(event)) {
            await this.handleStreakBonus(event.data);
          }
        }
      }

      this.lastSyncedBlock = currentBlock;
    } catch (error) {
      this.logger.error('Rewards sync failed', error);
    }
  }

  private async handleMissionCreated(data: any) {
    const [missionId, name, rewardAmount, missionType] = data;

    // Fetch full mission from blockchain
    const mission = await this.blockchain.getMission(missionId.toNumber());

    await this.prisma.mission.create({
      data: {
        id: `mission_${missionId.toString()}`,
        blockchainMissionId: missionId.toNumber(),
        name: Buffer.from(name).toString(),
        description: Buffer.from(mission.description).toString(),
        rewardAmount: rewardAmount.toString(),
        type: missionType.toString(),
        targetValue: mission.targetValue,
        maxCompletions: mission.maxCompletions,
        completionCount: 0,
        isActive: true,
      },
    });

    this.logger.log(`Synced MissionCreated: missionId=${missionId.toNumber()}`);
  }

  private async handleMissionCompleted(data: any) {
    const [user, missionId, rewardAmount] = data;

    // Find user by wallet address
    const profile = await this.prisma.profile.findFirst({
      where: { walletAddress: user.toString() },
    });

    if (!profile) return;

    // Update user mission progress
    await this.prisma.userMissionProgress.upsert({
      where: {
        userId_missionId: {
          userId: profile.id,
          missionId: `mission_${missionId.toString()}`,
        },
      },
      create: {
        userId: profile.id,
        missionId: `mission_${missionId.toString()}`,
        progress: 0, // Will be updated from blockchain
        completed: true,
        completedAt: new Date(),
      },
      update: {
        completed: true,
        completedAt: new Date(),
      },
    });

    // Update mission completion count
    await this.prisma.mission.update({
      where: { id: `mission_${missionId.toString()}` },
      data: {
        completionCount: { increment: 1 },
      },
    });

    this.logger.log(`Synced MissionCompleted: user=${user.toString()}, missionId=${missionId.toNumber()}`);
  }

  private async handleCashbackGranted(data: any) {
    const [recipient, amount, grantId] = data;

    const profile = await this.prisma.profile.findFirst({
      where: { walletAddress: recipient.toString() },
    });

    if (!profile) return;

    // Record cashback grant
    await this.prisma.cashbackGrant.create({
      data: {
        id: `grant_${grantId.toString()}`,
        userId: profile.id,
        amount: amount.toString(),
        reason: 'Cashback',
        grantedAt: new Date(),
      },
    });

    this.logger.log(`Synced CashbackGranted: user=${profile.id}, amount=${amount.toString()}`);
  }

  private async handleStreakBonus(data: any) {
    const [user, streak, bonusAmount] = data;

    const profile = await this.prisma.profile.findFirst({
      where: { walletAddress: user.toString() },
    });

    if (!profile) return;

    // Update profile streak
    await this.prisma.profile.update({
      where: { id: profile.id },
      data: {
        currentStreak: streak.toNumber(),
      },
    });

    this.logger.log(`Synced StreakBonus: user=${profile.id}, streak=${streak.toNumber()}`);
  }
}
```

---

## 🛣️ Step 5: API Routes

Create `/root/bazari/apps/api/src/routes/gamification.ts`:

```typescript
import { Router } from 'express';
import { GamificationService } from '../services/gamification/gamification.service';

const router = Router();

/**
 * GET /api/gamification/balance
 * Get user's ZARI balance
 */
router.get('/balance', async (req, res) => {
  try {
    const balance = await gamificationService.getZariBalance(req.user.id);
    res.json({ balance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/gamification/missions
 * Get user's mission progress
 */
router.get('/missions', async (req, res) => {
  try {
    const missions = await gamificationService.getUserMissions(req.user.id);
    res.json({ missions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/gamification/streak
 * Update daily login streak
 */
router.post('/streak', async (req, res) => {
  try {
    const result = await gamificationService.updateStreak(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

## 🧪 Testing

### Test Mission Completion

```bash
# 1. Create mission (DAO)
curl -X POST http://localhost:3000/admin/missions \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "First Purchase",
    "description": "Complete your first purchase",
    "rewardAmount": "1000",
    "type": "FirstPurchase",
    "targetValue": 1,
    "maxCompletions": 0
  }'

# 2. Create order (should trigger mission)
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"storeId": "1", "items": [...]}'

# 3. Complete order
# ... (pay, ship, deliver)

# 4. Check ZARI balance (should have 1000 ZARI reward)
curl http://localhost:3000/api/gamification/balance \
  -H "Authorization: Bearer $USER_TOKEN"

# Should return: { "balance": 1000 }
```

---

## ✅ Integration Checklist

- [ ] BlockchainService rewards methods implemented
- [ ] GamificationService created
- [ ] Order flow integrated with missions
- [ ] RewardsSyncWorker running
- [ ] Gamification routes created
- [ ] ZARI balance displayed in frontend
- [ ] Missions dashboard working
- [ ] Cashback granted automatically

---

## 🎯 Default Missions to Create

```typescript
// Run after deployment
const defaultMissions = [
  {
    name: 'First Purchase',
    description: 'Complete your first purchase',
    rewardAmount: '1000', // 1000 ZARI
    type: 'FirstPurchase',
    targetValue: 1,
    maxCompletions: 0,
  },
  {
    name: 'Frequent Buyer',
    description: 'Complete 10 orders',
    rewardAmount: '5000',
    type: 'CompleteOrders',
    targetValue: 10,
    maxCompletions: 0,
  },
  {
    name: 'Big Spender',
    description: 'Spend 100 BZR',
    rewardAmount: '10000',
    type: 'SpendAmount',
    targetValue: 100,
    maxCompletions: 0,
  },
  {
    name: 'Referral King',
    description: 'Refer 5 users',
    rewardAmount: '15000',
    type: 'ReferUsers',
    targetValue: 5,
    maxCompletions: 0,
  },
];
```

---

## 📚 Next Steps

After completing bazari-rewards integration:
1. **Remove deprecated code**: Delete `cashbackBalance` column from Profile table
2. **Frontend integration**: Display ZARI balance and missions dashboard
3. **Deploy to testnet**: Test mission completion flows
4. **Phase 2 prep**: Start planning [bazari-attestation](../bazari-attestation/SPEC.md) (Proof of Commerce pallets)
