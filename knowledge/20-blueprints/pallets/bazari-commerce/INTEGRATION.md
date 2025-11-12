# bazari-commerce Pallet - Backend Integration Guide

**Target**: NestJS API (`/root/bazari/apps/api`)
**Timeline**: Week 4-5 of Sprint Plan

---

## 🎯 Integration Overview

Replace MOCK commerce system with real on-chain transactions by:
1. Creating **UnifiedOrderService** that calls blockchain extrinsics
2. Setting up **BlockchainSyncWorker** to index events into PostgreSQL
3. Updating existing routes to use new service
4. Migrating data from ChatProposal → Order table

---

## 📦 Prerequisites

### Install Polkadot.js API

```bash
cd /root/bazari/apps/api
pnpm add @polkadot/api @polkadot/types @polkadot/util @polkadot/util-crypto
```

### Environment Variables

Add to `/root/bazari/apps/api/.env`:

```env
# Blockchain Node
BLOCKCHAIN_WS_URL=ws://127.0.0.1:9944

# Accounts
PLATFORM_TREASURY_ADDRESS=5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
PLATFORM_SEED_PHRASE="your mnemonic here"

# Sync settings
BLOCKCHAIN_SYNC_ENABLED=true
BLOCKCHAIN_SYNC_INTERVAL_MS=6000
```

---

## 🔧 Step 1: Blockchain Service

Create `/root/bazari/apps/api/src/services/blockchain/blockchain.service.ts`:

