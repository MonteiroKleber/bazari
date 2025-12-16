# PROMPT 06: Ajustes no Developer Portal

## Contexto

O Developer Portal precisa de ajustes para integrar com o novo sistema de distribuição unificado da fase-4.

## Arquivos a Modificar

1. `apps/web/src/pages/developer/NewAppPage.tsx` - Simplificar e redirecionar
2. `apps/web/src/pages/developer/AppDetailDevPage.tsx` - Adicionar seção Distribution
3. `apps/web/src/pages/developer/ApiKeysPage.tsx` - Linkar com apps associados
4. `apps/web/src/pages/developer/DevPreviewPage.tsx` - Melhorar console de debug

## Requisitos

### 1. Simplificar NewAppPage

Transformar de formulário completo para hub de opções:

```tsx
// apps/web/src/pages/developer/NewAppPage.tsx

import { Link } from 'react-router-dom';
import { Code, Upload, Terminal, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DeveloperLayout } from '@/layouts/DeveloperLayout';

export default function NewAppPage() {
  return (
    <DeveloperLayout
      title="Novo App"
      description="Escolha como criar seu app Bazari"
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-4xl">
        {/* Opção 1: Bazari Studio */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="p-3 rounded-lg bg-primary/10 w-fit mb-2">
              <Code className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Bazari Studio</CardTitle>
            <CardDescription>
              IDE completa com templates, preview e publicação integrada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1 mb-4">
              <li>• Templates prontos para usar</li>
              <li>• Editor de código integrado</li>
              <li>• Preview em tempo real</li>
              <li>• Assistente AI</li>
            </ul>
            <Button asChild className="w-full">
              <Link to="/app/studio">
                Abrir Studio
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Opção 2: CLI */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="p-3 rounded-lg bg-purple-500/10 w-fit mb-2">
              <Terminal className="h-6 w-6 text-purple-500" />
            </div>
            <CardTitle>Bazari CLI</CardTitle>
            <CardDescription>
              Crie localmente com seu editor favorito
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1 mb-4">
              <li>• Use VS Code, Vim, etc</li>
              <li>• Hot reload local</li>
              <li>• Controle total</li>
              <li>• CI/CD friendly</li>
            </ul>
            <div className="space-y-2">
              <code className="block text-xs bg-muted p-2 rounded">
                npm i -g @bazari/cli
              </code>
              <code className="block text-xs bg-muted p-2 rounded">
                bazari create meu-app
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Opção 3: Importar existente */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="p-3 rounded-lg bg-orange-500/10 w-fit mb-2">
              <Upload className="h-6 w-6 text-orange-500" />
            </div>
            <CardTitle>Importar Projeto</CardTitle>
            <CardDescription>
              Já tem um projeto? Registre para publicar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1 mb-4">
              <li>• Projeto criado com CLI</li>
              <li>• Migração de outro sistema</li>
              <li>• Registrar app existente</li>
            </ul>
            <Button variant="outline" asChild className="w-full">
              <Link to="/app/developer/import">
                Importar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Start */}
      <Card className="mt-8 max-w-4xl">
        <CardHeader>
          <CardTitle className="text-lg">Não sabe por onde começar?</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-4">
              Se é sua primeira vez, recomendamos o <strong>Bazari Studio</strong>.
              Ele tem tudo que você precisa para criar, testar e publicar seu app.
            </p>
          </div>
          <Button asChild>
            <Link to="/app/developer/docs/quick-start">
              Ver Tutorial
            </Link>
          </Button>
        </CardContent>
      </Card>
    </DeveloperLayout>
  );
}
```

### 2. Adicionar Distribution em AppDetailDevPage

Adicionar seção no SettingsForm (dentro do tab Settings):

