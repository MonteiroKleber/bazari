import { cn } from '@/lib/utils';
import * as icons from 'lucide-react';
import type { BazariApp } from '@/platform/types';

interface AppIconProps {
  app: BazariApp;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBackground?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
};

const iconSizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-10 h-10',
};

export function AppIcon({
  app,
  size = 'md',
  className,
  showBackground = true,
}: AppIconProps) {
  const IconComponent = icons[app.icon as keyof typeof icons] as React.ComponentType<{
    className?: string;
  }>;

  if (!IconComponent) {
    console.warn(`[AppIcon] Ícone não encontrado: ${app.icon}`);
    return null;
  }

  if (!showBackground) {
    return (
      <IconComponent
        className={cn(iconSizeClasses[size], 'text-current', className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl flex items-center justify-center',
        'bg-gradient-to-br',
        app.color,
        sizeClasses[size],
        className
      )}
    >
      <IconComponent className={cn(iconSizeClasses[size], 'text-white')} />
    </div>
  );
}
