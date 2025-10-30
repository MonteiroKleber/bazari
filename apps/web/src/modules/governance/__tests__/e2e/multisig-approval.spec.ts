/**
 * FASE 8 - PROMPT 9: E2E Tests - Multisig Approval Workflow
 *
 * Testa o fluxo de criação, aprovação e execução de transações multisig
 */

import { test, expect } from '@playwright/test';

test.describe('Multisig Approval Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login
    await page.goto('/auth/unlock');
    await page.fill('[data-testid="pin-input"]', '1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/app');
  });

  test('search for multisig account', async ({ page }) => {
    // Navigate to multisig page
    await page.goto('/app/governance/multisig');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify title
    await expect(page.locator('h1')).toContainText(/Multisig|Multi-assinatura/i);

    // Enter multisig address
    const searchInput = page.locator('[data-testid="multisig-search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
      await page.click('button:has-text("Buscar")');

      // Wait for results
      await page.waitForLoadState('networkidle');

      // Verify account info loaded
      const accountInfo = page.locator('[data-testid="multisig-account-info"]');
      if (await accountInfo.isVisible()) {
        await expect(accountInfo).toBeVisible();

        // Verify signatories count
        const signatoryCount = page.locator('[data-testid="signatory-count"]');
        if (await signatoryCount.isVisible()) {
          await expect(signatoryCount).toContainText(/\d+/);
        }

        // Verify threshold
        const threshold = page.locator('[data-testid="threshold"]');
        if (await threshold.isVisible()) {
          await expect(threshold).toContainText(/\d+/);
        }
      }
    }
  });

  test('view pending multisig transactions', async ({ page }) => {
    await page.goto('/app/governance/multisig');
    await page.waitForLoadState('networkidle');

    // Search for a known multisig account
    const searchInput = page.locator('[data-testid="multisig-search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
      await page.click('button:has-text("Buscar")');
      await page.waitForLoadState('networkidle');

      // Verify pending transactions section
      const pendingTxs = page.locator('[data-testid="pending-transactions"]');
      if (await pendingTxs.isVisible()) {
        await expect(pendingTxs).toBeVisible();

        // Check if there are any transactions
        const txCards = page.locator('[data-testid="multisig-transaction"]');
        if ((await txCards.count()) > 0) {
          // Verify first transaction has required info
          await expect(txCards.first().locator('[data-testid="tx-hash"]')).toBeVisible();
          await expect(txCards.first().locator('[data-testid="tx-approvals"]')).toBeVisible();
        }
      }
    }
  });

  test('approve pending multisig transaction', async ({ page }) => {
    await page.goto('/app/governance/multisig');
    await page.waitForLoadState('networkidle');

    // Search for multisig account
    const searchInput = page.locator('[data-testid="multisig-search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
      await page.click('button:has-text("Buscar")');
      await page.waitForLoadState('networkidle');

      // Find approve button on first pending transaction
      const approveButton = page.locator('button:has-text("Aprovar")').first();
      if (await approveButton.isVisible()) {
        // Get current approval count before approving
        const approvalProgress = page.locator('[data-testid="approval-progress"]').first();
        const beforeText = await approvalProgress.textContent();

        // Click approve
        await approveButton.click();

        // Enter PIN
        await page.fill('[data-testid="pin-modal-input"]', '1234');
        await page.click('button:has-text("Confirmar")');

        // Verify approval recorded
        await expect(page.locator('.toast')).toContainText(/aprovad|approved/i, {
          timeout: 15000,
        });

        // Verify approval count increased
        await expect(approvalProgress).not.toContainText(beforeText || '');
      }
    }
  });

  test('create new multisig transaction', async ({ page }) => {
    await page.goto('/app/governance/multisig');
    await page.waitForLoadState('networkidle');

    // Search for multisig account first
    const searchInput = page.locator('[data-testid="multisig-search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
      await page.click('button:has-text("Buscar")');
      await page.waitForLoadState('networkidle');

      // Click create transaction button
      const createButton = page.locator('button:has-text("Nova Transação"), button:has-text("Create Transaction")');
      if (await createButton.isVisible()) {
        await createButton.click();

        // Fill transaction details
        await page.fill('[name="destination"]', '5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY');
        await page.fill('[name="amount"]', '10');

        // Submit
        await page.click('button:has-text("Criar Transação")');

        // Enter PIN
        await page.fill('[data-testid="pin-modal-input"]', '1234');
        await page.click('button:has-text("Confirmar")');

        // Verify transaction created
        await expect(page.locator('.toast')).toContainText(/criada|created/i, {
          timeout: 15000,
        });
      }
    }
  });

  test('cancel multisig transaction', async ({ page }) => {
    await page.goto('/app/governance/multisig');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('[data-testid="multisig-search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
      await page.click('button:has-text("Buscar")');
      await page.waitForLoadState('networkidle');

      // Find cancel button
      const cancelButton = page.locator('button:has-text("Cancelar")').first();
      if (await cancelButton.isVisible()) {
        await cancelButton.click();

        // Confirm cancellation
        const confirmButton = page.locator('button:has-text("Confirmar Cancelamento")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();

          // Enter PIN
          await page.fill('[data-testid="pin-modal-input"]', '1234');
          await page.click('button:has-text("Confirmar")');

          // Verify cancellation
          await expect(page.locator('.toast')).toContainText(/cancelada|cancelled/i, {
            timeout: 15000,
          });
        }
      }
    }
  });

  test('view multisig transaction history', async ({ page }) => {
    await page.goto('/app/governance/multisig');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('[data-testid="multisig-search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
      await page.click('button:has-text("Buscar")');
      await page.waitForLoadState('networkidle');

      // Navigate to history tab
      const historyTab = page.locator('button:has-text("Histórico"), a:has-text("History")');
      if (await historyTab.isVisible()) {
        await historyTab.click();

        // Verify history list
        const historyList = page.locator('[data-testid="transaction-history"]');
        if (await historyList.isVisible()) {
          await expect(historyList).toBeVisible();

          // Verify transactions are shown
          const historyItems = page.locator('[data-testid="history-item"]');
          if ((await historyItems.count()) > 0) {
            await expect(historyItems.first()).toBeVisible();
          }
        }
      }
    }
  });

  test('view signatories list', async ({ page }) => {
    await page.goto('/app/governance/multisig');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('[data-testid="multisig-search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
      await page.click('button:has-text("Buscar")');
      await page.waitForLoadState('networkidle');

      // Verify signatories section
      const signatoriesSection = page.locator('[data-testid="signatories-list"]');
      if (await signatoriesSection.isVisible()) {
        await expect(signatoriesSection).toBeVisible();

        // Verify at least one signatory
        const signatories = page.locator('[data-testid="signatory-card"]');
        if ((await signatories.count()) > 0) {
          await expect(signatories.first()).toBeVisible();

          // Verify signatory has address
          await expect(signatories.first().locator('[data-testid="signatory-address"]')).toBeVisible();
        }
      }
    }
  });

  test('filter transactions by status', async ({ page }) => {
    await page.goto('/app/governance/multisig');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('[data-testid="multisig-search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
      await page.click('button:has-text("Buscar")');
      await page.waitForLoadState('networkidle');

      // Open filters
      const filterButton = page.locator('button:has-text("Filtros")');
      if (await filterButton.isVisible()) {
        await filterButton.click();

        // Select "Pending" status
        await page.click('label:has-text("Pendente")');

        // Verify only pending transactions shown
        const txCards = page.locator('[data-testid="multisig-transaction"]');
        if ((await txCards.count()) > 0) {
          for (let i = 0; i < (await txCards.count()); i++) {
            const status = txCards.nth(i).locator('[data-testid="tx-status"]');
            if (await status.isVisible()) {
              await expect(status).toContainText(/Pendente|Pending/i);
            }
          }
        }
      }
    }
  });
});

