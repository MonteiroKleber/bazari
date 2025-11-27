// Affiliate Module
// path: apps/web/src/modules/affiliates/index.ts

// Components
export * from './components';

// Re-export hooks for convenience
export {
  useReferralTree,
  useAffiliateStats,
  useGenerateReferralLink,
  useMerkleProof,
  usePrepareRegister,
  usePrepareClaim,
  useAffiliateLeaderboard,
  useCommissionHistory,
  // Types
  type ReferralTreeNode,
  type ReferralTree,
  type AffiliateStats,
  type GeneratedReferralLink,
  type CommissionMerkleProof,
  type PreparedAffiliateCall,
  type LeaderboardEntry,
  type CommissionRecord,
  // Helpers
  formatBzrAmount,
  formatCommissionRate,
  calculatePotentialEarnings,
  countTreeNodes,
  flattenTree,
  getNodesAtLevel,
  shortenAddress,
  copyToClipboard,
  parseReferrerFromUrl,
  saveReferrerCode,
  getSavedReferrerCode,
  clearReferrerCode,
} from '@/hooks/blockchain/useAffiliate';
