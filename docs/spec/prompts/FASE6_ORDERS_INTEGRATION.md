# FASE 6: Integração com Orders (Auto-create DeliveryRequest) - Bazari Delivery Network

**Objetivo:** Modificar o sistema de Orders para criar automaticamente DeliveryRequest quando pedido tem endereço de entrega

**Duração Estimada:** 2-3 horas

**Pré-requisito:** FASE 5 concluída

---

## TAREFAS

### 1. Adicionar Campo pickupAddress ao SellerProfile (se ainda não foi feito na Fase 1)

Verificar em `schema.prisma` se o campo já existe. Se não:

```bash
# Criar migration manual se necessário
npx prisma migrate dev --name add_pickup_address_to_seller_profile
```

---

### 2. Criar Função de Auto-criação de DeliveryRequest

**Arquivo:** `apps/api/src/lib/deliveryRequestHelper.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import {
  calculateDeliveryFee,
  estimatePackageDetails,
} from './deliveryCalculator.js';
import { DeliveryRequestStatus } from '../types/delivery.types.js';

export async function createDeliveryRequestForOrder(
  prisma: PrismaClient,
  orderId: string
): Promise<{ deliveryRequestId: string; deliveryFeeBzr: string } | null> {
  // 1. Buscar Order com items e store
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
    },
  });

  if (!order) {
    throw new Error(`Order ${orderId} não encontrada`);
  }

  // Se não tem shippingAddress, não precisa de delivery
  if (!order.shippingAddress) {
    return null;
  }

  // 2. Buscar loja
  if (!order.sellerStoreId) {
    console.warn(`Order ${orderId} não tem sellerStoreId, pulando delivery`);
    return null;
  }

  const store = await prisma.sellerProfile.findUnique({
    where: { id: order.sellerStoreId },
    select: {
      id: true,
      onChainStoreId: true,
      pickupAddress: true,
      shopName: true,
    },
  });

  if (!store) {
    throw new Error(`Store ${order.sellerStoreId} não encontrada`);
  }

  // Se loja não tem endereço de coleta, usar endereço padrão (mock)
  const pickupAddress =
    store.pickupAddress ||
    ({
      street: 'Endereço da Loja (configurar)',
      number: 'S/N',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '20000-000',
      contactName: store.shopName,
    } as any);

  // 3. Buscar entregadores vinculados à loja
  const linkedPartners = await prisma.storeDeliveryPartner.findMany({
    where: {
      storeId: store.onChainStoreId!,
      status: 'active',
    },
    orderBy: { priority: 'asc' },
    select: { deliveryPersonId: true },
  });

  // 4. Estimar características do pacote
  const packageDetails = estimatePackageDetails(order.items);

  // 5. Calcular frete
  const feeResult = await calculateDeliveryFee({
    pickupAddress,
    deliveryAddress: order.shippingAddress as any,
    packageType: packageDetails.packageType,
    weight: packageDetails.weight,
  });

  // 6. Criar DeliveryRequest
  const deliveryRequest = await prisma.deliveryRequest.create({
    data: {
      sourceType: 'order',
      orderId: order.id,
      senderId: order.sellerStoreId,
      senderType: 'store',
      recipientId: order.buyerAddr, // TODO: mapear para profileId real
      pickupAddress,
      deliveryAddress: order.shippingAddress,
      packageType: packageDetails.packageType,
      weight: packageDetails.weight,
      deliveryFeeBzr: feeResult.totalBzr,
      distance: feeResult.distance,
      preferredDeliverers: linkedPartners.map((p) => p.deliveryPersonId),
      isPrivateNetwork: linkedPartners.length > 0,
      status: DeliveryRequestStatus.PENDING,
      expiresAt:
        linkedPartners.length > 0
          ? BigInt(Date.now() + 2 * 60 * 1000)
          : null, // 2min para rede vinculada
      createdAt: BigInt(Date.now()),
      updatedAt: BigInt(Date.now()),
    },
  });

  console.log(
    `[DELIVERY] DeliveryRequest ${deliveryRequest.id} criado para Order ${orderId}`
  );

  // 7. Notificar entregadores (TODO: implementar worker/queue)
  // await notifyDeliveryNetwork(deliveryRequest.id);

  return {
    deliveryRequestId: deliveryRequest.id,
    deliveryFeeBzr: feeResult.totalBzr,
  };
}
```

