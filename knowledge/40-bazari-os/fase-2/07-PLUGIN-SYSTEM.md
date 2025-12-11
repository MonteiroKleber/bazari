# P0: Sistema de Plugins Low-Code

**Prioridade:** P0 (Crítica)
**Status:** Pendente
**Esforço:** Médio
**Impacto:** Altíssimo (atinge 90% dos lojistas)

---

## Problema

A arquitetura atual de apps requer que lojistas:
- Saibam programar em React/TypeScript
- Entendam smart contracts ink!
- Usem CLI, IPFS, etc.

**Realidade:** 90% dos lojistas querem apenas "ativar fidelidade na minha loja" sem código.

---

## Solução: Sistema de Plugins

Plugins são funcionalidades pré-construídas que lojistas ativam e configuram via UI, sem escrever código.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         ARQUITETURA DE PLUGINS                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                           PLUGIN REGISTRY                                │    │
│  │                         (Banco de Dados)                                 │    │
│  ├─────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                          │    │
│  │  Plugin Definition (criado por Bazari ou Devs)                          │    │
│  │  ┌────────────────────────────────────────────────────────────────┐     │    │
│  │  │ {                                                               │     │    │
│  │  │   "id": "loyalty-program",                                      │     │    │
│  │  │   "name": "Programa de Fidelidade",                             │     │    │
│  │  │   "version": "1.0.0",                                           │     │    │
│  │  │   "category": "engagement",                                     │     │    │
│  │  │   "pricing": { "type": "free" },                                │     │    │
│  │  │   "configSchema": { ... },   ◄── JSON Schema                   │     │    │
│  │  │   "components": { ... },     ◄── Quais componentes renderizar  │     │    │
│  │  │   "hooks": { ... },          ◄── Eventos que disparam ações    │     │    │
│  │  │   "contract": "5Gw..."       ◄── Contrato ink! (opcional)      │     │    │
│  │  │ }                                                               │     │    │
│  │  └────────────────────────────────────────────────────────────────┘     │    │
│  │                                                                          │    │
│  │  Plugin Instance (configuração do lojista)                              │    │
│  │  ┌────────────────────────────────────────────────────────────────┐     │    │
│  │  │ {                                                               │     │    │
│  │  │   "id": "inst_abc123",                                          │     │    │
│  │  │   "pluginId": "loyalty-program",                                │     │    │
│  │  │   "sellerId": "seller_xyz",                                     │     │    │
│  │  │   "storeId": "store_456",                                       │     │    │
│  │  │   "enabled": true,                                              │     │    │
│  │  │   "config": {                                                   │     │    │
│  │  │     "pointsPerBZR": 100,                                        │     │    │
│  │  │     "minRedeem": 50,                                            │     │    │
│  │  │     "rewards": [...]                                            │     │    │
│  │  │   },                                                            │     │    │
│  │  │   "branding": {                                                 │     │    │
│  │  │     "primaryColor": "#FF6B00"                                   │     │    │
│  │  │   }                                                             │     │    │
│  │  │ }                                                               │     │    │
│  │  └────────────────────────────────────────────────────────────────┘     │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                      │                                           │
│                                      ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         PLUGIN RENDERER                                  │    │
│  │                    (Componentes React Nativos)                           │    │
│  ├─────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                          │    │
│  │  O Bazari já tem os componentes, plugin só configura:                   │    │
│  │                                                                          │    │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │    │
│  │  │ LoyaltyWidget    │  │ CouponBanner     │  │ CashbackBadge    │       │    │
│  │  │ (nativo Bazari)  │  │ (nativo Bazari)  │  │ (nativo Bazari)  │       │    │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘       │    │
│  │           │                     │                     │                  │    │
│  │           └─────────────────────┼─────────────────────┘                  │    │
│  │                                 ▼                                        │    │
│  │                    Recebe config do plugin                              │    │
│  │                    Renderiza com dados do lojista                       │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Modelo de Dados

### Schema Prisma

**Arquivo:** `apps/api/prisma/schema.prisma`

