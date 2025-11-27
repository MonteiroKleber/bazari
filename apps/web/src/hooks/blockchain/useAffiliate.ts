import { useBlockchainQuery } from '../useBlockchainQuery';
import { useState, useCallback } from 'react';
import { api } from '../../lib/api';

/**
 * useAffiliate - Complete blockchain hooks for Bazari Affiliate system
 *
 * Provides hooks for interacting with the bazari-affiliate pallet:
 * - useReferralTree() - Get referral tree for an address
 * - useAffiliateStats() - Get affiliate statistics
 * - useGenerateReferralLink() - Generate referral link
 * - useMerkleProof() - Get commission merkle proof
 * - usePrepareRegister() - Prepare registration transaction
 * - usePrepareClaim() - Prepare commission claim transaction
 * - useAffiliateLeaderboard() - Get top affiliates
 * - useCommissionHistory() - Get commission history
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Node in the referral tree
 */
export interface ReferralTreeNode {
  address: string;
  referrer: string | null;
  level: number;
  depth: number;
  registeredAt: number;
  totalReferrals: number;
  directReferrals: number;
  children: ReferralTreeNode[];
}

/**
 * Referral tree response
 */
export interface ReferralTree {
  address: string;
  tree: ReferralTreeNode;
  stats: {
    totalInNetwork: number;
    directCount: number;
    levelsDeep: number;
  };
  fetchedAt: number;
}

/**
 * Affiliate statistics
 */
export interface AffiliateStats {
  address: string;
  isRegistered: boolean;
  referrer: string | null;
  registeredAt: number;
  // Referrals
  directReferrals: number;
  indirectReferrals: number;
  totalReferrals: number;
  // Comissões (em planck)
  pendingCommissions: string;
  claimedCommissions: string;
  totalEarned: string;
  // Taxas
  commissionRates: {
    level1: number;
    level2: number;
    level3: number;
  };
  // Link de referral
  referralCode: string;
}

/**
 * Generated referral link response
 */
export interface GeneratedReferralLink {
  success: boolean;
  affiliateAddress: string;
  referralCode: string;
  fullUrl: string;
  shortUrl: string;
  campaign: string | null;
  expiresAt: string | null;
}

/**
 * Merkle proof for commission verification
 */
export interface CommissionMerkleProof {
  saleId: string;
  affiliateAddress: string;
  amount: string;
  level: number;
  status: string;
  merkleProof: {
    root: string;
    proof: string[];
    leaf: string;
  };
  verificationUrl: string;
  onChain?: boolean;
}

/**
 * Prepared transaction response
 */
export interface PreparedAffiliateCall {
  affiliateAddress: string;
  referrer?: string | null;
  referrerCode?: string | null;
  pendingAmount?: string;
  callHex: string;
  callHash: string;
  method: string;
  signerAddress: string;
}

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
  rank: number;
  address: string;
  totalReferrals: number;
  totalEarned: string;
  registeredAt: number;
}

/**
 * Commission record
 */
