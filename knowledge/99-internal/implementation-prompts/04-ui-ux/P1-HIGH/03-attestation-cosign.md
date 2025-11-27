# Attestation Co-Signature UI/UX - Implementation Prompt

**Phase**: P1 - HIGH Priority
**Priority**: HIGH
**Effort**: 5 days
**Dependencies**: bazari-attestation pallet, bazari-fulfillment pallet
**Pallets**: bazari-attestation
**Version**: 1.0
**Last Updated**: 2025-11-14

---

## 📋 Context

### Problem Statement

The **bazari-attestation** pallet has 60% UI coverage with critical co-signature features missing:

1. **No Co-Signature UI**: Proofs require 2-of-3 quorum but no signing interface
2. **No Quorum Status Display**: Cannot see signature progress (e.g., "2/3 signed")
3. **No Proof Type Differentiation**: 4 proof types (Handoff, Delivery, Packing, Inspection) not visualized
4. **No IPFS Preview**: Proofs link to IPFS but content not displayed
5. **Missing Proof Verification Page**: No dedicated page for viewing/signing proofs

**Current State** (from Gap Analysis Section 4.3):
- ✅ ActiveDeliveryPage submits proofs (IPFS upload)
- ✅ ProofCard displays basic proof details
- ❌ No co-signature flow
- ❌ No quorum visualization
- ❌ No proof type icons
- ❌ No IPFS content preview

**Impact**: Trust mechanism broken, proofs not verified, fraud potential.

---

## 🎯 Objective

Implement co-signature workflow and proof verification:

1. **ProofVerificationPage** - Dedicated page for viewing and signing proofs
2. **CoSignatureStatus Component** - Visual 2-of-3 quorum progress
3. **IPFSPreview Component** - Display IPFS content (images, JSON)
4. **ProofTypeIcon Component** - Icons for 4 proof types
5. **useProofDetails + useCoSignProof Hooks** - Blockchain integration

**Deliverables**:
- 1 page (ProofVerificationPage)
- 4 components (CoSignatureStatus, IPFSPreview, ProofTypeIcon, enhanced ProofCard)
- 4 hooks (useProofDetails, useCoSignProof, useProofsByOrder, useIPFSContent)

---

## 📐 Specs

### 3.1 Attestation Storage Structure (from bazari-attestation SPEC.md)

```rust
pub struct Attestation<AccountId, BlockNumber> {
    pub attestation_id: u64,
    pub proof_type: ProofType,
    pub ipfs_cid: BoundedVec<u8, ConstU32<64>>,
    pub attestor: AccountId,
    pub order_id: u64,
    pub co_signatures: BoundedVec<AccountId, ConstU32<3>>,
    pub verified: bool,
    pub created_at: BlockNumber,
}

pub enum ProofType {
    HandoffProof,     // Courier picks up from seller
    DeliveryProof,    // Courier delivers to buyer
    PackingProof,     // Seller packing verification
    InspectionProof,  // Quality inspection
}
```

### 3.2 Co-Signature Logic

```rust
pub fn co_sign(
    origin: OriginFor<T>,
    attestation_id: u64,
) -> DispatchResult

// Requirements:
// - Signer must be buyer, seller, or courier
// - Cannot sign twice
// - Auto-verifies when threshold met (2-of-3)
```

**Quorum Rules**:
- Threshold: 2 signatures required
- Parties: Buyer, Seller, Courier
- Auto-verification when 2nd signature added

### 3.3 Proof Types Visual Spec

```typescript
const PROOF_TYPE_CONFIG = {
  HandoffProof: {
    label: 'Pickup Confirmed',
    icon: '🤝',
    description: 'Courier picked up package from seller',
    color: 'blue',
  },
  DeliveryProof: {
    label: 'Delivery Confirmed',
    icon: '📦',
    description: 'Courier delivered package to buyer',
    color: 'green',
  },
  PackingProof: {
    label: 'Packing Verified',
    icon: '📦',
    description: 'Seller verified package contents',
    color: 'yellow',
  },
  InspectionProof: {
    label: 'Quality Inspected',
    icon: '🔍',
    description: 'Quality inspection completed',
    color: 'purple',
  },
};
```

---

## 🔨 Implementation Details

### Step 1: Create ProofTypeIcon Component (0.5 days)

**Location**: `/root/bazari/apps/web/src/components/attestation/ProofTypeIcon.tsx`

