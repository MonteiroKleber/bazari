import { useState, useMemo } from 'react';
import type { ProposalFilters } from '../types';

export interface UseProposalFiltersOptions<T> {
  /**
   * List of proposals to filter
   */
  proposals: T[];

  /**
   * Initial filter configuration
   */
  initialFilters?: Partial<ProposalFilters>;

  /**
   * Custom filter function
   */
  customFilter?: (proposal: T, filters: ProposalFilters, searchQuery: string) => boolean;
}

export interface UseProposalFiltersReturn<T> {
  /**
   * Current filters
   */
  filters: ProposalFilters;

  /**
   * Update filters
   */
  setFilters: (filters: ProposalFilters) => void;

  /**
   * Update a single filter field
   */
  updateFilter: <K extends keyof ProposalFilters>(key: K, value: ProposalFilters[K]) => void;

  /**
   * Search query
   */
  searchQuery: string;

  /**
   * Update search query
   */
  setSearchQuery: (query: string) => void;

  /**
   * Filtered proposals
   */
  filteredProposals: T[];

  /**
   * Reset all filters to defaults
   */
  resetFilters: () => void;

  /**
   * Number of active filters
   */
  activeFilterCount: number;

  /**
   * Check if filters are active
   */
  hasActiveFilters: boolean;
}

/**
 * Default filter configuration
 */
const defaultFilters: ProposalFilters = {
  types: [],
  statuses: [],
  dateRange: {
    from: null,
    to: null,
  },
  valueRange: {
    min: null,
    max: null,
  },
  proposer: undefined,
  searchQuery: '',
};

/**
 * FASE 8 - PROMPT 7: Hook for filtering proposals
 *
 * Features:
 * - Multi-dimensional filtering (type, status, date, value, proposer)
 * - Full-text search
 * - Combine filters with AND logic
 * - Active filter tracking
 * - Performance optimized with useMemo
 *
 * @example
 * ```tsx
 * const {
 *   filters,
 *   setFilters,
 *   searchQuery,
 *   setSearchQuery,
 *   filteredProposals,
 *   resetFilters,
 *   activeFilterCount,
 * } = useProposalFilters({
 *   proposals: allProposals,
 *   initialFilters: { statuses: ['ACTIVE'] },
 * });
 *
 * return (
 *   <>
 *     <SearchBar value={searchQuery} onChange={setSearchQuery} />
 *     <AdvancedFilters filters={filters} onChange={setFilters} />
 *     {filteredProposals.map(p => <ProposalCard proposal={p} />)}
 *   </>
 * );
 * ```
 */
export function useProposalFilters<T extends Record<string, any>>({
  proposals,
  initialFilters = {},
  customFilter,
}: UseProposalFiltersOptions<T>): UseProposalFiltersReturn<T> {
  const [filters, setFilters] = useState<ProposalFilters>({
    ...defaultFilters,
    ...initialFilters,
  });
  const [searchQuery, setSearchQuery] = useState(initialFilters.searchQuery || '');

  /**
   * Update a single filter field
   */
  const updateFilter = <K extends keyof ProposalFilters>(
    key: K,
    value: ProposalFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  /**
   * Reset filters to defaults
   */
  const resetFilters = () => {
    setFilters(defaultFilters);
    setSearchQuery('');
  };

  /**
   * Calculate active filter count
   */
  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (filters.types && filters.types.length > 0) count++;
    if (filters.statuses && filters.statuses.length > 0) count++;
    if (filters.dateRange?.from || filters.dateRange?.to) count++;
    if (filters.valueRange?.min !== null || filters.valueRange?.max !== null) count++;
    if (filters.proposer) count++;
    if (searchQuery) count++;

    return count;
  }, [filters, searchQuery]);

  /**
   * Filter proposals
   */
  const filteredProposals = useMemo(() => {
    if (!proposals || proposals.length === 0) return [];

    return proposals.filter(proposal => {
      // Custom filter function takes precedence
      if (customFilter) {
        return customFilter(proposal, filters, searchQuery);
      }

      // Type filter
      if (filters.types && filters.types.length > 0) {
        if (!filters.types.includes(proposal.type)) {
          return false;
        }
      }

      // Status filter
      if (filters.statuses && filters.statuses.length > 0) {
        if (!filters.statuses.includes(proposal.status)) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange) {
        if (filters.dateRange.from && proposal.createdAt) {
          const proposalDate = new Date(proposal.createdAt);
          if (proposalDate < filters.dateRange.from) {
            return false;
          }
        }

        if (filters.dateRange.to && proposal.createdAt) {
          const proposalDate = new Date(proposal.createdAt);
          if (proposalDate > filters.dateRange.to) {
            return false;
          }
        }
      }

      // Value range filter
      if (filters.valueRange && proposal.value !== undefined) {
        const value = typeof proposal.value === 'string'
          ? parseFloat(proposal.value)
          : proposal.value;

        if (!isNaN(value)) {
          if (filters.valueRange.min !== null && value < filters.valueRange.min) {
            return false;
          }

          if (filters.valueRange.max !== null && value > filters.valueRange.max) {
            return false;
          }
        }
      }

      // Proposer filter
      if (filters.proposer && proposal.proposer) {
        if (proposal.proposer !== filters.proposer) {
          return false;
        }
      }

      // Search query (full-text)
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = proposal.title?.toLowerCase().includes(query);
        const matchesDescription = proposal.description?.toLowerCase().includes(query);
        const matchesId = proposal.id?.toString().includes(query);
        const matchesProposer = proposal.proposer?.toLowerCase().includes(query);

        if (!matchesTitle && !matchesDescription && !matchesId && !matchesProposer) {
          return false;
        }
      }

      return true;
    });
  }, [proposals, filters, searchQuery, customFilter]);

  return {
    filters,
    setFilters,
    updateFilter,
    searchQuery,
    setSearchQuery,
    filteredProposals,
    resetFilters,
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0,
  };
}
