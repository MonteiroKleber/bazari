// V-5 (2025-09-12): Agrega primeira mídia para Product e ServiceOffering em /search (funciona em kind='product', kind='service' e 'all'). Mantém facets e paginação.
// path: apps/api/src/lib/searchQuery.ts
// path: apps/api/src/lib/searchQuery.ts

import { PrismaClient, Prisma } from '@prisma/client';

interface SearchFilters {
  q?: string;
  kind?: 'product' | 'service' | 'all';
  categoryPath?: string[];
  priceMin?: string;
  priceMax?: string;
  attrs?: Record<string, string | string[]>;
  limit?: number;
  offset?: number;
  sort?: 'relevance' | 'priceAsc' | 'priceDesc' | 'createdDesc';
}

interface SearchResult {
  items: any[];
  page: {
    limit: number;
    offset: number;
    total: number;
  };
  facets: {
    categories: Array<{ path: string[]; count: number }>;
    price: {
      min: string;
      max: string;
      buckets: Array<{ range: string; count: number }>;
    };
    attributes: Record<string, Array<{ value: string; count: number }>>;
  };
}

export class SearchQueryBuilder {
  constructor(private prisma: PrismaClient) {}

  async search(filters: SearchFilters): Promise<SearchResult> {
    const {
      q,
      kind = 'all',
      categoryPath = [],
      priceMin,
      priceMax,
      attrs = {},
      limit = 20,
      offset = 0,
      sort = 'relevance'
    } = filters;

    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safeOffset = Math.max(0, offset);

    // Construir WHERE clause base
    const whereProduct: Prisma.ProductWhereInput = {};
    const whereService: Prisma.ServiceOfferingWhereInput = {};

    // Texto livre com pg_trgm
    if (q && q.trim()) {
      const searchTerm = `%${q.trim()}%`;
      whereProduct.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } }
      ];
      whereService.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    // Filtro por categoria
    if (categoryPath.length > 0) {
      whereProduct.categoryPath = { hasEvery: categoryPath };
      whereService.categoryPath = { hasEvery: categoryPath };
    }

    // Filtro por preço
    if (priceMin || priceMax) {
      const priceFilter: any = {};
      if (priceMin) priceFilter.gte = priceMin;
      if (priceMax) priceFilter.lte = priceMax;
      
      whereProduct.priceBzr = priceFilter;
      whereService.basePriceBzr = priceFilter;
    }

    // Filtro por atributos
    if (Object.keys(attrs).length > 0) {
      const attrFilters: any[] = [];
      for (const [key, value] of Object.entries(attrs)) {
        if (Array.isArray(value)) {
          attrFilters.push({ attributes: { path: [key], array_contains: value } });
        } else {
          attrFilters.push({ attributes: { path: [key], equals: value } });
        }
      }
      if (attrFilters.length > 0) {
        whereProduct.AND = attrFilters;
        whereService.AND = attrFilters;
      }
    }

    // Ordenação
    const orderByProduct: Prisma.ProductOrderByWithRelationInput[] = [];
    const orderByService: Prisma.ServiceOfferingOrderByWithRelationInput[] = [];
    
    switch (sort) {
      case 'priceAsc':
        orderByProduct.push({ priceBzr: 'asc' });
        orderByService.push({ basePriceBzr: 'asc' });
        break;
      case 'priceDesc':
        orderByProduct.push({ priceBzr: 'desc' });
        orderByService.push({ basePriceBzr: 'desc' });
        break;
      case 'createdDesc':
        orderByProduct.push({ createdAt: 'desc' });
        orderByService.push({ createdAt: 'desc' });
        break;
      default:
        // relevance - ordenar por título quando há busca
        if (q) {
          orderByProduct.push({ title: 'asc' });
          orderByService.push({ title: 'asc' });
        } else {
          orderByProduct.push({ createdAt: 'desc' });
          orderByService.push({ createdAt: 'desc' });
        }
    }

    // Buscar produtos e serviços
    const searchPromises: Promise<any>[] = [];
    let totalCount = 0;
    let allItems: any[] = [];

    if (kind === 'product' || kind === 'all') {
      searchPromises.push(
        this.prisma.product.findMany({
          where: whereProduct,
          orderBy: orderByProduct,
          skip: kind === 'product' ? safeOffset : 0,
          take: kind === 'product' ? safeLimit : 1000,
          include: {
            category: true
          }
        }),
        this.prisma.product.count({ where: whereProduct })
      );
    }

    if (kind === 'service' || kind === 'all') {
      searchPromises.push(
        this.prisma.serviceOffering.findMany({
          where: whereService,
          orderBy: orderByService,
          skip: kind === 'service' ? safeOffset : 0,
          take: kind === 'service' ? safeLimit : 1000,
          include: {
            category: true
          }
        }),
        this.prisma.serviceOffering.count({ where: whereService })
      );
    }

    const results = await Promise.all(searchPromises);

    // Processar resultados
    if (kind === 'product') {
      allItems = results[0].map((p: any) => ({
        id: p.id,
        kind: 'product',
        title: p.title,
        description: p.description,
        priceBzr: p.priceBzr.toString(),
        categoryPath: p.categoryPath,
        attributes: p.attributes,
        media: [] // TODO: buscar media relacionada
      }));
      totalCount = results[1];
    } else if (kind === 'service') {
      allItems = results[0].map((s: any) => ({
        id: s.id,
        kind: 'service',
        title: s.title,
        description: s.description,
        priceBzr: s.basePriceBzr?.toString() || null,
        categoryPath: s.categoryPath,
        attributes: s.attributes,
        media: []
      }));
      totalCount = results[1];
    } else {
      // Combinar produtos e serviços
      const products = results[0] || [];
      const productCount = results[1] || 0;
      const services = results[2] || [];
      const serviceCount = results[3] || 0;

      const productItems = products.map((p: any) => ({
        id: p.id,
        kind: 'product',
        title: p.title,
        description: p.description,
        priceBzr: p.priceBzr.toString(),
        categoryPath: p.categoryPath,
        attributes: p.attributes,
        media: []
      }));

      const serviceItems = services.map((s: any) => ({
        id: s.id,
        kind: 'service',
        title: s.title,
        description: s.description,
        priceBzr: s.basePriceBzr?.toString() || null,
        categoryPath: s.categoryPath,
        attributes: s.attributes,
        media: []
      }));

      allItems = [...productItems, ...serviceItems];
      totalCount = productCount + serviceCount;
    // Aplicar paginação no resultado combinado
      allItems = allItems.slice(safeOffset, safeOffset + safeLimit);
    }

    // Calcular facetas

    // Anexar primeira mídia para os itens da página (produtos e serviços)
    allItems = await this.attachFirstMedia(allItems);

