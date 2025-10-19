# FASE 8 - GERENCIAMENTO DE PARCEIROS DE LOJA

## 🎯 OBJETIVO

Criar a página de gerenciamento de entregadores vinculados à loja (DeliveryPartnersPage) para lojistas:
- Listar entregadores vinculados
- Convidar novos entregadores (por ID de perfil)
- Definir prioridade de entregadores
- Remover vínculos
- Visualizar estatísticas de cada parceiro

**Rota:** `/app/store/delivery-partners`

**Tempo estimado:** 2 horas

---

## 📋 FUNCIONALIDADES

### Para Lojistas
- **Listar Parceiros**: Ver todos os entregadores vinculados
- **Convidar**: Adicionar novo parceiro por ID de DeliveryProfile
- **Priorizar**: Definir ordem de preferência (1, 2, 3...)
- **Estatísticas**: Ver desempenho de cada parceiro
- **Remover**: Desvincular parceiro

### Card de Parceiro
- Avatar e nome
- Tipo de veículo
- Raio de atuação
- Prioridade
- Estatísticas (entregas, taxa de conclusão, avaliação)
- Botão de editar prioridade
- Botão de remover

---

## 📂 ARQUIVO PRINCIPAL

**Arquivo:** `apps/web/src/pages/DeliveryPartnersPage.tsx`

### Imports

```typescript
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';
import { deliveryApi } from '@/lib/api/delivery';
import type { StoreDeliveryPartner } from '@/types/delivery';
import {
  ArrowLeft,
  UserPlus,
  Star,
  CheckCircle,
  Trash2,
  Edit,
  Truck,
} from 'lucide-react';
```

---

## 🏗️ ESTRUTURA DO COMPONENTE

### State Management

```typescript
export default function DeliveryPartnersPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Data
  const [partners, setPartners] = useState<StoreDeliveryPartner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Invite dialog
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [deliveryProfileId, setDeliveryProfileId] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // Edit priority dialog
  const [editingPartnerId, setEditingPartnerId] = useState<string | null>(null);
  const [newPriority, setNewPriority] = useState('');
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);

  // Remove dialog
  const [removingPartnerId, setRemovingPartnerId] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      setIsLoading(true);
      const data = await deliveryApi.listStorePartners();
      setPartners(data.sort((a, b) => a.priority - b.priority));
    } catch (error) {
      toast({
        title: 'Erro ao carregar parceiros',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!deliveryProfileId.trim()) {
      toast({
        title: 'ID obrigatório',
        description: 'Informe o ID do perfil do entregador',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsInviting(true);
      await deliveryApi.requestPartnership(deliveryProfileId);
      toast({
        title: 'Convite enviado',
        description: 'O entregador foi vinculado à sua loja',
      });
      setShowInviteDialog(false);
      setDeliveryProfileId('');
      loadPartners();
    } catch (error) {
      toast({
        title: 'Erro ao convidar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdatePriority = async () => {
    if (!editingPartnerId) return;

    const priorityNum = parseInt(newPriority);
    if (isNaN(priorityNum) || priorityNum < 1) {
      toast({
        title: 'Prioridade inválida',
        description: 'A prioridade deve ser um número maior que 0',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUpdatingPriority(true);
      await deliveryApi.updatePartner(editingPartnerId, { priority: priorityNum });
      toast({
        title: 'Prioridade atualizada',
        description: `Prioridade definida como ${priorityNum}`,
      });
      setEditingPartnerId(null);
      setNewPriority('');
      loadPartners();
    } catch (error) {
      toast({
        title: 'Erro ao atualizar prioridade',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  const handleRemovePartner = async () => {
    if (!removingPartnerId) return;

    try {
      setIsRemoving(true);
      await deliveryApi.updatePartner(removingPartnerId, { isActive: false });
      toast({
        title: 'Parceiro removido',
        description: 'O entregador foi desvinculado',
      });
      setRemovingPartnerId(null);
      loadPartners();
    } catch (error) {
      toast({
        title: 'Erro ao remover',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsRemoving(false);
    }
  };

  // ... render below
}
```

