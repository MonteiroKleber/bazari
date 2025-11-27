# Fee Split Visualization UI/UX - Implementation Prompt

**Phase**: P1 - HIGH Priority
**Priority**: HIGH
**Effort**: 5 days
**Dependencies**: bazari-fee pallet, bazari-escrow pallet
**Pallets**: bazari-fee
**Version**: 1.0
**Last Updated**: 2025-11-14

---

## 📋 Context

### Problem Statement

The **bazari-fee** pallet has 10% UI coverage with critical visualization missing:

1. **No Fee Split Visualization**: Platform/Affiliate/Seller split not displayed
2. **No Fee Configuration UI**: DAO cannot update platform fee %
3. **No Fee Breakdown**: OrderPage/CheckoutPage don't show fee calculation
4. **Hardcoded Values**: FeeBreakdownCard uses static values, not blockchain data

**Current State** (from Gap Analysis Section 7.3):
- ⚠️ FeeBreakdownCard exists but hardcoded (delivery fees only)
- ❌ No fee configuration page
- ❌ No platform fee display
- ❌ No atomic split visualization

**Impact**: Users don't understand fees, DAO cannot adjust platform fee, transparency issues.

---

## 🎯 Objective

Implement fee visualization and configuration:

1. **FeeSplitCard Component** - Pie chart + atomic split breakdown
2. **FeeConfigurationPage** - DAO-only page to update platform fee
3. **UpdateFeeForm Component** - Form for fee % adjustment
4. **useFeeConfiguration + useUpdateFee Hooks** - Blockchain integration
5. **Fee Display Integration** - Add to OrderPage, CheckoutPage

**Deliverables**:
- 1 page (FeeConfigurationPage)
- 3 components (FeeSplitCard, UpdateFeeForm, FeeHistoryChart)
- 3 hooks (useFeeConfiguration, useUpdateFee, useFeeHistory)

---

## 📐 Specs

### 3.1 Fee Storage Structure (from bazari-fee SPEC.md)

```rust
pub struct FeeConfiguration {
    pub platform_fee_percentage: u32, // e.g., 5 = 5%
    pub treasury_account: AccountId,
}
```

### 3.2 Fee Split Calculation

```typescript
// Example: 100 BZR order
const order = {
  amount: 100,
  platformFee: 5,    // 5%
  affiliateFee: 3,   // 3%
};

// Split:
// - Platform: 5 BZR (5%)
// - Affiliate: 3 BZR (3%)
// - Seller: 92 BZR (92%)
```

**Atomic Split**:
- All or nothing (no partial splits)
- Executed via `bazari-escrow.split_release()`

### 3.3 Update Fee Extrinsic

```rust
pub fn set_platform_fee(
    origin: OriginFor<T>,
    new_percentage: u32,
) -> DispatchResult

// Requirements:
// - DAO origin only
// - Percentage <= 20% (max)
```

---

## 🔨 Implementation Details

### Step 1: Create useFeeConfiguration Hook (0.5 days)

**Location**: `/root/bazari/apps/web/src/hooks/blockchain/useFeeConfiguration.ts`

```typescript
import { usePolkadotApi } from '@/providers/PolkadotProvider';
import { useQuery } from '@tanstack/react-query';

interface FeeConfiguration {
  platformFeePercentage: number;
  treasuryAccount: string;
}

export function useFeeConfiguration() {
  const { api } = usePolkadotApi();

  return useQuery<FeeConfiguration>({
    queryKey: ['fee-configuration'],
    queryFn: async () => {
      if (!api) throw new Error('API not ready');

      const config = await api.query.bazariFee.feeConfiguration();

      return {
        platformFeePercentage: config.platformFeePercentage.toNumber(),
        treasuryAccount: config.treasuryAccount.toString(),
      };
    },
    enabled: !!api,
    staleTime: 60000, // 1 minute
  });
}
```

---

### Step 2: Create FeeSplitCard Component (1.5 days)

