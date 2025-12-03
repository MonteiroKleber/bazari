import { useBlockchainQuery } from '../useBlockchainQuery';
import { useBlockchainTx } from '../useBlockchainTx';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../modules/auth/context';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { getActiveAccount, decryptMnemonic } from '../../modules/auth';
import { getApi } from '../../modules/wallet/services/polkadot';
import { useChainProps } from '../../modules/wallet/hooks/useChainProps';
import { PinService } from '../../modules/wallet/pin/PinService';
import { ordersApi } from '../../modules/orders/api';

/**
 * useEscrow - Complete blockchain hooks for Bazari Escrow system
 *
 * Provides 4 hooks for interacting with the bazari-escrow pallet:
 * - useEscrowDetails(orderId) - Query escrow state from blockchain
 * - useReleaseFunds() - Mutation: buyer releases funds to seller
 * - useRefundBuyer() - Mutation: DAO refunds buyer
 * - useEscrowEvents() - WebSocket listener for real-time updates
 */

/**
 * Escrow state enum matching blockchain pallet
 */
export enum EscrowState {
  Active = 'Active',
  Released = 'Released',
  Refunded = 'Refunded',
  Disputed = 'Disputed',
}

/**
 * Escrow details from blockchain
 */
export interface EscrowDetails {
  orderId: string;
  buyer: string;
  seller: string;
  amount: string; // Raw amount (planck units)
  amountFormatted: string; // Human-readable BZR amount
  state: EscrowState;
  createdAt: number; // Block number
  autoReleaseAt: number; // Block number (createdAt + dynamic blocks based on delivery)
  autoReleaseBlocks?: number; // PROPOSAL-001: Dynamic blocks based on delivery estimate
  releasedAt?: number; // Block number (if released)
  refundedAt?: number; // Block number (if refunded)
  // PROPOSAL-001: Delivery info
  estimatedDeliveryDays?: number;
  shippingMethod?: string;
  dispute?: {
    initiatedBy: string;
    reason: string;
    initiatedAt: number;
  };
}

/**
 * Escrow event from blockchain
 */
export interface EscrowEvent {
  type: 'Created' | 'Released' | 'Refunded' | 'Disputed' | 'AutoReleased';
  orderId: string;
  timestamp: number;
  blockNumber: number;
  data: Record<string, any>;
}

/**
 * Hook 1: Get escrow details for an order
 *
 * Queries the bazari-escrow pallet storage for the order's escrow state.
 * Returns null if no escrow exists for this order.
 *
 * @param orderId - The order ID to query (format: "ORD-123")
 * @returns Escrow details or null if not found
 *
 * @example
 * const { data: escrow, isLoading } = useEscrowDetails("ORD-123");
 * if (escrow?.state === EscrowState.Active) {
 *   // Show release/refund buttons
 * }
 */
export function useEscrowDetails(orderId?: string) {
  return useBlockchainQuery<EscrowDetails | null>({
    endpoint: `/api/blockchain/escrow/${orderId}`,
    enabled: !!orderId,
    refetchInterval: 10000, // 10 seconds (real-time updates)
  });
}

/**
 * Hook 2: Release funds to seller (Buyer action)
 *
 * Submits extrinsic: bazariEscrow.releaseFunds(orderId)
 * Only succeeds if:
 * - Caller is the buyer
 * - Escrow state is Active
 *
 * @returns Mutation function and state
 *
 * @example
 * const { releaseFunds, isLoading, error } = useReleaseFunds();
 *
 * const handleRelease = async () => {
 *   try {
 *     const result = await releaseFunds("ORD-123");
 *     console.log('Funds released:', result);
 *   } catch (error) {
 *     console.error('Failed to release:', error);
 *   }
 * };
 */
