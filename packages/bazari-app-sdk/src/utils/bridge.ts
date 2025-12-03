import type { SDKMessage, HostResponse, MessageType } from '../types/messages';
import type { ResponseTypes } from '../types/responses';

const SDK_VERSION = '0.1.0';

/**
 * Gera ID único para mensagens
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Mapa de callbacks pendentes
 */
const pendingCallbacks = new Map<
  string,
  { resolve: (value: unknown) => void; reject: (error: Error) => void }
>();

/**
 * Timeout padrão para respostas (10s)
 */
const DEFAULT_TIMEOUT = 10000;

/**
 * Flag para controlar inicialização do listener
 */
let listenerInitialized = false;

/**
 * Listener de mensagens do host
 */
function setupMessageListener() {
  if (listenerInitialized || typeof window === 'undefined') return;

  window.addEventListener('message', (event) => {
    // Validar origem (em produção, verificar origin específico)
    // if (event.origin !== 'https://bazari.io') return;

    const response = event.data as HostResponse;

    if (!response.id || !pendingCallbacks.has(response.id)) {
      return;
    }

    const { resolve, reject } = pendingCallbacks.get(response.id)!;
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
 * Envia mensagem para o host e aguarda resposta
 */
export async function sendMessage<T extends keyof ResponseTypes>(
  type: T,
  payload: unknown,
  timeout: number = DEFAULT_TIMEOUT
): Promise<ResponseTypes[T]> {
  return new Promise((resolve, reject) => {
    const id = generateId();

    const message: SDKMessage = {
      id,
      type: type as MessageType,
      payload,
      timestamp: Date.now(),
      sdkVersion: SDK_VERSION,
    };

    // Timeout
    const timeoutId = setTimeout(() => {
      pendingCallbacks.delete(id);
      reject(new Error(`Timeout waiting for response to ${type}`));
    }, timeout);

    // Registrar callback
    pendingCallbacks.set(id, {
      resolve: (value) => {
        clearTimeout(timeoutId);
        resolve(value as ResponseTypes[T]);
      },
      reject: (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    });

    // Enviar mensagem para parent
    if (typeof window !== 'undefined' && window.parent !== window) {
      window.parent.postMessage(message, '*');
    } else {
      pendingCallbacks.delete(id);
      clearTimeout(timeoutId);
      reject(new Error('SDK must run inside Bazari platform iframe'));
    }
  });
}

/**
 * Verifica se está rodando dentro do Bazari
 */
export function isInsideBazari(): boolean {
  if (typeof window === 'undefined') return false;
  return window.parent !== window;
}
