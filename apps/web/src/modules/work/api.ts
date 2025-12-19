// path: apps/web/src/modules/work/api.ts
// Bazari Work - API Client

import { apiHelpers } from '@/lib/api';

// Types
export type ProfessionalStatus = 'AVAILABLE' | 'NOT_AVAILABLE' | 'INVISIBLE';
export type WorkPreference = 'REMOTE' | 'ON_SITE' | 'HYBRID';

export interface ProfessionalProfile {
  id: string;
  professionalArea: string | null;
  skills: string[];
  experience: string | null;
  hourlyRate: string | null;
  hourlyRateCurrency: string;
  workPreference: WorkPreference;
  status: ProfessionalStatus;
  showHourlyRate: boolean;
  activatedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfessionalProfileResponse {
  profile: ProfessionalProfile | null;
  isActivated: boolean;
  areas: string[];
}

export interface ProfessionalProfileInput {
  professionalArea?: string;
  skills?: string[];
  experience?: string;
  hourlyRate?: number | null;
  hourlyRateCurrency?: string;
  workPreference?: WorkPreference;
  status?: ProfessionalStatus;
  showHourlyRate?: boolean;
}

// API Functions

export async function getWorkProfile(): Promise<ProfessionalProfileResponse> {
  return apiHelpers.get<ProfessionalProfileResponse>('/api/work/profile');
}

export async function createWorkProfile(data: ProfessionalProfileInput): Promise<{ profile: ProfessionalProfile; isActivated: boolean }> {
  return apiHelpers.post<{ profile: ProfessionalProfile; isActivated: boolean }>('/api/work/profile', data);
}

export async function updateWorkProfile(data: ProfessionalProfileInput): Promise<{ profile: ProfessionalProfile; isActivated: boolean }> {
  return apiHelpers.patch<{ profile: ProfessionalProfile; isActivated: boolean }>('/api/work/profile', data);
}

export async function deleteWorkProfile(): Promise<{ success: boolean; message: string }> {
  return apiHelpers.delete<{ success: boolean; message: string }>('/api/work/profile');
}

export async function updateWorkStatus(status: ProfessionalStatus): Promise<{ status: ProfessionalStatus; message: string }> {
  return apiHelpers.patch<{ status: ProfessionalStatus; message: string }>('/api/work/profile/status', { status });
}

export async function getWorkAreas(): Promise<{ areas: string[] }> {
  return apiHelpers.get<{ areas: string[] }>('/api/work/areas');
}

export async function getSkillSuggestions(area?: string, q?: string): Promise<{ suggestions: string[]; total: number }> {
  const params = new URLSearchParams();
  if (area) params.set('area', area);
  if (q) params.set('q', q);
  return apiHelpers.get<{ suggestions: string[]; total: number }>(`/api/work/skills/suggestions?${params.toString()}`);
}

// ============== Talent Search (PROMPT-02) ==============

export interface TalentUser {
  id?: string;
  handle?: string;
  displayName?: string;
  avatarUrl?: string | null;
  bio?: string | null;
}

export interface TalentListItem {
  id: string;
  user: TalentUser;
  professionalArea: string | null;
  skills: string[];
  workPreference: WorkPreference;
  status: ProfessionalStatus;
  hourlyRate: string | null;
  hourlyRateCurrency: string | null;
  matchScore?: number;
}

export interface TalentSearchParams {
  q?: string;
  skills?: string[];
  area?: string;
  workPreference?: WorkPreference[];
  location?: string;
  minHourlyRate?: number;
  maxHourlyRate?: number;
  status?: 'AVAILABLE' | 'NOT_AVAILABLE';
  sortBy?: 'relevance' | 'hourlyRate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  cursor?: string;
  limit?: number;
}

export interface TalentSearchResponse {
  items: TalentListItem[];
  nextCursor: string | null;
  total: number;
}

export interface TalentStats {
  agreementsCompleted: number;
  averageRating: number | null;
  totalEvaluations: number;
}

export interface TalentProfilePublic {
  id: string;
  user: TalentUser;
  professionalArea: string | null;
  skills: string[];
  experience: string | null;
  workPreference: WorkPreference;
  status: ProfessionalStatus;
  hourlyRate: string | null;
  hourlyRateCurrency: string | null;
  activatedAt: string | null;
  stats: TalentStats;
}

export interface TalentProfileResponse {
  profile: TalentProfilePublic;
  canSendProposal: boolean;
}

export async function searchTalents(params: TalentSearchParams): Promise<TalentSearchResponse> {
  const searchParams = new URLSearchParams();

  if (params.q) searchParams.set('q', params.q);
  if (params.area) searchParams.set('area', params.area);
  if (params.skills?.length) {
    params.skills.forEach((s) => searchParams.append('skills', s));
  }
  if (params.workPreference?.length) {
    params.workPreference.forEach((p) => searchParams.append('workPreference', p));
  }
  if (params.location) searchParams.set('location', params.location);
  if (params.minHourlyRate !== undefined) searchParams.set('minHourlyRate', String(params.minHourlyRate));
  if (params.maxHourlyRate !== undefined) searchParams.set('maxHourlyRate', String(params.maxHourlyRate));
  if (params.status) searchParams.set('status', params.status);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params.cursor) searchParams.set('cursor', params.cursor);
  if (params.limit) searchParams.set('limit', String(params.limit));

