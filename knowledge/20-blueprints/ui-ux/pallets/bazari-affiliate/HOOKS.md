# bazari-affiliate Pallet - Blockchain Hooks Specification

**Status**: Complete Hooks Specifications
**Version**: 1.0
**Last Updated**: 2025-11-14
**Total Hooks**: 6 (3 Query + 2 Mutation + 1 Subscription)
**Priority**: P0 CRITICAL
**Dependencies**: Polkadot.js API, React Query, WebSocket
**Maintainer**: Bazari Frontend Team

---

## Table of Contents

1. [Hooks Overview](#1-hooks-overview)
2. [Query Hooks (Read Data)](#2-query-hooks-read-data)
3. [Mutation Hooks (Write Data)](#3-mutation-hooks-write-data)
4. [Subscription Hooks (Real-Time Events)](#4-subscription-hooks-real-time-events)
5. [Utility Hooks](#5-utility-hooks)
6. [Error Handling](#6-error-handling)
7. [Testing](#7-testing)

---

## 1. Hooks Overview

### 1.1 Hook Categories

| Category | Hook Name | Purpose | Complexity | Priority |
|----------|-----------|---------|------------|----------|
| **Query** | `useReferralTree` | Fetch referral DAG (5 levels) | High | P0 |
| **Query** | `useCampaigns` | Fetch affiliate campaigns | Medium | P1 |
| **Query** | `useCommissionHistory` | Fetch commission earnings | Medium | P0 |
| **Mutation** | `useRegisterReferral` | Register new referral | Low | P0 |
| **Mutation** | `useCreateCampaign` | Create affiliate campaign | Medium | P1 |
| **Subscription** | `useCommissionSplitEvents` | Real-time commission notifications | Medium | P0 |

### 1.2 Architecture Pattern

All hooks follow the **React Query + Polkadot.js** pattern:

```typescript
// Query Hook Pattern
export function useBlockchainData<T>(key: string[], queryFn: () => Promise<T>, options?: UseQueryOptions) {
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const api = await getApi();
      return queryFn(api);
    },
    ...options,
  });
}

// Mutation Hook Pattern
export function useBlockchainAction<TData, TVariables>(mutationFn: (vars: TVariables) => Promise<TData>) {
  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const api = await getApi();
      return mutationFn(api, variables);
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries(['relevantKey']);
    },
  });
}
```

### 1.3 Common Dependencies

```typescript
// File: src/hooks/blockchain/common.ts
import { ApiPromise } from '@polkadot/api';
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useWallet } from '@/hooks/useWallet';
import { getApi } from '@/services/polkadot';
import { toast } from 'sonner';

export { useQuery, useMutation, useQueryClient };
```

---

## 2. Query Hooks (Read Data)

### 2.1 useReferralTree

**File**: `src/hooks/blockchain/useReferralTree.ts`
**Purpose**: Fetch user's referral tree recursively (up to 5 levels)
**Complexity**: ⭐⭐⭐⭐⭐ (Most complex - recursive blockchain queries)

#### 2.1.1 Interface

```typescript
interface TreeNode {
  id: string; // Address
  name?: string; // Display name (from backend)
  level: number; // 0-4
  avatar?: string; // IPFS URL or generated
  children: TreeNode[];
  stats: {
    joinedAt: Date;
    totalSales: number; // BZR
    totalCommissions: number; // BZR
    isActive: boolean; // Purchased in last 30 days
  };
}

interface UseReferralTreeOptions extends UseQueryOptions<TreeNode> {
  maxDepth?: number; // Default: 5
  includeStats?: boolean; // Default: true
}

function useReferralTree(
  userAddress: string,
  maxDepth?: number,
  options?: UseReferralTreeOptions
): UseQueryResult<TreeNode>;
```

#### 2.1.2 Implementation

```typescript
import { ApiPromise } from '@polkadot/api';
import { useQuery } from '@tanstack/react-query';
import { getApi } from '@/services/polkadot';

export function useReferralTree(
  userAddress: string,
  maxDepth: number = 5,
  options?: UseReferralTreeOptions
) {
  return useQuery<TreeNode>({
    queryKey: ['referralTree', userAddress, maxDepth],
    queryFn: async () => {
      const api = await getApi();

      // Recursive function to build tree
      const buildTree = async (
        address: string,
        currentLevel: number
      ): Promise<TreeNode> => {
        // Base case: Max depth reached
        if (currentLevel >= maxDepth) {
          return {
            id: address,
            level: currentLevel,
            children: [],
            stats: await fetchNodeStats(api, address),
          };
        }

        // Fetch direct referrals from blockchain
        const directReferralsRaw = await api.query.bazariAffiliate.directReferrals(address);
        const directReferrals = directReferralsRaw.toJSON() as string[];

        // Recursively fetch children
        const children = await Promise.all(
          directReferrals.map((childAddress) =>
            buildTree(childAddress, currentLevel + 1)
          )
        );

        // Fetch stats for this node
        const stats = options?.includeStats !== false
          ? await fetchNodeStats(api, address)
          : getDefaultStats();

        return {
          id: address,
          level: currentLevel,
          children,
          stats,
        };
      };

      // Start recursion from user address (level 0)
      return buildTree(userAddress, 0);
    },
    staleTime: 30000, // 30 seconds (tree changes infrequently)
    cacheTime: 300000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

// Helper: Fetch stats for a single node
async function fetchNodeStats(
  api: ApiPromise,
  address: string
): Promise<TreeNode['stats']> {
  try {
    // Fetch affiliate stats from blockchain
    const statsRaw = await api.query.bazariAffiliate.affiliateStats(address);
    const stats = statsRaw.toJSON() as any;

    // Fetch additional data from backend (cached)
    const response = await fetch(`/api/affiliates/${address}/stats`);
    const backendData = await response.json();

    return {
      joinedAt: new Date(backendData.joinedAt),
      totalSales: backendData.totalSales || 0,
      totalCommissions: stats?.total_commission_earned || 0,
      isActive: backendData.lastPurchase
        ? Date.now() - new Date(backendData.lastPurchase).getTime() < 30 * 24 * 60 * 60 * 1000
        : false,
    };
  } catch (error) {
    console.error('Failed to fetch node stats:', error);
    return getDefaultStats();
  }
}

// Helper: Default stats when fetch fails
function getDefaultStats(): TreeNode['stats'] {
  return {
    joinedAt: new Date(),
    totalSales: 0,
    totalCommissions: 0,
    isActive: false,
  };
}
```

#### 2.1.3 Usage Example

```tsx
function ReferralTreePage() {
  const { address } = useWallet();
  const { data: tree, isLoading, error, refetch } = useReferralTree(address!, 5, {
    enabled: !!address, // Only fetch if address exists
    refetchOnWindowFocus: false, // Don't refetch on tab focus (expensive)
  });

  if (isLoading) return <TreeSkeleton />;
  if (error) return <ErrorState error={error} retry={refetch} />;
  if (!tree) return <EmptyState />;

  return <ReferralTreeVisualization tree={tree} />;
}
```

#### 2.1.4 Performance Optimizations

**Server-Side Caching** (Recommended for production):
```typescript
// Instead of recursive blockchain queries, fetch from backend API
export function useReferralTree(userAddress: string, maxDepth: number = 5) {
  return useQuery({
    queryKey: ['referralTree', userAddress, maxDepth],
    queryFn: async () => {
      // Backend has pre-indexed tree in PostgreSQL
      const response = await fetch(
        `/api/affiliates/${userAddress}/tree?depth=${maxDepth}`
      );
      return response.json();
    },
    staleTime: 60000, // 1 minute (backend cache is fresh)
  });
}
```

**Incremental Loading**:
```typescript
// Load levels 0-2 first, then 3-4 on demand
const [loadedDepth, setLoadedDepth] = useState(2);

const { data: tree } = useReferralTree(address!, loadedDepth);

<Button onClick={() => setLoadedDepth(5)}>
  Load Full Tree
</Button>
```

---

### 2.2 useCampaigns

**File**: `src/hooks/blockchain/useCampaigns.ts`
**Purpose**: Fetch affiliate campaigns with filters
**Complexity**: ⭐⭐⭐

#### 2.2.1 Interface

```typescript
interface Campaign {
  id: number;
  name: string;
  storeId: number;
  storeName: string;
  commissionRate: number; // Base rate (e.g., 5%)
  maxDepth: number; // 1-5
  decayRate: number; // 0-100%
  startDate: Date;
  endDate: Date;
  budget: number; // BZR
  spent: number; // BZR
  status: 'active' | 'scheduled' | 'paused' | 'expired';
  stats: {
    totalReferrals: number;
    totalSales: number;
    totalCommissions: number;
  };
}

type CampaignStatus = 'active' | 'scheduled' | 'paused' | 'expired';

function useCampaigns(
  storeId?: number,
  status?: CampaignStatus,
  options?: UseQueryOptions<Campaign[]>
): UseQueryResult<Campaign[]>;
```

#### 2.2.2 Implementation

```typescript
export function useCampaigns(
  storeId?: number,
  status?: CampaignStatus,
  options?: UseQueryOptions<Campaign[]>
) {
  return useQuery<Campaign[]>({
    queryKey: ['campaigns', storeId, status],
    queryFn: async () => {
      const api = await getApi();

      // Fetch all campaigns from blockchain (iterate storage map)
      const entries = await api.query.bazariAffiliate.campaigns.entries();

      const campaigns: Campaign[] = await Promise.all(
        entries.map(async ([key, value]) => {
          const campaignId = key.args[0].toNumber();
          const rawData = value.toJSON() as any;

          // Fetch stats from backend (cached)
          const statsResponse = await fetch(`/api/campaigns/${campaignId}/stats`);
          const stats = await statsResponse.json();

          // Determine status
          const now = Date.now();
          const startDate = new Date(rawData.start_date * 1000);
          const endDate = new Date(rawData.end_date * 1000);
          let campaignStatus: CampaignStatus;

          if (rawData.paused) {
            campaignStatus = 'paused';
          } else if (now < startDate.getTime()) {
            campaignStatus = 'scheduled';
          } else if (now > endDate.getTime()) {
            campaignStatus = 'expired';
          } else {
            campaignStatus = 'active';
          }

          return {
            id: campaignId,
            name: rawData.name,
            storeId: rawData.store_id,
            storeName: stats.storeName || 'Unknown Store',
            commissionRate: rawData.commission_rate,
            maxDepth: rawData.max_depth,
            decayRate: rawData.decay_rate,
            startDate,
            endDate,
            budget: rawData.budget,
            spent: rawData.spent,
            status: campaignStatus,
            stats: {
              totalReferrals: stats.totalReferrals || 0,
              totalSales: stats.totalSales || 0,
              totalCommissions: stats.totalCommissions || 0,
            },
          };
        })
      );

      // Filter by storeId and status
      return campaigns.filter((c) => {
        if (storeId && c.storeId !== storeId) return false;
        if (status && c.status !== status) return false;
        return true;
      });
    },
    staleTime: 30000, // 30 seconds
    ...options,
  });
}
```

#### 2.2.3 Usage Example

```tsx
function CampaignManagementPage() {
  const [selectedStatus, setSelectedStatus] = useState<CampaignStatus>('active');
  const { data: campaigns, isLoading } = useCampaigns(undefined, selectedStatus);

  return (
    <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
      <TabsList>
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
        <TabsTrigger value="expired">Expired</TabsTrigger>
      </TabsList>

      <TabsContent value={selectedStatus}>
        {campaigns?.map((c) => (
          <CampaignDetailCard key={c.id} campaign={c} />
        ))}
      </TabsContent>
    </Tabs>
  );
}
```

---

### 2.3 useCommissionHistory

**File**: `src/hooks/blockchain/useCommissionHistory.ts`
**Purpose**: Fetch user's commission earnings history
**Complexity**: ⭐⭐

#### 2.3.1 Interface

```typescript
interface CommissionRecord {
  orderId: number;
  orderAmount: number; // BZR
  affiliate: string; // Address
  amount: number; // BZR earned
  level: number; // 0-4
  timestamp: Date;
  txHash: string;
  buyer?: string; // Who made the purchase
}

function useCommissionHistory(
  userAddress: string,
  limit?: number,
  offset?: number,
  options?: UseQueryOptions<CommissionRecord[]>
): UseQueryResult<CommissionRecord[]>;
```

#### 2.3.2 Implementation

```typescript
export function useCommissionHistory(
  userAddress: string,
  limit: number = 50,
  offset: number = 0,
  options?: UseQueryOptions<CommissionRecord[]>
) {
  return useQuery<CommissionRecord[]>({
    queryKey: ['commissionHistory', userAddress, limit, offset],
    queryFn: async () => {
      // Using backend API (recommended)
      // Backend indexes CommissionDistributed events
      const response = await fetch(
        `/api/affiliates/${userAddress}/commissions?limit=${limit}&offset=${offset}`
      );
      const data = await response.json();

      return data.commissions.map((c: any) => ({
        orderId: c.order_id,
        orderAmount: c.order_amount,
        affiliate: userAddress,
        amount: c.amount,
        level: c.level,
        timestamp: new Date(c.timestamp),
        txHash: c.tx_hash,
        buyer: c.buyer,
      }));
    },
    staleTime: 10000, // 10 seconds
    ...options,
  });
}

// Alternative: Query blockchain directly (slower)
export function useCommissionHistoryOnChain(userAddress: string) {
  return useQuery({
    queryKey: ['commissionHistoryOnChain', userAddress],
    queryFn: async () => {
      const api = await getApi();

      // Subscribe to CommissionDistributed events
      // Filter by affiliate address
      const events = await api.query.system.events();

      const commissions: CommissionRecord[] = [];

      events.forEach((record) => {
        const { event } = record;

        if (
          event.section === 'bazariAffiliate' &&
          event.method === 'CommissionDistributed'
        ) {
          const [orderId, affiliate, amount, level] = event.data;

          if (affiliate.toString() === userAddress) {
            commissions.push({
              orderId: orderId.toNumber(),
              orderAmount: 0, // Not available in event
              affiliate: affiliate.toString(),
              amount: amount.toNumber(),
              level: level.toNumber(),
              timestamp: new Date(), // Block timestamp
              txHash: record.hash.toString(),
            });
          }
        }
      });

      return commissions;
    },
  });
}
```

#### 2.3.3 Usage Example

```tsx
function CommissionHistoryTable() {
  const { address } = useWallet();
  const { data: commissions, isLoading, fetchNextPage, hasNextPage } = useCommissionHistory(
    address!,
    20,
    0
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Order ID</TableHead>
          <TableHead>Level</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>TX Hash</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {commissions?.map((c) => (
          <TableRow key={c.txHash}>
            <TableCell>{format(c.timestamp, 'MMM d, yyyy')}</TableCell>
            <TableCell>#{c.orderId}</TableCell>
            <TableCell>L{c.level}</TableCell>
            <TableCell>{formatBZR(c.amount)} BZR</TableCell>
            <TableCell>
              <TxHashLink hash={c.txHash} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

---

## 3. Mutation Hooks (Write Data)

### 3.1 useRegisterReferral

**File**: `src/hooks/blockchain/useRegisterReferral.ts`
**Purpose**: Register new referral relationship
**Complexity**: ⭐⭐

#### 3.1.1 Interface

```typescript
function useRegisterReferral(): UseMutationResult<
  void,
  Error,
  string, // referrerAddress
  unknown
>;
```

#### 3.1.2 Implementation

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getApi } from '@/services/polkadot';
import { useWallet } from '@/hooks/useWallet';
import { toast } from 'sonner';

export function useRegisterReferral() {
  const { address, signer } = useWallet();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (referrerAddress: string) => {
      const api = await getApi();

      if (!address || !signer) {
        throw new Error('Wallet not connected');
      }

      // Validate referrer address
      if (address === referrerAddress) {
        throw new Error('SelfReferral');
      }

      // Check if already referred
      const existingReferrer = await api.query.bazariAffiliate.referrerOf(address);
      if (existingReferrer.isSome) {
        throw new Error('AlreadyReferred');
      }

      // Create extrinsic
      const tx = api.tx.bazariAffiliate.registerReferral(referrerAddress);

      // Sign and send
      return new Promise((resolve, reject) => {
        tx.signAndSend(address, { signer }, ({ status, events, dispatchError }) => {
          if (status.isInBlock || status.isFinalized) {
            if (dispatchError) {
              if (dispatchError.isModule) {
                const decoded = api.registry.findMetaError(dispatchError.asModule);
                reject(new Error(decoded.name));
              } else {
                reject(new Error(dispatchError.toString()));
              }
            } else {
              resolve();
            }
          }
        }).catch(reject);
      });
    },
    onSuccess: (_, referrerAddress) => {
      toast.success('✅ Referral registered!', {
        description: `You are now referred by ${truncateAddress(referrerAddress)}`,
      });

      // Invalidate related queries
      queryClient.invalidateQueries(['referralTree']);
      queryClient.invalidateQueries(['affiliateStats']);
    },
    onError: (error) => {
      if (error.message === 'SelfReferral') {
        toast.error('You cannot refer yourself');
      } else if (error.message === 'AlreadyReferred') {
        toast.error('You already have a referrer');
      } else {
        toast.error('Failed to register referral', {
          description: error.message,
        });
      }
    },
  });
}
```

#### 3.1.3 Usage Example

```tsx
function RegisterWithReferral() {
  const { mutate: registerReferral, isLoading } = useRegisterReferral();

  useEffect(() => {
    // Extract referrer from URL
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');

    if (ref && isValidAddress(ref)) {
      registerReferral(ref);
    }
  }, []);

  return isLoading ? <Spinner /> : null;
}
```

---

### 3.2 useCreateCampaign

**File**: `src/hooks/blockchain/useCreateCampaign.ts`
**Purpose**: Create new affiliate campaign
**Complexity**: ⭐⭐⭐

#### 3.2.1 Interface

```typescript
interface CreateCampaignParams {
  name: string;
  description?: string;
  storeId: number;
  commissionRate: number; // 0-20%
  maxDepth: number; // 1-5
  decayRate: number; // 0-100%
  startDate: Date;
  endDate: Date;
  budget: number; // BZR
  productIds?: number[]; // Optional targeting
}

function useCreateCampaign(): UseMutationResult<
  number, // campaignId
  Error,
  CreateCampaignParams,
  unknown
>;
```

#### 3.2.2 Implementation

```typescript
export function useCreateCampaign() {
  const { address, signer } = useWallet();
  const queryClient = useQueryClient();

  return useMutation<number, Error, CreateCampaignParams>({
    mutationFn: async (params: CreateCampaignParams) => {
      const api = await getApi();

      if (!address || !signer) {
        throw new Error('Wallet not connected');
      }

      // Validate dates
      if (params.endDate <= params.startDate) {
        throw new Error('End date must be after start date');
      }

      // Validate budget
      const balance = await api.query.system.account(address);
      const freeBalance = balance.data.free.toNumber();
      if (freeBalance < params.budget) {
        throw new Error('Insufficient balance');
      }

      // Convert dates to block numbers (approximation: 6s per block)
      const startBlock = Math.floor(params.startDate.getTime() / 1000 / 6);
      const endBlock = Math.floor(params.endDate.getTime() / 1000 / 6);

      // Create extrinsic
      const tx = api.tx.bazariAffiliate.createCampaign(
        params.storeId,
        params.commissionRate * 100, // Convert to basis points (5% = 500)
        params.maxDepth,
        params.decayRate * 100,
        startBlock,
        endBlock,
        params.budget
      );

      // Sign and send
      return new Promise((resolve, reject) => {
        tx.signAndSend(address, { signer }, ({ status, events, dispatchError }) => {
          if (status.isInBlock || status.isFinalized) {
            if (dispatchError) {
              if (dispatchError.isModule) {
                const decoded = api.registry.findMetaError(dispatchError.asModule);
                reject(new Error(decoded.name));
              } else {
                reject(new Error(dispatchError.toString()));
              }
            } else {
              // Extract campaignId from events
              const campaignCreated = events.find(
                ({ event }) =>
                  event.section === 'bazariAffiliate' &&
                  event.method === 'CampaignCreated'
              );

              if (campaignCreated) {
                const campaignId = campaignCreated.event.data[0].toNumber();
                resolve(campaignId);
              } else {
                reject(new Error('CampaignCreated event not found'));
              }
            }
          }
        }).catch(reject);
      });
    },
    onSuccess: (campaignId, params) => {
      toast.success('✅ Campaign created!', {
        description: `Campaign #${campaignId}: ${params.name}`,
        action: {
          label: 'View',
          onClick: () => router.push(`/app/affiliate/campaigns/${campaignId}`),
        },
      });

      // Invalidate campaigns query
      queryClient.invalidateQueries(['campaigns']);
    },
    onError: (error) => {
      if (error.message === 'InsufficientBalance') {
        toast.error('Insufficient balance to create campaign');
      } else if (error.message.includes('InvalidDates')) {
        toast.error('Invalid campaign dates');
      } else {
        toast.error('Failed to create campaign', {
          description: error.message,
        });
      }
    },
  });
}
```

#### 3.2.3 Usage Example

```tsx
function CreateCampaignForm() {
  const { mutate: createCampaign, isLoading } = useCreateCampaign();

  const handleSubmit = async (data: CreateCampaignFormData) => {
    await createCampaign({
      name: data.name,
      storeId: data.storeId,
      commissionRate: data.baseRate,
      maxDepth: data.maxDepth,
      decayRate: data.decayRate,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      budget: data.budget,
    });
  };

  return (
    <Form onSubmit={handleSubmit}>
      {/* Form fields */}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Campaign'}
      </Button>
    </Form>
  );
}
```

---

## 4. Subscription Hooks (Real-Time Events)

### 4.1 useCommissionSplitEvents

**File**: `src/hooks/blockchain/useCommissionSplitEvents.ts`
**Purpose**: Listen to real-time commission distribution events
**Complexity**: ⭐⭐⭐

#### 4.1.1 Interface

```typescript
function useCommissionSplitEvents(
  userAddress: string,
  onCommission?: (commission: CommissionEvent) => void
): void;

interface CommissionEvent {
  orderId: number;
  affiliate: string;
  amount: number;
  level: number;
  timestamp: Date;
}
```

#### 4.1.2 Implementation

```typescript
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getApi } from '@/services/polkadot';
import { toast } from 'sonner';

