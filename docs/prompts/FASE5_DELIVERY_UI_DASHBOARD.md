# FASE 5 - DASHBOARD DO ENTREGADOR

## 🎯 OBJETIVO

Criar o dashboard principal do entregador (DeliveryDashboardPage) com:
- KPIs principais (entregas hoje, ganhos, taxa de conclusão)
- Status de disponibilidade (toggle online/offline)
- Ações rápidas (ver demandas, entregas ativas, histórico)
- Lista de entregas ativas
- Estatísticas da semana

**Rota:** `/app/delivery/dashboard`

**Tempo estimado:** 2-3 horas

---

## 📋 COMPONENTES DO DASHBOARD

### Seção 1: Header com Status
- Avatar e nome do entregador
- Toggle de disponibilidade (online/offline)
- Botão de editar perfil

### Seção 2: KPIs
- Entregas hoje
- Ganhos de hoje (BZR)
- Taxa de conclusão (%)
- Avaliação média

### Seção 3: Quick Actions
- Ver Demandas Disponíveis (badge com quantidade)
- Entregas Ativas (badge com quantidade)
- Histórico
- Ganhos

### Seção 4: Entregas Ativas
- Lista de entregas em andamento
- Status de cada entrega
- Ação rápida para continuar

### Seção 5: Estatísticas da Semana
- Gráfico simples de entregas por dia
- Total de km percorridos
- Total de ganhos da semana

---

## 📂 ARQUIVO PRINCIPAL

**Arquivo:** `apps/web/src/pages/DeliveryDashboardPage.tsx`

### Imports

```typescript
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { KPICard, QuickActionButton } from '@/components/delivery';
import { useDeliveryProfile } from '@/hooks/useDeliveryProfile';
import { deliveryApi } from '@/lib/api/delivery';
import type { DeliveryRequest, DeliveryStats } from '@/types/delivery';
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
  Clock,
} from 'lucide-react';
```

---

## 🏗️ ESTRUTURA DO COMPONENTE

### State Management

```typescript
export default function DeliveryDashboardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Profile hook
  const { profile, isLoading, updateAvailability } = useDeliveryProfile();

  // Dashboard data
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [activeDeliveries, setActiveDeliveries] = useState<DeliveryRequest[]>([]);
  const [availableCount, setAvailableCount] = useState(0);

  // Loading states
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingActive, setIsLoadingActive] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load stats
      setIsLoadingStats(true);
      const statsData = await deliveryApi.getStats();
      setStats(statsData);

      // Load active deliveries
      setIsLoadingActive(true);
      const activeData = await deliveryApi.listRequests({
        status: ['accepted', 'picked_up', 'in_transit'],
      });
      setActiveDeliveries(activeData);

      // Load available deliveries count
      const availableData = await deliveryApi.listRequests({
        status: ['pending'],
      });
      setAvailableCount(availableData.length);
    } catch (error) {
      toast({
        title: 'Erro ao carregar dados',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingStats(false);
      setIsLoadingActive(false);
    }
  };

  const handleToggleAvailability = async (isAvailable: boolean) => {
    try {
      await updateAvailability(isAvailable);
      toast({
        title: isAvailable ? 'Você está online' : 'Você está offline',
        description: isAvailable
          ? 'Você pode receber entregas agora'
          : 'Você não receberá novas entregas',
      });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar status',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
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

  // ... render below
}
```

---

## 🎨 RENDER - HEADER COM STATUS

```tsx
const renderHeader = () => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
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
              {profile.vehicleType === 'bike' && '🚴 Bicicleta'}
              {profile.vehicleType === 'motorcycle' && '🏍️ Moto'}
              {profile.vehicleType === 'car' && '🚗 Carro'}
              {profile.vehicleType === 'van' && '🚐 Van'}
              {' • '}
              {profile.radiusKm}km de raio
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
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            ⚠️ Você está offline. Ative sua disponibilidade para receber entregas.
          </p>
        </div>
      )}
    </CardContent>
  </Card>
);
```

---

## 🎨 RENDER - KPIs

