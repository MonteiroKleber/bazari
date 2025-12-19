// path: apps/web/src/modules/work/components/AgreementStatusBadge.tsx
// Badge de status do acordo

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, PauseCircle, XCircle } from 'lucide-react';
import type { AgreementStatus } from '../api';

interface AgreementStatusBadgeProps {
  status: AgreementStatus;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

const statusConfig: Record<
  AgreementStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    className: string;
    icon: typeof CheckCircle2;
  }
> = {
  ACTIVE: {
    label: 'Ativo',
    variant: 'default',
    className: 'bg-green-600 hover:bg-green-600',
    icon: CheckCircle2,
  },
  PAUSED: {
    label: 'Pausado',
    variant: 'secondary',
    className: 'bg-amber-500 hover:bg-amber-500 text-white',
    icon: PauseCircle,
  },
  CLOSED: {
    label: 'Encerrado',
    variant: 'secondary',
    className: 'bg-gray-500 hover:bg-gray-500 text-white',
    icon: XCircle,
  },
};

export function AgreementStatusBadge({
  status,
  size = 'sm',
  showIcon = true,
}: AgreementStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn(
        config.className,
        size === 'md' && 'text-sm px-3 py-1'
      )}
    >
      {showIcon && <Icon className={cn('mr-1', size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />}
      {config.label}
    </Badge>
  );
}

export default AgreementStatusBadge;
