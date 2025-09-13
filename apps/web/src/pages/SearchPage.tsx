// V-18 (2025-09-13): Toggle atributos passa offset:0 para resetar paginação; sem alteração visual
// path: apps/web/src/pages/SearchPage.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { API_BASE_URL } from '../config';

// Hook para carregar categorias com tradução
import { useCategories } from '../hooks/useCategories';

export function SearchPage() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  const [showAllCats, setShowAllCats] = useState(false);

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

  // Índices para busca de labels de categorias (memoizados)
  const indexes = useMemo(() => {
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
      if (cat.pathSlugs?.length > 1) {
        const firstSlugAfterPrefix = cat.pathSlugs[1];
        if (firstSlugAfterPrefix && !byPartialPath.has(firstSlugAfterPrefix)) {
          byPartialPath.set(firstSlugAfterPrefix, cat);
        }
      }
    }

    return { byFullPath, byPathWithoutPrefix, byLastSlug, byPartialPath };
  }, [categories]);

  const getFacetLabel = useCallback((path: string[]) => {
    if (!path || path.length === 0) return '';
    const { byFullPath, byPathWithoutPrefix, byLastSlug } = indexes;

    // 1. Tentar com path completo
    const fullKey = path.join('-');
    let category = byFullPath.get(fullKey);

    // 2. Se não encontrou e path não tem prefixo, tentar adicionar
    if (!category && !path[0]?.includes('products') && !path[0]?.includes('services')) {
      const withProducts = ['products', ...path].join('-');
      category = byFullPath.get(withProducts);

      if (!category) {
        const withServices = ['services', ...path].join('-');
        category = byFullPath.get(withServices);
      }

      if (!category) {
        category = byPathWithoutPrefix.get(fullKey);
      }
    }

    // 3. Para paths de um único item
    if (!category && path.length === 1) {
      category = byFullPath.get(`products-${path[0]}`) || byFullPath.get(`services-${path[0]}`);
      if (!category) {
        category = indexes.byPartialPath?.get(path[0]);
      }
    }

    // 4. Fallback: último slug
    if (!category) {
      const lastSlug = path[path.length - 1];
      category = byLastSlug.get(lastSlug);
    }

    if (!category) return path[path.length - 1];

    const lang = i18n.language || 'pt';
    const nameKey = lang.startsWith('pt') ? 'namePt' : lang.startsWith('es') ? 'nameEs' : 'nameEn';
    return category[nameKey] || category.namePt || category.nameEn || category.nameEs || path[path.length - 1];
  }, [indexes, i18n.language]);

  // Label para breadcrumbs de cards a partir de path parcial
  const getCrumbLabel = useCallback((fullPath: string[], levelIndex: number) => {
    if (!Array.isArray(fullPath) || fullPath.length === 0) return '';
    const upto = Math.min(levelIndex + 1, fullPath.length);
    return getFacetLabel(fullPath.slice(0, upto));
  }, [getFacetLabel]);

  // Memoizar labels das categorias para evitar recálculos (ordenado por count desc)
  const categoryLabels = useMemo(() => {
    if (!results?.facets?.categories) return [];
    const sorted = [...results.facets.categories].sort((a, b) => b.count - a.count);
    return sorted.map(cat => ({
      ...cat,
      label: getFacetLabel(cat.path)
    }));
  }, [results?.facets?.categories, getFacetLabel]);

  // Função toggleAttrFacet
  const toggleAttrFacet = useCallback((attrKey: string, value: string) => {
    const current = filters.attrs || {};
    const currentValues = current[attrKey];
    
    let newValues: string[] = [];
    
    if (Array.isArray(currentValues)) {
      newValues = currentValues.includes(value) 
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
    } else if (typeof currentValues === 'string') {
      newValues = currentValues === value ? [] : [currentValues, value];
    } else {
      newValues = [value];
    }

    const newAttrs = { ...current };
    if (newValues.length === 0) {
      delete newAttrs[attrKey];
    } else {
      newAttrs[attrKey] = newValues;
    }

    updateFilters({ attrs: newAttrs, offset: 0 });
  }, [filters.attrs, updateFilters]);

  // Sincronizar com URL (inclui filtros extras)
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (filters.q) params.set('q', filters.q);
    if (filters.kind && filters.kind !== 'all') params.set('kind', filters.kind);
    if (Array.isArray(filters.categoryPath) && filters.categoryPath.length > 0) {
      filters.categoryPath.forEach(p => params.append('categoryPath', p));
    }
    if (filters.priceMin) params.set('priceMin', filters.priceMin);
    if (filters.priceMax) params.set('priceMax', filters.priceMax);
    if (filters.sort) params.set('sort', String(filters.sort));
    if (typeof filters.offset === 'number' && filters.offset > 0) params.set('offset', String(filters.offset));
    
    // Adiciona attrs na URL
    if (filters.attrs && Object.keys(filters.attrs).length > 0) {
      for (const [key, val] of Object.entries(filters.attrs)) {
        if (Array.isArray(val)) {
          val.forEach(v => params.append(`attrs.${key}`, v));
        } else if (val) {
          params.set(`attrs.${key}`, String(val));
        }
      }
    }
    
    setSearchParams(params);
  }, [filters, setSearchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchQuery, offset: 0 });
  };

  // Debounce para busca por texto (sem mudar layout)
  useEffect(() => {
    const h = setTimeout(() => {
      if ((searchQuery || '').trim() !== (filters.q || '').trim()) {
        updateFilters({ q: searchQuery, offset: 0 });
      }
    }, 350);
    return () => clearTimeout(h);
  }, [searchQuery, filters.q, updateFilters]);

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
    const n = Number(price);
    if (!isFinite(n)) return '—';
    try {
      const nf = new Intl.NumberFormat(i18n.language || 'pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `${nf.format(n)} BZR`;
    } catch {
      return `${n.toFixed(2)} BZR`;
    }
  };

  // Resolver URL absoluta da mídia (robusto)
  const resolveMediaUrl = useCallback((u?: string) => {
    if (!u) return '';
    // Se já é absoluta, retorna como está
    try {
      const test = new URL(u);
      return test.toString();
    } catch {
      // não é absoluta
    }
    // Base preferencial: API_BASE_URL do config
    let base = API_BASE_URL as string | undefined;
    // Fallback: variável de ambiente do Vite (caso exista)
    if (!base && typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) {
      base = (import.meta as any).env.VITE_API_BASE_URL as string;
    }
    // Último fallback: localhost:3000 em DEV
    if (!base) {
      base = 'http://localhost:3000';
    }
    const abs = new URL(u.startsWith('/') ? u : `/${u}`, base).toString();
    if (import.meta.env.DEV) {
      console.debug('[media-url]', { original: u, resolved: abs, base });
    }
    return abs;
  }, []);

  // Tenta extrair a melhor URL de imagem do item, sem alterar layout/lógica
  const extractBestImageUrl = (item: any): string | undefined => {
    const m0 = item?.media?.[0];
    if (m0?.url) return m0.url as string;

    const candidates = ['coverUrl', 'thumbnailUrl', 'imageUrl', 'image', 'thumbnail', 'mediaUrl'];
    for (const k of candidates) {
      const v = item?.[k];
      if (typeof v === 'string' && v.trim().length > 0) return v;
    }

    // Arrays comuns
    if (Array.isArray(item?.images) && item.images.length > 0) {
      const img0 = item.images[0];
      return typeof img0 === 'string' ? img0 : (img0?.url || undefined);
    }
    if (Array.isArray(item?.mediaUrls) && item.mediaUrls.length > 0) {
      return item.mediaUrls[0];
    }
    return undefined;
  };

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="mb-6 flex items-center gap-2">
          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label={t('search.placeholder') as string}
                placeholder={t('search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" aria-label={t('search.button') as string}>{t('search.button')}</Button>
          </form>
          <Button
            aria-label={t('search.toggle_filters') as string}
            variant="outline"
            className="lg:hidden"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {t('search.filters')}
          </Button>
        </div>

        {/* Kind Selector (restaurado) */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filters.kind === 'all' ? 'default' : 'outline'}
            onClick={() => handleKindChange('all')}
            aria-label={t('search.all') as string}
          >
            {t('search.all')}
          </Button>
          <Button
            variant={filters.kind === 'product' ? 'default' : 'outline'}
            onClick={() => handleKindChange('product')}
            aria-label={t('search.products') as string}
          >
            {t('search.products')}
          </Button>
          <Button
            variant={filters.kind === 'service' ? 'default' : 'outline'}
            onClick={() => handleKindChange('service')}
            aria-label={t('search.services') as string}
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
                {loading && (!results || !results.facets) && (
                  <div className="space-y-4">
                    <div>
                      <div className="h-4 w-32 bg-muted/50 rounded mb-2 animate-pulse" />
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-3 w-full bg-muted/30 rounded animate-pulse mb-1" />
                      ))}
                    </div>
                    <div>
                      <div className="h-4 w-28 bg-muted/50 rounded mb-2 animate-pulse" />
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-3 w-2/3 bg-muted/30 rounded animate-pulse mb-1" />
                      ))}
                    </div>
                  </div>
                )}

                {/* Category Facets */}
                {(showAllCats ? categoryLabels : categoryLabels.slice(0, 10)).length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">{t('search.categories')}</h4>
                    <div className="space-y-1">
                      {(showAllCats ? categoryLabels : categoryLabels.slice(0, 10)).map((cat) => {
                        const key = Array.isArray(cat.path) ? cat.path.join('-') : String(cat.path);
                        const isActive = Array.isArray(filters.categoryPath) && filters.categoryPath.join('-') === (Array.isArray(cat.path) ? cat.path.join('-') : String(cat.path));
                        return (
                          <button
                            key={key}
                            type="button"
                            aria-label={(t('search.categories') as string) + ': ' + (cat.label || key)}
                            className={`w-full text-left text-sm flex justify-between ${isActive ? 'text-primary font-medium' : 'hover:text-primary'}`}
                            onClick={() => handleCategoryFilter(cat.path)}
                          >
                            <span>{cat.label}</span>
                            <span className="text-muted-foreground">({cat.count})</span>
                          </button>
                        );
                      })}
                    </div>
                    {categoryLabels.length > 10 && (
                      <button
                        type="button"
                        className="mt-2 text-xs text-muted-foreground hover:text-primary"
                        onClick={() => setShowAllCats(!showAllCats)}
                      >
                        {showAllCats ? t('common.show_less', { defaultValue: 'Ver menos' }) : t('common.show_more', { defaultValue: 'Ver mais' })}
                      </button>
                    )}
                  </div>
                )}

                {/* Price Range */}
                {results?.facets?.price && (
                  <div>
                    <h4 className="font-medium mb-2">{t('search.price_range')}</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          aria-label={t('search.min') as string}
                          placeholder={t('search.min')}
                          value={filters.priceMin || ''}
                          onChange={(e) => handlePriceFilter(e.target.value, filters.priceMax || '')}
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="number"
                          aria-label={t('search.max') as string}
                          placeholder={t('search.max')}
                          value={filters.priceMax || ''}
                          onChange={(e) => handlePriceFilter(filters.priceMin || '', e.target.value)}
                        />
                      </div>
                      {results.facets.price.buckets.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {results.facets.price.buckets.map((bucket, idx) => {
                            const [minStr, maxStr] = String(bucket.range).split('-').map(s => s.trim());
                            return (
                              <button
                                key={idx}
                                type="button"
                                className="w-full flex justify-between hover:text-primary text-left"
                                aria-label={(t('search.price_range') as string) + ': ' + bucket.range + ' BZR'}
                                onClick={() => handlePriceFilter(minStr, maxStr)}
                              >
                                <span>{bucket.range} BZR</span>
                                <span>({bucket.count})</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Attribute Facets - Accordion corrigido */}
                {(
                  (results?.facets?.attributes && Object.keys(results.facets.attributes).length > 0) ||
                  (filters?.attrs && Object.keys(filters.attrs).length > 0)
                ) && (
                  <details className="group" open>
                    <summary className="cursor-pointer select-none list-none flex items-center">
                      <h4 className="font-medium">{t('search.attributes', { defaultValue: 'Atributos' })}</h4>
                    </summary>
                    <div className="space-y-4 mt-2">
                      {/* Renderiza facetas existentes */}
                      {Object.entries(results?.facets?.attributes || {}).map(([attrKey, buckets]) => {
                        const list = Array.isArray(buckets) ? buckets as Array<{ value: string; count: number }> : [];
                        return (
                          <div key={attrKey}>
                            <div className="text-sm font-medium mb-1">
                              {t(`attr.${String(attrKey)}`, { defaultValue: String(attrKey) })}
                            </div>
                            <div className="space-y-1">
                              {list.map((b, i) => {
                                const selectedArr = Array.isArray(filters.attrs?.[attrKey]) ? (filters.attrs![attrKey] as string[]) : [];
                                const selectedStr = typeof filters.attrs?.[attrKey] === 'string' ? String(filters.attrs?.[attrKey]) : null;
                                const isSelected = Array.isArray(selectedArr) ? selectedArr.includes(String(b.value)) : (selectedStr === String(b.value));
                                return (
                                  <label 
                                    key={i} 
                                    className="flex items-center justify-between text-sm cursor-pointer"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        className="h-4 w-4"
                                        checked={!!isSelected}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={() => toggleAttrFacet(String(attrKey), String(b.value))}
                                      />
                                      <span>{String(b.value)}</span>
                                    </span>
                                    <span className="text-muted-foreground">({b.count})</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Renderiza atributos selecionados que não estão nas facetas (para permitir desmarcar) */}
                      {filters.attrs && Object.entries(filters.attrs).map(([attrKey, values]) => {
                        // Se já foi renderizado nas facetas acima, pula
                        if (results?.facets?.attributes?.[attrKey]) return null;
                        
                        const valueArray = Array.isArray(values) ? values : [values];
                        return (
                          <div key={attrKey}>
                            <div className="text-sm font-medium mb-1">
                              {t(`attr.${String(attrKey)}`, { defaultValue: String(attrKey) })}
                            </div>
                            <div className="space-y-1">
                              {valueArray.map((value, i) => (
                                <label 
                                  key={i} 
                                  className="flex items-center justify-between text-sm cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4"
                                      checked={true}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={() => toggleAttrFacet(String(attrKey), String(value))}
                                    />
                                    <span>{String(value)}</span>
                                  </span>
                                  <span className="text-muted-foreground">(0)</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
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
              aria-label={t('search.toggle_filters') as string}
              variant="outline"
              className="lg:hidden w-full mt-4"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {t('search.filters')}
            </Button>
          </div>

          {/* Results Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="space-y-4">
                <div className="h-4 w-40 bg-muted/50 rounded animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="border rounded-md p-4 animate-pulse">
                      <div className="w-full h-40 bg-muted/30 rounded mb-4" />
                      <div className="h-4 w-3/4 bg-muted/50 rounded mb-2" />
                      <div className="h-4 w-1/2 bg-muted/30 rounded" />
                    </div>
                  ))}
                </div>
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

                {/* Applied filters chips */}
                {(filters.q || (Array.isArray(filters.categoryPath) && filters.categoryPath.length > 0) || filters.priceMin || filters.priceMax || (filters.attrs && Object.keys(filters.attrs).length > 0)) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {filters.q && (
                      <Badge variant="secondary">{filters.q}</Badge>
                    )}
                    {Array.isArray(filters.categoryPath) && filters.categoryPath.length > 0 && (
                      <Badge variant="secondary">{getFacetLabel(filters.categoryPath)}</Badge>
                    )}
                    {(filters.priceMin || filters.priceMax) && (
                      <Badge variant="secondary">
                        {(filters.priceMin || '0') + ' - ' + (filters.priceMax || '∞') + ' BZR'}
                      </Badge>
                    )}
                    {filters.attrs && Object.entries(filters.attrs).map(([key, values]) => {
                      const valueArray = Array.isArray(values) ? values : [values];
                      return valueArray.map(value => (
                        <Badge key={`${key}-${value}`} variant="secondary">
                          {key}: {value}
                        </Badge>
                      ));
                    })}
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      {t('search.clear')}
                    </Button>
                  </div>
                )}

                {/* Results grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.items.map((item) => {
                    const originalUrl = extractBestImageUrl(item);
                    const src = originalUrl ? resolveMediaUrl(originalUrl) : undefined;
                    
                    return (
                      <Card key={item.id} className="overflow-hidden">
                        {src && (
                          <div className="aspect-video bg-muted">
                            <img
                              src={src}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        <CardContent className="p-4">
                          <h3 className="font-semibold mb-2">{item.title}</h3>
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {item.description}
                          </p>
                          {item.priceBzr && (
                            <p className="text-lg font-bold">{formatPrice(item.priceBzr)}</p>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            <Badge variant="outline">
                              {item.kind === 'product' ? t('search.products') : t('search.services')}
                            </Badge>
                            {item.categoryPath && item.categoryPath.length > 0 && (
                              <Badge variant="secondary">
                                {getCrumbLabel(item.categoryPath, item.categoryPath.length - 1)}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Pagination */}
                {results.page.total > results.page.limit && (
                  <div className="flex justify-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(Math.max(0, results.page.offset - results.page.limit))}
                      disabled={results.page.offset === 0}
                    >
                      {t('common.previous', { defaultValue: 'Anterior' })}
                    </Button>
                    <span className="flex items-center px-4">
                      {Math.floor(results.page.offset / results.page.limit) + 1} / {Math.ceil(results.page.total / results.page.limit)}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(results.page.offset + results.page.limit)}
                      disabled={results.page.offset + results.page.limit >= results.page.total}
                    >
                      {t('common.next', { defaultValue: 'Próximo' })}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery ? 
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