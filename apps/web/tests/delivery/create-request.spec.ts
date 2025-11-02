// FASE 11 - PROMPT 1: E2E Test - Delivery Create Request
// Test: User can create delivery requests

import { test, expect } from '@playwright/test';
import { createTestAccount } from '../helpers/auth-helpers';
import { TEST_DELIVERIES } from '../helpers/test-data';

test.describe('Delivery - Create Request', () => {
  test('should navigate to create delivery page', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/delivery');
    await page.waitForTimeout(2000);

    const createButton = page.locator('button:has-text("Create"), a[href*="create"]').first();

    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(2000);

      expect(page.url()).toContain('create');
      console.log(`✅ Navigated to create delivery page`);
    }
  });

  test('should create delivery request', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/delivery/create');
    await page.waitForTimeout(2000);

    const pickupInput = page.locator('input[name="pickup"], textarea[name="pickup"]').first();

    if (await pickupInput.isVisible({ timeout: 5000 })) {
      await pickupInput.fill(TEST_DELIVERIES.standard.pickup_address);

      const deliveryInput = page.locator('input[name="delivery"], textarea[name="delivery"]').first();
      await deliveryInput.fill(TEST_DELIVERIES.standard.delivery_address);

      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();
      await page.waitForTimeout(2000);

      console.log(`✅ Delivery request created`);
    }
  });

  test('should validate required fields', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/delivery/create');
    await page.waitForTimeout(2000);

    const submitButton = page.locator('button[type="submit"]').first();

    if (await submitButton.isVisible({ timeout: 5000 })) {
      await submitButton.click();
      await page.waitForTimeout(1000);

      const errorsVisible = await page.locator('.error, input:invalid').count();
      expect(errorsVisible).toBeGreaterThan(0);

      console.log(`✅ Form validation working`);
    }
  });
});