**Location**: `/root/bazari/apps/web/src/components/fees/FeeSplitCard.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFeeConfiguration } from '@/hooks/blockchain/useFeeConfiguration';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { formatBZR } from '@/lib/utils';

interface FeeSplitCardProps {
  orderAmount: string; // BZR
  affiliateFee?: string; // BZR (optional)
}

export function FeeSplitCard({ orderAmount, affiliateFee }: FeeSplitCardProps) {
  const { data: feeConfig, isLoading } = useFeeConfiguration();

  if (isLoading) return <div>Loading fee breakdown...</div>;

  const orderAmountNum = parseFloat(orderAmount);
  const platformFeeAmount = (orderAmountNum * (feeConfig?.platformFeePercentage || 5)) / 100;
  const affiliateFeeAmount = affiliateFee ? parseFloat(affiliateFee) : 0;
  const sellerAmount = orderAmountNum - platformFeeAmount - affiliateFeeAmount;

  const data = [
    { name: 'Platform Fee', value: platformFeeAmount, color: '#3b82f6' },
    ...(affiliateFeeAmount > 0
      ? [{ name: 'Affiliate Commission', value: affiliateFeeAmount, color: '#8b5cf6' }]
      : []),
    { name: 'Seller Receives', value: sellerAmount, color: '#10b981' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fee Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pie Chart */}
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatBZR(value.toString())} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>

        {/* Breakdown List */}
        <div className="space-y-2 border-t pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Order Total</span>
            <span className="font-semibold">{formatBZR(orderAmount)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Platform Fee ({feeConfig?.platformFeePercentage}%)
            </span>
            <span className="text-blue-600">-{formatBZR(platformFeeAmount.toString())}</span>
          </div>

          {affiliateFeeAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Affiliate Commission</span>
              <span className="text-purple-600">-{formatBZR(affiliateFee!)}</span>
            </div>
          )}

          <div className="flex justify-between font-semibold border-t pt-2">
            <span>Seller Receives</span>
            <span className="text-green-600">{formatBZR(sellerAmount.toString())}</span>
          </div>
        </div>

        {/* Atomic Split Note */}
        <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
          ⚛️ <strong>Atomic Split:</strong> Funds are distributed in a single blockchain
          transaction (all-or-nothing).
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### Step 3: Create useUpdateFee Hook (0.5 days)

**Location**: `/root/bazari/apps/web/src/hooks/blockchain/useUpdateFee.ts`

```typescript
import { useBlockchainTx } from './useBlockchainTx';
import { usePolkadotApi } from '@/providers/PolkadotProvider';

interface UpdateFeeParams {
  newPercentage: number; // 0-20
}

export function useUpdateFee() {
  const { api } = usePolkadotApi();

  return useBlockchainTx<UpdateFeeParams, void>(
    'set_platform_fee',
    async ({ newPercentage }, signer) => {
      if (!api) throw new Error('API not ready');

      const tx = api.tx.bazariFee.setPlatformFee(newPercentage);

      return new Promise((resolve, reject) => {
        tx.signAndSend(signer, ({ status, events }) => {
          if (status.isInBlock) {
            const feeUpdatedEvent = events.find((e) =>
              e.event.method === 'FeeUpdated'
            );

            if (feeUpdatedEvent) {
              resolve();
            } else {
              reject(new Error('Fee update failed'));
            }
          }
        }).catch(reject);
      });
    }
  );
}
```

---

### Step 4: Create FeeConfigurationPage (2 days)

**Location**: `/root/bazari/apps/web/src/app/admin/fees/page.tsx`

```typescript
import { useState } from 'react';
import { RequireDAO } from '@/components/auth/RequireDAO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFeeConfiguration } from '@/hooks/blockchain/useFeeConfiguration';
import { useUpdateFee } from '@/hooks/blockchain/useUpdateFee';
import { Loader2 } from 'lucide-react';

