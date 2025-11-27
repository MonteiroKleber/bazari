# Escrow Backend REST API - Implementation Prompt

**Phase**: P1 - Foundation (Week 5-6)
**Effort**: 2-3 dias
**Dependencies**:
- `03-bazari-escrow.md` (Pallet blockchain implementado)
- Frontend escrow implementado

---

## 📋 Contexto

**Problema Atual**:
- ✅ Pallet `bazari-escrow` IMPLEMENTADO e TESTADO (9/9 testes passando)
- ✅ Frontend IMPLEMENTADO (8 hooks, 6 componentes, 2 páginas)
- ❌ Backend REST API **NÃO EXISTE**
- ❌ Frontend chama `/api/blockchain/escrow/*` → **404 Not Found**

**Solução**:
Criar camada REST API (Fastify) que:
- ✅ Conecta frontend → blockchain pallet
- ✅ Traduz HTTP requests → Polkadot.js transactions
- ✅ Retorna txHash real (não mock)
- ✅ Atualiza database (PaymentIntent, EscrowLog)

**Impacto**:
- Frontend funciona com blockchain real
- `PaymentIntent.txHash` será hash real (não NULL/MOCK)
- Usuários podem lock/release/refund funds via UI

---

## 🎯 Objetivo

Implementar REST API Layer para escrow com:

1. **8 endpoints REST** (Fastify routes)
2. **Integração Polkadot.js** com pallet `bazari-escrow`
3. **Database sync** (PaymentIntent, EscrowLog)
4. **Authentication** (usar wallet address do authUser)
5. **Error handling** robusto

**Output esperado**:
- ✅ Arquivo `apps/api/src/routes/blockchain/escrow.ts`
- ✅ Arquivo `apps/api/src/routes/blockchain/governance.ts`
- ✅ Arquivo `apps/api/src/routes/blockchain/utils.ts`
- ✅ Rotas registradas em `server.ts`
- ✅ Frontend funciona end-to-end

---

## 🔗 Arquitetura

### Fluxo Completo:

```
┌──────────────┐
│   Frontend   │
│  (React UI)  │
└──────┬───────┘
       │ HTTP POST /api/blockchain/escrow/:orderId/release
       │
       ▼
┌──────────────────────────────────────────────────┐
│           Backend REST API (Fastify)             │
│                                                  │
│  1. Validate auth (wallet address)               │
│  2. Fetch order from Prisma DB                   │
│  3. Call Polkadot.js:                           │
│     api.tx.bazariEscrow.releaseFunds(orderId)   │
│  4. Sign with server key                        │
│  5. Wait for finalization                       │
│  6. Update DB: PaymentIntent.txHashRelease      │
│  7. Log in EscrowLog                            │
│  8. Return { success: true, txHash: "0x..." }   │
└──────────────┬───────────────────────────────────┘
               │ Polkadot.js API
               │
               ▼
┌──────────────────────────────────────────────────┐
│      Blockchain (Substrate Runtime)              │
│                                                  │
│  pallet_bazari_escrow::release_funds()          │
│    - Validate status == Locked                  │
│    - Unreserve funds                            │
│    - Transfer to seller                         │
│    - Emit Event::FundsReleased                  │
└──────────────────────────────────────────────────┘
```

---

## ✅ Checklist de Implementação

### Step 1: Setup Blockchain Service

**Arquivo**: `apps/api/src/services/blockchain/blockchain.service.ts`

**Verificar se já existe**:
- [x] Singleton `BlockchainService`
- [x] Conexão com node via WS (`ws://127.0.0.1:9944`)
- [x] Polkadot.js ApiPromise
- [x] Keyring para assinar transações

**Se não existir, criar**:

```typescript
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';

class BlockchainService {
  private static instance: BlockchainService;
  private api: ApiPromise | null = null;
  private serverKey: KeyringPair | null = null;

  static getInstance(): BlockchainService {
    if (!this.instance) {
      this.instance = new BlockchainService();
    }
    return this.instance;
  }

  async connect(): Promise<void> {
    if (this.api) return;

    const provider = new WsProvider('ws://127.0.0.1:9944');
    this.api = await ApiPromise.create({ provider });

    // Load server key from env
    const keyring = new Keyring({ type: 'sr25519' });
    this.serverKey = keyring.addFromUri(process.env.BLOCKCHAIN_SERVER_KEY || '//Alice');
  }

  getApi(): ApiPromise {
    if (!this.api) throw new Error('Blockchain not connected');
    return this.api;
  }

  getServerKey(): KeyringPair {
    if (!this.serverKey) throw new Error('Server key not loaded');
    return this.serverKey;
  }
}

export const blockchainService = BlockchainService.getInstance();
```

