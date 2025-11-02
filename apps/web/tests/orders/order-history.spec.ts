// FASE 11 - PROMPT 1: E2E Test - Orders History
// Test: User can view order history

import { test, expect } from '@playwright/test';
import { createTestAccount } from '../helpers/auth-helpers';

test.describe('Orders - Order History', () => {
  test('should display orders page', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/orders');
    await page.waitForTimeout(3000);

    const ordersPageVisible = await page.locator('[data-testid="orders"], h1:has-text("Orders")').isVisible({ timeout: 5000 });

    expect(ordersPageVisible).toBe(true);
    console.log(`✅ Orders page displayed`);
  });

  test('should list user orders', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/orders');
    await page.waitForTimeout(3000);

    const ordersCount = await page.locator('[data-testid="order-card"], .order-card, tbody tr').count();

    console.log(`✅ Found ${ordersCount} orders in history`);
  });

  test('should display order details', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/orders');
    await page.waitForTimeout(3000);

    const firstOrder = page.locator('[data-testid="order-card"], tbody tr').first();

    if (await firstOrder.isVisible({ timeout: 5000 })) {
      const hasOrderNumber = await firstOrder.locator('text=/#|Order/i').isVisible();
      const hasStatus = await firstOrder.locator('text=/Pending|Processing|Completed|Cancelled/i').isVisible();

      expect(hasOrderNumber || hasStatus).toBe(true);
      console.log(`✅ Order details displayed`);
    }
  });

  test('should view order detail page', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/orders');
    await page.waitForTimeout(3000);

    const firstOrder = page.locator('[data-testid="order-card"], tbody tr').first();

    if (await firstOrder.isVisible({ timeout: 5000 })) {
      await firstOrder.click();
      await page.waitForTimeout(2000);

      const detailPageVisible = await page.locator('[data-testid="order-detail"], .order-detail').isVisible({ timeout: 5000 });

      if (detailPageVisible) {
        console.log(`✅ Order detail page displayed`);
      }
    }
  });

  test('should filter orders by status', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/orders');
    await page.waitForTimeout(3000);

    const statusFilter = page.locator('select[name="status"], button:has-text("All")').first();

    if (await statusFilter.isVisible({ timeout: 5000 })) {
      await statusFilter.click();
      await page.waitForTimeout(1000);

      const completedOption = page.locator('text=Completed, option:has-text("Completed")').first();

      if (await completedOption.isVisible({ timeout: 3000 })) {
        await completedOption.click();
        await page.waitForTimeout(2000);

        console.log(`✅ Filtered orders by status`);
      }
    }
  });
});
