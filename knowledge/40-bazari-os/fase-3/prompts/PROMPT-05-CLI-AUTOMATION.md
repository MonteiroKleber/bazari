# PROMPT 05 - Automacao do CLI (Create/Build/Publish) via API Local

## Contexto

O Bazari Studio precisa automatizar os comandos do CLI existente para criar, buildar e publicar apps. Todas as operacoes sao executadas **LOCALMENTE** via CLI Server.

**CRITICO**: A automacao DEVE seguir EXATAMENTE o mesmo fluxo que o CLI faz. Nao inventar nada novo.

## Pre-requisito

PROMPT-01, PROMPT-02, PROMPT-03 e PROMPT-04 devem estar implementados.

## Especificacao

Leia a especificacao completa em:
- `knowledge/40-bazari-os/fase-3/06-CLI-AUTOMATION.md`

**IMPORTANTE**: Leia tambem os comandos originais do CLI para entender o fluxo exato:
- `packages/bazari-cli/src/commands/create.ts`
- `packages/bazari-cli/src/commands/build.ts`
- `packages/bazari-cli/src/commands/publish.ts`

## Arquitetura

```
┌──────────────────────────────────────────────────────────────┐
│                    STUDIO UI (Browser)                        │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  CreateService   BuildService   PublishService           ││
│  │       │               │               │                   ││
│  │       │ POST          │ POST          │ POST              ││
│  │       │ /projects/new │ /build/build  │ /publish/submit   ││
│  └───────┼───────────────┼───────────────┼──────────────────┘│
└──────────┼───────────────┼───────────────┼───────────────────┘
           │               │               │
           ▼               ▼               ▼
┌──────────────────────────────────────────────────────────────┐
│              CLI SERVER (localhost:4444)                      │
│                                                               │
│  POST /projects/new   - Copia template, gera manifest        │
│  POST /build/install  - npm install                          │
│  POST /build/build    - npm run build                        │
│  POST /publish/submit - Upload IPFS + API                    │
│                                                               │
└──────────────────────────────────────────────────────────────┘
           │               │               │
           ▼               ▼               ▼
┌──────────────────────────────────────────────────────────────┐
│              SISTEMA LOCAL DO DESENVOLVEDOR                   │
│  ~/bazari-projects/                                          │
│  └── my-app/                                                 │
│      ├── package.json                                        │
│      ├── bazari.manifest.json                                │
│      ├── src/                                                │
│      └── dist/ (gerado pelo build)                          │
└──────────────────────────────────────────────────────────────┘
```

## Tarefa

### 1. Criar Arquivos

```
apps/web/src/apps/studio/
├── services/
│   ├── create.service.ts      // Automacao do create
│   ├── build.service.ts       // Automacao do build
│   └── publish.service.ts     // Automacao do publish
├── components/
│   ├── wizards/
│   │   └── NewProjectWizard.tsx   // Wizard para criar projeto
│   └── dialogs/
│       ├── BuildDialog.tsx        // Dialog de build
│       └── PublishDialog.tsx      // Dialog de publish
└── hooks/
    └── useBuildPublish.ts         // Hook para build/publish
```

### 2. create.service.ts

**SEGUE EXATAMENTE o que `packages/bazari-cli/src/commands/create.ts` faz, via API local:**

```typescript
const LOCAL_SERVER = 'http://localhost:4444';

interface CreateProjectConfig {
  name: string;
  description: string;
  category: string;
  author: string;
  template: 'react-ts' | 'vanilla';
  targetDir?: string; // Diretorio onde criar o projeto
}

class CreateService {
  async createProject(config: CreateProjectConfig): Promise<{ projectPath: string }> {
    // Chamar CLI Server para criar o projeto localmente
    const response = await fetch(`${LOCAL_SERVER}/projects/new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: config.name,
        description: config.description,
        category: config.category,
        author: config.author,
        template: config.template,
        targetDir: config.targetDir || '~/bazari-projects',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create project');
    }

    const { projectPath } = await response.json();
    return { projectPath };
  }
}

// O CLI Server faz o trabalho real:
// 1. Cria diretorio em ~/bazari-projects/my-app
// 2. Copia template de packages/bazari-cli/templates/react-ts/
// 3. Substitui placeholders ({{name}}, {{slug}}, etc)
// 4. Gera bazari.manifest.json
// 5. Executa npm install
```

### 3. build.service.ts

**SEGUE EXATAMENTE o que `packages/bazari-cli/src/commands/build.ts` faz, via API local:**

```typescript
const LOCAL_SERVER = 'http://localhost:4444';

interface BuildResult {
  success: boolean;
  output: string;
  buildInfo?: {
    hash: string;
    size: number;
    timestamp: string;
  };
}

class BuildService {
  /**
   * Build simples - retorna quando terminar
   */
  async build(projectPath: string): Promise<BuildResult> {
    const response = await fetch(`${LOCAL_SERVER}/build/build`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectPath }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Build failed');
    }

