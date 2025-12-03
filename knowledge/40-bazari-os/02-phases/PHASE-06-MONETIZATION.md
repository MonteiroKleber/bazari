# Fase 6: Monetization - Monetização e Blockchain

**Status:** Pendente
**Prioridade:** Baixa
**Dependências:** Fases 1-5
**Estimativa:** ~10 tasks

---

## Objetivo

Implementar sistema de monetização de apps: apps pagos, in-app purchases, revenue share via smart contract, e pagamentos em BZR.

---

## Resultado Esperado

Ao final desta fase:
- Apps podem ser pagos ou free
- In-app purchases funcionando
- Revenue share automático via blockchain
- Dashboard de receita para devs

---

## Pré-requisitos

- Fases 1-5 completas
- Smart contract de pagamento
- Integração com wallet

---

## Arquitetura de Monetização

```
┌─────────────────────────────────────────────────────────────────┐
│                    MONETIZATION FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │  User   │───▶│   Payment   │───▶│   Smart     │             │
│  │  Wallet │    │   Request   │    │   Contract  │             │
│  └─────────┘    └─────────────┘    └─────────────┘             │
│                                           │                      │
│                        ┌──────────────────┴──────────────────┐  │
│                        │                                      │  │
│                        ▼                                      ▼  │
│                 ┌─────────────┐                       ┌──────────┐
│                 │  Developer  │                       │  Bazari  │
│                 │   Wallet    │                       │ Treasury │
│                 │   (70-85%)  │                       │  (15-30%)│
│                 └─────────────┘                       └──────────┘
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tasks

### Task 6.1: Adicionar campos de monetização no schema

**Prioridade:** Alta
**Tipo:** modificar

**Arquivo:** `apps/api/prisma/schema.prisma`

**Adicionar ao model ThirdPartyApp:**
```prisma
model ThirdPartyApp {
  // ... campos existentes ...

  // Monetização
  monetizationType  MonetizationType @default(FREE)
  price             Decimal?         @db.Decimal(18, 8)
  currency          String           @default("BZR")

  // In-app purchases
  inAppPurchases    InAppPurchase[]

  // Revenue
  totalRevenue      Decimal          @default(0) @db.Decimal(18, 8)
  developerRevenue  Decimal          @default(0) @db.Decimal(18, 8)
  platformRevenue   Decimal          @default(0) @db.Decimal(18, 8)
}

enum MonetizationType {
  FREE
  PAID
  FREEMIUM
  SUBSCRIPTION
}

model InAppPurchase {
  id          String   @id @default(cuid())
  appId       String
  app         ThirdPartyApp @relation(fields: [appId], references: [id])

  productId   String   // ID único do produto no app
  name        String
  description String?
  price       Decimal  @db.Decimal(18, 8)
  currency    String   @default("BZR")
  type        PurchaseType

  createdAt   DateTime @default(now())

  purchases   AppPurchase[]

  @@unique([appId, productId])
}

enum PurchaseType {
  CONSUMABLE      // Pode comprar múltiplas vezes
  NON_CONSUMABLE  // Compra única permanente
  SUBSCRIPTION    // Recorrente
}

model AppPurchase {
  id              String   @id @default(cuid())

  userId          String
  user            User     @relation(fields: [userId], references: [id])

  appId           String
  app             ThirdPartyApp @relation(fields: [appId], references: [id])

  inAppPurchaseId String?
  inAppPurchase   InAppPurchase? @relation(fields: [inAppPurchaseId], references: [id])

  type            String   // "app" | "iap"
  amount          Decimal  @db.Decimal(18, 8)
  currency        String   @default("BZR")

  developerShare  Decimal  @db.Decimal(18, 8)
  platformShare   Decimal  @db.Decimal(18, 8)

  txHash          String?  // Hash da transação blockchain
  status          PaymentStatus @default(PENDING)

  createdAt       DateTime @default(now())
  confirmedAt     DateTime?

  @@index([userId])
  @@index([appId])
}

enum PaymentStatus {
  PENDING
  CONFIRMED
  FAILED
  REFUNDED
}
```

**Critérios de Aceite:**
- [ ] Schema atualizado
- [ ] Migration gerada
- [ ] Enums criados

---

### Task 6.2: Criar API de compra de apps

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/api/src/routes/app-store-purchase.ts`

