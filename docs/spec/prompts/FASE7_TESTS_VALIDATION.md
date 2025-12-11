# FASE 7: Testes E2E e Validação Final - Bazari Delivery Network

**Objetivo:** Criar testes end-to-end e validar todo o fluxo do sistema de delivery

**Duração Estimada:** 2-3 horas

**Pré-requisito:** FASE 6 concluída

---

## TAREFAS

### 1. Criar Arquivo de Testes E2E

**Arquivo:** `apps/api/src/routes/delivery.e2e.test.ts`

```typescript
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { buildServer } from '../server.js';

let app: FastifyInstance;
let prisma: PrismaClient;

let testDelivererProfileId: string;
let testStoreId: string;
let testOrderId: string;
let testDeliveryRequestId: string;

beforeAll(async () => {
  app = await buildServer();
  await app.ready();
  prisma = new PrismaClient();

  // Setup: Criar dados de teste
  // TODO: Implementar helpers de teste
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe('Delivery Network E2E', () => {
  describe('1. Criar Perfil de Entregador', () => {
    test('deve criar perfil de entregador', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/delivery/profile',
        headers: {
          authorization: 'Bearer DELIVERER_TOKEN',
        },
        payload: {
          fullName: 'Test Deliverer',
          documentType: 'cpf',
          documentNumber: '12345678901',
          phoneNumber: '+5521999999999',
          vehicleType: 'motorcycle',
          maxWeight: 10,
          maxVolume: 0.5,
          serviceRadius: 15,
          serviceCities: ['Rio de Janeiro'],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.profileId).toBeDefined();
      testDelivererProfileId = body.profileId;
    });

    test('deve atualizar disponibilidade', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/delivery/profile/availability',
        headers: {
          authorization: 'Bearer DELIVERER_TOKEN',
        },
        payload: {
          isAvailable: true,
          isOnline: true,
          currentLat: -22.9068,
          currentLng: -43.1729,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.isAvailable).toBe(true);
    });
  });

  describe('2. Criar Order e DeliveryRequest Automático', () => {
    test('deve criar order com entrega', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/orders',
        headers: {
          authorization: 'Bearer BUYER_TOKEN',
        },
        payload: {
          items: [
            {
              listingId: 'test-product-uuid',
              qty: 2,
              kind: 'product',
            },
          ],
          shippingAddress: {
            street: 'Rua Teste',
            number: '123',
            city: 'Rio de Janeiro',
            state: 'RJ',
            zipCode: '22000-000',
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.orderId).toBeDefined();
      testOrderId = body.orderId;
    });

    test('deve ter criado DeliveryRequest automaticamente', async () => {
      // Buscar DeliveryRequest pelo orderId
      const deliveryRequest = await prisma.deliveryRequest.findFirst({
        where: { orderId: testOrderId },
      });

      expect(deliveryRequest).toBeDefined();
      expect(deliveryRequest!.status).toBe('pending');
      expect(deliveryRequest!.sourceType).toBe('order');
      testDeliveryRequestId = deliveryRequest!.id;
    });
  });

  describe('3. Entregador Aceita Entrega', () => {
    test('deve listar demanda disponível', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/delivery/requests',
        headers: {
          authorization: 'Bearer DELIVERER_TOKEN',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.length).toBeGreaterThan(0);

      const ourRequest = body.data.find(
        (r: any) => r.id === testDeliveryRequestId
      );
      expect(ourRequest).toBeDefined();
    });

    test('deve aceitar entrega', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/delivery/requests/${testDeliveryRequestId}/accept`,
        headers: {
          authorization: 'Bearer DELIVERER_TOKEN',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.deliveryRequest.status).toBe('accepted');
    });

    test('não deve permitir outro entregador aceitar', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/delivery/requests/${testDeliveryRequestId}/accept`,
        headers: {
          authorization: 'Bearer ANOTHER_DELIVERER_TOKEN',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Demanda já aceita');
    });
  });

  describe('4. Confirmar Coleta', () => {
    test('deve confirmar coleta', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/delivery/requests/${testDeliveryRequestId}/pickup`,
        headers: {
          authorization: 'Bearer DELIVERER_TOKEN',
        },
        payload: {
          lat: -22.9068,
          lng: -43.1729,
          notes: 'Pacote coletado',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.deliveryRequest.status).toBe('in_transit');
      expect(body.order?.status).toBe('SHIPPED');
    });

    test('Order deve estar com status SHIPPED', async () => {
      const order = await prisma.order.findUnique({
        where: { id: testOrderId },
      });

      expect(order?.status).toBe('SHIPPED');
    });
  });

  describe('5. Confirmar Entrega', () => {
    test('deve confirmar entrega', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/delivery/requests/${testDeliveryRequestId}/deliver`,
        headers: {
          authorization: 'Bearer DELIVERER_TOKEN',
        },
        payload: {
          lat: -22.9653,
          lng: -43.1802,
          recipientName: 'Test Recipient',
          notes: 'Entregue ao porteiro',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.deliveryRequest.status).toBe('delivered');
      expect(body.payment.status).toBe('released');
    });

    test('Order deve estar com status RELEASED', async () => {
      const order = await prisma.order.findUnique({
        where: { id: testOrderId },
      });

      expect(order?.status).toBe('RELEASED');
    });

    test('DeliveryRequest deve ter prova de entrega', async () => {
      const deliveryRequest = await prisma.deliveryRequest.findUnique({
        where: { id: testDeliveryRequestId },
      });

      expect(deliveryRequest?.proofOfDelivery).toBeDefined();
      const proof = deliveryRequest?.proofOfDelivery as any;
      expect(proof.recipientName).toBe('Test Recipient');
    });
  });

  describe('6. Cancelamento', () => {
    test('não deve permitir cancelar entrega já concluída', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/delivery/requests/${testDeliveryRequestId}/cancel`,
        headers: {
          authorization: 'Bearer DELIVERER_TOKEN',
        },
        payload: {
          reason: 'other',
          notes: 'Tentando cancelar após entrega',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});

describe('Store Delivery Partners E2E', () => {
  test('entregador deve solicitar parceria', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/stores/${testStoreId}/delivery-partners/request`,
      headers: {
        authorization: 'Bearer DELIVERER_TOKEN',
      },
      payload: {
        message: 'Gostaria de ser parceiro!',
      },
    });

    expect(response.statusCode).toBe(201);
  });

  test('loja deve aprovar parceria', async () => {
    // Buscar partnership ID
    const partnerships = await prisma.storeDeliveryPartner.findMany({
      where: {
        storeId: BigInt(testStoreId),
        deliveryPersonId: testDelivererProfileId,
      },
    });

    expect(partnerships.length).toBeGreaterThan(0);
    const partnershipId = partnerships[0].id;

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/stores/${testStoreId}/delivery-partners/${partnershipId}`,
      headers: {
        authorization: 'Bearer STORE_OWNER_TOKEN',
      },
      payload: {
        status: 'active',
        priority: 1,
        commissionPercent: 95,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('active');
  });
});

describe('Cálculo de Frete', () => {
  test('deve calcular frete corretamente', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/delivery/calculate-fee',
      payload: {
        pickupAddress: {
          street: 'Rua A',
          number: '100',
          city: 'Rio de Janeiro',
          state: 'RJ',
          zipCode: '20000-000',
        },
        deliveryAddress: {
          street: 'Rua B',
          number: '200',
          city: 'Rio de Janeiro',
          state: 'RJ',
          zipCode: '22000-000',
        },
        packageType: 'small_box',
        weight: 2.0,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.totalBzr).toBeDefined();
    expect(parseFloat(body.totalBzr)).toBeGreaterThan(0);
    expect(body.breakdown).toBeDefined();
  });
});
```

---

### 2. Criar Helpers de Teste

**Arquivo:** `apps/api/src/test/helpers.ts`

```typescript
import { PrismaClient } from '@prisma/client';

export async function createTestDeliverer(prisma: PrismaClient) {
  const user = await prisma.user.create({
    data: {
      address: 'test-deliverer-address',
    },
  });

  const profile = await prisma.profile.create({
    data: {
      userId: user.id,
      handle: 'test-deliverer',
      displayName: 'Test Deliverer',
    },
  });

  const deliveryProfile = await prisma.deliveryProfile.create({
    data: {
      profileId: profile.id,
      fullName: 'Test Deliverer',
      documentType: 'cpf',
      documentNumber: `test-${Date.now()}`,
      phoneNumber: '+5521999999999',
      vehicleType: 'motorcycle',
      maxWeight: 10,
      maxVolume: 0.5,
      isAvailable: true,
      createdAt: BigInt(Date.now()),
      updatedAt: BigInt(Date.now()),
    },
  });

  return { user, profile, deliveryProfile };
}

export async function createTestStore(prisma: PrismaClient) {
  const user = await prisma.user.create({
    data: {
      address: 'test-store-owner-address',
    },
  });

  const store = await prisma.sellerProfile.create({
    data: {
      userId: user.id,
      shopName: 'Test Store',
      shopSlug: `test-store-${Date.now()}`,
      pickupAddress: {
        street: 'Rua Loja',
        number: '100',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '20000-000',
      },
      onChainStoreId: BigInt(Math.floor(Math.random() * 1000000)),
    },
  });

  return { user, store };
}

export async function cleanupTestData(prisma: PrismaClient) {
  // Limpar dados de teste
  await prisma.deliveryRequest.deleteMany({
    where: { senderId: { contains: 'test-' } },
  });
  await prisma.storeDeliveryPartner.deleteMany({
    where: { deliveryPersonId: { contains: 'test-' } },
  });
  await prisma.deliveryProfile.deleteMany({
    where: { documentNumber: { contains: 'test-' } },
  });
  // ... outros cleanups
}
```

---

### 3. Executar Testes

```bash
cd apps/api

# Executar todos os testes
npm test

# Executar apenas testes E2E de delivery
npm test -- delivery.e2e.test.ts

# Executar com coverage
npm test -- --coverage
```

---

### 4. Checklist de Validação Final

**Funcionalidades Core:**

- [ ] Criar DeliveryProfile funciona
- [ ] Atualizar disponibilidade funciona
- [ ] Criar Order gera DeliveryRequest automaticamente
- [ ] Listar demandas disponíveis funciona
- [ ] Aceitar entrega funciona (race condition protegida)
- [ ] Confirmar coleta atualiza Order.status para SHIPPED
- [ ] Confirmar entrega atualiza Order.status para RELEASED
- [ ] Cancelar entrega funciona
- [ ] Calcular frete funciona corretamente

**Store Partners:**

- [ ] Solicitar parceria funciona
- [ ] Aprovar parceria funciona
- [ ] Listar parceiros funciona
- [ ] Prioridade de entregadores vinculados funciona
- [ ] Remover parceria funciona

**Validações:**

- [ ] Entregador sem perfil não pode aceitar entregas
- [ ] Entregador indisponível não pode aceitar
- [ ] Apenas entregador responsável pode fazer pickup/deliver
- [ ] Rede privada bloqueia entregadores não autorizados
- [ ] Documento duplicado é rejeitado
- [ ] Validações Zod funcionam em todos endpoints

**Integrações:**

- [ ] Order ↔ DeliveryRequest vinculados corretamente
- [ ] Métricas de entregador são atualizadas (TODO: implementar)
- [ ] Escrow é criado/liberado (TODO: implementar)
- [ ] BazChat thread é criado (TODO: implementar)

**Performance:**

- [ ] Queries com índices corretos
- [ ] Sem N+1 queries
- [ ] Tempo de resposta < 500ms para listagens

---

### 5. Documentar API

**Criar:** `docs/API_DELIVERY_NETWORK.md`

Documentar todos os endpoints com exemplos de request/response usando o formato da especificação técnica.

---

### 6. Preparar para Deploy

**Checklist:**

- [ ] Todas as migrations funcionando
- [ ] Variáveis de ambiente documentadas
- [ ] Feature flags configuradas (FEATURE_AUTO_CREATE_DELIVERY)
- [ ] Logs de erro apropriados
- [ ] Testes passando 100%
- [ ] README atualizado com instruções de setup

---

## CONCLUSÃO

Após completar esta fase, o **Bazari Delivery Network** estará:

✅ **Funcionalmente completo** para MVP
✅ **Testado** end-to-end
✅ **Integrado** com sistema de Orders
✅ **Documentado** e pronto para uso

---

## MELHORIAS FUTURAS (Pós-MVP)

**Fase 8 - Real-time:**
- WebSocket para tracking ao vivo
- Push notifications
- Localização em tempo real

**Fase 9 - Blockchain:**
- Escrow real (não mock)
- Reputação on-chain
- NFT de recibo de entrega

**Fase 10 - Inteligência:**
- Roteamento otimizado (algoritmo)
- Precificação dinâmica
- ML para estimar tempo de entrega

**Fase 11 - Gamificação:**
- Ranking de entregadores
- Badges e conquistas
- Bônus por performance

---

**FIM DA IMPLEMENTAÇÃO**

Parabéns! Você agora tem um sistema completo de delivery network descentralizado integrado ao marketplace Bazari! 🚀
