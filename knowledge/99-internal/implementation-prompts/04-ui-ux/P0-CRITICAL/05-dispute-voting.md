# P0-CRITICAL: Dispute Voting System (Commit-Reveal)

**Phase**: P0 | **Priority**: CRITICAL | **Effort**: 8 days | **Pallets**: bazari-dispute

---

## Metadata

- **Prompt ID**: P0-05
- **Created**: 2025-11-14
- **Gap**: 60%
- **Blocks**: P2-01 (admin dispute dashboard)
- **Dependencies**: bazari-dispute pallet deployed, crypto-js for hashing
- **Team**: 1-2 frontend developers
- **Skills**: React, TypeScript, Polkadot.js, cryptography (hashing, commit-reveal)

---

## 1. Context

### 1.1 Problem Statement

The **bazari-dispute** pallet implements a sophisticated dispute resolution system with:
- VRF-based juror selection (random, weighted by stake)
- Commit-reveal voting (prevents vote manipulation)
- 24-hour commit phase → 24-hour reveal phase
- Minimum 5 jurors, majority wins

However, the frontend has **60% gap**:

**Missing**:
- ❌ No dispute detail page
- ❌ No commit-reveal voting UI (most complex feature)
- ❌ No voting phase timers (commit vs reveal)
- ❌ No juror panel display
- ❌ No dispute evidence viewer
- ❌ No VRF selection transparency UI
- ❌ No voting status visualization

**Existing**:
- ⚠️ OrderPage shows dispute link but no dispute UI
- ⚠️ No voting interface

**User Impact**:
- Jurors cannot vote on disputes
- No transparency in voting process
- Buyers cannot open disputes
- DAO cannot manage disputes

### 1.2 Commit-Reveal Voting Explained

**Why Commit-Reveal?**
Prevents vote manipulation:
1. **Commit Phase** (24h): Juror submits `hash(vote + salt)` to blockchain
2. **Reveal Phase** (24h): Juror reveals actual vote + salt
3. **Verification**: Blockchain verifies `hash(revealed_vote + salt) == committed_hash`

**Example**:
```typescript
// Commit Phase
const vote = 'RefundBuyer';
const salt = crypto.randomBytes(32).toString('hex');
const voteHash = sha256(vote + salt);
await api.tx.bazariDispute.commitVote(disputeId, voteHash);

// Save salt locally (critical!)
localStorage.setItem(`dispute_${disputeId}_salt`, salt);

// Reveal Phase (24h later)
const savedSalt = localStorage.getItem(`dispute_${disputeId}_salt`);
await api.tx.bazariDispute.revealVote(disputeId, vote, savedSalt);
```

**Critical**: If user loses salt, they cannot reveal vote → lose stake!

### 1.3 Dispute Workflow

```
1. Buyer opens dispute → Escrow frozen
2. VRF selects 5 jurors (random, stake-weighted)
3. Commit phase (24h) → Jurors submit vote hashes
4. Reveal phase (24h) → Jurors reveal actual votes
5. Tally votes → Majority wins
6. Execute ruling → Release/Refund funds
```

**Ruling Options**:
- `RefundBuyer` - Full refund to buyer
- `ReleaseSeller` - Release to seller
- `PartialRefund` - Split funds (e.g., 50/50)

### 1.4 Target State

**3 New Pages**:
1. `/app/orders/:orderId/dispute` - DisputeDetailPage (complete dispute UI)
2. `/app/disputes` - MyDisputesPage (juror dashboard)
3. `/app/admin/disputes` - AdminDisputesDashboard (DAO only)

**5 New Components**:
1. JuryVotingPanel - Commit-reveal voting interface
2. VotingStatus - Phase timers (commit/reveal)
3. JurorList - Display selected jurors with VRF proof
4. DisputeEvidence - Display buyer's evidence (IPFS)
5. VotingResults - Tally display (after reveal)

**4 New Hooks**:
1. `useDisputeDetails(disputeId)` - Query dispute state
2. `useCommitVote()` - Mutation: commit vote hash
3. `useRevealVote()` - Mutation: reveal vote + salt
4. `useDisputeEvents()` - WebSocket: listen to voting events

