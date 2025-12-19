// path: apps/web/src/modules/pay/components/ContractStatus.tsx
// Badge de status do contrato (PROMPT-01)

import { Badge } from '@/components/ui/badge';
import type { PayContractStatus } from '../api';

interface ContractStatusProps {
  status: PayContractStatus;
  className?: string;
}

const statusConfig: Record<
  PayContractStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  ACTIVE: { label: 'Ativo', variant: 'default' },
  PAUSED: { label: 'Pausado', variant: 'secondary' },
  CLOSED: { label: 'Encerrado', variant: 'outline' },
};

export function ContractStatus({ status, className }: ContractStatusProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