export default function FeeConfigurationPage() {
  const { data: config, isLoading } = useFeeConfiguration();
  const { mutate: updateFee, isPending, isSuccess } = useUpdateFee();

  const [newPercentage, setNewPercentage] = useState<number>(5);

  const handleUpdate = () => {
    updateFee({ newPercentage });
  };

  return (
    <RequireDAO>
      <div className="container mx-auto py-8 space-y-6">
        <h1 className="text-3xl font-bold">Fee Configuration</h1>

        <Card>
          <CardHeader>
            <CardTitle>Platform Fee Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div>Loading configuration...</div>
            ) : (
              <>
                {/* Current Fee */}
                <div>
                  <div className="text-sm text-muted-foreground mb-2">
                    Current Platform Fee
                  </div>
                  <div className="text-4xl font-bold">
                    {config?.platformFeePercentage}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Treasury: {config?.treasuryAccount.slice(0, 12)}...
                  </div>
                </div>

                {/* Update Form */}
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <label className="text-sm font-medium">New Fee Percentage</label>
                    <div className="flex items-center gap-4 mt-2">
                      <Slider
                        value={[newPercentage]}
                        onValueChange={([value]) => setNewPercentage(value)}
                        max={20}
                        min={0}
                        step={1}
                        className="flex-1"
                      />
                      <div className="text-2xl font-bold w-16 text-right">
                        {newPercentage}%
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Maximum allowed: 20%
                    </div>
                  </div>

                  {/* Impact Preview */}
                  <Alert>
                    <AlertDescription>
                      <strong>Example:</strong> On a 100 BZR order, platform will
                      receive {newPercentage} BZR
                    </AlertDescription>
                  </Alert>

                  <Button
                    onClick={handleUpdate}
                    disabled={isPending || newPercentage === config?.platformFeePercentage}
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isPending ? 'Updating...' : 'Update Platform Fee'}
                  </Button>

                  {isSuccess && (
                    <Alert>
                      <AlertDescription>Fee updated successfully!</AlertDescription>
                    </Alert>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Fee History */}
        <Card>
          <CardHeader>
            <CardTitle>Fee Update History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Fee history will be displayed here (query FeeUpdated events)
            </div>
          </CardContent>
        </Card>
      </div>
    </RequireDAO>
  );
}
```

---

### Step 5: Integrate FeeSplitCard into OrderPage (0.5 days)

**Location**: `/root/bazari/apps/web/src/app/orders/[orderId]/page.tsx` (Edit)

```typescript
import { FeeSplitCard } from '@/components/fees/FeeSplitCard';

export default function OrderDetailPage({ params }: { params: { orderId: string } }) {
  const { data: order } = useBlockchainOrder(parseInt(params.orderId));

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* ... existing order details ... */}

      {/* Fee Breakdown */}
      <FeeSplitCard
        orderAmount={order.totalAmount}
        affiliateFee={order.affiliateCommission}
      />

      {/* ... rest of components ... */}
    </div>
  );
}
```

**Location**: `/root/bazari/apps/web/src/app/checkout/page.tsx` (Edit)

```typescript
import { FeeSplitCard } from '@/components/fees/FeeSplitCard';

