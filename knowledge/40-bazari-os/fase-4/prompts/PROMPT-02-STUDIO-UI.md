# PROMPT 02: Atualizar UI do Bazari Studio

## Contexto

O Bazari Studio precisa de UI para configurar e gerenciar distribuição de apps (App Store vs SDK Externo).

## Arquivos a Modificar

1. `apps/web/src/apps/studio/pages/ProjectSettingsPage.tsx` - Adicionar seção de distribuição
2. `apps/web/src/apps/studio/pages/PublishPage.tsx` - Abas separadas por target
3. `apps/web/src/apps/studio/components/DistributionConfig.tsx` - Novo componente

## Requisitos

### 1. Criar DistributionConfig Component

```tsx
// apps/web/src/apps/studio/components/DistributionConfig.tsx

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, ExternalLink, Plus, X } from 'lucide-react';

interface DistributionConfig {
  appStore: boolean;
  external: boolean;
  allowedOrigins: string[];
}

interface Props {
  value: DistributionConfig;
  onChange: (config: DistributionConfig) => void;
}

export function DistributionConfig({ value, onChange }: Props) {
  const [newOrigin, setNewOrigin] = useState('');

  const addOrigin = () => {
    if (newOrigin && !value.allowedOrigins.includes(newOrigin)) {
      try {
        new URL(newOrigin);
        onChange({
          ...value,
          allowedOrigins: [...value.allowedOrigins, newOrigin],
        });
        setNewOrigin('');
      } catch {
        // Invalid URL
      }
    }
  };

  const removeOrigin = (origin: string) => {
    onChange({
      ...value,
      allowedOrigins: value.allowedOrigins.filter((o) => o !== origin),
    });
  };

  return (
    <div className="space-y-4">
      {/* App Store */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Store className="h-5 w-5" />
              <div>
                <CardTitle className="text-base">App Store</CardTitle>
                <CardDescription>
                  Publicar no marketplace Bazari
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={value.appStore}
              onCheckedChange={(checked) =>
                onChange({ ...value, appStore: checked })
              }
            />
          </div>
        </CardHeader>
        {value.appStore && (
          <CardContent className="pt-0">
            <div className="text-sm text-muted-foreground">
              <ul className="list-disc list-inside space-y-1">
                <li>Bundle hospedado no IPFS</li>
                <li>Usuários instalam pelo marketplace</li>
                <li>Revisão antes de publicar</li>
              </ul>
            </div>
          </CardContent>
        )}
      </Card>

      {/* SDK Externo */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ExternalLink className="h-5 w-5" />
              <div>
                <CardTitle className="text-base">SDK Externo</CardTitle>
                <CardDescription>
                  Integrar via API Key no seu domínio
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={value.external}
              onCheckedChange={(checked) =>
                onChange({ ...value, external: checked })
              }
            />
          </div>
        </CardHeader>
        {value.external && (
          <CardContent className="pt-0 space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              <ul className="list-disc list-inside space-y-1">
                <li>Roda no seu site/app</li>
                <li>Autenticação via API Key</li>
                <li>Você gerencia a hospedagem</li>
              </ul>
            </div>

            <div>
              <Label>Origens Permitidas</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Domínios que podem usar a API Key
              </p>

              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="https://meusite.com"
                  value={newOrigin}
                  onChange={(e) => setNewOrigin(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addOrigin()}
                />
                <Button size="sm" onClick={addOrigin}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {value.allowedOrigins.map((origin) => (
                  <Badge key={origin} variant="secondary">
                    {origin}
                    <button
                      className="ml-1 hover:text-destructive"
                      onClick={() => removeOrigin(origin)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {value.allowedOrigins.length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    Nenhuma origem configurada
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Warning se nenhum selecionado */}
      {!value.appStore && !value.external && (
        <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md">
          Selecione pelo menos uma forma de distribuição
        </div>
      )}
    </div>
  );
}
```

### 2. Atualizar ProjectSettingsPage

Adicionar seção de distribuição:

```tsx
// apps/web/src/apps/studio/pages/ProjectSettingsPage.tsx

import { DistributionConfig } from '../components/DistributionConfig';

export function ProjectSettingsPage() {
  const { manifest, updateManifest } = useProjectContext();

  return (
    <div className="space-y-8">
      {/* ... outras seções ... */}

      {/* Distribuição */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Distribuição</h2>
        <DistributionConfig
          value={manifest.distribution || { appStore: true, external: false, allowedOrigins: [] }}
          onChange={(distribution) => updateManifest({ distribution })}
        />
      </section>
    </div>
  );
}
```

### 3. Atualizar PublishPage com Abas

