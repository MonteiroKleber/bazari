# Investigação do Sistema de Autenticação - Bazari

## 1. SISTEMA DE AUTH ATUAL - Como Funciona

### 1.1 Middleware de Autenticação
**Arquivo:** `/root/bazari/apps/api/src/lib/auth/middleware.ts`

O sistema usa **Fastify** com middleware JWT/SIWS (Sign In With Substrate):

```typescript
// Middleware obrigatório
export async function authOnRequest(request: FastifyRequest, reply: FastifyReply)
```

**O que faz:**
1. Extrai o token Bearer do header `Authorization: Bearer <token>`
2. Verifica e decodifica o JWT usando `verifyAccessToken()`
3. Popula `request.authUser` com o payload decodificado
4. Retorna 401 se token inválido ou ausente

**Tipo do authUser:**
```typescript
interface AccessTokenPayload {
  sub: string;      // User ID (UUID)
  address: string;  // Substrate address (wallet)
  type: 'access';
}
```

### 1.2 JWT Token Payload
**Arquivo:** `/root/bazari/apps/api/src/lib/auth/jwt.ts`

O token JWT contém:
- `sub`: User.id (UUID) ← **ESTE É O userId REAL**
- `address`: User.address (wallet address)
- `type`: 'access'

**Exemplo de uso:**
```typescript
const payload = verifyAccessToken(token);
// payload.sub = "550e8400-e29b-41d4-a716-446655440000" (User.id)
// payload.address = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY" (wallet)
```

### 1.3 Autenticação SIWS (Sign In With Substrate)
O fluxo completo:
1. Cliente chama `POST /auth/nonce` com endereço wallet
2. Backend cria um nonce e retorna uma mensagem para assinar
3. Cliente assina com sua wallet privada
4. Cliente chama `POST /auth/login-siws` com assinatura
5. Backend verifica a assinatura
6. Backend cria/busca User com esse address
7. Backend cria Profile automático se não existir
8. Backend emite JWT access token + refresh token

---

## 2. PADRÃO CORRETO DE AUTH EM ENDPOINTS

### 2.1 Padrão Usado em `/routes/social.ts` (CORRETO)

```typescript
import { authOnRequest } from '../lib/auth/middleware.js';

app.post('/social/follow', {
  preHandler: authOnRequest,  // Middleware que popula authUser
}, async (request, reply) => {
  // Extrair authUser do request
  const authUser = (request as any).authUser as { sub: string } | undefined;
  
  if (!authUser) {
    return reply.status(401).send({ error: 'Token inválido.' });
  }

  // authUser.sub é o User.id
  const meProfile = await prisma.profile.findUnique({ 
    where: { userId: authUser.sub },  // userId aqui é authUser.sub
    select: { id: true }
  });
});
```

### 2.2 Padrão em `/routes/posts.ts` (CORRETO)

```typescript
app.post('/posts', {
  preHandler: authOnRequest,
}, async (request, reply) => {
  const authUser = (request as any).authUser as { sub: string } | undefined;
  if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });

  const meProfile = await prisma.profile.findUnique({ 
    where: { userId: authUser.sub },  // ← userId = authUser.sub
    select: { id: true }
  });
});
```

---

## 3. PROBLEMA ATUAL EM `/routes/orders.ts`

### Linha 213 (POST /orders):
```typescript
// ERRADO:
const userId = buyerAddr; // Replace with actual userId from session
await afterOrderCreated(prisma, userId, order.id).catch(...);
```

**O Problema:**
- `buyerAddr = 'buyer-placeholder'` (hardcoded!)
- Deveria ser `authUser.sub` do JWT token
- Está passando um string inválido como userId para a função de rewards

### Linha 671 (POST /orders/:id/release):
```typescript
// ERRADO:
const buyerUserId = order.buyerAddr; // Replace with actual userId from session
await afterOrderCompleted(prisma, buyerUserId, order.id, orderTotalBzr).catch(...);
```

