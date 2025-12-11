# 05 - Preview em Tempo Real

## Objetivo

Implementar preview em tempo real do app em desenvolvimento:
- iframe que carrega o Vite dev server rodando localmente
- Hot Module Replacement (HMR) para atualizacao instantanea
- Controles de reload, device frame, open external

## Pre-requisitos

- PROMPT-01 (Estrutura Base)
- PROMPT-02 (CLI Server) - Dev server roda localmente
- PROMPT-03 (Editor) - Edicao salva via API

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                    BROWSER (Studio UI)                          │
│                                                                 │
│  ┌─────────────────┐         ┌────────────────────────────────┐ │
│  │   Monaco Editor │         │         Preview Panel          │ │
│  │                 │         │                                │ │
│  │  const App = () │         │  ┌────────────────────────┐   │ │
│  │  {              │         │  │  iframe                 │   │ │
│  │    return ...   │         │  │  src="localhost:3333"   │◄──┼─┼─── Vite Dev Server
│  │  }              │         │  │                         │   │ │
│  │                 │         │  │  [App renderizado]      │   │ │
│  └─────────────────┘         │  └────────────────────────┘   │ │
│           │                   │            ▲                  │ │
│           │                   │            │ HMR              │ │
│           ▼                   │            │                  │ │
│  PUT localhost:4444           │            │                  │ │
│  /api/files/...               └────────────┼──────────────────┘ │
│           │                                │                    │
└───────────┼────────────────────────────────┼────────────────────┘
            │                                │
            ▼                                │
┌───────────────────────────────────────────────────────────────────┐
│                    MAQUINA LOCAL                                  │
│                                                                   │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐  │
│  │   CLI Server        │    │   Vite Dev Server               │  │
│  │   :4444             │    │   :3333                         │  │
│  │                     │    │                                 │  │
│  │  Salva arquivo      │───►│  Detecta mudanca                │  │
│  │  no disco           │    │  (chokidar/HMR)                 │  │
│  │                     │    │                                 │  │
│  │  ~/bazari-projects/ │    │  Envia update via               │  │
│  │    my-app/          │    │  WebSocket para iframe          │  │
│  │      src/App.tsx    │    │                                 │  │
│  └─────────────────────┘    └─────────────────────────────────┘  │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Fluxo de Atualizacao

1. Usuario edita codigo no Monaco Editor
2. Editor salva via API local (PUT localhost:4444/api/files/...)
3. CLI Server escreve arquivo no disco
4. Vite detecta mudanca (file watcher)
5. Vite envia update via WebSocket para o browser
6. HMR atualiza o iframe sem refresh completo

## Arquivos a Criar

```
apps/web/src/apps/studio/
├── components/
│   └── preview/
│       ├── PreviewPanel.tsx       // Painel principal
│       ├── PreviewToolbar.tsx     // Controles
│       ├── DeviceFrame.tsx        // Simulacao de dispositivo
│       └── PreviewError.tsx       // Tela de erro
└── hooks/
    └── useDevServer.ts            // Hook para controle do dev server
```

## Especificacao dos Componentes

### 1. PreviewPanel.tsx

