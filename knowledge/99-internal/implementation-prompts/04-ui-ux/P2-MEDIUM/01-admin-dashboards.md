# Admin Dashboards UI/UX - Implementation Prompt

**Phase**: P2 - MEDIUM Priority
**Priority**: MEDIUM
**Effort**: 9 days
**Dependencies**: bazari-fee, bazari-fulfillment, bazari-dispute pallets
**Pallets**: bazari-fee, bazari-fulfillment, bazari-dispute
**Version**: 1.0
**Last Updated**: 2025-11-14

---

## 📋 Context

### Problem Statement

Multiple pallets need admin/DAO-only dashboards for analytics and management:

1. **Fee Analytics**: No visualization of fees collected over time
2. **Courier Slashing**: No interface for DAO to slash misbehaving couriers
3. **Dispute Analytics**: No dashboard showing dispute statistics and rulings

**Current State** (from Gap Analysis):
- ❌ No fee analytics page (Section 7.3)
- ❌ No courier slashing interface (Section 5.3)
- ❌ No dispute dashboard (Section 8.4)

**Impact**: DAO cannot monitor platform health, enforce courier standards, or analyze dispute patterns.

---

## 🎯 Objective

Create 3 admin dashboards with analytics and management capabilities:

1. **FeeAnalyticsPage** - Treasury analytics and fee trends
2. **AdminCourierSlashingPage** - DAO interface for slashing couriers
3. **AdminDisputesDashboardPage** - Dispute statistics and ruling breakdown

**Deliverables**:
- 3 admin pages
- 6 components (charts, tables, forms)
- 5 blockchain hooks

---

## 📐 Specs

### 3.1 Fee Analytics Requirements

**Metrics**:
- Total fees collected (lifetime)
- Fees per month (line chart)
- Top stores by fees generated
- Average fee per order
- Treasury balance

**Data Source**: Backend indexer (`GET /api/admin/fees/analytics`)

### 3.2 Courier Slashing Requirements

**Extrinsic**:
```rust
pub fn slash_courier(
    origin: OriginFor<T>,
    courier: AccountId,
    amount: Balance, // Amount to slash from stake
    reason: Vec<u8>,
) -> DispatchResult
```

**Requirements**:
- DAO origin only
- Amount <= courier's current stake
- Reason required (stored on-chain)

### 3.3 Dispute Dashboard Requirements

**Metrics**:
- Total disputes
- Resolution rate (%)
- Average resolution time
- Ruling breakdown (RefundBuyer vs ReleaseSeller vs PartialRefund)
- Juror leaderboard (most active)

**Data Source**: Backend indexer (`GET /api/admin/disputes/stats`)

---

## 🔨 Implementation Details

### Step 1: Create FeeAnalyticsPage (3 days)

**Location**: `/root/bazari/apps/web/src/app/admin/fees/analytics/page.tsx`

```typescript
import { RequireDAO } from '@/components/auth/RequireDAO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatBZR } from '@/lib/utils';

interface FeeAnalytics {
  totalFeesCollected: string;
  treasuryBalance: string;
  monthlyFees: Array<{ month: string; amount: number }>;
  topStores: Array<{ storeId: string; storeName: string; feesGenerated: string }>;
  avgFeePerOrder: string;
}

export default function FeeAnalyticsPage() {
  const { data, isLoading } = useQuery<FeeAnalytics>({
    queryKey: ['fee-analytics'],
    queryFn: async () => {
      const response = await fetch('/api/admin/fees/analytics');
      return response.json();
    },
  });

  if (isLoading) return <div>Loading analytics...</div>;

  return (
    <RequireDAO>
      <div className="container mx-auto py-8 space-y-6">
        <h1 className="text-3xl font-bold">Fee Analytics</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total Fees Collected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatBZR(data?.totalFeesCollected || '0')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Treasury Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatBZR(data?.treasuryBalance || '0')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Avg Fee per Order</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {formatBZR(data?.avgFeePerOrder || '0')}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Fees Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Fees Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data?.monthlyFees || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatBZR(value.toString())} />
                <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Stores */}
        <Card>
          <CardHeader>
            <CardTitle>Top Stores by Fees Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data?.topStores.map((store, index) => (
                <div key={store.storeId} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <div className="font-semibold text-muted-foreground">#{index + 1}</div>
                    <div>
                      <div className="font-medium">{store.storeName}</div>
                      <div className="text-xs text-muted-foreground">ID: {store.storeId}</div>
                    </div>
                  </div>
                  <div className="font-bold">{formatBZR(store.feesGenerated)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </RequireDAO>
  );
}
```

