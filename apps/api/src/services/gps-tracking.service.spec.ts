// @ts-nocheck - Polkadot.js type incompatibilities
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { GPSTrackingService, WaypointDto } from './gps-tracking.service.js';
import { BlockchainService } from './blockchain/blockchain.service.js';

/**
 * Unit and Integration tests for GPSTrackingService
 */

describe('GPSTrackingService', () => {
  let service: GPSTrackingService;
  let prisma: PrismaClient;
  let mockBlockchainService: any;
  let mockIpfsClient: any;

  beforeEach(() => {
    prisma = new PrismaClient();

    // Mock BlockchainService
    mockBlockchainService = {
      submitProof: vi.fn().mockResolvedValue({
        txHash: '0xabc123',
        blockNumber: 100n,
      }),
    };

    // Mock IPFS client
    mockIpfsClient = {
      add: vi.fn().mockResolvedValue({
        path: 'QmTest123',
        cid: { toString: () => 'QmTest123' },
      }),
    };

    service = new GPSTrackingService(prisma, mockBlockchainService);
    (service as any).ipfsClient = mockIpfsClient;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.deliveryWaypoint.deleteMany({
      where: {
        deliveryRequestId: { startsWith: 'test-delivery-' },
      },
    });

    await prisma.$disconnect();
  });

  describe('recordWaypoint', () => {
    it('should record GPS waypoint successfully', async () => {
      const waypointData: WaypointDto = {
        deliveryRequestId: 'test-delivery-1',
        latitude: -23.5505,
        longitude: -46.6333, // São Paulo, BR
        accuracy: 10,
        speed: 5.5,
      };

      const waypoint = await service.recordWaypoint(waypointData);

      expect(waypoint).toBeDefined();
      expect(waypoint.latitude).toBe(-23.5505);
      expect(waypoint.longitude).toBe(-46.6333);
      expect(waypoint.proofSubmitted).toBe(false);
    });

    it('should reject invalid latitude', async () => {
      const waypointData: WaypointDto = {
        deliveryRequestId: 'test-delivery-1',
        latitude: 91, // Invalid
        longitude: 0,
      };

      await expect(service.recordWaypoint(waypointData)).rejects.toThrow(
        'Invalid latitude'
      );
    });

    it('should reject invalid longitude', async () => {
      const waypointData: WaypointDto = {
        deliveryRequestId: 'test-delivery-1',
        latitude: 0,
        longitude: 181, // Invalid
      };

      await expect(service.recordWaypoint(waypointData)).rejects.toThrow(
        'Invalid longitude'
      );
    });

    it('should record multiple waypoints in sequence', async () => {
      const deliveryId = 'test-delivery-sequence';

      for (let i = 0; i < 5; i++) {
        await service.recordWaypoint({
          deliveryRequestId: deliveryId,
          latitude: -23.55 + i * 0.001,
          longitude: -46.63 + i * 0.001,
        });
      }

      const waypoints = await service.getWaypoints(deliveryId);
      expect(waypoints).toHaveLength(5);
      expect(waypoints[0].latitude).toBeLessThan(waypoints[4].latitude);
    });
  });

  describe('getWaypoints', () => {
    beforeEach(async () => {
      // Create test waypoints
      for (let i = 0; i < 10; i++) {
        await service.recordWaypoint({
          deliveryRequestId: 'test-delivery-get',
          latitude: -23.5505 + i * 0.01,
          longitude: -46.6333 + i * 0.01,
        });
      }
    });

    it('should get all waypoints for a delivery', async () => {
      const waypoints = await service.getWaypoints('test-delivery-get');

      expect(waypoints).toHaveLength(10);
      expect(waypoints[0].latitude).toBeLessThan(waypoints[9].latitude);
    });

    it('should respect limit option', async () => {
      const waypoints = await service.getWaypoints('test-delivery-get', {
        limit: 3,
      });

      expect(waypoints).toHaveLength(3);
    });

    it('should respect offset option', async () => {
      const waypoints = await service.getWaypoints('test-delivery-get', {
        offset: 7,
      });

      expect(waypoints).toHaveLength(3); // 10 total - 7 offset = 3
    });
  });

  describe('getLastWaypoint', () => {
    it('should get the most recent waypoint', async () => {
      const deliveryId = 'test-delivery-last';

      await service.recordWaypoint({
        deliveryRequestId: deliveryId,
        latitude: -23.5505,
        longitude: -46.6333,
      });

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      await service.recordWaypoint({
        deliveryRequestId: deliveryId,
        latitude: -23.5515, // Different
        longitude: -46.6343,
      });

      const lastWaypoint = await service.getLastWaypoint(deliveryId);

      expect(lastWaypoint).toBeDefined();
      expect(lastWaypoint!.latitude).toBe(-23.5515);
    });

    it('should return null for non-existent delivery', async () => {
      const lastWaypoint = await service.getLastWaypoint('non-existent');
      expect(lastWaypoint).toBeNull();
    });
  });

  describe('submitHandoffProof', () => {
    beforeEach(async () => {
      // Create waypoints for handoff
      for (let i = 0; i < 5; i++) {
        await service.recordWaypoint({
          deliveryRequestId: 'test-delivery-handoff',
          latitude: -23.5505 + i * 0.01,
          longitude: -46.6333 + i * 0.01,
        });
      }
    });

    it('should submit handoff proof successfully', async () => {
      const mockWallet = { address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' };

      const result = await service.submitHandoffProof(
        {
          deliveryRequestId: 'test-delivery-handoff',
          sellerAddress: '5Seller123',
          courierAddress: '5Courier456',
        },
        mockWallet
      );

      expect(result.txHash).toBe('0xabc123');
      expect(result.ipfsCid).toBe('QmTest123');
      expect(mockIpfsClient.add).toHaveBeenCalledTimes(1);
      expect(mockBlockchainService.submitProof).toHaveBeenCalledTimes(1);

      // Verify waypoints were marked as submitted
      const waypoints = await service.getWaypoints('test-delivery-handoff');
      expect(waypoints.every((w) => w.proofSubmitted)).toBe(true);
      expect(waypoints.every((w) => w.proofCid === 'QmTest123')).toBe(true);
    });

    it('should throw error if no waypoints exist', async () => {
      const mockWallet = { address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' };

      await expect(
        service.submitHandoffProof(
          {
            deliveryRequestId: 'non-existent-delivery',
            sellerAddress: '5Seller123',
            courierAddress: '5Courier456',
          },
          mockWallet
        )
      ).rejects.toThrow('No GPS waypoints found');
    });
  });

  describe('submitDeliveryProof', () => {
    beforeEach(async () => {
      // Create waypoints for delivery
      for (let i = 0; i < 8; i++) {
        await service.recordWaypoint({
          deliveryRequestId: 'test-delivery-proof',
          latitude: -23.5505 + i * 0.01,
          longitude: -46.6333 + i * 0.01,
        });
      }
    });

    it('should submit delivery proof successfully', async () => {
      const mockWallet = { address: '5CourierABC' };

      const result = await service.submitDeliveryProof(
        {
          deliveryRequestId: 'test-delivery-proof',
          courierAddress: '5CourierABC',
          recipientAddress: '5RecipientXYZ',
        },
        mockWallet
      );

      expect(result.txHash).toBe('0xabc123');
      expect(result.ipfsCid).toBe('QmTest123');
      expect(mockIpfsClient.add).toHaveBeenCalled();
      expect(mockBlockchainService.submitProof).toHaveBeenCalled();
    });

    it('should include photo proof CID if provided', async () => {
      const mockWallet = { address: '5CourierABC' };

      await service.submitDeliveryProof(
        {
          deliveryRequestId: 'test-delivery-proof',
          courierAddress: '5CourierABC',
          recipientAddress: '5RecipientXYZ',
          photoProofCid: 'QmPhotoProof123',
        },
        mockWallet
      );

      const addCall = mockIpfsClient.add.mock.calls[0][0];
      const parsedData = JSON.parse(addCall);

      expect(parsedData.photoProof).toBe('QmPhotoProof123');
    });
  });

  describe('getTrackingStats', () => {
    beforeEach(async () => {
      // Create waypoints with known positions
      const positions = [
        { lat: -23.5505, lng: -46.6333 },
        { lat: -23.5515, lng: -46.6343 }, // ~1.5km away
        { lat: -23.5525, lng: -46.6353 }, // ~1.5km away
      ];

      for (const pos of positions) {
        await service.recordWaypoint({
          deliveryRequestId: 'test-delivery-stats',
          latitude: pos.lat,
          longitude: pos.lng,
          speed: 5.0, // 5 m/s
        });

        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    });

    it('should calculate tracking statistics', async () => {
      const stats = await service.getTrackingStats('test-delivery-stats');

      expect(stats.totalWaypoints).toBe(3);
      expect(stats.distanceTraveled).toBeGreaterThan(0);
      expect(stats.averageSpeed).toBeCloseTo(5.0, 1);
      expect(stats.firstWaypoint).toBeDefined();
      expect(stats.lastWaypoint).toBeDefined();
    });

    it('should return zeros for delivery with no waypoints', async () => {
      const stats = await service.getTrackingStats('non-existent');

      expect(stats.totalWaypoints).toBe(0);
      expect(stats.distanceTraveled).toBe(0);
      expect(stats.averageSpeed).toBe(0);
    });
  });

  describe('getSimplifiedRoute', () => {
    beforeEach(async () => {
      // Create 100 waypoints
      for (let i = 0; i < 100; i++) {
        await service.recordWaypoint({
          deliveryRequestId: 'test-delivery-simplified',
          latitude: -23.5505 + i * 0.001,
          longitude: -46.6333 + i * 0.001,
        });
      }
    });

    it('should simplify route to maxPoints', async () => {
      const simplified = await service.getSimplifiedRoute('test-delivery-simplified', 20);

      expect(simplified.length).toBeLessThanOrEqual(21); // 20 + last point
      expect(simplified[0].lat).toBe(-23.5505);
      expect(simplified[simplified.length - 1].lat).toBeCloseTo(-23.6495, 3);
    });

    it('should return all waypoints if fewer than maxPoints', async () => {
      // Create only 5 waypoints
      for (let i = 0; i < 5; i++) {
        await service.recordWaypoint({
          deliveryRequestId: 'test-delivery-few',
          latitude: -23.5505 + i * 0.01,
          longitude: -46.6333 + i * 0.01,
        });
      }

      const simplified = await service.getSimplifiedRoute('test-delivery-few', 50);

      expect(simplified.length).toBe(5);
    });
  });

  describe('cleanupOldWaypoints', () => {
    it('should delete old waypoints with proofs submitted', async () => {
      // Create old waypoint (91 days ago)
      const oldTimestamp = Date.now() - 91 * 24 * 60 * 60 * 1000;

      await prisma.deliveryWaypoint.create({
        data: {
          deliveryRequestId: 'test-delivery-old',
          latitude: -23.5505,
          longitude: -46.6333,
          timestamp: BigInt(oldTimestamp),
          proofSubmitted: true, // Already submitted
          proofCid: 'QmOldProof',
        },
      });

      const deleted = await service.cleanupOldWaypoints(90);

      expect(deleted).toBeGreaterThan(0);
    });

    it('should not delete waypoints without proofs submitted', async () => {
      const oldTimestamp = Date.now() - 91 * 24 * 60 * 60 * 1000;

      await prisma.deliveryWaypoint.create({
        data: {
          deliveryRequestId: 'test-delivery-keep',
          latitude: -23.5505,
          longitude: -46.6333,
          timestamp: BigInt(oldTimestamp),
          proofSubmitted: false, // Not submitted yet
        },
      });

      const deleted = await service.cleanupOldWaypoints(90);

      const waypoint = await prisma.deliveryWaypoint.findFirst({
        where: { deliveryRequestId: 'test-delivery-keep' },
      });

      expect(waypoint).not.toBeNull(); // Should still exist
    });
  });
});
