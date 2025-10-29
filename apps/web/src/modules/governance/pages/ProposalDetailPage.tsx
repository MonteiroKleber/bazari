import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { governanceApi } from '../api';
import type { GovernanceProposal, ProposalType } from '../types';
import {
  ArrowLeft,
  Vote,
  Coins,
  User,
  Calendar,
  Hash,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { VoteModal } from '../components/VoteModal';
import { VotingChart } from '../components/dashboard';
import { useVotingData } from '../hooks';
import { shortenAddress as formatAddress, formatBalance } from '@/modules/wallet/utils/format';

export function ProposalDetailPage() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState<GovernanceProposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voteModalOpen, setVoteModalOpen] = useState(false);

  const proposalType = type?.toUpperCase() as ProposalType;
  const proposalId = parseInt(id || '0');

  // FASE 8: Fetch voting data for chart
  const { data: votingData, loading: votingDataLoading } = useVotingData({
    proposalIds: [proposalId],
    autoFetch: true,
  });

  const loadProposal = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let response;

      switch (proposalType) {
        case 'DEMOCRACY':
          response = await governanceApi.getDemocracyReferendums();
          break;
        case 'TREASURY':
          response = await governanceApi.getTreasuryProposals();
          break;
        case 'COUNCIL':
          response = await governanceApi.getCouncilProposals();
          break;
        case 'TECHNICAL':
          response = await governanceApi.getTechCommitteeProposals();
          break;
        default:
          setError('Invalid proposal type');
          return;
      }

      if (response.success && response.data) {
        const found = response.data.find((p: any) => p.id === proposalId);
        if (found) {
          setProposal({
            id: found.id,
            type: proposalType,
            proposer: found.proposer || found.info?.Ongoing?.proposer || 'Unknown',
            beneficiary: found.beneficiary,
            value: found.value,
            deposit: found.bond || found.deposit,
            status: found.info?.Ongoing ? 'STARTED' : 'PROPOSED',
            preimageHash: found.preimageHash,
            votingStartBlock: found.votingStartBlock,
            votingEndBlock: found.votingEndBlock,
            ayeVotes: found.ayeVotes,
            nayVotes: found.nayVotes,
            turnout: found.turnout,
            createdAt: new Date().toISOString(),
          });
        } else {
          setError('Proposal not found');
        }
      } else {
        setError('Failed to load proposal');
      }
    } catch (err) {
      console.error('Error loading proposal:', err);
      setError('Failed to load proposal');
    } finally {
      setLoading(false);
    }
  }, [proposalType, proposalId]);

  useEffect(() => {
    loadProposal();
  }, [loadProposal]);

  const handleVoteSuccess = () => {
    setVoteModalOpen(false);
    loadProposal();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-muted-foreground">Loading proposal...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error || 'Proposal not found'}</p>
            <Button onClick={() => navigate('/app/governance/proposals')} variant="outline">
              Back to Proposals
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const typeConfig = {
    DEMOCRACY: { label: 'Democracia', color: 'bg-blue-500/10 text-blue-700 border-blue-300' },
    TREASURY: { label: 'Tesouro', color: 'bg-yellow-500/10 text-yellow-700 border-yellow-300' },
    COUNCIL: { label: 'Conselho', color: 'bg-purple-500/10 text-purple-700 border-purple-300' },
    TECHNICAL: { label: 'Técnico', color: 'bg-green-500/10 text-green-700 border-green-300' },
  };

  const statusConfig = {
    PROPOSED: { label: 'Proposta', icon: <Clock className="h-3 w-3" />, color: 'bg-gray-500/10' },
    STARTED: { label: 'Votação Ativa', icon: <Vote className="h-3 w-3" />, color: 'bg-blue-500/10' },
    PASSED: { label: 'Aprovada', icon: <CheckCircle className="h-3 w-3" />, color: 'bg-green-500/10' },
    NOT_PASSED: { label: 'Rejeitada', icon: <XCircle className="h-3 w-3" />, color: 'bg-red-500/10' },
    EXECUTED: { label: 'Executada', icon: <CheckCircle className="h-3 w-3" />, color: 'bg-green-600/10' },
    CANCELLED: { label: 'Cancelada', icon: <XCircle className="h-3 w-3" />, color: 'bg-gray-600/10' },
    TABLED: { label: 'Tabled', icon: <Clock className="h-3 w-3" />, color: 'bg-yellow-500/10' },
  };

  const currentStatus = statusConfig[proposal.status];
  const currentType = typeConfig[proposal.type];

  // Calculate voting percentages
  const totalVotes =
    proposal.ayeVotes && proposal.nayVotes
      ? parseFloat(proposal.ayeVotes) + parseFloat(proposal.nayVotes)
      : 0;
  const ayePercent = totalVotes > 0 ? (parseFloat(proposal.ayeVotes || '0') / totalVotes) * 100 : 0;
  const nayPercent = totalVotes > 0 ? (parseFloat(proposal.nayVotes || '0') / totalVotes) * 100 : 0;

  const isVotingActive = proposal.status === 'STARTED';

  return (
    <div className="container mx-auto px-4 py-8 mobile-safe-bottom">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/governance/proposals')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={currentType.color}>
              {currentType.label}
            </Badge>
            <Badge className={currentStatus.color}>
              {currentStatus.icon}
              <span className="ml-1">{currentStatus.label}</span>
            </Badge>
          </div>
          <h1 className="text-3xl font-bold">
            {proposal.title || `Proposta #${proposal.id}`}
          </h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Descrição</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {proposal.description || 'Nenhuma descrição disponível.'}
              </p>
            </CardContent>
          </Card>

          {/* Voting Results */}
          {(proposal.ayeVotes || proposal.nayVotes) && (
            <Card>
              <CardHeader>
                <CardTitle>Resultados da Votação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Aye Votes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-600">Aye (Sim)</span>
                    <span className="text-sm font-medium">{ayePercent.toFixed(1)}%</span>
                  </div>
                  <Progress value={ayePercent} className="h-3" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatBalance(proposal.ayeVotes || '0')} BZR
                  </p>
                </div>

                {/* Nay Votes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-red-600">Nay (Não)</span>
                    <span className="text-sm font-medium">{nayPercent.toFixed(1)}%</span>
                  </div>
                  <Progress value={nayPercent} className="h-3 bg-red-100" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatBalance(proposal.nayVotes || '0')} BZR
                  </p>
                </div>

                {/* Turnout */}
                {proposal.turnout && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Turnout</span>
                      <span className="text-sm">{proposal.turnout}%</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* FASE 8: Voting Chart */}
          {votingData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Visualização de Votos</CardTitle>
              </CardHeader>
              <CardContent>
                {votingDataLoading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                      <p className="text-sm text-muted-foreground">Carregando dados...</p>
                    </div>
                  </div>
                ) : (
                  <VotingChart
                    data={votingData}
                    type="pie"
                    height={300}
                    showLegend={true}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Vote Actions */}
          {isVotingActive && (
            <Card>
              <CardHeader>
                <CardTitle>Votar</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Esta proposta está em votação ativa. Você pode votar a favor (Aye) ou contra (Nay).
                </p>
                <Button onClick={() => setVoteModalOpen(true)} className="w-full">
                  <Vote className="mr-2 h-4 w-4" />
                  Votar Agora
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Proposal Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ID */}
              <div className="flex items-start gap-3">
                <Hash className="h-4 w-4 mt-1 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">ID</p>
                  <p className="text-sm text-muted-foreground">#{proposal.id}</p>
                </div>
              </div>

              {/* Proposer */}
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 mt-1 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Proposer</p>
                  <p className="text-sm text-muted-foreground font-mono break-all">
                    {formatAddress(proposal.proposer)}
                  </p>
                </div>
              </div>

              {/* Beneficiary */}
              {proposal.beneficiary && (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Beneficiário</p>
                    <p className="text-sm text-muted-foreground font-mono break-all">
                      {formatAddress(proposal.beneficiary)}
                    </p>
                  </div>
                </div>
              )}

              {/* Value */}
              {proposal.value && (
                <div className="flex items-start gap-3">
                  <Coins className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Valor</p>
                    <p className="text-sm text-muted-foreground">
                      {formatBalance(proposal.value)} BZR
                    </p>
                  </div>
                </div>
              )}

              {/* Deposit */}
              {proposal.deposit && (
                <div className="flex items-start gap-3">
                  <Coins className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Depósito</p>
                    <p className="text-sm text-muted-foreground">
                      {formatBalance(proposal.deposit)} BZR
                    </p>
                  </div>
                </div>
              )}

              {/* Created At */}
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Criado em</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(proposal.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              {/* Voting Period */}
              {proposal.votingStartBlock && proposal.votingEndBlock && (
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Período de Votação</p>
                    <p className="text-sm text-muted-foreground">
                      Blocos {proposal.votingStartBlock} - {proposal.votingEndBlock}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preimage Hash */}
          {proposal.preimageHash && (
            <Card>
              <CardHeader>
                <CardTitle>Preimage Hash</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground font-mono break-all">
                  {proposal.preimageHash}
                </p>
              </CardContent>
            </Card>
          )}

          {/* External Links */}
          <Card>
            <CardHeader>
              <CardTitle>Links Externos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <ExternalLink className="mr-2 h-4 w-4" />
                Ver no Explorer
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <ExternalLink className="mr-2 h-4 w-4" />
                Polkassembly
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Vote Modal */}
      {proposal && (
        <VoteModal
          open={voteModalOpen}
          onOpenChange={setVoteModalOpen}
          proposal={proposal}
          onSuccess={handleVoteSuccess}
        />
      )}
    </div>
  );
}
