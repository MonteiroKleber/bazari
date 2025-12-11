# FASE 9 - INTEGRAÇÕES COM SISTEMA EXISTENTE

## 🎯 OBJETIVO

Integrar o sistema de entregas com páginas já existentes no Bazari:
1. **DashboardPage**: Adicionar Quick Action "Tornar-me Entregador" ou "Dashboard de Entregas"
2. **OrderPage**: Adicionar seção de rastreamento de entrega (se pedido tiver delivery)
3. **MobileBottomNav**: Adicionar aba "Entregas" para entregadores
4. **App.tsx**: Verificar se todas as rotas estão configuradas

**Tempo estimado:** 1.5-2 horas

---

## 📋 INTEGRAÇÕES

### 1. DashboardPage - Quick Action
**Localização:** `apps/web/src/pages/DashboardPage.tsx`

**Adicionar:**
- Se usuário NÃO é entregador: Botão "Tornar-me Entregador"
- Se usuário É entregador: Botão "Dashboard de Entregas"

### 2. OrderPage - Tracking de Entrega
**Localização:** `apps/web/src/pages/OrderPage.tsx` (ou similar)

**Adicionar:**
- Card de "Status da Entrega" se pedido tem `deliveryRequestId`
- Timeline com status atual
- Informações do entregador (se aceita)
- Botão "Ver Detalhes da Entrega"

### 3. MobileBottomNav - Aba de Entregas
**Localização:** `apps/web/src/components/MobileBottomNav.tsx` (ou similar)

**Adicionar:**
- Nova aba "Entregas" (ícone de caminhão)
- Mostra badge se houver entregas ativas
- Redireciona para `/app/delivery/dashboard`

### 4. App.tsx - Rotas
**Localização:** `apps/web/src/App.tsx`

**Verificar:**
- Todas as rotas de delivery estão configuradas
- Rotas protegidas (autenticação)

---

## 🔧 IMPLEMENTAÇÃO

## 1. INTEGRAÇÃO COM DashboardPage

### Adicionar Quick Action

**Arquivo:** `apps/web/src/pages/DashboardPage.tsx`

```tsx
// Adicionar import
import { useDeliveryProfile } from '@/hooks/useDeliveryProfile';
import { Truck } from 'lucide-react';

// Dentro do componente
const { profile: deliveryProfile } = useDeliveryProfile();

// Na seção de Quick Actions, adicionar:
<QuickActionButton
  icon={<Truck className="h-6 w-6" />}
  label={deliveryProfile ? 'Dashboard de Entregas' : 'Tornar-me Entregador'}
  onClick={() =>
    navigate(
      deliveryProfile
        ? '/app/delivery/dashboard'
        : '/app/delivery/profile/setup'
    )
  }
/>
```

**Exemplo completo de renderQuickActions:**
```tsx
const renderQuickActions = () => (
  <Card>
    <CardHeader>
      <CardTitle>Ações Rápidas</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Ações existentes */}
        <QuickActionButton
          icon={<ShoppingCart className="h-6 w-6" />}
          label="Meus Pedidos"
          onClick={() => navigate('/app/orders')}
        />

        {/* NOVA AÇÃO - Entregas */}
        <QuickActionButton
          icon={<Truck className="h-6 w-6" />}
          label={deliveryProfile ? 'Minhas Entregas' : 'Virar Entregador'}
          badge={deliveryProfile?.activeDeliveries || undefined}
          onClick={() =>
            navigate(
              deliveryProfile
                ? '/app/delivery/dashboard'
                : '/app/delivery/profile/setup'
            )
          }
        />

        {/* Outras ações... */}
      </div>
    </CardContent>
  </Card>
);
```

---

## 2. INTEGRAÇÃO COM OrderPage

### Adicionar Tracking Card

**Arquivo:** `apps/web/src/pages/OrderPage.tsx` (ou onde mostra detalhes do pedido)

