import type { PrismaClient } from '@prisma/client';

export interface CatalogItem {
  id: string;
  kind: 'product' | 'service';
  title: string;
  description?: string | null;
  priceBzr?: string | null;
  coverUrl?: string | null;
  media?: Array<{ url?: string | null }>;
  categoryPath?: string[];
}

export interface CatalogMetadata {
  version: string;
  storeId: string;
  itemCount: number;
  items: CatalogItem[];
}

export async function buildCatalogForStore(
  prisma: PrismaClient,
  onChainStoreId: bigint,
): Promise<CatalogMetadata> {
  const [products, services] = await Promise.all([
    prisma.product.findMany({
      where: { onChainStoreId, status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        priceBzr: true,
        categoryPath: true,
      },
    }),
    prisma.serviceOffering.findMany({
      where: { onChainStoreId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        basePriceBzr: true,
        categoryPath: true,
      },
    }),
  ]);

  // Buscar mídia para produtos
  const productIds = products.map((p) => p.id);
  const productMedia = productIds.length > 0
    ? await prisma.mediaAsset.findMany({
        where: { ownerType: 'Product', ownerId: { in: productIds } },
        orderBy: { createdAt: 'asc' },
        select: { ownerId: true, url: true },
      })
    : [];

  // Buscar mídia para serviços
  const serviceIds = services.map((s) => s.id);
  const serviceMedia = serviceIds.length > 0
    ? await prisma.mediaAsset.findMany({
        where: { ownerType: 'ServiceOffering', ownerId: { in: serviceIds } },
        orderBy: { createdAt: 'asc' },
        select: { ownerId: true, url: true },
      })
    : [];

  // Mapear mídia por ID
  const productMediaMap = new Map<string, string[]>();
  for (const media of productMedia) {
    if (!productMediaMap.has(media.ownerId!)) {
      productMediaMap.set(media.ownerId!, []);
    }
    productMediaMap.get(media.ownerId!)!.push(media.url);
  }

  const serviceMediaMap = new Map<string, string[]>();
  for (const media of serviceMedia) {
    if (!serviceMediaMap.has(media.ownerId!)) {
      serviceMediaMap.set(media.ownerId!, []);
    }
    serviceMediaMap.get(media.ownerId!)!.push(media.url);
  }

  // Construir itens do catálogo
  const items: CatalogItem[] = [
    ...products.map((p) => {
      const mediaUrls = productMediaMap.get(p.id) || [];
      return {
        id: p.id,
        kind: 'product' as const,
        title: p.title,
        description: p.description,
        priceBzr: p.priceBzr?.toString() ?? null,
        coverUrl: mediaUrls[0] || null,
        media: mediaUrls.map((url) => ({ url })),
        categoryPath: Array.isArray(p.categoryPath) ? p.categoryPath : [],
      };
    }),
    ...services.map((s) => {
      const mediaUrls = serviceMediaMap.get(s.id) || [];
      return {
        id: s.id,
        kind: 'service' as const,
        title: s.title,
        description: s.description,
        priceBzr: s.basePriceBzr?.toString() ?? null,
        coverUrl: mediaUrls[0] || null,
        media: mediaUrls.map((url) => ({ url })),
        categoryPath: Array.isArray(s.categoryPath) ? s.categoryPath : [],
      };
    }),
  ];

  return {
    version: '1.0.0',
    storeId: onChainStoreId.toString(),
    itemCount: items.length,
    items,
  };
}
