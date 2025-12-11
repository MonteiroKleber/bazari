/**
 * Seller Plugins Page
 *
 * Lista os plugins instalados do vendedor com opcoes de gerenciamento
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Settings, Trash2, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  fetchSellerPlugins,
  togglePlugin,
  uninstallPlugin,
  type PluginInstance,
} from '@/api/plugins';

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
    onError: () => {
      toast.error('Erro ao atualizar plugin');
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
    onError: () => {
      toast.error('Erro ao remover plugin');
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
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-40" />
            </Card>
          ))}
        </div>
      ) : !hasPlugins ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plugins.map((instance) => (
            <PluginCard
              key={instance.id}
              instance={instance}
              onConfigure={() => setConfigModalPlugin(instance.id)}
              onToggle={(enabled) =>
                toggleMutation.mutate({ instanceId: instance.id, enabled })
              }
              onUninstall={() => setUninstallTarget(instance.id)}
              isToggling={toggleMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Modal de configuracao */}
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

      {/* Dialog de confirmacao para desinstalar */}
      <AlertDialog
        open={!!uninstallTarget}
        onOpenChange={() => setUninstallTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desinstalar plugin?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa acao ira remover o plugin e todas as suas configuracoes. Os
              dados historicos serao mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => uninstallTarget && uninstallMutation.mutate(uninstallTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
  isToggling,
}: {
  instance: PluginInstance;
  onConfigure: () => void;
  onToggle: (enabled: boolean) => void;
  onUninstall: () => void;
  isToggling: boolean;
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
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/plugins/default-icon.svg';
                }}
              />
            </div>
            <div>
              <CardTitle className="text-base">{plugin.name}</CardTitle>
              <Badge
                variant={instance.enabled ? 'default' : 'secondary'}
                className="mt-1"
              >
                {instance.enabled ? 'Ativo' : 'Pausado'}
              </Badge>
            </div>
          </div>
          <Switch
            checked={instance.enabled}
            onCheckedChange={onToggle}
            disabled={isToggling}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Estatisticas rapidas */}
        {instance.stats && Object.keys(instance.stats).length > 0 && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(instance.stats)
              .slice(0, 2)
              .map(([key, value]) => (
                <div key={key} className="bg-muted rounded p-2">
                  <div className="text-muted-foreground text-xs">
                    {formatStatLabel(key)}
                  </div>
                  <div className="font-medium">{String(value)}</div>
                </div>
              ))}
          </div>
        )}

        {/* Acoes */}
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
          <Button variant="outline" size="sm" asChild>
            <Link to={`/app/seller/plugins/${instance.id}/stats`}>
              <BarChart3 className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={onUninstall}>
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
          <Link to="/app/seller/plugins/catalog">Explorar Plugins</Link>
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
