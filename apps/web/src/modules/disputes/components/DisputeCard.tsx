import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  formatDisputeStatus,
  formatRuling,
  type MyDispute,
  type JuryDispute,
} from '@/hooks/blockchain/useDispute';
import {
  Scale,
  User,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type DisputeType = MyDispute | JuryDispute;

interface DisputeCardProps {
  dispute: DisputeType;
  showRole?: boolean;
  showJuryActions?: boolean;
  onClick?: () => void;
}

function isJuryDispute(dispute: DisputeType): dispute is JuryDispute {
  return 'needsCommit' in dispute || 'needsReveal' in dispute;
}

function getRoleBadge(role: string) {
  switch (role) {
    case 'plaintiff':
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-700">
          <User className="w-3 h-3 mr-1" />
          Reclamante
        </Badge>
      );
    case 'defendant':
      return (
        <Badge variant="outline" className="bg-orange-500/10 text-orange-700">
          <User className="w-3 h-3 mr-1" />
          Reclamado
        </Badge>
      );
    case 'juror':
      return (
        <Badge variant="outline" className="bg-purple-500/10 text-purple-700">
          <Users className="w-3 h-3 mr-1" />
          Jurado
        </Badge>
      );
    default:
      return null;
  }
}

function getStatusBadge(status: string) {
  const variant: 'default' | 'secondary' | 'destructive' | 'outline' =
    status === 'Resolved' ? 'default' :
    ['CommitPhase', 'RevealPhase'].includes(status) ? 'secondary' :
    'outline';

  return (
    <Badge variant={variant}>
      {formatDisputeStatus(status)}
    </Badge>
  );
}

export function DisputeCard({ dispute, showRole, showJuryActions, onClick }: DisputeCardProps) {
  const isJury = isJuryDispute(dispute);
  const role = !isJury && 'role' in dispute ? dispute.role : 'juror';

  return (
    <Card
      className={cn(
        'hover:shadow-md transition-shadow',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          {/* Left side - Info */}
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10">
              <Scale className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">Disputa #{dispute.disputeId}</h3>
                {getStatusBadge(dispute.status)}
              </div>
              <p className="text-sm text-muted-foreground">
                Pedido #{dispute.orderId}
              </p>

              {/* Role badge */}
              {showRole && !isJury && (
                <div className="mt-2">
                  {getRoleBadge(role)}
                </div>
              )}

              {/* Jury actions needed */}
              {showJuryActions && isJury && (dispute.needsCommit || dispute.needsReveal) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {dispute.needsCommit && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Commit Pendente
                    </Badge>
                  )}
                  {dispute.needsReveal && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Reveal Pendente
                    </Badge>
                  )}
                </div>
              )}

              {/* Completed status for jury */}
              {showJuryActions && isJury && dispute.hasRevealed && (
                <div className="mt-2">
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Voto Revelado
                  </Badge>
                </div>
              )}

              {/* Ruling if resolved */}
              {'ruling' in dispute && dispute.ruling && (
                <div className="mt-2">
                  <Badge variant="secondary" className="text-xs">
                    Decisao: {formatRuling(dispute.ruling)}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Action */}
          <div className="flex items-center gap-2">
            {/* Created at info */}
            {'createdAt' in dispute && dispute.createdAt && (
              <div className="text-xs text-muted-foreground text-right hidden sm:block">
                <Clock className="w-3 h-3 inline mr-1" />
                Bloco {dispute.createdAt.toLocaleString()}
              </div>
            )}

            {onClick && (
              <Button variant="ghost" size="icon">
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
