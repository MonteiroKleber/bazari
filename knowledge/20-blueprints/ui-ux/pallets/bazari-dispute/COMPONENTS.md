# bazari-dispute Components Specification

**Status**: CRITICAL (P0)
**Version**: 1.0
**Last Updated**: 2025-11-14
**Dependencies**: React 18+, TypeScript 5+, Polkadot.js
**Related**: UI-SPEC.md, PAGES.md, HOOKS.md

---

## Table of Contents

1. [Component Hierarchy](#1-component-hierarchy)
2. [Components Catalog](#2-components-catalog)
3. [Shared Components](#3-shared-components)
4. [Component Dependencies Graph](#4-component-dependencies-graph)

---

## 1. Component Hierarchy

```
DisputeDetailPage
├── DisputeHeader
│   ├── StatusBadge
│   ├── TimelineStepper
│   │   └── StepIndicator
│   └── OrderLink
├── PartiesCard
│   ├── PartyInfo (Plaintiff)
│   │   ├── Avatar
│   │   ├── AddressDisplay
│   │   └── RoleBadge
│   ├── VsSeparator
│   └── PartyInfo (Defendant)
│       ├── Avatar
│       ├── AddressDisplay
│       └── RoleBadge
├── EvidenceViewer
│   ├── IPFSBadge
│   │   └── CopyButton
│   ├── IPFSPreview
│   │   ├── ImageGallery (if images)
│   │   ├── DocumentPreview (if docs)
│   │   └── JSONPreview (if JSON)
│   ├── ActionButtons
│   │   ├── ViewOnIPFSButton
│   │   └── DownloadButton
│   └── DescriptionBlock
├── JurorsCard
│   ├── JurorList
│   │   └── JurorItem (×5)
│   │       ├── Avatar
│   │       ├── AddressDisplay
│   │       └── ReputationBadge
│   └── Accordion
│       ├── JurorRequirements
│       └── VRFExplanation
│           └── VerifyVRFButton (optional)
├── VotingStatus (conditional)
│   ├── CountdownTimer
│   ├── ProgressBar
│   └── StatusText
├── JuryVotingPanel (conditional - jurors only)
│   ├── CommitPhaseUI (if commit phase)
│   │   ├── PhaseHeader
│   │   │   └── CountdownTimer
│   │   ├── InfoAlert
│   │   ├── VoteSelector
│   │   │   ├── RadioGroup
│   │   │   │   ├── Radio (RefundBuyer)
│   │   │   │   ├── Radio (ReleaseSeller)
│   │   │   │   └── Radio (PartialRefund)
│   │   │   │       └── PercentageSlider
│   │   │   └── SplitPreview
│   │   └── CommitButton
│   ├── RevealPhaseUI (if reveal phase)
│   │   ├── PhaseHeader
│   │   │   └── CountdownTimer
│   │   ├── WarningAlert
│   │   ├── VoteDisplay
│   │   ├── SaltInput (auto-filled or manual)
│   │   └── RevealButton
│   └── PostVoteUI (if voted)
│       ├── SuccessAlert
│       └── WaitingStatus
└── RulingCard (if resolved)
    ├── RulingBadge
    ├── VoteBreakdown
    │   ├── PieChart
    │   └── VoteList
    ├── Divider
    └── ExecutionDetails
        ├── StatusAlert
        ├── FundsDistribution
        ├── FeeRefund
        └── TransactionLink

MyDisputesPage
├── TabsNavigation
│   ├── Tab (As Plaintiff)
│   ├── Tab (As Defendant)
│   └── Tab (As Juror)
├── FilterPanel
│   ├── StatusDropdown
│   ├── DateRangePicker
│   └── SortDropdown
├── SearchBar
└── DisputesList
    └── DisputeCard (×N)
        ├── DisputeHeader
        │   ├── DisputeID
        │   ├── StatusBadge
        │   └── CreatedDate
        ├── PartiesPreview
        │   ├── Avatar (Plaintiff)
        │   ├── VsSeparator
        │   └── Avatar (Defendant)
        ├── VoteStatusBadge (if juror)
        └── ActionButton (View Details)

AdminDisputesDashboardPage
├── StatsOverview
│   ├── KPICard (Total Disputes)
│   ├── KPICard (Resolved)
│   ├── KPICard (Pending)
│   └── KPICard (Avg Time)
├── RulingBreakdownChart
│   └── DonutChart
├── JurorLeaderboard
│   └── LeaderboardTable
│       └── JurorRow (×10)
│           ├── Rank
│           ├── Avatar
│           ├── AddressDisplay
│           ├── CasesCount
│           ├── ParticipationRate
│           └── ReputationScore
└── AllDisputesTable
    ├── FilterBar
    │   ├── StatusFilter
    │   ├── DateRangeFilter
    │   └── ExportButton
    └── DataTable
        └── DisputeRow (×N)
            ├── DisputeID
            ├── Plaintiff
            ├── Defendant
            ├── StatusBadge
            ├── Ruling (if resolved)
            ├── CreatedDate
            ├── ResolvedDate
            └── ViewButton
```

---

## 2. Components Catalog

### 2.1 Component: DisputeHeader

**File**: `/src/components/dispute/DisputeHeader.tsx`

**Purpose**: Display dispute ID, status badge, timeline, and order link

**Props**:
```typescript
interface DisputeHeaderProps {
  dispute: {
    id: number;
    status: DisputeStatus;
    orderId: number;
    createdAt: number; // block number
    commitPhaseEnd: number;
    revealPhaseEnd: number;
    resolvedAt?: number;
  };
}

type DisputeStatus = 'OPENED' | 'COMMIT' | 'REVEAL' | 'RESOLVED';
```

**Design Specs**:
- Height: Auto (min 120px)
- Background: White (#FFFFFF)
- Border: 1px solid #E5E7EB
- Border Radius: 8px
- Padding: 24px
- Shadow: 0 1px 3px rgba(0,0,0,0.1)

**Implementation**:
```tsx
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TimelineStepper } from './TimelineStepper';
import { Button } from '@/components/ui/Button';

export function DisputeHeader({ dispute }: DisputeHeaderProps) {
  return (
    <Card className="dispute-header">
      {/* Header Top Row */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold text-gray-900">
          Dispute #{dispute.id}
        </h1>
        <StatusBadge status={dispute.status} />
      </div>

      {/* Timeline Stepper */}
      <TimelineStepper
        steps={[
          {
            label: 'Opened',
            completed: true,
            block: dispute.createdAt,
            timestamp: blockToTimestamp(dispute.createdAt),
          },
          {
            label: 'Commit Phase',
            completed: dispute.status !== 'OPENED',
            current: dispute.status === 'COMMIT',
            block: dispute.commitPhaseEnd,
          },
          {
            label: 'Reveal Phase',
            completed: ['REVEAL', 'RESOLVED'].includes(dispute.status),
            current: dispute.status === 'REVEAL',
            block: dispute.revealPhaseEnd,
          },
          {
            label: 'Resolved',
            completed: dispute.status === 'RESOLVED',
            block: dispute.resolvedAt,
          },
        ]}
      />

      {/* Order Link */}
      <div className="mt-4">
        <Button
          variant="link"
          href={`/app/orders/${dispute.orderId}`}
          className="text-blue-600 hover:text-blue-800"
        >
          View Order #{dispute.orderId} →
        </Button>
      </div>
    </Card>
  );
}
```

**StatusBadge Variants**:
```tsx
function StatusBadge({ status }: { status: DisputeStatus }) {
  const variants = {
    OPENED: { color: 'yellow', text: 'Jurors Being Selected' },
    COMMIT: { color: 'blue', text: 'Commit Phase' },
    REVEAL: { color: 'purple', text: 'Reveal Phase' },
    RESOLVED: { color: 'green', text: 'Resolved' },
  };

  const { color, text } = variants[status];

  return (
    <Badge variant={color} size="lg">
      {text}
    </Badge>
  );
}
```

**Responsive**:
- Mobile (<768px): Stack vertically, smaller font sizes
- Timeline: Horizontal scroll on xs screens

---

### 2.2 Component: PartiesCard

**File**: `/src/components/dispute/PartiesCard.tsx`

**Purpose**: Display plaintiff vs defendant with avatars and roles

**Props**:
```typescript
interface PartiesCardProps {
  plaintiff: Party;
  defendant: Party;
  createdAt: Date;
}

interface Party {
  address: string;
  name?: string;
  avatar?: string;
  role: 'BUYER' | 'SELLER';
}
```

**Design Specs**:
- Layout: Flexbox (horizontal on desktop, vertical on mobile)
- Avatar Size: 64px (desktop), 48px (mobile)
- Separator: "vs" text in gray-400
- Role Badge: Blue (buyer), Orange (seller)

**Implementation**:
```tsx
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { truncateAddress } from '@/utils/format';

export function PartiesCard({ plaintiff, defendant, createdAt }: PartiesCardProps) {
  return (
    <Card className="parties-card">
      <div className="flex flex-col md:flex-row items-center justify-around gap-6 p-6">
        {/* Plaintiff */}
        <PartyInfo party={plaintiff} label="Plaintiff" />

        {/* Separator */}
        <div className="text-2xl font-bold text-gray-400">vs</div>

        {/* Defendant */}
        <PartyInfo party={defendant} label="Defendant" />
      </div>

      {/* Created Date */}
      <div className="border-t border-gray-200 px-6 py-3">
        <p className="text-sm text-gray-600">
          Opened on {formatDate(createdAt, 'PPpp')}
        </p>
      </div>
    </Card>
  );
}

function PartyInfo({ party, label }: { party: Party; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs uppercase text-gray-500 font-semibold">{label}</p>
      <Avatar
        src={party.avatar}
        alt={party.name || party.address}
        size="lg"
        className="w-16 h-16"
      />
      <div className="text-center">
        <p className="font-medium text-gray-900">
          {party.name || truncateAddress(party.address)}
        </p>
        <Badge variant={party.role === 'BUYER' ? 'blue' : 'orange'} size="sm">
          {party.role}
        </Badge>
      </div>
    </div>
  );
}
```

**Accessibility**:
- Alt text for avatars
- ARIA labels for party sections

---

### 2.3 Component: EvidenceViewer

**File**: `/src/components/dispute/EvidenceViewer.tsx`

**Purpose**: Display IPFS evidence with preview and download

**Props**:
```typescript
interface EvidenceViewerProps {
  evidenceCID: string;
  description: string;
  uploadedBy: 'plaintiff' | 'defendant';
}
```

**Design Specs**:
- IPFS Preview: Max height 400px
- CID Display: Monospace font, gray background
- Actions: Link and Download buttons

**Implementation**:
```tsx
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CopyButton } from '@/components/ui/CopyButton';
import { IPFSPreview } from './IPFSPreview';
import { getIPFSGatewayURL } from '@/utils/ipfs';

export function EvidenceViewer({
  evidenceCID,
  description,
  uploadedBy,
}: EvidenceViewerProps) {
  const handleDownload = async () => {
    const url = getIPFSGatewayURL(evidenceCID);
    window.open(url, '_blank');
  };

  return (
    <Card className="evidence-viewer">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Evidence</h3>
          <Badge variant="gray">
            Uploaded by {uploadedBy}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* IPFS CID */}
        <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-md">
          <code className="text-sm font-mono flex-1 overflow-x-auto">
            {evidenceCID}
          </code>
          <CopyButton text={evidenceCID} />
        </div>

        {/* IPFS Preview */}
        <IPFSPreview cid={evidenceCID} />

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="link"
            onClick={() => window.open(getIPFSGatewayURL(evidenceCID), '_blank')}
          >
            View on IPFS Gateway →
          </Button>
          <Button variant="outline" onClick={handleDownload}>
            Download Evidence
          </Button>
        </div>

        {/* Description */}
        {description && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Description
            </h4>
            <p className="text-gray-600 whitespace-pre-wrap">
              {description}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**IPFSPreview Subcomponent**:
```tsx
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';

export function IPFSPreview({ cid }: { cid: string }) {
  const [preview, setPreview] = useState<{
    type: 'image' | 'document' | 'json';
    content: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIPFSPreview(cid)
      .then(setPreview)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [cid]);

  if (loading) return <Skeleton className="w-full h-64" />;
  if (error) {
    return (
      <Alert variant="error">
        Failed to load preview: {error}
        <Button variant="link" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Alert>
    );
  }

  if (preview?.type === 'image') {
    return (
      <div className="image-gallery">
        <img
          src={preview.content}
          alt="Evidence"
          className="w-full max-h-96 object-contain rounded-lg"
        />
      </div>
    );
  }

  if (preview?.type === 'json') {
    return (
      <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
        {JSON.stringify(JSON.parse(preview.content), null, 2)}
      </pre>
    );
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
      <FileIcon className="w-8 h-8 text-gray-400" />
      <div>
        <p className="font-medium">Document</p>
        <p className="text-sm text-gray-600">Click "View on IPFS" to open</p>
      </div>
    </div>
  );
}

async function fetchIPFSPreview(cid: string) {
  // Call backend API for preview
  const response = await fetch(`/api/ipfs/${cid}/preview`);
  if (!response.ok) throw new Error('Failed to fetch preview');
  return response.json();
}
```

---

### 2.4 Component: JurorsCard

**File**: `/src/components/dispute/JurorsCard.tsx`

**Purpose**: Display 5 selected jurors with VRF explanation

**Props**:
```typescript
interface JurorsCardProps {
  jurors: Juror[];
  vrfSeed?: string; // optional for VRF verification
}

interface Juror {
  address: string;
  reputation: number;
  avatar?: string;
  name?: string;
}
```

**Design Specs**:
- Juror List: Grid (2 columns on mobile, 5 columns on desktop)
- Reputation Badge: Green color, bold
- Accordion: Expandable for requirements and VRF explanation

**Implementation**:
```tsx
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Accordion, AccordionItem } from '@/components/ui/Accordion';
import { truncateAddress } from '@/utils/format';

export function JurorsCard({ jurors, vrfSeed }: JurorsCardProps) {
  return (
    <Card className="jurors-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Jurors (5)</h3>
          <Badge variant="purple">Selected via VRF</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Juror List */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {jurors.map((juror) => (
            <JurorItem key={juror.address} juror={juror} />
          ))}
        </div>

        {/* Accordion */}
        <Accordion>
          <AccordionItem title="Juror Requirements">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-green-600" />
                Reputation &gt; 500
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-green-600" />
                Stake &gt;= 100 BZR
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-green-600" />
                Not involved in dispute (not buyer or seller)
              </li>
            </ul>
          </AccordionItem>

          <AccordionItem title="How were jurors selected?">
            <div className="space-y-3 text-sm">
              <p className="text-gray-700">
                VRF (Verifiable Random Function) ensures unbiased, tamper-proof
                random selection from eligible jurors. This cryptographic technique
                prevents anyone from manipulating the jury selection process.
              </p>
              {vrfSeed && (
                <Button
                  variant="link"
                  onClick={() => showVRFProofModal(vrfSeed)}
                  className="text-blue-600"
                >
                  Verify VRF Proof (Advanced) →
                </Button>
              )}
            </div>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

function JurorItem({ juror }: { juror: Juror }) {
  return (
    <div className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-lg">
      <Avatar
        src={juror.avatar}
        alt={juror.name || juror.address}
        size="md"
        className="w-12 h-12"
      />
      <div className="text-center">
        <p className="text-xs font-medium text-gray-900">
          {juror.name || truncateAddress(juror.address)}
        </p>
        <Badge variant="green" size="xs">
          Rep: {juror.reputation}
        </Badge>
      </div>
    </div>
  );
}
```

**VRF Proof Modal** (Advanced Feature):
```tsx
function VRFProofModal({ seed, onClose }: { seed: string; onClose: () => void }) {
  return (
    <Modal open onClose={onClose}>
      <ModalHeader>
        <h3>VRF Proof Verification</h3>
      </ModalHeader>
      <ModalContent>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">VRF Seed</label>
            <code className="block p-2 bg-gray-100 rounded text-sm font-mono">
              {seed}
            </code>
          </div>
          <p className="text-sm text-gray-600">
            This seed was used to generate random juror selection. You can verify
            this proof on-chain by querying the VRF pallet.
          </p>
          <Button variant="outline" onClick={() => copyToClipboard(seed)}>
            Copy Seed
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
```

---

### 2.5 Component: VotingStatus

**File**: `/src/components/dispute/VotingStatus.tsx`

**Purpose**: Show voting phase timer and progress

**Props**:
```typescript
interface VotingStatusProps {
  phase: 'COMMIT' | 'REVEAL' | 'TALLYING' | 'RESOLVED';
  commitPhaseEnd?: number; // block number
  revealPhaseEnd?: number;
  committedCount: number;
  revealedCount: number;
  totalJurors: number; // always 5
}
```

**Design Specs**:
- Timer: Large, prominent (32px font)
- Progress Bar: Animated, color-coded
- Status Text: Center-aligned, gray-600

**Implementation**:
```tsx
import { Card } from '@/components/ui/Card';
import { CountdownTimer } from './CountdownTimer';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Spinner } from '@/components/ui/Spinner';

export function VotingStatus({
  phase,
  commitPhaseEnd,
  revealPhaseEnd,
  committedCount,
  revealedCount,
  totalJurors,
}: VotingStatusProps) {
  if (phase === 'RESOLVED') return null;

  return (
    <Card className="voting-status p-6 text-center">
      {phase === 'COMMIT' && commitPhaseEnd && (
        <>
          <CountdownTimer
            label="Commit phase ends in"
            targetBlock={commitPhaseEnd}
            className="mb-4"
          />
          <ProgressBar
            value={committedCount}
            max={totalJurors}
            className="mb-2"
            color="blue"
          />
          <p className="text-sm text-gray-600">
            {committedCount} of {totalJurors} jurors have committed
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Waiting for jurors to vote...
          </p>
        </>
      )}

      {phase === 'REVEAL' && revealPhaseEnd && (
        <>
          <CountdownTimer
            label="Reveal phase ends in"
            targetBlock={revealPhaseEnd}
            className="mb-4"
          />
          <ProgressBar
            value={revealedCount}
            max={totalJurors}
            className="mb-2"
            color="purple"
          />
          <p className="text-sm text-gray-600">
            {revealedCount} of {totalJurors} jurors have revealed
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Waiting for jurors to reveal votes...
          </p>
        </>
      )}

      {phase === 'TALLYING' && (
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-lg font-medium text-gray-700">
            Tallying votes...
          </p>
        </div>
      )}
    </Card>
  );
}
```

**CountdownTimer Subcomponent**:
```tsx
import { useState, useEffect } from 'react';
import { useBlockNumber } from '@/hooks/blockchain/useBlockNumber';

export function CountdownTimer({
  label,
  targetBlock,
  className,
}: {
  label: string;
  targetBlock: number;
  className?: string;
}) {
  const { data: currentBlock } = useBlockNumber();
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!currentBlock) return;

    const blocksLeft = targetBlock - currentBlock;
    if (blocksLeft <= 0) {
      setTimeLeft('Ended');
      return;
    }

    // 6 seconds per block
    const secondsLeft = blocksLeft * 6;
    const hours = Math.floor(secondsLeft / 3600);
    const minutes = Math.floor((secondsLeft % 3600) / 60);
    const seconds = secondsLeft % 60;

    setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);

    const interval = setInterval(() => {
      const newSecondsLeft = secondsLeft - 1;
      if (newSecondsLeft <= 0) {
        setTimeLeft('Ended');
        clearInterval(interval);
        return;
      }
      const h = Math.floor(newSecondsLeft / 3600);
      const m = Math.floor((newSecondsLeft % 3600) / 60);
      const s = newSecondsLeft % 60;
      setTimeLeft(`${h}h ${m}m ${s}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentBlock, targetBlock]);

  // Color based on time left
  const getColor = () => {
    const hoursLeft = parseInt(timeLeft.split('h')[0]);
    if (hoursLeft > 12) return 'text-green-600';
    if (hoursLeft > 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={className}>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className={`text-4xl font-bold ${getColor()}`}>
        {timeLeft}
      </p>
    </div>
  );
}
```

---

### 2.6 Component: RulingCard

**File**: `/src/components/dispute/RulingCard.tsx`

**Purpose**: Display final ruling, vote breakdown, and execution status

**Props**:
```typescript
interface RulingCardProps {
  ruling: 'RefundBuyer' | 'ReleaseSeller' | 'PartialRefund';
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

**Design Specs**:
- Ruling Badge: Large (48px height), colored background
- Vote Breakdown: Pie chart (200px diameter)
- Execution Alert: Success variant (green)

**Implementation**:
```tsx
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Divider } from '@/components/ui/Divider';
import { PieChart } from '@/components/ui/PieChart';
import { Button } from '@/components/ui/Button';
import { getExplorerURL } from '@/utils/blockchain';
import { truncateAddress } from '@/utils/format';

export function RulingCard({
  ruling,
  partialSplit,
  voteBreakdown,
  execution,
}: RulingCardProps) {
  return (
    <Card className="ruling-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Final Ruling</h3>
          <RulingBadge ruling={ruling} partialSplit={partialSplit} />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Vote Breakdown */}
        <div>
          <h4 className="text-lg font-semibold mb-4">Vote Breakdown</h4>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <PieChart
              data={[
                { name: 'Refund Buyer', value: voteBreakdown.refundBuyer, color: '#10B981' },
                { name: 'Release Seller', value: voteBreakdown.releaseSeller, color: '#3B82F6' },
                { name: 'Partial Refund', value: voteBreakdown.partialRefund, color: '#F59E0B' },
              ]}
              className="w-48 h-48"
            />
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded-full" />
                <span>
                  {voteBreakdown.refundBuyer} juror{voteBreakdown.refundBuyer !== 1 ? 's' : ''} voted: Refund Buyer
                </span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full" />
                <span>
                  {voteBreakdown.releaseSeller} juror{voteBreakdown.releaseSeller !== 1 ? 's' : ''} voted: Release Seller
                </span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded-full" />
                <span>
                  {voteBreakdown.partialRefund} juror{voteBreakdown.partialRefund !== 1 ? 's' : ''} voted: Partial Refund
                </span>
              </li>
            </ul>
          </div>
        </div>

        <Divider />

        {/* Execution Details */}
        <div>
          <h4 className="text-lg font-semibold mb-4">Execution Status</h4>

          {execution.executed ? (
            <>
              <Alert variant="success" className="mb-4">
                ✅ Executed on block #{execution.blockNumber}
              </Alert>

              <div className="space-y-4">
                {/* Funds Distribution */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="text-sm font-semibold text-gray-700 mb-3">
                    Funds Distribution
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Buyer received:</span>
                      <span className="font-semibold text-green-600">
                        {execution.buyerReceived} BZR
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Seller received:</span>
                      <span className="font-semibold text-blue-600">
                        {execution.sellerReceived} BZR
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fee Refund */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">
                    Dispute fee (50 BZR) refunded to{' '}
                    <strong className="text-blue-700">
                      {execution.feeRefundedTo}
                    </strong>
                  </p>
                </div>

                {/* Transaction Link */}
                {execution.txHash && (
                  <Button
                    variant="link"
                    href={getExplorerURL(execution.txHash)}
                    target="_blank"
                    className="text-blue-600"
                  >
                    View Transaction: {truncateAddress(execution.txHash)} →
                  </Button>
                )}
              </div>
            </>
          ) : (
            <Alert variant="warning">
              ⏳ Execution pending...
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RulingBadge({
  ruling,
  partialSplit,
}: {
  ruling: string;
  partialSplit?: { buyerPercent: number; sellerPercent: number };
}) {
  const variants = {
    RefundBuyer: { color: 'green', text: 'REFUND BUYER' },
    ReleaseSeller: { color: 'blue', text: 'RELEASE SELLER' },
    PartialRefund: {
      color: 'orange',
      text: partialSplit
        ? `PARTIAL REFUND: ${partialSplit.buyerPercent}/${partialSplit.sellerPercent}`
        : 'PARTIAL REFUND',
    },
  };

  const { color, text } = variants[ruling as keyof typeof variants];

  return (
    <Badge variant={color} size="xl" className="px-6 py-2 text-lg">
      {text}
    </Badge>
  );
}
```

---

## 3. Shared Components

### 3.1 TimelineStepper

**File**: `/src/components/ui/TimelineStepper.tsx`

**Purpose**: Generic horizontal timeline stepper (reusable across pallets)

**Props**:
```typescript
interface TimelineStepperProps {
  steps: Step[];
}

interface Step {
  label: string;
  completed: boolean;
  current?: boolean;
  block?: number;
  timestamp?: Date;
}
```

**Implementation**:
```tsx
export function TimelineStepper({ steps }: TimelineStepperProps) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <StepIndicator step={step} />
          {index < steps.length - 1 && (
            <div
              className={`flex-1 h-1 mx-2 ${
                step.completed ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
          step.completed
            ? 'bg-blue-600 text-white'
            : step.current
            ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-600'
            : 'bg-gray-300 text-gray-600'
        }`}
      >
        {step.completed ? '✓' : index + 1}
      </div>
      <p className="text-xs text-gray-600 text-center">{step.label}</p>
      {step.timestamp && (
        <p className="text-xs text-gray-500">
          {formatDate(step.timestamp, 'PP')}
        </p>
      )}
    </div>
  );
}
```

---

### 3.2 ProgressBar

**File**: `/src/components/ui/ProgressBar.tsx`

**Purpose**: Animated progress bar with label

**Props**:
```typescript
interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  color?: 'blue' | 'green' | 'purple' | 'red';
  className?: string;
}
```

**Implementation**:
```tsx
export function ProgressBar({
  value,
  max,
  label,
  color = 'blue',
  className,
}: ProgressBarProps) {
  const percentage = (value / max) * 100;

  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    purple: 'bg-purple-600',
    red: 'bg-red-600',
  };

  return (
    <div className={className}>
      {label && (
        <p className="text-sm text-gray-600 mb-1">{label}</p>
      )}
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-300 ${colorClasses[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
```

---

### 3.3 DisputeCard (List Item)

**File**: `/src/components/dispute/DisputeCard.tsx`

**Purpose**: Dispute summary card for lists (MyDisputesPage)

**Props**:
```typescript
interface DisputeCardProps {
  dispute: {
    id: number;
    plaintiff: { address: string; avatar?: string };
    defendant: { address: string; avatar?: string };
    status: DisputeStatus;
    createdAt: Date;
    voteStatus?: 'pending' | 'committed' | 'revealed'; // if juror
  };
  role: 'plaintiff' | 'defendant' | 'juror';
}
```

**Implementation**:
```tsx
export function DisputeCard({ dispute, role }: DisputeCardProps) {
  return (
    <Card className="dispute-card hover:shadow-lg transition-shadow">
      <div className="p-4 flex items-center justify-between">
        {/* Left: Dispute Info */}
        <div className="flex items-center gap-4">
          {/* ID */}
          <div>
            <p className="text-sm text-gray-500">Dispute</p>
            <p className="text-xl font-bold text-gray-900">#{dispute.id}</p>
          </div>

          {/* Parties */}
          <div className="flex items-center gap-2">
            <Avatar src={dispute.plaintiff.avatar} size="sm" />
            <span className="text-gray-400 text-sm">vs</span>
            <Avatar src={dispute.defendant.avatar} size="sm" />
          </div>

          {/* Status */}
          <StatusBadge status={dispute.status} />

          {/* Vote Status (if juror) */}
          {role === 'juror' && dispute.voteStatus && (
            <VoteStatusBadge status={dispute.voteStatus} />
          )}
        </div>

        {/* Right: Action */}
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-600">
            {formatDate(dispute.createdAt, 'PP')}
          </p>
          <Button
            variant="outline"
            href={`/app/disputes/${dispute.id}`}
            size="sm"
          >
            View Details →
          </Button>
        </div>
      </div>
    </Card>
  );
}

function VoteStatusBadge({ status }: { status: string }) {
  const variants = {
    pending: { color: 'gray', icon: '⏳', text: 'Waiting to vote' },
    committed: { color: 'blue', icon: '✅', text: 'Voted' },
    revealed: { color: 'green', icon: '✅', text: 'Revealed' },
  };

  const { color, icon, text } = variants[status as keyof typeof variants];

  return (
    <Badge variant={color} size="sm">
      {icon} {text}
    </Badge>
  );
}
```

---

## 4. Component Dependencies Graph

**Legend**:
- `→` imports/uses
- `◇` optional dependency

```
DisputeDetailPage
  → DisputeHeader
    → StatusBadge
    → TimelineStepper ✓ (shared)
  → PartiesCard
    → Avatar ✓ (shared)
    → Badge ✓ (shared)
  → EvidenceViewer
    → IPFSPreview
    → CopyButton ✓ (shared)
  → JurorsCard
    → Avatar ✓ (shared)
    → Badge ✓ (shared)
    → Accordion ✓ (shared)
  → VotingStatus
    → CountdownTimer
    → ProgressBar ✓ (shared)
  → JuryVotingPanel (conditional)
    → RadioGroup ✓ (shared)
    → Slider ✓ (shared)
    → Button ✓ (shared)
  → RulingCard (conditional)
    → PieChart ✓ (shared)
    → Alert ✓ (shared)

MyDisputesPage
  → Tabs ✓ (shared)
  → FilterPanel
    → Dropdown ✓ (shared)
    → DateRangePicker ✓ (shared)
  → SearchBar ✓ (shared)
  → DisputeCard
    → Avatar ✓ (shared)
    → StatusBadge
    → VoteStatusBadge

AdminDisputesDashboardPage
  → KPICard ✓ (shared)
  → DonutChart ✓ (shared)
  → LeaderboardTable
    → Avatar ✓ (shared)
  → DataTable ✓ (shared)
```

**Shared Components** (Reusable):
- Avatar
- Badge
- Button
- Card
- Alert
- Modal
- Accordion
- Tabs
- Dropdown
- DateRangePicker
- SearchBar
- TimelineStepper
- ProgressBar
- PieChart
- DonutChart
- DataTable
- KPICard
- Skeleton
- Spinner
- CopyButton

**Dispute-Specific Components** (New):
- DisputeHeader
- PartiesCard
- EvidenceViewer
- IPFSPreview
- JurorsCard
- VotingStatus
- CountdownTimer
- JuryVotingPanel (CommitPhaseUI, RevealPhaseUI)
- RulingCard
- DisputeCard
- VoteStatusBadge
- StatusBadge (dispute-specific variant)

---

## 5. Component Testing Strategy

### 5.1 Unit Tests (Jest + React Testing Library)

**Example: DisputeHeader.test.tsx**
```typescript
import { render, screen } from '@testing-library/react';
import { DisputeHeader } from './DisputeHeader';

describe('DisputeHeader', () => {
  const mockDispute = {
    id: 123,
    status: 'COMMIT' as const,
    orderId: 456,
    createdAt: 1000,
    commitPhaseEnd: 5320,
    revealPhaseEnd: 9640,
  };

  it('renders dispute ID', () => {
    render(<DisputeHeader dispute={mockDispute} />);
    expect(screen.getByText('Dispute #123')).toBeInTheDocument();
  });

  it('renders correct status badge', () => {
    render(<DisputeHeader dispute={mockDispute} />);
    expect(screen.getByText('Commit Phase')).toBeInTheDocument();
  });

  it('renders timeline stepper', () => {
    render(<DisputeHeader dispute={mockDispute} />);
    expect(screen.getByText('Opened')).toBeInTheDocument();
    expect(screen.getByText('Commit Phase')).toBeInTheDocument();
  });

  it('renders order link', () => {
    render(<DisputeHeader dispute={mockDispute} />);
    const link = screen.getByText('View Order #456 →');
    expect(link).toHaveAttribute('href', '/app/orders/456');
  });
});
```

### 5.2 Integration Tests

**Example: DisputeDetailPage.test.tsx**
```typescript
describe('DisputeDetailPage (Juror Voting)', () => {
  it('shows commit UI for juror during commit phase', () => {
    mockUseDisputeDetails({ status: 'COMMIT', isJuror: true });

    render(<DisputeDetailPage disputeId={123} />);

    expect(screen.getByText('Your Vote (Commit Phase)')).toBeInTheDocument();
    expect(screen.getByLabelText('Refund Buyer')).toBeInTheDocument();
    expect(screen.getByText('Commit Vote')).toBeInTheDocument();
  });

  it('shows reveal UI for juror during reveal phase', () => {
    mockUseDisputeDetails({ status: 'REVEAL', isJuror: true, hasCommitted: true });

    render(<DisputeDetailPage disputeId={123} />);

    expect(screen.getByText('Your Vote (Reveal Phase)')).toBeInTheDocument();
    expect(screen.getByText('Reveal Vote')).toBeInTheDocument();
  });
});
```

### 5.3 Accessibility Tests (axe-core)

```typescript
import { axe } from 'jest-axe';

it('has no accessibility violations', async () => {
  const { container } = render(<DisputeHeader dispute={mockDispute} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

**Document Status**: ✅ COMPLETE
**Total Components**: 6 primary + 10 subcomponents + 15 shared
**Lines of Code Estimate**: ~2,500 lines (components + tests)
**Next Document**: PAGES.md
