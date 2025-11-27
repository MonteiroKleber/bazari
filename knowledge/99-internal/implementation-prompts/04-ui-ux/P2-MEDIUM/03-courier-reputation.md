# Courier Reputation System UI/UX - Implementation Prompt

**Phase**: P2 - MEDIUM Priority
**Priority**: MEDIUM
**Effort**: 4 days
**Dependencies**: bazari-fulfillment pallet
**Pallets**: bazari-fulfillment
**Version**: 1.0
**Last Updated**: 2025-11-14

---

## 📋 Context

Enhance courier profile and reputation display:

1. **Courier Public Profile** - Public page showing courier stats, reputation, reviews
2. **Stake Panel** - Require 1000 BZR stake during registration
3. **Reputation Score Enhanced** - Detailed breakdown of reputation calculation
4. **Courier Stats Card** - Summary of performance metrics

**Current State** (from Gap Analysis Sections 5.1, 5.2):
- ⚠️ DeliveryProfileSetupPage exists but doesn't enforce stake
- ❌ No public courier profile page
- ❌ No reputation breakdown

---

## 🎯 Objective

**Deliverables**:
- 1 page (CourierPublicProfilePage)
- 4 components (StakePanel, ReputationScoreEnhanced, CourierStatsCard, CourierBadges)
- 3 hooks (useRegisterCourier with stake, useCourierReputation, useCourierStats)

---

## 🔨 Implementation Details

### Step 1: Add Stake Panel to Registration (1 day)

**Location**: `/root/bazari/apps/web/src/components/couriers/StakePanel.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBalances } from '@/hooks/blockchain/useBalances';
import { AlertTriangle } from 'lucide-react';

const REQUIRED_STAKE = 1000; // 1000 BZR

export function StakePanel({ onStakeChange }: { onStakeChange: (amount: number) => void }) {
  const { data: balances } = useBalances();
  const bzrBalance = parseFloat(balances?.bzr || '0');
  const hasSufficientBalance = bzrBalance >= REQUIRED_STAKE;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stake Requirement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Couriers must stake 1000 BZR to register. This stake can be slashed for misconduct.
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Required Stake</span>
            <span className="font-bold">{REQUIRED_STAKE} BZR</span>
          </div>
          <div className="flex justify-between">
            <span>Your Balance</span>
            <span className={hasSufficientBalance ? 'text-green-600' : 'text-red-600'}>
              {bzrBalance.toFixed(2)} BZR
            </span>
          </div>
        </div>

        {!hasSufficientBalance && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Insufficient balance. You need {(REQUIRED_STAKE - bzrBalance).toFixed(2)} more BZR to register as a courier.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
```

**Edit**: `/root/bazari/apps/web/src/app/delivery/profile-setup/page.tsx`

```typescript
import { StakePanel } from '@/components/couriers/StakePanel';
import { useRegisterCourier } from '@/hooks/blockchain/useRegisterCourier';

export default function DeliveryProfileSetupPage() {
  const { mutate: registerCourier } = useRegisterCourier();

  const handleRegister = (data) => {
    registerCourier({
      vehicleType: data.vehicleType,
      serviceArea: data.serviceArea,
      stake: 1000, // Required stake
    });
  };

  return (
    <div className="space-y-6">
      <StakePanel onStakeChange={() => {}} />

      {/* Existing registration form */}
      <Button onClick={handleRegister}>Register as Courier</Button>
    </div>
  );
}
```

---

### Step 2: Create ReputationScoreEnhanced Component (1 day)

