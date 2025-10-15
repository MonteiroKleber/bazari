# Multi-Store Proposals - Manual Test Plan

## Overview
This document provides step-by-step manual tests for the Multi-Store Proposals feature (FASE 8).

## Prerequisites
- API server running on http://localhost:3000
- Web app running on http://localhost:5173
- At least 3 stores with products in the database
- Test user accounts (seller/promoter and buyer)

---

## Test 1: Create Multi-Store Proposal ✅

### Steps:
1. Login as a promoter/seller
2. Navigate to a chat thread
3. Click "Create Proposal"
4. **Enable "Allow Multi-Store"** toggle (should be enabled by default)
5. Select products from **3 different stores**:
   - 2 products from Store A
   - 1 product from Store B
   - 2 products from Store C
6. Click "Next" → Configure shipping/commission → "Next"
7. Review the proposal in step 3

### Expected Results:
- ✅ Products are **automatically grouped by store**
- ✅ Each store group shows:
  - Store name with colored border
  - List of products
  - Subtotal per store
  - Commission percentage per store
- ✅ Grand total shows sum of all stores
- ✅ Message: "Dividido entre 3 lojas"
- ✅ Click "Send Proposal" succeeds

### Validation:
```bash
# Check database
psql -d bazari_db -c "
  SELECT id, \"isMultiStore\", \"storeGroups\"
  FROM \"ChatProposal\"
  ORDER BY \"createdAt\" DESC
  LIMIT 1;
"
```

Expected:
- `isMultiStore`: `true`
- `storeGroups`: JSON array with 3 objects

---

## Test 2: Visualize Multi-Store Proposal ✅

### Steps:
1. As the **buyer**, view the chat thread
2. Locate the multi-store proposal message
3. Observe the `MultiStoreProposalCard` rendering

### Expected Results:
- ✅ Header shows "Proposta Multi-Loja"
- ✅ Subtitle shows "3 lojas • 5 produtos"
- ✅ Each store has its own **colored card**:
  - Blue border for Store A
  - Green border for Store B
  - Purple border for Store C
- ✅ Each store card shows:
  - Store name with icon
  - Commission badge
  - List of products with quantities
  - Subtotal
- ✅ Grand total section at bottom
- ✅ "Aceitar Proposta" button visible (if buyer and not expired)

### Screenshot Checklist:
- [ ] Multi-store header with store count
- [ ] Color-coded store cards
- [ ] Grand total section
- [ ] Accept button

---

## Test 3: Multi-Store Checkout ✅

### Steps:
1. As the **buyer**, click "Aceitar Proposta" on the multi-store proposal
2. Confirm the checkout
3. Wait for the success dialog

### Expected Results:
- ✅ `PaymentSuccessDialog` shows **multi-sale layout**
- ✅ Header: "Pagamento Confirmado!"
- ✅ Subtitle: "Dividido entre 3 lojas"
- ✅ Grand total card showing total amount
- ✅ **3 individual store cards**, each with:
  - Store name
  - Sale ID (truncated)
  - Amount for that store
  - "Ver Recibo NFT" button
  - "Ver Detalhes" button
- ✅ Each store has its own `receiptNftCid`

### Validation:
```bash
# Check ChatSale records
psql -d bazari_db -c "
  SELECT id, \"storeId\", amount, \"receiptNftCid\", \"proposalId\"
  FROM \"ChatSale\"
  WHERE \"proposalId\" = 'YOUR_PROPOSAL_ID'
  ORDER BY \"storeId\";
"
```

Expected:
- **3 ChatSale records** (one per store)
- Each with different `storeId`
- Each with unique `receiptNftCid`
- All linked to same `proposalId`

### Performance Check:
```bash
# Check server logs for timing
grep "Multi-Store Checkout" /path/to/api.log | tail -10
```

