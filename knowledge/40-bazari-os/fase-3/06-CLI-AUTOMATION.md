# 06 - Automacao do CLI (Create/Build/Publish)

## Objetivo

Automatizar os comandos do CLI existente dentro do Studio via API local:
- `bazari create` - Criar novo projeto
- `bazari build` - Compilar para producao
- `bazari publish` - Publicar no Bazari

**IMPORTANTE**: A automacao deve seguir EXATAMENTE o mesmo fluxo que um desenvolvedor faria manualmente com o CLI. Nao inventar nada novo.

## Pre-requisitos

- PROMPT-01 (Estrutura Base)
- PROMPT-02 (CLI Server) - Execucao local via API
- PROMPT-03 (Editor) - Edicao de arquivos
- PROMPT-04 (Preview) - Visualizacao

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                    BROWSER (Studio UI)                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  NewProjectWizard / BuildDialog / PublishDialog             ││
│  │                                                             ││
│  │  Usuario preenche informacoes → Chama API local → Aguarda   ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │ HTTP POST
                               │ localhost:4444
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLI SERVER (localhost:4444)                  │
│                                                                 │
│  POST /api/projects                                             │
│  ├── Cria diretorio                                             │
│  ├── Copia template                                             │
│  ├── Substitui placeholders                                     │
│  └── npm install                                                │
│                                                                 │
│  POST /api/projects/:id/build                                   │
│  ├── npm install (se necessario)                                │
│  ├── npx tsc --noEmit                                           │
│  ├── npx vite build                                             │
│  ├── Copia manifest                                             │
│  └── Calcula hash                                               │
│                                                                 │
│  POST /api/projects/:id/publish                                 │
│  ├── Cria tarball                                               │
│  ├── Upload IPFS                                                │
│  └── Submit para review                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SISTEMA LOCAL                                │
│                                                                 │
│  - npm install → node_modules/                                  │
│  - vite build → dist/                                           │
│  - Arquivos no disco → ~/bazari-projects/my-app/                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Arquivos a Criar

```
apps/web/src/apps/studio/
├── services/
│   ├── create.client.ts      // Client para criar projetos
│   ├── build.client.ts       // Client para build
│   └── publish.client.ts     // Client para publish
├── components/
│   ├── wizards/
│   │   └── NewProjectWizard.tsx   // Wizard para criar projeto
│   └── dialogs/
│       ├── BuildDialog.tsx        // Dialog de build
│       └── PublishDialog.tsx      // Dialog de publish
└── hooks/
    └── useBuildPublish.ts         // Hook para build/publish
```

## Mapeamento CLI → Studio → API Local

### 1. `bazari create` → CreateClient

**O que o CLI faz** (packages/bazari-cli/src/commands/create.ts):

```typescript
// 1. Pergunta ao usuario:
//    - Template (react-ts ou vanilla)
//    - Nome do app
//    - Descricao
//    - Categoria
//    - Autor

// 2. Gera slug a partir do nome

// 3. Cria estrutura de arquivos:
//    - Copia template de templates/react-ts/
//    - Substitui placeholders ({{name}}, {{slug}}, etc)
//    - Cria bazari.manifest.json

// 4. Executa npm install
```

**Como o Studio automatiza via API**:

```typescript
// services/create.client.ts

import { localServer } from './local-server.client';

interface CreateProjectConfig {
  name: string;
  description: string;
  category: string;
  author: string;
  template: 'react-ts' | 'vanilla';
}

interface CreateProjectResult {
  success: boolean;
  projectId: string;
  projectPath: string;
  error?: string;
}

class CreateClient {
  /**
   * Cria projeto via API local
   * A logica de criacao roda no CLI Server (local)
   */
  async createProject(config: CreateProjectConfig): Promise<CreateProjectResult> {
    // Chama API local que executa a mesma logica do CLI
    const result = await localServer.post<CreateProjectResult>('/api/projects', {
      name: config.name,
      description: config.description,
      category: config.category,
      author: config.author,
      template: config.template,
    });

    return result;
  }
}

export const createClient = new CreateClient();
```

**API do CLI Server** (ja implementada em 03-CLI-SERVER.md):

