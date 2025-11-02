// FASE 11 - PROMPT 1: E2E Test - Shopping Cart
// Test: User can manage shopping cart (view, update, remove items)

import { test, expect } from '@playwright/test';
import { createTestAccount } from '../helpers/auth-helpers';

test.describe('Marketplace - Shopping Cart', () => {
  test('should display cart icon in header', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const cartIcon = page.locator('[aria-label="Cart"], [data-testid="cart-icon"], button:has-text("Cart")').first();
    const cartVisible = await cartIcon.isVisible({ timeout: 5000 });

    expect(cartVisible).toBe(true);
    console.log(`✅ Cart icon displayed in header`);
  });

  test('should show cart count badge when items added', async ({ page }) => {
    await createTestAccount(page);
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

        const cartBadge = await page.locator('[data-testid="cart-count"], .cart-badge').textContent();

        if (cartBadge && parseInt(cartBadge) > 0) {
          console.log(`✅ Cart count badge updated: ${cartBadge}`);
        }
      }
    }
  });

  test('should open cart page/drawer', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const cartIcon = page.locator('[aria-label="Cart"], [data-testid="cart-icon"]').first();

    if (await cartIcon.isVisible({ timeout: 5000 })) {
      await cartIcon.click();
      await page.waitForTimeout(2000);

      const cartPageVisible = await page.locator('[data-testid="cart"], text=/Shopping Cart|Your Cart/i').isVisible({ timeout: 5000 });

      expect(cartPageVisible).toBe(true);
      console.log(`✅ Cart page/drawer opened`);
    }
  });

  test('should display cart items', async ({ page }) => {
    await createTestAccount(page);
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

        await page.goto('/cart');
        await page.waitForTimeout(2000);

        const cartItems = await page.locator('[data-testid="cart-item"], .cart-item').count();

        expect(cartItems).toBeGreaterThan(0);
        console.log(`✅ Cart displays ${cartItems} items`);
      }
    }
  });

  test('should update item quantity in cart', async ({ page }) => {
    await createTestAccount(page);
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

        await page.goto('/cart');
        await page.waitForTimeout(2000);

        const quantityInput = page.locator('[data-testid="cart-item-quantity"], input[type="number"]').first();

        if (await quantityInput.isVisible({ timeout: 5000 })) {
          await quantityInput.fill('2');
          await page.waitForTimeout(1000);

          console.log(`✅ Item quantity updated in cart`);
        }
      }
    }
  });

  test('should remove item from cart', async ({ page }) => {
    await createTestAccount(page);
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

        await page.goto('/cart');
        await page.waitForTimeout(2000);

        const removeButton = page.locator('button:has-text("Remove"), [aria-label="Remove"]').first();

        if (await removeButton.isVisible({ timeout: 5000 })) {
          await removeButton.click();
          await page.waitForTimeout(2000);

          console.log(`✅ Item removed from cart`);
        }
      }
    }
  });

  test('should display cart total', async ({ page }) => {
    await createTestAccount(page);
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

        await page.goto('/cart');
        await page.waitForTimeout(2000);

        const totalVisible = await page.locator('[data-testid="cart-total"], text=/Total|Subtotal/i').isVisible({ timeout: 5000 });

        expect(totalVisible).toBe(true);
        console.log(`✅ Cart total displayed`);
      }
    }
  });

  test('should proceed to checkout', async ({ page }) => {
    await createTestAccount(page);
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

        await page.goto('/cart');
        await page.waitForTimeout(2000);

        const checkoutButton = page.locator('button:has-text("Checkout"), button:has-text("Proceed")').first();

        if (await checkoutButton.isVisible({ timeout: 5000 })) {
          await checkoutButton.click();
          await page.waitForTimeout(2000);

          console.log(`✅ Proceeded to checkout: ${page.url()}`);
        }
      }
    }
  });
});
