import { useBlockchainQuery } from '../useBlockchainQuery';
import { useState, useCallback } from 'react';
import { api } from '../../lib/api';

/**
 * useDispute - Complete blockchain hooks for Bazari Dispute system
 *
 * Provides hooks for interacting with the bazari-dispute pallet:
 * - useDisputes() - List all disputes
 * - useDispute(disputeId) - Get dispute details
 * - useMyDisputes() - Get user's disputes (as plaintiff, defendant, or juror)
 * - useJuryDisputes() - Get disputes where user is a juror
 * - usePrepareOpenDispute() - Prepare dispute opening transaction
 * - usePrepareCommitVote() - Prepare commit vote transaction
 * - usePrepareRevealVote() - Prepare reveal vote transaction
 * - usePrepareExecuteRuling() - Prepare ruling execution transaction
 * - useDisputeCountdown() - Calculate time remaining in phases
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Dispute status enum matching blockchain pallet
 */
export enum DisputeStatus {
  Open = 'Open',
  JurorsSelected = 'JurorsSelected',
  CommitPhase = 'CommitPhase',
  RevealPhase = 'RevealPhase',
  Resolved = 'Resolved',
}

/**
 * Ruling outcomes
 */
export enum Ruling {
  RefundBuyer = 'RefundBuyer',
  ReleaseSeller = 'ReleaseSeller',
  PartialRefund = 'PartialRefund',
}

/**
 * Vote options for jurors
 */
export type VoteOption = 'RefundBuyer' | 'ReleaseSeller';

/**
 * Full dispute details from blockchain
 */
export interface Dispute {
  disputeId: number;
  orderId: number;
  plaintiff: string;
  defendant: string;
  jurors: string[];
  evidenceCid: string;
  status: DisputeStatus | string;
  ruling: Ruling | string | null;
  createdAt: number; // Block number
  commitDeadline: number; // Block number
  revealDeadline: number; // Block number
  currentBlock: number;
  // Calculated fields
  isInCommitPhase: boolean;
  isInRevealPhase: boolean;
  canExecuteRuling: boolean;
  // Votes info
  votes: { juror: string; vote: string }[];
  commitStatus: { juror: string; committed: boolean; revealed: boolean }[];
  votesCount: number;
  quorumReached: boolean;
}

/**
 * Summary of user's dispute
 */
export interface MyDispute {
  disputeId: number;
  orderId: number;
  status: string;
  ruling: string | null;
  role: 'plaintiff' | 'defendant' | 'juror';
  createdAt: number;
}

/**
 * Dispute where user is a juror
 */
export interface JuryDispute {
  disputeId: number;
  orderId: number;
  status: string;
  commitDeadline: number;
  revealDeadline: number;
  hasCommitted: boolean;
  hasRevealed: boolean;
  needsCommit: boolean;
  needsReveal: boolean;
}

/**
 * Prepared transaction response
 */
export interface PreparedDisputeCall {
  disputeId?: number;
  orderId?: string;
  callHex: string;
  callHash: string;
  method: string;
  signerAddress: string;
  signerRole?: string;
  warning?: string;
  note?: string;
}

/**
 * Countdown info for dispute phases
 */
