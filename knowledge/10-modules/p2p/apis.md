# P2P Exchange Module - API Reference

## 1. List P2P Offers (Public)
**`GET /api/p2p/offers`**

```http
GET /api/p2p/offers?assetType=BZR&side=SELL_BZR&method=PIX&minBRL=100&maxBRL=1000&limit=20&cursor=eyJ...
```

**Query Parameters:**
- `assetType`: `BZR | ZARI` (optional)
- `side`: `BUY_BZR | SELL_BZR` (optional)
- `method`: `PIX` (optional)
- `minBRL`: Minimum amount filter (optional)
- `maxBRL`: Maximum amount filter (optional)
- `limit`: Results per page (1-100, default: 20)
- `cursor`: Pagination cursor (optional)

**Response:**
```json
{
  "items": [
    {
      "id": "offer_1",
      "ownerId": "user_abc",
      "side": "SELL_BZR",
      "assetType": "BZR",
      "priceBRLPerUnit": "5.50",
      "minBRL": "100.00",
      "maxBRL": "5000.00",
      "method": "PIX",
      "status": "ACTIVE",
      "owner": {
        "handle": "@alice",
        "displayName": "Alice Silva",
        "avatarUrl": "https://...",
        "stars": 4.8,
        "completionRate": 0.95,
        "volume30d": {
          "brl": 25000,
          "bzr": 4545.45
        }
      },
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ],
  "nextCursor": "eyJjcmVhdGVkQXQiOi4uLg=="
}
```

---

## 2. Create P2P Offer
**`POST /api/p2p/offers`** (Auth required)

```http
POST /api/p2p/offers
{
  "assetType": "BZR",
  "side": "SELL_BZR",
  "priceBRLPerUnit": "5.50",
  "minBRL": "100.00",
  "maxBRL": "5000.00",
  "method": "PIX",
  "autoReply": "Hello! Please send PIX to my key: 123.456.789-00"
}
```

