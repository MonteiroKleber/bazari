import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { FeedFilters } from '@/hooks/useFeedFilters';

interface FeedFilterDropdownProps {
  filters: FeedFilters;
  activeFiltersCount: number;
  onToggleFilter: <K extends keyof FeedFilters>(key: K) => void;
  onResetFilters: () => void;
}

export function FeedFilterDropdown({
  filters,
  activeFiltersCount,
  onToggleFilter,
  onResetFilters,
}: FeedFilterDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 relative">
          <Filter className="w-4 h-4" />
          Filtros
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuCheckboxItem
          checked={filters.showReposts}
          onCheckedChange={() => onToggleFilter('showReposts')}
        >
          Mostrar reposts
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.showPolls}
          onCheckedChange={() => onToggleFilter('showPolls')}
        >
          Mostrar enquetes
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.onlyWithMedia}
          onCheckedChange={() => onToggleFilter('onlyWithMedia')}
        >
          Apenas com mídia
        </DropdownMenuCheckboxItem>

        {activeFiltersCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              onClick={onResetFilters}
            >
              <X className="w-4 h-4" />
              Limpar filtros
            </Button>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
