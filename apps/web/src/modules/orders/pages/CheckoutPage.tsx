// path: apps/web/src/modules/orders/pages/CheckoutPage.tsx

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package, CreditCard, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { useCart } from '@/modules/cart/cart.store';
import { ordersApi } from '../api';
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
  const { items, subtotalBzr, clear } = useCart();
  const [resolvedPrices, setResolvedPrices] = useState<Record<string, string>>({});


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

  // Resolve unit prices for items that have invalid/zero snapshot
  const ensurePrices = useCallback(async () => {
    const updates: Record<string, string> = {};
    for (const it of items) {
      const current = parseDec(String(it.priceBzrSnapshot));
      if (current > 0) continue;
      try {
        if (it.kind === 'product') {
          const p: any = await apiHelpers.getProduct(it.listingId);
          const val = String(p?.priceBzr ?? '').replace(',', '.');
          if (val && Number(val) > 0) updates[it.listingId] = val;
        } else {
          const s: any = await apiHelpers.getService(it.listingId);
          const val = String(s?.basePriceBzr ?? '').replace(',', '.');
          if (val && Number(val) > 0) updates[it.listingId] = val;
        }
      } catch {
        // ignore fetch failures
      }
    }
    if (Object.keys(updates).length > 0) {
      setResolvedPrices(prev => ({ ...prev, ...updates }));
    }
  }, [items, parseDec]);

  // Run once on mount and whenever items change
  // (no i18n deps to avoid reload flicker)
  if (typeof window !== 'undefined') {
    // Fire and forget; no need to block render
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ensurePrices();
  }

  const getUnitPrice = useCallback((listingId: string, fallback: string) => {
    return resolvedPrices[listingId] ?? String(fallback);
  }, [resolvedPrices]);

  const handleCreateOrder = useCallback(async (data: ShippingForm) => {
    if (items.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Preparar dados do pedido
      const orderData = {
        items: items.map(item => ({
          listingId: item.listingId,
          qty: item.qty,
          kind: item.kind,
        })),
        shippingAddress: data,
        shippingOptionId: 'STD',
      };

      // Criar pedido
      const response = await ordersApi.create(orderData);

      // Limpar carrinho
      clear();

      // Navegar para página de pagamento
      navigate(`/app/orders/${response.orderId}/pay`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('checkout.error.createOrderFailed', 'Falha ao criar pedido. Tente novamente.'));
    } finally {
      setIsSubmitting(false);
    }
  }, [items, clear, navigate, t]);

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
  // Calcular total com frete (stub 10 BZR em decimais)
  const shippingBzr = '10';
  const totalBzr = (computedSubtotal + parseDec(shippingBzr)).toString();

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
                    {isSubmitting ? t('checkout.creating', 'Criando pedido...') : t('checkout.createOrder', 'Criar Pedido')}
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
                {/* Itens */}
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
          </div>
        </div>
      </div>
    </div>
  );
}
