// path: apps/web/src/modules/cart/pages/CartPage.tsx

import { useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trash2, Plus, Minus, ShoppingCart, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { useCart } from '../cart.store';
import { BZR } from '@/utils/bzr';

export function CartPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, subtotalBzr, count, removeItem, updateQty, clear } = useCart();

  const formatBzr = useCallback((value: string) => {
    const locale = BZR.normalizeLocale((typeof navigator !== 'undefined' ? navigator.language : 'en-US'));
    return BZR.formatDecimal(value, locale, true);
  }, []);

  const handleQtyIncrease = useCallback((listingId: string, currentQty: number) => {
    updateQty(listingId, currentQty + 1);
  }, [updateQty]);

  const handleQtyDecrease = useCallback((listingId: string, currentQty: number) => {
    if (currentQty > 1) {
      updateQty(listingId, currentQty - 1);
    }
  }, [updateQty]);

  const handleRemoveItem = useCallback((listingId: string) => {
    removeItem(listingId);
  }, [removeItem]);

  const handleClearCart = useCallback(() => {
    if (window.confirm(t('cart.confirmClear'))) {
      clear();
    }
  }, [clear, t]);

  const handleProceedToCheckout = useCallback(() => {
    navigate('/app/checkout');
  }, [navigate]);

  const isEmpty = items.length === 0;

  if (isEmpty) {
    return (
      <div className="container mx-auto px-4 py-2 md:py-3">
        <div className="max-w-2xl mx-auto">
          <Breadcrumbs items={[
            { label: t('nav.dashboard', { defaultValue: 'Dashboard' }), href: '/app' },
            { label: t('cart.title', { defaultValue: 'Carrinho' }) }
          ]} />

          <h1 className="text-3xl font-bold mb-6">{t('cart.title')}</h1>

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">{t('cart.empty.title')}</h2>
              <p className="text-muted-foreground text-center mb-6">
                {t('cart.empty.description')}
              </p>
              <Button asChild>
                <Link to="/search">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('cart.empty.browseCatalog')}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-2 md:py-3">
      <div className="max-w-4xl mx-auto">
        <Breadcrumbs items={[
          { label: t('nav.dashboard', { defaultValue: 'Dashboard' }), href: '/app' },
          { label: t('cart.title', { defaultValue: 'Carrinho' }) }
        ]} />

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">{t('cart.title')}</h1>
          <Badge variant="secondary">
            {t('cart.itemCount', { count })}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t('cart.items.title')}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearCart}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {t('cart.clearAll')}
              </Button>
            </div>

            {items.map((item) => (
              <Card key={item.listingId}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{item.titleSnapshot}</h3>
                        <Badge variant="outline" className="text-xs">
                          {t(`cart.kind.${item.kind}`)}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">
                        {t('cart.unitPrice')}: {formatBzr(item.priceBzrSnapshot)}
                      </p>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQtyDecrease(item.listingId, item.qty)}
                            disabled={item.qty <= 1}
                            aria-label={t('cart.decreaseQty')}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>

                          <span className="w-12 text-center text-sm font-medium">
                            {item.qty}
                          </span>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQtyIncrease(item.listingId, item.qty)}
                            aria-label={t('cart.increaseQty')}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.listingId)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {t('cart.remove')}
                        </Button>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold">
                        {formatBzr((Number(String(item.priceBzrSnapshot).replace(',', '.')) * item.qty).toString())}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('cart.summary.title')}</CardTitle>
                <CardDescription>{t('cart.summary.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('cart.summary.subtotal')}</span>
                  <span className="font-medium">{formatBzr(subtotalBzr)}</span>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between font-semibold">
                    <span>{t('cart.summary.total')}</span>
                    <span>{formatBzr(subtotalBzr)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('cart.summary.taxNote')}
                  </p>
                </div>

                <Button
                  onClick={handleProceedToCheckout}
                  className="w-full"
                  size="lg"
                >
                  {t('cart.proceedToCheckout')}
                </Button>

                <Button asChild variant="outline" className="w-full">
                  <Link to="/search">{t('cart.continueShopping')}</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
