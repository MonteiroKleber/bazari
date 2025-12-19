// path: apps/web/src/modules/pay/components/AdjustmentForm.tsx
// Formulário de criação de ajuste (PROMPT-03)

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Minus, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createAdjustment } from '../api';
import type { AdjustmentType } from '../api';

interface AdjustmentFormProps {
  contractId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();

  // Próximos 3 meses
  for (let i = 0; i <= 3; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
    const label = date.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
    });
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }

  return options;
}

export function AdjustmentForm({ contractId, onSuccess, onCancel }: AdjustmentFormProps) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<AdjustmentType>('EXTRA');
  const [value, setValue] = useState('');
  const [referenceMonth, setReferenceMonth] = useState(getCurrentMonth());
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  const monthOptions = getMonthOptions();

  const mutation = useMutation({
    mutationFn: () =>
      createAdjustment(contractId, {
        type,
        value,
        referenceMonth,
        reason,
        description: description || undefined,
      }),
    onSuccess: () => {
      toast.success(
        type === 'EXTRA'
          ? 'Extra adicionado com sucesso!'
          : 'Desconto enviado para aprovação!'
      );
      queryClient.invalidateQueries({ queryKey: ['pay-contract-adjustments', contractId] });
      queryClient.invalidateQueries({ queryKey: ['pay-adjustments-pending'] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar ajuste');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!value || parseFloat(value) <= 0) {
      toast.error('Informe um valor válido');
      return;
    }
    if (!reason.trim()) {
      toast.error('Informe o motivo do ajuste');
      return;
    }

    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tipo */}
      <div className="space-y-2">
        <Label>Tipo de Ajuste</Label>
        <RadioGroup
          value={type}
          onValueChange={(v) => setType(v as AdjustmentType)}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="EXTRA" id="extra" />
            <Label
              htmlFor="extra"
              className="flex items-center gap-1 cursor-pointer text-green-600"
            >
              <Plus className="h-4 w-4" />
              Extra
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="DISCOUNT" id="discount" />
            <Label
              htmlFor="discount"
              className="flex items-center gap-1 cursor-pointer text-red-600"
            >
              <Minus className="h-4 w-4" />
              Desconto
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Valor */}
      <div className="space-y-2">
        <Label htmlFor="value">Valor *</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            R$
          </span>
          <Input
            id="value"
            type="number"
            step="0.01"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0,00"
            className="pl-10"
            required
          />
        </div>
      </div>

      {/* Mês de Referência */}
      <div className="space-y-2">
        <Label htmlFor="month">Mês de Referência *</Label>
        <select
          id="month"
          value={referenceMonth}
          onChange={(e) => setReferenceMonth(e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Motivo */}
      <div className="space-y-2">
        <Label htmlFor="reason">Motivo *</Label>
        <Input
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            type === 'EXTRA'
              ? 'Ex: Bônus por meta atingida'
              : 'Ex: Desconto de adiantamento'
          }
          required
        />
      </div>

      {/* Descrição */}
      <div className="space-y-2">
        <Label htmlFor="description">Descrição (opcional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalhes adicionais..."
          rows={2}
        />
      </div>

      {/* Aviso de aprovação */}
      {type === 'DISCOUNT' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Descontos requerem aprovação do recebedor antes de serem aplicados.
          </AlertDescription>
        </Alert>
      )}

      {/* Botões */}
      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={mutation.isPending} className="flex-1">
          {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {type === 'DISCOUNT' ? 'Enviar para Aprovação' : 'Adicionar Extra'}
        </Button>
      </div>
    </form>
  );
}
