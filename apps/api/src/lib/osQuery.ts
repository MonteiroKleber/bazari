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
    filter.push({ range: { price: range } });
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
      sort = [{ price: 'asc' }, { id: 'asc' }];
      break;
    case 'price_desc':
      sort = [{ price: 'desc' }, { id: 'asc' }];
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
  const aggs: any = {
    cat_paths: { 
      terms: { 
        field: 'category_path.kw', 
        size: 200 
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

  const hits = res.body.hits.hits || [];
  const total = res.body.hits.total?.value ?? res.body.hits.total ?? 0;
  
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
    attributes: {} 
  };

  // Facetas de categoria hierárquicas - MANTIDO
  const buckets = res.body.aggregations?.cat_paths?.buckets ?? [];
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
    const b = res.body.aggregations?.[`attr__${k}`]?.buckets ?? [];
    if (b.length > 0) {
      facets.attributes[k] = b.map((x: any) => ({ 
        value: String(x.key), 
        count: x.doc_count 
      }));
    }
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