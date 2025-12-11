# PROMPT 04 - Preview em Tempo Real (Vite Local)

## Contexto

O Bazari Studio precisa mostrar o app em desenvolvimento em tempo real. O preview aponta para o Vite dev server local (localhost:3333).

## Pre-requisito

PROMPT-01, PROMPT-02 e PROMPT-03 devem estar implementados.

## Especificacao

Leia a especificacao completa em:
- `knowledge/40-bazari-os/fase-3/05-PREVIEW.md`

## Arquitetura

```
┌──────────────────────────────────────────────────────────────┐
│                    STUDIO UI (Browser)                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                   Preview Panel                         │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ ▶ Desktop ▼ │ ↻ Reload │ ↗ Open External         │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │                                                   │  │  │
│  │  │  <iframe src="http://localhost:3333" />          │  │  │
│  │  │                                                   │  │  │
│  │  │         App renderizado aqui                      │  │  │
│  │  │                                                   │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              │
                              │ iframe src
                              ▼
┌──────────────────────────────────────────────────────────────┐
│               VITE DEV SERVER (localhost:3333)                │
│                                                               │
│  - Iniciado via CLI Server                                   │
│  - HMR (Hot Module Replacement)                              │
│  - Recarrega automaticamente quando arquivo muda             │
└──────────────────────────────────────────────────────────────┘
```

## Tarefa

### 1. Criar Arquivos

```
apps/web/src/apps/studio/
├── components/
│   └── preview/
│       ├── PreviewPanel.tsx       // Painel principal
│       ├── PreviewToolbar.tsx     // Controles
│       ├── DeviceFrame.tsx        // Simulacao de dispositivo
│       └── PreviewError.tsx       // Tela de erro
└── hooks/
    └── useDevServer.ts            // Hook para dev server
```

### 2. useDevServer.ts - Hook para Dev Server Local

```typescript
import { useState, useCallback, useRef, useEffect } from 'react';
import { localServer } from '../services/localServer.client';

interface DevServerState {
  url: string | null;
  isRunning: boolean;
  isStarting: boolean;
  pid: number | null;
  error: Error | null;
}

interface UseDevServerOptions {
  projectPath: string;
  port?: number;
  autoStart?: boolean;
}

export function useDevServer(options: UseDevServerOptions) {
  const { projectPath, port = 3333, autoStart = false } = options;

  const [state, setState] = useState<DevServerState>({
    url: null,
    isRunning: false,
    isStarting: false,
    pid: null,
    error: null,
  });

  const startServer = useCallback(async () => {
    if (state.isRunning || state.isStarting) return;

    setState((s) => ({ ...s, isStarting: true, error: null }));

    try {
      // 1. Primeiro, rodar npm install se necessario
      // (opcional, pode ser feito separadamente)

      // 2. Iniciar dev server via CLI Server
      const result = await localServer.startDevServer(projectPath, port);

      setState({
        url: result.url, // http://localhost:3333
        isRunning: true,
        isStarting: false,
        pid: result.pid,
        error: null,
      });
    } catch (error) {
      setState((s) => ({
        ...s,
        isStarting: false,
        error: error as Error,
      }));
    }
  }, [projectPath, port, state.isRunning, state.isStarting]);

  const stopServer = useCallback(async () => {
    if (!state.isRunning || !state.pid) return;

    try {
      await fetch('http://localhost:4444/build/dev/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid: state.pid }),
      });

      setState({
        url: null,
        isRunning: false,
        isStarting: false,
        pid: null,
        error: null,
      });
    } catch (error) {
      console.error('Failed to stop server:', error);
    }
  }, [state.isRunning, state.pid]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.pid) {
        // Best effort cleanup
        fetch('http://localhost:4444/build/dev/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pid: state.pid }),
        }).catch(() => {});
      }
    };
  }, [state.pid]);

  // Auto-start if configured
  useEffect(() => {
    if (autoStart && projectPath && !state.isRunning && !state.isStarting) {
      startServer();
    }
  }, [autoStart, projectPath, state.isRunning, state.isStarting, startServer]);

  return {
    ...state,
    startServer,
    stopServer,
  };
}
```

### 3. PreviewPanel.tsx

