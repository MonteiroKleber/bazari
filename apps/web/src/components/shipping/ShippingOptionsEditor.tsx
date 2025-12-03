// PROPOSAL-002: Multiple Shipping Options Editor
// Component for managing multiple shipping options per product

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, GripVertical, Edit, Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShippingOptionModal } from './ShippingOptionModal';

export interface ShippingOption {
  id?: string;
  method: string;
  label?: string;
  pricingType: 'FIXED' | 'FREE' | 'FREE_ABOVE' | 'TO_ARRANGE';
  priceBzr?: string;
  freeAboveBzr?: string;
  estimatedDeliveryDays: number;
  pickupAddressType?: 'STORE' | 'CUSTOM';
  pickupAddress?: {
    street: string;
    number?: string;
    city: string;
    state: string;
    zipCode: string;
    instructions?: string;
  };
  isDefault: boolean;
  sortOrder?: number;
}

interface ShippingOptionsEditorProps {
  options: ShippingOption[];
  onChange: (options: ShippingOption[]) => void;
  storePickupAddress?: any; // Endereço da loja para retirada
}

export function ShippingOptionsEditor({
  options,
  onChange,
  storePickupAddress,
}: ShippingOptionsEditorProps) {
  const { t } = useTranslation();
  const [editingOption, setEditingOption] = useState<ShippingOption | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddOption = () => {
    setEditingOption(null);
    setEditingIndex(null);
    setIsModalOpen(true);
  };

  const handleEditOption = (option: ShippingOption, index: number) => {
    setEditingOption(option);
    setEditingIndex(index);
    setIsModalOpen(true);
  };

  const handleSaveOption = (option: ShippingOption) => {
    const newOptions = [...options];

    // Se é default, desmarcar outras
    if (option.isDefault) {
      newOptions.forEach(opt => opt.isDefault = false);
    }

    if (editingIndex !== null) {
      // Editando existente
      newOptions[editingIndex] = option;
    } else {
      // Adicionando nova
      option.sortOrder = newOptions.length;
      // Se é a primeira opção, marcar como default
      if (newOptions.length === 0) {
        option.isDefault = true;
      }
      newOptions.push(option);
    }

    onChange(newOptions);
    setIsModalOpen(false);
    setEditingOption(null);
    setEditingIndex(null);
  };

  const handleDeleteOption = (index: number) => {
    if (options.length <= 1) {
      return; // Manter pelo menos uma opção
    }

    const newOptions = [...options];
    const wasDefault = newOptions[index].isDefault;
    newOptions.splice(index, 1);

    // Se era default, definir a primeira como default
    if (wasDefault && newOptions.length > 0) {
      newOptions[0].isDefault = true;
    }

    onChange(newOptions);
  };

  const handleSetDefault = (index: number) => {
    const newOptions = options.map((opt, i) => ({
      ...opt,
      isDefault: i === index,
    }));
    onChange(newOptions);
  };

  const formatPrice = (option: ShippingOption): string => {
    switch (option.pricingType) {
      case 'FREE':
        return t('shippingOptions.pricing.free');
      case 'FREE_ABOVE':
        return `${t('shippingOptions.pricing.freeAbove')} ${option.freeAboveBzr} BZR`;
      case 'TO_ARRANGE':
        return t('shippingOptions.pricing.toArrange');
      case 'FIXED':
      default:
        return `${option.priceBzr || '0'} BZR`;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{t('shippingOptions.title')}</h3>
        {options.length < 10 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddOption}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('shippingOptions.add')}
          </Button>
        )}
      </div>

      {options.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              {t('shippingOptions.empty', { defaultValue: 'Nenhuma opção de envio configurada' })}
            </p>
            <Button type="button" variant="outline" onClick={handleAddOption}>
              <Plus className="w-4 h-4 mr-2" />
              {t('shippingOptions.addFirst', { defaultValue: 'Adicionar primeira opção' })}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {options.map((option, index) => (
            <Card key={option.id || index} className={option.isDefault ? 'border-primary' : ''}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  {/* Drag handle (visual only for now) */}
                  <div className="text-muted-foreground cursor-move">
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Option info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {option.label || t(`shipping.methods.${option.method}`)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {t(`shipping.methods.${option.method}`)}
                      </Badge>
                      {option.isDefault && (
                        <Badge variant="default" className="text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          {t('shippingOptions.isDefault')}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 flex items-center gap-4">
                      <span>{formatPrice(option)}</span>
                      <span>•</span>
                      <span>
                        {option.estimatedDeliveryDays} {t('shippingOptions.delivery.days')}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {!option.isDefault && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSetDefault(index)}
                        title={t('shippingOptions.setDefault')}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditOption(option, index)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {options.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteOption(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal for add/edit */}
      <ShippingOptionModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        option={editingOption}
        onSave={handleSaveOption}
        storePickupAddress={storePickupAddress}
      />
    </div>
  );
}