```prisma
// Definição do plugin (template)
model PluginDefinition {
  id          String   @id @default(cuid())
  slug        String   @unique  // "loyalty-program"
  name        String             // "Programa de Fidelidade"
  description String
  version     String   @default("1.0.0")
  category    PluginCategory

  // Pricing
  pricingType   PluginPricing @default(FREE)
  priceMonthly  Decimal?      @db.Decimal(18, 12)
  pricingTiers  Json?         // { "basic": 0, "pro": 10 }

  // Schema de configuração (JSON Schema)
  configSchema  Json           // Define campos configuráveis
  defaultConfig Json           // Valores padrão

  // Componentes que o plugin usa
  components    Json           // { "storePage": "LoyaltyWidget", ... }

  // Hooks (eventos que disparam ações)
  hooks         Json?          // { "onPurchase": "addPoints", ... }

  // Smart contract associado (opcional)
  contractAddress String?
  contractAbi     Json?

  // Metadata
  iconUrl       String?
  bannerUrl     String?
  developerName String   @default("Bazari")
  isOfficial    Boolean  @default(true)
  isActive      Boolean  @default(true)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  instances     PluginInstance[]

  @@index([category])
  @@index([isActive])
}

// Instância do plugin (configuração do lojista)
model PluginInstance {
  id          String   @id @default(cuid())

  pluginId    String
  plugin      PluginDefinition @relation(fields: [pluginId], references: [id])

  sellerId    String
  seller      SellerProfile @relation(fields: [sellerId], references: [id])

  storeId     String?

  // Estado
  enabled     Boolean  @default(true)

  // Configuração customizada pelo lojista
  config      Json     // Valores específicos do lojista
  branding    Json?    // Cores, logo, etc

  // Dados runtime
  stats       Json?    // Estatísticas de uso

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([pluginId, sellerId, storeId])
  @@index([sellerId])
  @@index([pluginId])
}

enum PluginCategory {
  ENGAGEMENT    // Fidelidade, Gamificação
  MARKETING     // Cupons, Promoções
  OPERATIONS    // Delivery, Estoque
  PAYMENTS      // Cashback, Parcelamento
  ANALYTICS     // Relatórios, Insights
  COMMUNICATION // Chat, Notificações
}

enum PluginPricing {
  FREE
  PAID
  FREEMIUM
  USAGE_BASED
}
```

---

## API Endpoints

### Arquivo: `apps/api/src/routes/plugins.ts`

