// path: apps/web/src/pages/SearchPage.tsx

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Slider } from '../components/ui/slider';
import { useSearch } from '../hooks/useSearch';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

export function SearchPage() {
  const { t } = useTranslation();
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
                {/* Category Facets */}
                {results?.facets.categories && results.facets.categories.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">{t('search.categories')}</h4>
                    <div className="space-y-1">
                      {results.facets.categories.slice(0, 10).map((cat, idx) => (
                        <button
                          key={idx}
                          className="w-full text-left text-sm hover:text-primary flex justify-between"
                          onClick={() => handleCategoryFilter(cat.path)}
                        >
                          <span>{cat.path[cat.path.length - 1]}</span>
                          <span className="text-muted-foreground">({cat.count})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price Range */}
                {results?.facets.price && (
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
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {/* Mobile Filter Toggle */}
            <Button
              variant="outline"
              className="lg:hidden mb-4"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {t('search.toggle_filters')}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading && (
              <div className="text-center py-8">
                {t('common.loading')}
              </div>
            )}

            {results && (
              <>
                {/* Results Info */}
                <div className="mb-4 text-sm text-muted-foreground">
                  {t('search.showing_results', {
                    start: results.page.offset + 1,
                    end: Math.min(results.page.offset + results.page.limit, results.page.total),
                    total: results.page.total
                  })}
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.items.map((item) => (
                    <Card key={item.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{item.title}</CardTitle>
                          <Badge variant={item.kind === 'product' ? 'default' : 'secondary'}>
                            {item.kind}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        {item.priceBzr && (
                          <p className="text-lg font-semibold text-primary">
                            {formatPrice(item.priceBzr)}
                          </p>
                        )}
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground">
                            {item.categoryPath.join(' > ')}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {results.page.total > results.page.limit && (
                  <div className="flex justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      disabled={results.page.offset === 0}
                      onClick={() => handlePageChange(Math.max(0, results.page.offset - results.page.limit))}
                    >
                      {t('common.previous')}
                    </Button>
                    <span className="flex items-center px-4">
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
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}