import { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

/**
 * CountdownTimer - Reusable countdown component for escrow auto-release
 *
 * Features:
 * - Real-time countdown with seconds precision
 * - Visual progress bar (decreases over time)
 * - Warning state when <24 hours remaining
 * - Accessible with ARIA labels
 * - Responsive design (mobile-friendly)
 *
 * @example
 * <CountdownTimer
 *   targetTimestamp={Date.now() + 7 * 24 * 60 * 60 * 1000} // 7 days
 *   onExpire={() => console.log('Auto-release triggered!')}
 * />
 */

interface CountdownTimerProps {
  /** Unix timestamp (milliseconds) when countdown expires */
  targetTimestamp: number;

  /** Total duration in milliseconds (for progress calculation) */
  totalDuration?: number;

  /** Callback when countdown reaches 0 */
  onExpire?: () => void;

  /** Show warning state when less than this many ms remaining (default: 24h) */
  warningThreshold?: number;

  /** Custom className for container */
  className?: string;

  /** Show progress bar (default: true) */
  showProgress?: boolean;

  /** Compact mode (smaller text, no icon) */
  compact?: boolean;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number; // Total milliseconds
  isWarning: boolean;
  isExpired: boolean;
}

export function CountdownTimer({
  targetTimestamp,
  totalDuration = 7 * 24 * 60 * 60 * 1000, // 7 days default
  onExpire,
  warningThreshold = 24 * 60 * 60 * 1000, // 24 hours default
  className,
  showProgress = true,
  compact = false,
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(
    calculateTimeRemaining(targetTimestamp, warningThreshold)
  );

  useEffect(() => {
    // Update every second
    const interval = setInterval(() => {
      const newTime = calculateTimeRemaining(targetTimestamp, warningThreshold);
      setTimeRemaining(newTime);

      // Call onExpire when countdown reaches 0
      if (newTime.isExpired && !timeRemaining.isExpired) {
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTimestamp, warningThreshold, onExpire, timeRemaining.isExpired]);

  // Calculate progress percentage (100% = just started, 0% = expired)
  const progressPercentage = Math.max(
    0,
    Math.min(100, (timeRemaining.total / totalDuration) * 100)
  );

  // Expired state
  if (timeRemaining.isExpired) {
    return (
      <div
        className={cn(
          'rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20 p-4',
          className
        )}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          <span className="font-semibold">
            {compact ? 'Expired' : 'Auto-release triggered'}
          </span>
        </div>
        {!compact && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            Funds have been automatically released to the seller.
          </p>
        )}
      </div>
    );
  }

  // Compact mode
  if (compact) {
    return (
      <div className={cn('text-sm', className)}>
        <span
          className={cn(
            'font-medium',
            timeRemaining.isWarning
              ? 'text-orange-600 dark:text-orange-400'
              : 'text-muted-foreground'
          )}
        >
          {formatCompactTime(timeRemaining)}
        </span>
      </div>
    );
  }

  // Full mode
  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        timeRemaining.isWarning
          ? 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20'
          : 'border-border bg-card',
        className
      )}
      role="timer"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'rounded-full p-2',
            timeRemaining.isWarning
              ? 'bg-orange-100 dark:bg-orange-900/30'
              : 'bg-primary/10'
          )}
        >
          <Clock
            className={cn(
              'h-5 w-5',
              timeRemaining.isWarning
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-primary'
            )}
            aria-hidden="true"
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              'font-semibold text-sm mb-1',
              timeRemaining.isWarning && 'text-orange-700 dark:text-orange-300'
            )}
          >
            {timeRemaining.isWarning
              ? 'Auto-release soon!'
              : 'Time until auto-release'}
          </h3>

          <div
            className={cn(
              'text-2xl font-bold tabular-nums',
              timeRemaining.isWarning
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-foreground'
            )}
            aria-label={formatAriaLabel(timeRemaining)}
          >
            {formatDisplayTime(timeRemaining)}
          </div>

          {showProgress && (
            <div className="mt-3">
              <Progress
                value={progressPercentage}
                className={cn(
                  'h-2',
                  timeRemaining.isWarning && '[&>div]:bg-orange-500'
                )}
                aria-label={`${Math.round(progressPercentage)}% time remaining`}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {timeRemaining.isWarning
                  ? 'Release funds now to avoid auto-release'
                  : 'Funds will be released automatically when timer expires'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Calculate time remaining from target timestamp
 */
function calculateTimeRemaining(
  targetTimestamp: number,
  warningThreshold: number
): TimeRemaining {
  const now = Date.now();
  const total = Math.max(0, targetTimestamp - now);

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return {
    days,
    hours,
    minutes,
    seconds,
    total,
    isWarning: total > 0 && total <= warningThreshold,
    isExpired: total === 0,
  };
}

/**
 * Format time for display (e.g., "3d 12h 45m 30s")
 */
function formatDisplayTime(time: TimeRemaining): string {
  const parts: string[] = [];

  if (time.days > 0) {
    parts.push(`${time.days}d`);
  }
  if (time.hours > 0 || time.days > 0) {
    parts.push(`${time.hours}h`);
  }
  if (time.minutes > 0 || time.hours > 0 || time.days > 0) {
    parts.push(`${time.minutes}m`);
  }
  parts.push(`${time.seconds}s`);

  return parts.join(' ');
}

/**
 * Format time compactly (e.g., "3d 12h" or "45m" or "30s")
 */
function formatCompactTime(time: TimeRemaining): string {
  if (time.days > 0) {
    return `${time.days}d ${time.hours}h`;
  }
  if (time.hours > 0) {
    return `${time.hours}h ${time.minutes}m`;
  }
  if (time.minutes > 0) {
    return `${time.minutes}m`;
  }
  return `${time.seconds}s`;
}

/**
 * Format time for screen readers
 */
function formatAriaLabel(time: TimeRemaining): string {
  const parts: string[] = [];

  if (time.days > 0) {
    parts.push(`${time.days} ${time.days === 1 ? 'day' : 'days'}`);
  }
  if (time.hours > 0) {
    parts.push(`${time.hours} ${time.hours === 1 ? 'hour' : 'hours'}`);
  }
  if (time.minutes > 0) {
    parts.push(`${time.minutes} ${time.minutes === 1 ? 'minute' : 'minutes'}`);
  }
  if (time.seconds > 0 || parts.length === 0) {
    parts.push(`${time.seconds} ${time.seconds === 1 ? 'second' : 'seconds'}`);
  }

  return `${parts.join(', ')} remaining`;
}
