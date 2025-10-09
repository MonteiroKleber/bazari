import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export interface PriceBucket {
  range: string;
  count: number;
}

export interface PriceFilterProps {
  min: string;
  max: string;
  rangeMin: string; // Min disponível nos produtos
  rangeMax: string; // Max disponível nos produtos
  buckets?: PriceBucket[]; // Faixas predefinidas (opcional)
  disabled?: boolean;
  onChange: (min: string, max: string) => void;
}

const DEBOUNCE_DELAY = 300; // 300ms para slider + inputs

/**
 * Filtro de faixa de preço com range slider e inputs
 * Suporta faixas predefinidas (buckets) opcionalmente
 */
export function PriceFilter({
  min,
  max,
  rangeMin,
  rangeMax,
  buckets,
  disabled = false,
  onChange,
}: PriceFilterProps) {
  const { t } = useTranslation();

  // Converter range para números
  const rangeMinNum = parseFloat(rangeMin) || 0;
  const rangeMaxNum = parseFloat(rangeMax) || 1000;

  // Estado local para inputs e slider (antes do debounce)
  const [localMin, setLocalMin] = useState(min);
  const [localMax, setLocalMax] = useState(max);

  // Estado do slider (valores numéricos)
  const [sliderValues, setSliderValues] = useState<[number, number]>([
    min ? parseFloat(min) : rangeMinNum,
    max ? parseFloat(max) : rangeMaxNum,
  ]);

  // Modo de filtro: 'custom' (slider/inputs) ou 'bucket' (radio)
  const [filterMode, setFilterMode] = useState<'custom' | 'bucket'>('custom');
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);

  // Refs para timers de debounce
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sincronizar estado local quando props mudarem (ex: limpar filtros)
  useEffect(() => {
    setLocalMin(min);
    setLocalMax(max);

    const minNum = min ? parseFloat(min) : rangeMinNum;
    const maxNum = max ? parseFloat(max) : rangeMaxNum;
    setSliderValues([minNum, maxNum]);

    // Se props vazias, voltar para modo custom
    if (!min && !max) {
      setFilterMode('custom');
      setSelectedBucket(null);
    }
  }, [min, max, rangeMinNum, rangeMaxNum]);

  // Aplicar mudanças com debounce
  const applyChanges = (minVal: string, maxVal: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onChange(minVal, maxVal);
    }, DEBOUNCE_DELAY);
  };

  // Handler para mudança no slider
  const handleSliderChange = (values: number[]) => {
    const [newMin, newMax] = values;
    setSliderValues([newMin, newMax]);
    setLocalMin(String(newMin));
    setLocalMax(String(newMax));
    setFilterMode('custom');
    setSelectedBucket(null);

    applyChanges(String(newMin), String(newMax));
  };

  // Handler para mudança no input mínimo
  const handleMinInputChange = (value: string) => {
    // Validar: apenas números e vazio
    if (value !== '' && !/^\d+$/.test(value)) {
      return;
    }

    setLocalMin(value);
    setFilterMode('custom');
    setSelectedBucket(null);

    const minNum = value ? parseFloat(value) : rangeMinNum;
    const maxNum = sliderValues[1];

    // Validar: min não pode ser maior que max
    if (value && minNum > maxNum) {
      return;
    }

    setSliderValues([minNum, maxNum]);
    applyChanges(value, localMax);
  };

  // Handler para mudança no input máximo
  const handleMaxInputChange = (value: string) => {
    // Validar: apenas números e vazio
    if (value !== '' && !/^\d+$/.test(value)) {
      return;
    }

    setLocalMax(value);
    setFilterMode('custom');
    setSelectedBucket(null);

    const minNum = sliderValues[0];
    const maxNum = value ? parseFloat(value) : rangeMaxNum;

    // Validar: max não pode ser menor que min
    if (value && maxNum < minNum) {
      return;
    }

    setSliderValues([minNum, maxNum]);
    applyChanges(localMin, value);
  };

  // Handler para seleção de bucket predefinido
  const handleBucketSelect = (bucketRange: string) => {
    setFilterMode('bucket');
    setSelectedBucket(bucketRange);

    // Parsear range do bucket (formato: "0-50" ou "200+")
    const [bucketMin, bucketMax] = parseBucketRange(bucketRange, rangeMaxNum);

    setLocalMin(String(bucketMin));
    setLocalMax(bucketMax === rangeMaxNum ? '' : String(bucketMax));
    setSliderValues([bucketMin, bucketMax]);

    // Aplicar imediatamente (sem debounce para radios)
    onChange(String(bucketMin), bucketMax === rangeMaxNum ? '' : String(bucketMax));
  };

  // Cleanup: limpar timers ao desmontar
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Formatar range disponível
  const formattedRange = formatRange(rangeMin, rangeMax);

  // Verificar se tem buckets
  const hasBuckets = buckets && buckets.length > 0;

  return (
    <div className="space-y-4">
      {/* Título */}
      <h3 className="text-sm font-medium text-store-ink">
        {t('store.filters.price', { defaultValue: 'Preço (BZR)' })}
      </h3>

      {/* Range Slider */}
      <div className="space-y-2">
        <Slider
          min={rangeMinNum}
          max={rangeMaxNum}
          step={1}
          value={sliderValues}
          onValueChange={handleSliderChange}
          disabled={disabled}
          className="[&_[data-radix-slider-range]]:bg-store-brand [&_[data-radix-slider-thumb]]:border-store-brand"
        />

        {/* Valores do slider */}
        <div className="flex justify-between text-xs text-store-ink/50">
          <span>{formatNumber(sliderValues[0])} BZR</span>
          <span>{formatNumber(sliderValues[1])} BZR</span>
        </div>
      </div>

      {/* Inputs Min/Max */}
      <div className="grid grid-cols-2 gap-2">
        {/* Input Mínimo */}
        <div className="space-y-1.5">
          <Label htmlFor="price-min" className="text-xs text-store-ink/70">
            {t('store.filters.priceMin', { defaultValue: 'Mín.' })}
          </Label>
          <Input
            id="price-min"
            type="text"
            inputMode="numeric"
            value={localMin}
            onChange={(e) => handleMinInputChange(e.target.value)}
            placeholder={rangeMin || '0'}
            disabled={disabled}
            className="h-9 border-store-ink/20 bg-store-bg/95 text-store-ink placeholder:text-store-ink/40 focus-visible:border-store-brand focus-visible:ring-store-brand/20 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Input Máximo */}
        <div className="space-y-1.5">
          <Label htmlFor="price-max" className="text-xs text-store-ink/70">
            {t('store.filters.priceMax', { defaultValue: 'Máx.' })}
          </Label>
          <Input
            id="price-max"
            type="text"
            inputMode="numeric"
            value={localMax}
            onChange={(e) => handleMaxInputChange(e.target.value)}
            placeholder={rangeMax || '∞'}
            disabled={disabled}
            className="h-9 border-store-ink/20 bg-store-bg/95 text-store-ink placeholder:text-store-ink/40 focus-visible:border-store-brand focus-visible:ring-store-brand/20 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Faixas Sugeridas (Buckets) */}
      {hasBuckets && (
        <div className="space-y-2">
          <Label className="text-xs text-store-ink/70">
            {t('store.filters.priceBuckets', { defaultValue: 'Faixas sugeridas' })}
          </Label>
          <RadioGroup
            value={filterMode === 'bucket' ? selectedBucket || '' : ''}
            onValueChange={handleBucketSelect}
            disabled={disabled}
            className="space-y-2"
          >
            {buckets.map((bucket) => (
              <div key={bucket.range} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={bucket.range}
                  disabled={disabled}
                  id={`bucket-${bucket.range}`}
                  className="border-store-ink/30 text-store-brand"
                />
                <Label
                  htmlFor={`bucket-${bucket.range}`}
                  className="flex-1 cursor-pointer text-sm text-store-ink hover:text-store-brand"
                >
                  {formatBucketLabel(bucket.range)}{' '}
                  <span className="text-store-ink/50">({bucket.count})</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      )}

      {/* Range disponível */}
      {formattedRange && (
        <p className="text-xs text-store-ink/50">
          {t('store.filters.priceRange', { defaultValue: 'Disponível' })}: {formattedRange}
        </p>
      )}
    </div>
  );
}

/**
 * Formata range de preço para exibição
 */
function formatRange(min: string, max: string): string {
  const minNum = parseFloat(min);
  const maxNum = parseFloat(max);

  if (!isFinite(minNum) || !isFinite(maxNum)) {
    return '';
  }

  if (minNum === 0 && maxNum === 0) {
    return '';
  }

  return `${formatNumber(minNum)} - ${formatNumber(maxNum)} BZR`;
}

/**
 * Formata número com separador de milhares
 */
function formatNumber(num: number): string {
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Formata label do bucket (ex: "0-50" → "Até 50 BZR", "200+" → "Acima de 200 BZR")
 */
function formatBucketLabel(range: string): string {
  if (range.endsWith('+')) {
    const min = range.slice(0, -1);
    return `Acima de ${formatNumber(parseFloat(min))} BZR`;
  }

  const [min, max] = range.split('-');

  if (min === '0') {
    return `Até ${formatNumber(parseFloat(max))} BZR`;
  }

  return `${formatNumber(parseFloat(min))} - ${formatNumber(parseFloat(max))} BZR`;
}

/**
 * Parsear range do bucket para valores numéricos
 */
function parseBucketRange(range: string, rangeMax: number): [number, number] {
  if (range.endsWith('+')) {
    const min = parseFloat(range.slice(0, -1));
    return [min, rangeMax];
  }

  const [min, max] = range.split('-').map((v) => parseFloat(v));
  return [min, max];
}
