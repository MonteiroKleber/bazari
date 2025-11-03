import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProposalCard } from '../components/ProposalCard';
import { SearchBar, AdvancedFilters, FilterChips } from '../components/filters';
import { useProposalFilters } from '../hooks';
import { governanceApi } from '../api';
import type { GovernanceProposal, ProposalType, ProposalStatus } from '../types';
import { Filter, PlusCircle, RefreshCw } from 'lucide-react';

export function ProposalsListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<GovernanceProposal[]>([]);
  const [error, setError] = useState<string | null>(null);

  // FASE 8 - PROMPT 7: Use advanced filters
  const {
    filters,
    setFilters,
    updateFilter,
    searchQuery,
    setSearchQuery,
    filteredProposals,
    resetFilters,
    activeFilterCount,
  } = useProposalFilters({ proposals });

  const loadProposals = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Load proposals from all sources
      const [democracyProposalsRes, democracyRes, treasuryRes, councilRes, techRes] = await Promise.all([
        governanceApi.getDemocracyProposals(), // Add democracy proposals
        governanceApi.getDemocracyReferendums(),
        governanceApi.getTreasuryProposals(),
        governanceApi.getCouncilProposals(),
        governanceApi.getTechCommitteeProposals(),
      ]);

      // Combine and normalize all proposals
      const allProposals: GovernanceProposal[] = [];

      // Democracy proposals (not yet referendums)
      if (democracyProposalsRes.success && democracyProposalsRes.data) {
        democracyProposalsRes.data.forEach((item: any) => {
          allProposals.push({
            ...item,
            type: 'DEMOCRACY',
          });
        });
      }

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

      {/* FASE 8 - PROMPT 7: Search Bar */}
      <div className="mb-6">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Buscar propostas por ID, título, descrição ou proposer..."
        />
      </div>

      {/* FASE 8 - PROMPT 7: Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="mb-4">
          <FilterChips
            filters={filters}
            searchQuery={searchQuery}
            onRemoveFilter={(key, value) => {
              if (key === 'types') {
                updateFilter('types', filters.types?.filter(t => t !== value) || []);
              } else if (key === 'statuses') {
                updateFilter('statuses', filters.statuses?.filter(s => s !== value) || []);
              } else if (key === 'dateRange') {
                updateFilter('dateRange', { from: null, to: null });
              } else if (key === 'valueRange') {
                updateFilter('valueRange', { min: null, max: null });
              } else if (key === 'proposer') {
                updateFilter('proposer', undefined);
              }
            }}
            onClearSearch={() => setSearchQuery('')}
            onClearAll={resetFilters}
          />
        </div>
      )}

      {/* FASE 8 - PROMPT 7: Layout with Advanced Filters */}
      <div className="grid md:grid-cols-[300px_1fr] gap-6 mb-6">
        {/* Advanced Filters Sidebar */}
        <div className="hidden md:block">
          <AdvancedFilters
            filters={filters}
            onChange={setFilters}
            onReset={resetFilters}
          />
        </div>

        {/* Mobile Filters (collapsed by default) */}
        <div className="md:hidden mb-4">
          <AdvancedFilters
            filters={filters}
            onChange={setFilters}
            onReset={resetFilters}
            defaultCollapsed={true}
          />
        </div>
      </div>

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

      {/* Proposals Grid - with filters sidebar */}
      <div className="grid md:grid-cols-[300px_1fr] gap-6">
        {/* Empty space for alignment with filters sidebar */}
        <div className="hidden md:block" />

        {/* Proposals List */}
        <div>
          {filteredProposals.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma proposta encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  {activeFilterCount > 0
                    ? 'Tente ajustar os filtros'
                    : 'Ainda não há propostas cadastradas'}
                </p>
                {activeFilterCount > 0 ? (
                  <Button variant="outline" onClick={resetFilters}>
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
            <div className="grid gap-4 md:grid-cols-2">
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
      </div>
    </div>
  );
}
