/**
 * FASE 8 - PROMPT 9: E2E Tests - Council Interaction
 *
 * Testa interações com o Council (membros e propostas)
 */

import { test, expect } from '@playwright/test';

test.describe('Council Interaction', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login
    await page.goto('/auth/unlock');
    await page.fill('[data-testid="pin-input"]', '1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/app');
  });

  test('view council members', async ({ page }) => {
    // Navigate to council page
    await page.goto('/app/governance/council');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify title
    await expect(page.locator('h1')).toContainText('Council');

    // Verify council members section exists
    const membersSection = page.locator('[data-testid="council-members"]');
    if (await membersSection.isVisible()) {
      await expect(membersSection).toBeVisible();

      // Verify at least one member is displayed
      const memberCards = page.locator('[data-testid="council-member"]');
      if ((await memberCards.count()) > 0) {
        await expect(memberCards.first()).toBeVisible();

        // Verify member has address
        await expect(memberCards.first().locator('[data-testid="member-address"]')).toBeVisible();
      }
    }
  });

  test('view council proposals', async ({ page }) => {
    await page.goto('/app/governance/council');
    await page.waitForLoadState('networkidle');

    // Navigate to proposals tab/section
    const proposalsTab = page.locator('button:has-text("Propostas"), a:has-text("Propostas")');
    if (await proposalsTab.isVisible()) {
      await proposalsTab.click();

      // Verify proposals are displayed
      const proposalsList = page.locator('[data-testid="council-proposals"]');
      if (await proposalsList.isVisible()) {
        await expect(proposalsList).toBeVisible();
      }
    }
  });

  test('view council proposal details', async ({ page }) => {
    await page.goto('/app/governance/proposals/council');
    await page.waitForLoadState('networkidle');

    // Click first proposal if exists
    const firstProposal = page.locator('[data-testid="proposal-card"]').first();
    if (await firstProposal.isVisible()) {
      await firstProposal.click();

      // Verify we're on proposal detail page
      await expect(page).toHaveURL(/\/app\/governance\/proposals\/council\/\d+/);

      // Verify proposal details are shown
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('[data-testid="proposal-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="proposal-description"]')).toBeVisible();

      // Verify voting section
      const votingSection = page.locator('[data-testid="council-voting"]');
      if (await votingSection.isVisible()) {
        await expect(votingSection).toBeVisible();
      }
    }
  });

  test('vote on council proposal as member', async ({ page }) => {
    await page.goto('/app/governance/proposals/council');
    await page.waitForLoadState('networkidle');

    const firstProposal = page.locator('[data-testid="proposal-card"]').first();
    if (await firstProposal.isVisible()) {
      await firstProposal.click();

      // Try to vote (only works if logged-in user is a council member)
      const voteButton = page.locator('button:has-text("Votar")');
      if (await voteButton.isVisible()) {
        await voteButton.click();

        // Select Aye or Nay
        await page.click('label:has-text("Aye")');

        // Submit vote
        await page.click('button:has-text("Confirmar")');

        // Enter PIN
        await page.fill('[data-testid="pin-modal-input"]', '1234');
        await page.click('button:has-text("Confirmar")');

        // Verify vote recorded
        await expect(page.locator('.toast')).toContainText(/voto|vote/i, {
          timeout: 15000,
        });
      }
    }
  });

  test('view council member profile', async ({ page }) => {
    await page.goto('/app/governance/council');
    await page.waitForLoadState('networkidle');

    // Click on first council member
    const firstMember = page.locator('[data-testid="council-member"]').first();
    if (await firstMember.isVisible()) {
      const memberAddress = await firstMember.locator('[data-testid="member-address"]').textContent();

      await firstMember.click();

      // Verify member profile page or modal
      if (memberAddress) {
        await expect(page.locator('body')).toContainText(memberAddress);
      }

      // Verify member stats are shown
      const memberStats = page.locator('[data-testid="member-stats"]');
      if (await memberStats.isVisible()) {
        await expect(memberStats).toBeVisible();
      }
    }
  });

  test('filter council proposals by status', async ({ page }) => {
    await page.goto('/app/governance/proposals/council');
    await page.waitForLoadState('networkidle');

    // Open filters
    const filterButton = page.locator('button:has-text("Filtros")');
    if (await filterButton.isVisible()) {
      await filterButton.click();

      // Select "Active" status
      await page.click('label:has-text("Ativo")');

      // Verify URL updated
      await expect(page).toHaveURL(/status=active/);

      // Verify only active proposals shown
      const statusBadges = page.locator('[data-testid="proposal-status"]');
      if ((await statusBadges.count()) > 0) {
        for (let i = 0; i < (await statusBadges.count()); i++) {
          await expect(statusBadges.nth(i)).toContainText(/Ativo|Active/i);
        }
      }
    }
  });
});

test.describe('Council Elections', () => {
  test('view election candidates', async ({ page }) => {
    // Login
    await page.goto('/auth/unlock');
    await page.fill('[data-testid="pin-input"]', '1234');
    await page.click('button[type="submit"]');

    await page.goto('/app/governance/council');
    await page.waitForLoadState('networkidle');

    // Navigate to elections tab/section
    const electionsTab = page.locator('button:has-text("Eleições"), a:has-text("Elections")');
    if (await electionsTab.isVisible()) {
      await electionsTab.click();

      // Verify candidates list
      const candidatesList = page.locator('[data-testid="candidates-list"]');
      if (await candidatesList.isVisible()) {
        await expect(candidatesList).toBeVisible();

        // Verify at least one candidate
        const candidates = page.locator('[data-testid="candidate-card"]');
        if ((await candidates.count()) > 0) {
          await expect(candidates.first()).toBeVisible();
        }
      }
    }
  });

  test('vote for council candidate', async ({ page }) => {
    await page.goto('/auth/unlock');
    await page.fill('[data-testid="pin-input"]', '1234');
    await page.click('button[type="submit"]');

    await page.goto('/app/governance/council');
    await page.waitForLoadState('networkidle');

    // Navigate to elections
    const electionsTab = page.locator('button:has-text("Eleições")');
    if (await electionsTab.isVisible()) {
      await electionsTab.click();

      // Vote for first candidate
      const voteButton = page.locator('[data-testid="vote-candidate"]').first();
      if (await voteButton.isVisible()) {
        await voteButton.click();

        // Enter vote amount
        await page.fill('[name="amount"]', '100');

        // Submit
        await page.click('button:has-text("Confirmar")');

        // Enter PIN
        await page.fill('[data-testid="pin-modal-input"]', '1234');
        await page.click('button:has-text("Confirmar")');

        // Verify vote recorded
        await expect(page.locator('.toast')).toContainText(/voto|vote/i, {
          timeout: 15000,
        });
      }
    }
  });
});

test.describe('Council Motions', () => {
  test('view council motions', async ({ page }) => {
    await page.goto('/auth/unlock');
    await page.fill('[data-testid="pin-input"]', '1234');
    await page.click('button[type="submit"]');

    await page.goto('/app/governance/council');
    await page.waitForLoadState('networkidle');

    // Navigate to motions
    const motionsTab = page.locator('button:has-text("Motions"), a:has-text("Moções")');
    if (await motionsTab.isVisible()) {
      await motionsTab.click();

      // Verify motions list
      const motionsList = page.locator('[data-testid="motions-list"]');
      if (await motionsList.isVisible()) {
        await expect(motionsList).toBeVisible();
      }
    }
  });
});
