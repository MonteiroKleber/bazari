// V-1 (2025-09-18): Card do vendedor com reputação e link de perfil no padrão 6 temas

import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../lib/utils';
import { apiHelpers } from '../../lib/api';
import { Button } from '../ui/button';

interface SellerCardProps {
  name?: string | null;
  reputationPercent?: number | null;
  profilePath?: string | null;
  handle?: string | null; // quando informado, habilita follow/link automáticos
  className?: string;
  onChainStats?: {
    sales?: number | null;
    positive?: number | null;
    negative?: number | null;
  } | null;
  onChainStoreId?: string | null;
}

const normalizePercent = (value?: number | null): number | null => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  const clamped = Math.max(0, Math.min(100, value));
  return Math.round(clamped);
};

export function SellerCard({ name, reputationPercent, profilePath, handle, className, onChainStats, onChainStoreId }: SellerCardProps) {
  const { t } = useTranslation();
  const totalOnChainFeedback = onChainStats
    ? (Number(onChainStats.positive ?? 0) || 0) + (Number(onChainStats.negative ?? 0) || 0)
    : 0;
  const onChainPercent = totalOnChainFeedback > 0 && onChainStats
    ? (Number(onChainStats.positive ?? 0) / totalOnChainFeedback) * 100
    : null;
  const onChainPercentRounded = normalizePercent(onChainPercent ?? null);
  const normalizedPercent = normalizePercent(reputationPercent ?? onChainPercent ?? null);
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [followersCount, setFollowersCount] = useState<number | null>(null);
  const computedProfilePath = profilePath || (handle ? `/u/${handle}` : null);

  useEffect(() => {
    let active = true;
    if (handle) {
      apiHelpers
        .getPublicProfile(handle)
        .then((res: any) => {
          if (!active) return;
          setFollowersCount(res?.counts?.followers ?? null);
          setIsFollowing(res?.viewer?.isFollowing ?? false);
        })
        .catch(() => {
          if (!active) return;
          setIsFollowing(false);
        });
    } else {
      setIsFollowing(null);
      setFollowersCount(null);
    }
    return () => {
      active = false;
    };
  }, [handle]);

  if (!name && normalizedPercent === null && !profilePath) {
    return null;
  }

  const displayName = name?.trim() || t('pdp.sellerNameFallback', { defaultValue: 'Vendedor' });
  const reputationText =
    normalizedPercent !== null
      ? t('pdp.sellerReputation', {
          percent: normalizedPercent,
          defaultValue: `Reputação ${normalizedPercent}%`,
        })
      : null;

  return (
    <section aria-labelledby="pdp-seller">
      <Card className={cn('rounded-2xl border border-border bg-card shadow-sm', className)}>
        <CardHeader className="pb-2">
          <CardTitle id="pdp-seller" className="text-lg font-semibold text-foreground">
            {t('pdp.seller')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground break-words overflow-wrap-anywhere">
          <p className="text-base font-medium text-foreground">{displayName}</p>

          {reputationText ? (
            <p aria-label={t('pdp.sellerReputationAria', {
              percent: normalizedPercent,
              defaultValue: `Reputação ${normalizedPercent}%`,
            })}
            >
              {reputationText}
            </p>
          ) : null}

          {onChainStats && (onChainStats.sales || onChainStats.positive || onChainStats.negative) ? (
            <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
              {typeof onChainStats.sales === 'number' && onChainStats.sales > 0 && (
                <p>{t('store.onchain.repSales', { defaultValue: 'Vendas' })}: {onChainStats.sales}</p>
              )}
              {totalOnChainFeedback > 0 && (
                <p>
                  {t('store.onchain.repPositive', { defaultValue: 'Feedback positivo' })}:{' '}
                  {onChainPercentRounded != null ? `${onChainPercentRounded}%` : '—'} ({totalOnChainFeedback})
                </p>
              )}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3" aria-live="polite">
            {typeof followersCount === 'number' && (
              <span className="text-xs text-muted-foreground">{followersCount} {t('profile.followers')}</span>
            )}
            {computedProfilePath ? (
              <Link
                to={computedProfilePath}
                className="inline-flex items-center text-sm font-medium text-primary underline-offset-4 hover:underline break-words"
              >
                {t('pdp.seeProfile')}
              </Link>
            ) : null}
            {onChainStoreId ? (
              <Link
                to={`/loja/${onChainStoreId}`}
                className="inline-flex items-center text-sm font-medium text-primary/80 underline-offset-4 hover:underline break-words"
              >
                {t('store.onchain.openPublic', { defaultValue: 'Ver loja on-chain' })}
              </Link>
            ) : null}
            {handle ? (
              <Button
                size="sm"
                variant={isFollowing ? 'secondary' : 'default'}
                onClick={async () => {
                  if (!handle) return;
                  try {
                    if (!isFollowing) {
                      setIsFollowing(true);
                      const r: any = await apiHelpers.follow(handle);
                      setFollowersCount(r?.counts?.target?.followers ?? followersCount);
                    } else {
                      setIsFollowing(false);
                      const r: any = await apiHelpers.unfollow(handle);
                      setFollowersCount(r?.counts?.target?.followers ?? followersCount);
                    }
                  } catch (e) {
                    // reverte
                    setIsFollowing((v) => !v);
                  }
                }}
                aria-live="polite"
              >
                {isFollowing ? t('pdp.unfollow', { defaultValue: 'Deixar de seguir' }) : t('pdp.follow', { defaultValue: 'Seguir' })}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export default SellerCard;
