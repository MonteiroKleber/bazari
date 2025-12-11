import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  RefreshCw,
  ExternalLink,
  Smartphone,
  Monitor,
  Tablet,
  AlertCircle,
  CheckCircle,
  XCircle,
  Terminal,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { handleAppMessage } from '@/platform/sdk/host-bridge';

type DeviceSize = 'mobile' | 'tablet' | 'desktop';

interface LogEntry {
  id: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  timestamp: Date;
  data?: unknown;
}

const DEVICE_SIZES: Record<DeviceSize, { width: number; height: number; label: string }> = {
  mobile: { width: 375, height: 667, label: 'Mobile' },
  tablet: { width: 768, height: 1024, label: 'Tablet' },
  desktop: { width: 1200, height: 800, label: 'Desktop' },
};

const STORAGE_KEY = 'bazari_dev_preview_url';

export default function DevPreviewPage() {
  const [searchParams] = useSearchParams();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // State
  const [url, setUrl] = useState(() => {
    const urlParam = searchParams.get('url');
    if (urlParam) return urlParam;
    return localStorage.getItem(STORAGE_KEY) || 'http://localhost:3333';
  });
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceSize, setDeviceSize] = useState<DeviceSize>('mobile');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showConsole, setShowConsole] = useState(true);

  // Auto-load if URL param is provided
  useEffect(() => {
    const urlParam = searchParams.get('url');
    if (urlParam) {
      handleLoad(urlParam);
    }
  }, [searchParams]);

  // Listen for SDK messages from iframe and route to host-bridge
  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      // Only process messages if we have a loaded URL and iframe
      if (!loadedUrl || !iframeRef.current) return;

      // Verify message came from our iframe
      if (event.source !== iframeRef.current.contentWindow) return;

      // Verify origin matches loaded URL
      try {
        const expectedOrigin = new URL(loadedUrl).origin;
        if (event.origin !== expectedOrigin) return;
      } catch {
        return;
      }

      const message = event.data;

      // Check if it's an SDK message (has id, type, and comes from SDK)
      if (!message || typeof message !== 'object' || !message.id || !message.type) {
        return;
      }

      // Log the message
      addLog('info', `SDK: ${message.type}`, message.payload);

      // Route to host-bridge for processing
      // Use 'dev-preview' as appId for development apps
      try {
        await handleAppMessage(
          'dev-preview',
          message,
          iframeRef.current,
          event.origin
        );
        addLog('success', `Resposta enviada: ${message.type}`);
      } catch (error) {
        addLog('error', `Erro no handler: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [loadedUrl]);

  const addLog = (type: LogEntry['type'], message: string, data?: unknown) => {
    setLogs((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        message,
        timestamp: new Date(),
        data,
      },
      ...prev.slice(0, 99), // Keep last 100 logs
    ]);
  };

  const handleLoad = (urlToLoad?: string) => {
    const targetUrl = urlToLoad || url;

    if (!targetUrl) {
      setError('Digite uma URL válida');
      return;
    }

    // Validate URL
    try {
      new URL(targetUrl);
    } catch {
      setError('URL inválida');
      return;
    }

    setError(null);
    setIsLoading(true);
    setLoadedUrl(targetUrl);

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, targetUrl);

    addLog('info', `Carregando: ${targetUrl}`);
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    addLog('success', 'App carregado com sucesso');
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError('Erro ao carregar o app. Verifique se o servidor está rodando.');
    addLog('error', 'Falha ao carregar o app');
  };

  const handleRefresh = () => {
    if (iframeRef.current && loadedUrl) {
      setIsLoading(true);
      addLog('info', 'Recarregando app...');
      iframeRef.current.src = loadedUrl;
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const device = DEVICE_SIZES[deviceSize];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/app/developer">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Developer Portal
                </Link>
              </Button>
              <div className="h-6 w-px bg-border" />
              <h1 className="font-semibold">Preview Mode</h1>
              <Badge variant="outline" className="text-xs">
                Desenvolvimento
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              {/* Device Size Toggle */}
              <div className="flex items-center border rounded-lg p-1">
                <Button
                  variant={deviceSize === 'mobile' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setDeviceSize('mobile')}
                  title="Mobile (375x667)"
                >
                  <Smartphone className="w-4 h-4" />
                </Button>
                <Button
                  variant={deviceSize === 'tablet' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setDeviceSize('tablet')}
                  title="Tablet (768x1024)"
                >
                  <Tablet className="w-4 h-4" />
                </Button>
                <Button
                  variant={deviceSize === 'desktop' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setDeviceSize('desktop')}
                  title="Desktop (1200x800)"
                >
                  <Monitor className="w-4 h-4" />
                </Button>
              </div>

              {loadedUrl && (
                <>
                  <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
                    <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
                    Recarregar
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={loadedUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Abrir em nova aba
                    </a>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Preview Area */}
          <div className="lg:col-span-3">
            {/* URL Input */}
            <Card className="mb-6">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label htmlFor="preview-url" className="sr-only">
                      URL do App
                    </Label>
                    <Input
                      id="preview-url"
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="http://localhost:3333"
                      onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
                    />
                  </div>
                  <Button onClick={() => handleLoad()} disabled={isLoading}>
                    <Play className="w-4 h-4 mr-2" />
                    {isLoading ? 'Carregando...' : 'Carregar'}
                  </Button>
                </div>
                {error && (
                  <div className="flex items-center gap-2 mt-3 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Execute <code className="bg-muted px-1 rounded">bazari dev</code> no seu projeto e cole a URL aqui
                </p>
              </CardContent>
            </Card>

            {/* Preview Frame */}
            <div className="flex justify-center">
              <div
                className="bg-muted rounded-xl p-4 transition-all duration-300"
                style={{
                  width: device.width + 32,
                  maxWidth: '100%',
                }}
              >
                <div className="text-center text-xs text-muted-foreground mb-2">
                  {device.label} ({device.width}x{device.height})
                </div>
                <div
                  className="bg-background rounded-lg overflow-hidden border shadow-lg mx-auto"
                  style={{
                    width: device.width,
                    height: device.height,
                    maxWidth: '100%',
                  }}
                >
                  {loadedUrl ? (
                    <iframe
                      ref={iframeRef}
                      src={loadedUrl}
                      className="w-full h-full border-0"
                      onLoad={handleIframeLoad}
                      onError={handleIframeError}
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                      title="App Preview"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                      <Monitor className="w-16 h-16 mb-4 opacity-30" />
                      <p className="text-lg font-medium mb-2">Nenhum app carregado</p>
                      <p className="text-sm text-center max-w-xs">
                        Digite a URL do seu app de desenvolvimento e clique em Carregar
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Instructions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Como usar</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Inicie o dev server</p>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded block mt-1">
                      bazari dev
                    </code>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Cole a URL</p>
                    <p className="text-muted-foreground text-xs">
                      Geralmente http://localhost:3333
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Teste o SDK</p>
                    <p className="text-muted-foreground text-xs">
                      Seu app roda dentro do Bazari com SDK funcionando
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Console */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    Console
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={clearLogs}
                      title="Limpar logs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="text-xs">
                  Logs do SDK aparecem aqui
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-2 h-64 overflow-y-auto font-mono text-xs space-y-1">
                  {logs.length === 0 ? (
                    <div className="text-muted-foreground text-center py-8">
                      Nenhum log ainda
                    </div>
                  ) : (
                    logs.map((log) => (
                      <div
                        key={log.id}
                        className={cn(
                          'flex items-start gap-2 py-1 px-2 rounded',
                          log.type === 'error' && 'bg-destructive/10 text-destructive',
                          log.type === 'success' && 'bg-green-500/10 text-green-600',
                          log.type === 'warning' && 'bg-yellow-500/10 text-yellow-600',
                          log.type === 'info' && 'text-muted-foreground'
                        )}
                      >
                        <span className="flex-shrink-0">
                          {log.type === 'error' && <XCircle className="w-3.5 h-3.5" />}
                          {log.type === 'success' && <CheckCircle className="w-3.5 h-3.5" />}
                          {log.type === 'warning' && <AlertCircle className="w-3.5 h-3.5" />}
                          {log.type === 'info' && <span className="text-muted-foreground">›</span>}
                        </span>
                        <span className="flex-1 break-all">{log.message}</span>
                        <span className="text-muted-foreground flex-shrink-0">
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Status */}
            {loadedUrl && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Status</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">URL</span>
                    <span className="font-mono text-xs truncate max-w-[150px]" title={loadedUrl}>
                      {loadedUrl}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={isLoading ? 'secondary' : 'default'} className="text-xs">
                      {isLoading ? 'Carregando...' : 'Conectado'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Viewport</span>
                    <span className="text-xs">
                      {device.width}x{device.height}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
