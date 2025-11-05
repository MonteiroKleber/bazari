import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Coins, User, Calendar } from 'lucide-react';
import type { TreasuryRequest } from '../hooks';

interface TreasuryRequestCardProps {
  request: TreasuryRequest;
  onClick?: () => void;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDING_REVIEW: { label: 'Pendente Revisão', variant: 'outline' },
  IN_VOTING: { label: 'Em Votação', variant: 'default' },
  APPROVED: { label: 'Aprovada', variant: 'default' },
  REJECTED: { label: 'Rejeitada', variant: 'destructive' },
  PAID_OUT: { label: 'Paga', variant: 'secondary' },
};

export function TreasuryRequestCard({ request, onClick }: TreasuryRequestCardProps) {
  const statusInfo = statusConfig[request.status] || { label: request.status, variant: 'outline' };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)} BZR`;
    return `${num.toFixed(2)} planck`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Card
      className={`cursor-pointer hover:border-primary transition-all ${
        onClick ? 'hover:shadow-md' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                <Coins className="h-4 w-4 mr-1" />
                Tesouro
              </Badge>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              <span className="text-sm text-muted-foreground">#{request.id}</span>
            </div>

            <h3 className="font-semibold text-lg leading-tight">
              {request.title}
            </h3>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 break-all">
          {request.description}
        </p>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <Coins className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <span className="text-muted-foreground block">Valor:</span>
              <p className="font-semibold text-primary">{formatBalance(request.value)}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <span className="text-muted-foreground block">Beneficiário:</span>
              <p className="font-mono text-xs">{formatAddress(request.beneficiary)}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <span className="text-muted-foreground block">Proposer:</span>
              <p className="font-mono text-xs">{formatAddress(request.proposer)}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <span className="text-muted-foreground block">Criada:</span>
              <p className="text-xs">{formatDate(request.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Motion Info (if linked) */}
        {request.councilMotionHash && (
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Motion:</span>
              <span className="font-mono ml-1">{formatAddress(request.councilMotionHash)}</span>
              {request.councilMotionIndex !== null && (
                <span className="ml-1">#{request.councilMotionIndex}</span>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        {onClick && (
          <Button variant="outline" size="sm" className="w-full mt-2">
            Ver Detalhes
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