```typescript
// server/routes/projects.ts

router.post('/projects', async (req, res) => {
  const { name, description, category, author, template } = req.body;

  // Mesma logica do CLI:
  // 1. Gera slug
  // 2. Cria diretorio
  // 3. Copia template
  // 4. Substitui placeholders
  // 5. npm install

  const project = await projectService.createProject(ctx.projectDir, {
    name,
    description,
    category,
    template,
  });

  res.json(project);
});
```

### 2. `bazari build` → BuildClient

**O que o CLI faz** (packages/bazari-cli/src/commands/build.ts):

```typescript
// 1. Carrega bazari.manifest.json
// 2. Se necessario: npm install
// 3. Executa: npx tsc --noEmit (type check)
// 4. Executa: npx vite build --outDir dist
// 5. Copia manifest para dist/
// 6. Calcula hash do bundle
// 7. Salva .build-info.json em dist/
```

**Como o Studio automatiza via API**:

```typescript
// services/build.client.ts

import { localServer } from './local-server.client';

interface BuildResult {
  success: boolean;
  buildInfo?: BuildInfo;
  output?: string;
  error?: string;
}

interface BuildInfo {
  hash: string;
  size: number;
  timestamp: string;
  builder: string;
}

class BuildClient {
  /**
   * Executa build via API local
   * Todo o build roda localmente na maquina do desenvolvedor
   */
  async build(projectId: string): Promise<BuildResult> {
    const result = await localServer.post<BuildResult>(
      `/api/projects/${projectId}/build`
    );
    return result;
  }

  /**
   * Obtem informacoes do ultimo build
   */
  async getBuildInfo(projectId: string): Promise<BuildInfo | null> {
    try {
      return await localServer.get<BuildInfo>(
        `/api/projects/${projectId}/build`
      );
    } catch {
      return null;
    }
  }
}

export const buildClient = new BuildClient();
```

**API do CLI Server** (ja implementada em 03-CLI-SERVER.md):

```typescript
// server/routes/build.ts

router.post('/projects/:projectId/build', async (req, res) => {
  const projectPath = path.join(ctx.projectDir, req.params.projectId);

  // Mesma logica do CLI:
  // 1. npm install se necessario
  // 2. npx tsc --noEmit
  // 3. npx vite build --outDir dist
  // 4. Copia manifest
  // 5. Calcula hash
  // 6. Salva .build-info.json

  const result = await buildService.build(projectPath);
  res.json(result);
});
```

### 3. `bazari publish` → PublishClient

**O que o CLI faz** (packages/bazari-cli/src/commands/publish.ts):

```typescript
// 1. Verifica login
// 2. Carrega manifest e build-info
// 3. Verifica se app existe no portal
// 4. Se nao existe: registra app
// 5. Cria tarball do dist/
// 6. Upload para IPFS
// 7. Submete para review
```

**Como o Studio automatiza via API**:

```typescript
// services/publish.client.ts

import { localServer } from './local-server.client';

interface PublishConfig {
  changelog: string;
  token: string; // Token do usuario logado no BazariOS
}

interface PublishResult {
  success: boolean;
  bundleUrl?: string;
  cid?: string;
  error?: string;
}

class PublishClient {
  /**
   * Publica projeto via API local
   * O upload IPFS e submit acontecem pelo CLI Server
   */
  async publish(projectId: string, config: PublishConfig): Promise<PublishResult> {
    const result = await localServer.post<PublishResult>(
      `/api/projects/${projectId}/publish`,
      {
        changelog: config.changelog,
        token: config.token, // Passa token para autenticar no Bazari API
      }
    );
    return result;
  }
}

export const publishClient = new PublishClient();
```

**API do CLI Server**:

