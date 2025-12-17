import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { CountdownTimer } from '../CountdownTimer';

interface OrderHeaderProps {
  order: {
    id: string;
    status: string;
    side: 'SELL_BZR' | 'BUY_BZR';
    expiresAt?: string;
    assetType?: 'BZR' | 'ZARI';
  };
  counterpartyHandle?: string;
  onReload?: () => void;
}

const statusLabels: Record<string, { key: string; default: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  AWAITING_ESCROW: { key: 'p2p.status.awaitingEscrow', default: 'Aguardando Escrow', variant: 'secondary' },
  AWAITING_FIAT_PAYMENT: { key: 'p2p.status.awaitingPayment', default: 'Aguardando PIX', variant: 'default' },
  AWAITING_CONFIRMATION: { key: 'p2p.status.awaitingConfirmation', default: 'Aguardando Confirmação', variant: 'default' },
  RELEASED: { key: 'p2p.status.released', default: 'Concluída', variant: 'outline' },
  CANCELLED: { key: 'p2p.status.cancelled', default: 'Cancelada', variant: 'destructive' },
  EXPIRED: { key: 'p2p.status.expired', default: 'Expirada', variant: 'destructive' },
  DISPUTE_OPEN: { key: 'p2p.status.disputeOpen', default: 'Disputa Aberta', variant: 'destructive' },
};

export function OrderHeader({ order, counterpartyHandle, onReload }: OrderHeaderProps) {
  const { t } = useTranslation();

  const status = statusLabels[order.status] || {
    key: 'p2p.status.unknown',
    default: order.status,
    variant: 'secondary' as const,
  };

  const assetType = order.assetType || 'BZR';
  const isActive = ['AWAITING_ESCROW', 'AWAITING_FIAT_PAYMENT', 'AWAITING_CONFIRMATION'].includes(order.status);
  const actionText = order.side === 'SELL_BZR'
    ? t('p2p.order.buying', 'Comprando')
    : t('p2p.order.selling', 'Vendendo');

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold">
          {t('p2p.order.title', 'Ordem #{{id}}', { id: order.id.slice(0, 8) })}
        </h1>
        <p className="text-muted-foreground text-sm">
          {actionText} {assetType}
          {counterpartyHandle && (
            <> {t('p2p.order.with', 'de')} @{counterpartyHandle}</>
          )}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {isActive && order.expiresAt && (
          <CountdownTimer
            expiresAt={order.expiresAt}
            onExpire={onReload}
            size="md"
          />
        )}
        <Badge variant={status.variant}>
          {t(status.key, status.default)}
        </Badge>
      </div>
    </div>
  );
}
