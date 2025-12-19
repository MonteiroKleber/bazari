// path: apps/web/src/modules/pay/components/AdjustmentCard.tsx
// Card de ajuste (PROMPT-03)

import { Card, CardContent } from '@/components/ui/card';
import { Plus, Minus, Calendar } from 'lucide-react';
import { AdjustmentStatus } from './AdjustmentStatus';
import type { PayAdjustment } from '../api';

interface AdjustmentCardProps {
  adjustment: PayAdjustment;
  showExecution?: boolean;
  onClick?: () => void;
}

function formatCurrency(value: string, currency: string = 'BRL'): string {
  const numValue = parseFloat(value);
  if (currency === 'BRL') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue);
  }
  return `${numValue.toLocaleString('pt-BR')} ${currency}`;
}

function formatMonth(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

export function AdjustmentCard({
  adjustment,
  showExecution = false,
  onClick,
}: AdjustmentCardProps) {
  const isExtra = adjustment.type === 'EXTRA';

  return (
    <Card
      className={`hover:bg-muted/50 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-full ${
                isExtra ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}
            >
              {isExtra ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`font-semibold ${
                    isExtra ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {isExtra ? '+' : '-'}
                  {formatCurrency(adjustment.value)}
                </span>
                <AdjustmentStatus status={adjustment.status} />
              </div>
              <div className="text-sm font-medium mt-1">{adjustment.reason}</div>
              {adjustment.description && (
                <div className="text-sm text-muted-foreground mt-0.5">
                  {adjustment.description}
                </div>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Ref: {formatMonth(adjustment.referenceMonth)}
                </span>
                <span>Criado em {formatDate(adjustment.createdAt)}</span>
              </div>
              {showExecution && adjustment.execution && (
                <div className="text-xs text-muted-foreground mt-1">
                  Aplicado em{' '}
                  {adjustment.execution.executedAt
                    ? formatDate(adjustment.execution.executedAt)
                    : adjustment.execution.periodRef}
                </div>
              )}
              {adjustment.rejectionReason && (
                <div className="text-xs text-red-500 mt-1">
                  Motivo: {adjustment.rejectionReason}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