export function useReleaseFunds() {
  const { sendTx, ...rest } = useBlockchainTx({
    onSuccess: (data) => {
      console.log('[useReleaseFunds] Funds released successfully:', data);
    },
    onError: (error) => {
      console.error('[useReleaseFunds] Failed to release funds:', error);
    },
  });

  const releaseFunds = async (orderId: string) => {
    return sendTx({
      endpoint: `/api/blockchain/escrow/${orderId}/release`,
      method: 'POST',
    });
  };

  return {
    releaseFunds,
    ...rest,
  };
}

/**
 * Hook 3: Refund buyer (DAO action)
 *
 * Submits extrinsic: bazariEscrow.refundBuyer(orderId)
 * Only succeeds if:
 * - Caller is DAO member
 * - Escrow state is Active or Disputed
 *
 * @returns Mutation function and state
 *
 * @example
 * const { refundBuyer, isLoading, error } = useRefundBuyer();
 *
 * const handleRefund = async () => {
 *   try {
 *     const result = await refundBuyer("ORD-123");
 *     console.log('Buyer refunded:', result);
 *   } catch (error) {
 *     console.error('Failed to refund:', error);
 *   }
 * };
 */
export function useRefundBuyer() {
  const { sendTx, ...rest } = useBlockchainTx({
    onSuccess: (data) => {
      console.log('[useRefundBuyer] Buyer refunded successfully:', data);
    },
    onError: (error) => {
      console.error('[useRefundBuyer] Failed to refund buyer:', error);
    },
  });

  const refundBuyer = async (orderId: string) => {
    return sendTx({
      endpoint: `/api/blockchain/escrow/${orderId}/refund`,
      method: 'POST',
    });
  };

  return {
    refundBuyer,
    ...rest,
  };
}

/**
 * Hook 4: Listen to escrow events (WebSocket)
 *
 * Subscribes to blockchain events for real-time escrow updates.
 * Events: EscrowCreated, FundsReleased, BuyerRefunded, DisputeInitiated, AutoReleased
 *
 * @param orderId - Optional: filter events for specific order
 * @returns Array of escrow events
 *
 * @example
 * const events = useEscrowEvents("ORD-123");
 * useEffect(() => {
 *   if (events.some(e => e.type === 'Released')) {
 *     toast.success('Funds released!');
 *   }
 * }, [events]);
 */
