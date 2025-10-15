import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Slider } from '../ui/slider';
import { toast } from 'sonner';
import { apiHelpers } from '../../lib/api';

interface ApproveAffiliateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  storeId: number;
  affiliateId: string;
  promoterHandle: string;
}

export function ApproveAffiliateDialog({
  open,
  onClose,
  onSuccess,
  storeId,
  affiliateId,
  promoterHandle,
}: ApproveAffiliateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [customCommission, setCustomCommission] = useState<number>(5);
  const [monthlySalesCap, setMonthlySalesCap] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (customCommission < 0 || customCommission > 100) {
      toast.error('Comissão deve estar entre 0% e 100%');
      return;
    }

    try {
      setLoading(true);

      await apiHelpers.post(`/api/chat/affiliates/store/${storeId}/approve`, {
        affiliateId,
        customCommission: customCommission,
        monthlySalesCap: monthlySalesCap || undefined,
        notes: notes || undefined,
      });

      toast.success(`Afiliado @${promoterHandle} aprovado com sucesso!`);
      onSuccess();
      onClose();

      // Reset form
      setCustomCommission(5);
      setMonthlySalesCap('');
      setNotes('');
    } catch (error) {
      console.error('Failed to approve affiliate:', error);
      toast.error('Erro ao aprovar afiliado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Aprovar Afiliado</DialogTitle>
            <DialogDescription>
              Configure as condições para @{promoterHandle}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Custom Commission */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="commission">Comissão Customizada</Label>
                <span className="text-sm font-medium text-blue-600">
                  {customCommission}%
                </span>
              </div>
              <Slider
                id="commission"
                min={0}
                max={20}
                step={1}
                value={[customCommission]}
                onValueChange={(value) => setCustomCommission(value[0])}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Defina uma comissão específica para este afiliado (0-20%)
              </p>
            </div>

            {/* Monthly Sales Cap */}
            <div className="space-y-2">
              <Label htmlFor="salesCap">Limite Mensal de Vendas (opcional)</Label>
              <Input
                id="salesCap"
                type="number"
                step="0.01"
                placeholder="Ex: 1000.00"
                value={monthlySalesCap}
                onChange={(e) => setMonthlySalesCap(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Limite máximo de vendas por mês em BZR. Deixe vazio para ilimitado.
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Observações sobre este afiliado..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Aprovando...' : 'Aprovar Afiliado'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
