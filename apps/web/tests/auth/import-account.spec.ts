// FASE 11 - PROMPT 1: E2E Test - Import Account
// Test: User can import existing account using seed phrase

import { test, expect } from '@playwright/test';
import { importAccount, isLoggedIn, logout } from '../helpers/auth-helpers';
import { TEST_SEEDS, TEST_PIN } from '../helpers/test-data';

test.describe('Auth - Import Account', () => {
  test('should import account with valid seed phrase', async ({ page }) => {
    // Import Alice's account
    await importAccount(page, TEST_SEEDS.alice, TEST_PIN);

    // Verify we are logged in
    const loggedIn = await isLoggedIn(page);
    expect(loggedIn).toBe(true);

    // Verify we are on the app page
    expect(page.url()).toContain('/app');

    console.log(`✅ Account imported successfully with seed phrase`);
  });

  test('should show error for invalid seed phrase', async ({ page }) => {
    const invalidSeed = 'invalid seed phrase with only eight words here now';

    await page.goto('/auth/import');

    await page.fill('textarea[name="seed"]', invalidSeed);
    await page.fill('input[name="pin"]', TEST_PIN);
    await page.fill('input[name="pinConfirm"]', TEST_PIN);
    await page.click('button[type="submit"]');

    // Should show error
    await expect(page.locator('.error-message, .toast-error')).toBeVisible({ timeout: 10000 });

    console.log(`✅ Invalid seed phrase error displayed correctly`);
  });

  test('should show error for mismatched PIN during import', async ({ page }) => {
    await page.goto('/auth/import');

    await page.fill('textarea[name="seed"]', TEST_SEEDS.bob);
    await page.fill('input[name="pin"]', '123456');
    await page.fill('input[name="pinConfirm"]', '654321');
    await page.click('button[type="submit"]');

    // Should show error
    await expect(page.locator('.error-message, .toast-error')).toBeVisible();

    console.log(`✅ PIN mismatch error displayed correctly during import`);
  });

  test('should import account and preserve balance', async ({ page }) => {
    // Import Alice's account (dev account with balance)
    await importAccount(page, TEST_SEEDS.alice, TEST_PIN);

    // Wait for balance to load
    await page.waitForSelector('[data-testid="wallet-balance"]', { timeout: 15000 });

    const balanceText = await page.textContent('[data-testid="wallet-balance"]');
    expect(balanceText).toBeTruthy();

    // Dev accounts should have balance > 0
    const balance = parseFloat(balanceText?.replace(/[^\d.]/g, '') || '0');
    expect(balance).toBeGreaterThan(0);

    console.log(`✅ Account imported with balance: ${balanceText}`);
  });

  test('should allow switching between accounts', async ({ page }) => {
    // Import first account
    await importAccount(page, TEST_SEEDS.alice, TEST_PIN);
    await page.waitForTimeout(2000);

    // Logout
    await logout(page);

    // Import second account
    await importAccount(page, TEST_SEEDS.bob, TEST_PIN);

    // Verify we are logged in with second account
    const loggedIn = await isLoggedIn(page);
    expect(loggedIn).toBe(true);

    console.log(`✅ Successfully switched between accounts`);
  });

  test('should validate seed phrase format', async ({ page }) => {
    await page.goto('/auth/import');

    // Try with too few words
    await page.fill('textarea[name="seed"]', 'only five words here');
    await page.fill('input[name="pin"]', TEST_PIN);
    await page.fill('input[name="pinConfirm"]', TEST_PIN);
    await page.click('button[type="submit"]');

    // Should show validation error
    const errorVisible = await page.locator('.error-message, .toast-error, textarea[name="seed"]:invalid').count();
    expect(errorVisible).toBeGreaterThan(0);

    console.log(`✅ Seed phrase format validation working`);
  });
});
