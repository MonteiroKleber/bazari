# PROMPT 01 - Estrutura Base do Bazari Studio

## Contexto

Estamos implementando o Bazari Studio, uma IDE no browser para criar apps Bazari. Esta e a primeira fase que cria a estrutura base como app nativo.

O Studio se conecta ao **CLI Server local** (localhost:4444) para todas as operacoes pesadas.

## Especificacao

Leia a especificacao completa em:
- `knowledge/40-bazari-os/fase-3/README.md`
- `knowledge/40-bazari-os/fase-3/01-ARQUITETURA.md`
- `knowledge/40-bazari-os/fase-3/02-ESTRUTURA-BASE.md`

## Arquitetura

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

## Tarefa

Criar a estrutura base do Bazari Studio como app nativo do BazariOS:

### 1. Criar Estrutura de Arquivos

```
apps/web/src/apps/studio/
├── manifest.ts                 // Registro como app nativo
├── index.ts                    // Export do app
├── StudioApp.tsx              // Componente raiz
├── routes.tsx                  // Rotas internas (se necessario)
├── components/
│   └── layout/
│       ├── StudioLayout.tsx    // Layout principal com split panes
│       ├── Sidebar.tsx         // Barra lateral com tabs
│       ├── Toolbar.tsx         // Barra de ferramentas
│       ├── StatusBar.tsx       // Barra de status
│       └── EnvironmentCheck.tsx // Verificacao de ambiente
├── services/
│   ├── localServer.client.ts   // Cliente para CLI Server
│   └── environment.service.ts  // Verificacao de ambiente
├── stores/
│   └── studio.store.ts         // Estado global Zustand
├── hooks/
│   ├── useStudio.ts            // Hook principal
│   ├── useServerConnection.ts  // Hook para conexao com CLI Server
│   └── useEnvironmentCheck.ts  // Hook para verificacao de ambiente
├── types/
│   └── studio.types.ts         // Tipos basicos
└── pages/
    ├── WelcomePage.tsx         // Tela inicial
    └── ServerNotFoundPage.tsx  // Tela quando CLI Server nao encontrado
```

### 2. manifest.ts

Registrar o Studio como app nativo:

```typescript
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

### 3. Registrar no Sistema

Adicionar o Studio em `apps/web/src/platform/registry/native-apps.ts`:

```typescript
import { studioManifest } from '@/apps/studio';

export const nativeApps = [
  // ... outros apps existentes
  studioManifest,
];
```

### 4. StudioLayout.tsx

Layout com paineis redimensionaveis:

```
┌────────────────────────────────────────────────────────────────────┐
│ Toolbar                                                    [─][□][×]│
│ [Novo] [Abrir] [Salvar]  |  [▶ Dev] [📦 Build] [🚀 Publish]        │
├────────┬───────────────────────────────────────────────────────────┤
│        │                                                           │
│ Sidebar│  Main Content Area (children)                             │
│        │                                                           │
│  📁    │                                                           │
│  Files │                                                           │
│  🔍    │                                                           │
│  Search│                                                           │
│  🤖    │                                                           │
│  AI    │                                                           │
│  ⚙️    │                                                           │
│ Settings│                                                          │
├────────┴───────────────────────────────────────────────────────────┤
│ StatusBar: Ready | Projeto: nenhum                                │
└────────────────────────────────────────────────────────────────────┘
```

Usar `react-resizable-panels` para paineis redimensionaveis (ja existe no projeto ou adicionar).

### 5. studio.store.ts (Zustand)

Estado global:

```typescript
interface StudioState {
  currentProject: Project | null;
  openFiles: OpenFile[];
  activeFileId: string | null;
  layout: LayoutState;
  buildStatus: 'idle' | 'building' | 'success' | 'error';
  devServerUrl: string | null;
  // Actions
  setCurrentProject: (project: Project | null) => void;
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  // ... etc
}
```

### 6. useServerConnection.ts - Hook de Conexao

Hook para verificar e manter conexao com CLI Server:

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
    setError(null);

    try {
      const response = await fetch('http://localhost:4444/status', {
        method: 'GET',
        signal: AbortSignal.timeout(3000), // 3s timeout
      });

      if (!response.ok) throw new Error('Server responded with error');

      const data = await response.json();
      setStatus({
        connected: true,
        version: data.version,
        platform: data.platform,
        nodeVersion: data.nodeVersion,
      });
    } catch (err) {
      setStatus({ connected: false });
      setError('CLI Server nao encontrado. Execute: bazari studio --serve');
    } finally {
      setLoading(false);
    }
  }, []);

  // Check on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Retry every 5 seconds if not connected
  useEffect(() => {
    if (!status.connected && !loading) {
      const interval = setInterval(checkConnection, 5000);
      return () => clearInterval(interval);
    }
  }, [status.connected, loading, checkConnection]);

  return { status, loading, error, retry: checkConnection };
}
```

