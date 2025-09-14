// V-1 (2025-09-13): Builder do documento OS a partir do Postgres (Prisma)
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
  createdAt: string;
};

export async function buildOsDoc(kind: 'product'|'service', id: string): Promise<OsDoc | null> {
  if (kind === 'product') {
    const p = await prisma.product.findUnique({
      where: { id },
      include: { category: { select: { pathSlugs: true } } }
    });
    if (!p) return null;
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
      createdAt: (p.createdAt as Date).toISOString()
    };
  } else {
    const s = await prisma.serviceOffering.findUnique({
      where: { id },
      include: { category: { select: { pathSlugs: true } } }
    });
    if (!s) return null;
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
      createdAt: (s.createdAt as Date).toISOString()
    };
  }
}
