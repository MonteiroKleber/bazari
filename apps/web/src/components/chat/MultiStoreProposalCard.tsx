import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Store, Package, ShoppingBag, Clock } from 'lucide-react';
import { useState } from 'react';
import type { Proposal } from '@bazari/shared-types';
import { PaymentSuccessDialog } from './PaymentSuccessDialog';

interface MultiStoreProposalCardProps {
  proposal: Proposal;
  onAccept?: () => Promise<any>;
  isSender: boolean;
}

const STORE_COLORS = [
  'border-l-blue-500',
  'border-l-green-500',
  'border-l-purple-500',
  'border-l-orange-500',
  'border-l-pink-500',
];

export function MultiStoreProposalCard({ proposal, onAccept, isSender }: MultiStoreProposalCardProps) {
  const [accepting, setAccepting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [salesData, setSalesData] = useState<Array<{
    saleId: string;
    storeId: number;
    storeName: string;
    amount: string;
    receiptCid?: string;
  }>>([]);

  const storeGroups = proposal.storeGroups || [];
  const totalItems = proposal.items.length;
  const storeCount = storeGroups.length;
  const grandTotal = parseFloat(proposal.total);

  // Calculate time remaining
  const now = Date.now();
  const expiresAt = proposal.expiresAt ? new Date(proposal.expiresAt).getTime() : now + (48 * 60 * 60 * 1000); // Default to 48h from now
  const timeRemaining = expiresAt - now;
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const isExpired = timeRemaining <= 0;
  const isExpiringSoon = hoursRemaining < 24 && hoursRemaining > 0;

  const handleAccept = async () => {
    if (!onAccept || accepting) return;

    try {
      setAccepting(true);
      const result = await onAccept();

      // Handle multi-store checkout result
      if (result && result.isMultiStore && result.sales && result.sales.length > 0) {
        setSalesData(result.sales.map((sale: any) => ({
          saleId: sale.saleId,
          storeId: sale.storeId,
          storeName: sale.storeName,
          amount: sale.amount,
          receiptCid: sale.receiptNftCid,
        })));
        setShowSuccess(true);
      }
    } catch (error) {
      console.error('Failed to accept proposal:', error);
    } finally {
      setAccepting(false);
    }
  };

  const canAccept = proposal.status === 'sent' && !isSender && !isExpired;

  return (
    <Card className="max-w-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Proposta Multi-Loja
            </CardTitle>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Store className="h-4 w-4" />
              {storeCount} {storeCount === 1 ? 'loja' : 'lojas'} • {totalItems} {totalItems === 1 ? 'produto' : 'produtos'}
            </p>
          </div>

          {/* Status Badge */}
          <Badge
            variant={
              proposal.status === 'paid' ? 'default' :
              proposal.status === 'expired' ? 'destructive' :
              proposal.status === 'sent' ? 'secondary' :
              'outline'
            }
          >
            {proposal.status === 'paid' ? '✅ Pago' :
             proposal.status === 'expired' ? '⏰ Expirado' :
             proposal.status === 'sent' ? '📤 Enviado' :
             proposal.status}
          </Badge>
        </div>

        {/* Time Remaining */}
        {proposal.status === 'sent' && !isExpired && (
          <div className={`flex items-center gap-1 text-xs ${isExpiringSoon ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`}>
            <Clock className="h-3 w-3" />
            {isExpiringSoon ? (
              <span className="font-medium">Expira em {hoursRemaining}h</span>
            ) : (
              <span>Válido por {hoursRemaining}h</span>
            )}
          </div>
        )}
        {isExpired && proposal.status === 'sent' && (
          <div className="flex items-center gap-1 text-xs text-destructive">
            <Clock className="h-3 w-3" />
            <span className="font-medium">Proposta expirada</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4 pb-4">
        {/* Store Groups */}
        {storeGroups.map((group, index) => {
          const colorClass = STORE_COLORS[index % STORE_COLORS.length];

          return (
            <Card key={group.storeId} className={`border-l-4 ${colorClass} bg-muted/30`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{group.storeName}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {group.commissionPercent}% comissão
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-2 py-0 pb-3">
                {group.items.map((item, itemIndex) => {
                  const itemTotal = parseFloat(item.price) * item.qty;

                  return (
                    <div key={itemIndex} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Package className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{item.qty}x</span>
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">
                        R$ {itemTotal.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </CardContent>

              <CardFooter className="pt-3 border-t bg-muted/50">
                <div className="w-full flex justify-between items-center text-sm">
                  <span className="font-medium text-muted-foreground">Subtotal:</span>
                  <span className="font-bold text-base">
                    R$ {group.total.toFixed(2)}
                  </span>
                </div>
              </CardFooter>
            </Card>
          );
        })}

        <Separator className="my-4" />

        {/* Grand Total */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-lg font-semibold">Total Geral</p>
              <p className="text-xs text-muted-foreground">
                Dividido entre {storeCount} {storeCount === 1 ? 'loja' : 'lojas'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">
                R$ {grandTotal.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Info for sender */}
        {isSender && proposal.status === 'sent' && (
          <div className="text-xs text-muted-foreground text-center py-2">
            💡 Aguardando o comprador aceitar a proposta
          </div>
        )}

        {/* Info for receiver */}
        {!isSender && proposal.status === 'sent' && !isExpired && (
          <div className="text-xs text-muted-foreground text-center py-2 space-y-1">
            <div>ℹ️ Ao aceitar, {storeCount} {storeCount === 1 ? 'venda será processada' : 'vendas serão processadas'}</div>
            <div>Cada loja receberá seu pagamento separadamente</div>
          </div>
        )}
      </CardContent>

      {/* Accept Button */}
      {canAccept && (
        <CardFooter className="pt-4 border-t">
          <Button
            className="w-full"
            size="lg"
            onClick={handleAccept}
            disabled={accepting}
          >
            {accepting ? 'Processando...' : `Aceitar Proposta - R$ ${grandTotal.toFixed(2)}`}
          </Button>
        </CardFooter>
      )}

      {/* Status Messages */}
      {proposal.status === 'paid' && (
        <CardFooter className="pt-4 border-t bg-green-50 dark:bg-green-950">
          <div className="w-full text-center text-sm text-green-700 dark:text-green-300">
            ✅ Proposta aceita e paga com sucesso!
          </div>
        </CardFooter>
      )}

      {isExpired && proposal.status === 'sent' && (
        <CardFooter className="pt-4 border-t bg-destructive/10">
          <div className="w-full text-center text-sm text-destructive">
            ⏰ Esta proposta expirou e não pode mais ser aceita
          </div>
        </CardFooter>
      )}

      {/* Payment Success Dialog */}
      {salesData.length > 0 && (
        <PaymentSuccessDialog
          open={showSuccess}
          onOpenChange={setShowSuccess}
          sales={salesData}
          isMultiStore={true}
        />
      )}
    </Card>
  );
}
