/**
 * FASE 8 - PROMPT 9: E2E Tests - Proposal Lifecycle
 *
 * Testa o ciclo completo de criação e visualização de proposta
 */

import { test, expect } from '@playwright/test';

test.describe('Proposal Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login
    await page.goto('/auth/unlock');
    await page.fill('[data-testid="pin-input"]', '1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/app');
  });

  test('complete proposal lifecycle', async ({ page }) => {
    // 1. Navigate to governance
    await page.goto('/app/governance');
    await expect(page.locator('h1')).toContainText('Governança');

    // 2. Wait for stats to load
    await expect(page.locator('[data-testid="stats-loaded"]')).toBeVisible({
      timeout: 10000,
    });

    // 3. Create proposal (if button exists)
    const createButton = page.locator('button:has-text("Criar Proposta")');
    if (await createButton.isVisible()) {
      await createButton.click();

      await page.selectOption('[name="type"]', 'DEMOCRACY');
      await page.fill('[name="title"]', 'E2E Test Proposal');
      await page.fill('[name="description"]', 'This is an E2E test');
      await page.click('button:has-text("Criar Proposta")');

      // 4. Enter PIN
      await page.fill('[data-testid="pin-modal-input"]', '1234');
      await page.click('button:has-text("Confirmar")');

      // 5. Verify proposal created
      await expect(page.locator('.toast')).toContainText('Proposta criada', {
        timeout: 15000,
      });
      await expect(page).toHaveURL(
        /\/app\/governance\/proposals\/democracy\/\d+/
      );

      // 6. Verify proposal details
      await expect(page.locator('h1')).toContainText('E2E Test Proposal');
      await expect(page.locator('p')).toContainText('This is an E2E test');
    }
  });

  test('navigate to proposals list', async ({ page }) => {
    await page.goto('/app/governance');

    // Click "Ver Todas" or proposals navigation
    const viewAllButton = page.locator(
      'a[href="/app/governance/proposals"], button:has-text("Ver Todas")'
    );
    if (await viewAllButton.first().isVisible()) {
      await viewAllButton.first().click();
      await expect(page).toHaveURL('/app/governance/proposals');
      await expect(page.locator('h1')).toContainText('Propostas');
    }
  });

  test('view proposal details', async ({ page }) => {
    await page.goto('/app/governance/proposals');

    // Wait for proposals to load
    await page.waitForLoadState('networkidle');

    // Click first proposal if it exists
    const firstProposal = page.locator('[data-testid="proposal-card"]').first();
    if (await firstProposal.isVisible()) {
      await firstProposal.click();

      // Verify we're on proposal detail page
      await expect(page).toHaveURL(/\/app\/governance\/proposals\//);

      // Verify key elements are present
      await expect(page.locator('h1')).toBeVisible();
      await expect(
        page.locator('[data-testid="proposal-status"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="proposal-description"]')
      ).toBeVisible();
    }
  });

  test('filter proposals by status', async ({ page }) => {
    await page.goto('/app/governance/proposals');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Open filters (if filter sidebar exists)
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

  test('search proposals', async ({ page }) => {
    await page.goto('/app/governance/proposals');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Find search input
    const searchInput = page.locator(
      'input[placeholder*="Buscar"], input[type="search"]'
    );
    if (await searchInput.isVisible()) {
      await searchInput.fill('treasury');

      // Wait for results to update
      await page.waitForTimeout(1000);

      // Verify results contain search term
      const proposals = page.locator('[data-testid="proposal-card"]');
      if ((await proposals.count()) > 0) {
        const firstProposal = proposals.first();
        await expect(firstProposal).toContainText(/treasury/i);
      }
    }
  });
});

test.describe('Proposal Navigation', () => {
  test('navigate between proposal types', async ({ page }) => {
    // Login first
    await page.goto('/auth/unlock');
    await page.fill('[data-testid="pin-input"]', '1234');
    await page.click('button[type="submit"]');

    // Go to governance
    await page.goto('/app/governance/proposals');

    // Test navigation to different proposal types
    const proposalTypes = [
      { name: 'Democracy', url: '/app/governance/proposals/democracy' },
      { name: 'Treasury', url: '/app/governance/proposals/treasury' },
      { name: 'Council', url: '/app/governance/proposals/council' },
    ];

    for (const type of proposalTypes) {
      const link = page.locator(`a[href="${type.url}"]`);
      if (await link.isVisible()) {
        await link.click();
        await expect(page).toHaveURL(type.url);
        await expect(page.locator('h1')).toContainText(type.name);
      }
    }
  });
});
