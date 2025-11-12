import type {
  ApiResponse,
  GovernanceProposal,
  GovernanceVote,
  CouncilMember,
  MultisigAccount,
  GovernanceStats,
} from '../types';
import { getAccessToken } from '@/modules/auth/session';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function fetchJSON<T>(path: string): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
  });
  return response.json();
}

async function postJSON<T>(path: string, body: any): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add auth token if available
  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(body),
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

  // Democracy Actions
  secondProposal: (proposalId: number, signature: string, address: string, mnemonic: string) =>
    postJSON<{ proposalId: number; txHash: string; blockHash: string; blockNumber: number }>(
      `/api/governance/democracy/second/${proposalId}`,
      { signature, address, mnemonic }
    ),

  voteReferendum: (refId: number, vote: { aye: boolean; conviction: number }, balance: string, signature: string, address: string, timestamp: string) =>
    postJSON<{ refId: number; txHash: string; blockHash: string; blockNumber: number }>(
      `/api/governance/democracy/vote/${refId}`,
      { vote, balance, signature, address, timestamp }
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
