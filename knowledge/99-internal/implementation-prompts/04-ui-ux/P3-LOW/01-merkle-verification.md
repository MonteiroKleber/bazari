# Merkle Verification UI/UX - Implementation Prompt

**Phase**: P3 - LOW Priority
**Priority**: LOW
**Effort**: 6 days
**Dependencies**: bazari-fulfillment, bazari-affiliate pallets
**Pallets**: bazari-fulfillment, bazari-affiliate
**Version**: 1.0
**Last Updated**: 2025-11-14

---

## 📋 Context

Implement Merkle proof verification for reviews and affiliate commissions:

1. **MerkleProofViewer** - Visual verification of Merkle proofs
2. **Review Merkle Verification** - Verify reviews are in Merkle tree
3. **Affiliate Commission Verification** - Verify commission splits using Merkle proofs
4. **Privacy-Preserving Display** - Show verification without exposing tree structure

**Current State** (from Gap Analysis Sections 5.4, 6.4):
- ❌ No Merkle proof visualization
- ❌ No review verification UI
- ❌ No commission split verification

---

## 🎯 Objective

**Deliverables**:
- 2 components (MerkleProofViewer, VerifiedBadge)
- 2 hooks (useMerkleProof, useVerifyReview)
- Merkle proof generation logic (client-side)

---

## 🔨 Implementation Details

### Step 1: Create MerkleProofViewer Component (3 days)

**Location**: `/root/bazari/apps/web/src/components/merkle/MerkleProofViewer.tsx`

```typescript
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMerkleProof } from '@/hooks/blockchain/useMerkleProof';
import { CheckCircle2, XCircle } from 'lucide-react';

interface MerkleProofViewerProps {
  type: 'review' | 'commission';
  itemId: string; // Review ID or Commission ID
  onChainRoot: string; // Merkle root from blockchain
}

export function MerkleProofViewer({ type, itemId, onChainRoot }: MerkleProofViewerProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    proof: string[];
  } | null>(null);

  const { mutate: generateProof } = useMerkleProof();

  const handleVerify = () => {
    setIsVerifying(true);

    generateProof(
      { type, itemId },
      {
        onSuccess: (proof) => {
          // Verify proof against on-chain root
          const computedRoot = computeMerkleRoot(itemId, proof);
          const verified = computedRoot === onChainRoot;

          setVerificationResult({ verified, proof });
          setIsVerifying(false);
        },
        onError: () => {
          setIsVerifying(false);
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Merkle Proof Verification</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Verify that this {type} is included in the on-chain Merkle tree without revealing the entire tree structure.
        </div>

        <Button onClick={handleVerify} disabled={isVerifying}>
          {isVerifying ? 'Verifying...' : 'Verify Proof'}
        </Button>

        {verificationResult && (
          <Alert variant={verificationResult.verified ? 'default' : 'destructive'}>
            <div className="flex items-center gap-2">
              {verificationResult.verified ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <AlertDescription>
                {verificationResult.verified
                  ? `✅ ${type === 'review' ? 'Review' : 'Commission'} verified on-chain`
                  : `❌ Verification failed - ${type} not found in Merkle tree`}
              </AlertDescription>
            </div>
          </Alert>
        )}

        {verificationResult && verificationResult.verified && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Merkle Proof Path:</div>
            <div className="bg-muted p-3 rounded text-xs font-mono space-y-1 max-h-48 overflow-auto">
              {verificationResult.proof.map((hash, index) => (
                <div key={index}>
                  Level {index}: {hash.slice(0, 16)}...{hash.slice(-16)}
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              Privacy note: Only the proof path is revealed, not the entire tree.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Utility: Compute Merkle root from leaf and proof
function computeMerkleRoot(leaf: string, proof: string[]): string {
  let currentHash = hashLeaf(leaf);

  for (const siblingHash of proof) {
    currentHash = hashPair(currentHash, siblingHash);
  }

  return currentHash;
}

function hashLeaf(data: string): string {
  // Keccak-256 hash (use @polkadot/util-crypto)
  return keccak256(data);
}

function hashPair(left: string, right: string): string {
  // Sort to ensure deterministic hashing
  const [first, second] = left < right ? [left, right] : [right, left];
  return keccak256(first + second);
}
```

---

### Step 2: Create useMerkleProof Hook (2 days)

**Location**: `/root/bazari/apps/web/src/hooks/blockchain/useMerkleProof.ts`

