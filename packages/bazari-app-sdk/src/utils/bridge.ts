import type { SDKMessage, HostResponse, MessageType } from '../types/messages';
import type { ResponseTypes } from '../types/responses';

const SDK_VERSION = '0.2.0';

/**
 * Origens permitidas do Bazari (host)
 */
const BAZARI_ALLOWED_ORIGINS = [
  'https://bazari.libervia.xyz',
  'https://bazari.io',
  'https://www.bazari.io',
];

// Em desenvolvimento, permitir localhost
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  BAZARI_ALLOWED_ORIGINS.push(
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  );
}

/**
 * Origem do host detectada
 */
let detectedHostOrigin: string | null = null;

/**
 * API Key do app (obrigatória para autenticação)
 */
let appApiKey: string | null = null;

/**
 * Secret Key do app (para HMAC signing)
 */
let appSecretKey: string | null = null;

/**
 * Timeout máximo permitido (30s)
 */
const MAX_TIMEOUT = 30000;

/**
 * Timeout padrão para respostas (10s)
 */
const DEFAULT_TIMEOUT = 10000;

/**
 * Gera ID único para mensagens usando crypto API
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback para ambientes sem crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Gera HMAC-SHA256 signature
 */
async function generateSignature(data: string, secretKey: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // Fallback: retorna hash simples se crypto.subtle não disponível
    console.warn('[BazariSDK] crypto.subtle not available, signature will be weak');
    return btoa(data + secretKey).substring(0, 44);
  }

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Mapa de callbacks pendentes
 */
const pendingCallbacks = new Map<
  string,
  { resolve: (value: unknown) => void; reject: (error: Error) => void; timeoutId: ReturnType<typeof setTimeout> }
>();

/**
 * Flag para controlar inicialização do listener
 */
let listenerInitialized = false;

/**
 * Valida se a origem é permitida
 */
function isAllowedOrigin(origin: string): boolean {
  return BAZARI_ALLOWED_ORIGINS.some(allowed => origin === allowed || origin.startsWith(allowed));
}

/**
 * Detecta a origem do host (parent window)
 */
function detectHostOrigin(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    // Tentar detectar via ancestorOrigins (Chrome, Edge)
    if (window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0) {
      const parentOrigin = window.location.ancestorOrigins[0];
      if (isAllowedOrigin(parentOrigin)) {
        return parentOrigin;
      }
    }

    // Tentar via document.referrer
    if (document.referrer) {
      const referrerOrigin = new URL(document.referrer).origin;
      if (isAllowedOrigin(referrerOrigin)) {
        return referrerOrigin;
      }
    }

    // Fallback para produção
    return BAZARI_ALLOWED_ORIGINS[0];
  } catch {
    return BAZARI_ALLOWED_ORIGINS[0];
  }
}

/**
 * Listener de mensagens do host
 */
function setupMessageListener() {
  if (listenerInitialized || typeof window === 'undefined') return;

  window.addEventListener('message', (event) => {
    // SEGURANÇA: Validar origem da mensagem
    if (!isAllowedOrigin(event.origin)) {
      console.warn('[BazariSDK] Rejected message from untrusted origin:', event.origin);
      return;
    }

    const response = event.data as HostResponse;

    // Validar estrutura da resposta
    if (!response || typeof response !== 'object' || !response.id) {
      return;
    }

    const callback = pendingCallbacks.get(response.id);
    if (!callback) {
      return;
    }

    const { resolve, reject, timeoutId } = callback;
    clearTimeout(timeoutId);
    pendingCallbacks.delete(response.id);

    if (response.success) {
      resolve(response.data);
    } else {
      reject(
        new Error(response.error?.message || 'Unknown error from host')
      );
    }
  });

  listenerInitialized = true;
}

// Inicializar listener
setupMessageListener();

/**
 * Configura as credenciais do app
 * API Key é opcional para apps rodando no Preview Mode (desenvolvimento)
 */
export function configureSDK(config: { apiKey?: string; secretKey?: string }): void {
  // API Key é opcional - em dev mode/preview não é necessária
  appApiKey = config.apiKey || null;
  appSecretKey = config.secretKey || null;
  detectedHostOrigin = detectHostOrigin();
}

/**
 * Verifica se o SDK está configurado
 */
export function isConfigured(): boolean {
  return appApiKey !== null;
}

/**
 * Envia mensagem para o host e aguarda resposta
 */
export async function sendMessage<T extends keyof ResponseTypes>(
  type: T,
  payload: unknown,
  timeout: number = DEFAULT_TIMEOUT
): Promise<ResponseTypes[T]> {
  // Verificar se está dentro do Bazari
  if (typeof window === 'undefined' || window.parent === window) {
    throw new Error('[BazariSDK] SDK must run inside Bazari platform iframe');
  }

  // Detectar origem se ainda não detectada
  if (!detectedHostOrigin) {
    detectedHostOrigin = detectHostOrigin();
  }

  // Sanitizar timeout
  const sanitizedTimeout = Math.min(Math.max(timeout, 1000), MAX_TIMEOUT);

  return new Promise(async (resolve, reject) => {
    const id = generateId();
    const timestamp = Date.now();

    // Criar mensagem base
    const messageData = {
      id,
      type: type as MessageType,
      payload,
      timestamp,
      sdkVersion: SDK_VERSION,
      apiKey: appApiKey || undefined,
    };

    // Gerar assinatura HMAC se secretKey disponível
    let signature: string | undefined;
    if (appSecretKey) {
      const dataToSign = JSON.stringify({
        id,
        type,
        payload,
        timestamp,
      });
      signature = await generateSignature(dataToSign, appSecretKey);
    }

    const message: SDKMessage & { apiKey?: string; signature?: string } = {
      ...messageData,
      signature,
    };

    // Timeout com cleanup
    const timeoutId = setTimeout(() => {
      pendingCallbacks.delete(id);
      reject(new Error(`[BazariSDK] Timeout waiting for response to ${type}`));
    }, sanitizedTimeout);

    // Registrar callback
    pendingCallbacks.set(id, {
      resolve: (value) => {
        resolve(value as ResponseTypes[T]);
      },
      reject: (error) => {
        reject(error);
      },
      timeoutId,
    });

    // SEGURANÇA: Enviar mensagem com targetOrigin específico
    const targetOrigin = detectedHostOrigin || BAZARI_ALLOWED_ORIGINS[0];
    window.parent.postMessage(message, targetOrigin);
  });
}

/**
 * Verifica se está rodando dentro do Bazari
 */
export function isInsideBazari(): boolean {
  if (typeof window === 'undefined') return false;

  // Verificar se está em iframe
  if (window.parent === window) return false;

  // Tentar verificar origem do parent
  const hostOrigin = detectHostOrigin();
  if (hostOrigin && isAllowedOrigin(hostOrigin)) {
    return true;
  }

  // Fallback: assumir que está dentro se estiver em iframe
  return window.parent !== window;
}

/**
 * Retorna origens permitidas (para debug)
 */
export function getAllowedOrigins(): readonly string[] {
  return BAZARI_ALLOWED_ORIGINS;
}

/**
 * Retorna a versão do SDK
 */
export function getSDKVersion(): string {
  return SDK_VERSION;
}
