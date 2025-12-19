// path: apps/web/src/modules/work/pages/ProposalDetailPage.tsx
// Página de detalhes da proposta

import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/modules/auth/context';
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
  Clock,
  Calendar,
  Briefcase,
  RefreshCw,
  MessageSquare,
  Building2,
  User,
  FileText,
  Timer,
  CreditCard,
  ExternalLink,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppHeader } from '@/components/AppHeader';
import { ProposalStatusBadge } from '../components/ProposalStatusBadge';
import { ProposalActions } from '../components/ProposalActions';
import { getProposal, type PaymentPeriod, type PaymentType } from '../api';

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

export function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['proposal', id],
    queryFn: () => getProposal(id!),
    enabled: !!id,
    retry: false,
  });

  const handleActionComplete = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['my-proposals'] });
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
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">
                Proposta não encontrada
              </h3>
              <p className="text-muted-foreground mb-4">
                Esta proposta não existe ou você não tem permissão para vê-la.
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

  const { proposal } = data;
  const isReceiver = proposal.receiver?.id === profile?.id;
  const isSender = proposal.sender?.id === profile?.id;
  const viewAs = isReceiver ? 'receiver' : 'sender';

  const otherParty = isReceiver ? proposal.sender : proposal.receiver;
  const isFromCompany = !!proposal.company;

  const createdAgo = formatDistanceToNow(new Date(proposal.createdAt), {
    addSuffix: true,
    locale: ptBR,
  });

  const expiresAt = new Date(proposal.expiresAt);
  const isExpired = proposal.status === 'EXPIRED' || expiresAt < new Date();
  const paymentTypeConfig = paymentTypeLabels[proposal.paymentType];

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
                  <h1 className="text-xl sm:text-2xl font-bold">
                    {proposal.title}
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1">
                    {isReceiver
                      ? `Proposta recebida ${createdAgo}`
                      : `Proposta enviada ${createdAgo}`}
                  </p>
                </div>
                <ProposalStatusBadge status={proposal.status} size="md" />
              </div>

              {/* From/To */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                {/* From */}
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-2">De</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={
                          isFromCompany
                            ? proposal.company?.logoUrl || undefined
                            : proposal.sender?.avatarUrl || undefined
                        }
                      />
                      <AvatarFallback>
                        {isFromCompany
                          ? proposal.company?.name?.[0] || '?'
                          : proposal.sender?.displayName?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium flex items-center gap-1.5">
                        {isFromCompany ? (
                          <>
                            <Building2 className="h-3.5 w-3.5" />
                            {proposal.company?.name}
                          </>
                        ) : (
                          <>
                            <User className="h-3.5 w-3.5" />
                            {proposal.sender?.displayName}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* To */}
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-2">Para</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={proposal.receiver?.avatarUrl || undefined}
                      />
                      <AvatarFallback>
                        {proposal.receiver?.displayName?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        {proposal.receiver?.displayName}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Job Reference */}
              {proposal.jobPosting && (
                <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
                  <Briefcase className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Relacionada à vaga
                    </p>
                    <p className="font-medium truncate">
                      {proposal.jobPosting.title}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/app/work/jobs/${proposal.jobPosting.id}`}>
                      Ver vaga
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Descrição</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{proposal.description}</p>
          </CardContent>
        </Card>

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
              {proposal.proposedValue ? (
                <div className="text-2xl font-bold">
                  {proposal.valueCurrency}{' '}
                  {parseFloat(proposal.proposedValue).toLocaleString('pt-BR')}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    {paymentPeriodLabels[proposal.valuePeriod]}
                  </span>
                </div>
              ) : (
                <div className="text-muted-foreground">Valor a negociar</div>
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
                Prazo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {proposal.startDate ? (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Início:{' '}
                    {format(new Date(proposal.startDate), "d 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Data de início a definir</span>
                </div>
              )}

              {proposal.duration && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Duração: {proposal.duration}</span>
                </div>
              )}

              <Separator />

              <div
                className={`flex items-center gap-2 text-sm ${
                  isExpired ? 'text-red-600' : 'text-muted-foreground'
                }`}
              >
                <Timer className="h-4 w-4" />
                <span>
                  {isExpired ? (
                    'Proposta expirada'
                  ) : (
                    <>
                      Válida até{' '}
                      {format(expiresAt, "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                    </>
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Link */}
        {proposal.chatThreadId && (
          <Card>
            <CardContent className="py-4">
              <Button asChild className="w-full" variant="outline">
                <Link to={`/app/chat?thread=${proposal.chatThreadId}`}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Abrir Chat de Negociação
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ações</CardTitle>
            <CardDescription>
              {isReceiver
                ? 'Responda à proposta recebida'
                : 'Gerencie sua proposta'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProposalActions
              proposal={proposal}
              viewAs={viewAs}
              onAction={handleActionComplete}
            />
          </CardContent>
        </Card>

        {/* Response Info */}
        {proposal.respondedAt && (
          <Card className="bg-muted/50">
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">
                Respondida em{' '}
                {format(
                  new Date(proposal.respondedAt),
                  "d 'de' MMMM 'de' yyyy 'às' HH:mm",
                  { locale: ptBR }
                )}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

export default ProposalDetailPage;