```typescript
// server/routes/publish.ts

import archiver from 'archiver';
import FormData from 'form-data';

const BAZARI_API = 'https://bazari.libervia.xyz/api';

export function publishRoutes(ctx: { projectDir: string }) {
  const router = Router();

  router.post('/projects/:projectId/publish', async (req, res) => {
    const { projectId } = req.params;
    const { changelog, token } = req.body;
    const projectPath = path.join(ctx.projectDir, projectId);

    try {
      // 1. Carregar manifest e build-info
      const manifestPath = path.join(projectPath, 'bazari.manifest.json');
      const buildInfoPath = path.join(projectPath, 'dist', '.build-info.json');

      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
      const buildInfo = JSON.parse(await fs.readFile(buildInfoPath, 'utf-8'));

      // 2. Verificar se app existe (mesmo endpoint que CLI usa)
      const appsResponse = await fetch(`${BAZARI_API}/developer/apps`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { apps } = await appsResponse.json();
      const existingApp = apps.find((a: any) => a.appId === manifest.appId);

      let appDbId: string;

      // 3. Registrar app se nao existe
      if (!existingApp) {
        const createResponse = await fetch(`${BAZARI_API}/developer/apps`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            appId: manifest.appId,
            name: manifest.name,
            slug: manifest.slug,
            description: manifest.description,
            category: manifest.category,
            tags: manifest.tags,
            icon: manifest.icon,
            color: manifest.color,
            permissions: manifest.permissions,
            sdkVersion: manifest.sdkVersion,
            monetizationType: manifest.monetizationType,
          }),
        });
        const createResult = await createResponse.json();
        appDbId = createResult.app.id;
      } else {
        appDbId = existingApp.id;
      }

      // 4. Criar tarball do dist/ (mesmo que CLI faz com archiver)
      const distPath = path.join(projectPath, 'dist');
      const tarballPath = path.join(projectPath, `${manifest.slug}.tar.gz`);

      await createTarball(distPath, tarballPath);

      // 5. Upload para IPFS (mesmo endpoint que CLI usa)
      const formData = new FormData();
      formData.append('file', fs.createReadStream(tarballPath));
      formData.append('hash', buildInfo.hash);

      const uploadResponse = await fetch(
        `${BAZARI_API}/developer/apps/${appDbId}/bundle`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            ...formData.getHeaders(),
          },
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const { bundleUrl, cid } = await uploadResponse.json();

      // 6. Submeter para review (mesmo endpoint que CLI usa)
      const submitResponse = await fetch(
        `${BAZARI_API}/developer/apps/${appDbId}/submit`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            version: manifest.version,
            bundleUrl,
            bundleHash: buildInfo.hash,
            changelog,
          }),
        }
      );

      if (!submitResponse.ok) {
        throw new Error('Submit failed');
      }

      // Limpar tarball temporario
      await fs.unlink(tarballPath);

      res.json({ success: true, bundleUrl, cid });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

async function createTarball(srcDir: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(destPath);
    const archive = archiver('tar', { gzip: true });

    output.on('close', resolve);
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(srcDir, false);
    archive.finalize();
  });
}
```

## UI Components

### NewProjectWizard.tsx