**Checklist**:
- [ ] Verificar se `BlockchainService` existe
- [ ] Adicionar método `connect()` se não existir
- [ ] Adicionar env var `BLOCKCHAIN_SERVER_KEY` (usar `//Alice` em dev)
- [ ] Chamar `blockchainService.connect()` no `server.ts` boot

---

### Step 2: Criar `/api/blockchain/escrow.ts`

**Arquivo**: `apps/api/src/routes/blockchain/escrow.ts`

#### Endpoint 1: GET /api/blockchain/escrow/:orderId

**Frontend chama**:
```typescript
// apps/web/src/hooks/blockchain/useEscrow.ts:23
const { data: escrow } = useBlockchainQuery({
  endpoint: `/api/blockchain/escrow/${orderId}`,
});
```

**Implementação Backend**:
```typescript
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authOnRequest } from '../../lib/auth/middleware.js';
import { blockchainService } from '../../services/blockchain/blockchain.service.js';

const orderIdParamsSchema = z.object({
  orderId: z.string().uuid(),
});

export async function escrowRoutes(
  app: FastifyInstance,
  options: FastifyPluginOptions & { prisma: PrismaClient }
) {
  const { prisma } = options;

  // GET /api/blockchain/escrow/:orderId - Buscar status do escrow
  app.get('/escrow/:orderId', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const { orderId } = orderIdParamsSchema.parse(request.params);

      // 1. Buscar order no DB
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          buyerAddr: true,
          sellerAddr: true,
          totalBzr: true,
          status: true,
          createdAt: true,
        },
      });

      if (!order) {
        return reply.status(404).send({ error: 'Order not found' });
      }

      // 2. Buscar escrow no blockchain
      const api = blockchainService.getApi();
      const escrowData = await api.query.bazariEscrow.escrows(orderId);

      if (escrowData.isNone) {
        // Escrow não existe on-chain ainda
        return {
          exists: false,
          orderId,
          status: 'NOT_LOCKED',
        };
      }

      // 3. Parse escrow data
      const escrow = escrowData.unwrap();

      return {
        exists: true,
        orderId,
        buyer: escrow.buyer.toString(),
        seller: escrow.seller.toString(),
        amountLocked: escrow.amountLocked.toString(),
        amountReleased: escrow.amountReleased.toString(),
        status: escrow.status.toString(), // Locked, Released, Refunded, PartialRefund, Disputed
        lockedAt: escrow.lockedAt.toNumber(),
        updatedAt: escrow.updatedAt.toNumber(),
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch escrow' });
    }
  });

  // Continua com outros endpoints...
}
```

**Checklist**:
- [ ] Validar `orderId` é UUID
- [ ] Buscar order no Prisma
- [ ] Query `api.query.bazariEscrow.escrows(orderId)`
- [ ] Parse response (handle `isNone`)
- [ ] Retornar JSON com status, amounts, timestamps

---

#### Endpoint 2: POST /api/blockchain/escrow/:orderId/lock

**Frontend chama**:
```typescript
// Quando order criado, lock funds automaticamente
const lockFunds = useMutation({
  mutationFn: async () => {
    return fetch(`/api/blockchain/escrow/${orderId}/lock`, { method: 'POST' });
  },
});
```

