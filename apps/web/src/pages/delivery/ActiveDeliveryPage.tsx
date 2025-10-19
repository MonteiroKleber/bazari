import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  AddressCard,
  FeeBreakdownCard,
  DeliveryStatusTimeline,
} from '@/components/delivery';
import { deliveryApi } from '@/lib/api/delivery';
import type { DeliveryRequest, Address } from '@/types/delivery';
import { DeliveryRequestStatus } from '@/types/delivery';
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Navigation,
  CheckCircle,
  XCircle,
  Clock,
  Package,
} from 'lucide-react';

export function ActiveDeliveryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Delivery data
  const [delivery, setDelivery] = useState<DeliveryRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Action states
  const [isConfirmingPickup, setIsConfirmingPickup] = useState(false);
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  // Cancel dialog
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Timer
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!id) {
      navigate('/app/delivery/dashboard');
      return;
    }
    loadDelivery();
  }, [id, navigate]);

  // Timer effect
  useEffect(() => {
    if (
      !delivery ||
      delivery.status === DeliveryRequestStatus.DELIVERED ||
      delivery.status === DeliveryRequestStatus.CANCELLED
    ) {
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [delivery]);

  const loadDelivery = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      const data = await deliveryApi.getRequest(id);
      setDelivery(data);

      // Calculate elapsed time
      const startTime = new Date(data.acceptedAt || data.createdAt).getTime();
      const now = Date.now();
      setElapsedTime(Math.floor((now - startTime) / 1000));
    } catch (error: any) {
      toast.error(`Erro ao carregar entrega: ${error.message || 'Erro desconhecido'}`);
      navigate('/app/delivery/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPickup = async () => {
    if (!id) return;

    try {
      setIsConfirmingPickup(true);
      const updated = await deliveryApi.confirmPickup(id);
      setDelivery(updated);
      toast.success('Coleta confirmada. Agora você pode entregar o pacote');
    } catch (error: any) {
      toast.error(`Erro ao confirmar coleta: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsConfirmingPickup(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!id) return;

    try {
      setIsConfirmingDelivery(true);
      const updated = await deliveryApi.confirmDelivery(id);
      setDelivery(updated);
      toast.success(`Entrega concluída! Você ganhou ${delivery?.totalBzr} BZR`);
    } catch (error: any) {
      toast.error(`Erro ao confirmar entrega: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsConfirmingDelivery(false);
    }
  };

  const handleCancelDelivery = async () => {
    if (!id) return;

    if (!cancelReason.trim()) {
      toast.error('Informe o motivo do cancelamento');
      return;
    }

    try {
      setIsCanceling(true);
      await deliveryApi.cancelRequest(id, cancelReason);
      toast.success('Entrega cancelada. Você não receberá por esta entrega');
      navigate('/app/delivery/dashboard');
    } catch (error: any) {
      toast.error(`Erro ao cancelar: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsCanceling(false);
      setShowCancelDialog(false);
    }
  };

  const openNavigation = (address: Address) => {
    const query = `${address.street}, ${address.number}, ${address.city}, ${address.state}`;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      query
    )}`;
    window.open(url, '_blank');
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getStatusLabel = (status: DeliveryRequestStatus) => {
    switch (status) {
      case DeliveryRequestStatus.ACCEPTED:
        return 'Aguardando coleta';
      case DeliveryRequestStatus.PICKED_UP:
        return 'Pacote coletado';
      case DeliveryRequestStatus.IN_TRANSIT:
        return 'Em trânsito';
      case DeliveryRequestStatus.DELIVERED:
        return 'Entregue com sucesso';
      case DeliveryRequestStatus.CANCELLED:
        return 'Cancelado';
      default:
        return status;
    }
  };

  const renderHeader = () => {
    if (!delivery) return null;

    return (
      <>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate('/app/delivery/dashboard')}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold">Entrega #{delivery.id.slice(0, 8)}</h1>
            <p className="text-muted-foreground">{getStatusLabel(delivery.status)}</p>
          </div>

          <div className="text-right">
            <p className="text-sm text-muted-foreground">Tempo decorrido</p>
            <p className="text-2xl font-bold">
              <Clock className="inline h-5 w-5 mr-1" />
              {formatTime(elapsedTime)}
            </p>
          </div>
        </div>

        {/* Timeline */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <DeliveryStatusTimeline
              currentStatus={delivery.status}
              timestamps={{
                createdAt: delivery.createdAt,
                acceptedAt: delivery.acceptedAt,
                pickedUpAt: delivery.pickedUpAt,
                deliveredAt: delivery.deliveredAt,
              }}
            />
          </CardContent>
        </Card>
      </>
    );
  };

  const renderAddresses = () => {
    if (!delivery) return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pickup Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Coleta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AddressCard
              title="Endereço de Coleta"
              address={delivery.pickupAddress}
              contact={delivery.pickupContact}
            />

            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" asChild>
                <a href={`tel:${delivery.pickupContact.phone}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  Ligar
                </a>
              </Button>
              <Button size="sm" variant="outline" className="flex-1" asChild>
                <a
                  href={`https://wa.me/${delivery.pickupContact.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </a>
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => openNavigation(delivery.pickupAddress)}
              >
                <Navigation className="h-4 w-4" />
              </Button>
            </div>

            {delivery.status === DeliveryRequestStatus.ACCEPTED && (
              <Button
                onClick={handleConfirmPickup}
                disabled={isConfirmingPickup}
                className="w-full"
              >
                {isConfirmingPickup ? (
                  'Confirmando...'
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmar Coleta
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Delivery Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Entrega</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AddressCard
              title="Endereço de Entrega"
              address={delivery.deliveryAddress}
              contact={delivery.deliveryContact}
            />

            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" asChild>
                <a href={`tel:${delivery.deliveryContact.phone}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  Ligar
                </a>
              </Button>
              <Button size="sm" variant="outline" className="flex-1" asChild>
                <a
                  href={`https://wa.me/${delivery.deliveryContact.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </a>
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => openNavigation(delivery.deliveryAddress)}
              >
                <Navigation className="h-4 w-4" />
              </Button>
            </div>

            {(delivery.status === DeliveryRequestStatus.PICKED_UP ||
              delivery.status === DeliveryRequestStatus.IN_TRANSIT) && (
              <Button
                onClick={handleConfirmDelivery}
                disabled={isConfirmingDelivery}
                className="w-full"
              >
                {isConfirmingDelivery ? (
                  'Confirmando...'
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmar Entrega
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderPackageDetails = () => {
    if (!delivery) return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Package Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Detalhes do Pacote
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo:</span>
              <span className="font-medium capitalize">{delivery.packageType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Peso:</span>
              <span className="font-medium">{delivery.weight}kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Distância:</span>
              <span className="font-medium">{delivery.distance}km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tempo estimado:</span>
              <span className="font-medium">~{delivery.estimatedTime}min</span>
            </div>

            {delivery.specialInstructions && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Instruções Especiais:
                  </p>
                  <p className="text-sm">{delivery.specialInstructions}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Fee Breakdown */}
        <FeeBreakdownCard
          feeResult={{
            totalBzr: delivery.totalBzr,
            distance: delivery.distance,
            estimatedTime: delivery.estimatedTime,
            breakdown: delivery.breakdown,
          }}
        />
      </div>
    );
  };

  const renderActions = () => {
    if (
      !delivery ||
      delivery.status === DeliveryRequestStatus.DELIVERED ||
      delivery.status === DeliveryRequestStatus.CANCELLED
    ) {
      return null;
    }

    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-red-900 dark:text-red-200">
                Problemas com a entrega?
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                Você pode cancelar, mas não receberá pagamento
              </p>
            </div>
            <Button variant="destructive" onClick={() => setShowCancelDialog(true)}>
              <XCircle className="h-4 w-4 mr-2" />
              Cancelar Entrega
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCancelDialog = () => (
    <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar Entrega</DialogTitle>
          <DialogDescription>
            Informe o motivo do cancelamento. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="cancelReason">Motivo do Cancelamento *</Label>
            <Textarea
              id="cancelReason"
              placeholder="Ex: Endereço incorreto, cliente não atende..."
              rows={4}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowCancelDialog(false)}
            disabled={isCanceling}
          >
            Voltar
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancelDelivery}
            disabled={isCanceling || !cancelReason.trim()}
          >
            {isCanceling ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderCompleted = () => {
    if (!delivery || delivery.status !== DeliveryRequestStatus.DELIVERED) return null;

    return (
      <Card className="border-green-500 bg-green-50 dark:bg-green-950 dark:border-green-800">
        <CardContent className="pt-6 text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-900 dark:text-green-200 mb-2">
            Entrega Concluída!
          </h2>
          <p className="text-green-700 dark:text-green-300 mb-4">
            Você ganhou <strong>{delivery.totalBzr} BZR</strong> por esta entrega
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="outline"
              onClick={() => navigate('/app/delivery/dashboard')}
            >
              Voltar ao Dashboard
            </Button>
            <Button onClick={() => navigate('/app/delivery/requests')}>
              Ver Novas Demandas
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Carregando entrega...</p>
      </div>
    );
  }

  if (!delivery) {
    return null;
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {renderHeader()}

      {delivery.status === DeliveryRequestStatus.DELIVERED ? (
        renderCompleted()
      ) : (
        <>
          {renderAddresses()}
          {renderPackageDetails()}
          {renderActions()}
        </>
      )}

      {renderCancelDialog()}
    </div>
  );
}
