# Profile NFT API Documentation

API endpoints for managing soulbound NFT profiles with blockchain integration.

## Base URL

```
https://api.bazari.dev/api
```

## Authentication

All authenticated endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are obtained via the `/auth/login-siws` endpoint.

## Endpoints

### Authentication

#### POST `/auth/login-siws`

Authenticate with Sign-In With Substrate (SIWS) and automatically mint NFT profile on first login.

**Request Body:**
```json
{
  "message": {
    "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    "domain": "bazari.dev",
    "uri": "https://bazari.dev",
    "version": "1",
    "chainId": "bazari-testnet",
    "nonce": "abc123",
    "issuedAt": "2025-10-06T12:00:00Z"
  },
  "signature": "0x..."
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    "createdAt": "2025-10-06T12:00:00Z"
  },
  "profile": {
    "id": "profile_abc",
    "userId": "user_123",
    "handle": "alice",
    "onChainProfileId": "1",
    "reputationScore": 0,
    "reputationTier": "bronze",
    "metadataCid": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    "isVerified": false,
    "lastChainSync": "2025-10-06T12:00:05Z"
  }
}
```

**First Login Flow:**
1. User authenticated via SIWS signature
2. Database profile created with temporary handle
3. IPFS metadata generated and uploaded
4. **Blockchain NFT minted** (blocks for ~6 seconds)
5. Profile updated with `onChainProfileId` and `metadataCid`
6. Returns JWT token + profile data

**Error Responses:**
- `400`: Invalid signature or message format
- `409`: Handle already taken (auto-generates new handle)
- `500`: Blockchain mint failed (profile creation rolled back)

---

### Profile Management

#### GET `/profiles/:handle`

Get public profile information by handle.

**Parameters:**
- `handle` (path): Profile handle (username)

**Response (200 OK):**
```json
{
  "profile": {
    "id": "profile_abc",
    "handle": "alice",
    "displayName": "Alice in Wonderland",
    "bio": "Blockchain enthusiast",
    "avatarCid": "QmAvatar123",
    "bannerCid": "QmBanner456",
    "onChainProfileId": "1",
    "reputationScore": 150,
    "reputationTier": "prata",
    "metadataCid": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    "isVerified": true,
    "lastChainSync": "2025-10-06T12:00:00Z",
    "createdAt": "2025-10-01T10:00:00Z",
    "user": {
      "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
    }
  },
  "badges": [
    {
      "code": "verified_seller",
      "label": {
        "pt": "Vendedor Verificado",
        "en": "Verified Seller",
        "es": "Vendedor Verificado"
      },
      "issuedBy": "marketplace",
      "issuedAt": "2025-10-05T14:30:00Z",
      "blockNumber": "12345"
    }
  ],
  "stats": {
    "totalOrders": 42,
    "totalDeliveries": 38,
    "followersCount": 120,
    "followingCount": 85
  }
}
```

**Error Responses:**
- `404`: Profile not found

---

#### GET `/me/profile`

Get authenticated user's own profile (requires auth).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "profile": {
    "id": "profile_abc",
    "userId": "user_123",
    "handle": "alice",
    "displayName": "Alice in Wonderland",
    "bio": "Blockchain enthusiast",
    "avatarCid": "QmAvatar123",
    "bannerCid": "QmBanner456",
    "onChainProfileId": "1",
    "reputationScore": 150,
    "reputationTier": "prata",
    "metadataCid": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    "isVerified": true,
    "lastChainSync": "2025-10-06T12:00:00Z",
    "createdAt": "2025-10-01T10:00:00Z"
  }
}
```

**Error Responses:**
- `401`: Not authenticated
- `404`: User has no profile

---

#### PUT `/me/profile`

Update authenticated user's profile (requires auth).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "displayName": "Alice Updated",
  "bio": "New bio text",
  "avatarCid": "QmNewAvatar",
  "bannerCid": "QmNewBanner"
}
```

**Response (200 OK):**
```json
{
  "profile": {
    "id": "profile_abc",
    "handle": "alice",
    "displayName": "Alice Updated",
    "bio": "New bio text",
    "avatarCid": "QmNewAvatar",
    "bannerCid": "QmNewBanner",
    "onChainProfileId": "1",
    "reputationScore": 150,
    "reputationTier": "prata",
    "metadataCid": "bafyNEWCID789",
    "lastChainSync": "2025-10-06T12:05:00Z"
  }
}
```