**Implementação Backend**:
```typescript
// POST /api/blockchain/escrow/:orderId/lock - Travar fundos
app.post('/escrow/:orderId/lock', { preHandler: authOnRequest }, async (request, reply) => {
  try {
    const { orderId } = orderIdParamsSchema.parse(request.params);
    const authUser = (request as any).authUser as { sub: string; address: string };

    // 1. Buscar order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { paymentIntent: true },
    });

    if (!order) {
      return reply.status(404).send({ error: 'Order not found' });
    }

    // 2. Validar buyer
    if (order.buyerAddr !== authUser.address) {
      return reply.status(403).send({ error: 'Unauthorized: not buyer' });
    }

    // 3. Verificar se já está locked
    const api = blockchainService.getApi();
    const existing = await api.query.bazariEscrow.escrows(orderId);

    if (existing.isSome) {
      return reply.status(400).send({ error: 'Escrow already locked' });
    }

    // 4. Call pallet extrinsic
    const serverKey = blockchainService.getServerKey();
    const totalBzr = BigInt(order.totalBzr.toString());

    const tx = api.tx.bazariEscrow.lockFunds(
      orderId,
      order.sellerAddr,
      totalBzr
    );

    // 5. Sign and send
    const txHash = await new Promise<string>((resolve, reject) => {
      tx.signAndSend(serverKey, ({ status, events }) => {
        if (status.isInBlock || status.isFinalized) {
          resolve(tx.hash.toString());
        }
      }).catch(reject);
    });

    // 6. Update DB
    if (order.paymentIntent) {
      await prisma.paymentIntent.update({
        where: { id: order.paymentIntent.id },
        data: {
          txHash,
          status: 'LOCKED',
        },
      });
    }

    // 7. Log event
    await prisma.escrowLog.create({
      data: {
        orderId,
        kind: 'LOCK',
        payloadJson: {
          txHash,
          buyer: order.buyerAddr,
          seller: order.sellerAddr,
          amount: totalBzr.toString(),
          timestamp: new Date().toISOString(),
        },
      },
    });

    return {
      success: true,
      txHash,
      orderId,
    };
  } catch (error) {
    app.log.error(error);
    return reply.status(500).send({ error: 'Failed to lock funds' });
  }
});
```

**Checklist**:
- [ ] Validar buyer === authUser.address
- [ ] Verificar escrow não existe já
- [ ] Chamar `api.tx.bazariEscrow.lockFunds()`
- [ ] Assinar com `serverKey`
- [ ] Aguardar `isInBlock` ou `isFinalized`
- [ ] Atualizar `PaymentIntent.txHash`
- [ ] Criar registro em `EscrowLog`
- [ ] Retornar `{ success: true, txHash }`

---

#### Endpoint 3: POST /api/blockchain/escrow/:orderId/release

**Frontend chama**:
```typescript
// apps/web/src/hooks/blockchain/useEscrow.ts:37
const releaseFunds = useMutation({
  mutationFn: async () => {
    return fetch(`/api/blockchain/escrow/${orderId}/release`, { method: 'POST' });
  },
});
```

**Implementação Backend**:
```typescript
// POST /api/blockchain/escrow/:orderId/release - Liberar fundos para seller
app.post('/escrow/:orderId/release', { preHandler: authOnRequest }, async (request, reply) => {
  try {
    const { orderId } = orderIdParamsSchema.parse(request.params);
    const authUser = (request as any).authUser as { sub: string; address: string };

    // 1. Buscar order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { paymentIntent: true },
    });

    if (!order) {
      return reply.status(404).send({ error: 'Order not found' });
    }

    // 2. Validar buyer (apenas buyer pode release)
    if (order.buyerAddr !== authUser.address) {
      return reply.status(403).send({ error: 'Unauthorized: only buyer can release' });
    }

    // 3. Verificar escrow existe e status
    const api = blockchainService.getApi();
    const escrowData = await api.query.bazariEscrow.escrows(orderId);

    if (escrowData.isNone) {
      return reply.status(400).send({ error: 'Escrow not found on blockchain' });
    }

    const escrow = escrowData.unwrap();
    if (escrow.status.toString() !== 'Locked') {
      return reply.status(400).send({
        error: 'Invalid escrow status',
        currentStatus: escrow.status.toString(),
      });
    }

    // 4. Call pallet extrinsic
    const serverKey = blockchainService.getServerKey();
    const tx = api.tx.bazariEscrow.releaseFunds(orderId);

    // 5. Sign and send
    const txHash = await new Promise<string>((resolve, reject) => {
      tx.signAndSend(serverKey, ({ status }) => {
        if (status.isInBlock || status.isFinalized) {
          resolve(tx.hash.toString());
        }
      }).catch(reject);
    });

    // 6. Update DB
    if (order.paymentIntent) {
      await prisma.paymentIntent.update({
        where: { id: order.paymentIntent.id },
        data: {
          txHashRelease: txHash,
          status: 'RELEASED',
        },
      });
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'COMPLETED' },
    });

    // 7. Log event
    await prisma.escrowLog.create({
      data: {
        orderId,
        kind: 'RELEASE',
        payloadJson: {
          txHash,
          seller: order.sellerAddr,
          amount: escrow.amountLocked.toString(),
          timestamp: new Date().toISOString(),
        },
      },
    });

    return {
      success: true,
      txHash,
      orderId,
    };
  } catch (error) {
    app.log.error(error);
    return reply.status(500).send({ error: 'Failed to release funds' });
  }
});
```

