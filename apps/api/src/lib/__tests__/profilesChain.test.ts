import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import {
  getApi,
  getSudoAccount,
  mintProfileOnChain,
  getOnChainProfile,
  getOnChainReputation,
  updateMetadataCidOnChain,
  incrementReputationOnChain,
  awardBadgeOnChain
} from '../profilesChain';

/**
 * Unit tests for blockchain integration functions
 *
 * These tests verify the @polkadot/api integration layer.
 * They use mocked blockchain responses to avoid requiring a live node.
 */

// Mock @polkadot/api
vi.mock('@polkadot/api', () => ({
  ApiPromise: {
    create: vi.fn()
  },
  WsProvider: vi.fn(),
  Keyring: vi.fn()
}));

describe('profilesChain', () => {
  let mockApi: any;
  let mockSudoAccount: any;

  beforeAll(() => {
    // Setup mock API
    mockApi = {
      tx: {
        bazariIdentity: {
          mintProfile: vi.fn(),
          updateMetadataCid: vi.fn(),
          incrementReputation: vi.fn(),
          awardBadge: vi.fn()
        }
      },
      query: {
        bazariIdentity: {
          profileOwner: vi.fn(),
          metadataCid: vi.fn(),
          reputation: vi.fn(),
          badges: vi.fn(),
          handleToProfile: vi.fn()
        }
      },
      events: {
        bazariIdentity: {
          ProfileMinted: {
            is: vi.fn((event: any) => event.method === 'ProfileMinted')
          }
        }
      }
    };

    // Setup mock sudo account
    mockSudoAccount = {
      address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
    };
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getApi', () => {
    it('should create API instance', async () => {
      const { ApiPromise } = await import('@polkadot/api');
      (ApiPromise.create as any).mockResolvedValue(mockApi);

      const api = await getApi();
      expect(api).toBeDefined();
      expect(ApiPromise.create).toHaveBeenCalled();
    });

    it('should reuse existing API instance', async () => {
      const { ApiPromise } = await import('@polkadot/api');
      (ApiPromise.create as any).mockResolvedValue(mockApi);

      const api1 = await getApi();
      const api2 = await getApi();

      expect(api1).toBe(api2);
      expect(ApiPromise.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSudoAccount', () => {
    it('should create sudo account from seed', async () => {
      const { Keyring } = await import('@polkadot/api');
      const mockKeyring = {
        addFromUri: vi.fn().mockReturnValue(mockSudoAccount)
      };
      (Keyring as any).mockReturnValue(mockKeyring);

      const sudo = await getSudoAccount();
      expect(sudo).toBeDefined();
      expect(mockKeyring.addFromUri).toHaveBeenCalledWith(expect.stringContaining('//'));
    });
  });

  describe('mintProfileOnChain', () => {
    it('should mint profile and return profile ID', async () => {
      const mockTx = {
        signAndSend: vi.fn((account, callback) => {
          // Simulate successful transaction
          callback({
            status: { isInBlock: true },
            events: [
              {
                event: {
                  method: 'ProfileMinted',
                  data: ['1', 'alice', 'QmTest']
                }
              }
            ]
          });
          return Promise.resolve();
        })
      };

      mockApi.tx.bazariIdentity.mintProfile.mockReturnValue(mockTx);

      const profileId = await mintProfileOnChain(
        '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        'alice',
        'QmTest123'
      );

      expect(profileId).toBe(1n);
      expect(mockApi.tx.bazariIdentity.mintProfile).toHaveBeenCalledWith(
        '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        'alice',
        'QmTest123'
      );
    });

    it('should reject on dispatch error', async () => {
      const mockTx = {
        signAndSend: vi.fn((account, callback) => {
          callback({
            status: { isInBlock: true },
            dispatchError: { toString: () => 'HandleTaken' },
            events: []
          });
          return Promise.resolve();
        })
      };

      mockApi.tx.bazariIdentity.mintProfile.mockReturnValue(mockTx);

      await expect(
        mintProfileOnChain('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', 'alice', 'QmTest')
      ).rejects.toThrow('HandleTaken');
    });

    it('should reject if ProfileMinted event not found', async () => {
      const mockTx = {
        signAndSend: vi.fn((account, callback) => {
          callback({
            status: { isInBlock: true },
            events: [] // No events
          });
          return Promise.resolve();
        })
      };

      mockApi.tx.bazariIdentity.mintProfile.mockReturnValue(mockTx);

      await expect(
        mintProfileOnChain('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', 'alice', 'QmTest')
      ).rejects.toThrow('ProfileMinted event not found');
    });
  });

  describe('getOnChainProfile', () => {
    it('should fetch profile data from chain', async () => {
      // Mock query responses
      mockApi.query.bazariIdentity.profileOwner.mockResolvedValue({
        toString: () => '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
      });
      mockApi.query.bazariIdentity.metadataCid.mockResolvedValue({
        toString: () => 'QmTest123'
      });
      mockApi.query.bazariIdentity.reputation.mockResolvedValue({
        toString: () => '150'
      });
      mockApi.query.bazariIdentity.badges.mockResolvedValue({
        toJSON: () => [
          { code: 'verified_seller', issuer: 1, issuedAt: 12100, revokedAt: null }
        ]
      });

      const profile = await getOnChainProfile(1n);

      expect(profile).toEqual({
        profileId: 1n,
        owner: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        metadataCid: 'QmTest123',
        reputation: 150,
        badges: [
          { code: 'verified_seller', issuer: 1, issuedAt: 12100, revokedAt: null }
        ]
      });

      expect(mockApi.query.bazariIdentity.profileOwner).toHaveBeenCalledWith('1');
      expect(mockApi.query.bazariIdentity.metadataCid).toHaveBeenCalledWith('1');
      expect(mockApi.query.bazariIdentity.reputation).toHaveBeenCalledWith('1');
      expect(mockApi.query.bazariIdentity.badges).toHaveBeenCalledWith('1');
    });
  });

  describe('getOnChainReputation', () => {
    it('should fetch reputation score', async () => {
      mockApi.query.bazariIdentity.reputation.mockResolvedValue({
        toString: () => '150'
      });

      const reputation = await getOnChainReputation(1n);

      expect(reputation).toBe(150);
      expect(mockApi.query.bazariIdentity.reputation).toHaveBeenCalledWith('1');
    });

    it('should handle negative reputation', async () => {
      mockApi.query.bazariIdentity.reputation.mockResolvedValue({
        toString: () => '-50'
      });

      const reputation = await getOnChainReputation(1n);

      expect(reputation).toBe(-50);
    });
  });

  describe('updateMetadataCidOnChain', () => {
    it('should update metadata CID', async () => {
      const mockTx = {
        signAndSend: vi.fn((account, callback) => {
          callback({
            status: { isInBlock: true },
            events: []
          });
          return Promise.resolve();
        })
      };

      mockApi.tx.bazariIdentity.updateMetadataCid.mockReturnValue(mockTx);

      await updateMetadataCidOnChain(1n, 'QmNewCID456');

      expect(mockApi.tx.bazariIdentity.updateMetadataCid).toHaveBeenCalledWith(
        1n,
        'QmNewCID456'
      );
      expect(mockTx.signAndSend).toHaveBeenCalled();
    });
  });

  describe('incrementReputationOnChain', () => {
    it('should increment reputation', async () => {
      const mockTx = {
        signAndSend: vi.fn((account, callback) => {
          callback({
            status: { isInBlock: true },
            events: []
          });
          return Promise.resolve();
        })
      };

      mockApi.tx.bazariIdentity.incrementReputation.mockReturnValue(mockTx);

      await incrementReputationOnChain(1n, 10, 'ORDER_COMPLETED');

      expect(mockApi.tx.bazariIdentity.incrementReputation).toHaveBeenCalledWith(
        1n,
        10,
        'ORDER_COMPLETED'
      );
    });

    it('should reject negative points', async () => {
      await expect(
        incrementReputationOnChain(1n, -5, 'INVALID')
      ).rejects.toThrow('Points must be positive for increment');
    });
  });

  describe('awardBadgeOnChain', () => {
    it('should award badge', async () => {
      const mockTx = {
        signAndSend: vi.fn((account, callback) => {
          callback({
            status: { isInBlock: true },
            events: []
          });
          return Promise.resolve();
        })
      };

      mockApi.tx.bazariIdentity.awardBadge.mockReturnValue(mockTx);

      await awardBadgeOnChain(1n, 'verified_seller', 1);

      expect(mockApi.tx.bazariIdentity.awardBadge).toHaveBeenCalledWith(
        1n,
        'verified_seller',
        1
      );
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockApi.query.bazariIdentity.profileOwner.mockRejectedValue(
        new Error('Network timeout')
      );

      await expect(getOnChainProfile(1n)).rejects.toThrow('Network timeout');
    });

    it('should handle malformed data', async () => {
      mockApi.query.bazariIdentity.reputation.mockResolvedValue({
        toString: () => 'invalid_number'
      });

      const reputation = await getOnChainReputation(1n);

      expect(isNaN(reputation)).toBe(true);
    });
  });
});
