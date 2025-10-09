import { Badge } from '@/components/ui/badge';
import { CheckCircle2, FileEdit, AlertTriangle, RefreshCw, Database } from 'lucide-react';

type SyncStatus = 'DRAFT' | 'PUBLISHING' | 'SYNCED' | 'DIVERGED' | 'FALLBACK';

interface SyncBadgeProps {
  status: SyncStatus;
  source?: 'ipfs' | 'postgres';
  className?: string;
}

export function SyncBadge({ status, source, className }: SyncBadgeProps) {
  const configs: Record<SyncStatus, {
    icon: typeof FileEdit;
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    className?: string;
  }> = {
    DRAFT: {
      icon: FileEdit,
      label: 'Rascunho',
      variant: 'secondary',
    },
    PUBLISHING: {
      icon: RefreshCw,
      label: 'Publicando...',
      variant: 'default',
      className: 'animate-pulse',
    },
    SYNCED: {
      icon: CheckCircle2,
      label: source === 'ipfs' ? 'Sincronizado (IPFS)' : 'Sincronizado',
      variant: 'default',
      className: 'bg-green-500',
    },
    DIVERGED: {
      icon: AlertTriangle,
      label: 'Divergente',
      variant: 'destructive',
    },
    FALLBACK: {
      icon: Database,
      label: 'Fallback (Cache)',
      variant: 'secondary',
      className: 'bg-yellow-600',
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={`${config.className || ''} ${className || ''}`}
    >
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  );
}
