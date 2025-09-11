// V-5 (2025-09-11): Aplica a mesma estratégia de tradução nas breadcrumbs dos cards (sem alterar layout/componentes).
// Base: V-4 (memoização, índices múltiplos e fallback humanizado para categorias).

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useSearch } from '../hooks/useSearch';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Alert, AlertDescription } from '../components/ui/alert';

// Hook para carregar categorias com tradução
import { useCategories } from '../hooks/useCategories';

export function SearchPage() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  const {
    filters,
    results,
    loading,
    error,
    updateFilters,
    clearFilters
  } = useSearch({
    q: searchParams.get('q') || undefined,
    kind: (searchParams.get('kind') as any) || 'all',
    limit: 20
  });

  // Carregar todas as categorias para tradução
  const { categories } = useCategories();

  // Criar múltiplos índices para mapear categorias - MEMOIZADO
  const categoryIndexes = useMemo(() => {
    const byFullPath = new Map<string, any>();
    const byPathWithoutPrefix = new Map<string, any>();
    const byLastSlug = new Map<string, any>();
    const byPartialPath = new Map<string, any>();
    
    for (const cat of categories || []) {
      // Índice 1: Path completo (ex: "products-tecnologia-eletronicos")
      const fullKey = cat.pathSlugs?.join('-') || '';
      if (fullKey) {
        byFullPath.set(fullKey, cat);
      }
      
      // Índice 2: Path sem prefixo (ex: "tecnologia-eletronicos")
      const withoutPrefix = cat.pathSlugs?.slice(1).join('-') || '';
      if (withoutPrefix) {
        byPathWithoutPrefix.set(withoutPrefix, cat);
      }
      
      // Índice 3: Último slug apenas (ex: "eletronicos")
      const lastSlug = cat.pathSlugs?.[cat.pathSlugs.length - 1] || '';
      if (lastSlug && !byLastSlug.has(lastSlug)) {
        byLastSlug.set(lastSlug, cat);
      }
      
      // Índice 4: Path parcial para categorias incompletas
      // Ex: "alimentos" sozinho ou "casa" sozinho
      if (cat.pathSlugs?.length > 1) {
        const firstSlugAfterPrefix = cat.pathSlugs[1];
        if (firstSlugAfterPrefix && !byPartialPath.has(firstSlugAfterPrefix)) {
          byPartialPath.set(firstSlugAfterPrefix, cat);
        }
      }
    }
    
    return { byFullPath, byPathWithoutPrefix, byLastSlug, byPartialPath };
  }, [categories]);

  // Função auxiliar para humanizar slugs - MEMOIZADA
  const humanize = useCallback((slug: string) =>
    (slug || '')
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase()), []);

  // Obter nome da categoria no idioma correto - MEMOIZADA
  const getCategoryDisplayName = useCallback((category: any) => {
    if (!category) return '';
    
    const lang = (i18n?.language || 'pt').slice(0, 2).toLowerCase();
    
    switch (lang) {
      case 'en':
        return category.nameEn || category.namePt || category.nameEs || '';
      case 'es':
        return category.nameEs || category.namePt || category.nameEn || '';
      default: // pt
        return category.namePt || category.nameEn || category.nameEs || '';
    }
  }, [i18n?.language]);

  // Função robusta para obter label traduzido do facet - MEMOIZADA
  const getFacetLabel = useCallback((path: string[]) => {
    if (!path || !Array.isArray(path) || path.length === 0) {
      return '';
    }
    
    const { byFullPath, byPathWithoutPrefix, byLastSlug, byPartialPath } = categoryIndexes;
    
    // Tentar encontrar a categoria de várias formas
    let category = null;
    
    // 1. Tentar com path completo
    const fullKey = path.join('-');
    category = byFullPath.get(fullKey);
    
    // 2. Se não encontrou e path não tem prefixo, tentar adicionar
    if (!category && !path[0]?.includes('products') && !path[0]?.includes('services')) {
      // Tentar com products
      const withProducts = ['products', ...path].join('-');
      category = byFullPath.get(withProducts);
      
      // Tentar com services
      if (!category) {
        const withServices = ['services', ...path].join('-');
        category = byFullPath.get(withServices);
      }
      
      // Tentar sem prefixo
      if (!category) {
        category = byPathWithoutPrefix.get(fullKey);
      }
    }
    
    // 3. Para paths de um único item (ex: ["alimentos"], ["casa"])
    if (!category && path.length === 1) {
      // Buscar no índice parcial
      category = byPartialPath.get(path[0]);
      
      // Se não encontrou, tentar com products- ou services- prefixado
      if (!category) {
        category = byFullPath.get(`products-${path[0]}`) || 
                  byFullPath.get(`services-${path[0]}`);
      }
    }
    
    // 4. Se ainda não encontrou, tentar pelo último slug
    if (!category) {
      const lastSlug = path[path.length - 1];
      category = byLastSlug.get(lastSlug);
    }
    
    // Retornar nome traduzido ou humanizar o último item
    if (category) {
      return getCategoryDisplayName(category);
    }
    
    // Fallback: humanizar o último item do path
    return humanize(path[path.length - 1] || '');
  }, [categoryIndexes, getCategoryDisplayName, humanize]);

  // >>> NOVO: helper para breadcrumbs — usa a MESMA estratégia do getFacetLabel, mas por nível cumulativo <<<
  const getCrumbLabel = useCallback((fullPath: string[], levelIndex: number) => {
    // levelIndex é o índice do nível que queremos exibir (ex.: 1 = depois do prefixo)
    if (!Array.isArray(fullPath) || fullPath.length === 0) return '';
    const upto = Math.min(levelIndex + 1, fullPath.length);
    return getFacetLabel(fullPath.slice(0, upto));
  }, [getFacetLabel]);

  // Memoizar labels das categorias para evitar recálculos
  const categoryLabels = useMemo(() => {
    if (!results?.facets?.categories) return [];
    
    return results.facets.categories.slice(0, 10).map(cat => ({
      ...cat,
      label: getFacetLabel(cat.path)
    }));
  }, [results?.facets?.categories, getFacetLabel]);

  // Sincronizar com URL
  useEffect(() => {
    const params: Record<string, string> = {};
    if (filters.q) params.q = filters.q;
    if (filters.kind && filters.kind !== 'all') params.kind = filters.kind;
    setSearchParams(params);
  }, [filters, setSearchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchQuery, offset: 0 });
  };

  const handleKindChange = (kind: 'product' | 'service' | 'all') => {
    updateFilters({ kind, offset: 0 });
  };

  const handleCategoryFilter = (path: string[]) => {
    updateFilters({ categoryPath: path, offset: 0 });
  };

  const handlePriceFilter = (min: string, max: string) => {
    updateFilters({ priceMin: min, priceMax: max, offset: 0 });
  };

  const handleSort = (sort: any) => {
    updateFilters({ sort });
  };

  const handlePageChange = (newOffset: number) => {
    updateFilters({ offset: newOffset });
  };

  const formatPrice = (price: string) => {
    return `${parseFloat(price).toFixed(2)} BZR`;
  };

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder={t('search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              {t('search.button')}
            </Button>
          </div>
        </form>

        {/* Kind Selector */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filters.kind === 'all' ? 'default' : 'outline'}
            onClick={() => handleKindChange('all')}
          >
            {t('search.all')}
          </Button>
          <Button
            variant={filters.kind === 'product' ? 'default' : 'outline'}
            onClick={() => handleKindChange('product')}
          >
            {t('search.products')}
          </Button>
          <Button
            variant={filters.kind === 'service' ? 'default' : 'outline'}
            onClick={() => handleKindChange('service')}
          >
            {t('search.services')}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className={`lg:col-span-1 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('search.filters')}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                >
                  {t('search.clear')}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Category Facets - OTIMIZADO COM MEMOIZAÇÃO */}
                {categoryLabels.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">{t('search.categories')}</h4>
                    <div className="space-y-1">
                      {categoryLabels.map((cat, idx) => (
                        <button
                          key={idx}
                          className="w-full text-left text-sm hover:text-primary flex justify-between"
                          onClick={() => handleCategoryFilter(cat.path)}
                        >
                          <span>{cat.label}</span>
                          <span className="text-muted-foreground">({cat.count})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price Range */}
                {results?.facets?.price && (
                  <div>
                    <h4 className="font-medium mb-2">{t('search.price_range')}</h4>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder={t('search.min')}
                          value={filters.priceMin || ''}
                          onChange={(e) => handlePriceFilter(e.target.value, filters.priceMax || '')}
                        />
                        <Input
                          type="number"
                          placeholder={t('search.max')}
                          value={filters.priceMax || ''}
                          onChange={(e) => handlePriceFilter(filters.priceMin || '', e.target.value)}
                        />
                      </div>
                      {results.facets.price.buckets.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {results.facets.price.buckets.map((bucket, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span>{bucket.range} BZR</span>
                              <span>({bucket.count})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sort */}
                <div>
                  <h4 className="font-medium mb-2">{t('search.sort_by')}</h4>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={filters.sort || 'relevance'}
                    onChange={(e) => handleSort(e.target.value)}
                  >
                    <option value="relevance">{t('search.sort.relevance')}</option>
                    <option value="priceAsc">{t('search.sort.price_asc')}</option>
                    <option value="priceDesc">{t('search.sort.price_desc')}</option>
                    <option value="createdDesc">{t('search.sort.newest')}</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Mobile Filter Toggle */}
            <Button
              variant="outline"
              className="lg:hidden w-full mt-4"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {t('search.toggle_filters')}
            </Button>
          </div>

          {/* Results Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : results && results.items.length > 0 ? (
              <div className="space-y-4">
                {/* Results count */}
                <p className="text-sm text-muted-foreground">
                  {t('search.showing_results', {
                    start: results.page.offset + 1,
                    end: Math.min(results.page.offset + results.page.limit, results.page.total),
                    total: results.page.total
                  })}
                </p>

                {/* Results grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.items.map((item) => (
                    <Card key={item.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <Badge variant={item.kind === 'product' ? 'default' : 'secondary'}>
                            {item.kind === 'product' ? t('new.product') : t('new.service')}
                          </Badge>
                          <span className="text-lg font-bold text-primary">
                            {formatPrice(item.priceBzr || '0')}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {item.media?.[0] && (
                          <img
                            src={item.media[0].url}
                            alt={item.title}
                            className="w-full h-48 object-cover rounded-md mb-4"
                          />
                        )}
                        <h3 className="font-semibold mb-2">{item.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                        {item.categoryPath && item.categoryPath.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {/* Mantém o MESMO layout (Badges). 
                                Agora cada crumb usa a mesma estratégia de tradução: path cumulativo até o nível. */}
                            {item.categoryPath.slice(1).map((_, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {getCrumbLabel(item.categoryPath, idx + 1)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {results.page.total > results.page.limit && (
                  <div className="flex justify-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      disabled={results.page.offset === 0}
                      onClick={() => handlePageChange(Math.max(0, results.page.offset - results.page.limit))}
                    >
                      {t('common.previous')}
                    </Button>
                    <span className="flex items-center px-4 text-sm">
                      {t('common.page', {
                        current: Math.floor(results.page.offset / results.page.limit) + 1,
                        total: Math.ceil(results.page.total / results.page.limit)
                      })}
                    </span>
                    <Button
                      variant="outline"
                      disabled={results.page.offset + results.page.limit >= results.page.total}
                      onClick={() => handlePageChange(results.page.offset + results.page.limit)}
                    >
                      {t('common.next')}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {filters.q ? 
                    'Nenhum resultado encontrado' : 
                    'Digite algo para buscar produtos e serviços'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
