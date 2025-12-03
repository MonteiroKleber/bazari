// Main SDK class
export { BazariSDK } from './client/sdk';
export type { BazariSDKOptions } from './client/sdk';

// Individual clients (for advanced usage)
export { AuthClient } from './client/auth';
export { WalletClient } from './client/wallet';
export { StorageClient } from './client/storage';
export { UIClient } from './client/ui';
export { EventsClient } from './client/events';
export type { BazariEvent } from './client/events';

// Types
export type {
  SDKUser,
  SDKBalance,
  SDKTransaction,
  SDKTransferResult,
  SDKConfirmResult,
  SDKPermissions,
} from './types/responses';

export type {
  MessageType,
  SDKMessage,
  HostResponse,
  HostEvent,
} from './types/messages';

// Utils
export { isInsideBazari } from './utils/bridge';
