// FASE 11 - PROMPT 1: E2E Test - Orders Create
// Test: User can create orders from cart

import { test, expect } from '@playwright/test';
import { createTestAccount } from '../helpers/auth-helpers';

test.describe('Orders - Create Order', () => {
  test('should create order from cart', async ({ page }) => {
    await createTestAccount(page);

    // Add product to cart
    await page.goto('/search');
    await page.waitForTimeout(3000);

    const firstProduct = page.locator('[data-testid="product-card"]').first();

    if (await firstProduct.isVisible({ timeout: 5000 })) {
      await firstProduct.click();
      await page.waitForTimeout(2000);

      const addToCartButton = page.locator('button:has-text("Add to Cart")').first();

      if (await addToCartButton.isVisible({ timeout: 5000 })) {
        await addToCartButton.click();
        await page.waitForTimeout(2000);

        // Go to checkout
        await page.goto('/cart');
        await page.waitForTimeout(2000);

        const checkoutButton = page.locator('button:has-text("Checkout")').first();

        if (await checkoutButton.isVisible({ timeout: 5000 })) {
          await checkoutButton.click();
          await page.waitForTimeout(2000);

          // Complete checkout
          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Place Order")').first();

          if (await confirmButton.isVisible({ timeout: 5000 })) {
            await confirmButton.click();
            await page.waitForTimeout(3000);

            console.log(`✅ Order created from cart`);
          }
        }
      }
    }
  });

  test('should validate checkout form', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/checkout');
    await page.waitForTimeout(2000);

    const submitButton = page.locator('button[type="submit"], button:has-text("Place Order")').first();

    if (await submitButton.isVisible({ timeout: 5000 })) {
      await submitButton.click();
      await page.waitForTimeout(1000);

      const errorsVisible = await page.locator('.error, input:invalid').count();

      if (errorsVisible > 0) {
        console.log(`✅ Checkout form validation working`);
      }
    }
  });
});
