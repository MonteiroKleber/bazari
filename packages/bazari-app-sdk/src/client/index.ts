export { BazariSDK } from './sdk';
export type { BazariSDKOptions } from './sdk';

export { AuthClient } from './auth';
export { WalletClient } from './wallet';
export { StorageClient } from './storage';
export { UIClient } from './ui';
export { EventsClient } from './events';
export type { BazariEvent } from './events';
export { ContractsClient } from './contracts';
export type {
  LoyaltyConfig,
  EscrowConfig,
  RevenueShareConfig,
  DeployedContract,
  LoyaltyTier,
  LoyaltyInfo,
  EscrowInfo,
  ParticipantInfo,
} from './contracts';

// GPS & Maps
export { LocationClient } from './location';
export type {
  Coordinates,
  Position,
  PositionError,
  WatchOptions,
  DistanceResult,
} from './location';

export { MapsClient } from './maps';
export type {
  MapOptions,
  MarkerOptions,
  RouteOptions,
  RouteResult,
  MapInstance,
} from './maps';