**O Problema:**
- `order.buyerAddr` é o endereço da wallet, NÃO o userId
- Deveria recuperar o userId da tabela User/Profile
- Está passando wallet address em vez de User.id

---

## 4. RELAÇÃO User ↔ Profile ↔ Order (Schema Prisma)

### 4.1 Estrutura no Schema

```prisma
model User {
  id        String   @id @default(uuid())    // ← User.id (UUID)
  address   String   @unique                 // ← Wallet address
  profile   Profile?                         // Relação 1:1
  // ...
}

model Profile {
  id        String   @id @default(cuid())    // ← Profile.id
  userId    String   @unique                 // ← Foreign key para User.id
  user      User     @relation(fields: [userId], references: [id])
  // ...
}

model Order {
  id        String   @id @default(uuid())
  buyerAddr String                           // ← WALLET ADDRESS (não é userId!)
  // ...
}
```

### 4.2 Mapeamento Correto

```
JWT Token: { sub: "uuid-user-id", address: "5GrwvaEF..." }
                          ↓
                      User.id
                          ↓
                  Profile.userId
                          ↓
Order.buyerAddr ← Wallet address, NÃO o userId!
```

**IMPORTANTE:** 
- `Order.buyerAddr` armazena apenas o **endereço wallet**
- Para obter o `User.id` a partir do wallet, você precisa fazer:
  ```typescript
  const user = await prisma.user.findUnique({ 
    where: { address: buyerAddr }
  });
  const userId = user.id;
  ```

---

## 5. CÓDIGO CORRETO PARA SUBSTITUIR

### 5.1 Solução Completa para linha 213 (POST /orders)

**Antes (ERRADO):**
```typescript
// Linha 72
app.post('/orders', async (request, reply) => {
  const buyerAddr = 'buyer-placeholder'; // ← HARDCODED!
  
  // ... criar order ...
  
  // Linha 213
  const userId = buyerAddr; // ← ERRADO: userId = 'buyer-placeholder'
  await afterOrderCreated(prisma, userId, order.id).catch(...);
});
```

**Depois (CORRETO):**
```typescript
app.post('/orders', { 
  preHandler: authOnRequest  // ← ADICIONAR MIDDLEWARE
}, async (request, reply) => {
  // ← ADICIONAR: Extrair autenticação
  const authUser = (request as any).authUser as { sub: string } | undefined;
  if (!authUser) {
    return reply.status(401).send({ error: 'Token de autenticação ausente.' });
  }

  // ← MUDAR: Obter userId do authUser.sub
  const userId = authUser.sub; // ← userId real do JWT
  
  // ← OBTER: O endereço wallet do usuário autenticado
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { address: true }
  });
  if (!user) {
    return reply.status(400).send({ error: 'Usuário não encontrado.' });
  }
  
  const buyerAddr = user.address; // ← Endereço wallet real

  // ... resto do código ...
  
  // Linha 213 - CORRETO AGORA
  await afterOrderCreated(prisma, userId, order.id).catch((err) => {
    app.log.error(
      { err, orderId: order.id, userId },
      'Falha ao processar rewards após criação de order'
    );
  });
});
```

### 5.2 Solução para linha 671 (POST /orders/:id/release)

**Antes (ERRADO):**
```typescript
app.post('/orders/:id/release', async (request, reply) => {
  const { id } = orderParamsSchema.parse(request.params);
  const order = await prisma.order.findUnique({ where: { id } });
  
  // Linha 671
  const buyerUserId = order.buyerAddr; // ← ERRADO: usa wallet em vez de userId
  await afterOrderCompleted(prisma, buyerUserId, order.id, orderTotalBzr).catch(...);
});
```

