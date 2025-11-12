# bazari-escrow Pallet - Backend Integration Guide

**Target**: NestJS API + bazari-commerce integration
**Timeline**: Week 7-8 of Sprint Plan

---

## 🎯 Integration Overview

Integrate escrow with order payment flow:
1. Buyer locks funds when paying for order
2. Automatic 7-day release countdown starts
3. Buyer can manually release early (confirm delivery)
4. Seller can refund if unable to fulfill
5. Auto-release triggers after timeout

---

## 🔧 Step 1: Extend BlockchainService

Edit `/root/bazari/apps/api/src/services/blockchain/blockchain.service.ts`:

```typescript
// Add escrow methods to BlockchainService

/**
 * Lock funds in escrow (buyer pays for order)
 */
async lockEscrow(
  buyer: string,
  seller: string,
  amount: string,
  autoReleaseBlocks?: number,
): Promise<{ escrowId: number; txHash: string }> {
  try {
    const buyerKeyring = this.keyring.addFromAddress(buyer);

    // Default: 7 days = 100,800 blocks
    const releaseBlocks = autoReleaseBlocks || 100800;

    const extrinsic = this.api.tx.bazariEscrow.lock(
      seller,           // beneficiary
      amount,           // amount
      null,             // asset_id (null = native token BZR)
      releaseBlocks,    // auto_release_blocks
      null,             // arbiter (DAO will set if needed)
    );

    const result = await this.signAndSend(extrinsic, buyerKeyring);

    // Extract escrow_id from EscrowLocked event
    const escrowLockedEvent = result.events.find(
      ({ event }) => this.api.events.bazariEscrow.EscrowLocked.is(event)
    );

    if (!escrowLockedEvent) {
      throw new Error('EscrowLocked event not found');
    }

    const escrowId = escrowLockedEvent.event.data[0].toNumber();
    const txHash = result.status.asInBlock.toString();

    this.logger.log(`Escrow locked: escrowId=${escrowId}, txHash=${txHash}`);

    return { escrowId, txHash };
  } catch (error) {
    this.logger.error('Failed to lock escrow', error);
    throw error;
  }
}

/**
 * Release escrow (buyer confirms delivery)
 */
async releaseEscrow(buyer: string, escrowId: number): Promise<string> {
  const extrinsic = this.api.tx.bazariEscrow.release(escrowId);
  const buyerKeyring = this.keyring.addFromAddress(buyer);
  const result = await this.signAndSend(extrinsic, buyerKeyring);
  return result.status.asInBlock.toString();
}

/**
 * Refund escrow (seller cannot fulfill)
 */
async refundEscrow(seller: string, escrowId: number): Promise<string> {
  const extrinsic = this.api.tx.bazariEscrow.refund(escrowId);
  const sellerKeyring = this.keyring.addFromAddress(seller);
  const result = await this.signAndSend(extrinsic, sellerKeyring);
  return result.status.asInBlock.toString();
}

/**
 * Split release (for commissions)
 */
async splitReleaseEscrow(
  depositor: string,
  escrowId: number,
  splits: Array<{ recipient: string; percent: number }>,
): Promise<string> {
  const splitsFormatted = splits.map(s => [s.recipient, s.percent]);

  const extrinsic = this.api.tx.bazariEscrow.splitRelease(escrowId, splitsFormatted);
  const depositorKeyring = this.keyring.addFromAddress(depositor);
  const result = await this.signAndSend(extrinsic, depositorKeyring);
  return result.status.asInBlock.toString();
}

/**
 * Query escrow from blockchain
 */
async getEscrow(escrowId: number) {
  const escrow = await this.api.query.bazariEscrow.escrows(escrowId);
  return escrow.toJSON();
}

/**
 * Subscribe to escrow events
 */
subscribeToEscrowEvents(callback: (event: any) => void) {
  this.api.query.system.events((events) => {
    events.forEach((record) => {
      const { event } = record;

      if (this.api.events.bazariEscrow.EscrowLocked.is(event)) {
        callback({ type: 'EscrowLocked', data: event.data.toJSON() });
      } else if (this.api.events.bazariEscrow.EscrowReleased.is(event)) {
        callback({ type: 'EscrowReleased', data: event.data.toJSON() });
      } else if (this.api.events.bazariEscrow.EscrowAutoReleased.is(event)) {
        callback({ type: 'EscrowAutoReleased', data: event.data.toJSON() });
      } else if (this.api.events.bazariEscrow.EscrowRefunded.is(event)) {
        callback({ type: 'EscrowRefunded', data: event.data.toJSON() });
      }
    });
  });
}
```

---

## 🔄 Step 2: Update UnifiedOrderService

Edit `/root/bazari/apps/api/src/services/orders/unified-order.service.ts`:

