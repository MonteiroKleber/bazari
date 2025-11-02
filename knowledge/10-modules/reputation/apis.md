# Reputation Module - API Reference

## 1. Get Profile Reputation Events
**`GET /api/profiles/:handle/reputation`** (Public)

```http
GET /api/profiles/@alice/reputation
```

**Response:**
```json
{
  "events": [
    {
      "id": "evt_abc123",
      "profileId": "prof_xyz",
      "eventCode": "ORDER_COMPLETED",
      "delta": 3,
      "newTotal": 127,
      "reason": "Order #ord_456 completed",
      "emittedBy": "marketplace",
      "blockNumber": "1234567",
      "extrinsicId": "0x789abc...",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

Returns last 100 reputation events ordered by createdAt desc.

## 2. Get Reputation History (30 days)
**`GET /api/profiles/:handle/reputation/history`** (Public)

```http
GET /api/profiles/@alice/reputation/history
```

**Response:**
```json
{
  "reputationScore": 127,
  "reputationTier": "prata",
  "history": [
    {
      "eventCode": "ORDER_COMPLETED",
      "delta": 3,
      "newTotal": 127,
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

Returns reputation snapshot + events from last 30 days.

## 3. Get Reputation Leaderboard
**`GET /api/leaderboards/reputation`** (Public)

```http
GET /api/leaderboards/reputation?limit=100
```

**Response:**
```json
{
  "type": "reputation",
  "leaderboard": [
    {
      "rank": 1,
      "userId": "user_123",
      "handle": "@alice",
      "displayName": "Alice Silva",
      "avatarUrl": "https://ipfs.io/ipfs/Qm...",
      "reputationScore": 1250,
      "reputationTier": "diamante"
    },
    {
      "rank": 2,
      "userId": "user_456",
      "handle": "@bob",
      "displayName": "Bob Santos",
      "avatarUrl": "https://ipfs.io/ipfs/Qm...",
      "reputationScore": 780,
      "reputationTier": "ouro"
    }
  ]
}
```

Returns top profiles ranked by reputationScore.

## 4. Sync Store Reputation (Worker)
**Background worker - not an HTTP endpoint**

Configured via environment variables:
```env
STORE_REPUTATION_SURI=//Alice  # Substrate account with signing privileges
STORE_REPUTATION_INTERVAL_MS=60000  # Run every 60 seconds
```

**Process:**
1. Fetch all SellerProfile with onChainStoreId
2. Aggregate Order stats (count, sum(totalBzr) where status=RELEASED)
3. Estimate feedback from SellerProfile.ratingAvg/ratingCount
4. Compare with on-chain `stores.reputation(storeId)`
5. If delta > 0, submit extrinsic: `stores.bumpReputation(storeId, deltaSnapshot)`

**Extrinsic Signature:**
```rust
pub fn bump_reputation(
  origin: OriginFor<T>,
  store_id: BoundedVec<u8, T::MaxStoreIdLength>,
  delta_sales: u32,
  delta_positive: u32,
  delta_negative: u32,
  delta_volume_planck: u128,
) -> DispatchResult
```

## 5. Get Reputation Rules (Config)
**Internal API - not exposed via REST**

Defined in `/apps/api/src/config/reputationRules.ts`:

```typescript
export const REPUTATION_RULES = [
  { code: 'ORDER_COMPLETED', points: 3, dailyLimit: 50, emitter: 'marketplace' },
  { code: 'DELIVERY_DONE', points: 2, dailyLimit: 100, emitter: 'delivery' },
  { code: 'DISPUTE_RESOLVED', points: 5, dailyLimit: 10, emitter: 'marketplace' },
  { code: 'DAO_VOTE_VALID', points: 1, dailyLimit: 100, emitter: 'dao' },
  { code: 'P2P_ESCROW_OK', points: 2, dailyLimit: 50, emitter: 'p2p' },
  { code: 'SOCIAL_CONTRIB', points: 1, dailyLimit: 40, emitter: 'social' },
  { code: 'SPAM_WARN', points: -2, dailyLimit: 20, emitter: 'social' },
  { code: 'FRAUD_CONFIRMED', points: -20, dailyLimit: 1, emitter: 'arbitration' },
];
```

## 6. Calculate Tier (Utility Function)
**Internal function - not exposed via REST**

```typescript
export function calculateTier(score: number): string {
  if (score >= 1000) return 'diamante';
  if (score >= 500) return 'ouro';
  if (score >= 100) return 'prata';
  return 'bronze';
}
```

**Status:** ✅ Implemented (Hybrid: off-chain events API + on-chain store sync)