  return apiHelpers.get<TalentSearchResponse>(`/api/work/talents?${searchParams.toString()}`);
}

export async function getTalentProfile(handle: string): Promise<TalentProfileResponse> {
  return apiHelpers.get<TalentProfileResponse>(`/api/work/talents/${handle}`);
}

// ============== Job Postings (PROMPT-03) ==============

export type JobPostingStatus = 'DRAFT' | 'OPEN' | 'PAUSED' | 'CLOSED';
export type PaymentPeriod = 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'PROJECT';
export type ApplicationStatus = 'PENDING' | 'REVIEWED' | 'SHORTLISTED' | 'REJECTED' | 'HIRED';

export interface JobCompany {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  about?: string | null;
}

export interface JobPosting {
  id: string;
  title: string;
  description: string;
  area: string;
  skills: string[];
  workType: WorkPreference;
  location: string | null;
  paymentValue: string | null;
  paymentPeriod: PaymentPeriod | null;
  paymentCurrency: string;
  status: JobPostingStatus;
  publishedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  company: JobCompany | null;
  createdBy?: {
    id: string;
    handle: string;
    displayName: string;
  } | null;
  applicationsCount?: number;
}

export interface JobPostingInput {
  sellerProfileId: string;
  title: string;
  description: string;
  area: string;
  skills?: string[];
  workType: WorkPreference;
  location?: string | null;
  paymentValue?: number | null;
  paymentPeriod?: PaymentPeriod | null;
  paymentCurrency?: string;
}

export interface JobSearchParams {
  q?: string;
  skills?: string[];
  area?: string;
  workType?: WorkPreference[];
  location?: string;
  minPayment?: number;
  maxPayment?: number;
  paymentPeriod?: PaymentPeriod;
  sellerProfileId?: string;
  sortBy?: 'relevance' | 'payment' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  cursor?: string;
  limit?: number;
}

export interface JobSearchItem {
  id: string;
  title: string;
  area: string;
  skills: string[];
  workType: WorkPreference;
  location: string | null;
  paymentValue: string | null;
  paymentPeriod: PaymentPeriod | null;
  paymentCurrency: string;
  company: JobCompany;
  publishedAt: string | null;
  applicationsCount: number;
}

export interface JobSearchResponse {
  items: JobSearchItem[];
  nextCursor: string | null;
  total: number;
}

export interface JobApplication {
  id: string;
  coverLetter: string | null;
  expectedValue: string | null;
  status: ApplicationStatus;
  appliedAt: string;
  reviewedAt: string | null;
  applicant?: {
    id: string;
    handle: string;
    displayName: string;
    avatarUrl: string | null;
    professionalProfile?: {
      area: string | null;
      skills: string[];
      hourlyRate: string | null;
    } | null;
  };
  job?: {
    id: string;
    title: string;
    area: string;
    status: JobPostingStatus;
    company: JobCompany;
  };
}

// Job API functions

export async function createJob(data: JobPostingInput): Promise<{ job: JobPosting }> {
  return apiHelpers.post<{ job: JobPosting }>('/api/work/jobs', data);
}

export async function getMyJobs(sellerProfileId?: string, status?: string): Promise<{ items: JobPosting[]; total: number }> {
  const params = new URLSearchParams();
  if (sellerProfileId) params.set('sellerProfileId', sellerProfileId);
  if (status) params.set('status', status);
  return apiHelpers.get<{ items: JobPosting[]; total: number }>(`/api/work/jobs?${params.toString()}`);
}