```typescript
import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authOnRequest } from '../middleware/auth.js';

const pluginsRoutes: FastifyPluginAsync = async (app) => {

  // ═══════════════════════════════════════════════════════════════════
  // ROTAS PÚBLICAS - Listar plugins disponíveis
  // ═══════════════════════════════════════════════════════════════════

  // GET /plugins - Lista todos os plugins disponíveis
  app.get('/plugins', async (request, reply) => {
    const { category } = request.query as { category?: string };

    const plugins = await prisma.pluginDefinition.findMany({
      where: {
        isActive: true,
        ...(category && { category: category as any }),
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        pricingType: true,
        priceMonthly: true,
        iconUrl: true,
        developerName: true,
        isOfficial: true,
      },
      orderBy: [
        { isOfficial: 'desc' },
        { name: 'asc' },
      ],
    });

    return { plugins };
  });

  // GET /plugins/:slug - Detalhes de um plugin
  app.get('/plugins/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const plugin = await prisma.pluginDefinition.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        version: true,
        category: true,
        pricingType: true,
        priceMonthly: true,
        pricingTiers: true,
        configSchema: true,
        defaultConfig: true,
        iconUrl: true,
        bannerUrl: true,
        developerName: true,
        isOfficial: true,
      },
    });

    if (!plugin) {
      return reply.status(404).send({ error: 'Plugin not found' });
    }

    return { plugin };
  });

  // ═══════════════════════════════════════════════════════════════════
  // ROTAS AUTENTICADAS - Gerenciar plugins do vendedor
  // ═══════════════════════════════════════════════════════════════════

  // GET /seller/plugins - Lista plugins instalados pelo vendedor
  app.get('/seller/plugins', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).authUser?.sub;

    const seller = await prisma.sellerProfile.findFirst({
      where: { userId },
    });

    if (!seller) {
      return reply.status(404).send({ error: 'Seller profile not found' });
    }

    const instances = await prisma.pluginInstance.findMany({
      where: { sellerId: seller.id },
      include: {
        plugin: {
          select: {
            slug: true,
            name: true,
            category: true,
            iconUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { plugins: instances };
  });

  // POST /seller/plugins/:slug/install - Instalar um plugin
  app.post('/seller/plugins/:slug/install', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).authUser?.sub;
    const { slug } = request.params as { slug: string };
    const { config, branding } = request.body as {
      config?: Record<string, any>;
      branding?: Record<string, any>;
    };

    // Buscar seller
    const seller = await prisma.sellerProfile.findFirst({
      where: { userId },
    });

    if (!seller) {
      return reply.status(404).send({ error: 'Seller profile not found' });
    }

    // Buscar plugin
    const plugin = await prisma.pluginDefinition.findUnique({
      where: { slug },
    });

    if (!plugin || !plugin.isActive) {
      return reply.status(404).send({ error: 'Plugin not found' });
    }

    // Verificar se já está instalado
    const existing = await prisma.pluginInstance.findFirst({
      where: {
        pluginId: plugin.id,
        sellerId: seller.id,
      },
    });

    if (existing) {
      return reply.status(400).send({ error: 'Plugin already installed' });
    }

    // Validar config contra schema
    const finalConfig = {
      ...(plugin.defaultConfig as object),
      ...config,
    };

    // TODO: Validar finalConfig contra plugin.configSchema

    // Criar instância
    const instance = await prisma.pluginInstance.create({
      data: {
        pluginId: plugin.id,
        sellerId: seller.id,
        config: finalConfig,
        branding: branding || {},
        enabled: true,
      },
      include: {
        plugin: {
          select: {
            slug: true,
            name: true,
          },
        },
      },
    });

    app.log.info({ sellerId: seller.id, pluginSlug: slug }, 'Plugin installed');

    return {
      success: true,
      instance,
    };
  });

  // PUT /seller/plugins/:instanceId - Atualizar configuração
  app.put('/seller/plugins/:instanceId', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).authUser?.sub;
    const { instanceId } = request.params as { instanceId: string };
    const { config, branding, enabled } = request.body as {
      config?: Record<string, any>;
      branding?: Record<string, any>;
      enabled?: boolean;
    };

    // Buscar seller
    const seller = await prisma.sellerProfile.findFirst({
      where: { userId },
    });

    if (!seller) {
      return reply.status(404).send({ error: 'Seller profile not found' });
    }

    // Buscar instância
    const instance = await prisma.pluginInstance.findFirst({
      where: {
        id: instanceId,
        sellerId: seller.id,
      },
      include: { plugin: true },
    });

    if (!instance) {
      return reply.status(404).send({ error: 'Plugin instance not found' });
    }

    // Atualizar
    const updated = await prisma.pluginInstance.update({
      where: { id: instanceId },
      data: {
        ...(config && { config: { ...(instance.config as object), ...config } }),
        ...(branding && { branding: { ...(instance.branding as object), ...branding } }),
        ...(typeof enabled === 'boolean' && { enabled }),
      },
    });

    return {
      success: true,
      instance: updated,
    };
  });

  // DELETE /seller/plugins/:instanceId - Desinstalar plugin
  app.delete('/seller/plugins/:instanceId', {
    onRequest: authOnRequest,
  }, async (request, reply) => {
    const userId = (request as any).authUser?.sub;
    const { instanceId } = request.params as { instanceId: string };

    const seller = await prisma.sellerProfile.findFirst({
      where: { userId },
    });

    if (!seller) {
      return reply.status(404).send({ error: 'Seller profile not found' });
    }

    const instance = await prisma.pluginInstance.findFirst({
      where: {
        id: instanceId,
        sellerId: seller.id,
      },
    });

    if (!instance) {
      return reply.status(404).send({ error: 'Plugin instance not found' });
    }

    await prisma.pluginInstance.delete({
      where: { id: instanceId },
    });

    return { success: true };
  });

  // ═══════════════════════════════════════════════════════════════════
  // ROTAS PÚBLICAS - Obter plugins de uma loja (para renderizar)
  // ═══════════════════════════════════════════════════════════════════

  // GET /stores/:storeSlug/plugins - Plugins ativos de uma loja
  app.get('/stores/:storeSlug/plugins', async (request, reply) => {
    const { storeSlug } = request.params as { storeSlug: string };

    const seller = await prisma.sellerProfile.findFirst({
      where: { shopSlug: storeSlug },
    });

    if (!seller) {
      return reply.status(404).send({ error: 'Store not found' });
    }

    const instances = await prisma.pluginInstance.findMany({
      where: {
        sellerId: seller.id,
        enabled: true,
      },
      include: {
        plugin: {
          select: {
            slug: true,
            name: true,
            components: true,
          },
        },
      },
    });

    // Formatar para o frontend
    const plugins = instances.map(inst => ({
      slug: inst.plugin.slug,
      name: inst.plugin.name,
      components: inst.plugin.components,
      config: inst.config,
      branding: inst.branding,
    }));

    return { plugins };
  });
};

export default pluginsRoutes;
```

