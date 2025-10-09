import { useState, useEffect, useCallback, useRef } from 'react';
import { getPublicJSON } from '@/lib/api';
import type { FilterState } from './useStoreFilters';

export interface CategoryFacet {
  path: string[];
  count: number;
}

export interface PriceRange {
  min: string;
  max: string;
}

export interface PriceBucket {
  range: string;
  count: number;
}

export interface AttributeValue {
  value: string;
  count: number;
}

interface FacetsResponse {
  facets?: {
    categories?: CategoryFacet[];
    price?: {
      min?: string;
      max?: string;
      buckets?: PriceBucket[];
    };
    attributes?: Record<string, AttributeValue[]>;
  };
}

const DEFAULT_LIMIT = 1; // Só precisamos dos facets, não dos items

/**
 * Hook para carregar facets/agregações do catálogo
 *
 * LÓGICA ESPECIAL:
 * - Ao buscar facets de categoria, exclui filtro de categoria
 * - Ao buscar facets de preço, exclui filtro de preço
 * - Permite ver "o que mais está disponível" sem o filtro ativo interferir
 */
export function useStoreFacets(storeId: string, filters: FilterState) {
  const [categories, setCategories] = useState<CategoryFacet[]>([]);
  const [priceRange, setPriceRange] = useState<PriceRange>({ min: '0', max: '0' });
  const [priceBuckets, setPriceBuckets] = useState<PriceBucket[]>([]);
  const [attributes, setAttributes] = useState<Record<string, AttributeValue[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ref para abortar requisições pendentes
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Busca facets com filtros modificados (excluindo o próprio facet)
   */
  const fetchFacets = useCallback(async () => {
    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Criar novo AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setError(null);

      // Criar filtros modificados (excluir categoryPath e price para não interferir nos facets)
      const modifiedFilters: FilterState = {
        ...filters,
        categoryPath: [], // Excluir para mostrar todas categorias disponíveis
        priceMin: '',     // Excluir para mostrar range completo
        priceMax: '',     // Excluir para mostrar range completo
      };

      const url = buildFacetsUrl(storeId, modifiedFilters);

      const response = await getPublicJSON<FacetsResponse>(url);

      // Verificar se a requisição não foi cancelada
      if (controller.signal.aborted) {
        return;
      }

      // Extrair facets
      const facets = response?.facets || {};

      setCategories(facets.categories || []);
      setPriceRange({
        min: facets.price?.min || '0',
        max: facets.price?.max || '0',
      });
      setPriceBuckets(facets.price?.buckets || []);
      setAttributes(facets.attributes || {});
      setError(null);
    } catch (err) {
      // Ignorar erros de requisições canceladas
      if (controller.signal.aborted) {
        return;
      }

      if (err instanceof Error) {
        setError(err.message || 'Erro ao carregar facets.');
      } else {
        setError('Erro desconhecido ao carregar facets.');
      }

      // Limpar facets em caso de erro
      setCategories([]);
      setPriceRange({ min: '0', max: '0' });
      setPriceBuckets([]);
      setAttributes({});
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [storeId, filters]);

  /**
   * Buscar facets quando storeId ou filtros mudarem
   */
  useEffect(() => {
    // Não buscar se não houver storeId
    if (!storeId) {
      setCategories([]);
      setPriceRange({ min: '0', max: '0' });
      setPriceBuckets([]);
      setAttributes({});
      setLoading(false);
      return;
    }

    fetchFacets();

    // Cleanup: cancelar requisição ao desmontar ou mudar dependências
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchFacets, storeId]);

  return {
    categories,
    priceRange,
    priceBuckets,
    attributes,
    loading,
    error,
  };
}

/**
 * Constrói URL de busca para facets
 * Similar ao buildSearchUrl do useStoreCatalog, mas:
 * - Usa limit=1 (só precisamos dos facets)
 * - Exclui categoryPath e price (lógica especial)
 */
function buildFacetsUrl(storeId: string, filters: FilterState): string {
  const params = new URLSearchParams();

  // Store ID (obrigatório)
  params.set('onChainStoreId', storeId);

  // Busca textual (manter para filtrar facets relevantes)
  if (filters.q) {
    params.set('q', filters.q);
  }

  // Tipo de item (manter para filtrar facets por tipo)
  if (filters.kind && filters.kind !== 'all') {
    params.set('kind', filters.kind);
  }

  // NÃO incluir categoryPath - queremos ver todas categorias
  // NÃO incluir priceMin/priceMax - queremos ver range completo

  // Atributos (manter para filtrar facets)
  Object.entries(filters.attrs).forEach(([key, values]) => {
    if (values.length > 0) {
      params.set(`attrs[${key}]`, values.join(','));
    }
  });

  // Limit mínimo (só precisamos dos facets, não dos items)
  params.set('limit', String(DEFAULT_LIMIT));

  return `/search?${params.toString()}`;
}
