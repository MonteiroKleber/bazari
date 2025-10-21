import type { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { uploadToIpfs } from './ipfs.js';

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export interface StoreJson {
  $schema: string;
  id: string; // onChainStoreId
  slug: string;
  name: string;
  description?: string;
  theme?: {
    layoutVariant?: string; // "classic" | "branded-hero"
    palette?: {
      bg?: string;
      ink?: string;
      brand?: string;
      accent?: string;
    };
    logoUrl?: string;
  };
  policies?: {
    returns?: string;
    shipping?: string;
  };
  version: number;
  publishedAt: string; // ISO 8601
}

export interface CategoriesJson {
  $schema: string;
  storeId: string;
  version: number;
  categories: Array<{
    id: string;
    name: string;
    children?: string[]; // IDs de subcategorias
  }>;
}

export interface ProductsJson {
  $schema: string;
  storeId: string;
  version: number;
  items: Array<{
    sku: string; // Product.id
    title: string;
    description?: string;
    price: {
      amount: string;
      currency: string; // "BZR"
    };
    categoryId?: string;
    media?: string[]; // IPFS URLs
    attributes?: Record<string, any>;
  }>;
}

// ============================================================================
// BUILD FUNCTIONS
// ============================================================================

/**
 * Gera o JSON de metadados da loja (store.json)
 */
export async function buildStoreJson(
  prisma: PrismaClient,
  storeId: string, // SellerProfile.id or slug
): Promise<StoreJson> {
  // Buscar por ID ou slug
  const store = await prisma.sellerProfile.findFirst({
    where: {
      OR: [
        { id: storeId },
        { shopSlug: storeId },
      ],
    },
    select: {
      id: true,
      onChainStoreId: true,
      shopName: true,
      shopSlug: true,
      about: true,
      policies: true,
      avatarUrl: true,
      version: true,
    },
  });

  if (!store) {
    throw new Error(`Store not found: ${storeId}`);
  }

  // Extrair theme e policies do JSON
  const policies = store.policies as any;
  const theme = policies?.theme;
  const storePolicies = {
    returns: policies?.returns,
    shipping: policies?.shipping,
  };

  return {
    $schema: 'https://bazari.com/schemas/store/v1',
    id: store.onChainStoreId?.toString() || '0',
    slug: store.shopSlug,
    name: store.shopName,
    description: store.about || undefined,
    theme: theme ? {
      layoutVariant: theme.layoutVariant,
      palette: theme.palette,
      logoUrl: store.avatarUrl || undefined,
    } : undefined,
    policies: storePolicies.returns || storePolicies.shipping ? storePolicies : undefined,
    version: store.version || 0,
    publishedAt: new Date().toISOString(),
  };
}

/**
 * Gera o JSON de categorias (categories.json)
 *
 * NOTA: Categorias são derivadas automaticamente dos produtos/serviços cadastrados,
 * não de primaryCategories em policies. Isso garante que categories.json sempre
 * reflita as categorias REAIS dos itens da loja.
 */
export async function buildCategoriesJson(
  prisma: PrismaClient,
  storeId: string,
): Promise<CategoriesJson> {
  // Buscar loja
  const store = await prisma.sellerProfile.findFirst({
    where: {
      OR: [
        { id: storeId },
        { shopSlug: storeId },
      ],
    },
    select: {
      id: true,
      onChainStoreId: true,
      version: true,
    },
  });

  if (!store) {
    throw new Error(`Store not found: ${storeId}`);
  }

  // Durante primeira publicação, onChainStoreId ainda não existe
  // Nesse caso, buscar produtos por sellerStoreId
  const hasOnChainId = !!store.onChainStoreId;

  // Buscar categorias únicas dos produtos publicados
  const products = await prisma.product.findMany({
    where: hasOnChainId
      ? {
          onChainStoreId: store.onChainStoreId,
          status: 'PUBLISHED',
        }
      : {
          sellerStoreId: store.id,
          status: 'PUBLISHED',
        },
    select: { categoryId: true },
    distinct: ['categoryId'],
  });

  // Buscar categorias únicas dos serviços
  const services = await prisma.serviceOffering.findMany({
    where: hasOnChainId
      ? {
          onChainStoreId: store.onChainStoreId,
        }
      : {
          sellerStoreId: store.id,
        },
    select: { categoryId: true },
    distinct: ['categoryId'],
  });

  // Combinar IDs de categorias
  const categoryIds = [
    ...products.map(p => p.categoryId),
    ...services.map(s => s.categoryId),
  ].filter(Boolean);

  // Se não houver produtos/serviços, retornar categories vazio
  if (categoryIds.length === 0) {
    return {
      $schema: 'https://bazari.com/schemas/categories/v1',
      storeId: store.onChainStoreId?.toString() || '0',
      version: store.version || 0,
      categories: [],
    };
  }

  // Buscar dados das categorias da tabela Category
  const categories = await prisma.category.findMany({
    where: {
      id: { in: categoryIds },
      active: true,
    },
    select: {
      id: true,
      namePt: true,
      parentId: true,
    },
    orderBy: { sort: 'asc' },
  });

  // Construir estrutura hierárquica
  const categoryMap = new Map<string, { id: string; name: string; children: string[] }>();

  for (const cat of categories) {
    categoryMap.set(cat.id, {
      id: cat.id,
      name: cat.namePt,
      children: [],
    });
  }

  // Identificar filhos
  for (const cat of categories) {
    if (cat.parentId && categoryMap.has(cat.parentId)) {
      categoryMap.get(cat.parentId)!.children.push(cat.id);
    }
  }

  // Converter para array
  const categoriesArray = Array.from(categoryMap.values()).map(cat => ({
    id: cat.id,
    name: cat.name,
    children: cat.children.length > 0 ? cat.children : undefined,
  }));

  return {
    $schema: 'https://bazari.com/schemas/categories/v1',
    storeId: store.onChainStoreId?.toString() || '0',
    version: store.version || 0,
    categories: categoriesArray,
  };
}

/**
 * Gera o JSON de produtos/catálogo (products.json)
 */
export async function buildProductsJson(
  prisma: PrismaClient,
  storeId: string,
): Promise<ProductsJson> {
  // Buscar loja para obter versão e onChainStoreId
  const store = await prisma.sellerProfile.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      version: true,
      onChainStoreId: true,
    },
  });

  if (!store) {
    throw new Error(`Store ${storeId} not found`);
  }

  // Durante primeira publicação, onChainStoreId ainda não existe
  // Nesse caso, buscar produtos por sellerStoreId
  const hasOnChainId = !!store.onChainStoreId;

  // Buscar produtos publicados
  const products = await prisma.product.findMany({
    where: hasOnChainId
      ? {
          onChainStoreId: store.onChainStoreId,
          status: 'PUBLISHED',
        }
      : {
          sellerStoreId: store.id,
          status: 'PUBLISHED',
        },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      priceBzr: true,
      categoryId: true,
      attributes: true,
    },
  });

  // Buscar mídia para produtos
  const productIds = products.map(p => p.id);
  const productMedia = productIds.length > 0
    ? await prisma.mediaAsset.findMany({
        where: {
          ownerType: 'Product',
          ownerId: { in: productIds },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          ownerId: true,
          url: true,
        },
      })
    : [];

  // Mapear mídia por produto ID
  const mediaMap = new Map<string, string[]>();
  for (const media of productMedia) {
    if (!media.ownerId) continue;
    if (!mediaMap.has(media.ownerId)) {
      mediaMap.set(media.ownerId, []);
    }
    mediaMap.get(media.ownerId)!.push(media.url);
  }

  // Construir itens
  const items = products.map(product => ({
    sku: product.id,
    title: product.title,
    description: product.description || undefined,
    price: {
      amount: product.priceBzr.toString(),
      currency: 'BZR',
    },
    categoryId: product.categoryId || undefined,
    media: mediaMap.get(product.id),
    attributes: product.attributes as Record<string, any> || undefined,
  }));

  return {
    $schema: 'https://bazari.com/schemas/products/v1',
    storeId: store.onChainStoreId?.toString() || '0',
    version: store.version || 0,
    items,
  };
}

