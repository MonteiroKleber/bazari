import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface PinDialogProps {
  open: boolean;
  title: string;
  description?: string;
  label?: string;
  cancelText?: string;
  confirmText?: string;
  loading?: boolean;
  error?: string | null;
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
          <div className="space-y-2">
            <Label htmlFor="pin-input-generic">{label}</Label>
            <Input
              id="pin-input-generic"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              disabled={loading}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={loading}>{cancelText}</Button>
            <Button onClick={() => onConfirm(pin)} disabled={loading}>{loading ? 'Desbloqueando…' : confirmText}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PinDialog;

