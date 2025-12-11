import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Plus, BookOpen, Key, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

const mobileNavItems = [
  { href: '/app/developer', icon: LayoutDashboard, label: 'Dashboard', labelKey: 'developer.nav.dashboard' },
  { href: '/app/developer/new', icon: Plus, label: 'Criar', labelKey: 'developer.nav.create' },
  { href: '/app/developer/preview', icon: Play, label: 'Preview', labelKey: 'developer.nav.preview' },
  { href: '/app/developer/docs', icon: BookOpen, label: 'Docs', labelKey: 'developer.nav.docs' },
];

export function DeveloperMobileNav() {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t md:hidden z-50">
      <div className="flex justify-around py-2">
        {mobileNavItems.map((item) => {
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
                'flex flex-col items-center gap-1 px-3 py-2 text-xs',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{t(item.labelKey, item.label)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