const facets = await this.calculateFacets(whereProduct, whereService, kind);

    return {
      items: allItems,
      page: {
        limit: safeLimit,
        offset: safeOffset,
        total: totalCount
      },
      facets
    };
  }

  
  // Anexa a primeira mídia (capa) a cada item (product/service) com base no ownerId/ownerType.
  private async attachFirstMedia(allItems: any[]): Promise<any[]> {
    if (!Array.isArray(allItems) || allItems.length === 0) return allItems;

    const productIds = allItems.filter(i => i?.kind === 'product').map(i => i.id);
    const serviceIds = allItems.filter(i => i?.kind === 'service').map(i => i.id);

    if (productIds.length === 0 && serviceIds.length === 0) return allItems;

    const mediaAssets = await this.prisma.mediaAsset.findMany({
      where: {
        OR: [
          ...(productIds.length > 0 ? [{ ownerType: 'Product' as const, ownerId: { in: productIds } }] : []),
          ...(serviceIds.length > 0 ? [{ ownerType: 'ServiceOffering' as const, ownerId: { in: serviceIds } }] : []),
        ]
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, url: true, ownerId: true, ownerType: true }
    });

    const firstByOwner = new Map<string, { id: string; url: string }>();
    for (const m of mediaAssets) {
      if (!firstByOwner.has(m.ownerId)) {
        firstByOwner.set(m.ownerId, { id: m.id, url: m.url });
      }
    }

    return allItems.map(it => {
      const first = firstByOwner.get(it.id);
      return first ? { ...it, media: [{ id: first.id, url: first.url }] } : it;
    });
  }

  private async calculateFacets(
    whereProduct: Prisma.ProductWhereInput,
    whereService: Prisma.ServiceOfferingWhereInput,
    kind: 'product' | 'service' | 'all'
  ) {
    // Facetas de categorias
    const categoryFacets: Array<{ path: string[]; count: number }> = [];
    
    if (kind === 'product' || kind === 'all') {
      const productCategories = await this.prisma.product.groupBy({
        by: ['categoryPath'],
        where: whereProduct,
        _count: true
      });
      
      productCategories.forEach(cat => {
        // Agrupar por diferentes níveis de categoria
        for (let i = 1; i <= cat.categoryPath.length && i <= 4; i++) {
          const path = cat.categoryPath.slice(0, i);
          const existing = categoryFacets.find(f => 
            JSON.stringify(f.path) === JSON.stringify(path)
          );
          if (existing) {
            existing.count += cat._count;
          } else {
            categoryFacets.push({ path, count: cat._count });
          }
        }
      });
    }

    if (kind === 'service' || kind === 'all') {
      const serviceCategories = await this.prisma.serviceOffering.groupBy({
        by: ['categoryPath'],
        where: whereService,
        _count: true
      });
      
      serviceCategories.forEach(cat => {
        for (let i = 1; i <= cat.categoryPath.length && i <= 4; i++) {
          const path = cat.categoryPath.slice(0, i);
          const existing = categoryFacets.find(f => 
            JSON.stringify(f.path) === JSON.stringify(path)
          );
          if (existing) {
            existing.count += cat._count;
          } else {
            categoryFacets.push({ path, count: cat._count });
          }
        }
      });
    }

    // Facetas de preço
    const priceStats = await this.calculatePriceStats(whereProduct, whereService, kind);
    
    // Facetas de atributos (simplificado - idealmente seria baseado em indexHints)
    const attributeFacets = await this.calculateAttributeFacets(whereProduct, whereService, kind);

    return {
      categories: categoryFacets.sort((a, b) => b.count - a.count).slice(0, 20),
      price: priceStats,
      attributes: attributeFacets
    };
  }

  private async calculatePriceStats(
    whereProduct: Prisma.ProductWhereInput,
    whereService: Prisma.ServiceOfferingWhereInput,
    kind: 'product' | 'service' | 'all'
  ) {
    let min = '0';
    let max = '0';
    const buckets: Array<{ range: string; count: number }> = [];

    if (kind === 'product' || kind === 'all') {
      const productStats = await this.prisma.product.aggregate({
        where: whereProduct,
        _min: { priceBzr: true },
        _max: { priceBzr: true }
      });
      
      if (productStats._min?.priceBzr) {
        min = productStats._min.priceBzr.toString();
      }
      if (productStats._max?.priceBzr) {
        max = productStats._max.priceBzr.toString();
      }
    }

    if (kind === 'service' || kind === 'all') {
      const serviceStats = await this.prisma.serviceOffering.aggregate({
        where: whereService,
        _min: { basePriceBzr: true },
        _max: { basePriceBzr: true }
      });
      
      if (serviceStats._min?.basePriceBzr) {
        const serviceMin = serviceStats._min.basePriceBzr.toString();
        if (!min || parseFloat(serviceMin) < parseFloat(min)) {
          min = serviceMin;
        }
      }
      if (serviceStats._max?.basePriceBzr) {
        const serviceMax = serviceStats._max.basePriceBzr.toString();
        if (!max || parseFloat(serviceMax) > parseFloat(max)) {
          max = serviceMax;
        }
      }
    }

    // Criar 5 buckets logarítmicos
    if (parseFloat(max) > parseFloat(min)) {
      const minVal = parseFloat(min);
      const maxVal = parseFloat(max);
      const step = (maxVal - minVal) / 5;
      
      for (let i = 0; i < 5; i++) {
        const rangeMin = minVal + (step * i);
        const rangeMax = minVal + (step * (i + 1));
        
        // Contar items neste range
        let count = 0;
        
        if (kind === 'product' || kind === 'all') {
          count += await this.prisma.product.count({
            where: {
              ...whereProduct,
              priceBzr: {
                gte: rangeMin.toFixed(12),
                lt: rangeMax.toFixed(12)
              }
            }
          });
        }
        
        if (kind === 'service' || kind === 'all') {
          count += await this.prisma.serviceOffering.count({
            where: {
              ...whereService,
              basePriceBzr: {
                gte: rangeMin.toFixed(12),
                lt: rangeMax.toFixed(12)
              }
            }
          });
        }
        
        buckets.push({
          range: `${rangeMin.toFixed(2)}-${rangeMax.toFixed(2)}`,
          count
        });
      }
    }

    return { min, max, buckets };
  }

  
  private async calculateAttributeFacets(
    whereProduct: Prisma.ProductWhereInput,
    whereService: Prisma.ServiceOfferingWhereInput,
    kind: 'product' | 'service' | 'all'
  ): Promise<Record<string, Array<{ value: string; count: number }>>> {
    // V-5 (2025-09-12): Implementa facetas por atributos com base em indexHints das categorias efetivas.
    // Estratégia incremental e segura: buscamos itens filtrados (sem paginação), coletamos categoryIds,
    // resolvemos indexHints por categoria e agregamos contagens em memória.
    const out: Record<string, Array<{ value: string; count: number }>> = {};

    // Buscar itens conforme o kind (limitamos campos para eficiência)
    let products: Array<{ id: string; categoryId: string; attributes: any }> = [];
    let services: Array<{ id: string; categoryId: string; attributes: any }> = [];

    if (kind === 'product') {
      products = await this.prisma.product.findMany({
        where: whereProduct,
        select: { id: true, categoryId: true, attributes: true },
        take: 5000,
      });
    } else if (kind === 'service') {
      services = await this.prisma.serviceOffering.findMany({
        where: whereService,
        select: { id: true, categoryId: true, attributes: true },
        take: 5000,
      });
    } else {
      // all
      products = await this.prisma.product.findMany({
        where: whereProduct,
        select: { id: true, categoryId: true, attributes: true },
        take: 5000,
      });
      services = await this.prisma.serviceOffering.findMany({
        where: whereService,
        select: { id: true, categoryId: true, attributes: true },
        take: 5000,
      });
    }

    const allItems = [
      ...products.map(p => ({ kind: 'product' as const, categoryId: p.categoryId, attributes: p.attributes })),
      ...services.map(s => ({ kind: 'service' as const, categoryId: s.categoryId, attributes: s.attributes })),
    ];

    if (allItems.length === 0) return out;

    // Coletar atributos a facetar a partir dos indexHints por categoria efetiva
    const { resolveEffectiveSpecByCategoryId } = await import('./categoryResolver');
    const catIds = Array.from(new Set(allItems.map(i => i.categoryId).filter(Boolean)));
    const hinted = new Set<string>();
    for (const cid of catIds) {
      try {
        const spec = await resolveEffectiveSpecByCategoryId(cid);
        const hints: string[] = Array.isArray(spec?.indexHints) ? spec.indexHints : [];
        for (const h of hints) {
          if (h && typeof h === 'string') hinted.add(h);
        }
      } catch {}
    }

    if (hinted.size === 0) {
      // fallback: inferir chaves comuns dos atributos presentes
      const first = allItems.find(i => i.attributes && typeof i.attributes === 'object');
      if (first) {
        for (const k of Object.keys(first.attributes || {})) hinted.add(k);
      }
    }

    // Agregar contagens
    const counters: Record<string, Map<string, number>> = {};
    for (const key of hinted) counters[key] = new Map<string, number>();

    for (const item of allItems) {
      const attrs = item.attributes && typeof item.attributes === 'object' ? item.attributes : {};
      for (const key of hinted) {
        const raw = (attrs as any)[key];
        if (raw === null || raw === undefined) continue;

        const add = (val: any) => {
          let v = String(val).trim();
          if (!v) return;
          const m = counters[key];
          m.set(v, (m.get(v) || 0) + 1);
        };

        if (Array.isArray(raw)) raw.forEach(add);
        else add(raw);
      }
    }

    // Montar saída: ordenar por count desc e limitar a 20 valores por atributo
    for (const key of Object.keys(counters)) {
      const arr = Array.from(counters[key].entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
      if (arr.length) out[key] = arr;
    }

    return out;
  }

}