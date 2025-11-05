import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TreasuryRequestCard } from '../components/TreasuryRequestCard';
import { useTreasuryRequests, useCouncilStatus } from '../hooks';
import { PlusCircle, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'PENDING_REVIEW', label: 'Pendente Revisão' },
  { value: 'IN_VOTING', label: 'Em Votação' },
  { value: 'APPROVED', label: 'Aprovadas' },
  { value: 'REJECTED', label: 'Rejeitadas' },
  { value: 'PAID_OUT', label: 'Pagas' },
];

export function TreasuryRequestsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { isMember: isCouncilMember } = useCouncilStatus();

  const {
    requests,
    total,
    isLoading,
    error,
    refetch,
  } = useTreasuryRequests({
    status: statusFilter === 'all' ? undefined : statusFilter,
    autoFetch: true,
  });

  const handleCardClick = (requestId: number) => {
    navigate(`/app/governance/treasury/requests/${requestId}`);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Solicitações de Tesouro</h1>
          <p className="text-muted-foreground">
            Solicitações de fundos pendentes e aprovadas
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            onClick={() => navigate('/app/governance/treasury/requests/new')}
            size="sm"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Nova Solicitação
          </Button>
        </div>
      </div>

      {/* Council Member Badge */}
      {isCouncilMember && (
        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-500 text-white">Council Member</Badge>
              <span className="text-sm text-muted-foreground">
                Você pode criar motions e votar em solicitações
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg">Filtros</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-sm text-muted-foreground">Total de Solicitações</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {requests.filter((r) => r.status === 'IN_VOTING').length}
              </p>
              <p className="text-sm text-muted-foreground">Em Votação</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {requests.filter((r) => r.status === 'APPROVED').length}
              </p>
              <p className="text-sm text-muted-foreground">Aprovadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <Card className="bg-red-500/10 border-red-500/20">
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-2 text-center">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Tentar Novamente
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && requests.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Nenhuma solicitação encontrada
                </p>
                <Button
                  onClick={() => navigate('/app/governance/treasury/requests/new')}
                  size="sm"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Criar Primeira Solicitação
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && requests.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {requests.map((request) => (
              <TreasuryRequestCard
                key={request.id}
                request={request}
                onClick={() => handleCardClick(request.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
