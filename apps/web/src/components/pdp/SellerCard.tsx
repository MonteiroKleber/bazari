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
}

const normalizePercent = (value?: number | null): number | null => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  const clamped = Math.max(0, Math.min(100, value));
  return Math.round(clamped);
};

export function SellerCard({ name, reputationPercent, profilePath, handle, className }: SellerCardProps) {
  const { t } = useTranslation();
  const normalizedPercent = normalizePercent(reputationPercent ?? null);
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
        <CardContent className="space-y-3 text-sm text-muted-foreground">
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

          <div className="flex items-center gap-3" aria-live="polite">
            {typeof followersCount === 'number' && (
              <span className="text-xs text-muted-foreground">{followersCount} {t('profile.followers')}</span>
            )}
            {computedProfilePath ? (
              <Link
                to={computedProfilePath}
                className="inline-flex items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {t('pdp.seeProfile')}
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