export function useCommissionSplitEvents(
  userAddress: string,
  onCommission?: (commission: CommissionEvent) => void
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userAddress) return;

    let unsubscribe: (() => void) | undefined;

    const subscribe = async () => {
      const api = await getApi();

      // Subscribe to system events
      unsubscribe = await api.query.system.events((events) => {
        events.forEach((record) => {
          const { event } = record;

          // Filter CommissionDistributed events
          if (
            event.section === 'bazariAffiliate' &&
            event.method === 'CommissionDistributed'
          ) {
            const [orderId, affiliate, amount, level] = event.data;

            // Only process if current user is the affiliate
            if (affiliate.toString() === userAddress) {
              const commission: CommissionEvent = {
                orderId: orderId.toNumber(),
                affiliate: affiliate.toString(),
                amount: amount.toNumber(),
                level: level.toNumber(),
                timestamp: new Date(),
              };

              // Show toast notification
              toast.success(`💰 Earned ${formatBZR(commission.amount)} BZR!`, {
                description: `From referral sale (Level ${commission.level})`,
                action: {
                  label: 'View Order',
                  onClick: () => router.push(`/app/orders/${commission.orderId}`),
                },
              });

              // Trigger callback
              onCommission?.(commission);

              // Invalidate related queries
              queryClient.invalidateQueries(['affiliateStats', userAddress]);
              queryClient.invalidateQueries(['commissionHistory', userAddress]);

              // Trigger commission flow animation (custom event)
              window.dispatchEvent(
                new CustomEvent('commission-received', { detail: commission })
              );
            }
          }
        });
      });
    };

    subscribe().catch(console.error);

    // Cleanup
    return () => {
      unsubscribe?.();
    };
  }, [userAddress, onCommission, queryClient]);
}
```

#### 4.1.3 Usage Example

```tsx
function AffiliateDashboard() {
  const { address } = useWallet();
  const [recentCommissions, setRecentCommissions] = useState<CommissionEvent[]>([]);

  // Subscribe to real-time commission events
  useCommissionSplitEvents(address!, (commission) => {
    // Add to recent commissions list
    setRecentCommissions((prev) => [commission, ...prev].slice(0, 5));

    // Play sound notification (optional)
    new Audio('/sounds/commission.mp3').play();
  });

  return (
    <div>
      <h2>Recent Commissions</h2>
      <ul>
        {recentCommissions.map((c) => (
          <li key={c.orderId}>
            {formatBZR(c.amount)} BZR from Order #{c.orderId}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 5. Utility Hooks

### 5.1 useAffiliateStats

**File**: `src/hooks/blockchain/useAffiliateStats.ts`
**Purpose**: Fetch aggregate affiliate statistics
**Complexity**: ⭐⭐

```typescript
interface AffiliateStats {
  totalReferrals: number;
  directReferrals: number;
  activeBuyers: number;
  activeBuyersPercent: number;
  totalCommissionEarned: number; // BZR
  earningsByLevel: number[]; // [L0, L1, L2, L3, L4]
  referralsTrend?: number; // Percentage change (monthly)
  earningsTrend?: number; // Percentage change (monthly)
}

export function useAffiliateStats(userAddress: string) {
  return useQuery<AffiliateStats>({
    queryKey: ['affiliateStats', userAddress],
    queryFn: async () => {
      const api = await getApi();

      // Fetch on-chain stats
      const statsRaw = await api.query.bazariAffiliate.affiliateStats(userAddress);
      const stats = statsRaw.toJSON() as any;

      // Fetch backend data (trends, active buyers)
      const response = await fetch(`/api/affiliates/${userAddress}/stats`);
      const backendData = await response.json();

      return {
        totalReferrals: stats?.total_referrals || 0,
        directReferrals: stats?.direct_referrals || 0,
        activeBuyers: backendData.activeBuyers || 0,
        activeBuyersPercent: backendData.activeBuyersPercent || 0,
        totalCommissionEarned: stats?.total_commission_earned || 0,
        earningsByLevel: backendData.earningsByLevel || [0, 0, 0, 0, 0],
        referralsTrend: backendData.referralsTrend,
        earningsTrend: backendData.earningsTrend,
      };
    },
    staleTime: 30000, // 30 seconds
  });
}
```

### 5.2 useMerkleProof

**File**: `src/hooks/blockchain/useMerkleProof.ts`
**Purpose**: Generate Merkle proof for commission verification
**Complexity**: ⭐⭐⭐

```typescript
interface MerkleProof {
  leaf: string; // Hash of user's commission
  path: string[]; // Sibling hashes
  root: string; // On-chain Merkle root
}

export function useMerkleProof(orderId: number, userAddress: string) {
  return useQuery<MerkleProof>({
    queryKey: ['merkleProof', orderId, userAddress],
    queryFn: async () => {
      // Generate proof off-chain (backend API)
      const response = await fetch(
        `/api/affiliates/${userAddress}/merkle-proof?orderId=${orderId}`
      );
      return response.json();
    },
    staleTime: Infinity, // Proofs don't change
  });
}
```

---

## 6. Error Handling

### 6.1 Common Error Types

```typescript
// File: src/hooks/blockchain/errors.ts

export class BlockchainError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'BlockchainError';
  }
}

export const BLOCKCHAIN_ERRORS = {
  SELF_REFERRAL: 'You cannot refer yourself',
  ALREADY_REFERRED: 'You already have a referrer',
  INSUFFICIENT_BALANCE: 'Insufficient balance to complete transaction',
  INVALID_DATES: 'End date must be after start date',
  WALLET_NOT_CONNECTED: 'Please connect your wallet',
  TRANSACTION_FAILED: 'Transaction failed. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
} as const;

export function handleBlockchainError(error: Error): string {
  if (error.message in BLOCKCHAIN_ERRORS) {
    return BLOCKCHAIN_ERRORS[error.message as keyof typeof BLOCKCHAIN_ERRORS];
  }
  return error.message || BLOCKCHAIN_ERRORS.TRANSACTION_FAILED;
}
```

### 6.2 Error Handling Pattern

```typescript
// In mutation hooks
onError: (error) => {
  const message = handleBlockchainError(error);
  toast.error(message);

  // Log to error tracking (Sentry, etc.)
  console.error('Blockchain mutation failed:', error);
};
```

---

## 7. Testing

### 7.1 Unit Tests

```typescript
// File: src/hooks/blockchain/__tests__/useReferralTree.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReferralTree } from '../useReferralTree';

// Mock Polkadot API
jest.mock('@/services/polkadot', () => ({
  getApi: jest.fn(() =>
    Promise.resolve({
      query: {
        bazariAffiliate: {
          directReferrals: jest.fn((address) => ({
            toJSON: () =>
              address === '0xAlice' ? ['0xBob', '0xCarol'] : [],
          })),
          affiliateStats: jest.fn(() => ({
            toJSON: () => ({
              total_commission_earned: 1000,
            }),
          })),
        },
      },
    })
  ),
}));

describe('useReferralTree', () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('fetches referral tree successfully', async () => {
    const { result } = renderHook(() => useReferralTree('0xAlice', 2), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveProperty('id', '0xAlice');
    expect(result.current.data?.children).toHaveLength(2);
    expect(result.current.data?.children[0].id).toBe('0xBob');
  });

  it('handles max depth correctly', async () => {
    const { result } = renderHook(() => useReferralTree('0xAlice', 1), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Level 0 should have children, but level 1 should not
    expect(result.current.data?.children).toHaveLength(2);
    expect(result.current.data?.children[0].children).toHaveLength(0);
  });
});
```

### 7.2 Integration Tests

```typescript
// File: src/hooks/blockchain/__tests__/useRegisterReferral.integration.test.ts
import { renderHook, act } from '@testing-library/react';
import { useRegisterReferral } from '../useRegisterReferral';

describe('useRegisterReferral (Integration)', () => {
  it('registers referral successfully', async () => {
    const { result } = renderHook(() => useRegisterReferral());

    await act(async () => {
      result.current.mutate('0xBob');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('registered'));
  });

  it('prevents self-referral', async () => {
    const { result } = renderHook(() => useRegisterReferral());

    await act(async () => {
      result.current.mutate('0xAlice'); // Same as current user
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('You cannot refer yourself');
  });
});
```

---

**Document Status**: ✅ **COMPLETE**
**Total Hooks**: 6 (3 Query + 2 Mutation + 1 Subscription)
**Lines of Code (Estimated)**: ~1,500 lines
**Testing Coverage Target**: 80%+

---

*End of HOOKS.md*
