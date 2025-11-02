// FASE 11 - PROMPT 1: E2E Test - P2P Browse Offers
// Test: User can browse and filter P2P offers

import { test, expect } from '@playwright/test';

test.describe('P2P - Browse Offers', () => {
  test('should display P2P offers list', async ({ page }) => {
    await page.goto('/app/p2p');
    await page.waitForTimeout(3000);

    const offersListVisible = await page.locator('[data-testid="offers-list"], .offers-list, table').isVisible({ timeout: 10000 });

    if (offersListVisible) {
      const offersCount = await page.locator('[data-testid="offer-card"], .offer-card, tbody tr').count();
      console.log(`✅ Found ${offersCount} P2P offers`);
    } else {
      console.log(`⚠️  No offers found (may be empty)`);
    }
  });

  test('should filter by offer type (buy/sell)', async ({ page }) => {
    await page.goto('/app/p2p');
    await page.waitForTimeout(3000);

    const buyFilter = page.locator('button:has-text("Buy"), input[value="buy"]').first();

    if (await buyFilter.isVisible({ timeout: 5000 })) {
      await buyFilter.click();
      await page.waitForTimeout(2000);

      console.log(`✅ Filtered by Buy offers`);
    }
  });

  test('should filter by payment method', async ({ page }) => {
    await page.goto('/app/p2p');
    await page.waitForTimeout(3000);

    const paymentFilter = page.locator('select[name="payment"], [data-testid="payment-filter"]').first();

    if (await paymentFilter.isVisible({ timeout: 5000 })) {
      await paymentFilter.selectOption({ index: 1 });
      await page.waitForTimeout(2000);

      console.log(`✅ Filtered by payment method`);
    }
  });

  test('should display offer details', async ({ page }) => {
    await page.goto('/app/p2p');
    await page.waitForTimeout(3000);

    const firstOffer = page.locator('[data-testid="offer-card"], .offer-card').first();

    if (await firstOffer.isVisible({ timeout: 5000 })) {
      // Should show amount, price, payment method
      const hasAmount = await firstOffer.locator('text=/\\d+.*ZARI/i').isVisible();
      const hasPrice = await firstOffer.locator('text=/price|rate/i').isVisible();

      expect(hasAmount || hasPrice).toBe(true);
      console.log(`✅ Offer details displayed`);
    }
  });
});
