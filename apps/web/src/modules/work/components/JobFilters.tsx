// path: apps/web/src/modules/work/components/JobFilters.tsx
// Filtros de busca de vagas - mobile-friendly

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
import type { WorkPreference, PaymentPeriod } from '../api';

export interface JobFilterValues {
  skills: string[];
  area: string;
  workType: WorkPreference[];
  minPayment: string;
  maxPayment: string;
  paymentPeriod: PaymentPeriod | '';
}

export interface JobFiltersProps {
  value: JobFilterValues;
  onChange: (filters: JobFilterValues) => void;
  areas?: string[];
  onClear?: () => void;
}

const defaultFilters: JobFilterValues = {
  skills: [],
  area: '',
  workType: [],
  minPayment: '',
  maxPayment: '',
  paymentPeriod: '',
};

export function JobFilters({
  value,
  onChange,
  areas = [],
  onClear,
}: JobFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<JobFilterValues>(value);

  // Count active filters
  const activeFiltersCount = [
    value.skills.length > 0,
    value.area !== '',
    value.workType.length > 0,
    value.minPayment !== '' || value.maxPayment !== '',
    value.paymentPeriod !== '',
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

  const toggleWorkType = (type: WorkPreference) => {
    const current = localFilters.workType;
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    setLocalFilters({ ...localFilters, workType: updated });
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

      {/* Work Type */}
      <Select
        value={value.workType[0] || 'all'}
        onValueChange={(v) =>
          onChange({
            ...value,
            workType: v === 'all' ? [] : [v as WorkPreference],
          })
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="REMOTE">Remoto</SelectItem>
          <SelectItem value="ON_SITE">Presencial</SelectItem>
          <SelectItem value="HYBRID">Híbrido</SelectItem>
        </SelectContent>
      </Select>

      {/* Payment Period */}
      <Select
        value={value.paymentPeriod || 'all'}
        onValueChange={(v) =>
          onChange({
            ...value,
            paymentPeriod: v === 'all' ? '' : (v as PaymentPeriod),
          })
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="HOURLY">Por hora</SelectItem>
          <SelectItem value="MONTHLY">Por mês</SelectItem>
          <SelectItem value="PROJECT">Por projeto</SelectItem>
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
              Refine sua busca por vagas
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

            {/* Tipo de trabalho */}
            <div className="space-y-2">
              <Label>Tipo de Trabalho</Label>
              <div className="flex flex-wrap gap-2">
                {(['REMOTE', 'ON_SITE', 'HYBRID'] as const).map((type) => (
                  <Button
                    key={type}
                    variant={localFilters.workType.includes(type) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleWorkType(type)}
                  >
                    {type === 'REMOTE' && 'Remoto'}
                    {type === 'ON_SITE' && 'Presencial'}
                    {type === 'HYBRID' && 'Híbrido'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Período de pagamento */}
            <div className="space-y-2">
              <Label>Período de Pagamento</Label>
              <Select
                value={localFilters.paymentPeriod || 'all'}
                onValueChange={(v) =>
                  setLocalFilters({ ...localFilters, paymentPeriod: v === 'all' ? '' : (v as PaymentPeriod) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="HOURLY">Por hora</SelectItem>
                  <SelectItem value="DAILY">Por dia</SelectItem>
                  <SelectItem value="WEEKLY">Por semana</SelectItem>
                  <SelectItem value="MONTHLY">Por mês</SelectItem>
                  <SelectItem value="PROJECT">Por projeto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Faixa de valor */}
            <div className="space-y-2">
              <Label>Faixa de Valor (BRL)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Mín"
                  value={localFilters.minPayment}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, minPayment: e.target.value })
                  }
                />
                <span className="text-muted-foreground">até</span>
                <Input
                  type="number"
                  placeholder="Máx"
                  value={localFilters.maxPayment}
                  onChange={(e) =>
                    setLocalFilters({ ...localFilters, maxPayment: e.target.value })
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

export default JobFilters;
