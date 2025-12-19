// path: apps/web/src/modules/pay/pages/enterprise/ApiKeysPage.tsx
// Bazari Pay - API Keys Management Page (PROMPT-06)

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Key, Plus, Trash2, Copy, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';
import { useSellerProfiles } from '@/hooks/useSellerProfiles';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  status: 'ACTIVE' | 'REVOKED';
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string;
  company: { id: string; shopName: string };
}

interface NewKeyResponse {
  id: string;
  name: string;
  key: string;
  prefix: string;
  permissions: string[];
  warning: string;
}

export function ApiKeysPage() {
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get('company');
  const { profiles } = useSellerProfiles();

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<NewKeyResponse | null>(null);
  const [showKey, setShowKey] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const response = await apiHelpers.get<{ keys: ApiKey[] }>(
        `/api/pay/api-keys${companyId ? `?companyId=${companyId}` : ''}`
      );
      setKeys(response.keys);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim() || !companyId) return;

    setCreating(true);
    try {
      const response = await apiHelpers.post<NewKeyResponse>('/api/pay/api-keys', {
        companyId,
        name: newKeyName.trim(),
      });

      setNewKey(response);
      setNewKeyName('');
      fetchKeys();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar API key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Tem certeza que deseja revogar esta API key? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await apiHelpers.delete(`/api/pay/api-keys/${id}`);
      toast.success('API key revogada');
      fetchKeys();
    } catch (error) {
      toast.error('Erro ao revogar API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (!companyId) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Empresa não selecionada</AlertTitle>
          <AlertDescription>
            Selecione uma empresa para gerenciar API keys.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const selectedCompany = profiles.find(p => p.id === companyId);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">
            Gerencie chaves de acesso à API para integração
            {selectedCompany && ` - ${selectedCompany.shopName}`}
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova API Key
        </Button>
      </div>

      {/* Keys List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Carregando...</p>
            </CardContent>
          </Card>
        ) : keys.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma API key criada</p>
              <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                Criar primeira API key
              </Button>
            </CardContent>
          </Card>
        ) : (
          keys.map((key) => (
            <Card key={key.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg">{key.name}</CardTitle>
                  <CardDescription>
                    <code className="text-sm">{key.keyPrefix}...</code>
                  </CardDescription>
                </div>
                <Badge variant={key.status === 'ACTIVE' ? 'default' : 'secondary'}>
                  {key.status === 'ACTIVE' ? 'Ativa' : 'Revogada'}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Permissões</p>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {key.permissions.map((p) => (
                        <Badge key={p} variant="outline" className="text-xs">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Uso</p>
                    <p>{key.usageCount} requisições</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Último uso</p>
                    <p>{key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Nunca'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Criada em</p>
                    <p>{formatDate(key.createdAt)}</p>
                  </div>
                </div>
              </CardContent>
              {key.status === 'ACTIVE' && (
                <CardFooter>
                  <Button variant="destructive" size="sm" onClick={() => handleRevoke(key.id)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Revogar
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova API Key</DialogTitle>
          </DialogHeader>
          {newKey ? (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Guarde esta chave!</AlertTitle>
                <AlertDescription>
                  Esta é a única vez que você verá a chave completa.
                </AlertDescription>
              </Alert>
              <div className="relative">
                <Input
                  value={showKey ? newKey.key : '•'.repeat(40)}
                  readOnly
                  className="pr-20 font-mono text-sm"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(newKey.key)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome da chave</label>
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Ex: Integração ERP"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            {newKey ? (
              <Button
                onClick={() => {
                  setNewKey(null);
                  setShowCreateDialog(false);
                }}
              >
                Fechar
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={!newKeyName.trim() || creating}>
                  Criar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
