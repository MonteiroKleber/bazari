import { Badge } from '../ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../ui/hover-card';
import { Shield, ShieldCheck, Award, Crown } from 'lucide-react';

interface TrustBadgeProps {
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  issuedAt?: number;
  nftId?: string;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const BADGE_CONFIG = {
  bronze: {
    icon: Shield,
    label: 'Bronze',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    borderColor: 'border-orange-200 dark:border-orange-800',
    description: 'Vendedor verificado com histórico básico',
    requirements: [
      '100+ pontos de reputação',
      '5+ vendas concluídas',
      'Conta com 30+ dias',
      'Máximo 2 denúncias resolvidas',
    ],
  },
  silver: {
    icon: ShieldCheck,
    label: 'Prata',
    color: 'text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-900',
    borderColor: 'border-gray-200 dark:border-gray-700',
    description: 'Vendedor confiável com bom histórico',
    requirements: [
      '500+ pontos de reputação',
      '20+ vendas concluídas',
      'Conta com 90+ dias',
      'Máximo 1 denúncia resolvida',
    ],
  },
  gold: {
    icon: Award,
    label: 'Ouro',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    description: 'Vendedor premium com excelente reputação',
    requirements: [
      '2000+ pontos de reputação',
      '100+ vendas concluídas',
      'Conta com 180+ dias',
      'Nenhuma denúncia resolvida',
    ],
  },
  platinum: {
    icon: Crown,
    label: 'Platina',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    description: 'Vendedor elite de máxima confiança',
    requirements: [
      '10000+ pontos de reputação',
      '500+ vendas concluídas',
      'Conta com 365+ dias',
      'Nenhuma denúncia resolvida',
    ],
  },
};

export function TrustBadge({
  level,
  issuedAt,
  nftId,
  showDetails = true,
  size = 'md',
}: TrustBadgeProps) {
  const config = BADGE_CONFIG[level];
  const Icon = config.icon;

  const iconSizeClass = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }[size];

  const badgeContent = (
    <Badge
      variant="outline"
      className={`${config.bgColor} ${config.borderColor} ${config.color} gap-1 cursor-pointer`}
    >
      <Icon className={iconSizeClass} />
      {size !== 'sm' && <span className="font-medium">{config.label}</span>}
    </Badge>
  );

  if (!showDetails) {
    return badgeContent;
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>{badgeContent}</HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Icon className={`h-6 w-6 ${config.color}`} />
            <div>
              <h4 className="font-semibold">Badge {config.label}</h4>
              <p className="text-xs text-muted-foreground">{config.description}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Requisitos para este badge:</p>
            <ul className="text-xs space-y-1">
              {config.requirements.map((req, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>

          {issuedAt && (
            <div className="text-xs text-muted-foreground border-t pt-2">
              Emitido em: {new Date(issuedAt).toLocaleDateString('pt-BR')}
            </div>
          )}

          {nftId && (
            <div className="text-xs text-muted-foreground">
              <span className="font-mono bg-muted px-1 py-0.5 rounded">NFT: {nftId.slice(0, 12)}...</span>
            </div>
          )}

          <div className="text-xs bg-muted p-2 rounded-md">
            <strong>🔐 Verificação:</strong> Este badge é um NFT na blockchain Polkadot e não
            pode ser falsificado ou transferido.
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
