import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const MONETIZATION_TYPES = [
  { id: 'FREE', label: 'Gratuito', description: 'App grátis para todos' },
  { id: 'PAID', label: 'Pago', description: 'Usuário paga uma vez para instalar' },
  { id: 'FREEMIUM', label: 'Freemium', description: 'Grátis com compras no app' },
  { id: 'SUBSCRIPTION', label: 'Assinatura', description: 'Pagamento recorrente' },
];

const IAP_TYPES = [
  { id: 'CONSUMABLE', label: 'Consumível', description: 'Pode comprar múltiplas vezes' },
  { id: 'NON_CONSUMABLE', label: 'Permanente', description: 'Compra única' },
  { id: 'SUBSCRIPTION', label: 'Assinatura', description: 'Renovação automática' },
];

interface InAppPurchase {
  id: string;
  productId: string;
  name: string;
  description: string;
  price: string;
  type: string;
  isActive: boolean;
}

interface AppData {
  id: string;
  name: string;
  monetizationType: string;
  price: string | null;
  inAppPurchases: InAppPurchase[];
  totalRevenue: string;
  developerRevenue: string;
  platformRevenue: string;
  installCount: number;
}

export default function AppMonetizationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [monetizationType, setMonetizationType] = useState('FREE');
  const [price, setPrice] = useState('');
  const [showIAPDialog, setShowIAPDialog] = useState(false);
  const [editingIAP, setEditingIAP] = useState<InAppPurchase | null>(null);
  const [iapForm, setIapForm] = useState({
    productId: '',
    name: '',
    description: '',
    price: '',
    type: 'CONSUMABLE',
  });

  // Fetch app data
  const { data, isLoading } = useQuery({
    queryKey: ['developer-app-monetization', id],
    queryFn: async () => {
      const res = await api.get(`/developer/apps/${id}/monetization`);
      return res as AppData;
    },
    onSuccess: (data: AppData) => {
      setMonetizationType(data.monetizationType || 'FREE');
      setPrice(data.price || '');
    },
  });

  // Update monetization settings
  const updateMonetization = useMutation({
    mutationFn: async (payload: { monetizationType: string; price: string | null }) => {
      return api.put(`/developer/apps/${id}/monetization`, payload);
    },
    onSuccess: () => {
      toast.success('Configurações de monetização atualizadas');
      queryClient.invalidateQueries({ queryKey: ['developer-app-monetization', id] });
    },
    onError: () => {
      toast.error('Erro ao atualizar configurações');
    },
  });

  // Create/Update IAP
  const saveIAP = useMutation({
    mutationFn: async (payload: typeof iapForm & { id?: string }) => {
      if (payload.id) {
        return api.put(`/developer/apps/${id}/iap/${payload.id}`, payload);
      }
      return api.post(`/developer/apps/${id}/iap`, payload);
    },
    onSuccess: () => {
      toast.success(editingIAP ? 'Produto atualizado' : 'Produto criado');
      setShowIAPDialog(false);
      setEditingIAP(null);
      setIapForm({ productId: '', name: '', description: '', price: '', type: 'CONSUMABLE' });
      queryClient.invalidateQueries({ queryKey: ['developer-app-monetization', id] });
    },
    onError: () => {
      toast.error('Erro ao salvar produto');
    },
  });

  // Delete IAP
  const deleteIAP = useMutation({
    mutationFn: async (iapId: string) => {
      return api.delete(`/developer/apps/${id}/iap/${iapId}`);
    },
    onSuccess: () => {
      toast.success('Produto removido');
      queryClient.invalidateQueries({ queryKey: ['developer-app-monetization', id] });
    },
  });

  const handleSaveMonetization = () => {
    updateMonetization.mutate({
      monetizationType,
      price: monetizationType === 'PAID' ? price : null,
    });
  };

  const handleEditIAP = (iap: InAppPurchase) => {
    setEditingIAP(iap);
    setIapForm({
      productId: iap.productId,
      name: iap.name,
      description: iap.description,
      price: iap.price,
      type: iap.type,
    });
    setShowIAPDialog(true);
  };

  const handleSaveIAP = () => {
    saveIAP.mutate({
      ...iapForm,
      id: editingIAP?.id,
    });
  };

  const getTierInfo = (installCount: number) => {
    if (installCount > 100000) return { tier: 'Enterprise', share: '85%', color: 'bg-purple-500' };
    if (installCount > 10000) return { tier: 'Scale', share: '80%', color: 'bg-blue-500' };
    if (installCount > 1000) return { tier: 'Growth', share: '75%', color: 'bg-green-500' };
    return { tier: 'Starter', share: '70%', color: 'bg-gray-500' };
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const app = data;
  const tierInfo = getTierInfo(app?.installCount || 0);

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/app/developer/apps/${id}`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Monetização</h1>
          <p className="text-muted-foreground text-sm">{app?.name}</p>
        </div>
      </div>

      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Receita Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{app?.totalRevenue || '0'} BZR</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Sua Receita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {app?.developerRevenue || '0'} BZR
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4" />
              Instalações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{app?.installCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Seu Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge className={tierInfo.color}>{tierInfo.tier}</Badge>
              <span className="text-sm text-muted-foreground">{tierInfo.share} receita</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monetization Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Tipo de Monetização</CardTitle>
          <CardDescription>
            Escolha como você deseja monetizar seu app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {MONETIZATION_TYPES.map((type) => (
              <div
                key={type.id}
                onClick={() => setMonetizationType(type.id)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  monetizationType === type.id
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground/50'
                }`}
              >
                <div className="font-medium text-sm">{type.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{type.description}</div>
              </div>
            ))}
          </div>

          {monetizationType === 'PAID' && (
            <div className="space-y-2">
              <Label htmlFor="price">Preço (BZR)</Label>
              <div className="flex gap-2">
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Ex: 10.00"
                  className="max-w-xs"
                />
                <span className="flex items-center text-muted-foreground">BZR</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Você receberá {tierInfo.share} do valor ({((parseFloat(price) || 0) * parseInt(tierInfo.share) / 100).toFixed(2)} BZR por venda)
              </p>
            </div>
          )}

          <Button
            onClick={handleSaveMonetization}
            disabled={updateMonetization.isPending || (monetizationType === 'PAID' && !price)}
          >
            <Save className="w-4 h-4 mr-2" />
            {updateMonetization.isPending ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </CardContent>
      </Card>

      {/* In-App Purchases */}
      {(monetizationType === 'FREEMIUM' || monetizationType === 'PAID') && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Compras no App (IAP)
                </CardTitle>
                <CardDescription>
                  Configure produtos para venda dentro do seu app
                </CardDescription>
              </div>
              <Dialog open={showIAPDialog} onOpenChange={setShowIAPDialog}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingIAP(null);
                      setIapForm({ productId: '', name: '', description: '', price: '', type: 'CONSUMABLE' });
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar Produto
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingIAP ? 'Editar Produto' : 'Novo Produto'}
                    </DialogTitle>
                    <DialogDescription>
                      Configure um produto para venda no app
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="iap-productId">ID do Produto</Label>
                      <Input
                        id="iap-productId"
                        value={iapForm.productId}
                        onChange={(e) => setIapForm({ ...iapForm, productId: e.target.value })}
                        placeholder="ex: premium_pack"
                        disabled={!!editingIAP}
                      />
                      <p className="text-xs text-muted-foreground">
                        Identificador único usado no código do app
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="iap-name">Nome</Label>
                      <Input
                        id="iap-name"
                        value={iapForm.name}
                        onChange={(e) => setIapForm({ ...iapForm, name: e.target.value })}
                        placeholder="ex: Pacote Premium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="iap-description">Descrição</Label>
                      <Textarea
                        id="iap-description"
                        value={iapForm.description}
                        onChange={(e) => setIapForm({ ...iapForm, description: e.target.value })}
                        placeholder="O que o usuário recebe com esta compra"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="iap-price">Preço (BZR)</Label>
                        <Input
                          id="iap-price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={iapForm.price}
                          onChange={(e) => setIapForm({ ...iapForm, price: e.target.value })}
                          placeholder="5.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="iap-type">Tipo</Label>
                        <Select
                          value={iapForm.type}
                          onValueChange={(v) => setIapForm({ ...iapForm, type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {IAP_TYPES.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowIAPDialog(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSaveIAP}
                      disabled={saveIAP.isPending || !iapForm.productId || !iapForm.name || !iapForm.price}
                    >
                      {saveIAP.isPending ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {app?.inAppPurchases && app.inAppPurchases.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {app.inAppPurchases.map((iap) => (
                    <TableRow key={iap.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{iap.name}</div>
                          <div className="text-xs text-muted-foreground">{iap.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {iap.productId}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {IAP_TYPES.find((t) => t.id === iap.type)?.label || iap.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{iap.price} BZR</TableCell>
                      <TableCell>
                        <Badge variant={iap.isActive ? 'default' : 'secondary'}>
                          {iap.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditIAP(iap)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Remover este produto?')) {
                                deleteIAP.mutate(iap.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum produto configurado</p>
                <p className="text-sm">Adicione produtos para venda dentro do seu app</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tier Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Sistema de Tiers</CardTitle>
          <CardDescription>
            Quanto mais instalações, maior sua porcentagem de receita
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { tier: 'Starter', installs: '0 - 1.000', share: '70%', color: 'bg-gray-500' },
              { tier: 'Growth', installs: '1.001 - 10.000', share: '75%', color: 'bg-green-500' },
              { tier: 'Scale', installs: '10.001 - 100.000', share: '80%', color: 'bg-blue-500' },
              { tier: 'Enterprise', installs: '100.001+', share: '85%', color: 'bg-purple-500' },
            ].map((item) => (
              <div
                key={item.tier}
                className={`p-4 rounded-lg border ${
                  tierInfo.tier === item.tier ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <Badge className={item.color}>{item.tier}</Badge>
                <div className="mt-2 text-2xl font-bold">{item.share}</div>
                <div className="text-xs text-muted-foreground">{item.installs} installs</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