export async function getJob(id: string): Promise<{ job: JobPosting }> {
  return apiHelpers.get<{ job: JobPosting }>(`/api/work/jobs/${id}`);
}

export async function updateJob(id: string, data: Partial<Omit<JobPostingInput, 'sellerProfileId'>>): Promise<{ job: JobPosting }> {
  return apiHelpers.patch<{ job: JobPosting }>(`/api/work/jobs/${id}`, data);
}

export async function deleteJob(id: string): Promise<{ success: boolean; message: string }> {
  return apiHelpers.delete<{ success: boolean; message: string }>(`/api/work/jobs/${id}`);
}

export async function publishJob(id: string): Promise<{ job: JobPosting; message: string }> {
  return apiHelpers.post<{ job: JobPosting; message: string }>(`/api/work/jobs/${id}/publish`, {});
}

export async function pauseJob(id: string): Promise<{ job: JobPosting; message: string }> {
  return apiHelpers.post<{ job: JobPosting; message: string }>(`/api/work/jobs/${id}/pause`, {});
}

export async function closeJob(id: string): Promise<{ job: JobPosting; message: string }> {
  return apiHelpers.post<{ job: JobPosting; message: string }>(`/api/work/jobs/${id}/close`, {});
}

// Search jobs (public)
export async function searchJobs(params: JobSearchParams): Promise<JobSearchResponse> {
  const searchParams = new URLSearchParams();

  if (params.q) searchParams.set('q', params.q);
  if (params.area) searchParams.set('area', params.area);
  if (params.skills?.length) {
    params.skills.forEach((s) => searchParams.append('skills', s));
  }
  if (params.workType?.length) {
    params.workType.forEach((t) => searchParams.append('workType', t));
  }
  if (params.location) searchParams.set('location', params.location);
  if (params.minPayment !== undefined) searchParams.set('minPayment', String(params.minPayment));
  if (params.maxPayment !== undefined) searchParams.set('maxPayment', String(params.maxPayment));
  if (params.paymentPeriod) searchParams.set('paymentPeriod', params.paymentPeriod);
  if (params.sellerProfileId) searchParams.set('sellerProfileId', params.sellerProfileId);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params.cursor) searchParams.set('cursor', params.cursor);
  if (params.limit) searchParams.set('limit', String(params.limit));

  return apiHelpers.get<JobSearchResponse>(`/api/work/jobs/search?${searchParams.toString()}`);
}

export async function getJobPublic(id: string): Promise<{ job: JobPosting }> {
  return apiHelpers.get<{ job: JobPosting }>(`/api/work/jobs/${id}/public`);
}

// Applications
export async function applyToJob(jobId: string, data: { coverLetter?: string; expectedValue?: number }): Promise<{ application: JobApplication; message: string }> {
  return apiHelpers.post<{ application: JobApplication; message: string }>(`/api/work/jobs/${jobId}/apply`, data);
}

export async function withdrawApplication(jobId: string): Promise<{ success: boolean; message: string }> {
  return apiHelpers.delete<{ success: boolean; message: string }>(`/api/work/jobs/${jobId}/apply`);
}

export async function getJobApplications(jobId: string, status?: string): Promise<{ items: JobApplication[]; total: number }> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  return apiHelpers.get<{ items: JobApplication[]; total: number }>(`/api/work/jobs/${jobId}/applications?${params.toString()}`);
}

export async function updateApplicationStatus(jobId: string, applicationId: string, status: ApplicationStatus): Promise<{ application: { id: string; status: ApplicationStatus; reviewedAt: string }; message: string }> {
  return apiHelpers.patch<{ application: { id: string; status: ApplicationStatus; reviewedAt: string }; message: string }>(`/api/work/jobs/${jobId}/applications/${applicationId}`, { status });
}

export async function getMyApplications(): Promise<{ items: JobApplication[]; total: number }> {
  return apiHelpers.get<{ items: JobApplication[]; total: number }>('/api/work/jobs/my-applications');
}

// ==================== PROPOSALS (PROMPT-04) ====================

export type ProposalStatus = 'PENDING' | 'NEGOTIATING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
export type PaymentType = 'EXTERNAL' | 'BAZARI_PAY' | 'UNDEFINED';

export interface ProposalCompany {
  id: string;
  name: string;
  logoUrl: string | null;
  slug: string;
}

