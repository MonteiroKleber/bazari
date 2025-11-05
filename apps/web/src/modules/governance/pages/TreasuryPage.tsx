import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TreasuryStats } from '../components/TreasuryStats';
import { governanceApi } from '../api';
import type { GovernanceProposal } from '../types';
import {
  Coins,
  User,
  RefreshCw,
  PlusCircle,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Users,
} from 'lucide-react';
import { shortenAddress as formatAddress, formatBalance } from '@/modules/wallet/utils/format';
import { TreasuryRequestsPage } from './TreasuryRequestsPage';

export function TreasuryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<GovernanceProposal[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'onchain');

  const loadTreasuryData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [proposalsRes, approvalsRes, statsRes] = await Promise.all([
        governanceApi.getTreasuryProposals(),
        governanceApi.getTreasuryApprovals(),
        governanceApi.getGovernanceStats(),
      ]);

      if (proposalsRes.success && proposalsRes.data) {
        const normalized = proposalsRes.data.map((item: any) => ({
          id: item.id,
          type: 'TREASURY' as const,
          proposer: item.proposer,
          beneficiary: item.beneficiary,
          value: item.value,
          deposit: item.bond,
          status: 'PROPOSED' as const,
          createdAt: new Date().toISOString(),
        }));
        setProposals(normalized);
      }

      if (approvalsRes.success && approvalsRes.data) {
        setApprovals(approvalsRes.data);
      }

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data.treasury);
      }
    } catch (err) {
      console.error('Error loading treasury data:', err);
      setError('Failed to load treasury data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTreasuryData();
  }, [loadTreasuryData]);

  // Update tab from URL param
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && (tabFromUrl === 'onchain' || tabFromUrl === 'requests')) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  if (loading && activeTab === 'onchain') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-muted-foreground">Loading treasury data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 mobile-safe-bottom">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Tesouro</h1>
            <p className="text-muted-foreground">Gerencie propostas de financiamento da rede</p>
          </div>
          <div className="flex gap-2">
            {activeTab === 'onchain' && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={loadTreasuryData}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                <Button onClick={() => navigate('/app/governance/proposals/new?type=treasury')}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Nova Proposta
                </Button>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="onchain" className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            Propostas On-Chain
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Solicitações Council
          </TabsTrigger>
        </TabsList>

        {/* Tab Content: On-Chain Proposals */}
        <TabsContent value="onchain" className="mt-6">
          {/* Stats */}
          {stats && (
            <div className="mb-8">
              <TreasuryStats
                balance={stats.balance}
                proposalCount={stats.proposalCount}
                approvedCount={approvals.length}
                spendPeriod={stats.spendPeriod}
                nextBurn={stats.nextBurn}
              />
            </div>
          )}

          {/* Error State */}
          {error && (
            <Card className="mb-6 border-destructive">
              <CardContent className="pt-6">
                <p className="text-destructive">{error}</p>
                <Button onClick={loadTreasuryData} variant="outline" className="mt-4">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Approved Proposals */}
      {approvals.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Propostas Aprovadas</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {approvals.map((approval, index) => (
              <Card key={index} className="border-green-200 bg-green-50/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Proposta #{approval.id || index}</CardTitle>
                    <Badge className="bg-green-500/10 text-green-700 border-green-300">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Aprovada
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Beneficiário:</span>
                    <span className="font-mono">{formatAddress(approval.beneficiary || 'Unknown')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Coins className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Valor:</span>
                    <span className="font-semibold">{formatBalance(approval.value || '0')} BZR</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pending Proposals */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Propostas Pendentes</h2>
        {proposals.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <Coins className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma proposta pendente</h3>
              <p className="text-muted-foreground mb-4">
                Não há propostas aguardando aprovação no momento
              </p>
              <Button onClick={() => navigate('/app/governance/proposals/new?type=treasury')}>
                Criar Nova Proposta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {proposals.map((proposal) => (
              <Card
                key={proposal.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() =>
                  navigate(`/app/governance/proposals/treasury/${proposal.id}`)
                }
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Proposta #{proposal.id}</CardTitle>
                    <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-300">
                      <Clock className="h-3 w-3 mr-1" />
                      Pendente
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Proposer */}
                  <div className="flex items-start gap-2 text-sm">
                    <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <span className="text-muted-foreground">Proposer:</span>
                      <p className="font-mono text-xs break-all">
                        {formatAddress(proposal.proposer)}
                      </p>
                    </div>
                  </div>

                  {/* Beneficiary */}
                  {proposal.beneficiary && (
                    <div className="flex items-start gap-2 text-sm">
                      <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <span className="text-muted-foreground">Beneficiário:</span>
                        <p className="font-mono text-xs break-all">
                          {formatAddress(proposal.beneficiary)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Value */}
                  {proposal.value && (
                    <div className="flex items-center gap-2 text-sm">
                      <Coins className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Valor:</span>
                      <span className="font-semibold">{formatBalance(proposal.value)} BZR</span>
                    </div>
                  )}

                  {/* Deposit */}
                  {proposal.deposit && (
                    <div className="flex items-center gap-2 text-sm">
                      <Coins className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Depósito:</span>
                      <span className="text-xs">{formatBalance(proposal.deposit)} BZR</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
        </TabsContent>

        {/* Tab Content: Council Requests */}
        <TabsContent value="requests" className="mt-6">
          <TreasuryRequestsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
