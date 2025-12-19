// path: apps/web/src/modules/pay/components/PayNotificationCard.tsx
// Bazari Pay - Notification Card Component (PROMPT-05)

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  CheckCircle,
  XCircle,
  PauseCircle,
  PlayCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

type PayNotificationType =
  | 'CONTRACT_CREATED'
  | 'CONTRACT_PAUSED'
  | 'CONTRACT_RESUMED'
  | 'CONTRACT_CLOSED'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'ADJUSTMENT_PENDING'
  | 'ADJUSTMENT_APPROVED'
  | 'ADJUSTMENT_REJECTED';

interface PayNotificationMeta {
  type: PayNotificationType;
  contractId: string;
  executionId?: string;
  adjustmentId?: string;
  value?: string;
  reason?: string;
  receiptUrl?: string;
}

interface PayNotificationCardProps {
  meta: PayNotificationMeta;
  content: string;
  timestamp: string;
}

const notificationConfig: Record<
  PayNotificationType,
  { icon: React.ComponentType<{ className?: string }>; color: string; label: string }
> = {
  CONTRACT_CREATED: { icon: FileText, color: 'bg-blue-100 text-blue-700', label: 'Novo Contrato' },
  CONTRACT_PAUSED: { icon: PauseCircle, color: 'bg-yellow-100 text-yellow-700', label: 'Pausado' },
  CONTRACT_RESUMED: { icon: PlayCircle, color: 'bg-green-100 text-green-700', label: 'Retomado' },
  CONTRACT_CLOSED: { icon: XCircle, color: 'bg-gray-100 text-gray-700', label: 'Encerrado' },
  PAYMENT_SUCCESS: { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: 'Pagamento' },
  PAYMENT_FAILED: { icon: AlertCircle, color: 'bg-red-100 text-red-700', label: 'Falha' },
  ADJUSTMENT_PENDING: { icon: Clock, color: 'bg-orange-100 text-orange-700', label: 'Ajuste Pendente' },
  ADJUSTMENT_APPROVED: { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: 'Ajuste Aprovado' },
  ADJUSTMENT_REJECTED: { icon: XCircle, color: 'bg-red-100 text-red-700', label: 'Ajuste Rejeitado' },
};

export function PayNotificationCard({ meta, content, timestamp }: PayNotificationCardProps) {
  const config = notificationConfig[meta.type];
  const Icon = config.icon;

  const formatValue = (value: string) => {
    const num = parseFloat(value) / 1e12;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${config.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={config.color}>
                {config.label}
              </Badge>
              <span className="text-xs text-muted-foreground">{formatDate(timestamp)}</span>
            </div>
            <p className="text-sm">{content}</p>
            {meta.value && (
              <p className="text-sm font-medium mt-1">{formatValue(meta.value)} BZR</p>
            )}
            {meta.reason && (
              <p className="text-xs text-muted-foreground mt-1">Motivo: {meta.reason}</p>
            )}
            <div className="flex gap-2 mt-3">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/app/pay/contracts/${meta.contractId}`}>Ver Contrato</Link>
              </Button>
              {meta.receiptUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={meta.receiptUrl} target="_blank" rel="noopener noreferrer">
                    Comprovante
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function isPayNotification(meta: unknown): meta is PayNotificationMeta {
  if (!meta || typeof meta !== 'object') return false;
  const m = meta as Record<string, unknown>;
  return (
    typeof m.type === 'string' &&
    typeof m.contractId === 'string' &&
    [
      'CONTRACT_CREATED',
      'CONTRACT_PAUSED',
      'CONTRACT_RESUMED',
      'CONTRACT_CLOSED',
      'PAYMENT_SUCCESS',
      'PAYMENT_FAILED',
      'ADJUSTMENT_PENDING',
      'ADJUSTMENT_APPROVED',
      'ADJUSTMENT_REJECTED',
    ].includes(m.type)
  );
}
