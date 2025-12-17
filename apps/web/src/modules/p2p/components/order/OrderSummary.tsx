import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserBadge } from '../UserBadge';
import { formatBRL, formatAsset } from '../../utils/format';

interface OrderSummaryProps {
  order: {
    amountBZR: string;
    amountBRL: string;
    priceBRLPerBZR?: string;
    assetType?: 'BZR' | 'ZARI';
    method?: string;
  };
  counterparty?: {
    handle?: string;
    avatarUrl?: string | null;
    displayName?: string;
  } | null;
  counterpartyStats?: {
    avgStars?: number | null;
    totalTrades?: number;
  } | null;
}

export function OrderSummary({ order, counterparty, counterpartyStats }: OrderSummaryProps) {
  const { t } = useTranslation();
  const assetType = order.assetType || 'BZR';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('p2p.orderRoom.summary', 'Resumo')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount */}
        <div>
          <div className="text-2xl font-bold">
            {formatAsset(order.amountBZR)} {assetType}
          </div>
          <div className="text-lg text-muted-foreground">
            = {formatBRL(order.amountBRL)}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          {order.priceBRLPerBZR && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('p2p.offer.price', 'Preço')}:
              </span>
              <span>{formatBRL(order.priceBRLPerBZR)} / {assetType}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {t('p2p.order.method', 'Método')}:
            </span>
            <span>{order.method || 'PIX'}</span>
          </div>
        </div>

        {/* Counterparty */}
        {counterparty && (
          <div className="pt-4 border-t">
            <div className="text-sm text-muted-foreground mb-2">
              {t('p2p.order.counterparty', 'Contraparte')}:
            </div>
            <UserBadge
              user={counterparty}
              stats={counterpartyStats ? {
                avgStars: counterpartyStats.avgStars ?? undefined,
                totalTrades: counterpartyStats.totalTrades,
              } : undefined}
              linkToProfile
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
