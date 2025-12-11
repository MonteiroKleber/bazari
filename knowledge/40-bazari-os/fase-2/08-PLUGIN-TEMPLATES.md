# P0: Templates de Plugins

**Prioridade:** P0 (Crítica)
**Status:** Pendente
**Esforço:** Médio
**Impacto:** Altíssimo
**Dependências:** 07-PLUGIN-SYSTEM.md

---

## Objetivo

Criar os templates de plugins mais requisitados pelos lojistas, prontos para uso imediato.

---

## Templates Prioritários

| Plugin | Categoria | Pricing | Impacto |
|--------|-----------|---------|---------|
| **Programa de Fidelidade** | Engagement | Free | Alto |
| **Cashback** | Payments | Free | Alto |
| **Cupons de Desconto** | Marketing | Free | Alto |
| **Delivery Tracking** | Operations | Freemium | Médio |
| **Avaliações** | Engagement | Free | Médio |
| **Chat com Loja** | Communication | Free | Médio |

---

## Template 1: Programa de Fidelidade

### Plugin Definition

```typescript
const loyaltyProgramPlugin: PluginDefinition = {
  slug: 'loyalty-program',
  name: 'Programa de Fidelidade',
  description: 'Recompense seus clientes com pontos a cada compra. Configure recompensas e aumente a retenção.',
  version: '1.0.0',
  category: 'ENGAGEMENT',

  pricingType: 'FREE',

  iconUrl: '/plugins/loyalty/icon.svg',
  bannerUrl: '/plugins/loyalty/banner.png',
  developerName: 'Bazari',
  isOfficial: true,

  // Schema de configuração
  configSchema: {
    type: 'object',
    required: ['pointsPerBZR'],
    properties: {
      pointsPerBZR: {
        type: 'number',
        title: 'Pontos por 1 BZR gasto',
        default: 100,
        minimum: 1,
        maximum: 1000,
      },
      minRedeem: {
        type: 'number',
        title: 'Mínimo de pontos para resgatar',
        default: 50,
        minimum: 1,
      },
      rewards: {
        type: 'array',
        title: 'Recompensas',
        items: {
          type: 'object',
          properties: {
            points: {
              type: 'number',
              title: 'Pontos necessários',
            },
            discountType: {
              type: 'string',
              enum: ['percentage', 'fixed'],
              title: 'Tipo de desconto',
            },
            discountValue: {
              type: 'number',
              title: 'Valor do desconto',
            },
            description: {
              type: 'string',
              title: 'Descrição',
            },
          },
        },
        default: [
          { points: 100, discountType: 'percentage', discountValue: 5, description: '5% de desconto' },
          { points: 500, discountType: 'percentage', discountValue: 15, description: '15% de desconto' },
          { points: 1000, discountType: 'percentage', discountValue: 25, description: '25% de desconto' },
        ],
      },
      expirationDays: {
        type: 'number',
        title: 'Pontos expiram em (dias)',
        description: 'Deixe em branco para não expirar',
        minimum: 30,
      },
      welcomeBonus: {
        type: 'number',
        title: 'Bônus de boas-vindas (pontos)',
        default: 0,
        description: 'Pontos dados na primeira compra',
      },
    },
  },

  defaultConfig: {
    pointsPerBZR: 100,
    minRedeem: 50,
    rewards: [
      { points: 100, discountType: 'percentage', discountValue: 5, description: '5% de desconto' },
      { points: 500, discountType: 'percentage', discountValue: 15, description: '15% de desconto' },
    ],
    welcomeBonus: 50,
  },

  // Componentes a renderizar
  components: {
    storePage: 'LoyaltyWidget',        // Widget na página da loja
    checkoutPage: 'LoyaltyRedeemBox',  // Caixa para usar pontos no checkout
    profilePage: 'LoyaltyHistory',     // Histórico de pontos no perfil
  },

  // Hooks automáticos
  hooks: {
    onPurchase: 'addPoints',           // Adiciona pontos após compra
    onFirstPurchase: 'addWelcomeBonus', // Bônus na primeira compra
  },
};
```

