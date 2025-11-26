// @ts-nocheck - Polkadot.js type incompatibilities
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { BlockchainSyncWorker } from './blockchain-sync.worker.js';
import { BlockchainEventsService } from '../services/blockchain/blockchain-events.service.js';

/**
 * Unit tests for BlockchainSyncWorker
 * Note: These are unit tests with mocked blockchain events
 * Integration tests would require a real blockchain connection
 */
describe('BlockchainSyncWorker', () => {
  let worker: BlockchainSyncWorker;
  let prisma: PrismaClient;
  let mockLogger: any;
  let eventsService: BlockchainEventsService;

  beforeEach(() => {
    prisma = new PrismaClient();
    eventsService = BlockchainEventsService.getInstance();

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    worker = new BlockchainSyncWorker(prisma, {
      logger: mockLogger,
      heartbeatIntervalMs: 1000, // 1 second for testing
      reconnectDelayMs: 100, // 100ms for testing
      maxReconnectAttempts: 3,
    });
  });

  afterEach(async () => {
    await worker.stop();

    // Clean up test data
    await prisma.blockchainOrder.deleteMany({
      where: {
        buyer: { startsWith: 'test_buyer_' },
      },
    });

    await prisma.deliveryProof.deleteMany({
      where: {
        attestor: { startsWith: 'test_attestor_' },
      },
    });

    await prisma.blockchainDispute.deleteMany({
      where: {
        plaintiff: { startsWith: 'test_plaintiff_' },
      },
    });

    await prisma.$disconnect();
  });

  describe('start and stop', () => {
    it('should start worker successfully', async () => {
      // Mock the events service to prevent actual blockchain connection
      vi.spyOn(eventsService, 'startListening').mockResolvedValue(undefined);

      await worker.start();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Starting worker'),
        expect.any(Object)
      );

      expect(eventsService.startListening).toHaveBeenCalled();
    });

    it('should prevent starting worker twice', async () => {
      vi.spyOn(eventsService, 'startListening').mockResolvedValue(undefined);

      await worker.start();
      await worker.start(); // Second start

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('already running')
      );
    });

    it('should stop worker successfully', async () => {
      vi.spyOn(eventsService, 'startListening').mockResolvedValue(undefined);
      vi.spyOn(eventsService, 'stopListening').mockResolvedValue(undefined);

      await worker.start();
      await worker.stop();

      expect(eventsService.stopListening).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Worker stopped')
      );
    });

    it('should handle connection failure on start', async () => {
      vi.spyOn(eventsService, 'startListening').mockRejectedValue(
        new Error('Connection failed')
      );

      await worker.start();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to connect'),
        expect.any(Error)
      );
    });
  });

  describe('handleOrderCreated', () => {
    it('should save OrderCreated event to database', async () => {
      const mockEvent = {
        orderId: 1,
        buyer: 'test_buyer_123',
        seller: 'test_seller_456',
        marketplace: 1,
        totalAmount: '1000000000000', // 1 BZR
        txHash: '0xabc123',
        blockNumber: 100,
      };

      // Manually call the handler (simulating event reception)
      await (worker as any).handleOrderCreated(mockEvent);

      // Verify order was saved
      const savedOrder = await prisma.blockchainOrder.findUnique({
        where: { orderId: 1 },
      });

      expect(savedOrder).toBeDefined();
      expect(savedOrder?.buyer).toBe('test_buyer_123');
      expect(savedOrder?.seller).toBe('test_seller_456');
      expect(savedOrder?.totalAmount).toBe('1000000000000');
      expect(savedOrder?.status).toBe('CREATED');

      const stats = worker.getStats();
      expect(stats.ordersCreated).toBe(1);
    });

    it('should skip duplicate OrderCreated events', async () => {
      const mockEvent = {
        orderId: 2,
        buyer: 'test_buyer_duplicate',
        seller: 'test_seller_duplicate',
        marketplace: 1,
        totalAmount: '500000000000',
        txHash: '0xdef456',
        blockNumber: 101,
      };

      // Call handler twice
      await (worker as any).handleOrderCreated(mockEvent);
      await (worker as any).handleOrderCreated(mockEvent);

      // Should only have one order
      const orders = await prisma.blockchainOrder.findMany({
        where: { orderId: 2 },
      });

      expect(orders).toHaveLength(1);

      const stats = worker.getStats();
      expect(stats.ordersCreated).toBe(1); // Only counted once
    });
  });

  describe('handleProofSubmitted', () => {
    it('should save ProofSubmitted event to database', async () => {
      // First create an order
      await prisma.blockchainOrder.create({
        data: {
          orderId: 10,
          buyer: 'test_buyer_proof',
          seller: 'test_seller_proof',
          marketplace: 1,
          totalAmount: '2000000000000',
          status: 'CREATED',
          txHash: '0x123',
          blockNumber: 100,
          createdAt: new Date(),
        },
      });

      const mockEvent = {
        orderId: 10,
        proofCid: 'QmTest123',
        attestor: 'test_attestor_courier',
        txHash: '0xproof789',
        blockNumber: 102,
      };

      await (worker as any).handleProofSubmitted(mockEvent);

      // Verify proof was saved
      const savedProof = await prisma.deliveryProof.findFirst({
        where: { orderId: 10 },
      });

      expect(savedProof).toBeDefined();
      expect(savedProof?.proofCid).toBe('QmTest123');
      expect(savedProof?.attestor).toBe('test_attestor_courier');

      // Verify order status was updated
      const updatedOrder = await prisma.blockchainOrder.findUnique({
        where: { orderId: 10 },
      });

      expect(updatedOrder?.status).toBe('PROOF_SUBMITTED');

      const stats = worker.getStats();
      expect(stats.proofsSubmitted).toBe(1);
    });

    it('should skip duplicate ProofSubmitted events', async () => {
      const mockEvent = {
        orderId: 11,
        proofCid: 'QmTest456',
        attestor: 'test_attestor_duplicate',
        txHash: '0xproof999',
        blockNumber: 103,
      };

      // Call handler twice
      await (worker as any).handleProofSubmitted(mockEvent);
      await (worker as any).handleProofSubmitted(mockEvent);

      // Should only have one proof
      const proofs = await prisma.deliveryProof.findMany({
        where: { orderId: 11, proofCid: 'QmTest456' },
      });

      expect(proofs).toHaveLength(1);

      const stats = worker.getStats();
      expect(stats.proofsSubmitted).toBe(1);
    });
  });

  describe('handleDisputeOpened', () => {
    it('should save DisputeOpened event to database', async () => {
      // First create an order
      await prisma.blockchainOrder.create({
        data: {
          orderId: 20,
          buyer: 'test_buyer_dispute',
          seller: 'test_seller_dispute',
          marketplace: 1,
          totalAmount: '3000000000000',
          status: 'PROOF_SUBMITTED',
          txHash: '0x123',
          blockNumber: 100,
          createdAt: new Date(),
        },
      });

      const mockEvent = {
        disputeId: 1,
        orderId: 20,
        plaintiff: 'test_plaintiff_buyer',
        defendant: 'test_defendant_seller',
        txHash: '0xdispute111',
        blockNumber: 105,
      };

      await (worker as any).handleDisputeOpened(mockEvent);

      // Verify dispute was saved
      const savedDispute = await prisma.blockchainDispute.findUnique({
        where: { disputeId: 1 },
      });

      expect(savedDispute).toBeDefined();
      expect(savedDispute?.orderId).toBe(20);
      expect(savedDispute?.plaintiff).toBe('test_plaintiff_buyer');
      expect(savedDispute?.defendant).toBe('test_defendant_seller');
      expect(savedDispute?.status).toBe('OPENED');

      // Verify order status was updated
      const updatedOrder = await prisma.blockchainOrder.findUnique({
        where: { orderId: 20 },
      });

      expect(updatedOrder?.status).toBe('DISPUTED');

      const stats = worker.getStats();
      expect(stats.disputesOpened).toBe(1);
    });

    it('should skip duplicate DisputeOpened events', async () => {
      const mockEvent = {
        disputeId: 2,
        orderId: 21,
        plaintiff: 'test_plaintiff_duplicate',
        defendant: 'test_defendant_duplicate',
        txHash: '0xdispute222',
        blockNumber: 106,
      };

      // Call handler twice
      await (worker as any).handleDisputeOpened(mockEvent);
      await (worker as any).handleDisputeOpened(mockEvent);

      // Should only have one dispute
      const disputes = await prisma.blockchainDispute.findMany({
        where: { disputeId: 2 },
      });

      expect(disputes).toHaveLength(1);

      const stats = worker.getStats();
      expect(stats.disputesOpened).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should handle errors in event processing', async () => {
      // Invalid event (missing required fields)
      const invalidEvent = {
        orderId: null,
        buyer: null,
      };

      await (worker as any).handleOrderCreated(invalidEvent);

      const stats = worker.getStats();
      expect(stats.errors).toBeGreaterThan(0);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should call error handler on error events', async () => {
      const mockError = new Error('Test error');

      await (worker as any).handleError(mockError);

      const stats = worker.getStats();
      expect(stats.errors).toBe(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Event processing error'),
        mockError
      );
    });
  });

  describe('getStats', () => {
    it('should return current statistics', async () => {
      const stats = worker.getStats();

      expect(stats).toBeDefined();
      expect(stats.ordersCreated).toBe(0);
      expect(stats.proofsSubmitted).toBe(0);
      expect(stats.disputesOpened).toBe(0);
      expect(stats.errors).toBe(0);
      expect(stats.connectionStatus).toBe('disconnected');
    });

    it('should update statistics correctly', async () => {
      const mockEvent = {
        orderId: 30,
        buyer: 'test_buyer_stats',
        seller: 'test_seller_stats',
        marketplace: 1,
        totalAmount: '1000000000000',
        txHash: '0xstats123',
        blockNumber: 110,
      };

      await (worker as any).handleOrderCreated(mockEvent);

      const stats = worker.getStats();
      expect(stats.ordersCreated).toBe(1);
      expect(stats.lastEvent).toBeInstanceOf(Date);
    });
  });

  describe('resetStats', () => {
    it('should reset statistics to zero', async () => {
      // Create some events first
      const mockEvent = {
        orderId: 40,
        buyer: 'test_buyer_reset',
        seller: 'test_seller_reset',
        marketplace: 1,
        totalAmount: '1000000000000',
        txHash: '0xreset123',
        blockNumber: 120,
      };

      await (worker as any).handleOrderCreated(mockEvent);

      let stats = worker.getStats();
      expect(stats.ordersCreated).toBe(1);

      // Reset
      worker.resetStats();

      stats = worker.getStats();
      expect(stats.ordersCreated).toBe(0);
      expect(stats.proofsSubmitted).toBe(0);
      expect(stats.disputesOpened).toBe(0);
      expect(stats.errors).toBe(0);
    });
  });

  describe('heartbeat', () => {
    it('should log heartbeat periodically', async () => {
      vi.spyOn(eventsService, 'startListening').mockResolvedValue(undefined);

      // Start worker with short heartbeat interval
      await worker.start();

      // Wait for at least one heartbeat
      await new Promise((resolve) => setTimeout(resolve, 1200));

      await worker.stop();

      // Should have logged heartbeat
      const heartbeatLogs = mockLogger.info.mock.calls.filter((call: any) =>
        call[0]?.includes?.('Heartbeat OK')
      );

      expect(heartbeatLogs.length).toBeGreaterThan(0);
    });
  });

  describe('connection status', () => {
    it('should track connection status', async () => {
      vi.spyOn(eventsService, 'startListening').mockResolvedValue(undefined);

      await worker.start();

      const stats = worker.getStats();
      expect(['connected', 'disconnected', 'reconnecting']).toContain(stats.connectionStatus);
    });
  });
});
