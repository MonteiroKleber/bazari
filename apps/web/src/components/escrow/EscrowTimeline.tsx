import { useTranslation } from 'react-i18next';
import { Package, Shield, Calendar, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * EscrowTimeline - Display delivery and protection timeline
 *
 * PROPOSAL-001 Section 4.4: Shows both delivery estimate AND protection period
 * to help users understand why the auto-release is longer than delivery time.
 *
 * Shows:
 * - 📦 Estimated Delivery: X days (date)
 * - 🔒 Protection Until: Y days (date)
 * - Info: "You have Z days after delivery to confirm or dispute"
 *
 * @example
 * <EscrowTimeline
 *   createdAt={order.createdAt}
 *   estimatedDeliveryDays={15}
 *   autoReleaseBlocks={316800}
 * />
 */

const BLOCKS_PER_DAY = 14_400;
const SAFETY_MARGIN_DAYS = 7;

interface EscrowTimelineProps {
  /** Order creation date */
  createdAt: string | Date;

  /** Estimated delivery in days */
  estimatedDeliveryDays: number;

  /** Auto-release in blocks (from blockchain) */
  autoReleaseBlocks: number;

  /** Custom className */
  className?: string;

  /** Compact mode (horizontal layout) */
  compact?: boolean;
}

export function EscrowTimeline({
  createdAt,
  estimatedDeliveryDays,
  autoReleaseBlocks,
  className,
  compact = false,
}: EscrowTimelineProps) {
  const { t } = useTranslation();

  // Calculate dates
  const createdDate = new Date(createdAt);
  const autoReleaseDays = Math.ceil(autoReleaseBlocks / BLOCKS_PER_DAY);

  const deliveryDate = new Date(createdDate);
  deliveryDate.setDate(deliveryDate.getDate() + estimatedDeliveryDays);

  const protectionDate = new Date(createdDate);
  protectionDate.setDate(protectionDate.getDate() + autoReleaseDays);

  // Calculate safety margin (days after delivery for buyer to confirm)
  const safetyDays = autoReleaseDays - estimatedDeliveryDays;

  // Format date for display
  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
    });
  };

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-4 text-sm p-3 bg-muted/50 rounded-lg',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-muted-foreground">
            {t('escrowTimeline.deliveryCompact')}:
          </span>
          <span className="font-medium">
            {formatDateShort(deliveryDate)} ({estimatedDeliveryDays}d)
          </span>
        </div>
        <span className="text-muted-foreground">→</span>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-muted-foreground">
            {t('escrowTimeline.protectionCompact')}:
          </span>
          <span className="font-medium">
            {formatDateShort(protectionDate)} ({autoReleaseDays}d)
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        {t('escrowTimeline.title')}
      </h4>

      {/* Timeline Items */}
      <div className="space-y-2">
        {/* Estimated Delivery */}
        <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900/50">
          <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-1.5">
            <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {t('escrowTimeline.delivery')}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm">
                {deliveryDate.toLocaleDateString(undefined, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
              <span className="text-xs text-muted-foreground">
                ({estimatedDeliveryDays} {t('escrowTimeline.days')})
              </span>
            </div>
          </div>
        </div>

        {/* Protection Until (Auto-release) */}
        <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-100 dark:border-green-900/50">
          <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-1.5">
            <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              {t('escrowTimeline.protection')}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm">
                {protectionDate.toLocaleDateString(undefined, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
              <span className="text-xs text-muted-foreground">
                ({autoReleaseDays} {t('escrowTimeline.days')})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Message */}
      <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-100 dark:border-amber-900/50">
        <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {t('escrowTimeline.safetyInfo', {
            days: safetyDays > 0 ? safetyDays : SAFETY_MARGIN_DAYS,
          })}
        </p>
      </div>
    </div>
  );
}

/**
 * EscrowTimelineSkeleton - Loading skeleton
 */
export function EscrowTimelineSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-32 bg-muted animate-pulse rounded" />
      <div className="space-y-2">
        <div className="h-16 bg-muted animate-pulse rounded-lg" />
        <div className="h-16 bg-muted animate-pulse rounded-lg" />
      </div>
      <div className="h-10 bg-muted animate-pulse rounded-lg" />
    </div>
  );
}
