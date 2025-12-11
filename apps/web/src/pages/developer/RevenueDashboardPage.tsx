import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  Package,
  Calendar,
  Download,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DeveloperLayout } from '@/layouts/DeveloperLayout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RevenueSummary {
  totalRevenue: number;
  developerRevenue: number;
  platformFees: number;
  totalInstalls: number;
  appsCount: number;
  last7DaysRevenue: number;
  last30DaysRevenue: number;
}

interface RecentTransaction {
  id: string;
  type: string;
  amount: number;
  developerShare: number;
  appName: string;
  appIcon: string;
  productName: string | null;
  confirmedAt: string;
}

interface AppBreakdown {
  id: string;
  name: string;
  totalRevenue: number;
  developerRevenue: number;
  installCount: number;
}

interface ChartData {
  date: string;
  revenue: number;
}

export default function RevenueDashboardPage() {
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [appsBreakdown, setAppsBreakdown] = useState<AppBreakdown[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [chartDays, setChartDays] = useState('30');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, chartRes] = await Promise.all([
          api.get<{ summary: RevenueSummary; recentTransactions: RecentTransaction[]; appsBreakdown: AppBreakdown[] }>('/developer/revenue/summary'),
          api.get<{ chartData: ChartData[] }>(`/developer/revenue/chart?days=${chartDays}`),
        ]);
        setSummary(summaryRes.summary);
        setRecentTransactions(summaryRes.recentTransactions || []);
        setAppsBreakdown(summaryRes.appsBreakdown || []);
        setChartData(chartRes.chartData || []);
        setError(null);
      } catch (err) {
        setError('Erro ao carregar dados de receita');
        console.error('Error fetching revenue data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [chartDays]);

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{error}</h3>
            <Button asChild>
              <Link to="/app/developer">Voltar ao Portal</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const revenueChange = summary
    ? summary.last7DaysRevenue > 0
      ? ((summary.last7DaysRevenue / (summary.last30DaysRevenue - summary.last7DaysRevenue || 1)) * 100).toFixed(0)
      : '0'
    : '0';

  const maxChartValue = Math.max(...chartData.map((d) => d.revenue), 1);

  return (
    <DeveloperLayout
      title="Dashboard de Receita"
      description="Acompanhe suas vendas e ganhos"
      actions={
        <Button variant="outline" disabled>
          <Download className="w-4 h-4 mr-2" />
          Exportar Relatório
        </Button>
      }
    >

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(summary?.totalRevenue || 0).toFixed(2)} BZR
            </div>
            <p className="text-xs text-muted-foreground">
              Todas as vendas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sua Receita (75%)</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(summary?.developerRevenue || 0).toFixed(2)} BZR
            </div>
            <div className="flex items-center text-xs text-green-600">
              {Number(revenueChange) > 0 ? (
                <ArrowUpRight className="w-3 h-3 mr-1" />
              ) : (
                <ArrowDownRight className="w-3 h-3 mr-1" />
              )}
              {revenueChange}% vs período anterior
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Últimos 7 Dias</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(summary?.last7DaysRevenue || 0).toFixed(2)} BZR
            </div>
            <p className="text-xs text-muted-foreground">
              Receita recente
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Últimos 30 Dias</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(summary?.last30DaysRevenue || 0).toFixed(2)} BZR
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.appsCount || 0} apps ativos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Chart */}
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Receita por Período</CardTitle>
                <CardDescription>Ganhos diários</CardDescription>
              </div>
              <Select value={chartDays} onValueChange={setChartDays}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  Sem dados no período selecionado
                </div>
              ) : (
                <div className="h-48 flex items-end gap-1">
                  {chartData.map((day, i) => (
                    <div
                      key={day.date}
                      className="flex-1 group relative"
                    >
                      <div
                        className="bg-primary/80 hover:bg-primary rounded-t transition-colors"
                        style={{
                          height: `${(day.revenue / maxChartValue) * 100}%`,
                          minHeight: day.revenue > 0 ? '4px' : '0px',
                        }}
                      />
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {new Date(day.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        <br />
                        {day.revenue.toFixed(2)} BZR
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Transações Recentes</CardTitle>
              <CardDescription>Últimas vendas confirmadas</CardDescription>
            </CardHeader>
            <CardContent>
              {recentTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma transação ainda</p>
                  <p className="text-sm mt-2">
                    Vendas aparecerão aqui quando usuários comprarem seus apps
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                          {tx.appIcon || '📦'}
                        </div>
                        <div>
                          <div className="font-medium">{tx.appName}</div>
                          <div className="text-sm text-muted-foreground">
                            {tx.productName || (tx.type === 'app' ? 'Compra do App' : 'In-App Purchase')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          +{tx.developerShare.toFixed(2)} BZR
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {tx.confirmedAt
                            ? formatDistanceToNow(new Date(tx.confirmedAt), {
                                addSuffix: true,
                                locale: ptBR,
                              })
                            : '-'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {recentTransactions.length > 0 && (
                <Button variant="ghost" className="w-full mt-4" asChild>
                  <Link to="/app/developer/transactions">Ver Todas as Transações</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Apps Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Receita por App</CardTitle>
            </CardHeader>
            <CardContent>
              {appsBreakdown.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Nenhum app com receita
                </div>
              ) : (
                <div className="space-y-4">
                  {appsBreakdown.map((app) => (
                    <Link
                      key={app.id}
                      to={`/app/developer/apps/${app.id}`}
                      className="block hover:bg-accent/50 p-2 -mx-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{app.name}</span>
                        <span className="text-green-600 font-bold">
                          {app.developerRevenue.toFixed(2)} BZR
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{
                            width: `${Math.min(
                              (app.developerRevenue / (summary?.developerRevenue || 1)) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {app.installCount} instalações
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Revenue Share Info */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Share</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Você recebe</span>
                  <span className="font-bold text-green-600">75%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Plataforma</span>
                  <span className="font-bold">25%</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden bg-muted flex">
                  <div className="w-3/4 bg-green-500" />
                  <div className="w-1/4 bg-primary" />
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Taxa acumulada</span>
                    <span className="font-medium">
                      {(summary?.platformFees || 0).toFixed(2)} BZR
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-dashed">
            <CardContent className="pt-6 space-y-3">
              <Button variant="outline" className="w-full" asChild>
                <Link to="/app/developer/new">
                  <Package className="w-4 h-4 mr-2" />
                  Criar Novo App
                </Link>
              </Button>
              <Button variant="outline" className="w-full" disabled>
                <Download className="w-4 h-4 mr-2" />
                Solicitar Saque
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Saques disponíveis em breve
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DeveloperLayout>
  );
}
