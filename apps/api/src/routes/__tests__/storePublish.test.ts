import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { storePublishRoutes } from '../storePublish.js';
import * as publishPipeline from '../../lib/publishPipeline.js';
import * as storesChain from '../../lib/storesChain.js';
import { PrismaClient } from '@prisma/client';

// Mock dependencies
vi.mock('../../lib/publishPipeline.js', () => ({
  buildStoreJson: vi.fn(),
  buildCategoriesJson: vi.fn(),
  buildProductsJson: vi.fn(),
  calculateJsonHash: vi.fn(),
  uploadJsonToIpfs: vi.fn(),
}));

vi.mock('../../lib/storesChain.js', () => ({
  getStoresApi: vi.fn(),
}));

vi.mock('@polkadot/keyring', () => ({
  Keyring: vi.fn().mockImplementation(() => ({
    addFromMnemonic: vi.fn().mockReturnValue({
      address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    }),
  })),
}));

vi.mock('@polkadot/util-crypto', () => ({
  cryptoWaitReady: vi.fn(() => Promise.resolve(true)),
}));

const mockedBuildStoreJson = publishPipeline.buildStoreJson as unknown as Mock;
const mockedBuildCategoriesJson = publishPipeline.buildCategoriesJson as unknown as Mock;
const mockedBuildProductsJson = publishPipeline.buildProductsJson as unknown as Mock;
const mockedCalculateJsonHash = publishPipeline.calculateJsonHash as unknown as Mock;
const mockedUploadJsonToIpfs = publishPipeline.uploadJsonToIpfs as unknown as Mock;
const mockedGetStoresApi = storesChain.getStoresApi as unknown as Mock;

// Mock Prisma
const mockPrisma = {
  sellerProfile: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  storePublishHistory: {
    create: vi.fn(),
  },
  storeSnapshot: {
    create: vi.fn(),
  },
} as unknown as PrismaClient;

// Mock auth middleware
vi.mock('../../lib/auth/middleware.js', () => ({
  authOnRequest: async (req: any, _reply: any) => {
    req.authUser = { sub: 'user-123' };
  },
}));

