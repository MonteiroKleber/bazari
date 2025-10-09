import { useState, useEffect, useCallback, useRef } from 'react';
import { getPublicJSON } from '@/lib/api';
import type { FilterState } from './useStoreFilters';

export interface CatalogItem {
  id: string;
  title: string;
  kind?: 'product' | 'service';
  description?: string | null;
  priceBzr?: string | number | null;
  coverUrl?: string | null;
  media?: Array<{ url?: string | null }>;
  mediaIds?: Array<string | number>;
  categoryPath?: string[];
}

export interface CatalogPage {
  total: number;
  limit: number;
  offset: number;
}

interface CatalogResponse {
  items?: CatalogItem[];
  page?: CatalogPage;
}

const DEFAULT_LIMIT = 24;

/**
 * Hook para buscar catálogo de produtos/serviços com filtros aplicados
 */
export function useStoreCatalog(storeId: string, filters: FilterState) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<CatalogPage>({
    total: 0,
    limit: DEFAULT_LIMIT,
    offset: 0,
  });

  // Ref para abortar requisições pendentes
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Função de fetch que pode ser chamada manualmente
   */
  const fetchCatalog = useCallback(async () => {
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

      const url = buildSearchUrl(storeId, filters);

      const response = await getPublicJSON<CatalogResponse>(url);

      // Verificar se a requisição não foi cancelada
      if (controller.signal.aborted) {
        return;
      }

      const catalogItems = Array.isArray(response?.items) ? response.items : [];
      const catalogPage = response?.page || {
        total: catalogItems.length,
        limit: DEFAULT_LIMIT,
        offset: 0,
      };

      setItems(catalogItems);
      setPage(catalogPage);
      setError(null);
    } catch (err) {
      // Ignorar erros de requisições canceladas
      if (controller.signal.aborted) {
        return;
      }

      if (err instanceof Error) {
        // Tratar erros específicos
        if (err.message.includes('timeout') || err.message.includes('Request timeout')) {
          setError('A busca demorou muito tempo. Tente novamente.');
        } else if (err.message.includes('404')) {
          setError('Loja não encontrada.');
        } else if (err.message.includes('500')) {
          setError('Erro no servidor. Tente novamente mais tarde.');
        } else {
          setError(err.message || 'Erro ao carregar catálogo.');
        }
      } else {
        setError('Erro desconhecido ao carregar catálogo.');
      }

      setItems([]);
      setPage({ total: 0, limit: DEFAULT_LIMIT, offset: 0 });
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [storeId, filters]);

  /**
   * Buscar catálogo quando storeId ou filtros mudarem
   */
  useEffect(() => {
    // Não buscar se não houver storeId
    if (!storeId) {
      setItems([]);
      setPage({ total: 0, limit: DEFAULT_LIMIT, offset: 0 });
      setLoading(false);
      return;
    }

    fetchCatalog();

    // Cleanup: cancelar requisição ao desmontar ou mudar dependências
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchCatalog, storeId]);

  return {
    items,
    loading,
    error,
    page,
    refetch: fetchCatalog,
  };
}

/**
 * Constrói URL de busca com todos os filtros aplicados
 */
function buildSearchUrl(storeId: string, filters: FilterState): string {
  const params = new URLSearchParams();

  // Store ID (obrigatório)
  params.set('onChainStoreId', storeId);

  // Busca textual
  if (filters.q) {
    params.set('q', filters.q);
  }

  // Tipo de item
  if (filters.kind && filters.kind !== 'all') {
    params.set('kind', filters.kind);
  }

  // Categorias
  if (filters.categoryPath.length > 0) {
    params.set('categoryPath', filters.categoryPath.join(','));
  }

  // Preço mínimo
  if (filters.priceMin) {
    params.set('priceMin', filters.priceMin);
  }

  // Preço máximo
  if (filters.priceMax) {
    params.set('priceMax', filters.priceMax);
  }

  // Atributos
  Object.entries(filters.attrs).forEach(([key, values]) => {
    if (values.length > 0) {
      params.set(`attrs[${key}]`, values.join(','));
    }
  });

  // Ordenação
  if (filters.sort) {
    params.set('sort', filters.sort);
  }

  // Paginação
  params.set('limit', String(DEFAULT_LIMIT));
  const offset = (filters.page - 1) * DEFAULT_LIMIT;
  if (offset > 0) {
    params.set('offset', String(offset));
  }

  return `/search?${params.toString()}`;
}