**Código:**
```typescript
import { Hono } from 'hono';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { blockchainService } from '../services/blockchain';

const app = new Hono();

app.use('/*', authMiddleware);

// POST /store/apps/:appId/purchase - Comprar app
app.post('/apps/:appId/purchase', async (c) => {
  const userId = c.get('userId');
  const appId = c.req.param('appId');

  const thirdPartyApp = await prisma.thirdPartyApp.findUnique({
    where: { id: appId },
  });

  if (!thirdPartyApp) {
    return c.json({ error: 'App not found' }, 404);
  }

  if (thirdPartyApp.monetizationType === 'FREE') {
    return c.json({ error: 'App is free' }, 400);
  }

  // Verificar se já comprou
  const existingPurchase = await prisma.appPurchase.findFirst({
    where: {
      userId,
      appId,
      type: 'app',
      status: 'CONFIRMED',
    },
  });

  if (existingPurchase) {
    return c.json({ error: 'Already purchased' }, 400);
  }

  const price = thirdPartyApp.price!;

  // Calcular revenue share (exemplo: 75% dev, 25% platform)
  const developerShare = price.mul(0.75);
  const platformShare = price.mul(0.25);

  // Criar registro de compra pendente
  const purchase = await prisma.appPurchase.create({
    data: {
      userId,
      appId,
      type: 'app',
      amount: price,
      developerShare,
      platformShare,
      status: 'PENDING',
    },
  });

  // Iniciar transação blockchain
  // TODO: Integrar com smart contract real
  const txResult = await blockchainService.executeAppPurchase({
    purchaseId: purchase.id,
    buyerId: userId,
    developerId: thirdPartyApp.developerId,
    amount: price.toString(),
    developerShare: developerShare.toString(),
    platformShare: platformShare.toString(),
  });

  if (txResult.success) {
    await prisma.appPurchase.update({
      where: { id: purchase.id },
      data: {
        status: 'CONFIRMED',
        txHash: txResult.txHash,
        confirmedAt: new Date(),
      },
    });

    // Atualizar métricas do app
    await prisma.thirdPartyApp.update({
      where: { id: appId },
      data: {
        totalRevenue: { increment: price },
        developerRevenue: { increment: developerShare },
        platformRevenue: { increment: platformShare },
      },
    });
  }

  return c.json({
    purchase: await prisma.appPurchase.findUnique({
      where: { id: purchase.id },
    }),
  });
});

// POST /store/apps/:appId/iap/:productId - In-app purchase
app.post('/apps/:appId/iap/:productId', async (c) => {
  const userId = c.get('userId');
  const appId = c.req.param('appId');
  const productId = c.req.param('productId');

  const iap = await prisma.inAppPurchase.findFirst({
    where: { appId, productId },
    include: { app: true },
  });

  if (!iap) {
    return c.json({ error: 'Product not found' }, 404);
  }

  // Para non-consumable, verificar se já comprou
  if (iap.type === 'NON_CONSUMABLE') {
    const existing = await prisma.appPurchase.findFirst({
      where: {
        userId,
        inAppPurchaseId: iap.id,
        status: 'CONFIRMED',
      },
    });

    if (existing) {
      return c.json({ error: 'Already purchased' }, 400);
    }
  }

  const price = iap.price;
  const developerShare = price.mul(0.75);
  const platformShare = price.mul(0.25);

  const purchase = await prisma.appPurchase.create({
    data: {
      userId,
      appId,
      inAppPurchaseId: iap.id,
      type: 'iap',
      amount: price,
      developerShare,
      platformShare,
      status: 'PENDING',
    },
  });

  // TODO: Executar transação blockchain

  return c.json({ purchase });
});

// GET /store/apps/:appId/purchased - Verificar se usuário comprou
app.get('/apps/:appId/purchased', async (c) => {
  const userId = c.get('userId');
  const appId = c.req.param('appId');

  const purchase = await prisma.appPurchase.findFirst({
    where: {
      userId,
      appId,
      type: 'app',
      status: 'CONFIRMED',
    },
  });

  return c.json({ purchased: !!purchase, purchase });
});

export default app;
```

**Critérios de Aceite:**
- [ ] Compra de app funciona
- [ ] IAP funciona
- [ ] Revenue share calculado

---

### Task 6.3: Criar smart contract de pagamento (simplificado)

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `bazari-chain/pallets/bazari-app-store/src/lib.rs`

**Descrição:**
Pallet Substrate para gerenciar pagamentos de apps.

**Funcionalidades:**
- `purchase_app(app_id, amount)` - Compra de app
- `purchase_iap(app_id, product_id, amount)` - In-app purchase
- Revenue share automático

**Critérios de Aceite:**
- [ ] Pallet criado
- [ ] Extrinsics implementados
- [ ] Eventos emitidos

---

### Task 6.4: Criar UI de configuração de preço (dev portal)

**Prioridade:** Média
**Tipo:** criar

**Arquivo:** `apps/web/src/pages/developer/AppMonetizationPage.tsx`

**Descrição:**
Página para dev configurar:
- Tipo de monetização (free/paid/freemium)
- Preço do app
- In-app purchases
- Revenue reports

**Critérios de Aceite:**
- [ ] Configuração de preço
- [ ] Lista de IAPs
- [ ] Relatórios de receita

