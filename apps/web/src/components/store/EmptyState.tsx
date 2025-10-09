import { useTranslation } from 'react-i18next';
import { Search, Package, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export interface EmptyStateProps {
  hasFilters: boolean;
  searchTerm?: string;
  onClearFilters: () => void;
}

/**
 * Empty state component shown when no products are found
 * Provides contextual suggestions based on whether filters/search are active
 */
export function EmptyState({
  hasFilters,
  searchTerm,
  onClearFilters,
}: EmptyStateProps) {
  const { t } = useTranslation();

  // Caso 1: Nenhum filtro ativo - loja vazia
  if (!hasFilters && !searchTerm) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center py-16 px-4 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="rounded-full bg-store-ink/5 p-6 mb-6"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3, ease: 'easeOut' }}
        >
          <Package className="h-12 w-12 text-store-ink/40" aria-hidden="true" />
        </motion.div>
        <motion.h3
          className="text-lg font-semibold text-store-ink mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          {t('store.catalog.empty.noProducts', { defaultValue: 'Esta loja ainda não tem produtos' })}
        </motion.h3>
        <motion.p
          className="text-sm text-store-ink/60 max-w-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          {t('store.catalog.empty.noProductsDesc', {
            defaultValue: 'O vendedor ainda não adicionou produtos ao catálogo. Volte mais tarde para conferir novidades!',
          })}
        </motion.p>
      </motion.div>
    );
  }

  // Caso 2: Com filtros/busca - não encontrado
  const icon = searchTerm ? Search : Filter;
  const Icon = icon;

  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="rounded-full bg-store-ink/5 p-6 mb-6"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3, ease: 'easeOut' }}
      >
        <Icon className="h-12 w-12 text-store-ink/40" aria-hidden="true" />
      </motion.div>

      {/* Título */}
      <h3 className="text-lg font-semibold text-store-ink mb-2">
        {searchTerm
          ? t('store.catalog.empty.searchNoResults', {
              defaultValue: 'Nenhum produto encontrado para "{{term}}"',
              term: searchTerm,
            })
          : t('store.catalog.empty.filtersNoResults', {
              defaultValue: 'Nenhum produto encontrado',
            })}
      </h3>

      {/* Sugestões */}
      <div className="text-sm text-store-ink/70 mb-6 max-w-md">
        <p className="font-medium mb-3">
          {t('store.catalog.empty.suggestions', { defaultValue: 'Tente:' })}
        </p>
        <ul className="space-y-2 text-left inline-block">
          {searchTerm && (
            <li className="flex items-start gap-2">
              <span className="text-store-brand mt-0.5">•</span>
              <span>
                {t('store.catalog.empty.suggestOtherTerms', {
                  defaultValue: 'Buscar outros termos ou verificar a ortografia',
                })}
              </span>
            </li>
          )}
          {hasFilters && (
            <>
              <li className="flex items-start gap-2">
                <span className="text-store-brand mt-0.5">•</span>
                <span>
                  {t('store.catalog.empty.suggestAdjustFilters', {
                    defaultValue: 'Ajustar os filtros aplicados',
                  })}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-store-brand mt-0.5">•</span>
                <span>
                  {t('store.catalog.empty.suggestRemoveFilters', {
                    defaultValue: 'Remover alguns filtros para ver mais produtos',
                  })}
                </span>
              </li>
            </>
          )}
          {!searchTerm && hasFilters && (
            <li className="flex items-start gap-2">
              <span className="text-store-brand mt-0.5">•</span>
              <span>
                {t('store.catalog.empty.suggestBrowseAll', {
                  defaultValue: 'Navegar por todas as categorias',
                })}
              </span>
            </li>
          )}
        </ul>
      </div>

      {/* Botão Limpar Filtros */}
      {hasFilters && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          <Button
            onClick={onClearFilters}
            variant="outline"
            className="border-store-brand text-store-brand hover:bg-store-brand hover:text-white transition-colors"
          >
            {t('store.catalog.empty.clearFilters', { defaultValue: 'Limpar todos os filtros' })}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
