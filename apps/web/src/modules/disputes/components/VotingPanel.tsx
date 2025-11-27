import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Dispute } from '@/hooks/blockchain/useDispute';
import { useJurorVoteStatus } from '@/hooks/blockchain/useDispute';
import { CommitVoteModal } from './CommitVoteModal';
import { RevealVoteModal } from './RevealVoteModal';
import {
  Vote,
  Lock,
  Eye,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';

interface VotingPanelProps {
  dispute: Dispute;
  userAddress: string;
}

export function VotingPanel({ dispute, userAddress }: VotingPanelProps) {
  const [commitModalOpen, setCommitModalOpen] = useState(false);
  const [revealModalOpen, setRevealModalOpen] = useState(false);

  const voteStatus = useJurorVoteStatus(dispute, userAddress);
  const { hasCommitted, hasRevealed, vote } = voteStatus;

  const isInCommitPhase = dispute.isInCommitPhase;
  const isInRevealPhase = dispute.isInRevealPhase;
  const isResolved = dispute.status === 'Resolved';

  // Determine what action is needed
  const needsCommit = !hasCommitted && isInCommitPhase;
  const needsReveal = hasCommitted && !hasRevealed && isInRevealPhase;
  const canExecute = dispute.canExecuteRuling && !isResolved;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className="w-5 h-5" />
            Painel de Votacao
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status indicators */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={hasCommitted ? 'default' : 'outline'}
              className={hasCommitted ? 'bg-green-500/20 text-green-700' : ''}
            >
              {hasCommitted ? (
                <CheckCircle className="w-3 h-3 mr-1" />
              ) : (
                <Lock className="w-3 h-3 mr-1" />
              )}
              Commit {hasCommitted ? 'Enviado' : 'Pendente'}
            </Badge>

            <Badge
              variant={hasRevealed ? 'default' : 'outline'}
              className={hasRevealed ? 'bg-blue-500/20 text-blue-700' : ''}
            >
              {hasRevealed ? (
                <CheckCircle className="w-3 h-3 mr-1" />
              ) : (
                <Eye className="w-3 h-3 mr-1" />
              )}
              Reveal {hasRevealed ? 'Feito' : 'Pendente'}
            </Badge>

            {vote && (
              <Badge variant="secondary">
                Voto: {vote === 'RefundBuyer' ? 'Reembolso' : 'Liberar'}
              </Badge>
            )}
          </div>

          {/* Action area */}
          {needsCommit && (
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                Voce precisa submeter seu voto na fase de commit. Seu voto sera criptografado
                e revelado apenas na proxima fase.
              </AlertDescription>
            </Alert>
          )}

          {needsReveal && (
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                A fase de reveal esta ativa! Revele seu voto usando a mesma senha que voce
                usou no commit. Se nao revelar, seu voto nao sera contado.
              </AlertDescription>
            </Alert>
          )}

          {hasCommitted && !hasRevealed && !isInRevealPhase && !isResolved && (
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                Seu commit foi registrado. Aguarde a fase de reveal para revelar seu voto.
                <strong className="block mt-1">
                  IMPORTANTE: Guarde a senha (salt) que voce usou!
                </strong>
              </AlertDescription>
            </Alert>
          )}

          {isResolved && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <AlertDescription>
                Esta disputa foi resolvida. O ruling foi executado.
                {vote && (
                  <span className="block mt-1">
                    Seu voto: <strong>{vote === 'RefundBuyer' ? 'Reembolso' : 'Liberar'}</strong>
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {needsCommit && (
              <Button onClick={() => setCommitModalOpen(true)} className="flex-1">
                <Lock className="w-4 h-4 mr-2" />
                Submeter Voto
              </Button>
            )}

            {needsReveal && (
              <Button onClick={() => setRevealModalOpen(true)} className="flex-1">
                <Eye className="w-4 h-4 mr-2" />
                Revelar Voto
              </Button>
            )}

            {canExecute && (
              <Button variant="outline" className="flex-1">
                Executar Ruling
              </Button>
            )}
          </div>

          {/* Phase info */}
          <div className="text-xs text-muted-foreground pt-2 border-t">
            {isInCommitPhase && (
              <p>Fase atual: <strong>Commit</strong> - Jurados submetem votos criptografados</p>
            )}
            {isInRevealPhase && (
              <p>Fase atual: <strong>Reveal</strong> - Jurados revelam seus votos</p>
            )}
            {dispute.canExecuteRuling && !isResolved && (
              <p>Fase atual: <strong>Execucao</strong> - Qualquer um pode executar o ruling</p>
            )}
            {isResolved && (
              <p>Status: <strong>Resolvida</strong></p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <CommitVoteModal
        open={commitModalOpen}
        onOpenChange={setCommitModalOpen}
        disputeId={dispute.disputeId}
      />

      <RevealVoteModal
        open={revealModalOpen}
        onOpenChange={setRevealModalOpen}
        disputeId={dispute.disputeId}
      />
    </>
  );
}
