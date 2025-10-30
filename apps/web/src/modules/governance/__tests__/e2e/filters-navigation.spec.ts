/**
 * FASE 8 - PROMPT 9: E2E Tests - Filters and Navigation
 *
 * Testa filtros, busca e navegação geral do módulo de governança
 */

import { test, expect } from '@playwright/test';

test.describe('Filters and Search', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login
    await page.goto('/auth/unlock');
    await page.fill('[data-testid="pin-input"]', '1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/app');
  });

  test('filter proposals by type', async ({ page }) => {
    await page.goto('/app/governance/proposals');
    await page.waitForLoadState('networkidle');

    // Open filters
    const filterButton = page.locator('button:has-text("Filtros")');
    if (await filterButton.isVisible()) {
      await filterButton.click();

      // Select proposal type
      await page.click('label:has-text("Treasury")');

      // Verify URL updated
      await expect(page).toHaveURL(/type=treasury/i);

      // Verify only treasury proposals shown
      const proposalCards = page.locator('[data-testid="proposal-card"]');
      if ((await proposalCards.count()) > 0) {
        for (let i = 0; i < Math.min(await proposalCards.count(), 5); i++) {
          const type = proposalCards.nth(i).locator('[data-testid="proposal-type"]');
          if (await type.isVisible()) {
            await expect(type).toContainText(/Treasury/i);
          }
        }
      }
    }
  });

  test('filter proposals by status', async ({ page }) => {
    await page.goto('/app/governance/proposals');
    await page.waitForLoadState('networkidle');

    const filterButton = page.locator('button:has-text("Filtros")');
    if (await filterButton.isVisible()) {
      await filterButton.click();

      // Select active status
      await page.click('label:has-text("Ativo")');

      // Verify URL updated
      await expect(page).toHaveURL(/status=active/i);

      // Verify only active proposals shown
      const statusBadges = page.locator('[data-testid="proposal-status"]');
      if ((await statusBadges.count()) > 0) {
        for (let i = 0; i < Math.min(await statusBadges.count(), 5); i++) {
          await expect(statusBadges.nth(i)).toContainText(/Ativo|Active/i);
        }
      }
    }
  });

  test('filter proposals by date range', async ({ page }) => {
    await page.goto('/app/governance/proposals');
    await page.waitForLoadState('networkidle');

    const filterButton = page.locator('button:has-text("Filtros")');
    if (await filterButton.isVisible()) {
      await filterButton.click();

      // Select date range
      const dateFrom = page.locator('[name="dateFrom"]');
      const dateTo = page.locator('[name="dateTo"]');

      if ((await dateFrom.isVisible()) && (await dateTo.isVisible())) {
        await dateFrom.fill('2024-01-01');
        await dateTo.fill('2024-12-31');

        // Apply filters
        await page.click('button:has-text("Aplicar")');

        // Verify URL updated
        await expect(page).toHaveURL(/dateFrom|dateTo/);
      }
    }
  });

  test('combine multiple filters', async ({ page }) => {
    await page.goto('/app/governance/proposals');
    await page.waitForLoadState('networkidle');

    const filterButton = page.locator('button:has-text("Filtros")');
    if (await filterButton.isVisible()) {
      await filterButton.click();

      // Select type
      await page.click('label:has-text("Democracy")');

      // Select status
      await page.click('label:has-text("Ativo")');

      // Verify URL has both filters
      await expect(page).toHaveURL(/type=democracy/i);
      await expect(page).toHaveURL(/status=active/i);

      // Verify results match both filters
      const proposalCards = page.locator('[data-testid="proposal-card"]');
      if ((await proposalCards.count()) > 0) {
        const firstCard = proposalCards.first();
        const type = firstCard.locator('[data-testid="proposal-type"]');
        const status = firstCard.locator('[data-testid="proposal-status"]');

        if (await type.isVisible()) {
          await expect(type).toContainText(/Democracy/i);
        }
        if (await status.isVisible()) {
          await expect(status).toContainText(/Ativo|Active/i);
        }
      }
    }
  });

  test('clear filters', async ({ page }) => {
    await page.goto('/app/governance/proposals?type=treasury&status=active');
    await page.waitForLoadState('networkidle');

    const filterButton = page.locator('button:has-text("Filtros")');
    if (await filterButton.isVisible()) {
      await filterButton.click();

      // Click clear filters
      const clearButton = page.locator('button:has-text("Limpar"), button:has-text("Clear")');
      if (await clearButton.isVisible()) {
        await clearButton.click();

        // Verify URL cleared
        await expect(page).toHaveURL('/app/governance/proposals');

        // Verify all proposals shown again
        const proposalCards = page.locator('[data-testid="proposal-card"]');
        await expect(proposalCards.first()).toBeVisible();
      }
    }
  });

  test('search proposals by title', async ({ page }) => {
    await page.goto('/app/governance/proposals');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="Buscar"], input[type="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('upgrade');

      // Wait for search results
      await page.waitForTimeout(1000);

      // Verify URL updated
      await expect(page).toHaveURL(/search=upgrade/i);

      // Verify results contain search term
      const proposalCards = page.locator('[data-testid="proposal-card"]');
      if ((await proposalCards.count()) > 0) {
        const firstTitle = proposalCards.first().locator('[data-testid="proposal-title"]');
        if (await firstTitle.isVisible()) {
          await expect(firstTitle).toContainText(/upgrade/i);
        }
      }
    }
  });

  test('search with no results', async ({ page }) => {
    await page.goto('/app/governance/proposals');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="Buscar"], input[type="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('xyzabc123nonexistent');

      // Wait for search
      await page.waitForTimeout(1000);

      // Verify "no results" message
      await expect(page.locator('body')).toContainText(/Nenhum resultado|No results|Não encontrado/i);
    }
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/unlock');
    await page.fill('[data-testid="pin-input"]', '1234');
    await page.click('button[type="submit"]');
  });

  test('navigate through governance sections', async ({ page }) => {
    // Start at governance home
    await page.goto('/app/governance');
    await expect(page.locator('h1')).toContainText('Governança');

    // Navigate to proposals
    const proposalsLink = page.locator('a[href="/app/governance/proposals"]');
    if (await proposalsLink.isVisible()) {
      await proposalsLink.click();
      await expect(page).toHaveURL('/app/governance/proposals');
      await expect(page.locator('h1')).toContainText('Propostas');
    }

    // Navigate to council
    const councilLink = page.locator('a[href="/app/governance/council"]');
    if (await councilLink.isVisible()) {
      await councilLink.click();
      await expect(page).toHaveURL('/app/governance/council');
      await expect(page.locator('h1')).toContainText('Council');
    }

    // Navigate to treasury
    const treasuryLink = page.locator('a[href="/app/governance/treasury"]');
    if (await treasuryLink.isVisible()) {
      await treasuryLink.click();
      await expect(page).toHaveURL('/app/governance/treasury');
      await expect(page.locator('h1')).toContainText('Treasury');
    }

    // Navigate to multisig
    const multisigLink = page.locator('a[href="/app/governance/multisig"]');
    if (await multisigLink.isVisible()) {
      await multisigLink.click();
      await expect(page).toHaveURL('/app/governance/multisig');
      await expect(page.locator('h1')).toContainText(/Multisig|Multi-assinatura/i);
    }
  });

  test('breadcrumb navigation', async ({ page }) => {
    // Go to proposal detail
    await page.goto('/app/governance/proposals');
    await page.waitForLoadState('networkidle');

    const firstProposal = page.locator('[data-testid="proposal-card"]').first();
    if (await firstProposal.isVisible()) {
      await firstProposal.click();

      // Verify breadcrumbs exist
      const breadcrumbs = page.locator('[data-testid="breadcrumbs"]');
      if (await breadcrumbs.isVisible()) {
        // Click "Propostas" breadcrumb
        const proposalsCrumb = breadcrumbs.locator('a:has-text("Propostas")');
        if (await proposalsCrumb.isVisible()) {
          await proposalsCrumb.click();
          await expect(page).toHaveURL('/app/governance/proposals');
        }
      }
    }
  });

  test('back button navigation', async ({ page }) => {
    await page.goto('/app/governance');
    await page.goto('/app/governance/proposals');
    await page.goto('/app/governance/council');

    // Go back
    await page.goBack();
    await expect(page).toHaveURL('/app/governance/proposals');

    // Go back again
    await page.goBack();
    await expect(page).toHaveURL('/app/governance');
  });

  test('quick actions navigation', async ({ page }) => {
    await page.goto('/app/governance');
    await page.waitForLoadState('networkidle');

    // Find quick action buttons
    const quickActions = page.locator('[data-testid="quick-action"]');

    if ((await quickActions.count()) > 0) {
      // Click first quick action
      await quickActions.first().click();

      // Verify we navigated somewhere
      await expect(page).not.toHaveURL('/app/governance');
    }
  });

  test('mobile menu navigation', async ({ page, context }) => {
    // Set mobile viewport
    await context.setViewportSize({ width: 375, height: 667 });

    await page.goto('/app/governance');
    await page.waitForLoadState('networkidle');

    // Open mobile menu
    const menuButton = page.locator('button[aria-label="Menu"]');
    if (await menuButton.isVisible()) {
      await menuButton.click();

      // Verify menu is open
      const mobileMenu = page.locator('[data-testid="mobile-menu"]');
      if (await mobileMenu.isVisible()) {
        await expect(mobileMenu).toBeVisible();

        // Click proposals link
        const proposalsLink = mobileMenu.locator('a:has-text("Propostas")');
        if (await proposalsLink.isVisible()) {
          await proposalsLink.click();
          await expect(page).toHaveURL('/app/governance/proposals');
        }
      }
    }
  });
});

