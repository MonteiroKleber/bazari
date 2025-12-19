// path: apps/web/src/modules/work/pages/AgreementListPage.tsx
// Página de listagem de acordos

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileCheck,
  RefreshCw,
  Briefcase,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AgreementCard } from '../components/AgreementCard';
import { getAgreements, type AgreementStatus } from '../api';

type ViewMode = 'all' | 'as_worker' | 'as_company';

export function AgreementListPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [statusFilter, setStatusFilter] = useState<AgreementStatus | 'all'>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-agreements', viewMode, statusFilter, page],
    queryFn: () =>
      getAgreements({
        role: viewMode === 'all' ? undefined : viewMode === 'as_worker' ? 'worker' : 'company',
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        limit: 10,
      }),
  });

  const agreements = data?.agreements || [];
  const pagination = data?.pagination;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 pt-20 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <FileCheck className="h-5 w-5 sm:h-6 sm:w-6" />
              Meus Acordos
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Gerencie seus contratos de trabalho
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/app/work">
              <Briefcase className="h-4 w-4 mr-2" />
              Bazari Work
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* View Mode Tabs */}
              <Tabs
                value={viewMode}
                onValueChange={(v) => {
                  setViewMode(v as ViewMode);
                  setPage(1);
                }}
              >
                <TabsList>
                  <TabsTrigger value="all">Todos</TabsTrigger>
                  <TabsTrigger value="as_worker">Como Profissional</TabsTrigger>
                  <TabsTrigger value="as_company">Como Empresa</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v as AgreementStatus | 'all');
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ACTIVE">Ativos</SelectItem>
                    <SelectItem value="PAUSED">Pausados</SelectItem>
                    <SelectItem value="CLOSED">Encerrados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="animate-pulse flex gap-4">
                    <div className="h-12 w-12 bg-muted rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-2/3" />
                      <div className="h-3 bg-muted rounded w-1/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : isError ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Erro ao carregar acordos</h3>
              <p className="text-muted-foreground mb-4">
                Não foi possível carregar seus acordos.
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : agreements.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Nenhum acordo encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {statusFilter !== 'all'
                  ? 'Nenhum acordo com este status.'
                  : viewMode === 'as_worker'
                    ? 'Você não tem acordos como profissional.'
                    : viewMode === 'as_company'
                      ? 'Você não tem acordos como empresa.'
                      : 'Você ainda não tem acordos de trabalho.'}
              </p>
              <Button variant="outline" asChild>
                <Link to="/app/work/talents">Buscar Profissionais</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {agreements.map((agreement) => (
              <AgreementCard
                key={agreement.id}
                agreement={agreement}
                viewAs={agreement.role as 'worker' | 'company'}
              />
            ))}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {pagination.page} de {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default AgreementListPage;
