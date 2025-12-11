# 02 - Estrutura Base do Bazari Studio

## Objetivo

Criar a estrutura base do Bazari Studio como um app nativo do BazariOS, incluindo:
- Registro no sistema de apps nativos
- Layout principal com areas redimensionaveis
- Rotas internas do Studio
- Estado global inicial

## Arquitetura - Verificacao de Ambiente

Ao abrir o Studio, o sistema verifica:
1. **Conexao com CLI Server** (localhost:4444)
2. **Ferramentas instaladas** (node, npm, rust, cargo-contract)

```
┌─────────────────────────────────────────────────────────────┐
│                    BAZARI STUDIO (Browser)                  │
│                                                             │
│  1. Ao abrir, verifica conexao com CLI Server               │
│  2. Se conectou, verifica ambiente (node, npm, rust, etc)   │
│  3. Mostra status e instrucoes se algo estiver faltando     │
│                                                             │
└─────────────────────────────┬───────────────────────────────┘
                              │ GET /status
                              │ GET /status/tools
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              CLI SERVER (localhost:4444)                     │
│                                                             │
│  Retorna: { node, npm, rust, cargoContract }                │
└─────────────────────────────────────────────────────────────┘
```

**Comportamento:**
- Se CLI Server nao encontrado: mostra tela de erro com instrucoes
- Se node/npm faltando: bloqueia uso, mostra instrucoes de instalacao
- Se rust/cargo-contract faltando: permite criar APPS, bloqueia smart contracts

## Estrutura de Arquivos

```
apps/web/src/apps/studio/
├── manifest.ts                 // Registro como app nativo
├── index.ts                    // Export do app
├── StudioApp.tsx              // Componente raiz
├── routes.tsx                  // Rotas internas
├── components/
│   └── layout/
│       ├── StudioLayout.tsx    // Layout principal
│       ├── Sidebar.tsx         // Barra lateral
│       ├── Toolbar.tsx         // Barra de ferramentas
│       ├── StatusBar.tsx       // Barra de status
│       ├── SplitPane.tsx       // Paineis redimensionaveis
│       └── EnvironmentCheck.tsx // Verificacao de ambiente
├── services/
│   ├── localServer.client.ts   // Cliente para CLI Server
│   └── environment.service.ts  // Verificacao de ambiente
├── stores/
│   └── studio.store.ts         // Estado global
├── hooks/
│   ├── useStudio.ts            // Hook principal
│   ├── useServerConnection.ts  // Hook para conexao com CLI Server
│   └── useEnvironmentCheck.ts  // Hook para verificacao de ambiente
├── pages/
│   └── ServerNotFoundPage.tsx  // Tela quando CLI Server nao encontrado
└── types/
    └── studio.types.ts         // Tipos basicos
```

## Especificacao dos Componentes

### 1. manifest.ts

```typescript
import { Code2 } from 'lucide-react';
import type { NativeAppManifest } from '@/platform/types';

export const studioManifest: NativeAppManifest = {
  id: 'studio',
  name: 'Bazari Studio',
  description: 'IDE para criar apps e smart contracts para Bazari',
  icon: 'Code2',
  color: 'from-violet-500 to-purple-600',
  route: '/app/studio',
  component: () => import('./StudioApp'),
  permissions: [
    'user.profile.read',
    'wallet.balance.read',
    'storage.app',
    'notifications',
  ],
  category: 'tools',
  isNative: true,
  tags: ['development', 'ide', 'coding'],
};
```

### 2. StudioApp.tsx

```typescript
import { EnvironmentCheck } from './components/layout/EnvironmentCheck';
import { StudioLayout } from './components/layout/StudioLayout';
import { WelcomePage } from './pages/WelcomePage';
import { useStudioStore } from './stores/studio.store';

export default function StudioApp() {
  const currentProject = useStudioStore(state => state.currentProject);

  // EnvironmentCheck verifica CLI Server e ferramentas ANTES de renderizar
  return (
    <EnvironmentCheck>
      <StudioLayout>
        {currentProject ? (
          // Renderizar editor quando tiver projeto
          <div>Editor aqui</div>
        ) : (
          <WelcomePage />
        )}
      </StudioLayout>
    </EnvironmentCheck>
  );
}
```

### 2.1 useServerConnection.ts

Hook para verificar conexao com CLI Server:

```typescript
import { useState, useEffect, useCallback } from 'react';

interface ServerStatus {
  connected: boolean;
  version?: string;
  platform?: string;
  nodeVersion?: string;
}

export function useServerConnection() {
  const [status, setStatus] = useState<ServerStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:4444/status', {
        signal: AbortSignal.timeout(3000),
      });
      const data = await response.json();
      setStatus({ connected: true, ...data });
    } catch (err) {
      setStatus({ connected: false });
      setError('CLI Server nao encontrado');
    } finally {
      setLoading(false);
    }
  }, []);

  // Check on mount + retry every 5s if not connected
  useEffect(() => {
    checkConnection();
    if (!status.connected && !loading) {
      const interval = setInterval(checkConnection, 5000);
      return () => clearInterval(interval);
    }
  }, [status.connected, loading]);

  return { status, loading, error, retry: checkConnection };
}
```

