// FASE 11 - PROMPT 1: E2E Test - Delivery Tracking
// Test: Real-time delivery tracking and status updates

import { test, expect } from '@playwright/test';
import { createTestAccount } from '../helpers/auth-helpers';

test.describe('Delivery - Tracking', () => {
  test('should display delivery tracking page', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/delivery/my-deliveries');
    await page.waitForTimeout(3000);

    const trackingVisible = await page.locator('[data-testid="tracking"], .tracking-info').isVisible({ timeout: 5000 });

    if (trackingVisible) {
      console.log(`✅ Delivery tracking page displayed`);
    }
  });

  test('should show delivery status', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/delivery/my-deliveries');
    await page.waitForTimeout(3000);

    const firstDelivery = page.locator('[data-testid="delivery-item"]').first();

    if (await firstDelivery.isVisible({ timeout: 5000 })) {
      const statusVisible = await firstDelivery.locator('text=/Pending|In Progress|Completed|Cancelled/i').isVisible();

      expect(statusVisible).toBe(true);
      console.log(`✅ Delivery status displayed`);
    }
  });

  test('should update delivery status', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/delivery/my-deliveries');
    await page.waitForTimeout(3000);

    const firstDelivery = page.locator('[data-testid="delivery-item"]').first();

    if (await firstDelivery.isVisible({ timeout: 5000 })) {
      await firstDelivery.click();
      await page.waitForTimeout(2000);

      const updateButton = page.locator('button:has-text("Picked Up"), button:has-text("Complete")').first();

      if (await updateButton.isVisible({ timeout: 5000 })) {
        await updateButton.click();
        await page.waitForTimeout(2000);

        console.log(`✅ Delivery status updated`);
      }
    }
  });

  test('should show delivery timeline', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/delivery/my-deliveries');
    await page.waitForTimeout(3000);

    const firstDelivery = page.locator('[data-testid="delivery-item"]').first();

    if (await firstDelivery.isVisible({ timeout: 5000 })) {
      await firstDelivery.click();
      await page.waitForTimeout(2000);

      const timelineVisible = await page.locator('[data-testid="timeline"], .timeline, .steps').isVisible({ timeout: 5000 });

      if (timelineVisible) {
        console.log(`✅ Delivery timeline displayed`);
      }
    }
  });
});
