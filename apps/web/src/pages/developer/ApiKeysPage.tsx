import { useState, useEffect } from 'react';
import { Plus, Key, Copy, RotateCw, Trash2, Eye, EyeOff, ExternalLink, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { api } from '@/lib/api';
import { DeveloperLayout } from '@/layouts/DeveloperLayout';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SdkApp {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  websiteUrl: string | null;
  apiKey: string;
  allowedOrigins: string[];
  permissions: string[];
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';
  reviewNotes: string | null;
  totalRequests: string;
  lastRequestAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateAppResponse {
  app: SdkApp;
  secretKey: string;
  warning: string;
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Ativo',
  SUSPENDED: 'Suspenso',
  REJECTED: 'Rejeitado',
};

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  APPROVED: 'default',
  SUSPENDED: 'destructive',
  REJECTED: 'destructive',
};

const permissionLabels: Record<string, string> = {
  'user:read': 'Ler perfil do usuário',
  'wallet:read': 'Ver saldo da carteira',
  'wallet:transfer': 'Solicitar transferências',
  'storage:read': 'Ler dados armazenados',
  'storage:write': 'Salvar dados',
  'ui:toast': 'Mostrar notificações',
  'ui:modal': 'Abrir modais',
  'contracts:read': 'Ler contratos',
  'contracts:deploy': 'Fazer deploy de contratos',
  'contracts:execute': 'Executar contratos',
};

export default function ApiKeysPage() {
  const [apps, setApps] = useState<SdkApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSecretKey, setNewSecretKey] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    websiteUrl: '',
    allowedOrigins: '',
    permissions: ['user:read', 'wallet:read'] as string[],
  });

  const fetchApps = async () => {
    try {
      const response = await api.get<{ apps: SdkApp[] }>('/developer/sdk-apps');
      setApps(response.apps || []);
    } catch (error) {
      console.error('Error fetching SDK apps:', error);
      toast.error('Falha ao carregar API keys');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const handleCreate = async () => {
    try {
      const origins = formData.allowedOrigins
        .split('\n')
        .map(o => o.trim())
        .filter(o => o.length > 0);

      if (origins.length === 0) {
        toast.error('Adicione pelo menos uma origem permitida');
        return;
      }

      const response = await api.post<CreateAppResponse>('/developer/sdk-apps', {
        name: formData.name,
        description: formData.description || undefined,
        websiteUrl: formData.websiteUrl || undefined,
        allowedOrigins: origins,
        permissions: formData.permissions,
      });

      setNewSecretKey(response.secretKey);
      setApps(prev => [response.app, ...prev]);

      toast.success('API Key criada! Salve a Secret Key.');

      // Reset form but keep dialog open to show secret key
      setFormData({
        name: '',
        description: '',
        websiteUrl: '',
        allowedOrigins: '',
        permissions: ['user:read', 'wallet:read'],
      });
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar API Key');
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const handleRotateSecret = async (appId: string) => {
    try {
      const response = await api.post<{ secretKey: string }>(`/developer/sdk-apps/${appId}/rotate-secret`);
      setNewSecretKey(response.secretKey);
      toast.success('Secret Key rotacionada! Salve a nova chave.');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao rotacionar');
    }
  };

  const handleRotateApiKey = async (appId: string) => {
    try {
      const response = await api.post<{ apiKey: string }>(`/developer/sdk-apps/${appId}/rotate-api-key`);
      setApps(prev => prev.map(app =>
        app.id === appId ? { ...app, apiKey: response.apiKey } : app
      ));
      toast.success('API Key rotacionada! A antiga foi invalidada.');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao rotacionar');
    }
  };

  const handleDelete = async (appId: string) => {
    try {
      await api.delete(`/developer/sdk-apps/${appId}`);
      setApps(prev => prev.filter(app => app.id !== appId));
      toast.success('API Key revogada');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao revogar');
    }
  };

  const toggleKeyVisibility = (appId: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  };

  const maskKey = (key: string) => {
    return key.substring(0, 12) + '••••••••••••••••';
  };

  return (
    <DeveloperLayout
      title="API Keys"
      description="Gerencie credenciais para apps externos que usam o SDK"
      actions={
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) setNewSecretKey(null);
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            {newSecretKey ? (
              <>
                <DialogHeader>
                  <DialogTitle className="text-green-600">API Key Criada!</DialogTitle>
                  <DialogDescription>
                    Salve a Secret Key abaixo. Ela <strong>não será mostrada novamente</strong>.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <Label className="text-yellow-800 dark:text-yellow-200 font-medium">Secret Key</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="flex-1 text-sm bg-yellow-100 dark:bg-yellow-900 p-2 rounded break-all">
                        {newSecretKey}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(newSecretKey, 'Secret Key')}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => {
                    setIsCreateOpen(false);
                    setNewSecretKey(null);
                  }}>
                    Entendi, salvei a chave
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Nova API Key</DialogTitle>
                  <DialogDescription>
                    Crie credenciais para um app externo usar o SDK do Bazari.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do App *</Label>
                    <Input
                      id="name"
                      placeholder="Meu App Incrível"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      placeholder="O que seu app faz?"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://meuapp.com"
                      value={formData.websiteUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="origins">Origens Permitidas *</Label>
                    <Textarea
                      id="origins"
                      placeholder="https://meuapp.com&#10;https://staging.meuapp.com"
                      value={formData.allowedOrigins}
                      onChange={(e) => setFormData(prev => ({ ...prev, allowedOrigins: e.target.value }))}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Uma URL por linha. Apenas estas origens poderão usar a API Key.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Permissões</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(permissionLabels).map(([perm, label]) => (
                        <label key={perm} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(perm)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  permissions: [...prev.permissions, perm],
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  permissions: prev.permissions.filter(p => p !== perm),
                                }));
                              }
                            }}
                            className="rounded"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreate} disabled={!formData.name || !formData.allowedOrigins}>
                    Criar API Key
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : apps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma API Key</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie uma API Key para permitir que apps externos usem o SDK do Bazari.
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar primeira API Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {apps.map((app) => (
            <Card key={app.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {app.name}
                      <Badge variant={statusColors[app.status]}>
                        {statusLabels[app.status]}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {app.description || 'Sem descrição'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {app.websiteUrl && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={app.websiteUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revogar API Key?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação é irreversível. O app "{app.name}" não poderá mais acessar a plataforma.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(app.id)}
                            className="bg-destructive text-destructive-foreground"
                          >
                            Revogar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* API Key */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">API Key</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm bg-muted p-2 rounded font-mono">
                      {visibleKeys.has(app.id) ? app.apiKey : maskKey(app.apiKey)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleKeyVisibility(app.id)}
                    >
                      {visibleKeys.has(app.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(app.apiKey, 'API Key')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <RotateCw className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Rotacionar API Key?</AlertDialogTitle>
                          <AlertDialogDescription>
                            A API Key atual será invalidada imediatamente. Você precisará atualizar a configuração do seu app.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRotateApiKey(app.id)}>
                            Rotacionar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Secret Key Actions */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Secret Key (HMAC)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      A Secret Key não é armazenada. Use a opção abaixo para gerar uma nova.
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <RotateCw className="w-4 h-4 mr-2" />
                          Rotacionar Secret
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Rotacionar Secret Key?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Uma nova Secret Key será gerada. A atual será invalidada.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRotateSecret(app.id)}>
                            Rotacionar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Origins */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Origens Permitidas</Label>
                  <div className="flex flex-wrap gap-2">
                    {app.allowedOrigins.map((origin, i) => (
                      <Badge key={i} variant="outline" className="font-mono text-xs">
                        {origin}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Permissions */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Permissões</Label>
                  <div className="flex flex-wrap gap-2">
                    {app.permissions.map((perm, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {permissionLabels[perm] || perm}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 pt-2 border-t text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    <span>{parseInt(app.totalRequests).toLocaleString()} requisições</span>
                  </div>
                  {app.lastRequestAt && (
                    <div>
                      Último uso: {formatDistanceToNow(new Date(app.lastRequestAt), { addSuffix: true, locale: ptBR })}
                    </div>
                  )}
                  <div>
                    Criado: {formatDistanceToNow(new Date(app.createdAt), { addSuffix: true, locale: ptBR })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Secret Key Modal (for rotation) */}
      <Dialog open={!!newSecretKey && !isCreateOpen} onOpenChange={(open) => !open && setNewSecretKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-green-600">Nova Secret Key</DialogTitle>
            <DialogDescription>
              Salve a Secret Key abaixo. Ela <strong>não será mostrada novamente</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <Label className="text-yellow-800 dark:text-yellow-200 font-medium">Secret Key</Label>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 text-sm bg-yellow-100 dark:bg-yellow-900 p-2 rounded break-all">
                  {newSecretKey}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(newSecretKey!, 'Secret Key')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewSecretKey(null)}>
              Entendi, salvei a chave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DeveloperLayout>
  );
}
