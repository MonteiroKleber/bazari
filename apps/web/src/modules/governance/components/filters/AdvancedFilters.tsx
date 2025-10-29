import { useState } from 'react';
import { motion } from 'framer-motion';
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ProposalFilters, ProposalType, ProposalStatus } from '../../types';

export interface AdvancedFiltersProps {
  /**
   * Current filters
   */
  filters: ProposalFilters;

  /**
   * Change handler
   */
  onChange: (filters: ProposalFilters) => void;

  /**
   * Reset handler
   */
  onReset?: () => void;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Initially collapsed
   * @default false
   */
  defaultCollapsed?: boolean;
}

/**
 * Available proposal types
 */
const PROPOSAL_TYPES: Array<{ value: ProposalType; label: string }> = [
  { value: 'DEMOCRACY', label: 'Democracia' },
  { value: 'TREASURY', label: 'Tesouro' },
  { value: 'COUNCIL', label: 'Conselho' },
  { value: 'TECH_COMMITTEE', label: 'Comitê Técnico' },
];

/**
 * Available proposal statuses
 */
const PROPOSAL_STATUSES: Array<{ value: ProposalStatus; label: string }> = [
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'APPROVED', label: 'Aprovado' },
  { value: 'REJECTED', label: 'Rejeitado' },
  { value: 'EXECUTED', label: 'Executado' },
  { value: 'CANCELLED', label: 'Cancelado' },
];

/**
 * FASE 8 - PROMPT 7: Advanced Filters Component
 *
 * Multi-dimensional filtering for proposals:
 * - Type filter (multi-select)
 * - Status filter (multi-select)
 * - Date range
 * - Value range
 * - Proposer address
 *
 * @example
 * ```tsx
 * const { filters, setFilters, resetFilters } = useProposalFilters({
 *   proposals: allProposals
 * });
 *
 * <AdvancedFilters
 *   filters={filters}
 *   onChange={setFilters}
 *   onReset={resetFilters}
 * />
 * ```
 */
export function AdvancedFilters({
  filters,
  onChange,
  onReset,
  className,
  defaultCollapsed = false,
}: AdvancedFiltersProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  /**
   * Toggle type filter
   */
  const toggleType = (type: ProposalType) => {
    const currentTypes = filters.types || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];

    onChange({ ...filters, types: newTypes });
  };

  /**
   * Toggle status filter
   */
  const toggleStatus = (status: ProposalStatus) => {
    const currentStatuses = filters.statuses || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];

    onChange({ ...filters, statuses: newStatuses });
  };

  /**
   * Update date range
   */
  const updateDateRange = (key: 'from' | 'to', value: string) => {
    const date = value ? new Date(value) : null;
    onChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [key]: date,
      },
    });
  };

  /**
   * Update value range
   */
  const updateValueRange = (key: 'min' | 'max', value: string) => {
    const numValue = value ? parseFloat(value) : null;
    onChange({
      ...filters,
      valueRange: {
        ...filters.valueRange,
        [key]: numValue,
      },
    });
  };

  /**
   * Update proposer
   */
  const updateProposer = (value: string) => {
    onChange({ ...filters, proposer: value || undefined });
  };

  /**
   * Count active filters
   */
  const activeCount =
    (filters.types?.length || 0) +
    (filters.statuses?.length || 0) +
    (filters.dateRange?.from || filters.dateRange?.to ? 1 : 0) +
    (filters.valueRange?.min !== null || filters.valueRange?.max !== null ? 1 : 0) +
    (filters.proposer ? 1 : 0);

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Filtros Avançados</CardTitle>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                {activeCount}
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8"
            aria-label={collapsed ? 'Expandir filtros' : 'Colapsar filtros'}
            type="button"
          >
            {collapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {!collapsed && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <CardContent className="space-y-6">
            {/* Type Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipo de Proposta</Label>
              <div className="space-y-2">
                {PROPOSAL_TYPES.map(type => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type.value}`}
                      checked={filters.types?.includes(type.value) || false}
                      onCheckedChange={() => toggleType(type.value)}
                    />
                    <label
                      htmlFor={`type-${type.value}`}
                      className="text-sm cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {type.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <div className="space-y-2">
                {PROPOSAL_STATUSES.map(status => (
                  <div key={status.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${status.value}`}
                      checked={filters.statuses?.includes(status.value) || false}
                      onCheckedChange={() => toggleStatus(status.value)}
                    />
                    <label
                      htmlFor={`status-${status.value}`}
                      className="text-sm cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {status.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Período</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="date-from" className="text-xs text-muted-foreground">
                    De
                  </Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={
                      filters.dateRange?.from
                        ? filters.dateRange.from.toISOString().split('T')[0]
                        : ''
                    }
                    onChange={e => updateDateRange('from', e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="date-to" className="text-xs text-muted-foreground">
                    Até
                  </Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={
                      filters.dateRange?.to
                        ? filters.dateRange.to.toISOString().split('T')[0]
                        : ''
                    }
                    onChange={e => updateDateRange('to', e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Value Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Valor (BZR)</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="value-min" className="text-xs text-muted-foreground">
                    Mínimo
                  </Label>
                  <Input
                    id="value-min"
                    type="number"
                    min="0"
                    step="100"
                    placeholder="0"
                    value={filters.valueRange?.min ?? ''}
                    onChange={e => updateValueRange('min', e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="value-max" className="text-xs text-muted-foreground">
                    Máximo
                  </Label>
                  <Input
                    id="value-max"
                    type="number"
                    min="0"
                    step="100"
                    placeholder="Ilimitado"
                    value={filters.valueRange?.max ?? ''}
                    onChange={e => updateValueRange('max', e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Proposer */}
            <div className="space-y-2">
              <Label htmlFor="proposer" className="text-sm font-medium">
                Endereço do Proposer
              </Label>
              <Input
                id="proposer"
                type="text"
                placeholder="0x..."
                value={filters.proposer || ''}
                onChange={e => updateProposer(e.target.value)}
                className="text-sm font-mono"
              />
            </div>

            {/* Reset Button */}
            {activeCount > 0 && onReset && (
              <Button
                variant="outline"
                onClick={onReset}
                className="w-full"
                type="button"
              >
                Limpar Filtros ({activeCount})
              </Button>
            )}
          </CardContent>
        </motion.div>
      )}
    </Card>
  );
}
