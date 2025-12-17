import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserBadge } from './UserBadge';
import { formatBRL } from '../utils/format';
import { cn } from '@/lib/utils';

interface OfferData {
  id: string;
  owner?: {
    handle?: string;
    avatarUrl?: string | null;
    userId?: string;
  } | null;
  ownerStats?: {
    avgStars?: number | null;
    totalTrades?: number;
    completionRate?: number | null;
    volume30dBRL?: number;
    volume30dBZR?: number;
  } | null;
  priceBRLPerBZR?: string;
  priceBRLPerUnit?: string | null;
  minBRL: string;
  maxBRL: string;
  method?: 'PIX';
  assetType?: 'BZR' | 'ZARI';
  phase?: string | null;
  side: 'SELL_BZR' | 'BUY_BZR';
}

interface OfferCardProps {
  offer: OfferData;
  actionType: 'buy' | 'sell';
  onAction: () => void;
  className?: string;
}

export function OfferCard({
  offer,
  actionType,
  onAction,
  className,
}: OfferCardProps) {
  const { t } = useTranslation();

  const assetType = offer.assetType || 'BZR';
  const price = assetType === 'ZARI' ? offer.priceBRLPerUnit : offer.priceBRLPerBZR;
  const priceNum = parseFloat(price || '0');

  const actionLabel =
    actionType === 'buy'
      ? t('p2p.actions.buy', 'Comprar') + ` ${assetType}`
      : t('p2p.actions.sell', 'Vender') + ` ${assetType}`;

  return (
    <Card
      className={cn(
        'transition-all hover:shadow-md hover:border-primary/30',
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <UserBadge
            user={offer.owner || null}
            stats={offer.ownerStats ? {
              avgStars: offer.ownerStats.avgStars ?? undefined,
              totalTrades: offer.ownerStats.totalTrades,
            } : undefined}
            linkToProfile
            size="md"
          />

          <div className="flex items-center gap-2">
            <Badge variant="secondary">PIX</Badge>
            {assetType === 'ZARI' && offer.phase && (
              <Badge variant="outline">🏛️ Fase {offer.phase}</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price - large and prominent */}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{formatBRL(priceNum)}</span>
          <span className="text-muted-foreground">/ {assetType}</span>
        </div>

        {/* Limit range */}
        <div className="text-sm text-muted-foreground">
          {t('p2p.offer.range', 'Limite')}:{' '}
          <span className="font-medium text-foreground">
            {formatBRL(offer.minBRL)} – {formatBRL(offer.maxBRL)}
          </span>
        </div>

        {/* Action button */}
        <div className="flex justify-end pt-2">
          <Button onClick={onAction} className="gap-2">
            {actionLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton loader for OfferCard
 */
export function OfferCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted rounded-full" />
            <div className="space-y-1">
              <div className="h-4 bg-muted rounded w-24" />
              <div className="h-3 bg-muted rounded w-16" />
            </div>
          </div>
          <div className="h-6 bg-muted rounded w-12" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="h-8 bg-muted rounded w-32" />
        <div className="h-4 bg-muted rounded w-48" />
        <div className="flex justify-end">
          <div className="h-10 bg-muted rounded w-32" />
        </div>
      </CardContent>
    </Card>
  );
}
