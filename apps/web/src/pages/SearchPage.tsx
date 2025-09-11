// V+1: Usando ProductCard component para resultados - 2025-09-11
// Substitui cards customizados por ProductCard reutilizável
// Mantém toda funcionalidade de busca e filtros existente

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, Grid3X3, List } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useSearch } from '../hooks/useSearch';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Alert, AlertDescription } from '../components/ui/alert';
import { ProductCard } from '../components/ProductCard';

// Hook para carregar categorias com tradução
import { useCategories } from '../hooks/useCategories';

export function SearchPage() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const {
    filters,
    results,
    loading,
    error,
    updateFilters,
    clearFilters,
    handlePageChange
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
      if (lastSlug) {
        byLastSlug.set(lastSlug, cat);
      }
      
      // Índice 4: Cada segmento do path
      if (cat.pathSlugs) {
        for (let i = 1; i < cat.pathSlugs.length; i++) {
          const partial = cat.pathSlugs.slice(i).join('-');
          if (partial && !byPartialPath.has(partial)) {
            byPartialPath.set(partial, cat);
          }
        }
      }
    }
    
    return { byFullPath, byPathWithoutPrefix, byLastSlug, byPartialPath };
  }, [categories]);

  // Função para traduzir categoria - APRIMORADA com múltiplos índices
  const getCrumbLabel = useCallback((categoryPath: string[], level: number) => {
    if (!categoryPath || level >= categoryPath.length) return '';
    
    // Tentar buscar categoria pelos múltiplos índices
    const pathToLevel = categoryPath.slice(0, level + 1);
    const searchKeys = [
      pathToLevel.join('-'),                    // Busca completa
      pathToLevel.slice(1).join('-'),          // Sem prefixo products/services
      categoryPath[level],                      // Só o slug atual
      pathToLevel.slice(1, level + 1).join('-') // Parcial sem prefixo
    ];
    
    let category: any = null;
    const { byFullPath, byPathWithoutPrefix, byLastSlug, byPartialPath } = categoryIndexes;
    
    // Tentar cada índice na ordem de preferência
    for (const key of searchKeys) {
      if (!key) continue;
      
      category = byFullPath.get(key) || 
                byPathWithoutPrefix.get(key) || 
                byLastSlug.get(key) || 
                byPartialPath.get(key);
      
      if (category) break;
    }
    
    if (category) {
      const lang = i18n.language?.split('-')[0] || 'pt';
      switch (lang) {
        case 'en': return category.nameEn || category.namePt;
        case 'es': return category.nameEs || category.namePt;
        default: return category.namePt;
      }
    }
    
    // Fallback humanizado
    return categoryPath[level]
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (m) => m.toUpperCase());
  }, [categoryIndexes, i18n.language]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchQuery, offset: 0 });
    
    // Atualizar URL
    const newParams = new URLSearchParams(searchParams);
    if (searchQuery) {
      newParams.set('q', searchQuery);
    } else {
      newParams.delete('q');
    }
    setSearchParams(newParams);
  }, [searchQuery, updateFilters, searchParams, setSearchParams]);

  const handleKindChange = useCallback((kind: string) => {
    updateFilters({ 
      kind: kind === 'all' ? undefined : kind as 'product' | 'service',
      offset: 0 
    });
  }, [updateFilters]);

  const handleSortChange = useCallback((sort: string) => {
    updateFilters({ 
      sort: sort as any,
      offset: 0 
    });
  }, [updateFilters]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    clearFilters();
    setSearchParams({});
  }, [clearFilters, setSearchParams]);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background pt-16">
        <div className="container mx-auto px-4 py-8">
          
          {/* Cabeçalho de Busca */}
          <div className="max-w-4xl mx-auto mb-8">
            <h1 className="text-3xl font-bold mb-6 text-center">
              {t('search.title', 'Buscar Produtos e Serviços')}
            </h1>
            
            {/* Barra de busca */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-6">
              <Input
                type="search"
                placeholder={t('search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={loading}>
                <Search className="w-4 h-4 mr-2" />
                {t('search.button')}
              </Button>
            </form>

            {/* Filtros rápidos */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t('search.type', 'Tipo')}:</span>
                <Select value={filters.kind || 'all'} onValueChange={handleKindChange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('search.all')}</SelectItem>
                    <SelectItem value="product">{t('search.products')}</SelectItem>
                    <SelectItem value="service">{t('search.services')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t('search.sort_by')}:</span>
                <Select value={filters.sort || 'createdDesc'} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdDesc">{t('search.sort.newest')}</SelectItem>
                    <SelectItem value="priceAsc">{t('search.sort.price_asc')}</SelectItem>
                    <SelectItem value="priceDesc">{t('search.sort.price_desc')}</SelectItem>
                    <SelectItem value="relevance">{t('search.sort.relevance')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  {t('search.filters')}
                </Button>
                
                {Object.keys(filters).length > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                    {t('search.clear')}
                  </Button>
                )}
              </div>

              {/* Toggle de visualização */}
              <div className="ml-auto flex items-center gap-1 border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Área de resultados */}
          <div className="max-w-6xl mx-auto">
            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">{t('common.loading')}</p>
              </div>
            )}

            {error && (
              <Alert className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {results && results.items.length > 0 ? (
              <div>
                {/* Contador de resultados */}
                <div className="flex items-center justify-between mb-6">
                  <p className="text-sm text-muted-foreground">
                    {t('search.showing_results', {
                      start: results.page.offset + 1,
                      end: Math.min(results.page.offset + results.page.limit, results.page.total),
                      total: results.page.total
                    })}
                  </p>
                </div>

                {/* Grid de produtos usando ProductCard */}
                <div className={
                  viewMode === 'grid' 
                    ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8"
                    : "space-y-4 mb-8"
                }>
                  {results.items.map((item) => (
                    <ProductCard
                      key={item.id}
                      id={item.id}
                      kind={item.kind}
                      title={item.title}
                      description={item.description}
                      priceBzr={item.priceBzr}
                      basePriceBzr={item.basePriceBzr}
                      categoryPath={item.categoryPath}
                      media={item.media}
                      className={viewMode === 'list' ? 'flex-row' : ''}
                    />
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
            ) : results && !loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {filters.q ? 
                    t('search.no_results', 'Nenhum resultado encontrado') : 
                    t('search.search_placeholder', 'Digite algo para buscar produtos e serviços')
                  }
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}