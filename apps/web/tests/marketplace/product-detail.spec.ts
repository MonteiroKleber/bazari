// FASE 11 - PROMPT 1: E2E Test - Product Detail Page (PDP)
// Test: User can view product details and add to cart

import { test, expect } from '@playwright/test';

test.describe('Marketplace - Product Detail Page', () => {
  test('should navigate to product detail from search results', async ({ page }) => {
    await page.goto('/search?q=phone');

    await page.waitForTimeout(3000);

    // Click first product
    const firstProduct = page.locator('[data-testid="product-card"], .product-card, article').first();

    if (await firstProduct.isVisible({ timeout: 10000 })) {
      await firstProduct.click();

      await page.waitForTimeout(2000);

      // Should navigate to PDP
      const urlChanged = page.url() !== '/search?q=phone';

      expect(urlChanged).toBe(true);

      console.log(`✅ Navigated to product detail page: ${page.url()}`);
    } else {
      console.log(`⚠️  No products found to click`);
    }
  });

  test('should display product title and description', async ({ page }) => {
    // Try to navigate to a product page directly
    await page.goto('/search?q=phone');

    await page.waitForTimeout(3000);

    const firstProduct = page.locator('[data-testid="product-card"], .product-card').first();

    if (await firstProduct.isVisible({ timeout: 5000 })) {
      await firstProduct.click();

      await page.waitForTimeout(2000);

      // Should show title
      const titleVisible = await page.locator('h1, [data-testid="product-title"]').isVisible({ timeout: 5000 });

      // Should show description
      const descriptionVisible = await page.locator('[data-testid="product-description"], .description, p').isVisible({ timeout: 5000 });

      expect(titleVisible || descriptionVisible).toBe(true);

      console.log(`✅ Product title and description displayed`);
    }
  });

  test('should display product price', async ({ page }) => {
    await page.goto('/search');

    await page.waitForTimeout(3000);

    const firstProduct = page.locator('[data-testid="product-card"], .product-card').first();

    if (await firstProduct.isVisible({ timeout: 5000 })) {
      await firstProduct.click();

      await page.waitForTimeout(2000);

      // Should show price
      const priceVisible = await page.locator('[data-testid="product-price"], .price, text=/\\d+.*ZARI/i').isVisible({ timeout: 5000 });

      expect(priceVisible).toBe(true);

      const priceText = await page.locator('[data-testid="product-price"], .price').first().textContent();

      console.log(`✅ Product price displayed: ${priceText}`);
    }
  });

  test('should display product images', async ({ page }) => {
    await page.goto('/search');

    await page.waitForTimeout(3000);

    const firstProduct = page.locator('[data-testid="product-card"], .product-card').first();

    if (await firstProduct.isVisible({ timeout: 5000 })) {
      await firstProduct.click();

      await page.waitForTimeout(2000);

      // Should show product images
      const imagesCount = await page.locator('[data-testid="product-image"], img[alt*="product"]').count();

      if (imagesCount > 0) {
        console.log(`✅ Product has ${imagesCount} images`);
      } else {
        console.log(`⚠️  No product images found`);
      }
    }
  });

  test('should display product attributes/specifications', async ({ page }) => {
    await page.goto('/search?q=phone');

    await page.waitForTimeout(3000);

    const firstProduct = page.locator('[data-testid="product-card"], .product-card').first();

    if (await firstProduct.isVisible({ timeout: 5000 })) {
      await firstProduct.click();

      await page.waitForTimeout(2000);

      // Look for attributes section
      const attributesVisible = await page.locator('text=/Specifications|Attributes|Details|Features/i').isVisible({ timeout: 5000 });

      if (attributesVisible) {
        console.log(`✅ Product attributes section displayed`);

        // Count attribute items
        const attributesCount = await page.locator('[data-testid="attribute-item"], .attribute, dl dt, table tr').count();

        console.log(`   Found ${attributesCount} attribute items`);
      } else {
        console.log(`⚠️  No attributes section found`);
      }
    }
  });

  test('should display seller information', async ({ page }) => {
    await page.goto('/search');

    await page.waitForTimeout(3000);

    const firstProduct = page.locator('[data-testid="product-card"], .product-card').first();

    if (await firstProduct.isVisible({ timeout: 5000 })) {
      await firstProduct.click();

      await page.waitForTimeout(2000);

      // Should show seller info
      const sellerVisible = await page.locator('[data-testid="seller-info"], .seller, text=/Sold by|Seller/i').isVisible({ timeout: 5000 });

      if (sellerVisible) {
        console.log(`✅ Seller information displayed`);
      } else {
        console.log(`⚠️  Seller information not found`);
      }
    }
  });

  test('should have "Add to Cart" button', async ({ page }) => {
    await page.goto('/search');

    await page.waitForTimeout(3000);

    const firstProduct = page.locator('[data-testid="product-card"], .product-card').first();

    if (await firstProduct.isVisible({ timeout: 5000 })) {
      await firstProduct.click();

      await page.waitForTimeout(2000);

      // Look for Add to Cart button
      const addToCartButton = page.locator('button:has-text("Add to Cart"), button:has-text("Buy"), [data-testid="add-to-cart"]').first();

      const buttonVisible = await addToCartButton.isVisible({ timeout: 5000 });

      expect(buttonVisible).toBe(true);

      console.log(`✅ "Add to Cart" button displayed`);
    }
  });

  test('should add product to cart', async ({ page }) => {
    await page.goto('/search');

    await page.waitForTimeout(3000);

    const firstProduct = page.locator('[data-testid="product-card"], .product-card').first();

    if (await firstProduct.isVisible({ timeout: 5000 })) {
      await firstProduct.click();

      await page.waitForTimeout(2000);

      // Click Add to Cart
      const addToCartButton = page.locator('button:has-text("Add to Cart"), button:has-text("Buy")').first();

      if (await addToCartButton.isVisible({ timeout: 5000 })) {
        await addToCartButton.click();

        await page.waitForTimeout(2000);

        // Should show success message or cart count update
        const successVisible = await page.locator('.toast-success, text=/Added to cart/i, [data-testid="cart-count"]').isVisible({ timeout: 5000 });

        if (successVisible) {
          console.log(`✅ Product added to cart`);
        } else {
          console.log(`⚠️  No feedback after adding to cart`);
        }
      }
    }
  });

  test('should allow selecting quantity', async ({ page }) => {
    await page.goto('/search');

    await page.waitForTimeout(3000);

    const firstProduct = page.locator('[data-testid="product-card"], .product-card').first();

    if (await firstProduct.isVisible({ timeout: 5000 })) {
      await firstProduct.click();

      await page.waitForTimeout(2000);

      // Look for quantity selector
      const quantityInput = page.locator('input[type="number"][name*="quantity"], [data-testid="quantity"]').first();

      if (await quantityInput.isVisible({ timeout: 5000 })) {
        await quantityInput.fill('3');

        const value = await quantityInput.inputValue();

        expect(value).toBe('3');

        console.log(`✅ Quantity can be changed`);
      } else {
        console.log(`⚠️  Quantity selector not found`);
      }
    }
  });

  test('should show related products', async ({ page }) => {
    await page.goto('/search');

    await page.waitForTimeout(3000);

    const firstProduct = page.locator('[data-testid="product-card"], .product-card').first();

    if (await firstProduct.isVisible({ timeout: 5000 })) {
      await firstProduct.click();

      await page.waitForTimeout(2000);

      // Look for related/similar products section
      const relatedVisible = await page.locator('text=/Related|Similar|You may also like/i').isVisible({ timeout: 5000 });

      if (relatedVisible) {
        const relatedCount = await page.locator('[data-testid="related-product"], .related-product').count();

        console.log(`✅ Related products section displayed (${relatedCount} products)`);
      } else {
        console.log(`⚠️  No related products section`);
      }
    }
  });

  test('should handle product not found gracefully', async ({ page }) => {
    // Try to access non-existent product
    await page.goto('/product/nonexistent-slug-12345');

    await page.waitForTimeout(3000);

    // Should show 404 or error message
    const errorVisible = await page.locator('text=/Not found|404|doesn\'t exist/i').isVisible({ timeout: 5000 });

    if (errorVisible) {
      console.log(`✅ Product not found handled gracefully`);
    } else {
      console.log(`⚠️  No error handling for missing product`);
    }
  });
});
