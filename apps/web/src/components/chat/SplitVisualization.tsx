import { Store, Handshake, Zap } from 'lucide-react';

interface SplitVisualizationProps {
  total: number;
  sellerAmount: number;
  commissionAmount: number;
  bazariFee: number;
}

export function SplitVisualization({
  total,
  sellerAmount,
  commissionAmount,
  bazariFee,
}: SplitVisualizationProps) {
  const sellerPercent = (sellerAmount / total) * 100;
  const commissionPercent = (commissionAmount / total) * 100;
  const bazariPercent = (bazariFee / total) * 100;

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Distribuição do Pagamento</div>

      {/* Breakdown Cards */}
      <div className="space-y-2">
        {/* Vendedor */}
        <div className="flex justify-between items-center p-3 rounded-lg bg-green-50 dark:bg-green-950">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Vendedor</span>
          </div>
          <div className="text-right">
            <div className="font-semibold text-green-700 dark:text-green-400">
              R$ {sellerAmount.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              {sellerPercent.toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Promotor */}
        {commissionAmount > 0 && (
          <div className="flex justify-between items-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
            <div className="flex items-center gap-2">
              <Handshake className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Promotor</span>
            </div>
            <div className="text-right">
              <div className="font-semibold text-blue-700 dark:text-blue-400">
                R$ {commissionAmount.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">
                {commissionPercent.toFixed(0)}%
              </div>
            </div>
          </div>
        )}

        {/* Taxa Bazari */}
        <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium">Taxa Bazari</span>
          </div>
          <div className="text-right">
            <div className="font-semibold text-gray-700 dark:text-gray-400">
              R$ {bazariFee.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              {bazariPercent.toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Barra Visual */}
      <div className="h-3 flex rounded-full overflow-hidden">
        <div
          className="bg-green-500"
          style={{ width: `${sellerPercent}%` }}
          title={`Vendedor: ${sellerPercent.toFixed(0)}%`}
        />
        {commissionAmount > 0 && (
          <div
            className="bg-blue-500"
            style={{ width: `${commissionPercent}%` }}
            title={`Promotor: ${commissionPercent.toFixed(0)}%`}
          />
        )}
        <div
          className="bg-gray-400"
          style={{ width: `${bazariPercent}%` }}
          title={`Bazari: ${bazariPercent.toFixed(0)}%`}
        />
      </div>

      {/* Total */}
      <div className="flex justify-between items-center pt-2 border-t">
        <span className="text-sm font-medium">Total</span>
        <span className="font-bold text-lg">R$ {total.toFixed(2)}</span>
      </div>
    </div>
  );
}
