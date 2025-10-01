import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import {
  estimateFeedbackBuckets,
  runReputationSync,
  type ReputationChainAdapter,
} from './reputation.worker.js';

type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

function createPrismaMock() {
  const prisma = {
    sellerProfile: {
      findMany: vi.fn(),
    },
    order: {
      groupBy: vi.fn(),
    },
  } as Partial<Mutable<PrismaClient>>;
  return prisma as PrismaClient & {
    sellerProfile: { findMany: ReturnType<typeof vi.fn> };
    order: { groupBy: ReturnType<typeof vi.fn> };
  };
}

describe('estimateFeedbackBuckets', () => {
  it('clamps values and returns positive/negative buckets', () => {
    const high = estimateFeedbackBuckets(4.5, 10);
    expect(high.positive).toBe(9n);
    expect(high.negative).toBe(1n);

    const low = estimateFeedbackBuckets(1.2, 5);
    expect(low.positive).toBe(1n);
    expect(low.negative).toBe(4n);

    const empty = estimateFeedbackBuckets(undefined, 0);
    expect(empty.positive).toBe(0n);
    expect(empty.negative).toBe(0n);
  });
});

describe('runReputationSync', () => {
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('calls chain.bump when deltas are positive', async () => {
    const prisma = createPrismaMock();
    prisma.sellerProfile.findMany.mockResolvedValue([
      {
        id: 'seller-1',
        onChainStoreId: BigInt(42),
        ratingAvg: 4.5,
        ratingCount: 10,
      },
    ]);
    prisma.order.groupBy.mockResolvedValue([
      {
        sellerStoreId: 'seller-1',
        _count: { _all: 5 },
        _sum: { totalBzr: new Prisma.Decimal('12345') },
      },
    ]);

    const chain: ReputationChainAdapter = {
      fetch: vi.fn().mockResolvedValue({
        sales: 3n,
        positive: 6n,
        negative: 1n,
        volumePlanck: 1000n,
      }),
      bump: vi.fn().mockResolvedValue(undefined),
    };

    const result = await runReputationSync(prisma as unknown as PrismaClient, {
      chainAdapter: chain,
      logger,
    });

    expect(chain.fetch).toHaveBeenCalledWith('42');
    expect(chain.bump).toHaveBeenCalledTimes(1);
    expect(chain.bump).toHaveBeenCalledWith('42', {
      sales: 2n,
      positive: 3n,
      negative: 0n,
      volumePlanck: 11345n,
    });
    expect(result.updated).toBe(1);
    expect(result.noops).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors).toBe(0);
  });

  it('does not bump when store is already up to date', async () => {
    const prisma = createPrismaMock();
    prisma.sellerProfile.findMany.mockResolvedValue([
      {
        id: 'seller-1',
        onChainStoreId: BigInt(7),
        ratingAvg: 3.0,
        ratingCount: 4,
      },
    ]);
    prisma.order.groupBy.mockResolvedValue([
      {
        sellerStoreId: 'seller-1',
        _count: { _all: 2 },
        _sum: { totalBzr: new Prisma.Decimal('500') },
      },
    ]);

    const chain: ReputationChainAdapter = {
      fetch: vi.fn().mockResolvedValue({
        sales: 2n,
        positive: 2n,
        negative: 2n,
        volumePlanck: 500n,
      }),
      bump: vi.fn().mockResolvedValue(undefined),
    };

    const result = await runReputationSync(prisma as unknown as PrismaClient, {
      chainAdapter: chain,
      logger,
    });

    expect(chain.bump).not.toHaveBeenCalled();
    expect(result.updated).toBe(0);
    expect(result.noops).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.errors).toBe(0);
  });

  it('marks entry as skipped when store is missing on chain', async () => {
    const prisma = createPrismaMock();
    prisma.sellerProfile.findMany.mockResolvedValue([
      {
        id: 'seller-1',
        onChainStoreId: BigInt(99),
        ratingAvg: 5,
        ratingCount: 1,
      },
    ]);
    prisma.order.groupBy.mockResolvedValue([]);

    const chain: ReputationChainAdapter = {
      fetch: vi.fn().mockResolvedValue(null),
      bump: vi.fn().mockResolvedValue(undefined),
    };

    const result = await runReputationSync(prisma as unknown as PrismaClient, {
      chainAdapter: chain,
      logger,
    });

    expect(chain.bump).not.toHaveBeenCalled();
    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.details[0]?.reason).toBe('store_not_found_on_chain');
  });
});