```tsx
// Adicionar imports
import { DeliveryStatusTimeline } from '@/components/delivery';
import { deliveryApi } from '@/lib/api/delivery';
import type { DeliveryRequest } from '@/types/delivery';
import { Truck } from 'lucide-react';

// State para delivery
const [delivery, setDelivery] = useState<DeliveryRequest | null>(null);
const [isLoadingDelivery, setIsLoadingDelivery] = useState(false);

// Carregar delivery se order.deliveryRequestId existir
useEffect(() => {
  if (order?.deliveryRequestId) {
    loadDelivery(order.deliveryRequestId);
  }
}, [order]);

const loadDelivery = async (deliveryRequestId: string) => {
  try {
    setIsLoadingDelivery(true);
    const data = await deliveryApi.getRequest(deliveryRequestId);
    setDelivery(data);
  } catch (error) {
    console.error('Erro ao carregar entrega:', error);
  } finally {
    setIsLoadingDelivery(false);
  }
};

// Renderizar card de delivery
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Status da Entrega
        </CardTitle>
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

        {/* Deliverer info (if accepted) */}
        {delivery.delivererId && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">Entregador</p>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={delivery.deliverer?.profilePhoto || undefined} />
                <AvatarFallback>
                  {delivery.deliverer?.fullName
                    ?.split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{delivery.deliverer?.fullName || 'Entregador'}</p>
                <p className="text-xs text-muted-foreground">
                  {delivery.deliverer?.vehicleType === 'bike' && '🚴 Bicicleta'}
                  {delivery.deliverer?.vehicleType === 'motorcycle' && '🏍️ Moto'}
                  {delivery.deliverer?.vehicleType === 'car' && '🚗 Carro'}
                  {delivery.deliverer?.vehicleType === 'van' && '🚐 Van'}
                </p>
              </div>
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

// No JSX principal, adicionar após outras informações do pedido:
{renderDeliveryTracking()}
```

---

## 3. INTEGRAÇÃO COM MobileBottomNav

### Adicionar Aba de Entregas

**Arquivo:** `apps/web/src/components/MobileBottomNav.tsx` (ou similar)

```tsx
// Adicionar imports
import { useDeliveryProfile } from '@/hooks/useDeliveryProfile';
import { Truck } from 'lucide-react';

// Dentro do componente
const { profile: deliveryProfile } = useDeliveryProfile();

// Adicionar nova aba (exemplo com estrutura comum de bottom nav)
const navItems = [
  {
    path: '/app/dashboard',
    icon: <Home className="h-5 w-5" />,
    label: 'Início',
  },
  {
    path: '/app/marketplace',
    icon: <ShoppingBag className="h-5 w-5" />,
    label: 'Marketplace',
  },
  {
    path: '/app/orders',
    icon: <Package className="h-5 w-5" />,
    label: 'Pedidos',
  },
  // NOVA ABA - Entregas (só mostra se for entregador)
  ...(deliveryProfile
    ? [
        {
          path: '/app/delivery/dashboard',
          icon: <Truck className="h-5 w-5" />,
          label: 'Entregas',
          badge: deliveryProfile.activeDeliveries || 0,
        },
      ]
    : []),
  {
    path: '/app/chat',
    icon: <MessageCircle className="h-5 w-5" />,
    label: 'Chat',
  },
];
```

**Exemplo completo de MobileBottomNav:**
```tsx
export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile: deliveryProfile } = useDeliveryProfile();

  const navItems = [
    {
      path: '/app/dashboard',
      icon: <Home className="h-5 w-5" />,
      label: 'Início',
    },
    {
      path: '/app/marketplace',
      icon: <ShoppingBag className="h-5 w-5" />,
      label: 'Marketplace',
    },
    {
      path: '/app/orders',
      icon: <Package className="h-5 w-5" />,
      label: 'Pedidos',
    },
    ...(deliveryProfile
      ? [
          {
            path: '/app/delivery/dashboard',
            icon: <Truck className="h-5 w-5" />,
            label: 'Entregas',
            badge: deliveryProfile.activeDeliveries || undefined,
          },
        ]
      : []),
    {
      path: '/app/chat',
      icon: <MessageCircle className="h-5 w-5" />,
      label: 'Chat',
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t md:hidden">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full relative',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {item.badge !== undefined && item.badge > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute top-2 right-4 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {item.badge}
                </Badge>
              )}
              {item.icon}
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 4. VERIFICAÇÃO DE ROTAS EM App.tsx

### Garantir que todas as rotas estão configuradas

**Arquivo:** `apps/web/src/App.tsx`

```tsx
// Importar páginas
import RequestDeliveryPage from '@/pages/RequestDeliveryPage';
import DeliveryProfileSetupPage from '@/pages/DeliveryProfileSetupPage';
import DeliveryDashboardPage from '@/pages/DeliveryDashboardPage';
import ActiveDeliveryPage from '@/pages/ActiveDeliveryPage';
import DeliveryRequestsListPage from '@/pages/DeliveryRequestsListPage';
import DeliveryPartnersPage from '@/pages/DeliveryPartnersPage';

// Adicionar rotas (dentro de <Routes>)
<Route path="/app/delivery/request/new" element={<RequestDeliveryPage />} />
<Route path="/app/delivery/profile/setup" element={<DeliveryProfileSetupPage />} />
<Route path="/app/delivery/dashboard" element={<DeliveryDashboardPage />} />
<Route path="/app/delivery/active/:id" element={<ActiveDeliveryPage />} />
<Route path="/app/delivery/requests" element={<DeliveryRequestsListPage />} />
<Route path="/app/store/delivery-partners" element={<DeliveryPartnersPage />} />

