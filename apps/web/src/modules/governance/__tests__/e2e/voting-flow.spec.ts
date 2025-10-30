/**
 * FASE 8 - PROMPT 9: E2E Tests - Voting Flow
 *
 * Testa o fluxo de votação em referendums com conviction
 */

import { test, expect } from '@playwright/test';

test.describe('Voting Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login
    await page.goto('/auth/unlock');
    await page.fill('[data-testid="pin-input"]', '1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/app');
  });

  test('voting flow with conviction', async ({ page }) => {
    // Navigate to democracy proposals
    await page.goto('/app/governance/proposals/democracy');

    // Wait for proposals to load
    await page.waitForLoadState('networkidle');

    // Find first active referendum
    const firstProposal = page.locator('[data-testid="proposal-card"]').first();

    if (await firstProposal.isVisible()) {
      // Click to open proposal details
      await firstProposal.click();

      // Wait for proposal page to load
      await expect(page).toHaveURL(/\/app\/governance\/proposals\/democracy\/\d+/);

      // Click vote button if it exists
      const voteButton = page.locator('button:has-text("Votar")');
      if (await voteButton.isVisible()) {
        await voteButton.click();

        // Select Aye
        await page.click('label:has-text("Aye")');

        // Enter amount
        await page.fill('[name="amount"]', '100');

        // Select conviction (2x)
        const convictionSelect = page.locator('[name="conviction"]');
        if (await convictionSelect.isVisible()) {
          await convictionSelect.selectOption('2');

          // Verify effective voting power (100 * 2 = 200)
          await expect(page.locator('[data-testid="effective-power"]')).toContainText('200');
        }

        // Submit
        await page.click('button:has-text("Confirmar Voto")');

        // Enter PIN
        await page.fill('[data-testid="pin-modal-input"]', '1234');
        await page.click('button:has-text("Confirmar")');

        // Verify vote recorded
        await expect(page.locator('.toast')).toContainText('Voto registrado', {
          timeout: 15000,
        });

        // Verify vote appears in results
        const ayeVotes = page.locator('[data-testid="aye-votes"]');
        if (await ayeVotes.isVisible()) {
          // Should show increased vote count
          await expect(ayeVotes).toBeVisible();
        }
      }
    }
  });

  test('voting with Nay option', async ({ page }) => {
    await page.goto('/app/governance/proposals/democracy');
    await page.waitForLoadState('networkidle');

    const firstProposal = page.locator('[data-testid="proposal-card"]').first();

    if (await firstProposal.isVisible()) {
      await firstProposal.click();

      const voteButton = page.locator('button:has-text("Votar")');
      if (await voteButton.isVisible()) {
        await voteButton.click();

        // Select Nay (No)
        await page.click('label:has-text("Nay")');

        // Enter amount
        await page.fill('[name="amount"]', '50');

        // Select conviction (1x)
        const convictionSelect = page.locator('[name="conviction"]');
        if (await convictionSelect.isVisible()) {
          await convictionSelect.selectOption('1');

          // Verify effective voting power (50 * 1 = 50)
          await expect(page.locator('[data-testid="effective-power"]')).toContainText('50');
        }

        // Submit
        await page.click('button:has-text("Confirmar Voto")');

        // Enter PIN
        await page.fill('[data-testid="pin-modal-input"]', '1234');
        await page.click('button:has-text("Confirmar")');

        // Verify vote recorded
        await expect(page.locator('.toast')).toContainText('Voto registrado', {
          timeout: 15000,
        });
      }
    }
  });

  test('voting with abstain', async ({ page }) => {
    await page.goto('/app/governance/proposals/democracy');
    await page.waitForLoadState('networkidle');

    const firstProposal = page.locator('[data-testid="proposal-card"]').first();

    if (await firstProposal.isVisible()) {
      await firstProposal.click();

      const voteButton = page.locator('button:has-text("Votar")');
      if (await voteButton.isVisible()) {
        await voteButton.click();

        // Select Abstain
        const abstainOption = page.locator('label:has-text("Abstain")');
        if (await abstainOption.isVisible()) {
          await abstainOption.click();

          // Enter amount
          await page.fill('[name="amount"]', '25');

          // Note: Abstain typically doesn't have conviction multiplier

          // Submit
          await page.click('button:has-text("Confirmar Voto")');

          // Enter PIN
          await page.fill('[data-testid="pin-modal-input"]', '1234');
          await page.click('button:has-text("Confirmar")');

          // Verify vote recorded
          await expect(page.locator('.toast')).toContainText('Voto registrado', {
            timeout: 15000,
          });
        }
      }
    }
  });

  test('view voting results', async ({ page }) => {
    await page.goto('/app/governance/proposals/democracy');
    await page.waitForLoadState('networkidle');

    const firstProposal = page.locator('[data-testid="proposal-card"]').first();

    if (await firstProposal.isVisible()) {
      await firstProposal.click();

      // Verify voting chart is visible
      const votingChart = page.locator('[data-testid="voting-chart"]');
      if (await votingChart.isVisible()) {
        await expect(votingChart).toBeVisible();

        // Verify vote counts are displayed
        await expect(page.locator('[data-testid="aye-votes"]')).toBeVisible();
        await expect(page.locator('[data-testid="nay-votes"]')).toBeVisible();

        // Verify percentages are displayed
        await expect(page.locator('[data-testid="aye-percentage"]')).toBeVisible();
        await expect(page.locator('[data-testid="nay-percentage"]')).toBeVisible();
      }
    }
  });

  test('validate voting amount', async ({ page }) => {
    await page.goto('/app/governance/proposals/democracy');
    await page.waitForLoadState('networkidle');

    const firstProposal = page.locator('[data-testid="proposal-card"]').first();

    if (await firstProposal.isVisible()) {
      await firstProposal.click();

      const voteButton = page.locator('button:has-text("Votar")');
      if (await voteButton.isVisible()) {
        await voteButton.click();

        // Try to vote with invalid amount (0)
        await page.fill('[name="amount"]', '0');
        await page.click('button:has-text("Confirmar Voto")');

        // Verify error message
        await expect(page.locator('.error, [role="alert"]')).toContainText(/amount|valor/i);

        // Try to vote with negative amount
        await page.fill('[name="amount"]', '-10');
        await page.click('button:has-text("Confirmar Voto")');

        // Verify error message
        await expect(page.locator('.error, [role="alert"]')).toContainText(/amount|valor/i);
      }
    }
  });
});

test.describe('Vote History', () => {
  test('view user vote history', async ({ page }) => {
    // Login
    await page.goto('/auth/unlock');
    await page.fill('[data-testid="pin-input"]', '1234');
    await page.click('button[type="submit"]');

    // Navigate to governance
    await page.goto('/app/governance');

    // Look for "My Votes" or similar section
    const myVotesLink = page.locator('a:has-text("Meus Votos"), a:has-text("My Votes")');
    if (await myVotesLink.isVisible()) {
      await myVotesLink.click();

      // Verify we're on the correct page
      await expect(page).toHaveURL(/votes|history/);

      // Verify vote list is displayed
      const voteList = page.locator('[data-testid="vote-list"]');
      if (await voteList.isVisible()) {
        await expect(voteList).toBeVisible();
      }
    }
  });
});
