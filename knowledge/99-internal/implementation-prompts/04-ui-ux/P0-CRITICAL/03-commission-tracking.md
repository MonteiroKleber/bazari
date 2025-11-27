# P0-CRITICAL: Commission Tracking UI

**Phase**: P0 | **Priority**: CRITICAL | **Effort**: 3 days | **Pallets**: bazari-commerce

---

## Metadata

- **Prompt ID**: P0-03
- **Created**: 2025-11-14
- **Gap**: 5% (small but critical new feature)
- **Blocks**: None
- **Dependencies**: `record_commission` extrinsic deployed, CommissionRecorded events
- **Team**: 1 frontend developer
- **Skills**: React, TypeScript, Polkadot.js, charts (Recharts)

---

## 1. Context

### 1.1 Problem Statement

The `record_commission` extrinsic was recently implemented in bazari-commerce, allowing the platform to track commission payments on-chain. However, there's **NO UI** to visualize these commissions:

**Missing**:
- ❌ No commission analytics dashboard for sellers
- ❌ No sale detail page showing commission breakdown
- ❌ No commission history table
- ❌ No commission charts (over time, by affiliate, by product)

**New Field Added**:
```rust
pub struct Sale {
    // ... existing fields
    pub commission_paid: Balance, // ✅ NEW: Total commission paid for this sale
}
```

**User Impact**:
- Sellers cannot see commissions paid to affiliates
- Cannot track commission expenses
- No visibility into affiliate ROI
- Platform fee transparency missing

### 1.2 Target State

**2 New Pages**:
1. `/app/seller/commissions` - CommissionAnalyticsPage (seller dashboard)
2. `/app/sales/:saleId` - SaleDetailPage (commission breakdown)

**3 New Components**:
1. CommissionBreakdown - Multi-level commission display
2. CommissionHistoryTable - List of CommissionRecorded events
3. CommissionChart - Line chart of commissions over time

**2 New Hooks**:
1. `useSale(saleId)` - Query sale details
2. `useSaleCommissions(saleId)` - Query commission history

---

## 2. Implementation Details

### Step 1: Create Hooks

**File**: `apps/web/src/hooks/blockchain/useCommerce.ts`

```typescript
import { useBlockchainQuery } from '@/hooks/useBlockchainQuery';
import { getApi } from '@/services/polkadot';

/**
 * Hook: Get sale details by ID
 */
export function useSale(saleId?: number) {
  return useBlockchainQuery(
    ['sale', saleId],
    async () => {
      if (!saleId) return null;

      const api = await getApi();
      const sale = await api.query.bazariCommerce.sales(saleId);

      if (sale.isNone) {
        throw new Error('Sale not found');
      }

      return sale.unwrap().toJSON();
    },
    {
      enabled: !!saleId && saleId > 0,
      staleTime: 30_000
    }
  );
}

/**
 * Hook: Get commission history for a sale
 */
export function useSaleCommissions(saleId?: number) {
  return useBlockchainQuery(
    ['saleCommissions', saleId],
    async () => {
      if (!saleId) return [];

      // Option 1: Query from backend cache (recommended)
      const response = await fetch(`/api/sales/${saleId}/commissions`);
      return await response.json();

      // Option 2: Query events from blockchain (slower)
      // const api = await getApi();
      // const events = await api.query.system.events();
      // Filter by CommissionRecorded and saleId
    },
    {
      enabled: !!saleId && saleId > 0,
      staleTime: 60_000 // 1 minute (commissions don't change often)
    }
  );
}
```

---

### Step 2: Create Components

**Component 1: CommissionBreakdown**

**File**: `apps/web/src/components/commerce/CommissionBreakdown.tsx`

