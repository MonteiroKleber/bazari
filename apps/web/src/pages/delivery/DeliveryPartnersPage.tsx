import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
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
import { toast } from 'sonner';
import { deliveryApi } from '@/lib/api/delivery';
import type { StoreDeliveryPartner } from '@/types/delivery';
import {
  ArrowLeft,
  UserPlus,
  Star,
  Trash2,
  Edit,
  Truck,
} from 'lucide-react';

interface DeliveryPartnersPageProps {
  embedded?: boolean;
}

export function DeliveryPartnersPage({ embedded = false }: DeliveryPartnersPageProps) {
  const navigate = useNavigate();

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
    } catch (error: any) {
      toast.error(`Erro ao carregar parceiros: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!deliveryProfileId.trim()) {
      toast.error('Informe o ID do perfil do entregador');
      return;
    }

    try {
      setIsInviting(true);
      await deliveryApi.requestPartnership(deliveryProfileId);
      toast.success('O entregador foi vinculado à sua loja');
      setShowInviteDialog(false);
      setDeliveryProfileId('');
      loadPartners();
    } catch (error: any) {
      toast.error(`Erro ao convidar: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdatePriority = async () => {
    if (!editingPartnerId) return;

    const priorityNum = parseInt(newPriority);
    if (isNaN(priorityNum) || priorityNum < 1) {
      toast.error('A prioridade deve ser um número maior que 0');
      return;
    }

    try {
      setIsUpdatingPriority(true);
      await deliveryApi.updatePartner(editingPartnerId, { priority: priorityNum });
      toast.success(`Prioridade definida como ${priorityNum}`);
      setEditingPartnerId(null);
      setNewPriority('');
      loadPartners();
    } catch (error: any) {
      toast.error(`Erro ao atualizar prioridade: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  const handleRemovePartner = async () => {
    if (!removingPartnerId) return;

    try {
      setIsRemoving(true);
      await deliveryApi.updatePartner(removingPartnerId, { isActive: false });
      toast.success('O entregador foi desvinculado');
      setRemovingPartnerId(null);
      loadPartners();
    } catch (error: any) {
      toast.error(`Erro ao remover: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsRemoving(false);
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'bike':
        return '🚴 Bicicleta';
      case 'motorcycle':
        return '🏍️ Moto';
      case 'car':
        return '🚗 Carro';
      case 'van':
        return '🚐 Van';
      default:
        return type;
    }
  };

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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
              <div className="flex flex-col md:flex-row items-start gap-4">
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
                <div className="flex-1 w-full">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold">
                      {partner.deliveryProfile.fullName}
                    </h3>
                    <Badge variant="outline">Prioridade {partner.priority}</Badge>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground mb-3">
                    <span>
                      {getVehicleIcon(partner.deliveryProfile.vehicleType)}
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
                <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 md:flex-none"
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
                    className="flex-1 md:flex-none"
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

  return (
    <div className={embedded ? '' : 'container max-w-6xl mx-auto py-8 px-4'}>
      {!embedded && renderHeader()}

      <div className="mb-6">
        <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-800 dark:text-blue-200">
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
}
