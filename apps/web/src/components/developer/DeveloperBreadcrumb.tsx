import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const pathLabels: Record<string, string> = {
  developer: 'Developer Portal',
  new: 'Criar App',
  apps: 'Apps',
  revenue: 'Receita',
  docs: 'Documentação',
  templates: 'Templates',
  components: 'Componentes',
  support: 'Suporte',
  monetization: 'Monetização',
  analytics: 'Analytics',
};

export function DeveloperBreadcrumb() {
  const location = useLocation();
  const { t } = useTranslation();

  const pathSegments = location.pathname
    .replace('/app/', '')
    .split('/')
    .filter(Boolean);

  // Don't render on the main developer page
  if (pathSegments.length <= 1 && pathSegments[0] === 'developer') {
    return null;
  }

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <Link
        to="/app/hub"
        className="hover:text-foreground transition-colors"
        aria-label={t('developer.breadcrumb.home', 'Home')}
      >
        <Home className="h-4 w-4" />
      </Link>

      {pathSegments.map((segment, index) => {
        const path = '/app/' + pathSegments.slice(0, index + 1).join('/');
        const isLast = index === pathSegments.length - 1;
        const label = pathLabels[segment] || segment;
        const translatedLabel = t(`developer.breadcrumb.${segment}`, label);

        return (
          <div key={path} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            {isLast ? (
              <span className="text-foreground font-medium">{translatedLabel}</span>
            ) : (
              <Link
                to={path}
                className="hover:text-foreground transition-colors"
              >
                {translatedLabel}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
