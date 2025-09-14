// V-2 (2025-09-14): Builder do documento OS com media
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export type OsDoc = {
  id: string;
  kind: 'product'|'service';
  title: string;
  description?: string | null;
  category_path: string;        // 'home/furniture/bedroom'
  category_slugs: string[];     // ['home','furniture','bedroom']
  attrs: Record<string, string | string[]>;
  indexHints: Record<string, boolean>;
  price?: number | null;
  media: Array<{ id: string; url: string }>; // NOVO: array de mídia
  createdAt: string;
};

export async function buildOsDoc(kind: 'product'|'service', id: string): Promise<OsDoc | null> {
  if (kind === 'product') {
    const p = await prisma.product.findUnique({
      where: { id },
      include: { category: { select: { pathSlugs: true } } }
    });
    if (!p) return null;
    
    // Buscar primeira mídia associada
    const firstMedia = await prisma.mediaAsset.findFirst({
      where: {
        ownerType: 'Product',
        ownerId: id
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, url: true }
    });
    
    const slugs = p.category?.pathSlugs ?? [];
    const category_path = slugs.join('/');
    const attrs = (p as any).attributes || {}
    const indexHints = (p as any).indexHints || {}
    
    return {
      id: p.id,
      kind: 'product',
      title: p.title,
      description: p.description,
      category_path,
      category_slugs: slugs,
      attrs,
      indexHints,
      price: p.price as any,
      media: firstMedia ? [{ id: firstMedia.id, url: firstMedia.url }] : [],
      createdAt: (p.createdAt as Date).toISOString()
    };
  } else {
    const s = await prisma.serviceOffering.findUnique({
      where: { id },
      include: { category: { select: { pathSlugs: true } } }
    });
    if (!s) return null;
    
    // Buscar primeira mídia associada
    const firstMedia = await prisma.mediaAsset.findFirst({
      where: {
        ownerType: 'ServiceOffering',
        ownerId: id
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, url: true }
    });
    
    const slugs = s.category?.pathSlugs ?? [];
    const category_path = slugs.join('/');
    const attrs = (s as any).attributes || {}
    const indexHints = (s as any).indexHints || {}
    
    return {
      id: s.id,
      kind: 'service',
      title: s.title,
      description: s.description,
      category_path,
      category_slugs: slugs,
      attrs,
      indexHints,
      price: s.price as any,
      media: firstMedia ? [{ id: firstMedia.id, url: firstMedia.url }] : [],
      createdAt: (s.createdAt as Date).toISOString()
    };
  }
}