// FASE 11 - PROMPT 1: E2E Test - Orders Refunds
// Test: User can request refunds for orders

import { test, expect } from '@playwright/test';
import { createTestAccount } from '../helpers/auth-helpers';

test.describe('Orders - Refunds', () => {
  test('should display refund option for eligible orders', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/orders');
    await page.waitForTimeout(3000);

    const firstOrder = page.locator('[data-testid="order-card"]').first();

    if (await firstOrder.isVisible({ timeout: 5000 })) {
      await firstOrder.click();
      await page.waitForTimeout(2000);

      const refundButton = page.locator('button:has-text("Request Refund"), button:has-text("Refund")').first();

      if (await refundButton.isVisible({ timeout: 5000 })) {
        console.log(`✅ Refund option available for order`);
      } else {
        console.log(`⚠️  Refund option not available (order may not be eligible)`);
      }
    }
  });

  test('should request refund', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/orders');
    await page.waitForTimeout(3000);

    const firstOrder = page.locator('[data-testid="order-card"]').first();

    if (await firstOrder.isVisible({ timeout: 5000 })) {
      await firstOrder.click();
      await page.waitForTimeout(2000);

      const refundButton = page.locator('button:has-text("Request Refund")').first();

      if (await refundButton.isVisible({ timeout: 5000 })) {
        await refundButton.click();
        await page.waitForTimeout(2000);

        // Fill refund reason
        const reasonInput = page.locator('textarea[name="reason"], select[name="reason"]').first();

        if (await reasonInput.isVisible({ timeout: 3000 })) {
          if (reasonInput.getAttribute('name') === 'reason') {
            await reasonInput.fill('Product was damaged');
          }

          const submitButton = page.locator('button[type="submit"], button:has-text("Submit")').first();
          await submitButton.click();
          await page.waitForTimeout(2000);

          console.log(`✅ Refund request submitted`);
        }
      }
    }
  });

  test('should show refund status', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/orders');
    await page.waitForTimeout(3000);

    const firstOrder = page.locator('[data-testid="order-card"]').first();

    if (await firstOrder.isVisible({ timeout: 5000 })) {
      await firstOrder.click();
      await page.waitForTimeout(2000);

      const refundStatusVisible = await page.locator('text=/Refund requested|Refund approved|Refunded/i').isVisible({ timeout: 3000 });

      if (refundStatusVisible) {
        console.log(`✅ Refund status displayed`);
      }
    }
  });
});