**Notes:**
- Updates IPFS metadata CID automatically
- Updates blockchain `MetadataCid` storage
- Cannot update `handle` via this endpoint (use separate handle change flow)

**Error Responses:**
- `401`: Not authenticated
- `404`: User has no profile
- `400`: Validation errors

---

### Reputation & Badges

#### GET `/profiles/:handle/reputation`

Get reputation history for a profile.

**Parameters:**
- `handle` (path): Profile handle

**Response (200 OK):**
```json
{
  "events": [
    {
      "id": "evt_123",
      "profileId": "profile_abc",
      "reasonCode": "ORDER_COMPLETED",
      "points": 3,
      "oldScore": 147,
      "newScore": 150,
      "blockNumber": "12340",
      "createdAt": "2025-10-06T11:30:00Z"
    },
    {
      "id": "evt_122",
      "profileId": "profile_abc",
      "reasonCode": "DELIVERY_DONE",
      "points": 2,
      "oldScore": 145,
      "newScore": 147,
      "blockNumber": "12200",
      "createdAt": "2025-10-05T18:20:00Z"
    }
  ]
}
```

**Query Parameters:**
- `limit` (optional): Number of events to return (default: 100, max: 1000)
- `offset` (optional): Pagination offset (default: 0)

**Error Responses:**
- `404`: Profile not found

---

#### GET `/profiles/:handle/badges`

Get badges awarded to a profile.

**Parameters:**
- `handle` (path): Profile handle

**Response (200 OK):**
```json
{
  "badges": [
    {
      "id": "badge_1",
      "profileId": "profile_abc",
      "code": "verified_seller",
      "label": {
        "pt": "Vendedor Verificado",
        "en": "Verified Seller",
        "es": "Vendedor Verificado"
      },
      "issuedBy": "marketplace",
      "issuedAt": "2025-10-05T14:30:00Z",
      "blockNumber": "12100",
      "revokedAt": null
    },
    {
      "id": "badge_2",
      "profileId": "profile_abc",
      "code": "early_adopter",
      "label": {
        "pt": "Adotante Inicial",
        "en": "Early Adopter",
        "es": "Adoptador Temprano"
      },
      "issuedBy": "system",
      "issuedAt": "2025-10-01T10:00:00Z",
      "blockNumber": "10000",
      "revokedAt": null
    }
  ]
}
```

**Query Parameters:**
- `includeRevoked` (optional): Include revoked badges (default: false)

**Error Responses:**
- `404`: Profile not found

---

### Blockchain Integration

#### GET `/chain/profile/:profileId`

Get profile data directly from blockchain.

**Parameters:**
- `profileId` (path): On-chain profile ID

**Response (200 OK):**
```json
{
  "profileId": "1",
  "owner": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "handle": "alice",
  "metadataCid": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
  "reputation": 150,
  "badges": [
    {
      "code": "verified_seller",
      "issuer": 1,
      "issuedAt": "12100",
      "revokedAt": null
    }
  ],
  "penalties": [],
  "handleHistory": [
    {
      "handle": "alice_old",
      "changedAt": "10500"
    }
  ]
}
```

**Error Responses:**
- `404`: Profile not found on chain
- `503`: Blockchain connection error

---

#### POST `/chain/sync-profile/:handle`