```typescript
import { useState, useRef } from 'react';
import { PreviewToolbar } from './PreviewToolbar';
import { DeviceFrame } from './DeviceFrame';
import { PreviewError } from './PreviewError';
import { Button } from '@/components/ui/button';
import { Loader2, Play } from 'lucide-react';

interface PreviewPanelProps {
  /** ID do projeto */
  projectId: string;
  /** URL do dev server (localhost:3333) */
  serverUrl: string | null;
  /** Se o servidor esta rodando */
  isServerRunning: boolean;
  /** Se o servidor esta iniciando */
  isServerStarting: boolean;
  /** Callback para iniciar servidor */
  onStartServer: () => void;
  /** Callback para parar servidor */
  onStopServer: () => void;
}

type DeviceType = 'desktop' | 'tablet' | 'mobile';

export function PreviewPanel({
  projectId,
  serverUrl,
  isServerRunning,
  isServerStarting,
  onStartServer,
  onStopServer,
}: PreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Recarregar iframe
  const handleReload = () => {
    if (iframeRef.current && serverUrl) {
      setIsLoading(true);
      iframeRef.current.src = serverUrl;
    }
  };

  // Abrir em nova aba
  const handleOpenExternal = () => {
    if (serverUrl) {
      window.open(serverUrl, '_blank');
    }
  };

  // Handler de load do iframe
  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  // Handler de erro
  const handleIframeError = () => {
    setIsLoading(false);
    setError('Falha ao conectar com o dev server');
  };

  // Se servidor nao esta rodando
  if (!isServerRunning || !serverUrl) {
    return (
      <div className="h-full flex flex-col">
        <PreviewToolbar
          device={device}
          onDeviceChange={setDevice}
          onReload={handleReload}
          onOpenExternal={handleOpenExternal}
          isServerRunning={false}
          onStartServer={onStartServer}
          onStopServer={onStopServer}
        />
        <div className="flex-1 flex items-center justify-center bg-muted/20">
          <div className="text-center">
            {isServerStarting ? (
              <>
                <Loader2 className="w-12 h-12 mx-auto text-muted-foreground mb-4 animate-spin" />
                <h3 className="font-medium mb-2">Iniciando Dev Server...</h3>
                <p className="text-sm text-muted-foreground">
                  Executando npm install e vite
                </p>
              </>
            ) : (
              <>
                <Play className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Dev Server Parado</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Inicie o servidor de desenvolvimento para visualizar o app
                </p>
                <Button onClick={onStartServer}>
                  <Play className="w-4 h-4 mr-2" />
                  Iniciar Dev Server
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <PreviewToolbar
        device={device}
        onDeviceChange={setDevice}
        onReload={handleReload}
        onOpenExternal={handleOpenExternal}
        isServerRunning={isServerRunning}
        onStartServer={onStartServer}
        onStopServer={onStopServer}
        serverUrl={serverUrl}
      />

      <div className="flex-1 bg-muted/20 overflow-auto flex items-center justify-center p-4">
        {error ? (
          <PreviewError error={error} onRetry={handleReload} />
        ) : (
          <DeviceFrame device={device}>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={serverUrl}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              title="App Preview"
              // Importante: allow-same-origin para HMR funcionar
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </DeviceFrame>
        )}
      </div>
    </div>
  );
}
```

### 2. PreviewToolbar.tsx

```typescript
import {
  Monitor,
  Tablet,
  Smartphone,
  RotateCw,
  ExternalLink,
  Globe,
  Square,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';

interface PreviewToolbarProps {
  device: DeviceType;
  onDeviceChange: (device: DeviceType) => void;
  onReload: () => void;
  onOpenExternal: () => void;
  isServerRunning: boolean;
  onStartServer: () => void;
  onStopServer: () => void;
  serverUrl?: string;
}

type DeviceType = 'desktop' | 'tablet' | 'mobile';

export function PreviewToolbar({
  device,
  onDeviceChange,
  onReload,
  onOpenExternal,
  isServerRunning,
  onStartServer,
  onStopServer,
  serverUrl,
}: PreviewToolbarProps) {
  return (
    <div className="flex items-center justify-between h-10 px-3 border-b bg-muted/30">
      {/* Lado esquerdo: controles de dispositivo */}
      <div className="flex items-center gap-2">
        <ToggleGroup
          type="single"
          value={device}
          onValueChange={(v) => v && onDeviceChange(v as DeviceType)}
        >
          <ToggleGroupItem value="desktop" title="Desktop">
            <Monitor className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="tablet" title="Tablet">
            <Tablet className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="mobile" title="Mobile">
            <Smartphone className="w-4 h-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        <Separator orientation="vertical" className="h-6" />

        <Button
          variant="ghost"
          size="icon"
          onClick={onReload}
          title="Recarregar"
          disabled={!isServerRunning}
        >
          <RotateCw className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenExternal}
          title="Abrir em nova aba"
          disabled={!isServerRunning}
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>

      {/* Centro: URL */}
      <div className="flex-1 mx-4">
        {serverUrl && (
          <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded text-xs font-mono">
            <Globe className="w-3 h-3" />
            <span className="truncate">{serverUrl}</span>
          </div>
        )}
      </div>

      {/* Lado direito: controle do servidor */}
      <div className="flex items-center gap-2">
        {isServerRunning ? (
          <>
            <span className="flex items-center gap-1 text-xs text-green-500">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Rodando
            </span>
            <Button variant="ghost" size="sm" onClick={onStopServer}>
              <Square className="w-3 h-3 mr-1" />
              Parar
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={onStartServer}>
            <Play className="w-3 h-3 mr-1" />
            Iniciar
          </Button>
        )}
      </div>
    </div>
  );
}
```

