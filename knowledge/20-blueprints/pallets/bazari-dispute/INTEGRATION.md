# bazari-dispute Pallet - Backend Integration Guide

**Target**: NestJS API + Dispute resolution flow
**Timeline**: Week 18-19

---

## 🔧 Step 1: Extend BlockchainService

Add to `apps/api/src/services/blockchain/blockchain.service.ts`:

```typescript
/**
 * Open a dispute for an order
 */
async openDispute(
  plaintiff: string,
  orderId: number,
  evidenceIpfsCid: string,
): Promise<{ disputeId: number; txHash: string }> {
  const extrinsic = this.api.tx.bazariDispute.openDispute(
    orderId,
    evidenceIpfsCid,
  );

  const plaintiffKeyring = this.keyring.addFromAddress(plaintiff);
  const result = await this.signAndSend(extrinsic, plaintiffKeyring);

  // Extract disputeId from DisputeOpened event
  const disputeEvent = result.events.find(
    ({ event }) => this.api.events.bazariDispute.DisputeOpened.is(event),
  );

  const disputeId = disputeEvent.event.data[0].toNumber();
  const txHash = result.status.asInBlock.toString();

  return { disputeId, txHash };
}

/**
 * Select jurors for a dispute
 */
async selectJurors(disputeId: number): Promise<string> {
  const extrinsic = this.api.tx.bazariDispute.selectJurors(disputeId);
  const result = await this.signAndSend(extrinsic, this.platformAccount);
  return result.status.asInBlock.toString();
}

/**
 * Commit a vote (hash of vote + salt)
 */
async commitVote(
  juror: string,
  disputeId: number,
  voteHash: string,
): Promise<string> {
  const extrinsic = this.api.tx.bazariDispute.commitVote(disputeId, voteHash);
  const jurorKeyring = this.keyring.addFromAddress(juror);
  const result = await this.signAndSend(extrinsic, jurorKeyring);
  return result.status.asInBlock.toString();
}

/**
 * Reveal a vote
 */
async revealVote(
  juror: string,
  disputeId: number,
  vote: 'RefundBuyer' | 'ReleaseSeller' | { PartialRefund: number },
  salt: string,
): Promise<string> {
  const extrinsic = this.api.tx.bazariDispute.revealVote(
    disputeId,
    vote,
    salt,
  );

  const jurorKeyring = this.keyring.addFromAddress(juror);
  const result = await this.signAndSend(extrinsic, jurorKeyring);
  return result.status.asInBlock.toString();
}

/**
 * Execute ruling
 */
async executeRuling(disputeId: number): Promise<string> {
  const extrinsic = this.api.tx.bazariDispute.executeRuling(disputeId);
  const result = await this.signAndSend(extrinsic, this.platformAccount);
  return result.status.asInBlock.toString();
}

/**
 * Get dispute details
 */
async getDispute(disputeId: number) {
  const dispute = await this.api.query.bazariDispute.disputes(disputeId);
  return dispute.toJSON();
}

/**
 * Get juror reputation
 */
async getJurorReputation(account: string): Promise<number> {
  const reputation = await this.api.query.bazariDispute.jurorReputation(
    account,
  );
  return reputation.toNumber();
}
```

---

## 🎯 Step 2: Dispute Service

