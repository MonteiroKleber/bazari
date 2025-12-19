// path: apps/web/src/modules/pay/components/ExecutionCard.tsx
// Card de execução na listagem (PROMPT-02)

import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowUpRight, ArrowDownLeft, ExternalLink, Clock } from 'lucide-react';
import { ExecutionStatus } from './ExecutionStatus';
import type { ExecutionHistoryItem } from '../api';

interface ExecutionCardProps {
  execution: ExecutionHistoryItem;
  showContract?: boolean;
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
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ExecutionCard({
  execution,
  showContract = true,
}: ExecutionCardProps) {
  const isPayer = execution.role === 'payer';

  return (
    <Card className="hover:bg-muted/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar e Info */}
          <Avatar className="h-10 w-10">
            <AvatarImage src={execution.otherParty.avatarUrl || undefined} />
            <AvatarFallback>
              {execution.otherParty.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium truncate">
                {execution.otherParty.name}
              </span>
              <ExecutionStatus status={execution.status} />
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
              {isPayer ? (
                <ArrowUpRight className="h-3 w-3 text-red-500 flex-shrink-0" />
              ) : (
                <ArrowDownLeft className="h-3 w-3 text-green-500 flex-shrink-0" />
              )}
              <span>{isPayer ? 'Pagamento' : 'Recebimento'}</span>
              <span className="text-muted-foreground/50">•</span>
              <span>Ref: {execution.periodRef}</span>
            </div>
            {execution.description && (
              <div className="text-xs text-muted-foreground truncate mt-1">
                {execution.description}
              </div>
            )}
            {execution.failureReason && execution.status !== 'SUCCESS' && (
              <div className="text-xs text-red-500 mt-1">
                Erro: {execution.failureReason === 'INSUFFICIENT_BALANCE'
                  ? 'Saldo insuficiente'
                  : execution.failureReason}
              </div>
            )}
            {execution.nextRetryAt && execution.status === 'RETRYING' && (
              <div className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3" />
                Próxima tentativa: {formatDateTime(execution.nextRetryAt)}
              </div>
            )}
          </div>

          {/* Valor e Data */}
          <div className="text-right">
            <div
              className={`font-semibold ${
                isPayer ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {isPayer ? '-' : '+'}
              {formatCurrency(execution.finalValue, execution.currency)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDate(execution.scheduledAt)}
            </div>
            {execution.txHash && (
              <a
                href={`https://polkadot.js.org/apps/#/explorer/query/${execution.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary flex items-center justify-end gap-1 hover:underline mt-1"
                onClick={(e) => e.stopPropagation()}
              >
                TX: {execution.txHash.slice(0, 8)}...
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {/* Link para contrato */}
        {showContract && (
          <div className="mt-3 pt-3 border-t">
            <Link
              to={`/app/pay/contracts/${execution.contractId}`}
              className="text-xs text-primary hover:underline"
            >
              Ver contrato →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
