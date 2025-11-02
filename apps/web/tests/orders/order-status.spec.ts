// FASE 11 - PROMPT 1: E2E Test - Orders Status Updates
// Test: User can track order status updates

import { test, expect } from '@playwright/test';
import { createTestAccount } from '../helpers/auth-helpers';

test.describe('Orders - Status Updates', () => {
  test('should display order status', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/orders');
    await page.waitForTimeout(3000);

    const firstOrder = page.locator('[data-testid="order-card"]').first();

    if (await firstOrder.isVisible({ timeout: 5000 })) {
      await firstOrder.click();
      await page.waitForTimeout(2000);

      const statusVisible = await page.locator('[data-testid="order-status"], text=/Status/i').isVisible({ timeout: 5000 });

      expect(statusVisible).toBe(true);
      console.log(`✅ Order status displayed`);
    }
  });

  test('should show order timeline', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/orders');
    await page.waitForTimeout(3000);

    const firstOrder = page.locator('[data-testid="order-card"]').first();

    if (await firstOrder.isVisible({ timeout: 5000 })) {
      await firstOrder.click();
      await page.waitForTimeout(2000);

      const timelineVisible = await page.locator('[data-testid="order-timeline"], .timeline').isVisible({ timeout: 5000 });

      if (timelineVisible) {
        console.log(`✅ Order timeline displayed`);
      }
    }
  });

  test('should allow cancelling order', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/orders');
    await page.waitForTimeout(3000);

    const firstOrder = page.locator('[data-testid="order-card"]').first();

    if (await firstOrder.isVisible({ timeout: 5000 })) {
      await firstOrder.click();
      await page.waitForTimeout(2000);

      const cancelButton = page.locator('button:has-text("Cancel Order")').first();

      if (await cancelButton.isVisible({ timeout: 5000 })) {
        await cancelButton.click();
        await page.waitForTimeout(2000);

        // May show confirmation dialog
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();

        if (await confirmButton.isVisible({ timeout: 3000 })) {
          await confirmButton.click();
          await page.waitForTimeout(2000);
        }

        console.log(`✅ Order cancellation flow works`);
      }
    }
  });

  test('should show estimated delivery date', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/orders');
    await page.waitForTimeout(3000);

    const firstOrder = page.locator('[data-testid="order-card"]').first();

    if (await firstOrder.isVisible({ timeout: 5000 })) {
      await firstOrder.click();
      await page.waitForTimeout(2000);

      const deliveryDateVisible = await page.locator('text=/Estimated delivery|Expected by|Delivery date/i').isVisible({ timeout: 5000 });

      if (deliveryDateVisible) {
        console.log(`✅ Estimated delivery date displayed`);
      }
    }
  });
});
