# Profile Module - API Reference

## 📡 REST API Endpoints

Base URL: `https://api.bazari.xyz` | `http://localhost:3000`

---

## 1. Get Profile by Handle

**`GET /api/profiles/:handle`**

Retorna perfil público completo.

### Request
```http
GET /api/profiles/alice
Authorization: Bearer <token> (optional)
```

### Response (200 OK)
```json
{
  "profile": {
    "id": "clx...",
    "handle": "alice",
    "displayName": "Alice Silva",
    "bio": "Blockchain enthusiast 🚀",
    "avatarUrl": "https://ipfs.io/ipfs/Qm...",
    "bannerUrl": "https://ipfs.io/ipfs/Qm...",
    "reputationScore": 850,
    "reputationTier": "gold",
    "isVerified": true,
    "followersCount": 120,
    "followingCount": 80,
    "postsCount": 45
  },
  "badges": [
    {"code": "EARLY_ADOPTER", "label": {"pt": "Pioneiro"}, "issuedAt": "2025-01-15T10:00:00Z"}
  ],
  "sellerProfile": {
    "shopName": "Alice's Store",
    "shopSlug": "alice-store",
    "ratingAvg": 4.8,
    "ratingCount": 23
  },
  "viewer": {
    "isSelf": false,
    "isFollowing": true
  }
}
```

---

## 2. Update Own Profile

**`PUT /api/profiles/me`**

Atualiza perfil do usuário autenticado.

### Request
```http
PUT /api/profiles/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "displayName": "Alice Silva",
  "bio": "Web3 builder 🛠️",
  "avatarUrl": "https://ipfs.io/ipfs/Qm...",
  "bannerUrl": "https://ipfs.io/ipfs/Qm...",
  "externalLinks": {
    "twitter": "@alice",
    "github": "alice",
    "website": "https://alice.dev"
  }
}
```

### Response (200 OK)
```json
{
  "profile": { /* updated profile */ }
}
```

---

## 3. Follow User

**`POST /api/profiles/:handle/follow`**

Seguir usuário.

### Request
```http
POST /api/profiles/alice/follow
Authorization: Bearer <token>
```

### Response (200 OK)
```json
{
  "success": true,
  "followersCount": 121
}
```

---

## 4. Unfollow User

**`DELETE /api/profiles/:handle/follow`**

Deixar de seguir usuário.

### Request
```http
DELETE /api/profiles/alice/follow
Authorization: Bearer <token>
```

### Response (200 OK)
```json
{
  "success": true,
  "followersCount": 120
}
```

---

## 5. Get Followers List

**`GET /api/profiles/:handle/followers`**

Lista de seguidores (paginado).

### Request
```http
GET /api/profiles/alice/followers?cursor=clx...&limit=50
```

### Response (200 OK)
```json
{
  "followers": [
    {
      "handle": "bob",
      "displayName": "Bob",
      "avatarUrl": "...",
      "reputationTier": "silver",
      "isFollowing": true
    }
  ],
  "nextCursor": "clx...",
  "hasMore": true
}
```

---

## 6. Get Following List

**`GET /api/profiles/:handle/following`**

Lista de quem o usuário segue.

### Response (200 OK)
```json
{
  "following": [ /* same structure as followers */ ],
  "nextCursor": "clx...",
  "hasMore": true
}
```

---

## 7. Search Profiles

**`GET /api/profiles/search`**

Busca perfis por handle ou nome.

### Request
```http
GET /api/profiles/search?q=alice&limit=20
```

### Response (200 OK)
```json
{
  "profiles": [
    {
      "handle": "alice",
      "displayName": "Alice Silva",
      "avatarUrl": "...",
      "reputationTier": "gold",
      "followersCount": 120
    }
  ],
  "total": 1
}
```

---

## 8. Get Own Reputation History

**`GET /api/profiles/me/reputation`**

Histórico de eventos de reputação.

### Request
```http
GET /api/profiles/me/reputation?cursor=clx...
Authorization: Bearer <token>
```

### Response (200 OK)
```json
{
  "events": [
    {
      "id": "clx...",
      "eventCode": "ORDER_COMPLETED",
      "delta": 50,
      "newTotal": 850,
      "reason": "Pedido #1234 concluído",
      "emittedBy": "marketplace",
      "createdAt": "2025-11-01T15:30:00Z"
    }
  ],
  "nextCursor": "clx...",
  "hasMore": true
}
```

---

## 9. Change Handle (Paid)

**`POST /api/profiles/me/handle`**

Alterar handle (custa 10 BZR).

### Request
```http
POST /api/profiles/me/handle
Authorization: Bearer <token>
Content-Type: application/json

{
  "newHandle": "alice",
  "txHash": "0x1234..." // Proof of payment
}
```

### Response (200 OK)
```json
{
  "success": true,
  "profile": {
    "handle": "alice"
  }
}
```

### Error Responses
```json
// 400 - Handle taken
{"error": "Handle already taken", "suggestions": ["alice_2", "alice_bzr"]}

// 400 - Invalid format
{"error": "Handle must be 3-20 lowercase alphanumeric characters"}

// 402 - Payment required
{"error": "Insufficient balance. Required: 10 BZR"}
```

---

## 10. Get Trending Profiles

**`GET /api/profiles/trending`**

Perfis em alta (últimos 7 dias).

### Request
```http
GET /api/profiles/trending?limit=10
```

### Response (200 OK)
```json
{
  "profiles": [
    {
      "handle": "bob",
      "displayName": "Bob",
      "avatarUrl": "...",
      "reputationTier": "platinum",
      "followersCount": 5420,
      "growthRate": 2.5
    }
  ]
}
```

---

## 📊 Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| GET /profiles/:handle | 100/min | Per IP |
| POST /follow | 20/min | Per User |
| PUT /profiles/me | 10/min | Per User |
| POST /handle | 1/day | Per User |

---

**Document Owner:** Profile Module Team
**Last Updated:** 2025-11-02
**Version:** 1.0.0
