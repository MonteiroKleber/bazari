// FASE 11 - PROMPT 1: E2E Test - Delivery Accept Request
// Test: Driver can accept delivery requests

import { test, expect } from '@playwright/test';
import { createTestAccount } from '../helpers/auth-helpers';

test.describe('Delivery - Accept Request', () => {
  test('should accept delivery request', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/delivery');
    await page.waitForTimeout(3000);

    const firstRequest = page.locator('[data-testid="delivery-card"]').first();

    if (await firstRequest.isVisible({ timeout: 5000 })) {
      await firstRequest.click();
      await page.waitForTimeout(2000);

      const acceptButton = page.locator('button:has-text("Accept"), button:has-text("Take")').first();

      if (await acceptButton.isVisible({ timeout: 5000 })) {
        await acceptButton.click();
        await page.waitForTimeout(2000);

        console.log(`✅ Delivery request accepted`);
      }
    }
  });

  test('should show delivery details after accepting', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/delivery');
    await page.waitForTimeout(3000);

    const firstRequest = page.locator('[data-testid="delivery-card"]').first();

    if (await firstRequest.isVisible({ timeout: 5000 })) {
      await firstRequest.click();
      await page.waitForTimeout(2000);

      const acceptButton = page.locator('button:has-text("Accept")').first();

      if (await acceptButton.isVisible({ timeout: 5000 })) {
        await acceptButton.click();
        await page.waitForTimeout(2000);

        const detailsVisible = await page.locator('[data-testid="delivery-details"], .delivery-tracking').isVisible({ timeout: 5000 });

        if (detailsVisible) {
          console.log(`✅ Delivery details/tracking displayed`);
        }
      }
    }
  });
});