```typescript
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { ISubmittableResult } from '@polkadot/types/types';

export interface OrderItem {
  productId: string; // Will be converted to [u8; 32]
  storeId: number;
  quantity: number;
  unitPrice: string; // String to handle large numbers
}

export interface CreateOrderParams {
  source: 'Marketplace' | 'BazChat';
  threadId?: string; // Hex string
  seller: string; // SS58 address
  storeId?: number;
  items: OrderItem[];
  isMultiStore: boolean;
}

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private api: ApiPromise;
  private keyring: Keyring;
  private platformAccount: KeyringPair;

  async onModuleInit() {
    await this.connect();
  }

  /**
   * Connect to Substrate node
   */
  private async connect() {
    try {
      const provider = new WsProvider(process.env.BLOCKCHAIN_WS_URL || 'ws://127.0.0.1:9944');
      this.api = await ApiPromise.create({ provider });

      this.keyring = new Keyring({ type: 'sr25519' });

      // Initialize platform account
      if (process.env.PLATFORM_SEED_PHRASE) {
        this.platformAccount = this.keyring.addFromUri(process.env.PLATFORM_SEED_PHRASE);
        this.logger.log(`Connected to blockchain. Platform account: ${this.platformAccount.address}`);
      }

      // Listen to disconnection
      this.api.on('disconnected', () => {
        this.logger.warn('Blockchain connection lost. Reconnecting...');
        this.connect();
      });

      this.logger.log('Blockchain service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to connect to blockchain', error);
      throw error;
    }
  }

  /**
   * Get API instance
   */
  getApi(): ApiPromise {
    if (!this.api) {
      throw new Error('Blockchain API not initialized');
    }
    return this.api;
  }

  /**
   * Create order on-chain
   */
  async createOrder(buyer: string, params: CreateOrderParams): Promise<{ orderId: number; txHash: string }> {
    try {
      // Convert items to blockchain format
      const items = params.items.map(item => ({
        productId: this.stringToFixedArray(item.productId, 32),
        storeId: item.storeId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: (BigInt(item.unitPrice) * BigInt(item.quantity)).toString(),
      }));

      // Prepare thread_id
      const threadId = params.threadId ? this.hexToFixedArray(params.threadId, 32) : null;

      // Create extrinsic
      const extrinsic = this.api.tx.bazariCommerce.createOrder(
        params.source,
        threadId,
        params.seller,
        params.storeId || null,
        items,
        params.isMultiStore,
      );

      // Sign and send (buyer signs)
      const buyerKeyring = this.keyring.addFromAddress(buyer);
      const result = await this.signAndSend(extrinsic, buyerKeyring);

      // Extract order_id from event
      const orderCreatedEvent = result.events.find(
        ({ event }) =>
          this.api.events.bazariCommerce.OrderCreated.is(event)
      );

      if (!orderCreatedEvent) {
        throw new Error('OrderCreated event not found');
      }

      const orderId = orderCreatedEvent.event.data[0].toNumber();
      const txHash = result.status.asInBlock.toString();

      this.logger.log(`Order created on-chain: orderId=${orderId}, txHash=${txHash}`);

      return { orderId, txHash };
    } catch (error) {
      this.logger.error('Failed to create order on-chain', error);
      throw error;
    }
  }

  /**
   * Accept BazChat proposal
   */
  async acceptProposal(buyer: string, orderId: number): Promise<string> {
    const extrinsic = this.api.tx.bazariCommerce.acceptProposal(orderId);
    const buyerKeyring = this.keyring.addFromAddress(buyer);
    const result = await this.signAndSend(extrinsic, buyerKeyring);
    return result.status.asInBlock.toString();
  }

  /**
   * Mark order as paid (after escrow lock)
   */
  async markPaid(buyer: string, orderId: number, escrowId: number): Promise<string> {
    const extrinsic = this.api.tx.bazariCommerce.markPaid(orderId, escrowId);
    const buyerKeyring = this.keyring.addFromAddress(buyer);
    const result = await this.signAndSend(extrinsic, buyerKeyring);
    return result.status.asInBlock.toString();
  }

  /**
   * Mark order as shipped (seller confirms)
   */
  async markShipped(seller: string, orderId: number): Promise<string> {
    const extrinsic = this.api.tx.bazariCommerce.markShipped(orderId);
    const sellerKeyring = this.keyring.addFromAddress(seller);
    const result = await this.signAndSend(extrinsic, sellerKeyring);
    return result.status.asInBlock.toString();
  }

  /**
   * Mark order as delivered (buyer confirms)
   */
  async markDelivered(buyer: string, orderId: number): Promise<string> {
    const extrinsic = this.api.tx.bazariCommerce.markDelivered(orderId);
    const buyerKeyring = this.keyring.addFromAddress(buyer);
    const result = await this.signAndSend(extrinsic, buyerKeyring);
    return result.status.asInBlock.toString();
  }

  /**
   * Mint receipt NFT
   */
  async mintReceipt(buyer: string, orderId: number, ipfsCid: string): Promise<{ nftId: number; txHash: string }> {
    const cidBytes = Buffer.from(ipfsCid);
    const extrinsic = this.api.tx.bazariCommerce.mintReceipt(orderId, cidBytes);
    const buyerKeyring = this.keyring.addFromAddress(buyer);
    const result = await this.signAndSend(extrinsic, buyerKeyring);

    // Extract NFT ID from event
    const receiptMintedEvent = result.events.find(
      ({ event }) => this.api.events.bazariCommerce.ReceiptMinted.is(event)
    );

    const nftId = receiptMintedEvent.event.data[1].toNumber();
    const txHash = result.status.asInBlock.toString();

    return { nftId, txHash };
  }

  /**
   * Cancel order
   */
  async cancelOrder(actor: string, orderId: number): Promise<string> {
    const extrinsic = this.api.tx.bazariCommerce.cancelOrder(orderId);
    const actorKeyring = this.keyring.addFromAddress(actor);
    const result = await this.signAndSend(extrinsic, actorKeyring);
    return result.status.asInBlock.toString();
  }

  /**
   * Query order from blockchain
   */
  async getOrder(orderId: number) {
    const order = await this.api.query.bazariCommerce.orders(orderId);
    return order.toJSON();
  }

  /**
   * Subscribe to order events
   */
  subscribeToOrderEvents(callback: (event: any) => void) {
    this.api.query.system.events((events) => {
      events.forEach((record) => {
        const { event } = record;

        if (this.api.events.bazariCommerce.OrderCreated.is(event)) {
          callback({ type: 'OrderCreated', data: event.data.toJSON() });
        } else if (this.api.events.bazariCommerce.OrderPaid.is(event)) {
          callback({ type: 'OrderPaid', data: event.data.toJSON() });
        } else if (this.api.events.bazariCommerce.OrderShipped.is(event)) {
          callback({ type: 'OrderShipped', data: event.data.toJSON() });
        } else if (this.api.events.bazariCommerce.OrderDelivered.is(event)) {
          callback({ type: 'OrderDelivered', data: event.data.toJSON() });
        }
      });
    });
  }

  /**
   * Sign and send extrinsic
   */
  private async signAndSend(
    extrinsic: SubmittableExtrinsic<'promise'>,
    signer: KeyringPair
  ): Promise<ISubmittableResult> {
    return new Promise((resolve, reject) => {
      extrinsic.signAndSend(signer, ({ status, events, dispatchError }) => {
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = this.api.registry.findMetaError(dispatchError.asModule);
            reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`));
          } else {
            reject(new Error(dispatchError.toString()));
          }
        }

        if (status.isInBlock) {
          resolve({ status, events, dispatchError } as ISubmittableResult);
        }
      });
    });
  }

  /**
   * Helper: Convert string to fixed-size array
   */
  private stringToFixedArray(str: string, size: number): number[] {
    const buffer = Buffer.from(str);
    const array = new Array(size).fill(0);
    for (let i = 0; i < Math.min(buffer.length, size); i++) {
      array[i] = buffer[i];
    }
    return array;
  }

  /**
   * Helper: Convert hex string to fixed-size array
   */
  private hexToFixedArray(hex: string, size: number): number[] {
    const buffer = Buffer.from(hex.replace('0x', ''), 'hex');
    const array = new Array(size).fill(0);
    for (let i = 0; i < Math.min(buffer.length, size); i++) {
      array[i] = buffer[i];
    }
    return array;
  }
}
```

---

## 🔄 Step 2: Blockchain Sync Worker

Create `/root/bazari/apps/api/src/workers/blockchain-order-sync.worker.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../services/blockchain/blockchain.service';
import { OrderStatus, OrderSource } from '@prisma/client';

