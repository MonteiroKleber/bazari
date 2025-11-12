# bazari-fee Pallet - Backend Integration Guide

**Target**: NestJS API + Payment splitting
**Timeline**: Week 17

---

## 🔧 Step 1: Extend BlockchainService

Add to `apps/api/src/services/blockchain/blockchain.service.ts`:

```typescript
/**
 * Split payment for an order
 */
async splitPayment(
  orderId: number,
  buyer: string,
  seller: string,
  totalAmount: string,
): Promise<string> {
  const extrinsic = this.api.tx.bazariFee.splitPayment(
    orderId,
    buyer,
    seller,
    totalAmount,
  );

  // Called by system account
  const result = await this.signAndSend(extrinsic, this.platformAccount);
  return result.status.asInBlock.toString();
}

/**
 * Preview fee split without executing
 */
async previewFeeSplit(buyer: string, totalAmount: string) {
  // Call runtime API
  const split = await this.api.call.bazariFeeApi.previewSplit(
    buyer,
    totalAmount,
  );

  return {
    platformFee: split.platform_fee.toString(),
    affiliateCommission: split.affiliate_commission.toString(),
    sellerPayment: split.seller_payment.toString(),
  };
}

/**
 * Get fee configuration
 */
async getFeeConfig() {
  const config = await this.api.query.bazariFee.feeConfig();
  return config.toJSON();
}

/**
 * Update fee configuration (governance only)
 */
async updateFeeConfig(
  platformFeePercent: number,
  affiliateFeePercent: number,
): Promise<string> {
  const extrinsic = this.api.tx.bazariFee.updateFeeConfig(
    platformFeePercent,
    affiliateFeePercent,
  );

  const result = await this.signAndSend(extrinsic, this.governanceAccount);
  return result.status.asInBlock.toString();
}

/**
 * Get order fee history
 */
async getOrderFees(orderId: number) {
  const fees = await this.api.query.bazariFee.orderFees(orderId);
  return fees.toJSON();
}

/**
 * Get total platform fees collected
 */
async getTotalPlatformFees(): Promise<string> {
  const total = await this.api.query.bazariFee.totalPlatformFees();
  return total.toString();
}

/**
 * Get total affiliate commissions paid
 */
async getTotalAffiliateCommissions(): Promise<string> {
  const total = await this.api.query.bazariFee.totalAffiliateCommissions();
  return total.toString();
}
```

---

## 🎯 Step 2: Payment Service

