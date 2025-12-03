// PROPOSAL-002: Shipping Option Modal
// Modal for adding/editing a shipping option

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ShippingOption } from './ShippingOptionsEditor';

const SHIPPING_METHODS = [
  'SEDEX',
  'PAC',
  'TRANSPORTADORA',
  'MINI_ENVIOS',
  'RETIRADA',
  'INTERNACIONAL',
  'OUTRO',
] as const;

interface ShippingOptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  option: ShippingOption | null;
  onSave: (option: ShippingOption) => void;
  storePickupAddress?: any;
}

export function ShippingOptionModal({
  open,
  onOpenChange,
  option,
  onSave,
  storePickupAddress,
}: ShippingOptionModalProps) {
  const { t } = useTranslation();
  const isEditing = option !== null;

  // Form state
  const [method, setMethod] = useState<string>('SEDEX');
  const [label, setLabel] = useState('');
  const [pricingType, setPricingType] = useState<'FIXED' | 'FREE' | 'FREE_ABOVE' | 'TO_ARRANGE'>('FIXED');
  const [priceBzr, setPriceBzr] = useState('');
  const [freeAboveBzr, setFreeAboveBzr] = useState('');
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState('7');
  const [pickupAddressType, setPickupAddressType] = useState<'STORE' | 'CUSTOM'>('STORE');
  const [pickupAddress, setPickupAddress] = useState({
    street: '',
    number: '',
    city: '',
    state: '',
    zipCode: '',
    instructions: '',
  });
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      if (option) {
        setMethod(option.method);
        setLabel(option.label || '');
        setPricingType(option.pricingType);
        setPriceBzr(option.priceBzr || '');
        setFreeAboveBzr(option.freeAboveBzr || '');
        setEstimatedDeliveryDays(String(option.estimatedDeliveryDays));
        setPickupAddressType(option.pickupAddressType || 'STORE');
        const addr = option.pickupAddress;
        setPickupAddress({
          street: addr?.street || '',
          number: addr?.number || '',
          city: addr?.city || '',
          state: addr?.state || '',
          zipCode: addr?.zipCode || '',
          instructions: addr?.instructions || '',
        });
        setIsDefault(option.isDefault);
      } else {
        // Reset to defaults
        setMethod('SEDEX');
        setLabel('');
        setPricingType('FIXED');
        setPriceBzr('');
        setFreeAboveBzr('');
        setEstimatedDeliveryDays('7');
        setPickupAddressType('STORE');
        setPickupAddress({
          street: '',
          number: '',
          city: '',
          state: '',
          zipCode: '',
          instructions: '',
        });
        setIsDefault(false);
      }
      setError(null);
    }
  }, [open, option]);

  const handleSubmit = () => {
    setError(null);

    // Validações
    if (pricingType === 'FIXED' && !priceBzr) {
      setError(t('shippingOptions.validation.priceRequired'));
      return;
    }

    if (pricingType === 'FREE_ABOVE' && (!priceBzr || !freeAboveBzr)) {
      setError(t('shippingOptions.validation.freeAboveRequired'));
      return;
    }

    if (method === 'RETIRADA' && pickupAddressType === 'STORE' && !storePickupAddress) {
      setError(t('shippingOptions.validation.pickupAddressRequired'));
      return;
    }

    if (method === 'RETIRADA' && pickupAddressType === 'CUSTOM' && !pickupAddress.street) {
      setError(t('shippingOptions.validation.pickupAddressRequired'));
      return;
    }

    const days = parseInt(estimatedDeliveryDays, 10);
    if (isNaN(days) || days < 1 || days > 90) {
      setError(t('shippingOptions.validation.invalidDays', { defaultValue: 'Prazo deve ser entre 1 e 90 dias' }));
      return;
    }

    const newOption: ShippingOption = {
      id: option?.id,
      method,
      label: label || undefined,
      pricingType,
      priceBzr: pricingType === 'FIXED' || pricingType === 'FREE_ABOVE' ? priceBzr : undefined,
      freeAboveBzr: pricingType === 'FREE_ABOVE' ? freeAboveBzr : undefined,
      estimatedDeliveryDays: days,
      pickupAddressType: method === 'RETIRADA' ? pickupAddressType : undefined,
      pickupAddress: method === 'RETIRADA' && pickupAddressType === 'CUSTOM' ? pickupAddress : undefined,
      isDefault,
      sortOrder: option?.sortOrder,
    };

    onSave(newOption);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('shippingOptions.edit') : t('shippingOptions.add')}
          </DialogTitle>
          <DialogDescription>
            {t('shippingOptions.modalDescription', { defaultValue: 'Configure os detalhes da opção de envio' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Método de envio */}
          <div className="space-y-2">
            <Label>{t('shippingOptions.method')} *</Label>
            <select
              className="w-full border rounded px-3 py-2"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              {SHIPPING_METHODS.map((m) => (
                <option key={m} value={m}>
                  {t(`shipping.methods.${m}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Nome personalizado */}
          <div className="space-y-2">
            <Label>{t('shippingOptions.customLabel')}</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('shippingOptions.customLabelHint')}
            />
            <p className="text-xs text-muted-foreground">
              {t('shippingOptions.customLabelHint')}
            </p>
          </div>

          {/* Tipo de preço */}
          <div className="space-y-3">
            <Label>{t('shippingOptions.pricing.title')} *</Label>
            <RadioGroup
              value={pricingType}
              onValueChange={(v) => setPricingType(v as typeof pricingType)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="FIXED" id="pricing-fixed" />
                <Label htmlFor="pricing-fixed" className="font-normal cursor-pointer">
                  {t('shippingOptions.pricing.fixed')}
                </Label>
                {pricingType === 'FIXED' && (
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-28 ml-2"
                    value={priceBzr}
                    onChange={(e) => setPriceBzr(e.target.value)}
                    placeholder="0.00"
                  />
                )}
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="FREE" id="pricing-free" />
                <Label htmlFor="pricing-free" className="font-normal cursor-pointer">
                  {t('shippingOptions.pricing.free')}
                </Label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="FREE_ABOVE" id="pricing-free-above" />
                  <Label htmlFor="pricing-free-above" className="font-normal cursor-pointer">
                    {t('shippingOptions.pricing.freeAbove')}
                  </Label>
                </div>
                {pricingType === 'FREE_ABOVE' && (
                  <div className="ml-6 grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">{t('shippingOptions.pricing.freeAbove')}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={freeAboveBzr}
                        onChange={(e) => setFreeAboveBzr(e.target.value)}
                        placeholder="100.00"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{t('shippingOptions.pricing.normalPrice')}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={priceBzr}
                        onChange={(e) => setPriceBzr(e.target.value)}
                        placeholder="15.00"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="TO_ARRANGE" id="pricing-arrange" />
                <Label htmlFor="pricing-arrange" className="font-normal cursor-pointer">
                  {t('shippingOptions.pricing.toArrange')}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Prazo de entrega */}
          <div className="space-y-2">
            <Label>{t('shipping.estimatedDeliveryDaysShort')} *</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="90"
                className="w-24"
                value={estimatedDeliveryDays}
                onChange={(e) => setEstimatedDeliveryDays(e.target.value)}
              />
              <span className="text-sm text-muted-foreground">
                {t('shippingOptions.delivery.days')}
              </span>
            </div>
          </div>

          {/* Endereço de retirada (apenas para RETIRADA) */}
          {method === 'RETIRADA' && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
              <Label>{t('shippingOptions.pickup.title')}</Label>
              <RadioGroup
                value={pickupAddressType}
                onValueChange={(v) => setPickupAddressType(v as 'STORE' | 'CUSTOM')}
              >
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="STORE" id="pickup-store" className="mt-1" />
                  <div>
                    <Label htmlFor="pickup-store" className="font-normal cursor-pointer">
                      {t('shippingOptions.pickup.useStore')}
                    </Label>
                    {storePickupAddress && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {storePickupAddress.street}, {storePickupAddress.number} - {storePickupAddress.city}/{storePickupAddress.state}
                      </p>
                    )}
                    {!storePickupAddress && (
                      <p className="text-xs text-destructive mt-1">
                        {t('shippingOptions.pickup.noStoreAddress', { defaultValue: 'Loja sem endereço configurado' })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="CUSTOM" id="pickup-custom" className="mt-1" />
                  <Label htmlFor="pickup-custom" className="font-normal cursor-pointer">
                    {t('shippingOptions.pickup.useCustom')}
                  </Label>
                </div>
              </RadioGroup>

              {pickupAddressType === 'CUSTOM' && (
                <div className="space-y-3 mt-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Label className="text-xs">{t('checkout.shipping.street')}</Label>
                      <Input
                        value={pickupAddress.street}
                        onChange={(e) => setPickupAddress({ ...pickupAddress, street: e.target.value })}
                        placeholder={t('checkout.shipping.streetPlaceholder')}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Nº</Label>
                      <Input
                        value={pickupAddress.number}
                        onChange={(e) => setPickupAddress({ ...pickupAddress, number: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">{t('checkout.shipping.city')}</Label>
                      <Input
                        value={pickupAddress.city}
                        onChange={(e) => setPickupAddress({ ...pickupAddress, city: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">{t('checkout.shipping.state')}</Label>
                        <Input
                          value={pickupAddress.state}
                          onChange={(e) => setPickupAddress({ ...pickupAddress, state: e.target.value })}
                          maxLength={2}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t('checkout.shipping.zipCode')}</Label>
                        <Input
                          value={pickupAddress.zipCode}
                          onChange={(e) => setPickupAddress({ ...pickupAddress, zipCode: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">{t('shippingOptions.pickup.instructions')}</Label>
                    <Textarea
                      value={pickupAddress.instructions}
                      onChange={(e) => setPickupAddress({ ...pickupAddress, instructions: e.target.value })}
                      rows={2}
                      placeholder={t('shippingOptions.pickup.instructionsHint', { defaultValue: 'Ex: Ao lado do mercado, prédio cinza' })}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Marcar como padrão */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is-default"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="is-default" className="font-normal cursor-pointer">
              {t('shippingOptions.setDefault')}
            </Label>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={handleSubmit}>
            {isEditing ? t('common.save') : t('shippingOptions.add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