export interface ProposalUser {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface ProposalJobPosting {
  id: string;
  title: string;
  area: string;
}

export interface WorkProposal {
  id: string;
  title: string;
  description: string;
  proposedValue: string | null;
  valuePeriod: PaymentPeriod;
  valueCurrency: string;
  startDate: string | null;
  duration: string | null;
  paymentType: PaymentType;
  status: ProposalStatus;
  chatThreadId: string | null;
  expiresAt: string;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  company: ProposalCompany | null;
  sender: ProposalUser | null;
  receiver: ProposalUser | null;
  jobPosting: ProposalJobPosting | null;
}

export interface CreateProposalInput {
  receiverHandle: string;
  sellerProfileId: string;
  jobPostingId?: string | null;
  title: string;
  description: string;
  proposedValue: number;
  valuePeriod: PaymentPeriod;
  valueCurrency?: string;
  startDate?: string | null;
  duration?: string | null;
  paymentType?: PaymentType;
}

export interface CounterProposalInput {
  proposedValue?: number;
  valuePeriod?: PaymentPeriod;
  startDate?: string | null;
  duration?: string | null;
  message?: string;
}

export interface ProposalListResponse {
  items: WorkProposal[];
  nextCursor: string | null;
  counts: {
    sent: number;
    received: number;
  };
}

// Create proposal
export async function createProposal(data: CreateProposalInput): Promise<{ proposal: WorkProposal; message: string }> {
  return apiHelpers.post<{ proposal: WorkProposal; message: string }>('/api/work/proposals', data);
}

// List proposals
export async function getProposals(params?: {
  type?: 'sent' | 'received';
  status?: ProposalStatus;
  cursor?: string;
  limit?: number;
}): Promise<ProposalListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.set('type', params.type);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.cursor) searchParams.set('cursor', params.cursor);
  if (params?.limit) searchParams.set('limit', String(params.limit));
  return apiHelpers.get<ProposalListResponse>(`/api/work/proposals?${searchParams.toString()}`);
}

// Get single proposal
export async function getProposal(id: string): Promise<{ proposal: WorkProposal; role: 'sender' | 'receiver' }> {
  return apiHelpers.get<{ proposal: WorkProposal; role: 'sender' | 'receiver' }>(`/api/work/proposals/${id}`);
}

// Update proposal (only if PENDING and sender)
export async function updateProposal(id: string, data: Partial<Omit<CreateProposalInput, 'receiverHandle' | 'sellerProfileId'>>): Promise<{ proposal: WorkProposal; message: string }> {
  return apiHelpers.patch<{ proposal: WorkProposal; message: string }>(`/api/work/proposals/${id}`, data);
}

// Cancel proposal
export async function cancelProposal(id: string): Promise<{ success: boolean; message: string }> {
  return apiHelpers.delete<{ success: boolean; message: string }>(`/api/work/proposals/${id}`);
}

// Accept proposal
export async function acceptProposal(id: string): Promise<{ proposal: WorkProposal; message: string }> {
  return apiHelpers.post<{ proposal: WorkProposal; message: string }>(`/api/work/proposals/${id}/accept`, {});
}

// Reject proposal
export async function rejectProposal(id: string, reason?: string): Promise<{ success: boolean; message: string }> {
  return apiHelpers.post<{ success: boolean; message: string }>(`/api/work/proposals/${id}/reject`, { reason });
}

// Start negotiation
export async function startNegotiation(id: string, message?: string): Promise<{ proposal: WorkProposal; message: string }> {
  return apiHelpers.post<{ proposal: WorkProposal; message: string }>(`/api/work/proposals/${id}/negotiate`, { message });
}

// Counter proposal
export async function sendCounterProposal(id: string, data: CounterProposalInput): Promise<{ proposal: WorkProposal; message: string }> {
  return apiHelpers.post<{ proposal: WorkProposal; message: string }>(`/api/work/proposals/${id}/counter`, data);
}

// ==================== AGREEMENTS (PROMPT-05) ====================

export type AgreementStatus = 'ACTIVE' | 'PAUSED' | 'CLOSED';

export interface AgreementCompany {
  id: string;
  name: string;
  logoUrl: string | null;
  slug: string;
}