---

### 3. Modificar POST /orders para Criar DeliveryRequest

**Arquivo:** `apps/api/src/routes/orders.ts`

**Localizar a função POST /orders (linha ~66) e adicionar após criar o Order:**

```typescript
// ... código existente de criação de Order ...

const order = await prisma.order.create({
  // ... dados existentes ...
});

// ============================================
// NOVO: Criar DeliveryRequest se tiver endereço
// ============================================
if (order.shippingAddress && process.env.FEATURE_AUTO_CREATE_DELIVERY === 'true') {
  try {
    const deliveryResult = await createDeliveryRequestForOrder(
      prisma,
      order.id
    );

    if (deliveryResult) {
      app.log.info(
        {
          orderId: order.id,
          deliveryRequestId: deliveryResult.deliveryRequestId,
          deliveryFeeBzr: deliveryResult.deliveryFeeBzr,
        },
        'DeliveryRequest criado automaticamente'
      );
    }
  } catch (err) {
    // Não falhar o Order se delivery der erro
    app.log.error(
      {
        err,
        orderId: order.id,
      },
      'Erro ao criar DeliveryRequest, Order criado normalmente'
    );
  }
}

// ... resto do código (return payload) ...
```

**Importar no topo do arquivo:**

```typescript
import { createDeliveryRequestForOrder } from '../lib/deliveryRequestHelper.js';
```

---

### 4. Atualizar Order.status Quando Entrega É Coletada

**Arquivo:** `apps/api/src/routes/delivery.ts`

**Na função POST /delivery/requests/:id/pickup, já temos:**

```typescript
// Se for entrega de order, atualizar Order.status
if (deliveryRequest.orderId) {
  await prisma.order.update({
    where: { id: deliveryRequest.orderId },
    data: { status: 'SHIPPED' },
  });
}
```

✅ Já está implementado na Fase 3!

---

### 5. (Opcional) Atualizar Order.status Quando Entrega É Concluída

**Arquivo:** `apps/api/src/routes/delivery.ts`

**Na função POST /delivery/requests/:id/deliver, adicionar:**

```typescript
// ... após atualizar DeliveryRequest ...

// Se for entrega de order, pode atualizar Order.status para RELEASED
if (updated.orderId) {
  await prisma.order.update({
    where: { id: updated.orderId },
    data: { status: 'RELEASED' },
  });

  app.log.info(
    {
      orderId: updated.orderId,
      deliveryRequestId: id,
    },
    'Order marcado como RELEASED após entrega'
  );
}
```

---

### 6. Adicionar Feature Flag

**Arquivo:** `.env`

```env
# Feature Flags
FEATURE_AUTO_CREATE_DELIVERY=true  # Habilitar criação automática de DeliveryRequest
```

**Arquivo:** `apps/api/src/env.ts`

Verificar se já foi adicionado na Fase 2:

```typescript
FEATURE_AUTO_CREATE_DELIVERY: z.string().default('false'),
```

---

### 7. (Opcional) Endpoint para Calcular Frete Antes de Finalizar Pedido

**Arquivo:** `apps/api/src/routes/orders.ts`

**Adicionar novo endpoint:**

