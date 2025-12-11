# P0: Interface de Plugins para Lojistas

**Prioridade:** P0 (Crítica)
**Status:** Pendente
**Esforço:** Médio
**Impacto:** Altíssimo
**Dependências:** 07-PLUGIN-SYSTEM.md, 08-PLUGIN-TEMPLATES.md

---

## Objetivo

Criar interface intuitiva para lojistas descobrirem, instalarem e configurarem plugins sem escrever código.

---

## Fluxo do Usuário

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         JORNADA DO LOJISTA                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  [1] Lojista acessa sua área                                                    │
│       /app/seller/manage                                                        │
│       │                                                                          │
│       ▼                                                                          │
│  [2] Vê card "Potencialize sua loja"                                            │
│       ┌─────────────────────────────────────────────────────────────┐           │
│       │ 🚀 Potencialize sua loja                                     │           │
│       │                                                              │           │
│       │ Ative recursos como fidelidade, cashback e cupons           │           │
│       │ para aumentar suas vendas.                                   │           │
│       │                                                              │           │
│       │                              [Ver Plugins Disponíveis →]    │           │
│       └─────────────────────────────────────────────────────────────┘           │
│       │                                                                          │
│       ▼                                                                          │
│  [3] Acessa /app/seller/plugins                                                 │
│       │                                                                          │
│       ├───────────────────────────────────────────────────────────────────────  │
│       │                                                                          │
│       │  ┌─────────────────────────────────────────────────────────────────┐    │
│       │  │                    MEUS PLUGINS                                  │    │
│       │  ├─────────────────────────────────────────────────────────────────┤    │
│       │  │                                                                  │    │
│       │  │  ┌──────────────────┐  ┌──────────────────┐                     │    │
│       │  │  │ 🎯 Fidelidade    │  │ 💰 Cashback      │                     │    │
│       │  │  │ ● Ativo          │  │ ○ Pausado        │                     │    │
│       │  │  │ 1.234 clientes   │  │                  │                     │    │
│       │  │  │ [Configurar]     │  │ [Ativar]         │                     │    │
│       │  │  └──────────────────┘  └──────────────────┘                     │    │
│       │  │                                                                  │    │
│       │  │  ┌────────────────────────────────────────────────────────┐     │    │
│       │  │  │ + Adicionar Plugin                                      │     │    │
│       │  │  └────────────────────────────────────────────────────────┘     │    │
│       │  │                                                                  │    │
│       │  └─────────────────────────────────────────────────────────────────┘    │
│       │                                                                          │
│       ├───────────────────────────────────────────────────────────────────────  │
│       │                                                                          │
│  [4] Clica em "+ Adicionar Plugin"                                              │
│       │                                                                          │
│       ▼                                                                          │
│  [5] Modal/Página de catálogo de plugins                                        │
│       ┌─────────────────────────────────────────────────────────────────┐       │
│       │                    CATÁLOGO DE PLUGINS                           │       │
│       ├─────────────────────────────────────────────────────────────────┤       │
│       │                                                                  │       │
│       │  [Todos] [Engajamento] [Marketing] [Operações] [Pagamentos]     │       │
│       │                                                                  │       │
│       │  ┌─────────────────────────────────────────────────────────┐    │       │
│       │  │ 🎟️ Cupons de Desconto                        [Grátis]   │    │       │
│       │  │ Crie cupons promocionais para sua loja                  │    │       │
│       │  │                                          [+ Instalar]   │    │       │
│       │  └─────────────────────────────────────────────────────────┘    │       │
│       │                                                                  │       │
│       │  ┌─────────────────────────────────────────────────────────┐    │       │
│       │  │ 🚚 Rastreamento de Entrega              [A partir de 0] │    │       │
│       │  │ Clientes acompanham entregas em tempo real              │    │       │
│       │  │                                          [+ Instalar]   │    │       │
│       │  └─────────────────────────────────────────────────────────┘    │       │
│       │                                                                  │       │
│       └─────────────────────────────────────────────────────────────────┘       │
│       │                                                                          │
│       ▼                                                                          │
│  [6] Clica em "Instalar" no plugin desejado                                     │
│       │                                                                          │
│       ▼                                                                          │
│  [7] Modal de configuração (gerado pelo configSchema)                           │
│       ┌─────────────────────────────────────────────────────────────────┐       │
│       │                    CONFIGURAR CUPONS                             │       │
│       ├─────────────────────────────────────────────────────────────────┤       │
│       │                                                                  │       │
│       │  Mostrar banner na loja?                                        │       │
│       │  [✓] Sim                                                        │       │
│       │                                                                  │       │
│       │  Código do cupom para o banner:                                 │       │
│       │  [BEMVINDO10_______]                                            │       │
│       │                                                                  │       │
│       │  Texto do banner:                                               │       │
│       │  [Use o cupom {code} e ganhe {discount}!]                       │       │
│       │                                                                  │       │
│       │  ──────────────────────────────────────                         │       │
│       │  CUPONS                                                         │       │
│       │  ┌─────────────────────────────────────────────────────────┐   │       │
│       │  │ BEMVINDO10  │ 10% │ Sem mínimo │ Ativo │ [✏️] [🗑️]     │   │       │
│       │  │ FRETE50     │ 50 BZR │ Min 100 BZR │ Ativo │ [✏️] [🗑️] │   │       │
│       │  └─────────────────────────────────────────────────────────┘   │       │
│       │  [+ Adicionar Cupom]                                           │       │
│       │                                                                  │       │
│       │                           [Cancelar]  [Salvar e Ativar]         │       │
│       └─────────────────────────────────────────────────────────────────┘       │
│       │                                                                          │
│       ▼                                                                          │
│  [8] Plugin ativado! Aparece em "Meus Plugins"                                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Páginas e Componentes

