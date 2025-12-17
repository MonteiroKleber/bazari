# Referência Rápida - Sistema de Autenticação Bazari

## 1. Fluxo de Autenticação (Simplificado)

```
Cliente                                          API
   │                                              │
   ├─ POST /auth/nonce { address }  ────────────>│
   │                                        Gera nonce
   │
   ├─ POST /auth/login-siws                      │
   │  { address, message, signature }  ────────>│
   │                                    Verifica assinatura
   │                                    Cria/busca User
   │<──── { accessToken, refreshToken } ────────┤
   │
   ├─ POST /orders                               │
   │  Authorization: Bearer <accessToken> ─────>│
   │                                 Middleware:authOnRequest
   │                                 ↓ populaRequest.authUser
   │<────────── 201 Created ──────────────────────┤
```

## 2. AccessToken JWT Payload

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",  // User.id (UUID)
  "address": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",  // User.address (wallet)
  "type": "access",
  "iat": 1731590400,
  "exp": 1731591300
}
```

## 3. Como Usar em Endpoints

### Com Autenticação Obrigatória

```typescript
import { authOnRequest } from '../lib/auth/middleware.js';

app.post('/endpoint', { preHandler: authOnRequest }, async (req, reply) => {
  const authUser = (req as any).authUser as { sub: string; address: string };
  
  // authUser.sub = User.id
  // authUser.address = User.address (wallet)
});
```

### Com Autenticação Opcional

```typescript
import { optionalAuthOnRequest } from '../lib/auth/middleware.js';

app.get('/endpoint', { preHandler: optionalAuthOnRequest }, async (req, reply) => {
  const authUser = (req as any).authUser as { sub: string; address: string } | undefined;
  
  if (authUser) {
    // Usuario autenticado
  } else {
    // Usuario publico
  }
});
```

## 4. Conversões Essenciais

### De JWT para User

```typescript
const userId = authUser.sub;  // ← User.id

const user = await prisma.user.findUnique({
  where: { id: userId }
});
// user.id = User.id (UUID)
// user.address = User.address (wallet)
```

### De User.id para Wallet

```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { address: true }
});
const wallet = user?.address;  // ← Substrate address
```

### De Wallet para User.id

```typescript
const user = await prisma.user.findUnique({
  where: { address: wallet },
  select: { id: true }
});
const userId = user?.id;  // ← UUID
```

### De JWT para Profile

```typescript
const profile = await prisma.profile.findUnique({
  where: { userId: authUser.sub },  // authUser.sub = User.id
  select: { id: true, handle: true }
});
```

## 5. Campo vs Significado

| Campo | Tipo | Exemplo | Nota |
|-------|------|---------|------|
| `authUser.sub` | UUID | `550e8400-e29b-41d4...` | = User.id |
| `authUser.address` | SS58 | `5GrwvaEF5zXb26Fz9...` | = User.address (wallet) |
| `User.id` | UUID | `550e8400-e29b-41d4...` | PK (primary key) |
| `User.address` | SS58 | `5GrwvaEF5zXb26Fz9...` | Substrate address, UNIQUE |
| `Profile.userId` | UUID | `550e8400-e29b-41d4...` | FK para User.id |
| `Profile.id` | CUID | `clh1jk3a4000a...` | Profile ID |
| `Order.buyerAddr` | SS58 | `5GrwvaEF5zXb26Fz9...` | Wallet, NOT User.id! |
| `Order.sellerAddr` | SS58 | `5GrwvaEF5zXb26Fz9...` | Wallet, NOT User.id! |

## 6. Padrão ERRADO vs CORRETO

### ERRADO 1: Usar Order.buyerAddr como User.id

```typescript
// ERRADO!
const user = await prisma.user.findUnique({
  where: { id: order.buyerAddr }  // ❌ buyerAddr não é UUID!
});
```

### ERRADO 2: Atribuir wallet a variável userId

```typescript
// ERRADO!
const userId = order.buyerAddr;  // ❌ Agora userId é um SS58 address!
await afterOrderCreated(prisma, userId, ...);  // ❌ Tipo errado!
```

### ERRADO 3: Usar buyerAddr sem middleware

```typescript
// ERRADO!
app.post('/orders', async (req, reply) => {
  const buyerAddr = 'buyer-placeholder';  // ❌ Hardcoded!
  const userId = buyerAddr;  // ❌ userId = 'buyer-placeholder'
});
```

### CORRETO: Usar authUser.sub

```typescript
// CORRETO!
app.post('/orders', { preHandler: authOnRequest }, async (req, reply) => {
  const authUser = (req as any).authUser as { sub: string };
  const userId = authUser.sub;  // ✓ userId = User.id (UUID)
  
  const user = await prisma.user.findUnique({
    where: { id: userId }  // ✓ Consulta por UUID
  });
});
```

## 7. Middleware Functions

### authOnRequest (Obrigatório)

```typescript
// Em: /root/bazari/apps/api/src/lib/auth/middleware.ts
export async function authOnRequest(request: FastifyRequest, reply: FastifyReply)
```

- Extrai token Bearer do header
- Decodifica JWT
- Popula `request.authUser`
- Retorna 401 se falhar

### optionalAuthOnRequest (Opcional)

```typescript
// Em: /root/bazari/apps/api/src/lib/auth/middleware.ts
export async function optionalAuthOnRequest(request: FastifyRequest, reply: FastifyReply)
```

- Tenta extrair e decodificar token
- Popula `request.authUser` se sucesso
- Continua sem erro se falhar

## 8. Tipos TypeScript

```typescript
interface AccessTokenPayload {
  sub: string;      // User.id
  address: string;  // User.address
  type: 'access';
}

interface MinimalUser {
  id: string;       // User.id
  address: string;  // User.address
}
```

## 9. Endpoints Exemplo (CORRETOS)

### /routes/social.ts - POST /social/follow

```typescript
app.post('/social/follow', {
  preHandler: authOnRequest,
}, async (request, reply) => {
  const authUser = (request as any).authUser as { sub: string } | undefined;
  if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

  const meProfile = await prisma.profile.findUnique({ 
    where: { userId: authUser.sub },  // ← authUser.sub = User.id
    select: { id: true }
  });
});
```

### /routes/posts.ts - POST /posts

```typescript
app.post('/posts', {
  preHandler: authOnRequest,
}, async (request, reply) => {
  const authUser = (request as any).authUser as { sub: string } | undefined;
  if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

  const meProfile = await prisma.profile.findUnique({ 
    where: { userId: authUser.sub },  // ← authUser.sub = User.id
    select: { id: true }
  });
});
```

## 10. Checklist para Novo Endpoint Autenticado

- [ ] Importar `authOnRequest` do middleware
- [ ] Adicionar `preHandler: authOnRequest` ao route config
- [ ] Extrair `authUser` do request com type guard
- [ ] Validar que `authUser` existe (return 401 se não)
- [ ] Usar `authUser.sub` como User.id
- [ ] Se precisar wallet, fazer query: `user.findUnique({ id: authUser.sub })`
- [ ] NUNCA confundir Order.buyerAddr (wallet) com User.id (UUID)

---

**Última Atualização:** 2025-11-14  
**Documentação Completa:** `/root/bazari/AUTH_SYSTEM_INVESTIGATION.md`  
**Implementação do Fix:** `/root/bazari/AUTH_IMPLEMENTATION_FIX.md`
