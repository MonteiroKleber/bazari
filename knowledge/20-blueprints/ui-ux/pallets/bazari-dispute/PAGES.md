# bazari-dispute Pages Specification

**Status**: CRITICAL (P0)
**Version**: 1.0
**Last Updated**: 2025-11-14
**Total Pages**: 3
**Related**: UI-SPEC.md, COMPONENTS.md, HOOKS.md

---

## Table of Contents

1. [Pages Overview](#1-pages-overview)
2. [Page 1: DisputeDetailPage](#2-page-1-disputedetailpage)
3. [Page 2: MyDisputesPage](#3-page-2-mydisputespage)
4. [Page 3: AdminDisputesDashboardPage](#4-page-3-admindisputesdashboardpage)
5. [Routing & Navigation](#5-routing--navigation)
6. [SEO & Metadata](#6-seo--metadata)
7. [Error States](#7-error-states)
8. [Loading States](#8-loading-states)

---

## 1. Pages Overview

### 1.1 Summary Table

| Page | Route | Access | Complexity | LOC Est. | Priority |
|------|-------|--------|------------|----------|----------|
| DisputeDetailPage | `/app/disputes/:disputeId` | Public | High | 400 | P0 |
| MyDisputesPage | `/app/disputes` | Authenticated | Medium | 250 | P1 |
| AdminDisputesDashboardPage | `/app/admin/disputes` | DAO Only | Medium | 300 | P2 |

### 1.2 User Journey Map

```
Order Issue
    ↓
OrderPage → "Open Dispute" button
    ↓
DisputeDetailPage (new dispute)
    ↓
VRF selects 5 jurors → Email notification
    ↓
Juror visits MyDisputesPage → "As Juror" tab → "Vote now!" CTA
    ↓
DisputeDetailPage → JuryVotingPanel (Commit)
    ↓
24h later → DisputeDetailPage → JuryVotingPanel (Reveal)
    ↓
Tally → DisputeDetailPage → RulingCard (execution)
    ↓
Parties visit MyDisputesPage → See resolved dispute
    ↓
DAO visits AdminDisputesDashboardPage → Monitor system health
```

---

## 2. Page 1: DisputeDetailPage

**Route**: `/app/disputes/:disputeId`

**File**: `/src/pages/disputes/[disputeId].tsx` (Next.js) or `/src/pages/DisputeDetailPage.tsx` (React Router)

### 2.1 Purpose

The **most complex and critical page** in the dispute system. Serves multiple user roles:
- **Plaintiff/Defendant**: View dispute status, evidence, jurors, and ruling
- **Juror**: View dispute + vote (commit-reveal UI)
- **Observer**: Public transparency (anyone can view)

### 2.2 Page Structure

**Layout** (Desktop 1440px):
```
┌────────────────────────────────────────────────────────────┐
│ Header (AppHeader with user wallet)                       │
├────────────────────────────────────────────────────────────┤
│ Breadcrumb: Home > Disputes > #123                        │
├────────────────────────────────────────────────────────────┤
│ DisputeHeader                                              │
│ [Dispute #123] [Status: COMMIT] [Timeline ──●──○──○]     │
├─────────────────────────┬──────────────────────────────────┤
│ PartiesCard (40%)       │ JurorsCard (60%)                 │
│ Plaintiff vs Defendant  │ 5 jurors + VRF explanation       │
├─────────────────────────┴──────────────────────────────────┤
│ EvidenceViewer                                             │
│ [IPFS Preview] [Download] [Description]                   │
├────────────────────────────────────────────────────────────┤
│ VotingStatus                                               │
│ [Commit Phase Timer] [Progress: 3/5 committed]            │
├────────────────────────────────────────────────────────────┤
│ JuryVotingPanel (if user is juror & voting active)        │
│ [Vote Selection UI] [Commit/Reveal Button]                │
├────────────────────────────────────────────────────────────┤
│ RulingCard (if status === RESOLVED)                       │
│ [Ruling Badge] [Vote Breakdown] [Execution Details]       │
└────────────────────────────────────────────────────────────┘
```

**Layout** (Mobile 375px):
```
┌──────────────────────────────┐
│ Mobile Header                │
├──────────────────────────────┤
│ DisputeHeader                │
│ (Collapsed Timeline)         │
├──────────────────────────────┤
│ PartiesCard (Stacked)        │
├──────────────────────────────┤
│ JurorsCard (Collapsed)       │
├──────────────────────────────┤
│ EvidenceViewer               │
├──────────────────────────────┤
│ VotingStatus                 │
├──────────────────────────────┤
│ [Floating "Vote Now" Button] │
│ (if juror, bottom sheet)     │
├──────────────────────────────┤
│ RulingCard (if resolved)     │
└──────────────────────────────┘
```

### 2.3 Implementation

**File**: `/src/pages/disputes/[disputeId].tsx`

```tsx
import { useParams } from 'react-router-dom';
import { useWallet } from '@/hooks/useWallet';
import { useDisputeDetails } from '@/hooks/blockchain/useDisputeDetails';
import { useDisputeEvents } from '@/hooks/blockchain/useDisputeEvents';
import {
  DisputeHeader,
  PartiesCard,
  EvidenceViewer,
  JurorsCard,
  VotingStatus,
  JuryVotingPanel,
  RulingCard,
} from '@/components/dispute';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function DisputeDetailPage() {
  const { disputeId } = useParams<{ disputeId: string }>();
  const { address } = useWallet();

  // Fetch dispute data
  const {
    data: dispute,
    isLoading,
    error,
    refetch,
  } = useDisputeDetails(Number(disputeId));

  // Real-time updates
  useDisputeEvents(Number(disputeId));

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <DisputeDetailSkeleton />
      </div>
    );
  }

  // Error state
  if (error || !dispute) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="error">
          <h3 className="font-semibold mb-2">Failed to load dispute</h3>
          <p>{error?.message || 'Dispute not found'}</p>
          <button
            onClick={() => refetch()}
            className="mt-3 text-sm underline"
          >
            Retry
          </button>
        </Alert>
      </div>
    );
  }

  // Determine user role
  const isJuror = dispute.jurors.includes(address || '');
  const isPlaintiff = dispute.plaintiff === address;
  const isDefendant = dispute.defendant === address;

  // Get user's vote status (if juror)
  const userVote = dispute.votes.find(v => v.juror === address);
  const hasCommitted = !!userVote?.voteHash;
  const hasRevealed = !!userVote?.revealed;

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Disputes', href: '/app/disputes' },
            { label: `#${dispute.id}`, current: true },
          ]}
          className="mb-6"
        />

        {/* Role Indicator (optional) */}
        {(isPlaintiff || isDefendant || isJuror) && (
          <Alert variant="info" className="mb-6">
            {isPlaintiff && 'You are the plaintiff in this dispute.'}
            {isDefendant && 'You are the defendant in this dispute.'}
            {isJuror && 'You are a juror in this dispute.'}
          </Alert>
        )}

        <div className="space-y-6">
          {/* Section 1: Dispute Header */}
          <DisputeHeader dispute={dispute} />

          {/* Section 2: Parties & Jurors (2-column on desktop) */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
              <PartiesCard
                plaintiff={{
                  address: dispute.plaintiff,
                  role: dispute.plaintiffRole,
                }}
                defendant={{
                  address: dispute.defendant,
                  role: dispute.defendantRole,
                }}
                createdAt={blockToDate(dispute.createdAt)}
              />
            </div>
            <div className="lg:col-span-3">
              <JurorsCard
                jurors={dispute.jurors.map(address => ({
                  address,
                  reputation: 750, // TODO: fetch from chain
                }))}
                vrfSeed={dispute.vrfSeed}
              />
            </div>
          </div>

          {/* Section 3: Evidence */}
          <EvidenceViewer
            evidenceCID={dispute.evidenceCID}
            description={dispute.description}
            uploadedBy={isPlaintiff ? 'plaintiff' : 'defendant'}
          />

          {/* Section 4: Voting Status (if not resolved) */}
          {dispute.status !== 'RESOLVED' && (
            <VotingStatus
              phase={dispute.status}
              commitPhaseEnd={dispute.commitPhaseEnd}
              revealPhaseEnd={dispute.revealPhaseEnd}
              committedCount={dispute.committedCount}
              revealedCount={dispute.revealedCount}
              totalJurors={5}
            />
          )}

          {/* Section 5: Jury Voting Panel (conditional) */}
          {isJuror && dispute.status !== 'RESOLVED' && (
            <JuryVotingPanel
              disputeId={dispute.id}
              phase={dispute.status}
              hasCommitted={hasCommitted}
              hasRevealed={hasRevealed}
            />
          )}

          {/* Section 6: Ruling Card (if resolved) */}
          {dispute.status === 'RESOLVED' && dispute.ruling && (
            <RulingCard
              ruling={dispute.ruling.type}
              partialSplit={dispute.ruling.partialSplit}
              voteBreakdown={dispute.ruling.voteBreakdown}
              execution={dispute.ruling.execution}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

// Skeleton Loader
function DisputeDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64 lg:col-span-3" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
```

### 2.4 Conditional Rendering Logic

**Decision Tree**:
```
IF dispute.status === 'RESOLVED'
  → Show RulingCard
  → Hide VotingStatus
  → Hide JuryVotingPanel

ELSE IF user is NOT juror
  → Show VotingStatus (read-only)
  → Hide JuryVotingPanel

ELSE IF user IS juror
  IF dispute.status === 'COMMIT'
    IF hasCommitted
      → Show "Vote committed" message
    ELSE
      → Show JuryVotingPanel (CommitPhaseUI)

  ELSE IF dispute.status === 'REVEAL'
    IF hasRevealed
      → Show "Vote revealed" message
    ELSE IF hasCommitted
      → Show JuryVotingPanel (RevealPhaseUI)
    ELSE
      → Show "You didn't commit a vote" message
```

### 2.5 Timeline Visualization (Detailed)

**Visual Timeline Component**:
```tsx
function DisputeTimeline({ dispute }: { dispute: Dispute }) {
  const events = [
    {
      label: 'Dispute Opened',
      timestamp: blockToDate(dispute.createdAt),
      icon: '🚨',
      completed: true,
    },
    {
      label: 'Jurors Selected (VRF)',
      timestamp: blockToDate(dispute.createdAt + 10), // ~1 min after
      icon: '⚖️',
      completed: true,
    },
    {
      label: 'Commit Phase',
      timestamp: blockToDate(dispute.createdAt),
      duration: '24 hours',
      icon: '📝',
      completed: dispute.status !== 'OPENED',
      current: dispute.status === 'COMMIT',
    },
    {
      label: 'Reveal Phase',
      timestamp: blockToDate(dispute.commitPhaseEnd),
      duration: '24 hours',
      icon: '🔓',
      completed: ['REVEAL', 'RESOLVED'].includes(dispute.status),
      current: dispute.status === 'REVEAL',
    },
    {
      label: 'Ruling Executed',
      timestamp: dispute.resolvedAt ? blockToDate(dispute.resolvedAt) : undefined,
      icon: '✅',
      completed: dispute.status === 'RESOLVED',
    },
  ];

  return (
    <div className="relative">
      {events.map((event, index) => (
        <div key={index} className="flex gap-4 mb-6">
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                event.completed
                  ? 'bg-green-100'
                  : event.current
                  ? 'bg-blue-100 ring-2 ring-blue-600'
                  : 'bg-gray-100'
              }`}
            >
              {event.icon}
            </div>
            {index < events.length - 1 && (
              <div className={`w-0.5 h-16 ${event.completed ? 'bg-green-600' : 'bg-gray-300'}`} />
            )}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{event.label}</p>
            {event.timestamp && (
              <p className="text-sm text-gray-600">
                {formatDate(event.timestamp, 'PPpp')}
              </p>
            )}
            {event.duration && (
              <p className="text-xs text-gray-500">Duration: {event.duration}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 2.6 Mobile Optimizations

**Mobile-Specific Features**:

1. **Floating Vote Button** (if juror):
```tsx
{isJuror && !hasVoted && dispute.status !== 'RESOLVED' && (
  <div className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
    <Button
      onClick={scrollToVotingPanel}
      className="w-full py-4 text-lg font-semibold shadow-lg"
      variant="primary"
    >
      {dispute.status === 'COMMIT' ? '📝 Vote Now!' : '🔓 Reveal Vote!'}
    </Button>
  </div>
)}
```

2. **Bottom Sheet for Voting** (instead of inline):
```tsx
import { BottomSheet } from '@/components/ui/BottomSheet';

const [showVotingSheet, setShowVotingSheet] = useState(false);

// Mobile: Bottom sheet
<BottomSheet
  open={showVotingSheet}
  onClose={() => setShowVotingSheet(false)}
  title="Your Vote"
>
  <JuryVotingPanel
    disputeId={dispute.id}
    phase={dispute.status}
    onVoteSubmitted={() => setShowVotingSheet(false)}
  />
</BottomSheet>
```

3. **Collapsible Sections**:
```tsx
<Accordion>
  <AccordionItem title="Evidence" defaultOpen>
    <EvidenceViewer {...props} />
  </AccordionItem>
  <AccordionItem title="Jurors">
    <JurorsCard {...props} />
  </AccordionItem>
</Accordion>
```

### 2.7 Performance Optimizations

**Code Splitting**:
```tsx
import dynamic from 'next/dynamic';

const RulingCard = dynamic(() => import('@/components/dispute/RulingCard'), {
  loading: () => <Skeleton className="h-64" />,
  ssr: false,
});

const JuryVotingPanel = dynamic(() => import('@/components/dispute/JuryVotingPanel'), {
  loading: () => <Skeleton className="h-96" />,
});
```

**Memoization**:
```tsx
const memoizedJurorsCard = useMemo(
  () => <JurorsCard jurors={dispute.jurors} />,
  [dispute.jurors]
);
```

**Prefetching**:
```tsx
// Prefetch order data (linked from DisputeHeader)
const { prefetch } = useOrderDetails(dispute.orderId);
useEffect(() => {
  prefetch();
}, [dispute.orderId]);
```

---

## 3. Page 2: MyDisputesPage

**Route**: `/app/disputes`

**File**: `/src/pages/disputes/index.tsx`

### 3.1 Purpose

Personal dispute management hub for users to track:
- Disputes they opened (as plaintiff)
- Disputes against them (as defendant)
- Disputes they're judging (as juror)

### 3.2 Page Structure

**Layout** (Desktop):
```
┌────────────────────────────────────────────────────────────┐
│ Header (AppHeader)                                         │
├────────────────────────────────────────────────────────────┤
│ My Disputes                                                │
│ ┌──────────────────────────────────────────────────────┐  │
│ │ [Tab: As Plaintiff] [As Defendant] [As Juror]        │  │
│ └──────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────┤
│ ┌─────────────────────┬────────────────────────────────┐  │
│ │ Filter: [Status ▼]  │ Search: [Dispute ID or Party]  │  │
│ └─────────────────────┴────────────────────────────────┘  │
├────────────────────────────────────────────────────────────┤
│ DisputeCard #123                                           │
│ [Alice vs Bob] [Status: VOTING] [Nov 14, 2025]            │
│ [View Details →]                                           │
├────────────────────────────────────────────────────────────┤
│ DisputeCard #124                                           │
│ ...                                                        │
├────────────────────────────────────────────────────────────┤
│ [Load More] (if pagination)                               │
└────────────────────────────────────────────────────────────┘
```

### 3.3 Implementation

```tsx
import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useMyDisputes } from '@/hooks/blockchain/useMyDisputes';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { DisputeCard } from '@/components/dispute/DisputeCard';
import { FilterPanel } from '@/components/ui/FilterPanel';
import { SearchBar } from '@/components/ui/SearchBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

export default function MyDisputesPage() {
  const { address } = useWallet();
  const { data, isLoading } = useMyDisputes();

  const [activeTab, setActiveTab] = useState<'plaintiff' | 'defendant' | 'juror'>('plaintiff');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter disputes
  const filteredDisputes = useMemo(() => {
    let disputes = data?.[activeTab] || [];

    if (statusFilter !== 'all') {
      disputes = disputes.filter(d => d.status === statusFilter);
    }

    if (searchQuery) {
      disputes = disputes.filter(
        d =>
          d.id.toString().includes(searchQuery) ||
          d.plaintiff.includes(searchQuery) ||
          d.defendant.includes(searchQuery)
      );
    }

    return disputes;
  }, [data, activeTab, statusFilter, searchQuery]);

  if (!address) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="warning">
          Please connect your wallet to view your disputes.
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <DisputesListSkeleton />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">
        My Disputes
      </h1>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="plaintiff">
            As Plaintiff
            <Badge variant="gray" className="ml-2">
              {data?.asPlaintiff.length || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="defendant">
            As Defendant
            <Badge variant="gray" className="ml-2">
              {data?.asDefendant.length || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="juror">
            As Juror
            <Badge variant="gray" className="ml-2">
              {data?.asJuror.length || 0}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Filter & Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <FilterPanel
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: 'All Statuses', value: 'all' },
              { label: 'Opened', value: 'OPENED' },
              { label: 'Commit Phase', value: 'COMMIT' },
              { label: 'Reveal Phase', value: 'REVEAL' },
              { label: 'Resolved', value: 'RESOLVED' },
            ]}
          />
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by Dispute ID or Party Address"
            className="flex-1"
          />
        </div>

        {/* Dispute Lists */}
        <TabsContent value="plaintiff">
          <DisputesList
            disputes={filteredDisputes}
            role="plaintiff"
            emptyMessage="You haven't opened any disputes"
          />
        </TabsContent>

        <TabsContent value="defendant">
          <DisputesList
            disputes={filteredDisputes}
            role="defendant"
            emptyMessage="No disputes against you"
          />
        </TabsContent>

        <TabsContent value="juror">
          <DisputesList
            disputes={filteredDisputes}
            role="juror"
            emptyMessage="You haven't been selected as juror yet"
            showVoteStatus
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Disputes List Component
function DisputesList({
  disputes,
  role,
  emptyMessage,
  showVoteStatus = false,
}: {
  disputes: Dispute[];
  role: 'plaintiff' | 'defendant' | 'juror';
  emptyMessage: string;
  showVoteStatus?: boolean;
}) {
  if (disputes.length === 0) {
    return (
      <EmptyState
        icon="📋"
        title="No disputes"
        description={emptyMessage}
      />
    );
  }

  return (
    <div className="space-y-4">
      {disputes.map(dispute => (
        <DisputeCard
          key={dispute.id}
          dispute={dispute}
          role={role}
          showVoteStatus={showVoteStatus}
        />
      ))}
    </div>
  );
}

function DisputesListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map(i => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}
```

### 3.4 Tab-Specific Features

**As Juror Tab** (Enhanced):
```tsx
<TabsContent value="juror">
  <div className="mb-4">
    <Alert variant="info">
      <p className="font-semibold">Pending Votes: {pendingVotesCount}</p>
      <p className="text-sm">
        You have {pendingVotesCount} dispute{pendingVotesCount !== 1 ? 's' : ''} waiting for your vote.
      </p>
    </Alert>
  </div>

  <DisputesList
    disputes={filteredDisputes}
    role="juror"
    emptyMessage="You haven't been selected as juror yet"
    showVoteStatus
    highlightPending // Highlight disputes with pending votes
  />
</TabsContent>
```

**Vote Status Indicator**:
```tsx
{showVoteStatus && (
  <div className="flex items-center gap-2">
    {dispute.voteStatus === 'pending' && (
      <Badge variant="yellow" size="sm">
        ⏳ Waiting to vote
      </Badge>
    )}
    {dispute.voteStatus === 'committed' && dispute.phase === 'COMMIT' && (
      <Badge variant="blue" size="sm">
        ✅ Voted
      </Badge>
    )}
    {dispute.voteStatus === 'committed' && dispute.phase === 'REVEAL' && (
      <Badge variant="orange" size="sm" className="animate-pulse">
        🔓 Reveal now!
      </Badge>
    )}
    {dispute.voteStatus === 'revealed' && (
      <Badge variant="green" size="sm">
        ✅ Revealed
      </Badge>
    )}
  </div>
)}
```

### 3.5 Mobile Optimizations

**Mobile Card Layout**:
```tsx
function DisputeCardMobile({ dispute, role }: DisputeCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm text-gray-500">Dispute</p>
          <p className="text-2xl font-bold">#{dispute.id}</p>
        </div>
        <StatusBadge status={dispute.status} size="sm" />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Avatar src={dispute.plaintiff.avatar} size="xs" />
        <span className="text-xs text-gray-400">vs</span>
        <Avatar src={dispute.defendant.avatar} size="xs" />
      </div>

      {role === 'juror' && dispute.voteStatus && (
        <VoteStatusBadge status={dispute.voteStatus} className="mb-3" />
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-600">
          {formatDate(dispute.createdAt, 'PP')}
        </p>
        <Button variant="outline" size="sm" href={`/app/disputes/${dispute.id}`}>
          View
        </Button>
      </div>
    </Card>
  );
}
```

---

## 4. Page 3: AdminDisputesDashboardPage

**Route**: `/app/admin/disputes`

**File**: `/src/pages/admin/disputes.tsx`

### 4.1 Purpose

DAO governance dashboard for monitoring dispute system health:
- Total disputes, resolution rate, avg time
- Ruling breakdown (Refund vs Release vs Partial)
- Juror leaderboard (participation rate)
- Global disputes table with filters

### 4.2 Access Control

```tsx
import { RequireDAO } from '@/components/auth/RequireDAO';

export default function AdminDisputesDashboardPage() {
  return (
    <RequireDAO fallback={<AccessDenied />}>
      <DisputesDashboardContent />
    </RequireDAO>
  );
}

// RequireDAO Component
function RequireDAO({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const { address } = useWallet();
  const { data: isDAOMember, isLoading } = useIsDAOMember(address);

  if (isLoading) return <Skeleton />;
  if (!isDAOMember) return fallback;

  return <>{children}</>;
}
```

### 4.3 Page Structure

```
┌────────────────────────────────────────────────────────────┐
│ Admin: Disputes Dashboard                                 │
├────────────────────────────────────────────────────────────┤
│ ┌───────────┬───────────┬───────────┬───────────┐        │
│ │ Total     │ Resolved  │ Pending   │ Avg Time  │        │
│ │ 1,234     │ 987 (80%) │ 247 (20%) │ 46.3h     │        │
│ └───────────┴───────────┴───────────┴───────────┘        │
├────────────────────────────────────────────────────────────┤
│ ┌─────────────────────┬──────────────────────────────┐   │
│ │ Ruling Breakdown    │ Juror Leaderboard            │   │
│ │ [Donut Chart]       │ 1. Alice (50 cases, 98%)     │   │
│ │ 60% Refund Buyer    │ 2. Bob (42 cases, 95%)       │   │
│ │ 30% Release Seller  │ ...                          │   │
│ │ 10% Partial         │                              │   │
│ └─────────────────────┴──────────────────────────────┘   │
├────────────────────────────────────────────────────────────┤
│ All Disputes                                               │
│ [Filter: Status ▼] [Date Range ▼] [Export CSV]           │
│ ┌────────────────────────────────────────────────────┐   │
│ │ ID  │ Plaintiff │ Defendant │ Status │ Ruling     │   │
│ │ 123 │ Alice     │ Bob       │ ✅     │ Refund     │   │
│ │ 124 │ Carol     │ Dave      │ 🔵     │ -          │   │
│ └────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

### 4.4 Implementation

```tsx
import { useAllDisputes } from '@/hooks/blockchain/useAllDisputes';
import { KPICard } from '@/components/ui/KPICard';
import { DonutChart } from '@/components/ui/DonutChart';
import { DataTable } from '@/components/ui/DataTable';
import { LeaderboardTable } from '@/components/admin/LeaderboardTable';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { exportToCSV } from '@/utils/export';

function DisputesDashboardContent() {
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading } = useAllDisputes({ dateRange, statusFilter });

  if (isLoading) return <DashboardSkeleton />;

  const stats = calculateStats(data.disputes);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="text-4xl font-bold mb-8">Disputes Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Total Disputes"
          value={stats.total}
          icon="📋"
        />
        <KPICard
          title="Resolved"
          value={`${stats.resolved} (${stats.resolvedPercent}%)`}
          icon="✅"
          trend={{ value: 5, direction: 'up' }}
        />
        <KPICard
          title="Pending"
          value={`${stats.pending} (${stats.pendingPercent}%)`}
          icon="⏳"
        />
        <KPICard
          title="Avg Resolution Time"
          value={`${stats.avgTime}h`}
          icon="⏱️"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Ruling Breakdown */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold">Ruling Breakdown</h3>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={[
                { name: 'Refund Buyer', value: stats.rulings.refundBuyer, color: '#10B981' },
                { name: 'Release Seller', value: stats.rulings.releaseSeller, color: '#3B82F6' },
                { name: 'Partial Refund', value: stats.rulings.partialRefund, color: '#F59E0B' },
              ]}
              className="h-64"
            />
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Refund Buyer:</span>
                <strong>{stats.rulings.refundBuyerPercent}%</strong>
              </div>
              <div className="flex justify-between">
                <span>Release Seller:</span>
                <strong>{stats.rulings.releaseSellerPercent}%</strong>
              </div>
              <div className="flex justify-between">
                <span>Partial Refund:</span>
                <strong>{stats.rulings.partialRefundPercent}%</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Juror Leaderboard */}
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold">Juror Leaderboard</h3>
          </CardHeader>
          <CardContent>
            <LeaderboardTable jurors={data.topJurors} />
          </CardContent>
        </Card>
      </div>

      {/* All Disputes Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">All Disputes</h3>
            <div className="flex gap-3">
              <FilterPanel
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { label: 'All', value: 'all' },
                  { label: 'Resolved', value: 'RESOLVED' },
                  { label: 'Pending', value: 'PENDING' },
                ]}
              />
              <DateRangePicker value={dateRange} onChange={setDateRange} />
              <Button
                variant="outline"
                onClick={() => exportToCSV(data.disputes, 'disputes.csv')}
              >
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { header: 'ID', accessor: 'id' },
              { header: 'Plaintiff', accessor: 'plaintiff', render: truncateAddress },
              { header: 'Defendant', accessor: 'defendant', render: truncateAddress },
              { header: 'Status', accessor: 'status', render: renderStatusBadge },
              { header: 'Ruling', accessor: 'ruling', render: renderRuling },
              { header: 'Created', accessor: 'createdAt', render: formatDate },
              { header: 'Resolved', accessor: 'resolvedAt', render: formatDate },
              { header: 'Actions', accessor: 'id', render: renderActions },
            ]}
            data={data.disputes}
            pagination={{ pageSize: 50 }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function renderActions(disputeId: number) {
  return (
    <Button variant="link" href={`/app/disputes/${disputeId}`} size="sm">
      View →
    </Button>
  );
}
```

---

## 5. Routing & Navigation

### 5.1 Route Configuration

**Next.js (App Router)**:
```
/app/disputes/
├── page.tsx                    → MyDisputesPage
├── [disputeId]/
│   └── page.tsx                → DisputeDetailPage
/app/admin/
└── disputes/
    └── page.tsx                → AdminDisputesDashboardPage
```

**React Router**:
```tsx
<Routes>
  <Route path="/app/disputes" element={<MyDisputesPage />} />
  <Route path="/app/disputes/:disputeId" element={<DisputeDetailPage />} />
  <Route path="/app/admin/disputes" element={<AdminDisputesDashboardPage />} />
</Routes>
```

### 5.2 Navigation Links

**From OrderPage**:
```tsx
<Button variant="outline" onClick={openDispute}>
  Open Dispute
</Button>
```

**From MyDisputesPage**:
```tsx
<Button href={`/app/disputes/${disputeId}`}>
  View Details →
</Button>
```

**From DisputeDetailPage**:
```tsx
<Breadcrumb
  items={[
    { label: 'Home', href: '/' },
    { label: 'Disputes', href: '/app/disputes' },
    { label: `#${disputeId}`, current: true },
  ]}
/>
```

---

## 6. SEO & Metadata

### 6.1 DisputeDetailPage

```tsx
export async function generateMetadata({ params }: { params: { disputeId: string } }) {
  const dispute = await fetchDispute(params.disputeId);

  return {
    title: `Dispute #${dispute.id} | Bazari`,
    description: `View dispute between ${dispute.plaintiff} and ${dispute.defendant}. Status: ${dispute.status}`,
    openGraph: {
      title: `Dispute #${dispute.id}`,
      description: `${dispute.status} - ${dispute.createdAt}`,
    },
  };
}
```

### 6.2 MyDisputesPage

```tsx
export const metadata = {
  title: 'My Disputes | Bazari',
  description: 'Manage your disputes as plaintiff, defendant, or juror',
};
```

---

## 7. Error States

### 7.1 Dispute Not Found (404)

```tsx
if (error?.message.includes('not found')) {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">
        Dispute Not Found
      </h2>
      <p className="text-gray-600 mb-6">
        Dispute #{disputeId} doesn't exist or has been removed.
      </p>
      <Button href="/app/disputes">
        View My Disputes
      </Button>
    </div>
  );
}
```

### 7.2 Network Error

```tsx
if (error?.message.includes('network')) {
  return (
    <Alert variant="error">
      <h3 className="font-semibold mb-2">Connection Error</h3>
      <p>Failed to connect to blockchain. Please check your connection.</p>
      <Button onClick={refetch} variant="outline" className="mt-3">
        Retry
      </Button>
    </Alert>
  );
}
```

---

## 8. Loading States

### 8.1 Page-Level Skeleton

```tsx
function DisputeDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64 lg:col-span-3" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
```

### 8.2 Component-Level Loading

```tsx
{isLoading ? (
  <Skeleton className="h-64" />
) : (
  <EvidenceViewer {...props} />
)}
```

---

**Document Status**: ✅ COMPLETE
**Total Pages**: 3
**Estimated LOC**: 950 lines (400 + 250 + 300)
**Next Document**: HOOKS.md