### Estrutura de Arquivos

```
apps/web/src/
├── pages/
│   └── seller/
│       ├── SellerPluginsPage.tsx       # Lista de plugins do vendedor
│       ├── PluginCatalogPage.tsx       # Catálogo de plugins disponíveis
│       └── PluginConfigPage.tsx        # Configuração de um plugin
│
├── components/
│   └── plugins/
│       ├── seller/
│       │   ├── MyPluginsList.tsx       # Lista de plugins instalados
│       │   ├── PluginCard.tsx          # Card de plugin instalado
│       │   ├── PluginCatalogGrid.tsx   # Grid do catálogo
│       │   ├── PluginCatalogCard.tsx   # Card no catálogo
│       │   ├── PluginConfigForm.tsx    # Formulário dinâmico
│       │   ├── PluginConfigModal.tsx   # Modal de configuração
│       │   └── PluginStats.tsx         # Estatísticas do plugin
│       │
│       └── forms/
│           ├── JsonSchemaForm.tsx      # Renderiza form de JSON Schema
│           ├── CouponEditor.tsx        # Editor específico para cupons
│           ├── RewardEditor.tsx        # Editor de recompensas
│           └── ColorPicker.tsx         # Seletor de cor para branding
```

---

## Página: Meus Plugins

**Arquivo:** `apps/web/src/pages/seller/SellerPluginsPage.tsx`

```tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Settings, Pause, Play, Trash2, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { PluginConfigModal } from '@/components/plugins/seller/PluginConfigModal';
import { fetchSellerPlugins, togglePlugin, uninstallPlugin } from '@/api/plugins';

export default function SellerPluginsPage() {
  const queryClient = useQueryClient();
  const [configModalPlugin, setConfigModalPlugin] = useState<string | null>(null);
  const [uninstallTarget, setUninstallTarget] = useState<string | null>(null);

  // Buscar plugins instalados
  const { data, isLoading } = useQuery({
    queryKey: ['seller-plugins'],
    queryFn: fetchSellerPlugins,
  });

  // Mutation para toggle
  const toggleMutation = useMutation({
    mutationFn: ({ instanceId, enabled }: { instanceId: string; enabled: boolean }) =>
      togglePlugin(instanceId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-plugins'] });
      toast.success('Plugin atualizado!');
    },
  });

  // Mutation para desinstalar
  const uninstallMutation = useMutation({
    mutationFn: uninstallPlugin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-plugins'] });
      toast.success('Plugin removido!');
      setUninstallTarget(null);
    },
  });

  const plugins = data?.plugins || [];
  const hasPlugins = plugins.length > 0;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meus Plugins</h1>
          <p className="text-muted-foreground">
            Gerencie os recursos ativos na sua loja
          </p>
        </div>
        <Button asChild>
          <Link to="/app/seller/plugins/catalog">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Plugin
          </Link>
        </Button>
      </div>

      {/* Lista de plugins */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-40" />
            </Card>
          ))}
        </div>
      ) : !hasPlugins ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plugins.map((instance: any) => (
            <PluginCard
              key={instance.id}
              instance={instance}
              onConfigure={() => setConfigModalPlugin(instance.id)}
              onToggle={(enabled) =>
                toggleMutation.mutate({ instanceId: instance.id, enabled })
              }
              onUninstall={() => setUninstallTarget(instance.id)}
            />
          ))}
        </div>
      )}

      {/* Modal de configuração */}
      {configModalPlugin && (
        <PluginConfigModal
          instanceId={configModalPlugin}
          onClose={() => setConfigModalPlugin(null)}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['seller-plugins'] });
            setConfigModalPlugin(null);
          }}
        />
      )}

      {/* Dialog de confirmação para desinstalar */}
      <AlertDialog open={!!uninstallTarget} onOpenChange={() => setUninstallTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desinstalar plugin?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação irá remover o plugin e todas as suas configurações.
              Os dados históricos serão mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => uninstallTarget && uninstallMutation.mutate(uninstallTarget)}
              className="bg-destructive text-destructive-foreground"
            >
              Desinstalar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Card de plugin instalado
function PluginCard({
  instance,
  onConfigure,
  onToggle,
  onUninstall,
}: {
  instance: any;
  onConfigure: () => void;
  onToggle: (enabled: boolean) => void;
  onUninstall: () => void;
}) {
  const plugin = instance.plugin;

  return (
    <Card className={!instance.enabled ? 'opacity-60' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <img
                src={plugin.iconUrl || '/plugins/default-icon.svg'}
                alt=""
                className="h-6 w-6"
              />
            </div>
            <div>
              <CardTitle className="text-base">{plugin.name}</CardTitle>
              <Badge variant={instance.enabled ? 'default' : 'secondary'} className="mt-1">
                {instance.enabled ? 'Ativo' : 'Pausado'}
              </Badge>
            </div>
          </div>
          <Switch
            checked={instance.enabled}
            onCheckedChange={onToggle}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Estatísticas rápidas */}
        {instance.stats && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(instance.stats).slice(0, 2).map(([key, value]) => (
              <div key={key} className="bg-muted rounded p-2">
                <div className="text-muted-foreground text-xs">
                  {formatStatLabel(key)}
                </div>
                <div className="font-medium">{String(value)}</div>
              </div>
            ))}
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onConfigure}
          >
            <Settings className="h-4 w-4 mr-1" />
            Configurar
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <Link to={`/app/seller/plugins/${instance.id}/stats`}>
              <BarChart3 className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onUninstall}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Estado vazio
function EmptyState() {
  return (
    <Card className="py-12">
      <CardContent className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <Plus className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Nenhum plugin instalado</h3>
          <p className="text-muted-foreground mt-1">
            Adicione plugins para aumentar suas vendas e engajar clientes
          </p>
        </div>
        <Button asChild>
          <Link to="/app/seller/plugins/catalog">
            Explorar Plugins
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function formatStatLabel(key: string): string {
  const labels: Record<string, string> = {
    totalCustomers: 'Clientes',
    totalPoints: 'Pontos dados',
    totalRedeemed: 'Resgates',
    totalCashback: 'Cashback pago',
    couponsUsed: 'Cupons usados',
  };
  return labels[key] || key;
}
```

---

## Página: Catálogo de Plugins

**Arquivo:** `apps/web/src/pages/seller/PluginCatalogPage.tsx`

```tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Star, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PluginConfigModal } from '@/components/plugins/seller/PluginConfigModal';
import { fetchAvailablePlugins, fetchSellerPlugins } from '@/api/plugins';

const categories = [
  { value: 'all', label: 'Todos' },
  { value: 'ENGAGEMENT', label: 'Engajamento' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'OPERATIONS', label: 'Operações' },
  { value: 'PAYMENTS', label: 'Pagamentos' },
  { value: 'ANALYTICS', label: 'Analytics' },
];

export default function PluginCatalogPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [installPlugin, setInstallPlugin] = useState<string | null>(null);

  // Buscar plugins disponíveis
  const { data: catalogData } = useQuery({
    queryKey: ['plugin-catalog', category],
    queryFn: () => fetchAvailablePlugins(category === 'all' ? undefined : category),
  });

  // Buscar plugins já instalados
  const { data: installedData } = useQuery({
    queryKey: ['seller-plugins'],
    queryFn: fetchSellerPlugins,
  });

  const availablePlugins = catalogData?.plugins || [];
  const installedSlugs = new Set(
    (installedData?.plugins || []).map((p: any) => p.plugin.slug)
  );

  // Filtrar por busca
  const filteredPlugins = availablePlugins.filter((plugin: any) =>
    plugin.name.toLowerCase().includes(search.toLowerCase()) ||
    plugin.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Catálogo de Plugins</h1>
          <p className="text-muted-foreground">
            Descubra recursos para potencializar sua loja
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar plugins..."
            className="pl-9"
          />
        </div>
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList>
            {categories.map(cat => (
              <TabsTrigger key={cat.value} value={cat.value}>
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Grid de plugins */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlugins.map((plugin: any) => {
          const isInstalled = installedSlugs.has(plugin.slug);

          return (
            <Card
              key={plugin.id}
              className={`relative overflow-hidden ${isInstalled ? 'ring-2 ring-primary' : ''}`}
            >
              {plugin.isOfficial && (
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Oficial
                  </Badge>
                </div>
              )}

              <CardContent className="p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <img
                      src={plugin.iconUrl || '/plugins/default-icon.svg'}
                      alt=""
                      className="h-8 w-8"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{plugin.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {plugin.description}
                    </p>
                  </div>
                </div>

                {/* Categoria e Preço */}
                <div className="flex items-center justify-between">
                  <Badge variant="outline">
                    {getCategoryLabel(plugin.category)}
                  </Badge>
                  <PricingBadge pricing={plugin.pricingType} price={plugin.priceMonthly} />
                </div>

                {/* Ação */}
                {isInstalled ? (
                  <Button variant="secondary" className="w-full" disabled>
                    <Check className="h-4 w-4 mr-2" />
                    Instalado
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => setInstallPlugin(plugin.slug)}
                  >
                    Instalar
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal de instalação/configuração */}
      {installPlugin && (
        <PluginConfigModal
          pluginSlug={installPlugin}
          isNew={true}
          onClose={() => setInstallPlugin(null)}
          onSave={() => {
            setInstallPlugin(null);
            navigate('/app/seller/plugins');
          }}
        />
      )}
    </div>
  );
}

function PricingBadge({ pricing, price }: { pricing: string; price?: number }) {
  switch (pricing) {
    case 'FREE':
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Grátis</Badge>;
    case 'FREEMIUM':
      return <Badge variant="secondary">A partir de grátis</Badge>;
    case 'PAID':
      return <Badge>{price} BZR/mês</Badge>;
    default:
      return null;
  }
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    ENGAGEMENT: 'Engajamento',
    MARKETING: 'Marketing',
    OPERATIONS: 'Operações',
    PAYMENTS: 'Pagamentos',
    ANALYTICS: 'Analytics',
    COMMUNICATION: 'Comunicação',
  };
  return labels[category] || category;
}
```

---

## Modal de Configuração

**Arquivo:** `apps/web/src/components/plugins/seller/PluginConfigModal.tsx`

```tsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { JsonSchemaForm } from './forms/JsonSchemaForm';
import { BrandingForm } from './forms/BrandingForm';
import {
  fetchPluginDetails,
  fetchPluginInstance,
  installPlugin,
  updatePluginConfig,
} from '@/api/plugins';

interface PluginConfigModalProps {
  pluginSlug?: string;    // Para nova instalação
  instanceId?: string;    // Para editar existente
  isNew?: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function PluginConfigModal({
  pluginSlug,
  instanceId,
  isNew = false,
  onClose,
  onSave,
}: PluginConfigModalProps) {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<Record<string, any>>({});
  const [branding, setBranding] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState('config');

  // Buscar definição do plugin
  const { data: pluginData, isLoading: loadingPlugin } = useQuery({
    queryKey: ['plugin-details', pluginSlug],
    queryFn: () => fetchPluginDetails(pluginSlug!),
    enabled: !!pluginSlug && isNew,
  });

  // Buscar instância existente
  const { data: instanceData, isLoading: loadingInstance } = useQuery({
    queryKey: ['plugin-instance', instanceId],
    queryFn: () => fetchPluginInstance(instanceId!),
    enabled: !!instanceId && !isNew,
  });

  // Preencher config inicial
  useEffect(() => {
    if (isNew && pluginData?.plugin) {
      setConfig(pluginData.plugin.defaultConfig || {});
    } else if (instanceData?.instance) {
      setConfig(instanceData.instance.config || {});
      setBranding(instanceData.instance.branding || {});
    }
  }, [pluginData, instanceData, isNew]);

  // Mutation para instalar
  const installMutation = useMutation({
    mutationFn: () => installPlugin(pluginSlug!, config, branding),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-plugins'] });
      toast.success('Plugin instalado com sucesso!');
      onSave();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao instalar plugin');
    },
  });

  // Mutation para atualizar
  const updateMutation = useMutation({
    mutationFn: () => updatePluginConfig(instanceId!, config, branding),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-plugins'] });
      toast.success('Configurações salvas!');
      onSave();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao salvar configurações');
    },
  });

  const plugin = pluginData?.plugin || instanceData?.instance?.plugin;
  const isLoading = loadingPlugin || loadingInstance;
  const isSaving = installMutation.isPending || updateMutation.isPending;

  const handleSave = () => {
    if (isNew) {
      installMutation.mutate();
    } else {
      updateMutation.mutate();
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : plugin ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <img
                  src={plugin.iconUrl || '/plugins/default-icon.svg'}
                  alt=""
                  className="h-8 w-8"
                />
                {isNew ? `Instalar ${plugin.name}` : `Configurar ${plugin.name}`}
              </DialogTitle>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="config">Configuração</TabsTrigger>
                <TabsTrigger value="branding">Aparência</TabsTrigger>
              </TabsList>

              <TabsContent value="config" className="mt-4">
                <JsonSchemaForm
                  schema={plugin.configSchema}
                  value={config}
                  onChange={setConfig}
                />
              </TabsContent>

              <TabsContent value="branding" className="mt-4">
                <BrandingForm
                  value={branding}
                  onChange={setBranding}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isNew ? 'Instalar e Ativar' : 'Salvar'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Plugin não encontrado
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

---

## Formulário Dinâmico (JSON Schema)

**Arquivo:** `apps/web/src/components/plugins/seller/forms/JsonSchemaForm.tsx`

```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  title?: string;
  description?: string;
  default?: any;
  enum?: string[];
  minimum?: number;
  maximum?: number;
}

interface JsonSchemaFormProps {
  schema: JsonSchema;
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
  path?: string;
}

export function JsonSchemaForm({ schema, value, onChange, path = '' }: JsonSchemaFormProps) {
  if (!schema.properties) {
    return null;
  }

  const handleChange = (key: string, newValue: any) => {
    onChange({ ...value, [key]: newValue });
  };

  return (
    <div className="space-y-6">
      {Object.entries(schema.properties).map(([key, fieldSchema]) => (
        <FieldRenderer
          key={key}
          name={key}
          schema={fieldSchema}
          value={value[key]}
          onChange={(newValue) => handleChange(key, newValue)}
          required={schema.required?.includes(key)}
        />
      ))}
    </div>
  );
}

interface FieldRendererProps {
  name: string;
  schema: JsonSchema;
  value: any;
  onChange: (value: any) => void;
  required?: boolean;
}

