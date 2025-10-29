import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ProposalCard } from '../components/ProposalCard';
import { governanceApi } from '../api';
import type { GovernanceProposal, ProposalType, ProposalStatus } from '../types';
import { Filter, Search, PlusCircle, RefreshCw } from 'lucide-react';

type FilterType = 'ALL' | ProposalType;
type FilterStatus = 'ALL' | ProposalStatus;

export function ProposalsListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<GovernanceProposal[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadProposals = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Load proposals from all sources
      const [democracyRes, treasuryRes, councilRes, techRes] = await Promise.all([
        governanceApi.getDemocracyReferendums(),
        governanceApi.getTreasuryProposals(),
        governanceApi.getCouncilProposals(),
        governanceApi.getTechCommitteeProposals(),
      ]);

      // Combine and normalize all proposals
      const allProposals: GovernanceProposal[] = [];

      // Democracy referendums
      if (democracyRes.success && democracyRes.data) {
        democracyRes.data.forEach((item: any) => {
          allProposals.push({
            id: item.id,
            type: 'DEMOCRACY',
            proposer: item.info?.Ongoing?.proposer || 'Unknown',
            status: item.info?.Ongoing ? 'STARTED' : 'PROPOSED',
            createdAt: new Date().toISOString(),
          });
        });
      }

      // Treasury proposals
      if (treasuryRes.success && treasuryRes.data) {
        treasuryRes.data.forEach((item: any) => {
          allProposals.push({
            id: item.id,
            type: 'TREASURY',
            proposer: item.proposer,
            beneficiary: item.beneficiary,
            value: item.value,
            deposit: item.bond,
            status: 'PROPOSED',
            createdAt: new Date().toISOString(),
          });
        });
      }

      // Council proposals
      if (councilRes.success && councilRes.data) {
        councilRes.data.forEach((item: any, index: number) => {
          allProposals.push({
            id: index,
            type: 'COUNCIL',
            proposer: 'Council',
            status: 'PROPOSED',
            createdAt: new Date().toISOString(),
          });
        });
      }

      // Technical committee proposals
      if (techRes.success && techRes.data) {
        techRes.data.forEach((item: any, index: number) => {
          allProposals.push({
            id: index,
            type: 'TECHNICAL',
            proposer: 'Tech Committee',
            status: 'PROPOSED',
            createdAt: new Date().toISOString(),
          });
        });
      }

      // Sort by ID descending (newest first)
      allProposals.sort((a, b) => b.id - a.id);

      setProposals(allProposals);
    } catch (err) {
      console.error('Error loading proposals:', err);
      setError('Failed to load proposals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  // Apply filters
  const filteredProposals = proposals.filter((proposal) => {
    // Type filter
    if (filterType !== 'ALL' && proposal.type !== filterType) {
      return false;
    }

    // Status filter
    if (filterStatus !== 'ALL' && proposal.status !== filterStatus) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesId = proposal.id.toString().includes(query);
      const matchesTitle = proposal.title?.toLowerCase().includes(query);
      const matchesDescription = proposal.description?.toLowerCase().includes(query);
      const matchesProposer = proposal.proposer.toLowerCase().includes(query);

      if (!matchesId && !matchesTitle && !matchesDescription && !matchesProposer) {
        return false;
      }
    }

    return true;
  });

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-muted-foreground">Loading proposals...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 mobile-safe-bottom">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Propostas</h1>
          <p className="text-muted-foreground">
            {filteredProposals.length} proposta(s) encontrada(s)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={loadProposals}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => navigate('/app/governance/proposals/new')}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Nova Proposta
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID, título, proposer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Type Filter */}
            <Select
              value={filterType}
              onValueChange={(value) => setFilterType(value as FilterType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os tipos</SelectItem>
                <SelectItem value="DEMOCRACY">Democracia</SelectItem>
                <SelectItem value="TREASURY">Tesouro</SelectItem>
                <SelectItem value="COUNCIL">Conselho</SelectItem>
                <SelectItem value="TECHNICAL">Técnico</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
              value={filterStatus}
              onValueChange={(value) => setFilterStatus(value as FilterStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os status</SelectItem>
                <SelectItem value="PROPOSED">Proposta</SelectItem>
                <SelectItem value="STARTED">Votação Ativa</SelectItem>
                <SelectItem value="PASSED">Aprovada</SelectItem>
                <SelectItem value="NOT_PASSED">Rejeitada</SelectItem>
                <SelectItem value="EXECUTED">Executada</SelectItem>
                <SelectItem value="CANCELLED">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
            <Button onClick={loadProposals} variant="outline" className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Proposals Grid */}
      {filteredProposals.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma proposta encontrada</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterType !== 'ALL' || filterStatus !== 'ALL'
                ? 'Tente ajustar os filtros'
                : 'Ainda não há propostas cadastradas'}
            </p>
            {searchQuery || filterType !== 'ALL' || filterStatus !== 'ALL' ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('ALL');
                  setFilterStatus('ALL');
                }}
              >
                Limpar Filtros
              </Button>
            ) : (
              <Button onClick={() => navigate('/app/governance/proposals/new')}>
                Criar Primeira Proposta
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProposals.map((proposal) => (
            <ProposalCard
              key={`${proposal.type}-${proposal.id}`}
              proposal={proposal}
              onClick={() =>
                navigate(`/app/governance/proposals/${proposal.type.toLowerCase()}/${proposal.id}`)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
