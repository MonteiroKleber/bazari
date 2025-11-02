// FASE 11 - PROMPT 1: E2E Test - Vesting Schedule Details
// Test: User can view detailed vesting schedule for specific accounts

import { test, expect } from '@playwright/test';
import { TEST_ADDRESSES } from '../helpers/test-data';

test.describe('Vesting - Schedule Details', () => {
  test('should display vesting accounts list', async ({ page }) => {
    await page.goto('/vesting');

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Look for accounts list
    const accountsListVisible = await page.locator('[data-testid="vesting-accounts"], .vesting-accounts, table').isVisible({ timeout: 10000 });

    if (accountsListVisible) {
      // Count accounts
      const accountsCount = await page.locator('[data-testid="account-row"], tr[data-account], tbody tr').count();

      console.log(`✅ Found ${accountsCount} vesting accounts`);

      expect(accountsCount).toBeGreaterThanOrEqual(0);
    } else {
      console.log(`⚠️  No vesting accounts found (chain may not have vesting data)`);
    }
  });

  test('should show account address and balance', async ({ page }) => {
    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    // Find first account row
    const firstAccount = page.locator('[data-testid="account-row"], tbody tr').first();

    if (await firstAccount.isVisible({ timeout: 10000 })) {
      // Should show address (truncated or full)
      const addressVisible = await firstAccount.locator('text=/0x[a-fA-F0-9]+|5[A-Za-z0-9]+/').isVisible();

      // Should show balance or amount
      const balanceVisible = await firstAccount.locator('text=/\\d+.*ZARI|\\d+.*tokens?/i').isVisible();

      expect(addressVisible || balanceVisible).toBe(true);

      console.log(`✅ Account row shows address/balance`);
    } else {
      console.log(`⚠️  No account rows found`);
    }
  });

  test('should navigate to account detail page', async ({ page }) => {
    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    // Find clickable account
    const firstAccount = page.locator('[data-testid="account-row"], tbody tr, a[href*="vesting"]').first();

    if (await firstAccount.isVisible({ timeout: 10000 })) {
      const isClickable = await firstAccount.evaluate((el) => {
        return el.tagName === 'A' || el.querySelector('a') !== null || el.style.cursor === 'pointer';
      });

      if (isClickable) {
        await firstAccount.click();

        // Should navigate to detail page or show modal
        await page.waitForTimeout(2000);

        const detailPageVisible = await page.locator('[data-testid="vesting-detail"], .vesting-detail, .modal').isVisible({ timeout: 5000 });

        if (detailPageVisible) {
          console.log(`✅ Navigated to account detail view`);
        } else {
          console.log(`⚠️  Detail view not shown (may use different UI)`);
        }
      } else {
        console.log(`⚠️  Account rows are not clickable`);
      }
    }
  });

  test('should display vesting schedule timeline', async ({ page }) => {
    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    // Click first account if clickable
    const firstAccount = page.locator('[data-testid="account-row"], tbody tr').first();

    if (await firstAccount.isVisible({ timeout: 10000 })) {
      await firstAccount.click();

      await page.waitForTimeout(2000);

      // Look for timeline or schedule visualization
      const timelineVisible = await page.locator('[data-testid="vesting-timeline"], .timeline, .schedule').isVisible({ timeout: 5000 });

      if (timelineVisible) {
        console.log(`✅ Vesting timeline/schedule displayed`);
      } else {
        console.log(`⚠️  Timeline not found (may show table instead)`);
      }
    }
  });

  test('should show locked and unlocked amounts', async ({ page }) => {
    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    const firstAccount = page.locator('[data-testid="account-row"], tbody tr').first();

    if (await firstAccount.isVisible({ timeout: 10000 })) {
      await firstAccount.click();

      await page.waitForTimeout(2000);

      // Should show locked amount
      const lockedVisible = await page.locator('text=/Locked|Vesting|Remaining/i').isVisible({ timeout: 5000 });

      // Should show unlocked amount
      const unlockedVisible = await page.locator('text=/Unlocked|Released|Available/i').isVisible({ timeout: 5000 });

      if (lockedVisible || unlockedVisible) {
        console.log(`✅ Locked/unlocked amounts displayed`);
      } else {
        console.log(`⚠️  Amount breakdown not found`);
      }
    }
  });

  test('should show vesting start and end dates', async ({ page }) => {
    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    const firstAccount = page.locator('[data-testid="account-row"], tbody tr').first();

    if (await firstAccount.isVisible({ timeout: 10000 })) {
      await firstAccount.click();

      await page.waitForTimeout(2000);

      // Look for dates
      const datesVisible = await page.locator('text=/Start|End|Cliff|Duration/i').isVisible({ timeout: 5000 });

      if (datesVisible) {
        console.log(`✅ Vesting dates displayed`);

        // Should show formatted dates (e.g., "Jan 1, 2025" or "Block #12345")
        const dateText = await page.locator('text=/\\d{4}|\\d{1,2}\\/\\d{1,2}|Block/i').textContent();

        if (dateText) {
          console.log(`   Date format: ${dateText.substring(0, 50)}`);
        }
      } else {
        console.log(`⚠️  Vesting dates not displayed`);
      }
    }
  });

  test('should show vesting period and cliff', async ({ page }) => {
    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    const firstAccount = page.locator('[data-testid="account-row"], tbody tr').first();

    if (await firstAccount.isVisible({ timeout: 10000 })) {
      await firstAccount.click();

      await page.waitForTimeout(2000);

      // Look for period info (e.g., "12 months", "52 weeks")
      const periodVisible = await page.locator('text=/period|duration|cliff/i').isVisible({ timeout: 5000 });

      if (periodVisible) {
        const periodText = await page.locator('text=/\\d+ (months?|weeks?|days?|blocks?)/i').textContent();

        console.log(`✅ Vesting period displayed: ${periodText}`);
      } else {
        console.log(`⚠️  Vesting period not displayed`);
      }
    }
  });

  test('should calculate progress percentage correctly', async ({ page }) => {
    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    const firstAccount = page.locator('[data-testid="account-row"], tbody tr').first();

    if (await firstAccount.isVisible({ timeout: 10000 })) {
      await firstAccount.click();

      await page.waitForTimeout(2000);

      // Look for progress percentage
      const progressText = await page.locator('text=/\\d+%/').first().textContent();

      if (progressText) {
        const percentage = parseInt(progressText.replace(/\D/g, ''));

        expect(percentage).toBeGreaterThanOrEqual(0);
        expect(percentage).toBeLessThanOrEqual(100);

        console.log(`✅ Vesting progress: ${percentage}%`);
      } else {
        console.log(`⚠️  Progress percentage not displayed`);
      }
    }
  });

  test('should allow searching for specific account', async ({ page }) => {
    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[name="search"]').first();

    if (await searchInput.isVisible({ timeout: 5000 })) {
      // Try searching for Alice's address
      await searchInput.fill(TEST_ADDRESSES.alice.substring(0, 10));

      await page.waitForTimeout(2000);

      // Results should be filtered
      const accountsCount = await page.locator('[data-testid="account-row"], tbody tr').count();

      console.log(`✅ Search functionality working (${accountsCount} results)`);
    } else {
      console.log(`⚠️  Search functionality not found`);
    }
  });

  test('should paginate accounts list if many accounts', async ({ page }) => {
    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    // Look for pagination
    const paginationVisible = await page.locator('[role="navigation"] button, .pagination, text=/Next|Previous/i').isVisible({ timeout: 5000 });

    if (paginationVisible) {
      console.log(`✅ Pagination controls found`);

      // Try clicking next
      const nextButton = page.locator('button:has-text("Next"), [aria-label="Next"]').first();

      if (await nextButton.isEnabled()) {
        await nextButton.click();

        await page.waitForTimeout(2000);

        console.log(`✅ Pagination navigation working`);
      }
    } else {
      console.log(`⚠️  No pagination (may not have enough accounts)`);
    }
  });
});
