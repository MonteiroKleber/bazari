import { useState, useEffect } from 'react';
import { DollarSign, Loader2, Check, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface AppPurchaseButtonProps {
  appId: string;
  appName: string;
  price: number;
  currency?: string;
  monetizationType: 'FREE' | 'PAID' | 'FREEMIUM' | 'SUBSCRIPTION';
  onPurchaseComplete?: () => void;
  disabled?: boolean;
}

export function AppPurchaseButton({
  appId,
  appName,
  price,
  currency = 'BZR',
  monetizationType,
  onPurchaseComplete,
  disabled = false,
}: AppPurchaseButtonProps) {
  const [isPurchased, setIsPurchased] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    const checkPurchaseStatus = async () => {
      if (monetizationType === 'FREE') {
        setIsChecking(false);
        return;
      }

      try {
        const response = await api.get(`/store/apps/${appId}/purchased`);
        setIsPurchased(response.data.purchased);
      } catch (err) {
        console.error('Error checking purchase status:', err);
      } finally {
        setIsChecking(false);
      }
    };

    checkPurchaseStatus();
  }, [appId, monetizationType]);

  const handlePurchase = async () => {
    setIsPurchasing(true);
    try {
      await api.post(`/store/apps/${appId}/purchase`);
      setIsPurchased(true);
      setShowConfirmDialog(false);
      toast.success('Compra realizada!', {
        description: `${appName} foi desbloqueado com sucesso.`,
      });
      onPurchaseComplete?.();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error('Erro na compra', {
        description: error.response?.data?.error || 'Tente novamente',
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  // Free app - no purchase needed
  if (monetizationType === 'FREE') {
    return null;
  }

  // Still checking purchase status
  if (isChecking) {
    return (
      <Button disabled className="min-w-32">
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  // Already purchased
  if (isPurchased) {
    return (
      <Button variant="outline" disabled className="min-w-32">
        <Check className="w-4 h-4 mr-2" />
        Desbloqueado
      </Button>
    );
  }

  // Not purchased - show buy button
  return (
    <>
      <Button
        onClick={() => setShowConfirmDialog(true)}
        disabled={disabled || isPurchasing}
        className="min-w-32 bg-green-600 hover:bg-green-700"
      >
        {isPurchasing ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <DollarSign className="w-4 h-4 mr-1" />
        )}
        {price.toFixed(2)} {currency}
      </Button>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Compra</DialogTitle>
            <DialogDescription>
              Você está prestes a comprar o app <strong>{appName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Preço</span>
                <span className="font-bold text-lg">
                  {price.toFixed(2)} {currency}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Tipo</span>
                <span>
                  {monetizationType === 'PAID' && 'Compra única'}
                  {monetizationType === 'SUBSCRIPTION' && 'Assinatura'}
                  {monetizationType === 'FREEMIUM' && 'Desbloqueio'}
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
              <Lock className="w-4 h-4 mt-0.5 shrink-0" />
              <p>
                O valor será debitado da sua carteira Bazari. Após a compra, o app
                será desbloqueado permanentemente na sua conta.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isPurchasing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePurchase}
              disabled={isPurchasing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isPurchasing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                <>
                  Confirmar Compra
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
