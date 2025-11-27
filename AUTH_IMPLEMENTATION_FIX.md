# Fix de Autenticação - Órdenes com userId Real

## Problema
Em `/root/bazari/apps/api/src/routes/orders.ts`, há duas linhas que precisam correção:
- **Linha 213:** `const userId = buyerAddr;` (usando placeholder 'buyer-placeholder')
- **Linha 671:** `const buyerUserId = order.buyerAddr;` (usando wallet em vez de userId)

## Solução Implementação

### Passo 1: Adicionar Import (no topo do arquivo)

```typescript
import { authOnRequest } from '../lib/auth/middleware.js';
```

### Passo 2: Corrigir POST /orders (começa na linha 72)

**ANTES:**
```typescript
// POST /orders - Criar pedido
app.post('/orders', async (request, reply) => {
  try {
    // Handle Idempotency-Key
    const idemKey = (request.headers['idempotency-key'] || request.headers['Idempotency-Key']) as string | undefined;
    if (idemKey) {
      const cached = idempotencyCache.get(idemKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.payload;
      }
    }

    const body = createOrderSchema.parse(request.body);

    // TODO: Obter endereço do comprador do auth/session
    const buyerAddr = 'buyer-placeholder'; // Será implementado com auth
```

**DEPOIS:**
```typescript
// POST /orders - Criar pedido
app.post('/orders', {
  preHandler: authOnRequest,  // <- ADICIONAR MIDDLEWARE
}, async (request, reply) => {
  try {
    // Handle Idempotency-Key
    const idemKey = (request.headers['idempotency-key'] || request.headers['Idempotency-Key']) as string | undefined;
    if (idemKey) {
      const cached = idempotencyCache.get(idemKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.payload;
      }
    }

    // <- ADICIONAR: Extrair autenticação
    const authUser = (request as any).authUser as { sub: string } | undefined;
    if (!authUser) {
      return reply.status(401).send({ error: 'Token de autenticação ausente.' });
    }

    const body = createOrderSchema.parse(request.body);

    // <- MUDAR: Obter userId e wallet do usuário autenticado
    const userId = authUser.sub;  // User.id (UUID)
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { address: true }
    });
    if (!user) {
      return reply.status(400).send({ error: 'Usuário não encontrado.' });
    }
    
    const buyerAddr = user.address;  // Wallet address do usuário
```

### Passo 3: Corrigir linha 213 (Rewards hook - POST /orders)

**ANTES (linha ~213):**
```typescript
      // ============================================
      // Rewards: Trigger afterOrderCreated hook
      // ============================================
      // TODO: Get real userId from auth - using buyerAddr as placeholder
      const userId = buyerAddr; // Replace with actual userId from session
      await afterOrderCreated(prisma, userId, order.id).catch((err) => {
```

**DEPOIS:**
```typescript
      // ============================================
      // Rewards: Trigger afterOrderCreated hook
      // ============================================
      // userId já foi definido acima com authUser.sub - usar direto
      await afterOrderCreated(prisma, userId, order.id).catch((err) => {
```

### Passo 4: Corrigir POST /orders/:id/release (começa na linha ~582)

**ANTES:**
```typescript
  // POST /orders/:id/release - Liberar order (seller confirma entrega)
  app.post('/orders/:id/release', async (request, reply) => {
    try {
      const { id } = orderParamsSchema.parse(request.params);

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          items: true,
          paymentIntents: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!order) {
        return reply.status(404).send({
          error: 'Order não encontrada',
          message: `Order com ID ${id} não existe`,
        });
      }
```

**DEPOIS:**
```typescript
  // POST /orders/:id/release - Liberar order (seller confirma entrega)
  app.post('/orders/:id/release', {
    preHandler: authOnRequest,  // <- ADICIONAR MIDDLEWARE
  }, async (request, reply) => {
    try {
      const authUser = (request as any).authUser as { sub: string } | undefined;
      if (!authUser) {
        return reply.status(401).send({ error: 'Token de autenticação ausente.' });
      }

      const { id } = orderParamsSchema.parse(request.params);

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          items: true,
          paymentIntents: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!order) {
        return reply.status(404).send({
          error: 'Order não encontrada',
          message: `Order com ID ${id} não existe`,
        });
      }

      // <- ADICIONAR: Validar que o seller é quem está fazendo a requisição
      const seller = await prisma.user.findUnique({
        where: { id: authUser.sub },
        select: { address: true }
      });
      if (!seller || seller.address !== order.sellerAddr) {
        return reply.status(403).send({ 
          error: 'Não autorizado',
          message: 'Apenas o vendedor pode liberar este pedido'
        });
      }
```

### Passo 5: Corrigir linha 671 (Rewards hook - POST /orders/:id/release)

**ANTES (linha ~671):**
```typescript
      // ============================================
      // Rewards: Trigger afterOrderCompleted hook
      // ============================================
      // TODO: Get real userId from auth - using buyerAddr as placeholder
      const buyerUserId = order.buyerAddr; // Replace with actual userId from session
      const orderTotalBzr = order.totalBzr.toString();
      await afterOrderCompleted(prisma, buyerUserId, order.id, orderTotalBzr).catch((err) => {
```

**DEPOIS:**
```typescript
      // ============================================
      // Rewards: Trigger afterOrderCompleted hook
      // ============================================
      // Converter wallet address para userId
      const buyer = await prisma.user.findUnique({
        where: { address: order.buyerAddr },
        select: { id: true }
      });
      const buyerUserId = buyer?.id;
      if (!buyerUserId) {
        app.log.warn({
          orderId: order.id,
          buyerAddr: order.buyerAddr
        }, 'Comprador não encontrado, rewards não processados');
      } else {
        const orderTotalBzr = order.totalBzr.toString();
        await afterOrderCompleted(prisma, buyerUserId, order.id, orderTotalBzr).catch((err) => {
```

Não esquecer de fechar o else:
```typescript
        });
      }
```

## Resumo das Mudanças

| Local | Antes | Depois |
|-------|-------|--------|
| Import | (faltava) | `import { authOnRequest }` |
| Line 72 | `app.post('/orders', async ...)` | `app.post('/orders', { preHandler: authOnRequest }, async ...)` |
| Line 85-86 | `const buyerAddr = 'buyer-placeholder'` | `const authUser = ...` + query user |
| Line 213 | `const userId = buyerAddr` | (já definido acima) |
| Line 582 | `app.post('/orders/:id/release', async ...)` | `app.post('/orders/:id/release', { preHandler: authOnRequest }, async ...)` |
| Line 671 | `const buyerUserId = order.buyerAddr` | Query user pela wallet |

## Testes Recomendados

```bash
# 1. Testar sem token (deve retornar 401)
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{...}'

# 2. Testar com token válido
curl -X POST http://localhost:3000/orders \
  -H "Authorization: Bearer <seu-token-jwt>" \
  -H "Content-Type: application/json" \
  -d '{...}'

# 3. Verificar que userId é passado corretamente aos rewards
# Adicionar log: console.log({ userId, buyerAddr })
```

## Referências
- Middleware: `/root/bazari/apps/api/src/lib/auth/middleware.ts`
- Exemplo correto: `/root/bazari/apps/api/src/routes/social.ts` (linhas 13-72)
- Schema: `/root/bazari/apps/api/prisma/schema.prisma` (models User, Profile, Order)

