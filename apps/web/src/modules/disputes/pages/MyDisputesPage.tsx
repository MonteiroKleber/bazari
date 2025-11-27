import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useMyDisputes,
  useJuryDisputes,
  formatDisputeStatus,
  formatRuling,
} from '@/hooks/blockchain/useDispute';
import { DisputeCard } from '../components/DisputeCard';
import {
  Scale,
  Users,
  AlertCircle,
  Clock,
  CheckCircle,
} from 'lucide-react';

export function MyDisputesPage() {
  const navigate = useNavigate();
  const { data: myDisputes, isLoading: loadingMy, error: errorMy } = useMyDisputes();
  const { data: juryDisputes, isLoading: loadingJury, error: errorJury } = useJuryDisputes();

  const pendingJuryActions = juryDisputes?.pendingActions || 0;

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="w-6 h-6" />
            Minhas Disputas
          </h1>
          <p className="text-muted-foreground">
            Gerencie disputas onde voce esta envolvido
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{myDisputes?.count || 0}</p>
                <p className="text-xs text-muted-foreground">Como Parte</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{juryDisputes?.count || 0}</p>
                <p className="text-xs text-muted-foreground">Como Jurado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{pendingJuryActions}</p>
                <p className="text-xs text-muted-foreground">Acoes Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {(myDisputes?.disputes || []).filter(d => d.status === 'Resolved').length}
                </p>
                <p className="text-xs text-muted-foreground">Resolvidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="involved" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="involved" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Como Parte ({myDisputes?.count || 0})
          </TabsTrigger>
          <TabsTrigger value="jury" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Como Jurado ({juryDisputes?.count || 0})
            {pendingJuryActions > 0 && (
              <Badge variant="destructive" className="ml-1">
                {pendingJuryActions}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* As Party Tab */}
        <TabsContent value="involved" className="mt-6">
          {loadingMy ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : errorMy ? (
            <Card>
              <CardContent className="py-8 text-center">
                <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
                <p className="text-muted-foreground">
                  Erro ao carregar disputas: {errorMy.message}
                </p>
              </CardContent>
            </Card>
          ) : !myDisputes?.disputes?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Scale className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma disputa</h3>
                <p className="text-muted-foreground">
                  Voce nao esta envolvido em nenhuma disputa no momento.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {myDisputes.disputes.map((dispute) => (
                <DisputeCard
                  key={dispute.disputeId}
                  dispute={dispute}
                  showRole
                  onClick={() => navigate(`/app/disputes/${dispute.disputeId}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* As Juror Tab */}
        <TabsContent value="jury" className="mt-6">
          {loadingJury ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : errorJury ? (
            <Card>
              <CardContent className="py-8 text-center">
                <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
                <p className="text-muted-foreground">
                  Erro ao carregar disputas: {errorJury.message}
                </p>
              </CardContent>
            </Card>
          ) : !juryDisputes?.disputes?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma disputa como jurado</h3>
                <p className="text-muted-foreground">
                  Voce nao foi selecionado como jurado em nenhuma disputa.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Jurados sao selecionados aleatoriamente entre usuarios com reputacao acima de 500.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {juryDisputes.disputes.map((dispute) => (
                <DisputeCard
                  key={dispute.disputeId}
                  dispute={dispute}
                  showJuryActions
                  onClick={() => navigate(`/app/disputes/${dispute.disputeId}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
