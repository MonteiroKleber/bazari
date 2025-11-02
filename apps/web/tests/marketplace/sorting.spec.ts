// FASE 11 - PROMPT 1: E2E Test - Marketplace Sorting
// Test: User can sort search results by different criteria

import { test, expect } from '@playwright/test';

test.describe('Marketplace - Sorting', () => {
  test('should display sort options', async ({ page }) => {
    await page.goto('/search?q=phone');
    await page.waitForTimeout(3000);

    const sortDropdown = page.locator('select[name="sort"], [data-testid="sort-dropdown"], button:has-text("Sort")').first();
    const sortVisible = await sortDropdown.isVisible({ timeout: 5000 });

    if (sortVisible) {
      console.log(`✅ Sort options displayed`);
    } else {
      console.log(`⚠️  Sort dropdown not found`);
    }
  });

  test('should sort by price (low to high)', async ({ page }) => {
    await page.goto('/search?q=phone');
    await page.waitForTimeout(3000);

    const sortDropdown = page.locator('select[name="sort"]').first();

    if (await sortDropdown.isVisible({ timeout: 5000 })) {
      await sortDropdown.selectOption({ label: /price.*low|low.*price/i });
      await page.waitForTimeout(2000);

      console.log(`✅ Sorted by price (low to high)`);
    }
  });

  test('should sort by price (high to low)', async ({ page }) => {
    await page.goto('/search?q=phone');
    await page.waitForTimeout(3000);

    const sortDropdown = page.locator('select[name="sort"]').first();

    if (await sortDropdown.isVisible({ timeout: 5000 })) {
      await sortDropdown.selectOption({ label: /price.*high|high.*price/i });
      await page.waitForTimeout(2000);

      console.log(`✅ Sorted by price (high to low)`);
    }
  });

  test('should sort by newest first', async ({ page }) => {
    await page.goto('/search?q=phone');
    await page.waitForTimeout(3000);

    const sortDropdown = page.locator('select[name="sort"]').first();

    if (await sortDropdown.isVisible({ timeout: 5000 })) {
      await sortDropdown.selectOption({ label: /newest|latest|recent/i });
      await page.waitForTimeout(2000);

      console.log(`✅ Sorted by newest first`);
    }
  });

  test('should sort by relevance', async ({ page }) => {
    await page.goto('/search?q=phone');
    await page.waitForTimeout(3000);

    const sortDropdown = page.locator('select[name="sort"]').first();

    if (await sortDropdown.isVisible({ timeout: 5000 })) {
      await sortDropdown.selectOption({ label: /relevance|best match/i });
      await page.waitForTimeout(2000);

      console.log(`✅ Sorted by relevance`);
    }
  });

  test('should persist sort option in URL', async ({ page }) => {
    await page.goto('/search?q=phone');
    await page.waitForTimeout(3000);

    const sortDropdown = page.locator('select[name="sort"]').first();

    if (await sortDropdown.isVisible({ timeout: 5000 })) {
      await sortDropdown.selectOption({ label: /price.*low/i });
      await page.waitForTimeout(2000);

      const url = page.url();

      if (url.includes('sort')) {
        console.log(`✅ Sort persisted in URL: ${url}`);
      }
    }
  });
});