export function useEscrowEvents(orderId?: string) {
  const [events, setEvents] = useState<EscrowEvent[]>([]);

  useEffect(() => {
    // Connect to WebSocket for real-time events
    const ws = new WebSocket(
      `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/blockchain/escrow/events`
    );

    ws.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as EscrowEvent;

        // Filter by orderId if provided
        if (orderId && event.orderId !== orderId) {
          return;
        }

        setEvents((prev) => [...prev, event]);
      } catch (error) {
        console.error('[useEscrowEvents] Failed to parse event:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[useEscrowEvents] WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [orderId]);

  return events;
}

/**
 * Hook 5: Get all active escrows (Admin/DAO view)
 *
 * Queries all escrows with state = Active.
 * Useful for admin dashboard showing all pending escrows.
 *
 * @returns Array of active escrows
 *
 * @example
 * const { data: activeEscrows, isLoading } = useActiveEscrows();
 */
export function useActiveEscrows() {
  return useBlockchainQuery<EscrowDetails[]>({
    endpoint: '/api/blockchain/escrow/active',
    refetchInterval: 30000, // 30 seconds
  });
}

/**
 * Hook 6: Get escrows near auto-release (Admin view)
 *
 * Returns escrows that will auto-release in less than 24 hours.
 * Useful for DAO members to monitor urgent cases.
 *
 * @returns Array of escrows near auto-release
 *
 * @example
 * const { data: urgentEscrows } = useEscrowsNearAutoRelease();
 */
export function useEscrowsNearAutoRelease() {
  return useBlockchainQuery<EscrowDetails[]>({
    endpoint: '/api/blockchain/escrow/near-auto-release',
    refetchInterval: 60000, // 1 minute
  });
}

/**
 * Hook 7: Get user's escrow history
 *
 * Returns all escrows where user is buyer or seller.
 * Includes completed (Released/Refunded) escrows.
 *
 * @param userAddress - Blockchain address (optional, defaults to current user)
 * @returns Array of user's escrows
 *
 * @example
 * const { data: myEscrows } = useUserEscrows();
 */
export function useUserEscrows(userAddress?: string) {
  return useBlockchainQuery<EscrowDetails[]>({
    endpoint: '/api/blockchain/escrow/user',
    params: userAddress ? { address: userAddress } : undefined,
    refetchInterval: 30000, // 30 seconds
  });
}

/**
 * Hook 8: Initiate dispute (Buyer/Seller action)
 *
 * Submits extrinsic: bazariEscrow.initiateDispute(orderId, reason)
 * Changes escrow state to Disputed, requiring DAO intervention.
 *
 * @returns Mutation function and state
 *
 * @example
 * const { initiateDispute, isLoading } = useInitiateDispute();
 *
 * const handleDispute = async () => {
 *   await initiateDispute("ORD-123", "Product not as described");
 * };
 */
export function useInitiateDispute() {
  const { sendTx, ...rest } = useBlockchainTx({
    onSuccess: (data) => {
      console.log('[useInitiateDispute] Dispute initiated successfully:', data);
    },
    onError: (error) => {
      console.error('[useInitiateDispute] Failed to initiate dispute:', error);
    },
  });

  const initiateDispute = async (orderId: string, reason: string) => {
    return sendTx({
      endpoint: `/api/blockchain/escrow/${orderId}/dispute`,
      method: 'POST',
      data: { reason },
    });
  };

  return {
    initiateDispute,
    ...rest,
  };
}

/**
 * Helper: Calculate remaining blocks until auto-release
 *
 * @param escrow - Escrow details
 * @param currentBlock - Current block number
 * @returns Remaining blocks (0 if expired)
 */
export function calculateRemainingBlocks(
  escrow: EscrowDetails,
  currentBlock: number
): number {
  if (escrow.state !== EscrowState.Active) {
    return 0;
  }

  const remaining = escrow.autoReleaseAt - currentBlock;
  return remaining > 0 ? remaining : 0;
}

/**
 * Helper: Convert blocks to time (seconds)
 *
 * Bazari chain: 6 seconds per block
 *
 * @param blocks - Number of blocks
 * @returns Seconds
 */
export function blocksToSeconds(blocks: number): number {
  return blocks * 6;
}

/**
 * Helper: Calculate auto-release timestamp
 *
 * @param escrow - Escrow details
 * @param currentBlock - Current block number
 * @returns Unix timestamp (milliseconds)
 */
export function calculateAutoReleaseTimestamp(
  escrow: EscrowDetails,
  currentBlock: number
): number {
  const remainingBlocks = calculateRemainingBlocks(escrow, currentBlock);
  const remainingSeconds = blocksToSeconds(remainingBlocks);
  return Date.now() + remainingSeconds * 1000;
}

// ============================================================================
// FASE 6 - Novos hooks com pattern prepare+sign
// ============================================================================

/**
 * Prepared call data returned by /prepare-release and /prepare-refund
 */
export interface PreparedCall {
  orderId: string;
  buyer: string;
  seller: string;
  amount: string;
  callHex: string;
  callHash: string;
  method: string;
  signerAddress: string;
  signerRole: 'buyer' | 'seller' | 'dao';
  requiresOrigin?: string;
  note?: string;
}

/**
 * Hook 9: Prepare release for frontend signing (FASE 6 - NEW)
 *
 * Fetches prepared transaction data from backend, then allows frontend
 * to sign using the app's own signer (PIN + encrypted mnemonic).
 *
 * @example
 * const { prepareRelease, signAndSend, callData, isLoading, error } = usePrepareRelease();
 *
 * const handleRelease = async () => {
 *   const prepared = await prepareRelease(orderId);
 *   if (prepared) {
 *     const result = await signAndSend(prepared);
 *     if (result.success) {
 *       toast.success('Funds released!');
 *     }
 *   }
 * };
 */
export function usePrepareRelease() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callData, setCallData] = useState<PreparedCall | null>(null);
  const { token } = useAuth();
  const chainProps = useChainProps();

  const prepareRelease = useCallback(async (orderId: string): Promise<PreparedCall | null> => {
    setIsPreparing(true);
    setError(null);

    try {
      const response = await fetch(`/api/blockchain/escrow/${orderId}/prepare-release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}), // Empty body required by Fastify
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || 'Failed to prepare release');
      }

      const data = await response.json();
      setCallData(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setIsPreparing(false);
    }
  }, [token]);

  const signAndSend = useCallback(async (prepared: PreparedCall): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    setIsSigning(true);
    setIsLoading(true);
    setError(null);

    try {
      // Get account from IndexedDB
      const account = await getActiveAccount();
      if (!account) {
        throw new Error('Conta não encontrada. Faça login novamente.');
      }

      // Request PIN from user via PinService modal
      const pin = await PinService.getPin({
        title: 'Confirmar Liberação',
        description: 'Digite o PIN para liberar os fundos ao vendedor',
        transaction: {
          type: 'escrow_release',
          description: 'Liberar fundos do escrow',
          amount: `${prepared.amount} planck`,
        },
        validate: async (p) => {
          try {
            await decryptMnemonic(account.cipher, account.iv, account.salt, p, account.authTag, account.iterations);
            return null;
          } catch {
            return 'PIN inválido';
          }
        },
      });

      // Decrypt mnemonic with PIN
      let mnemonic = await decryptMnemonic(
        account.cipher,
        account.iv,
        account.salt,
        pin,
        account.authTag,
        account.iterations
      );

      // Create keypair
      await cryptoWaitReady();
      const ss58 = chainProps?.props?.ss58Prefix ?? 42;
      const keyring = new Keyring({ type: 'sr25519', ss58Format: ss58 });
      const pair = keyring.addFromMnemonic(mnemonic);
      mnemonic = ''; // Clear from memory

      // Get API and create transaction from callHex
      const api = await getApi();
      const tx = api.tx(prepared.callHex);

      // Sign and send
      return new Promise((resolve) => {
        tx.signAndSend(pair, async ({ status, dispatchError }) => {
          if (status.isInBlock || status.isFinalized) {
            // Cleanup keypair
            try {
              pair.lock();
              keyring.removePair(pair.address);
            } catch {}

            // Check for dispatch error
            if (dispatchError) {
              let errorMessage = 'Transaction failed';
              if (dispatchError.isModule) {
                const decoded = api.registry.findMetaError(dispatchError.asModule);
                errorMessage = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
              }
              setError(errorMessage);
              resolve({ success: false, error: errorMessage });
            } else {
              const txHash = tx.hash.toHex();
              const blockNumber = status.isFinalized
                ? status.asFinalized?.toString()
                : status.asInBlock?.toString();

              // Confirm release with backend to update DB status
              try {
                await ordersApi.confirmRelease(prepared.orderId, txHash, blockNumber);
                console.log('[usePrepareRelease] Release confirmed with backend:', { orderId: prepared.orderId, txHash });
              } catch (confirmErr) {
                // Log but don't fail - the on-chain state is the source of truth
                console.warn('[usePrepareRelease] Failed to confirm release with backend:', confirmErr);
              }

              resolve({ success: true, txHash });
            }
          }
        }).catch((err: Error) => {
          // Cleanup keypair on error
          try {
            pair.lock();
            keyring.removePair(pair.address);
          } catch {}
          const message = err instanceof Error ? err.message : 'Transaction failed';
          setError(message);
          resolve({ success: false, error: message });
        });
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsSigning(false);
      setIsLoading(false);
    }
  }, [chainProps]);

  return {
    prepareRelease,
    signAndSend,
    callData,
    isLoading,
    isPreparing,
    isSigning,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Hook 10: Prepare refund for DAO signing (FASE 6 - NEW)
 *
 * Similar to usePrepareRelease but for DAO members initiating refunds.
 * Uses the app's own signer (PIN + encrypted mnemonic).
 * Note: Refund requires DAOOrigin, so this may need council multisig.
 *
 * @example
 * const { prepareRefund, signAndSend, callData, isLoading, error } = usePrepareRefund();
 *
 * const handleRefund = async () => {
 *   const prepared = await prepareRefund(orderId);
 *   if (prepared) {
 *     // Note: This call requires DAOOrigin
 *     // May need to be wrapped in multisig or sudo
 *     const result = await signAndSend(prepared);
 *   }
 * };
 */
export function usePrepareRefund() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callData, setCallData] = useState<PreparedCall | null>(null);
  const { token } = useAuth();
  const chainProps = useChainProps();

  const prepareRefund = useCallback(async (orderId: string): Promise<PreparedCall | null> => {
    setIsPreparing(true);
    setError(null);

    try {
      const response = await fetch(`/api/blockchain/escrow/${orderId}/prepare-refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}), // Empty body required by Fastify
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || 'Failed to prepare refund');
      }

      const data = await response.json();
      setCallData(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setIsPreparing(false);
    }
  }, [token]);

  const signAndSend = useCallback(async (prepared: PreparedCall): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    setIsSigning(true);
    setIsLoading(true);
    setError(null);

    try {
      // Get account from IndexedDB
      const account = await getActiveAccount();
      if (!account) {
        throw new Error('Conta não encontrada. Faça login novamente.');
      }

      // Request PIN from user via PinService modal
      const pin = await PinService.getPin({
        title: 'Confirmar Reembolso',
        description: 'Digite o PIN para reembolsar o comprador',
        transaction: {
          type: 'escrow_refund',
          description: 'Reembolsar fundos do escrow',
          amount: `${prepared.amount} planck`,
        },
        validate: async (p) => {
          try {
            await decryptMnemonic(account.cipher, account.iv, account.salt, p, account.authTag, account.iterations);
            return null;
          } catch {
            return 'PIN inválido';
          }
        },
      });

      // Decrypt mnemonic with PIN
      let mnemonic = await decryptMnemonic(
        account.cipher,
        account.iv,
        account.salt,
        pin,
        account.authTag,
        account.iterations
      );

      // Create keypair
      await cryptoWaitReady();
      const ss58 = chainProps?.props?.ss58Prefix ?? 42;
      const keyring = new Keyring({ type: 'sr25519', ss58Format: ss58 });
      const pair = keyring.addFromMnemonic(mnemonic);
      mnemonic = ''; // Clear from memory

      // Get API and create transaction from callHex
      // Note: For refund, this may fail if not called with DAOOrigin
      const api = await getApi();
      const tx = api.tx(prepared.callHex);

      // Sign and send
      return new Promise((resolve) => {
        tx.signAndSend(pair, ({ status, dispatchError }) => {
          if (status.isInBlock || status.isFinalized) {
            // Cleanup keypair
            try {
              pair.lock();
              keyring.removePair(pair.address);
            } catch {}

            // Check for dispatch error
            if (dispatchError) {
              let errorMessage = 'Transaction failed';
              if (dispatchError.isModule) {
                const decoded = api.registry.findMetaError(dispatchError.asModule);
                errorMessage = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
                // Check for BadOrigin specifically
                if (decoded.name === 'BadOrigin') {
                  errorMessage = 'Refund requires DAOOrigin. Please use council multisig or sudo.';
                }
              }
              setError(errorMessage);
              resolve({ success: false, error: errorMessage });
            } else {
              const txHash = tx.hash.toHex();
              resolve({ success: true, txHash });
            }
          }
        }).catch((err: Error) => {
          // Cleanup keypair on error
          try {
            pair.lock();
            keyring.removePair(pair.address);
          } catch {}
          const message = err instanceof Error ? err.message : 'Transaction failed';
          setError(message);
          resolve({ success: false, error: message });
        });
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsSigning(false);
      setIsLoading(false);
    }
  }, [chainProps]);

  return {
    prepareRefund,
    signAndSend,
    callData,
    isLoading,
    isPreparing,
    isSigning,
    error,
    clearError: () => setError(null),
    // Additional info for UI
    requiresDAOOrigin: true,
  };
}

