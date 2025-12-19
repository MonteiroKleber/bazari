// path: apps/web/src/modules/pay/pages/ContractListPage.tsx
// Lista de contratos de pagamento (PROMPT-01)

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Plus,
  AlertCircle,
  RefreshCw,
  FileText,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { ContractCard } from '../components';
import { getContracts } from '../api';
import type { PayContractStatus } from '../api';

export function ContractListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRole = searchParams.get('role') as 'payer' | 'receiver' | null;
  const [role, setRole] = useState<'all' | 'payer' | 'receiver'>(
    initialRole || 'all'
  );
  const [statusFilter, setStatusFilter] = useState<PayContractStatus | 'all'>(
    'all'
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['pay-contracts', role, statusFilter],
    queryFn: () =>
      getContracts({
        role: role === 'all' ? undefined : role,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
  });

  const contracts = data?.contracts || [];

  const payerContracts = contracts.filter((c) => c.role === 'payer');
  const receiverContracts = contracts.filter((c) => c.role === 'receiver');

  const handleRoleChange = (newRole: string) => {
    setRole(newRole as 'all' | 'payer' | 'receiver');
    if (newRole === 'all') {
      searchParams.delete('role');
    } else {
      searchParams.set('role', newRole);
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 pt-20 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/app/pay">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Contratos</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie seus contratos de pagamento recorrente
              </p>
            </div>
          </div>
          <Button asChild>
            <Link to="/app/pay/contracts/new">
              <Plus className="h-4 w-4 mr-2" />
              Novo Contrato
            </Link>
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PayContractStatus | 'all')}>
            <SelectTrigger className="w-40">
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

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">
                Erro ao carregar contratos
              </h3>
              <p className="text-muted-foreground mb-4">
                Tente novamente mais tarde.
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !isError && contracts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">
                Nenhum contrato encontrado
              </h3>
              <p className="text-muted-foreground mb-4">
                {statusFilter !== 'all'
                  ? `Você não tem contratos com status "${
                      statusFilter === 'ACTIVE'
                        ? 'Ativo'
                        : statusFilter === 'PAUSED'
                        ? 'Pausado'
                        : 'Encerrado'
                    }".`
                  : 'Crie seu primeiro contrato de pagamento recorrente.'}
              </p>
              <Button asChild>
                <Link to="/app/pay/contracts/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Contrato
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Lista com Tabs */}
        {!isLoading && !isError && contracts.length > 0 && (
          <Tabs value={role} onValueChange={handleRoleChange}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">
                Todos ({contracts.length})
              </TabsTrigger>
              <TabsTrigger value="payer" className="flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                Pagando ({payerContracts.length})
              </TabsTrigger>
              <TabsTrigger value="receiver" className="flex items-center gap-1">
                <ArrowDownLeft className="h-3 w-3" />
                Recebendo ({receiverContracts.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-3 mt-4">
              {contracts.map((contract) => (
                <ContractCard key={contract.id} contract={contract} />
              ))}
            </TabsContent>

            <TabsContent value="payer" className="space-y-3 mt-4">
              {payerContracts.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Você não está pagando nenhum contrato ativo.
                  </CardContent>
                </Card>
              ) : (
                payerContracts.map((contract) => (
                  <ContractCard key={contract.id} contract={contract} />
                ))
              )}
            </TabsContent>

            <TabsContent value="receiver" className="space-y-3 mt-4">
              {receiverContracts.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Você não está recebendo de nenhum contrato ativo.
                  </CardContent>
                </Card>
              ) : (
                receiverContracts.map((contract) => (
                  <ContractCard key={contract.id} contract={contract} />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

export default ContractListPage;
