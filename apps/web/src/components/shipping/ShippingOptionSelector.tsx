// PROPOSAL-002: Shipping Option Selector for Checkout
// Component for buyer to select a shipping option

import { useTranslation } from 'react-i18next';
import { Truck, Clock, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { ShippingOption } from './ShippingOptionsEditor';

interface ShippingOptionSelectorProps {
  options: ShippingOption[];
  selectedOptionId?: string;
  onSelect: (option: ShippingOption) => void;
  cartSubtotal?: number; // Para calcular frete grátis condicional
}

export function ShippingOptionSelector({
  options,
  selectedOptionId,
  onSelect,
  cartSubtotal = 0,
}: ShippingOptionSelectorProps) {
  const { t } = useTranslation();

  const calculatePrice = (option: ShippingOption): { price: number; isFree: boolean; freeReason?: string } => {
    switch (option.pricingType) {
      case 'FREE':
        return { price: 0, isFree: true, freeReason: 'always' };

      case 'FREE_ABOVE': {
        const threshold = parseFloat(option.freeAboveBzr || '0');
        if (cartSubtotal >= threshold) {
          return { price: 0, isFree: true, freeReason: 'threshold' };
        }
        return { price: parseFloat(option.priceBzr || '0'), isFree: false };
      }

      case 'TO_ARRANGE':
        return { price: 0, isFree: false, freeReason: 'arrange' };

      case 'FIXED':
      default:
        return { price: parseFloat(option.priceBzr || '0'), isFree: false };
    }
  };

  const formatPrice = (option: ShippingOption): React.ReactNode => {
    const { price, isFree, freeReason } = calculatePrice(option);

    if (freeReason === 'arrange') {
      return (
        <span className="text-muted-foreground">
          {t('shippingOptions.pricing.toArrange')}
        </span>
      );
    }

    if (isFree) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          {t('shippingOptions.pricing.free')}
        </Badge>
      );
    }

    return <span className="font-semibold">{price.toFixed(2)} BZR</span>;
  };

  // Achar o default se nenhum selecionado
  const defaultOption = options.find(o => o.isDefault) || options[0];
  const effectiveSelectedId = selectedOptionId || defaultOption?.id;

  if (options.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4 text-center text-muted-foreground">
          {t('shippingOptions.checkout.noOptions', { defaultValue: 'Nenhuma opção de envio disponível' })}
        </CardContent>
      </Card>
    );
  }

  // Se só tem uma opção, mostrar de forma simplificada
  if (options.length === 1) {
    const option = options[0];

    return (
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Truck className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">
                  {option.label || t(`shipping.methods.${option.method}`)}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {option.estimatedDeliveryDays} {t('shippingOptions.delivery.days')}
                </p>
              </div>
            </div>
            {formatPrice(option)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-base font-semibold">
        {t('shippingOptions.checkout.choose')}
      </Label>

      <RadioGroup
        value={effectiveSelectedId}
        onValueChange={(value) => {
          const option = options.find(o => o.id === value);
          if (option) onSelect(option);
        }}
        className="space-y-2"
      >
        {options.map((option) => {
          const { isFree } = calculatePrice(option);
          const isSelected = option.id === effectiveSelectedId;
          const optionId = option.id || `option-${option.method}`;

          return (
            <div
              key={optionId}
              onClick={() => onSelect(option)}
              className={`
                flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
              `}
            >
              <RadioGroupItem value={optionId} id={optionId} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">
                    {option.label || t(`shipping.methods.${option.method}`)}
                  </span>
                  {option.isDefault && (
                    <Badge variant="outline" className="text-xs">
                      {t('shippingOptions.recommended', { defaultValue: 'Recomendado' })}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {option.estimatedDeliveryDays} {t('shippingOptions.delivery.days')}
                  </span>

                  {option.method === 'RETIRADA' && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {t('shippingOptions.pickup.title')}
                    </span>
                  )}
                </div>

                {/* Mostrar info de frete grátis condicional */}
                {option.pricingType === 'FREE_ABOVE' && !isFree && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {t('shippingOptions.checkout.freeAboveHint', {
                      amount: option.freeAboveBzr,
                      defaultValue: `Grátis em compras acima de ${option.freeAboveBzr} BZR`,
                    })}
                  </p>
                )}
              </div>

              <div className="text-right">
                {formatPrice(option)}
              </div>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}