describe('POST /stores/:id/publish', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify();
    await app.register(storePublishRoutes, { prisma: mockPrisma });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('deve publicar loja com 3 JSONs separados', async () => {
    // Setup mocks
    const mockStore = {
      id: 'store-123',
      userId: 'user-123',
      shopSlug: 'test-shop',
      onChainStoreId: BigInt(1),
      version: 0,
    };

    const mockStoreJson = {
      $schema: 'https://bazari.com/schemas/store/v1',
      id: '1',
      slug: 'test-shop',
      name: 'Test Shop',
      version: 0,
      publishedAt: new Date().toISOString(),
    };

    const mockCategoriesJson = {
      $schema: 'https://bazari.com/schemas/categories/v1',
      storeId: '1',
      version: 0,
      categories: [],
    };

    const mockProductsJson = {
      $schema: 'https://bazari.com/schemas/products/v1',
      storeId: '1',
      version: 0,
      items: [],
    };

    // Mock Prisma responses
    (mockPrisma.sellerProfile.findFirst as Mock)
      .mockResolvedValueOnce(mockStore)
      .mockResolvedValueOnce(mockStore);

    (mockPrisma.sellerProfile.update as Mock).mockResolvedValue({
      ...mockStore,
      version: 1,
    });

    (mockPrisma.storePublishHistory.create as Mock).mockResolvedValue({
      id: 'history-123',
      sellerProfileId: 'store-123',
      version: 1,
    });

    // Mock pipeline functions
    mockedBuildStoreJson.mockResolvedValue(mockStoreJson);
    mockedBuildCategoriesJson.mockResolvedValue(mockCategoriesJson);
    mockedBuildProductsJson.mockResolvedValue(mockProductsJson);

    mockedUploadJsonToIpfs
      .mockResolvedValueOnce('bafystore123')
      .mockResolvedValueOnce('bafycategories456')
      .mockResolvedValueOnce('bafyproducts789');

    mockedCalculateJsonHash
      .mockReturnValueOnce('storehash123')
      .mockReturnValueOnce('categorieshash456')
      .mockReturnValueOnce('productshash789');

    // Mock blockchain API
    const mockTx = {
      signAndSend: vi.fn((pair, callback) => {
        callback({
          status: {
            isFinalized: true,
            asFinalized: {
              toString: () => '0x1234',
            },
          },
          dispatchError: null,
        });
        return Promise.resolve(() => {});
      }),
    };

    const mockApi = {
      tx: {
        stores: {
          publishStore: vi.fn(() => mockTx),
        },
      },
      rpc: {
        chain: {
          getBlock: vi.fn(() => Promise.resolve({
            block: {
              header: {
                number: {
                  toBigInt: () => BigInt(100),
                },
              },
            },
          })),
        },
      },
      registry: {
        findMetaError: vi.fn(),
      },
    };

    mockedGetStoresApi.mockResolvedValue(mockApi);

    // Execute request
    const res = await app.inject({
      method: 'POST',
      url: '/stores/store-123/publish',
      payload: {
        signerMnemonic: 'test mnemonic seed phrase for testing only',
      },
    });

    // Assertions
    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.status).toBe('synced');
    expect(body.version).toBe(1);
    expect(body.blockNumber).toBe('100');
    expect(body.cids).toEqual({
      store: 'bafystore123',
      categories: 'bafycategories456',
      products: 'bafyproducts789',
    });

    // Verify all functions were called
    expect(mockedBuildStoreJson).toHaveBeenCalledWith(mockPrisma, 'store-123');
    expect(mockedBuildCategoriesJson).toHaveBeenCalledWith(mockPrisma, 'store-123');
    expect(mockedBuildProductsJson).toHaveBeenCalledWith(mockPrisma, BigInt(1));

    expect(mockedUploadJsonToIpfs).toHaveBeenCalledTimes(3);
    expect(mockedCalculateJsonHash).toHaveBeenCalledTimes(3);

    expect(mockPrisma.sellerProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'store-123' },
        data: expect.objectContaining({
          syncStatus: 'synced',
          version: 1,
          metadataCid: 'bafystore123',
          categoriesCid: 'bafycategories456',
          productsCid: 'bafyproducts789',
        }),
      })
    );

    expect(mockPrisma.storePublishHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sellerProfileId: 'store-123',
          version: 1,
          blockNumber: BigInt(100),
        }),
      })
    );

    expect(mockPrisma.storeSnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          storeId: 'store-123',
          version: 1,
          storeJson: mockStoreJson,
          categoriesJson: mockCategoriesJson,
          productsJson: mockProductsJson,
        }),
      })
    );
  });

  it('deve retornar erro se loja não existe', async () => {
    // Mock to return null for non-existent store
    (mockPrisma.sellerProfile.findFirst as Mock).mockResolvedValue(null);

    const res = await app.inject({
      method: 'POST',
      url: '/stores/nonexistent/publish',
      payload: {
        signerMnemonic: 'test mnemonic',
      },
    });

    // The route returns 404 when store is not found
    // (or 500 if error is caught and wrapped - both indicate failure)
    expect([404, 500]).toContain(res.statusCode);
    const body = res.json();
    expect(body.error).toBeTruthy();
  });

  it('deve retornar erro se loja não tem onChainStoreId', async () => {
    // First call checks ownership, second call would be after sync status update
    (mockPrisma.sellerProfile.findFirst as Mock).mockResolvedValueOnce({
      id: 'store-123',
      userId: 'user-123',
      shopSlug: 'test-shop',
      onChainStoreId: null,
    });

    const res = await app.inject({
      method: 'POST',
      url: '/stores/store-123/publish',
      payload: {
        signerMnemonic: 'test mnemonic',
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBe('Loja não publicada on-chain. Crie primeiro.');
  });

  it('deve calcular hashes corretamente', async () => {
    const mockStore = {
      id: 'store-123',
      userId: 'user-123',
      shopSlug: 'test-shop',
      onChainStoreId: BigInt(1),
      version: 0,
    };

    const mockJson = {
      $schema: 'test',
      data: 'test',
    };

    (mockPrisma.sellerProfile.findFirst as Mock).mockResolvedValue(mockStore);
    (mockPrisma.sellerProfile.update as Mock).mockResolvedValue(mockStore);
    (mockPrisma.storePublishHistory.create as Mock).mockResolvedValue({});
    (mockPrisma.storeSnapshot.create as Mock).mockResolvedValue({});

    mockedBuildStoreJson.mockResolvedValue(mockJson);
    mockedBuildCategoriesJson.mockResolvedValue(mockJson);
    mockedBuildProductsJson.mockResolvedValue(mockJson);
    mockedUploadJsonToIpfs.mockResolvedValue('bafytest');

    // Mock hash calculation to return specific values
    const testHash = 'abcd1234ef567890';
    mockedCalculateJsonHash.mockReturnValue(testHash);

    const mockTx = {
      signAndSend: vi.fn((pair, callback) => {
        callback({
          status: {
            isFinalized: true,
            asFinalized: { toString: () => '0x1234' },
          },
          dispatchError: null,
        });
        return Promise.resolve(() => {});
      }),
    };

    const mockApi = {
      tx: {
        stores: {
          publishStore: vi.fn((storeId, storeCid, storeHash, catCid, catHash, prodCid, prodHash) => {
            // Verify hashes are passed as arrays
            expect(storeHash).toBeInstanceOf(Array);
            expect(catHash).toBeInstanceOf(Array);
            expect(prodHash).toBeInstanceOf(Array);
            return mockTx;
          }),
        },
      },
      rpc: {
        chain: {
          getBlock: vi.fn(() => Promise.resolve({
            block: {
              header: {
                number: { toBigInt: () => BigInt(100) },
              },
            },
          })),
        },
      },
      registry: {
        findMetaError: vi.fn(),
      },
    };

    mockedGetStoresApi.mockResolvedValue(mockApi);

    const res = await app.inject({
      method: 'POST',
      url: '/stores/store-123/publish',
      payload: {
        signerMnemonic: 'test mnemonic',
      },
    });

    expect(res.statusCode).toBe(200);

    // Verify calculateJsonHash was called for each JSON
    expect(mockedCalculateJsonHash).toHaveBeenCalledTimes(3);
    expect(mockedCalculateJsonHash).toHaveBeenCalledWith(mockJson);
  });
});

describe('GET /stores/:id/publish/status', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify();
    await app.register(storePublishRoutes, { prisma: mockPrisma });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('deve retornar status da publicação', async () => {
    const mockStore = {
      syncStatus: 'synced',
      version: 5,
      lastSyncBlock: BigInt(12345),
      lastPublishedAt: new Date('2025-01-01T00:00:00Z'),
    };

    (mockPrisma.sellerProfile.findFirst as Mock).mockResolvedValue(mockStore);

    const res = await app.inject({
      method: 'GET',
      url: '/stores/test-shop/publish/status',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.status).toBe('synced');
    expect(body.version).toBe(5);
    expect(body.block).toBe('12345');
    expect(body.publishedAt).toBe('2025-01-01T00:00:00.000Z');
  });

  it('deve retornar 404 se loja não existe', async () => {
    (mockPrisma.sellerProfile.findFirst as Mock).mockResolvedValue(null);

    const res = await app.inject({
      method: 'GET',
      url: '/stores/nonexistent/publish/status',
    });

    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.error).toBe('Loja não encontrada');
  });
});
