/**
 * Coupon Input Component
 *
 * Campo para aplicar cupom no checkout
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tag, Check, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import type { PluginWidgetProps } from '../PluginRenderer';

interface CouponInputProps extends PluginWidgetProps {
  context?: {
    cartTotal?: number;
    onApplyCoupon?: (coupon: { code: string; discount: number }) => void;
  };
}

export function CouponInput({
  storeId,
  branding,
  context,
}: CouponInputProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(
    null
  );

  // Se não há contexto de checkout, não renderiza
  if (!context?.onApplyCoupon) {
    return null;
  }

  const handleApply = async () => {
    if (!code.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.post<{
        valid: boolean;
        code: string;
        discount: number;
        discountType: string;
        error?: string;
      }>('/plugins/coupons/validate', {
        storeId,
        code: code.toUpperCase(),
        cartTotal: context.cartTotal,
      });

      if (!response.valid) {
        setError(response.error || t('plugins.coupons.invalid', 'Cupom inválido'));
        return;
      }

      setApplied({ code: response.code, discount: response.discount });
      context?.onApplyCoupon?.({ code: response.code, discount: response.discount });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao validar cupom';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setApplied(null);
    setCode('');
    context.onApplyCoupon?.({ code: '', discount: 0 });
  };

  const primaryColor = branding?.primaryColor || '#8b5cf6';

  if (applied) {
    return (
      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
          <Check className="h-4 w-4" />
          <span>
            {t('plugins.coupons.applied', 'Cupom')}{' '}
            <strong>{applied.code}</strong>{' '}
            {t('plugins.coupons.appliedSuffix', 'aplicado!')}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRemove}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          />
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t('plugins.coupons.placeholder', 'Código do cupom')}
            className="pl-9"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleApply();
              }
            }}
          />
        </div>
        <Button
          onClick={handleApply}
          disabled={loading || !code.trim()}
          style={{
            backgroundColor: !loading && code.trim() ? primaryColor : undefined,
          }}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            t('plugins.coupons.apply', 'Aplicar')
          )}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export default CouponInput;