Manually trigger profile sync from blockchain (admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Parameters:**
- `handle` (path): Profile handle to sync

**Response (200 OK):**
```json
{
  "synced": true,
  "profile": {
    "id": "profile_abc",
    "onChainProfileId": "1",
    "reputationScore": 150,
    "reputationTier": "prata",
    "lastChainSync": "2025-10-06T12:10:00Z"
  },
  "changes": {
    "reputation": { "old": 145, "new": 150 },
    "badgesAdded": ["verified_seller"],
    "badgesRevoked": []
  }
}
```

**Error Responses:**
- `401`: Not authenticated or not admin
- `404`: Profile not found
- `503`: Blockchain connection error

---

## Data Models

### Profile

```typescript
interface Profile {
  id: string;                    // Database ID (CUID)
  userId: string;                // Foreign key to User
  handle: string;                // Unique username
  displayName: string;           // Display name
  bio: string | null;            // Biography
  avatarCid: string | null;      // IPFS CID for avatar
  bannerCid: string | null;      // IPFS CID for banner
  onChainProfileId: bigint | null; // Blockchain profile ID
  reputationScore: number;       // Current reputation score
  reputationTier: string;        // bronze, prata, ouro, diamante
  metadataCid: string | null;    // IPFS CID for full metadata
  isVerified: boolean;           // Verified badge status
  lastChainSync: Date | null;    // Last blockchain sync timestamp
  createdAt: Date;
  updatedAt: Date;
}
```

### Badge

```typescript
interface Badge {
  id: string;                    // Database ID (CUID)
  profileId: string;             // Foreign key to Profile
  code: string;                  // Badge code (e.g., "verified_seller")
  label: {                       // Localized labels
    pt: string;
    en: string;
    es: string;
  };
  issuedBy: string;              // Issuing module (e.g., "marketplace")
  issuedAt: Date;                // Issue timestamp
  blockNumber: bigint;           // Block number when issued
  revokedAt: Date | null;        // Revocation timestamp (null if active)
}
```

### ReputationEvent

```typescript
interface ReputationEvent {
  id: string;                    // Database ID (CUID)
  profileId: string;             // Foreign key to Profile
  reasonCode: string;            // Event code (e.g., "ORDER_COMPLETED")
  points: number;                // Points change (can be negative)
  oldScore: number;              // Score before change
  newScore: number;              // Score after change
  blockNumber: bigint;           // Block number when occurred
  createdAt: Date;
}
```

### HandleHistory

```typescript
interface HandleHistory {
  id: string;                    // Database ID (CUID)
  profileId: string;             // Foreign key to Profile
  oldHandle: string;             // Previous handle
  newHandle: string;             // New handle
  changedAt: Date;               // Change timestamp
  blockNumber: bigint;           // Block number when changed
}
```

---

## Reputation Tiers

Reputation score determines the tier:

| Tier | Score Range | Color | Badge Variant |
|------|-------------|-------|---------------|
| Bronze | 0-99 | Gray | `default` |
| Prata | 100-499 | Blue | `secondary` |
| Ouro | 500-999 | Yellow | `outline` |
| Diamante | 1000+ | Purple | `outline` |

---

## Reputation Rules

Standard reputation events and their point values:

| Code | Points | Daily Limit | Emitter | Description |
|------|--------|-------------|---------|-------------|
| `ORDER_COMPLETED` | +3 | 50 | marketplace | Successfully completed order |
| `DELIVERY_DONE` | +2 | 100 | delivery | Delivery marked as complete |
| `POSITIVE_REVIEW` | +1 | 20 | marketplace | Received positive review |
| `SPAM_WARN` | -2 | 20 | social | Spam warning issued |
| `DISPUTE_LOST` | -5 | 10 | arbitration | Lost dispute resolution |
| `FRAUD_CONFIRMED` | -20 | 1 | arbitration | Confirmed fraudulent activity |

**Daily Limits:**
- Daily limits reset at UTC midnight
- Exceeding daily limit returns `429 Too Many Requests`
- Implemented via Redis counter (key: `rep:{profileId}:{code}:{date}`)

---

## Badge Catalog

Standard badges available in the system:

### Marketplace Badges

- **`verified_seller`**: Verified seller status (requires KYC)
- **`trusted_buyer`**: 50+ successful orders
- **`power_seller`**: 500+ sales, 95%+ positive reviews

### System Badges

- **`early_adopter`**: Registered in first month
- **`community_contributor`**: Active community participation
- **`beta_tester`**: Participated in beta testing

### Social Badges

- **`influencer`**: 1000+ followers
- **`verified_profile`**: Identity verified via official channels

### Achievement Badges

- **`first_order`**: Completed first order
- **`milestone_100`**: 100 successful transactions
- **`diamond_tier`**: Reached diamond reputation tier

---

## IPFS Metadata Schema

Profile metadata stored on IPFS follows this schema:

```json
{
  "schema_version": "1.0.0",
  "profile": {
    "display_name": "Alice in Wonderland",
    "bio": "Blockchain enthusiast",
    "avatar_cid": "QmAvatar123",
    "banner_cid": "QmBanner456",
    "joined_at": "2025-10-01T10:00:00Z"
  },
  "reputation": {
    "score": 150,
    "tier": "prata",
    "since": "2025-10-01T10:00:00Z"
  },
  "badges": [
    {
      "code": "verified_seller",
      "label": {
        "pt": "Vendedor Verificado",
        "en": "Verified Seller",
        "es": "Vendedor Verificado"
      },
      "issued_by": "marketplace",
      "issued_at": 12100
    }
  ],
  "penalties": [],
  "links": {
    "website": "https://alice.example.com",
    "twitter": "@alice_crypto"
  }
}
```

---

## WebSocket Events

Real-time profile events via WebSocket (`wss://api.bazari.dev/ws`):

### Subscribe to Profile Updates

```json
{
  "type": "subscribe",
  "channel": "profile:alice"
}
```

### Reputation Changed Event

```json
{
  "type": "reputation_changed",
  "data": {
    "profileId": "profile_abc",
    "handle": "alice",
    "oldScore": 147,
    "newScore": 150,
    "reasonCode": "ORDER_COMPLETED",
    "timestamp": "2025-10-06T12:00:00Z"
  }
}
```

### Badge Awarded Event

```json
{
  "type": "badge_awarded",
  "data": {
    "profileId": "profile_abc",
    "handle": "alice",
    "badge": {
      "code": "verified_seller",
      "issuedBy": "marketplace",
      "issuedAt": "2025-10-06T12:00:00Z"
    }
  }
}
```

---

## Rate Limiting

API endpoints are rate-limited per IP address:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/login-siws` | 10 requests | 15 minutes |
| `/me/profile` (PUT) | 20 requests | 1 hour |
| `/profiles/:handle` (GET) | 100 requests | 1 minute |
| `/profiles/:handle/reputation` | 50 requests | 1 minute |
| `/profiles/:handle/badges` | 50 requests | 1 minute |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1696599600
```

**Exceeded Response (429):**
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again in 45 seconds.",
  "retryAfter": 45
}
```

---

## Error Responses

Standard error format:

```json
{
  "error": "ErrorType",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional context"
  }
}
```

### HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate resource)
- `429`: Too Many Requests (rate limit)
- `500`: Internal Server Error
- `503`: Service Unavailable (blockchain connection error)

---

## Testing

### cURL Examples

**Login and mint NFT:**
```bash
curl -X POST https://api.bazari.dev/api/auth/login-siws \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      "domain": "bazari.dev",
      "uri": "https://bazari.dev",
      "version": "1",
      "chainId": "bazari-testnet",
      "nonce": "abc123",
      "issuedAt": "2025-10-06T12:00:00Z"
    },
    "signature": "0x..."
  }'
