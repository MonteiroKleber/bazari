# Auth Module - Vision & Purpose

## 🎯 Vision

**"Prover autenticação Web3-native segura, descentralizada e sem fricção para todos os módulos da plataforma Bazari."**

---

## 📋 Purpose

O módulo **Auth** é o módulo **transversal** responsável por:

1. **Authentication** - Verificar identidade através de assinaturas criptográficas (SIWS)
2. **Authorization** - Controlar acesso a recursos protegidos
3. **Session Management** - Gerenciar sessões com JWT e refresh tokens
4. **Security** - Prevenir replay attacks, CSRF e outras vulnerabilidades

---

## 🌟 Key Principles

### 1. Web3-Native
- Autenticação via assinatura de mensagem (SIWS - Sign-In with Substrate)
- Sem senha tradicional
- Wallet como identidade única

### 2. Stateless & Scalable
- JWT tokens stateless (não requerem lookup no DB)
- Refresh tokens para longevidade de sessão
- Horizontal scaling sem session store compartilhado

### 3. Security-First
- Nonce único por tentativa de login
- Nonce expira em 5 minutos
- JWT expira em 15 minutos
- Refresh token expira em 30 dias
- Rotation automática de refresh tokens

### 4. Developer-Friendly
- Middleware simples (`requireAuth`)
- User context injetado automaticamente (`req.user`)
- Error messages claros

---

## 🏗️ Architecture

### Components

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (Web)                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  Keyring (Polkadot.js)                        │  │
│  │  - Generate/Import Account                    │  │
│  │  - Sign Messages                              │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  Session Store (Zustand)                      │  │
│  │  - Access Token (memory)                      │  │
│  │  - Refresh Token (cookie)                     │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        ▼ HTTPS
┌─────────────────────────────────────────────────────┐
│                   Backend (API)                      │
│  ┌───────────────────────────────────────────────┐  │
│  │  SIWS Verifier                                │  │
│  │  - Verify Signature                           │  │
│  │  - Check Nonce                                │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  JWT Manager                                  │  │
│  │  - Issue Access Token                         │  │
│  │  - Issue Refresh Token                        │  │
│  │  - Verify Token                               │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  Auth Middleware                              │  │
│  │  - Extract Token from Header                  │  │
│  │  - Verify & Decode                            │  │
│  │  - Inject req.user                            │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────┐
│                  Database (PostgreSQL)               │
│  ┌───────────────────────────────────────────────┐  │
│  │  User                                         │  │
│  │  - id, address, createdAt                     │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  AuthNonce                                    │  │
│  │  - nonce, address, expiresAt, usedAt          │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  RefreshToken                                 │  │
│  │  - tokenHash, userId, revokedAt               │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 Authentication Flow

### 1. Request Nonce

```
Client → POST /api/auth/nonce
         { address: "5GrwvaEF5..." }

Server → Generate Nonce
      → Store in DB (AuthNonce)
      → Return { nonce, message, expiresAt }
```

### 2. Sign Message

```
Client → Sign SIWS Message with Wallet
         message = "bazari.xyz wants you to sign in..."
         signature = keyring.sign(message)
```

### 3. Verify Signature

```
Client → POST /api/auth/verify
         { address, signature, nonce }

Server → Verify Signature (verifySiws)
      → Check Nonce (not used, not expired)
      → Mark Nonce as Used
      → Create/Get User
      → Generate JWT (access + refresh)
      → Return { accessToken, user }
```

### 4. Access Protected Resource

```
Client → GET /api/orders
         Authorization: Bearer <accessToken>

Server → Middleware extracts token
      → Verify JWT signature
      → Check expiration
      → Decode payload
      → Inject req.user = { id, address }
      → Continue to handler
```

### 5. Refresh Token

```
Client → POST /api/auth/refresh
         Cookie: refreshToken=...

Server → Verify refresh token
      → Check if not revoked
      → Issue new access token
      → Rotate refresh token
      → Return { accessToken }
```

---

## 🛡️ Security Features

### Nonce Management
- Único por tentativa
- Expira em 5 minutos
- Marca como usado após verificação
- Previne replay attacks

### JWT Tokens
- HS256 (HMAC with SHA-256)
- Short-lived (15 min)
- Payload: `{ userId, address, iat, exp }`
- Assinado com secret env var

### Refresh Tokens
- SHA-256 hash stored in DB
- Long-lived (30 days)
- Rotation automática
- Revogação manual (logout)

### HTTPS Only
- Cookies com `Secure` flag
- `HttpOnly` flag (não acessível via JS)
- `SameSite=Strict` (CSRF protection)

---

## 📊 Metrics & Monitoring

### Success Metrics

| Metric | Target |
|--------|--------|
| Auth Success Rate | >99% |
| Avg Auth Latency | <200ms |
| Token Refresh Rate | >95% |
| Session Duration | >7 days (avg) |

### Security Metrics

| Metric | Threshold |
|--------|-----------|
| Failed Auth Attempts | <1% |
| Replay Attack Detections | 0 |
| Expired Token Usage | <0.1% |
| Revoked Token Usage | 0 |

---

## 🔮 Future Enhancements

### 1. Multi-Factor Authentication (MFA)
- TOTP (Google Authenticator)
- WebAuthn (Passkey)
- Email confirmation (optional)

### 2. Session Management
- Multiple device sessions
- Active session list
- Revoke individual sessions
- Suspicious activity detection

### 3. Role-Based Access Control (RBAC)
- Roles: user, seller, deliverer, moderator, admin
- Permissions per resource
- Fine-grained authorization

### 4. OAuth Integration
- Login with Wallet (WalletConnect, MetaMask)
- Login with Social (Google, GitHub) + wallet link

### 5. Audit Logging
- All auth events logged
- Failed attempts tracked
- Suspicious patterns detected
- GDPR-compliant retention

---

## 🎓 Developer Guide

### Using Auth Middleware

```typescript
// apps/api/src/routes/orders.ts
import { requireAuth } from '../lib/auth/middleware.js'

export async function ordersRoutes(app: FastifyInstance) {
  app.get('/api/orders', { preHandler: requireAuth }, async (req, reply) => {
    const userId = req.user.id        // Injected by middleware
    const address = req.user.address  // Substrate address

    const orders = await prisma.order.findMany({
      where: { buyerAddr: address }
    })

    return orders
  })
}
```

### Optional Auth (Public + Private)

```typescript
import { optionalAuth } from '../lib/auth/middleware.js'

app.get('/api/products', { preHandler: optionalAuth }, async (req, reply) => {
  const userId = req.user?.id  // undefined if not authenticated

  // Show personalized results if authenticated
  if (userId) {
    return getRecommendedProducts(userId)
  }

  // Show generic results for anonymous
  return getAllProducts()
})
```

---

**Document Owner:** Auth Module Team
**Last Updated:** 2025-11-02
**Version:** 1.0.0
**Status:** ✅ Implemented & Production-Ready
