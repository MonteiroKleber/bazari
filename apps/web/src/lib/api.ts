// V-3: API functions com searchProducts e tipos - 2025-09-11
// Uses apiFetch with correct port 3000, no direct fetch
// path: apps/web/src/lib/api.ts

import { API_BASE_URL } from './config';

// Tipos para busca
export type FacetOption = { 
  value: string; 
  count: number;
};

export type Facets = { 
  attributes?: Record<string, { 
    options: FacetOption[] 
  }> 
};

export type ProductSummary = { 
  id: string; 
  title: string; 
  priceBzr: string | number; 
  thumbnailUrl?: string | null; 
  categoryPath?: string[];
};

export type SearchResponse = { 
  items: ProductSummary[]; 
  total: number; 
  page: number; 
  limit: number; 
  facets?: Facets;
};

export type SearchParams = {
  q?: string;
  kind?: 'product' | 'service';
  categoryId?: string;
  categoryPath?: string[];
  priceMin?: number;
  priceMax?: number;
  page?: number;
  limit?: number;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest';
  attributes?: Record<string, string | string[]>;
};

// Função base para fazer requests
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Para CORS com cookies
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Função para buscar produtos
export async function searchProducts(params: SearchParams): Promise<SearchResponse> {
  const searchParams = new URLSearchParams();

  // Parâmetros básicos
  if (params.q) searchParams.append('q', params.q);
  if (params.kind) searchParams.append('kind', params.kind);
  if (params.categoryId) searchParams.append('categoryId', params.categoryId);
  
  // Category path array
  if (params.categoryPath?.length) {
    params.categoryPath.forEach(path => {
      searchParams.append('categoryPath[]', path);
    });
  }
  
  // Preços
  if (params.priceMin !== undefined) searchParams.append('priceMin', params.priceMin.toString());
  if (params.priceMax !== undefined) searchParams.append('priceMax', params.priceMax.toString());
  
  // Paginação
  if (params.page) searchParams.append('page', params.page.toString());
  if (params.limit) searchParams.append('limit', params.limit.toString());
  
  // Ordenação
  if (params.sort) searchParams.append('sort', params.sort);
  
  // Atributos dinâmicos
  if (params.attributes) {
    Object.entries(params.attributes).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(`attr[${key}]`, v));
      } else {
        searchParams.append(`attr[${key}]`, value);
      }
    });
  }

  const endpoint = `/products?${searchParams.toString()}`;
  return apiFetch<SearchResponse>(endpoint);
}

// Re-export config
export { API_BASE_URL } from './config';