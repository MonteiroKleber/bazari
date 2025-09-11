// V-4: SearchPage with real API data, filters, facets and i18n - 2025-09-11
// Uses apiFetch, no mocks, complete filtering and URL sync
// path: apps/web/src/pages/SearchPage.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Grid3X3, List, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { SearchFilters } from '../components/SearchFilters';
import { useSearch } from '../hooks/useSearch';
import { SearchParams } from '../lib/api';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

export function SearchPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');

  // Parse filters from URL
  const filtersFromUrl = useMemo((): SearchParams => {
    const params: SearchParams = {};
    
    // Basic params
    const q = searchParams.get('q');
    if (q) params.q = q;
    
    const kind = searchParams.get('kind');
    if (kind === 'product' || kind === 'service') params.kind = kind;
    
    const categoryId = searchParams.get('categoryId');
    if (categoryId) params.categoryId = categoryId;
    
    // Category path array
    const categoryPath = searchParams.getAll('categoryPath[]');
    if (categoryPath.length > 0) params.categoryPath = categoryPath;
    
    // Prices
    const priceMin = searchParams.get('priceMin');
    if (priceMin) params.priceMin = parseFloat(priceMin);
    
    const priceMax = searchParams.get('priceMax');
    if (priceMax) params.priceMax = parseFloat(priceMax);
    
    // Pagination
    const page = searchParams.get('page');
    params.page = page ? parseInt(page) : 1;
    
    const limit = searchParams.get('limit');
    params.limit = limit ? parseInt(limit) : 20;
    
    // Sort
    const sort = searchParams.get('sort');
    if (sort) params.sort = sort as SearchParams['sort'];
    
    // Dynamic attributes
    const attributes: Record<string, string[]> = {};
    searchParams.forEach((value, key) => {
      const match = key.match(/^attr\[(.+)\]$/);
      if (match) {
        const attrKey = match[1];
        if (!attributes[attrKey]) {
          attributes[attrKey] = [];
        }
        attributes[attrKey].push(value);
      }
    });
    
    if (Object.keys(attributes).length > 0) {
      params.attributes = attributes;
    }
    
    return params;
  }, [searchParams]);

  // Fetch data with current filters
  const { data, isLoading, error } = useSearch(filtersFromUrl);

  // Update URL when filters change
  const updateFilters = (newFilters: Partial<SearchParams>) => {
    const params = new URLSearchParams();
    
    // Merge with existing filters
    const merged = { ...filtersFromUrl, ...newFilters };
    
    // Build new URL params
    if (merged.q) params.set('q', merged.q);
    if (merged.kind) params.set('kind', merged.kind);
    if (merged.categoryId) params.set('categoryId', merged.categoryId);
    
    if (merged.categoryPath?.length) {
      merged.categoryPath.forEach(path => {
        params.append('categoryPath[]', path);
      });
    }
    
    if (merged.priceMin !== undefined) params.set('priceMin', merged.priceMin.toString());
    if (merged.priceMax !== undefined) params.set('priceMax', merged.priceMax.toString());
    if (merged.page && merged.page > 1) params.set('page', merged.page.toString());
    if (merged.limit && merged.limit !== 20) params.set('limit', merged.limit.toString());
    if (merged.sort) params.set('sort', merged.sort);
    
    if (merged.attributes) {
      Object.entries(merged.attributes).forEach(([key, values]) => {
        const valueArray = Array.isArray(values) ? values : [values];
        valueArray.forEach(value => {
          params.append(`attr[${key}]`, value);
        });
      });
    }
    
    setSearchParams(params);
  };

  // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchInput, page: 1 });
  };

  // Handle filter changes
  const handleFilterChange = (filters: any) => {
    updateFilters({ ...filters, page: 1 });
  };

  // Handle sort change
  const handleSortChange = (sort: string) => {
    updateFilters({ sort: sort as SearchParams['sort'], page: 1 });
  };

  // Handle kind change
  const handleKindChange = (kind: string) => {
    if (kind === 'all') {
      const newFilters = { ...filtersFromUrl };
      delete newFilters.kind;
      updateFilters({ ...newFilters, page: 1 });
    } else {
      updateFilters({ kind: kind as 'product' | 'service', page: 1 });
    }
  };

  // Handle pagination
  const handlePageChange = (direction: 'prev' | 'next') => {
    const currentPage = filtersFromUrl.page || 1;
    if (direction === 'next') {
      updateFilters({ page: currentPage + 1 });
    } else if (currentPage > 1) {
      updateFilters({ page: currentPage - 1 });
    }
  };

  // Format price for display
  const formatPrice = (price: string | number) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(num);
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{t('search.title')}</h1>
            <p className="text-muted-foreground">{t('search.subtitle')}</p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-2">
              <Input
                type="search"
                placeholder={t('search.placeholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1"
              />
              <Button type="submit">
                <Search className="h-4 w-4 mr-2" />
                {t('search.button')}
              </Button>
            </div>
          </form>

          {/* Toolbar */}
          <div className="flex flex-wrap gap-4 items-center mb-6">
            {/* Kind Tabs */}
            <Tabs 
              value={filtersFromUrl.kind || 'all'} 
              onValueChange={handleKindChange}
            >
              <TabsList>
                <TabsTrigger value="all">{t('search.all')}</TabsTrigger>
                <TabsTrigger value="product">{t('search.kind.product')}</TabsTrigger>
                <TabsTrigger value="service">{t('search.kind.service')}</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t('search.sort.label')}:</span>
              <Select 
                value={filtersFromUrl.sort || 'relevance'} 
                onValueChange={handleSortChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">{t('search.sort.relevance')}</SelectItem>
                  <SelectItem value="price_asc">{t('search.sort.priceAsc')}</SelectItem>
                  <SelectItem value="price_desc">{t('search.sort.priceDesc')}</SelectItem>
                  <SelectItem value="newest">{t('search.sort.newest')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Mode */}
            <div className="flex gap-1 ml-auto">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <SearchFilters
                value={{
                  categoryId: filtersFromUrl.categoryId,
                  categoryPath: filtersFromUrl.categoryPath,
                  priceMin: filtersFromUrl.priceMin,
                  priceMax: filtersFromUrl.priceMax,
                  attributes: filtersFromUrl.attributes
                }}
                onChange={handleFilterChange}
                facets={data?.facets}
              />
            </div>

            {/* Results */}
            <div className="lg:col-span-3">
              {/* Loading State */}
              {isLoading && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">{t('common.loading')}</p>
                </div>
              )}

              {/* Error State */}
              {error && !isLoading && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t('search.results.errorTitle')}</AlertTitle>
                  <AlertDescription>{t('search.results.errorBody')}</AlertDescription>
                </Alert>
              )}

              {/* Empty State */}
              {!isLoading && !error && data && data.items.length === 0 && (
                <Alert>
                  <AlertTitle>{t('search.results.emptyTitle')}</AlertTitle>
                  <AlertDescription>{t('search.results.emptyBody')}</AlertDescription>
                </Alert>
              )}

              {/* Results Grid/List */}
              {!isLoading && !error && data && data.items.length > 0 && (
                <>
                  {/* Results Count */}
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground">
                      {t('search.results.showing', {
                        start: ((data.page - 1) * data.limit) + 1,
                        end: Math.min(data.page * data.limit, data.total),
                        total: data.total
                      })}
                    </p>
                  </div>

                  {/* Items Grid/List */}
                  <div className={
                    viewMode === 'grid' 
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                      : 'space-y-4'
                  }>
                    {data.items.map((item) => (
                      <Link 
                        key={item.id} 
                        to={`/app/product/${item.id}`}
                        className="block"
                      >
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                          <CardContent className="p-4">
                            {/* Thumbnail */}
                            {item.thumbnailUrl && (
                              <div className="aspect-square mb-3 overflow-hidden rounded-lg bg-muted">
                                <img
                                  src={item.thumbnailUrl}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            
                            {/* Title */}
                            <h3 className="font-semibold mb-2 line-clamp-2">
                              {item.title}
                            </h3>
                            
                            {/* Price */}
                            <p className="text-lg font-bold text-primary">
                              {formatPrice(item.priceBzr)}
                            </p>
                            
                            {/* Category Path */}
                            {item.categoryPath && item.categoryPath.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-2">
                                {item.categoryPath.join(' > ')}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>

                  {/* Pagination */}
                  {data.total > data.limit && (
                    <div className="flex justify-center gap-2 mt-8">
                      <Button
                        variant="outline"
                        onClick={() => handlePageChange('prev')}
                        disabled={data.page === 1}
                      >
                        {t('search.pagination.prev')}
                      </Button>
                      <span className="flex items-center px-4 text-sm text-muted-foreground">
                        {t('common.page', { current: data.page, total: Math.ceil(data.total / data.limit) })}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() => handlePageChange('next')}
                        disabled={data.page * data.limit >= data.total}
                      >
                        {t('search.pagination.next')}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}