// path: apps/web/src/modules/pay/components/ExecutionTimeline.tsx
// Timeline de execuções de um contrato (PROMPT-02)

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExecutionStatus } from './ExecutionStatus';
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import type { ContractExecution } from '../api';

interface ExecutionTimelineProps {
  executions: ContractExecution[];
  currency: string;
}

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR');
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'SUCCESS':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'FAILED':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'RETRYING':
      return <RefreshCw className="h-4 w-4 text-amber-500" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

export function ExecutionTimeline({
  executions,
  currency,
}: ExecutionTimelineProps) {
  if (executions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Histórico de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum pagamento executado ainda.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Agrupar por mês
  const grouped = executions.reduce((acc, exec) => {
    const monthYear = exec.periodRef;
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(exec);
    return acc;
  }, {} as Record<string, ContractExecution[]>);

  const sortedMonths = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Histórico de Pagamentos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {sortedMonths.map((monthYear) => {
          const [year, month] = monthYear.split('-');
          const monthName = new Date(
            parseInt(year),
            parseInt(month) - 1
          ).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

          return (
            <div key={monthYear}>
              <h4 className="text-sm font-medium text-muted-foreground capitalize mb-3">
                {monthName}
              </h4>
              <div className="space-y-3">
                {grouped[monthYear].map((exec) => (
                  <div
                    key={exec.id}
                    className="flex items-start gap-3 pl-2 border-l-2 border-muted"
                  >
                    <div className="mt-0.5">{getStatusIcon(exec.status)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <ExecutionStatus status={exec.status} showIcon={false} />
                        <span className="font-semibold">
                          {formatCurrency(exec.finalValue, currency)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {exec.executedAt
                          ? `Executado em ${formatDateTime(exec.executedAt)}`
                          : `Agendado para ${formatDate(exec.scheduledAt)}`}
                      </div>
                      {exec.txHash && (
                        <div className="text-xs text-muted-foreground mt-1">
                          TX: {exec.txHash.slice(0, 16)}...
                        </div>
                      )}
                      {exec.failureReason && exec.status !== 'SUCCESS' && (
                        <div className="text-xs text-red-500 mt-1">
                          {exec.failureReason === 'INSUFFICIENT_BALANCE'
                            ? 'Saldo insuficiente'
                            : exec.failureReason}
                        </div>
                      )}
                      {parseFloat(exec.adjustmentsTotal) !== 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Ajustes: {formatCurrency(exec.adjustmentsTotal, currency)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
