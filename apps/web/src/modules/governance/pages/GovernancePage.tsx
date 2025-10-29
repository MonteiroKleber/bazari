import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { governanceApi } from '../api';
import type { GovernanceStats } from '../types';
import {
  Vote,
  Coins,
  Users,
  FileText,
  TrendingUp,
  PlusCircle
} from 'lucide-react';

export function GovernancePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GovernanceStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await governanceApi.getGovernanceStats();

      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setError(response.error || 'Failed to load governance stats');
      }
    } catch (err) {
      console.error('Error loading governance stats:', err);
      setError('Failed to connect to API');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-muted-foreground">Loading governance data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadStats} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 mobile-safe-bottom">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Governança</h1>
        <p className="text-muted-foreground">
          Participe das decisões da rede Bazari através de propostas, votações e tesouro comunitário.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Button
          size="lg"
          onClick={() => navigate('/app/governance/proposals/new')}
          className="h-auto py-4"
        >
          <PlusCircle className="mr-2 h-5 w-5" />
          <div className="text-left">
            <div className="font-semibold">Criar Proposta</div>
            <div className="text-xs font-normal opacity-90">
              Submit nova proposta
            </div>
          </div>
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={() => navigate('/app/governance/proposals')}
          className="h-auto py-4"
        >
          <Vote className="mr-2 h-5 w-5" />
          <div className="text-left">
            <div className="font-semibold">Ver Propostas</div>
            <div className="text-xs font-normal opacity-90">
              Browse e vote
            </div>
          </div>
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={() => navigate('/app/governance/treasury')}
          className="h-auto py-4"
        >
          <Coins className="mr-2 h-5 w-5" />
          <div className="text-left">
            <div className="font-semibold">Tesouro</div>
            <div className="text-xs font-normal opacity-90">
              Ver fundos
            </div>
          </div>
        </Button>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* Treasury Stats */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Saldo do Tesouro
              </CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {parseFloat(stats.treasury.balance).toFixed(2)} BZR
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.treasury.proposalCount} propostas
              </p>
            </CardContent>
          </Card>

          {/* Referendums */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Referendos Ativos
              </CardTitle>
              <Vote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.democracy.activeReferendums}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.democracy.referendumCount} total
              </p>
            </CardContent>
          </Card>

          {/* Council */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Conselho
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.council.memberCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                membros ativos
              </p>
            </CardContent>
          </Card>

          {/* Tech Committee */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Comitê Técnico
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.techCommittee.memberCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                membros ativos
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => navigate('/app/governance/proposals')}
        >
          <CardHeader>
            <FileText className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Propostas & Referendos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Visualize e vote em propostas de democracia, tesouro e conselho.
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => navigate('/app/governance/council')}
        >
          <CardHeader>
            <Users className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Conselho & Comitê</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Veja membros do conselho e propostas do comitê técnico.
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => navigate('/app/governance/multisig')}
        >
          <CardHeader>
            <Users className="h-8 w-8 mb-2 text-primary" />
            <CardTitle>Multisig</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Gerencie contas multi-assinatura e aprovações coletivas.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