function FieldRenderer({ name, schema, value, onChange, required }: FieldRendererProps) {
  const label = schema.title || name;
  const description = schema.description;

  // Boolean - Switch
  if (schema.type === 'boolean') {
    return (
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor={name}>{label}</Label>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <Switch
          id={name}
          checked={value ?? schema.default ?? false}
          onCheckedChange={onChange}
        />
      </div>
    );
  }

  // Enum - Select
  if (schema.enum) {
    return (
      <div className="space-y-2">
        <Label htmlFor={name}>{label}{required && ' *'}</Label>
        <Select value={value ?? schema.default} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {schema.enum.map((option) => (
              <SelectItem key={option} value={option}>
                {formatEnumLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    );
  }

  // Number with min/max - Slider
  if (schema.type === 'number' && schema.minimum !== undefined && schema.maximum !== undefined) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={name}>{label}{required && ' *'}</Label>
          <span className="text-sm font-medium">{value ?? schema.default ?? schema.minimum}</span>
        </div>
        <Slider
          id={name}
          min={schema.minimum}
          max={schema.maximum}
          step={1}
          value={[value ?? schema.default ?? schema.minimum]}
          onValueChange={([v]) => onChange(v)}
        />
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    );
  }

  // Number - Input
  if (schema.type === 'number') {
    return (
      <div className="space-y-2">
        <Label htmlFor={name}>{label}{required && ' *'}</Label>
        <Input
          id={name}
          type="number"
          value={value ?? schema.default ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
          min={schema.minimum}
          max={schema.maximum}
        />
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    );
  }

  // Array - Lista editável
  if (schema.type === 'array' && schema.items) {
    return (
      <ArrayFieldRenderer
        name={name}
        schema={schema}
        value={value ?? schema.default ?? []}
        onChange={onChange}
      />
    );
  }

  // String - Input
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}{required && ' *'}</Label>
      <Input
        id={name}
        value={value ?? schema.default ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={schema.description}
      />
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

function ArrayFieldRenderer({
  name,
  schema,
  value,
  onChange,
}: {
  name: string;
  schema: JsonSchema;
  value: any[];
  onChange: (value: any[]) => void;
}) {
  const itemSchema = schema.items!;

  const addItem = () => {
    const newItem = getDefaultValue(itemSchema);
    onChange([...value, newItem]);
  };

  const removeItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, newValue: any) => {
    const updated = [...value];
    updated[index] = newValue;
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <Label>{schema.title || name}</Label>

      {value.map((item, index) => (
        <div key={index} className="flex gap-2 items-start p-3 border rounded-lg">
          <div className="flex-1">
            {itemSchema.type === 'object' && itemSchema.properties ? (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(itemSchema.properties).map(([key, fieldSchema]) => (
                  <FieldRenderer
                    key={key}
                    name={key}
                    schema={fieldSchema}
                    value={item[key]}
                    onChange={(v) => updateItem(index, { ...item, [key]: v })}
                  />
                ))}
              </div>
            ) : (
              <FieldRenderer
                name={`${name}[${index}]`}
                schema={itemSchema}
                value={item}
                onChange={(v) => updateItem(index, v)}
              />
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeItem(index)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}

      <Button variant="outline" onClick={addItem} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Adicionar
      </Button>
    </div>
  );
}

function getDefaultValue(schema: JsonSchema): any {
  if (schema.default !== undefined) return schema.default;
  if (schema.type === 'object') {
    const obj: Record<string, any> = {};
    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        obj[key] = getDefaultValue(prop);
      }
    }
    return obj;
  }
  if (schema.type === 'array') return [];
  if (schema.type === 'boolean') return false;
  if (schema.type === 'number') return 0;
  return '';
}

function formatEnumLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
```

---

## Formulário de Branding

**Arquivo:** `apps/web/src/components/plugins/seller/forms/BrandingForm.tsx`

```tsx
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface BrandingFormProps {
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
}

const colorPresets = [
  '#FF6B00', // Laranja Bazari
  '#8B5CF6', // Roxo
  '#10B981', // Verde
  '#3B82F6', // Azul
  '#EF4444', // Vermelho
  '#F59E0B', // Amarelo
];

export function BrandingForm({ value, onChange }: BrandingFormProps) {
  const handleChange = (key: string, newValue: any) => {
    onChange({ ...value, [key]: newValue });
  };

  return (
    <div className="space-y-6">
      {/* Cor principal */}
      <div className="space-y-3">
        <Label>Cor principal</Label>
        <div className="flex gap-2">
          {colorPresets.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => handleChange('primaryColor', color)}
              className={`w-8 h-8 rounded-full border-2 transition-transform ${
                value.primaryColor === color
                  ? 'border-foreground scale-110'
                  : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <div className="relative">
            <Input
              type="color"
              value={value.primaryColor || '#FF6B00'}
              onChange={(e) => handleChange('primaryColor', e.target.value)}
              className="w-8 h-8 p-0 border-0 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Cor secundária */}
      <div className="space-y-2">
        <Label htmlFor="secondaryColor">Cor secundária (opcional)</Label>
        <Input
          id="secondaryColor"
          type="color"
          value={value.secondaryColor || '#ffffff'}
          onChange={(e) => handleChange('secondaryColor', e.target.value)}
          className="w-full h-10"
        />
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <Label>Preview</Label>
        <div
          className="p-4 rounded-lg text-white"
          style={{ backgroundColor: value.primaryColor || '#FF6B00' }}
        >
          <div className="font-semibold">Seu plugin ficará assim</div>
          <div className="text-sm opacity-90">
            Com as cores selecionadas
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Rotas

**Adicionar em:** `apps/web/src/App.tsx`

```typescript
// Importar páginas
import SellerPluginsPage from './pages/seller/SellerPluginsPage';
import PluginCatalogPage from './pages/seller/PluginCatalogPage';

// Adicionar rotas dentro de /app/*
<Route path="seller/plugins" element={<SellerPluginsPage />} />
<Route path="seller/plugins/catalog" element={<PluginCatalogPage />} />
```

---

## API Client

**Arquivo:** `apps/web/src/api/plugins.ts`

```typescript
import { api } from './client';

export async function fetchAvailablePlugins(category?: string) {
  const params = category ? `?category=${category}` : '';
  const response = await api.get(`/plugins${params}`);
  return response.data;
}

export async function fetchPluginDetails(slug: string) {
  const response = await api.get(`/plugins/${slug}`);
  return response.data;
}

export async function fetchSellerPlugins() {
  const response = await api.get('/seller/plugins');
  return response.data;
}

export async function fetchPluginInstance(instanceId: string) {
  const response = await api.get(`/seller/plugins/${instanceId}`);
  return response.data;
}

export async function installPlugin(
  slug: string,
  config: Record<string, any>,
  branding: Record<string, any>
) {
  const response = await api.post(`/seller/plugins/${slug}/install`, {
    config,
    branding,
  });
  return response.data;
}

export async function updatePluginConfig(
  instanceId: string,
  config: Record<string, any>,
  branding: Record<string, any>
) {
  const response = await api.put(`/seller/plugins/${instanceId}`, {
    config,
    branding,
  });
  return response.data;
}

export async function togglePlugin(instanceId: string, enabled: boolean) {
  const response = await api.put(`/seller/plugins/${instanceId}`, { enabled });
  return response.data;
}

export async function uninstallPlugin(instanceId: string) {
  const response = await api.delete(`/seller/plugins/${instanceId}`);
  return response.data;
}
```

---

## Critérios de Aceite

- [ ] Página "Meus Plugins" listando plugins instalados
- [ ] Toggle ativar/desativar funcionando
- [ ] Página "Catálogo" com filtro por categoria
- [ ] Busca de plugins funcionando
- [ ] Modal de configuração gerado dinamicamente
- [ ] Formulário de branding (cores)
- [ ] Instalação e desinstalação funcionando
- [ ] Feedback visual (toasts, loading states)
- [ ] Responsivo para mobile

---

## Navegação

```
/app/seller/plugins           → Meus Plugins (lista instalados)
/app/seller/plugins/catalog   → Catálogo (descobrir novos)
/app/seller/plugins/:id/stats → Estatísticas de um plugin
```

---

**Versão:** 1.0.0
**Data:** 2024-12-07
