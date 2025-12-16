/**
 * PreviewPanel - Main preview panel with iframe and controls
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDevServer } from '../../hooks/useDevServer';
import { PreviewToolbar } from './PreviewToolbar';
import { DeviceFrame, type DeviceType } from './DeviceFrame';
import { PreviewError } from './PreviewError';
import { Loader2, Play, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { handleAppMessage, ensureHandlersRegistered } from '@/platform/sdk';

interface SDKMessage {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  sdkVersion: string;
  apiKey?: string;
  signature?: string;
}

interface PreviewPanelProps {
  projectPath: string;
  onServerStart?: () => void;
  onServerStop?: () => void;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  projectPath,
  onServerStart,
  onServerStop,
}) => {
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeError, setIframeError] = useState(false);
  const [isServerReady, setIsServerReady] = useState(false);
  const [isCheckingServer, setIsCheckingServer] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { url, isRunning, isStarting, error, startServer, stopServer, restartServer } =
    useDevServer({ projectPath });

  /**
   * Check if dev server is ready to accept connections
   */
  const checkServerReady = useCallback(async (serverUrl: string): Promise<boolean> => {
    try {
      // Use fetch with no-cors mode to just check if server responds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      await fetch(serverUrl, {
        mode: 'no-cors',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Poll for server readiness when URL is available
  useEffect(() => {
    if (!url || !isRunning) {
      setIsServerReady(false);
      setIsCheckingServer(false);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }

    setIsCheckingServer(true);
    setIsServerReady(false);
    setIframeError(false);

    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max

    const checkReady = async () => {
      const ready = await checkServerReady(url);
      if (ready) {
        setIsServerReady(true);
        setIsCheckingServer(false);
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
      } else {
        attempts++;
        if (attempts >= maxAttempts) {
          setIsCheckingServer(false);
          setIframeError(true);
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
          }
        }
      }
    };

    // Check immediately
    checkReady();

    // Then poll every second
    checkIntervalRef.current = setInterval(checkReady, 1000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [url, isRunning, checkServerReady]);

  /**
   * Handle SDK messages from the iframe
   * This enables the preview to communicate with the host SDK handlers
   */
  useEffect(() => {
    // Ensure SDK handlers are registered
    ensureHandlersRegistered();

    const handleMessage = async (event: MessageEvent) => {
      if (!iframeRef.current) return;

      // Only handle messages from our iframe
      if (event.source !== iframeRef.current.contentWindow) {
        return;
      }

      const message = event.data as SDKMessage;

      // Validate message structure
      if (
        !message ||
        typeof message !== 'object' ||
        !message.id ||
        !message.type ||
        typeof message.type !== 'string'
      ) {
        return;
      }

      // Handle SDK messages using 'dev-preview' as appId
      // This gives the preview app read-only access to user data
      try {
        await handleAppMessage(
          'dev-preview',
          message as any,
          iframeRef.current,
          event.origin
        );
      } catch (err) {
        console.error('[PreviewPanel] Error handling SDK message:', err);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  /**
   * Force reload iframe by incrementing key
   */
  const handleReload = useCallback(() => {
    setIframeKey((k) => k + 1);
    setIframeError(false);
  }, []);

  /**
   * Open preview in new tab
   */
  const handleOpenExternal = useCallback(() => {
    if (url) {
      window.open(url, '_blank');
    }
  }, [url]);

  /**
   * Start the dev server
   */
  const handleStartServer = async () => {
    await startServer();
    onServerStart?.();
  };

  /**
   * Stop the dev server
   */
  const handleStopServer = async () => {
    await stopServer();
    onServerStop?.();
  };

  /**
   * Restart the dev server
   */
  const handleRestartServer = async () => {
    await restartServer();
  };

  // Server not started - show start button
  if (!isRunning && !isStarting && !error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-muted/30 text-muted-foreground">
        <Play className="h-16 w-16 opacity-30" />
        <h3 className="text-lg font-medium text-foreground">Dev Server Not Running</h3>
        <p className="text-sm">Start the dev server to preview your app</p>
        <Button onClick={handleStartServer} size="lg" className="mt-2">
          <Play className="mr-2 h-4 w-4" />
          Start Dev Server
        </Button>
        <p className="mt-4 text-xs text-muted-foreground">
          This will run <code className="rounded bg-muted px-1">npm run dev</code> on port 3333
        </p>
      </div>
    );
  }

  // Starting server - show loading
  if (isStarting) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-muted/30 text-muted-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <h3 className="text-lg font-medium text-foreground">Starting Dev Server...</h3>
        <p className="text-sm">This may take a few seconds</p>
        <div className="mt-4 flex flex-col gap-1 text-xs">
          <p>Installing dependencies if needed...</p>
          <p>Starting Vite dev server...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return <PreviewError error={error.message} onRetry={handleStartServer} />;
  }

  // Server running - show preview
  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <PreviewToolbar
        device={device}
        onDeviceChange={setDevice}
        onReload={handleReload}
        onOpenExternal={handleOpenExternal}
        onStop={handleStopServer}
        onRestart={handleRestartServer}
        serverUrl={url || 'http://localhost:3333'}
        isRunning={isRunning}
      />

      {/* Preview iframe area */}
      <div className="flex-1 overflow-auto bg-[#1a1a2e] p-4">
        {isCheckingServer ? (
          // Waiting for server to be ready
          <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h3 className="text-lg font-medium text-foreground">Aguardando Dev Server...</h3>
            <p className="text-sm text-center max-w-md">
              Iniciando Vite em <code className="rounded bg-muted px-1">{url}</code>
            </p>
            <p className="text-xs">Isso pode levar alguns segundos...</p>
          </div>
        ) : iframeError ? (
          // Server failed to respond
          <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
            <RefreshCw className="h-12 w-12 text-destructive opacity-50" />
            <h3 className="text-lg font-medium text-foreground">Nao foi possivel conectar ao dev server</h3>
            <p className="text-sm text-center max-w-md">
              O servidor pode ter falhado ao iniciar. Verifique se o projeto tem <code className="rounded bg-muted px-1">npm run dev</code> configurado.
            </p>
            <div className="flex gap-2 mt-2">
              <Button onClick={handleRestartServer} variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reiniciar Server
              </Button>
              <Button onClick={() => { setIframeError(false); setIsCheckingServer(true); setIframeKey(k => k + 1); }} variant="outline">
                Tentar Novamente
              </Button>
            </div>
          </div>
        ) : isServerReady ? (
          // Server ready - show iframe
          <DeviceFrame device={device}>
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={url || ''}
              className="h-full w-full border-0 bg-white"
              title="App Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              onError={() => setIframeError(true)}
            />
          </DeviceFrame>
        ) : (
          // Fallback - should not normally reach here
          <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm">Preparando preview...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewPanel;