// Rotas adicionais (se necessário)
<Route path="/app/delivery/track/:id" element={<ActiveDeliveryPage />} />
<Route path="/app/delivery/history" element={<DeliveryHistoryPage />} />
<Route path="/app/delivery/earnings" element={<DeliveryEarningsPage />} />
```

**Verificação completa:**
```tsx
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected app routes */}
        <Route path="/app" element={<ProtectedRoute />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="marketplace" element={<MarketplacePage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="order/:id" element={<OrderPage />} />

          {/* DELIVERY ROUTES - Adicionar aqui */}
          <Route path="delivery/request/new" element={<RequestDeliveryPage />} />
          <Route path="delivery/profile/setup" element={<DeliveryProfileSetupPage />} />
          <Route path="delivery/dashboard" element={<DeliveryDashboardPage />} />
          <Route path="delivery/active/:id" element={<ActiveDeliveryPage />} />
          <Route path="delivery/track/:id" element={<ActiveDeliveryPage />} />
          <Route path="delivery/requests" element={<DeliveryRequestsListPage />} />
          <Route path="store/delivery-partners" element={<DeliveryPartnersPage />} />

          {/* Other routes */}
          <Route path="chat" element={<ChatPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/app/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## ✅ VALIDAÇÃO

### Teste de Integração 1: DashboardPage

1. Acessar `http://localhost:5173/app/dashboard`
2. **Sem perfil de entregador**:
   - Ver botão "Tornar-me Entregador"
   - Clicar → redireciona para `/app/delivery/profile/setup`
3. **Com perfil de entregador**:
   - Ver botão "Dashboard de Entregas"
   - Se houver entregas ativas, mostrar badge
   - Clicar → redireciona para `/app/delivery/dashboard`

### Teste de Integração 2: OrderPage

1. Criar um pedido com entrega (deliveryRequestId não-nulo)
2. Acessar página do pedido
3. Ver card "Status da Entrega"
4. Ver timeline de status
5. Se entrega aceita, ver informações do entregador
6. Clicar em "Ver Detalhes" → redireciona para `/app/delivery/track/{id}`

### Teste de Integração 3: MobileBottomNav

1. Acessar app em mobile (ou redimensionar janela < 768px)
2. **Sem perfil de entregador**:
   - Ver apenas abas padrão (Início, Marketplace, Pedidos, Chat)
3. **Com perfil de entregador**:
   - Ver nova aba "Entregas"
   - Se houver entregas ativas, ver badge com número
   - Clicar → redireciona para `/app/delivery/dashboard`

### Teste de Integração 4: Rotas

1. Testar todas as rotas diretamente na URL:
   - `/app/delivery/request/new`
   - `/app/delivery/profile/setup`
   - `/app/delivery/dashboard`
   - `/app/delivery/active/123`
   - `/app/delivery/requests`
   - `/app/store/delivery-partners`
2. Verificar que não há 404

---

## 🚀 COMANDOS PARA EXECUTAR

```bash
cd /home/bazari/bazari/apps/web

# Verificar imports
npm run typecheck

# Executar dev
npm run dev
```

Testar em: `http://localhost:5173/app/dashboard`

---

## 📝 NOTAS IMPORTANTES

1. **Condicional de entregador**: Usar `useDeliveryProfile()` para verificar se usuário tem perfil
2. **Badge de entregas ativas**: Mostrar apenas se > 0
3. **Mobile-first**: Bottom nav só aparece em mobile (< 768px)
4. **Lazy loading**: Considerar React.lazy() para páginas de delivery (otimização)
5. **Proteção de rotas**: Todas as rotas de delivery devem estar dentro de `<ProtectedRoute>`

---

## 🎨 EXEMPLO DE useDeliveryProfile (se não existir)

**Arquivo:** `apps/web/src/hooks/useDeliveryProfile.ts`

```typescript
import { useEffect, useState } from 'react';
import { deliveryApi } from '@/lib/api/delivery';
import type { DeliveryProfile } from '@/types/delivery';

export function useDeliveryProfile() {
  const [profile, setProfile] = useState<DeliveryProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await deliveryApi.getProfile();
      setProfile(data);
    } catch (error) {
      // User doesn't have a delivery profile yet
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateAvailability = async (isAvailable: boolean) => {
    if (!profile) return;
    const updated = await deliveryApi.updateAvailability(isAvailable);
    setProfile(updated);
  };

  return { profile, isLoading, updateAvailability, reload: loadProfile };
}
```

---

## ➡️ PRÓXIMA FASE

**FASE 10:** Testing e Polish Final