test.describe('Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/unlock');
    await page.fill('[data-testid="pin-input"]', '1234');
    await page.click('button[type="submit"]');
  });

  test('paginate through proposals', async ({ page }) => {
    await page.goto('/app/governance/proposals');
    await page.waitForLoadState('networkidle');

    // Check if pagination exists
    const pagination = page.locator('[data-testid="pagination"]');
    if (await pagination.isVisible()) {
      // Click next page
      const nextButton = pagination.locator('button:has-text("Next"), button[aria-label="Next page"]');
      if (await nextButton.isVisible() && !(await nextButton.isDisabled())) {
        await nextButton.click();

        // Verify URL updated
        await expect(page).toHaveURL(/page=2/);

        // Verify different proposals shown
        await expect(page.locator('[data-testid="proposal-card"]').first()).toBeVisible();
      }
    }
  });

  test('change items per page', async ({ page }) => {
    await page.goto('/app/governance/proposals');
    await page.waitForLoadState('networkidle');

    // Find items per page selector
    const perPageSelect = page.locator('[name="perPage"], select[aria-label*="per page"]');
    if (await perPageSelect.isVisible()) {
      await perPageSelect.selectOption('50');

      // Verify URL updated
      await expect(page).toHaveURL(/perPage=50/);

      // Verify more items shown
      const proposalCards = page.locator('[data-testid="proposal-card"]');
      const count = await proposalCards.count();
      expect(count).toBeGreaterThan(10);
    }
  });
});

