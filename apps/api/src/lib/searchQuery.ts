// V-12 (2025-09-18): Adiciona mídia principal no fallback Postgres
// V-11 (2025-09-18): Converte Decimals para number nas métricas de preço
// V-10 (2025-09-18): Remove filtros 'deleted' inexistentes e normaliza busca textual
// V-9 (2025-09-14): Corrige campo 'deleted' inexistente, mantém compatibilidade com schema real
// - Remove referência a campo 'deleted' que não existe no schema
// - ORDER BY condicional sem ts_rank
// - Facets alinhadas com OS: count DESC, path ASC, limite 30
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
  storeId?: string;
  storeSlug?: string;
  onChainStoreId?: string;
  userId?: string; // FASE 1: Filtrar por lojas do usuário
  myStoresOnly?: boolean; // FASE 1: Flag para filtrar apenas minhas lojas
  affiliateStoresOnly?: boolean; // FASE 2: Flag para filtrar apenas lojas afiliadas
  followersStoresOnly?: boolean; // FASE 3: Flag para filtrar apenas lojas de seguidores
  openStoresOnly?: boolean; // FASE 4: Flag para filtrar apenas lojas abertas (mode='open')
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

function toNum(value: unknown): number | null {
  if (value == null) return null;
  const maybeDecimal = value as { toNumber?: () => number } | number | string;
  if (typeof maybeDecimal === 'object' && typeof maybeDecimal?.toNumber === 'function') {
    const n = maybeDecimal.toNumber();
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(maybeDecimal as number | string);
  return Number.isFinite(n) ? n : null;
}

export class SearchQueryBuilder {
  constructor(private prisma: PrismaClient) {}

  async search(filters: SearchFilters): Promise<SearchResult> {
    // Verificar se prisma está disponível
    if (!this.prisma) {
      throw new Error('PrismaClient not available in SearchQueryBuilder');
    }
    
    if (!this.prisma.product || !this.prisma.serviceOffering) {
      throw new Error('Product or ServiceOffering models not available in PrismaClient');
    }
    
    const {
      q,
      kind = 'all', // Padrão é 'all' - retorna produtos E serviços
      categoryPath = [],
      priceMin,
      priceMax,
      attrs = {},
      limit = 20,
      offset = 0,
      sort = 'relevance',
      storeId,
      storeSlug,
      onChainStoreId,
      userId,
      myStoresOnly,
      affiliateStoresOnly,
      followersStoresOnly,
      openStoresOnly
    } = filters;

    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safeOffset = Math.max(0, offset);

    // FASE 1: Buscar lojas do usuário se myStoresOnly=true
    let userStoreIds: string[] = [];
    if (myStoresOnly && userId) {
      const userStores = await this.prisma.sellerProfile.findMany({
        where: { userId },
        select: { id: true }
      });
      userStoreIds = userStores.map(s => s.id);

      // Se não encontrou lojas, retornar vazio
      if (userStoreIds.length === 0) {
        return {
          items: [],
          page: { limit: safeLimit, offset: safeOffset, total: 0 },
          facets: {
            categories: [],
            price: { min: '0', max: '0', buckets: [] },
            attributes: {}
          }
        };
      }
    }

    // FASE 2: Buscar lojas afiliadas se affiliateStoresOnly=true
    // Apenas lojas onde o usuário JÁ É afiliado aprovado (ChatStoreAffiliate.status='approved')
    let affiliateStoreIds: string[] = [];
    if (affiliateStoresOnly && userId) {
      // Buscar profileId do usuário atual
      const userProfile = await this.prisma.profile.findUnique({
        where: { userId },
        select: { id: true }
      });

      // Buscar lojas onde o usuário é afiliado aprovado
      const approvedAffiliates = userProfile ? await this.prisma.chatStoreAffiliate.findMany({
        where: {
          promoterId: userProfile.id,
          status: 'approved'
        },
        select: { storeId: true }
      }) : [];

      const affiliateOnChainStoreIds = approvedAffiliates
        .map(a => a.storeId)
        .filter((id): id is bigint => id !== null);

      // Buscar sellerStoreIds correspondentes
      const affiliateStores = await this.prisma.sellerProfile.findMany({
        where: { onChainStoreId: { in: affiliateOnChainStoreIds } },
        select: { id: true }
      });
      affiliateStoreIds = affiliateStores.map(s => s.id);

      // Se não encontrou lojas afiliadas, retornar vazio
      if (affiliateStoreIds.length === 0) {
        return {
          items: [],
          page: { limit: safeLimit, offset: safeOffset, total: 0 },
          facets: {
            categories: [],
            price: { min: '0', max: '0', buckets: [] },
            attributes: {}
          }
        };
      }
    }

    // FASE 3: Buscar lojas de seguidores se followersStoresOnly=true
    // Lojas com mode='followers' onde o usuário segue o dono da loja
    let followersStoreIds: string[] = [];
    if (followersStoresOnly && userId) {
      // Buscar profileId do usuário atual
      const userProfile = await this.prisma.profile.findUnique({
        where: { userId },
        select: { id: true }
      });

      if (userProfile) {
        // Buscar lojas com mode='followers'
        const followersPolicies = await this.prisma.storeCommissionPolicy.findMany({
          where: { mode: 'followers' },
          select: { storeId: true }
        });
        const followersOnChainStoreIds = followersPolicies.map(p => p.storeId);

        // Buscar sellerProfiles dessas lojas para pegar userId dos donos
        const followersStores = await this.prisma.sellerProfile.findMany({
          where: { onChainStoreId: { in: followersOnChainStoreIds } },
          select: { userId: true, onChainStoreId: true, id: true }
        });

        // Buscar profiles dos donos das lojas
        const ownerUserIds = followersStores.map(s => s.userId);
        const ownerProfiles = await this.prisma.profile.findMany({
          where: { userId: { in: ownerUserIds } },
          select: { id: true, userId: true }
        });

        // Buscar quais donos o usuário segue
        const followedOwnerIds = await this.prisma.follow.findMany({
          where: {
            followerId: userProfile.id,
            followingId: { in: ownerProfiles.map(p => p.id) }
          },
          select: { followingId: true }
        });

        // Mapear profileId → userId
        const followedProfileIds = new Set(followedOwnerIds.map(f => f.followingId));
        const followedOwnerUserIds = ownerProfiles
          .filter(p => followedProfileIds.has(p.id))
          .map(p => p.userId);

        // Filtrar lojas cujo dono é seguido pelo usuário
        const followedStores = followersStores
          .filter(s => followedOwnerUserIds.includes(s.userId));

        followersStoreIds = followedStores.map(s => s.id);
      }

      // Se não encontrou lojas de seguidores, retornar vazio
      if (followersStoreIds.length === 0) {
        return {
          items: [],
          page: { limit: safeLimit, offset: safeOffset, total: 0 },
          facets: {
            categories: [],
            price: { min: '0', max: '0', buckets: [] },
            attributes: {}
          }
        };
      }
    }

    // FASE 4: Buscar lojas abertas se openStoresOnly=true
    // Lojas com mode='open' (qualquer promotor pode afiliar)
    let openStoreIds: string[] = [];
    if (openStoresOnly) {
      // Buscar lojas com mode='open'
      const openPolicies = await this.prisma.storeCommissionPolicy.findMany({
        where: { mode: 'open' },
        select: { storeId: true }
      });
      const openOnChainStoreIds = openPolicies.map(p => p.storeId);

      // Buscar sellerStoreIds correspondentes
      const openStores = await this.prisma.sellerProfile.findMany({
        where: { onChainStoreId: { in: openOnChainStoreIds } },
        select: { id: true }
      });
      openStoreIds = openStores.map(s => s.id);

      // Se não encontrou lojas abertas, retornar vazio
      if (openStoreIds.length === 0) {
        return {
          items: [],
          page: { limit: safeLimit, offset: safeOffset, total: 0 },
          facets: {
            categories: [],
            price: { min: '0', max: '0', buckets: [] },
            attributes: {}
          }
        };
      }
    }

    // Construir WHERE clauses
    const whereProduct: Prisma.ProductWhereInput = {};
    const whereService: Prisma.ServiceOfferingWhereInput = {};
    const productAnd: Prisma.ProductWhereInput[] = [];
    const serviceAnd: Prisma.ServiceOfferingWhereInput[] = [];

    // Busca textual
    if (q && q.trim()) {
      const searchTerm = q.trim();
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
        productAnd.push(...(attrFilters as Prisma.ProductWhereInput[]));
        serviceAnd.push(...(attrFilters as Prisma.ServiceOfferingWhereInput[]));
      }
    }

    // FASE 1: Filtro por lojas do usuário
    if (myStoresOnly && userStoreIds.length > 0) {
      productAnd.push({ sellerStoreId: { in: userStoreIds } });
      serviceAnd.push({ sellerStoreId: { in: userStoreIds } });
    }

    // FASE 2: Filtro por lojas afiliadas
    if (affiliateStoresOnly && affiliateStoreIds.length > 0) {
      productAnd.push({ sellerStoreId: { in: affiliateStoreIds } });
      serviceAnd.push({ sellerStoreId: { in: affiliateStoreIds } });
    }

    // FASE 3: Filtro por lojas de seguidores
    if (followersStoresOnly && followersStoreIds.length > 0) {
      productAnd.push({ sellerStoreId: { in: followersStoreIds } });
      serviceAnd.push({ sellerStoreId: { in: followersStoreIds } });
    }

    // FASE 4: Filtro por lojas abertas
    if (openStoresOnly && openStoreIds.length > 0) {
      productAnd.push({ sellerStoreId: { in: openStoreIds } });
      serviceAnd.push({ sellerStoreId: { in: openStoreIds } });
    }

    // Filtro por loja
    if (storeId || storeSlug) {
      const productStoreClauses: Prisma.ProductWhereInput[] = [];
      const serviceStoreClauses: Prisma.ServiceOfferingWhereInput[] = [];

      if (storeId) {
        productStoreClauses.push({ sellerStoreId: storeId });
        serviceStoreClauses.push({ sellerStoreId: storeId });
      }

      if (storeSlug) {
        productStoreClauses.push({ sellerStore: { shopSlug: storeSlug } });
        productStoreClauses.push({
          AND: [
            { sellerStoreId: null },
            { daoId: storeSlug }
          ]
        });
        serviceStoreClauses.push({ sellerStore: { shopSlug: storeSlug } });
        serviceStoreClauses.push({
          AND: [
            { sellerStoreId: null },
            { daoId: storeSlug }
          ]
        });
      }

      if (productStoreClauses.length === 1) {
        productAnd.push(productStoreClauses[0]);
      } else if (productStoreClauses.length > 1) {
        productAnd.push({ OR: productStoreClauses });
      }

      if (serviceStoreClauses.length === 1) {
        serviceAnd.push(serviceStoreClauses[0]);
      } else if (serviceStoreClauses.length > 1) {
        serviceAnd.push({ OR: serviceStoreClauses });
      }
    }

    // Filtro por onChainStoreId
    if (onChainStoreId) {
      // Verificar se é um número válido antes de converter para BigInt
      if (/^\d+$/.test(onChainStoreId)) {
        const onChainStoreIdBigInt = BigInt(onChainStoreId);
        productAnd.push({ onChainStoreId: onChainStoreIdBigInt });
        serviceAnd.push({ onChainStoreId: onChainStoreIdBigInt });
      }
      // Se não for número, ignorar filtro (slug inválido para onChainStoreId)
    }

    if (productAnd.length > 0) {
      whereProduct.AND = productAnd;
    }

    if (serviceAnd.length > 0) {
      whereService.AND = serviceAnd;
    }

    // Ordenação condicional - sem ts_rank por enquanto
    const orderByProduct: Prisma.ProductOrderByWithRelationInput[] = [];
    const orderByService: Prisma.ServiceOfferingOrderByWithRelationInput[] = [];
    
    switch (sort) {
      case 'priceAsc':
        orderByProduct.push({ priceBzr: 'asc' }, { id: 'asc' });
        orderByService.push({ basePriceBzr: 'asc' }, { id: 'asc' });
        break;
      case 'priceDesc':
        orderByProduct.push({ priceBzr: 'desc' }, { id: 'asc' });
        orderByService.push({ basePriceBzr: 'desc' }, { id: 'asc' });
        break;
      case 'createdDesc':
        orderByProduct.push({ createdAt: 'desc' }, { id: 'asc' });
        orderByService.push({ createdAt: 'desc' }, { id: 'asc' });
        break;
      default: // relevance
        // Sempre usar createdAt DESC por enquanto (ts_rank precisaria de SQL raw)
        orderByProduct.push({ createdAt: 'desc' }, { id: 'asc' });
        orderByService.push({ createdAt: 'desc' }, { id: 'asc' });
        break;
    }

    // Executar queries
    const searchPromises: Promise<any>[] = [];
    let allItems: any[] = [];
    let totalCount = 0;

    // Para kind='all', buscar mais itens para mesclar e paginar depois
    const takeLimit = kind === 'all' ? Math.max(1000, safeOffset + safeLimit * 2) : safeLimit;

    if (kind === 'product' || kind === 'all') {
      searchPromises.push(
        this.prisma.product.findMany({
          where: whereProduct,
          orderBy: orderByProduct,
          skip: kind === 'product' ? safeOffset : 0,
          take: kind === 'product' ? safeLimit : takeLimit
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
          take: kind === 'service' ? safeLimit : takeLimit
        }),
        this.prisma.serviceOffering.count({ where: whereService })
      );
    }

    const results = await Promise.all(searchPromises);

    // Processar resultados baseado no kind
    if (kind === 'product') {
      // Apenas produtos
      const [products, count] = results;
      const mediaMap = await this.fetchFirstMediaMap('Product', (products || []).map((p: any) => p.id));

      // Buscar onChainStoreId para os produtos que têm sellerStoreId
      const storeIds = [...new Set((products || []).map((p: any) => p.sellerStoreId).filter(Boolean))];
      const stores = await this.prisma.sellerProfile.findMany({
        where: { id: { in: storeIds } },
        select: { id: true, onChainStoreId: true }
      });
      const storeMap = new Map(stores.map(s => [s.id, s.onChainStoreId]));

      allItems = (products || []).map((p: any) => {
        const onChainStoreId = p.sellerStoreId && storeMap.has(p.sellerStoreId)
          ? storeMap.get(p.sellerStoreId)
          : null;

        return {
          id: p.id,
          kind: 'product',
          title: p.title,
          description: p.description,
          priceBzr: p.priceBzr,
          categoryPath: p.categoryPath || [],
          attributes: p.attributes || {},
          sellerStoreId: p.sellerStoreId ?? null,
          // Converter BigInt para Number para serialização JSON
          onChainStoreId: onChainStoreId !== null ? Number(onChainStoreId) : null,
          media: mediaMap.has(p.id) ? [mediaMap.get(p.id)!] : [],
          createdAt: p.createdAt
        };
      });
      totalCount = count || 0;

    } else if (kind === 'service') {
      // Apenas serviços
      const [services, count] = results;
      const mediaMap = await this.fetchFirstMediaMap('ServiceOffering', (services || []).map((s: any) => s.id));

      // Buscar onChainStoreId para os serviços que têm sellerStoreId
      const storeIds = [...new Set((services || []).map((s: any) => s.sellerStoreId).filter(Boolean))];
      const stores = await this.prisma.sellerProfile.findMany({
        where: { id: { in: storeIds } },
        select: { id: true, onChainStoreId: true }
      });
      const storeMap = new Map(stores.map(s => [s.id, s.onChainStoreId]));

      allItems = (services || []).map((s: any) => {
        const onChainStoreId = s.sellerStoreId && storeMap.has(s.sellerStoreId)
          ? storeMap.get(s.sellerStoreId)
          : null;

        return {
          id: s.id,
          kind: 'service',
          title: s.title,
          description: s.description,
          priceBzr: s.basePriceBzr,
          categoryPath: s.categoryPath || [],
          attributes: s.attributes || {},
          sellerStoreId: s.sellerStoreId ?? null,
          // Converter BigInt para Number para serialização JSON
          onChainStoreId: onChainStoreId !== null ? Number(onChainStoreId) : null,
          media: mediaMap.has(s.id) ? [mediaMap.get(s.id)!] : [],
          createdAt: s.createdAt
        };
      });
      totalCount = count || 0;

    } else {
      // kind === 'all' - COMBINAR produtos E serviços
      let products: any[] = [];
      let productCount = 0;
      let services: any[] = [];
      let serviceCount = 0;

      // Processar resultados dependendo de quantos temos
      if (results.length === 4) {
        // Temos produtos E serviços
        [products, productCount, services, serviceCount] = results;
      } else if (results.length === 2) {
        // Apenas um tipo retornou resultados
        const [items, count] = results;
        if (items && items.length > 0) {
          // Verificar se é produto ou serviço pelo campo basePriceBzr
          if (items[0].hasOwnProperty('basePriceBzr')) {
            services = items;
            serviceCount = count;
          } else {
            products = items;
            productCount = count;
          }
        }
      }

      const productMediaMap = await this.fetchFirstMediaMap('Product', (products || []).map((p: any) => p.id));
      const serviceMediaMap = await this.fetchFirstMediaMap('ServiceOffering', (services || []).map((s: any) => s.id));

      // Buscar onChainStoreId para todos os items (produtos + serviços)
      const allStoreIds = [
        ...(products || []).map((p: any) => p.sellerStoreId),
        ...(services || []).map((s: any) => s.sellerStoreId)
      ].filter(Boolean);
      const uniqueStoreIds = [...new Set(allStoreIds)];
      const stores = await this.prisma.sellerProfile.findMany({
        where: { id: { in: uniqueStoreIds } },
        select: { id: true, onChainStoreId: true }
      });
      const storeMap = new Map(stores.map(s => [s.id, s.onChainStoreId]));

      // Mapear produtos
      const productItems = (products || []).map((p: any) => {
        const onChainStoreId = p.sellerStoreId && storeMap.has(p.sellerStoreId)
          ? storeMap.get(p.sellerStoreId)
          : null;

        return {
          id: p.id,
          kind: 'product',
          title: p.title,
          description: p.description,
          priceBzr: p.priceBzr,
          categoryPath: p.categoryPath || [],
          attributes: p.attributes || {},
          sellerStoreId: p.sellerStoreId ?? null,
          // Converter BigInt para Number para serialização JSON
          onChainStoreId: onChainStoreId !== null ? Number(onChainStoreId) : null,
          media: productMediaMap.has(p.id) ? [productMediaMap.get(p.id)!] : [],
          createdAt: p.createdAt
        };
      });

      // Mapear serviços
      const serviceItems = (services || []).map((s: any) => {
        const onChainStoreId = s.sellerStoreId && storeMap.has(s.sellerStoreId)
          ? storeMap.get(s.sellerStoreId)
          : null;

        return {
          id: s.id,
          kind: 'service',
          title: s.title,
          description: s.description,
          priceBzr: s.basePriceBzr,
          categoryPath: s.categoryPath || [],
          attributes: s.attributes || {},
          sellerStoreId: s.sellerStoreId ?? null,
          // Converter BigInt para Number para serialização JSON
          onChainStoreId: onChainStoreId !== null ? Number(onChainStoreId) : null,
          media: serviceMediaMap.has(s.id) ? [serviceMediaMap.get(s.id)!] : [],
          createdAt: s.createdAt
        };
      });

      // Combinar todos os itens
      allItems = [...productItems, ...serviceItems];

      // Ordenar a lista combinada
      if (sort === 'priceAsc') {
        allItems.sort((a, b) => {
          const priceA = parseFloat(a.priceBzr || '0');
          const priceB = parseFloat(b.priceBzr || '0');
          return priceA - priceB || a.id.localeCompare(b.id);
        });
      } else if (sort === 'priceDesc') {
        allItems.sort((a, b) => {
          const priceA = parseFloat(a.priceBzr || '0');
          const priceB = parseFloat(b.priceBzr || '0');
          return priceB - priceA || a.id.localeCompare(b.id);
        });
      } else {
        // Para relevance e createdDesc: ordenar por createdAt DESC, id ASC
        allItems.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (dateB !== dateA) return dateB - dateA;
          return a.id.localeCompare(b.id);
        });
      }

      // Total combinado
      totalCount = productCount + serviceCount;

      // Aplicar paginação APÓS ordenação
      allItems = allItems.slice(safeOffset, safeOffset + safeLimit);
    }

    // Calcular facets
    const facets = await this.calculateFacets(
      whereProduct,
      whereService,
      kind,
      allItems
    );

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

  private async calculateFacets(
    whereProduct: Prisma.ProductWhereInput,
    whereService: Prisma.ServiceOfferingWhereInput,
    kind: string,
    items: any[]
  ): Promise<SearchResult['facets']> {
    const categoryFacets = await this.calculateCategoryFacets(
      whereProduct,
      whereService,
      kind
    );

    const priceFacets = await this.calculatePriceFacets(
      whereProduct,
      whereService,
      kind
    );

    const attributeFacets = this.calculateAttributeFacets(items);

    return {
      categories: categoryFacets,
      price: priceFacets,
      attributes: attributeFacets
    };
  }

  private async calculateCategoryFacets(
    whereProduct: Prisma.ProductWhereInput,
    whereService: Prisma.ServiceOfferingWhereInput,
    kind: string
  ): Promise<Array<{ path: string[]; count: number }>> {
    const categoryMap = new Map<string, number>();

    if (kind === 'product' || kind === 'all') {
      const products = await this.prisma.product.findMany({
        where: whereProduct,
        select: { categoryPath: true },
        take: 5000 // Limitar para performance
      });

      for (const product of products) {
        if (product.categoryPath && Array.isArray(product.categoryPath)) {
          // Construir hierarquia até 4 níveis
          for (let i = 1; i <= Math.min(product.categoryPath.length, 4); i++) {
            const path = product.categoryPath.slice(0, i).join('/');
            categoryMap.set(path, (categoryMap.get(path) || 0) + 1);
          }
        }
      }
    }

    if (kind === 'service' || kind === 'all') {
      const services = await this.prisma.serviceOffering.findMany({
        where: whereService,
        select: { categoryPath: true },
        take: 5000 // Limitar para performance
      });

      for (const service of services) {
        if (service.categoryPath && Array.isArray(service.categoryPath)) {
          // Construir hierarquia até 4 níveis
          for (let i = 1; i <= Math.min(service.categoryPath.length, 4); i++) {
            const path = service.categoryPath.slice(0, i).join('/');
            categoryMap.set(path, (categoryMap.get(path) || 0) + 1);
          }
        }
      }
    }

    // Ordenar: count DESC, path ASC, limite 30
    return Array.from(categoryMap.entries())
      .map(([path, count]) => ({
        path: path.split('/'),
        count
      }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.path.join('/').localeCompare(b.path.join('/'));
      })
      .slice(0, 30);
  }

  private async calculatePriceFacets(
    whereProduct: Prisma.ProductWhereInput,
    whereService: Prisma.ServiceOfferingWhereInput,
    kind: string
  ): Promise<SearchResult['facets']['price']> {
    let minPrice = Infinity;
    let maxPrice = 0;
    const buckets: Array<{ range: string; count: number }> = [];

    if (kind === 'product' || kind === 'all') {
      const productAgg = await this.prisma.product.aggregate({
        where: whereProduct,
        _min: { priceBzr: true },
        _max: { priceBzr: true }
      });

      const minBzr = toNum(productAgg._min.priceBzr);
      const maxBzr = toNum(productAgg._max.priceBzr);
      if (minBzr != null) {
        minPrice = Math.min(minPrice, minBzr);
      }
      if (maxBzr != null) {
        maxPrice = Math.max(maxPrice, maxBzr);
      }
    }

    if (kind === 'service' || kind === 'all') {
      const serviceAgg = await this.prisma.serviceOffering.aggregate({
        where: whereService,
        _min: { basePriceBzr: true },
        _max: { basePriceBzr: true }
      });

      const minService = toNum(serviceAgg._min.basePriceBzr);
      const maxService = toNum(serviceAgg._max.basePriceBzr);
      if (minService != null) {
        minPrice = Math.min(minPrice, minService);
      }
      if (maxService != null) {
        maxPrice = Math.max(maxPrice, maxService);
      }
    }

    // Criar buckets de preço
    if (minPrice !== Infinity && maxPrice > 0) {
      const ranges = [
        { min: 0, max: 10, label: '0-10' },
        { min: 10, max: 50, label: '10-50' },
        { min: 50, max: 100, label: '50-100' },
        { min: 100, max: 500, label: '100-500' },
        { min: 500, max: 1000, label: '500-1000' },
        { min: 1000, max: Infinity, label: '1000+' }
      ];

      for (const range of ranges) {
        let count = 0;

        if (kind === 'product' || kind === 'all') {
          const productCount = await this.prisma.product.count({
            where: {
              ...whereProduct,
              priceBzr: {
                gte: range.min.toString(),
                ...(range.max !== Infinity ? { lt: range.max.toString() } : {})
              }
            }
          });
          count += productCount;
        }

        if (kind === 'service' || kind === 'all') {
          const serviceCount = await this.prisma.serviceOffering.count({
            where: {
              ...whereService,
              basePriceBzr: {
                gte: range.min.toString(),
                ...(range.max !== Infinity ? { lt: range.max.toString() } : {})
              }
            }
          });
          count += serviceCount;
        }

        if (count > 0) {
          buckets.push({ range: range.label, count });
        }
      }
    }

    return {
      min: minPrice === Infinity ? '0' : minPrice.toString(),
      max: maxPrice.toString(),
      buckets
    };
  }

  private async fetchFirstMediaMap(
    ownerType: 'Product' | 'ServiceOffering',
    ids: string[]
  ): Promise<Map<string, { id: string; url: string }>> {
    if (!ids.length) {
      return new Map();
    }

    const mediaAssets = await this.prisma.mediaAsset.findMany({
      where: {
        ownerType,
        ownerId: { in: ids }
      },
      orderBy: { createdAt: 'asc' }
    });

    const map = new Map<string, { id: string; url: string }>();
    for (const asset of mediaAssets) {
      const ownerId = asset.ownerId;
      if (!ownerId || map.has(ownerId)) continue;
      map.set(ownerId, { id: asset.id, url: asset.url });
    }
    return map;
  }

  private calculateAttributeFacets(items: any[]): Record<string, Array<{ value: string; count: number }>> {
    if (items.length === 0) return {};

    // Coletar todas as chaves de atributos
    const allKeys = new Set<string>();
    for (const item of items) {
      if (item.attributes && typeof item.attributes === 'object') {
        Object.keys(item.attributes).forEach(k => {
          if (k !== '_indexFields') allKeys.add(k);
        });
      }
    }

    // Contar valores para cada chave
    const facets: Record<string, Map<string, number>> = {};
    for (const key of allKeys) {
      facets[key] = new Map();
    }

    for (const item of items) {
      if (!item.attributes) continue;
      
      for (const key of allKeys) {
        const value = item.attributes[key];
        if (value === null || value === undefined) continue;
        
        const values = Array.isArray(value) ? value : [value];
        for (const v of values) {
          const strVal = String(v).trim();
          if (strVal) {
            facets[key].set(strVal, (facets[key].get(strVal) || 0) + 1);
          }
        }
      }
    }

    // Converter para formato final
    const result: Record<string, Array<{ value: string; count: number }>> = {};
    for (const [key, countMap] of Object.entries(facets)) {
      const sorted = Array.from(countMap.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
      
      if (sorted.length > 0) {
        result[key] = sorted;
      }
    }

    return result;
  }
}