Create `apps/api/src/services/dispute/dispute.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { IpfsService } from '../ipfs/ipfs.service';
import * as crypto from 'crypto';

export interface DisputeEvidence {
  orderId: string;
  reason: string;
  description: string;
  photos: string[];
  timeline: Array<{ timestamp: string; event: string }>;
}

@Injectable()
export class DisputeService {
  private readonly logger = new Logger(DisputeService.name);

  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService,
    private ipfs: IpfsService,
  ) {}

  /**
   * Open a dispute
   */
  async openDispute(
    userId: string,
    orderId: string,
    evidence: DisputeEvidence,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { include: { profile: true } } },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Verify user is buyer or seller
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
    });

    const isBuyer = order.userId === userId;
    const isSeller = order.storeId === profile.storeId;

    if (!isBuyer && !isSeller) {
      throw new Error('Only buyer or seller can open dispute');
    }

    // Upload evidence to IPFS
    const evidenceJson = JSON.stringify(evidence, null, 2);
    const ipfsCid = await this.ipfs.uploadProof({
      orderId,
      proofType: 'DisputeEvidence',
      timestamp: new Date().toISOString(),
      photos: evidence.photos,
      signatures: {},
      metadata: {
        reason: evidence.reason,
        description: evidence.description,
        timeline: evidence.timeline,
      },
    } as any);

    // Open dispute on blockchain
    const blockchainOrderId = parseInt(orderId.replace('chain_', ''));
    const { disputeId, txHash } = await this.blockchain.openDispute(
      profile.walletAddress,
      blockchainOrderId,
      ipfsCid,
    );

    this.logger.log(`Dispute opened: ${disputeId} for order ${orderId}`);

    // Store in PostgreSQL
    const dispute = await this.prisma.dispute.create({
      data: {
        id: `dispute_${disputeId}`,
        orderId,
        plaintiffId: userId,
        evidenceIpfsCid: ipfsCid,
        status: 'OPEN',
        txHash,
      },
    });

    // Auto-select jurors
    await this.selectJurorsForDispute(disputeId);

    return {
      disputeId: dispute.id,
      txHash,
      ipfsCid,
    };
  }

  /**
   * Select jurors for a dispute
   */
  async selectJurorsForDispute(disputeId: number) {
    try {
      const txHash = await this.blockchain.selectJurors(disputeId);

      await this.prisma.dispute.update({
        where: { id: `dispute_${disputeId}` },
        data: { status: 'JURORS_SELECTED' },
      });

      this.logger.log(`Jurors selected for dispute ${disputeId}: ${txHash}`);

      return { txHash };
    } catch (error) {
      this.logger.error(`Failed to select jurors for dispute ${disputeId}:`, error);
      throw error;
    }
  }

  /**
   * Commit a vote (juror only)
   */
  async commitVote(
    userId: string,
    disputeId: string,
    vote: 'RefundBuyer' | 'ReleaseSeller' | { PartialRefund: number },
  ) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
    });

    // Generate random salt
    const salt = crypto.randomBytes(32).toString('hex');

    // Compute vote hash
    const voteHash = this.hashVote(vote, salt);

    // Submit commit to blockchain
    const blockchainDisputeId = parseInt(disputeId.replace('dispute_', ''));
    const txHash = await this.blockchain.commitVote(
      profile.walletAddress,
      blockchainDisputeId,
      voteHash,
    );

    // Store salt securely (encrypted in DB)
    await this.prisma.jurorVote.create({
      data: {
        disputeId,
        jurorId: userId,
        voteHash,
        saltEncrypted: this.encryptSalt(salt),
        phase: 'COMMIT',
      },
    });

    this.logger.log(`Vote committed for dispute ${disputeId} by ${userId}`);

    return { txHash, voteHash };
  }

  /**
   * Reveal a vote (juror only)
   */
  async revealVote(userId: string, disputeId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
    });

    // Retrieve stored vote and salt
    const storedVote = await this.prisma.jurorVote.findFirst({
      where: {
        disputeId,
        jurorId: userId,
        phase: 'COMMIT',
      },
    });

    if (!storedVote) {
      throw new Error('No committed vote found');
    }

    const salt = this.decryptSalt(storedVote.saltEncrypted);
    const vote = storedVote.vote as any; // Retrieve original vote

    // Reveal vote on blockchain
    const blockchainDisputeId = parseInt(disputeId.replace('dispute_', ''));
    const txHash = await this.blockchain.revealVote(
      profile.walletAddress,
      blockchainDisputeId,
      vote,
      salt,
    );

    // Update vote status
    await this.prisma.jurorVote.update({
      where: { id: storedVote.id },
      data: { phase: 'REVEAL' },
    });

    this.logger.log(`Vote revealed for dispute ${disputeId} by ${userId}`);

    return { txHash };
  }

  /**
   * Get dispute details
   */
  async getDisputeDetails(disputeId: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        order: true,
        plaintiff: { include: { profile: true } },
      },
    });

    const blockchainDisputeId = parseInt(disputeId.replace('dispute_', ''));
    const blockchainData = await this.blockchain.getDispute(
      blockchainDisputeId,
    );

    // Get evidence from IPFS
    const evidence = await this.ipfs.getProof(dispute.evidenceIpfsCid);

    return {
      ...dispute,
      blockchainData,
      evidence,
    };
  }

  /**
   * Execute ruling (after reveal phase)
   */
  async executeRuling(disputeId: string) {
    const blockchainDisputeId = parseInt(disputeId.replace('dispute_', ''));
    const txHash = await this.blockchain.executeRuling(blockchainDisputeId);

    await this.prisma.dispute.update({
      where: { id: disputeId },
      data: { status: 'RESOLVED' },
    });

    return { txHash };
  }

  /**
   * Helper: Hash vote + salt
   */
  private hashVote(vote: any, salt: string): string {
    const data = JSON.stringify({ vote, salt });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Helper: Encrypt salt for storage
   */
  private encryptSalt(salt: string): string {
    // Use proper encryption (AES-256-GCM) in production
    return Buffer.from(salt).toString('base64');
  }

  /**
   * Helper: Decrypt salt
   */
  private decryptSalt(encrypted: string): string {
    return Buffer.from(encrypted, 'base64').toString('utf-8');
  }
}
```

