import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';

/**
 * VR Stores Route
 * GET /api/vr/stores - Lista lojas para renderizar no mundo VR
 */
export async function vrStoresRoute(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  // GET /api/vr/stores - Listar lojas para renderização 3D
  app.get('/stores', async (request, reply) => {
    try {
      const stores = await prisma.sellerProfile.findMany({
        where: {
          // Apenas lojas com onChainStoreId (publicadas)
          onChainStoreId: { not: null },
        },
        include: {
          land: true, // Incluir informações do terreno VR
          user: {
            select: {
              address: true,
            },
          },
        },
        take: 100, // Limitar a 100 lojas por request
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Transformar dados para formato VR-friendly
      const vrStores = stores.map((store) => ({
        id: store.id,
        name: store.shopName,
        slug: store.shopSlug,
        description: store.about,
        logoUrl: store.avatarUrl,
        bannerUrl: store.bannerUrl,
        ownerAddress: store.ownerAddress,
        onChainStoreId: store.onChainStoreId?.toString(),
        rating: {
          average: store.ratingAvg,
          count: store.ratingCount,
        },
        // Informações do terreno (se construída no VR)
        land: store.land
          ? {
              address: store.land.address,
              position: {
                x: store.land.positionX,
                y: store.land.positionY,
                z: store.land.positionZ,
              },
              rotation: store.land.rotation,
              size: store.land.size,
              tier: store.land.tier,
            }
          : null,
      }));

      return reply.send({
        stores: vrStores,
        total: vrStores.length,
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: 'Failed to fetch VR stores',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
