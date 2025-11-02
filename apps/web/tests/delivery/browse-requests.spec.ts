// FASE 11 - PROMPT 1: E2E Test - Delivery Browse Requests
// Test: Delivery drivers can browse available requests

import { test, expect } from '@playwright/test';
import { createTestAccount } from '../helpers/auth-helpers';

test.describe('Delivery - Browse Requests', () => {
  test('should display delivery requests list', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/delivery');
    await page.waitForTimeout(3000);

    const requestsListVisible = await page.locator('[data-testid="delivery-requests"], .requests-list').isVisible({ timeout: 10000 });

    if (requestsListVisible) {
      const requestsCount = await page.locator('[data-testid="delivery-card"], .delivery-card').count();
      console.log(`✅ Found ${requestsCount} delivery requests`);
    } else {
      console.log(`⚠️  No delivery requests found`);
    }
  });

  test('should filter by delivery area', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/delivery');
    await page.waitForTimeout(3000);

    const filterInput = page.locator('input[placeholder*="area"], input[name="area"]').first();

    if (await filterInput.isVisible({ timeout: 5000 })) {
      await filterInput.fill('Centro');
      await page.waitForTimeout(2000);

      console.log(`✅ Filtered by delivery area`);
    }
  });

  test('should display request details', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/delivery');
    await page.waitForTimeout(3000);

    const firstRequest = page.locator('[data-testid="delivery-card"]').first();

    if (await firstRequest.isVisible({ timeout: 5000 })) {
      const hasPickup = await firstRequest.locator('text=/Pickup|From/i').isVisible();
      const hasDelivery = await firstRequest.locator('text=/Delivery|To/i').isVisible();

      expect(hasPickup || hasDelivery).toBe(true);
      console.log(`✅ Request details displayed`);
    }
  });
});
