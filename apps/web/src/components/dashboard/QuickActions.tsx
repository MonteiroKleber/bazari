import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Wallet, ArrowLeftRight, Store } from 'lucide-react';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  to: string;
  variant?: 'default' | 'outline';
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: <BarChart3 className="h-4 w-4" />,
    label: 'Analytics',
    to: '/app/analytics',
    variant: 'outline',
  },
  {
    icon: <Wallet className="h-4 w-4" />,
    label: 'Wallet',
    to: '/app/wallet',
    variant: 'outline',
  },
  {
    icon: <ArrowLeftRight className="h-4 w-4" />,
    label: 'P2P',
    to: '/app/p2p',
    variant: 'outline',
  },
  {
    icon: <Store className="h-4 w-4" />,
    label: 'Minhas Lojas',
    to: '/app/sellers',
    variant: 'outline',
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.to}
            variant={action.variant || 'outline'}
            size="sm"
            className="w-full justify-start gap-2"
            asChild
          >
            <Link to={action.to}>
              {action.icon}
              {action.label}
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