```typescript
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export enum ProofType {
  HandoffProof = 'HandoffProof',
  DeliveryProof = 'DeliveryProof',
  PackingProof = 'PackingProof',
  InspectionProof = 'InspectionProof',
}

interface ProofTypeIconProps {
  type: ProofType;
  variant?: 'icon-only' | 'label-only' | 'full';
  className?: string;
}

const PROOF_CONFIG = {
  [ProofType.HandoffProof]: {
    label: 'Pickup Confirmed',
    icon: '🤝',
    color: 'bg-blue-100 text-blue-800',
  },
  [ProofType.DeliveryProof]: {
    label: 'Delivery Confirmed',
    icon: '📦',
    color: 'bg-green-100 text-green-800',
  },
  [ProofType.PackingProof]: {
    label: 'Packing Verified',
    icon: '📦',
    color: 'bg-yellow-100 text-yellow-800',
  },
  [ProofType.InspectionProof]: {
    label: 'Quality Inspected',
    icon: '🔍',
    color: 'bg-purple-100 text-purple-800',
  },
};

export function ProofTypeIcon({
  type,
  variant = 'full',
  className,
}: ProofTypeIconProps) {
  const config = PROOF_CONFIG[type];

  if (variant === 'icon-only') {
    return <span className={className}>{config.icon}</span>;
  }

  if (variant === 'label-only') {
    return <span className={className}>{config.label}</span>;
  }

  return (
    <Badge className={cn(config.color, 'flex items-center gap-1', className)}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </Badge>
  );
}
```

---

### Step 2: Create CoSignatureStatus Component (1 day)

**Location**: `/root/bazari/apps/web/src/components/attestation/CoSignatureStatus.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Check, Clock } from 'lucide-react';

interface CoSignatureStatusProps {
  signatures: string[]; // AccountIds that signed
  parties: {
    buyer: string;
    seller: string;
    courier: string;
  };
  threshold: number; // 2
  verified: boolean;
}

export function CoSignatureStatus({
  signatures,
  parties,
  threshold,
  verified,
}: CoSignatureStatusProps) {
  const progress = (signatures.length / threshold) * 100;

  const hasSignedBuyer = signatures.includes(parties.buyer);
  const hasSignedSeller = signatures.includes(parties.seller);
  const hasSignedCourier = signatures.includes(parties.courier);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Co-Signatures</CardTitle>
          {verified && <Badge variant="success">✅ Verified</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Signature Progress</span>
            <span className="font-semibold">
              {signatures.length}/{threshold}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Party Status */}
        <div className="space-y-2">
          <SignatureRow
            label="Seller"
            address={parties.seller}
            hasSigned={hasSignedSeller}
          />
          <SignatureRow
            label="Courier"
            address={parties.courier}
            hasSigned={hasSignedCourier}
          />
          <SignatureRow
            label="Buyer"
            address={parties.buyer}
            hasSigned={hasSignedBuyer}
          />
        </div>

        {!verified && signatures.length < threshold && (
          <div className="text-sm text-muted-foreground">
            {threshold - signatures.length} more signature(s) needed to verify
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SignatureRow({
  label,
  address,
  hasSigned,
}: {
  label: string;
  address: string;
  hasSigned: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-2 border rounded">
      <div className="flex items-center gap-2">
        {hasSigned ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Clock className="h-4 w-4 text-gray-400" />
        )}
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-xs text-muted-foreground">
        {address.slice(0, 6)}...{address.slice(-4)}
      </span>
    </div>
  );
}
```

---

### Step 3: Create IPFSPreview Component (1 day)

**Location**: `/root/bazari/apps/web/src/components/attestation/IPFSPreview.tsx`

```typescript
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface IPFSPreviewProps {
  cid: string;
}

export function IPFSPreview({ cid }: IPFSPreviewProps) {
  const { data: content, isLoading } = useQuery({
    queryKey: ['ipfs-content', cid],
    queryFn: async () => {
      const response = await fetch(`/api/ipfs/${cid}/preview`);
      return response.json();
    },
  });

  if (isLoading) return <div>Loading IPFS content...</div>;

  const ipfsGatewayUrl = `https://ipfs.io/ipfs/${cid}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Proof Content</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(ipfsGatewayUrl, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Full
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {content?.type === 'image' ? (
          <img
            src={content.thumbnailUrl}
            alt="Proof"
            className="rounded-lg max-w-full h-auto"
          />
        ) : content?.type === 'json' ? (
          <pre className="bg-muted p-4 rounded text-sm overflow-auto max-h-96">
            {JSON.stringify(content.data, null, 2)}
          </pre>
        ) : (
          <div className="text-sm text-muted-foreground">
            Content type not supported for preview. Click "View Full" to see on IPFS.
          </div>
        )}

        <div className="mt-4 text-xs text-muted-foreground">
          IPFS CID: <code>{cid}</code>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### Step 4: Create Blockchain Hooks (1 day)

**4.1 useProofDetails Hook**

