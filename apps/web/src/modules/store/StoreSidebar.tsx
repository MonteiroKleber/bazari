import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CategoryFacet {
  path: string[];
  count: number;
}

interface PriceFacetBucket {
  range: string;
  count: number;
}

interface PriceFacet {
  min: string;
  max: string;
  buckets: PriceFacetBucket[];
}

interface StoreSidebarProps {
  loading?: boolean;
  categories?: CategoryFacet[];
  price?: PriceFacet | null;
  activeCategory?: string[];
  priceFilter?: { min?: string; max?: string };
  onSelectCategory: (path: string[] | undefined) => void;
  onPriceRangeChange: (range: { min?: string; max?: string } | null) => void;
  onClearFilters?: () => void;
}

function parseBucket(range: string): { min?: string; max?: string } {
  if (range.endsWith('+')) {
    const value = range.replace('+', '').trim();
    return { min: value, max: undefined };
  }
  const [min, max] = range.split('-').map((part) => part.trim());
  return { min: min || undefined, max: max || undefined };
}

export function StoreSidebar({
  loading = false,
  categories,
  price,
  activeCategory,
  priceFilter,
  onSelectCategory,
  onPriceRangeChange,
  onClearFilters,
}: StoreSidebarProps) {
  const { t } = useTranslation();

  const formattedCategories = useMemo(() => {
    if (!categories) return [];
    return categories.slice(0, 20).map((cat) => ({
      key: cat.path.join(' › '),
      label: cat.path.join(' / '),
      count: cat.count,
      path: cat.path,
    }));
  }, [categories]);

  return (
    <Card className="border border-store-ink/10 bg-store-bg/85 text-store-ink">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-store-ink/90">
          {t('store.filters.title', { defaultValue: t('search.filters') })}
        </CardTitle>
        {onClearFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters} disabled={loading}>
            {t('search.clear')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {loading && (
          <div className="space-y-4">
            <div>
              <div className="mb-2 h-4 w-24 animate-pulse rounded bg-muted/50" />
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="mb-1 h-3 w-full animate-pulse rounded bg-muted/30" />
              ))}
            </div>
            <div>
              <div className="mb-2 h-4 w-20 animate-pulse rounded bg-muted/50" />
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="mb-1 h-3 w-2/3 animate-pulse rounded bg-muted/30" />
              ))}
            </div>
          </div>
        )}

        {!loading && formattedCategories.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-medium text-store-ink/85">{t('search.categories')}</h4>
              {activeCategory && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => onSelectCategory(undefined)}
                >
                  {t('search.clear')}
                </Button>
              )}
            </div>
            <div className="space-y-1">
              {formattedCategories.map((category) => {
                const isActive = Array.isArray(activeCategory) && category.path.join('>') === activeCategory.join('>');
                return (
                  <button
                    key={category.key}
                    type="button"
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-store-brand/10 ${isActive ? 'bg-store-brand/15 text-store-brand' : 'text-store-ink/80'}`}
                    onClick={() => onSelectCategory(isActive ? undefined : category.path)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="line-clamp-1">{category.label}</span>
                      <Badge variant="secondary" className="shrink-0 border-store-ink/10 bg-store-brand/10 text-store-ink">
                        {category.count}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!loading && price && price.buckets.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-medium text-store-ink/85">
                {t('store.filters.price', { defaultValue: t('search.price') ?? 'Preço' })}
              </h4>
              {priceFilter && (priceFilter.min || priceFilter.max) && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => onPriceRangeChange(null)}
                >
                  {t('search.clear')}
                </Button>
              )}
            </div>
            <div className="space-y-1">
              {price.buckets.map((bucket) => {
                const parsed = parseBucket(bucket.range);
                const isActive =
                  (priceFilter?.min ?? '') === (parsed.min ?? '') &&
                  (priceFilter?.max ?? '') === (parsed.max ?? '');
                return (
                  <button
                    key={bucket.range}
                    type="button"
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-store-brand/10 ${isActive ? 'bg-store-brand/15 text-store-brand' : 'text-store-ink/80'}`}
                    onClick={() => onPriceRangeChange(parsed)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{bucket.range} BZR</span>
                      <Badge variant="outline" className="shrink-0 border-store-ink/10 bg-store-brand/10 text-store-ink">
                        {bucket.count}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default StoreSidebar;
