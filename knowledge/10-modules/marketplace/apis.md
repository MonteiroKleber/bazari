# Marketplace Module - API Reference

## 1. Search Marketplace
**`GET /api/marketplace/search`**

```http
GET /api/marketplace/search?q=quadro&category=decoracao&minPrice=50&maxPrice=200&sort=priceAsc&limit=24&offset=0
```

**Response:**
```json
{
  "items": [
    {
      "id": "prod_123",
      "title": "Quadro Abstrato Moderno",
      "price": {"amount": 150, "currency": "BZR"},
      "category": {"path": ["casa-decoracao", "decoracao", "quadros"]},
      "images": ["https://ipfs.io/ipfs/Qm..."],
      "seller": {"name": "Alice's Store", "slug": "alice-store"}
    }
  ],
  "total": 42,
  "page": {"limit": 24, "offset": 0}
}
```

---

## 2. Get Products List
**`GET /api/products`**

```http
GET /api/products?category=products-casa&status=PUBLISHED&limit=50
```

**Response:**
```json
{
  "products": [
    {
      "id": "uuid",
      "title": "Product Name",
      "priceBzr": "150.000000000000",
      "categoryId": "products-casa-decoracao",
      "status": "PUBLISHED"
    }
  ]
}
```

---

## 3. Get Product Detail
**`GET /api/products/:id`**

```http
GET /api/products/prod_123
```

**Response:**
```json
{
  "product": {
    "id": "prod_123",
    "title": "Quadro Abstrato",
    "description": "# Descrição\nQuadro moderno...",
    "priceBzr": "150.000000000000",
    "category": {
      "id": "products-casa-decoracao-quadros",
      "pathNames": ["Casa", "Decoração", "Quadros"]
    },
    "attributes": {
      "dimensions": {"width": 100, "height": 80, "unit": "cm"},
      "material": "canvas",
      "style": "modern"
    },
    "media": [
      {"id": "media_1", "url": "https://ipfs.io/ipfs/Qm..."}
    ],
    "seller": {
      "id": "seller_1",
      "shopName": "Alice's Store",
      "shopSlug": "alice-store",
      "ratingAvg": 4.8
    }
  }
}
```

---

## 4. Create Product
**`POST /api/products`** (Auth required)

```http
POST /api/products
Authorization: Bearer <token>

{
  "daoId": "dao_123",
  "sellerStoreId": "store_1",
  "title": "Quadro Abstrato Moderno",
  "description": "Quadro pintado à mão...",
  "priceBzr": "150.000000000000",
  "categoryPath": ["casa-decoracao", "decoracao", "quadros"],
  "attributes": {
    "dimensions": {"width": 100, "height": 80, "unit": "cm"},
    "material": "canvas"
  },
  "mediaIds": ["media_1", "media_2"]
}
```

**Response:**
```json
{
  "product": {
    "id": "prod_new",
    "status": "PUBLISHED"
  }
}
```

---

## 5. Update Product
**`PUT /api/products/:id`** (Auth required, owner only)

```http
PUT /api/products/prod_123
Authorization: Bearer <token>

{
  "title": "Updated Title",
  "priceBzr": "180.000000000000"
}
```

---

## 6. Delete Product
**`DELETE /api/products/:id`** (Auth required, owner only)

Marks as ARCHIVED (soft delete).

---

## 7. Get Categories Tree
**`GET /api/categories`**

```http
GET /api/categories?kind=product&level=1
```

**Response:**
```json
{
  "categories": [
    {
      "id": "products-casa-decoracao",
      "slug": "casa-decoracao",
      "namePt": "Casa & Decoração",
      "level": 1,
      "children": [...]
    }
  ]
}
```

---

**Rate Limits:**
- Search: 100/min per IP
- Create/Update: 50/hour per user

**Status:** ✅ Implemented
