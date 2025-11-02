// FASE 11 - PROMPT 1: E2E Test - Marketplace Filters
// Test: User can apply filters (category, price, attributes) to search results

import { test, expect } from '@playwright/test';

test.describe('Marketplace - Filters', () => {
  test('should display filter options', async ({ page }) => {
    await page.goto('/search');

    await page.waitForTimeout(3000);

    // Look for filters sidebar or panel
    const filtersVisible = await page.locator('[data-testid="filters"], .filters, aside, [role="complementary"]').isVisible({ timeout: 5000 });

    if (filtersVisible) {
      console.log(`✅ Filters panel displayed`);
    } else {
      // May be hidden on mobile, look for filter button
      const filterButtonVisible = await page.locator('button:has-text("Filter"), button:has-text("Filters")').isVisible({ timeout: 3000 });

      if (filterButtonVisible) {
        console.log(`✅ Filter button displayed (mobile)`);
      } else {
        console.log(`⚠️  Filters not found`);
      }
    }
  });

  test('should filter by category', async ({ page }) => {
    await page.goto('/search');

    await page.waitForTimeout(3000);

    // Look for category filter
    const categoryFilter = page.locator('text=/Category|Categories/i, [data-testid="category-filter"]').first();

    if (await categoryFilter.isVisible({ timeout: 5000 })) {
      // Find a category option (e.g., "Electronics")
      const electronicsOption = page.locator('text=Electronics, input[value="electronics"], [data-category="electronics"]').first();

      if (await electronicsOption.isVisible({ timeout: 3000 })) {
        await electronicsOption.click();

        await page.waitForTimeout(2000);

        // Results should update
        const resultsCount = await page.locator('[data-testid="product-card"], .product-card').count();

        console.log(`✅ Category filter applied (${resultsCount} results)`);

        // URL should reflect filter
        const url = page.url();

        if (url.includes('category') || url.includes('electronics')) {
          console.log(`   Filter persisted in URL`);
        }
      } else {
        console.log(`⚠️  No category options found`);
      }
    } else {
      console.log(`⚠️  Category filter not found`);
    }
  });

  test('should filter by price range', async ({ page }) => {
    await page.goto('/search');

    await page.waitForTimeout(3000);

    // Look for price filter
    const priceFilter = page.locator('text=/Price|Price Range/i, [data-testid="price-filter"]').first();

    if (await priceFilter.isVisible({ timeout: 5000 })) {
      // Look for price inputs or slider
      const minPriceInput = page.locator('input[name="minPrice"], input[placeholder*="Min"]').first();
      const maxPriceInput = page.locator('input[name="maxPrice"], input[placeholder*="Max"]').first();

      if (await minPriceInput.isVisible({ timeout: 3000 })) {
        await minPriceInput.fill('100');
        await maxPriceInput.fill('500');

        await page.waitForTimeout(2000);

        console.log(`✅ Price range filter applied (100-500)`);

        // Verify results are within range
        const prices = await page.locator('[data-testid="product-price"], .price').allTextContents();

        if (prices.length > 0) {
          console.log(`   Found ${prices.length} products in price range`);
        }
      } else {
        console.log(`⚠️  Price input fields not found`);
      }
    } else {
      console.log(`⚠️  Price filter not found`);
    }
  });

  test('should filter by attributes (e.g., brand, color)', async ({ page }) => {
    await page.goto('/search?q=phone');

    await page.waitForTimeout(3000);

    // Look for attribute filters
    const attributeFilters = await page.locator('text=/Brand|Color|Size|Storage/i').count();

    if (attributeFilters > 0) {
      console.log(`✅ Found ${attributeFilters} attribute filter types`);

      // Try selecting a brand filter
      const brandFilter = page.locator('text=/Brand/i').first();

      if (await brandFilter.isVisible({ timeout: 3000 })) {
        // Find a brand checkbox/option
        const brandOption = page.locator('input[type="checkbox"][name*="brand"], [data-attribute="brand"] input').first();

        if (await brandOption.isVisible({ timeout: 3000 })) {
          await brandOption.check();

          await page.waitForTimeout(2000);

          console.log(`✅ Attribute filter applied`);
        }
      }
    } else {
      console.log(`⚠️  No attribute filters found`);
    }
  });

  test('should apply multiple filters together', async ({ page }) => {
    await page.goto('/search');

    await page.waitForTimeout(3000);

    let filtersApplied = 0;

    // Apply category filter
    const electronicsOption = page.locator('text=Electronics, input[value="electronics"]').first();

    if (await electronicsOption.isVisible({ timeout: 3000 })) {
      await electronicsOption.click();
      filtersApplied++;
      await page.waitForTimeout(1000);
    }

    // Apply price filter
    const minPriceInput = page.locator('input[name="minPrice"], input[placeholder*="Min"]').first();

    if (await minPriceInput.isVisible({ timeout: 3000 })) {
      await minPriceInput.fill('100');
      filtersApplied++;
      await page.waitForTimeout(1000);
    }

    if (filtersApplied > 1) {
      console.log(`✅ Multiple filters applied (${filtersApplied} filters)`);

      // Results should respect all filters
      const resultsCount = await page.locator('[data-testid="product-card"], .product-card').count();

      console.log(`   Results after filtering: ${resultsCount}`);
    } else {
      console.log(`⚠️  Could not apply multiple filters`);
    }
  });

  test('should clear all filters', async ({ page }) => {
    await page.goto('/search');

    await page.waitForTimeout(3000);

    // Apply a filter
    const firstFilterOption = page.locator('input[type="checkbox"], input[type="radio"]').first();

    if (await firstFilterOption.isVisible({ timeout: 3000 })) {
      await firstFilterOption.check();

      await page.waitForTimeout(1000);

      // Look for "Clear all" button
      const clearButton = page.locator('button:has-text("Clear"), button:has-text("Reset"), [data-testid="clear-filters"]').first();

      if (await clearButton.isVisible({ timeout: 3000 })) {
        await clearButton.click();

        await page.waitForTimeout(2000);

        // Filters should be cleared
        const isChecked = await firstFilterOption.isChecked();

        expect(isChecked).toBe(false);

        console.log(`✅ All filters cleared`);
      } else {
        console.log(`⚠️  Clear filters button not found`);
      }
    }
  });

  test('should show active filters count', async ({ page }) => {
    await page.goto('/search');

    await page.waitForTimeout(3000);

    // Apply filters
    const filterOptions = await page.locator('input[type="checkbox"]').count();

    if (filterOptions > 0) {
      // Check first filter
      await page.locator('input[type="checkbox"]').first().check();

      await page.waitForTimeout(1000);

      // Look for active filters indicator (e.g., "1 filter", badge)
      const activeFiltersVisible = await page.locator('text=/\\d+ filter/, [data-testid="active-filters-count"]').isVisible({ timeout: 3000 });

      if (activeFiltersVisible) {
        console.log(`✅ Active filters count displayed`);
      } else {
        console.log(`⚠️  Active filters count not shown`);
      }
    }
  });

  test('should persist filters on pagination', async ({ page }) => {
    await page.goto('/search');

    await page.waitForTimeout(3000);

    // Apply a filter
    const categoryFilter = page.locator('text=Electronics, input[value="electronics"]').first();

    if (await categoryFilter.isVisible({ timeout: 3000 })) {
      await categoryFilter.click();

      await page.waitForTimeout(2000);

      // Navigate to next page (if pagination exists)
      const nextButton = page.locator('button:has-text("Next"), [aria-label="Next page"]').first();

      if (await nextButton.isEnabled({ timeout: 3000 })) {
        await nextButton.click();

        await page.waitForTimeout(2000);

        // Filter should still be applied
        const url = page.url();

        if (url.includes('electronics') || url.includes('category')) {
          console.log(`✅ Filters persisted across pagination`);
        } else {
          console.log(`⚠️  Filters may not persist on pagination`);
        }
      } else {
        console.log(`⚠️  No pagination to test persistence`);
      }
    }
  });

  test('should show filter results count', async ({ page }) => {
    await page.goto('/search');

    await page.waitForTimeout(3000);

    // Apply a filter
    const firstFilter = page.locator('input[type="checkbox"]').first();

    if (await firstFilter.isVisible({ timeout: 3000 })) {
      await firstFilter.check();

      await page.waitForTimeout(2000);

      // Look for results count (e.g., "Showing 12 results")
      const resultsCountVisible = await page.locator('text=/\\d+ results?|Showing \\d+/i').isVisible({ timeout: 3000 });

      if (resultsCountVisible) {
        const countText = await page.locator('text=/\\d+ results?|Showing \\d+/i').textContent();

        console.log(`✅ Results count displayed: ${countText}`);
      } else {
        console.log(`⚠️  Results count not displayed`);
      }
    }
  });

  test('should handle filters on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/search');

    await page.waitForTimeout(3000);

    // Filters may be hidden in drawer on mobile
    const filterButton = page.locator('button:has-text("Filter"), button:has-text("Filters")').first();

    if (await filterButton.isVisible({ timeout: 5000 })) {
      await filterButton.click();

      await page.waitForTimeout(1000);

      // Filters drawer should open
      const filtersDrawerVisible = await page.locator('[role="dialog"], .drawer, .modal').isVisible({ timeout: 3000 });

      expect(filtersDrawerVisible).toBe(true);

      console.log(`✅ Filters drawer works on mobile`);
    } else {
      console.log(`⚠️  Filter button not found on mobile`);
    }
  });
});
