// V-1 (2025-09-18): Card do vendedor com reputação e link de perfil no padrão 6 temas

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../lib/utils';

interface SellerCardProps {
  name?: string | null;
  reputationPercent?: number | null;
  profilePath?: string | null;
  className?: string;
}

const normalizePercent = (value?: number | null): number | null => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  const clamped = Math.max(0, Math.min(100, value));
  return Math.round(clamped);
};

export function SellerCard({ name, reputationPercent, profilePath, className }: SellerCardProps) {
  const { t } = useTranslation();
  const normalizedPercent = normalizePercent(reputationPercent ?? null);

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

          {profilePath ? (
            <Link
              to={profilePath}
              className="inline-flex items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('pdp.seeProfile')}
            </Link>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

export default SellerCard;
