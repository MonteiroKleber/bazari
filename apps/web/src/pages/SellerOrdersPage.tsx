import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { sellerApi } from '@/modules/seller/api';

export default function SellerOrdersPage() {
  const { t } = useTranslation();
  const { shopSlug = '' } = useParams();
  const [items, setItems] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(cursor?: string) {
    const res = await sellerApi.listStoreOrders(shopSlug, cursor ? { cursor } : undefined);
    setItems((prev) => cursor ? [...prev, ...res.items] : res.items);
    setNextCursor(res.nextCursor ?? null);
  }

  useEffect(() => {
    setLoading(true);
    setError(null);
    load().catch((e) => setError(e?.message || t('errors.generic'))).finally(() => setLoading(false));
  }, [t]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('seller.orders.title', { defaultValue: 'Vendas da loja' })} <span className="text-muted-foreground">/@{shopSlug}</span></h1>
      </div>

      {loading && items.length === 0 ? (
        <div className="text-muted-foreground">{t('common.loading')}</div>
      ) : error ? (
        <div className="text-destructive">{error}</div>
      ) : (
        <div className="space-y-3">
          {items.map((o) => (
            <Card key={o.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">#{o.id.slice(-8)}</CardTitle>
                  <Badge>{o.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">Total: {o.totalBzr} planck</div>
                <ul className="mt-2 text-sm list-disc ml-5">
                  {o.items.map((i: any) => (
                    <li key={i.listingId}>{i.titleSnapshot} × {i.qty}</li>
                  ))}
                </ul>
                <div className="mt-3">
                  <Link to={`/app/orders/${o.id}`}><Button size="sm">{t('seller.orders.view', { defaultValue: 'Ver pedido' })}</Button></Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {nextCursor && (
        <div className="flex justify-center mt-6">
          <Button variant="outline" onClick={() => load(nextCursor!)}>{t('profile.seeMore')}</Button>
        </div>
      )}
    </div>
  );
}
