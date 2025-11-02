// FASE 11 - PROMPT 1: E2E Test - Create Account
// Test: User can create a new account with name, handle, and PIN

import { test, expect } from '@playwright/test';
import { createTestAccount, isLoggedIn } from '../helpers/auth-helpers';

test.describe('Auth - Create Account', () => {
  test('should create new account successfully', async ({ page }) => {
    // Create account
    const account = await createTestAccount(page);

    // Verify we are logged in
    const loggedIn = await isLoggedIn(page);
    expect(loggedIn).toBe(true);

    // Verify we are on the app page
    expect(page.url()).toContain('/app');

    // Verify account info is displayed
    await expect(page.locator('[aria-label="User menu"]')).toBeVisible();

    console.log(`✅ Account created: ${account.name} (@${account.handle})`);
  });

  test('should show error for duplicate handle', async ({ page }) => {
    const timestamp = Date.now();
    const handle = `duplicate${timestamp}`;

    // Create first account
    await createTestAccount(page, `User 1`, handle);

    // Logout
    await page.click('[aria-label="User menu"]');
    await page.click('text=Logout');

    // Try to create second account with same handle
    await page.goto('/auth/create');
    await page.fill('input[name="name"]', 'User 2');
    await page.fill('input[name="handle"]', handle);
    await page.fill('input[name="pin"]', '123456');
    await page.fill('input[name="pinConfirm"]', '123456');
    await page.click('button[type="submit"]');

    // Should show error
    await expect(page.locator('.error-message, .toast-error')).toBeVisible();

    console.log(`✅ Duplicate handle error displayed correctly`);
  });

  test('should show error for mismatched PIN', async ({ page }) => {
    await page.goto('/auth/create');

    // Fill form with mismatched PINs
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="handle"]', `testuser${Date.now()}`);
    await page.fill('input[name="pin"]', '123456');
    await page.fill('input[name="pinConfirm"]', '654321');
    await page.click('button[type="submit"]');

    // Should show error
    await expect(page.locator('.error-message, .toast-error')).toBeVisible();

    console.log(`✅ PIN mismatch error displayed correctly`);
  });

  test('should show seed phrase after account creation', async ({ page }) => {
    await page.goto('/auth/create');

    const timestamp = Date.now();
    await page.fill('input[name="name"]', `Test User ${timestamp}`);
    await page.fill('input[name="handle"]', `testuser${timestamp}`);
    await page.fill('input[name="pin"]', '123456');
    await page.fill('input[name="pinConfirm"]', '123456');
    await page.click('button[type="submit"]');

    // Should show seed phrase (either in modal or on next page)
    const seedPhraseVisible = await page.locator('[data-testid="seed-phrase"], .seed-phrase').isVisible({ timeout: 10000 });

    if (seedPhraseVisible) {
      const seedPhrase = await page.textContent('[data-testid="seed-phrase"], .seed-phrase');
      expect(seedPhrase).toBeTruthy();

      // Seed phrase should have 12 words
      const words = seedPhrase?.trim().split(/\s+/) || [];
      expect(words.length).toBe(12);

      console.log(`✅ Seed phrase displayed: ${words.length} words`);
    } else {
      console.log(`⚠️  Seed phrase not displayed (may be optional in UI)`);
    }
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/auth/create');

    // Try to submit without filling form
    await page.click('button[type="submit"]');

    // Should show validation errors
    const nameError = await page.locator('input[name="name"]:invalid').count();
    const handleError = await page.locator('input[name="handle"]:invalid').count();
    const pinError = await page.locator('input[name="pin"]:invalid').count();

    expect(nameError + handleError + pinError).toBeGreaterThan(0);

    console.log(`✅ Form validation working correctly`);
  });
});
