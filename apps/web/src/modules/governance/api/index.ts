import type {
  ApiResponse,
  GovernanceProposal,
  GovernanceVote,
  CouncilMember,
  MultisigAccount,
  GovernanceStats,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function fetchJSON<T>(path: string): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
  });
  return response.json();
}

export const governanceApi = {
  // Treasury
  getTreasuryProposals: () =>
    fetchJSON<GovernanceProposal[]>('/governance/treasury/proposals'),

  getTreasuryApprovals: () =>
    fetchJSON<number[]>('/governance/treasury/approvals'),

  // Democracy
  getDemocracyReferendums: () =>
    fetchJSON<GovernanceProposal[]>('/governance/democracy/referendums'),

  getDemocracyProposals: () =>
    fetchJSON<GovernanceProposal[]>('/governance/democracy/proposals'),

  getReferendumVotes: (id: number) =>
    fetchJSON<{ referendumId: number; info: any; votes: GovernanceVote[] }>(
      `/governance/democracy/referendums/${id}/votes`
    ),

  // Council
  getCouncilMembers: () =>
    fetchJSON<string[]>('/governance/council/members'),

  getCouncilProposals: () =>
    fetchJSON<any[]>('/governance/council/proposals'),

  // Technical Committee
  getTechCommitteeMembers: () =>
    fetchJSON<string[]>('/governance/tech-committee/members'),

  getTechCommitteeProposals: () =>
    fetchJSON<any[]>('/governance/tech-committee/proposals'),

  // Multisig
  getMultisigAccount: (address: string) =>
    fetchJSON<{ address: string; data: any[] }>(
      `/governance/multisig/${address}`
    ),

  // Stats
  getGovernanceStats: () =>
    fetchJSON<GovernanceStats>('/governance/stats'),
};