```typescript
import { useState, useRef, useCallback } from 'react';
import { useDevServer } from '../hooks/useDevServer';
import { PreviewToolbar } from './PreviewToolbar';
import { DeviceFrame } from './DeviceFrame';
import { PreviewError } from './PreviewError';
import { Loader2, Play, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PreviewPanelProps {
  projectPath: string;
  onServerStart?: () => void;
  onServerStop?: () => void;
}

type DeviceType = 'desktop' | 'tablet' | 'mobile';

export function PreviewPanel({ projectPath, onServerStart, onServerStop }: PreviewPanelProps) {
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const {
    url,
    isRunning,
    isStarting,
    error,
    startServer,
    stopServer,
  } = useDevServer({ projectPath });

  const handleReload = useCallback(() => {
    // Forcar reload do iframe incrementando key
    setIframeKey((k) => k + 1);
  }, []);

  const handleOpenExternal = useCallback(() => {
    if (url) {
      window.open(url, '_blank');
    }
  }, [url]);

  const handleStartServer = async () => {
    await startServer();
    onServerStart?.();
  };

  const handleStopServer = async () => {
    await stopServer();
    onServerStop?.();
  };

  // Servidor nao iniciado
  if (!isRunning && !isStarting && !error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <Play className="w-12 h-12 opacity-50" />
        <p>Dev server nao iniciado</p>
        <Button onClick={handleStartServer}>
          Iniciar Dev Server
        </Button>
        <p className="text-xs">
          Vai iniciar <code>npm run dev</code> na porta 3333
        </p>
      </div>
    );
  }

  // Iniciando servidor
  if (isStarting) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <Loader2 className="w-12 h-12 animate-spin" />
        <p>Iniciando dev server...</p>
        <p className="text-xs">Isso pode levar alguns segundos</p>
      </div>
    );
  }

  // Erro
  if (error) {
    return (
      <PreviewError
        error={error.message}
        onRetry={handleStartServer}
      />
    );
  }

  // Servidor rodando - mostrar preview
  return (
    <div className="flex flex-col h-full">
      <PreviewToolbar
        device={device}
        onDeviceChange={setDevice}
        onReload={handleReload}
        onOpenExternal={handleOpenExternal}
        onStop={handleStopServer}
        serverUrl={url || ''}
        isRunning={isRunning}
      />

      <div className="flex-1 bg-muted/30 p-4 overflow-auto">
        <DeviceFrame device={device}>
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={url || ''}
            className="w-full h-full border-0 bg-white"
            title="App Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </DeviceFrame>
      </div>
    </div>
  );
}
```

### 4. PreviewToolbar.tsx

```typescript
import { Monitor, Tablet, Smartphone, RefreshCw, ExternalLink, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type DeviceType = 'desktop' | 'tablet' | 'mobile';

interface PreviewToolbarProps {
  device: DeviceType;
  onDeviceChange: (device: DeviceType) => void;
  onReload: () => void;
  onOpenExternal: () => void;
  onStop: () => void;
  serverUrl: string;
  isRunning: boolean;
}

export function PreviewToolbar({
  device,
  onDeviceChange,
  onReload,
  onOpenExternal,
  onStop,
  serverUrl,
  isRunning,
}: PreviewToolbarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
      {/* Lado esquerdo - Device toggle */}
      <div className="flex items-center gap-2">
        <ToggleGroup type="single" value={device} onValueChange={(v) => v && onDeviceChange(v as DeviceType)}>
          <ToggleGroupItem value="desktop" size="sm" title="Desktop">
            <Monitor className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="tablet" size="sm" title="Tablet">
            <Tablet className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="mobile" size="sm" title="Mobile">
            <Smartphone className="w-4 h-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="w-px h-4 bg-border mx-2" />

        <Button variant="ghost" size="sm" onClick={onReload} title="Reload">
          <RefreshCw className="w-4 h-4" />
        </Button>

        <Button variant="ghost" size="sm" onClick={onOpenExternal} title="Open in new tab">
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>

      {/* Centro - URL */}
      <div className="flex-1 mx-4">
        <div className="flex items-center justify-center">
          <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            {serverUrl}
          </code>
        </div>
      </div>

      {/* Lado direito - Status e Stop */}
      <div className="flex items-center gap-2">
        {isRunning && (
          <span className="flex items-center gap-1 text-xs text-green-500">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Running
          </span>
        )}

        <Button variant="ghost" size="sm" onClick={onStop} title="Stop server">
          <Square className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
```

### 5. DeviceFrame.tsx

