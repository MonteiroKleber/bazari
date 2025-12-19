// path: apps/web/src/modules/work/pages/ProposalListPage.tsx
// Página de listagem de propostas do usuário

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '@/modules/auth/context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  FileText,
  RefreshCw,
  Send,
  Inbox,
  Plus,
} from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { ProposalCard } from '../components/ProposalCard';
import {
  getProposals,
  type GetProposalsParams,
  type WorkProposal,
  type ProposalStatus,
} from '../api';

type TabValue = 'received' | 'sent';
type FilterStatus = 'all' | 'active' | 'closed';

const statusFilters: Record<FilterStatus, ProposalStatus[] | undefined> = {
  all: undefined,
  active: ['PENDING', 'NEGOTIATING'],
  closed: ['ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
};

export function ProposalListPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [tab, setTab] = useState<TabValue>('received');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  // Build query params
  const buildParams = useCallback(
    (cursor?: string): GetProposalsParams => {
      const params: GetProposalsParams = {
        direction: tab,
        limit: 20,
      };

      const statuses = statusFilters[statusFilter];
      if (statuses) {
        params.status = statuses;
      }

      if (cursor) {
        params.cursor = cursor;
      }

      return params;
    },
    [tab, statusFilter]
  );

  // Infinite query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['my-proposals', tab, statusFilter],
    queryFn: ({ pageParam }) =>
      getProposals(buildParams(pageParam as string | undefined)),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
  });

  // Flatten pages
  const proposals = data?.pages.flatMap((page) => page.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  // Counts for tabs
  const receivedCount = data?.pages[0]?.total ?? 0;
  const sentCount = 0; // TODO: could fetch sent count separately if needed

  const handleProposalClick = (proposal: WorkProposal) => {
    navigate(`/app/work/proposals/${proposal.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 pt-20 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
              Minhas Propostas
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gerencie propostas recebidas e enviadas
            </p>
          </div>
        </div>

        {/* Tabs: Received vs Sent */}
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as TabValue)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
            <TabsTrigger value="received" className="gap-2">
              <Inbox className="h-4 w-4" />
              Recebidas
              {receivedCount > 0 && tab === 'received' && (
                <Badge variant="secondary" className="ml-1">
                  {total}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-2">
              <Send className="h-4 w-4" />
              Enviadas
            </TabsTrigger>
          </TabsList>

          {/* Status Filter */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-sm text-muted-foreground">Filtrar:</span>
            <div className="flex gap-1">
              {(['all', 'active', 'closed'] as FilterStatus[]).map((filter) => (
                <Button
                  key={filter}
                  variant={statusFilter === filter ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter(filter)}
                >
                  {filter === 'all' && 'Todas'}
                  {filter === 'active' && 'Em Aberto'}
                  {filter === 'closed' && 'Finalizadas'}
                </Button>
              ))}
            </div>
          </div>

          {/* Content */}
          <TabsContent value={tab} className="mt-4 space-y-3">
            {isLoading ? (
              // Loading skeleton
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-full bg-muted" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-2/3" />
                          <div className="h-3 bg-muted rounded w-1/3" />
                          <div className="h-3 bg-muted rounded w-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : isError ? (
              // Error state
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-destructive mb-4">
                    Erro ao carregar propostas
                  </p>
                  <Button onClick={() => refetch()} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Tentar novamente
                  </Button>
                </CardContent>
              </Card>
            ) : proposals.length === 0 ? (
              // Empty state
              <Card>
                <CardContent className="py-12 text-center">
                  {tab === 'received' ? (
                    <>
                      <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-semibold text-lg mb-2">
                        Nenhuma proposta recebida
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {statusFilter === 'active'
                          ? 'Você não tem propostas em aberto'
                          : statusFilter === 'closed'
                          ? 'Você não tem propostas finalizadas'
                          : 'Quando empresas enviarem propostas, elas aparecerão aqui'}
                      </p>
                    </>
                  ) : (
                    <>
                      <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-semibold text-lg mb-2">
                        Nenhuma proposta enviada
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {statusFilter === 'active'
                          ? 'Você não tem propostas em aberto'
                          : statusFilter === 'closed'
                          ? 'Você não tem propostas finalizadas'
                          : 'Propostas enviadas para profissionais aparecerão aqui'}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              // Results list
              <>
                {proposals.map((proposal) => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    viewAs={tab === 'received' ? 'receiver' : 'sender'}
                    onClick={() => handleProposalClick(proposal)}
                  />
                ))}

                {/* Load more button */}
                {hasNextPage && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                    >
                      {isFetchingNextPage ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Carregando...
                        </>
                      ) : (
                        'Carregar mais'
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default ProposalListPage;