export interface AgreementWorker {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface AgreementProposal {
  id: string;
  title: string;
  chatThreadId: string | null;
}

export interface WorkAgreement {
  id: string;
  title: string;
  description: string | null;
  terms: string | null;
  agreedValue: string | null;
  valuePeriod: PaymentPeriod;
  valueCurrency: string;
  startDate: string | null;
  endDate: string | null;
  status: AgreementStatus;
  paymentType: PaymentType;
  onChainId: string | null;
  onChainTxHash: string | null;
  payContractId: string | null;
  pausedAt: string | null;
  closedAt: string | null;
  closedReason: string | null;
  createdAt: string;
  updatedAt: string;
  company: AgreementCompany | null;
  worker: AgreementWorker | null;
  proposal: AgreementProposal | null;
}

export interface AgreementStatusHistoryItem {
  id: string;
  fromStatus: AgreementStatus;
  toStatus: AgreementStatus;
  reason: string | null;
  changedBy: AgreementWorker | null;
  createdAt: string;
}

export interface WorkAgreementWithRole extends WorkAgreement {
  role?: 'worker' | 'company';
}

export interface GetAgreementsParams {
  status?: AgreementStatus;
  role?: 'worker' | 'company';
  cursor?: string;
  limit?: number;
  page?: number;
}

export interface GetAgreementsResponse {
  agreements: WorkAgreementWithRole[];
  pagination: {
    page: number;
    totalPages: number;
    total: number;
  };
}

// Get agreements list
export async function getAgreements(params?: GetAgreementsParams): Promise<GetAgreementsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.role) searchParams.set('role', params.role);
  if (params?.cursor) searchParams.set('cursor', params.cursor);
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const queryString = searchParams.toString();
  const url = `/api/work/agreements${queryString ? `?${queryString}` : ''}`;

  // A API retorna { items, total, nextCursor }, precisamos adaptar
  const response = await apiHelpers.get<{ items: WorkAgreement[]; total: number; nextCursor: string | null }>(url);

  const limit = params?.limit || 10;
  const page = params?.page || 1;
  const totalPages = Math.ceil(response.total / limit);

  // Adicionar role a cada acordo baseado no contexto
  const agreementsWithRole: WorkAgreementWithRole[] = response.items.map(agreement => ({
    ...agreement,
    role: params?.role || 'worker', // default
  }));

  return {
    agreements: agreementsWithRole,
    pagination: {
      page,
      totalPages,
      total: response.total,
    },
  };
}

// Get single agreement
export async function getAgreement(id: string): Promise<{ agreement: WorkAgreement; role: 'worker' | 'company'; chatThreadId: string | null }> {
  return apiHelpers.get<{ agreement: WorkAgreement; role: 'worker' | 'company'; chatThreadId: string | null }>(`/api/work/agreements/${id}`);
}

// Pause agreement
export async function pauseAgreement(id: string, reason?: string): Promise<{ agreement: WorkAgreement; message: string }> {
  return apiHelpers.post<{ agreement: WorkAgreement; message: string }>(`/api/work/agreements/${id}/pause`, { reason });
}

// Resume agreement
export async function resumeAgreement(id: string, reason?: string): Promise<{ agreement: WorkAgreement; message: string }> {
  return apiHelpers.post<{ agreement: WorkAgreement; message: string }>(`/api/work/agreements/${id}/resume`, { reason });
}

// Close agreement
export async function closeAgreement(id: string, reason: string): Promise<{ agreement: WorkAgreement; message: string; canEvaluate: boolean }> {
  return apiHelpers.post<{ agreement: WorkAgreement; message: string; canEvaluate: boolean }>(`/api/work/agreements/${id}/close`, { reason });
}

// Get agreement history
export async function getAgreementHistory(id: string): Promise<{ items: AgreementStatusHistoryItem[] }> {
  return apiHelpers.get<{ items: AgreementStatusHistoryItem[] }>(`/api/work/agreements/${id}/history`);
}

// ==================== ON-CHAIN (PROMPT-06) ====================

export interface OnChainData {
  idHash: string;
  company: string;
  worker: string;
  paymentType: 'External' | 'BazariPay' | 'Undefined';
  status: 'Active' | 'Paused' | 'Closed';
  createdAt: number;
  closedAt?: number;
}

export interface AgreementOnChainResponse {
  registered: boolean;
  onChainId: string | null;
  txHash: string | null;
  data: OnChainData | null;
}

// Get agreement on-chain data
export async function getAgreementOnChain(id: string): Promise<AgreementOnChainResponse> {
  return apiHelpers.get<AgreementOnChainResponse>(`/api/work/agreements/${id}/onchain`);
}

