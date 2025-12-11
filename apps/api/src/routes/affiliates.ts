/**
 * Rotas de Marketplace de Afiliados
 *
 * Permite que usuários criem marketplaces pessoais com comissões automáticas
 */

import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma';
import { authOnRequest } from '../lib/auth/middleware.js';
import { z } from 'zod';

// Schemas de validação
const createMarketplaceSchema = z.object({
  name: z.string().min(3).max(100),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  logoUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
});

const updateMarketplaceSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  logoUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
});

const addProductSchema = z.object({
  storeId: z.number().int().positive(),
  productId: z.string().min(1),
  customDescription: z.string().max(500).optional(),
  customImageUrl: z.string().url().optional(),
  featured: z.boolean().default(false),
});

const affiliatesRoutes: FastifyPluginAsync = async (server) => {
  // 1. POST /api/affiliates/marketplaces - Criar marketplace
  server.post('/marketplaces', {
    preHandler: authOnRequest,
    handler: async (request, reply) => {
      const authUser = (request as any).authUser as { sub: string } | undefined;
      if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });
      const userId = authUser.sub;

      // Buscar profile do usuário
      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!profile) {
        return reply.status(404).send({ error: 'Profile not found' });
      }

      const body = createMarketplaceSchema.parse(request.body);

      // Verificar se slug já existe
      const existing = await prisma.affiliateMarketplace.findUnique({
        where: { slug: body.slug },
      });

      if (existing) {
        return reply.status(409).send({ error: 'Slug already taken' });
      }

      // Verificar se usuário já tem marketplace
      const userMarketplace = await prisma.affiliateMarketplace.findFirst({
        where: { ownerId: profile.id },
      });

      if (userMarketplace) {
        return reply.status(409).send({
          error: 'User already has a marketplace',
          marketplace: userMarketplace,
        });
      }

      const now = Date.now();

      // Criar marketplace diretamente no PostgreSQL (sem IPFS)
      const marketplace = await prisma.affiliateMarketplace.create({
        data: {
          ownerId: profile.id,
          name: body.name,
          slug: body.slug,
          description: body.description,
          logoUrl: body.logoUrl,
          bannerUrl: body.bannerUrl,
          theme: 'bazari',
          primaryColor: body.primaryColor,
          secondaryColor: body.secondaryColor,
          createdAt: BigInt(now),
          updatedAt: BigInt(now),
        },
      });

      return {
        success: true,
        marketplace: {
          id: marketplace.id,
          name: marketplace.name,
          slug: marketplace.slug,
          description: marketplace.description,
          logoUrl: marketplace.logoUrl,
          bannerUrl: marketplace.bannerUrl,
          primaryColor: marketplace.primaryColor,
          secondaryColor: marketplace.secondaryColor,
          isActive: marketplace.isActive,
          isPublic: marketplace.isPublic,
          createdAt: Number(marketplace.createdAt),
        },
      };
    },
  });

  // 2. GET /api/affiliates/marketplaces/:slug - Obter marketplace público
  server.get('/marketplaces/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const marketplace = await prisma.affiliateMarketplace.findUnique({
      where: { slug },
      include: {
        owner: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        products: {
          where: {},
          orderBy: [
            { featured: 'desc' },
            { addedAt: 'desc' },
          ],
          take: 50,
        },
      },
    });

    if (!marketplace) {
      return reply.status(404).send({ error: 'Marketplace not found' });
    }

    if (!marketplace.isPublic || !marketplace.isActive) {
      return reply.status(403).send({ error: 'Marketplace is not accessible' });
    }

    return {
      marketplace: {
        id: marketplace.id,
        name: marketplace.name,
        slug: marketplace.slug,
        description: marketplace.description,
        logoUrl: marketplace.logoUrl,
        bannerUrl: marketplace.bannerUrl,
        primaryColor: marketplace.primaryColor,
        secondaryColor: marketplace.secondaryColor,
        owner: marketplace.owner,
        products: marketplace.products.map(p => ({
          id: p.id,
          storeId: Number(p.storeId),
          productId: p.productId,
          productName: p.productName,
          productImageUrl: p.customImageUrl || p.productImageUrl,
          productPrice: p.productPrice.toString(),
          commissionPercent: p.commissionPercent,
          customDescription: p.customDescription,
          featured: p.featured,
          viewCount: p.viewCount,
          clickCount: p.clickCount,
          addedAt: Number(p.addedAt),
        })),
        stats: {
          totalSales: marketplace.totalSales,
          totalRevenue: marketplace.totalRevenue.toString(),
          totalCommission: marketplace.totalCommission.toString(),
          productCount: marketplace.productCount,
        },
      },
    };
  });

  // 3. GET /api/affiliates/marketplaces/me - Obter meu marketplace
  server.get('/marketplaces/me', {
    preHandler: authOnRequest,
    handler: async (request, reply) => {
      const authUser = (request as any).authUser as { sub: string } | undefined;
      if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });
      const userId = authUser.sub;

      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!profile) {
        return reply.status(404).send({ error: 'Profile not found' });
      }

      const marketplace = await prisma.affiliateMarketplace.findFirst({
        where: { ownerId: profile.id },
        include: {
          products: {
            orderBy: [
              { featured: 'desc' },
              { addedAt: 'desc' },
            ],
          },
        },
      });

      if (!marketplace) {
        return { marketplace: null };
      }

      return {
        marketplace: {
          id: marketplace.id,
          name: marketplace.name,
          slug: marketplace.slug,
          description: marketplace.description,
          logoUrl: marketplace.logoUrl,
          bannerUrl: marketplace.bannerUrl,
          primaryColor: marketplace.primaryColor,
          secondaryColor: marketplace.secondaryColor,
          isActive: marketplace.isActive,
          isPublic: marketplace.isPublic,
          products: marketplace.products.map(p => ({
            id: p.id,
            storeId: Number(p.storeId),
            productId: p.productId,
            productName: p.productName,
            productImageUrl: p.customImageUrl || p.productImageUrl,
            productPrice: p.productPrice.toString(),
            commissionPercent: p.commissionPercent,
            customDescription: p.customDescription,
            featured: p.featured,
            viewCount: p.viewCount,
            clickCount: p.clickCount,
            addedAt: Number(p.addedAt),
          })),
          stats: {
            totalSales: marketplace.totalSales,
            totalRevenue: marketplace.totalRevenue.toString(),
            totalCommission: marketplace.totalCommission.toString(),
            productCount: marketplace.productCount,
          },
          createdAt: Number(marketplace.createdAt),
          updatedAt: Number(marketplace.updatedAt),
        },
      };
    },
  });

  // 4. PUT /api/affiliates/marketplaces/:id - Atualizar marketplace
  server.put('/marketplaces/:id', {
    preHandler: authOnRequest,
    handler: async (request, reply) => {
      const authUser = (request as any).authUser as { sub: string } | undefined;
      if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });
      const userId = authUser.sub;
      const { id } = request.params as { id: string };

      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!profile) {
        return reply.status(404).send({ error: 'Profile not found' });
      }

      // Verificar se marketplace pertence ao usuário
      const marketplace = await prisma.affiliateMarketplace.findUnique({
        where: { id },
      });

      if (!marketplace) {
        return reply.status(404).send({ error: 'Marketplace not found' });
      }

      if (marketplace.ownerId !== profile.id) {
        return reply.status(403).send({ error: 'Not authorized' });
      }

      const body = updateMarketplaceSchema.parse(request.body);

      // Atualizar marketplace
      const updated = await prisma.affiliateMarketplace.update({
        where: { id },
        data: {
          ...body,
          updatedAt: BigInt(Date.now()),
        },
      });

      return {
        success: true,
        marketplace: {
          id: updated.id,
          name: updated.name,
          slug: updated.slug,
          description: updated.description,
          logoUrl: updated.logoUrl,
          bannerUrl: updated.bannerUrl,
          primaryColor: updated.primaryColor,
          secondaryColor: updated.secondaryColor,
          isActive: updated.isActive,
          isPublic: updated.isPublic,
          updatedAt: Number(updated.updatedAt),
        },
      };
    },
  });

  // 5. POST /api/affiliates/marketplaces/:id/products - Adicionar produto
  server.post('/marketplaces/:id/products', {
    preHandler: authOnRequest,
    handler: async (request, reply) => {
      const authUser = (request as any).authUser as { sub: string } | undefined;
      if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });
      const userId = authUser.sub;
      const { id } = request.params as { id: string };

      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!profile) {
        return reply.status(404).send({ error: 'Profile not found' });
      }

      // Verificar se marketplace pertence ao usuário
      const marketplace = await prisma.affiliateMarketplace.findUnique({
        where: { id },
      });

      if (!marketplace) {
        return reply.status(404).send({ error: 'Marketplace not found' });
      }

      if (marketplace.ownerId !== profile.id) {
        return reply.status(403).send({ error: 'Not authorized' });
      }

      const body = addProductSchema.parse(request.body);

      // Verificar se produto já foi adicionado
      const existing = await prisma.affiliateProduct.findUnique({
        where: {
          marketplaceId_storeId_productId: {
            marketplaceId: id,
            storeId: BigInt(body.storeId),
            productId: body.productId,
          },
        },
      });

      if (existing) {
        return reply.status(409).send({ error: 'Product already added' });
      }

      // Buscar dados do produto na loja
      // TODO: Implementar busca real do produto
      const productName = 'Product Name'; // Placeholder
      const productPrice = '10.0'; // Placeholder
      const productImageUrl = null; // Placeholder

      // Buscar política de comissão da loja
      const policy = await prisma.storeCommissionPolicy.findUnique({
        where: { storeId: BigInt(body.storeId) },
      });

      if (!policy || policy.mode === 'followers') {
        return reply.status(403).send({
          error: 'Store does not allow affiliates'
        });
      }

      const now = Date.now();

      // Adicionar produto ao marketplace
      const product = await prisma.affiliateProduct.create({
        data: {
          marketplaceId: id,
          storeId: BigInt(body.storeId),
          productId: body.productId,
          productName,
          productImageUrl,
          productPrice: productPrice,
          commissionPercent: policy.percent,
          customDescription: body.customDescription,
          customImageUrl: body.customImageUrl,
          featured: body.featured,
          addedAt: BigInt(now),
          updatedAt: BigInt(now),
        },
      });

      return {
        success: true,
        product: {
          id: product.id,
          storeId: Number(product.storeId),
          productId: product.productId,
          productName: product.productName,
          productImageUrl: product.customImageUrl || product.productImageUrl,
          productPrice: product.productPrice.toString(),
          commissionPercent: product.commissionPercent,
          customDescription: product.customDescription,
          featured: product.featured,
          addedAt: Number(product.addedAt),
        },
      };
    },
  });

  // 6. DELETE /api/affiliates/marketplaces/:id/products/:productId - Remover produto
  server.delete('/marketplaces/:id/products/:productId', {
    preHandler: authOnRequest,
    handler: async (request, reply) => {
      const authUser = (request as any).authUser as { sub: string } | undefined;
      if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });
      const userId = authUser.sub;
      const { id, productId } = request.params as { id: string; productId: string };

      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!profile) {
        return reply.status(404).send({ error: 'Profile not found' });
      }

      // Verificar se marketplace pertence ao usuário
      const marketplace = await prisma.affiliateMarketplace.findUnique({
        where: { id },
      });

      if (!marketplace) {
        return reply.status(404).send({ error: 'Marketplace not found' });
      }

      if (marketplace.ownerId !== profile.id) {
        return reply.status(403).send({ error: 'Not authorized' });
      }

      // Remover produto
      await prisma.affiliateProduct.delete({
        where: { id: productId },
      });

      return { success: true };
    },
  });

  // 7. GET /api/affiliates/marketplaces/:id/analytics - Obter estatísticas
  server.get('/marketplaces/:id/analytics', {
    preHandler: authOnRequest,
    handler: async (request, reply) => {
      const authUser = (request as any).authUser as { sub: string } | undefined;
      if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });
      const userId = authUser.sub;
      const { id } = request.params as { id: string };

      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!profile) {
        return reply.status(404).send({ error: 'Profile not found' });
      }

      // Verificar se marketplace pertence ao usuário
      const marketplace = await prisma.affiliateMarketplace.findUnique({
        where: { id },
        include: {
          sales: {
            where: { status: 'split' },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          products: {
            orderBy: { clickCount: 'desc' },
            take: 5,
          },
        },
      });

      if (!marketplace) {
        return reply.status(404).send({ error: 'Marketplace not found' });
      }

      if (marketplace.ownerId !== profile.id) {
        return reply.status(403).send({ error: 'Not authorized' });
      }

      return {
        analytics: {
          overview: {
            totalSales: marketplace.totalSales,
            totalRevenue: marketplace.totalRevenue.toString(),
            totalCommission: marketplace.totalCommission.toString(),
            productCount: marketplace.productCount,
          },
          recentSales: marketplace.sales.map(s => ({
            id: s.id,
            storeId: Number(s.storeId),
            amount: s.amount.toString(),
            commissionAmount: s.commissionAmount.toString(),
            status: s.status,
            txHash: s.txHash,
            createdAt: Number(s.createdAt),
          })),
          topProducts: marketplace.products.map(p => ({
            id: p.id,
            productName: p.productName,
            viewCount: p.viewCount,
            clickCount: p.clickCount,
            conversionRate: p.viewCount > 0
              ? ((p.clickCount / p.viewCount) * 100).toFixed(2)
              : '0.00',
          })),
        },
      };
    },
  });

  // 8. GET /api/affiliates/available-products - Listar produtos afiliáveis
  server.get('/available-products', {
    preHandler: authOnRequest,
    handler: async (request, reply) => {
      const authUser = (request as any).authUser as { sub: string } | undefined;
      if (!authUser) return reply.status(401).send({ error: 'Token inválido.' });
      const userId = authUser.sub;

      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!profile) {
        return reply.status(404).send({ error: 'Profile not found' });
      }

      // Buscar lojas que aceitam afiliados
      const policies = await prisma.storeCommissionPolicy.findMany({
        where: {
          mode: { in: ['open', 'affiliates'] },
        },
        select: {
          storeId: true,
          percent: true,
        },
      });

      const storeIds = policies.map(p => p.storeId);

      // Buscar produtos dessas lojas
      // TODO: Implementar busca real de produtos
      // Por enquanto, retornar array vazio
      return {
        products: [],
        stores: policies.map(p => ({
          storeId: Number(p.storeId),
          commissionPercent: p.percent,
        })),
      };
    },
  });
};

export default affiliatesRoutes;
