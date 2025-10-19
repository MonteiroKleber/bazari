# FASE 6 - PÁGINA DE ENTREGA ATIVA

## 🎯 OBJETIVO

Criar a página de gerenciamento de entrega em andamento (ActiveDeliveryPage) com:
- Timeline de status visual
- Informações de coleta e entrega
- Contatos rápidos (ligar/WhatsApp)
- Botões de ação por status (confirmar coleta, confirmar entrega, cancelar)
- Navegação GPS integrada
- Timer de estimativa

**Rota:** `/app/delivery/active/:id`

**Tempo estimado:** 2-3 horas

---

## 📋 FLUXO DE STATUS

### Status Progression
1. **accepted** → Entrega aceita, aguardando coleta
   - Ação: "Confirmar Coleta"
2. **picked_up** → Pacote coletado, em trânsito
   - Ação: "Confirmar Entrega"
3. **in_transit** → A caminho do destino
   - Ação: "Confirmar Entrega"
4. **delivered** → Entrega concluída
   - Exibe resumo e avaliação

### Ações Disponíveis (todos os status)
- Ligar para contato de coleta
- Ligar para contato de entrega
- Abrir navegação GPS
- Cancelar entrega (com motivo)

---

## 📂 ARQUIVO PRINCIPAL

**Arquivo:** `apps/web/src/pages/ActiveDeliveryPage.tsx`

### Imports

```typescript
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useToast } from '@/hooks/use-toast';
import {
  AddressCard,
  FeeBreakdownCard,
  DeliveryStatusTimeline,
} from '@/components/delivery';
import { deliveryApi } from '@/lib/api/delivery';
import type { DeliveryRequest } from '@/types/delivery';
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
```

---

## 🏗️ ESTRUTURA DO COMPONENTE

### State Management

```typescript
export default function ActiveDeliveryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

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
  }, [id]);

  // Timer effect
  useEffect(() => {
    if (!delivery || delivery.status === 'delivered' || delivery.status === 'cancelled') {
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [delivery]);

  const loadDelivery = async () => {
    try {
      setIsLoading(true);
      const data = await deliveryApi.getRequest(id!);
      setDelivery(data);

      // Calculate elapsed time
      const startTime = new Date(
        data.acceptedAt || data.createdAt
      ).getTime();
      const now = Date.now();
      setElapsedTime(Math.floor((now - startTime) / 1000));
    } catch (error) {
      toast({
        title: 'Erro ao carregar entrega',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      navigate('/app/delivery/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  // ... handlers below
}
```

---

## 📝 HANDLERS

### Ações de Confirmação

```typescript
const handleConfirmPickup = async () => {
  try {
    setIsConfirmingPickup(true);
    const updated = await deliveryApi.confirmPickup(id!);
    setDelivery(updated);
    toast({
      title: 'Coleta confirmada',
      description: 'Agora você pode entregar o pacote',
    });
  } catch (error) {
    toast({
      title: 'Erro ao confirmar coleta',
      description: error instanceof Error ? error.message : 'Erro desconhecido',
      variant: 'destructive',
    });
  } finally {
    setIsConfirmingPickup(false);
  }
};

const handleConfirmDelivery = async () => {
  try {
    setIsConfirmingDelivery(true);
    const updated = await deliveryApi.confirmDelivery(id!);
    setDelivery(updated);
    toast({
      title: 'Entrega concluída!',
      description: `Você ganhou ${delivery?.totalBzr} BZR`,
    });
  } catch (error) {
    toast({
      title: 'Erro ao confirmar entrega',
      description: error instanceof Error ? error.message : 'Erro desconhecido',
      variant: 'destructive',
    });
  } finally {
    setIsConfirmingDelivery(false);
  }
};

const handleCancelDelivery = async () => {
  if (!cancelReason.trim()) {
    toast({
      title: 'Motivo obrigatório',
      description: 'Informe o motivo do cancelamento',
      variant: 'destructive',
    });
    return;
  }

  try {
    setIsCanceling(true);
    await deliveryApi.cancelRequest(id!, cancelReason);
    toast({
      title: 'Entrega cancelada',
      description: 'Você não receberá por esta entrega',
    });
    navigate('/app/delivery/dashboard');
  } catch (error) {
    toast({
      title: 'Erro ao cancelar',
      description: error instanceof Error ? error.message : 'Erro desconhecido',
      variant: 'destructive',
    });
  } finally {
    setIsCanceling(false);
    setShowCancelDialog(false);
  }
};
```

### Helpers de Navegação e Contato

