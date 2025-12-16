import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertTriangle, X, Settings, RotateCw, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppNavigation } from '@/platform/navigation';
import { toast } from 'sonner';
import { handleAppMessage, ensureHandlersRegistered } from '@/platform/sdk';

interface AppData {
  id: string;
  appId: string; // slug - used for permissions
  name: string;
  version: string;
  iconUrl: string;
  bundleUrl: string;
  developer: string;
  permissions: Array<{ id: string; reason: string }>;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Fetch app details from API
async function fetchAppDetails(appId: string): Promise<AppData> {
  // Try fetching by slug first, then by id
  const response = await fetch(`${API_BASE_URL}/api/apps/store/${appId}`);

  if (!response.ok) {
    throw new Error(`App not found: ${appId}`);
  }

  const data = await response.json();
  const app = data.app;

  return {
    id: app.id,
    appId: app.appId || app.slug || appId, // slug used for permissions
    name: app.name,
    version: app.currentVersion || '1.0.0',
    iconUrl: app.icon?.startsWith('http')
      ? app.icon
      : `https://api.dicebear.com/7.x/shapes/svg?seed=${app.id}`,
    bundleUrl: app.bundleUrl,
    developer: app.developer?.profile?.displayName || app.developer?.profile?.handle || 'Unknown',
    permissions: app.permissions || [],
  };
}

function resolveIpfsUrl(ipfsUrl: string): string {
  if (ipfsUrl.startsWith('ipfs://')) {
    const cid = ipfsUrl.replace('ipfs://', '');
    // Use o gateway IPFS do Bazari
    return `https://bazari.libervia.xyz/ipfs/${cid}`;
  }
  return ipfsUrl;
}

export default function ExternalAppPage() {
  const { appId } = useParams<{ appId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getWebLink } = useAppNavigation();

  // Fetch app data
  const { data: app, isLoading: isLoadingApp } = useQuery({
    queryKey: ['external-app', appId],
    queryFn: () => fetchAppDetails(appId!),
    enabled: !!appId,
  });

  // Ensure SDK handlers are registered on mount
  useEffect(() => {
    ensureHandlersRegistered();
  }, []);

  // Handle postMessage from iframe - integrate with host-bridge
  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      // Validate origin
      if (!app?.bundleUrl || !iframeRef.current) return;

      const bundleOrigin = new URL(resolveIpfsUrl(app.bundleUrl)).origin;

      // Accept messages from the IPFS gateway origin
      // Note: IPFS gateway serves from bazari.libervia.xyz
      const isValidOrigin = event.origin === bundleOrigin ||
                            event.origin === 'https://bazari.libervia.xyz';

      if (!isValidOrigin) {
        return;
      }

      const message = event.data;

      // Ignore non-SDK messages
      if (!message || typeof message !== 'object') return;

      // Check if it's an SDK message (has id, type, timestamp)
      if (message.id && message.type && message.timestamp) {
        console.log('[ExternalApp] SDK message received:', message.type);

        // Forward to host-bridge handler
        // Use appId (slug) for permission checks, not id (Prisma ID)
        await handleAppMessage(
          app.appId, // appId (slug) for permissions
          message, // SDK message
          iframeRef.current, // iframe reference
          event.origin // source origin for response
        );
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [app]);

  const handleReload = () => {
    setIsLoading(true);
    setError(null);
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handleShare = () => {
    if (appId) {
      const url = getWebLink(appId);
      navigator.clipboard.writeText(url);
      toast.success('Link copiado!');
    }
  };

  const handleClose = () => {
    navigate(-1);
  };

  // Get initial path from navigation state
  const initialPath = (location.state as { path?: string })?.path || '/';

  // Construct iframe URL
  const bundleUrl = app?.bundleUrl
    ? resolveIpfsUrl(app.bundleUrl) + initialPath
    : null;

  if (isLoadingApp || !app) {
    return (
      <div className="fixed inset-0 top-16 bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 top-16 bg-background flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Erro ao carregar app</h2>
        <p className="text-muted-foreground">{error}</p>
        <div className="flex gap-2">
          <Button onClick={handleReload}>Tentar novamente</Button>
          <Button variant="outline" onClick={handleClose}>
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 top-16 bg-background flex flex-col">
      {/* App Header Bar */}
      <div className="h-12 border-b flex items-center justify-between px-4 bg-muted/50 shrink-0">
        <div className="flex items-center gap-3">
          <img
            src={app.iconUrl}
            alt={app.name}
            className="h-6 w-6 rounded"
          />
          <span className="font-medium">{app.name}</span>
          <span className="text-xs text-muted-foreground">v{app.version}</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReload}
            title="Recarregar"
          >
            <RotateCw className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Compartilhar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate(`/app/store/${appId}`)}
              >
                Ver na loja
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate('/app/settings/apps')}
              >
                Configurações de Apps
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sandbox Iframe */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Carregando app...</p>
            </div>
          </div>
        )}

        {bundleUrl ? (
          <iframe
            ref={iframeRef}
            src={bundleUrl}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            allow="geolocation"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setError('Falha ao carregar o app');
            }}
            title={app.name}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">App não disponível</h3>
              <p className="text-sm text-muted-foreground mb-4">
                O bundle deste app não está acessível no momento.
              </p>
              <Button onClick={handleClose}>Voltar</Button>
            </div>
          </div>
        )}
      </div>

      {/* Permission Indicator */}
      {app.permissions.length > 0 && (
        <div className="h-8 border-t flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/30 shrink-0">
          <span>Permissões:</span>
          {app.permissions.slice(0, 3).map((perm) => (
            <span key={perm.id} className="px-1.5 py-0.5 bg-muted rounded">
              {perm.id.split('.')[0]}
            </span>
          ))}
          {app.permissions.length > 3 && (
            <span>+{app.permissions.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}
