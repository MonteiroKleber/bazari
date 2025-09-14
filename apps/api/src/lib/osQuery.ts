// V-3 (2025-09-14): Facets de categoria hierárquicas + prefix em category_path.kw
// - Filtro de categoria usa category_path.kw com prefix para match exato
// - Facets agregam category_path.kw e constroem hierarquia no Node
// - Mantém contrato: { items, page:{limit,offset,total}, facets{categories,attributes} }
// - Se indexHints vier vazio, faz fallback para chaves de `attrs` (ignorando `_indexFields`)

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

  if (filters.kind && filters.kind !== 'all') {
    filter.push({ term: { kind: filters.kind } });
  }

  if (filters.categoryPath?.length) {
    const path = filters.categoryPath.join('/');
    // Usar category_path.kw com prefix para match hierárquico
    filter.push({ prefix: { 'category_path.kw': path } });
  }

  if (filters.attrs) {
    for (const [k,v] of Object.entries(filters.attrs)) {
      const values = Array.isArray(v) ? v : [v];
      filter.push({ terms: { [`attrs.${k}`]: values } });
    }
  }

  if (filters.priceMin != null || filters.priceMax != null) {
    const range: any = {}
    if (filters.priceMin != null) range.gte = filters.priceMin;
    if (filters.priceMax != null) range.lte = filters.priceMax;
    filter.push({ range: { price: range } });
  }

  return { must, filter };
}

/** Amostra chaves de atributos facetáveis.
 *  Preferência: indexHints[k] === true; Fallback: chaves reais de attrs (exceto `_indexFields`).
 */
async function sampleAttributeKeys(baseQuery: any): Promise<string[]> {
  const res = await osClient!.search({
    index: indexName,
    body: {
      query: baseQuery,
      size: 50,                   // amostra pequena
      _source: ['indexHints','attrs']
    }
  } as any);

  const keys = new Set<string>();
  for (const h of res.body.hits.hits) {
    const src = h._source || {};
    const ih = src.indexHints || {};
    let added = 0;

    for (const k of Object.keys(ih)) {
      if (ih[k]) { keys.add(k); added++; }
    }

    // fallback: attrs.* (ignora `_indexFields`)
    if (added === 0) {
      const attrs = (src.attrs || {}) as Record<string, unknown>;
      for (const k of Object.keys(attrs)) {
        if (k === '_indexFields') continue;
        keys.add(k);
      }
    }
  }

  // limitar nº de facetas por custo
  return Array.from(keys).slice(0, 24);
}

export async function osSearch(filters: Filters) {
  const size = Math.max(1, Math.min(filters.limit ?? 20, 100));
  const from = Math.max(0, filters.offset ?? 0);

  const { must, filter } = buildQuery(filters);

  let sort: any = ['_score'];
  switch (filters.sort) {
    case 'price_asc': sort = [{ price: 'asc' }]; break;
    case 'price_desc': sort = [{ price: 'desc' }]; break;
    case 'newest': sort = [{ createdAt: 'desc' }]; break;
  }

  const baseQuery = { bool: { must, filter } };

  // 1) Amostra para decidir quais atributos facetar
  const attrKeys = await sampleAttributeKeys(baseQuery);

  // 2) Aggregations (categoria hierárquica via category_path.kw + atributos dinâmicos)
  const aggs: any = {
    cat_paths: { terms: { field: 'category_path.kw', size: 200 } }
  };
  for (const k of attrKeys) {
    aggs[`attr__${k}`] = { terms: { field: `attrs.${k}`, size: 30 } };
  }

  // 3) Buscar com facets + hits paginados
  const res = await osClient!.search({
    index: indexName,
    body: {
      query: baseQuery,
      sort, from, size,
      aggs
    }
  } as any);

  const hits = res.body.hits.hits || [];
  const total = res.body.hits.total?.value ?? res.body.hits.total ?? 0;
  const items = hits.map((h: any) => ({ ...h._source, id: h._source.id }));

  // mapear facets
  const facets: any = { categories: [], attributes: {} };

  // Construir facetas hierárquicas no Node
  const buckets = res.body.aggregations?.cat_paths?.buckets ?? [];
  const counts = new Map<string, number>();
  
  for (const b of buckets) {
    const full = String(b.key);
    const parts = full.split('/').filter(Boolean);
    
    // Limitar profundidade a 4, como no Postgres
    for (let i = 1; i <= Math.min(parts.length, 4); i++) {
      const k = parts.slice(0, i).join('/');
      counts.set(k, (counts.get(k) || 0) + b.doc_count);
    }
  }
  
  // Converter para formato de resposta e limitar a 30 categorias
  const cats = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([k, c]) => ({ path: k.split('/'), count: c }));
  
  facets.categories = cats;

  // Atributos
  for (const k of attrKeys) {
    const b = res.body.aggregations?.[`attr__${k}`]?.buckets ?? [];
    facets.attributes[k] = b.map((x: any) => ({ value: String(x.key), count: x.doc_count }));
  }

  return {
    items,
    page: { limit: size, offset: from, total },
    facets
  };
}