**Response:**
```json
{
  "id": "offer_1",
  "ownerId": "user_abc",
  "status": "ACTIVE",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

---

## 3. Create ZARI Phase Offer
**`POST /api/p2p/offers`** (Auth required)

```http
POST /api/p2p/offers
{
  "assetType": "ZARI",
  "assetId": "1",
  "phase": "2A",
  "side": "SELL_BZR",
  "priceBRLPerUnit": "1.375",
  "minBRL": "100.00",
  "maxBRL": "10000.00",
  "method": "PIX"
}
```

**Note:** Price calculation for ZARI Phase 2A:
- Phase price: 0.25 BZR per ZARI
- BZR price: R$ 5.50 per BZR
- `priceBRLPerUnit = 0.25 * 5.50 = R$ 1.375 per ZARI`

---

## 4. Create P2P Order (Accept Offer)
**`POST /api/p2p/orders`** (Auth required)

```http
POST /api/p2p/orders
{
  "offerId": "offer_1",
  "amountBRL": "500.00"
}
```

**Response:**
```json
{
  "id": "order_1",
  "offerId": "offer_1",
  "makerId": "user_abc",
  "takerId": "user_xyz",
  "side": "SELL_BZR",
  "assetType": "BZR",
  "priceBRLPerUnit": "5.50",
  "amountAsset": "90.909090909090909090",
  "amountBRL": "500.00",
  "status": "DRAFT",
  "expiresAt": "2025-01-17T10:00:00Z",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

**Calculation:**
- `amountAsset = amountBRL / priceBRLPerUnit`
- `amountAsset = 500 / 5.50 = 90.909... BZR`

---

## 5. Submit Escrow Transaction
**`POST /api/p2p/orders/:id/escrow`** (Auth required, Maker only)

```http
POST /api/p2p/orders/order_1/escrow
{
  "escrowTxHash": "0xabc123..."
}
```

**Response:**
```json
{
  "success": true,
  "status": "AWAITING_FIAT_PAYMENT",
  "escrowAt": "2025-01-15T10:05:00Z"
}
```

**Validations:**
- User must be Maker
- Order status must be DRAFT or AWAITING_ESCROW
- `escrowTxHash` validated on-chain (amount and recipient match)

---

## 6. Declare Fiat Payment
**`POST /api/p2p/orders/:id/declare-payment`** (Auth required, Taker only)

```http
POST /api/p2p/orders/order_1/declare-payment
```

**Response:**
```json
{
  "success": true,
  "payerDeclaredAt": "2025-01-15T10:15:00Z"
}
```

---

## 7. Upload Payment Proof
**`POST /api/p2p/orders/:id/proof`** (Auth required, Taker only)

```http
POST /api/p2p/orders/order_1/proof
Content-Type: multipart/form-data

file: [binary image data]
```

**Response:**
```json
{
  "success": true,
  "proofUrl": "https://cdn.bazari.xyz/proofs/abc123.png",
  "status": "AWAITING_CONFIRMATION"
}
```

---

## 8. Release Escrow (Confirm Payment)
**`POST /api/p2p/orders/:id/release`** (Auth required, Maker only)

```http
POST /api/p2p/orders/order_1/release
{
  "releasedTxHash": "0xdef456..."
}
```

**Response:**
```json
{
  "success": true,
  "status": "RELEASED",
  "releasedAt": "2025-01-15T10:30:00Z"
}
```

**Side Effects:**
- Escrow funds sent to Taker on-chain
- Both parties can now leave reviews
- Reputation updated

---

## 9. Cancel Order
**`POST /api/p2p/orders/:id/cancel`** (Auth required)

```http
POST /api/p2p/orders/order_1/cancel
{
  "reason": "Changed my mind"
}
```

**Response:**
```json
{
  "success": true,
  "status": "CANCELLED"
}
```

**Constraints:**
- Can only cancel if status is DRAFT, AWAITING_ESCROW, or AWAITING_FIAT_PAYMENT
- If escrow locked, refund to Maker

---

## 10. Send Message
**`POST /api/p2p/orders/:id/messages`** (Auth required)

```http
POST /api/p2p/orders/order_1/messages
{
  "body": "I sent the PIX. Please check!",
  "kind": "text"
}
```

**Response:**
```json
{
  "id": "msg_1",
  "orderId": "order_1",
  "senderId": "user_xyz",
  "body": "I sent the PIX. Please check!",
  "kind": "text",
  "createdAt": "2025-01-15T10:20:00Z"
}
```

**Message Kinds:**
- `text` - Normal chat message
- `proof_upload` - System message when proof uploaded
- `escrow_detected` - System message when escrow confirmed
- `fiat_declared` - System message when Taker declares payment
- `release_request` - Taker requests release

---

## 11. Get Order Messages
**`GET /api/p2p/orders/:id/messages`** (Auth required)

```http
GET /api/p2p/orders/order_1/messages
```

**Response:**
```json
{
  "messages": [
    {
      "id": "msg_1",
      "senderId": "user_abc",
      "body": "Hello! My PIX key is 123.456.789-00",
      "kind": "text",
      "createdAt": "2025-01-15T10:00:00Z"
    },
    {
      "id": "msg_2",
      "senderId": "user_xyz",
      "body": "I sent the PIX. Please check!",
      "kind": "text",
      "createdAt": "2025-01-15T10:20:00Z"
    }
  ]
}
```

---

## 12. Create Review
**`POST /api/p2p/reviews`** (Auth required)

```http
POST /api/p2p/reviews
{
  "orderId": "order_1",
  "stars": 5,
  "comment": "Fast and reliable trader!"
}
```

**Response:**
```json
{
  "id": "review_1",
  "orderId": "order_1",
  "raterId": "user_xyz",
  "rateeId": "user_abc",
  "stars": 5,
  "comment": "Fast and reliable trader!",
  "createdAt": "2025-01-15T11:00:00Z"
}
```

**Constraints:**
- Order status must be RELEASED
- User must be participant (Maker or Taker)
- One review per user per order

---

## 13. Open Dispute
**`POST /api/p2p/disputes`** (Auth required)

```http
POST /api/p2p/disputes
{
  "orderId": "order_1",
  "reason": "I sent PIX but Maker not responding for 48h",
  "evidence": [
    "https://cdn.bazari.xyz/proofs/abc.png",
    "https://cdn.bazari.xyz/proofs/def.png"
  ]
}
```

**Response:**
```json
{
  "id": "dispute_1",
  "orderId": "order_1",
  "openedById": "user_xyz",
  "reason": "I sent PIX but Maker not responding for 48h",
  "status": "OPEN",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

---

## 14. Resolve Dispute (DAO/Admin)
**`PUT /api/p2p/disputes/:id/resolve`** (Auth required, Admin role)

```http
PUT /api/p2p/disputes/dispute_1/resolve
{
  "resolution": "RESOLVED_BUYER",
  "notes": "Evidence shows PIX was sent. Releasing escrow to buyer."
}
```

**Response:**
```json
{
  "success": true,
  "dispute": {
    "id": "dispute_1",
    "status": "RESOLVED_BUYER",
    "updatedAt": "2025-01-16T10:00:00Z"
  },
  "order": {
    "id": "order_1",
    "status": "DISPUTE_RESOLVED_BUYER"
  }
}
```

**Resolutions:**
- `RESOLVED_BUYER` - Escrow to Taker, Maker penalized
- `RESOLVED_SELLER` - Escrow to Maker, Taker penalized

---

## 15. Get P2P Profile Statistics
**`GET /api/p2p/profile/:userId`** (Public)

```http
GET /api/p2p/profile/user_abc
```

**Response:**
```json
{
  "userId": "user_abc",
  "profile": {
    "handle": "@alice",
    "displayName": "Alice Silva",
    "avatarUrl": "https://..."
  },
  "stats": {
    "totalTrades": 150,
    "completionRate": 0.95,
    "avgRating": 4.8,
    "ratingCount": 120,
    "volume30d": {
      "brl": 25000,
      "bzr": 4545.45
    }
  },
  "reviews": [
    {
      "id": "review_1",
      "raterId": "user_xyz",
      "stars": 5,
      "comment": "Fast and reliable trader!",
      "createdAt": "2025-01-15T11:00:00Z"
    }
  ]
}
```

---

## 16. Update Payment Profile
**`PUT /api/p2p/payment-profile`** (Auth required)

```http
PUT /api/p2p/payment-profile
{
  "pixKey": "123.456.789-00",
  "bankName": "Nubank",
  "accountName": "Alice Silva"
}
```

**Response:**
```json
{
  "id": "profile_1",
  "userId": "user_abc",
  "pixKey": "123.456.789-00",
  "bankName": "Nubank",
  "accountName": "Alice Silva",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

---

## 17. Get Active ZARI Phase
**`GET /api/p2p/zari/phases/active`** (Public)

```http
GET /api/p2p/zari/phases/active
```

**Response:**
```json
{
  "phase": "2A",
  "priceBZR": "0.250000000000",
  "supplyLimit": "2100000000000000000",
  "supplySold": "1500000000000000000",
  "supplyRemaining": "600000000000000000",
  "active": true,
  "startBlock": 1000000
}
```

---

## 18. Transition ZARI Phase (Admin)
**`POST /api/p2p/zari/phases/transition`** (Auth required, Admin role)

```http
POST /api/p2p/zari/phases/transition
{
  "fromPhase": "2A",
  "toPhase": "2B"
}
```

**Response:**
```json
{
  "success": true,
  "deactivated": {
    "phase": "2A",
    "endBlock": 1500000
  },
  "activated": {
    "phase": "2B",
    "priceBZR": "0.350000000000",
    "startBlock": 1500001
  }
}
```

---

## Order Status Flow

```
DRAFT
  ↓ (Maker deposits escrow)
AWAITING_ESCROW
  ↓ (Escrow confirmed on-chain)
AWAITING_FIAT_PAYMENT
  ↓ (Taker sends PIX + uploads proof)
AWAITING_CONFIRMATION
  ↓ (Maker confirms payment + releases escrow)
RELEASED ✅

Alternative paths:
- CANCELLED (user cancels before escrow)
- EXPIRED (48h timeout)
- DISPUTE_OPEN → DISPUTE_RESOLVED_BUYER | DISPUTE_RESOLVED_SELLER
```

**Status:** ✅ Implemented & Production-Ready
