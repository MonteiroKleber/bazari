import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { AppIcon } from './AppIcon';
import { useAppLauncher, isExternalApp } from '@/platform';
import type { BazariApp } from '@/platform/types';

interface AppCardProps {
  app: BazariApp;
  variant?: 'launcher' | 'store' | 'compact';
  onClick?: () => void;
  className?: string;
}

export function AppCard({ app, variant = 'launcher', onClick, className }: AppCardProps) {
  const { launch } = useAppLauncher();

  const statusBadge = app.status !== 'stable' && (
    <Badge
      variant={app.status === 'beta' ? 'secondary' : 'outline'}
      className="text-xs"
    >
      {app.status.toUpperCase()}
    </Badge>
  );

  const handleClick = async (e: React.MouseEvent) => {
    // Para apps externos, lançar via serviço
    if (isExternalApp(app)) {
      e.preventDefault();
      await launch(app);
      onClick?.();
      return;
    }
    onClick?.();
  };

  // Variante Launcher (para dashboard)
  if (variant === 'launcher') {
    return (
      <Link
        to={isExternalApp(app) ? '#' : app.entryPoint}
        onClick={handleClick}
        className={cn(
          'flex flex-col items-center p-4 rounded-xl',
          'bg-gradient-to-br transition-all duration-200',
          'hover:scale-105 hover:shadow-lg active:scale-95',
          app.color,
          className
        )}
      >
        <AppIcon app={app} size="lg" showBackground={false} />
        <span className="text-white font-medium text-sm mt-2 text-center">
          {app.name}
        </span>
        {statusBadge && <div className="mt-1">{statusBadge}</div>}
      </Link>
    );
  }

  // Variante Store (para listagem na loja)
  if (variant === 'store') {
    return (
      <Link
        to={`/app/store/${app.id}`}
        onClick={onClick}
        className={cn(
          'flex items-start gap-4 p-4 rounded-xl',
          'bg-card border hover:bg-accent/50',
          'transition-colors duration-200',
          className
        )}
      >
        <AppIcon app={app} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{app.name}</h3>
            {statusBadge}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {app.description}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground capitalize">
              {app.category}
            </span>
            {app.rating && (
              <span className="text-xs text-muted-foreground">
                ⭐ {app.rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Variante Compact (para listas pequenas)
  return (
    <Link
      to={isExternalApp(app) ? '#' : app.entryPoint}
      onClick={handleClick}
      className={cn(
        'flex items-center gap-3 p-2 rounded-lg',
        'hover:bg-accent/50 transition-colors',
        className
      )}
    >
      <AppIcon app={app} size="sm" />
      <span className="font-medium text-sm">{app.name}</span>
      {statusBadge}
    </Link>
  );
}
