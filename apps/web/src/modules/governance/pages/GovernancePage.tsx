import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { governanceApi } from '../api';
import type { GovernanceStats } from '../types';
import { GovernanceStatsWidget, QuickActions, EventTimeline } from '../components/dashboard';
import { useGovernanceEvents } from '../hooks';
import {
  Vote,
  Coins,
  Users,
  FileText,
  TrendingUp
} from 'lucide-react';

export function GovernancePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GovernanceStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // FASE 8: Fetch recent governance events
  const { events, loading: eventsLoading } = useGovernanceEvents({
    limit: 10,
    refreshInterval: 60000, // Refresh every minute
  });

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

      {/* FASE 8: Enhanced Stats Widgets */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <GovernanceStatsWidget
            title="Saldo do Tesouro"
            value={`${parseFloat(stats.treasury.balance).toFixed(2)} BZR`}
            change={{
              value: 12,
              period: 'esta semana',
              trend: 'up',
            }}
            icon={<Coins className="h-4 w-4" />}
            color="amber"
            onClick={() => navigate('/app/governance/treasury')}
            loading={loading}
          />

          <GovernanceStatsWidget
            title="Referendos Ativos"
            value={stats.democracy.activeReferendums}
            change={{
              value: 5,
              period: 'vs. mês passado',
              trend: 'up',
            }}
            icon={<Vote className="h-4 w-4" />}
            color="blue"
            onClick={() => navigate('/app/governance/proposals')}
            loading={loading}
          />

          <GovernanceStatsWidget
            title="Membros do Conselho"
            value={stats.council.memberCount}
            icon={<Users className="h-4 w-4" />}
            color="purple"
            onClick={() => navigate('/app/governance/council')}
            loading={loading}
          />

          <GovernanceStatsWidget
            title="Comitê Técnico"
            value={stats.techCommittee.memberCount}
            icon={<TrendingUp className="h-4 w-4" />}
            color="green"
            onClick={() => navigate('/app/governance/council')}
            loading={loading}
          />
        </div>
      )}

      {/* FASE 8: Quick Actions */}
      <div className="mb-8">
        <QuickActions />
      </div>

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

      {/* FASE 8: Recent Activity Timeline */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            {eventsLoading && events.length === 0 ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Carregando eventos...</p>
              </div>
            ) : (
              <EventTimeline
                events={events}
                maxEvents={10}
                showProposalLinks={true}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
