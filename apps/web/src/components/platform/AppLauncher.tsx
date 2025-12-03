import { cn } from '@/lib/utils';
import { AppCard } from './AppCard';
import type { BazariApp } from '@/platform/types';

interface AppLauncherProps {
  apps: BazariApp[];
  columns?: 2 | 3 | 4;
  variant?: 'launcher' | 'store' | 'compact';
  emptyMessage?: string;
  className?: string;
  onAppClick?: (app: BazariApp) => void;
}

const columnClasses = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
};

export function AppLauncher({
  apps,
  columns = 3,
  variant = 'launcher',
  emptyMessage = 'Nenhum app encontrado',
  className,
  onAppClick,
}: AppLauncherProps) {
  if (apps.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const gridClass = variant === 'store' ? 'flex flex-col gap-2' : `grid gap-4 ${columnClasses[columns]}`;

  return (
    <div className={cn(gridClass, className)}>
      {apps.map((app) => (
        <AppCard
          key={app.id}
          app={app}
          variant={variant}
          onClick={() => onAppClick?.(app)}
        />
      ))}
    </div>
  );
}