### Componentes React

**LoyaltyWidget** - Já documentado em 07-PLUGIN-SYSTEM.md

**LoyaltyRedeemBox** - Caixa no checkout:

```tsx
// apps/web/src/components/plugins/widgets/LoyaltyRedeemBox.tsx

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, Check } from 'lucide-react';

interface LoyaltyRedeemBoxProps {
  config: {
    rewards: Array<{
      points: number;
      discountType: 'percentage' | 'fixed';
      discountValue: number;
      description: string;
    }>;
  };
  context: {
    userPoints: number;
    cartTotal: number;
    onApplyDiscount: (discount: { type: string; value: number; pointsUsed: number }) => void;
  };
}

export function LoyaltyRedeemBox({ config, context }: LoyaltyRedeemBoxProps) {
  const [selectedReward, setSelectedReward] = useState<number | null>(null);
  const [applied, setApplied] = useState(false);

  const availableRewards = config.rewards.filter(r => r.points <= context.userPoints);

  if (availableRewards.length === 0) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="p-4 text-center">
          <Gift className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Você tem {context.userPoints} pontos.
            Continue comprando para ganhar recompensas!
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleApply = () => {
    if (selectedReward === null) return;

    const reward = config.rewards[selectedReward];
    context.onApplyDiscount({
      type: reward.discountType,
      value: reward.discountValue,
      pointsUsed: reward.points,
    });
    setApplied(true);
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium">Usar pontos de fidelidade</span>
          <Badge variant="secondary">{context.userPoints} pts</Badge>
        </div>

        {!applied ? (
          <>
            <div className="space-y-2">
              {availableRewards.map((reward, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedReward(idx)}
                  className={`w-full p-3 rounded-lg border text-left transition-colors ${
                    selectedReward === idx
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{reward.description}</span>
                    <span className="text-sm text-muted-foreground">
                      {reward.points} pts
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <Button
              onClick={handleApply}
              disabled={selectedReward === null}
              className="w-full"
            >
              <Gift className="h-4 w-4 mr-2" />
              Aplicar Recompensa
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-2 text-green-600">
            <Check className="h-5 w-5" />
            <span>Desconto aplicado!</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Template 2: Cashback

### Plugin Definition

```typescript
const cashbackPlugin: PluginDefinition = {
  slug: 'cashback',
  name: 'Cashback',
  description: 'Devolva uma porcentagem do valor da compra em BZR para seus clientes.',
  version: '1.0.0',
  category: 'PAYMENTS',

  pricingType: 'FREE',

  iconUrl: '/plugins/cashback/icon.svg',
  developerName: 'Bazari',
  isOfficial: true,

  configSchema: {
    type: 'object',
    required: ['cashbackPercent'],
    properties: {
      cashbackPercent: {
        type: 'number',
        title: 'Porcentagem de cashback',
        default: 5,
        minimum: 1,
        maximum: 50,
      },
      maxCashback: {
        type: 'number',
        title: 'Valor máximo de cashback (BZR)',
        description: 'Limite por compra. Deixe vazio para sem limite.',
      },
      minPurchase: {
        type: 'number',
        title: 'Compra mínima para cashback (BZR)',
        default: 0,
      },
      creditDelay: {
        type: 'number',
        title: 'Dias para creditar',
        description: 'Cashback é creditado X dias após a compra',
        default: 7,
        minimum: 0,
        maximum: 30,
      },
      fundingSource: {
        type: 'string',
        enum: ['seller_wallet', 'contract_pool'],
        title: 'Fonte do cashback',
        default: 'seller_wallet',
        description: 'De onde sai o BZR do cashback',
      },
    },
  },

  defaultConfig: {
    cashbackPercent: 5,
    minPurchase: 10,
    creditDelay: 7,
    fundingSource: 'seller_wallet',
  },

  components: {
    storePage: 'CashbackBadge',
    productPage: 'CashbackLabel',
    checkoutPage: 'CashbackPreview',
    profilePage: 'CashbackHistory',
  },

  hooks: {
    onPurchase: 'scheduleCashback',
    onOrderDelivered: 'creditCashback',
  },
};
```

### Componentes

**CashbackBadge:**

```tsx
// apps/web/src/components/plugins/widgets/CashbackBadge.tsx

import { Badge } from '@/components/ui/badge';
import { Coins } from 'lucide-react';

interface CashbackBadgeProps {
  config: {
    cashbackPercent: number;
  };
  branding?: {
    primaryColor?: string;
  };
}

export function CashbackBadge({ config, branding }: CashbackBadgeProps) {
  return (
    <Badge
      className="gap-1 text-sm py-1.5 px-3"
      style={{ backgroundColor: branding?.primaryColor || '#10B981' }}
    >
      <Coins className="h-4 w-4" />
      {config.cashbackPercent}% Cashback
    </Badge>
  );
}
```

**CashbackPreview (Checkout):**

```tsx
// apps/web/src/components/plugins/widgets/CashbackPreview.tsx

import { Card, CardContent } from '@/components/ui/card';
import { Coins, ArrowRight } from 'lucide-react';

interface CashbackPreviewProps {
  config: {
    cashbackPercent: number;
    maxCashback?: number;
    creditDelay: number;
  };
  context: {
    cartTotal: number;
  };
}

export function CashbackPreview({ config, context }: CashbackPreviewProps) {
  let cashbackAmount = (context.cartTotal * config.cashbackPercent) / 100;

  if (config.maxCashback && cashbackAmount > config.maxCashback) {
    cashbackAmount = config.maxCashback;
  }

  const formattedCashback = (cashbackAmount / 1e12).toFixed(2);

  return (
    <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
            <Coins className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-green-700 dark:text-green-300">
              Você vai ganhar {formattedCashback} BZR de volta!
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">
              Creditado em {config.creditDelay} dias após a entrega
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-green-500" />
        </div>
      </CardContent>
    </Card>
  );
}
```

### Hook: Processar Cashback

```typescript
// apps/api/src/services/plugins/cashbackHooks.ts

import { prisma } from '../../lib/prisma.js';
import { scheduleJob } from '../../lib/scheduler.js';

export async function scheduleCashback(instance: any, context: HookContext) {
  if (!context.orderId || !context.amount) return;

  const config = instance.config as {
    cashbackPercent: number;
    maxCashback?: number;
    minPurchase?: number;
    creditDelay: number;
  };

  // Verificar mínimo
  const amountBZR = context.amount / 1e12;
  if (config.minPurchase && amountBZR < config.minPurchase) {
    return;
  }

  // Calcular cashback
  let cashbackAmount = (context.amount * config.cashbackPercent) / 100;
  if (config.maxCashback) {
    const maxInPlancks = config.maxCashback * 1e12;
    cashbackAmount = Math.min(cashbackAmount, maxInPlancks);
  }

  // Agendar crédito
  const creditDate = new Date();
  creditDate.setDate(creditDate.getDate() + config.creditDelay);

  await prisma.pendingCashback.create({
    data: {
      pluginInstanceId: instance.id,
      orderId: context.orderId,
      userId: context.userId!,
      amount: cashbackAmount,
      scheduledFor: creditDate,
      status: 'PENDING',
    },
  });

  // Se delay = 0, creditar imediatamente
  if (config.creditDelay === 0) {
    await creditCashback(instance, context);
  }
}

export async function creditCashback(instance: any, context: HookContext) {
  // Buscar cashbacks pendentes para este pedido
  const pending = await prisma.pendingCashback.findFirst({
    where: {
      orderId: context.orderId,
      status: 'PENDING',
      scheduledFor: { lte: new Date() },
    },
  });

  if (!pending) return;

  // TODO: Transferir BZR via blockchain
  // await transferBZR(seller.wallet, user.wallet, pending.amount);

  await prisma.pendingCashback.update({
    where: { id: pending.id },
    data: { status: 'CREDITED', creditedAt: new Date() },
  });
}
```

---

## Template 3: Cupons de Desconto

### Plugin Definition

```typescript
const couponsPlugin: PluginDefinition = {
  slug: 'coupons',
  name: 'Cupons de Desconto',
  description: 'Crie e gerencie cupons promocionais para sua loja.',
  version: '1.0.0',
  category: 'MARKETING',

  pricingType: 'FREE',

  iconUrl: '/plugins/coupons/icon.svg',
  developerName: 'Bazari',
  isOfficial: true,

  configSchema: {
    type: 'object',
    properties: {
      coupons: {
        type: 'array',
        title: 'Cupons',
        items: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              title: 'Código do cupom',
              pattern: '^[A-Z0-9]{3,20}$',
            },
            discountType: {
              type: 'string',
              enum: ['percentage', 'fixed'],
              title: 'Tipo de desconto',
            },
            discountValue: {
              type: 'number',
              title: 'Valor do desconto',
            },
            minPurchase: {
              type: 'number',
              title: 'Compra mínima (BZR)',
            },
            maxUses: {
              type: 'number',
              title: 'Máximo de usos',
            },
            maxUsesPerUser: {
              type: 'number',
              title: 'Máximo por usuário',
              default: 1,
            },
            validFrom: {
              type: 'string',
              format: 'date-time',
              title: 'Válido a partir de',
            },
            validUntil: {
              type: 'string',
              format: 'date-time',
              title: 'Válido até',
            },
            isActive: {
              type: 'boolean',
              title: 'Ativo',
              default: true,
            },
          },
          required: ['code', 'discountType', 'discountValue'],
        },
      },
      showBanner: {
        type: 'boolean',
        title: 'Mostrar banner de cupom na loja',
        default: false,
      },
      bannerCouponCode: {
        type: 'string',
        title: 'Código do cupom a exibir no banner',
      },
      bannerText: {
        type: 'string',
        title: 'Texto do banner',
        default: 'Use o cupom {code} e ganhe {discount}!',
      },
    },
  },

  defaultConfig: {
    coupons: [],
    showBanner: false,
  },

  components: {
    storePage: 'CouponBanner',
    checkoutPage: 'CouponInput',
  },

  hooks: {
    onCheckout: 'validateCoupon',
    onPurchase: 'useCoupon',
  },
};
```

### Componentes

**CouponBanner:**

```tsx
// apps/web/src/components/plugins/widgets/CouponBanner.tsx

import { useState } from 'react';
import { X, Copy, Check, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CouponBannerProps {
  config: {
    showBanner: boolean;
    bannerCouponCode?: string;
    bannerText?: string;
    coupons: Array<{
      code: string;
      discountType: 'percentage' | 'fixed';
      discountValue: number;
    }>;
  };
  branding?: {
    primaryColor?: string;
  };
}

export function CouponBanner({ config, branding }: CouponBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!config.showBanner || dismissed || !config.bannerCouponCode) {
    return null;
  }

  const coupon = config.coupons.find(c => c.code === config.bannerCouponCode);
  if (!coupon) return null;

  const discountText = coupon.discountType === 'percentage'
    ? `${coupon.discountValue}%`
    : `${coupon.discountValue} BZR`;

  const bannerText = (config.bannerText || 'Use o cupom {code} e ganhe {discount}!')
    .replace('{code}', coupon.code)
    .replace('{discount}', discountText);

  const handleCopy = () => {
    navigator.clipboard.writeText(coupon.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="relative p-3 rounded-lg text-white text-center"
      style={{ backgroundColor: branding?.primaryColor || '#8B5CF6' }}
    >
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 opacity-70 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center justify-center gap-3">
        <Tag className="h-5 w-5" />
        <span>{bannerText}</span>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleCopy}
          className="gap-1"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {coupon.code}
        </Button>
      </div>
    </div>
  );
}
```

**CouponInput (Checkout):**

```tsx
// apps/web/src/components/plugins/widgets/CouponInput.tsx

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tag, Check, X, Loader2 } from 'lucide-react';

interface CouponInputProps {
  context: {
    storeId: string;
    cartTotal: number;
    onApplyCoupon: (coupon: { code: string; discount: number }) => void;
  };
}

export function CouponInput({ context }: CouponInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);

  const handleApply = async () => {
    if (!code.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/plugins/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: context.storeId,
          code: code.toUpperCase(),
          cartTotal: context.cartTotal,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Cupom inválido');
        return;
      }

      setApplied({ code: data.code, discount: data.discount });
      context.onApplyCoupon({ code: data.code, discount: data.discount });
    } catch (err) {
      setError('Erro ao validar cupom');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setApplied(null);
    setCode('');
    context.onApplyCoupon({ code: '', discount: 0 });
  };

  if (applied) {
    return (
      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
          <Check className="h-4 w-4" />
          <span>Cupom <strong>{applied.code}</strong> aplicado!</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRemove}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Código do cupom"
            className="pl-9"
          />
        </div>
        <Button onClick={handleApply} disabled={loading || !code.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
```

---

## Template 4: Delivery Tracking

### Plugin Definition

```typescript
const deliveryTrackingPlugin: PluginDefinition = {
  slug: 'delivery-tracking',
  name: 'Rastreamento de Entrega',
  description: 'Permita que clientes acompanhem suas entregas em tempo real.',
  version: '1.0.0',
  category: 'OPERATIONS',

  pricingType: 'FREEMIUM',
  pricingTiers: {
    free: { ordersPerMonth: 50, features: ['basic_tracking'] },
    pro: { price: 20, ordersPerMonth: 500, features: ['basic_tracking', 'live_map', 'notifications'] },
    enterprise: { price: 100, ordersPerMonth: -1, features: ['*'] },
  },

  iconUrl: '/plugins/delivery/icon.svg',
  developerName: 'Bazari',
  isOfficial: true,

  configSchema: {
    type: 'object',
    properties: {
      enableLiveMap: {
        type: 'boolean',
        title: 'Mapa ao vivo',
        description: 'Mostrar localização do entregador em tempo real',
        default: false,
      },
      enableNotifications: {
        type: 'boolean',
        title: 'Notificações',
        description: 'Enviar notificações de atualização de status',
        default: true,
      },
      estimatedDeliveryTime: {
        type: 'number',
        title: 'Tempo estimado padrão (minutos)',
        default: 45,
      },
      statuses: {
        type: 'array',
        title: 'Status personalizados',
        items: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            label: { type: 'string' },
            icon: { type: 'string' },
          },
        },
        default: [
          { key: 'confirmed', label: 'Pedido confirmado', icon: 'check' },
          { key: 'preparing', label: 'Preparando', icon: 'chef-hat' },
          { key: 'ready', label: 'Pronto para entrega', icon: 'package' },
          { key: 'picked_up', label: 'Saiu para entrega', icon: 'truck' },
          { key: 'nearby', label: 'Entregador próximo', icon: 'map-pin' },
          { key: 'delivered', label: 'Entregue', icon: 'home' },
        ],
      },
    },
  },

  defaultConfig: {
    enableLiveMap: false,
    enableNotifications: true,
    estimatedDeliveryTime: 45,
    statuses: [
      { key: 'confirmed', label: 'Pedido confirmado', icon: 'check' },
      { key: 'preparing', label: 'Preparando', icon: 'chef-hat' },
      { key: 'ready', label: 'Pronto', icon: 'package' },
      { key: 'picked_up', label: 'Saiu para entrega', icon: 'truck' },
      { key: 'delivered', label: 'Entregue', icon: 'home' },
    ],
  },

  components: {
    orderPage: 'DeliveryTracker',
    sellerDashboard: 'DeliveryManager',
  },

  hooks: {
    onOrderCreated: 'initializeTracking',
    onStatusUpdate: 'notifyCustomer',
  },
};
```

### Componente: DeliveryTracker

```tsx
// apps/web/src/components/plugins/widgets/DeliveryTracker.tsx

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Clock, ChefHat, Package, Truck, Home, MapPin } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<any>> = {
  'check': Check,
  'clock': Clock,
  'chef-hat': ChefHat,
  'package': Package,
  'truck': Truck,
  'home': Home,
  'map-pin': MapPin,
};

interface DeliveryTrackerProps {
  config: {
    statuses: Array<{
      key: string;
      label: string;
      icon: string;
    }>;
    enableLiveMap: boolean;
    estimatedDeliveryTime: number;
  };
  context: {
    orderId: string;
  };
}

export function DeliveryTracker({ config, context }: DeliveryTrackerProps) {
  const [tracking, setTracking] = useState<{
    currentStatus: string;
    statusHistory: Array<{ status: string; timestamp: string }>;
    estimatedArrival?: string;
    delivererLocation?: { lat: number; lng: number };
  } | null>(null);

  useEffect(() => {
    // Buscar status inicial
    fetchTracking(context.orderId).then(setTracking);

    // WebSocket para atualizações em tempo real
    const ws = new WebSocket(`wss://api.bazari.com/tracking/${context.orderId}`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setTracking(prev => ({ ...prev, ...data }));
    };

    return () => ws.close();
  }, [context.orderId]);

  if (!tracking) {
    return <div className="animate-pulse h-40 bg-muted rounded-lg" />;
  }

  const currentIndex = config.statuses.findIndex(s => s.key === tracking.currentStatus);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Acompanhe seu pedido
        </CardTitle>
        {tracking.estimatedArrival && (
          <p className="text-sm text-muted-foreground">
            Previsão de chegada: {tracking.estimatedArrival}
          </p>
        )}
      </CardHeader>

      <CardContent>
        {/* Timeline de status */}
        <div className="relative">
          {config.statuses.map((status, index) => {
            const Icon = iconMap[status.icon] || Check;
            const isCompleted = index <= currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div key={status.key} className="flex items-start gap-4 pb-6 last:pb-0">
                {/* Linha vertical */}
                {index < config.statuses.length - 1 && (
                  <div
                    className={`absolute left-4 w-0.5 h-6 -translate-x-1/2 ${
                      isCompleted ? 'bg-primary' : 'bg-border'
                    }`}
                    style={{ top: `${index * 48 + 32}px` }}
                  />
                )}

                {/* Ícone */}
                <div
                  className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${
                    isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  } ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                {/* Texto */}
                <div className="flex-1 pt-1">
                  <p className={`font-medium ${isCompleted ? '' : 'text-muted-foreground'}`}>
                    {status.label}
                  </p>
                  {tracking.statusHistory.find(h => h.status === status.key) && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(
                        tracking.statusHistory.find(h => h.status === status.key)!.timestamp
                      ).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mapa ao vivo (se habilitado) */}
        {config.enableLiveMap && tracking.delivererLocation && (
          <div className="mt-4 h-48 rounded-lg overflow-hidden">
            <LiveMap
              delivererLocation={tracking.delivererLocation}
              destinationAddress={tracking.destinationAddress}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

async function fetchTracking(orderId: string) {
  const response = await fetch(`/api/plugins/delivery/tracking/${orderId}`);
  return response.json();
}
```

---

## Template 5: Avaliações

### Plugin Definition

```typescript
const reviewsPlugin: PluginDefinition = {
  slug: 'reviews',
  name: 'Avaliações e Reviews',
  description: 'Permita que clientes avaliem produtos e sua loja.',
  version: '1.0.0',
  category: 'ENGAGEMENT',

  pricingType: 'FREE',

  iconUrl: '/plugins/reviews/icon.svg',
  developerName: 'Bazari',
  isOfficial: true,

  configSchema: {
    type: 'object',
    properties: {
      requirePurchase: {
        type: 'boolean',
        title: 'Exigir compra para avaliar',
        default: true,
      },
      allowPhotos: {
        type: 'boolean',
        title: 'Permitir fotos nas avaliações',
        default: true,
      },
      moderateReviews: {
        type: 'boolean',
        title: 'Moderar avaliações antes de publicar',
        default: false,
      },
      rewardPoints: {
        type: 'number',
        title: 'Pontos de fidelidade por avaliação',
        default: 0,
        description: 'Requer plugin de fidelidade ativo',
      },
      autoRequestAfterDays: {
        type: 'number',
        title: 'Pedir avaliação X dias após entrega',
        default: 3,
      },
    },
  },

  defaultConfig: {
    requirePurchase: true,
    allowPhotos: true,
    moderateReviews: false,
    rewardPoints: 10,
    autoRequestAfterDays: 3,
  },

  components: {
    productPage: 'ReviewsSection',
    storePage: 'StoreRating',
    orderPage: 'ReviewPrompt',
  },

  hooks: {
    onOrderDelivered: 'scheduleReviewRequest',
    onReview: 'addRewardPoints',
  },
};
```

---

## Seed de Plugins

Script para popular o banco com os plugins oficiais:

**Arquivo:** `apps/api/prisma/seeds/plugins.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const officialPlugins = [
  {
    slug: 'loyalty-program',
    name: 'Programa de Fidelidade',
    description: 'Recompense seus clientes com pontos a cada compra.',
    category: 'ENGAGEMENT',
    pricingType: 'FREE',
    iconUrl: '/plugins/loyalty/icon.svg',
    configSchema: { /* ... */ },
    defaultConfig: { /* ... */ },
    components: { storePage: 'LoyaltyWidget', checkoutPage: 'LoyaltyRedeemBox' },
    hooks: { onPurchase: 'addPoints' },
  },
  {
    slug: 'cashback',
    name: 'Cashback',
    description: 'Devolva uma porcentagem do valor em BZR.',
    category: 'PAYMENTS',
    pricingType: 'FREE',
    iconUrl: '/plugins/cashback/icon.svg',
    configSchema: { /* ... */ },
    defaultConfig: { /* ... */ },
    components: { storePage: 'CashbackBadge', checkoutPage: 'CashbackPreview' },
    hooks: { onPurchase: 'scheduleCashback' },
  },
  {
    slug: 'coupons',
    name: 'Cupons de Desconto',
    description: 'Crie cupons promocionais para sua loja.',
    category: 'MARKETING',
    pricingType: 'FREE',
    iconUrl: '/plugins/coupons/icon.svg',
    configSchema: { /* ... */ },
    defaultConfig: { /* ... */ },
    components: { storePage: 'CouponBanner', checkoutPage: 'CouponInput' },
    hooks: {},
  },
  {
    slug: 'delivery-tracking',
    name: 'Rastreamento de Entrega',
    description: 'Clientes acompanham entregas em tempo real.',
    category: 'OPERATIONS',
    pricingType: 'FREEMIUM',
    iconUrl: '/plugins/delivery/icon.svg',
    configSchema: { /* ... */ },
    defaultConfig: { /* ... */ },
    components: { orderPage: 'DeliveryTracker' },
    hooks: { onOrderCreated: 'initializeTracking' },
  },
  {
    slug: 'reviews',
    name: 'Avaliações',
    description: 'Clientes avaliam produtos e sua loja.',
    category: 'ENGAGEMENT',
    pricingType: 'FREE',
    iconUrl: '/plugins/reviews/icon.svg',
    configSchema: { /* ... */ },
    defaultConfig: { /* ... */ },
    components: { productPage: 'ReviewsSection', storePage: 'StoreRating' },
    hooks: { onOrderDelivered: 'scheduleReviewRequest' },
  },
];

async function seedPlugins() {
  for (const plugin of officialPlugins) {
    await prisma.pluginDefinition.upsert({
      where: { slug: plugin.slug },
      update: plugin,
      create: {
        ...plugin,
        isOfficial: true,
        isActive: true,
      },
    });
  }

  console.log(`Seeded ${officialPlugins.length} plugins`);
}

seedPlugins()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## Critérios de Aceite

- [ ] 5 plugins oficiais criados no banco
- [ ] Componentes React para cada plugin
- [ ] Hooks funcionando (onPurchase, etc)
- [ ] Configuração via JSON Schema
- [ ] Testes de integração

---

**Versão:** 1.0.0
**Data:** 2024-12-07
