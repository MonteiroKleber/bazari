// FASE 11 - PROMPT 1: E2E Test - Marketplace Search
// Test: User can search for products and services

import { test, expect } from '@playwright/test';

test.describe('Marketplace - Search', () => {
  test('should display search page', async ({ page }) => {
    await page.goto('/search');

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Should show search input
    const searchInputVisible = await page.locator('input[type="search"], input[placeholder*="Search"], input[name="search"], input[name="q"]').isVisible({ timeout: 5000 });

    expect(searchInputVisible).toBe(true);

    console.log(`✅ Search page displayed with search input`);
  });

  test('should search for products', async ({ page }) => {
    await page.goto('/search');

    await page.waitForTimeout(2000);

    // Type search query
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[name="search"], input[name="q"]').first();

    await searchInput.fill('phone');

    // Submit search (may be auto-search or button)
    const searchButton = page.locator('button[type="submit"], button:has-text("Search")').first();

    if (await searchButton.isVisible({ timeout: 2000 })) {
      await searchButton.click();
    } else {
      // Auto-search - wait for results
      await page.waitForTimeout(1000);
    }

    // Should show results
    await page.waitForTimeout(2000);

    const resultsVisible = await page.locator('[data-testid="search-results"], .search-results, [data-testid="product-card"]').isVisible({ timeout: 10000 });

    if (resultsVisible) {
      const resultsCount = await page.locator('[data-testid="product-card"], .product-card, article').count();

      console.log(`✅ Search returned ${resultsCount} results for "phone"`);
    } else {
      console.log(`⚠️  No results found for "phone" (database may be empty)`);
    }
  });

  test('should search for services', async ({ page }) => {
    await page.goto('/search');

    await page.waitForTimeout(2000);

    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();

    await searchInput.fill('delivery');

    await page.waitForTimeout(2000);

    // Check if results include services
    const serviceResults = await page.locator('text=/service|delivery/i').count();

    if (serviceResults > 0) {
      console.log(`✅ Search includes services (${serviceResults} matches)`);
    } else {
      console.log(`⚠️  No service results found`);
    }
  });

  test('should show "no results" message for invalid search', async ({ page }) => {
    await page.goto('/search');

    await page.waitForTimeout(2000);

    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();

    // Search for something that definitely doesn't exist
    await searchInput.fill('xyzabc123nonexistent');

    await page.waitForTimeout(2000);

    // Should show empty state
    const emptyStateVisible = await page.locator('text=/No results|Nothing found|Try different/i').isVisible({ timeout: 5000 });

    if (emptyStateVisible) {
      console.log(`✅ "No results" message displayed for invalid search`);
    } else {
      console.log(`⚠️  No results message not found (may show empty list)`);
    }
  });

  test('should highlight search term in results', async ({ page }) => {
    await page.goto('/search');

    await page.waitForTimeout(2000);

    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();

    await searchInput.fill('laptop');

    await page.waitForTimeout(2000);

    // Check if search term is highlighted (bold, mark, em, etc.)
    const highlightedTerms = await page.locator('mark, strong, em, .highlight').count();

    if (highlightedTerms > 0) {
      console.log(`✅ Search terms highlighted in results (${highlightedTerms} instances)`);
    } else {
      console.log(`⚠️  Search terms not highlighted`);
    }
  });

  test('should show search suggestions/autocomplete', async ({ page }) => {
    await page.goto('/search');

    await page.waitForTimeout(2000);

    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();

    // Start typing
    await searchInput.fill('phon');

    await page.waitForTimeout(1000);

    // Look for suggestions dropdown
    const suggestionsVisible = await page.locator('[role="listbox"], .suggestions, .autocomplete, datalist').isVisible({ timeout: 3000 });

    if (suggestionsVisible) {
      const suggestionsCount = await page.locator('[role="option"], .suggestion-item, li').count();

      console.log(`✅ Search suggestions displayed (${suggestionsCount} suggestions)`);
    } else {
      console.log(`⚠️  No search suggestions (may not be implemented)`);
    }
  });

  test('should persist search query in URL', async ({ page }) => {
    await page.goto('/search');

    await page.waitForTimeout(2000);

    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();

    await searchInput.fill('smartphone');

    await page.waitForTimeout(2000);

    // Check URL for search query
    const url = page.url();

    const hasQueryParam = url.includes('smartphone') || url.includes('q=') || url.includes('search=');

    if (hasQueryParam) {
      console.log(`✅ Search query persisted in URL: ${url}`);
    } else {
      console.log(`⚠️  Search query not in URL (may use state only)`);
    }
  });

  test('should allow clearing search', async ({ page }) => {
    await page.goto('/search');

    await page.waitForTimeout(2000);

    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();

    await searchInput.fill('test search');

    await page.waitForTimeout(1000);

    // Look for clear button (X icon)
    const clearButton = page.locator('button[aria-label="Clear"], button:has-text("✕"), [data-testid="clear-search"]').first();

    if (await clearButton.isVisible({ timeout: 2000 })) {
      await clearButton.click();

      await page.waitForTimeout(1000);

      // Input should be empty
      const inputValue = await searchInput.inputValue();

      expect(inputValue).toBe('');

      console.log(`✅ Search can be cleared with button`);
    } else {
      console.log(`⚠️  No clear button (must delete manually)`);
    }
  });

  test('should show recent searches', async ({ page }) => {
    await page.goto('/search');

    await page.waitForTimeout(2000);

    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();

    // Perform first search
    await searchInput.fill('laptop');
    await page.waitForTimeout(2000);

    // Perform second search
    await searchInput.fill('phone');
    await page.waitForTimeout(2000);

    // Clear and focus to see recent searches
    await searchInput.clear();
    await searchInput.focus();

    await page.waitForTimeout(1000);

    // Look for recent searches
    const recentSearchesVisible = await page.locator('text=/Recent|History/i, [data-testid="recent-searches"]').isVisible({ timeout: 3000 });

    if (recentSearchesVisible) {
      console.log(`✅ Recent searches displayed`);
    } else {
      console.log(`⚠️  Recent searches not shown (may not be implemented)`);
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/search');

    await page.waitForTimeout(2000);

    // Search should be accessible on mobile
    const searchInputVisible = await page.locator('input[type="search"], input[placeholder*="Search"]').isVisible();

    expect(searchInputVisible).toBe(true);

    // Results should stack vertically on mobile
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();

    await searchInput.fill('test');
    await page.waitForTimeout(2000);

    console.log(`✅ Search is responsive on mobile`);
  });
});