@Injectable()
export class BlockchainOrderSyncWorker {
  private readonly logger = new Logger(BlockchainOrderSyncWorker.name);
  private lastSyncedBlock = 0;

  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService,
  ) {}

  /**
   * Sync orders from blockchain to PostgreSQL (every 6 seconds)
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async syncOrders() {
    if (process.env.BLOCKCHAIN_SYNC_ENABLED !== 'true') {
      return;
    }

    try {
      const api = this.blockchain.getApi();
      const currentBlock = (await api.rpc.chain.getHeader()).number.toNumber();

      this.logger.debug(`Syncing blocks ${this.lastSyncedBlock} to ${currentBlock}`);

      // Query events from last synced block
      for (let blockNum = this.lastSyncedBlock + 1; blockNum <= currentBlock; blockNum++) {
        const blockHash = await api.rpc.chain.getBlockHash(blockNum);
        const events = await api.query.system.events.at(blockHash);

        for (const record of events) {
          const { event } = record;

          // Handle OrderCreated event
          if (api.events.bazariCommerce.OrderCreated.is(event)) {
            await this.handleOrderCreated(event.data);
          }

          // Handle OrderPaid event
          if (api.events.bazariCommerce.OrderPaid.is(event)) {
            await this.handleOrderPaid(event.data);
          }

          // Handle OrderShipped event
          if (api.events.bazariCommerce.OrderShipped.is(event)) {
            await this.handleOrderShipped(event.data);
          }

          // Handle OrderDelivered event
          if (api.events.bazariCommerce.OrderDelivered.is(event)) {
            await this.handleOrderDelivered(event.data);
          }
        }
      }

      this.lastSyncedBlock = currentBlock;
    } catch (error) {
      this.logger.error('Sync failed', error);
    }
  }

  /**
   * Handle OrderCreated event
   */
  private async handleOrderCreated(data: any) {
    const [orderId, buyer, seller, totalAmount, source] = data;

    // Fetch full order from blockchain
    const order = await this.blockchain.getOrder(orderId.toNumber());

    // Upsert to PostgreSQL
    await this.prisma.order.upsert({
      where: { id: `chain_${orderId.toString()}` },
      create: {
        id: `chain_${orderId.toString()}`,
        userId: buyer.toString(),
        storeId: order.storeId?.toString(),
        source: source.isMarketplace ? OrderSource.MARKETPLACE : OrderSource.BAZCHAT,
        threadId: order.threadId ? Buffer.from(order.threadId).toString('hex') : null,
        isMultiStore: order.isMultiStore,
        status: this.mapStatus(order.status),
        totalAmount: totalAmount.toString(),
        platformFee: order.platformFee.toString(),
        metadata: {
          blockchainOrderId: orderId.toNumber(),
          txHash: 'pending', // Will be updated on finalization
        },
      },
      update: {
        status: this.mapStatus(order.status),
        totalAmount: totalAmount.toString(),
      },
    });

    this.logger.log(`Synced OrderCreated: orderId=${orderId.toNumber()}`);
  }

  /**
   * Handle OrderPaid event
   */
  private async handleOrderPaid(data: any) {
    const [orderId, escrowId, amount] = data;

    await this.prisma.order.update({
      where: { id: `chain_${orderId.toString()}` },
      data: {
        status: OrderStatus.PAID,
        metadata: {
          escrowId: escrowId.toNumber(),
        },
      },
    });

    // Create PaymentIntent
    await this.prisma.paymentIntent.create({
      data: {
        id: `escrow_${escrowId.toString()}`,
        orderId: `chain_${orderId.toString()}`,
        provider: 'BLOCKCHAIN',
        amount: amount.toString(),
        status: 'COMPLETED',
      },
    });

    this.logger.log(`Synced OrderPaid: orderId=${orderId.toNumber()}`);
  }

  /**
   * Handle OrderShipped event
   */
  private async handleOrderShipped(data: any) {
    const [orderId] = data;

    await this.prisma.order.update({
      where: { id: `chain_${orderId.toString()}` },
      data: {
        status: OrderStatus.SHIPPED,
      },
    });

    this.logger.log(`Synced OrderShipped: orderId=${orderId.toNumber()}`);
  }

  /**
   * Handle OrderDelivered event
   */
  private async handleOrderDelivered(data: any) {
    const [orderId, saleId] = data;

    await this.prisma.order.update({
      where: { id: `chain_${orderId.toString()}` },
      data: {
        status: OrderStatus.DELIVERED,
      },
    });

    this.logger.log(`Synced OrderDelivered: orderId=${orderId.toNumber()}`);
  }

  /**
   * Map blockchain status to Prisma enum
   */
  private mapStatus(blockchainStatus: any): OrderStatus {
    if (blockchainStatus.isProposed) return OrderStatus.PROPOSED;
    if (blockchainStatus.isPending) return OrderStatus.PENDING;
    if (blockchainStatus.isPaid) return OrderStatus.PAID;
    if (blockchainStatus.isShipped) return OrderStatus.SHIPPED;
    if (blockchainStatus.isDelivered) return OrderStatus.DELIVERED;
    if (blockchainStatus.isCancelled) return OrderStatus.CANCELLED;
    if (blockchainStatus.isRefunded) return OrderStatus.REFUNDED;
    return OrderStatus.PENDING;
  }
}
```

---

## 🛠️ Step 3: Unified Order Service

Create `/root/bazari/apps/api/src/services/orders/unified-order.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { OrderSource, OrderStatus } from '@prisma/client';