**Checklist**:
- [ ] Validar buyer === authUser.address
- [ ] Verificar escrow.status === 'Locked'
- [ ] Chamar `api.tx.bazariEscrow.releaseFunds(orderId)`
- [ ] Assinar com `serverKey`
- [ ] Atualizar `PaymentIntent.txHashRelease`
- [ ] Atualizar `Order.status = 'COMPLETED'`
- [ ] Criar registro em `EscrowLog`

---

#### Endpoint 4: POST /api/blockchain/escrow/:orderId/refund

**Frontend chama**:
```typescript
// apps/web/src/hooks/blockchain/useEscrow.ts:52
const refundFunds = useMutation({
  mutationFn: async () => {
    return fetch(`/api/blockchain/escrow/${orderId}/refund`, { method: 'POST' });
  },
});
```

**Implementação Backend**:
```typescript
// POST /api/blockchain/escrow/:orderId/refund - Refund (DAO only)
app.post('/escrow/:orderId/refund', { preHandler: authOnRequest }, async (request, reply) => {
  try {
    const { orderId } = orderIdParamsSchema.parse(request.params);
    const authUser = (request as any).authUser as { sub: string; address: string };

    // 1. Validar DAO member
    const api = blockchainService.getApi();
    const isDAOMember = await api.query.dao.members(authUser.address);

    if (!isDAOMember || isDAOMember.isNone) {
      return reply.status(403).send({ error: 'Unauthorized: DAO members only' });
    }

    // 2. Buscar order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { paymentIntent: true },
    });

    if (!order) {
      return reply.status(404).send({ error: 'Order not found' });
    }

    // 3. Verificar escrow
    const escrowData = await api.query.bazariEscrow.escrows(orderId);

    if (escrowData.isNone) {
      return reply.status(400).send({ error: 'Escrow not found' });
    }

    const escrow = escrowData.unwrap();
    if (escrow.status.toString() !== 'Locked') {
      return reply.status(400).send({ error: 'Invalid status for refund' });
    }

    // 4. Call pallet (DAO origin required)
    const serverKey = blockchainService.getServerKey();
    const tx = api.tx.bazariEscrow.refund(orderId);

    // 5. Sign and send
    const txHash = await new Promise<string>((resolve, reject) => {
      tx.signAndSend(serverKey, ({ status }) => {
        if (status.isInBlock || status.isFinalized) {
          resolve(tx.hash.toString());
        }
      }).catch(reject);
    });

    // 6. Update DB
    if (order.paymentIntent) {
      await prisma.paymentIntent.update({
        where: { id: order.paymentIntent.id },
        data: {
          txHashRefund: txHash,
          status: 'REFUNDED',
        },
      });
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'REFUNDED' },
    });

    // 7. Log event
    await prisma.escrowLog.create({
      data: {
        orderId,
        kind: 'REFUND',
        payloadJson: {
          txHash,
          buyer: order.buyerAddr,
          amount: escrow.amountLocked.toString(),
          daoMember: authUser.address,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return {
      success: true,
      txHash,
      orderId,
    };
  } catch (error) {
    app.log.error(error);
    return reply.status(500).send({ error: 'Failed to refund' });
  }
});
```

**Checklist**:
- [ ] Validar `api.query.dao.members(authUser.address)`
- [ ] Retornar 403 se não DAO member
- [ ] Chamar `api.tx.bazariEscrow.refund(orderId)`
- [ ] Atualizar `PaymentIntent.txHashRefund`
- [ ] Atualizar `Order.status = 'REFUNDED'`
- [ ] Log com `daoMember` address

---

#### Endpoint 5: POST /api/blockchain/escrow/:orderId/dispute

