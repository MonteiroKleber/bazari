# P0-CRITICAL: Affiliate Referrals & Referral Tree Visualization

**Phase**: P0 | **Priority**: CRITICAL | **Effort**: 8 days | **Pallets**: bazari-affiliate

---

## Metadata

- **Prompt ID**: P0-04
- **Created**: 2025-11-14
- **Gap**: 50%
- **Blocks**: P2-01 (campaign management)
- **Dependencies**: bazari-affiliate pallet deployed, D3.js for tree visualization
- **Team**: 1-2 frontend developers
- **Skills**: React, TypeScript, Polkadot.js, D3.js, tree data structures

---

## 1. Context

### 1.1 Problem Statement

The **bazari-affiliate** pallet implements a multi-level referral system (5 levels deep) with Merkle DAG storage, but the frontend has **50% gap**:

**Missing**:
- ❌ No referral tree visualization (5-level DAG)
- ❌ No referral link generator (URL + QR code)
- ❌ No multi-level commission breakdown
- ❌ No campaign management UI
- ❌ No Merkle proof viewer

**Existing**:
- ⚠️ AffiliateDashboardPage - Basic stats, NO referral tree
- ⚠️ Marketplace creation - NO referral tracking

**User Impact**:
- Affiliates cannot see referral network
- Cannot track multi-level earnings
- Cannot share referral links
- No transparency in commission splits

### 1.2 Commission Structure (5 Levels)

```
Level 0 (Direct):  5.0%
Level 1:           2.5%
Level 2:           1.25%
Level 3:           0.625%
Level 4:           0.3125%
```

**Example**:
```
Sale: 100 BZR order
├─ Level 0 (You): 5 BZR (5%)
├─ Level 1 (Referrer): 2.5 BZR (2.5%)
├─ Level 2: 1.25 BZR (1.25%)
└─ Total: 8.75 BZR in commissions
```

### 1.3 Target State

**2 New Pages**:
1. `/app/affiliate/referrals` - ReferralTreePage (full tree visualization)
2. `/app/affiliate/campaigns` - CampaignManagementPage (create/manage campaigns)

**5 New Components**:
1. ReferralTreeVisualization - D3.js tree diagram (5 levels)
2. ReferralLinkGenerator - URL + QR code generator
3. ReferralTreeNode - Single node in tree (avatar, stats)
4. CommissionBreakdownCard - Multi-level breakdown (already created in P0-03, enhance)
5. MerkleProofViewer - Verify commission splits (already exists, integrate)

**4 New Hooks**:
1. `useReferralTree(accountId, depth)` - Query referral DAG
2. `useRegisterReferral(referralLink)` - Mutation: register new referral
3. `useCampaigns()` - Query affiliate campaigns
4. `useCreateCampaign()` - Mutation: create campaign (DAO/Store)

---

## 2. Implementation Details

### Step 1: Create Hooks

**File**: `apps/web/src/hooks/blockchain/useAffiliate.ts`

