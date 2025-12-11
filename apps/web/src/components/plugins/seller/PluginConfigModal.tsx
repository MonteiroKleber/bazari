/**
 * Plugin Config Modal Component
 *
 * Modal para instalar ou configurar plugins
 */

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
  pluginSlug?: string; // Para nova instalacao
  instanceId?: string; // Para editar existente
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
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [branding, setBranding] = useState<Record<string, unknown>>({});
  const [activeTab, setActiveTab] = useState('config');

  // Buscar definicao do plugin
  const { data: pluginData, isLoading: loadingPlugin } = useQuery({
    queryKey: ['plugin-details', pluginSlug],
    queryFn: () => fetchPluginDetails(pluginSlug!),
    enabled: !!pluginSlug && isNew,
  });

  // Buscar instancia existente
  const { data: instanceData, isLoading: loadingInstance } = useQuery({
    queryKey: ['plugin-instance', instanceId],
    queryFn: () => fetchPluginInstance(instanceId!),
    enabled: !!instanceId && !isNew,
  });

  // Preencher config inicial
  useEffect(() => {
    if (isNew && pluginData?.plugin) {
      setConfig((pluginData.plugin.defaultConfig as Record<string, unknown>) || {});
    } else if (instanceData?.instance) {
      setConfig((instanceData.instance.config as Record<string, unknown>) || {});
      setBranding((instanceData.instance.branding as Record<string, unknown>) || {});
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
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao instalar plugin');
    },
  });

  // Mutation para atualizar
  const updateMutation = useMutation({
    mutationFn: () => updatePluginConfig(instanceId!, config, branding),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-plugins'] });
      queryClient.invalidateQueries({ queryKey: ['plugin-instance', instanceId] });
      toast.success('Configuracoes salvas!');
      onSave();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao salvar configuracoes');
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
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/plugins/default-icon.svg';
                  }}
                />
                {isNew ? `Instalar ${plugin.name}` : `Configurar ${plugin.name}`}
              </DialogTitle>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="config">Configuracao</TabsTrigger>
                <TabsTrigger value="branding">Aparencia</TabsTrigger>
              </TabsList>

              <TabsContent value="config" className="mt-4">
                {plugin.configSchema ? (
                  <JsonSchemaForm
                    schema={plugin.configSchema as any}
                    value={config}
                    onChange={setConfig}
                  />
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Este plugin nao possui configuracoes
                  </p>
                )}
              </TabsContent>

              <TabsContent value="branding" className="mt-4">
                <BrandingForm value={branding} onChange={setBranding} />
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
            Plugin nao encontrado
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default PluginConfigModal;
