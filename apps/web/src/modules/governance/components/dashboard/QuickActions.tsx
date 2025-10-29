import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { PlusCircle, Vote, Coins, Users, FileText, TrendingUp } from 'lucide-react';
import type { QuickAction } from '../../types';

interface QuickActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  onClick: () => void;
  disabled?: boolean;
}

const colorClasses: Record<string, string> = {
  blue: 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950',
  green: 'text-green-500 hover:bg-green-50 dark:hover:bg-green-950',
  amber: 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950',
  purple: 'text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950',
  red: 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950',
};

/**
 * Individual Quick Action Card
 */
function QuickActionCard({
  icon,
  title,
  description,
  color,
  onClick,
  disabled = false,
}: QuickActionCardProps) {
  return (
    <motion.div
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
    >
      <Card
        className={`
          cursor-pointer transition-all h-full
          ${disabled ? 'opacity-50 cursor-not-allowed' : colorClasses[color]}
        `}
        onClick={disabled ? undefined : onClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-card ${disabled ? '' : colorClasses[color]}`}>
              <div className="h-5 w-5">
                {icon}
              </div>
            </div>
            <CardTitle className="text-base font-semibold">
              {title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * FASE 8: Quick Actions Component
 *
 * Provides easy access to common governance actions:
 * - Create Proposal
 * - View Proposals
 * - Treasury
 * - Council
 * - Multi-sig
 * - Tech Committee
 *
 * Features:
 * - Animated hover effects
 * - Responsive grid layout
 * - Disabled state support
 */
export function QuickActions() {
  const navigate = useNavigate();

  const actions: QuickAction[] = [
    {
      id: 'create-proposal',
      icon: <PlusCircle />,
      title: 'Criar Proposta',
      description: 'Submeta uma nova proposta de governança',
      color: 'blue',
      onClick: () => navigate('/app/governance/proposals/new'),
    },
    {
      id: 'view-proposals',
      icon: <Vote />,
      title: 'Votar',
      description: 'Veja propostas ativas e vote',
      color: 'green',
      onClick: () => navigate('/app/governance/proposals'),
    },
    {
      id: 'treasury',
      icon: <Coins />,
      title: 'Tesouro',
      description: 'Solicite fundos do tesouro comunitário',
      color: 'amber',
      onClick: () => navigate('/app/governance/treasury'),
    },
    {
      id: 'council',
      icon: <Users />,
      title: 'Conselho',
      description: 'Veja membros e propostas do conselho',
      color: 'purple',
      onClick: () => navigate('/app/governance/council'),
    },
    {
      id: 'multisig',
      icon: <FileText />,
      title: 'Multi-sig',
      description: 'Gerencie contas e aprovações multi-assinatura',
      color: 'blue',
      onClick: () => navigate('/app/governance/multisig'),
    },
    {
      id: 'tech-committee',
      icon: <TrendingUp />,
      title: 'Comitê Técnico',
      description: 'Propostas técnicas e atualizações',
      color: 'red',
      onClick: () => navigate('/app/governance/council'), // Same page as council
    },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Ações Rápidas</h2>
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, staggerChildren: 0.1 }}
      >
        {actions.map((action, index) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <QuickActionCard
              icon={action.icon}
              title={action.title}
              description={action.description}
              color={action.color}
              onClick={action.onClick}
              disabled={action.disabled}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
