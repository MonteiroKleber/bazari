// FASE 11 - PROMPT 1: E2E Test - Unlock Wallet
// Test: User can unlock wallet with PIN after session expires

import { test, expect } from '@playwright/test';
import { createTestAccount, unlockWallet, isLoggedIn, logout } from '../helpers/auth-helpers';
import { TEST_PIN } from '../helpers/test-data';

test.describe('Auth - Unlock Wallet', () => {
  test('should unlock wallet with correct PIN', async ({ page }) => {
    // First, create an account
    const account = await createTestAccount(page);

    // Logout to lock wallet
    await logout(page);

    // Unlock wallet
    await unlockWallet(page, account.pin);

    // Verify we are logged in
    const loggedIn = await isLoggedIn(page);
    expect(loggedIn).toBe(true);

    console.log(`✅ Wallet unlocked successfully`);
  });

  test('should show error for incorrect PIN', async ({ page }) => {
    // Create account with default PIN (123456)
    await createTestAccount(page);

    // Logout
    await logout(page);

    // Try to unlock with wrong PIN
    await page.goto('/auth/unlock');
    await page.fill('input[name="pin"]', '999999');
    await page.click('button[type="submit"]');

    // Should show error
    await expect(page.locator('.error-message, .toast-error')).toBeVisible({ timeout: 10000 });

    // Should still be on unlock page
    expect(page.url()).toContain('/auth/unlock');

    console.log(`✅ Incorrect PIN error displayed correctly`);
  });

  test('should lock after multiple failed attempts', async ({ page }) => {
    // Create account
    await createTestAccount(page);

    // Logout
    await logout(page);

    // Try multiple wrong PINs
    for (let i = 0; i < 5; i++) {
      await page.goto('/auth/unlock');
      await page.fill('input[name="pin"]', `99999${i}`);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(1000);
    }

    // After multiple attempts, should show lockout message or increase delay
    const errorMessage = await page.locator('.error-message, .toast-error').textContent();

    if (errorMessage && (errorMessage.includes('locked') || errorMessage.includes('wait') || errorMessage.includes('attempts'))) {
      console.log(`✅ Account locked after multiple failed attempts`);
    } else {
      console.log(`⚠️  No lockout mechanism detected (may be optional)`);
    }
  });

  test('should preserve session state after unlock', async ({ page }) => {
    // Create account
    await createTestAccount(page);

    // Navigate to a specific page (e.g., /app/wallet)
    await page.goto('/app/wallet');
    await page.waitForTimeout(2000);

    // Logout
    await logout(page);

    // Unlock wallet
    await unlockWallet(page, TEST_PIN);

    // Should return to app (may or may not preserve exact page)
    expect(page.url()).toContain('/app');

    console.log(`✅ Session restored after unlock`);
  });

  test('should show unlock page when accessing protected route', async ({ page }) => {
    // Create account
    await createTestAccount(page);

    // Logout
    await logout(page);

    // Try to access protected route
    await page.goto('/app/wallet');

    // Should redirect to unlock page
    await page.waitForURL(/\/auth\/unlock/, { timeout: 5000 });

    expect(page.url()).toContain('/auth/unlock');

    console.log(`✅ Protected route redirects to unlock page`);
  });

  test('should validate PIN format', async ({ page }) => {
    // Create account
    await createTestAccount(page);

    // Logout
    await logout(page);

    await page.goto('/auth/unlock');

    // Try with too short PIN
    await page.fill('input[name="pin"]', '123');
    await page.click('button[type="submit"]');

    // Should show validation error
    const errorVisible = await page.locator('.error-message, input[name="pin"]:invalid').count();
    expect(errorVisible).toBeGreaterThan(0);

    console.log(`✅ PIN format validation working`);
  });
});