```typescript
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CommissionEntry {
  recipient: string;
  amount: number;
  type: 'platform' | 'affiliate' | 'seller';
  percentage: number;
  level?: number; // For multi-level affiliate commissions
}

interface CommissionBreakdownProps {
  totalAmount: number;
  commissions: CommissionEntry[];
  expandable?: boolean;
  showPercentages?: boolean;
}

export const CommissionBreakdown = ({
  totalAmount,
  commissions,
  expandable = false,
  showPercentages = true
}: CommissionBreakdownProps) => {
  const [isOpen, setIsOpen] = useState(!expandable);

  const formatAmount = (amount: number) => {
    return `${(amount / 1e12).toFixed(2)} BZR`;
  };

  const renderCommissionList = () => (
    <div className="space-y-2">
      {commissions.map((commission, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {commission.type === 'platform' && '🏛️ Platform Fee'}
              {commission.type === 'affiliate' && `👥 Affiliate (Level ${commission.level || 0})`}
              {commission.type === 'seller' && '🏪 Seller Net'}
            </span>
            {commission.recipient && (
              <span className="text-xs text-gray-600 font-mono">
                {commission.recipient.slice(0, 6)}...{commission.recipient.slice(-4)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {showPercentages && (
              <span className="text-xs text-gray-500">
                {commission.percentage}%
              </span>
            )}
            <span className="font-mono font-semibold">
              {formatAmount(commission.amount)}
            </span>
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between py-2 px-3 border-t-2 border-gray-200 mt-2">
        <span className="font-semibold">Total Sale</span>
        <span className="font-mono font-bold text-lg">
          {formatAmount(totalAmount)}
        </span>
      </div>
    </div>
  );

  if (!expandable) {
    return renderCommissionList();
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full py-3 px-4 hover:bg-gray-50">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="font-medium">Commission Breakdown</span>
          <span className="ml-auto font-mono text-sm text-gray-600">
            {formatAmount(totalAmount)}
          </span>
        </CollapsibleTrigger>

        <CollapsibleContent className="px-4 pb-4">
          {renderCommissionList()}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
```

**Component 2: CommissionHistoryTable**

```typescript
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { TransactionHash } from '@/components/blockchain/TransactionHash';

export const CommissionHistoryTable = ({ commissions }) => {
  const formatAmount = (amount: number) => {
    return `${(amount / 1e12).toFixed(2)} BZR`;
  };

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Transaction</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {commissions.map((commission, idx) => (
            <TableRow key={idx}>
              <TableCell className="text-sm">
                {new Date(commission.timestamp * 1000).toLocaleDateString()}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {commission.recipient.slice(0, 6)}...{commission.recipient.slice(-4)}
              </TableCell>
              <TableCell>
                {commission.type === 'platform' && '🏛️ Platform'}
                {commission.type === 'affiliate' && '👥 Affiliate'}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatAmount(commission.amount)}
              </TableCell>
              <TableCell>
                <TransactionHash
                  hash={commission.txHash}
                  truncate={true}
                  showCopy={false}
                  size="sm"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};
```

**Component 3: CommissionChart**

```typescript
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const CommissionChart = ({ data }) => {
  // data format: [{ date: '2025-01-01', total: 1500, platform: 75, affiliate: 225 }]

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-lg">Commission Trends</h3>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="platform" stroke="#8b5cf6" name="Platform Fee" />
            <Line type="monotone" dataKey="affiliate" stroke="#3b82f6" name="Affiliate" />
            <Line type="monotone" dataKey="total" stroke="#10b981" name="Total Commissions" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
```

---

### Step 3: Create Pages

**Page 1: CommissionAnalyticsPage**

**File**: `apps/web/src/pages/seller/CommissionAnalyticsPage.tsx`

```typescript
import { Card } from '@/components/ui/card';
import { CommissionHistoryTable } from '@/components/commerce/CommissionHistoryTable';
import { CommissionChart } from '@/components/commerce/CommissionChart';
import { TrendingUp, DollarSign, Users } from 'lucide-react';

export const CommissionAnalyticsPage = () => {
  // TODO: Fetch from backend
  const stats = {
    totalPaid: 5420.50,
    thisMonth: 1234.00,
    avgPerSale: 15.30,
    topAffiliate: '0xAlice...'
  };

  const commissions = [
    // Commission history
  ];

  const chartData = [
    // Chart data
  ];

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Commission Analytics</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="text-green-500" size={20} />
            <span className="text-sm text-gray-600">Total Paid</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalPaid} BZR</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-blue-500" size={20} />
            <span className="text-sm text-gray-600">This Month</span>
          </div>
          <p className="text-2xl font-bold">{stats.thisMonth} BZR</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="text-purple-500" size={20} />
            <span className="text-sm text-gray-600">Avg per Sale</span>
          </div>
          <p className="text-2xl font-bold">{stats.avgPerSale} BZR</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="text-orange-500" size={20} />
            <span className="text-sm text-gray-600">Top Affiliate</span>
          </div>
          <p className="text-sm font-mono">{stats.topAffiliate}</p>
        </Card>
      </div>

      {/* Chart */}
      <CommissionChart data={chartData} />

      {/* History Table */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Commission History</h2>
        <CommissionHistoryTable commissions={commissions} />
      </div>
    </div>
  );
};
```

