// path: apps/web/src/modules/pay/components/ContractCard.tsx
// Card de contrato na listagem (PROMPT-01)

import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowUpRight, ArrowDownLeft, Calendar } from 'lucide-react';
import { ContractStatus } from './ContractStatus';
import type { PayContractListItem, PayPeriod } from '../api';

interface ContractCardProps {
  contract: PayContractListItem;
}

const periodLabels: Record<PayPeriod, string> = {
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quinzenal',
  MONTHLY: 'Mensal',
};

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

export function ContractCard({ contract }: ContractCardProps) {
  const isPayer = contract.role === 'payer';

  return (
    <Link to={`/app/pay/contracts/${contract.id}`}>
      <Card className="hover:bg-muted/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Avatar e Info */}
            <Avatar className="h-12 w-12">
              <AvatarImage src={contract.otherParty.avatarUrl || undefined} />
              <AvatarFallback>
                {contract.otherParty.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">
                  {contract.otherParty.name}
                </span>
                <ContractStatus status={contract.status} />
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                {isPayer ? (
                  <ArrowUpRight className="h-3 w-3 text-red-500" />
                ) : (
                  <ArrowDownLeft className="h-3 w-3 text-green-500" />
                )}
                <span>{isPayer ? 'Pagando' : 'Recebendo'}</span>
                <span className="text-muted-foreground/50">•</span>
                <span>{periodLabels[contract.period]}</span>
              </div>
              {contract.description && (
                <div className="text-xs text-muted-foreground truncate mt-1">
                  {contract.description}
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
                {formatCurrency(contract.baseValue, contract.currency)}
              </div>
              <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                <Calendar className="h-3 w-3" />
                Dia {contract.paymentDay}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
