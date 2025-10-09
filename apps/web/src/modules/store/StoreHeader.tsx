import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { API_BASE_URL } from '@/config';

export interface StoreOwner {
  handle?: string;
  displayName?: string;
  avatarUrl?: string | null;
}

export interface StoreProfile {
  shopName: string;
  shopSlug: string;
  about?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
}

interface StoreHeaderProps {
  seller: StoreProfile | null;
  owner?: StoreOwner | null;
  onChainReputation?: {
    sales?: number | null;
    positive?: number | null;
    negative?: number | null;
    volumePlanck?: string | number | null;
  } | null;
  onChainStoreId?: string | null;
}

function resolveMediaUrl(u?: string | null): string {
  if (!u) return '';
  try {
    const absolute = new URL(u);
    return absolute.toString();
  } catch {
    const base = API_BASE_URL || 'http://localhost:3000';
    return new URL(u.startsWith('/') ? u : `/${u}`, base).toString();
  }
}

export function StoreHeader({ seller, owner, onChainReputation, onChainStoreId }: StoreHeaderProps) {
  const { t } = useTranslation();

  const bannerUrl = useMemo(() => resolveMediaUrl(seller?.bannerUrl), [seller?.bannerUrl]);
  const avatarUrl = useMemo(() => resolveMediaUrl(seller?.avatarUrl), [seller?.avatarUrl]);

  const positiveCount = onChainReputation?.positive ?? null;
  const negativeCount = onChainReputation?.negative ?? null;
  const salesCount = onChainReputation?.sales ?? null;
  const totalFeedback =
    typeof positiveCount === 'number' && typeof negativeCount === 'number'
      ? positiveCount + negativeCount
      : null;
  const positivePercent =
    totalFeedback && totalFeedback > 0 && typeof positiveCount === 'number'
      ? Math.round((positiveCount / totalFeedback) * 100)
      : null;

  if (!seller) return null;

  return (
    <Card className="overflow-hidden border border-store-ink/10 bg-store-bg/95 text-store-ink shadow-sm">
      {bannerUrl && (
        <div className="h-40 w-full overflow-hidden bg-store-brand/20">
          <img src={bannerUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      )}
      <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-full border border-store-ink/10 bg-store-brand/15">
              {avatarUrl ? (
                <img src={avatarUrl} alt={seller.shopName} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-medium text-store-ink/80">
                  {seller.shopName.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-semibold leading-tight lg:text-3xl">{seller.shopName}</h1>
              <p className="text-sm text-store-ink/70">@{seller.shopSlug}</p>
              {seller.ratingAvg != null && seller.ratingCount != null && (
                <p className="mt-2 text-sm text-store-ink/70">
                  {t('seller.public.rating', { defaultValue: 'Reputação' })}: {Number(seller.ratingAvg).toFixed(1)} ({seller.ratingCount})
                </p>
              )}
              {positivePercent !== null && totalFeedback !== null && (
                <p className="mt-1 text-sm text-store-ink/70">
                  {t('store.onchain.repPositive', { defaultValue: 'Feedback positivo' })}: {positivePercent}% ({totalFeedback})
                </p>
              )}
              {typeof salesCount === 'number' && salesCount > 0 && (
                <p className="mt-1 text-sm text-store-ink/70">
                  {t('store.onchain.repSales', { defaultValue: 'Vendas' })}: {salesCount}
                </p>
              )}
            </div>
          </div>
          {seller.about && (
            <p className="max-w-3xl whitespace-pre-line text-sm text-store-ink/80 lg:ml-6 lg:text-base">
              {seller.about}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 text-sm text-store-ink/70 lg:items-end">
          {owner?.handle && (
            <Link to={`/u/${owner.handle}`} className="text-store-accent underline underline-offset-4">
              {owner.displayName || owner.handle}
            </Link>
          )}
          {onChainStoreId && (
            <Link to={`/loja/${onChainStoreId}`} className="text-xs font-medium text-store-brand underline underline-offset-4">
              {t('store.onchain.openPublic', { defaultValue: 'Ver loja on-chain' })}
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default StoreHeader;
