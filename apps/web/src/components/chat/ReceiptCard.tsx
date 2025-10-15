import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Receipt, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChatSale } from '@bazari/shared-types';

interface ReceiptCardProps {
  sale: ChatSale;
  buyerHandle?: string;
  sellerHandle?: string;
}

export function ReceiptCard({ sale, buyerHandle, sellerHandle }: ReceiptCardProps) {
  const amount = parseFloat(sale.amount);

  return (
    <Card className="max-w-md">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="rounded-full bg-primary/10 p-2 flex-shrink-0">
            <Receipt className="h-5 w-5 text-primary" />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Recibo de Venda</h4>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                sale.status === 'split'
                  ? 'bg-green-100 text-green-800'
                  : sale.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {sale.status === 'split' ? 'Pago' : sale.status === 'pending' ? 'Pendente' : 'Falhou'}
              </span>
            </div>

            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID:</span>
                <span className="font-mono">#{sale.id.slice(0, 8)}</span>
              </div>
              {buyerHandle && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Comprador:</span>
                  <span>@{buyerHandle}</span>
                </div>
              )}
              {sellerHandle && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendedor:</span>
                  <span>@{sellerHandle}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t">
                <span className="font-medium">Valor:</span>
                <span className="font-bold text-primary">R$ {amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <Link to={`/app/chat/sales/${sale.id}`}>
                  Ver Detalhes
                </Link>
              </Button>
              {sale.receiptNftCid && (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/app/receipts/${sale.receiptNftCid}`}>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
