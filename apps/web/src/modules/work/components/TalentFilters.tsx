// path: apps/web/src/modules/work/components/TalentFilters.tsx
// Filtros de busca de talentos - mobile-friendly

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { SlidersHorizontal, X } from 'lucide-react';
import type { WorkPreference, ProfessionalStatus } from '../api';

export interface FilterValues {
  skills: string[];
  area: string;
  workPreference: WorkPreference[];
  minHourlyRate: string;
  maxHourlyRate: string;
  status: ProfessionalStatus | '';
}

export interface TalentFiltersProps {
  value: FilterValues;
  onChange: (filters: FilterValues) => void;
  areas?: string[];
  onClear?: () => void;
}

const defaultFilters: FilterValues = {
  skills: [],
  area: '',
  workPreference: [],
  minHourlyRate: '',
  maxHourlyRate: '',
  status: '',
};

export function TalentFilters({
  value,
  onChange,
  areas = [],
  onClear,
}: TalentFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterValues>(value);

  // Count active filters
  const activeFiltersCount = [
    value.skills.length > 0,
    value.area !== '',
    value.workPreference.length > 0,
    value.minHourlyRate !== '' || value.maxHourlyRate !== '',
    value.status !== '',
  ].filter(Boolean).length;

  const handleApply = () => {
    onChange(localFilters);
    setIsOpen(false);
  };

  const handleClear = () => {
    setLocalFilters(defaultFilters);
    onChange(defaultFilters);
    onClear?.();
    setIsOpen(false);
  };

  const handleOpen = (open: boolean) => {
    if (open) {
      setLocalFilters(value);
    }
    setIsOpen(open);
  };

  const toggleWorkPreference = (pref: WorkPreference) => {
    const current = localFilters.workPreference;
    const updated = current.includes(pref)
      ? current.filter((p) => p !== pref)
      : [...current, pref];
    setLocalFilters({ ...localFilters, workPreference: updated });
  };

  // Desktop filters (inline)
  const DesktopFilters = () => (
    <div className="hidden md:flex items-center gap-3 flex-wrap">
      {/* Area Select */}
      <Select
        value={value.area}
        onValueChange={(v) => onChange({ ...value, area: v === 'all' ? '' : v })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Área" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as áreas</SelectItem>
          {areas.map((area) => (
            <SelectItem key={area} value={area}>
              {area}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Work Preference */}
      <Select
        value={value.workPreference[0] || 'all'}
        onValueChange={(v) =>
          onChange({
            ...value,
            workPreference: v === 'all' ? [] : [v as WorkPreference],
          })
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Preferência" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="REMOTE">Remoto</SelectItem>
          <SelectItem value="ON_SITE">Presencial</SelectItem>
          <SelectItem value="HYBRID">Híbrido</SelectItem>
        </SelectContent>
      </Select>

      {/* Status */}
      <Select
        value={value.status || 'all'}
        onValueChange={(v) =>
          onChange({
            ...value,
            status: v === 'all' ? '' : (v as ProfessionalStatus),
          })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Disponibilidade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="AVAILABLE">Disponíveis</SelectItem>
          <SelectItem value="NOT_AVAILABLE">Indisponíveis</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear button */}
      {activeFiltersCount > 0 && (
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );

  // Mobile filters (bottom sheet)
  const MobileFilters = () => (
    <div className="md:hidden">
      <Sheet open={isOpen} onOpenChange={handleOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh]">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>
              Refine sua busca por talentos
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6 overflow-y-auto max-h-[60vh]">
            {/* Área */}
            <div className="space-y-2">
              <Label>Área de Atuação</Label>
              <Select
                value={localFilters.area || 'all'}
                onValueChange={(v) =>
                  setLocalFilters({ ...localFilters, area: v === 'all' ? '' : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as áreas</SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preferência de trabalho */}
            <div className="space-y-2">
              <Label>Preferência de Trabalho</Label>
              <div className="flex flex-wrap gap-2">
                {(['REMOTE', 'ON_SITE', 'HYBRID'] as const).map((pref) => (
                  <Button
                    key={pref}
                    variant={localFilters.workPreference.includes(pref) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleWorkPreference(pref)}
                  >
                    {pref === 'REMOTE' && 'Remoto'}
                    {pref === 'ON_SITE' && 'Presencial'}
                    {pref === 'HYBRID' && 'Híbrido'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Disponibilidade</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={localFilters.status === '' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLocalFilters({ ...localFilters, status: '' })}
                >
                  Todos
                </Button>
                <Button
                  variant={localFilters.status === 'AVAILABLE' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLocalFilters({ ...localFilters, status: 'AVAILABLE' })}
                >
                  Disponíveis
                </Button>
                <Button
                  variant={localFilters.status === 'NOT_AVAILABLE' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLocalFilters({ ...localFilters, status: 'NOT_AVAILABLE' })}
                >
                  Indisponíveis
                </Button>
              </div>
            </div>

            {/* Faixa de valor */}
            <div className="space-y-2">
              <Label>Valor por Hora (BRL)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Mín"
                  value={localFilters.minHourlyRate}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, minHourlyRate: e.target.value })
                  }
                />
                <span className="text-muted-foreground">até</span>
                <Input
                  type="number"
                  placeholder="Máx"
                  value={localFilters.maxHourlyRate}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, maxHourlyRate: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <SheetFooter className="flex-row gap-2 sm:gap-2">
            <Button variant="outline" onClick={handleClear} className="flex-1">
              Limpar
            </Button>
            <Button onClick={handleApply} className="flex-1">
              Aplicar Filtros
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );

  return (
    <>
      <DesktopFilters />
      <MobileFilters />
    </>
  );
}

export default TalentFilters;