```tsx
// apps/web/src/pages/developer/AppDetailDevPage.tsx

// Adicionar imports
import { Store, ExternalLink, Key } from 'lucide-react';

// No SettingsForm, adicionar após os campos existentes:

function SettingsForm({ app, onSave }: SettingsFormProps) {
  // ... estado existente ...

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ... campos existentes ... */}

      {/* NOVA SEÇÃO: Distribuição */}
      <div className="space-y-4 pt-6 border-t">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Distribuição
        </h3>

        {/* App Store */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Store className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">App Store</h4>
                  <p className="text-sm text-muted-foreground">
                    Publicado no marketplace Bazari
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={
                  app.status === 'APPROVED' ? 'default' :
                  app.status === 'PENDING_REVIEW' ? 'secondary' :
                  'destructive'
                }>
                  {app.status === 'APPROVED' && 'Publicado'}
                  {app.status === 'PENDING_REVIEW' && 'Em Revisão'}
                  {app.status === 'REJECTED' && 'Rejeitado'}
                  {app.status === 'DRAFT' && 'Rascunho'}
                </Badge>
              </div>
            </div>

            {app.bundleUrl && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Bundle URL</span>
                  <a
                    href={app.bundleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    {app.bundleUrl.slice(0, 40)}...
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {app.bundleHash && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Hash</span>
                    <code className="text-xs">{app.bundleHash.slice(0, 16)}...</code>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* SDK Externo */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Key className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <h4 className="font-medium">SDK Externo</h4>
                  <p className="text-sm text-muted-foreground">
                    Integração via API Key no seu domínio
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/app/developer/api-keys">
                  Gerenciar API Keys
                </Link>
              </Button>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">
              Use API Keys para integrar o SDK do Bazari em apps externos
              que rodam no seu próprio domínio.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ... resto do form ... */}
    </form>
  );
}
```

### 3. Linkar API Keys com Apps

Atualizar ApiKeysPage para mostrar app associado:

```tsx
// apps/web/src/pages/developer/ApiKeysPage.tsx

// Atualizar interface SdkApp
interface SdkApp {
  // ... campos existentes ...
  linkedThirdPartyApp?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

// No card do app, adicionar após as stats:
{app.linkedThirdPartyApp && (
  <div className="flex items-center gap-2 pt-2 border-t text-sm">
    <Store className="h-4 w-4 text-muted-foreground" />
    <span className="text-muted-foreground">App Store:</span>
    <Link
      to={`/app/developer/apps/${app.linkedThirdPartyApp.id}`}
      className="text-primary hover:underline"
    >
      {app.linkedThirdPartyApp.name}
    </Link>
  </div>
)}

// Na criação de nova API Key, adicionar opção de linkar:
<div className="space-y-2">
  <Label>Linkar com App da Store (opcional)</Label>
  <Select
    value={formData.linkedAppId || ''}
    onValueChange={(value) => setFormData(prev => ({
      ...prev,
      linkedAppId: value || undefined
    }))}
  >
    <SelectTrigger>
      <SelectValue placeholder="Selecione um app..." />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="">Nenhum</SelectItem>
      {myApps.map(app => (
        <SelectItem key={app.id} value={app.id}>
          {app.name}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  <p className="text-xs text-muted-foreground">
    Vincule a um app publicado para unificar a gestão
  </p>
</div>
```

### 4. Melhorar DevPreviewPage Console

Adicionar mais informações de debug:

```tsx
// apps/web/src/pages/developer/DevPreviewPage.tsx

// Atualizar interface LogEntry
interface LogEntry {
  id: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'permission';
  message: string;
  timestamp: Date;
  data?: unknown;
  permission?: string; // Permissão relacionada
}

// No handler de mensagens, adicionar log de permissões:
try {
  await handleAppMessage(
    'dev-preview',
    message,
    iframeRef.current,
    event.origin
  );

  // Log detalhado para dev-preview
  if (message.type.includes(':')) {
    const [namespace] = message.type.split(':');
    addLog('permission', `Permissão auto-concedida: ${namespace}:*`, {
      messageType: message.type,
      note: 'Em dev-preview, todas as permissões são concedidas automaticamente'
    });
  }

  addLog('success', `Resposta enviada: ${message.type}`);
} catch (error) {
  addLog('error', `Erro: ${error instanceof Error ? error.message : 'Unknown'}`, {
    messageType: message.type,
    payload: message.payload
  });
}

// Adicionar seção de info sobre permissões
<Card className="mt-4">
  <CardHeader className="pb-3">
    <CardTitle className="text-base flex items-center gap-2">
      <Shield className="w-4 h-4" />
      Modo Desenvolvimento
    </CardTitle>
  </CardHeader>
  <CardContent className="text-sm space-y-2">
    <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-700 dark:text-yellow-300">
      <p className="font-medium mb-1">Permissões Auto-Concedidas</p>
      <p className="text-xs">
        No modo dev-preview, todas as permissões são concedidas automaticamente.
        Em produção, o usuário precisará aprovar cada permissão.
      </p>
    </div>
    <div className="text-muted-foreground text-xs">
      <p>App ID: <code>dev-preview</code></p>
      <p>Origem: <code>{loadedUrl ? new URL(loadedUrl).origin : 'N/A'}</code></p>
    </div>
  </CardContent>
</Card>

// Melhorar renderização de logs com tipo permission
const getLogIcon = (type: LogEntry['type']) => {
  switch (type) {
    case 'error': return <XCircle className="w-3.5 h-3.5" />;
    case 'success': return <CheckCircle className="w-3.5 h-3.5" />;
    case 'warning': return <AlertCircle className="w-3.5 h-3.5" />;
    case 'permission': return <Shield className="w-3.5 h-3.5" />;
    default: return <span className="text-muted-foreground">›</span>;
  }
};

const getLogStyles = (type: LogEntry['type']) => {
  switch (type) {
    case 'error': return 'bg-destructive/10 text-destructive';
    case 'success': return 'bg-green-500/10 text-green-600';
    case 'warning': return 'bg-yellow-500/10 text-yellow-600';
    case 'permission': return 'bg-blue-500/10 text-blue-600';
    default: return 'text-muted-foreground';
  }
};
```

