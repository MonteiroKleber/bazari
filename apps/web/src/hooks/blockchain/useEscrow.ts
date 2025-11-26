import { useBlockchainQuery } from '../useBlockchainQuery';
import { useBlockchainTx } from '../useBlockchainTx';
import { useEffect, useState } from 'react';

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
  autoReleaseAt: number; // Block number (createdAt + 100,800 blocks = 7 days)
  releasedAt?: number; // Block number (if released)
  refundedAt?: number; // Block number (if refunded)
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
