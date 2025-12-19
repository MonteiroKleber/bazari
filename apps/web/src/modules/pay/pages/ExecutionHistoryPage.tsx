// path: apps/web/src/modules/pay/pages/ExecutionHistoryPage.tsx
// Histórico de pagamentos executados (PROMPT-02)

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { ExecutionCard } from '../components';
import { getExecutionHistory, getExecutionStats } from '../api';
import type { ExecutionStatus as ExecutionStatusType } from '../api';

function formatCurrency(value: string, currency: string): string {
  const numValue = parseFloat(value);
  if (currency === 'BRL') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue);
  }
  return `${numValue.toLocaleString('pt-BR')} ${currency}`;
}

function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }

  return options;
}

export function ExecutionHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRole = searchParams.get('role') as 'payer' | 'receiver' | null;
  const [role, setRole] = useState<'all' | 'payer' | 'receiver'>(initialRole || 'all');
  const [statusFilter, setStatusFilter] = useState<ExecutionStatusType | 'all'>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');

  const monthOptions = getMonthOptions();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['pay-executions', role, statusFilter, periodFilter],
    queryFn: () =>
      getExecutionHistory({
        role: role === 'all' ? undefined : role,
        status: statusFilter === 'all' ? undefined : statusFilter,
        periodRef: periodFilter === 'all' ? undefined : periodFilter,
        limit: 50,
      }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['pay-execution-stats'],
    queryFn: () => getExecutionStats(),
  });

  const executions = data?.executions || [];
  const stats = statsData?.stats;

  const payerExecutions = executions.filter((e) => e.role === 'payer');
  const receiverExecutions = executions.filter((e) => e.role === 'receiver');

  const handleRoleChange = (newRole: string) => {
    setRole(newRole as 'all' | 'payer' | 'receiver');
    if (newRole === 'all') {
      searchParams.delete('role');
    } else {
      searchParams.set('role', newRole);
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 pt-20 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/app/pay">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Histórico de Pagamentos</h1>
              <p className="text-sm text-muted-foreground">
                Acompanhe todas as execuções de pagamentos
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Sucesso</span>
                </div>
                <div className="text-2xl font-bold mt-1">{stats.successCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-muted-foreground">Falhas</span>
                </div>
                <div className="text-2xl font-bold mt-1">{stats.failedCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Pago</span>
                </div>
                <div className="text-lg font-bold mt-1">
                  {parseFloat(stats.totalPaidBRL) > 0 && (
                    <div>{formatCurrency(stats.totalPaidBRL, 'BRL')}</div>
                  )}
                  {parseFloat(stats.totalPaidBZR) > 0 && (
                    <div className="text-sm">
                      {formatCurrency(stats.totalPaidBZR, 'BZR')}
                    </div>
                  )}
                  {parseFloat(stats.totalPaidBRL) === 0 &&
                    parseFloat(stats.totalPaidBZR) === 0 && (
                      <span className="text-muted-foreground">-</span>
                    )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Recebido</span>
                </div>
                <div className="text-lg font-bold mt-1">
                  {parseFloat(stats.totalReceivedBRL) > 0 && (
                    <div>{formatCurrency(stats.totalReceivedBRL, 'BRL')}</div>
                  )}
                  {parseFloat(stats.totalReceivedBZR) > 0 && (
                    <div className="text-sm">
                      {formatCurrency(stats.totalReceivedBZR, 'BZR')}
                    </div>
                  )}
                  {parseFloat(stats.totalReceivedBRL) === 0 &&
                    parseFloat(stats.totalReceivedBZR) === 0 && (
                      <span className="text-muted-foreground">-</span>
                    )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-4">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as ExecutionStatusType | 'all')}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="SUCCESS">Sucesso</SelectItem>
              <SelectItem value="FAILED">Falhou</SelectItem>
              <SelectItem value="RETRYING">Tentando</SelectItem>
              <SelectItem value="SCHEDULED">Agendado</SelectItem>
              <SelectItem value="PROCESSING">Processando</SelectItem>
              <SelectItem value="SKIPPED">Ignorado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os períodos</SelectItem>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">
                Erro ao carregar histórico
              </h3>
              <p className="text-muted-foreground mb-4">Tente novamente mais tarde.</p>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !isError && executions.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">
                Nenhuma execução encontrada
              </h3>
              <p className="text-muted-foreground mb-4">
                {statusFilter !== 'all' || periodFilter !== 'all'
                  ? 'Nenhuma execução corresponde aos filtros selecionados.'
                  : 'Você ainda não tem pagamentos executados.'}
              </p>
              <Button asChild variant="outline">
                <Link to="/app/pay/contracts">Ver Contratos</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Lista com Tabs */}
        {!isLoading && !isError && executions.length > 0 && (
          <Tabs value={role} onValueChange={handleRoleChange}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">Todos ({executions.length})</TabsTrigger>
              <TabsTrigger value="payer" className="flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                Pagos ({payerExecutions.length})
              </TabsTrigger>
              <TabsTrigger value="receiver" className="flex items-center gap-1">
                <ArrowDownLeft className="h-3 w-3" />
                Recebidos ({receiverExecutions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3 mt-4">
              {executions.map((execution) => (
                <ExecutionCard key={execution.id} execution={execution} />
              ))}
            </TabsContent>

            <TabsContent value="payer" className="space-y-3 mt-4">
              {payerExecutions.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Você não tem pagamentos realizados com os filtros selecionados.
                  </CardContent>
                </Card>
              ) : (
                payerExecutions.map((execution) => (
                  <ExecutionCard key={execution.id} execution={execution} />
                ))
              )}
            </TabsContent>

            <TabsContent value="receiver" className="space-y-3 mt-4">
              {receiverExecutions.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Você não tem pagamentos recebidos com os filtros selecionados.
                  </CardContent>
                </Card>
              ) : (
                receiverExecutions.map((execution) => (
                  <ExecutionCard key={execution.id} execution={execution} />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

export default ExecutionHistoryPage;