// ============================================================================
// PROPOSAL-003: Multi-Store Checkout - Batch Escrow Lock
// ============================================================================

/**
 * Prepared batch call data for multiple escrow locks
 */
export interface PreparedBatchLock {
  checkoutSessionId: string;
  orders: Array<{
    orderId: string;
    seller: string;
    amount: string;
    callHex: string;
  }>;
  batchCallHex: string; // utility.batchAll([lock1, lock2, ...])
  totalAmount: string;
  buyer: string;
}

/**
 * Batch escrow lock result
 */
export interface BatchLockResult {
  success: boolean;
  txHash?: string;
  blockNumber?: string;
  failedOrders?: string[];
  error?: string;
}

/**
 * Hook 11: Batch escrow lock for multi-store checkout (PROPOSAL-003)
 *
 * Creates multiple escrow locks in a single atomic transaction using
 * utility.batchAll. If any lock fails, all locks are reverted.
 *
 * Flow:
 * 1. Frontend calls POST /orders/multi to create orders (status: CREATED)
 * 2. Backend returns checkoutSessionId + orderIds
 * 3. Frontend calls prepareBatchLock(checkoutSessionId)
 * 4. Backend prepares utility.batchAll with all lock extrinsics
 * 5. Frontend signs with PIN and broadcasts
 * 6. On success, backend updates all orders to ESCROWED
 *
 * @example
 * const { prepareBatchLock, signAndSendBatch, isLoading, error } = useBatchEscrowLock();
 *
 * const handlePayment = async (checkoutSessionId: string) => {
 *   const prepared = await prepareBatchLock(checkoutSessionId);
 *   if (prepared) {
 *     const result = await signAndSendBatch(prepared);
 *     if (result.success) {
 *       toast.success('Payment completed for all orders!');
 *     }
 *   }
 * };
 */
