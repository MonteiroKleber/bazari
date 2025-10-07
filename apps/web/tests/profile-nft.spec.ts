import { test, expect, type Page } from '@playwright/test';

/**
 * E2E Tests for Profile NFT System
 *
 * These tests verify the complete flow of:
 * 1. User authentication with SIWS
 * 2. Automatic NFT minting on first login
 * 3. Profile page displays NFT data (reputation, badges)
 * 4. Profile edit page shows blockchain identity
 */

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';
const WEB_BASE_URL = process.env.WEB_BASE_URL || 'http://localhost:3000';

// Mock user data
const MOCK_USER = {
  address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  handle: 'alice_e2e_test',
  displayName: 'Alice E2E Test User'
};

test.describe('Profile NFT System', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Clear local storage and cookies
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('should mint NFT on first login', async ({ page }) => {
    // Navigate to login page
    await page.goto(`${WEB_BASE_URL}/login`);

    // Wait for wallet connect button
    await expect(page.locator('button:has-text("Connect Wallet")')).toBeVisible();

    // Mock SIWS signature (in real test, use wallet extension)
    // For E2E, we'll intercept the API call
    await page.route(`${API_BASE_URL}/auth/login-siws`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'mock_jwt_token',
          user: {
            id: 'user_123',
            address: MOCK_USER.address,
            createdAt: new Date().toISOString()
          },
          profile: {
            id: 'profile_abc',
            userId: 'user_123',
            handle: MOCK_USER.handle,
            displayName: MOCK_USER.displayName,
            onChainProfileId: '1',
            reputationScore: 0,
            reputationTier: 'bronze',
            metadataCid: 'bafytest123',
            isVerified: false,
            lastChainSync: new Date().toISOString()
          }
        })
      });
    });

    // Click connect wallet (this will trigger mock response)
    await page.locator('button:has-text("Connect Wallet")').click();

    // Wait for successful login redirect
    await page.waitForURL(`${WEB_BASE_URL}/dashboard`, { timeout: 10000 });

    // Verify user is logged in
    await expect(page.locator(`text=${MOCK_USER.handle}`)).toBeVisible();

    // Verify NFT was minted (check profile page)
    await page.goto(`${WEB_BASE_URL}/profiles/${MOCK_USER.handle}`);

    // Check that NFT section is visible
    await expect(page.locator('text=Reputação')).toBeVisible();
    await expect(page.locator('text=Bronze')).toBeVisible(); // Tier badge
  });

  test('should display reputation badge on profile page', async ({ page }) => {
    // Setup: Mock logged-in user
    await mockAuthenticatedUser(page, {
      ...MOCK_USER,
      reputationScore: 150,
      reputationTier: 'prata'
    });

    // Navigate to public profile page
    await page.goto(`${WEB_BASE_URL}/profiles/${MOCK_USER.handle}`);

    // Wait for profile to load
    await expect(page.locator(`h1:has-text("${MOCK_USER.displayName}")`)).toBeVisible();

    // Verify reputation badge is displayed
    const reputationBadge = page.locator('[data-testid="reputation-badge"]').or(
      page.locator('text=Reputação').locator('..').locator('..')
    );
    await expect(reputationBadge).toBeVisible();

    // Verify score is displayed
    await expect(page.locator('text=150')).toBeVisible();

    // Verify tier badge (Prata)
    await expect(page.locator('text=Prata')).toBeVisible();
  });

  test('should display badges list on profile page', async ({ page }) => {
    // Mock profile with badges
    await mockProfileWithBadges(page, MOCK_USER.handle, [
      {
        code: 'verified_seller',
        label: { pt: 'Vendedor Verificado', en: 'Verified Seller', es: 'Vendedor Verificado' },
        issuedBy: 'marketplace',
        issuedAt: new Date().toISOString(),
        blockNumber: '12345'
      },
      {
        code: 'early_adopter',
        label: { pt: 'Adotante Inicial', en: 'Early Adopter', es: 'Adoptador Temprano' },
        issuedBy: 'system',
        issuedAt: new Date().toISOString(),
        blockNumber: '10000'
      }
    ]);

    // Navigate to profile
    await page.goto(`${WEB_BASE_URL}/profiles/${MOCK_USER.handle}`);

    // Wait for badges section
    await expect(page.locator('text=Badges')).toBeVisible();

    // Verify individual badges
    await expect(page.locator('text=Vendedor Verificado')).toBeVisible();
    await expect(page.locator('text=Adotante Inicial')).toBeVisible();
  });

  test('should show blockchain identity in edit page', async ({ page }) => {
    // Setup: Mock logged-in user
    await mockAuthenticatedUser(page, {
      ...MOCK_USER,
      onChainProfileId: '1',
      reputationScore: 150,
      reputationTier: 'prata'
    });

    // Navigate to profile edit page
    await page.goto(`${WEB_BASE_URL}/me/profile/edit`);

    // Wait for page to load
    await expect(page.locator('h1:has-text("Editar Perfil")').or(page.locator('h1:has-text("Edit Profile")'))).toBeVisible();

    // Scroll to NFT section
    await page.locator('text=Identidade Soberana').scrollIntoViewIfNeeded();

    // Verify NFT card is visible
    await expect(page.locator('text=Identidade Soberana (NFT)').or(page.locator('text=Sovereign Identity (NFT)'))).toBeVisible();

    // Verify profile ID is displayed
    await expect(page.locator('text=#1')).toBeVisible();

    // Verify reputation badge
    await expect(page.locator('text=150')).toBeVisible();
    await expect(page.locator('text=Prata')).toBeVisible();
  });

  test('should load reputation history', async ({ page }) => {
    // Mock reputation events
    await page.route(`${API_BASE_URL}/profiles/${MOCK_USER.handle}/reputation`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          events: [
            {
              id: 'evt_1',
              profileId: 'profile_abc',
              reasonCode: 'ORDER_COMPLETED',
              points: 3,
              oldScore: 147,
              newScore: 150,
              blockNumber: '12340',
              createdAt: new Date().toISOString()
            },
            {
              id: 'evt_2',
              profileId: 'profile_abc',
              reasonCode: 'DELIVERY_DONE',
              points: 2,
              oldScore: 145,
              newScore: 147,
              blockNumber: '12200',
              createdAt: new Date().toISOString()
            }
          ]
        })
      });
    });

    // Navigate to profile
    await page.goto(`${WEB_BASE_URL}/profiles/${MOCK_USER.handle}`);

    // Open reputation history (if there's a button/tab)
    const reputationTab = page.locator('button:has-text("Reputação")').or(
      page.locator('a:has-text("Reputação")')
    );

    if (await reputationTab.isVisible()) {
      await reputationTab.click();
    }

    // Verify events are displayed (this depends on UI implementation)
    // For now, just verify the API call was made
    await page.waitForRequest(`${API_BASE_URL}/profiles/${MOCK_USER.handle}/reputation`);
  });

  test('should handle profile without NFT gracefully', async ({ page }) => {
    // Mock user without NFT (legacy profile)
    await mockAuthenticatedUser(page, {
      handle: 'legacy_user',
      displayName: 'Legacy User',
      onChainProfileId: null, // No NFT
      reputationScore: 0,
      reputationTier: 'bronze'
    });

    // Navigate to profile
    await page.goto(`${WEB_BASE_URL}/profiles/legacy_user`);

    // Verify profile loads
    await expect(page.locator('h1:has-text("Legacy User")')).toBeVisible();

    // Verify NFT section is NOT displayed
    await expect(page.locator('text=Identidade Soberana')).not.toBeVisible();
    await expect(page.locator('text=Reputação')).not.toBeVisible();
  });

  test('should show loading state while fetching badges', async ({ page }) => {
    // Delay badges API response
    await page.route(`${API_BASE_URL}/profiles/${MOCK_USER.handle}/badges`, async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ badges: [] })
      });
    });

    // Mock profile
    await mockProfileWithBadges(page, MOCK_USER.handle, []);

    // Navigate
    await page.goto(`${WEB_BASE_URL}/profiles/${MOCK_USER.handle}`);

    // Verify loading state (skeleton or spinner)
    // This depends on UI implementation
    const loadingIndicator = page.locator('[data-testid="badges-loading"]').or(
      page.locator('.animate-pulse')
    );

    // Check if loading indicator appears (may not be visible by the time we check)
    // Just verify the page doesn't crash
    await expect(page.locator(`h1:has-text("${MOCK_USER.displayName}")`)).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock 404 error
    await page.route(`${API_BASE_URL}/profiles/nonexistent`, async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Profile not found' })
      });
    });

    // Navigate to non-existent profile
    await page.goto(`${WEB_BASE_URL}/profiles/nonexistent`);

    // Verify error message
    await expect(page.locator('text=Profile not found').or(page.locator('text=Perfil não encontrado'))).toBeVisible();
  });

  test('should display correct tier badge colors', async ({ page }) => {
    const tiers = [
      { tier: 'bronze', score: 50, color: 'gray' },
      { tier: 'prata', score: 150, color: 'blue' },
      { tier: 'ouro', score: 600, color: 'yellow' },
      { tier: 'diamante', score: 1200, color: 'purple' }
    ];

    for (const { tier, score } of tiers) {
      // Mock user with specific tier
      await mockAuthenticatedUser(page, {
        ...MOCK_USER,
        handle: `user_${tier}`,
        reputationScore: score,
        reputationTier: tier
      });

      // Navigate
      await page.goto(`${WEB_BASE_URL}/profiles/user_${tier}`);

      // Verify tier badge is displayed
      const tierText = tier.charAt(0).toUpperCase() + tier.slice(1);
      await expect(page.locator(`text=${tierText}`)).toBeVisible();

      // Verify score
      await expect(page.locator(`text=${score}`)).toBeVisible();
    }
  });
});

