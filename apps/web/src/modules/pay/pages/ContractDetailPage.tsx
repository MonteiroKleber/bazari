// path: apps/web/src/modules/pay/pages/ContractDetailPage.tsx
// Página de detalhes do contrato (PROMPT-01)

import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Calendar,
  Wallet,
  Clock,
  Copy,
  Check,
} from 'lucide-react';
import { useState } from 'react';
import { ContractStatus, ContractActions, ExecutionTimeline, AdjustmentList, OnChainInfo } from '../components';
import { getContract, getContractHistory, getContractExecutions } from '../api';
import type { PayPeriod } from '../api';
import { useAuth } from '@/modules/auth/context';
import { toast } from 'sonner';

const periodLabels: Record<PayPeriod, string> = {
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quinzenal',
  MONTHLY: 'Mensal',
};

function formatCurrency(value: string, currency: string): string {
  const numValue = parseFloat(value);
  if (currency === 'BRL') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue);
  }
  return `${numValue.toLocaleString('pt-BR')} ${currency}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR');
}

function CopyableAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success('Endereço copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 font-mono text-sm hover:text-primary transition-colors"
    >
      <span className="truncate max-w-[200px]">{address}</span>
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
}

export function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const {
    data: contractData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['pay-contract', id],
    queryFn: () => getContract(id!),
    enabled: !!id,
  });

  const { data: historyData } = useQuery({
    queryKey: ['pay-contract-history', id],
    queryFn: () => getContractHistory(id!),
    enabled: !!id,
  });

  const { data: executionsData } = useQuery({
    queryKey: ['pay-contract-executions', id],
    queryFn: () => getContractExecutions(id!),
    enabled: !!id,
  });

  const contract = contractData?.contract;
  const history = historyData?.history || [];
  const executions = executionsData?.executions || [];

  const isPayer = contract?.payer.id === user?.id;
  const canManage = isPayer; // Apenas pagador pode gerenciar

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 pt-20 max-w-3xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-40 bg-muted rounded-lg" />
            <div className="h-32 bg-muted rounded-lg" />
          </div>
        </main>
      </div>
    );
  }

  if (isError || !contract) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-6 pt-20 max-w-3xl">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">
                Contrato não encontrado
              </h3>
              <p className="text-muted-foreground mb-4">
                O contrato pode ter sido removido ou você não tem permissão para
                visualizá-lo.
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar novamente
                </Button>
                <Button asChild>
                  <Link to="/app/pay/contracts">Ver todos os contratos</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 pt-20 space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/app/pay/contracts">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">Contrato</h1>
                <ContractStatus status={contract.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                Criado em {formatDate(contract.createdAt)}
              </p>
            </div>
          </div>
          <ContractActions
            contractId={contract.id}
            status={contract.status}
            canManage={canManage}
          />
        </div>

        {/* Partes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Partes do Contrato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {/* Pagador */}
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={contract.payer.avatarUrl || undefined} />
                  <AvatarFallback>
                    {contract.payer.displayName?.charAt(0) ||
                      contract.payer.handle?.charAt(0) ||
                      'P'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-xs text-muted-foreground uppercase">
                    Pagador
                  </div>
                  <div className="font-medium">
                    {contract.payerCompany?.businessName ||
                      contract.payer.displayName ||
                      'Usuário'}
                  </div>
                  {contract.payer.handle && (
                    <div className="text-sm text-muted-foreground">
                      @{contract.payer.handle}
                    </div>
                  )}
                </div>
              </div>

              <ArrowRight className="h-6 w-6 text-muted-foreground" />

              {/* Recebedor */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-muted-foreground uppercase">
                    Recebedor
                  </div>
                  <div className="font-medium">
                    {contract.receiver.displayName || 'Usuário'}
                  </div>
                  {contract.receiver.handle && (
                    <div className="text-sm text-muted-foreground">
                      @{contract.receiver.handle}
                    </div>
                  )}
                </div>
                <Avatar className="h-14 w-14">
                  <AvatarImage src={contract.receiver.avatarUrl || undefined} />
                  <AvatarFallback>
                    {contract.receiver.displayName?.charAt(0) ||
                      contract.receiver.handle?.charAt(0) ||
                      'R'}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detalhes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Detalhes do Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Valor</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(contract.baseValue, contract.currency)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Periodicidade</div>
                <div className="text-lg font-medium">
                  {periodLabels[contract.period]}
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">
                    Dia do Pagamento
                  </div>
                  <div className="font-medium">Dia {contract.paymentDay}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">
                    Próximo Pagamento
                  </div>
                  <div className="font-medium">
                    {formatDate(contract.nextPaymentDate)}
                  </div>
                </div>
              </div>
            </div>

            {contract.description && (
              <>
                <Separator />
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    Descrição
                  </div>
                  <div>{contract.description}</div>
                </div>
              </>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Início</div>
                <div>{formatDate(contract.startDate)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Término</div>
                <div>
                  {contract.endDate ? formatDate(contract.endDate) : 'Indefinido'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wallets */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Wallets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground mb-1">
                Wallet do Pagador
              </div>
              <CopyableAddress address={contract.payerWallet} />
            </div>
            <Separator />
            <div>
              <div className="text-sm text-muted-foreground mb-1">
                Wallet do Recebedor
              </div>
              <CopyableAddress address={contract.receiverWallet} />
            </div>
          </CardContent>
        </Card>

        {/* Informações On-Chain - PROMPT-04 */}
        <OnChainInfo onChainId={contract.onChainId || null} />

        {/* Timeline de Execuções */}
        <ExecutionTimeline executions={executions} currency={contract.currency} />

        {/* Ajustes - PROMPT-03 */}
        {contract.status === 'ACTIVE' && (
          <AdjustmentList contractId={contract.id} canManage={canManage} />
        )}

        {/* Histórico de Alterações */}
        {history.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Histórico de Alterações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between py-2 border-b last:border-b-0"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <ContractStatus status={item.fromStatus} />
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <ContractStatus status={item.toStatus} />
                      </div>
                      {item.reason && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {item.reason}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-muted-foreground">
                        {item.changedBy.displayName || item.changedBy.handle}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(item.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

export default ContractDetailPage;
