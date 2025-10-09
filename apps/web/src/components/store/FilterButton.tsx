import { useTranslation } from 'react-i18next';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface FilterButtonProps {
  activeCount: number;
  onClick: () => void;
}

export function FilterButton({ activeCount, onClick }: FilterButtonProps) {
  const { t } = useTranslation();

  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="lg:hidden border-store-ink/30 text-store-ink hover:bg-store-ink/5 hover:text-store-brand"
    >
      <SlidersHorizontal className="h-4 w-4 mr-2" />
      {t('store.catalog.filters.button', 'Filtros')}
      {activeCount > 0 && (
        <Badge
          variant="secondary"
          className="ml-2 bg-store-brand text-white hover:bg-store-brand"
        >
          {activeCount}
        </Badge>
      )}
    </Button>
  );
}