---

## Frontend: Renderização de Plugins

### Componente de Renderização

**Arquivo:** `apps/web/src/components/plugins/PluginRenderer.tsx`

```tsx
import { useMemo } from 'react';
import { LoyaltyWidget } from './widgets/LoyaltyWidget';
import { CouponBanner } from './widgets/CouponBanner';
import { CashbackBadge } from './widgets/CashbackBadge';
import { DeliveryTracker } from './widgets/DeliveryTracker';

// Registro de componentes disponíveis
const PLUGIN_COMPONENTS: Record<string, React.ComponentType<any>> = {
  LoyaltyWidget,
  CouponBanner,
  CashbackBadge,
  DeliveryTracker,
};

interface PluginData {
  slug: string;
  name: string;
  components: {
    storePage?: string;
    productPage?: string;
    checkoutPage?: string;
    widget?: string;
  };
  config: Record<string, any>;
  branding?: Record<string, any>;
}

interface PluginRendererProps {
  plugins: PluginData[];
  location: 'storePage' | 'productPage' | 'checkoutPage' | 'widget';
  context?: {
    storeId?: string;
    productId?: string;
    userId?: string;
  };
}

export function PluginRenderer({ plugins, location, context }: PluginRendererProps) {
  const componentsToRender = useMemo(() => {
    return plugins
      .filter(plugin => plugin.components[location])
      .map(plugin => {
        const componentName = plugin.components[location]!;
        const Component = PLUGIN_COMPONENTS[componentName];

        if (!Component) {
          console.warn(`Plugin component not found: ${componentName}`);
          return null;
        }

        return {
          key: `${plugin.slug}-${location}`,
          Component,
          props: {
            config: plugin.config,
            branding: plugin.branding,
            context,
          },
        };
      })
      .filter(Boolean);
  }, [plugins, location, context]);

  if (componentsToRender.length === 0) {
    return null;
  }

  return (
    <div className="plugin-container space-y-4">
      {componentsToRender.map(({ key, Component, props }) => (
        <Component key={key} {...props} />
      ))}
    </div>
  );
}
```

### Exemplo: Widget de Fidelidade

**Arquivo:** `apps/web/src/components/plugins/widgets/LoyaltyWidget.tsx`

