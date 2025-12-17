import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRemainingTime } from '../utils/format';

export interface CountdownTimerProps {
  expiresAt: string;
  warningThreshold?: number; // seconds, default 300 (5min)
  onExpire?: () => void;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CountdownTimer({
  expiresAt,
  warningThreshold = 300,
  onExpire,
  className,
  showIcon = true,
  size = 'md',
}: CountdownTimerProps) {
  const { t } = useTranslation();
  const [timeInfo, setTimeInfo] = useState(() => getRemainingTime(expiresAt));

  useEffect(() => {
    // Update immediately
    setTimeInfo(getRemainingTime(expiresAt));

    // Update every second
    const interval = setInterval(() => {
      const newTimeInfo = getRemainingTime(expiresAt);
      setTimeInfo(newTimeInfo);

      if (newTimeInfo.isExpired && onExpire) {
        onExpire();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const isWarning = timeInfo.totalSeconds > 0 && timeInfo.totalSeconds <= warningThreshold;

  const sizeClasses = {
    sm: 'text-xs gap-1',
    md: 'text-sm gap-1.5',
    lg: 'text-base gap-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <div
      className={cn(
        'flex items-center font-mono',
        sizeClasses[size],
        isWarning && 'text-red-500 animate-pulse',
        timeInfo.isExpired && 'text-muted-foreground',
        className
      )}
      role="timer"
      aria-live="polite"
      aria-label={
        timeInfo.isExpired
          ? t('p2p.timer.expired', 'Expirado')
          : t('p2p.timer.remaining', 'Tempo restante: {{time}}', {
              time: timeInfo.formatted,
            })
      }
    >
      {showIcon && <Clock className={iconSizes[size]} />}
      <span>
        {timeInfo.isExpired
          ? t('p2p.timer.expired', 'Expirado')
          : timeInfo.formatted}
      </span>
    </div>
  );
}
