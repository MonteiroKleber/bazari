# Orders Module - API Reference

## 1. Create Order
**`POST /api/orders`**

```http
POST /api/orders
Headers:
  Idempotency-Key: <uuid> (optional)

Body:
{
  "items": [
    {
      "listingId": "uuid",
      "qty": 2,
      "kind": "product"
    }
  ],
  "shippingAddress": {
    "street": "Rua A",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01000-000",
    "country": "BR"
  },
  "shippingOptionId": "STD",
  "notes": "Leave at door"
}
```

**Response:**
```json
{
  "orderId": "uuid",
  "status": "CREATED",
  "totals": {
    "subtotalBzr": "1000000000000",
    "shippingBzr": "10000000000000",
    "totalBzr": "11000000000000"
  },
  "items": [
    {
      "listingId": "uuid",
      "qty": 2,
      "kind": "product",
      "unitPriceBzrSnapshot": "500000000000",
      "titleSnapshot": "Handmade Mug",
      "lineTotalBzr": "1000000000000"
    }
  ]
}
```

**Constraints:**
- MVP: All items must be from same seller (1 vendor per order)
- Idempotency-Key header prevents duplicate orders (10 min TTL)
- Auto-creates DeliveryRequest if `shippingAddress` present + `FEATURE_AUTO_CREATE_DELIVERY=true`

---

## 2. Estimate Shipping
**`POST /api/orders/estimate-shipping`**

```http
POST /api/orders/estimate-shipping
{
  "sellerStoreId": "store_uuid",
  "deliveryAddress": {
    "street": "Rua B",
    "city": "Rio de Janeiro",
    "state": "RJ",
    "zipCode": "20000-000",
    "country": "BR",
    "lat": -22.9068,
    "lng": -43.1729
  },
  "items": [
    {
      "listingId": "uuid",
      "qty": 1,
      "kind": "product"
    }
  ]
}
```

**Response:**
```json
{
  "deliveryFeeBzr": "15000000000000",
  "distance": 450.5,
  "estimatedTimeMinutes": 60,
  "breakdown": {
    "baseFeeBzr": "10000000000000",
    "distanceFeeBzr": "5000000000000"
  }
}
```

---

## 3. Create Payment Intent
**`POST /api/orders/:id/payment-intent`**

```http
POST /api/orders/abc-123/payment-intent
```

**Response:**
```json
{
  "orderId": "abc-123",
  "escrowAddress": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "amountBzr": "11000000000000",
  "feeBps": 250,
  "paymentIntentId": "intent_123"
}
```

---

## 4. Get Order Details
**`GET /api/orders/:id`**

```http
GET /api/orders/abc-123
```

**Response:**
```json
{
  "id": "abc-123",
  "buyerAddr": "5GrwvaEF...",
  "sellerAddr": "5FHneW...",
  "sellerId": "seller_dao_1",
  "sellerStoreId": "store_uuid",
  "subtotalBzr": "1000000000000",
  "shippingBzr": "10000000000000",
  "totalBzr": "11000000000000",
  "status": "SHIPPED",
  "shippingAddress": {...},
  "notes": "Leave at door",
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T11:00:00Z",
  "items": [...],
  "paymentIntents": [
    {
      "id": "intent_123",
      "amountBzr": "11000000000000",
      "escrowAddress": "5GrwvaEF...",
      "status": "FUNDS_IN",
      "txHashIn": "0xabc...",
      "createdAt": "2025-01-15T10:05:00Z"
    }
  ],
  "escrowLogs": [
    {
      "id": "log_1",
      "kind": "RELEASE_REQUEST",
      "payloadJson": {...},
      "createdAt": "2025-01-15T11:00:00Z"
    }
  ]
}
```

---

## 5. Confirm Order Received (Buyer)
**`POST /api/orders/:id/confirm-received`**

```http
POST /api/orders/abc-123/confirm-received
```

**Response:**
```json
{
  "recommendation": {
    "releaseToSeller": "10725000000000",
    "feeToMarketplace": "275000000000",
    "amounts": {
      "gross": "11000000000000",
      "fee": "275000000000",
      "net": "10725000000000"
    },
    "addresses": {
      "seller": "5FHneW...",
      "escrow": "5GrwvaEF..."
    }
  },
  "note": "Operação manual/multisig necessária. Este é apenas um log de solicitação.",
  "logId": "log_1"
}
```

---

## 6. Release Order (Seller Confirms Delivery)
**`POST /api/orders/:id/release`** (Auth required)

```http
POST /api/orders/abc-123/release
```

**Response:**
```json
{
  "order": {
    "id": "abc-123",
    "status": "RELEASED",
    ...
  },
  "recommendation": {
    "releaseToSeller": "10725000000000",
    "feeToMarketplace": "275000000000",
    "amounts": {
      "gross": "11000000000000",
      "net": "10725000000000",
      "fee": "275000000000"
    },
    "addresses": {
      "seller": "5FHneW..."
    }
  },
  "note": "Order liberada. Operação on-chain manual/multisig se necessário."
}
```

**Side Effects:**
- Status → RELEASED
- Creates EscrowLog (RELEASE_REQUEST)
- Triggers reputation sync worker (ProfileReputationEvent on-chain)

---

## 7. Cancel Order
**`POST /api/orders/:id/cancel`**

```http
POST /api/orders/abc-123/cancel
```

**Response:**
```json
{
  "recommendation": {
    "refundToBuyer": "11000000000000",
    "fee": "0",
    "addresses": {
      "buyer": "5GrwvaEF..."
    }
  },
  "note": "Operação manual/multisig necessária. Este é apenas um log de solicitação.",
  "logId": "log_2"
}
```

**Constraints:**
- Can only cancel if status NOT IN (RELEASED, REFUNDED, CANCELLED, TIMEOUT)

---

## 8. Get Payments Config
**`GET /api/payments/config`**

```http
GET /api/payments/config
```

**Response:**
```json
{
  "escrowAddress": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "feeBps": 250
}
```

**Note:** `feeBps = 250` means 2.5% fee (250 basis points)

---

## Fee Calculation Formula

```typescript
const grossAmount = totalBzr; // Total order amount in planck
const feeAmount = grossAmount * feeBps / 10000; // Fee in planck
const netAmount = grossAmount - feeAmount; // Amount to seller in planck

// Example: totalBzr = 10000000000000 (10 BZR), feeBps = 250 (2.5%)
// feeAmount = 10000000000000 * 250 / 10000 = 250000000000 (0.25 BZR)
// netAmount = 10000000000000 - 250000000000 = 9750000000000 (9.75 BZR)
```

**Status:** ✅ Implemented