### 3. DeviceFrame.tsx

```typescript
type DeviceType = 'desktop' | 'tablet' | 'mobile';

interface DeviceFrameProps {
  device: DeviceType;
  children: React.ReactNode;
}

const DEVICE_DIMENSIONS: Record<DeviceType, { width: string; height: string }> = {
  desktop: { width: '100%', height: '100%' },
  tablet: { width: '768px', height: '1024px' },
  mobile: { width: '375px', height: '667px' },
};

export function DeviceFrame({ device, children }: DeviceFrameProps) {
  const dimensions = DEVICE_DIMENSIONS[device];

  if (device === 'desktop') {
    return <div className="w-full h-full relative">{children}</div>;
  }

  return (
    <div
      className="relative bg-background border-4 border-foreground/20 rounded-3xl overflow-hidden shadow-xl"
      style={{
        width: dimensions.width,
        height: dimensions.height,
        maxWidth: '100%',
        maxHeight: '100%',
      }}
    >
      {/* Notch para mobile */}
      {device === 'mobile' && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-foreground/20 rounded-b-2xl z-10" />
      )}

      {/* Conteudo */}
      <div className="w-full h-full relative">
        {children}
      </div>

      {/* Home indicator */}
      {device === 'mobile' && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-foreground/20 rounded-full" />
      )}
    </div>
  );
}
```

### 4. PreviewError.tsx

```typescript
import { AlertCircle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PreviewErrorProps {
  error: string;
  onRetry: () => void;
}

export function PreviewError({ error, onRetry }: PreviewErrorProps) {
  return (
    <div className="text-center p-8">
      <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
      <h3 className="font-medium mb-2">Erro no Preview</h3>
      <p className="text-sm text-muted-foreground mb-4">{error}</p>
      <div className="flex justify-center gap-2">
        <Button variant="outline" onClick={onRetry}>
          <RotateCw className="w-4 h-4 mr-2" />
          Tentar Novamente
        </Button>
      </div>
    </div>
  );
}
```

### 5. useDevServer.ts

```typescript
import { useState, useCallback, useEffect, useRef } from 'react';
import { localServer } from '../services/local-server.client';

interface UseDevServerResult {
  /** URL do dev server (http://localhost:3333) */
  serverUrl: string | null;
  /** Se o servidor esta rodando */
  isRunning: boolean;
  /** Se o servidor esta iniciando */
  isStarting: boolean;
  /** Erro, se houver */
  error: Error | null;
  /** Inicia o dev server */
  start: () => Promise<void>;
  /** Para o dev server */
  stop: () => Promise<void>;
}

export function useDevServer(projectId: string): UseDevServerResult {
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const start = useCallback(async () => {
    if (isRunning || isStarting) return;

    setIsStarting(true);
    setError(null);

    try {
      // Chama API para iniciar dev server
      const response = await localServer.post<{
        success: boolean;
        url: string;
        port: number;
      }>(`/api/projects/${projectId}/dev`, {
        port: 3333,
      });

      if (response.success) {
        setServerUrl(response.url); // http://localhost:3333
        setIsRunning(true);

        // Conectar WebSocket para monitorar status
        wsRef.current = new WebSocket(`ws://localhost:4444/ws/dev/${projectId}`);

        wsRef.current.onmessage = (event) => {
          const data = JSON.parse(event.data);

          if (data.type === 'exit') {
            setIsRunning(false);
            setServerUrl(null);
          } else if (data.type === 'error') {
            setError(new Error(data.message));
          }
        };

        wsRef.current.onclose = () => {
          // Se WebSocket fechou, servidor provavelmente parou
          setIsRunning(false);
          setServerUrl(null);
        };
      } else {
        throw new Error('Failed to start dev server');
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to start dev server'));
      setIsRunning(false);
    } finally {
      setIsStarting(false);
    }
  }, [projectId, isRunning, isStarting]);

  const stop = useCallback(async () => {
    try {
      await localServer.post(`/api/projects/${projectId}/dev/stop`);

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      setIsRunning(false);
      setServerUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to stop dev server'));
    }
  }, [projectId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      // Opcional: parar servidor ao desmontar
      // stop();
    };
  }, []);

  // Verificar status inicial ao montar
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await localServer.get<{
          running: boolean;
          url?: string;
        }>(`/api/projects/${projectId}/dev/status`);

        if (status.running && status.url) {
          setServerUrl(status.url);
          setIsRunning(true);
        }
      } catch {
        // Servidor nao esta rodando
      }
    };

    checkStatus();
  }, [projectId]);

  return {
    serverUrl,
    isRunning,
    isStarting,
    error,
    start,
    stop,
  };
}
```

## API do CLI Server para Dev Server

```typescript
// server/routes/dev.ts

