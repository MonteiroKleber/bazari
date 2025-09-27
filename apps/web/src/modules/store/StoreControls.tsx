import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export type StoreKind = 'all' | 'product' | 'service';
export type StoreSort = 'relevance' | 'priceAsc' | 'priceDesc' | 'createdDesc';

interface StoreControlsProps {
  kind: StoreKind;
  sort: StoreSort;
  offset?: number;
  limit?: number;
  total?: number;
  loading?: boolean;
  onKindChange: (kind: StoreKind) => void;
  onSortChange: (sort: StoreSort) => void;
  onClearFilters?: () => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}

export function StoreControls({
  kind,
  sort,
  offset = 0,
  limit = 20,
  total,
  loading = false,
  onKindChange,
  onSortChange,
  onClearFilters,
  viewMode,
  onViewModeChange,
}: StoreControlsProps) {
  const { t } = useTranslation();

  const pageInfo = useMemo(() => {
    if (total == null || total <= 0) {
      return t('store.results.empty_header', {
        defaultValue: t('search.results_empty', { defaultValue: 'Nenhum resultado' }) ?? 'Nenhum resultado'
      });
    }
    const start = offset + 1;
    const end = Math.min(offset + limit, total);
    return t('search.showing_results', {
      start,
      end,
      total,
    });
  }, [limit, offset, t, total]);

  const sortOptions: Array<{ value: StoreSort; label: string }> = [
    { value: 'relevance', label: t('search.sort.relevance') },
    { value: 'priceAsc', label: t('search.sort.price_asc') },
    { value: 'priceDesc', label: t('search.sort.price_desc') },
    { value: 'createdDesc', label: t('search.sort.newest') },
  ];

  return (
    <div className="flex flex-col gap-3 text-store-ink lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={kind === 'all' ? 'default' : 'outline'}
          size="sm"
          className={kind === 'all' ? 'bg-store-brand text-store-ink hover:bg-store-brand/90' : 'border-store-ink/20 text-store-ink/80 hover:bg-store-brand/10'}
          onClick={() => onKindChange('all')}
          disabled={loading}
        >
          {t('search.all')}
        </Button>
        <Button
          variant={kind === 'product' ? 'default' : 'outline'}
          size="sm"
          className={kind === 'product' ? 'bg-store-brand text-store-ink hover:bg-store-brand/90' : 'border-store-ink/20 text-store-ink/80 hover:bg-store-brand/10'}
          onClick={() => onKindChange('product')}
          disabled={loading}
        >
          {t('search.products')}
        </Button>
        <Button
          variant={kind === 'service' ? 'default' : 'outline'}
          size="sm"
          className={kind === 'service' ? 'bg-store-brand text-store-ink hover:bg-store-brand/90' : 'border-store-ink/20 text-store-ink/80 hover:bg-store-brand/10'}
          onClick={() => onKindChange('service')}
          disabled={loading}
        >
          {t('search.services')}
        </Button>
        {onClearFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="text-store-ink/70 hover:bg-store-brand/10"
            onClick={onClearFilters}
            disabled={loading}
          >
            {t('search.clear')}
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-2 text-sm text-store-ink/80 lg:items-end">
        <span className="text-store-ink/90">{pageInfo}</span>
        <div className="flex items-center gap-2">
          <label htmlFor="store-sort" className="text-xs uppercase tracking-wide text-store-ink/60">
            {t('search.sort_by')}
          </label>
          <select
            id="store-sort"
            className="rounded-md border border-store-ink/20 bg-store-bg px-3 py-1 text-sm text-store-ink"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as StoreSort)}
            disabled={loading}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {viewMode && onViewModeChange && (
            <div className="ml-2 flex rounded-md border border-store-ink/20">
              <button
                type="button"
                className={`px-3 py-1 text-xs font-medium transition ${viewMode === 'grid' ? 'bg-store-brand text-store-ink' : 'text-store-ink/70 hover:bg-store-brand/10'}`}
                onClick={() => onViewModeChange('grid')}
                disabled={loading}
              >
                Grade
              </button>
              <button
                type="button"
                className={`px-3 py-1 text-xs font-medium transition ${viewMode === 'list' ? 'bg-store-brand text-store-ink' : 'text-store-ink/70 hover:bg-store-brand/10'}`}
                onClick={() => onViewModeChange('list')}
                disabled={loading}
              >
                Lista
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StoreControls;
