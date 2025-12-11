import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Plus,
  BookOpen,
  Layers,
  Palette,
  DollarSign,
  HelpCircle,
  Key,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface NavItem {
  label: string;
  labelKey: string;
  href: string;
  icon: typeof LayoutDashboard;
  description: string;
  descriptionKey: string;
}

const developerNavItems: NavItem[] = [
  {
    label: 'Dashboard',
    labelKey: 'developer.nav.dashboard',
    href: '/app/developer',
    icon: LayoutDashboard,
    description: 'Visão geral dos seus apps',
    descriptionKey: 'developer.nav.dashboardDesc',
  },
  {
    label: 'Criar App',
    labelKey: 'developer.nav.newApp',
    href: '/app/developer/new',
    icon: Plus,
    description: 'Publicar um novo app',
    descriptionKey: 'developer.nav.newAppDesc',
  },
  {
    label: 'API Keys',
    labelKey: 'developer.nav.apiKeys',
    href: '/app/developer/api-keys',
    icon: Key,
    description: 'Gerenciar credenciais SDK',
    descriptionKey: 'developer.nav.apiKeysDesc',
  },
  {
    label: 'Preview',
    labelKey: 'developer.nav.preview',
    href: '/app/developer/preview',
    icon: Play,
    description: 'Testar app em desenvolvimento',
    descriptionKey: 'developer.nav.previewDesc',
  },
  {
    label: 'Receita',
    labelKey: 'developer.nav.revenue',
    href: '/app/developer/revenue',
    icon: DollarSign,
    description: 'Acompanhar ganhos',
    descriptionKey: 'developer.nav.revenueDesc',
  },
  {
    label: 'Documentação',
    labelKey: 'developer.nav.docs',
    href: '/app/developer/docs',
    icon: BookOpen,
    description: 'Guias e tutoriais',
    descriptionKey: 'developer.nav.docsDesc',
  },
  {
    label: 'Templates',
    labelKey: 'developer.nav.templates',
    href: '/app/developer/templates',
    icon: Layers,
    description: 'Smart contracts prontos',
    descriptionKey: 'developer.nav.templatesDesc',
  },
  {
    label: 'Componentes',
    labelKey: 'developer.nav.components',
    href: '/app/developer/components',
    icon: Palette,
    description: 'Design System UI',
    descriptionKey: 'developer.nav.componentsDesc',
  },
  {
    label: 'Suporte',
    labelKey: 'developer.nav.support',
    href: '/app/developer/support',
    icon: HelpCircle,
    description: 'Ajuda e contato',
    descriptionKey: 'developer.nav.supportDesc',
  },
];

export function DeveloperSidebar() {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <aside className="w-64 border-r bg-muted/30 p-4 hidden md:block">
      <div className="mb-4">
        <h2 className="font-semibold text-lg">{t('developer.portal.title', 'Developer Portal')}</h2>
      </div>
      <nav className="space-y-1">
        {developerNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/app/developer'
              ? location.pathname === '/app/developer'
              : location.pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">
                  {t(item.labelKey, item.label)}
                </div>
                <div
                  className={cn(
                    'text-xs truncate',
                    isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  )}
                >
                  {t(item.descriptionKey, item.description)}
                </div>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
