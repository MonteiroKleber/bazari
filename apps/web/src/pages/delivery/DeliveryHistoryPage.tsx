import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { deliveryApi } from '@/lib/api/delivery';
import type { DeliveryRequest } from '@/types/delivery';
import { DeliveryRequestStatus } from '@/types/delivery';
import {
  ArrowLeft,
  Package,
  MapPin,
  Clock,
  DollarSign,
  Star,
  Filter,
  Calendar,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

type FilterStatus = 'all' | 'delivered' | 'cancelled' | 'failed';
type SortBy = 'date_desc' | 'date_asc' | 'value_desc' | 'value_asc';

export function DeliveryHistoryPage() {
  const navigate = useNavigate();

  // Filters
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('date_desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Data
  const [deliveries, setDeliveries] = useState<DeliveryRequest[]>([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState<DeliveryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    totalEarnings: 0,
    averageRating: 0,
    completionRate: 0,
  });

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [deliveries, filterStatus, sortBy, searchQuery, startDate, endDate]);

  const loadHistory = async () => {
    try {
      setIsLoading(true);

      // Load completed deliveries
      const delivered = await deliveryApi.listRequests({
        status: [DeliveryRequestStatus.DELIVERED],
      });

      // Load cancelled deliveries
      const cancelled = await deliveryApi.listRequests({
        status: [DeliveryRequestStatus.CANCELLED],
      });

      // Load failed deliveries
      const failed = await deliveryApi.listRequests({
        status: [DeliveryRequestStatus.FAILED],
      });

      const allDeliveries = [...delivered, ...cancelled, ...failed];
      setDeliveries(allDeliveries);

      // Calculate stats
      const totalDelivered = delivered.length;
      const totalEarnings = delivered.reduce(
        (sum, d) => sum + parseFloat(d.feeBzr || '0'),
        0
      );
      const ratingsCount = delivered.filter((d) => d.rating).length;
      const avgRating =
        ratingsCount > 0
          ? delivered.reduce((sum, d) => sum + (d.rating || 0), 0) / ratingsCount
          : 0;
      const completionRate =
        allDeliveries.length > 0 ? (totalDelivered / allDeliveries.length) * 100 : 0;

      setStats({
        totalDeliveries: totalDelivered,
        totalEarnings: totalEarnings,
        averageRating: avgRating,
        completionRate: completionRate,
      });
    } catch (error: any) {
      toast.error(`Erro ao carregar histórico: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...deliveries];

    // Status filter
    if (filterStatus === 'delivered') {
      filtered = filtered.filter((d) => d.status === DeliveryRequestStatus.DELIVERED);
    } else if (filterStatus === 'cancelled') {
      filtered = filtered.filter((d) => d.status === DeliveryRequestStatus.CANCELLED);
    } else if (filterStatus === 'failed') {
      filtered = filtered.filter((d) => d.status === DeliveryRequestStatus.FAILED);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.id.toLowerCase().includes(query) ||
          d.pickupAddress?.toLowerCase().includes(query) ||
          d.deliveryAddress?.toLowerCase().includes(query)
      );
    }

    // Date filters
    if (startDate) {
      const start = new Date(startDate).getTime();
      filtered = filtered.filter((d) => {
        const deliveryDate = new Date(d.deliveredAt || d.updatedAt || d.createdAt).getTime();
        return deliveryDate >= start;
      });
    }
    if (endDate) {
      const end = new Date(endDate).getTime() + 86400000; // Add 1 day
      filtered = filtered.filter((d) => {
        const deliveryDate = new Date(d.deliveredAt || d.updatedAt || d.createdAt).getTime();
        return deliveryDate <= end;
      });
    }

    // Sort
    if (sortBy === 'date_desc') {
      filtered.sort((a, b) => {
        const dateA = new Date(a.deliveredAt || a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.deliveredAt || b.updatedAt || b.createdAt).getTime();
        return dateB - dateA;
      });
    } else if (sortBy === 'date_asc') {
      filtered.sort((a, b) => {
        const dateA = new Date(a.deliveredAt || a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.deliveredAt || b.updatedAt || b.createdAt).getTime();
        return dateA - dateB;
      });
    } else if (sortBy === 'value_desc') {
      filtered.sort((a, b) => parseFloat(b.feeBzr || '0') - parseFloat(a.feeBzr || '0'));
    } else if (sortBy === 'value_asc') {
      filtered.sort((a, b) => parseFloat(a.feeBzr || '0') - parseFloat(b.feeBzr || '0'));
    }

    setFilteredDeliveries(filtered);
  };

  const getStatusBadge = (status: DeliveryRequestStatus) => {
    switch (status) {
      case DeliveryRequestStatus.DELIVERED:
        return <Badge className="bg-green-600">Entregue</Badge>;
      case DeliveryRequestStatus.CANCELLED:
        return <Badge variant="destructive">Cancelada</Badge>;
      case DeliveryRequestStatus.FAILED:
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderHeader = () => (
    <div className="mb-6">
      <Button
        variant="ghost"
        onClick={() => navigate('/app/delivery/dashboard')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar ao Dashboard
      </Button>
      <div>
        <h1 className="text-3xl font-bold">Histórico de Entregas</h1>
        <p className="text-muted-foreground mt-1">
          Veja todas as entregas que você realizou
        </p>
      </div>
    </div>
  );

  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Entregas</p>
              <p className="text-2xl font-bold">{stats.totalDeliveries}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600/10 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Ganhos</p>
              <p className="text-2xl font-bold">{stats.totalEarnings.toFixed(2)} BZR</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-600/10 rounded-lg">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avaliação Média</p>
              <p className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Taxa de Conclusão</p>
              <p className="text-2xl font-bold">{stats.completionRate.toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderFilters = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="delivered">Entregues</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
                <SelectItem value="failed">Falhadas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="sort">Ordenar por</Label>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <SelectTrigger id="sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Data (mais recente)</SelectItem>
                <SelectItem value="date_asc">Data (mais antiga)</SelectItem>
                <SelectItem value="value_desc">Valor (maior)</SelectItem>
                <SelectItem value="value_asc">Valor (menor)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="startDate">Data Início</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="endDate">Data Fim</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="search">Buscar</Label>
            <Input
              id="search"
              placeholder="ID ou endereço..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderDeliveriesList = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (filteredDeliveries.length === 0) {
      return (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma entrega encontrada</h3>
            <p className="text-muted-foreground">
              {deliveries.length === 0
                ? 'Você ainda não completou nenhuma entrega'
                : 'Tente ajustar os filtros'}
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {filteredDeliveries.map((delivery) => (
          <Card
            key={delivery.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate(`/app/delivery/requests/${delivery.id}`)}
          >
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm text-muted-foreground">
                      #{delivery.id.slice(-8)}
                    </span>
                    {getStatusBadge(delivery.status)}
                    {delivery.rating && (
                      <Badge variant="outline" className="gap-1">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        {delivery.rating.toFixed(1)}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-medium">{delivery.pickupAddress}</p>
                      <p className="text-muted-foreground">→ {delivery.deliveryAddress}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(delivery.deliveredAt || delivery.updatedAt || delivery.createdAt)}
                    </span>
                    {delivery.distanceKm && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {delivery.distanceKm.toFixed(1)} km
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Ganho</p>
                    <p className="text-lg font-bold text-green-600">
                      {delivery.feeBzr} BZR
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="container max-w-6xl mx-auto py-2 md:py-3 px-4">
      {renderHeader()}
      {renderStats()}
      {renderFilters()}
      {renderDeliveriesList()}
    </div>
  );
}
