import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { GovernanceProposal, ProposalType, ProposalStatus } from '../types';
import { Vote, Coins, Users, FileText } from 'lucide-react';

interface ProposalCardProps {
  proposal: GovernanceProposal;
  onClick?: () => void;
}

const typeConfig: Record<ProposalType, { label: string; icon: React.ReactNode; color: string }> = {
  DEMOCRACY: {
    label: 'Democracia',
    icon: <Vote className="h-4 w-4" />,
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  },
  TREASURY: {
    label: 'Tesouro',
    icon: <Coins className="h-4 w-4" />,
    color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  },
  COUNCIL: {
    label: 'Conselho',
    icon: <Users className="h-4 w-4" />,
    color: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  },
  TECHNICAL: {
    label: 'Técnico',
    icon: <FileText className="h-4 w-4" />,
    color: 'bg-green-500/10 text-green-500 border-green-500/20',
  },
};

const statusConfig: Record<ProposalStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PROPOSED: { label: 'Proposta', variant: 'outline' },
  TABLED: { label: 'Em Mesa', variant: 'secondary' },
  STARTED: { label: 'Votação Ativa', variant: 'default' },
  PASSED: { label: 'Aprovada', variant: 'default' },
  NOT_PASSED: { label: 'Rejeitada', variant: 'destructive' },
  CANCELLED: { label: 'Cancelada', variant: 'destructive' },
  EXECUTED: { label: 'Executada', variant: 'secondary' },
};

export function ProposalCard({ proposal, onClick }: ProposalCardProps) {
  const typeInfo = typeConfig[proposal.type];
  const statusInfo = statusConfig[proposal.status];

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance?: string) => {
    if (!balance) return '0';
    const num = parseFloat(balance);
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)} BZR`;
    return `${num.toFixed(2)} planck`;
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
              <Badge variant="outline" className={typeInfo.color}>
                {typeInfo.icon}
                <span className="ml-1">{typeInfo.label}</span>
              </Badge>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              <span className="text-sm text-muted-foreground">#{proposal.id}</span>
            </div>

            <h3 className="font-semibold text-lg leading-tight">
              {proposal.title || `${typeInfo.label} Proposal #${proposal.id}`}
            </h3>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Description */}
        {proposal.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {proposal.description}
          </p>
        )}

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Proposer:</span>
            <p className="font-mono text-xs">{formatAddress(proposal.proposer)}</p>
          </div>

          {proposal.deposit && (
            <div>
              <span className="text-muted-foreground">Deposit:</span>
              <p className="font-semibold">{formatBalance(proposal.deposit)}</p>
            </div>
          )}

          {proposal.value && (
            <div>
              <span className="text-muted-foreground">Value:</span>
              <p className="font-semibold text-primary">{formatBalance(proposal.value)}</p>
            </div>
          )}

          {proposal.beneficiary && (
            <div>
              <span className="text-muted-foreground">Beneficiary:</span>
              <p className="font-mono text-xs">{formatAddress(proposal.beneficiary)}</p>
            </div>
          )}
        </div>

        {/* Voting Stats (if available) */}
        {(proposal.ayeVotes || proposal.nayVotes) && (
          <div className="pt-2 border-t space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-green-600 dark:text-green-400">
                Aye: {formatBalance(proposal.ayeVotes)}
              </span>
              <span className="text-red-600 dark:text-red-400">
                Nay: {formatBalance(proposal.nayVotes)}
              </span>
            </div>
            {proposal.turnout && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Turnout: {formatBalance(proposal.turnout)}</span>
              </div>
            )}
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
