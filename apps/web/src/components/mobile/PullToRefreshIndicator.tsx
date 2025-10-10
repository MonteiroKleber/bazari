import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  isRefreshing: boolean;
  pullDistance: number;
  threshold?: number;
}

export function PullToRefreshIndicator({
  isRefreshing,
  pullDistance,
  threshold = 80,
}: PullToRefreshIndicatorProps) {
  const progress = Math.min((pullDistance / threshold) * 100, 100);
  const rotation = (pullDistance / threshold) * 360;

  if (pullDistance === 0 && !isRefreshing) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none transition-opacity"
      style={{
        transform: `translateY(${Math.min(pullDistance, threshold)}px)`,
        opacity: pullDistance > 0 ? 1 : 0,
      }}
    >
      <div className="bg-background/90 backdrop-blur-sm rounded-full p-3 shadow-lg border border-border">
        <RefreshCw
          className={cn(
            'h-6 w-6 text-primary transition-transform',
            isRefreshing && 'animate-spin'
          )}
          style={{
            transform: !isRefreshing ? `rotate(${rotation}deg)` : undefined,
          }}
        />
      </div>
    </div>
  );
}