```tsx
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Gift, Star } from 'lucide-react';
import { useSession } from '@/modules/auth';

interface LoyaltyConfig {
  pointsPerBZR: number;
  minRedeem: number;
  rewards: Array<{
    points: number;
    discount: string;
    description?: string;
  }>;
}

interface LoyaltyWidgetProps {
  config: LoyaltyConfig;
  branding?: {
    primaryColor?: string;
  };
  context?: {
    storeId?: string;
    userId?: string;
  };
}

export function LoyaltyWidget({ config, branding, context }: LoyaltyWidgetProps) {
  const { session } = useSession();
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  // Buscar pontos do usuário
  useEffect(() => {
    if (session?.address && context?.storeId) {
      fetchUserPoints(context.storeId, session.address)
        .then(setPoints)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [session?.address, context?.storeId]);

  // Encontrar próxima recompensa
  const sortedRewards = [...config.rewards].sort((a, b) => a.points - b.points);
  const nextReward = sortedRewards.find(r => r.points > points);
  const availableRewards = sortedRewards.filter(r => r.points <= points);

  const progressToNext = nextReward
    ? (points / nextReward.points) * 100
    : 100;

  const primaryColor = branding?.primaryColor || '#FF6B00';

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="text-white"
        style={{ backgroundColor: primaryColor }}
      >
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Programa de Fidelidade
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {!session ? (
          <p className="text-sm text-muted-foreground">
            Faça login para acumular pontos!
          </p>
        ) : loading ? (
          <div className="animate-pulse h-20 bg-muted rounded" />
        ) : (
          <>
            {/* Pontos atuais */}
            <div className="text-center">
              <div className="text-3xl font-bold" style={{ color: primaryColor }}>
                {points.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">pontos</div>
            </div>

            {/* Progresso para próxima recompensa */}
            {nextReward && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Próxima recompensa</span>
                  <span>{nextReward.discount}</span>
                </div>
                <Progress value={progressToNext} className="h-2" />
                <div className="text-xs text-muted-foreground text-right">
                  Faltam {nextReward.points - points} pontos
                </div>
              </div>
            )}

            {/* Recompensas disponíveis */}
            {availableRewards.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Recompensas disponíveis:</div>
                {availableRewards.map((reward, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => redeemReward(reward)}
                  >
                    <span className="flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      {reward.discount}
                    </span>
                    <span className="text-muted-foreground">
                      {reward.points} pts
                    </span>
                  </Button>
                ))}
              </div>
            )}

            {/* Info de acúmulo */}
            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              Ganhe {config.pointsPerBZR} pontos a cada 1 BZR gasto
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

async function fetchUserPoints(storeId: string, userAddress: string): Promise<number> {
  try {
    const response = await fetch(`/api/plugins/loyalty/${storeId}/points/${userAddress}`);
    if (response.ok) {
      const data = await response.json();
      return data.points || 0;
    }
  } catch (error) {
    console.error('Failed to fetch points:', error);
  }
  return 0;
}

async function redeemReward(reward: { points: number; discount: string }) {
  // TODO: Implementar resgate via API/Contract
  console.log('Redeem reward:', reward);
}
```

---

## Integração na Página da Loja

**Arquivo:** `apps/web/src/pages/StorePublicPage.tsx`

```tsx
import { useQuery } from '@tanstack/react-query';
import { PluginRenderer } from '@/components/plugins/PluginRenderer';

export default function StorePublicPage() {
  const { storeSlug } = useParams();

  // Buscar dados da loja
  const { data: store } = useQuery({
    queryKey: ['store', storeSlug],
    queryFn: () => fetchStore(storeSlug),
  });

  // Buscar plugins ativos da loja
  const { data: pluginsData } = useQuery({
    queryKey: ['store-plugins', storeSlug],
    queryFn: () => fetchStorePlugins(storeSlug),
    enabled: !!storeSlug,
  });

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header da loja */}
      <StoreHeader store={store} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Coluna principal - Produtos */}
        <div className="lg:col-span-2">
          <ProductGrid products={store?.products} />
        </div>

        {/* Sidebar - Plugins */}
        <div className="space-y-4">
          {pluginsData?.plugins && (
            <PluginRenderer
              plugins={pluginsData.plugins}
              location="storePage"
              context={{ storeId: store?.id }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

async function fetchStorePlugins(storeSlug: string) {
  const response = await fetch(`/api/stores/${storeSlug}/plugins`);
  return response.json();
}
```

---

## Hooks: Eventos Automáticos

Plugins podem reagir a eventos do sistema automaticamente.

**Arquivo:** `apps/api/src/services/pluginHooks.ts`

