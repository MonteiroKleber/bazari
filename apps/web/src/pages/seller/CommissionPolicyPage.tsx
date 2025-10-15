import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Slider } from '../../components/ui/slider';
import { Switch } from '../../components/ui/switch';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { apiHelpers } from '../../lib/api';
import { StoreCommissionPolicy } from '@bazari/shared-types';

export function CommissionPolicyPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storeId, setStoreId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    mode: 'open' as 'open' | 'followers' | 'affiliates',
    percent: 5,
    minReputation: 0,
    dailyCommissionCap: '',
    allowMultiStore: true,
  });

  useEffect(() => {
    loadCurrentStore();
  }, []);

  const loadCurrentStore = async () => {
    try {
      setLoading(true);
      // Buscar lojas do usuário usando o endpoint correto
      const response = await apiHelpers.get<{ items: Array<{ id: string; onChainStoreId?: number | string | bigint }> }>('/me/sellers');

      if (response.items && response.items.length > 0) {
        const firstStore = response.items[0];
        // Usar onChainStoreId para a política de comissão
        const storeIdNum = firstStore.onChainStoreId
          ? (typeof firstStore.onChainStoreId === 'string'
              ? parseInt(firstStore.onChainStoreId)
              : typeof firstStore.onChainStoreId === 'bigint'
              ? Number(firstStore.onChainStoreId)
              : Number(firstStore.onChainStoreId))
          : null;

        if (storeIdNum) {
          setStoreId(storeIdNum);
          await loadPolicy(storeIdNum);
        } else {
          toast.error('Sua loja ainda não foi sincronizada na blockchain');
        }
      } else {
        toast.error('Você não possui uma loja cadastrada');
      }
    } catch (error) {
      console.error('Failed to load store:', error);
      toast.error('Erro ao carregar loja');
    } finally {
      setLoading(false);
    }
  };

  const loadPolicy = async (storeId: number) => {
    try {
      const data = await apiHelpers.get<{ policy?: StoreCommissionPolicy }>(
        `/api/chat/settings/store/${storeId}`
      );

      if (data.policy) {
        setFormData({
          mode: data.policy.mode,
          percent: data.policy.percent,
          minReputation: data.policy.minReputation || 0,
          dailyCommissionCap: data.policy.dailyCommissionCap || '',
          allowMultiStore: data.policy.allowMultiStore !== undefined ? data.policy.allowMultiStore : true,
        });
      }
    } catch (error) {
      // Se não existir política, manter valores padrão
      console.log('No existing policy found, using defaults');
    }
  };

  const handleSave = async () => {
    if (!storeId) {
      toast.error('Loja não encontrada');
      return;
    }

    try {
      setSaving(true);

      await apiHelpers.put(`/api/chat/settings/store/${storeId}`, {
        mode: formData.mode,
        percent: formData.percent,
        minReputation: formData.minReputation > 0 ? formData.minReputation : undefined,
        dailyCommissionCap: formData.dailyCommissionCap || undefined,
        allowMultiStore: formData.allowMultiStore,
      });

      toast.success('Política salva com sucesso!');
      navigate(-1);
    } catch (error) {
      console.error('Failed to save policy:', error);
      toast.error('Erro ao salvar política');
    } finally {
      setSaving(false);
    }
  };

  const calculatePreview = (baseAmount: number) => {
    return (baseAmount * formData.percent) / 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Política de Comissão</h1>
          <p className="text-sm text-muted-foreground">
            Configure como promotores podem divulgar seus produtos
          </p>
        </div>
      </div>

      {/* Modo de Acesso */}
      <Card>
        <CardHeader>
          <CardTitle>Modo de Acesso</CardTitle>
          <CardDescription>
            Defina quem pode promover seus produtos e ganhar comissão
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={formData.mode} onValueChange={(v) => setFormData({ ...formData, mode: v as any })}>
            <div className="flex items-center space-x-2 mb-3">
              <RadioGroupItem value="open" id="open" />
              <Label htmlFor="open" className="font-normal cursor-pointer">
                <div>
                  <div className="font-medium">Aberto</div>
                  <div className="text-sm text-muted-foreground">
                    Qualquer pessoa pode promover seus produtos
                  </div>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2 mb-3">
              <RadioGroupItem value="followers" id="followers" />
              <Label htmlFor="followers" className="font-normal cursor-pointer">
                <div>
                  <div className="font-medium">Apenas Seguidores</div>
                  <div className="text-sm text-muted-foreground">
                    Somente quem te segue pode promover
                  </div>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="affiliates" id="affiliates" />
              <Label htmlFor="affiliates" className="font-normal cursor-pointer">
                <div>
                  <div className="font-medium">Afiliados Aprovados</div>
                  <div className="text-sm text-muted-foreground">
                    Apenas promotores que você aprovar manualmente
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Percentual de Comissão */}
      <Card>
        <CardHeader>
          <CardTitle>Percentual de Comissão</CardTitle>
          <CardDescription>
            Quanto os promotores recebem por cada venda indicada
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Comissão</Label>
              <span className="text-2xl font-bold text-primary">{formData.percent}%</span>
            </div>
            <Slider
              value={[formData.percent]}
              onValueChange={([v]) => setFormData({ ...formData, percent: v })}
              min={0}
              max={15}
              step={1}
              className="py-4"
            />
            <p className="text-xs text-muted-foreground">
              Recomendamos entre 5% e 10% para equilibrar incentivo e margem
            </p>
          </div>

          {/* Preview */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <p className="text-sm font-medium">Exemplos de Comissão:</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">R$ 50</div>
                <div className="font-medium">R$ {calculatePreview(50).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">R$ 100</div>
                <div className="font-medium">R$ {calculatePreview(100).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">R$ 500</div>
                <div className="font-medium">R$ {calculatePreview(500).toFixed(2)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restrições */}
      <Card>
        <CardHeader>
          <CardTitle>Restrições (Opcional)</CardTitle>
          <CardDescription>
            Defina critérios mínimos para promotores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="minReputation">Reputação Mínima</Label>
            <Input
              id="minReputation"
              type="number"
              placeholder="0 (sem restrição)"
              value={formData.minReputation || ''}
              onChange={(e) => setFormData({ ...formData, minReputation: parseInt(e.target.value) || 0 })}
              min={0}
            />
            <p className="text-xs text-muted-foreground">
              Promotores precisam ter pelo menos esta reputação
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dailyCap">Limite Diário de Comissão (BZR)</Label>
            <Input
              id="dailyCap"
              type="number"
              placeholder="Sem limite"
              value={formData.dailyCommissionCap}
              onChange={(e) => setFormData({ ...formData, dailyCommissionCap: e.target.value })}
              min={0}
            />
            <p className="text-xs text-muted-foreground">
              Máximo que um promotor pode ganhar por dia
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Multi-Store Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Propostas Multi-Loja</CardTitle>
          <CardDescription>
            Permita que seus produtos sejam incluídos em propostas com produtos de outras lojas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="allow-multistore" className="text-base">
                Permitir propostas multi-loja
              </Label>
              <p className="text-sm text-muted-foreground">
                Quando habilitado, promotores podem criar propostas que incluem seus produtos junto com produtos de outras lojas em uma única transação
              </p>
            </div>
            <Switch
              id="allow-multistore"
              checked={formData.allowMultiStore}
              onCheckedChange={(checked) => setFormData({ ...formData, allowMultiStore: checked })}
            />
          </div>

          {!formData.allowMultiStore && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-900 dark:text-amber-100">
                ⚠️ Com esta opção desabilitada, apenas propostas com produtos exclusivamente da sua loja serão aceitas. Propostas que incluem produtos de outras lojas serão rejeitadas.
              </p>
            </div>
          )}

          {formData.allowMultiStore && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                ℹ️ Seus produtos podem aparecer em propostas junto com produtos de outras lojas. Cada loja receberá seu pagamento separadamente de acordo com os itens vendidos.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate(-1)} className="flex-1">
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? 'Salvando...' : 'Salvar Política'}
        </Button>
      </div>
    </div>
  );
}
