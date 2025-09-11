// V+1: Adaptado para usar GET /products quando disponível - 2025-09-11
// Mantém compatibilidade com endpoint /search existente
// Prioriza /products para melhor performance quando filtros são simples

import { useState, useCallback, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export interface SearchFilters {
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

export interface SearchItem {
  id: string;
  kind: 'product' | 'service';
  title: string;
  description?: string;
  priceBzr?: string;
  basePriceBzr?: string;
  categoryPath: string[];
  attributes: Record<string, any>;
  media: Array<{ 
    id: string;
    url: string; 
    mime: string;
    size: number;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface SearchResult {
  items: SearchItem[];
  page: {
    limit: number;
    offset: number;
    total: number;
  };
  facets?: {
    categories: Array<{ path: string[]; count: number }>;
    price: {
      min: string;
      max: string;
      buckets: Array<{ range: string; count: number }>;
    };
    attributes: Record<string, Array<{ value: string; count: number }>>;
  };
}

export function useSearch(initialFilters: SearchFilters = {}) {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Decidir qual endpoint usar baseado nos filtros
  const shouldUseProductsEndpoint = useCallback((searchFilters: SearchFilters) => {
    // Usar /products quando:
    // 1. kind é 'product' ou não especificado (all)
    // 2. Não há filtros de atributos complexos
    // 3. Filtros são simples (q, categoryPath, preço, sort)
    
    const hasComplexFilters = searchFilters.attrs && Object.keys(searchFilters.attrs).length > 0;
    const isProductSearch = !searchFilters.kind || searchFilters.kind === 'product' || searchFilters.kind === 'all';
    
    return isProductSearch && !hasComplexFilters;
  }, []);

  const search = useCallback(async (newFilters?: SearchFilters) => {
    const searchFilters = newFilters || filters;
    setLoading(true);
    setError(null);

    try {
      let endpoint: string;
      let url: string;

      if (shouldUseProductsEndpoint(searchFilters)) {
        // Usar novo endpoint /products
        endpoint = '/products';
        
        const params = new URLSearchParams();
        
        // Parâmetros simples
        if (searchFilters.q) params.append('q', searchFilters.q);
        if (searchFilters.priceMin) params.append('minPrice', searchFilters.priceMin);
        if (searchFilters.priceMax) params.append('maxPrice', searchFilters.priceMax);
        if (searchFilters.sort) params.append('sort', searchFilters.sort);
        
        // Paginação
        const page = Math.floor((searchFilters.offset || 0) / (searchFilters.limit || 20)) + 1;
        const pageSize = searchFilters.limit || 20;
        params.append('page', page.toString());
        params.append('pageSize', pageSize.toString());
        
        // Categoria - usar o último nível se categoryPath fornecido
        if (searchFilters.categoryPath && searchFilters.categoryPath.length > 0) {
          const lastCategory = searchFilters.categoryPath[searchFilters.categoryPath.length - 1];
          params.append('categoryId', lastCategory);
        }
        
        url = `${API_BASE_URL}${endpoint}?${params.toString()}`;
        
      } else {
        // Usar endpoint /search existente para filtros complexos
        endpoint = '/search';
        
        const params = new URLSearchParams();
        
        // Adicionar parâmetros básicos
        if (searchFilters.q) params.append('q', searchFilters.q);
        if (searchFilters.kind) params.append('kind', searchFilters.kind);
        if (searchFilters.priceMin) params.append('priceMin', searchFilters.priceMin);
        if (searchFilters.priceMax) params.append('priceMax', searchFilters.priceMax);
        if (searchFilters.limit) params.append('limit', searchFilters.limit.toString());
        if (searchFilters.offset) params.append('offset', searchFilters.offset.toString());
        if (searchFilters.sort) params.append('sort', searchFilters.sort);
        
        // Adicionar categoryPath
        if (searchFilters.categoryPath) {
          searchFilters.categoryPath.forEach(path => {
            params.append('categoryPath', path);
          });
        }
        
        // Adicionar atributos
        if (searchFilters.attrs) {
          Object.entries(searchFilters.attrs).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              value.forEach(v => params.append(`attrs.${key}`, v));
            } else {
              params.append(`attrs.${key}`, value);
            }
          });
        }
        
        url = `${API_BASE_URL}${endpoint}?${params.toString()}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`${endpoint} failed with status ${response.status}`);
      }

      const data = await response.json();
      
      // Normalizar resposta para formato consistente
      let normalizedResult: SearchResult;
      
      if (endpoint === '/products') {
        // Converter resposta de /products para formato SearchResult
        normalizedResult = {
          items: data.items || [],
          page: {
            limit: data.page.size,
            offset: (data.page.current - 1) * data.page.size,
            total: data.page.total,
          },
          // /products não retorna facetas complexas
          facets: {
            categories: [],
            price: { min: '0', max: '0', buckets: [] },
            attributes: {},
          },
        };
      } else {
        // Resposta de /search já está no formato correto
        normalizedResult = data;
      }
      
      setResults(normalizedResult);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Erro na busca');
    } finally {
      setLoading(false);
    }
  }, [filters, shouldUseProductsEndpoint]);

  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      search();
    }
  }, []);

  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    search(updated);
  }, [filters, search]);

  const clearFilters = useCallback(() => {
    setFilters({});
    setResults(null);
  }, []);

  const handlePageChange = useCallback((newOffset: number) => {
    updateFilters({ offset: newOffset });
  }, [updateFilters]);

  return {
    filters,
    results,
    loading,
    error,
    search,
    updateFilters,
    clearFilters,
    handlePageChange,
  };
}