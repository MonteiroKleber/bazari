import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Newspaper,
  BarChart3,
  Wallet,
  Store,
  ArrowLeftRight,
  Compass,
  MessageCircle,
  UserCheck,
  ShoppingBag,
  Truck,
  Vote,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDeliveryProfile } from '@/hooks/useDeliveryProfile';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  to: string;
  description: string;
  color: string;
  badge?: number;
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
    icon: <MessageCircle className="h-6 w-6" />,
    label: 'BazChat',
    to: '/app/chat',
    description: 'Mensagens e vendas',
    color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
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
    icon: <UserCheck className="h-6 w-6" />,
    label: 'Afiliações',
    to: '/app/promoter/affiliates',
    description: 'Minhas parcerias',
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    icon: <ShoppingBag className="h-6 w-6" />,
    label: 'Meu Marketplace',
    to: '/app/affiliate/dashboard',
    description: 'Vitrine de produtos',
    color: 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400',
  },
  {
    icon: <ArrowLeftRight className="h-6 w-6" />,
    label: 'P2P',
    to: '/app/p2p',
    description: 'Câmbio direto',
    color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  },
  {
    icon: <Vote className="h-6 w-6" />,
    label: 'Governança',
    to: '/app/governance',
    description: 'Propostas e votações',
    color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  {
    icon: <TrendingUp className="h-6 w-6" />,
    label: 'Vesting',
    to: '/vesting',
    description: 'Liberação de tokens BZR',
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
];

export function QuickActionsGrid() {
  const { profile: deliveryProfile } = useDeliveryProfile();

  // Add delivery action based on profile status
  const deliveryAction: QuickAction | null = deliveryProfile
    ? {
        icon: <Truck className="h-6 w-6" />,
        label: 'Minhas Entregas',
        to: '/app/delivery/dashboard',
        description: 'Dashboard de entregas',
        color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        badge: deliveryProfile.activeDeliveries || 0,
      }
    : {
        icon: <Truck className="h-6 w-6" />,
        label: 'Virar Entregador',
        to: '/app/delivery/profile/setup',
        description: 'Cadastre-se e ganhe',
        color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      };

  const allActions = deliveryAction
    ? [...QUICK_ACTIONS, deliveryAction]
    : QUICK_ACTIONS;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {allActions.map((action) => (
        <Link key={action.to} to={action.to}>
          <Card className="h-full transition-all hover:shadow-lg hover:scale-105 cursor-pointer group">
            <CardContent className="p-4 relative">
              {action.badge !== undefined && action.badge > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute top-2 right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {action.badge}
                </Badge>
              )}
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
