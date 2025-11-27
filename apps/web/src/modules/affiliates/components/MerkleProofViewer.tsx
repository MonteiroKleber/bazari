import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Shield,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  ChevronRight,
  Info,
  Loader2,
} from 'lucide-react';
import {
  useMerkleProof,
  copyToClipboard,
  formatBzrAmount,
  shortenAddress,
  type CommissionMerkleProof,
} from '@/hooks/blockchain/useAffiliate';
import { toast } from 'sonner';

interface MerkleProofViewerProps {
  saleId: string;
  className?: string;
}

export function MerkleProofViewer({ saleId, className = '' }: MerkleProofViewerProps) {
  const { data: proof, isLoading, error } = useMerkleProof(saleId);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = async (text: string, field: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedField(field);
      toast.success('Copiado!');
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <XCircle className="w-12 h-12 text-destructive mb-4" />
          <p className="text-destructive font-medium">Erro ao carregar prova</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!proof) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Shield className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <p className="text-muted-foreground">Nenhuma prova encontrada para esta venda</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Prova Merkle de Comissao
        </CardTitle>
        <CardDescription>
          Verificacao criptografica on-chain das comissoes distribuidas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status de Verificação */}
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
          <div className="flex-1">
            <p className="font-medium text-green-700 dark:text-green-400">
              Verificado On-Chain
            </p>
            <p className="text-sm text-green-600 dark:text-green-500">
              Esta comissao esta registrada na blockchain
            </p>
          </div>
          {proof.onChain && (
            <Badge variant="outline" className="border-green-600 text-green-600">
              On-Chain
            </Badge>
          )}
        </div>

        {/* Detalhes da Comissão */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">ID da Venda</p>
            <p className="font-mono font-medium">{proof.saleId}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Valor da Comissao</p>
            <p className="font-medium">{formatBzrAmount(proof.amount)} BZR</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Nivel</p>
            <Badge variant="secondary">Nivel {proof.level}</Badge>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge
              variant={proof.status === 'CLAIMED' ? 'default' : 'outline'}
            >
              {proof.status === 'CLAIMED' ? 'Reivindicado' : 'Pendente'}
            </Badge>
          </div>
        </div>

        {/* Merkle Proof Técnico */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="merkle-details">
            <AccordionTrigger className="text-sm">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                Detalhes Tecnicos da Prova
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                {/* Merkle Root */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Merkle Root</p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleCopy(proof.merkleProof.root, 'root')}
                          >
                            {copiedField === 'root' ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copiar</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <code className="block text-xs bg-muted p-2 rounded font-mono break-all">
                    {proof.merkleProof.root}
                  </code>
                </div>

                {/* Leaf Hash */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Leaf Hash</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleCopy(proof.merkleProof.leaf, 'leaf')}
                    >
                      {copiedField === 'leaf' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                  <code className="block text-xs bg-muted p-2 rounded font-mono break-all">
                    {proof.merkleProof.leaf}
                  </code>
                </div>

                {/* Proof Path */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Caminho da Prova ({proof.merkleProof.proof.length} nodes)
                  </p>
                  <div className="space-y-1">
                    {proof.merkleProof.proof.map((node, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-xs"
                      >
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        <code className="flex-1 bg-muted p-1 rounded font-mono truncate">
                          {node}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Affiliate Address */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Endereco do Afiliado</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted p-2 rounded font-mono flex-1">
                      {proof.affiliateAddress}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleCopy(proof.affiliateAddress, 'address')}
                    >
                      {copiedField === 'address' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Info Box */}
        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <p className="font-medium mb-1 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            O que e uma Prova Merkle?
          </p>
          <p className="text-muted-foreground">
            Uma prova Merkle e uma verificacao criptografica que permite provar que
            sua comissao faz parte de uma arvore de dados sem revelar todas as
            informacoes. Isso garante transparencia e imutabilidade das comissoes
            registradas na blockchain.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Versão compacta para listagens
interface MerkleProofBadgeProps {
  saleId: string;
  onViewDetails?: () => void;
}

export function MerkleProofBadge({ saleId, onViewDetails }: MerkleProofBadgeProps) {
  const { data: proof, isLoading } = useMerkleProof(saleId);

  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="w-3 h-3 animate-spin" />
        Verificando...
      </Badge>
    );
  }

  if (!proof) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <XCircle className="w-3 h-3" />
        Sem prova
      </Badge>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="gap-1 cursor-pointer border-green-600 text-green-600 hover:bg-green-50"
            onClick={onViewDetails}
          >
            <CheckCircle2 className="w-3 h-3" />
            Verificado
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Comissao verificada on-chain</p>
          <p className="text-xs text-muted-foreground">Clique para ver detalhes</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
