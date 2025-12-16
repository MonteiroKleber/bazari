/**
 * Loyalty Program Template
 * Points system, rewards, and member benefits
 */

import type { Template } from '../../types/studio.types';

export const loyaltyTemplate: Template = {
  id: 'loyalty',
  name: 'Loyalty Program',
  description: 'Build a loyalty program with points, rewards, and member tiers',
  category: 'commerce',
  icon: 'Award',
  color: '#F59E0B',
  tags: ['loyalty', 'rewards', 'points', 'members', 'gamification'],
  sdkFeatures: ['wallet', 'storage', 'user', 'tokens'],
  defaultPermissions: [
    { id: 'wallet:read', reason: 'View member wallet for point balance' },
    { id: 'storage:read', reason: 'Load rewards and member data' },
    { id: 'storage:write', reason: 'Save point transactions and redemptions' },
    { id: 'user:read', reason: 'Access member profile' },
    { id: 'tokens:read', reason: 'Check token-based rewards', optional: true },
  ],
  files: [
    {
      path: 'package.json',
      isTemplate: true,
      content: `{
  "name": "{{slug}}",
  "version": "0.1.0",
  "private": true,
  "description": "{{description}}",
  "author": "{{author}}",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@bazari.libervia.xyz/app-sdk": "^0.2.2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}`,
    },
    {
      path: 'bazari.manifest.json',
      isTemplate: true,
      content: `{
  "name": "{{name}}",
  "slug": "{{slug}}",
  "version": "0.1.0",
  "description": "{{description}}",
  "author": "{{author}}",
  "category": "commerce",
  "permissions": [
    "wallet:read",
    "storage:read",
    "storage:write",
    "user:read"
  ],
  "entry": "dist/index.html",
  "icon": "icon.png"
}`,
    },
    {
      path: 'index.html',
      isTemplate: true,
      content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{name}}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
    },
    {
      path: 'vite.config.ts',
      isTemplate: false,
      content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});`,
    },
    {
      path: 'tsconfig.json',
      isTemplate: false,
      content: `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}`,
    },
    {
      path: 'src/main.tsx',
      isTemplate: false,
      content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
    },
    {
      path: 'src/App.tsx',
      isTemplate: true,
      content: `import { useState } from 'react';
import { useBazari } from './hooks/useBazari';
import { useLoyalty } from './hooks/useLoyalty';
import { Header } from './components/Header';
import { PointsCard } from './components/PointsCard';
import { TierProgress } from './components/TierProgress';
import { RewardsList } from './components/RewardsList';
import { ActivityFeed } from './components/ActivityFeed';

type Tab = 'rewards' | 'activity';

