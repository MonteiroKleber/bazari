// path: apps/web/src/modules/work/pages/EvaluationPage.tsx
// Página para avaliar um acordo encerrado

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Building2,
  User,
} from 'lucide-react';
import { EvaluationForm } from '../components/EvaluationForm';
import { EvaluationCard } from '../components/EvaluationCard';
import { getAgreement, getAgreementEvaluations } from '../api';

export function EvaluationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Buscar acordo
  const {
    data: agreementData,
    isLoading: loadingAgreement,
    isError: errorAgreement,
  } = useQuery({
    queryKey: ['agreement', id],
    queryFn: () => getAgreement(id!),
    enabled: !!id,
  });

  // Buscar avaliações
  const {
    data: evaluationsData,
    isLoading: loadingEvaluations,
    refetch: refetchEvaluations,
  } = useQuery({
    queryKey: ['agreement-evaluations', id],
    queryFn: () => getAgreementEvaluations(id!),
    enabled: !!id,
  });

  const isLoading = loadingAgreement || loadingEvaluations;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 pt-20">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    );
  }

  if (errorAgreement || !agreementData) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 pt-20 max-w-2xl">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Acordo não encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Este acordo não existe ou você não tem permissão para avaliá-lo.
              </p>
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const { agreement, role } = agreementData;
  const isWorker = role === 'worker';

  // Determinar quem é a outra parte
  const counterparty = isWorker
    ? { name: agreement.company?.name || 'Empresa', avatar: (agreement.company as any)?.logoUrl, type: 'company' }
    : { name: agreement.worker?.displayName || 'Profissional', avatar: agreement.worker?.avatarUrl, type: 'worker' };

  // Verificar se pode avaliar
  const canEvaluate = evaluationsData?.canEvaluate ?? false;
  const hasEvaluated = !!evaluationsData?.myEvaluation;
  const isPublic = evaluationsData?.isPublic ?? false;

  // Acordo não encerrado
  if (agreement.status !== 'CLOSED') {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 pt-20 max-w-2xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Avaliação não disponível</AlertTitle>
            <AlertDescription>
              Avaliações só estão disponíveis para acordos encerrados. Este acordo ainda está{' '}
              {agreement.status === 'ACTIVE' ? 'ativo' : 'pausado'}.
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 pt-20 space-y-6 max-w-2xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/app/work/agreements/${id}`)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao acordo
        </Button>

        {/* Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={counterparty.avatar || undefined} />
                <AvatarFallback>
                  {counterparty.type === 'company' ? (
                    <Building2 className="h-6 w-6" />
                  ) : (
                    <User className="h-6 w-6" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-bold">Avaliar {counterparty.name}</h1>
                <p className="text-muted-foreground">{agreement.title}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Já avaliou - mostrar avaliações */}
        {hasEvaluated ? (
          <div className="space-y-4">
            {isPublic ? (
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle>Avaliações publicadas!</AlertTitle>
                <AlertDescription>
                  Ambas as partes avaliaram. As avaliações agora são públicas.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-amber-500/50 bg-amber-500/10">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <AlertTitle>Aguardando outra avaliação</AlertTitle>
                <AlertDescription>
                  Sua avaliação foi enviada. Ela será publicada quando {counterparty.name} também
                  avaliar.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <h2 className="font-semibold">Sua avaliação</h2>
              {evaluationsData?.myEvaluation && (
                <EvaluationCard
                  evaluation={evaluationsData.myEvaluation}
                  showAuthor={false}
                  showAgreement={false}
                />
              )}
            </div>

            {isPublic && evaluationsData?.otherEvaluation && (
              <div className="space-y-4">
                <h2 className="font-semibold">Avaliação de {counterparty.name}</h2>
                <EvaluationCard
                  evaluation={evaluationsData.otherEvaluation}
                  showAuthor={true}
                  showAgreement={false}
                />
              </div>
            )}
          </div>
        ) : (
          /* Formulário de avaliação */
          <EvaluationForm
            agreementId={id!}
            targetName={counterparty.name}
            onSuccess={() => {
              refetchEvaluations();
            }}
          />
        )}
      </main>
    </div>
  );
}

export default EvaluationPage;
