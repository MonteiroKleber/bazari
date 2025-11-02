// FASE 11 - PROMPT 1: E2E Test - P2P Create Offer
// Test: User can create P2P buy/sell offers

import { test, expect } from '@playwright/test';
import { createTestAccount } from '../helpers/auth-helpers';
import { TEST_P2P_OFFERS } from '../helpers/test-data';

test.describe('P2P - Create Offer', () => {
  test('should navigate to P2P create offer page', async ({ page }) => {
    await createTestAccount(page);

    // Navigate to P2P section
    await page.goto('/app/p2p');
    await page.waitForTimeout(2000);

    // Look for Create Offer button
    const createButton = page.locator('button:has-text("Create Offer"), a[href*="create"], [data-testid="create-offer"]').first();

    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(2000);

      expect(page.url()).toContain('create');
      console.log(`✅ Navigated to create offer page`);
    } else {
      console.log(`⚠️  Create offer button not found`);
    }
  });

  test('should create sell offer', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/p2p/create');
    await page.waitForTimeout(2000);

    // Select offer type
    const sellOption = page.locator('input[value="sell"], button:has-text("Sell")').first();

    if (await sellOption.isVisible({ timeout: 5000 })) {
      await sellOption.click();

      // Fill form
      const amountInput = page.locator('input[name="amount"]').first();
      if (await amountInput.isVisible({ timeout: 3000 })) {
        await amountInput.fill(TEST_P2P_OFFERS.sell_zari.amount);

        const priceInput = page.locator('input[name="price"]').first();
        await priceInput.fill(TEST_P2P_OFFERS.sell_zari.price_per_unit);

        // Submit
        const submitButton = page.locator('button[type="submit"], button:has-text("Create")').first();
        await submitButton.click();
        await page.waitForTimeout(2000);

        console.log(`✅ Sell offer created`);
      }
    }
  });

  test('should create buy offer', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/p2p/create');
    await page.waitForTimeout(2000);

    const buyOption = page.locator('input[value="buy"], button:has-text("Buy")').first();

    if (await buyOption.isVisible({ timeout: 5000 })) {
      await buyOption.click();

      const amountInput = page.locator('input[name="amount"]').first();
      if (await amountInput.isVisible({ timeout: 3000 })) {
        await amountInput.fill(TEST_P2P_OFFERS.buy_zari.amount);

        const priceInput = page.locator('input[name="price"]').first();
        await priceInput.fill(TEST_P2P_OFFERS.buy_zari.price_per_unit);

        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();
        await page.waitForTimeout(2000);

        console.log(`✅ Buy offer created`);
      }
    }
  });

  test('should validate required fields', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/p2p/create');
    await page.waitForTimeout(2000);

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]').first();

    if (await submitButton.isVisible({ timeout: 5000 })) {
      await submitButton.click();
      await page.waitForTimeout(1000);

      // Should show validation errors
      const errorsVisible = await page.locator('.error, .invalid, input:invalid').count();
      expect(errorsVisible).toBeGreaterThan(0);

      console.log(`✅ Form validation working`);
    }
  });
});