export default function CheckoutPage() {
  const { cart } = useCart();
  const totalAmount = calculateCartTotal(cart);

  return (
    <div className="container mx-auto py-8">
      {/* ... cart items ... */}

      {/* Fee Preview Before Checkout */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">Payment Summary</h3>
        <FeeSplitCard orderAmount={totalAmount.toString()} />
      </div>

      <Button onClick={handleCheckout}>Proceed to Payment</Button>
    </div>
  );
}
```

---

## ✅ Acceptance Criteria

### Functional Requirements

1. **Fee Split Display**
   - [ ] Pie chart shows Platform/Affiliate/Seller split
   - [ ] Breakdown list displays percentages + BZR amounts
   - [ ] Reads platform fee % from blockchain (not hardcoded)
   - [ ] Updates when fee configuration changes

2. **Fee Configuration**
   - [ ] Only DAO members can access `/admin/fees`
   - [ ] Slider allows 0-20% fee adjustment
   - [ ] "Update Fee" button calls `setPlatformFee` extrinsic
   - [ ] Preview shows impact on 100 BZR order

3. **Integration**
   - [ ] FeeSplitCard appears on OrderPage
   - [ ] FeeSplitCard appears on CheckoutPage (before payment)
   - [ ] Affiliate commission included in split (if applicable)

### Non-Functional Requirements

4. **Performance**
   - [ ] Fee configuration cached for 1 minute
   - [ ] Pie chart renders smoothly (no lag)

5. **Accessibility**
   - [ ] Slider has aria-label
   - [ ] Fee breakdown has screen-reader labels

---

## 🧪 Testing

### Unit Tests

```typescript
describe('FeeSplitCard', () => {
  it('calculates platform fee correctly', () => {
    const { getByText } = render(
      <FeeSplitCard orderAmount="100" affiliateFee="3" />
    );

    // 5% platform fee on 100 BZR = 5 BZR
    expect(getByText(/5 BZR/)).toBeInTheDocument();

    // Seller receives: 100 - 5 - 3 = 92 BZR
    expect(getByText(/92 BZR/)).toBeInTheDocument();
  });

  it('updates when fee configuration changes', async () => {
    const { rerender, getByText } = render(
      <FeeSplitCard orderAmount="100" />
    );

    // Mock fee config change from 5% to 7%
    await act(async () => {
      mockFeeConfig.platformFeePercentage = 7;
      rerender(<FeeSplitCard orderAmount="100" />);
    });

    expect(getByText(/7%/)).toBeInTheDocument();
    expect(getByText(/7 BZR/)).toBeInTheDocument(); // Platform fee
    expect(getByText(/93 BZR/)).toBeInTheDocument(); // Seller receives
  });
});

describe('FeeConfigurationPage', () => {
  it('restricts access to DAO members', () => {
    mockDAOMembership(false);
    render(<FeeConfigurationPage />);

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('updates fee on slider change', async () => {
    const mockUpdateFee = vi.fn();
    vi.mocked(useUpdateFee).mockReturnValue({ mutate: mockUpdateFee });

    render(<FeeConfigurationPage />);

    fireEvent.change(screen.getByRole('slider'), { target: { value: 8 } });
    fireEvent.click(screen.getByText('Update Platform Fee'));

    expect(mockUpdateFee).toHaveBeenCalledWith({ newPercentage: 8 });
  });
});
```

### Manual Testing

- [ ] **Fee Display**: Checkout 100 BZR order → verify FeeSplitCard shows 5 BZR platform, 95 BZR seller
- [ ] **Fee Update**: Login as DAO → navigate to `/admin/fees` → change fee to 7% → verify OrderPage shows 7% on new orders
- [ ] **Affiliate Split**: Create order via affiliate link → verify FeeSplitCard shows 3-way split (Platform, Affiliate, Seller)

---

## 📦 Dependencies

**Blockchain**:
- `bazari-fee.feeConfiguration()` storage query
- `bazari-fee.setPlatformFee()` extrinsic

**UI Libraries**:
- `recharts` for pie chart visualization

---

## 🔗 References

- [bazari-fee SPEC.md](/root/bazari/knowledge/20-blueprints/pallets/bazari-fee/SPEC.md)
- [Gap Analysis - Section 7](/root/bazari/UI_UX_GAP_ANALYSIS.md#7-bazari-fee-p2---proof-of-commerce)

---

## 🤖 Prompt for Claude Code

```
Implement Fee Split Visualization UI/UX for bazari-fee pallet.

**Context**:
- Repository: /root/bazari
- Problem: Fee breakdown not displayed, DAO cannot update platform fee, hardcoded values
- Gap Analysis: /root/bazari/UI_UX_GAP_ANALYSIS.md Section 7.3

**Objective**:
1. Create FeeSplitCard component (pie chart + breakdown)
2. Create FeeConfigurationPage (DAO-only)
3. Create UpdateFeeForm component
4. Implement useFeeConfiguration + useUpdateFee hooks
5. Integrate FeeSplitCard into OrderPage + CheckoutPage

**Components**:
- /root/bazari/apps/web/src/components/fees/FeeSplitCard.tsx
- /root/bazari/apps/web/src/hooks/blockchain/useFeeConfiguration.ts
- /root/bazari/apps/web/src/hooks/blockchain/useUpdateFee.ts
- /root/bazari/apps/web/src/app/admin/fees/page.tsx

**Technical Specs**:
- Platform fee: Query bazari-fee.feeConfiguration()
- Fee split: Platform % + Affiliate (optional) + Seller
- Update fee: Call api.tx.bazariFee.setPlatformFee(percentage)
- Max fee: 20%

**Testing**:
- Unit: FeeSplitCard.test.tsx (test fee calculation)
- Manual: Update fee from 5% to 7%, verify OrderPage reflects change

**References**:
- SPEC: /root/bazari/knowledge/20-blueprints/pallets/bazari-fee/SPEC.md

When done, demonstrate fee split on 100 BZR order with affiliate commission.
```

---

**Version**: 1.0
**Last Updated**: 2025-11-14