```typescript
/**
 * Pay for order (lock funds in escrow)
 */
async payOrder(orderId: string, userId: string) {
  try {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { store: true },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.userId !== userId) {
      throw new Error('Unauthorized');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new Error('Order not in pending state');
    }

    // Get user wallet
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
    });

    // Get seller wallet
    const sellerProfile = await this.prisma.profile.findUnique({
      where: { id: order.store.ownerId },
    });

    // Lock funds in escrow
    const { escrowId, txHash } = await this.blockchain.lockEscrow(
      profile.walletAddress,
      sellerProfile.walletAddress,
      order.totalAmount.toString(),
      100800, // 7 days auto-release
    );

    this.logger.log(`Escrow locked for order ${orderId}: escrowId=${escrowId}`);

    // Mark order as paid on blockchain
    const blockchainOrderId = parseInt(orderId.replace('chain_', ''));
    await this.blockchain.markPaid(
      profile.walletAddress,
      blockchainOrderId,
      escrowId,
    );

    // PostgreSQL will be synced by worker
    return {
      escrowId: `escrow_${escrowId}`,
      txHash,
      autoReleaseAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };
  } catch (error) {
    this.logger.error('Failed to pay order', error);
    throw error;
  }
}

/**
 * Confirm delivery (release escrow)
 */
async confirmDelivery(orderId: string, userId: string) {
  const order = await this.prisma.order.findUnique({
    where: { id: orderId },
    include: { paymentIntent: true },
  });

  if (!order || order.userId !== userId) {
    throw new Error('Unauthorized');
  }

  if (order.status !== OrderStatus.SHIPPED) {
    throw new Error('Order not shipped yet');
  }

  // Get escrow ID from metadata
  const escrowId = order.paymentIntent?.metadata?.escrowId;
  if (!escrowId) {
    throw new Error('Escrow ID not found');
  }

  const profile = await this.prisma.profile.findUnique({
    where: { id: userId },
  });

  // Release escrow
  const txHash = await this.blockchain.releaseEscrow(profile.walletAddress, escrowId);

  // Mark order as delivered
  const blockchainOrderId = parseInt(orderId.replace('chain_', ''));
  await this.blockchain.markDelivered(profile.walletAddress, blockchainOrderId);

  return { txHash };
}

/**
 * Refund order (seller cannot fulfill)
 */
async refundOrder(orderId: string, sellerId: string) {
  const order = await this.prisma.order.findUnique({
    where: { id: orderId },
    include: { paymentIntent: true, store: true },
  });

  if (!order || order.store.ownerId !== sellerId) {
    throw new Error('Unauthorized');
  }

  if (order.status !== OrderStatus.PAID) {
    throw new Error('Order not paid yet');
  }

  const escrowId = order.paymentIntent?.metadata?.escrowId;
  if (!escrowId) {
    throw new Error('Escrow ID not found');
  }

  const profile = await this.prisma.profile.findUnique({
    where: { id: sellerId },
  });

  // Refund escrow
  const txHash = await this.blockchain.refundEscrow(profile.walletAddress, escrowId);

  return { txHash };
}
```

---

## 🔄 Step 3: Escrow Sync Worker

Create `/root/bazari/apps/api/src/workers/blockchain-escrow-sync.worker.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../services/blockchain/blockchain.service';

@Injectable()
export class BlockchainEscrowSyncWorker {
  private readonly logger = new Logger(BlockchainEscrowSyncWorker.name);
  private lastSyncedBlock = 0;

  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async syncEscrows() {
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

          // Handle EscrowLocked
          if (api.events.bazariEscrow.EscrowLocked.is(event)) {
            await this.handleEscrowLocked(event.data);
          }

          // Handle EscrowReleased
          if (api.events.bazariEscrow.EscrowReleased.is(event)) {
            await this.handleEscrowReleased(event.data);
          }

          // Handle EscrowAutoReleased
          if (api.events.bazariEscrow.EscrowAutoReleased.is(event)) {
            await this.handleEscrowAutoReleased(event.data);
          }

          // Handle EscrowRefunded
          if (api.events.bazariEscrow.EscrowRefunded.is(event)) {
            await this.handleEscrowRefunded(event.data);
          }
        }
      }

      this.lastSyncedBlock = currentBlock;
    } catch (error) {
      this.logger.error('Escrow sync failed', error);
    }
  }

  private async handleEscrowLocked(data: any) {
    const [escrowId, depositor, beneficiary, amount, assetId, releaseAt] = data;

    // Find order associated with this escrow
    const order = await this.prisma.order.findFirst({
      where: {
        paymentIntent: {
          metadata: {
            path: ['escrowId'],
            equals: escrowId.toNumber(),
          },
        },
      },
    });

    if (order) {
      // Update PaymentIntent
      await this.prisma.paymentIntent.upsert({
        where: { orderId: order.id },
        create: {
          id: `escrow_${escrowId.toString()}`,
          orderId: order.id,
          provider: 'BLOCKCHAIN',
          amount: amount.toString(),
          status: 'COMPLETED',
          metadata: {
            escrowId: escrowId.toNumber(),
            releaseAt: releaseAt ? releaseAt.toNumber() : null,
          },
        },
        update: {
          status: 'COMPLETED',
          metadata: {
            escrowId: escrowId.toNumber(),
            releaseAt: releaseAt ? releaseAt.toNumber() : null,
          },
        },
      });

      this.logger.log(`Synced EscrowLocked: escrowId=${escrowId.toNumber()}`);
    }
  }

  private async handleEscrowReleased(data: any) {
    const [escrowId, beneficiary, amount] = data;

    // Update order status
    await this.prisma.paymentIntent.updateMany({
      where: {
        metadata: {
          path: ['escrowId'],
          equals: escrowId.toNumber(),
        },
      },
      data: {
        status: 'RELEASED',
      },
    });

    this.logger.log(`Synced EscrowReleased: escrowId=${escrowId.toNumber()}`);
  }

  private async handleEscrowAutoReleased(data: any) {
    const [escrowId, beneficiary, amount] = data;

    // Same as manual release
    await this.handleEscrowReleased(data);

    this.logger.log(`Synced EscrowAutoReleased: escrowId=${escrowId.toNumber()}`);
  }

  private async handleEscrowRefunded(data: any) {
    const [escrowId, depositor, amount] = data;

    await this.prisma.paymentIntent.updateMany({
      where: {
        metadata: {
          path: ['escrowId'],
          equals: escrowId.toNumber(),
        },
      },
      data: {
        status: 'REFUNDED',
      },
    });

    this.logger.log(`Synced EscrowRefunded: escrowId=${escrowId.toNumber()}`);
  }
}
```