```typescript
import { useBlockchainQuery, useBlockchainTx } from '@/hooks/useBlockchainQuery';
import { getApi } from '@/services/polkadot';
import { toast } from 'sonner';

/**
 * Hook: Get referral tree (recursive, up to depth levels)
 */
export function useReferralTree(accountId?: string, depth: number = 5) {
  return useBlockchainQuery(
    ['referralTree', accountId, depth],
    async () => {
      if (!accountId) return null;

      const api = await getApi();

      // Recursive function to build tree
      const buildTree = async (address: string, currentDepth: number): Promise<any> => {
        if (currentDepth > depth) return null;

        const node = await api.query.bazariAffiliate.referralTree(address);

        if (node.isNone) {
          return {
            address,
            level: currentDepth,
            children: [],
            stats: {
              directReferrals: 0,
              totalEarnings: 0
            }
          };
        }

        const nodeData = node.unwrap().toJSON();

        // Fetch stats from backend (cached)
        const stats = await fetch(`/api/users/${address}/referral-stats`).then(r => r.json());

        // Recursively fetch children
        const children = await Promise.all(
          (nodeData.children || []).map((childAddress: string) =>
            buildTree(childAddress, currentDepth + 1)
          )
        );

        return {
          address,
          level: currentDepth,
          children: children.filter(Boolean),
          stats: stats || {
            directReferrals: children.length,
            totalEarnings: 0
          }
        };
      };

      return await buildTree(accountId, 0);
    },
    {
      enabled: !!accountId,
      staleTime: 60_000, // 1 minute (tree doesn't change often)
      cacheTime: 10 * 60 * 1000 // 10 minutes
    }
  );
}

/**
 * Hook: Register referral (when user signs up with referral link)
 */
export function useRegisterReferral() {
  const invalidateCache = useInvalidateBlockchainCache();

  return useBlockchainTx(
    async (referrerAddress: string) => {
      const api = await getApi();
      return api.tx.bazariAffiliate.registerReferral(referrerAddress);
    },
    {
      onSuccess: () => {
        toast.success('Referral registered! 🎉');
        invalidateCache(['referralTree']);
      },
      onError: (error) => {
        toast.error(`Failed to register referral: ${error.message}`);
      }
    }
  );
}

/**
 * Hook: Get all affiliate campaigns
 */
export function useCampaigns() {
  return useBlockchainQuery(
    ['campaigns'],
    async () => {
      const api = await getApi();
      const campaignEntries = await api.query.bazariAffiliate.affiliateCampaigns.entries();

      return campaignEntries.map(([key, campaign]) => ({
        id: key.args[0].toNumber(),
        ...campaign.unwrap().toJSON()
      }));
    },
    {
      staleTime: 60_000
    }
  );
}

/**
 * Hook: Create affiliate campaign (DAO/Store only)
 */
export function useCreateCampaign() {
  const invalidateCache = useInvalidateBlockchainCache();

  return useBlockchainTx(
    async (campaignData: {
      name: string;
      commissionRate: number;
      maxDepth: number;
      decayRate: number;
      startDate?: number;
      endDate?: number;
    }) => {
      const api = await getApi();
      return api.tx.bazariAffiliate.createCampaign(
        campaignData.name,
        campaignData.commissionRate,
        campaignData.maxDepth,
        campaignData.decayRate,
        campaignData.startDate || null,
        campaignData.endDate || null
      );
    },
    {
      onSuccess: () => {
        toast.success('Campaign created successfully!');
        invalidateCache(['campaigns']);
      }
    }
  );
}
```

---

### Step 2: Create Components

**Component 1: ReferralTreeVisualization**

**File**: `apps/web/src/components/affiliate/ReferralTreeVisualization.tsx`

```typescript
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Card } from '@/components/ui/card';

interface TreeNode {
  address: string;
  level: number;
  children: TreeNode[];
  stats: {
    directReferrals: number;
    totalEarnings: number;
  };
}

interface ReferralTreeVisualizationProps {
  data: TreeNode;
  height?: number;
}

export const ReferralTreeVisualization = ({
  data,
  height = 600
}: ReferralTreeVisualizationProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const margin = { top: 20, right: 120, bottom: 20, left: 120 };

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create tree layout
    const treeLayout = d3.tree<TreeNode>()
      .size([height - margin.top - margin.bottom, width - margin.left - margin.right]);

    // Convert data to hierarchy
    const root = d3.hierarchy(data, (d) => d.children);
    const treeData = treeLayout(root);

    // Create links (lines between nodes)
    g.selectAll('.link')
      .data(treeData.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#ddd')
      .attr('stroke-width', 2)
      .attr('d', d3.linkHorizontal()
        .x((d: any) => d.y)
        .y((d: any) => d.x)
      );

    // Create nodes
    const node = g
      .selectAll('.node')
      .data(treeData.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.y},${d.x})`);

    // Node circles
    node
      .append('circle')
      .attr('r', 20)
      .attr('fill', (d) => {
        const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
        return colors[d.data.level] || '#9ca3af';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 3);

    // Node labels (address)
    node
      .append('text')
      .attr('dy', '.35em')
      .attr('x', (d) => (d.children ? -28 : 28))
      .attr('text-anchor', (d) => (d.children ? 'end' : 'start'))
      .attr('font-size', '12px')
      .attr('fill', '#374151')
      .text((d) => `${d.data.address.slice(0, 6)}...${d.data.address.slice(-4)}`);

    // Node stats (earnings)
    node
      .append('text')
      .attr('dy', '1.5em')
      .attr('x', (d) => (d.children ? -28 : 28))
      .attr('text-anchor', (d) => (d.children ? 'end' : 'start'))
      .attr('font-size', '10px')
      .attr('fill', '#9ca3af')
      .text((d) => `${d.data.stats.totalEarnings.toFixed(2)} BZR`);

  }, [data, height]);

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-lg mb-4">Referral Tree (5 Levels)</h3>
      <div className="overflow-x-auto">
        <svg ref={svgRef} style={{ width: '100%', height }} />
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500" />
          <span>Level 0 (You)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-purple-500" />
          <span>Level 1</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500" />
          <span>Level 2</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-orange-500" />
          <span>Level 3</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500" />
          <span>Level 4</span>
        </div>
      </div>
    </Card>
  );
};
```

**Component 2: ReferralLinkGenerator**

```typescript
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, QrCode } from 'lucide-react';
import QRCode from 'qrcode.react';
import { toast } from 'sonner';
import { useState } from 'react';

