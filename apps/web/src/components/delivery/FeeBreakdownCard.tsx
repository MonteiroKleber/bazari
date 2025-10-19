import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { DeliveryFeeResult } from '@/types/delivery';

interface FeeBreakdownCardProps {
  feeResult: DeliveryFeeResult;
}

export function FeeBreakdownCard({ feeResult }: FeeBreakdownCardProps) {
  return (
    <Card className="bg-primary/5 border-primary">
      <CardContent className="pt-6">
        {/* Header - Total */}
        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground">Valor da Entrega</p>
          <p className="text-4xl font-bold text-primary">{feeResult.totalBzr} BZR</p>
          <p className="text-sm text-muted-foreground mt-1">
            📍 {feeResult.distance}km | ⏱️ ~{feeResult.estimatedTime}min
          </p>
        </div>

        <Separator className="my-4" />

        {/* Breakdown */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Taxa base</span>
            <span className="font-medium">{feeResult.breakdown.baseFee} BZR</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Distância ({feeResult.distance}km)
            </span>
            <span className="font-medium">{feeResult.breakdown.distanceFee} BZR</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tipo de pacote</span>
            <span className="font-medium">{feeResult.breakdown.packageTypeFee} BZR</span>
          </div>
          {feeResult.breakdown.weightFee !== '0.00' && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Peso adicional</span>
              <span className="font-medium">{feeResult.breakdown.weightFee} BZR</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
