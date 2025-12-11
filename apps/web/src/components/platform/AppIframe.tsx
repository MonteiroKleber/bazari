import { useEffect, useRef, useCallback, useState } from 'react';
import { handleAppMessage } from '@/platform/sdk/host-bridge';

interface SDKMessage {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  sdkVersion: string;
  apiKey?: string;
  signature?: string;
}

interface AppIframeProps {
  appId: string;
  src: string;
  className?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  /**
   * Origens permitidas para este app (segurança)
   * Se não especificado, permite apenas a origem do src
   */
  allowedOrigins?: string[];
}

/**
 * Lista de origens confiáveis do Bazari
 */
const BAZARI_TRUSTED_ORIGINS = [
  'https://bazari.libervia.xyz',
  'https://bazari.io',
  'https://www.bazari.io',
];

// Em desenvolvimento, permitir localhost
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  BAZARI_TRUSTED_ORIGINS.push(
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  );
}

/**
 * Extrai origem de uma URL
 */
function getOriginFromUrl(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

/**
 * Iframe sandboxed para apps de terceiros
 *
 * Implementa múltiplas camadas de segurança:
 * 1. Validação de origem das mensagens
 * 2. Verificação de que mensagem veio do iframe correto
 * 3. Sandbox restritivo no iframe
 * 4. Passa origem para o host-bridge para validação adicional
 */
export function AppIframe({
  appId,
  src,
  className,
  onLoad,
  onError,
  allowedOrigins,
}: AppIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeOrigin, setIframeOrigin] = useState<string>('');

  // Determinar origens permitidas para este app
  const effectiveAllowedOrigins = allowedOrigins || [getOriginFromUrl(src)];

  // Handler de mensagens do app
  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      if (!iframeRef.current) return;

      // SEGURANÇA 1: Verificar se a mensagem veio do nosso iframe
      if (event.source !== iframeRef.current.contentWindow) {
        return;
      }

      // SEGURANÇA 2: Validar origem
      const sourceOrigin = event.origin;

      // Verificar se é uma origem confiável do Bazari ou a origem do app
      const isAllowed =
        BAZARI_TRUSTED_ORIGINS.includes(sourceOrigin) ||
        effectiveAllowedOrigins.includes(sourceOrigin) ||
        sourceOrigin === iframeOrigin;

      if (!isAllowed) {
        console.warn(
          '[AppIframe] Rejected message from untrusted origin:',
          sourceOrigin,
          'Expected:',
          effectiveAllowedOrigins
        );
        return;
      }

      const message = event.data as SDKMessage;

      // SEGURANÇA 3: Validar estrutura da mensagem
      if (
        !message ||
        typeof message !== 'object' ||
        !message.id ||
        !message.type ||
        typeof message.type !== 'string'
      ) {
        return;
      }

      // SEGURANÇA 4: Passar para host-bridge com origem para validação adicional
      await handleAppMessage(appId, message as any, iframeRef.current, sourceOrigin);
    },
    [appId, effectiveAllowedOrigins, iframeOrigin]
  );

  // Detectar origem do iframe após carregamento
  const handleIframeLoad = useCallback(() => {
    if (iframeRef.current) {
      try {
        // Tentar obter origem do iframe
        const origin = getOriginFromUrl(src);
        setIframeOrigin(origin);
      } catch {
        // Ignorar erros de cross-origin
      }
    }
    onLoad?.();
  }, [src, onLoad]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  // Determinar atributos de sandbox
  // NOTA: allow-same-origin é necessário para o app acessar seu próprio localStorage
  // mas remove-o se quiser isolamento total
  const sandboxAttrs = [
    'allow-scripts',
    'allow-forms',
    'allow-popups',
    'allow-popups-to-escape-sandbox',
    // allow-same-origin é necessário para apps acessarem seu storage
    // Remover se quiser isolamento total (mas apps não poderão usar localStorage)
    'allow-same-origin',
  ].join(' ');

  return (
    <iframe
      ref={iframeRef}
      src={src}
      className={className}
      sandbox={sandboxAttrs}
      allow="clipboard-write"
      onLoad={handleIframeLoad}
      onError={() => onError?.(new Error('Failed to load app'))}
      title={`App: ${appId}`}
      referrerPolicy="strict-origin-when-cross-origin"
      style={{
        border: 'none',
        width: '100%',
        height: '100%',
      }}
    />
  );
}