**Implementação**:
```typescript
// POST /api/blockchain/escrow/:orderId/dispute - Marcar como disputado
app.post('/escrow/:orderId/dispute', { preHandler: authOnRequest }, async (request, reply) => {
  try {
    const { orderId } = orderIdParamsSchema.parse(request.params);
    const authUser = (request as any).authUser as { sub: string; address: string };

    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      return reply.status(404).send({ error: 'Order not found' });
    }

    // Validar que caller é buyer ou seller
    if (order.buyerAddr !== authUser.address && order.sellerAddr !== authUser.address) {
      return reply.status(403).send({ error: 'Unauthorized' });
    }

    // Atualizar status no DB (não há extrinsic dispute no pallet ainda)
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'DISPUTED' },
    });

    await prisma.escrowLog.create({
      data: {
        orderId,
        kind: 'DISPUTE',
        payloadJson: {
          initiator: authUser.address,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return {
      success: true,
      orderId,
      status: 'DISPUTED',
    };
  } catch (error) {
    app.log.error(error);
    return reply.status(500).send({ error: 'Failed to dispute' });
  }
});
```

**Nota**: Pallet não tem extrinsic `dispute()` ainda (apenas enum `Disputed`), então apenas atualizamos DB.

---

#### Endpoint 6: GET /api/blockchain/escrow/:orderId/events

**Implementação**:
```typescript
// GET /api/blockchain/escrow/:orderId/events - Histórico de eventos
app.get('/escrow/:orderId/events', { preHandler: authOnRequest }, async (request, reply) => {
  try {
    const { orderId } = orderIdParamsSchema.parse(request.params);

    // Buscar logs do DB
    const logs = await prisma.escrowLog.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      orderId,
      events: logs.map(log => ({
        kind: log.kind,
        timestamp: log.createdAt,
        ...log.payloadJson,
      })),
    };
  } catch (error) {
    app.log.error(error);
    return reply.status(500).send({ error: 'Failed to fetch events' });
  }
});
```

---

#### Endpoint 7: GET /api/blockchain/escrow/active

**Implementação**:
```typescript
// GET /api/blockchain/escrow/active - Listar escrows ativos
app.get('/escrow/active', { preHandler: authOnRequest }, async (request, reply) => {
  try {
    const authUser = (request as any).authUser as { sub: string; address: string };

    // Buscar orders do usuário com escrow locked
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { buyerAddr: authUser.address },
          { sellerAddr: authUser.address },
        ],
        status: {
          in: ['PENDING_PAYMENT', 'PAID', 'PROCESSING'],
        },
      },
      include: {
        paymentIntent: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const api = blockchainService.getApi();
    const activeEscrows = [];

    for (const order of orders) {
      const escrowData = await api.query.bazariEscrow.escrows(order.id);

      if (escrowData.isSome) {
        const escrow = escrowData.unwrap();
        if (escrow.status.toString() === 'Locked') {
          activeEscrows.push({
            orderId: order.id,
            buyer: escrow.buyer.toString(),
            seller: escrow.seller.toString(),
            amountLocked: escrow.amountLocked.toString(),
            lockedAt: escrow.lockedAt.toNumber(),
            updatedAt: escrow.updatedAt.toNumber(),
          });
        }
      }
    }

    return {
      active: activeEscrows,
      count: activeEscrows.length,
    };
  } catch (error) {
    app.log.error(error);
    return reply.status(500).send({ error: 'Failed to fetch active escrows' });
  }
});
```

---

#### Endpoint 8: GET /api/blockchain/escrow/urgent

**Implementação**:
```typescript
// GET /api/blockchain/escrow/urgent - Escrows próximos do auto-release (< 24h)
app.get('/escrow/urgent', { preHandler: authOnRequest }, async (request, reply) => {
  try {
    const authUser = (request as any).authUser as { sub: string; address: string };

    // Validar DAO member
    const api = blockchainService.getApi();
    const isDAOMember = await api.query.dao.members(authUser.address);

    if (!isDAOMember || isDAOMember.isNone) {
      return reply.status(403).send({ error: 'DAO members only' });
    }

    const currentBlock = await api.query.system.number();
    const currentBlockNum = currentBlock.toNumber();

    // Auto-release após 7 dias = 100,800 blocos (6s/block)
    const AUTO_RELEASE_BLOCKS = 100_800;
    const URGENT_THRESHOLD = 2_400; // 24h = 14,400s / 6s = 2,400 blocos

    const orders = await prisma.order.findMany({
      where: {
        status: {
          in: ['PENDING_PAYMENT', 'PAID', 'PROCESSING'],
        },
      },
    });

    const urgentEscrows = [];

    for (const order of orders) {
      const escrowData = await api.query.bazariEscrow.escrows(order.id);

      if (escrowData.isSome) {
        const escrow = escrowData.unwrap();
        if (escrow.status.toString() === 'Locked') {
          const lockedAt = escrow.lockedAt.toNumber();
          const blocksElapsed = currentBlockNum - lockedAt;
          const blocksUntilRelease = AUTO_RELEASE_BLOCKS - blocksElapsed;

          if (blocksUntilRelease > 0 && blocksUntilRelease <= URGENT_THRESHOLD) {
            urgentEscrows.push({
              orderId: order.id,
              buyer: escrow.buyer.toString(),
              seller: escrow.seller.toString(),
              amountLocked: escrow.amountLocked.toString(),
              lockedAt,
              blocksUntilRelease,
              hoursUntilRelease: Math.floor((blocksUntilRelease * 6) / 3600),
            });
          }
        }
      }
    }

    return {
      urgent: urgentEscrows,
      count: urgentEscrows.length,
    };
  } catch (error) {
    app.log.error(error);
    return reply.status(500).send({ error: 'Failed to fetch urgent escrows' });
  }
});
```

