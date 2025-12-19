// path: apps/web/src/modules/pay/pages/PendingAdjustmentsPage.tsx
// Página de ajustes pendentes de aprovação (PROMPT-03)

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, RefreshCw, CheckSquare } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { PendingAdjustments } from '../components';
import { getPendingAdjustments } from '../api';

export function PendingAdjustmentsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['pay-pending-adjustments'],
    queryFn: getPendingAdjustments,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 pt-20 max-w-3xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-40 bg-muted rounded-lg" />
            <div className="h-40 bg-muted rounded-lg" />
          </div>
        </main>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 pt-20 max-w-3xl">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">
                Erro ao carregar ajustes
              </h3>
              <p className="text-muted-foreground mb-4">
                Tente novamente mais tarde.
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const items = data?.items || [];
  const total = data?.total || 0;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 pt-20 space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/app/pay">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-amber-500" />
            <h1 className="text-xl font-bold">Ajustes Pendentes</h1>
            {total > 0 && (
              <span className="text-sm bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                {total}
              </span>
            )}
          </div>
        </div>

        {/* Lista de Ajustes Pendentes */}
        {items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">
                Nenhum ajuste pendente
              </h3>
              <p className="text-muted-foreground">
                Todos os ajustes foram processados.
              </p>
            </CardContent>
          </Card>
        ) : (
          <PendingAdjustments />
        )}
      </main>
    </div>
  );
}

export default PendingAdjustmentsPage;
