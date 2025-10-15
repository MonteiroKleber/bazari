import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Proposal } from '@bazari/shared-types';

interface CheckoutConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: Proposal;
  onConfirm: () => Promise<void>;
  sellerHandle?: string;
}

export function CheckoutConfirmDialog({
  open,
  onOpenChange,
  proposal,
  onConfirm,
  sellerHandle = 'vendedor',
}: CheckoutConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  // Mock: Saldo disponível (em produção viria de wallet)
  const mockBalance = 500.0;
  const total = parseFloat(proposal.total);
  const hasBalance = mockBalance >= total;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar Pagamento</DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita. Confirme os dados antes de prosseguir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Valor Total */}
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-2xl font-bold text-center text-primary">
              R$ {total.toFixed(2)} BZR
            </p>
          </div>

          {/* Detalhes */}
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vendedor:</span>
              <span className="font-medium">@{sellerHandle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Itens:</span>
              <span className="font-medium">{proposal.items.length} produto(s)</span>
            </div>
            {proposal.shipping && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frete:</span>
                <span className="font-medium">
                  {proposal.shipping.method} - R$ {parseFloat(proposal.shipping.price).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Saldo Disponível */}
          <Alert variant={hasBalance ? 'default' : 'destructive'}>
            <AlertDescription>
              {hasBalance ? (
                <>
                  <span className="font-medium">Saldo Disponível:</span> R$ {mockBalance.toFixed(2)} BZR
                </>
              ) : (
                <>
                  <span className="font-medium">Saldo Insuficiente!</span>
                  <br />
                  Disponível: R$ {mockBalance.toFixed(2)} BZR
                  <br />
                  Necessário: R$ {total.toFixed(2)} BZR
                </>
              )}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!hasBalance}>
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