### 2.2 useEnvironmentCheck.ts

Hook para verificar ferramentas instaladas:

```typescript
interface ToolStatus {
  installed: boolean;
  version?: string;
}

interface EnvironmentStatus {
  node: ToolStatus;
  npm: ToolStatus;
  rust: ToolStatus;
  cargoContract: ToolStatus;
}

export function useEnvironmentCheck(serverConnected: boolean) {
  const [status, setStatus] = useState<EnvironmentStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (serverConnected) {
      setLoading(true);
      fetch('http://localhost:4444/status/tools')
        .then(res => res.json())
        .then(data => setStatus(data))
        .finally(() => setLoading(false));
    }
  }, [serverConnected]);

  // Ambiente minimo OK = node + npm
  const isReady = status?.node.installed && status?.npm.installed;
  // Ambiente completo = inclui rust + cargo-contract
  const isFullyReady = isReady && status?.rust.installed && status?.cargoContract.installed;

  return { status, loading, isReady, isFullyReady };
}
```

### 2.3 EnvironmentCheck.tsx

Componente wrapper que verifica ambiente antes de renderizar Studio:

```typescript
export function EnvironmentCheck({ children }: { children: React.ReactNode }) {
  const { status: server, loading: serverLoading, retry } = useServerConnection();
  const { status: env, loading: envLoading, isReady } = useEnvironmentCheck(server.connected);

  // 1. Verificando conexao
  if (serverLoading) return <LoadingScreen message="Conectando ao CLI Server..." />;

  // 2. Servidor nao encontrado
  if (!server.connected) return <ServerNotFoundPage onRetry={retry} />;

  // 3. Verificando ferramentas
  if (envLoading) return <LoadingScreen message="Verificando ambiente..." />;

  // 4. Node/npm faltando (bloqueia)
  if (!isReady) return <MissingToolsPage tools={env} onRetry={retry} />;

  // 5. Ambiente OK
  return <>{children}</>;
}
```

### 3. StudioLayout.tsx

```
┌────────────────────────────────────────────────────────────────────┐
│ Toolbar                                                    [─][□][×]│
│ [Novo] [Abrir] [Salvar]  |  [▶ Dev] [📦 Build] [🚀 Publish]        │
├────────┬───────────────────────────────────────────────────────────┤
│        │                                                           │
│ Sidebar│  Main Content Area                                        │
│        │  (Editor / Preview / Welcome)                             │
│  📁    │                                                           │
│  Files │                                                           │
│        │                                                           │
│  🔍    │                                                           │
│  Search│                                                           │
│        │                                                           │
│  🤖    │                                                           │
│  AI    │                                                           │
│        │                                                           │
│  ⚙️    │                                                           │
│ Settings│                                                          │
│        │                                                           │
├────────┴───────────────────────────────────────────────────────────┤
│ StatusBar: Ready | Ln 1, Col 1 | TypeScript | UTF-8               │
└────────────────────────────────────────────────────────────────────┘
```

**Props:**
```typescript
interface StudioLayoutProps {
  children: React.ReactNode;
}
```

**Estado:**
```typescript
interface LayoutState {
  sidebarWidth: number;        // Largura da sidebar (px)
  sidebarCollapsed: boolean;   // Sidebar minimizada
  terminalHeight: number;      // Altura do terminal (px)
  terminalVisible: boolean;    // Terminal visivel
  previewWidth: number;        // Largura do preview (%)
  previewVisible: boolean;     // Preview visivel
}
```

### 4. Sidebar.tsx

```typescript
interface SidebarProps {
  width: number;
  collapsed: boolean;
  onToggle: () => void;
}

// Tabs da sidebar
type SidebarTab = 'files' | 'search' | 'ai' | 'settings';
```

**Conteudo das tabs:**

| Tab | Icone | Descricao |
|-----|-------|-----------|
| files | FolderTree | Arvore de arquivos do projeto |
| search | Search | Busca em arquivos |
| ai | Bot | Chat com IA |
| settings | Settings | Configuracoes do projeto |

### 5. Toolbar.tsx

```typescript
interface ToolbarProps {
  project: Project | null;
  buildStatus: BuildStatus;
  onNewProject: () => void;
  onOpenProject: () => void;
  onSave: () => void;
  onDev: () => void;
  onBuild: () => void;
  onPublish: () => void;
}

type BuildStatus = 'idle' | 'building' | 'success' | 'error';
```

**Botoes:**