---

## 🛣️ Step 3: API Routes

Create `apps/api/src/routes/dispute.routes.ts`:

```typescript
import { Router } from 'express';
import { DisputeService } from '../services/dispute/dispute.service';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * POST /api/disputes
 * Open a dispute
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { orderId, reason, description, photos, timeline } = req.body;

    const result = await disputeService.openDispute(req.user.id, orderId, {
      orderId,
      reason,
      description,
      photos,
      timeline,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/disputes/:disputeId/vote
 * Commit a vote (juror only)
 */
router.post('/:disputeId/vote', authenticate, async (req, res) => {
  try {
    const { vote } = req.body; // "RefundBuyer" | "ReleaseSeller" | { PartialRefund: 50 }

    const result = await disputeService.commitVote(
      req.user.id,
      req.params.disputeId,
      vote,
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/disputes/:disputeId/reveal
 * Reveal a vote (juror only)
 */
router.post('/:disputeId/reveal', authenticate, async (req, res) => {
  try {
    const result = await disputeService.revealVote(
      req.user.id,
      req.params.disputeId,
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/disputes/:disputeId
 * Get dispute details
 */
router.get('/:disputeId', authenticate, async (req, res) => {
  try {
    const dispute = await disputeService.getDisputeDetails(
      req.params.disputeId,
    );

    res.json(dispute);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/disputes/:disputeId/execute
 * Execute ruling (admin/system only)
 */
router.post('/:disputeId/execute', authenticate, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await disputeService.executeRuling(req.params.disputeId);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

## 📦 Step 4: Sync Worker

Create `apps/api/src/workers/dispute-sync.worker.ts`:

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BlockchainService } from '../services/blockchain/blockchain.service';
import { PrismaService } from '../services/prisma/prisma.service';

@Injectable()
export class DisputeSyncWorker implements OnModuleInit {
  private readonly logger = new Logger(DisputeSyncWorker.name);

  constructor(
    private blockchain: BlockchainService,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    this.logger.log('Starting dispute sync worker...');
    this.subscribeToEvents();
  }

  private async subscribeToEvents() {
    this.blockchain.api.query.system.events((events) => {
      events.forEach((record) => {
        const { event } = record;

        if (this.blockchain.api.events.bazariDispute.DisputeOpened.is(event)) {
          this.handleDisputeOpened(event.data);
        }

        if (this.blockchain.api.events.bazariDispute.JurorsSelected.is(event)) {
          this.handleJurorsSelected(event.data);
        }

        if (this.blockchain.api.events.bazariDispute.DisputeResolved.is(event)) {
          this.handleDisputeResolved(event.data);
        }
      });
    });
  }

  private async handleDisputeOpened(data: any) {
    const disputeId = data[0].toString();
    const orderId = data[1].toString();
    const plaintiff = data[2].toString();

    this.logger.log(`DisputeOpened: ${disputeId} for order ${orderId}`);

    // Sync to PostgreSQL (if not already synced)
    const exists = await this.prisma.dispute.findUnique({
      where: { id: `dispute_${disputeId}` },
    });

    if (!exists) {
      await this.prisma.dispute.create({
        data: {
          id: `dispute_${disputeId}`,
          orderId: `chain_${orderId}`,
          status: 'OPEN',
        },
      });
    }
  }

  private async handleJurorsSelected(data: any) {
    const disputeId = data[0].toString();
    const jurors = data[1].toJSON() as string[];

    this.logger.log(`JurorsSelected: ${disputeId} -> ${jurors.length} jurors`);

    await this.prisma.dispute.update({
      where: { id: `dispute_${disputeId}` },
      data: {
        status: 'COMMIT_PHASE',
        jurors: JSON.stringify(jurors),
      },
    });

    // Notify jurors via email/push notification
    // ...
  }

  private async handleDisputeResolved(data: any) {
    const disputeId = data[0].toString();
    const ruling = data[1].toJSON();

    this.logger.log(`DisputeResolved: ${disputeId} -> ${JSON.stringify(ruling)}`);

    await this.prisma.dispute.update({
      where: { id: `dispute_${disputeId}` },
      data: {
        status: 'RESOLVED',
        ruling: JSON.stringify(ruling),
        resolvedAt: new Date(),
      },
    });

    // Notify parties via email/push notification
    // ...
  }
}
```

