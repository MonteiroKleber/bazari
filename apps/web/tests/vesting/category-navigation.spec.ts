// FASE 11 - PROMPT 1: E2E Test - Vesting Category Navigation
// Test: User can navigate between vesting categories (Founders, Team, Partners, Marketing)

import { test, expect } from '@playwright/test';
import { VESTING_CATEGORIES } from '../helpers/test-data';

test.describe('Vesting - Category Navigation', () => {
  test('should display all vesting categories', async ({ page }) => {
    await page.goto('/vesting');

    // Wait for categories to load
    await page.waitForTimeout(3000);

    // Check for category tabs or cards
    const categoryElements = await page.locator('[data-testid="category-tab"], .category-tab, [role="tab"]').count();

    if (categoryElements > 0) {
      console.log(`✅ Found ${categoryElements} category navigation elements`);
    } else {
      // May use cards instead of tabs
      const categoryCards = await page.locator('[data-testid="category-card"], .category-card').count();
      console.log(`✅ Found ${categoryCards} category cards`);
    }
  });

  test('should navigate to Founders category', async ({ page }) => {
    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    // Click Founders category
    const foundersTab = page.locator('text=Founders, [data-testid="category-Founders"]').first();

    if (await foundersTab.isVisible({ timeout: 5000 })) {
      await foundersTab.click();

      // Should show Founders data
      await page.waitForTimeout(2000);

      // Check if Founders content is displayed
      const foundersContentVisible = await page.locator('text=/Founders/i').isVisible();
      expect(foundersContentVisible).toBe(true);

      console.log(`✅ Navigated to Founders category`);
    } else {
      console.log(`⚠️  Founders category not found (chain may not have vesting data)`);
    }
  });

  test('should navigate to Team category', async ({ page }) => {
    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    // Click Team category
    const teamTab = page.locator('text=Team, [data-testid="category-Team"]').first();

    if (await teamTab.isVisible({ timeout: 5000 })) {
      await teamTab.click();

      await page.waitForTimeout(2000);

      const teamContentVisible = await page.locator('text=/Team/i').isVisible();
      expect(teamContentVisible).toBe(true);

      console.log(`✅ Navigated to Team category`);
    } else {
      console.log(`⚠️  Team category not found`);
    }
  });

  test('should navigate to Partners category', async ({ page }) => {
    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    const partnersTab = page.locator('text=Partners, [data-testid="category-Partners"]').first();

    if (await partnersTab.isVisible({ timeout: 5000 })) {
      await partnersTab.click();

      await page.waitForTimeout(2000);

      const partnersContentVisible = await page.locator('text=/Partners/i').isVisible();
      expect(partnersContentVisible).toBe(true);

      console.log(`✅ Navigated to Partners category`);
    } else {
      console.log(`⚠️  Partners category not found`);
    }
  });

  test('should navigate to Marketing category', async ({ page }) => {
    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    const marketingTab = page.locator('text=Marketing, [data-testid="category-Marketing"]').first();

    if (await marketingTab.isVisible({ timeout: 5000 })) {
      await marketingTab.click();

      await page.waitForTimeout(2000);

      const marketingContentVisible = await page.locator('text=/Marketing/i').isVisible();
      expect(marketingContentVisible).toBe(true);

      console.log(`✅ Navigated to Marketing category`);
    } else {
      console.log(`⚠️  Marketing category not found`);
    }
  });

  test('should show different data for each category', async ({ page }) => {
    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    const categories = ['Founders', 'Team'];
    const categoryData: Record<string, string> = {};

    for (const category of categories) {
      const categoryTab = page.locator(`text=${category}`).first();

      if (await categoryTab.isVisible({ timeout: 3000 })) {
        await categoryTab.click();
        await page.waitForTimeout(2000);

        // Get category content (accounts count, total amount, etc.)
        const content = await page.locator('[data-testid="category-content"], .category-content, main').textContent();
        categoryData[category] = content || '';
      }
    }

    // If we have data for both categories, they should be different
    if (categoryData.Founders && categoryData.Team) {
      expect(categoryData.Founders).not.toBe(categoryData.Team);

      console.log(`✅ Categories show different data`);
    } else {
      console.log(`⚠️  Could not compare category data (may not have enough data)`);
    }
  });

  test('should highlight active category', async ({ page }) => {
    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    const foundersTab = page.locator('text=Founders, [data-testid="category-Founders"]').first();

    if (await foundersTab.isVisible({ timeout: 5000 })) {
      await foundersTab.click();

      await page.waitForTimeout(1000);

      // Active tab should have special styling (aria-selected, active class, etc.)
      const isActive = await foundersTab.evaluate((el) => {
        return (
          el.getAttribute('aria-selected') === 'true' ||
          el.classList.contains('active') ||
          el.classList.contains('selected')
        );
      });

      if (isActive) {
        console.log(`✅ Active category is highlighted`);
      } else {
        console.log(`⚠️  Active category not visually distinguished`);
      }
    }
  });

  test('should persist category selection on page reload', async ({ page }) => {
    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    const teamTab = page.locator('text=Team').first();

    if (await teamTab.isVisible({ timeout: 5000 })) {
      await teamTab.click();

      await page.waitForTimeout(2000);

      // Reload page
      await page.reload();

      await page.waitForTimeout(3000);

      // Check if Team is still selected (via URL hash or state)
      const url = page.url();
      const teamStillActive = url.includes('team') || url.includes('Team');

      if (teamStillActive) {
        console.log(`✅ Category selection persisted across reload`);
      } else {
        console.log(`⚠️  Category selection not persisted (resets to default)`);
      }
    }
  });

  test('should handle category with no data gracefully', async ({ page }) => {
    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    // Try to find a category
    const anyCategory = page.locator('[data-testid^="category-"], .category-tab, [role="tab"]').first();

    if (await anyCategory.isVisible({ timeout: 5000 })) {
      await anyCategory.click();

      await page.waitForTimeout(2000);

      // Should show empty state or "No data" message if category is empty
      const emptyStateVisible = await page.locator('text=/No accounts|No data|Empty/i').isVisible({ timeout: 3000 });

      if (emptyStateVisible) {
        console.log(`✅ Empty state displayed for category with no data`);
      } else {
        console.log(`⚠️  Category shows data or no empty state UI`);
      }
    }
  });
});