    return response.json();
  }

  /**
   * Build com streaming de output (WebSocket)
   */
  buildWithStream(projectPath: string): {
    output$: Observable<string>;
    result$: Promise<BuildResult>;
  } {
    const ws = new WebSocket(`ws://localhost:4444/build/stream`);
    const outputSubject = new Subject<string>();

    ws.onopen = () => {
      ws.send(JSON.stringify({ projectPath }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'output') {
        outputSubject.next(data.line);
      }
    };

    const result$ = new Promise<BuildResult>((resolve, reject) => {
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'output') {
          outputSubject.next(data.line);
        } else if (data.type === 'complete') {
          outputSubject.complete();
          resolve(data.result);
        } else if (data.type === 'error') {
          outputSubject.error(data.error);
          reject(new Error(data.error));
        }
      };
    });

    return { output$: outputSubject.asObservable(), result$ };
  }
}

// O CLI Server executa localmente:
// 1. npm install (se node_modules nao existe)
// 2. npx tsc --noEmit (type check)
// 3. npx vite build --outDir dist
// 4. Copia manifest para dist/
// 5. Calcula hash do dist/
// 6. Gera .build-info.json
```

### 4. publish.service.ts

**SEGUE EXATAMENTE o que `packages/bazari-cli/src/commands/publish.ts` faz, via API local:**

```typescript
const LOCAL_SERVER = 'http://localhost:4444';

interface PublishResult {
  success: boolean;
  bundleUrl: string;
  cid: string;
  appId: string;
}

class PublishService {
  /**
   * Publish via CLI Server
   * O servidor local cria tarball, faz upload IPFS, e submete para API
   */
  async publish(projectPath: string, changelog: string, authToken: string): Promise<PublishResult> {
    const response = await fetch(`${LOCAL_SERVER}/publish/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectPath,
        changelog,
        authToken, // Token do usuario logado no BazariOS
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Publish failed');
    }

    return response.json();
  }

  /**
   * Publish com streaming de progresso
   */
  publishWithProgress(
    projectPath: string,
    changelog: string,
    authToken: string,
    onProgress: (step: string, progress: number) => void
  ): Promise<PublishResult> {
    const ws = new WebSocket(`ws://localhost:4444/publish/stream`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ projectPath, changelog, authToken }));
    };

    return new Promise((resolve, reject) => {
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'progress') {
          onProgress(data.step, data.progress);
        } else if (data.type === 'complete') {
          resolve(data.result);
        } else if (data.type === 'error') {
          reject(new Error(data.error));
        }
      };
    });
  }
}

// O CLI Server executa localmente:
// 1. Le bazari.manifest.json e .build-info.json
// 2. Cria tarball do dist/ com archiver
// 3. Faz upload para IPFS (retorna CID)
// 4. Verifica/registra app na API Bazari
// 5. Submete versao para review
```

### 5. NewProjectWizard.tsx

Wizard passo-a-passo (mesmas perguntas que CLI faz):

```typescript
// Step 1: Template
// - React + TypeScript (recomendado)
// - Vanilla JavaScript

// Step 2: Informacoes
// - Nome do app
// - Descricao
// - Categoria (Finance, Social, Commerce, Tools, etc)
// - Autor

// Step 3: Permissoes (opcional)
// - user.profile.read
// - wallet.balance.read
// - etc

// Step 4: Revisar e Criar
```

### 6. BuildDialog.tsx

Dialog que mostra progresso do build:

```typescript
// - Output do terminal em tempo real
// - Barra de progresso
// - Status: Building... / Success / Error
// - Botao "Publicar" quando build sucesso
```

### 7. PublishDialog.tsx

Dialog para publicar:

```typescript
// - Input de changelog
// - Barra de progresso
// - Status de cada etapa
// - Link para portal quando publicado
```

### 8. Integrar na UI

No Toolbar:
- Botao "Novo" abre NewProjectWizard
- Botao "Build" abre BuildDialog
- Botao "Publish" abre PublishDialog (habilitado so apos build sucesso)

## Criterios de Aceite

1. [ ] CreateService cria projeto localmente via CLI Server
2. [ ] BuildService executa build localmente via CLI Server
3. [ ] PublishService usa CLI Server para upload e submit
4. [ ] Hash calculado e identico ao que CLI geraria
5. [ ] npm install executa localmente (rapido)
6. [ ] Vite build executa localmente
7. [ ] Upload IPFS funciona
8. [ ] Submit para review funciona
9. [ ] App publicado aparece no portal do desenvolvedor
10. [ ] Build do projeto nao quebra

## Nao Fazer Nesta Fase

- Templates extras (fase 6)
- IA (fase 7)
- Smart contracts (fase 8)

## Verificacao

Testar fluxo completo:
1. Iniciar CLI Server: `bazari studio --serve`
2. Abrir Studio no browser
3. Criar projeto via wizard
4. npm install executa localmente
5. Editar codigo no editor
6. Ver preview funcionando (localhost:3333)
7. Rodar build
8. Publicar
9. Ver app no portal do desenvolvedor
