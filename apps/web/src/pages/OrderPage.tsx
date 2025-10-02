// path: apps/web/src/pages/OrderPage.tsx

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { apiHelpers } from '@/lib/api';

interface Order {
  id: string;
  buyerAddr: string;
  sellerAddr: string;
  totalBzr: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  paymentIntents: PaymentIntent[];
  escrowLogs: EscrowLog[];
}

interface PaymentIntent {
  id: string;
  amountBzr: string;
  escrowAddress: string;
  status: string;
  txHashIn: string | null;
  txHashRelease: string | null;
  txHashRefund: string | null;
  createdAt: string;
}

interface EscrowLog {
  id: string;
  kind: string;
  payloadJson: any;
  createdAt: string;
}

interface ActionResponse {
  recommendation: {
    releaseToSeller?: string;
    feeToMarketplace?: string;
    refundToBuyer?: string;
    amounts?: {
      gross: string;
      fee: string;
      net: string;
    };
  };
  note: string;
  logId: string;
}

export function OrderPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionResponse, setActionResponse] = useState<ActionResponse | null>(null);

  const loadOrder = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const orderData = await apiHelpers.getOrder(id) as Order;
      setOrder(orderData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('order.error.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleConfirmReceived = useCallback(async () => {
    if (!id) return;

    try {
      setActionLoading('confirm');
      setActionResponse(null);
      const response = await apiHelpers.confirmReceived(id) as ActionResponse;
      setActionResponse(response);
      await loadOrder(); // Recarregar order
    } catch (err) {
      setError(err instanceof Error ? err.message : t('order.error.confirmFailed'));
    } finally {
      setActionLoading(null);
    }
  }, [id, t, loadOrder]);

  const handleCancel = useCallback(async () => {
    if (!id) return;

    try {
      setActionLoading('cancel');
      setActionResponse(null);
      const response = await apiHelpers.cancelOrder(id) as ActionResponse;
      setActionResponse(response);
      await loadOrder(); // Recarregar order
    } catch (err) {
      setError(err instanceof Error ? err.message : t('order.error.cancelFailed'));
    } finally {
      setActionLoading(null);
    }
  }, [id, t, loadOrder]);

  const formatBzr = useCallback((planck: string) => {
    const value = BigInt(planck);
    const divisor = BigInt(10 ** 12);
    const wholePart = value / divisor;
    const fractionalPart = value % divisor;
    return `${wholePart}.${fractionalPart.toString().padStart(12, '0').slice(0, 6)} BZR`;
  }, []);

  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  }, []);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'PENDING': return 'outline';
      case 'ESCROWED': case 'FUNDS_IN': return 'secondary';
      case 'SHIPPED': return 'default';
      case 'RELEASED': case 'FINALIZED': return 'default';
      case 'REFUNDED': return 'secondary';
      case 'CANCELLED': case 'TIMEOUT': return 'destructive';
      default: return 'outline';
    }
  };

  const canConfirmReceived = order?.status === 'SHIPPED' ||
    order?.paymentIntents.some(intent => intent.status === 'FUNDS_IN');

  const canCancel = order?.status &&
    !['RELEASED', 'REFUNDED', 'CANCELLED', 'TIMEOUT'].includes(order.status);

  if (!id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">{t('order.error.invalidId')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-muted-foreground">{t('order.loading')}</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">{error || t('order.error.notFound')}</p>
            <Button onClick={loadOrder} className="mt-2">{t('order.retry')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Breadcrumbs items={[
          { label: t('nav.dashboard', { defaultValue: 'Dashboard' }), href: '/app' },
          { label: t('order.orders', { defaultValue: 'Pedidos' }) },
          { label: `#${id.slice(0, 8)}...` }
        ]} />

        <h1 className="text-3xl font-bold">{t('order.title')}</h1>

        {/* Order Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t('order.info.title')}</CardTitle>
            <CardDescription>ID: {order.id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('order.status')}</p>
                <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('order.amount')}</p>
                <p className="font-medium">{formatBzr(order.totalBzr)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('order.buyer')}</p>
                <p className="font-mono text-xs">{order.buyerAddr}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('order.seller')}</p>
                <p className="font-mono text-xs">{order.sellerAddr}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>{t('order.actions.title')}</CardTitle>
            <CardDescription>{t('order.actions.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={handleConfirmReceived}
                disabled={!canConfirmReceived || actionLoading === 'confirm'}
                variant="default"
              >
                {actionLoading === 'confirm' ? t('order.actions.confirming') : t('order.actions.confirmReceived')}
              </Button>

              <Button
                onClick={handleCancel}
                disabled={!canCancel || actionLoading === 'cancel'}
                variant="outline"
              >
                {actionLoading === 'cancel' ? t('order.actions.cancelling') : t('order.actions.cancel')}
              </Button>
            </div>

            {actionResponse && (
              <div className="p-4 bg-muted rounded-md">
                <h4 className="font-medium mb-2">{t('order.recommendation.title')}</h4>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(actionResponse.recommendation, null, 2)}
                </pre>
                <p className="text-sm text-muted-foreground mt-2">{actionResponse.note}</p>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Intents */}
        {order.paymentIntents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('order.intents.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.paymentIntents.map((intent) => (
                  <div key={intent.id} className="border rounded-md p-3">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant={getStatusVariant(intent.status)}>{intent.status}</Badge>
                      <span className="text-sm text-muted-foreground">{formatDate(intent.createdAt)}</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">{t('order.amount')}:</span> {formatBzr(intent.amountBzr)}</p>
                      <p><span className="text-muted-foreground">{t('order.escrow')}:</span> <span className="font-mono text-xs">{intent.escrowAddress}</span></p>
                      {intent.txHashIn && (
                        <p><span className="text-muted-foreground">{t('order.txHashIn')}:</span> <span className="font-mono text-xs">{intent.txHashIn}</span></p>
                      )}
                      {intent.txHashRelease && (
                        <p><span className="text-muted-foreground">{t('order.txHashRelease')}:</span> <span className="font-mono text-xs">{intent.txHashRelease}</span></p>
                      )}
                      {intent.txHashRefund && (
                        <p><span className="text-muted-foreground">{t('order.txHashRefund')}:</span> <span className="font-mono text-xs">{intent.txHashRefund}</span></p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Escrow Logs */}
        {order.escrowLogs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('order.logs.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.escrowLogs.map((log) => (
                  <div key={log.id} className="border rounded-md p-3">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline">{log.kind}</Badge>
                      <span className="text-sm text-muted-foreground">{formatDate(log.createdAt)}</span>
                    </div>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                      {JSON.stringify(log.payloadJson, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}