// ============================================================================
// HASH & UPLOAD FUNCTIONS
// ============================================================================

/**
 * Calcula o hash SHA-256 de um objeto JSON
 */
export function calculateJsonHash(json: object): string {
  const canonical = JSON.stringify(json);
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Faz upload de um JSON para IPFS e retorna o CID
 */
export async function uploadJsonToIpfs(
  json: object,
  filename: string,
): Promise<string> {
  const jsonString = JSON.stringify(json, null, 2);

  try {
    // Upload usando IpfsClientPool (com failover e retry)
    const cid = await uploadToIpfs(jsonString, { filename });
    return cid;
  } catch (error) {
    // Desenvolvimento: gerar CID fake baseado em hash dos dados
    console.warn(`[IPFS] Upload failed for ${filename}, using fake CID:`, (error as Error).message);
    const hash = createHash('sha256').update(jsonString).digest('base64');
    const fakeCid = `bafydev${hash.replace(/[+/=]/g, 'a').substring(0, 46)}`;
    console.log(`[IPFS] Generated fake CID for ${filename}:`, fakeCid);
    return fakeCid;
  }
}

// ============================================================================
// ORCHESTRATION FUNCTION
// ============================================================================

export interface PublishResult {
  storeJson: StoreJson;
  storeCid: string;
  storeHash: string;
  categoriesJson: CategoriesJson;
  categoriesCid: string;
  categoriesHash: string;
  productsJson: ProductsJson;
  productsCid: string;
  productsHash: string;
}

/**
 * Orquestra a geração completa de todos os JSONs, hashes e upload para IPFS
 */
export async function publishStoreToIpfs(
  prisma: PrismaClient,
  storeId: string,
): Promise<PublishResult> {
  // 1. Buscar onChainStoreId
  const store = await prisma.sellerProfile.findFirst({
    where: {
      OR: [
        { id: storeId },
        { shopSlug: storeId },
      ],
    },
    select: { onChainStoreId: true },
  });

  if (!store?.onChainStoreId) {
    throw new Error(`Store ${storeId} not found or has no onChainStoreId`);
  }

  // 2. Gerar JSONs
  const [storeJson, categoriesJson, productsJson] = await Promise.all([
    buildStoreJson(prisma, storeId),
    buildCategoriesJson(prisma, storeId),
    buildProductsJson(prisma, storeId),
  ]);

  // 3. Calcular hashes
  const storeHash = calculateJsonHash(storeJson);
  const categoriesHash = calculateJsonHash(categoriesJson);
  const productsHash = calculateJsonHash(productsJson);

  // 4. Upload para IPFS
  const [storeCid, categoriesCid, productsCid] = await Promise.all([
    uploadJsonToIpfs(storeJson, 'store.json'),
    uploadJsonToIpfs(categoriesJson, 'categories.json'),
    uploadJsonToIpfs(productsJson, 'products.json'),
  ]);

  return {
    storeJson,
    storeCid,
    storeHash,
    categoriesJson,
    categoriesCid,
    categoriesHash,
    productsJson,
    productsCid,
    productsHash,
  };
}