---

### Step 2: Create AdminCourierSlashingPage (3 days)

**Location**: `/root/bazari/apps/web/src/app/admin/couriers/page.tsx`

```typescript
import { useState } from 'react';
import { RequireDAO } from '@/components/auth/RequireDAO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { useSlashCourier } from '@/hooks/blockchain/useSlashCourier';
import { SlashCourierModal } from '@/components/couriers/SlashCourierModal';
import { Badge } from '@/components/ui/badge';

interface CourierRow {
  address: string;
  stake: string;
  reputation: number;
  totalDeliveries: number;
  disputes: number;
  status: 'Active' | 'Slashed';
}

export default function AdminCourierSlashingPage() {
  const [selectedCourier, setSelectedCourier] = useState<CourierRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: couriers, isLoading } = useQuery<CourierRow[]>({
    queryKey: ['admin-couriers'],
    queryFn: async () => {
      const response = await fetch('/api/admin/couriers');
      return response.json();
    },
  });

  const handleSlash = (courier: CourierRow) => {
    setSelectedCourier(courier);
    setModalOpen(true);
  };

  return (
    <RequireDAO>
      <div className="container mx-auto py-8 space-y-6">
        <h1 className="text-3xl font-bold">Courier Management</h1>

        <Card>
          <CardHeader>
            <CardTitle>Registered Couriers ({couriers?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div>Loading couriers...</div>
            ) : (
              <div className="space-y-3">
                {couriers?.map((courier) => (
                  <div key={courier.address} className="flex items-center justify-between p-4 border rounded">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {courier.address.slice(0, 10)}...{courier.address.slice(-8)}
                        </span>
                        <Badge variant={courier.status === 'Active' ? 'default' : 'destructive'}>
                          {courier.status}
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>Stake: {courier.stake} BZR</span>
                        <span>Reputation: {courier.reputation}/1000</span>
                        <span>Deliveries: {courier.totalDeliveries}</span>
                        <span>Disputes: {courier.disputes}</span>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleSlash(courier)}
                      disabled={courier.status === 'Slashed'}
                    >
                      Slash Courier
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedCourier && (
          <SlashCourierModal
            courier={selectedCourier}
            open={modalOpen}
            onClose={() => setModalOpen(false)}
          />
        )}
      </div>
    </RequireDAO>
  );
}
```

**Component**: `/root/bazari/apps/web/src/components/couriers/SlashCourierModal.tsx`

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useSlashCourier } from '@/hooks/blockchain/useSlashCourier';

