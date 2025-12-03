import { useUserAppsStore } from '../store';
import type { PermissionId } from '../types';

/**
 * Tipos de mensagens do SDK
 */
type MessageType =
  | 'auth:getCurrentUser'
  | 'auth:getPermissions'
  | 'wallet:getBalance'
  | 'wallet:getHistory'
  | 'wallet:requestTransfer'
  | 'storage:get'
  | 'storage:set'
  | 'storage:remove'
  | 'storage:clear'
  | 'ui:showToast'
  | 'ui:showConfirm'
  | 'ui:showModal'
  | 'ui:closeModal'
  | 'navigation:goTo'
  | 'navigation:openApp'
  | 'navigation:goBack'
  | 'events:subscribe'
  | 'events:unsubscribe'
  | 'events:emit';

/**
 * Estrutura de uma mensagem do SDK
 */
interface SDKMessage<T = unknown> {
  id: string;
  type: MessageType;
  payload: T;
  timestamp: number;
  sdkVersion: string;
}

/**
 * Estrutura da resposta do Host
 */
interface HostResponse<T = unknown> {
  id: string;
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: number;
}

type MessageHandler = (
  appId: string,
  payload: unknown
) => Promise<unknown>;

const handlers: Partial<Record<MessageType, MessageHandler>> = {};

/**
 * Registra um handler para um tipo de mensagem
 */
export function registerHandler(
  type: MessageType,
  handler: MessageHandler
): void {
  handlers[type] = handler;
}

/**
 * Processa mensagem recebida de um app
 */
export async function handleAppMessage(
  appId: string,
  message: SDKMessage,
  iframe: HTMLIFrameElement
): Promise<void> {
  const handler = handlers[message.type];

  let response: HostResponse;

  if (!handler) {
    response = {
      id: message.id,
      success: false,
      error: {
        code: 'UNKNOWN_MESSAGE_TYPE',
        message: `Unknown message type: ${message.type}`,
      },
      timestamp: Date.now(),
    };
  } else {
    try {
      // Verificar permissão
      const hasPermission = await checkPermission(appId, message.type);

      if (!hasPermission) {
        response = {
          id: message.id,
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: `App does not have permission for: ${message.type}`,
          },
          timestamp: Date.now(),
        };
      } else {
        const data = await handler(appId, message.payload);
        response = {
          id: message.id,
          success: true,
          data,
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      response = {
        id: message.id,
        success: false,
        error: {
          code: 'HANDLER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: Date.now(),
      };
    }
  }

  // Enviar resposta de volta para o iframe
  iframe.contentWindow?.postMessage(response, '*');
}

/**
 * Mapa de tipo de mensagem para permissão necessária
 */
const permissionMap: Partial<Record<MessageType, PermissionId>> = {
  'auth:getCurrentUser': 'user.profile.read',
  'wallet:getBalance': 'wallet.balance.read',
  'wallet:getHistory': 'wallet.history.read',
  'wallet:requestTransfer': 'wallet.transfer.request',
  'storage:get': 'storage.app',
  'storage:set': 'storage.app',
  'storage:remove': 'storage.app',
  'storage:clear': 'storage.app',
};

/**
 * Verifica se o app tem permissão para executar a ação
 */
async function checkPermission(
  appId: string,
  messageType: MessageType
): Promise<boolean> {
  const requiredPermission = permissionMap[messageType];

  // Algumas operações não precisam de permissão
  if (!requiredPermission) {
    return true;
  }

  const store = useUserAppsStore.getState();
  return store.hasPermission(appId, requiredPermission);
}

/**
 * Envia evento para um app específico
 */
export function sendEventToApp(
  iframe: HTMLIFrameElement,
  eventType: string,
  data: unknown
): void {
  iframe.contentWindow?.postMessage(
    {
      type: `event:${eventType}`,
      data,
      timestamp: Date.now(),
    },
    '*'
  );
}
