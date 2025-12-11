/**
 * Plugin System Routes
 *
 * Endpoints para o sistema de plugins low-code do BazariOS
 */

import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authOnRequest } from '../lib/auth/middleware.js';
import { PluginCategory, Prisma } from '@prisma/client';

// Types para os endpoints
interface PluginParams {
  id?: string;
  slug?: string;
}

interface InstallPluginBody {
  pluginId: string;
  storeId?: string;
  config?: Record<string, unknown>;
}

interface UpdatePluginInstanceBody {
  enabled?: boolean;
  config?: Record<string, unknown>;
  branding?: Record<string, unknown>;
}

interface StorePluginsParams {
  storeId: string;
}

export default async function pluginsRoutes(app: FastifyInstance) {
  // ============================================
  // PUBLIC ROUTES - Catálogo de Plugins
  // ============================================

  // GET /plugins - Lista todos os plugins disponíveis
  app.get('/plugins', async (request, reply) => {
    const { category, search, official } = request.query as {
      category?: PluginCategory;
      search?: string;
      official?: string;
    };

    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (category) {
      where.category = category;
    }

    if (official !== undefined) {
      where.isOfficial = official === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const plugins = await prisma.pluginDefinition.findMany({
      where,
      orderBy: [{ isOfficial: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        version: true,
        category: true,
        pricingType: true,
        priceMonthly: true,
        iconUrl: true,
        bannerUrl: true,
        developerName: true,
        isOfficial: true,
        _count: {
          select: { instances: true },
        },
      },
    });

    return plugins.map((p: typeof plugins[0]) => ({
      ...p,
      priceMonthly: p.priceMonthly?.toString() ?? null,
      installCount: p._count.instances,
    }));
  });

  // GET /plugins/:slug - Detalhes de um plugin
  app.get<{ Params: PluginParams }>('/plugins/:slug', async (request, reply) => {
    const { slug } = request.params;

    const plugin = await prisma.pluginDefinition.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { instances: true },
        },
      },
    });

    if (!plugin || !plugin.isActive) {
      return reply.status(404).send({ error: 'Plugin not found' });
    }

    return {
      ...plugin,
      priceMonthly: plugin.priceMonthly?.toString() ?? null,
      installCount: plugin._count.instances,
    };
  });

  // GET /plugins/categories - Lista categorias disponíveis
  app.get('/plugins/categories', async () => {
    const categories = Object.values(PluginCategory).map((cat) => ({
      id: cat,
      name: getCategoryName(cat),
      description: getCategoryDescription(cat),
    }));

    return categories;
  });

  // ============================================
  // STORE PUBLIC ROUTES - Plugins de uma loja
  // ============================================

  // GET /stores/:storeId/plugins - Lista plugins ativos de uma loja (público)
  app.get<{ Params: StorePluginsParams }>(
    '/stores/:storeId/plugins',
    async (request, reply) => {
      const { storeId } = request.params;

      // Buscar loja pelo ID ou slug
      const store = await prisma.sellerProfile.findFirst({
        where: {
          OR: [{ id: storeId }, { shopSlug: storeId }],
        },
      });

      if (!store) {
        return reply.status(404).send({ error: 'Store not found' });
      }

      const instances = await prisma.pluginInstance.findMany({
        where: {
          sellerId: store.id,
          enabled: true,
        },
        include: {
          plugin: {
            select: {
              slug: true,
              name: true,
              category: true,
              components: true,
            },
          },
        },
      });

      // Retorna apenas dados necessários para renderização
      return instances.map((inst: typeof instances[0]) => ({
        id: inst.id,
        pluginSlug: inst.plugin.slug,
        pluginName: inst.plugin.name,
        category: inst.plugin.category,
        components: inst.plugin.components,
        config: inst.config,
        branding: inst.branding,
      }));
    }
  );

  // ============================================
  // SELLER ROUTES - Gerenciamento de Plugins
  // ============================================

  // GET /seller/plugins - Lista plugins instalados do vendedor
  app.get(
    '/seller/plugins',
    { onRequest: authOnRequest },
    async (request, reply) => {
      const userId = (request as any).authUser?.sub;

      // Buscar seller profile do usuário
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
              id: true,
              slug: true,
              name: true,
              description: true,
              category: true,
              pricingType: true,
              priceMonthly: true,
              iconUrl: true,
              configSchema: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return instances.map((inst: typeof instances[0]) => ({
        id: inst.id,
        enabled: inst.enabled,
        config: inst.config,
        branding: inst.branding,
        stats: inst.stats,
        createdAt: inst.createdAt,
        plugin: {
          ...inst.plugin,
          priceMonthly: inst.plugin.priceMonthly?.toString() ?? null,
        },
      }));
    }
  );

  // POST /seller/plugins - Instalar um plugin
  app.post<{ Body: InstallPluginBody }>(
    '/seller/plugins',
    { onRequest: authOnRequest },
    async (request, reply) => {
      const userId = (request as any).authUser?.sub;
      const { pluginId, storeId, config } = request.body;

      // Buscar seller profile
      const seller = await prisma.sellerProfile.findFirst({
        where: { userId },
      });

      if (!seller) {
        return reply.status(404).send({ error: 'Seller profile not found' });
      }

      // Buscar plugin
      const plugin = await prisma.pluginDefinition.findUnique({
        where: { id: pluginId },
      });

      if (!plugin || !plugin.isActive) {
        return reply.status(404).send({ error: 'Plugin not found' });
      }

      // Verificar se já está instalado
      const existing = await prisma.pluginInstance.findFirst({
        where: {
          pluginId,
          sellerId: seller.id,
          storeId: storeId || null,
        },
      });

      if (existing) {
        return reply.status(400).send({ error: 'Plugin already installed' });
      }

      // Criar instância com config padrão + customização
      const defaultConfig = plugin.defaultConfig as Prisma.InputJsonValue;
      const finalConfig = (config ?? defaultConfig) as Prisma.InputJsonValue;

      const instance = await prisma.pluginInstance.create({
        data: {
          pluginId,
          sellerId: seller.id,
          storeId: storeId || undefined,
          config: finalConfig,
          enabled: true,
        },
        include: {
          plugin: {
            select: {
              slug: true,
              name: true,
              category: true,
            },
          },
        },
      });

      app.log.info(
        { userId, pluginId, sellerId: seller.id },
        'Plugin installed'
      );

      const instanceWithPlugin = instance as typeof instance & {
        plugin: { slug: string; name: string; category: string };
      };

      return {
        success: true,
        instance: {
          id: instanceWithPlugin.id,
          pluginSlug: instanceWithPlugin.plugin.slug,
          pluginName: instanceWithPlugin.plugin.name,
          enabled: instanceWithPlugin.enabled,
        },
      };
    }
  );

  // PATCH /seller/plugins/:id - Atualizar configuração
  app.patch<{ Params: PluginParams; Body: UpdatePluginInstanceBody }>(
    '/seller/plugins/:id',
    { onRequest: authOnRequest },
    async (request, reply) => {
      const userId = (request as any).authUser?.sub;
      const { id } = request.params;
      const { enabled, config, branding } = request.body;

      // Verificar ownership
      const seller = await prisma.sellerProfile.findFirst({
        where: { userId },
      });

      if (!seller) {
        return reply.status(404).send({ error: 'Seller profile not found' });
      }

      const instance = await prisma.pluginInstance.findFirst({
        where: { id, sellerId: seller.id },
      });

      if (!instance) {
        return reply.status(404).send({ error: 'Plugin instance not found' });
      }

      // Atualizar
      const updateData: { enabled?: boolean; config?: object; branding?: object } = {};
      if (enabled !== undefined) updateData.enabled = enabled;
      if (config) updateData.config = config;
      if (branding) updateData.branding = branding;

      const updated = await prisma.pluginInstance.update({
        where: { id },
        data: updateData,
      });

      return {
        success: true,
        instance: {
          id: updated.id,
          enabled: updated.enabled,
          config: updated.config,
          branding: updated.branding,
        },
      };
    }
  );

  // DELETE /seller/plugins/:id - Desinstalar plugin
  app.delete<{ Params: PluginParams }>(
    '/seller/plugins/:id',
    { onRequest: authOnRequest },
    async (request, reply) => {
      const userId = (request as any).authUser?.sub;
      const { id } = request.params;

      // Verificar ownership
      const seller = await prisma.sellerProfile.findFirst({
        where: { userId },
      });

      if (!seller) {
        return reply.status(404).send({ error: 'Seller profile not found' });
      }

      const instance = await prisma.pluginInstance.findFirst({
        where: { id, sellerId: seller.id },
        include: { plugin: { select: { slug: true } } },
      });

      if (!instance) {
        return reply.status(404).send({ error: 'Plugin instance not found' });
      }

      // Deletar (cascade vai limpar LoyaltyPoints, PendingCashback)
      await prisma.pluginInstance.delete({
        where: { id },
      });

      app.log.info(
        { userId, instanceId: id, pluginSlug: instance.plugin.slug },
        'Plugin uninstalled'
      );

      return { success: true };
    }
  );

  // ============================================
  // LOYALTY POINTS ROUTES
  // ============================================

  // GET /seller/plugins/:id/loyalty - Listar pontos dos clientes
  app.get<{ Params: PluginParams }>(
    '/seller/plugins/:id/loyalty',
    { onRequest: authOnRequest },
    async (request, reply) => {
      const userId = (request as any).authUser?.sub;
      const { id } = request.params;

      // Verificar ownership
      const seller = await prisma.sellerProfile.findFirst({
        where: { userId },
      });

      if (!seller) {
        return reply.status(404).send({ error: 'Seller profile not found' });
      }

      const instance = await prisma.pluginInstance.findFirst({
        where: { id, sellerId: seller.id },
        include: { plugin: { select: { slug: true } } },
      });

      if (!instance) {
        return reply.status(404).send({ error: 'Plugin instance not found' });
      }

      if (instance.plugin.slug !== 'loyalty-program') {
        return reply.status(400).send({ error: 'Not a loyalty plugin' });
      }

      const loyaltyPoints = await prisma.loyaltyPoints.findMany({
        where: { instanceId: id },
        orderBy: { points: 'desc' },
        take: 100,
      });

      return loyaltyPoints;
    }
  );

  // GET /me/loyalty/:storeId - Meus pontos em uma loja
  app.get<{ Params: StorePluginsParams }>(
    '/me/loyalty/:storeId',
    { onRequest: authOnRequest },
    async (request, reply) => {
      const userId = (request as any).authUser?.sub;
      const { storeId } = request.params;

      // Buscar loja
      const store = await prisma.sellerProfile.findFirst({
        where: {
          OR: [{ id: storeId }, { shopSlug: storeId }],
        },
      });

      if (!store) {
        return reply.status(404).send({ error: 'Store not found' });
      }

      // Buscar instância de loyalty da loja
      const instance = await prisma.pluginInstance.findFirst({
        where: {
          sellerId: store.id,
          enabled: true,
          plugin: { slug: 'loyalty-program' },
        },
        include: {
          plugin: { select: { slug: true, name: true } },
        },
      });

      if (!instance) {
        return { enabled: false, points: null };
      }

      // Buscar pontos do usuário
      const loyalty = await prisma.loyaltyPoints.findUnique({
        where: {
          instanceId_userId: {
            instanceId: instance.id,
            userId,
          },
        },
      });

      const config = instance.config as Record<string, unknown>;

      return {
        enabled: true,
        pluginName: instance.plugin.name,
        points: loyalty?.points ?? 0,
        totalEarned: loyalty?.totalEarned ?? 0,
        tier: loyalty?.tier ?? 'bronze',
        config: {
          pointsPerBzr: config.pointsPerBzr ?? 1,
          redemptionRules: config.redemptionRules ?? [],
        },
      };
    }
  );
}

// Helper functions
function getCategoryName(category: PluginCategory): string {
  const names: Record<PluginCategory, string> = {
    ENGAGEMENT: 'Engajamento',
    MARKETING: 'Marketing',
    OPERATIONS: 'Operações',
    PAYMENTS: 'Pagamentos',
    ANALYTICS: 'Analytics',
    COMMUNICATION: 'Comunicação',
  };
  return names[category];
}

function getCategoryDescription(category: PluginCategory): string {
  const descriptions: Record<PluginCategory, string> = {
    ENGAGEMENT: 'Fidelidade, gamificação e recompensas',
    MARKETING: 'Cupons, promoções e campanhas',
    OPERATIONS: 'Delivery, estoque e logística',
    PAYMENTS: 'Cashback, parcelamento e financeiro',
    ANALYTICS: 'Relatórios, insights e métricas',
    COMMUNICATION: 'Chat, notificações e suporte',
  };
  return descriptions[category];
}