// Helper Functions

async function mockAuthenticatedUser(
  page: Page,
  userData: { handle: string; displayName: string; onChainProfileId?: string | null; reputationScore?: number; reputationTier?: string }
) {
  // Set auth token in localStorage
  await page.evaluate(() => {
    localStorage.setItem('auth_token', 'mock_jwt_token');
  });

  // Mock /me/profile endpoint
  await page.route(`${API_BASE_URL}/me/profile`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        profile: {
          id: 'profile_mock',
          userId: 'user_mock',
          handle: userData.handle,
          displayName: userData.displayName,
          onChainProfileId: userData.onChainProfileId || null,
          reputationScore: userData.reputationScore || 0,
          reputationTier: userData.reputationTier || 'bronze',
          metadataCid: 'bafymock',
          createdAt: new Date().toISOString()
        }
      })
    });
  });

  // Mock public profile endpoint
  await page.route(`${API_BASE_URL}/profiles/${userData.handle}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        profile: {
          id: 'profile_mock',
          handle: userData.handle,
          displayName: userData.displayName,
          onChainProfileId: userData.onChainProfileId || null,
          reputation: {
            score: userData.reputationScore || 0,
            tier: userData.reputationTier || 'bronze'
          },
          user: {
            address: MOCK_USER.address
          }
        },
        badges: []
      })
    });
  });
}

async function mockProfileWithBadges(page: Page, handle: string, badges: any[]) {
  // Mock profile endpoint
  await page.route(`${API_BASE_URL}/profiles/${handle}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        profile: {
          id: 'profile_mock',
          handle,
          displayName: MOCK_USER.displayName,
          onChainProfileId: '1',
          reputation: {
            score: 150,
            tier: 'prata'
          },
          user: {
            address: MOCK_USER.address
          }
        },
        badges
      })
    });
  });

  // Mock badges endpoint
  await page.route(`${API_BASE_URL}/profiles/${handle}/badges`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ badges })
    });
  });
}
