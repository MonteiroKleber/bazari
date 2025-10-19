import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { deliveryApi } from '@/lib/api/delivery';
import type { DeliveryRequest } from '@/types/delivery';
import { DeliveryRequestStatus } from '@/types/delivery';
import {
  ArrowLeft,
  MapPin,
  Package,
  Clock,
  DollarSign,
  User,
  Phone,
  CheckCircle,
  Navigation,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export function DeliveryRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [request, setRequest] = useState<DeliveryRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Accept dialog
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    if (id) {
      loadRequest();
    }
  }, [id]);

  const loadRequest = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await deliveryApi.getRequest(id);
      setRequest(data);
    } catch (error: any) {
      const errorMsg = error.message || 'Erro desconhecido';
      setError(errorMsg);
      toast.error(`Erro ao carregar demanda: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptDelivery = async () => {
    if (!id) return;

    try {
      setIsAccepting(true);
      await deliveryApi.acceptRequest(id);
      toast.success('Entrega aceita! Vá ao local de coleta.');
      // Navigate to active delivery
      navigate(`/app/delivery/active/${id}`);
    } catch (error: any) {
      const errorMsg = error.message || 'Erro desconhecido';
      toast.error(`Erro ao aceitar: ${errorMsg}`);
    } finally {
      setIsAccepting(false);
      setShowAcceptDialog(false);
    }
  };

  const getStatusBadgeVariant = (status: DeliveryRequestStatus) => {
    switch (status) {
      case DeliveryRequestStatus.PENDING:
        return 'secondary';
      case DeliveryRequestStatus.ACCEPTED:
        return 'default';
      case DeliveryRequestStatus.PICKED_UP:
      case DeliveryRequestStatus.IN_TRANSIT:
        return 'default';
      case DeliveryRequestStatus.DELIVERED:
        return 'default';
      case DeliveryRequestStatus.CANCELLED:
      case DeliveryRequestStatus.FAILED:
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: DeliveryRequestStatus) => {
    const labels: Record<DeliveryRequestStatus, string> = {
      [DeliveryRequestStatus.PENDING]: 'Pendente',
      [DeliveryRequestStatus.ACCEPTED]: 'Aceita',
      [DeliveryRequestStatus.PICKED_UP]: 'Coletada',
      [DeliveryRequestStatus.IN_TRANSIT]: 'Em Trânsito',
      [DeliveryRequestStatus.DELIVERED]: 'Entregue',
      [DeliveryRequestStatus.CANCELLED]: 'Cancelada',
      [DeliveryRequestStatus.FAILED]: 'Falhou',
    };
    return labels[status] || status;
  };

  const renderHeader = () => (
    <div className="mb-6">
      <Button
        variant="ghost"
        onClick={() => navigate('/app/delivery/requests')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar para Demandas
      </Button>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Detalhes da Demanda</h1>
          <p className="text-muted-foreground mt-1">
            ID: #{request?.id.slice(-8)}
          </p>
        </div>
        {request && (
          <Badge variant={getStatusBadgeVariant(request.status)}>
            {getStatusLabel(request.status)}
          </Badge>
        )}
      </div>
    </div>
  );

  const renderLocationCard = () => {
    if (!request) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Endereços
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pickup Location */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-3 w-3 rounded-full bg-primary" />
              <span className="font-semibold">Local de Coleta</span>
            </div>
            <div className="ml-5 text-sm">
              <p>{request.pickupAddress}</p>
              {request.pickupCity && request.pickupCountry && (
                <p className="text-muted-foreground">
                  {request.pickupCity}, {request.pickupCountry}
                </p>
              )}
              {request.pickupLatitude && request.pickupLongitude && (
                <p className="text-muted-foreground text-xs mt-1">
                  {request.pickupLatitude}, {request.pickupLongitude}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Delivery Location */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-3 w-3 rounded-full bg-destructive" />
              <span className="font-semibold">Local de Entrega</span>
            </div>
            <div className="ml-5 text-sm">
              <p>{request.deliveryAddress}</p>
              {request.deliveryCity && request.deliveryCountry && (
                <p className="text-muted-foreground">
                  {request.deliveryCity}, {request.deliveryCountry}
                </p>
              )}
              {request.deliveryLatitude && request.deliveryLongitude && (
                <p className="text-muted-foreground text-xs mt-1">
                  {request.deliveryLatitude}, {request.deliveryLongitude}
                </p>
              )}
            </div>
          </div>

          {request.distanceKm && (
            <div className="bg-muted rounded-lg p-3 mt-4">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Distância estimada: {request.distanceKm.toFixed(2)} km
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderPackageCard = () => {
    if (!request) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Informações do Pacote
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Descrição</p>
              <p className="font-medium">
                {request.packageDescription || 'Não especificada'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Peso</p>
              <p className="font-medium">
                {request.packageWeight ? `${request.packageWeight} kg` : 'Não especificado'}
              </p>
            </div>
          </div>

          {request.specialInstructions && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-3">
              <p className="text-sm font-medium mb-1">Instruções Especiais:</p>
              <p className="text-sm">{request.specialInstructions}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderRequesterCard = () => {
    if (!request) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Solicitante
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={request.requester?.avatarUrl || undefined} />
              <AvatarFallback>
                {request.requester?.displayName?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">
                {request.requester?.displayName || 'Usuário'}
              </p>
              <p className="text-sm text-muted-foreground">
                @{request.requester?.handle || 'desconhecido'}
              </p>
            </div>
          </div>

          {request.requesterPhone && (
            <div className="flex items-center gap-2 mt-4 p-3 bg-muted rounded-lg">
              <Phone className="h-4 w-4" />
              <span className="text-sm font-medium">{request.requesterPhone}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderPaymentCard = () => {
    if (!request) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Taxa de Entrega</span>
            <span className="font-semibold text-lg">
              {request.feeBzr} BZR
            </span>
          </div>

          {request.estimatedTimeMinutes && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span className="text-muted-foreground">
                Tempo estimado: {request.estimatedTimeMinutes} minutos
              </span>
            </div>
          )}

          {request.status === DeliveryRequestStatus.PENDING && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 mt-3">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                💰 Você receberá {request.feeBzr} BZR ao completar esta entrega
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderActions = () => {
    if (!request) return null;

    if (request.status === DeliveryRequestStatus.PENDING) {
      return (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="flex-1"
                size="lg"
                onClick={() => setShowAcceptDialog(true)}
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Aceitar Entrega
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/app/delivery/requests')}
              >
                Ver Outras Demandas
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (request.status === DeliveryRequestStatus.ACCEPTED) {
      return (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium">
                ℹ️ Você aceitou esta entrega. Vá ao local de coleta para pegar o pacote.
              </p>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={() => navigate(`/app/delivery/active/${request.id}`)}
            >
              <Navigation className="h-5 w-5 mr-2" />
              Iniciar Navegação
            </Button>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  const renderAcceptDialog = () => (
    <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Aceitar esta entrega?</AlertDialogTitle>
          <AlertDialogDescription>
            Ao aceitar, você se compromete a coletar o pacote no local de coleta e
            entregá-lo no destino. A taxa de <strong>{request?.feeBzr} BZR</strong> será
            creditada após a conclusão.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isAccepting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleAcceptDelivery}
            disabled={isAccepting}
          >
            {isAccepting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Aceitando...
              </>
            ) : (
              'Aceitar Entrega'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/app/delivery/requests')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Erro ao carregar demanda
            </h3>
            <p className="text-muted-foreground">
              {error || 'Demanda não encontrada'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {renderHeader()}

      <div className="space-y-4">
        {renderLocationCard()}
        {renderPackageCard()}
        {renderRequesterCard()}
        {renderPaymentCard()}
        {renderActions()}
      </div>

      {renderAcceptDialog()}
    </div>
  );
}
