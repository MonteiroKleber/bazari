import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface AppEmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: string;
}

export function AppEmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  icon = '📱',
}: AppEmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Button asChild>
          <Link to={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}
