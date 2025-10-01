// V-9 (2025-09-18): Adiciona facet de preço baseada em priceBzr no OpenSearch
// V-8 (2025-09-18): Usa priceBzr em filtros e ordenação de preço
// V-7 (2025-09-18): Normaliza total e buckets de aggregations para tipos dinâmicos
// V-6 (2025-09-14): OpenSearch Query CORRIGIDO - priceBzr numérico
// NÃO converter preço para string
// path: apps/api/src/lib/osQuery.ts

import { osClient } from './opensearch';
import { indexName } from './opensearchIndex';

type Filters = {
  q?: string;
  kind?: 'product'|'service'|'all';
  categoryPath?: string[];
  attrs?: Record<string, string|string[]>;
  priceMin?: number;
  priceMax?: number;
  sort?: 'relevance'|'price_asc'|'price_desc'|'newest';
  limit?: number;
  offset?: number;
  storeId?: string;
  storeSlug?: string;
  onChainStoreId?: string; // Filtro por ID da store on-chain
};

/** Monta cláusulas must/filter a partir dos filtros atuais. */
function buildQuery(filters: Filters) {
  const must: any[] = [];
  const filter: any[] = [];

  // Busca textual
  if (filters.q) {
    must.push({
      multi_match: {
        query: filters.q,
        type: 'best_fields',
        fields: ['title^3','title.kw^8','description'],
        fuzziness: 'AUTO'
      }
    });
  }

  // Filtro de kind - só aplica se NÃO for 'all' ou não especificado
  // Padrão é 'all' = não filtra
  if (filters.kind && filters.kind !== 'all') {
    filter.push({ term: { kind: filters.kind } });
  }

  // Filtro de categoria
  if (filters.categoryPath?.length) {
    const path = filters.categoryPath.join('/');
    filter.push({ prefix: { 'category_path.kw': path } });
  }

  // Filtro por loja (storeId, slug ou onChainStoreId)
  if (filters.storeId || filters.storeSlug || filters.onChainStoreId) {
    const storeClauses: any[] = [];
    if (filters.storeId) {
      storeClauses.push({ term: { sellerStoreId: filters.storeId } });
    }
    if (filters.storeSlug) {
      storeClauses.push({ term: { storeSlug: filters.storeSlug } });
    }
    if (filters.onChainStoreId) {
      storeClauses.push({ term: { onChainStoreId: filters.onChainStoreId } });
    }

    if (storeClauses.length === 1) {
      filter.push(storeClauses[0]);
    } else if (storeClauses.length > 1) {
      filter.push({ bool: { should: storeClauses, minimum_should_match: 1 } });
    }
  }

  // Filtro de atributos - MANTIDO como estava
  if (filters.attrs) {
    for (const [k,v] of Object.entries(filters.attrs)) {
      const values = Array.isArray(v) ? v : [v];
      filter.push({ terms: { [`attrs.${k}`]: values } });
    }
  }

  // Filtro de preço
  if (filters.priceMin != null || filters.priceMax != null) {
    const range: any = {};
    if (filters.priceMin != null) range.gte = filters.priceMin;
    if (filters.priceMax != null) range.lte = filters.priceMax;
    filter.push({ range: { priceBzr: range } });
  }

  return { must, filter };
}

/** Amostra chaves de atributos facetáveis. */
async function sampleAttributeKeys(baseQuery: any): Promise<string[]> {
  const res = await osClient!.search({
    index: indexName,
    body: {
      query: baseQuery,
      size: 50,
      _source: ['indexHints','attrs']
    }
  } as any);

  const keys = new Set<string>();
  for (const h of res.body.hits.hits) {
    const src = h._source || {};
    const ih = src.indexHints || {};
    let added = 0;

    // Priorizar indexHints
    for (const k of Object.keys(ih)) {
      if (ih[k]) {
        keys.add(k);
        added++;
      }
    }

    // Fallback: attrs (ignorando _indexFields)
    if (added === 0) {
      const attrs = (src.attrs || {}) as Record<string, unknown>;
      for (const k of Object.keys(attrs)) {
        if (k !== '_indexFields') {
          keys.add(k);
        }
      }
    }
  }

  // Limitar número de facetas
  return Array.from(keys).slice(0, 24);
}

