// V-2 (2025-10-01): Enhanced breadcrumbs - generic items[] API + backward compatibility
// V-1 (2025-09-18): Simple breadcrumbs component for PDP routes

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  // Nova API genérica (preferida)
  items?: BreadcrumbItem[];
  className?: string;
  // API antiga (backward compatibility)
  categoryPath?: string[];
  title?: string;
}

const formatSegment = (segment: string) =>
  segment
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

/**
 * Breadcrumbs - Navegação hierárquica com suporte a duas APIs
 *
 * Nova API (recomendada):
 *   <Breadcrumbs items={[
 *     { label: 'Dashboard', href: '/app' },
 *     { label: 'Lojas', href: '/app/sellers' },
 *     { label: 'Produtos' }
 *   ]} />
 *
 * API antiga (compatibilidade):
 *   <Breadcrumbs categoryPath={['products', 'tech']} title="Notebook" />
 *
 * Acessibilidade:
 * - aria-label="Breadcrumb"
 * - aria-current="page" no último item
 * - Separadores com aria-hidden
 * - Focus visível com outline
 */
export function Breadcrumbs({ items, className, categoryPath = [], title }: BreadcrumbsProps) {
  const { t } = useTranslation();

  // Se items foi fornecido, usar nova API
  if (items && items.length > 0) {
    return (
      <nav
        aria-label="Breadcrumb"
        className={cn("text-sm text-muted-foreground mb-4", className)}
      >
        <ol className="flex flex-wrap items-center gap-2">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;

            return (
              <li key={index} className="flex items-center gap-2">
                {!isLast && item.href ? (
                  <>
                    <Link
                      to={item.href}
                      className="hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded px-1"
                    >
                      {item.label}
                    </Link>
                    <ChevronRight className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  </>
                ) : (
                  <span
                    className={cn("font-medium", isLast && "text-foreground")}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  // Fallback para API antiga (categoryPath + title)
  const segments = categoryPath.filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm text-muted-foreground mb-4", className)}>
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link
            to="/"
            className="hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded px-1"
          >
            {t('pdp.breadcrumb_home', { defaultValue: 'Início' })}
          </Link>
        </li>
        {segments.map((segment, index) => {
          const label = formatSegment(segment);
          const isLast = index === segments.length - 1 && !title;
          return (
            <li key={`${segment}-${index}`} className="flex items-center gap-1">
              <span aria-hidden className="text-muted-foreground">/</span>
              <span className={isLast ? 'text-foreground font-medium' : ''}>{label}</span>
            </li>
          );
        })}
        {title ? (
          <li className="flex items-center gap-1">
            <span aria-hidden className="text-muted-foreground">/</span>
            <span className="text-foreground font-semibold" aria-current="page">{title}</span>
          </li>
        ) : null}
      </ol>
    </nav>
  );
}
