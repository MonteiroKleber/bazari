import { cn } from '@/lib/utils';

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
};

/**
 * Indicador de status online (bolinha verde/cinza)
 */
export function OnlineIndicator({ isOnline, size = 'md', className }: OnlineIndicatorProps) {
  return (
    <span
      className={cn(
        'rounded-full ring-2 ring-background',
        sizeClasses[size],
        isOnline ? 'bg-green-500' : 'bg-gray-400',
        className
      )}
      aria-label={isOnline ? 'Online' : 'Offline'}
    />
  );
}
