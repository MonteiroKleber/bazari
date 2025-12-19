// path: apps/web/src/modules/pay/components/PendingAdjustments.tsx
// Lista de ajustes pendentes de aprovação (PROMPT-03)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, Plus, Minus, Calendar, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { getPendingAdjustments, approveAdjustment, rejectAdjustment } from '../api';

function formatCurrency(value: string): string {
  const numValue = parseFloat(value);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numValue);
}

function formatMonth(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function PendingAdjustments() {
  const queryClient = useQueryClient();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['pay-adjustments-pending'],
    queryFn: getPendingAdjustments,
  });

  const approveMutation = useMutation({
    mutationFn: approveAdjustment,
    onSuccess: () => {
      toast.success('Ajuste aprovado!');
      queryClient.invalidateQueries({ queryKey: ['pay-adjustments-pending'] });
      queryClient.invalidateQueries({ queryKey: ['pay-contract-adjustments'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao aprovar ajuste');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectAdjustment(id, reason),
    onSuccess: () => {
      toast.success('Ajuste rejeitado');
      setRejectDialogOpen(false);
      setSelectedAdjustment(null);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['pay-adjustments-pending'] });
      queryClient.invalidateQueries({ queryKey: ['pay-contract-adjustments'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao rejeitar ajuste');
    },
  });

  const handleReject = (adjustmentId: string) => {
    setSelectedAdjustment(adjustmentId);
    setRejectDialogOpen(true);
  };

  const confirmReject = () => {
    if (!selectedAdjustment || !rejectReason.trim()) {
      toast.error('Informe o motivo da rejeição');
      return;
    }
    rejectMutation.mutate({ id: selectedAdjustment, reason: rejectReason });
  };

  if (isLoading || !data?.items.length) return null;

  return (
    <>
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            Ajustes Pendentes de Aprovação ({data.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.items.map((adjustment) => (
            <div
              key={adjustment.id}
              className="flex items-center justify-between py-3 border-b last:border-0"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={adjustment.contract.payer.avatarUrl || undefined} />
                  <AvatarFallback>
                    {adjustment.contract.payer.displayName?.charAt(0) || 'P'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    {adjustment.type === 'EXTRA' ? (
                      <span className="text-green-600 font-semibold flex items-center gap-1">
                        <Plus className="h-3 w-3" />
                        {formatCurrency(adjustment.value)}
                      </span>
                    ) : (
                      <span className="text-red-600 font-semibold flex items-center gap-1">
                        <Minus className="h-3 w-3" />
                        {formatCurrency(adjustment.value)}
                      </span>
                    )}
                  </div>
                  <div className="text-sm">{adjustment.reason}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>De: {adjustment.contract.payer.displayName}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Ref: {formatMonth(adjustment.referenceMonth)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(adjustment.id)}
                  disabled={rejectMutation.isPending}
                >
                  Recusar
                </Button>
                <Button
                  size="sm"
                  onClick={() => approveMutation.mutate(adjustment.id)}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  )}
                  Aprovar
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Dialog de Rejeição */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Ajuste</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. O pagador será notificado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Motivo *</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex: Valor incorreto, período errado..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
            >
              {rejectMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