```typescript
import { prisma } from '../lib/prisma.js';

type HookEvent =
  | 'onPurchase'      // Compra finalizada
  | 'onCheckout'      // Início do checkout
  | 'onProductView'   // Visualização de produto
  | 'onStoreVisit'    // Visita à loja
  | 'onReview'        // Review postado
  | 'onReferral';     // Indicação

interface HookContext {
  sellerId: string;
  userId?: string;
  orderId?: string;
  productId?: string;
  amount?: number;
}

export async function triggerPluginHooks(
  event: HookEvent,
  context: HookContext
) {
  // Buscar plugins ativos do seller que tem esse hook
  const instances = await prisma.pluginInstance.findMany({
    where: {
      sellerId: context.sellerId,
      enabled: true,
    },
    include: {
      plugin: true,
    },
  });

  for (const instance of instances) {
    const hooks = instance.plugin.hooks as Record<string, string> | null;

    if (hooks && hooks[event]) {
      const action = hooks[event];
      await executeHookAction(action, instance, context);
    }
  }
}

async function executeHookAction(
  action: string,
  instance: any,
  context: HookContext
) {
  switch (action) {
    case 'addPoints':
      await addLoyaltyPoints(instance, context);
      break;
    case 'applyCashback':
      await applyCashback(instance, context);
      break;
    case 'sendNotification':
      await sendNotification(instance, context);
      break;
    default:
      console.warn(`Unknown hook action: ${action}`);
  }
}

async function addLoyaltyPoints(instance: any, context: HookContext) {
  if (!context.userId || !context.amount) return;

  const config = instance.config as { pointsPerBZR: number };
  const points = Math.floor((context.amount / 1e12) * config.pointsPerBZR);

  // Salvar pontos (pode ser banco ou contrato)
  await prisma.loyaltyPoints.upsert({
    where: {
      instanceId_userId: {
        instanceId: instance.id,
        userId: context.userId,
      },
    },
    update: {
      points: { increment: points },
    },
    create: {
      instanceId: instance.id,
      userId: context.userId,
      points,
    },
  });
}
```

**Uso no fluxo de compra:**

```typescript
// apps/api/src/routes/orders.ts

// Após finalizar pedido
await triggerPluginHooks('onPurchase', {
  sellerId: order.sellerId,
  userId: order.buyerId,
  orderId: order.id,
  amount: order.total,
});
```

---

## Fluxo Completo

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         FLUXO DO SISTEMA DE PLUGINS                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  SETUP (Uma vez)                                                                │
│  ───────────────                                                                 │
│  [1] Admin Bazari cria PluginDefinition no banco                                │
│      - Define configSchema, components, hooks                                   │
│      - Plugin aparece em /plugins                                               │
│                                                                                  │
│  INSTALAÇÃO (Lojista)                                                           │
│  ─────────────────────                                                           │
│  [2] Lojista acessa /app/seller/plugins                                         │
│  [3] Vê lista de plugins disponíveis                                            │
│  [4] Clica "Instalar" em "Programa de Fidelidade"                               │
│  [5] Preenche formulário gerado pelo configSchema                               │
│  [6] POST /seller/plugins/loyalty-program/install                               │
│  [7] PluginInstance criada no banco                                             │
│                                                                                  │
│  RENDERIZAÇÃO (Cliente)                                                         │
│  ───────────────────────                                                         │
│  [8] Cliente acessa /loja/nome-da-loja                                          │
│  [9] GET /stores/nome-da-loja/plugins                                           │
│  [10] Retorna lista de plugins ativos com config                                │
│  [11] PluginRenderer monta componentes na página                                │
│  [12] LoyaltyWidget mostra pontos do cliente                                    │
│                                                                                  │
│  EVENTO (Compra)                                                                │
│  ───────────────                                                                 │
│  [13] Cliente finaliza compra                                                   │
│  [14] triggerPluginHooks('onPurchase', { ... })                                 │
│  [15] Hook "addPoints" executado                                                │
│  [16] Pontos adicionados ao cliente                                             │
│  [17] Próxima visita mostra pontos atualizados                                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Critérios de Aceite

- [ ] Modelo PluginDefinition e PluginInstance no Prisma
- [ ] API CRUD para plugins
- [ ] PluginRenderer funcionando
- [ ] Widget de Fidelidade implementado
- [ ] Hook onPurchase disparando addPoints
- [ ] Página da loja renderizando plugins
- [ ] Formulário de configuração gerado dinamicamente

---

**Versão:** 1.0.0
**Data:** 2024-12-07
