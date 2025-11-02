# Vesting Module - API Reference

## 1. Get Vesting Schedule for Account
**`GET /api/vesting/:account`** (Public)

```http
GET /api/vesting/0x714a0df32c1ea7c5d9836ded01eb47e66e4116f0bded907b454a8b9fd72ecee5
```

**Response:**
```json
{
  "success": true,
  "data": {
    "account": "0x714a0df...",
    "schedules": [
      {
        "locked": "15000000000000000000",
        "perBlock": "3255208333333333",
        "startingBlock": 864000
      }
    ],
    "totalLocked": "15000000000000000000",
    "totalVested": "5000000000000000000",
    "totalUnvested": "10000000000000000000",
    "vestedPercentage": 33.33,
    "currentBlock": 1500000
  }
}
```

---

## 2. Get Global Vesting Stats
**`GET /api/vesting/stats`** (Public)

```http
GET /api/vesting/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAllocated": "38000000000000000000",
    "totalVested": "15000000000000000000",
    "totalUnvested": "23000000000000000000",
    "vestedPercentage": 39.47,
    "currentBlock": 1500000,
    "categories": {
      "founders": {
        "account": "0x714a0df...",
        "totalLocked": "15000000000000000000",
        "vested": "5000000000000000000",
        "unvested": "10000000000000000000",
        "vestedPercentage": 33.33,
        "startBlock": 864000,
        "duration": 4608000,
        "cliff": 864000
      },
      "team": {...},
      "partners": {...},
      "marketing": {...}
    }
  }
}
```

---

## 3. Get Category Vesting
**`GET /api/vesting/category/:category`** (Public)

```http
GET /api/vesting/category/founders
```

**Response:**
```json
{
  "success": true,
  "category": "founders",
  "data": {
    "account": "0x714a0df...",
    "totalLocked": "15000000000000000000",
    "vested": "5000000000000000000",
    "unvested": "10000000000000000000",
    "vestedPercentage": 33.33,
    "startBlock": 864000,
    "duration": 4608000,
    "cliff": 864000
  }
}
```

---

## On-Chain: Claim Vested Tokens

```typescript
const api = await ApiPromise.create();
const tx = api.tx.vesting.vest();
await tx.signAndSend(signer);
```

**Status:** ✅ Implemented
