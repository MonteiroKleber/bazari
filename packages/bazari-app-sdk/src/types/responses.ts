/**
 * Usuário retornado pelo SDK
 */
export interface SDKUser {
  id: string;
  handle: string;
  displayName: string;
  avatar?: string;
  roles: string[];
}

/**
 * Saldo retornado pelo SDK
 */
export interface SDKBalance {
  bzr: string;
  zari: string;
  formatted: {
    bzr: string;
    zari: string;
  };
}

/**
 * Transação no histórico
 */
export interface SDKTransaction {
  id: string;
  type: 'transfer' | 'reward' | 'purchase' | 'sale';
  amount: string;
  token: 'BZR' | 'ZARI';
  from?: string;
  to?: string;
  memo?: string;
  timestamp: string;
  status: 'pending' | 'confirmed' | 'failed';
}

/**
 * Resultado de transferência
 */
export interface SDKTransferResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

/**
 * Resultado de confirmação UI
 */
export interface SDKConfirmResult {
  confirmed: boolean;
}

/**
 * Permissões do app
 */
export interface SDKPermissions {
  granted: string[];
  denied: string[];
}

/**
 * Respostas por tipo de mensagem
 */
export interface ResponseTypes {
  'auth:getCurrentUser': SDKUser;
  'auth:getPermissions': SDKPermissions;
  'wallet:getBalance': SDKBalance;
  'wallet:getHistory': SDKTransaction[];
  'wallet:requestTransfer': SDKTransferResult;
  'storage:get': unknown;
  'storage:set': void;
  'storage:remove': void;
  'storage:clear': void;
  'ui:showToast': void;
  'ui:showConfirm': SDKConfirmResult;
  'ui:showModal': void;
  'ui:closeModal': void;
  'navigation:goTo': void;
  'navigation:openApp': void;
  'navigation:goBack': void;
  'events:subscribe': void;
  'events:unsubscribe': void;
}
