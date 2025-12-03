import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppInstalledBadgeProps {
  className?: string;
}

export function AppInstalledBadge({ className }: AppInstalledBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
        'bg-green-100 text-green-700 text-xs font-medium',
        className
      )}
    >
      <Check className="w-3 h-3" />
      Instalado
    </div>
  );
}
