// path: apps/web/src/modules/pay/api.ts
// Bazari Pay - API Client (PROMPT-00 + PROMPT-01)

import { apiHelpers } from '@/lib/api';

// Types
export interface PayDashboardStats {
  contractsAsPayer: number;
  contractsAsReceiver: number;
  activeContractsAsPayer: number;
  activeContractsAsReceiver: number;
  pendingExecutions: number;
  monthlyTotalBRL: number;
  monthlyTotalBZR: number;
}

export interface UpcomingPayment {
  id: string;
  role: 'payer' | 'receiver';
  otherParty: {
    name: string;
    handle: string | null;
    avatarUrl: string | null;
  };
  baseValue: string;
  currency: string;
  period: string;
  nextPaymentDate: string;
  description: string | null;
}

export interface PayDashboardResponse {
  stats: PayDashboardStats;
  upcomingPayments: UpcomingPayment[];
}

// Contract Types
export type PayPeriod = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
export type PayContractStatus = 'ACTIVE' | 'PAUSED' | 'CLOSED';

export interface PayContractUser {
  id: string;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface PayContract {
  id: string;
  payer: PayContractUser;
  payerCompany: { id: string; businessName: string } | null;
  receiver: PayContractUser;
  payerWallet: string;
  receiverWallet: string;
  baseValue: string;
  currency: string;
  period: PayPeriod;
  paymentDay: number;
  startDate: string;
  endDate: string | null;
  nextPaymentDate: string;
  status: PayContractStatus;
  description: string | null;
  referenceType: string | null;
  referenceId: string | null;
  // On-chain (PROMPT-04)
  onChainId: string | null;
  onChainTxHash: string | null;
  createdAt: string;
  updatedAt: string;
  pausedAt: string | null;
  closedAt: string | null;
}

export interface PayContractListItem {
  id: string;
  role: 'payer' | 'receiver';
  otherParty: {
    id: string;
    name: string;
    handle: string | null;
    avatarUrl: string | null;
  };
  baseValue: string;
  currency: string;
  period: PayPeriod;
  paymentDay: number;
  nextPaymentDate: string;
  status: PayContractStatus;
  description: string | null;
  createdAt: string;
}

export interface CreateContractInput {
  receiverHandle: string;
  receiverWallet?: string;
  baseValue: string;
  currency: string;
  period: PayPeriod;
  paymentDay: number;
  startDate: string;
  endDate?: string | null;
  description?: string;
  referenceType?: string;
  referenceId?: string;
}

export interface UpdateContractInput {
  baseValue?: string;
  paymentDay?: number;
  description?: string;
  endDate?: string | null;
}

export interface StatusHistoryItem {
  id: string;
  fromStatus: PayContractStatus;
  toStatus: PayContractStatus;
  reason: string | null;
  changedBy: {
    id: string;
    displayName: string | null;
    handle: string | null;
  };
  createdAt: string;
}

// Dashboard
export async function getDashboard(): Promise<PayDashboardResponse> {
  return apiHelpers.get<PayDashboardResponse>('/api/pay/dashboard');
}

// Contract CRUD
export async function createContract(
  data: CreateContractInput
): Promise<{ contract: PayContract }> {
  return apiHelpers.post('/api/pay/contracts', data);
}

export async function getContracts(params?: {
  role?: 'payer' | 'receiver';
  status?: PayContractStatus;
}): Promise<{ contracts: PayContractListItem[] }> {
  const searchParams = new URLSearchParams();
  if (params?.role) searchParams.set('role', params.role);
  if (params?.status) searchParams.set('status', params.status);
  const query = searchParams.toString();
  return apiHelpers.get(`/api/pay/contracts${query ? `?${query}` : ''}`);
}

export async function getContract(id: string): Promise<{ contract: PayContract }> {
  return apiHelpers.get(`/api/pay/contracts/${id}`);
}

export async function updateContract(
  id: string,
  data: UpdateContractInput
): Promise<{ contract: PayContract }> {
  return apiHelpers.patch(`/api/pay/contracts/${id}`, data);
}

export async function deleteContract(id: string): Promise<void> {
  return apiHelpers.delete(`/api/pay/contracts/${id}`);
}

// Contract Actions
export async function pauseContract(
  id: string,
  reason?: string
): Promise<{ contract: PayContract }> {
  return apiHelpers.post(`/api/pay/contracts/${id}/pause`, { reason });
}

export async function resumeContract(id: string): Promise<{ contract: PayContract }> {
  return apiHelpers.post(`/api/pay/contracts/${id}/resume`, {});
}

export async function closeContract(
  id: string,
  reason: string
): Promise<{ contract: PayContract }> {
  return apiHelpers.post(`/api/pay/contracts/${id}/close`, { reason });
}

// Contract History
export async function getContractHistory(
  id: string
): Promise<{ history: StatusHistoryItem[] }> {
  return apiHelpers.get(`/api/pay/contracts/${id}/history`);
}

// User Search (for receiver selection)
export interface UserSearchResult {
  id: string;
  handle: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  walletAddress: string | null;
}

export async function searchUsers(query: string): Promise<{ users: UserSearchResult[] }> {
  return apiHelpers.get(`/api/profiles/search?q=${encodeURIComponent(query)}`);
}

// ============================================================
// EXECUÇÕES (PROMPT-02)
// ============================================================

export type ExecutionStatus =
  | 'SCHEDULED'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'RETRYING'
  | 'SKIPPED';

export interface ContractExecution {
  id: string;
  contractId: string;
  periodStart: string;
  periodEnd: string;
  periodRef: string; // "2025-02" formato YYYY-MM
  baseValue: string;
  adjustmentsTotal: string;
  finalValue: string;
  currency: string;
  status: ExecutionStatus;
  attemptCount: number;
  failureReason: string | null;
  txHash: string | null;
  blockNumber: number | null;
  scheduledAt: string;
  executedAt: string | null;
  nextRetryAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionWithContract extends ContractExecution {
  contract: {
    id: string;
    description: string | null;
    payer: PayContractUser;
    receiver: PayContractUser;
    payerCompany: { id: string; businessName: string } | null;
  };
  role: 'payer' | 'receiver';
  otherParty: {
    id: string;
    name: string;
    handle: string | null;
    avatarUrl: string | null;
  };
}

export interface ExecutionStats {
  totalExecutions: number;
  successCount: number;
  failedCount: number;
  pendingCount: number;
  totalPaidBRL: string;
  totalPaidBZR: string;
  totalReceivedBRL: string;
  totalReceivedBZR: string;
}

// Get executions for a specific contract
export async function getContractExecutions(
  contractId: string,
  params?: {
    status?: ExecutionStatus;
    limit?: number;
    offset?: number;
  }
): Promise<{ executions: ContractExecution[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());
  const query = searchParams.toString();
  return apiHelpers.get(
    `/api/pay/contracts/${contractId}/executions${query ? `?${query}` : ''}`
  );
}

// Get user's execution history across all contracts
export async function getExecutionHistory(params?: {
  role?: 'payer' | 'receiver';
  status?: ExecutionStatus;
  periodRef?: string;
  limit?: number;
  offset?: number;
}): Promise<{ executions: ExecutionWithContract[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.role) searchParams.set('role', params.role);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.periodRef) searchParams.set('periodRef', params.periodRef);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.offset) searchParams.set('offset', params.offset.toString());
  const query = searchParams.toString();
  return apiHelpers.get(`/api/pay/executions/history${query ? `?${query}` : ''}`);
}

