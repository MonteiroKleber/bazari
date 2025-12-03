import { useEffect, useRef, useCallback } from 'react';
import { handleAppMessage } from '@/platform/sdk/host-bridge';

interface SDKMessage {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  sdkVersion: string;
}

interface AppIframeProps {
  appId: string;
  src: string;
  className?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Iframe sandboxed para apps de terceiros
 */
export function AppIframe({
  appId,
  src,
  className,
  onLoad,
  onError,
}: AppIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Handler de mensagens do app
  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      // Validar origem (em produção, ser mais restritivo)
      if (!iframeRef.current) return;

      // Verificar se a mensagem veio do nosso iframe
      if (event.source !== iframeRef.current.contentWindow) return;

      const message = event.data as SDKMessage;

      // Validar estrutura da mensagem
      if (!message.id || !message.type) return;

      await handleAppMessage(appId, message as any, iframeRef.current);
    },
    [appId]
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      className={className}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      allow="clipboard-write"
      onLoad={onLoad}
      onError={() => onError?.(new Error('Failed to load app'))}
      style={{
        border: 'none',
        width: '100%',
        height: '100%',
      }}
    />
  );
}