```tsx
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
        value={stats.todayDeliveries}
        badge={
          activeDeliveries.length > 0 ? `${activeDeliveries.length} ativas` : undefined
        }
      />

      <KPICard
        icon={<DollarSign className="h-8 w-8" />}
        label="Ganhos Hoje"
        value={`${stats.todayEarnings} BZR`}
        trend={stats.todayEarnings > 0 ? `+${stats.todayEarnings} BZR` : undefined}
      />

      <KPICard
        icon={<CheckCircle className="h-8 w-8" />}
        label="Taxa de Conclusão"
        value={`${stats.completionRate}%`}
        subtitle={`${stats.totalCompleted} de ${stats.totalDeliveries} entregas`}
      />

      <KPICard
        icon={<Star className="h-8 w-8" />}
        label="Avaliação Média"
        value={stats.averageRating.toFixed(1)}
        subtitle={`${stats.totalRatings} avaliações`}
      />
    </div>
  );
};
```

---

## 🎨 RENDER - QUICK ACTIONS

```tsx
const renderQuickActions = () => (
  <Card>
    <CardHeader>
      <CardTitle>Ações Rápidas</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
```

---

## 🎨 RENDER - ENTREGAS ATIVAS

```tsx
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
        {activeDeliveries.map((delivery) => (
          <div
            key={delivery.id}
            className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => navigate(`/app/delivery/active/${delivery.id}`)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    delivery.status === 'accepted'
                      ? 'secondary'
                      : delivery.status === 'picked_up'
                        ? 'default'
                        : 'outline'
                  }
                >
                  {delivery.status === 'accepted' && 'Aceito'}
                  {delivery.status === 'picked_up' && 'Coletado'}
                  {delivery.status === 'in_transit' && 'Em Trânsito'}
                </Badge>
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
                <span>📍 {delivery.distance}km</span>
                <span>⏱️ ~{delivery.estimatedTime}min</span>
                <span>📦 {delivery.packageType}</span>
              </div>
              <Button size="sm" variant="outline">
                Continuar →
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
```

---

## 🎨 RENDER - ESTATÍSTICAS DA SEMANA

```tsx
const renderWeekStats = () => {
  if (isLoadingStats || !stats) return null;

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
            {stats.weeklyDeliveries.map((day) => (
              <div key={day.day} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-12">
                  {day.day}
                </span>
                <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-primary h-full flex items-center justify-end pr-2"
                    style={{
                      width: `${(day.count / Math.max(...stats.weeklyDeliveries.map((d) => d.count))) * 100}%`,
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
            ))}
          </div>
        </div>

        <Separator />

        {/* Summary metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total de KM</p>
            <p className="text-2xl font-bold">{stats.weeklyKm.toFixed(1)}km</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Ganhos da Semana</p>
            <p className="text-2xl font-bold text-primary">{stats.weeklyEarnings} BZR</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

---

## 🎨 RENDER PRINCIPAL

```tsx
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
```

---

## ✅ VALIDAÇÃO

### Teste Manual

1. Acesse `http://localhost:5173/app/delivery/dashboard`
2. **Se não tiver perfil**: Deve redirecionar para `/app/delivery/profile/setup`
3. **Com perfil**:
   - Verificar header com avatar e nome
   - Toggle online/offline (deve mostrar toast)
   - Verificar KPIs renderizados
   - Clicar em Quick Actions (devem navegar)
   - Se houver entregas ativas, clicar para ver detalhes
   - Verificar gráfico da semana

### Casos de Teste

**Caso 1: Sem entregas ativas**
- Dashboard vazio deve mostrar botão "Ver Demandas"

**Caso 2: Com entregas ativas**
- Listar todas as entregas
- Badge com status correto
- Clicar deve navegar para `/app/delivery/active/{id}`

**Caso 3: Toggle de disponibilidade**
- Desativar: Toast "Você está offline" + warning banner
- Ativar: Toast "Você está online" + banner some

---

## 🚀 COMANDO PARA EXECUTAR

```bash
cd /home/bazari/bazari/apps/web
npm run dev
```

Acesse: `http://localhost:5173/app/delivery/dashboard`

---

## 📝 NOTAS IMPORTANTES

1. **Auto-redirect**: Se usuário não tem perfil, redireciona para setup
2. **Real-time**: Considerar adicionar polling ou websocket para atualizar entregas
3. **Gráfico simples**: Barra horizontal CSS (pode migrar para Recharts depois)
4. **Badge com count**: Quick Actions mostram badges com quantidades
5. **Mobile-first**: Layout responsivo com grid adaptativo

---

## ➡️ PRÓXIMA FASE

**FASE 6:** Página de Entrega Ativa (ActiveDeliveryPage)