**Page 2: SaleDetailPage**

**File**: `apps/web/src/pages/sales/SaleDetailPage.tsx`

```typescript
import { useParams } from 'react-router-dom';
import { useSale, useSaleCommissions } from '@/hooks/blockchain/useCommerce';
import { CommissionBreakdown } from '@/components/commerce/CommissionBreakdown';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

export const SaleDetailPage = () => {
  const { saleId } = useParams();
  const { data: sale, isLoading: saleLoading } = useSale(Number(saleId));
  const { data: commissions, isLoading: commissionsLoading } = useSaleCommissions(Number(saleId));

  if (saleLoading || commissionsLoading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="container mx-auto p-4">
        <p className="text-center text-gray-500">Sale not found.</p>
      </div>
    );
  }

  const formatAmount = (amount: number) => {
    return `${(amount / 1e12).toFixed(2)} BZR`;
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Sale #{sale.id}</h1>

      {/* Sale Overview */}
      <Card className="p-6">
        <h2 className="font-semibold text-lg mb-4">Sale Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-600">Order ID</span>
            <p className="font-semibold">#{sale.orderId}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Total Amount</span>
            <p className="font-semibold text-xl">{formatAmount(sale.amount)}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Seller</span>
            <p className="font-mono text-xs">
              {sale.seller.slice(0, 6)}...{sale.seller.slice(-4)}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Buyer</span>
            <p className="font-mono text-xs">
              {sale.buyer.slice(0, 6)}...{sale.buyer.slice(-4)}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Commission Paid</span>
            <p className="font-semibold text-lg text-purple-600">
              {formatAmount(sale.commissionPaid)}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Seller Net</span>
            <p className="font-semibold text-lg text-green-600">
              {formatAmount(sale.amount - sale.commissionPaid)}
            </p>
          </div>
        </div>

        <Button variant="outline" className="mt-4" asChild>
          <a href={`/app/orders/${sale.orderId}`}>
            <ExternalLink size={16} className="mr-2" />
            View Order
          </a>
        </Button>
      </Card>

      {/* Commission Breakdown */}
      <CommissionBreakdown
        totalAmount={sale.amount}
        commissions={commissions}
        showPercentages={true}
      />
    </div>
  );
};
```

---

### Step 4: Routing

```typescript
// App.tsx
<Route path="/app/seller/commissions" element={<CommissionAnalyticsPage />} />
<Route path="/app/sales/:saleId" element={<SaleDetailPage />} />
```

---

## 3. Acceptance Criteria

**Functional**:
- [ ] Commission analytics page displays stats (total paid, avg per sale)
- [ ] Commission history table shows all CommissionRecorded events
- [ ] Commission breakdown displays platform fee, affiliate, seller net
- [ ] Sale detail page shows commission breakdown
- [ ] Chart displays commission trends over time

**Non-Functional**:
- [ ] Page loads in <2s
- [ ] Mobile responsive
- [ ] WCAG 2.1 AA compliant

---

## 4. Dependencies

**Backend**:
- [ ] Endpoint: `GET /api/sales/:saleId` - Sale details
- [ ] Endpoint: `GET /api/sales/:saleId/commissions` - Commission history

---

## 5. Prompt for Claude Code

### PROMPT START

Implement **commission tracking UI** for sellers to view commission expenses and breakdowns.

**Deliverables**:
1. 2 hooks (useSale, useSaleCommissions)
2. 3 components (CommissionBreakdown, CommissionHistoryTable, CommissionChart)
3. 2 pages (CommissionAnalyticsPage, SaleDetailPage)

**Key Features**:
- Commission breakdown (platform fee, affiliate, seller net)
- Commission history table with filters
- Commission trends chart (Recharts)
- Sale detail page with commission breakdown

**Blockchain Queries**:
```typescript
api.query.bazariCommerce.sales(saleId)
```

**Sale Struct**:
```typescript
{
  id: number,
  orderId: number,
  seller: string,
  buyer: string,
  amount: number,
  commissionPaid: number, // NEW field
  createdAt: number
}
```

**Create all files, add tests, ensure mobile responsive.**

### PROMPT END

---

**Document Status**: ✅ Complete
**Created**: 2025-11-14
**Effort**: 3 days
