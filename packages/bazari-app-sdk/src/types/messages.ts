/**
 * Tipos de mensagens entre SDK e Host
 */
export type MessageType =
  // Auth
  | 'auth:getCurrentUser'
  | 'auth:getPermissions'

  // Wallet
  | 'wallet:getBalance'
  | 'wallet:getHistory'
  | 'wallet:requestTransfer'

  // Storage
  | 'storage:get'
  | 'storage:set'
  | 'storage:remove'
  | 'storage:clear'

  // UI
  | 'ui:showToast'
  | 'ui:showConfirm'
  | 'ui:showModal'
  | 'ui:closeModal'

  // Navigation
  | 'navigation:goTo'
  | 'navigation:openApp'
  | 'navigation:goBack'

  // Events
  | 'events:subscribe'
  | 'events:unsubscribe'
  | 'events:emit';

/**
 * Estrutura de uma mensagem enviada pelo SDK
 */
export interface SDKMessage<T = unknown> {
  /** ID único da mensagem para correlação */
  id: string;

  /** Tipo da operação */
  type: MessageType;

  /** Payload da mensagem */
  payload: T;

  /** Timestamp de envio */
  timestamp: number;

  /** Versão do SDK */
  sdkVersion: string;
}

/**
 * Estrutura da resposta do Host
 */
export interface HostResponse<T = unknown> {
  /** ID da mensagem original */
  id: string;

  /** Se a operação foi bem sucedida */
  success: boolean;

  /** Dados da resposta (se sucesso) */
  data?: T;

  /** Erro (se falha) */
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };

  /** Timestamp da resposta */
  timestamp: number;
}

/**
 * Evento emitido pelo Host para o SDK
 */
export interface HostEvent<T = unknown> {
  /** Tipo do evento */
  type: string;

  /** Dados do evento */
  data: T;

  /** Timestamp */
  timestamp: number;
}

/**
 * Payloads específicos por tipo de mensagem
 */
export interface MessagePayloads {
  // Auth
  'auth:getCurrentUser': void;
  'auth:getPermissions': void;

  // Wallet
  'wallet:getBalance': { token?: 'BZR' | 'ZARI' };
  'wallet:getHistory': { limit?: number; offset?: number };
  'wallet:requestTransfer': {
    to: string;
    amount: number;
    token: 'BZR' | 'ZARI';
    memo?: string;
  };

  // Storage
  'storage:get': { key: string };
  'storage:set': { key: string; value: unknown };
  'storage:remove': { key: string };
  'storage:clear': void;

  // UI
  'ui:showToast': {
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
  };
  'ui:showConfirm': {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
  };
  'ui:showModal': {
    title: string;
    content: string;
  };
  'ui:closeModal': void;

  // Navigation
  'navigation:goTo': { path: string };
  'navigation:openApp': { appId: string; params?: Record<string, string> };
  'navigation:goBack': void;

  // Events
  'events:subscribe': { eventType: string };
  'events:unsubscribe': { eventType: string };
}
