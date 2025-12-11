/**
 * Coupon Banner Component
 *
 * Exibe banner de cupons disponíveis na loja
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tag, Copy, Check } from 'lucide-react';
import type { PluginWidgetProps } from '../PluginRenderer';

interface Coupon {
  code: string;
  discount: number;
  discountType: 'percent' | 'fixed';
  minPurchase?: number;
  expiresAt?: string;
  description?: string;
}

interface CouponConfig {
  activeCoupons?: Coupon[];
  bannerText?: string;
  showOnStorePage?: boolean;
}

export function CouponBanner({
  config,
  branding,
  position,
}: PluginWidgetProps) {
  const { t } = useTranslation();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const couponConfig = config as CouponConfig;
  const coupons = couponConfig.activeCoupons || [];

  // Não mostrar se não houver cupons ativos
  if (coupons.length === 0) {
    return null;
  }

  // Verificar se deve mostrar na página
  if (position === 'storePage' && couponConfig.showOnStorePage === false) {
    return null;
  }

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const primaryColor = branding?.primaryColor || '#f59e0b'; // amber padrão

  // Versão compacta - apenas primeiro cupom
  if (position === 'productCard' && coupons.length > 0) {
    const coupon = coupons[0];
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
        style={{ backgroundColor: primaryColor }}
      >
        <Tag className="w-3 h-3" />
        {coupon.discountType === 'percent'
          ? `${coupon.discount}% OFF`
          : `${coupon.discount} BZR OFF`}
      </span>
    );
  }

  // Versão completa - banner expansível
  return (
    <div
      className="coupon-banner rounded-lg overflow-hidden border"
      style={{ borderColor: primaryColor }}
    >
      {/* Header clicável */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-left"
        style={{ backgroundColor: `${primaryColor}15` }}
      >
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5" style={{ color: primaryColor }} />
          <span className="font-semibold" style={{ color: primaryColor }}>
            {couponConfig.bannerText ||
              t('plugins.coupons.available', '🎉 Cupons disponíveis!')}
          </span>
          <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold" style={{ color: primaryColor }}>
            {coupons.length}
          </span>
        </div>
        <span className="text-sm text-gray-500">
          {isExpanded ? '▲' : '▼'}
        </span>
      </button>

      {/* Lista de cupons */}
      {isExpanded && (
        <div className="p-3 space-y-2 bg-white">
          {coupons.map((coupon, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="font-mono font-bold px-2 py-1 rounded"
                    style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                  >
                    {coupon.code}
                  </span>
                  <span className="font-semibold">
                    {coupon.discountType === 'percent'
                      ? `${coupon.discount}% OFF`
                      : `${coupon.discount} BZR OFF`}
                  </span>
                </div>
                {coupon.description && (
                  <p className="text-xs text-gray-500 mt-1">{coupon.description}</p>
                )}
                {coupon.minPurchase && (
                  <p className="text-xs text-gray-400">
                    {t('plugins.coupons.minPurchase', 'Compra mínima')}: {coupon.minPurchase} BZR
                  </p>
                )}
              </div>

              <button
                onClick={() => handleCopy(coupon.code)}
                className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                title={t('plugins.coupons.copy', 'Copiar código')}
              >
                {copiedCode === coupon.code ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-500" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CouponBanner;