const slashSchema = z.object({
  amount: z.string().min(1, 'Required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

export function SlashCourierModal({ courier, open, onClose }) {
  const { mutate: slashCourier, isPending } = useSlashCourier();

  const form = useForm({
    resolver: zodResolver(slashSchema),
    defaultValues: {
      amount: '',
      reason: '',
    },
  });

  const onSubmit = (data) => {
    slashCourier(
      {
        courierAddress: courier.address,
        amount: data.amount,
        reason: data.reason,
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Slash Courier</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount to Slash (BZR)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" max={courier.stake} />
                  </FormControl>
                  <FormMessage />
                  <div className="text-xs text-muted-foreground">
                    Max: {courier.stake} BZR (current stake)
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Explain why this courier is being slashed..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} type="button">
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={isPending}>
                {isPending ? 'Processing...' : 'Confirm Slash'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

**Hook**: `/root/bazari/apps/web/src/hooks/blockchain/useSlashCourier.ts`

```typescript
import { useBlockchainTx } from './useBlockchainTx';
import { usePolkadotApi } from '@/providers/PolkadotProvider';

interface SlashCourierParams {
  courierAddress: string;
  amount: string;
  reason: string;
}

export function useSlashCourier() {
  const { api } = usePolkadotApi();

  return useBlockchainTx<SlashCourierParams, void>(
    'slash_courier',
    async ({ courierAddress, amount, reason }, signer) => {
      if (!api) throw new Error('API not ready');

      const tx = api.tx.bazariFulfillment.slashCourier(courierAddress, amount, reason);

      return new Promise((resolve, reject) => {
        tx.signAndSend(signer, ({ status }) => {
          if (status.isInBlock) {
            resolve();
          }
        }).catch(reject);
      });
    }
  );
}
```

---

### Step 3: Create AdminDisputesDashboardPage (3 days)

**Location**: `/root/bazari/apps/web/src/app/admin/disputes/page.tsx`

```typescript
import { RequireDAO } from '@/components/auth/RequireDAO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface DisputeStats {
  totalDisputes: number;
  resolved: number;
  pending: number;
  resolutionRate: number;
  avgResolutionTime: string; // "2.5 days"
  rulingBreakdown: Array<{ ruling: string; count: number }>;
  topJurors: Array<{ address: string; participationCount: number }>;
}

export default function AdminDisputesDashboardPage() {
  const { data, isLoading } = useQuery<DisputeStats>({
    queryKey: ['dispute-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/disputes/stats');
      return response.json();
    },
  });

  if (isLoading) return <div>Loading dispute stats...</div>;

  const rulingChartData = data?.rulingBreakdown.map((item) => ({
    name: item.ruling,
    value: item.count,
  }));

  const COLORS = {
    RefundBuyer: '#ef4444',
    ReleaseSeller: '#10b981',
    PartialRefund: '#f59e0b',
  };

  return (
    <RequireDAO>
      <div className="container mx-auto py-8 space-y-6">
        <h1 className="text-3xl font-bold">Dispute Analytics</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total Disputes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data?.totalDisputes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Resolved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{data?.resolved}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Resolution Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data?.resolutionRate}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Avg Resolution Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data?.avgResolutionTime}</div>
            </CardContent>
          </Card>
        </div>

        {/* Ruling Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Ruling Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={rulingChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {rulingChartData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Juror Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle>Top Jurors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data?.topJurors.map((juror, index) => (
                <div key={juror.address} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    <div className="font-semibold text-muted-foreground">#{index + 1}</div>
                    <span className="font-mono text-sm">
                      {juror.address.slice(0, 10)}...{juror.address.slice(-8)}
                    </span>
                  </div>
                  <div className="font-bold">{juror.participationCount} disputes</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </RequireDAO>
  );
}
```

---

## ✅ Acceptance Criteria

1. **Fee Analytics**
   - [ ] Monthly fees chart displays correctly
   - [ ] Top stores ranked by fees generated
   - [ ] KPIs (total fees, treasury balance, avg fee) accurate

2. **Courier Slashing**
   - [ ] Only DAO members can access page
   - [ ] Slash modal validates amount <= courier stake
   - [ ] Reason required (min 10 characters)
   - [ ] Slashed couriers marked as "Slashed" status

3. **Dispute Dashboard**
   - [ ] Pie chart shows ruling distribution
   - [ ] Juror leaderboard shows top 10
   - [ ] Resolution rate calculated correctly

---

## 🧪 Testing

**Manual**:
- [ ] DAO login → Fee analytics shows charts
- [ ] Slash courier with 500 BZR → verify stake reduced
- [ ] Dispute dashboard shows ruling breakdown

---

## 🔗 References

- [Gap Analysis Sections 7.3, 5.3, 8.4](/root/bazari/UI_UX_GAP_ANALYSIS.md)

---

## 🤖 Prompt for Claude Code

```
Implement 3 Admin Dashboards for bazari-fee, bazari-fulfillment, and bazari-dispute pallets.

**Objective**:
1. FeeAnalyticsPage: Monthly fees chart, top stores, treasury balance
2. AdminCourierSlashingPage: Courier list, slash modal, stake management
3. AdminDisputesDashboardPage: Ruling pie chart, juror leaderboard, resolution stats

**Components**:
- /root/bazari/apps/web/src/app/admin/fees/analytics/page.tsx
- /root/bazari/apps/web/src/app/admin/couriers/page.tsx
- /root/bazari/apps/web/src/components/couriers/SlashCourierModal.tsx
- /root/bazari/apps/web/src/hooks/blockchain/useSlashCourier.ts
- /root/bazari/apps/web/src/app/admin/disputes/page.tsx

**Testing**: DAO access, fee trends, courier slashing (500 BZR), dispute chart

**References**: /root/bazari/UI_UX_GAP_ANALYSIS.md Sections 5.3, 7.3, 8.4
```

---

**Version**: 1.0
**Last Updated**: 2025-11-14