import { Router } from 'express';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

const devServers = new Map<string, ChildProcess>();

export function devRoutes(ctx: { projectDir: string }) {
  const router = Router();

  // Inicia dev server
  router.post('/projects/:projectId/dev', async (req, res) => {
    const { projectId } = req.params;
    const { port = 3333 } = req.body;
    const projectPath = path.join(ctx.projectDir, projectId);

    // Se ja existe, retornar URL existente
    if (devServers.has(projectId)) {
      return res.json({
        success: true,
        url: `http://localhost:${port}`,
        port,
      });
    }

    try {
      // Iniciar Vite
      const viteProcess = spawn('npx', ['vite', '--port', String(port), '--host'], {
        cwd: projectPath,
        shell: true,
        env: { ...process.env, FORCE_COLOR: '1' },
      });

      devServers.set(projectId, viteProcess);

      // Monitorar saida
      viteProcess.stdout?.on('data', (data) => {
        console.log(`[${projectId}] ${data}`);
      });

      viteProcess.stderr?.on('data', (data) => {
        console.error(`[${projectId}] ${data}`);
      });

      viteProcess.on('exit', (code) => {
        devServers.delete(projectId);
        console.log(`[${projectId}] Dev server exited with code ${code}`);
      });

      // Aguardar servidor estar pronto (verificar porta)
      await waitForPort(port, 10000);

      res.json({
        success: true,
        url: `http://localhost:${port}`,
        port,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Para dev server
  router.post('/projects/:projectId/dev/stop', (req, res) => {
    const { projectId } = req.params;
    const process = devServers.get(projectId);

    if (process) {
      process.kill();
      devServers.delete(projectId);
    }

    res.json({ success: true });
  });

  // Status do dev server
  router.get('/projects/:projectId/dev/status', (req, res) => {
    const { projectId } = req.params;
    const isRunning = devServers.has(projectId);

    res.json({
      running: isRunning,
      url: isRunning ? 'http://localhost:3333' : undefined,
    });
  });

  return router;
}

// Aguarda porta estar disponivel
async function waitForPort(port: number, timeout: number): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(`http://localhost:${port}`);
      if (response.ok || response.status === 404) {
        return; // Servidor respondeu
      }
    } catch {
      // Ainda nao esta pronto
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error('Timeout waiting for dev server');
}
```

## Consideracoes de Performance

1. **Debounce no save**: Nao salvar a cada tecla, usar debounce de 300-500ms
2. **HMR**: Vite ja faz hot module replacement, nao precisa reload completo
3. **Cache**: Vite cacheia assets estaticos automaticamente

## Criterios de Aceite

1. [ ] Preview renderiza conteudo do Vite local (localhost:3333)
2. [ ] HMR funciona (mudancas aparecem sem reload completo)
3. [ ] Botao reload funciona
4. [ ] Botao abrir externa funciona
5. [ ] Simulacao de dispositivos funciona (desktop/tablet/mobile)
6. [ ] Indicador de servidor rodando/parado funciona
7. [ ] Iniciar/parar servidor funciona
8. [ ] Tratamento de erro exibe mensagem amigavel
9. [ ] **Conexao com localhost funciona do browser**

## Nota sobre CORS/Mixed Content

O preview aponta para `localhost:3333` a partir de um site HTTPS (`https://bazari.libervia.xyz`). Isso funciona porque:

1. Browsers permitem requests de HTTPS para localhost
2. iframe com `allow-same-origin` funciona para localhost

Nao ha problema de mixed content porque localhost e tratado como caso especial.

## Proximos Passos

Apos implementar o preview, seguir para:
- [06-CLI-AUTOMATION.md](./06-CLI-AUTOMATION.md) - Automacao do CLI (create/build/publish via API)
