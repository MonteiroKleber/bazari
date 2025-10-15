import { describe, it, expect, beforeEach, vi } from 'vitest';
import { commissionService } from '../commission';
import { prisma } from '../../../lib/prisma';

// Mock Prisma
vi.mock('../../../lib/prisma', () => ({
  prisma: {
    chatSale: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('CommissionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('settleSale', () => {
    it('should calculate correct splits without promoter', async () => {
      const mockSale = {
        id: 'sale_123',
        storeId: BigInt(1),
        buyer: 'buyer_id',
        seller: 'seller_id',
        promoter: null,
        amount: '100.00',
        commissionPercent: 0,
        commissionAmount: '0.00',
        bazariFee: '1.00',
        sellerAmount: '99.00',
        status: 'split',
        txHash: 'mock_tx_hash',
        receiptNftCid: 'QmMockReceipt',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.chatSale.create).mockResolvedValue(mockSale);

      const result = await commissionService.settleSale({
        proposalId: 'proposal_123',
        buyer: 'buyer_id',
        seller: 'seller_id',
        amount: '100.00',
        commissionPercent: 0,
      });

      expect(result.bazariFee).toBe('1.00'); // 1% platform fee
      expect(result.sellerAmount).toBe('99.00'); // 100 - 1
      expect(result.commissionAmount).toBe('0.00'); // No promoter
      expect(result.status).toBe('split');
    });

    it('should calculate correct splits with promoter (10% commission)', async () => {
      const mockSale = {
        id: 'sale_123',
        storeId: BigInt(1),
        buyer: 'buyer_id',
        seller: 'seller_id',
        promoter: 'promoter_id',
        amount: '100.00',
        commissionPercent: 10,
        commissionAmount: '10.00',
        bazariFee: '1.00',
        sellerAmount: '89.00',
        status: 'split',
        txHash: 'mock_tx_hash',
        receiptNftCid: 'QmMockReceipt',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.chatSale.create).mockResolvedValue(mockSale);

      const result = await commissionService.settleSale({
        proposalId: 'proposal_123',
        buyer: 'buyer_id',
        seller: 'seller_id',
        promoter: 'promoter_id',
        amount: '100.00',
        commissionPercent: 10,
      });

      expect(result.commissionAmount).toBe('10.00'); // 10% commission
      expect(result.bazariFee).toBe('1.00'); // 1% platform fee
      expect(result.sellerAmount).toBe('89.00'); // 100 - 10 - 1
      expect(result.status).toBe('split');
    });

    it('should cap commission at 25%', async () => {
      const mockSale = {
        id: 'sale_123',
        storeId: BigInt(1),
        buyer: 'buyer_id',
        seller: 'seller_id',
        promoter: 'promoter_id',
        amount: '100.00',
        commissionPercent: 25, // Capped
        commissionAmount: '25.00',
        bazariFee: '1.00',
        sellerAmount: '74.00',
        status: 'split',
        txHash: 'mock_tx_hash',
        receiptNftCid: 'QmMockReceipt',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.chatSale.create).mockResolvedValue(mockSale);

      const result = await commissionService.settleSale({
        proposalId: 'proposal_123',
        buyer: 'buyer_id',
        seller: 'seller_id',
        promoter: 'promoter_id',
        amount: '100.00',
        commissionPercent: 50, // Will be capped to 25
      });

      expect(result.commissionAmount).toBe('25.00');
      expect(result.sellerAmount).toBe('74.00'); // 100 - 25 - 1
    });
  });

  describe('getSaleStats', () => {
    it('should calculate correct statistics', async () => {
      const mockSales = [
        {
          id: 'sale_1',
          amount: '100.00',
          commissionAmount: '10.00',
          status: 'split',
          createdAt: new Date(),
        },
        {
          id: 'sale_2',
          amount: '200.00',
          commissionAmount: '20.00',
          status: 'split',
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.chatSale.findMany).mockResolvedValue(mockSales as any);

      const stats = await commissionService.getSaleStats('seller_id');

      expect(stats.totalSales).toBe(2);
      expect(stats.totalAmount).toBe('300.00');
      expect(stats.totalCommissions).toBe('30.00');
    });
  });
});