// Get single execution details
export async function getExecution(
  executionId: string
): Promise<{ execution: ExecutionWithContract }> {
  return apiHelpers.get(`/api/pay/executions/${executionId}`);
}

// Get execution statistics
export async function getExecutionStats(): Promise<{ stats: ExecutionStats }> {
  return apiHelpers.get('/api/pay/executions/stats');
}

// ============================================================
// AJUSTES (PROMPT-03)
// ============================================================

export type AdjustmentType = 'EXTRA' | 'DISCOUNT';

export type AdjustmentStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'APPLIED'
  | 'CANCELLED';

export interface PayAdjustment {
  id: string;
  type: AdjustmentType;
  value: string;
  referenceMonth: string;
  reason: string;
  description: string | null;
  attachments: string[];
  requiresApproval: boolean;
  status: AdjustmentStatus;
  approvedAt: string | null;
  approvedBy: {
    id: string;
    displayName: string | null;
    handle: string | null;
  } | null;
  rejectionReason: string | null;
  execution: {
    id: string;
    periodRef: string;
    executedAt: string | null;
  } | null;
  createdAt: string;
  createdBy: {
    id: string;
    displayName: string | null;
    handle: string | null;
  };
}

export interface PendingAdjustmentItem {
  id: string;
  type: AdjustmentType;
  value: string;
  referenceMonth: string;
  reason: string;
  description: string | null;
  createdAt: string;
  contract: {
    id: string;
    description: string | null;
    payer: {
      id: string;
      displayName: string | null;
      handle: string | null;
      avatarUrl: string | null;
    };
  };
  createdBy: {
    id: string;
    displayName: string | null;
    handle: string | null;
  };
}

