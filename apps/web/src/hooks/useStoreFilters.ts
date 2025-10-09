import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface FilterState {
  q: string;
  kind: 'all' | 'product' | 'service';
  categoryPath: string[];
  priceMin: string;
  priceMax: string;
  attrs: Record<string, string[]>;
  sort: 'relevance' | 'priceAsc' | 'priceDesc' | 'createdDesc';
  page: number;
}

const DEFAULT_FILTERS: FilterState = {
  q: '',
  kind: 'all',
  categoryPath: [],
  priceMin: '',
  priceMax: '',
  attrs: {},
  sort: 'relevance',
  page: 1,
};

/**
 * Hook para gerenciar estado de filtros com sincronização de URL
 */
export function useStoreFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(() => parseFiltersFromUrl(searchParams));

  // Ref para debounce do campo de busca
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // Parsear filtros da URL ao montar
  useEffect(() => {
    if (isInitialMount.current) {
      const urlFilters = parseFiltersFromUrl(searchParams);
      setFilters(urlFilters);
      isInitialMount.current = false;
    }
  }, []);

  // Sincronizar URL quando filtros mudarem (exceto na montagem inicial)
  useEffect(() => {
    if (isInitialMount.current) {
      return;
    }

    const params = new URLSearchParams();

    // Busca textual
    if (filters.q) {
      params.set('q', filters.q);
    }

    // Tipo de item
    if (filters.kind !== 'all') {
      params.set('kind', filters.kind);
    }

    // Categorias
    if (filters.categoryPath.length > 0) {
      params.set('categoryPath', filters.categoryPath.join(','));
    }

    // Preço
    if (filters.priceMin) {
      params.set('priceMin', filters.priceMin);
    }
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
    if (filters.sort !== 'relevance') {
      params.set('sort', filters.sort);
    }

    // Página
    if (filters.page > 1) {
      params.set('page', String(filters.page));
    }

    // Atualizar URL sem reload (preserva histórico)
    setSearchParams(params, { replace: false });
  }, [filters, setSearchParams]);

  /**
   * Atualiza um filtro específico
   */
  const updateFilter = useCallback((key: keyof FilterState, value: any) => {
    // Se for busca textual, aplicar debounce
    if (key === 'q') {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        setFilters((prev) => ({
          ...prev,
          q: value as string,
          page: 1, // Resetar página ao buscar
        }));
      }, 500);
    } else {
      // Para outros filtros, atualizar imediatamente
      setFilters((prev) => ({
        ...prev,
        [key]: value,
        // Resetar página ao mudar qualquer filtro (exceto ordenação e página)
        page: key === 'sort' || key === 'page' ? prev.page : 1,
      }));
    }
  }, []);

  /**
   * Limpa um filtro específico
   */
  const clearFilter = useCallback((key: keyof FilterState) => {
    setFilters((prev) => {
      const newFilters = { ...prev };

      switch (key) {
        case 'q':
          newFilters.q = '';
          break;
        case 'kind':
          newFilters.kind = 'all';
          break;
        case 'categoryPath':
          newFilters.categoryPath = [];
          break;
        case 'priceMin':
          newFilters.priceMin = '';
          break;
        case 'priceMax':
          newFilters.priceMax = '';
          break;
        case 'attrs':
          newFilters.attrs = {};
          break;
        case 'sort':
          newFilters.sort = 'relevance';
          break;
        case 'page':
          newFilters.page = 1;
          break;
      }

      // Resetar página ao limpar filtro
      newFilters.page = 1;

      return newFilters;
    });
  }, []);

  /**
   * Limpa todos os filtros
   */
  const clearAllFilters = useCallback(() => {
    // Limpar debounce pendente
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setFilters(DEFAULT_FILTERS);
  }, []);

  /**
   * Verifica se há filtros ativos
   */
  const hasActiveFilters = useMemo(() => {
    return (
      filters.q !== '' ||
      filters.kind !== 'all' ||
      filters.categoryPath.length > 0 ||
      filters.priceMin !== '' ||
      filters.priceMax !== '' ||
      Object.keys(filters.attrs).length > 0
    );
  }, [filters]);

  /**
   * Conta quantos filtros estão ativos
   */
  const activeFiltersCount = useMemo(() => {
    let count = 0;

    if (filters.q) count++;
    if (filters.kind !== 'all') count++;
    if (filters.categoryPath.length > 0) count += filters.categoryPath.length;
    if (filters.priceMin || filters.priceMax) count++;
    count += Object.values(filters.attrs).flat().length;

    return count;
  }, [filters]);

  // Cleanup: limpar timer ao desmontar
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    filters,
    updateFilter,
    clearFilter,
    clearAllFilters,
    hasActiveFilters,
    activeFiltersCount,
  };
}

/**
 * Parseia filtros da URL
 */
function parseFiltersFromUrl(searchParams: URLSearchParams): FilterState {
  const filters: FilterState = { ...DEFAULT_FILTERS };

  // Busca textual
  const q = searchParams.get('q');
  if (q) {
    filters.q = q;
  }

  // Tipo
  const kind = searchParams.get('kind');
  if (kind === 'product' || kind === 'service') {
    filters.kind = kind;
  }

  // Categorias
  const categoryPath = searchParams.get('categoryPath');
  if (categoryPath) {
    filters.categoryPath = categoryPath.split(',').filter(Boolean);
  }

  // Preço
  const priceMin = searchParams.get('priceMin');
  const priceMax = searchParams.get('priceMax');
  if (priceMin) {
    filters.priceMin = priceMin;
  }
  if (priceMax) {
    filters.priceMax = priceMax;
  }

  // Atributos
  const attrs: Record<string, string[]> = {};
  searchParams.forEach((value, key) => {
    const match = key.match(/^attrs\[(.+)\]$/);
    if (match) {
      const attrKey = match[1];
      attrs[attrKey] = value.split(',').filter(Boolean);
    }
  });
  filters.attrs = attrs;

  // Ordenação
  const sort = searchParams.get('sort');
  if (
    sort === 'relevance' ||
    sort === 'priceAsc' ||
    sort === 'priceDesc' ||
    sort === 'createdDesc'
  ) {
    filters.sort = sort;
  }

  // Página
  const page = searchParams.get('page');
  if (page) {
    const pageNum = parseInt(page, 10);
    if (!isNaN(pageNum) && pageNum > 0) {
      filters.page = pageNum;
    }
  }

  return filters;
}