export async function osSearch(filters: Filters) {
  const size = Math.max(1, Math.min(filters.limit ?? 20, 100));
  const from = Math.max(0, filters.offset ?? 0);

  const { must, filter } = buildQuery(filters);

  // Ordenação padronizada
  let sort: any[] = [];
  
  switch (filters.sort) {
    case 'price_asc':
      sort = [{ priceBzr: 'asc' }, { id: 'asc' }];
      break;
    case 'price_desc':
      sort = [{ priceBzr: 'desc' }, { id: 'asc' }];
      break;
    case 'newest':
      sort = [{ createdAt: 'desc' }, { id: 'asc' }];
      break;
    case 'relevance':
    default:
      if (filters.q) {
        // Com busca: _score DESC, createdAt DESC, id ASC
        sort = ['_score', { createdAt: 'desc' }, { id: 'asc' }];
      } else {
        // Sem busca: createdAt DESC, id ASC
        sort = [{ createdAt: 'desc' }, { id: 'asc' }];
      }
      break;
  }

  const baseQuery = { bool: { must, filter } };

  // 1) Amostra para decidir quais atributos facetar
  const attrKeys = await sampleAttributeKeys(baseQuery);

  // 2) Aggregations
  const priceRanges = [
    { key: '0-10', to: 10 },
    { key: '10-50', from: 10, to: 50 },
    { key: '50-100', from: 50, to: 100 },
    { key: '100-500', from: 100, to: 500 },
    { key: '500-1000', from: 500, to: 1000 },
    { key: '1000+', from: 1000 }
  ];

  const aggs: any = {
    cat_paths: { 
      terms: { 
        field: 'category_path.kw', 
        size: 200 
      } 
    },
    price_stats: {
      stats: { field: 'priceBzr' }
    },
    price_ranges: {
      range: {
        field: 'priceBzr',
        ranges: priceRanges.map(r => ({ ...r }))
      }
    }
  };
  
  // MANTIDO: facets de atributos
  for (const k of attrKeys) {
    aggs[`attr__${k}`] = { 
      terms: { 
        field: `attrs.${k}`, 
        size: 30 
      } 
    };
  }

  // 3) Executar busca
  const res = await osClient!.search({
    index: indexName,
    body: {
      query: baseQuery,
      sort,
      from,
      size,
      aggs
    }
  } as any);

  const body: any = res.body ?? {};
  const hits = Array.isArray(body?.hits?.hits) ? body.hits.hits : [];
  const totalAny: any = body?.hits?.total;
  const total: number = typeof totalAny === 'number' ? totalAny : (totalAny?.value ?? 0);
  
  // Mapear items mantendo todos os campos
  const items = hits.map((h: any) => {
    const source = h._source || {};
    
    // CORREÇÃO CRÍTICA: NÃO converter priceBzr para string
    // Priorizar priceBzr do _source, fallback para price
    const priceBzrValue = (typeof source.priceBzr === 'number') 
      ? source.priceBzr 
      : (typeof source.price === 'number' ? source.price : undefined);
    
    return {
      ...source, // Preservar todos os campos do _source
      id: source.id,
      kind: source.kind,
      title: source.title,
      description: source.description,
      price: source.price,
      priceBzr: priceBzrValue, // CORRIGIDO: sempre numérico ou undefined
      categoryPath: source.category_slugs || source.category_path?.split('/').filter(Boolean) || [],
      category_slugs: source.category_slugs,
      category_path: source.category_path,
      attributes: source.attrs || {}, // MANTIDO: atributos do documento
      attrs: source.attrs || {}, // MANTIDO: compatibilidade
      media: source.media || [],
      createdAt: source.createdAt
    };
  });

  // Processar facets
  const facets: any = { 
    categories: [], 
    attributes: {},
    price: { min: '0', max: '0', buckets: [] } 
  };

  // Facetas de categoria hierárquicas - MANTIDO
  const catAggAny: any = body?.aggregations?.cat_paths;
  const buckets = Array.isArray(catAggAny?.buckets) ? catAggAny.buckets : [];
  const counts = new Map<string, number>();
  
  for (const b of buckets) {
    const full = String(b.key);
    const parts = full.split('/').filter(Boolean);
    
    // Hierarquia até 4 níveis
    for (let i = 1; i <= Math.min(parts.length, 4); i++) {
      const k = parts.slice(0, i).join('/');
      counts.set(k, (counts.get(k) || 0) + b.doc_count);
    }
  }
  
  // Ordenar: count DESC, path ASC, limite 30
  facets.categories = Array.from(counts.entries())
    .map(([k, c]) => ({ 
      path: k.split('/'), 
      count: c 
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.path.join('/').localeCompare(b.path.join('/'));
    })
    .slice(0, 30);

  // Facetas de atributos - MANTIDO: mapeamento correto
  for (const k of attrKeys) {
    const aggBuckets: any = body?.aggregations?.[`attr__${k}`];
    const b = Array.isArray(aggBuckets?.buckets) ? aggBuckets.buckets : [];
    if (b.length > 0) {
      facets.attributes[k] = b.map((x: any) => ({ 
        value: String(x.key), 
        count: x.doc_count 
      }));
    }
  }

  const priceStats: any = body?.aggregations?.price_stats;
  const priceBuckets: any[] = body?.aggregations?.price_ranges?.buckets ?? [];
  if (priceStats && typeof priceStats.count === 'number' && priceStats.count > 0) {
    const minVal = (Number.isFinite(priceStats.min) ? priceStats.min : 0) as number;
    const maxVal = (Number.isFinite(priceStats.max) ? priceStats.max : 0) as number;
    const buckets = priceRanges.map(range => {
      const bucket = priceBuckets.find((b: any) => b.key === range.key);
      const count = bucket ? bucket.doc_count : 0;
      return { range: range.key, count };
    }).filter(b => b.count > 0);
    facets.price = {
      min: minVal === Infinity ? '0' : minVal.toString(),
      max: maxVal === -Infinity ? '0' : maxVal.toString(),
      buckets
    };
  } else {
    facets.price = { min: '0', max: '0', buckets: [] };
  }

  return {
    items,
    page: { 
      limit: size, 
      offset: from, 
      total 
    },
    facets
  };
}
