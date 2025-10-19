import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { DeliveryRequest } from '@/types/delivery';
import { DeliveryRequestStatus } from '@/types/delivery';
import {
  MapPin,
  Clock,
  Package,
  Navigation,
} from 'lucide-react';

interface ActiveDeliveryCardProps {
  delivery: DeliveryRequest;
}

export function ActiveDeliveryCard({ delivery }: ActiveDeliveryCardProps) {
  const navigate = useNavigate();

  const getStatusLabel = (status: DeliveryRequestStatus) => {
    switch (status) {
      case DeliveryRequestStatus.ACCEPTED:
        return 'Aguardando Coleta';
      case DeliveryRequestStatus.PICKED_UP:
        return 'Coletado';
      case DeliveryRequestStatus.IN_TRANSIT:
        return 'Em Trânsito';
      default:
        return status;
    }
  };

  const getStatusColor = (status: DeliveryRequestStatus) => {
    switch (status) {
      case DeliveryRequestStatus.ACCEPTED:
        return 'bg-blue-600';
      case DeliveryRequestStatus.PICKED_UP:
        return 'bg-orange-600';
      case DeliveryRequestStatus.IN_TRANSIT:
        return 'bg-green-600';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={getStatusColor(delivery.status)}>
                {getStatusLabel(delivery.status)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                #{delivery.id.slice(-8)}
              </span>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div>
                  <p className="font-medium">Coleta</p>
                  <p className="text-muted-foreground">{delivery.pickupAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
                <div>
                  <p className="font-medium">Entrega</p>
                  <p className="text-muted-foreground">{delivery.deliveryAddress}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {delivery.packageWeight || 'N/A'} kg
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                ~{delivery.estimatedTimeMinutes || 'N/A'} min
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {delivery.distanceKm?.toFixed(1) || 'N/A'} km
              </span>
            </div>
          </div>

          <div className="text-right ml-4">
            <p className="text-sm text-muted-foreground">Você ganha</p>
            <p className="text-lg font-bold text-primary">{delivery.feeBzr} BZR</p>
          </div>
        </div>

        <Button
          onClick={() => navigate(`/app/delivery/active/${delivery.id}`)}
          className="w-full"
        >
          <Navigation className="h-4 w-4 mr-2" />
          Ver Entrega Ativa
        </Button>
      </CardContent>
    </Card>
  );
}
