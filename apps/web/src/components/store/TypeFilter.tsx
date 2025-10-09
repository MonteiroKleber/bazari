import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export interface TypeFilterProps {
  value: 'all' | 'product' | 'service';
  onChange: (value: 'all' | 'product' | 'service') => void;
}

export function TypeFilter({ value, onChange }: TypeFilterProps) {
  const { t } = useTranslation();

  const options = [
    { value: 'all' as const, label: t('store.catalog.type.all', 'Todos') },
    { value: 'product' as const, label: t('store.catalog.type.product', 'Apenas Produtos') },
    { value: 'service' as const, label: t('store.catalog.type.service', 'Apenas Serviços') },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-store-ink">
        {t('store.catalog.type.title', 'Tipo de Item')}
      </h3>

      <RadioGroup
        value={value}
        onValueChange={onChange}
        className="space-y-2"
      >
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <RadioGroupItem
              value={option.value}
              id={`type-${option.value}`}
              className="border-store-ink/30 text-store-brand"
            />
            <Label
              htmlFor={`type-${option.value}`}
              className="cursor-pointer text-sm font-normal text-store-ink hover:text-store-brand"
            >
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
