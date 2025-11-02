// FASE 11 - PROMPT 1: E2E Tests - Auth Helpers
// Helper functions for authentication flows

import { Page } from '@playwright/test';

/**
 * Create a new test account
 * @param page Playwright page instance
 * @param name Optional name (defaults to "Test User {timestamp}")
 * @param handle Optional handle (defaults to "testuser{timestamp}")
 * @returns Created account credentials
 */
export async function createTestAccount(
  page: Page,
  name?: string,
  handle?: string
) {
  const timestamp = Date.now();
  const accountName = name || `Test User ${timestamp}`;
  const accountHandle = handle || `testuser${timestamp}`;

  await page.goto('/auth/create');

  // Wait for form to be visible
  await page.waitForSelector('input[name="name"]', { timeout: 10000 });

  // Fill form
  await page.fill('input[name="name"]', accountName);
  await page.fill('input[name="handle"]', accountHandle);
  await page.fill('input[name="pin"]', '123456');
  await page.fill('input[name="pinConfirm"]', '123456');

  // Submit
  await page.click('button[type="submit"]');

  // Wait for redirect to app
  await page.waitForURL('/app', { timeout: 10000 });

  return {
    name: accountName,
    handle: accountHandle,
    pin: '123456',
  };
}

/**
 * Unlock wallet with PIN
 * @param page Playwright page instance
 * @param pin PIN code (defaults to "123456")
 */
export async function unlockWallet(page: Page, pin: string = '123456') {
  await page.goto('/auth/unlock');

  // Wait for PIN input
  await page.waitForSelector('input[name="pin"]', { timeout: 10000 });

  // Fill PIN
  await page.fill('input[name="pin"]', pin);

  // Submit
  await page.click('button[type="submit"]');

  // Wait for redirect to app
  await page.waitForURL('/app', { timeout: 10000 });
}

/**
 * Import account with seed phrase
 * @param page Playwright page instance
 * @param seedPhrase 12-word seed phrase
 * @param pin PIN code (defaults to "123456")
 */
export async function importAccount(
  page: Page,
  seedPhrase: string,
  pin: string = '123456'
) {
  await page.goto('/auth/import');

  // Wait for seed textarea
  await page.waitForSelector('textarea[name="seed"]', { timeout: 10000 });

  // Fill seed phrase
  await page.fill('textarea[name="seed"]', seedPhrase);

  // Fill PIN
  await page.fill('input[name="pin"]', pin);
  await page.fill('input[name="pinConfirm"]', pin);

  // Submit
  await page.click('button[type="submit"]');

  // Wait for redirect to app
  await page.waitForURL('/app', { timeout: 10000 });
}

/**
 * Logout from the app
 * @param page Playwright page instance
 */
export async function logout(page: Page) {
  // Click user menu
  await page.click('[aria-label="User menu"]');

  // Click logout
  await page.click('text=Logout');

  // Wait for redirect to home or auth
  await page.waitForURL(/\/(|auth)/, { timeout: 10000 });
}

/**
 * Check if user is logged in
 * @param page Playwright page instance
 * @returns true if logged in, false otherwise
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.waitForSelector('[aria-label="User menu"]', { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}
