import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { KPICard, QuickActionButton, GPSStatusIndicator } from '@/components/delivery';
import { useDeliveryProfile } from '@/hooks/useDeliveryProfile';
import { useGeolocation } from '@/hooks/useGeolocation';
import { deliveryApi } from '@/lib/api/delivery';
import type { DeliveryRequest, DeliveryProfileStats } from '@/types/delivery';
import { DeliveryRequestStatus } from '@/types/delivery';
import {
  Package,
  DollarSign,
  CheckCircle,
  Star,
  List,
  TrendingUp,
  History,
  Settings,
  MapPin,
  Store,
} from 'lucide-react';

export function DeliveryDashboardPage() {
  const navigate = useNavigate();

  // Profile hook
  const { profile, loading: isLoading } = useDeliveryProfile();

  // Geolocation hook - auto-start para entregadores
  const geolocation = useGeolocation(true);

  // Dashboard data
  const [stats, setStats] = useState<DeliveryProfileStats | null>(null);
  const [activeDeliveries, setActiveDeliveries] = useState<DeliveryRequest[]>([]);
  const [availableCount, setAvailableCount] = useState(0);

  // Loading states
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingActive, setIsLoadingActive] = useState(true);

  // Ref para evitar múltiplos carregamentos
  const hasLoadedWithGPS = useRef(false);

  const loadDashboardData = useCallback(async () => {
    try {
      // Load stats
      setIsLoadingStats(true);
      const statsData = await deliveryApi.getStats();
      setStats(statsData);

      // Load active deliveries
      setIsLoadingActive(true);
      const activeData = await deliveryApi.listRequests({
        status: [
          DeliveryRequestStatus.ACCEPTED,
          DeliveryRequestStatus.PICKED_UP,
          DeliveryRequestStatus.IN_TRANSIT,
        ],
      });
      setActiveDeliveries(activeData);

      // Load available deliveries count WITH location filtering
      const availableData = await deliveryApi.listRequests({
        status: [DeliveryRequestStatus.PENDING],
        lat: geolocation.location?.lat,
        lng: geolocation.location?.lng,
        radius: profile?.serviceRadius || 10,
      });
      setAvailableCount(availableData.length);
    } catch (error: any) {
      toast.error(`Erro ao carregar dados: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsLoadingStats(false);
      setIsLoadingActive(false);
    }
  }, [geolocation.location, profile?.serviceRadius]);

  // Carregar dados quando o profile estiver disponível
  useEffect(() => {
    if (profile && !geolocation.isEnabled) {
      // Carregar sem GPS se não estiver habilitado
      loadDashboardData();
    }
  }, [profile, geolocation.isEnabled, loadDashboardData]);

  // Carregar dados apenas UMA VEZ quando GPS for habilitado
  useEffect(() => {
    if (profile && geolocation.isEnabled && geolocation.location && !hasLoadedWithGPS.current) {
      hasLoadedWithGPS.current = true;
      loadDashboardData();
    }
  }, [profile, geolocation.isEnabled, geolocation.location, loadDashboardData]);

  const handleToggleAvailability = async (isAvailable: boolean) => {
    try {
      await deliveryApi.updateAvailability(isAvailable);
      toast.success(
        isAvailable
          ? 'Você está online. Você pode receber entregas agora'
          : 'Você está offline. Você não receberá novas entregas'
      );
      // Reload profile to get updated state
      window.location.reload();
    } catch (error: any) {
      toast.error(`Erro ao atualizar status: ${error.message || 'Erro desconhecido'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Carregando perfil...</p>
      </div>
    );
  }

  if (!profile) {
    // Redirect to setup if no profile
    navigate('/app/delivery/profile/setup');
    return null;
  }

  const getVehicleIcon = () => {
    switch (profile.vehicleType) {
      case 'bike':
        return 'Bicicleta';
      case 'motorcycle':
        return 'Moto';
      case 'car':
        return 'Carro';
      case 'van':
        return 'Van';
      default:
        return profile.vehicleType;
    }
  };

  const getStatusBadge = (status: DeliveryRequestStatus) => {
    switch (status) {
      case DeliveryRequestStatus.ACCEPTED:
        return { variant: 'secondary' as const, label: 'Aceito' };
      case DeliveryRequestStatus.PICKED_UP:
        return { variant: 'default' as const, label: 'Coletado' };
      case DeliveryRequestStatus.IN_TRANSIT:
        return { variant: 'outline' as const, label: 'Em Trânsito' };
      default:
        return { variant: 'secondary' as const, label: status };
    }
  };

  const renderHeader = () => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile.profilePhoto || undefined} />
              <AvatarFallback className="text-xl">
                {profile.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{profile.fullName}</h2>
              <p className="text-sm text-muted-foreground">
                {getVehicleIcon()} • {profile.radiusKm}km de raio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {profile.isAvailable ? 'Online' : 'Offline'}
              </span>
              <Switch
                checked={profile.isAvailable}
                onCheckedChange={handleToggleAvailability}
              />
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/app/delivery/profile/edit')}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!profile.isAvailable && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md dark:bg-yellow-950 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Você está offline. Ative sua disponibilidade para receber entregas.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderKPIs = () => {
    if (isLoadingStats || !stats) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                  <div className="h-8 bg-muted rounded w-3/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<Package className="h-8 w-8" />}
          label="Entregas Hoje"
          value={stats.todayDeliveries || 0}
          badge={
            activeDeliveries.length > 0 ? `${activeDeliveries.length} ativas` : undefined
          }
        />

        <KPICard
          icon={<DollarSign className="h-8 w-8" />}
          label="Ganhos Hoje"
          value={`${stats.todayEarnings || '0'} BZR`}
          trend={stats.todayEarnings && stats.todayEarnings !== '0' ? `+${stats.todayEarnings} BZR` : undefined}
        />

        <KPICard
          icon={<CheckCircle className="h-8 w-8" />}
          label="Taxa de Conclusão"
          value={`${stats.completionRate || 0}%`}
          subtitle={`${stats.totalCompleted || 0} de ${stats.totalDeliveries || 0} entregas`}
        />

        <KPICard
          icon={<Star className="h-8 w-8" />}
          label="Avaliação Média"
          value={(stats.averageRating || 0).toFixed(1)}
          subtitle={`${stats.totalRatings || 0} avaliações`}
        />
      </div>
    );
  };

  const renderQuickActions = () => (
    <Card>
      <CardHeader>
        <CardTitle>Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <QuickActionButton
            icon={<List className="h-6 w-6" />}
            label="Demandas Disponíveis"
            badge={availableCount}
            onClick={() => navigate('/app/delivery/requests')}
          />

          <QuickActionButton
            icon={<MapPin className="h-6 w-6" />}
            label="Entregas Ativas"
            badge={activeDeliveries.length}
            onClick={() => {
              if (activeDeliveries.length === 1) {
                navigate(`/app/delivery/active/${activeDeliveries[0].id}`);
              } else {
                navigate('/app/delivery/active');
              }
            }}
          />

          <QuickActionButton
            icon={<Store className="h-6 w-6" />}
            label="Buscar Lojas"
            onClick={() => navigate('/app/delivery/stores')}
          />

          <QuickActionButton
            icon={<History className="h-6 w-6" />}
            label="Histórico"
            onClick={() => navigate('/app/delivery/history')}
          />

          <QuickActionButton
            icon={<TrendingUp className="h-6 w-6" />}
            label="Ganhos"
            onClick={() => navigate('/app/delivery/earnings')}
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderActiveDeliveries = () => {
    if (isLoadingActive) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Entregas Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>
      );
    }

    if (activeDeliveries.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Entregas Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma entrega ativa</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate('/app/delivery/requests')}
              >
                Ver Demandas Disponíveis
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Entregas Ativas</span>
            <Badge variant="secondary">{activeDeliveries.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeDeliveries.map((delivery) => {
            const statusInfo = getStatusBadge(delivery.status);
            return (
              <div
                key={delivery.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/app/delivery/active/${delivery.id}`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    <span className="text-sm text-muted-foreground">
                      #{delivery.id.slice(0, 8)}
                    </span>
                  </div>
                  <span className="font-semibold text-primary">
                    {delivery.totalBzr} BZR
                  </span>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">De:</span>
                    <span className="font-medium">
                      {delivery.pickupAddress.city}, {delivery.pickupAddress.state}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-600" />
                    <span className="text-muted-foreground">Para:</span>
                    <span className="font-medium">
                      {delivery.deliveryAddress.city}, {delivery.deliveryAddress.state}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{delivery.distance}km</span>
                    <span>~{delivery.estimatedTime}min</span>
                    <span>{delivery.packageType}</span>
                  </div>
                  <Button size="sm" variant="outline">
                    Continuar
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  const renderWeekStats = () => {
    if (isLoadingStats || !stats) return null;

    const weeklyDeliveries = stats.weeklyDeliveries || [];
    const maxCount = weeklyDeliveries.length > 0
      ? Math.max(...weeklyDeliveries.map((d) => d.count), 1)
      : 1;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Estatísticas da Semana</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Simple bar chart representation */}
          <div>
            <p className="text-sm text-muted-foreground mb-3">Entregas por Dia</p>
            <div className="space-y-2">
              {weeklyDeliveries.length > 0 ? (
                weeklyDeliveries.map((day) => (
                  <div key={day.day} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-12">
                      {day.day}
                    </span>
                    <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-primary h-full flex items-center justify-end pr-2"
                        style={{
                          width: `${(day.count / maxCount) * 100}%`,
                        }}
                      >
                        {day.count > 0 && (
                          <span className="text-xs text-primary-foreground font-medium">
                            {day.count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma entrega esta semana</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Summary metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total de KM</p>
              <p className="text-2xl font-bold">{(stats.weeklyKm || 0).toFixed(1)}km</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ganhos da Semana</p>
              <p className="text-2xl font-bold text-primary">{stats.weeklyEarnings || '0'} BZR</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard do Entregador</h1>
          <p className="text-muted-foreground">
            Gerencie suas entregas e acompanhe seus ganhos
          </p>
        </div>

        {/* GPS Status Alert */}
        <GPSStatusIndicator geolocation={geolocation} />

        {/* Header with Status */}
        {renderHeader()}

        {/* KPIs */}
        {renderKPIs()}

        {/* Quick Actions */}
        {renderQuickActions()}

        {/* Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Deliveries - 2 columns */}
          <div className="lg:col-span-2">{renderActiveDeliveries()}</div>

          {/* Week Stats - 1 column */}
          <div>{renderWeekStats()}</div>
        </div>
      </div>
    </div>
  );
}