export interface DisputeCountdown {
  phase: 'commit' | 'reveal' | 'ended';
  blocksRemaining: number;
  secondsRemaining: number;
  deadline: number;
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * List all disputes
 */
export function useDisputes() {
  return useBlockchainQuery<{ disputes: Dispute[]; count: number }>({
    endpoint: '/api/blockchain/disputes',
    refetchInterval: 30000, // 30s
  });
}

/**
 * Get dispute details by ID
 */
export function useDispute(disputeId: number | undefined) {
  return useBlockchainQuery<Dispute>({
    endpoint: `/api/blockchain/disputes/${disputeId}`,
    enabled: disputeId !== undefined,
    refetchInterval: 10000, // 10s - more frequent for following phases
  });
}

/**
 * Get dispute by order ID
 */
export function useDisputeByOrder(orderId: string | undefined) {
  return useBlockchainQuery<Dispute>({
    endpoint: `/api/blockchain/disputes/order/${orderId}`,
    enabled: !!orderId,
    refetchInterval: 10000,
  });
}

/**
 * Get user's disputes (as plaintiff, defendant, or juror)
 */
export function useMyDisputes() {
  return useBlockchainQuery<{ disputes: MyDispute[]; count: number }>({
    endpoint: '/api/blockchain/disputes/my',
    refetchInterval: 30000,
  });
}

/**
 * Get disputes where user is a juror
 */
export function useJuryDisputes() {
  return useBlockchainQuery<{
    disputes: JuryDispute[];
    count: number;
    pendingActions: number;
  }>({
    endpoint: '/api/blockchain/disputes/jury',
    refetchInterval: 30000,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Prepare opening a dispute
 */
export function usePrepareOpenDispute() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const prepareOpenDispute = useCallback(
    async (orderId: string, evidenceCid: string): Promise<PreparedDisputeCall> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await api.post<PreparedDisputeCall>(
          '/api/blockchain/disputes/prepare-open',
          { orderId, evidenceCid }
        );
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to prepare dispute');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    prepareOpenDispute,
    isLoading,
    error,
  };
}

/**
 * Prepare commit vote (juror action)
 */
export function usePrepareCommitVote() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const prepareCommitVote = useCallback(
    async (
      disputeId: number,
      vote: VoteOption,
      salt: string
    ): Promise<PreparedDisputeCall & { vote: VoteOption; salt: string; commitHash: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await api.post<
          PreparedDisputeCall & { vote: VoteOption; salt: string; commitHash: string }
        >(`/api/blockchain/disputes/${disputeId}/prepare-commit`, { vote, salt });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to prepare commit');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    prepareCommitVote,
    isLoading,
    error,
  };
}

/**
 * Prepare reveal vote (juror action)
 */
export function usePrepareRevealVote() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const prepareRevealVote = useCallback(
    async (
      disputeId: number,
      vote: VoteOption,
      salt: string
    ): Promise<PreparedDisputeCall> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await api.post<PreparedDisputeCall>(
          `/api/blockchain/disputes/${disputeId}/prepare-reveal`,
          { vote, salt }
        );
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to prepare reveal');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    prepareRevealVote,
    isLoading,
    error,
  };
}

/**
 * Prepare execute ruling
 */
export function usePrepareExecuteRuling() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const prepareExecuteRuling = useCallback(
    async (disputeId: number): Promise<PreparedDisputeCall> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await api.post<PreparedDisputeCall>(
          `/api/blockchain/disputes/${disputeId}/prepare-execute`
        );
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to prepare execute');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    prepareExecuteRuling,
    isLoading,
    error,
  };
}

// ============================================================================
// Helper Hooks
// ============================================================================

const BLOCK_TIME_SECONDS = 6;

/**
 * Calculate countdown for dispute phases
 */
export function useDisputeCountdown(dispute: Dispute | null | undefined): DisputeCountdown | null {
  if (!dispute) return null;

  const {
    currentBlock,
    commitDeadline,
    revealDeadline,
    isInCommitPhase,
    isInRevealPhase,
  } = dispute;

  if (isInCommitPhase) {
    const blocksRemaining = Math.max(0, commitDeadline - currentBlock);
    return {
      phase: 'commit',
      blocksRemaining,
      secondsRemaining: blocksRemaining * BLOCK_TIME_SECONDS,
      deadline: commitDeadline,
    };
  }

  if (isInRevealPhase) {
    const blocksRemaining = Math.max(0, revealDeadline - currentBlock);
    return {
      phase: 'reveal',
      blocksRemaining,
      secondsRemaining: blocksRemaining * BLOCK_TIME_SECONDS,
      deadline: revealDeadline,
    };
  }

  return {
    phase: 'ended',
    blocksRemaining: 0,
    secondsRemaining: 0,
    deadline: revealDeadline,
  };
}

/**
 * Check if user is a juror in the dispute
 */
export function useIsJuror(dispute: Dispute | null | undefined, userAddress: string | undefined): boolean {
  if (!dispute || !userAddress) return false;
  return dispute.jurors.includes(userAddress);
}

/**
 * Check if user is plaintiff or defendant
 */
export function useIsParty(
  dispute: Dispute | null | undefined,
  userAddress: string | undefined
): { isPlaintiff: boolean; isDefendant: boolean; isParty: boolean } {
  if (!dispute || !userAddress) {
    return { isPlaintiff: false, isDefendant: false, isParty: false };
  }

  const isPlaintiff = dispute.plaintiff === userAddress;
  const isDefendant = dispute.defendant === userAddress;

  return {
    isPlaintiff,
    isDefendant,
    isParty: isPlaintiff || isDefendant,
  };
}

/**
 * Get juror's vote status in a dispute
 */
export function useJurorVoteStatus(
  dispute: Dispute | null | undefined,
  jurorAddress: string | undefined
): { hasCommitted: boolean; hasRevealed: boolean; vote: string | null } {
  if (!dispute || !jurorAddress) {
    return { hasCommitted: false, hasRevealed: false, vote: null };
  }

  const commitInfo = dispute.commitStatus.find((c) => c.juror === jurorAddress);
  const voteInfo = dispute.votes.find((v) => v.juror === jurorAddress);

  return {
    hasCommitted: commitInfo?.committed || false,
    hasRevealed: commitInfo?.revealed || false,
    vote: voteInfo?.vote || null,
  };
}

/**
 * Format dispute status for display
 */
export function formatDisputeStatus(status: string): string {
  const statusMap: Record<string, string> = {
    Open: 'Aberta',
    JurorsSelected: 'Jurados Selecionados',
    CommitPhase: 'Fase de Commit',
    RevealPhase: 'Fase de Reveal',
    Resolved: 'Resolvida',
  };
  return statusMap[status] || status;
}

/**
 * Format ruling for display
 */
export function formatRuling(ruling: string | null): string {
  if (!ruling) return '-';

  const rulingMap: Record<string, string> = {
    RefundBuyer: 'Reembolso ao Comprador',
    ReleaseSeller: 'Liberar para Vendedor',
    PartialRefund: 'Reembolso Parcial',
  };
  return rulingMap[ruling] || ruling;
}

/**
 * Generate a random salt for commit-reveal voting
 */
export function generateVoteSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
