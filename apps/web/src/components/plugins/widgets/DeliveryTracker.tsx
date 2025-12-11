/**
 * Delivery Tracker Component
 *
 * Timeline de rastreamento de entrega
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  Clock,
  Package,
  Truck,
  Home,
  MapPin,
  ChefHat,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PluginWidgetProps } from '../PluginRenderer';

// Mapa de ícones disponíveis
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  check: Check,
  clock: Clock,
  'chef-hat': ChefHat,
  package: Package,
  truck: Truck,
  home: Home,
  'map-pin': MapPin,
};

interface DeliveryStatus {
  key: string;
  label: string;
  icon: string;
}

interface DeliveryConfig {
  statuses?: DeliveryStatus[];
  enableLiveMap?: boolean;
  estimatedDeliveryTime?: number;
}

interface TrackingData {
  currentStatus: string;
  statusHistory: Array<{ status: string; timestamp: string }>;
  estimatedArrival?: string;
  delivererLocation?: { lat: number; lng: number };
}

interface DeliveryTrackerProps extends PluginWidgetProps {
  context?: {
    orderId?: string;
  };
}

export function DeliveryTracker({
  config,
  branding,
  context,
}: DeliveryTrackerProps) {
  const { t } = useTranslation();
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);

  const deliveryConfig = config as DeliveryConfig;
  const statuses = deliveryConfig.statuses ?? [
    { key: 'confirmed', label: 'Pedido confirmado', icon: 'check' },
    { key: 'preparing', label: 'Preparando', icon: 'chef-hat' },
    { key: 'ready', label: 'Pronto para entrega', icon: 'package' },
    { key: 'picked_up', label: 'Saiu para entrega', icon: 'truck' },
    { key: 'delivered', label: 'Entregue', icon: 'home' },
  ];

  const orderId = context?.orderId;

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    // Simular fetch inicial (substituir por API real)
    const fetchTracking = async () => {
      try {
        // TODO: Implementar endpoint real
        // const response = await api.get(`/plugins/delivery/tracking/${orderId}`);
        // setTracking(response);

        // Mock data para demonstração
        setTracking({
          currentStatus: 'preparing',
          statusHistory: [
            { status: 'confirmed', timestamp: new Date(Date.now() - 3600000).toISOString() },
            { status: 'preparing', timestamp: new Date().toISOString() },
          ],
          estimatedArrival: new Date(Date.now() + 2700000).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        });
      } catch (error) {
        console.error('Failed to fetch tracking:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTracking();

    // TODO: WebSocket para atualizações em tempo real
    // const ws = new WebSocket(`wss://api.bazari.com/tracking/${orderId}`);
    // ws.onmessage = (event) => {
    //   const data = JSON.parse(event.data);
    //   setTracking(prev => ({ ...prev, ...data }));
    // };
    // return () => ws.close();
  }, [orderId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-48 bg-muted rounded" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-8 w-8 rounded-full bg-muted" />
                  <div className="h-4 w-32 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tracking) {
    return null;
  }

  const currentIndex = statuses.findIndex((s) => s.key === tracking.currentStatus);
  const primaryColor = branding?.primaryColor || '#3b82f6';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Truck className="h-5 w-5" style={{ color: primaryColor }} />
          {t('plugins.delivery.trackOrder', 'Acompanhe seu pedido')}
        </CardTitle>
        {tracking.estimatedArrival && (
          <p className="text-sm text-muted-foreground">
            {t('plugins.delivery.estimatedArrival', 'Previsão de chegada')}:{' '}
            <strong>{tracking.estimatedArrival}</strong>
          </p>
        )}
      </CardHeader>

      <CardContent>
        {/* Timeline de status */}
        <div className="relative">
          {statuses.map((status, index) => {
            const Icon = iconMap[status.icon] || Check;
            const isCompleted = index <= currentIndex;
            const isCurrent = index === currentIndex;
            const historyEntry = tracking.statusHistory.find(
              (h) => h.status === status.key
            );

            return (
              <div
                key={status.key}
                className="flex items-start gap-4 pb-6 last:pb-0 relative"
              >
                {/* Linha vertical conectando os pontos */}
                {index < statuses.length - 1 && (
                  <div
                    className="absolute left-4 top-8 w-0.5 h-[calc(100%-32px)] -translate-x-1/2"
                    style={{
                      backgroundColor: isCompleted ? primaryColor : '#e5e7eb',
                    }}
                  />
                )}

                {/* Ícone do status */}
                <div
                  className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                    isCurrent ? 'ring-2 ring-offset-2' : ''
                  }`}
                  style={{
                    backgroundColor: isCompleted ? primaryColor : '#e5e7eb',
                    color: isCompleted ? 'white' : '#9ca3af',
                    ['--tw-ring-color' as string]: isCurrent ? primaryColor : undefined,
                  }}
                >
                  <Icon className="h-4 w-4" />
                </div>

                {/* Texto do status */}
                <div className="flex-1 pt-1">
                  <p
                    className={`font-medium ${
                      isCompleted ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {status.label}
                  </p>
                  {historyEntry && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(historyEntry.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>

                {/* Indicador de status atual */}
                {isCurrent && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full animate-pulse"
                    style={{
                      backgroundColor: `${primaryColor}20`,
                      color: primaryColor,
                    }}
                  >
                    {t('plugins.delivery.current', 'Atual')}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Mapa ao vivo (placeholder) */}
        {deliveryConfig.enableLiveMap && tracking.delivererLocation && (
          <div className="mt-4 h-48 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MapPin className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">
                {t('plugins.delivery.liveMap', 'Mapa em tempo real')}
              </p>
              <p className="text-xs">
                {tracking.delivererLocation.lat.toFixed(4)},{' '}
                {tracking.delivererLocation.lng.toFixed(4)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DeliveryTracker;