---

## 🎨 RENDER - HEADER

```tsx
const renderHeader = () => (
  <div className="mb-6">
    <Button
      variant="ghost"
      onClick={() => navigate('/app/dashboard')}
      className="mb-4"
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      Voltar
    </Button>
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">Entregadores Parceiros</h1>
        <p className="text-muted-foreground">
          Gerencie os entregadores vinculados à sua loja
        </p>
      </div>

      <Button onClick={() => setShowInviteDialog(true)}>
        <UserPlus className="h-4 w-4 mr-2" />
        Convidar Entregador
      </Button>
    </div>
  </div>
);
```

---

## 🎨 RENDER - LISTA DE PARCEIROS

```tsx
const renderPartnersList = () => {
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

  if (partners.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-12">
          <Truck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Nenhum entregador vinculado
          </h3>
          <p className="text-muted-foreground mb-4">
            Convide entregadores para fazer entregas para sua loja
          </p>
          <Button onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Convidar Primeiro Entregador
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {partners.map((partner) => (
        <Card key={partner.id} className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <Avatar className="h-16 w-16">
                <AvatarImage src={partner.deliveryProfile.profilePhoto || undefined} />
                <AvatarFallback className="text-xl">
                  {partner.deliveryProfile.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold">
                    {partner.deliveryProfile.fullName}
                  </h3>
                  <Badge variant="outline">Prioridade {partner.priority}</Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <span>
                    {partner.deliveryProfile.vehicleType === 'bike' && '🚴 Bicicleta'}
                    {partner.deliveryProfile.vehicleType === 'motorcycle' && '🏍️ Moto'}
                    {partner.deliveryProfile.vehicleType === 'car' && '🚗 Carro'}
                    {partner.deliveryProfile.vehicleType === 'van' && '🚐 Van'}
                  </span>
                  <span>
                    📍 {partner.deliveryProfile.radiusKm}km de raio
                  </span>
                  <span>
                    📞 {partner.deliveryProfile.phone}
                  </span>
                </div>

                {/* Stats */}
                {partner.stats && (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Entregas</p>
                      <p className="font-semibold">
                        {partner.stats.totalDeliveries}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Taxa de Conclusão</p>
                      <p className="font-semibold">
                        {partner.stats.completionRate}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avaliação</p>
                      <p className="font-semibold">
                        <Star className="inline h-4 w-4 text-yellow-500 mr-1" />
                        {partner.stats.averageRating.toFixed(1)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingPartnerId(partner.id);
                    setNewPriority(partner.priority.toString());
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Prioridade
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRemovingPartnerId(partner.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remover
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
```

---

## 🎨 RENDER - DIALOG DE CONVITE

```tsx
const renderInviteDialog = () => (
  <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Convidar Entregador</DialogTitle>
        <DialogDescription>
          Informe o ID do perfil do entregador que deseja vincular à sua loja.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label htmlFor="deliveryProfileId">ID do Perfil do Entregador *</Label>
          <Input
            id="deliveryProfileId"
            placeholder="Ex: 123e4567-e89b-12d3-a456-426614174000"
            value={deliveryProfileId}
            onChange={(e) => setDeliveryProfileId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            O entregador pode fornecer o ID do perfil dele
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => {
            setShowInviteDialog(false);
            setDeliveryProfileId('');
          }}
          disabled={isInviting}
        >
          Cancelar
        </Button>
        <Button onClick={handleInvite} disabled={isInviting}>
          {isInviting ? 'Convidando...' : 'Convidar'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
```

---

## 🎨 RENDER - DIALOG DE EDITAR PRIORIDADE

