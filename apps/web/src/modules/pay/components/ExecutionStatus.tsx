// path: apps/web/src/modules/pay/components/ExecutionStatus.tsx
// Badge de status de execução (PROMPT-02)

import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Clock, RefreshCw, SkipForward } from 'lucide-react';
import type { ExecutionStatus as ExecutionStatusType } from '../api';

interface ExecutionStatusProps {
  status: ExecutionStatusType;
  className?: string;
  showIcon?: boolean;
}

const statusConfig: Record<
  ExecutionStatusType,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    icon: typeof CheckCircle;
    color: string;
  }
> = {
  SCHEDULED: {
    label: 'Agendado',
    variant: 'outline',
    icon: Clock,
    color: 'text-muted-foreground',
  },
  PROCESSING: {
    label: 'Processando',
    variant: 'secondary',
    icon: Loader2,
    color: 'text-blue-500',
  },
  SUCCESS: {
    label: 'Sucesso',
    variant: 'default',
    icon: CheckCircle,
    color: 'text-green-500',
  },
  FAILED: {
    label: 'Falhou',
    variant: 'destructive',
    icon: XCircle,
    color: 'text-red-500',
  },
  RETRYING: {
    label: 'Tentando novamente',
    variant: 'secondary',
    icon: RefreshCw,
    color: 'text-amber-500',
  },
  SKIPPED: {
    label: 'Ignorado',
    variant: 'outline',
    icon: SkipForward,
    color: 'text-muted-foreground',
  },
};

export function ExecutionStatus({
  status,
  className,
  showIcon = true,
}: ExecutionStatusProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={className}>
      {showIcon && (
        <Icon
          className={`h-3 w-3 mr-1 ${config.color} ${
            status === 'PROCESSING' ? 'animate-spin' : ''
          }`}
        />
      )}
      {config.label}
    </Badge>
  );
}
