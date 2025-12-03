import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Truck, Package, Clock } from 'lucide-react';
import { sellerApi } from '@/modules/seller/api';

export default function SellerOrdersPage() {
  const { t } = useTranslation();
  const { shopSlug = '' } = useParams();
  const [items, setItems] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get status badge variant and icon (PROPOSAL-000)
  const getStatusBadge = (status: string, shippedAt?: string) => {
    switch (status) {
      case 'SHIPPED':
        return {
          variant: 'default' as const,
          className: 'bg-blue-600 hover:bg-blue-700',
          icon: <Truck className="h-3 w-3 mr-1" />,
          label: t('shipping.status.SHIPPED')
        };
      case 'ESCROWED':
        return {
          variant: 'secondary' as const,
          className: 'bg-yellow-500 hover:bg-yellow-600 text-black',
          icon: <Package className="h-3 w-3 mr-1" />,
          label: t('orderStatus.escrowed')
        };
      case 'RELEASED':
        return {
          variant: 'default' as const,
          className: 'bg-green-600 hover:bg-green-700',
          icon: null,
          label: t('orderStatus.released')
        };
      case 'CANCELLED':
      case 'REFUNDED':
        return {
          variant: 'destructive' as const,
          className: '',
          icon: null,
          label: t(`orderStatus.${status.toLowerCase()}`)
        };
      default:
        return {
          variant: 'outline' as const,
          className: '',
          icon: null,
          label: status
        };
    }
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString();
  };

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
          {items.map((o) => {
            const statusBadge = getStatusBadge(o.status, o.shippedAt);
            return (
              <Card key={o.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">#{o.id.slice(-8)}</CardTitle>
                    <Badge variant={statusBadge.variant} className={statusBadge.className}>
                      {statusBadge.icon}
                      {statusBadge.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">Total: {o.totalBzr} planck</div>

                  {/* Shipped info (PROPOSAL-000) */}
                  {o.shippedAt && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                      <Clock className="h-3 w-3" />
                      <span>{t('shipping.shippedAt')}: {formatDate(o.shippedAt)}</span>
                      {o.trackingCode && (
                        <Badge variant="outline" className="text-xs ml-2">
                          {o.trackingCode}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Action hint for ESCROWED orders */}
                  {o.status === 'ESCROWED' && (
                    <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {t('shipping.sellerView.readyToShip')}
                    </div>
                  )}

                  <ul className="mt-2 text-sm list-disc ml-5">
                    {o.items.map((i: any) => (
                      <li key={i.listingId}>{i.titleSnapshot} × {i.qty}</li>
                    ))}
                  </ul>
                  <div className="mt-3">
                    <Link to={`/app/orders/${o.id}`}>
                      <Button size="sm">
                        {o.status === 'ESCROWED'
                          ? t('shipping.sellerView.shipNow')
                          : t('seller.orders.view', { defaultValue: 'Ver pedido' })
                        }
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
