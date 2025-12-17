import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

export interface FilterValues {
  minBRL?: string;
  maxBRL?: string;
  minRating?: number;
}

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterValues;
  onApply: (filters: FilterValues) => void;
  onClear: () => void;
  className?: string;
}

export function FilterSheet({
  open,
  onOpenChange,
  filters,
  onApply,
  onClear,
  className,
}: FilterSheetProps) {
  const { t } = useTranslation();
  const [localFilters, setLocalFilters] = useState<FilterValues>(filters);

  // Sync local state when filters prop changes
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onApply(localFilters);
    onOpenChange(false);
  };

  const handleClear = () => {
    const clearedFilters: FilterValues = {
      minBRL: undefined,
      maxBRL: undefined,
      minRating: undefined,
    };
    setLocalFilters(clearedFilters);
    onClear();
    onOpenChange(false);
  };

  const hasActiveFilters =
    localFilters.minBRL || localFilters.maxBRL || (localFilters.minRating && localFilters.minRating > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className={cn('rounded-t-xl', className)}>
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('p2p.filters.title', 'Filtros')}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Value Range */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">
              {t('p2p.filters.valueRange', 'Valor (BRL)')}
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minBRL" className="text-xs text-muted-foreground">
                  {t('p2p.filters.min', 'Mínimo')}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    R$
                  </span>
                  <Input
                    id="minBRL"
                    type="number"
                    placeholder="0"
                    value={localFilters.minBRL || ''}
                    onChange={(e) =>
                      setLocalFilters((prev) => ({ ...prev, minBRL: e.target.value || undefined }))
                    }
                    className="pl-10"
                    min={0}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxBRL" className="text-xs text-muted-foreground">
                  {t('p2p.filters.max', 'Máximo')}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    R$
                  </span>
                  <Input
                    id="maxBRL"
                    type="number"
                    placeholder="∞"
                    value={localFilters.maxBRL || ''}
                    onChange={(e) =>
                      setLocalFilters((prev) => ({ ...prev, maxBRL: e.target.value || undefined }))
                    }
                    className="pl-10"
                    min={0}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Minimum Rating */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                {t('p2p.filters.minRating', 'Reputação mínima')}
              </Label>
              <span className="text-sm text-muted-foreground">
                {localFilters.minRating
                  ? `${localFilters.minRating}+ ⭐`
                  : t('p2p.filters.anyRating', 'Qualquer')}
              </span>
            </div>
            <Slider
              value={[localFilters.minRating || 0]}
              onValueChange={([value]) =>
                setLocalFilters((prev) => ({
                  ...prev,
                  minRating: value > 0 ? value : undefined,
                }))
              }
              min={0}
              max={5}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('p2p.filters.anyRating', 'Qualquer')}</span>
              <span>5 ⭐</span>
            </div>
          </div>
        </div>

        <SheetFooter className="flex-row gap-3 pt-4">
          <Button
            variant="outline"
            onClick={handleClear}
            className="flex-1"
            disabled={!hasActiveFilters}
          >
            <X className="h-4 w-4 mr-2" />
            {t('p2p.filters.clear', 'Limpar')}
          </Button>
          <Button onClick={handleApply} className="flex-1">
            <Filter className="h-4 w-4 mr-2" />
            {t('p2p.filters.apply', 'Aplicar')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// Trigger button component for convenience
interface FilterTriggerProps {
  onClick: () => void;
  activeCount?: number;
  className?: string;
}

export function FilterTrigger({ onClick, activeCount = 0, className }: FilterTriggerProps) {
  const { t } = useTranslation();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn('relative', className)}
    >
      <Filter className="h-4 w-4 mr-2" />
      {t('p2p.filters.title', 'Filtros')}
      {activeCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
          {activeCount}
        </span>
      )}
    </Button>
  );
}