---

### Task 6.5: Criar componente de compra na App Store

**Prioridade:** Alta
**Tipo:** criar

**Arquivo:** `apps/web/src/components/platform/AppPurchaseButton.tsx`

**Código:**
```typescript
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { BazariApp } from '@/platform/types';

interface AppPurchaseButtonProps {
  app: BazariApp & {
    monetizationType?: string;
    price?: string;
  };
  onPurchased?: () => void;
}

export function AppPurchaseButton({ app, onPurchased }: AppPurchaseButtonProps) {
  const { data: purchaseStatus, refetch } = useQuery({
    queryKey: ['app-purchased', app.id],
    queryFn: () =>
      api.get(`/store/apps/${app.id}/purchased`).then((r) => r.data),
    enabled: app.monetizationType === 'PAID',
  });

  const purchase = useMutation({
    mutationFn: () =>
      api.post(`/store/apps/${app.id}/purchase`).then((r) => r.data),
    onSuccess: () => {
      refetch();
      onPurchased?.();
    },
  });

  // App gratuito
  if (!app.monetizationType || app.monetizationType === 'FREE') {
    return null;
  }

  // Já comprado
  if (purchaseStatus?.purchased) {
    return (
      <Button variant="outline" disabled>
        Comprado
      </Button>
    );
  }

  return (
    <Button
      onClick={() => purchase.mutate()}
      disabled={purchase.isPending}
    >
      {purchase.isPending ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : null}
      Comprar por {app.price} BZR
    </Button>
  );
}
```

**Critérios de Aceite:**
- [ ] Botão de compra
- [ ] Estado de já comprado
- [ ] Loading state

---

### Task 6.6: Criar dashboard de receita para devs

**Prioridade:** Média
**Tipo:** criar

**Arquivo:** `apps/web/src/pages/developer/RevenueDashboardPage.tsx`

**Descrição:**
Dashboard com:
- Gráfico de receita ao longo do tempo
- Breakdown por app
- Breakdown por tipo (app vs IAP)
- Lista de transações

**Critérios de Aceite:**
- [ ] Gráficos de receita
- [ ] Filtros de período
- [ ] Export de dados

---

### Task 6.7: Criar API de revenue para devs

**Prioridade:** Média
**Tipo:** criar

**Arquivo:** `apps/api/src/routes/developer-revenue.ts`

**Endpoints:**
- `GET /developer/revenue/summary` - Resumo de receita
- `GET /developer/revenue/transactions` - Lista de transações
- `GET /developer/revenue/apps/:appId` - Receita por app

**Critérios de Aceite:**
- [ ] Endpoints implementados
- [ ] Filtros por período
- [ ] Paginação

---

### Task 6.8: Implementar tiers de revenue share

**Prioridade:** Baixa
**Tipo:** criar

**Descrição:**
Sistema de tiers baseado em instalações:
- Starter (0-1k): 70% dev
- Growth (1k-10k): 75% dev
- Scale (10k-100k): 80% dev
- Enterprise (100k+): 85% dev

**Critérios de Aceite:**
- [ ] Tiers implementados
- [ ] Cálculo automático
- [ ] Upgrade/downgrade

---

### Task 6.9: Criar sistema de reembolso

**Prioridade:** Baixa
**Tipo:** criar

**Descrição:**
Permitir reembolso em até 24h após compra (políticas configuráveis).

**Critérios de Aceite:**
- [ ] Request de reembolso
- [ ] Aprovação automática (< 24h)
- [ ] Reversão do pagamento

---

### Task 6.10: Adicionar métricas de monetização ao Analytics

**Prioridade:** Baixa
**Tipo:** modificar

**Descrição:**
Adicionar ao dashboard de analytics do dev:
- Conversion rate (views -> purchases)
- Average Revenue Per User (ARPU)
- Lifetime Value (LTV)

**Critérios de Aceite:**
- [ ] Métricas calculadas
- [ ] Exibidas no dashboard

---

## Validação da Fase

### Checklist Final

- [ ] Apps pagos funcionando
- [ ] IAP funcionando
- [ ] Revenue share automático
- [ ] Dashboard de receita
- [ ] Relatórios para devs
- [ ] Integração blockchain

---

## Conclusão do Projeto

Com a conclusão desta fase, o BazariOS terá:

1. **Sistema de apps modular** - Usuários instalam o que querem
2. **App Store** - Descoberta e instalação de apps
3. **SDK para devs** - Criar apps facilmente
4. **Developer Portal** - Gerenciar apps
5. **Monetização** - Ganhar dinheiro com apps

O Bazari terá se transformado de um "super app" para um verdadeiro **Sistema Operacional Descentralizado**.

---

**Documento:** PHASE-06-MONETIZATION.md
**Versão:** 1.0.0
**Data:** 2024-12-03
