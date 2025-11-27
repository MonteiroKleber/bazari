# bazari-affiliate Pallet - Pages Specification

**Status**: Complete Page Specifications
**Version**: 1.0
**Last Updated**: 2025-11-14
**Total Pages**: 2 (ReferralTreePage, CampaignManagementPage)
**Priority**: P0 CRITICAL
**Dependencies**: bazari-affiliate pallet, D3.js, React Query
**Maintainer**: Bazari Frontend Team

---

## Table of Contents

1. [Pages Overview](#1-pages-overview)
2. [ReferralTreePage](#2-referraltreepage)
3. [CampaignManagementPage](#3-campaignmanagementpage)
4. [Routing & Navigation](#4-routing--navigation)
5. [SEO & Metadata](#5-seo--metadata)
6. [Error Handling](#6-error-handling)

---

## 1. Pages Overview

### 1.1 Page Inventory

| Page | Route | Purpose | Access Level | Priority | Complexity |
|------|-------|---------|--------------|----------|------------|
| **ReferralTreePage** | `/app/affiliate/referrals` | Visualize and manage referral network | Authenticated users | P0 | High (D3.js tree) |
| **CampaignManagementPage** | `/app/affiliate/campaigns` | Create and manage affiliate campaigns | Store owners, DAO | P1 | Medium |

### 1.2 Page Hierarchy

```
/app
├── /affiliate
│   ├── /referrals (ReferralTreePage)
│   └── /campaigns (CampaignManagementPage)
│       └── /:campaignId (CampaignDetailPage - future)
│
└── /admin
    └── /campaigns (Same as above, DAO access)
```

### 1.3 Shared Layout

**BaseLayout** (All affiliate pages):
```tsx
<BaseLayout>
  <Sidebar>
    <NavItem href="/app/affiliate/referrals" icon={<UsersIcon />}>
      My Referrals
    </NavItem>
    <NavItem href="/app/affiliate/campaigns" icon={<MegaphoneIcon />}>
      Campaigns
    </NavItem>
    <NavItem href="/app/affiliate/earnings" icon={<CoinsIcon />}>
      Earnings
    </NavItem>
  </Sidebar>

  <MainContent>
    {children}
  </MainContent>
</BaseLayout>
```

---

## 2. ReferralTreePage

**Route**: `/app/affiliate/referrals`
**File**: `src/pages/affiliate/ReferralTreePage.tsx`
**Purpose**: Central hub for referral network visualization and management
**Complexity**: ⭐⭐⭐⭐⭐ (Most complex page in affiliate system)

### 2.1 Page Layout

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Header                                                      [Settings ⚙️]  │
│ ┌─ Breadcrumb ─────────────────────────────────────────────────────────┐  │
│ │ Home > Affiliate > My Referrals                                      │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────────┤
│ ┌─ ReferralLinkGenerator (Full Width, Collapsible) ─────────────────┐   │
│ │ Your Referral Link: https://bazari.xyz/r/0xAlice  [Copy] [QR]     │   │
│ │ [WhatsApp] [Twitter] [Email]                                        │   │
│ └─────────────────────────────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────────────────────────────┤
│ ┌─ Main Content (2-column layout) ───────────────────────────────────┐   │
│ │                                                                      │   │
│ │ ┌─ Left Column (70%) ─────────────┬─ Right Sidebar (30%) ─────┐   │   │
│ │ │                                  │                            │   │   │
│ │ │ ┌─ Controls ─────────────────┐  │ ┌─ ReferralStats ────────┐ │   │   │
│ │ │ │ Tabs: [All] [L1-L4]        │  │ │ Total: 127            │ │   │   │
│ │ │ │ Search: [🔍 Search...]     │  │ │ Direct: 12            │ │   │   │
│ │ │ └────────────────────────────┘  │ │ Active: 43 (34%)      │ │   │   │
│ │ │                                  │ │ Earned: 1,234 BZR     │ │   │   │
│ │ │ ┌─ ReferralTreeVisualization ┐  │ └────────────────────────┘ │   │   │
│ │ │ │                             │  │                            │   │   │
│ │ │ │      ┌───┐                  │  │ ┌─ Commission Breakdown ┐ │   │   │
│ │ │ │      │You│ (Gold)           │  │ │ L0: 567 BZR          │ │   │   │
│ │ │ │      └─┬─┘                  │  │ │ L1: 283 BZR          │ │   │   │
│ │ │ │   ╱───┼───╲                 │  │ │ L2: 142 BZR          │ │   │   │
│ │ │ │  ○    ○    ○ (Level 1)      │  │ │ L3:  71 BZR          │ │   │   │
│ │ │ │  │    │                      │  │ │ L4:  35 BZR          │ │   │   │
│ │ │ │  ○    ○ (Level 2)           │  │ └────────────────────────┘ │   │   │
│ │ │ │                             │  │                            │   │   │
│ │ │ │ (Interactive D3.js tree)    │  │ ┌─ Quick Actions ───────┐ │   │   │
│ │ │ │                             │  │ │ [Share Link]          │ │   │   │
│ │ │ │ Height: 600px               │  │ │ [Download QR]         │ │   │   │
│ │ │ │ Zoom: Pan-enabled           │  │ │ [Export CSV]          │ │   │   │
│ │ │ └─────────────────────────────┘  │ └────────────────────────┘ │   │   │
│ │ │                                  │                            │   │   │
│ │ │ ┌─ Zoom Controls ─────────────┐  │ ┌─ Recent Referrals ────┐ │   │   │
│ │ │ │ [🔍+] [🔍-] [↺ Reset]       │  │ │ Alice - 2 days ago    │ │   │   │
│ │ │ └────────────────────────────┘  │ │ Bob   - 5 days ago    │ │   │   │
│ │ │                                  │ │ Carol - 1 week ago    │ │   │   │
│ │ └──────────────────────────────────┴─ [View all]              │   │   │
│ │                                                                  │   │   │
│ └──────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Page Implementation

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useReferralTree } from '@/hooks/blockchain/useReferralTree';
import { useAffiliateStats } from '@/hooks/blockchain/useAffiliateStats';
import { useCommissionSplitEvents } from '@/hooks/blockchain/useCommissionSplitEvents';
import { ReferralLinkGenerator } from '@/components/affiliate/ReferralLinkGenerator';
import { ReferralTreeVisualization } from '@/components/affiliate/ReferralTreeVisualization';
import { ReferralStats } from '@/components/affiliate/ReferralStats';
import { CommissionBreakdownCard } from '@/components/affiliate/CommissionBreakdownCard';
import { RecentReferrals } from '@/components/affiliate/RecentReferrals';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { SettingsIcon, DownloadIcon, ShareIcon } from 'lucide-react';

export default function ReferralTreePage() {
  const { address, isConnected } = useWallet();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showLinkGenerator, setShowLinkGenerator] = useState(true);

  const { data: tree, isLoading: treeLoading } = useReferralTree(address!, 5);
  const { data: stats, isLoading: statsLoading } = useAffiliateStats(address!);

  // Real-time commission notifications
  useCommissionSplitEvents(address!);

  // Redirect to login if not connected
  useEffect(() => {
    if (!isConnected) {
      router.push('/login?redirect=/app/affiliate/referrals');
    }
  }, [isConnected]);

  if (!isConnected) {
    return null; // Loading state handled by redirect
  }

  const handleNodeClick = (node: TreeNode) => {
    setSelectedNodeId(node.id);
    // Could open a modal with node details
  };

  const handleExportCSV = () => {
    if (!tree) return;

    const csv = generateReferralCSV(tree);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bazari-referrals-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">My Referral Network</h1>
              <Breadcrumbs
                items={[
                  { label: 'Home', href: '/app' },
                  { label: 'Affiliate', href: '/app/affiliate' },
                  { label: 'My Referrals', href: '/app/affiliate/referrals' },
                ]}
              />
            </div>

            <Button variant="ghost" size="sm">
              <SettingsIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Referral Link Generator (Collapsible) */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLinkGenerator(!showLinkGenerator)}
            className="absolute -top-2 right-0 z-10"
          >
            {showLinkGenerator ? 'Hide' : 'Show'} Link Generator
          </Button>

          {showLinkGenerator && (
            <ReferralLinkGenerator
              userAddress={address!}
              variant="full"
            />
          )}
        </div>

        {/* Main Content: 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          {/* Left Column: Tree Visualization */}
          <div className="space-y-4">
            <ReferralTreeVisualization
              userAddress={address!}
              maxDepth={5}
              onNodeClick={handleNodeClick}
            />
          </div>

          {/* Right Sidebar: Stats & Actions */}
          <div className="space-y-6">
            {/* Stats */}
            <ReferralStats userAddress={address!} />

            {/* Commission Breakdown */}
            {stats && (
              <CommissionBreakdownCard
                orderId={0} // Mock for overall stats
                orderAmount={stats.totalSales}
                commissions={stats.earningsByLevel.map((amount, level) => ({
                  level,
                  affiliate: level === 0 ? address! : `Level ${level}`,
                  amount,
                  percentage: (amount / stats.totalSales) * 100,
                }))}
              />
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowLinkGenerator(true)}
                >
                  <ShareIcon className="w-4 h-4 mr-2" />
                  Share Referral Link
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => downloadQRCode(address!)}
                >
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  Download QR Code
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleExportCSV}
                >
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  Export Referrals (CSV)
                </Button>
              </CardContent>
            </Card>

            {/* Recent Referrals */}
            <RecentReferrals userAddress={address!} limit={5} />
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper: Generate CSV from tree
function generateReferralCSV(tree: TreeNode): string {
  const rows: string[] = [
    'Address,Name,Level,Joined Date,Total Sales,Total Commissions,Status',
  ];

  const traverse = (node: TreeNode) => {
    rows.push([
      node.id,
      node.name || '',
      node.level.toString(),
      format(node.stats.joinedAt, 'yyyy-MM-dd'),
      node.stats.totalSales.toString(),
      node.stats.totalCommissions.toString(),
      node.stats.isActive ? 'Active' : 'Inactive',
    ].join(','));

    node.children.forEach(traverse);
  };

  traverse(tree);
  return rows.join('\n');
}
```

### 2.3 Responsive Behavior

**Desktop (> 1024px)**:
- 2-column layout: Tree (70%) | Sidebar (30%)
- Full D3.js tree with zoom/pan
- All stats visible

**Tablet (768px - 1024px)**:
- Stacked layout: Tree on top, Sidebar below
- Tree height reduced to 500px
- Sidebar compressed (grid layout for stats)

**Mobile (< 768px)**:
- Single column, fully stacked
- Tree height: 400px
- Touch gestures for zoom/pan
- Collapsible sections (Link Generator, Stats)
- Bottom sheet for node details (on node click)

```tsx
// Mobile-specific adjustments
const isMobile = useMediaQuery('(max-width: 768px)');

<ReferralTreeVisualization
  userAddress={address!}
  maxDepth={isMobile ? 3 : 5} // Limit depth on mobile
  onNodeClick={(node) => {
    if (isMobile) {
      // Open bottom sheet instead of sidebar
      setBottomSheetNode(node);
      setBottomSheetOpen(true);
    } else {
      setSelectedNodeId(node.id);
    }
  }}
/>
```

### 2.4 Performance Optimizations

**Code Splitting**:
```tsx
// Lazy load D3.js tree (large bundle)
const ReferralTreeVisualization = dynamic(
  () => import('@/components/affiliate/ReferralTreeVisualization'),
  {
    loading: () => <TreeSkeleton />,
    ssr: false, // D3.js is client-side only
  }
);
```

**Data Caching**:
```tsx
// React Query with persistent cache
const { data: tree } = useReferralTree(address!, 5, {
  staleTime: 30000, // 30s
  cacheTime: 300000, // 5min
  refetchOnWindowFocus: false,
  refetchOnMount: false,
});
```

**Incremental Loading**:
```tsx
// Load tree incrementally (levels 0-1 first, then 2-4 on demand)
const [loadedDepth, setLoadedDepth] = useState(2);

<Button onClick={() => setLoadedDepth(5)}>
  Load Full Tree (Levels 2-4)
</Button>
```

### 2.5 State Management

**Local State**:
- `selectedNodeId`: Currently selected node in tree
- `showLinkGenerator`: Collapse/expand link generator
- `loadedDepth`: Tree depth loaded so far

**Global State** (React Query):
- `tree`: Referral tree data (cached)
- `stats`: Affiliate statistics (cached)
- `recentReferrals`: Latest 5 referrals (cached)

**WebSocket State** (Real-Time):
- `ReferralRegistered` events → Update tree (optimistic)
- `CommissionDistributed` events → Show toast notification

### 2.6 Error States

**Network Error**:
```tsx
if (error) {
  return (
    <ErrorState
      title="Failed to Load Referral Network"
      description="Please check your connection and try again."
      action={{
        label: 'Retry',
        onClick: () => refetch(),
      }}
    />
  );
}
```

**Empty State** (No referrals):
```tsx
if (tree?.children.length === 0) {
  return (
    <EmptyState
      icon={<UsersIcon className="w-16 h-16" />}
      title="No Referrals Yet"
      description="Share your referral link to start earning commissions!"
      action={{
        label: 'Copy Referral Link',
        onClick: () => copyReferralLink(address!),
      }}
    />
  );
}
```

### 2.7 Analytics Events

Track user interactions for optimization:
```tsx
// Track page view
useEffect(() => {
  analytics.page('ReferralTreePage', {
    totalReferrals: stats?.totalReferrals,
    totalEarnings: stats?.totalCommissionEarned,
  });
}, [stats]);

// Track actions
const handleShareLink = (platform: 'whatsapp' | 'twitter' | 'email') => {
  analytics.track('Referral Link Shared', { platform });
};

const handleExportCSV = () => {
  analytics.track('Referrals Exported', {
    count: countNodes(tree),
    format: 'csv',
  });
};
```

---

## 3. CampaignManagementPage

**Route**: `/app/affiliate/campaigns` (Store) OR `/app/admin/campaigns` (DAO)
**File**: `src/pages/affiliate/CampaignManagementPage.tsx`
**Purpose**: Create, view, and manage affiliate campaigns
**Access**: Store owners, DAO members
**Complexity**: ⭐⭐⭐

### 3.1 Page Layout

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Header                                                                      │
│ ┌─ Breadcrumb ─────────────────────────────────────────────────────────┐  │
│ │ Home > Affiliate > Campaigns                                         │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
│                                                        [+ Create Campaign]  │
├────────────────────────────────────────────────────────────────────────────┤
│ ┌─ Tabs ─────────────────────────────────────────────────────────────┐   │
│ │ [Active (3)] [Scheduled (1)] [Paused (0)] [Expired (7)]            │   │
│ └─────────────────────────────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────────────────────────────┤
│ ┌─ Filters & Search ──────────────────────────────────────────────────┐   │
│ │ Search: [🔍 Search campaigns...]                                     │   │
│ │ Store: [All Stores ▾]  Status: [All ▾]  Sort: [Newest ▾]           │   │
│ └─────────────────────────────────────────────────────────────────────┘   │
├────────────────────────────────────────────────────────────────────────────┤
│ ┌─ Campaign List ─────────────────────────────────────────────────────┐   │
│ │                                                                      │   │
│ │ ┌─ CampaignDetailCard ──────────────────────────────────────────┐  │   │
│ │ │ Summer Promo 2025                        [Edit] [⋮]           │  │   │
│ │ │ ID: 42 | Store: Acme Electronics | Active                    │  │   │
│ │ │                                                                │  │   │
│ │ │ Commission: 5% → 2.5% → 1.25% → 0.625% → 0.3125%            │  │   │
│ │ │ Duration: Jun 1 - Aug 31, 2025 (92 days left)               │  │   │
│ │ │ Budget: 1000 BZR | Spent: 347.5 BZR (34.8%)                 │  │   │
│ │ │ [████████░░] Progress bar                                    │  │   │
│ │ │                                                                │  │   │
│ │ │ Stats:                                                         │  │   │
│ │ │ ┌─────────┬─────────┬─────────┐                              │  │   │
│ │ │ │   127   │  6,950  │  347.5  │                              │  │   │
│ │ │ │Referrals│Sales BZR│Comm BZR │                              │  │   │
│ │ │ └─────────┴─────────┴─────────┘                              │  │   │
│ │ │                                                                │  │   │
│ │ │ [View Details] [Pause Campaign]                               │  │   │
│ │ └────────────────────────────────────────────────────────────────┘  │   │
│ │                                                                      │   │
│ │ ┌─ CampaignDetailCard ──────────────────────────────────────────┐  │   │
│ │ │ Back to School 2025                      [Edit] [⋮]           │  │   │
│ │ │ ... (similar structure)                                        │  │   │
│ │ └────────────────────────────────────────────────────────────────┘  │   │
│ │                                                                      │   │
│ │ [Load More]                                                          │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ ┌─ Campaign Stats Summary (Footer) ───────────────────────────────────┐   │
│ │ Total Campaigns: 11 | Active: 3 | Total Budget: 5,432 BZR          │   │
│ └──────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Page Implementation

```tsx
'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useCampaigns } from '@/hooks/blockchain/useCampaigns';
import { useCreateCampaign } from '@/hooks/blockchain/useCreateCampaign';
import { CampaignDetailCard } from '@/components/affiliate/CampaignDetailCard';
import { CreateCampaignForm } from '@/components/affiliate/CreateCampaignForm';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { PlusIcon } from 'lucide-react';

type CampaignStatus = 'active' | 'scheduled' | 'paused' | 'expired';

export default function CampaignManagementPage() {
  const { address, isConnected } = useWallet();
  const [selectedTab, setSelectedTab] = useState<CampaignStatus>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: campaigns, isLoading, refetch } = useCampaigns(selectedStore, selectedTab);
  const { mutate: createCampaign, isLoading: isCreating } = useCreateCampaign();

  // Filter campaigns by search query
  const filteredCampaigns = campaigns?.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateCampaign = async (data: CreateCampaignFormData) => {
    await createCampaign(data, {
      onSuccess: () => {
        setCreateDialogOpen(false);
        toast.success('Campaign created successfully!');
        refetch();
      },
    });
  };

  const handlePauseCampaign = async (campaignId: number) => {
    // Implementation
  };

  const handleEditCampaign = (campaignId: number) => {
    router.push(`/app/affiliate/campaigns/${campaignId}/edit`);
  };

  // Count campaigns by status
  const campaignCounts = {
    active: campaigns?.filter((c) => c.status === 'active').length || 0,
    scheduled: campaigns?.filter((c) => c.status === 'scheduled').length || 0,
    paused: campaigns?.filter((c) => c.status === 'paused').length || 0,
    expired: campaigns?.filter((c) => c.status === 'expired').length || 0,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Affiliate Campaigns</h1>
              <Breadcrumbs
                items={[
                  { label: 'Home', href: '/app' },
                  { label: 'Affiliate', href: '/app/affiliate' },
                  { label: 'Campaigns', href: '/app/affiliate/campaigns' },
                ]}
              />
            </div>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </DialogTrigger>

              <CreateCampaignForm
                onSubmit={handleCreateCampaign}
                onCancel={() => setCreateDialogOpen(false)}
                isSubmitting={isCreating}
              />
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as CampaignStatus)}>
          <TabsList>
            <TabsTrigger value="active">
              Active ({campaignCounts.active})
            </TabsTrigger>
            <TabsTrigger value="scheduled">
              Scheduled ({campaignCounts.scheduled})
            </TabsTrigger>
            <TabsTrigger value="paused">
              Paused ({campaignCounts.paused})
            </TabsTrigger>
            <TabsTrigger value="expired">
              Expired ({campaignCounts.expired})
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
              icon={<SearchIcon className="w-4 h-4" />}
            />

            <Select value={selectedStore?.toString()} onValueChange={(v) => setSelectedStore(parseInt(v))}>
              <SelectTrigger className="w-48">
                All Stores
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {/* Populate from user's stores */}
              </SelectContent>
            </Select>

            <Select defaultValue="newest">
              <SelectTrigger className="w-48">
                Sort by
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="budget-high">Highest Budget</SelectItem>
                <SelectItem value="budget-low">Lowest Budget</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campaign List */}
          <TabsContent value={selectedTab} className="mt-6 space-y-4">
            {isLoading ? (
              <CampaignListSkeleton count={3} />
            ) : filteredCampaigns?.length === 0 ? (
              <EmptyState
                icon={<MegaphoneIcon className="w-12 h-12" />}
                title={`No ${selectedTab} campaigns`}
                description={
                  selectedTab === 'active'
                    ? 'Create your first campaign to start earning affiliate commissions'
                    : `You don't have any ${selectedTab} campaigns yet`
                }
                action={
                  selectedTab === 'active'
                    ? {
                        label: 'Create Campaign',
                        onClick: () => setCreateDialogOpen(true),
                      }
                    : undefined
                }
              />
            ) : (
              <div className="space-y-4">
                {filteredCampaigns?.map((campaign) => (
                  <CampaignDetailCard
                    key={campaign.id}
                    campaign={campaign}
                    onEdit={() => handleEditCampaign(campaign.id)}
                    onPause={() => handlePauseCampaign(campaign.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Summary Stats */}
        {campaigns && campaigns.length > 0 && (
          <Card className="mt-8">
            <CardContent className="flex justify-around py-4">
              <Stat label="Total Campaigns" value={campaigns.length} />
              <Stat label="Active" value={campaignCounts.active} />
              <Stat label="Total Budget" value={`${formatBZR(totalBudget(campaigns))} BZR`} />
              <Stat label="Total Spent" value={`${formatBZR(totalSpent(campaigns))} BZR`} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

// Helper: Calculate total budget
function totalBudget(campaigns: Campaign[]): number {
  return campaigns.reduce((sum, c) => sum + c.budget, 0);
}

// Helper: Calculate total spent
function totalSpent(campaigns: Campaign[]): number {
  return campaigns.reduce((sum, c) => sum + c.spent, 0);
}

// Stat component
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
```

### 3.3 Access Control

**Store Owners**:
- Can create campaigns for their own stores
- Can view/edit/pause only their campaigns
- Route: `/app/affiliate/campaigns`

**DAO Members**:
- Can create global campaigns (all stores)
- Can view all campaigns (system-wide)
- Can force-pause campaigns
- Route: `/app/admin/campaigns` (same component, different permissions)

```tsx
// Access control wrapper
function CampaignManagementPage() {
  const { isStoreOwner, isDAOMember } = useRoles();

  if (!isStoreOwner && !isDAOMember) {
    return (
      <AccessDenied
        title="Access Denied"
        description="Only store owners and DAO members can manage campaigns."
      />
    );
  }

  // Rest of component...
}
```

### 3.4 Real-Time Updates

**Campaign Status Changes**:
```tsx
// WebSocket listener for campaign events
useBlockchainEvent('bazariAffiliate', 'CampaignCreated', (event) => {
  toast.success(`New campaign created: ${event.data.name}`);
  queryClient.invalidateQueries(['campaigns']);
});

useBlockchainEvent('bazariAffiliate', 'CampaignPaused', (event) => {
  toast.info(`Campaign #${event.data.campaignId} paused`);
  queryClient.invalidateQueries(['campaigns']);
});
```

**Budget Depletion**:
```tsx
// Alert when budget reaches 90%
useEffect(() => {
  campaigns?.forEach((c) => {
    const percentUsed = (c.spent / c.budget) * 100;
    if (percentUsed >= 90 && percentUsed < 100) {
      toast.warning(
        `Campaign "${c.name}" budget is ${percentUsed.toFixed(0)}% depleted!`,
        {
          action: {
            label: 'Increase Budget',
            onClick: () => router.push(`/app/affiliate/campaigns/${c.id}/edit`),
          },
        }
      );
    }
  });
}, [campaigns]);
```

### 3.5 Responsive Behavior

**Mobile** (< 768px):
- Stacked layout
- Tabs converted to dropdown
- Campaign cards simplified (hide stats grid, show summary only)
- Create button fixed at bottom

```tsx
const isMobile = useMediaQuery('(max-width: 768px)');

// Mobile-specific UI
{isMobile ? (
  <BottomFloatingButton onClick={() => setCreateDialogOpen(true)}>
    <PlusIcon /> Create Campaign
  </BottomFloatingButton>
) : (
  <Button>
    <PlusIcon /> Create Campaign
  </Button>
)}
```

---

## 4. Routing & Navigation

### 4.1 Route Configuration

```tsx
// app/affiliate/routes.ts
export const affiliateRoutes = [
  {
    path: '/app/affiliate/referrals',
    component: ReferralTreePage,
    auth: 'authenticated',
    title: 'My Referrals',
  },
  {
    path: '/app/affiliate/campaigns',
    component: CampaignManagementPage,
    auth: 'store-owner',
    title: 'Affiliate Campaigns',
  },
  {
    path: '/app/admin/campaigns',
    component: CampaignManagementPage,
    auth: 'dao-member',
    title: 'Manage Campaigns (DAO)',
  },
];
```

### 4.2 Navigation Menu

```tsx
// Sidebar navigation
<SidebarNav>
  <NavGroup label="Affiliate">
    <NavItem href="/app/affiliate/referrals" icon={<UsersIcon />}>
      My Referrals
      <Badge>{stats?.totalReferrals}</Badge>
    </NavItem>

    <NavItem href="/app/affiliate/campaigns" icon={<MegaphoneIcon />}>
      Campaigns
      <Badge>{activeCampaigns}</Badge>
    </NavItem>

    <NavItem href="/app/affiliate/earnings" icon={<CoinsIcon />}>
      Earnings
      <Badge>{formatBZR(stats?.totalCommissionEarned)} BZR</Badge>
    </NavItem>
  </NavGroup>
</SidebarNav>
```

### 4.3 Deep Linking

**Referral Registration**:
```
https://bazari.xyz/r/0xAlice
→ Redirects to /register?ref=0xAlice
→ After registration, auto-calls register_referral(0xAlice)
```

**Campaign Details**:
```
https://bazari.xyz/app/affiliate/campaigns/42
→ Opens CampaignDetailPage with ID 42
```

---

## 5. SEO & Metadata

### 5.1 Meta Tags

**ReferralTreePage**:
```tsx
export const metadata: Metadata = {
  title: 'My Referral Network | Bazari',
  description: 'View and manage your referral network. Earn multi-level commissions on every sale.',
  openGraph: {
    title: 'My Referral Network | Bazari',
    description: 'Visualize your 5-level referral tree and track earnings.',
    images: ['/og-referral-tree.png'],
  },
};
```

**CampaignManagementPage**:
```tsx
export const metadata: Metadata = {
  title: 'Affiliate Campaigns | Bazari',
  description: 'Create and manage affiliate campaigns for your store.',
  robots: 'noindex, nofollow', // Private page
};
```

### 5.2 Structured Data

```tsx
// JSON-LD for referral program
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LoyaltyProgram",
  "name": "Bazari Affiliate Program",
  "description": "Multi-level affiliate program with up to 9.69% commission split",
  "provider": {
    "@type": "Organization",
    "name": "Bazari"
  }
}
</script>
```

---

## 6. Error Handling

### 6.1 Network Errors

```tsx
if (error) {
  return (
    <ErrorState
      title="Failed to Load Campaigns"
      description={error.message}
      action={{
        label: 'Retry',
        onClick: () => refetch(),
      }}
      supportAction={{
        label: 'Contact Support',
        onClick: () => window.open('/support', '_blank'),
      }}
    />
  );
}
```

### 6.2 Blockchain Transaction Errors

```tsx
const { mutate: createCampaign } = useCreateCampaign({
  onError: (error) => {
    if (error.message.includes('InsufficientBalance')) {
      toast.error('Insufficient balance to lock campaign budget');
    } else if (error.message.includes('InvalidDates')) {
      toast.error('End date must be after start date');
    } else {
      toast.error('Failed to create campaign. Please try again.');
    }
  },
});
```

### 6.3 Permission Errors

```tsx
// 403 Forbidden
if (!hasPermission) {
  return (
    <AccessDenied
      title="Access Denied"
      description="You don't have permission to access this page."
      action={{
        label: 'Go to Dashboard',
        onClick: () => router.push('/app'),
      }}
    />
  );
}
```

---

**Document Status**: ✅ **COMPLETE**
**Total Pages**: 2 (ReferralTreePage, CampaignManagementPage)
**Lines of Code (Estimated)**: ~1,200 lines
**Testing Coverage Target**: 80%+

---

*End of PAGES.md*
