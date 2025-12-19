// path: apps/web/src/modules/pay/pages/enterprise/EnterpriseDashboard.tsx
// Bazari Pay - Enterprise Dashboard (PROMPT-06)

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  DollarSign,
  Calendar,
  TrendingUp,
  Upload,
  Key,
  Webhook,
  BarChart,
  ArrowRight,
} from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import { useSellerProfiles } from '@/hooks/useSellerProfiles';

interface EnterpriseStats {
  contracts: {
    active: number;
    paused: number;
    closed: number;
    total: number;
  };
  monthlyTotal: string;
  upcomingPayments: number;
  successRate: number;
}

interface BatchImport {
  id: string;
  fileName: string;
  totalRows: number;
  createdCount: number;
  failedCount: number;
  status: string;
  createdAt: string;
}

export function EnterpriseDashboard() {
  const { profiles, loading: profilesLoading } = useSellerProfiles();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [stats, setStats] = useState<EnterpriseStats | null>(null);
  const [imports, setImports] = useState<BatchImport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profiles.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(profiles[0].id);
    }
  }, [profiles, selectedCompanyId]);

  useEffect(() => {
    if (!selectedCompanyId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, importsRes] = await Promise.all([
          apiHelpers.get<EnterpriseStats>(`/api/pay/reports/stats?companyId=${selectedCompanyId}`),
          apiHelpers.get<{ imports: BatchImport[] }>(`/api/pay/batch/imports?companyId=${selectedCompanyId}&limit=5`),
        ]);
        setStats(statsRes);
        setImports(importsRes.imports);
      } catch (error) {
        console.error('Error fetching enterprise data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedCompanyId]);

  const formatValue = (value: string) => {
    const num = parseFloat(value) / 1e12;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
      COMPLETED: { variant: 'default', label: 'Concluído' },
      COMPLETED_WITH_ERRORS: { variant: 'secondary', label: 'Com erros' },
      PROCESSING: { variant: 'secondary', label: 'Processando' },
      FAILED: { variant: 'destructive', label: 'Falhou' },
    };
    const config = variants[status] || { variant: 'secondary' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (profilesLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Você precisa ter uma loja para usar o Bazari Pay Enterprise.
            </p>
            <Button asChild>
              <Link to="/app/seller/create">Criar Loja</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bazari Pay Enterprise</h1>
          <p className="text-muted-foreground">
            Gerencie pagamentos em escala para sua empresa
          </p>
        </div>
        {profiles.length > 1 && (
          <select
            className="px-3 py-2 border rounded-md"
            value={selectedCompanyId || ''}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.shopName}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contratos Ativos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.contracts.active}</div>
              <p className="text-xs text-muted-foreground">
                de {stats.contracts.total} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Folha Mensal</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatValue(stats.monthlyTotal)} BZR</div>
              <p className="text-xs text-muted-foreground">
                soma dos contratos ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagamentos</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingPayments}</div>
              <p className="text-xs text-muted-foreground">
                próximos 7 dias
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate}%</div>
              <p className="text-xs text-muted-foreground">
                últimos 30 dias
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <Button asChild>
          <Link to={`/app/pay/enterprise/import?company=${selectedCompanyId}`}>
            <Upload className="h-4 w-4 mr-2" />
            Importar CSV
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={`/app/pay/enterprise/api-keys?company=${selectedCompanyId}`}>
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={`/app/pay/enterprise/webhooks?company=${selectedCompanyId}`}>
            <Webhook className="h-4 w-4 mr-2" />
            Webhooks
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={`/app/pay/enterprise/reports?company=${selectedCompanyId}`}>
            <BarChart className="h-4 w-4 mr-2" />
            Relatórios
          </Link>
        </Button>
      </div>

      {/* Recent Imports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Importações Recentes</CardTitle>
              <CardDescription>
                Últimas importações de contratos via CSV
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/app/pay/enterprise/import?company=${selectedCompanyId}`}>
                Ver todas <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {imports.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma importação encontrada
            </p>
          ) : (
            <div className="space-y-4">
              {imports.map((imp) => (
                <div key={imp.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{imp.fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      {imp.createdCount} criados • {imp.failedCount} erros • {formatDate(imp.createdAt)}
                    </p>
                  </div>
                  {getStatusBadge(imp.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
