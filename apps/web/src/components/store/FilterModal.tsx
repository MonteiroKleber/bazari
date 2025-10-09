import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import type { FilterState } from '@/hooks/useStoreFilters';
import type { FacetsData } from './FilterSidebar';
import { SearchBar } from './SearchBar';
import { CategoryFilter } from './CategoryFilter';
import { PriceFilter } from './PriceFilter';
import { TypeFilter } from './TypeFilter';
import { AttributeFilter } from './AttributeFilter';
import { FilterSkeleton } from './FilterSkeleton';

export interface FilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  filters: FilterState;
  facets: FacetsData;
  loading?: boolean;
  onFilterChange: (key: keyof FilterState, value: any) => void;
  onClearAll: () => void;
  resultsCount: number;
}

export function FilterModal({
  open,
  onOpenChange,
  filters,
  facets,
  loading = false,
  onFilterChange,
  onClearAll,
  resultsCount,
}: FilterModalProps) {
  const { t } = useTranslation();

  // Calcular se há filtros ativos
  const hasActiveFilters =
    filters.q !== '' ||
    filters.kind !== 'all' ||
    filters.categoryPath.length > 0 ||
    filters.priceMin !== '' ||
    filters.priceMax !== '' ||
    Object.keys(filters.attrs).length > 0;

  const handleApply = () => {
    onOpenChange(false);
  };

  const handleClearAll = () => {
    onClearAll();
    // Não fecha o modal, permite continuar filtrando
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85vh] flex flex-col bg-store-bg border-store-ink/15"
      >
        <SheetHeader>
          <SheetTitle className="text-store-ink">
            {t('store.catalog.filters.title', 'Filtros')}
          </SheetTitle>
        </SheetHeader>

        {/* Conteúdo scrollável com filtros */}
        <div className="flex-1 overflow-y-auto py-6 space-y-6">
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
        </div>

        {/* Footer fixo com botões */}
        <SheetFooter className="flex-row gap-3 pt-4 border-t border-store-ink/10">
          <Button
            variant="outline"
            onClick={handleClearAll}
            disabled={!hasActiveFilters || loading}
            className="flex-1 border-store-ink/30 text-store-ink hover:bg-store-ink/5 disabled:opacity-50"
          >
            {t('store.catalog.filters.clearAll', 'Limpar')}
          </Button>
          <Button
            onClick={handleApply}
            disabled={loading}
            className="flex-1 bg-store-brand text-white hover:bg-store-brand/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('store.catalog.filters.loading', 'Carregando...')}
              </>
            ) : (
              <>
                {t('store.catalog.filters.apply', 'Aplicar')} ({resultsCount})
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
