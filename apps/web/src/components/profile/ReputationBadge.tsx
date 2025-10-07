import { Badge } from '../ui/badge';
import { getTierVariant, getTierColor, getTierLabel } from '@/lib/reputation';

interface ReputationBadgeProps {
  score: number;
  tier: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ReputationBadge({
  score,
  tier,
  size = 'md',
  showLabel = true
}: ReputationBadgeProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-2xl',
  };

  return (
    <div className="inline-flex items-center gap-2">
      <span className={`font-bold ${sizeClasses[size]}`}>
        {score}
      </span>
      {showLabel && (
        <Badge variant={getTierVariant(tier)}>
          <span className={getTierColor(tier)}>
            {getTierLabel(tier)}
          </span>
        </Badge>
      )}
    </div>
  );
}
