import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  badge?: string;
  trend?: string;
}

export function KPICard({ icon, label, value, subtitle, badge, trend }: KPICardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-primary">{icon}</div>
          {badge && <Badge variant="secondary">{badge}</Badge>}
        </div>

        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>

        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}

        {trend && (
          <p className="text-xs text-green-600 mt-1">{trend}</p>
        )}
      </CardContent>
    </Card>
  );
}
