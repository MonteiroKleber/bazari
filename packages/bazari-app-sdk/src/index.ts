// Main SDK class
export { BazariSDK } from './client/sdk';
export type { BazariSDKOptions } from './client/sdk';

// Individual clients (for advanced usage)
export { AuthClient } from './client/auth';
export { WalletClient } from './client/wallet';
export { StorageClient } from './client/storage';
export { UIClient } from './client/ui';
export { EventsClient } from './client/events';
export { ContractsClient } from './client/contracts';
export { LocationClient } from './client/location';
export { MapsClient } from './client/maps';
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

// Contract types
export type {
  LoyaltyConfig,
  EscrowConfig,
  RevenueShareConfig,
  DeployedContract,
  LoyaltyTier,
  LoyaltyInfo,
  EscrowInfo,
  ParticipantInfo,
} from './client/contracts';

// Location types
export type {
  Position,
  Coordinates,
  DistanceResult,
  WatchOptions,
  PositionError,
} from './client/location';

// Utils
export { isInsideBazari, getSDKVersion, getAllowedOrigins } from './utils/bridge';
