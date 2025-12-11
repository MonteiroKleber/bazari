// Location handlers
export { LocationHandler } from './location-handler';
export type { Coordinates, Position } from './location-handler';

// Maps handlers
export { MapsHandler } from './maps-handler';
export type {
  MapOptions,
  MarkerOptions,
  RouteOptions,
  RouteResult,
} from './maps-handler';

// Auth handlers
export {
  handleGetCurrentUser,
  handleGetPermissions,
} from './auth-handler';
export type { SDKUser, SDKPermissions } from './auth-handler';

// Wallet handlers
export {
  handleGetBalance,
  handleGetHistory,
  handleRequestTransfer,
  resolveTransferRequest,
  getPendingTransferData,
} from './wallet-handler';
export type {
  SDKBalance,
  SDKTransaction,
  TransferRequestPayload,
  TransferRequestResult,
} from './wallet-handler';

// Storage handlers
export {
  handleStorageGet,
  handleStorageSet,
  handleStorageRemove,
  handleStorageClear,
  handleStorageKeys,
  getAppStorageUsage,
} from './storage-handler';

// UI handlers
export {
  handleShowToast,
  handleShowConfirm,
  handleShowModal,
  handleCloseModal,
  resolveConfirmDialog,
  onModalClosed,
  getActiveModals,
  closeAllModalsForApp,
} from './ui-handler';
export type {
  ToastPayload,
  ConfirmPayload,
  ConfirmResult,
  ModalPayload,
  ModalResult,
} from './ui-handler';

// Contracts handlers
export {
  handleDeployLoyalty,
  handleDeployEscrow,
  handleDeployRevenueSplit,
  handleListContracts,
  handleLoyaltyIssuePoints,
  handleLoyaltyBalanceOf,
  handleEscrowGetStatus,
  handleEscrowFund,
  handleEscrowRelease,
  resolveDeployment,
  rejectDeployment,
  getPendingDeployment,
} from './contracts-handler';
export type {
  LoyaltyConfig,
  LoyaltyTier,
  EscrowConfig,
  RevenueShareConfig,
  ParticipantShare,
  DeployedContract,
} from './contracts-handler';
