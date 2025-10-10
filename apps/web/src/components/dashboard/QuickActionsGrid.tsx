import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import {
  Newspaper,
  BarChart3,
  Wallet,
  Search,
  Store,
  ArrowLeftRight,
  Compass,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  to: string;
  description: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: <Newspaper className="h-6 w-6" />,
    label: 'Feed Social',
    to: '/app/feed',
    description: 'Ver posts da comunidade',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    label: 'Analytics',
    to: '/app/analytics',
    description: 'Suas métricas',
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  {
    icon: <Wallet className="h-6 w-6" />,
    label: 'Wallet',
    to: '/app/wallet',
    description: 'Carteira e tokens',
    color: 'bg-green-500/10 text-green-600 dark:text-green-400',
  },
  {
    icon: <Compass className="h-6 w-6" />,
    label: 'Descobrir',
    to: '/app/discover/people',
    description: 'Pessoas e tendências',
    color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
  {
    icon: <Store className="h-6 w-6" />,
    label: 'Minhas Lojas',
    to: '/app/sellers',
    description: 'Gerenciar lojas',
    color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  },
  {
    icon: <ArrowLeftRight className="h-6 w-6" />,
    label: 'P2P',
    to: '/app/p2p',
    description: 'Câmbio direto',
    color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  },
];

export function QuickActionsGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {QUICK_ACTIONS.map((action) => (
        <Link key={action.to} to={action.to}>
          <Card className="h-full transition-all hover:shadow-lg hover:scale-105 cursor-pointer group">
            <CardContent className="p-4">
              <div className={cn('p-3 rounded-lg w-fit mb-3', action.color)}>
                {action.icon}
              </div>
              <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                {action.label}
              </h3>
              <p className="text-xs text-muted-foreground">
                {action.description}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
