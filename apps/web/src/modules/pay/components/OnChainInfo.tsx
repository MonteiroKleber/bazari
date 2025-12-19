// path: apps/web/src/modules/pay/components/OnChainInfo.tsx
// Exibição de dados on-chain do contrato (PROMPT-04)

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link2, ExternalLink, CheckCircle, AlertCircle, Loader2, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';

interface OnChainData {
  id: string;
  payer: string;
  receiver: string;
  baseValue: string;
  period: string;
  paymentDay: number;
  status: string;
  executionCount: number;
  totalPaid: string;
  createdAtBlock: number;
  nextPaymentBlock: number;
}

interface VerifyResponse {
  verified: boolean;
  syncStatus?: 'synced' | 'mismatch' | 'onchain_only';
  onChainData?: OnChainData;
  offChainData?: any;
  verifiedAt: string;
  error?: string;
}

interface OnChainInfoProps {
  onChainId: string | null;
  explorerUrl?: string;
}

async function verifyContract(onChainId: string): Promise<VerifyResponse> {
  return apiHelpers.get(`/api/pay/verify/${onChainId}`);
}

function truncateAddress(address: string, chars = 8): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

function formatBalance(value: string): string {
  const num = BigInt(value);
  const bzr = Number(num) / 1e18;
  return bzr.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
}

export function OnChainInfo({ onChainId, explorerUrl = 'https://polkadot.js.org/apps' }: OnChainInfoProps) {
  const [copied, setCopied] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['pay-verify-onchain', onChainId],
    queryFn: () => verifyContract(onChainId!),
    enabled: !!onChainId,
    staleTime: 60_000, // Cache for 1 minute
  });

  const handleCopy = async () => {
    if (!onChainId) return;
    await navigator.clipboard.writeText(onChainId);
    setCopied(true);
    toast.success('ID copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!onChainId) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Contrato ainda não registrado on-chain</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Verificando dados on-chain...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Verificação on-chain indisponível</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="h-4 w-4 text-green-500" />
          <span className="font-medium">Contrato On-Chain</span>
          {data.verified && (
            <Badge variant="secondary" className="ml-auto text-xs bg-green-100 text-green-700">
              <CheckCircle className="h-3 w-3 mr-1" />
              Verificado
            </Badge>
          )}
        </div>

        <div className="space-y-3 text-sm">
          {/* On-Chain ID */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">ID:</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 font-mono text-xs hover:text-primary transition-colors"
            >
              <span>{truncateAddress(onChainId, 10)}</span>
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>

          {data.onChainData && (
            <>
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status On-Chain:</span>
                <Badge
                  variant={
                    data.onChainData.status === 'Active'
                      ? 'default'
                      : data.onChainData.status === 'Paused'
                      ? 'secondary'
                      : 'outline'
                  }
                >
                  {data.onChainData.status}
                </Badge>
              </div>

              {/* Sync Status */}
              {data.syncStatus && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sincronização:</span>
                  <Badge
                    variant={data.syncStatus === 'synced' ? 'default' : 'destructive'}
                    className={data.syncStatus === 'synced' ? 'bg-green-100 text-green-700' : ''}
                  >
                    {data.syncStatus === 'synced' ? 'Sincronizado' : 'Divergência'}
                  </Badge>
                </div>
              )}

              {/* Executions */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Execuções:</span>
                <span className="font-medium">{data.onChainData.executionCount}</span>
              </div>

              {/* Total Paid */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Pago:</span>
                <span className="font-medium">{formatBalance(data.onChainData.totalPaid)} BZR</span>
              </div>
            </>
          )}

          {/* Verified At */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Verificado em:</span>
            <span>{new Date(data.verifiedAt).toLocaleString('pt-BR')}</span>
          </div>
        </div>

        {/* Explorer Link */}
        <a
          href={`${explorerUrl}/?rpc=wss://bazari.libervia.xyz/ws#/chainstate/contracts/${onChainId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 text-sm text-primary hover:underline flex items-center gap-1"
        >
          Ver no Explorador
          <ExternalLink className="h-3 w-3" />
        </a>
      </CardContent>
    </Card>
  );
}
