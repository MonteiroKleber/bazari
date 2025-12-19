// path: apps/web/src/modules/work/components/ProposalActions.tsx
// Ações da proposta (aceitar, rejeitar, negociar, etc.)

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle,
  XCircle,
  MessageSquare,
  Send,
  Loader2,
  Ban,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  acceptProposal,
  rejectProposal,
  startNegotiation,
  sendCounterProposal,
  cancelProposal,
  type WorkProposal,
  type PaymentPeriod,
  type PaymentType,
} from '../api';

const paymentPeriodLabels: Record<PaymentPeriod, string> = {
  HOURLY: 'Por Hora',
  DAILY: 'Por Dia',
  WEEKLY: 'Por Semana',
  MONTHLY: 'Por Mês',
  PROJECT: 'Por Projeto',
};

const paymentTypeLabels: Record<PaymentType, string> = {
  EXTERNAL: 'Pagamento Externo',
  BAZARI_PAY: 'Bazari Pay',
  UNDEFINED: 'A Definir',
};

export interface ProposalActionsProps {
  proposal: WorkProposal;
  viewAs: 'sender' | 'receiver';
  onAction: () => void;
}

export function ProposalActions({
  proposal,
  viewAs,
  onAction,
}: ProposalActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showNegotiateDialog, setShowNegotiateDialog] = useState(false);
  const [showCounterDialog, setShowCounterDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [negotiateMessage, setNegotiateMessage] = useState('');
  const [counterData, setCounterData] = useState({
    proposedValue: proposal.proposedValue || '',
    valuePeriod: proposal.valuePeriod,
    paymentType: proposal.paymentType,
    message: '',
  });

  const canAccept =
    viewAs === 'receiver' &&
    (proposal.status === 'PENDING' || proposal.status === 'NEGOTIATING');

  const canReject =
    viewAs === 'receiver' &&
    (proposal.status === 'PENDING' || proposal.status === 'NEGOTIATING');

  const canNegotiate =
    viewAs === 'receiver' && proposal.status === 'PENDING';

  const canCounter =
    proposal.status === 'NEGOTIATING' && proposal.chatThreadId;

  const canCancel =
    viewAs === 'sender' &&
    (proposal.status === 'PENDING' || proposal.status === 'NEGOTIATING');

  const handleAccept = async () => {
    setLoading('accept');
    try {
      await acceptProposal(proposal.id);
      toast.success('Proposta aceita com sucesso!');
      onAction();
    } catch (error) {
      toast.error('Erro ao aceitar proposta', {
        description: error instanceof Error ? error.message : 'Tente novamente',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    setLoading('reject');
    try {
      await rejectProposal(proposal.id, rejectReason || undefined);
      toast.success('Proposta recusada');
      setShowRejectDialog(false);
      onAction();
    } catch (error) {
      toast.error('Erro ao recusar proposta', {
        description: error instanceof Error ? error.message : 'Tente novamente',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleNegotiate = async () => {
    if (!negotiateMessage.trim()) {
      toast.error('Digite uma mensagem para iniciar a negociação');
      return;
    }
    setLoading('negotiate');
    try {
      await startNegotiation(proposal.id, negotiateMessage);
      toast.success('Negociação iniciada! Chat criado.');
      setShowNegotiateDialog(false);
      onAction();
    } catch (error) {
      toast.error('Erro ao iniciar negociação', {
        description: error instanceof Error ? error.message : 'Tente novamente',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleCounter = async () => {
    if (!counterData.message.trim()) {
      toast.error('Digite uma mensagem para a contraproposta');
      return;
    }
    setLoading('counter');
    try {
      await sendCounterProposal(proposal.id, {
        proposedValue: parseFloat(counterData.proposedValue) || undefined,
        valuePeriod: counterData.valuePeriod,
        paymentType: counterData.paymentType,
        message: counterData.message,
      });
      toast.success('Contraproposta enviada!');
      setShowCounterDialog(false);
      onAction();
    } catch (error) {
      toast.error('Erro ao enviar contraproposta', {
        description: error instanceof Error ? error.message : 'Tente novamente',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleCancel = async () => {
    setLoading('cancel');
    try {
      await cancelProposal(proposal.id);
      toast.success('Proposta cancelada');
      setShowCancelDialog(false);
      onAction();
    } catch (error) {
      toast.error('Erro ao cancelar proposta', {
        description: error instanceof Error ? error.message : 'Tente novamente',
      });
    } finally {
      setLoading(null);
    }
  };

  if (
    proposal.status === 'ACCEPTED' ||
    proposal.status === 'REJECTED' ||
    proposal.status === 'EXPIRED' ||
    proposal.status === 'CANCELLED'
  ) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {canAccept && (
          <Button
            onClick={handleAccept}
            disabled={loading !== null}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading === 'accept' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Aceitar Proposta
          </Button>
        )}

        {canNegotiate && (
          <Button
            variant="outline"
            onClick={() => setShowNegotiateDialog(true)}
            disabled={loading !== null}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Negociar
          </Button>
        )}

        {canCounter && (
          <Button
            variant="outline"
            onClick={() => setShowCounterDialog(true)}
            disabled={loading !== null}
          >
            <Send className="h-4 w-4 mr-2" />
            Contraproposta
          </Button>
        )}

        {canReject && (
          <Button
            variant="outline"
            onClick={() => setShowRejectDialog(true)}
            disabled={loading !== null}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Recusar
          </Button>
        )}

        {canCancel && (
          <Button
            variant="ghost"
            onClick={() => setShowCancelDialog(true)}
            disabled={loading !== null}
            className="text-muted-foreground"
          >
            <Ban className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar Proposta</DialogTitle>
            <DialogDescription>
              Deseja realmente recusar esta proposta? Você pode informar um motivo opcional.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejectReason">Motivo (opcional)</Label>
            <Textarea
              id="rejectReason"
              placeholder="Ex: Valor abaixo do esperado, prazo incompatível..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              disabled={loading !== null}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loading !== null}
            >
              {loading === 'reject' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Confirmar Recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Negotiate Dialog */}
      <Dialog open={showNegotiateDialog} onOpenChange={setShowNegotiateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Iniciar Negociação</DialogTitle>
            <DialogDescription>
              Um chat será criado para vocês negociarem os detalhes da proposta.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="negotiateMessage">Mensagem inicial</Label>
            <Textarea
              id="negotiateMessage"
              placeholder="Ex: Olá! Gostaria de discutir alguns pontos da proposta..."
              value={negotiateMessage}
              onChange={(e) => setNegotiateMessage(e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNegotiateDialog(false)}
              disabled={loading !== null}
            >
              Cancelar
            </Button>
            <Button onClick={handleNegotiate} disabled={loading !== null}>
              {loading === 'negotiate' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4 mr-2" />
              )}
              Iniciar Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Counter Proposal Dialog */}
      <Dialog open={showCounterDialog} onOpenChange={setShowCounterDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Contraproposta</DialogTitle>
            <DialogDescription>
              Proponha novos termos para a negociação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="counterValue">Valor</Label>
                <Input
                  id="counterValue"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={counterData.proposedValue}
                  onChange={(e) =>
                    setCounterData({ ...counterData, proposedValue: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="counterPeriod">Período</Label>
                <Select
                  value={counterData.valuePeriod}
                  onValueChange={(value: PaymentPeriod) =>
                    setCounterData({ ...counterData, valuePeriod: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(paymentPeriodLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="counterPaymentType">Forma de Pagamento</Label>
              <Select
                value={counterData.paymentType}
                onValueChange={(value: PaymentType) =>
                  setCounterData({ ...counterData, paymentType: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(paymentTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="counterMessage">Mensagem</Label>
              <Textarea
                id="counterMessage"
                placeholder="Ex: Considerando o escopo, sugiro o seguinte valor..."
                value={counterData.message}
                onChange={(e) =>
                  setCounterData({ ...counterData, message: e.target.value })
                }
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCounterDialog(false)}
              disabled={loading !== null}
            >
              Cancelar
            </Button>
            <Button onClick={handleCounter} disabled={loading !== null}>
              {loading === 'counter' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Proposta</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar esta proposta? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={loading !== null}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={loading !== null}
            >
              {loading === 'cancel' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ProposalActions;
