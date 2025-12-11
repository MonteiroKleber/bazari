/**
 * Wallet Handlers - Handle SDK wallet-related messages
 * Provides balance queries, history, and transfer requests
 */

import { getSessionUser, isSessionActive } from '@/modules/auth/session';
import { getNativeBalance, getAssetBalance, type BalanceSnapshot } from '@/modules/wallet/services/balances';
import { fetchRecentTransfers, type TransferHistoryItem } from '@/modules/wallet/services/history';
import { getChainProps } from '@/modules/wallet/services/polkadot';
import { formatBalance } from '@/modules/wallet/utils/format';

// Asset IDs for known tokens
const ZARI_ASSET_ID = '1'; // ZARI token asset ID

export interface SDKBalance {
  /** Token symbol (e.g., 'BZR', 'ZARI') */
  symbol: string;
  /** Asset ID ('native' for BZR, '1' for ZARI, etc.) */
  assetId: string;
  /** Free balance in planck (smallest unit) */
  free: string;
  /** Reserved balance in planck */
  reserved: string;
  /** Frozen balance in planck */
  frozen: string;
  /** Number of decimals */
  decimals: number;
  /** Formatted free balance for display */
  formatted: string;
}

export interface SDKTransaction {
  id: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  amount: string;
  assetId?: string;
  direction: 'in' | 'out';
  extrinsicHash: string | null;
}

export interface TransferRequestPayload {
  to: string;
  amount: string;
  assetId?: string;
  memo?: string;
}

export interface TransferRequestResult {
  /** Whether user confirmed the transfer */
  confirmed: boolean;
  /** Transaction hash if confirmed and submitted */
  txHash?: string;
  /** Error message if failed */
  error?: string;
}

// Keep a reference to the transfer confirmation callback
let pendingTransferResolve: ((result: TransferRequestResult) => void) | null = null;
let pendingTransferData: TransferRequestPayload | null = null;

/**
 * SDK Balance response format - matches @bazari.libervia.xyz/app-sdk
 */
export interface SDKBalanceResponse {
  bzr: string;
  zari: string;
  formatted: {
    bzr: string;
    zari: string;
  };
}

/**
 * Handler for wallet:getBalance
 * Returns user's token balances in SDKBalance format
 */
export async function handleGetBalance(
  _appId: string,
  _payload: unknown
): Promise<SDKBalanceResponse> {
  if (!isSessionActive()) {
    throw new Error('User not authenticated');
  }

  const user = getSessionUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  try {
    // Get native BZR balance
    const nativeBalance = await getNativeBalance(user.address);
    const bzrFormatted = formatBalance(nativeBalance.free, nativeBalance.decimals);

    // Get ZARI balance
    const chainProps = await getChainProps();
    let zariFormatted = '0';
    let zariRaw = '0';

    try {
      const zariBalance = await getAssetBalance(ZARI_ASSET_ID, user.address, {
        assetId: ZARI_ASSET_ID,
        symbol: 'ZARI',
        decimals: chainProps.tokenDecimals,
      });

      if (zariBalance) {
        zariRaw = zariBalance.free.toString();
        zariFormatted = formatBalance(zariBalance.free, zariBalance.decimals);
      }
    } catch (e) {
      // ZARI balance fetch failed, use zero
      console.warn('[wallet-handler] Failed to get ZARI balance:', e);
    }

    return {
      bzr: nativeBalance.free.toString(),
      zari: zariRaw,
      formatted: {
        bzr: bzrFormatted,
        zari: zariFormatted,
      },
    };
  } catch (error) {
    console.error('[wallet-handler] Failed to get balance:', error);
    throw new Error('Failed to fetch balance');
  }
}

/**
 * Handler for wallet:getHistory
 * Returns recent transaction history
 */
export async function handleGetHistory(
  _appId: string,
  payload: unknown
): Promise<SDKTransaction[]> {
  if (!isSessionActive()) {
    throw new Error('User not authenticated');
  }

  const user = getSessionUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { limit = 20, fromBlock } = (payload as { limit?: number; fromBlock?: number }) || {};

  try {
    const result = await fetchRecentTransfers(user.address, {
      maxEvents: Math.min(limit, 50), // Cap at 50
      fromBlock,
    });

    return result.items.map(itemToSDKTransaction);
  } catch (error) {
    console.error('[wallet-handler] Failed to get history:', error);
    throw new Error('Failed to fetch transaction history');
  }
}

/**
 * Handler for wallet:requestTransfer
 * Initiates a transfer request that requires user confirmation
 * This opens the native transfer UI with pre-filled data
 */
export async function handleRequestTransfer(
  appId: string,
  payload: unknown
): Promise<TransferRequestResult> {
  if (!isSessionActive()) {
    throw new Error('User not authenticated');
  }

  const data = payload as TransferRequestPayload;

  if (!data.to || !data.amount) {
    throw new Error('Invalid transfer request: missing required fields');
  }

  // Store the pending transfer
  pendingTransferData = data;

  // Dispatch custom event to open transfer confirmation modal
  const event = new CustomEvent('sdk:transfer:request', {
    detail: {
      appId,
      to: data.to,
      amount: data.amount,
      assetId: data.assetId || 'native',
      memo: data.memo,
    },
  });
  window.dispatchEvent(event);

  // Return a promise that will be resolved when user confirms/rejects
  return new Promise((resolve) => {
    pendingTransferResolve = resolve;

    // Set a timeout for user response (5 minutes)
    setTimeout(() => {
      if (pendingTransferResolve === resolve) {
        pendingTransferResolve = null;
        pendingTransferData = null;
        resolve({
          confirmed: false,
          error: 'Transfer request timed out',
        });
      }
    }, 5 * 60 * 1000);
  });
}

/**
 * Called by the UI when user confirms or rejects the transfer
 */
export function resolveTransferRequest(result: TransferRequestResult): void {
  if (pendingTransferResolve) {
    pendingTransferResolve(result);
    pendingTransferResolve = null;
    pendingTransferData = null;
  }
}

/**
 * Get pending transfer data for the confirmation modal
 */
export function getPendingTransferData(): TransferRequestPayload | null {
  return pendingTransferData;
}

// Helper functions

function snapshotToSDKBalance(snapshot: BalanceSnapshot): SDKBalance {
  return {
    symbol: snapshot.symbol,
    assetId: snapshot.assetId,
    free: snapshot.free.toString(),
    reserved: snapshot.reserved.toString(),
    frozen: snapshot.frozen.toString(),
    decimals: snapshot.decimals,
    formatted: `${formatBalance(snapshot.free, snapshot.decimals)} ${snapshot.symbol}`,
  };
}

function itemToSDKTransaction(item: TransferHistoryItem): SDKTransaction {
  return {
    id: item.id,
    blockNumber: item.blockNumber,
    timestamp: item.timestamp,
    from: item.from,
    to: item.to,
    amount: item.amount.toString(),
    assetId: item.assetId,
    direction: item.direction,
    extrinsicHash: item.extrinsicHash,
  };
}