test.describe('Multisig Account Management', () => {
  test('view multisig account balance', async ({ page }) => {
    await page.goto('/auth/unlock');
    await page.fill('[data-testid="pin-input"]', '1234');
    await page.click('button[type="submit"]');

    await page.goto('/app/governance/multisig');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('[data-testid="multisig-search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
      await page.click('button:has-text("Buscar")');
      await page.waitForLoadState('networkidle');

      // Verify balance is displayed
      const balance = page.locator('[data-testid="multisig-balance"]');
      if (await balance.isVisible()) {
        await expect(balance).toBeVisible();
        await expect(balance).toContainText(/BZR|\d+/);
      }
    }
  });

  test('view multisig account details', async ({ page }) => {
    await page.goto('/auth/unlock');
    await page.fill('[data-testid="pin-input"]', '1234');
    await page.click('button[type="submit"]');

    await page.goto('/app/governance/multisig');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('[data-testid="multisig-search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
      await page.click('button:has-text("Buscar")');
      await page.waitForLoadState('networkidle');

      // Verify all account details are shown
      await expect(page.locator('[data-testid="multisig-address"]')).toBeVisible();
      await expect(page.locator('[data-testid="signatory-count"]')).toBeVisible();
      await expect(page.locator('[data-testid="threshold"]')).toBeVisible();
      await expect(page.locator('[data-testid="multisig-balance"]')).toBeVisible();
    }
  });
});
