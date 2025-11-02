# Auth Module - API Reference

## 📡 REST API Endpoints

Base URL: `https://api.bazari.xyz` (production) | `http://localhost:3000` (development)

---

## 1. Request Nonce

**Endpoint:** `POST /api/auth/nonce`
**Description:** Gera um nonce único para iniciar processo de autenticação SIWS
**Authentication:** None (public)

### Request

```json
{
  "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
}
```

#### Request Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| address | string | ✅ | Substrate address (SS58 format) |

### Response (200 OK)

```json
{
  "nonce": "a3f5c8b2e9d14f7c6b5a8e3d2c1f9a7b",
  "message": "bazari.xyz wants you to sign in with your Substrate account:\n5GrwvaEF...\n\nSign in to Bazari Platform\n\nURI: https://bazari.xyz\nVersion: 1\nChain: Bazari Mainnet\nGenesis: 0x1234...\nNonce: a3f5c8b2...\nIssued At: 2025-11-02T10:30:00Z",
  "expiresAt": "2025-11-02T10:35:00Z"
}
```

#### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| nonce | string | Nonce único (hex 32 bytes) |
| message | string | Mensagem SIWS formatada para assinatura |
| expiresAt | string (ISO 8601) | Timestamp de expiração (5 min) |

### Error Responses

#### 400 Bad Request

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Invalid Substrate address format"
}
```

#### 429 Too Many Requests

```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again in 1 minute."
}
```

---

## 2. Verify Signature & Login

**Endpoint:** `POST /api/auth/verify`
**Description:** Verifica assinatura SIWS e emite tokens JWT
**Authentication:** None (public)

### Request

```json
{
  "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "signature": "0x1234567890abcdef...",
  "nonce": "a3f5c8b2e9d14f7c6b5a8e3d2c1f9a7b"
}
```

#### Request Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| address | string | ✅ | Substrate address (SS58 format) |
| signature | string | ✅ | Assinatura da mensagem SIWS (hex) |
| nonce | string | ✅ | Nonce retornado em `/auth/nonce` |

### Response (200 OK)

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    "createdAt": "2025-01-15T10:00:00Z",
    "profile": {
      "id": "650e8400-e29b-41d4-a716-446655440001",
      "handle": "alice",
      "displayName": "Alice",
      "avatarUrl": "https://ipfs.io/ipfs/Qm...",
      "reputationScore": 850,
      "reputationTier": "gold"
    }
  }
}
```

#### Response Schema

| Field | Type | Description |
|-------|------|-------------|
| accessToken | string | JWT access token (15 min) |
| user | object | User object com profile |
| user.id | string (UUID) | User ID |
| user.address | string | Substrate address |
| user.profile | object | Profile object (se existir) |

#### Response Headers

```
Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000; Path=/
```

### Error Responses

#### 400 Bad Request - Invalid Signature

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Invalid signature"
}
```

#### 400 Bad Request - Nonce Not Found

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Nonce not found or already used"
}
```

#### 400 Bad Request - Nonce Expired

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Nonce expired"
}
```

---

## 3. Refresh Access Token

**Endpoint:** `POST /api/auth/refresh`
**Description:** Renova access token usando refresh token
**Authentication:** Refresh token (cookie)

### Request

```
POST /api/auth/refresh
Cookie: refreshToken=...
```

No body required.

### Response (200 OK)

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Response Headers

```
Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000; Path=/
```

(Novo refresh token rotacionado)

### Error Responses

#### 401 Unauthorized - No Refresh Token

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Refresh token not found"
}
```

#### 401 Unauthorized - Invalid/Revoked Token

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid or revoked refresh token"
}
```

---

## 4. Get Current User

**Endpoint:** `GET /api/auth/me`
**Description:** Retorna usuário autenticado atual
**Authentication:** Bearer token (required)

### Request

```
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response (200 OK)

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    "createdAt": "2025-01-15T10:00:00Z",
    "profile": {
      "id": "650e8400-e29b-41d4-a716-446655440001",
      "handle": "alice",
      "displayName": "Alice",
      "bio": "Blockchain enthusiast",
      "avatarUrl": "https://ipfs.io/ipfs/Qm...",
      "reputationScore": 850,
      "reputationTier": "gold",
      "followersCount": 120,
      "followingCount": 80
    }
  }
}
```

### Error Responses

#### 401 Unauthorized - No Token

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Authorization header missing"
}
```

