import { BADGE_CONFIG, TIER_COLORS, TIER_NAMES } from '@/config/badges';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface BadgeIconProps {
  badge: {
    slug: string;
    name: string;
    description: string;
    tier: number;
  };
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8'
};

export function BadgeIcon({
  badge,
  size = 'md',
  showTooltip = true,
  className
}: BadgeIconProps) {
  const config = BADGE_CONFIG[badge.slug];

  if (!config) {
    console.warn(`Badge config not found for: ${badge.slug}`);
    return null;
  }

  const Icon = config.icon;
  const colorClass = TIER_COLORS[badge.tier] || TIER_COLORS[1];
  const tierName = TIER_NAMES[badge.tier] || 'Bronze';
  const stars = '★'.repeat(badge.tier);

  const iconElement = (
    <Icon
      className={cn(
        sizeClasses[size],
        colorClass,
        className
      )}
    />
  );

  if (!showTooltip) {
    return iconElement;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help">
            {iconElement}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm space-y-1">
            <div className="font-semibold">{badge.name}</div>
            <div className="text-xs text-muted-foreground">
              {badge.description}
            </div>
            <div className="text-xs flex items-center gap-1">
              <span className="text-yellow-500">{stars}</span>
              <span className="text-muted-foreground">{tierName}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Versão simplificada para mostrar múltiplos badges
export function BadgeList({ badges, max = 3 }: { badges: any[]; max?: number }) {
  const displayBadges = badges.slice(0, max);
  const remaining = badges.length - max;

  return (
    <div className="flex items-center gap-1">
      {displayBadges.map((badge) => (
        <BadgeIcon key={badge.slug} badge={badge} size="sm" />
      ))}
      {remaining > 0 && (
        <span className="text-xs text-muted-foreground">
          +{remaining}
        </span>
      )}
    </div>
  );
}
