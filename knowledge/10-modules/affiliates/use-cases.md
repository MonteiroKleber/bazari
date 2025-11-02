# Affiliates Module - Use Cases

## UC-01: Request to Become Affiliate
1. User discovers store they want to promote
2. User clicks "Become Affiliate"
3. Client requests `POST /api/affiliates/request`
4. System creates ChatStoreAffiliate (status: pending)
5. Store owner receives notification

## UC-02: Store Owner Approves Affiliate
1. Store owner reviews affiliate request
2. Owner checks promoter's profile/reputation
3. Owner clicks "Approve"
4. Client requests `PUT /api/affiliates/:id/approve`
5. Status → approved
6. Promoter can now earn commissions

## UC-03: Create Affiliate Marketplace
1. Approved affiliate wants custom storefront
2. User navigates to `/app/affiliate/create-marketplace`
3. User fills: name, slug, description, logo, colors
4. Client requests `POST /api/affiliates/marketplace`
5. System creates AffiliateMarketplace
6. Marketplace live at `/@username/marketplace`

## UC-04: Add Product to Marketplace
1. Affiliate browses products from approved stores
2. Affiliate clicks "Add to My Marketplace"
3. Client requests `POST /api/affiliates/marketplace/:id/products`
4. System creates AffiliateProduct link
5. Product appears in affiliate's storefront

## UC-05: Customer Buys via Affiliate Link
1. Customer visits affiliate marketplace
2. Customer clicks product → checkout
3. Order created with `promoter=affiliateId`
4. Payment completed
5. System creates AffiliateSale record
6. Commission calculated and tracked

## UC-06: View Affiliate Earnings
1. Affiliate opens dashboard
2. Client requests `GET /api/affiliates/earnings`
3. System returns total sales, commission, pending payouts
4. Affiliate sees performance stats

## UC-07: Generate Invite Code
1. Store owner wants to recruit affiliates
2. Owner creates invite code
3. Client requests `POST /api/affiliates/invites`
4. System creates ChatAffiliateInvite with unique code
5. Owner shares code with prospects
6. Users join via code (auto-approve optional)

## UC-08: Suspend Affiliate
1. Store owner detects policy violation
2. Owner clicks "Suspend Affiliate"
3. Client requests `PUT /api/affiliates/:id/suspend`
4. Status → suspended
5. Affiliate cannot earn new commissions

**Status:** ✅ Implemented