export interface CreateOrderDTO {
  userId: string;
  source: 'MARKETPLACE' | 'BAZCHAT';
  threadId?: string;
  storeId?: string;
  sellerId: string;
  items: {
    productId: string;
    storeId: string;
    quantity: number;
    unitPrice: number;
  }[];
  isMultiStore?: boolean;
}

@Injectable()
export class UnifiedOrderService {
  private readonly logger = new Logger(UnifiedOrderService.name);

  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService,
  ) {}

  /**
   * Create order (calls blockchain)
   */
  async createOrder(dto: CreateOrderDTO) {
    try {
      // Get user's blockchain address
      const profile = await this.prisma.profile.findUnique({
        where: { id: dto.userId },
      });

      if (!profile?.walletAddress) {
        throw new Error('User wallet address not found');
      }

      // Get seller's blockchain address
      const sellerProfile = await this.prisma.profile.findUnique({
        where: { id: dto.sellerId },
      });

      if (!sellerProfile?.walletAddress) {
        throw new Error('Seller wallet address not found');
      }

      // Create order on blockchain
      const { orderId, txHash } = await this.blockchain.createOrder(profile.walletAddress, {
        source: dto.source,
        threadId: dto.threadId,
        seller: sellerProfile.walletAddress,
        storeId: dto.storeId ? parseInt(dto.storeId) : undefined,
        items: dto.items.map(item => ({
          productId: item.productId,
          storeId: parseInt(item.storeId),
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
        })),
        isMultiStore: dto.isMultiStore || false,
      });

      this.logger.log(`Order created on-chain: orderId=${orderId}, txHash=${txHash}`);

      // PostgreSQL will be synced by BlockchainOrderSyncWorker
      // Return immediately with blockchain data
      return {
        orderId: `chain_${orderId}`,
        txHash,
        status: dto.source === 'BAZCHAT' ? OrderStatus.PROPOSED : OrderStatus.PENDING,
      };
    } catch (error) {
      this.logger.error('Failed to create order', error);
      throw error;
    }
  }

  /**
   * Accept BazChat proposal
   */
  async acceptProposal(orderId: string, userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
    });

    const blockchainOrderId = parseInt(orderId.replace('chain_', ''));
    const txHash = await this.blockchain.acceptProposal(profile.walletAddress, blockchainOrderId);

    return { txHash };
  }

  /**
   * Get order by ID (from PostgreSQL cache)
   */
  async getOrder(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        paymentIntent: true,
      },
    });
  }

  /**
   * List user orders
   */
  async listUserOrders(userId: string, filters?: any) {
    return this.prisma.order.findMany({
      where: {
        userId,
        ...filters,
      },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
```

---

## 🔌 Step 4: Update Routes

Edit `/root/bazari/apps/api/src/routes/orders.ts`:

```typescript
import { Router } from 'express';
import { UnifiedOrderService } from '../services/orders/unified-order.service';

const router = Router();

/**
 * POST /api/orders
 * Create new order (Marketplace or BazChat)
 */
router.post('/', async (req, res) => {
  try {
    const result = await unifiedOrderService.createOrder({
      userId: req.user.id,
      source: req.body.source || 'MARKETPLACE',
      storeId: req.body.storeId,
      sellerId: req.body.sellerId,
      items: req.body.items,
      isMultiStore: req.body.isMultiStore,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/orders/:id
 * Get order details
 */
router.get('/:id', async (req, res) => {
  try {
    const order = await unifiedOrderService.getOrder(req.params.id);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

## 🧪 Testing

### Manual Test

```bash
# 1. Start blockchain node
cd /root/bazari-chain
./target/release/solochain-template-node --dev

# 2. Start API server
cd /root/bazari/apps/api
pnpm dev

# 3. Create test order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "source": "MARKETPLACE",
    "storeId": "1",
    "sellerId": "user2",
    "items": [
      {
        "productId": "product123",
        "storeId": "1",
        "quantity": 2,
        "unitPrice": 1000
      }
    ]
  }'
```

---

## 📊 Monitoring

Add to `/root/bazari-status.sh`:

```bash
echo "=== Blockchain Order Sync Status ==="
psql -U bazari -d bazari -c "SELECT COUNT(*) as orders_synced FROM \"Order\" WHERE metadata->>'blockchainOrderId' IS NOT NULL;"
```

---

## ✅ Integration Checklist

- [ ] BlockchainService implemented
- [ ] BlockchainOrderSyncWorker running
- [ ] UnifiedOrderService created
- [ ] Routes updated to use UnifiedOrderService
- [ ] Tests passing (unit + integration)
- [ ] Sync worker monitoring in place
- [ ] No more `generateMockTxHash()` calls in codebase

---

## 📚 Next Steps

After completing bazari-commerce integration:
1. Implement [bazari-escrow integration](../bazari-escrow/INTEGRATION.md)
2. Update frontend to use real txHash
3. Remove deprecated `commission.ts` and `ChatProposal` model
