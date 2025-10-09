import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';

export interface ResultsCounterProps {
  totalItems: number;
  totalWithoutFilters?: number; // Total sem filtros (opcional)
  hasActiveFilters: boolean;
  loading?: boolean;
}

/**
 * Componente de contador de resultados do catálogo
 * Mostra quantos produtos foram encontrados
 */
/**
 * Animated counter component for displaying number
 */
function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    stiffness: 100,
    damping: 30,
  });
  const display = useTransform(spring, (latest) =>
    Math.round(latest).toLocaleString('pt-BR')
  );

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return <motion.span>{display}</motion.span>;
}

export function ResultsCounter({
  totalItems,
  totalWithoutFilters,
  hasActiveFilters,
  loading = false,
}: ResultsCounterProps) {
  const { t } = useTranslation();

  // Loading skeleton
  if (loading) {
    return (
      <div
        className="flex items-center justify-center gap-2 text-sm text-store-ink/50 lg:justify-end"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>{t('store.catalog.counter.loading', { defaultValue: 'Carregando...' })}</span>
      </div>
    );
  }

  // Nenhum resultado encontrado
  if (totalItems === 0) {
    return (
      <p
        className="text-center text-sm text-store-ink/70 lg:text-right"
        role="status"
        aria-live="polite"
      >
        {t('store.catalog.counter.noResults', { defaultValue: 'Nenhum produto encontrado' })}
      </p>
    );
  }

  // Com filtros ativos (mostrar de quantos)
  if (hasActiveFilters && totalWithoutFilters && totalWithoutFilters > totalItems) {
    const itemsWord =
      totalItems === 1
        ? t('store.catalog.counter.product', { defaultValue: 'produto' })
        : t('store.catalog.counter.products', { defaultValue: 'produtos' });

    return (
      <p
        className="text-center text-sm text-store-ink/70 lg:text-right"
        role="status"
        aria-live="polite"
      >
        <AnimatedNumber value={totalItems} /> {itemsWord} {t('store.catalog.counter.found', { defaultValue: 'encontrados' })} ({t('store.catalog.counter.of', { defaultValue: 'de' })} <AnimatedNumber value={totalWithoutFilters} /> {t('store.catalog.counter.total', { defaultValue: 'total' })})
      </p>
    );
  }

  // Sem filtros ou filtros não alteraram resultado
  const itemsWord =
    totalItems === 1
      ? t('store.catalog.counter.product', { defaultValue: 'produto' })
      : t('store.catalog.counter.products', { defaultValue: 'produtos' });

  return (
    <p
      className="text-center text-sm text-store-ink/70 lg:text-right"
      role="status"
      aria-live="polite"
    >
      <AnimatedNumber value={totalItems} /> {itemsWord}
    </p>
  );
}
