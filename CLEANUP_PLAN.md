# Legacy Code Cleanup Plan

## Overview
This document outlines legacy code that should be removed after the migration period ends (target: 2026-Q1).

## Status: In Transition
Current date: 2025-10-07
All legacy endpoints and pages are still functional to maintain backwards compatibility.

---

## Backend - API Routes

### 1. `/apps/api/src/routes/sellers.ts`
**Status:** ⚠️ DEPRECATED (marked in code)

**Legacy Routes:**
- `GET /me/seller` → Migrate to `GET /me/sellers` (list) or `GET /me/sellers/:id` (specific)
- `POST /me/seller` → Migrate to `POST /me/sellers` (create) or `PATCH /me/sellers/:id` (update)
- `GET /sellers/:shopSlug` → Migrate to `GET /stores/by-slug/:slug`
- `GET /me/seller/orders` → Migrate to `GET /me/sellers/:idOrSlug/orders`
- `POST /me/sellers/:idOrSlug/sync-catalog` → Already duplicated in file, should be moved

**Replacement:**
- Multi-store operations: Use `/apps/api/src/routes/me.sellers.ts`
- Public storefront: Use `/apps/api/src/routes/stores.ts`

**Action Items:**
1. Monitor usage of legacy endpoints
2. Add deprecation headers to responses
3. Update client code to use new endpoints
4. Remove after migration period

**Removal Checklist:**
- [ ] Verify no production traffic to `/me/seller` endpoints
- [ ] Verify no production traffic to `/sellers/:shopSlug`
- [ ] Update all client applications
- [ ] Remove route registration from `server.ts`
- [ ] Delete `sellers.ts` file

---

## Frontend - Pages

### 2. `/apps/web/src/pages/SellerPublicPage.tsx`
**Status:** ⚠️ ACTIVE (still used by `/s/:shopSlug` route)

**Current Usage:**
- Route: `/s/:shopSlug` (behind `FEATURE_FLAGS.store_branded_v1`)
- Purpose: Branded storefront with advanced filtering and virtualized product grid
- Size: 847 lines (complex implementation with TanStack Virtual)

**Replacement:**
- Standard storefront: Use `/apps/web/src/pages/StorePublicPage.tsx`
- Route: `/loja/:slug`

**Migration Strategy:**
1. Port advanced features from SellerPublicPage to StorePublicPage:
   - Virtualized product grid (TanStack Virtual)
   - Advanced filtering and search
   - Category facets
   - Multiple view modes
   - Primary categories sidebar
2. Remove `/s/:shopSlug` route
3. Update feature flag to disable `store_branded_v1`
4. Delete SellerPublicPage.tsx

**Removal Checklist:**
- [ ] Port virtualization to StorePublicPage
- [ ] Port advanced filters to StorePublicPage
- [ ] Test performance with large catalogs
- [ ] Remove route from `App.tsx`
- [ ] Delete file

---

## Frontend - Routes

### 3. Backwards Compatibility Redirects in App.tsx
**Status:** ⚠️ ACTIVE (lines 229-230)

**Redirects:**
```tsx
<Route path="/store/:id" element={<Navigate to="/loja/:id" replace />} />
<Route path="/seller/:slug" element={<Navigate to="/loja/:slug" replace />} />
```

**Purpose:**
- Handle old bookmarks and external links
- SEO preservation during migration

**Removal Checklist:**
- [ ] Add 301 redirects at reverse proxy level (nginx/cloudflare)
- [ ] Monitor 404s for old routes (should be 0)
- [ ] Remove after 6 months of proxy-level redirects
- [ ] Delete lines from `App.tsx`

---

## Database Schema

### 4. Legacy DAO-based Seller References
**Status:** ⚠️ ACTIVE (compatibility layer)

**Tables/Columns:**
- `Order.sellerId` - References DAO id/slug (legacy)
- `Order.sellerAddr` - References user address (legacy)
- New: `Product.sellerStoreId` - References `SellerProfile.id`

**Migration Path:**
1. Backfill `sellerStoreId` for existing orders/products
2. Update all queries to use `sellerStoreId`
3. Create migration to drop legacy columns
4. Remove compatibility queries from code

**Removal Checklist:**
- [ ] Create backfill script for missing `sellerStoreId`
- [ ] Update all order queries
- [ ] Test order filtering by store
- [ ] Create Prisma migration to drop legacy columns
- [ ] Update API responses

---

## Environment Variables / Feature Flags

### 5. `FEATURE_FLAGS.store_branded_v1`
**Status:** ⚠️ ACTIVE

**Current Usage:**
- Gates `/s/:shopSlug` route in `App.tsx`
- Controls branded storefront experience

**Removal Checklist:**
- [ ] Consolidate branded features into StorePublicPage
- [ ] Set flag to `false` in production
- [ ] Remove flag check from code
- [ ] Remove flag from `config.ts`

---

## Migration Timeline

### Phase 1: Documentation (✅ COMPLETE - 2025-10-07)
- [x] Add deprecation comments to code
- [x] Create this cleanup plan
- [x] Document all legacy endpoints

### Phase 2: Monitoring (🔄 IN PROGRESS)
- [ ] Add analytics to track legacy endpoint usage
- [ ] Add deprecation warnings to API responses
- [ ] Monitor 404s for old routes
- [ ] Identify client applications still using legacy endpoints

### Phase 3: Client Migration (⏳ SCHEDULED: 2025-11-01)
- [ ] Update mobile app to use new endpoints
- [ ] Update partner integrations
- [ ] Update internal tools
- [ ] Add tests for new endpoints

### Phase 4: Proxy-Level Redirects (⏳ SCHEDULED: 2025-12-01)
- [ ] Configure nginx/cloudflare 301 redirects
- [ ] Remove frontend redirect routes
- [ ] Monitor redirect traffic

### Phase 5: Backend Cleanup (⏳ SCHEDULED: 2026-Q1)
- [ ] Remove legacy route files
- [ ] Drop database columns
- [ ] Remove feature flags
- [ ] Delete unused code

---

## Rollback Plan

If issues are discovered during cleanup:

1. **Immediate Rollback:** Revert Git commit
2. **Partial Rollback:** Re-enable specific routes/flags
3. **Data Rollback:** Use Prisma migrations rollback

**Emergency Contacts:**
- Backend Lead: [TBD]
- Frontend Lead: [TBD]
- DevOps: [TBD]

---

## Testing Checklist

Before removing any legacy code:

- [ ] All E2E tests pass
- [ ] Integration tests cover new endpoints
- [ ] Performance tests show no regression
- [ ] Load tests pass with production-like data
- [ ] Security audit of new endpoints complete
- [ ] Monitoring/alerting configured
- [ ] Rollback plan tested in staging

---

## Notes

- Keep this document updated as migration progresses
- Add completion dates when phases finish
- Document any issues encountered during migration
- Track metrics: API usage, error rates, performance
