// path: apps/web/src/modules/work/components/AgreementCard.tsx
// Card de acordo para listagem

import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Building2,
  User,
  Calendar,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AgreementStatusBadge } from './AgreementStatusBadge';
import type { WorkAgreement, PaymentPeriod } from '../api';

interface AgreementCardProps {
  agreement: WorkAgreement;
  viewAs: 'worker' | 'company';
}

const paymentPeriodLabels: Record<PaymentPeriod, string> = {
  HOURLY: '/hora',
  DAILY: '/dia',
  WEEKLY: '/semana',
  MONTHLY: '/mês',
  PROJECT: '/projeto',
};

export function AgreementCard({ agreement, viewAs }: AgreementCardProps) {
  // Determina qual parte mostrar (a outra parte do acordo)
  const isCompanyView = viewAs === 'company';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Avatar da outra parte */}
          <div className="flex items-start gap-3 flex-1">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage
                src={
                  isCompanyView
                    ? agreement.worker?.avatarUrl || undefined
                    : agreement.company?.logoUrl || undefined
                }
              />
              <AvatarFallback>
                {isCompanyView
                  ? agreement.worker?.displayName?.[0] || '?'
                  : agreement.company?.name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              {/* Título e Status */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-semibold line-clamp-1">{agreement.title}</h3>
                <AgreementStatusBadge status={agreement.status} />
              </div>

              {/* Outra Parte */}
              <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                {isCompanyView ? (
                  <>
                    <User className="h-3.5 w-3.5" />
                    <span className="truncate">
                      {agreement.worker?.displayName || 'Profissional'}
                    </span>
                  </>
                ) : (
                  <>
                    <Building2 className="h-3.5 w-3.5" />
                    <span className="truncate">
                      {agreement.company?.name || 'Empresa'}
                    </span>
                  </>
                )}
              </p>

              {/* Detalhes */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {/* Valor */}
                {agreement.agreedValue && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    {agreement.valueCurrency}{' '}
                    {parseFloat(agreement.agreedValue).toLocaleString('pt-BR')}
                    {paymentPeriodLabels[agreement.valuePeriod]}
                  </span>
                )}

                {/* Data de Início */}
                {agreement.startDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(agreement.startDate), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Ação */}
          <div className="flex items-center">
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/app/work/agreements/${agreement.id}`}>
                Ver Detalhes
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AgreementCard;