```tsx
// apps/web/src/apps/studio/pages/PublishPage.tsx

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Store, ExternalLink, Key, Copy, RefreshCw } from 'lucide-react';

export function PublishPage() {
  const { manifest, project } = useProjectContext();
  const [activeTab, setActiveTab] = useState<string>('appstore');

  const distribution = manifest.distribution || {
    appStore: true,
    external: false,
    allowedOrigins: [],
  };

  // Determinar tabs disponíveis
  const availableTabs = [];
  if (distribution.appStore) availableTabs.push('appstore');
  if (distribution.external) availableTabs.push('external');

  if (availableTabs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          Configure a distribuição nas configurações do projeto
        </p>
        <Button onClick={() => navigate('settings')}>
          Ir para Configurações
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Publicar</h1>
        <p className="text-muted-foreground">
          {manifest.name} v{manifest.version}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {distribution.appStore && (
            <TabsTrigger value="appstore">
              <Store className="h-4 w-4 mr-2" />
              App Store
            </TabsTrigger>
          )}
          {distribution.external && (
            <TabsTrigger value="external">
              <ExternalLink className="h-4 w-4 mr-2" />
              SDK Externo
            </TabsTrigger>
          )}
        </TabsList>

        {distribution.appStore && (
          <TabsContent value="appstore">
            <AppStorePublishTab manifest={manifest} project={project} />
          </TabsContent>
        )}

        {distribution.external && (
          <TabsContent value="external">
            <ExternalPublishTab manifest={manifest} project={project} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function AppStorePublishTab({ manifest, project }) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [changelog, setChangelog] = useState('');

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      // 1. Build
      // 2. Upload to IPFS
      // 3. Submit for review
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Publicar na App Store</CardTitle>
        <CardDescription>
          Seu app será revisado antes de ficar disponível no marketplace
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Changelog</Label>
          <Textarea
            placeholder="O que mudou nesta versão?"
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handlePublish} disabled={isPublishing}>
            {isPublishing ? 'Publicando...' : 'Publicar na App Store'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ExternalPublishTab({ manifest, project }) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Buscar API Key existente
    loadExistingApiKey();
  }, []);

  const loadExistingApiKey = async () => {
    try {
      const response = await api.get(`/developer/sdk-apps?slug=${manifest.slug}`);
      if (response.apps?.length > 0) {
        setApiKey(response.apps[0].apiKey);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generateApiKey = async () => {
    const response = await api.post('/developer/sdk-apps', {
      name: manifest.name,
      slug: manifest.slug,
      allowedOrigins: manifest.distribution.allowedOrigins,
      permissions: manifest.permissions.map((p) => convertPermission(p.id)),
    });

    setApiKey(response.app.apiKey);
    setSecretKey(response.secretKey);
  };

  const rotateSecret = async () => {
    const response = await api.post(`/developer/sdk-apps/${apiKey}/rotate-secret`);
    setSecretKey(response.secretKey);
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>SDK Externo</CardTitle>
        <CardDescription>
          Use estas credenciais para integrar no seu site
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!apiKey ? (
          <div className="text-center py-8">
            <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Gere uma API Key para usar o SDK externamente
            </p>
            <Button onClick={generateApiKey}>
              Gerar API Key
            </Button>
          </div>
        ) : (
          <>
            <div>
              <Label>API Key</Label>
              <div className="flex gap-2">
                <Input value={apiKey} readOnly className="font-mono" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigator.clipboard.writeText(apiKey)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {secretKey && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex items-center gap-2 text-yellow-800 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Salve a Secret Key!</span>
                </div>
                <p className="text-sm text-yellow-700 mb-2">
                  Esta chave não será mostrada novamente.
                </p>
                <div className="flex gap-2">
                  <Input value={secretKey} readOnly className="font-mono" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigator.clipboard.writeText(secretKey)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div>
              <Label>Origens Permitidas</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {manifest.distribution.allowedOrigins?.map((origin) => (
                  <Badge key={origin} variant="secondary">
                    {origin}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={rotateSecret}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Rotacionar Secret
              </Button>
            </div>

            {/* Código de exemplo */}
            <div>
              <Label>Código de Integração</Label>
              <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
{`import { BazariSDK } from '@bazari/app-sdk';

const sdk = new BazariSDK({
  apiKey: '${apiKey}',
  secretKey: 'YOUR_SECRET_KEY'
});

// Usar o SDK
const user = await sdk.auth.getCurrentUser();`}
              </pre>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

## Testes

1. Abrir projeto no Studio
2. Ir para Configurações → Distribuição
3. Habilitar App Store e verificar UI
4. Habilitar SDK Externo e adicionar origens
5. Ir para Publicar e verificar que tabs aparecem corretamente
6. Testar publicação na App Store
7. Testar geração de API Key
8. Testar cópia de credenciais

## Critérios de Aceitação

- [ ] DistributionConfig component criado e funcional
- [ ] Página de Settings mostra seção de distribuição
- [ ] Página de Publish mostra tabs baseado na configuração
- [ ] Tab App Store permite publicar com changelog
- [ ] Tab SDK Externo permite gerar/ver API Key
- [ ] Secret Key é mostrada apenas uma vez
- [ ] Código de integração é exibido corretamente
