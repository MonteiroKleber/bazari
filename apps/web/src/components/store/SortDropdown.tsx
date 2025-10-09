import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface SortDropdownProps {
  value: 'relevance' | 'priceAsc' | 'priceDesc' | 'createdDesc';
  onChange: (value: 'relevance' | 'priceAsc' | 'priceDesc' | 'createdDesc') => void;
}

/**
 * Dropdown de ordenação do catálogo
 */
export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const { t } = useTranslation();

  const sortOptions = [
    {
      value: 'relevance' as const,
      label: t('store.catalog.sort.relevance', { defaultValue: 'Relevância' }),
    },
    {
      value: 'createdDesc' as const,
      label: t('store.catalog.sort.newest', { defaultValue: 'Mais recentes' }),
    },
    {
      value: 'priceAsc' as const,
      label: t('store.catalog.sort.priceAsc', { defaultValue: 'Menor preço' }),
    },
    {
      value: 'priceDesc' as const,
      label: t('store.catalog.sort.priceDesc', { defaultValue: 'Maior preço' }),
    },
  ];

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10 w-[180px] border-store-ink/20 bg-store-bg/95 text-store-ink focus:border-store-brand focus:ring-store-brand/20">
        <SelectValue placeholder={t('store.catalog.sort.label', { defaultValue: 'Ordenar' })} />
      </SelectTrigger>
      <SelectContent className="border-store-ink/20 bg-store-bg">
        {sortOptions.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="text-store-ink focus:bg-store-brand/10 focus:text-store-ink"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