export function useBatchEscrowLock() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchData, setBatchData] = useState<PreparedBatchLock | null>(null);
  const { token } = useAuth();
  const chainProps = useChainProps();

  /**
   * Prepare batch lock for all orders in a checkout session
   */
  const prepareBatchLock = useCallback(async (checkoutSessionId: string): Promise<PreparedBatchLock | null> => {
    setIsPreparing(true);
    setError(null);

    try {
      const response = await fetch(`/api/blockchain/escrow/batch/prepare-lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ checkoutSessionId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || 'Failed to prepare batch lock');
      }

      const data = await response.json();
      setBatchData(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setIsPreparing(false);
    }
  }, [token]);

  /**
   * Sign and send the batch lock transaction
   */
  const signAndSendBatch = useCallback(async (prepared: PreparedBatchLock): Promise<BatchLockResult> => {
    setIsSigning(true);
    setIsLoading(true);
    setError(null);

    try {
      // Get account from IndexedDB
      const account = await getActiveAccount();
      if (!account) {
        throw new Error('Conta não encontrada. Faça login novamente.');
      }

      // Format total amount for display
      const totalBzr = (Number(prepared.totalAmount) / 1e12).toFixed(2);

      // Request PIN from user via PinService modal
      const pin = await PinService.getPin({
        title: 'Confirmar Pagamento',
        description: `Digite o PIN para bloquear ${totalBzr} BZR em ${prepared.orders.length} pedidos`,
        transaction: {
          type: 'batch_escrow_lock',
          description: `Bloquear fundos em ${prepared.orders.length} escrows`,
          amount: `${totalBzr} BZR`,
        },
        validate: async (p) => {
          try {
            await decryptMnemonic(account.cipher, account.iv, account.salt, p, account.authTag, account.iterations);
            return null;
          } catch {
            return 'PIN inválido';
          }
        },
      });

      // Decrypt mnemonic with PIN
      let mnemonic = await decryptMnemonic(
        account.cipher,
        account.iv,
        account.salt,
        pin,
        account.authTag,
        account.iterations
      );

      // Create keypair
      await cryptoWaitReady();
      const ss58 = chainProps?.props?.ss58Prefix ?? 42;
      const keyring = new Keyring({ type: 'sr25519', ss58Format: ss58 });
      const pair = keyring.addFromMnemonic(mnemonic);
      mnemonic = ''; // Clear from memory

      // Get API and create batch transaction
      const api = await getApi();
      const tx = api.tx(prepared.batchCallHex);

      // Sign and send
      return new Promise((resolve) => {
        tx.signAndSend(pair, async ({ status, dispatchError, events }) => {
          if (status.isInBlock || status.isFinalized) {
            // Cleanup keypair
            try {
              pair.lock();
              keyring.removePair(pair.address);
            } catch {}

            // Check for dispatch error (batch-level failure)
            if (dispatchError) {
              let errorMessage = 'Batch transaction failed';
              if (dispatchError.isModule) {
                const decoded = api.registry.findMetaError(dispatchError.asModule);
                errorMessage = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
              }
              setError(errorMessage);
              resolve({ success: false, error: errorMessage });
              return;
            }

            // Check for individual failures in batch (utility.BatchInterrupted)
            const failedOrders: string[] = [];
            events.forEach(({ event }) => {
              if (api.events.utility.BatchInterrupted.is(event)) {
                // Some calls in batch failed - event.data[0] is the failed index
                const indexData = event.data[0] as any;
                const indexNum = typeof indexData?.toNumber === 'function'
                  ? indexData.toNumber()
                  : Number(String(indexData));
                if (prepared.orders[indexNum]) {
                  failedOrders.push(prepared.orders[indexNum].orderId);
                }
              }
            });

            if (failedOrders.length > 0) {
              const errorMsg = `Some orders failed: ${failedOrders.join(', ')}`;
              setError(errorMsg);
              resolve({ success: false, failedOrders, error: errorMsg });
              return;
            }

            // All succeeded!
            const txHash = tx.hash.toHex();
            const blockNumber = status.isFinalized
              ? status.asFinalized?.toString()
              : status.asInBlock?.toString();

            // Confirm batch lock with backend to update DB status
            try {
              await fetch(`/api/blockchain/escrow/batch/confirm-lock`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                  checkoutSessionId: prepared.checkoutSessionId,
                  txHash,
                  blockNumber,
                }),
              });
              console.log('[useBatchEscrowLock] Batch lock confirmed with backend:', {
                checkoutSessionId: prepared.checkoutSessionId,
                txHash,
                orderCount: prepared.orders.length,
              });
            } catch (confirmErr) {
              // Log but don't fail - the on-chain state is the source of truth
              console.warn('[useBatchEscrowLock] Failed to confirm batch lock with backend:', confirmErr);
            }

            resolve({ success: true, txHash, blockNumber });
          }
        }).catch((err: Error) => {
          // Cleanup keypair on error
          try {
            pair.lock();
            keyring.removePair(pair.address);
          } catch {}
          const message = err instanceof Error ? err.message : 'Transaction failed';
          setError(message);
          resolve({ success: false, error: message });
        });
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsSigning(false);
      setIsLoading(false);
    }
  }, [token, chainProps]);

  return {
    prepareBatchLock,
    signAndSendBatch,
    batchData,
    isLoading,
    isPreparing,
    isSigning,
    error,
    clearError: () => setError(null),
  };
}
