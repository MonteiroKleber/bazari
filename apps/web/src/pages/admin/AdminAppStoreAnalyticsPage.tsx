import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Download,
  DollarSign,
  Package,
  Users,
  Star,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';

interface AppStoreSummary {
  totalApps: number;
  publishedApps: number;
  totalRevenue: number;
  platformRevenue: number;
  developerRevenue: number;
  totalInstalls: number;
  totalDevelopers: number;
  avgRating: number;
  revenueGrowth: number;
  installGrowth: number;
}

interface CategoryRevenue {
  category: string;
  revenue: number;
  installs: number;
  appCount: number;
}

interface TopDeveloper {
  developerId: string;
  developerName: string;
  totalRevenue: number;
  totalInstalls: number;
  appCount: number;
}

export default function AdminAppStoreAnalyticsPage() {
  const [period, setPeriod] = useState('30d');
  const [summary, setSummary] = useState<AppStoreSummary | null>(null);
  const [categories, setCategories] = useState<CategoryRevenue[]>([]);
  const [developers, setDevelopers] = useState<TopDeveloper[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [summaryRes, categoriesRes, developersRes] = await Promise.all([
          api.get<{ summary: AppStoreSummary }>(`/admin/analytics/app-store?period=${period}`),
          api.get<{ categories: CategoryRevenue[] }>(`/admin/analytics/app-store/categories?period=${period}`),
          api.get<{ developers: TopDeveloper[] }>(`/admin/analytics/app-store/developers?period=${period}&limit=10`),
        ]);

        setSummary(summaryRes.summary);
        setCategories(categoriesRes.categories || []);
        setDevelopers(developersRes.developers || []);
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [period]);

  const formatCurrency = (value: number) => `${value.toFixed(2)} BZR`;
  const formatNumber = (value: number) => value.toLocaleString();
  const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

  const categoryLabels: Record<string, { label: string; icon: string }> = {
    finance: { label: 'Finanças', icon: '💰' },
    social: { label: 'Social', icon: '💬' },
    commerce: { label: 'Comércio', icon: '🛒' },
    tools: { label: 'Ferramentas', icon: '🛠️' },
    governance: { label: 'Governança', icon: '🗳️' },
    entertainment: { label: 'Entretenimento', icon: '🎮' },
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/app/admin">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Admin
          </Link>
        </Button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">App Store Analytics</h1>
              <p className="text-muted-foreground">Métricas da plataforma</p>
            </div>
          </div>

          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="all">Todo período</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-24 mb-2" />
                  <div className="h-8 bg-muted rounded w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Main Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  Receita Total
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary?.totalRevenue || 0)}
                </div>
                {summary?.revenueGrowth !== undefined && (
                  <p className={`text-xs ${summary.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(summary.revenueGrowth)} vs período anterior
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Download className="w-4 h-4 text-blue-500" />
                  Instalações
                </div>
                <div className="text-2xl font-bold">
                  {formatNumber(summary?.totalInstalls || 0)}
                </div>
                {summary?.installGrowth !== undefined && (
                  <p className={`text-xs ${summary.installGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(summary.installGrowth)} vs período anterior
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Package className="w-4 h-4 text-purple-500" />
                  Apps Publicados
                </div>
                <div className="text-2xl font-bold">
                  {summary?.publishedApps || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  de {summary?.totalApps || 0} total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Users className="w-4 h-4 text-orange-500" />
                  Desenvolvedores
                </div>
                <div className="text-2xl font-bold">
                  {summary?.totalDevelopers || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  ativos na plataforma
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Split</CardTitle>
                <CardDescription>Divisão de receita da plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Desenvolvedores</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(summary?.developerRevenue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Plataforma (Treasury)</span>
                    <span className="font-bold">
                      {formatCurrency(summary?.platformRevenue || 0)}
                    </span>
                  </div>
                  <div className="h-4 rounded-full overflow-hidden bg-muted flex">
                    {summary && summary.totalRevenue > 0 && (
                      <>
                        <div
                          className="bg-green-500 h-full"
                          style={{
                            width: `${(summary.developerRevenue / summary.totalRevenue) * 100}%`,
                          }}
                        />
                        <div
                          className="bg-primary h-full"
                          style={{
                            width: `${(summary.platformRevenue / summary.totalRevenue) * 100}%`,
                          }}
                        />
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    ~{summary?.totalRevenue ? Math.round((summary.developerRevenue / summary.totalRevenue) * 100) : 0}% para devs / ~{summary?.totalRevenue ? Math.round((summary.platformRevenue / summary.totalRevenue) * 100) : 0}% para treasury
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rating Médio</CardTitle>
                <CardDescription>Avaliação média dos apps</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                      <span className="text-4xl font-bold">
                        {summary?.avgRating?.toFixed(1) || '-'}
                      </span>
                    </div>
                    <p className="text-muted-foreground">de 5.0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Categories */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Receita por Categoria</CardTitle>
              <CardDescription>Performance das categorias de apps</CardDescription>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum dado de categoria disponível
                </p>
              ) : (
                <div className="space-y-4">
                  {categories.map((cat) => {
                    const catInfo = categoryLabels[cat.category] || { label: cat.category, icon: '📦' };
                    const maxRevenue = Math.max(...categories.map((c) => c.revenue));
                    const percentage = maxRevenue > 0 ? (cat.revenue / maxRevenue) * 100 : 0;

                    return (
                      <div key={cat.category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>{catInfo.icon}</span>
                            <span className="font-medium">{catInfo.label}</span>
                            <Badge variant="outline">{cat.appCount} apps</Badge>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{formatCurrency(cat.revenue)}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatNumber(cat.installs)} installs
                            </div>
                          </div>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden bg-muted">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Developers */}
          <Card>
            <CardHeader>
              <CardTitle>Top Desenvolvedores</CardTitle>
              <CardDescription>Desenvolvedores com maior receita</CardDescription>
            </CardHeader>
            <CardContent>
              {developers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum desenvolvedor encontrado
                </p>
              ) : (
                <div className="space-y-4">
                  {developers.map((dev, index) => (
                    <div
                      key={dev.developerId}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{dev.developerName}</div>
                          <div className="text-xs text-muted-foreground">
                            {dev.appCount} apps • {formatNumber(dev.totalInstalls)} installs
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          {formatCurrency(dev.totalRevenue)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