#### 401 Unauthorized - Invalid Token

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid token"
}
```

---

## 5. Logout

**Endpoint:** `POST /api/auth/logout`
**Description:** Revoga refresh token e encerra sessão
**Authentication:** Bearer token (required)

### Request

```
POST /api/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Cookie: refreshToken=...
```

No body required.

### Response (200 OK)

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### Response Headers

```
Set-Cookie: refreshToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/
```

(Cookie deletado)

---

## 🔐 Authentication Flow

### Complete Flow Diagram

```
┌──────────┐                                    ┌──────────┐
│  Client  │                                    │   API    │
└─────┬────┘                                    └─────┬────┘
      │                                               │
      │  1. POST /api/auth/nonce                     │
      │  { address: "5GrwvaEF..." }                  │
      │──────────────────────────────────────────────>│
      │                                               │
      │  2. { nonce, message, expiresAt }            │
      │<──────────────────────────────────────────────│
      │                                               │
      │  3. Sign message with wallet                 │
      │     signature = keyring.sign(message)        │
      │                                               │
      │  4. POST /api/auth/verify                    │
      │  { address, signature, nonce }               │
      │──────────────────────────────────────────────>│
      │                                               │
      │                        5. Verify signature   │
      │                        6. Check nonce        │
      │                        7. Create/Get User    │
      │                        8. Generate JWT       │
      │                                               │
      │  9. { accessToken, user }                    │
      │     Set-Cookie: refreshToken=...             │
      │<──────────────────────────────────────────────│
      │                                               │
      │  10. Store accessToken in memory             │
      │      Store refreshToken in cookie            │
      │                                               │
      │  11. GET /api/orders                         │
      │  Authorization: Bearer <accessToken>         │
      │──────────────────────────────────────────────>│
      │                                               │
      │                        12. Verify JWT        │
      │                        13. Process request   │
      │                                               │
      │  14. { orders: [...] }                       │
      │<──────────────────────────────────────────────│
      │                                               │
      │  ... (15 min later, token expires)           │
      │                                               │
      │  15. GET /api/orders                         │
      │  Authorization: Bearer <expiredToken>        │
      │──────────────────────────────────────────────>│
      │                                               │
      │  16. 401 Unauthorized                        │
      │<──────────────────────────────────────────────│
      │                                               │
      │  17. POST /api/auth/refresh                  │
      │  Cookie: refreshToken=...                    │
      │──────────────────────────────────────────────>│
      │                                               │
      │                        18. Verify refresh    │
      │                        19. Generate new JWT  │
      │                        20. Rotate refresh    │
      │                                               │
      │  21. { accessToken }                         │
      │     Set-Cookie: refreshToken=<new>           │
      │<──────────────────────────────────────────────│
      │                                               │
      │  22. Retry GET /api/orders                   │
      │  Authorization: Bearer <newAccessToken>      │
      │──────────────────────────────────────────────>│
      │                                               │
      │  23. { orders: [...] }                       │
      │<──────────────────────────────────────────────│
```

---

## 🛠️ Middleware Usage

### requireAuth Middleware

Protege rotas que requerem autenticação.

```typescript
import { requireAuth } from '../lib/auth/middleware.js'

app.get('/api/orders', { preHandler: requireAuth }, async (req, reply) => {
  const userId = req.user.id        // Injected by middleware
  const address = req.user.address  // Substrate address

  // Access protected resource
})
```

### optionalAuth Middleware

Permite acesso público, mas injeta user se autenticado.

```typescript
import { optionalAuth } from '../lib/auth/middleware.js'

app.get('/api/products', { preHandler: optionalAuth }, async (req, reply) => {
  const userId = req.user?.id  // undefined if not authenticated

  if (userId) {
    return getPersonalizedProducts(userId)
  }

  return getPublicProducts()
})
```

---

## 📊 Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/auth/nonce | 10 requests | 1 minute |
| POST /api/auth/verify | 5 requests | 1 minute |
| POST /api/auth/refresh | 20 requests | 1 minute |
| GET /api/auth/me | 100 requests | 1 minute |

**Note:** Rate limits são por IP address. Usuários autenticados podem ter limites mais altos.

---

## 🔒 Security Considerations

### Token Storage

**Access Token:**
- ✅ Store in memory (React state, Zustand)
- ❌ Do NOT store in localStorage (XSS vulnerable)
- ❌ Do NOT store in cookies (CSRF vulnerable)

**Refresh Token:**
- ✅ Store in HttpOnly cookies
- ✅ Use SameSite=Strict
- ✅ Use Secure flag (HTTPS only)
- ❌ Do NOT store in memory or localStorage

### HTTPS

**Production:**
- ✅ All endpoints MUST use HTTPS
- ✅ HSTS header enabled
- ✅ Certificate pinning recommended

**Development:**
- ⚠️ HTTP allowed for localhost only
- ⚠️ Secure cookie flag disabled

---

**Document Owner:** Auth Module Team
**Last Updated:** 2025-11-02
**Version:** 1.0.0