### 5. Criar Página de Importação (Opcional)

```tsx
// apps/web/src/pages/developer/ImportAppPage.tsx

import { useState } from 'react';
import { Upload, FileJson, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DeveloperLayout } from '@/layouts/DeveloperLayout';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function ImportAppPage() {
  const [manifest, setManifest] = useState<Record<string, unknown> | null>(null);
  const [bundleUrl, setBundleUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setManifest(parsed);
      toast.success('Manifesto carregado!');
    } catch {
      toast.error('Arquivo inválido. Use bazari.manifest.json');
    }
  };

  const handleImport = async () => {
    if (!manifest) return;

    setIsImporting(true);
    try {
      const response = await api.post('/developer/apps/import', {
        manifest,
        bundleUrl: bundleUrl || undefined,
      });

      toast.success('App importado com sucesso!');
      // Redirect to app detail
      window.location.href = `/app/developer/apps/${response.app.id}`;
    } catch (error: any) {
      toast.error(error.message || 'Erro ao importar');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <DeveloperLayout
      title="Importar App"
      description="Registre um app existente no Developer Portal"
    >
      <div className="max-w-2xl space-y-6">
        {/* Step 1: Upload manifest */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              1. Upload do Manifesto
            </CardTitle>
            <CardDescription>
              Faça upload do arquivo bazari.manifest.json do seu projeto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
                id="manifest-upload"
              />
              <Label
                htmlFor="manifest-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  Clique para selecionar bazari.manifest.json
                </span>
              </Label>
            </div>

            {manifest && (
              <div className="mt-4 p-4 bg-green-500/10 rounded-lg">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <Check className="h-4 w-4" />
                  <span className="font-medium">Manifesto carregado</span>
                </div>
                <div className="text-sm space-y-1">
                  <p><strong>Nome:</strong> {manifest.name as string}</p>
                  <p><strong>Slug:</strong> {manifest.slug as string}</p>
                  <p><strong>Versão:</strong> {manifest.version as string}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Bundle URL (optional) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              2. Bundle URL (Opcional)
            </CardTitle>
            <CardDescription>
              Se já fez upload do bundle para IPFS, cole a URL aqui
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="https://bazari.libervia.xyz/ipfs/Qm..."
              value={bundleUrl}
              onChange={(e) => setBundleUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Deixe em branco se ainda vai publicar pelo CLI ou Studio
            </p>
          </CardContent>
        </Card>

        {/* Import Button */}
        <Button
          onClick={handleImport}
          disabled={!manifest || isImporting}
          className="w-full"
          size="lg"
        >
          {isImporting ? 'Importando...' : 'Importar App'}
        </Button>

        {/* Warning */}
        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 rounded-lg text-sm">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-700 dark:text-yellow-300">
              Importante
            </p>
            <p className="text-muted-foreground">
              A importação apenas registra o app no portal. Para publicar na
              App Store, você precisará fazer upload do bundle via CLI ou Studio.
            </p>
          </div>
        </div>
      </div>
    </DeveloperLayout>
  );
}
```

## Testes

1. NewAppPage mostra 3 opções (Studio, CLI, Importar)
2. AppDetailDevPage mostra seção de Distribuição
3. Link para API Keys funciona
4. ApiKeysPage mostra app linkado (se houver)
5. DevPreviewPage mostra logs de permissão
6. DevPreviewPage mostra aviso sobre modo desenvolvimento
7. ImportAppPage carrega e valida manifesto

## Critérios de Aceitação

- [ ] NewAppPage simplificado com opções claras
- [ ] AppDetailDevPage com seção de Distribuição
- [ ] ApiKeysPage com link para app associado
- [ ] DevPreviewPage com console melhorado
- [ ] ImportAppPage funcional (opcional)
- [ ] Links entre Portal e Studio funcionando
- [ ] Fluxo de navegação intuitivo
