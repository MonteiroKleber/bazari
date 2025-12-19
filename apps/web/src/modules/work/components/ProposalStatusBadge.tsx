// path: apps/web/src/modules/work/components/ProposalStatusBadge.tsx
// Badge de status de proposta

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ProposalStatus } from '../api';

const statusConfig: Record<
  ProposalStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: 'Pendente',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  },
  NEGOTIATING: {
    label: 'Em Negociação',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  },
  ACCEPTED: {
    label: 'Aceita',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
  },
  REJECTED: {
    label: 'Recusada',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
  },
  EXPIRED: {
    label: 'Expirada',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  },
  CANCELLED: {
    label: 'Cancelada',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  },
};

export interface ProposalStatusBadgeProps {
  status: ProposalStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export function ProposalStatusBadge({
  status,
  size = 'md',
  className,
}: ProposalStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        config.className,
        size === 'sm' && 'text-xs px-1.5 py-0',
        size === 'md' && 'text-sm px-2 py-0.5',
        className
      )}
    >
      {config.label}
    </Badge>
  );
}

export default ProposalStatusBadge;
