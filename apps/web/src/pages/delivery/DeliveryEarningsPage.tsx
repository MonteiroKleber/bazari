import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { deliveryApi } from '@/lib/api/delivery';
import type { DeliveryRequest } from '@/types/delivery';
import { DeliveryRequestStatus } from '@/types/delivery';
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Package,
  Clock,
  BarChart3,
} from 'lucide-react';

type Period = 'today' | 'week' | 'month' | 'all';

interface EarningsSummary {
  total: number;
  count: number;
  average: number;
}

interface DailyEarnings {
  date: string;
  earnings: number;
  count: number;
}

export function DeliveryEarningsPage() {
  const navigate = useNavigate();

  const [period, setPeriod] = useState<Period>('month');
  const [deliveries, setDeliveries] = useState<DeliveryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Summaries
  const [todaySummary, setTodaySummary] = useState<EarningsSummary>({
    total: 0,
    count: 0,
    average: 0,
  });
  const [weekSummary, setWeekSummary] = useState<EarningsSummary>({
    total: 0,
    count: 0,
    average: 0,
  });
  const [monthSummary, setMonthSummary] = useState<EarningsSummary>({
    total: 0,
    count: 0,
    average: 0,
  });
  const [allTimeSummary, setAllTimeSummary] = useState<EarningsSummary>({
    total: 0,
    count: 0,
    average: 0,
  });

  // Daily breakdown
  const [dailyEarnings, setDailyEarnings] = useState<DailyEarnings[]>([]);

  useEffect(() => {
    loadEarnings();
  }, []);

  const loadEarnings = async () => {
    try {
      setIsLoading(true);

      // Load all delivered deliveries
      const delivered = await deliveryApi.listRequests({
        status: [DeliveryRequestStatus.DELIVERED],
      });

      setDeliveries(delivered);

      // Calculate summaries
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      const monthStart = new Date(now);
      monthStart.setDate(now.getDate() - 30);

      // Today
      const todayDeliveries = delivered.filter(
        (d) => new Date(d.deliveredAt || d.createdAt) >= todayStart
      );
      const todayTotal = todayDeliveries.reduce(
        (sum, d) => sum + parseFloat(d.feeBzr || '0'),
        0
      );
      setTodaySummary({
        total: todayTotal,
        count: todayDeliveries.length,
        average: todayDeliveries.length > 0 ? todayTotal / todayDeliveries.length : 0,
      });

      // Week
      const weekDeliveries = delivered.filter(
        (d) => new Date(d.deliveredAt || d.createdAt) >= weekStart
      );
      const weekTotal = weekDeliveries.reduce(
        (sum, d) => sum + parseFloat(d.feeBzr || '0'),
        0
      );
      setWeekSummary({
        total: weekTotal,
        count: weekDeliveries.length,
        average: weekDeliveries.length > 0 ? weekTotal / weekDeliveries.length : 0,
      });

      // Month
      const monthDeliveries = delivered.filter(
        (d) => new Date(d.deliveredAt || d.createdAt) >= monthStart
      );
      const monthTotal = monthDeliveries.reduce(
        (sum, d) => sum + parseFloat(d.feeBzr || '0'),
        0
      );
      setMonthSummary({
        total: monthTotal,
        count: monthDeliveries.length,
        average: monthDeliveries.length > 0 ? monthTotal / monthDeliveries.length : 0,
      });

      // All time
      const allTotal = delivered.reduce((sum, d) => sum + parseFloat(d.feeBzr || '0'), 0);
      setAllTimeSummary({
        total: allTotal,
        count: delivered.length,
        average: delivered.length > 0 ? allTotal / delivered.length : 0,
      });

      // Calculate daily earnings for the last 30 days
      const dailyMap = new Map<string, { earnings: number; count: number }>();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyMap.set(dateStr, { earnings: 0, count: 0 });
      }

      monthDeliveries.forEach((d) => {
        const dateStr = new Date(d.deliveredAt || d.createdAt)
          .toISOString()
          .split('T')[0];
        const current = dailyMap.get(dateStr);
        if (current) {
          current.earnings += parseFloat(d.feeBzr || '0');
          current.count += 1;
        }
      });

      const dailyArray: DailyEarnings[] = Array.from(dailyMap.entries()).map(
        ([date, data]) => ({
          date,
          earnings: data.earnings,
          count: data.count,
        })
      );
      setDailyEarnings(dailyArray);
    } catch (error: any) {
      toast.error(`Erro ao carregar ganhos: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentSummary = (): EarningsSummary => {
    switch (period) {
      case 'today':
        return todaySummary;
      case 'week':
        return weekSummary;
      case 'month':
        return monthSummary;
      case 'all':
        return allTimeSummary;
      default:
        return monthSummary;
    }
  };

  const getFilteredDeliveries = (): DeliveryRequest[] => {
    const now = new Date();
    switch (period) {
      case 'today': {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return deliveries.filter(
          (d) => new Date(d.deliveredAt || d.createdAt) >= todayStart
        );
      }
      case 'week': {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        return deliveries.filter(
          (d) => new Date(d.deliveredAt || d.createdAt) >= weekStart
        );
      }
      case 'month': {
        const monthStart = new Date(now);
        monthStart.setDate(now.getDate() - 30);
        return deliveries.filter(
          (d) => new Date(d.deliveredAt || d.createdAt) >= monthStart
        );
      }
      case 'all':
        return deliveries;
      default:
        return deliveries;
    }
  };

  const handleExport = () => {
    const filtered = getFilteredDeliveries();
    const csv = [
      ['Data', 'ID', 'Origem', 'Destino', 'Distância (km)', 'Valor (BZR)'],
      ...filtered.map((d) => [
        new Date(d.deliveredAt || d.createdAt).toLocaleDateString('pt-BR'),
        d.id,
        d.pickupAddress || '',
        d.deliveryAddress || '',
        d.distanceKm?.toString() || '',
        d.feeBzr || '',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ganhos-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Extrato exportado com sucesso');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  const renderHeader = () => (
    <div className="mb-6">
      <Button
        variant="ghost"
        onClick={() => navigate('/app/delivery/dashboard')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar ao Dashboard
      </Button>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Ganhos</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe seus ganhos com entregas
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Últimos 7 dias</SelectItem>
              <SelectItem value="month">Últimos 30 dias</SelectItem>
              <SelectItem value="all">Todo o período</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>
    </div>
  );

  const renderSummaryCards = () => {
    const summary = getCurrentSummary();
    const prevSummary =
      period === 'today'
        ? weekSummary
        : period === 'week'
        ? monthSummary
        : allTimeSummary;

    const percentChange =
      prevSummary.total > 0
        ? ((summary.total - prevSummary.total) / prevSummary.total) * 100
        : 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total de Ganhos</span>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{summary.total.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground">BZR</span>
            </div>
            {percentChange !== 0 && (
              <div className="flex items-center gap-1 mt-2">
                {percentChange > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span
                  className={`text-sm ${
                    percentChange > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {Math.abs(percentChange).toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground">vs período anterior</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Entregas Realizadas</span>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{summary.count}</span>
              <span className="text-sm text-muted-foreground">entregas</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total de entregas concluídas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Ganho Médio</span>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{summary.average.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground">BZR</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Por entrega</p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderChart = () => {
    const maxEarnings = Math.max(...dailyEarnings.map((d) => d.earnings), 1);

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Evolução de Ganhos (Últimos 30 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dailyEarnings.map((day) => (
              <div key={day.date} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-16">
                  {formatDate(day.date)}
                </span>
                <div className="flex-1 bg-muted rounded-full h-8 relative overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all flex items-center justify-end pr-2"
                    style={{
                      width: `${(day.earnings / maxEarnings) * 100}%`,
                      minWidth: day.earnings > 0 ? '32px' : '0',
                    }}
                  >
                    {day.earnings > 0 && (
                      <span className="text-xs font-medium text-primary-foreground">
                        {day.earnings.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">
                  {day.count} {day.count === 1 ? 'entrega' : 'entregas'}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTransactions = () => {
    const filtered = getFilteredDeliveries();

    if (filtered.length === 0) {
      return (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <DollarSign className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum ganho no período</h3>
            <p className="text-muted-foreground">
              Complete entregas para começar a ganhar
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Transações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map((delivery) => (
              <div
                key={delivery.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/app/delivery/requests/${delivery.id}`)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-muted-foreground">
                      #{delivery.id.slice(-8)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {delivery.distanceKm?.toFixed(1)} km
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(delivery.deliveredAt || delivery.createdAt).toLocaleDateString(
                      'pt-BR',
                      {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">+{delivery.feeBzr} BZR</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <p>Carregando ganhos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {renderHeader()}
      {renderSummaryCards()}
      {period === 'month' && renderChart()}
      {renderTransactions()}
    </div>
  );
}
