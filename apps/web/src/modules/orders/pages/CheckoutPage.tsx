// path: apps/web/src/modules/orders/pages/CheckoutPage.tsx
// PROPOSAL-003: Multi-Store Checkout Support

import { useCallback, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package, CreditCard, MapPin, Truck, Clock, Store, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ShippingOptionSelector, type ShippingOption } from '@/components/shipping';
import {
  useCart,
  selectStoreCount,
  selectItemsByStore,
  type CartStoreGroup
} from '@/modules/cart/cart.store';
import { ordersApi, type StoreOrderData, type CreateMultiOrderResponse } from '../api';
import { apiHelpers } from '@/lib/api';
import { BZR } from '@/utils/bzr';

const shippingSchema = z.object({
  street: z.string().min(1, 'Endereço é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().min(2, 'Estado é obrigatório'),
  zipCode: z.string().min(5, 'CEP é obrigatório'),
  country: z.string().min(1, 'País é obrigatório'),
});

type ShippingForm = z.infer<typeof shippingSchema>;

export function CheckoutPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const items = useCart(state => state.items);
  const clear = useCart(state => state.clear);

  // Derivar valores computados usando seletores
  const state = { items } as any;
  const storeCount = selectStoreCount(state);
  const itemsByStore = selectItemsByStore(state);

  const [resolvedPrices, setResolvedPrices] = useState<Record<string, string>>({});

  // PROPOSAL-003: Detectar se é multi-store checkout
  const isMultiStore = storeCount > 1;

  // Shipping info per item (PROPOSAL-000)
  const [shippingInfo, setShippingInfo] = useState<Record<string, {
    estimatedDeliveryDays?: number;
    shippingMethod?: string;
  }>>({});

  // PROPOSAL-002: Shipping options per item
  const [shippingOptionsPerItem, setShippingOptionsPerItem] = useState<Record<string, ShippingOption[]>>({});
  const [selectedShippingOptions, setSelectedShippingOptions] = useState<Record<string, ShippingOption>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<ShippingForm>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      country: 'BR',
    },
  });

  // Formata valores em BZR (decimais) com 2 casas, consistente com PriceBzr
  const formatBzr = useCallback((value: string) => {
    const locale = BZR.normalizeLocale(i18n.language);
    return BZR.formatDecimal(value, locale, true);
  }, [i18n.language]);

  const parseDec = useCallback((v: string) => {
    const n = Number(String(v ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }, []);

  // Resolve unit prices and shipping info for items
  const ensurePrices = useCallback(async () => {
    const priceUpdates: Record<string, string> = {};
    const shipUpdates: Record<string, { estimatedDeliveryDays?: number; shippingMethod?: string }> = {};
    const optionsUpdates: Record<string, ShippingOption[]> = {};
    const defaultSelections: Record<string, ShippingOption> = {};

    for (const it of items) {
      const current = parseDec(String(it.priceBzrSnapshot));
      try {
        if (it.kind === 'product') {
          const p: any = await apiHelpers.getProduct(it.listingId);
          // Price
          if (current <= 0) {
            const val = String(p?.priceBzr ?? '').replace(',', '.');
            if (val && Number(val) > 0) priceUpdates[it.listingId] = val;
          }
          // Shipping info (PROPOSAL-000 legacy)
          if (p?.estimatedDeliveryDays || p?.shippingMethod) {
            shipUpdates[it.listingId] = {
              estimatedDeliveryDays: p.estimatedDeliveryDays,
              shippingMethod: p.shippingMethod,
            };
          }
          // PROPOSAL-002: Shipping options
          if (p?.shippingOptions && Array.isArray(p.shippingOptions) && p.shippingOptions.length > 0) {
            optionsUpdates[it.listingId] = p.shippingOptions;
            // Pre-select the default option
            const defaultOpt = p.shippingOptions.find((o: ShippingOption) => o.isDefault) || p.shippingOptions[0];
            if (defaultOpt) {
              defaultSelections[it.listingId] = defaultOpt;
            }
          }
        } else {
          const s: any = await apiHelpers.getService(it.listingId);
          if (current <= 0) {
            const val = String(s?.basePriceBzr ?? '').replace(',', '.');
            if (val && Number(val) > 0) priceUpdates[it.listingId] = val;
          }
        }
      } catch {
        // ignore fetch failures
      }
    }

    if (Object.keys(priceUpdates).length > 0) {
      setResolvedPrices(prev => ({ ...prev, ...priceUpdates }));
    }
    if (Object.keys(shipUpdates).length > 0) {
      setShippingInfo(prev => ({ ...prev, ...shipUpdates }));
    }
    if (Object.keys(optionsUpdates).length > 0) {
      setShippingOptionsPerItem(prev => ({ ...prev, ...optionsUpdates }));
    }
    if (Object.keys(defaultSelections).length > 0) {
      setSelectedShippingOptions(prev => ({ ...prev, ...defaultSelections }));
    }
  }, [items, parseDec]);

  // Track if we've already fetched prices to avoid infinite loops
  const hasFetchedPrices = useRef(false);
  const itemsKey = items.map(i => i.listingId).join(',');

  // Run once on mount and whenever items change
  useEffect(() => {
    if (items.length > 0 && !hasFetchedPrices.current) {
      hasFetchedPrices.current = true;
      ensurePrices();
    }
  }, [itemsKey, ensurePrices]);

  // Reset the flag when items change
  useEffect(() => {
    hasFetchedPrices.current = false;
  }, [itemsKey]);

  const getUnitPrice = useCallback((listingId: string, fallback: string) => {
    return resolvedPrices[listingId] ?? String(fallback);
  }, [resolvedPrices]);

  const handleCreateOrder = useCallback(async (data: ShippingForm) => {
    if (items.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // PROPOSAL-003: Multi-Store Checkout
      if (isMultiStore) {
        // Agrupar itens por vendedor para /orders/multi
        const stores: StoreOrderData[] = itemsByStore.map((storeGroup: CartStoreGroup) => ({
          sellerId: storeGroup.sellerId,
          items: storeGroup.items.map(item => {
            const selectedOpt = selectedShippingOptions[item.listingId];
            return {
              listingId: item.listingId,
              qty: item.qty,
              kind: item.kind,
              shippingOptionId: selectedOpt?.id,
              shippingOptionSnapshot: selectedOpt ? {
                method: selectedOpt.method,
                label: selectedOpt.label,
                pricingType: selectedOpt.pricingType,
                priceBzr: selectedOpt.priceBzr,
                estimatedDeliveryDays: selectedOpt.estimatedDeliveryDays,
              } : undefined,
            };
          }),
        }));

        const multiResponse: CreateMultiOrderResponse = await ordersApi.createMulti({
          shippingAddress: data,
          stores,
        });

        // Limpar carrinho
        clear();

        // Para multi-store, redirecionar para página de pagamento batch
        // O OrderPayPage detecta isMultiStore e usa useBatchEscrowLock()
        const firstOrderId = multiResponse.orders[0]?.orderId;
        if (firstOrderId) {
          // PROPOSAL-003: Batch payment implemented in OrderPayPage
          navigate(`/app/orders/${firstOrderId}/pay`, {
            state: {
              checkoutSessionId: multiResponse.checkoutSessionId,
              orderIds: multiResponse.orders.map(o => o.orderId),
              isMultiStore: true,
            },
          });
        }
      } else {
        // Single-store checkout (comportamento original)
        const orderData = {
          items: items.map(item => {
            const selectedOpt = selectedShippingOptions[item.listingId];
            return {
              listingId: item.listingId,
              qty: item.qty,
              kind: item.kind,
              shippingOptionId: selectedOpt?.id,
              shippingOptionSnapshot: selectedOpt ? {
                method: selectedOpt.method,
                label: selectedOpt.label,
                pricingType: selectedOpt.pricingType,
                priceBzr: selectedOpt.priceBzr,
                estimatedDeliveryDays: selectedOpt.estimatedDeliveryDays,
              } : undefined,
            };
          }),
          shippingAddress: data,
          shippingOptionId: 'STD', // Legacy fallback
        };

        const response = await ordersApi.create(orderData);
        clear();
        navigate(`/app/orders/${response.orderId}/pay`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('checkout.error.createOrderFailed', 'Falha ao criar pedido. Tente novamente.'));
    } finally {
      setIsSubmitting(false);
    }
  }, [items, itemsByStore, isMultiStore, selectedShippingOptions, clear, navigate, t]);

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-2 md:py-3">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Package className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">{t('checkout.empty.title', 'Carrinho vazio')}</h2>
              <p className="text-muted-foreground text-center mb-6">
                {t('checkout.empty.description', 'Adicione itens ao carrinho antes de finalizar a compra.')}
              </p>
              <Button onClick={() => navigate('/app/cart')}>
                {t('checkout.empty.backToCart', 'Voltar ao Carrinho')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Calcular subtotal com fallback de preços resolvidos
  const computedSubtotal = items.reduce((sum, it) => {
    const unit = parseDec(getUnitPrice(it.listingId, String(it.priceBzrSnapshot)));
    return sum + unit * it.qty;
  }, 0);

  // PROPOSAL-002: Calcular frete baseado nas opções selecionadas
  const calculateShippingPrice = (option: ShippingOption | undefined): number => {
    if (!option) return 0;
    switch (option.pricingType) {
      case 'FREE':
        return 0;
      case 'FREE_ABOVE': {
        const threshold = parseFloat(option.freeAboveBzr || '0');
        if (computedSubtotal >= threshold) return 0;
        return parseFloat(option.priceBzr || '0');
      }
      case 'TO_ARRANGE':
        return 0;
      case 'FIXED':
      default:
        return parseFloat(option.priceBzr || '0');
    }
  };

  const shippingTotal = items.reduce((sum, it) => {
    if (it.kind !== 'product') return sum;
    const selectedOpt = selectedShippingOptions[it.listingId];
    return sum + calculateShippingPrice(selectedOpt);
  }, 0);

  const shippingBzr = shippingTotal.toFixed(2);
  const totalBzr = (computedSubtotal + shippingTotal).toString();

  return (
    <div className="container mx-auto px-4 py-2 md:py-3">
      <div className="max-w-4xl mx-auto">
        <Breadcrumbs items={[
          { label: t('nav.dashboard', { defaultValue: 'Dashboard' }), href: '/app' },
          { label: t('cart.title', { defaultValue: 'Carrinho' }), href: '/app/cart' },
          { label: t('checkout.title', { defaultValue: 'Finalizar Compra' }) }
        ]} />

        <h1 className="text-3xl font-bold mb-6">{t('checkout.title', 'Finalizar Compra')}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulário de Entrega */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {t('checkout.shipping.title', 'Endereço de Entrega')}
                </CardTitle>
                <CardDescription>{t('checkout.shipping.description', 'Informe o endereço onde deseja receber seu pedido.')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(handleCreateOrder)} className="space-y-4">
                  <div>
                    <Label htmlFor="street">{t('checkout.shipping.street', 'Endereço')}</Label>
                    <Input
                      id="street"
                      {...register('street')}
                      placeholder={t('checkout.shipping.streetPlaceholder', 'Rua, número, complemento')}
                    />
                    {errors.street && (
                      <p className="text-sm text-destructive mt-1">{errors.street.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">{t('checkout.shipping.city', 'Cidade')}</Label>
                      <Input
                        id="city"
                        {...register('city')}
                        placeholder={t('checkout.shipping.cityPlaceholder', 'Digite a cidade')}
                      />
                      {errors.city && (
                        <p className="text-sm text-destructive mt-1">{errors.city.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="state">{t('checkout.shipping.state', 'Estado')}</Label>
                      <Input
                        id="state"
                        {...register('state')}
                        placeholder={t('checkout.shipping.statePlaceholder', 'UF')}
                      />
                      {errors.state && (
                        <p className="text-sm text-destructive mt-1">{errors.state.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="zipCode">{t('checkout.shipping.zipCode', 'CEP')}</Label>
                      <Input
                        id="zipCode"
                        {...register('zipCode')}
                        placeholder={t('checkout.shipping.zipCodePlaceholder', '00000-000')}
                      />
                      {errors.zipCode && (
                        <p className="text-sm text-destructive mt-1">{errors.zipCode.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="country">{t('checkout.shipping.country', 'País')}</Label>
                      <Input
                        id="country"
                        {...register('country')}
                        placeholder={t('checkout.shipping.countryPlaceholder', 'Brasil')}
                      />
                      {errors.country && (
                        <p className="text-sm text-destructive mt-1">{errors.country.message}</p>
                      )}
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20">
                      <p className="text-destructive text-sm">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isSubmitting}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {isSubmitting
                      ? t('checkout.creating', 'Criando pedido...')
                      : isMultiStore
                        ? t('multiStore.checkout.createOrders', { count: storeCount, defaultValue: `Criar ${storeCount} Pedidos` })
                        : t('checkout.createOrder', 'Criar Pedido')
                    }
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Resumo do Pedido */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('checkout.summary.title', 'Resumo do Pedido')}</CardTitle>
                <CardDescription>{t('checkout.summary.description', 'Confira os itens do seu pedido.')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* PROPOSAL-003: Alerta para multi-store */}
                {isMultiStore && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      {t('multiStore.checkout.independentOrders', {
                        count: storeCount,
                        defaultValue: `${storeCount} pedidos independentes serão criados`,
                      })}
                    </AlertDescription>
                  </Alert>
                )}

                {/* PROPOSAL-003: Itens agrupados por loja */}
                {isMultiStore ? (
                  <div className="space-y-4">
                    {itemsByStore.map((storeGroup: CartStoreGroup) => (
                      <div key={storeGroup.sellerId} className="space-y-2">
                        {/* Store header */}
                        <div className="flex items-center gap-2 pb-1 border-b">
                          <Store className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">{storeGroup.sellerName}</span>
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {formatBzr(storeGroup.subtotalBzr)}
                          </Badge>
                        </div>
                        {/* Store items */}
                        <div className="space-y-2 pl-6">
                          {storeGroup.items.map((item) => (
                            <div key={item.listingId} className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{item.titleSnapshot}</p>
                                <p className="text-xs text-muted-foreground">
                                  {t('checkout.summary.qty', { qty: item.qty, defaultValue: '{{qty}}x' })} × {formatBzr(String(item.priceBzrSnapshot))}
                                </p>
                              </div>
                              <p className="font-medium text-sm">
                                {formatBzr((parseDec(String(item.priceBzrSnapshot)) * item.qty).toString())}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Single store - layout original */
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.listingId} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{item.titleSnapshot}</p>
                            <Badge variant="outline" className="text-xs">
                              {t(`cart.kind.${item.kind}`)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t('checkout.summary.qty', { qty: item.qty, defaultValue: '{{qty}}x' })} × {formatBzr(String(item.priceBzrSnapshot))}
                          </p>
                        </div>
                        <p className="font-medium text-sm">
                          {formatBzr((parseDec(String(item.priceBzrSnapshot)) * item.qty).toString())}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('checkout.summary.subtotal', 'Subtotal')}</span>
                    <span>{formatBzr(computedSubtotal.toString())}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('checkout.summary.shipping', 'Frete')}</span>
                    <span>{formatBzr(shippingBzr)}</span>
                  </div>

                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>{t('checkout.summary.total', 'Total')}</span>
                    <span>{formatBzr(totalBzr)}</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  {t('checkout.summary.note', 'O valor será cobrado em BZR no momento do pagamento.')}
                </p>
              </CardContent>
            </Card>

            {/* PROPOSAL-002: Shipping Options Selection */}
            {items.some(item => item.kind === 'product' && shippingOptionsPerItem[item.listingId]?.length > 0) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Truck className="h-4 w-4 text-primary" />
                    {t('shippingOptions.checkout.title', { defaultValue: 'Opções de Envio' })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item) => {
                    if (item.kind !== 'product') return null;
                    const options = shippingOptionsPerItem[item.listingId];
                    if (!options || options.length === 0) return null;

                    return (
                      <div key={item.listingId} className="space-y-2">
                        {/* Product label when multiple products */}
                        {items.filter(i => i.kind === 'product' && shippingOptionsPerItem[i.listingId]?.length > 0).length > 1 && (
                          <p className="text-sm font-medium text-muted-foreground">
                            {item.titleSnapshot}
                          </p>
                        )}
                        <ShippingOptionSelector
                          options={options}
                          selectedOptionId={selectedShippingOptions[item.listingId]?.id}
                          onSelect={(option) => {
                            setSelectedShippingOptions(prev => ({
                              ...prev,
                              [item.listingId]: option,
                            }));
                          }}
                          cartSubtotal={computedSubtotal}
                        />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Fallback: Legacy Estimated Delivery (PROPOSAL-000) - shown only if no PROPOSAL-002 options */}
            {Object.keys(shippingInfo).length > 0 &&
             !items.some(item => item.kind === 'product' && shippingOptionsPerItem[item.listingId]?.length > 0) && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Truck className="h-4 w-4 text-primary" />
                    {t('shipping.checkout.estimatedDelivery')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.map((item) => {
                    const info = shippingInfo[item.listingId];
                    if (!info?.estimatedDeliveryDays) return null;
                    return (
                      <div key={item.listingId} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground truncate max-w-[200px]">
                          {item.titleSnapshot}
                        </span>
                        <div className="flex items-center gap-2">
                          {info.shippingMethod && (
                            <Badge variant="outline" className="text-xs">
                              {t(`shipping.methods.${info.shippingMethod}`)}
                            </Badge>
                          )}
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <Clock className="h-3 w-3" />
                            {t('shipping.checkout.deliveryDays', { days: info.estimatedDeliveryDays })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
