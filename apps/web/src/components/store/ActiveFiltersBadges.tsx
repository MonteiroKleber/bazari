import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { FilterState } from '@/hooks/useStoreFilters';

export interface ActiveFiltersBadgesProps {
  filters: FilterState;
  onRemoveFilter: (key: keyof FilterState, value?: string) => void;
  onUpdateFilter: (key: keyof FilterState, value: any) => void;
  onClearAll: () => void;
}

export function ActiveFiltersBadges({
  filters,
  onRemoveFilter,
  onUpdateFilter,
  onClearAll,
}: ActiveFiltersBadgesProps) {
  const { t } = useTranslation();

  // Gerar lista de badges ativos
  const badges: Array<{ key: keyof FilterState; label: string; value?: string }> = [];

  // Busca textual
  if (filters.q) {
    badges.push({
      key: 'q',
      label: `${t('store.catalog.filters.search', 'Busca')}: ${filters.q}`,
    });
  }

  // Tipo de item
  if (filters.kind !== 'all') {
    const kindLabel =
      filters.kind === 'product'
        ? t('store.catalog.type.product', 'Produtos')
        : t('store.catalog.type.service', 'Serviços');
    badges.push({
      key: 'kind',
      label: `${t('store.catalog.filters.type', 'Tipo')}: ${kindLabel}`,
    });
  }

  // Categorias (mostrar última categoria do path)
  filters.categoryPath.forEach((category) => {
    badges.push({
      key: 'categoryPath',
      label: `${t('store.catalog.filters.category', 'Categoria')}: ${category}`,
      value: category,
    });
  });

  // Preço
  if (filters.priceMin || filters.priceMax) {
    const min = filters.priceMin || '0';
    const max = filters.priceMax || '∞';
    badges.push({
      key: 'priceMin' as keyof FilterState,
      label: `${t('store.catalog.filters.price', 'Preço')}: ${min} - ${max} BZR`,
    });
  }

  // Atributos
  Object.entries(filters.attrs).forEach(([attrKey, values]) => {
    values.forEach((value) => {
      badges.push({
        key: 'attrs',
        label: `${attrKey}: ${value}`,
        value: `${attrKey}:${value}`,
      });
    });
  });

  // Se não há filtros ativos, não renderizar nada
  if (badges.length === 0) {
    return null;
  }

  const handleRemoveBadge = (key: keyof FilterState, value?: string) => {
    if (key === 'categoryPath' && value) {
      // Remover categoria específica do array
      const newPaths = filters.categoryPath.filter((p) => p !== value);
      onUpdateFilter('categoryPath', newPaths);
    } else if (key === 'priceMin') {
      // Remover ambos min e max
      onUpdateFilter('priceMin', '');
      onUpdateFilter('priceMax', '');
    } else if (key === 'attrs' && value) {
      // Remover atributo específico
      const [attrKey, attrValue] = value.split(':');
      const currentValues = filters.attrs[attrKey] || [];
      const newValues = currentValues.filter((v) => v !== attrValue);

      const newAttrs = { ...filters.attrs };
      if (newValues.length === 0) {
        delete newAttrs[attrKey];
      } else {
        newAttrs[attrKey] = newValues;
      }

      onUpdateFilter('attrs', newAttrs);
    } else {
      // Remover filtro simples
      onRemoveFilter(key);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2" role="list" aria-label="Filtros ativos">
      <AnimatePresence mode="popLayout">
        {badges.map((badge, index) => (
          <motion.div
            key={`${badge.key}-${badge.value || index}`}
            initial={{ opacity: 0, x: -8, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            layout
          >
            <Badge
              variant="secondary"
              className="gap-1.5 pr-1.5 bg-store-bg border border-store-ink/20 text-store-ink hover:bg-store-ink/5"
              role="listitem"
            >
              <span className="text-sm">{badge.label}</span>
              <button
                type="button"
                onClick={() => handleRemoveBadge(badge.key, badge.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRemoveBadge(badge.key, badge.value);
                  }
                }}
                className="ml-1 rounded-sm hover:bg-store-ink/10 p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-store-brand focus-visible:ring-offset-2"
                aria-label={`Remover filtro: ${badge.label}`}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Link "Limpar tudo" */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="h-auto py-1 px-2 text-sm text-store-brand hover:text-store-brand/80 hover:underline hover:bg-transparent"
      >
        {t('store.catalog.filters.clearAll', 'Limpar tudo')}
      </Button>
    </div>
  );
}
