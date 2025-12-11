# FASE 7 - LISTA DE DEMANDAS DISPONÍVEIS

## 🎯 OBJETIVO

Criar a página de listagem de entregas disponíveis (DeliveryRequestsListPage) com:
- Filtros (distância, valor, tipo de pacote)
- Ordenação (mais próximas, maior valor, mais recentes)
- Cards de entrega com informações resumidas
- Ação de aceitar entrega
- Atualização em tempo real (polling simples)

**Rota:** `/app/delivery/requests`

**Tempo estimado:** 2 horas

---

## 📋 FUNCIONALIDADES

### Filtros
- **Distância máxima**: Slider (1km - 50km)
- **Valor mínimo**: Input BZR
- **Tipo de pacote**: Checkboxes (documento, pequeno, médio, grande)

### Ordenação
- Mais próximas (distância crescente)
- Maior valor (BZR decrescente)
- Mais recentes (createdAt decrescente)

### Card de Entrega
- Origem → Destino
- Distância (km) e tempo estimado
- Tipo de pacote e peso
- Valor em BZR
- Botão "Aceitar Entrega"

### Auto-refresh
- Polling a cada 30 segundos
- Indicador visual de última atualização

---

## 📂 ARQUIVO PRINCIPAL

**Arquivo:** `apps/web/src/pages/DeliveryRequestsListPage.tsx`

### Imports

```typescript
import { useEffect, useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useDeliveryProfile } from '@/hooks/useDeliveryProfile';
import { deliveryApi } from '@/lib/api/delivery';
import type { DeliveryRequest, PackageType } from '@/types/delivery';
import {
  ArrowLeft,
  MapPin,
  Package,
  DollarSign,
  Filter,
  RefreshCw,
  Clock,
} from 'lucide-react';
```

---

## 🏗️ ESTRUTURA DO COMPONENTE

### State Management

```typescript
export default function DeliveryRequestsListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useDeliveryProfile();

  // Data
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<DeliveryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState<string | null>(null);

  // Filters
  const [maxDistance, setMaxDistance] = useState(50);
  const [minValue, setMinValue] = useState('');
  const [selectedPackageTypes, setSelectedPackageTypes] = useState<PackageType[]>([
    'document',
    'small',
    'medium',
    'large',
  ]);

  // Sorting
  const [sortBy, setSortBy] = useState<'distance' | 'value' | 'recent'>('distance');

  // Auto-refresh
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadRequests();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadRequests(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [requests, maxDistance, minValue, selectedPackageTypes, sortBy]);

  const loadRequests = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);

      const data = await deliveryApi.listRequests({
        status: ['pending'],
      });

      setRequests(data);
      setLastUpdate(new Date());
    } catch (error) {
      toast({
        title: 'Erro ao carregar demandas',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = requests.filter((req) => {
      // Distance filter
      if (req.distance > maxDistance) return false;

      // Value filter
      if (minValue && parseFloat(req.totalBzr) < parseFloat(minValue)) return false;

      // Package type filter
      if (!selectedPackageTypes.includes(req.packageType)) return false;

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
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      setIsAccepting(requestId);
      const accepted = await deliveryApi.acceptRequest(requestId);
      toast({
        title: 'Entrega aceita!',
        description: `Você aceitou a entrega #${accepted.id.slice(0, 8)}`,
      });
      navigate(`/app/delivery/active/${accepted.id}`);
    } catch (error) {
      toast({
        title: 'Erro ao aceitar entrega',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      setIsAccepting(null);
    }
  };

  const togglePackageType = (type: PackageType) => {
    setSelectedPackageTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // ... render below
}
```

---

## 🎨 RENDER - HEADER E FILTROS

```tsx
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
    <div className="flex items-center justify-between">
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
  <Card className="mb-6">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Filter className="h-5 w-5" />
        Filtros e Ordenação
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-6">
      {/* Distance Filter */}
      <div>
        <Label htmlFor="maxDistance">
          Distância Máxima: {maxDistance}km
        </Label>
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
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'document' as PackageType, label: '📄 Documento' },
            { value: 'small' as PackageType, label: '📦 Pequeno' },
            { value: 'medium' as PackageType, label: '📦 Médio' },
            { value: 'large' as PackageType, label: '📦 Grande' },
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
```

---

## 🎨 RENDER - LISTA DE ENTREGAS

```tsx
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
                setSelectedPackageTypes(['document', 'small', 'medium', 'large']);
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
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="capitalize">
                    {request.packageType}
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
                      {request.deliveryAddress.neighborhood || request.deliveryAddress.city}
                      , {request.deliveryAddress.state}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>📍 {request.distance.toFixed(1)}km</span>
                  <span>⏱️ ~{request.estimatedTime}min</span>
                  <span>⚖️ {request.weight}kg</span>
                </div>
              </div>

              {/* Value and Action */}
              <div className="text-right ml-4">
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
```

---

## 🎨 RENDER PRINCIPAL

```tsx
if (!profile || !profile.isAvailable) {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Card className="border-yellow-500 bg-yellow-50">
        <CardContent className="pt-6 text-center py-12">
          <h2 className="text-xl font-bold text-yellow-900 mb-2">
            Você está offline
          </h2>
          <p className="text-yellow-800 mb-4">
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
  <div className="container max-w-6xl mx-auto py-8 px-4">
    {renderHeader()}

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Filters - 1 column */}
      <div className="lg:col-span-1">{renderFilters()}</div>

      {/* Requests List - 2 columns */}
      <div className="lg:col-span-2">{renderRequestsList()}</div>
    </div>
  </div>
);
```

---

## ✅ VALIDAÇÃO

### Teste Manual

1. Acesse `http://localhost:5173/app/delivery/requests`
2. **Filtros**:
   - Mover slider de distância (verificar filtragem)
   - Definir valor mínimo (verificar filtragem)
   - Desmarcar tipos de pacote (verificar filtragem)
3. **Ordenação**:
   - Selecionar "Mais Próximas" (ordem por distância)
   - Selecionar "Maior Valor" (ordem por BZR)
   - Selecionar "Mais Recentes" (ordem por data)
4. **Aceitar Entrega**:
   - Clicar em "Aceitar Entrega"
   - Verificar redirecionamento para `/app/delivery/active/{id}`
5. **Auto-refresh**:
   - Aguardar 30 segundos
   - Verificar atualização automática

### Casos de Teste

**Caso 1: Sem entregas disponíveis**
- Backend retorna lista vazia
- Mostrar mensagem "Nenhuma entrega disponível"

**Caso 2: Filtros eliminam tudo**
- Definir distância = 1km
- Mostrar mensagem com botão "Limpar Filtros"

**Caso 3: Perfil offline**
- Desativar disponibilidade no dashboard
- Tentar acessar requests
- Mostrar aviso e botão para ir ao dashboard

---

## 🚀 COMANDO PARA EXECUTAR

```bash
cd /home/bazari/bazari/apps/web
npm run dev
```

Acesse: `http://localhost:5173/app/delivery/requests`

---

## 📝 NOTAS IMPORTANTES

1. **Auto-refresh**: Polling a cada 30 segundos (pode migrar para WebSocket)
2. **Filtros reativos**: Aplicados imediatamente ao alterar
3. **Ordenação**: 3 opções (distância, valor, recente)
4. **UX Mobile**: Layout responsivo com sidebar de filtros colapsável
5. **Última atualização**: Mostra timestamp da última sync

---

## ➡️ PRÓXIMA FASE

**FASE 8:** Gerenciamento de Parceiros de Loja (DeliveryPartnersPage)
