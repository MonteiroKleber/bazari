// path: apps/web/src/modules/work/components/OnChainBadge.tsx
// Badge de registro on-chain do acordo

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Link2, Copy, ExternalLink, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { getAgreementOnChain } from '../api';

interface OnChainBadgeProps {
  agreementId: string;
  onChainId?: string | null;
  onChainTxHash?: string | null;
}

// URL do block explorer (configurável)
const BLOCK_EXPLORER_URL = 'https://polkadot.js.org/apps/?rpc=wss%3A%2F%2Fbazari.libervia.xyz%2Fws#/explorer/query';

function truncateHash(hash: string, chars = 8): string {
  if (hash.length <= chars * 2) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

function CopyButton({ value }: { value: string }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copiado!');
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0"
      onClick={handleCopy}
    >
      <Copy className="h-3 w-3" />
    </Button>
  );
}

export function OnChainBadge({ agreementId, onChainId, onChainTxHash }: OnChainBadgeProps) {
  // Se já sabemos que não tem registro, não buscar
  const { data, isLoading } = useQuery({
    queryKey: ['agreement-onchain', agreementId],
    queryFn: () => getAgreementOnChain(agreementId),
    enabled: !!onChainId || onChainId === undefined, // Buscar se tem ID ou se não sabemos
    staleTime: 1000 * 60 * 5, // 5 min cache
  });

  // Se carregando
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  // Se não tem registro
  if (!data?.registered && !onChainId) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Aguardando registro on-chain</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            O registro será feito automaticamente quando disponível.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Dados disponíveis
  const displayOnChainId = data?.onChainId || onChainId;
  const displayTxHash = data?.txHash || onChainTxHash;
  const onChainData = data?.data;

  return (
    <Card className="border-green-500/30 bg-green-500/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm mb-3">
          <Link2 className="h-4 w-4 text-green-500" />
          <span className="font-medium">Registrado on-chain</span>
          <Badge variant="outline" className="ml-auto text-green-600 border-green-500/50">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Verificado
          </Badge>
        </div>

        <div className="space-y-2 text-sm">
          {/* ID Hash */}
          {displayOnChainId && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-12">ID:</span>
              <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono flex-1 truncate">
                {truncateHash(displayOnChainId, 12)}
              </code>
              <CopyButton value={displayOnChainId} />
            </div>
          )}

          {/* TX Hash */}
          {displayTxHash && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-12">TX:</span>
              <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono flex-1 truncate">
                {truncateHash(displayTxHash, 12)}
              </code>
              <CopyButton value={displayTxHash} />
              <a
                href={`${BLOCK_EXPLORER_URL}/${displayTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {/* Status on-chain (se disponível) */}
          {onChainData && (
            <div className="flex items-center gap-2 pt-2 border-t border-border/50 mt-2">
              <span className="text-muted-foreground">Status blockchain:</span>
              <Badge variant="secondary" className="text-xs">
                {onChainData.status === 'Active' && 'Ativo'}
                {onChainData.status === 'Paused' && 'Pausado'}
                {onChainData.status === 'Closed' && 'Encerrado'}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default OnChainBadge;