```typescript
const openNavigation = (address: any) => {
  const query = `${address.street}, ${address.number}, ${address.city}, ${address.state}`;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
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
```

---

## 🎨 RENDER - HEADER E TIMELINE

```tsx
const renderHeader = () => {
  if (!delivery) return null;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
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
          <p className="text-muted-foreground">
            {delivery.status === 'accepted' && 'Aguardando coleta'}
            {delivery.status === 'picked_up' && 'Pacote coletado'}
            {delivery.status === 'in_transit' && 'Em trânsito'}
            {delivery.status === 'delivered' && 'Entregue com sucesso'}
          </p>
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
```

---

## 🎨 RENDER - ENDEREÇOS E CONTATOS

```tsx
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
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              asChild
            >
              <a href={`tel:${delivery.pickupContact.phone}`}>
                <Phone className="h-4 w-4 mr-2" />
                Ligar
              </a>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              asChild
            >
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

          {delivery.status === 'accepted' && (
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
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              asChild
            >
              <a href={`tel:${delivery.deliveryContact.phone}`}>
                <Phone className="h-4 w-4 mr-2" />
                Ligar
              </a>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              asChild
            >
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

          {(delivery.status === 'picked_up' || delivery.status === 'in_transit') && (
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
```

---

## 🎨 RENDER - DETALHES DO PACOTE E TAXA

```tsx
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
```

---

## 🎨 RENDER - AÇÕES E DIALOG DE CANCELAMENTO

```tsx
const renderActions = () => {
  if (!delivery || delivery.status === 'delivered' || delivery.status === 'cancelled') {
    return null;
  }

  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-red-900">Problemas com a entrega?</p>
            <p className="text-sm text-red-700">
              Você pode cancelar, mas não receberá pagamento
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={() => setShowCancelDialog(true)}
          >
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
```

---

## 🎨 RENDER - ENTREGA CONCLUÍDA

```tsx
const renderCompleted = () => {
  if (!delivery || delivery.status !== 'delivered') return null;

  return (
    <Card className="border-green-500 bg-green-50">
      <CardContent className="pt-6 text-center">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-green-900 mb-2">
          Entrega Concluída!
        </h2>
        <p className="text-green-700 mb-4">
          Você ganhou <strong>{delivery.totalBzr} BZR</strong> por esta entrega
        </p>
        <div className="flex gap-4 justify-center">
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
```

---

## 🎨 RENDER PRINCIPAL

```tsx
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

    {delivery.status === 'delivered' ? (
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
```

---

## ✅ VALIDAÇÃO

### Teste Manual

1. **Aceitar uma entrega** no dashboard
2. Acessar `/app/delivery/active/{id}`
3. **Status: accepted**
   - Ver timeline com step "Aceito" ativo
   - Clicar em "Confirmar Coleta"
   - Verificar mudança para "picked_up"
4. **Status: picked_up**
   - Ver timeline atualizada
   - Testar botões de navegação GPS
   - Testar ligar/WhatsApp para contatos
   - Clicar em "Confirmar Entrega"
5. **Status: delivered**
   - Ver card de conclusão
   - Verificar redirecionamento para dashboard
6. **Cancelamento**
   - Clicar em "Cancelar Entrega"
   - Preencher motivo
   - Verificar redirecionamento

### Casos de Teste

**Caso 1: Timer**
- Verificar que timer incrementa a cada segundo
- Recarregar página e verificar que continua do ponto correto

**Caso 2: Navegação GPS**
- Clicar em botão de navegação
- Deve abrir Google Maps em nova aba

**Caso 3: Confirmações**
- Confirmar coleta → Status muda para picked_up
- Confirmar entrega → Status muda para delivered + toast de ganhos

---

## 🚀 COMANDO PARA EXECUTAR

```bash
cd /home/bazari/bazari/apps/web
npm run dev
```

Acesse: `http://localhost:5173/app/delivery/active/{id}`

---

## 📝 NOTAS IMPORTANTES

1. **Timer persistente**: Calcula tempo decorrido baseado em timestamps do backend
2. **Navegação GPS**: Abre Google Maps com endereço pré-preenchido
3. **Contatos rápidos**: Links diretos para telefone e WhatsApp
4. **Status visual**: Timeline mostra progresso da entrega
5. **Cancelamento**: Requer motivo obrigatório
6. **UX Mobile**: Layout responsivo com grid adaptativo

---

## ➡️ PRÓXIMA FASE

**FASE 7:** Lista de Demandas Disponíveis (DeliveryRequestsListPage)
