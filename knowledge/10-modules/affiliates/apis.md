# Affiliates Module - API Reference

## 1. Request Affiliate Partnership
**`POST /api/affiliates/request`** (Auth required)

```http
POST /api/affiliates/request
{
  "storeId": 123
}
```

## 2. Approve/Reject Affiliate
**`PUT /api/affiliates/:id/approve`** (Auth required, Store owner only)

```http
PUT /api/affiliates/abc123/approve
{
  "customCommission": 7
}
```

## 3. Create Affiliate Marketplace
**`POST /api/affiliates/marketplace`** (Auth required)

```http
POST /api/affiliates/marketplace
{
  "name": "My Tech Store",
  "slug": "my-tech-store",
  "description": "Best tech products",
  "logoUrl": "https://...",
  "primaryColor": "#FF5733"
}
```

## 4. Add Product to Marketplace
**`POST /api/affiliates/marketplace/:id/products`** (Auth required)

```http
POST /api/affiliates/marketplace/mkt123/products
{
  "storeId": 456,
  "productId": "prod_abc",
  "featured": true
}
```

## 5. Get Affiliate Earnings
**`GET /api/affiliates/earnings`** (Auth required)

```http
GET /api/affiliates/earnings?period=30d
```

Returns total sales, commission, stats.

## 6. Create Invite Code
**`POST /api/affiliates/invites`** (Auth required, Store owner)

```http
POST /api/affiliates/invites
{
  "storeId": 123,
  "maxUses": 10,
  "autoApprove": true,
  "defaultCommission": 5
}
```

## 7. Track Sale Commission
**`POST /api/affiliates/sales`** (Internal)

```http
POST /api/affiliates/sales
{
  "orderId": "order_123",
  "promoterId": "promoter_abc",
  "amount": "100.00"
}
```

System automatically creates AffiliateSale and calculates splits.

**Status:** ✅ Implemented
