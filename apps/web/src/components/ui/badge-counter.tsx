import { cn } from '@/lib/utils';

interface BadgeCounterProps {
  count: number;
  max?: number;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Badge com contador para notificações não lidas
 */
export function BadgeCounter({
  count,
  max = 99,
  className,
  size = 'md',
}: BadgeCounterProps) {
  if (count <= 0) return null;

  const display = count > max ? `${max}+` : count.toString();

  return (
    <span
      className={cn(
        'absolute bg-destructive text-destructive-foreground font-bold rounded-full flex items-center justify-center',
        size === 'sm' && 'text-[10px] min-w-[16px] h-[16px] px-1 -top-1 -right-1',
        size === 'md' && 'text-xs min-w-[18px] h-[18px] px-1 -top-1.5 -right-1.5',
        className
      )}
    >
      {display}
    </span>
  );
}
