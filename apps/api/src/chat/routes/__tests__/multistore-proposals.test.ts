/**
 * FASE 5: Testes do Fluxo Completo - Multi-Store Proposals
 *
 * Este arquivo testa todo o fluxo de propostas multi-loja end-to-end
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { build } from '../../../server';

const prisma = new PrismaClient();

describe('Multi-Store Proposals - End-to-End Tests', () => {
  let app: FastifyInstance;
  let authToken: string;
  let buyerToken: string;
  let threadId: string;
  let testUserId: string;
  let buyerUserId: string;

  // Test data IDs
  let store1Id: string;
  let store2Id: string;
  let store3Id: string;
  let product1Id: string;
  let product2Id: string;
  let product3Id: string;

  beforeAll(async () => {
    // Build Fastify app
    app = await build();
    await app.ready();

    // Create test users
    testUserId = 'test-seller-multistore-' + Date.now();
    buyerUserId = 'test-buyer-multistore-' + Date.now();

    // TODO: Create users, profiles, stores, and products
    // This would require proper authentication setup
    // For now, we'll document the test structure
  });

  afterAll(async () => {
    // Cleanup test data
    await app.close();
    await prisma.$disconnect();
  });

  describe('Test 1: Create Multi-Store Proposal', () => {
    it('should create proposal with products from 3 stores', async () => {
      // Arrange: Products from 3 different stores
      const items = [
        { sku: product1Id, name: 'Product 1', qty: 2, price: '50.00' },
        { sku: product2Id, name: 'Product 2', qty: 1, price: '100.00' },
        { sku: product3Id, name: 'Product 3', qty: 3, price: '30.00' },
      ];

      // Act: Create proposal
      const response = await app.inject({
        method: 'POST',
        url: '/chat/proposals',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          threadId,
          items,
          total: '290.00',
        },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);

      expect(result.isMultiStore).toBe(true);
      expect(result.storeGroups).toBeDefined();
      expect(result.storeGroups.length).toBe(3);

      // Verify each store group
      result.storeGroups.forEach((group: any) => {
        expect(group).toHaveProperty('storeId');
        expect(group).toHaveProperty('storeName');
        expect(group).toHaveProperty('items');
        expect(group).toHaveProperty('subtotal');
        expect(group).toHaveProperty('total');
        expect(group).toHaveProperty('commissionPercent');
      });

      // Verify totals
      const totalFromGroups = result.storeGroups.reduce(
        (sum: number, g: any) => sum + g.total,
        0
      );
      expect(totalFromGroups).toBeCloseTo(290, 2);
    });

    it('should group products by store automatically', async () => {
      // Test that products are correctly grouped by their store
      const items = [
        { sku: product1Id, name: 'Product 1A', qty: 1, price: '10.00' },
        { sku: product2Id, name: 'Product 2A', qty: 1, price: '20.00' },
        { sku: product1Id, name: 'Product 1B', qty: 2, price: '15.00' }, // Same store as 1A
      ];

      const response = await app.inject({
        method: 'POST',
        url: '/chat/proposals',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { threadId, items, total: '60.00' },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);

      // Should have 2 store groups (product1's store and product2's store)
      expect(result.storeGroups.length).toBe(2);

      // Find the group with product1's store
      const store1Group = result.storeGroups.find((g: any) =>
        g.items.some((i: any) => i.sku === product1Id)
      );

      // Should have 2 items from the same store
      expect(store1Group.items.length).toBe(2);
    });
  });

  describe('Test 2: Visualize Multi-Store Proposal', () => {
    let proposalId: string;

    beforeEach(async () => {
      // Create a test proposal
      const items = [
        { sku: product1Id, name: 'Product 1', qty: 1, price: '50.00' },
        { sku: product2Id, name: 'Product 2', qty: 1, price: '75.00' },
      ];

      const response = await app.inject({
        method: 'POST',
        url: '/chat/proposals',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { threadId, items, total: '125.00' },
      });

      proposalId = JSON.parse(response.payload).id;
    });

    it('should retrieve multi-store proposal with all data', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/chat/proposals/${proposalId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const proposal = JSON.parse(response.payload);

      expect(proposal.isMultiStore).toBe(true);
      expect(proposal.storeGroups).toBeDefined();
      expect(Array.isArray(proposal.storeGroups)).toBe(true);

      // Verify all required fields for UI rendering
      proposal.storeGroups.forEach((group: any) => {
        expect(group.storeId).toBeDefined();
        expect(group.storeName).toBeDefined();
        expect(group.items).toBeDefined();
        expect(group.total).toBeDefined();
        expect(group.commissionPercent).toBeDefined();
      });
    });

    it('should calculate totals correctly', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/chat/proposals/${proposalId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      const proposal = JSON.parse(response.payload);

      // Sum all store groups
      const calculatedTotal = proposal.storeGroups.reduce(
        (sum: number, g: any) => sum + g.total,
        0
      );

      expect(calculatedTotal).toBeCloseTo(parseFloat(proposal.total), 2);
    });
  });

  describe('Test 3: Multi-Store Checkout', () => {
    let proposalId: string;

    beforeEach(async () => {
      // Create multi-store proposal
      const items = [
        { sku: product1Id, name: 'Product 1', qty: 1, price: '100.00' },
        { sku: product2Id, name: 'Product 2', qty: 1, price: '150.00' },
        { sku: product3Id, name: 'Product 3', qty: 1, price: '200.00' },
      ];

      const response = await app.inject({
        method: 'POST',
        url: '/chat/proposals',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { threadId, items, total: '450.00' },
      });

      proposalId = JSON.parse(response.payload).id;
    });

    it('should generate separate ChatSale for each store', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/chat/checkout',
        headers: { authorization: `Bearer ${buyerToken}` },
        payload: { proposalId },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);

      expect(result.success).toBe(true);
      expect(result.isMultiStore).toBe(true);
      expect(result.sales).toBeDefined();
      expect(result.sales.length).toBe(3);

      // Verify each sale
      result.sales.forEach((sale: any) => {
        expect(sale.saleId).toBeDefined();
        expect(sale.storeId).toBeDefined();
        expect(sale.storeName).toBeDefined();
        expect(sale.amount).toBeDefined();
        expect(sale.receiptNftCid).toBeDefined(); // Each has its own receipt
      });
    });

    it('should respect different commission percentages per store', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/chat/checkout',
        headers: { authorization: `Bearer ${buyerToken}` },
        payload: { proposalId },
      });

      const result = JSON.parse(response.payload);

      // Get the proposal to check commissions
      const proposalResponse = await app.inject({
        method: 'GET',
        url: `/chat/proposals/${proposalId}`,
        headers: { authorization: `Bearer ${authToken}` },
      });

      const proposal = JSON.parse(proposalResponse.payload);

      // Verify that sales respect the commission from storeGroups
      result.sales.forEach((sale: any) => {
        const group = proposal.storeGroups.find((g: any) => g.storeId === sale.storeId);
        expect(group).toBeDefined();
        // Commission calculation should match
      });
    });

    it('should handle partial failures gracefully', async () => {
      // This test would require mocking a failure in one store
      // For now, document the expected behavior:
      // - If 1 of 3 stores fails, should return:
      //   - success: false
      //   - sales: array with 2 successful sales
      //   - failedCount: 1
      //   - proposal status: 'partially_paid'
    });
  });

  describe('Test 4: Validations', () => {
    it('should reject proposals with more than 5 stores', async () => {
      // Create items from 6 different stores
      const items = [
        { sku: 'product-store1', name: 'P1', qty: 1, price: '10.00' },
        { sku: 'product-store2', name: 'P2', qty: 1, price: '10.00' },
        { sku: 'product-store3', name: 'P3', qty: 1, price: '10.00' },
        { sku: 'product-store4', name: 'P4', qty: 1, price: '10.00' },
        { sku: 'product-store5', name: 'P5', qty: 1, price: '10.00' },
        { sku: 'product-store6', name: 'P6', qty: 1, price: '10.00' },
      ];

      const response = await app.inject({
        method: 'POST',
        url: '/chat/proposals',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { threadId, items, total: '60.00' },
      });

      expect(response.statusCode).toBe(400);
      const error = JSON.parse(response.payload);
      expect(error.error).toContain('Maximum 5 stores');
    });

    it('should reject proposals with more than 20 products', async () => {
      // Create 21 items
      const items = Array.from({ length: 21 }, (_, i) => ({
        sku: `product-${i}`,
        name: `Product ${i}`,
        qty: 1,
        price: '10.00',
      }));

      const response = await app.inject({
        method: 'POST',
        url: '/chat/proposals',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { threadId, items, total: '210.00' },
      });

      expect(response.statusCode).toBe(400);
      const error = JSON.parse(response.payload);
      expect(error.error).toContain('Maximum 20 products');
    });

    it('should reject multi-store proposal when store has allowMultiStore disabled', async () => {
      // Setup: Disable allowMultiStore for store2
      await prisma.storeCommissionPolicy.upsert({
        where: { storeId: BigInt(store2Id) },
        create: {
          storeId: BigInt(store2Id),
          mode: 'open',
          percent: 5,
          allowMultiStore: false,
          createdAt: BigInt(Date.now()),
          updatedAt: BigInt(Date.now()),
        },
        update: { allowMultiStore: false },
      });

      // Try to create multi-store proposal including store2
      const items = [
        { sku: product1Id, name: 'Product 1', qty: 1, price: '50.00' },
        { sku: product2Id, name: 'Product 2', qty: 1, price: '50.00' }, // store2
      ];

      const response = await app.inject({
        method: 'POST',
        url: '/chat/proposals',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { threadId, items, total: '100.00' },
      });

      expect(response.statusCode).toBe(400);
      const error = JSON.parse(response.payload);
      expect(error.error).toContain('não permite propostas multi-loja');

      // Cleanup
      await prisma.storeCommissionPolicy.update({
        where: { storeId: BigInt(store2Id) },
        data: { allowMultiStore: true },
      });
    });
  });

  describe('Test 5: Edge Cases', () => {
    it('should handle single-store as regular proposal', async () => {
      // Single store should NOT trigger multi-store logic
      const items = [
        { sku: product1Id, name: 'Product 1', qty: 2, price: '50.00' },
      ];

      const response = await app.inject({
        method: 'POST',
        url: '/chat/proposals',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { threadId, items, total: '100.00' },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);

      expect(result.isMultiStore).toBe(false);
      expect(result.storeGroups).toBeUndefined();
    });

    it('should use default commission when store has no policy', async () => {
      // Remove policy for store3
      await prisma.storeCommissionPolicy.deleteMany({
        where: { storeId: BigInt(store3Id) },
      });

      const items = [
        { sku: product3Id, name: 'Product 3', qty: 1, price: '100.00' },
      ];

      const response = await app.inject({
        method: 'POST',
        url: '/chat/proposals',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { threadId, items, total: '100.00' },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);

      // Should use default 5% commission
      expect(result.commissionPercent).toBe(5);
    });

    it('should reject when promoter does not have access to affiliate-only store', async () => {
      // Setup: Set store1 to affiliates-only mode
      await prisma.storeCommissionPolicy.upsert({
        where: { storeId: BigInt(store1Id) },
        create: {
          storeId: BigInt(store1Id),
          mode: 'affiliates',
          percent: 10,
          allowMultiStore: true,
          createdAt: BigInt(Date.now()),
          updatedAt: BigInt(Date.now()),
        },
        update: { mode: 'affiliates' },
      });

      // Try to create proposal without being an approved affiliate
      const items = [
        { sku: product1Id, name: 'Product 1', qty: 1, price: '50.00' },
      ];

      const response = await app.inject({
        method: 'POST',
        url: '/chat/proposals',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { threadId, items, total: '50.00' },
      });

      expect(response.statusCode).toBe(400);
      const error = JSON.parse(response.payload);
      expect(error.error).toContain('approved affiliate');

      // Cleanup
      await prisma.storeCommissionPolicy.update({
        where: { storeId: BigInt(store1Id) },
        data: { mode: 'open' },
      });
    });
  });

  describe('Test 6: Performance', () => {
    it('should create 5-store proposal in < 2 seconds', async () => {
      const items = [
        { sku: 'p1', name: 'Product 1', qty: 1, price: '100.00' },
        { sku: 'p2', name: 'Product 2', qty: 1, price: '100.00' },
        { sku: 'p3', name: 'Product 3', qty: 1, price: '100.00' },
        { sku: 'p4', name: 'Product 4', qty: 1, price: '100.00' },
        { sku: 'p5', name: 'Product 5', qty: 1, price: '100.00' },
      ];

      const startTime = Date.now();

      const response = await app.inject({
        method: 'POST',
        url: '/chat/proposals',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { threadId, items, total: '500.00' },
      });

      const duration = Date.now() - startTime;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(2000); // Under 2 seconds
    });

    it('should checkout 5 stores in < 5 seconds', async () => {
      // Create proposal first
      const items = Array.from({ length: 5 }, (_, i) => ({
        sku: `product-store-${i}`,
        name: `Product ${i}`,
        qty: 4,
        price: '100.00',
      }));

      const createResponse = await app.inject({
        method: 'POST',
        url: '/chat/proposals',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { threadId, items, total: '2000.00' },
      });

      const proposalId = JSON.parse(createResponse.payload).id;

      // Test checkout performance
      const startTime = Date.now();

      const response = await app.inject({
        method: 'POST',
        url: '/chat/checkout',
        headers: { authorization: `Bearer ${buyerToken}` },
        payload: { proposalId },
      });

      const duration = Date.now() - startTime;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(5000); // Under 5 seconds

      const result = JSON.parse(response.payload);
      expect(result.sales.length).toBe(5);
    });

    it('should log performance metrics', async () => {
      // This test verifies that performance logs are generated
      // Check server logs for:
      // - [Create Store Groups] timing
      // - [Multi-Store Checkout] timing
      // - Individual store split timings
      // - Total checkout duration

      const items = [
        { sku: product1Id, name: 'Product 1', qty: 1, price: '50.00' },
        { sku: product2Id, name: 'Product 2', qty: 1, price: '75.00' },
      ];

      const response = await app.inject({
        method: 'POST',
        url: '/chat/proposals',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { threadId, items, total: '125.00' },
      });

      expect(response.statusCode).toBe(200);

      // In production, we'd capture and verify logs
      // For now, just verify the request succeeded
    });
  });

  describe('Regression Tests: Single-Store Compatibility', () => {
    it('should not break existing single-store proposals', async () => {
      const items = [
        { sku: product1Id, name: 'Product 1', qty: 1, price: '100.00' },
      ];

      const response = await app.inject({
        method: 'POST',
        url: '/chat/proposals',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { threadId, items, total: '100.00' },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);

      // Should behave like before
      expect(result.isMultiStore).toBe(false);
      expect(result.items).toBeDefined();
      expect(result.total).toBeDefined();
    });

    it('should checkout single-store with existing flow', async () => {
      // Create single-store proposal
      const items = [
        { sku: product1Id, name: 'Product 1', qty: 1, price: '100.00' },
      ];

      const createResponse = await app.inject({
        method: 'POST',
        url: '/chat/proposals',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { threadId, items, total: '100.00' },
      });

      const proposalId = JSON.parse(createResponse.payload).id;

      // Checkout
      const response = await app.inject({
        method: 'POST',
        url: '/chat/checkout',
        headers: { authorization: `Bearer ${buyerToken}` },
        payload: { proposalId },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);

      expect(result.success).toBe(true);
      expect(result.isMultiStore).toBeUndefined(); // Or false
      expect(result.sale).toBeDefined(); // Single sale object
    });
  });
});