**Location**: `/root/bazari/apps/web/src/components/couriers/ReputationScoreEnhanced.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';

interface ReputationBreakdown {
  totalScore: number; // 0-1000
  breakdown: {
    successfulDeliveries: number; // 0-400
    avgRating: number; // 0-400
    disputes: number; // -200 to 0
    bonuses: number; // 0-200
  };
}

export function ReputationScoreEnhanced({ reputation }: { reputation: ReputationBreakdown }) {
  const getBadge = (score: number) => {
    if (score >= 900) return { label: 'Master Courier', color: 'bg-purple-100 text-purple-800' };
    if (score >= 750) return { label: 'Expert Courier', color: 'bg-blue-100 text-blue-800' };
    if (score >= 500) return { label: 'Verified Courier', color: 'bg-green-100 text-green-800' };
    return { label: 'Novice Courier', color: 'bg-gray-100 text-gray-800' };
  };

  const badge = getBadge(reputation.totalScore);
  const starRating = (reputation.totalScore / 200).toFixed(1); // 1000 score = 5 stars

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Reputation Score</CardTitle>
          <Badge className={badge.color}>{badge.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Score */}
        <div className="text-center">
          <div className="text-5xl font-bold">{reputation.totalScore}</div>
          <div className="text-muted-foreground">out of 1000</div>
          <div className="flex items-center justify-center gap-1 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${
                  i < Math.floor(parseFloat(starRating))
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
            <span className="ml-2 font-semibold">{starRating}★</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Successful Deliveries</span>
              <span className="font-semibold">{reputation.breakdown.successfulDeliveries}/400</span>
            </div>
            <Progress value={(reputation.breakdown.successfulDeliveries / 400) * 100} />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Average Rating</span>
              <span className="font-semibold">{reputation.breakdown.avgRating}/400</span>
            </div>
            <Progress value={(reputation.breakdown.avgRating / 400) * 100} />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Disputes Penalty</span>
              <span className="font-semibold text-red-600">{reputation.breakdown.disputes}</span>
            </div>
            <Progress value={Math.abs((reputation.breakdown.disputes / 200) * 100)} className="bg-red-100" />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Bonuses</span>
              <span className="font-semibold text-green-600">+{reputation.breakdown.bonuses}</span>
            </div>
            <Progress value={(reputation.breakdown.bonuses / 200) * 100} className="bg-green-100" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### Step 3: Create CourierPublicProfilePage (2 days)

**Location**: `/root/bazari/apps/web/src/app/couriers/[address]/page.tsx`

```typescript
import { useParams } from 'next/navigation';
import { useCourierProfile } from '@/hooks/blockchain/useCourierProfile';
import { ReputationScoreEnhanced } from '@/components/couriers/ReputationScoreEnhanced';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export default function CourierPublicProfilePage() {
  const params = useParams();
  const courierAddress = params.address as string;

  const { data: courier, isLoading } = useCourierProfile(courierAddress);

  if (isLoading) return <div>Loading courier profile...</div>;
  if (!courier) return <div>Courier not found</div>;

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={courier.avatarUrl} />
          <AvatarFallback>{courier.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{courier.name || 'Anonymous Courier'}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground font-mono">
              {courierAddress.slice(0, 10)}...{courierAddress.slice(-8)}
            </span>
            {courier.isActive && <Badge variant="success">Active</Badge>}
          </div>
        </div>
      </div>

      {/* Reputation Score */}
      <ReputationScoreEnhanced reputation={courier.reputation} />

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Stats</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold">{courier.stats.totalDeliveries}</div>
            <div className="text-sm text-muted-foreground">Total Deliveries</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{courier.stats.successRate}%</div>
            <div className="text-sm text-muted-foreground">Success Rate</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{courier.stats.avgDeliveryTime}h</div>
            <div className="text-sm text-muted-foreground">Avg Delivery Time</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{courier.stake} BZR</div>
            <div className="text-sm text-muted-foreground">Stake</div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reviews</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {courier.reviews?.map((review) => (
            <div key={review.id} className="border-b pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{review.rating}/5</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm">{review.comment}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Hook**: `/root/bazari/apps/web/src/hooks/blockchain/useCourierProfile.ts`

```typescript
import { useQuery } from '@tanstack/react-query';

export function useCourierProfile(address: string) {
  return useQuery({
    queryKey: ['courier-profile', address],
    queryFn: async () => {
      const response = await fetch(`/api/couriers/${address}`);
      return response.json();
    },
  });
}
```

---

## ✅ Acceptance Criteria

1. **Stake Requirement**
   - [ ] StakePanel shows required 1000 BZR
   - [ ] Registration disabled if balance < 1000 BZR
   - [ ] Warning displayed for insufficient balance

2. **Reputation Display**
   - [ ] Total score (0-1000) displayed prominently
   - [ ] Star rating (0-5) calculated correctly (score/200)
   - [ ] Breakdown shows 4 components: deliveries, rating, disputes, bonuses
   - [ ] Badge shown: Master (900+), Expert (750+), Verified (500+), Novice (<500)

3. **Public Profile**
   - [ ] Profile accessible at `/couriers/[address]`
   - [ ] Shows stats: total deliveries, success rate, avg time, stake
   - [ ] Reviews displayed with rating + comment

---

## 🧪 Testing

**Manual**:
- [ ] Register courier with < 1000 BZR → verify error
- [ ] Register with >= 1000 BZR → verify success
- [ ] Visit `/couriers/0xABC...` → verify profile displays
- [ ] Courier with 950 score → verify "Master Courier" badge

---

## 🤖 Prompt for Claude Code

```
Implement Courier Reputation System UI/UX for bazari-fulfillment pallet.

**Objective**:
1. Add StakePanel to DeliveryProfileSetupPage (require 1000 BZR)
2. Create ReputationScoreEnhanced component (breakdown + badge)
3. Create CourierPublicProfilePage with stats and reviews

**Components**:
- /root/bazari/apps/web/src/components/couriers/StakePanel.tsx
- /root/bazari/apps/web/src/components/couriers/ReputationScoreEnhanced.tsx
- /root/bazari/apps/web/src/app/couriers/[address]/page.tsx
- /root/bazari/apps/web/src/hooks/blockchain/useCourierProfile.ts

**Testing**: Register with insufficient balance, view public profile, verify reputation breakdown

**References**: /root/bazari/UI_UX_GAP_ANALYSIS.md Sections 5.1, 5.2
```

---

**Version**: 1.0
**Last Updated**: 2025-11-14
