import { Dialog, DialogContent, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Check, Store, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SaleInfo {
  saleId: string;
  storeId: number;
  storeName: string;
  amount: string;
  receiptCid?: string;
}

interface PaymentSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sales: SaleInfo[];
  isMultiStore?: boolean;
}

export function PaymentSuccessDialog({
  open,
  onOpenChange,
  sales,
  isMultiStore = false,
}: PaymentSuccessDialogProps) {
  // Backward compatibility: support single sale
  const isSingleSale = sales.length === 1;
  const totalAmount = sales.reduce((sum, sale) => sum + parseFloat(sale.amount), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isSingleSale ? "sm:max-w-md" : "sm:max-w-2xl max-h-[80vh] overflow-y-auto"}>
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          {/* Success Icon */}
          <div className="rounded-full bg-green-100 p-3">
            <Check className="h-8 w-8 text-green-600" />
          </div>

          {/* Title */}
          <div>
            <h3 className="text-xl font-semibold">Pagamento Confirmado!</h3>
            <p className="text-muted-foreground mt-1">
              {isMultiStore || !isSingleSale
                ? `Dividido entre ${sales.length} lojas`
                : 'Compra realizada com sucesso'}
            </p>
          </div>

          {/* Single Sale Layout (Backward Compatible) */}
          {isSingleSale && (
            <div className="w-full space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID da Venda:</span>
                <span className="font-mono">#{sales[0].saleId.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor Pago:</span>
                <span className="font-bold">R$ {parseFloat(sales[0].amount).toFixed(2)} BZR</span>
              </div>
              {sales[0].receiptCid && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Recibo NFT:</span>
                  <Button variant="link" size="sm" asChild className="h-auto p-0">
                    <Link to={`/app/receipts/${sales[0].receiptCid}`}>
                      Ver Recibo
                    </Link>
                  </Button>
                </div>
              )}

              {/* View Sale Details */}
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link to={`/app/chat/sales/${sales[0].saleId}`}>
                  Ver Detalhes da Venda
                </Link>
              </Button>
            </div>
          )}

          {/* Multi-Sale Layout */}
          {!isSingleSale && (
            <div className="w-full space-y-4">
              {/* Total Amount Summary */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Total Pago</div>
                <div className="text-2xl font-bold text-primary">
                  R$ {totalAmount.toFixed(2)} BZR
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {sales.length} transações realizadas
                </div>
              </div>

              {/* Individual Store Cards */}
              <div className="space-y-3">
                {sales.map((sale) => (
                  <Card key={sale.saleId} className="text-left">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        {sale.storeName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ID da Venda:</span>
                        <span className="font-mono">#{sale.saleId.slice(0, 8)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor:</span>
                        <span className="font-bold">R$ {parseFloat(sale.amount).toFixed(2)} BZR</span>
                      </div>

                      {/* Receipt Link */}
                      {sale.receiptCid && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          asChild
                        >
                          <Link to={`/app/receipts/${sale.receiptCid}`}>
                            <ExternalLink className="h-3 w-3 mr-2" />
                            Ver Recibo NFT
                          </Link>
                        </Button>
                      )}

                      {/* Sale Details Link */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        asChild
                      >
                        <Link to={`/app/chat/sales/${sale.saleId}`}>
                          Ver Detalhes
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-center">
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