### 7. useEnvironmentCheck.ts - Verificacao de Ambiente

Hook para verificar ferramentas instaladas:

```typescript
import { useState, useEffect, useCallback } from 'react';

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

interface EnvironmentCheckResult {
  status: EnvironmentStatus | null;
  loading: boolean;
  error: string | null;
  isReady: boolean;          // Ambiente minimo OK (node + npm)
  isFullyReady: boolean;     // Ambiente completo OK (inclui rust + cargo-contract)
  missingTools: string[];    // Lista de ferramentas faltando
}

export function useEnvironmentCheck(serverConnected: boolean): EnvironmentCheckResult {
  const [status, setStatus] = useState<EnvironmentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkEnvironment = useCallback(async () => {
    if (!serverConnected) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:4444/status/tools');
      if (!response.ok) throw new Error('Failed to check tools');

      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError('Erro ao verificar ambiente');
    } finally {
      setLoading(false);
    }
  }, [serverConnected]);

  useEffect(() => {
    if (serverConnected) {
      checkEnvironment();
    }
  }, [serverConnected, checkEnvironment]);

  // Calcular status derivados
  const isReady = status?.node.installed && status?.npm.installed;
  const isFullyReady = isReady && status?.rust.installed && status?.cargoContract.installed;

  const missingTools: string[] = [];
  if (status) {
    if (!status.node.installed) missingTools.push('Node.js');
    if (!status.npm.installed) missingTools.push('npm');
    if (!status.rust.installed) missingTools.push('Rust');
    if (!status.cargoContract.installed) missingTools.push('cargo-contract');
  }

  return {
    status,
    loading,
    error,
    isReady: !!isReady,
    isFullyReady: !!isFullyReady,
    missingTools,
  };
}
```

### 8. EnvironmentCheck.tsx - Componente de Verificacao

Componente que mostra status do ambiente e instrucoes:

```typescript
import { useServerConnection } from '../hooks/useServerConnection';
import { useEnvironmentCheck } from '../hooks/useEnvironmentCheck';
import { CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export function EnvironmentCheck({ children }: Props) {
  const { status: serverStatus, loading: serverLoading, retry } = useServerConnection();
  const { status: envStatus, loading: envLoading, isReady, missingTools } = useEnvironmentCheck(serverStatus.connected);

  // 1. Verificando conexao com servidor
  if (serverLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <p>Conectando ao CLI Server...</p>
      </div>
    );
  }

  // 2. Servidor nao encontrado
  if (!serverStatus.connected) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 max-w-md mx-auto text-center">
        <XCircle className="w-16 h-16 text-red-500" />
        <h2 className="text-xl font-semibold">CLI Server nao encontrado</h2>
        <p className="text-gray-600">
          O Bazari Studio precisa do CLI Server rodando localmente para funcionar.
        </p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm w-full">
          $ bazari studio --serve
        </div>
        <p className="text-sm text-gray-500">
          Nao tem o CLI instalado? Execute:
        </p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm w-full">
          $ npm install -g @bazari.libervia.xyz/cli
        </div>
        <button
          onClick={retry}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </button>
      </div>
    );
  }

  // 3. Verificando ambiente
  if (envLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <p>Verificando ambiente de desenvolvimento...</p>
      </div>
    );
  }

  // 4. Ferramentas faltando (mas pode continuar para apps se node/npm OK)
  if (envStatus && missingTools.length > 0 && !isReady) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 max-w-lg mx-auto text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500" />
        <h2 className="text-xl font-semibold">Ferramentas necessarias</h2>
        <p className="text-gray-600">
          Algumas ferramentas nao estao instaladas no seu sistema:
        </p>

        <div className="w-full space-y-2">
          {Object.entries(envStatus).map(([tool, status]) => (
            <div
              key={tool}
              className={`flex items-center justify-between p-3 rounded-lg ${
                status.installed ? 'bg-green-50' : 'bg-red-50'
              }`}
            >
              <span className="font-medium">{tool}</span>
              <div className="flex items-center gap-2">
                {status.installed ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-gray-600">{status.version}</span>
                  </>
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-left w-full space-y-4">
          <p className="font-medium">Instrucoes de instalacao:</p>

          {!envStatus.node.installed && (
            <div>
              <p className="text-sm text-gray-600">Node.js:</p>
              <code className="block bg-gray-900 text-gray-100 p-2 rounded text-sm">
                https://nodejs.org/
              </code>
            </div>
          )}

          {!envStatus.rust.installed && (
            <div>
              <p className="text-sm text-gray-600">Rust (para smart contracts):</p>
              <code className="block bg-gray-900 text-gray-100 p-2 rounded text-sm">
                curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
              </code>
            </div>
          )}

          {!envStatus.cargoContract.installed && envStatus.rust.installed && (
            <div>
              <p className="text-sm text-gray-600">cargo-contract (para smart contracts):</p>
              <code className="block bg-gray-900 text-gray-100 p-2 rounded text-sm">
                cargo install cargo-contract --version 4.0.0
              </code>
            </div>
          )}
        </div>

        <button
          onClick={retry}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
        >
          <RefreshCw className="w-4 h-4" />
          Verificar novamente
        </button>
      </div>
    );
  }

  // 5. Ambiente OK - renderizar Studio
  return <>{children}</>;
}
```