---

## 🧪 Testing

```bash
# 1. Open dispute
curl -X POST http://localhost:3000/api/disputes \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -d '{
    "orderId": "chain_123",
    "reason": "Item not as described",
    "description": "Product arrived damaged",
    "photos": ["QmPhoto1", "QmPhoto2"],
    "timeline": [
      { "timestamp": "2025-11-10T10:00:00Z", "event": "Order placed" },
      { "timestamp": "2025-11-15T14:00:00Z", "event": "Item received damaged" }
    ]
  }'

# 2. Juror commits vote
curl -X POST http://localhost:3000/api/disputes/dispute_0/vote \
  -H "Authorization: Bearer $JUROR_TOKEN" \
  -d '{ "vote": "RefundBuyer" }'

# 3. Juror reveals vote (after 24h)
curl -X POST http://localhost:3000/api/disputes/dispute_0/reveal \
  -H "Authorization: Bearer $JUROR_TOKEN"

# 4. Execute ruling (admin)
curl -X POST http://localhost:3000/api/disputes/dispute_0/execute \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 5. Get dispute details
curl http://localhost:3000/api/disputes/dispute_0 \
  -H "Authorization: Bearer $USER_TOKEN"
```

---

## ✅ Integration Checklist

- [ ] BlockchainService: openDispute, commitVote, revealVote, executeRuling
- [ ] DisputeService: evidence upload to IPFS, vote encryption
- [ ] Routes: /disputes, /vote, /reveal, /execute
- [ ] Sync worker for dispute events
- [ ] Notification system for jurors
- [ ] Frontend: Dispute creation form
- [ ] Frontend: Juror voting interface
- [ ] Frontend: Dispute timeline view

---

## 📊 Frontend Integration Example

```typescript
// apps/web/src/modules/dispute/api/index.ts
export const openDispute = async (data: DisputeData) => {
  const response = await apiClient.post('/api/disputes', data);
  return response.data;
};

// apps/web/src/modules/dispute/pages/DisputeDetailPage.tsx
export function DisputeDetailPage({ disputeId }: { disputeId: string }) {
  const { data: dispute } = useQuery(['dispute', disputeId], () =>
    getDisputeDetails(disputeId)
  );

  const isJuror = dispute?.jurors?.includes(currentUser.walletAddress);

  return (
    <div>
      <h2>Dispute #{disputeId}</h2>
      <DisputeTimeline dispute={dispute} />

      {isJuror && dispute.status === 'COMMIT_PHASE' && (
        <JurorVotingPanel disputeId={disputeId} />
      )}

      {isJuror && dispute.status === 'REVEAL_PHASE' && (
        <RevealVoteButton disputeId={disputeId} />
      )}

      {dispute.status === 'RESOLVED' && (
        <RulingDisplay ruling={dispute.ruling} />
      )}
    </div>
  );
}
```

---

## 📚 Congratulations!

You've completed the **bazari-dispute** pallet integration. This completes all P2 (Proof of Commerce) documentation.

**Next Steps**:
- Review [PROGRESS-SUMMARY.md](../PROGRESS-SUMMARY.md) for implementation roadmap
- Start with P1 implementation (bazari-commerce, escrow, rewards)
- Return to P2 pallets in Week 9-19 of the roadmap