**Location**: `/root/bazari/apps/web/src/hooks/blockchain/useProofDetails.ts`

```typescript
import { usePolkadotApi } from '@/providers/PolkadotProvider';
import { useQuery } from '@tanstack/react-query';

interface ProofDetails {
  attestationId: number;
  proofType: string;
  ipfsCid: string;
  attestor: string;
  orderId: number;
  coSignatures: string[];
  verified: boolean;
  createdAt: number;
}

export function useProofDetails(attestationId: number) {
  const { api } = usePolkadotApi();

  return useQuery<ProofDetails>({
    queryKey: ['proof-details', attestationId],
    queryFn: async () => {
      if (!api) throw new Error('API not ready');

      const attestation = await api.query.bazariAttestation.attestations(
        attestationId
      );

      if (attestation.isNone) {
        throw new Error('Proof not found');
      }

      const data = attestation.unwrap();

      return {
        attestationId,
        proofType: data.proofType.toString(),
        ipfsCid: data.ipfsCid.toString(),
        attestor: data.attestor.toString(),
        orderId: data.orderId.toNumber(),
        coSignatures: data.coSignatures.map((s) => s.toString()),
        verified: data.verified.isTrue,
        createdAt: data.createdAt.toNumber(),
      };
    },
    enabled: !!api && !!attestationId,
  });
}
```

**4.2 useCoSignProof Hook**

**Location**: `/root/bazari/apps/web/src/hooks/blockchain/useCoSignProof.ts`

```typescript
import { useBlockchainTx } from './useBlockchainTx';
import { usePolkadotApi } from '@/providers/PolkadotProvider';

interface CoSignProofParams {
  attestationId: number;
}

export function useCoSignProof() {
  const { api } = usePolkadotApi();

  return useBlockchainTx<CoSignProofParams, void>(
    'co_sign',
    async ({ attestationId }, signer) => {
      if (!api) throw new Error('API not ready');

      const tx = api.tx.bazariAttestation.coSign(attestationId);

      return new Promise((resolve, reject) => {
        tx.signAndSend(signer, ({ status, events }) => {
          if (status.isInBlock) {
            const coSignedEvent = events.find((e) =>
              e.event.method === 'ProofCoSigned'
            );

            if (coSignedEvent) {
              resolve();
            } else {
              reject(new Error('Co-signature failed'));
            }
          }
        }).catch(reject);
      });
    }
  );
}
```

---

### Step 5: Create ProofVerificationPage (1.5 days)

**Location**: `/root/bazari/apps/web/src/app/orders/[orderId]/proofs/[proofId]/page.tsx`

```typescript
import { useParams } from 'next/navigation';
import { useProofDetails } from '@/hooks/blockchain/useProofDetails';
import { useCoSignProof } from '@/hooks/blockchain/useCoSignProof';
import { useSession } from '@/providers/SessionProvider';
import { ProofTypeIcon, ProofType } from '@/components/attestation/ProofTypeIcon';
import { CoSignatureStatus } from '@/components/attestation/CoSignatureStatus';
import { IPFSPreview } from '@/components/attestation/IPFSPreview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function ProofVerificationPage() {
  const params = useParams();
  const proofId = parseInt(params.proofId as string);

  const { data: proof, isLoading } = useProofDetails(proofId);
  const { mutate: coSign, isPending } = useCoSignProof();
  const { user } = useSession();

  const canSign = useMemo(() => {
    if (!proof || !user) return false;

    // Check if user is a party and hasn't signed yet
    const parties = [proof.buyer, proof.seller, proof.courier];
    const isParty = parties.includes(user.address);
    const hasSigned = proof.coSignatures.includes(user.address);

    return isParty && !hasSigned && !proof.verified;
  }, [proof, user]);

  const handleCoSign = () => {
    coSign({ attestationId: proofId });
  };

  if (isLoading) return <div>Loading proof...</div>;
  if (!proof) return <div>Proof not found</div>;

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proof #{proofId}</h1>
          <ProofTypeIcon type={proof.proofType as ProofType} className="mt-2" />
        </div>
        {canSign && (
          <Button onClick={handleCoSign} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? 'Signing...' : 'Sign This Proof'}
          </Button>
        )}
      </div>

      {/* Proof Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Proof Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Order ID</span>
            <span className="font-medium">#{proof.orderId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Submitted By</span>
            <span className="font-mono text-xs">
              {proof.attestor.slice(0, 8)}...{proof.attestor.slice(-6)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Block Number</span>
            <span className="font-medium">{proof.createdAt}</span>
          </div>
        </CardContent>
      </Card>

      {/* Co-Signature Status */}
      <CoSignatureStatus
        signatures={proof.coSignatures}
        parties={{
          buyer: proof.buyer,
          seller: proof.seller,
          courier: proof.courier,
        }}
        threshold={2}
        verified={proof.verified}
      />

      {/* IPFS Content Preview */}
      <IPFSPreview cid={proof.ipfsCid} />
    </div>
  );
}
```

