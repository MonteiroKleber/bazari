import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Flame } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RatingStars } from './RatingStars';
import { cn } from '@/lib/utils';

interface UserBadgeProps {
  user: {
    handle?: string;
    avatarUrl?: string | null;
    userId?: string;
    displayName?: string;
  } | null;
  stats?: {
    avgStars?: number;
    totalTrades?: number;
  } | null;
  isHighVolume?: boolean;
  linkToProfile?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const HIGH_VOLUME_THRESHOLD = 50;

export function UserBadge({
  user,
  stats,
  isHighVolume,
  linkToProfile = false,
  size = 'md',
  className,
}: UserBadgeProps) {
  const { t } = useTranslation();

  if (!user) {
    return (
      <span className="text-muted-foreground text-sm">
        {t('p2p.user.unknown', 'Usuário desconhecido')}
      </span>
    );
  }

  const displayName = user.handle
    ? `@${user.handle}`
    : user.displayName || user.userId?.slice(0, 8) || '???';

  const initial = (user.handle?.[0] || user.displayName?.[0] || 'U').toUpperCase();

  const showHighVolume =
    isHighVolume || (stats?.totalTrades && stats.totalTrades >= HIGH_VOLUME_THRESHOLD);

  const avatarSize = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  const content = (
    <div className={cn('flex items-center gap-2', className)}>
      <Avatar className={avatarSize}>
        <AvatarImage src={user.avatarUrl || undefined} alt={displayName} />
        <AvatarFallback className="text-xs">{initial}</AvatarFallback>
      </Avatar>

      <span className={cn('font-medium', textSize)}>{displayName}</span>

      {stats?.avgStars !== undefined && stats.avgStars > 0 && (
        <RatingStars
          value={stats.avgStars}
          readonly
          showValue
          totalReviews={stats.totalTrades}
          size={size === 'sm' ? 'sm' : 'md'}
        />
      )}

      {showHighVolume && (
        <Flame
          className={cn(
            'text-orange-500',
            size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
          )}
          aria-label={t('p2p.user.highVolume', 'Alto volume de negociações')}
        />
      )}
    </div>
  );

  if (linkToProfile && user.handle) {
    return (
      <Link
        to={`/u/${user.handle}`}
        className="hover:underline inline-flex"
        aria-label={t('p2p.user.viewProfile', 'Ver perfil de {{name}}', {
          name: displayName,
        })}
      >
        {content}
      </Link>
    );
  }

  return content;
}
