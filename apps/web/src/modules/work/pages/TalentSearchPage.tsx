// path: apps/web/src/modules/work/pages/TalentSearchPage.tsx
// Página de busca de talentos (Marketplace)

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Users, RefreshCw } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { TalentCard } from '../components/TalentCard';
import { TalentFilters, type FilterValues } from '../components/TalentFilters';
import { TalentSearchBar } from '../components/TalentSearchBar';
import {
  searchTalents,
  getWorkAreas,
  type TalentSearchParams,
  type TalentListItem,
} from '../api';

const defaultFilters: FilterValues = {
  skills: [],
  area: '',
  workPreference: [],
  minHourlyRate: '',
  maxHourlyRate: '',
  status: '',
};

export function TalentSearchPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);

  // Fetch areas for filters
  const { data: areasData } = useQuery({
    queryKey: ['work-areas'],
    queryFn: getWorkAreas,
  });

  // Build search params
  const buildSearchParams = useCallback(
    (cursor?: string): TalentSearchParams => {
      const params: TalentSearchParams = {
        limit: 20,
      };

      if (searchQuery) params.q = searchQuery;
      if (filters.area) params.area = filters.area;
      if (filters.workPreference.length > 0) params.workPreference = filters.workPreference;
      if (filters.status) params.status = filters.status as 'AVAILABLE' | 'NOT_AVAILABLE';
      if (filters.minHourlyRate) params.minHourlyRate = Number(filters.minHourlyRate);
      if (filters.maxHourlyRate) params.maxHourlyRate = Number(filters.maxHourlyRate);
      if (filters.skills.length > 0) params.skills = filters.skills;
      if (cursor) params.cursor = cursor;

      return params;
    },
    [searchQuery, filters]
  );

  // Infinite query for talents
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['talents-search', searchQuery, filters],
    queryFn: ({ pageParam }) => searchTalents(buildSearchParams(pageParam as string | undefined)),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
  });

  // Flatten all pages into single array
  const talents = data?.pages.flatMap((page) => page.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  const handleTalentClick = (talent: TalentListItem) => {
    navigate(`/app/work/talents/${talent.user.handle}`);
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 pt-20 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
              Buscar Talentos
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Encontre profissionais para seu projeto
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <TalentSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Buscar por nome, habilidade ou área..."
          isLoading={isLoading}
        />

        {/* Filters */}
        <div className="flex items-center justify-between gap-4">
          <TalentFilters
            value={filters}
            onChange={setFilters}
            areas={areasData?.areas}
            onClear={handleClearFilters}
          />
          <p className="text-sm text-muted-foreground whitespace-nowrap">
            {total} {total === 1 ? 'profissional' : 'profissionais'}
          </p>
        </div>

        {/* Results */}
        <div className="space-y-3">
          {isLoading ? (
            // Loading skeleton
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/3" />
                        <div className="h-3 bg-muted rounded w-1/4" />
                        <div className="flex gap-2">
                          <div className="h-5 bg-muted rounded w-16" />
                          <div className="h-5 bg-muted rounded w-16" />
                          <div className="h-5 bg-muted rounded w-16" />
                        </div>
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
                <p className="text-destructive mb-4">Erro ao carregar talentos</p>
                <Button onClick={() => refetch()} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar novamente
                </Button>
              </CardContent>
            </Card>
          ) : talents.length === 0 ? (
            // Empty state
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">
                  Nenhum profissional encontrado
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || Object.values(filters).some((v) =>
                    Array.isArray(v) ? v.length > 0 : v !== ''
                  )
                    ? 'Tente ajustar os filtros ou termos de busca'
                    : 'Ainda não há profissionais cadastrados no marketplace'}
                </p>
                {(searchQuery ||
                  Object.values(filters).some((v) =>
                    Array.isArray(v) ? v.length > 0 : v !== ''
                  )) && (
                  <Button variant="outline" onClick={handleClearFilters}>
                    Limpar filtros
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            // Results list
            <>
              {talents.map((talent) => (
                <TalentCard
                  key={talent.id}
                  talent={talent}
                  onClick={() => handleTalentClick(talent)}
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
        </div>
      </main>
    </div>
  );
}

export default TalentSearchPage;
