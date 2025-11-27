# bazari-dispute Hooks Specification

**Status**: CRITICAL (P0)
**Version**: 1.0
**Last Updated**: 2025-11-14
**Total Hooks**: 7 (3 query + 4 mutation)
**Related**: UI-SPEC.md, COMPONENTS.md, PAGES.md

---

## Table of Contents

1. [Hooks Overview](#1-hooks-overview)
2. [Query Hooks](#2-query-hooks)
3. [Mutation Hooks](#3-mutation-hooks)
4. [Subscription Hooks](#4-subscription-hooks)
5. [Helper Utilities](#5-helper-utilities)
6. [Error Handling](#6-error-handling)
7. [Testing](#7-testing)

---

## 1. Hooks Overview

### 1.1 Summary Table

| Hook | Type | Purpose | Complexity | LOC Est. |
|------|------|---------|------------|----------|
| useDisputeDetails | Query | Get dispute by ID | High | 120 |
| useMyDisputes | Query | Get user's disputes | Medium | 80 |
| useAllDisputes | Query | Get all disputes (admin) | Medium | 60 |
| useOpenDispute | Mutation | Open new dispute | Medium | 70 |
| useCommitVote | Mutation | Submit hidden vote | High | 100 |
| useRevealVote | Mutation | Reveal plaintext vote | High | 90 |
| useExecuteRuling | Mutation | Execute ruling | Low | 40 |
| useDisputeEvents | Subscription | Real-time updates | Medium | 80 |

### 1.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   React Components                      │
│  (DisputeDetailPage, MyDisputesPage, etc.)             │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ├─ useDisputeDetails() ────┐
                  ├─ useMyDisputes() ─────────┤
                  ├─ useAllDisputes() ────────┤
                  ├─ useOpenDispute() ────────┤
                  ├─ useCommitVote() ─────────┤
                  ├─ useRevealVote() ─────────┤
                  ├─ useExecuteRuling() ──────┤
                  └─ useDisputeEvents() ──────┤
                  │                           │
                  ▼                           ▼
        ┌──────────────────┐      ┌──────────────────┐
        │ useBlockchainQuery│     │ useBlockchainTx  │
        │ (React Query)     │     │ (Transaction)    │
        └────────┬──────────┘     └────────┬─────────┘
                 │                         │
                 └────────┬────────────────┘
                          │
                          ▼
                ┌──────────────────┐
                │  Polkadot.js API │
                │  (getApi())      │
                └────────┬─────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ bazari-chain     │
                │ (Substrate Node) │
                └──────────────────┘
```

### 1.3 Dependencies

**Required**:
- `@tanstack/react-query` (v4.36+) - Query/mutation management
- `@polkadot/api` (v10.11+) - Blockchain interface
- `crypto-js` (v4.2+) - Commit-reveal hashing

**Internal**:
- `useBlockchainQuery` - Generic blockchain query wrapper
- `useBlockchainTx` - Generic blockchain transaction wrapper
- `useWallet` - User wallet context

---

## 2. Query Hooks

### 2.1 Hook: useDisputeDetails

**File**: `/src/hooks/blockchain/useDisputeDetails.ts`

**Purpose**: Fetch complete dispute data by ID with real-time polling

**Signature**:
```typescript
function useDisputeDetails(
  disputeId: number,
  options?: UseQueryOptions
): UseQueryResult<Dispute, Error>
```

**Types**:
```typescript
export interface Dispute {
  id: number;
  orderId: number;
  plaintiff: string; // AccountId
  defendant: string; // AccountId
  plaintiffRole: 'BUYER' | 'SELLER';
  defendantRole: 'BUYER' | 'SELLER';
  jurors: string[]; // 5 AccountIds
  status: DisputeStatus;
  evidenceCID: string; // IPFS CID
  description: string;
  votes: Vote[];
  ruling?: Ruling;
  committedCount: number;
  revealedCount: number;
  commitPhaseEnd: number; // block number
  revealPhaseEnd: number; // block number
  createdAt: number; // block number
  resolvedAt?: number; // block number
  vrfSeed?: string; // for VRF verification
}

export type DisputeStatus = 'OPENED' | 'COMMIT' | 'REVEAL' | 'RESOLVED';

export interface Vote {
  juror: string; // AccountId
  voteHash?: string; // keccak256(vote + salt)
  vote?: VoteType;
  partialSplit?: number; // 0-100 (buyer percent)
  revealed: boolean;
}

export type VoteType = 'RefundBuyer' | 'ReleaseSeller' | 'PartialRefund';

export interface Ruling {
  type: VoteType;
  partialSplit?: { buyerPercent: number; sellerPercent: number };
  voteBreakdown: {
    refundBuyer: number;
    releaseSeller: number;
    partialRefund: number;
  };
  execution: {
    executed: boolean;
    blockNumber?: number;
    txHash?: string;
    buyerReceived: string; // BZR amount
    sellerReceived: string;
    feeRefundedTo: 'buyer' | 'seller';
  };
}
```

**Implementation**:
```typescript
import { useBlockchainQuery } from '@/hooks/useBlockchainQuery';
import { getApi } from '@/services/polkadot';
import { parseDisputeData } from '@/utils/blockchain/dispute';

export function useDisputeDetails(
  disputeId: number,
  options?: UseQueryOptions
) {
  return useBlockchainQuery<Dispute>(
    ['dispute', disputeId],
    async () => {
      const api = await getApi();

      // Query dispute from storage
      const disputeRaw = await api.query.bazariDispute.disputes(disputeId);

      if (disputeRaw.isNone) {
        throw new Error(`Dispute #${disputeId} not found`);
      }

      const dispute = disputeRaw.unwrap();

      // Query votes for all jurors
      const votesRaw = await api.query.bazariDispute.disputeVotes.multi(
        dispute.jurors.map(juror => [disputeId, juror])
      );

      const votes: Vote[] = votesRaw.map((voteRaw, i) => {
        if (voteRaw.isNone) {
          return {
            juror: dispute.jurors[i].toString(),
            revealed: false,
          };
        }

        const v = voteRaw.unwrap();
        return {
          juror: dispute.jurors[i].toString(),
          voteHash: v.hash?.toHex(),
          vote: v.vote?.toString() as VoteType,
          partialSplit: v.partialSplit?.toNumber(),
          revealed: v.revealed.isTrue,
        };
      });

      // Determine current phase
      const currentBlock = await api.query.system.number();
      const currentBlockNum = currentBlock.toNumber();

      let status: DisputeStatus = 'OPENED';
      if (dispute.ruling.isSome) {
        status = 'RESOLVED';
      } else if (currentBlockNum >= dispute.revealPhaseEnd.toNumber()) {
        status = 'REVEAL';
      } else if (currentBlockNum >= dispute.commitPhaseEnd.toNumber()) {
        status = 'REVEAL';
      } else if (dispute.jurors.length === 5) {
        status = 'COMMIT';
      }

      // Parse ruling (if resolved)
      const ruling: Ruling | undefined = dispute.ruling.isSome
        ? parseRuling(dispute.ruling.unwrap())
        : undefined;

      // Calculate vote counts
      const committedCount = votes.filter(v => v.voteHash).length;
      const revealedCount = votes.filter(v => v.revealed).length;

      return {
        id: disputeId,
        orderId: dispute.orderId.toNumber(),
        plaintiff: dispute.plaintiff.toString(),
        defendant: dispute.defendant.toString(),
        plaintiffRole: dispute.plaintiffRole.toString() as 'BUYER' | 'SELLER',
        defendantRole: dispute.defendantRole.toString() as 'BUYER' | 'SELLER',
        jurors: dispute.jurors.map(j => j.toString()),
        status,
        evidenceCID: dispute.evidenceCID.toString(),
        description: dispute.description.toString(),
        votes,
        ruling,
        committedCount,
        revealedCount,
        commitPhaseEnd: dispute.commitPhaseEnd.toNumber(),
        revealPhaseEnd: dispute.revealPhaseEnd.toNumber(),
        createdAt: dispute.createdAt.toNumber(),
        resolvedAt: dispute.resolvedAt?.toNumber(),
        vrfSeed: dispute.vrfSeed?.toHex(),
      };
    },
    {
      // Polling: Refetch every 30s during active voting
      refetchInterval: (data) => {
        if (!data) return false;
        if (data.status === 'RESOLVED') return false;
        return 30000; // 30 seconds
      },
      staleTime: 10000, // Consider stale after 10s
      cacheTime: 300000, // Cache for 5 minutes
      ...options,
    }
  );
}

// Helper: Parse ruling from on-chain format
function parseRuling(rulingRaw: any): Ruling {
  const type = rulingRaw.type.toString() as VoteType;

  // Parse vote breakdown from events or storage
  const voteBreakdown = {
    refundBuyer: rulingRaw.voteBreakdown?.refundBuyer?.toNumber() || 0,
    releaseSeller: rulingRaw.voteBreakdown?.releaseSeller?.toNumber() || 0,
    partialRefund: rulingRaw.voteBreakdown?.partialRefund?.toNumber() || 0,
  };

  return {
    type,
    partialSplit: rulingRaw.partialSplit
      ? {
          buyerPercent: rulingRaw.partialSplit.buyer.toNumber(),
          sellerPercent: rulingRaw.partialSplit.seller.toNumber(),
        }
      : undefined,
    voteBreakdown,
    execution: {
      executed: rulingRaw.executed.isTrue,
      blockNumber: rulingRaw.executionBlock?.toNumber(),
      txHash: rulingRaw.executionTxHash?.toHex(),
      buyerReceived: rulingRaw.buyerReceived.toString(),
      sellerReceived: rulingRaw.sellerReceived.toString(),
      feeRefundedTo: rulingRaw.feeRefundedTo.toString() as 'buyer' | 'seller',
    },
  };
}
```

**Usage**:
```tsx
const { data: dispute, isLoading, error } = useDisputeDetails(123);

if (isLoading) return <Skeleton />;
if (error) return <Alert variant="error">{error.message}</Alert>;

return <DisputeHeader dispute={dispute} />;
```

**Performance Notes**:
- Uses React Query cache (5 min)
- Auto-refetch every 30s during voting
- Stops polling when resolved
- Multi-query optimization (single batch for all juror votes)

---

### 2.2 Hook: useMyDisputes

**File**: `/src/hooks/blockchain/useMyDisputes.ts`

**Purpose**: Fetch user's disputes (as plaintiff, defendant, or juror)

**Signature**:
```typescript
function useMyDisputes(): UseQueryResult<{
  asPlaintiff: Dispute[];
  asDefendant: Dispute[];
  asJuror: Dispute[];
}, Error>
```

**Implementation**:
```typescript
import { useWallet } from '@/hooks/useWallet';
import { useBlockchainQuery } from '@/hooks/useBlockchainQuery';

export function useMyDisputes() {
  const { address } = useWallet();

  return useBlockchainQuery(
    ['myDisputes', address],
    async () => {
      // IMPORTANT: In production, replace this with indexed backend API
      // Direct blockchain query is inefficient for large datasets
      // Use: GET /api/users/:address/disputes

      const response = await fetch(`/api/users/${address}/disputes`);
      if (!response.ok) throw new Error('Failed to fetch disputes');

      const data = await response.json();

      return {
        asPlaintiff: data.asPlaintiff.map(parseDisputeSummary),
        asDefendant: data.asDefendant.map(parseDisputeSummary),
        asJuror: data.asJuror.map(parseDisputeSummary),
      };
    },
    {
      enabled: !!address,
      staleTime: 60000, // 1 minute
      cacheTime: 300000,
    }
  );
}

// Lightweight dispute summary (not full details)
interface DisputeSummary {
  id: number;
  plaintiff: { address: string; avatar?: string };
  defendant: { address: string; avatar?: string };
  status: DisputeStatus;
  createdAt: Date;
  voteStatus?: 'pending' | 'committed' | 'revealed'; // if juror
}

function parseDisputeSummary(raw: any): DisputeSummary {
  return {
    id: raw.id,
    plaintiff: {
      address: raw.plaintiff,
      avatar: raw.plaintiffAvatar,
    },
    defendant: {
      address: raw.defendant,
      avatar: raw.defendantAvatar,
    },
    status: raw.status,
    createdAt: new Date(raw.createdAt),
    voteStatus: raw.voteStatus,
  };
}
```

**Backend API** (Required):
```typescript
// File: /src/pages/api/users/[address]/disputes.ts

export default async function handler(req, res) {
  const { address } = req.query;

  // Query PostgreSQL (disputes indexed from blockchain)
  const asPlaintiff = await db.disputes.findMany({
    where: { plaintiff: address },
    select: { id: true, plaintiff: true, defendant: true, status: true, createdAt: true },
  });

  const asDefendant = await db.disputes.findMany({
    where: { defendant: address },
  });

  const asJuror = await db.disputeVotes.findMany({
    where: { juror: address },
    include: { dispute: true },
  });

  res.json({
    asPlaintiff,
    asDefendant,
    asJuror: asJuror.map(vote => ({
      ...vote.dispute,
      voteStatus: vote.revealed ? 'revealed' : vote.hash ? 'committed' : 'pending',
    })),
  });
}
```

**Usage**:
```tsx
const { data } = useMyDisputes();

<Tabs>
  <TabsContent value="plaintiff">
    {data?.asPlaintiff.map(dispute => (
      <DisputeCard key={dispute.id} dispute={dispute} />
    ))}
  </TabsContent>
</Tabs>
```

---

### 2.3 Hook: useAllDisputes (Admin)

**File**: `/src/hooks/blockchain/useAllDisputes.ts`

**Purpose**: Fetch all disputes for DAO dashboard

**Signature**:
```typescript
function useAllDisputes(filters?: {
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}): UseQueryResult<{
  disputes: Dispute[];
  topJurors: Juror[];
  stats: DisputeStats;
}, Error>
```

**Implementation**:
```typescript
export function useAllDisputes(filters?: {
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  return useBlockchainQuery(
    ['allDisputes', filters],
    async () => {
      // Backend API only (never direct blockchain query)
      const response = await fetch('/api/admin/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      });

      if (!response.ok) throw new Error('Failed to fetch disputes');

      return response.json();
    },
    {
      staleTime: 60000,
      cacheTime: 300000,
    }
  );
}

interface DisputeStats {
  total: number;
  resolved: number;
  pending: number;
  avgTime: number; // hours
  resolvedPercent: number;
  pendingPercent: number;
  rulings: {
    refundBuyer: number;
    releaseSeller: number;
    partialRefund: number;
    refundBuyerPercent: number;
    releaseSellerPercent: number;
    partialRefundPercent: number;
  };
}

interface Juror {
  address: string;
  casesJudged: number;
  participationRate: number; // 0-100%
  reputation: number;
}
```

---

## 3. Mutation Hooks

### 3.1 Hook: useOpenDispute

**File**: `/src/hooks/blockchain/useOpenDispute.ts`

**Purpose**: Open new dispute (lock 50 BZR fee, upload evidence)

**Signature**:
```typescript
function useOpenDispute(): UseMutationResult<
  { disputeId: number; txHash: string },
  Error,
  OpenDisputeParams
>

interface OpenDisputeParams {
  orderId: number;
  evidenceCID: string; // IPFS CID (upload before mutation)
  description: string; // max 500 chars
}
```

**Implementation**:
```typescript
import { useBlockchainTx } from '@/hooks/useBlockchainTx';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/Toast';

export function useOpenDispute() {
  const queryClient = useQueryClient();

  return useBlockchainTx(
    'openDispute',
    async (params: OpenDisputeParams) => {
      const api = await getApi();

      // Validate params
      if (params.description.length > 500) {
        throw new Error('Description must be 500 characters or less');
      }

      if (!params.evidenceCID.startsWith('Qm')) {
        throw new Error('Invalid IPFS CID');
      }

      // Build transaction
      const tx = api.tx.bazariDispute.openDispute(
        params.orderId,
        params.evidenceCID,
        params.description
      );

      return tx;
    },
    {
      onSuccess: (result, variables) => {
        // Extract dispute ID from event
        const disputeId = extractDisputeIdFromEvents(result.events);

        // Invalidate queries
        queryClient.invalidateQueries(['myDisputes']);
        queryClient.invalidateQueries(['order', variables.orderId]);

        // Success toast
        toast.success('Dispute opened! Jurors are being selected.', {
          action: {
            label: 'View Dispute',
            onClick: () => window.location.href = `/app/disputes/${disputeId}`,
          },
        });

        return { disputeId, txHash: result.txHash };
      },
      onError: (error) => {
        // Handle specific errors
        if (error.message.includes('InsufficientBalance')) {
          toast.error('Insufficient balance. You need 50 BZR to open a dispute.');
        } else if (error.message.includes('DisputeAlreadyExists')) {
          toast.error('A dispute already exists for this order.');
        } else {
          toast.error(`Failed to open dispute: ${error.message}`);
        }
      },
    }
  );
}

// Helper: Extract dispute ID from emitted events
function extractDisputeIdFromEvents(events: any[]): number {
  const disputeEvent = events.find(e =>
    e.event?.section === 'bazariDispute' &&
    e.event?.method === 'DisputeOpened'
  );

  if (!disputeEvent) throw new Error('DisputeOpened event not found');

  return disputeEvent.event.data[0].toNumber(); // First param is disputeId
}
```

**Usage**:
```tsx
const { mutate: openDispute, isLoading } = useOpenDispute();

const handleSubmit = async () => {
  // 1. Upload evidence to IPFS first
  const evidenceCID = await uploadToIPFS(files);

  // 2. Open dispute
  openDispute({
    orderId: 123,
    evidenceCID,
    description: 'Seller sent wrong item',
  });
};
```

**Pre-Flight Checks**:
```tsx
// Check balance before showing form
const { data: balance } = useBalance(address);

if (balance < 50) {
  return (
    <Alert variant="error">
      Insufficient balance. You need 50 BZR to open a dispute.
      <Button variant="link" href="/app/wallet">Add Funds</Button>
    </Alert>
  );
}
```

---

### 3.2 Hook: useCommitVote

**File**: `/src/hooks/blockchain/useCommitVote.ts`

**Purpose**: Submit hidden vote (commit phase, hash vote + salt)

**Signature**:
```typescript
function useCommitVote(): UseMutationResult<
  { txHash: string },
  Error,
  CommitVoteParams
>

interface CommitVoteParams {
  disputeId: number;
  vote: VoteType;
  partialSplit?: number; // 0-100 (buyer percent), required if vote === 'PartialRefund'
}
```

**Implementation**:
```typescript
import CryptoJS from 'crypto-js';
import { useBlockchainTx } from '@/hooks/useBlockchainTx';
import { toast } from '@/components/ui/Toast';

export function useCommitVote() {
  return useBlockchainTx(
    'commitVote',
    async (params: CommitVoteParams) => {
      const api = await getApi();

      // Validate partial split
      if (params.vote === 'PartialRefund' && params.partialSplit === undefined) {
        throw new Error('Partial split is required for PartialRefund vote');
      }

      if (params.partialSplit !== undefined && (params.partialSplit < 0 || params.partialSplit > 100)) {
        throw new Error('Partial split must be between 0 and 100');
      }

      // Generate random salt (32 bytes)
      const salt = CryptoJS.lib.WordArray.random(32).toString();

      // Create vote payload
      const votePayload = JSON.stringify({
        vote: params.vote,
        partialSplit: params.partialSplit,
      });

      // Hash: keccak256(votePayload + salt)
      const voteHash = CryptoJS.SHA3(votePayload + salt, { outputLength: 256 }).toString();

      // CRITICAL: Store salt and vote in localStorage (needed for reveal)
      localStorage.setItem(`dispute_${params.disputeId}_salt`, salt);
      localStorage.setItem(`dispute_${params.disputeId}_vote`, votePayload);

      // Build transaction
      const tx = api.tx.bazariDispute.commitVote(
        params.disputeId,
        `0x${voteHash}` // hex format
      );

      return { tx, salt, votePayload };
    },
    {
      onSuccess: (result, variables) => {
        const { salt } = result;

        // Show salt backup modal (CRITICAL UX)
        showSaltBackupModal(variables.disputeId, salt);

        // Invalidate queries
        queryClient.invalidateQueries(['dispute', variables.disputeId]);
        queryClient.invalidateQueries(['myDisputes']);

        toast.success('Vote committed! Remember to reveal in 24h.', {
          duration: 10000,
        });
      },
      onError: (error) => {
        if (error.message.includes('CommitPhaseEnded')) {
          toast.error('Commit phase has ended. You cannot vote now.');
        } else if (error.message.includes('AlreadyVoted')) {
          toast.error('You have already committed a vote for this dispute.');
        } else {
          toast.error(`Failed to commit vote: ${error.message}`);
        }
      },
    }
  );
}

// Salt Backup Modal (show after commit)
function showSaltBackupModal(disputeId: number, salt: string) {
  // Implementation in UI layer
  // Modal with:
  // - Salt display (copyable)
  // - Warning: "Save this recovery code!"
  // - Download as .txt button
  // - Checkbox: "I have saved my recovery code"
  // - Cannot close until checkbox checked
}
```

**Usage**:
```tsx
const { mutate: commitVote, isLoading } = useCommitVote();

const handleCommit = () => {
  commitVote({
    disputeId: 123,
    vote: 'RefundBuyer',
  });
};
```

**LocalStorage Schema**:
```json
{
  "dispute_123_salt": "a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
  "dispute_123_vote": "{\"vote\":\"RefundBuyer\",\"partialSplit\":null}"
}
```

---

### 3.3 Hook: useRevealVote

**File**: `/src/hooks/blockchain/useRevealVote.ts`

**Purpose**: Reveal plaintext vote + salt (reveal phase)

**Signature**:
```typescript
function useRevealVote(): UseMutationResult<
  { txHash: string },
  Error,
  RevealVoteParams
>

interface RevealVoteParams {
  disputeId: number;
  salt?: string; // optional manual input (fallback if localStorage cleared)
}
```

**Implementation**:
```typescript
export function useRevealVote() {
  return useBlockchainTx(
    'revealVote',
    async (params: RevealVoteParams) => {
      const api = await getApi();

      // Retrieve salt from localStorage or params
      let salt = params.salt;
      if (!salt) {
        salt = localStorage.getItem(`dispute_${params.disputeId}_salt`);
      }

      if (!salt) {
        throw new Error(
          'Salt not found. Please enter your recovery code manually.'
        );
      }

      // Retrieve vote payload
      const votePayload = localStorage.getItem(`dispute_${params.disputeId}_vote`);
      if (!votePayload) {
        throw new Error('Vote not found. Did you commit a vote?');
      }

      const { vote, partialSplit } = JSON.parse(votePayload);

      // Verify hash locally before submitting (optional but recommended)
      const expectedHash = CryptoJS.SHA3(votePayload + salt, { outputLength: 256 }).toString();
      // Could fetch committed hash from chain and compare

      // Build transaction
      const tx = api.tx.bazariDispute.revealVote(
        params.disputeId,
        vote,
        partialSplit !== undefined ? partialSplit : null,
        salt
      );

      return tx;
    },
    {
      onSuccess: (result, variables) => {
        // Clear localStorage (salt no longer needed)
        localStorage.removeItem(`dispute_${variables.disputeId}_salt`);
        localStorage.removeItem(`dispute_${variables.disputeId}_vote`);

        // Invalidate queries
        queryClient.invalidateQueries(['dispute', variables.disputeId]);
        queryClient.invalidateQueries(['myDisputes']);

        toast.success('Vote revealed! Waiting for other jurors...');
      },
      onError: (error) => {
        if (error.message.includes('InvalidSalt')) {
          toast.error('Invalid salt. Your vote hash doesn\'t match the committed hash.');
        } else if (error.message.includes('RevealPhaseEnded')) {
          toast.error('Reveal phase has ended. Your vote was not counted.');
        } else if (error.message.includes('NotCommitted')) {
          toast.error('You didn\'t commit a vote during the commit phase.');
        } else {
          toast.error(`Failed to reveal vote: ${error.message}`);
        }
      },
    }
  );
}
```

**Usage**:
```tsx
const { mutate: revealVote, isLoading } = useRevealVote();

const handleReveal = () => {
  // Auto-retrieve from localStorage
  revealVote({ disputeId: 123 });
};

// Manual salt input (if localStorage cleared)
const handleManualReveal = (manualSalt: string) => {
  revealVote({ disputeId: 123, salt: manualSalt });
};
```

---

### 3.4 Hook: useExecuteRuling

**File**: `/src/hooks/blockchain/useExecuteRuling.ts`

**Purpose**: Execute ruling (auto-triggered by blockchain, manual fallback)

**Signature**:
```typescript
function useExecuteRuling(): UseMutationResult<
  { txHash: string },
  Error,
  { disputeId: number }
>
```

**Implementation**:
```typescript
export function useExecuteRuling() {
  return useBlockchainTx(
    'executeRuling',
    async (params: { disputeId: number }) => {
      const api = await getApi();
      return api.tx.bazariDispute.executeRuling(params.disputeId);
    },
    {
      onSuccess: (result, variables) => {
        queryClient.invalidateQueries(['dispute', variables.disputeId]);
        queryClient.invalidateQueries(['myDisputes']);
        queryClient.invalidateQueries(['order']); // Escrow updated

        toast.success('Ruling executed! Funds have been distributed.');
      },
      onError: (error) => {
        if (error.message.includes('InsufficientQuorum')) {
          toast.error('Insufficient juror participation. Cannot execute ruling.');
        } else {
          toast.error(`Failed to execute ruling: ${error.message}`);
        }
      },
    }
  );
}
```

**Note**: Usually auto-triggered by blockchain after reveal phase. Manual execution is rare fallback.

---

## 4. Subscription Hooks

### 4.1 Hook: useDisputeEvents

**File**: `/src/hooks/blockchain/useDisputeEvents.ts`

**Purpose**: Real-time dispute updates via WebSocket event stream

**Signature**:
```typescript
function useDisputeEvents(disputeId: number): void
```

**Implementation**:
```typescript
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getApi } from '@/services/polkadot';
import { toast } from '@/components/ui/Toast';

export function useDisputeEvents(disputeId: number) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const subscribeToEvents = async () => {
      const api = await getApi();

      // Subscribe to all system events
      unsubscribe = await api.query.system.events((events) => {
        events.forEach((record) => {
          const { event } = record;

          // VoteCommitted
          if (api.events.bazariDispute.VoteCommitted.is(event)) {
            const [id, juror] = event.data;
            if (id.toNumber() === disputeId) {
              // Invalidate to refetch updated vote count
              queryClient.invalidateQueries(['dispute', disputeId]);

              toast.info(`Juror ${truncateAddress(juror.toString())} committed a vote`);
            }
          }

          // VoteRevealed
          if (api.events.bazariDispute.VoteRevealed.is(event)) {
            const [id, juror] = event.data;
            if (id.toNumber() === disputeId) {
              queryClient.invalidateQueries(['dispute', disputeId]);

              toast.info(`Juror ${truncateAddress(juror.toString())} revealed their vote`);
            }
          }

          // VotingEnded
          if (api.events.bazariDispute.VotingEnded.is(event)) {
            const [id] = event.data;
            if (id.toNumber() === disputeId) {
              queryClient.invalidateQueries(['dispute', disputeId]);

              toast.success('Voting has ended! Tallying results...');
            }
          }

          // RulingExecuted
          if (api.events.bazariDispute.RulingExecuted.is(event)) {
            const [id, ruling] = event.data;
            if (id.toNumber() === disputeId) {
              queryClient.invalidateQueries(['dispute', disputeId]);

              toast.success(`Ruling executed: ${ruling.toString()}`);
            }
          }
        });
      });
    };

    subscribeToEvents();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [disputeId, queryClient]);
}
```

**Usage**:
```tsx
// In DisputeDetailPage
useDisputeEvents(disputeId);

// Component will auto-update when events fire
```

**Events Monitored**:
- `DisputeOpened` - New dispute created
- `JurorsSelected` - VRF completed
- `VoteCommitted` - Juror committed vote
- `VoteRevealed` - Juror revealed vote
- `VotingEnded` - Tally completed
- `RulingExecuted` - Funds distributed

---

## 5. Helper Utilities

### 5.1 Utility: uploadToIPFS

**File**: `/src/utils/ipfs.ts`

**Purpose**: Upload evidence files to IPFS before opening dispute

```typescript
import { create } from 'ipfs-http-client';

const ipfs = create({ url: process.env.NEXT_PUBLIC_IPFS_API });

export async function uploadToIPFS(files: File[]): Promise<string> {
  // Upload multiple files as directory
  const results = [];

  for (const file of files) {
    const result = await ipfs.add(file);
    results.push({
      path: file.name,
      cid: result.cid.toString(),
    });
  }

  // If single file, return CID directly
  if (results.length === 1) {
    return results[0].cid;
  }

  // If multiple files, wrap in directory and return directory CID
  const directory = await ipfs.add(
    results.map(r => ({ path: r.path, content: r.cid })),
    { wrapWithDirectory: true }
  );

  return directory.cid.toString();
}
```

**Usage**:
```tsx
const handleEvidenceUpload = async (files: File[]) => {
  try {
    setUploading(true);
    const cid = await uploadToIPFS(files);
    setEvidenceCID(cid);
    toast.success('Evidence uploaded to IPFS');
  } catch (error) {
    toast.error('Failed to upload evidence');
  } finally {
    setUploading(false);
  }
};
```

### 5.2 Utility: blockToTimestamp

**File**: `/src/utils/blockchain.ts`

**Purpose**: Convert block number to estimated timestamp

```typescript
const BLOCK_TIME = 6000; // 6 seconds in ms

export function blockToTimestamp(blockNumber: number, currentBlock?: number): Date {
  if (!currentBlock) {
    // Use current time as reference for current block
    return new Date();
  }

  const blockDiff = blockNumber - currentBlock;
  const timeDiff = blockDiff * BLOCK_TIME;

  return new Date(Date.now() + timeDiff);
}

export function blockToDate(blockNumber: number): Date {
  // Assuming block 0 = genesis time
  const genesisTime = new Date('2024-01-01T00:00:00Z').getTime();
  return new Date(genesisTime + blockNumber * BLOCK_TIME);
}
```

---

## 6. Error Handling

### 6.1 Error Types

```typescript
export class DisputeError extends Error {
  constructor(
    message: string,
    public code: DisputeErrorCode,
    public details?: any
  ) {
    super(message);
    this.name = 'DisputeError';
  }
}

export enum DisputeErrorCode {
  DISPUTE_NOT_FOUND = 'DISPUTE_NOT_FOUND',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  ALREADY_VOTED = 'ALREADY_VOTED',
  INVALID_SALT = 'INVALID_SALT',
  COMMIT_PHASE_ENDED = 'COMMIT_PHASE_ENDED',
  REVEAL_PHASE_ENDED = 'REVEAL_PHASE_ENDED',
  INSUFFICIENT_QUORUM = 'INSUFFICIENT_QUORUM',
  NOT_AUTHORIZED = 'NOT_AUTHORIZED',
}
```

### 6.2 Error Handling Pattern

```typescript
try {
  await openDispute({ orderId, evidenceCID, description });
} catch (error) {
  if (error instanceof DisputeError) {
    switch (error.code) {
      case DisputeErrorCode.INSUFFICIENT_BALANCE:
        toast.error('You need 50 BZR to open a dispute.');
        break;
      case DisputeErrorCode.NOT_AUTHORIZED:
        toast.error('You are not authorized to open this dispute.');
        break;
      default:
        toast.error(error.message);
    }
  } else {
    toast.error('An unexpected error occurred');
    console.error(error);
  }
}
```

---

## 7. Testing

### 7.1 Unit Tests

**Example: useCommitVote.test.ts**
```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCommitVote } from './useCommitVote';
import { wrapper } from '@/test-utils';

describe('useCommitVote', () => {
  it('generates random salt', async () => {
    const { result } = renderHook(() => useCommitVote(), { wrapper });

    await act(async () => {
      result.current.mutate({
        disputeId: 123,
        vote: 'RefundBuyer',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Check localStorage
    const salt = localStorage.getItem('dispute_123_salt');
    expect(salt).toBeTruthy();
    expect(salt).toHaveLength(64); // 32 bytes hex
  });

  it('stores vote payload', async () => {
    const { result } = renderHook(() => useCommitVote(), { wrapper });

    await act(async () => {
      result.current.mutate({
        disputeId: 123,
        vote: 'PartialRefund',
        partialSplit: 60,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const votePayload = localStorage.getItem('dispute_123_vote');
    expect(JSON.parse(votePayload)).toEqual({
      vote: 'PartialRefund',
      partialSplit: 60,
    });
  });

  it('throws error if partial split missing for PartialRefund', async () => {
    const { result } = renderHook(() => useCommitVote(), { wrapper });

    await act(async () => {
      result.current.mutate({
        disputeId: 123,
        vote: 'PartialRefund',
        // partialSplit missing
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.message).toContain('Partial split is required');
  });
});
```

### 7.2 Integration Tests

**Example: Commit-Reveal Flow**
```typescript
describe('Commit-Reveal Flow', () => {
  it('allows juror to commit and reveal vote', async () => {
    const { result: commitResult } = renderHook(() => useCommitVote(), { wrapper });
    const { result: revealResult } = renderHook(() => useRevealVote(), { wrapper });

    // Step 1: Commit
    await act(async () => {
      commitResult.current.mutate({
        disputeId: 123,
        vote: 'RefundBuyer',
      });
    });

    await waitFor(() => expect(commitResult.current.isSuccess).toBe(true));

    // Verify salt stored
    expect(localStorage.getItem('dispute_123_salt')).toBeTruthy();

    // Step 2: Reveal (auto-retrieve salt)
    await act(async () => {
      revealResult.current.mutate({ disputeId: 123 });
    });

    await waitFor(() => expect(revealResult.current.isSuccess).toBe(true));

    // Verify localStorage cleared
    expect(localStorage.getItem('dispute_123_salt')).toBeNull();
  });
});
```

---

**Document Status**: ✅ COMPLETE
**Total Hooks**: 8 (3 query + 4 mutation + 1 subscription)
**Estimated LOC**: 640 lines (hooks + utilities + tests)
**Dependencies**: React Query, Polkadot.js, CryptoJS

---

## Appendix: Hook Call Graph

```
DisputeDetailPage
├─ useDisputeDetails(disputeId) ──→ Polkadot.js query
├─ useDisputeEvents(disputeId) ───→ WebSocket subscription
├─ useCommitVote() ───────────────→ Polkadot.js tx (if juror)
├─ useRevealVote() ───────────────→ Polkadot.js tx (if juror)
└─ useExecuteRuling() ────────────→ Polkadot.js tx (fallback)

MyDisputesPage
└─ useMyDisputes() ───────────────→ Backend API (indexed)

AdminDisputesDashboardPage
└─ useAllDisputes(filters) ───────→ Backend API (indexed)

OpenDisputeModal (OrderPage)
└─ useOpenDispute() ──────────────→ Polkadot.js tx
```

**Next Steps**: Implement hooks → Build components → Assemble pages → Test → Deploy
