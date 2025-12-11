/**
 * Cashback Preview Component
 *
 * Mostra preview do cashback que será ganho no checkout
 */

import { useTranslation } from 'react-i18next';
import { Coins, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { PluginWidgetProps } from '../PluginRenderer';

interface CashbackConfig {
  cashbackPercent?: number;
  maxCashback?: number;
  creditDelay?: number;
}

interface CashbackPreviewProps extends PluginWidgetProps {
  context?: {
    cartTotal?: number; // em planck (12 decimais)
  };
}

export function CashbackPreview({
  config,
  branding,
  context,
}: CashbackPreviewProps) {
  const { t } = useTranslation();
  const cashbackConfig = config as CashbackConfig;

  const cartTotal = context?.cartTotal ?? 0;
  const cashbackPercent = cashbackConfig.cashbackPercent ?? 5;
  const creditDelay = cashbackConfig.creditDelay ?? 7;

  // Calcular cashback
  let cashbackAmount = (cartTotal * cashbackPercent) / 100;

  // Aplicar limite máximo se configurado
  if (cashbackConfig.maxCashback) {
    const maxInPlanck = cashbackConfig.maxCashback * 1e12;
    cashbackAmount = Math.min(cashbackAmount, maxInPlanck);
  }

  // Converter para BZR (formato legível)
  const cashbackBZR = cashbackAmount / 1e12;
  const formattedCashback = cashbackBZR.toFixed(2);

  // Se não há contexto de checkout, renderiza versão simples
  if (!context?.cartTotal) {
    return (
      <div
        className="flex items-center gap-2 p-2 rounded-lg text-sm"
        style={{
          backgroundColor: branding?.primaryColor
            ? `${branding.primaryColor}15`
            : '#10b98115',
          color: branding?.primaryColor || '#10b981',
        }}
      >
        <Coins className="h-4 w-4" />
        <span>
          {t('plugins.cashback.earn', 'Ganhe')} {cashbackPercent}%{' '}
          {t('plugins.cashback.back', 'de volta')}
        </span>
      </div>
    );
  }

  const primaryColor = branding?.primaryColor || '#10b981';

  return (
    <Card
      className="border-2"
      style={{ borderColor: `${primaryColor}40` }}
    >
      <CardContent
        className="p-4"
        style={{ backgroundColor: `${primaryColor}10` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-full"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <Coins className="h-5 w-5" style={{ color: primaryColor }} />
          </div>

          <div className="flex-1">
            <div className="font-medium" style={{ color: primaryColor }}>
              {t('plugins.cashback.willEarn', 'Você vai ganhar')}{' '}
              <strong>{formattedCashback} BZR</strong>{' '}
              {t('plugins.cashback.back', 'de volta')}!
            </div>
            <div className="text-sm opacity-80" style={{ color: primaryColor }}>
              {creditDelay === 0
                ? t('plugins.cashback.immediately', 'Creditado imediatamente')
                : t('plugins.cashback.creditedIn', {
                    days: creditDelay,
                    defaultValue: `Creditado em ${creditDelay} dias após a entrega`,
                  })}
            </div>
          </div>

          <ArrowRight className="h-5 w-5" style={{ color: primaryColor }} />
        </div>

        {/* Info adicional */}
        {cashbackConfig.maxCashback && cashbackBZR >= cashbackConfig.maxCashback && (
          <div
            className="mt-2 pt-2 border-t text-xs opacity-70"
            style={{
              borderColor: `${primaryColor}30`,
              color: primaryColor,
            }}
          >
            {t('plugins.cashback.maxReached', {
              max: cashbackConfig.maxCashback,
              defaultValue: `Máximo de ${cashbackConfig.maxCashback} BZR atingido`,
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CashbackPreview;
