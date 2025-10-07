# Profile NFT Testing Guide

Comprehensive testing guide for the soulbound NFT profile system.

## Overview

The profile NFT system is tested at multiple layers:

1. **Blockchain (Pallet)**: Unit tests in Rust
2. **Backend (API)**: Unit and integration tests in TypeScript
3. **Frontend (React)**: Component and E2E tests
4. **Integration**: Full stack E2E tests with Playwright

---

## Blockchain Tests

### Location

```
~/bazari-chain/pallets/bazari-identity/src/lib.rs
```

### Running Tests

```bash
cd ~/bazari-chain/pallets/bazari-identity
cargo test
```

### Test Coverage

**15 tests, 100% extrinsic coverage:**

✅ `mint_profile_creates_new_profile` - Verifies profile minting
✅ `mint_profile_fails_if_already_exists` - Tests 1:1 guarantee
✅ `mint_profile_fails_if_handle_taken` - Tests handle uniqueness
✅ `update_metadata_cid_works` - Tests CID updates
✅ `set_handle_works_after_cooldown` - Tests handle changes
✅ `set_handle_fails_during_cooldown` - Tests 30-day cooldown
✅ `increment_reputation_works_for_authorized_module` - Tests reputation increase
✅ `increment_reputation_fails_for_unauthorized_module` - Tests authorization
✅ `decrement_reputation_works` - Tests reputation decrease
✅ `award_badge_works_for_authorized_issuer` - Tests badge awards
✅ `award_badge_fails_for_duplicate` - Tests badge uniqueness
✅ `revoke_badge_works` - Tests badge revocation
✅ `add_penalty_works` - Tests penalty recording
✅ `revoke_penalty_works` - Tests penalty revocation
✅ `pause_blocks_all_mutations` - Tests emergency pause

### Example Test

```rust
#[test]
fn mint_profile_creates_new_profile() {
    new_test_ext().execute_with(|| {
        let owner = 1u64;
        let handle = b"alice".to_vec();
        let cid = b"QmTest".to_vec();

        assert_ok!(BazariIdentity::mint_profile(
            RuntimeOrigin::root(),
            owner,
            handle.clone(),
            cid.clone()
        ));

        let profile_id = BazariIdentity::owner_profile(owner).unwrap();
        assert_eq!(profile_id, 1);

        let events = System::events();
        assert!(matches!(
            events[0].event,
            RuntimeEvent::BazariIdentity(Event::ProfileMinted { .. })
        ));
    });
}
```

---

## Backend Tests

### Location

```
~/bazari/apps/api/src/lib/__tests__/profilesChain.test.ts
```

### Running Tests

```bash
cd ~/bazari/apps/api
npm test                    # Run all tests
npm test profilesChain      # Run specific test file
npm run test:coverage       # Generate coverage report
```

### Test Coverage

**Unit tests for blockchain integration:**

✅ `getApi()` - API instance creation and reuse
✅ `getSudoAccount()` - Sudo account initialization
✅ `mintProfileOnChain()` - Profile minting with event parsing
✅ `mintProfileOnChain()` error handling - Dispatch errors
✅ `getOnChainProfile()` - Fetch complete profile data
✅ `getOnChainReputation()` - Fetch reputation score
✅ `updateMetadataCidOnChain()` - Update metadata CID
✅ `incrementReputationOnChain()` - Increment reputation
✅ `awardBadgeOnChain()` - Award badge
✅ Error handling - Network timeouts, malformed data

### Example Test

```typescript
describe('mintProfileOnChain', () => {
  it('should mint profile and return profile ID', async () => {
    const mockTx = {
      signAndSend: vi.fn((account, callback) => {
        callback({
          status: { isInBlock: true },
          events: [
            {
              event: {
                method: 'ProfileMinted',
                data: ['1', 'alice', 'QmTest']
              }
            }
          ]
        });
        return Promise.resolve();
      })
    };

    mockApi.tx.bazariIdentity.mintProfile.mockReturnValue(mockTx);

    const profileId = await mintProfileOnChain(
      '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      'alice',
      'QmTest123'
    );

    expect(profileId).toBe(1n);
  });
});
```

---

## Frontend Tests

### E2E Tests (Playwright)

#### Location

```
~/bazari/apps/web/tests/profile-nft.spec.ts
```

#### Running Tests

```bash
cd ~/bazari/apps/web
npx playwright install          # Install browsers (first time only)
npx playwright test             # Run all tests
npx playwright test --ui        # Run with UI mode
npx playwright test --debug     # Run with debugger
npx playwright show-report      # Show HTML report
```

#### Test Coverage

**10 E2E scenarios:**

✅ `should mint NFT on first login` - Complete login flow with NFT minting
✅ `should display reputation badge on profile page` - Public profile display
✅ `should display badges list on profile page` - Badges rendering
✅ `should show blockchain identity in edit page` - Edit page NFT section
✅ `should load reputation history` - Reputation events
✅ `should handle profile without NFT gracefully` - Legacy profiles
✅ `should show loading state while fetching badges` - Loading states
✅ `should handle API errors gracefully` - Error handling
✅ `should display correct tier badge colors` - Tier variants (bronze, prata, ouro, diamante)

#### Example Test

```typescript
test('should mint NFT on first login', async ({ page }) => {
  await page.goto(`${WEB_BASE_URL}/login`);

  await page.route(`${API_BASE_URL}/auth/login-siws`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'mock_jwt_token',
        profile: {
          onChainProfileId: '1',
          reputationScore: 0,
          reputationTier: 'bronze'
        }
      })
    });
  });

  await page.locator('button:has-text("Connect Wallet")').click();
  await page.waitForURL(`${WEB_BASE_URL}/dashboard`);

  await expect(page.locator('text=Bronze')).toBeVisible();
});
```

