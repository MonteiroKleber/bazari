import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useDeliveryProfile } from '@/hooks/useDeliveryProfile';
import { useGeolocation } from '@/hooks/useGeolocation';
import { GPSStatusIndicator } from '@/components/delivery';
import { deliveryApi } from '@/lib/api/delivery';
import type { DeliveryRequest } from '@/types/delivery';
import { DeliveryRequestStatus, PackageType } from '@/types/delivery';
import {
  ArrowLeft,
  MapPin,
  Package,
  Filter,
  RefreshCw,
  Clock,
} from 'lucide-react';

export function DeliveryRequestsListPage() {
  const navigate = useNavigate();
  const { profile } = useDeliveryProfile();
  const geolocation = useGeolocation(true);

  // Data
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<DeliveryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState<string | null>(null);

  // Filters
  const [maxDistance, setMaxDistance] = useState(50);
  const [minValue, setMinValue] = useState('');
  const [selectedPackageTypes, setSelectedPackageTypes] = useState<PackageType[]>([
    PackageType.DOCUMENT,
    PackageType.ENVELOPE,
    PackageType.SMALL,
    PackageType.MEDIUM,
    PackageType.LARGE,
    PackageType.FRAGILE,
    PackageType.PERISHABLE,
    // Legacy support - aceita demandas antigas do banco
    PackageType.SMALL_BOX,
    PackageType.MEDIUM_BOX,
    PackageType.LARGE_BOX,
  ]);

  // Sorting
  const [sortBy, setSortBy] = useState<'distance' | 'value' | 'recent'>('distance');

  // Auto-refresh
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const hasLoadedWithGPS = useRef(false);

  const loadRequests = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);

      const data = await deliveryApi.listRequests({
        status: [DeliveryRequestStatus.PENDING],
        lat: geolocation.location?.lat,
        lng: geolocation.location?.lng,
        radius: maxDistance,
      });

      setRequests(data);
      setLastUpdate(new Date());
    } catch (error: any) {
      toast.error(`Erro ao carregar demandas: ${error.message || 'Erro desconhecido'}`);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [geolocation.location, maxDistance]);

  const applyFiltersAndSort = useCallback(() => {
    let filtered = requests.filter((req) => {
      // Distance filter
      if (req.distance > maxDistance) return false;

      // Value filter
      if (minValue && parseFloat(req.totalBzr) < parseFloat(minValue)) return false;

      // Package type filter
      if (!selectedPackageTypes.includes(req.packageType as PackageType)) return false;

      return true;
    });

    // Sort
    if (sortBy === 'distance') {
      filtered.sort((a, b) => a.distance - b.distance);
    } else if (sortBy === 'value') {
      filtered.sort((a, b) => parseFloat(b.totalBzr) - parseFloat(a.totalBzr));
    } else if (sortBy === 'recent') {
      filtered.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    setFilteredRequests(filtered);
  }, [requests, maxDistance, minValue, selectedPackageTypes, sortBy]);

  // Carregar requisições na montagem e configurar auto-refresh
  useEffect(() => {
    loadRequests();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadRequests(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [loadRequests]);

  // Aplicar filtros quando as requisições ou filtros mudarem
  useEffect(() => {
    applyFiltersAndSort();
  }, [applyFiltersAndSort]);

  // Recarregar apenas UMA VEZ quando GPS for habilitado
  useEffect(() => {
    if (geolocation.isEnabled && geolocation.location && !hasLoadedWithGPS.current) {
      hasLoadedWithGPS.current = true;
      loadRequests(true);
    }
  }, [geolocation.isEnabled, geolocation.location, loadRequests]);

  const handleAcceptRequest = async (requestId: string) => {
    try {
      setIsAccepting(requestId);
      const accepted = await deliveryApi.acceptRequest(requestId);
      toast.success(`Entrega aceita! #${accepted.id.slice(0, 8)}`);
      navigate(`/app/delivery/active/${accepted.id}`);
    } catch (error: any) {
      toast.error(`Erro ao aceitar entrega: ${error.message || 'Erro desconhecido'}`);
      setIsAccepting(null);
    }
  };

  const togglePackageType = (type: PackageType) => {
    setSelectedPackageTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const getPackageTypeLabel = (type: PackageType) => {
    switch (type) {
      case PackageType.DOCUMENT:
        return 'Documento';
      case PackageType.SMALL:
        return 'Pequeno';
      case PackageType.MEDIUM:
        return 'Médio';
      case PackageType.LARGE:
        return 'Grande';
      default:
        return type;
    }
  };

  const renderHeader = () => (
    <div className="mb-6">
      <Button
        variant="ghost"
        onClick={() => navigate('/app/delivery/dashboard')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Demandas Disponíveis</h1>
          <p className="text-muted-foreground">
            {filteredRequests.length} entrega(s) disponível(is)
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <Clock className="inline h-4 w-4 mr-1" />
            Atualizado às {lastUpdate.toLocaleTimeString('pt-BR')}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadRequests()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>
    </div>
  );

  const renderFilters = () => (
    <Card className="mb-6 lg:mb-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros e Ordenação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Distance Filter */}
        <div>
          <Label htmlFor="maxDistance">Distância Máxima: {maxDistance}km</Label>
          <Slider
            id="maxDistance"
            min={1}
            max={50}
            step={1}
            value={[maxDistance]}
            onValueChange={(val) => setMaxDistance(val[0])}
            className="mt-2"
          />
        </div>

        {/* Value Filter */}
        <div>
          <Label htmlFor="minValue">Valor Mínimo (BZR)</Label>
          <Input
            id="minValue"
            type="number"
            step="0.1"
            placeholder="Ex: 10"
            value={minValue}
            onChange={(e) => setMinValue(e.target.value)}
          />
        </div>

        {/* Package Type Filter */}
        <div>
          <Label className="mb-3 block">Tipo de Pacote</Label>
          <div className="grid grid-cols-1 gap-2">
            {[
              { value: PackageType.DOCUMENT, label: 'Documento' },
              { value: PackageType.SMALL, label: 'Pequeno' },
              { value: PackageType.MEDIUM, label: 'Médio' },
              { value: PackageType.LARGE, label: 'Grande' },
            ].map((type) => (
              <div key={type.value} className="flex items-center space-x-2">
                <Checkbox
                  id={type.value}
                  checked={selectedPackageTypes.includes(type.value)}
                  onCheckedChange={() => togglePackageType(type.value)}
                />
                <Label htmlFor={type.value} className="cursor-pointer font-normal">
                  {type.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Sorting */}
        <div>
          <Label htmlFor="sortBy">Ordenar por</Label>
          <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
            <SelectTrigger id="sortBy">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="distance">Mais Próximas</SelectItem>
              <SelectItem value="value">Maior Valor</SelectItem>
              <SelectItem value="recent">Mais Recentes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );

  const renderRequestsList = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (filteredRequests.length === 0) {
      return (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma entrega disponível</h3>
            <p className="text-muted-foreground mb-4">
              {requests.length === 0
                ? 'Não há demandas no momento. Volte mais tarde!'
                : 'Ajuste os filtros para ver mais resultados'}
            </p>
            {requests.length > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  setMaxDistance(50);
                  setMinValue('');
                  setSelectedPackageTypes([
                    PackageType.DOCUMENT,
                    PackageType.SMALL,
                    PackageType.MEDIUM,
                    PackageType.LARGE,
                  ]);
                }}
              >
                Limpar Filtros
              </Button>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {filteredRequests.map((request) => (
          <Card
            key={request.id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
          >
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-4">
                <div className="flex-1 w-full">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="capitalize">
                      {getPackageTypeLabel(request.packageType as PackageType)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      #{request.id.slice(0, 8)}
                    </span>
                  </div>

                  {/* Route */}
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">De:</span>
                      <span className="font-medium">
                        {request.pickupAddress.neighborhood || request.pickupAddress.city}
                        , {request.pickupAddress.state}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-green-600" />
                      <span className="text-muted-foreground">Para:</span>
                      <span className="font-medium">
                        {request.deliveryAddress.neighborhood ||
                          request.deliveryAddress.city}
                        , {request.deliveryAddress.state}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{request.distance.toFixed(1)}km</span>
                    <span>~{request.estimatedTime}min</span>
                    <span>{request.weight}kg</span>
                  </div>
                </div>

                {/* Value and Action */}
                <div className="text-right w-full md:w-auto md:ml-4">
                  <div className="mb-3">
                    <p className="text-sm text-muted-foreground">Você ganha</p>
                    <p className="text-2xl font-bold text-primary">
                      {request.totalBzr} BZR
                    </p>
                  </div>

                  <Button
                    onClick={() => handleAcceptRequest(request.id)}
                    disabled={isAccepting === request.id}
                    className="w-full"
                  >
                    {isAccepting === request.id ? 'Aceitando...' : 'Aceitar Entrega'}
                  </Button>
                </div>
              </div>

              {/* Special Instructions */}
              {request.specialInstructions && (
                <div className="border-t pt-3 mt-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Instruções Especiais:
                  </p>
                  <p className="text-sm">{request.specialInstructions}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (!profile || !profile.isAvailable) {
    return (
      <div className="container max-w-4xl mx-auto py-2 md:py-3 px-4">
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
          <CardContent className="pt-6 text-center py-12">
            <h2 className="text-xl font-bold text-yellow-900 dark:text-yellow-200 mb-2">
              Você está offline
            </h2>
            <p className="text-yellow-800 dark:text-yellow-300 mb-4">
              Ative sua disponibilidade no dashboard para ver demandas
            </p>
            <Button onClick={() => navigate('/app/delivery/dashboard')}>
              Ir para Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-2 md:py-3 px-4">
      {renderHeader()}

      {/* GPS Status */}
      <div className="mb-6">
        <GPSStatusIndicator geolocation={geolocation} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters - 1 column */}
        <div className="lg:col-span-1">{renderFilters()}</div>

        {/* Requests List - 2 columns */}
        <div className="lg:col-span-2">{renderRequestsList()}</div>
      </div>
    </div>
  );
}