Expected output:
```
[Multi-Store Checkout] Loaded 3 stores in 45ms
[Multi-Store Checkout] Store 1 split completed in 180ms
[Multi-Store Checkout] Store 2 split completed in 165ms
[Multi-Store Checkout] Store 3 split completed in 190ms
[Multi-Store Checkout] Completed 3/3 stores in 520ms (0 failed)
```

Total time should be **< 1 second**.

---

## Test 4: Validations ✅

### Test 4.1: Maximum 5 Stores
**Steps:**
1. Try to add products from 6 different stores

**Expected:**
- ✅ Error toast: "Máximo de 5 lojas por proposta"
- ✅ 6th store's product cannot be added

### Test 4.2: Maximum 20 Products
**Steps:**
1. Try to add 21 products total

**Expected:**
- ✅ Error toast: "Máximo de 20 produtos por proposta"
- ✅ 21st product cannot be added

### Test 4.3: Store Disallows Multi-Store
**Steps:**
1. Go to Store Settings → Commission Policy
2. **Disable** "Permitir propostas multi-loja"
3. Try to create a proposal with this store + another store

**Expected:**
- ✅ Warning appears in ProductSelectorGrid:
  ```
  ⚠️ Proposta Multi-Loja Bloqueada
  Esta loja não permite propostas com produtos de outras lojas.
  ```
- ✅ Backend rejects on submission:
  ```
  Error: A loja X não permite propostas multi-loja. Os produtos "..." não podem ser incluídos em propostas com produtos de outras lojas.
  ```

---

## Test 5: Edge Cases ✅

### Test 5.1: Single Store (Backward Compatibility)
**Steps:**
1. Create proposal with products from **only 1 store**

**Expected:**
- ✅ `isMultiStore` = `false`
- ✅ Uses regular `ProposalCard` (not multi-store version)
- ✅ Checkout creates **1 ChatSale** (not array)
- ✅ No regression - works exactly like before

### Test 5.2: Store Without Policy
**Steps:**
1. Create proposal with product from store that has no `StoreCommissionPolicy`

**Expected:**
- ✅ Uses **default 5% commission**
- ✅ Proposal created successfully
- ✅ No errors

### Test 5.3: Affiliate-Only Store Without Access
**Setup:**
1. Set Store A to `mode: 'affiliates'`
2. Promoter is NOT an approved affiliate

**Steps:**
1. Try to create proposal with Store A's product

**Expected:**
- ✅ Error: "Must be approved affiliate of store 'Store A'"
- ✅ Proposal rejected

---

## Test 6: Performance ✅

### Test 6.1: 5 Stores, 20 Products
**Steps:**
1. Create proposal with:
   - 5 stores (maximum)
   - 20 products (maximum)
2. Accept the proposal (checkout)

**Expected:**
- ✅ Proposal creation: **< 2 seconds**
- ✅ Checkout: **< 5 seconds**
- ✅ No memory leaks
- ✅ All performance logs present

**Log Verification:**
```bash
grep -E "\[Proposal\]|\[Create Store Groups\]|\[Multi-Store Checkout\]" api.log | tail -20
```

Expected logs:
```
[Proposal] Creating proposal with 20 items
[Create Store Groups] Loaded 5 stores and 5 policies in 75ms
[Create Store Groups] Created 5 groups in 350ms total
[Proposal] Created in 450ms

[Checkout] Starting checkout
[Multi-Store Checkout] Loaded 5 stores in 60ms
[Multi-Store Checkout] Store 1 split completed in 220ms
[Multi-Store Checkout] Store 2 split completed in 195ms
[Multi-Store Checkout] Store 3 split completed in 240ms
[Multi-Store Checkout] Store 4 split completed in 180ms
[Multi-Store Checkout] Store 5 split completed in 210ms
[Multi-Store Checkout] Completed 5/5 stores in 950ms (0 failed)
[Checkout] Multi-store completed in 1100ms
```

### Test 6.2: Query Optimization
**Verify no N+1 queries:**