```tsx
const renderEditPriorityDialog = () => (
  <Dialog
    open={editingPartnerId !== null}
    onOpenChange={(open) => {
      if (!open) {
        setEditingPartnerId(null);
        setNewPriority('');
      }
    }}
  >
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Editar Prioridade</DialogTitle>
        <DialogDescription>
          Defina a ordem de preferência deste entregador (1 = maior prioridade).
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label htmlFor="priority">Prioridade *</Label>
          <Input
            id="priority"
            type="number"
            min="1"
            placeholder="1"
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Quanto menor o número, maior a prioridade
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => {
            setEditingPartnerId(null);
            setNewPriority('');
          }}
          disabled={isUpdatingPriority}
        >
          Cancelar
        </Button>
        <Button onClick={handleUpdatePriority} disabled={isUpdatingPriority}>
          {isUpdatingPriority ? 'Atualizando...' : 'Salvar'}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
```

---

## 🎨 RENDER - DIALOG DE REMOVER

```tsx
const renderRemoveDialog = () => (
  <AlertDialog
    open={removingPartnerId !== null}
    onOpenChange={(open) => {
      if (!open) setRemovingPartnerId(null);
    }}
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Remover Parceiro</AlertDialogTitle>
        <AlertDialogDescription>
          Tem certeza que deseja desvincular este entregador? Ele não receberá mais
          entregas automáticas da sua loja.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isRemoving}>Cancelar</AlertDialogCancel>
        <AlertDialogAction
          onClick={handleRemovePartner}
          disabled={isRemoving}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          {isRemoving ? 'Removendo...' : 'Remover'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
```

---

## 🎨 RENDER PRINCIPAL

```tsx
return (
  <div className="container max-w-6xl mx-auto py-8 px-4">
    {renderHeader()}

    <div className="mb-6">
      <Card className="border-blue-500 bg-blue-50">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-800">
            ℹ️ <strong>Como funciona:</strong> Quando você cria um pedido de entrega,
            o sistema notifica seus parceiros por ordem de prioridade. O primeiro a
            aceitar fica com a entrega.
          </p>
        </CardContent>
      </Card>
    </div>

    {renderPartnersList()}

    {renderInviteDialog()}
    {renderEditPriorityDialog()}
    {renderRemoveDialog()}
  </div>
);
```

---

## ✅ VALIDAÇÃO

### Teste Manual

1. Acesse `http://localhost:5173/app/store/delivery-partners`
2. **Sem parceiros**:
   - Ver mensagem "Nenhum entregador vinculado"
   - Clicar em "Convidar Primeiro Entregador"
3. **Convidar**:
   - Inserir ID de perfil de entregador
   - Clicar em "Convidar"
   - Verificar toast de sucesso
4. **Listar parceiros**:
   - Ver card com avatar, nome, veículo
   - Ver estatísticas (entregas, taxa, avaliação)
5. **Editar prioridade**:
   - Clicar em "Prioridade"
   - Alterar número
   - Salvar e verificar reordenação
6. **Remover**:
   - Clicar em "Remover"
   - Confirmar
   - Verificar que parceiro sumiu da lista

### Casos de Teste

**Caso 1: Convidar com ID inválido**
- Inserir ID que não existe
- Espera: Toast de erro do backend

**Caso 2: Prioridade duplicada**
- Definir prioridade 1 para dois parceiros
- Sistema deve aceitar (backend reordena)

**Caso 3: Remover último parceiro**
- Remover todos os parceiros
- Ver mensagem de lista vazia

---

## 🚀 COMANDO PARA EXECUTAR

```bash
cd /home/bazari/bazari/apps/web
npm run dev
```

Acesse: `http://localhost:5173/app/store/delivery-partners`

---

## 📝 NOTAS IMPORTANTES

1. **Prioridade**: 1 = maior prioridade (primeiro a ser notificado)
2. **Estatísticas**: Mostradas apenas se `partner.stats` existir
3. **ID do perfil**: Entregadores precisam fornecer UUID do `DeliveryProfile.id`
4. **Rota protegida**: Apenas lojistas devem acessar
5. **Ordem**: Lista ordenada por prioridade (crescente)

---

## ➡️ PRÓXIMA FASE

**FASE 9:** Integrações (DashboardPage, OrderPage, MobileBottomNav)