export interface CreateAdjustmentInput {
  type: AdjustmentType;
  value: string;
  referenceMonth: string;
  reason: string;
  description?: string;
  attachments?: string[];
  requiresApproval?: boolean;
}

// Create adjustment for a contract
export async function createAdjustment(
  contractId: string,
  data: CreateAdjustmentInput
): Promise<{ adjustment: PayAdjustment }> {
  return apiHelpers.post(`/api/pay/contracts/${contractId}/adjustments`, data);
}

// Get adjustments for a contract
export async function getContractAdjustments(
  contractId: string,
  status?: AdjustmentStatus
): Promise<{ adjustments: PayAdjustment[] }> {
  const query = status ? `?status=${status}` : '';
  return apiHelpers.get(`/api/pay/contracts/${contractId}/adjustments${query}`);
}

// Get single adjustment details
export async function getAdjustment(
  adjustmentId: string
): Promise<{ adjustment: PayAdjustment }> {
  return apiHelpers.get(`/api/pay/adjustments/${adjustmentId}`);
}

// Update adjustment (only if DRAFT)
export async function updateAdjustment(
  adjustmentId: string,
  data: Partial<Pick<CreateAdjustmentInput, 'value' | 'reason' | 'description' | 'attachments'>>
): Promise<{ adjustment: PayAdjustment }> {
  return apiHelpers.patch(`/api/pay/adjustments/${adjustmentId}`, data);
}

// Cancel adjustment
export async function cancelAdjustment(adjustmentId: string): Promise<{ success: boolean }> {
  return apiHelpers.delete(`/api/pay/adjustments/${adjustmentId}`);
}

// Submit adjustment for approval
export async function submitAdjustment(
  adjustmentId: string
): Promise<{ success: boolean; status: AdjustmentStatus }> {
  return apiHelpers.post(`/api/pay/adjustments/${adjustmentId}/submit`, {});
}

// Approve adjustment (receiver only)
export async function approveAdjustment(
  adjustmentId: string
): Promise<{ success: boolean; status: AdjustmentStatus }> {
  return apiHelpers.post(`/api/pay/adjustments/${adjustmentId}/approve`, {});
}

// Reject adjustment (receiver only)
export async function rejectAdjustment(
  adjustmentId: string,
  reason: string
): Promise<{ success: boolean; status: AdjustmentStatus }> {
  return apiHelpers.post(`/api/pay/adjustments/${adjustmentId}/reject`, { reason });
}

// Get pending adjustments (for receiver to approve)
export async function getPendingAdjustments(): Promise<{
  items: PendingAdjustmentItem[];
  total: number;
}> {
  return apiHelpers.get('/api/pay/adjustments/pending');
}