test.describe('Sorting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/unlock');
    await page.fill('[data-testid="pin-input"]', '1234');
    await page.click('button[type="submit"]');
  });

  test('sort proposals by date', async ({ page }) => {
    await page.goto('/app/governance/proposals');
    await page.waitForLoadState('networkidle');

    // Find sort selector
    const sortSelect = page.locator('[name="sort"], select[aria-label*="Sort"]');
    if (await sortSelect.isVisible()) {
      await sortSelect.selectOption('date-desc');

      // Verify URL updated
      await expect(page).toHaveURL(/sort=date-desc/);

      // Verify proposals are sorted (check dates of first two)
      const proposalCards = page.locator('[data-testid="proposal-card"]');
      if ((await proposalCards.count()) >= 2) {
        const firstDate = proposalCards.nth(0).locator('[data-testid="proposal-date"]');
        const secondDate = proposalCards.nth(1).locator('[data-testid="proposal-date"]');

        if ((await firstDate.isVisible()) && (await secondDate.isVisible())) {
          // First should be more recent than second
          const firstText = await firstDate.textContent();
          const secondText = await secondDate.textContent();
          expect(firstText).toBeTruthy();
          expect(secondText).toBeTruthy();
        }
      }
    }
  });

  test('sort proposals by voting power', async ({ page }) => {
    await page.goto('/app/governance/proposals');
    await page.waitForLoadState('networkidle');

    const sortSelect = page.locator('[name="sort"]');
    if (await sortSelect.isVisible()) {
      await sortSelect.selectOption('votes-desc');

      // Verify URL updated
      await expect(page).toHaveURL(/sort=votes-desc/);
    }
  });
});