```typescript
/**
 * POST /orders/estimate-shipping - Estimar frete antes de finalizar pedido
 */
app.post('/orders/estimate-shipping', async (request, reply) => {
  try {
    const body = z
      .object({
        sellerStoreId: z.string().uuid(),
        deliveryAddress: addressSchema,
        items: z.array(
          z.object({
            listingId: z.string().uuid(),
            qty: z.number().int().min(1),
            kind: z.enum(['product', 'service']),
          })
        ),
      })
      .parse(request.body);

    // Buscar loja
    const store = await prisma.sellerProfile.findUnique({
      where: { id: body.sellerStoreId },
      select: { pickupAddress: true, shopName: true },
    });

    if (!store || !store.pickupAddress) {
      return reply.status(400).send({
        error: 'Loja não configurada para entrega',
        message: 'A loja não possui endereço de coleta cadastrado',
      });
    }

    // Estimar características do pacote
    const packageDetails = estimatePackageDetails(body.items);

    // Calcular frete
    const feeResult = await calculateDeliveryFee({
      pickupAddress: store.pickupAddress as any,
      deliveryAddress: body.deliveryAddress,
      packageType: packageDetails.packageType,
      weight: packageDetails.weight,
    });

    return reply.send({
      deliveryFeeBzr: feeResult.totalBzr,
      distance: feeResult.distance,
      estimatedTimeMinutes: feeResult.estimatedTimeMinutes,
      breakdown: feeResult.breakdown,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send({
        error: 'Dados inválidos',
        details: err.errors,
      });
    }

    app.log.error({ err }, 'Erro ao estimar frete');
    return reply.status(500).send({
      error: 'Erro ao estimar frete',
    });
  }
});
```

---

## VALIDAÇÃO

### Teste Completo de Fluxo

```bash
# 1. Criar order com endereço de entrega
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"listingId": "product-uuid", "qty": 2, "kind": "product"}
    ],
    "shippingAddress": {
      "street": "Rua Teste",
      "number": "123",
      "city": "Rio de Janeiro",
      "state": "RJ",
      "zipCode": "22000-000"
    }
  }'

# 2. Verificar se DeliveryRequest foi criado
# Obter orderId do response acima, então:
curl http://localhost:3000/api/orders/{orderId}

# No response, verificar se tem "deliveryRequest"

# 3. Como entregador, listar demandas
curl http://localhost:3000/api/delivery/requests \
  -H "Authorization: Bearer DELIVERER_TOKEN"

# 4. Aceitar entrega
curl -X POST http://localhost:3000/api/delivery/requests/{deliveryId}/accept \
  -H "Authorization: Bearer DELIVERER_TOKEN"

# 5. Confirmar coleta
curl -X POST http://localhost:3000/api/delivery/requests/{deliveryId}/pickup \
  -H "Authorization: Bearer DELIVERER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lat": -22.9068, "lng": -43.1729}'

# 6. Verificar se Order.status mudou para "SHIPPED"
curl http://localhost:3000/api/orders/{orderId}

# 7. Confirmar entrega
curl -X POST http://localhost:3000/api/delivery/requests/{deliveryId}/deliver \
  -H "Authorization: Bearer DELIVERER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lat": -22.9653, "lng": -43.1802}'

# 8. Verificar se Order.status mudou para "RELEASED"
curl http://localhost:3000/api/orders/{orderId}
```

---

**Checklist:**

- [ ] createDeliveryRequestForOrder criado e funciona
- [ ] POST /orders cria DeliveryRequest automaticamente se FEATURE_AUTO_CREATE_DELIVERY=true
- [ ] DeliveryRequest vinculado ao Order corretamente
- [ ] Entregadores vinculados são priorizados (preferredDeliverers)
- [ ] Order.status muda para "SHIPPED" após pickup
- [ ] Order.status muda para "RELEASED" após deliver (opcional)
- [ ] POST /orders/estimate-shipping funciona (opcional)
- [ ] Erro na criação de DeliveryRequest não quebra criação de Order

---

**PRÓXIMA FASE:** [FASE 7 - Testes E2E e Validação Final](FASE7_TESTS_VALIDATION.md)