```typescript
import { useState } from 'react';
import { createClient } from '../services/create.client';
import { useStudioStore } from '../stores/studio.store';

interface WizardStep {
  id: string;
  title: string;
}

const steps: WizardStep[] = [
  { id: 'template', title: 'Template' },
  { id: 'info', title: 'Informacoes' },
  { id: 'permissions', title: 'Permissoes' },
  { id: 'review', title: 'Revisar' },
];

interface ProjectConfig {
  template: 'react-ts' | 'vanilla';
  name: string;
  description: string;
  category: string;
  author: string;
  permissions: string[];
}

export function NewProjectWizard({ onClose }: { onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState<ProjectConfig>({
    template: 'react-ts',
    name: '',
    description: '',
    category: 'tools',
    author: '',
    permissions: ['user.profile.read', 'wallet.balance.read'],
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setCurrentProject, setConnectionStatus } = useStudioStore();

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const result = await createClient.createProject({
        name: config.name,
        description: config.description,
        category: config.category,
        author: config.author,
        template: config.template,
      });

      if (result.success) {
        setCurrentProject(result.projectId);
        onClose();
      } else {
        setError(result.error || 'Falha ao criar projeto');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Projeto</DialogTitle>
        </DialogHeader>

        {/* Progress steps */}
        <div className="flex gap-2 mb-6">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                'flex-1 h-1 rounded',
                index <= currentStep ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>

        {/* Step content */}
        {currentStep === 0 && (
          <TemplateStep
            value={config.template}
            onChange={(template) => setConfig({ ...config, template })}
          />
        )}

        {currentStep === 1 && (
          <InfoStep
            config={config}
            onChange={(updates) => setConfig({ ...config, ...updates })}
          />
        )}

        {currentStep === 2 && (
          <PermissionsStep
            permissions={config.permissions}
            onChange={(permissions) => setConfig({ ...config, permissions })}
          />
        )}

        {currentStep === 3 && (
          <ReviewStep config={config} />
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Navigation */}
        <DialogFooter>
          {currentStep > 0 && (
            <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
              Voltar
            </Button>
          )}

          {currentStep < steps.length - 1 ? (
            <Button onClick={() => setCurrentStep(currentStep + 1)}>
              Proximo
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Projeto'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Sub-components
function TemplateStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div
        className={cn(
          'p-4 border rounded-lg cursor-pointer transition-colors',
          value === 'react-ts' && 'border-primary bg-primary/5'
        )}
        onClick={() => onChange('react-ts')}
      >
        <Code2 className="w-8 h-8 mb-2 text-blue-500" />
        <h3 className="font-medium">React + TypeScript</h3>
        <p className="text-sm text-muted-foreground">
          Template recomendado com React 18, TypeScript e Vite
        </p>
      </div>

      <div
        className={cn(
          'p-4 border rounded-lg cursor-pointer transition-colors',
          value === 'vanilla' && 'border-primary bg-primary/5'
        )}
        onClick={() => onChange('vanilla')}
      >
        <FileCode className="w-8 h-8 mb-2 text-yellow-500" />
        <h3 className="font-medium">Vanilla JavaScript</h3>
        <p className="text-sm text-muted-foreground">
          Template minimo com HTML, CSS e JavaScript puro
        </p>
      </div>
    </div>
  );
}

function InfoStep({ config, onChange }: { config: ProjectConfig; onChange: (v: Partial<ProjectConfig>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Nome do App</Label>
        <Input
          value={config.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Meu App Incrivel"
        />
      </div>

      <div>
        <Label>Descricao</Label>
        <Textarea
          value={config.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="O que seu app faz?"
        />
      </div>

      <div>
        <Label>Categoria</Label>
        <Select value={config.category} onValueChange={(v) => onChange({ category: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tools">Ferramentas</SelectItem>
            <SelectItem value="finance">Financas</SelectItem>
            <SelectItem value="social">Social</SelectItem>
            <SelectItem value="commerce">Comercio</SelectItem>
            <SelectItem value="games">Jogos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Autor</Label>
        <Input
          value={config.author}
          onChange={(e) => onChange({ author: e.target.value })}
          placeholder="Seu nome ou handle"
        />
      </div>
    </div>
  );
}
```

### BuildDialog.tsx

```typescript
import { useState, useEffect } from 'react';
import { buildClient } from '../services/build.client';

interface BuildDialogProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onBuildComplete: (buildInfo: BuildInfo) => void;
}

export function BuildDialog({ projectId, isOpen, onClose, onBuildComplete }: BuildDialogProps) {
  const [status, setStatus] = useState<'idle' | 'building' | 'success' | 'error'>('idle');
  const [output, setOutput] = useState<string[]>([]);
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBuild = async () => {
    setStatus('building');
    setOutput(['Iniciando build...']);
    setError(null);

    try {
      // Adicionar output simulado enquanto aguarda
      setOutput(prev => [...prev, '📦 Verificando dependencias...']);

      const result = await buildClient.build(projectId);

      if (result.success && result.buildInfo) {
        setOutput(prev => [
          ...prev,
          '✅ Build concluido!',
          `📊 Tamanho: ${formatBytes(result.buildInfo.size)}`,
          `🔐 Hash: ${result.buildInfo.hash.substring(0, 16)}...`,
        ]);
        setBuildInfo(result.buildInfo);
        setStatus('success');
        onBuildComplete(result.buildInfo);
      } else {
        setOutput(prev => [...prev, `❌ Erro: ${result.error}`]);
        setError(result.error || 'Build falhou');
        setStatus('error');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setOutput(prev => [...prev, `❌ Erro: ${errorMsg}`]);
      setError(errorMsg);
      setStatus('error');
    }
  };

  // Iniciar build automaticamente ao abrir
  useEffect(() => {
    if (isOpen && status === 'idle') {
      handleBuild();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Build do Projeto</DialogTitle>
        </DialogHeader>

        {/* Terminal output */}
        <div className="bg-black text-green-400 font-mono text-sm p-4 rounded h-64 overflow-auto">
          {output.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
          {status === 'building' && (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Compilando...</span>
            </div>
          )}
        </div>

        {/* Build info */}
        {buildInfo && (
          <div className="p-4 bg-muted rounded">
            <h4 className="font-medium mb-2">Informacoes do Build</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span>Tamanho:</span>
              <span>{formatBytes(buildInfo.size)}</span>
              <span>Hash:</span>
              <span className="truncate">{buildInfo.hash}</span>
              <span>Data:</span>
              <span>{new Date(buildInfo.timestamp).toLocaleString()}</span>
            </div>
          </div>
        )}

        <DialogFooter>
          {status === 'error' && (
            <Button variant="outline" onClick={handleBuild}>
              Tentar Novamente
            </Button>
          )}
          {status === 'success' && (
            <Button onClick={onClose}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
```

