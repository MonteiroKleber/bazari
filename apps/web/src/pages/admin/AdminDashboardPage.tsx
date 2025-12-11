import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Package,
  BarChart3,
  Wallet,
  Award,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  Users,
  DollarSign,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

interface ReviewStats {
  pending: number;
  inReview: number;
  approved: number;
  rejected: number;
  total: number;
  avgReviewTimeHours: number;
}

interface AppStoreAnalytics {
  totalApps: number;
  totalRevenue: number;
  totalInstalls: number;
  totalDevelopers: number;
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  badge?: { text: string; variant: 'default' | 'secondary' | 'destructive' };
  color: string;
}

export default function AdminDashboardPage() {
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [analytics, setAnalytics] = useState<AppStoreAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, analyticsRes] = await Promise.all([
          api.get<ReviewStats>('/admin/app-reviews/stats/summary').catch(() => null),
          api.get<{ summary: AppStoreAnalytics }>('/admin/analytics/app-store').catch(() => ({ summary: null })),
        ]);

        if (statsRes) {
          setReviewStats(statsRes);
        }
        if (analyticsRes?.summary) {
          setAnalytics(analyticsRes.summary);
        }
      } catch (err) {
        console.error('Error fetching admin data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const quickActions: QuickAction[] = [
    {
      title: 'App Reviews',
      description: 'Revisar apps submetidos por desenvolvedores',
      icon: Package,
      href: '/app/admin/app-reviews',
      badge: reviewStats?.pending ? { text: `${reviewStats.pending} pendentes`, variant: 'destructive' } : undefined,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'App Store Analytics',
      description: 'Métricas da App Store e desenvolvedores',
      icon: BarChart3,
      href: '/app/admin/analytics',
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Escrow Management',
      description: 'Gerenciar disputas e liberações',
      icon: Wallet,
      href: '/app/admin/escrows',
      color: 'from-green-500 to-emerald-500',
    },
    {
      title: 'Missions & Rewards',
      description: 'Configurar missões e sistema de rewards',
      icon: Award,
      href: '/app/admin/missions',
      color: 'from-orange-500 to-amber-500',
    },
  ];

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Painel de controle para membros da DAO</p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {!isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Clock className="w-4 h-4 text-yellow-500" />
                Pendentes
              </div>
              <div className="text-2xl font-bold">{reviewStats?.pending || 0}</div>
              <p className="text-xs text-muted-foreground">apps para revisar</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Aprovados
              </div>
              <div className="text-2xl font-bold">{reviewStats?.approved || 0}</div>
              <p className="text-xs text-muted-foreground">apps publicados</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                Instalações
              </div>
              <div className="text-2xl font-bold">
                {analytics?.totalInstalls?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">total da plataforma</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <DollarSign className="w-4 h-4 text-green-500" />
                Receita
              </div>
              <div className="text-2xl font-bold">
                {(analytics?.totalRevenue ?? 0).toFixed(2)} BZR
              </div>
              <p className="text-xs text-muted-foreground">total da plataforma</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <Link key={action.href} to={action.href}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center flex-shrink-0`}>
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{action.title}</h3>
                        {action.badge && (
                          <Badge variant={action.badge.variant}>{action.badge.text}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Review Activity */}
      {reviewStats && (
        <Card>
          <CardHeader>
            <CardTitle>Atividade de Reviews</CardTitle>
            <CardDescription>Status das submissões de apps</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  <span>Aguardando Review</span>
                </div>
                <Badge variant="outline">{reviewStats.pending}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-blue-500" />
                  <span>Em Análise</span>
                </div>
                <Badge variant="secondary">{reviewStats.inReview}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Aprovados</span>
                </div>
                <Badge variant="default">{reviewStats.approved}</Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span>Rejeitados</span>
                </div>
                <Badge variant="destructive">{reviewStats.rejected}</Badge>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tempo médio de review</span>
                  <span className="font-medium">{(reviewStats.avgReviewTimeHours ?? 0).toFixed(1)}h</span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Button asChild className="w-full">
                <Link to="/app/admin/app-reviews">
                  Ver Todos os Reviews
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="mt-6 border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Users className="w-8 h-8 text-muted-foreground" />
            <div>
              <h3 className="font-semibold mb-1">Acesso Restrito</h3>
              <p className="text-sm text-muted-foreground">
                Este painel está disponível apenas para membros da DAO Bazari.
                As ações aqui afetam diretamente a plataforma e seus usuários.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