---

## ✅ Acceptance Criteria

### Functional Requirements

1. **Co-Signature Flow**
   - [ ] "Sign This Proof" button appears only for parties who haven't signed
   - [ ] Button disabled after signing
   - [ ] Co-signature transaction completes successfully
   - [ ] Quorum status updates in real-time (2/3 → 3/3)

2. **Quorum Visualization**
   - [ ] Progress bar shows X/2 signatures
   - [ ] Checkmarks (✅) for parties who signed
   - [ ] Clock icons (⏰) for pending signatures
   - [ ] "Verified" badge appears when threshold met

3. **Proof Type Display**
   - [ ] All 4 proof types show correct icon + label
   - [ ] Icons: 🤝 Handoff, 📦 Delivery, 📦 Packing, 🔍 Inspection
   - [ ] Color coding: blue, green, yellow, purple

4. **IPFS Preview**
   - [ ] Images display thumbnail
   - [ ] JSON shows formatted preview
   - [ ] "View Full" button opens IPFS gateway
   - [ ] Unsupported types show message

### Non-Functional Requirements

5. **Performance**
   - [ ] IPFS content loads within 3s (cached in backend)
   - [ ] Co-signature completes within 6s (2 blocks)

6. **Security**
   - [ ] Cannot sign twice (backend validation)
   - [ ] Only buyer/seller/courier can sign

---

## 🧪 Testing

### Manual Testing

- [ ] **Co-Sign Flow**: Submit proof → verify 0/2 status → sign as seller → verify 1/2 → sign as courier → verify 2/2 + "Verified" badge
- [ ] **IPFS Preview**: Upload image proof → verify thumbnail displays → upload JSON proof → verify formatted preview
- [ ] **Proof Types**: Submit HandoffProof → verify 🤝 icon → submit DeliveryProof → verify 📦 icon
- [ ] **Authorization**: Login as unrelated user → verify "Sign" button hidden

---

## 📦 Dependencies

**Blockchain**:
- `bazari-attestation.coSign()` extrinsic
- `bazari-attestation.attestations()` storage query

**Backend**:
- `GET /api/ipfs/:cid/preview` (IPFS content cache)

---

## 🔗 References

- [bazari-attestation SPEC.md](/root/bazari/knowledge/20-blueprints/pallets/bazari-attestation/SPEC.md)
- [Gap Analysis - Section 4](/root/bazari/UI_UX_GAP_ANALYSIS.md#4-bazari-attestation-p2---proof-of-commerce)

---

## 🤖 Prompt for Claude Code

```
Implement Attestation Co-Signature UI/UX for bazari-attestation pallet.

**Context**:
- Repository: /root/bazari
- Problem: Proofs require 2-of-3 quorum but no signing UI, no proof type differentiation
- Gap Analysis: /root/bazari/UI_UX_GAP_ANALYSIS.md Section 4.3

**Objective**:
1. Create ProofTypeIcon component (4 types: Handoff, Delivery, Packing, Inspection)
2. Create CoSignatureStatus component (2/3 progress visualization)
3. Create IPFSPreview component (image/JSON preview)
4. Implement useProofDetails + useCoSignProof hooks
5. Create ProofVerificationPage

**Components**:
- /root/bazari/apps/web/src/components/attestation/ProofTypeIcon.tsx
- /root/bazari/apps/web/src/components/attestation/CoSignatureStatus.tsx
- /root/bazari/apps/web/src/components/attestation/IPFSPreview.tsx
- /root/bazari/apps/web/src/hooks/blockchain/useProofDetails.ts
- /root/bazari/apps/web/src/hooks/blockchain/useCoSignProof.ts
- /root/bazari/apps/web/src/app/orders/[orderId]/proofs/[proofId]/page.tsx

**Technical Specs**:
- Proof types: HandoffProof 🤝, DeliveryProof 📦, PackingProof 📦, InspectionProof 🔍
- Quorum: 2-of-3 signatures (buyer, seller, courier)
- Auto-verify when 2nd signature added
- IPFS preview: Fetch from /api/ipfs/:cid/preview (backend cache)

**Testing**:
- Manual: Submit proof → sign as seller → sign as courier → verify "Verified" badge

**References**:
- SPEC: /root/bazari/knowledge/20-blueprints/pallets/bazari-attestation/SPEC.md

When done, demonstrate co-signature flow with 2-of-3 quorum.
```

---

**Version**: 1.0
**Last Updated**: 2025-11-14
