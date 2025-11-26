// @ts-nocheck - Polkadot.js type incompatibilities
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ReviewService, CreateReviewDto } from './review.service.js';
import { BlockchainService } from './blockchain/blockchain.service.js';

/**
 * Unit and Integration tests for ReviewService
 *
 * Unit tests: Mock Prisma and BlockchainService
 * Integration tests: Use real database (requires PostgreSQL running)
 */

describe('ReviewService', () => {
  let service: ReviewService;
  let prisma: PrismaClient;
  let mockBlockchainService: any;

  beforeEach(() => {
    prisma = new PrismaClient();

    // Mock BlockchainService
    mockBlockchainService = {
      updateReviewsMerkleRoot: vi.fn().mockResolvedValue({
        txHash: '0x123',
        blockNumber: 100n,
      }),
    };

    service = new ReviewService(prisma, mockBlockchainService);
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.courierReview.deleteMany({
      where: {
        reviewerId: { startsWith: 'test_' },
      },
    });

    await prisma.$disconnect();
  });

  describe('createReview', () => {
    it('should create a review successfully', async () => {
      const reviewData: CreateReviewDto = {
        deliveryRequestId: 'test-delivery-1',
        courierId: 'courier-1',
        reviewerId: 'test_reviewer-1',
        rating: 5,
        comment: 'Excellent service!',
      };

      const review = await service.createReview(reviewData);

      expect(review).toBeDefined();
      expect(review.rating).toBe(5);
      expect(review.courierId).toBe('courier-1');
      expect(review.merkleIncluded).toBe(false);
    });

    it('should throw error for invalid rating', async () => {
      const reviewData: CreateReviewDto = {
        deliveryRequestId: 'test-delivery-1',
        courierId: 'courier-1',
        reviewerId: 'test_reviewer-1',
        rating: 6, // Invalid
      };

      await expect(service.createReview(reviewData)).rejects.toThrow(
        'Rating must be between 1 and 5'
      );
    });

    it('should not update Merkle root if less than 100 reviews', async () => {
      const reviewData: CreateReviewDto = {
        deliveryRequestId: 'test-delivery-1',
        courierId: 'courier-new',
        reviewerId: 'test_reviewer-1',
        rating: 5,
      };

      await service.createReview(reviewData);

      expect(mockBlockchainService.updateReviewsMerkleRoot).not.toHaveBeenCalled();
    });
  });

  describe('getCourierReviews', () => {
    beforeEach(async () => {
      // Create test reviews
      for (let i = 1; i <= 5; i++) {
        await service.createReview({
          deliveryRequestId: `test-delivery-${i}`,
          courierId: 'courier-test',
          reviewerId: `test_reviewer-${i}`,
          rating: i,
        });
      }
    });

    it('should get all reviews for a courier', async () => {
      const reviews = await service.getCourierReviews('courier-test');

      expect(reviews).toHaveLength(5);
      expect(reviews[0].courierId).toBe('courier-test');
    });

    it('should respect limit option', async () => {
      const reviews = await service.getCourierReviews('courier-test', {
        limit: 2,
      });

      expect(reviews).toHaveLength(2);
    });

    it('should respect offset option', async () => {
      const reviews = await service.getCourierReviews('courier-test', {
        offset: 3,
      });

      expect(reviews).toHaveLength(2); // Total 5, offset 3 = 2 remaining
    });
  });

  describe('getCourierAverageRating', () => {
    beforeEach(async () => {
      // Create reviews with ratings: 5, 4, 3 = avg 4
      await service.createReview({
        deliveryRequestId: 'test-delivery-1',
        courierId: 'courier-avg',
        reviewerId: 'test_reviewer-1',
        rating: 5,
      });

      await service.createReview({
        deliveryRequestId: 'test-delivery-2',
        courierId: 'courier-avg',
        reviewerId: 'test_reviewer-2',
        rating: 4,
      });

      await service.createReview({
        deliveryRequestId: 'test-delivery-3',
        courierId: 'courier-avg',
        reviewerId: 'test_reviewer-3',
        rating: 3,
      });
    });

    it('should calculate average rating correctly', async () => {
      const { average, count } = await service.getCourierAverageRating('courier-avg');

      expect(count).toBe(3);
      expect(average).toBe(4); // (5 + 4 + 3) / 3 = 4
    });

    it('should return 0 for courier with no reviews', async () => {
      const { average, count } = await service.getCourierAverageRating('courier-none');

      expect(count).toBe(0);
      expect(average).toBe(0);
    });
  });

  describe('Merkle Tree Operations', () => {
    it('should build Merkle tree with multiple reviews', async () => {
      // Create reviews
      const reviews = [];
      for (let i = 1; i <= 10; i++) {
        const review = await service.createReview({
          deliveryRequestId: `test-delivery-${i}`,
          courierId: 'courier-merkle',
          reviewerId: `test_reviewer-${i}`,
          rating: (i % 5) + 1, // Ratings 1-5
        });
        reviews.push(review);
      }

      // Mock courier wallet
      const mockWallet = {
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      };

      // Manually trigger Merkle update
      const rootHex = await service.updateMerkleRoot('courier-merkle', mockWallet);

      expect(rootHex).toMatch(/^0x[0-9a-f]{64}$/); // Valid hex hash
      expect(mockBlockchainService.updateReviewsMerkleRoot).toHaveBeenCalledWith(
        'courier-merkle',
        rootHex,
        mockWallet
      );

      // Verify reviews were marked as included
      const updatedReviews = await service.getCourierReviews('courier-merkle');
      expect(updatedReviews.every((r) => r.merkleIncluded)).toBe(true);
      expect(updatedReviews.every((r) => r.merkleRootHash === rootHex)).toBe(true);
    });

    it('should generate Merkle proof for a review', async () => {
      // Create multiple reviews
      for (let i = 1; i <= 5; i++) {
        await service.createReview({
          deliveryRequestId: `test-delivery-${i}`,
          courierId: 'courier-proof',
          reviewerId: `test_reviewer-${i}`,
          rating: 5,
        });
      }

      const mockWallet = { address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' };
      await service.updateMerkleRoot('courier-proof', mockWallet);

      // Get a review
      const reviews = await service.getCourierReviews('courier-proof');
      const reviewId = reviews[0].id;

      // Get Merkle proof
      const { review, merkleProof, merkleRoot } = await service.getMerkleProof(reviewId);

      expect(review).toBeDefined();
      expect(merkleProof).toBeDefined();
      expect(merkleProof).toBeInstanceOf(Array);
      expect(merkleRoot).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it('should return review without proof if not in Merkle tree yet', async () => {
      const review = await service.createReview({
        deliveryRequestId: 'test-delivery-1',
        courierId: 'courier-no-merkle',
        reviewerId: 'test_reviewer-1',
        rating: 5,
      });

      const result = await service.getMerkleProof(review.id);

      expect(result.review).toBeDefined();
      expect(result.merkleProof).toBeUndefined();
      expect(result.merkleRoot).toBeUndefined();
    });
  });

  describe('getCourierReviewStats', () => {
    beforeEach(async () => {
      // Create reviews with different ratings
      const ratings = [5, 5, 4, 4, 4, 3, 2, 1];
      for (let i = 0; i < ratings.length; i++) {
        await service.createReview({
          deliveryRequestId: `test-delivery-${i}`,
          courierId: 'courier-stats',
          reviewerId: `test_reviewer-${i}`,
          rating: ratings[i],
        });
      }
    });

    it('should return comprehensive statistics', async () => {
      const stats = await service.getCourierReviewStats('courier-stats');

      expect(stats.total).toBe(8);
      expect(stats.averageRating).toBeCloseTo(3.625); // (5+5+4+4+4+3+2+1)/8
      expect(stats.ratingDistribution).toBeDefined();
      expect(stats.ratingDistribution[5]).toBe(2);
      expect(stats.ratingDistribution[4]).toBe(3);
      expect(stats.merkle.pending).toBe(8); // Not in Merkle tree yet
      expect(stats.merkle.nextUpdateAt).toBe(100); // Next multiple of 100
    });
  });

  describe('updateReview', () => {
    it('should update review rating', async () => {
      const review = await service.createReview({
        deliveryRequestId: 'test-delivery-1',
        courierId: 'courier-update',
        reviewerId: 'test_reviewer-1',
        rating: 3,
      });

      const updated = await service.updateReview(review.id, { rating: 5 });

      expect(updated.rating).toBe(5);
    });

    it('should update review comment', async () => {
      const review = await service.createReview({
        deliveryRequestId: 'test-delivery-1',
        courierId: 'courier-update',
        reviewerId: 'test_reviewer-1',
        rating: 5,
      });

      const updated = await service.updateReview(review.id, {
        comment: 'Updated comment',
      });

      expect(updated.comment).toBe('Updated comment');
    });
  });

  describe('deleteReview', () => {
    it('should delete review successfully', async () => {
      const review = await service.createReview({
        deliveryRequestId: 'test-delivery-1',
        courierId: 'courier-delete',
        reviewerId: 'test_reviewer-1',
        rating: 5,
      });

      await service.deleteReview(review.id);

      const deleted = await service.getReview(review.id);
      expect(deleted).toBeNull();
    });
  });
});