```

**Get profile:**
```bash
curl https://api.bazari.dev/api/profiles/alice
```

**Get reputation history:**
```bash
curl https://api.bazari.dev/api/profiles/alice/reputation?limit=50
```

**Get badges:**
```bash
curl https://api.bazari.dev/api/profiles/alice/badges
```

### TypeScript SDK Example

```typescript
import { BazariClient } from '@bazari/sdk';

const client = new BazariClient({
  baseUrl: 'https://api.bazari.dev/api',
  chainUrl: 'wss://rpc.bazari.dev'
});

// Login (automatically mints NFT on first login)
const { token, profile } = await client.auth.loginWithSIWS(message, signature);

// Get profile
const profile = await client.profiles.get('alice');

// Get reputation
const reputation = await client.profiles.getReputation('alice');

// Get badges
const badges = await client.profiles.getBadges('alice');
```

---

## Changelog

### v1.0.0 (2025-10-06)

- ✅ Initial release
- ✅ Soulbound NFT profiles
- ✅ Reputation system with tiers
- ✅ Badge system
- ✅ Automatic NFT minting on first login
- ✅ IPFS metadata integration
- ✅ WebSocket real-time events

---

## Support

- **Documentation**: https://docs.bazari.dev/api
- **Issues**: https://github.com/bazari/bazari/issues
- **Discord**: https://discord.gg/bazari
