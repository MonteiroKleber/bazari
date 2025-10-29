import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { ProposalFilters } from '../../types';

export interface FilterChipsProps {
  /**
   * Current filters
   */
  filters: ProposalFilters;

  /**
   * Search query
   */
  searchQuery?: string;

  /**
   * Callback when a filter is removed
   */
  onRemoveFilter: (filterKey: keyof ProposalFilters, value?: any) => void;

  /**
   * Callback when search query is cleared
   */
  onClearSearch?: () => void;

  /**
   * Callback to clear all filters
   */
  onClearAll?: () => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * FASE 8 - PROMPT 7: Filter Chips Component
 *
 * Shows active filters as removable chips
 *
 * @example
 * ```tsx
 * <FilterChips
 *   filters={filters}
 *   searchQuery={searchQuery}
 *   onRemoveFilter={(key, value) => {
 *     if (key === 'types') {
 *       setFilters({
 *         ...filters,
 *         types: filters.types.filter(t => t !== value)
 *       });
 *     }
 *   }}
 *   onClearSearch={() => setSearchQuery('')}
 *   onClearAll={resetFilters}
 * />
 * ```
 */
export function FilterChips({
  filters,
  searchQuery,
  onRemoveFilter,
  onClearSearch,
  onClearAll,
  className,
}: FilterChipsProps) {
  const chips: Array<{
    id: string;
    label: string;
    filterKey: keyof ProposalFilters;
    value?: any;
  }> = [];

  // Add type chips
  if (filters.types && filters.types.length > 0) {
    filters.types.forEach(type => {
      chips.push({
        id: `type-${type}`,
        label: `Tipo: ${type}`,
        filterKey: 'types',
        value: type,
      });
    });
  }

  // Add status chips
  if (filters.statuses && filters.statuses.length > 0) {
    filters.statuses.forEach(status => {
      chips.push({
        id: `status-${status}`,
        label: `Status: ${status}`,
        filterKey: 'statuses',
        value: status,
      });
    });
  }

  // Add date range chip
  if (filters.dateRange?.from || filters.dateRange?.to) {
    const fromStr = filters.dateRange.from
      ? format(filters.dateRange.from, 'dd/MM/yyyy', { locale: ptBR })
      : '...';
    const toStr = filters.dateRange.to
      ? format(filters.dateRange.to, 'dd/MM/yyyy', { locale: ptBR })
      : '...';

    chips.push({
      id: 'dateRange',
      label: `Período: ${fromStr} - ${toStr}`,
      filterKey: 'dateRange',
    });
  }

  // Add value range chip
  if (filters.valueRange?.min !== null || filters.valueRange?.max !== null) {
    const min = filters.valueRange.min !== null ? filters.valueRange.min : 0;
    const max = filters.valueRange.max !== null ? filters.valueRange.max : '∞';

    chips.push({
      id: 'valueRange',
      label: `Valor: ${min} - ${max} BZR`,
      filterKey: 'valueRange',
    });
  }

  // Add proposer chip
  if (filters.proposer) {
    const shortAddress = `${filters.proposer.slice(0, 6)}...${filters.proposer.slice(-4)}`;
    chips.push({
      id: 'proposer',
      label: `Proposer: ${shortAddress}`,
      filterKey: 'proposer',
    });
  }

  // Add search query chip
  if (searchQuery) {
    chips.push({
      id: 'search',
      label: `Busca: "${searchQuery}"`,
      filterKey: 'searchQuery' as keyof ProposalFilters,
    });
  }

  const hasActiveFilters = chips.length > 0;

  if (!hasActiveFilters) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        Filtros ativos:
      </span>

      <AnimatePresence mode="popLayout">
        {chips.map(chip => (
          <motion.div
            key={chip.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <Badge
              variant="secondary"
              className="gap-1 pr-1 hover:bg-secondary/80 transition-colors"
            >
              <span>{chip.label}</span>
              <button
                onClick={() => {
                  if (chip.filterKey === 'searchQuery' as keyof ProposalFilters) {
                    onClearSearch?.();
                  } else {
                    onRemoveFilter(chip.filterKey, chip.value);
                  }
                }}
                className="ml-1 rounded-sm hover:bg-secondary-foreground/20 p-0.5 transition-colors"
                aria-label={`Remover filtro ${chip.label}`}
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Clear All Button */}
      {chips.length > 1 && onClearAll && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            type="button"
          >
            Limpar todos
          </Button>
        </motion.div>
      )}
    </div>
  );
}