---

## 2. Implementation Details

### Step 1: Create Hooks

**File**: `apps/web/src/hooks/blockchain/useDispute.ts`

```typescript
import { useBlockchainQuery, useBlockchainTx } from '@/hooks/useBlockchainQuery';
import { useBlockchainEvent } from '@/hooks/useBlockchainEvent';
import { getApi } from '@/services/polkadot';
import { toast } from 'sonner';
import crypto from 'crypto-js';

/**
 * Hook: Get dispute details
 */
export function useDisputeDetails(disputeId?: number) {
  return useBlockchainQuery(
    ['dispute', disputeId],
    async () => {
      if (!disputeId) return null;

      const api = await getApi();
      const dispute = await api.query.bazariDispute.disputes(disputeId);

      if (dispute.isNone) {
        throw new Error('Dispute not found');
      }

      return dispute.unwrap().toJSON();
    },
    {
      enabled: !!disputeId && disputeId > 0,
      staleTime: 10_000, // 10 seconds
      refetchInterval: 15_000 // Auto-refresh every 15s (voting in progress)
    }
  );
}

/**
 * Hook: Commit vote (Phase 1)
 */
export function useCommitVote() {
  const invalidateCache = useInvalidateBlockchainCache();

  return useBlockchainTx(
    async (voteData: {
      disputeId: number;
      vote: 'RefundBuyer' | 'ReleaseSeller' | 'PartialRefund';
    }) => {
      const { disputeId, vote } = voteData;

      // Generate random salt
      const salt = crypto.lib.WordArray.random(32).toString();

      // Compute vote hash
      const voteHash = crypto.SHA256(vote + salt).toString();

      // Save salt to localStorage (CRITICAL!)
      localStorage.setItem(`dispute_${disputeId}_salt`, salt);
      localStorage.setItem(`dispute_${disputeId}_vote`, vote);

      // Submit vote hash to blockchain
      const api = await getApi();
      return api.tx.bazariDispute.commitVote(disputeId, voteHash);
    },
    {
      onSuccess: (result, voteData) => {
        toast.success(
          'Vote committed! Remember to reveal within 24h.',
          {
            duration: 10000,
            action: {
              label: 'Set Reminder',
              onClick: () => {
                // TODO: Set browser notification for reveal phase
              }
            }
          }
        );
        invalidateCache(['dispute']);
      },
      onError: (error) => {
        toast.error(`Failed to commit vote: ${error.message}`);
      }
    }
  );
}

/**
 * Hook: Reveal vote (Phase 2)
 */
export function useRevealVote() {
  const invalidateCache = useInvalidateBlockchainCache();

  return useBlockchainTx(
    async (disputeId: number) => {
      // Retrieve saved salt and vote from localStorage
      const salt = localStorage.getItem(`dispute_${disputeId}_salt`);
      const vote = localStorage.getItem(`dispute_${disputeId}_vote`);

      if (!salt || !vote) {
        throw new Error(
          'Vote not found! You may have cleared your browser data. Cannot reveal vote without salt.'
        );
      }

      const api = await getApi();
      return api.tx.bazariDispute.revealVote(disputeId, vote, salt);
    },
    {
      onSuccess: (result, disputeId) => {
        toast.success('Vote revealed! 🎉');

        // Clear localStorage
        localStorage.removeItem(`dispute_${disputeId}_salt`);
        localStorage.removeItem(`dispute_${disputeId}_vote`);

        invalidateCache(['dispute']);
      },
      onError: (error) => {
        toast.error(`Failed to reveal vote: ${error.message}`);
      }
    }
  );
}

/**
 * Hook: Listen to dispute events
 */
export function useDisputeEvents() {
  const queryClient = useQueryClient();

  useBlockchainEvent('bazariDispute', 'DisputeOpened', (eventData) => {
    queryClient.invalidateQueries(['blockchain', 'disputes']);
    toast.info(`Dispute opened for Order #${eventData.orderId}`, {
      action: {
        label: 'View',
        onClick: () =>
          (window.location.href = `/app/orders/${eventData.orderId}/dispute`)
      }
    });
  });

  useBlockchainEvent('bazariDispute', 'VoteCommitted', (eventData) => {
    queryClient.invalidateQueries(['blockchain', 'dispute']);
  });

  useBlockchainEvent('bazariDispute', 'VotingEnded', (eventData) => {
    queryClient.invalidateQueries(['blockchain', 'dispute']);
    queryClient.invalidateQueries(['blockchain', 'escrow']);
    toast.success(
      `Dispute #${eventData.disputeId} resolved: ${eventData.ruling}`,
      { duration: 8000 }
    );
  });
}
```

---

### Step 2: Create Components

**Component 1: JuryVotingPanel**

**File**: `apps/web/src/components/dispute/JuryVotingPanel.tsx`

```typescript
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Lock, Unlock } from 'lucide-react';
import { useState } from 'react';
import { useCommitVote, useRevealVote } from '@/hooks/blockchain/useDispute';
import { useWalletStore } from '@/stores/wallet';