```typescript
import { cn } from '@/lib/utils';

type DeviceType = 'desktop' | 'tablet' | 'mobile';

interface DeviceFrameProps {
  device: DeviceType;
  children: React.ReactNode;
}

const DEVICE_DIMENSIONS = {
  desktop: { width: '100%', height: '100%' },
  tablet: { width: '768px', height: '1024px' },
  mobile: { width: '375px', height: '667px' },
};

export function DeviceFrame({ device, children }: DeviceFrameProps) {
  const dimensions = DEVICE_DIMENSIONS[device];

  if (device === 'desktop') {
    return <div className="w-full h-full">{children}</div>;
  }

  return (
    <div className="flex items-center justify-center w-full h-full">
      <div
        className={cn(
          'relative bg-black rounded-[40px] p-3 shadow-2xl',
          'ring-1 ring-gray-700'
        )}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      >
        {/* Notch para mobile */}
        {device === 'mobile' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-full z-10" />
        )}

        {/* Conteudo */}
        <div className="w-full h-full rounded-[28px] overflow-hidden bg-white">
          {children}
        </div>
      </div>
    </div>
  );
}
```

### 6. PreviewError.tsx

```typescript
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PreviewErrorProps {
  error: string;
  onRetry: () => void;
}

export function PreviewError({ error, onRetry }: PreviewErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground p-8">
      <AlertCircle className="w-12 h-12 text-red-500" />
      <h3 className="text-lg font-medium text-foreground">Erro ao iniciar preview</h3>
      <p className="text-center max-w-md">{error}</p>

      <div className="flex flex-col gap-2 text-sm">
        <p className="font-medium">Possíveis soluções:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Verifique se o CLI Server está rodando (<code>bazari studio --serve</code>)</li>
          <li>Verifique se a porta 3333 está livre</li>
          <li>Rode <code>npm install</code> no projeto primeiro</li>
        </ul>
      </div>

      <Button onClick={onRetry} className="mt-4">
        <RefreshCw className="w-4 h-4 mr-2" />
        Tentar Novamente
      </Button>
    </div>
  );
}
```

### 7. Integrar no StudioLayout

```typescript
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { PreviewPanel } from './preview/PreviewPanel';

export function StudioLayout() {
  const { activeFilePath, projectPath } = useStudioStore();

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className="w-64 border-r">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <ResizablePanelGroup direction="horizontal">
          {/* Editor Panel */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col">
              <EditorTabs />
              {activeFilePath ? (
                <CodeEditor filePath={activeFilePath} />
              ) : (
                <EmptyEditor />
              )}
              <EditorStatusBar />
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Preview Panel */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <PreviewPanel projectPath={projectPath} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
```

### 8. Fluxo de HMR

O Hot Module Replacement funciona automaticamente:

```
1. Usuario edita arquivo no Monaco Editor
2. CodeEditor.onChange dispara
3. useFileEditor salva via PUT /files (debounced 500ms)
4. CLI Server escreve arquivo no disco
5. Vite (que esta monitorando a pasta) detecta mudanca
6. Vite envia update via WebSocket para o browser
7. O iframe (localhost:3333) recebe o update
8. Componente atualiza sem refresh completo
```

Nao e necessario fazer nada especial - Vite cuida do HMR automaticamente.

### 9. Consideracoes de CORS/Mixed Content

Como o Studio pode rodar em HTTPS (bazari.libervia.xyz) e o dev server roda em HTTP (localhost:3333), pode haver problemas de Mixed Content.

Solucoes:
1. **Desenvolvimento local**: Rodar Studio em localhost tambem
2. **Proxy reverso**: CLI Server pode servir como proxy
3. **Aceitar insecure localhost**: Browsers geralmente permitem localhost como excecao

## Criterios de Aceite

1. [ ] Botao "Iniciar Dev Server" funciona
2. [ ] Dev server inicia via CLI Server (POST /build/dev)
3. [ ] Preview carrega no iframe (localhost:3333)
4. [ ] Toggle de dispositivo muda dimensoes
5. [ ] Botao reload funciona
6. [ ] Botao abrir externa abre nova aba
7. [ ] HMR funciona (editar codigo atualiza preview)
8. [ ] Parar servidor funciona (POST /build/dev/stop)
9. [ ] Tratamento de erro mostra mensagem amigavel
10. [ ] Build do projeto nao quebra

## Nao Fazer Nesta Fase

- Criar projeto automatico (fase 5)
- Build/Publish (fase 5)
- Templates (fase 6)

## Notas

- URL do preview e sempre localhost:3333 (ou porta configurada)
- O Vite precisa estar instalado no projeto (npm install primeiro)
- Limpeza do processo ao fechar Studio/mudar projeto
