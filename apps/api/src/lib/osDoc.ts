// V-3 (2025-09-14): Builder do documento OS com media + priceBzr NUMÉRICO
// path: apps/api/src/lib/osDoc.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export type OsDoc = {
  id: string;
  kind: 'product'|'service';
  title: string;
  description?: string | null;
  category_path: string;
  category_slugs: string[];
  attrs: Record<string, any>;
  indexHints: Record<string, any>;
  price?: number | null;
  priceBzr?: number | null; // CONFIRMADO: preço em BZR numérico
  media: Array<{ id: string; url: string }>;
  createdAt: string;
  sellerStoreId?: string | null;
  onChainStoreId?: string | null; // ID da store on-chain (blockchain)
  storeSlug?: string | null;
  daoId?: string | null;
};

export async function buildOsDoc(kind: 'product'|'service', id: string): Promise<OsDoc | null> {
  if (kind === 'product') {
    const p = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { pathSlugs: true } },
        sellerStore: { select: { id: true, shopSlug: true } }
      }
    });
    if (!p) return null;

    const slugs = p.category?.pathSlugs ?? [];
    const category_path = slugs.join('/');

    const attrs: Record<string, any> = (p as any).attributes ?? {};
    const indexHints: Record<string, any> = (p as any).indexHints ?? {};

    const firstMedia = await prisma.mediaAsset.findFirst({
      where: { ownerType: 'Product', ownerId: id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, url: true }
    });

    // GARANTIR: priceBzr como número (usando campo priceBzr ou price como fallback)
    const priceBzr = (p as any).priceBzr ?? (p as any).price ?? null;
    const priceBzrNum = priceBzr != null ? Number(priceBzr) : null;
    
    // price também como número para retrocompatibilidade
    const price = (p as any).price ?? null;
    const priceNum = price != null ? Number(price) : null;

    const sellerStoreId = (p as any).sellerStoreId ?? (p.sellerStore?.id ?? null);
    const storeSlug = p.sellerStore?.shopSlug ?? ((p as any).daoId ?? null);

    // Usar onChainStoreId direto do Product (otimização: evita query extra)
    const onChainStoreId = (p as any).onChainStoreId
      ? String((p as any).onChainStoreId)
      : null;

    return {
      id: p.id,
      kind: 'product',
      title: p.title,
      description: p.description,
      category_path,
      category_slugs: slugs,
      attrs, // MANTIDO: todos os atributos
      indexHints, // MANTIDO: todas as hints
      price: priceNum,
      priceBzr: priceBzrNum, // ADICIONADO: preço BZR numérico
      media: firstMedia ? [{ id: firstMedia.id, url: firstMedia.url }] : [],
      createdAt: (p.createdAt as Date).toISOString(),
      sellerStoreId,
      onChainStoreId, // NOVO: ID da store on-chain
      storeSlug,
      daoId: (p as any).daoId ?? null
    };
  } else {
    const s = await prisma.serviceOffering.findUnique({
      where: { id },
      include: {
        category: { select: { pathSlugs: true } },
        sellerStore: { select: { id: true, shopSlug: true } }
      }
    });
    if (!s) return null;

    const slugs = s.category?.pathSlugs ?? [];
    const category_path = slugs.join('/');

    const attrs: Record<string, any> = (s as any).attributes ?? {};
    const indexHints: Record<string, any> = (s as any).indexHints ?? {};

    const firstMedia = await prisma.mediaAsset.findFirst({
      where: { ownerType: 'ServiceOffering', ownerId: id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, url: true }
    });

    // GARANTIR: usar basePriceBzr para serviços, price como fallback
    const priceBzr = (s as any).basePriceBzr ?? (s as any).price ?? null;
    const priceBzrNum = priceBzr != null ? Number(priceBzr) : null;
    
    const price = (s as any).price ?? (s as any).basePriceBzr ?? null;
    const priceNum = price != null ? Number(price) : null;

    const sellerStoreId = (s as any).sellerStoreId ?? (s.sellerStore?.id ?? null);
    const storeSlug = s.sellerStore?.shopSlug ?? ((s as any).daoId ?? null);

    // Usar onChainStoreId direto do ServiceOffering (otimização: evita query extra)
    const onChainStoreId = (s as any).onChainStoreId
      ? String((s as any).onChainStoreId)
      : null;

    return {
      id: s.id,
      kind: 'service',
      title: s.title,
      description: s.description,
      category_path,
      category_slugs: slugs,
      attrs, // MANTIDO: todos os atributos
      indexHints, // MANTIDO: todas as hints
      price: priceNum,
      priceBzr: priceBzrNum, // ADICIONADO: preço BZR numérico
      media: firstMedia ? [{ id: firstMedia.id, url: firstMedia.url }] : [],
      createdAt: (s.createdAt as Date).toISOString(),
      sellerStoreId,
      onChainStoreId, // NOVO: ID da store on-chain
      storeSlug,
      daoId: (s as any).daoId ?? null
    };
  }
}
