import { useTranslation } from 'react-i18next';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

export interface CatalogPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

const MAX_VISIBLE_PAGES = 5;

/**
 * Componente de paginação para catálogo de produtos
 */
export function CatalogPagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: CatalogPaginationProps) {
  const { t } = useTranslation();

  // Se só há uma página ou nenhum item, não renderizar
  if (totalPages <= 1 || totalItems === 0) {
    return null;
  }

  // Calcular range de itens exibidos
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Gerar array de números de página a exibir
  const pageNumbers = generatePageNumbers(currentPage, totalPages, MAX_VISIBLE_PAGES);

  // Handlers
  const handlePageClick = (page: number) => {
    if (page === currentPage) return;
    onPageChange(page);
    // Scroll to top suave
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      handlePageClick(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      handlePageClick(currentPage + 1);
    }
  };

  return (
    <div className="mt-8 space-y-4">
      {/* Informação de itens */}
      <p className="text-center text-sm text-store-ink/70">
        {t('store.catalog.pagination.showing', {
          defaultValue: 'Mostrando {{start}}-{{end}} de {{total}} produtos',
          start: startItem,
          end: endItem,
          total: totalItems,
        })}
      </p>

      {/* Paginação */}
      <Pagination>
        <PaginationContent>
          {/* Botão Anterior */}
          <PaginationItem>
            <PaginationPrevious
              onClick={handlePrevious}
              className={cn(
                'cursor-pointer border-store-ink/20 text-store-ink hover:bg-store-ink/5 hover:text-store-brand',
                currentPage === 1 && 'pointer-events-none opacity-50'
              )}
            >
              <span className="hidden sm:inline">
                {t('store.catalog.pagination.previous', { defaultValue: 'Anterior' })}
              </span>
            </PaginationPrevious>
          </PaginationItem>

          {/* Números de página */}
          {pageNumbers.map((pageNum, index) => {
            if (pageNum === 'ellipsis-start' || pageNum === 'ellipsis-end') {
              return (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              );
            }

            const page = pageNum as number;
            const isActive = page === currentPage;

            return (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => handlePageClick(page)}
                  isActive={isActive}
                  className={cn(
                    'cursor-pointer',
                    isActive
                      ? 'border-store-brand bg-store-brand/10 text-store-brand hover:bg-store-brand/20'
                      : 'border-store-ink/20 text-store-ink hover:bg-store-ink/5 hover:text-store-brand'
                  )}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            );
          })}

          {/* Botão Próxima */}
          <PaginationItem>
            <PaginationNext
              onClick={handleNext}
              className={cn(
                'cursor-pointer border-store-ink/20 text-store-ink hover:bg-store-ink/5 hover:text-store-brand',
                currentPage === totalPages && 'pointer-events-none opacity-50'
              )}
            >
              <span className="hidden sm:inline">
                {t('store.catalog.pagination.next', { defaultValue: 'Próxima' })}
              </span>
            </PaginationNext>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

/**
 * Gera array de números de página a exibir com ellipsis
 * Exemplo: [1, 'ellipsis-start', 4, 5, 6, 'ellipsis-end', 10]
 */
function generatePageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible: number
): Array<number | 'ellipsis-start' | 'ellipsis-end'> {
  // Se total de páginas <= maxVisible, mostrar todas
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: Array<number | 'ellipsis-start' | 'ellipsis-end'> = [];
  const halfVisible = Math.floor((maxVisible - 2) / 2); // -2 para primeira e última página

  // Sempre mostrar primeira página
  pages.push(1);

  // Calcular range ao redor da página atual
  let startPage = Math.max(2, currentPage - halfVisible);
  let endPage = Math.min(totalPages - 1, currentPage + halfVisible);

  // Ajustar range se estiver muito no início ou fim
  if (currentPage <= halfVisible + 2) {
    endPage = Math.min(totalPages - 1, maxVisible - 1);
  } else if (currentPage >= totalPages - halfVisible - 1) {
    startPage = Math.max(2, totalPages - maxVisible + 2);
  }

  // Adicionar ellipsis início se necessário
  if (startPage > 2) {
    pages.push('ellipsis-start');
  }

  // Adicionar páginas do range
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  // Adicionar ellipsis fim se necessário
  if (endPage < totalPages - 1) {
    pages.push('ellipsis-end');
  }

  // Sempre mostrar última página (se não for a primeira)
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

/**
 * Utility para combinar classes (compatível com cn de lib/utils)
 */
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