export interface CommissionRecord {
  id: string;
  saleId: string;
  amount: string;
  level: number;
  status: 'PENDING' | 'CLAIMED';
  createdAt: string;
  claimedAt: string | null;
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get referral tree for an address
 */
export function useReferralTree(address: string | undefined, depth: number = 5) {
  return useBlockchainQuery<ReferralTree>({
    endpoint: address ? `/api/blockchain/affiliate/tree/${address}?depth=${depth}` : '',
    enabled: !!address,
    refetchInterval: 60000, // 1 minute
  });
}

/**
 * Get affiliate statistics
 */
export function useAffiliateStats(address: string | undefined) {
  return useBlockchainQuery<AffiliateStats>({
    endpoint: address ? `/api/blockchain/affiliate/stats/${address}` : '',
    enabled: !!address,
    refetchInterval: 30000, // 30s
  });
}

/**
 * Get affiliate leaderboard
 */
export function useAffiliateLeaderboard(limit: number = 10, period: 'all' | 'month' | 'week' = 'all') {
  return useBlockchainQuery<{
    leaderboard: LeaderboardEntry[];
    period: string;
    totalAffiliates: number;
    fetchedAt: number;
  }>({
    endpoint: `/api/blockchain/affiliate/leaderboard?limit=${limit}&period=${period}`,
    refetchInterval: 60000, // 1 minute
  });
}

/**
 * Get commission history for an address
 */
export function useCommissionHistory(address: string | undefined) {
  return useBlockchainQuery<{
    address: string;
    commissions: CommissionRecord[];
    summary: {
      total: number;
      pendingCount: number;
      pendingAmount: string;
      claimedCount: number;
      claimedAmount: string;
    };
  }>({
    endpoint: address ? `/api/blockchain/affiliate/commission-history/${address}` : '',
    enabled: !!address,
    refetchInterval: 30000,
  });
}

/**
 * Get commission merkle proof for a sale
 */
export function useMerkleProof(saleId: string | undefined) {
  return useBlockchainQuery<CommissionMerkleProof>({
    endpoint: saleId ? `/api/blockchain/affiliate/commission-proof/${saleId}` : '',
    enabled: !!saleId,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Generate referral link
 */
export function useGenerateReferralLink() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generateLink = useCallback(
    async (options?: { targetUrl?: string; campaign?: string }): Promise<GeneratedReferralLink> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await api.post<GeneratedReferralLink>(
          '/api/blockchain/affiliate/generate-link',
          options || {}
        );
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to generate referral link');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    generateLink,
    isLoading,
    error,
  };
}

/**
 * Prepare affiliate registration
 */
export function usePrepareRegister() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const prepareRegister = useCallback(
    async (referrerCode?: string): Promise<PreparedAffiliateCall> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await api.post<PreparedAffiliateCall>(
          '/api/blockchain/affiliate/prepare-register',
          { referrerCode }
        );
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to prepare registration');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    prepareRegister,
    isLoading,
    error,
  };
}

/**
 * Prepare commission claim
 */
export function usePrepareClaim() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const prepareClaim = useCallback(async (): Promise<PreparedAffiliateCall> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await api.post<PreparedAffiliateCall>(
        '/api/blockchain/affiliate/prepare-claim'
      );
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to prepare claim');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    prepareClaim,
    isLoading,
    error,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format BZR amount from planck (12 decimals)
 */
export function formatBzrAmount(planck: string): string {
  const value = BigInt(planck);
  const divisor = BigInt(10 ** 12);
  const wholePart = value / divisor;
  const fractionalPart = value % divisor;
  const fractionalStr = fractionalPart.toString().padStart(12, '0').slice(0, 2);
  return `${wholePart}.${fractionalStr}`;
}

/**
 * Format commission rate (percentage)
 */
export function formatCommissionRate(rate: number): string {
  return `${rate}%`;
}

/**
 * Calculate potential earnings for a sale amount
 */
export function calculatePotentialEarnings(
  saleAmount: string,
  level: number,
  commissionRates: { level1: number; level2: number; level3: number }
): string {
  const amount = BigInt(saleAmount);
  let rate: number;

  switch (level) {
    case 1:
      rate = commissionRates.level1;
      break;
    case 2:
      rate = commissionRates.level2;
      break;
    case 3:
      rate = commissionRates.level3;
      break;
    default:
      rate = 0;
  }

  const earnings = (amount * BigInt(rate)) / BigInt(100);
  return earnings.toString();
}

/**
 * Count total nodes in a referral tree
 */
export function countTreeNodes(node: ReferralTreeNode | null): number {
  if (!node) return 0;
  return 1 + node.children.reduce((sum, child) => sum + countTreeNodes(child), 0);
}

/**
 * Flatten tree to array for table display
 */
export function flattenTree(
  node: ReferralTreeNode | null,
  result: Array<{
    address: string;
    level: number;
    referrer: string | null;
    directReferrals: number;
  }> = []
): typeof result {
  if (!node) return result;

  result.push({
    address: node.address,
    level: node.level,
    referrer: node.referrer,
    directReferrals: node.directReferrals,
  });

  for (const child of node.children) {
    flattenTree(child, result);
  }

  return result;
}

/**
 * Get nodes at a specific level
 */
export function getNodesAtLevel(tree: ReferralTreeNode | null, level: number): ReferralTreeNode[] {
  if (!tree) return [];

  const result: ReferralTreeNode[] = [];

  function traverse(node: ReferralTreeNode, currentLevel: number) {
    if (currentLevel === level) {
      result.push(node);
      return;
    }
    for (const child of node.children) {
      traverse(child, currentLevel + 1);
    }
  }

  traverse(tree, 0);
  return result;
}

/**
 * Shorten address for display
 */
export function shortenAddress(address: string, chars: number = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse referrer from URL query params
 */
export function parseReferrerFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  return params.get('ref') || null;
}

/**
 * Save referrer code to localStorage
 */
export function saveReferrerCode(code: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('bazari_referrer', code);
}

/**
 * Get saved referrer code from localStorage
 */
export function getSavedReferrerCode(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('bazari_referrer');
}

/**
 * Clear saved referrer code
 */
export function clearReferrerCode(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('bazari_referrer');
}
