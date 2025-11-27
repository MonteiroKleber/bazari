import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Users,
  TrendingUp,
  Coins,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  useAffiliateStats,
  formatBzrAmount,
  shortenAddress,
  type AffiliateStats,
} from '@/hooks/blockchain/useAffiliate';

interface AffiliateStatsWidgetProps {
  address: string;
  compact?: boolean;
  className?: string;
}

export function AffiliateStatsWidget({
  address,
  compact = false,
  className = '',
}: AffiliateStatsWidgetProps) {
  const { data: stats, isLoading, error } = useAffiliateStats(address);

  if (isLoading) {
    return <AffiliateStatsWidgetSkeleton compact={compact} className={className} />;
  }

  if (error || !stats) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">
            {error ? 'Erro ao carregar estatisticas' : 'Nao registrado como afiliado'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return <CompactStatsWidget stats={stats} className={className} />;
  }

  return <FullStatsWidget stats={stats} className={className} />;
}

// Versão compacta para sidebars ou cards menores
function CompactStatsWidget({
  stats,
  className = '',
}: {
  stats: AffiliateStats;
  className?: string;
}) {
  const pendingBzr = formatBzrAmount(stats.pendingCommissions);
  const totalBzr = formatBzrAmount(stats.totalEarned);

  return (
    <Card className={className}>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 gap-4">
          <StatItem
            icon={Users}
            label="Referrals"
            value={stats.totalReferrals.toString()}
            iconColor="text-blue-600"
          />
          <StatItem
            icon={Coins}
            label="Ganhos"
            value={`${totalBzr} BZR`}
            iconColor="text-green-600"
          />
        </div>

        {parseFloat(pendingBzr) > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Pendente
              </span>
              <span className="font-medium text-amber-600">{pendingBzr} BZR</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Versão completa com todos os detalhes
function FullStatsWidget({
  stats,
  className = '',
}: {
  stats: AffiliateStats;
  className?: string;
}) {
  const pendingBzr = formatBzrAmount(stats.pendingCommissions);
  const claimedBzr = formatBzrAmount(stats.claimedCommissions);
  const totalBzr = formatBzrAmount(stats.totalEarned);

  // Calcular progresso de reivindicação
  const totalEarned = BigInt(stats.totalEarned);
  const claimed = BigInt(stats.claimedCommissions);
  const claimProgress = totalEarned > BigInt(0)
    ? Number((claimed * BigInt(100)) / totalEarned)
    : 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Estatisticas de Afiliado
          </span>
          {stats.isRegistered && (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Ativo
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cards de Estatísticas Principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Referrals Diretos"
            value={stats.directReferrals.toString()}
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            iconColor="text-blue-600"
          />
          <StatCard
            icon={Users}
            label="Total na Rede"
            value={stats.totalReferrals.toString()}
            iconBg="bg-purple-100 dark:bg-purple-900/30"
            iconColor="text-purple-600"
          />
          <StatCard
            icon={Coins}
            label="Total Ganho"
            value={`${totalBzr} BZR`}
            iconBg="bg-green-100 dark:bg-green-900/30"
            iconColor="text-green-600"
          />
          <StatCard
            icon={Clock}
            label="Pendente"
            value={`${pendingBzr} BZR`}
            iconBg="bg-amber-100 dark:bg-amber-900/30"
            iconColor="text-amber-600"
          />
        </div>

        {/* Taxas de Comissão */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-1">
              Taxas de Comissao
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Comissao recebida por nivel de referral</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </span>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="flex-1 justify-center py-2">
              <span className="text-xs text-muted-foreground mr-1">N1:</span>
              {stats.commissionRates.level1}%
            </Badge>
            <Badge variant="secondary" className="flex-1 justify-center py-2">
              <span className="text-xs text-muted-foreground mr-1">N2:</span>
              {stats.commissionRates.level2}%
            </Badge>
            <Badge variant="secondary" className="flex-1 justify-center py-2">
              <span className="text-xs text-muted-foreground mr-1">N3:</span>
              {stats.commissionRates.level3}%
            </Badge>
          </div>
        </div>

        {/* Progresso de Reivindicação */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Comissoes Reivindicadas</span>
            <span className="font-medium">{claimProgress}%</span>
          </div>
          <Progress value={claimProgress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{claimedBzr} BZR reivindicado</span>
            <span>{pendingBzr} BZR pendente</span>
          </div>
        </div>

        {/* Referrer */}
        {stats.referrer && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Indicado por:{' '}
              <code className="bg-muted px-2 py-1 rounded font-mono text-xs">
                {shortenAddress(stats.referrer, 6)}
              </code>
            </p>
          </div>
        )}

        {/* Código de Referral */}
        {stats.referralCode && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground mb-1">Seu codigo de referral:</p>
            <code className="text-lg font-mono font-bold">{stats.referralCode}</code>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Componentes auxiliares
function StatItem({
  icon: Icon,
  label,
  value,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  iconColor: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`w-4 h-4 ${iconColor}`} />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  iconBg,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg">
      <div className={`p-2 rounded-full ${iconBg} mb-2`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <p className="text-xs text-muted-foreground text-center">{label}</p>
      <p className="font-semibold text-center">{value}</p>
    </div>
  );
}

function AffiliateStatsWidgetSkeleton({
  compact,
  className = '',
}: {
  compact?: boolean;
  className?: string;
}) {
  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-8 w-full" />
      </CardContent>
    </Card>
  );
}

// Leaderboard widget
interface AffiliateLeaderboardWidgetProps {
  limit?: number;
  className?: string;
}

export function AffiliateLeaderboardWidget({
  limit = 5,
  className = '',
}: AffiliateLeaderboardWidgetProps) {
  // Usaria useAffiliateLeaderboard aqui
  // Por ora, placeholder
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Top Afiliados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground text-center py-4">
          Leaderboard em breve...
        </p>
      </CardContent>
    </Card>
  );
}
