// path: apps/web/src/modules/work/pages/MyEvaluationsPage.tsx
// Página com minhas avaliações (recebidas e enviadas)

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Star, Loader2, Send, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EvaluationCard } from '../components/EvaluationCard';
import { getReceivedEvaluations, getGivenEvaluations } from '../api';

export function MyEvaluationsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'received' | 'given'>('received');

  const {
    data: receivedData,
    isLoading: loadingReceived,
  } = useQuery({
    queryKey: ['evaluations-received'],
    queryFn: getReceivedEvaluations,
  });

  const {
    data: givenData,
    isLoading: loadingGiven,
  } = useQuery({
    queryKey: ['evaluations-given'],
    queryFn: getGivenEvaluations,
  });

  const receivedEvaluations = receivedData?.evaluations || [];
  const givenEvaluations = givenData?.evaluations || [];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 pt-20 space-y-6 max-w-3xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/app/work/agreements')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar aos acordos
        </Button>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="h-6 w-6" />
            Minhas Avaliações
          </h1>
          <p className="text-muted-foreground">
            Veja as avaliações que você recebeu e as que você enviou
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'received' | 'given')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="received" className="gap-2">
              <Inbox className="h-4 w-4" />
              Recebidas ({receivedEvaluations.length})
            </TabsTrigger>
            <TabsTrigger value="given" className="gap-2">
              <Send className="h-4 w-4" />
              Enviadas ({givenEvaluations.length})
            </TabsTrigger>
          </TabsList>

          {/* Avaliações Recebidas */}
          <TabsContent value="received" className="space-y-4 mt-4">
            {loadingReceived ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : receivedEvaluations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Nenhuma avaliação recebida</h3>
                  <p className="text-muted-foreground">
                    Você receberá avaliações quando seus acordos de trabalho forem encerrados e
                    ambas as partes avaliarem.
                  </p>
                </CardContent>
              </Card>
            ) : (
              receivedEvaluations.map((evaluation) => (
                <EvaluationCard
                  key={evaluation.id}
                  evaluation={evaluation}
                  showAuthor={true}
                  showTarget={false}
                  showAgreement={true}
                />
              ))
            )}
          </TabsContent>

          {/* Avaliações Enviadas */}
          <TabsContent value="given" className="space-y-4 mt-4">
            {loadingGiven ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : givenEvaluations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Nenhuma avaliação enviada</h3>
                  <p className="text-muted-foreground">
                    Você poderá avaliar pessoas quando seus acordos de trabalho forem encerrados.
                  </p>
                </CardContent>
              </Card>
            ) : (
              givenEvaluations.map((evaluation) => (
                <EvaluationCard
                  key={evaluation.id}
                  evaluation={evaluation}
                  showAuthor={false}
                  showTarget={true}
                  showAgreement={true}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default MyEvaluationsPage;
