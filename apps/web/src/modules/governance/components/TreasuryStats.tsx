import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { formatBalance } from '@/lib/utils';

interface TreasuryStatsProps {
  balance: string;
  proposalCount: number;
  approvedCount?: number;
  spendPeriod?: number;
  nextBurn?: string;
}

export function TreasuryStats({
  balance,
  proposalCount,
  approvedCount = 0,
  spendPeriod,
  nextBurn,
}: TreasuryStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Balance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
          <Coins className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatBalance(balance)} BZR</div>
          <p className="text-xs text-muted-foreground mt-1">Fundos disponíveis</p>
        </CardContent>
      </Card>

      {/* Total Proposals */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Propostas</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{proposalCount}</div>
          <p className="text-xs text-muted-foreground mt-1">{approvedCount} aprovadas</p>
        </CardContent>
      </Card>

      {/* Spend Period */}
      {spendPeriod !== undefined && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Período de Gasto</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{spendPeriod}</div>
            <p className="text-xs text-muted-foreground mt-1">blocos restantes</p>
          </CardContent>
        </Card>
      )}

      {/* Next Burn */}
      {nextBurn && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximo Burn</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBalance(nextBurn)} BZR</div>
            <p className="text-xs text-muted-foreground mt-1">se não utilizado</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