---

### Step 3: Criar `/api/blockchain/governance.ts`

**Arquivo**: `apps/api/src/routes/blockchain/governance.ts`

```typescript
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { authOnRequest } from '../../lib/auth/middleware.js';
import { blockchainService } from '../../services/blockchain/blockchain.service.js';

export async function governanceRoutes(
  app: FastifyInstance,
  options: FastifyPluginOptions
) {
  // GET /api/blockchain/governance/is-dao-member
  app.get('/governance/is-dao-member', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const authUser = (request as any).authUser as { sub: string; address: string };

      const api = blockchainService.getApi();
      const memberData = await api.query.dao.members(authUser.address);

      const isMember = memberData.isSome;

      return {
        address: authUser.address,
        isDAOMember: isMember,
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to check DAO membership' });
    }
  });
}
```

**Checklist**:
- [ ] Query `api.query.dao.members(address)`
- [ ] Retornar `{ isDAOMember: boolean }`

---

### Step 4: Criar `/api/blockchain/utils.ts`

**Arquivo**: `apps/api/src/routes/blockchain/utils.ts`

```typescript
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { authOnRequest } from '../../lib/auth/middleware.js';
import { blockchainService } from '../../services/blockchain/blockchain.service.js';

export async function blockchainUtilsRoutes(
  app: FastifyInstance,
  options: FastifyPluginOptions
) {
  // GET /api/blockchain/current-block
  app.get('/current-block', async (request, reply) => {
    try {
      const api = blockchainService.getApi();
      const currentBlock = await api.query.system.number();

      return {
        currentBlock: currentBlock.toNumber(),
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch current block' });
    }
  });

  // GET /api/blockchain/user/address
  app.get('/user/address', { preHandler: authOnRequest }, async (request, reply) => {
    try {
      const authUser = (request as any).authUser as { sub: string; address: string };

      return {
        address: authUser.address,
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch user address' });
    }
  });
}
```

**Checklist**:
- [ ] Endpoint `current-block` retorna block number
- [ ] Endpoint `user/address` retorna wallet address do authUser

---

### Step 5: Registrar Rotas no `server.ts`

**Arquivo**: `apps/api/src/server.ts`

**Adicionar imports**:
```typescript
import { escrowRoutes } from './routes/blockchain/escrow.js';
import { governanceRoutes } from './routes/blockchain/governance.js';
import { blockchainUtilsRoutes } from './routes/blockchain/utils.js';
import { blockchainService } from './services/blockchain/blockchain.service.js';
```

**No `buildApp()`, antes de registrar rotas**:
```typescript
// Conectar ao blockchain node
try {
  await blockchainService.connect();
  console.log('✅ Blockchain connected');
} catch (err) {
  console.error('❌ Blockchain connection failed:', err);
  // Continuar sem blockchain (degraded mode)
}
```

**Registrar rotas**:
```typescript
// Blockchain routes
await app.register(escrowRoutes, { prefix: '/api/blockchain', prisma });
await app.register(governanceRoutes, { prefix: '/api/blockchain', prisma });
await app.register(blockchainUtilsRoutes, { prefix: '/api/blockchain', prisma });
```

**Checklist**:
- [ ] Import blockchain routes
- [ ] Chamar `blockchainService.connect()` no boot
- [ ] Registrar 3 rotas com prefix `/api/blockchain`

