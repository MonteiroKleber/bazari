/**
 * Loyalty Widget Component
 *
 * Exibe pontos de fidelidade do usuário na loja
 */

import { useTranslation } from 'react-i18next';
import { Star, Gift, TrendingUp } from 'lucide-react';
import { useMyLoyaltyPoints, type PluginWidgetProps } from '../PluginRenderer';

interface LoyaltyConfig {
  pointsPerBzr?: number;
  tiers?: Record<string, number>;
  redemptionRules?: Array<{
    points: number;
    reward: string;
    description?: string;
  }>;
}

// Cores dos tiers
const TIER_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  bronze: { bg: 'bg-amber-100', text: 'text-amber-800', icon: '🥉' },
  silver: { bg: 'bg-gray-100', text: 'text-gray-700', icon: '🥈' },
  gold: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '🥇' },
  platinum: { bg: 'bg-purple-100', text: 'text-purple-800', icon: '💎' },
};

export function LoyaltyWidget({
  storeId,
  config,
  branding,
}: PluginWidgetProps) {
  const { t } = useTranslation();
  const { data: loyalty, isLoading } = useMyLoyaltyPoints(storeId);

  // Plugin não está habilitado na loja
  if (!loyalty?.enabled) {
    return null;
  }

  const loyaltyConfig = config as LoyaltyConfig;
  const tierInfo = TIER_COLORS[loyalty.tier || 'bronze'] || TIER_COLORS.bronze;

  // Estilo customizado baseado no branding
  const customStyle = branding?.primaryColor
    ? { '--loyalty-primary': branding.primaryColor } as React.CSSProperties
    : {};

  if (isLoading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-lg p-4 h-24" />
    );
  }

  return (
    <div
      className="loyalty-widget bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-100"
      style={customStyle}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-purple-600" />
          <span className="font-semibold text-gray-800">
            {loyalty.pluginName || t('plugins.loyalty.title', 'Programa de Fidelidade')}
          </span>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${tierInfo.bg} ${tierInfo.text}`}>
          {tierInfo.icon} {loyalty.tier?.toUpperCase()}
        </span>
      </div>

      {/* Points Display */}
      <div className="flex items-end gap-4 mb-3">
        <div>
          <p className="text-3xl font-bold text-purple-700">
            {(loyalty.points || 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">
            {t('plugins.loyalty.points', 'pontos')}
          </p>
        </div>

        {loyalty.totalEarned && loyalty.totalEarned > 0 && (
          <div className="flex items-center gap-1 text-sm text-green-600">
            <TrendingUp className="w-4 h-4" />
            <span>
              {loyalty.totalEarned.toLocaleString()} {t('plugins.loyalty.total', 'total')}
            </span>
          </div>
        )}
      </div>

      {/* Points per BZR info */}
      {loyaltyConfig.pointsPerBzr && (
        <p className="text-xs text-gray-500 mb-3">
          {t('plugins.loyalty.earn', 'Ganhe')} {loyaltyConfig.pointsPerBzr}{' '}
          {t('plugins.loyalty.perBzr', 'ponto(s) por BZR gasto')}
        </p>
      )}

      {/* Redemption Rules Preview */}
      {loyalty.config?.redemptionRules && loyalty.config.redemptionRules.length > 0 && (
        <div className="mt-3 pt-3 border-t border-purple-100">
          <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
            <Gift className="w-3 h-3" />
            {t('plugins.loyalty.rewards', 'Recompensas disponíveis')}:
          </p>
          <div className="flex flex-wrap gap-2">
            {loyalty.config.redemptionRules.slice(0, 3).map((rule: { points: number; reward: string }, idx: number) => (
              <span
                key={idx}
                className={`text-xs px-2 py-1 rounded ${
                  (loyalty.points || 0) >= rule.points
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {rule.points} pts → {rule.reward}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default LoyaltyWidget;
