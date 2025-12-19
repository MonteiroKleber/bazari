// path: apps/web/src/modules/work/components/ProposalCard.tsx
// Card de proposta na listagem

import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DollarSign,
  Clock,
  ExternalLink,
  Building2,
  User,
  MessageSquare,
  Calendar,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { WorkProposal, ProposalStatus, PaymentPeriod } from '../api';

const statusLabels: Record<ProposalStatus, string> = {
  PENDING: 'Pendente',
  NEGOTIATING: 'Em Negociação',
  ACCEPTED: 'Aceita',
  REJECTED: 'Recusada',
  EXPIRED: 'Expirada',
  CANCELLED: 'Cancelada',
};

const statusColors: Record<ProposalStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  NEGOTIATING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  EXPIRED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const paymentPeriodLabels: Record<PaymentPeriod, string> = {
  HOURLY: '/hora',
  DAILY: '/dia',
  WEEKLY: '/semana',
  MONTHLY: '/mês',
  PROJECT: '/projeto',
};

export interface ProposalCardProps {
  proposal: WorkProposal;
  viewAs: 'sender' | 'receiver';
  onClick?: () => void;
}

export function ProposalCard({ proposal, viewAs, onClick }: ProposalCardProps) {
  const otherParty = viewAs === 'sender' ? proposal.receiver : proposal.sender;
  const isFromCompany = !!proposal.company;

  const initials = isFromCompany
    ? proposal.company?.name
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || '?'
    : otherParty?.displayName
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || '?';

  const avatarUrl = isFromCompany
    ? proposal.company?.logoUrl
    : otherParty?.avatarUrl;

  const displayName = isFromCompany
    ? proposal.company?.name
    : otherParty?.displayName || `@${otherParty?.handle}`;

  const createdAgo = formatDistanceToNow(new Date(proposal.createdAt), {
    addSuffix: true,
    locale: ptBR,
  });

  const expiresAt = new Date(proposal.expiresAt);
  const isExpiringSoon =
    proposal.status === 'PENDING' &&
    expiresAt.getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000; // 3 days

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header: Title + Status */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base line-clamp-2">
                  {proposal.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                  {isFromCompany ? (
                    <Building2 className="h-3.5 w-3.5" />
                  ) : (
                    <User className="h-3.5 w-3.5" />
                  )}
                  {displayName}
                </p>
              </div>
            </div>
            <Badge className={statusColors[proposal.status]}>
              {statusLabels[proposal.status]}
            </Badge>
          </div>

          {/* Description preview */}
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
            {proposal.description}
          </p>

          {/* Job reference if exists */}
          {proposal.jobPosting && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
              <span className="font-medium">Vaga:</span>
              <span className="truncate">{proposal.jobPosting.title}</span>
            </div>
          )}

          {/* Footer: Value + Chat + Dates */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
            <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground flex-wrap">
              {proposal.proposedValue && (
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <DollarSign className="h-3.5 w-3.5" />
                  {proposal.valueCurrency}{' '}
                  {parseFloat(proposal.proposedValue).toLocaleString('pt-BR')}
                  {proposal.valuePeriod && paymentPeriodLabels[proposal.valuePeriod]}
                </span>
              )}
              {proposal.chatThreadId && (
                <span className="flex items-center gap-1 text-blue-600">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Chat ativo
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {createdAgo}
              </span>
              {isExpiringSoon && (
                <span className="flex items-center gap-1 text-amber-600">
                  <Calendar className="h-3.5 w-3.5" />
                  Expira em {format(expiresAt, "d 'de' MMM", { locale: ptBR })}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:w-auto"
            >
              <Link to={`/app/work/proposals/${proposal.id}`}>
                Ver Proposta
                <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ProposalCard;