```typescript
import { useMutation } from '@tanstack/react-query';

interface GenerateProofParams {
  type: 'review' | 'commission';
  itemId: string;
}

export function useMerkleProof() {
  return useMutation({
    mutationFn: async ({ type, itemId }: GenerateProofParams) => {
      // Fetch proof from backend indexer
      const response = await fetch(`/api/merkle/proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, itemId }),
      });

      const data = await response.json();

      return data.proof as string[]; // Array of sibling hashes
    },
  });
}
```

**Backend Endpoint** (for reference):

```typescript
// /root/bazari/apps/api/src/routes/merkle.routes.ts
export async function generateMerkleProof(req, res) {
  const { type, itemId } = req.body;

  let tree: string[];
  let leafIndex: number;

  if (type === 'review') {
    // Fetch all review hashes for this courier
    const reviews = await prisma.review.findMany({
      where: { courierId: itemId },
      orderBy: { createdAt: 'asc' },
    });

    tree = reviews.map((r) => keccak256(JSON.stringify(r)));
    leafIndex = tree.indexOf(keccak256(JSON.stringify(reviews.find((r) => r.id === itemId))));
  } else if (type === 'commission') {
    // Fetch commission tree
    const commissions = await prisma.commission.findMany({
      where: { affiliateId: itemId },
      orderBy: { createdAt: 'asc' },
    });

    tree = commissions.map((c) => keccak256(JSON.stringify(c)));
    leafIndex = tree.indexOf(keccak256(JSON.stringify(commissions.find((c) => c.id === itemId))));
  }

  // Generate Merkle proof
  const proof = generateProofPath(tree, leafIndex);

  res.json({ proof });
}

function generateProofPath(tree: string[], leafIndex: number): string[] {
  const proof: string[] = [];
  let currentIndex = leafIndex;
  let currentLevel = tree;

  while (currentLevel.length > 1) {
    const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;

    if (siblingIndex < currentLevel.length) {
      proof.push(currentLevel[siblingIndex]);
    }

    // Move to next level
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = currentLevel[i + 1] || left;
      nextLevel.push(hashPair(left, right));
    }

    currentLevel = nextLevel;
    currentIndex = Math.floor(currentIndex / 2);
  }

  return proof;
}
```

---

### Step 3: Add Verified Badge to Reviews (1 day)

**Location**: `/root/bazari/apps/web/src/components/reviews/VerifiedBadge.tsx`

```typescript
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function VerifiedBadge({ verified }: { verified: boolean }) {
  if (!verified) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Verified
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>This review is verified on-chain using Merkle proof</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

**Integration**: Add to CourierProfilePage

```typescript
import { VerifiedBadge } from '@/components/reviews/VerifiedBadge';

{courier.reviews?.map((review) => (
  <div key={review.id} className="border-b pb-3">
    <div className="flex items-center gap-2">
      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      <span>{review.rating}/5</span>
      <VerifiedBadge verified={review.merkleVerified} />
    </div>
    <p className="text-sm">{review.comment}</p>
  </div>
))}
```

---

## ✅ Acceptance Criteria

1. **Merkle Proof Verification**
   - [ ] "Verify Proof" button generates proof
   - [ ] Proof path displayed (hash levels)
   - [ ] Verification success/failure shown
   - [ ] Privacy note: "Only proof path revealed, not entire tree"

2. **Review Verification**
   - [ ] Reviews show "Verified" badge if Merkle verified
   - [ ] Badge tooltip explains Merkle proof
   - [ ] Clicking badge opens MerkleProofViewer

3. **Commission Verification**
   - [ ] Commission splits can be verified
   - [ ] Multi-level splits show Merkle path

---

## 🧪 Testing

**Manual**:
- [ ] View courier profile → click "Verify" on review → verify proof shown
- [ ] Submit review → verify "Verified" badge appears after Merkle root updated
- [ ] Commission split → verify Merkle proof validates split

---

## 🤖 Prompt for Claude Code

```
Implement Merkle Verification UI/UX for bazari-fulfillment and bazari-affiliate pallets.

**Objective**:
1. Create MerkleProofViewer component (proof path visualization)
2. Implement useMerkleProof hook (client-side verification)
3. Add VerifiedBadge to reviews
4. Backend: Generate Merkle proof path (POST /api/merkle/proof)

**Components**:
- /root/bazari/apps/web/src/components/merkle/MerkleProofViewer.tsx
- /root/bazari/apps/web/src/components/reviews/VerifiedBadge.tsx
- /root/bazari/apps/web/src/hooks/blockchain/useMerkleProof.ts
- /root/bazari/apps/api/src/routes/merkle.routes.ts (backend)

**Testing**: Verify review Merkle proof, verify commission split proof

**References**: /root/bazari/UI_UX_GAP_ANALYSIS.md Sections 5.4, 6.4
```

---

**Version**: 1.0
**Last Updated**: 2025-11-14
