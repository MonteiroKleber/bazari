import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Package, Star, Download, TrendingUp, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

interface DeveloperApp {
  id: string;
  appId: string;
  name: string;
  icon: string;
  color: string;
  status: string;
  installCount: number;
  rating: number | null;
  updatedAt: string;
  _count: {
    reviews: number;
    versions: number;
  };
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING_REVIEW: 'Em Revisão',
  APPROVED: 'Aprovado',
  PUBLISHED: 'Publicado',
  REJECTED: 'Rejeitado',
  SUSPENDED: 'Suspenso',
  DEPRECATED: 'Descontinuado',
};

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  PENDING_REVIEW: 'secondary',
  APPROVED: 'default',
  PUBLISHED: 'default',
  REJECTED: 'destructive',
  SUSPENDED: 'destructive',
  DEPRECATED: 'outline',
};

export default function DevPortalDashboardPage() {
  const [apps, setApps] = useState<DeveloperApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchApps = async () => {
      try {
        const response = await api.get('/developer/apps');
        if (active) {
          setApps(response.data.apps || []);
        }
      } catch (err) {
        if (active) {
          setError('Erro ao carregar apps');
          console.error('Error fetching developer apps:', err);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };
    fetchApps();
    return () => { active = false; };
  }, []);

  const totalInstalls = apps.reduce((sum, app) => sum + app.installCount, 0);
  const appsWithRating = apps.filter((a) => a.rating);
  const avgRating =
    appsWithRating.length > 0
      ? appsWithRating.reduce((sum, a) => sum + (a.rating || 0), 0) / appsWithRating.length
      : 0;
  const publishedCount = apps.filter((a) => a.status === 'PUBLISHED').length;

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Code className="w-8 h-8" />
            Developer Portal
          </h1>
          <p className="text-muted-foreground">
            Gerencie seus apps no ecossistema Bazari
          </p>
        </div>
        <Button asChild>
          <Link to="/app/developer/new">
            <Plus className="w-4 h-4 mr-2" />
            Novo App
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Apps</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apps.length}</div>
            <p className="text-xs text-muted-foreground">
              {publishedCount} publicados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Instalações
            </CardTitle>
            <Download className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalInstalls.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rating Médio</CardTitle>
            <Star className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgRating > 0 ? avgRating.toFixed(1) : '-'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue (30d)</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 BZR</div>
            <p className="text-xs text-muted-foreground">Em breve</p>
          </CardContent>
        </Card>
      </div>

      {/* Apps List */}
      <Card>
        <CardHeader>
          <CardTitle>Meus Apps</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              {error}
            </div>
          ) : apps.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum app ainda</h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro app para o Bazari
              </p>
              <Button asChild>
                <Link to="/app/developer/new">Criar App</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {apps.map((app) => (
                <Link
                  key={app.id}
                  to={`/app/developer/apps/${app.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center text-white text-xl`}
                    >
                      {app.icon.startsWith('http') ? (
                        <img src={app.icon} alt="" className="w-8 h-8" />
                      ) : (
                        app.icon
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{app.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {app.appId}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {app.installCount.toLocaleString()} instalações
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {app.rating ? `⭐ ${app.rating.toFixed(1)}` : 'Sem rating'}
                      </div>
                    </div>
                    <Badge variant={statusColors[app.status] || 'outline'}>
                      {statusLabels[app.status] || app.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Documentação SDK</h3>
            <p className="text-sm text-muted-foreground">
              Aprenda a usar o @bazari/app-sdk
            </p>
          </CardContent>
        </Card>
        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Diretrizes de Review</h3>
            <p className="text-sm text-muted-foreground">
              Requisitos para aprovação
            </p>
          </CardContent>
        </Card>
        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Suporte</h3>
            <p className="text-sm text-muted-foreground">
              Ajuda e comunidade de devs
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
