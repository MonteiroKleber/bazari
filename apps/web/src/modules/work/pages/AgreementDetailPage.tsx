// path: apps/web/src/modules/work/pages/AgreementDetailPage.tsx
// Página de detalhes do acordo

import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  RefreshCw,
  Building2,
  User,
  FileCheck,
  Timer,
  CreditCard,
  ExternalLink,
  Clock,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AgreementStatusBadge } from '../components/AgreementStatusBadge';
import { AgreementActions } from '../components/AgreementActions';
import { AgreementTimeline } from '../components/AgreementTimeline';
import { OnChainBadge } from '../components/OnChainBadge';
import { EvaluationPrompt } from '../components/EvaluationPrompt';
import { getAgreement, getAgreementEvaluations, type PaymentPeriod, type PaymentType } from '../api';

const paymentPeriodLabels: Record<PaymentPeriod, string> = {
  HOURLY: '/hora',
  DAILY: '/dia',
  WEEKLY: '/semana',
  MONTHLY: '/mês',
  PROJECT: '/projeto',
};

const paymentTypeLabels: Record<PaymentType, { label: string; icon: typeof CreditCard }> = {
  BAZARI_PAY: { label: 'Bazari Pay', icon: CreditCard },
  EXTERNAL: { label: 'Pagamento Externo', icon: ExternalLink },
  UNDEFINED: { label: 'A Definir', icon: Clock },
};

export function AgreementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['agreement', id],
    queryFn: () => getAgreement(id!),
    enabled: !!id,
    retry: false,
  });

  // Buscar avaliações se acordo encerrado
  const { data: evaluationsData } = useQuery({
    queryKey: ['agreement-evaluations', id],
    queryFn: () => getAgreementEvaluations(id!),
    enabled: !!id && data?.agreement?.status === 'CLOSED',
  });

  const handleActionComplete = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['my-agreements'] });
    queryClient.invalidateQueries({ queryKey: ['agreement-history', id] });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 pt-20">
          <div className="animate-pulse space-y-6 max-w-3xl mx-auto">
            <div className="h-8 bg-muted rounded w-2/3" />
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-32 bg-muted rounded" />
            <div className="h-48 bg-muted rounded" />
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
          <Card className="max-w-3xl mx-auto">
            <CardContent className="py-12 text-center">
              <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Acordo não encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Este acordo não existe ou você não tem permissão para vê-lo.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" onClick={() => navigate(-1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <Button variant="outline" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar novamente
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const { agreement, role } = data;
  const isWorker = role === 'worker';
  const paymentTypeConfig = paymentTypeLabels[agreement.paymentType];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 pt-20 space-y-6 max-w-3xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        {/* Header Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Title + Status */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold">{agreement.title}</h1>
                  <p className="text-muted-foreground text-sm mt-1">
                    Acordo de trabalho {isWorker ? 'como profissional' : 'como empresa'}
                  </p>
                </div>
                <AgreementStatusBadge status={agreement.status} size="md" />
              </div>

              {/* Parties */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                {/* Company */}
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-2">Empresa</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={(agreement.company as any)?.logoUrl || undefined} />
                      <AvatarFallback>
                        {agreement.company?.name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        {agreement.company?.name}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Worker */}
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-2">Profissional</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={agreement.worker?.avatarUrl || undefined} />
                      <AvatarFallback>
                        {agreement.worker?.displayName?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        {agreement.worker?.displayName}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Proposal Reference */}
              {agreement.proposal && (
                <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Originado da proposta</p>
                    <p className="font-medium truncate">{agreement.proposal.title}</p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/app/work/proposals/${agreement.proposal.id}`}>
                      Ver proposta
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        {agreement.description && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Descrição</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{agreement.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Terms */}
        {agreement.terms && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Termos do Acordo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{agreement.terms}</p>
            </CardContent>
          </Card>
        )}

        {/* Payment & Timeline */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Payment */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {agreement.agreedValue ? (
                <div className="text-2xl font-bold">
                  {agreement.valueCurrency}{' '}
                  {parseFloat(agreement.agreedValue).toLocaleString('pt-BR')}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    {paymentPeriodLabels[agreement.valuePeriod]}
                  </span>
                </div>
              ) : (
                <div className="text-muted-foreground">Valor a definir</div>
              )}

              <Separator />

              <div className="flex items-center gap-2 text-sm">
                <paymentTypeConfig.icon className="h-4 w-4 text-muted-foreground" />
                <span>{paymentTypeConfig.label}</span>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Timer className="h-4 w-4" />
                Período
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {agreement.startDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Início:{' '}
                    {format(new Date(agreement.startDate), "d 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
              )}

              {agreement.endDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Término:{' '}
                    {format(new Date(agreement.endDate), "d 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
              )}

              {agreement.pausedAt && agreement.status === 'PAUSED' && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <Clock className="h-4 w-4" />
                    <span>
                      Pausado em{' '}
                      {format(new Date(agreement.pausedAt), "d 'de' MMM", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                </>
              )}

              {agreement.closedAt && agreement.status === 'CLOSED' && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      Encerrado em{' '}
                      {format(new Date(agreement.closedAt), "d 'de' MMM", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  {agreement.closedReason && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                      Motivo: {agreement.closedReason}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Evaluation Prompt (only for closed agreements) */}
        {agreement.status === 'CLOSED' && (
          <EvaluationPrompt
            agreementId={agreement.id}
            counterpartyName={
              isWorker
                ? agreement.company?.name || 'a empresa'
                : agreement.worker?.displayName || 'o profissional'
            }
            hasEvaluated={!!evaluationsData?.myEvaluation}
            otherPartyEvaluated={!!evaluationsData?.otherEvaluation}
            isPublic={evaluationsData?.isPublic || false}
          />
        )}

        {/* Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ações</CardTitle>
            <CardDescription>Gerencie este acordo de trabalho</CardDescription>
          </CardHeader>
          <CardContent>
            <AgreementActions agreement={agreement} onAction={handleActionComplete} />
          </CardContent>
        </Card>

        {/* On-Chain Registration */}
        <OnChainBadge
          agreementId={agreement.id}
          onChainId={agreement.onChainId}
          onChainTxHash={agreement.onChainTxHash}
        />

        {/* History Timeline */}
        <AgreementTimeline agreementId={agreement.id} createdAt={agreement.createdAt} />
      </main>
    </div>
  );
}

export default AgreementDetailPage;
