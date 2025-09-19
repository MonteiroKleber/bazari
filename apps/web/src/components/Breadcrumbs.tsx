// V-1 (2025-09-18): Simple breadcrumbs component for PDP routes

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface BreadcrumbsProps {
  categoryPath?: string[];
  title?: string;
}

const formatSegment = (segment: string) =>
  segment
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

export function Breadcrumbs({ categoryPath = [], title }: BreadcrumbsProps) {
  const { t } = useTranslation();
  const segments = categoryPath.filter(Boolean);

  return (
    <nav aria-label="breadcrumb" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link to="/" className="hover:text-foreground">
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
            <span className="text-foreground font-semibold">{title}</span>
          </li>
        ) : null}
      </ol>
    </nav>
  );
}
