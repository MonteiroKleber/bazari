import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export interface TransactionDetails {
  type?: string;           // "transfer" | "createStore" | "lockEscrow" | etc
  description: string;     // "Transferir para 5FHneW..."
  amount?: string;         // "10 BZR"
  fee: string;            // "0.001 BZR"
  total?: string;          // "10.001 BZR"
  balance?: string;        // "150 BZR"
  balanceSufficient?: boolean;  // true/false
  warning?: string;        // "⚠ Saldo ficará abaixo do mínimo recomendado"
}

interface PinDialogProps {
  open: boolean;
  title: string;
  description?: string;
  label?: string;
  cancelText?: string;
  confirmText?: string;
  loading?: boolean;
  error?: string | null;
  transaction?: TransactionDetails;
  onCancel: () => void;
  onConfirm: (pin: string) => void;
}

export function PinDialog({
  open,
  title,
  description,
  label = 'PIN',
  cancelText = 'Cancelar',
  confirmText = 'Confirmar',
  loading = false,
  error = null,
  transaction,
  onCancel,
  onConfirm,
}: PinDialogProps) {
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (!open) setPin('');
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" role="dialog" aria-modal="true">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Transaction Details */}
          {transaction && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <h4 className="font-medium text-sm text-foreground">{transaction.description}</h4>
              <Separator />
              <div className="space-y-2 text-sm">
                {transaction.amount && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Valor:</span>
                    <span className="font-medium">{transaction.amount}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Taxa de rede:</span>
                  <span className="font-medium">{transaction.fee}</span>
                </div>
                {transaction.total && (
                  <>
                    <Separator className="my-2" />
                    <div className="flex justify-between items-center font-semibold">
                      <span>Total:</span>
                      <span>{transaction.total}</span>
                    </div>
                  </>
                )}
                {transaction.balance && (
                  <div className="flex justify-between items-center pt-2 text-xs">
                    <span className="text-muted-foreground">Saldo disponível:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{transaction.balance}</span>
                      {transaction.balanceSufficient !== undefined && (
                        transaction.balanceSufficient ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
              {transaction.warning && (
                <Alert variant="destructive" className="mt-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs ml-2">
                    {transaction.warning}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* PIN Input */}
          <div className="space-y-2">
            <Label htmlFor="pin-input-generic">{label}</Label>
            <Input
              id="pin-input-generic"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              disabled={loading}
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={loading}>{cancelText}</Button>
            <Button onClick={() => onConfirm(pin)} disabled={loading || !pin}>
              {loading ? 'Processando…' : confirmText}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PinDialog;

