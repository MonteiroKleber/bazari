/**
 * Loyalty Redeem Box Component
 *
 * Caixa no checkout para usar pontos de fidelidade
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Gift, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PluginWidgetProps } from '../PluginRenderer';

interface Reward {
  points: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  description: string;
}

interface LoyaltyRedeemConfig {
  rewards?: Reward[];
  minRedeem?: number;
}

interface LoyaltyRedeemBoxProps extends PluginWidgetProps {
  context?: {
    userPoints?: number;
    cartTotal?: number;
    onApplyDiscount?: (discount: {
      type: string;
      value: number;
      pointsUsed: number;
    }) => void;
  };
}

export function LoyaltyRedeemBox({
  config,
  branding,
  context,
}: LoyaltyRedeemBoxProps) {
  const { t } = useTranslation();
  const [selectedReward, setSelectedReward] = useState<number | null>(null);
  const [applied, setApplied] = useState(false);

  const loyaltyConfig = config as LoyaltyRedeemConfig;
  const userPoints = context?.userPoints ?? 0;
  const rewards = loyaltyConfig.rewards ?? [];

  const availableRewards = rewards.filter((r) => r.points <= userPoints);

  // Se não há contexto de checkout, não renderiza
  if (!context?.onApplyDiscount) {
    return null;
  }

  // Sem pontos suficientes para qualquer recompensa
  if (availableRewards.length === 0) {
    return (
      <Card className="bg-muted/50">
        <CardContent className="p-4 text-center">
          <Gift className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {t('plugins.loyalty.notEnoughPoints', {
              points: userPoints,
              defaultValue: `Você tem ${userPoints} pontos. Continue comprando para ganhar recompensas!`,
            })}
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleApply = () => {
    if (selectedReward === null) return;

    const reward = rewards[selectedReward];
    context.onApplyDiscount?.({
      type: reward.discountType,
      value: reward.discountValue,
      pointsUsed: reward.points,
    });
    setApplied(true);
  };

  const primaryColor = branding?.primaryColor || '#8b5cf6';

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium flex items-center gap-2">
            <Gift className="h-4 w-4" style={{ color: primaryColor }} />
            {t('plugins.loyalty.usePoints', 'Usar pontos de fidelidade')}
          </span>
          <Badge
            variant="secondary"
            style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
          >
            {userPoints} pts
          </Badge>
        </div>

        {!applied ? (
          <>
            <div className="space-y-2">
              {availableRewards.map((reward, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedReward(idx)}
                  className={`w-full p-3 rounded-lg border text-left transition-colors ${
                    selectedReward === idx
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{reward.description}</span>
                    <span className="text-sm text-muted-foreground">
                      {reward.points} pts
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <Button
              onClick={handleApply}
              disabled={selectedReward === null}
              className="w-full"
              style={{
                backgroundColor: selectedReward !== null ? primaryColor : undefined,
              }}
            >
              <Gift className="h-4 w-4 mr-2" />
              {t('plugins.loyalty.applyReward', 'Aplicar Recompensa')}
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-2 text-green-600 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <Check className="h-5 w-5" />
            <span>{t('plugins.loyalty.applied', 'Desconto aplicado!')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default LoyaltyRedeemBox;