---

### Step 6: Atualizar Database Schema (se necessário)

**Arquivo**: `apps/api/prisma/schema.prisma`

**Verificar modelos existem**:

```prisma
model PaymentIntent {
  id            String   @id @default(uuid())
  escrowId      BigInt?  @db.BigInt
  txHash        String?
  txHashRelease String?
  txHashRefund  String?
  status        PaymentIntentStatus
  // ... outros campos
}

model EscrowLog {
  id          String   @id @default(uuid())
  orderId     String
  kind        String   // LOCK, RELEASE, REFUND, DISPUTE
  payloadJson Json
  createdAt   DateTime @default(now())
}

model Order {
  buyerAddr   String
  sellerAddr  String
  totalBzr    Decimal  @db.Decimal(30, 0)
  // ... outros campos
}
```

**Se `EscrowLog` não existir, criar migration**:
```bash
npx prisma migrate dev --name add_escrow_log
```

**Checklist**:
- [ ] Verificar `PaymentIntent` tem `txHash`, `txHashRelease`, `txHashRefund`
- [ ] Verificar `EscrowLog` existe
- [ ] Verificar `Order` tem `buyerAddr`, `sellerAddr`, `totalBzr`

---

### Step 7: Environment Variables

**Arquivo**: `apps/api/.env`

**Adicionar**:
```bash
# Blockchain
BLOCKCHAIN_WS_URL=ws://127.0.0.1:9944
BLOCKCHAIN_SERVER_KEY=//Alice  # DEV ONLY - usar mnemonic real em prod
```

**Em produção**, usar mnemonic seguro:
```bash
BLOCKCHAIN_SERVER_KEY="palavra1 palavra2 ... palavra12"
```

**Checklist**:
- [ ] Adicionar `BLOCKCHAIN_WS_URL` ao `.env`
- [ ] Adicionar `BLOCKCHAIN_SERVER_KEY` ao `.env`
- [ ] Documentar que `//Alice` é apenas dev

---

## 🚫 Anti-Patterns

### ❌ NÃO FAÇA:

1. **Usar mock txHash**
   - ❌ `const txHash = "0x" + Date.now()`
   - ✅ Aguardar transação real: `tx.signAndSend()` → `status.isFinalized`

2. **Não validar status antes de release/refund**
   - ❌ Chamar `releaseFunds()` sem verificar `escrow.status === 'Locked'`
   - ✅ Query escrow primeiro, validar status

3. **Não logar eventos**
   - ❌ Executar TX sem criar `EscrowLog`
   - ✅ Sempre logar em `EscrowLog` com txHash, timestamp, actors

4. **Expor server key**
   - ❌ Permitir frontend assinar transações
   - ✅ Backend assina com `serverKey`, frontend apenas envia request HTTP

5. **Não tratar erros blockchain**
   - ❌ Assumir TX sempre sucede
   - ✅ Try/catch, retornar 500 com mensagem clara

### ✅ FAÇA:

1. **Validar auth em TODOS endpoints**
   - Usar `{ preHandler: authOnRequest }`
   - Verificar `authUser.address` quando necessário

2. **Aguardar finalização**
   - Usar `status.isFinalized` ou pelo menos `isInBlock`
   - Não retornar antes da TX confirmar

3. **Sync DB com blockchain**
   - Sempre atualizar `PaymentIntent.txHash*` após TX
   - Sempre criar `EscrowLog` entry

4. **DAO-only enforcement**
   - Validar `api.query.dao.members()` antes de refund

---

## 📦 Dependências NPM

**Verificar instaladas**:
```bash
cd apps/api
pnpm list @polkadot/api @polkadot/keyring
```

**Se não instaladas**:
```bash
pnpm add @polkadot/api @polkadot/keyring
```

---

## 🧪 Testes

### Teste Manual:

**1. Conectar blockchain**:
```bash
# Terminal 1 - Rodar node
cd /root/bazari-chain
./target/release/solochain-template-node --dev --tmp

# Terminal 2 - Rodar backend
cd /root/bazari/apps/api
pnpm dev
```

**2. Testar endpoint GET escrow**:
```bash
curl http://localhost:3000/api/blockchain/current-block
# Esperado: { "currentBlock": 123 }

curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/blockchain/escrow/test-order-uuid
# Esperado: { "exists": false, "status": "NOT_LOCKED" }
```

