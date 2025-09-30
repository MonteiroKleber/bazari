import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { sellerApi } from '@/modules/seller/api';

export default function SellersListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [items, setItems] = useState<Array<{ id: string; shopName: string; shopSlug: string; isDefault?: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await sellerApi.listMyStores();
        if (!active) return;
        setItems(res.items || []);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || t('errors.generic'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [t]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('seller.myStores.title', { defaultValue: 'Minhas Lojas' })}</h1>
        <Button onClick={() => navigate('/app/seller/setup')}>{t('seller.myStores.new', { defaultValue: 'Criar loja' })}</Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground">{t('common.loading')}</div>
      ) : error ? (
        <div className="text-destructive">{error}</div>
      ) : items.length === 0 ? (
        <div className="text-muted-foreground">{t('seller.myStores.empty', { defaultValue: 'Você ainda não tem lojas.' })}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>{s.shopName}</span>
                  {s.isDefault ? <span className="text-xs text-muted-foreground">({t('seller.myStores.default', { defaultValue: 'padrão' })})</span> : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Link to={`/app/seller/setup?store=${encodeURIComponent(s.id)}`}>
                  <Button variant="outline">{t('seller.myStores.edit', { defaultValue: 'Editar' })}</Button>
                </Link>
                <Link to={`/seller/${s.shopSlug}`}>
                  <Button variant="outline">{t('seller.myStores.public', { defaultValue: 'Ver pública' })}</Button>
                </Link>
                <Link to={`/app/sellers/${s.shopSlug}/products`}>
                  <Button variant="outline">{t('seller.products.title', { defaultValue: 'Produtos' })}</Button>
                </Link>
                <Link to={`/app/sellers/${s.shopSlug}/orders`}>
                  <Button variant="outline">{t('seller.orders.title', { defaultValue: 'Pedidos' })}</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