// ==================== EVALUATIONS (PROMPT-07) ====================

export type EvaluationCommentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface WorkEvaluation {
  id: string;
  overallRating: number;
  communicationRating: number | null;
  punctualityRating: number | null;
  qualityRating: number | null;
  comment: string | null;
  commentStatus?: EvaluationCommentStatus;
  isPublic: boolean;
  createdAt: string;
  author?: {
    id: string;
    handle: string;
    displayName: string;
    avatarUrl: string | null;
  };
  target?: {
    id: string;
    handle: string;
    displayName: string;
    avatarUrl: string | null;
  };
  agreement?: {
    id: string;
    title: string;
    closedAt: string | null;
  };
}

export interface EvaluationInput {
  overallRating: number;
  communicationRating?: number;
  punctualityRating?: number;
  qualityRating?: number;
  comment?: string;
}

export interface CreateEvaluationResponse {
  evaluation: WorkEvaluation;
  otherPartyEvaluated: boolean;
  nowPublic: boolean;
}

export interface AgreementEvaluationsResponse {
  myEvaluation: WorkEvaluation | null;
  otherEvaluation: WorkEvaluation | null;
  canEvaluate: boolean;
  isPublic: boolean;
}

export interface TalentStatsResponse {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  totalEvaluations: number;
  completedContracts: number;
  averageRating: number | null;
  ratings: {
    overall: number;
    communication: number | null;
    punctuality: number | null;
    quality: number | null;
  } | null;
}

// Submit evaluation for an agreement
export async function submitEvaluation(agreementId: string, data: EvaluationInput): Promise<CreateEvaluationResponse> {
  return apiHelpers.post<CreateEvaluationResponse>(`/api/work/agreements/${agreementId}/evaluate`, data);
}

// Get evaluations for an agreement
export async function getAgreementEvaluations(agreementId: string): Promise<AgreementEvaluationsResponse> {
  return apiHelpers.get<AgreementEvaluationsResponse>(`/api/work/agreements/${agreementId}/evaluations`);
}

// Get evaluations I received
export async function getReceivedEvaluations(): Promise<{ evaluations: WorkEvaluation[] }> {
  return apiHelpers.get<{ evaluations: WorkEvaluation[] }>('/api/work/evaluations/received');
}

// Get evaluations I gave
export async function getGivenEvaluations(): Promise<{ evaluations: WorkEvaluation[] }> {
  return apiHelpers.get<{ evaluations: WorkEvaluation[] }>('/api/work/evaluations/given');
}

// Get talent stats (public)
export async function getTalentStats(handle: string): Promise<TalentStatsResponse> {
  return apiHelpers.get<TalentStatsResponse>(`/api/work/talents/${handle}/stats`);
}

// ==================== DASHBOARD (PROMPT-09) ====================

export interface DashboardStats {
  pendingProposals: number;
  activeAgreements: number;
  pendingEvaluations: number;
  matchingJobs: number;
}

export interface DashboardProfile {
  hasProfile: boolean;
  status: ProfessionalStatus | null;
  professionalArea: string | null;
  skills: string[];
  hourlyRate: string | null;
  hourlyRateCurrency: string | null;
  averageRating: number | null;
  totalEvaluations: number;
  agreementsCompleted: number;
}

export interface DashboardProposal {
  id: string;
  title: string;
  status: string;
  proposedValue: string | null;
  valueCurrency: string | null;
  otherParty: {
    name: string;
    avatarUrl: string | null;
  };
  createdAt: string;
}

export interface DashboardAgreement {
  id: string;
  title: string;
  status: string;
  agreedValue: string | null;
  valueCurrency: string | null;
  otherParty: {
    name: string;
    avatarUrl: string | null;
  };
  startDate: string | null;
}

export interface DashboardJob {
  id: string;
  title: string;
  company: {
    name: string;
    logoUrl: string | null;
  };
  paymentValue: string | null;
  paymentPeriod: string | null;
  paymentCurrency: string | null;
  matchScore: number;
}

export interface DashboardResponse {
  profile: DashboardProfile;
  stats: DashboardStats;
  recentProposals: DashboardProposal[];
  activeAgreements: DashboardAgreement[];
  recommendedJobs: DashboardJob[];
}

// Get dashboard data
export async function getDashboard(): Promise<DashboardResponse> {
  return apiHelpers.get<DashboardResponse>('/api/work/dashboard');
}
