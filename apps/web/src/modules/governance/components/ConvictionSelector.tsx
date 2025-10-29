import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Conviction } from '../types';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ConvictionSelectorProps {
  value: Conviction;
  onChange: (value: Conviction) => void;
  disabled?: boolean;
}

const convictionOptions: Array<{
  value: Conviction;
  label: string;
  multiplier: string;
  lockPeriod: string;
  description: string;
}> = [
  {
    value: 0,
    label: 'None (0x)',
    multiplier: '0.1x',
    lockPeriod: 'Sem lock',
    description: 'Seu voto conta 0.1x, mas você pode retirar seus tokens imediatamente após a votação.',
  },
  {
    value: 1,
    label: 'Locked1x (1x)',
    multiplier: '1x',
    lockPeriod: '1x período',
    description: 'Seu voto conta 1x e seus tokens ficarão locked por 1 período de votação.',
  },
  {
    value: 2,
    label: 'Locked2x (2x)',
    multiplier: '2x',
    lockPeriod: '2x períodos',
    description: 'Seu voto conta 2x e seus tokens ficarão locked por 2 períodos de votação.',
  },
  {
    value: 3,
    label: 'Locked3x (3x)',
    multiplier: '3x',
    lockPeriod: '4x períodos',
    description: 'Seu voto conta 3x e seus tokens ficarão locked por 4 períodos de votação.',
  },
  {
    value: 4,
    label: 'Locked4x (4x)',
    multiplier: '4x',
    lockPeriod: '8x períodos',
    description: 'Seu voto conta 4x e seus tokens ficarão locked por 8 períodos de votação.',
  },
  {
    value: 5,
    label: 'Locked5x (5x)',
    multiplier: '5x',
    lockPeriod: '16x períodos',
    description: 'Seu voto conta 5x e seus tokens ficarão locked por 16 períodos de votação.',
  },
  {
    value: 6,
    label: 'Locked6x (6x)',
    multiplier: '6x',
    lockPeriod: '32x períodos',
    description: 'Seu voto conta 6x e seus tokens ficarão locked por 32 períodos de votação.',
  },
];

export function ConvictionSelector({ value, onChange, disabled }: ConvictionSelectorProps) {
  const selectedOption = convictionOptions.find((opt) => opt.value === value);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Conviction</label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">
                Conviction determina quanto seu voto vale e por quanto tempo seus tokens ficarão
                locked. Maior conviction = maior peso do voto, mas maior período de lock.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Select
        value={value.toString()}
        onValueChange={(v) => onChange(parseInt(v) as Conviction)}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione conviction" />
        </SelectTrigger>
        <SelectContent>
          {convictionOptions.map((option) => (
            <SelectItem key={option.value} value={option.value.toString()}>
              <div className="flex items-center justify-between w-full">
                <span>{option.label}</span>
                <span className="text-xs text-muted-foreground ml-4">{option.lockPeriod}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedOption && (
        <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
          <p>
            <strong>Multiplicador:</strong> {selectedOption.multiplier}
          </p>
          <p>
            <strong>Lock:</strong> {selectedOption.lockPeriod}
          </p>
          <p className="mt-1">{selectedOption.description}</p>
        </div>
      )}
    </div>
  );
}
