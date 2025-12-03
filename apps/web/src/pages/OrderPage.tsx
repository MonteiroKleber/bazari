// path: apps/web/src/pages/OrderPage.tsx

import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Truck, Package, ExternalLink, Clock, CheckCircle2 } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import { ordersApi } from '@/modules/orders/api';
import { deliveryApi } from '@/lib/api/delivery';
import { DeliveryStatusTimeline } from '@/components/delivery';
import type { DeliveryRequest } from '@/types/delivery';
import { PaymentProtectionCard } from '@/components/escrow/PaymentProtectionCard';
import { useBlockchainQuery } from '@/hooks/useBlockchainQuery';
import { getSessionUser } from '@/modules/auth';

interface Order {
  id: string;
  buyerAddr: string;
  sellerAddr: string;
  totalBzr: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  escrowLogs: EscrowLog[];
  deliveryRequestId?: string;
  // Shipping fields (PROPOSAL-000)
  estimatedDeliveryDays?: number;
  shippingMethod?: string;
  shippedAt?: string;
  trackingCode?: string;
  // Delivery-Aware Escrow (PROPOSAL-001)
  autoReleaseBlocks?: number;
  estimatedDeliveryDate?: string;
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
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionResponse, setActionResponse] = useState<ActionResponse | null>(null);

  // Delivery tracking
  const [delivery, setDelivery] = useState<DeliveryRequest | null>(null);
  const [isLoadingDelivery, setIsLoadingDelivery] = useState(false);

  // Shipping state (PROPOSAL-000)
  const [trackingCodeInput, setTrackingCodeInput] = useState('');
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [shippingSuccess, setShippingSuccess] = useState(false);

  // Current user
  const currentUser = getSessionUser();

  // Blockchain current block for escrow countdown
  const { data: blockData } = useBlockchainQuery<{ currentBlock: number }>({
    endpoint: '/api/blockchain/current-block',
    refetchInterval: 6000, // Update every block (6s)
  });

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

  // Load delivery tracking if order has deliveryRequestId
  useEffect(() => {
    if (order?.deliveryRequestId) {
      loadDelivery(order.deliveryRequestId);
    }
  }, [order?.deliveryRequestId]);

  const loadDelivery = async (deliveryRequestId: string) => {
    try {
      setIsLoadingDelivery(true);
      const data = await deliveryApi.getRequest(deliveryRequestId);
      setDelivery(data);
    } catch (error) {
      console.error('Erro ao carregar entrega:', error);
      setDelivery(null);
    } finally {
      setIsLoadingDelivery(false);
    }
  };

  // Mark order as shipped (PROPOSAL-000)
  const handleMarkAsShipped = useCallback(async () => {
    if (!id) return;

    try {
      setShippingLoading(true);
      setShippingError(null);
      setShippingSuccess(false);

      await ordersApi.markAsShipped(id, {
        trackingCode: trackingCodeInput.trim() || undefined
      });

      setShippingSuccess(true);
      await loadOrder(); // Reload order to get updated status
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || t('errors.generic');
      setShippingError(message);
    } finally {
      setShippingLoading(false);
    }
  }, [id, trackingCodeInput, loadOrder, t]);

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

  const renderDeliveryTracking = () => {
    if (!order?.deliveryRequestId) return null;

    if (isLoadingDelivery) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Status da Entrega
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>
      );
    }

    if (!delivery) return null;

    const getStatusLabel = (status: string) => {
      const labels: Record<string, string> = {
        pending: 'Aguardando Entregador',
        accepted: 'Entregador A Caminho',
        picked_up: 'Coletado',
        in_transit: 'Em Trânsito',
        delivered: 'Entregue',
        cancelled: 'Cancelado',
        failed: 'Falhou',
      };
      return labels[status] || status;
    };

    const getStatusColor = (status: string) => {
      const colors: Record<string, string> = {
        pending: 'bg-yellow-600',
        accepted: 'bg-blue-600',
        picked_up: 'bg-orange-600',
        in_transit: 'bg-purple-600',
        delivered: 'bg-green-600',
        cancelled: 'bg-red-600',
        failed: 'bg-red-600',
      };
      return colors[status] || 'bg-gray-600';
    };

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Status da Entrega
            </CardTitle>
            <Badge className={getStatusColor(delivery.status)}>
              {getStatusLabel(delivery.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Timeline */}
          <DeliveryStatusTimeline
            currentStatus={delivery.status}
            timestamps={{
              createdAt: delivery.createdAt,
              acceptedAt: delivery.acceptedAt,
              pickedUpAt: delivery.pickedUpAt,
              deliveredAt: delivery.deliveredAt,
            }}
          />

          {/* Delivery Info */}
          {delivery.distanceKm && delivery.estimatedTimeMinutes && (
            <div className="grid grid-cols-2 gap-4 py-3 border-t">
              <div>
                <p className="text-xs text-muted-foreground">Distância</p>
                <p className="font-medium">{delivery.distanceKm.toFixed(1)} km</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tempo Estimado</p>
                <p className="font-medium">~{delivery.estimatedTimeMinutes} min</p>
              </div>
            </div>
          )}

          {/* Deliverer info (if accepted) */}
          {delivery.delivererId && delivery.deliverer && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-2">Entregador</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={delivery.deliverer.profilePhoto || undefined} />
                    <AvatarFallback>
                      {delivery.deliverer.fullName
                        ?.split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{delivery.deliverer.fullName || 'Entregador'}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {delivery.deliverer.vehicleType === 'bike' && '🚴 Bicicleta'}
                        {delivery.deliverer.vehicleType === 'motorcycle' && '🏍️ Moto'}
                        {delivery.deliverer.vehicleType === 'car' && '🚗 Carro'}
                        {delivery.deliverer.vehicleType === 'van' && '🚐 Van'}
                      </span>
                      {delivery.deliverer.avgRating && (
                        <span>⭐ {delivery.deliverer.avgRating.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                </div>
                {delivery.deliverer.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`tel:${delivery.deliverer.phone}`)}
                  >
                    📞 Ligar
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Action button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(`/app/delivery/track/${delivery.id}`)}
          >
            Ver Detalhes da Entrega
          </Button>
        </CardContent>
      </Card>
    );
  };

  const canCancel = order?.status &&
    !['RELEASED', 'REFUNDED', 'CANCELLED', 'TIMEOUT'].includes(order.status);

  // Check if current user is the seller (PROPOSAL-000)
  const isSeller = currentUser?.address && order?.sellerAddr &&
    currentUser.address.toLowerCase() === order.sellerAddr.toLowerCase();

  // Check if current user is the buyer
  const isBuyer = currentUser?.address && order?.buyerAddr &&
    currentUser.address.toLowerCase() === order.buyerAddr.toLowerCase();

  // Seller can mark as shipped when order is ESCROWED
  const canMarkAsShipped = isSeller && order?.status === 'ESCROWED';

  // Render shipping section for seller (mark as shipped)
  const renderSellerShippingSection = () => {
    if (!canMarkAsShipped) return null;

    return (
      <Card className="border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {t('shipping.sellerView.readyToShip')}
          </CardTitle>
          <CardDescription>
            {t('shipping.shippedInfo.timerStarts')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tracking Code Input */}
          <div>
            <Label htmlFor="trackingCode">{t('shipping.sellerView.addTracking')}</Label>
            <Input
              id="trackingCode"
              type="text"
              placeholder={t('shipping.trackingCodePlaceholder') as string}
              value={trackingCodeInput}
              onChange={(e) => setTrackingCodeInput(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Auto-release info - PROPOSAL-001: Dynamic days */}
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              {t('shipping.autoRelease.description', {
                days: order?.autoReleaseBlocks
                  ? Math.ceil(order.autoReleaseBlocks / 14_400) // Convert blocks to days
                  : (order?.estimatedDeliveryDays || 7) + 7 // delivery + 7 day margin
              })}
            </AlertDescription>
          </Alert>

          {/* Error message */}
          {shippingError && (
            <Alert variant="destructive">
              <AlertDescription>{shippingError}</AlertDescription>
            </Alert>
          )}

          {/* Success message */}
          {shippingSuccess && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                {t('shipping.shippedInfo.title')}
              </AlertDescription>
            </Alert>
          )}

          {/* Ship button */}
          <Button
            onClick={handleMarkAsShipped}
            disabled={shippingLoading}
            className="w-full"
          >
            <Truck className="h-4 w-4 mr-2" />
            {shippingLoading ? t('shipping.markingAsShipped') : t('shipping.markAsShipped')}
          </Button>
        </CardContent>
      </Card>
    );
  };

  // Render shipping info for buyer (tracking, shipped status)
  const renderBuyerShippingInfo = () => {
    // Show only if order has been shipped
    if (!order?.shippedAt) return null;

    return (
      <Card className="border-green-500/50 bg-green-50/30 dark:bg-green-950/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-green-600" />
              {t('shipping.buyerView.orderShipped')}
            </CardTitle>
            <Badge className="bg-green-600">{t('shipping.status.SHIPPED')}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Shipped at */}
            <div>
              <p className="text-sm text-muted-foreground">{t('shipping.shippedAt')}</p>
              <p className="font-medium">{formatDate(order.shippedAt)}</p>
            </div>

            {/* Shipping method */}
            {order.shippingMethod && (
              <div>
                <p className="text-sm text-muted-foreground">{t('shipping.method')}</p>
                <p className="font-medium">{t(`shipping.methods.${order.shippingMethod}`)}</p>
              </div>
            )}
          </div>

          {/* Tracking code */}
          {order.trackingCode && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-1">{t('shipping.trackingCode')}</p>
              <div className="flex items-center gap-2">
                <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                  {order.trackingCode}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Try to open tracking URL based on shipping method
                    const trackingUrls: Record<string, string> = {
                      SEDEX: `https://www.linkcorreios.com.br/${order.trackingCode}`,
                      PAC: `https://www.linkcorreios.com.br/${order.trackingCode}`,
                    };
                    const url = trackingUrls[order.shippingMethod || ''];
                    if (url) window.open(url, '_blank');
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Auto-release countdown info */}
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              {t('shipping.autoRelease.confirmEarly')}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  };

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
    <div className="container mx-auto px-4 py-2 md:py-3">
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

        {/* Shipping Section - Seller can mark as shipped (PROPOSAL-000) */}
        {renderSellerShippingSection()}

        {/* Shipping Info - Buyer sees tracking info (PROPOSAL-000) */}
        {renderBuyerShippingInfo()}

        {/* Delivery Tracking */}
        {renderDeliveryTracking()}

        {/* Payment Protection (Escrow) - PROPOSAL-001: Now with Timeline */}
        {id && (
          <PaymentProtectionCard
            orderId={id}
            currentBlock={blockData?.currentBlock ?? 0}
            orderCreatedAt={order.createdAt}
            estimatedDeliveryDays={order.estimatedDeliveryDays}
          />
        )}

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>{t('order.actions.title')}</CardTitle>
            <CardDescription>{t('order.actions.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
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