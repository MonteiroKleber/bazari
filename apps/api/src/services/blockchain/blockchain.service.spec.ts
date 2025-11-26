// @ts-nocheck - Polkadot.js type incompatibilities
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { BlockchainService } from './blockchain.service.js';
import { Keyring } from '@polkadot/keyring';

/**
 * Integration tests for BlockchainService
 *
 * Prerequisites:
 * - Bazari Chain deve estar rodando em ws://127.0.0.1:9944
 * - Usar Alice (//Alice) como conta de teste com saldo
 *
 * Para rodar apenas estes testes:
 * pnpm test blockchain.service.spec.ts
 */

describe('BlockchainService', () => {
  let service: BlockchainService;
  let keyring: Keyring;
  let alice: any;
  let bob: any;

  beforeAll(async () => {
    // Initialize service
    service = BlockchainService.getInstance('ws://127.0.0.1:9944', '//Alice');

    // Setup keyring with test accounts
    keyring = new Keyring({ type: 'sr25519' });
    alice = keyring.addFromUri('//Alice');
    bob = keyring.addFromUri('//Bob');

    // Connect to blockchain
    await service.connect();

    console.log('[Test] Connected to blockchain');
    console.log('[Test] Alice address:', alice.address);
    console.log('[Test] Bob address:', bob.address);
  });

  afterAll(async () => {
    await service.disconnect();
    console.log('[Test] Disconnected from blockchain');
  });

  describe('Connection', () => {
    it('should connect to blockchain', async () => {
      const api = await service.getApi();
      expect(api).toBeDefined();
      expect(api.isConnected).toBe(true);
    });

    it('should get current block number', async () => {
      const blockNumber = await service.getCurrentBlock();
      expect(blockNumber).toBeGreaterThan(0n);
      console.log('[Test] Current block:', blockNumber.toString());
    });
  });

  describe('Balance Queries', () => {
    it('should get BZR balance', async () => {
      const balance = await service.getBalanceBZR(alice.address);
      expect(balance).toBeGreaterThan(0n);
      console.log('[Test] Alice BZR balance:', (Number(balance) / 1e12).toFixed(4), 'BZR');
    });

    it('should get ZARI balance (returns 0 if no balance)', async () => {
      const balance = await service.getBalanceZARI(alice.address);
      expect(balance).toBeGreaterThanOrEqual(0n);
      console.log('[Test] Alice ZARI balance:', balance.toString());
    });
  });

  describe('Transaction Builders', () => {
    it('should create order on blockchain', async () => {
      const items = [
        {
          listingId: null,
          name: 'Test Product',
          qty: 1,
          price: 10_000_000_000_000n, // 10 BZR
        },
      ];

      const result = await service.createOrder(
        alice.address, // buyer
        bob.address, // seller
        0, // marketplace
        items,
        10_000_000_000_000n, // totalAmount
        alice // signer
      );

      expect(result.txHash).toBeDefined();
      expect(result.blockNumber).toBeGreaterThan(0n);
      console.log('[Test] Order created:', {
        txHash: result.txHash,
        blockNumber: result.blockNumber.toString(),
      });
    }, 30000); // 30s timeout for blockchain transaction

    it('should register courier on blockchain', async () => {
      const result = await service.registerCourier(
        bob.address,
        1000_000_000_000n, // 1000 BZR stake
        [1, 2, 3], // service areas
        bob // signer
      );

      expect(result.txHash).toBeDefined();
      expect(result.blockNumber).toBeGreaterThan(0n);
      console.log('[Test] Courier registered:', {
        txHash: result.txHash,
        blockNumber: result.blockNumber.toString(),
      });
    }, 30000);

    it('should submit proof on blockchain', async () => {
      // First create an order
      const items = [
        {
          listingId: null,
          name: 'Test Product for Proof',
          qty: 1,
          price: 5_000_000_000_000n, // 5 BZR
        },
      ];

      const orderResult = await service.createOrder(
        alice.address,
        bob.address,
        0,
        items,
        5_000_000_000_000n,
        alice
      );

      console.log('[Test] Order created for proof test:', orderResult.txHash);

      // Then submit proof (assuming orderId = 0 or extract from events)
      const proofResult = await service.submitProof(
        0, // orderId - should be extracted from OrderCreated event
        'ipfs://QmTest123', // proofCid
        bob.address, // attestor
        bob // signer
      );

      expect(proofResult.txHash).toBeDefined();
      expect(proofResult.blockNumber).toBeGreaterThan(0n);
      console.log('[Test] Proof submitted:', {
        txHash: proofResult.txHash,
        blockNumber: proofResult.blockNumber.toString(),
      });
    }, 60000); // 60s timeout for 2 transactions
  });

  describe('Query Helpers', () => {
    it('should get order by ID', async () => {
      // Query order 0 (created in previous test)
      const order = await service.getOrder(0);

      if (order) {
        expect(order.orderId).toBe(0);
        expect(order.buyer).toBeDefined();
        expect(order.seller).toBeDefined();
        expect(order.totalAmount).toBeGreaterThan(0n);
        console.log('[Test] Order fetched:', {
          orderId: order.orderId,
          buyer: order.buyer,
          seller: order.seller,
          amount: (Number(order.totalAmount) / 1e12).toFixed(4) + ' BZR',
        });
      } else {
        console.log('[Test] Order 0 not found (might not exist yet)');
      }
    });

    it('should get courier by address', async () => {
      const courier = await service.getCourier(bob.address);

      if (courier) {
        expect(courier.account).toBe(bob.address);
        expect(courier.stake).toBeGreaterThan(0n);
        expect(courier.reputationScore).toBeGreaterThanOrEqual(0);
        console.log('[Test] Courier fetched:', {
          account: courier.account,
          stake: (Number(courier.stake) / 1e12).toFixed(4) + ' BZR',
          reputation: courier.reputationScore,
        });
      } else {
        console.log('[Test] Courier not found (might not be registered yet)');
      }
    });

    it('should return null for non-existent order', async () => {
      const order = await service.getOrder(999999);
      expect(order).toBeNull();
    });

    it('should return null for non-existent courier', async () => {
      const courier = await service.getCourier('5FakeAddressXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
      expect(courier).toBeNull();
    });

    it('should return null for non-existent dispute', async () => {
      const dispute = await service.getDispute(999999);
      expect(dispute).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid transaction gracefully', async () => {
      try {
        // Try to create order with invalid data (negative amount would fail)
        await service.createOrder(
          alice.address,
          bob.address,
          0,
          [], // Empty items - should fail
          0n,
          alice
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeDefined();
        console.log('[Test] Expected error caught:', error.message);
      }
    }, 30000);
  });
});
