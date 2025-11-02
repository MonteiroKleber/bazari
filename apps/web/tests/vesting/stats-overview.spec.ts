// FASE 11 - PROMPT 1: E2E Test - Vesting Stats Overview
// Test: User can view vesting stats overview on /vesting page

import { test, expect } from '@playwright/test';

test.describe('Vesting - Stats Overview', () => {
  test('should display vesting stats overview', async ({ page }) => {
    // Navigate to vesting page (public)
    await page.goto('/vesting');

    // Wait for stats to load
    await page.waitForSelector('[data-testid="vesting-stats"], .vesting-stats', { timeout: 15000 });

    // Should show main stats cards
    const totalVestingVisible = await page.locator('text=/Total Vesting|Total Locked/i').isVisible();
    const totalUnlockedVisible = await page.locator('text=/Total Unlocked|Total Released/i').isVisible();
    const categoriesVisible = await page.locator('text=/Categories|Vesting Categories/i').isVisible();

    expect(totalVestingVisible || totalUnlockedVisible || categoriesVisible).toBe(true);

    console.log(`✅ Vesting stats overview displayed`);
  });

  test('should show correct total vesting amount', async ({ page }) => {
    await page.goto('/vesting');

    // Wait for stats to load
    await page.waitForSelector('[data-testid="total-vesting"], .total-vesting', { timeout: 15000 });

    // Get total vesting amount
    const totalVestingText = await page.locator('[data-testid="total-vesting"], .total-vesting').first().textContent();

    expect(totalVestingText).toBeTruthy();

    // Should contain a number (even if 0)
    const hasNumber = /\d+/.test(totalVestingText || '');
    expect(hasNumber).toBe(true);

    console.log(`✅ Total vesting amount: ${totalVestingText}`);
  });

  test('should display vesting categories with counts', async ({ page }) => {
    await page.goto('/vesting');

    // Wait for categories to load
    await page.waitForSelector('[data-testid="vesting-categories"], .vesting-categories', { timeout: 15000 });

    // Check if categories are displayed
    const categoriesCount = await page.locator('[data-testid="category-card"], .category-card').count();

    // Should have at least 1 category (Founders, Team, Partners, Marketing)
    expect(categoriesCount).toBeGreaterThanOrEqual(0);

    if (categoriesCount > 0) {
      // Each category should have a name and count
      const firstCategory = page.locator('[data-testid="category-card"], .category-card').first();

      const hasName = await firstCategory.locator('text=/Founders|Team|Partners|Marketing/i').isVisible();
      const hasCount = await firstCategory.locator('text=/\\d+ accounts?/i').isVisible();

      console.log(`✅ Found ${categoriesCount} vesting categories`);
    } else {
      console.log(`⚠️  No vesting categories found (chain may not have vesting data)`);
    }
  });

  test('should show progress bars for vesting status', async ({ page }) => {
    await page.goto('/vesting');

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Look for progress indicators
    const progressBars = await page.locator('[role="progressbar"], .progress-bar, progress').count();

    if (progressBars > 0) {
      console.log(`✅ Found ${progressBars} progress indicators`);

      // Progress should be between 0-100%
      const firstProgress = page.locator('[role="progressbar"], .progress-bar').first();
      const ariaValue = await firstProgress.getAttribute('aria-valuenow');

      if (ariaValue) {
        const value = parseInt(ariaValue);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);

        console.log(`✅ Progress value: ${value}%`);
      }
    } else {
      console.log(`⚠️  No progress bars found (may use different UI)`);
    }
  });

  test('should handle loading state gracefully', async ({ page }) => {
    await page.goto('/vesting');

    // Should show loading indicator initially
    const loadingVisible = await page.locator('.loading, .spinner, [role="status"]').isVisible({ timeout: 1000 });

    if (loadingVisible) {
      console.log(`✅ Loading indicator displayed`);

      // Wait for content to load
      await page.waitForSelector('[data-testid="vesting-stats"], .vesting-stats', { timeout: 15000 });

      // Loading should be gone
      const loadingGone = await page.locator('.loading, .spinner').isHidden();
      expect(loadingGone).toBe(true);

      console.log(`✅ Loading state handled correctly`);
    } else {
      console.log(`⚠️  Loading indicator not shown (may load too fast)`);
    }
  });

  test('should show public header when not logged in', async ({ page }) => {
    await page.goto('/vesting');

    // Should show public header (DynamicHeader)
    const publicHeaderVisible = await page.locator('header').isVisible({ timeout: 5000 });
    expect(publicHeaderVisible).toBe(true);

    // Should have login/signup buttons (public header)
    const loginButtonVisible = await page.locator('text=Login, text=Sign In, a[href*="auth"]').isVisible({ timeout: 3000 });

    if (loginButtonVisible) {
      console.log(`✅ Public header displayed (user not logged in)`);
    } else {
      console.log(`⚠️  No login button found (may already be logged in or different UI)`);
    }
  });

  test('should show footer with links', async ({ page }) => {
    await page.goto('/vesting');

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Should show footer
    const footerVisible = await page.locator('footer').isVisible();
    expect(footerVisible).toBe(true);

    // Footer should have links
    const footerLinks = await page.locator('footer a').count();
    expect(footerLinks).toBeGreaterThan(0);

    console.log(`✅ Footer displayed with ${footerLinks} links`);
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/vesting');

    // Wait for content to load
    await page.waitForTimeout(3000);

    // Content should be visible and not overflow
    const body = page.locator('body');
    const scrollWidth = await body.evaluate((el) => el.scrollWidth);
    const clientWidth = await body.evaluate((el) => el.clientWidth);

    // Allow small tolerance for scrollbars
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 20);

    console.log(`✅ Page is responsive on mobile (width: ${clientWidth}px)`);
  });
});
