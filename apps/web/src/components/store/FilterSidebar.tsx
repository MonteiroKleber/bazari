import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { FilterState } from '@/hooks/useStoreFilters';
import type { CategoryFacet, PriceRange, PriceBucket, AttributeValue } from '@/hooks/useStoreFacets';
import { SearchBar } from './SearchBar';
import { CategoryFilter } from './CategoryFilter';
import { PriceFilter } from './PriceFilter';
import { TypeFilter } from './TypeFilter';
import { AttributeFilter } from './AttributeFilter';
import { FilterSkeleton } from './FilterSkeleton';

export interface FacetsData {
  categories: CategoryFacet[];
  priceRange: PriceRange;
  priceBuckets?: PriceBucket[];
  attributes: Record<string, AttributeValue[]>;
}

export interface FilterSidebarProps {
  storeId: string;
  filters: FilterState;
  facets: FacetsData;
  loading?: boolean;
  onFilterChange: (key: keyof FilterState, value: any) => void;
  onClearAll: () => void;
}

export function FilterSidebar({
  filters,
  facets,
  loading = false,
  onFilterChange,
  onClearAll,
}: FilterSidebarProps) {
  const { t } = useTranslation();

  // Calcular se há filtros ativos
  const hasActiveFilters =
    filters.q !== '' ||
    filters.kind !== 'all' ||
    filters.categoryPath.length > 0 ||
    filters.priceMin !== '' ||
    filters.priceMax !== '' ||
    Object.keys(filters.attrs).length > 0;

  return (
    <aside className="hidden lg:block w-[280px] sticky top-8 h-fit">
      <div className="rounded-lg border border-store-ink/15 bg-store-bg/95 p-4 space-y-6">
        {/* Barra de Busca */}
        <SearchBar
          value={filters.q}
          onChange={(value) => onFilterChange('q', value)}
          placeholder={t('store.catalog.search.placeholder', 'Buscar na loja...')}
        />

        {/* Filtro de Categorias */}
        {loading ? (
          <div>
            <h3 className="font-semibold text-store-ink mb-3">
              {t('store.catalog.filters.category', 'Categoria')}
            </h3>
            <FilterSkeleton type="category" count={5} />
          </div>
        ) : (
          facets.categories.length > 0 && (
            <CategoryFilter
              categories={facets.categories}
              selectedPaths={filters.categoryPath}
              onChange={(paths) => onFilterChange('categoryPath', paths)}
            />
          )
        )}

        {/* Filtro de Preço */}
        {loading ? (
          <div>
            <h3 className="font-semibold text-store-ink mb-3">
              {t('store.catalog.filters.price', 'Preço')}
            </h3>
            <FilterSkeleton type="price" />
          </div>
        ) : (
          <PriceFilter
            min={filters.priceMin}
            max={filters.priceMax}
            rangeMin={facets.priceRange.min}
            rangeMax={facets.priceRange.max}
            buckets={facets.priceBuckets}
            onChange={(min, max) => {
              onFilterChange('priceMin', min);
              onFilterChange('priceMax', max);
            }}
            disabled={loading}
          />
        )}

        {/* Filtro de Tipo */}
        <TypeFilter
          value={filters.kind}
          onChange={(value) => onFilterChange('kind', value)}
        />

        {/* Filtro de Atributos */}
        {loading ? (
          <>
            <FilterSkeleton type="attribute" count={4} />
            <FilterSkeleton type="attribute" count={3} />
          </>
        ) : (
          Object.keys(facets.attributes).length > 0 && (
            <AttributeFilter
              attributes={facets.attributes}
              selected={filters.attrs}
              onChange={(attrKey, values) => {
                const newAttrs = { ...filters.attrs };
                if (values.length === 0) {
                  delete newAttrs[attrKey];
                } else {
                  newAttrs[attrKey] = values;
                }
                onFilterChange('attrs', newAttrs);
              }}
            />
          )
        )}

        {/* Botão Limpar Filtros */}
        <Button
          variant="outline"
          onClick={onClearAll}
          disabled={!hasActiveFilters || loading}
          className="w-full border-store-ink/30 text-store-ink hover:bg-store-ink/5 hover:text-store-brand disabled:opacity-50"
        >
          {t('store.catalog.filters.clearAll', 'Limpar Filtros')}
        </Button>
      </div>
    </aside>
  );
}