export const ReferralLinkGenerator = ({ address }) => {
  const [showQR, setShowQR] = useState(false);
  const referralLink = `https://bazari.xyz/r/${address}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied!');
  };

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-lg mb-4">Your Referral Link</h3>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Input value={referralLink} readOnly className="flex-1 font-mono text-sm" />
          <Button onClick={handleCopy} variant="outline" className="gap-2">
            <Copy size={16} />
            Copy
          </Button>
          <Button
            onClick={() => setShowQR(!showQR)}
            variant="outline"
            className="gap-2"
          >
            <QrCode size={16} />
            QR
          </Button>
        </div>

        {showQR && (
          <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
            <QRCode value={referralLink} size={200} />
          </div>
        )}

        <p className="text-sm text-gray-600">
          Share this link to earn 5% commission on all referred sales, plus multi-level
          bonuses up to 5 levels deep.
        </p>
      </div>
    </Card>
  );
};
```

**Component 3: Multi-Level CommissionBreakdown** (enhance existing)

```typescript
// Extend CommissionBreakdown from P0-03 to support tree layout
export const CommissionBreakdownTree = ({ commissions }) => {
  return (
    <div className="space-y-1">
      {commissions.map((commission, idx) => {
        const indent = (commission.level || 0) * 20;

        return (
          <div
            key={idx}
            className="flex items-center justify-between py-2"
            style={{ paddingLeft: `${indent}px` }}
          >
            <div className="flex items-center gap-2">
              {commission.level !== undefined && (
                <span className="text-gray-400">
                  {'├─'.repeat(commission.level + 1)}
                </span>
              )}
              <span className="text-sm">
                Level {commission.level}: {commission.recipient.slice(0, 6)}...
              </span>
            </div>

            <span className="font-mono text-sm">
              {(commission.amount / 1e12).toFixed(2)} BZR ({commission.percentage}%)
            </span>
          </div>
        );
      })}
    </div>
  );
};
```

---

### Step 3: Create Pages

**Page 1: ReferralTreePage**

**File**: `apps/web/src/pages/affiliate/ReferralTreePage.tsx`

```typescript
import { useWalletStore } from '@/stores/wallet';
import { useReferralTree } from '@/hooks/blockchain/useAffiliate';
import { ReferralTreeVisualization } from '@/components/affiliate/ReferralTreeVisualization';
import { ReferralLinkGenerator } from '@/components/affiliate/ReferralLinkGenerator';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, TrendingUp, DollarSign } from 'lucide-react';

export const ReferralTreePage = () => {
  const { selectedAccount } = useWalletStore();
  const { data: tree, isLoading } = useReferralTree(selectedAccount?.address, 5);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  if (!tree) {
    return (
      <div className="container mx-auto p-4">
        <p className="text-center text-gray-500">No referral data found.</p>
      </div>
    );
  }

  // Calculate stats
  const calculateStats = (node: any) => {
    let totalReferrals = node.children.length;
    let totalEarnings = node.stats.totalEarnings;

    node.children.forEach((child: any) => {
      const childStats = calculateStats(child);
      totalReferrals += childStats.totalReferrals;
      totalEarnings += childStats.totalEarnings;
    });

    return { totalReferrals, totalEarnings };
  };

  const stats = calculateStats(tree);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">Referral Network</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="text-blue-500" size={20} />
            <span className="text-sm text-gray-600">Total Referrals</span>
          </div>
          <p className="text-3xl font-bold">{stats.totalReferrals}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="text-green-500" size={20} />
            <span className="text-sm text-gray-600">Direct Referrals</span>
          </div>
          <p className="text-3xl font-bold">{tree.children.length}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="text-purple-500" size={20} />
            <span className="text-sm text-gray-600">Total Earnings</span>
          </div>
          <p className="text-3xl font-bold">{stats.totalEarnings.toFixed(2)} BZR</p>
        </Card>
      </div>

      {/* Referral Link */}
      <ReferralLinkGenerator address={selectedAccount?.address} />

      {/* Tree Visualization */}
      <ReferralTreeVisualization data={tree} />
    </div>
  );
};
```

**Page 2: CampaignManagementPage** (Store/DAO only)

```typescript
// Similar structure with campaign creation form
```

---

### Step 4: Routing

```typescript
// App.tsx
<Route path="/app/affiliate/referrals" element={<ReferralTreePage />} />
<Route path="/app/affiliate/campaigns" element={<CampaignManagementPage />} />
```

---

## 3. Acceptance Criteria

**Functional**:
- [ ] Referral tree displays up to 5 levels
- [ ] Tree visualization uses D3.js with proper layout
- [ ] Referral link generator displays URL and QR code
- [ ] Copy button copies referral link to clipboard
- [ ] Stats cards show total referrals, direct referrals, earnings
- [ ] Multi-level commission breakdown shows tree structure
- [ ] Campaign creation form (DAO/Store only)

**Non-Functional**:
- [ ] Tree renders in <3s (even with 100+ nodes)
- [ ] Mobile responsive (tree horizontal scroll)
- [ ] Touch-friendly on mobile
- [ ] WCAG 2.1 AA compliant

---

## 4. Dependencies

**Blockchain**:
- [ ] bazari-affiliate pallet deployed
- [ ] Referral tree data seeded (test data)

**Backend**:
- [ ] Endpoint: `GET /api/users/:address/referral-stats` - Cached stats
- [ ] Endpoint: `GET /api/campaigns` - Campaign list

**Frontend**:
- [ ] D3.js: 7.8+
- [ ] qrcode.react: 3.1+

---

## 5. Prompt for Claude Code

### PROMPT START

Implement **complete referral system** with 5-level tree visualization and referral link generator.

**Deliverables**:
1. 4 hooks (useReferralTree, useRegisterReferral, useCampaigns, useCreateCampaign)
2. 5 components (ReferralTreeVisualization, ReferralLinkGenerator, etc.)
3. 2 pages (ReferralTreePage, CampaignManagementPage)

**Key Features**:
- D3.js tree visualization (5 levels deep)
- Referral link generator (URL + QR code)
- Multi-level commission breakdown
- Campaign management (DAO/Store)

**Commission Structure**:
```
Level 0: 5.0%
Level 1: 2.5%
Level 2: 1.25%
Level 3: 0.625%
Level 4: 0.3125%
```

**Blockchain Queries**:
```typescript
api.query.bazariAffiliate.referralTree(address) // Get node with children
```

**Install Dependencies**:
```bash
pnpm add d3 qrcode.react
```

**Create all files, add tests, ensure mobile responsive.**

### PROMPT END

---

**Document Status**: ✅ Complete
**Created**: 2025-11-14
**Effort**: 8 days
