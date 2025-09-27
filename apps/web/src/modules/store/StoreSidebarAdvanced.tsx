import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StoreCategoryTree, type CategoryFacet } from './StoreCategoryTree';

interface PriceFacetBucket {
  range: string;
  count: number;
}

interface PriceFacet {
  min: string;
  max: string;
  buckets: PriceFacetBucket[];
}

interface StoreSidebarAdvancedProps {
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

export function StoreSidebarAdvanced({
  loading = false,
  categories,
  price,
  activeCategory,
  priceFilter,
  onSelectCategory,
  onPriceRangeChange,
  onClearFilters,
}: StoreSidebarAdvancedProps) {
  return (
    <Card className="border border-store-ink/15 bg-store-bg/90 text-store-ink">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-store-ink/90">Filtros</CardTitle>
        {onClearFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="text-store-ink/70 hover:bg-store-brand/10"
            onClick={onClearFilters}
            disabled={loading}
          >
            Limpar tudo
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {loading && (
          <div className="space-y-4 text-sm text-store-ink/60">
            <div>
              <div className="mb-2 h-4 w-24 animate-pulse rounded bg-store-brand/10" />
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`cat-skeleton-${index}`} className="mb-1 h-3 w-full animate-pulse rounded bg-store-brand/5" />
              ))}
            </div>
            <div>
              <div className="mb-2 h-4 w-20 animate-pulse rounded bg-store-brand/10" />
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`price-skeleton-${index}`} className="mb-1 h-3 w-2/3 animate-pulse rounded bg-store-brand/5" />
              ))}
            </div>
          </div>
        )}

        {!loading && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-store-ink/85">Categorias</h4>
              <StoreCategoryTree
                categories={categories}
                activePath={activeCategory}
                onSelect={(path) => onSelectCategory(path)}
              />
              {activeCategory && activeCategory.length > 0 && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-store-ink/70"
                  onClick={() => onSelectCategory(undefined)}
                >
                  Limpar categoria
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-store-ink/85">Faixa de preço</h4>
              <div className="space-y-1">
                {price?.buckets?.length ? (
                  price.buckets.map((bucket) => {
                    const parsed = parseBucket(bucket.range);
                    const isActive =
                      (priceFilter?.min ?? '') === (parsed.min ?? '') &&
                      (priceFilter?.max ?? '') === (parsed.max ?? '');
                    return (
                      <button
                        key={bucket.range}
                        type="button"
                        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition hover:bg-store-brand/10 ${isActive ? 'bg-store-brand/15 text-store-brand' : 'text-store-ink/80'}`}
                        onClick={() => onPriceRangeChange(parsed)}
                      >
                        <span>{bucket.range} BZR</span>
                        <Badge variant="outline" className="border-store-ink/10 bg-store-brand/5 text-xs text-store-ink/70">
                          {bucket.count}
                        </Badge>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-sm text-store-ink/60">Nenhuma faixa disponível.</p>
                )}
              </div>
              {priceFilter && (priceFilter.min || priceFilter.max) && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-store-ink/70"
                  onClick={() => onPriceRangeChange(null)}
                >
                  Limpar preço
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default StoreSidebarAdvanced;
