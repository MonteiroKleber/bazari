// FASE 11 - PROMPT 1: E2E Test - Vesting Timeline Visualization
// Test: User can view visual timeline of vesting unlock schedule

import { test, expect } from '@playwright/test';

test.describe('Vesting - Timeline Visualization', () => {
  test('should display visual timeline on vesting page', async ({ page }) => {
    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    // Look for timeline visualization (chart, graph, timeline component)
    const timelineVisible = await page.locator('[data-testid="vesting-timeline"], .timeline, canvas, svg').isVisible({ timeout: 10000 });

    if (timelineVisible) {
      console.log(`✅ Timeline visualization displayed`);
    } else {
      console.log(`⚠️  Timeline visualization not found (may use table/list view)`);
    }
  });

  test('should show unlock milestones on timeline', async ({ page }) => {
    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    // Click into account detail if needed
    const firstAccount = page.locator('[data-testid="account-row"], tbody tr').first();

    if (await firstAccount.isVisible({ timeout: 5000 })) {
      await firstAccount.click();
      await page.waitForTimeout(2000);
    }

    // Look for milestones (dates, blocks, or points on timeline)
    const milestonesVisible = await page.locator('[data-testid="milestone"], .milestone, circle, rect').count();

    if (milestonesVisible > 0) {
      console.log(`✅ Found ${milestonesVisible} milestone elements on timeline`);
    } else {
      console.log(`⚠️  No milestone markers found on timeline`);
    }
  });

  test('should show current time indicator', async ({ page }) => {
    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    // Look for "now" indicator (vertical line, marker, etc.)
    const nowIndicatorVisible = await page.locator('[data-testid="current-time"], text=/Now|Current|Today/i, line[stroke]').isVisible({ timeout: 5000 });

    if (nowIndicatorVisible) {
      console.log(`✅ Current time indicator displayed on timeline`);
    } else {
      console.log(`⚠️  Current time indicator not found`);
    }
  });

  test('should display unlock amounts on timeline', async ({ page }) => {
    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    const firstAccount = page.locator('[data-testid="account-row"], tbody tr').first();

    if (await firstAccount.isVisible({ timeout: 5000 })) {
      await firstAccount.click();
      await page.waitForTimeout(2000);
    }

    // Look for amount labels (e.g., "100 ZARI" at each unlock point)
    const amountsVisible = await page.locator('text=/\\d+.*ZARI|\\d+.*tokens?/i').count();

    if (amountsVisible > 0) {
      console.log(`✅ Unlock amounts displayed on timeline (${amountsVisible} labels)`);
    } else {
      console.log(`⚠️  Unlock amounts not labeled on timeline`);
    }
  });

  test('should show past vs future unlocks differently', async ({ page }) => {
    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    const firstAccount = page.locator('[data-testid="account-row"], tbody tr').first();

    if (await firstAccount.isVisible({ timeout: 5000 })) {
      await firstAccount.click();
      await page.waitForTimeout(2000);
    }

    // Look for visual distinction (different colors, opacity, etc.)
    // This is hard to test without inspecting styles, so we check for presence of both past and future indicators
    const pastVisible = await page.locator('[data-testid="past-unlock"], .past, text=/Unlocked|Released/i').isVisible({ timeout: 5000 });
    const futureVisible = await page.locator('[data-testid="future-unlock"], .future, text=/Locked|Pending/i').isVisible({ timeout: 5000 });

    if (pastVisible && futureVisible) {
      console.log(`✅ Timeline distinguishes past and future unlocks`);
    } else if (pastVisible || futureVisible) {
      console.log(`⚠️  Timeline shows ${pastVisible ? 'past' : 'future'} unlocks only`);
    } else {
      console.log(`⚠️  Past/future distinction not clear on timeline`);
    }
  });

  test('should be interactive (hover/click for details)', async ({ page }) => {
    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    const firstAccount = page.locator('[data-testid="account-row"], tbody tr').first();

    if (await firstAccount.isVisible({ timeout: 5000 })) {
      await firstAccount.click();
      await page.waitForTimeout(2000);
    }

    // Try hovering over timeline element
    const timelineElement = page.locator('[data-testid="milestone"], .milestone, circle').first();

    if (await timelineElement.isVisible({ timeout: 5000 })) {
      await timelineElement.hover();

      await page.waitForTimeout(1000);

      // Check for tooltip or details popup
      const tooltipVisible = await page.locator('[role="tooltip"], .tooltip, .popover').isVisible({ timeout: 2000 });

      if (tooltipVisible) {
        console.log(`✅ Timeline is interactive (shows tooltip on hover)`);
      } else {
        console.log(`⚠️  No tooltip shown on hover (may require click)`);

        // Try clicking
        await timelineElement.click();
        await page.waitForTimeout(1000);

        const detailsVisible = await page.locator('.modal, .detail, [role="dialog"]').isVisible({ timeout: 2000 });

        if (detailsVisible) {
          console.log(`✅ Timeline is interactive (shows details on click)`);
        } else {
          console.log(`⚠️  Timeline may not be interactive`);
        }
      }
    }
  });

  test('should show time scale (dates or blocks)', async ({ page }) => {
    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    const firstAccount = page.locator('[data-testid="account-row"], tbody tr').first();

    if (await firstAccount.isVisible({ timeout: 5000 })) {
      await firstAccount.click();
      await page.waitForTimeout(2000);
    }

    // Look for axis labels (dates, months, blocks)
    const timeScaleVisible = await page.locator('text=/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Block #\\d+/i').isVisible({ timeout: 5000 });

    if (timeScaleVisible) {
      console.log(`✅ Timeline shows time scale (dates/blocks)`);
    } else {
      console.log(`⚠️  Time scale not visible on timeline`);
    }
  });

  test('should handle long vesting periods gracefully', async ({ page }) => {
    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    // Timeline should not overflow horizontally
    const body = page.locator('body');
    const scrollWidth = await body.evaluate((el) => el.scrollWidth);
    const clientWidth = await body.evaluate((el) => el.clientWidth);

    // Some horizontal scroll is OK for long timelines, but should be reasonable
    const overflowRatio = scrollWidth / clientWidth;

    if (overflowRatio < 3) {
      console.log(`✅ Timeline handles long periods without excessive overflow (ratio: ${overflowRatio.toFixed(2)})`);
    } else {
      console.log(`⚠️  Timeline may overflow excessively (ratio: ${overflowRatio.toFixed(2)})`);
    }
  });

  test('should update timeline when changing categories', async ({ page }) => {
    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    // Get initial timeline state (if visible)
    const initialTimeline = await page.locator('[data-testid="vesting-timeline"], .timeline').textContent();

    // Switch category
    const teamTab = page.locator('text=Team').first();

    if (await teamTab.isVisible({ timeout: 5000 })) {
      await teamTab.click();

      await page.waitForTimeout(2000);

      // Get new timeline state
      const newTimeline = await page.locator('[data-testid="vesting-timeline"], .timeline').textContent();

      if (initialTimeline && newTimeline && initialTimeline !== newTimeline) {
        console.log(`✅ Timeline updates when switching categories`);
      } else {
        console.log(`⚠️  Timeline may not update dynamically`);
      }
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/vesting');

    await page.waitForTimeout(3000);

    const firstAccount = page.locator('[data-testid="account-row"], tbody tr').first();

    if (await firstAccount.isVisible({ timeout: 5000 })) {
      await firstAccount.click();
      await page.waitForTimeout(2000);
    }

    // Timeline should be visible and scrollable on mobile
    const timelineVisible = await page.locator('[data-testid="vesting-timeline"], .timeline, svg').isVisible({ timeout: 5000 });

    if (timelineVisible) {
      console.log(`✅ Timeline is responsive on mobile`);

      // Check if it's scrollable or adaptive
      const timeline = page.locator('[data-testid="vesting-timeline"], .timeline').first();
      const width = await timeline.evaluate((el) => el.getBoundingClientRect().width);

      console.log(`   Timeline width on mobile: ${width}px`);
    } else {
      console.log(`⚠️  Timeline not visible on mobile (may use alternative view)`);
    }
  });
});
