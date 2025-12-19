// path: apps/web/src/modules/pay/components/ContractActions.tsx
// Botões de ação do contrato (PROMPT-01)

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pause, Play, XCircle, Loader2 } from 'lucide-react';
import { pauseContract, resumeContract, closeContract } from '../api';
import type { PayContractStatus } from '../api';
import { toast } from 'sonner';

interface ContractActionsProps {
  contractId: string;
  status: PayContractStatus;
  canManage: boolean;
}

type DialogType = 'pause' | 'resume' | 'close' | null;

export function ContractActions({
  contractId,
  status,
  canManage,
}: ContractActionsProps) {
  const [dialog, setDialog] = useState<DialogType>(null);
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  const pauseMutation = useMutation({
    mutationFn: () => pauseContract(contractId, reason || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pay-contract', contractId] });
      queryClient.invalidateQueries({ queryKey: ['pay-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['pay-dashboard'] });
      toast.success('Contrato pausado com sucesso');
      setDialog(null);
      setReason('');
    },
    onError: () => {
      toast.error('Erro ao pausar contrato');
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => resumeContract(contractId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pay-contract', contractId] });
      queryClient.invalidateQueries({ queryKey: ['pay-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['pay-dashboard'] });
      toast.success('Contrato retomado com sucesso');
      setDialog(null);
    },
    onError: () => {
      toast.error('Erro ao retomar contrato');
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => closeContract(contractId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pay-contract', contractId] });
      queryClient.invalidateQueries({ queryKey: ['pay-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['pay-dashboard'] });
      toast.success('Contrato encerrado');
      setDialog(null);
      setReason('');
    },
    onError: () => {
      toast.error('Erro ao encerrar contrato');
    },
  });

  if (!canManage || status === 'CLOSED') {
    return null;
  }

  const isLoading =
    pauseMutation.isPending ||
    resumeMutation.isPending ||
    closeMutation.isPending;

  return (
    <>
      <div className="flex gap-2">
        {status === 'ACTIVE' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialog('pause')}
            disabled={isLoading}
          >
            <Pause className="h-4 w-4 mr-2" />
            Pausar
          </Button>
        )}
        {status === 'PAUSED' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialog('resume')}
            disabled={isLoading}
          >
            <Play className="h-4 w-4 mr-2" />
            Retomar
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDialog('close')}
          disabled={isLoading}
        >
          <XCircle className="h-4 w-4 mr-2" />
          Encerrar
        </Button>
      </div>

      {/* Dialog de Pausar */}
      <AlertDialog open={dialog === 'pause'} onOpenChange={() => setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pausar Contrato</AlertDialogTitle>
            <AlertDialogDescription>
              Ao pausar o contrato, nenhum pagamento será executado até que ele
              seja retomado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="pauseReason">Motivo (opcional)</Label>
            <Input
              id="pauseReason"
              placeholder="Ex: Férias do colaborador"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pauseMutation.mutate()}
              disabled={pauseMutation.isPending}
            >
              {pauseMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Pausar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Retomar */}
      <AlertDialog open={dialog === 'resume'} onOpenChange={() => setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retomar Contrato</AlertDialogTitle>
            <AlertDialogDescription>
              Ao retomar o contrato, os pagamentos serão recalculados a partir de
              hoje e voltarão a ser executados automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resumeMutation.mutate()}
              disabled={resumeMutation.isPending}
            >
              {resumeMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Retomar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Encerrar */}
      <AlertDialog open={dialog === 'close'} onOpenChange={() => setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar Contrato</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. O contrato será encerrado e não poderá ser
              reativado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="closeReason">Motivo do encerramento *</Label>
            <Input
              id="closeReason"
              placeholder="Ex: Término do período de trabalho"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => closeMutation.mutate()}
              disabled={closeMutation.isPending || !reason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {closeMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Encerrar Contrato
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
