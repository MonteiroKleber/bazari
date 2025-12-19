// path: apps/web/src/modules/pay/components/AdjustmentStatus.tsx
// Badge de status de ajuste (PROMPT-03)

import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  CheckCheck,
  Ban,
} from 'lucide-react';
import type { AdjustmentStatus as AdjustmentStatusType } from '../api';

interface AdjustmentStatusProps {
  status: AdjustmentStatusType;
  showIcon?: boolean;
}

const statusConfig: Record<
  AdjustmentStatusType,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }
> = {
  DRAFT: {
    label: 'Rascunho',
    variant: 'outline',
    icon: <FileText className="h-3 w-3" />,
  },
  PENDING_APPROVAL: {
    label: 'Aguardando Aprovação',
    variant: 'secondary',
    icon: <Clock className="h-3 w-3" />,
  },
  APPROVED: {
    label: 'Aprovado',
    variant: 'default',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  REJECTED: {
    label: 'Rejeitado',
    variant: 'destructive',
    icon: <XCircle className="h-3 w-3" />,
  },
  APPLIED: {
    label: 'Aplicado',
    variant: 'default',
    icon: <CheckCheck className="h-3 w-3" />,
  },
  CANCELLED: {
    label: 'Cancelado',
    variant: 'outline',
    icon: <Ban className="h-3 w-3" />,
  },
};

export function AdjustmentStatus({ status, showIcon = true }: AdjustmentStatusProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className="gap-1">
      {showIcon && config.icon}
      {config.label}
    </Badge>
  );
}