```bash
# Enable Prisma query logging
export DEBUG="prisma:query"

# Create a multi-store proposal
# Count the queries in logs
```

**Expected:**
- createStoreGroups: **2 queries** (stores + policies batch)
- checkoutMultiStore: **1 query** (stores with relations)
- Total: **~5-10 queries** for entire flow (not 20+ with N+1)

---

## Test 7: UI/UX Validation ✅

### Checklist:
- [ ] **ProductSelectorGrid**
  - [ ] Multi-store toggle works
  - [ ] Store groups have different colored borders
  - [ ] Commission badges visible per store
  - [ ] Clear/Limpar button removes all items
  - [ ] Grand total shows store count

- [ ] **MultiStoreCart** (in Review step)
  - [ ] Clean visual separation by store
  - [ ] Icons for stores, items, shipping
  - [ ] Totals are accurate
  - [ ] Responsive design works on mobile

- [ ] **MultiStoreProposalCard**
  - [ ] Color-coded left borders (5 colors)
  - [ ] Time remaining shows correctly
  - [ ] Expired proposals marked clearly
  - [ ] Accept button only for buyer

- [ ] **PaymentSuccessDialog**
  - [ ] Multi-sale layout for multi-store
  - [ ] Single-sale layout for single-store
  - [ ] All receipt links work
  - [ ] Scrollable for many stores

- [ ] **Commission Policy Page**
  - [ ] Toggle for "Allow Multi-Store" present
  - [ ] Warning messages show correctly
  - [ ] Saves successfully

---

## Test 8: Integration Tests

### Database Consistency
```sql
-- Check proposal-sale relationship
SELECT
  p.id AS proposal_id,
  p."isMultiStore",
  COUNT(s.id) AS sale_count,
  ARRAY_AGG(s."storeId") AS stores
FROM "ChatProposal" p
LEFT JOIN "ChatSale" s ON s."proposalId" = p.id
WHERE p."isMultiStore" = true
GROUP BY p.id
LIMIT 5;
```

**Expected:**
- Multi-store proposals should have multiple sales
- Each sale linked to different storeId

### Message Metadata
```sql
-- Check chat messages for multi-store proposals
SELECT
  id,
  type,
  meta->'isMultiStore' AS is_multistore,
  jsonb_array_length(meta->'sales') AS sale_count
FROM "ChatMessage"
WHERE type = 'payment'
  AND meta->>'isMultiStore' = 'true'
LIMIT 5;
```

**Expected:**
- Payment messages for multi-store have `isMultiStore: true`
- `sales` array contains multiple sales

---

## Success Criteria

All tests must pass:
- ✅ Multi-store proposal creation
- ✅ Visual grouping and rendering
- ✅ Multi-store checkout with separate sales
- ✅ All validations working
- ✅ Edge cases handled correctly
- ✅ Performance under 5 seconds
- ✅ No regressions in single-store flow
- ✅ Database consistency maintained
- ✅ UI/UX intuitive and clear

---

## Troubleshooting

### Issue: Proposal not marked as multi-store
**Check:**
```bash
# Verify products are from different stores
SELECT p.id, p.title, s."onChainStoreId"
FROM "Product" p
JOIN "SellerProfile" s ON s.id = p."sellerStoreId"
WHERE p.id IN ('product1', 'product2');
```

### Issue: Checkout fails
**Check:**
1. Proposal status is 'sent'
2. All stores exist and have profiles
3. Commission policies are valid
4. No store has `allowMultiStore: false` for multi-store proposals

### Issue: Performance slow
**Check:**
1. Database indexes present
2. No N+1 queries (check logs with DEBUG=prisma:query)
3. Redis/cache working (if implemented)

---

## Reporting Issues

When reporting issues, include:
1. Test number and step where failure occurred
2. Expected vs actual behavior
3. Screenshots (for UI tests)
4. Server logs (grep for timing logs)
5. Database state (relevant SQL queries)
6. Browser console errors (for frontend tests)
