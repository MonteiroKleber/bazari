// FASE 11 - PROMPT 1: E2E Tests - Wallet Helpers
// Helper functions for wallet operations

import { Page } from '@playwright/test';

/**
 * Get wallet balance for the current user
 * @param page Playwright page instance
 * @returns Balance as string (e.g., "1000.00 ZARI")
 */
export async function getBalance(page: Page): Promise<string> {
  // Wait for balance to be visible (usually in header or wallet section)
  await page.waitForSelector('[data-testid="wallet-balance"]', { timeout: 10000 });

  const balance = await page.textContent('[data-testid="wallet-balance"]');
  return balance || '0';
}

/**
 * Send tokens to another address
 * @param page Playwright page instance
 * @param recipient Recipient address (handle or 0x...)
 * @param amount Amount to send (e.g., "10")
 */
export async function sendTokens(
  page: Page,
  recipient: string,
  amount: string
) {
  // Navigate to transfer page
  await page.goto('/app/wallet/transfer');

  // Wait for form
  await page.waitForSelector('input[name="recipient"]', { timeout: 10000 });

  // Fill form
  await page.fill('input[name="recipient"]', recipient);
  await page.fill('input[name="amount"]', amount);

  // Submit
  await page.click('button[type="submit"]');

  // Wait for success notification or redirect
  await page.waitForSelector('.success-notification, .toast-success', { timeout: 15000 });
}

/**
 * Wait for transaction to be confirmed on chain
 * @param page Playwright page instance
 * @param timeout Maximum wait time in ms (default 30s)
 */
export async function waitForTransaction(
  page: Page,
  timeout: number = 30000
): Promise<void> {
  // Wait for transaction success indicator
  await page.waitForSelector(
    '[data-testid="transaction-success"], .transaction-confirmed',
    { timeout }
  );
}

/**
 * Get wallet address for the current user
 * @param page Playwright page instance
 * @returns Wallet address (0x...)
 */
export async function getWalletAddress(page: Page): Promise<string> {
  // Open wallet menu or settings to see address
  await page.click('[aria-label="User menu"]');

  // Wait for address to be visible
  await page.waitForSelector('[data-testid="wallet-address"]', { timeout: 5000 });

  const address = await page.textContent('[data-testid="wallet-address"]');
  return address || '';
}

/**
 * Check if wallet has sufficient balance
 * @param page Playwright page instance
 * @param requiredAmount Minimum required balance
 * @returns true if balance >= requiredAmount
 */
export async function hasSufficientBalance(
  page: Page,
  requiredAmount: number
): Promise<boolean> {
  const balanceStr = await getBalance(page);

  // Extract numeric value (remove "ZARI" suffix and parse)
  const balance = parseFloat(balanceStr.replace(/[^\d.]/g, ''));

  return balance >= requiredAmount;
}
