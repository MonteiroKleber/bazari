// path: apps/web/src/modules/pay/pages/PayDashboardPage.tsx
// Bazari Pay - Dashboard/Home Page (PROMPT-00)

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Banknote,
  Plus,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  FileText,
  AlertCircle,
  RefreshCw,
  Clock,
  History,
} from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { getDashboard } from '../api';

// Formatador de moeda simples
function formatCurrency(value: number, currency: string): string {
  if (currency === 'BRL') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }
  return `${value.toLocaleString('pt-BR')} ${currency}`;
}

export function PayDashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['pay-dashboard'],
    queryFn: getDashboard,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 pt-20">
          <div className="animate-pulse space-y-6 max-w-4xl mx-auto">
            <div className="h-16 bg-muted rounded-lg" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-muted rounded-lg" />
              ))}
            </div>
            <div className="h-48 bg-muted rounded-lg" />
          </div>
        </main>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 pt-20">
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">
                Erro ao carregar dashboard
              </h3>
              <p className="text-muted-foreground mb-4">
                Tente novamente mais tarde.
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const { stats, upcomingPayments } = data;
  const hasContracts = stats.contractsAsPayer > 0 || stats.contractsAsReceiver > 0;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 pt-20 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <Banknote className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Bazari Pay</h1>
              <p className="text-sm text-muted-foreground">
                Pagamentos recorrentes automáticos
              </p>
            </div>
          </div>
          <Button asChild>
            <Link to="/app/pay/contracts/new">
              <Plus className="h-4 w-4 mr-2" />
              Novo Contrato
            </Link>
          </Button>
        </div>

        {/* Empty State */}
        {!hasContracts && (
          <Card>
            <CardContent className="py-12 text-center">
              <Banknote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-lg font-semibold mb-2">
                Nenhum contrato de pagamento
              </h2>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Crie seu primeiro contrato de pagamento recorrente para automatizar
                pagamentos de salários, serviços ou qualquer valor periódico.
              </p>
              <Button asChild>
                <Link to="/app/pay/contracts/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Contrato
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        {hasContracts && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link to="/app/pay/contracts?role=payer">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardContent className="pt-4 pb-4 text-center">
                    <div className="text-2xl font-bold text-emerald-600">
                      {stats.activeContractsAsPayer}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <ArrowUpRight className="h-3 w-3" />
                      Pagando
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link to="/app/pay/contracts?role=receiver">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardContent className="pt-4 pb-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.activeContractsAsReceiver}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <ArrowDownLeft className="h-3 w-3" />
                      Recebendo
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Card className="h-full">
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="text-lg font-bold text-primary">
                    {formatCurrency(stats.monthlyTotalBRL, 'BRL')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total/mês (BRL)
                  </div>
                </CardContent>
              </Card>

              <Link to="/app/pay/history?status=SCHEDULED">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardContent className="pt-4 pb-4 text-center">
                    <div className="text-2xl font-bold text-amber-600">
                      {stats.pendingExecutions}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" />
                      Pendentes
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Upcoming Payments */}
            {upcomingPayments.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Próximos Pagamentos (7 dias)
                    </CardTitle>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/app/pay/contracts">
                        Ver todos
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {upcomingPayments.map((payment) => (
                    <Link
                      key={payment.id}
                      to={`/app/pay/contracts/${payment.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={payment.otherParty.avatarUrl || undefined} />
                        <AvatarFallback>
                          {payment.otherParty.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {payment.otherParty.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {payment.description || (payment.role === 'payer' ? 'Pagamento' : 'Recebimento')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${payment.role === 'payer' ? 'text-red-600' : 'text-green-600'}`}>
                          {payment.role === 'payer' ? '-' : '+'}
                          {formatCurrency(parseFloat(payment.baseValue), payment.currency)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(payment.nextPaymentDate).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Acesso Rápido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                    <Link to="/app/pay/contracts">
                      <FileText className="h-5 w-5 mb-1" />
                      <span className="text-xs">Contratos</span>
                    </Link>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                    <Link to="/app/pay/history">
                      <History className="h-5 w-5 mb-1" />
                      <span className="text-xs">Histórico</span>
                    </Link>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                    <Link to="/app/pay/adjustments">
                      <ArrowUpRight className="h-5 w-5 mb-1" />
                      <span className="text-xs">Ajustes</span>
                    </Link>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                    <Link to="/app/pay/contracts/new">
                      <Plus className="h-5 w-5 mb-1" />
                      <span className="text-xs">Novo</span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

export default PayDashboardPage;
