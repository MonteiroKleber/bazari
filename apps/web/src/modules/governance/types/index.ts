// Governance Types for Bazari Platform

export type ProposalType = 'DEMOCRACY' | 'TREASURY' | 'COUNCIL' | 'TECHNICAL';

export type ProposalStatus =
  | 'PROPOSED'
  | 'TABLED'
  | 'STARTED'
  | 'PASSED'
  | 'NOT_PASSED'
  | 'CANCELLED'
  | 'EXECUTED';

export type VoteType = 'AYE' | 'NAY';

export type Conviction = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = None (0.1x), 1-6 = Locked 1x-6x

export interface GovernanceProposal {
  id: number;
  type: ProposalType;
  proposer: string;
  title?: string;
  description?: string;
  status: ProposalStatus;
  deposit?: string;
  value?: string; // For treasury proposals
  beneficiary?: string; // For treasury proposals
  preimageHash?: string; // For democracy proposals
  votingStartBlock?: number;
  votingEndBlock?: number;
  ayeVotes?: string;
  nayVotes?: string;
  turnout?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface GovernanceVote {
  voter: string;
  proposalId: number;
  voteType: VoteType;
  balance: string;
  conviction: Conviction;
  timestamp: string;
}

export interface CouncilMember {
  address: string;
  name?: string;
  type: 'COUNCIL' | 'TECHNICAL';
  addedAt: string;
  isPrime?: boolean;
}

export interface MultisigAccount {
  address: string;
  threshold: number;
  signatories: string[];
  callHash?: string;
  timepoint?: {
    height: number;
    index: number;
  };
  approvals: string[];
  depositor?: string;
}

export interface TreasuryStats {
  balance: string;
  proposalCount: number;
  approvedCount: number;
  spendPeriod: number;
  nextPayout: number;
}

export interface DemocracyStats {
  referendumCount: number;
  activeReferendums: number;
  publicProposals: number;
}

export interface GovernanceStats {
  treasury: TreasuryStats;
  democracy: DemocracyStats;
  council: {
    memberCount: number;
  };
  techCommittee: {
    memberCount: number;
  };
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Form types
export interface CreateProposalForm {
  type: ProposalType;
  title: string;
  description: string;
  deposit: string;
  value?: string; // Treasury only
  beneficiary?: string; // Treasury only
  preimageHash?: string; // Democracy only
}

export interface VoteForm {
  voteType: VoteType;
  balance: string;
  conviction: Conviction;
}
