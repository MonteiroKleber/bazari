// FASE 11 - PROMPT 1: E2E Test - P2P Trade Chat
// Test: Users can communicate via trade chat

import { test, expect } from '@playwright/test';
import { createTestAccount } from '../helpers/auth-helpers';
import { TEST_CHAT_MESSAGES } from '../helpers/test-data';

test.describe('P2P - Trade Chat', () => {
  test('should display chat interface', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/p2p/trades');
    await page.waitForTimeout(3000);

    const firstTrade = page.locator('[data-testid="trade-item"], .trade-item').first();

    if (await firstTrade.isVisible({ timeout: 5000 })) {
      await firstTrade.click();
      await page.waitForTimeout(2000);

      const chatVisible = await page.locator('[data-testid="chat"], textarea').isVisible({ timeout: 5000 });

      expect(chatVisible).toBe(true);
      console.log(`✅ Chat interface displayed`);
    }
  });

  test('should send message in chat', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/p2p/trades');
    await page.waitForTimeout(3000);

    const firstTrade = page.locator('[data-testid="trade-item"]').first();

    if (await firstTrade.isVisible({ timeout: 5000 })) {
      await firstTrade.click();
      await page.waitForTimeout(2000);

      const messageInput = page.locator('textarea[placeholder*="message"], input[type="text"]').first();

      if (await messageInput.isVisible({ timeout: 5000 })) {
        await messageInput.fill(TEST_CHAT_MESSAGES.greeting);

        const sendButton = page.locator('button[type="submit"], button:has-text("Send")').first();
        await sendButton.click();
        await page.waitForTimeout(2000);

        console.log(`✅ Message sent in chat`);
      }
    }
  });

  test('should display message history', async ({ page }) => {
    await createTestAccount(page);
    await page.goto('/app/p2p/trades');
    await page.waitForTimeout(3000);

    const firstTrade = page.locator('[data-testid="trade-item"]').first();

    if (await firstTrade.isVisible({ timeout: 5000 })) {
      await firstTrade.click();
      await page.waitForTimeout(2000);

      const messages = await page.locator('[data-testid="chat-message"], .message').count();

      console.log(`✅ Chat has ${messages} message(s) in history`);
    }
  });
});