### Component Tests (Optional)

For individual React component testing, use Vitest + React Testing Library:

```bash
cd ~/bazari/apps/web
npm test -- --run
```

Example component test:

```typescript
import { render, screen } from '@testing-library/react';
import { ReputationBadge } from '@/components/profile/ReputationBadge';

describe('ReputationBadge', () => {
  it('renders score and tier', () => {
    render(<ReputationBadge score={150} tier="prata" />);

    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('Prata')).toBeInTheDocument();
  });
});
```

---

## Integration Tests

### Full Stack E2E Test

This test requires all services running:

1. **Blockchain node** (port 9944)
2. **Backend API** (port 3001)
3. **Frontend app** (port 3000)
4. **IPFS daemon** (port 5001)

#### Setup

```bash
# Terminal 1: Start blockchain
cd ~/bazari-chain
./target/release/bazari-chain --dev --tmp

# Terminal 2: Start backend
cd ~/bazari/apps/api
npm run dev

# Terminal 3: Start frontend
cd ~/bazari/apps/web
npm run dev

# Terminal 4: Run tests
cd ~/bazari/apps/web
npx playwright test
```

#### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test Profile NFT

on: [push, pull_request]

jobs:
  test-blockchain:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Rust
        uses: actions-rs/toolchain@v1
      - name: Run pallet tests
        run: |
          cd pallets/bazari-identity
          cargo test

  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests
        run: npm test
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  test-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Start services
        run: docker-compose up -d
      - name: Run E2E tests
        run: npx playwright test
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Test Data

### Mock Profiles

```typescript
const MOCK_PROFILES = {
  bronze: {
    handle: 'alice',
    reputationScore: 50,
    reputationTier: 'bronze',
    onChainProfileId: '1'
  },
  prata: {
    handle: 'bob',
    reputationScore: 150,
    reputationTier: 'prata',
    onChainProfileId: '2'
  },
  ouro: {
    handle: 'carol',
    reputationScore: 600,
    reputationTier: 'ouro',
    onChainProfileId: '3'
  },
  diamante: {
    handle: 'dave',
    reputationScore: 1200,
    reputationTier: 'diamante',
    onChainProfileId: '4'
  }
};
```

### Mock Badges

```typescript
const MOCK_BADGES = [
  {
    code: 'verified_seller',
    label: {
      pt: 'Vendedor Verificado',
      en: 'Verified Seller',
      es: 'Vendedor Verificado'
    },
    issuedBy: 'marketplace',
    issuedAt: new Date('2025-10-01').toISOString(),
    blockNumber: '10000'
  },
  {
    code: 'early_adopter',
    label: {
      pt: 'Adotante Inicial',
      en: 'Early Adopter',
      es: 'Adoptador Temprano'
    },
    issuedBy: 'system',
    issuedAt: new Date('2025-10-01').toISOString(),
    blockNumber: '10000'
  }
];
```

---

## Testing Checklist

Before merging a PR, ensure:

### Blockchain
- [ ] All pallet tests pass (`cargo test`)
- [ ] No compiler warnings
- [ ] Storage migrations tested (if applicable)
- [ ] Benchmarks updated (if applicable)

### Backend
- [ ] Unit tests pass (`npm test`)
- [ ] Coverage > 80% for new code
- [ ] API endpoints tested
- [ ] Blockchain integration mocked properly
- [ ] Error handling tested

### Frontend
- [ ] E2E tests pass (`npx playwright test`)
- [ ] Component tests pass (if applicable)
- [ ] Tests run on Chrome, Firefox, Safari
- [ ] Mobile viewport tested
- [ ] Loading states tested
- [ ] Error states tested

### Integration
- [ ] Full stack E2E passes
- [ ] NFT minting flow works end-to-end
- [ ] Reputation updates propagate correctly
- [ ] Badges display correctly
- [ ] No console errors

### Manual Testing
- [ ] Login and mint NFT (first time user)
- [ ] View public profile with NFT
- [ ] Edit profile page shows NFT section
- [ ] Reputation badge displays correct tier/color
- [ ] Badges list shows all badges
- [ ] Handle change respects 30-day cooldown

---

## Troubleshooting Tests

### Tests Fail to Connect to Blockchain

**Problem**: `Error: Could not connect to ws://localhost:9944`

**Solution**:
```bash
# Check if node is running
lsof -i :9944

# Start node if not running
cd ~/bazari-chain
./target/release/bazari-chain --dev --tmp
```

### Tests Timeout

**Problem**: `Timeout waiting for API response`

**Solution**:
- Increase test timeout in `vitest.config.ts` or `playwright.config.ts`
- Check if backend/blockchain is responding slowly
- Reduce parallelism: `npx playwright test --workers=1`

### Mock API Not Working

**Problem**: `Real API calls being made instead of mocks`

**Solution**:
- Ensure mocks are set up before test runs
- Check route matching patterns
- Verify `page.route()` is called before navigation

### Flaky Tests

**Problem**: Tests pass sometimes, fail sometimes

**Solution**:
- Add explicit waits: `await page.waitForSelector(...)`
- Use `page.waitForLoadState('networkidle')`
- Avoid time-based waits: `await page.waitForTimeout(1000)` ❌
- Use event-based waits: `await page.waitForResponse(...)` ✅

---

## Resources

- [Substrate Testing Guide](https://docs.substrate.io/test/)
- [Playwright Documentation](https://playwright.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)

---

## Contributing

When adding new features, please:

1. Write tests first (TDD approach)
2. Ensure tests cover happy path and error cases
3. Add test documentation to this guide
4. Update test checklist if needed

---

## License

MIT-0