---

## 🛣️ Step 4: Update Routes

Edit `/root/bazari/apps/api/src/routes/orders.ts`:

```typescript
/**
 * POST /api/orders/:id/pay
 * Pay for order (lock escrow)
 */
router.post('/:id/pay', async (req, res) => {
  try {
    const result = await unifiedOrderService.payOrder(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/orders/:id/confirm-delivery
 * Buyer confirms delivery (release escrow)
 */
router.post('/:id/confirm-delivery', async (req, res) => {
  try {
    const result = await unifiedOrderService.confirmDelivery(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/orders/:id/refund
 * Seller refunds order (return escrow to buyer)
 */
router.post('/:id/refund', async (req, res) => {
  try {
    const result = await unifiedOrderService.refundOrder(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/orders/:id/escrow
 * Get escrow status for order
 */
router.get('/:id/escrow', async (req, res) => {
  try {
    const order = await unifiedOrderService.getOrder(req.params.id);

    if (!order || !order.paymentIntent?.metadata?.escrowId) {
      return res.status(404).json({ error: 'Escrow not found' });
    }

    const escrowId = order.paymentIntent.metadata.escrowId;
    const escrow = await blockchainService.getEscrow(escrowId);

    res.json({
      escrowId,
      status: escrow.status,
      amount: escrow.amount,
      autoReleaseAt: escrow.autoReleaseAt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 🧪 Testing

### Test Auto-Release

```bash
# 1. Create and pay for order
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"storeId": "1", "items": [...]}'

ORDER_ID=$(echo $response | jq -r '.orderId')

curl -X POST http://localhost:3000/api/orders/$ORDER_ID/pay \
  -H "Authorization: Bearer $TOKEN"

# 2. Wait 7 days (or advance blocks in dev)
# In dev mode, you can manually trigger block production

# 3. Check escrow status
curl http://localhost:3000/api/orders/$ORDER_ID/escrow \
  -H "Authorization: Bearer $TOKEN"

# Should show status: "Released" after 7 days
```

### Test Manual Release

```bash
# Buyer confirms delivery early
curl -X POST http://localhost:3000/api/orders/$ORDER_ID/confirm-delivery \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 Monitoring Dashboard

Add escrow metrics to status script:

```bash
# /root/bazari-status.sh
echo "=== Escrow Stats ==="
psql -U bazari -d bazari -c "
  SELECT
    pi.status,
    COUNT(*) as count,
    SUM(CAST(pi.amount AS NUMERIC)) as total_locked
  FROM \"PaymentIntent\" pi
  WHERE pi.provider = 'BLOCKCHAIN'
  GROUP BY pi.status;
"
```

---

## ✅ Integration Checklist

- [ ] BlockchainService escrow methods implemented
- [ ] UnifiedOrderService updated with pay/confirm/refund
- [ ] EscrowSyncWorker running
- [ ] Routes created for escrow operations
- [ ] Auto-release tested (7-day timeout)
- [ ] Manual release tested
- [ ] Refund flow tested
- [ ] Monitoring dashboard updated

---

## 🚨 Critical Security Notes

1. **Never expose seed phrases**: Platform account seed should be in secure vault
2. **Validate signatures**: Always verify buyer/seller signatures before extrinsics
3. **Test timeouts**: Ensure auto-release works correctly (critical for buyer protection)
4. **Monitor failed releases**: Alert if auto-release hooks fail

---

## 📚 Next Steps

After completing bazari-escrow integration:
1. Implement [bazari-rewards](../bazari-rewards/INTEGRATION.md)
2. Test complete order flow: Create → Pay (Escrow) → Ship → Deliver (Release)
3. Deploy to testnet for load testing