### PublishDialog.tsx

```typescript
import { useState } from 'react';
import { publishClient } from '../services/publish.client';
import { useAuth } from '@/modules/auth/hooks/useAuth';

interface PublishDialogProps {
  projectId: string;
  buildInfo: BuildInfo;
  isOpen: boolean;
  onClose: () => void;
}

export function PublishDialog({ projectId, buildInfo, isOpen, onClose }: PublishDialogProps) {
  const { getAccessToken } = useAuth();
  const [changelog, setChangelog] = useState('');
  const [status, setStatus] = useState<'idle' | 'publishing' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ bundleUrl?: string; cid?: string } | null>(null);

  const handlePublish = async () => {
    if (!changelog.trim()) {
      setError('Changelog e obrigatorio');
      return;
    }

    setStatus('publishing');
    setProgress(10);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Usuario nao autenticado');
      }

      setProgress(30);

      const publishResult = await publishClient.publish(projectId, {
        changelog,
        token,
      });

      if (publishResult.success) {
        setProgress(100);
        setResult({
          bundleUrl: publishResult.bundleUrl,
          cid: publishResult.cid,
        });
        setStatus('success');
      } else {
        throw new Error(publishResult.error || 'Falha na publicacao');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setStatus('error');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publicar App</DialogTitle>
        </DialogHeader>

        {status === 'idle' && (
          <>
            {/* Build info summary */}
            <div className="p-4 bg-muted rounded mb-4">
              <h4 className="font-medium mb-2">Build a ser publicado</h4>
              <div className="text-sm space-y-1">
                <p>Tamanho: {formatBytes(buildInfo.size)}</p>
                <p>Hash: {buildInfo.hash.substring(0, 16)}...</p>
              </div>
            </div>

            {/* Changelog input */}
            <div>
              <Label>Changelog (obrigatorio)</Label>
              <Textarea
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                placeholder="O que mudou nesta versao?"
                rows={4}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </>
        )}

        {status === 'publishing' && (
          <div className="py-8 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
            <p>Publicando...</p>
            <Progress value={progress} className="mt-4" />
          </div>
        )}

        {status === 'success' && result && (
          <div className="py-8 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h3 className="font-medium mb-2">Publicado com Sucesso!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Seu app foi enviado para review. Um administrador ira analisar em breve.
            </p>
            {result.cid && (
              <p className="text-xs font-mono text-muted-foreground">
                CID: {result.cid}
              </p>
            )}
          </div>
        )}

        {status === 'error' && (
          <div className="py-8 text-center">
            <XCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h3 className="font-medium mb-2">Erro na Publicacao</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        <DialogFooter>
          {status === 'idle' && (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handlePublish}>
                <Rocket className="w-4 h-4 mr-2" />
                Publicar
              </Button>
            </>
          )}

          {status === 'success' && (
            <Button onClick={onClose}>
              Fechar
            </Button>
          )}

          {status === 'error' && (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={() => setStatus('idle')}>
                Tentar Novamente
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## Criterios de Aceite

1. [ ] NewProjectWizard cria projeto via API local
2. [ ] BuildDialog executa build via API local
3. [ ] PublishDialog publica via API local
4. [ ] npm install funciona localmente
5. [ ] Vite build funciona localmente
6. [ ] Upload IPFS funciona
7. [ ] Submit para review funciona
8. [ ] App publicado aparece no portal do desenvolvedor
9. [ ] **Mesmo hash que CLI geraria**
10. [ ] **Mesmos arquivos que CLI geraria**

## Proximos Passos

Apos implementar a automacao CLI, seguir para:
- [07-TEMPLATES.md](./07-TEMPLATES.md) - Sistema de templates
