/**
 * Seed de Plugins Oficiais
 *
 * Popula o banco com os templates de plugins do Bazari
 */

import { PrismaClient, PluginCategory, PluginPricing } from '@prisma/client';

const prisma = new PrismaClient();

const officialPlugins = [
  // ============================================
  // 1. Programa de Fidelidade
  // ============================================
  {
    slug: 'loyalty-program',
    name: 'Programa de Fidelidade',
    description:
      'Recompense seus clientes com pontos a cada compra. Configure recompensas, tiers e aumente a retenção de clientes.',
    version: '1.0.0',
    category: PluginCategory.ENGAGEMENT,
    pricingType: PluginPricing.FREE,
    iconUrl: '/plugins/loyalty/icon.svg',
    bannerUrl: '/plugins/loyalty/banner.png',
    developerName: 'Bazari',
    isOfficial: true,
    isActive: true,

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
              points: { type: 'number', title: 'Pontos necessários' },
              discountType: {
                type: 'string',
                enum: ['percentage', 'fixed'],
                title: 'Tipo de desconto',
              },
              discountValue: { type: 'number', title: 'Valor do desconto' },
              description: { type: 'string', title: 'Descrição' },
            },
          },
        },
        tiers: {
          type: 'object',
          title: 'Níveis de fidelidade',
          properties: {
            bronze: { type: 'number', default: 0 },
            silver: { type: 'number', default: 1000 },
            gold: { type: 'number', default: 5000 },
            platinum: { type: 'number', default: 20000 },
          },
        },
        welcomeBonus: {
          type: 'number',
          title: 'Bônus de boas-vindas (pontos)',
          default: 0,
        },
      },
    },

    defaultConfig: {
      pointsPerBZR: 100,
      minRedeem: 50,
      rewards: [
        {
          points: 100,
          discountType: 'percentage',
          discountValue: 5,
          description: '5% de desconto',
        },
        {
          points: 500,
          discountType: 'percentage',
          discountValue: 15,
          description: '15% de desconto',
        },
        {
          points: 1000,
          discountType: 'percentage',
          discountValue: 25,
          description: '25% de desconto',
        },
      ],
      tiers: {
        bronze: 0,
        silver: 1000,
        gold: 5000,
        platinum: 20000,
      },
      welcomeBonus: 50,
    },

    components: {
      storePage: 'LoyaltyWidget',
      checkoutPage: 'LoyaltyRedeemBox',
      profilePage: 'LoyaltyHistory',
    },

    hooks: {
      onPurchase: 'addPoints',
      onFirstPurchase: 'addWelcomeBonus',
    },
  },

  // ============================================
  // 2. Cashback
  // ============================================
  {
    slug: 'cashback',
    name: 'Cashback',
    description:
      'Devolva uma porcentagem do valor da compra em BZR para seus clientes. Aumente vendas com recompensas automáticas.',
    version: '1.0.0',
    category: PluginCategory.PAYMENTS,
    pricingType: PluginPricing.FREE,
    iconUrl: '/plugins/cashback/icon.svg',
    bannerUrl: '/plugins/cashback/banner.png',
    developerName: 'Bazari',
    isOfficial: true,
    isActive: true,

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
      },
    },

    defaultConfig: {
      cashbackPercent: 5,
      minPurchase: 10,
      creditDelay: 7,
    },

    components: {
      storePage: 'CashbackBadge',
      productCard: 'CashbackBadge',
      checkoutPage: 'CashbackPreview',
    },

    hooks: {
      onPurchase: 'scheduleCashback',
    },
  },

  // ============================================
  // 3. Cupons de Desconto
  // ============================================
  {
    slug: 'coupons',
    name: 'Cupons de Desconto',
    description:
      'Crie e gerencie cupons promocionais para sua loja. Configure descontos por porcentagem ou valor fixo.',
    version: '1.0.0',
    category: PluginCategory.MARKETING,
    pricingType: PluginPricing.FREE,
    iconUrl: '/plugins/coupons/icon.svg',
    bannerUrl: '/plugins/coupons/banner.png',
    developerName: 'Bazari',
    isOfficial: true,
    isActive: true,

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
              discountValue: { type: 'number', title: 'Valor do desconto' },
              minPurchase: { type: 'number', title: 'Compra mínima (BZR)' },
              maxUses: { type: 'number', title: 'Máximo de usos' },
              maxUsesPerUser: {
                type: 'number',
                title: 'Máximo por usuário',
                default: 1,
              },
              validUntil: {
                type: 'string',
                format: 'date-time',
                title: 'Válido até',
              },
              isActive: { type: 'boolean', title: 'Ativo', default: true },
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
      bannerText: 'Use o cupom {code} e ganhe {discount}!',
    },

    components: {
      storePage: 'CouponBanner',
      checkoutPage: 'CouponInput',
    },

    hooks: {
      onCheckout: 'validateCoupon',
      onPurchase: 'useCoupon',
    },
  },

  // ============================================
  // 4. Rastreamento de Entrega
  // ============================================
  {
    slug: 'delivery-tracking',
    name: 'Rastreamento de Entrega',
    description:
      'Permita que clientes acompanhem suas entregas em tempo real. Configure status personalizados e notificações.',
    version: '1.0.0',
    category: PluginCategory.OPERATIONS,
    pricingType: PluginPricing.FREEMIUM,
    priceMonthly: 20,
    pricingTiers: {
      free: { ordersPerMonth: 50, features: ['basic_tracking'] },
      pro: {
        price: 20,
        ordersPerMonth: 500,
        features: ['basic_tracking', 'live_map', 'notifications'],
      },
      enterprise: { price: 100, ordersPerMonth: -1, features: ['*'] },
    },
    iconUrl: '/plugins/delivery/icon.svg',
    bannerUrl: '/plugins/delivery/banner.png',
    developerName: 'Bazari',
    isOfficial: true,
    isActive: true,

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
        { key: 'ready', label: 'Pronto para entrega', icon: 'package' },
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
  },

  // ============================================
  // 5. Avaliações e Reviews
  // ============================================
  {
    slug: 'reviews',
    name: 'Avaliações e Reviews',
    description:
      'Permita que clientes avaliem produtos e sua loja. Colete feedback e aumente a confiança.',
    version: '1.0.0',
    category: PluginCategory.ENGAGEMENT,
    pricingType: PluginPricing.FREE,
    iconUrl: '/plugins/reviews/icon.svg',
    bannerUrl: '/plugins/reviews/banner.png',
    developerName: 'Bazari',
    isOfficial: true,
    isActive: true,

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
  },
];