**3. Testar lock funds**:
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/blockchain/escrow/order-uuid/lock
# Esperado: { "success": true, "txHash": "0x..." }
```

**4. Verificar DB**:
```bash
psql -U bazari -d bazari -c "SELECT * FROM \"PaymentIntent\" WHERE \"txHash\" IS NOT NULL;"
psql -U bazari -d bazari -c "SELECT * FROM \"EscrowLog\" ORDER BY \"createdAt\" DESC LIMIT 5;"
```

**Checklist de Testes**:
- [ ] `/current-block` retorna número
- [ ] `/escrow/:orderId` retorna escrow ou `exists: false`
- [ ] `/escrow/:orderId/lock` cria TX real
- [ ] `/escrow/:orderId/release` funciona (buyer only)
- [ ] `/escrow/:orderId/refund` retorna 403 se não DAO
- [ ] `PaymentIntent.txHash` atualizado
- [ ] `EscrowLog` registra eventos

---

## 🎯 Resultado Esperado

Após implementação:

1. ✅ **Frontend funciona end-to-end**
   - Usuário cria order → funds locked automaticamente
   - Seller entrega → buyer clica "Release Funds" → seller recebe
   - Problema → DAO clica "Refund" → buyer recebe de volta

2. ✅ **Database sincronizado**
   - `PaymentIntent.txHash` não é NULL/MOCK
   - `EscrowLog` registra histórico completo

3. ✅ **Blockchain integrado**
   - Pallet `bazari-escrow` usado em produção
   - TXs reais on-chain

---

## 🔗 Referências

- [Pallet Spec](../../../20-blueprints/pallets/bazari-escrow/SPEC.md)
- [Polkadot.js API Docs](https://polkadot.js.org/docs/api/)
- [Substrate Events](https://docs.substrate.io/build/events-and-errors/)
- [03-bazari-escrow.md](./03-bazari-escrow.md) - Pallet implementation

---

## 🤖 Prompt para Claude Code

```
Implementar backend REST API para conectar frontend escrow → pallet blockchain.

**Contexto**:
- Pallet `bazari-escrow` IMPLEMENTADO (/root/bazari-chain/pallets/bazari-escrow/)
- Frontend IMPLEMENTADO (apps/web/src/hooks/blockchain/useEscrow.ts)
- Backend REST API NÃO EXISTE (apps/api/src/routes/blockchain/escrow.ts)
- Frontend chama endpoints que retornam 404

**Objetivo**:
Criar 3 arquivos REST API:
1. apps/api/src/routes/blockchain/escrow.ts (8 endpoints)
2. apps/api/src/routes/blockchain/governance.ts (1 endpoint)
3. apps/api/src/routes/blockchain/utils.ts (2 endpoints)

**Especificação completa**: /root/bazari/knowledge/99-internal/implementation-prompts/01-foundation/04-escrow-backend-api.md

**Checklist**:
- [ ] Criar BlockchainService se não existe (Polkadot.js connection)
- [ ] Implementar 8 endpoints em escrow.ts (GET/:id, POST/lock, POST/release, POST/refund, etc)
- [ ] Implementar governanceRoutes (is-dao-member)
- [ ] Implementar utilsRoutes (current-block, user/address)
- [ ] Registrar rotas no server.ts com prefix /api/blockchain
- [ ] Conectar blockchain no boot: blockchainService.connect()
- [ ] Atualizar DB: PaymentIntent.txHash, EscrowLog após cada TX
- [ ] Validar auth em todos endpoints (preHandler: authOnRequest)
- [ ] Testar manualmente: curl endpoints, verificar DB

**Anti-patterns a evitar**:
- ❌ Não usar mock txHash
- ❌ Não retornar antes de TX finalizar
- ❌ Não esquecer de logar em EscrowLog
- ❌ Não expor server key

**Referências**:
- Spec completa: /root/bazari/knowledge/99-internal/implementation-prompts/01-foundation/04-escrow-backend-api.md
- Pallet code: /root/bazari-chain/pallets/bazari-escrow/src/lib.rs
- Frontend hooks: apps/web/src/hooks/blockchain/useEscrow.ts

Me avise quando terminar e mostre resultado de teste curl.
```

---

**Version**: 1.0.0
**Last Updated**: 2025-11-15
**Author**: Claude (Senior Software Architect)