interface JuryVotingPanelProps {
  dispute: {
    id: number;
    phase: 'Commit' | 'Reveal' | 'Ended';
    jurors: string[];
    votes: any[];
  };
}

export const JuryVotingPanel = ({ dispute }: JuryVotingPanelProps) => {
  const { selectedAccount } = useWalletStore();
  const [selectedVote, setSelectedVote] = useState<string>('');
  const { mutate: commitVote, isLoading: isCommitting } = useCommitVote();
  const { mutate: revealVote, isLoading: isRevealing } = useRevealVote();

  const isJuror = dispute.jurors.includes(selectedAccount?.address || '');
  const hasCommitted =
    localStorage.getItem(`dispute_${dispute.id}_salt`) !== null;
  const canCommit = dispute.phase === 'Commit' && isJuror && !hasCommitted;
  const canReveal = dispute.phase === 'Reveal' && isJuror && hasCommitted;

  const handleCommit = () => {
    if (!selectedVote) {
      toast.error('Please select a vote');
      return;
    }

    commitVote({
      disputeId: dispute.id,
      vote: selectedVote as 'RefundBuyer' | 'ReleaseSeller' | 'PartialRefund'
    });
  };

  const handleReveal = () => {
    revealVote(dispute.id);
  };

  if (!isJuror) {
    return (
      <Alert>
        <AlertDescription>
          You are not selected as a juror for this dispute.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Jury Voting</h3>
          {dispute.phase === 'Commit' && (
            <div className="flex items-center gap-2 text-yellow-600">
              <Lock size={16} />
              <span className="text-sm font-medium">Commit Phase</span>
            </div>
          )}
          {dispute.phase === 'Reveal' && (
            <div className="flex items-center gap-2 text-blue-600">
              <Unlock size={16} />
              <span className="text-sm font-medium">Reveal Phase</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Vote Options */}
        {canCommit && (
          <>
            <RadioGroup value={selectedVote} onValueChange={setSelectedVote}>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="RefundBuyer" id="refund" />
                  <Label htmlFor="refund" className="flex-1 cursor-pointer">
                    <div>
                      <p className="font-medium">Refund Buyer</p>
                      <p className="text-sm text-gray-600">
                        Full refund to buyer, seller gets nothing
                      </p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="ReleaseSeller" id="release" />
                  <Label htmlFor="release" className="flex-1 cursor-pointer">
                    <div>
                      <p className="font-medium">Release to Seller</p>
                      <p className="text-sm text-gray-600">
                        Release payment to seller, buyer gets nothing
                      </p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="PartialRefund" id="partial" />
                  <Label htmlFor="partial" className="flex-1 cursor-pointer">
                    <div>
                      <p className="font-medium">Partial Refund</p>
                      <p className="text-sm text-gray-600">
                        Split funds 50/50 between buyer and seller
                      </p>
                    </div>
                  </Label>
                </div>
              </div>
            </RadioGroup>

            <Alert variant="warning">
              <AlertTriangle size={16} />
              <AlertDescription>
                <strong>Important:</strong> Your vote will be hashed and stored
                locally. Do NOT clear your browser data or you won't be able to
                reveal your vote (and will lose your stake).
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleCommit}
              disabled={isCommitting || !selectedVote}
              className="w-full"
              size="lg"
            >
              {isCommitting ? 'Committing...' : 'Commit Vote (Phase 1)'}
            </Button>
          </>
        )}

        {/* Reveal Phase */}
        {canReveal && (
          <>
            <Alert>
              <AlertDescription>
                You committed to vote:{' '}
                <strong>
                  {localStorage.getItem(`dispute_${dispute.id}_vote`)}
                </strong>
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleReveal}
              disabled={isRevealing}
              className="w-full"
              size="lg"
            >
              {isRevealing ? 'Revealing...' : 'Reveal Vote (Phase 2)'}
            </Button>

            <p className="text-xs text-gray-600">
              By revealing your vote, you confirm your earlier commitment and
              unlock your stake.
            </p>
          </>
        )}

        {/* Already Voted */}
        {hasCommitted && dispute.phase === 'Commit' && (
          <Alert variant="success">
            <AlertDescription>
              ✅ Vote committed! Remember to return during the reveal phase to
              reveal your vote.
            </AlertDescription>
          </Alert>
        )}

        {/* Voting Ended */}
        {dispute.phase === 'Ended' && (
          <Alert>
            <AlertDescription>Voting has ended. Results below.</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
```

**Component 2: VotingStatus**

```typescript
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CountdownTimer } from '@/components/blockchain/CountdownTimer';
import { Clock, Users } from 'lucide-react';

export const VotingStatus = ({ dispute }) => {
  const BLOCK_TIME = 6; // 6 seconds
  const COMMIT_PHASE_BLOCKS = 14400; // 24 hours
  const REVEAL_PHASE_BLOCKS = 14400; // 24 hours

  const commitEndTime = (dispute.createdAt + COMMIT_PHASE_BLOCKS) * BLOCK_TIME;
  const revealEndTime =
    (dispute.createdAt + COMMIT_PHASE_BLOCKS + REVEAL_PHASE_BLOCKS) * BLOCK_TIME;

  const commitProgress =
    (dispute.votes.filter((v) => v.committed).length / dispute.jurors.length) *
    100;
  const revealProgress =
    (dispute.votes.filter((v) => v.revealed).length / dispute.votes.length) * 100;

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-lg mb-4">Voting Progress</h3>

      {/* Commit Phase */}
      {dispute.phase === 'Commit' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Commit Phase</span>
            <span className="text-sm text-gray-600">
              {dispute.votes.filter((v) => v.committed).length} /{' '}
              {dispute.jurors.length} voted
            </span>
          </div>

          <Progress value={commitProgress} className="h-2" />

          <CountdownTimer
            endTime={commitEndTime}
            label="Commit phase ends in"
            showProgress={false}
            warningThreshold={3600} // 1 hour
          />
        </div>
      )}

      {/* Reveal Phase */}
      {dispute.phase === 'Reveal' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Reveal Phase</span>
            <span className="text-sm text-gray-600">
              {dispute.votes.filter((v) => v.revealed).length} /{' '}
              {dispute.votes.length} revealed
            </span>
          </div>

          <Progress value={revealProgress} className="h-2" />

          <CountdownTimer
            endTime={revealEndTime}
            label="Reveal phase ends in"
            showProgress={false}
            warningThreshold={3600} // 1 hour
          />
        </div>
      )}

      {/* Ended */}
      {dispute.phase === 'Ended' && (
        <div className="text-center py-4">
          <p className="font-semibold text-green-600">✅ Voting Complete</p>
          <p className="text-sm text-gray-600 mt-1">
            Ruling executed: {dispute.ruling}
          </p>
        </div>
      )}
    </Card>
  );
};
```

**Component 3: JurorList**

```typescript
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Shield } from 'lucide-react';