function App() {
  const { user, isConnected } = useBazari();
  const { member, rewards, activities, loading, redeemReward } = useLoyalty();
  const [activeTab, setActiveTab] = useState<Tab>('rewards');

  if (!isConnected) {
    return (
      <div className="app">
        <div className="connect-screen">
          <div className="connect-content">
            <div className="logo-icon">🏆</div>
            <h1>{{name}}</h1>
            <p>Connect your wallet to access your rewards</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header user={user} member={member} />

      <main className="main">
        <div className="dashboard-grid">
          <PointsCard points={member?.points || 0} loading={loading} />
          <TierProgress member={member} />
        </div>

        <nav className="tabs">
          <button
            className={\`tab \${activeTab === 'rewards' ? 'active' : ''}\`}
            onClick={() => setActiveTab('rewards')}
          >
            Rewards
          </button>
          <button
            className={\`tab \${activeTab === 'activity' ? 'active' : ''}\`}
            onClick={() => setActiveTab('activity')}
          >
            Activity
          </button>
        </nav>

        {activeTab === 'rewards' ? (
          <RewardsList
            rewards={rewards}
            memberPoints={member?.points || 0}
            memberTier={member?.tier || 'bronze'}
            onRedeem={redeemReward}
          />
        ) : (
          <ActivityFeed activities={activities} />
        )}
      </main>
    </div>
  );
}

export default App;`,
    },
    {
      path: 'src/hooks/useBazari.ts',
      isTemplate: false,
      content: `import { useState, useEffect } from 'react';
import { BazariSDK, SDKUser } from '@bazari.libervia.xyz/app-sdk';

export function useBazari() {
  const [sdk, setSdk] = useState<BazariSDK | null>(null);
  const [user, setUser] = useState<SDKUser | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const initSDK = async () => {
      try {
        const bazariSdk = new BazariSDK({ debug: true });
        setSdk(bazariSdk);

        if (bazariSdk.isInBazari()) {
          const currentUser = await bazariSdk.auth.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            setIsConnected(true);
          }
        }
      } catch (error) {
        console.error('Failed to initialize SDK:', error);
      }
    };

    initSDK();
  }, []);

  return { sdk, user, isConnected };
}`,
    },
    {
      path: 'src/hooks/useLoyalty.ts',
      isTemplate: false,
      content: `import { useState, useEffect } from 'react';

export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Member {
  id: string;
  name: string;
  points: number;
  tier: Tier;
  lifetimePoints: number;
  joinedAt: Date;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  category: 'discount' | 'product' | 'experience' | 'exclusive';
  minTier?: Tier;
  image?: string;
  available: boolean;
}

export interface Activity {
  id: string;
  type: 'earned' | 'redeemed' | 'tier_up';
  description: string;
  points: number;
  timestamp: Date;
}

export function useLoyalty() {
  const [member, setMember] = useState<Member | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated data
    const mockMember: Member = {
      id: '1',
      name: 'Loyal Member',
      points: 2450,
      tier: 'silver',
      lifetimePoints: 5200,
      joinedAt: new Date('2024-01-15'),
    };

    const mockRewards: Reward[] = [
      {
        id: '1',
        name: '10% Off Coupon',
        description: 'Get 10% off your next purchase',
        pointsCost: 500,
        category: 'discount',
        available: true,
      },
      {
        id: '2',
        name: 'Free Shipping',
        description: 'Free shipping on your next order',
        pointsCost: 300,
        category: 'discount',
        available: true,
      },
      {
        id: '3',
        name: 'Exclusive Product',
        description: 'Limited edition member-only item',
        pointsCost: 2000,
        category: 'product',
        minTier: 'silver',
        available: true,
      },
      {
        id: '4',
        name: 'VIP Experience',
        description: 'Exclusive access to special events',
        pointsCost: 5000,
        category: 'experience',
        minTier: 'gold',
        available: true,
      },
      {
        id: '5',
        name: '25% Off Coupon',
        description: 'Get 25% off your next purchase',
        pointsCost: 1200,
        category: 'discount',
        available: true,
      },
      {
        id: '6',
        name: 'Platinum Gift Box',
        description: 'Curated selection of premium items',
        pointsCost: 8000,
        category: 'exclusive',
        minTier: 'platinum',
        available: true,
      },
    ];

    const mockActivities: Activity[] = [
      {
        id: '1',
        type: 'earned',
        description: 'Purchase completed',
        points: 150,
        timestamp: new Date(Date.now() - 86400000),
      },
      {
        id: '2',
        type: 'redeemed',
        description: 'Redeemed: Free Shipping',
        points: -300,
        timestamp: new Date(Date.now() - 172800000),
      },
      {
        id: '3',
        type: 'tier_up',
        description: 'Upgraded to Silver tier!',
        points: 0,
        timestamp: new Date(Date.now() - 604800000),
      },
      {
        id: '4',
        type: 'earned',
        description: 'Referral bonus',
        points: 500,
        timestamp: new Date(Date.now() - 864000000),
      },
      {
        id: '5',
        type: 'earned',
        description: 'Review submitted',
        points: 50,
        timestamp: new Date(Date.now() - 1209600000),
      },
    ];

    setTimeout(() => {
      setMember(mockMember);
      setRewards(mockRewards);
      setActivities(mockActivities);
      setLoading(false);
    }, 600);
  }, []);

  const redeemReward = async (rewardId: string) => {
    const reward = rewards.find((r) => r.id === rewardId);
    if (!reward || !member || member.points < reward.pointsCost) return;

    setMember((prev) =>
      prev ? { ...prev, points: prev.points - reward.pointsCost } : null
    );

    const newActivity: Activity = {
      id: Date.now().toString(),
      type: 'redeemed',
      description: \`Redeemed: \${reward.name}\`,
      points: -reward.pointsCost,
      timestamp: new Date(),
    };

    setActivities((prev) => [newActivity, ...prev]);
  };

  return { member, rewards, activities, loading, redeemReward };
}`,
    },
    {
      path: 'src/components/Header.tsx',
      isTemplate: true,
      content: `import type { Member, Tier } from '../hooks/useLoyalty';
import type { SDKUser } from '@bazari.libervia.xyz/app-sdk';

interface HeaderProps {
  user: SDKUser | null;
  member: Member | null;
}

const tierColors: Record<Tier, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
};

const tierIcons: Record<Tier, string> = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  platinum: '💎',
};

export function Header({ user, member }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <h1 className="logo">{{name}}</h1>
      </div>

      <div className="header-right">
        {member && (
          <div
            className="tier-badge"
            style={{ backgroundColor: tierColors[member.tier] + '20', color: tierColors[member.tier] }}
          >
            <span>{tierIcons[member.tier]}</span>
            <span className="tier-name">{member.tier.charAt(0).toUpperCase() + member.tier.slice(1)}</span>
          </div>
        )}

        {user && (
          <div className="user-badge">
            <span className="user-name">{user.displayName || user.handle}</span>
          </div>
        )}
      </div>
    </header>
  );
}`,
    },
    {
      path: 'src/components/PointsCard.tsx',
      isTemplate: false,
      content: `interface PointsCardProps {
  points: number;
  loading: boolean;
}

export function PointsCard({ points, loading }: PointsCardProps) {
  const formatPoints = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  if (loading) {
    return (
      <div className="card points-card loading">
        <div className="skeleton skeleton-title"></div>
        <div className="skeleton skeleton-value"></div>
      </div>
    );
  }

  return (
    <div className="card points-card">
      <div className="points-icon">⭐</div>
      <div className="points-info">
        <span className="points-label">Your Points</span>
        <span className="points-value">{formatPoints(points)}</span>
      </div>
    </div>
  );
}`,
    },
    {
      path: 'src/components/TierProgress.tsx',
      isTemplate: false,
      content: `import type { Member, Tier } from '../hooks/useLoyalty';

interface TierProgressProps {
  member: Member | null;
}

const tiers: { name: Tier; threshold: number }[] = [
  { name: 'bronze', threshold: 0 },
  { name: 'silver', threshold: 2000 },
  { name: 'gold', threshold: 5000 },
  { name: 'platinum', threshold: 10000 },
];

const tierColors: Record<Tier, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
};

export function TierProgress({ member }: TierProgressProps) {
  if (!member) return null;

  const currentTierIndex = tiers.findIndex((t) => t.name === member.tier);
  const nextTier = tiers[currentTierIndex + 1];
  const currentThreshold = tiers[currentTierIndex].threshold;

  const progress = nextTier
    ? ((member.lifetimePoints - currentThreshold) / (nextTier.threshold - currentThreshold)) * 100
    : 100;

  const pointsToNext = nextTier ? nextTier.threshold - member.lifetimePoints : 0;

  return (
    <div className="card tier-card">
      <div className="tier-header">
        <span className="tier-label">Tier Progress</span>
        <span className="lifetime-points">{member.lifetimePoints.toLocaleString()} lifetime pts</span>
      </div>

      <div className="tier-progress-container">
        <div className="tier-markers">
          {tiers.map((tier, index) => (
            <div
              key={tier.name}
              className={\`tier-marker \${index <= currentTierIndex ? 'achieved' : ''}\`}
              style={{
                left: index === 0 ? '0%' : \`\${(index / (tiers.length - 1)) * 100}%\`,
                color: tierColors[tier.name]
              }}
            >
              <div className="marker-dot" style={{ backgroundColor: tierColors[tier.name] }}></div>
              <span className="marker-label">{tier.name}</span>
            </div>
          ))}
        </div>
        <div className="tier-progress-bar">
          <div
            className="tier-progress-fill"
            style={{
              width: \`\${Math.min(progress, 100)}%\`,
              backgroundColor: tierColors[member.tier]
            }}
          ></div>
        </div>
      </div>

      {nextTier && (
        <p className="tier-hint">
          {pointsToNext.toLocaleString()} more points to reach {nextTier.name}
        </p>
      )}
    </div>
  );
}`,
    },
    {
      path: 'src/components/RewardsList.tsx',
      isTemplate: false,
      content: `import type { Reward, Tier } from '../hooks/useLoyalty';

interface RewardsListProps {
  rewards: Reward[];
  memberPoints: number;
  memberTier: Tier;
  onRedeem: (rewardId: string) => void;
}

const tierOrder: Tier[] = ['bronze', 'silver', 'gold', 'platinum'];

const categoryIcons: Record<Reward['category'], string> = {
  discount: '🏷️',
  product: '🎁',
  experience: '✨',
  exclusive: '👑',
};

export function RewardsList({ rewards, memberPoints, memberTier, onRedeem }: RewardsListProps) {
  const canRedeem = (reward: Reward) => {
    if (memberPoints < reward.pointsCost) return false;
    if (reward.minTier) {
      const memberTierIndex = tierOrder.indexOf(memberTier);
      const requiredTierIndex = tierOrder.indexOf(reward.minTier);
      if (memberTierIndex < requiredTierIndex) return false;
    }
    return reward.available;
  };

  const getTierLockMessage = (reward: Reward) => {
    if (!reward.minTier) return null;
    const memberTierIndex = tierOrder.indexOf(memberTier);
    const requiredTierIndex = tierOrder.indexOf(reward.minTier);
    if (memberTierIndex < requiredTierIndex) {
      return \`Requires \${reward.minTier} tier\`;
    }
    return null;
  };

  return (
    <div className="rewards-list">
      {rewards.map((reward) => {
        const tierLock = getTierLockMessage(reward);
        const affordable = memberPoints >= reward.pointsCost;
        const redeemable = canRedeem(reward);

        return (
          <div
            key={reward.id}
            className={\`reward-card \${!redeemable ? 'locked' : ''}\`}
          >
            <div className="reward-icon">{categoryIcons[reward.category]}</div>
            <div className="reward-content">
              <h3 className="reward-name">{reward.name}</h3>
              <p className="reward-description">{reward.description}</p>
              {tierLock && <span className="tier-lock">{tierLock}</span>}
            </div>
            <div className="reward-action">
              <span className={\`reward-cost \${!affordable ? 'insufficient' : ''}\`}>
                {reward.pointsCost.toLocaleString()} pts
              </span>
              <button
                className="btn-redeem"
                disabled={!redeemable}
                onClick={() => onRedeem(reward.id)}
              >
                Redeem
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}`,
    },
    {
      path: 'src/components/ActivityFeed.tsx',
      isTemplate: false,
      content: `import type { Activity } from '../hooks/useLoyalty';

interface ActivityFeedProps {
  activities: Activity[];
}

const typeIcons: Record<Activity['type'], string> = {
  earned: '➕',
  redeemed: '🎁',
  tier_up: '🏆',
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return \`\${days} days ago\`;
    return date.toLocaleDateString();
  };

  if (activities.length === 0) {
    return (
      <div className="activity-empty">
        <p>No activity yet</p>
      </div>
    );
  }

  return (
    <div className="activity-feed">
      {activities.map((activity) => (
        <div key={activity.id} className="activity-item">
          <div className="activity-icon">{typeIcons[activity.type]}</div>
          <div className="activity-content">
            <p className="activity-description">{activity.description}</p>
            <span className="activity-date">{formatDate(activity.timestamp)}</span>
          </div>
          {activity.points !== 0 && (
            <div className={\`activity-points \${activity.points > 0 ? 'positive' : 'negative'}\`}>
              {activity.points > 0 ? '+' : ''}{activity.points.toLocaleString()} pts
            </div>
          )}
        </div>
      ))}
    </div>
  );
}`,
    },
    {
      path: 'src/styles.css',
      isTemplate: false,
      content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --primary: #F59E0B;
  --primary-dark: #D97706;
  --bg: #0F0F0F;
  --bg-card: #1A1A1A;
  --bg-hover: #252525;
  --text: #FFFFFF;
  --text-secondary: #9CA3AF;
  --border: #2A2A2A;
  --positive: #10B981;
  --negative: #EF4444;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
}

.app {
  min-height: 100vh;
}

/* Connect Screen */
.connect-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.connect-content {
  text-align: center;
}

.logo-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.connect-content h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.connect-content p {
  color: var(--text-secondary);
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg-card);
}

.logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.tier-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.875rem;
}

.user-badge {
  padding: 0.5rem 1rem;
  background: var(--bg-hover);
  border-radius: 8px;
}

.user-name {
  font-weight: 500;
}

/* Main */
.main {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

/* Dashboard Grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

/* Cards */
.card {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 1.5rem;
  border: 1px solid var(--border);
}

/* Points Card */
.points-card {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.points-icon {
  font-size: 2.5rem;
}

.points-info {
  display: flex;
  flex-direction: column;
}

.points-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.points-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary);
}

/* Tier Card */
.tier-card {
  display: flex;
  flex-direction: column;
}

.tier-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.tier-label {
  font-weight: 600;
}

.lifetime-points {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.tier-progress-container {
  position: relative;
  margin: 1.5rem 0;
}

.tier-markers {
  position: relative;
  height: 30px;
}

.tier-marker {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translateX(-50%);
}

.marker-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-bottom: 4px;
}

.marker-label {
  font-size: 0.75rem;
  text-transform: capitalize;
}

.tier-progress-bar {
  height: 6px;
  background: var(--bg);
  border-radius: 3px;
  overflow: hidden;
}

.tier-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.tier-hint {
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-align: center;
  margin-top: 0.5rem;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.tab {
  flex: 1;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 0.875rem 1.5rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tab:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.tab.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

/* Rewards List */
.rewards-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.reward-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--bg-card);
  border-radius: 12px;
  border: 1px solid var(--border);
  transition: all 0.2s;
}

.reward-card:hover:not(.locked) {
  border-color: var(--primary);
}

.reward-card.locked {
  opacity: 0.7;
}

.reward-icon {
  font-size: 2rem;
  width: 48px;
  text-align: center;
}

.reward-content {
  flex: 1;
}

.reward-name {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.reward-description {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.tier-lock {
  display: inline-block;
  font-size: 0.75rem;
  color: var(--primary);
  background: var(--primary);
  background: rgba(245, 158, 11, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  margin-top: 0.5rem;
}

.reward-action {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.reward-cost {
  font-weight: 700;
  color: var(--primary);
}

.reward-cost.insufficient {
  color: var(--text-secondary);
}

.btn-redeem {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-redeem:hover:not(:disabled) {
  background: var(--primary-dark);
}

.btn-redeem:disabled {
  background: var(--bg-hover);
  color: var(--text-secondary);
  cursor: not-allowed;
}

/* Activity Feed */
.activity-feed {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.activity-empty {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-card);
  border-radius: 12px;
  border: 1px solid var(--border);
}

.activity-icon {
  font-size: 1.5rem;
  width: 40px;
  text-align: center;
}

.activity-content {
  flex: 1;
}

.activity-description {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.activity-date {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.activity-points {
  font-weight: 700;
  font-size: 0.9rem;
}

.activity-points.positive {
  color: var(--positive);
}

.activity-points.negative {
  color: var(--text-secondary);
}

/* Loading */
.skeleton {
  background: linear-gradient(90deg, var(--bg-hover) 25%, var(--border) 50%, var(--bg-hover) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

.skeleton-title {
  height: 1rem;
  width: 80px;
  margin-bottom: 0.5rem;
}

.skeleton-value {
  height: 2rem;
  width: 120px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Responsive */
@media (max-width: 640px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .header {
    padding: 1rem;
  }

  .main {
    padding: 1rem;
  }
}`,
    },
  ],
};