async function seedPlugins() {
  console.log('🔌 Seeding official plugins...');

  for (const plugin of officialPlugins) {
    await prisma.pluginDefinition.upsert({
      where: { slug: plugin.slug },
      update: {
        name: plugin.name,
        description: plugin.description,
        version: plugin.version,
        category: plugin.category,
        pricingType: plugin.pricingType,
        priceMonthly: plugin.priceMonthly,
        pricingTiers: plugin.pricingTiers,
        iconUrl: plugin.iconUrl,
        bannerUrl: plugin.bannerUrl,
        configSchema: plugin.configSchema,
        defaultConfig: plugin.defaultConfig,
        components: plugin.components,
        hooks: plugin.hooks,
        isActive: plugin.isActive,
      },
      create: {
        slug: plugin.slug,
        name: plugin.name,
        description: plugin.description,
        version: plugin.version,
        category: plugin.category,
        pricingType: plugin.pricingType,
        priceMonthly: plugin.priceMonthly,
        pricingTiers: plugin.pricingTiers,
        iconUrl: plugin.iconUrl,
        bannerUrl: plugin.bannerUrl,
        developerName: plugin.developerName,
        isOfficial: plugin.isOfficial,
        isActive: plugin.isActive,
        configSchema: plugin.configSchema,
        defaultConfig: plugin.defaultConfig,
        components: plugin.components,
        hooks: plugin.hooks,
      },
    });

    console.log(`  ✅ ${plugin.name}`);
  }

  console.log(`\n🎉 Seeded ${officialPlugins.length} plugins successfully!`);
}

// Executar se chamado diretamente
seedPlugins()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

export { seedPlugins, officialPlugins };