export const JurorList = ({ dispute }) => {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users size={20} />
        <h3 className="font-semibold text-lg">Selected Jurors</h3>
        <Badge variant="secondary">{dispute.jurors.length}</Badge>
      </div>

      <div className="space-y-2">
        {dispute.jurors.map((juror, idx) => {
          const vote = dispute.votes.find((v) => v.juror === juror);

          return (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-blue-600" />
                <span className="font-mono text-xs">
                  {juror.slice(0, 6)}...{juror.slice(-4)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {vote?.committed && !vote?.revealed && (
                  <Badge variant="warning">Committed</Badge>
                )}
                {vote?.revealed && (
                  <Badge variant="success">Revealed</Badge>
                )}
                {!vote?.committed && dispute.phase === 'Commit' && (
                  <Badge variant="secondary">Pending</Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-600 mt-4">
        🎲 Jurors were selected using VRF (Verifiable Random Function), weighted
        by stake amount.
      </p>
    </Card>
  );
};
```

**Component 4: DisputeEvidence**

```typescript
import { Card } from '@/components/ui/card';
import { FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const DisputeEvidence = ({ dispute }) => {
  return (
    <Card className="p-6">
      <h3 className="font-semibold text-lg mb-4">Evidence</h3>

      <div className="space-y-3">
        <div>
          <span className="text-sm text-gray-600">Buyer's Claim</span>
          <p className="text-sm mt-1">{dispute.buyerClaim}</p>
        </div>

        {dispute.ipfsCid && (
          <div>
            <span className="text-sm text-gray-600">Supporting Documents</span>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 gap-2"
              asChild
            >
              <a
                href={`https://ipfs.io/ipfs/${dispute.ipfsCid}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText size={16} />
                View IPFS Evidence
                <ExternalLink size={12} />
              </a>
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
```

**Component 5: VotingResults**

```typescript
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp } from 'lucide-react';

export const VotingResults = ({ dispute }) => {
  if (dispute.phase !== 'Ended') {
    return (
      <Card className="p-6">
        <p className="text-center text-gray-500">
          Results will be available after voting ends.
        </p>
      </Card>
    );
  }

  // Tally votes
  const tally = dispute.votes.reduce(
    (acc, vote) => {
      if (vote.revealed) {
        acc[vote.vote] = (acc[vote.vote] || 0) + 1;
      }
      return acc;
    },
    {}
  );

  const total = dispute.votes.filter((v) => v.revealed).length;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={20} />
        <h3 className="font-semibold text-lg">Voting Results</h3>
      </div>

      <div className="space-y-3">
        {Object.entries(tally).map(([vote, count]) => (
          <div key={vote}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">{vote}</span>
              <span className="text-gray-600">
                {count} / {total} ({((count / total) * 100).toFixed(0)}%)
              </span>
            </div>
            <Progress value={(count / total) * 100} className="h-2" />
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm font-medium text-green-900">
          ✅ Ruling: {dispute.ruling}
        </p>
      </div>
    </Card>
  );
};
```

---

### Step 3: Create Pages

**Page 1: DisputeDetailPage**

**File**: `apps/web/src/pages/disputes/DisputeDetailPage.tsx`

```typescript
import { useParams } from 'react-router-dom';
import { useDisputeDetails, useDisputeEvents } from '@/hooks/blockchain/useDispute';
import { JuryVotingPanel } from '@/components/dispute/JuryVotingPanel';
import { VotingStatus } from '@/components/dispute/VotingStatus';
import { JurorList } from '@/components/dispute/JurorList';
import { DisputeEvidence } from '@/components/dispute/DisputeEvidence';
import { VotingResults } from '@/components/dispute/VotingResults';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const DisputeDetailPage = () => {
  const { orderId } = useParams();
  const { data: dispute, isLoading } = useDisputeDetails(Number(orderId));

  // Listen to dispute events (real-time updates)
  useDisputeEvents();

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="container mx-auto p-4">
        <p className="text-center text-gray-500">Dispute not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => window.history.back()}
        className="gap-2"
      >
        <ArrowLeft size={16} />
        Back to Order
      </Button>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dispute #{dispute.id}</h1>
        <p className="text-gray-600">Order #{orderId}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <VotingStatus dispute={dispute} />
          <JurorList dispute={dispute} />
          <VotingResults dispute={dispute} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <DisputeEvidence dispute={dispute} />
          <JuryVotingPanel dispute={dispute} />
        </div>
      </div>
    </div>
  );
};
```

**Page 2: MyDisputesPage** (juror dashboard)
**Page 3: AdminDisputesDashboard** (DAO only)

---

### Step 4: Routing

```typescript
// App.tsx
<Route path="/app/orders/:orderId/dispute" element={<DisputeDetailPage />} />
<Route path="/app/disputes" element={<MyDisputesPage />} />
<Route path="/app/admin/disputes" element={<AdminDisputesDashboard />} />
```

---

## 3. Acceptance Criteria

**Functional**:
- [ ] Dispute detail page displays all info (evidence, jurors, voting status)
- [ ] Commit-reveal voting works correctly (hash verification)
- [ ] Salt is saved to localStorage during commit
- [ ] Reveal phase uses saved salt
- [ ] Warning shown if user tries to clear browser data
- [ ] Phase timers display accurately (commit vs reveal)
- [ ] Voting progress bars update in real-time
- [ ] Results display after voting ends
- [ ] Ruling executes correctly (refund/release)

**Non-Functional**:
- [ ] Page loads in <2s
- [ ] Real-time updates via WebSocket
- [ ] Mobile responsive
- [ ] WCAG 2.1 AA compliant

---

## 4. Testing Checklist

**Unit Tests**:
- [ ] JuryVotingPanel renders correctly
- [ ] Commit vote generates correct hash
- [ ] Reveal vote verifies hash correctly
- [ ] Salt saved to localStorage
- [ ] Warning shown if salt missing

**Integration Tests**:
- [ ] Full commit-reveal flow: Commit → Wait → Reveal
- [ ] Hash verification: Reveal matches commit
- [ ] Multiple jurors voting in parallel

**Manual Tests**:
- [ ] Create dispute on testnet
- [ ] Commit vote (save salt)
- [ ] Wait for reveal phase (or skip time)
- [ ] Reveal vote (verify salt)
- [ ] Check results
- [ ] Verify ruling execution

---

## 5. Dependencies

**Blockchain**:
- [ ] bazari-dispute pallet deployed
- [ ] VRF juror selection working

**Frontend**:
- [ ] crypto-js: 4.2+ (for SHA256 hashing)

**Install**:
```bash
pnpm add crypto-js
```

---

## 6. Prompt for Claude Code

### PROMPT START

Implement **complete dispute voting system** with commit-reveal voting and VRF juror selection.

**Deliverables**:
1. 4 hooks (useDisputeDetails, useCommitVote, useRevealVote, useDisputeEvents)
2. 5 components (JuryVotingPanel, VotingStatus, JurorList, DisputeEvidence, VotingResults)
3. 3 pages (DisputeDetailPage, MyDisputesPage, AdminDisputesDashboard)

**Key Features**:
- Commit-reveal voting (hash-based)
- Phase timers (commit: 24h, reveal: 24h)
- Juror list with VRF transparency
- Evidence viewer (IPFS)
- Real-time voting progress
- Results tally (after reveal)

**Commit-Reveal Logic**:
```typescript
// Commit
const salt = crypto.lib.WordArray.random(32).toString();
const voteHash = crypto.SHA256(vote + salt).toString();
localStorage.setItem(`dispute_${disputeId}_salt`, salt);
await api.tx.bazariDispute.commitVote(disputeId, voteHash);

// Reveal
const savedSalt = localStorage.getItem(`dispute_${disputeId}_salt`);
await api.tx.bazariDispute.revealVote(disputeId, vote, savedSalt);
```

**Ruling Options**:
- RefundBuyer (full refund)
- ReleaseSeller (release to seller)
- PartialRefund (50/50 split)

**Install Dependencies**:
```bash
pnpm add crypto-js
```

**Create all files, add tests, ensure mobile responsive.**

### PROMPT END

---

**Document Status**: ✅ Complete
**Created**: 2025-11-14
**Effort**: 8 days
