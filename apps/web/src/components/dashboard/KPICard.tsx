import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  badge?: boolean;
}

export function KPICard({ icon: Icon, label, value, change, trend = 'neutral', badge }: KPICardProps) {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600 dark:text-green-400';
    if (trend === 'down') return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  };

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
          {badge && (
            <div className="absolute top-2 right-2">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            </div>
          )}
        </div>
        {change && (
          <p className={cn('text-xs mt-2', getTrendColor())}>
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
