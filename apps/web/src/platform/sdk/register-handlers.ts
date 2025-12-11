/**
 * Register SDK Handlers
 * Connects all handler implementations to the host-bridge message system
 */

import { registerHandler } from './host-bridge';

// Import all handlers
import {
  handleGetCurrentUser,
  handleGetPermissions,
} from '../handlers/auth-handler';

import {
  handleGetBalance,
  handleGetHistory,
  handleRequestTransfer,
} from '../handlers/wallet-handler';

import {
  handleStorageGet,
  handleStorageSet,
  handleStorageRemove,
  handleStorageClear,
  handleStorageKeys,
} from '../handlers/storage-handler';

import {
  handleShowToast,
  handleShowConfirm,
  handleShowModal,
  handleCloseModal,
} from '../handlers/ui-handler';

import {
  handleDeployLoyalty,
  handleDeployEscrow,
  handleDeployRevenueSplit,
  handleListContracts,
  handleLoyaltyIssuePoints,
  handleLoyaltyBalanceOf,
  handleEscrowGetStatus,
  handleEscrowFund,
  handleEscrowRelease,
} from '../handlers/contracts-handler';

/**
 * Register all SDK message handlers
 * Should be called once during app initialization
 */
export function registerSDKHandlers(): void {
  console.log('[SDK] Registering handlers...');

  // Auth handlers
  registerHandler('auth:getCurrentUser', handleGetCurrentUser);
  registerHandler('auth:getPermissions', handleGetPermissions);

  // Wallet handlers
  registerHandler('wallet:getBalance', handleGetBalance);
  registerHandler('wallet:getHistory', handleGetHistory);
  registerHandler('wallet:requestTransfer', handleRequestTransfer);

  // Storage handlers
  registerHandler('storage:get', handleStorageGet);
  registerHandler('storage:set', handleStorageSet);
  registerHandler('storage:remove', handleStorageRemove);
  registerHandler('storage:clear', handleStorageClear);
  // Also register storage:keys which uses the same pattern
  registerHandler('storage:keys' as any, handleStorageKeys);

  // UI handlers
  registerHandler('ui:showToast', handleShowToast);
  registerHandler('ui:showConfirm', handleShowConfirm);
  registerHandler('ui:showModal', handleShowModal);
  registerHandler('ui:closeModal', handleCloseModal);

  // Contracts handlers - deployment
  registerHandler('contracts:deployLoyalty', handleDeployLoyalty);
  registerHandler('contracts:deployEscrow', handleDeployEscrow);
  registerHandler('contracts:deployRevenueSplit', handleDeployRevenueSplit);
  registerHandler('contracts:list', handleListContracts);

  // Contracts handlers - loyalty operations
  registerHandler('contracts:loyalty:issuePoints', handleLoyaltyIssuePoints);
  registerHandler('contracts:loyalty:balanceOf', handleLoyaltyBalanceOf);

  // Contracts handlers - escrow operations
  registerHandler('contracts:escrow:getStatus', handleEscrowGetStatus);
  registerHandler('contracts:escrow:fund', handleEscrowFund);
  registerHandler('contracts:escrow:release', handleEscrowRelease);

  console.log('[SDK] All handlers registered');
}

/**
 * Check if handlers are registered
 */
let handlersRegistered = false;

export function ensureHandlersRegistered(): void {
  if (!handlersRegistered) {
    registerSDKHandlers();
    handlersRegistered = true;
  }
}
