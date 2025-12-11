/**
 * Cashback Badge Component
 *
 * Exibe badge de cashback em produtos/loja
 */

import { useTranslation } from 'react-i18next';
import { Percent, Clock } from 'lucide-react';
import type { PluginWidgetProps } from '../PluginRenderer';

interface CashbackConfig {
  cashbackPercent?: number;
  delayDays?: number;
  maxCashback?: number;
  minPurchase?: number;
}

export function CashbackBadge({
  config,
  branding,
  position,
}: PluginWidgetProps) {
  const { t } = useTranslation();
  const cashbackConfig = config as CashbackConfig;

  const percent = cashbackConfig.cashbackPercent || 2;
  const delayDays = cashbackConfig.delayDays || 7;

  // Estilo customizado
  const bgColor = branding?.primaryColor || '#10b981'; // verde padrão

  // Versão compacta para cards de produto
  if (position === 'productCard') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
        style={{ backgroundColor: bgColor }}
      >
        <Percent className="w-3 h-3" />
        {percent}% cashback
      </span>
    );
  }

  // Versão completa para página da loja
  return (
    <div
      className="cashback-badge rounded-lg p-3 text-white"
      style={{ backgroundColor: bgColor }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-white/20 rounded-full p-2">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-lg">{percent}% Cashback</p>
            <p className="text-sm opacity-90">
              {t('plugins.cashback.description', 'em todas as compras')}
            </p>
          </div>
        </div>

        <div className="text-right text-sm">
          <div className="flex items-center gap-1 opacity-75">
            <Clock className="w-3 h-3" />
            <span>
              {t('plugins.cashback.delay', 'Crédito em')} {delayDays}{' '}
              {t('plugins.cashback.days', 'dias')}
            </span>
          </div>
        </div>
      </div>

      {/* Info adicional */}
      {(cashbackConfig.minPurchase || cashbackConfig.maxCashback) && (
        <div className="mt-2 pt-2 border-t border-white/20 text-xs opacity-75">
          {cashbackConfig.minPurchase && (
            <span>
              {t('plugins.cashback.minPurchase', 'Compra mínima')}:{' '}
              {cashbackConfig.minPurchase} BZR
            </span>
          )}
          {cashbackConfig.minPurchase && cashbackConfig.maxCashback && ' | '}
          {cashbackConfig.maxCashback && (
            <span>
              {t('plugins.cashback.maxCashback', 'Máximo')}:{' '}
              {cashbackConfig.maxCashback} BZR
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default CashbackBadge;