Create `apps/api/src/services/payment/payment.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService,
  ) {}

  /**
   * Preview payment breakdown before checkout
   */
  async previewPaymentBreakdown(userId: string, totalAmount: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
    });

    const split = await this.blockchain.previewFeeSplit(
      profile.walletAddress,
      totalAmount,
    );

    // Check if user has referrer
    const hasReferrer = !!profile.referrerId;

    return {
      totalAmount,
      platformFee: split.platformFee,
      affiliateCommission: hasReferrer ? split.affiliateCommission : '0',
      sellerPayment: split.sellerPayment,
      breakdown: [
        {
          recipient: 'Platform',
          amount: split.platformFee,
          percentage: await this.getFeePercentage('platform'),
        },
        hasReferrer
          ? {
              recipient: 'Referrer',
              amount: split.affiliateCommission,
              percentage: await this.getFeePercentage('affiliate'),
            }
          : null,
        {
          recipient: 'Seller',
          amount: split.sellerPayment,
          percentage: 100 - (await this.getTotalFeePercentage()),
        },
      ].filter(Boolean),
    };
  }

  /**
   * Execute payment split (called after order confirmation)
   */
  async executePaymentSplit(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { include: { profile: true } },
        store: { include: { profile: true } },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const blockchainOrderId = parseInt(orderId.replace('chain_', ''));
    const buyerWallet = order.user.profile.walletAddress;
    const sellerWallet = order.store.profile.walletAddress;
    const totalAmount = order.totalAmount.toString();

    try {
      const txHash = await this.blockchain.splitPayment(
        blockchainOrderId,
        buyerWallet,
        sellerWallet,
        totalAmount,
      );

      this.logger.log(
        `Payment split executed for order ${orderId}: ${txHash}`,
      );

      // Update order with payment details
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          paymentSplitTxHash: txHash,
          paymentSplitAt: new Date(),
        },
      });

      return { txHash, success: true };
    } catch (error) {
      this.logger.error(
        `Failed to split payment for order ${orderId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get fee configuration
   */
  private async getFeePercentage(
    type: 'platform' | 'affiliate',
  ): Promise<number> {
    const config = await this.blockchain.getFeeConfig();
    return type === 'platform'
      ? config.platform_fee_percent
      : config.affiliate_fee_percent;
  }

  private async getTotalFeePercentage(): Promise<number> {
    const config = await this.blockchain.getFeeConfig();
    return config.platform_fee_percent + config.affiliate_fee_percent;
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(startDate?: Date, endDate?: Date) {
    const totalPlatformFees = await this.blockchain.getTotalPlatformFees();
    const totalAffiliateCommissions =
      await this.blockchain.getTotalAffiliateCommissions();

    // Query PostgreSQL for order count
    const orderCount = await this.prisma.order.count({
      where: {
        paymentSplitAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return {
      totalPlatformFees,
      totalAffiliateCommissions,
      orderCount,
      averageFeePerOrder: orderCount > 0
        ? (BigInt(totalPlatformFees) / BigInt(orderCount)).toString()
        : '0',
    };
  }
}
```

---

## 🔄 Step 3: Integration with Order Flow

Update `apps/api/src/services/order/unified-order.service.ts`:

```typescript
import { PaymentService } from '../payment/payment.service';

@Injectable()
export class UnifiedOrderService {
  constructor(
    private blockchain: BlockchainService,
    private payment: PaymentService,
    // ... other services
  ) {}

  /**
   * Create order with payment preview
   */
  async createOrder(userId: string, orderData: CreateOrderDto) {
    // Calculate total
    const totalAmount = this.calculateTotal(orderData.items);

    // Preview payment breakdown
    const paymentPreview = await this.payment.previewPaymentBreakdown(
      userId,
      totalAmount,
    );

    // Create order on blockchain
    const { orderId, txHash } = await this.blockchain.createOrder(
      userId,
      orderData,
    );

    // Store in PostgreSQL
    const order = await this.prisma.order.create({
      data: {
        id: `chain_${orderId}`,
        userId,
        storeId: orderData.storeId,
        totalAmount,
        platformFee: paymentPreview.platformFee,
        affiliateCommission: paymentPreview.affiliateCommission,
        status: 'PENDING',
        txHash,
      },
    });

    return {
      orderId: order.id,
      txHash,
      paymentPreview,
    };
  }

  /**
   * Mark order as paid and execute payment split
   */
  async markOrderPaid(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    // Mark as paid on blockchain
    const txHash = await this.blockchain.markOrderPaid(
      parseInt(orderId.replace('chain_', '')),
    );

    // Execute payment split
    await this.payment.executePaymentSplit(orderId);

    // Update PostgreSQL
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    return { status: 'PAID', txHash };
  }
}
```

---

## 🛣️ Step 4: API Routes

Create `apps/api/src/routes/payment.routes.ts`:

```typescript
import { Router } from 'express';
import { PaymentService } from '../services/payment/payment.service';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * POST /api/payment/preview
 * Preview payment breakdown
 */
router.post('/preview', authenticate, async (req, res) => {
  try {
    const { totalAmount } = req.body;

    const preview = await paymentService.previewPaymentBreakdown(
      req.user.id,
      totalAmount,
    );

    res.json(preview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payment/config
 * Get fee configuration
 */
router.get('/config', async (req, res) => {
  try {
    const config = await blockchainService.getFeeConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payment/analytics
 * Get payment analytics (admin only)
 */
router.get('/analytics', authenticate, async (req, res) => {
  try {
    // Check admin role
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { startDate, endDate } = req.query;

    const analytics = await paymentService.getPaymentAnalytics(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
    );

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payment/orders/:orderId/fees
 * Get fee breakdown for specific order
 */
router.get('/orders/:orderId/fees', authenticate, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId.replace('chain_', ''));
    const fees = await blockchainService.getOrderFees(orderId);

    res.json(fees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/payment/config (Admin/Governance only)
 * Update fee configuration
 */
router.put('/config', authenticate, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { platformFeePercent, affiliateFeePercent } = req.body;

    const txHash = await blockchainService.updateFeeConfig(
      platformFeePercent,
      affiliateFeePercent,
    );

    res.json({ txHash, success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

## 📦 Step 5: Sync Worker

Create `apps/api/src/workers/payment-sync.worker.ts`:

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BlockchainService } from '../services/blockchain/blockchain.service';
import { PrismaService } from '../services/prisma/prisma.service';

@Injectable()
export class PaymentSyncWorker implements OnModuleInit {
  private readonly logger = new Logger(PaymentSyncWorker.name);

  constructor(
    private blockchain: BlockchainService,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    this.logger.log('Starting payment sync worker...');
    this.subscribeToEvents();
  }

  private async subscribeToEvents() {
    this.blockchain.api.query.system.events((events) => {
      events.forEach((record) => {
        const { event } = record;

        if (this.blockchain.api.events.bazariFee.PaymentSplit.is(event)) {
          this.handlePaymentSplit(event.data);
        }

        if (this.blockchain.api.events.bazariFee.FeeConfigUpdated.is(event)) {
          this.handleFeeConfigUpdated(event.data);
        }
      });
    });
  }

  private async handlePaymentSplit(data: any) {
    const orderId = data[0].toString();
    const buyer = data[1].toString();
    const seller = data[2].toString();
    const affiliate = data[3].toJSON();
    const platformFee = data[4].toString();
    const affiliateCommission = data[5].toString();
    const sellerPayment = data[6].toString();

    this.logger.log(`PaymentSplit: Order ${orderId}`);

    // Update PostgreSQL cache
    await this.prisma.order.update({
      where: { id: `chain_${orderId}` },
      data: {
        platformFee,
        affiliateCommission,
        sellerPayment,
        paymentSplitAt: new Date(),
      },
    });

    // Store in analytics table
    await this.prisma.paymentSplit.create({
      data: {
        orderId: `chain_${orderId}`,
        platformFee,
        affiliateCommission,
        sellerPayment,
        createdAt: new Date(),
      },
    });
  }

  private async handleFeeConfigUpdated(data: any) {
    const platformFeePercent = data[0].toNumber();
    const affiliateFeePercent = data[1].toNumber();

    this.logger.log(
      `FeeConfigUpdated: Platform ${platformFeePercent}%, Affiliate ${affiliateFeePercent}%`,
    );

    // Store in config cache
    await this.prisma.systemConfig.upsert({
      where: { key: 'fee_config' },
      update: {
        value: JSON.stringify({ platformFeePercent, affiliateFeePercent }),
      },
      create: {
        key: 'fee_config',
        value: JSON.stringify({ platformFeePercent, affiliateFeePercent }),
      },
    });
  }
}
```

---

## 🧪 Testing

```bash
# 1. Preview payment breakdown
curl -X POST http://localhost:3000/api/payment/preview \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{ "totalAmount": "100000000000000000" }'

# Response:
# {
#   "totalAmount": "100000000000000000",
#   "platformFee": "5000000000000000",
#   "affiliateCommission": "3000000000000000",
#   "sellerPayment": "92000000000000000",
#   "breakdown": [
#     { "recipient": "Platform", "amount": "5000000000000000", "percentage": 5 },
#     { "recipient": "Referrer", "amount": "3000000000000000", "percentage": 3 },
#     { "recipient": "Seller", "amount": "92000000000000000", "percentage": 92 }
#   ]
# }

# 2. Get fee configuration
curl http://localhost:3000/api/payment/config

# 3. Get order fee breakdown
curl http://localhost:3000/api/payment/orders/chain_123/fees \
  -H "Authorization: Bearer $USER_TOKEN"

# 4. Get payment analytics (admin)
curl http://localhost:3000/api/payment/analytics \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 5. Update fee config (admin)
curl -X PUT http://localhost:3000/api/payment/config \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{ "platformFeePercent": 10, "affiliateFeePercent": 5 }'
```

---

## ✅ Integration Checklist

- [ ] BlockchainService: splitPayment, previewFeeSplit, getFeeConfig
- [ ] PaymentService: preview, execute, analytics
- [ ] Routes: /payment/preview, /config, /analytics
- [ ] Sync worker for PaymentSplit events
- [ ] Integration with order creation flow
- [ ] Frontend: Payment breakdown UI on checkout
- [ ] Frontend: Admin panel for fee configuration

---

## 📊 Frontend Integration Example

```typescript
// apps/web/src/modules/payment/api/index.ts
export const previewPayment = async (totalAmount: string) => {
  const response = await apiClient.post('/api/payment/preview', {
    totalAmount,
  });
  return response.data;
};

// apps/web/src/modules/checkout/components/PaymentBreakdown.tsx
export function PaymentBreakdown({ totalAmount }: { totalAmount: string }) {
  const { data: preview } = useQuery(['paymentPreview', totalAmount], () =>
    previewPayment(totalAmount)
  );

  if (!preview) return <Skeleton />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {preview.breakdown.map((item, index) => (
            <div key={index} className="flex justify-between">
              <span>
                {item.recipient} ({item.percentage}%)
              </span>
              <span>{formatBZR(item.amount)}</span>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>{formatBZR(preview.totalAmount)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 📚 Next: [bazari-dispute/IMPLEMENTATION.md](../bazari-dispute/IMPLEMENTATION.md)
