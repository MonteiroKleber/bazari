import { useState } from 'react';
import { Proposal } from '@bazari/shared-types';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { CheckoutConfirmDialog } from './CheckoutConfirmDialog';
import { PaymentSuccessDialog } from './PaymentSuccessDialog';

interface ProposalCardProps {
  proposal: Proposal;
  onAccept?: (proposalId: string) => Promise<{ saleId?: string; receiptCid?: string }>;
  isLoading?: boolean;
  isSender?: boolean;
  sellerHandle?: string;
}

export function ProposalCard({ proposal, onAccept, isLoading, isSender, sellerHandle }: ProposalCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [salesData, setSalesData] = useState<Array<{
    saleId: string;
    storeId: number;
    storeName: string;
    amount: string;
    receiptCid?: string;
  }>>([]);

  const isExpired = proposal.expiresAt ? new Date(proposal.expiresAt) < new Date() : false;
  const canAccept = !isSender && proposal.status === 'sent' && !isExpired;

  const handleConfirmPayment = async () => {
    if (!onAccept) return;
    try {
      const result = await onAccept(proposal.id);
      if (result.saleId) {
        // For single-store proposals (backward compatibility)
        setSalesData([{
          saleId: result.saleId,
          storeId: 0, // Default storeId for single-store
          storeName: 'Loja',
          amount: proposal.total,
          receiptCid: result.receiptCid,
        }]);
        setShowSuccess(true);
      }
    } catch (error) {
      console.error('Payment failed:', error);
    }
  };

  const statusLabels: Record<string, string> = {
    draft: 'Rascunho',
    sent: 'Enviada',
    accepted: 'Aceita',
    expired: 'Expirada',
    paid: 'Paga',
    partially_paid: 'Pago Parcialmente',
    failed: 'Falhou',
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800',
    paid: 'bg-purple-100 text-purple-800',
    partially_paid: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
  };

  return (
    <div className="border rounded-lg p-4 bg-card space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Proposta de Venda</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[proposal.status]}`}>
          {statusLabels[proposal.status]}
        </span>
      </div>

      {/* Items */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Itens:</p>
        {proposal.items.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm">
            <span>
              {item.qty}x {item.name}
            </span>
            <span className="font-medium">{parseFloat(item.price).toFixed(2)} BZR</span>
          </div>
        ))}
      </div>

      {/* Shipping */}
      {proposal.shipping && (
        <div className="flex justify-between text-sm pt-2 border-t">
          <span className="text-muted-foreground">Frete ({proposal.shipping.method})</span>
          <span className="font-medium">{parseFloat(proposal.shipping.price).toFixed(2)} BZR</span>
        </div>
      )}

      {/* Total */}
      <div className="flex justify-between pt-2 border-t">
        <span className="font-semibold">Total</span>
        <span className="font-bold text-lg">{parseFloat(proposal.total).toFixed(2)} BZR</span>
      </div>

      {/* Commission */}
      <div className="text-xs text-muted-foreground">
        Comissão para promotores: {proposal.commissionPercent}%
      </div>

      {/* Expiration */}
      {proposal.expiresAt && (
        <div className="text-xs text-muted-foreground">
          {isExpired ? (
            <span className="text-red-600">Expirada</span>
          ) : (
            <span>Expira em {formatDistanceToNow(new Date(proposal.expiresAt))}</span>
          )}
        </div>
      )}

      {/* Actions */}
      {canAccept && onAccept && (
        <>
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={isLoading}
            className="w-full mt-3"
          >
            {isLoading ? 'Processando...' : 'Aceitar Proposta'}
          </Button>

          <CheckoutConfirmDialog
            open={showConfirm}
            onOpenChange={setShowConfirm}
            proposal={proposal}
            onConfirm={handleConfirmPayment}
            sellerHandle={sellerHandle}
          />

          {salesData.length > 0 && (
            <PaymentSuccessDialog
              open={showSuccess}
              onOpenChange={setShowSuccess}
              sales={salesData}
              isMultiStore={false}
            />
          )}
        </>
      )}

      {isSender && proposal.status === 'sent' && (
        <p className="text-xs text-center text-muted-foreground mt-3">
          Aguardando aceitação do comprador
        </p>
      )}
    </div>
  );
}
