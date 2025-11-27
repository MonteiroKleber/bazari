# bazari-rewards Pallet - Components Specification

**Status**: 🔴 CRITICAL - P0 Priority
**Version**: 1.0
**Last Updated**: 2025-11-14
**Dependencies**: React 18, TypeScript, shadcn/ui, Polkadot.js, recharts

---

## Table of Contents

1. [Component Hierarchy](#1-component-hierarchy)
2. [Components Catalog](#2-components-catalog)
3. [Shared Components](#3-shared-components)
4. [Component Dependencies Graph](#4-component-dependencies-graph)
5. [Implementation Checklist](#5-implementation-checklist)

---

## 1. Component Hierarchy

```
MissionsHubPage
├── StreakWidget
├── CashbackBalance
├── FilterTabs
├── SearchInput
└── MissionCard (8-12 instances)
    ├── MissionTypeIcon
    ├── MissionProgressBar
    └── Button (Claim/Continue)

StreakHistoryPage
├── StreakStats
├── MilestoneProgress
│   └── ProgressBar
├── StreakCalendar
│   └── CalendarHeatmap (react-calendar-heatmap)
└── StreakChart
    └── LineChart (recharts)

CashbackDashboardPage
├── CashbackBalance
│   └── Button (Convert/Withdraw)
├── CashbackBreakdown
│   └── PieChart (recharts)
└── CashbackHistory
    ├── Table
    └── Pagination

AdminMissionsManagementPage
├── MissionStats
├── CreateMissionButton
├── CreateMissionForm (Modal)
│   ├── Input (Name)
│   ├── Textarea (Description)
│   ├── Select (Mission Type)
│   ├── NumberInput (Target, Reward)
│   └── DatePicker (Expiration)
└── MissionsTable
    ├── Table
    └── Actions (Edit/Deactivate)
```

---

## 2. Components Catalog

### 2.1 MissionCard

**Purpose**: Display mission details with progress, reward, and claim action.

**Props**:
```typescript
interface MissionCardProps {
  mission: {
    id: number;
    name: string;
    description: string;
    type: MissionType;
    rewardAmount: string; // ZARI amount
    targetValue: number;
    isActive: boolean;
    expiresAt?: number; // Block number
  };
  userProgress?: {
    progress: number;
    completed: boolean;
    rewardsClaimed: boolean;
  };
  onClaim?: () => void;
  className?: string;
}

enum MissionType {
  CompleteOrders = 'CompleteOrders',
  SpendAmount = 'SpendAmount',
  ReferUsers = 'ReferUsers',
  CreateStore = 'CreateStore',
  FirstPurchase = 'FirstPurchase',
  DailyStreak = 'DailyStreak',
  Custom = 'Custom',
}
```

**State**:
```typescript
const [isClaiming, setIsClaiming] = useState(false);
const [showDetails, setShowDetails] = useState(false);
```

**Blockchain Integration**:
```typescript
import { useUserMissionProgress } from '@/hooks/blockchain/useRewards';

const { data: progress, isLoading } = useUserMissionProgress(mission.id);
const { mutate: claimReward, isPending: isClaiming } = useCompleteMission();
```

**Implementation**:
```tsx
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MissionTypeIcon } from './MissionTypeIcon';
import { MissionProgressBar } from './MissionProgressBar';

export function MissionCard({ mission, userProgress, onClaim, className }: MissionCardProps) {
  const [isClaiming, setIsClaiming] = useState(false);

  const progressPercentage = userProgress
    ? Math.floor((userProgress.progress / mission.targetValue) * 100)
    : 0;

  const isCompleted = userProgress?.completed || false;
  const isClaimed = userProgress?.rewardsClaimed || false;
  const isExpired = mission.expiresAt && mission.expiresAt < currentBlock;

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      await onClaim?.();
      toast.success(`Claimed ${mission.rewardAmount} ZARI!`);
    } catch (error) {
      toast.error('Failed to claim reward');
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      {/* Status Badges */}
      <div className="absolute top-2 right-2 flex gap-2">
        {isCompleted && (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Completed
          </Badge>
        )}
        {isExpired && (
          <Badge variant="destructive">Expired</Badge>
        )}
        {!mission.isActive && (
          <Badge variant="secondary">Inactive</Badge>
        )}
      </div>

      <CardHeader>
        <div className="flex items-start gap-3">
          {/* Mission Icon */}
          <MissionTypeIcon type={mission.type} size="lg" />

          <div className="flex-1">
            <CardTitle className="text-lg">{mission.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {mission.description}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {userProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {userProgress.progress}/{mission.targetValue}
              </span>
            </div>
            <MissionProgressBar
              progress={progressPercentage}
              completed={isCompleted}
            />
          </div>
        )}

        {/* Reward Display */}
        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
          <span className="text-sm font-medium">Reward</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary">
              {mission.rewardAmount}
            </span>
            <span className="text-sm text-muted-foreground">ZARI</span>
          </div>
        </div>

        {/* Expiration Warning */}
        {mission.expiresAt && !isExpired && (
          <div className="flex items-center gap-2 text-xs text-orange-600">
            <Clock className="w-3 h-3" />
            <span>Expires in {blocksToTime(mission.expiresAt - currentBlock)}</span>
          </div>
        )}
      </CardContent>

      <CardFooter>
        {isCompleted && !isClaimed ? (
          <Button
            onClick={handleClaim}
            disabled={isClaiming}
            className="w-full"
            size="lg"
          >
            {isClaiming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Claiming...
              </>
            ) : (
              <>
                <Gift className="w-4 h-4 mr-2" />
                Claim Reward
              </>
            )}
          </Button>
        ) : isClaimed ? (
          <Button disabled className="w-full" variant="secondary">
            <CheckCircle className="w-4 h-4 mr-2" />
            Claimed
          </Button>
        ) : (
          <Button variant="outline" className="w-full">
            Continue Mission
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
```

**Visual Mockup** (ASCII):
```
┌────────────────────────────────────┐
│ 📦 Complete 5 Orders    [Completed]│
│                                     │
│ Complete 5 successful orders to     │
│ earn rewards                        │
│                                     │
│ Progress:                     3/5   │
│ ████████████░░░░░░░░  60%          │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Reward           50 ZARI        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ⏰ Expires in 5 days                │
│                                     │
│ [Continue Mission]                  │
└────────────────────────────────────┘
```

**Usage Example**:
```tsx
<MissionCard
  mission={{
    id: 1,
    name: "Complete 5 Orders",
    description: "Complete 5 successful orders to earn rewards",
    type: MissionType.CompleteOrders,
    rewardAmount: "50",
    targetValue: 5,
    isActive: true,
  }}
  userProgress={{
    progress: 3,
    completed: false,
    rewardsClaimed: false,
  }}
  onClaim={() => claimMission(1)}
/>
```

**Accessibility**:
- `aria-label="Mission: Complete 5 Orders, 60% complete"`
- Keyboard: Tab to focus, Enter to claim
- Screen reader: Announce progress percentage

---

### 2.2 StreakWidget

**Purpose**: Display current streak with fire icon, used in sidebar/header.

**Props**:
```typescript
interface StreakWidgetProps {
  currentStreak: number;
  longestStreak: number;
  nextMilestone: {
    days: number; // 7, 30, or 100
    rewardAmount: string;
  };
  className?: string;
}
```

**Implementation**:
```tsx
import { Card } from '@/components/ui/card';
import { Flame } from 'lucide-react';

export function StreakWidget({ currentStreak, longestStreak, nextMilestone, className }: StreakWidgetProps) {
  const daysToMilestone = nextMilestone.days - currentStreak;
  const progressPercentage = (currentStreak / nextMilestone.days) * 100;

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center gap-3">
        {/* Fire Icon */}
        <div className="relative">
          <Flame className="w-8 h-8 text-orange-500" fill="currentColor" />
          {currentStreak > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {currentStreak}
            </span>
          )}
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-lg">
            {currentStreak} Day Streak!
          </h3>
          <p className="text-xs text-muted-foreground">
            Longest: {longestStreak} days
          </p>
        </div>
      </div>

      {/* Next Milestone */}
      {daysToMilestone > 0 && (
        <div className="mt-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Next milestone</span>
            <span className="font-medium">
              {nextMilestone.days} days ({daysToMilestone} to go)
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all"
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Reward</span>
            <span className="font-semibold text-primary">
              {nextMilestone.rewardAmount} ZARI
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
```

**Visual Mockup**:
```
┌──────────────────────────┐
│ 🔥7  7 Day Streak!       │
│      Longest: 30 days    │
│                          │
│ Next milestone           │
│ 30 days (23 to go)       │
│ ████████░░░░░░░░ 23%     │
│ Reward: 5,000 ZARI       │
└──────────────────────────┘
```

**Usage Example**:
```tsx
<StreakWidget
  currentStreak={7}
  longestStreak={30}
  nextMilestone={{
    days: 30,
    rewardAmount: "5000"
  }}
/>
```

---

### 2.3 CashbackBalance

**Purpose**: Display ZARI token balance with conversion and withdrawal actions.

**Props**:
```typescript
interface CashbackBalanceProps {
  balance: string; // ZARI balance
  breakdown?: {
    fromMissions: string;
    fromCashback: string;
    fromStreaks: string;
  };
  conversionRate?: number; // ZARI to BZR rate
  onConvert?: () => void;
  onWithdraw?: () => void;
  className?: string;
}
```

**Implementation**:
```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, Wallet } from 'lucide-react';

export function CashbackBalance({
  balance,
  breakdown,
  conversionRate,
  onConvert,
  onWithdraw,
  className
}: CashbackBalanceProps) {
  const bzrValue = conversionRate ? (parseFloat(balance) * conversionRate).toFixed(2) : null;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Cashback Balance
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Total Balance */}
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-1">Total ZARI Balance</p>
          <p className="text-4xl font-bold text-primary">{balance}</p>
          <p className="text-xs text-muted-foreground">ZARI</p>
          {bzrValue && (
            <p className="text-sm text-muted-foreground mt-2">
              ≈ {bzrValue} BZR
            </p>
          )}
        </div>

        {/* Breakdown */}
        {breakdown && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">From Missions</span>
              <span className="font-medium">{breakdown.fromMissions} ZARI</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">From Cashback</span>
              <span className="font-medium">{breakdown.fromCashback} ZARI</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">From Streaks</span>
              <span className="font-medium">{breakdown.fromStreaks} ZARI</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {onConvert && (
            <Button onClick={onConvert} variant="outline" className="flex-1">
              <TrendingUp className="w-4 h-4 mr-2" />
              Convert
            </Button>
          )}
          {onWithdraw && (
            <Button onClick={onWithdraw} variant="outline" className="flex-1">
              <Wallet className="w-4 h-4 mr-2" />
              Withdraw
            </Button>
          )}
        </div>

        {/* Info */}
        <p className="text-xs text-muted-foreground text-center">
          ZARI is a transferable and tradable token
        </p>
      </CardContent>
    </Card>
  );
}
```

**Visual Mockup**:
```
┌──────────────────────────┐
│ 💰 Cashback Balance      │
├──────────────────────────┤
│                          │
│  Total ZARI Balance      │
│      1,234.56            │
│        ZARI              │
│   ≈ 987.65 BZR           │
│                          │
│ From Missions    500.00  │
│ From Cashback    734.56  │
│ From Streaks       0.00  │
│                          │
│ [Convert] [Withdraw]     │
│                          │
│ ZARI is transferable     │
└──────────────────────────┘
```

**Usage Example**:
```tsx
<CashbackBalance
  balance="1234.56"
  breakdown={{
    fromMissions: "500.00",
    fromCashback: "734.56",
    fromStreaks: "0.00"
  }}
  conversionRate={0.8}
  onConvert={() => setShowConversionModal(true)}
  onWithdraw={() => setShowWithdrawModal(true)}
/>
```

---

### 2.4 StreakCalendar

**Purpose**: Heatmap calendar showing daily activity over 365 days.

**Props**:
```typescript
interface StreakCalendarProps {
  history: Map<string, boolean>; // Date → Active/Inactive
  startDate: Date;
  endDate: Date;
  onDayClick?: (date: Date) => void;
  className?: string;
}
```

**Implementation**:
```tsx
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';

export function StreakCalendar({ history, startDate, endDate, onDayClick, className }: StreakCalendarProps) {
  // Convert Map to array of {date, count}
  const values = Array.from(history.entries()).map(([date, active]) => ({
    date,
    count: active ? 1 : 0,
  }));

  return (
    <div className={cn('streak-calendar', className)}>
      <CalendarHeatmap
        startDate={startDate}
        endDate={endDate}
        values={values}
        classForValue={(value) => {
          if (!value) return 'color-empty';
          return value.count > 0 ? 'color-scale-active' : 'color-empty';
        }}
        tooltipDataAttrs={(value: any) => {
          if (!value || !value.date) return {};
          const date = new Date(value.date);
          return {
            'data-tip': `${date.toLocaleDateString()}: ${
              value.count > 0 ? 'Active' : 'Inactive'
            }`,
          };
        }}
        onClick={onDayClick}
      />

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 bg-muted rounded-sm" />
          <div className="w-3 h-3 bg-green-200 rounded-sm" />
          <div className="w-3 h-3 bg-green-400 rounded-sm" />
          <div className="w-3 h-3 bg-green-600 rounded-sm" />
          <div className="w-3 h-3 bg-green-800 rounded-sm" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
```

**CSS Styles**:
```css
.streak-calendar .color-empty {
  fill: hsl(var(--muted));
}

.streak-calendar .color-scale-active {
  fill: hsl(142, 76%, 36%); /* green-600 */
}

.streak-calendar svg {
  width: 100%;
  height: auto;
}
```

**Visual Mockup**:
```
November 2025
Mo Tu We Th Fr Sa Su
          1  2  3  4
 5  6  7  8  9 10 11
12 13 14 15 16 17 18
19 20 21 22 23 24 25
26 27 28 29 30

■ Active    □ Inactive
```

**Usage Example**:
```tsx
<StreakCalendar
  history={new Map([
    ['2025-11-01', true],
    ['2025-11-02', false],
    ['2025-11-03', true],
    // ...
  ])}
  startDate={new Date('2024-11-14')}
  endDate={new Date('2025-11-14')}
  onDayClick={(date) => console.log('Clicked:', date)}
/>
```

---

### 2.5 MissionProgressBar

**Purpose**: Animated progress bar for mission completion percentage.

**Props**:
```typescript
interface MissionProgressBarProps {
  progress: number; // 0-100
  completed?: boolean;
  showLabel?: boolean;
  className?: string;
}
```

**Implementation**:
```tsx
import { cn } from '@/lib/utils';

export function MissionProgressBar({
  progress,
  completed,
  showLabel = true,
  className
}: MissionProgressBarProps) {
  const percentage = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={cn('space-y-1', className)}>
      {/* Progress Bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out',
            completed
              ? 'bg-gradient-to-r from-green-500 to-emerald-600'
              : 'bg-gradient-to-r from-blue-500 to-cyan-600'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Label */}
      {showLabel && (
        <div className="flex justify-between text-xs">
          <span className={completed ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
            {completed ? 'Completed!' : 'In Progress'}
          </span>
          <span className="font-medium">{percentage}%</span>
        </div>
      )}
    </div>
  );
}
```

**Visual Mockup**:
```
In Progress                    60%
████████████░░░░░░░░
```

**Usage Example**:
```tsx
<MissionProgressBar progress={60} completed={false} />
<MissionProgressBar progress={100} completed={true} />
```

---

### 2.6 MissionTypeIcon

**Purpose**: Display icon for mission type with consistent styling.

**Props**:
```typescript
interface MissionTypeIconProps {
  type: MissionType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}
```

**Implementation**:
```tsx
import { Package, DollarSign, Users, Store, PartyPopper, Flame, Star } from 'lucide-react';

const MISSION_ICONS = {
  CompleteOrders: { icon: Package, label: 'Complete Orders', color: 'text-blue-600' },
  SpendAmount: { icon: DollarSign, label: 'Spend Amount', color: 'text-green-600' },
  ReferUsers: { icon: Users, label: 'Refer Users', color: 'text-purple-600' },
  CreateStore: { icon: Store, label: 'Create Store', color: 'text-orange-600' },
  FirstPurchase: { icon: PartyPopper, label: 'First Purchase', color: 'text-pink-600' },
  DailyStreak: { icon: Flame, label: 'Daily Streak', color: 'text-red-600' },
  Custom: { icon: Star, label: 'Custom', color: 'text-yellow-600' },
};

const SIZE_MAP = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function MissionTypeIcon({ type, size = 'md', showLabel, className }: MissionTypeIconProps) {
  const config = MISSION_ICONS[type];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'rounded-lg p-2 bg-opacity-10',
        config.color.replace('text-', 'bg-')
      )}>
        <Icon className={cn(SIZE_MAP[size], config.color)} />
      </div>
      {showLabel && (
        <span className="text-sm font-medium">{config.label}</span>
      )}
    </div>
  );
}
```

**Visual Mockup**:
```
┌─────┐
│ 📦  │  Complete Orders
└─────┘

┌─────┐
│ 💰  │  Spend Amount
└─────┘

┌─────┐
│ 👥  │  Refer Users
└─────┘
```

**Usage Example**:
```tsx
<MissionTypeIcon type={MissionType.CompleteOrders} size="lg" showLabel />
<MissionTypeIcon type={MissionType.DailyStreak} size="md" />
```

---

### 2.7 CashbackHistory

**Purpose**: Table displaying cashback grant history with pagination.

**Props**:
```typescript
interface CashbackHistoryProps {
  grants: CashbackGrant[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  className?: string;
}

interface CashbackGrant {
  id: number;
  recipient: string;
  amount: string;
  reason: string;
  orderId?: number;
  grantedAt: number; // Block number
  txHash?: string;
}
```

**Implementation**:
```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

export function CashbackHistory({ grants, isLoading, onLoadMore, hasMore, className }: CashbackHistoryProps) {
  if (isLoading) {
    return <CashbackHistorySkeleton />;
  }

  if (grants.length === 0) {
    return (
      <div className="text-center py-12">
        <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No cashback grants yet</p>
        <p className="text-sm text-muted-foreground">Complete missions to earn ZARI!</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>TxHash</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grants.map((grant) => (
            <TableRow key={grant.id}>
              <TableCell className="text-sm text-muted-foreground">
                {blockToDate(grant.grantedAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{grant.reason}</p>
                  {grant.orderId && (
                    <p className="text-xs text-muted-foreground">Order #{grant.orderId}</p>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <span className="font-semibold text-green-600">+{grant.amount} ZARI</span>
              </TableCell>
              <TableCell>
                {grant.txHash && (
                  <a
                    href={`https://polkadot.js.org/apps/#/explorer/query/${grant.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    {grant.txHash.slice(0, 6)}...{grant.txHash.slice(-4)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Load More */}
      {hasMore && (
        <div className="text-center">
          <Button onClick={onLoadMore} variant="outline">
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
```

**Visual Mockup**:
```
┌──────┬────────────────┬──────────┬──────────────┐
│ Date │ Reason         │ Amount   │ TxHash       │
├──────┼────────────────┼──────────┼──────────────┤
│11/14 │ Order #123     │ +50 ZARI │ 0xabc...def  │
│      │                │          │              │
│11/13 │ Mission        │+100 ZARI │ 0x123...456  │
│      │ Complete       │          │              │
│11/12 │ Referral Bonus │ +25 ZARI │ 0x789...abc  │
└──────┴────────────────┴──────────┴──────────────┘

[Load More]
```

**Usage Example**:
```tsx
<CashbackHistory
  grants={cashbackGrants}
  isLoading={isLoading}
  onLoadMore={() => loadMore()}
  hasMore={hasNextPage}
/>
```

---

### 2.8 CreateMissionForm

**Purpose**: Admin form to create new missions (DAO only).

**Props**:
```typescript
interface CreateMissionFormProps {
  onSubmit: (mission: MissionFormData) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
}

interface MissionFormData {
  name: string;
  description: string;
  type: MissionType;
  targetValue: number;
  rewardAmount: string;
  maxCompletions: number;
  expiresAt?: Date;
}
```

**Implementation**:
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const formSchema = z.object({
  name: z.string().min(3).max(64),
  description: z.string().min(10).max(256),
  type: z.nativeEnum(MissionType),
  targetValue: z.number().min(1).max(1000000),
  rewardAmount: z.string().min(1),
  maxCompletions: z.number().min(0),
  expiresAt: z.date().optional(),
});

export function CreateMissionForm({ onSubmit, isOpen, onClose }: CreateMissionFormProps) {
  const form = useForm<MissionFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      type: MissionType.CompleteOrders,
      targetValue: 5,
      rewardAmount: '50',
      maxCompletions: 0,
    },
  });

  const handleSubmit = async (data: MissionFormData) => {
    try {
      await onSubmit(data);
      toast.success('Mission created successfully!');
      form.reset();
      onClose();
    } catch (error) {
      toast.error('Failed to create mission');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Mission</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mission Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Complete 5 Orders" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the mission objective..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mission Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={MissionType.CompleteOrders}>Complete Orders</SelectItem>
                      <SelectItem value={MissionType.SpendAmount}>Spend Amount</SelectItem>
                      <SelectItem value={MissionType.ReferUsers}>Refer Users</SelectItem>
                      <SelectItem value={MissionType.CreateStore}>Create Store</SelectItem>
                      <SelectItem value={MissionType.FirstPurchase}>First Purchase</SelectItem>
                      <SelectItem value={MissionType.DailyStreak}>Daily Streak</SelectItem>
                      <SelectItem value={MissionType.Custom}>Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Target Value & Reward (Row) */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="targetValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Value</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 5"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rewardAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reward (ZARI)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Max Completions */}
            <FormField
              control={form.control}
              name="maxCompletions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Completions (0 = unlimited)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Creating...' : 'Create Mission'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

**Usage Example**:
```tsx
const [isOpen, setIsOpen] = useState(false);
const { mutateAsync: createMission } = useCreateMission();

<CreateMissionForm
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onSubmit={async (data) => {
    await createMission(data);
  }}
/>
```

---

## 3. Shared Components

These components are reusable across multiple pallets:

### 3.1 BlockchainStatusBadge

Used in: Commerce, Escrow, Rewards, Disputes

**Usage in Rewards**:
```tsx
<BlockchainStatusBadge status={mission.isActive ? 'Active' : 'Inactive'} />
<BlockchainStatusBadge status={userProgress.completed ? 'Completed' : 'Pending'} />
```

### 3.2 EmptyState

Used in: All pallets

**Usage in Rewards**:
```tsx
<EmptyState
  icon={<Package className="w-12 h-12" />}
  title="No missions available"
  description="Check back soon for new missions!"
/>
```

### 3.3 LoadingSkeleton

Used in: All pallets

**Usage in Rewards**:
```tsx
{isLoading ? (
  <MissionCardSkeleton count={6} />
) : (
  missions.map(mission => <MissionCard key={mission.id} mission={mission} />)
)}
```

---

## 4. Component Dependencies Graph

```
MissionCard
├── MissionTypeIcon (internal)
├── MissionProgressBar (internal)
├── Button (shadcn/ui)
├── Card (shadcn/ui)
└── Badge (shadcn/ui)

StreakWidget
├── Card (shadcn/ui)
└── Flame (lucide-react)

CashbackBalance
├── Card (shadcn/ui)
├── Button (shadcn/ui)
└── Icons (lucide-react)

StreakCalendar
├── react-calendar-heatmap (external)
└── Custom CSS

CashbackHistory
├── Table (shadcn/ui)
├── Button (shadcn/ui)
└── Pagination (custom)

CreateMissionForm
├── Dialog (shadcn/ui)
├── Form (shadcn/ui + react-hook-form)
├── Input (shadcn/ui)
├── Textarea (shadcn/ui)
├── Select (shadcn/ui)
└── zod (validation)
```

---

## 5. Implementation Checklist

### 5.1 Component Development

- [ ] **MissionCard** (1 day)
  - [ ] Create component file
  - [ ] Implement props interface
  - [ ] Add blockchain integration (useUserMissionProgress)
  - [ ] Add claim reward logic
  - [ ] Add loading/error states
  - [ ] Write unit tests
  - [ ] Test responsiveness
  - [ ] Test accessibility

- [ ] **StreakWidget** (0.5 day)
  - [ ] Create component file
  - [ ] Implement fire icon with badge
  - [ ] Add milestone progress bar
  - [ ] Add next milestone countdown
  - [ ] Write unit tests

- [ ] **CashbackBalance** (0.5 day)
  - [ ] Create component file
  - [ ] Add balance display
  - [ ] Add breakdown (missions/cashback/streaks)
  - [ ] Add conversion/withdrawal buttons
  - [ ] Write unit tests

- [ ] **StreakCalendar** (1.5 days)
  - [ ] Install react-calendar-heatmap
  - [ ] Create component file
  - [ ] Implement 365-day heatmap
  - [ ] Add hover tooltips
  - [ ] Add legend
  - [ ] Write unit tests
  - [ ] Test performance (365 days rendering)

- [ ] **MissionProgressBar** (0.5 day)
  - [ ] Create component file
  - [ ] Add animated progress bar
  - [ ] Add completed state styling
  - [ ] Write unit tests

- [ ] **MissionTypeIcon** (0.5 day)
  - [ ] Create component file
  - [ ] Add icon mapping (7 types)
  - [ ] Add size variants
  - [ ] Add optional label
  - [ ] Write unit tests

- [ ] **CashbackHistory** (1 day)
  - [ ] Create component file
  - [ ] Implement table with grants
  - [ ] Add pagination
  - [ ] Add empty state
  - [ ] Add loading skeleton
  - [ ] Write unit tests

- [ ] **CreateMissionForm** (1.5 days)
  - [ ] Create component file
  - [ ] Implement form with react-hook-form
  - [ ] Add validation (zod)
  - [ ] Add all mission type fields
  - [ ] Add date picker (expiration)
  - [ ] Write unit tests
  - [ ] Test DAO authorization

### 5.2 Integration Testing

- [ ] Test MissionCard with real blockchain data
- [ ] Test StreakWidget with real streak data
- [ ] Test CashbackBalance with real ZARI balance
- [ ] Test StreakCalendar with 365 days of data
- [ ] Test CreateMissionForm submission to blockchain
- [ ] Test real-time updates (WebSocket)

### 5.3 Accessibility Testing

- [ ] Keyboard navigation (Tab, Enter, Arrow keys)
- [ ] Screen reader testing (VoiceOver/NVDA)
- [ ] ARIA labels and roles
- [ ] Color contrast (WCAG 2.1 AA)
- [ ] Focus indicators

### 5.4 Performance Testing

- [ ] MissionCard renders < 100ms
- [ ] StreakCalendar renders 365 days < 1s
- [ ] CashbackHistory table with 100+ rows < 500ms
- [ ] No memory leaks on mount/unmount

---

**Document Status**: ✅ COMPLETE
**Next Steps**: Implement components in order of priority (MissionCard → StreakWidget → CashbackBalance → StreakCalendar → MissionProgressBar → MissionTypeIcon → CashbackHistory → CreateMissionForm)
**Dependencies**: [UI-SPEC.md](./UI-SPEC.md), [HOOKS.md](./HOOKS.md)