### 9. ServerNotFoundPage.tsx

Pagina dedicada quando servidor nao encontrado (alternativa ao componente inline):

```typescript
import { RefreshCw, Terminal, Download } from 'lucide-react';

interface Props {
  onRetry: () => void;
}

export function ServerNotFoundPage({ onRetry }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Terminal className="w-8 h-8 text-violet-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Bazari Studio</h1>
          <p className="text-gray-600 mt-2">
            Conecte-se ao CLI Server para comecar a desenvolver
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-sm text-gray-700 mb-2">
              1. Instale o CLI (se necessario)
            </h3>
            <code className="block bg-gray-900 text-green-400 p-3 rounded font-mono text-sm">
              npm install -g @bazari.libervia.xyz/cli
            </code>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-sm text-gray-700 mb-2">
              2. Inicie o servidor local
            </h3>
            <code className="block bg-gray-900 text-green-400 p-3 rounded font-mono text-sm">
              bazari studio --serve
            </code>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-sm text-gray-700 mb-2">
              3. Volte aqui e clique em conectar
            </h3>
            <button
              onClick={onRetry}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Conectar ao CLI Server
            </button>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <a
            href="https://docs.bazari.xyz/studio/setup"
            target="_blank"
            className="text-sm text-violet-600 hover:underline flex items-center justify-center gap-1"
          >
            <Download className="w-4 h-4" />
            Ver documentacao completa
          </a>
        </div>
      </div>
    </div>
  );
}
```

### 10. StudioApp.tsx - Componente Raiz

O componente raiz usa EnvironmentCheck como wrapper:

```typescript
import { EnvironmentCheck } from './components/layout/EnvironmentCheck';
import { StudioLayout } from './components/layout/StudioLayout';
import { WelcomePage } from './pages/WelcomePage';
import { useStudioStore } from './stores/studio.store';

export function StudioApp() {
  const currentProject = useStudioStore(state => state.currentProject);

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

### 11. WelcomePage.tsx

Tela inicial com:
- Botao "Novo Projeto"
- Botao "Abrir Projeto"
- Lista de projetos recentes (placeholder por enquanto)
- Links para documentacao

### 12. Dependencias

Se necessario, adicionar:
```bash
pnpm add react-resizable-panels
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
9. [ ] App aparece na lista de apps nativos do BazariOS
10. [ ] Rota `/app/studio` renderiza o Studio
11. [ ] Layout com toolbar, sidebar e area principal funciona
12. [ ] Sidebar pode ser colapsada/expandida
13. [ ] Tabs da sidebar (Files, Search, AI, Settings) mudam conteudo
14. [ ] Store Zustand inicializa corretamente
15. [ ] Tela de boas-vindas aparece quando nao ha projeto aberto
16. [ ] Build do projeto nao quebra

## Nao Fazer Nesta Fase

- Monaco Editor (fase 3)
- Preview (fase 4)
- Build/Publish real (fase 5)
- IA (fase 7)

## Arquivos de Referencia

Veja como outros apps nativos estao estruturados:
- `apps/web/src/apps/marketplace/`
- `apps/web/src/apps/stores/`
- `apps/web/src/platform/registry/native-apps.ts`
