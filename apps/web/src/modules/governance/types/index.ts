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
  endorsements?: number; // Number of endorsements (for democracy proposals)
  endorsers?: string[]; // List of endorser addresses
  originProposalId?: number; // For referendums: which proposal originated this referendum
  referendumId?: number; // For proposals: which referendum ID this became (if promoted)
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

// ============================================================
// FASE 8: New Types for UI Enhancements
// ============================================================

/**
 * Stats Widget - Dashboard component
 */
export interface StatsWidgetData {
  title: string;
  value: string | number;
  change?: {
    value: number;
    period: string;
    trend: 'up' | 'down';
  };
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'amber' | 'purple';
  onClick?: () => void;
}

/**
 * Voting Chart Data
 */
export interface VotingChartData {
  proposalId: number;
  proposalTitle?: string;
  ayeVotes: number;
  nayVotes: number;
  abstain?: number;
  turnout?: number;
  timestamp?: string;
}

export type ChartType = 'bar' | 'pie' | 'line' | 'area';

/**
 * Event Timeline
 */
export type GovernanceEventType =
  | 'PROPOSAL_CREATED'
  | 'PROPOSAL_TABLED'
  | 'VOTING_STARTED'
  | 'VOTE_CAST'
  | 'PROPOSAL_PASSED'
  | 'PROPOSAL_REJECTED'
  | 'PROPOSAL_EXECUTED'
  | 'TREASURY_APPROVED'
  | 'COUNCIL_MEMBER_ADDED'
  | 'COUNCIL_MEMBER_REMOVED'
  | 'MULTISIG_APPROVAL'
  | 'MULTISIG_EXECUTED';

export interface GovernanceEvent {
  id: string;
  type: GovernanceEventType;
  title: string;
  description?: string;
  timestamp: string;
  actor?: string; // Address of who triggered the event
  metadata?: Record<string, any>;
  proposalId?: number;
}

/**
 * Notifications
 */
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export type GovernanceNotificationType =
  | 'PROPOSAL'
  | 'VOTE'
  | 'APPROVAL'
  | 'REJECTION'
  | 'EXECUTION'
  | 'COUNCIL'
  | 'TREASURY'
  | 'MULTISIG';

export interface GovernanceNotification {
  id: string;
  type: GovernanceNotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  read: boolean;
  timestamp: string;
  actionUrl?: string;
  proposalId?: number;
  link?: string;
  metadata?: Record<string, any>;
}

/**
 * Advanced Filters
 */
export interface ProposalFilters {
  types?: ProposalType[];
  statuses?: ProposalStatus[];
  dateRange?: {
    from: Date | null;
    to: Date | null;
  };
  valueRange?: {
    min: number | null;
    max: number | null;
  };
  proposer?: string;
  searchQuery?: string;
}

/**
 * Multi-sig Workflow
 */
export interface MultisigTransaction {
  id: string;
  multisigAddress: string;
  callHash: string;
  callData?: any;
  description?: string;
  threshold: number;
  signatories: string[];
  approvals: string[];
  status: 'PENDING' | 'APPROVED' | 'EXECUTED' | 'CANCELLED';
  createdAt: string;
  executedAt?: string;
  depositor: string;
}

export interface WorkflowStep {
  id: string;
  label: string;
  description?: string;
  status: 'pending' | 'active' | 'completed' | 'rejected';
  timestamp?: string;
  actor?: string;
}

/**
 * Quick Actions
 */
export interface QuickAction {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * Chart Helpers
 */
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, any>;
}

/**
 * Skeleton/Loading States
 */
export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
  retry?: () => void;
}
