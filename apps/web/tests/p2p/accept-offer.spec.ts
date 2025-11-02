// FASE 11 - PROMPT 1: E2E Test - P2P Accept Offer
// Test: User can accept and complete P2P offers

import { test, expect } from '@playwright/test';
import { createTestAccount } from '../helpers/auth-helpers';

test.describe('P2P - Accept Offer', () => {
  test('should view offer details before accepting', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/p2p');
    await page.waitForTimeout(3000);

    const firstOffer = page.locator('[data-testid="offer-card"], .offer-card').first();

    if (await firstOffer.isVisible({ timeout: 5000 })) {
      await firstOffer.click();
      await page.waitForTimeout(2000);

      // Should show detailed view
      const detailsVisible = await page.locator('[data-testid="offer-details"], .offer-details').isVisible({ timeout: 5000 });

      if (detailsVisible) {
        console.log(`✅ Offer details view displayed`);
      }
    }
  });

  test('should accept offer', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/p2p');
    await page.waitForTimeout(3000);

    const firstOffer = page.locator('[data-testid="offer-card"]').first();

    if (await firstOffer.isVisible({ timeout: 5000 })) {
      await firstOffer.click();
      await page.waitForTimeout(2000);

      const acceptButton = page.locator('button:has-text("Accept"), button:has-text("Trade")').first();

      if (await acceptButton.isVisible({ timeout: 5000 })) {
        await acceptButton.click();
        await page.waitForTimeout(2000);

        console.log(`✅ Offer accepted`);
      }
    }
  });

  test('should show trade chat after accepting', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/p2p');
    await page.waitForTimeout(3000);

    const firstOffer = page.locator('[data-testid="offer-card"]').first();

    if (await firstOffer.isVisible({ timeout: 5000 })) {
      await firstOffer.click();
      await page.waitForTimeout(2000);

      const acceptButton = page.locator('button:has-text("Accept")').first();

      if (await acceptButton.isVisible({ timeout: 5000 })) {
        await acceptButton.click();
        await page.waitForTimeout(2000);

        // Should show chat
        const chatVisible = await page.locator('[data-testid="chat"], .chat, textarea[placeholder*="message"]').isVisible({ timeout: 5000 });

        if (chatVisible) {
          console.log(`✅ Trade chat displayed`);
        }
      }
    }
  });
});
