import { useState, useEffect } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { apiHelpers } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ReputationChartProps {
  handle: string;
}

interface ReputationData {
  current: {
    score: number;
    tier: string;
    nextTier: string;
    progressToNext: number;
  };
  history: Array<{ date: string; score: number }>;
  change7d: number;
  change30d: number;
}

export function ReputationChart({ handle }: ReputationChartProps) {
  const [data, setData] = useState<ReputationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadData();
  }, [handle]);

  const loadData = async () => {
    setLoading(true);
    setError(false);
    try {
      const result: any = await apiHelpers.getReputationHistory(handle);
      setData(result);
    } catch (err) {
      console.error('Error loading reputation data:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ReputationChartSkeleton />;
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Sem dados disponíveis
        </CardContent>
      </Card>
    );
  }

  if (data.history.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Comece a interagir para ganhar reputação!
          </p>
        </CardContent>
      </Card>
    );
  }

  const isPositiveTrend = data.change7d >= 0;
  const chartColor = isPositiveTrend ? '#22c55e' : '#ef4444';

  const chartData = data.history.map(item => ({
    date: format(parseISO(item.date), 'dd/MM', { locale: ptBR }),
    fullDate: format(parseISO(item.date), 'dd MMM yyyy', { locale: ptBR }),
    score: item.score
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reputação</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-3xl font-bold">{data.current.score}</div>
            <div className="text-sm text-muted-foreground">Score atual</div>
            <div className="flex items-center gap-1 text-xs mt-1">
              {isPositiveTrend ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={cn(
                'font-medium',
                isPositiveTrend ? 'text-green-500' : 'text-red-500'
              )}>
                {isPositiveTrend ? '+' : ''}{data.change7d}
              </span>
              <span className="text-muted-foreground">últimos 7 dias</span>
            </div>
          </div>

          <div>
            <div className="text-lg font-semibold">{data.current.tier}</div>
            <div className="text-sm text-muted-foreground mb-2">Tier atual</div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                Progresso para {data.current.nextTier}
              </div>
              <Progress value={data.current.progressToNext * 100} />
            </div>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover p-2 rounded-md shadow-md border">
                        <div className="text-xs text-muted-foreground">
                          {data.fullDate}
                        </div>
                        <div className="text-sm font-semibold">
                          Score: {data.score}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke={chartColor}
                strokeWidth={2}
                fill="url(#colorScore)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function ReputationChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-2 w-full" />
          </div>
        </div>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}
