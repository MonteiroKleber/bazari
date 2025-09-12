// path: apps/web/src/hooks/useSearch.ts

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
  categoryPath: string[];
  attributes: Record<string, any>;
  media: Array<{ url: string; mime: string }>;
}

export interface SearchResult {
  items: SearchItem[];
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

export function useSearch(initialFilters: SearchFilters = {}) {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (newFilters?: SearchFilters) => {
    const searchFilters = newFilters || filters;
    setLoading(true);
    setError(null);

    try {
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

      const response = await fetch(`${API_BASE_URL}/search?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

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

  return {
    filters,
    results,
    loading,
    error,
    search,
    updateFilters,
    clearFilters
  };
}