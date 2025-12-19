// path: apps/web/src/modules/work/components/AgreementActions.tsx
// Ações disponíveis para um acordo

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Pause, Play, XCircle, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  pauseAgreement,
  resumeAgreement,
  closeAgreement,
  type WorkAgreement,
} from '../api';

interface AgreementActionsProps {
  agreement: WorkAgreement;
  onAction?: () => void;
}

export function AgreementActions({ agreement, onAction }: AgreementActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [reason, setReason] = useState('');

  const isActive = agreement.status === 'ACTIVE';
  const isPaused = agreement.status === 'PAUSED';
  const isClosed = agreement.status === 'CLOSED';

  const handlePause = async () => {
    setLoading('pause');
    try {
      await pauseAgreement(agreement.id, reason || undefined);
      toast.success('Acordo pausado', {
        description: 'O acordo foi pausado com sucesso.',
      });
      setShowPauseDialog(false);
      setReason('');
      onAction?.();
    } catch (error) {
      toast.error('Erro ao pausar acordo', {
        description: error instanceof Error ? error.message : 'Tente novamente',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleResume = async () => {
    setLoading('resume');
    try {
      await resumeAgreement(agreement.id, reason || undefined);
      toast.success('Acordo retomado', {
        description: 'O acordo foi retomado com sucesso.',
      });
      setShowResumeDialog(false);
      setReason('');
      onAction?.();
    } catch (error) {
      toast.error('Erro ao retomar acordo', {
        description: error instanceof Error ? error.message : 'Tente novamente',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleClose = async () => {
    if (!reason.trim()) {
      toast.error('Motivo obrigatório', {
        description: 'Informe o motivo do encerramento.',
      });
      return;
    }

    setLoading('close');
    try {
      const result = await closeAgreement(agreement.id, reason);
      toast.success('Acordo encerrado', {
        description: result.canEvaluate
          ? 'Você pode avaliar a outra parte.'
          : 'O acordo foi encerrado.',
      });
      setShowCloseDialog(false);
      setReason('');
      onAction?.();
    } catch (error) {
      toast.error('Erro ao encerrar acordo', {
        description: error instanceof Error ? error.message : 'Tente novamente',
      });
    } finally {
      setLoading(null);
    }
  };

  // Se fechado, não há ações
  if (isClosed) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Este acordo foi encerrado e não pode ser modificado.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {/* Pausar/Retomar */}
        {isActive && (
          <Button
            variant="outline"
            onClick={() => setShowPauseDialog(true)}
            disabled={loading !== null}
          >
            {loading === 'pause' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Pause className="h-4 w-4 mr-2" />
            )}
            Pausar Acordo
          </Button>
        )}

        {isPaused && (
          <Button
            variant="default"
            onClick={() => setShowResumeDialog(true)}
            disabled={loading !== null}
          >
            {loading === 'resume' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Retomar Acordo
          </Button>
        )}

        {/* Encerrar */}
        <Button
          variant="destructive"
          onClick={() => setShowCloseDialog(true)}
          disabled={loading !== null}
        >
          {loading === 'close' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4 mr-2" />
          )}
          Encerrar Acordo
        </Button>

        {/* Chat (se existir) */}
        {agreement.proposal?.chatThreadId && (
          <Button variant="outline" asChild>
            <Link to={`/app/chat?thread=${agreement.proposal.chatThreadId}`}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Abrir Chat
            </Link>
          </Button>
        )}
      </div>

      {/* Dialog Pausar */}
      <AlertDialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pausar Acordo</AlertDialogTitle>
            <AlertDialogDescription>
              Pausar temporariamente o acordo. Você poderá retomá-lo depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="pause-reason">Motivo (opcional)</Label>
            <Textarea
              id="pause-reason"
              placeholder="Ex: Férias, aguardando aprovação..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading !== null}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePause}
              disabled={loading !== null}
            >
              {loading === 'pause' && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Pausar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Retomar */}
      <AlertDialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retomar Acordo</AlertDialogTitle>
            <AlertDialogDescription>
              O acordo será reativado e as atividades podem continuar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="resume-reason">Motivo (opcional)</Label>
            <Textarea
              id="resume-reason"
              placeholder="Ex: Retorno de férias, aprovação concluída..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading !== null}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResume}
              disabled={loading !== null}
            >
              {loading === 'resume' && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Retomar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Encerrar */}
      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar Acordo</AlertDialogTitle>
            <AlertDialogDescription className="text-destructive">
              Esta ação é irreversível. O acordo será encerrado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="close-reason">
              Motivo do encerramento <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="close-reason"
              placeholder="Ex: Projeto concluído, cancelamento por acordo mútuo..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2"
              required
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading !== null}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClose}
              disabled={loading !== null || !reason.trim()}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading === 'close' && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Encerrar Acordo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AgreementActions;
