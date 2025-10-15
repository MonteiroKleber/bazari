import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface CheckoutButtonProps {
  proposalId: string;
  total: string;
  onSuccess?: (saleId: string, txHash: string) => void;
  disabled?: boolean;
}

export function CheckoutButton({ proposalId, total, onSuccess, disabled }: CheckoutButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // TODO: Integrar com API real
      // const result = await api.checkout({ proposalId });

      // MOCK: Simular checkout
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockSaleId = `sale_${Date.now()}`;
      const mockTxHash = `0x${Math.random().toString(16).slice(2)}`;

      onSuccess?.(mockSaleId, mockTxHash);
    } catch (err) {
      setError('Não foi possível processar o pagamento. Tente novamente.');
      console.error('Checkout error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full">
      <Button
        onClick={handleCheckout}
        disabled={disabled || isProcessing}
        className="w-full"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processando Pagamento...
          </>
        ) : (
          `Pagar ${parseFloat(total).toFixed(2)} BZR`
        )}
      </Button>
      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}
    </div>
  );
}
