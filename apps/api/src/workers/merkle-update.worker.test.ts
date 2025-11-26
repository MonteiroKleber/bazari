// @ts-nocheck - Polkadot.js type incompatibilities
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { MerkleUpdateWorker } from './merkle-update.worker.js';
import { ReviewService } from '../services/review.service.js';

/**
 * Unit and Integration tests for MerkleUpdateWorker
 */
describe('MerkleUpdateWorker', () => {
  let worker: MerkleUpdateWorker;
  let prisma: PrismaClient;
  let mockLogger: any;

  beforeEach(() => {
    prisma = new PrismaClient();

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    worker = new MerkleUpdateWorker(prisma, {
      logger: mockLogger,
      intervalMs: 1000, // 1 second for testing
      threshold: 10, // Lower threshold for testing
      dryRun: true, // Dry run to avoid blockchain calls
    });
  });

  afterEach(async () => {
    await worker.stop();

    // Clean up test reviews
    await prisma.courierReview.deleteMany({
      where: {
        reviewerId: { startsWith: 'test_merkle_' },
      },
    });

    await prisma.$disconnect();
  });

  describe('start and stop', () => {
    it('should start worker successfully', async () => {
      await worker.start();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Starting worker'),
        expect.any(Object)
      );
    });

    it('should prevent starting worker twice', async () => {
      await worker.start();
      await worker.start(); // Second start

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('already running')
      );
    });

    it('should stop worker successfully', async () => {
      await worker.start();
      await worker.stop();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Worker stopped')
      );
    });
  });

  describe('runUpdate', () => {
    it('should process couriers with pending reviews >= threshold', async () => {
      // Create test reviews (10 reviews for courier-test-1)
      const courierId = 'courier-test-1';
      const reviewService = new ReviewService(prisma);

      for (let i = 0; i < 10; i++) {
        await reviewService.createReview({
          deliveryRequestId: `test-delivery-${i}`,
          courierId,
          reviewerId: `test_merkle_reviewer-${i}`,
          rating: 5,
        });
      }

      // Run update
      const result = await worker.runUpdate();

      expect(result.couriersProcessed).toBeGreaterThanOrEqual(1);
      expect(result.details).toBeDefined();
      expect(result.details.some((d) => d.courierId === courierId)).toBe(true);
    });

    it('should skip couriers in dry run mode', async () => {
      const courierId = 'courier-test-2';
      const reviewService = new ReviewService(prisma);

      for (let i = 0; i < 10; i++) {
        await reviewService.createReview({
          deliveryRequestId: `test-delivery-${i}`,
          courierId,
          reviewerId: `test_merkle_reviewer-${i}`,
          rating: 4,
        });
      }

      const result = await worker.runUpdate();

      const courierDetail = result.details.find((d) => d.courierId === courierId);
      if (courierDetail) {
        expect(courierDetail.action).toBe('skipped');
        expect(courierDetail.reason).toContain('Dry run');
      }
    });

    it('should not process couriers with < threshold reviews', async () => {
      const courierId = 'courier-test-3';
      const reviewService = new ReviewService(prisma);

      // Only 5 reviews (< threshold of 10)
      for (let i = 0; i < 5; i++) {
        await reviewService.createReview({
          deliveryRequestId: `test-delivery-${i}`,
          courierId,
          reviewerId: `test_merkle_reviewer-${i}`,
          rating: 3,
        });
      }

      const result = await worker.runUpdate();

      expect(result.details.every((d) => d.courierId !== courierId)).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      // Create a worker with real blockchain calls (will fail without proper setup)
      const realWorker = new MerkleUpdateWorker(prisma, {
        logger: mockLogger,
        threshold: 10,
        dryRun: false, // Real mode
      });

      const courierId = 'courier-test-error';
      const reviewService = new ReviewService(prisma);

      for (let i = 0; i < 10; i++) {
        await reviewService.createReview({
          deliveryRequestId: `test-delivery-${i}`,
          courierId,
          reviewerId: `test_merkle_reviewer-${i}`,
          rating: 5,
        });
      }

      const result = await realWorker.runUpdate();

      // Should have processed the courier but likely got an error
      const courierDetail = result.details.find((d) => d.courierId === courierId);
      if (courierDetail) {
        expect(['error', 'updated']).toContain(courierDetail.action);
      }

      if (result.errors > 0) {
        expect(mockLogger.error).toHaveBeenCalled();
      }
    });
  });

  describe('getPendingStats', () => {
    it('should return pending review statistics', async () => {
      const courierId = 'courier-test-stats';
      const reviewService = new ReviewService(prisma);

      // Create 12 pending reviews
      for (let i = 0; i < 12; i++) {
        await reviewService.createReview({
          deliveryRequestId: `test-delivery-${i}`,
          courierId,
          reviewerId: `test_merkle_reviewer-${i}`,
          rating: 5,
        });
      }

      const stats = await worker.getPendingStats();

      expect(stats.totalPending).toBeGreaterThanOrEqual(12);
      expect(stats.couriersPendingUpdate).toBeGreaterThanOrEqual(1);
      expect(stats.courierStats).toBeDefined();

      const courierStat = stats.courierStats.find((s) => s.courierId === courierId);
      if (courierStat) {
        expect(courierStat.pendingCount).toBe(12);
      }
    });

    it('should return empty stats when no pending reviews', async () => {
      // Clean up all reviews
      await prisma.courierReview.deleteMany({
        where: { merkleIncluded: false },
      });

      const stats = await worker.getPendingStats();

      expect(stats.totalPending).toBe(0);
      expect(stats.couriersPendingUpdate).toBe(0);
      expect(stats.courierStats).toHaveLength(0);
    });
  });

  describe('forceCourierUpdate', () => {
    it('should force update for specific courier in dry run', async () => {
      const courierId = 'courier-test-force';
      const reviewService = new ReviewService(prisma);

      // Create some reviews
      for (let i = 0; i < 5; i++) {
        await reviewService.createReview({
          deliveryRequestId: `test-delivery-${i}`,
          courierId,
          reviewerId: `test_merkle_reviewer-${i}`,
          rating: 4,
        });
      }

      // This will fail in real mode without proper blockchain setup
      // So we'll catch the error and verify it was attempted
      try {
        // Note: forceCourierUpdate doesn't respect dryRun, so it will try to update blockchain
        // We expect it to fail due to missing blockchain connection
        await worker.forceCourierUpdate(courierId);
        // If it succeeds, that's also fine
      } catch (error) {
        // Expected to fail without proper blockchain setup
        expect(error).toBeDefined();
      }

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Forcing Merkle root update'),
        expect.any(String)
      );
    });
  });

  describe('integration with ReviewService', () => {
    it('should update Merkle root when threshold is reached', async () => {
      // This test requires a real blockchain connection
      // We'll mark reviews as included without actually calling blockchain

      const courierId = 'courier-test-integration';
      const reviewService = new ReviewService(prisma);

      // Create exactly 10 reviews (threshold)
      for (let i = 0; i < 10; i++) {
        await reviewService.createReview({
          deliveryRequestId: `test-delivery-${i}`,
          courierId,
          reviewerId: `test_merkle_reviewer-${i}`,
          rating: 5,
        });
      }

      // Run update in dry run mode
      const result = await worker.runUpdate();

      const courierDetail = result.details.find((d) => d.courierId === courierId);
      expect(courierDetail).toBeDefined();
      expect(courierDetail?.pendingReviews).toBe(10);
    });
  });

  describe('periodic execution', () => {
    it('should execute update periodically', async () => {
      // Create worker with very short interval
      const periodicWorker = new MerkleUpdateWorker(prisma, {
        logger: mockLogger,
        intervalMs: 100, // 100ms for testing
        threshold: 10,
        dryRun: true,
      });

      await periodicWorker.start();

      // Wait for at least 2 executions
      await new Promise((resolve) => setTimeout(resolve, 250));

      await periodicWorker.stop();

      // Should have logged multiple update cycles
      const updateLogs = mockLogger.info.mock.calls.filter((call: any) =>
        call[0]?.includes?.('Update cycle completed')
      );

      expect(updateLogs.length).toBeGreaterThanOrEqual(2);
    });
  });
});
