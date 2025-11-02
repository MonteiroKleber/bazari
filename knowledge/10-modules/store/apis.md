# Store Module - API Reference

## 1. Create Seller Profile
**`POST /api/sellers`** (Auth required)

```http
POST /api/sellers
{
  "shopName": "Alice's Store",
  "shopSlug": "alice-store",
  "about": "Handmade crafts"
}
```

## 2. Get Store by Slug
**`GET /api/sellers/:slug`**

```http
GET /api/sellers/alice-store
```

**Response:**
```json
{
  "seller": {
    "id": "seller_1",
    "shopName": "Alice's Store",
    "shopSlug": "alice-store",
    "ratingAvg": 4.8,
    "products": [...]
  }
}
```

## 3. Publish Store On-Chain
**`POST /api/stores/publish`** (Auth required)

```http
POST /api/stores/publish
{
  "sellerProfileId": "seller_1"
}
```

**Response:**
```json
{
  "success": true,
  "cids": {
    "metadata": "Qm...",
    "products": "Qm..."
  },
  "version": 1
}
```

## 4. Get My Stores
**`GET /api/me/sellers`** (Auth required)

Returns all stores owned by user.

**Status:** ✅ Implemented