| Botao | Acao | Habilitado |
|-------|------|------------|
| Novo | Criar projeto | Sempre |
| Abrir | Listar projetos | Sempre |
| Salvar | Salvar arquivo atual | Quando arquivo aberto |
| Dev | Iniciar dev server | Quando projeto carregado |
| Build | Executar build | Quando projeto carregado |
| Publish | Publicar app | Quando build sucesso |

### 6. StatusBar.tsx

```typescript
interface StatusBarProps {
  status: string;              // "Ready", "Building...", etc
  cursorPosition?: {
    line: number;
    column: number;
  };
  language?: string;           // "TypeScript", "JavaScript", etc
  encoding?: string;           // "UTF-8"
  projectName?: string;
}
```

### 7. studio.store.ts (Zustand)

```typescript
interface StudioState {
  // Projeto atual
  currentProject: Project | null;

  // Arquivos abertos
  openFiles: OpenFile[];
  activeFileId: string | null;

  // Layout
  layout: LayoutState;

  // Status
  buildStatus: BuildStatus;
  devServerUrl: string | null;

  // Actions
  setCurrentProject: (project: Project | null) => void;
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string) => void;
  updateLayout: (updates: Partial<LayoutState>) => void;
  setBuildStatus: (status: BuildStatus) => void;
  setDevServerUrl: (url: string | null) => void;
}

interface OpenFile {
  path: string;
  content: string;
  isDirty: boolean;
  language: string;
}
```

## Rotas Internas

```typescript
// routes.tsx

const studioRoutes = [
  {
    path: '/app/studio',
    element: <WelcomePage />,      // Tela inicial
  },
  {
    path: '/app/studio/project/:id',
    element: <ProjectPage />,       // Projeto aberto
  },
  {
    path: '/app/studio/new',
    element: <NewProjectPage />,    // Wizard novo projeto
  },
  {
    path: '/app/studio/templates',
    element: <TemplatesPage />,     // Galeria de templates
  },
];
```

## Tela Inicial (WelcomePage)

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│         🚀 Bem-vindo ao Bazari Studio                     │
│                                                            │
│    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│    │  + Novo      │  │  📂 Abrir    │  │  📋 Templates│   │
│    │   Projeto    │  │   Projeto    │  │              │   │
│    └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                            │
│    Projetos Recentes:                                     │
│    ┌─────────────────────────────────────────────────┐    │
│    │ 📱 meu-app          Editado há 2 horas          │    │
│    │ 📱 loja-virtual     Editado há 3 dias           │    │
│    │ 📜 token-contract   Editado há 1 semana         │    │
│    └─────────────────────────────────────────────────┘    │
│                                                            │
│    Documentacao:                                          │
│    • Guia de Inicio Rapido                                │
│    • Referencia do SDK                                    │
│    • Exemplos                                             │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Integracao com Sistema de Apps

O Studio deve ser registrado em:

```typescript
// apps/web/src/apps/studio/index.ts
export { studioManifest } from './manifest';
export { default as StudioApp } from './StudioApp';

// apps/web/src/platform/registry/native-apps.ts
import { studioManifest } from '@/apps/studio';

export const nativeApps = [
  // ... outros apps
  studioManifest,
];
```

## Dependencias

```json
{
  "dependencies": {
    "react-resizable-panels": "^2.0.0",  // Paineis redimensionaveis
    "zustand": "^4.5.0",                  // Ja existe no projeto
    "lucide-react": "^0.400.0"            // Ja existe
  }
}
```

## Criterios de Aceite

### Verificacao de Ambiente (OBRIGATORIO)
1. [ ] Ao abrir Studio, verifica conexao com CLI Server (localhost:4444)
2. [ ] Se CLI Server nao encontrado, mostra tela com instrucoes de instalacao
3. [ ] Tela de erro tem botao "Tentar novamente" que funciona
4. [ ] Retry automatico a cada 5s enquanto nao conectado
5. [ ] Apos conectar, verifica ferramentas: node, npm, rust, cargo-contract
6. [ ] Se node/npm faltando, bloqueia uso e mostra instrucoes
7. [ ] Se rust/cargo-contract faltando, mostra aviso mas permite criar apps (nao contracts)
8. [ ] Status das ferramentas visivel na UI (check verde / X vermelho)

### Interface Base
9. [ ] App aparece na lista de apps nativos
10. [ ] Rota `/app/studio` funciona
11. [ ] Layout renderiza com sidebar, toolbar, statusbar
12. [ ] Sidebar pode ser colapsada/expandida
13. [ ] Store Zustand funciona corretamente
14. [ ] Tela de boas-vindas mostra opcoes
15. [ ] Navegacao entre rotas internas funciona

## Proximos Passos

Apos implementar a estrutura base, seguir para:
- [03-CLI-SERVER.md](./03-CLI-SERVER.md) - Implementacao do CLI Server local