**Depois (CORRETO - Opção 1: Com auth middleware):**
```typescript
app.post('/orders/:id/release', { 
  preHandler: authOnRequest  // ← ADICIONAR
}, async (request, reply) => {
  const authUser = (request as any).authUser as { sub: string } | undefined;
  if (!authUser) {
    return reply.status(401).send({ error: 'Token de autenticação ausente.' });
  }

  const { id } = orderParamsSchema.parse(request.params);
  const order = await prisma.order.findUnique({ where: { id } });
  
  // Validar que o seller é o usuário autenticado
  const seller = await prisma.user.findUnique({
    where: { id: authUser.sub },
    select: { address: true }
  });
  if (!seller || seller.address !== order.sellerAddr) {
    return reply.status(403).send({ error: 'Unauthorized.' });
  }

  // ... atualizar order para RELEASED ...
  
  // Linha 671 - Obter buyerId a partir do buyerAddr
  const buyer = await prisma.user.findUnique({
    where: { address: order.buyerAddr },
    select: { id: true }
  });
  
  const buyerUserId = buyer?.id || order.buyerAddr;
  await afterOrderCompleted(prisma, buyerUserId, order.id, orderTotalBzr).catch(...);
});
```

---

## 6. CHECKLIST DE IMPLEMENTAÇÃO

### [ ] 6.1 Adicionar middleware `authOnRequest` ao endpoint POST /orders
- [ ] Import do middleware: `import { authOnRequest } from '../lib/auth/middleware.js';`
- [ ] Adicionar `preHandler: authOnRequest` ao config do route
- [ ] Extrair `authUser` do request

### [ ] 6.2 Substituir `buyerAddr = 'buyer-placeholder'`
- [ ] Obter User do banco com `userId = authUser.sub`
- [ ] Validar que User existe
- [ ] Extrair `user.address` como `buyerAddr`

### [ ] 6.3 Corrigir linha 213
- [ ] Mudar `const userId = buyerAddr` para `const userId = authUser.sub`
- [ ] Passar userId correto para `afterOrderCreated()`

### [ ] 6.4 Adicionar autenticação ao POST /orders/:id/release
- [ ] Decidir se seller ou buyer precisa estar autenticado
- [ ] Implementar validação de permissão
- [ ] Obter `buyerUserId` corretamente: query User pela wallet

### [ ] 6.5 Corrigir linha 671
- [ ] Query: `await prisma.user.findUnique({ where: { address: order.buyerAddr } })`
- [ ] Usar `user.id` como `buyerUserId`
- [ ] Passar para `afterOrderCompleted()`

### [ ] 6.6 Testar
- [ ] Testar POST /orders sem token (deve retornar 401)
- [ ] Testar POST /orders com token válido (deve usar userId correto)
- [ ] Verificar que rewards são processados com userId correto

---

## 7. EXEMPLOS DE CONVERSÃO WALLET ↔ USER.ID

### Converter de Wallet para User.id
```typescript
const buyerAddr = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const user = await prisma.user.findUnique({
  where: { address: buyerAddr }
});
const buyerUserId = user?.id;  // User.id (UUID)
```

### Converter de User.id para Wallet
```typescript
const userId = authUser.sub;
const user = await prisma.user.findUnique({
  where: { id: userId }
});
const buyerAddr = user?.address;  // Wallet address
```

### Obter Profile.id a partir de JWT
```typescript
const userId = authUser.sub;
const profile = await prisma.profile.findUnique({
  where: { userId: userId }
});
const profileId = profile?.id;  // Profile.id
```

---

## 8. RESUMO FINAL

| Campo | Tipo | Origem | Exemplo |
|-------|------|--------|---------|
| `authUser.sub` | UUID | JWT token | `550e8400-e29b-41d4-a716-446655440000` |
| `User.id` | UUID | Banco (Prisma) | `550e8400-e29b-41d4-a716-446655440000` |
| `authUser.address` | String | JWT token | `5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY` |
| `User.address` | String | Banco (Prisma) | `5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY` |
| `Order.buyerAddr` | String | Banco (Prisma) | `5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY` |
| `Order.sellerAddr` | String | Banco (Prisma) | `5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY` |

**`authUser.sub === User.id`** (SEMPRE!)  
**`authUser.address === User.address`** (SEMPRE!)

---

**Documento Criado:** 2025-11-14  
**Baseado em:** Análise completa do codebase Bazari
