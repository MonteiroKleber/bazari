import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDispute,
  useDisputeCountdown,
  formatDisputeStatus,
  formatRuling,
} from '@/hooks/blockchain/useDispute';
import { useAuth } from '@/modules/auth/context';
import { DisputeTimeline } from '../components/DisputeTimeline';
import { VotingPanel } from '../components/VotingPanel';
import { JurorSelectionCard } from '../components/JurorSelectionCard';
import { EvidenceViewer } from '../components/EvidenceViewer';
import { CountdownTimer } from '@/components/blockchain/CountdownTimer';
import {
  ArrowLeft,
  Scale,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  FileText,
  Gavel,
} from 'lucide-react';

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'Resolved':
      return 'default';
    case 'CommitPhase':
    case 'RevealPhase':
      return 'secondary';
    case 'Open':
    case 'JurorsSelected':
      return 'outline';
    default:
      return 'default';
  }
}

function getRulingIcon(ruling: string | null) {
  if (!ruling) return null;
  switch (ruling) {
    case 'RefundBuyer':
      return <ArrowLeft className="w-4 h-4 mr-1" />;
    case 'ReleaseSeller':
      return <CheckCircle className="w-4 h-4 mr-1" />;
    case 'PartialRefund':
      return <Scale className="w-4 h-4 mr-1" />;
    default:
      return null;
  }
}

export function DisputeDetailPage() {
  const { disputeId } = useParams<{ disputeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const id = disputeId ? parseInt(disputeId, 10) : undefined;
  const { data: dispute, isLoading, error } = useDispute(id);
  const countdown = useDisputeCountdown(dispute);

  const userAddress = user?.address;
  const isJuror = dispute?.jurors?.includes(userAddress || '') || false;
  const isPlaintiff = dispute?.plaintiff === userAddress;
  const isDefendant = dispute?.defendant === userAddress;
  const isParty = isPlaintiff || isDefendant;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !dispute) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Disputa nao encontrada</h2>
            <p className="text-muted-foreground mb-4">
              {error?.message || 'A disputa solicitada nao existe ou foi removida.'}
            </p>
            <Button onClick={() => navigate('/app/disputes')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/disputes')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Scale className="w-6 h-6" />
              Disputa #{dispute.disputeId}
            </h1>
            <p className="text-muted-foreground">
              Pedido #{dispute.orderId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant(dispute.status)}>
            {formatDisputeStatus(dispute.status)}
          </Badge>
          {isJuror && (
            <Badge variant="outline" className="bg-purple-500/10 text-purple-700">
              <Users className="w-3 h-3 mr-1" />
              Jurado
            </Badge>
          )}
          {isParty && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-700">
              {isPlaintiff ? 'Reclamante' : 'Reclamado'}
            </Badge>
          )}
        </div>
      </div>

      {/* Countdown Card (if in active phase) */}
      {countdown && countdown.phase !== 'ended' && (
        <Card className="border-2 border-primary/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5" />
              {countdown.phase === 'commit' ? 'Fase de Commit' : 'Fase de Reveal'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CountdownTimer
              targetTimestamp={Date.now() + countdown.secondsRemaining * 1000}
              showProgress
              label={
                countdown.phase === 'commit'
                  ? 'Jurados devem submeter votos secretos'
                  : 'Jurados devem revelar votos'
              }
            />
            <p className="text-sm text-muted-foreground mt-2">
              {countdown.blocksRemaining} blocos restantes (Bloco atual: {dispute.currentBlock})
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Timeline and Evidence */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline */}
          <DisputeTimeline dispute={dispute} />

          {/* Evidence */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Evidencias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EvidenceViewer evidenceCid={dispute.evidenceCid} />
            </CardContent>
          </Card>

          {/* Voting Panel (for jurors) */}
          {isJuror && (
            <VotingPanel
              dispute={dispute}
              userAddress={userAddress || ''}
            />
          )}
        </div>

        {/* Right Column - Jurors and Ruling */}
        <div className="space-y-6">
          {/* Jurors Card */}
          <JurorSelectionCard
            jurors={dispute.jurors}
            commitStatus={dispute.commitStatus}
          />

          {/* Parties Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Partes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Reclamante</p>
                <p className="font-mono text-sm truncate" title={dispute.plaintiff}>
                  {dispute.plaintiff.slice(0, 8)}...{dispute.plaintiff.slice(-6)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reclamado</p>
                <p className="font-mono text-sm truncate" title={dispute.defendant}>
                  {dispute.defendant.slice(0, 8)}...{dispute.defendant.slice(-6)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Ruling Card (if resolved) */}
          {dispute.ruling && (
            <Card className="border-2 border-green-500/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Gavel className="w-5 h-5" />
                  Decisao Final
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  {getRulingIcon(dispute.ruling)}
                  <Badge variant="default" className="text-lg py-1 px-3">
                    {formatRuling(dispute.ruling)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Votos</p>
                    <p className="font-semibold">{dispute.votesCount}/5</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Quorum</p>
                    <p className={dispute.quorumReached ? 'text-green-600' : 'text-yellow-600'}>
                      {dispute.quorumReached ? 'Atingido' : 'Nao atingido'}
                    </p>
                  </div>
                </div>
                {dispute.votes.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Votos Revelados:</p>
                    <div className="space-y-1">
                      {dispute.votes.map((v, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="font-mono truncate max-w-[120px]">
                            {v.juror.slice(0, 6)}...
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {formatRuling(v.vote)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informacoes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criada no bloco</span>
                <span className="font-mono">{dispute.createdAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deadline Commit</span>
                <span className="font-mono">{dispute.commitDeadline}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deadline Reveal</span>
                <span className="font-mono">{dispute.revealDeadline}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bloco Atual</span>
                <span className="font-mono">{dispute.currentBlock}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
