import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  Download,
  Users,
  Star,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { DeveloperLayout } from '@/layouts/DeveloperLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MetricCard {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: typeof Download;
}

export default function AppAnalyticsPage() {
  const { t } = useTranslation();

  // Mock data
  const appName = 'Meu App Incrível';

  const metrics: MetricCard[] = [
    {
      title: 'Downloads Totais',
      value: '2,847',
      change: 12.5,
      changeLabel: 'vs. mês passado',
      icon: Download,
    },
    {
      title: 'Usuários Ativos',
      value: '1,234',
      change: -3.2,
      changeLabel: 'vs. mês passado',
      icon: Users,
    },
    {
      title: 'Avaliação Média',
      value: '4.6',
      change: 0.2,
      changeLabel: 'vs. mês passado',
      icon: Star,
    },
    {
      title: 'Receita (BZR)',
      value: '15,420',
      change: 28.4,
      changeLabel: 'vs. mês passado',
      icon: DollarSign,
    },
  ];

  const downloadsPerDay = [
    { date: '01/12', value: 45 },
    { date: '02/12', value: 52 },
    { date: '03/12', value: 48 },
    { date: '04/12', value: 61 },
    { date: '05/12', value: 55 },
    { date: '06/12', value: 67 },
    { date: '07/12', value: 72 },
  ];

  const topCountries = [
    { country: 'Brasil', downloads: 1420, percentage: 49.9 },
    { country: 'Portugal', downloads: 456, percentage: 16.0 },
    { country: 'Estados Unidos', downloads: 312, percentage: 11.0 },
    { country: 'Argentina', downloads: 234, percentage: 8.2 },
    { country: 'México', downloads: 189, percentage: 6.6 },
  ];

  const recentReviews = [
    { user: 'João S.', rating: 5, comment: 'App excelente, muito útil!' },
    { user: 'Maria L.', rating: 4, comment: 'Bom app, mas poderia ter mais features' },
    { user: 'Pedro M.', rating: 5, comment: 'Recomendo!' },
  ];

  return (
    <DeveloperLayout
      title={`Analytics: ${appName}`}
      description={t('developer.analytics.description', 'Métricas e estatísticas do seu app')}
      actions={
        <Select defaultValue="30d">
          <SelectTrigger className="w-36">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="1y">Último ano</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const isPositive = metric.change > 0;

          return (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="flex items-center gap-1 text-xs mt-1">
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
                    {isPositive ? '+' : ''}
                    {metric.change}%
                  </span>
                  <span className="text-muted-foreground">{metric.changeLabel}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Downloads Chart */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t('developer.analytics.downloadsChart', 'Downloads por Dia')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2">
              {downloadsPerDay.map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-primary rounded-t transition-all hover:bg-primary/80"
                    style={{ height: `${(day.value / 80) * 100}%` }}
                  />
                  <span className="text-xs text-muted-foreground mt-2">{day.date}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Countries */}
        <Card>
          <CardHeader>
            <CardTitle>{t('developer.analytics.topCountries', 'Top Países')}</CardTitle>
            <CardDescription>Downloads por região</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCountries.map((country) => (
                <div key={country.country}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{country.country}</span>
                    <span className="text-sm text-muted-foreground">
                      {country.downloads.toLocaleString()} ({country.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${country.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Reviews */}
        <Card>
          <CardHeader>
            <CardTitle>{t('developer.analytics.recentReviews', 'Avaliações Recentes')}</CardTitle>
            <CardDescription>Feedback dos usuários</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentReviews.map((review, index) => (
                <div key={index} className="pb-4 border-b last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{review.user}</span>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < review.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{review.comment}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      <div className="flex justify-end mt-6">
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          {t('developer.analytics.export', 'Exportar Relatório')}
        </Button>
      </div>
    </DeveloperLayout>
  );
}
